const RESEND_API_URL = 'https://api.resend.com/emails';
const MIN_SUBMISSION_AGE_MS = 5000;
const MAX_MESSAGE_LENGTH = 4000;
const ALLOWED_ENQUIRY_TYPES = new Set([
  'Trauma-Informed Coaching',
  'Leadership Coaching',
  'Executive Coaching',
  'Speaking Engagement',
  'Podcast / Media Interview',
  'Literary Event',
  'Book Enquiry',
  'General Enquiry',
]);

function getHeaderValue(headers, name) {
  if (!headers) {
    return '';
  }

  const targetName = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (String(key).toLowerCase() === targetName) {
      return Array.isArray(value) ? value[0] : String(value || '');
    }
  }

  return '';
}

function getClientIp(headers) {
  const forwardedFor = getHeaderValue(headers, 'x-forwarded-for');
  const realIp = getHeaderValue(headers, 'x-real-ip');
  const connectingIp = getHeaderValue(headers, 'cf-connecting-ip');

  if (connectingIp) {
    return connectingIp.trim();
  }

  if (realIp) {
    return realIp.trim();
  }

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  return '';
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') {
      resolve(req.body);
      return;
    }

    if (typeof req.body === 'string') {
      resolve(req.body);
      return;
    }

    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      resolve(raw);
    });
    req.on('error', reject);
  });
}

function parseBody(rawBody, headers) {
  if (rawBody && typeof rawBody === 'object' && !Buffer.isBuffer(rawBody)) {
    return rawBody;
  }

  const contentType = getHeaderValue(headers, 'content-type').toLowerCase();
  const text = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody || '');

  if (contentType.includes('application/json')) {
    return text ? JSON.parse(text) : {};
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(text));
  }

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return Object.fromEntries(new URLSearchParams(text));
  }
}

function normalizeString(value) {
  return String(value ?? '')
    .replace(/\u0000/g, '')
    .trim();
}

function sanitizeSingleLine(value) {
  return normalizeString(value)
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function sanitizeMultiline(value) {
  return normalizeString(value)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getPayloadValue(payload, keys) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      return payload[key];
    }
  }

  return '';
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function timestamp(value) {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/London',
  }).format(value);
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function buildEmailHtml(data) {
  const rows = [
    ['Full Name', data.fullName],
    ['Email Address', data.emailAddress],
    ['Telephone Number', data.telephoneNumber || 'Not provided'],
    ['Organisation', data.organisation || 'Not provided'],
    ['Enquiry Type', data.enquiryType],
    ['Message', data.message],
    ['Date & Time Submitted', data.submittedAt],
    ['IP Address', data.ipAddress || 'Not available'],
  ];

  const rowMarkup = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding: 12px 0; vertical-align: top; border-bottom: 1px solid #eadfce; width: 34%; font-weight: 600; color: #1f2325;">${escapeHtml(label)}</td>
          <td style="padding: 12px 0; vertical-align: top; border-bottom: 1px solid #eadfce; color: #1f2325;">${escapeHtml(value)}</td>
        </tr>`
    )
    .join('');

  return `
    <div style="margin: 0; padding: 0; background: #f6f1e8; color: #1f2325; font-family: Arial, Helvetica, sans-serif;">
      <div style="max-width: 720px; margin: 0 auto; padding: 32px 20px;">
        <div style="background: #fffaf2; border: 1px solid #e4d3bb; border-radius: 20px; padding: 28px; box-shadow: 0 14px 32px rgba(31, 35, 37, 0.06);">
          <p style="margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.16em; font-size: 12px; color: #8a6a43;">New Coaching Enquiry</p>
          <h1 style="margin: 0 0 16px; font-family: Georgia, 'Times New Roman', serif; font-size: 32px; line-height: 1.1;">${escapeHtml(`New Coaching Enquiry – ${data.enquiryType}`)}</h1>
          <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.65; color: #444;">A new enquiry has been submitted through the website.</p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%; border-collapse: collapse; font-size: 15px; line-height: 1.65;">${rowMarkup}</table>
        </div>
      </div>
    </div>`;
}

function buildEmailText(data) {
  return [
    `New Coaching Enquiry – ${data.enquiryType}`,
    '',
    `Full Name: ${data.fullName}`,
    `Email Address: ${data.emailAddress}`,
    `Telephone Number: ${data.telephoneNumber || 'Not provided'}`,
    `Organisation: ${data.organisation || 'Not provided'}`,
    `Enquiry Type: ${data.enquiryType}`,
    `Message: ${data.message}`,
    `Date & Time Submitted: ${data.submittedAt}`,
    `IP Address: ${data.ipAddress || 'Not available'}`,
  ].join('\n');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, {
      error: 'Method not allowed.',
    });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return sendJson(res, 500, {
      error: 'Resend is not configured on the server.',
    });
  }

  let payload;
  try {
    payload = parseBody(await readRawBody(req), req.headers);
  } catch {
    return sendJson(res, 400, {
      error: 'Unable to read the submitted form data.',
    });
  }

  const fullName = sanitizeSingleLine(getPayloadValue(payload, ['fullName', 'Full Name']));
  const emailAddress = sanitizeSingleLine(getPayloadValue(payload, ['emailAddress', 'Email']));
  const telephoneNumber = sanitizeSingleLine(getPayloadValue(payload, ['telephoneNumber', 'Telephone']));
  const organisation = sanitizeSingleLine(getPayloadValue(payload, ['organisation', 'Organisation']));
  const enquiryType = sanitizeSingleLine(getPayloadValue(payload, ['enquiryType', 'Enquiry Type']));
  const message = sanitizeMultiline(getPayloadValue(payload, ['message', 'Message']));
  const submittedAtClient = Number(getPayloadValue(payload, ['submittedAtClient']));
  const honeypot = sanitizeSingleLine(getPayloadValue(payload, ['website', 'companyWebsite', 'url']));
  const now = new Date();
  const submittedAt = timestamp(now);
  const ipAddress = getClientIp(req.headers);

  if (honeypot) {
    return sendJson(res, 400, {
      error: 'Submission rejected.',
    });
  }

  if (!fullName || fullName.length < 2 || fullName.length > 120) {
    return sendJson(res, 400, {
      error: 'Please enter your full name.',
    });
  }

  if (!emailAddress || !validateEmail(emailAddress) || emailAddress.length > 254) {
    return sendJson(res, 400, {
      error: 'Please enter a valid email address.',
    });
  }

  if (!enquiryType || !ALLOWED_ENQUIRY_TYPES.has(enquiryType)) {
    return sendJson(res, 400, {
      error: 'Please select a valid enquiry type.',
    });
  }

  if (!message || message.length < 10 || message.length > MAX_MESSAGE_LENGTH) {
    return sendJson(res, 400, {
      error: 'Please provide a longer message.',
    });
  }

  if (submittedAtClient && Number.isFinite(submittedAtClient)) {
    const ageMs = Date.now() - submittedAtClient;
    if (ageMs >= 0 && ageMs < MIN_SUBMISSION_AGE_MS) {
      return sendJson(res, 400, {
        error: 'Submission rejected.',
      });
    }
  }

  const from = process.env.RESEND_FROM_EMAIL || 'Andy Fish Website <onboarding@resend.dev>';

  const emailPayload = {
    from,
    to: ['andyprouk@yahoo.com'],
    subject: `New Coaching Enquiry – ${enquiryType}`,
    html: buildEmailHtml({
      fullName,
      emailAddress,
      telephoneNumber,
      organisation,
      enquiryType,
      message,
      submittedAt,
      ipAddress,
    }),
    text: buildEmailText({
      fullName,
      emailAddress,
      telephoneNumber,
      organisation,
      enquiryType,
      message,
      submittedAt,
      ipAddress,
    }),
    reply_to: emailAddress,
  };

  const resendResponse = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailPayload),
  });

  if (!resendResponse.ok) {
    const errorText = await resendResponse.text();
    return sendJson(res, 502, {
      error: 'Unable to send the enquiry right now.',
      details: errorText || 'Resend request failed.',
    });
  }

  return sendJson(res, 200, {
    message: 'Thank you. Your enquiry has been sent successfully.',
  });
};

export const SERVICES = Object.freeze({
  intro: { name: "Free introductory call", duration: 10, price: "0.00", paid: false },
  focused: { name: "Focused coaching session", duration: 30, price: "25.00", paid: true },
  individual: { name: "Individual coaching session", duration: 60, price: "40.00", paid: true },
  extended: { name: "Extended coaching session", duration: 120, price: "75.00", paid: true },
  intensive: { name: "Structured Strategy Intensive", duration: 120, price: "100.00", paid: true },
});

export const ZONE = "Europe/London";
export const HOLD_MINUTES = 15;
export const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
});

export const clean = (value, max = 500) => String(value || "").trim().slice(0, max);
export const emailValid = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export const id = () => crypto.randomUUID();

function partsAt(date, zone = ZONE) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
}

export function localToUtc(dateText, hour, minute) {
  const [year, month, day] = dateText.split("-").map(Number);
  const target = Date.UTC(year, month - 1, day, hour, minute, 0);
  let guess = target;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const p = partsAt(new Date(guess));
    const shown = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    guess += target - shown;
  }
  return new Date(guess);
}

export function londonDateText(date = new Date()) {
  const p = partsAt(date);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function dayAllowed(dateText) {
  const midday = localToUtc(dateText, 12, 0);
  const weekday = new Intl.DateTimeFormat("en-GB", { timeZone: ZONE, weekday: "short" }).format(midday);
  return !["Sat", "Sun"].includes(weekday);
}

export function locksFor(startIso, duration) {
  const start = new Date(startIso).getTime();
  const count = Math.ceil(duration / 5);
  return Array.from({ length: count }, (_, index) => new Date(start + index * 5 * 60000).toISOString());
}

export async function purgeExpired(db) {
  const now = new Date().toISOString();
  const expired = await db.prepare("SELECT id FROM bookings WHERE status = 'hold' AND expires_at < ?").bind(now).all();
  const ids = (expired.results || []).map((row) => row.id);
  for (const bookingId of ids) {
    await db.batch([
      db.prepare("DELETE FROM slot_locks WHERE booking_id = ?").bind(bookingId),
      db.prepare("UPDATE bookings SET status = 'expired', updated_at = ? WHERE id = ?").bind(now, bookingId),
    ]);
  }
}

export async function dateBlocked(db, dateText) {
  const row = await db.prepare("SELECT 1 AS blocked FROM unavailable WHERE date = ? LIMIT 1").bind(dateText).first();
  return Boolean(row);
}

export async function availableSlots(db, dateText, serviceKey) {
  const service = SERVICES[serviceKey];
  if (!service || !/^\d{4}-\d{2}-\d{2}$/.test(dateText) || !dayAllowed(dateText)) return [];
  await purgeExpired(db);
  if (await dateBlocked(db, dateText)) return [];

  const now = Date.now();
  const minimum = now + 24 * 60 * 60 * 1000;
  const maximum = now + 60 * 24 * 60 * 60 * 1000;
  const slots = [];
  for (let minutes = 14 * 60 + 45; minutes + service.duration <= 18 * 60; minutes += 15) {
    const start = localToUtc(dateText, Math.floor(minutes / 60), minutes % 60);
    if (start.getTime() < minimum || start.getTime() > maximum) continue;
    const lockKeys = locksFor(start.toISOString(), service.duration + 15);
    const placeholders = lockKeys.map(() => "?").join(",");
    const occupied = await db.prepare(`SELECT 1 AS occupied FROM slot_locks WHERE lock_key IN (${placeholders}) LIMIT 1`).bind(...lockKeys).first();
    if (!occupied) slots.push({
      start: start.toISOString(),
      label: new Intl.DateTimeFormat("en-GB", { timeZone: ZONE, hour: "2-digit", minute: "2-digit" }).format(start),
    });
  }
  return slots;
}

export async function paypalAccessToken(env) {
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) throw new Error("PayPal is not configured");
  const base = env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  const response = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      authorization: `Basic ${btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`)}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!response.ok) throw new Error("PayPal authentication failed");
  const result = await response.json();
  return { token: result.access_token, base };
}

export async function sendMail(env, { to, replyTo, subject, text }) {
  if (!env.MAILGUN_API_KEY) return false;
  const domain = env.MAILGUN_DOMAIN || "sandboxe838ef1c7a0541c986cea49ab764b5da.mailgun.org";
  const form = new URLSearchParams();
  form.set("from", `ReikiFish Bookings <postmaster@${domain}>`);
  form.set("to", to);
  if (replyTo) form.set("h:Reply-To", replyTo);
  form.set("subject", subject);
  form.set("text", text);
  const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
    method: "POST",
    headers: { authorization: `Basic ${btoa(`api:${env.MAILGUN_API_KEY}`)}`, "content-type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  return response.ok;
}

export function bookingText(booking) {
  const start = new Date(booking.start_utc);
  const when = new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONE, weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(start);
  return [
    `Booking reference: ${booking.reference}`,
    `Session: ${booking.service_name}`,
    `Date and time: ${when} (UK time)`,
    `Duration: ${booking.duration} minutes`,
    `Amount paid: £${booking.amount}`,
    `Name: ${booking.customer_name}`,
    `Email: ${booking.customer_email}`,
    `Telephone: ${booking.customer_phone || "Not provided"}`,
    "", "Andy will contact you using the details supplied.",
  ].join("\n");
}

export async function confirmAndEmail(env, booking, captureId) {
  const now = new Date().toISOString();
  await env.BOOKING_DB.prepare("UPDATE bookings SET status='confirmed', capture_id=?, expires_at=NULL, updated_at=? WHERE id=?").bind(captureId || booking.capture_id, now, booking.id).run();
  if (!booking.confirmation_sent) {
    const updated = { ...booking, capture_id: captureId };
    const text = bookingText(updated);
    const admin = env.BOOKING_EMAIL || "andyprouk@yahoo.com";
    const customerSent = await sendMail(env, { to: booking.customer_email, replyTo: admin, subject: `Your ReikiFish booking – ${booking.reference}`, text: `Thank you for your booking.\n\n${text}` });
    const adminSent = await sendMail(env, { to: admin, replyTo: booking.customer_email, subject: `New paid booking – ${booking.reference}`, text });
    if (customerSent || adminSent) await env.BOOKING_DB.prepare("UPDATE bookings SET confirmation_sent=1 WHERE id=?").bind(booking.id).run();
  }
}

export function adminAuthorised(request, env) {
  const supplied = request.headers.get("authorization") || "";
  return Boolean(env.BOOKING_ADMIN_TOKEN && supplied === `Bearer ${env.BOOKING_ADMIN_TOKEN}`);
}

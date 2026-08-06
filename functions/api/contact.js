const MAILGUN_DOMAIN =
  "sandboxe838ef1c7a0541c986cea49ab764b5da.mailgun.org";

const DESTINATION_EMAIL = "andyprouk@yahoo.com";

const jsonResponse = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "Cache-Control": "no-store",
    },
  });

const clean = (value, maxLength = 5000) =>
  String(value || "").trim().slice(0, maxLength);

export async function onRequestPost(context) {
  try {
    if (!context.env.MAILGUN_API_KEY) {
      console.error("MAILGUN_API_KEY is not configured.");
      return jsonResponse(
        { success: false, message: "Email service is not configured." },
        500
      );
    }

    let data;

    try {
      data = await context.request.json();
    } catch {
      return jsonResponse(
        { success: false, message: "Invalid form submission." },
        400
      );
    }

    // Honeypot - bots commonly populate hidden fields.
    if (clean(data.website, 200)) {
      return jsonResponse({ success: true });
    }

    const fullName = clean(data.fullName, 120);
    const emailAddress = clean(data.emailAddress, 254);
    const telephoneNumber = clean(data.telephoneNumber, 80);
    const organisation = clean(data.organisation, 150);
    const enquiryType = clean(data.enquiryType, 120);
    const message = clean(data.message, 10000);

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !fullName ||
      !emailPattern.test(emailAddress) ||
      !enquiryType ||
      message.length < 10
    ) {
      return jsonResponse(
        {
          success: false,
          message: "Please check the required fields and try again.",
        },
        400
      );
    }

    const subject =
      "Reiki Fish Website Enquiry - " +
      enquiryType.replace(/[\r\n]+/g, " ").slice(0, 100);

    const emailBody = [
      "New enquiry received from reikifish.com",
      "",
      "Full Name: " + fullName,
      "Email Address: " + emailAddress,
      "Telephone Number: " + (telephoneNumber || "Not provided"),
      "Organisation: " + (organisation || "Not provided"),
      "Enquiry Type: " + enquiryType,
      "",
      "Message:",
      message,
      "",
      "Submitted: " + new Date().toISOString(),
    ].join("\n");

    const mailgunData = new URLSearchParams();

    mailgunData.set(
      "from",
      "Reiki Fish Website <postmaster@" + MAILGUN_DOMAIN + ">"
    );

    mailgunData.set("to", DESTINATION_EMAIL);
    mailgunData.set("h:Reply-To", emailAddress);
    mailgunData.set("subject", subject);
    mailgunData.set("text", emailBody);

    const auth = btoa(
      "api:" + context.env.MAILGUN_API_KEY
    );

    const mailgunResponse = await fetch(
      "https://api.mailgun.net/v3/" +
        MAILGUN_DOMAIN +
        "/messages",
      {
        method: "POST",
        headers: {
          Authorization: "Basic " + auth,
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body: mailgunData.toString(),
      }
    );

    if (!mailgunResponse.ok) {
      const errorText = await mailgunResponse.text();

      console.error(
        "Mailgun send failed:",
        mailgunResponse.status,
        errorText
      );

      return jsonResponse(
        {
          success: false,
          message:
            "Your enquiry could not be sent. Please try again.",
        },
        502
      );
    }

    return jsonResponse({
      success: true,
      message:
        "Thank you. Your enquiry has been sent successfully.",
    });
  } catch (error) {
    console.error("Contact form error:", error);

    return jsonResponse(
      {
        success: false,
        message:
          "Something went wrong while sending your enquiry. Please try again.",
      },
      500
    );
  }
}

export function onRequest(context) {
  return jsonResponse(
    { success: false, message: "Method not allowed." },
    405
  );
}

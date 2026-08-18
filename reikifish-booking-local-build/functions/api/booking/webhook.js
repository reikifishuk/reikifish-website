import { confirmAndEmail, json, paypalAccessToken } from "./_shared.js";

export async function onRequestPost({ request, env }) {
  if (!env.PAYPAL_WEBHOOK_ID || !env.BOOKING_DB) return json({ error: "Webhook is not configured." }, 503);
  const raw = await request.text();
  let event;
  try { event = JSON.parse(raw); } catch { return json({ error: "Invalid event." }, 400); }
  try {
    const { token, base } = await paypalAccessToken(env);
    const verificationResponse = await fetch(`${base}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        transmission_id: request.headers.get("paypal-transmission-id"),
        transmission_time: request.headers.get("paypal-transmission-time"),
        cert_url: request.headers.get("paypal-cert-url"),
        auth_algo: request.headers.get("paypal-auth-algo"),
        transmission_sig: request.headers.get("paypal-transmission-sig"),
        webhook_id: env.PAYPAL_WEBHOOK_ID,
        webhook_event: event,
      }),
    });
    const verification = await verificationResponse.json();
    if (!verificationResponse.ok || verification.verification_status !== "SUCCESS") return json({ error: "Signature rejected." }, 400);
    if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      const orderId = event.resource?.supplementary_data?.related_ids?.order_id;
      const booking = orderId ? await env.BOOKING_DB.prepare("SELECT * FROM bookings WHERE paypal_order_id=? LIMIT 1").bind(orderId).first() : null;
      if (booking && booking.status !== "confirmed") {
        const amount = event.resource?.amount;
        if (amount?.currency_code === "GBP" && amount?.value === booking.amount) await confirmAndEmail(env, booking, event.resource.id);
      }
    }
    return json({ received: true });
  } catch (error) {
    console.error("Webhook processing failed", error);
    return json({ error: "Webhook processing failed." }, 500);
  }
}

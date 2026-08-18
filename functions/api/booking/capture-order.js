import { confirmAndEmail, json, paypalAccessToken } from "./_shared.js";

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid request." }, 400); }
  const orderId = String(body.orderID || "").trim();
  if (!orderId || !env.BOOKING_DB) return json({ error: "Missing order." }, 400);
  const booking = await env.BOOKING_DB.prepare("SELECT * FROM bookings WHERE paypal_order_id=? LIMIT 1").bind(orderId).first();
  if (!booking) return json({ error: "Booking was not found." }, 404);
  if (booking.status === "confirmed") return json({ success: true, reference: booking.reference });
  try {
    const { token, base } = await paypalAccessToken(env);
    const response = await fetch(`${base}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
      method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json", "paypal-request-id": `${booking.id}-capture` }, body: "{}",
    });
    const capture = await response.json();
    const payment = capture.purchase_units?.[0]?.payments?.captures?.[0];
    if (!response.ok || capture.status !== "COMPLETED" || payment?.status !== "COMPLETED") throw new Error("Payment was not completed");
    if (payment.amount?.currency_code !== "GBP" || payment.amount?.value !== booking.amount) throw new Error("Payment amount did not match booking");
    await confirmAndEmail(env, booking, payment.id);
    return json({ success: true, reference: booking.reference });
  } catch (error) {
    console.error("Capture failed", error);
    return json({ error: "Payment could not be confirmed. Please contact Andy before trying again." }, 502);
  }
}

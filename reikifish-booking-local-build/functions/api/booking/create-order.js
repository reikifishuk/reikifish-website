import { SERVICES, availableSlots, clean, confirmAndEmail, emailValid, HOLD_MINUTES, id, json, locksFor, paypalAccessToken } from "./_shared.js";

export async function onRequestPost({ request, env }) {
  if (!env.BOOKING_DB) return json({ error: "Booking database is not configured." }, 503);
  let data;
  try { data = await request.json(); } catch { return json({ error: "Invalid request." }, 400); }
  const service = SERVICES[data.service];
  const name = clean(data.name, 120);
  const email = clean(data.email, 254).toLowerCase();
  const phone = clean(data.phone, 80);
  const notes = clean(data.notes, 2000);
  const start = clean(data.start, 40);
  const date = clean(data.date, 10);
  if (!service || !name || !emailValid(email) || !start || !date) return json({ error: "Please complete all required fields." }, 400);
  const slots = await availableSlots(env.BOOKING_DB, date, data.service);
  if (!slots.some((slot) => slot.start === start)) return json({ error: "That time is no longer available. Please choose another." }, 409);

  const bookingId = id();
  const reference = `RF-${Date.now().toString(36).toUpperCase()}`;
  const now = new Date();
  const expires = new Date(now.getTime() + HOLD_MINUTES * 60000).toISOString();
  const lockKeys = locksFor(start, service.duration + 15);
  try {
    const statements = [env.BOOKING_DB.prepare(`INSERT INTO bookings
      (id,reference,service_key,service_name,duration,amount,currency,start_utc,end_utc,status,customer_name,customer_email,customer_phone,customer_notes,created_at,updated_at,expires_at)
      VALUES (?,?,?,?,?,?,?,?,?,'hold',?,?,?,?,?,?,?)`).bind(
      bookingId, reference, data.service, service.name, service.duration, service.price, "GBP", start,
      new Date(new Date(start).getTime() + service.duration * 60000).toISOString(), name, email, phone, notes,
      now.toISOString(), now.toISOString(), expires,
    )];
    lockKeys.forEach((key) => statements.push(env.BOOKING_DB.prepare("INSERT INTO slot_locks (lock_key,booking_id) VALUES (?,?)").bind(key, bookingId)));
    await env.BOOKING_DB.batch(statements);
  } catch (error) {
    console.error("Slot lock failed", error);
    return json({ error: "That time has just been selected by someone else." }, 409);
  }

  if (!service.paid) {
    const booking = await env.BOOKING_DB.prepare("SELECT * FROM bookings WHERE id=?").bind(bookingId).first();
    await confirmAndEmail(env, booking, null);
    return json({ free: true, reference });
  }

  try {
    const { token, base } = await paypalAccessToken(env);
    const paypalResponse = await fetch(`${base}/v2/checkout/orders`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json", "paypal-request-id": bookingId },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          reference_id: bookingId,
          custom_id: bookingId,
          description: service.name,
          amount: { currency_code: "GBP", value: service.price },
        }],
      }),
    });
    if (!paypalResponse.ok) throw new Error(await paypalResponse.text());
    const order = await paypalResponse.json();
    await env.BOOKING_DB.prepare("UPDATE bookings SET paypal_order_id=?, updated_at=? WHERE id=?").bind(order.id, new Date().toISOString(), bookingId).run();
    return json({ orderID: order.id, reference, expires });
  } catch (error) {
    console.error("PayPal order failed", error);
    await env.BOOKING_DB.batch([
      env.BOOKING_DB.prepare("DELETE FROM slot_locks WHERE booking_id=?").bind(bookingId),
      env.BOOKING_DB.prepare("UPDATE bookings SET status='payment_failed' WHERE id=?").bind(bookingId),
    ]);
    return json({ error: "PayPal could not start checkout. No payment was taken." }, 502);
  }
}

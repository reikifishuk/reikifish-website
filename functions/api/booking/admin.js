import { adminAuthorised, clean, json } from "./_shared.js";

export async function onRequest({ request, env }) {
  if (!adminAuthorised(request, env)) return json({ error: "Unauthorised." }, 401);
  if (!env.BOOKING_DB) return json({ error: "Database unavailable." }, 503);
  if (request.method === "GET") {
    const bookings = await env.BOOKING_DB.prepare("SELECT * FROM bookings ORDER BY start_utc DESC LIMIT 250").all();
    const unavailable = await env.BOOKING_DB.prepare("SELECT * FROM unavailable ORDER BY date ASC").all();
    return json({ bookings: bookings.results || [], unavailable: unavailable.results || [] });
  }
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  let data;
  try { data = await request.json(); } catch { return json({ error: "Invalid request." }, 400); }
  if (data.action === "block") {
    const date = clean(data.date, 10);
    const reason = clean(data.reason, 200);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: "Invalid date." }, 400);
    await env.BOOKING_DB.prepare("INSERT INTO unavailable (date,reason,created_at) VALUES (?,?,?) ON CONFLICT(date) DO UPDATE SET reason=excluded.reason").bind(date, reason, new Date().toISOString()).run();
    return json({ success: true });
  }
  if (data.action === "unblock") {
    await env.BOOKING_DB.prepare("DELETE FROM unavailable WHERE date=?").bind(clean(data.date, 10)).run();
    return json({ success: true });
  }
  if (data.action === "cancel") {
    const bookingId = clean(data.id, 80);
    await env.BOOKING_DB.batch([
      env.BOOKING_DB.prepare("DELETE FROM slot_locks WHERE booking_id=?").bind(bookingId),
      env.BOOKING_DB.prepare("UPDATE bookings SET status='cancelled', updated_at=? WHERE id=?").bind(new Date().toISOString(), bookingId),
    ]);
    return json({ success: true, note: "Booking cancelled locally. Any PayPal refund must be issued from PayPal." });
  }
  return json({ error: "Unknown action." }, 400);
}

import { availableSlots, json } from "./_shared.js";

export async function onRequestGet({ request, env }) {
  if (!env.BOOKING_DB) return json({ error: "Booking database is not configured." }, 503);
  const url = new URL(request.url);
  const date = url.searchParams.get("date") || "";
  const service = url.searchParams.get("service") || "";
  try {
    return json({ date, service, slots: await availableSlots(env.BOOKING_DB, date, service) });
  } catch (error) {
    console.error(error);
    return json({ error: "Availability could not be loaded." }, 500);
  }
}

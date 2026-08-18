import { SERVICES, json } from "./_shared.js";

export function onRequestGet({ env }) {
  const services = Object.entries(SERVICES).map(([id, item]) => ({ id, ...item }));
  return json({
    services,
    paypalClientId: env.PAYPAL_CLIENT_ID || "",
    paypalEnvironment: env.PAYPAL_ENV === "live" ? "live" : "sandbox",
    currency: "GBP",
    timezone: "Europe/London",
    policy: { minimumNoticeHours: 24, bookingWindowDays: 60, bufferMinutes: 15 },
  });
}

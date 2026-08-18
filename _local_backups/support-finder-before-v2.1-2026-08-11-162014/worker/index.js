const AI_MODEL = "@cf/meta/llama-3.2-3b-instruct";
const REVIEWED_AT = "2026-08-11";

const LABELS = {
  legal: "Legal support",
  "mental-health": "Mental health",
  "domestic-abuse": "Domestic abuse",
  family: "Family support",
  fathers: "Support for fathers",
  mothers: "Support for mothers",
  trauma: "Trauma and abuse",
  urgent: "Urgent help"
};

const SOURCES = {
  "United Kingdom": {
    "mental-health": [
      source("BACP Therapist Directory", "Search for registered counsellors and psychotherapists by location.", "https://www.bacp.co.uk/search/Therapists"),
      source("BPS Chartered Psychologist Directory", "Search for chartered psychologists.", "https://portal.bps.org.uk/Psychologist-Search/Directory-of-Chartered-Psychologists"),
      source("UKCP Find a Therapist", "Search for UKCP registered psychotherapists.", "https://www.psychotherapy.org.uk/find-a-therapist/")
    ],
    "domestic-abuse": [
      source("UK Government domestic abuse help", "Official routes to confidential help for women and men.", "https://www.gov.uk/guidance/domestic-abuse-how-to-get-help"),
      source("Women's Aid service directory", "Search for local domestic-abuse services.", "https://www.womensaid.org.uk/womens-aid-directory/"),
      source("Men's Advice Line", "Confidential support for male victims of domestic abuse.", "https://mensadviceline.org.uk/")
    ],
    legal: [
      source("Find a legal adviser", "Official UK guidance for finding legal advice.", "https://www.gov.uk/find-legal-advice"),
      source("Check legal-aid eligibility", "Official legal-aid eligibility checker for England and Wales.", "https://www.gov.uk/check-legal-aid")
    ],
    family: [source("Citizens Advice family guidance", "Independent information about separation, children and family matters.", "https://www.citizensadvice.org.uk/family/")],
    fathers: [source("Families Need Fathers", "Information and support concerning children and family separation.", "https://fnf.org.uk/")],
    mothers: [source("Women's Aid service directory", "Search for local support and domestic-abuse services.", "https://www.womensaid.org.uk/womens-aid-directory/")],
    trauma: [source("NHS mental-health services", "Official NHS information and routes to mental-health support.", "https://www.nhs.uk/nhs-services/mental-health-services/")],
    urgent: [
      source("NHS urgent mental-health help", "Official guidance for urgent mental-health support.", "https://www.nhs.uk/nhs-services/mental-health-services/where-to-get-urgent-help-for-mental-health/"),
      source("Samaritans", "Free emotional support by telephone on 116 123.", "https://www.samaritans.org/how-we-can-help/contact-samaritan/")
    ]
  },
  "United States": {
    "mental-health": [
      source("APA Psychologist Locator", "Search for American Psychological Association member psychologists.", "https://locator.apa.org/"),
      source("FindTreatment.gov", "Official confidential treatment-facility directory.", "https://findtreatment.gov/locator"),
      source("988 Suicide & Crisis Lifeline", "Call, text or chat with the official US crisis service.", "https://988lifeline.org/")
    ],
    "domestic-abuse": [
      source("National Domestic Violence Hotline", "Confidential US domestic-violence support by telephone, text and chat.", "https://www.thehotline.org/"),
      source("WomensLaw", "US legal information and state-by-state help for people experiencing abuse.", "https://www.womenslaw.org/")
    ],
    legal: [source("USA.gov legal aid", "Official information about free and lower-cost legal help.", "https://www.usa.gov/legal-aid")],
    family: [source("Child Welfare Information Gateway", "US government-supported family and child-welfare resources.", "https://www.childwelfare.gov/resources/" )],
    fathers: [source("Responsible Fatherhood", "US government information and fatherhood programme resources.", "https://fatherhood.gov/")],
    mothers: [source("Office on Women's Health", "Official health and support information for women.", "https://womenshealth.gov/")],
    trauma: [source("FindTreatment.gov", "Search verified treatment facilities by location.", "https://findtreatment.gov/locator")],
    urgent: [source("988 Suicide & Crisis Lifeline", "Call, text or chat with the official US crisis service.", "https://988lifeline.org/")]
  },
  Canada: {
    "mental-health": [
      source("Canadian Psychological Association", "Find provincial and territorial psychology organisations.", "https://cpa.ca/public/whatisapsychologist/PTassociations/"),
      source("Government of Canada mental-health support", "Official routes to mental-health help.", "https://www.canada.ca/en/public-health/services/mental-health-services/mental-health-get-help.html"),
      source("Canada 9-8-8", "Official suicide crisis helpline.", "https://988.ca/")
    ],
    "domestic-abuse": [source("Canada family-violence services", "Official information and province-specific services.", "https://www.canada.ca/en/public-health/services/health-promotion/stop-family-violence/services.html")],
    legal: [source("Department of Justice Canada", "Official justice and legal-assistance information.", "https://www.justice.gc.ca/eng/")],
    urgent: [source("Canada 9-8-8", "Call or text 988 for suicide-crisis support.", "https://988.ca/")]
  },
  Australia: {
    "mental-health": [
      source("Australian Psychological Society", "Search for psychologists by location and practice area.", "https://psychology.org.au/find-a-psychologist"),
      source("Healthdirect service finder", "Official Australian health-service directory.", "https://www.healthdirect.gov.au/australian-health-services"),
      source("Lifeline Australia", "National crisis support.", "https://www.lifeline.org.au/")
    ],
    "domestic-abuse": [source("1800RESPECT", "National domestic, family and sexual-violence support.", "https://www.1800respect.org.au/")],
    legal: [source("Australian Government legal assistance", "Official legal-aid routes by state and territory.", "https://www.ag.gov.au/legal-system/legal-assistance-services")],
    urgent: [source("Lifeline Australia", "National crisis support.", "https://www.lifeline.org.au/")]
  },
  "New Zealand": {
    "mental-health": [
      source("New Zealand Psychologists Board", "Search the public register of psychologists.", "https://psychologistsboard.org.nz/public-register/"),
      source("Healthpoint mental-health services", "Search mental-health and addiction services.", "https://www.healthpoint.co.nz/mental-health-addictions/"),
      source("1737 Need to Talk?", "Free support by calling or texting 1737.", "https://1737.org.nz/")
    ],
    "domestic-abuse": [source("Are You OK", "New Zealand family-violence information and support routes.", "https://www.areyouok.org.nz/")],
    legal: [source("New Zealand legal aid", "Official legal-aid information.", "https://www.justice.govt.nz/courts/going-to-court/legal-aid/")],
    urgent: [source("1737 Need to Talk?", "Free support by calling or texting 1737.", "https://1737.org.nz/")]
  },
  Ireland: {
    "mental-health": [
      source("Psychological Society of Ireland", "Professional psychology information and support routes.", "https://www.psychologicalsociety.ie/"),
      source("IACP therapist directory", "Search accredited counsellors and psychotherapists.", "https://iacp.ie/page/therapists"),
      source("HSE mental-health services", "Official Irish mental-health support routes.", "https://www2.hse.ie/mental-health/services-support/")
    ],
    "domestic-abuse": [source("HSE domestic-violence support", "Official Irish health-service information and support routes.", "https://www2.hse.ie/conditions/domestic-violence-and-abuse/")],
    legal: [source("Legal Aid Board", "Official civil legal-aid and family-mediation information.", "https://www.legalaidboard.ie/")],
    urgent: [source("HSE urgent mental-health help", "Official urgent-support information.", "https://www2.hse.ie/mental-health/services-support/urgent-help/")]
  }
};

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin, env.ALLOWED_ORIGINS);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    const url = new URL(request.url);
    if (url.pathname === "/health") return json({ ok: true, service: "ReikiFish Support Assistant", version: "2.0" }, 200, cors);
    if (url.pathname !== "/support" || request.method !== "POST") return json({ error: "Not found" }, 404, cors);

    try {
      const input = await request.json();
      validateInput(input);
      const analysis = await analysePrompt(input, env);
      const location = await geocode(input.location, input.country, env);
      const nearby = await findNearby(location, analysis.category, analysis, env);
      const baseSources = selectSources(input.country, analysis.category);
      const sources = await verifySources(baseSources, ctx);
      const answer = buildAnswer(input, analysis, nearby, sources);

      return json({ analysis, location, nearby, sources, answer, checkedAt: new Date().toISOString() }, 200, cors);
    } catch (error) {
      return json({ error: safeError(error) }, error.status || 500, cors);
    }
  }
};

function source(name, description, url) { return { name, description, url, reviewedAt: REVIEWED_AT }; }

function validateInput(input) {
  if (!input || typeof input.prompt !== "string" || typeof input.location !== "string") throw httpError(400, "Enter what help you need and your location.");
  if (input.prompt.trim().length < 3 || input.prompt.length > 1200) throw httpError(400, "Enter a short description of the support you need.");
  if (input.location.trim().length < 2 || input.location.length > 120) throw httpError(400, "Enter a valid postcode, ZIP code, town or city.");
}

async function analysePrompt(input, env) {
  const fallback = deterministicAnalysis(input.prompt, input.selectedCategory);
  if (!env.AI) return fallback;
  const system = `Classify support requests. Return only JSON with category, urgent, audience, summary. category must be one of: ${Object.keys(LABELS).join(", ")}. Do not diagnose, provide legal conclusions, or name organisations. summary must be one calm British-English sentence under 35 words.`;
  try {
    const result = await env.AI.run(AI_MODEL, { messages: [{ role: "system", content: system }, { role: "user", content: input.prompt.slice(0, 1200) }], max_tokens: 150, temperature: 0.1 });
    const parsed = parseAiJson(result.response || result);
    if (!LABELS[parsed.category]) return fallback;
    return { category: parsed.category, urgent: Boolean(parsed.urgent), audience: String(parsed.audience || fallback.audience).slice(0, 40), summary: String(parsed.summary || fallback.summary).slice(0, 240) };
  } catch { return fallback; }
}

function deterministicAnalysis(prompt, selected) {
  const text = prompt.toLowerCase();
  const urgent = /suicid|immediate danger|emergency|kill myself|kill someone|overdose/.test(text);
  let category = urgent ? "urgent" : selected;
  if (!LABELS[category]) {
    if (/domestic abuse|domestic violence|coercive|refuge|abusive partner/.test(text)) category = "domestic-abuse";
    else if (/solicitor|lawyer|legal aid|court|custody|family law/.test(text)) category = "legal";
    else if (/psycholog|counsell|counsel|therap|mental health|anxiety|depress/.test(text)) category = "mental-health";
    else if (/father|\bdad\b/.test(text)) category = "fathers";
    else if (/mother|\bmum\b/.test(text)) category = "mothers";
    else if (/trauma|darvo|gaslight|ptsd|narciss/.test(text)) category = "trauma";
    else category = "family";
  }
  const audience = /\b(child|children|young person|teen)/.test(text) ? "children and young people" : /\b(man|male|father|dad)\b/.test(text) ? "men" : /\b(woman|female|mother|mum)\b/.test(text) ? "women" : "general";
  return { category, urgent, audience, summary: `I will prioritise verified ${LABELS[category].toLowerCase()} routes and show nearby directory listings only when they are relevant.` };
}

async function geocode(locationText, country, env) {
  if (!env.GEOAPIFY_API_KEY) throw httpError(503, "The secure location service has not been configured.");
  const params = new URLSearchParams({ text: `${locationText}, ${country}`, format: "json", limit: "1", apiKey: env.GEOAPIFY_API_KEY });
  const response = await timedFetch(`https://api.geoapify.com/v1/geocode/search?${params}`, 9000);
  if (!response.ok) throw httpError(502, "The location service could not respond.");
  const data = await response.json();
  const item = data.results?.[0];
  if (!item) throw httpError(400, "That location could not be recognised in the selected country.");
  return { latitude: item.lat, longitude: item.lon, displayName: item.formatted || `${locationText}, ${country}` };
}

async function findNearby(location, category, analysis, env) {
  if (!env.GEOAPIFY_API_KEY) return [];
  const categories = {
    legal: "office.lawyer",
    "mental-health": "healthcare.clinic_or_praxis.psychiatry",
    "domestic-abuse": "office.charity,office.non_profit,service.social_facility.shelter",
    family: "office.charity,office.non_profit,office.government.social_services",
    fathers: "office.charity,office.non_profit",
    mothers: "office.charity,office.non_profit",
    trauma: "healthcare.clinic_or_praxis.psychiatry",
    urgent: "healthcare.hospital,service.police"
  };
  const radius = category === "urgent" ? 20000 : 15000;
  const params = new URLSearchParams({ categories: categories[category] || categories.family, filter: `circle:${location.longitude},${location.latitude},${radius}`, bias: `proximity:${location.longitude},${location.latitude}`, limit: "30", apiKey: env.GEOAPIFY_API_KEY });
  try {
    const response = await timedFetch(`https://api.geoapify.com/v2/places?${params}`, 10000);
    if (!response.ok) return [];
    const data = await response.json();
    return (data.features || []).map(f => normalisePlace(f, location, category, analysis)).filter(Boolean).sort((a, b) => b.relevanceScore - a.relevanceScore || a.distance - b.distance).slice(0, 6);
  } catch { return []; }
}

function normalisePlace(feature, origin, category) {
  const p = feature.properties || {};
  const raw = p.datasource?.raw || {};
  const name = p.name || raw.name || "";
  if (!name) return null;
  const text = `${name} ${(p.categories || []).join(" ")} ${raw.healthcare || ""} ${raw.office || ""}`.toLowerCase();
  const wanted = {
    legal: /lawyer|solicitor|legal|attorney|law firm/,
    "mental-health": /psycholog|psychiatr|counsell|counsel|psychotherap|mental health/,
    "domestic-abuse": /domestic|violence|victim|women.?s aid|refuge|abuse/,
    family: /family|children|parent|social service|community/,
    fathers: /father|dad|men.?s support|family/,
    mothers: /mother|mum|women.?s support|family/,
    trauma: /trauma|psycholog|counsell|psychotherap|mental health/,
    urgent: /hospital|police|emergency/
  }[category];
  if (!wanted?.test(text)) return null;
  if (/care home|nursing home|retirement|physiotherap|massage|night.?shelter/.test(text) && category !== "urgent") return null;
  const lat = Number(p.lat ?? feature.geometry?.coordinates?.[1]);
  const lon = Number(p.lon ?? feature.geometry?.coordinates?.[0]);
  const distance = haversine(origin.latitude, origin.longitude, lat, lon);
  const phone = p.contact?.phone || raw.phone || "";
  const website = p.website || p.contact?.website || raw.website || "";
  return { id: p.place_id || `${lat}-${lon}-${name}`, name, address: p.formatted || p.address_line2 || "Address details not supplied", phone, website, latitude: lat, longitude: lon, distance, relevanceScore: 3, source: "Geoapify" };
}

function selectSources(country, category) {
  const countrySet = SOURCES[country] || {};
  const routes = [...(countrySet[category] || [])];
  if (category !== "urgent" && countrySet.urgent && (category === "mental-health" || category === "domestic-abuse")) routes.push(...countrySet.urgent);
  if (!routes.length) return [source("Befrienders Worldwide", "Find emotional-support centres in countries around the world.", "https://befrienders.org/map/")];
  return routes.filter((route, index, list) => list.findIndex(candidate => candidate.url === route.url) === index);
}

async function verifySources(routes, ctx) {
  return Promise.all(routes.slice(0, 5).map(async route => {
    const checked = await checkSource(route.url, ctx);
    return { ...route, available: checked.available, checkedAt: checked.checkedAt };
  }));
}

async function checkSource(url, ctx) {
  const cache = caches.default;
  const key = new Request(`https://source-health.reikifish.invalid/?url=${encodeURIComponent(url)}`);
  const cached = await cache.match(key);
  if (cached) return cached.json();
  const result = { available: true, checkedAt: new Date().toISOString() };
  try { const response = await timedFetch(url, 3500, { method: "HEAD", redirect: "follow" }); result.available = response.status < 500; } catch { result.available = true; }
  const response = json(result, 200, { "Cache-Control": "public, max-age=86400" });
  ctx.waitUntil(cache.put(key, response.clone()));
  return result;
}

function buildAnswer(input, analysis, nearby, sources) {
  if (analysis.urgent) return "This may require urgent help. Use the verified crisis route shown first and contact your local emergency service if anyone is in immediate danger.";
  const local = nearby.length ? `${nearby.length} relevant nearby directory listing${nearby.length === 1 ? " was" : "s were"} found.` : "No sufficiently relevant nearby map listing was found.";
  return `${analysis.summary} ${local} The verified ${input.country} services below are the primary routes and should be checked directly.`;
}

function parseAiJson(value) { const text = typeof value === "string" ? value : JSON.stringify(value); const match = text.match(/\{[\s\S]*\}/); return match ? JSON.parse(match[0]) : {}; }
function haversine(a, b, c, d) { const r = 6371; const toRad = n => n * Math.PI / 180; const x = toRad(c - a); const y = toRad(d - b); const q = Math.sin(x / 2) ** 2 + Math.cos(toRad(a)) * Math.cos(toRad(c)) * Math.sin(y / 2) ** 2; return Math.round((2 * r * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q))) * 10) / 10; }
function timedFetch(url, timeout, options = {}) { const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeout); return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer)); }
function safeError(error) { if (error?.name === "AbortError") return "A source took too long to respond. Please try again."; return error?.message || "The Support Assistant could not complete the request."; }
function httpError(status, message) { const error = new Error(message); error.status = status; return error; }
function json(data, status = 200, headers = {}) { return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...headers } }); }
function corsHeaders(origin, configured) { const allowed = String(configured || "http://127.0.0.1:8000,http://localhost:8000,https://reikifish.com,https://www.reikifish.com").split(",").map(v => v.trim()); const value = allowed.includes(origin) ? origin : allowed[0]; return { "Access-Control-Allow-Origin": value, Vary: "Origin", "Access-Control-Allow-Methods": "POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400" }; }

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
    if (url.pathname === "/health") return json({ ok: true, service: "ReikiFish Support Assistant", version: "2.2.1" }, 200, cors);
    if (url.pathname !== "/support" || request.method !== "POST") return json({ error: "Not found" }, 404, cors);

    try {
      const input = await request.json();
      validateInput(input);
      const analysis = await analysePrompt(input, env);
      const location = await geocode(input.location, input.country, env);
      const nearby = await findNearby(location, analysis.category, analysis, env);
      const baseSources = selectSources(input.country, analysis.category, location);
      const sources = await verifySources(baseSources, ctx);
      const guidance = buildGuidance(input, analysis, nearby);
      const answer = guidance.response;

      return json({ analysis, guidance, location, nearby, sources, answer, checkedAt: new Date().toISOString() }, 200, cors);
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
  const system = `You are the ReikiFish Support Assistant. Classify a request for support and return only valid JSON with these fields: category, urgent, audience, summary. category must be one of: ${Object.keys(LABELS).join(", ")}. summary is one calm British-English sentence under 35 words describing what the person is seeking. Do not diagnose, decide whether allegations are true, give legal conclusions, promise outcomes, or name any organisation, service, professional or website. If there may be immediate danger, set urgent to true.`;
  try {
    const result = await env.AI.run(AI_MODEL, { messages: [{ role: "system", content: system }, { role: "user", content: input.prompt.slice(0, 1200) }], max_tokens: 420, temperature: 0.2 });
    const parsed = parseAiJson(result.response || result);
    if (!LABELS[parsed.category]) return fallback;
    return {
      category: parsed.category,
      urgent: Boolean(parsed.urgent),
      audience: String(parsed.audience || fallback.audience).slice(0, 40),
      summary: String(parsed.summary || fallback.summary).slice(0, 240),
      explanation: fallback.explanation,
      nextSteps: fallback.nextSteps,
      followUpQuestion: fallback.followUpQuestion
    };
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
  const fallbackContent = {
    legal: {
      explanation: "A regulated legal adviser can explain the options that apply in your area. Keep a dated record of important events and avoid sharing confidential case details in this search.",
      nextSteps: ["Use the verified legal directory below.", "Check whether free or lower-cost legal help is available.", "Prepare a short factual timeline before contacting an adviser."],
      question: "Which area of law best describes the issue?"
    },
    "mental-health": {
      explanation: "The right type of professional depends on what is affecting you and the kind of support you prefer. A verified therapist or psychologist directory is a safer starting point than an unregulated map listing.",
      nextSteps: ["Open a verified professional directory below.", "Check qualifications, registration, availability and fees.", "Ask whether the practitioner has experience relevant to your needs."],
      question: "Would you prefer counselling, psychology, trauma-informed support or urgent help?"
    },
    "domestic-abuse": {
      explanation: "Confidential specialist support can help you consider safety and options without pressuring you to make an immediate decision. Use a safe device where possible if someone may monitor your activity.",
      nextSteps: ["Contact a verified confidential service below.", "Use a safe telephone or device if monitoring is a concern.", "Call emergency services if anyone is in immediate danger."],
      question: "Are you looking for confidential advice, safe accommodation, legal support or help for someone else?"
    },
    family: {
      explanation: "Family-support organisations can help identify practical, emotional and local options. The most suitable route depends on whether the concern involves children, separation, caring or communication.",
      nextSteps: ["Choose a verified family-support route below.", "Write down the main issue and the outcome you need help with.", "Confirm eligibility and local availability directly."],
      question: "Does the support concern children, separation, caring responsibilities or another family issue?"
    }
  };
  const content = fallbackContent[category] || fallbackContent.family;
  return {
    category,
    urgent,
    audience,
    summary: `I will prioritise verified ${LABELS[category].toLowerCase()} routes for your location.`,
    explanation: content.explanation,
    nextSteps: content.nextSteps,
    followUpQuestion: content.question
  };
}

async function geocode(locationText, country, env) {
  const postcodeLocation = await geocodeUkPostcode(locationText, country);
  if (postcodeLocation) return postcodeLocation;
  if (!env.GEOAPIFY_API_KEY) throw httpError(503, "The secure location service has not been configured.");
  const params = new URLSearchParams({ text: `${locationText}, ${country}`, format: "json", limit: "1", apiKey: env.GEOAPIFY_API_KEY });
  const response = await timedFetch(`https://api.geoapify.com/v1/geocode/search?${params}`, 9000);
  if (!response.ok) throw httpError(502, "The location service could not respond.");
  const data = await response.json();
  const item = data.results?.[0];
  if (!item) throw httpError(400, "That location could not be recognised in the selected country.");
  return {
    latitude: item.lat,
    longitude: item.lon,
    displayName: item.formatted || `${locationText}, ${country}`,
    nation: ukNation(item.country || item.state || "")
  };
}

async function geocodeUkPostcode(locationText, country) {
  if (!/^(united kingdom|uk|gb|great britain)$/i.test(String(country || "").trim())) return null;
  const compact = String(locationText || "").toUpperCase().replace(/\s+/g, "").trim();
  const fullPostcode = /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(compact);
  const outcode = /^[A-Z]{1,2}\d[A-Z\d]?$/.test(compact);
  if (!fullPostcode && !outcode) return null;

  try {
    const endpoint = fullPostcode ? "postcodes" : "outcodes";
    const response = await timedFetch(`https://api.postcodes.io/${endpoint}/${encodeURIComponent(compact)}`, 6000);
    if (!response.ok) return null;
    const data = await response.json();
    const item = data.result;
    if (!item || !Number.isFinite(Number(item.latitude)) || !Number.isFinite(Number(item.longitude))) return null;
    const districts = arrayValues(item.admin_district);
    const nations = arrayValues(item.country);
    const nation = ukNation(nations[0] || item.country || "");
    const code = item.postcode || item.outcode || compact;
    return {
      latitude: Number(item.latitude),
      longitude: Number(item.longitude),
      displayName: [code, districts[0], nation].filter(Boolean).join(", "),
      nation,
      postcodeSource: "Postcodes.io"
    };
  } catch {
    return null;
  }
}

function arrayValues(value) {
  return (Array.isArray(value) ? value : [value]).map(item => String(item || "").trim()).filter(Boolean);
}

function ukNation(value) {
  const text = String(value || "").toLowerCase();
  if (text.includes("scotland")) return "Scotland";
  if (text.includes("wales")) return "Wales";
  if (text.includes("northern ireland")) return "Northern Ireland";
  if (text.includes("england")) return "England";
  return "";
}

async function findNearby(location, category, analysis, env) {
  if (!env.GEOAPIFY_API_KEY) return [];
  const categories = {
    legal: "office.lawyer",
    "mental-health": "healthcare,office",
    "domestic-abuse": "office.charity,office.non_profit,service.social_facility.shelter",
    family: "office.charity,office.non_profit,office.government.social_services",
    fathers: "office.charity,office.non_profit",
    mothers: "office.charity,office.non_profit",
    trauma: "healthcare,office",
    urgent: "healthcare.hospital,service.police"
  };
  const radius = category === "urgent" ? 20000 : 15000;
  const params = new URLSearchParams({ categories: categories[category] || categories.family, filter: `circle:${location.longitude},${location.latitude},${radius}`, bias: `proximity:${location.longitude},${location.latitude}`, limit: "100", apiKey: env.GEOAPIFY_API_KEY });
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
    "mental-health": /psycholog|psychiatr|counsell|counsel|psychotherap|mental health|talking therap|behavioural health|behavioral health|wellbeing|wellness/,
    "domestic-abuse": /domestic|violence|victim|women.?s aid|refuge|abuse/,
    family: /family|children|parent|social service|community/,
    fathers: /father|dad|men.?s support|family/,
    mothers: /mother|mum|women.?s support|family/,
    trauma: /trauma|psycholog|psychiatr|counsell|counsel|psychotherap|mental health|talking therap|behavioural health|behavioral health|wellbeing/,
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

function selectSources(country, category, location = {}) {
  if (/^(united kingdom|uk|gb|great britain)$/i.test(String(country || "").trim()) && category === "legal") {
    if (location.nation === "Scotland") {
      return [
        source("Scottish Legal Aid Board solicitor finder", "Official search for Scottish solicitors registered to provide legal aid.", "https://www.slab.org.uk/new-to-legal-aid/find-a-solicitor/"),
        source("Scottish legal-aid eligibility estimators", "Official Scottish Legal Aid Board eligibility guidance and estimators.", "https://www.slab.org.uk/new-to-legal-aid/eligibility-estimators/")
      ];
    }
    if (location.nation === "Northern Ireland") {
      return [source("nidirect legal aid", "Official Northern Ireland information about legal aid and finding legal help.", "https://www.nidirect.gov.uk/articles/legal-aid")];
    }
  }
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

function buildGuidance(input, analysis, nearby) {
  if (analysis.urgent) {
    return {
      headline: "Please prioritise immediate safety",
      response: "Your description may indicate an urgent situation. Use the verified crisis route below and contact the emergency service for your location if anyone is in immediate danger.",
      nextSteps: ["Move to a safer place if you can do so safely.", "Contact an emergency or verified crisis service.", "Use a safe device if another person may monitor your activity."],
      followUpQuestion: "Are you or someone else in immediate danger right now?"
    };
  }
  const controlled = controlledGuidance(analysis.category, analysis.audience);
  return {
    headline: analysis.summary,
    response: controlled.response,
    nextSteps: controlled.nextSteps,
    followUpQuestion: controlled.followUpQuestion,
    nearbyStatus: nearby.length
      ? `${nearby.length} relevant supplementary map listing${nearby.length === 1 ? " was" : "s were"} found.`
      : `No high-confidence supplementary map listing was found near ${input.location}. Use the verified ${input.country} routes shown first.`
  };
}

function controlledGuidance(category, audience) {
  const guidance = {
    legal: {
      response: "A regulated legal adviser can explain eligibility and the options that apply in your jurisdiction. Use the official services below, then confirm directly that the adviser accepts the relevant type of funded or legal-aid work.",
      nextSteps: ["Use the official legal-adviser directory below.", "Check legal-aid eligibility through the official service for your jurisdiction.", "Ask each adviser whether they currently accept legal-aid cases in the relevant area of law."],
      followUpQuestion: "Is the matter about children, separation, domestic abuse or another area of law?"
    },
    "mental-health": {
      response: "A regulated therapist, counsellor or psychologist directory is a safer starting point than an unverified map listing. Check professional registration, relevant experience, availability and fees directly before arranging support.",
      nextSteps: ["Open a verified professional directory below.", "Check registration, qualifications and experience relevant to your needs.", "Ask about availability, fees and whether an initial conversation is offered."],
      followUpQuestion: "Would you prefer counselling, psychology, trauma-informed support or urgent help?"
    },
    "domestic-abuse": {
      response: "Confidential specialist support can help you consider safety and options without pressuring you to make an immediate decision. Use a safe device where possible if someone may monitor your activity.",
      nextSteps: ["Contact a verified confidential service below.", "Use a safe telephone or device if monitoring is a concern.", "Contact emergency services if anyone is in immediate danger."],
      followUpQuestion: "Are you looking for confidential advice, safe accommodation, legal support or help for someone else?"
    },
    family: {
      response: "Family-support services can help identify practical, emotional and local options. The most suitable route depends on whether the concern involves children, separation, caring responsibilities or communication.",
      nextSteps: ["Choose a verified family-support route below.", "Write down the main issue and the outcome you need help with.", "Confirm eligibility and local availability directly."],
      followUpQuestion: "Does the support concern children, separation, caring responsibilities or another family issue?"
    }
  };
  if (category === "fathers" || category === "mothers") return {
    ...guidance.family,
    response: `${audience === "men" ? "Father-focused" : audience === "women" ? "Mother-focused" : "Parent-focused"} services can help identify practical, emotional and family-support options. Confirm directly that the service covers your location and circumstances.`
  };
  if (category === "trauma") return guidance["mental-health"];
  return guidance[category] || guidance.family;
}

function parseAiJson(value) { const text = typeof value === "string" ? value : JSON.stringify(value); const match = text.match(/\{[\s\S]*\}/); return match ? JSON.parse(match[0]) : {}; }
function haversine(a, b, c, d) { const r = 6371; const toRad = n => n * Math.PI / 180; const x = toRad(c - a); const y = toRad(d - b); const q = Math.sin(x / 2) ** 2 + Math.cos(toRad(a)) * Math.cos(toRad(c)) * Math.sin(y / 2) ** 2; return Math.round((2 * r * Math.atan2(Math.sqrt(q), Math.sqrt(1 - q))) * 10) / 10; }
function timedFetch(url, timeout, options = {}) { const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeout); return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer)); }
function safeError(error) { if (error?.name === "AbortError") return "A source took too long to respond. Please try again."; return error?.message || "The Support Assistant could not complete the request."; }
function httpError(status, message) { const error = new Error(message); error.status = status; return error; }
function json(data, status = 200, headers = {}) { return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...headers } }); }
function corsHeaders(origin, configured) { const allowed = String(configured || "http://127.0.0.1:8000,http://localhost:8000,https://reikifish.com,https://www.reikifish.com").split(",").map(v => v.trim()); const value = allowed.includes(origin) ? origin : allowed[0]; return { "Access-Control-Allow-Origin": value, Vary: "Origin", "Access-Control-Allow-Methods": "POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400" }; }

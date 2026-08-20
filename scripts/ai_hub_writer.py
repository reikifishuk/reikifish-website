"""AI content generator for the Knowledge Hub "New Hub Page" feature.

Given just a subject + category, calls Cloudflare Workers AI (free tier
model) to draft a full guide - title, SEO metadata, sections, FAQs and
sources - and returns it in the exact shape hub_page_lib.spec_from_dict()
expects. The draft is NEVER written to disk here; the Flask route returns it
to the browser for review, and the existing /knowledge-hub/publish endpoint
(with its normal SOP checks) is what actually writes the file.

Credentials: reads CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN from the
process environment, falling back to a `.dev.vars` file at the repo root
(already gitignored, same convention wrangler uses for local secrets).

SOP awareness: every prompt below is built around the same rules the SOP
checker enforces (hub_page_lib.run_sop_checks) - minimum 10,000 words total,
>=3 sections, >=3 FAQs, 50-160 char meta description - so a generated draft
should pass the checker on the first try. Sources are explicitly generated
as general, non-fabricated references; the draft is always flagged
`needs_citation_review` so a human confirms accuracy before publishing.
"""
import json
import re
import sys
import math
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

sys.path.insert(0, str(Path(__file__).resolve().parent))
import hub_page_lib as lib

MODEL = "@cf/meta/llama-3.1-8b-instruct"
API_BASE = "https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/{model}"

TARGET_SECTIONS = 10
TARGET_FAQS = 6
MAX_EXTRA_ROUNDS = 8  # safety cap on extra section-generation passes to hit the word minimum


class AIGenerationError(RuntimeError):
    pass


def _load_dev_vars():
    dev_vars = ROOT / ".dev.vars"
    if not dev_vars.exists():
        return {}
    values = {}
    for line in dev_vars.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        values[key.strip()] = value.strip()
    return values


def _credentials():
    import os

    dev_vars = _load_dev_vars()
    account_id = os.environ.get("CLOUDFLARE_ACCOUNT_ID") or dev_vars.get("CLOUDFLARE_ACCOUNT_ID")
    token = os.environ.get("CLOUDFLARE_API_TOKEN") or dev_vars.get("CLOUDFLARE_API_TOKEN")

    if not account_id or not token or token.startswith("REPLACE_ME"):
        raise AIGenerationError(
            "Cloudflare Workers AI is not configured yet. Open .dev.vars at the "
            "project root and replace CLOUDFLARE_API_TOKEN with a real token "
            "(create one at https://dash.cloudflare.com/profile/api-tokens with "
            "'Workers AI' - 'Read' permission), then restart the Flask admin server."
        )
    return account_id, token


def _call_ai(messages, max_tokens=1400, temperature=0.6):
    account_id, token = _credentials()
    url = API_BASE.format(account_id=account_id, model=MODEL)
    payload = json.dumps({
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise AIGenerationError(f"Workers AI request failed ({exc.code}): {detail[:500]}") from exc
    except urllib.error.URLError as exc:
        raise AIGenerationError(f"Could not reach Cloudflare Workers AI: {exc.reason}") from exc

    if not body.get("success", True) is True and body.get("errors"):
        raise AIGenerationError(f"Workers AI error: {body['errors']}")

    result = body.get("result", body)
    text = None
    if isinstance(result, dict):
        choices = result.get("choices")
        if choices and isinstance(choices, list):
            text = choices[0].get("message", {}).get("content")
        if text is None:
            response_val = result.get("response")
            # Cloudflare auto-parses JSON-looking content into an object here;
            # fall back to it (stringified) only when choices/content is absent.
            if isinstance(response_val, str):
                text = response_val
            elif response_val is not None:
                text = json.dumps(response_val)
    if not text:
        raise AIGenerationError(f"Workers AI returned an empty response: {body}")
    return text


def _extract_json(text):
    text = re.sub(r"```(?:json)?", "", text).strip()
    start_obj, start_arr = text.find("{"), text.find("[")
    starts = [s for s in (start_obj, start_arr) if s != -1]
    if not starts:
        raise AIGenerationError(f"No JSON found in AI response: {text[:300]}")
    start = min(starts)
    end_obj, end_arr = text.rfind("}"), text.rfind("]")
    end = max(end_obj, end_arr)
    candidate = text[start:end + 1]
    try:
        return json.loads(candidate)
    except json.JSONDecodeError:
        # common model mistake: trailing commas before } or ]
        repaired = re.sub(r",\s*([}\]])", r"\1", candidate)
        return json.loads(repaired)


def _call_ai_json(messages, max_tokens=1200, temperature=0.5, retries=2):
    """Small models occasionally return slightly malformed JSON (stray quotes,
    truncated output). Retry a couple of times with a stricter reminder
    before giving up, rather than failing the whole generation run."""
    last_error = None
    for attempt in range(retries + 1):
        attempt_messages = messages
        if attempt > 0:
            attempt_messages = messages + [{
                "role": "user",
                "content": "Your last reply was not valid JSON. Reply again with ONLY "
                            "a single valid JSON value - no prose, no code fences, no "
                            "trailing commas, no unescaped quotes inside strings.",
            }]
        try:
            text = _call_ai(attempt_messages, max_tokens=max_tokens, temperature=temperature)
            return _extract_json(text)
        except (json.JSONDecodeError, AIGenerationError) as exc:
            last_error = exc
    raise AIGenerationError(f"AI did not return valid JSON after {retries + 1} attempts: {last_error}")


SOP_RULES = (
    "Rules you must follow: total guide length across all sections must reach "
    "at least 10,000 words, so write long, substantial, detailed sections - "
    "aim for 1000-1300 words per section body, do not stop early or summarise, "
    "write the section out in full. Use plain, accurate, evidence-based "
    "psychology/wellbeing writing suitable for a general adult audience. "
    "Write in British English throughout (recognise not recognize, "
    "behaviour not behavior, organise not organize, analyse not analyze, "
    "colour not color, centre not center, realise not realize) with correct "
    "grammar, full sentences and proper comma usage. "
    "Never invent a fake precise citation, and never cite a specific study, "
    "author name or year anywhere in a section body or FAQ answer (no 'a "
    "study by X (Year) found...', no in-text academic citations of any "
    "kind) - even naming a real researcher with a fabricated or unverified "
    "finding is not allowed. Write in general evidence-informed language "
    "instead (e.g. 'research suggests...') without naming specific studies. "
    "Citations and researcher names belong ONLY in the separate Sources "
    "section, handled elsewhere - never repeat or duplicate a references "
    "list anywhere else. "
    "Formatting: never use markdown syntax such as double asterisks ** for "
    "bold anywhere, in any field - use bold very sparingly and only as the "
    "HTML tag <strong>, for at most a handful of the most important terms "
    "in the whole section, never as a label on every bullet point. Do not "
    "add sub-headings, a 'Conclusion' label, numbered case-study headers, "
    "or a references/bibliography list inside a section body - the section "
    "heading is already provided separately. Break body text into several "
    "distinct short paragraphs (roughly 100-180 words each) - never write "
    "one long unbroken paragraph."
)

_BOLD_MD_RE = re.compile(r"\*\*(.+?)\*\*")
_BRITISH_SPELLING_MAP = {
    "recognize": "recognise", "recognizes": "recognises", "recognized": "recognised",
    "recognizing": "recognising", "recognition": "recognition",
    "behavior": "behaviour", "behaviors": "behaviours", "behavioral": "behavioural",
    "organize": "organise", "organizes": "organises", "organized": "organised",
    "organizing": "organising", "organization": "organisation", "organizations": "organisations",
    "analyze": "analyse", "analyzes": "analyses", "analyzed": "analysed", "analyzing": "analysing",
    "color": "colour", "colors": "colours", "colored": "coloured",
    "center": "centre", "centers": "centres", "centered": "centred", "centering": "centring",
    "realize": "realise", "realizes": "realises", "realized": "realised", "realizing": "realising",
    "utilize": "utilise", "utilizes": "utilises", "utilized": "utilised", "utilizing": "utilising",
    "emphasize": "emphasise", "emphasizes": "emphasises", "emphasized": "emphasised", "emphasizing": "emphasising",
    "minimize": "minimise", "minimizes": "minimises", "minimized": "minimised", "minimizing": "minimising",
    "maximize": "maximise", "maximizes": "maximises", "maximized": "maximised", "maximizing": "maximising",
    "characterize": "characterise", "characterizes": "characterises", "characterized": "characterised", "characterizing": "characterising",
    "generalize": "generalise", "generalizes": "generalises", "generalized": "generalised", "generalizing": "generalising",
    "internalize": "internalise", "internalizes": "internalises", "internalized": "internalised", "internalizing": "internalising",
    "externalize": "externalise", "externalizes": "externalises", "externalized": "externalised", "externalizing": "externalising",
    "normalize": "normalise", "normalizes": "normalises", "normalized": "normalised", "normalizing": "normalising",
    "stabilize": "stabilise", "stabilizes": "stabilises", "stabilized": "stabilised", "stabilizing": "stabilising",
    "traumatize": "traumatise", "traumatizes": "traumatises", "traumatized": "traumatised", "traumatizing": "traumatising",
    "idealize": "idealise", "idealizes": "idealises", "idealized": "idealised", "idealizing": "idealising",
    "rationalize": "rationalise", "rationalizes": "rationalises", "rationalized": "rationalised", "rationalizing": "rationalising",
    "socialize": "socialise", "socializes": "socialises", "socialized": "socialised", "socializing": "socialising",
    "favor": "favour", "favors": "favours", "favored": "favoured", "favorite": "favourite",
    "honor": "honour", "honors": "honours", "honored": "honoured",
    "labor": "labour", "labors": "labours",
    "neighbor": "neighbour", "neighbors": "neighbours",
    "defense": "defence", "offense": "offence",
    "gray": "grey", "modeling": "modelling", "traveling": "travelling", "counseling": "counselling",
    "fulfill": "fulfil", "skillful": "skilful", "willful": "wilful", "enrollment": "enrolment",
}
_BRITISH_SPELLING_RE = re.compile(
    r"\b(" + "|".join(re.escape(k) for k in _BRITISH_SPELLING_MAP) + r")\b"
)


def _fix_british_spelling(match):
    word = match.group(0)
    replacement = _BRITISH_SPELLING_MAP[word.lower()]
    if word[0].isupper():
        replacement = replacement[0].upper() + replacement[1:]
    return replacement


def _clean_ai_text(text):
    """Safety net applied to every piece of AI-generated text, regardless of
    whether the model followed the prompt instructions: strip stray markdown
    bold markers (a common model mistake that renders as literal asterisks),
    and correct common US->British spellings."""
    if not text:
        return text
    text = _BOLD_MD_RE.sub(r"\1", text)
    text = _BRITISH_SPELLING_RE.sub(_fix_british_spelling, text)
    return text


def _strip_embedded_references(body_html):
    """Defence-in-depth: remove any 'References:'/'Bibliography:' mini-list a
    section accidentally embedded - the site has exactly one Sources section,
    generated separately, and must never be duplicated inside a section body."""
    return re.sub(
        r"<p>\s*(References|Bibliography|Sources)\s*:?\s*</p>\s*<[ou]l>.*?</[ou]l>",
        "", body_html, flags=re.I | re.S,
    )


def _clean_draft_text(draft):
    """Applies _clean_ai_text to every text field in a draft dict, in place."""
    for field in ("title", "h1", "eyebrow", "lead", "meta_description",
                  "og_description", "featured_summary", "sources_html", "note_html"):
        if draft.get(field):
            draft[field] = _clean_ai_text(draft[field])
    draft["keywords"] = [_clean_ai_text(k) for k in draft.get("keywords", [])]
    for s in draft.get("sections", []):
        s["kicker"] = _clean_ai_text(s.get("kicker", ""))
        s["heading"] = _clean_ai_text(s.get("heading", ""))
        s["body_html"] = _strip_embedded_references(_clean_ai_text(s.get("body_html", "")))
    for f in draft.get("faqs", []):
        f["question"] = _clean_ai_text(f.get("question", ""))
        f["answer"] = _clean_ai_text(f.get("answer", ""))
    for r in draft.get("related_links", []):
        r["label"] = _clean_ai_text(r.get("label", ""))


def _generate_outline(subject, category, notes):
    system = (
        "You are a senior editor writing a 'Complete Guide' article for a "
        "psychology/wellbeing Knowledge Hub. Respond with ONLY valid JSON, "
        "no prose, no markdown code fences. " + SOP_RULES
    )
    user = (
        f"Subject: {subject}\nCategory: {category}\n"
        + (f"Notes/angle: {notes}\n" if notes else "")
        + "Return a JSON object with exactly these keys: "
        f'"title" (string, MUST start with the literal topic name "{subject}" '
        f'followed by ": A Complete Evidence-Led Guide" - e.g. if the subject '
        f'were "Rumination" the title would be "Rumination: A Complete '
        f'Evidence-Led Guide". Do not use the word "Subject" literally - '
        f'always substitute the real topic "{subject}"), '
        f'"h1" (string, just "{subject}" or a short natural variant of it, '
        f'never the literal word "Subject" or "Topic"), '
        '"eyebrow" (short string like "Category · Complete guide"), '
        '"lead" (1-2 sentence summary paragraph), '
        '"meta_description" (string, 50-155 characters, SEO search snippet), '
        '"og_description" (1 sentence social share description), '
        '"keywords" (array of 5-8 short search keyword strings), '
        '"featured_icon" (a single capital letter representing the topic), '
        '"featured_summary" (string, 60-220 characters, for a homepage card), '
        '"diagram_labels" (array of exactly 5 short 1-3 word phrases naming '
        f'the key factors/facets of {subject} for a hub-and-spoke diagram - '
        "e.g. for a topic about a psychological pattern: the main contributing "
        "factors or components, not generic words), "
        f'"sections" (array of exactly {TARGET_SECTIONS} objects, each with '
        '"kicker" (short 2-4 word label) and "heading" (a specific, non-generic '
        "H2 heading covering one facet of the subject - e.g. definition/history, "
        "causes, research evidence, real-world examples, related conditions, "
        "how to address/cope with it, myths, practical guidance)."
    )
    data = _call_ai_json([
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ], max_tokens=1200, temperature=0.5)
    return data


def _generate_section_body(subject, category, heading, kicker):
    system = (
        "You are a senior editor writing one section of a long-form "
        "evidence-based psychology guide. Respond with ONLY the section body "
        "as clean HTML fragments (use <p>, and optionally <ul><li> or <table> "
        "where useful) - no <h2>, no markdown, no commentary, no code fences. "
        + SOP_RULES
    )
    user = (
        f"Guide subject: {subject} (category: {category})\n"
        f"Write the section '{heading}' (theme: {kicker}). "
        "Write 1000-1300 words of substantive, well-organised HTML content - "
        "this must be a long, thorough section, not a short summary. Use "
        "<strong> for at most 2-3 genuinely key terms in the entire section, "
        "not on every list item."
    )
    text = _call_ai([
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ], max_tokens=2200, temperature=0.65)
    text = re.sub(r"```(?:html)?", "", text).strip()
    if "<p" not in text.lower():
        text = f"<p>{text}</p>"
    return text


def _generate_faqs(subject, category):
    system = (
        "You are a senior editor writing an FAQ section for a psychology "
        "guide. Respond with ONLY the exact plain-text format requested, no "
        "JSON, no markdown, no code fences, no extra commentary. " + SOP_RULES
    )
    user = (
        f"Subject: {subject} (category: {category}). "
        f"Write exactly {TARGET_FAQS} FAQ items. Use EXACTLY this format for "
        "each one, with a line containing only ### between items and nothing "
        "else before, between or after them:\n"
        "Q: <question>\nA: <answer, 2-4 plain-text sentences, no HTML tags, "
        "no quotation marks>\n###\n"
        "Q: <question>\nA: <answer>\n###\n(repeat for all items)"
    )
    text = _call_ai([
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ], max_tokens=1200, temperature=0.6)
    return _parse_faq_text(text)


def _parse_faq_text(text):
    faqs = []
    for block in text.split("###"):
        q_match = re.search(r"Q:\s*(.+)", block)
        a_match = re.search(r"A:\s*(.+)", block, re.S)
        if not q_match or not a_match:
            continue
        question = q_match.group(1).strip()
        # answer runs until the next "Q:" line (if the model forgot a ### separator)
        answer = re.split(r"\n\s*Q:", a_match.group(1))[0].strip()
        question = question.strip('"\u201c\u201d')
        answer = answer.strip('"\u201c\u201d')
        if question and answer:
            faqs.append({"question": question, "answer": answer})
    if not faqs:
        raise AIGenerationError(f"Could not parse any FAQ items from AI response: {text[:300]}")
    return faqs


def _generate_sources(subject, category):
    system = (
        "You are a senior editor compiling a further-reading list for a "
        "psychology guide. Respond with ONLY HTML <li> list items, no <ol> "
        "wrapper, no prose, no code fences. " + SOP_RULES
    )
    user = (
        f"Subject: {subject} (category: {category}). List 6-8 real, "
        "well-established researchers, classic studies or reputable "
        "organisations relevant to this topic (e.g. 'Bowlby's foundational "
        "work on attachment theory'). Phrase generally where you are not "
        "certain of an exact year or journal - never invent a fake precise "
        "citation. One <li> per item."
    )
    text = _call_ai([
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ], max_tokens=900, temperature=0.5)
    return re.sub(r"```(?:html)?", "", text).strip()


def _related_links(category, slug, limit=3):
    if not lib.KNOWLEDGE_JSON.exists():
        return []
    data = json.loads(lib.KNOWLEDGE_JSON.read_text(encoding="utf-8"))
    matches = [d for d in data if d.get("category") == category and d.get("slug") != slug]
    return [
        {"label": d.get("title", d["slug"]), "url": f"/{d['url']}"}
        for d in matches[:limit]
    ]


def _svg_text_lines(x, y, label, font_size=13, max_chars=13, fill="#f5f1e8", weight="600"):
    words = label.split()
    lines, current = [], ""
    for w in words:
        candidate = f"{current} {w}".strip()
        if len(candidate) > max_chars and current:
            lines.append(current)
            current = w
        else:
            current = candidate
    if current:
        lines.append(current)
    lines = lines[:3] or [label[:max_chars]]
    line_height = font_size + 3
    start_dy = -(len(lines) - 1) * line_height / 2
    tspans = "".join(
        f'<tspan x="{x:.1f}" dy="{line_height if i else start_dy:.1f}">{line}</tspan>'
        for i, line in enumerate(lines)
    )
    return (
        f'<text x="{x:.1f}" y="{y:.1f}" text-anchor="middle" '
        f'font-family="Inter,Arial,sans-serif" font-size="{font_size}" '
        f'font-weight="{weight}" fill="{fill}">{tspans}</text>'
    )


def _build_hub_spoke_svg(center_label, labels):
    """A topic-relevant hub-and-spoke diagram (built deterministically in code,
    not by the AI - small models cannot reliably draw usable SVG). center_label
    is the guide subject; labels are 4-6 short AI-supplied related factors."""
    labels = [l for l in (labels or []) if l][:6] or ["Causes", "Effects", "Support", "Recovery"]
    width, height = 640, 420
    cx, cy = width / 2, height / 2
    center_r, node_r, radius = 62, 46, 158
    n = len(labels)

    lines, nodes, texts = [], [], []
    for i, label in enumerate(labels):
        angle = -math.pi / 2 + (2 * math.pi * i / n)
        nx = cx + radius * math.cos(angle)
        ny = cy + radius * math.sin(angle)
        lines.append(
            f'<line x1="{cx:.1f}" y1="{cy:.1f}" x2="{nx:.1f}" y2="{ny:.1f}" '
            f'stroke="#efb126" stroke-width="1.5" opacity="0.5"/>'
        )
        nodes.append(
            f'<circle cx="{nx:.1f}" cy="{ny:.1f}" r="{node_r}" fill="#0d1514" '
            f'stroke="#efb126" stroke-width="1.5" opacity="0.95"/>'
        )
        texts.append(_svg_text_lines(nx, ny, label))

    center = (
        f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{center_r}" fill="rgba(239,177,38,.16)" '
        f'stroke="#efb126" stroke-width="2"/>'
    )
    center_text = _svg_text_lines(cx, cy, center_label, font_size=15, max_chars=11, weight="700")

    svg = (
        f'<svg viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg" '
        f'role="img" aria-label="Diagram showing key factors related to {center_label}">'
        + "".join(lines) + "".join(nodes) + "".join(texts) + center + center_text
        + "</svg>"
    )
    return svg


_PLACEHOLDER_RE = re.compile(r"^\s*(subject|topic)\b", re.I)


def _sanitize_title_field(value, subject, fallback):
    """Small models sometimes echo the literal word 'Subject'/'Topic' from the
    prompt instead of substituting the real subject - detect and fix that."""
    if not value or _PLACEHOLDER_RE.match(value) or subject.lower() not in value.lower():
        return fallback
    return value


def generate_hub_draft(subject: str, category: str, notes: str = "", log=None):
    """Returns (draft_dict, log_lines). draft_dict matches the shape expected
    by hub_page_lib.spec_from_dict(). Never writes any file."""
    log = log if log is not None else []

    def say(msg):
        log.append(msg)

    say(f"Generating outline for '{subject}'...")
    outline = _generate_outline(subject, category, notes)
    outline["title"] = _sanitize_title_field(
        outline.get("title"), subject, f"{subject}: A Complete Evidence-Led Guide"
    )
    outline["h1"] = _sanitize_title_field(outline.get("h1"), subject, subject)

    slug = lib.slugify(outline.get("h1") or subject)
    sections = []
    for s in outline.get("sections", [])[:TARGET_SECTIONS]:
        heading = s.get("heading", "").strip()
        kicker = s.get("kicker", "").strip()
        if not heading:
            continue
        say(f"Writing section: {heading}")
        body_html = _generate_section_body(subject, category, heading, kicker)
        sections.append({"kicker": kicker, "heading": heading, "body_html": body_html})

    say("Writing FAQs...")
    faqs = _generate_faqs(subject, category)
    faqs = [f for f in faqs if f.get("question") and f.get("answer")]

    say("Compiling sources and further reading...")
    sources_html = _generate_sources(subject, category)

    diagram_labels = outline.get("diagram_labels") or [s["kicker"] or s["heading"] for s in sections[:5]]
    svg_html = _build_hub_spoke_svg(outline.get("h1") or subject, diagram_labels)

    draft = {
        "title": outline.get("title", f"{subject}: A Complete Evidence-Led Guide"),
        "h1": outline.get("h1", subject),
        "slug": slug,
        "category": category,
        "eyebrow": outline.get("eyebrow", f"{category} \u00b7 Complete guide"),
        "lead": outline.get("lead", ""),
        "meta_description": outline.get("meta_description", "")[:155],
        "og_description": outline.get("og_description", ""),
        "keywords": outline.get("keywords", []),
        "featured_icon": (outline.get("featured_icon") or subject[:1]).strip()[:2].upper(),
        "featured_summary": outline.get("featured_summary", "")[:220],
        "sources_html": sources_html,
        "sections": sections,
        "faqs": faqs,
        "related_links": _related_links(category, slug),
        "svg_html": svg_html,
    }

    # Top up word count with extra sections if the model under-delivered,
    # capped so a single request can't burn unlimited free-tier neurons.
    for round_num in range(MAX_EXTRA_ROUNDS):
        spec = lib.spec_from_dict(draft)
        word_count = lib.count_words(spec)
        say(f"Word count so far: {word_count}")
        if word_count >= lib.MIN_WORD_COUNT:
            break
        say("Below the 10,000 word minimum - writing an additional section...")
        extra = _generate_outline(
            subject, category,
            notes=f"{notes} Write ONE more in-depth, non-duplicate section not already "
                   f"covered by: {', '.join(s['heading'] for s in draft['sections'])}."
        )
        extra_sections = extra.get("sections", [])[:1]
        for s in extra_sections:
            heading = s.get("heading", "").strip()
            kicker = s.get("kicker", "").strip()
            if not heading:
                continue
            body_html = _generate_section_body(subject, category, heading, kicker)
            draft["sections"].append({"kicker": kicker, "heading": heading, "body_html": body_html})

    _clean_draft_text(draft)

    spec = lib.spec_from_dict(draft)
    report = lib.run_sop_checks(spec)
    say(f"Final word count: {report['word_count']} (minimum {report['min_word_count']})")

    return draft, report, log

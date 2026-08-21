"""
Reusable, parameterised generator + SOP validator for new ReikiFish Knowledge
Hub "Complete Guide" pages, built on top of the exact styling template used by
knowledge/what-is-emotional-overwhelm.html (the rf-eo-/rf-sop- template the
user confirmed as the correct reference).

Used by the Flask admin "New Hub Page" feature (admin/app.py routes
/knowledge-hub, /knowledge-hub/check, /knowledge-hub/publish) so new guides
can be assembled, SOP-checked (SEO meta, 10k word minimum, working links) and
written to `knowledge/<slug>.html` locally, with the featured card / search
index / sitemap registered automatically.

This module never commits or deploys anything - it only writes local files.
"""
import concurrent.futures
import json
import re
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REFERENCE_TEMPLATE = ROOT / "knowledge" / "what-is-emotional-overwhelm.html"
KNOWLEDGE_JSON = ROOT / "assets" / "data" / "knowledge.json"
KNOWLEDGE_HTML = ROOT / "knowledge.html"
SITEMAP = ROOT / "sitemap.xml"
BASE_URL = "https://reikifish.com"

MIN_WORD_COUNT = 10000
# Unambiguous American spellings prohibited in generated Hub content.
# Context-sensitive words such as licence/license and practice/practise are
# deliberately excluded because they require grammatical interpretation.
US_ENGLISH_SPELLINGS = (
    "analyze", "analyzed", "analyzes", "analyzing",
    "behavior", "behaviors", "behavioral",
    "center", "centered", "centering", "centers",
    "color", "colored", "colors",
    "counseling",
    "defense",
    "emphasize", "emphasized", "emphasizes", "emphasizing",
    "favor", "favored", "favorite", "favors",
    "gray",
    "honor", "honored", "honors",
    "internalize", "internalized", "internalizes", "internalizing",
    "labor",
    "maximize", "maximized", "maximizes", "maximizing",
    "minimize", "minimized", "minimizes", "minimizing",
    "modeling",
    "neighbor", "neighbors",
    "normalize", "normalized", "normalizes", "normalizing",
    "offense",
    "organize", "organized", "organizes", "organizing",
    "organization", "organizations",
    "rationalize", "rationalized", "rationalizes", "rationalizing",
    "realize", "realized", "realizes", "realizing",
    "recognize", "recognized", "recognizes", "recognizing",
    "socialize", "socialized", "socializes", "socializing",
    "stabilize", "stabilized", "stabilizes", "stabilizing",
    "traumatize", "traumatized", "traumatizes", "traumatizing",
    "traveling",
    "utilize", "utilized", "utilizes", "utilizing",
)


EXTRA_CSS_TEMPLATE = """
.__P__-visual{min-height:300px;display:flex;align-items:center;justify-content:center;border:1px solid var(--b);border-radius:1.5rem;background:radial-gradient(circle at 50% 50%,rgba(239,177,38,.1),transparent 60%),#0d1514;padding:1.5rem}
.__P__-visual svg{width:100%;height:auto;display:block}
.__P__-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem;margin-top:1.5rem}
.__P__-card{padding:1.2rem 1.35rem;border:1px solid var(--b);border-radius:1rem;background:#0a1211}
.__P__-card h3{margin:0 0 .5rem;font:700 1.1rem Georgia,serif;color:var(--cream)}
.__P__-card p{margin:0;color:var(--muted);font-size:1rem;line-height:1.65}
.__P__-table-wrap{overflow-x:auto}
.__P__-table{width:100%;border-collapse:collapse;margin-top:1rem}
.__P__-table th,.__P__-table td{padding:.85rem 1rem;border-bottom:1px solid rgba(255,255,255,.1);text-align:left;color:var(--muted);font-size:.98rem;line-height:1.6}
.__P__-table th{color:var(--gold);font-size:.78rem;letter-spacing:.08em;text-transform:uppercase}
.__P__-faq details{padding:1.15rem;border:1px solid rgba(239,177,38,.25);border-radius:.9rem;margin-bottom:1rem;background:#0a1211}
.__P__-faq summary{cursor:pointer;font-weight:700;color:var(--cream)}
.__P__-faq details p{margin:.7rem 0 0;color:var(--muted);line-height:1.7}
@media(max-width:850px){.__P__-grid{grid-template-columns:1fr}}
"""

DEFAULT_SVG = (
    '<svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">'
    '<circle cx="100" cy="70" r="52" fill="none" stroke="#efb126" stroke-width="2" opacity=".5"/>'
    '<circle cx="100" cy="70" r="6" fill="#efb126"/></svg>'
)


@dataclass
class Section:
    id: str
    heading: str
    body_html: str
    kicker: str = ""


@dataclass
class HubPageSpec:
    slug: str
    title: str  # WITHOUT " | ReikiFish"
    category: str
    meta_description: str
    og_description: str
    keywords: list
    eyebrow: str
    lead: str
    sections: list  # list[Section]
    faqs: list  # list[tuple[str, str]]
    sources_html: str
    featured_icon: str
    featured_summary: str
    h1: str = ""
    note_html: str = ""
    svg_html: str = ""
    related_links: list = field(default_factory=list)  # list[tuple[label, url]]

    def __post_init__(self):
        if not self.h1:
            self.h1 = self.title.split(":")[0].strip()
        if not self.svg_html:
            self.svg_html = DEFAULT_SVG


def derive_prefix(slug: str) -> str:
    words = [w for w in re.split(r"[^a-z0-9]+", (slug or "").lower()) if w]
    letters = "".join(w[0] for w in words[:4])
    letters = re.sub(r"[^a-z]", "", letters)
    return letters[:4] or "hp"


def slugify(text: str) -> str:
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", (text or "").lower())).strip("-")


def _extract_template_parts(prefix: str):
    # Every generated hub page must use this exact reference template - no
    # other template file is ever read, so styling can never drift page to
    # page. Fail loudly rather than silently producing a broken/wrong page.
    if not REFERENCE_TEMPLATE.exists():
        raise RuntimeError(
            f"Hub page reference template is missing: {REFERENCE_TEMPLATE}. "
            "This file must always exist - it is the single source of truth "
            "for Knowledge Hub page styling."
        )
    ref = REFERENCE_TEMPLATE.read_text(encoding="utf-8")

    required_markers = (".rf-sop-page", "RF_EMOTIONAL_OVERWHELM_FULL_STYLES_END", "<body class=", "<footer class=")
    missing = [m for m in required_markers if m not in ref]
    if missing:
        raise RuntimeError(
            f"Reference template {REFERENCE_TEMPLATE.name} is missing expected marker(s) "
            f"{missing} - it may have been edited. Refusing to generate a page with "
            "unverified styling."
        )

    style_start = ref.index(".rf-sop-page")
    end_marker_pos = ref.index("RF_EMOTIONAL_OVERWHELM_FULL_STYLES_END")
    # last </style> BEFORE the marker - not after, or the whole rest of the
    # reference document gets swept into the extracted CSS (~180KB bug).
    style_end = ref.rindex("</style>", style_start, end_marker_pos) + len("</style>")
    css = ref[style_start:style_end]

    # topic-specific diagram CSS from the reference page is not reused
    css = re.sub(r"/\* RF_EO_ORTHOGONAL_DIAGRAM \*/.*?(?=</style>)", "", css, flags=re.S)
    # extracted range spans two sequential <style> blocks; strip all embedded
    # tags so we control a single clean wrapper ourselves
    css = re.sub(r"</?style[^>]*>", "", css)
    # invalid HTML comments left mid-CSS silently break the parser and drop
    # the --g/--c custom-property block that follows (gold kicker color bug)
    css = re.sub(r"<!--.*?-->", "", css, flags=re.S)
    css = re.sub(r"rf-eo-", f"{prefix}-", css)
    css = re.sub(r"rf-sop-", f"{prefix}-", css)
    css += EXTRA_CSS_TEMPLATE.replace("__P__", prefix)

    nav_start = ref.index("<body class=")
    nav_end = ref.index("</header>", nav_start) + len("</header>")
    nav_block = ref[nav_start:nav_end]

    footer_start = ref.index("<footer class=")
    body_end = ref.index("</body>", footer_start)
    footer_scripts = ref[footer_start:body_end]
    if "mega-menu.js" not in footer_scripts:
        footer_scripts += (
            '\n<script src="/assets/js/mega-menu.js?v=20260813-force2"></script>'
            '\n<script src="/assets/js/mega-menu-controller.js?v=20260817-breadcrumb-fix2"></script>'
        )

    return css, nav_block, footer_scripts


def _content_fragments(spec: HubPageSpec):
    """The user-authored HTML fragments (excludes shared nav/footer/CSS boilerplate)."""
    sections_html = "\n".join(
        f'<section class="__P__-section" id="{s.id}"><span class="__P__-label">{s.kicker}</span>'
        f"<h2>{s.heading}</h2>{s.body_html}</section>"
        for s in spec.sections
    )
    faq_items = "".join(
        f"<details><summary>{q}</summary><p>{a}</p></details>" for q, a in spec.faqs
    )
    sources_html = spec.sources_html.strip()
    if sources_html and "<ol" not in sources_html and "<ul" not in sources_html:
        sources_html = f"<ol>{sources_html}</ol>"
    related_html = "".join(
        f'<a href="{url}">{label} <span>&rarr;</span></a>' for label, url in spec.related_links if label and url
    )
    return sections_html, faq_items, sources_html, related_html


def build_hub_page(spec: HubPageSpec) -> str:
    prefix = derive_prefix(spec.slug)
    css, nav_block, footer_scripts = _extract_template_parts(prefix)
    p = prefix

    sections_html_raw, faq_items, sources_html, related_html = _content_fragments(spec)
    sections_html = sections_html_raw.replace("__P__", p)

    faq_html = (
        f'<section class="{p}-section {p}-faq" id="faq"><span class="{p}-label">FAQs</span>'
        f"<h2>{spec.h1} questions answered</h2>{faq_items}</section>"
    )
    category_query = spec.category.replace(" ", "%20")
    sources_section = (
        f'<section class="{p}-section" id="sources"><span class="{p}-label">Evidence and limits</span>'
        f"<h2>Sources and further reading</h2>{sources_html}"
        f'<p>Return to the <a href="/knowledge">Knowledge Hub</a> or browse the '
        f'<a href="/knowledge-search?category={category_query}">{spec.category} index</a>.</p></section>'
    )

    sidebar_links = "".join(
        f'<a href="#{s.id}"><span>{s.heading}</span><span class="{p}-arrow" aria-hidden="true">&rarr;</span></a>'
        for s in spec.sections
    )
    sidebar_links += f'<a href="#faq"><span>FAQs</span><span class="{p}-arrow" aria-hidden="true">&rarr;</span></a>'
    sidebar_links += f'<a href="#sources"><span>Sources</span><span class="{p}-arrow" aria-hidden="true">&rarr;</span></a>'

    note_html = f'<div class="{p}-note">{spec.note_html}</div>' if spec.note_html else ""
    canonical = f"{BASE_URL}/knowledge/{spec.slug}"
    full_title = f"{spec.title} | ReikiFish"

    json_ld = {
        "@context": "https://schema.org",
        "@type": "MedicalWebPage",
        "name": spec.h1,
        "headline": spec.h1,
        "description": spec.og_description or spec.meta_description,
        "url": canonical,
        "inLanguage": "en-GB",
        "isPartOf": {"@type": "WebSite", "name": "ReikiFish", "url": f"{BASE_URL}/"},
        "publisher": {"@type": "Organization", "name": "ReikiFish"},
    }

    head = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{full_title}</title>
  <meta name="description" content="{spec.meta_description}">
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
  <link rel="canonical" href="{canonical}">
  <meta property="og:type" content="article"><meta property="og:site_name" content="ReikiFish"><meta property="og:title" content="{spec.title}"><meta property="og:description" content="{spec.og_description}"><meta property="og:url" content="{canonical}"><meta property="og:locale" content="en_GB">
  <meta name="twitter:card" content="summary"><meta name="twitter:title" content="{spec.title}"><meta name="twitter:description" content="{spec.og_description}">
  <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet"><link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet"><link rel="icon" type="image/svg+xml" href="/assets/images/favicon.svg"><link rel="stylesheet" href="/assets/css/style.css?v=20260819-{spec.slug}"><link rel="stylesheet" href="/assets/css/mobile-responsive.css?v=20260819-{spec.slug}"><link rel="stylesheet" href="/assets/css/mega-menu.css?v=20260813-force2"><link rel="stylesheet" href="/assets/css/mega-menu-controller.css?v=20260817-breadcrumb-fix2">
  <style>
{css}
  </style>
  <script type="application/ld+json">{json.dumps(json_ld)}</script>
</head>
"""

    body = f"""{nav_block}
<main class="{p}-page" id="main-content"><div class="{p}-wrap"><div class="{p}-back"><a href="/knowledge">&larr; Knowledge Hub</a></div>
<section class="{p}-hero" aria-labelledby="{p}-title"><div><span class="{p}-kicker">{spec.eyebrow}</span><h1 id="{p}-title">{spec.h1}</h1><p>{spec.lead}</p>{note_html}</div>
<div class="{p}-visual" aria-label="Illustrative diagram">{spec.svg_html}</div>
</section>
<div class="{p}-layout"><article>
{sections_html}
{faq_html}
{sources_section}
</article>
<aside class="{p}-side"><section class="{p}-box"><h2>On this page</h2><nav>{sidebar_links}</nav></section>
<section class="{p}-box"><h2>Related Knowledge</h2>{related_html}</section>
</aside></div></div></main>

{footer_scripts}
</body></html>
"""
    return head + body


# ---------------------------------------------------------------------------
# SOP validation
# ---------------------------------------------------------------------------

_TAG_RE = re.compile(r"<[^>]+>")
_WORD_RE = re.compile(r"[A-Za-z0-9'\u2019-]+")
_LINK_RE = re.compile(r'(?:href|src)="([^"]+)"')


def count_words(spec: HubPageSpec) -> int:
    sections_html, faq_items, sources_html, related_html = _content_fragments(spec)
    text_parts = [spec.lead, spec.note_html, sections_html, faq_items, sources_html]
    text = " ".join(_TAG_RE.sub(" ", t) for t in text_parts if t)
    return len(_WORD_RE.findall(text))


def slug_taken(slug: str) -> bool:
    out_path = ROOT / "knowledge" / f"{slug}.html"
    if out_path.exists():
        return True
    if KNOWLEDGE_JSON.exists():
        data = json.loads(KNOWLEDGE_JSON.read_text(encoding="utf-8"))
        if any(d.get("slug") == slug for d in data):
            return True
    return False


def validate_seo(spec: HubPageSpec) -> list:
    """Returns a list of {level: 'error'|'warning', field, message} dicts."""
    issues = []

    def err(field_, message):
        issues.append({"level": "error", "field": field_, "message": message})

    def warn(field_, message):
        issues.append({"level": "warning", "field": field_, "message": message})

    if not spec.slug or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", spec.slug):
        err("slug", "Slug must be lowercase letters, numbers and hyphens only.")
    elif slug_taken(spec.slug):
        err("slug", f"Slug '{spec.slug}' already exists (file or knowledge.json entry).")

    if not spec.title or len(spec.title) < 10:
        err("title", "Title is required (minimum 10 characters).")
    else:
        full_title_len = len(f"{spec.title} | ReikiFish")
        if not (50 <= full_title_len <= 60):
            err(
                "title",
                f"Full meta title (\"{spec.title} | ReikiFish\") is "
                f"{full_title_len} characters; SEO requires 50-60."
            )

    if not spec.meta_description:
        err("meta_description", "Meta description is required.")
    elif not (145 <= len(spec.meta_description) <= 155):
        err("meta_description", f"Meta description is {len(spec.meta_description)} characters; SEO requires 145-155.")

    content_for_language_check = " ".join([
        spec.title,
        spec.h1,
        spec.meta_description,
        spec.og_description,
        spec.lead,
        spec.note_html,
        spec.featured_summary,
        " ".join(section.heading + " " + section.body_html for section in spec.sections),
        " ".join(question + " " + answer for question, answer in spec.faqs),
    ])
    content_for_language_check = re.sub(
        r"<[^>]+>",
        " ",
        content_for_language_check,
    ).lower()

    american_spellings_found = sorted({
        spelling
        for spelling in US_ENGLISH_SPELLINGS
        if re.search(rf"\b{re.escape(spelling)}\b", content_for_language_check)
    })

    if american_spellings_found:
        err(
            "british_english",
            "American English spelling detected: "
            + ", ".join(american_spellings_found)
            + ". Use British English throughout before publishing."
        )
    if not spec.category:
        err("category", "Category is required.")
    if not spec.og_description:
        warn("og_description", "OG description is empty; social shares will fall back to the meta description.")

    if not spec.featured_summary or not (60 <= len(spec.featured_summary) <= 220):
        warn("featured_summary", "Featured card summary should be roughly 60-220 characters.")

    if (
        not spec.svg_html
        or spec.svg_html == DEFAULT_SVG
        or "<text" not in spec.svg_html
        or "<line" not in spec.svg_html
    ):
        err(
            "diagram",
            "A topic-specific labelled visual diagram is required. "
            "Regenerate the AI draft before publishing."
        )
    alt_match = re.search(
        r'<svg\b[^>]*\baria-label="([^"]+)"',
        spec.svg_html,
        re.I,
    )

    if not alt_match:
        err(
            "diagram_alt",
            "The visual diagram requires an accessibility description."
        )
    elif len(alt_match.group(1)) > 100:
        err(
            "diagram_alt",
            f"Diagram accessibility description is "
            f"{len(alt_match.group(1))} characters; maximum is 100."
        )

    if len(spec.sections) < 3:
        err("sections", "Add at least 3 content sections.")

    if len(spec.faqs) < 3:
        warn("faqs", "Add at least 3 FAQ items for FAQ SEO value.")

    return issues


def _check_internal_link(url: str) -> bool:
    path = url.split("#")[0].split("?")[0]
    if not path:
        return True
    candidate = ROOT / path.lstrip("/")
    if candidate.exists():
        return True
    if candidate.suffix == "" and (ROOT / (path.lstrip("/") + ".html")).exists():
        return True
    return False


def _check_external_link(url: str, timeout: float = 5.0) -> bool:
    headers = {"User-Agent": "Mozilla/5.0 ReikiFishLinkChecker"}
    for method in ("HEAD", "GET"):
        try:
            req = urllib.request.Request(url, method=method, headers=headers)
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.status < 400
        except Exception:
            continue
    return False


def check_links(spec: HubPageSpec) -> list:
    """Checks links found only within the user-authored content (sections,
    FAQs, sources, related links) - not the shared nav/footer boilerplate,
    which is already proven working across the rest of the site."""
    sections_html, faq_items, sources_html, related_html = _content_fragments(spec)
    fragment = "\n".join([sections_html, faq_items, sources_html, related_html])

    seen = set()
    links = []
    for m in _LINK_RE.finditer(fragment):
        url = m.group(1)
        if url.startswith(("#", "mailto:", "tel:")) or url in seen:
            continue
        seen.add(url)
        links.append(url)

    external = [l for l in links if l.startswith("http://") or l.startswith("https://")]
    internal = [l for l in links if l not in external]

    results = [{"url": l, "type": "internal", "ok": _check_internal_link(l)} for l in internal]

    if external:
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            futures = {pool.submit(_check_external_link, l): l for l in external}
            for fut in concurrent.futures.as_completed(futures):
                results.append({"url": futures[fut], "type": "external", "ok": fut.result()})

    return results


def _normalise_spec_british_english(spec: HubPageSpec) -> HubPageSpec:
    """Convert every editable content field to British English in place."""
    from ai_hub_writer import _clean_ai_text

    simple_fields = (
        "title",
        "h1",
        "meta_description",
        "og_description",
        "eyebrow",
        "lead",
        "note_html",
        "featured_summary",
    )

    for field_name in simple_fields:
        value = getattr(spec, field_name, "")
        if value:
            setattr(spec, field_name, _clean_ai_text(value))

    for section in spec.sections:
        section.heading = _clean_ai_text(section.heading)
        section.kicker = _clean_ai_text(section.kicker)
        section.body_html = _clean_ai_text(section.body_html)

    spec.faqs = [
        (
            _clean_ai_text(question),
            _clean_ai_text(answer),
        )
        for question, answer in spec.faqs
    ]

    spec.related_links = [
        (
            _clean_ai_text(label),
            url,
        )
        for label, url in spec.related_links
    ]

    return spec


def run_sop_checks(spec: HubPageSpec) -> dict:
    spec = _normalise_spec_british_english(spec)
    word_count = count_words(spec)
    seo_issues = validate_seo(spec)
    link_results = check_links(spec)

    broken_internal = [r for r in link_results if r["type"] == "internal" and not r["ok"]]
    broken_external = [r for r in link_results if r["type"] == "external" and not r["ok"]]

    errors = [i for i in seo_issues if i["level"] == "error"]
    if word_count < MIN_WORD_COUNT:
        errors.append({
            "level": "error", "field": "word_count",
            "message": f"Only {word_count} words; minimum is {MIN_WORD_COUNT}.",
        })
    for r in broken_internal:
        errors.append({"level": "error", "field": "links", "message": f"Broken internal link: {r['url']}"})

    warnings = [i for i in seo_issues if i["level"] == "warning"]
    for r in broken_external:
        warnings.append({"level": "warning", "field": "links", "message": f"External link unreachable: {r['url']}"})

    return {
        "word_count": word_count,
        "word_count_ok": word_count >= MIN_WORD_COUNT,
        "min_word_count": MIN_WORD_COUNT,
        "issues": seo_issues,
        "links": link_results,
        "errors": errors,
        "warnings": warnings,
        "passed": len(errors) == 0,
    }


# ---------------------------------------------------------------------------
# Writing + registration (local files only - no git, no deploy)
# ---------------------------------------------------------------------------

def write_hub_page(spec: HubPageSpec) -> Path:
    spec = _normalise_spec_british_english(spec)
    html = build_hub_page(spec)
    out_path = ROOT / "knowledge" / f"{spec.slug}.html"
    out_path.write_text(html, encoding="utf-8")
    return out_path


def register_hub_page(spec: HubPageSpec):
    """
    Register one generated guide safely.

    The real Knowledge Hub landing page is ROOT / "knowledge.html".
    The obsolete knowledge/index.html file is never read or written.

    Knowledge data, the featured card and sitemap are treated as one
    transaction. If any operation or validation fails, all three files
    are restored to their exact previous bytes.
    """
    protected_files = (KNOWLEDGE_JSON, KNOWLEDGE_HTML, SITEMAP)
    original_bytes = {
        path: path.read_bytes()
        for path in protected_files
        if path.exists()
    }

    try:
        original_hub = KNOWLEDGE_HTML.read_text(encoding="utf-8")

        required_hub_markers = (
            "<!DOCTYPE html",
            '<div class="kb-featured-grid">',
            "</body>",
            "</html>",
        )
        missing = [
            marker
            for marker in required_hub_markers
            if marker not in original_hub
        ]
        if missing:
            raise RuntimeError(
                "Knowledge Hub safety check failed before registration. "
                f"Missing required marker(s): {missing}"
            )

        if original_hub.count('<div class="kb-featured-grid">') != 1:
            raise RuntimeError(
                "Knowledge Hub safety check failed: expected exactly one "
                "featured-card grid."
            )

        _add_to_knowledge_json(spec)
        _add_featured_card(spec)
        _add_to_sitemap(spec)

        updated_hub = KNOWLEDGE_HTML.read_text(encoding="utf-8")
        start_marker = f"<!-- HUB-CARD:{spec.slug} START -->"
        end_marker = f"<!-- HUB-CARD:{spec.slug} END -->"

        if updated_hub.count(start_marker) != 1:
            raise RuntimeError(
                "Featured-card validation failed: start marker is missing "
                "or duplicated."
            )

        if updated_hub.count(end_marker) != 1:
            raise RuntimeError(
                "Featured-card validation failed: end marker is missing "
                "or duplicated."
            )

        for marker in required_hub_markers:
            if marker not in updated_hub:
                raise RuntimeError(
                    "Knowledge Hub layout validation failed after registration. "
                    f"Missing marker: {marker}"
                )

        if updated_hub.count('<div class="kb-featured-grid">') != 1:
            raise RuntimeError(
                "Knowledge Hub featured-card grid was unexpectedly altered."
            )

    except Exception:
        for path, content in original_bytes.items():
            path.write_bytes(content)
        raise

def _add_to_knowledge_json(spec: HubPageSpec):
    data = json.loads(KNOWLEDGE_JSON.read_text(encoding="utf-8"))
    data = [d for d in data if d.get("slug") != spec.slug]
    data.append({
        "slug": spec.slug,
        "title": spec.h1,
        "type": "Complete Guide",
        "category": spec.category,
        "summary": spec.featured_summary,
        "url": f"knowledge/{spec.slug}",
    })
    KNOWLEDGE_JSON.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def _add_featured_card(spec: HubPageSpec):
    html = KNOWLEDGE_HTML.read_text(encoding="utf-8")
    start_marker = f"<!-- HUB-CARD:{spec.slug} START -->"
    if start_marker in html:
        return
    end_marker = f"<!-- HUB-CARD:{spec.slug} END -->"
    marker = '<div class="kb-featured-grid">'
    idx = html.index(marker) + len(marker)
    card = (
        f"\n{start_marker}\n"
        f'<a class="kb-featured-card kb-featured-card-primary" href="/knowledge/{spec.slug}" '
        f'aria-label="Read {spec.h1}: Complete Guide">'
        f'<div class="kb-featured-badges"><span class="kb-featured-badge kb-featured-badge-new">New</span>'
        f'<span class="kb-featured-badge">Complete guide</span></div>'
        f'<span class="kb-featured-icon" aria-hidden="true">{spec.featured_icon}</span>'
        f"<h3>{spec.h1}</h3><p>{spec.featured_summary}</p>"
        f'<span class="kb-featured-action">Explore {spec.h1}'
        f'<span class="kb-featured-arrow" aria-hidden="true">\u2192</span></span></a>\n'
        f"{end_marker}\n"
    )
    html = html[:idx] + card + html[idx:]
    KNOWLEDGE_HTML.write_text(html, encoding="utf-8")


def _add_to_sitemap(spec: HubPageSpec):
    xml = SITEMAP.read_text(encoding="utf-8")
    loc = f"{BASE_URL}/knowledge/{spec.slug}"
    if loc in xml:
        return
    entry = (
        f"  <url>\n    <loc>{loc}</loc>\n"
        f"    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>\n"
    )
    xml = xml.replace("</urlset>", entry + "</urlset>")
    SITEMAP.write_text(xml, encoding="utf-8")


def _normalise_british_english(value):
    """Recursively convert generated form data to British English."""
    # Imported here to avoid a module-loading loop: ai_hub_writer imports this
    # library when generating a draft.
    from ai_hub_writer import _clean_ai_text

    if isinstance(value, str):
        return _clean_ai_text(value)

    if isinstance(value, list):
        return [
            _normalise_british_english(item)
            for item in value
        ]

    if isinstance(value, tuple):
        return tuple(
            _normalise_british_english(item)
            for item in value
        )

    if isinstance(value, dict):
        return {
            key: _normalise_british_english(item)
            for key, item in value.items()
        }

    return value

def spec_from_dict(data: dict) -> HubPageSpec:
    data = _normalise_british_english(data)
    sections = [
        Section(
            id=s.get("id") or slugify(s.get("heading", "")) or f"section-{i+1}",
            heading=s.get("heading", ""),
            body_html=s.get("body_html", ""),
            kicker=s.get("kicker", ""),
        )
        for i, s in enumerate(data.get("sections") or [])
        if (s.get("heading") or s.get("body_html"))
    ]
    faqs = [
        (f.get("question", ""), f.get("answer", ""))
        for f in (data.get("faqs") or [])
        if f.get("question") and f.get("answer")
    ]
    related_links = [
        (r.get("label", ""), r.get("url", ""))
        for r in (data.get("related_links") or [])
        if r.get("label") and r.get("url")
    ]
    keywords = [k.strip() for k in (data.get("keywords") or "").split(",") if k.strip()] \
        if isinstance(data.get("keywords"), str) else list(data.get("keywords") or [])

    slug = slugify(data.get("slug") or data.get("title", ""))

    return HubPageSpec(
        slug=slug,
        title=(data.get("title") or "").strip(),
        category=(data.get("category") or "").strip(),
        meta_description=(data.get("meta_description") or "").strip(),
        og_description=(data.get("og_description") or "").strip(),
        keywords=keywords,
        eyebrow=(data.get("eyebrow") or "").strip(),
        lead=(data.get("lead") or "").strip(),
        sections=sections,
        faqs=faqs,
        sources_html=(data.get("sources_html") or "").strip(),
        featured_icon=(data.get("featured_icon") or (data.get("title") or "?")[:1].upper()).strip(),
        featured_summary=(data.get("featured_summary") or "").strip(),
        h1=(data.get("h1") or "").strip(),
        note_html=(data.get("note_html") or "").strip(),
        svg_html=(data.get("svg_html") or "").strip(),
        related_links=related_links,
    )

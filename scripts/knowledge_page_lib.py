"""
Reusable generator for ReikiFish Knowledge Hub 'Complete Guide' pages.

Usage:
    from knowledge_page_lib import build_page, PageSpec, Section

    spec = PageSpec(
        slug="the-bystander-effect",
        prefix="be",
        category="Social Psychology",
        title="The Bystander Effect: A Complete Evidence-Led Guide",
        meta_description="...(<=155 chars)...",
        keywords=["bystander effect", "diffusion of responsibility", ...],
        og_description="...",
        eyebrow="ReikiFish Knowledge Hub · Social Psychology",
        h1_html="The <span>Bystander Effect</span>",
        lead="...",
        note_html="<strong>Important distinction:</strong> ...",
        svg_html="<svg ...>...</svg>",
        sections=[Section(id="overview", kicker="...", heading="...", body_html="<p>...</p>")],
        faqs=[("Question?", "Answer.")],
        sources_html="<ol><li>...</li></ol>",
        featured_icon="B",
        featured_summary="...(<=200 chars, used on featured card + knowledge.json)...",
    )
    build_page(spec)

This extracts the shared CSS/nav/footer/scripts ONCE from the canonical
reference template (knowledge/neuroplasticity.html) and reuses it verbatim
(with the class prefix renamed), so every generated page is pixel-identical
in layout/styling to the rest of the Knowledge Hub. Only the content,
metadata and class-prefix differ per page.

After generating the HTML file, call:
    register_page(spec)  # adds knowledge.json entry, featured card, sitemap entry
"""
import json
import re
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REFERENCE_TEMPLATE = ROOT / "knowledge" / "neuroplasticity.html"
KNOWLEDGE_JSON = ROOT / "assets" / "data" / "knowledge.json"
KNOWLEDGE_HTML = ROOT / "knowledge.html"
SITEMAP = ROOT / "sitemap.xml"
BASE_URL = "https://reikifish.com"


@dataclass
class Section:
    id: str
    kicker: str
    heading: str
    body_html: str  # full inner HTML for the section (paragraphs, lists, notes, grids, tables)


@dataclass
class PageSpec:
    slug: str
    prefix: str  # short CSS class prefix unique to this page, e.g. "be"
    category: str
    title: str  # full <title> text, WITHOUT " | ReikiFish" (added automatically)
    meta_description: str
    keywords: list
    og_description: str
    eyebrow: str
    h1_html: str
    lead: str
    svg_html: str
    sections: list  # list[Section]
    faqs: list  # list[tuple[str, str]]
    sources_html: str
    featured_icon: str
    featured_summary: str
    note_html: str = ""
    sidebar_title: str = "Navigate the evidence"
    sidebar_copy: str = "Move through the guide section by section."


def _extract_reference_parts():
    content = REFERENCE_TEMPLATE.read_text(encoding="utf-8")

    style_start = content.index(".np-page{min-height")
    style_end = content.index("</style>", style_start)
    css = content[style_start:style_end]

    nav_start = content.index("<body class=")
    nav_end = content.index("</header>", nav_start) + len("</header>")
    nav_block = content[nav_start:nav_end]

    footer_start = content.index("<footer class=")
    body_end = content.index("</body>", footer_start)
    footer_scripts = content[footer_start:body_end]

    return css, nav_block, footer_scripts


def build_page(spec: PageSpec) -> Path:
    css, nav_block, footer_scripts = _extract_reference_parts()

    p = spec.prefix
    css = css.replace("np-", f"{p}-")
    canonical = f"{BASE_URL}/knowledge/{spec.slug}.html"
    full_title = f"{spec.title} | ReikiFish"

    keywords_attr = ", ".join(spec.keywords)

    sections_html = "\n".join(
        f'<section class="{p}-section" id="{s.id}">'
        f'<div class="{p}-section-head"><div class="{p}-kicker">{s.kicker}</div>'
        f"<h2>{s.heading}</h2></div>{s.body_html}</section>"
        for s in spec.sections
    )

    faq_items = "".join(
        f"<details><summary>{q}</summary><div><p>{a}</p></div></details>"
        for q, a in spec.faqs
    )
    faq_html = (
        f'<section class="{p}-section {p}-faq" id="faq">'
        f'<div class="{p}-section-head"><div class="{p}-kicker">FAQs</div>'
        f"<h2>{spec.title.split(':')[0]} questions answered</h2></div>{faq_items}</section>"
    )

    sources_section = (
        f'<section class="{p}-section {p}-references" id="sources">'
        f'<div class="{p}-section-head"><div class="{p}-kicker">Evidence and limits</div>'
        f"<h2>Sources and further reading</h2></div>{spec.sources_html}"
        f'<p>Return to the <a href="/knowledge.html">Knowledge Hub</a> or browse the '
        f'<a href="/knowledge-search.html?category={spec.category.replace(" ", "%20")}">'
        f"{spec.category} index</a>.</p></section>"
    )

    sidebar_links = "".join(
        f'<a href="/knowledge/{spec.slug}.html#{s.id}">{s.heading}</a>' for s in spec.sections
    )
    sidebar_links += f'<a href="/knowledge/{spec.slug}.html#faq">FAQs</a>'
    sidebar_links += f'<a href="/knowledge/{spec.slug}.html#sources">Sources</a>'

    note_html = (
        f'<div class="{p}-note">{spec.note_html}</div>' if spec.note_html else ""
    )

    json_ld = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Article",
                "@id": f"{canonical}#article",
                "headline": spec.title,
                "description": spec.og_description,
                "inLanguage": "en-GB",
                "author": {"@type": "Person", "name": "Andy Fish", "url": f"{BASE_URL}/about.html"},
                "publisher": {"@type": "Organization", "name": "ReikiFish", "url": f"{BASE_URL}/"},
                "mainEntityOfPage": {"@type": "WebPage", "@id": canonical},
            },
            {
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "Knowledge Hub", "item": f"{BASE_URL}/knowledge.html"},
                    {"@type": "ListItem", "position": 2, "name": spec.title.split(":")[0], "item": canonical},
                ],
            },
        ],
    }

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{full_title}</title>
  <meta name="description" content="{spec.meta_description}">
  <meta name="keywords" content="{keywords_attr}">
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
{nav_block}
<main class="{p}-page" id="main-content"><article><header class="{p}-hero"><div class="{p}-wrap {p}-hero-grid"><div><div class="{p}-eyebrow">{spec.eyebrow}</div><h1>{spec.h1_html}</h1><p class="{p}-lead">{spec.lead}</p>{note_html}</div><div class="{p}-visual" aria-label="Illustrative diagram">{spec.svg_html}</div></div></header>
<div class="{p}-layout {p}-wrap"><div class="{p}-content">
{sections_html}
{faq_html}
{sources_section}
</div><aside class="{p}-sidebar" aria-label="{spec.title.split(':')[0]} guide navigation"><div class="{p}-sidebar-card"><p class="{p}-kicker">Guide sections</p><p class="{p}-sidebar-title">{spec.sidebar_title}</p><p class="{p}-sidebar-copy">{spec.sidebar_copy}</p><nav>{sidebar_links}</nav></div></aside></div></article></main>
{footer_scripts}
</body></html>
"""

    out_path = ROOT / "knowledge" / f"{spec.slug}.html"
    out_path.write_text(html, encoding="utf-8")
    return out_path


def register_page(spec: PageSpec, make_first_featured: bool = True):
    """Add the new page to knowledge.json (search/category index),
    knowledge.html (featured grid) and sitemap.xml."""
    _add_to_knowledge_json(spec)
    if make_first_featured:
        _add_featured_card(spec)
    _add_to_sitemap(spec)


def _add_to_knowledge_json(spec: PageSpec):
    data = json.loads(KNOWLEDGE_JSON.read_text(encoding="utf-8"))
    entry = {
        "slug": spec.slug,
        "title": spec.title.split(":")[0],
        "type": "Complete Guide",
        "category": spec.category,
        "summary": spec.featured_summary,
        "keywords": spec.keywords,
        "url": f"knowledge/{spec.slug}.html",
    }
    data = [d for d in data if d.get("slug") != spec.slug]
    data.append(entry)
    KNOWLEDGE_JSON.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def _add_featured_card(spec: PageSpec):
    html = KNOWLEDGE_HTML.read_text(encoding="utf-8")
    title_short = spec.title.split(":")[0]
    start_marker = f"<!-- {title_short.upper()} NEWEST GUIDE START -->"
    if start_marker in html:
        return
    marker = "<div class=\"kb-featured-grid\">"
    idx = html.index(marker) + len(marker)
    card = (
        f'\n{start_marker}\n'
        f'<a class="kb-featured-card kb-featured-card-primary"\n'
        f'   href="/knowledge/{spec.slug}.html"\n'
        f'   aria-label="Read {title_short}: Complete Guide">\n'
        f'  <div class="kb-featured-badges">\n'
        f'    <span class="kb-featured-badge kb-featured-badge-new">New</span>\n'
        f'    <span class="kb-featured-badge">Complete guide</span>\n'
        f"  </div>\n"
        f'  <span class="kb-featured-icon" aria-hidden="true">{spec.featured_icon}</span>\n'
        f"  <h3>{title_short}</h3>\n"
        f"  <p>{spec.featured_summary}</p>\n"
        f'  <span class="kb-featured-action">Explore {title_short}<span class="kb-featured-arrow" aria-hidden="true">\u2192</span></span>\n'
        f"</a>\n"
        f'<!-- {title_short.upper()} NEWEST GUIDE END -->\n'
    )
    html = html[:idx] + card + html[idx:]
    KNOWLEDGE_HTML.write_text(html, encoding="utf-8")


def _add_to_sitemap(spec: PageSpec):
    xml = SITEMAP.read_text(encoding="utf-8")
    loc = f"{BASE_URL}/knowledge/{spec.slug}.html"
    if loc in xml:
        return
    entry = (
        f"  <url>\n    <loc>{loc}</loc>\n"
        f"    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>\n"
    )
    xml = xml.replace("</urlset>", entry + "</urlset>")
    SITEMAP.write_text(xml, encoding="utf-8")

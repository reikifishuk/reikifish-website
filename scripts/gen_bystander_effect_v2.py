"""Rebuilds 'The Bystander Effect' using the what-is-emotional-overwhelm.html
template pattern (rf-eo-/rf-sop- classes renamed to be-), per explicit request
to match that page's styling instead of the neuroplasticity.html pattern.
Reuses the already-written content from gen_bystander_effect.py."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REF = ROOT / "knowledge" / "what-is-emotional-overwhelm.html"
OUT = ROOT / "knowledge" / "the-bystander-effect.html"
BASE_URL = "https://reikifish.com"

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from gen_bystander_effect import sections, faqs, sources_html, SVG  # reuse content

ref = REF.read_text(encoding="utf-8")

# --- extract reusable shell pieces from the reference page ---
style_start = ref.index(".rf-sop-page")
end_marker_pos = ref.index("RF_EMOTIONAL_OVERWHELM_FULL_STYLES_END")
style_end = ref.rindex("</style>", style_start, end_marker_pos) + len("</style>")
css = ref[style_start:style_end]
# strip the topic-specific orthogonal-diagram CSS block (not reused)
css = re.sub(r"/\* RF_EO_ORTHOGONAL_DIAGRAM \*/.*?(?=</style>)", "", css, flags=re.S)
# the extracted range spans two sequential <style> blocks in the source; remove
# every embedded style tag so we control a single clean wrapper ourselves
css = re.sub(r"</?style[^>]*>", "", css)
# strip HTML-style comments left between the two blocks (invalid CSS syntax,
# corrupts parsing and silently drops the rules that follow)
css = re.sub(r"<!--.*?-->", "", css, flags=re.S)
css = re.sub(r"rf-eo-", "be-", css)
css = re.sub(r"rf-sop-", "be-", css)
css += """
.be-visual{min-height:300px;display:flex;align-items:center;justify-content:center;border:1px solid var(--b);border-radius:1.5rem;background:radial-gradient(circle at 50% 50%,rgba(239,177,38,.1),transparent 60%),#0d1514;padding:1.5rem}
.be-visual svg{width:100%;height:auto;display:block}
.be-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem;margin-top:1.5rem}
.be-card{padding:1.2rem 1.35rem;border:1px solid var(--b);border-radius:1rem;background:#0a1211}
.be-card h3{margin:0 0 .5rem;font:700 1.1rem Georgia,serif;color:var(--cream)}
.be-card p{margin:0;color:var(--muted);font-size:1rem;line-height:1.65}
.be-table-wrap{overflow-x:auto}
.be-table{width:100%;border-collapse:collapse;margin-top:1rem}
.be-table th,.be-table td{padding:.85rem 1rem;border-bottom:1px solid rgba(255,255,255,.1);text-align:left;color:var(--muted);font-size:.98rem;line-height:1.6}
.be-table th{color:var(--gold);font-size:.78rem;letter-spacing:.08em;text-transform:uppercase}
.be-faq details{padding:1.15rem;border:1px solid rgba(239,177,38,.25);border-radius:.9rem;margin-bottom:1rem;background:#0a1211}
.be-faq summary{cursor:pointer;font-weight:700;color:var(--cream)}
.be-faq details p{margin:.7rem 0 0;color:var(--muted);line-height:1.7}
@media(max-width:850px){.be-grid{grid-template-columns:1fr}}
"""

nav_start = ref.index("<body class=")
nav_end = ref.index("</header>", nav_start) + len("</header>")
nav_block = ref[nav_start:nav_end]

footer_start = ref.index("<footer class=")
body_end = ref.index("</body>", footer_start)
footer_scripts = ref[footer_start:body_end]
footer_scripts = footer_scripts.replace(
    '/assets/js/main.js?v=20260811-support-nav-v2', '/assets/js/main.js?v=20260819-bystander-effect'
)
if "mega-menu.js" not in footer_scripts:
    footer_scripts += (
        '\n<script src="/assets/js/mega-menu.js?v=20260813-force2"></script>'
        '\n<script src="/assets/js/mega-menu-controller.js?v=20260817-breadcrumb-fix2"></script>'
    )

# --- build content ---
slug = "the-bystander-effect"
title = "The Bystander Effect: A Complete Evidence-Led Guide"
canonical = f"{BASE_URL}/knowledge/{slug}.html"
meta_description = "An evidence-led guide to the bystander effect: why people help less in groups, the Kitty Genovese case, real CCTV evidence and how to intervene."
og_description = "Understand why people are less likely to help in groups, what real-world evidence shows, and practical ways to become a more effective bystander."
keywords = ["bystander effect", "diffusion of responsibility", "pluralistic ignorance", "Kitty Genovese", "bystander intervention", "social psychology"]

sections_html = "\n".join(
    f'<section class="be-section" id="{s.id}"><span class="be-label">{s.kicker}</span><h2>{s.heading}</h2>{s.body_html}</section>'
    for s in sections
)

faq_items = "".join(
    f"<details><summary>{q}</summary><p>{a}</p></details>" for q, a in faqs
)
faq_html = f'<section class="be-section be-faq" id="faq"><span class="be-label">FAQs</span><h2>The Bystander Effect questions answered</h2>{faq_items}</section>'

sources_section = (
    f'<section class="be-section" id="sources"><span class="be-label">Evidence and limits</span>'
    f"<h2>Sources and further reading</h2>{sources_html}"
    f'<p>Return to the <a href="/knowledge.html">Knowledge Hub</a> or browse the '
    f'<a href="/knowledge-search.html?category=Social%20Psychology">Social Psychology index</a>.</p></section>'
)

sidebar_links = "".join(
    f'<a href="#{s.id}"><span>{s.heading}</span><span class="be-arrow" aria-hidden="true">&rarr;</span></a>'
    for s in sections
)
sidebar_links += '<a href="#faq"><span>FAQs</span><span class="be-arrow" aria-hidden="true">&rarr;</span></a>'
sidebar_links += '<a href="#sources"><span>Sources</span><span class="be-arrow" aria-hidden="true">&rarr;</span></a>'

json_ld = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    "name": title.split(":")[0],
    "headline": title.split(":")[0],
    "description": og_description,
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
  <title>{title} | ReikiFish</title>
  <meta name="description" content="{meta_description}">
  <meta name="keywords" content="{', '.join(keywords)}">
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
  <link rel="canonical" href="{canonical}">
  <meta property="og:type" content="article"><meta property="og:site_name" content="ReikiFish"><meta property="og:title" content="{title}"><meta property="og:description" content="{og_description}"><meta property="og:url" content="{canonical}"><meta property="og:locale" content="en_GB">
  <meta name="twitter:card" content="summary"><meta name="twitter:title" content="{title}"><meta name="twitter:description" content="{og_description}">
  <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet"><link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet"><link rel="icon" type="image/svg+xml" href="/assets/images/favicon.svg"><link rel="stylesheet" href="/assets/css/style.css?v=20260819-{slug}"><link rel="stylesheet" href="/assets/css/mobile-responsive.css?v=20260819-{slug}"><link rel="stylesheet" href="/assets/css/mega-menu.css?v=20260813-force2"><link rel="stylesheet" href="/assets/css/mega-menu-controller.css?v=20260817-breadcrumb-fix2">
  <style>
{css}
  </style>
  <script type="application/ld+json">{json.dumps(json_ld)}</script>
</head>
"""

body = f"""{nav_block}
<main class="be-page" id="main-content"><div class="be-wrap"><div class="be-back"><a href="/knowledge.html">&larr; Knowledge Hub</a></div>
<section class="be-hero" aria-labelledby="be-title"><div><span class="be-kicker">Social Psychology &middot; Complete guide</span><h1 id="be-title">The Bystander Effect</h1><p>A complete evidence-led guide to why people are often less likely to help when others are present, what the classic and modern research actually shows, and practical ways to become a more effective bystander.</p></div>
<div class="be-visual" aria-label="Illustrative diagram">{SVG}</div>
</section>
<div class="be-layout"><article>
{sections_html}
{faq_html}
{sources_section}
</article>
<aside class="be-side"><section class="be-box"><h2>On this page</h2><nav>{sidebar_links}</nav></section>
<section class="be-box"><h2>Related Knowledge</h2><a href="/knowledge/what-is-narcissism.html">What is narcissism? <span>&rarr;</span></a><a href="/knowledge/what-is-gaslighting.html">What is gaslighting? <span>&rarr;</span></a><a href="/knowledge/what-is-cognitive-dissonance.html">What is cognitive dissonance? <span>&rarr;</span></a></section>
</aside></div></div></main>

{footer_scripts}
</body></html>
"""

OUT.write_text(head + body, encoding="utf-8")
print("Written:", OUT)

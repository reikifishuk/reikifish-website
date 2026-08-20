"""Template for a Knowledge Hub content file, used with:
    python scripts/run_hub_page.py scripts/content/<your-file>.py

Copy this file, fill in SPEC, then run it. All fields map 1:1 to the fields
in hub_page_lib.spec_from_dict(). Sections/faqs/related_links are lists of
dicts (matching what the browser form posts as JSON).
"""

SPEC = {
    "title": "Example Topic: A Complete Evidence-Led Guide",  # WITHOUT " | ReikiFish"
    "h1": "",  # optional, defaults to the part of title before ":"
    "slug": "example-topic",
    "category": "Social Psychology",
    "eyebrow": "Social Psychology \u00b7 Complete guide",
    "lead": "One or two sentences summarising the guide.",
    "note_html": "",  # optional callout HTML

    "meta_description": "50-160 character SEO description.",
    "og_description": "Social share description.",
    "keywords": "keyword one, keyword two, keyword three",

    "featured_icon": "E",
    "featured_summary": "60-220 character featured-card blurb.",

    "sources_html": "<li>Author, A. (Year). Title. Journal.</li>",

    "sections": [
        {"kicker": "Overview", "heading": "What is example topic?", "body_html": "<p>...</p>"},
        {"kicker": "Evidence", "heading": "What the research shows", "body_html": "<p>...</p>"},
        {"kicker": "Practice", "heading": "How to apply this", "body_html": "<p>...</p>"},
    ],

    "faqs": [
        {"question": "Question one?", "answer": "Answer one."},
        {"question": "Question two?", "answer": "Answer two."},
        {"question": "Question three?", "answer": "Answer three."},
    ],

    "related_links": [
        {"label": "Related guide one", "url": "/knowledge/some-page.html"},
    ],
}

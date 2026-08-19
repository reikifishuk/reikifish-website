# Knowledge Hub Page SOP

Canonical working template: `http://127.0.0.1:8000/knowledge/what-is-emotional-overwhelm`

Use that page as the layout and styling reference for every future local Hub deployment. Copy its breadcrumb, single Knowledge Hub back link with arrow, compact hero, wide right-hand visual, article cards, sticky `On this page` sidebar, related links and responsive behavior. Replace topic content and metadata only; do not invent a parallel shell.

Use this checklist for every new local Knowledge Hub guide.

## Content

- Write an original guide for the specific topic. Do not copy or lightly rewrite another guide.
- Target a minimum of 10,000 words for a Complete Guide unless the task explicitly sets a different length.
- Use evidence-led language. Separate established evidence, practical interpretation, uncertainty and personal examples.
- Avoid diagnosing people from limited information. Include limitations and a clear safety/support note where relevant.
- Use a distinct title, summary, examples, section sequence and FAQ set. Do not duplicate another guide's phrasing or structure beyond the shared page pattern.

## Metadata

- Use a unique, lowercase, hyphenated slug: `knowledge/<slug>.html`.
- Keep the `<title>` at 60 characters or fewer, including the site name when used.
- Keep the meta description at 155 characters or fewer and make it unique.
- Include a canonical URL, Open Graph title/description/URL, Twitter title/description, robots metadata and Article/BreadcrumbList JSON-LD where appropriate.
- Do not add a `meta name="keywords"` tag. Search uses `assets/data/knowledge.json` fields instead.
- Use a relevant image with descriptive alt text and `loading="lazy"` when it is below the initial viewport.

## Page Layout

- Follow the current complete-guide visual pattern used by Neuroplasticity and Love Bombing.
- Put the breadcrumb and visible `Knowledge Hub` back button before the hero eyebrow.
- Use a compact category eyebrow, then a large editorial H1 on the left.
- Use a wide, framed hero visual on the right. Avoid narrow portrait images and avoid large empty space above or beside the hero.
- Keep the hero as a balanced two-column grid on desktop and a single column on mobile.
- Use labelled section kickers above H2 headings, consistent line-height and `scroll-margin-top` for anchored sections.
- Use a sticky right-hand `Guide sections` navigation on desktop. Move it below or above the article on small screens.
- Every sidebar link must point to a real section ID. Include a back-to-top link and test scrolling in both directions.
- Use the same global header, premium desktop mega-menu, mobile drawer, footer and shared assets as the local mirror.

## Hub Discovery

- Add one record to `assets/data/knowledge.json` with `slug`, `title`, `type`, `category`, `summary`, `keywords` and `url`.
- Use the correct category, for example `Trauma`, `Emotional Health`, `Relationships` or `Personality`.
- Add the newest requested guide to the first position of the static featured-card grid in `knowledge.html` when it is the latest guide.
- Ensure the category filter and free-text search return the guide.
- Add the route to the local `sitemap.xml`.

## Validation

- Open the route locally and confirm the title, description, image, H1 and section navigation.
- Confirm the title is <= 60 characters, description <= 155 characters and no keyword meta tag exists.
- Count rendered article words and confirm the minimum.
- Test the first, middle and final sidebar anchors, including back-to-top.
- Test desktop and mobile layouts and confirm the hero image is visible, wide enough and not causing excessive empty space.
- Confirm the Hub featured card is first when required, and confirm `?category=<category>` plus a topic search return the guide.
- Do not deploy or modify the live site for local-only Hub work.

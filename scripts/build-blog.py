from pathlib import Path
import yaml
import markdown
import json
from jinja2 import Template
from markupsafe import Markup

POSTS = Path("content/posts")
OUTPUT = Path("blog/posts")
OUTPUT.mkdir(parents=True, exist_ok=True)

posts = []

for post in POSTS.glob("*.md"):

    raw = post.read_text(encoding="utf-8")

    if not raw.startswith("---"):
        continue

    _, front, body = raw.split("---",2)

    meta = yaml.safe_load(front)

    if meta.get("draft", False):
        continue

    html = markdown.markdown(body)

    post_template = Template(
        Path("templates/post.html").read_text(encoding="utf-8")
    )

    page = post_template.render(
        title=meta.get("seoTitle") or meta["title"],
        heading=meta["title"],
        description=meta.get("metaDescription",""),
        author=meta.get("author","Reiki Fish"),
        date=str(meta["date"]),
        content=Markup(html),
        featured_image=meta.get("featuredImage",""),
        featured_image_alt=meta.get("featuredImageAlt",""),
        excerpt=meta.get("excerpt",""),
        slug=meta["slug"]
    )

    outfile = OUTPUT / f"{meta['slug']}.html"

    outfile.write_text(page, encoding="utf-8")

    posts.append({
        "title": meta["title"],
        "slug": meta["slug"],
        "excerpt": meta.get("excerpt",""),
        "date": str(meta["date"]),
        "featured": meta.get("featured", False),
        "categories": meta.get("categories", [])
    })

posts.sort(key=lambda p: p["date"], reverse=True)

Path("build/posts.json").write_text(
    json.dumps(posts, indent=2),
    encoding="utf-8"
)

print(f"Generated {len(posts)} posts")
print("Created build/posts.json")


template = Template(
    Path("templates/blog-index.html").read_text(encoding="utf-8")
)

Path("blog/index.html").write_text(
    template.render(posts=posts),
    encoding="utf-8"
)

print("Created blog/index.html")

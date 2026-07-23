from flask import Flask, request, jsonify
from pathlib import Path
from datetime import date

app = Flask(__name__)

POSTS = Path("content/posts")
POSTS.mkdir(parents=True, exist_ok=True)

@app.route("/")
def home():
    return "ReikiFish CMS Backend Running"

@app.route("/save-draft", methods=["POST"])
def save_draft():
    data = request.get_json()

    slug = data.get("slug", "").strip()

    if not slug:
        return jsonify({"success": False, "message": "Slug is required"}), 400

    filename = POSTS / f"{slug}.md"

    markdown = f"""---
title: {data.get('title','')}
seo-title: {data.get('seo-title','')}
meta-description: {data.get('meta-description','')}
slug: {slug}
category: {data.get('category','')}
tags: {data.get('tags','')}
author: {data.get('author','')}
featured: {str(data.get('featured', False)).lower()}
draft: true
date: {date.today()}
excerpt: {data.get('excerpt','')}
image: {data.get('image','')}
imageAlt: {data.get('imageAlt','')}
---

{data.get('content','')}
"""

    filename.write_text(markdown, encoding="utf-8")

    return jsonify({
        "success": True,
        "file": str(filename)
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

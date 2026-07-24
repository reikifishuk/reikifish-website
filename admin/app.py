from flask import Flask, request, jsonify, render_template, send_from_directory
from pathlib import Path
from werkzeug.utils import secure_filename
from datetime import date
import subprocess

app = Flask(__name__)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
ASSETS_FOLDER = PROJECT_ROOT / "assets"




UPLOAD_FOLDER = ASSETS_FOLDER / "images" / "blog"
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)

POSTS = Path("content/posts")
POSTS.mkdir(parents=True, exist_ok=True)



@app.route("/assets/<path:filename>")
def serve_asset(filename):
    return send_from_directory(ASSETS_FOLDER, filename)


@app.route("/")
def home():
    return render_template("index.html")

@app.route("/editor")
def editor():
    return render_template("editor.html")

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
draft: {str(data.get('draft', True)).lower()}
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


@app.route("/posts")
def posts():
    import yaml

    posts = []

    for f in sorted(POSTS.glob("*.md")):
        raw = f.read_text(encoding="utf-8")

        if not raw.startswith("---"):
            continue

        _, front, body = raw.split("---", 2)
        meta = yaml.safe_load(front)

        posts.append({
            "title": meta.get("title",""),
            "slug": meta.get("slug",""),
            "draft": meta.get("draft", True),
            "featured": meta.get("featured", False),
            "date": str(meta.get("date",""))
        })

    return jsonify(posts)



@app.route("/post/<slug>")
def get_post(slug):
    import yaml

    if not slug or slug != Path(slug).name:
        return jsonify({"success": False, "message": "Invalid slug"}), 400

    filename = POSTS / f"{slug}.md"

    if not filename.exists():
        return jsonify({"success": False, "message": "Post not found"}), 404

    raw = filename.read_text(encoding="utf-8")

    if not raw.startswith("---"):
        return jsonify({"success": False, "message": "Invalid post format"}), 500

    try:
        _, front, body = raw.split("---", 2)
    except ValueError:
        return jsonify({"success": False, "message": "Invalid post format"}), 500

    meta = yaml.safe_load(front) or {}

    return jsonify({
        "success": True,
        "title": meta.get("title", ""),
        "seo-title": meta.get("seo-title", ""),
        "meta-description": meta.get("meta-description", ""),
        "slug": meta.get("slug", slug),
        "category": meta.get("category", ""),
        "tags": meta.get("tags", ""),
        "author": meta.get("author", ""),
        "featured": meta.get("featured", False),
        "draft": meta.get("draft", True),
        "date": str(meta.get("date", "")),
        "excerpt": meta.get("excerpt", ""),
        "image": meta.get("image", ""),
        "imageAlt": meta.get("imageAlt", meta.get("alt", "")),
        "content": body.strip()
    })



@app.route("/delete/<slug>", methods=["DELETE"])
def delete_post(slug):
    if not slug or slug != Path(slug).name:
        return jsonify({
            "success": False,
            "message": "Invalid slug"
        }), 400

    filename = POSTS / f"{slug}.md"

    if not filename.exists():
        return jsonify({
            "success": False,
            "message": "Post not found"
        }), 404

    filename.unlink()

    subprocess.run(
        ["python3", "scripts/build-blog.py"],
        cwd=Path(__file__).resolve().parent.parent,
        capture_output=True,
        text=True
    )

    return jsonify({
        "success": True,
        "message": "Post deleted successfully."
    })






@app.route("/media")
def media():
    images = []

    image_dir = Path(__file__).resolve().parent.parent / "assets" / "images" / "blog"
    image_dir.mkdir(parents=True, exist_ok=True)

    for ext in ("*.png","*.jpg","*.jpeg","*.webp","*.gif","*.svg"):
        for f in sorted(image_dir.glob(ext)):
            images.append({
                "name": f.name,
                "path": "/assets/images/blog/" + f.name
            })

    return jsonify(images)


@app.route("/delete-image", methods=["POST"])
def delete_image():
    data = request.get_json()

    if not data or "name" not in data:
        return jsonify(success=False)

    target = Path(__file__).resolve().parent.parent / "assets" / "images" / "blog" / data["name"]

    if target.exists():
        target.unlink()

    return jsonify(success=True)




@app.route("/upload-image", methods=["POST"])
def upload_image():

    if "image" not in request.files:
        return jsonify(success=False, message="No image supplied."),400

    file=request.files["image"]

    if file.filename=="":
        return jsonify(success=False,message="No file selected."),400

    filename=secure_filename(file.filename)

    destination=UPLOAD_FOLDER/filename

    file.save(destination)

    return jsonify(
        success=True,
        filename=filename,
        path="/assets/images/blog/" + filename
    )



@app.route("/publish", methods=["POST"])
def publish():
    data = request.get_json() or {}
    slug = data.get("slug", "").strip()

    if not slug:
        return jsonify({"success": False, "message": "Slug is required"}), 400

    data["draft"] = False
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
draft: false
date: {data.get('date') or date.today()}
excerpt: {data.get('excerpt','')}
image: {data.get('image','')}
imageAlt: {data.get('alt','')}
---

{data.get('content','')}
"""

    filename.write_text(markdown, encoding="utf-8")

    result = subprocess.run(
        ["python3", "scripts/build-blog.py"],
        cwd=Path(__file__).resolve().parent.parent,
        capture_output=True,
        text=True
    )

    if result.returncode != 0:
        return jsonify({
            "success": False,
            "message": "Article saved, but the blog build failed.",
            "error": result.stderr
        }), 500

    return jsonify({
        "success": True,
        "file": str(filename),
        "message": "Article published successfully."
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

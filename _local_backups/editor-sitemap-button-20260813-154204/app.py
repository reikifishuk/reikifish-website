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


# CMS_CORS_FINAL
@app.after_request
def cms_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    return response

@app.route("/assets/<path:filename>")
def serve_asset(filename):
    return send_from_directory(ASSETS_FOLDER, filename)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/articles")
def articles_manager():
    return render_template("articles.html")


@app.route("/editor")
def editor():
    import yaml
    from pathlib import Path

    slug = request.args.get("slug", "").strip()

    post = {
        "title": "",
        "slug": "",
        "seoTitle": "",
        "metaDescription": "",
        "excerpt": "",
        "category": "",
        "tags": "",
        "author": "Reiki Fish",
        "featuredImage": "",
        "featuredImageAlt": "",
        "featured": False,
        "content": ""
    }

    if slug:
        md = Path("content/posts") / f"{slug}.md"

        if md.exists():
            raw = md.read_text(encoding="utf-8")

            if raw.startswith("---"):
                parts = raw.split("---", 2)

                if len(parts) >= 3:
                    front = yaml.safe_load(parts[1]) or {}
                    body = parts[2].strip()

                    tags = front.get("tags", "")
                    if isinstance(tags, list):
                        tags = ", ".join(tags)

                    cats = front.get("categories", "")
                    if isinstance(cats, list):
                        cats = ", ".join(cats)

                    post = {
                        "title": front.get("title", ""),
                        "slug": front.get("slug", ""),
                        "seoTitle": front.get("seoTitle", ""),
                        "metaDescription": front.get("metaDescription", ""),
                        "excerpt": front.get("excerpt", ""),
                        "category": cats,
                        "tags": tags,
                        "author": front.get("author", "Reiki Fish"),
                        "featuredImage": front.get("featuredImage", ""),
                        "featuredImageAlt": front.get("featuredImageAlt", ""),
                        "featured": bool(front.get("featured", False)),
                        "content": body
                    }

    return render_template("editor.html", post=post)

@app.route("/save-draft", methods=["POST"])
def save_draft():
    data = request.get_json()

    slug = data.get("slug", "").strip()

    if not slug:
        return jsonify({"success": False, "message": "Slug is required"}), 400

    filename = POSTS / f"{slug}.md"

    markdown = f"""---
title: {data.get('title','')}
seoTitle: {data.get('seo-title','')}
metaDescription: {data.get('meta-description','')}
slug: {slug}
categories: {data.get('category','')}
tags: {data.get('tags','')}
author: {data.get('author','')}
featured: {str(data.get('featured', False)).lower()}
draft: {str(data.get('draft', True)).lower()}
date: {date.today()}
excerpt: {data.get('excerpt','')}
featuredImage: {data.get('image') or data.get('featuredImage') or ''}
featuredImageAlt: {data.get('imageAlt') or data.get('alt') or data.get('featuredImageAlt') or ''}
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
        ["node", "scripts/build-blog.js"],
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


@app.route("/publish-complete", methods=["POST"])
def publish_complete():
    import json
    import re
    import subprocess
    from datetime import date
    from pathlib import Path
    from werkzeug.utils import secure_filename

    repo_root = Path(__file__).resolve().parent.parent
    posts_dir = repo_root / "content" / "posts"
    images_dir = repo_root / "assets" / "images" / "blog"

    posts_dir.mkdir(parents=True, exist_ok=True)
    images_dir.mkdir(parents=True, exist_ok=True)

    print("FORM:", dict(request.form))
    print("FILES:", list(request.files.keys()))
    print("\n===== PUBLISH_V2 =====")
    slug = (request.form.get("slug") or "").strip()

    if not title:
        return jsonify({"success": False, "message": "Title is required."}), 400

    if not slug:
        slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")

    if not slug:
        return jsonify({"success": False, "message": "A valid slug is required."}), 400

    existing_post = posts_dir / f"{slug}.md"
    existing_image = (data.get("existingImage") or data.get("featured_image") or "").strip()
    image_path = existing_image

    upload = request.files.get("image")

    if upload and upload.filename:
        original = secure_filename(upload.filename)
        stem = Path(original).stem or slug
        suffix = Path(original).suffix.lower() or ".jpg"

        allowed = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"}
        if suffix not in allowed:
            return jsonify({
                "success": False,
                "message": "Please use JPG, PNG, WEBP, GIF or AVIF."
            }), 400

        filename = f"{slug}-{stem}{suffix}"
        destination = images_dir / filename
        counter = 2

        while destination.exists():
            filename = f"{slug}-{stem}-{counter}{suffix}"
            destination = images_dir / filename
            counter += 1

        upload.save(destination)
        image_path = f"assets/images/blog/{filename}"

    def yaml_string(value):
        return json.dumps(str(value or ""), ensure_ascii=False)

    markdown = f"""---
title: {yaml_string(title)}
seoTitle: {yaml_string(request.form.get("seoTitle") or title)}
metaDescription: {yaml_string(request.form.get("metaDescription") or request.form.get("excerpt"))}
slug: {yaml_string(slug)}
categories: {yaml_string(request.form.get("category"))}
tags: {yaml_string(request.form.get("tags"))}
author: {yaml_string(request.form.get("author") or "Reiki Fish")}
featured: {str((request.form.get("featured") or "").lower() == "true").lower()}
draft: {str(data.get("status") != "published").lower()}
date: {yaml_string(request.form.get("date") or date.today().isoformat())}
excerpt: {yaml_string(request.form.get("excerpt"))}
featuredImage: {yaml_string(image_path)}
featuredImageAlt: {yaml_string(request.form.get("imageAlt"))}
---

{request.form.get("content") or ""}
"""

    existing_post.write_text(markdown, encoding="utf-8")

    result = subprocess.run(
        ["node", "scripts/build-blog.js"],
        cwd=repo_root,
        capture_output=True,
        text=True
    )

    if result.returncode != 0:
        return jsonify({
            "success": False,
            "message": "Post was saved, but the site build failed.",
            "error": result.stderr
        }), 500

    return jsonify({
        "success": True,
        "message": "Article published successfully.",
        "file": str(existing_post),
        "image": image_path,
        "url": f"/articles/{slug}.html"
    })
# CMS_COMPLETE_PUBLISH_END

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
seoTitle: {data.get('seo-title','')}
metaDescription: {data.get('meta-description','')}
slug: {slug}
categories: {data.get('category','')}
tags: {data.get('tags','')}
author: {data.get('author','')}
featured: {str(data.get('featured', False)).lower()}
draft: false
date: {data.get('date') or date.today()}
excerpt: {data.get('excerpt','')}
featuredImage: {data.get('image') or data.get('featuredImage') or ''}
featuredImageAlt: {data.get('imageAlt') or data.get('alt') or data.get('featuredImageAlt') or ''}
---

{data.get('content','')}
"""

    filename.write_text(markdown, encoding="utf-8")

    result = subprocess.run(
        ["node", "scripts/build-blog.js"],
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


# FEATURED_IMAGE_PUBLISH_V2_START
@app.route("/publish-v2", methods=["POST"])
def publish_v2():
    import json
    import re
    import subprocess
    from datetime import date
    from pathlib import Path
    from werkzeug.utils import secure_filename

    root = Path(__file__).resolve().parent.parent
    posts_dir = root / "content" / "posts"
    images_dir = root / "assets" / "images" / "blog"

    posts_dir.mkdir(parents=True, exist_ok=True)
    images_dir.mkdir(parents=True, exist_ok=True)

    print("\n===== PUBLISH_V2 =====")

    data = request.get_json(silent=True) or {}

    print("JSON:", data)

    title = (data.get("title") or "").strip()
    slug = (data.get("slug") or "").strip()

    if not title:
        return jsonify({
            "success": False,
            "message": "Please enter a title."
        }), 400

    if not slug:
        slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")

    if not slug:
        return jsonify({
            "success": False,
            "message": "Please enter a valid slug."
        }), 400

    def clean_existing_image(value):
        value = (value or "").strip()
        value = re.sub(r"^https?://[^/]+/", "", value)
        value = value.lstrip("/")
        value = re.sub(
            r"^(?:images|media)/blog/",
            "assets/images/blog/",
            value
        )
        return value

    featured_image = clean_existing_image(
        data.get("existingImage") or data.get("featured_image")
    )

    uploaded = request.files.get("image")

    if uploaded and uploaded.filename:
        safe_original = secure_filename(uploaded.filename)
        suffix = Path(safe_original).suffix.lower()

        allowed = {
            ".jpg", ".jpeg", ".png",
            ".webp", ".gif", ".avif"
        }

        if suffix not in allowed:
            return jsonify({
                "success": False,
                "message": "Featured image must be JPG, PNG, WEBP, GIF or AVIF."
            }), 400

        image_name = f"{slug}{suffix}"
        image_file = images_dir / image_name

        # Re-publishing the same slug replaces its previous featured image.
        for old_suffix in allowed:
            old = images_dir / f"{slug}{old_suffix}"
            if old.exists() and old != image_file:
                old.unlink()

        uploaded.save(image_file)
        featured_image = f"assets/images/blog/{image_name}"

    def yaml_text(value):
        return json.dumps(str(value or ""), ensure_ascii=False)

    seo_title = (
        data.get("seoTitle") or data.get("seo_title") or data.get("seo-title")
        or title
    ).strip()

    excerpt = (data.get("excerpt") or "").strip()

    featured_value = data.get("featured", False)

    if isinstance(featured_value, str):
        is_featured = featured_value.strip().lower() in {
            "true", "1", "yes", "on"
        }
    else:
        is_featured = bool(featured_value)

    content = str(data.get("content") or "").strip()
    empty_content = {"", "<p></p>", "<p><br></p>", "<p><br data-mce-bogus=\"1\"></p>"}

    if content in empty_content:
        return jsonify({
            "success": False,
            "message": "Article content is required. Nothing was overwritten."
        }), 400

    if not featured_image:
        return jsonify({
            "success": False,
            "message": "Please upload a featured image before publishing."
        }), 400

    meta_description = (
        data.get("metaDescription") or data.get("meta") or data.get("meta-description")
        or excerpt
    ).strip()

    markdown = f"""---
title: {yaml_text(title)}
seoTitle: {yaml_text(seo_title)}
metaDescription: {yaml_text(meta_description)}
slug: {yaml_text(slug)}
categories: {yaml_text(data.get("category") or data.get("categories"))}
tags: {yaml_text(data.get("tags"))}
author: {yaml_text(data.get("author") or "Reiki Fish")}
featured: {str(is_featured).lower()}
draft: false
date: {yaml_text(data.get("date") or date.today().isoformat())}
excerpt: {yaml_text(excerpt)}
featuredImage: {yaml_text(featured_image)}
featuredImageAlt: {yaml_text(data.get("imageAlt") or data.get("image_alt") or data.get("featuredAlt") or data.get("alt"))}
---

{content}
"""

    post_file = posts_dir / f"{slug}.md"

    if is_featured:
        for other_file in posts_dir.glob("*.md"):
            if other_file == post_file:
                continue

            other_text = other_file.read_text(encoding="utf-8")

            updated_text = re.sub(
                r"(?m)^featured:\s*true\s*$",
                "featured: false",
                other_text,
                count=1
            )

            if updated_text != other_text:
                other_file.write_text(
                    updated_text,
                    encoding="utf-8"
                )

    if post_file.exists():
        backups_dir = posts_dir / "_backups"
        backups_dir.mkdir(parents=True, exist_ok=True)
        backup_file = backups_dir / f"{slug}.previous.md"
        backup_file.write_text(
            post_file.read_text(encoding="utf-8"),
            encoding="utf-8"
        )

    post_file.write_text(markdown, encoding="utf-8")

    build = subprocess.run(
        ["node", "scripts/build-blog.js"],
        cwd=root,
        capture_output=True,
        text=True
    )

    if build.returncode != 0:
        return jsonify({
            "success": False,
            "message": "The post was saved, but the site build failed.",
            "error": build.stderr
        }), 500

    return jsonify({
        "success": True,
        "message": "Article published with its featured image.",
        "slug": slug,
        "image": featured_image,
        "url": f"/articles/{slug}.html"
    })
# FEATURED_IMAGE_PUBLISH_V2_END


@app.route("/media/upload",methods=["POST"])
def media_upload():

    if "image" not in request.files:
        return {"error":"No image"},400

    image=request.files["image"]

    alt=request.form.get("alt","").strip()

    caption=request.form.get("caption","").strip()

    if not alt:
        return {"error":"Image Alt Text is required"},400

    stem=request.form.get("filename","").strip()

    if not stem:
        stem=Path(image.filename).stem

    stem=secure_filename(stem.lower())

    ext=Path(image.filename).suffix.lower()

    filename=f"{stem}{ext}"

    folder=Path("images/blog")

    folder.mkdir(parents=True,exist_ok=True)

    i=2

    while (folder/filename).exists():

        filename=f"{stem}-{i}{ext}"

        i+=1

    image.save(folder/filename)

    db=Path("media/library.json")

    library=json.loads(db.read_text())

    record={

        "filename":filename,

        "url":"/images/blog/"+filename,

        "alt":alt,

        "caption":caption,

        "uploaded":datetime.utcnow().isoformat()

    }

    library.append(record)

    db.write_text(json.dumps(library,indent=2))

    return record

@app.route("/media/library")
def media_library():

    db=Path("media/library.json")

    return json.loads(db.read_text())

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


# CMS_COMPLETE_PUBLISH_START

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

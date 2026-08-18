"""Safe sitemap generation and publication for the local ReikiFish editor."""
from __future__ import annotations

from collections import Counter
from datetime import date
from pathlib import Path
from urllib.parse import urlparse, urlunparse
import html
import json
import re
import shutil
import subprocess
import tempfile

from flask import jsonify, request

DOMAIN = "reikifish.com"
EXCLUDED_DIRS = {
    ".git", ".github", "admin", "assets", "content", "node_modules",
    "templates", "_local_backups", "_local_build", "tests", "test",
    "scripts", "vendor",
}
EXCLUDED_FILES = {"404.html", "knowledge-search.html"}


def _run(command, cwd):
    result = subprocess.run(command, cwd=cwd, capture_output=True, text=True)
    if result.returncode:
        detail = (result.stderr or result.stdout or "Command failed").strip()
        raise RuntimeError(detail)
    return result.stdout.strip()


def _excluded(path):
    return (
        bool(set(path.parts) & EXCLUDED_DIRS)
        or path.name in EXCLUDED_FILES
        or any(part.startswith("_") for part in path.parts)
    )


def _noindex(text):
    tags = re.findall(r"<meta\b[^>]*>", text, re.I)
    for tag in tags:
        if re.search(r"\bname=[\"']robots[\"']", tag, re.I) and re.search(
            r"\bcontent=[\"'][^\"']*noindex", tag, re.I
        ):
            return True
    return False


def _canonical(text, relative):
    tags = re.findall(r"<link\b[^>]*>", text, re.I)
    values = []
    for tag in tags:
        if re.search(r"\brel=[\"'][^\"']*canonical", tag, re.I):
            match = re.search(r"\bhref=[\"']([^\"']+)", tag, re.I)
            if match:
                values.append(html.unescape(match.group(1)).strip())
    if len(values) > 1:
        raise RuntimeError(f"{relative}: multiple canonical URLs")
    if not values:
        if relative.as_posix() == "index.html":
            return f"https://{DOMAIN}/", "fallback"
        return f"https://{DOMAIN}/{relative.as_posix()}", "fallback"
    parsed = urlparse(values[0])
    if parsed.scheme not in ("http", "https") or parsed.netloc.lower() not in (
        DOMAIN,
        "www." + DOMAIN,
    ):
        raise RuntimeError(f"{relative}: invalid canonical {values[0]}")
    return urlunparse(parsed._replace(scheme="https", netloc=DOMAIN, query="", fragment="")), "canonical"


def _section(url):
    path = urlparse(url).path
    if path in ("/", "/index.html"):
        return "Homepage", "weekly", "1.0"
    if path.startswith("/articles/"):
        return "Blog articles", "monthly", "0.8"
    if path.startswith("/knowledge/"):
        return "Knowledge Hub guides", "monthly", "0.8"
    if path in ("/blog", "/blog.html"):
        return "Blog index", "weekly", "0.8"
    if path in ("/knowledge", "/knowledge.html"):
        return "Knowledge Hub index", "weekly", "0.9"
    if "support" in path or "finder" in path:
        return "AI Support Finder", "weekly", "0.8"
    return "Website pages", "monthly", "0.7"


def _build_sitemap(root):
    tracked = _run(["git", "ls-files", "*.html"], root).splitlines()
    records = []
    warnings = []
    today = date.today().isoformat()
    for filename in tracked:
        relative = Path(filename)
        page = root / relative
        if _excluded(relative) or not page.exists():
            continue
        text = page.read_text(encoding="utf-8-sig")
        if _noindex(text):
            continue
        url, source = _canonical(text, relative)
        if source == "fallback":
            warnings.append(f"No canonical; fallback used: {relative.as_posix()}")
        section, frequency, priority = _section(url)
        modified = _run(["git", "log", "-1", "--format=%cs", "--", relative.as_posix()], root)
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", modified):
            modified = today
        records.append((url, modified, frequency, priority, section, relative))

    counts = Counter(url for url, *_ in records)
    duplicates = [url for url, count in counts.items() if count > 1]
    if duplicates:
        raise RuntimeError("Duplicate canonical URLs: " + ", ".join(duplicates))
    records.sort(key=lambda row: (0 if row[4] == "Homepage" else 1, row[0]))
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for url, modified, frequency, priority, _, _ in records:
        lines.extend(
            [
                "  <url>",
                f"    <loc>{html.escape(url, quote=False)}</loc>",
                f"    <lastmod>{modified}</lastmod>",
                f"    <changefreq>{frequency}</changefreq>",
                f"    <priority>{priority}</priority>",
                "  </url>",
            ]
        )
    lines.append("</urlset>")
    (root / "sitemap.xml").write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")
    section_counts = Counter(record[4] for record in records)
    return len(records), dict(section_counts), warnings


def register_sitemap_routes(app, repo_root):
    repo_root = Path(repo_root).resolve()

    @app.post("/admin/generate-live-sitemap")
    def generate_live_sitemap():
        if request.remote_addr not in ("127.0.0.1", "::1"):
            return jsonify(ok=False, error="This editor action is local-only."), 403
        worktree = None
        branch = None
        try:
            _run(["git", "fetch", "origin", "main"], repo_root)
            temporary_root = Path(tempfile.mkdtemp(prefix="reikifish-sitemap-"))
            worktree = temporary_root / "site"
            branch = "editor-sitemap-" + date.today().strftime("%Y%m%d") + "-" + next(tempfile._get_candidate_names())
            _run(["git", "worktree", "add", "-b", branch, str(worktree), "origin/main"], repo_root)
            total, counts, warnings = _build_sitemap(worktree)
            _run(["git", "add", "--", "sitemap.xml"], worktree)
            staged = _run(["git", "diff", "--cached", "--name-only"], worktree).splitlines()
            if any(name != "sitemap.xml" for name in staged):
                raise RuntimeError("A file other than sitemap.xml entered the publication.")
            if staged:
                _run(["git", "diff", "--cached", "--check"], worktree)
                _run(["git", "commit", "-m", "Regenerate sitemap from live public pages"], worktree)
                _run(["git", "fetch", "origin", "main"], worktree)
                if _run(["git", "rev-parse", "HEAD^"], worktree) != _run(["git", "rev-parse", "origin/main"], worktree):
                    raise RuntimeError("Live main changed. Press the button again to regenerate safely.")
                _run(["git", "push", "origin", "HEAD:main"], worktree)
                status = "Generated, committed and published live."
            else:
                status = "The live sitemap was already current; no commit was required."
            return jsonify(
                ok=True,
                status=status,
                sitemap_url="https://reikifish.com/sitemap.xml",
                total=total,
                counts=counts,
                warnings=warnings,
            )
        except Exception as exc:
            return jsonify(ok=False, error=str(exc)), 500
        finally:
            if worktree and worktree.exists():
                subprocess.run(["git", "worktree", "remove", str(worktree), "--force"], cwd=repo_root, capture_output=True)
                shutil.rmtree(worktree.parent, ignore_errors=True)
            if branch:
                subprocess.run(["git", "branch", "-D", branch], cwd=repo_root, capture_output=True)
"""Safe, local-only sitemap scanner and updater for ReikiFish."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import date, datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse, urlunparse
import shutil
import tempfile
import xml.etree.ElementTree as ET

SITE_ORIGIN = "https://reikifish.com"
SITEMAP_NS = "http://www.sitemaps.org/schemas/sitemap/0.9"
EXCLUDED_DIRS = {
    ".git", ".github", ".idea", ".vscode", "admin", "content",
    "node_modules", "scripts", "templates", "__pycache__",
    "_local_backups", "_local_build",
}
EXCLUDED_NAMES = {
    "404.html",
    "blog-old.html",
    "section2.html",
    "featured-book-current.html",
    "ection2.html",
    "philosophy-section.html",
}
EXCLUDED_SUFFIXES = (".bak.html", ".backup.html", ".build.html", ".part.html")
BLOCKED_URL_PREFIXES = ("/cdn-cgi/",)


class _PageHeadParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.canonical = ""
        self.robots = ""

    def handle_starttag(self, tag, attrs):
        values = {str(k).lower(): (v or "") for k, v in attrs}
        if tag.lower() == "link" and values.get("rel", "").lower() == "canonical":
            self.canonical = values.get("href", "").strip()
        elif tag.lower() == "meta" and values.get("name", "").lower() in {"robots", "googlebot"}:
            self.robots = f"{self.robots},{values.get('content', '')}".strip(",")


@dataclass
class PageRecord:
    file: str
    canonical: str = ""
    status: str = ""
    detail: str = ""


def _normalise_site_url(url: str) -> str:
    parsed = urlparse((url or "").strip())
    if parsed.scheme not in {"http", "https"}:
        return ""
    if parsed.netloc.lower() not in {"reikifish.com", "www.reikifish.com"}:
        return ""
    path = parsed.path or "/"
    return urlunparse(("https", "reikifish.com", path, "", "", ""))


def _is_backup_or_fragment(path: Path) -> bool:
    lower_name = path.name.lower()
    return (
        lower_name in EXCLUDED_NAMES
        or lower_name.endswith(EXCLUDED_SUFFIXES)
        or lower_name.startswith("before-")
        or ".before-" in lower_name
        or "fragment" in lower_name
    )


def _read_existing_sitemap(sitemap_path: Path) -> list[str]:
    if not sitemap_path.exists():
        return []
    root = ET.parse(sitemap_path).getroot()
    urls = []
    for node in root.findall(f".//{{{SITEMAP_NS}}}loc"):
        value = _normalise_site_url(node.text or "")
        if value and not urlparse(value).path.startswith(BLOCKED_URL_PREFIXES):
            urls.append(value)
    return list(dict.fromkeys(urls))


def scan_site(project_root: Path) -> dict:
    project_root = Path(project_root).resolve()
    sitemap_path = project_root / "sitemap.xml"
    eligible: dict[str, PageRecord] = {}
    excluded: list[PageRecord] = []
    missing_canonical: list[PageRecord] = []
    domain_mismatch: list[PageRecord] = []
    duplicate_canonical: list[PageRecord] = []

    for path in sorted(project_root.rglob("*.html")):
        relative = path.relative_to(project_root)
        relative_parts = [part.lower() for part in relative.parts]

        if any(part in EXCLUDED_DIRS for part in relative_parts[:-1]):
            continue

        # Ignore accidental copies of main website pages inside knowledge/.
        # These incorrectly use the homepage canonical and are not Hub guides.
        knowledge_mirror_pages = {
            "about.html",
            "blog.html",
            "books.html",
            "coaching.html",
            "contact.html",
            "index.html",
            "knowledge.html",
            "parental-alienation-coaching.html",
            "support-finder.html",
            "team-leadership-coaching.html",
            "trauma-coaching.html",
        }

        if (
            len(relative_parts) == 2
            and relative_parts[0] == "knowledge"
            and relative_parts[1] in knowledge_mirror_pages
        ):
            continue

        # Ignore accidental mirrored directory trees such as
        # articles/articles/... or knowledge/knowledge/....
        if any(
            relative_parts[index] == relative_parts[index + 1]
            for index in range(len(relative_parts) - 1)
        ):
            continue

        if _is_backup_or_fragment(path):
            continue

        try:
            parser = _PageHeadParser()
            parser.feed(path.read_text(encoding="utf-8", errors="replace"))
        except OSError as exc:
            excluded.append(PageRecord(str(relative), status="unreadable", detail=str(exc)))
            continue

        robots = {item.strip().lower() for item in parser.robots.split(",")}
        if "noindex" in robots:
            excluded.append(PageRecord(str(relative), parser.canonical, "noindex", "Excluded from sitemap"))
            continue
        if not parser.canonical:
            missing_canonical.append(PageRecord(str(relative), status="missing-canonical", detail="Add a self-referencing canonical before sitemap inclusion"))
            continue

        canonical = _normalise_site_url(parser.canonical)
        if not canonical:
            excluded.append(PageRecord(str(relative), parser.canonical, "external-or-invalid-canonical", "Not a ReikiFish canonical URL"))
            continue
        if urlparse(canonical).path.startswith(BLOCKED_URL_PREFIXES):
            excluded.append(PageRecord(str(relative), canonical, "blocked-system-url", "Cloudflare system endpoint"))
            continue
        if urlparse(parser.canonical).netloc.lower() != "reikifish.com" or urlparse(parser.canonical).scheme != "https":
            domain_mismatch.append(PageRecord(str(relative), parser.canonical, "canonical-domain-mismatch", f"Preferred form: {canonical}"))

        record = PageRecord(str(relative), canonical, "eligible", "Canonical, indexable HTML page")
        if canonical in eligible:
            duplicate_canonical.append(PageRecord(str(relative), canonical, "duplicate-canonical", f"Also used by {eligible[canonical].file}"))
            continue
        eligible[canonical] = record

    existing = _read_existing_sitemap(sitemap_path)
    eligible_urls = sorted(eligible)
    missing_from_sitemap = sorted(set(eligible_urls) - set(existing))
    stale_existing = sorted(set(existing) - set(eligible_urls))
    proposed = sorted(set(existing) | set(eligible_urls))

    return {
        "summary": {
            "html_files_scanned": len(eligible) + len(excluded) + len(missing_canonical) + len(duplicate_canonical),
            "eligible_canonical_pages": len(eligible),
            "existing_sitemap_urls": len(existing),
            "missing_from_sitemap": len(missing_from_sitemap),
            "noindex_or_excluded": len(excluded),
            "missing_canonical": len(missing_canonical),
            "duplicate_canonical": len(duplicate_canonical),
            "canonical_domain_mismatch": len(domain_mismatch),
            "preserved_existing_urls": len(stale_existing),
            "proposed_total_urls": len(proposed),
        },
        "eligible": [asdict(eligible[url]) for url in eligible_urls],
        "missing_from_sitemap": missing_from_sitemap,
        "preserved_existing_urls": stale_existing,
        "excluded": [asdict(item) for item in excluded],
        "missing_canonical": [asdict(item) for item in missing_canonical],
        "duplicate_canonical": [asdict(item) for item in duplicate_canonical],
        "canonical_domain_mismatch": [asdict(item) for item in domain_mismatch],
        "proposed_urls": proposed,
    }


def _priority_for(url: str) -> tuple[str, str]:
    path = urlparse(url).path
    if path == "/":
        return "weekly", "1.0"
    if path in {"/knowledge.html", "/blog.html", "/knowledge-search.html"}:
        return "weekly", "0.8"
    if path.startswith(("/knowledge/", "/articles/", "/blog/")):
        return "monthly", "0.7"
    if path == "/privacy.html":
        return "yearly", "0.3"
    return "monthly", "0.7"


def update_sitemap(project_root: Path) -> dict:
    project_root = Path(project_root).resolve()
    sitemap_path = project_root / "sitemap.xml"
    report = scan_site(project_root)
    urls = report["proposed_urls"]
    if not urls:
        raise ValueError("No eligible or existing sitemap URLs were found; sitemap was not changed.")

    ET.register_namespace("", SITEMAP_NS)
    root = ET.Element(f"{{{SITEMAP_NS}}}urlset")
    today = date.today().isoformat()
    for url in urls:
        item = ET.SubElement(root, f"{{{SITEMAP_NS}}}url")
        ET.SubElement(item, f"{{{SITEMAP_NS}}}loc").text = url
        ET.SubElement(item, f"{{{SITEMAP_NS}}}lastmod").text = today
        changefreq, priority = _priority_for(url)
        ET.SubElement(item, f"{{{SITEMAP_NS}}}changefreq").text = changefreq
        ET.SubElement(item, f"{{{SITEMAP_NS}}}priority").text = priority

    ET.indent(root, space="  ")
    payload = ET.tostring(root, encoding="utf-8", xml_declaration=True)
    ET.fromstring(payload)  # Refuse to write invalid XML.

    backup = ""
    if sitemap_path.exists():
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        backup_path = project_root / "_local_backups" / "sitemap-manager" / stamp / "sitemap.xml"
        backup_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(sitemap_path, backup_path)
        backup = str(backup_path.relative_to(project_root))

    with tempfile.NamedTemporaryFile("wb", dir=sitemap_path.parent, delete=False) as handle:
        handle.write(payload)
        temp_path = Path(handle.name)
    temp_path.replace(sitemap_path)

    final_urls = _read_existing_sitemap(sitemap_path)
    if len(final_urls) != len(urls) or set(final_urls) != set(urls):
        raise RuntimeError("Post-write sitemap verification failed.")
    report["updated"] = True
    report["backup"] = backup
    report["written_urls"] = len(final_urls)
    return report

"""CLI runner for hub_page_lib - the "you give a subject, I generate the rest"
workflow for new Knowledge Hub pages.

Point it at a Python content file that defines a module-level `SPEC` dict
(see scripts/content/_template.py for the expected shape). It runs the same
SOP checks as the Flask /knowledge-hub form (SEO meta, 10k word minimum,
working links) and, only if they pass, writes `knowledge/<slug>.html` and
registers it in knowledge.json, knowledge.html (featured card) and
sitemap.xml. Local files only - never commits or deploys.

Usage:
    python scripts/run_hub_page.py scripts/content/the-bystander-effect.py
"""
import argparse
import importlib.util
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import hub_page_lib as lib


def load_spec_dict(path: Path) -> dict:
    spec = importlib.util.spec_from_file_location(f"_hub_content_{path.stem}", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.SPEC


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("content_file", help="Python file defining a module-level SPEC dict")
    parser.add_argument("--check-only", action="store_true", help="run SOP checks without writing anything")
    args = parser.parse_args()

    data = load_spec_dict(Path(args.content_file))
    page_spec = lib.spec_from_dict(data)
    report = lib.run_sop_checks(page_spec)

    print(f"Slug: {page_spec.slug}")
    print(f"Word count: {report['word_count']} / {report['min_word_count']} minimum")

    for issue in report["issues"]:
        print(f"  [{issue['level'].upper()}] {issue['field']}: {issue['message']}")
    for link in report["links"]:
        if not link["ok"]:
            level = "ERROR" if link["type"] == "internal" else "WARNING"
            print(f"  [{level}] broken {link['type']} link: {link['url']}")

    if not report["passed"]:
        print("\nSOP checks FAILED - nothing was written.")
        sys.exit(1)

    print("\nAll SOP checks passed.")

    if args.check_only:
        return

    out_path = lib.write_hub_page(page_spec)
    lib.register_hub_page(page_spec)
    print(f"Written: {out_path}")
    print("Registered in knowledge.json, knowledge.html (featured card) and sitemap.xml")
    print(f"Preview locally at: http://127.0.0.1:8000/knowledge/{page_spec.slug}.html")


if __name__ == "__main__":
    main()

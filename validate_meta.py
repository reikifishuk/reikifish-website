import os
import json
from html.parser import HTMLParser

class MetaParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_title = False
        self.title = ""
        self.meta_tags = []
        self.links = []
        self.in_script = False
        self.script_content = ""
        self.scripts = []

    def handle_starttag(self, tag, attrs):
        attr_dict = dict(attrs)
        if tag == "title":
            self.in_title = True
        elif tag == "meta":
            self.meta_tags.append(attr_dict)
        elif tag == "link":
            self.links.append(attr_dict)
        elif tag == "script":
            if attr_dict.get("type") == "application/ld+json":
                self.in_script = True
                self.script_content = ""

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False
        elif tag == "script" and self.in_script:
            self.in_script = False
            self.scripts.append(self.script_content)

    def handle_data(self, data):
        if self.in_title:
            self.title += data
        elif self.in_script:
            self.script_content += data

parser = MetaParser()
with open(r"c:\Users\andyp\reikifish-website\knowledge\attachment-styles.html", "r", encoding="utf-8") as f:
    parser.feed(f.read())

print("=== Validation Results for attachment-styles.html ===")
print("Title:", parser.title.strip())

description = next((m.get("content") for m in parser.meta_tags if m.get("name") == "description"), None)
keywords = next((m.get("content") for m in parser.meta_tags if m.get("name") == "keywords"), None)
robots = next((m.get("content") for m in parser.meta_tags if m.get("name") == "robots"), None)
canonical = next((l.get("href") for l in parser.links if l.get("rel") == "canonical"), None)

print("Description:", description)
print("Keywords:", keywords)
print("Robots:", robots)
print("Canonical:", canonical)

print("\nOpen Graph & Twitter Tags:")
for m in parser.meta_tags:
    prop = m.get("property") or m.get("name")
    if prop and (prop.startswith("og:") or prop.startswith("twitter:")):
        content = m.get("content") or m.get("value")
        print(f"  {prop}: {content}")

print("\nJSON-LD scripts found:", len(parser.scripts))
for idx, script in enumerate(parser.scripts):
    try:
        data = json.loads(script.strip())
        print(f"  [{idx+1}] Valid JSON")
        print(f"    @context: {data.get('@context')}")
        print(f"    @type: {data.get('@type')}")
        name = data.get("name") or data.get("headline") or data.get("title")
        print(f"    Title/Headline: {name}")
    except Exception as e:
        print(f"  [{idx+1}] Invalid JSON! Error: {str(e)}")
        print("    Code:", script.strip()[:150], "...")

import re

with open('knowledge/habit-loop.html', 'r', encoding='utf-8') as f:
    text = f.read()

print("Script tags:")
script_tags = re.findall(r'<script\b[^>]*>.*?</script>', text, re.IGNORECASE | re.DOTALL)
for s in script_tags:
    print(s)

print("\nLink tags:")
link_tags = re.findall(r'<link\b[^>]*>', text, re.IGNORECASE)
for l in link_tags:
    if 'stylesheet' not in l.lower() and 'icon' not in l.lower():
        print(l)

print("\nHeader/Nav section elements:")
# Let's extract everything from <header> to </header> if present, or search for 'nav' or 'breadcrumb'
header_match = re.search(r'<header\b[^>]*>(.*?)</header>', text, re.IGNORECASE | re.DOTALL)
if header_match:
    print("Header found.")
    header_content = header_match.group(1)
    print("Header anchors:")
    for a in re.findall(r'<a\s+[^>]*>.*?</a>', header_content, re.IGNORECASE | re.DOTALL):
        print(a)
else:
    print("No <header> element.")

nav_match = re.search(r'<nav\b[^>]*>(.*?)</nav>', text, re.IGNORECASE | re.DOTALL)
if nav_match:
    print("Nav found.")
    nav_content = nav_match.group(1)
    print("Nav anchors (first 10):")
    for a in re.findall(r'<a\s+[^>]*>.*?</a>', nav_content, re.IGNORECASE | re.DOTALL)[:10]:
        print(a)
else:
    print("No <nav> element.")


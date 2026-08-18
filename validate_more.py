import re

with open('knowledge/habit-loop.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's see if there are other hrefs/links or if there's any mention of back / breadcrumb/ breadcrumbs control / navigate
print("Breadcrumb or back controls:")
matches = re.findall(r'<[^>]*\b(?:breadcrumb|back|control|return)[^>]*>.*?</[^>]+>', text, re.IGNORECASE)
for m in matches[:10]:
    print(m)

print("\nAll anchors:")
all_as = re.findall(r'<a\s+[^>]*>.*?</a>', text, re.IGNORECASE | re.DOTALL)
for a in all_as:
    if 'back' in a.lower() or 'breadcrumb' in a.lower() or 'home' in a.lower() or 'index' in a.lower() or 'menu' in a.lower() or 'nav' in a.lower():
        print(a)

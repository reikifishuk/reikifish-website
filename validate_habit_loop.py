import re
import html

# Load file
with open('knowledge/habit-loop.html', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Compute a readable article word count by stripping script/style tags and markup from the article
# Let's extract the <article>...</article> content.
article_match = re.search(r'<article\b[^>]*>(.*?)</article>', text, re.IGNORECASE | re.DOTALL)
if article_match:
    article_content = article_match.group(1)
    # Strip script/style tags and contents
    cleaned = re.sub(r'<script\b[^>]*>.*?</script>', '', article_content, flags=re.IGNORECASE | re.DOTALL)
    cleaned = re.sub(r'<style\b[^>]*>.*?</style>', '', cleaned, flags=re.IGNORECASE | re.DOTALL)
    # Highlight navigation/aside/etc. if they are not part of main read text, but let's just strip HTML tags.
    cleaned = re.sub(r'<[^>]+>', ' ', cleaned)
    # Unescape HTML entities
    cleaned = html.unescape(cleaned)
    words = re.findall(r'\b\w+\b', cleaned)
    word_count = len(words)
    print(f"Article Word Count: {word_count}")
else:
    print("Article tag NOT found!")

# 2. Verify exactly one h1
h1_matches = re.findall(r'<h1\b[^>]*>(.*?)</h1>', text, re.IGNORECASE | re.DOTALL)
print(f"H1 Matches ({len(h1_matches)}): {h1_matches}")

# 3. Canonical URL
canonical_matches = re.findall(r'<link\s+[^>]*rel=["\']canonical["\'][^>]*>', text, re.IGNORECASE)
print(f"Canonical URL matches: {canonical_matches}")

# 4. JSON-LD script
json_ld_matches = re.findall(r'<script\s+[^>]*type=["\']application/ld\+json["\'][^>]*>.*?</script>', text, re.IGNORECASE | re.DOTALL)
print(f"JSON-LD script matches count: {len(json_ld_matches)}")

# 5. Existing sidebar fragment hrefs and injected breadcrumb/back-control
# Let's print out the breadcrumbs/back-controls and links matching typical shapes, or search for sidebar
print("\n--- Links/A/href ---")
all_links = re.findall(r'<a\s+[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', text, re.IGNORECASE | re.DOTALL)
for href, inner in all_links:
    # Print links that have ../ or look like sidebar/breadcrumb
    if '../' in href or 'back' in href or '#' in href or 'breadcrumb' in inner.lower() or 'home' in inner.lower():
        print(f"Href: {href} | Text: {inner.strip()[:60]}")


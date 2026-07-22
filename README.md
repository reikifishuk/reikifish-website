# reikifish-website
Official website of Andy Fish - Author, Mindset Coach and Reiki Practitioner

## Local Development

This project now runs as a static Bootstrap site.

Run locally with:

```bash
cd /workspaces/reikifish-website
python3 -m http.server 8000
```

Then open: `http://localhost:8000`.

## Decap CMS (Git-Based)

The blog is managed with Decap CMS and Markdown posts.

Admin URL:

- `/admin/`

Post source of truth:

- `content/posts/*.md`

Generated outputs:

- `articles/*.html`
- `content/posts/posts.json`
- `sitemap.xml`

### Build Blog Outputs

After creating/updating Markdown posts, regenerate static outputs:

```bash
cd /workspaces/reikifish-website
node scripts/build-blog.js
```

### Optional Local CMS Proxy Backend

For local Decap editing without GitHub OAuth setup in local development:

```bash
npx decap-server
```

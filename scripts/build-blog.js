const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const POSTS_DIR = path.join(ROOT, 'content', 'posts');
const POSTS_JSON_PATH = path.join(POSTS_DIR, 'posts.json');
const ARTICLES_DIR = path.join(ROOT, 'articles');
const SITEMAP_PATH = path.join(ROOT, 'sitemap.xml');
const BASE_URL = 'https://www.reikifish.com';

function normalizeLineEndings(text) {
  return String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function splitFrontmatter(fileText) {
  const text = normalizeLineEndings(fileText);
  if (!text.startsWith('---\n')) {
    return { frontmatter: {}, body: text.trim() };
  }

  const endIndex = text.indexOf('\n---\n', 4);
  if (endIndex < 0) {
    return { frontmatter: {}, body: text.trim() };
  }

  return {
    frontmatter: parseFrontmatter(text.slice(4, endIndex).trim()),
    body: text.slice(endIndex + 5).trim(),
  };
}

function parseScalar(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }

  if (raw === 'true') return true;
  if (raw === 'false') return false;

  if (raw.startsWith('[') && raw.endsWith(']')) {
    const items = raw
      .slice(1, -1)
      .split(',')
      .map((entry) => parseScalar(entry))
      .map((entry) => String(entry).trim())
      .filter(Boolean);
    return items;
  }

  return raw;
}

function parseFrontmatter(frontmatterText) {
  const lines = normalizeLineEndings(frontmatterText).split('\n');
  const result = {};
  let currentListKey = '';

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, '    ');
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) continue;

    if (trimmed.startsWith('- ') && currentListKey) {
      if (!Array.isArray(result[currentListKey])) {
        result[currentListKey] = [];
      }
      result[currentListKey].push(parseScalar(trimmed.slice(2)));
      continue;
    }

    const separator = trimmed.indexOf(':');
    if (separator < 0) continue;

    const key = trimmed.slice(0, separator).trim();
    const valueRaw = trimmed.slice(separator + 1).trim();

    if (!valueRaw) {
      result[key] = [];
      currentListKey = key;
      continue;
    }

    result[key] = parseScalar(valueRaw);
    currentListKey = '';
  }

  return result;
}

function markdownInlineToHtml(input) {
  let output = escapeHtml(input);
  output = output.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  output = output.replace(/\*(.+?)\*/g, '<em>$1</em>');
  output = output.replace(/`(.+?)`/g, '<code>$1</code>');
  output = output.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
  return output;
}

function markdownToHtml(markdownText) {
  const lines = normalizeLineEndings(markdownText).split('\n');
  const html = [];
  let paragraph = [];
  let inList = false;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${markdownInlineToHtml(paragraph.join(' '))}</p>`);
    paragraph = [];
  };

  const closeList = () => {
    if (!inList) return;
    html.push('</ul>');
    inList = false;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      closeList();
      continue;
    }

    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(line);
    if (headingMatch) {
      flushParagraph();
      closeList();
      const level = headingMatch[1].length;
      html.push(`<h${level}>${markdownInlineToHtml(headingMatch[2])}</h${level}>`);
      continue;
    }

    const listMatch = /^[-*]\s+(.+)$/.exec(line);
    if (listMatch) {
      flushParagraph();
      if (!inList) {
        html.push('<ul>');
        inList = true;
      }
      html.push(`<li>${markdownInlineToHtml(listMatch[1])}</li>`);
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  closeList();

  return html.join('\n');
}

function asArray(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }

  if (typeof value === 'string' && value.trim()) {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeDate(input) {
  const raw = String(input || '').trim();
  if (!raw) return '';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString();
}

function formatDateLabel(inputIso) {
  if (!inputIso) return '';
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'long' }).format(new Date(inputIso));
}

function countReadingTime(markdownText) {
  const words = normalizeLineEndings(markdownText)
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 220))} min read`;
}

function buildExcerpt(markdownText, maxLength = 180) {
  const plainText = normalizeLineEndings(markdownText)
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*|\*|`|\[|\]|\(|\)/g, '')
    .replace(/\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (plainText.length <= maxLength) return plainText;
  return `${plainText.slice(0, maxLength).trim()}...`;
}

function readMarkdownPosts() {
  if (!fs.existsSync(POSTS_DIR)) return [];

  const files = fs
    .readdirSync(POSTS_DIR)
    .filter((name) => name.toLowerCase().endsWith('.md'))
    .map((name) => path.join(POSTS_DIR, name));

  return files.map((filePath) => {
    const fileName = path.basename(filePath);
    const raw = fs.readFileSync(filePath, 'utf8');
    const { frontmatter, body } = splitFrontmatter(raw);

    const title = String(frontmatter.title || fileName.replace(/\.md$/i, '').replace(/-/g, ' ')).trim();
    const slug = slugify(frontmatter.slug || title);
    const dateIso = normalizeDate(frontmatter.date);
    const categories = asArray(frontmatter.categories);
    const tags = asArray(frontmatter.tags);
    const author = String(frontmatter.author || 'Andy Fish').trim();
    const featuredImage = String(frontmatter.featuredImage || 'assets/images/home/standing-in-the-grey.jpg').trim();
    const featuredImageAlt = String(frontmatter.featuredImageAlt || `${title} featured image`).trim();
    const excerpt = String(frontmatter.excerpt || buildExcerpt(body)).trim();
    const seoTitle = String(frontmatter.seoTitle || `${title} | Andy Fish Journal`).trim();
    const metaDescription = String(frontmatter.metaDescription || excerpt).trim();
    const readingTime = String(frontmatter.readingTime || countReadingTime(body)).trim();
    const featured = Boolean(frontmatter.featured);
    const draft = Boolean(frontmatter.draft);
    const contentHtml = markdownToHtml(body);

    return {
      title,
      slug,
      date: dateIso,
      dateLabel: formatDateLabel(dateIso),
      categories,
      tags,
      author,
      featuredImage,
      featuredImageAlt,
      excerpt,
      seoTitle,
      metaDescription,
      readingTime,
      featured,
      draft,
      contentHtml,
    };
  });
}

function articleFileName(slug) {
  return `${slug}.html`;
}

function articleUrl(slug) {
  return `articles/${articleFileName(slug)}`;
}

function articleCanonical(slug) {
  return `${BASE_URL}/${articleUrl(slug)}`;
}

function renderTags(post) {
  const allTags = [...post.categories, ...post.tags];
  if (!allTags.length) return '';

  return allTags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');
}

function relatedPostsFor(post, publishedPosts, limit = 3) {
  const sameCategory = publishedPosts.filter(
    (entry) => entry.slug !== post.slug && entry.categories.some((category) => post.categories.includes(category))
  );

  const sameTag = publishedPosts.filter(
    (entry) =>
      entry.slug !== post.slug &&
      entry.tags.some((tag) => post.tags.includes(tag)) &&
      !sameCategory.some((candidate) => candidate.slug === entry.slug)
  );

  return [...sameCategory, ...sameTag, ...publishedPosts.filter((entry) => entry.slug !== post.slug)]
    .filter((entry, index, all) => all.findIndex((candidate) => candidate.slug === entry.slug) === index)
    .slice(0, limit);
}

function renderArticlePage(post, publishedPosts) {
  const index = publishedPosts.findIndex((entry) => entry.slug === post.slug);
  const previous = index >= 0 ? publishedPosts[index + 1] || null : null;
  const next = index > 0 ? publishedPosts[index - 1] || null : null;
  const related = relatedPostsFor(post, publishedPosts, 3);

  const previousLink = previous
    ? `<a href="../${escapeHtml(articleUrl(previous.slug))}">&larr; ${escapeHtml(previous.title)}</a>`
    : '<a href="../blog.html">&larr; Back to Journal</a>';

  const nextLink = next
    ? `<a href="../${escapeHtml(articleUrl(next.slug))}">${escapeHtml(next.title)} &rarr;</a>`
    : '<a href="../blog.html">More from the Journal &rarr;</a>';

  const relatedMarkup = related.length
    ? related
        .map(
          (entry) => `
            <article class="blog-related-card">
              <h3><a href="../${escapeHtml(articleUrl(entry.slug))}">${escapeHtml(entry.title)}</a></h3>
              <p>${escapeHtml(entry.excerpt)}</p>
            </article>
          `
        )
        .join('')
    : '<p>No related articles available yet.</p>';

  const primaryCategory = post.categories[0] || 'Journal';

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(post.seoTitle)}</title>
    <meta name="description" content="${escapeHtml(post.metaDescription)}" />
    <link rel="canonical" href="${escapeHtml(articleCanonical(post.slug))}" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${escapeHtml(post.seoTitle)}" />
    <meta property="og:description" content="${escapeHtml(post.metaDescription)}" />
    <meta property="og:url" content="${escapeHtml(articleCanonical(post.slug))}" />
    <meta property="og:image" content="${escapeHtml(`${BASE_URL}/${post.featuredImage.replace(/^\/+/, '')}`)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(post.seoTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(post.metaDescription)}" />
    <meta name="twitter:image" content="${escapeHtml(`${BASE_URL}/${post.featuredImage.replace(/^\/+/, '')}`)}" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600&display=swap"
      rel="stylesheet"
    />
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" />
    <link rel="icon" type="image/svg+xml" href="../assets/images/favicon.svg" />
    <link rel="stylesheet" href="../assets/css/style.css" />
  </head>
  <body class="article-page">
    <header class="inner-header">
      <nav class="navbar navbar-expand-lg fixed-top px-3 px-lg-5 py-3">
        <div class="container-fluid">
          <a class="navbar-brand d-flex align-items-center" href="../index.html" aria-label="Andy Fish home">
            <img
              class="site-logo"
              src="../assets/images/logo.png"
              alt="Andy Fish - Author, Psychology & Mindset Coach"
              width="1681"
              height="935"
            />
          </a>
          <button
            class="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#siteNav"
            aria-controls="siteNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span class="navbar-toggler-icon"></span>
          </button>
          <div class="collapse navbar-collapse justify-content-end" id="siteNav">
            <ul class="navbar-nav align-items-lg-center gap-lg-3">
              <li class="nav-item"><a class="nav-link" href="../index.html">Home</a></li>
              <li class="nav-item"><a class="nav-link" href="../about.html">About</a></li>
              <li class="nav-item"><a class="nav-link" href="../books.html">Books</a></li>
              <li class="nav-item"><a class="nav-link" href="../coaching.html">Coaching</a></li>
              <li class="nav-item"><a class="nav-link active" href="../blog.html">Blog</a></li>
              <li class="nav-item"><a class="nav-link" href="../contact.html">Contact</a></li>
            </ul>
          </div>
        </div>
      </nav>

      <section class="container py-6 reveal article-hero">
        <p class="eyebrow">${escapeHtml(primaryCategory)}</p>
        <h1 class="section-heading-xl">${escapeHtml(post.title)}</h1>
        <p class="lead-text">${escapeHtml(post.dateLabel)} • ${escapeHtml(post.author)} • ${escapeHtml(post.readingTime)}</p>
      </section>
    </header>

    <main class="container py-5">
      <article class="article-body reveal">
        <figure class="article-featured-media">
          <img
            src="../${escapeHtml(post.featuredImage)}"
            alt="${escapeHtml(post.featuredImageAlt)}"
            loading="lazy"
            decoding="async"
          />
        </figure>

        <div class="article-tag-list">${renderTags(post)}</div>

        <div class="article-content">${post.contentHtml}</div>
      </article>

      <nav class="article-adjacent reveal" aria-label="Previous and next articles">
        ${previousLink}
        ${nextLink}
      </nav>

      <section class="article-related reveal" aria-labelledby="article-related-title">
        <h2 class="section-heading-lg" id="article-related-title">Related Articles</h2>
        <div class="blog-related-grid">${relatedMarkup}</div>
      </section>
    </main>

    <footer class="footer">
      <div class="container py-4 d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
        <p class="mb-0">&copy; <span id="year"></span> Andy Fish. All rights reserved.</p>
        <div class="footer-links">
          <a href="../about.html">About</a>
          <a href="../books.html">Books</a>
          <a href="../contact.html">Contact</a>
        </div>
      </div>
    </footer>

    <script type="application/ld+json">${JSON.stringify(
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: post.title,
        description: post.metaDescription,
        author: {
          '@type': 'Person',
          name: post.author,
        },
        datePublished: post.date,
        image: `${BASE_URL}/${post.featuredImage.replace(/^\/+/, '')}`,
        mainEntityOfPage: articleCanonical(post.slug),
      },
      null,
      2
    )}</script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="../assets/js/main.js"></script>
  </body>
</html>
`;
}

function writePostsJson(publishedPosts) {
  const items = publishedPosts.map((post) => ({
    title: post.title,
    slug: post.slug,
    url: articleUrl(post.slug),
    date: post.date.slice(0, 10),
    dateLabel: post.dateLabel,
    author: post.author,
    excerpt: post.excerpt,
    category: post.categories[0] || 'Journal',
    categories: post.categories,
    tags: post.tags,
    image: post.featuredImage,
    imageAlt: post.featuredImageAlt,
    readingTime: post.readingTime,
    featured: post.featured,
  }));

  fs.writeFileSync(POSTS_JSON_PATH, `${JSON.stringify({ items }, null, 2)}\n`, 'utf8');
}

function writeSitemap(publishedPosts) {
  const staticUrls = [
    { loc: `${BASE_URL}/`, changefreq: 'weekly', priority: '1.0' },
    { loc: `${BASE_URL}/about.html`, changefreq: 'monthly', priority: '0.7' },
    { loc: `${BASE_URL}/books.html`, changefreq: 'monthly', priority: '0.7' },
    { loc: `${BASE_URL}/coaching.html`, changefreq: 'monthly', priority: '0.7' },
    { loc: `${BASE_URL}/contact.html`, changefreq: 'monthly', priority: '0.6' },
    { loc: `${BASE_URL}/blog.html`, changefreq: 'weekly', priority: '0.8' },
  ];

  const postUrls = publishedPosts.map((post) => ({
    loc: articleCanonical(post.slug),
    lastmod: post.date.slice(0, 10),
    changefreq: 'monthly',
    priority: '0.7',
  }));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[
    ...staticUrls,
    ...postUrls,
  ]
    .map(
      (entry) => `  <url>\n    <loc>${entry.loc}</loc>${entry.lastmod ? `\n    <lastmod>${entry.lastmod}</lastmod>` : ''}\n    <changefreq>${entry.changefreq}</changefreq>\n    <priority>${entry.priority}</priority>\n  </url>`
    )
    .join('\n')}\n</urlset>\n`;

  fs.writeFileSync(SITEMAP_PATH, xml, 'utf8');
}

function ensureDirectories() {
  if (!fs.existsSync(POSTS_DIR)) fs.mkdirSync(POSTS_DIR, { recursive: true });
  if (!fs.existsSync(ARTICLES_DIR)) fs.mkdirSync(ARTICLES_DIR, { recursive: true });
}

function clearGeneratedArticles() {
  if (!fs.existsSync(ARTICLES_DIR)) return;

  for (const fileName of fs.readdirSync(ARTICLES_DIR)) {
    if (!fileName.toLowerCase().endsWith('.html')) continue;
    fs.unlinkSync(path.join(ARTICLES_DIR, fileName));
  }
}

function build() {
  ensureDirectories();

  const allPosts = readMarkdownPosts();
  const publishedPosts = allPosts
    .filter((post) => post.slug && post.title && post.date && !post.draft)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  clearGeneratedArticles();

  for (const post of publishedPosts) {
    const html = renderArticlePage(post, publishedPosts);
    fs.writeFileSync(path.join(ARTICLES_DIR, articleFileName(post.slug)), html, 'utf8');
  }

  writePostsJson(publishedPosts);
  writeSitemap(publishedPosts);

  console.log(`Built ${publishedPosts.length} article page(s), posts.json, and sitemap.xml.`);
}

build();

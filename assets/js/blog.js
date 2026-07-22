document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('[data-blog-root]');
  if (!root) {
    return;
  }

  const featuredCard = root.querySelector('[data-featured-card]');
  const articleGrid = root.querySelector('[data-article-grid]');
  const relatedGrid = root.querySelector('[data-related-grid]');
  const summaryNode = root.querySelector('[data-results-summary]');
  const categoryContainer = root.querySelector('[data-category-filters]');
  const searchInput = root.querySelector('[data-blog-search]');
  const pagination = root.querySelector('[data-pagination]');
  const pagePrev = root.querySelector('[data-page-prev]');
  const pageNext = root.querySelector('[data-page-next]');
  const pageNumbers = root.querySelector('[data-page-numbers]');

  const state = {
    posts: [],
    filteredPosts: [],
    featured: null,
    categories: [],
    search: '',
    activeCategory: 'all',
    page: 1,
    pageSize: Number.MAX_SAFE_INTEGER,
  };

  const postsDataUrl = new URL('content/posts/posts.json', window.location.href).toString();

  const toArticleUrl = (post) => {
    const explicitUrl = String(post?.url || '').trim();
    if (explicitUrl) {
      return explicitUrl;
    }

    const slug = String(post?.slug || '').trim();
    return slug ? `articles/${encodeURIComponent(slug)}.html` : 'blog.html';
  };

  const escapeHtml = (value) =>
    String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const formatMeta = (post) => {
    const parts = [post.category, post.dateLabel, post.readingTime].filter(Boolean);
    return parts.join(' • ');
  };

  const renderFeatured = () => {
    if (!featuredCard) {
      return;
    }

    const post = state.featured || state.posts[0];
    if (!post) {
      featuredCard.innerHTML = '<p class="mb-0">No featured article available yet.</p>';
      return;
    }

    featuredCard.innerHTML = `
      <figure class="blog-featured-media">
        <img src="${escapeHtml(post.image)}" alt="${escapeHtml(post.imageAlt || post.title)}" loading="lazy" decoding="async" />
      </figure>
      <div class="blog-featured-copy">
        <p class="blog-meta">${escapeHtml(formatMeta(post))}</p>
        <h3>${escapeHtml(post.title)}</h3>
        <p>${escapeHtml(post.excerpt)}</p>
        <div class="blog-tag-row">${post.categories.map((cat) => `<span>${escapeHtml(cat)}</span>`).join('')}</div>
        <a class="btn btn-gold" href="${escapeHtml(toArticleUrl(post))}">Read Article</a>
      </div>
    `;
  };

  const renderCategoryFilters = () => {
    if (!categoryContainer) {
      return;
    }

    const categories = ['all', ...state.categories];
    categoryContainer.innerHTML = categories
      .map((category) => {
        const isActive = state.activeCategory === category;
        const label = category === 'all' ? 'All' : category;
        return `<button class="blog-filter-chip${isActive ? ' is-active' : ''}" type="button" data-category="${escapeHtml(
          category
        )}">${escapeHtml(label)}</button>`;
      })
      .join('');
  };

  const getFilteredPosts = () => {
    const searchValue = state.search.toLowerCase();
    return state.posts.filter((post) => {
      const categoryMatch =
        state.activeCategory === 'all' || post.categories.map((cat) => cat.toLowerCase()).includes(state.activeCategory.toLowerCase());

      if (!categoryMatch) {
        return false;
      }

      if (!searchValue) {
        return true;
      }

      const haystack = [post.title, post.excerpt, post.author, ...(post.categories || []), ...(post.tags || [])]
        .join(' ')
        .toLowerCase();

      return haystack.includes(searchValue);
    });
  };

  const renderSummary = () => {
    if (!summaryNode) {
      return;
    }

    const total = state.filteredPosts.length;
    summaryNode.textContent = total === 1 ? '1 article found.' : `${total} articles found.`;
  };

  const renderPosts = () => {
    if (!articleGrid) {
      return;
    }

    const start = (state.page - 1) * state.pageSize;
    const pagePosts = state.filteredPosts.slice(start, start + state.pageSize);

    if (!pagePosts.length) {
      articleGrid.innerHTML = '<p class="blog-empty-state">No articles match your search right now.</p>';
      return;
    }

    articleGrid.innerHTML = pagePosts
      .map(
        (post) => `
          <article class="blog-card">
            <a class="blog-card-image" href="${escapeHtml(toArticleUrl(post))}" aria-label="Read ${escapeHtml(post.title)}">
              <img src="${escapeHtml(post.image)}" alt="${escapeHtml(post.imageAlt || post.title)}" loading="lazy" decoding="async" />
            </a>
            <div class="blog-card-content">
              <p class="blog-meta">${escapeHtml(formatMeta(post))}</p>
              <h3><a href="${escapeHtml(toArticleUrl(post))}">${escapeHtml(post.title)}</a></h3>
              <p>${escapeHtml(post.excerpt)}</p>
              <div class="blog-tag-row">${post.categories.map((cat) => `<span>${escapeHtml(cat)}</span>`).join('')}</div>
              <p class="mt-3 mb-0"><a class="btn btn-outline" href="${escapeHtml(toArticleUrl(post))}">Read article</a></p>
            </div>
          </article>
        `
      )
      .join('');
  };

  const renderPagination = () => {
    if (!pagination || !pagePrev || !pageNext || !pageNumbers) {
      return;
    }

    pagination.hidden = true;
    pageNumbers.innerHTML = '';
    pagePrev.disabled = true;
    pageNext.disabled = true;

    const pages = Math.max(1, Math.ceil(state.filteredPosts.length / state.pageSize));
    if (state.page > pages) {
      state.page = pages;
    }
  };

  const renderRelated = () => {
    if (!relatedGrid) {
      return;
    }

    const source = state.posts.filter((post) => !state.featured || post.slug !== state.featured.slug).slice(0, 3);
    if (!source.length) {
      relatedGrid.innerHTML = '';
      return;
    }

    relatedGrid.innerHTML = source
      .map(
        (post) => `
          <article class="blog-related-card">
            <h3><a href="${escapeHtml(toArticleUrl(post))}">${escapeHtml(post.title)}</a></h3>
            <p>${escapeHtml(post.excerpt)}</p>
          </article>
        `
      )
      .join('');
  };

  const parseDate = (value) => {
    const parsed = new Date(String(value || ''));
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  };

  const normalizeArray = (value) => {
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
  };

  const normalizePost = (rawPost = {}) => {
    const categories = normalizeArray(rawPost.categories || rawPost.category || []);
    const tags = normalizeArray(rawPost.tags || []);
    const date = String(rawPost.date || '').trim();
    const dateLabel = String(rawPost.dateLabel || '').trim();

    return {
      title: String(rawPost.title || '').trim(),
      slug: String(rawPost.slug || '').trim(),
      url: String(rawPost.url || '').trim(),
      date,
      dateLabel:
        dateLabel ||
        (date
          ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'long' }).format(new Date(date))
          : ''),
      author: String(rawPost.author || 'Andy Fish').trim(),
      excerpt: String(rawPost.excerpt || '').trim(),
      category: String(rawPost.category || categories[0] || 'Journal').trim(),
      categories,
      tags,
      image: String(rawPost.image || 'assets/images/home/standing-in-the-grey.jpg').trim(),
      imageAlt: String(rawPost.imageAlt || rawPost.title || 'Article image').trim(),
      readingTime: String(rawPost.readingTime || '').trim(),
      featured: Boolean(rawPost.featured),
    };
  };

  const renderAll = () => {
    state.filteredPosts = getFilteredPosts();
    renderSummary();
    renderPosts();
    renderPagination();
    renderRelated();
  };

  const bindEvents = () => {
    if (categoryContainer) {
      categoryContainer.addEventListener('click', (event) => {
        const target = event.target.closest('[data-category]');
        if (!target) {
          return;
        }

        state.activeCategory = String(target.dataset.category || 'all');
        state.page = 1;
        renderCategoryFilters();
        renderAll();
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        state.search = String(searchInput.value || '').trim();
        state.page = 1;
        renderAll();
      });
    }

    if (pagePrev) {
      pagePrev.addEventListener('click', () => {
        if (state.page > 1) {
          state.page -= 1;
          renderAll();
          root.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }

    if (pageNext) {
      pageNext.addEventListener('click', () => {
        const pages = Math.max(1, Math.ceil(state.filteredPosts.length / state.pageSize));
        if (state.page < pages) {
          state.page += 1;
          renderAll();
          root.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }

    if (pageNumbers) {
      pageNumbers.addEventListener('click', (event) => {
        const target = event.target.closest('[data-page-number]');
        if (!target) {
          return;
        }

        const nextPage = Number(target.dataset.pageNumber);
        if (Number.isFinite(nextPage) && nextPage > 0) {
          state.page = nextPage;
          renderAll();
          root.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }
  };

  fetch(postsDataUrl, {
    headers: {
      Accept: 'application/json',
    },
  })
    .then(async (response) => {
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to load articles right now.');
      }
      return payload;
    })
    .then((payload) => {
      const rawItems = Array.isArray(payload.items) ? payload.items : [];
      state.posts = rawItems.map(normalizePost).sort((a, b) => parseDate(b.date) - parseDate(a.date));
      state.featured = state.posts.find((post) => post.featured) || state.posts[0] || null;
      state.categories = [...new Set(state.posts.flatMap((post) => post.categories))].sort((a, b) => a.localeCompare(b));

      renderFeatured();
      renderCategoryFilters();
      renderAll();
      bindEvents();
    })
    .catch((error) => {
      const message = escapeHtml(error.message || 'Unable to load articles right now.');
      if (summaryNode) {
        summaryNode.textContent = message;
      }
      if (featuredCard) {
        featuredCard.innerHTML = `<p class="mb-0">${message}</p>`;
      }
      if (articleGrid) {
        articleGrid.innerHTML = `<p class="blog-empty-state">${message}</p>`;
      }
      if (pagination) {
        pagination.hidden = true;
      }
    });
});

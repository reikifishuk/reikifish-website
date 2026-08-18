document.addEventListener("DOMContentLoaded", async () => {

  const resultsContainer = document.getElementById("knowledgeResults");
  const emptyState = document.getElementById("knowledgeEmpty");
  const title = document.getElementById("knowledgeResultsTitle");
  const count = document.getElementById("knowledgeResultCount");
  const searchInput = document.getElementById("knowledgeSearchInput");

  if (!resultsContainer) return;

  const params = new URLSearchParams(window.location.search);
  const query = (params.get("q") || "").trim();
  const category = (params.get("category") || "").trim();

  if (searchInput && query) {
    searchInput.value = query;
  }

  const normalise = value =>
    String(value || "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();

  try {

    const response = await fetch("assets/data/knowledge.json?v=15");

    if (!response.ok) {
      throw new Error("Knowledge database could not be loaded.");
    }

    const records = await response.json();

    let results = [...records];

    if (category) {

      results = results.filter(item =>
        normalise(item.category) === normalise(category)
      );

      title.textContent = category;

    } else if (query) {

      const cleanQuery = normalise(query);
      const words = cleanQuery.split(" ").filter(Boolean);

      results = records
        .map(item => {

          const itemTitle = normalise(item.title);
          const itemCategory = normalise(item.category);
          const itemType = normalise(item.type);
          const itemSummary = normalise(item.summary);
          const itemKeywords = normalise(
            Array.isArray(item.keywords)
              ? item.keywords.join(" ")
              : item.keywords
          );

          let score = 0;

          if (itemTitle === cleanQuery) score += 100;
          if (itemTitle.includes(cleanQuery)) score += 50;
          if (itemKeywords.includes(cleanQuery)) score += 40;
          if (itemCategory.includes(cleanQuery)) score += 25;
          if (itemSummary.includes(cleanQuery)) score += 15;

          words.forEach(word => {
            if (itemTitle.includes(word)) score += 12;
            if (itemKeywords.includes(word)) score += 10;
            if (itemCategory.includes(word)) score += 6;
            if (itemType.includes(word)) score += 4;
            if (itemSummary.includes(word)) score += 3;
          });

          return { ...item, _score: score };

        })
        .filter(item => item._score > 0)
        .sort((a,b) =>
          b._score - a._score ||
          a.title.localeCompare(b.title)
        );

      title.textContent = `Results for "${query}"`;

    } else {

      results.sort((a,b) => a.title.localeCompare(b.title));
      title.textContent = "Explore all knowledge";

    }

    count.textContent =
      `${results.length} ${results.length === 1 ? "result" : "results"}`;

    if (!results.length) {
      resultsContainer.hidden = true;
      emptyState.hidden = false;
      return;
    }

    resultsContainer.hidden = false;
    emptyState.hidden = true;

    results.forEach(item => {

      const card = document.createElement(item.url ? "a" : "article");
      card.className = "kb-result-card";

      if (item.url) {
        card.href = item.url;
        card.setAttribute("aria-label", "Read " + item.title);
        card.setAttribute("data-knowledge-link", "true");
      }

      const meta = document.createElement("div");
      meta.className = "kb-result-meta";
      meta.textContent = `${item.type} · ${item.category}`;

      const heading = document.createElement("h3");
      heading.textContent = item.title;

      const summary = document.createElement("p");
      summary.textContent = item.summary;

      card.appendChild(meta);
      card.appendChild(heading);
      card.appendChild(summary);

      resultsContainer.appendChild(card);

    });

  } catch (error) {

    console.error(error);

    title.textContent = "Knowledge Base unavailable";
    count.textContent = "";

    resultsContainer.hidden = true;
    emptyState.hidden = false;

    const message = emptyState.querySelector("p");

    if (message) {
      message.textContent =
        "The local knowledge database could not be loaded. Make sure the website preview is running on port 8000.";
    }
  }

});
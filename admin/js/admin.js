
function flaskApiBase() {
  const host = window.location.hostname;

  // When opened from the Codespaces port-8000 preview, convert
  // its forwarded hostname to the corresponding port-5000 URL.
  if (host.endsWith(".app.github.dev")) {
    const flaskHost = host.replace(/-\d+\.app\.github\.dev$/, "-5000.app.github.dev");
    return `https://${flaskHost}`;
  }

  if (window.location.port === "5000") return "";
  return "http://127.0.0.1:5000";
}

const el = id => document.getElementById(id);
const val = id => el(id)?.value?.trim() || "";

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const titleInput = el("title");
const slugInput = el("slug");

titleInput?.addEventListener("input", () => {
  if (slugInput?.dataset.edited === "true") return;
  if (slugInput) slugInput.value = slugify(titleInput.value);
});

slugInput?.addEventListener("input", () => {
  slugInput.dataset.edited = "true";
});

function updateSeoCounts() {
  const seoTitle = el("seo-title");
  const description = el("meta-description");
  const titleCount = el("meta-title-count");
  const descriptionCount = el("meta-description-count");

  if (titleCount) {
    titleCount.textContent = `${seoTitle?.value.length || 0}/70`;
  }

  if (descriptionCount) {
    descriptionCount.textContent =
      `${description?.value.length || 0}/155`;
  }
}

el("seo-title")?.addEventListener("input", updateSeoCounts);
el("meta-description")?.addEventListener("input", updateSeoCounts);
updateSeoCounts();

function articleContent() {
  const tiny = window.tinymce?.get("content");
  return tiny ? tiny.getContent() : el("content")?.value || "";
}

function setBusy(button, busy, label) {
  if (!button) return;

  if (busy) {
    button.dataset.originalLabel = button.textContent;
    button.textContent = label;
    button.disabled = true;
  } else {
    button.textContent =
      button.dataset.originalLabel || button.textContent;
    button.disabled = false;
  }
}

async function publishArticle() {
  const title = val("title");
  const slug = val("slug") || slugify(title);

  if (!title) throw new Error("Please enter a title.");
  if (!slug) throw new Error("Please enter a valid slug.");

  if (slugInput) slugInput.value = slug;

  const form = new FormData();

  form.append("title", title);
  form.append("slug", slug);
  form.append("seoTitle", val("seo-title") || title);
  form.append(
    "metaDescription",
    val("meta-description") || val("excerpt")
  );
  form.append("category", val("category"));
  form.append("tags", val("tags"));
  form.append("author", val("author") || "Reiki Fish");
  form.append("featured", String(Boolean(el("featured")?.checked)));
  form.append("excerpt", val("excerpt"));
  form.append("date", val("date"));
  form.append("imageAlt", val("alt"));
  form.append("content", articleContent());
  form.append(
    "existingImage",
    el("image")?.dataset.currentImage || ""
  );

  const selectedImage = el("image")?.files?.[0];

  if (!selectedImage && !el("image")?.dataset.currentImage) {
    throw new Error("Please select a featured image.");
  }

  if (selectedImage) {
    form.append("image", selectedImage, selectedImage.name);
  }

  const response = await fetch(`${flaskApiBase()}/publish-v2`, {
    method: "POST",
    body: form
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.success !== true) {
    throw new Error(
      result.message ||
      result.error ||
      `Publish failed with HTTP ${response.status}`
    );
  }

  return result;
}

el("publish")?.addEventListener("click", async event => {
  event.preventDefault();

  const button = event.currentTarget;
  setBusy(button, true, "Publishing…");

  try {
    const result = await publishArticle();

    alert(
      result.image
        ? `Published successfully.\nImage: ${result.image}`
        : "Published successfully, but no featured image was selected."
    );

    window.open(
      result.url,
      "_blank",
      "noopener,noreferrer"
    );
  } catch (error) {
    alert(`Publish failed: ${error.message}`);
  } finally {
    setBusy(button, false);
  }
});

el("save")?.addEventListener("click", async event => {
  event.preventDefault();

  const button = event.currentTarget;
  setBusy(button, true, "Saving…");

  try {
    const result = await publishArticle();
    alert(`Saved successfully: ${result.slug}`);
  } catch (error) {
    alert(`Save failed: ${error.message}`);
  } finally {
    setBusy(button, false);
  }
});

el("preview")?.addEventListener("click", event => {
  event.preventDefault();

  const preview = window.open("", "_blank");
  if (!preview) return;

  preview.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${val("title") || "Preview"}</title>
        <style>
          body {
            max-width: 850px;
            margin: 40px auto;
            padding: 20px;
            font: 18px/1.7 system-ui, sans-serif;
          }
          img {
            display: block;
            max-width: 100%;
            height: auto;
          }
        </style>
      </head>
      <body>
        <h1>${val("title")}</h1>
        ${articleContent()}
      </body>
    </html>
  `);

  preview.document.close();
});

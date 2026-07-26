document.getElementById("new-post")?.addEventListener("click", () => {
  location.href = "editor.html";
});

const byId = (id) => document.getElementById(id);
const value = (id) => byId(id)?.value?.trim() || "";
const checked = (id) => Boolean(byId(id)?.checked);

const title = byId("title");
const slug = byId("slug");
const seoTitle = byId("seo-title");
const seoDescription = byId("meta-description");
const seoTitleCount = byId("meta-title-count");
const seoDescriptionCount = byId("meta-description-count");

function makeSlug(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function updateSeoCounts() {
  if (seoTitleCount && seoTitle) {
    seoTitleCount.textContent = `${seoTitle.value.length}/70`;
  }

  if (seoDescriptionCount && seoDescription) {
    seoDescriptionCount.textContent = `${seoDescription.value.length}/155`;
  }
}

title?.addEventListener("input", () => {
  if (slug?.dataset.edited === "true") return;
  if (slug) slug.value = makeSlug(title.value);
});

slug?.addEventListener("input", () => {
  slug.dataset.edited = "true";
});

seoTitle?.addEventListener("input", updateSeoCounts);
seoDescription?.addEventListener("input", updateSeoCounts);
updateSeoCounts();

function editorContent() {
  if (window.tinymce?.get("content")) {
    return window.tinymce.get("content").getContent();
  }

  return byId("content")?.value || "";
}

function normaliseImagePath(path) {
  return String(path || "")
    .trim()
    .replace(/^https?:\/\/[^/]+/i, "")
    .replace(/^\/+/, "")
    .replace(/^images\/blog\//, "assets/images/blog/");
}

async function uploadFeaturedImage() {
  const input = byId("image");
  const file = input?.files?.[0];

  if (!file) {
    return normaliseImagePath(
      input?.dataset?.currentImage ||
      byId("featured-image")?.value ||
      ""
    );
  }

  const endpoints = [
    "/media/upload",
    "/upload-image",
    "/upload"
  ];

  let lastError = "Image upload endpoint was not found.";

  for (const endpoint of endpoints) {
    try {
      const form = new FormData();
      form.append("image", file);
      form.append("file", file);
      form.append("alt", value("alt"));
      form.append("caption", "");

      const response = await fetch(endpoint, {
        method: "POST",
        body: form
      });

      if (!response.ok) {
        lastError = `${endpoint}: HTTP ${response.status}`;
        continue;
      }

      const result = await response.json();
      const imagePath =
        result.url ||
        result.path ||
        result.image ||
        result.filename ||
        "";

      if (!imagePath) {
        lastError = `${endpoint}: upload succeeded but returned no image path`;
        continue;
      }

      if (result.filename && !String(imagePath).includes("/")) {
        return `assets/images/blog/${result.filename}`;
      }

      return normaliseImagePath(imagePath);
    } catch (error) {
      lastError = `${endpoint}: ${error.message}`;
    }
  }

  throw new Error(lastError);
}

async function collectPostData(uploadImage = true) {
  const postSlug = value("slug") || makeSlug(value("title"));

  if (!value("title")) {
    throw new Error("A post title is required.");
  }

  if (!postSlug) {
    throw new Error("A valid slug is required.");
  }

  if (slug) slug.value = postSlug;

  const image = uploadImage
    ? await uploadFeaturedImage()
    : normaliseImagePath(
        byId("image")?.dataset?.currentImage ||
        byId("featured-image")?.value ||
        ""
      );

  return {
    title: value("title"),
    "seo-title": value("seo-title") || value("title"),
    "meta-description": value("meta-description") || value("excerpt"),
    slug: postSlug,
    category: value("category"),
    categories: value("category"),
    tags: value("tags"),
    author: value("author") || "Reiki Fish",
    featured: checked("featured"),
    excerpt: value("excerpt"),
    date: value("date") || new Date().toISOString().slice(0, 10),
    image,
    featuredImage: image,
    alt: value("alt"),
    imageAlt: value("alt"),
    featuredImageAlt: value("alt"),
    content: editorContent()
  };
}

async function sendPost(endpoint, data) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });

  let result;

  try {
    result = await response.json();
  } catch {
    result = {};
  }

  if (!response.ok || result.success === false) {
    throw new Error(
      result.message ||
      result.error ||
      `Request failed with HTTP ${response.status}`
    );
  }

  return result;
}

function setBusy(button, busy, busyText) {
  if (!button) return;

  if (busy) {
    button.dataset.originalText = button.textContent;
    button.textContent = busyText;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
  }
}

byId("save")?.addEventListener("click", async (event) => {
  event.preventDefault();
  const button = event.currentTarget;
  setBusy(button, true, "Saving…");

  try {
    const data = await collectPostData(true);
    const result = await sendPost("/save-draft", data);
    alert(result.message || `Draft saved${result.file ? ` to ${result.file}` : ""}.`);
  } catch (error) {
    alert(`Draft could not be saved: ${error.message}`);
  } finally {
    setBusy(button, false);
  }
});

byId("publish")?.addEventListener("click", async (event) => {
  event.preventDefault();
  const button = event.currentTarget;
  setBusy(button, true, "Publishing…");

  try {
    const data = await collectPostData(true);
    const result = await sendPost("/publish", data);

    alert(
      result.message ||
      "Article published successfully. Featured image, ALT text and SEO metadata were saved."
    );

    if (result.url) {
      window.open(result.url, "_blank", "noopener");
    }
  } catch (error) {
    alert(`Article could not be published: ${error.message}`);
  } finally {
    setBusy(button, false);
  }
});

byId("preview")?.addEventListener("click", (event) => {
  event.preventDefault();

  const preview = window.open("", "_blank");
  if (!preview) return;

  preview.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${value("title") || "Article preview"}</title>
        <style>
          body{max-width:800px;margin:40px auto;padding:0 20px;font:18px/1.7 system-ui,sans-serif}
          img{max-width:100%;height:auto}
        </style>
      </head>
      <body>
        <h1>${value("title")}</h1>
        ${editorContent()}
      </body>
    </html>
  `);

  preview.document.close();
});

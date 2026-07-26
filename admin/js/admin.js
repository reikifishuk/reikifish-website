const byId = id => document.getElementById(id);
const value = id => byId(id)?.value?.trim() || "";

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const title = byId("title");
const slug = byId("slug");
const seoTitle = byId("seo-title");
const metaDescription = byId("meta-description");

title?.addEventListener("input", () => {
  if (slug?.dataset.edited === "true") return;
  if (slug) slug.value = slugify(title.value);
});

slug?.addEventListener("input", () => {
  slug.dataset.edited = "true";
});

function updateCounts() {
  const titleCount = byId("meta-title-count");
  const descriptionCount = byId("meta-description-count");

  if (titleCount) titleCount.textContent = `${seoTitle?.value.length || 0}/70`;
  if (descriptionCount) {
    descriptionCount.textContent = `${metaDescription?.value.length || 0}/155`;
  }
}

seoTitle?.addEventListener("input", updateCounts);
metaDescription?.addEventListener("input", updateCounts);
updateCounts();

function content() {
  const editor = window.tinymce?.get("content");
  return editor ? editor.getContent() : byId("content")?.value || "";
}

function setBusy(button, busy, text) {
  if (!button) return;

  if (busy) {
    button.dataset.oldText = button.textContent;
    button.textContent = text;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.oldText || button.textContent;
    button.disabled = false;
  }
}

async function publishPost() {
  const postTitle = value("title");
  const postSlug = value("slug") || slugify(postTitle);

  if (!postTitle) throw new Error("Enter a title.");
  if (!postSlug) throw new Error("Enter a valid slug.");

  if (slug) slug.value = postSlug;

  const form = new FormData();

  form.append("title", postTitle);
  form.append("slug", postSlug);
  form.append("seoTitle", value("seo-title") || postTitle);
  form.append("metaDescription", value("meta-description") || value("excerpt"));
  form.append("category", value("category"));
  form.append("tags", value("tags"));
  form.append("author", value("author") || "Reiki Fish");
  form.append("featured", String(Boolean(byId("featured")?.checked)));
  form.append("excerpt", value("excerpt"));
  form.append("date", value("date"));
  form.append("imageAlt", value("alt"));
  form.append("existingImage", byId("image")?.dataset.currentImage || "");
  form.append("content", content());

  const image = byId("image")?.files?.[0];
  if (image) form.append("image", image);

  const response = await fetch("/publish-complete", {
    method: "POST",
    body: form
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || !result.success) {
    throw new Error(result.message || result.error || `HTTP ${response.status}`);
  }

  return result;
}

byId("publish")?.addEventListener("click", async event => {
  event.preventDefault();

  const button = event.currentTarget;
  setBusy(button, true, "Publishing…");

  try {
    const result = await publishPost();
    alert(result.message || "Article published successfully.");

    if (result.url) {
      window.open(result.url, "_blank", "noopener");
    }
  } catch (error) {
    alert(`Publish failed: ${error.message}`);
  } finally {
    setBusy(button, false);
  }
});

byId("save")?.addEventListener("click", async event => {
  event.preventDefault();

  const button = event.currentTarget;
  setBusy(button, true, "Saving…");

  try {
    const result = await publishPost();
    alert(result.message || "Draft saved.");
  } catch (error) {
    alert(`Save failed: ${error.message}`);
  } finally {
    setBusy(button, false);
  }
});

byId("preview")?.addEventListener("click", event => {
  event.preventDefault();

  const preview = window.open("", "_blank");
  if (!preview) return;

  preview.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${value("title") || "Preview"}</title>
<style>
body{max-width:800px;margin:40px auto;padding:20px;font:18px/1.7 system-ui,sans-serif}
img{display:block;max-width:100%;height:auto}
</style>
</head>
<body>
<h1>${value("title")}</h1>
${content()}
</body>
</html>`);

  preview.document.close();
});

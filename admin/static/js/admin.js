let currentImagePath = "";

document.getElementById('new-post')?.addEventListener('click',()=>location='/editor');
const seoTitle=document.getElementById('seo-title');const seoDescription=document.getElementById('meta-description');const seoTitleCount=document.getElementById('meta-title-count');const seoDescriptionCount=document.getElementById('meta-description-count');function updateSeoCounts(){if(seoTitleCount&&seoTitle)seoTitleCount.textContent=seoTitle.value.length+'/70';if(seoDescriptionCount&&seoDescription)seoDescriptionCount.textContent=seoDescription.value.length+'/155';}seoTitle?.addEventListener('input',updateSeoCounts);seoDescription?.addEventListener('input',updateSeoCounts);updateSeoCounts();

const title=document.getElementById("title");
const slug=document.getElementById("slug");

function makeSlug(text){
return text
.toLowerCase()
.trim()
.replace(/['"]/g,"")
.replace(/[^a-z0-9]+/g,"-")
.replace(/^-+|-+$/g,"");
}

title?.addEventListener("input",()=>{

if(slug.dataset.edited==="true") return;

slug.value=makeSlug(title.value);

});

slug?.addEventListener("input",()=>{

slug.dataset.edited="true";

});

document.getElementById("save")?.addEventListener("click", async (e) => {
    e.preventDefault();

    const isDraft = true;

    const data = {
        title: document.getElementById("title").value,
        "seo-title": document.getElementById("seo-title").value,
        "meta-description": document.getElementById("meta-description").value,
        slug: document.getElementById("slug").value,
        category: document.getElementById("category").value,
        tags: document.getElementById("tags").value,
        author: document.getElementById("author").value,
        featured: document.getElementById("featured").checked,
        draft: isDraft,
        excerpt: document.getElementById("excerpt").value,
        image: currentImagePath,
        alt: document.getElementById("alt").value,
        content: getArticleContent()
    };

    const response = await fetch("/save-draft", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });

    const result = await response.json();

    if (result.success) {
        alert("Draft saved to " + result.file);
    } else {
        alert(result.message || "Failed to save draft.");
    }
});

document.getElementById("publish")?.addEventListener("click", async (event) => {
    event.preventDefault();

    const titleField = document.getElementById("title");
    const slugField = document.getElementById("slug");
    const titleValue = titleField?.value.trim() || "";
    const slugValue = slugField?.value.trim() || makeSlug(titleValue);

    if (!titleValue) {
        alert("Please enter an article title.");
        titleField?.focus();
        return;
    }

    if (!slugValue) {
        alert("A valid slug could not be created.");
        slugField?.focus();
        return;
    }

    slugField.value = slugValue;

    const payload = {
        title: titleValue,
        "seo-title": document.getElementById("seo-title")?.value.trim() || titleValue,
        "meta-description": document.getElementById("meta-description")?.value.trim() || "",
        slug: slugValue,
        category: document.getElementById("category")?.value || "Psychology",
        tags: document.getElementById("tags")?.value || "",
        author: document.getElementById("author")?.value || "Andy Fish",
        featured: Boolean(document.getElementById("featured")?.checked),
        draft: false,
        excerpt: document.getElementById("excerpt")?.value || "",
        image: currentImagePath || "",
        alt: document.getElementById("alt")?.value || "",
        content: getArticleContent(),
        date: document.getElementById("date")?.value || ""
    };

    try {
        const response = await fetch("/publish", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error || result.message || `Publish failed: HTTP ${response.status}`);
        }

        alert(`Published successfully: ${result.file}`);
        window.location.href = "/";
    } catch (error) {
        console.error("Publish error:", error);
        alert(`Publish failed: ${error.message}`);
    }
});
async function loadPosts() {
    const res = await fetch("/posts");
    const posts = await res.json();

    const list = document.getElementById("post-list");
    if (!list) return;

    list.innerHTML = posts.map(p => `
        <div class="post-row">
            <strong>${p.title}</strong>
            <small> (${p.draft ? "Draft" : "Published"})</small>
            <button type="button" class="edit-post" data-slug="${p.slug}">Edit</button>
            <button type="button" class="delete-post" data-slug="${p.slug}">Delete</button>
        </div>
    `).join("");
}

loadPosts();

// EDIT-POST-FUNCTIONALITY
function findEditorField(names) {
    for (const name of names) {
        const byId = document.getElementById(name);
        if (byId) return byId;

        const byName = document.querySelector(`[name="${name}"]`);
        if (byName) return byName;
    }

    return null;
}

function setEditorField(names, value) {
    const field = findEditorField(names);
    if (!field) return;

    if (field.type === "checkbox") {
        field.checked = Boolean(value);
        return;
    }

    if (Array.isArray(value)) {
        field.value = value.join(", ");
        return;
    }

    field.value = value ?? "";
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
}

async function loadPostForEditing() {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("slug");

    if (!slug || !window.location.pathname.includes("/editor")) return;

    try {
        const response = await fetch(`/post/${encodeURIComponent(slug)}`);
        const post = await response.json();

        if (!response.ok || !post.success) {
            throw new Error(post.message || "Could not load post.");
        }

        setEditorField(["title"], post.title);
        setEditorField(["seo-title", "seoTitle"], post["seo-title"]);
        setEditorField(
            ["meta-description", "metaDescription"],
            post["meta-description"]
        );
        setEditorField(["slug"], post.slug);
        setEditorField(["category"], post.category);
        setEditorField(["tags"], post.tags);
        setEditorField(["author"], post.author);
        setEditorField(["featured"], post.featured);
        setEditorField(["draft"], post.draft);
        setEditorField(["date"], post.date);
        setEditorField(["excerpt"], post.excerpt);
        const imageInput = document.getElementById("image");
        if (imageInput) {
            imageInput.value = "";
            currentImagePath = post.image || "";
            currentImagePath = post.image || "";
            imageInput.dataset.filename = currentImagePath;

            const info = document.getElementById("image-info");
            const preview = document.getElementById("image-preview");
            const filename = document.getElementById("image-filename");

            if (post.image) {
                info.style.display = "block";
                preview.src = currentImagePath;
                filename.textContent = post.image.split("/").pop();
            }
        }
        setEditorField(["imageAlt", "alt", "image-alt"], post.imageAlt);
        setEditorField(["content", "body"], post.content);
        if (window.tinymce && tinymce.get("content")) {
            tinymce.get("content").setContent(post.content || "");
        }

        document.title = `Edit: ${post.title || post.slug}`;
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

document.addEventListener("click", event => {
    const button = event.target.closest(".edit-post");
    if (!button) return;

    const slug = button.dataset.slug;
    if (!slug) {
        alert("This post has no slug.");
        return;
    }

    window.location.href = `/editor?slug=${encodeURIComponent(slug)}`;
});

document.addEventListener("click", async event => {
    const button = event.target.closest(".delete-post");
    if (!button) return;

    const slug = button.dataset.slug;

    if (!confirm(`Delete "${slug}"? This cannot be undone.`))
        return;

    const response = await fetch(`/delete/${encodeURIComponent(slug)}`, {
        method: "DELETE"
    });

    const result = await response.json();

    if (!result.success) {
        alert(result.message || "Delete failed.");
        return;
    }

    alert(result.message);

    loadPosts();
});

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadPostForEditing);
} else {
    loadPostForEditing();
}

// IMAGE-UPLOAD
document.getElementById("image")?.addEventListener("change", async event => {

    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    try {

        const response = await fetch("/upload-image", {
            method: "POST",
            body: formData
        });

        const result = await response.json();

        if (!result.success) {
            alert(result.message || "Upload failed.");
            return;
        }

        const alt = document.getElementById("alt");

        currentImagePath = result.path;
        currentImagePath = result.path || "";
        event.target.dataset.filename = currentImagePath;

        if (alt && !alt.value.trim()) {
            alt.value = file.name.replace(/\.[^.]+$/, "");
        }

        const info=document.getElementById("image-info");
        const preview=document.getElementById("image-preview");
        const filename=document.getElementById("image-filename");

        if(info) info.style.display="block";
        if (preview) preview.src = currentImagePath;
        if(filename) filename.textContent = result.filename || currentImagePath.split("/").pop();

        alert("Image uploaded successfully.");

    } catch (err) {
        console.error(err);
        alert("Image upload failed.");
    }

});

async function loadMediaLibrary() {
    const panel = document.getElementById("media-library");
    const grid = document.getElementById("media-grid");

    if (!panel || !grid) return;

    panel.style.display = "block";
    grid.innerHTML = "<p>Loading...</p>";

    try {
        const res = await fetch("/media");
        const images = await res.json();

        grid.innerHTML = "";

        if (!images.length) {
            grid.innerHTML = "<p>No uploaded images found.</p>";
            return;
        }

        images.forEach(img => {
            const card = document.createElement("div");
            card.style.cursor = "pointer";
            card.style.padding = "6px";
            card.style.border = "1px solid #ddd";
            card.style.borderRadius = "6px";
            card.style.textAlign = "center";

            card.innerHTML = `
                <img src="${img.path}" style="width:100%;height:90px;object-fit:cover;">
                <div style="margin-top:6px;font-size:12px;">${img.name}</div>
            `;

            card.onclick = () => {
                currentImagePath = img.path;

                document.getElementById("image-preview").src = img.path;
                document.getElementById("image-filename").textContent = img.name;
                document.getElementById("image-info").style.display = "block";

                panel.style.display = "none";
            };

            grid.appendChild(card);
        });

    } catch (e) {
        grid.innerHTML = "<p>Failed to load media.</p>";
        console.error(e);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("open-media");
    if (btn) {
        btn.addEventListener("click", loadMediaLibrary);
    }
});

// TINYMCE-VISUAL-EDITOR-START
function getArticleContent() {
    const editor = window.tinymce && tinymce.get("content");
    return editor
        ? editor.getContent()
        : (document.getElementById("content")?.value || "");
}

window.addEventListener("load", function () {
    const textarea = document.getElementById("content");
    if (!textarea) return;

    if (typeof tinymce === "undefined") {
        console.error("TinyMCE failed to load");
        return;
    }

    if (tinymce.get("content")) return;

    tinymce.init({
        selector: "#content",
        height: 620,
        menubar: "edit view insert format tools table help",
        branding: false,
        promotion: false,
        browser_spellcheck: true,
        convert_urls: false,

        plugins: [
            "advlist", "autolink", "lists", "link", "image",
            "media", "table", "code", "fullscreen", "preview",
            "searchreplace", "wordcount", "visualblocks",
            "charmap", "anchor", "insertdatetime", "help"
        ],

        toolbar:
            "undo redo | blocks | bold italic underline | " +
            "alignleft aligncenter alignright alignjustify | " +
            "bullist numlist outdent indent | link image table | " +
            "blockquote removeformat | code preview fullscreen",

        setup: function (editor) {
            editor.on("change input undo redo", function () {
                editor.save();
            });
        }
    });
});
// TINYMCE-VISUAL-EDITOR-END



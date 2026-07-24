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
        content: document.getElementById("content").value
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


document.getElementById("publish")?.addEventListener("click", async (e) => {
    e.preventDefault();

    const data = {
        title: document.getElementById("title").value,
        "seo-title": document.getElementById("seo-title").value,
        "meta-description": document.getElementById("meta-description").value,
        slug: document.getElementById("slug").value,
        category: document.getElementById("category").value,
        tags: document.getElementById("tags").value,
        author: document.getElementById("author").value,
        featured: document.getElementById("featured").checked,
        draft: false,
        excerpt: document.getElementById("excerpt").value,
        image: currentImagePath,
        alt: document.getElementById("alt").value,
        content: document.getElementById("content").value,
        date: document.getElementById("date")?.value || ""
    };

    const response = await fetch("/publish", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });

    const result = await response.json();

    if (result.success) {
        alert(result.message);
    } else {
        alert(result.message || "Publish failed.");
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

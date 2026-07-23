document.getElementById('new-post')?.addEventListener('click',()=>location='editor.html');
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

    const data = {
        title: document.getElementById("title").value,
        "seo-title": document.getElementById("seo-title").value,
        "meta-description": document.getElementById("meta-description").value,
        slug: document.getElementById("slug").value,
        category: document.getElementById("category").value,
        tags: document.getElementById("tags").value,
        author: document.getElementById("author").value,
        featured: document.getElementById("featured").checked,
        excerpt: document.getElementById("excerpt").value,
        image: document.getElementById("image").files.length
            ? document.getElementById("image").files[0].name
            : "",
        alt: document.getElementById("alt").value,
        content: document.getElementById("content").value
    };

    const response = await fetch("http://127.0.0.1:5000/save-draft", {
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

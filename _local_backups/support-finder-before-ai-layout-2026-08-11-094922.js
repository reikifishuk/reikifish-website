"use strict";

/* REIKIFISH_SUPPORT_FINDER_INTERACTION_V1 */

document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("supportFinderForm");
    const categoryButtons = Array.from(
        document.querySelectorAll(".sf-category-card")
    );

    const selectedCategory = document.getElementById("selectedCategory");
    const selectedCategoryLabel = document.getElementById(
        "selectedCategoryLabel"
    );

    const prompt = document.getElementById("supportPrompt");
    const location = document.getElementById("supportLocation");
    const country = document.getElementById("supportCountry");
    const results = document.getElementById("supportResults");
    const resultsContent = document.getElementById("supportResultsContent");

    const categoryLabels = {
        legal: "Legal support",
        "mental-health": "Mental health",
        "domestic-abuse": "Domestic abuse",
        family: "Family support",
        fathers: "Support for fathers",
        mothers: "Support for mothers",
        trauma: "Trauma and abuse",
        urgent: "Urgent help"
    };

    categoryButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            categoryButtons.forEach(function (item) {
                item.classList.remove("is-selected");
                item.setAttribute("aria-pressed", "false");
            });

            button.classList.add("is-selected");
            button.setAttribute("aria-pressed", "true");

            selectedCategory.value = button.dataset.category;
            selectedCategoryLabel.textContent =
                categoryLabels[button.dataset.category];

            prompt.focus();
        });
    });

    form.addEventListener("submit", function (event) {
        event.preventDefault();

        const promptValue = prompt.value.trim();
        const locationValue = location.value.trim();
        const countryValue = country.value;
        const categoryValue = selectedCategory.value;
        const categoryName = categoryValue
            ? categoryLabels[categoryValue]
            : "General support";

        if (!promptValue || !locationValue) {
            form.reportValidity();
            return;
        }

        resultsContent.innerHTML = `
            <div class="sf-result-grid">
                <article class="sf-result-card">
                    <h3>Your request</h3>
                    <p>
                        You are looking for
                        <strong>${escapeHtml(categoryName)}</strong>
                        near <strong>${escapeHtml(locationValue)}</strong>,
                        ${escapeHtml(countryValue)}.
                    </p>
                </article>

                <article class="sf-result-card">
                    <h3>What you told us</h3>
                    <p>${escapeHtml(promptValue)}</p>
                </article>

                <article class="sf-result-card">
                    <h3>Directory connection comes next</h3>
                    <p>
                        The visual search system is working. The next stage will
                        connect verified organisations, contact details, service
                        areas and eligibility information.
                    </p>
                </article>

                <article class="sf-result-card">
                    <h3>Safety reminder</h3>
                    <p>
                        This tool provides information and signposting. It does
                        not replace legal, medical, safeguarding or emergency
                        advice.
                    </p>
                </article>
            </div>
        `;

        results.hidden = false;
        results.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    });

    function escapeHtml(value) {
        return value.replace(/[&<>"']/g, function (character) {
            const replacements = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            };

            return replacements[character];
        });
    }
});
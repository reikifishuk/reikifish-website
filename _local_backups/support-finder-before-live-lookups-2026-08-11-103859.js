"use strict";

/* REIKIFISH_SUPPORT_FINDER_TEMPORARY_CHAT_V2 */

document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("supportFinderForm");
    const categoryButtons = Array.from(
        document.querySelectorAll(".sf-category-card")
    );

    const quickPromptButtons = Array.from(
        document.querySelectorAll("[data-support-prompt]")
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
    const temporaryChats = document.getElementById("temporaryChats");
    const newChatButton = document.getElementById("newSupportChat");

    const temporaryHistory = [];

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
        button.setAttribute("aria-pressed", "false");

        button.addEventListener("click", function () {
            selectCategory(button.dataset.category);
            prompt.focus();
        });
    });

    quickPromptButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            prompt.value = button.dataset.supportPrompt || "";

            if (button.dataset.supportCategory) {
                selectCategory(button.dataset.supportCategory);
            }

            prompt.focus();
        });
    });

    if (newChatButton) {
        newChatButton.addEventListener("click", function () {
            form.reset();
            selectedCategory.value = "";
            selectedCategoryLabel.textContent = "None selected";

            categoryButtons.forEach(function (button) {
                button.classList.remove("is-selected");
                button.setAttribute("aria-pressed", "false");
            });

            results.hidden = true;
            resultsContent.innerHTML = "";

            temporaryChats
                .querySelectorAll(".sf-history-item")
                .forEach(function (item) {
                    item.classList.remove("is-active");
                });

            prompt.focus();
        });
    }

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

        const temporaryChat = {
            prompt: promptValue,
            location: locationValue,
            country: countryValue,
            category: categoryValue,
            categoryName: categoryName
        };

        temporaryHistory.unshift(temporaryChat);

        if (temporaryHistory.length > 8) {
            temporaryHistory.pop();
        }

        renderTemporaryHistory();
        renderResults(temporaryChat);

        results.hidden = false;
        results.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    });

    function selectCategory(category) {
        categoryButtons.forEach(function (button) {
            const selected = button.dataset.category === category;

            button.classList.toggle("is-selected", selected);
            button.setAttribute(
                "aria-pressed",
                selected ? "true" : "false"
            );
        });

        selectedCategory.value = category || "";
        selectedCategoryLabel.textContent =
            categoryLabels[category] || "None selected";
    }

    function renderTemporaryHistory() {
        if (!temporaryChats) {
            return;
        }

        temporaryChats.innerHTML = "";

        temporaryHistory.forEach(function (chat, index) {
            const button = document.createElement("button");

            button.type = "button";
            button.className =
                "sf-history-item" + (index === 0 ? " is-active" : "");

            button.textContent = chat.prompt;
            button.title = chat.prompt;

            button.addEventListener("click", function () {
                prompt.value = chat.prompt;
                location.value = chat.location;
                country.value = chat.country;
                selectCategory(chat.category);

                temporaryChats
                    .querySelectorAll(".sf-history-item")
                    .forEach(function (item) {
                        item.classList.remove("is-active");
                    });

                button.classList.add("is-active");
                renderResults(chat);
                results.hidden = false;
            });

            temporaryChats.appendChild(button);
        });
    }

    function renderResults(chat) {
        resultsContent.innerHTML = `
            <div class="sf-result-grid">
                <article class="sf-result-card">
                    <h3>Your request</h3>
                    <p>
                        You are looking for
                        <strong>${escapeHtml(chat.categoryName)}</strong>
                        near <strong>${escapeHtml(chat.location)}</strong>,
                        ${escapeHtml(chat.country)}.
                    </p>
                </article>

                <article class="sf-result-card">
                    <h3>What you told us</h3>
                    <p>${escapeHtml(chat.prompt)}</p>
                </article>

                <article class="sf-result-card">
                    <h3>Directory connection comes next</h3>
                    <p>
                        This preview demonstrates the chat interface. Verified
                        organisations, contact details, service areas and
                        eligibility information will be connected next.
                    </p>
                </article>

                <article class="sf-result-card">
                    <h3>Temporary and private</h3>
                    <p>
                        This search remains in the current browser page only.
                        It is not saved when the page is refreshed or closed.
                        Avoid entering names, case numbers or sensitive records.
                    </p>
                </article>
            </div>
        `;
    }

    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, function (character) {
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
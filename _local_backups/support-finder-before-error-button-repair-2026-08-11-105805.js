"use strict";

/* REIKIFISH_SUPPORT_DIRECTORY_ENGINE_V1 */

document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("supportFinderForm");
    const promptInput = document.getElementById("supportPrompt");
    const locationInput = document.getElementById("supportLocation");
    const countryInput = document.getElementById("supportCountry");
    const selectedCategoryInput = document.getElementById("selectedCategory");
    const selectedCategoryLabel = document.getElementById("selectedCategoryLabel");
    const resultsSection = document.getElementById("supportResults");
    const resultsContent = document.getElementById("supportResultsContent");
    const temporaryChats = document.getElementById("temporaryChats");
    const newChatButton = document.getElementById("newSupportChat");
    const submitButton = form ? form.querySelector('[type="submit"]') : null;

    const categoryButtons = Array.from(
        document.querySelectorAll(".sf-category-card")
    );

    const quickPromptButtons = Array.from(
        document.querySelectorAll("[data-support-prompt]")
    );

    const locationCache = new Map();
    const temporaryHistory = [];
    let lastNominatimRequest = 0;

    const NOMINATIM_ENDPOINT =
        "https://nominatim.openstreetmap.org/search";

    const OVERPASS_ENDPOINT =
        "https://overpass.private.coffee/api/interpreter";

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

    const categorySearchTerms = {
        legal: "solicitor lawyer legal advice",
        "mental-health": "psychologist counsellor psychotherapist",
        "domestic-abuse": "domestic abuse support refuge",
        family: "family support service",
        fathers: "father family support",
        mothers: "mother women family support",
        trauma: "trauma counsellor psychotherapist",
        urgent: "hospital police emergency"
    };

    const countryCodes = {
        "United Kingdom": "gb",
        Ireland: "ie",
        "United States": "us",
        Canada: "ca",
        Australia: "au",
        "New Zealand": "nz"
    };

    const ukOfficialRoutes = {
        legal: [
            {
                name: "Find a legal adviser",
                description:
                    "UK Government guidance for finding legal advice and checking available support.",
                url: "https://www.gov.uk/find-legal-advice"
            },
            {
                name: "Check whether you can receive legal aid",
                description:
                    "Official eligibility checker for legal aid in England and Wales.",
                url: "https://www.gov.uk/check-legal-aid"
            },
            {
                name: "Law Society Find a Solicitor",
                description:
                    "Search the Law Society directory for regulated solicitors in England and Wales.",
                url: "https://solicitors.lawsociety.org.uk/"
            }
        ],
        "mental-health": [
            {
                name: "NHS Talking Therapies",
                description:
                    "Find NHS talking-therapy services for anxiety and depression in England.",
                url: "https://www.nhs.uk/service-search/mental-health/find-an-NHS-talking-therapies-service/"
            },
            {
                name: "NHS mental health services",
                description:
                    "Official NHS information about mental health services and support.",
                url: "https://www.nhs.uk/nhs-services/mental-health-services/"
            }
        ],
        "domestic-abuse": [
            {
                name: "UK Government domestic abuse help",
                description:
                    "Official information about confidential domestic-abuse support for different needs.",
                url: "https://www.gov.uk/guidance/domestic-abuse-how-to-get-help"
            }
        ],
        family: [
            {
                name: "Citizens Advice family guidance",
                description:
                    "Independent information about separation, children and family matters.",
                url: "https://www.citizensadvice.org.uk/family/"
            }
        ],
        fathers: [
            {
                name: "Families Need Fathers",
                description:
                    "Information and support concerning children and family separation.",
                url: "https://fnf.org.uk/"
            }
        ],
        mothers: [
            {
                name: "Women's Aid directory",
                description:
                    "Search for local domestic-abuse services and support across the UK.",
                url: "https://www.womensaid.org.uk/womens-aid-directory/"
            }
        ],
        trauma: [
            {
                name: "NHS mental health services",
                description:
                    "Find NHS mental health information and local service routes.",
                url: "https://www.nhs.uk/nhs-services/mental-health-services/"
            }
        ],
        urgent: [
            {
                name: "Urgent mental health help",
                description:
                    "NHS guidance for obtaining urgent mental health support.",
                url: "https://www.nhs.uk/nhs-services/mental-health-services/where-to-get-urgent-help-for-mental-health/"
            },
            {
                name: "Samaritans",
                description:
                    "Free emotional support by telephone on 116 123 in the UK and Ireland.",
                url: "https://www.samaritans.org/how-we-can-help/contact-samaritan/"
            }
        ]
    };

    categoryButtons.forEach(function (button) {
        button.setAttribute("aria-pressed", "false");

        button.addEventListener("click", function () {
            selectCategory(button.dataset.category);
            promptInput.focus();
        });
    });

    quickPromptButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            promptInput.value = button.dataset.supportPrompt || "";

            if (button.dataset.supportCategory) {
                selectCategory(button.dataset.supportCategory);
            }

            promptInput.focus();
        });
    });

    if (newChatButton) {
        newChatButton.addEventListener("click", startNewChat);
    }

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const promptValue = promptInput.value.trim();
        const locationValue = locationInput.value.trim();
        const countryValue = countryInput.value;

        if (!promptValue || !locationValue) {
            form.reportValidity();
            return;
        }

        let categoryValue = selectedCategoryInput.value;

        if (!categoryValue) {
            categoryValue = inferCategory(promptValue);
            selectCategory(categoryValue);
        }

        const search = {
            prompt: promptValue,
            location: locationValue,
            country: countryValue,
            category: categoryValue,
            categoryName:
                categoryLabels[categoryValue] || "General support",
            results: [],
            coordinates: null
        };

        await runDirectorySearch(search, true);
    });

    function startNewChat() {
        form.reset();
        selectedCategoryInput.value = "";
        selectedCategoryLabel.textContent = "None selected";

        categoryButtons.forEach(function (button) {
            button.classList.remove("is-selected");
            button.setAttribute("aria-pressed", "false");
        });

        resultsSection.hidden = true;
        resultsContent.innerHTML = "";

        temporaryChats
            ?.querySelectorAll(".sf-history-item")
            .forEach(function (item) {
                item.classList.remove("is-active");
            });

        promptInput.focus();
    }

    async function runDirectorySearch(search, addToHistory) {
        setSearchingState(true);
        showLoading(search);

        try {
            const coordinates = await geocodeLocation(
                search.location,
                search.country
            );

            search.coordinates = coordinates;

            const places = await findNearbyPlaces(
                coordinates.latitude,
                coordinates.longitude,
                search.category,
                search.prompt
            );

            search.results = places;

            if (addToHistory) {
                temporaryHistory.unshift(search);

                if (temporaryHistory.length > 8) {
                    temporaryHistory.pop();
                }

                renderTemporaryHistory();
            }

            renderResults(search);
        }
        catch (error) {
            console.error("Support Finder lookup failed:", error);
            renderLookupError(search, error);
        }
        finally {
            setSearchingState(false);
        }
    }

    function inferCategory(prompt) {
        const value = prompt.toLowerCase();

        const rules = [
            {
                category: "urgent",
                words: [
                    "immediate danger",
                    "emergency",
                    "suicidal",
                    "suicide",
                    "crisis",
                    "police"
                ]
            },
            {
                category: "domestic-abuse",
                words: [
                    "domestic abuse",
                    "domestic violence",
                    "refuge",
                    "abusive partner",
                    "violence",
                    "coercive control"
                ]
            },
            {
                category: "legal",
                words: [
                    "solicitor",
                    "lawyer",
                    "legal aid",
                    "court",
                    "family law",
                    "custody",
                    "contact order"
                ]
            },
            {
                category: "fathers",
                words: ["father", "dad", "fathers", "dads"]
            },
            {
                category: "mothers",
                words: ["mother", "mum", "mothers", "mums"]
            },
            {
                category: "trauma",
                words: [
                    "trauma",
                    "narcissistic",
                    "darvo",
                    "gaslighting",
                    "ptsd",
                    "abuse recovery"
                ]
            },
            {
                category: "mental-health",
                words: [
                    "psychologist",
                    "counsellor",
                    "counselor",
                    "therapist",
                    "mental health",
                    "anxiety",
                    "depression"
                ]
            },
            {
                category: "family",
                words: [
                    "family",
                    "parent",
                    "children",
                    "child",
                    "separation",
                    "relationship"
                ]
            }
        ];

        for (const rule of rules) {
            if (rule.words.some(function (word) {
                return value.includes(word);
            })) {
                return rule.category;
            }
        }

        return "family";
    }

    function selectCategory(category) {
        categoryButtons.forEach(function (button) {
            const selected = button.dataset.category === category;

            button.classList.toggle("is-selected", selected);
            button.setAttribute(
                "aria-pressed",
                selected ? "true" : "false"
            );
        });

        selectedCategoryInput.value = category || "";
        selectedCategoryLabel.textContent =
            categoryLabels[category] || "None selected";
    }

    async function geocodeLocation(location, country) {
        const cacheKey =
            location.toLowerCase() + "|" + country.toLowerCase();

        if (locationCache.has(cacheKey)) {
            return locationCache.get(cacheKey);
        }

        /*
         * The public Nominatim service requires no more than one request
         * per second. There is no autocomplete or background geocoding.
         */
        const elapsed = Date.now() - lastNominatimRequest;

        if (elapsed < 1100) {
            await delay(1100 - elapsed);
        }

        const parameters = new URLSearchParams({
            q: location + ", " + country,
            format: "jsonv2",
            limit: "1",
            addressdetails: "1",
            "accept-language": "en"
        });

        if (countryCodes[country]) {
            parameters.set("countrycodes", countryCodes[country]);
        }

        lastNominatimRequest = Date.now();

        const response = await fetch(
            NOMINATIM_ENDPOINT + "?" + parameters.toString(),
            {
                method: "GET",
                headers: {
                    Accept: "application/json"
                }
            }
        );

        if (!response.ok) {
            throw new Error(
                "The location service returned status " +
                response.status +
                "."
            );
        }

        const data = await response.json();

        if (!Array.isArray(data) || data.length === 0) {
            throw new Error(
                "We could not recognise that location. Try a postcode, town or city."
            );
        }

        const coordinates = {
            latitude: Number(data[0].lat),
            longitude: Number(data[0].lon),
            displayName: data[0].display_name || location
        };

        locationCache.set(cacheKey, coordinates);

        return coordinates;
    }

    async function findNearbyPlaces(latitude, longitude, category, prompt) {
        const radius = category === "urgent" ? 20000 : 15000;
        const around =
            "(around:" +
            radius +
            "," +
            latitude +
            "," +
            longitude +
            ")";

        const clauses = buildOverpassClauses(around, category);

        const query =
            "[out:json][timeout:12];" +
            "(" +
            clauses.join("") +
            ");" +
            "out center 40;";

        /* RF_OVERPASS_CLIENT_TIMEOUT */
        const requestController = new AbortController();

        const requestTimer = window.setTimeout(function () {
            requestController.abort();
        }, 12000);

        let response;

        try {
            response = await fetch(OVERPASS_ENDPOINT, {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded;charset=UTF-8"
                },
                body: "data=" + encodeURIComponent(query),
                signal: requestController.signal
            });
        }
        catch (error) {
            if (error && error.name === "AbortError") {
                throw new Error(
                    "The public local directory took too long to respond."
                );
            }

            throw error;
        }
        finally {
            window.clearTimeout(requestTimer);
        }

        if (!response.ok) {
            throw new Error(
                "The local directory service returned status " +
                response.status +
                ". Please try again shortly."
            );
        }

        const data = await response.json();
        const seen = new Set();

        return (data.elements || [])
            .map(function (element) {
                return normalisePlace(
                    element,
                    latitude,
                    longitude,
                    category,
                    prompt
                );
            })
            .filter(function (place) {
                if (!place || !place.name) {
                    return false;
                }

                const key =
                    place.name.toLowerCase() +
                    "|" +
                    place.latitude.toFixed(4) +
                    "|" +
                    place.longitude.toFixed(4);

                if (seen.has(key)) {
                    return false;
                }

                seen.add(key);
                return true;
            })
            .sort(function (first, second) {
                return first.distance - second.distance;
            })
            .slice(0, 10);
    }

    function buildOverpassClauses(around, category) {
        const wrap = function (filter) {
            return (
                "nwr" + around + filter + ";"
            );
        };

        switch (category) {
            case "legal":
                return [
                    wrap('["office"="lawyer"]'),
                    wrap('["lawyer"]'),
                    wrap('["office"="notary"]')
                ];

            case "mental-health":
            case "trauma":
                return [
                    wrap('["healthcare"="psychotherapist"]'),
                    wrap('["healthcare"="counselling"]'),
                    wrap('["healthcare:speciality"~"psychiatry|psychology",i]')
                ];

            case "domestic-abuse":
                return [
                    wrap('["amenity"="social_facility"]["name"~"abuse|refuge|women|safe|domestic",i]'),
                    wrap('["social_facility"="shelter"]["name"~"women|abuse|refuge|safe",i]'),
                    wrap('["office"="ngo"]["name"~"abuse|refuge|women|domestic",i]')
                ];

            case "fathers":
                return [
                    wrap('["amenity"="social_facility"]["name"~"father|dad|men|family",i]'),
                    wrap('["office"="ngo"]["name"~"father|dad|men|family",i]'),
                    wrap('["amenity"="community_centre"]["name"~"father|dad|men|family",i]')
                ];

            case "mothers":
                return [
                    wrap('["amenity"="social_facility"]["name"~"mother|mum|women|family",i]'),
                    wrap('["office"="ngo"]["name"~"mother|mum|women|family",i]'),
                    wrap('["amenity"="community_centre"]["name"~"mother|mum|women|family",i]')
                ];

            case "urgent":
                return [
                    wrap('["amenity"="hospital"]'),
                    wrap('["amenity"="police"]'),
                    wrap('["emergency"="emergency_ward_entrance"]')
                ];

            case "family":
            default:
                return [
                    wrap('["amenity"="social_facility"]["name"~"family|parent|child|children",i]'),
                    wrap('["office"="ngo"]["name"~"family|parent|child|children",i]'),
                    wrap('["amenity"="community_centre"]["name"~"family|parent|child|children",i]')
                ];
        }
    }

    function normalisePlace(
        element,
        originLatitude,
        originLongitude,
        category,
        prompt
    ) {
        const tags = element.tags || {};
        const latitude =
            typeof element.lat === "number"
                ? element.lat
                : element.center?.lat;

        const longitude =
            typeof element.lon === "number"
                ? element.lon
                : element.center?.lon;

        if (
            typeof latitude !== "number" ||
            typeof longitude !== "number"
        ) {
            return null;
        }

        const name =
            tags.name ||
            tags.operator ||
            tags.brand ||
            "";

        if (!name) {
            return null;
        }

        /* RF_MENTAL_HEALTH_ACCURACY_FILTER */
        if (
            !matchesRequestedSupport(
                tags,
                name,
                category,
                prompt
            )
        ) {
            return null;
        }

        const website =
            tags.website ||
            tags["contact:website"] ||
            tags.url ||
            "";

        const phone =
            tags.phone ||
            tags["contact:phone"] ||
            tags["contact:mobile"] ||
            "";

        return {
            id: element.id,
            type: element.type,
            name: name,
            category: category,
            latitude: latitude,
            longitude: longitude,
            distance: calculateDistance(
                originLatitude,
                originLongitude,
                latitude,
                longitude
            ),
            address: buildAddress(tags),
            phone: phone,
            website: normaliseWebsite(website),
            openingHours: tags.opening_hours || "",
            description:
                tags.description ||
                tags["service:description"] ||
                "",
            osmUrl:
                "https://www.openstreetmap.org/" +
                element.type +
                "/" +
                element.id
        };
    }

    function matchesRequestedSupport(
        tags,
        name,
        category,
        prompt
    ) {
        if (
            category !== "mental-health" &&
            category !== "trauma"
        ) {
            return true;
        }

        const healthcare = String(
            tags.healthcare || ""
        ).toLowerCase();

        const speciality = String(
            tags["healthcare:speciality"] || ""
        ).toLowerCase();

        const amenity = String(
            tags.amenity || ""
        ).toLowerCase();

        const description = [
            name,
            tags.description,
            tags.operator,
            tags.speciality,
            tags["service:description"]
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        const originalPrompt = String(
            prompt || ""
        ).toLowerCase();

        const specificallyRequestsPractitioner =
            /psycholog|counsell|counsel|psychotherap|therapist/.test(
                originalPrompt
            );

        const clearlyPhysicalTherapy =
            /physio|physiotherap|chiropract|osteopath|massage|sports therapy|occupational therapy|speech therapy/.test(
                description + " " + healthcare + " " + speciality
            );

        const mentalHealthcareTag =
            [
                "psychotherapist",
                "psychologist",
                "psychiatrist",
                "counselling"
            ].includes(healthcare);

        const mentalSpecialityTag =
            /psycholog|psychiatr|mental_health|psychotherap|counsell/.test(
                speciality
            );

        const mentalDescription =
            /psycholog|psychotherap|counsell|counsel|mental health|psychiatr|trauma|wellbeing hub/.test(
                description
            );

        if (
            clearlyPhysicalTherapy &&
            !mentalHealthcareTag &&
            !mentalSpecialityTag
        ) {
            return false;
        }

        /*
         * A general hospital is not shown for a specific psychologist or
         * counsellor search unless its listing identifies a relevant
         * mental-health service.
         */
        if (
            specificallyRequestsPractitioner &&
            amenity === "hospital" &&
            !mentalDescription &&
            !mentalSpecialityTag
        ) {
            return false;
        }

        return (
            mentalHealthcareTag ||
            mentalSpecialityTag ||
            mentalDescription
        );
    }

    function buildAddress(tags) {
        const firstLine = [
            tags["addr:housenumber"],
            tags["addr:street"]
        ].filter(Boolean).join(" ");

        return [
            firstLine,
            tags["addr:suburb"],
            tags["addr:city"] || tags["addr:town"] || tags["addr:village"],
            tags["addr:postcode"]
        ].filter(Boolean).join(", ");
    }

    function normaliseWebsite(website) {
        if (!website) {
            return "";
        }

        if (/^https?:\/\//i.test(website)) {
            return website;
        }

        return "https://" + website;
    }

    function calculateDistance(lat1, lon1, lat2, lon2) {
        const earthRadius = 6371;
        const latitudeDifference = toRadians(lat2 - lat1);
        const longitudeDifference = toRadians(lon2 - lon1);

        const value =
            Math.sin(latitudeDifference / 2) ** 2 +
            Math.cos(toRadians(lat1)) *
            Math.cos(toRadians(lat2)) *
            Math.sin(longitudeDifference / 2) ** 2;

        return earthRadius * 2 * Math.atan2(
            Math.sqrt(value),
            Math.sqrt(1 - value)
        );
    }

    function toRadians(value) {
        return value * Math.PI / 180;
    }

    function showLoading(search) {
        resultsSection.hidden = false;
        resultsSection.classList.add("is-loading");

        resultsContent.innerHTML = `
            <div class="sf-directory-loading">
                <span class="sf-loading-ring" aria-hidden="true"></span>
                <div>
                    <strong>Searching near ${escapeHtml(search.location)}</strong>
                    <p>
                        Looking for ${escapeHtml(search.categoryName.toLowerCase())}
                        and sorting available services by distance.
                    </p>
                </div>
            </div>
        `;

        resultsSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    function renderResults(search) {
        resultsSection.classList.remove("is-loading");

        const nearbyCards = search.results.length
            ? search.results.map(renderPlaceCard).join("")
            : `
                <div class="sf-no-directory-results">
                    <h3>No mapped local services were found</h3>
                    <p>
                        This does not mean that support is unavailable.
                        OpenStreetMap coverage varies between services and
                        locations. Use the additional routes below and verify
                        eligibility directly.
                    </p>
                </div>
            `;

        resultsContent.innerHTML = `
            ${search.category === "urgent" ? renderUrgentWarning(search.country) : ""}

            <div class="sf-results-summary">
                <div>
                    <span>${search.results.length} local result${search.results.length === 1 ? "" : "s"}</span>
                    <h3>${escapeHtml(search.categoryName)} near ${escapeHtml(search.location)}</h3>
                    <p>${escapeHtml(search.coordinates.displayName)}</p>
                </div>

                <div class="sf-results-radius">
                    Within approximately
                    <strong>${search.category === "urgent" ? "20 km" : "15 km"}</strong>
                </div>
            </div>

            <div class="sf-directory-grid">
                ${nearbyCards}
            </div>

            ${renderOfficialRoutes(search)}

            <div class="sf-directory-caution">
                <strong>Check information directly</strong>
                <p>
                    Directory details may be incomplete or out of date.
                    ReikiFish does not endorse, regulate or guarantee listed
                    organisations. Confirm services, qualifications, costs,
                    eligibility and availability directly before relying on
                    the information.
                </p>
            </div>

            <div class="sf-directory-source">
                Location search and nearby directory data:
                <a
                    href="https://www.openstreetmap.org/copyright"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    &copy; OpenStreetMap contributors
                </a>
            </div>
        `;
    }

    function renderPlaceCard(place) {
        const contactLinks = [];

        if (place.phone) {
            contactLinks.push(`
                <a href="tel:${escapeAttribute(place.phone)}">
                    Call
                </a>
            `);
        }

        if (place.website) {
            contactLinks.push(`
                <a
                    href="${escapeAttribute(place.website)}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Website
                </a>
            `);
        }

        contactLinks.push(`
            <a
                href="${escapeAttribute(place.osmUrl)}"
                target="_blank"
                rel="noopener noreferrer"
            >
                Map
            </a>
        `);

        return `
            <article class="sf-directory-card">
                <div class="sf-directory-card-top">
                    <span class="sf-distance-badge">
                        ${formatDistance(place.distance)}
                    </span>

                    <span class="sf-verified-source">
                        Public map listing
                    </span>
                </div>

                <h3>${escapeHtml(place.name)}</h3>

                ${place.address
                    ? `<p class="sf-place-address">${escapeHtml(place.address)}</p>`
                    : `<p class="sf-place-address">Address details not supplied</p>`
                }

                ${place.description
                    ? `<p class="sf-place-description">${escapeHtml(place.description)}</p>`
                    : ""
                }

                ${place.openingHours
                    ? `<p class="sf-opening-hours"><strong>Hours:</strong> ${escapeHtml(place.openingHours)}</p>`
                    : ""
                }

                ${place.phone
                    ? `<p class="sf-place-phone">${escapeHtml(place.phone)}</p>`
                    : ""
                }

                <div class="sf-directory-actions">
                    ${contactLinks.join("")}
                </div>
            </article>
        `;
    }

    function renderOfficialRoutes(search) {
        if (search.country !== "United Kingdom") {
            const searchTerm =
                categorySearchTerms[search.category] ||
                "support service";

            const osmSearch =
                "https://www.openstreetmap.org/search?query=" +
                encodeURIComponent(
                    searchTerm + " " + search.location
                );

            return `
                <section class="sf-official-routes">
                    <p class="sf-results-eyebrow">MORE SEARCH OPTIONS</p>
                    <h3>Search a wider area</h3>
                    <p>
                        Public-service structures differ by country. Check
                        national government, healthcare and regulated
                        professional directories for your location.
                    </p>

                    <a
                        class="sf-route-card"
                        href="${escapeAttribute(osmSearch)}"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <strong>Search OpenStreetMap directly</strong>
                        <span>${escapeHtml(searchTerm)} near ${escapeHtml(search.location)}</span>
                    </a>
                </section>
            `;
        }

        const routes = ukOfficialRoutes[search.category] || [];

        if (!routes.length) {
            return "";
        }

        return `
            <section class="sf-official-routes">
                <p class="sf-results-eyebrow">ADDITIONAL UK ROUTES</p>
                <h3>Trusted directories and guidance</h3>

                <div class="sf-route-grid">
                    ${routes.map(function (route) {
                        return `
                            <a
                                class="sf-route-card"
                                href="${escapeAttribute(route.url)}"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <strong>${escapeHtml(route.name)}</strong>
                                <span>${escapeHtml(route.description)}</span>
                                <i aria-hidden="true">&rarr;</i>
                            </a>
                        `;
                    }).join("")}
                </div>
            </section>
        `;
    }

    function renderUrgentWarning(country) {
        const number =
            country === "United Kingdom"
                ? "999"
                : "the emergency number for your location";

        return `
            <div class="sf-urgent-warning">
                <strong>Immediate danger</strong>
                <p>
                    If someone is in immediate danger, do not wait for directory
                    results. Call ${escapeHtml(number)} now or go to the nearest
                    appropriate emergency service.
                </p>
            </div>
        `;
    }

    function renderLookupError(search, error) {
        resultsSection.classList.remove("is-loading");
        resultsSection.hidden = false;

        resultsContent.innerHTML = `
            ${search.category === "urgent"
                ? renderUrgentWarning(search.country)
                : ""
            }

            <div class="sf-directory-error sf-directory-error-compact">
                <div class="sf-error-symbol" aria-hidden="true">!</div>

                <div>
                    <h3>Local lookup is temporarily unavailable</h3>

                    <p>
                        ${escapeHtml(error.message)}
                        The public directory may be busy. You can try the
                        lookup again without re-entering your information.
                    </p>

                    <button id="retryDirectorySearch" type="button">
                        Try lookup again
                    </button>
                </div>
            </div>

            ${renderOfficialRoutes(search)}
        `;

        document
            .getElementById("retryDirectorySearch")
            ?.addEventListener("click", function () {
                runDirectorySearch(search, false);
            });
    }

    function renderTemporaryHistory() {
        if (!temporaryChats) {
            return;
        }

        temporaryChats.innerHTML = "";

        temporaryHistory.forEach(function (search, index) {
            const button = document.createElement("button");

            button.type = "button";
            button.className =
                "sf-history-item" +
                (index === 0 ? " is-active" : "");

            button.textContent = search.prompt;
            button.title = search.prompt;

            button.addEventListener("click", function () {
                promptInput.value = search.prompt;
                locationInput.value = search.location;
                countryInput.value = search.country;
                selectCategory(search.category);

                temporaryChats
                    .querySelectorAll(".sf-history-item")
                    .forEach(function (item) {
                        item.classList.remove("is-active");
                    });

                button.classList.add("is-active");

                if (search.coordinates) {
                    renderResults(search);
                    resultsSection.hidden = false;
                }
                else {
                    runDirectorySearch(search, false);
                }
            });

            temporaryChats.appendChild(button);
        });
    }

    function setSearchingState(searching) {
        if (!submitButton) {
            return;
        }

        submitButton.disabled = searching;
        submitButton.setAttribute(
            "aria-busy",
            searching ? "true" : "false"
        );

        submitButton.innerHTML = searching
            ? 'Searching nearby services <span aria-hidden="true">...</span>'
            : 'Find relevant support <span aria-hidden="true">&rarr;</span>';
    }

    function formatDistance(distance) {
        if (distance < 1) {
            return Math.round(distance * 1000) + " m away";
        }

        return distance.toFixed(distance < 10 ? 1 : 0) + " km away";
    }

    function delay(milliseconds) {
        return new Promise(function (resolve) {
            window.setTimeout(resolve, milliseconds);
        });
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

    function escapeAttribute(value) {
        return escapeHtml(value);
    }
});
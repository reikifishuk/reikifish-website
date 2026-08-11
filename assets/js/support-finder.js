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
    let activeSearch = null;
    let lastNominatimRequest = 0;

    const NOMINATIM_ENDPOINT =
        "https://nominatim.openstreetmap.org/search";

    /* RF_WORKER_AI_SUPPORT_BACKEND_V2 */
    const SUPPORT_API_ENDPOINT = (
        document
            .querySelector('meta[name="reikifish-support-api"]')
            ?.getAttribute("content") || ""
    ).replace(/\/$/, "");

    /* Legacy constants are retained only for compatibility with older
       helper code. No private API key is stored in this public file. */
    const GEOAPIFY_PLACES_ENDPOINT = "";
    const GEOAPIFY_API_KEY = "";
    const OVERPASS_ENDPOINT =
        "https://maps.mail.ru/osm/tools/overpass/api/interpreter";

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
        activeSearch = null;

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

        if (!Array.isArray(search.turns)) {
            search.turns = [];
        }

        const lastTurn = search.turns[search.turns.length - 1];

        if (
            !lastTurn ||
            lastTurn.role !== "user" ||
            lastTurn.content !== search.prompt
        ) {
            search.turns.push({ role: "user", content: search.prompt });
        }

        try {
            if (!SUPPORT_API_ENDPOINT) {
                throw new Error(
                    "The secure Support Assistant connection has not been configured yet."
                );
            }

            const response = await fetchWithTimeout(
                SUPPORT_API_ENDPOINT + "/support",
                20000,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json"
                    },
                    body: JSON.stringify({
                        prompt: search.prompt,
                        location: search.location,
                        country: search.country,
                        selectedCategory: search.category,
                        conversation: search.turns.slice(-8).map(function (turn) {
                            return {
                                role: turn.role,
                                content: turn.role === "assistant" && turn.followUpQuestion
                                    ? turn.content + " Follow-up question: " + turn.followUpQuestion
                                    : turn.content
                            };
                        })
                    })
                }
            );

            const payload = await response.json().catch(function () {
                return {};
            });

            if (!response.ok) {
                throw new Error(
                    payload.error ||
                    "The secure Support Assistant could not complete this search."
                );
            }

            search.category = payload.analysis?.category || search.category;
            search.categoryName =
                categoryLabels[search.category] || "General support";
            search.coordinates = payload.location;
            search.results = Array.isArray(payload.nearby)
                ? payload.nearby
                : [];
            search.verifiedRoutes = Array.isArray(payload.sources)
                ? payload.sources
                : [];
            search.assistantMessage = payload.answer || "";
            search.guidance = payload.guidance || null;
            search.sourceCheckedAt = payload.checkedAt || "";

            search.turns.push({
                role: "assistant",
                headline: search.guidance?.headline || "A clearer next step",
                content:
                    search.guidance?.response ||
                    search.assistantMessage ||
                    "I found the most relevant verified routes available.",
                nextSteps: Array.isArray(search.guidance?.nextSteps)
                    ? search.guidance.nextSteps
                    : [],
                followUpQuestion: search.guidance?.followUpQuestion || ""
            });

            activeSearch = search;

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

    /* RF_COUNTRY_AWARE_LOCATION_RESOLVER */
    async function geocodeLocation(location, country) {
        const cleanLocation = String(location || "").trim();
        const cleanCountry = String(country || "").trim();
        const cacheKey =
            cleanLocation.toLowerCase() + "|" + cleanCountry.toLowerCase();

        if (locationCache.has(cacheKey)) {
            return locationCache.get(cacheKey);
        }

        let coordinates = null;

        /*
         * UK postcodes and outward codes use Postcodes.io first.
         * This prevents outward codes such as G1 being mistaken for
         * unrelated addresses elsewhere in the United Kingdom.
         */
        if (
            cleanCountry === "United Kingdom" &&
            looksLikeUkPostcode(cleanLocation)
        ) {
            coordinates = await geocodeUkPostcode(cleanLocation);
        }

        /*
         * Other recognised international postal codes use a dedicated
         * postcode lookup first. If it has no match, the search safely
         * falls back to the country-restricted global geocoder.
         */
        if (
            !coordinates &&
            cleanCountry !== "United Kingdom" &&
            looksLikeInternationalPostalCode(cleanLocation, cleanCountry)
        ) {
            coordinates = await geocodeInternationalPostcode(
                cleanLocation,
                cleanCountry
            );
        }

        if (!coordinates) {
            coordinates = await geocodeWithNominatim(
                cleanLocation,
                cleanCountry
            );
        }

        locationCache.set(cacheKey, coordinates);
        return coordinates;
    }

    function looksLikeUkPostcode(location) {
        const compact = location.toUpperCase().replace(/\s+/g, "");

        const fullPostcode =
            /^(GIR0AA|[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2})$/;

        const outwardCode =
            /^[A-Z]{1,2}\d[A-Z\d]?$/;

        return fullPostcode.test(compact) || outwardCode.test(compact);
    }

    function looksLikeInternationalPostalCode(location, country) {
        const value = location.trim().toUpperCase();

        const patterns = {
            "United States": /^\d{5}(?:-\d{4})?$/,
            Canada: /^[A-Z]\d[A-Z](?:\s?\d[A-Z]\d)?$/,
            Australia: /^\d{4}$/,
            "New Zealand": /^\d{4}$/,
            Ireland: /^[A-Z0-9]{3}(?:\s?[A-Z0-9]{4})?$/
        };

        return Boolean(patterns[country] && patterns[country].test(value));
    }

    async function geocodeUkPostcode(location) {
        const compact = location.toUpperCase().replace(/\s+/g, "");
        const isFullPostcode =
            /^(GIR0AA|[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2})$/.test(compact);

        const endpoint = isFullPostcode
            ? "https://api.postcodes.io/postcodes/" +
              encodeURIComponent(compact)
            : "https://api.postcodes.io/outcodes/" +
              encodeURIComponent(compact);

        try {
            const response = await fetchWithTimeout(endpoint, 7000);

            if (!response.ok) {
                return null;
            }

            const data = await response.json();
            const result = data && data.result;

            if (
                !result ||
                typeof result.latitude !== "number" ||
                typeof result.longitude !== "number"
            ) {
                return null;
            }

            const district = Array.isArray(result.admin_district)
                ? result.admin_district[0]
                : result.admin_district;

            const region =
                district ||
                result.region ||
                result.admin_county ||
                "";

            return {
                latitude: result.latitude,
                longitude: result.longitude,
                displayName: [
                    result.postcode || result.outcode || compact,
                    region,
                    result.country || "United Kingdom"
                ].filter(Boolean).join(", ")
            };
        }
        catch (error) {
            return null;
        }
    }

    async function geocodeInternationalPostcode(location, country) {
        const postalCountryCodes = {
            "United States": "us",
            Canada: "ca",
            Australia: "au",
            "New Zealand": "nz",
            Ireland: "ie"
        };

        const postalCountryCode = postalCountryCodes[country];

        if (!postalCountryCode) {
            return null;
        }

        const endpoint =
            "https://api.zippopotam.us/" +
            postalCountryCode +
            "/" +
            encodeURIComponent(location.trim());

        try {
            const response = await fetchWithTimeout(endpoint, 7000);

            if (!response.ok) {
                return null;
            }

            const data = await response.json();
            const place =
                data && Array.isArray(data.places)
                    ? data.places[0]
                    : null;

            if (!place) {
                return null;
            }

            const latitude = Number(place.latitude);
            const longitude = Number(place.longitude);

            if (
                !Number.isFinite(latitude) ||
                !Number.isFinite(longitude)
            ) {
                return null;
            }

            return {
                latitude: latitude,
                longitude: longitude,
                displayName: [
                    data["post code"] || location,
                    place["place name"],
                    place.state,
                    data.country || country
                ].filter(Boolean).join(", ")
            };
        }
        catch (error) {
            return null;
        }
    }

    async function geocodeWithNominatim(location, country) {
        /*
         * Nominatim permits no more than one request each second.
         * Searches occur only after the visitor submits the form.
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

        const response = await fetchWithTimeout(
            NOMINATIM_ENDPOINT + "?" + parameters.toString(),
            10000,
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
                "We could not recognise that location in the selected country. Try a full postcode, ZIP code, town or city."
            );
        }

        return {
            latitude: Number(data[0].lat),
            longitude: Number(data[0].lon),
            displayName: data[0].display_name || location
        };
    }

    async function fetchWithTimeout(url, timeoutMilliseconds, options) {
        const controller = new AbortController();
        const timeout = window.setTimeout(function () {
            controller.abort();
        }, timeoutMilliseconds);

        try {
            return await fetch(
                url,
                Object.assign({}, options || {}, {
                    signal: controller.signal
                })
            );
        }
        finally {
            window.clearTimeout(timeout);
        }
    }
    async function fetchDirectoryDataWithFallback(query) {
        const directoryEndpoints = [
            OVERPASS_ENDPOINT,
            "https://overpass-api.de/api/interpreter",
            "https://overpass.private.coffee/api/interpreter"
        ].filter(function (endpoint, index, endpoints) {
            return endpoints.indexOf(endpoint) === index;
        });

        const failures = [];

        for (const endpoint of directoryEndpoints) {
            const requestController = new AbortController();

            const requestTimeout = window.setTimeout(function () {
                requestController.abort();
            }, 8000);

            try {
                const response = await fetch(endpoint, {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/x-www-form-urlencoded;charset=UTF-8",
                        Accept: "application/json"
                    },
                    body: "data=" + encodeURIComponent(query),
                    signal: requestController.signal
                });

                if (!response.ok) {
                    failures.push(
                        endpoint + " returned status " + response.status
                    );
                    continue;
                }

                const data = await response.json();

                if (!data || !Array.isArray(data.elements)) {
                    failures.push(
                        endpoint + " returned an invalid directory response"
                    );
                    continue;
                }

                return data;
            }
            catch (error) {
                failures.push(
                    endpoint +
                    " failed: " +
                    (
                        error && error.name === "AbortError"
                            ? "timeout"
                            : "connection error"
                    )
                );
            }
            finally {
                window.clearTimeout(requestTimeout);
            }
        }

        console.warn(
            "All public directory services failed.",
            failures
        );

        throw new Error(
            "The free local directories are temporarily unavailable."
        );
    }
    /* RF_PROMPT_DRIVEN_GEOAPIFY_SEARCH */
    async function findNearbyPlaces(
        latitude,
        longitude,
        category,
        prompt
    ) {
        const radius = category === "urgent" ? 20000 : 15000;

        const categoryMap = {
            legal: [
                "office.lawyer",
                "office.notary",
                "office.government.public_service"
            ],
            "mental-health": [
                "healthcare.clinic_or_praxis.psychiatry",
                "service.social_facility"
            ],
            "domestic-abuse": [
                "service.social_facility",
                "service.social_facility.shelter",
                "office.charity",
                "office.non_profit"
            ],
            family: [
                "service.social_facility",
                "office.charity",
                "office.non_profit",
                "office.government.social_services"
            ],
            fathers: [
                "service.social_facility",
                "office.charity",
                "office.non_profit"
            ],
            mothers: [
                "service.social_facility",
                "service.social_facility.shelter",
                "office.charity",
                "office.non_profit"
            ],
            trauma: [
                "healthcare.clinic_or_praxis.psychiatry",
                "service.social_facility",
                "office.charity"
            ],
            urgent: [
                "healthcare.hospital",
                "service.police",
                "service.ambulance_station"
            ]
        };

        const requestedCategories =
            categoryMap[category] || categoryMap.family;

        const searchNames = getPromptSearchNames(
            category,
            prompt
        );

        const requests = searchNames.map(function (searchName) {
            return fetchGeoapifyPlaces(
                latitude,
                longitude,
                radius,
                requestedCategories,
                searchName
            );
        });

        const responses = await Promise.allSettled(requests);

        const features = [];

        responses.forEach(function (response) {
            if (
                response.status === "fulfilled" &&
                Array.isArray(response.value)
            ) {
                features.push(...response.value);
            }
        });

        /*
         * If every named request fails, make one broad request before
         * treating the directory as unavailable.
         */
        if (!features.length) {
            const broadFeatures = await fetchGeoapifyPlaces(
                latitude,
                longitude,
                radius,
                requestedCategories,
                ""
            );

            features.push(...broadFeatures);
        }

        const places = features
            .map(function (feature) {
                return normaliseGeoapifyPlace(
                    feature,
                    latitude,
                    longitude,
                    category,
                    prompt
                );
            })
            .filter(Boolean);

        const uniquePlaces = [];

        places.forEach(function (place) {
            const duplicate = uniquePlaces.some(function (existing) {
                return (
                    existing.id === place.id ||
                    (
                        existing.name.toLowerCase() ===
                            place.name.toLowerCase() &&
                        Math.abs(existing.latitude - place.latitude) < 0.0005 &&
                        Math.abs(existing.longitude - place.longitude) < 0.0005
                    )
                );
            });

            if (!duplicate) {
                uniquePlaces.push(place);
            }
        });

        return uniquePlaces
            .sort(function (first, second) {
                if (second.relevanceScore !== first.relevanceScore) {
                    return second.relevanceScore - first.relevanceScore;
                }

                return first.distance - second.distance;
            })
            .slice(0, 10);
    }

    function getPromptSearchNames(category, prompt) {
        const requestText = String(prompt || "").toLowerCase();

        const namesByCategory = {
            legal: [
                "solicitor",
                "lawyer",
                "family law"
            ],
            "mental-health": [
                "psychologist",
                "counsellor",
                "psychotherapy",
                "mental health"
            ],
            "domestic-abuse": [
                "domestic abuse",
                "victim support",
                "women's aid",
                "refuge"
            ],
            family: [
                "family support",
                "family centre",
                "family mediation"
            ],
            fathers: [
                "fathers support",
                "men's support",
                "family support"
            ],
            mothers: [
                "mothers support",
                "women's support",
                "family support"
            ],
            trauma: [
                "trauma therapy",
                "trauma counselling",
                "psychotherapy"
            ],
            urgent: [""]
        };

        let names = namesByCategory[category] || [""];

        if (
            category === "mental-health" &&
            /\b(child|children|young person|teenager|adolescent)\b/i.test(requestText)
        ) {
            names = [
                "child psychologist",
                "child counsellor",
                "children's therapy",
                "young people mental health"
            ];
        }

        if (
            category === "mental-health" &&
            /\b(adult|adults|myself|me)\b/i.test(requestText)
        ) {
            names = [
                "adult psychologist",
                "adult counsellor",
                "psychotherapy",
                "mental health"
            ];
        }

        return names.slice(0, 4);
    }

    async function fetchGeoapifyPlaces(
        latitude,
        longitude,
        radius,
        categories,
        searchName
    ) {
        const parameters = new URLSearchParams({
            categories: categories.join(","),
            filter:
                "circle:" +
                longitude +
                "," +
                latitude +
                "," +
                radius,
            bias:
                "proximity:" +
                longitude +
                "," +
                latitude,
            limit: "20",
            lang: "en",
            apiKey: GEOAPIFY_API_KEY
        });

        if (searchName) {
            parameters.set("name", searchName);
        }

        const response = await fetchWithTimeout(
            GEOAPIFY_PLACES_ENDPOINT + "?" + parameters.toString(),
            12000,
            {
                method: "GET",
                headers: {
                    Accept: "application/json"
                }
            }
        );

        if (!response.ok) {
            throw new Error(
                "Geoapify returned status " +
                response.status +
                "."
            );
        }

        const data = await response.json();

        if (!data || !Array.isArray(data.features)) {
            return [];
        }

        return data.features;
    }
    function normaliseGeoapifyPlace(
        feature,
        originLatitude,
        originLongitude,
        category,
        prompt
    ) {
        const properties = feature.properties || {};
        const raw =
            properties.datasource &&
            properties.datasource.raw
                ? properties.datasource.raw
                : {};

        const geometryCoordinates =
            feature.geometry &&
            Array.isArray(feature.geometry.coordinates)
                ? feature.geometry.coordinates
                : [];

        const latitude = Number(
            properties.lat ?? geometryCoordinates[1]
        );

        const longitude = Number(
            properties.lon ?? geometryCoordinates[0]
        );

        if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude)
        ) {
            return null;
        }

        const name =
            properties.name ||
            properties.address_line1 ||
            raw.name ||
            "";

        if (!name) {
            return null;
        }

        const categories = Array.isArray(properties.categories)
            ? properties.categories
            : [];

        const relevanceScore = calculateGeoapifyRelevance(
            name,
            categories,
            category,
            prompt
        );

        if (relevanceScore < 2) {
            return null;
        }

        const website =
            properties.website ||
            properties.contact?.website ||
            raw.website ||
            raw["contact:website"] ||
            "";

        const phone =
            properties.phone ||
            properties.contact?.phone ||
            raw.phone ||
            raw["contact:phone"] ||
            "";

        const distance =
            typeof properties.distance === "number"
                ? properties.distance / 1000
                : calculateDistance(
                    originLatitude,
                    originLongitude,
                    latitude,
                    longitude
                );

        return {
            id:
                properties.place_id ||
                name + "|" + latitude + "|" + longitude,
            type: "place",
            name: name,
            category: category,
            latitude: latitude,
            longitude: longitude,
            distance: distance,
            relevanceScore: relevanceScore,
            address:
                properties.formatted ||
                [
                    properties.address_line1,
                    properties.address_line2
                ].filter(Boolean).join(", ") ||
                "Address details not supplied",
            phone: phone,
            website: normaliseWebsite(website),
            openingHours:
                properties.opening_hours ||
                raw.opening_hours ||
                "",
            description:
                properties.description ||
                raw.description ||
                "",
            osmUrl:
                "https://www.openstreetmap.org/?mlat=" +
                encodeURIComponent(latitude) +
                "&mlon=" +
                encodeURIComponent(longitude) +
                "#map=16/" +
                encodeURIComponent(latitude) +
                "/" +
                encodeURIComponent(longitude)
        };
    }

    /* RF_PROMPT_RELEVANCE_REPAIR */
    function calculateGeoapifyRelevance(
        name,
        categories,
        category,
        prompt
    ) {
        /*
         * The organisation and its directory categories determine
         * relevance. Prompt words are never added to the organisation
         * text because that would make every result appear relevant.
         */
        const placeText = [
            name,
            categories.join(" ")
        ].join(" ").toLowerCase();

        const requestText = String(prompt || "").toLowerCase();

        const unwantedMentalHealthPlaces =
            /\b(care home|nursing home|retirement home|residential care|night shelter|nightshelter|physiotherapy|physiotherapist|physical therapy|occupational therapy|speech therapy|massage therapy)\b/i;

        const mentalHealthIdentity =
            /\b(mental health|psychologist|psychology|psychological|psychiatrist|psychiatry|psychotherapy|psychotherapist|counsellor|counselor|counselling|counseling|therapy|therapist|wellbeing|well-being|trauma centre|crisis centre)\b/i;

        const legalIdentity =
            /\b(solicitor|lawyer|legal|law firm|family law|notary|legal aid)\b/i;

        const domesticAbuseIdentity =
            /\b(domestic abuse|domestic violence|women'?s aid|men'?s aid|victim support|abuse support|refuge|safeguarding)\b/i;

        const familyIdentity =
            /\b(family support|parent support|child support|family centre|family service|mediation|relationship support)\b/i;

        const urgentIdentity =
            /\b(hospital|emergency department|police|ambulance|crisis centre)\b/i;

        const hasPsychiatryCategory = categories.some(function (item) {
            return item.includes("psychiatry");
        });

        const hasLawyerCategory = categories.some(function (item) {
            return item.includes("lawyer");
        });

        const hasHospitalCategory = categories.some(function (item) {
            return item.includes("hospital");
        });

        const hasPoliceCategory = categories.some(function (item) {
            return item.includes("police");
        });

        const hasAmbulanceCategory = categories.some(function (item) {
            return item.includes("ambulance");
        });

        let score = 0;

        if (category === "mental-health") {
            if (unwantedMentalHealthPlaces.test(placeText)) {
                return -100;
            }

            if (
                !hasPsychiatryCategory &&
                !mentalHealthIdentity.test(placeText)
            ) {
                return 0;
            }

            score = hasPsychiatryCategory ? 8 : 5;

            if (
                /\b(psychologist|psychology|psychological)\b/i.test(requestText) &&
                /\b(psychologist|psychology|psychological)\b/i.test(placeText)
            ) {
                score += 5;
            }

            if (
                /\b(counsellor|counselor|counselling|counseling)\b/i.test(requestText) &&
                /\b(counsellor|counselor|counselling|counseling)\b/i.test(placeText)
            ) {
                score += 5;
            }

            if (
                /\b(therapist|therapy|psychotherapy)\b/i.test(requestText) &&
                /\b(therapist|therapy|psychotherapy)\b/i.test(placeText)
            ) {
                score += 4;
            }

            return score;
        }

        if (category === "legal") {
            if (!hasLawyerCategory && !legalIdentity.test(placeText)) {
                return 0;
            }

            return hasLawyerCategory ? 8 : 5;
        }

        if (category === "domestic-abuse") {
            if (!domesticAbuseIdentity.test(placeText)) {
                return 0;
            }

            return 7;
        }

        if (
            category === "family" ||
            category === "fathers" ||
            category === "mothers"
        ) {
            if (
                !familyIdentity.test(placeText) &&
                !domesticAbuseIdentity.test(placeText)
            ) {
                return 0;
            }

            score = 5;

            if (
                category === "fathers" &&
                /\b(father|fathers|dad|dads|men|male parent)\b/i.test(placeText)
            ) {
                score += 5;
            }

            if (
                category === "mothers" &&
                /\b(mother|mothers|mum|mums|women|female parent)\b/i.test(placeText)
            ) {
                score += 5;
            }

            return score;
        }

        if (category === "trauma") {
            if (
                unwantedMentalHealthPlaces.test(placeText) ||
                (
                    !hasPsychiatryCategory &&
                    !mentalHealthIdentity.test(placeText) &&
                    !domesticAbuseIdentity.test(placeText)
                )
            ) {
                return 0;
            }

            return hasPsychiatryCategory ? 8 : 6;
        }

        if (category === "urgent") {
            if (
                !hasHospitalCategory &&
                !hasPoliceCategory &&
                !hasAmbulanceCategory &&
                !urgentIdentity.test(placeText)
            ) {
                return 0;
            }

            return 10;
        }

        return 0;
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
                <div class="sf-no-directory-results sf-no-directory-results-compact">
                    <h3>No suitable supplementary map listings found</h3>
                    <p>
                        This does not mean support is unavailable. Map coverage
                        varies, so use the verified services shown above.
                    </p>
                </div>
            `;

        resultsContent.innerHTML = `
            ${search.category === "urgent" ? renderUrgentWarning(search.country) : ""}

            ${renderConversation(search)}

            ${renderOfficialRoutes(search)}

            <div class="sf-results-summary sf-supplementary-summary">
                <div>
                    <span>SUPPLEMENTARY LOCAL DIRECTORY</span>
                    <h3>Nearby map listings</h3>
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
                    href="https://www.geoapify.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Powered by Geoapify
                </a>
            </div>
        `;

        bindConversationForm(search);
    }

    function renderConversation(search) {
        const turns = Array.isArray(search.turns) ? search.turns : [];

        const messages = turns.map(function (turn) {
            if (turn.role === "user") {
                return `
                    <div class="sf-chat-turn sf-chat-turn-user">
                        <span>You</span>
                        <p>${escapeHtml(turn.content)}</p>
                    </div>
                `;
            }

            const steps = Array.isArray(turn.nextSteps)
                ? turn.nextSteps
                : [];

            return `
                <div class="sf-chat-turn sf-chat-turn-assistant">
                    <span>REIKIFISH SUPPORT ASSISTANT</span>
                    <h3>${escapeHtml(turn.headline || "A clearer next step")}</h3>
                    <p>${escapeHtml(turn.content || "")}</p>
                    ${steps.length
                        ? `<ol class="sf-ai-next-steps">${steps.map(function (step) {
                            return `<li>${escapeHtml(step)}</li>`;
                        }).join("")}</ol>`
                        : ""
                    }
                    ${turn.followUpQuestion
                        ? `<div class="sf-ai-follow-up"><strong>To narrow this down:</strong> ${escapeHtml(turn.followUpQuestion)}</div>`
                        : ""
                    }
                </div>
            `;
        }).join("");

        return `
            <section class="sf-conversation" aria-label="Temporary support conversation">
                <div class="sf-conversation-heading">
                    <span>PRIVATE TEMPORARY CONVERSATION</span>
                    <p>Your messages are cleared when this page is refreshed or closed.</p>
                </div>
                <div class="sf-conversation-messages">${messages}</div>
                <form class="sf-follow-up-form" id="supportFollowUpForm">
                    <label for="supportFollowUp">Continue this conversation</label>
                    <div class="sf-follow-up-row">
                        <textarea id="supportFollowUp" rows="2" maxlength="700" placeholder="Answer the question above or explain what you need next..." required></textarea>
                        <button type="submit">Send <span aria-hidden="true">&rarr;</span></button>
                    </div>
                    <p>Do not include names, case numbers, medical records or other sensitive personal information.</p>
                </form>
            </section>
        `;
    }

    function bindConversationForm(search) {
        const followUpForm = document.getElementById("supportFollowUpForm");
        const followUpInput = document.getElementById("supportFollowUp");

        if (!followUpForm || !followUpInput) {
            return;
        }

        followUpForm.addEventListener("submit", async function (event) {
            event.preventDefault();
            const followUp = followUpInput.value.trim();

            if (!followUp) {
                followUpInput.focus();
                return;
            }

            followUpInput.disabled = true;
            followUpForm.querySelector("button").disabled = true;
            search.prompt = followUp;
            await runDirectorySearch(search, false);
        });
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
                        Nearby directory listing
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

    /* RF_VERIFIED_HYBRID_DIRECTORY */
    const verifiedDirectoryRoutes = {
        "United Kingdom": {
            "mental-health": [
                {
                    name: "BACP Therapist Directory",
                    description:
                        "Search for BACP registered counsellors and psychotherapists by location and area of support.",
                    url: "https://www.bacp.co.uk/search/Therapists"
                },
                {
                    name: "BPS Chartered Psychologist Directory",
                    description:
                        "Search the British Psychological Society directory for chartered psychologists.",
                    url: "https://portal.bps.org.uk/Psychologist-Search/Directory-of-Chartered-Psychologists"
                },
                {
                    name: "UKCP Find a Therapist",
                    description:
                        "Search for psychotherapists registered with the UK Council for Psychotherapy.",
                    url: "https://www.psychotherapy.org.uk/find-a-therapist/"
                }
            ],
            legal: [],
            "domestic-abuse": [
                {
                    name: "Women's Aid service directory",
                    description:
                        "Search for local domestic-abuse services across the United Kingdom.",
                    url: "https://www.womensaid.org.uk/womens-aid-directory/"
                },
                {
                    name: "Men's Advice Line",
                    description:
                        "Confidential support for male victims of domestic abuse.",
                    url: "https://mensadviceline.org.uk/"
                }
            ]
        },

        "United States": {
            "mental-health": [
                {
                    name: "APA Psychologist Locator",
                    description:
                        "Search for licensed American Psychological Association member psychologists.",
                    url: "https://locator.apa.org/"
                },
                {
                    name: "FindTreatment.gov",
                    description:
                        "Official confidential US directory for mental-health and substance-use treatment facilities.",
                    url: "https://findtreatment.gov/locator"
                }
            ],
            legal: [
                {
                    name: "USA.gov legal aid",
                    description:
                        "Official information about free and lower-cost legal help in the United States.",
                    url: "https://www.usa.gov/legal-aid"
                }
            ],
            urgent: [
                {
                    name: "988 Suicide & Crisis Lifeline",
                    description:
                        "Call, text or chat with the official US 988 crisis service.",
                    url: "https://988lifeline.org/"
                }
            ]
        },

        Canada: {
            "mental-health": [
                {
                    name: "Canadian Psychological Association",
                    description:
                        "Find provincial and territorial psychology organisations and professional resources.",
                    url: "https://cpa.ca/public/whatisapsychologist/PTassociations/"
                },
                {
                    name: "Government of Canada mental-health support",
                    description:
                        "Official national information and routes to mental-health help.",
                    url: "https://www.canada.ca/en/public-health/services/mental-health-services/mental-health-get-help.html"
                }
            ],
            legal: [
                {
                    name: "Department of Justice legal help",
                    description:
                        "Official Canadian information about legal assistance and justice services.",
                    url: "https://www.justice.gc.ca/eng/"
                }
            ],
            urgent: [
                {
                    name: "Canada 9-8-8",
                    description:
                        "Official suicide crisis helpline available by calling or texting 988.",
                    url: "https://988.ca/"
                }
            ]
        },

        Australia: {
            "mental-health": [
                {
                    name: "Australian Psychological Society",
                    description:
                        "Search the APS directory for psychologists by location and area of practice.",
                    url: "https://psychology.org.au/find-a-psychologist"
                },
                {
                    name: "AHPRA practitioner register",
                    description:
                        "Check whether an Australian health practitioner is registered.",
                    url: "https://www.ahpra.gov.au/Registration/Registers-of-Practitioners.aspx"
                },
                {
                    name: "Healthdirect service finder",
                    description:
                        "Official Australian directory for health and mental-health services.",
                    url: "https://www.healthdirect.gov.au/australian-health-services"
                }
            ],
            legal: [
                {
                    name: "Australian government legal aid",
                    description:
                        "Official information about legal aid services across Australian states and territories.",
                    url: "https://www.ag.gov.au/legal-system/legal-assistance-services"
                }
            ],
            urgent: [
                {
                    name: "Lifeline Australia",
                    description:
                        "National crisis support available by telephone, text and online chat.",
                    url: "https://www.lifeline.org.au/"
                }
            ]
        },

        "New Zealand": {
            "mental-health": [
                {
                    name: "New Zealand Psychologists Board register",
                    description:
                        "Search the public register of psychologists practising in New Zealand.",
                    url: "https://psychologistsboard.org.nz/public-register/"
                },
                {
                    name: "Healthpoint mental-health services",
                    description:
                        "Search New Zealand mental-health and addiction services.",
                    url: "https://www.healthpoint.co.nz/mental-health-addictions/"
                }
            ],
            legal: [
                {
                    name: "New Zealand Ministry of Justice legal help",
                    description:
                        "Official information about legal aid and finding legal assistance.",
                    url: "https://www.justice.govt.nz/courts/going-to-court/legal-aid/"
                }
            ],
            urgent: [
                {
                    name: "1737 Need to Talk?",
                    description:
                        "Free New Zealand mental-health support by calling or texting 1737.",
                    url: "https://1737.org.nz/"
                }
            ]
        },

        Ireland: {
            "mental-health": [
                {
                    name: "Psychological Society of Ireland",
                    description:
                        "Professional psychology information and routes for finding psychological support.",
                    url: "https://www.psychologicalsociety.ie/"
                },
                {
                    name: "IACP therapist directory",
                    description:
                        "Search for accredited counsellors and psychotherapists in Ireland.",
                    url: "https://iacp.ie/page/therapists"
                },
                {
                    name: "HSE mental-health services",
                    description:
                        "Official Irish health-service information and mental-health support routes.",
                    url: "https://www2.hse.ie/mental-health/services-support/"
                }
            ],
            legal: [
                {
                    name: "Legal Aid Board",
                    description:
                        "Official civil legal-aid and family-mediation information for Ireland.",
                    url: "https://www.legalaidboard.ie/"
                }
            ],
            urgent: [
                {
                    name: "HSE urgent mental-health help",
                    description:
                        "Official information about obtaining urgent mental-health assistance in Ireland.",
                    url: "https://www2.hse.ie/mental-health/services-support/urgent-help/"
                }
            ]
        }
    };

    function determineUkNation(search) {
        const locationText = [
            search.location,
            search.coordinates?.displayName || ""
        ].join(" ").toLowerCase();

        if (locationText.includes("scotland")) {
            return "Scotland";
        }

        if (locationText.includes("wales")) {
            return "Wales";
        }

        if (
            locationText.includes("northern ireland") ||
            locationText.includes("belfast")
        ) {
            return "Northern Ireland";
        }

        return "England";
    }

    function getUkNationRoutes(search) {
        const nation = determineUkNation(search);

        if (search.category === "mental-health") {
            const routes = {
                Scotland: {
                    name: "NHS Inform Scotland mental wellbeing",
                    description:
                        "Official NHS Scotland information and routes to mental-health support.",
                    url: "https://www.nhsinform.scot/healthy-living/mental-wellbeing/"
                },
                Wales: {
                    name: "NHS Wales mental-health services",
                    description:
                        "Official NHS Wales mental-health information and local support.",
                    url: "https://111.wales.nhs.uk/encyclopaedia/m/article/mentalhealth/"
                },
                "Northern Ireland": {
                    name: "HSC Northern Ireland mental health",
                    description:
                        "Official health and social-care information for mental-health support.",
                    url: "https://online.hscni.net/our-work/mental-health/"
                },
                England: {
                    name: "NHS Talking Therapies",
                    description:
                        "Find NHS talking-therapy services for anxiety and depression in England.",
                    url: "https://www.nhs.uk/service-search/mental-health/find-an-NHS-talking-therapies-service/"
                }
            };

            return [routes[nation]];
        }

        if (search.category === "legal") {
            const routes = {
                Scotland: {
                    name: "Law Society of Scotland solicitor finder",
                    description:
                        "Search for regulated Scottish solicitors by location and area of law.",
                    url: "https://www.lawscot.org.uk/find-a-solicitor/"
                },
                Wales: {
                    name: "Law Society Find a Solicitor",
                    description:
                        "Search for regulated solicitors in England and Wales.",
                    url: "https://solicitors.lawsociety.org.uk/"
                },
                "Northern Ireland": {
                    name: "Law Society of Northern Ireland",
                    description:
                        "Search for solicitors regulated in Northern Ireland.",
                    url: "https://www.lawsoc-ni.org/solicitors"
                },
                England: {
                    name: "Law Society Find a Solicitor",
                    description:
                        "Search for regulated solicitors in England and Wales.",
                    url: "https://solicitors.lawsociety.org.uk/"
                }
            };

            return [routes[nation]];
        }

        return [];
    }

    function renderOfficialRoutes(search) {
        let routes = [];

        if (
            Array.isArray(search.verifiedRoutes) &&
            search.verifiedRoutes.length
        ) {
            routes = search.verifiedRoutes;
        }
        else if (search.country === "United Kingdom") {
            routes = [
                ...(
                    verifiedDirectoryRoutes["United Kingdom"][
                        search.category
                    ] || []
                ),
                ...getUkNationRoutes(search)
            ];

            /*
             * Preserve useful existing UK routes for categories that
             * do not yet have a dedicated verified set.
             */
            if (!routes.length) {
                routes = ukOfficialRoutes[search.category] || [];
            }
        }
        else {
            routes =
                verifiedDirectoryRoutes[search.country]?.[
                    search.category
                ] || [];
        }

        const uniqueRoutes = routes.filter(function (route, index, list) {
            return (
                route &&
                route.url &&
                list.findIndex(function (candidate) {
                    return candidate.url === route.url;
                }) === index
            );
        });

        if (!uniqueRoutes.length) {
            return `
                <section class="sf-official-routes">
                    <p class="sf-results-eyebrow">VERIFIED NEXT STEPS</p>
                    <h3>Check regulated services in your country</h3>
                    <p>
                        Use your national government, healthcare service or
                        regulated professional register to confirm suitable
                        support, qualifications and availability.
                    </p>
                </section>
            `;
        }

        return `
            <section class="sf-official-routes">
                <p class="sf-results-eyebrow">
                    VERIFIED PROFESSIONAL DIRECTORIES
                </p>

                <h3>Continue with trusted and regulated sources</h3>

                <p>
                    These established services are the primary results. Nearby
                    map listings are supplementary and can be incomplete.
                </p>

                <div class="sf-route-grid">
                    ${uniqueRoutes.map(function (route) {
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
                    activeSearch = search;
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

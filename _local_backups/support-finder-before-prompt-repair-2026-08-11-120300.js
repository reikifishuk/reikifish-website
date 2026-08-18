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

    /* RF_GEOAPIFY_PLACES_DIRECTORY */
    const GEOAPIFY_PLACES_ENDPOINT =
        "https://api.geoapify.com/v2/places";

    const GEOAPIFY_API_KEY =
        "651d68aa123e458cb15ad1515016195c";
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

        const parameters = new URLSearchParams({
            categories: requestedCategories.join(","),
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
                "The global places service returned status " +
                response.status +
                "."
            );
        }

        const data = await response.json();

        if (!data || !Array.isArray(data.features)) {
            throw new Error(
                "The global places service returned an invalid response."
            );
        }

        return data.features
            .map(function (feature) {
                return normaliseGeoapifyPlace(
                    feature,
                    latitude,
                    longitude,
                    category,
                    prompt
                );
            })
            .filter(Boolean)
            .sort(function (first, second) {
                if (second.relevanceScore !== first.relevanceScore) {
                    return second.relevanceScore - first.relevanceScore;
                }

                return first.distance - second.distance;
            })
            .slice(0, 10);
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

        if (
            category === "mental-health" &&
            relevanceScore < 2
        ) {
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

    function calculateGeoapifyRelevance(
        name,
        categories,
        category,
        prompt
    ) {
        const text = [
            name,
            categories.join(" "),
            prompt || ""
        ].join(" ").toLowerCase();

        const terms = {
            legal: [
                "lawyer", "solicitor", "legal",
                "law firm", "family law", "notary"
            ],
            "mental-health": [
                "mental", "psych", "psychiatr",
                "counsell", "counsel", "therap",
                "wellbeing", "well-being", "trauma",
                "crisis", "support"
            ],
            "domestic-abuse": [
                "domestic", "abuse", "violence",
                "refuge", "shelter", "victim",
                "women", "men", "safeguard"
            ],
            family: [
                "family", "parent", "child",
                "relationship", "mediation", "support"
            ],
            fathers: [
                "father", "dad", "men",
                "parent", "family", "support"
            ],
            mothers: [
                "mother", "mum", "women",
                "parent", "family", "support"
            ],
            trauma: [
                "trauma", "abuse", "mental",
                "psych", "counsell", "therap", "support"
            ],
            urgent: [
                "hospital", "emergency",
                "police", "ambulance", "crisis"
            ]
        };

        let score = 1;

        (terms[category] || []).forEach(function (term) {
            if (text.includes(term)) {
                score += 1;
            }
        });

        if (
            category === "mental-health" &&
            categories.some(function (item) {
                return item.includes("psychiatry");
            })
        ) {
            score += 5;
        }

        if (
            category === "legal" &&
            categories.some(function (item) {
                return item.includes("lawyer");
            })
        ) {
            score += 5;
        }

        if (
            category === "urgent" &&
            categories.some(function (item) {
                return (
                    item.includes("hospital") ||
                    item.includes("police") ||
                    item.includes("ambulance")
                );
            })
        ) {
            score += 5;
        }

        return score;
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
(function () {
    "use strict";

    var panelNames = {
        "about": "about",
        "books": "books",
        "coaching": "coaching",
        "knowledge hub": "knowledge",
        "blog": "blog"
    };

    var currentTrigger = null;
    var closeAt = 0;

    function text(node) {
        return String(node && node.textContent || "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
    }

    function menu() {
        return document.getElementById("rf-premium-menu") ||
            document.getElementById("rf-mega-menu") ||
            document.querySelector(".rf-premium-menu");
    }

    function backdrop() {
        return document.getElementById("rf-premium-backdrop") ||
            document.getElementById("rf-mega-backdrop") ||
            document.querySelector(".rf-premium-backdrop");
    }

    function triggers() {
        return Array.prototype.slice.call(
            document.querySelectorAll("header a, nav a")
        ).filter(function (link) {
            return Boolean(panelNames[text(link)]);
        });
    }

    function setTop() {
        var header = document.querySelector("header");
        var nav = document.querySelector("nav");
        var anchor = header || nav;

        if (!anchor) {
            return;
        }

        document.documentElement.style.setProperty(
            "--rf-menu-top",
            Math.max(
                60,
                Math.round(anchor.getBoundingClientRect().bottom) - 1
            ) + "px"
        );
    }

    function open(trigger) {
        var premiumMenu = menu();
        var shade = backdrop();
        var selectedPanel = panelNames[text(trigger)];

        if (!premiumMenu || !selectedPanel) {
            return;
        }

        currentTrigger = trigger;
        closeAt = 0;
        setTop();

        triggers().forEach(function (link) {
            link.classList.add("rf-premium-trigger");
            link.setAttribute(
                "aria-expanded",
                link === trigger ? "true" : "false"
            );
        });

        premiumMenu.querySelectorAll(".rf-pm-panel").forEach(
            function (panel) {
                var active =
                    panel.getAttribute("data-panel") === selectedPanel;

                panel.classList.toggle("is-active", active);
                panel.setAttribute(
                    "aria-hidden",
                    active ? "false" : "true"
                );
            }
        );

        premiumMenu.classList.add("is-open");
        premiumMenu.setAttribute("aria-hidden", "false");

        if (shade) {
            shade.classList.add("is-open");
            shade.setAttribute("aria-hidden", "false");
        }
    }

    function close() {
        var premiumMenu = menu();
        var shade = backdrop();

        if (premiumMenu) {
            premiumMenu.classList.remove("is-open");
            premiumMenu.setAttribute("aria-hidden", "true");
        }

        if (shade) {
            shade.classList.remove("is-open");
            shade.setAttribute("aria-hidden", "true");
        }

        triggers().forEach(function (link) {
            link.setAttribute("aria-expanded", "false");
        });

        currentTrigger = null;
        closeAt = 0;
    }

    function hoveredTrigger() {
        var links = triggers();

        for (var index = 0; index < links.length; index += 1) {
            if (links[index].matches(":hover")) {
                return links[index];
            }
        }

        return null;
    }

    function monitor() {
        var hovered = hoveredTrigger();
        var premiumMenu = menu();
        var menuHovered =
            premiumMenu && premiumMenu.matches(":hover");

        if (hovered) {
            if (hovered !== currentTrigger) {
                open(hovered);
            }

            closeAt = 0;
        }
        else if (menuHovered) {
            closeAt = 0;
        }
        else if (currentTrigger) {
            if (!closeAt) {
                closeAt = Date.now() + 500;
            }
            else if (Date.now() >= closeAt) {
                close();
            }
        }

        window.requestAnimationFrame(monitor);
    }

    function initialise() {
        if (!document.body.classList.contains("home-page")) {
            return;
        }

        var attempts = 0;

        function waitForGeneratedMenu() {
            attempts += 1;

            if (menu() && triggers().length) {
                triggers().forEach(function (link) {
                    link.classList.add("rf-premium-trigger");
                    link.removeAttribute("data-bs-toggle");
                    link.classList.remove("dropdown-toggle");
                });

                window.requestAnimationFrame(monitor);
                return;
            }

            if (attempts < 100) {
                window.setTimeout(waitForGeneratedMenu, 50);
            }
        }

        waitForGeneratedMenu();

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                close();
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialise);
    }
    else {
        initialise();
    }
})();
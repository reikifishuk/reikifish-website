(function () {
    "use strict";

    var panelMap = {
        "about": "about",
        "books": "books",
        "coaching": "coaching",
        "knowledge hub": "knowledge",
        "blog": "blog"
    };

    var closeTimer = 0;
    var activeTrigger = null;

    function normalise(value) {
        return String(value || "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
    }

    function isDesktop() {
        return window.matchMedia("(min-width: 768px)").matches;
    }

    function findTrigger(target) {
        if (!target || !target.closest) {
            return null;
        }

        var link = target.closest("header a, nav a");

        if (!link || !panelMap[normalise(link.textContent)]) {
            return null;
        }

        return link;
    }

    function getMenu() {
        return document.getElementById("rf-premium-menu") ||
            document.getElementById("rf-mega-menu") ||
            document.querySelector(".rf-premium-menu");
    }

    function getBackdrop() {
        return document.getElementById("rf-premium-backdrop") ||
            document.getElementById("rf-mega-backdrop") ||
            document.querySelector(".rf-premium-backdrop");
    }

    function setMenuTop() {
        var anchor = document.querySelector("header") ||
            document.querySelector("nav");

        if (!anchor) {
            return;
        }

        var bottom = Math.max(
            60,
            Math.round(anchor.getBoundingClientRect().bottom) - 1
        );

        document.documentElement.style.setProperty(
            "--rf-menu-top",
            bottom + "px"
        );
    }

    function openMenu(trigger) {
        if (!isDesktop() || !trigger) {
            return;
        }

        window.clearTimeout(closeTimer);
        activeTrigger = trigger;

        var menu = getMenu();
        var backdrop = getBackdrop();
        var panelName = panelMap[normalise(trigger.textContent)];

        if (!menu || !panelName) {
            return;
        }

        setMenuTop();

        menu.querySelectorAll(".rf-pm-panel").forEach(function (panel) {
            var active = panel.getAttribute("data-panel") === panelName;

            panel.classList.toggle("is-active", active);
            panel.setAttribute(
                "aria-hidden",
                active ? "false" : "true"
            );
        });

        document.querySelectorAll(".rf-premium-trigger").forEach(
            function (link) {
                link.setAttribute(
                    "aria-expanded",
                    link === trigger ? "true" : "false"
                );
            }
        );

        menu.classList.add("is-open");
        menu.setAttribute("aria-hidden", "false");

        if (backdrop) {
            backdrop.classList.add("is-open");
            backdrop.setAttribute("aria-hidden", "false");
        }
    }

    function closeMenu() {
        var menu = getMenu();
        var backdrop = getBackdrop();

        if (menu) {
            menu.classList.remove("is-open");
            menu.setAttribute("aria-hidden", "true");
        }

        if (backdrop) {
            backdrop.classList.remove("is-open");
            backdrop.setAttribute("aria-hidden", "true");
        }

        document.querySelectorAll(".rf-premium-trigger").forEach(
            function (link) {
                link.setAttribute("aria-expanded", "false");
            }
        );

        activeTrigger = null;
    }

    function scheduleClose() {
        window.clearTimeout(closeTimer);

        closeTimer = window.setTimeout(function () {
            var menu = getMenu();

            if (menu && menu.matches(":hover")) {
                return;
            }

            if (activeTrigger && activeTrigger.matches(":hover")) {
                return;
            }

            closeMenu();
        }, 500);
    }

    function installBridge() {
        if (!document.body.classList.contains("home-page")) {
            return;
        }

        document.addEventListener(
            "mouseover",
            function (event) {
                var trigger = findTrigger(event.target);

                if (trigger) {
                    openMenu(trigger);
                    return;
                }

                var menu = getMenu();

                if (menu && menu.contains(event.target)) {
                    window.clearTimeout(closeTimer);
                }
            },
            true
        );

        document.addEventListener(
            "mouseout",
            function (event) {
                var trigger = findTrigger(event.target);
                var menu = getMenu();

                if (
                    trigger &&
                    (!event.relatedTarget ||
                        !trigger.contains(event.relatedTarget))
                ) {
                    scheduleClose();
                    return;
                }

                if (
                    menu &&
                    menu.contains(event.target) &&
                    (!event.relatedTarget ||
                        !menu.contains(event.relatedTarget))
                ) {
                    scheduleClose();
                }
            },
            true
        );

        document.addEventListener(
            "focusin",
            function (event) {
                var trigger = findTrigger(event.target);

                if (trigger) {
                    openMenu(trigger);
                }
            },
            true
        );

        document.addEventListener(
            "keydown",
            function (event) {
                if (event.key === "Escape") {
                    closeMenu();
                }
            }
        );

        window.addEventListener("resize", function () {
            if (!isDesktop()) {
                closeMenu();
            }
            else {
                setMenuTop();
            }
        });

        window.rfHomepageMenuBridge = {
            open: openMenu,
            close: closeMenu
        };
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            installBridge
        );
    }
    else {
        installBridge();
    }
})();
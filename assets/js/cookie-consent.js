(function () {
    'use strict';

    var storageKey = 'reikifish_cookie_consent_v1';
    var banner = null;

    function getStoredConsent() {
        try {
            var savedValue = window.localStorage.getItem(storageKey);

            if (!savedValue) {
                return null;
            }

            return JSON.parse(savedValue);
        }
        catch (error) {
            return null;
        }
    }

    function updateGoogleConsent(choice) {
        window.dataLayer = window.dataLayer || [];

        window.gtag = window.gtag || function () {
            window.dataLayer.push(arguments);
        };

        var analyticsGranted = choice === 'all';

        window.gtag('consent', 'update', {
            ad_storage: analyticsGranted ? 'granted' : 'denied',
            ad_user_data: analyticsGranted ? 'granted' : 'denied',
            ad_personalization: analyticsGranted ? 'granted' : 'denied',
            analytics_storage: analyticsGranted ? 'granted' : 'denied',
            functionality_storage: 'granted',
            security_storage: 'granted'
        });
    }

    function saveConsent(choice) {
        var consentRecord = {
            choice: choice,
            savedAt: new Date().toISOString(),
            version: 1
        };

        try {
            window.localStorage.setItem(
                storageKey,
                JSON.stringify(consentRecord)
            );
        }
        catch (error) {
            document.cookie =
                storageKey +
                '=' +
                encodeURIComponent(choice) +
                '; Max-Age=31536000; Path=/; SameSite=Lax; Secure';
        }

        updateGoogleConsent(choice);
        hideBanner();
    }

    function hideBanner() {
        if (!banner) {
            return;
        }

        banner.classList.remove('is-visible');
        banner.setAttribute('aria-hidden', 'true');
    }

    function showBanner() {
        if (!banner) {
            return;
        }

        banner.classList.add('is-visible');
        banner.setAttribute('aria-hidden', 'false');
    }

    function addFooterSettingsLink() {
        var footer = document.querySelector('footer');

        if (!footer || footer.querySelector('.rf-cookie-settings-link')) {
            return;
        }

        var footerNavigation =
            footer.querySelector('nav') ||
            footer.querySelector('ul') ||
            footer;

        var settingsButton = document.createElement('button');

        settingsButton.type = 'button';
        settingsButton.className = 'rf-cookie-settings-link';
        settingsButton.textContent = 'Cookie settings';
        settingsButton.setAttribute(
            'aria-label',
            'Review or change cookie settings'
        );

        settingsButton.addEventListener('click', function () {
            showBanner();

            window.setTimeout(function () {
                var essentialButton =
                    banner.querySelector('[data-cookie-choice="essential"]');

                if (essentialButton) {
                    essentialButton.focus();
                }
            }, 50);
        });

        if (
            footerNavigation.tagName === 'UL' ||
            footerNavigation.tagName === 'OL'
        ) {
            var listItem = document.createElement('li');
            listItem.appendChild(settingsButton);
            footerNavigation.appendChild(listItem);
        }
        else {
            footerNavigation.appendChild(settingsButton);
        }
    }

    function createBanner() {
        banner = document.createElement('section');
        banner.className = 'rf-cookie-banner';
        banner.id = 'rf-cookie-banner';
        banner.setAttribute('aria-label', 'Cookie preferences');
        banner.setAttribute('aria-live', 'polite');
        banner.setAttribute('aria-hidden', 'true');

        banner.innerHTML =
            '<div class="rf-cookie-copy">' +
                '<span class="rf-cookie-mark" aria-hidden="true">' +
                    '<svg viewBox="0 0 24 24">' +
                        '<path d="M12 2a2.7 2.7 0 0 0 3.7 3.7A2.7 2.7 0 0 0 19.4 9 2.7 2.7 0 0 0 22 12.4 10 10 0 1 1 11.6 2H12Zm-4.1 8.1a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8Zm5.2 5.3a1.45 1.45 0 1 0 0 2.9 1.45 1.45 0 0 0 0-2.9Zm-1-7.6a1.15 1.15 0 1 0 0 2.3 1.15 1.15 0 0 0 0-2.3Z"/>' +
                    '</svg>' +
                '</span>' +
                '<div class="rf-cookie-text">' +
                    '<strong class="rf-cookie-title">Your privacy, your choice</strong>' +
                    '<p class="rf-cookie-description">' +
                        'Essential cookies keep the site and booking system working. ' +
                        'Optional analytics help improve ReikiFish. ' +
                        '<a href="/privacy-policy.html#cookies">Privacy and cookies</a>.' +
                    '</p>' +
                '</div>' +
            '</div>' +
            '<div class="rf-cookie-actions">' +
                '<button class="rf-cookie-button" type="button" data-cookie-choice="essential">' +
                    'Essential only' +
                '</button>' +
                '<button class="rf-cookie-button rf-cookie-button--accept" type="button" data-cookie-choice="all">' +
                    'Accept all' +
                '</button>' +
            '</div>';

        document.body.appendChild(banner);

        banner
            .querySelector('[data-cookie-choice="essential"]')
            .addEventListener('click', function () {
                saveConsent('essential');
            });

        banner
            .querySelector('[data-cookie-choice="all"]')
            .addEventListener('click', function () {
                saveConsent('all');
            });
    }

    function initialiseCookieConsent() {
        createBanner();
        addFooterSettingsLink();

        var storedConsent = getStoredConsent();

        if (storedConsent && storedConsent.choice) {
            updateGoogleConsent(storedConsent.choice);
            return;
        }

        showBanner();
    }

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            initialiseCookieConsent
        );
    }
    else {
        initialiseCookieConsent();
    }
})();
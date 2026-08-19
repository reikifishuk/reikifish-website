/* RF_FORCE_MENU_REPLACEMENT_V2 */
(function () {
  'use strict';
  var map = {
    'about': 'about',
    'books': 'books',
    'coaching': 'coaching',
    'knowledge hub': 'knowledge',
    'support finder': 'support',
    'blog': 'blog'
  };
  var timer = 0;
  var current = null;

  function desktop() { return window.innerWidth >= 768; }
  function label(node) {
    return String(node && node.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }
  function findTrigger(node) {
    if (!node || !node.closest) return null;
    var link = node.closest('header a, nav a');
    return link && map[label(link)] ? link : null;
  }
  function menu() { return document.getElementById('rf-premium-menu') || document.querySelector('.rf-premium-menu'); }
  function backdrop() { return document.getElementById('rf-premium-backdrop') || document.querySelector('.rf-premium-backdrop'); }
  function cancel() { window.clearTimeout(timer); }

  function stripLegacy() {
    document.querySelectorAll('.coaching-nav-submenu, header .dropdown-menu, nav .dropdown-menu').forEach(function (node) {
      node.remove();
    });
    document.querySelectorAll('header a, nav a').forEach(function (link) {
      if (!map[label(link)]) return;
      link.classList.remove('dropdown-toggle');
      link.removeAttribute('data-bs-toggle');
      link.removeAttribute('data-toggle');
      link.classList.add('rf-premium-trigger');
      link.setAttribute('aria-haspopup', 'true');
      link.setAttribute('aria-expanded', 'false');
    });
  }

  function open(link) {
    if (!desktop() || !link) return;
    cancel();
    current = link;
    stripLegacy();
    if (window.rfPremiumMenu && typeof window.rfPremiumMenu.open === 'function') {
      window.rfPremiumMenu.open(map[label(link)], link);
    }
  }

  function close() {
    cancel();
    current = null;
    if (window.rfPremiumMenu && typeof window.rfPremiumMenu.close === 'function') {
      window.rfPremiumMenu.close();
      return;
    }
    var panel = menu();
    var shade = backdrop();
    if (panel) { panel.classList.remove('is-open'); panel.setAttribute('aria-hidden', 'true'); }
    if (shade) { shade.classList.remove('is-open'); shade.setAttribute('aria-hidden', 'true'); }
  }

  function later() {
    cancel();
    timer = window.setTimeout(function () {
      var panel = menu();
      if (panel && panel.matches(':hover')) return;
      if (current && current.matches(':hover')) return;
      close();
    }, 420);
  }

  function normaliseNavigation() {
    var navigation = document.querySelector('header nav .navbar-nav');
    if (!navigation) return;

    // Compare by filename only so nested pages (../about.html) still match root-relative entries.
    var basename = function (href) {
      var clean = String(href || '').split('?')[0].split('#')[0];
      var parts = clean.split('/');
      return parts[parts.length - 1] || '';
    };

    var existingLinks = navigation.querySelectorAll('a');

    // Derive the current page's relative path prefix (e.g. "../") from the Home link.
    var prefix = '';
    Array.prototype.some.call(existingLinks, function (link) {
      var href = link.getAttribute('href') || '';
      if (basename(href) !== 'index.html') return false;
      prefix = href.slice(0, href.length - 'index.html'.length);
      return true;
    });

    var links = [
      ['Home', 'index.html'],
      ['About', 'about.html'],
      ['Books', 'books.html'],
      ['Coaching', 'coaching.html'],
      ['Knowledge Hub', 'knowledge.html'],
      ['Support Finder', 'support-finder.html'],
      ['Blog', 'blog.html'],
      ['Contact', 'contact.html']
    ];

    links.forEach(function (entry) {
      var exists = Array.prototype.some.call(existingLinks, function (link) {
        return basename(link.getAttribute('href')) === entry[1];
      });
      if (exists) return;

      var item = document.createElement('li');
      item.className = 'nav-item';
      item.innerHTML = '<a class="nav-link" href="' + prefix + entry[1] + '">' + entry[0] + '</a>';
      navigation.appendChild(item);
    });
  }

  function start() {
    document.querySelectorAll('header > nav, header .navbar').forEach(function (nav) {
      nav.classList.add('site-nav');
    });
    normaliseNavigation();
    stripLegacy();
    document.addEventListener('pointerover', function (event) {
      var trigger = findTrigger(event.target);
      if (trigger) open(trigger);
      var panel = menu();
      if (panel && panel.contains(event.target)) cancel();
    }, true);
    document.addEventListener('pointerout', function (event) {
      var trigger = findTrigger(event.target);
      var panel = menu();
      if (trigger) {
        if (!event.relatedTarget || !trigger.contains(event.relatedTarget)) later();
      } else if (panel && panel.contains(event.target)) {
        if (!event.relatedTarget || !panel.contains(event.relatedTarget)) later();
      }
    }, true);
    document.addEventListener('focusin', function (event) {
      var trigger = findTrigger(event.target);
      if (trigger) open(trigger);
    }, true);
    document.addEventListener('click', function (event) {
      if (event.target.closest('.rf-pm-close, #rf-premium-backdrop, .rf-premium-backdrop')) close();
    }, true);
    document.addEventListener('keydown', function (event) { if (event.key === 'Escape') close(); });
    window.addEventListener('resize', function () { if (!desktop()) close(); });
    window.rfForcePremiumMenu = { open: open, close: close, stripLegacy: stripLegacy };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
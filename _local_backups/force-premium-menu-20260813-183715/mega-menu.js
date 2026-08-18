/* RF_CLEAN_PREMIUM_MENU_START */
(function () {
  'use strict';

  var menuData = {
    about: {
      kicker: 'The ReikiFish story',
      title: 'Finding steadiness when life becomes uncertain',
      copy: 'Explore the experience, values and psychology-informed approach behind ReikiFish.',
      button: ['Discover our approach', '/about.html'],
      links: [
        ['About ReikiFish', '/about.html'],
        ['Books and writing', '/books.html'],
        ['Coaching and support', '/coaching.html'],
        ['Knowledge Hub', '/knowledge.html'],
        ['Contact ReikiFish', '/contact.html']
      ],
      feature: ['Our approach', 'Understanding without reducing a person to a label.', 'Read our story', '/about.html']
    },
    books: {
      kicker: 'Books and writing',
      title: 'Ideas for standing still within the chaos',
      copy: 'Reflective writing on regulation, identity, alienation, recovery and the space between reaction and response.',
      button: ['Explore the books', '/books.html'],
      links: [
        ['Walking the Grey', '/books.html'],
        ['The Book of DARVO', '/books.html'],
        ['Latest articles', '/blog.html'],
        ['About the author', '/about.html'],
        ['Contact', '/contact.html']
      ],
      feature: ['Featured book', 'Walking the Grey: a journey through alienation, abuse and reclamation.', 'Explore the book', '/books.html']
    },
    coaching: {
      kicker: 'Structured support',
      title: 'A steadier route through difficult experiences',
      copy: 'Choose focused, non-judgemental support informed by lived experience, psychology and practical reflection.',
      button: ['Explore coaching', '/coaching.html'],
      links: [
        ['Trauma coaching', '/trauma-coaching.html'],
        ['Parental alienation support', '/parental-alienation-coaching.html'],
        ['Team leadership coaching', '/team-leadership-coaching.html'],
        ['AI Support Finder', '/support-finder.html'],
        ['Contact', '/contact.html']
      ],
      feature: ['AI-guided support', 'Describe what is happening and explore relevant services and professional directories.', 'Try the Support Finder', '/support-finder.html']
    },
    knowledge: {
      kicker: 'Evidence-led learning',
      title: 'Explore the Knowledge Hub',
      copy: 'Clear guides covering trauma, personality, emotional health, relationships and social psychology.',
      button: ['Open the Knowledge Hub', '/knowledge.html'],
      links: [
        ['Trauma', '/knowledge-search.html?category=Trauma'],
        ['Emotional Health', '/knowledge-search.html?category=Emotional%20Health'],
        ['Personality', '/knowledge-search.html?category=Personality'],
        ['Manipulation', '/knowledge-search.html?category=Manipulation'],
        ['AI Support Finder', '/support-finder.html']
      ],
      feature: ['Complete guides', 'Substantial explanations, useful context and clear routes to related knowledge.', 'Browse all guides', '/knowledge.html']
    },
    blog: {
      kicker: 'Latest perspectives',
      title: 'Writing on psychology, recovery and the Grey',
      copy: 'Long-form reflections connecting lived experience with practical ways to respond with greater steadiness.',
      button: ['Visit the blog', '/blog.html'],
      links: [
        ['Latest articles', '/blog.html'],
        ['Psychology', '/blog.html?category=Psychology'],
        ['The Grey Method', '/articles/the-grey-method-staying-regulated-under-provocation.html'],
        ['Knowledge Hub', '/knowledge.html'],
        ['Contact', '/contact.html']
      ],
      feature: ['Featured article', 'The Grey Method: staying regulated when someone wants a reaction.', 'Read the article', '/articles/the-grey-method-staying-regulated-under-provocation.html']
    }
  };

  var labels = {
    'about': 'about',
    'books': 'books',
    'coaching': 'coaching',
    'knowledge hub': 'knowledge',
    'blog': 'blog'
  };

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character];
    });
  }

  function buildPanel(name, item) {
    var links = item.links.map(function (entry) {
      return '<li><a href="' + escapeHtml(entry[1]) + '"><span>' + escapeHtml(entry[0]) + '</span></a></li>';
    }).join('');

    return '<section class="rf-pm-panel" data-panel="' + name + '" aria-hidden="true">' +
      '<div class="rf-pm-column">' +
        '<p class="rf-pm-kicker">' + escapeHtml(item.kicker) + '</p>' +
        '<h2 class="rf-pm-title">' + escapeHtml(item.title) + '</h2>' +
        '<p class="rf-pm-copy">' + escapeHtml(item.copy) + '</p>' +
        '<a class="rf-pm-button" href="' + escapeHtml(item.button[1]) + '">' + escapeHtml(item.button[0]) + ' &rarr;</a>' +
      '</div>' +
      '<div class="rf-pm-column">' +
        '<p class="rf-pm-kicker">Explore</p>' +
        '<ol class="rf-pm-links">' + links + '</ol>' +
      '</div>' +
      '<div class="rf-pm-feature">' +
        '<div class="rf-pm-art" aria-hidden="true"><span class="rf-pm-orbit"></span><span class="rf-pm-diamond"></span></div>' +
        '<div class="rf-pm-feature-content">' +
          '<p class="rf-pm-kicker">' + escapeHtml(item.feature[0]) + '</p>' +
          '<h2 class="rf-pm-title">' + escapeHtml(item.feature[1]) + '</h2>' +
          '<a class="rf-pm-button" href="' + escapeHtml(item.feature[3]) + '">' + escapeHtml(item.feature[2]) + ' &rarr;</a>' +
        '</div>' +
      '</div>' +
    '</section>';
  }

  function initialise() {
    // Remove every older generated mega-menu container before creating one clean instance.
    document.querySelectorAll('#rf-mega-menu, #rf-mega-backdrop, .rf-premium-menu, .rf-premium-backdrop').forEach(function (element) {
      element.remove();
    });

    var backdrop = document.createElement('div');
    backdrop.id = 'rf-premium-backdrop';
    backdrop.className = 'rf-premium-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');

    var menu = document.createElement('div');
    menu.id = 'rf-premium-menu';
    menu.className = 'rf-premium-menu';
    menu.setAttribute('aria-hidden', 'true');
    menu.innerHTML = '<div class="rf-pm-shell">' +
      '<button class="rf-pm-close" type="button" aria-label="Close menu">&times;</button>' +
      Object.keys(menuData).map(function (name) { return buildPanel(name, menuData[name]); }).join('') +
    '</div>';

    document.body.appendChild(backdrop);
    document.body.appendChild(menu);

    var triggers = [];
    var closeTimer = 0;

    function desktop() {
      return window.innerWidth >= 992;
    }

    function normalise(value) {
      return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
    }

    function setTop() {
      var header = document.querySelector('header');
      var nav = document.querySelector('nav');
      var anchor = header || nav;
      if (!anchor) return;
      document.documentElement.style.setProperty('--rf-menu-top', Math.max(60, Math.round(anchor.getBoundingClientRect().bottom) - 1) + 'px');
    }

    function cancelClose() {
      window.clearTimeout(closeTimer);
    }

    function openMenu(name, activeTrigger) {
      if (!desktop()) return;
      cancelClose();
      setTop();

      menu.querySelectorAll('.rf-pm-panel').forEach(function (panel) {
        var active = panel.getAttribute('data-panel') === name;
        panel.classList.toggle('is-active', active);
        panel.setAttribute('aria-hidden', active ? 'false' : 'true');
      });

      triggers.forEach(function (trigger) {
        trigger.setAttribute('aria-expanded', trigger === activeTrigger ? 'true' : 'false');
      });

      menu.classList.add('is-open');
      menu.setAttribute('aria-hidden', 'false');
      backdrop.classList.add('is-open');
      backdrop.setAttribute('aria-hidden', 'false');
    }

    function closeMenu() {
      cancelClose();
      menu.classList.remove('is-open');
      menu.setAttribute('aria-hidden', 'true');
      backdrop.classList.remove('is-open');
      backdrop.setAttribute('aria-hidden', 'true');
      triggers.forEach(function (trigger) { trigger.setAttribute('aria-expanded', 'false'); });
    }

    function scheduleClose() {
      cancelClose();
      closeTimer = window.setTimeout(function () {
        if (menu.matches(':hover')) return;
        if (document.querySelector('.rf-premium-trigger:hover')) return;
        closeMenu();
      }, 500);
    }

    document.querySelectorAll('header a, nav a').forEach(function (link) {
      var name = labels[normalise(link.textContent)];
      if (!name) return;

      // Disable Bootstrap's desktop dropdown toggle while retaining the real destination.
      link.classList.remove('dropdown-toggle');
      link.removeAttribute('data-bs-toggle');
      link.removeAttribute('data-toggle');
      link.classList.add('rf-premium-trigger');
      link.setAttribute('data-rf-panel', name);
      link.setAttribute('aria-haspopup', 'true');
      link.setAttribute('aria-expanded', 'false');
      triggers.push(link);

      link.addEventListener('mouseenter', function () { openMenu(name, link); });
      link.addEventListener('pointerenter', function () { openMenu(name, link); });
      link.addEventListener('focus', function () { openMenu(name, link); });
      link.addEventListener('mouseleave', scheduleClose);
    });

    menu.addEventListener('mouseenter', cancelClose);
    menu.addEventListener('pointerenter', cancelClose);
    menu.addEventListener('mouseleave', scheduleClose);
    backdrop.addEventListener('click', closeMenu);
    menu.querySelector('.rf-pm-close').addEventListener('click', closeMenu);
    document.addEventListener('keydown', function (event) { if (event.key === 'Escape') closeMenu(); });
    window.addEventListener('resize', setTop);
    setTop();

    window.rfPremiumMenu = {
      triggerCount: triggers.length,
      panelCount: menu.querySelectorAll('.rf-pm-panel').length,
      mountedInBody: menu.parentElement === document.body,
      open: openMenu,
      close: closeMenu
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialise);
  } else {
    initialise();
  }
})();
/* RF_CLEAN_PREMIUM_MENU_END */
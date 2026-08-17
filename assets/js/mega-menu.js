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
        ['The Book of DARVO', '/articles/the-book-of-darvo.html'],
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
        ['Book Now', '/booking.html'],
        ['Trauma coaching', '/trauma-coaching.html'],
        ['Parental alienation support', '/parental-alienation-coaching.html'],
        ['Team leadership coaching', '/team-leadership-coaching.html'],
        ['Relationship coaching', '/relationship-coaching.html'],
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
        ['Updates', '/blog.html?category=Updates#blog-results'],
        ['Psychology', '/blog.html?category=Psychology#blog-results'],
        ['Reiki', '/blog.html?category=Reiki#blog-results'],
        ['Events', '/blog.html?category=Events#blog-results'],
        ['Coaching', '/blog.html?category=Coaching#blog-results'],
        [
          'Parental Alienation & DARVO',
          '/blog.html?category=Parental%20Alienation%20%26%20DARVO#blog-results'
        ],
        [
          'Social Science',
          '/blog.html?category=Social%20Science#blog-results'
        ]
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
      return window.innerWidth >= 768;
    }

    function normalise(value) {
      return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
    }

    function setTop() {
      var nav = document.querySelector('nav');
      var header = document.querySelector('header');
      var anchor = nav || header;
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

/* RF_MOBILE_MEGA_MENU_START */
(function () {
  'use strict';

  var menuData = {
    about: {
      kicker: 'The ReikiFish story',
      title: 'About',
      copy: 'The experience, values and psychology-informed approach behind the work.',
      overview: ['About overview', '/about.html'],
      links: [
        ['Approach and philosophy', '/about.html#approach'],
        ['Books and writing', '/books.html'],
        ['Knowledge Hub', '/knowledge.html'],
        ['Contact', '/contact.html']
      ]
    },

    books: {
      kicker: 'Books and writing',
      title: 'Books',
      copy: 'Ideas for standing still within the chaos.',
      overview: ['Books overview', '/books.html'],
      links: [
        ['Walking the Grey', '/books.html'],
        ['The Book of DARVO', '/articles/the-book-of-darvo.html'],
        ['Latest articles', '/blog.html'],
        ['About the author', '/about.html']
      ]
    },

    coaching: {
      kicker: 'Structured support',
      title: 'Coaching',
      copy: 'A steadier route through difficult experiences.',
      overview: ['Coaching overview', '/coaching.html'],
      links: [
        ['Book Now', '/booking.html'],
        ['Trauma Coaching', '/trauma-coaching.html'],
        ['Parental Alienation Support', '/parental-alienation-coaching.html'],
        ['Team Leadership Coaching', '/team-leadership-coaching.html'],
        ['Relationship Coaching', '/relationship-coaching.html'],
        ['AI Support Finder', '/support-finder.html'],
        ['Contact', '/contact.html']
      ],
      action: ['Discuss coaching', '/contact.html']
    },

    knowledge: {
      kicker: 'Evidence-led learning',
      title: 'Knowledge Hub',
      copy: 'Clear guides for understanding difficult experiences.',
      overview: ['Knowledge Hub overview', '/knowledge.html'],
      links: [
        ['Trauma', '/knowledge-search.html?category=Trauma'],
        ['Emotional Health', '/knowledge-search.html?category=Emotional%20Health'],
        ['Personality', '/knowledge-search.html?category=Personality'],
        ['Manipulation', '/knowledge-search.html?category=Manipulation'],
        ['AI Support Finder', '/support-finder.html']
      ]
    },

    blog: {
      kicker: 'Latest perspectives',
      title: 'Blog',
      copy: 'Long-form writing on psychology, recovery and the Grey.',
      overview: ['Blog overview', '/blog.html'],
      links: [
        ['Latest articles', '/blog.html'],
        ['Updates', '/blog.html?category=Updates#blog-results'],
        ['Psychology', '/blog.html?category=Psychology#blog-results'],
        ['Reiki', '/blog.html?category=Reiki#blog-results'],
        ['Events', '/blog.html?category=Events#blog-results'],
        ['Coaching', '/blog.html?category=Coaching#blog-results'],
        [
          'Parental Alienation & DARVO',
          '/blog.html?category=Parental%20Alienation%20%26%20DARVO#blog-results'
        ],
        [
          'Social Science',
          '/blog.html?category=Social%20Science#blog-results'
        ]
      ]
    }
  };

  var menuNames = {
    about: {
      title: 'About',
      copy: 'The story and approach'
    },
    books: {
      title: 'Books',
      copy: 'Walking the Grey and DARVO'
    },
    coaching: {
      title: 'Coaching',
      copy: 'Structured, practical support'
    },
    knowledge: {
      title: 'Knowledge Hub',
      copy: 'Evidence-led guides'
    },
    blog: {
      title: 'Blog',
      copy: 'Latest perspectives'
    }
  };

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[character];
    });
  }

  function buildArtwork(size) {
    return (
      '<div class="rf-mm-art rf-mm-art-' + size + '" aria-hidden="true">' +
        '<span class="rf-mm-orbit"></span>' +
        '<span class="rf-mm-diamond"></span>' +
      '</div>'
    );
  }

  function buildMainRow(name) {
    var item = menuNames[name];

    return (
      '<li>' +
        '<button class="rf-mm-main-row" type="button" data-mobile-section="' +
          escapeHtml(name) +
        '">' +
          '<span class="rf-mm-row-copy">' +
            '<strong>' + escapeHtml(item.title) + '</strong>' +
            '<small>' + escapeHtml(item.copy) + '</small>' +
          '</span>' +
          '<span class="rf-mm-arrow" aria-hidden="true">&rsaquo;</span>' +
        '</button>' +
      '</li>'
    );
  }

  function buildLink(entry, className) {
    return (
      '<li>' +
        '<a class="rf-mm-sub-link ' + (className || '') + '" href="' +
          escapeHtml(entry[1]) +
        '">' +
          '<span>' + escapeHtml(entry[0]) + '</span>' +
          '<span class="rf-mm-arrow" aria-hidden="true">&rarr;</span>' +
        '</a>' +
      '</li>'
    );
  }

  function buildMenu() {
    var existing = document.getElementById('rf-mobile-mega-menu');

    if (existing) {
      existing.remove();
    }

    var menu = document.createElement('div');
    menu.id = 'rf-mobile-mega-menu';
    menu.className = 'rf-mobile-mega-menu';
    menu.setAttribute('aria-hidden', 'true');

    menu.innerHTML =
      '<div class="rf-mm-backdrop" data-mobile-close></div>' +
      '<section class="rf-mm-drawer" role="dialog" aria-modal="true" ' +
        'aria-label="Website navigation">' +

        '<div class="rf-mm-header">' +
          '<a class="rf-mm-brand" href="/index.html">' +
            '<span class="rf-mm-brand-mark">AF</span>' +
            '<span class="rf-mm-brand-copy">' +
              '<strong>Andy Fish</strong>' +
              '<small>Author &amp; Transformational Coach</small>' +
            '</span>' +
          '</a>' +

          '<button class="rf-mm-close" type="button" ' +
            'aria-label="Close menu" data-mobile-close>' +
            '&times;' +
          '</button>' +
        '</div>' +

        '<div class="rf-mm-screen rf-mm-main-screen" data-mobile-main>' +
          '<div class="rf-mm-intro">' +
            '<p class="rf-mm-kicker">Explore ReikiFish</p>' +
            '<h2>Where would you like to go?</h2>' +
            '<p>Writing, practical support and psychology-informed knowledge.</p>' +
          '</div>' +

          '<ul class="rf-mm-main-list">' +
            '<li>' +
              '<a class="rf-mm-main-row rf-mm-direct-row" href="/index.html">' +
                '<span class="rf-mm-row-copy"><strong>Home</strong></span>' +
              '</a>' +
            '</li>' +

            Object.keys(menuNames).map(buildMainRow).join('') +

            '<li>' +
              '<a class="rf-mm-main-row rf-mm-direct-row" href="/contact.html">' +
                '<span class="rf-mm-row-copy"><strong>Contact</strong></span>' +
              '</a>' +
            '</li>' +
          '</ul>' +

          '<a class="rf-mm-feature" href="/books.html">' +
            buildArtwork('small') +
            '<span class="rf-mm-feature-copy">' +
              '<small>Featured book</small>' +
              '<strong>Walking the Grey</strong>' +
              '<span>Stand still within the chaos.</span>' +
            '</span>' +
            '<span class="rf-mm-arrow" aria-hidden="true">&rarr;</span>' +
          '</a>' +
        '</div>' +

        '<div class="rf-mm-screen rf-mm-section-screen" ' +
          'data-mobile-submenu hidden>' +
        '</div>' +
      '</section>';

    document.body.appendChild(menu);

    return menu;
  }

  function initialiseMobileMenu() {
    var menu = buildMenu();
    var drawer = menu.querySelector('.rf-mm-drawer');
    var mainScreen = menu.querySelector('[data-mobile-main]');
    var sectionScreen = menu.querySelector('[data-mobile-submenu]');
    var closeButton = menu.querySelector('.rf-mm-close');
    var lastTrigger = null;

    function mobile() {
      return window.matchMedia('(max-width: 767.98px)').matches;
    }

    function openMenu(trigger) {
      if (!mobile()) return;

      lastTrigger = trigger || null;

      mainScreen.hidden = false;
      sectionScreen.hidden = true;
      sectionScreen.innerHTML = '';

      menu.classList.add('is-open');
      menu.setAttribute('aria-hidden', 'false');
      document.body.classList.add('rf-mobile-menu-open');

      window.requestAnimationFrame(function () {
        closeButton.focus();
      });
    }

    function closeMenu() {
      menu.classList.remove('is-open');
      menu.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('rf-mobile-menu-open');

      if (lastTrigger && typeof lastTrigger.focus === 'function') {
        lastTrigger.focus();
      }
    }

    function renderSection(name) {
      var item = menuData[name];

      if (!item) return;

      var links = buildLink(
        item.overview,
        'rf-mm-overview-link'
      );

      links += item.links.map(function (entry) {
        return buildLink(entry, '');
      }).join('');

      var action = '';

      if (item.action) {
        action =
          '<a class="rf-mm-action" href="' +
            escapeHtml(item.action[1]) +
          '">' +
            '<strong>' + escapeHtml(item.action[0]) + '</strong>' +
            '<span aria-hidden="true">&rarr;</span>' +
          '</a>';
      }

      sectionScreen.innerHTML =
        '<button class="rf-mm-back" type="button" data-mobile-back>' +
          '<span aria-hidden="true">&larr;</span> Back to main menu' +
        '</button>' +

        buildArtwork('large') +

        '<div class="rf-mm-section-intro">' +
          '<p class="rf-mm-kicker">' + escapeHtml(item.kicker) + '</p>' +
          '<h2>' + escapeHtml(item.title) + '</h2>' +
          '<p>' + escapeHtml(item.copy) + '</p>' +
        '</div>' +

        '<ul class="rf-mm-sub-list">' +
          links +
        '</ul>' +

        action;

      mainScreen.hidden = true;
      sectionScreen.hidden = false;
      drawer.scrollTop = 0;

      sectionScreen
        .querySelector('[data-mobile-back]')
        .focus();
    }

    document.addEventListener('click', function (event) {
      var toggler = event.target.closest(
        '.navbar-toggler, ' +
        'button[data-bs-toggle="collapse"], ' +
        'button[data-toggle="collapse"]'
      );

      if (!toggler || !mobile()) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      if (menu.classList.contains('is-open')) {
        closeMenu();
      }
      else {
        openMenu(toggler);
      }
    }, true);

    menu.addEventListener('click', function (event) {
      var closeControl = event.target.closest('[data-mobile-close]');

      if (closeControl) {
        event.preventDefault();
        closeMenu();
        return;
      }

      var sectionControl = event.target.closest('[data-mobile-section]');

      if (sectionControl) {
        event.preventDefault();
        renderSection(
          sectionControl.getAttribute('data-mobile-section')
        );
        return;
      }

      var backControl = event.target.closest('[data-mobile-back]');

      if (backControl) {
        event.preventDefault();

        sectionScreen.hidden = true;
        mainScreen.hidden = false;
        drawer.scrollTop = 0;

        var sectionName = sectionControl
          ? sectionControl.getAttribute('data-mobile-section')
          : null;

        var target = sectionName
          ? mainScreen.querySelector(
              '[data-mobile-section="' + sectionName + '"]'
            )
          : mainScreen.querySelector('[data-mobile-section]');

        if (target) {
          target.focus();
        }
      }
    });

    document.addEventListener('keydown', function (event) {
      if (
        event.key === 'Escape' &&
        menu.classList.contains('is-open')
      ) {
        closeMenu();
      }
    });

    window.addEventListener('resize', function () {
      if (!mobile()) {
        closeMenu();
      }
    });

    window.rfMobileMegaMenu = {
      open: openMenu,
      close: closeMenu,
      show: renderSection
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      initialiseMobileMenu
    );
  }
  else {
    initialiseMobileMenu();
  }
})();
/* RF_MOBILE_MEGA_MENU_END */

/* RF_MEGA_MENU_SCRIPT_START */
(function () {
  'use strict';
  var root = document.getElementById('rf-mega-menu');
  if (!root) return;
  var backdrop = document.getElementById('rf-mega-backdrop');
  var closeButton = root.querySelector('.rf-mm-close');
  var panels = Array.prototype.slice.call(root.querySelectorAll('.rf-mm-panel'));
  var closeTimer = 0;
  var lastPanel = '';
  var labels = {
    'about': 'about',
    'books': 'books',
    'coaching': 'coaching',
    'knowledge hub': 'knowledge',
    'blog': 'blog'
  };
  function isMobile() { return window.matchMedia('(max-width: 991.98px)').matches; }
  function linkLabel(link) { return (link.textContent || '').trim().toLowerCase().replace(/\s+/g, ' '); }
  function menuLink(target) {
    var link = target && target.closest ? target.closest('nav a, header a') : null;
    return link && labels[linkLabel(link)] ? link : null;
  }
  function setTop() {
    var link = document.querySelector('nav a, header a');
    var nav = link && (link.closest('nav') || link.closest('header'));
    if (!nav) return;
    var bottom = Math.round(nav.getBoundingClientRect().bottom);
    document.documentElement.style.setProperty('--rf-mm-top', Math.max(60, bottom - 1) + 'px');
  }
  function cancelClose() { window.clearTimeout(closeTimer); }
  function open(panelName) {
    cancelClose();
    setTop();
    lastPanel = panelName;
    panels.forEach(function (panel) {
      var active = panel.getAttribute('data-panel') === panelName;
      panel.classList.toggle('rf-mm-active', active);
      panel.setAttribute('aria-hidden', active ? 'false' : 'true');
    });
    root.classList.add('rf-mm-open');
    root.setAttribute('aria-hidden', 'false');
    if (backdrop) backdrop.classList.add('rf-mm-open');
    document.body.classList.toggle('rf-mm-no-scroll', isMobile());
  }
  function close() {
    cancelClose();
    root.classList.remove('rf-mm-open');
    root.setAttribute('aria-hidden', 'true');
    if (backdrop) backdrop.classList.remove('rf-mm-open');
    document.body.classList.remove('rf-mm-no-scroll');
  }
  function delayedClose() {
    cancelClose();
    closeTimer = window.setTimeout(close, 320);
  }

  // Prepare every matching link once, irrespective of Bootstrap wrappers.
  Array.prototype.slice.call(document.querySelectorAll('nav a, header a')).forEach(function (link) {
    var panelName = labels[linkLabel(link)];
    if (!panelName) return;
    link.classList.add('rf-mm-trigger');
    link.setAttribute('data-rf-panel', panelName);
    link.setAttribute('aria-haspopup', 'true');
    link.setAttribute('aria-controls', 'rf-mega-menu');
  });

  // Delegation catches the entire rendered link and its arrow/pseudo area.
  document.addEventListener('pointerover', function (event) {
    if (isMobile()) return;
    var link = menuLink(event.target);
    if (link) open(link.getAttribute('data-rf-panel') || labels[linkLabel(link)]);
  }, true);
  document.addEventListener('mouseover', function (event) {
    if (isMobile() || window.PointerEvent) return;
    var link = menuLink(event.target);
    if (link) open(link.getAttribute('data-rf-panel') || labels[linkLabel(link)]);
  }, true);
  document.addEventListener('focusin', function (event) {
    var link = menuLink(event.target);
    if (link && !isMobile()) open(link.getAttribute('data-rf-panel') || labels[linkLabel(link)]);
  });
  document.addEventListener('click', function (event) {
    var link = menuLink(event.target);
    if (!link || !isMobile()) return;
    event.preventDefault();
    open(link.getAttribute('data-rf-panel') || labels[linkLabel(link)]);
  }, true);

  var navigation = document.querySelector('nav') || document.querySelector('header');
  if (navigation) {
    navigation.addEventListener('pointerenter', cancelClose, true);
    navigation.addEventListener('pointerleave', function (event) {
      if (isMobile()) return;
      var destination = event.relatedTarget;
      if (destination && root.contains(destination)) cancelClose(); else delayedClose();
    }, true);
  }
  root.addEventListener('pointerenter', cancelClose);
  root.addEventListener('pointerleave', function (event) {
    if (isMobile()) return;
    var destination = event.relatedTarget;
    if (destination && navigation && navigation.contains(destination)) cancelClose(); else delayedClose();
  });
  if (closeButton) closeButton.addEventListener('click', close);
  if (backdrop) backdrop.addEventListener('click', close);
  document.addEventListener('keydown', function (event) { if (event.key === 'Escape') close(); });
  window.addEventListener('resize', function () {
    setTop();
    if (!isMobile()) document.body.classList.remove('rf-mm-no-scroll');
  });
  setTop();
})();
/* RF_MEGA_MENU_SCRIPT_END */
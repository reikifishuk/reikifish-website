/* RF_MEGA_MENU_SCRIPT_START */
(function () {
  'use strict';
  var root = document.getElementById('rf-mega-menu');
  if (!root) return;
  var backdrop = document.getElementById('rf-mega-backdrop');
  var panels = Array.prototype.slice.call(root.querySelectorAll('.rf-mm-panel'));
  var closeButton = root.querySelector('.rf-mm-close');
  var triggers = [];
  var closeTimer = null;
  var mobile = function () { return window.matchMedia('(max-width: 991.98px)').matches; };

  function navBottom() {
    var candidates = Array.prototype.slice.call(document.querySelectorAll('nav, header'));
    var visible = candidates.filter(function (el) { var r=el.getBoundingClientRect(); return r.height>20 && r.top < 180; });
    var bottom = visible.reduce(function (max, el) { return Math.max(max, el.getBoundingClientRect().bottom); }, 80);
    document.documentElement.style.setProperty('--rf-mm-top', Math.max(64, Math.round(bottom)) + 'px');
  }
  function activate(key) {
    panels.forEach(function (panel) {
      var on = panel.getAttribute('data-panel') === key;
      panel.classList.toggle('rf-mm-active', on);
      panel.setAttribute('aria-hidden', on ? 'false' : 'true');
    });
    root.classList.add('rf-mm-open');
    root.setAttribute('aria-hidden', 'false');
    if (backdrop) backdrop.classList.add('rf-mm-open');
    document.body.classList.toggle('rf-mm-no-scroll', mobile());
  }
  function close() {
    root.classList.remove('rf-mm-open');
    root.setAttribute('aria-hidden', 'true');
    if (backdrop) backdrop.classList.remove('rf-mm-open');
    document.body.classList.remove('rf-mm-no-scroll');
  }
  function scheduleClose() { window.clearTimeout(closeTimer); closeTimer=window.setTimeout(close,180); }
  function cancelClose() { window.clearTimeout(closeTimer); }

  var map = { 'about':'about', 'books':'books', 'coaching':'coaching', 'knowledge hub':'knowledge', 'blog':'blog' };
  Array.prototype.slice.call(document.querySelectorAll('nav a, header a')).forEach(function (link) {
    var label=(link.textContent || '').trim().toLowerCase().replace(/\s+/g,' ');
    if (!map[label]) return;
    var item=link.closest('li') || link;
    item.classList.add('rf-mm-trigger');
    link.setAttribute('aria-haspopup','true');
    link.setAttribute('aria-controls','rf-mega-menu');
    link.addEventListener('mouseenter',function(){ if(!mobile()){ cancelClose(); navBottom(); activate(map[label]); } });
    item.addEventListener('mouseenter',cancelClose);
    item.addEventListener('mouseleave',function(){ if(!mobile()) scheduleClose(); });
    link.addEventListener('focus',function(){ if(!mobile()){ navBottom(); activate(map[label]); } });
    link.addEventListener('click',function(event){
      if (mobile()) { event.preventDefault(); navBottom(); activate(map[label]); }
    });
    triggers.push(link);
  });
  root.addEventListener('mouseenter',cancelClose);
  root.addEventListener('mouseleave',function(){ if(!mobile()) scheduleClose(); });
  root.addEventListener('focusin',cancelClose);
  root.addEventListener('focusout',function(event){ if(!root.contains(event.relatedTarget)) scheduleClose(); });
  if (closeButton) closeButton.addEventListener('click',close);
  if (backdrop) backdrop.addEventListener('click',close);
  document.addEventListener('keydown',function(event){ if(event.key==='Escape') close(); });
  window.addEventListener('resize',function(){ navBottom(); if(!mobile()) document.body.classList.remove('rf-mm-no-scroll'); });
  navBottom();
})();
/* RF_MEGA_MENU_SCRIPT_END */
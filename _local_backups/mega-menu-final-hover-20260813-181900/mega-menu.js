/* RF_MEGA_MENU_CLEAN_CONTROLLER_START */
(function () {
  'use strict';
  var root = document.getElementById('rf-mega-menu');
  var backdrop = document.getElementById('rf-mega-backdrop');
  if (!root) return;
  var AI_URL = '/support-finder.html';
  var data = {
    about: {
      kicker:'The ReikiFish story', title:'Finding steadiness when life becomes uncertain',
      text:'Explore the experience, values and psychology-informed approach behind ReikiFish.',
      button:['Discover our approach','/about.html'],
      links:[['About ReikiFish','/about.html'],['Books and writing','/books.html'],['Coaching and support','/coaching.html'],['Knowledge Hub','/knowledge.html'],['Contact','/contact.html']],
      feature:['Our approach','Understanding without reducing a person to a label.','Read our story','/about.html']
    },
    books: {
      kicker:'Books and writing', title:'Ideas for standing still within the chaos',
      text:'Reflective writing on regulation, identity, alienation, recovery and the space between reaction and response.',
      button:['Explore the books','/books.html'],
      links:[['Walking the Grey','/books.html'],['The Book of DARVO','/books.html'],['Latest articles','/blog.html'],['About the author','/about.html'],['Contact','/contact.html']],
      feature:['Featured book','Walking the Grey: a journey through alienation, abuse and reclamation.','Explore the book','/books.html']
    },
    coaching: {
      kicker:'Structured support', title:'A steadier route through difficult experiences',
      text:'Choose focused, non-judgemental support informed by lived experience, psychology and practical reflection.',
      button:['Explore coaching','/coaching.html'],
      links:[['Trauma coaching','/trauma-coaching.html'],['Parental alienation support','/parental-alienation-coaching.html'],['Team leadership coaching','/team-leadership-coaching.html'],['AI Support Finder',AI_URL],['Contact','/contact.html']],
      feature:['AI-guided support','Describe what is happening and explore relevant services and professional directories.','Try the Support Finder',AI_URL]
    },
    knowledge: {
      kicker:'Evidence-led learning', title:'Explore the Knowledge Hub',
      text:'Clear guides covering trauma, personality, emotional health, relationships and social psychology.',
      button:['Open the Knowledge Hub','/knowledge.html'],
      links:[['Trauma','/knowledge-search.html?category=Trauma'],['Emotional Health','/knowledge-search.html?category=Emotional%20Health'],['Personality','/knowledge-search.html?category=Personality'],['Manipulation','/knowledge-search.html?category=Manipulation'],['AI Support Finder',AI_URL]],
      feature:['Complete guides','Substantial explanations, useful context and clear routes to related knowledge.','Browse all guides','/knowledge.html']
    },
    blog: {
      kicker:'Latest perspectives', title:'Writing on psychology, recovery and the Grey',
      text:'Long-form reflections connecting lived experience with practical ways to respond with greater steadiness.',
      button:['Visit the blog','/blog.html'],
      links:[['Latest articles','/blog.html'],['Psychology','/blog.html?category=Psychology'],['The Grey Method','/articles/the-grey-method-staying-regulated-under-provocation.html'],['Knowledge Hub','/knowledge.html'],['Contact','/contact.html']],
      feature:['Featured article','The Grey Method: staying regulated when someone wants a reaction.','Read the article','/articles/the-grey-method-staying-regulated-under-provocation.html']
    }
  };
  function esc(v) { return String(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function panel(name,item) {
    var links=item.links.map(function(x){return '<li><a href="'+esc(x[1])+'"><span>'+esc(x[0])+'</span></a></li>';}).join('');
    return '<section class="rf-mm-panel" data-panel="'+name+'" aria-hidden="true"><div class="rf-mm-column"><p class="rf-mm-kicker">'+esc(item.kicker)+'</p><h2 class="rf-mm-heading">'+esc(item.title)+'</h2><p class="rf-mm-copy">'+esc(item.text)+'</p><a class="rf-mm-button" href="'+esc(item.button[1])+'">'+esc(item.button[0])+' &rarr;</a></div><div class="rf-mm-column"><p class="rf-mm-kicker">Explore</p><ol class="rf-mm-links">'+links+'</ol></div><div class="rf-mm-feature"><div class="rf-mm-art" aria-hidden="true"><span class="rf-mm-orbit"></span><span class="rf-mm-mark"></span></div><div class="rf-mm-feature-content"><p class="rf-mm-kicker">'+esc(item.feature[0])+'</p><h2 class="rf-mm-heading">'+esc(item.feature[1])+'</h2><a class="rf-mm-button" href="'+esc(item.feature[3])+'">'+esc(item.feature[2])+' &rarr;</a></div></div></section>';
  }
  root.innerHTML='<div class="rf-mm-shell"><button class="rf-mm-close" type="button" aria-label="Close menu">&times;</button>'+Object.keys(data).map(function(k){return panel(k,data[k]);}).join('')+'</div>';
  var names={'about':'about','books':'books','coaching':'coaching','knowledge hub':'knowledge','blog':'blog'};
  var triggers=[]; var timer=0;
  function mobile(){return window.matchMedia('(max-width:991.98px)').matches;}
  function text(a){return (a.textContent||'').trim().toLowerCase().replace(/\s+/g,' ');}
  function setTop(){var header=document.querySelector('header')||document.querySelector('nav');if(header){document.documentElement.style.setProperty('--rf-mm-top',Math.max(60,Math.round(header.getBoundingClientRect().bottom)-1)+'px');}}
  function cancel(){window.clearTimeout(timer);}
  function open(name){cancel();setTop();root.querySelectorAll('.rf-mm-panel').forEach(function(p){var on=p.dataset.panel===name;p.classList.toggle('rf-mm-active',on);p.setAttribute('aria-hidden',on?'false':'true');});triggers.forEach(function(a){a.setAttribute('aria-expanded',a.dataset.rfPanel===name?'true':'false');});root.classList.add('rf-mm-open');root.setAttribute('aria-hidden','false');if(backdrop)backdrop.classList.add('rf-mm-open');document.body.classList.toggle('rf-mm-no-scroll',mobile());}
  function close(){cancel();root.classList.remove('rf-mm-open');root.setAttribute('aria-hidden','true');if(backdrop)backdrop.classList.remove('rf-mm-open');document.body.classList.remove('rf-mm-no-scroll');triggers.forEach(function(a){a.setAttribute('aria-expanded','false');});}
  function later(){cancel();timer=window.setTimeout(function(){if(!root.matches(':hover')&&!document.querySelector('.rf-mm-trigger:hover'))close();},500);}
  document.querySelectorAll('header a,nav a').forEach(function(a){var name=names[text(a)];if(!name)return;a.classList.add('rf-mm-trigger');a.dataset.rfPanel=name;a.setAttribute('aria-haspopup','true');a.setAttribute('aria-expanded','false');triggers.push(a);a.addEventListener('mouseenter',function(){if(!mobile())open(name);});a.addEventListener('pointerenter',function(){if(!mobile())open(name);});a.addEventListener('focus',function(){if(!mobile())open(name);});a.addEventListener('mouseleave',later);a.addEventListener('click',function(e){if(mobile()){e.preventDefault();open(name);}});});
  root.addEventListener('mouseenter',cancel);root.addEventListener('pointerenter',cancel);root.addEventListener('mouseleave',later);
  var closeButton=root.querySelector('.rf-mm-close');if(closeButton)closeButton.addEventListener('click',close);if(backdrop)backdrop.addEventListener('click',close);document.addEventListener('keydown',function(e){if(e.key==='Escape')close();});window.addEventListener('resize',setTop);setTop();
  window.rfMegaMenuTest={triggers:function(){return triggers.length;},panels:function(){return root.querySelectorAll('.rf-mm-panel').length;},open:open,close:close};
})();
/* RF_MEGA_MENU_CLEAN_CONTROLLER_END */
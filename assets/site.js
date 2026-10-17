/* SOV public site: menu, header, gentle reveal, and keeping where visitors came from. */
(function () {
  var btn = document.querySelector('.menu-btn'), nav = document.querySelector('.nav');
  if (btn && nav) btn.addEventListener('click', function () {
    var open = nav.classList.toggle('open'); btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  var top = document.querySelector('.top');
  function onScroll() { if (top) top.classList.toggle('scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.rv').forEach(function (el) { io.observe(el); });
  } else document.querySelectorAll('.rv').forEach(function (el) { el.classList.add('in'); });

  // Same rule as the account pages: an outside source wins over our own buttons.
  try {
    var q = new URLSearchParams(location.search), keep = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'ref'].forEach(function (k) { if (q.get(k)) keep[k] = q.get(k); });
    var had = JSON.parse(sessionStorage.getItem('sov_utm') || '{}');
    if (Object.keys(keep).length && !(keep.utm_source === 'sov-website' && had.utm_source && had.utm_source !== 'sov-website')) sessionStorage.setItem('sov_utm', JSON.stringify(keep));
  } catch (e) { /* storage blocked */ }

  // Tabs (Who we serve)
  document.querySelectorAll('[data-tabs]').forEach(function (root) {
    var tabs = root.querySelectorAll('[role=tab]');
    function show(id) {
      tabs.forEach(function (t) { var on = t.getAttribute('aria-controls') === id; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
      root.querySelectorAll('[role=tabpanel]').forEach(function (p) { p.hidden = p.id !== id; });
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { show(t.getAttribute('aria-controls')); history.replaceState(null, '', '#' + t.getAttribute('aria-controls')); });
      t.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return;
        var n = tabs[(i + d + tabs.length) % tabs.length]; n.focus(); n.click();
      });
    });
    var h = location.hash.slice(1); if (h && root.querySelector('#' + CSS.escape(h) + '[role=tabpanel]')) show(h);
  });
  // Pricing: monthly or annual
  var bt = document.querySelectorAll('[data-bill]');
  bt.forEach(function (b) { b.addEventListener('click', function () {
    var k = b.getAttribute('data-bill') === 'annual' ? 'data-a' : 'data-m';
    bt.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
    document.querySelectorAll('[data-m][data-a]').forEach(function (el) { el.textContent = el.getAttribute(k); });
  }); });
  // Installable app
  if ('serviceWorker' in navigator) window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  // Guide: "Where do I start?" One tap to the right next step, from anywhere.
  var g = document.getElementById('guide'), gb = document.getElementById('guide-btn'), gp = document.getElementById('guide-panel');
  if (g && gb && gp && !/brief\.html|contact\.html/.test(location.pathname)) {
    if (document.body.classList.contains('room-creative')) { var c = gp.querySelector('[data-g=cre]'); if (c) gp.insertBefore(c, gp.querySelector('a')); }
    function setOpen(o) { gp.hidden = !o; gb.setAttribute('aria-expanded', o ? 'true' : 'false'); }
    gb.addEventListener('click', function (e) { e.stopPropagation(); setOpen(gp.hidden); });
    document.addEventListener('click', function (e) { if (!g.contains(e.target)) setOpen(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !gp.hidden) { setOpen(false); gb.focus(); } });
    var foot = document.querySelector('.foot'), footIn = false;
    function place() { g.classList.toggle('show', window.scrollY > window.innerHeight * 0.6 && !footIn); if (footIn) setOpen(false); }
    if (foot && 'IntersectionObserver' in window) new IntersectionObserver(function (es) { footIn = es[0].isIntersecting; place(); }).observe(foot);
    window.addEventListener('scroll', place, { passive: true }); place();
  } else if (g) g.remove();
})();

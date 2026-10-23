/* Screen fit: size each top-level section to one screen, pairing two short neighbours on one screen. */
(function () {
  var root = document.documentElement;
  var mq = matchMedia('(min-width:900px) and (min-height:600px)');
  var SOLO = /(^| )(lx-hero|entry-stage|lx-open)( |$)/;
  function blocks() {
    var m = document.querySelector('main'); if (!m) return [];
    return Array.prototype.filter.call(m.querySelectorAll('section, .lx-strip'), function (el) { return !el.parentElement.closest('section'); });
  }
  function topH() { var t = document.querySelector('.top'), h = 0; if (t && /sticky|fixed/.test(getComputedStyle(t).position)) h = t.offsetHeight; return h; }
  var busy = false;
  function fit() {
    if (busy) return; busy = true;
    var bs = blocks();
    bs.forEach(function (b) { b.style.minHeight = ''; b.removeAttribute('data-fit'); b.removeAttribute('data-fit-snap'); });
    if (!mq.matches) { root.classList.remove('fit-on'); busy = false; return; }
    root.classList.add('fit-on');
    var top = topH(); root.style.setProperty('--fit-top', top + 'px');
    var vh = innerHeight - top, hs = bs.map(function (b) { return b.getBoundingClientRect().height; });
    var isStrip = function (k) { return bs[k].classList.contains('lx-strip'); };
    var i = 0, screens = 0, over = 0;
    while (i < bs.length) {
      var g = [i], sum = hs[i], secs = isStrip(i) ? 0 : 1, j = i + 1;
      while (j < bs.length && isStrip(j)) { g.push(j); sum += hs[j]; j++; }
      // pair with the next section when both fit on one screen
      if (j < bs.length && secs === 1 && !SOLO.test(bs[i].className) && !SOLO.test(bs[j].className) && sum + hs[j] <= vh) {
        g.push(j); sum += hs[j]; j++;
        while (j < bs.length && isStrip(j)) { g.push(j); sum += hs[j]; j++; }
      }
      var grow = g.filter(function (k) { return !isStrip(k); }), gsum = grow.reduce(function (s, k) { return s + hs[k]; }, 0);
      if (sum <= vh && gsum) grow.forEach(function (k) { bs[k].style.minHeight = Math.floor(hs[k] + (vh - sum) * hs[k] / gsum) + 'px'; });
      else over++;
      g.forEach(function (k) { bs[k].setAttribute('data-fit', ''); });
      bs[g[0]].setAttribute('data-fit-snap', '');
      screens++; i = j;
    }
    root.setAttribute('data-fit-screens', screens + ' screens, ' + over + ' taller than one');
    busy = false;
  }
  var t; function later() { clearTimeout(t); t = setTimeout(fit, 120); }
  fit();
  addEventListener('load', fit); addEventListener('resize', later);
  document.addEventListener('load', function (e) { if (e.target.tagName === 'IMG') later(); }, true);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(later);
})();

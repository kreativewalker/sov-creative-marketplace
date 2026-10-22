/* SOV immersive layer: pigment shader, gallery light, reveals, depth. No dependencies. */
(function () {
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var doc = document.documentElement;

  /* grain + light layers */
  var grain = document.createElement('div'); grain.className = 'sov-grain'; grain.setAttribute('aria-hidden', 'true'); document.body.appendChild(grain);
  var light = document.createElement('div'); light.className = 'sov-light'; light.setAttribute('aria-hidden', 'true'); document.body.appendChild(light);
  if (!reduce && matchMedia('(hover:hover)').matches) {
    var lx = 0, ly = 0, tx = 0, ty = 0, raf = 0;
    addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY; light.classList.add('on');
      if (!raf) raf = requestAnimationFrame(follow);
    }, { passive: true });
    function follow() {
      lx += (tx - lx) * 0.12; ly += (ty - ly) * 0.12;
      light.style.setProperty('--mx', lx + 'px'); light.style.setProperty('--my', ly + 'px');
      raf = (Math.abs(tx - lx) + Math.abs(ty - ly) > 0.5) ? requestAnimationFrame(follow) : 0;
    }
    document.addEventListener('pointerleave', function () { light.classList.remove('on'); });
  }

  /* nav deepens after the first screen */
  var top = document.querySelector('.top');
  if (top) addEventListener('scroll', function () { top.classList.toggle('past', scrollY > 80); }, { passive: true });

  /* pigment shader: domain-warped noise in the brand colours and the five logo-dot hues */
  function pigment(host, strength) {
    if (reduce) return;
    var c = document.createElement('canvas'); c.className = 'sov-pigment'; c.setAttribute('aria-hidden', 'true');
    host.insertBefore(c, host.firstChild.nextSibling || null);
    var gl = c.getContext('webgl', { premultipliedAlpha: false, antialias: false });
    if (!gl) { c.remove(); return; }
    var vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    var fs = [
      'precision mediump float;uniform vec2 r;uniform float t;uniform vec2 m;uniform float k;',
      'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
      'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}',
      'float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}',
      'void main(){vec2 uv=gl_FragCoord.xy/r;vec2 p=uv*vec2(r.x/r.y,1.)*1.6;float tt=t*.045;',
      'vec2 q=vec2(fbm(p+tt),fbm(p+vec2(5.2,1.3)-tt));',
      'vec2 w=vec2(fbm(p+3.*q+vec2(1.7,9.2)+tt*1.3+m*.6),fbm(p+3.*q+vec2(8.3,2.8)-tt));',
      'float f=fbm(p+3.5*w);',
      'vec3 deep=vec3(.07,.01,.06),plum=vec3(.33,.08,.32),wine=vec3(.52,.10,.24),brass=vec3(.85,.66,.30),ember=vec3(.85,.38,.17),think=vec3(.37,.25,.58),see=vec3(.91,.70,.23);',
      'vec3 col=mix(deep,plum,smoothstep(.1,.6,f));',
      'col=mix(col,wine,smoothstep(.35,.85,length(q)));',
      'col=mix(col,think,smoothstep(.55,.95,w.y)*.55);',
      'col=mix(col,ember,smoothstep(.62,.98,f*w.x)*.45);',
      'float vein=smoothstep(.48,.5,f)-smoothstep(.5,.53,f);',
      'col+=brass*vein*.9+see*pow(smoothstep(.7,1.,w.x),3.)*.35;',
      'float vig=smoothstep(1.25,.25,length(uv-vec2(.62,.42)));',
      'gl_FragColor=vec4(col*vig*k,1.);}'
    ].join('\n');
    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
    var pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { c.remove(); return; }
    gl.useProgram(pr);
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var ur = gl.getUniformLocation(pr, 'r'), ut = gl.getUniformLocation(pr, 't'), um = gl.getUniformLocation(pr, 'm'), uk = gl.getUniformLocation(pr, 'k');
    var mx = 0, my = 0, vis = true, start = performance.now();
    host.addEventListener('pointermove', function (e) { var b2 = host.getBoundingClientRect(); mx = (e.clientX - b2.left) / b2.width - .5; my = (e.clientY - b2.top) / b2.height - .5; }, { passive: true });
    function size() { var s = Math.min(1, 900 / Math.max(1, c.clientWidth)) * Math.min(devicePixelRatio || 1, 1.5); c.width = Math.max(2, c.clientWidth * s | 0); c.height = Math.max(2, c.clientHeight * s | 0); gl.viewport(0, 0, c.width, c.height); }
    size(); addEventListener('resize', size);
    new IntersectionObserver(function (es) { vis = es[0].isIntersecting; if (vis) loop(); }).observe(host);
    var cm = { x: 0, y: 0 };
    function loop() {
      if (!vis) return;
      cm.x += (mx - cm.x) * .04; cm.y += (my - cm.y) * .04;
      gl.uniform2f(ur, c.width, c.height); gl.uniform1f(ut, (performance.now() - start) / 1000 + 20.0);
      gl.uniform2f(um, cm.x, -cm.y); gl.uniform1f(uk, strength);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      requestAnimationFrame(loop);
    }
    loop();
  }
  var hero = document.querySelector('.lx-hero'); if (hero) pigment(hero, .62);
  var open = document.querySelector('.lx-open'); if (open && !hero) pigment(open, .9);

  /* scroll cue on the hero */
  if (hero) { var s = document.createElement('div'); s.className = 'sov-scroll'; s.innerHTML = '<i></i><span>Scroll</span>'; s.setAttribute('aria-hidden', 'true'); hero.appendChild(s); }

  /* headline words rise */
  document.querySelectorAll('.lx-hero h1, .lx-open h1, .lx .lx-h.sm').forEach(function (h) {
    if (h.querySelector('.w')) return;
    var words = h.textContent.trim().split(/\s+/);
    h.setAttribute('aria-label', h.textContent.trim());
    h.innerHTML = words.map(function (w, i) { return '<span class="w" aria-hidden="true"><span style="transition-delay:' + (i * 60) + 'ms">' + w.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</span></span>'; }).join(' ');
    h.classList.add('sov-split');
  });

  /* who we serve: swap the picture to match the name you hover */
  var big = document.querySelector('.lx-big');
  if (big) {
    var split = big.closest('.lx-split'); var img = split && split.querySelector(':scope > img');
    if (img) {
      var wrap = document.createElement('div'); wrap.className = 'sov-swap sov-frame'; img.parentNode.insertBefore(wrap, img); wrap.appendChild(img); img.classList.add('show');
      var map = { brands: img.cloneNode(), nonprofits: null, institutions: null };
      var srcs = { nonprofits: 'assets/photos/civic-800.webp', institutions: 'assets/photos/meeting-750.webp' };
      Object.keys(srcs).forEach(function (k) { var i = new Image(); i.src = srcs[k]; i.alt = ''; i.loading = 'lazy'; wrap.appendChild(i); map[k] = i; });
      map.brands = img;
      big.querySelectorAll('a').forEach(function (a) {
        var key = (a.getAttribute('href').split('#')[1]) || 'brands';
        a.addEventListener('pointerenter', function () { Object.keys(map).forEach(function (k) { if (map[k]) map[k].classList.toggle('show', k === key); }); });
        a.addEventListener('focus', function () { Object.keys(map).forEach(function (k) { if (map[k]) map[k].classList.toggle('show', k === key); }); });
      });
    }
  }

  /* five words: each carries its own light; they take turns when untouched */
  var five = document.querySelectorAll('.lx-five span');
  if (five.length) {
    five.forEach(function (s) { var i = s.querySelector('i'); if (i) s.style.setProperty('--c', getComputedStyle(i).backgroundColor); });
    if (!reduce) { var k = 0, touched = false; five.forEach(function (s) { s.addEventListener('pointerenter', function () { touched = true; five.forEach(function (o) { o.classList.remove('on'); }); }); });
      setInterval(function () { if (touched) return; five.forEach(function (o, j) { o.classList.toggle('on', j === k); }); k = (k + 1) % five.length; }, 1600); }
  }

  if (reduce) { document.querySelectorAll('.sov-split').forEach(function (h) { h.classList.add('in'); }); return; }

  /* reveals: only for things not yet on screen, so the first view is complete at rest */
  doc.classList.add('js-immerse');
  var vh = innerHeight;
  function mark(sel, cls) { document.querySelectorAll(sel).forEach(function (el) { if (el.getBoundingClientRect().top > vh * .9) el.classList.add(cls); else el.classList.add('in'); }); }
  mark('.lx-sec .lx-head > p, .lx-sec .lx-list, .lx-sec .lx-cols, .lx-sec .lx-nums, .lx-sec .lx-table, .lx-sec .lx-faq, .lx-sec .lx-calc, .lx-sec .lx-big, .lx-sec .lx-five, .lx-sec .lx-lead, .lx-sec .lx-row', 'sov-up');
  mark('.lx-split > img, .lx-split > .sov-swap', 'sov-veil');
  document.querySelectorAll('.sov-split').forEach(function (h) { if (h.getBoundingClientRect().top < vh) requestAnimationFrame(function () { h.classList.add('in'); }); });
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('in'); io.unobserve(e.target);
      if (e.target.classList.contains('lx-nums')) countUp(e.target);
    });
  }, { rootMargin: '0px 0px -12% 0px' });
  document.querySelectorAll('.sov-up, .sov-veil, .sov-split').forEach(function (el) { if (!el.classList.contains('in')) io.observe(el); });

  /* figures count up when they arrive */
  function countUp(box) {
    box.querySelectorAll('b').forEach(function (b) {
      var m = b.textContent.match(/^([^0-9]*)([0-9.,]+)(.*)$/); if (!m) return;
      var end = parseFloat(m[2].replace(/,/g, '')), dec = (m[2].split('.')[1] || '').length, t0 = performance.now();
      (function step(t) { var p = Math.min(1, (t - t0) / 1400), e = 1 - Math.pow(1 - p, 3);
        b.textContent = m[1] + (end * e).toFixed(dec) + m[3]; if (p < 1) requestAnimationFrame(step); })(t0);
    });
  }

  /* depth: pictures drift against the scroll and tilt toward the light */
  var depth = [].slice.call(document.querySelectorAll('.lx-split > img, .lx-open-grid > img, .sov-swap'));
  function para() {
    depth.forEach(function (el) { var r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > vh) return;
      var d = (r.top + r.height / 2 - vh / 2) / vh; el.style.transform = 'translate3d(0,' + (d * -36).toFixed(1) + 'px,0)'; });
  }
  addEventListener('scroll', function () { requestAnimationFrame(para); }, { passive: true }); addEventListener('resize', function () { vh = innerHeight; }); para();
  document.querySelectorAll('.lx-split > img').forEach(function (img) {
    img.addEventListener('pointermove', function (e) { var r = img.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      img.style.rotate = ''; img.style.transform = (img.style.transform || '').replace(/ rotate.*$/, '') + ' perspective(1200px) rotateY(' + (x * 6).toFixed(2) + 'deg) rotateX(' + (-y * 6).toFixed(2) + 'deg)'; });
    img.addEventListener('pointerleave', function () { para(); });
  });

  /* payment splitter: fill bars in proportion */
  var pay = document.querySelectorAll('.lx-pay > div');
  if (pay.length) { var ws = ['40%', '40%', '20%'];
    new IntersectionObserver(function (es, o) { if (es[0].isIntersecting) { pay.forEach(function (d, i) { setTimeout(function () { d.style.setProperty('--w', ws[i]); }, i * 250); }); o.disconnect(); } }).observe(pay[0].parentNode); }
})();

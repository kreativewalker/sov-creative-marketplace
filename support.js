/* SOV site runtime: renders the prototype screens as plain web pages. */
(function () {
  class DCLogic {
    constructor(props) { this.props = props || {}; this.state = {}; }
    setState(patch) {
      const next = typeof patch === 'function' ? patch(this.state) : patch;
      this.state = Object.assign({}, this.state, next);
      if (this.__render) this.__render();
    }
  }
  function get(path, scope) {
    path = path.trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    const parts = path.split('.');
    let v = scope;
    for (const p of parts) { if (v == null) return undefined; v = v[p]; }
    return v;
  }
  const HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  function interp(str, scope) {
    return str.replace(HOLE, (_, p) => { const v = get(p, scope); return v == null ? '' : String(v); });
  }
  function single(str) { const m = str.match(/^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/); return m ? m[1] : null; }
  function walk(node, scope) {
    const kids = Array.from(node.childNodes);
    for (const k of kids) {
      if (k.nodeType === 3) { if (k.nodeValue.indexOf('{{') > -1) k.nodeValue = interp(k.nodeValue, scope); continue; }
      if (k.nodeType !== 1) continue;
      const tag = k.tagName.toLowerCase();
      if (tag === 'sc-for') {
        const list = get(single(k.getAttribute('list')) || '', scope) || [];
        const as = k.getAttribute('as') || 'item';
        const frag = document.createDocumentFragment();
        list.forEach((item, i) => {
          const holder = document.createElement('div');
          holder.innerHTML = k.innerHTML;
          const sc = Object.assign({}, scope, { [as]: item, index: i });
          walk(holder, sc);
          while (holder.firstChild) frag.appendChild(holder.firstChild);
        });
        k.replaceWith(frag);
        continue;
      }
      if (tag === 'sc-if') {
        const v = get(single(k.getAttribute('value')) || 'false', scope);
        if (v) {
          walk(k, scope);
          const frag = document.createDocumentFragment();
          while (k.firstChild) frag.appendChild(k.firstChild);
          k.replaceWith(frag);
        } else k.remove();
        continue;
      }
      for (const a of Array.from(k.attributes)) {
        if (a.value.indexOf('{{') < 0) continue;
        const name = a.name;
        if (name.startsWith('on')) {
          const fn = get(single(a.value) || '', scope);
          k.removeAttribute(name);
          if (typeof fn === 'function') k.addEventListener(name.slice(2), (e) => { const h = k.getAttribute && k.getAttribute('href'); if (!(h && /^https?:/.test(h))) e.preventDefault(); fn(e); });
          continue;
        }
        k.setAttribute(name, interp(a.value, scope));
      }
      walk(k, scope);
    }
  }
  function boot() {
    const host = document.querySelector('x-dc');
    if (!host) return;
    const helmet = host.querySelector('helmet');
    if (helmet) { Array.from(helmet.children).forEach(c => document.head.appendChild(c)); helmet.remove(); }
    const tpl = host.innerHTML;
    const src = document.querySelector('script[type="text/x-dc"]');
    let comp = { renderVals: () => ({}) };
    if (src) {
      try {
        const Comp = new Function('DCLogic', src.textContent + '\n;return Component;')(DCLogic);
        comp = new Comp({});
      } catch (e) { console.error(e); }
    }
    const mount = document.createElement('div');
    mount.className = 'dc-root';
    host.replaceWith(mount);
    const render = () => {
      const vals = {};
      document.querySelectorAll('.dc-root input, .dc-root textarea').forEach((el, i) => { vals[el.id || ('#' + i)] = el.type === 'checkbox' ? el.checked : el.value; });
      const y = window.scrollY;
      const holder = document.createElement('div');
      holder.innerHTML = tpl;
      walk(holder, comp.renderVals() || {});
      mount.replaceChildren(...holder.childNodes);
      mount.querySelectorAll('input, textarea').forEach((el, i) => { const v = vals[el.id || ('#' + i)]; if (v !== undefined) { if (el.type === 'checkbox') el.checked = v; else el.value = v; } });
      mount.querySelectorAll('form').forEach(f => f.addEventListener('submit', e => e.preventDefault()));
      window.scrollTo(0, y);
    };
    comp.__render = render;
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

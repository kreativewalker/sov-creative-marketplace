// Shared helpers for SOV account pages.
(function () {
  const C = window.SOV_CONFIG;
  const sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  window.sb = sb;

  window.$ = (s, r) => (r || document).querySelector(s);
  window.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  window.esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  window.toast = (msg) => {
    const t = document.createElement('div');
    t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
  };

  window.initials = (name) => (name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

  // Send signed-out visitors to the login page, remembering where they were going.
  window.requireUser = async () => {
    const { data } = await sb.auth.getSession();
    if (!data.session) {
      location.replace('login.html?next=' + encodeURIComponent(location.pathname.split('/').pop() + location.hash));
      return null;
    }
    return data.session.user;
  };

  // Business accounts belong to an organization; creatives have an artist row.
  window.isBusiness = async () => {
    try { await sb.rpc('accept_invites'); } catch (e) { /* fine */ }
    const { data } = await sb.from('org_members').select('org_id').limit(1);
    return !!(data && data.length);
  };
  window.isStaffUser = async () => { try { const s = await sb.rpc('is_staff'); return !!s.data; } catch (e) { return false; } };
  window.homeFor = async (user) => (await isStaffUser()) ? 'team.html' : (user?.user_metadata?.account_type === 'business' || await isBusiness()) ? 'business.html' : 'index.html';

  // SOV staff only: switch between the SOV dashboard and the business and artist views, for demos and support.
  window.staffSwitch = async (current) => {
    if (!(await isStaffUser())) return false;
    const bar = document.createElement('div');
    bar.className = 'viewas';
    const b = (k, href, label) => `<a href="${href}"${k === current ? ' aria-current="page"' : ''}>${label}</a>`;
    bar.innerHTML = `<div class="wrap"><span>View as</span><nav aria-label="Switch view">${b('sov', 'team.html', 'SOV dashboard')}${b('business', 'business.html', 'Business')}${b('artist', 'index.html', 'Artist')}</nav></div>`;
    const h = document.querySelector('header'); if (h) h.after(bar); else document.body.prepend(bar);
    return true;
  };

  window.signOut = async () => { await sb.auth.signOut(); location.href = '../index.html'; };

  // Keep the UTM / referral tags from the page that sent them, so sign-up can record them.
  try {
    const q = new URLSearchParams(location.search);
    const keep = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'ref'].forEach(k => { if (q.get(k)) keep[k] = q.get(k); });
    // An outside source (Instagram, a referral) beats our own website buttons, so it isn't overwritten.
    const had = JSON.parse(sessionStorage.getItem('sov_utm') || '{}');
    const ours = keep.utm_source === 'sov-website';
    if (Object.keys(keep).length && !(ours && had.utm_source && had.utm_source !== 'sov-website')) sessionStorage.setItem('sov_utm', JSON.stringify(keep));
  } catch (e) { /* storage blocked: fine */ }
  window.savedUtm = () => { try { return JSON.parse(sessionStorage.getItem('sov_utm') || '{}'); } catch (e) { return {}; } };

  window.STATUS = {
    draft: { label: 'Application in progress', tone: 'amber', step: 0 },
    submitted: { label: 'Application received', tone: 'blue', step: 1 },
    in_review: { label: 'In review', tone: 'blue', step: 1 },
    call_invited: { label: 'Invited to a video call', tone: 'green', step: 2 },
    call_booked: { label: 'Video call booked', tone: 'green', step: 2 },
    approved: { label: 'Approved', tone: 'green', step: 3 },
    active: { label: 'Active in the network', tone: 'green', step: 4 },
    not_a_fit: { label: 'Not a fit right now', tone: 'red', step: 1 },
    withdrawn: { label: 'Withdrawn', tone: 'red', step: 0 }
  };
})();

if ('serviceWorker' in navigator) window.addEventListener('load', function () { navigator.serviceWorker.register('../sw.js', { scope: '../' }).catch(function () {}); });

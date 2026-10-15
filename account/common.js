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

  window.signOut = async () => { await sb.auth.signOut(); location.href = '../index.html'; };

  // Keep the UTM / referral tags from the page that sent them, so sign-up can record them.
  try {
    const q = new URLSearchParams(location.search);
    const keep = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'ref'].forEach(k => { if (q.get(k)) keep[k] = q.get(k); });
    if (Object.keys(keep).length) sessionStorage.setItem('sov_utm', JSON.stringify(keep));
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

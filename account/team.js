// SOV team review: staff-only list of applications, details, scores and status changes.
(async function () {
  const C = window.SOV_CONFIG;
  $('#out').addEventListener('click', signOut);
  const user = await requireUser(); if (!user) return;
  const st = await sb.rpc('is_staff');
  if (!st.data) { $('#view').innerHTML = `<div class="card pad stack" style="max-width:560px"><h1 class="disp" style="font-size:32px">Team only</h1><p>This page is for the SOV review team. <a href="index.html">Go to your dashboard</a>.</p></div>`; return; }

  let artists = [], works = [], urls = {}, sel = null, filter = 'submitted', q = '';
  let briefs = [], msgs = [], topps = [], orgsAll = [], membersAll = [], appsAll = [], mode = ['#briefs', '#messages', '#opps', '#creatives'].includes(location.hash) ? location.hash.slice(1) : 'overview', bsel = null;
  const MST = { new: ['New', 'blue'], replied: ['Replied', 'green'], archived: ['Archived', ''] };
  const TOPIC = { call: 'Intro call', project: 'Project', creative: 'Creative question', partner: 'Partnership', press: 'Press', general: 'General' };
  const BST = { new: ['New', 'blue'], contacted: ['Contacted', 'amber'], scoping: ['Scoping', 'amber'], proposal: ['Proposal sent', 'amber'], won: ['Won', 'green'], lost: ['Lost', ''], archived: ['Archived', ''] };
  const ORDER = ['submitted', 'in_review', 'call_invited', 'call_booked', 'approved', 'active', 'not_a_fit', 'withdrawn', 'draft'];

  async function load() {
    const b = await sb.from('briefs').select('*').order('created_at', { ascending: false });
    briefs = b.data || [];
    const m = await sb.from('contact_messages').select('*').order('created_at', { ascending: false });
    msgs = m.data || [];
    const op = await sb.from('opportunities').select('*, orgs(name)').order('created_at', { ascending: false });
    topps = op.data || [];
    const [og, om, ap] = await Promise.all([sb.from('orgs').select('*').order('created_at', { ascending: false }), sb.from('org_members').select('*').order('created_at', { ascending: false }), sb.from('applications').select('id,status,created_at')]);
    orgsAll = og.data || []; membersAll = om.data || []; appsAll = ap.data || [];
    const [a, w] = await Promise.all([
      sb.from('artists').select('*').order('submitted_at', { ascending: false, nullsFirst: false }),
      sb.from('works').select('*').order('position', { ascending: true, nullsFirst: false })
    ]);
    artists = a.data || []; works = w.data || [];
    const paths = works.map(x => x.image_path).filter(Boolean);
    for (let i = 0; i < paths.length; i += 100) {
      const { data } = await sb.storage.from('artworks').createSignedUrls(paths.slice(i, i + 100), 3600);
      (data || []).forEach(d => { if (d.signedUrl) urls[d.path] = d.signedUrl; });
    }
  }
  const worksOf = (id) => works.filter(w => w.artist_id === id);
  const count = (s) => artists.filter(a => a.status === s).length;

  const tabs = () => `<div class="row" role="tablist" aria-label="Review area" style="flex-wrap:wrap"><button class="btn btn-sm ${mode === 'overview' ? '' : 'btn-ghost'}" data-mode="overview" role="tab" aria-selected="${mode === 'overview'}">Overview</button><button class="btn btn-sm ${mode === 'creatives' ? '' : 'btn-ghost'}" data-mode="creatives" role="tab" aria-selected="${mode === 'creatives'}">Creatives (${artists.filter(a => a.status !== 'draft').length})</button><button class="btn btn-sm ${mode === 'briefs' ? '' : 'btn-ghost'}" data-mode="briefs" role="tab" aria-selected="${mode === 'briefs'}">Business briefs (${briefs.filter(b => b.status === 'new').length} new)</button><button class="btn btn-sm ${mode === 'messages' ? '' : 'btn-ghost'}" data-mode="messages" role="tab" aria-selected="${mode === 'messages'}">Messages (${msgs.filter(m => m.status === 'new').length} new)</button><button class="btn btn-sm ${mode === 'opps' ? '' : 'btn-ghost'}" data-mode="opps" role="tab" aria-selected="${mode === 'opps'}">Opportunities (${topps.filter(o => o.status === 'review').length} to review)</button></div>`;
  const wireTabs = () => $$('[data-mode]').forEach(b => b.onclick = () => { mode = b.dataset.mode; history.replaceState(null, '', mode === 'overview' ? '#' : '#' + mode); render(); });

  function renderBriefs() {
    const row = (l, x) => (x == null || x === '' || (Array.isArray(x) && !x.length)) ? '' : `<tr><th scope="row" style="width:34%">${esc(l)}</th><td>${esc(Array.isArray(x) ? x.join(', ') : x)}</td></tr>`;
    const b = briefs.find(x => x.id === bsel);
    $('#view').innerHTML = `<div class="stack" style="gap:20px">
      <div class="row" style="justify-content:space-between"><h1 class="disp">SOV dashboard</h1>${tabs()}</div>
      <div class="split">
        <section class="stack list" style="gap:10px">
          ${briefs.map(x => `<button class="item" data-b="${x.id}" aria-current="${bsel === x.id}"><span class="stack" style="gap:2px;min-width:0"><b>${esc(x.org_name)}</b><span class="hint">${esc([x.sector, x.city_state, x.budget_range].filter(Boolean).join(' · '))}</span><span class="hint">${new Date(x.created_at).toLocaleDateString()}</span></span><span class="tag ${BST[x.status][1]}" style="margin-left:auto">${BST[x.status][0]}</span></button>`).join('') || '<p class="hint">No briefs yet. They arrive here when a business sends one from the website.</p>'}
        </section>
        <section>${b ? `<div class="stack" style="gap:16px">
          <div class="card pad stack" style="gap:10px"><h2>${esc(b.org_name)}</h2><p>${esc(b.contact_name)}${b.role ? ', ' + esc(b.role) : ''} · <a href="mailto:${esc(b.email)}">${esc(b.email)}</a>${b.phone ? ' · ' + esc(b.phone) : ''}</p>
            <div class="row">${Object.keys(BST).map(k => `<button class="btn btn-sm ${b.status === k ? '' : 'btn-ghost'}" data-bst="${k}">${BST[k][0]}</button>`).join('')}</div>
            <div><a class="btn btn-blue btn-sm" href="mailto:${esc(b.email)}?subject=${encodeURIComponent('Your SOV brief: ' + b.org_name)}&body=${encodeURIComponent('Hi ' + (b.contact_name || '').split(' ')[0] + ',\n\nThank you for sending us your brief. ')}">Reply by email</a></div></div>
          <section class="card pad"><table class="t">
            ${row('Sent', new Date(b.created_at).toLocaleString())}${row('Type of space', b.sector)}${row('The space', b.space_type)}${row('Where', [b.city_state, b.country].filter(Boolean).join(', '))}${row('How they hire', b.procurement_path)}${row('Size', b.site_size)}
            ${row('What it should do', b.outcomes)}${row('Creative work wanted', b.creative_types)}${row('Who experiences it', b.audience)}${row('Theme or story', b.theme)}
            ${row('Site limits', b.constraints)}${row('Building age', b.building_age)}${row('Codes and approvals', b.approvals)}${row('How they want to work', b.engagement_mode)}${row('Their creative', [b.byo_creative, b.byo_contact].filter(Boolean).join(' · '))}${row('Should feel', b.feeling)}${row('Planned uses', b.usage_rights)}${row('Final approver', b.approver)}${row('Approval notes', b.approvals_detail)}${row('Budget', b.budget_range)}${row('Budget comes from', b.budget_source)}${row('Needed by', b.needed_by)}
            ${row('Heard about SOV', b.heard_from)}${row('More on that', b.heard_detail)}${row('Notes', b.notes)}${row('Tracking', b.utm ? Object.entries(b.utm).map(([k, v]) => k + '=' + v).join(', ') : '')}
          </table></section><div id="room"></div></div>` : '<p class="hint">Choose a brief to see it.</p>'}</section>
      </div></div>`;
    wireTabs();
    $$('[data-b]').forEach(x => x.onclick = () => { bsel = x.dataset.b; render(); });
    if (b && window.renderRoom) window.renderRoom(b, $('#room'), () => { toast('Saved'); render(); });
    $$('[data-bst]').forEach(x => x.onclick = async () => {
      const r = await sb.from('briefs').update({ status: x.dataset.bst }).eq('id', b.id).select().single();
      if (r.error) { toast('Could not update'); return; } Object.assign(b, r.data); toast('Updated'); render();
    });
  }

  function renderMessages() {
    $('#view').innerHTML = `<div class="stack" style="gap:20px">
      <div class="row" style="justify-content:space-between"><h1 class="disp">SOV dashboard</h1>${tabs()}</div>
      <p class="hint">Messages from the Talk with us page. Reply by email, then mark them replied.</p>
      <div class="stack" style="gap:12px">${msgs.map(m => `<section class="card pad stack" style="gap:10px">
        <div class="row" style="justify-content:space-between;gap:10px"><b>${esc(m.name)}${m.org ? ' · ' + esc(m.org) : ''}</b><span class="tag ${MST[m.status][1]}">${MST[m.status][0]}</span></div>
        <p class="hint">${esc(TOPIC[m.topic] || m.topic)} · ${new Date(m.created_at).toLocaleString()} · <a href="mailto:${esc(m.email)}">${esc(m.email)}</a>${m.phone ? ' · ' + esc(m.phone) : ''}</p>
        <p style="white-space:pre-wrap">${esc(m.message)}</p>
        <div class="row"><a class="btn btn-blue btn-sm" href="mailto:${esc(m.email)}?subject=${encodeURIComponent('Re: your message to SOV')}&body=${encodeURIComponent('Hi ' + (m.name || '').split(' ')[0] + ',\n\n')}">Reply by email</a>${Object.keys(MST).map(k => `<button class="btn btn-sm ${m.status === k ? '' : 'btn-ghost'}" data-mid="${m.id}" data-mst="${k}">${MST[k][0]}</button>`).join('')}</div>
      </section>`).join('') || '<p class="hint">No messages yet.</p>'}</div></div>`;
    wireTabs();
    $$('[data-mst]').forEach(x => x.onclick = async () => {
      const m = msgs.find(y => y.id === x.dataset.mid);
      const r = await sb.from('contact_messages').update({ status: x.dataset.mst }).eq('id', m.id).select().single();
      if (r.error) { toast('Could not update'); return; } Object.assign(m, r.data); toast('Updated'); render();
    });
  }

  function renderOpps() {
    const OS = { draft: 'Draft', review: 'Needs review', open: 'Open', closed: 'Closed', awarded: 'Creative selected' };
    $('#view').innerHTML = `<div class="stack" style="gap:20px">
      <div class="row" style="justify-content:space-between"><h1 class="disp">SOV dashboard</h1>${tabs()}</div>
      <p class="hint">Self-serve postings from organizations. Check each one is clear, fairly paid and safe, then open it to approved creatives.</p>
      <div class="stack" style="gap:12px">${topps.map(o => `<section class="card pad stack" style="gap:8px">
        <div class="row" style="justify-content:space-between;gap:10px"><b>${esc(o.title)}</b><span class="tag ${o.status === 'review' ? 'amber' : o.status === 'open' ? 'green' : ''}">${OS[o.status]}</span></div>
        <p class="hint">${esc(o.orgs?.name || '')} · ${new Date(o.created_at).toLocaleDateString()} · ${esc((o.disciplines || []).join(', '))}${o.location ? ' · ' + esc(o.location) : ''} · ${esc(o.budget_range || '')}${o.visibility === 'invite_only' ? ' · invite only' : ''}</p>
        ${o.summary ? `<p>${esc(o.summary)}</p>` : ''}${o.details ? `<details><summary class="hint">Details</summary><p style="white-space:pre-wrap">${esc(o.details)}</p>${o.rights ? `<p class="hint">Rights: ${esc(o.rights)}</p>` : ''}${o.invited_name ? `<p class="hint">Invited: ${esc(o.invited_name)} ${esc(o.invited_contact || '')}</p>` : ''}</details>` : ''}
        <div class="row">${o.status !== 'open' ? `<button class="btn btn-blue btn-sm" data-oid="${o.id}" data-os="open">Open to creatives</button>` : ''}${o.status === 'review' ? `<button class="btn btn-sm btn-ghost" data-oid="${o.id}" data-os="draft">Send back as draft</button>` : ''}${['open', 'review'].includes(o.status) ? `<button class="linkbtn" data-oid="${o.id}" data-os="closed">Close</button>` : ''}</div>
      </section>`).join('') || '<p class="hint">No postings yet.</p>'}</div></div>`;
    wireTabs();
    $$('[data-os]').forEach(x => x.onclick = async () => {
      const o = topps.find(y => y.id === x.dataset.oid);
      const r = await sb.from('opportunities').update({ status: x.dataset.os }).eq('id', o.id).select('*, orgs(name)').single();
      if (r.error) { toast('Could not update'); return; } Object.assign(o, r.data); toast('Updated'); render();
    });
  }

  function renderOverview() {
    const since = (d) => (Date.now() - new Date(d).getTime()) < 7 * 864e5;
    const sub = artists.filter(a => a.status !== 'draft');
    const k = (n, label, sub2, href) => `<a class="card pad stack" href="${href}" style="gap:4px;text-decoration:none;color:inherit"><b style="font-family:'Instrument Serif',serif;font-weight:400;font-size:52px;line-height:1">${n}</b><span>${label}</span>${sub2 ? `<span class="hint">${sub2}</span>` : ''}</a>`;
    const orgName = (id) => (orgsAll.find(o => o.id === id) || {}).name || '';
    const feed = [
      ...artists.map(a => ({ t: a.created_at, who: a.display_name || a.email || 'Creative', what: 'Creative account', detail: a.email || '', tag: STATUS[a.status] ? STATUS[a.status].label : a.status })),
      ...membersAll.map(m => ({ t: m.created_at, who: m.name || 'Business member', what: 'Business account', detail: orgName(m.org_id) + (m.title ? ' · ' + m.title : ''), tag: m.role === 'owner' ? 'Owner' : 'Member' })),
      ...briefs.map(b => ({ t: b.created_at, who: b.org_name, what: 'Brief', detail: [b.engagement_mode, b.city_state].filter(Boolean).join(' · '), tag: BST[b.status] ? BST[b.status][0] : b.status })),
      ...topps.map(o => ({ t: o.created_at, who: o.orgs?.name || '', what: 'Opportunity posted', detail: o.title, tag: o.status })),
      ...msgs.map(m => ({ t: m.created_at, who: m.name, what: 'Message', detail: m.topic, tag: m.status }))
    ].filter(x => x.t).sort((a, b) => new Date(b.t) - new Date(a.t)).slice(0, 40);
    $('#view').innerHTML = `<div class="stack" style="gap:24px">
      <div class="row" style="justify-content:space-between"><h1 class="disp">SOV dashboard</h1>${tabs()}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px">
        ${k(artists.length, 'Creative sign-ups', `${artists.filter(a => since(a.created_at)).length} this week`, '#creatives')}
        ${k(sub.length, 'Applications sent', `${count('submitted') + count('in_review')} waiting on review`, '#creatives')}
        ${k(count('approved') + count('active'), 'Approved creatives', `${count('call_invited') + count('call_booked')} in the call stage`, '#creatives')}
        ${k(orgsAll.length, 'Business accounts', `${membersAll.length} people · ${orgsAll.filter(o => since(o.created_at)).length} new this week`, '#')}
        ${k(briefs.length, 'Briefs', `${briefs.filter(b => b.status === 'new').length} new`, '#briefs')}
        ${k(topps.length, 'Opportunities', `${topps.filter(o => o.status === 'review').length} to review · ${topps.filter(o => o.status === 'open').length} open · ${appsAll.length} applications`, '#opps')}
        ${k(msgs.length, 'Messages', `${msgs.filter(m => m.status === 'new').length} new`, '#messages')}
      </div>
      <section class="card pad stack" style="gap:10px"><h2>Latest activity</h2>
        <div style="overflow-x:auto"><table class="t"><thead><tr><th>When</th><th>Who</th><th>What</th><th>Detail</th><th>Status</th></tr></thead><tbody>
        ${feed.map(x => `<tr><td class="hint">${new Date(x.t).toLocaleString()}</td><td><b>${esc(x.who)}</b></td><td>${esc(x.what)}</td><td class="hint">${esc(x.detail || '')}</td><td><span class="tag">${esc(x.tag || '')}</span></td></tr>`).join('') || '<tr><td colspan="5" class="hint">Nothing yet.</td></tr>'}
        </tbody></table></div></section>
      <section class="card pad stack" style="gap:10px"><h2>Business accounts</h2>
        <div style="overflow-x:auto"><table class="t"><thead><tr><th>Organization</th><th>Type</th><th>People</th><th>Joined</th></tr></thead><tbody>
        ${orgsAll.map(o => `<tr><td><b>${esc(o.name)}</b></td><td class="hint">${esc(o.sector || '')}</td><td>${membersAll.filter(m => m.org_id === o.id).map(m => esc(m.name || 'Member')).join(', ')}</td><td class="hint">${o.created_at ? new Date(o.created_at).toLocaleDateString() : ''}</td></tr>`).join('') || '<tr><td colspan="4" class="hint">No business accounts yet.</td></tr>'}
        </tbody></table></div></section>
    </div>`;
    wireTabs();
  }

  function render() {
    if (mode === 'overview') return renderOverview();
    if (mode === 'opps') return renderOpps();
    if (mode === 'messages') return renderMessages();
    if (mode === 'briefs') return renderBriefs();
    const shown = artists.filter(a => (filter === 'all' || a.status === filter) && (!q || JSON.stringify([a.display_name, a.legal_name, a.email, a.city_state, a.disciplines]).toLowerCase().includes(q)));
    const sources = {};
    artists.filter(a => a.status !== 'draft').forEach(a => { const k = a.heard_from || 'Not given'; sources[k] = (sources[k] || 0) + 1; });
    const ai = artists.filter(a => a.heard_ai_prompt).map(a => `<li>"${esc(a.heard_ai_prompt)}" <span class="hint">(${esc(a.heard_ai_tool || 'AI')})</span></li>`).join('');
    $('#view').innerHTML = `<div class="stack" style="gap:20px">
      <div class="row" style="justify-content:space-between"><h1 class="disp">SOV dashboard</h1>${tabs()}</div>
      <div class="kpis">
        <div class="kpi"><b>${count('submitted')}</b>New applications</div>
        <div class="kpi"><b>${count('in_review') + count('call_invited') + count('call_booked')}</b>In progress</div>
        <div class="kpi"><b>${count('approved') + count('active')}</b>Approved or active</div>
        <div class="kpi"><b>${count('draft')}</b>Accounts still drafting</div>
      </div>
      <details class="card pad"><summary style="cursor:pointer;font-weight:700">Where applicants found SOV</summary>
        <table class="t" style="margin-top:10px">${Object.entries(sources).sort((x, y) => y[1] - x[1]).map(([k, n]) => `<tr><td>${esc(k)}</td><td>${n}</td></tr>`).join('') || '<tr><td class="hint">No applications yet.</td></tr>'}</table>
        ${ai ? `<h3 style="margin-top:14px">What creatives asked AI tools</h3><ul>${ai}</ul>` : ''}
      </details>
      <div class="split">
        <section class="stack list" style="gap:10px">
          <div class="row"><select id="flt" aria-label="Filter by status"><option value="all">All statuses</option>${ORDER.map(s => `<option value="${s}" ${filter === s ? 'selected' : ''}>${STATUS[s].label} (${count(s)})</option>`).join('')}</select></div>
          <input id="q" type="text" placeholder="Search name, email, city, discipline" value="${esc(q)}" aria-label="Search">
          ${shown.map(a => { const w = worksOf(a.id).find(x => x.image_path); return `<button class="item" data-id="${a.id}" aria-current="${sel === a.id}"><img class="thumb" alt="" src="${esc(w ? urls[w.image_path] || '' : '')}"><span class="stack" style="gap:2px;min-width:0"><b>${esc(a.display_name || a.email)}</b><span class="hint">${esc(a.city_state || '')} · ${esc((a.disciplines || []).slice(0, 2).join(', '))}</span></span><span class="tag ${STATUS[a.status].tone}" style="margin-left:auto">${STATUS[a.status].label}</span></button>`; }).join('') || '<p class="hint">No one here yet.</p>'}
        </section>
        <section id="detail">${sel ? '' : '<p class="hint">Choose someone to see their application.</p>'}</section>
      </div></div>`;
    wireTabs();
    $('#flt').onchange = (e) => { filter = e.target.value; render(); };
    $('#q').oninput = (e) => { q = e.target.value.toLowerCase(); const pos = e.target.selectionStart; render(); const el = $('#q'); el.focus(); el.setSelectionRange(pos, pos); };
    $$('[data-id]').forEach(b => b.onclick = () => { sel = b.dataset.id; render(); });
    if (sel) detail();
  }

  async function detail() {
    const a = artists.find(x => x.id === sel); if (!a) return;
    const [notes, hist, cons] = await Promise.all([
      sb.from('review_notes').select('*').eq('artist_id', a.id).order('created_at', { ascending: false }),
      sb.from('status_events').select('*').eq('artist_id', a.id).order('created_at', { ascending: false }),
      sb.from('consent_events').select('*').eq('artist_id', a.id).order('created_at', { ascending: false })
    ]);
    const row = (l, v) => v == null || v === '' || (Array.isArray(v) && !v.length) ? '' : `<tr><th scope="row" style="width:38%">${esc(l)}</th><td>${/^https?:/.test(v) ? `<a href="${esc(v)}" target="_blank" rel="noopener">${esc(v)}</a>` : esc(Array.isArray(v) ? v.join(', ') : v)}</td></tr>`;
    const inviteMail = `mailto:${encodeURIComponent(a.email || '')}?subject=${encodeURIComponent("Let's talk about your work")}&body=${encodeURIComponent(`Hi ${a.display_name || ''},\n\nThank you for applying to SOV Creative Marketplace. We spent time with your work, and we'd love to get to know you and the story behind it.\n\nThe next step is a 30-minute video call on Google Meet with a working creative from our team. Please pick a time that works for you here:\n\n${C.bookingUrl}\n\nYou'll also see a "Pick a time" button in your SOV dashboard.\n\nTalk soon,\nMicah and the SOV team`)}`;
    $('#detail').innerHTML = `<div class="stack" style="gap:16px">
      <div class="card pad stack">
        <div class="row" style="justify-content:space-between"><h2 class="disp" style="font-size:30px">${esc(a.display_name || a.email)}</h2><span class="tag ${STATUS[a.status].tone}">${STATUS[a.status].label}</span></div>
        <p class="hint">${esc(a.legal_name || '')} · ${esc(a.pronouns || '')} · <a href="mailto:${esc(a.email)}">${esc(a.email)}</a> · ${esc(a.phone || '')}</p>
        <div class="row">
          <button class="btn btn-sm btn-ghost" data-st="in_review">Mark in review</button>
          <a class="btn btn-sm btn-blue" id="invite" href="${inviteMail}">Invite to video call</a>
          <button class="btn btn-sm btn-ghost" data-st="call_booked">Call booked</button>
          <button class="btn btn-sm btn-ghost" data-st="approved">Approve</button>
          <button class="btn btn-sm btn-ghost" data-st="active">Mark active</button>
          <button class="btn btn-sm btn-ghost" data-st="not_a_fit">Not a fit right now</button>
        </div>
        <p class="hint">"Invite to video call" opens an email to the artist with your booking link and shows them a booking button in their dashboard.</p>
      </div>
      <div class="gallery big">${worksOf(a.id).filter(w => w.image_path || w.link_url).map(w => `<figure>${w.image_path ? `<a href="${esc(urls[w.image_path] || '#')}" target="_blank" rel="noopener"><img src="${esc(urls[w.image_path] || '')}" alt="${esc(w.title || 'Work sample')}"></a>` : ''}${w.link_url ? `<a class="linktile" href="${esc(w.link_url)}" target="_blank" rel="noopener"><span aria-hidden="true">${w.kind === 'audio' ? '♪' : w.kind === 'video' ? '▶' : '↗'}</span>Open ${esc(w.kind || 'link')}</a>` : ''}<figcaption><b>${esc(w.title || 'Untitled')}</b><br><span class="hint">${esc([w.medium, w.size, w.year].filter(Boolean).join(' · '))}</span></figcaption></figure>`).join('') || '<p class="hint">No samples yet.</p>'}</div>
      <section class="card pad"><table class="t">
        ${row('City', [a.city_state, a.country].filter(Boolean).join(', '))}${row('ZIP', a.zip)}${row('Travel range', a.travel_range)}${row('18 or older', a.is_adult ? 'Yes' : 'Not confirmed')}
        ${row('Main field', a.creative_field)}${row('Kinds of work', a.disciplines)}${row('Video or audio sample', a.reel_url)}${row('Performance needs', a.performance_setup)}${row('Other discipline', a.disciplines_other)}${row('Services', a.services)}
        ${row('Portfolio', a.portfolio_url)}${row('Social', a.social_url)}${row('Largest piece', a.largest_piece)}${row('Where work has lived', a.where_shown_types)}${row('About where it has lived', a.where_shown)}${row('Can install', a.can_install)}
        ${row('Smallest project', a.min_project)}${row('Day rate', a.day_rate ? '$' + a.day_rate : '')}${row('Notice needed', a.notice)}${row('Insurance', a.insurance)}${row('Open to licensing', a.licensing)}${row('AI in process', a.ai_process)}${row('Languages', a.languages)}
        ${row('Reference', [a.ref_name, a.ref_relationship, a.ref_org, a.ref_contact].filter(Boolean).join(' · '))}${row('Worked on together', a.ref_project)}
        ${row('Heard about SOV', a.heard_from)}${row('AI tool', a.heard_ai_tool)}${row('AI prompt', a.heard_ai_prompt)}${row('Referred by', a.heard_referrer)}${row('Event', a.heard_event)}
        ${row('Tracking', a.utm ? Object.entries(a.utm).map(([k, v]) => k + '=' + v).join(', ') : '')}
        ${row('Public profile', a.consent_public_profile)}${row('News emails', a.consent_news)}${row('Terms agreed', a.terms_accepted_at ? new Date(a.terms_accepted_at).toLocaleString() + ' (' + (a.terms_version || '') + ')' : '')}
        ${row('Bio', a.bio)}${row('Statement', a.statement)}${row('Submitted', a.submitted_at ? new Date(a.submitted_at).toLocaleString() : '')}
      </table></section>
      <form class="card pad stack" id="noteF"><h3>Review notes</h3>
        <div class="grid2">${['score_quality:Work quality', 'score_professional:Professionalism', 'score_fit:Commercial fit'].map(s => { const [k, l] = s.split(':'); return `<label class="f">${l}<select name="${k}"><option value="">Score 1 to 5</option>${[1, 2, 3, 4, 5].map(n => `<option>${n}</option>`).join('')}</select></label>`; }).join('')}</div>
        <label class="f">Note<textarea name="note" placeholder="What stood out, sector fit, anything to check"></textarea></label>
        <div><button class="btn btn-sm" type="submit">Save note</button></div>
        ${(notes.data || []).map(n => `<div style="border-top:1px solid var(--line);padding-top:10px"><p class="hint">${new Date(n.created_at).toLocaleString()} · Quality ${n.score_quality ?? '-'} · Professionalism ${n.score_professional ?? '-'} · Fit ${n.score_fit ?? '-'}</p><p>${esc(n.note || '')}</p></div>`).join('')}
      </form>
      <section class="card pad stack" style="gap:8px"><h3>History</h3>
        ${(hist.data || []).map(h => `<p class="hint">${new Date(h.created_at).toLocaleString()}: ${esc(STATUS[h.from_status]?.label || h.from_status)} → <b>${esc(STATUS[h.to_status]?.label || h.to_status)}</b></p>`).join('')}
        ${(cons.data || []).map(c => `<p class="hint">${new Date(c.created_at).toLocaleString()}: ${esc(c.kind)} = ${esc(c.value)}</p>`).join('')}
      </section></div>`;
    $$('[data-st]').forEach(b => b.onclick = () => setStatus(a, b.dataset.st));
    $('#invite').addEventListener('click', () => setStatus(a, 'call_invited'));
    $('#noteF').onsubmit = async (e) => {
      e.preventDefault(); const f = new FormData(e.target);
      const rec = { artist_id: a.id, author: user.id, note: f.get('note') || null };
      ['score_quality', 'score_professional', 'score_fit'].forEach(k => rec[k] = f.get(k) ? Number(f.get(k)) : null);
      const r = await sb.from('review_notes').insert(rec); if (r.error) { toast('Could not save note'); return; } toast('Note saved'); detail();
    };
  }
  async function setStatus(a, s) {
    const r = await sb.from('artists').update({ status: s }).eq('id', a.id).select().single();
    if (r.error) { toast('Could not update status'); console.error(r.error); return; }
    Object.assign(a, r.data); toast('Status: ' + STATUS[s].label); render();
  }

  await load(); render();
})();

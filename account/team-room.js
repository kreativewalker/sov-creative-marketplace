// SOV team: the project room editor for one brief. Everything the business sees in its home base is set here.
window.renderRoom = async function (b, el, onChange) {
  const STAGES = [['brief', 'Brief'], ['shortlist', 'Shortlist'], ['concept', 'Concepts'], ['scope', 'Scope'], ['make', 'Making'], ['install', 'Install'], ['complete', 'Complete'], ['paused', 'Paused']];
  const CAT = { creative_fee: 'Creative fee', materials: 'Materials', fabrication: 'Fabrication', shipping: 'Packing and shipping', install: 'Install', permits: 'Permits and engineering', insurance: 'Insurance', documentation: 'Photo and video', sov_fee: 'SOV fee', other: 'Other' };
  const MS = ['upcoming', 'ready', 'approved', 'paid'];
  const KIND = ['scope', 'contract', 'coi', 'w9', 'invoice', 'concept', 'permit', 'closeout', 'report', 'other'];
  const money = (n) => '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
  const opts = (list, cur, lab) => list.map(v => `<option value="${v}" ${v === cur ? 'selected' : ''}>${esc(lab ? lab(v) : v)}</option>`).join('');
  el.innerHTML = '<p class="hint">Loading project room...</p>';
  const me = (await sb.auth.getUser()).data.user;
  const [orgs, artists, matches, lines, miles, docs, fb, items] = await Promise.all([
    sb.from('orgs').select('id,name').order('name'),
    sb.from('artists').select('id,display_name,status,creative_field,city_state').in('status', ['submitted', 'in_review', 'call_invited', 'call_booked', 'approved', 'active']).order('display_name'),
    sb.from('matches').select('*').eq('brief_id', b.id).order('created_at'),
    sb.from('budget_lines').select('*').eq('brief_id', b.id).order('position').order('created_at'),
    sb.from('milestones').select('*').eq('brief_id', b.id).order('position').order('created_at'),
    sb.from('documents').select('*').eq('brief_id', b.id).order('created_at'),
    sb.from('feedback').select('*').eq('brief_id', b.id).order('created_at', { ascending: false }),
    b.org_id ? sb.from('collection_items').select('*').eq('brief_id', b.id) : Promise.resolve({ data: [] })
  ]);
  const A = artists.data || [], M = matches.data || [], L = lines.data || [], MI = miles.data || [], D = docs.data || [], F = fb.data || [], I = items.data || [];
  const nameOf = (id) => (A.find(a => a.id === id) || {}).display_name || 'Creative';
  const total = L.reduce((s, l) => s + Number(l.amount), 0);
  const sec = (t, inner) => `<section class="card pad stack" style="gap:12px"><h3>${t}</h3>${inner}</section>`;
  const rowx = (main, act) => `<div class="row" style="justify-content:space-between;border-top:1px solid var(--line);padding:10px 0;gap:10px"><span style="flex:1;min-width:200px">${main}</span><span class="row" style="gap:8px">${act}</span></div>`;

  el.innerHTML = `<div class="stack" style="gap:16px">
    <h2 style="margin-top:12px">Project room</h2>
    <p class="hint">Everything here shows in the business's home base, except draft shortlist entries.</p>
    ${sec('Setup', `<form id="rmSetup" class="stack" style="gap:12px">
      <label class="f">Business account<select name="org_id"><option value="">Not linked yet</option>${(orgs.data || []).map(o => `<option value="${o.id}" ${o.id === b.org_id ? 'selected' : ''}>${esc(o.name)}</option>`).join('')}</select></label>
      <label class="f">Project title (what the business sees)<input name="title" value="${esc(b.title || '')}" placeholder="Lobby mural, Ashby Hotel"></label>
      <label class="f">Stage<select name="stage">${opts(STAGES.map(s => s[0]), b.stage, v => STAGES.find(s => s[0] === v)[1])}</select></label>
      <div><button class="btn btn-sm" type="submit">Save setup</button></div></form>
      ${!b.org_id ? '<p class="hint">If they have no account yet, ask them to create a business account with the brief email. It links automatically.</p>' : ''}`)}
    ${sec('Shortlist', `${M.map(m => rowx(`<b>${esc(nameOf(m.artist_id))}</b> · ${esc(m.fee_range || '')}<br><span class="hint">${esc(m.reason || '')}</span>`, `<select data-mst="${m.id}">${opts(['draft', 'proposed', 'concept_requested', 'selected', 'declined'], m.status)}</select><button class="linkbtn" data-mdel="${m.id}">Remove</button>`)).join('') || '<p class="hint">No creatives proposed yet.</p>'}
      <form id="rmMatch" class="stack" style="gap:10px;border-top:1px solid var(--line);padding-top:12px">
        <label class="f">Creative<select name="artist_id" required><option value="">Choose a vetted creative</option>${A.filter(a => !M.some(m => m.artist_id === a.id)).map(a => `<option value="${a.id}">${esc(a.display_name || 'Unnamed')} · ${esc(a.creative_field || '')} · ${esc(a.city_state || '')} (${esc(a.status)})</option>`).join('')}</select></label>
        <label class="f">Why they fit (the business reads this)<textarea name="reason" maxlength="1000" placeholder="Calm, layered color work; delivered two hospitality walls on schedule."></textarea></label>
        <div class="row"><label class="f" style="flex:1">Likely fee<input name="fee_range" placeholder="$8,000 to $12,000"></label><label class="f">Show to business?<select name="status"><option value="draft">Draft (hidden)</option><option value="proposed">Proposed (visible)</option></select></label></div>
        <div><button class="btn btn-sm" type="submit">Add to shortlist</button></div></form>`)}
    ${sec(`Budget · ${money(total)}`, `${L.map(l => rowx(`${esc(l.label)} <span class="hint">· ${CAT[l.category]}${l.note ? ' · ' + esc(l.note) : ''}</span>`, `<b>${money(l.amount)}</b><button class="linkbtn" data-ldel="${l.id}">Remove</button>`)).join('') || '<p class="hint">No lines yet.</p>'}
      <form id="rmLine" class="row" style="align-items:flex-end;border-top:1px solid var(--line);padding-top:12px">
        <label class="f">Category<select name="category">${opts(Object.keys(CAT), 'creative_fee', v => CAT[v])}</select></label>
        <label class="f" style="flex:1;min-width:160px">Label<input name="label" required placeholder="Creative fee, Micah The Artyst"></label>
        <label class="f" style="width:130px">Amount<input name="amount" type="number" min="0" step="1" required></label>
        <label class="f" style="flex:1;min-width:140px">Note<input name="note" placeholder="optional"></label>
        <button class="btn btn-sm" type="submit">Add line</button></form>`)}
    ${sec('Milestones', `${MI.map(m => rowx(`<b>${esc(m.title)}</b> · ${money(m.amount)}${m.due_date ? ' · due ' + m.due_date : ''}<br><span class="hint">${esc(m.detail || '')}${m.approved_at ? ' Approved ' + new Date(m.approved_at).toLocaleDateString() : ''}</span>`, `<select data-msst="${m.id}">${opts(MS, m.status)}</select><button class="linkbtn" data-msdel="${m.id}">Remove</button>`)).join('') || '<p class="hint">No milestones yet. Set one to "ready" when the business should approve it.</p>'}
      <form id="rmMile" class="row" style="align-items:flex-end;border-top:1px solid var(--line);padding-top:12px">
        <label class="f" style="flex:1;min-width:180px">Title<input name="title" required placeholder="Concept approved, materials released"></label>
        <label class="f" style="width:130px">Amount<input name="amount" type="number" min="0" step="1"></label>
        <label class="f">Due<input name="due_date" type="date"></label>
        <label class="f" style="flex:1;min-width:180px">Detail<input name="detail" placeholder="What approval means"></label>
        <button class="btn btn-sm" type="submit">Add milestone</button></form>`)}
    ${sec('Documents', `${D.map(d => rowx(`<a href="${esc(d.url)}" target="_blank" rel="noopener">${esc(d.title)}</a> <span class="hint">· ${d.kind}</span>`, `<button class="linkbtn" data-ddel="${d.id}">Remove</button>`)).join('') || '<p class="hint">No documents yet.</p>'}
      <form id="rmDoc" class="row" style="align-items:flex-end;border-top:1px solid var(--line);padding-top:12px">
        <label class="f">Kind<select name="kind">${opts(KIND, 'scope')}</select></label>
        <label class="f" style="flex:1;min-width:160px">Title<input name="title" required></label>
        <label class="f" style="flex:2;min-width:200px">Link (https://, for example a Google Drive share link)<input name="url" type="url" required></label>
        <button class="btn btn-sm" type="submit">Add</button></form>`)}
    ${sec('Feedback from the business', `${F.map(f => `<div style="border-top:1px solid var(--line);padding:10px 0"><span class="tag">${esc(f.lens)}</span> <span class="hint">${esc(f.author_name || '')} · ${new Date(f.created_at).toLocaleString()}</span><p style="margin-top:6px">${esc(f.body)}</p></div>`).join('') || '<p class="hint">Nothing yet.</p>'}
      <form id="rmNote" class="stack" style="gap:10px;border-top:1px solid var(--line);padding-top:12px"><label class="f">Reply as SOV (shows as a note)<textarea name="body" required maxlength="2000"></textarea></label><div><button class="btn btn-sm" type="submit">Post note</button></div></form>`)}
    ${b.org_id ? sec('Add to their collection', `${I.map(x => rowx(`<b>${esc(x.title)}</b> <span class="hint">· ${esc(x.creative_name || '')} · ${esc(x.location || '')}</span>`, `<button class="linkbtn" data-idel="${x.id}">Remove</button>`)).join('')}
      <form id="rmItem" class="stack" style="gap:10px;${I.length ? 'border-top:1px solid var(--line);padding-top:12px' : ''}">
        <div class="row"><label class="f" style="flex:1">Title<input name="title" required></label><label class="f" style="flex:1">Creative<input name="creative_name"></label></div>
        <div class="row"><label class="f" style="flex:1">Medium<input name="medium"></label><label class="f">Size<input name="size"></label><label class="f" style="width:100px">Year<input name="year"></label></div>
        <div class="row"><label class="f" style="flex:1">Location<input name="location" placeholder="Main lobby, north wall"></label><label class="f">Ownership<select name="ownership">${opts(['owned', 'on_loan', 'rotation', 'licensed'], 'owned')}</select></label><label class="f">Installed<input name="installed_on" type="date"></label><label class="f">Next rotation<input name="next_rotation" type="date"></label></div>
        <div class="row"><label class="f" style="flex:1">Photo link (https://)<input name="image_url" type="url"></label><label class="f" style="width:150px">Insured value<input name="value" type="number" min="0"></label></div>
        <label class="f">Care notes<textarea name="care" placeholder="Dust with a soft dry cloth. Keep out of direct sun."></textarea></label>
        <label class="f">Rights<textarea name="rights" placeholder="Creative keeps copyright. Business may photograph for marketing."></textarea></label>
        <div><button class="btn btn-sm" type="submit">Add to collection</button></div></form>`) : ''}
  </div>`;

  const done = async (r, msg) => { if (r.error) { toast('Could not save: ' + r.error.message); console.error(r.error); return false; } toast(msg || 'Saved'); await window.renderRoom(b, el, onChange); return true; };
  const vals = (f) => { const d = Object.fromEntries(new FormData(f)); Object.keys(d).forEach(k => { d[k] = String(d[k]).trim(); if (d[k] === '') d[k] = null; }); return d; };
  $('#rmSetup', el).onsubmit = async (e) => { e.preventDefault(); const d = vals(e.target); const r = await sb.from('briefs').update({ org_id: d.org_id, title: d.title, stage: d.stage }).eq('id', b.id).select().single(); if (!r.error) { Object.assign(b, r.data); onChange && onChange(); } else toast('Could not save: ' + r.error.message); };
  $('#rmMatch', el).onsubmit = async (e) => { e.preventDefault(); const d = vals(e.target); if (!d.artist_id) return; done(await sb.from('matches').insert({ brief_id: b.id, ...d }), 'Added to shortlist'); };
  $('#rmLine', el).onsubmit = async (e) => { e.preventDefault(); const d = vals(e.target); done(await sb.from('budget_lines').insert({ brief_id: b.id, ...d, amount: Number(d.amount), position: L.length }), 'Line added'); };
  $('#rmMile', el).onsubmit = async (e) => { e.preventDefault(); const d = vals(e.target); done(await sb.from('milestones').insert({ brief_id: b.id, ...d, amount: d.amount ? Number(d.amount) : null, position: MI.length }), 'Milestone added'); };
  $('#rmDoc', el).onsubmit = async (e) => { e.preventDefault(); const d = vals(e.target); if (!/^https:\/\//.test(d.url || '')) { toast('Links must start with https://'); return; } done(await sb.from('documents').insert({ brief_id: b.id, org_id: b.org_id, ...d }), 'Document added'); };
  $('#rmNote', el).onsubmit = async (e) => { e.preventDefault(); const d = vals(e.target); done(await sb.from('feedback').insert({ brief_id: b.id, lens: 'note', body: d.body, author: me.id, author_name: 'SOV team' }), 'Note posted'); };
  const it = $('#rmItem', el); if (it) it.onsubmit = async (e) => { e.preventDefault(); const d = vals(e.target); d.value = d.value ? Number(d.value) : null; done(await sb.from('collection_items').insert({ org_id: b.org_id, brief_id: b.id, ...d }), 'Added to collection'); };
  $$('[data-mst]', el).forEach(s => s.onchange = async () => done(await sb.from('matches').update({ status: s.value }).eq('id', s.dataset.mst)));
  $$('[data-msst]', el).forEach(s => s.onchange = async () => done(await sb.from('milestones').update({ status: s.value }).eq('id', s.dataset.msst)));
  const del = (attr, table) => $$(`[${attr}]`, el).forEach(x => x.onclick = async () => { if (!confirm('Remove this?')) return; done(await sb.from(table).delete().eq('id', x.getAttribute(attr)), 'Removed'); });
  del('data-mdel', 'matches'); del('data-ldel', 'budget_lines'); del('data-msdel', 'milestones'); del('data-ddel', 'documents'); del('data-idel', 'collection_items');
};

// SOV business home base: one place to follow every project, approve money, give feedback and keep the collection.
(async function () {
  const C = window.SOV_CONFIG;
  $('#out').addEventListener('click', signOut);
  const user = await requireUser(); if (!user) return;
  try { await sb.rpc('accept_invites'); } catch (e) { /* fine */ }

  let org = null, me = null, members = [], invites = [], briefs = [], lines = [], miles = [], docs = [], items = [], staff = false;
  const fbCache = {}, matchCache = {}, urls = {};

  const STAGES = [
    ['brief', 'Brief', 'We read your brief and may ask a question or two. If it helps, a short call to walk the space.'],
    ['shortlist', 'Shortlist', 'Three to five vetted creatives and why each one fits. You choose who gets a paid concept.'],
    ['concept', 'Concepts', 'Chosen creatives develop paid concepts. Your team responds in the shared language.'],
    ['scope', 'Scope', 'One agreement: every cost on its own line, insurance, schedule and rights in writing.'],
    ['make', 'Making', 'The work gets made. You approve each milestone before money moves.'],
    ['install', 'Install', 'Delivery, install and a condition report, scheduled around your operations.'],
    ['complete', 'Complete', 'Photos, closeout documents, care notes and your impact summary.']
  ];
  const stageIdx = (s) => Math.max(0, STAGES.findIndex(x => x[0] === s));
  const CAT = { creative_fee: 'Creative fee', materials: 'Materials', fabrication: 'Fabrication', shipping: 'Packing and shipping', install: 'Install', permits: 'Permits and engineering', insurance: 'Insurance', documentation: 'Photo and video', sov_fee: 'SOV fee', other: 'Other' };
  const LENS = { see: ['See', '#E9B23A', '#141413', 'The first thing that caught my eye was...'], hear: ['Hear', '#D9622B', '#141413', 'It reminds me of the sound of...'], feel: ['Feel', '#9E2338', '#fff', 'The part that touched me was...'], think: ['Think', '#5E3F94', '#fff', 'It makes me wonder about...'], experience: ['Experience', '#2F7A55', '#fff', 'Walking past it every day, I would...'], note: ['Note', '#E6E1D5', '#141413', 'A question or practical note for the team'] };
  const money = (n) => n == null ? '' : '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
  const day = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
  const titleOf = (b) => b.title || [b.creative_types?.[0], b.space_type].filter(Boolean).join(', ') || 'New brief';
  const isOwner = () => me && me.role === 'owner';

  async function load() {
    const m = await sb.from('org_members').select('*, orgs(*)').eq('user_id', user.id).limit(1);
    if (!m.data || !m.data.length) return false;
    me = m.data[0]; org = me.orgs;
    const [mm, inv, br, st] = await Promise.all([
      sb.from('org_members').select('*').eq('org_id', org.id).order('created_at'),
      sb.from('org_invites').select('*').eq('org_id', org.id).is('accepted_at', null).order('created_at'),
      sb.from('briefs').select('*').eq('org_id', org.id).order('created_at', { ascending: false }),
      sb.rpc('is_staff')
    ]);
    members = mm.data || []; invites = inv.data || []; briefs = br.data || []; staff = !!st.data;
    const ids = briefs.map(b => b.id);
    if (ids.length) {
      const [l, ms, d] = await Promise.all([
        sb.from('budget_lines').select('*').in('brief_id', ids).order('position').order('created_at'),
        sb.from('milestones').select('*').in('brief_id', ids).order('position').order('created_at'),
        sb.from('documents').select('*').or(`brief_id.in.(${ids.join(',')}),org_id.eq.${org.id}`).order('created_at', { ascending: false })
      ]);
      lines = l.data || []; miles = ms.data || []; docs = d.data || [];
    } else {
      const d = await sb.from('documents').select('*').eq('org_id', org.id); docs = d.data || [];
    }
    const it = await sb.from('collection_items').select('*').eq('org_id', org.id).order('installed_on', { ascending: false, nullsFirst: false });
    items = it.data || [];
    return true;
  }

  const totalOf = (bid) => lines.filter(l => l.brief_id === bid).reduce((s, l) => s + Number(l.amount), 0);
  const creativeOf = (bid) => lines.filter(l => l.brief_id === bid && l.category === 'creative_fee').reduce((s, l) => s + Number(l.amount), 0);
  const readyMiles = () => miles.filter(m => m.status === 'ready');
  const active = () => briefs.filter(b => !['complete', 'paused'].includes(b.stage));

  function stagebar(b) {
    const i = stageIdx(b.stage);
    return `<div class="stagebar" aria-label="Stage ${i + 1} of ${STAGES.length}: ${STAGES[i][1]}">${STAGES.map((s, k) => `<span class="${k < i || b.stage === 'complete' ? 'done' : k === i ? 'now' : ''}"></span>`).join('')}</div>
      <div class="stagelabels">${STAGES.map((s, k) => `<span class="${k === i ? 'now' : ''}">${s[1]}</span>`).join('')}</div>`;
  }
  function projRow(b) {
    const t = totalOf(b.id), r = readyMiles().filter(m => m.brief_id === b.id).length;
    return `<a class="proj" href="#project/${b.id}"><div class="top"><div class="stack" style="gap:4px"><span class="eyb">${esc(b.sector || 'Project')}${b.city_state ? ' · ' + esc(b.city_state) : ''}</span><h3>${esc(titleOf(b))}</h3></div>
      <div class="row" style="gap:10px">${r ? `<span class="pill ready">${r} to approve</span>` : ''}${b.stage === 'paused' ? '<span class="pill">Paused</span>' : `<span class="pill">${STAGES[stageIdx(b.stage)][1]}</span>`}<span class="hint">${t ? money(t) : esc(b.budget_range || '')}</span></div></div>${stagebar(b)}</a>`;
  }

  const views = {};

  views.home = () => {
    const committed = active().reduce((s, b) => s + totalOf(b.id), 0);
    const allTotal = briefs.reduce((s, b) => s + totalOf(b.id), 0), allCreative = briefs.reduce((s, b) => s + creativeOf(b.id), 0);
    const todos = [];
    readyMiles().forEach(m => { const b = briefs.find(x => x.id === m.brief_id); todos.push([`Approve "${m.title}"${m.amount ? ' · ' + money(m.amount) : ''}`, `${esc(titleOf(b))}. Money moves only after you approve.`, `#project/${b.id}/money`]); });
    briefs.filter(b => b.stage === 'shortlist').forEach(b => todos.push(['Review your shortlist', `${esc(titleOf(b))}. Choose who gets a paid concept.`, `#project/${b.id}/shortlist`]));
    if (members.length < 2 && !invites.length) todos.push(['Bring in your team', 'Invite your designer, facilities lead or procurement contact so approvals don\'t stall.', '#team']);
    if (!org.payment_terms && !org.vendor_portal) todos.push(['Add your vendor requirements', 'Payment terms, vendor portal and who signs off. We set up paperwork once, the way your team needs it.', '#company']);
    if (!briefs.length) todos.push(['Send your first brief', 'About 4 minutes. Nothing is booked until you sign a scope.', '../brief.html']);
    const first = (me.name || user.user_metadata?.display_name || '').split(' ')[0];
    return `<div class="stack" style="gap:44px">
      <div class="stack" style="gap:10px"><span class="eyb">${esc(org.name)}</span><h1 class="disp">${first ? `Welcome back, <em>${esc(first)}.</em>` : 'Your <em>projects.</em>'}</h1></div>
      <div class="kpis">
        <div class="kpi"><b>${active().length}</b><span>Active projects</span></div>
        <div class="kpi"><b>${committed ? money(committed) : '$0'}</b><span>In active budgets</span></div>
        <div class="kpi"><b>${allTotal ? Math.round(allCreative / allTotal * 100) + '%' : '·'}</b><span>Reaching creatives directly</span></div>
        <div class="kpi"><b>${readyMiles().length}</b><span>Waiting on your approval</span></div>
      </div>
      <div class="grid-main">
        <section class="stack" style="gap:0">
          <div class="row" style="justify-content:space-between;margin-bottom:12px"><h2>Projects</h2><a class="btn btn-sm" href="../brief.html">New brief</a></div>
          ${briefs.length ? briefs.slice(0, 6).map(projRow).join('') : `<div class="empty hair stack" style="gap:12px"><p class="hint" style="font-size:16px">No projects yet. Your first brief takes about 4 minutes, and a real person reads it.</p><div><a class="btn" href="../brief.html">Start a brief</a></div></div>`}
        </section>
        <aside class="stack" style="gap:28px">
          <section><h2 style="margin-bottom:8px">Needs you</h2>${todos.length ? todos.map(t => `<a class="todo" href="${t[2]}" style="text-decoration:none;color:inherit"><span class="dotc"></span><span><b style="display:block">${t[0]}</b><span class="hint">${t[1]}</span></span></a>`).join('') : '<p class="hint hair" style="padding-top:16px">Nothing waiting on you. We\'ll flag it here when something is.</p>'}</section>
          <section class="card pad stack" style="gap:10px"><span class="eyb">Your SOV contact</span><p>Questions about a project, budget or paperwork? Write to us and a person answers.</p><a href="mailto:${esc(C.contactEmail)}">${esc(C.contactEmail)}</a></section>
        </aside>
      </div></div>`;
  };

  views.projects = () => `<div class="stack" style="gap:28px">
      <div class="row" style="justify-content:space-between;align-items:flex-end"><div class="stack" style="gap:8px"><span class="eyb">${esc(org.name)}</span><h1 class="disp">Projects</h1></div><a class="btn" href="../brief.html">New brief</a></div>
      <div>${briefs.length ? briefs.map(projRow).join('') : '<p class="hint hair" style="padding-top:20px">No projects yet.</p>'}</div></div>`;

  async function signWorks(cards) {
    const paths = cards.flatMap(c => (c.works || []).map(w => w.image_path).filter(Boolean)).filter(p => !urls[p]);
    if (!paths.length) return;
    const { data } = await sb.storage.from('artworks').createSignedUrls(paths, 3600);
    (data || []).forEach(d => { if (d.signedUrl) urls[d.path] = d.signedUrl; });
  }

  async function projectView(id, tab) {
    const b = briefs.find(x => x.id === id);
    if (!b) return `<p class="hint">We couldn't find that project. <a href="#projects">See all projects</a></p>`;
    tab = tab || 'overview';
    const i = stageIdx(b.stage);
    const bl = lines.filter(l => l.brief_id === id), bm = miles.filter(m => m.brief_id === id), bd = docs.filter(d => d.brief_id === id);
    const tabs = [['overview', 'Overview'], ['shortlist', 'Shortlist'], ['money', 'Budget and approvals'], ['feedback', 'Feedback'], ['docs', 'Documents']];
    let body = '';
    if (tab === 'overview') {
      body = `<div class="grid-main"><ol class="timeline2">${STAGES.map((s, k) => `<li class="${b.stage === 'complete' || k < i ? 'done' : k === i ? 'now' : 'later'}"><span class="mk"></span><span><b style="display:block">${s[1]}${k === i && b.stage !== 'complete' ? ' <span class="pill ready" style="margin-left:8px">Now</span>' : ''}</b><span class="hint">${s[2]}</span></span></li>`).join('')}</ol>
        <aside class="card pad stack" style="gap:12px"><span class="eyb">Your brief</span>
          ${[['Space', [b.space_type, b.city_state, b.country].filter(Boolean).join(', ')], ['What it should do', (b.outcomes || []).join(', ')], ['Creative work', (b.creative_types || []).join(', ')], ['Budget', [b.budget_range, b.budget_source].filter(Boolean).join(' · ')], ['Timing', b.needed_by], ['How you hire', b.procurement_path], ['Sent', day(b.created_at)]].filter(r => r[1]).map(r => `<div><span class="hint" style="display:block;font-size:13px">${r[0]}</span>${esc(r[1])}</div>`).join('')}
        </aside></div>`;
    }
    if (tab === 'shortlist') {
      if (!matchCache[id]) { const r = await sb.rpc('match_cards', { b: id }); matchCache[id] = r.data || []; await signWorks(matchCache[id]); }
      const cards = matchCache[id];
      const st = { proposed: ['Proposed', ''], concept_requested: ['Paid concept requested', 'ready'], selected: ['Selected', 'approved'], declined: ['Not this time', ''] };
      body = cards.length ? `<p class="hint" style="max-width:640px">Every creative here was vetted by video call. Their contact details stay private until both sides say yes. Choose who should develop a paid concept.</p>` + cards.map(c => `<article class="mcard">
          <div class="imgs">${(c.works || []).slice(0, 3).map(w => w.image_path ? `<img src="${esc(urls[w.image_path] || '')}" alt="${esc(w.title || 'Work sample')}" loading="lazy">` : w.link_url ? `<a class="lt" href="${esc(w.link_url)}" target="_blank" rel="noopener"><span aria-hidden="true">${w.kind === 'audio' ? '♪' : '▶'}</span>Open ${esc(w.kind || 'link')}</a>` : '').join('')}</div>
          <div class="stack" style="gap:12px"><div class="row" style="justify-content:space-between"><span class="eyb">${esc(c.creative_field || (c.disciplines || [])[0] || 'Creative')}${c.city ? ' · ' + esc(c.city) : ''}</span><span class="pill ${st[c.status][1]}">${st[c.status][0]}</span></div>
            <h3>${esc(c.display_name || 'Creative')}</h3>
            ${c.reason ? `<p class="why">${esc(c.reason)}</p>` : ''}
            ${c.bio ? `<p class="hint">${esc(c.bio)}</p>` : ''}
            ${c.fee_range ? `<p><span class="hint">Likely fee</span> ${esc(c.fee_range)}</p>` : ''}
            ${c.status === 'proposed' ? `<div class="row"><button class="btn btn-sm" data-choose="${c.match_id}" data-c="concept_requested">Request a paid concept</button><button class="linkbtn" data-choose="${c.match_id}" data-c="declined">Not this time</button></div>` : ''}
            ${c.status === 'concept_requested' ? `<div class="row"><button class="btn btn-sm" data-choose="${c.match_id}" data-c="selected">Select for this project</button></div>` : ''}
          </div></article>`).join('') : `<div class="empty hair"><p class="hint" style="font-size:16px">Your shortlist appears here once our curator has checked every match. Usually within two weeks of a full brief.</p></div>`;
    }
    if (tab === 'money') {
      const total = bl.reduce((s, l) => s + Number(l.amount), 0), cre = bl.filter(l => l.category === 'creative_fee').reduce((s, l) => s + Number(l.amount), 0);
      const msPill = { upcoming: ['Upcoming', ''], ready: ['Ready for you', 'ready'], approved: ['Approved', 'approved'], paid: ['Paid', 'paid'] };
      body = `<div class="grid-main"><section class="stack" style="gap:12px"><h2>Budget</h2>${bl.length ? `<table class="money"><thead><tr><th>Line</th><th class="n">Amount</th></tr></thead><tbody>
          ${bl.map(l => `<tr class="${l.category === 'sov_fee' ? 'sov' : ''}"><td>${esc(l.label)}${(l.label !== CAT[l.category] || l.note) ? `<br><span class="hint">${l.label !== CAT[l.category] ? esc(CAT[l.category]) : ''}${l.label !== CAT[l.category] && l.note ? ' · ' : ''}${l.note ? esc(l.note) : ''}</span>` : ''}</td><td class="n">${money(l.amount)}</td></tr>`).join('')}
          <tr class="total"><td>Total</td><td class="n">${money(total)}</td></tr></tbody></table>
          <p class="hint">${total ? Math.round(cre / total * 100) : 0}% of this budget goes to the creative's own fee. Materials, install and our fee each sit on their own line.</p>` : '<p class="hint hair" style="padding-top:16px">Your line-by-line budget appears here when we draft the scope. Nothing is booked until you sign it.</p>'}</section>
        <section class="stack" style="gap:12px"><h2>Milestones</h2>${bm.length ? bm.map(m => `<div class="ms"><div><b>${esc(m.title)}</b>${m.amount ? ` · ${money(m.amount)}` : ''}<br><span class="hint">${esc(m.detail || '')}${m.due_date ? ' Due ' + day(m.due_date) + '.' : ''}${m.approved_at ? ' Approved ' + day(m.approved_at) + '.' : ''}</span></div>
          <div class="row" style="gap:10px"><span class="pill ${msPill[m.status][1]}">${msPill[m.status][0]}</span>${m.status === 'ready' ? `<button class="btn btn-sm" data-approve="${m.id}">Approve</button>` : ''}</div></div>`).join('') : '<p class="hint hair" style="padding-top:16px">Payment milestones appear here once the scope is signed. Money moves only after you approve each one.</p>'}
          <p class="hint">Not ready to approve? Leave a note in <a href="#project/${id}/feedback">Feedback</a> and we'll sort it with the creative.</p></section></div>`;
    }
    if (tab === 'feedback') {
      if (!fbCache[id]) { const r = await sb.from('feedback').select('*').eq('brief_id', id).order('created_at', { ascending: false }); fbCache[id] = r.data || []; }
      body = `<div class="grid-main"><section class="stack" style="gap:0"><h2 style="margin-bottom:12px">What your team noticed</h2>${fbCache[id].length ? fbCache[id].map(f => `<div class="fb"><span class="tagx" style="background:${LENS[f.lens][1]};color:${LENS[f.lens][2]}">${LENS[f.lens][0]}</span><span class="hint">${esc(f.author_name || '')} · ${day(f.created_at)}</span><p style="margin-top:8px">${esc(f.body)}</p></div>`).join('') : '<p class="hint hair" style="padding-top:16px">No feedback yet. Share what you notice about a concept, and we pass it to the creative in words they can use.</p>'}</section>
        <form class="card pad stack" id="fbForm" style="gap:14px"><h3>Add feedback</h3><p class="hint">Pick a lens. It helps the creative hear something they can use.</p>
          <div class="lens">${Object.entries(LENS).map(([k, v], n) => `<label><input type="radio" name="lens" value="${k}" ${n === 0 ? 'checked' : ''}><span style="background:${v[1]};color:${v[2]}">${v[0]}</span></label>`).join('')}</div>
          <label class="f"><span id="lensHint">${LENS.see[3]}</span><textarea name="body" required maxlength="2000"></textarea></label>
          <div><button class="btn btn-sm" type="submit">Share with the team</button></div></form></div>`;
    }
    if (tab === 'docs') {
      const KIND = { scope: 'Scope', contract: 'Contract', coi: 'Certificate of insurance', w9: 'W-9', invoice: 'Invoice', concept: 'Concept', permit: 'Permit', closeout: 'Closeout', report: 'Report', other: 'Document' };
      body = bd.length ? `<div class="docs">${bd.map(d => `<a href="${esc(d.url)}" target="_blank" rel="noopener"><span class="pill">${KIND[d.kind]}</span><b>${esc(d.title)}</b><span class="hint">${day(d.created_at)}</span></a>`).join('')}</div>` : '<p class="hint hair" style="padding-top:20px">Scopes, contracts, insurance certificates, invoices and closeout documents collect here as the project moves.</p>';
    }
    return `<div class="stack" style="gap:28px">
      <a href="#projects" class="hint" style="text-decoration:none">← All projects</a>
      <div class="stack" style="gap:10px"><span class="eyb">${esc(b.sector || 'Project')}${b.city_state ? ' · ' + esc(b.city_state) : ''}</span><h1 class="disp">${esc(titleOf(b))}</h1></div>
      ${stagebar(b)}
      <nav class="tabs" aria-label="Project sections">${tabs.map(t => `<a href="#project/${id}/${t[0]}" ${t[0] === tab ? 'aria-current="page"' : ''}>${t[1]}</a>`).join('')}</nav>
      ${body}</div>`;
  }

  views.collection = () => `<div class="stack" style="gap:28px">
      <div class="stack" style="gap:8px"><span class="eyb">${esc(org.name)}</span><h1 class="disp">Collection</h1><p class="hint" style="max-width:620px;font-size:16px">Every finished work, where it lives, who made it, how to care for it and what rights you hold. Handy for insurance, facilities and the next rotation.</p></div>
      ${items.length ? `<div class="gallery">${items.map(x => `<figure>${x.image_url ? `<img src="${esc(x.image_url)}" alt="${esc(x.title)}" loading="lazy">` : '<div style="aspect-ratio:4/3;background:var(--soft)"></div>'}<figcaption class="stack" style="gap:4px"><b style="font-family:'Instrument Serif',serif;font-weight:400;font-size:22px">${esc(x.title)}</b><span class="hint">${esc([x.creative_name, x.medium, x.size, x.year].filter(Boolean).join(' · '))}</span><span class="hint">${esc(x.location || '')}${x.ownership !== 'owned' ? ' · ' + esc(x.ownership.replace('_', ' ')) : ''}${x.next_rotation ? ' · rotates ' + day(x.next_rotation) : ''}</span>${x.care ? `<details><summary class="hint" style="cursor:pointer">Care and rights</summary><p class="hint" style="margin-top:6px">${esc(x.care)}</p>${x.rights ? `<p class="hint">${esc(x.rights)}</p>` : ''}</details>` : ''}</figcaption></figure>`).join('')}</div>`
        : `<div class="empty hair"><p class="hint" style="font-size:16px">Finished works land here with photos, location, care notes and rights. If you'd like work that changes each season, ask us about a rotation program.</p></div>`}</div>`;

  views.reports = () => {
    const done = briefs.filter(b => b.stage === 'complete');
    const by = {}; lines.forEach(l => { by[l.category] = (by[l.category] || 0) + Number(l.amount); });
    const total = Object.values(by).reduce((a, b) => a + b, 0);
    const order = ['creative_fee', 'materials', 'fabrication', 'shipping', 'install', 'permits', 'insurance', 'documentation', 'other', 'sov_fee'];
    const approved = miles.filter(m => ['approved', 'paid'].includes(m.status)).reduce((s, m) => s + Number(m.amount || 0), 0);
    return `<div class="stack" style="gap:36px">
      <div class="row" style="justify-content:space-between;align-items:flex-end"><div class="stack" style="gap:8px"><span class="eyb">${esc(org.name)}</span><h1 class="disp">Reports</h1><p class="hint" style="max-width:620px;font-size:16px">A plain summary for your owners, board or council: what was spent, on what, and how much reached the people who made the work.</p></div><button class="btn btn-ghost btn-sm" id="printBtn">Print a board summary</button></div>
      <div class="kpis"><div class="kpi"><b>${briefs.length}</b><span>Projects started</span></div><div class="kpi"><b>${done.length}</b><span>Completed</span></div><div class="kpi"><b>${money(total) || '$0'}</b><span>Budgeted across projects</span></div><div class="kpi"><b>${money(approved) || '$0'}</b><span>Approved and released</span></div></div>
      <section class="stack" style="gap:14px"><h2>Where the money goes</h2>${total ? `<table class="money">${order.filter(k => by[k]).map(k => `<tr><td style="width:40%">${CAT[k]}</td><td><div style="height:10px;border-radius:5px;background:${k === 'creative_fee' ? '#D9622B' : k === 'sov_fee' ? '#141413' : '#C9C3B4'};width:${Math.max(2, by[k] / total * 100)}%"></div></td><td class="n" style="width:120px">${money(by[k])} · ${Math.round(by[k] / total * 100)}%</td></tr>`).join('')}</table>
        <p class="hint">${Math.round((by.creative_fee || 0) / total * 100)}% reached creatives as their own fee. Art consultants often take 15 to 20 percent without showing the split; ours is always on its own line.</p>` : '<p class="hint hair" style="padding-top:16px">Your spending summary fills in as project budgets are set.</p>'}</section>
      <section class="stack" style="gap:14px"><h2>Collection</h2><p>${items.length} works on record${items.length ? ', across ' + new Set(items.map(x => x.location).filter(Boolean)).size + ' locations' : ''}.</p></section></div>`;
  };

  views.team = () => `<div class="stack" style="gap:32px;max-width:860px">
      <div class="stack" style="gap:8px"><span class="eyb">${esc(org.name)}</span><h1 class="disp">Team</h1><p class="hint" style="font-size:16px">Projects move faster when everyone who signs off can see the same thing. Owners, designers, facilities, marketing and procurement often all have a say.</p></div>
      <section><h2 style="margin-bottom:8px">People</h2>${members.map(m => `<div class="todo"><span class="avatar" aria-hidden="true">${esc(initials(m.name || '?'))}</span><span style="flex:1"><b>${esc(m.name || 'Team member')}</b>${m.user_id === user.id ? ' <span class="hint">(you)</span>' : ''}<br><span class="hint">${esc(m.title || '')}${m.title ? ' · ' : ''}${m.role === 'owner' ? 'Account owner' : 'Member'}</span></span>${isOwner() && m.user_id !== user.id ? `<button class="linkbtn" data-rm="${m.user_id}">Remove</button>` : ''}</div>`).join('')}</section>
      ${invites.length ? `<section><h2 style="margin-bottom:8px">Invited</h2>${invites.map(v => `<div class="todo"><span class="dotc"></span><span style="flex:1"><b>${esc(v.email)}</b><br><span class="hint">Invited ${day(v.created_at)}</span></span>${isOwner() ? `<button class="linkbtn" data-uninv="${v.id}">Cancel</button>` : ''}</div>`).join('')}</section>` : ''}
      ${isOwner() ? `<form class="card pad stack" id="invForm" style="gap:14px"><h3>Invite a colleague</h3><p class="hint">They create an account with this email and join your team automatically. We'll open an email you can send them.</p>
        <div class="row" style="align-items:flex-end"><label class="f" style="flex:1;min-width:240px">Their work email<input type="email" name="email" required></label><button class="btn btn-sm" type="submit">Invite</button></div></form>` : '<p class="hint">Only the account owner can invite or remove people.</p>'}
      <section class="stack" style="gap:8px"><h3>Your profile</h3><form id="meForm" class="formgrid"><label class="f">Your name<input name="name" value="${esc(me.name || '')}"></label><label class="f">Your role<input name="title" value="${esc(me.title || '')}" placeholder="Owner, GM, designer, facilities..."></label><div><button class="btn btn-ghost btn-sm" type="submit">Save</button></div></form></section></div>`;

  views.company = () => {
    const f = (k, l, ph, area) => `<label class="f">${l}${area ? `<textarea name="${k}" placeholder="${esc(ph || '')}" ${isOwner() ? '' : 'disabled'}>${esc(org[k] || '')}</textarea>` : `<input name="${k}" value="${esc(org[k] || '')}" placeholder="${esc(ph || '')}" ${isOwner() ? '' : 'disabled'}>`}</label>`;
    return `<form class="stack" id="orgForm" style="gap:32px;max-width:900px">
      <div class="stack" style="gap:8px"><span class="eyb">Company</span><h1 class="disp">${esc(org.name)}</h1><p class="hint" style="font-size:16px">Tell us how your organization buys, once. We set up insurance, invoices and paperwork to match, so your procurement team isn't chasing anyone.</p></div>
      <section class="stack" style="gap:16px"><h2>About</h2><div class="formgrid">${f('name', 'Organization name')}${f('sector', 'Type of organization', 'Hotel group, developer, health system, city...')}${f('city', 'City and state or region')}${f('country', 'Country', 'United States')}${f('website', 'Website', 'https://')}</div></section>
      <section class="stack" style="gap:16px"><h2>How you buy</h2><div class="formgrid">${f('billing_email', 'Where invoices go', 'ap@company.com')}${f('payment_terms', 'Payment terms', 'Net 30')}${f('vendor_portal', 'Vendor portal or setup link (optional)', 'Coupa, Ariba, or a link')}</div>
        ${f('approvers', 'Who signs off, and in what order', 'For example: GM approves concept, owner approves budget, facilities approves install dates', 1)}
        ${f('notes', 'Anything else we should know', 'Insurance minimums, union or venue rules, brand guidelines, quiet hours', 1)}</section>
      ${isOwner() ? '<div><button class="btn" type="submit">Save company details</button></div>' : '<p class="hint">Only the account owner can edit these details.</p>'}
      ${docs.filter(d => d.org_id && !d.brief_id).length ? `<section><h2 style="margin-bottom:8px">Company documents</h2><div class="docs">${docs.filter(d => d.org_id && !d.brief_id).map(d => `<a href="${esc(d.url)}" target="_blank" rel="noopener"><span class="pill">${esc(d.kind)}</span><b>${esc(d.title)}</b><span class="hint">${day(d.created_at)}</span></a>`).join('')}</div></section>` : ''}
    </form>`;
  };

  async function render() {
    const [name, id, tab] = (location.hash.slice(1) || 'home').split('/');
    const key = name === 'project' ? 'projects' : name;
    $$('#nav a[href^="#"]').forEach(a => a.setAttribute('aria-current', a.getAttribute('href') === '#' + key ? 'page' : 'false'));
    const html = name === 'project' ? await projectView(id, tab) : (views[name] || views.home)();
    $('#view').innerHTML = html; wire(name, id, tab);
  }

  function wire(name, id, tab) {
    $$('[data-approve]').forEach(btn => btn.onclick = async () => {
      if (!confirm('Approve this milestone? This tells us to release the payment.')) return;
      btn.disabled = true; const r = await sb.rpc('approve_milestone', { m: btn.dataset.approve });
      if (r.error) { toast('Could not approve. Please try again.'); btn.disabled = false; return; }
      const m = miles.find(x => x.id === btn.dataset.approve); Object.assign(m, { status: 'approved', approved_at: new Date().toISOString(), approved_by: user.id }); toast('Approved. Thank you.'); render();
    });
    $$('[data-choose]').forEach(btn => btn.onclick = async () => {
      btn.disabled = true; const r = await sb.rpc('choose_match', { m: btn.dataset.choose, choice: btn.dataset.c });
      if (r.error) { toast('Could not save that. Please try again.'); btn.disabled = false; return; }
      const c = (matchCache[id] || []).find(x => x.match_id === btn.dataset.choose); if (c) c.status = btn.dataset.c;
      toast(btn.dataset.c === 'declined' ? 'Noted.' : btn.dataset.c === 'selected' ? 'Selected. We\'ll draft the scope.' : 'Paid concept requested. We\'ll set it up.'); render();
    });
    const fb = $('#fbForm');
    if (fb) {
      $$('input[name=lens]', fb).forEach(r => r.onchange = () => { $('#lensHint').textContent = LENS[r.value][3]; });
      fb.onsubmit = async (e) => {
        e.preventDefault(); const d = new FormData(fb); const body = String(d.get('body') || '').trim(); if (!body) return;
        const rec = { brief_id: id, lens: d.get('lens'), body, author: user.id, author_name: me.name || user.email };
        const r = await sb.from('feedback').insert(rec).select().single();
        if (r.error) { toast('Could not share that. Please try again.'); return; }
        (fbCache[id] = fbCache[id] || []).unshift(r.data); toast('Shared with the SOV team'); render();
      };
    }
    const inv = $('#invForm');
    if (inv) inv.onsubmit = async (e) => {
      e.preventDefault(); const email = String(new FormData(inv).get('email') || '').trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast('Please check that email.'); return; }
      const r = await sb.from('org_invites').insert({ org_id: org.id, email, invited_by: user.id }).select().single();
      if (r.error) { toast('Could not add that invite.'); return; }
      invites.push(r.data); render();
      const link = new URL(`signup.html?type=business`, location.href).href;
      location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(`Join ${org.name} on SOV`)}&body=${encodeURIComponent(`Hi,\n\nI've added you to our team on SOV so you can follow our art and creative projects, see budgets and give feedback.\n\nCreate your account with this email address and you'll join our team automatically:\n${link}\n\nThanks,\n${me.name || ''}`)}`;
    };
    $$('[data-uninv]').forEach(b => b.onclick = async () => { await sb.from('org_invites').delete().eq('id', b.dataset.uninv); invites = invites.filter(v => v.id !== b.dataset.uninv); render(); });
    $$('[data-rm]').forEach(b => b.onclick = async () => { if (!confirm('Remove this person from your team?')) return; await sb.from('org_members').delete().eq('org_id', org.id).eq('user_id', b.dataset.rm); members = members.filter(m => m.user_id !== b.dataset.rm); render(); });
    const mf = $('#meForm');
    if (mf) mf.onsubmit = async (e) => { e.preventDefault(); const d = Object.fromEntries(new FormData(mf)); const r = await sb.from('org_members').update({ name: d.name || null, title: d.title || null }).eq('org_id', org.id).eq('user_id', user.id).select().single(); if (!r.error) { Object.assign(me, r.data); toast('Saved'); render(); } };
    const of = $('#orgForm');
    if (of && isOwner()) of.onsubmit = async (e) => {
      e.preventDefault(); const d = Object.fromEntries(new FormData(of)); Object.keys(d).forEach(k => d[k] = String(d[k]).trim() || null);
      if (!d.name) { toast('Please keep an organization name.'); return; }
      const r = await sb.from('orgs').update(d).eq('id', org.id).select().single();
      if (r.error) { toast('Could not save. Please try again.'); return; }
      org = r.data; toast('Saved'); render();
    };
    const pb = $('#printBtn'); if (pb) pb.onclick = () => window.print();
  }

  if (!(await load())) {
    $('#view').innerHTML = `<div class="stack" style="gap:16px;max-width:620px"><h1 class="disp">This account isn't linked to a business yet.</h1><p class="hint" style="font-size:16px">If a colleague invited you, make sure they used this email address, then refresh. If you're a creative, your dashboard is <a href="index.html">here</a>.</p></div>`;
    return;
  }
  $('#av').textContent = initials(me.name || user.email);
  if (staff) $('#teamLink').hidden = false;
  window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
  render();
})();

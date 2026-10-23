// SOV business home base: one place to follow every project, approve money, give feedback and keep the collection.
(async function () {
  const C = window.SOV_CONFIG;
  $('#out').addEventListener('click', signOut);
  const user = await requireUser(); if (!user) return;
  try { await sb.rpc('accept_invites'); } catch (e) { /* fine */ }

  let org = null, me = null, members = [], invites = [], briefs = [], lines = [], miles = [], docs = [], items = [], staff = false, opps = [], appCounts = {};
  const appCache = {};
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
  const isProgram = (b) => /program/i.test(b.engagement_mode || '');
  const tierOf = (b) => isProgram(b) ? 'Creative program' : /Post an opportunity/i.test(b.engagement_mode || '') ? 'Self-serve' : 'Curated match';
  const OST = { draft: ['Draft', ''], review: ['In review by SOV', ''], open: ['Open to creatives', 'ready'], closed: ['Closed', ''], awarded: ['Creative selected', 'approved'] };
  const DISC = ['Mural or wall art', 'Painting or original artwork', 'Sculpture or installation', 'Design, signage or wayfinding', 'Photo or video', 'Live music', 'Dance or performance', 'Live painting', 'Workshops or community programs', 'Something else'];
  const BUD = ['Under $2,500', '$2,500 to $5,000', '$5,000 to $15,000', '$15,000 to $50,000', '$50,000 or more', 'Open to proposals'];
  const sovMark = '<span class="sovm">sov<i><b></b><b></b><b></b><b></b><b></b></i></span>';
  const TIERS = [
    ['Tier 1 · Self-serve', 'Post an opportunity', 'You post the project and choose the creative.', 'Shares it with our vetted network, collects applications, and gives you agreements, payments and a project room.', '#post', 'Post an opportunity'],
    ['Tier 2 · Full service', 'Curated match', 'Tell us what you need. We find the creative and run it with you.', 'Writes the brief, shortlists 3 to 5 vetted creatives with reasons, and runs delivery with one project lead.', '../brief.html?mode=curated', 'Start a curated match'],
    ['Tier 3 · Ongoing', 'Creative program', 'For several spaces or year-round work.', 'Plans the year, keeps a preferred roster, runs every project and reports across your sites.', '#program', 'Plan a program']];
  const tierCards = () => `<div class="tierc">${TIERS.map((t, i) => `<a class="tier${i === 1 ? ' feat' : ''}" href="${t[4]}"><span class="eyb">${t[0]}</span><h3>${t[1]}</h3><p class="hint">${t[2]}</p><div class="sovp">${sovMark}<span>${t[3]}</span></div><span class="go">${t[5]} →</span></a>`).join('')}</div>`;

  const orgParam = new URLSearchParams(location.search).get('org');
  async function load() {
    staff = await isStaffUser();
    if (staff && orgParam) { // SOV staff opening a client's company to support them
      const o = await sb.from('orgs').select('*').eq('id', orgParam).maybeSingle();
      if (!o.data) return false;
      org = o.data; me = { role: 'member', name: 'SOV staff', title: '', user_id: user.id, staffView: true };
    } else {
      const m = await sb.from('org_members').select('*, orgs(*)').eq('user_id', user.id).limit(1);
      if (!m.data || !m.data.length) return false;
      me = m.data[0]; org = me.orgs;
    }
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
    const op = await sb.from('opportunities').select('*').eq('org_id', org.id).order('created_at', { ascending: false });
    opps = op.data || [];
    if (opps.length) { const ac = await sb.from('applications').select('opportunity_id,status').in('opportunity_id', opps.map(o => o.id)); appCounts = {}; (ac.data || []).forEach(a => { if (a.status !== 'withdrawn') appCounts[a.opportunity_id] = (appCounts[a.opportunity_id] || 0) + 1; }); }
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
    return `<a class="proj" href="#project/${b.id}"><div class="top"><div class="stack" style="gap:4px"><span class="eyb">${esc(tierOf(b))} · ${esc(b.sector || 'Project')}${b.city_state ? ' · ' + esc(b.city_state) : ''}</span><h3>${esc(titleOf(b))}</h3></div>
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
    opps.filter(o => o.status === 'open' && appCounts[o.id]).forEach(o => todos.push([`${appCounts[o.id]} creative${appCounts[o.id] > 1 ? 's' : ''} applied`, `${esc(o.title)}. Review and pick who fits.`, `#opp/${o.id}`]));
    if (!briefs.length && !opps.length) todos.push(['Start your first project', 'Post an opportunity, ask for a curated match, or plan a program.', '#start']);
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
          <div class="row" style="justify-content:space-between;margin-bottom:12px"><h2>Projects</h2><a class="btn btn-sm" href="#start">Start new</a></div>
          ${briefs.length ? briefs.slice(0, 6).map(projRow).join('') : `<div class="stack" style="gap:14px"><p class="hint" style="font-size:16px">No projects yet. Choose how you'd like to start.</p>${tierCards()}</div>`}
        </section>
        <aside class="stack" style="gap:28px">
          <section><h2 style="margin-bottom:8px">Needs you</h2>${todos.length ? todos.map(t => `<a class="todo" href="${t[2]}" style="text-decoration:none;color:inherit"><span class="dotc"></span><span><b style="display:block">${t[0]}</b><span class="hint">${t[1]}</span></span></a>`).join('') : '<p class="hint hair" style="padding-top:16px">Nothing waiting on you. We\'ll flag it here when something is.</p>'}</section>
          <section class="card pad stack" style="gap:10px"><span class="eyb">Your SOV contact</span><p>Questions about a project, budget or paperwork? Write to us and a person answers.</p><a href="mailto:${esc(C.contactEmail)}">${esc(C.contactEmail)}</a></section>
        </aside>
      </div></div>`;
  };

  views.projects = () => `<div class="stack" style="gap:28px">
      <div class="row" style="justify-content:space-between;align-items:flex-end"><div class="stack" style="gap:8px"><span class="eyb">${esc(org.name)}</span><h1 class="disp">Projects</h1><p class="hint" style="font-size:16px">Curated matches and program projects SOV is running with you.</p></div><a class="btn" href="#start">Start new</a></div>
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
          ${[['Space', [b.space_type, b.city_state, b.country].filter(Boolean).join(', ')], ['What it should do', (b.outcomes || []).join(', ')], ['Creative work', (b.creative_types || []).join(', ')], ['Budget', [b.budget_range, b.budget_source].filter(Boolean).join(' · ')], ['Timing', b.needed_by], ['How you hire', b.procurement_path], ['Site limits', (b.constraints || []).join(', ')], ['Building age', b.building_age], ['Codes and approvals', (b.approvals || []).join(', ')], ['What you told us', b.approvals_detail], ['How you want to work', b.engagement_mode], ['Sites', b.program_sites], ['Program type', b.program_cadence], ['Creative', b.byo_creative], ['Notes', b.notes], ['Planned uses', (b.usage_rights || []).join(', ')], ['Final approval', b.approver], ['Sent', day(b.created_at)]].filter(r => r[1]).map(r => `<div><span class="hint" style="display:block;font-size:13px">${r[0]}</span>${esc(r[1])}</div>`).join('')}
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

  views.start = () => me.staffView ? `<div class="stack" style="gap:12px;max-width:620px"><h1 class="disp">Starting a project</h1><p class="hint">New projects are started by the company's own team. To demo this step, use the Business view with your demo company.</p></div>` : `<div class="stack" style="gap:28px">
      <div class="stack" style="gap:8px"><span class="eyb">${esc(org.name)}</span><h1 class="disp">How would you like <em>to start?</em></h1><p class="hint" style="font-size:16px;max-width:640px">Three tiers. You can start with one and move up any time. Not sure? <a href="https://calendar.app.google/ZtKt8hpRBjTjpKaC6" target="_blank" rel="noopener">Book a 20-minute call</a>.</p></div>
      ${tierCards()}</div>`;

  views.opps = () => `<div class="stack" style="gap:28px">
      <div class="row" style="justify-content:space-between;align-items:flex-end"><div class="stack" style="gap:8px"><span class="eyb">Tier 1 · Self-serve</span><h1 class="disp">Opportunities</h1><p class="hint" style="font-size:16px;max-width:640px">Post a project to SOV's vetted network, review who applies and pick your creative. SOV checks each posting before it goes out.</p></div><a class="btn" href="#post">Post an opportunity</a></div>
      ${opps.length ? opps.map(o => `<a class="proj" href="#opp/${o.id}"><div class="top"><div class="stack" style="gap:4px"><span class="eyb">${esc((o.disciplines || []).slice(0, 2).join(' · ') || 'Opportunity')}${o.location ? ' · ' + esc(o.location) : ''}</span><h3>${esc(o.title)}</h3></div><div class="row" style="gap:10px"><span class="pill ${OST[o.status][1]}">${OST[o.status][0]}</span><span class="hint">${appCounts[o.id] || 0} applied</span></div></div></a>`).join('')
        : `<div class="empty hair stack" style="gap:12px"><p class="hint" style="font-size:16px">No opportunities yet. Describe the project, and approved creatives in our network can apply. You choose who fits.</p><div><a class="btn" href="#post">Post your first opportunity</a></div></div>`}</div>`;

  views.post = () => `<form class="stack" id="oppForm" style="gap:28px;max-width:900px" novalidate>
      <a href="#opps" class="hint" style="text-decoration:none">← Opportunities</a>
      <div class="stack" style="gap:8px"><span class="eyb">Tier 1 · Self-serve</span><h1 class="disp">Post an <em>opportunity.</em></h1><p class="hint" style="font-size:16px">Plain and specific works best. SOV reviews every posting within one to two business days before it opens to the network.</p></div>
      <section class="stack" style="gap:16px"><h2>The project</h2><div class="formgrid">
        <label class="f" style="grid-column:1/-1">Title<input name="title" required maxlength="160" placeholder="Lobby mural for a boutique hotel, about 18 ft wide"></label>
        <label class="f" style="grid-column:1/-1">One-line summary<input name="summary" maxlength="600" placeholder="Local, warm, a little surprising. Installed before our spring opening."></label>
        <label class="f" style="grid-column:1/-1">Details<textarea name="details" maxlength="4000" placeholder="The space, the audience, the story, size or set length, materials, anything you need creatives to know."></textarea></label>
        <label class="f">Where<input name="location" maxlength="200" placeholder="Winston-Salem, NC"></label>
        <label class="f">Budget<select name="budget_range">${BUD.map(x => `<option>${x}</option>`).join('')}</select></label>
        <label class="f">Apply by<input type="date" name="deadline"></label>
        <label class="f">Timing<input name="timing" maxlength="200" placeholder="Install in March, or event on May 12"></label>
      </div></section>
      <section class="stack" style="gap:12px"><h2>What kind of creative?</h2><div class="chips">${DISC.map(d => `<label><input type="checkbox" name="disciplines" value="${esc(d)}"><span>${esc(d)}</span></label>`).join('')}</div></section>
      <section class="stack" style="gap:12px"><h2>Rights and use</h2><label class="f">How will you use the work or the photos of it?<input name="rights" maxlength="600" placeholder="On site only, plus photos for our website and social"></label><p class="hint">Creatives keep their copyright. The uses you list here are licensed in the agreement.</p></section>
      <section class="stack" style="gap:12px"><h2>Already have someone in mind?</h2><div class="formgrid"><label class="f">Their name (optional)<input name="invited_name" maxlength="200"></label><label class="f">Email, site or Instagram (optional)<input name="invited_contact" maxlength="300"></label></div>
        <label class="row" style="gap:10px"><input type="checkbox" name="invite_only"><span>Only invite this person. Don't share with the network.</span></label></section>
      <div class="sovp" style="max-width:760px">${sovMark}<span>Reviews your posting, shares it with vetted creatives, and sets up the agreement, insurance and payments once you choose. Our self-serve platform fee is set in your agreement, inside your budget.</span></div>
      <div class="row"><button class="btn" type="submit" data-st="review">Send to SOV for review</button><button class="btn btn-ghost" type="submit" data-st="draft">Save as draft</button></div>
    </form>`;

  async function oppView(id) {
    const o = opps.find(x => x.id === id);
    if (!o) return `<p class="hint">We couldn't find that opportunity. <a href="#opps">See all opportunities</a></p>`;
    if (!appCache[id]) { const r = await sb.rpc('opp_applicants', { o: id }); appCache[id] = r.data || []; await signWorks(appCache[id]); }
    const apps = appCache[id];
    const AST = { submitted: ['New', ''], shortlisted: ['Shortlisted', 'ready'], selected: ['Selected', 'approved'], declined: ['Not this time', ''] };
    return `<div class="stack" style="gap:28px">
      <a href="#opps" class="hint" style="text-decoration:none">← Opportunities</a>
      <div class="row" style="justify-content:space-between;align-items:flex-end"><div class="stack" style="gap:8px"><span class="eyb">Tier 1 · Self-serve${o.location ? ' · ' + esc(o.location) : ''}</span><h1 class="disp">${esc(o.title)}</h1></div><span class="pill ${OST[o.status][1]}">${OST[o.status][0]}</span></div>
      <div class="grid-main"><section class="stack" style="gap:16px"><h2>Who applied</h2>
        ${o.status === 'review' ? '<p class="hint hair" style="padding-top:16px">SOV is reviewing your posting. Once it opens, approved creatives can apply and they appear here.</p>' : o.status === 'draft' ? '<p class="hint hair" style="padding-top:16px">This is a draft. Send it to SOV for review when you are ready.</p>' : ''}
        ${apps.length ? apps.map(c => `<article class="mcard"><div class="imgs">${(c.works || []).slice(0, 3).map(w => w.image_path ? `<img src="${esc(urls[w.image_path] || '')}" alt="${esc(w.title || 'Work sample')}" loading="lazy">` : w.link_url ? `<a class="lt" href="${esc(w.link_url)}" target="_blank" rel="noopener"><span aria-hidden="true">${w.kind === 'audio' ? '♪' : '▶'}</span>Open ${esc(w.kind || 'link')}</a>` : '').join('')}</div>
          <div class="stack" style="gap:10px"><div class="row" style="justify-content:space-between"><span class="eyb">${esc(c.creative_field || (c.disciplines || [])[0] || 'Creative')}${c.city ? ' · ' + esc(c.city) : ''}</span><span class="pill ${AST[c.status][1]}">${AST[c.status][0]}</span></div>
            <h3>${esc(c.display_name || 'Creative')}</h3>${c.note ? `<p class="why">${esc(c.note)}</p>` : ''}${c.fee_note ? `<p><span class="hint">Their fee note</span> ${esc(c.fee_note)}</p>` : ''}
            ${c.portfolio_url ? `<a class="hint" href="${esc(c.portfolio_url)}" target="_blank" rel="noopener">See more of their work</a>` : ''}
            ${o.status === 'open' && c.status !== 'selected' ? `<div class="row">${c.status === 'submitted' ? `<button class="btn btn-sm btn-ghost" data-app="${c.application_id}" data-s="shortlisted">Shortlist</button>` : ''}<button class="btn btn-sm" data-app="${c.application_id}" data-s="selected">Choose this creative</button>${c.status !== 'declined' ? `<button class="linkbtn" data-app="${c.application_id}" data-s="declined">Not this time</button>` : ''}</div>` : ''}
          </div></article>`).join('') : (o.status === 'open' ? '<p class="hint hair" style="padding-top:16px">No applications yet. We share new postings with matching creatives in our network.</p>' : '')}
      </section>
      <aside class="card pad stack" style="gap:12px"><span class="eyb">Your posting</span>
        ${[['Summary', o.summary], ['Details', o.details], ['Creative work', (o.disciplines || []).join(', ')], ['Budget', o.budget_range], ['Apply by', o.deadline ? day(o.deadline) : ''], ['Timing', o.timing], ['Rights and use', o.rights], ['Invited', [o.invited_name, o.invited_contact].filter(Boolean).join(' · ')], ['Shared with', o.visibility === 'invite_only' ? 'Only the person you invited' : 'SOV vetted network']].filter(r => r[1]).map(r => `<div><span class="hint" style="display:block;font-size:13px">${r[0]}</span>${esc(r[1])}</div>`).join('')}
        <div class="row">${o.status === 'draft' ? `<button class="btn btn-sm" data-ost="review">Send for review</button>` : ''}${['open', 'review', 'draft'].includes(o.status) ? `<button class="linkbtn" data-ost="closed">Close this posting</button>` : ''}</div>
      </aside></div></div>`;
  }

  views.programs = () => {
    const progs = briefs.filter(isProgram);
    return `<div class="stack" style="gap:28px">
      <div class="row" style="justify-content:space-between;align-items:flex-end"><div class="stack" style="gap:8px"><span class="eyb">Tier 3 · Ongoing</span><h1 class="disp">Creative programs</h1><p class="hint" style="font-size:16px;max-width:660px">One partner for several spaces or year-round work: an annual plan, a preferred roster, every project run for you, and one report across all your sites.</p></div><a class="btn" href="#program">Plan a program</a></div>
      ${progs.length ? progs.map(projRow).join('') : `<div class="sovp" style="max-width:760px">${sovMark}<span>Plans the year with you, keeps a roster of creatives you trust, runs every rotation, event or commission, and reports across all your properties.</span></div><div><a class="btn" href="#program">Plan your program</a></div>`}</div>`;
  };

  views.program = () => `<form class="stack" id="progForm" style="gap:28px;max-width:900px" novalidate>
      <a href="#programs" class="hint" style="text-decoration:none">← Programs</a>
      <div class="stack" style="gap:8px"><span class="eyb">Tier 3 · Ongoing</span><h1 class="disp">Plan a creative <em>program.</em></h1><p class="hint" style="font-size:16px">A few details to start. Your SOV lead will set up a planning call and draft the year with you.</p></div>
      <div class="formgrid">
        <label class="f" style="grid-column:1/-1">Program name<input name="title" required maxlength="160" placeholder="2027 art and events program, all properties"></label>
        <label class="f">How many sites or spaces?<input type="number" min="1" max="500" name="program_sites" placeholder="4"></label>
        <label class="f">What kind of program?<select name="program_cadence"><option>Rotating art across our spaces</option><option>Seasonal live programming and events</option><option>An annual plan of new commissions</option><option>A mix of the above</option><option>Not sure yet</option></select></label>
        <label class="f">Where?<input name="city_state" maxlength="200" placeholder="NC and SC properties"></label>
        <label class="f">Yearly budget<select name="budget_range"><option>Under $25,000</option><option>$25,000 to $75,000</option><option>$75,000 to $200,000</option><option>More than $200,000</option><option>Not sure yet</option></select></label>
        <label class="f" style="grid-column:1/-1">What should the program do for you?<textarea name="notes" maxlength="2000" placeholder="Keep our lobbies fresh, give guests a reason to return, support local creatives, a report our owners will read."></textarea></label>
      </div>
      <div class="sovp" style="max-width:760px">${sovMark}<span>Programs are billed as one annual fee plus the projects inside them, every line visible before you sign.</span></div>
      <div><button class="btn" type="submit">Send to SOV</button></div>
    </form>`;

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
      ${me.staffView ? '' : `<section class="stack" style="gap:8px"><h3>Your profile</h3><form id="meForm" class="formgrid"><label class="f">Your name<input name="name" value="${esc(me.name || '')}"></label><label class="f">Your role<input name="title" value="${esc(me.title || '')}" placeholder="Owner, GM, designer, facilities..."></label><div><button class="btn btn-ghost btn-sm" type="submit">Save</button></div></form></section>`}</div>`;

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

  function planBanner() {
    if (!org || !org.plan) return '';
    const PRICES = { property: '$99', team: '$249', portfolio: '$599' };
    if (org.plan === 'trial') {
      const left = Math.ceil((new Date(org.trial_ends_at) - Date.now()) / 864e5);
      if (left > 0) return `<div class="planbar"><span><b>Free trial</b> · ${left} day${left === 1 ? '' : 's'} left. Everything is unlocked.</span><a href="../pricing.html">See plans</a></div>`;
      return `<div class="planbar end"><span><b>Your free trial has ended.</b> Your projects stay open while you choose a plan.</span><a href="../pricing.html">Choose a plan</a></div>`;
    }
    if (org.plan === 'expired') return `<div class="planbar end"><span><b>Your plan has ended.</b> Your records are safe.</span><a href="../pricing.html">Restart a plan</a></div>`;
    const nm = org.plan.charAt(0).toUpperCase() + org.plan.slice(1);
    return `<div class="planbar"><span><b>${nm} plan</b>${org.billing_period ? ' · billed ' + (org.billing_period === 'annual' ? 'yearly' : 'monthly') : ''}</span><a href="../pricing.html">Compare plans</a></div>`;
  }
  async function render() {
    const [name, id, tab] = (location.hash.slice(1) || 'home').split('/');
    const key = name === 'project' ? 'projects' : name === 'opp' || name === 'post' ? 'opps' : name === 'program' ? 'programs' : name === 'start' ? '' : name;
    $$('#nav a[href^="#"]').forEach(a => a.setAttribute('aria-current', a.getAttribute('href') === '#' + key ? 'page' : 'false'));
    const html = name === 'project' ? await projectView(id, tab) : name === 'opp' ? await oppView(id) : (views[name] || views.home)();
    $('#view').innerHTML = planBanner() + html; wire(name, id, tab);
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
    const offm = $('#oppForm');
    if (offm) { let st = 'review'; $$('button[data-st]', offm).forEach(b => b.onclick = () => { st = b.dataset.st; });
      offm.onsubmit = async (e) => {
        e.preventDefault(); const d = new FormData(offm);
        const title = String(d.get('title') || '').trim(); if (title.length < 3) { toast('Please add a title.'); return; }
        const rec = { org_id: org.id, created_by: user.id, status: st, title, disciplines: d.getAll('disciplines'), visibility: d.get('invite_only') ? 'invite_only' : 'network' };
        ['summary', 'details', 'location', 'budget_range', 'timing', 'rights', 'invited_name', 'invited_contact'].forEach(k => { const v = String(d.get(k) || '').trim(); rec[k] = v || null; });
        rec.deadline = d.get('deadline') || null;
        const r = await sb.from('opportunities').insert(rec).select().single();
        if (r.error) { console.error(r.error); toast('Could not save that. Please try again.'); return; }
        opps.unshift(r.data); toast(st === 'draft' ? 'Draft saved' : 'Sent to SOV for review'); location.hash = '#opp/' + r.data.id;
      }; }
    $$('[data-ost]').forEach(b => b.onclick = async () => {
      const o = opps.find(x => x.id === id); if (!o) return;
      if (b.dataset.ost === 'closed' && !confirm('Close this posting? Creatives will no longer be able to apply.')) return;
      const r = await sb.from('opportunities').update({ status: b.dataset.ost }).eq('id', o.id).select().single();
      if (r.error) { toast('Could not update.'); return; } Object.assign(o, r.data); toast('Updated'); render();
    });
    $$('[data-app]').forEach(b => b.onclick = async () => {
      const o = opps.find(x => x.id === id); const s = b.dataset.s;
      if (s === 'selected' && !confirm('Choose this creative? We will close the posting and set up the agreement, insurance and payments with you.')) return;
      b.disabled = true;
      const r = await sb.from('applications').update({ status: s }).eq('id', b.dataset.app);
      if (r.error) { toast('Could not save that.'); b.disabled = false; return; }
      const c = (appCache[id] || []).find(x => x.application_id === b.dataset.app); if (c) c.status = s;
      if (s === 'selected' && o) {
        const u = await sb.from('opportunities').update({ status: 'awarded' }).eq('id', o.id).select().single(); if (!u.error) Object.assign(o, u.data);
        const br = { org_id: org.id, created_by: user.id, status: 'new', stage: 'brief', consent_contact: true, org_name: org.name, contact_name: me.name || user.user_metadata?.display_name || user.email, email: user.email, title: o.title, sector: org.sector || null, city_state: o.location || null, budget_range: o.budget_range, engagement_mode: 'Post an opportunity myself (self-serve)', byo_creative: c ? c.display_name : null, notes: 'Created from a self-serve opportunity. Selected creative: ' + (c ? c.display_name : '') };
        const nb = await sb.from('briefs').insert(br).select().single();
        if (!nb.error) briefs.unshift(nb.data);
        toast('Creative selected. Your project room is set up.'); location.hash = nb.error ? '#opps' : '#project/' + nb.data.id; return;
      }
      toast(s === 'declined' ? 'Noted.' : 'Shortlisted'); render();
    });
    const pf = $('#progForm');
    if (pf) pf.onsubmit = async (e) => {
      e.preventDefault(); const d = Object.fromEntries(new FormData(pf));
      if (!String(d.title || '').trim()) { toast('Please name your program.'); return; }
      const rec = { org_id: org.id, created_by: user.id, status: 'new', stage: 'brief', consent_contact: true, org_name: org.name, contact_name: me.name || user.user_metadata?.display_name || user.email, email: user.email,
        title: String(d.title).trim(), sector: org.sector || null, city_state: d.city_state || null, budget_range: d.budget_range || null, engagement_mode: 'Set up an ongoing creative program', program_sites: d.program_sites ? Number(d.program_sites) : null, program_cadence: d.program_cadence || null, notes: d.notes || null };
      const r = await sb.from('briefs').insert(rec).select().single();
      if (r.error) { console.error(r.error); toast('Could not send that. Please try again.'); return; }
      briefs.unshift(r.data); toast('Sent. Your SOV lead will reach out to plan the year.'); location.hash = '#project/' + r.data.id;
    };
  }

  const switched = staffSwitch('business');
  if (!(await load())) {
    if (staff) {
      const all = await sb.from('orgs').select('id,name,sector,city').order('name');
      $('#view').innerHTML = `<div class="stack" style="gap:16px;max-width:720px"><h1 class="disp">Choose a company to view</h1><p class="hint" style="font-size:16px">You're signed in as SOV staff. Open any business account to see exactly what they see.</p>${(all.data || []).map(o => `<a class="card pad row" style="justify-content:space-between;text-decoration:none;color:inherit" href="business.html?org=${o.id}"><span><b>${esc(o.name)}</b><br><span class="hint">${esc([o.sector, o.city].filter(Boolean).join(' · '))}</span></span><span class="btn btn-sm btn-ghost">Open</span></a>`).join('') || '<p class="hint">No business accounts yet.</p>'}</div>`;
      await switched; return;
    }
    $('#view').innerHTML = `<div class="stack" style="gap:16px;max-width:620px"><h1 class="disp">This account isn't linked to a business yet.</h1><p class="hint" style="font-size:16px">If a colleague invited you, make sure they used this email address, then refresh. If you're a creative, your dashboard is <a href="index.html">here</a>.</p></div>`;
    return;
  }
  $('#av').textContent = initials(me.name || user.email);
  if (staff) $('#teamLink').hidden = false;
  await switched;
  if (me.staffView) {
    const n = document.createElement('div'); n.className = 'wrap';
    n.innerHTML = `<div class="staffnote"><span>You're viewing <b>${esc(org.name)}</b> as SOV staff. Owner-only settings and new projects are hidden.</span><a class="btn btn-sm btn-ghost" href="team.html#companies">All companies</a></div>`;
    $('#view').before(n);
    const sn = $('#nav a.btn[href="#start"]'); if (sn) sn.hidden = true;
  }
  window.addEventListener('hashchange', () => { Object.keys(appCache).forEach(k => delete appCache[k]); render(); window.scrollTo(0, 0); });
  render();
})();

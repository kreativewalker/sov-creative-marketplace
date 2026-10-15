// SOV artist dashboard: one page, views switched by the URL hash.
(async function () {
  const C = window.SOV_CONFIG;
  const user = await requireUser();
  if (!user) return;

  let A = null;        // the artist row
  let works = [];      // the artist's works
  let urls = {};       // signed photo URLs by storage path
  let isStaff = false;

  const OPT = {
    travel: ['My city only', 'Within 50 miles', 'Anywhere in North Carolina', 'Southeast', 'Anywhere in the US'],
    disciplines: ['Painting', 'Murals', 'Live painting', 'Sculpture', 'Photography', 'Printmaking', 'Textile or fiber', 'Ceramics', 'Digital or new media', 'Installation', 'Other'],
    services: ['Original artwork for sale', 'Commissions', 'Murals and large-scale installs', 'Live painting at events', 'Art for rent or rotation', 'Prints and editions', 'Workshops'],
    largest: ['Under 3 feet', '3 to 6 feet', '6 to 12 feet', 'Wall-size or larger'],
    install: ['Yes, on my own', 'Yes, with help', "No, I'd need an installer"],
    minProject: ['Under $500', '$500 to $1,500', '$1,500 to $5,000', '$5,000 or more'],
    notice: ['Under 2 weeks', '2 to 4 weeks', '1 to 3 months', '3 months or more'],
    insurance: ['Yes', 'No, but I could get it for a project', 'No'],
    refRel: ['Past client', 'Collaborator', 'Gallery or curator', 'Teacher or mentor', 'Other'],
    heard: ['Instagram', 'Another artist', 'Micah or the SOV team', 'An event or workshop', 'Google or web search', 'AI search (ChatGPT, Claude, Perplexity, Gemini)', 'TikTok', 'LinkedIn', 'Facebook', 'Newsletter or email', 'Other'],
    ai: ['ChatGPT', 'Claude', 'Perplexity', 'Gemini or Google AI answers', 'Microsoft Copilot', 'Something else'],
    profile: ['Yes, show my profile', 'Not yet, ask me again later'],
    news: ['Yes, keep me posted', 'No thanks']
  };

  // ---------- data ----------
  async function load() {
    const [a, w, s] = await Promise.all([
      sb.from('artists').select('*').eq('id', user.id).maybeSingle(),
      sb.from('works').select('*').eq('artist_id', user.id).order('position', { ascending: true, nullsFirst: false }).order('created_at'),
      sb.rpc('is_staff')
    ]);
    if (a.error) throw a.error;
    A = a.data;
    if (!A) { // the sign-up trigger normally creates this row; create it if missing
      const ins = await sb.from('artists').insert({ id: user.id, email: user.email, display_name: user.user_metadata?.display_name || null, utm: user.user_metadata?.utm || null }).select().single();
      if (ins.error) throw ins.error; A = ins.data;
    }
    works = w.data || [];
    isStaff = !!s.data;
    $('#teamLink').hidden = !isStaff;
    $('#av').textContent = initials(A.display_name || user.email);
    await signPhotos(works.map(x => x.image_path).filter(Boolean));
  }
  async function signPhotos(paths) {
    const need = paths.filter(p => !urls[p]);
    if (!need.length) return;
    const { data } = await sb.storage.from('artworks').createSignedUrls(need, 3600);
    (data || []).forEach(d => { if (d.signedUrl) urls[d.path] = d.signedUrl; });
  }
  async function saveArtist(patch) {
    const { data, error } = await sb.from('artists').update(patch).eq('id', user.id).select().single();
    if (error) { toast('Could not save. Check your connection and try again.'); console.error(error); return false; }
    A = data; return true;
  }
  const submitted = () => A.status !== 'draft';

  // ---------- small render helpers ----------
  const v = (k) => esc(A[k] ?? '');
  const field = (k, label, opts = {}) => `<label class="f"><span>${label}${opts.req ? ' <span class="req" aria-hidden="true">*</span>' : ''}</span>${opts.hint ? `<span class="hint">${opts.hint}</span>` : ''}
    ${opts.area ? `<textarea data-k="${k}" ${opts.req ? 'required' : ''} placeholder="${esc(opts.ph || '')}">${v(k)}</textarea>`
      : `<input data-k="${k}" type="${opts.type || 'text'}" value="${v(k)}" ${opts.req ? 'required' : ''} placeholder="${esc(opts.ph || '')}" ${opts.ac ? `autocomplete="${opts.ac}"` : ''}>`}</label>`;
  const radios = (k, legend, list, req) => `<fieldset data-group="${k}"><legend>${legend}${req ? ' <span class="req" aria-hidden="true">*</span>' : ''}</legend><div class="choices">${list.map(o => `<label class="choice"><input type="radio" name="${k}" value="${esc(o)}" ${A[k] === o ? 'checked' : ''}><span>${esc(o)}</span></label>`).join('')}</div></fieldset>`;
  const checks = (k, legend, list, req) => `<fieldset data-group="${k}"><legend>${legend}${req ? ' <span class="req" aria-hidden="true">*</span>' : ''} <span class="hint">Choose all that fit.</span></legend><div class="choices">${list.map(o => `<label class="choice"><input type="checkbox" name="${k}" value="${esc(o)}" ${(A[k] || []).includes(o) ? 'checked' : ''}><span>${esc(o)}</span></label>`).join('')}</div></fieldset>`;
  const select = (k, label, list) => `<label class="f">${label}<select data-k="${k}"><option value="">Choose one</option>${list.map(o => `<option ${A[k] === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></label>`;

  function collect(root) {
    const patch = {};
    $$('[data-k]', root).forEach(el => {
      let val = el.value.trim();
      if (el.type === 'number') val = val === '' ? null : Math.round(Number(val));
      patch[el.dataset.k] = val === '' ? null : val;
    });
    $$('fieldset[data-group]', root).forEach(fs => {
      const k = fs.dataset.group;
      const ins = $$('input', fs);
      if (!ins.length) return;
      if (ins[0].type === 'checkbox') patch[k] = ins.filter(i => i.checked).map(i => i.value);
      else { const c = ins.find(i => i.checked); patch[k] = c ? c.value : null; }
    });
    if ('is_adult' in patch) patch.is_adult = Array.isArray(patch.is_adult) && patch.is_adult.length > 0;
    return patch;
  }

  // ---------- views ----------
  const views = {};
  const stepsList = ['Apply', 'Review', 'Video call', 'Agreement', 'Active'];

  views.home = () => {
    const st = STATUS[A.status] || STATUS.draft;
    const pieces = works.filter(w => w.image_path).length;
    let next;
    if (A.status === 'draft') next = `<h2>Finish your application</h2><p>Your answers save as you go. ${pieces < 3 ? `You've added ${pieces} of 3 pieces so far.` : 'Your three pieces are in.'}</p><div><a class="btn btn-blue" href="#apply">Continue my application</a></div>`;
    else if (A.status === 'submitted' || A.status === 'in_review') next = `<h2>We're looking at your work</h2><p>A real person on our team reads every application. If it's a good fit, we'll email you and a button to book your video call will appear here.</p><div class="row"><a class="btn btn-ghost" href="#profile">Add your bio while you wait</a></div>`;
    else if (A.status === 'call_invited') next = `<h2>You're invited to a video call</h2><p>About 30 minutes on Google Meet with a working artist from our team. Have 3 to 5 pieces ready to talk about, including your largest.</p><div><a class="btn btn-blue" href="${esc(C.bookingUrl)}" target="_blank" rel="noopener">Pick a time for my call</a></div>`;
    else if (A.status === 'call_booked') next = `<h2>Your call is booked</h2><p>Your Google Meet link is in your email and calendar invite. We're looking forward to it.</p>`;
    else if (A.status === 'approved') next = `<h2>Welcome to SOV</h2><p>We'll send your Artist Network Agreement by email to sign. Once it's signed, you're active and we start matching you with projects.</p>`;
    else if (A.status === 'active') next = `<h2>You're active in the network</h2><p>Keep your work and availability current so we can match you well.</p><div class="row"><a class="btn btn-blue" href="#works">Update my work</a></div>`;
    else if (A.status === 'not_a_fit') next = `<h2>Thank you for applying</h2><p>This isn't the right moment, but we'd love to see your work again. You're welcome to update your pieces and write to us any time.</p>`;
    else next = `<h2>Your application is withdrawn</h2><p>Write to us at ${esc(C.contactEmail)} if you'd like to pick it back up.</p>`;

    const checklist = [
      ['Create your account', true, ''],
      ['Send your application', submitted(), '#apply'],
      ['Add a short bio', !!A.bio, '#profile'],
      ['Add an artist statement', !!A.statement, '#profile'],
      ['Video call with a working artist', ['approved', 'active'].includes(A.status), '#call'],
      ['Sign the Artist Network Agreement', A.status === 'active', '']
    ];
    const done = checklist.filter(c => c[1]).length;

    return `<div class="stack" style="gap:24px">
      <div class="row" style="justify-content:space-between;align-items:flex-end">
        <div class="stack" style="gap:6px"><h1 class="disp">${greeting()}, ${esc(firstName())}</h1><p class="hint" style="font-size:16px">Here's where things stand.</p></div>
        <span class="tag ${st.tone}">${st.label}</span>
      </div>
      <section class="card pad stack" aria-label="Your progress">
        <ol class="steps">${stepsList.map((s, i) => `<li class="${i < st.step || A.status === 'active' ? 'done' : i === st.step ? 'now' : ''}"><span class="bar"></span>${s}</li>`).join('')}</ol>
      </section>
      <section class="card pad stack next">${next}</section>
      <div class="grid2">
        <section class="card pad stack" style="gap:10px"><h3>Your checklist: ${done} of ${checklist.length}</h3>
          ${checklist.map(c => `<div class="check"><b style="color:${c[1] ? 'var(--green)' : 'var(--amber)'}" aria-hidden="true">${c[1] ? '✓' : '○'}</b>${c[2] && !c[1] ? `<a href="${c[2]}">${c[0]}</a>` : `<span>${c[0]}</span>`}<span class="sr">${c[1] ? 'done' : 'to do'}</span></div>`).join('')}
        </section>
        <section class="card pad stack" style="gap:10px"><h3>Your work</h3>
          ${works.length ? `<div class="gallery" style="grid-template-columns:repeat(3,1fr);gap:8px">${works.slice(0, 6).map(w => `<img alt="${esc(w.title || 'Artwork')}" src="${esc(urls[w.image_path] || '')}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px;background:var(--soft)">`).join('')}</div>` : `<p class="hint">No pieces yet. They'll show here once you add them.</p>`}
          <a href="#works">See all my work</a>
        </section>
      </div>
      <section class="card pad row" style="justify-content:space-between">
        <div class="stack" style="gap:4px"><h3>Invitations and projects</h3><p class="hint">Once you're active, project invitations from hotels, developers and healthcare spaces show up here.</p></div>
        <span class="tag">Unlocks when you're active</span>
      </section>
    </div>`;
  };

  // ---- application: one question at a time ----
  OPT.where = ['Galleries or art shows', 'Businesses or offices', 'Hotels or hospitality', 'Healthcare spaces', 'Restaurants, cafes or retail', 'Public art or murals', 'Events or festivals', 'Private collections or homes', 'Online only so far', 'Not shown yet'];
  const has = (k) => { const x = A[k]; return !(x == null || x === '' || (Array.isArray(x) && !x.length)); };
  const workAt = (n) => works.find(x => x.position === n);
  const pieceDone = (n) => { const w = workAt(n); return !!(w && w.image_path && w.title && w.medium && w.size); };
  let extraPieces = null, noMorePieces = false, wantRef = null, qid = null;

  const piece = (n) => ({ id: 'p' + n, sec: 'Your work', type: 'piece', n, title: n <= 3 ? `Show us piece ${n} of 3` : `Piece ${n}`, hint: n === 1 ? "Three pieces you're proud of. One photo each, with a few details. A clear, straight-on photo works best." : (n > 3 ? 'Optional.' : ''), req: n <= 3, done: () => pieceDone(n) });
  const moreQ = (k) => ({ id: 'more' + k, sec: 'Your work', type: 'more', k, title: k === 3 ? 'Want to show us another piece?' : 'Add one more?', hint: k === 3 ? 'Optional. You can add up to three more.' : `Optional. You can add up to ${6 - k} more.` });

  const Q = [
    { id: 'name', sec: 'About you', type: 'fields', title: 'What name do you work under?', hint: 'Your artist or studio name.', fields: [['display_name', 'Name you work under', 'text', true, 'nickname', 'Artist or studio name']] },
    { id: 'legal', sec: 'About you', type: 'fields', title: "What's your legal first and last name?", hint: 'Only used on contracts. Never shown publicly.', fields: [['legal_name', 'Legal name', 'text', true, 'name']] },
    { id: 'contact', sec: 'About you', type: 'fields', title: 'Where can we reach you?', fields: [['phone', 'Phone', 'tel', true, 'tel'], ['pronouns', 'Pronouns (optional)', 'text', false]] },
    { id: 'place', sec: 'About you', type: 'fields', title: 'Where are you based?', fields: [['city_state', 'City and state', 'text', true, 'address-level2', 'Raleigh, NC'], ['zip', 'ZIP code', 'text', true, 'postal-code']] },
    { id: 'travel', sec: 'About you', type: 'one', key: 'travel_range', title: 'How far will you travel for a project?', list: OPT.travel },
    { id: 'age', sec: 'About you', type: 'age', title: 'Are you 18 or older?', hint: 'SOV works only with adults.' },
    { id: 'disc', sec: 'Your practice', type: 'many', key: 'disciplines', title: 'What kind of work do you make?', hint: 'Choose all that fit.', list: OPT.disciplines, other: 'disciplines_other' },
    { id: 'serv', sec: 'Your practice', type: 'many', key: 'services', title: 'What can you offer clients?', hint: 'Choose all that fit.', list: OPT.services },
    { id: 'links', sec: 'Your practice', type: 'fields', title: 'Where can we see more of your work?', fields: [['portfolio_url', 'Portfolio or website link', 'url', true, 'url', 'https://'], ['social_url', 'Instagram or other social link (optional)', 'url', false, '', 'https://']] },
    { id: 'largest', sec: 'Your practice', type: 'one', key: 'largest_piece', title: "What's the largest piece you've completed?", list: OPT.largest },
    { id: 'where', sec: 'Your practice', type: 'many', key: 'where_shown_types', title: 'Where has your work lived?', hint: 'Choose all that fit.', list: OPT.where, detail: 'where_shown', detailLabel: 'Anything you want us to know? (optional)', detailPh: 'For example: a solo show at a local gallery in 2024' },
    { id: 'install', sec: 'Your practice', type: 'one', key: 'can_install', title: 'Can you install your own work?', list: OPT.install },
    piece(1), piece(2), piece(3), moreQ(3), piece(4), moreQ(4), piece(5), moreQ(5), piece(6),
    { id: 'min', sec: 'Pricing and timing', type: 'one', key: 'min_project', title: "What's the smallest project you'll take on?", hint: 'Only you and our team see your pricing.', list: OPT.minProject },
    { id: 'rate', sec: 'Pricing and timing', type: 'fields', title: "What's your day rate for live work or installs?", hint: 'Optional. In dollars. Skip it if you price differently.', fields: [['day_rate', 'Day rate in dollars', 'number', false, '', '600']], skippable: true },
    { id: 'notice', sec: 'Pricing and timing', type: 'one', key: 'notice', title: 'How much notice do you usually need?', list: OPT.notice },
    { id: 'ins', sec: 'Pricing and timing', type: 'one', key: 'insurance', title: 'Do you carry general liability insurance?', hint: "It's fine if you don't. Many artists get it per project.", list: OPT.insurance },
    { id: 'heard', sec: 'Last few', type: 'one', key: 'heard_from', title: 'How did you hear about SOV?', list: OPT.heard },
    { id: 'heard2', sec: 'Last few', type: 'heard2', title: 'Tell us a little more', hint: 'Optional, but it helps us.', skippable: true },
    { id: 'refq', sec: 'Last few', type: 'refq', title: 'Would you like to add a reference?', hint: 'Optional. We only reach out after we talk with you.' },
    { id: 'ref', sec: 'Last few', type: 'fields', title: 'Your reference', skippable: true, fields: [['ref_name', 'Their name', 'text', false], ['ref_relationship', 'How you know them', 'select', false, '', '', OPT.refRel], ['ref_org', 'Their organization', 'text', false], ['ref_contact', 'Their email or phone', 'text', false], ['ref_project', 'What did you work on together?', 'area', false, '', 'For example: a 20 ft lobby mural for their hotel, finished in 2024']] },
    { id: 'promise', sec: 'Almost done', type: 'one', key: 'consent_public_profile', title: 'Almost done', promise: true, ask: "If you're approved, can we show your name and work on a public SOV artist profile?", list: OPT.profile, optional: true },
    { id: 'news', sec: 'Almost done', type: 'one', key: 'consent_news', title: 'Would you like occasional emails about open calls and SOV news?', hint: 'Optional. You can change this any time.', list: OPT.news, optional: true },
    { id: 'send', sec: 'Send', type: 'send', title: 'Review and send' }
  ];

  function visible() {
    if (extraPieces === null) extraPieces = [4, 5, 6].filter(n => workAt(n)).length;
    if (wantRef === null) wantRef = has('ref_name') || has('ref_contact') ? true : null;
    const h = A.heard_from || '';
    return Q.filter(q => {
      if (q.type === 'piece' && q.n > 3) return q.n <= 3 + extraPieces || !!workAt(q.n);
      if (q.type === 'more') return !noMorePieces && q.k === 3 + extraPieces && q.k < 6 && !workAt(q.k + 1);
      if (q.id === 'heard2') return h.startsWith('AI search') || h === 'Another artist' || h === 'Micah or the SOV team' || h === 'An event or workshop';
      if (q.id === 'ref') return wantRef === true;
      return true;
    });
  }
  function answered(q) {
    if (q.type === 'fields') return q.fields.every(f => !f[3] || has(f[0])) && (q.skippable || q.fields.some(f => has(f[0])));
    if (q.type === 'one' || q.type === 'many') return q.optional ? true : has(q.key);
    if (q.type === 'age') return !!A.is_adult;
    if (q.type === 'piece') return q.req ? q.done() : true;
    if (q.type === 'refq') return wantRef !== null || has('ref_name');
    return true;
  }
  function firstOpen() {
    const vs = visible();
    const q = vs.find(x => x.type !== 'send' && !(x.optional || x.skippable || x.type === 'more' || (x.type === 'piece' && !x.req)) && !answered(x));
    return (q || vs[vs.length - 1]).id;
  }

  function missing() {
    return visible().filter(q => q.type !== 'send' && !q.optional && !q.skippable && q.type !== 'more' && !(q.type === 'piece' && !q.req) && !answered(q)).map(q => [q.title.replace(/^Show us /, ''), q.id]);
  }

  const bigOne = (k, list, cur) => `<fieldset data-group="${k}" class="q-list${list.length > 6 ? ' cols' : ''}">${list.map(o => `<label class="choice"><input type="radio" name="${k}" value="${esc(o)}" ${cur === o ? 'checked' : ''}><span>${esc(o)}</span></label>`).join('')}</fieldset>`;
  const bigMany = (k, list) => `<fieldset data-group="${k}" class="choices q-chips">${list.map(o => `<label class="choice"><input type="checkbox" name="${k}" value="${esc(o)}" ${(A[k] || []).includes(o) ? 'checked' : ''}><span>${esc(o)}</span></label>`).join('')}</fieldset>`;
  function fieldHtml(f, autofocus) {
    const [k, label, type, req, ac, ph, list] = f;
    const val = A[k] ?? '';
    const lab = `<span>${label}${req ? ' <span class="req" aria-hidden="true">*</span>' : ''}</span>`;
    if (type === 'select') return `<label class="f">${lab}<select data-k="${k}"><option value="">Choose one</option>${list.map(o => `<option ${val === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></label>`;
    if (type === 'area') return `<label class="f">${lab}<textarea data-k="${k}" placeholder="${esc(ph || '')}">${esc(val)}</textarea></label>`;
    return `<label class="f">${lab}<input data-k="${k}" type="${type}" value="${esc(val)}" ${req ? 'required' : ''} ${ac ? `autocomplete="${ac}"` : ''} placeholder="${esc(ph || '')}" ${autofocus ? 'data-autofocus' : ''} ${type === 'number' ? 'inputmode="numeric" min="0"' : ''}></label>`;
  }
  function pieceHtml(n) {
    const w = workAt(n) || {};
    const src = w.image_path ? urls[w.image_path] : '';
    return `<div class="piece" data-piece="${n}">
      <label class="drop" title="Upload a photo of piece ${n}">
        ${src ? `<img src="${esc(src)}" alt="Piece ${n}: ${esc(w.title || '')}">` : `<span><b style="display:block;color:var(--ink);font-size:17px">Tap to add a photo</b>JPG, PNG or WEBP, up to 10MB</span>`}
        <input type="file" accept="image/jpeg,image/png,image/webp,image/heic" class="sr" data-photo="${n}" aria-label="Photo for piece ${n}">
      </label>
      <div class="stack" style="gap:12px">
        <label class="f">Title<input data-w="title" value="${esc(w.title || '')}" placeholder="Untitled is fine"></label>
        <label class="f">Medium<input data-w="medium" value="${esc(w.medium || '')}" placeholder="Acrylic and spray paint on canvas"></label>
        <div class="grid2" style="grid-template-columns:1fr 1fr"><label class="f">Size<input data-w="size" value="${esc(w.size || '')}" placeholder="48 x 36 in"></label>
        <label class="f"><span>Year <span class="hint">(optional)</span></span><input data-w="year" value="${esc(w.year || '')}" placeholder="2025" inputmode="numeric"></label></div>
        <p class="hint" data-status="${n}" role="status">${w.image_path ? 'Photo saved.' : ''}</p>
      </div></div>`;
  }

  function qBody(q) {
    if (q.type === 'fields') return `<div class="stack">${q.fields.map((f, i) => fieldHtml(f, i === 0)).join('')}</div>`;
    if (q.type === 'one') return (q.promise ? `<h2 style="font-size:21px;line-height:1.3">Thank you for sharing your work with us. Here's what we promise you.</h2>
        <div class="promise">
          <div><b>Your work stays yours.</b>You keep every right to your art. We only look at it to get to know you.</div>
          <div><b>Your information stays private.</b>We never sell it. We only share it with a business when you say yes to a project.</div>
          <div><b>A real person reads every application.</b>No automatic rejections.</div>
          <div><b>You can change your mind.</b>Ask us any time and we'll remove your application.</div>
        </div><h2 style="font-size:21px;line-height:1.3;margin-top:8px">${esc(q.ask)} <span class="hint" style="font-size:15px">(optional)</span></h2>` : '') + bigOne(q.key, q.list, A[q.key]);
    if (q.type === 'many') return bigMany(q.key, q.list)
      + (q.other ? `<div id="otherBox" ${(A[q.key] || []).includes('Other') ? '' : 'hidden'}>${fieldHtml([q.other, 'Tell us what else you make', 'text', false])}</div>` : '')
      + (q.detail ? fieldHtml([q.detail, q.detailLabel, 'area', false, '', q.detailPh]) : '');
    if (q.type === 'age') return `<fieldset data-group="is_adult_pick" class="q-list"><label class="choice"><input type="radio" name="is_adult_pick" value="yes" ${A.is_adult ? 'checked' : ''}><span>Yes, I'm 18 or older</span></label></fieldset><p class="hint">If you're under 18, we can't accept applications yet. We'd love to hear from you when you're 18.</p>`;
    if (q.type === 'piece') return pieceHtml(q.n);
    if (q.type === 'more') return `<fieldset class="q-list"><label class="choice"><input type="radio" name="more" value="yes"><span>Yes, add another piece</span></label><label class="choice"><input type="radio" name="more" value="no"><span>No, keep going</span></label></fieldset>`;
    if (q.type === 'refq') return `<fieldset class="q-list"><label class="choice"><input type="radio" name="refq" value="yes" ${wantRef === true ? 'checked' : ''}><span>Yes, add a reference</span></label><label class="choice"><input type="radio" name="refq" value="no" ${wantRef === false ? 'checked' : ''}><span>No, skip this</span></label></fieldset>`;
    if (q.type === 'heard2') {
      const h = A.heard_from || '';
      if (h.startsWith('AI search')) return `<div class="stack">${fieldHtml(['heard_ai_tool', 'Which AI tool?', 'select', false, '', '', OPT.ai], false)}${fieldHtml(['heard_ai_prompt', 'What did you ask it?', 'text', false, '', 'For example: art opportunities for muralists in North Carolina'])}</div>`;
      if (h === 'An event or workshop') return fieldHtml(['heard_event', 'Which event or workshop?', 'text', false], true);
      return fieldHtml(['heard_referrer', 'Who referred you?', 'text', false], true);
    }
    if (q.type === 'send') {
      const miss = missing();
      const secs = {};
      visible().forEach(x => { if (x.type !== 'send' && x.type !== 'more') (secs[x.sec] = secs[x.sec] || []).push(x); });
      return `${miss.length ? `<div class="notice bad stack" style="gap:6px"><b>A few answers still need you:</b><ul style="margin:0;padding-left:20px">${miss.map(m => `<li><button class="linkbtn" type="button" data-goto="${m[1]}">${esc(m[0])}</button></li>`).join('')}</ul></div>` : `<div class="notice ok">Everything's in. One last step.</div>`}
        <details class="card pad"><summary style="cursor:pointer;font-weight:700">Check your answers</summary><div class="stack" style="margin-top:12px">
          ${Object.entries(secs).map(([s, qs]) => `<div><h3 style="font-size:17px;margin-bottom:6px">${esc(s)}</h3>${qs.map(x => `<div class="row" style="justify-content:space-between;border-bottom:1px solid var(--line);padding:6px 0"><span class="hint" style="flex:1;min-width:180px">${esc(x.title === 'Almost done' ? 'Public profile' : x.title)}</span><span style="flex:2;min-width:180px">${esc(answerText(x))}</span><button class="linkbtn" type="button" data-goto="${x.id}">Edit</button></div>`).join('')}</div>`).join('')}
        </div></details>
        <section class="card pad stack">
          <h3>Terms of Use and Privacy Notice</h3>
          ${A.terms_accepted_at ? `<p class="notice ok">You agreed on ${new Date(A.terms_accepted_at).toLocaleDateString()}.</p>` : `<p>Please read our Terms of Use and Privacy Notice. It's written in plain language.</p>`}
          <div><button class="btn ${A.terms_accepted_at ? 'btn-ghost' : 'btn-blue'}" id="openTerms" type="button">${A.terms_accepted_at ? 'Read them again' : 'Read and agree'}</button></div>
        </section>
        <div><button class="btn btn-blue" id="sendApp" type="button" ${miss.length || !A.terms_accepted_at ? 'disabled' : ''}>Send my application</button></div>`;
    }
    return '';
  }
  function answerText(q) {
    const j = (x) => Array.isArray(x) ? x.join(', ') : (x ?? '');
    if (q.type === 'fields') return q.fields.map(f => j(A[f[0]])).filter(Boolean).join(' · ') || 'Skipped';
    if (q.type === 'one' || q.type === 'many') return j(A[q.key]) || (q.optional ? 'No answer' : 'Not answered');
    if (q.type === 'age') return A.is_adult ? 'Yes' : 'Not answered';
    if (q.type === 'piece') { const w = workAt(q.n); return w ? [w.image_path ? 'Photo' : 'No photo', w.title, w.medium, w.size].filter(Boolean).join(' · ') : (q.req ? 'Not added' : 'Skipped'); }
    if (q.type === 'refq') return wantRef ? 'Yes' : 'No';
    if (q.type === 'heard2') return [A.heard_ai_tool, A.heard_ai_prompt, A.heard_referrer, A.heard_event].filter(Boolean).join(' · ') || 'Skipped';
    return '';
  }

  views.apply = () => {
    if (submitted()) return appSummary();
    const vs = visible();
    if (!qid || !vs.find(x => x.id === qid)) qid = firstOpen();
    const i = vs.findIndex(x => x.id === qid), q = vs[i];
    const pct = Math.round((i / (vs.length - 1)) * 100);
    const autoTypes = ['one', 'age', 'more', 'refq'];
    const showContinue = !autoTypes.includes(q.type) || q.optional || answered(q);
    return `<div class="q-wrap">
      <div class="row" style="justify-content:space-between">
        ${i > 0 ? `<button class="btn btn-ghost btn-sm" type="button" id="qBack">Back</button>` : '<span></span>'}
        <span class="hint"><b style="color:var(--ink)">${esc(q.sec)}</b> · ${i + 1} of ${vs.length}</span>
      </div>
      <div class="q-bar" role="progressbar" aria-label="Application progress" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%"></span></div>
      <form id="qForm" class="stack q-anim" novalidate style="gap:18px">
        <h1 class="q-title disp">${esc(q.title)}</h1>
        ${q.hint ? `<p class="hint" style="font-size:16px;margin-top:-8px">${esc(q.hint)}</p>` : ''}
        ${qBody(q)}
        <p class="err" id="qErr" role="alert" hidden></p>
        ${q.type === 'send' ? '' : `<div class="row" style="gap:16px">
          ${showContinue ? `<button class="btn btn-blue" type="submit">${q.type === 'piece' && !q.req && !workAt(q.n) ? 'Skip' : 'Continue'}</button>` : ''}
          ${q.skippable ? `<button class="linkbtn" type="button" id="qSkip">Skip</button>` : ''}
          ${autoTypes.includes(q.type) ? '<span class="hint">Tap an answer to keep going.</span>' : '<span class="hint">or press Enter</span>'}
        </div>`}
      </form>
      <p class="hint" style="text-align:center">Your answers save as you go. You can leave and pick up right here later.</p>
    </div>`;
  };

  function appSummary() {
    const row = (l, x) => `<tr><th scope="row" style="width:40%">${esc(l)}</th><td>${esc(Array.isArray(x) ? x.join(', ') : (x ?? ''))}</td></tr>`;
    return `<div class="stack" style="gap:20px">
      <div class="row" style="justify-content:space-between"><h1 class="disp">Your application</h1><span class="tag ${STATUS[A.status].tone}">${STATUS[A.status].label}</span></div>
      <p class="notice ok">Sent on ${A.submitted_at ? new Date(A.submitted_at).toLocaleDateString() : ''}. Need to change something? Write to us at <a href="mailto:${esc(C.contactEmail)}">${esc(C.contactEmail)}</a>. You can keep adding work and updating your profile any time.</p>
      <section class="card pad"><table class="t">
        ${row('Name you work under', A.display_name)}${row('City and state', A.city_state)}${row('Travel range', A.travel_range)}
        ${row('Disciplines', A.disciplines)}${row('Services', A.services)}${row('Portfolio', A.portfolio_url)}
        ${row('Largest piece', A.largest_piece)}${row('Where your work has lived', A.where_shown_types)}${row('Can install', A.can_install)}${row('Smallest project', A.min_project)}
        ${row('Notice needed', A.notice)}${row('Insurance', A.insurance)}${row('How you heard about SOV', A.heard_from)}
      </table></section>
      <a class="btn btn-ghost" href="#works" style="align-self:flex-start">See my work</a></div>`;
  }

  async function saveStep() {
    const form = $('#qForm'); if (!form) return true;
    const patch = collect(form);
    delete patch.is_adult_pick; delete patch.more; delete patch.refq;
    if (Object.keys(patch).length) { if (!(await saveArtist(patch))) return false; }
    await saveWorkText();
    return true;
  }
  function validate(q) {
    const form = $('#qForm');
    if (q.type === 'fields') {
      for (const f of q.fields) { const el = $(`[data-k="${f[0]}"]`, form); if (f[3] && !el.value.trim()) return `Please add your ${f[1].toLowerCase()}.`; if (f[2] === 'url' && el.value.trim() && !/^https?:\/\/\S+\.\S+/.test(el.value.trim())) return 'Please use a full link that starts with https://'; }
    }
    if (q.type === 'many' && !q.optional && !$$('input:checked', form).length) return 'Choose at least one.';
    if (q.type === 'one' && !q.optional && !$$('input:checked', form).length) return 'Choose one to keep going.';
    if (q.type === 'piece' && q.req) {
      const card = $('[data-piece]', form); const w = workAt(q.n);
      const vals = Object.fromEntries($$('[data-w]', card).map(i => [i.dataset.w, i.value.trim()]));
      if (!w || !w.image_path) return 'Add a photo of this piece first.';
      if (!vals.title || !vals.medium || !vals.size) return 'Add a title, medium and size. "Untitled" is fine.';
    }
    return '';
  }
  async function go(delta, skip) {
    const vs = visible(); const i = vs.findIndex(x => x.id === qid); const q = vs[i];
    if (delta > 0 && !skip) { const e = validate(q); if (e) { const el = $('#qErr'); el.textContent = e; el.hidden = false; return; } }
    if (!skip) { if (!(await saveStep())) return; }
    // step through the full question order so answers that hide or show screens never lose our place
    const vis = new Set(visible().map(x => x.id));
    let k = Q.findIndex(x => x.id === qid);
    do { k += delta; } while (k > 0 && k < Q.length - 1 && !vis.has(Q[k].id));
    qid = Q[Math.max(0, Math.min(Q.length - 1, k))].id; render(); window.scrollTo(0, 0);
    const af = $('[data-autofocus]') || $('#qForm input:not([type=file])'); if (af && !/Mobi/.test(navigator.userAgent)) af.focus({ preventScroll: true });
  }

  async function saveWorkText() {
    for (const card of $$('[data-piece]')) {
      const n = Number(card.dataset.piece);
      const vals = {}; $$('[data-w]', card).forEach(i => vals[i.dataset.w] = i.value.trim() || null);
      const w = works.find(x => x.position === n);
      if (w) {
        if (['title', 'medium', 'size', 'year'].some(k => (w[k] || null) !== vals[k])) {
          const { data, error } = await sb.from('works').update(vals).eq('id', w.id).select().single();
          if (!error) Object.assign(w, data);
        }
      } else if (Object.values(vals).some(Boolean)) {
        const { data, error } = await sb.from('works').insert({ artist_id: user.id, position: n, ...vals }).select().single();
        if (!error) works.push(data);
      }
    }
  }

  async function uploadPhoto(input, n) {
    const file = input.files && input.files[0]; if (!file) return;
    const status = $(`[data-status="${n}"]`);
    if (file.size > 10 * 1024 * 1024) { status.textContent = 'That file is over 10MB. Try a smaller photo.'; return; }
    status.textContent = 'Uploading...';
    await saveWorkText();
    const blob = await shrink(file);
    const ext = blob.type === 'image/jpeg' ? 'jpg' : (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const up = await sb.storage.from('artworks').upload(path, blob, { contentType: blob.type || file.type, upsert: false });
    if (up.error) { status.textContent = 'Upload failed. Please try again.'; console.error(up.error); return; }
    let w = works.find(x => x.position === n);
    const old = w && w.image_path;
    if (w) { const r = await sb.from('works').update({ image_path: path }).eq('id', w.id).select().single(); if (!r.error) Object.assign(w, r.data); }
    else { const r = await sb.from('works').insert({ artist_id: user.id, position: n, image_path: path }).select().single(); if (!r.error) works.push(r.data); }
    if (old) await sb.storage.from('artworks').remove([old]);
    await signPhotos([path]);
    render(); toast('Photo saved');
  }
  // Downsize big photos in the browser so uploads are quick and storage stays light.
  async function shrink(file) {
    try {
      if (!/image\/(jpeg|png|webp)/.test(file.type)) return file;
      const bmp = await createImageBitmap(file);
      const max = 2400, scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
      if (scale === 1 && file.size < 3 * 1024 * 1024) return file;
      const c = document.createElement('canvas'); c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      return await new Promise(r => c.toBlob(b => r(b || file), 'image/jpeg', 0.88));
    } catch (e) { return file; }
  }

  // ---- terms modal (scroll to the bottom to unlock) ----
  async function openTerms() {
    const dlg = $('#termsDlg'), body = $('#termsBody'), agree = $('#termsAgree'), prog = $('#termsProg');
    if (!body.dataset.loaded) {
      const html = await (await fetch('terms.html')).text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const art = doc.querySelector('#terms'); art.querySelector('h1')?.remove();
      body.innerHTML = art.innerHTML; body.dataset.loaded = '1';
    }
    agree.disabled = true; prog.textContent = 'Scroll to the bottom to continue';
    const check = () => { if (body.scrollTop + body.clientHeight >= body.scrollHeight - 12) { agree.disabled = false; prog.textContent = "You've reached the end. Thank you for reading."; } };
    body.onscroll = check; body.scrollTop = 0;
    dlg.showModal(); body.focus(); setTimeout(check, 50);
  }
  $('#termsCancel').onclick = () => $('#termsDlg').close();
  $('#termsAgree').onclick = async () => {
    const now = new Date().toISOString();
    if (await saveArtist({ terms_accepted_at: now, terms_version: C.termsVersion })) {
      await sb.from('consent_events').insert({ artist_id: user.id, kind: 'terms_and_privacy', value: 'agreed ' + C.termsVersion });
      $('#termsDlg').close(); toast('Thank you. Terms accepted.'); render();
    }
  };

  views.works = () => {
    const appPieces = works.filter(w => w.position);
    const more = works.filter(w => !w.position);
    const fig = (w) => `<figure><img src="${esc(urls[w.image_path] || '')}" alt="${esc(w.title || 'Artwork')}" loading="lazy"><figcaption><b>${esc(w.title || 'Untitled')}</b><br><span class="hint">${esc([w.medium, w.size, w.year].filter(Boolean).join(' · '))}</span>${!w.position ? `<br><button class="linkbtn" data-del="${w.id}">Remove</button>` : ''}</figcaption></figure>`;
    return `<div class="stack" style="gap:20px">
      <h1 class="disp">My work</h1>
      <p class="hint" style="font-size:16px">Your photos are private. Only you and our review team can see them until you're approved and say yes to a public profile.</p>
      ${appPieces.length ? `<h2>From your application</h2><div class="gallery">${appPieces.filter(w => w.image_path).map(fig).join('')}</div>` : `<p class="notice">Add your first pieces in <a href="#apply">your application</a>.</p>`}
      ${submitted() ? `<h2>More work</h2>${more.length ? `<div class="gallery">${more.map(fig).join('')}</div>` : '<p class="hint">Nothing here yet.</p>'}
      <form class="card pad stack" id="addWork" novalidate><h3>Add a piece</h3>
        <div class="grid2"><label class="f">Photo<input type="file" id="nwFile" accept="image/jpeg,image/png,image/webp,image/heic" required></label><label class="f">Title<input id="nwTitle"></label></div>
        <div class="grid2"><label class="f">Medium<input id="nwMedium"></label><label class="f">Size<input id="nwSize" placeholder="48 x 36 in"></label></div>
        <label class="f" style="max-width:200px">Year<input id="nwYear"></label>
        <div><button class="btn" type="submit">Add to my work</button></div></form>` : ''}
    </div>`;
  };

  views.profile = () => `<form class="stack" id="profForm" novalidate style="gap:20px;max-width:760px">
      <h1 class="disp">Profile</h1>
      <p class="hint" style="font-size:16px">Finished profiles get matched first. You can update this any time.</p>
      <div class="grid2">${field('display_name', 'Name you work under')}${field('pronouns', 'Pronouns (optional)')}</div>
      <div class="grid2">${field('phone', 'Phone', { type: 'tel' })}${field('city_state', 'City and state')}</div>
      <div class="grid2">${field('portfolio_url', 'Portfolio or website', { type: 'url' })}${field('social_url', 'Instagram or other social link', { type: 'url' })}</div>
      ${field('bio', 'Short bio', { area: 1, hint: 'Two or three sentences in your own words. This is what a business reads first.' })}
      ${field('statement', 'Artist statement', { area: 1, hint: 'What your work is about and how you make it.' })}
      <div><button class="btn" type="submit">Save profile</button></div>
      <p class="hint">Signed in as ${esc(user.email)}.</p>
    </form>`;

  views.call = () => {
    const s = A.status;
    let body;
    if (s === 'call_invited') body = `<p>You're invited to a 30-minute video call on Google Meet with a working artist from our team. It's a conversation between artists, not a test.</p>
      <ul><li>Have 3 to 5 pieces ready to talk about, including your largest.</li><li>Be ready to walk through one project from first conversation to finished piece.</li><li>Bring your questions for us, too.</li></ul>
      <div class="row"><a class="btn btn-blue" href="${esc(C.bookingUrl)}" target="_blank" rel="noopener">Pick a time for my call</a><button class="btn btn-ghost" id="booked" type="button">I've booked it</button></div>`;
    else if (s === 'call_booked') body = `<p class="notice ok">Your call is booked. The Google Meet link is in your email and calendar invite.</p><p class="hint">Need to move it? Use the link in your calendar invite, or write to us at ${esc(C.contactEmail)}.</p>`;
    else if (['approved', 'active'].includes(s)) body = `<p class="notice ok">Your video call is done. Thank you for your time.</p>`;
    else if (s === 'draft') body = `<p>Once you send your application, a real person on our team reviews it. If it's a good fit, you'll be invited to a video call and you can book it right here.</p><div><a class="btn" href="#apply">Go to my application</a></div>`;
    else body = `<p>We're reviewing your application. If it's a good fit, we'll email you, and a button to book your call will appear here.</p>`;
    return `<div class="stack" style="gap:18px;max-width:760px"><h1 class="disp">Video call</h1><section class="card pad stack">${body}</section></div>`;
  };

  views.privacy = () => `<div class="stack" style="gap:20px;max-width:760px">
      <h1 class="disp">Privacy and your data</h1>
      <section class="card pad stack" id="consentForm"><h3>Your choices</h3>
        ${radios('consent_public_profile', "If you're approved, can we show your name and work on a public SOV artist profile?", OPT.profile)}
        ${radios('consent_news', 'Would you like occasional emails about open calls and SOV news?', OPT.news)}
        <div><button class="btn" id="saveConsent" type="button">Save my choices</button></div>
      </section>
      <section class="card pad stack"><h3>Who can see what</h3>
        <table class="t"><tr><th>Your information</th><th>Who can see it now</th></tr>
        <tr><td>Contact details, pricing, legal name</td><td>You and the SOV review team</td></tr>
        <tr><td>Photos of your work</td><td>You and the SOV review team</td></tr>
        <tr><td>Public profile</td><td>${A.consent_public_profile === 'Yes, show my profile' ? 'The public, once you are approved' : 'No one. It stays off until you say yes.'}</td></tr></table>
      </section>
      <section class="card pad stack"><h3>Your data</h3>
        <p>Download a copy of everything you've given us, or ask us to delete your account.</p>
        <div class="row"><button class="btn btn-ghost" id="dl" type="button">Download my data</button>
        <a class="btn btn-ghost" href="mailto:${esc(C.contactEmail)}?subject=${encodeURIComponent('Please delete my SOV account')}&body=${encodeURIComponent('Please delete my SOV account and application. My account email is ' + user.email + '.')}">Ask us to delete my account</a></div>
        <p class="hint">Agreed to Terms of Use and Privacy Notice: ${A.terms_accepted_at ? new Date(A.terms_accepted_at).toLocaleString() + ' (' + esc(A.terms_version || '') + ')' : 'not yet'}. <a href="terms.html" target="_blank" rel="noopener">Read them</a>.</p>
      </section></div>`;

  views.resources = () => `<div class="stack" style="gap:20px">
      <h1 class="disp">Resources</h1>
      <div class="grid2">
        <section class="card pad stack" style="gap:8px"><h3>Photograph your work</h3><p class="hint">Shoot in daylight, straight on, with the whole piece in frame. Add one photo of the work in a real room so a business can picture scale.</p></section>
        <section class="card pad stack" style="gap:8px"><h3>Price a commission</h3><p class="hint">Separate your creative fee from materials, install and travel. Businesses expect to see each on its own line.</p></section>
        <section class="card pad stack" style="gap:8px"><h3>Insurance basics</h3><p class="hint">Many hotels and hospitals ask for general liability cover on installs. Per-project policies are an option if you don't carry it year-round.</p></section>
        <section class="card pad stack" style="gap:8px"><h3>Questions?</h3><p class="hint">Write to us at <a href="mailto:${esc(C.contactEmail)}">${esc(C.contactEmail)}</a>. A real person answers.</p></section>
      </div></div>`;

  // ---------- router ----------
  function current() { const h = (location.hash || '#home').slice(1); return views[h] ? h : 'home'; }
  function render() {
    const name = current();
    $$('#nav a[href^="#"]').forEach(a => { if (a.getAttribute('href') === '#' + name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    $('#view').innerHTML = views[name]();
    wire(name);
  }
  function wire(name) {
    if (name === 'apply' && !submitted()) {
      const vs = visible(); const q = vs.find(x => x.id === qid);
      $('#qBack')?.addEventListener('click', () => go(-1));
      $('#qSkip')?.addEventListener('click', () => go(1, true));
      $('#qForm').addEventListener('submit', (e) => { e.preventDefault(); go(1); });
      $('#qForm').addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName === 'TEXTAREA' && !e.shiftKey) { e.preventDefault(); go(1); } });
      // single-choice questions move forward on tap
      if (q && ['one', 'age', 'more', 'refq'].includes(q.type)) {
        $$('#qForm input[type=radio]').forEach(r => r.addEventListener('click', async () => {
          if (q.type === 'age') { if (await saveArtist({ is_adult: true })) go(1, true); return; }
          if (q.type === 'more') { if (r.value === 'yes') extraPieces++; else noMorePieces = true; go(1, true); return; }
          if (q.type === 'refq') { wantRef = r.value === 'yes'; go(1, true); return; }
          setTimeout(() => go(1), 180);
        }));
      }
      const other = $('#otherBox'); if (other) $$('input[name="disciplines"]').forEach(c => c.addEventListener('change', () => { other.hidden = !$('input[name="disciplines"][value="Other"]').checked; }));
      $$('[data-photo]').forEach(i => i.addEventListener('change', () => uploadPhoto(i, Number(i.dataset.photo))));
      $$('[data-goto]').forEach(b => b.addEventListener('click', () => { qid = b.dataset.goto; render(); window.scrollTo(0, 0); }));
      $('#openTerms')?.addEventListener('click', openTerms);
      $('#sendApp')?.addEventListener('click', async (e) => {
        e.target.disabled = true; e.target.textContent = 'Sending...';
        const consent = [];
        if (A.consent_public_profile) consent.push({ artist_id: user.id, kind: 'public_profile', value: A.consent_public_profile });
        if (A.consent_news) consent.push({ artist_id: user.id, kind: 'news_emails', value: A.consent_news });
        if (consent.length) await sb.from('consent_events').insert(consent);
        if (await saveArtist({ status: 'submitted', submitted_at: new Date().toISOString() })) { location.hash = '#home'; toast('Application sent. Thank you!'); render(); }
        else { e.target.disabled = false; e.target.textContent = 'Send my application'; }
      });
    }
    if (name === 'profile') $('#profForm').addEventListener('submit', async (e) => { e.preventDefault(); if (await saveArtist(collect(e.target))) { $('#av').textContent = initials(A.display_name); toast('Profile saved'); } });
    if (name === 'privacy') {
      $('#saveConsent').addEventListener('click', async () => {
        const p = collect($('#consentForm'));
        if (await saveArtist(p)) {
          await sb.from('consent_events').insert([{ artist_id: user.id, kind: 'public_profile', value: p.consent_public_profile || 'no answer' }, { artist_id: user.id, kind: 'news_emails', value: p.consent_news || 'no answer' }]);
          toast('Choices saved'); render();
        }
      });
      $('#dl').addEventListener('click', async () => {
        const ev = await sb.from('consent_events').select('*').eq('artist_id', user.id);
        const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), account_email: user.email, artist: A, works, consent_history: ev.data || [] }, null, 2)], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'my-sov-data.json'; a.click(); URL.revokeObjectURL(a.href);
      });
    }
    if (name === 'call') $('#booked')?.addEventListener('click', async () => { if (await saveArtist({ status: 'call_booked' })) { toast('Great, see you on the call'); render(); } });
    if (name === 'works') {
      $$('[data-del]').forEach(b => b.addEventListener('click', async () => {
        const w = works.find(x => x.id === b.dataset.del); if (!w || !confirmRemove()) return;
        await sb.from('works').delete().eq('id', w.id); if (w.image_path) await sb.storage.from('artworks').remove([w.image_path]);
        works = works.filter(x => x.id !== w.id); render();
      }));
      $('#addWork')?.addEventListener('submit', async (e) => {
        e.preventDefault(); const f = $('#nwFile').files[0]; if (!f) { toast('Choose a photo first'); return; }
        const btn = e.target.querySelector('button'); btn.disabled = true; btn.textContent = 'Uploading...';
        const blob = await shrink(f); const path = `${user.id}/${crypto.randomUUID()}.${blob.type === 'image/jpeg' ? 'jpg' : (f.name.split('.').pop() || 'jpg')}`;
        const up = await sb.storage.from('artworks').upload(path, blob, { contentType: blob.type || f.type });
        if (up.error) { toast('Upload failed'); btn.disabled = false; btn.textContent = 'Add to my work'; return; }
        const r = await sb.from('works').insert({ artist_id: user.id, image_path: path, title: $('#nwTitle').value || null, medium: $('#nwMedium').value || null, size: $('#nwSize').value || null, year: $('#nwYear').value || null }).select().single();
        if (!r.error) works.push(r.data); await signPhotos([path]); toast('Added'); render();
      });
    }
  }
  function confirmRemove() { return window.confirm('Remove this piece from your work?'); }
  function greeting() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }
  function firstName() { return (A.display_name || user.email.split('@')[0]).split(' ')[0]; }

  $('#out').addEventListener('click', signOut);
  window.addEventListener('hashchange', async () => {
    if ($('#qForm')) await saveStep();
    render(); window.scrollTo(0, 0);
  });
  window.addEventListener('beforeunload', () => { if ($('#qForm')) saveStep(); });

  try { await load(); render(); }
  catch (e) { console.error(e); $('#view').innerHTML = `<p class="notice bad">We couldn't load your dashboard. Please refresh the page. If it keeps happening, write to ${esc(C.contactEmail)}.</p>`; }
})();

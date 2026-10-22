/* SOV business brief: one question at a time, saved in this browser until sent, then stored in Supabase. */
(function () {
  var C = window.SOV_CONFIG || {};
  var root = document.getElementById('bf');
  var KEY = 'sov_brief_v1';
  var A = {};
  try { A = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { A = {}; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(A)); } catch (e) { /* storage blocked */ } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function utm() { try { return JSON.parse(sessionStorage.getItem('sov_utm') || '{}'); } catch (e) { return {}; } }

  var OPT = {
    mode: ['Post an opportunity myself (self-serve)', 'Have SOV find the creative and run it (curated match)', 'Set up an ongoing creative program', 'Not sure yet, help me decide'],
    usage: ['Shown on site only', 'Photos in our marketing and social', 'Ads or paid campaigns', 'Merchandise or products', 'Exclusive to us', 'Not sure yet'],
    sector: ['Boutique or lifestyle hotel', 'Nonprofit organization', 'Museum, festival or cultural institution', 'Residential or mixed-use development', 'Restaurant, bar, food hall or private club', 'Wellness, spa or retreat', 'Winery, distillery, venue or destination', 'Office, workplace or retail', 'Healthcare', 'City, county, public agency or arts council', 'An event or launch', 'Something else'],
    procure: ['We can hire directly', 'We need to post an RFQ or RFP', 'It is grant funded', 'Not sure yet'],
    outcomes: ['Better guest or patient experience', 'Local identity, a sense of place', 'Photos and social sharing', 'Staff belonging and wellbeing', 'Tell our brand story', 'Bring in foot traffic', 'Community goodwill', 'Calm and comfort'],
    creative: ['Mural or wall art', 'Original artwork for our walls', 'Sculpture or installation', 'Art on loan that rotates', 'Live music or performance', 'Live painting at an event', 'Photo or video content', 'Design: signage, wayfinding or graphics', 'Workshops or community programs', 'Not sure yet, help me choose'],
    constraints: ['Must be finished by a set date', 'Work happens while we are open', 'Outdoors or exposed to weather', 'Low-odor or low-VOC materials needed', 'Must be cleanable (infection control)', 'Heavy or hanging work (wall, ceiling, structure)', 'Limited access, loading or work hours', 'Ongoing care or maintenance plan needed'],
    approvals: ['Historic building or historic district', 'Landmark, preservation or SHPO review', 'Building or fire code review', 'Accessibility (ADA) requirements', 'Zoning, sign or mural ordinance', 'Permits or business licenses', 'Landlord, owner or HOA approval', 'Arts commission or design review', 'Structural or engineering sign-off', 'Specific insurance or COI requirements', 'Community input or public meetings', 'Venue or union rules', "Not sure what applies, help us check"],
    age: ['Built in the last 20 years', '20 to 50 years old', 'More than 50 years old', 'Not sure', 'Outdoors or no building'],
    budget: ['Under $5,000', '$5,000 to $15,000', '$15,000 to $50,000', '$50,000 to $150,000', 'More than $150,000', 'Not sure yet'],
    source: ['Renovation or construction', 'Furniture and fixtures', 'Marketing', 'HR or culture', 'Percent for art or public art fund', 'Grant or sponsor', 'Exploring, no budget approved yet', 'Not sure'],
    when: ['In the next 3 months', '3 to 6 months', '6 to 12 months', 'More than a year out', 'No set date'],
    heard: ['Google or web search', 'AI search (ChatGPT, Claude, Perplexity, Gemini)', 'Instagram', 'LinkedIn', 'A referral', 'An event', 'An artist or creative', 'Other']
  };
  var Q = [
    { id: 'mode', sec: 'Your space', type: 'one', key: 'engagement_mode', title: 'How would you like to work with us?', hint: 'You can change this later. It just tells us where to start.', list: OPT.mode },
    { id: 'byo', sec: 'Your space', type: 'fields', title: 'Already have a creative in mind?', hint: "Optional. We'll invite them in, and you can still post to our network.", skippable: true, fields: [['byo_creative', 'Their name', 'text', false, 'Jordan Rivera'], ['byo_contact', 'Their email, site or Instagram (optional)', 'text', false, 'jordanrivera.studio']] },
    { id: 'sector', sec: 'Your space', type: 'one', key: 'sector', title: 'What kind of organization is this for?', list: OPT.sector },
    { id: 'procure', sec: 'Your space', type: 'one', key: 'procurement_path', title: 'How does your agency usually hire for this?', hint: "No wrong answer. If you need a formal call for artists, we can help write it and run it, and creatives apply through SOV.", list: OPT.procure, optional: true },
    { id: 'outcomes', sec: 'Your space', type: 'many', key: 'outcomes', title: 'What should the work do for your space?', hint: 'Pick all that apply. This shapes who we match you with.', list: OPT.outcomes },
    { id: 'creative', sec: 'Your space', type: 'many', key: 'creative_types', title: 'What kind of creative work are you picturing?', hint: "Pick all that fit. It's fine to say you're not sure.", list: OPT.creative },
    { id: 'site', sec: 'The details', type: 'fields', title: 'Tell us about the space', fields: [['space_type', 'Which space?', 'text', true, 'Main lobby wall, about 18 ft wide'], ['city_state', 'City and state or region', 'text', true, 'Winston-Salem, NC'], ['country', 'Country (optional)', 'text', false, 'United States', 'country-name'], ['site_size', 'Size or capacity (optional)', 'text', false, '18 ft x 12 ft, or 150 guests']] },
    { id: 'story', sec: 'The details', type: 'fields', title: 'Who will experience it, and what story should it tell?', hint: "Optional, but the more you share, the better your matches.", skippable: true, fields: [['audience', 'Who will see or experience it?', 'area', false, 'Hotel guests, many visiting for the first time, and locals who come for the bar.'], ['theme', 'Any theme or story?', 'area', false, "The city's textile history turning into its arts story today. Warm, not literal."], ['feeling', 'How should it feel? (optional)', 'text', false, 'Calm and warm, a little surprising']] },
    { id: 'usage', sec: 'The details', type: 'many', key: 'usage_rights', title: 'How do you plan to use the work?', hint: 'Optional. Creatives keep their copyright, so we license the uses you need up front and price them in. No surprises later.', list: OPT.usage, optional: true },
    { id: 'limits', sec: 'The details', type: 'many', key: 'constraints', title: 'Anything about the site we should plan around?', hint: 'Optional. Pick any that apply.', list: OPT.constraints, optional: true },
    { id: 'age', sec: 'The details', type: 'one', key: 'building_age', title: 'How old is the building?', hint: 'Buildings over 50 years old can fall under historic rules, even when they are not listed. Knowing early saves weeks.', list: OPT.age, optional: true },
    { id: 'approvals', sec: 'The details', type: 'many', key: 'approvals', title: 'Codes, permits and approvals', hint: "Pick anything you know applies. If you're not sure, say so. Checking this is part of our job, and we price it in before anything is signed.", list: OPT.approvals, optional: true },
    { id: 'approvals2', sec: 'The details', type: 'fields', title: 'Tell us what you know so far', hint: 'Optional. A district name, a contact at the city, a landlord rule, or a code you have run into before.', skippable: true, fields: [['approvals_detail', 'What should we know?', 'area', false, 'The building is in the downtown historic district. Facade changes go to the preservation commission, which meets monthly.']] },
    { id: 'budget', sec: 'Budget and timing', type: 'one', key: 'budget_range', title: "What's your budget range?", hint: 'All in, including our fee. Many projects set aside about 0.5 to 1 percent of construction cost for art.', list: OPT.budget },
    { id: 'source', sec: 'Budget and timing', type: 'one', key: 'budget_source', title: 'Where does the budget come from?', hint: 'This helps us pick the right kind of project. A renovation budget suits a commission. A marketing budget suits a launch event.', list: OPT.source, optional: true },
    { id: 'when', sec: 'Budget and timing', type: 'one', key: 'needed_by', title: 'When do you need it?', list: OPT.when },
    { id: 'you', sec: 'About you', type: 'fields', title: 'Who should we write back to?', hint: 'A real person from our team reads every brief.', fields: [['contact_name', 'Your name', 'text', true, '', 'name'], ['org_name', 'Organization', 'text', true, '', 'organization'], ['email', 'Work email', 'email', true, '', 'email'], ['role', 'Your role (optional)', 'text', false, 'Owner, GM, designer, facilities...', 'organization-title'], ['phone', 'Phone (optional)', 'tel', false, '', 'tel'], ['approver', 'Who gives final approval? (optional)', 'text', false, 'Me, our GM, the owner group, a design review board...']] },
    { id: 'heard', sec: 'About you', type: 'one', key: 'heard_from', title: 'How did you hear about SOV?', list: OPT.heard, optional: true },
    { id: 'heard2', sec: 'About you', type: 'fields', title: 'Tell us a little more', hint: 'Optional, but it helps us.', skippable: true, fields: [['heard_detail', 'Who referred you, which event, or what you asked the AI tool', 'text', false, '']] },
    { id: 'send', sec: 'Send', type: 'send', title: 'Check your brief and send it' }
  ];
  function has(k) { var x = A[k]; return !(x == null || x === '' || (Array.isArray(x) && !x.length)); }
  function visible() {
    return Q.filter(function (q) {
      if (q.id === 'procure') return /public agency/.test(A.sector || '') || /Post an opportunity/.test(A.engagement_mode || '');
      if (q.id === 'byo') return /Post an opportunity/.test(A.engagement_mode || '');
      if (q.id === 'approvals2') return (A.approvals || []).length > 0 || /50 years/.test(A.building_age || '');
      if (q.id === 'heard2') return /AI search|referral|event|artist/i.test(A.heard_from || '');
      return true;
    });
  }
  function answered(q) {
    if (q.type === 'fields') return q.fields.every(function (f) { return !f[3] || has(f[0]); });
    if (q.type === 'one' || q.type === 'many') return q.optional || has(q.key);
    return true;
  }
  function missing() { return visible().filter(function (q) { return q.type !== 'send' && !q.skippable && !answered(q); }); }
  var MODES = { post: 0, byo: 0, curated: 1, full: 1, define: 1, program: 2 };
  var SECTORS = { hotel: 0, nonprofit: 1, culture: 2, dev: 3, dest: 4, health: 8, city: 9, work: 7, event: 10 };
  try {
    var qs = new URLSearchParams(location.search), mq = qs.get('mode'), sq = qs.get('sector');
    if (mq && MODES[mq] != null) { A.engagement_mode = OPT.mode[MODES[mq]]; save(); }
    if (sq && SECTORS[sq] != null && !A.sector) { A.sector = OPT.sector[SECTORS[sq]]; save(); }
  } catch (e) { }
  var qid = null, sent = false, signedIn = false;
  var start = visible().find(function (q) { return q.type !== 'send' && !q.optional && !q.skippable && !answered(q); });
  qid = (start || visible()[0]).id;
  if (!Object.keys(A).filter(function (k) { return k !== 'engagement_mode' && k !== 'sector'; }).length) qid = 'intro';

  function opt(type, name, val, checked) {
    return '<label class="opt"><input type="' + type + '" name="' + name + '" value="' + esc(val) + '"' + (checked ? ' checked' : '') + '><span class="box"></span><span>' + esc(val) + '</span></label>';
  }
  function field(f, i) {
    var k = f[0], label = f[1], type = f[2], req = f[3], ph = f[4] || '', ac = f[5] || '';
    var lab = '<span>' + esc(label.replace(' (optional)', '')) + (label.indexOf('(optional)') > -1 ? ' <span class="opt-l">optional</span>' : '') + '</span>';
    if (type === 'area') return '<label class="f">' + lab + '<textarea data-k="' + k + '" maxlength="2000" placeholder="' + esc(ph) + '">' + esc(A[k] || '') + '</textarea></label>';
    return '<label class="f">' + lab + '<input data-k="' + k + '" type="' + type + '" maxlength="200" value="' + esc(A[k] || '') + '" placeholder="' + esc(ph) + '"' + (ac ? ' autocomplete="' + ac + '"' : '') + (req ? ' required' : '') + (i === 0 ? ' data-af' : '') + '></label>';
  }
  function body(q) {
    if (q.type === 'one') return '<div class="opts">' + q.list.map(function (o) { return opt('radio', q.key, o, A[q.key] === o); }).join('') + '</div>';
    if (q.type === 'many') return '<div class="opts">' + q.list.map(function (o) { return opt('checkbox', q.key, o, (A[q.key] || []).indexOf(o) > -1); }).join('') + '</div>';
    if (q.type === 'fields') return '<div class="' + (q.fields.length > 2 ? 'fields' : 'stack') + '">' + q.fields.map(field).join('') + '</div>';
    if (q.type === 'send') {
      var miss = missing();
      var rows = visible().filter(function (x) { return x.type !== 'send'; }).map(function (x) {
        var v = x.type === 'fields' ? x.fields.map(function (f) { return A[f[0]]; }).filter(Boolean).join(' · ') : (Array.isArray(A[x.key]) ? A[x.key].join(', ') : A[x.key]);
        return '<div><span>' + esc(x.title) + '</span><span>' + esc(v || (x.optional || x.skippable ? 'Skipped' : 'Not answered yet')) + '</span><button class="linkbtn" type="button" data-goto="' + x.id + '">Edit</button></div>';
      }).join('');
      return (miss.length ? '<p class="note">A few answers still need you: ' + miss.map(function (m) { return '<button class="linkbtn" type="button" data-goto="' + m.id + '">' + esc(m.title) + '</button>'; }).join(', ') + '</p>' : '')
        + '<div class="sum">' + rows + '</div>'
        + '<label class="f">Anything else? <span class="opt-l">optional</span><textarea data-k="notes" maxlength="2000" placeholder="Photos or plans you can share later, people to include, questions for us">' + esc(A.notes || '') + '</textarea></label>'
        + '<div class="hp" aria-hidden="true"><label>Leave this empty<input id="website" tabindex="-1" autocomplete="off"></label></div>'
        + '<p class="muted" style="font-size:14px">By sending, you agree that SOV may contact you about this brief. We never sell your information. <a href="account/terms.html" target="_blank" rel="noopener">Terms and privacy</a>.</p>'
        + '<div class="row"><button class="btn btn-blue" id="send" type="button"' + (miss.length ? ' disabled' : '') + '>Send my brief</button></div>';
    }
    return '';
  }

  function intro() {
    root.innerHTML = '<div class="stack" style="gap:22px">'
      + '<p class="eyebrow blue">New brief · about 4 minutes</p>'
      + '<h1>What should your space feel like?</h1>'
      + '<p class="lede">A few short questions, one at a time. Nothing is booked until you sign a scope, and a real person from our team reads every brief.</p>'
      + '<ol class="timeline"><li><span class="n" style="background:var(--blue)">1</span><span><b>Your space</b><br><span class="muted">What it is and what the work should do.</span></span></li>'
      + '<li><span class="n" style="background:var(--think)">2</span><span><b>The details</b><br><span class="muted">Where, how big, and the codes or approvals to plan around.</span></span></li>'
      + '<li><span class="n" style="background:var(--feel)">3</span><span><b>Budget and timing</b><br><span class="muted">A range is fine. Not sure is fine too.</span></span></li>'
      + '<li><span class="n" style="background:var(--exp)">4</span><span><b>Who to write back to</b><br><span class="muted">Then we take it from there.</span></span></li></ol>'
      + '<div class="row"><button class="btn btn-blue" id="go" type="button">Let\'s start</button><span class="muted" style="font-size:15px">Your answers save in this browser as you go.</span></div></div>';
    document.getElementById('go').onclick = function () { qid = Q[0].id; render(); };
  }

  function render() {
    if (sent) return done();
    if (qid === 'intro') return intro();
    var vs = visible(), i = vs.findIndex(function (x) { return x.id === qid; });
    if (i < 0) { i = 0; qid = vs[0].id; }
    var q = vs[i], pct = Math.round(i / (vs.length - 1) * 100);
    var auto = q.type === 'one';
    root.innerHTML = '<div class="bf-top"><span>' + (i > 0 ? '<button class="linkbtn" type="button" id="back">Back</button>' : '<button class="linkbtn" type="button" id="back0">Back</button>') + '</span><span><b style="color:var(--ink)">' + esc(q.sec) + '</b> · ' + (i + 1) + ' of ' + vs.length + '</span></div>'
      + '<div class="bf-bar" role="progressbar" aria-label="Brief progress" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100"><span style="width:' + pct + '%"></span></div>'
      + '<form id="qf" class="stack" novalidate style="gap:20px"><h1>' + esc(q.title) + '</h1>' + (q.hint ? '<p class="hint">' + esc(q.hint) + '</p>' : '') + body(q)
      + '<p class="err" id="err" role="alert" hidden></p>'
      + (q.type === 'send' ? '' : '<div class="row" style="gap:16px"><button class="btn btn-blue" type="submit">Continue</button>' + ((q.skippable || q.optional) ? '<button class="linkbtn" type="button" id="skip">Skip</button>' : '') + '<span class="muted" style="font-size:14px">' + (auto ? 'Tap an answer to keep going.' : 'or press Enter') + '</span></div>')
      + '</form>';
    var f = document.getElementById('qf');
    f.onsubmit = function (e) { e.preventDefault(); go(1); };
    var b = document.getElementById('back'); if (b) b.onclick = function () { go(-1, true); };
    var b0 = document.getElementById('back0'); if (b0) b0.onclick = function () { collect(); save(); qid = 'intro'; render(); };
    var s = document.getElementById('skip'); if (s) s.onclick = function () { go(1, true); };
    if (auto) f.querySelectorAll('input[type=radio]').forEach(function (r) { r.addEventListener('click', function () { setTimeout(function () { go(1); }, 160); }); });
    root.querySelectorAll('[data-goto]').forEach(function (x) { x.onclick = function () { collect(); save(); qid = x.getAttribute('data-goto'); render(); window.scrollTo(0, 0); }; });
    var send = document.getElementById('send'); if (send) send.onclick = submit;
    var af = root.querySelector('[data-af]'); if (af && !/Mobi/.test(navigator.userAgent)) af.focus({ preventScroll: true });
  }
  function collect() {
    var f = document.getElementById('qf'); if (!f) return;
    f.querySelectorAll('[data-k]').forEach(function (el) { A[el.getAttribute('data-k')] = el.value.trim(); });
    var vs = visible(), q = vs.find(function (x) { return x.id === qid; }); if (!q) return;
    if (q.type === 'one') { var c = f.querySelector('input:checked'); if (c) A[q.key] = c.value; }
    if (q.type === 'many') A[q.key] = Array.prototype.map.call(f.querySelectorAll('input:checked'), function (c) { return c.value; });
  }
  function validate(q) {
    if (q.type === 'fields') for (var i = 0; i < q.fields.length; i++) {
      var fd = q.fields[i], v = A[fd[0]] || '';
      if (fd[3] && !v) return 'Please fill in "' + fd[1].replace(' (optional)', '') + '"';
      if (fd[2] === 'email' && v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return 'Please check your email address.';
    }
    if ((q.type === 'one' || q.type === 'many') && !q.optional && !has(q.key)) return q.type === 'one' ? 'Choose one to keep going.' : 'Choose at least one.';
    return '';
  }
  function go(d, skip) {
    collect(); save();
    var vs = visible(), i = vs.findIndex(function (x) { return x.id === qid; }), q = vs[i];
    if (d > 0 && !skip) { var e = validate(q); if (e) { var el = document.getElementById('err'); el.textContent = e; el.hidden = false; return; } }
    vs = visible(); i = vs.findIndex(function (x) { return x.id === qid; });
    var n = Math.max(0, Math.min(vs.length - 1, i + d)); qid = vs[n].id; render(); window.scrollTo(0, 0);
  }
  async function submit() {
    collect(); save();
    var btn = document.getElementById('send');
    if (document.getElementById('website').value) { sent = true; render(); return; } // bots
    if (missing().length) return render();
    btn.disabled = true; btn.textContent = 'Sending...';
    var rec = { status: 'new', utm: Object.keys(utm()).length ? utm() : null, consent_contact: true };
    ['org_name', 'contact_name', 'email', 'phone', 'role', 'sector', 'space_type', 'city_state', 'audience', 'site_size', 'theme', 'budget_range', 'budget_source', 'needed_by', 'procurement_path', 'country', 'heard_from', 'heard_detail', 'notes', 'building_age', 'approvals_detail', 'engagement_mode', 'byo_creative', 'byo_contact', 'feeling', 'approver'].forEach(function (k) { rec[k] = A[k] ? String(A[k]).slice(0, 2000) : null; });
    rec.outcomes = A.outcomes || []; rec.creative_types = A.creative_types || []; rec.constraints = A.constraints || []; rec.approvals = A.approvals || []; rec.usage_rights = A.usage_rights || [];
    try {
      var sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey);
      var ses = (await sb.auth.getSession()).data.session;
      if (ses) {
        var mem = await sb.from('org_members').select('org_id').eq('user_id', ses.user.id).limit(1);
        if (mem.data && mem.data.length) { rec.org_id = mem.data[0].org_id; rec.created_by = ses.user.id; signedIn = true; }
      }
      var r = await sb.from('briefs').insert(rec);
      if (r.error) throw r.error;
      sent = true; A.sent_name = A.contact_name; try { localStorage.removeItem(KEY); } catch (e) { }
      render(); window.scrollTo(0, 0);
    } catch (e) {
      console.error(e);
      btn.disabled = false; btn.textContent = 'Send my brief';
      var el = document.getElementById('err'); el.innerHTML = 'Something went wrong sending your brief. Please try again, or email it to <a href="mailto:' + esc(C.contactEmail) + '">' + esc(C.contactEmail) + '</a>.'; el.hidden = false;
    }
  }
  function done() {
    root.innerHTML = '<div class="stack" style="gap:24px">'
      + '<div class="done-hero"><span class="tick">' + '<svg width="36" height="36" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>'
      + '<h1>Thank you' + (A.sent_name ? ', ' + esc(String(A.sent_name).split(' ')[0]) : '') + '. Your brief is in.</h1></div>'
      + '<p class="lede">A real person from our team will read it and write back by email. Here\'s what happens next.</p>'
      + '<ol class="timeline"><li><span class="n">1</span><span><b>We read your brief</b><br><span class="muted">and may ask one or two questions to get it right.</span></span></li>'
      + '<li><span class="n">2</span><span><b>A short call, if it helps</b><br><span class="muted">About 20 minutes to walk the space and the goals.</span></span></li>'
      + '<li><span class="n">3</span><span><b>Your shortlist</b><br><span class="muted">3 to 5 vetted creatives, why each fits, and budget options.</span></span></li>'
      + '<li><span class="n">4</span><span><b>You choose</b><br><span class="muted">Nothing is booked until you sign a scope.</span></span></li></ol>'
      + (signedIn ? '<div class="row"><a class="btn" href="account/business.html#projects">Go to my projects</a></div></div>'
        : '<div class="card stack" style="gap:12px;background:var(--card)"><h3 style="font-family:var(--serif);font-weight:400;font-size:28px">Follow this project in one place</h3><p class="muted">Create a free business account with the same email and this brief will be waiting: the shortlist, line-by-line budget, approvals and documents, plus room for your team.</p><div class="row"><a class="btn" href="account/signup.html?type=business">Create my business account</a><a class="btn btn-ghost" href="index.html">Back to home</a></div></div></div>');
  }
  render();
})();

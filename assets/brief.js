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
    sector: ['Hotel or hospitality', 'Development or placemaking', 'Healthcare', 'Office or workplace', 'Restaurant or retail', 'An event or launch', 'Something else'],
    outcomes: ['Better guest or patient experience', 'Local identity, a sense of place', 'Photos and social sharing', 'Staff belonging and wellbeing', 'Tell our brand story', 'Bring in foot traffic', 'Community goodwill', 'Calm and comfort'],
    creative: ['Mural or wall art', 'Original artwork for our walls', 'Sculpture or installation', 'Art on loan that rotates', 'Live music or performance', 'Live painting at an event', 'Photo or video content', 'Design: signage, wayfinding or graphics', 'Workshops or community programs', 'Not sure yet, help me choose'],
    constraints: ['Must be finished by a set date', 'Work happens while we are open', 'Outdoors or exposed to weather', 'Low-odor materials needed', 'Must be cleanable (infection control)', 'Needs permits or landlord approval', 'Venue or union rules'],
    budget: ['Under $5,000', '$5,000 to $15,000', '$15,000 to $50,000', '$50,000 to $150,000', 'More than $150,000', 'Not sure yet'],
    source: ['Renovation or construction', 'Furniture and fixtures', 'Marketing', 'HR or culture', 'Grant or sponsor', 'Not sure'],
    when: ['In the next 3 months', '3 to 6 months', '6 to 12 months', 'More than a year out', 'No set date'],
    heard: ['Google or web search', 'AI search (ChatGPT, Claude, Perplexity, Gemini)', 'Instagram', 'LinkedIn', 'A referral', 'An event', 'An artist or creative', 'Other']
  };
  var Q = [
    { id: 'sector', sec: 'Your space', type: 'one', key: 'sector', title: 'What kind of space is this for?', list: OPT.sector },
    { id: 'outcomes', sec: 'Your space', type: 'many', key: 'outcomes', title: 'What should the work do for your space?', hint: 'Pick all that apply. This shapes who we match you with.', list: OPT.outcomes },
    { id: 'creative', sec: 'Your space', type: 'many', key: 'creative_types', title: 'What kind of creative work are you picturing?', hint: "Pick all that fit. It's fine to say you're not sure.", list: OPT.creative },
    { id: 'site', sec: 'The details', type: 'fields', title: 'Tell us about the space', fields: [['space_type', 'Which space?', 'text', true, 'Main lobby wall, about 18 ft wide'], ['city_state', 'City and state', 'text', true, 'Winston-Salem, NC'], ['site_size', 'Size or capacity (optional)', 'text', false, '18 ft x 12 ft, or 150 guests']] },
    { id: 'story', sec: 'The details', type: 'fields', title: 'Who will experience it, and what story should it tell?', hint: "Optional, but the more you share, the better your matches.", skippable: true, fields: [['audience', 'Who will see or experience it?', 'area', false, 'Hotel guests, many visiting for the first time, and locals who come for the bar.'], ['theme', 'Any theme or story?', 'area', false, "The city's textile history turning into its arts story today. Warm, not literal."]] },
    { id: 'limits', sec: 'The details', type: 'many', key: 'constraints', title: 'Anything we should plan around?', hint: 'Optional. Pick any that apply.', list: OPT.constraints, optional: true },
    { id: 'budget', sec: 'Budget and timing', type: 'one', key: 'budget_range', title: "What's your budget range?", hint: 'All in, including our fee. Many projects set aside about 0.5 to 1 percent of construction cost for art.', list: OPT.budget },
    { id: 'source', sec: 'Budget and timing', type: 'one', key: 'budget_source', title: 'Where does the budget come from?', hint: 'This helps us pick the right kind of project. A renovation budget suits a commission. A marketing budget suits a launch event.', list: OPT.source, optional: true },
    { id: 'when', sec: 'Budget and timing', type: 'one', key: 'needed_by', title: 'When do you need it?', list: OPT.when },
    { id: 'you', sec: 'About you', type: 'fields', title: 'Who should we write back to?', hint: 'A real person from our team reads every brief.', fields: [['contact_name', 'Your name', 'text', true, '', 'name'], ['org_name', 'Organization', 'text', true, '', 'organization'], ['email', 'Work email', 'email', true, '', 'email'], ['role', 'Your role (optional)', 'text', false, 'Owner, GM, designer, facilities...', 'organization-title'], ['phone', 'Phone (optional)', 'tel', false, '', 'tel']] },
    { id: 'heard', sec: 'About you', type: 'one', key: 'heard_from', title: 'How did you hear about SOV?', list: OPT.heard, optional: true },
    { id: 'heard2', sec: 'About you', type: 'fields', title: 'Tell us a little more', hint: 'Optional, but it helps us.', skippable: true, fields: [['heard_detail', 'Who referred you, which event, or what you asked the AI tool', 'text', false, '']] },
    { id: 'send', sec: 'Send', type: 'send', title: 'Check your brief and send it' }
  ];
  function has(k) { var x = A[k]; return !(x == null || x === '' || (Array.isArray(x) && !x.length)); }
  function visible() {
    return Q.filter(function (q) {
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
  var qid = null, sent = false;
  var start = visible().find(function (q) { return q.type !== 'send' && !q.optional && !q.skippable && !answered(q); });
  qid = (start || visible()[0]).id;
  if (!Object.keys(A).length) qid = 'intro';

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
      + '<li><span class="n" style="background:var(--think)">2</span><span><b>The details</b><br><span class="muted">Where, how big, and what to plan around.</span></span></li>'
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
    ['org_name', 'contact_name', 'email', 'phone', 'role', 'sector', 'space_type', 'city_state', 'audience', 'site_size', 'theme', 'budget_range', 'budget_source', 'needed_by', 'heard_from', 'heard_detail', 'notes'].forEach(function (k) { rec[k] = A[k] ? String(A[k]).slice(0, 2000) : null; });
    rec.outcomes = A.outcomes || []; rec.creative_types = A.creative_types || []; rec.constraints = A.constraints || [];
    try {
      var sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, { auth: { persistSession: false } });
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
      + '<div class="row"><a class="btn" href="index.html">Back to home</a><a class="btn btn-ghost" href="how-it-works.html">See how it works</a></div></div>';
  }
  render();
})();

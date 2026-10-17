/* SOV contact form: stores a message for the team. */
(function () {
  var C = window.SOV_CONFIG || {};
  var $ = function (id) { return document.getElementById(id); };
  var f = $('cf'); if (!f) return;
  var HINT = { call: 'A few days and times that work for you, and what you would like to talk about.', project: 'The space, what you want it to feel like, and your timing.', creative: 'What you make, and what you are wondering about.', studio: 'What you make, and which tools or resources would help you most.', community: 'What you make, and where you are based. We will email you when the next gathering is set.', partner: 'Who you are and what you have in mind.', press: 'The outlet or event, the topic and the date.', general: 'A few lines is plenty.' };
  try { var t = new URLSearchParams(location.search).get('topic'); if (t && HINT[t]) $('c-topic').value = t; } catch (e) { }
  function hint() { $('c-msg').placeholder = HINT[$('c-topic').value] || HINT.general; }
  $('c-topic').addEventListener('change', hint); hint();
  f.addEventListener('submit', async function (e) {
    e.preventDefault();
    var err = $('c-err'); err.hidden = true;
    var name = $('c-name').value.trim(), email = $('c-email').value.trim(), msg = $('c-msg').value.trim();
    if (!name || !email || !msg) { err.textContent = 'Please add your name, email and a message.'; err.hidden = false; return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { err.textContent = 'Please check your email address.'; err.hidden = false; return; }
    if ($('c-website').value) { f.hidden = true; $('c-done').hidden = false; return; }
    var btn = $('c-send'); btn.disabled = true; btn.textContent = 'Sending...';
    try {
      var sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey);
      var r = await sb.from('contact_messages').insert({ name: name, email: email, org: $('c-org').value.trim() || null, phone: $('c-phone').value.trim() || null, topic: $('c-topic').value, message: msg, page: (document.referrer || '').slice(0, 300) || null });
      if (r.error) throw r.error;
      f.hidden = true; $('c-done').hidden = false; window.scrollTo(0, 0);
    } catch (x) {
      console.error(x);
      btn.disabled = false; btn.textContent = 'Send message';
      err.innerHTML = 'Something went wrong. Please try again, or email <a href="mailto:' + (C.contactEmail || 'founder@sovcreativebrokerage.com') + '">' + (C.contactEmail || 'founder@sovcreativebrokerage.com') + '</a>.'; err.hidden = false;
    }
  });
})();

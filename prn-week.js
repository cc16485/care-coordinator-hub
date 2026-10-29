/* =============================================================================
   prn-week.js · PRN step 2 on the PRN Teams page (Samantha 2026-10-28; the office-side sample she approved that day)
   =============================================================================
   1. THIS WEEK: a short list for the person who owns it (Settings, PRN Teams: Krystal now, the Staffing Coordinator later).
      Each line is one tap and nothing goes out on its own:
        Thank a PRN member for a covered shift (a drafted text to edit, then Send from the office number, under your name)
        A milestone (10 PRN shifts, a year on the team): a handwritten card, then "Card mailed"
        Would like more hours / Check in (nobody in touch for 30 days): open their page and call, then "Called"
        "Not this one" takes a line off.
   2. ON CALL (PRN CNA Team only): the next 8 weekends (Saturday 7am to Sunday 11pm), who is confirmed, the gaps in red,
      what each member offered, Confirm and Take back. An offer alone never puts anyone on call. No stipend amount (hers to set).
   The server (prn-week) decides every line and keeps every record; this file only draws them and passes the taps on.
   Shown to everyone once ops_settings.prn_week_live is on; before that, to owners only, marked Practice.
   ============================================================================= */
(function () {
  'use strict';
  var FN = 'https://zngsgedlsxinbygwmxwn.supabase.co/functions/v1/prn-week';
  var e = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var W = null, OPEN = {};
  var ICON = { thanks: ['♥', '#DCFCE7', '#166534'], milestone: ['★', '#FEF3C7', '#92400E'], hours: ['⏱', '#DBEAFE', '#1E40AF'], checkin: ['☎', '#F1EFE9', '#6E6559'] };
  var isOwner = function () { try { return typeof ccCan === 'function' && ccCan('manage_settings'); } catch (x) { return false; } };
  var fmt = function (d) { return d ? new Date(String(d).slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''; };

  async function call(body) {
    var s = (await sb.auth.getSession()).data.session;
    if (!s) throw new Error('Sign in first.');
    var r = await fetch(FN, { method: 'POST', headers: { Authorization: 'Bearer ' + s.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    var j = await r.json().catch(function () { return {}; });
    if (!r.ok || j.error) { var err = new Error(j.error || ('prn-week ' + r.status)); err.body = j; throw err; }
    return j;
  }

  function lineHtml(it) {
    var ic = ICON[it.kind] || ICON.checkin, m = (W.members || []).find(function (x) { return x.applicant_id === it.applicant_id; }) || {};
    var page = m.axiscare_id ? '<button class="fb" onclick="PW.page(\'' + e(m.axiscare_id) + '\')">Open their page</button>' : '';
    var btns = it.kind === 'thanks' ? '<button class="fb" onclick="PW.open(\'' + e(it.id) + '\')">Open text</button>'
      : it.kind === 'milestone' ? '<button class="fb" onclick="PW.mark(\'' + e(it.id) + '\',\'card_mailed\')">Card mailed</button>'
      : page + '<button class="fb" onclick="PW.mark(\'' + e(it.id) + '\',\'called\')">Called</button>';
    var draft = it.kind !== 'thanks' || !OPEN[it.id] ? '' :
      '<div class="pw-draft"><div class="field-note" style="margin-bottom:6px;">Drafted for you. Edit it if you like; it goes from the office number under your name.</div>'
      + '<textarea id="pwMsg_' + e(it.id) + '" rows="3" style="width:100%;">' + e(it.draft) + '</textarea>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px;">'
      + (W.thanks_live ? '<button class="primary" onclick="PW.send(\'' + e(it.id) + '\',this)">Send from the office number</button>'
        : '<span class="field-note">Texting thank-yous is off (Settings, PRN Teams). Thank them another way, then:</span>')
      + '<button class="fb" onclick="PW.mark(\'' + e(it.id) + '\',\'thanks_sent\')">Thanked another way</button>'
      + '<span class="field-note" id="pwSt_' + e(it.id) + '"></span></div></div>';
    return '<div class="pw-line"><div class="pw-ic" style="background:' + ic[1] + ';color:' + ic[2] + ';">' + ic[0] + '</div>'
      + '<div style="flex:1;min-width:0;"><b style="color:var(--navy);">' + e(it.title) + '</b> <span class="field-note">· ' + e(it.team) + '</span><div style="font-size:13px;">' + e(it.detail) + '</div></div>'
      + '<div class="pw-btns">' + btns + '<button class="fb" onclick="PW.mark(\'' + e(it.id) + '\',\'not_this_one\')" title="Takes this line off">Not this one</button></div></div>' + draft;
  }

  function weekHtml() {
    var practice = !W.live ? '<div class="pw-practice">Practice: only owners see this until "This week" is turned on (Settings, PRN Teams).</div>' : '';
    var lines = (W.items || []).length ? W.items.map(lineHtml).join('') : '<div class="field-note" style="padding:8px 0;">Nothing this week. Every PRN member has been thanked, carded and checked in with.</div>';
    return '<div class="card pw-card">' + practice
      + '<div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;"><h3 style="margin:0;color:var(--navy);font-size:17px;">This week</h3>'
      + '<span class="field-note">' + e(W.owner) + '\'s list · a handful at a time · each one is a tap</span></div>'
      + lines + (W.more ? '<div class="field-note" style="margin-top:6px;">' + W.more + ' more after these.</div>' : '')
      + '<div class="field-note" style="margin-top:8px;">Coming with later steps: who is looking for hours, interest to review, and clients with no PRN backup who knows them.</div></div>';
  }

  function onCallHtml() {
    var oc = W.oncall || { weekends: [], offers: [] }, cna = (W.members || []).filter(function (m) { return m.team === 'cna'; });
    var pick = function (id) { return '<select id="' + id + '" style="font-size:12.5px;padding:3px 6px;max-width:150px;"><option value="">Confirm someone…</option>'
      + cna.map(function (m) { return '<option value="' + e(m.applicant_id) + '">' + e(m.name) + '</option>'; }).join('') + '</select>'; };
    var tiles = oc.weekends.map(function (w, i) {
      var who = w.confirmed.map(function (c) { return '<div class="pw-on">✓ ' + e(c.name) + ' <a href="javascript:void 0" title="Take back" onclick="PW.cancel(' + Number(c.id) + ')">✕</a></div>'; }).join('');
      return '<div class="pw-wk' + (w.gap ? ' gap' : '') + '"><div class="pw-d">' + fmt(w.saturday) + ' to ' + fmt(w.sunday) + '</div>'
        + (who || '<div class="pw-none">No PRN CNA on call</div>')
        + (cna.length ? '<div style="margin-top:6px;">' + pick('pwPick' + i) + ' <button class="fb" onclick="PW.confirm(' + i + ',this)">Confirm</button></div>' : '') + '</div>';
    }).join('');
    var offers = oc.offers.length ? oc.offers.map(function (o) { return '<span class="pw-chip">' + e(o.name) + ': ' + e(o.pattern_word) + (o.note ? ' (' + e(o.note) + ')' : '') + '</span>'; }).join('')
      : '<span class="field-note">Nobody has offered yet. Ask in the welcome call, then record it here.</span>';
    var pats = Object.keys(oc.patterns || {}).map(function (k) { return '<option value="' + e(k) + '">' + e(oc.patterns[k]) + '</option>'; }).join('');
    return '<div class="card pw-card"><h3 style="margin:0 0 4px;color:var(--navy);font-size:17px;">On call · PRN CNA Team</h3>'
      + '<div class="field-note">An offer alone never puts someone on call: confirm each date with them first. A weekend is Saturday 7am to Sunday 11pm. Reply within 15 minutes, start within 1 hour. Stipend amount: not set yet.</div>'
      + '<div class="pw-grid">' + tiles + '</div>'
      + '<div style="margin-top:12px;"><b style="font-size:13px;">What they\'ve offered:</b> ' + offers + '</div>'
      + (cna.length ? '<div class="pw-offer"><select id="pwOfWho" style="font-size:12.5px;width:auto;">' + cna.map(function (m) { return '<option value="' + e(m.applicant_id) + '">' + e(m.name) + '</option>'; }).join('') + '</select>'
        + '<select id="pwOfPat" style="font-size:12.5px;width:auto;">' + pats + '</select><input id="pwOfNote" placeholder="Note (optional)" style="font-size:12.5px;width:200px;">'
        + '<button class="fb" onclick="PW.offer(this)">Record their offer</button><span class="field-note" id="pwOfSt"></span></div>' : '')
      + '</div>';
  }

  function draw() {
    var box = document.getElementById('prnWeek'); if (!box) return;
    if (!W) { box.innerHTML = ''; return; }
    if (!W.live && !isOwner()) { box.innerHTML = ''; return; }
    box.innerHTML = weekHtml() + onCallHtml();
  }
  async function load() {
    var box = document.getElementById('prnWeek'); if (!box) return;
    try { W = await call({ action: 'week' }); draw(); }
    catch (x) { box.innerHTML = isOwner() ? '<div class="field-note" style="color:var(--red);margin-bottom:10px;">This week could not load: ' + e(x.message) + '</div>' : ''; }
  }
  var item = function (id) { return (W && W.items || []).find(function (x) { return x.id === id; }); };

  window.PW = {
    load: load,
    open: function (id) { OPEN[id] = !OPEN[id]; draw(); },
    page: function (ax) { try { gotoTab('cgdir'); setTimeout(function () { cgdOpenProfile(String(ax)); }, 300); } catch (x) { /* */ } },
    mark: async function (id, kind) {
      var it = item(id); if (!it) return;
      var ref = kind === 'thanks_sent' ? 'shift:' + it.case_id : it.ref;
      try { await call({ action: 'mark', applicant_id: it.applicant_id, kind: kind, ref: ref }); delete OPEN[id]; await load(); }
      catch (x) { if (typeof ccAlert === 'function') ccAlert('Could not record it: ' + x.message); else alert('Could not record it: ' + x.message); }
    },
    send: async function (id, btn) {
      var it = item(id); if (!it) return;
      var msg = String((document.getElementById('pwMsg_' + id) || {}).value || '').trim(), st = document.getElementById('pwSt_' + id);
      if (!msg) { if (st) st.textContent = 'The message is empty.'; return; }
      if (typeof ccConfirm === 'function' && !(await ccConfirm('Send this thank-you to ' + it.name + ' from the office number?\n\n' + msg))) return;
      if (btn) btn.disabled = true;
      try {
        var r = await call({ action: 'send_thanks', applicant_id: it.applicant_id, case_id: it.case_id, message: msg, send_id: 'pw-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8) });
        if (st) st.textContent = r.outcome === 'already_sent' ? 'Already sent.' : 'Sent.' + (r.warning ? ' ' + r.warning : '');
        delete OPEN[id]; setTimeout(load, 900);
      } catch (x) { if (st) st.textContent = x.message; if (btn) btn.disabled = false; }
    },
    confirm: async function (i, btn) {
      var w = W.oncall.weekends[i], sel = document.getElementById('pwPick' + i), aid = sel && sel.value;
      if (!aid) return;
      var nm = sel.options[sel.selectedIndex].text;
      if (typeof ccConfirm === 'function' && !(await ccConfirm('Put ' + nm + ' on call ' + fmt(w.saturday) + ' to ' + fmt(w.sunday) + '?\n\nOnly confirm a date you have agreed with them.'))) return;
      if (btn) btn.disabled = true;
      try { await call({ action: 'oncall_confirm', applicant_id: aid, start_date: w.saturday, end_date: w.sunday }); await load(); }
      catch (x) { alert('Could not confirm: ' + x.message); if (btn) btn.disabled = false; }
    },
    cancel: async function (id) {
      if (typeof ccConfirm === 'function' && !(await ccConfirm('Take this on-call date back? It stays in the history, marked taken back.'))) return;
      try { await call({ action: 'oncall_cancel', id: id }); await load(); } catch (x) { alert('Could not take it back: ' + x.message); }
    },
    offer: async function (btn) {
      var aid = (document.getElementById('pwOfWho') || {}).value, pat = (document.getElementById('pwOfPat') || {}).value, note = (document.getElementById('pwOfNote') || {}).value, st = document.getElementById('pwOfSt');
      if (!aid || !pat) return;
      if (btn) btn.disabled = true;
      try { await call({ action: 'oncall_offer', applicant_id: aid, pattern: pat, note: note }); await load(); }
      catch (x) { if (st) st.textContent = x.message; if (btn) btn.disabled = false; }
    },
    _state: function () { return W; }, _draw: draw, _set: function (w) { W = w; draw(); }
  };
})();

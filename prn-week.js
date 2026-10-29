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
   3. (step 4, 2026-10-29) WELCOME CALL: a new member's first 2 weeks after they're linked in AxisCare, "Record the call"
      opens the five questions; what they say is kept on their PRN answers (short notice and on call in their own records).
   4. (2026-10-29) THE PRN TEAMS HOME: opened from its own link (#prnteams), five tabs: This week, Our teams (everyone on a
      team, onboarding too, with their welcome call answers and familiar clients), On call, Recruiting (the goal numbers) and
      What they see (the approved sample of their PRN Team page until step 5). From inside Recruit, the stacked view as before.
   The server (prn-week) decides every line and keeps every record; this file only draws them and passes the taps on.
   Shown to everyone once ops_settings.prn_week_live is on; before that, to owners only, marked Practice.
   ============================================================================= */
(function () {
  'use strict';
  var FN = 'https://zngsgedlsxinbygwmxwn.supabase.co/functions/v1/prn-week';
  var e = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var W = null, OPEN = {};
  var ICON = { thanks: ['♥', '#DCFCE7', '#166534'], milestone: ['★', '#FEF3C7', '#92400E'], hours: ['⏱', '#DBEAFE', '#1E40AF'], checkin: ['☎', '#F1EFE9', '#6E6559'], goback: ['↩', '#E0F2F1', '#0F5F5B'], welcome: ['✋', '#EDE9FE', '#5B21B6'], nobackup: ['⚑', '#FEE2E2', '#991B1B'] };
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
    var btns = it.kind === 'welcome' ? page + '<button class="fb" onclick="PW.open(\'' + e(it.id) + '\')">Record the call</button>'
      : it.kind === 'thanks' ? '<button class="fb" onclick="PW.open(\'' + e(it.id) + '\')">Open text</button>'
      : it.kind === 'milestone' ? '<button class="fb" onclick="PW.mark(\'' + e(it.id) + '\',\'card_mailed\')">Card mailed</button>'
      : it.kind === 'goback' ? '<button class="fb" onclick="PW.goback(\'' + e(it.id) + '\',\'yes\')">Glad to go back</button><button class="fb" onclick="PW.goback(\'' + e(it.id) + '\',\'no\')">Rather not</button>'
      : it.kind === 'nobackup' ? '<button class="fb" onclick="PW.client(\'' + e(it.id) + '\')">Open ' + e(String(it.client || '').split(' ')[0]) + '\'s page</button><button class="fb" onclick="PW.cmark(\'' + e(it.id) + '\',\'intro_planned\')" title="A person gets the family\'s OK and schedules it in AxisCare as normal paid time">Intro visit planned</button>'
      : page + '<button class="fb" onclick="PW.mark(\'' + e(it.id) + '\',\'called\')">Called</button>';
    var notThis = it.kind === 'goback' ? '' : '<button class="fb" onclick="PW.' + (it.kind === 'nobackup' ? 'cmark' : 'mark') + '(\'' + e(it.id) + '\',\'not_this_one\')" title="' + (it.kind === 'nobackup' ? 'Takes this line off for this month' : 'Takes this line off') + '">Not this one</button>';
    if (it.kind === 'welcome' && OPEN[it.id]) return lineTop(it, ic, btns, notThis) + callForm(it);
    var draft = it.kind !== 'thanks' || !OPEN[it.id] ? '' :
      '<div class="pw-draft"><div class="field-note" style="margin-bottom:6px;">Drafted for you. Edit it if you like; it goes from the office number under your name.</div>'
      + '<textarea id="pwMsg_' + e(it.id) + '" rows="3" style="width:100%;">' + e(it.draft) + '</textarea>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px;">'
      + (W.thanks_live ? '<button class="primary" onclick="PW.send(\'' + e(it.id) + '\',this)">Send from the office number</button>'
        : '<span class="field-note">Texting thank-yous is off (Settings, PRN Teams). Thank them another way, then:</span>')
      + '<button class="fb" onclick="PW.mark(\'' + e(it.id) + '\',\'thanks_sent\')">Thanked another way</button>'
      + '<span class="field-note" id="pwSt_' + e(it.id) + '"></span></div></div>';
    return lineTop(it, ic, btns, notThis) + draft;
  }
  function lineTop(it, ic, btns, notThis) {
    return '<div class="pw-line"><div class="pw-ic" style="background:' + ic[1] + ';color:' + ic[2] + ';">' + ic[0] + '</div>'
      + '<div style="flex:1;min-width:0;"><b style="color:var(--navy);">' + e(it.title) + '</b>' + (it.team ? ' <span class="field-note">· ' + e(it.team) + '</span>' : '') + '<div style="font-size:13px;">' + e(it.detail) + '</div></div>'
      + '<div class="pw-btns">' + btns + notThis + '</div></div>';
  }
  /* PRN STEP 4: the welcome call (five minutes, plan section 3). What they say is kept on their PRN answers. */
  function callForm(it) {
    var id = e(it.id), sel = function (k, opts) { return '<select id="pwW' + k + '_' + id + '" style="font-size:12.5px;width:auto;">' + opts.map(function (o) { return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join('') + '</select>'; };
    var row = function (q, field) { return '<label style="display:block;margin-top:8px;font-size:13px;"><b>' + q + '</b><div style="margin-top:3px;">' + field + '</div></label>'; };
    return '<div class="pw-draft"><div class="field-note">Five minutes to say hello. Ask, then record what they said.</div>'
      + row('Which towns and times suit you?', '<input id="pwWtowns_' + id + '" placeholder="e.g. Springfield and Nixa, weekday mornings" style="width:100%;">')
      + row('Is short notice ever OK?', sel('short', [['', 'Choose…'], ['yes', 'Yes'], ['no', 'No'], ['not_asked', 'Didn\'t ask']]))
      + row('Would you like more hours someday?', sel('more', [['', 'Choose…'], ['yes', 'Yes'], ['maybe', 'Maybe'], ['no', 'No']]))
      + row('What kind of clients do you enjoy?', '<input id="pwWenjoys_' + id + '" placeholder="Optional" style="width:100%;">')
      + (it.team_key === 'cna' ? row('Would you like to be on call sometimes?', sel('oncall', [['', 'Didn\'t say'], ['every_weekend', 'Every weekend'], ['every_other_weekend', 'Every other weekend'], ['one_weekend_month', 'One weekend a month'], ['weekday', 'A weekday'], ['not_now', 'Not right now']])) : '')
      + '<label style="display:flex;gap:6px;align-items:center;margin-top:8px;font-size:13px;"><input type="checkbox" id="pwWoffice_' + id + '" style="width:auto;"> Interested in office work someday (we hire our Care Coordinators from within)</label>'
      + row('Anything else?', '<input id="pwWnote_' + id + '" placeholder="Optional" style="width:100%;">')
      + '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px;"><button class="primary" onclick="PW.welcome(\'' + id + '\',this)">Save the welcome call</button>'
      + '<span class="field-note" id="pwSt_' + id + '"></span></div></div>';
  }

  function weekHtml() {
    var practice = !W.live ? '<div class="pw-practice">Practice: only owners see this until "This week" is turned on (Settings, PRN Teams).</div>' : '';
    var lines = (W.items || []).length ? W.items.map(lineHtml).join('') : '<div class="field-note" style="padding:8px 0;">Nothing this week. Every PRN member has been welcomed, thanked, carded and checked in with.</div>';
    return '<div class="card pw-card">' + practice
      + '<div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;"><h3 style="margin:0;color:var(--navy);font-size:17px;">This week</h3>'
      + '<span class="field-note">' + e(W.owner) + '\'s list · a handful at a time · each one is a tap</span></div>'
      + lines + (W.more ? '<div class="field-note" style="margin-top:6px;">' + W.more + ' more after these.</div>' : '')
      + '<div class="field-note" style="margin-top:8px;">Coming with later steps: who is looking for hours and interest to review.</div></div>';
  }

  /* PRN STEP 3: each member's familiar clients (cared for in the last 6 months, no concern either way, didn't say no) */
  function familiarHtml() {
    var mem = W.members || [];
    if (!mem.length) return '';
    var rows = mem.map(function (m) {
      var f = m.familiar || { clients: [] }, list = f.clients || [];
      var chips = list.length ? list.map(function (c) {
        return '<span class="pw-chip" title="' + e(c.visits + ' visit' + (c.visits === 1 ? '' : 's') + ', last ' + fmt(c.last)) + '">' + (c.star ? '★ ' : '') + e(c.client) + (c.glad ? ' · glad to go back' : '') + '</span>';
      }).join('') : '<span class="field-note">' + (f.why ? e(f.why.charAt(0).toUpperCase() + f.why.slice(1)) + '.' : 'No familiar clients yet.') + '</span>';
      return '<div style="padding:6px 0;border-top:1px solid var(--border);"><b style="color:var(--navy);">' + e(m.name) + '</b> <span class="field-note">· ' + (m.team === 'caregiver' ? 'PRN Caregiver Team' : 'PRN CNA Team') + (list.length ? ' · ' + list.length + ' familiar' : '') + '</span><div style="margin-top:4px;">' + chips + '</div></div>';
    }).join('');
    return '<div class="card pw-card"><div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;"><h3 style="margin:0;color:var(--navy);font-size:17px;">Familiar clients</h3>'
      + '<span class="field-note">who each member knows · the goal is two to four each · ★ the client favorited them</span></div>'
      + (W.familiar_note ? '<div class="field-note" style="color:var(--red);margin-top:4px;">' + e(W.familiar_note) + '</div>' : '') + rows + '</div>';
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

  /* ── THE PRN TEAMS HOME (2026-10-29, Samantha: "I thought it would be more PRN Team tabs"): opened from its own link
     (#prnteams), five tabs instead of one long page. From inside Recruit, the same stacked view as before. ── */
  var TAB = 'week', PANES = { week: 'prnWeek', teams: 'prnTeams', oncall: 'prnOnCall', recruiting: 'prnDash', see: 'prnSee' };
  var isHome = function () { return document.documentElement.classList.contains('prnonly'); };
  var put = function (id, html) { var el = document.getElementById(id); if (el) el.innerHTML = html; };
  function panes() {
    Object.keys(PANES).forEach(function (k) {
      var el = document.getElementById(PANES[k]), b = document.getElementById('prnt-' + k);
      if (el) el.style.display = isHome() ? (k === TAB ? '' : 'none') : '';
      if (b) b.classList.toggle('on', k === TAB);
    });
  }
  var offNote = '<div class="card pw-card"><div class="field-note">This shows to owners only until "This week" is turned on (Settings, PRN Teams).</div></div>';
  var yn = { yes: 'yes', no: 'no', maybe: 'maybe', not_asked: 'not asked' };
  var ONC = { every_weekend: 'every weekend', every_other_weekend: 'every other weekend', one_weekend_month: 'one weekend a month', weekday: 'a weekday', not_now: 'not right now' };
  /* Our teams: everyone on a PRN Team, linked or still onboarding, from the Hub's own records (PRN_T), plus familiar clients */
  function teamsHtml() {
    var T = (typeof PRN_T !== 'undefined' && PRN_T) || { tracks: [], apps: {} };
    if (!T.at) return '<div class="card pw-card"><div class="field-note">Loading the teams…</div></div>';
    var teamOf = function (t) { return t.team === 'caregiver' ? 'caregiver' : 'cna'; };
    var fam = {}; ((W && W.members) || []).forEach(function (m) { fam[m.applicant_id] = m.familiar; });
    var st = (typeof DATA !== 'undefined' && DATA.ops_settings) || {};
    return ['cna', 'caregiver'].map(function (team) {
      var D = (typeof PRN_TEAM !== 'undefined' && PRN_TEAM[team]) || { name: team === 'cna' ? 'PRN CNA Team' : 'PRN Caregiver Team', goal: 0, goalKey: '' };
      var mine = (T.tracks || []).filter(function (t) { return t.track === 'prn_team' && teamOf(t) === team; });
      var goal = Number(st[D.goalKey]) || D.goal;
      var rows = mine.map(function (t) {
        var a = (T.apps || {})[t.applicant_id] || {}, p = a.prn || {}, w = p.welcome, f = fam[t.applicant_id];
        var name = [a.first_name, a.last_name].filter(Boolean).join(' ') || 'A PRN member', ax = t.axiscare_caregiver_id ? String(t.axiscare_caregiver_id) : '';
        var tag = ax ? '<span class="prn-tm-tag" style="background:#DCFCE7;color:#166534;">In AxisCare</span>' : '<span class="prn-tm-tag" style="background:#FEF3C7;color:#92400E;">Onboarding</span>';
        var since = 'On the team since ' + fmt(t.since) + (ax ? (t.linked_at ? ' · linked in AxisCare ' + fmt(t.linked_at) : '') : ' · not linked in AxisCare yet');
        var sn = p.short_notice_ok === true ? 'Short notice OK' : p.short_notice_ok === false ? 'Keeps their notice' : 'Short notice: not asked yet';
        var wc = w ? 'Welcome call ' + fmt(w.at) + (w.by ? ' (' + e(w.by) + ')' : '') + ': ' + e(w.towns_times) + ' · more hours ' + e(yn[w.more_hours] || w.more_hours)
            + (w.enjoys ? ' · enjoys ' + e(w.enjoys) : '') + (w.oncall ? ' · on call ' + e(ONC[w.oncall] || w.oncall) : '') + (w.office_interest ? ' · interested in office work someday' : '')
          : (ax ? 'No welcome call yet' : 'Welcome call once they are linked in AxisCare');
        var chips = !f ? '' : (f.clients || []).length ? (f.clients || []).map(function (c) { return '<span class="pw-chip">' + (c.star ? '★ ' : '') + e(c.client) + (c.glad ? ' · glad to go back' : '') + '</span>'; }).join('')
          : '<span class="field-note">' + (f.why ? e(f.why.charAt(0).toUpperCase() + f.why.slice(1)) + '.' : 'No familiar clients yet.') + '</span>';
        return '<div class="prn-tm"><div class="prn-tm-main"><b style="color:var(--navy);">' + e(name) + '</b> ' + tag
          + '<div class="field-note" style="margin-top:2px;">' + since + ' · ' + sn + '</div>'
          + '<div style="font-size:13px;margin-top:4px;">' + wc + '</div>'
          + (chips ? '<div style="margin-top:5px;"><span class="field-note">Familiar clients: </span>' + chips + '</div>' : '') + '</div>'
          + '<div class="pw-btns">' + (ax ? '<button class="fb" onclick="PW.page(\'' + e(ax) + '\')">Open their page</button>' : '')
          + '<button class="fb" onclick="PW.tab(\'see\')">What they see</button></div></div>';
      }).join('');
      return '<div class="card pw-card"><div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;"><h3 style="margin:0;color:var(--navy);font-size:17px;">' + e(D.name) + '</h3>'
        + '<span class="field-note">' + mine.length + ' on the team' + (goal ? ' · goal ' + goal : '') + '</span></div>'
        + (rows || '<div class="field-note" style="padding:8px 0;">Nobody on this team yet. A PRN offer adds them here.</div>') + '</div>';
    }).join('');
  }
  /* What they see: the approved sample of a member's own PRN Team page until the real one (step 5) */
  function seeHtml() {
    return '<div class="card pw-card"><div class="pw-practice">Sample with made-up people. The real PRN Team page comes in step 5: then this tab lets you pick a member and see exactly what they see.</div>'
      + '<div class="field-note" style="margin-bottom:8px;">What a PRN member will see on their phone: Offered to You, Familiar Clients First, Available Opportunities, On call, My clients, Thank-yous, My hours and Talk to us. Nothing you tap here is sent.</div>'
      + '<iframe src="prn-team-page-sample.html?preview=1" title="Sample PRN Team page" style="width:100%;max-width:440px;height:820px;border:1px solid var(--border);border-radius:18px;display:block;margin:0 auto;background:#fff;"></iframe></div>';
  }

  function draw() {
    var box = document.getElementById('prnWeek'); if (!box) return;
    var see = document.getElementById('prnSee'); if (see && !see.innerHTML) see.innerHTML = seeHtml();
    var show = W && (W.live || isOwner());
    if (isHome()) {
      put('prnWeek', show ? weekHtml() : (W ? offNote : ''));
      put('prnOnCall', show ? onCallHtml() : (W ? offNote : ''));
      put('prnTeams', teamsHtml());
    } else {
      put('prnTeams', ''); put('prnOnCall', '');
      box.innerHTML = show ? weekHtml() + familiarHtml() + onCallHtml() : '';
    }
    panes();
  }
  async function load() {
    var box = document.getElementById('prnWeek'); if (!box) return;
    panes();
    try { if (isHome() && typeof prnLoad === 'function') await prnLoad(); } catch (x) { /* the teams say "Loading" until it can */ }
    try { W = await call({ action: 'week' }); draw(); }
    catch (x) { draw(); if (isOwner()) box.innerHTML = '<div class="field-note" style="color:var(--red);margin-bottom:10px;">This week could not load: ' + e(x.message) + '</div>'; }
  }
  var item = function (id) { return (W && W.items || []).find(function (x) { return x.id === id; }); };

  window.PW = {
    load: load,
    tab: function (k) { if (!PANES[k]) return; TAB = k; draw(); if (k === 'recruiting' && typeof prnDashLoad === 'function' && !/card/.test((document.getElementById('prnDash') || {}).innerHTML || '')) prnDashLoad(); },
    get _tab() { return TAB; },
    open: function (id) { OPEN[id] = !OPEN[id]; draw(); },
    page: function (ax) { try { gotoTab('cgdir'); setTimeout(function () { cgdOpenProfile(String(ax)); }, 300); } catch (x) { /* */ } },
    mark: async function (id, kind) {
      var it = item(id); if (!it) return;
      var ref = kind === 'thanks_sent' ? 'shift:' + it.case_id : it.ref;
      try { await call({ action: 'mark', applicant_id: it.applicant_id, kind: kind, ref: ref }); delete OPEN[id]; await load(); }
      catch (x) { if (typeof ccAlert === 'function') ccAlert('Could not record it: ' + x.message); else alert('Could not record it: ' + x.message); }
    },
    goback: async function (id, answer) {
      var it = item(id); if (!it) return;
      try { await call({ action: 'goback_mark', applicant_id: it.applicant_id, ref: it.ref, answer: answer, note: it.answer || '' }); await load(); }
      catch (x) { if (typeof ccAlert === 'function') ccAlert('Could not record it: ' + x.message); else alert('Could not record it: ' + x.message); }
    },
    welcome: async function (id, btn) {
      var it = item(id); if (!it) return;
      var v = function (k) { var el = document.getElementById('pwW' + k + '_' + id); return el ? (el.type === 'checkbox' ? el.checked : String(el.value || '').trim()) : ''; };
      var st = document.getElementById('pwSt_' + id);
      if (btn) btn.disabled = true;
      try {
        var r = await call({ action: 'welcome_call', applicant_id: it.applicant_id, towns_times: v('towns'), short_notice: v('short'), more_hours: v('more'), enjoys: v('enjoys'), oncall: v('oncall') || '', office_interest: v('office') === true, note: v('note') });
        if (st) st.textContent = 'Saved.' + (r.oncall && r.oncall.indexOf('failed') === 0 ? ' Their on-call answer could not be saved (' + r.oncall + '); record it under On call.' : '');
        delete OPEN[id]; setTimeout(load, 700);
      } catch (x) { if (st) st.textContent = x.message; if (btn) btn.disabled = false; }
    },
    client: function (id) { var it = item(id); if (!it) return; try { openClientProfile(it.client_ax || it.client); } catch (x) { /* */ } },
    cmark: async function (id, kind) {
      var it = item(id); if (!it) return;
      try { await call({ action: 'client_mark', ref: it.ref, kind: kind }); await load(); }
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

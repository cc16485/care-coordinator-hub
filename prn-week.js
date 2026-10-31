/* =============================================================================
   prn-week.js · PRN step 2 on the PRN Teams page (Samantha 2026-10-28; the office-side sample she approved that day)
   =============================================================================
   1. THIS WEEK: a short list for the person who owns it (Settings, PRN Teams: Krystal now, the Staffing Coordinator later).
      Each line is one tap and nothing goes out on its own:
        Thank a PRN member for a covered shift (a drafted text to edit, then Send from the office number, under your name)
        A milestone (10 PRN shifts, a year on the team): a handwritten card, then "Card mailed"
        Would like more hours / Check in (nobody in touch for 30 days): open their page and call, then "Called"
        "Not this one" takes a line off.
   2. ON CALL (PRN CNA Team only; the calendar, her decisions 22 to 27 on 2026-10-29): every day for 4 weeks, daytime 7am to
      7pm and overnight 7pm to 7am, who is on call, who asked from their page (one tap confirms) and the open shifts; who
      signed the On-Call Expectations; misses (not paid, can't sign up again; an owner can lift it). The pay is in her PRN plan,
      never shown on their page.
   3. (step 4, 2026-10-29) WELCOME CALL: a new member's first 2 weeks after they're linked in AxisCare, "Record the call"
      opens the five questions; what they say is kept on their PRN answers (short notice and on call in their own records).
   5. (step 5a, 2026-10-29) THEIR PRN TEAM PAGE: What they see shows a member's real page (prn.html?preview=, read-only, each look
      recorded); Our teams shows looking for hours, a break and when they last looked, with Copy page link; This week gains
      looking for hours, a course they'd like and an idea they shared.
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
  var W = null, OPEN = {}, M = null;   // M: the monthly PRN Team update (step 6)
  var ICON = { thanks: ['♥', '#DCFCE7', '#166534'], milestone: ['★', '#FEF3C7', '#92400E'], hours: ['⏱', '#DBEAFE', '#1E40AF'], checkin: ['☎', '#F1EFE9', '#6E6559'], goback: ['↩', '#E0F2F1', '#0F5F5B'], welcome: ['✋', '#EDE9FE', '#5B21B6'], nobackup: ['⚑', '#FEE2E2', '#991B1B'], feedback: ['✎', '#E0F2FE', '#075985'], oncall: ['☏', '#FEF3C7', '#92400E'] };
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
    var btns = it.kind === 'looking' ? page + '<button class="fb" onclick="PW.mark(\'' + e(it.id) + '\',\'called\')">Called</button>'
      : it.kind === 'course' ? '<button class="fb" onclick="PW.mark(\'' + e(it.id) + '\',\'handled\')" title="Assign it on the Training Platform first">Assigned</button>'
      : it.kind === 'idea' || it.kind === 'feedback' ? '<button class="fb" onclick="PW.mark(\'' + e(it.id) + '\',\'handled\')">Read</button>'
      : it.kind === 'oncall' ? '<button class="fb" onclick="PW.tab(\'oncall\')">Open On call</button><button class="fb" onclick="PW.mark(\'' + e(it.id) + '\',\'handled\')" title="Confirm or say Not this one on the calendar first">Done</button>'
      : it.kind === 'welcome' ? page + '<button class="fb" onclick="PW.open(\'' + e(it.id) + '\')">Record the call</button>'
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
      + (it.team_key === 'cna' ? '<div class="field-note" style="margin-top:8px;"><b>On call:</b> tell them they can sign up for on-call shifts on their PRN Team page, one shift at a time, after reading and signing the On-Call Expectations.</div>' : '')
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

  /* PRN STEP 6: the monthly PRN Team update. The Hub drafts the facts about last month (team numbers only, never names next to
     numbers), the office writes the personal paragraph (required) and may add a kind word and a tip, then one tap texts every
     member a short line with their own page link. Switch prn_monthly_live, and the page must be open. */
  function monthlyHtml() {
    if (!M) return '';
    var sent = !!M.sent_at, dis = sent ? ' disabled' : '';
    var why = sent ? '' : !M.page_live ? 'Waiting: the PRN Team page isn\'t open yet, so the update can\'t link to it.' : !M.switch_on ? 'Sending is switched off (Settings, PRN Teams). You can write and save it now.' : '';
    var fld = function (id, label, val, rows, ph) { return '<label style="display:block;margin-top:10px;font-size:13px;"><b>' + label + '</b><textarea id="' + id + '" rows="' + rows + '" style="width:100%;font-size:13px;margin-top:3px;" placeholder="' + e(ph) + '"' + dis + '>' + e(val || '') + '</textarea></label>'; };
    return '<div class="card pw-card" id="pwMonthly">'
      + '<div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;"><h3 style="margin:0;color:var(--navy);font-size:17px;">Monthly PRN Team update · ' + e(M.month_word) + '</h3>'
      + '<span class="field-note">' + (sent ? 'Sent by ' + e(M.sent_by) + ' on ' + e(fmt(M.sent_at)) + ' · ' + M.sent_to + ' of ' + M.members + ' members' : 'One short text to every PRN member, with their own page link. The full update shows at the top of their page.') + '</span></div>'
      + '<div style="margin-top:8px;padding:10px 12px;background:var(--bg);border-radius:10px;font-size:13.5px;">' + (M.facts || []).map(function (f) { return '<div>' + e(f) + '</div>'; }).join('')
      + '<div class="field-note" style="margin-top:4px;">From the PRN records: the whole team only, never a name next to a number.</div></div>'
      + fld('pwMoPara', 'Your paragraph (needed)', M.paragraph, 4, 'A few warm words from you or Krystal, in your own voice.')
      + fld('pwMoKind', 'A kind word from a family (optional)', M.kind_word, 2, 'No caregiver\'s name unless they said it\'s OK.')
      + fld('pwMoTip', 'A course or tip (optional)', M.tip, 2, "For example: Our Alzheimer's & Dementia Care course is open. Tap I'd like this on your page.")
      + '<div class="field-note" style="margin-top:6px;">Every update ends with: ' + e(M.steady) + '</div>'
      + (sent ? (M.sent_to < M.members ? '<div style="margin-top:10px;"><button class="addlead" onclick="PW.moSend(this)">Send to the ' + (M.members - M.sent_to) + ' not reached yet</button></div>' : '')
        : '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;"><button class="ghost" onclick="PW.moSave(this)">Save</button>'
          + '<button class="addlead" onclick="PW.moSend(this)"' + (M.live ? '' : ' disabled') + '>Save and send to ' + M.members + ' members</button></div>')
      + (why ? '<div class="field-note" style="margin-top:6px;">' + e(why) + '</div>' : '')
      + '<div class="field-note" id="pwMoSt" style="margin-top:6px;"></div></div>';
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

  /* ON CALL (2026-10-29, her decisions 22 to 27): a calendar of every day, 4 weeks from this Monday, daytime 7am to 7pm and
     overnight 7pm to 7am. Each shift: who is on call (✕ takes it back; "Missed" records a miss), who asked from their page
     (✓ confirms, ✕ is "Not this one") or Open (+ puts a signed member on it). Below: who signed the On-Call Expectations and
     who can't sign up after a miss (an owner can let them again), and the payroll counts.
     EVERY WEEK (2026-10-30, her "yes to all 7"): every-week shifts and asks are marked; one ✓ confirms the whole series and
     its weeks are added on their own; a week someone else holds shows who missed out. "+" can put someone on every week.
     The Every-week shifts list has "They called to stop it" (weeks 24 hours or more away are taken back).
     OUR CAREGIVERS (2026-10-30, Krystal's idea, her "Yes to all", Level 3 only): an Invite caregivers box lists active Level 3
     caregivers from AxisCare with their status; Send invite texts their own My on-call link from the office line (switch
     prn_oncall_invite_live), Copy link hands it over, See their page previews it. Caregivers carry a "Caregiver" tag. */
  var INV = null, INV_OPEN = '';
  /* 7AM TO 7PM (2026-10-30, her ask): the shifts are 7am to 7pm and 7pm to 7am; only the offered ones are open for sign-up
     (ops_settings.prn_oncall_offered; nothing set = Friday, Saturday and Sunday 7am to 7pm). Owners open and close each day's
     shift right here (saved like any setting, with their name). A shift that isn't offered shows "Not offered" on the calendar and
     isn't counted as open; you can still put someone on it by hand with +. */
  var OC_GRID = false;
  var OC_DAYS = [['mon', 'Mon'], ['tue', 'Tue'], ['wed', 'Wed'], ['thu', 'Thu'], ['fri', 'Fri'], ['sat', 'Sat'], ['sun', 'Sun']];
  function offeredHtml(oc) {
    var off = oc.offered || {};
    var line = '<div class="field-note" style="margin-top:6px;"><b>Open for sign-up:</b> ' + e(oc.offered_words || 'Friday, Saturday and Sunday 7am to 7pm') + (oc.offered_set ? '' : ' (the starting set)') + '.'
      + (isOwner() ? ' <button class="fb" onclick="PW.ocGrid()">' + (OC_GRID ? 'Done' : 'Open or close shifts') + '</button>' : '') + '</div>';
    if (!OC_GRID || !isOwner()) return line;
    var rows = OC_DAYS.map(function (d) {
      return '<div style="display:flex;gap:6px;align-items:center;margin-top:4px;"><b style="width:38px;font-size:13px;">' + d[1] + '</b>'
        + [['day', '7am to 7pm'], ['overnight', '7pm to 7am']].map(function (sl) { var k = d[0] + ':' + sl[0], on = off[k] === true;
          return '<button class="fb" aria-pressed="' + on + '" style="' + (on ? 'background:var(--navy);color:#fff;border-color:var(--navy);' : '') + '" onclick="PW.ocOffer(\'' + k + '\',this)">' + (on ? '✓ ' : '') + sl[1] + '</button>'; }).join('') + '</div>';
    }).join('');
    return line + '<div style="margin-top:6px;padding:10px 12px;background:var(--bg);border-radius:10px;"><div class="field-note">Tap a shift to open or close it for sign-up. PRN CNAs and invited caregivers see the change on their page right away. Shifts already confirmed stay as they are.</div>' + rows + '<div class="field-note" id="ocGridMsg" style="margin-top:6px;"></div></div>';
  }
  var OC_OPEN = '', OC_MISS = '';
  var WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var dShort = function (d) { return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };
  function onCallHtml() {
    var oc = W.oncall || {}, cal = oc.calendar || [], ppl = oc.people || [];
    var askShift = !!oc.shifts && (oc.shift_live || isOwner());
    var payroll = !askShift ? '' : (oc.payroll || []).map(function (p) {
      var rows = (p.members || []).map(function (m) { var bits = [m.day ? m.day + ' daytime' : '', m.overnight ? m.overnight + ' overnight' : '', m.whole ? m.whole + ' whole day' + (m.whole === 1 ? '' : 's') : '', m.not_recorded ? m.not_recorded + ' with no shift recorded' : '',
          m.missed ? m.missed + ' missed (not paid)' : ''].filter(Boolean);
        return '<div style="font-size:13px;">' + e(m.name) + ': ' + e(bits.join(', ') || 'none') + '</div>'; }).join('');
      return '<div style="margin-top:6px;"><b style="font-size:13px;">' + e(new Date(p.month + '-15T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })) + '</b>' + (rows || '<div class="field-note">Nobody on call.</div>') + '</div>'; }).join('');
    var person = function (aid) { return ppl.find(function (p) { return p.applicant_id === aid; }) || {}; };
    var mayPut = ppl.filter(function (p) { return !p.blocked && (p.signed || !oc.signup_live); });
    var today = W.today || '';
    var cell = function (d, sl) {
      var c = d[sl], key = d.date + '|' + sl, lbl = sl === 'day' ? 'Day 7a to 7p' : 'Night 7p to 7a';
      var who = c.confirmed.map(function (p) {
        if (p.missed) return '<div class="oc-who miss" title="' + e((oc.miss_kinds || {})[p.missed] || 'Missed') + ': not paid">✗ <b>' + e(p.name) + '</b> <span class="field-note">' + e(p.missed === 'no_answer' ? "didn't answer" : "didn't cover") + '</span></div>';
        var missing = OC_MISS === String(p.id) ? '<div class="oc-pick"><button class="oc-btn" onclick="PW.ocMiss(' + Number(p.id) + ',\'no_answer\')">Didn\'t answer our call</button><button class="oc-btn" onclick="PW.ocMiss(' + Number(p.id) + ',\'not_covered\')">Didn\'t cover the shift</button><button class="oc-btn" onclick="PW.ocMissOpen(\'\')">Cancel</button></div>' : '';
        return '<div class="oc-who">✓ <b>' + e(p.name) + '</b>' + (p.caregiver ? ' <span class="oc-tag no">Caregiver</span>' : '') + (p.weekly ? ' <span class="field-note" title="Every week">↻ every week</span>' : '') + (p.whole ? ' <span class="field-note">whole day</span>' : '') + (!p.shift_recorded ? ' <span class="field-note">no shift recorded</span>' : '')
          + (!d.past ? '<button class="oc-x" title="Take back (they called at least 24 hours ahead, or plans changed)" onclick="PW.cancel(' + Number(p.id) + ')">✕</button>' : '')
          + (d.date <= today && d.date >= addD(today, -14) ? ' <button class="oc-btn" title="They didn\'t answer the office, or didn\'t cover a shift" onclick="PW.ocMissOpen(\'' + Number(p.id) + '\')">Missed</button>' : '') + '</div>' + missing;
      }).join('');
      var asks = d.past ? '' : c.asked.map(function (p) {
        var pp = person(p.applicant_id);
        return '<div class="oc-ask oc-who ask"><b>' + e(p.name) + '</b>' + (p.caregiver ? ' <span class="oc-tag no">Caregiver</span>' : '') + ' asked' + (p.weekly ? ' <b>every week</b>' : '') + (pp.blocked ? ' <span class="field-note">(can\'t sign up)</span>' : '')
          + ' <button class="oc-btn" title="' + (p.weekly ? 'Confirm it, every week' : 'Confirm it') + '" onclick="PW.ocOk(' + Number(p.id) + ',this,' + (p.weekly ? 'true' : 'false') + ')">✓</button><button class="oc-btn" title="Not this one" onclick="PW.ocNo(' + Number(p.id) + ')">✕</button></div>'; }).join('');
      var put = !d.past && !c.confirmed.some(function (p) { return !p.missed; }) && mayPut.length
        ? (OC_OPEN === key ? '<div class="oc-pick"><select id="ocPut_' + e(key) + '">' + mayPut.map(function (p) { return '<option value="' + e(p.applicant_id) + '">' + e(p.name) + '</option>'; }).join('') + '</select>'
            + '<label style="font-size:11.5px;display:flex;gap:4px;align-items:center;"><input type="checkbox" id="ocWhole_' + e(key) + '" style="width:auto;margin:0;"> both shifts (whole day)</label>'
            + (oc.weekly_ready ? '<label style="font-size:11.5px;display:flex;gap:4px;align-items:center;"><input type="checkbox" id="ocWeekly_' + e(key) + '" style="width:auto;margin:0;"> every week</label>' : '')
            + '<div><button class="oc-btn" onclick="PW.ocPut(\'' + e(d.date) + '\',\'' + sl + '\',this)">Put on call</button> <button class="oc-btn" onclick="PW.ocOpen(\'\')">Cancel</button></div></div>'
          : ' <button class="oc-btn" title="Put someone on call (agree it with them first)" onclick="PW.ocOpen(\'' + e(key) + '\')">+</button>') : '';
      var skipped = d.past ? '' : (c.skipped || []).map(function (p) { return '<div class="oc-who field-note" title="Their every-week shift, but someone else holds this week">↻ ' + e(p.name) + ': someone else has it this week</div>'; }).join('');
      var notOffered = c.offered === false && !c.confirmed.length && !c.asked.length;
      return '<div class="oc-s' + (c.gap ? ' gap' : c.confirmed.length ? ' ok' : '') + '"' + (notOffered ? ' style="opacity:.55;"' : '') + '><span class="oc-l">' + lbl + (c.gap && !c.confirmed.length && !c.asked.length ? ' · Open' : notOffered ? ' · Not offered' : '') + put + '</span>' + who + asks + skipped + '</div>';
    };
    var days = cal.map(function (d) { return '<div class="oc-day' + (d.past ? ' past' : '') + (d.date === today ? ' today' : '') + '"><div class="oc-d">' + e(dShort(d.date)) + '</div>' + cell(d, 'day') + cell(d, 'overnight') + '</div>'; }).join('');
    var gaps = cal.reduce(function (n, d) { return n + (d.day.gap ? 1 : 0) + (d.overnight.gap ? 1 : 0); }, 0);
    var people = ppl.length ? ppl.map(function (p) {
      var sig = p.signed ? '<span class="oc-tag ok">Signed the expectations' + (p.signed_at ? ' ' + e(fmt(p.signed_at)) : '') + '</span>'
        : p.signed_old ? '<span class="oc-tag no">Signed an older version: signs again on their page</span>' : '<span class="oc-tag no">Not signed yet</span>';
      var blk = p.blocked ? ' <span class="oc-tag bad">Can\'t sign up: ' + e(p.miss ? p.miss.word.toLowerCase() : 'missed') + (p.miss && p.miss.at ? ', ' + e(fmt(p.miss.at)) : '') + '</span>'
        + (isOwner() ? ' <button class="fb" onclick="PW.ocLift(\'' + e(p.applicant_id) + '\',this)">Let them sign up again</button>' : ' <span class="field-note">An owner can let them sign up again.</span>') : '';
      return '<div class="oc-p"><b>' + e(p.name) + '</b> ' + (p.caregiver ? '<span class="oc-tag no">Caregiver</span> ' : '') + sig + blk + '</div>'; }).join('') : '<div class="field-note">Nobody is on the PRN CNA Team yet.</div>';
    var older = (oc.offers || []).filter(function (o) { return o.pattern !== 'not_now'; });
    return '<div class="card pw-card"><h3 style="margin:0 0 4px;color:var(--navy);font-size:17px;">On call · PRN CNA Team</h3>'
      + (!oc.records_ready ? '<div class="pw-practice">The calendar records are not on the server yet (Desktop step 1191). Asks, misses and signatures show once it has run.</div>' : '')
      + (!oc.signup_live ? '<div class="field-note" style="margin-top:4px;"><b>Sign-up on their page is off</b> (Settings, PRN Teams): members can\'t ask for shifts yet, and you can put anyone on call without a signature.</div>' : '')
      + '<div class="field-note">Two shifts a day: daytime 7am to 7pm, overnight 7pm to 7am. Members take an open shift one time or every week on their PRN Team page after signing the On-Call Expectations; you confirm each one (an every-week shift once, then its weeks are added on their own, skipping any week someone else holds). To stop an every-week shift they call at least 24 hours ahead; use They called to stop it below. They answer the office within 15 minutes and can start within 1 hour. A miss: that on-call shift is not paid, their other on-call shifts are taken back, and they can\'t sign up again. They give a shift back by calling at least 24 hours ahead; then tap ✕. On-call pay is in the PRN plan and is never shown on their page.</div>'
      + offeredHtml(oc)
      + '<div class="field-note" style="margin-top:6px;"><b>' + gaps + ' open shift' + (gaps === 1 ? '' : 's') + '</b> in the next 4 weeks (offered shifts nobody is on yet).</div>'
      + '<div class="oc-cal"><div class="oc-grid">' + WD.map(function (w) { return '<div class="oc-h">' + w + '</div>'; }).join('') + days + '</div></div>'
      + '<div style="margin-top:14px;"><b style="font-size:13.5px;color:var(--navy);">The PRN CNA Team and invited caregivers</b><div class="oc-ppl">' + people + '</div></div>'
      + inviteHtml(oc)
      + (oc.weekly_ready ? '<div style="margin-top:12px;"><b style="font-size:13.5px;color:var(--navy);">Every-week shifts</b><div class="oc-ppl">'
        + ((oc.series || []).length ? oc.series.map(function (x) {
            return '<div class="oc-p"><b>' + e(x.name || '') + '</b> ' + e(x.word) + (x.status === 'asked' ? ' <span class="oc-tag no">Asked, waiting for you</span>' : ' <span class="oc-tag ok">Since ' + e(dShort(x.since)) + (x.confirmed_by ? ', confirmed by ' + e(x.confirmed_by) : '') + '</span>')
              + (x.status === 'confirmed' ? ' <button class="fb" onclick="PW.ocEnd(' + Number(x.id) + ',this)">They called to stop it</button>' : '') + '</div>'; }).join('')
          : '<div class="field-note">Nobody has an every-week on-call shift yet.</div>') + '</div></div>'
        : '<div class="field-note" style="margin-top:10px;">Every week shows here once its records are on the server (the Desktop step for every-week on call).</div>')
      + (payroll ? '<div style="margin-top:12px;padding:10px 12px;background:var(--bg);border-radius:10px;"><b style="font-size:13.5px;color:var(--navy);">On-call shifts for payroll</b> <span class="field-note">counted from the confirmed shifts; missed ones are not paid; the pay is in the PRN plan</span>' + payroll + '</div>' : '')
      + (older.length ? '<div class="field-note" style="margin-top:10px;">Earlier on-call preferences (before sign-up by shift): ' + older.map(function (o) { return e(o.name) + ', ' + e(String(o.pattern_word || '').toLowerCase()); }).join('; ') + '</div>' : '')
      + '</div>';
  }
  /* OUR CAREGIVERS: the Invite caregivers box (loads on a tap; AxisCare's caregiver list takes a few seconds) */
  function inviteHtml(oc) {
    var head = '<div style="margin-top:14px;padding:10px 12px;background:var(--bg);border-radius:10px;"><b style="font-size:13.5px;color:var(--navy);">Invite caregivers to on call</b> <span class="field-note">Level 3 (Advanced Care) only</span>'
      + (!oc.invite_live ? '<div class="field-note" style="margin-top:4px;"><b>Invites are off</b> (Settings, PRN Teams, Caregiver on-call invites): Send invite is refused and their page says it isn\'t open yet. You can still copy a link and see their page.</div>' : '');
    if (!INV) return head + '<div style="margin-top:8px;"><button class="fb" onclick="PW.invLoad(this)">Show Level 3 caregivers</button></div></div>';
    if (INV.error) return head + '<div class="field-note" style="margin-top:6px;">' + e(INV.error) + ' <button class="fb" onclick="PW.invLoad(this)">Try again</button></div></div>';
    var rows = (INV.people || []).map(function (p) {
      var st = [p.invited_at ? '<span class="oc-tag ok">Invited ' + e(fmt(p.invited_at)) + (p.invited_via === 'link' ? ' (link)' : '') + '</span>' : '<span class="oc-tag no">Not invited</span>',
        p.signed ? '<span class="oc-tag ok">Signed the expectations</span>' : p.signed_old ? '<span class="oc-tag no">Signed an older version</span>' : '',
        p.upcoming ? '<span class="oc-tag ok">' + p.upcoming + ' on-call shift' + (p.upcoming === 1 ? '' : 's') + ' ahead</span>' : '',
        p.blocked ? '<span class="oc-tag bad">Can\'t sign up (missed)</span>' : '', !p.has_phone ? '<span class="oc-tag bad">No phone in AxisCare</span>' : ''].filter(Boolean).join(' ');
      var open = INV_OPEN === p.caregiver_ax ? '<div class="oc-pick" style="width:100%;"><textarea id="invMsg_' + e(p.caregiver_ax) + '" rows="4" style="width:100%;font-size:13px;">' + e(String(INV.message || '').replace(/\{first_name\}/g, p.first || p.name.split(' ')[0])) + '</textarea>'
        + '<div class="field-note">{link} becomes their own link. Sent from the office line.</div><div><button class="oc-btn" onclick="PW.invSend(\'' + e(p.caregiver_ax) + '\',this)">Send</button> <button class="oc-btn" onclick="PW.invOpen(\'\')">Cancel</button></div></div>' : '';
      return '<div class="oc-p"><b>' + e(p.name) + '</b> ' + st + ' <span style="margin-left:auto;display:flex;gap:4px;flex-wrap:wrap;">'
        + (p.has_phone ? '<button class="fb" onclick="PW.invOpen(\'' + e(p.caregiver_ax) + '\')">' + (p.invited_at ? 'Invite again' : 'Send invite') + '</button>' : '')
        + '<button class="fb" onclick="PW.invLink(\'' + e(p.caregiver_ax) + '\',this)">Copy link</button>'
        + '<button class="fb" onclick="window.open(\'oncall.html?preview=' + e(p.caregiver_ax) + '\',\'_blank\')">See their page</button></span>' + open + '</div>';
    }).join('');
    return head + '<div class="field-note" style="margin-top:4px;">Active caregivers AxisCare shows at Level 3. The PRN CNA Team signs up on their own PRN Team page. Once a caregiver signs up, you confirm each shift on the calendar above, the same as the PRN CNAs.</div>'
      + '<div class="oc-ppl">' + (rows || '<div class="field-note">No active Level 3 caregivers in AxisCare right now.</div>') + '</div></div>';
  }

  /* after a miss: what was taken back, and a Call button (from the office line) to tell them */
  function onCallMissed(r) {
    if (!r || r.outcome !== 'missed') return;
    var back = (r.taken_back || []).map(function (x) { return dShort(x.date) + ' ' + (SHORT[x.shift] || x.shift) + (x.kind === 'asked' ? ' (asked)' : ''); });
    var msg = 'Recorded. ' + r.name + ' can\'t sign up for on call again until an owner lets them.' + (back.length ? ' Taken back: ' + back.join(', ') + '.' : '') + (r.failed && r.failed.length ? ' Could not take back: ' + r.failed.join(', ') + '. Take them back by hand.' : '') + ' Call them to let them know.';
    if (typeof ccAlert === 'function') ccAlert(msg); else alert(msg);
  }
  window.PW_onCallMissed = onCallMissed;
  var addD = function (d, n) { return d ? new Date(Date.parse(d + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10) : ''; };


  /* ── THE PRN TEAMS HOME (2026-10-29, Samantha: "I thought it would be more PRN Team tabs"): opened from its own link
     (#prnteams), five tabs instead of one long page. From inside Recruit, the same stacked view as before. ── */
  /* 2026-10-31: Field Support Visits got their own tab (gap-mentor.js GM.tabMount) */
  var TAB = 'week', PANES = { week: 'prnWeek', teams: 'prnTeams', oncall: 'prnOnCall', fsv: 'prnFsv', recruiting: 'prnDash', see: 'prnSee' };
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
  var SHORT = { day: 'daytime', overnight: 'overnight', whole: 'whole day' };
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
        var pg = ((W && W.members) || []).find(function (m) { return m.applicant_id === t.applicant_id; }), pi = (pg && pg.page) || {};
        var pageBits = [pi.looking && pi.looking.on ? '<b style="color:#92400E;">Looking for hours</b>' + (pi.looking.note ? ' (' + e(pi.looking.note) + ')' : '') : '',
          pi.break_until ? 'On a break until ' + fmt(pi.break_until) : '', pi.last_looked ? 'Last looked at their page ' + fmt(pi.last_looked) : '',
          /* 2026-10-29: their answer to "Would you like more hours?" on their page */
          pi.more_hours ? (pi.more_hours.answer === 'yes' ? '<b style="color:#92400E;">Would like more hours</b>' : 'Not looking for more hours right now') + (pi.more_hours.at ? ' (told us ' + fmt(pi.more_hours.at) + ')' : '') : ''].filter(Boolean).join(' · ');
        /* 2026-10-29 (plan section 8, switch prn_team_signs_live; owners see it as practice): last heard from us, last PRN shift,
           more hours, and "worth a call" only when two signs line up. Never shown as a mark against anyone. */
        var sg = pi.signs, showSigns = sg && W && (W.signs_live || isOwner());
        var signs = !showSigns ? '' : '<div class="field-note" style="margin-top:4px;">' + ['Last heard from us: ' + (sg.last_contact ? fmt(sg.last_contact) : 'no personal contact yet'),
            'Last PRN shift: ' + (sg.last_shift ? fmt(sg.last_shift) : 'none yet'), sg.wants_more ? 'Would like about ' + e(sg.wants_more) + ' hours a week' : ''].filter(Boolean).join(' · ')
          + (W.signs_live ? '' : ' <span style="color:#8A4E0C;">(practice)</span>') + '</div>'
          + (sg.drifting ? '<div style="margin-top:4px;font-size:13px;color:#8A4E0C;"><b>Worth a call:</b> ' + e(sg.drifting_why.join(', ')) + '.</div>' : '');
        var sn = p.short_notice_ok === true ? 'Short notice OK' : p.short_notice_ok === false ? 'Keeps their notice' : 'Short notice: not asked yet';
        var wc = w ? 'Welcome call ' + fmt(w.at) + (w.by ? ' (' + e(w.by) + ')' : '') + ': ' + e(w.towns_times) + ' · more hours ' + e(yn[w.more_hours] || w.more_hours)
            + (w.enjoys ? ' · enjoys ' + e(w.enjoys) : '') + (w.oncall ? ' · on call ' + e(ONC[w.oncall] || w.oncall) : '') + (w.office_interest ? ' · interested in office work someday' : '')
          : (ax ? 'No welcome call yet' : 'Welcome call once they are linked in AxisCare');
        var chips = !f ? '' : (f.clients || []).length ? (f.clients || []).map(function (c) { return '<span class="pw-chip">' + (c.star ? '★ ' : '') + e(c.client) + (c.glad ? ' · glad to go back' : '') + '</span>'; }).join('')
          : '<span class="field-note">' + (f.why ? e(f.why.charAt(0).toUpperCase() + f.why.slice(1)) + '.' : 'No familiar clients yet.') + '</span>';
        return '<div class="prn-tm"><div class="prn-tm-main"><b style="color:var(--navy);">' + e(name) + '</b> ' + tag
          + '<div class="field-note" style="margin-top:2px;">' + since + ' · ' + sn + '</div>'
          + '<div style="font-size:13px;margin-top:4px;">' + wc + '</div>'
          + (chips ? '<div style="margin-top:5px;"><span class="field-note">Familiar clients: </span>' + chips + '</div>' : '')
          + (pageBits ? '<div class="field-note" style="margin-top:4px;">' + pageBits + '</div>' : '') + signs
          + (team === 'cna' ? gapHtml(t.applicant_id, pi.gap_mentor) : '') + '</div>'
          + '<div class="pw-btns">' + (ax ? '<button class="fb" onclick="PW.page(\'' + e(ax) + '\')">Open their page</button>' : '')
          + '<button class="fb" onclick="PW.see(\'' + e(t.applicant_id) + '\')">What they see</button>'
          + '<button class="fb" onclick="PW.copyLink(\'' + e(t.applicant_id) + '\',this)" title="Their PRN Team page link, to text them yourself">Copy page link</button></div></div>';
      }).join('');
      return '<div class="card pw-card"><div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;"><h3 style="margin:0;color:var(--navy);font-size:17px;">' + e(D.name) + '</h3>'
        + '<span class="field-note">' + mine.length + ' on the team' + (goal ? ' · goal ' + goal : '') + '</span></div>'
        + (rows || '<div class="field-note" style="padding:8px 0;">Nobody on this team yet. A PRN offer adds them here.</div>') + '</div>';
    }).join('');
  }
  /* PRN STEP 8a: Gap Mentor, named by the office for the skills it verified (PRN CNA Team only; an honor, always optional) */
  var GAP_OPEN = {};
  function gapHtml(aid, gm) {
    var sk = (W && W.mentor_skills) || {}, id = e(aid);
    var line = gm ? '<span class="pw-chip" style="background:#E0F2F1;color:#0F5F5B;">Field Support Visits: ' + e((gm.skills || []).map(function (k) { return sk[k] || k; }).join(', ')) + '</span>'
      + ' <span class="field-note">verified: ' + e(gm.evidence) + (gm.by ? ' (' + e(gm.by) + ')' : '') + '</span>' : '';
    var btn = '<button class="fb" onclick="PW.gapOpen(\'' + id + '\')">' + (gm ? 'Change Field Support Visits' : 'Approve for Field Support Visits') + '</button>';
    var form = !GAP_OPEN[aid] ? '' : '<div class="pw-draft" style="margin-top:6px;"><div class="field-note">Skills you verified with references, a past employer or the CNA registry (online training alone is not enough):</div>'
      + Object.keys(sk).map(function (k) { return '<label style="display:inline-flex;gap:5px;align-items:center;margin:4px 10px 0 0;font-size:13px;"><input type="checkbox" class="pwGapSk_' + id + '" value="' + e(k) + '" style="width:auto;"' + (gm && (gm.skills || []).indexOf(k) >= 0 ? ' checked' : '') + '>' + e(sk[k]) + '</label>'; }).join('')
      + '<input type="text" id="pwGapEv_' + id + '" maxlength="400" placeholder="How you verified it, for example: references from Mercy, registry-checked CNA" value="' + e(gm ? gm.evidence : '') + '" style="width:100%;margin-top:6px;font-size:13px;">'
      + '<div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;"><button class="primary" onclick="PW.gapSave(\'' + id + '\',this)">Save</button>' + (gm ? '<button class="fb" onclick="PW.gapSave(\'' + id + '\',this,true)">No longer doing Field Support Visits</button>' : '')
      + '<span class="field-note" id="pwGapSt_' + id + '"></span></div></div>';
    return '<div style="margin-top:5px;">' + line + ' ' + btn + form + '</div>';
  }
  /* What they see: the approved sample of a member's own PRN Team page until the real one (step 5) */
  /* What they see (step 5a): pick a member and see their own PRN Team page, read-only; each look is recorded on the server */
  var SEE = '';
  function seeHtml() {
    var T = (typeof PRN_T !== 'undefined' && PRN_T) || { tracks: [], apps: {} };
    var mem = (T.tracks || []).filter(function (t) { return t.track === 'prn_team'; });
    if (!SEE && mem.length) SEE = mem[0].applicant_id;
    var nm = function (t) { var a = (T.apps || {})[t.applicant_id] || {}; return [a.first_name, a.last_name].filter(Boolean).join(' ') || 'A PRN member'; };
    var pick = mem.length ? '<select id="pwSeePick" onchange="PW.see(this.value)" style="font-size:13px;width:auto;">' + mem.map(function (t) { return '<option value="' + e(t.applicant_id) + '"' + (t.applicant_id === SEE ? ' selected' : '') + '>' + e(nm(t)) + '</option>'; }).join('') + '</select>' : '';
    return '<div class="card pw-card"><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;"><h3 style="margin:0;color:var(--navy);font-size:17px;">What they see</h3>' + pick
      + (W && !W.page_live ? '<span class="field-note">The page is switched off for members (Settings, PRN Teams), so only you see it here.</span>' : '') + '</div>'
      + '<div class="field-note" style="margin:6px 0 10px;">Their own PRN Team page, exactly as it looks to them right now. Nothing you tap here is sent, and each look is recorded.</div>'
      + (SEE ? '<iframe src="prn.html?preview=' + encodeURIComponent(SEE) + '" title="Their PRN Team page" style="width:100%;max-width:440px;height:820px;border:1px solid var(--border);border-radius:18px;display:block;margin:0 auto;background:#fff;"></iframe>'
        : '<div class="field-note">Nobody is on a PRN Team yet.</div>')
      + '<div class="field-note" style="margin-top:10px;text-align:center;"><a href="prn-team-page-sample.html?preview=1" target="_blank" rel="noopener">The approved sample, with made-up people</a></div></div>';
  }

  function draw() {
    var box = document.getElementById('prnWeek'); if (!box) return;
    var see = document.getElementById('prnSee'); if (see && (TAB === 'see' || !see.innerHTML) && see.getAttribute('data-for') !== SEE + '|' + (W ? 1 : 0)) { see.innerHTML = seeHtml(); see.setAttribute('data-for', SEE + '|' + (W ? 1 : 0)); }
    var show = W && (W.live || isOwner());
    if (isHome()) {
      put('prnWeek', show ? weekHtml() + (window.GM ? GM.weekPointer() : '') + monthlyHtml() : (W ? offNote : ''));
      if (TAB === 'fsv' && window.GM) GM.tabMount('prnFsv');
      put('prnOnCall', show ? onCallHtml() : (W ? offNote : ''));
      put('prnTeams', teamsHtml());
    } else {
      put('prnTeams', ''); put('prnOnCall', '');
      box.innerHTML = show ? weekHtml() + monthlyHtml() + (window.GM ? GM.weekHtml() : '') + familiarHtml() + onCallHtml() : '';
    }
    panes();
  }
  async function load() {
    var box = document.getElementById('prnWeek'); if (!box) return;
    panes();
    try { if (isHome() && typeof prnLoad === 'function') await prnLoad(); } catch (x) { /* the teams say "Loading" until it can */ }
    try { W = await call({ action: 'week' }); draw(); loadMonthly(); }
    catch (x) { draw(); if (isOwner()) box.innerHTML = '<div class="field-note" style="color:var(--red);margin-bottom:10px;">This week could not load: ' + e(x.message) + '</div>'; }
  }
  var item = function (id) { return (W && W.items || []).find(function (x) { return x.id === id; }); };
  async function loadMonthly() { try { M = await call({ action: 'monthly' }); } catch (x) { M = null; } draw(); }
  var moVals = function () { var v = function (id) { var el = document.getElementById(id); return el ? String(el.value || '').trim() : ''; }; return { paragraph: v('pwMoPara'), kind_word: v('pwMoKind'), tip: v('pwMoTip') }; };
  var moSay = function (t, bad) { var el = document.getElementById('pwMoSt'); if (el) { el.textContent = t; el.style.color = bad ? 'var(--red)' : ''; } };

  window.PW = {
    load: load,
    see: function (aid) { SEE = String(aid || ''); TAB = 'see'; if (!isHome()) { try { window.open('prn.html?preview=' + encodeURIComponent(SEE), '_blank'); } catch (x) { /* */ } return; } draw(); },
    copyLink: async function (aid, btn) {
      try {
        var r = await call({ action: 'page_link', applicant_id: aid });
        try { await navigator.clipboard.writeText(r.link); } catch (x) { window.prompt('Their PRN Team page link (30 days):', r.link); }
        if (btn) { btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = 'Copy page link'; }, 1800); }
        if (!r.live && typeof ccAlert === 'function') ccAlert('Copied. The PRN Team page is still switched off (Settings, PRN Teams), so the link shows "isn\'t open yet" until it is on.');
      } catch (x) { if (typeof ccAlert === 'function') ccAlert('Could not make the link: ' + x.message); else alert('Could not make the link: ' + x.message); }
    },
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
    ocOpen: function (key) { OC_OPEN = key; OC_MISS = ''; draw(); },
    ocMissOpen: function (id) { OC_MISS = String(id || ''); OC_OPEN = ''; draw(); },
    ocOk: async function (askId, btn, weekly) {
      if (typeof ccConfirm === 'function' && !(await ccConfirm(weekly ? 'Confirm this every-week on-call shift?\n\nThey asked for it on their PRN Team page. It repeats every week on its own, skipping any week someone else already holds, until they call to stop it.'
        : 'Confirm this on-call shift?\n\nThey asked for it on their PRN Team page. It shows as confirmed on their page.'))) return;
      if (btn) btn.disabled = true;
      try { await call({ action: 'oncall_confirm', ask_id: askId }); await load(); } catch (x) { alert('Could not confirm: ' + x.message); if (btn) btn.disabled = false; }
    },
    ocNo: async function (askId) {
      if (typeof ccConfirm === 'function' && !(await ccConfirm('Not this one? Their ask comes off the calendar (it stays in the history). Let them know if it helps.'))) return;
      try { await call({ action: 'oncall_decline', ask_id: askId }); await load(); } catch (x) { alert('Not saved: ' + x.message); }
    },
    ocPut: async function (date, slot, btn) {
      var key = date + '|' + slot, sel = document.getElementById('ocPut_' + key), whole = (document.getElementById('ocWhole_' + key) || {}).checked;
      if (!sel || !sel.value) return;
      var nm = sel.options[sel.selectedIndex].text, shift = whole ? 'whole' : slot, weekly = (document.getElementById('ocWeekly_' + key) || {}).checked;
      if (weekly && whole) { alert('Every week is one shift: daytime or overnight. For both, put them on each one.'); return; }
      var wdName = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' });
      if (typeof ccConfirm === 'function' && !(await ccConfirm('Put ' + nm + ' on call ' + (weekly ? 'every ' + wdName + ' from ' + dShort(date) : dShort(date)) + ', ' + (shift === 'whole' ? 'the whole day (7am to 7am)' : slot === 'day' ? 'daytime (7am to 7pm)' : 'overnight (7pm to 7am)') + '?\n\nOnly confirm a shift you have agreed with them.' + (weekly ? ' It repeats every week until they call to stop it.' : '')))) return;
      if (btn) btn.disabled = true;
      try { await call(Object.assign({ action: 'oncall_confirm', applicant_id: sel.value, date: date, shift: shift }, weekly ? { every_week: true } : {})); OC_OPEN = ''; await load(); }
      catch (x) { alert('Could not confirm: ' + x.message); if (btn) btn.disabled = false; }
    },
    ocMiss: async function (id, kind) {
      var word = kind === 'no_answer' ? "didn't answer the office's call" : "didn't cover the shift";
      if (typeof ccConfirm === 'function' && !(await ccConfirm('Record that they ' + word + '?\n\nThat on-call shift is not paid, their other on-call shifts and asks are taken back, and they can\'t sign up again until an owner lets them. Kept as written.'))) return;
      try { var r = await call({ action: 'oncall_mark', oncall_id: id, kind: kind }); OC_MISS = ''; await load(); onCallMissed(r); }
      catch (x) { alert('Not saved: ' + x.message); }
    },
    ocEnd: async function (id, btn) {
      var x = ((W.oncall || {}).series || []).find(function (s) { return Number(s.id) === Number(id); }) || {};
      var note = window.prompt('They called to stop ' + (x.word || 'this every-week shift') + '. Anything to note? (optional, kept with your name)');
      if (note == null) return; note = String(note).trim();
      if (/—/.test(note)) { alert('Please use a comma or a period instead of an em dash.'); return; }
      if (typeof ccConfirm === 'function' && !(await ccConfirm('End ' + (x.name ? x.name + "'s " : '') + (x.word || 'every-week shift') + '?\n\nWeeks starting 24 hours or more from now are taken back. A shift starting sooner stays theirs.'))) return;
      if (btn) btn.disabled = true;
      try {
        var r = await call({ action: 'oncall_series_end', series_id: id, note: note }); await load();
        var msg = 'Ended.' + ((r.taken_back || []).length ? ' Taken back: ' + r.taken_back.map(dShort).join(', ') + '.' : '') + ((r.kept || []).length ? ' Still theirs (within 24 hours): ' + r.kept.map(function (k) { return dShort(k.date) + ' ' + (SHORT[k.shift] || k.shift); }).join(', ') + '.' : '')
          + ((r.failed || []).length ? ' Could not take back: ' + r.failed.map(dShort).join(', ') + '. Take them back by hand.' : '');
        if (typeof ccAlert === 'function') ccAlert(msg); else alert(msg);
      } catch (y) { alert('Not saved: ' + y.message); if (btn) btn.disabled = false; }
    },
    ocGrid: function () { OC_GRID = !OC_GRID; draw(); },
    ocOffer: async function (key, btn) {
      if (!isOwner()) return;
      if (typeof tkMerge !== 'function') { alert('Settings could not be reached. Reload the Hub and try again.'); return; }
      var cur = Object.assign({}, (W.oncall || {}).offered || {}), turnOn = cur[key] !== true;
      if (turnOn) cur[key] = true; else delete cur[key];
      if (btn) btn.disabled = true;
      var DW = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
      var word = DW[key.split(':')[0]] + ' ' + (key.split(':')[1] === 'day' ? '7am to 7pm' : '7pm to 7am');
      var out = await tkMerge(function (m) { m.prn_oncall_offered = cur; return [(turnOn ? 'opened ' : 'closed ') + word + ' for on-call sign-up']; }, 'on-call shifts offered');
      if (out.error) { alert('Not saved: ' + out.error.message); if (btn) btn.disabled = false; return; }
      await load();
    },
    invLoad: async function (btn) {
      if (btn) btn.disabled = true;
      try { INV = await call({ action: 'oncall_invites' }); } catch (x) { INV = { error: x.message }; }
      draw();
    },
    invOpen: function (ax) { INV_OPEN = String(ax || ''); draw(); },
    invSend: async function (ax, btn) {
      var p = ((INV || {}).people || []).find(function (x) { return x.caregiver_ax === ax; }) || {};
      var ta = document.getElementById('invMsg_' + ax), msg = ta ? ta.value : '';
      if (/—/.test(msg)) { alert('Please use a comma or a period instead of an em dash.'); return; }
      if (typeof ccConfirm === 'function' && !(await ccConfirm('Text ' + (p.name || 'them') + ' this invite from the office line, with their own My on-call link?'))) return;
      if (btn) btn.disabled = true;
      try {
        var r = await call({ action: 'oncall_invite_send', caregiver_ax: ax, message: msg, send_id: 'inv-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8) });
        INV_OPEN = ''; INV = await call({ action: 'oncall_invites' }); draw();
        var m = 'Sent to ' + (p.name || 'them') + '.' + (r.warning ? ' ' + r.warning : '');
        if (typeof ccAlert === 'function') ccAlert(m); else alert(m);
      } catch (x) { alert(x.message); if (btn) btn.disabled = false; }
    },
    invLink: async function (ax, btn) {
      if (btn) btn.disabled = true;
      try {
        var r = await call({ action: 'oncall_invite_link', caregiver_ax: ax });
        var copied = false; try { await navigator.clipboard.writeText(r.link); copied = true; } catch (y) { /* shown below */ }
        INV = await call({ action: 'oncall_invites' }); draw();
        var m = (copied ? 'Copied their My on-call link (good for 30 days).' : 'Their My on-call link (good for 30 days):\n' + r.link) + (r.live ? '' : '\n\nInvites are off, so their page says it isn\'t open yet.');
        if (typeof ccAlert === 'function') ccAlert(m); else alert(m);
      } catch (x) { alert(x.message); if (btn) btn.disabled = false; }
    },
    ocLift: async function (aid, btn) {
      var reason = window.prompt('Why can they sign up for on call again? (kept with your name)');
      if (reason == null) return; reason = String(reason).trim();
      if (reason.length < 3) { alert('Say why, in a few words.'); return; }
      if (/—/.test(reason)) { alert('Please use a comma or a period instead of an em dash.'); return; }
      if (btn) btn.disabled = true;
      try { await call({ action: 'oncall_lift', applicant_id: aid, reason: reason }); await load(); } catch (x) { alert('Not saved: ' + x.message); if (btn) btn.disabled = false; }
    },
    cancel: async function (id) {
      if (typeof ccConfirm === 'function' && !(await ccConfirm('Take this on-call shift back? It stays in the history, marked taken back. (They give a shift back by calling at least 24 hours ahead.)'))) return;
      try { await call({ action: 'oncall_cancel', id: id }); await load(); } catch (x) { alert('Could not take it back: ' + x.message); }
    },
    gapOpen: function (aid) { GAP_OPEN[aid] = !GAP_OPEN[aid]; draw(); },
    gapSave: async function (aid, btn, off) {
      var st = document.getElementById('pwGapSt_' + aid), say = function (t) { if (st) st.textContent = t; };
      var skills = [].slice.call(document.querySelectorAll('.pwGapSk_' + aid)).filter(function (x) { return x.checked; }).map(function (x) { return x.value; });
      var ev = String((document.getElementById('pwGapEv_' + aid) || {}).value || '').trim();
      if (!off && /\u2014/.test(ev)) return say('Please use a comma or a period instead of an em dash.');
      if (btn) btn.disabled = true;
      try { await call(off ? { action: 'mentor_set', applicant_id: aid, on: false } : { action: 'mentor_set', applicant_id: aid, on: true, skills: skills, evidence: ev }); GAP_OPEN[aid] = false; await load(); }
      catch (x) { say(x.message); if (btn) btn.disabled = false; }
    },
    moSave: async function (btn) {
      var v = moVals(); if (/\u2014/.test(v.paragraph + v.kind_word + v.tip)) return moSay('Please use a comma or a period instead of an em dash.', true);
      if (!v.paragraph) return moSay('Write your paragraph first.', true);
      if (btn) btn.disabled = true;
      try { await call(Object.assign({ action: 'monthly_save', month: M.month }, v)); M = Object.assign({}, M, v); moSay('Saved.'); }
      catch (x) { moSay(x.message, true); } finally { if (btn) btn.disabled = false; }
    },
    moSend: async function (btn) {
      var v = moVals();
      if (!M.sent_at) { if (!v.paragraph) return moSay('Write your paragraph first.', true); if (/\u2014/.test(v.paragraph + v.kind_word + v.tip)) return moSay('Please use a comma or a period instead of an em dash.', true); }
      var n = M.members - M.sent_to;
      var okGo = typeof ccConfirm === 'function' ? await ccConfirm('Text the ' + M.month_word + ' PRN Team update to ' + n + ' PRN member' + (n === 1 ? '' : 's') + ' now? Each gets a short text with their own page link.') : true;
      if (!okGo) return;
      if (btn) btn.disabled = true;
      try {
        if (!M.sent_at) await call(Object.assign({ action: 'monthly_save', month: M.month }, v));
        var r = await call({ action: 'monthly_send', month: M.month });
        var miss = [].concat(r.no_phone.map(function (x) { return x + ' (no phone)'; }), r.refused.map(function (x) { return x + ' (not cleared for texts)'; }), r.failed.map(function (x) { return x + " (didn't go through)"; }));
        await loadMonthly();
        moSay('Sent to ' + r.sent.length + '.' + (miss.length ? ' Not reached: ' + miss.join(', ') + '. Each one is also on Needs Attention.' : ''), !!miss.length);
      } catch (x) { moSay(x.message, true); if (btn) btn.disabled = false; }
    },
    _state: function () { return W; }, _draw: draw, _set: function (w) { W = w; draw(); }, _setMonthly: function (m) { M = m; draw(); }
  };
})();

/* =============================================================================
   oncall-now.js · ON CALL NOW on an open shift (Samantha 2026-10-29, decision 26: "When a shift opens during someone's on-call
   time, the open-shift card shows 'On call now: Grace.' There's a Call button that uses the office line and two buttons:
   'Covering it' and 'No answer in 15 minutes.' The on-call CNA is called first, before the automatic texts go out.")
   The server (prn-week oncall_now) finds who is on call when each open shift starts; this file only draws the box on the case
   and passes the taps on (prn-week oncall_mark):
     Covering it              their Yes goes on the case (said yes on the phone); confirm it on the board as usual
     Didn't answer in 15 min  a miss: that on-call shift is not paid, their other on-call shifts are taken back, and they
     Didn't cover the shift   can't sign up again (an owner can let them). Both release the automatic texts at once.
   While the office hasn't recorded the call, the automatic texts wait (at most 15 minutes).
   2026-10-31 (Samantha: "when there is a call in we need to send it to the on-call person ... a clear way to send to PRN CNA team
   and/or PRN Caregiver team if there isn't an on-call ... record if the on-call person is not responsive"; her picks): the
   server texts the on-call person at once; this box says whether the text went (or why not: AxisCare has them working then),
   shows their YES or NO, and at 15 minutes asks the office to record it with one tap. "Said they can't cover it" is a miss too.
   ONC.prnHtml(c): on every open shift, Text the PRN CNA Team / the PRN Caregiver Team / both (coverage-run send_prn: a preview
   of who, then send; the same safety checks as every ask).
   Switch ops_settings.prn_oncall_first_live; off, owners see the box marked practice and nothing waits.
   ============================================================================= */
(function () {
  'use strict';
  var FN = 'https://zngsgedlsxinbygwmxwn.supabase.co/functions/v1/prn-week', CR = 'https://zngsgedlsxinbygwmxwn.supabase.co/functions/v1/coverage-run';
  var e = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var isOwner = function () { try { return typeof ccCan === 'function' && ccCan('manage_settings'); } catch (x) { return false; } };
  var S = { at: 0, busy: false, live: false, cases: {} };
  var clock = function (iso) { try { return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(' ', '').toLowerCase(); } catch (x) { return ''; } };
  async function call(body, url) {
    var s = (await sb.auth.getSession()).data.session;
    if (!s) throw new Error('Sign in first.');
    var r = await fetch(url || FN, { method: 'POST', headers: { Authorization: 'Bearer ' + s.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    var j = await r.json().catch(function () { return {}; });
    if (!r.ok || j.error) throw new Error(j.error || ((url ? 'coverage-run ' : 'prn-week ') + r.status));
    return j;
  }
  function rerender() { try { if (typeof renderCoverage === 'function') renderCoverage(); } catch (x) { /* */ } }
  async function load(force) {
    if (S.busy || (!force && Date.now() - S.at < 60000)) return;
    S.busy = true;
    try { var r = await call({ action: 'oncall_now' }); S.live = r.live === true; S.cases = {}; (r.cases || []).forEach(function (c) { S.cases[c.case_id] = c; }); S.at = Date.now(); rerender(); }
    catch (x) { S.at = Date.now(); }
    finally { S.busy = false; }
  }
  function html(c) {
    if (!c || c.status !== 'open') return '';
    load(false);
    var n = S.cases[c.id];
    if (!n || !(S.live || isOwner())) return '';
    var o = n.outcome, first = e(n.first || n.name);
    var call1 = n.phone ? '<a class="fb"' + (typeof ocAttrs === 'function' ? ocAttrs(n.phone) : ' href="tel:' + e(n.phone) + '"') + '>📞 Call ' + first + '</a>' : '<span class="field-note">No phone on file for ' + first + '.</span>';
    var btn = function (kind, label) { return '<button class="fb" onclick="ONC.mark(\'' + e(c.id) + '\',' + Number(n.oncall_id) + ',\'' + kind + '\',this)">' + label + '</button>'; };
    var d = n.dispatch || {};
    var sent = d.texted_at ? '<div class="field-note" style="margin-top:4px;">Texted ' + first + ' at ' + e(clock(d.texted_at)) + '.</div>'
      : d.skipped ? '<div style="margin-top:4px;color:var(--red);font-weight:600;">Not texted: ' + e(d.skipped) + '. Ask the PRN teams below.</div>'
      : d.not_texted ? '<div style="margin-top:4px;color:var(--red);font-weight:600;">' + e(d.not_texted) + '</div>' : '';
    var ans = !o && n.answer === 'yes' ? '<div style="margin-top:4px;"><b>' + first + ' replied YES.</b> Confirm them on the board as usual.</div>'
      : !o && n.answer === 'no' ? '<div style="margin-top:4px;color:var(--red);font-weight:700;">' + first + ' replied NO. Record it (it counts as a miss), then ask the PRN teams.</div>' : '';
    var due = !o && n.no_answer_due ? '<div style="margin-top:6px;padding:6px 10px;border-radius:8px;background:#FDECEC;color:#9B1C1C;font-weight:700;">' + first + ' hasn\'t answered in 15 minutes. Record it, then ask the PRN teams.</div>' : '';
    var state = !o ? (n.hold_until && !n.answer ? '<div class="field-note" style="margin-top:4px;">Cara waits until ' + e(clock(n.hold_until)) + ', or until you record how it went.</div>' : '')
      : '<div style="margin-top:4px;"><b>' + e(o.word) + '</b> <span class="field-note">recorded by ' + e(o.by || 'the office') + ', ' + e(clock(o.at)) + '</span></div>';
    /* AxisCare has them working then: not their miss, nothing to record; the PRN teams are next */
    var busy = !o && !!d.skipped;
    var btns = busy ? '' : !o ? (n.answer === 'no' ? btn('not_covered', 'Record: said they can\'t cover it') : n.no_answer_due ? btn('no_answer', 'Record: didn\'t answer in 15 minutes') + btn('covering', 'They called back: covering it')
        : btn('covering', 'Covering it') + btn('no_answer', 'Didn\'t answer in 15 minutes') + btn('not_covered', 'Said they can\'t cover it'))
      : o.kind === 'covering' ? btn('not_covered', 'Didn\'t cover the shift after all') : '';
    return '<div class="onc-box">' + (!S.live ? '<div class="pw-practice" style="margin-bottom:6px;">Practice: only owners see this, and nothing waits, until "On call first" is turned on (Settings, PRN Teams).</div>' : '')
      + '☏ <b>On call now: ' + e(n.name) + '</b> <span class="field-note">(' + e(String(n.slot_word || '').toLowerCase()) + ')</span>'
      + (!o && !busy ? '<div style="margin-top:2px;">Call ' + first + ' first, from the office line. On call means they answer within 15 minutes and can start within 1 hour.</div>' : '')
      + sent + ans + due + (busy ? '' : state) + '<div class="onc-btns">' + ((!o && !busy) || (o && o.kind === 'covering') ? call1 : '') + btns + '<span class="field-note" id="oncSt_' + e(c.id) + '"></span></div></div>';
  }
  async function mark(caseId, oncallId, kind, btn) {
    var n = S.cases[caseId]; if (!n) return;
    var q = kind === 'covering' ? 'Record that ' + n.first + ' is covering this shift?\n\nTheir yes goes on the case. Confirm them on the board as usual (it puts them on the AxisCare visit).'
      : 'Record that ' + n.first + (kind === 'no_answer' ? ' didn\'t answer within 15 minutes' : ' can\'t or didn\'t cover the shift') + '?\n\nThat on-call shift is not paid, their other on-call shifts are taken back, and they can\'t sign up for on call again until an owner lets them. The automatic texts go out now.';
    if (typeof ccConfirm === 'function' && !(await ccConfirm(q))) return;
    if (btn) btn.disabled = true;
    var st = document.getElementById('oncSt_' + caseId);
    try {
      var r = await call({ action: 'oncall_mark', oncall_id: oncallId, kind: kind, case_id: caseId });
      if (r.outcome === 'covering' && st) st.textContent = r.on_case === 'added' ? 'Their yes is on the case. Confirm it on the board.' : r.on_case === 'already_asked' ? 'They were already on this case.' : 'Recorded, but their yes could not go on the case (' + r.on_case + '). Confirm them by hand.';
      if (r.outcome === 'missed' && typeof window.PW_onCallMissed === 'function') window.PW_onCallMissed(r);
      if (r.outcome === 'covering' && !r.linked && typeof ccAlert === 'function') ccAlert(n.name + ' is not linked to AxisCare yet, so put them on the visit in AxisCare by hand.');
      S.at = 0; await load(true);
      if (typeof covReload === 'function') { try { covReload(); } catch (x) { /* */ } }
    } catch (x) { if (st) st.textContent = 'Not saved: ' + x.message; if (btn) btn.disabled = false; }
  }
  /* the PRN teams, on every open shift (her decision 4): after the on-call person, or when there isn't one */
  function prnHtml(c) {
    if (!c || c.status !== 'open' || c.kind === 'interest' || c.open_hours === true) return '';
    var n = S.cases[c.id], o = n && n.outcome;
    var waiting = n && !o && !n.answer && !n.no_answer_due && !(n.dispatch && n.dispatch.skipped);   // reach the on-call person first
    var b = function (teams, label) { return '<button class="fb" onclick="ONC.prn(\'' + e(c.id) + '\',\'' + teams + '\',this)">' + label + '</button>'; };
    return '<div class="onc-box" style="background:#F3F7FB;border-color:#D9E4EF;"><b>Ask the PRN teams</b>'
      + (waiting ? ' <span class="field-note">' + e(n.first || n.name) + ' is on call: reach them first.</span>' : '')
      + '<div class="field-note" style="margin-top:2px;">Everyone on the team the safety checks allow for this shift (not working then, the level, their days and times, not asked yet). You see who before anything is sent. Level 3 client: the PRN CNA Team.</div>'
      + '<div class="onc-btns">' + b('cna', 'Text PRN CNA Team') + b('caregiver', 'Text PRN Caregiver Team') + b('cna,caregiver', 'Both teams') + '<span class="field-note" id="oncPrn_' + e(c.id) + '"></span></div></div>';
  }
  async function prn(caseId, teams, btn) {
    var t = String(teams).split(','), st = document.getElementById('oncPrn_' + caseId), say = function (x) { if (st) st.textContent = x; };
    if (btn) btn.disabled = true;
    try {
      var p = await call({ action: 'send_prn', case_id: caseId, teams: t }, CR);
      var names = (p.names || []).map(function (x) { return x.name + (t.length > 1 ? ' (' + (x.team === 'caregiver' ? 'PRN Caregiver' : 'PRN CNA') + ')' : ''); });
      var lvl = p.client_level === 3 && t.indexOf('caregiver') >= 0 ? '\n\nThis is a Level 3 client: the PRN CNA Team fits best.' : '';
      if (!names.length) { say('Nobody on ' + (t.length > 1 ? 'the PRN teams' : 'that team') + ' can be asked for this shift' + ((p.left_out || []).length ? ' (' + p.left_out.length + ' left out by the safety checks)' : '') + '.'); if (btn) btn.disabled = false; return; }
      if (p.held_night) { say('Caregivers are not texted 9pm to 8am unless the shift starts within 3 hours. Call them instead.'); if (btn) btn.disabled = false; return; }
      var ok = typeof ccConfirm === 'function' ? await ccConfirm('Text ' + names.length + ' about this shift?\n\n' + names.join('\n') + ((p.left_out || []).length ? '\n\nLeft out by the safety checks: ' + p.left_out.length : '') + lvl) : true;
      if (!ok) { if (btn) btn.disabled = false; return; }
      var r = await call({ action: 'send_prn', case_id: caseId, teams: t, send: true }, CR);
      say('Texted ' + (r.sent || []).length + ((r.failed || []).length ? '. Didn\'t go through: ' + r.failed.join(', ') : '') + '.');
      if (typeof covReload === 'function') { try { covReload(); } catch (x) { /* */ } }
    } catch (x) { say('Not sent: ' + x.message); }
    if (btn) btn.disabled = false;
  }
  window.ONC = { html: html, load: load, mark: mark, prnHtml: prnHtml, prn: prn, _state: function () { return S; } };
})();

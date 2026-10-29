/* =============================================================================
   oncall-now.js · ON CALL NOW on an open shift (Samantha 2026-10-29, decision 26: "When a shift opens during someone's on-call
   time, the open-shift card shows 'On call now: Grace.' There's a Call button that uses the office line and two buttons:
   'Covering it' and 'No answer in 15 minutes.' The on-call CNA is called first, before the automatic texts go out.")
   The server (prn-week oncall_now) finds who is on call when each open shift starts; this file only draws the box on the case
   and passes the taps on (prn-week oncall_mark):
     Covering it              their Yes goes on the case (said yes on the phone); confirm it on the board as usual
     Didn't answer in 15 min  a miss: that on-call shift is not paid, their other on-call shifts are taken back, and they
     Didn't cover the shift   can't sign up again (an owner can let them). Both release the automatic texts at once.
   While the office hasn't recorded the call, the automatic texts wait (at most 20 minutes after the shift opened).
   Switch ops_settings.prn_oncall_first_live; off, owners see the box marked practice and nothing waits.
   ============================================================================= */
(function () {
  'use strict';
  var FN = 'https://zngsgedlsxinbygwmxwn.supabase.co/functions/v1/prn-week';
  var e = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var isOwner = function () { try { return typeof ccCan === 'function' && ccCan('manage_settings'); } catch (x) { return false; } };
  var S = { at: 0, busy: false, live: false, cases: {} };
  var clock = function (iso) { try { return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(' ', '').toLowerCase(); } catch (x) { return ''; } };
  async function call(body) {
    var s = (await sb.auth.getSession()).data.session;
    if (!s) throw new Error('Sign in first.');
    var r = await fetch(FN, { method: 'POST', headers: { Authorization: 'Bearer ' + s.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    var j = await r.json().catch(function () { return {}; });
    if (!r.ok || j.error) throw new Error(j.error || ('prn-week ' + r.status));
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
    var state = !o ? (n.hold_until ? '<div class="field-note" style="margin-top:4px;">The automatic texts wait until ' + e(clock(n.hold_until)) + ', or until you record how the call went.</div>' : '')
      : '<div style="margin-top:4px;"><b>' + e(o.word) + '</b> <span class="field-note">recorded by ' + e(o.by || 'the office') + ', ' + e(clock(o.at)) + '</span></div>';
    var btns = !o ? btn('covering', 'Covering it') + btn('no_answer', 'Didn\'t answer in 15 minutes') + btn('not_covered', 'Didn\'t cover the shift')
      : o.kind === 'covering' ? btn('not_covered', 'Didn\'t cover the shift after all') : '';
    return '<div class="onc-box">' + (!S.live ? '<div class="pw-practice" style="margin-bottom:6px;">Practice: only owners see this, and nothing waits, until "On call first" is turned on (Settings, PRN Teams).</div>' : '')
      + '☏ <b>On call now: ' + e(n.name) + '</b> <span class="field-note">(' + e(String(n.slot_word || '').toLowerCase()) + ')</span>'
      + (!o ? '<div style="margin-top:2px;">Call ' + first + ' first, from the office line. On call means they answer within 15 minutes and can start within 1 hour.</div>' : '')
      + state + '<div class="onc-btns">' + (!o || o.kind === 'covering' ? call1 : '') + btns + '<span class="field-note" id="oncSt_' + e(c.id) + '"></span></div></div>';
  }
  async function mark(caseId, oncallId, kind, btn) {
    var n = S.cases[caseId]; if (!n) return;
    var q = kind === 'covering' ? 'Record that ' + n.first + ' is covering this shift?\n\nTheir yes goes on the case. Confirm them on the board as usual (it puts them on the AxisCare visit).'
      : 'Record that ' + n.first + (kind === 'no_answer' ? ' didn\'t answer within 15 minutes' : ' didn\'t cover the shift') + '?\n\nThat on-call shift is not paid, their other on-call shifts are taken back, and they can\'t sign up for on call again until an owner lets them. The automatic texts go out now.';
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
  window.ONC = { html: html, load: load, mark: mark, _state: function () { return S; } };
})();

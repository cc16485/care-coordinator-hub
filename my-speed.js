/* my-speed.js · MY SPEED (Samantha 2026-10-22, Speed to lead design approved: https://claude.ai/artifact/5vuSNJ9NKGhNiYf9ScEj7M).
   Each Care Coordinator's own numbers, nobody else's. 2026-10-26 (her call: "strange to have its own tab"): no longer a Leads
   tab; it is a small card at the bottom of the My Desk drawer (desk.js drawerRender calls mySpeedHtml). The numbers come from
   speed-rules.js (the same file the Owners Hub Speed to lead card reads). Her fun rules: good news only, never a nudge, never
   ranking or comparing people; time off never breaks a streak. Custom drawings only (no emoji). Nothing here writes. */
(function () {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  /* a small house; lit = a family who heard from you within 5 minutes */
  const house = lit => '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11l9-7 9 7v9H3z" fill="' + (lit ? '#FFC671' : 'rgba(255,255,255,.18)') + '"></path>'
    + '<rect x="10" y="14" width="4" height="6" fill="' + (lit ? '#0E3860' : 'rgba(255,255,255,.25)') + '"></rect></svg>';
  const sun = '<svg width="54" height="54" viewBox="0 0 90 90" aria-hidden="true" style="position:absolute;right:-8px;top:-8px;opacity:.9"><circle cx="45" cy="45" r="15" fill="#FFC671"></circle>'
    + '<g stroke="#FFC671" stroke-width="4" stroke-linecap="round"><path d="M45 16v-8M45 82v-8M16 45H8M82 45h-8M24 24l-6-6M72 72l-6-6M66 24l6-6M18 72l6-6"></path></g></svg>';
  const star = '<svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" style="flex:none"><path d="M12 2l2.6 6.3L21 9l-5 4.5L17.4 20 12 16.7 6.6 20 8 13.5 3 9l6.4-.7z" fill="#FFC671"></path></svg>';

  function mySpeedHtml() {
    if (typeof LeadRules === 'undefined' || typeof SpeedRules === 'undefined') return '';
    const me = (typeof ccActor === 'function' ? ccActor() : { name: '' }).name || '';
    const D = (typeof DATA !== 'undefined' && DATA) || {};
    const S = SpeedRules.mySpeed(D.leads || [], LeadRules.responseHours(D.ops_settings || {}), me, { now: new Date().toISOString() });
    const shown = Math.min(S.streak, 12);
    let h = '<div class="ms-card" id="mySpeedBox" style="margin-top:22px;display:flex;flex-direction:column;gap:10px;font-family:system-ui,-apple-system,\'Segoe UI\',sans-serif">';
    h += '<div style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#6E6559">Your speed <span style="font-weight:600;letter-spacing:0;text-transform:none">· only you see this</span></div>';
    if (S.celebrate) h += '<div style="background:#FFF6E3;border-radius:12px;padding:10px 12px;display:flex;gap:10px;align-items:center">' + star
      + '<div><b style="color:#5c3a06;font-size:13.5px">Last week was a 5-minute week</b><div style="font-size:12px;color:#5c3a06">Every family heard from a real person within 5 minutes.</div></div></div>';
    h += '<div style="position:relative;overflow:hidden;background:var(--navy,#0E3860);color:#fff;border-radius:14px;padding:13px 14px;display:flex;flex-direction:column;gap:7px">' + sun
      + (S.streak ? '<div style="font-size:15px;font-weight:800;line-height:1.3;max-width:250px">' + S.streak + (S.streak === 1 ? ' family' : ' families') + ' in a row heard from you within 5 minutes.</div>'
        + '<div style="display:flex;flex-wrap:wrap;gap:3px">' + Array.from({ length: shown }, () => house(true)).join('') + '</div>'
        : '<div style="font-size:15px;font-weight:800;line-height:1.3;max-width:250px">Your next family starts a new streak.</div><div style="display:flex;gap:3px">' + house(false) + house(false) + house(false) + '</div>')
      + '<div style="font-size:11.5px;color:#dbe6ef">Each house is a family whose porch light you turned on. Time off never breaks a streak.</div></div>';
    const T = S.team, pct = T.of ? Math.round(T.done / T.of * 100) : 0;
    h += '<div style="display:flex;flex-direction:column;gap:5px">'
      + '<div style="font-size:13px;font-weight:700;color:#0D365F">' + (T.of ? 'Team 5-minute week: ' + T.done + ' of ' + T.of + ' families so far' : 'Team 5-minute week: no families yet this week') + '</div>'
      + '<div style="height:8px;background:#EEF2F6;border-radius:999px;overflow:hidden"><div style="width:' + pct + '%;height:100%;background:#1F7A8C;border-radius:999px"></div></div>'
      + '<div style="font-size:11.5px;color:#6E6559">Everyone\'s families count together. No names, no ranking.</div></div>';
    const stat = (val, label, col) => '<div style="flex:1 1 120px"><div style="font-size:18px;font-weight:800;color:' + col + '">' + val + '</div><div style="font-size:12px;color:#0D365F;font-weight:600">' + label + '</div></div>';
    h += '<div style="display:flex;gap:10px;flex-wrap:wrap">'
      + (S.monthMedian != null ? stat(SpeedRules.minWords(S.monthMedian), 'Your middle wait this month', '#14606F') : stat('Soon', 'Your middle wait this month', '#14606F'))
      + (S.best ? stat(SpeedRules.minWords(S.best.median), 'Your best week (' + esc(S.best.week) + ')', '#C17A12') : '')
      + '</div>';
    h += '<details style="font-size:12px;line-height:1.5;color:#3a3222"><summary style="cursor:pointer;font-weight:700;color:#0D365F">How it counts</summary>'
      + 'Office hours only: a 9pm form starts the clock at 8am. A family who called and you answered counts as right away.'
      + ' A call from your own cell phone does not reach the Hub, so call from GoHighLevel.</details>';
    h += '</div>';
    return h;
  }
  window.mySpeedHtml = mySpeedHtml;
})();

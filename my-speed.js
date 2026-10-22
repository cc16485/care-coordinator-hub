/* my-speed.js · MY SPEED (Samantha 2026-10-22, Speed to lead design approved: https://claude.ai/artifact/5vuSNJ9NKGhNiYf9ScEj7M).
   Leads > My speed: each Care Coordinator's own page, nobody else's numbers on it. The numbers come from speed-rules.js (the
   same file the Owners Hub Speed to lead card reads). Her fun rules: good news only, never a nudge, never ranking or
   comparing people; time off never breaks a streak. Custom drawings only (no emoji). Nothing here writes. */
(function () {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  /* a small house; lit = a family who heard from you within 5 minutes */
  const house = lit => '<svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11l9-7 9 7v9H3z" fill="' + (lit ? '#FFC671' : 'rgba(255,255,255,.18)') + '"></path>'
    + '<rect x="10" y="14" width="4" height="6" fill="' + (lit ? '#0E3860' : 'rgba(255,255,255,.25)') + '"></rect></svg>';
  const sun = '<svg width="76" height="76" viewBox="0 0 90 90" aria-hidden="true" style="position:absolute;right:-8px;top:-8px;opacity:.9"><circle cx="45" cy="45" r="15" fill="#FFC671"></circle>'
    + '<g stroke="#FFC671" stroke-width="4" stroke-linecap="round"><path d="M45 16v-8M45 82v-8M16 45H8M82 45h-8M24 24l-6-6M72 72l-6-6M66 24l6-6M18 72l6-6"></path></g></svg>';
  const star = '<svg width="40" height="40" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.6 6.3L21 9l-5 4.5L17.4 20 12 16.7 6.6 20 8 13.5 3 9l6.4-.7z" fill="#FFC671"></path></svg>';

  function renderMySpeed() {
    const box = document.getElementById('mySpeedBox'); if (!box) return;
    if (typeof LeadRules === 'undefined' || typeof SpeedRules === 'undefined') { box.innerHTML = '<div class="muted">The speed numbers could not load. Reload the page.</div>'; return; }
    const me = (typeof ccActor === 'function' ? ccActor() : { name: '' }).name || '';
    const firstName = String(me).trim().split(/\s+/)[0] || 'you';
    const D = (typeof DATA !== 'undefined' && DATA) || {};
    const S = SpeedRules.mySpeed(D.leads || [], LeadRules.responseHours(D.ops_settings || {}), me, { now: new Date().toISOString() });
    const shown = Math.min(S.streak, 20);
    let h = '<div style="max-width:620px;display:flex;flex-direction:column;gap:14px">';
    h += '<div><div style="font-size:22px;font-weight:800;color:var(--navy)">Your speed</div><div class="muted" style="font-size:13px">Just for you, ' + esc(firstName) + '. Nobody else sees this page.</div></div>';
    if (S.celebrate) h += '<div style="background:#FFF6E3;border-radius:16px;padding:14px 18px;display:flex;gap:12px;align-items:center">' + star
      + '<div><b style="color:#5c3a06">Last week was a 5-minute week</b><div style="font-size:13px;color:#5c3a06">Every family heard from a real person within 5 minutes.</div></div></div>';
    h += '<div style="position:relative;overflow:hidden;background:var(--navy,#0E3860);color:#fff;border-radius:18px;padding:18px 20px;display:flex;flex-direction:column;gap:10px">' + sun
      + '<div style="font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#E8C988">Your streak</div>'
      + (S.streak ? '<div style="font-size:21px;font-weight:800;line-height:1.25;max-width:460px">' + S.streak + (S.streak === 1 ? ' family' : ' families') + ' in a row heard from you within 5 minutes.</div>'
        + '<div style="display:flex;flex-wrap:wrap;gap:4px">' + Array.from({ length: shown }, () => house(true)).join('') + '</div>'
        : '<div style="font-size:19px;font-weight:800;line-height:1.3;max-width:460px">Your next family starts a new streak.</div><div style="display:flex;gap:4px">' + house(false) + house(false) + house(false) + '</div>')
      + '<div style="font-size:12.5px;color:#dbe6ef">Each house is a family whose porch light you turned on. Time off never breaks a streak.</div></div>';
    const T = S.team, pct = T.of ? Math.round(T.done / T.of * 100) : 0;
    h += '<div style="background:#fff;border:1px solid var(--border);border-radius:16px;padding:16px 18px;display:flex;flex-direction:column;gap:8px">'
      + '<div style="font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--teal-dark,#14606F)">Team goal this week</div>'
      + '<div style="font-size:17px;font-weight:800;color:var(--navy)">' + (T.of ? 'A 5-minute week: ' + T.done + ' of ' + T.of + ' families so far' : 'A 5-minute week: no families yet this week') + '</div>'
      + '<div style="height:12px;background:#EEF2F6;border-radius:999px;overflow:hidden"><div style="width:' + pct + '%;height:100%;background:#1F7A8C;border-radius:999px"></div></div>'
      + '<div class="muted" style="font-size:12.5px">Everyone\'s families count together. No names, no ranking.</div></div>';
    const tile = (val, label, sub, col) => '<div style="flex:1 1 180px;background:#fff;border:1px solid var(--border);border-radius:14px;padding:14px 16px"><div style="font-size:24px;font-weight:800;color:' + col + '">' + val + '</div>'
      + '<div style="font-weight:700;color:var(--navy);font-size:13.5px">' + label + '</div>' + (sub ? '<div class="muted" style="font-size:12px">' + sub + '</div>' : '') + '</div>';
    h += '<div style="display:flex;gap:12px;flex-wrap:wrap">'
      + (S.monthMedian != null ? tile(SpeedRules.minWords(S.monthMedian), 'Your middle wait this month', 'from when the office opens', '#14606F') : tile('Soon', 'Your middle wait this month', 'it shows once your families come in', '#14606F'))
      + (S.best ? tile(SpeedRules.minWords(S.best.median), 'Your best week', 'week of ' + esc(S.best.week), '#C17A12') : '')
      + '</div>';
    h += '<div style="background:#fff;border:1px solid var(--border);border-radius:14px;padding:14px 18px;font-size:13px;line-height:1.55">'
      + '<b style="color:var(--navy)">How it counts</b><br>Office hours only: a 9pm form starts the clock at 8am. A family who called and you answered counts as right away.'
      + ' A call from your own cell phone does not reach the Hub, so call from GoHighLevel.</div>';
    h += '</div>';
    box.innerHTML = h;
  }
  window.renderMySpeed = renderMySpeed;
})();

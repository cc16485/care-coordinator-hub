/* =============================================================================
   NEW HIRES WAITING FOR HOURS (2026-10-12, her ask: "a good place to put so clearly a new hires until they are
   scheduled ... show what their availability is and make them a priority to get them hours scheduled", and "B")
   One card at the top of Cara, Hours & matching. Who: hired in AxisCare in the last 60 days with nothing (or less than
   the weekly hours they asked for) scheduled in the next 14 days; the server decides (coverage-shifts team_pool,
   _shared/new-hire.ts) and the same people are tagged and put first among equal fits in Cara's ask lists and the Team
   Builder list. Each card also says when the person is not cleared to drive clients (Driver Compliance, 2026-10-13).
   Reads only; nothing here sends or saves.
   ============================================================================= */
(function () {
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], DL = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
  const BAND = { morning: 'mornings', afternoon: 'daytimes', evening: 'evenings', overnight: 'overnights' };
  const list = () => (Array.isArray(typeof TB !== 'undefined' && TB.pool) ? TB.pool : []).filter((p) => p && p.new_hire && !p.work_locked)
    .sort((a, b) => (b.new_hire.days - a.new_hire.days) || String(a.name).localeCompare(String(b.name)));
  function count() { return list().length; }
  /* "Mon, Wed: mornings, daytimes · Fri: evenings" from the availability form; her rule when nothing is on file */
  function availWords(w) {
    if (!w || typeof w !== 'object') return 'No availability on file: assumed available any time';
    const groups = new Map();
    DAYS.forEach((d) => { const b = (Array.isArray(w[d]) ? w[d] : []).map((x) => BAND[x] || x).join(', '); if (b) { if (!groups.has(b)) groups.set(b, []); groups.get(b).push(DL[d]); } });
    if (!groups.size) return 'No availability on file: assumed available any time';
    return [...groups.entries()].map(([b, ds]) => ds.join(', ') + ': ' + b).join(' · ');
  }
  /* Driver Compliance (2026-10-13): a new hire not cleared to drive can't take a shift that needs transportation; say so on
     the card so nobody offers them one (CCMatch.transportEligible, the one shared rule). Nothing shown for an Approved Driver. */
  function driveLine(p) {
    const M = window.CCMatch; if (!M || !M.transportEligible) return '';
    const lg = p.dl_status == null && p.axiscare_id && typeof DATA !== 'undefined' ? (DATA.caregivers || []).find((x) => String(x.axiscare_id || '') === String(p.axiscare_id)) : null;
    const t = M.transportEligible(lg || p, new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date()));
    return t.ok ? '' : '<div style="font-size:12.5px;color:var(--red);margin-top:2px;">🚗 Not cleared to drive clients: ' + esc(t.why) + '. Not for shifts that need transportation.</div>';
  }
  const dateWords = (d) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  function openShifts() { switchTab('liveschedule'); try { LC.open = true; if (typeof lcView === 'function') lcView('week'); else if (typeof lsPaint === 'function') lsPaint(); } catch (e) {} }
  function render() {
    const box = document.getElementById('nhCard'); if (!box) return;
    if (typeof TB === 'undefined') { box.innerHTML = ''; return; }
    if (!TB.pool && !TB.loading && typeof tbLoadPool === 'function') tbLoadPool();
    const head = '<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;"><b style="font-size:15px;color:var(--navy);">🌱 New hires waiting for hours</b>'
      + '<span class="field-note" style="font-size:12px;">Hired in the last 60 days with nothing, or less than they asked for, on the schedule in the next 2 weeks. They come first in Cara\'s ask lists and the Team Builder list when they fit as well as anyone else.</span></div>';
    let body;
    if (!Array.isArray(TB.pool)) body = '<div class="field-note" style="margin-top:6px;">' + (TB.pool && TB.pool.error ? 'Couldn\'t read AxisCare just now: ' + esc(TB.pool.error) : 'Reading AxisCare…') + '</div>';
    else {
      const L = list();
      body = !L.length ? '<div class="field-note" style="margin-top:6px;">Every new hire has hours on the schedule. 🎉</div>'
        : L.map((p) => {
          const n = p.new_hire;
          const hrs = n.scheduled_14d ? n.scheduled_14d + ' h in the next 2 weeks' : 'nothing scheduled in the next 2 weeks';
          return '<div style="padding:8px 0;border-top:1px solid var(--border);display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap;">'
            + '<div style="flex:1;min-width:260px;"><b style="color:var(--navy);">' + esc(p.name) + '</b>'
            + '<span class="field-note" style="margin-left:6px;">hired ' + esc(dateWords(n.hired)) + ' (' + n.days + ' day' + (n.days === 1 ? '' : 's') + ' ago)' + (p.city ? ' · ' + esc(p.city) : '') + '</span>'
            + '<div style="font-size:13px;margin-top:2px;"><b style="color:var(--red);">' + esc(hrs) + '</b>' + (n.target_week ? ' · wants ' + n.target_week + ' h a week' : '') + '</div>'
            + '<div style="font-size:12.5px;color:var(--text-muted);margin-top:2px;">🗓️ ' + esc(availWords(p.windows)) + '</div>'
            + driveLine(p) + '</div>'
            + '<div style="display:flex;gap:6px;flex-wrap:wrap;"><button class="cara-btn" style="font-size:12px;" onclick="NH.openShifts()">Find them hours</button>'
            + '<button class="cara-btn ghost" style="font-size:12px;" onclick="openCaregiverProfile(\'' + esc(String(p.name).replace(/'/g, '')) + '\')">Profile</button></div></div>';
        }).join('');
    }
    box.innerHTML = '<div class="card" style="padding:12px 14px;margin:0 0 14px;border-left:4px solid var(--teal);">' + head + body + '</div>';
  }
  window.NH = { render, count, list, availWords, openShifts, driveLine };
})();

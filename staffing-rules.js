/* =============================================================================
   staffing-rules.js · "Where we can staff this week" (Referral Partner Desk Step 4, Samantha approved 2026-10-08)
   Pure functions: the Hub's staffing sheet, the Referrers desk and the tests all run this one file.

   HER SAFEGUARDS, each one a reason a caregiver is or isn't counted (Staffing sees the reason):
   · only caregivers ACTIVELY ACCEPTING NEW CLIENTS (Staffing records yes/no; unanswered = not counted)
   · with at least one USABLE 4-HOUR BLOCK this week: inside a time of day they said they're available, on a day
     AxisCare has them free for 4 hours in a row, and at least 4 open hours in their week (stated hours minus scheduled)
   · real availability on file (nothing on file, or older than 90 days, = not counted)
   · their TRAVEL PREFERENCES: the towns they'll work in, recorded by Staffing. Living in a town never counts by itself
   · qualifications: not counted if eligibility says not eligible or lapsed, if on the do-not-offer list, or if a
     skill filter is on and they don't have it
   · Open = 2 or more eligible caregivers, Limited = 1
   · confirmed by Staffing (or an owner) every Monday, updatable any time; a confirmed town/time whose caregivers or
     count changed since is flagged for re-review and is not shared until it's confirmed again
   · a partner only ever sees towns and times of day: never a caregiver, a count, a schedule, or a promised start
   ============================================================================= */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.StaffingRules = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const WIN = ['morning', 'afternoon', 'evening', 'overnight'];
  const WIN_LABEL = { morning: 'mornings', afternoon: 'afternoons', evening: 'evenings', overnight: 'overnights' };
  /* the availability form's own times (availability.html): morning 6-12, daytime 12-5, evening 5-10, overnight 10-6 */
  const SPAN = { morning: [6, 12], afternoon: [12, 17], evening: [17, 22], overnight: [22, 30] };
  const DOW = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const DEFAULTS = { min_hours: 4, open_min: 2, stale_days: 90 };
  const lc = s => String(s == null ? '' : s).trim().toLowerCase();
  const ymd = d => (typeof d === 'string' ? d : new Date(d).toISOString()).slice(0, 10);
  const addDays = (d, n) => { const x = new Date(ymd(d) + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  const days = (a, b) => Math.round((Date.parse(ymd(b) + 'T12:00:00Z') - Date.parse(ymd(a) + 'T12:00:00Z')) / 864e5);
  const hm = t => { const m = /^(\d{1,2}):(\d{2})/.exec(String(t || '')); return m ? +m[1] + (+m[2]) / 60 : null; };
  function weekOf(today) { const d = new Date(ymd(today) + 'T12:00:00Z'), dow = (d.getUTCDay() + 6) % 7; return { start: addDays(today, -dow), end: addDays(today, 6 - dow) }; }
  function settings(st) { const s = Object.assign({}, DEFAULTS, (st && st.staffing_sheet_rules) || {}); for (const k of Object.keys(DEFAULTS)) { const n = Number(s[k]); s[k] = n >= 1 && n <= 365 ? n : DEFAULTS[k]; } return s; }

  /* booked hours on one date, as [start, end) in hours from that date's midnight (a visit past midnight spills into the next date) */
  function booked(visits, date) {
    const out = [];
    for (const v of visits || []) {
      const s = hm(v.start), e0 = hm(v.end); if (s == null || e0 == null) continue; const e = e0 <= s ? e0 + 24 : e0;
      if (v.day === date) out.push([s, e]);
      if (v.day === addDays(date, -1) && e > 24) out.push([0, e - 24]);
    }
    return out.sort((a, b) => a[0] - b[0]);
  }
  /* the longest free stretch inside a window on a date */
  function freeRun(span, busy) {
    let best = 0, cur = span[0];
    for (const [s, e] of busy) { if (e <= cur) continue; if (s >= span[1]) break; best = Math.max(best, Math.min(s, span[1]) - cur); cur = Math.max(cur, e); }
    return Math.max(best, span[1] - cur);
  }

  /** one caregiver: counted or not (and why), the times of day with a usable block this week, the towns they'll work in */
  function caregiver(cg, ctx) {
    ctx = ctx || {}; const S = settings(ctx.settings), today = ymd(ctx.today || new Date().toISOString());
    const ax = String(cg.axiscare_id || cg.id || ''), ov = (ctx.overlay || {})[ax] || {}, why = [];
    const elig = typeof ctx.eligibility === 'function' ? ctx.eligibility(ax) : null;
    if (ctx.doNotOffer && ctx.doNotOffer.has(ax)) why.push('on the do-not-offer list');
    if (elig === 'not_eligible' || elig === 'lapsed') why.push('not eligible to work (' + elig.replace('_', ' ') + ')');
    /* SLICE 5 (2026-10-10): a new hire with a readiness card is locked until Approved to Work and AxisCare read back Active (the server flags the pool row) */
    if (cg.work_locked) why.push('awaiting Approve to Work (new hire)');
    if (!cg.windows || !Object.values(cg.windows).some(w => Array.isArray(w) && w.length)) why.push('no availability on file');
    else if (!cg.availability_updated || days(cg.availability_updated, today) > S.stale_days) why.push('availability older than ' + S.stale_days + ' days');
    const acc = ov.accepting_new && ov.accepting_new.v;
    if (acc === 'no') why.push('not accepting new clients');
    else if (acc !== 'yes') why.push('not asked yet: accepting new clients?');
    const towns = Array.isArray(ov.travel_towns) ? ov.travel_towns.filter(Boolean) : [];
    if (!towns.length) why.push('travel towns not recorded');
    for (const k of ctx.skills || []) if (!(ov.skills && ov.skills[k] && ov.skills[k].have === 'yes')) why.push('no ' + k.replace(/_/g, ' '));
    /* the week: open hours, and which times of day have a usable block on at least one day */
    const wk = { start: today, end: addDays(today, 6) };
    const sched = (cg.visits || []).filter(v => v.day >= wk.start && v.day <= wk.end).reduce((a, v) => { const s = hm(v.start), e0 = hm(v.end); if (s == null || e0 == null) return a; return a + ((e0 <= s ? e0 + 24 : e0) - s); }, 0);
    const target = Number(cg.target_hours), open = Number.isFinite(target) ? Math.round((target - sched) * 10) / 10 : null;
    if (open == null) why.push('no weekly hours on file');
    else if (open < S.min_hours) why.push('fewer than ' + S.min_hours + ' open hours this week (' + Math.max(0, open) + ')');
    const usable = {};
    for (let i = 0; i < 7; i++) {
      const date = addDays(today, i), dow = DOW[new Date(date + 'T12:00:00Z').getUTCDay()], wins = (cg.windows && cg.windows[dow]) || [], busy = booked(cg.visits, date);
      for (const w of wins) if (SPAN[w] && freeRun(SPAN[w], busy) >= S.min_hours) usable[w] = (usable[w] || 0) + 1;
    }
    const times = WIN.filter(w => usable[w]);
    if (!why.length && !times.length) why.push('no free ' + S.min_hours + '-hour block in their times this week');
    return { ax, name: cg.name || '', counted: !why.length, why, towns, times, open, scheduled: Math.round(sched * 10) / 10, eligibility: elig || 'unknown' };
  }

  /** the sheet: town × time of day. Each cell: open (2+), limited (1) or none, with the caregivers (internal only) */
  function sheet(pool, ctx) {
    ctx = ctx || {}; const S = settings(ctx.settings), towns = (ctx.towns || []).map(String);
    const people = (pool || []).map(cg => caregiver(cg, ctx)), counted = people.filter(p => p.counted);
    const cells = {};
    for (const t of towns) for (const w of WIN) {
      const ids = counted.filter(p => p.times.indexOf(w) > -1 && p.towns.some(x => lc(x) === lc(t))).map(p => p.ax).sort();
      cells[t + '|' + w] = { town: t, time: w, ids, status: ids.length >= S.open_min ? 'open' : ids.length ? 'limited' : 'none' };
    }
    return { cells, people, counted: counted.length, excluded: people.filter(p => !p.counted) };
  }

  /** what a confirmation saves: each cell's status (after any override) and who made it so (to notice changes later) */
  function snapshot(sh, overrides) {
    const out = {};
    for (const [k, c] of Object.entries(sh.cells)) { const o = overrides && overrides[k]; out[k] = { status: o ? o.status : c.status, live: c.status, ids: c.ids.slice(), override: o || null }; }
    return out;
  }
  /** confirmed vs now: a confirmed cell whose caregivers or count changed since is flagged for re-review */
  function review(conf, sh, today) {
    const wk = weekOf(today), cur = conf && conf.week_start === wk.start ? conf : null, flags = [];
    if (!cur) return { confirmed: false, stale_week: !!conf, flags, cells: {} };
    for (const [k, c] of Object.entries(cur.cells || {})) {
      const now = sh.cells[k]; if (!now) continue;
      const changed = now.status !== c.live || now.ids.join() !== (c.ids || []).join();
      if (changed && (c.status !== 'none' || now.status !== 'none')) flags.push({ key: k, town: now.town, time: now.time, was: c.live, now: now.status, override: !!c.override });
    }
    return { confirmed: true, by: cur.by_name || cur.by, at: cur.at, flags, cells: cur.cells };
  }
  /** what outreach may see and share: confirmed this week, not flagged, open or limited; towns and times only */
  function shareable(conf, sh, today) {
    const r = review(conf, sh, today); if (!r.confirmed) return { confirmed: false, rows: [], text: '' };
    const flagged = new Set(r.flags.map(f => f.key)), by = {};
    for (const [k, c] of Object.entries(r.cells)) { if (flagged.has(k) || (c.status !== 'open' && c.status !== 'limited')) continue; const [town, time] = k.split('|'); (by[town] = by[town] || []).push(time); }
    const rows = Object.entries(by).map(([town, ts]) => ({ town, times: WIN.filter(w => ts.indexOf(w) > -1) }));
    const text = rows.length ? 'This week we have openings for new clients in ' + rows.map(r2 => r2.town + ' (' + r2.times.map(t => WIN_LABEL[t]).join(', ') + ')').join('; ') + '. Please call us at (417) 234-8494 to confirm a start; this is not a promise of a start date or a particular caregiver.' : '';
    return { confirmed: true, by: r.by, at: r.at, rows, text, rechecking: r.flags.length };
  }
  return { WIN, WIN_LABEL, SPAN, DEFAULTS, settings, weekOf, booked, freeRun, caregiver, sheet, snapshot, review, shareable, addDays };
});

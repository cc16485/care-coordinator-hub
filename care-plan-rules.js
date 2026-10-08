/* =============================================================================
   care-plan-rules.js · reading the state's Medicaid care plan (GHE fix, slice 1, Samantha approved 2026-10-08)
   Pure functions: the Hub's care plan upload and the tests run this one file.

   The PDF is the "Home & Community Based Services Care Plan" the Medicaid coordinator downloads from Fusion.
   Fusion stays the official record (MAN 4.30). The Hub keeps a copy of what the plan said, after a person confirms it.

   WHAT THE PLAN LOOKS LIKE (read from real plans, 2026-10-08):
   · page 1: participant name, DCN, "Care Plan Information mm/dd/yyyy - mm/dd/yyyy", "Date Generated" in the footer
   · then one block per service: a service line (Service Type, Start, End, Provider, GHE 1, GHE 2, Prior Authorization),
     a units table (Start Date, End Date, Procedure Code, Authorized Units, one row per month) and a task table
   · THE GHE IS ITS OWN SERVICE LINE ("GHE", procedure T1001, 1 unit, its own prior authorization) in the month the state
     authorized it. The GHE 1 / GHE 2 columns printed N/A on every line seen so far; if they ever carry a month, it is read too.
   · column positions differ from page to page, so columns are found from each table's own heading, never fixed
   · lines for another provider (e.g. a CDS vendor) appear on the same plan: kept as "also served by", never ours

   Who gets a GHE (MAN 3.15 rev. Jul 2026; INFO 05-26-02): Agency Model personal care and APC. Not CDS-only, ADW-only,
   ILW-only. So an Agency PC/APC plan of ours with no GHE line is flagged for the coordinator to check in Fusion.
   ============================================================================= */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CarePlanRules = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const OURS = /caring\s+companions\s+in\s+home/i;
  const t = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const iso = us => { const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t(us)); return m ? m[3] + '-' + m[1].padStart(2, '0') + '-' + m[2].padStart(2, '0') : ''; };
  const num = s => { const m = /^\d+(\.\d+)?$/.exec(t(s)); return m ? +m[0] : null; };

  /* what kind of service a line is, by its Service Type wording */
  const KINDS = [
    ['ghe', /^ghe$|general health eval/i, 'GHE (nurse visit)'],
    ['cds', /\bcds\b|consumer directed/i, 'Consumer directed (CDS)'],
    ['ilw', /\bilw\b|independent living/i, 'Independent Living Waiver'],
    ['apc', /\bapc\b|advanced personal/i, 'Advanced personal care (APC)'],
    ['adw_respite', /respite/i, 'ADW respite'],
    ['adw_homemaker', /homemaker/i, 'ADW homemaker'],
    ['adw_chore', /chore/i, 'ADW chore'],
    ['nurse', /nurse|\brn\b|\blpn\b/i, 'Authorized nurse visit'],
    ['pc', /^pc\b|personal care/i, 'Agency personal care'],
  ];
  function kindOf(type) { for (const [k, re, label] of KINDS) if (re.test(t(type))) return { kind: k, label }; return { kind: 'other', label: t(type) || 'Other service' }; }
  const PROGRAM = { pc: 'ihs', apc: 'ihs', ghe: 'ihs', nurse: 'ihs', adw_respite: 'adw', adw_homemaker: 'adw', adw_chore: 'adw', cds: 'cds', ilw: 'cds' };

  /* a month from a GHE 1 / GHE 2 cell, if the state ever prints one (mm/yyyy or mm/dd/yyyy) */
  function cellMonth(s) {
    s = t(s); let m = /^(\d{1,2})\/(\d{4})$/.exec(s); if (m) return m[2] + '-' + m[1].padStart(2, '0');
    m = /^(\d{1,2})\/\d{1,2}\/(\d{4})$/.exec(s); return m ? m[2] + '-' + m[1].padStart(2, '0') : '';
  }

  /**
   * items: [{ page, x, y, str }] as the PDF reader gives them (y grows upward, as in PDF space).
   * Returns { name, dcn, plan_start, plan_end, generated, services: [...], problems: [...] }.
   */
  function parse(items) {
    const all = (items || []).map(i => ({ page: +i.page || 1, x: +i.x || 0, y: +i.y || 0, s: t(i.str) })).filter(i => i.s);
    const text = all.map(i => i.s).join('\n');
    const out = { name: '', dcn: '', plan_start: '', plan_end: '', generated: '', services: [], problems: [] };
    let m = /Participant Information:\s*([^\n]+)/.exec(text); if (m) out.name = t(m[1]);
    m = /DCN:\s*(\d{6,10})/.exec(text);
    if (!m) { const d = all.find(i => i.s === 'DCN:'); const v = d && all.find(i => i.page === d.page && Math.abs(i.y - d.y) < 3 && i.x > d.x && /^\d{6,10}$/.test(i.s)); if (v) m = [0, v.s]; }
    if (m) out.dcn = m[1];
    m = /Care Plan Information\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*-\s*(\d{1,2}\/\d{1,2}\/\d{4})/.exec(text); if (m) { out.plan_start = iso(m[1]); out.plan_end = iso(m[2]); }
    m = /Date Generated:\s*(\d{1,2}\/\d{1,2}\/\d{4})/.exec(text); if (m) out.generated = iso(m[1]);

    /* the body: drop the page footer and the running head on later pages */
    const body = all.filter(i => i.y > 25 && !/ - DCN:\s*\d+$/.test(i.s) && !/^Date Generated:/.test(i.s))
      .sort((a, b) => a.page - b.page || b.y - a.y || a.x - b.x);
    const lines = [];
    for (const i of body) { const L = lines[lines.length - 1]; if (L && L.page === i.page && Math.abs(L.y - i.y) <= 2) L.items.push(i); else lines.push({ page: i.page, y: i.y, items: [i] }); }
    const has = (L, s) => L.items.some(i => i.s === s || i.s.indexOf(s) === 0);
    const colOf = (cols, x) => { let best = null; for (const c of cols) if (c.x <= x + 8 && (!best || c.x > best.x)) best = c; return best ? best.k : null; };

    let mode = null, cols = null, svc = null, svcRow = null;
    const closeSvcRow = () => {
      if (!svcRow) return;
      const cell = {}; svcRow.sort((a, b) => b.y - a.y || a.x - b.x);
      for (const i of svcRow) { const k = colOf(cols, i.x); if (!k) continue; const prev = cell[k]; cell[k] = prev == null ? i.s : (/^\//.test(i.s) ? prev + i.s : prev + ' ' + i.s); }
      const type = t(cell.type), kd = kindOf(type), provider = t(cell.provider);
      svc = { type, kind: kd.kind, label: kd.label, program: PROGRAM[kd.kind] || 'other', start: iso(cell.start), end: iso(cell.end),
        provider, ours: OURS.test(provider), ghe1: cellMonth(cell.ghe1), ghe2: cellMonth(cell.ghe2), prior_auth: /^\d{8,}$/.test(t(cell.pa)) ? t(cell.pa) : '',
        units: [], tasks: [] };
      out.services.push(svc); svcRow = null;
    };
    for (let li = 0; li < lines.length; li++) {
      const L = lines[li];
      /* a service heading: "Service ... Provider ... Prior" spread over a band of ~20 points */
      if (has(L, 'Service') && L.items[0].s === 'Service') {
        closeSvcRow();
        const band = body.filter(i => i.page === L.page && i.y <= L.y + 2 && i.y >= L.y - 20);
        const find = re => band.filter(i => re.test(i.s)).sort((a, b) => a.x - b.x);
        const ghe = find(/^GHE$/);
        cols = [{ k: 'type', x: L.items[0].x }];
        const st = find(/^Start/)[0], en = find(/^End/)[0], pr = find(/^Provider$/)[0], pa = find(/^Prior$/)[0];
        if (st) cols.push({ k: 'start', x: st.x }); if (en) cols.push({ k: 'end', x: en.x }); if (pr) cols.push({ k: 'provider', x: pr.x });
        if (ghe[0]) cols.push({ k: 'ghe1', x: ghe[0].x }); if (ghe[1]) cols.push({ k: 'ghe2', x: ghe[1].x }); if (pa) cols.push({ k: 'pa', x: pa.x });
        const bottom = Math.min.apply(null, band.map(i => i.y));
        while (li + 1 < lines.length && lines[li + 1].page === L.page && lines[li + 1].y >= bottom - 0.5) li++;
        mode = 'service'; svcRow = []; continue;
      }
      if (has(L, 'Procedure Code')) {
        closeSvcRow(); mode = 'units';
        cols = L.items.map(i => ({ k: /^Start/.test(i.s) ? 'start' : /^End/.test(i.s) ? 'end' : /Procedure/.test(i.s) ? 'code' : /Authorized/.test(i.s) ? 'units' : null, x: i.x })).filter(c => c.k);
        continue;
      }
      if (has(L, '#Min/Day') || (L.items[0].s === 'Task' && has(L, 'Comments'))) {
        closeSvcRow(); mode = 'tasks';
        cols = L.items.map(i => ({ k: i.s === 'Task' ? 'task' : /Min\/Day/.test(i.s) ? 'min_day' : /Units\/Day/.test(i.s) ? 'units_day' : /Days\/Week/.test(i.s) ? 'days_week' : /Units\/Month/.test(i.s) ? 'units_month' : /Comments/.test(i.s) ? 'comments' : null, x: i.x })).filter(c => c.k);
        continue;
      }
      if (mode === 'service' && svcRow) { svcRow.push.apply(svcRow, L.items); continue; }
      if (mode === 'units' && svc) {
        const c = {}; for (const i of L.items) { const k = colOf(cols, i.x); if (k) c[k] = i.s; }
        if (iso(c.start) && iso(c.end)) svc.units.push({ start: iso(c.start), end: iso(c.end), code: t(c.code), units: num(c.units) });
        continue;
      }
      if (mode === 'tasks' && svc) {
        const c = {}; for (const i of L.items) { const k = colOf(cols, i.x); if (k) c[k] = (c[k] ? c[k] + ' ' : '') + i.s; }
        const only = Object.keys(c).length === 1 && c.task;
        if (only && svc.tasks.length && Math.abs(L.y - svc.tasks[svc.tasks.length - 1]._y) < 16) { svc.tasks[svc.tasks.length - 1].task += ' ' + c.task; continue; }
        if (c.task) svc.tasks.push({ task: t(c.task), min_day: num(c.min_day), units_day: num(c.units_day), days_week: num(c.days_week), units_month: num(c.units_month), comments: /^n\/a$/i.test(t(c.comments)) ? '' : t(c.comments), _y: L.y });
        continue;
      }
    }
    closeSvcRow();
    for (const s of out.services) for (const k of s.tasks) delete k._y;
    if (!out.dcn) out.problems.push('No DCN found.');
    if (!out.services.length) out.problems.push('No service lines found. Is this the "Home & Community Based Services Care Plan" from Fusion?');
    if (out.services.some(s => !s.start || !s.end)) out.problems.push('A service line is missing its dates.');
    return out;
  }

  /** the GHE months this plan authorizes for us: the GHE service lines, plus any month printed in the GHE 1/2 columns */
  function gheMonths(plan) {
    const out = [];
    for (const s of (plan && plan.services) || []) {
      if (!s.ours) continue;
      if (s.kind === 'ghe' && s.start) {
        const code = (s.units[0] && s.units[0].code) || '';
        out.push({ month: s.start.slice(0, 7), start: s.start, end: s.end, prior_auth: s.prior_auth, code, from: 'GHE line' });
      }
      for (const w of ['ghe1', 'ghe2']) if (s[w]) out.push({ month: s[w], start: '', end: '', prior_auth: s.prior_auth, code: '', from: w.toUpperCase() + ' column' });
    }
    const seen = {}; return out.filter(g => (seen[g.month] ? false : (seen[g.month] = true))).sort((a, b) => a.month.localeCompare(b.month));
  }

  /** what the coordinator needs to know before confirming */
  function summary(plan, today) {
    today = String(today || '').slice(0, 10);
    const svcs = (plan && plan.services) || [], ours = svcs.filter(s => s.ours), others = svcs.filter(s => !s.ours);
    const programs = Array.from(new Set(ours.map(s => s.program)));
    const ghes = gheMonths(plan);
    const needsGhe = ours.some(s => s.kind === 'pc' || s.kind === 'apc');
    const notes = [], stops = [].concat((plan && plan.problems) || []);
    if (!ours.length) stops.push('Caring Companions In Home is not the provider on any line of this plan.');
    if (ours.length && ours.every(s => s.program === 'cds')) stops.push('This is a CDS plan. It belongs on the CDS side (CDS Hub), not here.');
    if (plan && plan.plan_end && today && plan.plan_end < today) notes.push('This plan ended ' + plan.plan_end + '. Upload the current one from Fusion if there is a newer plan.');
    if (needsGhe && !ghes.length) notes.push('Agency personal care with no GHE line on this plan. Check Fusion: Agency Model clients get GHEs in months 4 and 10.');
    if (ours.some(s => s.program === 'cds')) notes.push('Our CDS lines on this plan are left for the CDS side.');
    for (const s of others) notes.push('Also served by ' + (s.provider.replace(/,.*$/, '') || 'another provider') + ': ' + s.label + '.');
    return { programs, ghes, needsGhe, ours: ours.filter(s => s.program !== 'cds'), others, notes, stops, ok: !stops.length };
  }

  /** the nurse board's two GHE windows after this plan: every GHE month known for the client, the latest two kept */
  function boardMonths(existing, ghes) {
    const months = [existing && existing.ghe1, existing && existing.ghe2].filter(Boolean).map(m => String(m).slice(0, 7));
    for (const g of ghes || []) months.push(g.month);
    const u = Array.from(new Set(months)).sort();
    const last2 = u.slice(-2);
    const auth = Object.assign({}, (existing && existing.ghe_auth) || {});
    for (const g of ghes || []) auth[g.month] = { prior_auth: g.prior_auth, code: g.code };
    return { ghe1: last2[0] || null, ghe2: last2[1] || null, ghe_auth: auth };
  }

  /** where an active client stands: a current plan, an ended plan, marked not Medicaid, or unknown */
  function clientStatus(ax, plans, marks, today) {
    const mine = (plans || []).filter(p => String(p.axiscare_client_id) === String(ax) && p.kind === 'plan').sort((a, b) => String(b.plan_end).localeCompare(String(a.plan_end)) || String(b.generated).localeCompare(String(a.generated)));
    const mark = (marks || []).find(p => String(p.axiscare_client_id) === String(ax) && p.kind === 'payer_mark');
    if (mine[0]) return mine[0].plan_end >= String(today).slice(0, 10) ? { s: 'current', plan: mine[0] } : { s: 'ended', plan: mine[0] };
    if (mark && mark.payer && mark.payer !== 'medicaid') return { s: 'not_medicaid', mark };
    if (mark && mark.payer === 'medicaid') return { s: 'medicaid_no_plan', mark };
    return { s: 'unknown' };
  }

  /** a record safe to keep: what the plan said and who confirmed it; never the address, phone or date of birth */
  function record(plan, ctx) {
    ctx = ctx || {};
    const svc = (plan.services || []).map(s => ({ type: s.type, kind: s.kind, label: s.label, program: s.program, start: s.start, end: s.end,
      provider: s.ours ? 'Caring Companions In Home' : s.provider.replace(/,\s*\(?\d[\d\s()-]*$/, '').replace(/,\s*$/, ''), ours: s.ours,
      prior_auth: s.ours ? s.prior_auth : '', ghe1: s.ghe1, ghe2: s.ghe2, units: s.ours ? s.units : [], tasks: s.ours ? s.tasks : [] }));
    return { id: 'mcp_' + String(ctx.ax) + '_' + String(plan.plan_start || '') + '_' + String(plan.generated || ''), kind: 'plan',
      axiscare_client_id: String(ctx.ax || ''), client_name: ctx.client_name || plan.name, dcn: plan.dcn,
      plan_start: plan.plan_start, plan_end: plan.plan_end, generated: plan.generated, received_on: ctx.received_on || '',
      file_name: ctx.file_name || '', services: svc, ghe_months: gheMonths(plan).map(g => g.month),
      confirmed_by: ctx.by || '', confirmed_at: ctx.at || '' };
  }

  return { parse, kindOf, gheMonths, summary, boardMonths, clientStatus, record, iso };
});

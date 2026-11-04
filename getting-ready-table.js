/* getting-ready-table.js · Getting ready as one table (Samantha 2026-11-03: "Approve the Getting ready table as shown, with
   all six of your picks. Build it switched off."). window.GRT.
   One row per family from "They said yes" until the next-day follow-up, one column per Start of Care step with its button in
   it, the start date, who the family is waiting on (Office, Family, Outside) and how long, chips by step / Holding up / payer,
   a summary on top, phone cards. Switch: ops_settings.getting_ready_table_live (Admin, Clients). While it is off nothing here
   draws and the two lists (Before staffing, First shift) and Starting care stay exactly as they are.
   It only READS what the two lists read: the client journeys (client-journey.js cjTableRows), the older Start of Care
   checklists (DATA.leads[].soc) and the older First shift checklists (window.__cqRows), plus each family's Client Care
   Agreement (client-agreement list, read once and kept 5 minutes). Every button opens the family where today's Open does. */
(function () {
  'use strict';
  const esc = t => (typeof escapeHtmlComms === 'function' ? escapeHtmlComms(t) : String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]));
  const on = () => !!(typeof DATA !== 'undefined' && DATA.ops_settings && DATA.ops_settings.getting_ready_table_live === true);
  const ymd = d => new Date(d).toLocaleString('sv-SE', { timeZone: 'America/Chicago' }).slice(0, 10);
  const today = () => ymd(Date.now());
  const isDay = s => /^\d{4}-\d{2}-\d{2}/.test(String(s || ''));
  const daysTo = s => Math.round((Date.parse(String(s).slice(0, 10) + 'T12:00:00Z') - Date.parse(today() + 'T12:00:00Z')) / 864e5);
  const dayWords = s => { if (!isDay(s)) return ''; const d = new Date(String(s).slice(0, 10) + 'T12:00:00Z'); return d.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' }); };
  const short = iso => (Number.isFinite(Date.parse(iso || '')) ? dayWords(ymd(iso)) : '');

  /* the seven steps after the yes, in order; Before staffing is the first four */
  const COLS = [
    { k: 'agree', h: 'Agreement', job: 'Agreement not signed', btn: 'Agreement' },
    { k: 'setup', h: 'Client setup + billing', job: 'Setup + billing', btn: 'Set up' },
    { k: 'sched', h: 'Schedule + caregivers', job: 'Schedule + caregivers', btn: 'Confirm' },
    { k: 'axis', h: 'In AxisCare', job: 'Put in AxisCare', btn: 'Schedule' },
    { k: 'start', h: 'Confirm start', job: 'Start to confirm', btn: 'Confirm start' },
    { k: 'first', h: 'First shift', job: 'First shift', btn: 'First shift' },
    { k: 'follow', h: 'Next-day follow-up', job: 'Next-day call', btn: 'Call family' },
  ];
  const HOLD = { office: 'Office', family: 'Family', outside: 'Outside' };
  const PAY = { private: 'Private pay', va: 'VA', ltc: 'LTC insurance', guide: 'GUIDE', medicaid: 'Medicaid', other: 'Other' };

  /* ── which column a step belongs to ── */
  const NINE_COL = { 'soc.lead': 0, 'soc.assess': 0, 'soc.outcome': 0, 'soc.setup': 1, 'soc.confirm': 2, 'soc.axis': 3, 'soc.start': 4, 'soc.first': 5, 'soc.follow': 6 };
  const V1_STAGE_COL = { intake: 0, prechecks: 0, assessment: 0, signed: 0, axiscare: 1, billing: 1, schedule: 2, team: 2, ready: 4, firstweek: 5 };
  function colOfKey(key, stage, catalog) {
    const k = String(key || '');
    if (catalog === 'nine' && NINE_COL[k] != null) return NINE_COL[k];
    if (k === 'docs.agreement') return 0;
    if (/^(ax|pay)\./.test(k)) return 1;
    if (k === 'sched.axiscare') return 3;
    if (/^(sched|team)\./.test(k)) return 2;
    if (/^ready\./.test(k)) return 4;
    if (k === 'fw.first_visit') return 5;
    if (/^fw\./.test(k)) return 6;
    return V1_STAGE_COL[stage] != null ? V1_STAGE_COL[stage] : 0;
  }
  /* the older Start of Care checklist steps (SOC_PATHWAYS + SOC_MERGED, ids p0.. and m0..). Private pay: p1 provided and
     p2 received are the agreement; p3 upload, p4 billing, m0 care plan, m2 home safety are setup; m1 is the welcome call.
     The Medicaid pathways (no new ones) are all setup, except the welcome call (m3). */
  function socCol(pathway, id) {
    if (pathway === 'PP') return { p0: 0, p1: 0, p2: 0, m1: 4 }[id] != null ? { p0: 0, p1: 0, p2: 0, m1: 4 }[id] : 1;
    return id === 'm3' ? 4 : 1;
  }
  /* the older First shift checklist fields (client_queue) */
  const CQ_COLS = { 2: ['caregiver_assigned', 'caregiver_called', 'client_called'], 3: ['schedule_added', 'evv_verified'], 5: ['first_shift_done'], 6: ['followup_client_done', 'followup_caregiver_done'] };

  /* a free-text "Waiting on ..." from a journey step: the family, or someone outside (the VA, an insurer, the state) */
  function holdOf(text) {
    const t = String(text || '').toLowerCase();
    if (/\b(va|insur|ltc|state|dsds|medicaid|case manager|authori[sz]|hospital|doctor|physician|nurse|facility|rehab|guide|axiscare)\b/.test(t)) return 'outside';
    return 'family';
  }
  const leadOf = id => id != null && typeof DATA !== 'undefined' ? (DATA.leads || []).find(l => String(l.id) === String(id)) || null : null;
  function personFirst(e) {
    const x = String(e || '').toLowerCase().trim(); if (!x) return '';
    const p = (typeof OPS_PEOPLE !== 'undefined' && OPS_PEOPLE || []).find(q => String(q.primary_email || '').toLowerCase() === x);
    const n = p ? String(p.full_name || '').split(' ')[0] : x.split('@')[0];
    return n.charAt(0).toUpperCase() + n.slice(1);
  }
  const startOfLead = l => l && (isDay(l.target_start) ? l.target_start : isDay(l.desired_start) ? l.desired_start : '');

  /* ── each family's Client Care Agreement, read once per 5 minutes ── */
  const AG = {}; let agBusy = 0;
  function agOf(key, body) {
    const got = AG[key];
    if (got && (got.loading || Date.now() - got.at < 5 * 60e3)) return got;
    if (agBusy >= 4 || typeof callAction !== 'function') return got || { loading: true };
    AG[key] = Object.assign({}, got || {}, { loading: true }); agBusy++;
    callAction('client-agreement', Object.assign({ action: 'list' }, body)).then(r => {
      const list = (r && r.data && r.data.agreements) || [];
      const best = list.find(a => a.status === 'countersigned') || list.find(a => a.status === 'signed') || list.find(a => a.status === 'draft') || null;
      AG[key] = { at: Date.now(), status: best ? best.status : 'none', when: best ? (best.countersigned_at || best.signed_at || best.created_at) : null, home: !!(best && best.link && best.link.live) };
    }).catch(() => { AG[key] = { at: Date.now() - 4 * 60e3, status: 'unknown' }; })
      .finally(() => { agBusy--; redraw(); });
    return AG[key];
  }
  function agreementCell(key, body, current) {
    const a = agOf(key, body);
    if (a.loading) return { s: 'none', t: '…' };
    if (a.status === 'countersigned') return { s: 'ok', t: short(a.when) };
    if (a.status === 'signed') return { s: current ? 'todo' : 'wait', t: 'Countersign', hold: 'office' };
    if (a.status === 'draft') return { s: 'wait', t: a.home ? 'Sent to sign from home' : 'Started, not signed', hold: 'family' };
    if (a.status === 'none') return { s: 'todo', t: 'Start agreement', hold: 'office' };
    return { s: 'none', t: '?' };
  }

  /* ── the rows ── */
  function journeyRow(j) {
    const l = leadOf(j.lead_id), n = j.next;
    if (!n) return null;
    const col = colOfKey(n.key, j.stage, j.catalog), cells = COLS.map(() => ({ s: 'none' }));
    for (let i = 0; i < col; i++) cells[i] = { s: 'ok', t: '' };
    const label = COLS[col].btn, why = String(n.why || '');
    let hold = 'office', holdNote = '', late = false;
    if (j.stopped || n.status === 'blocked') { cells[col] = { s: 'late', t: label, d: 'Blocked' + (why ? ': ' + why : '') }; late = true; }
    else if (n.status === 'attention') { cells[col] = { s: 'late', t: label, d: why.replace(/\d{4}-\d{2}-\d{2}/g, dayWords) }; late = true; }
    else if (n.status === 'waiting') { const on_ = why.replace(/^Waiting( on)?\s*/i, '').replace(/ · back \d{4}-\d{2}-\d{2}.*/, ''); cells[col] = { s: 'wait', t: on_ || 'Waiting' }; hold = holdOf(on_); holdNote = 'Waiting on ' + (on_ || 'someone'); }
    else cells[col] = { s: 'todo', t: label };
    let job = COLS[col].k;
    /* the agreement: its own column, read from the tablet agreement (the nine-step setup checks it; v1 has its own step) */
    if ((l || j.axiscare_client_id) && j.catalog === 'nine' ? true : col <= 1 && (l || j.axiscare_client_id)) {
      const body = j.axiscare_client_id ? { client_ax: String(j.axiscare_client_id) } : { lead_id: String(j.lead_id) };
      const a = agreementCell('j' + j.journey_id, body, col === 0 || col === 1);
      /* past setup the agreement was checked there: only its signed date is added */
      if (col <= 1 || a.s === 'ok') cells[0] = a;
      if (col === 1 && a.s !== 'ok' && a.t !== '…' && a.t !== '?') { job = 'agree'; if (a.hold === 'family' && !late) { hold = 'family'; holdNote = a.t; } }
    }
    const go = "location.hash='#p/" + String(j.ref || '').replace(/[^\w:./-]/g, '') + '/start' + (n.key ? '/' + String(n.key).replace(/[^\w.]/g, '') : '') + "'";
    return { key: 'j' + j.journey_id, name: j.client_name || (l && typeof cpLeadClientName === 'function' ? cpLeadClientName(l) : 'Name not on file'), test: !!j.is_test,
      town: (l && l.client_city) || '', payer: j.payer || (l && l.funding_source) || '', owner: personFirst((n && n.owner) || j.assigned_cc),
      yes: l && l.said_yes_at ? short(l.said_yes_at) : '', start: isDay(j.target_start) ? j.target_start : startOfLead(l),
      cells, col, job, hold, holdNote, late, days: null, go };
  }
  function cqFill(cells, c) {
    let cur = -1;
    [2, 3, 5, 6].forEach(i => {
      const fs = CQ_COLS[i], done = fs.every(f => c[f]);
      if (done) { const ts = fs.map(f => c[f + '_at']).filter(Boolean).sort(); cells[i] = { s: 'ok', t: short(ts[ts.length - 1]) }; }
      else if (cur < 0) { cur = i; cells[i] = { s: 'todo', t: COLS[i].btn }; }
    });
    return cur;
  }
  function socRow(l, launch) {
    const soc = l.soc, pre = typeof socPreSteps === 'function' ? socPreSteps(soc) : (soc.steps || []);
    const cur = typeof socCurrentStep === 'function' ? socCurrentStep(soc) : null;
    const cells = COLS.map(() => ({ s: 'none' })), by = {};
    pre.forEach(s => { const c = socCol(soc.pathway, String(s.id)); (by[c] = by[c] || []).push(s); });
    let col = -1, hold = 'office', late = false, holdNote = '';
    Object.keys(by).map(Number).sort((a, b) => a - b).forEach(i => {
      const ss = by[i];
      if (ss.every(s => s.done_at)) { const ts = ss.map(s => s.done_at).sort(); cells[i] = { s: 'ok', t: short(ts[ts.length - 1]) }; }
      else if (cur && ss.indexOf(cur) > -1) {
        col = i;
        if (cur.role === 'family' || cur.role === 'state') { hold = cur.role === 'family' ? 'family' : 'outside'; holdNote = 'Waiting on: ' + cur.label; cells[i] = { s: 'wait', t: cur.role === 'family' ? 'Family' : 'The state' }; }
        else if (typeof socIsStuck === 'function' && socIsStuck(soc)) { late = true; cells[i] = { s: 'late', t: COLS[i].btn, d: (typeof socWaitingDays === 'function' ? socWaitingDays(soc) : '') + ' days' }; }
        else cells[i] = { s: 'todo', t: COLS[i].btn };
      }
    });
    if (launch) { const c2 = cqFill(cells, launch); if (col < 0) col = c2; }
    else if (col < 0) { col = 2; cells[2] = { s: 'todo', t: String(l.axiscare_client_id || '').trim() ? 'Ready for staffing' : 'Link AxisCare client' }; }
    /* a private-pay family's agreement comes from the tablet agreement when the checklist has not caught up */
    if (soc.pathway === 'PP' && cells[0].s !== 'ok') {
      const body = String(l.axiscare_client_id || '').trim() ? { client_ax: String(l.axiscare_client_id).trim() } : { lead_id: String(l.id) };
      const a = agreementCell('l' + l.id, body, col === 0); if (a.s === 'ok') cells[0] = a;
    }
    const days = typeof socWaitingDays === 'function' ? socWaitingDays(soc) : null;
    return { key: 'l' + l.id, name: typeof cpLeadClientName === 'function' ? cpLeadClientName(l) : ((l.client_first_name || l.first_name || '') + ' ' + (l.client_last_name || l.last_name || '')).trim(),
      town: l.client_city || '', payer: l.funding_source || (soc.pathway === 'PP' ? 'private' : 'medicaid'), owner: personFirst(l.assigned_coordinator) || '',
      yes: l.said_yes_at ? short(l.said_yes_at) : '', start: startOfLead(l) || (launch && isDay(launch.start_date) ? launch.start_date : ''),
      cells, col, job: COLS[Math.max(0, col)].k, hold, holdNote, late, days, old: true, go: "openLeadProfile('" + String(l.id).replace(/[^\w-]/g, '') + "','start')" };
  }
  function launchRow(c) {
    const cells = COLS.map(() => ({ s: 'none' })), col = cqFill(cells, c);
    const start = isDay(c.start_date) ? c.start_date : '';
    const late = !!(start && daysTo(start) < 0 && !c.first_shift_done);
    if (late && col >= 0) cells[col] = { s: 'late', t: COLS[col].btn, d: 'start date passed' };
    return { key: 'q' + c.id, name: c.client_name || 'Name not on file', town: '', payer: String(c.payer || '').toLowerCase().indexOf('va') === 0 ? 'va' : String(c.payer || '').toLowerCase().indexOf('private') > -1 ? 'private' : String(c.payer || '').toLowerCase().indexOf('medicaid') > -1 ? 'medicaid' : (c.payer ? 'other' : ''),
      owner: '', yes: '', start, cells, col: Math.max(0, col), job: COLS[Math.max(0, col)].k, hold: 'office', holdNote: '', late, days: null, old: true,
      go: "openClient({launch_id:'" + String(c.id).replace(/[^\w-]/g, '') + "'},'start')" };
  }
  /* everyone the two lists (or Starting care) show, once each */
  function model() {
    const jt = typeof cjTableRows === 'function' ? cjTableRows() : { rows: [], loaded: true };
    const js = (jt.rows || []).filter(j => { if (j.status !== 'open') return false; const l = leadOf(j.lead_id); return !j.lead_id || !l || !!l.said_yes_at || l.status === 'Converted'; });
    const rows = [], seenLead = new Set(), seenAx = new Set();
    js.forEach(j => { const r = journeyRow(j); if (!r) return; rows.push(r); if (j.lead_id) seenLead.add(String(j.lead_id)); if (j.axiscare_client_id) seenAx.add(String(j.axiscare_client_id)); });
    const cq = (window.__cqRows || []).filter(c => c && c.status !== 'complete' && !(typeof cjOwnsLaunch === 'function' && cjOwnsLaunch(c)));
    const used = new Set();
    const finished = l => typeof socBusinessReady === 'function' && socBusinessReady(l.soc) && !!(l.soc.launch_upserted_at || (l.soc.steps || []).some(s => typeof socIsLaunchStep === 'function' && socIsLaunchStep(l.soc.pathway, s.id)));
    (typeof DATA !== 'undefined' ? DATA.leads || [] : []).filter(l => l && l.soc && !l.soc.abandoned && !finished(l) && !seenLead.has(String(l.id))).forEach(l => {
      const ax = String(l.axiscare_client_id || '').trim();
      const launch = ax ? cq.find(c => !used.has(c.id) && String(c.axiscare_client_id || '').trim() === ax) : null;
      if (launch) used.add(launch.id);
      rows.push(socRow(l, launch)); seenLead.add(String(l.id)); if (ax) seenAx.add(ax);
    });
    cq.filter(c => !used.has(c.id) && !(c.axiscare_client_id && seenAx.has(String(c.axiscare_client_id)))).forEach(c => rows.push(launchRow(c)));
    rows.forEach(r => {
      const soon = isDay(r.start) ? daysTo(r.start) : null;
      r.soon = soon;
      r.startRed = soon != null && soon <= 3 && r.col < 5;
      r.urg = r.late || (soon != null && soon < 0 && r.col < 5) ? 'now' : r.startRed || r.job === 'first' ? 'today' : '';
    });
    rows.sort((a, b) => ({ now: 0, today: 1 }[a.urg] ?? 2) - ({ now: 0, today: 1 }[b.urg] ?? 2) || String(a.start || '9').localeCompare(String(b.start || '9')) || String(a.name).localeCompare(String(b.name)));
    return { rows, loaded: jt.loaded !== false && window.__cqRows !== undefined };
  }

  /* ── filters, remembered on this computer ── */
  const FK = 'grt_filter';
  let F = { job: null, hold: null, pay: null, tile: null, q: '' };
  try { const s = JSON.parse(localStorage.getItem(FK) || 'null'); if (s && typeof s === 'object') F = Object.assign(F, s, { q: '' }); } catch (e) { /* private window */ }
  const save = () => { try { localStorage.setItem(FK, JSON.stringify(Object.assign({}, F, { q: '' }))); } catch (e) { /* private window */ } };
  const TILES = { now: r => r.urg === 'now', today: r => r.urg === 'today', family: r => r.hold === 'family', outside: r => r.hold === 'outside', week: r => r.soon != null && r.soon >= 0 && r.soon <= 7 };
  const pass = (r, skip) => (skip === 'job' || !F.job || r.job === F.job) && (skip === 'hold' || !F.hold || r.hold === F.hold) && (skip === 'pay' || !F.pay || r.payer === F.pay)
    && (!F.tile || !TILES[F.tile] || TILES[F.tile](r)) && (!F.q || (r.name + ' ' + r.town).toLowerCase().indexOf(F.q.toLowerCase()) > -1);

  function cellHTML(c, r, i) {
    const hi = i === r.col ? ' obt-hi' : '';
    if (!c || c.s === 'none') return '<td class="' + hi.trim() + '"><span class="obt-none">' + (c && c.t ? esc(c.t) : '–') + '</span></td>';
    if (c.s === 'ok') return '<td class="' + hi.trim() + '"><span class="obt-ok">✓</span>' + (c.t ? ' <span class="field-note">' + esc(c.t) + '</span>' : '') + '</td>';
    if (c.s === 'wait') return '<td class="' + hi.trim() + '"><span class="obt-wait">' + esc(c.t) + '</span></td>';
    const b = '<button type="button" class="obt-b' + (c.s === 'late' ? ' obt-b-w' : '') + '" onclick="' + esc(r.go) + '">' + esc(c.t) + '</button>';
    return '<td class="' + hi.trim() + '">' + b + (c.s === 'late' && c.d ? '<div class="obt-late" style="white-space:normal;font-size:11.5px;max-width:160px">' + esc(c.d) + '</div>' : '') + '</td>';
  }
  function rowHTML(r) {
    const edge = r.urg === 'now' ? 'box-shadow:inset 3px 0 0 #B42318' : r.urg === 'today' ? 'box-shadow:inset 3px 0 0 #C99A2E' : '';
    return '<tr><td class="obt-n" style="' + edge + '"><button type="button" class="obt-name" onclick="' + esc(r.go) + '">' + esc(r.name) + (r.test ? ' <span class="cj-chip cj-s-exc">TEST</span>' : '') + '</button>'
      + '<div class="field-note" style="font-size:11.5px">' + esc([r.town, PAY[r.payer] || '', r.owner, r.yes ? 'said yes ' + r.yes : '', r.old ? 'older checklist' : ''].filter(Boolean).join(' · ')) + '</div></td>'
      + r.cells.map((c, i) => cellHTML(c, r, i)).join('')
      + '<td' + (r.startRed ? ' class="obt-warnt" style="font-weight:800"' : '') + '>' + (r.start ? esc(dayWords(r.start)) : '<span class="obt-none">not set</span>') + '</td>'
      + '<td><span class="obt-who obt-who-' + (r.hold === 'family' ? 'applicant' : r.hold) + '">' + HOLD[r.hold] + '</span>' + (r.holdNote ? '<div class="field-note" style="font-size:11.5px;white-space:normal;max-width:170px">' + esc(r.holdNote) + '</div>' : '') + '</td>'
      + '<td>' + (r.days == null ? '<span class="obt-none">–</span>' : r.days === 0 ? 'today' : r.days + (r.days === 1 ? ' day' : ' days')) + '</td></tr>';
  }
  function cardHTML(r) {
    const c = r.cells[r.col] || {};
    return '<div class="obt-card"' + (r.urg === 'now' ? ' style="box-shadow:inset 3px 0 0 #B42318"' : r.urg === 'today' ? ' style="box-shadow:inset 3px 0 0 #C99A2E"' : '') + '>'
      + '<div class="obt-card-top"><div><button type="button" class="obt-name" onclick="' + esc(r.go) + '">' + esc(r.name) + '</button><div class="field-note" style="font-size:11.5px">' + esc([r.town, PAY[r.payer] || '', r.owner].filter(Boolean).join(' · ')) + '</div></div>'
      + '<div class="obt-card-w' + (r.startRed ? ' obt-warnt' : '') + '">' + (r.start ? 'Start ' + esc(dayWords(r.start)) : 'No start date') + '</div></div>'
      + '<div class="obt-pms">' + COLS.map((k, i) => { const x = r.cells[i] || {}; const cls = x.s === 'ok' ? 'ok' : x.s === 'wait' ? 'wait' : x.s === 'late' ? 'late' : x.s === 'todo' ? 'todo' : ''; return '<span class="obt-pm' + (cls ? ' obt-pm-' + cls : '') + (i === r.col ? ' obt-pm-hi' : '') + '">' + esc(k.h) + '</span>'; }).join('') + '</div>'
      + '<div class="obt-card-b"><span class="obt-who obt-who-' + (r.hold === 'family' ? 'applicant' : r.hold) + '">' + HOLD[r.hold] + '</span>' + (r.holdNote ? '<span class="field-note">' + esc(r.holdNote) + '</span>' : '')
      + (c.s === 'todo' || c.s === 'late' ? '<button type="button" class="obt-b' + (c.s === 'late' ? ' obt-b-w' : '') + '" onclick="' + esc(r.go) + '">' + esc(c.t) + '</button>' : '<button type="button" class="obt-b obt-b-q" onclick="' + esc(r.go) + '">Open</button>') + '</div></div>';
  }
  function chipRow(label, key, labels, rows) {
    return '<div class="obt-qs"><span class="obt-ql">' + label + '</span>' + Object.keys(labels).map(k => {
      const n = rows.filter(r => (key === 'job' ? r.job : key === 'hold' ? r.hold : r.payer) === k && pass(r, key)).length;
      if (key === 'pay' && !n && F.pay !== k) return '';
      return '<button type="button" class="obt-q' + (F[key] === k ? ' obt-on' : '') + '" onclick="GRT.set(\'' + key + '\',\'' + k + '\')">' + esc(labels[k]) + ' <span>' + n + '</span></button>';
    }).join('') + '</div>';
  }
  /* the whole table, as one piece of HTML (Before staffing's list box, or Starting care on the Clients list) */
  function html() {
    const m = model(), rows = m.rows, list = rows.filter(r => pass(r));
    const jobs = {}; COLS.forEach(c => { jobs[c.k] = c.job; });
    const tile = (k, n, label, cls) => '<button type="button" class="obt-s ' + cls + (F.tile === k ? ' obt-on' : '') + '" onclick="GRT.set(\'tile\',\'' + k + '\')"><b>' + n + '</b><span>' + label + '</span></button>';
    const n = k => rows.filter(TILES[k]).length;
    const any = F.job || F.hold || F.pay || F.tile || F.q;
    return '<div class="grt" style="display:flex;flex-direction:column;gap:10px">'
      + (m.loaded ? '' : '<div class="field-note">Reading every family getting ready…</div>')
      + '<div class="obt-sum">' + tile('all', rows.length, 'families getting ready', 'obt-s-office') + tile('now', n('now'), 'need you now', 'obt-s-late') + tile('today', n('today'), 'today', 'obt-s-wait')
      + tile('family', n('family'), 'waiting on the family', 'obt-s-wait') + tile('outside', n('outside'), 'waiting on someone outside', 'obt-s-wait') + tile('week', n('week'), 'starting this week', 'obt-s-near') + '</div>'
      + chipRow('Who needs', 'job', jobs, rows) + chipRow('Holding up', 'hold', HOLD, rows) + chipRow('Payer', 'pay', PAY, rows)
      + '<div class="obt-qs"><span class="obt-ql">Find</span><input id="grtQ" type="search" placeholder="Name or town" value="' + esc(F.q) + '" oninput="GRT.find(this.value)" style="font:inherit;font-size:13px;padding:4px 10px;border:1px solid #d9d5ca;border-radius:8px;min-width:0;max-width:240px">'
      + (any ? '<button type="button" class="obt-q" onclick="GRT.clear()">Clear filters</button>' : '') + '</div>'
      + '<div class="obt-wrap"><table class="obt"><thead><tr><th class="obt-n">Family</th>' + COLS.map((c, i) => '<th' + (i === 4 ? ' style="border-left:2px solid #e4e1d8"' : '') + '>' + esc(c.h) + '</th>').join('') + '<th>Start date</th><th>Holding up</th><th>Days on this step</th></tr></thead><tbody>'
      + (list.length ? list.map(rowHTML).join('') : '<tr><td colspan="' + (COLS.length + 4) + '" class="obt-empty">' + (rows.length ? 'Nobody matches these filters.' : 'Nobody is getting ready right now. A family shows here once they say yes.') + '</td></tr>')
      + '</tbody></table></div>'
      + '<div class="obt-cards">' + (list.length ? list.map(cardHTML).join('') : '<div class="obt-empty">' + (rows.length ? 'Nobody matches these filters.' : 'Nobody is getting ready right now.') + '</div>') + '</div>'
      + '<div class="obt-key"><span><b style="color:#B42318">Red edge</b> needs you now</span>·<span><b style="color:#C99A2E">Gold edge</b> today</span>·<span>✓ done</span>·<span>Before staffing is the first four steps, First shift the last three</span>'
      + (typeof socFilter === 'function' ? '·<a href="javascript:void(0)" onclick="GRT.done()">Completed starts of care</a>' : '') + '</div></div>';
  }
  function redraw() {
    if (!on()) return;
    const had = document.activeElement && document.activeElement.id === 'grtQ', pos = had ? document.activeElement.selectionStart : 0;
    try {
      if (typeof activeTab !== 'undefined' && activeTab === 'soc' && typeof renderSocTab === 'function') renderSocTab();
      else if (typeof activeTab !== 'undefined' && activeTab === 'clientsboard' && typeof renderClientsBoard === 'function') renderClientsBoard();
    } catch (e) { /* the page redraws on its own next time */ }
    if (had) { const q = document.getElementById('grtQ'); if (q) { q.focus(); try { q.setSelectionRange(pos, pos); } catch (e) { /* ok */ } } }
  }
  /* Before staffing: the table instead of the checklist cards, with the old filters hidden (Completed stays one click away) */
  const TITLE = ['Getting ready', 'Every family who said yes, from the agreement to the next-day follow-up, one row each. Each step has its own column with its button in it. Pick a chip to see only one job, or who a family is waiting on.'];
  function heading(table) {
    const h = document.querySelector('#tab-soc h2'), n = h && h.parentElement && h.parentElement.querySelector('.field-note'); if (!h) return;
    if (!heading.was) heading.was = [h.textContent, n ? n.textContent : ''];
    const t = table ? TITLE : heading.was; h.textContent = t[0]; if (n) n.textContent = t[1];
  }
  function intoSoc(wrap) {
    const f = document.getElementById('socFilters'); if (f) f.style.display = 'none';
    heading(true);
    wrap.innerHTML = html();
  }
  window.GRT = {
    on, html, model, intoSoc, redraw, COLS, _AG: AG, _F: () => F,
    set(k, v) { F[k] = F[k] === v || (k === 'tile' && v === 'all') ? null : v; save(); redraw(); },
    find(v) { F.q = String(v || ''); clearTimeout(window.GRT._t); window.GRT._t = setTimeout(redraw, 150); },
    clear() { F = { job: null, hold: null, pay: null, tile: null, q: '' }; save(); redraw(); },
    heading,
    done() { const f = document.getElementById('socFilters'); if (f) f.style.display = ''; heading(false); const b = document.querySelector('#socFilters [data-sf="done"]'); if (typeof socFilter === 'function') socFilter('done', b); },
  };
})();

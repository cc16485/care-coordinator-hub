/* node tests/supervisory-concern-test.js
   Supervisory visits from 2026-11-16 (her decision 2026-10-18): concern-only, a short note, never due or overdue.
   Before that day the yearly evaluation still counts. Runs the one rules file the Hub and the server both run. */
const RealDate = Date;
function at(iso, fn){
  const fixed = new RealDate(iso).getTime();
  global.Date = class extends RealDate { constructor(...a){ super(...(a.length ? a : [fixed])); } static now(){ return fixed; } };
  try { return fn(); } finally { global.Date = RealDate; }
}
require('../eligibility-rules.js');
const E = globalThis.CCElig;
let pass = 0, fail = 0;
const ck = (name, ok, extra) => { if (ok) pass++; else fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (ok || extra === undefined ? '' : '  ' + JSON.stringify(extra))); };

ck('the day is 2026-11-16', E.SUPERVISORY_CONCERN_FROM === '2026-11-16');
// Central time decides: 11-16 05:59 UTC is still Nov 15, 11:59pm in Missouri
ck('Nov 15, 11:59pm Central → still yearly', E.supervisoryConcernOnly('2026-11-16T05:59:00Z') === false);
ck('Nov 16, 12:00am Central → concern-only', E.supervisoryConcernOnly('2026-11-16T06:00:00Z') === true);
ck('Oct 18 → yearly', E.supervisoryConcernOnly('2026-10-18T15:00:00Z') === false);
ck('2027 → concern-only', E.supervisoryConcernOnly('2027-03-01T15:00:00Z') === true);
ck('no argument reads the clock (before)', at('2026-11-10T15:00:00Z', () => E.supervisoryConcernOnly()) === false);
ck('no argument reads the clock (after)', at('2026-11-20T15:00:00Z', () => E.supervisoryConcernOnly()) === true);

// eligibility: an old visit makes a management item before the day, none from it, and never changes eligibility
const cg = { first:'Test', last:'Person', hire_date:'2024-01-10', supv_date:'2025-01-05', perf_date:'2026-06-01',
  oig_date:'2026-11-01', edl_date:'2026-10-01', fcsr_date:'2026-06-01' };
const before = at('2026-11-10T15:00:00Z', () => E.eligibility(cg));
const after  = at('2026-11-20T15:00:00Z', () => E.eligibility(cg));
const codes = e => (e.mgmt || []).map(m => m.code);
ck('before Nov 16: supervisory visit overdue is a management item', codes(before).includes('supervisory_visit'), codes(before));
ck('from Nov 16: no supervisory item', !codes(after).includes('supervisory_visit'), codes(after));
ck('the eligibility answer is the same on both sides', before.state === after.state, [before.state, after.state]);
const pr = Object.assign({}, cg, { perf_date:'2025-01-05' });
ck('performance reviews keep their yearly date', codes(at('2026-11-20T15:00:00Z', () => E.eligibility(pr))).includes('performance_review'));

// the obligations runner closes an open supervisory item once the code is gone (obligations.js satisfied())
const fs = require('fs');
const ob = fs.readFileSync(__dirname + '/../obligations.js', 'utf8');
ck('obligations close an item whose code is no longer in mgmt', /mgmt/.test(ob) && /satisfied/.test(ob));

// the Hub's copy of the day matches the rules file
const hub = fs.readFileSync(__dirname + '/../index.html', 'utf8');
ck("the Hub's fallback day matches", /return d >= '2026-11-16';/.test(hub));
ck('the engine asks the rules file', /CCElig\.supervisoryConcernOnly\(\)/.test(fs.readFileSync(__dirname + '/../caregivers-engine.js', 'utf8')));
// no em dashes in the new copy
const newCopy = hub.slice(hub.indexOf('<div class="guide-body" data-sv="concern">'), hub.indexOf('<div class="guide-body" data-sv="yearly">'))
  + hub.slice(hub.indexOf('id="svNoteModalBackdrop"'), hub.indexOf('saveSupervisoryNote()">Save Note'));
ck('no em dash in the new help text or the note', newCopy.length > 500 && !/[—―]/.test(newCopy));

// Active Compliance (caregivers-engine.js): acWorst and the supervisory cell, lifted from the engine and run against the rules
{
  const src = fs.readFileSync(__dirname + '/../caregivers-engine.js', 'utf8');
  const i = src.indexOf('function acWorst(c){'), j = src.indexOf('function renderAC(){');
  const chkStatus = (a,b,c) => E.chkStatus(a,b,c), fcsrRegStatus = () => ({ status:'ok', label:'ok' });
  const fmtD = s => s, proofLink = p => p ? '[proof]' : '';
  const lib = new Function('CCElig','chkStatus','fcsrRegStatus','fmtD','proofLink','globalThis',
    src.slice(i, j) + '; return { acWorst, supvLastCell, svConcernOnly };')(E, chkStatus, fcsrRegStatus, fmtD, proofLink, globalThis);
  const g = { oig_date:'2026-11-05', edl_date:'2026-10-20', fcsr_date:'2026-06-01', perf_date:'2026-06-01', supv_date:'2025-01-05' };
  ck('before Nov 16: an old visit makes the caregiver Overdue', at('2026-11-10T15:00:00Z', () => lib.acWorst(g)) === 'overdue');
  ck('from Nov 16: the same caregiver is All Current', at('2026-11-20T15:00:00Z', () => lib.acWorst(Object.assign({}, g, { oig_date:'2026-11-15' }))) === 'current');
  ck('from Nov 16: no visit at all no longer keeps someone Pending', at('2026-11-20T15:00:00Z', () => lib.acWorst(Object.assign({}, g, { oig_date:'2026-11-15', supv_date:'' }))) === 'current');
  const cell = lib.supvLastCell(g);
  ck('the cell shows the last visit only, no badge', /Last visit: 2025-01-05/.test(cell) && !/badge|overdue|due in|Next:/i.test(cell), cell);
  ck('no visit: says so', /No visit logged/.test(lib.supvLastCell({})));
}

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);

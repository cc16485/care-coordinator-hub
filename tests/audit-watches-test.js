/* node tests/audit-watches-test.js
   SLICE 6 (Samantha "yes to all", 2026-10-10): the expiry watches in the one eligibility rules file: OIG monthly (HHS-OIG
   2013 bulletin, Missouri MMAC), the five annual in-service hours as a task, typed credential expiries (CNA, driver's
   license, auto insurance) as tasks, never a work restriction. */
require('../eligibility-rules.js');
const F = require('./eligibility-fixtures.js');
const E = globalThis.CCElig;
let pass = 0, fail = 0;
const ck = (name, ok, extra) => { if (ok) pass++; else fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (ok || extra === undefined ? '' : '  ' + JSON.stringify(extra))); };
const iso = d => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);
const clean = F.PROFILE_FIXTURES ? null : null;
const base = () => Object.assign({ r1s: 'Positive', r2s: 'Positive', oig: 'CLEAR', edl: 'Clear', fcsr: 'Clear', oig_date: iso(-10), edl_date: iso(-10), fcsr_date: iso(-10), fcsr_reg_date: iso(-400),
  orient_date: iso(-400), alz_date: iso(-400), hire_date: iso(-500), ojt_date: iso(-390), ojt_signed: 'yes', ojt_online: iso(-390), annual_date: iso(-30), annual_hrs: '6', supv_date: iso(-10), perf_date: iso(-10), th_synced: iso(-1) });
const codes = e => e.reasons.concat(e.tasks).map(r => r.code);
let e = E.eligibility(base());
ck('6 · the clean caregiver is eligible with no tasks', e.state === 'eligible' && !e.tasks.length, { state: e.state, tasks: e.tasks });
e = E.eligibility(Object.assign(base(), { oig_date: iso(-31) }));
ck('6 · OIG 31 days old = overdue (monthly), a lapse that says monthly, agency policy', e.state === 'lapsed' && e.lapses.some(l => l.code === 'oig_expired' && /monthly, agency policy/.test(l.why)), e.lapses);
e = E.eligibility(Object.assign(base(), { oig_date: iso(-29) }));
ck('6 · OIG 29 days old is still current', e.state === 'eligible', e.lapses);
ck('6 · the OIG warning window is 7 days', E.eligibilityFacts(Object.assign(base(), { oig_date: iso(-25) })).oig.status === 'Due Soon' && E.eligibilityFacts(Object.assign(base(), { oig_date: iso(-20) })).oig.status === 'Current');
e = E.eligibility(Object.assign(base(), { annual_hrs: '3' }));
ck('6 · annual hours 3 of 5 after year one: a task, not a lapse, still eligible', e.state === 'eligible' && e.tasks.some(t => t.code === 'annual_hours' && /3 of 5/.test(t.why)) && !e.lapses.length, e.tasks);
e = E.eligibility(Object.assign(base(), { annual_hrs: '' }));
ck('6 · blank hours are not judged', !e.tasks.some(t => t.code === 'annual_hours'));
e = E.eligibility(Object.assign(base(), { hire_date: iso(-100), annual_date: '', annual_hrs: '2' }));
ck('6 · in year one the hours are not judged either', !e.tasks.some(t => t.code === 'annual_hours') && e.state === 'eligible', { state: e.state, tasks: e.tasks });
e = E.eligibility(Object.assign(base(), { cna_expires: iso(-3) }));
ck('6 · an expired CNA credential: a high task (agency), eligible, no restriction', e.state === 'eligible' && e.tasks.some(t => t.code === 'cna_expired' && t.high && t.kind === E.ELIG_AGENCY && /CNA credential expired/.test(t.why)) && !e.restricted, e.tasks);
e = E.eligibility(Object.assign(base(), { dl_expires: iso(20), auto_ins_expires: iso(90) }));
ck("6 · a driver's license expiring in 20 days: a due task; insurance 90 days out: nothing yet", e.tasks.some(t => t.code === 'dl_due' && /20 days/.test(t.why)) && !e.tasks.some(t => /auto_ins/.test(t.code)), e.tasks);
e = E.eligibility(Object.assign(base(), { auto_ins_expires: iso(-1) }));
ck('6 · expired auto insurance: a high task with the date', e.tasks.some(t => t.code === 'auto_ins_expired' && t.due === iso(-1)), e.tasks);
ck('6 · no em dash in any new wording', !/[—]/.test(JSON.stringify(E.eligibility(Object.assign(base(), { cna_expires: iso(-3), dl_expires: iso(2), annual_hrs: '1', oig_date: iso(-40) })))));
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);

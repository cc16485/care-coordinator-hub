/* node tests/relationship-rules-test.js — relationship-rules.js (Care Coordinator Leads and Bonus, Stage 3, policy approved
   2026-10-18): the 7-day and 30-day relationship calls after the first visit, one at a time, stopped when care stops. */
require('../lead-rules.js');
const R = require('../relationship-rules.js');
let pass = 0, fail = 0; const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 600))); };
const L = (o) => Object.assign({ id:'c1', first_name:'Dee', status:'Converted', assigned_coordinator:'Krystal', first_shift_at:'2026-11-02T14:00:00Z' }, o || {});
ck('switch · on only when exactly true; since read as a Central day', R.on({ relationship_calls_live:true }) && !R.on({ relationship_calls_live:'yes' }) && R.since({ relationship_calls_live_since:'2026-11-01T05:30:00Z' }) === '2026-11-01');
ck('no first visit → nothing', R.nextCall(L({ first_shift_at:null }), { today:'2026-11-05' }) === null);
ck('day 1 → nothing yet (the welcome call is the journey’s)', R.nextCall(L(), { today:'2026-11-03' }) === null);
const d7 = R.nextCall(L(), { today:'2026-11-04' });
ck('day 2 → the 7-day call opens, due Nov 9', d7 && d7.key === 'day7' && d7.due === '2026-11-09' && !d7.late, d7);
ck('day 8 → the 7-day call is late', R.nextCall(L(), { today:'2026-11-10' }).late === true);
const l = L(); R.record(l, 'day7', { outcome:'no_answer', by:'k@mo-care.com', by_name:'Krystal Land', owner:'Krystal Land' });
ck('a call that reached nobody is recorded; the 7-day call stays open', R.nextCall(l, { today:'2026-11-06' }).key === 'day7' && R.nextCall(l, { today:'2026-11-06' }).attempts === 1);
ck('the 30-day call waits for the 7-day call (one at a time), even on day 28', R.nextCall(l, { today:'2026-11-30' }).key === 'day7');
R.record(l, 'day7', { outcome:'talked', note:'going well', by:'a@mo-care.com', by_name:'Angiel Rose', owner:'Krystal Land' });
ck('7-day logged: nothing until day 25', R.nextCall(l, { today:'2026-11-20' }) === null);
ck('the log says Angiel helped and it stays Krystal’s family', /Angiel helped; it stays Krystal’s family/.test(l.comm_log.at(-1).body) && l.relationship_calls.at(-1).by === 'a@mo-care.com', l.comm_log.at(-1));
const d30 = R.nextCall(l, { today:'2026-11-27' });
ck('day 25 → the 30-day call opens, due Dec 2', d30 && d30.key === 'day30' && d30.due === '2026-12-02', d30);
R.record(l, 'day30', { outcome:'talked', note:'happy' });
ck('both logged → nothing more', R.nextCall(l, { today:'2026-12-05' }) === null);
ck('care stopped: journey closed, lost or archived → nothing', R.nextCall(L(), { today:'2026-11-05', journey:{ status:'closed' } }) === null
  && R.nextCall(L({ status:'Lost' }), { today:'2026-11-05' }) === null && R.nextCall(L({ archived:true }), { today:'2026-11-05' }) === null);
ck('a first visit before the switch went on → nothing (no flood of late cards)', R.nextCall(L(), { today:'2026-11-05', since:'2026-11-03' }) === null && !!R.nextCall(L(), { today:'2026-11-05', since:'2026-11-02' }));
ck('record refuses an unknown call or outcome', R.record(L(), 'day99', { outcome:'talked' }) === null && R.record(L(), 'day7', { outcome:'maybe' }) === null);
ck('never a supervisory word in what it writes', !/supervis/i.test(JSON.stringify(l.relationship_calls) + JSON.stringify(l.comm_log)));
console.log(pass + ' passed, ' + fail + ' failed');
process.exitCode = fail ? 1 : 0;

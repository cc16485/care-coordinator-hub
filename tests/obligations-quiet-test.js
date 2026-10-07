/* node tests/obligations-quiet-test.js · Pause care / End care (2026-10-07): the check-in rule gives a paused or ended client
   no check-in work (d.quiet_clients), and gives it back once they are no longer quiet. The real obligations.js. */
global.window = global; require('../obligations.js'); const O = global.CCOblig;
let pass = 0, fail = 0; const ck = (n, c, x) => { c ? pass++ : fail++; console.log((c ? 'PASS  ' : 'FAIL  ') + n + (c ? '' : '  ' + JSON.stringify(x).slice(0, 400))); };
const data = { client_checkins: [{ id: 'ci1', client_name: 'Rhoda Real', axiscare_client_id: '777', next_checkin_due: '2026-10-01', checkin_date: '2026-09-01', coordinator: 'krystal@mo-care.com' },
  { id: 'ci2', client_name: 'Ann Active', axiscare_client_id: '888', next_checkin_due: '2026-10-01', checkin_date: '2026-09-01', coordinator: 'krystal@mo-care.com' }], caregivers: [] };
const run = (quiet, items) => O.evaluate({ data: Object.assign({}, data, { quiet_clients: quiet }), items: items || [], today: '2026-10-07', resolveOwner: (v) => v || 'krystal@mo-care.com', domainOwner: () => 'sam@mo-care.com' });
let r = run([]);
ck('nobody quiet: both clients get their check-in', r.create.filter((x) => /^ops_ci_/.test(x.id)).length === 2, r.create.map((x) => x.id));
r = run(['777']);
ck('Rhoda paused or ended: only Ann gets a check-in', r.create.filter((x) => /^ops_ci_/.test(x.id)).map((x) => x.about).join() === 'Ann Active', r.create.map((x) => x.about));
const openRhoda = { id: 'ops_ci_ci1_2026-10-01', status: 'open', source: { type: 'client_checkins', id: 'ci1' } };
r = run(['777'], [openRhoda]);
ck('...an open check-in for her would be put away (it no longer applies while quiet)', r.stale.some((x) => x.item.id === openRhoda.id), r.stale);
r = run([], [Object.assign({}, openRhoda)]);
ck('resumed: her check-in is wanted again (the one set aside at the pause comes back and is kept)', !r.stale.some((x) => x.item.id === openRhoda.id) && !r.create.some((x) => x.id === openRhoda.id), [r.stale, r.create.map((x) => x.id)]);
console.log(`\n${pass} passed, ${fail} failed`); process.exitCode = fail ? 1 : 0;

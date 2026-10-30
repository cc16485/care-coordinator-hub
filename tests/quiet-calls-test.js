/* node tests/quiet-calls-test.js
   QUIETER CALL READER (2026-10-29, plan M2yJiaLMGCekNzZrL6WdT6, Samantha approved with all three recommendations). The pure
   rules in team-work.js and my-work-tiers.js on made-up cards: while ops_settings.quiet_calls_live is on, a call follow-up
   stays in Team Work only as a promise not kept, a call nobody could read, or care at risk; every other call card stays
   with its owner and is a Hub reminder. Off: nothing changes. */
const path = require('path');
const TW = require(path.join(__dirname, '..', 'team-work.js'));
const MWT = require(path.join(__dirname, '..', 'my-work-tiers.js'));
let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 700))); };
const K = 'krystal@mo-care.com';
const now = Date.parse('2026-10-29T14:00:00-05:00');
const ctx = (on) => ({ now, settings: on ? { quiet_calls_live: true } : {}, staff: [], coordinators: [K], shiftEnd: () => null, nextShift: () => null,
  familyCC: () => '', minsToShift: it => it._mins == null ? null : it._mins });
const card = (id, o) => Object.assign({ id, kind: 'call_followup', opened_by: 'call-tasks', created_by: 'call-tasks', status: 'open', owner: K, urgency: 'normal',
  domain: 'scheduling_coverage', due: new Date(now + 36e5).toISOString(), created_at: new Date(now - 36e5).toISOString() }, o);

const sched = card('cf_a_0', { title: 'Put Mary on April\'s visits' });
const file = card('cf_b_0', { title: 'Update Kyra\'s file', domain: 'program_administration', urgency: 'today' });
const prom = card('cfp_c_0', { title: 'Promise not kept yet: call the family back', urgency: 'today' });
const unread = card('cfu_d_0', { title: 'A call nobody could read' });
const fall = card('cf_e_0', { title: 'Record Dan\'s head bump', domain: 'incidents', urgency: 'today' });
const cond = card('cf_f_0', { title: 'Check on Carol\'s new confusion', domain: 'client_care', urgency: 'today' });
const careNormal = card('cf_g_0', { title: 'Send Carol\'s daughter the care plan', domain: 'client_care', urgency: 'normal' });
const urgent = card('cf_h_0', { title: 'Find someone for tonight', urgency: 'urgent' });
const soon = card('cf_i_0', { title: 'Visit in 2 hours with nobody', _mins: 120 });
const cover = { id: 'ops_cov_1', kind: 'coverage', opened_by: 'callout', status: 'open', owner: K, title: 'Call-off', created_at: sched.created_at };

/* off: exactly as before */
ck('off: every call card is still Team Work', [sched, file, prom, unread, fall, cond, careNormal, urgent].every(c => TW.place(c, ctx(false)).tab === 'team'));
ck('off: quietCall is never true', [sched, file, careNormal].every(c => !TW.quietCall(c, ctx(false))));
ck('off: a call-off card is unchanged', TW.place(cover, ctx(false)).tab === 'team');

/* on */
const on = ctx(true);
ck('on: ordinary call cards leave Team Work and stay with their owner', [sched, file, careNormal].every(c => { const p = TW.place(c, on); return p.tab === 'mine' && p.person === K; }),
  [sched, file, careNormal].map(c => TW.place(c, on)));
ck('on: a promise not kept stays in Team Work', TW.place(prom, on).tab === 'team');
ck('on: a call nobody could read stays in Team Work', TW.place(unread, on).tab === 'team');
ck('on: a fall or injury (incident) stays in Team Work', TW.place(fall, on).tab === 'team');
ck('on: a change in a client\'s condition (client care for today) stays (decision 3)', TW.place(cond, on).tab === 'team');
ck('on: anything urgent stays', TW.place(urgent, on).tab === 'team');
ck('on: a visit within the care-at-risk window stays', TW.place(soon, on).tab === 'team');
ck('on: other Team Work cards (call-offs) are not touched', TW.place(cover, on).tab === 'team' && !TW.quietCall(cover, on));
ck('on: a card someone already took stays theirs', TW.place(Object.assign({}, sched, { claimed_by: 'angiel@mo-care.com' }), on).person === 'angiel@mo-care.com');
ck('on: a card nobody owns is unassigned, never lost', TW.place(Object.assign({}, sched, { owner: '' }), on).tab === 'unassigned');
ck('callKept: the same list the server uses', TW.callKept(prom) && TW.callKept(unread) && TW.callKept(fall) && TW.callKept(cond) && TW.callKept(urgent) && !TW.callKept(sched) && !TW.callKept(careNormal));

/* My Work: the quiet ones are Hub reminders (one "From calls" line), never in the red number */
const q = c => TW.quietCall(c, on);
ck('My Work: a quiet call card is a Hub reminder', MWT.tierOf(sched, q) === 'rem' && MWT.tierOf(file, q) === 'rem');
ck('My Work: without the switch it is a task, as before', MWT.tierOf(sched) === 'tasks' && MWT.tierOf(sched, c => TW.quietCall(c, ctx(false))) === 'tasks');
ck('My Work: a promise or care card taken from Team Work stays a task', MWT.tierOf(prom, q) === 'tasks' && MWT.tierOf(fall, q) === 'tasks');
ck('My Work: confidential cards are never reminders', MWT.tierOf(Object.assign({}, sched, { sensitive: true }), q) === 'tasks');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

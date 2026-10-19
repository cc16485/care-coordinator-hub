/* node tests/my-work-tiers-test.js
   My Work tiers (Stage 2 of the My Work and Team Work plan, Samantha approved 2026-10-18 with all four recommendations).
   Where every kind of card goes, and the order inside a group. Made-up cards only. */
const path = require('path');
const T = require(path.join(__dirname, '..', 'my-work-tiers.js'));
let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 500))); };
const t = o => T.tierOf(Object.assign({ status:'open' }, o));

ck('the four groups, in order', T.TIERS.map(x => x.name).join(' | ') === 'Relationship builders | Your leads | Your clients and tasks | Hub reminders');
ck('her why lines, word for word', T.TIERS[0].why === 'Your calls with families. This is how they learn they can count on you, and it’s what keeps them with us.'
  && T.TIERS[1].why === 'Families deciding whether to choose us. A quick, kind follow-up is often what makes the difference.');

/* Relationship builders */
ck('7-day / 30-day relationship call: Relationship builders', t({ kind:'relationship_call', opened_by:'system' }) === 'rel');
ck('welcome call (journey step fw.family): Relationship builders', t({ kind:'journey', step_key:'fw.family' }) === 'rel');
/* Your leads */
ck('inquiry card (ops_lead_): Your leads', t({ id:'ops_lead_9', kind:'new_lead', opened_by:'system' }) === 'leads');
ck('New family? call card: Your leads', t({ kind:'new_family_call' }) === 'leads');
ck('journey lead step (soc.lead): Your leads', t({ kind:'journey', step_key:'soc.lead' }) === 'leads');
/* Your clients and tasks */
ck('other journey steps (assessment, payer): Your clients and tasks', t({ kind:'journey', step_key:'soc.assess' }) === 'tasks' && t({ kind:'journey', step_key:'intake.payer' }) === 'tasks');
ck('work a person gave you: tasks', t({ kind:'request', opened_by:'person' }) === 'tasks');
ck('project, review: tasks', t({ kind:'project' }) === 'tasks' && t({ kind:'review' }) === 'tasks');
ck('coaching and attendance (HR path): tasks, never a reminder', t({ kind:'coaching' }) === 'tasks' && t({ kind:'staffing_issue', opened_by:'attendance-threshold' }) === 'tasks');
ck('a failed text or email: tasks, never a reminder (no silent failures)', t({ kind:'send_problem', opened_by:'send-problems' }) === 'tasks');
ck('anything unknown: tasks (reminders are an allowlist)', t({ kind:'something_new', opened_by:'some-watch' }) === 'tasks');
/* Hub reminders */
ck('yellow shift-note flag: reminder', t({ kind:'care_note', opened_by:'care-note-flag', urgency:'high' }) === 'rem');
ck('red shift-note flag (urgent), if ever someone\'s own: a task, not a reminder', t({ kind:'care_note', opened_by:'care-note-flag', urgency:'urgent' }) === 'tasks');
ck('care packet not confirmed: reminder', t({ kind:'care_packet_unconfirmed', opened_by:'care-packet-watch' }) === 'rem');
ck('plan recheck: reminder', t({ kind:'plan_recheck' }) === 'rem');
ck('saved for future check-back: reminder', t({ kind:'future_check_back', opened_by:'system' }) === 'rem');

/* order inside a group: late, due today, coming up, no date */
const now = Date.now(), e = new Date(); e.setHours(23, 59, 59, 999);
const H = h => new Date(now + h * 36e5).toISOString();
const list = [{ id:'later', due:H(72) }, { id:'nodate' }, { id:'today', due:new Date(Math.min(now + 36e5, e.getTime() - 1000)).toISOString() }, { id:'late', due:H(-5) }];
ck('order: late, due today, coming up, no date', T.sortTier(list, now, e.getTime()).map(x => x.id).join() === 'late,today,later,nodate', T.sortTier(list, now, e.getTime()).map(x => x.id));
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);

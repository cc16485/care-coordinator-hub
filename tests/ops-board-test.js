/* node tests/ops-board-test.js — ops-board.js (2026-11-05, her six picks): what counts as care or safety, who and what a
   row is, when it is, what Do it says, what the Board cleanup may clear, and what the board opens on. */
const B = require('../ops-board.js');
let pass = 0, fail = 0; const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 500))); };
const now = new Date(2026, 10, 5, 15, 0, 0).getTime(), D = 864e5, iso = t => new Date(t).toISOString();
ck('off unless the switch is exactly on', !B.liveOn({}) && !B.liveOn({ ops_board_live:'yes' }) && B.liveOn({ ops_board_live:true }));
ck('older views: shown with no stamp, for 7 days after it was turned on, then gone',
  B.olderViews({}, now) && B.olderViews({ ops_board_live_since:iso(now - 6 * D) }, now) && !B.olderViews({ ops_board_live_since:iso(now - 8 * D) }, now));
ck('care or safety: urgent, an incident, escalated, an urgent escalation, or the Team Work care-at-risk track',
  B.care({ urgency:'urgent' }) && B.care({ domain:'incidents' }) && B.care({ sub_state:'escalated' }) && B.care({ escalation:{ level:'urgent' } }) && B.care({}, true));
ck('not care or safety: a cleared escalation, an ordinary card', !B.care({ escalation:{ level:'urgent', cleared_at:'x' } }) && !B.care({ urgency:'today', domain:'money' }));
ck('a red shift-note flag (urgent) is care or safety', B.needOf({ kind:'care_note', urgency:'urgent', domain:'client_care' }) === 'care');
ck('a yellow shift-note flag is not', B.needOf({ kind:'care_note', urgency:'normal', domain:'client_care' }) !== 'care');
ck('need: a call card is Call or text back; an open shift is Scheduling; Step 1 is Hiring; a welcome is Family start',
  B.needOf({ kind:'call_followup', domain:'money' }) === 'call' && B.needOf({ kind:'coverage', urgency:'high', domain:'scheduling_coverage' }) === 'schedule'
  && B.needOf({ kind:'step1_countersign' }) === 'hiring' && B.needOf({ kind:'family_welcome' }) === 'start' && B.needOf({ kind:'review' }) === 'review' && B.needOf({ kind:'request' }) === 'other');
ck('who: applicant, lead, family, caregiver, office',
  B.whoOf({ kind:'step1_complete' }) === 'applicant' && B.whoOf({ kind:'new_family_call' }) === 'lead' && B.whoOf({ kind:'call_followup', client_ax:'12' }) === 'family'
  && B.whoOf({ kind:'call_followup', caregiver_ax:'9', domain:'money' }) === 'caregiver' && B.whoOf({ kind:'request' }) === 'office');
ck('when: yesterday is Late, tonight is Today, tomorrow is Later, parked is Later, no due day is Today',
  B.whenOf({ due:iso(now - D) }, now) === 'late' && B.whenOf({ due:iso(now + 3 * 36e5) }, now) === 'today' && B.whenOf({ due:iso(now + D) }, now) === 'later'
  && B.whenOf({ due:iso(now - D) }, now, true) === 'later' && B.whenOf({}, now) === 'today');
ck('Do it says what you will do', B.doWord({ kind:'care_note', owner:'a' }) === 'Read the note' && B.doWord({ kind:'coverage', owner:'a' }) === 'Find cover'
  && B.doWord({ kind:'step1_countersign', owner:'a' }) === 'Countersign' && B.doWord({ kind:'request' }) === 'Take a look' && B.doWord({ kind:'request', owner:'a' }) === 'Open');
const old = { status:'open', kind:'call_followup', id:'cf_1', due:iso(now - 8 * D) };
ck('cleanup: 8 days past its day may be cleared', B.cleanable(old, now));
ck('cleanup: 6 days past its day stays', !B.cleanable(Object.assign({}, old, { due:iso(now - 6 * D) }), now));
ck('cleanup: never care or safety', !B.cleanable(Object.assign({}, old, { urgency:'urgent' }), now) && !B.cleanable(old, now, true));
ck('cleanup: never a promise made on a call, or a call nobody could read', !B.cleanable(Object.assign({}, old, { id:'cfp_9' }), now) && !B.cleanable(Object.assign({}, old, { id:'cfu_9' }), now));
ck('cleanup: never a journey step or a project, never a closed card', !B.cleanable(Object.assign({}, old, { kind:'journey' }), now) && !B.cleanable(Object.assign({}, old, { kind:'project' }), now) && !B.cleanable(Object.assign({}, old, { status:'done' }), now));
ck('cleanup: with no due day, counts from when it was made', B.cleanable({ status:'open', kind:'request', id:'r', created_at:iso(now - 9 * D) }, now));
ck('opens on: mine, plus care or safety nobody has; not someone else\'s, not nobody\'s ordinary work',
  B.startView({ mine:true, owner:'me', need:'other' }) && B.startView({ mine:false, owner:'', need:'care' }) && !B.startView({ mine:false, owner:'k', need:'care' }) && !B.startView({ mine:false, owner:'', need:'other' }));
ck('the words', B.NEED.care === 'Care or safety' && B.NEED.approval === 'Approval' && B.WHO.family === 'Family or client');
const words = Object.values(B.NEED).concat(Object.values(B.WHO)).join(' ');
ck('no em dashes', !/—/.test(require('fs').readFileSync(__dirname + '/../ops-board.js', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')) && !/—/.test(words));
console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);

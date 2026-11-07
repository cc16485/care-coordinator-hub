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
ck('right now: an urgent card due 3 hours ago is care or safety', B.needOf({ kind:'call_followup', urgency:'urgent' }, false, now, false) === 'care' && B.careNow({ urgency:'urgent', due:iso(now - 3 * 36e5) }, false, now, false));
ck('right now: an urgent card 3 weeks late is late work, not care or safety', !B.careNow({ urgency:'urgent', due:iso(now - 21 * D) }, false, now, false) && B.needOf({ kind:'call_followup', urgency:'urgent', domain:'scheduling_coverage', due:iso(now - 21 * D) }, false, now, false) === 'call');
ck('right now: past its day is not care or safety; the Team Work care-at-risk track always is', !B.careNow({ urgency:'urgent', due:iso(now) }, false, now, true) && B.careNow({ due:iso(now - 21 * D) }, true, now, false));
ck('an old red shift-note flag shows as a Shift-note flag', B.needOf({ kind:'care_note', urgency:'urgent', domain:'client_care', due:iso(now - 11 * D) }, false, now, false) === 'note' && B.NEED.note === 'Shift-note flag');
ck('the cleanup still never clears an old urgent card', !B.cleanable({ status:'open', kind:'call_followup', id:'x', urgency:'urgent', due:iso(now - 21 * D) }, now));
ck('the words', B.NEED.care === 'Care or safety' && B.NEED.approval === 'Approval' && B.WHO.family === 'Family or client');
/* the new layout (2026-11-07, "Approve all picks") */
ck('new layout: off unless its own switch is exactly on', !B.lanesOn({}) && !B.lanesOn({ ops_board_live:true }) && B.lanesOn({ ops_board_lanes_live:true }));
ck('Waiting on us: a Follow-ups row, a missed call, a new family call', ['reply_needed','missed_call','new_family_call'].every(k => B.laneOf({ kind:k, created_at:iso(now - 30 * D) }, { need:'call' }, now) === 'wait'));
ck('Waiting on us: call cards that promise to get back to a person',
  B.waitPromise({ kind:'call_followup', title:'Text Example the address for Monday' }) && B.waitPromise({ kind:'call_followup', title:'Check the approval Tuesday; update Example' })
  && B.waitPromise({ kind:'call_followup', title:'Resend the reference email' }) && B.waitPromise({ kind:'call_followup', title:'x', next_action:'Call back (Example)' }) && B.waitPromise({ kind:'call_followup', id:'cfp_1', title:'x' }));
ck('not Waiting: call cards that are office to-dos go to Batches as Office to-dos from calls',
  !B.waitPromise({ kind:'call_followup', title:'Change the visit in AxisCare' }) && !B.waitPromise({ kind:'call_followup', title:'Sign the I-9' })
  && B.laneOf({ kind:'call_followup', title:'Sign the I-9', due:iso(now) }, { need:'call' }, now) === 'batch' && B.batchOf({ kind:'call_followup' }, {}) === 'calls');
ck('"Was it covered?" is not shown', B.laneOf({ kind:'coverage_outcome', urgency:'urgent' }, { need:'care' }, now) === 'hide');
ck('Care today: care or safety right now, and a fresh shift-note flag, health news, open shift',
  B.laneOf({ kind:'request' }, { need:'care' }, now) === 'care' && B.laneOf({ kind:'care_note', created_at:iso(now - 5 * 36e5) }, { need:'note' }, now) === 'care'
  && B.laneOf({ kind:'health_news', created_at:iso(now - 36e5) }, {}, now) === 'care' && B.laneOf({ kind:'open_shift', created_at:iso(now - 36e5) }, {}, now) === 'care');
ck('Care today: a shift-note flag from 3 days ago is not today', B.laneOf({ kind:'care_note', created_at:iso(now - 3 * D), due:iso(now - 3 * D) }, { need:'note' }, now) === 'batch');
ck('Older than a week: an ordinary card 8 days old; never a promise, never care, never Waiting',
  B.laneOf({ kind:'journey', created_at:iso(now - 20 * D) }, {}, now) === 'old' && B.laneOf({ kind:'request', id:'cfu_2', due:iso(now - 9 * D) }, {}, now) !== 'old'
  && B.laneOf({ kind:'request', urgency:'urgent', due:iso(now - 9 * D) }, {}, now) !== 'old' && B.laneOf({ kind:'reply_needed', due:iso(now - 9 * D) }, {}, now) === 'wait');
ck('batches: welcome, send, hiring, approval, scheduling, other',
  B.batchOf({ kind:'family_welcome' }, {}) === 'welcome' && B.batchOf({ kind:'send_problem' }, {}) === 'send' && B.batchOf({ kind:'step2_not_sent' }, {}) === 'hiring'
  && B.batchOf({}, { kind:'approval' }) === 'approval' && B.batchOf({ kind:'confirm_times' }, { need:'schedule' }) === 'schedule' && B.batchOf({ kind:'request' }, { need:'other' }) === 'other'
  && B.BATCH_ORDER.every(k => B.BATCH[k] && B.BATCH[k][0]));
ck('one person once: the same contact or the same 10-digit phone', B.personKey({ contact_id:'abc' }) === 'c:abc' && B.personKey({ phone:'+1 (816) 555-0142' }) === 'p:8165550142' && B.personKey({}) === '');
const wk = B.weekOf([{ client:'Example A', date:(d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'))(new Date(now + D)), start:'8:00 AM', start24:'08:00' },
  { client:'Example B', date:'2030-01-01', start24:'09:00' }], now, 7);
ck('open shifts week: 7 days from today, tomorrow\'s shift on day 2 and within 48 hours, far-off shifts left out',
  wk.length === 7 && wk[1].shifts.length === 1 && wk[1].shifts[0].soon && wk.reduce((a, d) => a + d.shifts.length, 0) === 1 && wk[0].shifts.length === 0, wk.map(d => d.key + ':' + d.shifts.length));
ck('the new words', B.BATCH.welcome[0] === 'Family welcomes to send' && B.BATCH.calls[0] === 'Office to-dos from calls' && !/—/.test(JSON.stringify(B.BATCH)));
/* 2026-11-07 (her: "this HAS to be accurate"): a day AxisCare did not answer in full is never "All covered" */
{ const ymd = t => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const shown = B.weekCard([{ client:'Example A', date:ymd(now + D), start:'9:30 AM', start24:'09:30' }], [ymd(now + 4 * D)], now);
  const cells = shown.split('<div class="opl-day">').slice(1);
  ck('week card: a shift shows, an unread day says it could not be read, the other days say All covered',
    /9:30 AM Example A/.test(cells[1]) && /Couldn't read all of this day/.test(cells[4]) && !/All covered/.test(cells[4]) && /All covered/.test(cells[2]) && (shown.match(/All covered/g) || []).length === 5, cells);
  ck('week card footer counts the unread day', /1 day could not be fully read/.test(shown), shown.slice(-400));
  const none = B.weekCard([], [], now);
  ck('week card: every day read and nothing open says every visit has a caregiver', /Every visit in the next 7 days has a caregiver/.test(none) && (none.match(/All covered/g) || []).length === 7 && !/could not be fully read/.test(none));
  const gapOnly = B.weekCard([], [ymd(now)], now);
  ck('week card: nothing open but a day unread never claims every visit is covered', !/Every visit in the next 7 days has a caregiver/.test(gapOnly) && /No open shifts found on the days AxisCare answered/.test(gapOnly));
  ck('week card: a client name is escaped', /&lt;b&gt;/.test(B.weekCard([{ client:'<b>x', date:ymd(now + D), start:'9:00 AM', start24:'09:00' }], [], now))); }
const words = Object.values(B.NEED).concat(Object.values(B.WHO)).join(' ');
ck('no em dashes', !/—/.test(require('fs').readFileSync(__dirname + '/../ops-board.js', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')) && !/—/.test(words));
console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);

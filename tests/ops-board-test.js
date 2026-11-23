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
ck('a new family row says Make a lead (her word 11-23), a missed call still Call back', B.doWord({ kind:'new_family_call', owner:'a' }) === 'Make a lead' && B.doWord({ kind:'missed_call', owner:'a' }) === 'Call back');
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
/* ── Today first (2026-11-19, her "It's still more busy than helpful" and "Yes, build it") ── */
ck('Today first: off unless the switch is exactly on', !B.todayOn({}) && !B.todayOn({ ops_board_today_live:'yes' }) && B.todayOn({ ops_board_today_live:true }));
ck('a Waiting row is a reply, a new family, a promise or a call to-do',
  B.waitType({ kind:'reply_needed' }) === 'reply' && B.waitType({ kind:'missed_call' }) === 'reply' && B.waitType({ kind:'new_family_call' }) === 'newfam'
  && B.waitType({ kind:'call_followup', id:'cfp_1', title:'Promise not kept yet: Call back Ann' }) === 'promise' && B.waitType({ kind:'call_followup', id:'cf_1', title:'Call back Diana, voicemail' }) === 'reply'
  && B.waitType({ kind:'call_followup', id:'cf_2', title:'Email Joyce the form' }) === 'todo');
ck('care today and people waiting to hear back stay on Today at any age',
  B.todayOf({ kind:'care_note' }, 'care', now) === 'today' && B.todayOf({ kind:'reply_needed', created_at:iso(now - 9 * D) }, 'wait', now) === 'today'
  && B.todayOf({ kind:'new_family_call', created_at:iso(now - 9 * D) }, 'wait', now) === 'today');
ck('a promise or call to-do stays on Today for 2 days, then moves to the older list; other lanes are untouched',
  B.todayOf({ kind:'call_followup', id:'cfp_1', created_at:iso(now - 1.5 * D) }, 'wait', now) === 'today' && B.todayOf({ kind:'call_followup', id:'cfp_1', created_at:iso(now - 2.5 * D) }, 'wait', now) === 'oldp'
  && B.todayOf({ kind:'call_followup', id:'cf_1', title:'Text Ann the time', created_at:iso(now - 5 * D) }, 'wait', now) === 'oldp' && B.todayOf({ kind:'send_problem' }, 'batch', now) === 'batch' && B.todayOf({}, 'old', now) === 'old');
ck('one person: the contact or phone, else the name; never Unknown caller or a blank',
  B.todayKey({ contact_id:'c9', about:'Ann' }) === 'c:c9' && B.todayKey({ about:'Ashley  Lloyd' }) === 'n:ashley lloyd' && B.todayKey({ about:'Unknown caller' }) === '' && B.todayKey({ about:'' }) === ''
  && B.todayKey({ about:'A number we do not know' }) === '' && B.todayKey({ about:'(phone lead)' }) === '');
{
  const r = (id, lane, kind, about, hrs, x) => ({ it:Object.assign({ id, kind, about, created_at:iso(now - hrs * 36e5) }, x || {}), id, lane, since:now - hrs * 36e5 });
  const G = B.todayGroups([ r('cfp_a1', 'wait', 'call_followup', 'Ashley Lloyd', 30), r('fu_1', 'wait', 'reply_needed', 'Susan D.', 14, { contact_id:'s1' }), r('cfp_a2', 'wait', 'call_followup', 'Ashley Lloyd', 40),
    r('nf_1', 'wait', 'new_family_call', 'Unknown caller', 80), r('nf_2', 'wait', 'new_family_call', 'Unknown caller', 20), r('cn_1', 'care', 'care_note', 'April D.', 12), r('cn_2', 'care', 'care_note', 'Patsy W.', 3),
    r('fu_2', 'wait', 'reply_needed', 'Amy J.', 2, { contact_id:'a1' }) ], now);
  ck('Today order: care first (newest first), then people waiting (longest wait first), then promises',
    JSON.stringify(G.map(g => g.top.id)) === JSON.stringify(['cn_2', 'cn_1', 'nf_1', 'nf_2', 'fu_1', 'fu_2', 'cfp_a2']), G.map(g => g.top.id));
  ck('one person is one row: Ashley\'s two promises are one group, oldest on top; two unknown callers stay two rows',
    G.length === 7 && G[6].rows.length === 2 && G[6].top.id === 'cfp_a2' && G[2].rows.length === 1 && G[3].rows.length === 1, G.map(g => g.rows.length));
  const mix = B.todayGroups([ r('cfp_x', 'wait', 'call_followup', 'April D.', 5), r('cn_9', 'care', 'care_note', 'April D.', 9) ], now);
  ck('a care flag and a promise about the same person are one row, care on top', mix.length === 1 && mix[0].top.id === 'cn_9' && mix[0].tier === 0);
}
ck('a call card about a client\'s health is a care call; a pay or schedule call card is not',
  B.careCall({ kind:'call_followup', domain:'client_care' }) && !B.careCall({ kind:'call_followup', domain:'money' }) && !B.careCall({ kind:'care_note', domain:'client_care' }) && !B.careCall(null));
ck('a new family row says what the caller asked for, first sentence only',
  B.todayWhat({ kind:'new_family_call', title:'New family? ANGELA Y.', detail:'Angie Yates called looking for a caregiver one to two days a week. She left a number.' }) === 'Angie Yates called looking for a caregiver one to two days a week.');
ck('a promise row drops "Promise not kept yet"; a reply row drops the name in front; long words are cut',
  B.todayWhat({ kind:'call_followup', id:'cfp_1', title:'Promise not kept yet: Resend portal invitation' }) === 'Resend portal invitation'
  && B.todayWhat({ kind:'reply_needed', about:'Linda P.', detail:'Linda P.: "Can Thursday move?"' }) === '"Can Thursday move?"'
  && B.todayWhat({ kind:'call_followup', id:'cf_1', title:'x '.repeat(200) }).length <= 150);
ck('no em dashes', !/—/.test(require('fs').readFileSync(__dirname + '/../ops-board.js', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')) && !/—/.test(words));
console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);

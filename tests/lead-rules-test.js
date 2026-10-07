/* node tests/lead-rules-test.js — lead-rules.js (Leads intake desk, Stage 0): desired start words, schedule words, waiting
   with its check-back rule, lost reasons, required-by-stage, the form round trip, the move-over patch, and that the Hub
   page and the server carry the same file. */
const path = require('path'), fs = require('fs');
const R = require('../lead-rules.js');
let pass = 0, fail = 0; const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 600))); };
const T = '2026-10-06';   /* a Tuesday */

/* desired start */
ck('nothing asked → no words, rank 4', R.desiredStartWords({}, T) === '' && R.startRank({}, T) === 4);
ck('old radio today → "Needs care today", rank 0', R.desiredStartWords({ urgency:'today' }, T) === 'Needs care today' && R.startRank({ urgency:'today' }, T) === 0);
ck('old radio 48hours → as soon as possible, rank 1', R.desiredStartWords({ urgency:'48hours' }, T) === 'Needs care as soon as possible' && R.startRank({ urgency:'48hours' }, T) === 1);
ck('old radio researching → Planning ahead, rank 3', R.desiredStartWords({ urgency:'researching' }, T) === 'Planning ahead' && R.startRank({ urgency:'researching' }, T) === 3);
ck('by Friday this week → "Needs care by Fri"? no: 3 days out is Wants care by Fri', R.desiredStartWords({ desired_start:{ kind:'by_date', date:'2026-10-09' } }, T) === 'Wants care by Fri', R.desiredStartWords({ desired_start:{ kind:'by_date', date:'2026-10-09' } }, T));
ck('by tomorrow → "Needs care tomorrow", rank 0', R.desiredStartWords({ desired_start:{ kind:'by_date', date:'2026-10-07' } }, T) === 'Needs care tomorrow' && R.startRank({ desired_start:{ kind:'by_date', date:'2026-10-07' } }, T) === 0);
ck('by Thursday (2 days) → "Needs care by Thu"', R.desiredStartWords({ desired_start:{ kind:'by_date', date:'2026-10-08' } }, T) === 'Needs care by Thu');
ck('by Nov 3 → "Wants care by Nov 3", rank 3', R.desiredStartWords({ desired_start:{ kind:'by_date', date:'2026-11-03' } }, T) === 'Wants care by Nov 3' && R.startRank({ desired_start:{ kind:'by_date', date:'2026-11-03' } }, T) === 3);
ck('a date that passed → "Wanted care by …"', R.desiredStartWords({ desired_start:{ kind:'by_date', date:'2026-10-01' } }, T) === 'Wanted care by Oct 1');
ck('the new value wins over the old radio', R.desiredStartWords({ urgency:'today', desired_start:{ kind:'this_month' } }, T) === 'Wants care this month');

/* schedule */
ck('old free text still reads', R.scheduleWords({ days_needed:'Mon, Wed, Fri', times_needed:'9am-1pm', number_of_hours:'12' }) === 'Mon, Wed, Fri 9am-1pm · about 12 hrs/wk');
ck('Mon–Fri collapses; hours shown', R.scheduleWords({ schedule:{ days:['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], times:'9 am–1 pm', hours_per_week:20 } }) === 'Mon–Fri 9 am–1 pm · about 20 hrs/wk');
ck('weekends; a run; a list', R.daysWords(['Sat', 'Sun']) === 'Weekends' && R.daysWords(['Tue', 'Wed', 'Thu']) === 'Tue–Thu' && R.daysWords(['Mon', 'Wed', 'Fri']) === 'Mon/Wed/Fri');
ck('no schedule → empty', R.scheduleWords({}) === '' && R.schedule({ schedule:{ days:[], times:'', hours_per_week:null } }) === null);

/* why they called */
ck('why_called wins; else the AI summary; else the first line of the notes', R.whyCalled({ why_called:'Mom fell' }) === 'Mom fell' && R.whyCalled({ ai_needs_summary:'Daughter needs help\nmore' }) === 'Daughter needs help'
  && R.whyCalled({ interest_notes:'Dad is coming home from rehab Thursday\nCity: Nixa' }) === 'Dad is coming home from rehab Thursday');
ck('the website placeholder is not a reason', R.whyCalled({ interest_notes:'Website form submission (no message left).' }) === '');
ck('a long first line is cut at a word', (() => { const w = R.whyCalled({ interest_notes:'x'.repeat(50) + ' ' + 'y'.repeat(50) + ' ' + 'z'.repeat(50) }); return w.length <= 140 && w.endsWith('…'); })());

/* waiting */
ck('a waiting record reads back; its check-back rules the row', R.waiting({ waiting:{ reason:'state', since:'2026-09-20', check_back:'2026-10-12' } }).check_back === '2026-10-12' && !R.checkBackDue({ waiting:{ reason:'state', since:'2026-09-20', check_back:'2026-10-12' } }, T));
ck('check-back today or earlier → due', R.checkBackDue({ waiting:{ reason:'state', since:'2026-09-20', check_back:'2026-10-06' } }, T));
ck('a running not-ready drip reads as waiting · not ready (legacy, no date yet)', (() => { const w = R.waiting({ nurture_sequence:'not_ready', nurture_started_at:'2026-09-02T15:00:00Z' }); return w && w.reason === 'not_ready' && w.legacy && w.since === '2026-09-02' && !w.check_back; })());
ck('a stopped drip is not waiting', R.waiting({ nurture_sequence:'not_ready', nurture_started_at:'2026-09-02T15:00:00Z', nurture_stopped_at:'2026-09-20T15:00:00Z' }) === null);
ck('no check-back is a problem; so is no reason', R.waitingProblems({ reason:'state' }).length === 1 && R.waitingProblems({ reason:'x', check_back:'2026-10-10' }).length === 1 && R.waitingProblems({ reason:'va', check_back:'2026-10-10' }).length === 0);
ck('default check-back: state weekly, VA two weeks, not ready monthly', R.defaultCheckBack('state', T) === '2026-10-13' && R.defaultCheckBack('va', T) === '2026-10-20' && R.defaultCheckBack('not_ready', T) === '2026-11-05');

/* lost */
ck('14 reasons; other needs a note', R.LOST.length === 14 && R.lostRecord({}, 'other', '') === null && R.lostRecord({}, 'other', 'moved to Texas').lost_reason === 'Other (say what): moved to Texas');
ck('a staffing reason keeps the schedule and town', (() => { const r = R.lostRecord({ schedule:{ days:['Sat', 'Sun'], times:'mornings', hours_per_week:8 }, client_city:'Ozark' }, 'could_not_staff', ''); return r.lost_reason_key === 'could_not_staff' && r.lost_schedule.days.join() === 'Sat,Sun' && r.lost_schedule.city === 'Ozark'; })());
ck('price keeps no schedule', !R.lostRecord({ client_city:'Ozark' }, 'price', '').lost_schedule);
ck('old reasons map to keys for reports', R.lostKey({ lost_reason:'Chose another agency' }) === 'chose_agency' && R.lostKey({ lost_reason:'No response' }) === 'unable_to_reach' && R.lostKey({ lost_reason:'because' }) === 'other' && R.lostKey({}) === null);

/* required by stage */
const fresh = { interest_notes:'Website form submission (no message left).' };
ck('new and reaching out: nothing is required', R.missing(fresh, 'new').length === 0 && R.missing(fresh, 'reaching_out').length === 0);
ck('once reached: who, why, when', R.missing(fresh, 'connected').map(m => m.key).join() === 'client,why,start');
ck('once an assessment is booked: payer, schedule and town too', R.missing({ client_first_name:'Ruth', why_called:'falls', desired_start:{ kind:'asap' } }, 'assessment').map(m => m.key).join() === 'payer,schedule,town');
ck('short words for the board chip', R.missing({}, 'assessment').find(m => m.key === 'schedule').short === 'hours not asked' && R.missing({}, 'assessment').find(m => m.key === 'payer').short === 'payer not asked');
ck('a complete family at yes: nothing missing', R.missing({ client_first_name:'Ruth', why_called:'falls', desired_start:{ kind:'asap' }, funding_source:'private', schedule:{ days:['Mon'], times:'', hours_per_week:null }, client_city:'Nixa' }, 'yes').length === 0);

/* the form round trip */
const l0 = { id:'a', urgency:'7days', days_needed:'Mon, Wed', times_needed:'9-1', number_of_hours:'8', nurture_sequence:'not_ready', nurture_started_at:'2026-09-02T15:00:00Z' };
const f = R.toForm(l0);
ck('toForm flattens: kind from the old radio, no days (text), waiting from the drip with a default check-back', f.desired_start_kind === 'this_week' && f.desired_start_date === '' && f.schedule_days.length === 0 && f.waiting_reason === 'not_ready' && f.waiting_check_back === '2026-10-02', f);
const l1 = R.compose(Object.assign({}, l0), { desired_start_kind:'by_date', desired_start_date:'2026-10-10', schedule_days:['Mon', 'Wed'], times_needed:'9-1', number_of_hours:'8', waiting_reason:'', first_name:'Pat' }, T);
ck('compose builds the objects, keeps the old radio untouched, leaves the old days text alone (clean-up 6.4: nothing writes it), drops the helper keys, ends waiting', l1.desired_start.kind === 'by_date' && l1.desired_start.date === '2026-10-10' && l1.urgency === '7days'
  && l1.schedule.days.join() === 'Mon,Wed' && l1.schedule.hours_per_week === 8 && l1.days_needed === 'Mon, Wed' && l1.first_name === 'Pat' && !('desired_start_kind' in l1) && !('schedule_days' in l1) && l1.waiting === null && l1.waiting_ended === undefined, l1);
const l2 = R.compose({ id:'b' }, { waiting_reason:'state', waiting_check_back:'', waiting_note:'DCN sent' }, T);
ck('a waiting reason with no date gets the default (state: a week)', l2.waiting.reason === 'state' && l2.waiting.since === T && l2.waiting.check_back === '2026-10-13' && l2.waiting.note === 'DCN sent', l2);
const l3 = R.compose(Object.assign({}, l2), { waiting_reason:'state', waiting_check_back:'2026-10-20' }, '2026-10-13');
ck('same reason later: since is kept, check-back moves', l3.waiting.since === T && l3.waiting.check_back === '2026-10-20');
const l4 = R.compose(Object.assign({}, l3), { waiting_reason:'' }, '2026-10-20');
ck('clearing the reason records when the wait ended', l4.waiting === null && l4.waiting_ended.reason === 'state' && l4.waiting_ended.since === T);
const l5 = R.compose({ id:'c', desired_start:{ kind:'asap', asked_at:'x' } }, { first_name:'Only' }, T);
ck('a chapter that does not own the start leaves it alone', l5.desired_start.kind === 'asap' && l5.first_name === 'Only');
ck('toForm on a new lead: empty helpers', (() => { const e = R.toForm({}); return e.desired_start_kind === '' && e.waiting_reason === '' && e.waiting_check_back === ''; })());

/* the move-over */
ck('a lead with everything new: no patch', R.migrationPatch({ desired_start:{ kind:'asap' }, schedule:{ days:['Mon'], times:'', hours_per_week:null } }, T) === null);
const mp = R.migrationPatch({ created_at:'2026-09-01T10:00:00Z', urgency:'48hours', days_needed:'weekdays', number_of_hours:'10', nurture_sequence:'not_ready', nurture_started_at:'2026-09-02T15:00:00Z', status:'Lost', lost_reason:'Went to a facility' }, T);
ck('the move-over patch: start from the radio, schedule from the text, waiting from the drip with a future check-back, the lost key', mp.desired_start.kind === 'asap' && mp.desired_start.from === 'urgency:48hours' && mp.schedule.days_text === 'weekdays' && mp.schedule.hours_per_week === 10
  && mp.waiting.reason === 'not_ready' && mp.waiting.check_back === '2026-10-13' && mp.lost_reason_key === 'chose_facility', mp);
ck('a drip whose next check is still ahead keeps it', R.migrationPatch({ nurture_sequence:'not_ready', nurture_started_at:'2026-10-01T15:00:00Z' }, T).waiting.check_back === '2026-10-31');

/* lead response hours and the first-attempt clock (Stage 1). October 2026 is CDT (UTC-5): 9:02 pm Chicago = 02:02Z next day. */
const HRS = R.responseHours({});
ck('no setting → every day 8 to 6 (her 2026-10-07 default: evenings off only), marked default', HRS.days.join() === '0,1,2,3,4,5,6' && HRS.start === '08:00' && HRS.end === '18:00' && HRS.source === 'default');
const WK = R.responseHours({ lead_response_hours:{ days:[1, 2, 3, 4, 5], start:'08:00', end:'18:00' } });   /* weekdays only, as a setting */
ck('a bad setting (end before start, or a bad day) falls back', R.responseHours({ lead_response_hours:{ days:[1], start:'18:00', end:'08:00' } }).source === 'default' && R.responseHours({ lead_response_hours:{ days:[9], start:'08:00', end:'18:00' } }).source === 'default');
const SAT = R.responseHours({ lead_response_hours:{ days:[1, 2, 3, 4, 5, 6], start:'07:30', end:'17:00' } });
ck('a good setting is kept and sorted', SAT.days.join() === '1,2,3,4,5,6' && SAT.start === '07:30' && SAT.source === 'setting');
const tue902pm = '2026-10-07T02:02:00.000Z';     /* Tue Oct 6, 9:02 pm Chicago */
ck('chicago(): Tue 9:02 pm', (() => { const c = R.chicago(tue902pm); return c.ymd === '2026-10-06' && c.hm === '21:02' && c.dow === 2; })(), R.chicago(tue902pm));
ck('9:02 pm Tuesday is outside hours; 10:04 am is inside', !R.inResponseHours(tue902pm, HRS) && R.inResponseHours('2026-10-06T15:04:00Z', HRS));
ck('next opening after 9:02 pm Tue = Wed 8:00 am (13:00Z)', R.nextOpening(tue902pm, HRS) === '2026-10-07T13:00:00.000Z', R.nextOpening(tue902pm, HRS));
ck('a 10:04 am inquiry: the clock starts now, due 5 minutes later', R.clockStart({ created_at:'2026-10-06T15:04:00Z' }, HRS) === '2026-10-06T15:04:00.000Z' && R.firstAttemptDue({ created_at:'2026-10-06T15:04:00Z' }, HRS) === '2026-10-06T15:09:00.000Z');
ck('a 9:02 pm inquiry: due Wed 8:05 am', R.firstAttemptDue({ created_at:tue902pm }, HRS) === '2026-10-07T13:05:00.000Z', R.firstAttemptDue({ created_at:tue902pm }, HRS));
ck('a Saturday 10 am inquiry is due 10:05 that day (every day is on)', R.firstAttemptDue({ created_at:'2026-10-10T15:00:00Z' }, HRS) === '2026-10-10T15:05:00.000Z', R.firstAttemptDue({ created_at:'2026-10-10T15:00:00Z' }, HRS));
ck('...with weekdays only as the setting, it waits for Monday 8:05', R.firstAttemptDue({ created_at:'2026-10-10T15:00:00Z' }, WK) === '2026-10-12T13:05:00.000Z' && R.firstAttemptDue({ created_at:'2026-10-10T15:00:00Z' }, SAT) === '2026-10-10T15:05:00.000Z');
ck('a Saturday 9 pm inquiry: due Sunday 8:05', R.firstAttemptDue({ created_at:'2026-10-11T02:00:00Z' }, HRS) === '2026-10-11T13:05:00.000Z', R.firstAttemptDue({ created_at:'2026-10-11T02:00:00Z' }, HRS));
ck('a 6:30 am Wednesday inquiry: due 8:05 the same morning', R.firstAttemptDue({ created_at:'2026-10-07T11:30:00Z' }, HRS) === '2026-10-07T13:05:00.000Z');
ck('a 5:59 pm inquiry is inside; 6:00 pm is the next morning', R.firstAttemptDue({ created_at:'2026-10-06T22:59:00Z' }, HRS) === '2026-10-06T23:04:00.000Z' && R.firstAttemptDue({ created_at:'2026-10-06T23:00:00Z' }, HRS) === '2026-10-07T13:05:00.000Z');
ck('after the clocks change (Nov 2, CST): a 7:30 am inquiry is due 8:05 = 14:05Z', R.firstAttemptDue({ created_at:'2026-11-03T13:30:00Z' }, HRS) === '2026-11-03T14:05:00.000Z', R.firstAttemptDue({ created_at:'2026-11-03T13:30:00Z' }, HRS));
ck('words: came in 12 min ago · at 9:02 am · last night at 9:02 pm · yesterday at 2:10 pm · Sat at 10 am',
  R.cameInWords('2026-10-07T13:00:00Z', '2026-10-07T13:12:00Z') === 'came in 12 min ago' && R.cameInWords('2026-10-07T14:02:00Z', '2026-10-07T16:00:00Z') === 'came in at 9:02 am'
  && R.cameInWords(tue902pm, '2026-10-07T13:00:00Z') === 'came in last night at 9:02 pm' && R.cameInWords('2026-10-06T19:10:00Z', '2026-10-07T13:00:00Z') === 'came in yesterday at 2:10 pm'
  && R.cameInWords('2026-10-10T15:00:00Z', '2026-10-12T13:00:00Z') === 'came in Sat at 10 am',
  [R.cameInWords(tue902pm, '2026-10-07T13:00:00Z'), R.cameInWords('2026-10-06T19:10:00Z', '2026-10-07T13:00:00Z'), R.cameInWords('2026-10-10T15:00:00Z', '2026-10-12T13:00:00Z')]);
ck('opening words: tomorrow at 8 am (Tue night) · Monday at 8 am (Saturday, weekdays-only setting) · at 8 am (6:30 that morning)',
  R.openingWords(tue902pm, HRS) === 'we open tomorrow at 8 am' && R.openingWords('2026-10-10T15:00:00Z', WK) === 'we open Monday at 8 am' && R.openingWords('2026-10-07T11:30:00Z', HRS) === 'we open at 8 am',
  [R.openingWords(tue902pm, HRS), R.openingWords('2026-10-10T15:00:00Z', WK), R.openingWords('2026-10-07T11:30:00Z', HRS)]);
ck('her ack words: "tomorrow after 8 am" (Tue night) · "after 8 am" (6:30 that morning) · "Monday after 8 am" (Friday 7 pm with weekends off)',
  R.callBackWords(tue902pm, HRS) === 'tomorrow after 8 am' && R.callBackWords('2026-10-07T11:30:00Z', HRS) === 'after 8 am' && R.callBackWords('2026-10-10T00:00:00Z', WK) === 'Monday after 8 am',
  [R.callBackWords(tue902pm, HRS), R.callBackWords('2026-10-07T11:30:00Z', HRS), R.callBackWords('2026-10-10T00:00:00Z', WK)]);
let fa = R.firstAttemptState({ created_at:tue902pm, ack_sent_at:'2026-10-07T02:02:30Z' }, HRS, '2026-10-07T03:00:00Z');
ck('9:02 pm lead at 10 pm: after hours, not running, not overdue, says when the clock starts', fa.after_hours && !fa.running && !fa.overdue && fa.starts_words === 'the clock starts tomorrow at 8 am' && fa.ack === 'auto-acknowledged immediately', fa);
fa = R.firstAttemptState({ created_at:tue902pm, ack_sent_at:'2026-10-07T02:02:30Z' }, HRS, '2026-10-07T13:12:00Z');
ck('...at 8:12 am next morning: running 12 min, OVERDUE by 7, came in last night', fa.running && fa.overdue && fa.open_minutes === 12 && fa.late_minutes === 7 && fa.came_in === 'came in last night at 9:02 pm', fa);
fa = R.firstAttemptState({ created_at:tue902pm, first_human_attempt_at:'2026-10-07T13:03:00Z' }, HRS, '2026-10-07T13:12:00Z');
ck('...once a person tried, never overdue', fa.attempted && !fa.overdue);
fa = R.firstAttemptState({ created_at:'2026-10-07T15:00:00Z', ack_sent_at:'2026-10-07T15:00:20Z' }, HRS, '2026-10-07T15:03:00Z');
ck('a 10 am lead at 10:03: running, not overdue yet, ack at 10 am', !fa.after_hours && fa.running && !fa.overdue && fa.open_minutes === 3 && fa.ack === 'auto-acknowledged at 10 am', fa);
ck('median first attempt today: 9:02 pm lead tried 8:08 (8 min from opening) + 10:00 lead tried 10:04 (4) → 6; nothing → null',
  R.medianFirstAttemptMinutes([{ created_at:tue902pm, first_human_attempt_at:'2026-10-07T13:08:00Z' }, { created_at:'2026-10-07T15:00:00Z', first_human_attempt_at:'2026-10-07T15:04:00Z' }, { created_at:'2026-10-07T16:00:00Z' }], HRS, '2026-10-07') === 6
  && R.medianFirstAttemptMinutes([], HRS, '2026-10-07') === null);
ck('...a lead from yesterday does not count in today\'s median', R.medianFirstAttemptMinutes([{ created_at:tue902pm, first_human_attempt_at:'2026-10-07T13:08:00Z' }], HRS, '2026-10-06') === null);

/* the board (Stage 2): one row per family, three groups, most urgent first; "now" = Tue Oct 6 2026 10:10 am Chicago */
const NOW = '2026-10-06T15:10:00Z', CTX = (o) => Object.assign({ now:NOW, today:'2026-10-06', hours:HRS, stage:'connected', assessments:[], journey_next:null }, o || {});
let b = R.boardRow({ first_name:'Patrice', last_name:'Keller', client_first_name:'Ruth Ann', client_last_name:'Keller', relationship:'Niece', created_at:'2026-10-06T14:58:00Z', ack_sent_at:'2026-10-06T14:58:20Z', interest_notes:'Aunt home from Mercy Thursday\nCity: Republic', client_city:'Republic' }, CTX({ stage:'new' }));
ck('a 9:58 am web inquiry at 10:10: Need you now rank 0, "NEW · 12 min" OVERDUE, Call Patrice first attempt, no missing chips (new asks nothing)', b.group === 'now' && b.rank === 0 && b.when.big === 'NEW · 12 min' && /OVERDUE/.test(b.when.sub) && b.next.text === 'Call Patrice: first attempt' && b.primary.kind === 'call' && b.chips.length === 0 && /Came in 12 min ago · auto-acknowledged at 9:58 am/.test(b.next.sub), b);
ck('...the story: name from the client, why from the first line of the notes, town', b.name === 'Ruth Ann Keller' && b.why === 'Aunt home from Mercy Thursday' && b.need === 'Republic', [b.name, b.why, b.need]);
b = R.boardRow({ first_name:'Ruth', created_at:'2026-10-06T15:08:00Z' }, CTX({ stage:'new' }));
ck('a 10:08 inquiry at 10:10: rank 1, "first call due in 3 min"', b.group === 'now' && b.rank === 1 && b.when.sub === 'first call due in 3 min', b.when);
b = R.boardRow({ first_name:'Ruth', created_at:'2026-10-07T02:00:00Z', ack_sent_at:'2026-10-07T02:00:10Z' }, CTX({ now:'2026-10-07T03:00:00Z', today:'2026-10-06', stage:'new' }));
ck('a 9 pm inquiry at 10 pm: Scheduled, 8 am, "first call · came in 60 min ago"-style sub, Call when we open', b.group === 'later' && b.when.big === '8 am' && /first call · came in/.test(b.when.sub) && b.next.text === 'Call Ruth when we open', b);
b = R.boardRow({ first_name:'Diane', last_name:'Teague', client_first_name:'Marjorie', client_last_name:'Teague', why_called:'Daughter looking for care for her mom', funding_source:'private', desired_start:{ kind:'by_date', date:'2026-10-09' }, schedule:{ days:['Mon','Tue','Wed','Thu','Fri'], times:'9 am–1 pm', hours_per_week:20 }, client_city:'Nixa', family_last_reply_at:'2026-10-06T14:48:00Z', phone:'417-555-0131', source:'Website',
  contact_events:[{ at:'2026-10-06T13:12:00Z', channel:'call', direction:'out', outcome:'voicemail', actor:'human' }, { at:'2026-10-06T14:48:00Z', channel:'sms', direction:'in', outcome:'reply', actor:'family' }] }, CTX({ stage:'reaching_out' }));
ck('a family reply nobody answered: rank 2, "Replied 22 min ago", Text back first, Answer Diane', b.group === 'now' && b.rank === 2 && b.when.big === 'Replied 22 min ago' && b.primary.kind === 'text' && b.next.text === 'Answer Diane' && /They texted 9:48 am/.test(b.last), b);
ck('...need line in words: Wants care by Fri · Private pay · Mon–Fri 9 am–1 pm · about 20 hrs/wk · Nixa', b.need === 'Wants care by Fri · Private pay · Mon–Fri 9 am–1 pm · about 20 hrs/wk · Nixa', b.need);
b = R.boardRow({ first_name:'Harold', last_name:'Pruitt', promised_callback_at:'2026-10-06T09:00:00', funding_source:'va', desired_start:{ kind:'asap' }, first_human_contact_at:'2026-10-01T20:00:00Z',
  contact_events:[{ at:'2026-10-01T20:00:00Z', channel:'call', direction:'out', outcome:'connected', actor:'human', duration_s:840, note:'quoted $32/hr' }] }, CTX({ stage:'deciding' }));
ck('a promised 9:00 call at 10:10: rank 3, "Call promised 9 am", "1 h 10 min late", last = 14-min call Thu', b.group === 'now' && b.rank === 3 && b.when.big === 'Call promised 9 am' && b.when.sub === '1 h 10 min late' && /Last: 14-min call, we talked Thu 3 pm · "quoted \$32\/hr"/.test(b.last), b);
b = R.boardRow({ first_name:'Harold', promised_callback_at:'2026-10-06T16:30:00', first_human_contact_at:'2026-10-01T20:00:00Z' }, CTX({ stage:'deciding' }));
ck('a promised 4:30 pm call (stored as Central wall-clock, no zone): Scheduled at 4:30 pm, "callback we promised"', b.group === 'later' && b.when.big === '4:30 pm' && b.when.sub === 'callback we promised' && b.sort === new Date('2026-10-06T16:30:00').toISOString(), b);
b = R.boardRow({ first_name:'Greg', last_name:'Lindqvist', client_first_name:'Dorothy', client_last_name:'Lindqvist', funding_source:'medicaid', desired_start:{ kind:'by_date', date:'2026-10-08' }, first_human_contact_at:'2026-10-05T20:40:00Z', client_city:'Springfield', schedule:{ days:['Mon'], times:'', hours_per_week:null } }, CTX({ stage:'connected' }));
ck('needs care Thursday, no assessment booked: rank 5, amber, Schedule assessment first, "Book the assessment before Thu"; why not asked is the one chip', b.group === 'now' && b.rank === 5 && b.when.big === 'Needs care by Thu' && b.when.sub === 'assessment not booked yet' && b.primary.kind === 'schedule' && b.next.text === 'Book the assessment before Thu' && b.chips.map(c => c.text).join() === 'why they called' && b.why === 'Greg Lindqvist called', b);
b = R.boardRow({ first_name:'Greg', funding_source:'medicaid', desired_start:{ kind:'by_date', date:'2026-10-08' }, first_human_contact_at:'2026-10-05T20:40:00Z' }, CTX({ stage:'assessment', assessments:[{ status:'Scheduled', visit_date:'2026-10-08' }] }));
ck('...once booked: Scheduled, "Thu", "assessment at the home", Open assessment', b.group === 'later' && b.when.big === 'Thu' && b.when.sub === 'assessment at the home' && b.primary.kind === 'open_asmt', b);
b = R.boardRow({ first_name:'Walter', assessment_at:'2026-10-06T16:00:00Z' }, CTX({ stage:'assessment' }));
ck('a booked time from cc-booking: Scheduled "11 am" today', b.group === 'later' && b.when.big === '11 am' && b.sort === '2026-10-06T16:00:00.000Z', b);
b = R.boardRow({ first_name:'Walter' }, CTX({ stage:'assessment', assessments:[{ status:'Completed — Awaiting Plan', visit_date:'2026-10-04' }] }));
ck('assessment done, plan not written: rank 6, "Assessment done Oct 4" (older than a week reads the date? no: 2 days back → Sat)', b.group === 'now' && b.rank === 6 && /^Assessment done /.test(b.when.big) && b.next.text === 'Write the care plan' && b.primary.kind === 'open_asmt', b.when);
b = R.boardRow({ first_name:'Tom', last_name:'Marsh', follow_up_due:'2026-10-03', funding_source:'ltc', first_human_contact_at:'2026-09-30T14:00:00Z', client_city:'Springfield', desired_start:{ kind:'this_month' }, client_first_name:'Evelyn' }, CTX({ stage:'connected', journey_next:{ title:'Confirm the LTC policy', why:'' } }));
ck('follow-up 3 days late: rank 7, red, next = the journey\'s next step, "hours not asked" chip (connected needs the client, why, start; schedule is an assessment-stage ask so NOT flagged)', b.group === 'now' && b.rank === 7 && b.when.big === 'Follow-up 3 days late' && b.when.sub === 'was due Oct 3' && b.next.text === 'Confirm the LTC policy' && b.chips.map(c => c.text).join() === 'why they called', b);
b = R.boardRow({ first_name:'Bernard', follow_up_due:'2026-10-07', first_human_contact_at:'2026-09-30T14:00:00Z', why_called:'VA', desired_start:{ kind:'planning' }, client_first_name:'B' }, CTX({ stage:'deciding' }));
ck('follow-up tomorrow: Scheduled, "Tomorrow", "follow-up (no time set)", sorts at 9 am', b.group === 'later' && b.when.big === 'Tomorrow' && b.when.sub === 'follow-up (no time set)' && b.sort === '2026-10-07T14:00:00.000Z', b);
b = R.boardRow({ first_name:'Nadine', follow_up_due:'2026-10-06', follow_up_time:'14:30', first_human_contact_at:'2026-09-30T14:00:00Z' }, CTX({ stage:'deciding' }));
ck('a follow-up today at 2:30: Scheduled "2:30 pm"', b.group === 'later' && b.when.big === '2:30 pm' && b.when.sub === 'follow-up', b.when);
b = R.boardRow({ first_name:'Carla', client_first_name:'Lorene', funding_source:'medicaid', waiting:{ reason:'state', since:'2026-09-20', check_back:'2026-10-12', note:'DCN submitted Sep 20' }, first_human_contact_at:'2026-09-20T14:00:00Z' }, CTX({ stage:'deciding' }));
ck('waiting on the state 16 days, check back Oct 12 (6 days out reads Mon): Waiting group, "The state", amber "since Sep 20 · 16 days, follow up soon", Next check Mon, sorted by the date', b.group === 'waiting' && b.when.big === 'The state' && b.when.sub === 'since Sep 20 · 16 days, follow up soon' && b.when.tone === 'amber' && b.next.text === 'Next check Mon' && b.sort === '2026-10-12' && b.next.sub === 'DCN submitted Sep 20', b);
b = R.boardRow({ first_name:'Carla', funding_source:'medicaid', waiting:{ reason:'state', since:'2026-09-20', check_back:'2026-10-06' }, first_human_contact_at:'2026-09-20T14:00:00Z' }, CTX({ stage:'deciding' }));
ck('...on the check-back day it comes back: rank 8 "Check back today", "Check Fusion, then call the family"', b.group === 'now' && b.rank === 8 && b.when.big === 'Check back today' && b.next.text === 'Check Fusion, then call the family', b);
b = R.boardRow({ first_name:'Carla', waiting:{ reason:'family_decision', since:'2026-10-01', check_back:'2026-10-04' }, first_human_contact_at:'2026-09-20T14:00:00Z' }, CTX({ stage:'deciding' }));
ck('...2 days past the check-back: "Check back 2 days late", red', b.when.big === 'Check back 2 days late' && b.when.tone === 'red' && b.next.text === 'Call Carla: have they decided?', b.when);
b = R.boardRow({ first_name:'Mark', funding_source:'medicaid', state_status:'submitted', state_submitted:'2026-09-20', first_human_contact_at:'2026-09-20T14:00:00Z' }, CTX({ stage:'connected' }));
ck('Medicaid submitted with no waiting record: Waiting, "The state", "Set a check-back date" as the next thing', b.group === 'waiting' && b.when.big === 'The state' && b.next.text === 'Set a check-back date' && b.primary.kind === 'followup', b);
b = R.boardRow({ first_name:'Evelyn', first_human_contact_at:'2026-09-30T14:00:00Z', client_first_name:'E', why_called:'x', desired_start:{ kind:'planning' } }, CTX({ stage:'connected' }));
ck('reached, nothing scheduled: rank 9 "No next step", Set follow-up first', b.group === 'now' && b.rank === 9 && b.when.big === 'No next step' && b.primary.kind === 'followup', b);
b = R.boardRow({ first_name:'Phyllis', contact_events:[{ at:'2026-10-05T15:00:00Z', channel:'call', direction:'out', outcome:'voicemail', actor:'human' }, { at:'2026-10-06T13:00:00Z', channel:'call', direction:'out', outcome:'no_answer', actor:'human' }], first_human_attempt_at:'2026-10-05T15:00:00Z' }, CTX({ stage:'reaching_out' }));
ck('tried twice, never reached, no follow-up: "No next step" with "2 tries, not reached", Call first', b.group === 'now' && b.rank === 9 && b.when.sub === '2 tries, not reached' && b.primary.kind === 'call' && b.chips.some(c => c.text === '2 tries, not reached'), b);
ck('sort: now by rank then time; later by time; waiting by check-back', (() => { const rows = [R.boardRow({ first_name:'A', follow_up_due:'2026-10-09', first_human_contact_at:'x' }, CTX()), R.boardRow({ first_name:'B', created_at:'2026-10-06T14:58:00Z' }, CTX({ stage:'new' })), R.boardRow({ first_name:'C', promised_callback_at:'2026-10-06T16:30:00', first_human_contact_at:'x' }, CTX({ stage:'deciding' })), R.boardRow({ first_name:'D', waiting:{ reason:'va', since:'2026-10-01', check_back:'2026-10-20' } }, CTX())].sort(R.boardSort); return rows.map(r => r.name).join() === 'B,C,A,D'; })());
ck('day headers: Today · Tomorrow · Thursday · Oct 20', R.dayHeader('2026-10-06T16:00:00Z', '2026-10-06') === 'Today' && R.dayHeader('2026-10-07', '2026-10-06') === 'Tomorrow' && R.dayHeader('2026-10-08T14:00:00Z', '2026-10-06') === 'Thursday' && R.dayHeader('2026-10-20', '2026-10-06') === 'Oct 20');

/* Stage 4: authorization as an event; the 10/21-day DSDS clock */
{
  const l = { first_name:'Tanya', client_first_name:'Clara', funding_source:'medicaid', state_status:'submitted', state_submitted:'2026-09-05', first_human_contact_at:'2026-09-05T14:00:00Z', waiting:{ reason:'state', since:'2026-09-05', check_back:'2026-10-13' } };
  ck('setting the state to authorized stamps authorization_received_at once, with a history line', (() => { const x = Object.assign({}, l, { state_status:'authorized' }); const a = R.markAuthorized(x, 'submitted', '2026-10-06T13:35:00Z'); const b = R.markAuthorized(x, 'authorized', '2026-10-06T14:00:00Z'); return a && !b && x.authorization_received_at === '2026-10-06T13:35:00Z' && x.comm_log[0].kind === 'authorization_received'; })());
  ck('authorized this morning, nobody has called: Need you now rank 4, green "Authorized today", Call first', (() => { const x = Object.assign({}, l, { state_status:'authorized', authorization_received_at:'2026-10-06T13:35:00Z' }); const b = R.boardRow(x, CTX({ stage:'deciding' })); return b.group === 'now' && b.rank === 4 && b.when.big === 'Authorized today' && b.when.tone === 'green' && b.primary.kind === 'call' && b.next.text === 'Call Tanya: authorized, pick a start week'; })());
  ck('...once a person reached out after it, the flag clears', !R.authorizationPending(Object.assign({}, l, { authorization_received_at:'2026-10-06T13:35:00Z', contact_events:[{ at:'2026-10-06T14:00:00Z', channel:'call', direction:'out', outcome:'voicemail', actor:'human' }] })));
  ck('...a call before it does not clear it', R.authorizationPending(Object.assign({}, l, { authorization_received_at:'2026-10-06T13:35:00Z', contact_events:[{ at:'2026-10-06T13:00:00Z', channel:'call', direction:'out', outcome:'connected', actor:'human' }] })));
  ck('the form: changing the state to authorized through compose stamps it too', (() => { const x = R.compose(Object.assign({}, l), { state_status:'authorized' }, '2026-10-06'); return !!x.authorization_received_at; })());
  const b31 = R.boardRow(l, CTX({ stage:'deciding' }));
  ck('31 days with the state (check-back still a week out): Need you now rank 8 "With the state 31 days · call DSDS", Called DSDS beside Call', b31.group === 'now' && b31.rank === 8 && b31.when.big === 'With the state 31 days' && b31.reason === 'dsds_21' && b31.secondary[0].kind === 'dsds', b31);
  const b12 = R.boardRow(Object.assign({}, l, { state_submitted:'2026-09-24', waiting:{ reason:'state', since:'2026-09-24', check_back:'2026-10-13' } }), CTX({ stage:'deciding' }));
  ck('12 days with the state: still Waiting, amber, "since Sep 24 · 12 days, follow up soon"', b12.group === 'waiting' && b12.when.tone === 'amber' && b12.when.sub === 'since Sep 24 · 12 days, follow up soon', b12.when);
  const b5 = R.boardRow(Object.assign({}, l, { state_submitted:'2026-10-01', waiting:{ reason:'state', since:'2026-10-01', check_back:'2026-10-13' } }), CTX({ stage:'deciding' }));
  ck('5 days: plain waiting, no nag', b5.group === 'waiting' && b5.when.tone === 'muted' && b5.when.sub === 'since Oct 1', b5.when);
  const bC = R.boardRow(Object.assign({}, l, { dsds_called_at:'2026-10-05T15:00:00Z' }), CTX({ stage:'deciding' }));
  ck('"Called DSDS" yesterday restarts the clock: back to Waiting, 1 day', bC.group === 'waiting' && R.stateDays(Object.assign({}, l, { dsds_called_at:'2026-10-05T15:00:00Z' }), bC && l.waiting, '2026-10-06') === 1, bC.when);
  const bN = R.boardRow({ first_name:'Mark', funding_source:'medicaid', state_status:'submitted', state_submitted:'2026-09-10', first_human_contact_at:'2026-09-10T14:00:00Z' }, CTX({ stage:'connected' }));
  ck('Medicaid submitted 26 days ago with no waiting record: the 21-day rule still fires', bN.group === 'now' && bN.reason === 'dsds_21' && bN.when.big === 'With the state 26 days', bN.when);
}

/* Stage 5: the owners' numbers (last 30 days vs the 30 before), "now" = Oct 6 2026 10:10 am */
{
  const Ls = [
    { id:'a', created_at:'2026-10-06T14:58:00Z', first_human_attempt_at:'2026-10-06T15:02:00Z', first_human_contact_at:'2026-10-06T15:02:00Z', assigned_coordinator:'Krystal' },               /* 4 min, reached */
    { id:'b', created_at:'2026-10-06T02:02:00Z', first_human_attempt_at:'2026-10-06T13:12:00Z', assigned_coordinator:'Krystal' },                                                              /* 9 pm Mon → 8:12 am: 12 min from opening, voicemail only */
    { id:'c', created_at:'2026-10-01T15:00:00Z', assigned_coordinator:'Krystal' },                                                                                                               /* never attempted, 5 days */
    { id:'d', created_at:'2026-09-20T15:00:00Z', first_human_attempt_at:'2026-09-20T16:30:00Z', first_human_contact_at:'2026-09-20T16:30:00Z', said_yes_at:'2026-09-28T15:00:00Z', status:'Converted', converted_at:'2026-09-28T15:00:00Z', assigned_coordinator:'Samantha' },  /* 90 min, yes after 8 days */
    { id:'e', created_at:'2026-09-25T15:00:00Z', first_human_attempt_at:'2026-09-25T15:03:00Z', status:'Lost', lost_at:'2026-10-02T15:00:00Z', lost_reason_key:'could_not_staff', lost_schedule:{ hours_per_week:20, city:'Ozark' }, assigned_coordinator:'Krystal' },
    { id:'f', created_at:'2026-09-26T15:00:00Z', first_human_attempt_at:'2026-09-26T15:03:00Z', status:'Lost', lost_at:'2026-10-03T15:00:00Z', lost_reason:'Price', schedule:{ days:['Mon'], times:'', hours_per_week:8 }, assigned_coordinator:'Krystal' },
    { id:'g', created_at:'2026-09-01T15:00:00Z', first_human_attempt_at:'2026-09-01T15:30:00Z', assigned_coordinator:'Krystal' },                                                              /* the period before */
    { id:'s', created_at:'2026-10-05T15:00:00Z', spam:{ at:'x' } } ];
  const N = R.ownerNumbers(Ls, HRS, { now:'2026-10-06T15:10:00Z', days:30 });
  ck('this period: 6 inquiries (spam never counts), 5 attempted, median first attempt 12 min (4, 12, 90, 3, 3 → 4? no: median of 3,3,4,12,90 = 4)', N.now.inquiries === 6 && N.now.attempted === 5 && N.now.median_first_attempt_min === 4, N.now);
  ck('...reached within 24 h: 2 of 6 (33%)', N.now.reached_24h === 2 && N.now.reached_24h_pct === 33, N.now.reached_24h);
  ck('...never attempted after a day: 1 (the 5-day-old one; this morning\'s is not stale yet)', N.now.never_attempted === 1, N.now.never_attempted);
  ck('...buckets: ≤5 min 3 · 5–15 min 1 · 1–4 h 1 · never 1', N.now.buckets['≤5 min'] === 3 && N.now.buckets['5–15 min'] === 1 && N.now.buckets['1–4 h'] === 1 && N.now.buckets.never === 1, N.now.buckets);
  ck('...said yes 1, inquiry to yes 8 days', N.now.said_yes === 1 && N.now.inquiry_to_yes_median_days === 8, [N.now.said_yes, N.now.inquiry_to_yes_median_days]);
  ck('...lost 2 for 28 hrs/wk; could not staff first (20 hrs, Ozark), then Price (8 hrs); none lost after a yes', N.now.lost === 2 && N.now.lost_hours_week === 28 && N.now.by_reason[0].key === 'could_not_staff' && N.now.by_reason[0].towns.Ozark === 1 && N.now.by_reason[1].key === 'price' && N.now.lost_after_yes === 0, N.now.by_reason);
  ck('...by owner: Krystal 5 inquiries (median 4 min, 1 reached, 1 never), Samantha 1 (90 min, reached, said yes)', N.now.by_owner[0].owner === 'Krystal' && N.now.by_owner[0].inquiries === 5 && N.now.by_owner[0].median_first_attempt_min === 4 && N.now.by_owner[0].never_attempted === 1 && N.now.by_owner[1].owner === 'Samantha' && N.now.by_owner[1].said_yes === 1 && N.now.by_owner[1].median_first_attempt_min === 90, N.now.by_owner);
  ck('the period before: 1 inquiry, 30 min', N.prior.inquiries === 1 && N.prior.median_first_attempt_min === 30, N.prior);
  ck('nothing at all → nulls, not zeros pretending', R.ownerNumbers([], HRS, { now:'2026-10-06T15:10:00Z' }).now.median_first_attempt_min === null && R.ownerNumbers([], HRS, { now:'2026-10-06T15:10:00Z' }).now.reached_24h_pct === null);
}

/* clean-up 6.2: ONE next per lead */
{
  const now = '2026-10-06T15:10:00Z';
  ck('no dates → no next', R.leadNext({}, now) === null);
  let n = R.leadNext({ follow_up_due:'2026-10-09', follow_up_time:'14:30', follow_up_note:'Did Genworth send the policy?' }, now);
  ck('a follow-up with a time: kind follow_up, at Fri 2:30 pm, not due, words "Follow up Fri 2:30 pm: Did Genworth…"', n.kind === 'follow_up' && n.at === '2026-10-09T19:30:00.000Z' && !n.due && R.nextWords(n, now) === 'Follow up Fri 2:30 pm: Did Genworth send the policy?', [n, R.nextWords(n, now)]);
  n = R.leadNext({ follow_up_due:'2026-10-03' }, now);
  ck('a late follow-up with no time: due, 9 am that day, words "Follow up"', n.due && n.at === '2026-10-03T14:00:00.000Z' && R.nextWords(n, now) === 'Follow up');
  n = R.leadNext({ follow_up_due:'2026-10-09', promised_callback_at:'2026-10-06T09:00:00', contact_events:[] }, now);
  ck('a promise outranks the follow-up; late: "Call back: we said 9 am (1 h 10 min late)"', n.kind === 'promise' && n.due && R.nextWords(n, now) === 'Call back: we said 9 am (1 h 10 min late)', R.nextWords(n, now));
  n = R.leadNext({ promised_callback_at:'2026-10-06T09:00:00', contact_events:[{ at:'2026-10-06T14:05:00Z', actor:'human', direction:'out', channel:'call', outcome:'voicemail' }], follow_up_due:'2026-10-09' }, now);
  ck('a promise we kept (a call after its time) drops away; the follow-up is next', n.kind === 'follow_up');
  n = R.leadNext({ waiting:{ reason:'state', since:'2026-09-20', check_back:'2026-10-12', note:'DCN in' }, follow_up_due:'2026-10-08' }, now);
  ck('a waiting check-back outranks a follow-up: "Check back Mon: the state · DCN in"', n.kind === 'check_back' && n.day === '2026-10-12' && R.nextWords(n, now) === 'Check back Mon: the state · DCN in', R.nextWords(n, now));
  n = R.leadNext({ waiting:{ reason:'family_decision', since:'2026-10-01', check_back:'2026-10-06' } }, now);
  ck('...on the day: "Check back day: family decision"', n.due && R.nextWords(n, now) === 'Check back day: family decision');
  const l = {};
  R.setNext(l, { kind:'follow_up', day:'2026-10-09', time:'14:30', why:'policy?' }, now);
  ck('setNext follow_up writes the three follow-up fields', l.follow_up_due === '2026-10-09' && l.follow_up_time === '14:30' && l.follow_up_note === 'policy?');
  R.setNext(l, { kind:'promise', day:'2026-10-07', time:'16:30' }, now);
  ck('setNext promise writes promised_callback_at as Central wall-clock and the follow-up day', l.promised_callback_at === '2026-10-07T16:30:00' && l.follow_up_due === '2026-10-07');
  const w = { waiting:{ reason:'state', since:'2026-09-20', check_back:'2026-10-12' } };
  R.setNext(w, { kind:'follow_up', day:'2026-10-20' }, now);
  ck('a follow-up on a waiting family moves its check-back', w.waiting.check_back === '2026-10-20' && w.follow_up_due === '2026-10-20');
  R.setNext(w, { kind:'check_back', day:'2026-10-22', why:'ask DSDS' }, now);
  ck('setNext check_back needs a waiting record and writes it', w.waiting.check_back === '2026-10-22' && w.waiting.note === 'ask DSDS');
  let threw = false; try{ R.setNext({}, { kind:'check_back', day:'2026-10-22' }); }catch(e){ threw = true; } ck('...and refuses without one', threw);
  R.setNext(l, { kind:'clear' }); ck('clear removes the follow-up (a promise is theirs and stays)', !l.follow_up_due && l.promised_callback_at === '2026-10-07T16:30:00');
}

/* clean-up 6.5: an AI draft waiting for approval is a Need-you-now row, not a second tab */
{
  const b = R.boardRow({ first_name:'Tom', first_human_contact_at:'2026-09-30T14:00:00Z', follow_up_due:'2026-10-09' }, CTX({ stage:'connected', drafts:['d1'] }));
  ck('a pending draft: Need you now rank 6.5, "Draft ready", Review draft first with the draft id', b.group === 'now' && b.rank === 6.5 && b.when.big === 'Draft ready' && b.primary.kind === 'draft' && b.primary.id === 'd1', b);
  ck('...without a draft the same lead is just Scheduled', R.boardRow({ first_name:'Tom', first_human_contact_at:'2026-09-30T14:00:00Z', follow_up_due:'2026-10-09' }, CTX({ stage:'connected' })).group === 'later');
}

/* clean-up 6.7: one status writer */
{
  const l = { id:'x' };
  ck('a new lead reads as New; setting New again changes nothing', R.setStatus(l, 'New', { by:'k' }) === false && !l.status_history);
  ck('New → Contacted: written with who, when and why', R.setStatus(l, 'Contacted', { by:'krystal@mo-care.com', why:'first real conversation', at:'2026-10-06T15:00:00Z' }) === true && l.status === 'Contacted' && l.status_history.length === 1 && l.status_history[0].from === 'New' && l.status_history[0].why === 'first real conversation');
  R.setStatus(l, 'Converted', { by:'k', at:'2026-10-07T15:00:00Z' });
  ck('→ Converted stamps converted_at once', l.converted_at === '2026-10-07T15:00:00Z' && (R.setStatus(l, 'Converted', {}) === false) && l.converted_at === '2026-10-07T15:00:00Z');
  const m = { status:'Contacted' };
  R.setStatus(m, 'Lost', { by:'k', why:'Price', at:'2026-10-07T16:00:00Z' });
  ck('→ Lost stamps lost_at; "not lost after all" knows what it was before', m.lost_at === '2026-10-07T16:00:00Z' && R.statusBeforeLost(m) === 'Contacted');
  R.setStatus(m, 'Contacted', { by:'k', why:'not lost after all', at:'2026-10-08T16:00:00Z' });
  ck('back from Lost: lost_undone_at stamped, history keeps both moves', m.lost_undone_at === '2026-10-08T16:00:00Z' && m.status_history.length === 2 && m.status === 'Contacted');
  let threw = false; try{ R.setStatus(m, 'Won'); }catch(e){ threw = true; } ck('an unknown status is refused', threw);
  ck('before Lost with no history: Contacted if a conversation happened, else New', R.statusBeforeLost({ first_human_contact_at:'x' }) === 'Contacted' && R.statusBeforeLost({}) === 'New');
}

/* follow-ups: started + yes → first shift, and the referral-partner scorecard */
{
  const Ls = [
    { id:'p1', created_at:'2026-09-20T15:00:00Z', first_human_attempt_at:'2026-09-20T15:04:00Z', first_human_contact_at:'2026-09-20T15:04:00Z', assessment_at:'2026-09-23T15:00:00Z', said_yes_at:'2026-09-25T15:00:00Z', status:'Converted', first_shift_at:'2026-09-29T13:00:00Z', referral_org_id:'org1', schedule:{ days:['Mon'], times:'', hours_per_week:20 } },
    { id:'p2', created_at:'2026-09-28T15:00:00Z', first_human_attempt_at:'2026-09-28T16:00:00Z', referral_org_id:'org1' },
    { id:'p3', created_at:'2026-09-30T15:00:00Z', first_human_attempt_at:'2026-09-30T15:02:00Z', first_human_contact_at:'2026-09-30T15:02:00Z', referral_source_name:'Dr. Patel office', status:'Assessment Scheduled' },
    { id:'p4', created_at:'2026-10-01T15:00:00Z', source:'Website' } ];
  const N = R.ownerNumbers(Ls, HRS, { now:'2026-10-06T15:10:00Z', days:30, orgs:{ org1:{ name:'Mercy Rehab', type:'Rehab / Skilled Nursing' } } });
  ck('started this period: 1, yes → first shift 4 days', N.now.started === 1 && N.now.yes_to_first_shift_median_days === 4, [N.now.started, N.now.yes_to_first_shift_median_days]);
  const mercy = N.now.by_partner[0], patel = N.now.by_partner[1];
  ck('partner scorecard: Mercy Rehab (Rehab / Skilled Nursing) sent 2, reached in 24 h 1, assessed 1, said yes 1, started 1, 9 days inquiry → start, 20 hrs/wk', mercy.name === 'Mercy Rehab' && mercy.type === 'Rehab / Skilled Nursing' && mercy.sent === 2 && mercy.reached_24h === 1 && mercy.assessed === 1 && mercy.said_yes === 1 && mercy.started === 1 && mercy.days_to_start_median === 9 && mercy.hours === 20, mercy);
  ck('...a typed referral name counts as a partner too; a website lead is not one', patel.name === 'Dr. Patel office' && patel.sent === 1 && patel.assessed === 1 && N.now.by_partner.length === 2, N.now.by_partner);
}

/* the lead workspace (screen 2, 2026-10-07): steps, timeline, script lines, can we staff it */
{
  const NOW = '2026-10-06T15:10:00Z', HRS = R.responseHours({});   /* Tue Oct 6, 10:10 am Chicago */
  const diane = { id:'d1', first_name:'Diane', last_name:'Teague', client_first_name:'Marjorie', client_last_name:'Teague', relationship:'daughter', source:'Website', client_city:'Nixa', funding_source:'private',
    desired_start:{ kind:'by_date', date:'2026-10-09' }, schedule:{ days:['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], times:'9 am-1 pm', hours_per_week:20 }, why_called:'Mom fell last week, needs help mornings',
    status:'Contacted', assigned_coordinator:'Krystal', created_at:'2026-10-06T02:52:00Z', ack_sent_at:'2026-10-06T02:52:10Z', ack_kind:'after_hours',
    first_human_attempt_at:'2026-10-06T13:12:00Z', family_last_reply_at:'2026-10-06T14:48:00Z',
    contact_events:[{ at:'2026-10-06T02:52:00Z', channel:'web', direction:'in', outcome:'inquiry', actor:'family', note:'Mom fell last week, needs help mornings' },
      { at:'2026-10-06T02:52:10Z', channel:'sms', direction:'out', outcome:'sent', actor:'automation', note:'acknowledgment' }, { at:'2026-10-06T02:52:11Z', channel:'email', direction:'out', outcome:'sent', actor:'automation', note:'acknowledgment' },
      { at:'2026-10-06T13:12:00Z', channel:'call', direction:'out', outcome:'voicemail', actor:'human', by:'krystal@mo-care.com', note:'left my name and the office number' },
      { at:'2026-10-06T14:48:00Z', channel:'sms', direction:'in', outcome:'received', actor:'family', ref:'Can someone call me after 4 today? I am at work until then.' }],
    comm_log:[{ body:'☎ call — voicemail: left my name and the office number', at:'2026-10-06T13:12:00Z', by:'krystal@mo-care.com' }] };
  const ctx = { now:NOW, today:'2026-10-06', hours:HRS, stage:'reaching_out', assessments:[], names:{ 'krystal@mo-care.com':'Krystal Land' }, me:'Krystal Land', scripts:{} };
  const st = R.steps(diane, ctx);
  ck('steps: New done (after hours ack), Reaching out done (voicemail, 1 try), Reached is NOW, Assessment not booked, Yes todo', st.map(s => s.key + ':' + s.state).join(' ') === 'new:done reaching:done reached:now assessment:todo yes:todo'
    && /auto-acknowledged immediately/.test(st[0].words) && st[1].words === 'voicemail 8:12 am · 1 try' && st[3].words === 'not booked' && st[4].words === 'then Getting ready', st);
  const st2 = R.steps(Object.assign({}, diane, { first_human_contact_at:'2026-10-06T21:15:00Z', said_yes_at:'2026-10-08T15:00:00Z' }), Object.assign({}, ctx, { assessments:[{ status:'Scheduled', visit_date:'2026-10-07' }] }));
  ck('...after a talk, a booked visit and the yes: Reached done, Assessment "booked tomorrow", Yes done "Thu"', st2[2].done && st2[3].words === 'booked tomorrow' && st2[4].done && st2[4].words === 'Thu', st2.map(s => s.words));
  ck('...a lost lead has no NOW step', R.steps(Object.assign({}, diane, { status:'Lost' }), ctx).every(s => s.state !== 'now'));
  const tl = R.timeline(diane, ctx);
  ck('timeline newest first: her text, the voicemail, the clock opening, the acknowledgment (text and email, once), the inquiry (with her words); the comm_log copy of the call is not repeated',
    tl.map(x => x.kind).join(' ') === 'family try clock auto inquiry' && tl[0].sub.indexOf('after 4 today') > -1 && tl[1].text === 'Krystal called · voicemail' && tl[2].sub === 'first call due 8:05 am'
    && tl[3].text === 'Acknowledged by the Hub by text and email' && tl[4].text === 'Inquiry from Website · to Krystal' && tl[4].sub === 'Mom fell last week, needs help mornings', tl);
  const lostL = Object.assign({}, diane, { status_history:[{ at:'2026-10-06T15:00:00Z', from:'Contacted', to:'Lost', by:'krystal@mo-care.com', why:'Price' }], said_yes_at:null });
  ck('...a Lost move shows who and why; the automatic New → Contacted move is not listed', R.timeline(lostL, ctx)[0].text === 'Marked lost by Krystal' && R.timeline(lostL, ctx)[0].sub === 'Price'
    && !R.timeline(Object.assign({}, diane, { status_history:[{ at:'2026-10-06T15:00:00Z', from:'New', to:'Contacted', by:'k', why:'first real conversation' }] }), ctx).some(x => x.kind === 'stage'));
  /* script lines follow the board row */
  const row = R.boardRow(diane, ctx);
  const sc = R.scriptFor(diane, row, ctx);
  ck('she replied → the "They replied" line, filled in', row.reason === 'replied' && sc.key === 'replied' && /^Hi Diane, thank you for getting back to me/.test(sc.text) && !sc.custom, sc);
  const fresh = { id:'n1', first_name:'Patrice', client_first_name:'Ruth Ann', source:'Website', created_at:'2026-10-06T15:00:00Z', status:'New', referral_source_name:'' };
  const sc2 = R.scriptFor(fresh, R.boardRow(fresh, Object.assign({}, ctx, { stage:'new' })), ctx);
  ck('a new website inquiry → the first-call line with her name, the client, and me; the website hint', sc2.key === 'first_call' && sc2.text.indexOf('Hi Patrice, this is Krystal with Caring Companions. Thank you for reaching out about care for Ruth Ann.') === 0 && /website form/.test(sc2.hint), sc2);
  const sc3 = R.scriptFor(fresh, R.boardRow(fresh, Object.assign({}, ctx, { stage:'new' })), Object.assign({}, ctx, { scripts:{ first_call:'Hey {first}! {me} here.' } }));
  ck('...Settings can replace a line; fill-ins still work', sc3.text === 'Hey Patrice! Krystal here.' && sc3.custom, sc3);
  const waitL = Object.assign({}, diane, { family_last_reply_at:null, contact_events:diane.contact_events.slice(0, 4), first_human_contact_at:'2026-10-02T15:00:00Z', funding_source:'medicaid', waiting:{ reason:'state', since:'2026-10-01', check_back:'2026-10-13', note:'' } });
  const sc4 = R.scriptFor(waitL, R.boardRow(waitL, Object.assign({}, ctx, { stage:'deciding' })), ctx);
  ck('waiting on the state → the state check-back line plus the "check Fusion first" hint', sc4.key === 'check_back_state' && /Medicaid authorization for Marjorie/.test(sc4.text) && /Fusion/.test(sc4.hint), sc4);
  const asmL = Object.assign({}, waitL, { waiting:null, funding_source:'private', assessment_at:null });
  const sc5 = R.scriptFor(asmL, R.boardRow(asmL, Object.assign({}, ctx, { stage:'assessment', assessments:[{ status:'Scheduled', visit_date:'2026-10-08' }] })), Object.assign({}, ctx, { assessments:[{ status:'Scheduled', visit_date:'2026-10-08' }] }));
  ck('a booked visit → the confirmation line with the day', sc5.key === 'asmt_booked' && /confirming our visit Thu at the home/.test(sc5.text), sc5);
  ck('no em dash in any default line or hint', !Object.values(R.SCRIPT_DEFAULT).join(' ').includes('—') && !JSON.stringify(sc.hint + sc2.hint + sc4.hint).includes('—'));
  ck('every editable key has a label and a default', R.SCRIPT_KEYS.every(k => R.SCRIPT_LABEL[k] && R.SCRIPT_DEFAULT[k]));
  /* can we staff it */
  const people = [{ name:'A', town:'Nixa', windows:{ mon:['morning'], tue:['morning'], wed:['morning'], thu:['morning'], fri:['morning'] } }, { name:'B', town:'Ozark', windows:{ mon:['morning', 'afternoon'], tue:['morning'], wed:['morning'], thu:['morning'], fri:['morning'], sat:['morning'] } },
    { name:'C', town:'Nixa', windows:{ mon:['evening'], tue:['evening'] } }, { name:'D', town:'', windows:{} }];
  const look = R.staffingLook(diane, people);
  ck('Mon–Fri 9 am-1 pm in Nixa → 2 of 3 with availability fit, 1 in Nixa', look.asked && look.count === 2 && look.same_town === 1 && look.total === 3 && look.words === '2 caregivers say they are available Mon–Fri mornings · 1 in Nixa · of 3 with availability on file', look);
  ck('times parse: "9 am-1 pm" = mornings (10 to 3 = mornings + daytimes); "evenings" by word; "7-11" with no am/pm = mornings; nonsense = null', JSON.stringify(R.timeCats('9 am-1 pm')) === '["morning"]' && JSON.stringify(R.timeCats('10 am to 3 pm')) === '["morning","afternoon"]' && JSON.stringify(R.timeCats('evenings')) === '["evening"]' && JSON.stringify(R.timeCats('7-11')) === '["morning"]' && R.timeCats('flexible') === null);
  ck('no schedule asked → says so; nobody on file → says so; nobody fits → says it takes a conversation', !R.staffingLook({}, people).asked && /No schedule asked/.test(R.staffingLook({}, people).words) && /No caregiver availability/.test(R.staffingLook(diane, []).words)
    && /Nobody has said they are available Mon–Fri mornings/.test(R.staffingLook(Object.assign({}, diane, { schedule:{ days:['Sat', 'Sun'], times:'overnight' } }), people).words.replace('Weekends overnights', 'Mon–Fri mornings')));
}

/* speed to lead: the 5 / 15 / 30 rungs (item 2, her "yes to all" 2026-10-07) */
{
  const HRS = R.responseHours({}), nu = { id:'n', first_name:'Nina', created_at:'2026-10-06T14:40:00Z', status:'New', assigned_coordinator:'Krystal' };
  const due = (l, now, settings) => R.rungsDue(l, { now, hours:HRS, settings }).map(r => r.level).join(',');
  ck('4 minutes: nothing; 6: the owner; 16: owner and backup; 31: all three (defaults 5 / 15 / 30)', due(nu, '2026-10-06T14:44:00Z') === '' && due(nu, '2026-10-06T14:46:00Z') === 'owner' && due(nu, '2026-10-06T14:56:00Z') === 'owner,backup' && due(nu, '2026-10-06T15:11:00Z') === 'owner,backup,manager');
  const st = R.stampRung(JSON.parse(JSON.stringify(nu)), 'owner', { to:'kry@mo-care.com', sent:true }, '2026-10-06T14:46:00Z');
  ck('a stamped rung never fires again; the others still do', due(st, '2026-10-06T15:11:00Z') === 'backup,manager' && st.rungs.owner_to === 'kry@mo-care.com' && st.rungs.owner_sent === true);
  ck('a human attempt stops the clock; lost, said yes, archived, spam never ring', due(Object.assign({}, nu, { first_human_attempt_at:'2026-10-06T14:50:00Z' }), '2026-10-06T15:11:00Z') === '' && due(Object.assign({}, nu, { status:'Lost' }), '2026-10-06T15:11:00Z') === ''
    && due(Object.assign({}, nu, { said_yes_at:'x' }), '2026-10-06T15:11:00Z') === '' && due(Object.assign({}, nu, { archived:true }), '2026-10-06T15:11:00Z') === '' && due(Object.assign({}, nu, { spam:{ at:'x' } }), '2026-10-06T15:11:00Z') === '');
  ck('after hours the clock has not started: nothing rings at 9:30pm; a day-old inquiry is the 24-hour alert\'s, not a rung', due(Object.assign({}, nu, { created_at:'2026-10-07T02:10:00Z' }), '2026-10-07T02:30:00Z') === '' && due(Object.assign({}, nu, { created_at:'2026-10-04T14:00:00Z' }), '2026-10-06T15:11:00Z') === '');
  ck('the 15 and 30 are Settings; nonsense falls back; the manager is always after the backup', JSON.stringify(R.rungSettings({ lead_rungs:{ backup_min:10, manager_min:20 } })) === '{"backup_min":10,"manager_min":20}' && JSON.stringify(R.rungSettings({})) === '{"backup_min":15,"manager_min":30}'
    && JSON.stringify(R.rungSettings({ lead_rungs:{ backup_min:'abc', manager_min:3 } })) === '{"backup_min":15,"manager_min":30}' && R.rungSettings({ lead_rungs:{ backup_min:40, manager_min:30 } }).manager_min === 41);
  const m = R.stampRung(JSON.parse(JSON.stringify(nu)), 'manager', { to:'sam@mo-care.com', owner:'kry@mo-care.com', minutes:30 }, '2026-10-06T15:11:00Z');
  ck('the 30-minute rung counts a miss against the owner, once', m.speed_miss && m.speed_miss.owner === 'kry@mo-care.com' && m.speed_miss.minutes === 30 && R.stampRung(m, 'manager', { owner:'other' }).speed_miss.owner === 'kry@mo-care.com');
  const tl = R.timeline(st, { now:'2026-10-06T15:11:00Z', hours:HRS, names:{ 'kry@mo-care.com':'Krystal Land' } });
  ck('the workspace timeline shows the rung: "Texted Krystal at 5 minutes, nobody had called"', tl.some(x => x.text === 'Texted Krystal at 5 minutes, nobody had called'), tl);
}

/* item 3: referral subtype, the two flags, the partner loop (2026-10-07) */
{
  const org = { id:'o1', name:'Mercy Rehab', type:'Rehab / Skilled Nursing', people:'Jan Ortiz (discharge planner), Bo Li (SW)', email:'referrals@mercy.org' };
  const base = { id:'x', first_name:'Diane', client_first_name:'Marjorie', client_last_name:'Teague', referral_org_id:'o1', desired_start:{ kind:'by_date', date:'2026-10-08' }, schedule:{ days:['Sat', 'Sun'], times:'overnight' }, status:'Contacted', first_human_contact_at:'2026-10-06T14:00:00Z', source:'Referral' };
  const C = { today:'2026-10-06', now:'2026-10-06T15:10:00Z', org, assessments:[], me:'Krystal Land', hours:R.responseHours({}), stage:'connected' };
  ck('subtype: stamped wins; else read from the partner record (rehab → snf_rehab, hospital, physician/hospice → case manager, senior center → community); a website lead has none', R.referralSubtype({ referral_subtype:'apfm' }, org) === 'apfm' && R.referralSubtype(base, org) === 'snf_rehab' && R.referralSubtype({}, { type:'Hospital' }) === 'hospital' && R.referralSubtype({}, { type:'Hospice' }) === 'case_manager' && R.referralSubtype({}, { type:'Senior Center / Community' }) === 'community' && R.referralSubtype({ source:'Website' }, null) === '');
  const people = [{ name:'A', windows:{ mon:['morning'] } }, { name:'B', windows:{ sat:['overnight'], sun:['overnight'] } }];
  const F = R.flags(base, Object.assign({}, C, { people }));
  ck('flags: a rehab discharge who needs care by Thu → urgent_discharge (red); weekends overnights finding one caregiver → staffing_risk (amber)', F.map(f => f.key).join() === 'urgent_discharge,staffing_risk' && F[0].text === 'Rehab discharge: needs care by Thu' && F[0].tone === 'bad' && F[1].text === 'Staffing risk: 1 caregiver available Weekends overnights' && F[1].tone === 'warn', F);
  ck('...the discharge flag ends once the assessment is done; the staffing flag ends once a plan is linked (pre-matched); a planning-ahead family is never a discharge', !R.flags(base, Object.assign({}, C, { people, assessments:[{ status:'Scheduled', visit_date:'2026-10-05' }] })).some(f => f.key === 'urgent_discharge')
    && !R.flags(base, Object.assign({}, C, { people, pre_matched:true })).some(f => f.key === 'staffing_risk') && !R.flags(Object.assign({}, base, { desired_start:{ kind:'planning' } }), Object.assign({}, C, { people })).some(f => f.key === 'urgent_discharge'));
  const row = R.boardRow(base, Object.assign({}, C, { people, stage:'connected' }));
  ck('the board: the discharge outranks an ordinary urgent start (4.5, red, "rehab discharge, assessment not booked") and both flags are chips on the row', row.reason === 'urgent_start' && row.rank === 4.5 && row.when.tone === 'red' && row.when.sub === 'rehab discharge, assessment not booked' && row.chips.some(c => c.key === 'urgent_discharge') && row.chips.some(c => c.key === 'staffing_risk'), row);
  /* the partner loop */
  let pl = R.partnerLoop(base, C);
  ck('partner loop: Mercy Rehab (rehab / skilled nursing, professional); we reached the family → the receipt is due, in her words with Jan, Marjorie Teague, Diane and Krystal', pl.partner.name === 'Mercy Rehab' && pl.partner.professional && pl.due.length === 1 && pl.due[0].kind === 'receipt' && pl.due[0].text === 'Hi Jan, this is Krystal with Caring Companions. Thank you for sending Marjorie Teague our way. We reached Diane today and are setting up a time to visit the home. I will keep you posted.', pl);
  pl = R.partnerLoop(base, Object.assign({}, C, { assessments:[{ status:'Scheduled', visit_date:'2026-10-07' }] }));
  ck('...a booked visit adds the assessment line ("set for tomorrow")', pl.due.map(d => d.kind).join() === 'receipt,assessment' && /assessment is set for tomorrow/.test(pl.due[1].text), pl.due);
  const sent = R.recordPartnerMsg(JSON.parse(JSON.stringify(base)), { kind:'receipt', channel:'email', to:'Mercy Rehab', text:'...', by:'kry@mo-care.com' }, '2026-10-06T15:00:00Z');
  ck('a sent message is recorded on the inquiry and is no longer due; the timeline shows "Krystal emailed Mercy Rehab: we reached the family"', !R.partnerLoop(sent, C).due.some(d => d.kind === 'receipt') && R.partnerLoop(sent, C).sent.length === 1 && R.timeline(sent, { now:C.now, names:{ 'kry@mo-care.com':'Krystal Land' } }).some(x => x.text === 'Krystal emailed Mercy Rehab: we reached the family'), R.timeline(sent, { now:C.now }).map(x => x.text));
  ck('the outcome: said yes → "chose Caring Companions"; lost for price → "did not start with us (price)"', /Marjorie Teague chose Caring Companions, and we are getting ready to start/.test(R.partnerLoop(Object.assign({}, base, { said_yes_at:'2026-10-06T16:00:00Z' }), C).due.find(d => d.kind === 'outcome_started').text)
    && /care did not start with us \(price\)/.test(R.partnerLoop(Object.assign({}, base, { status:'Lost', lost_reason_key:'price' }), C).due.find(d => d.kind === 'outcome_lost').text));
  const med = Object.assign({}, base, { funding_source:'medicaid', waiting:{ reason:'state', since:'2026-09-25', check_back:'2026-10-13' } });
  ck('weekly to a professional while Medicaid is pending: due after 7 days (11 days with the state), not again within 7 days of the last message, never to a community referrer', R.partnerLoop(med, C).due.some(d => d.kind === 'weekly' && /11 days so far/.test(d.text))
    && !R.partnerLoop(R.recordPartnerMsg(JSON.parse(JSON.stringify(med)), { kind:'weekly' }, '2026-10-03T15:00:00Z'), C).due.some(d => d.kind === 'weekly') && !R.partnerLoop(med, Object.assign({}, C, { org:Object.assign({}, org, { type:'Senior Center / Community' }) })).due.some(d => d.kind === 'weekly'));
  ck('Settings can replace a partner line; no partner → nothing', R.partnerLoop(base, Object.assign({}, C, { templates:{ receipt:'Hey {partner}, got {client}.' } })).due[0].text === 'Hey Jan, got Marjorie Teague.' && R.partnerLoop({ first_name:'X', source:'Website' }, Object.assign({}, C, { org:null })).partner === null);
  ck('no em dash in any partner line', !Object.values(R.PARTNER_DEFAULT).join(' ').includes('—') && R.PARTNER_KINDS.every(k => R.PARTNER_LABEL[k] && R.PARTNER_DEFAULT[k]));
}

/* item 4: the owners' funnel, by source, the team columns, the Medicaid pipeline, missing required (2026-10-07) */
{
  const HRS = R.responseHours({}), NOW = '2026-10-06T15:10:00Z';
  const L = [
    { id:'a', created_at:'2026-10-01T15:00:00Z', source:'Website', first_human_attempt_at:'2026-10-01T15:03:00Z', first_human_contact_at:'2026-10-01T16:00:00Z', assessment_at:'2026-10-03T15:00:00Z', said_yes_at:'2026-10-04T15:00:00Z', status:'Converted', converted_at:'2026-10-04T15:00:00Z', first_shift_at:'2026-10-06T13:00:00Z', schedule:{ days:['Mon'], hours_per_week:10 }, assigned_coordinator:'Krystal', rungs:{ owner_at:'2026-10-01T15:05:00Z' }, speed_miss:{ owner:'kry@mo-care.com', minutes:30 }, comm_log:[{ kind:'owner', body:'Angiel took this inquiry from Krystal' }] },
    { id:'b', created_at:'2026-10-02T15:00:00Z', source:'Referral', referral_subtype:'hospital', funding_source:'medicaid', waiting:{ reason:'state', since:'2026-08-15', check_back:'2026-10-13' }, first_human_contact_at:'2026-10-02T16:00:00Z', assigned_coordinator:'Angiel', schedule:{ days:['Mon'], hours_per_week:20 }, client_first_name:'Ruth', why_called:'x', desired_start:{ kind:'asap' }, contact_events:[{ at:'2026-10-05T15:00:00Z', actor:'human', direction:'out', channel:'call', outcome:'voicemail' }] },
    { id:'c', created_at:'2026-10-03T15:00:00Z', source:'Phone', funding_source:'medicaid', state_status:'submitted', state_submitted:'2026-10-01', first_human_contact_at:'2026-10-03T16:00:00Z', assigned_coordinator:'Angiel' },
    { id:'s', created_at:'2026-10-05T15:00:00Z', spam:{ at:'x' } } ];
  const N = R.ownerNumbers(L, HRS, { now:NOW, names:{ 'kry@mo-care.com':'Krystal Land' } }).now;
  ck('funnel for the period\'s inquiries: 3 → contacted 3 → assessed 1 → won 1 → started 1 (spam never counts)', JSON.stringify(N.funnel) === '{"inquiries":3,"contacted":3,"assessed":1,"won":1,"started":1}', N.funnel);
  ck('by source: Website (won, started, 10 hrs), Referral · Hospital (the subtype), Phone', N.by_source.map(r => r.source).join('|') === 'Website|Referral · Hospital|Phone' && N.by_source[0].started === 1 && N.by_source[0].hours === 10 && N.by_source[1].contacted === 1, N.by_source);
  const k = N.by_owner.find(o => o.owner === 'Krystal'), an = N.by_owner.find(o => o.owner === 'Angiel');
  ck('the team: Krystal late 1 (the 5-minute text went), 1 miss (by email, folded to her first name); Angiel took 1 as backup', k.late === 1 && k.misses === 1 && k.took === 0 && an.took === 1 && an.misses === 0, [k, an]);
  const M = R.medicaidPipeline(L, '2026-10-06', NOW);
  ck('Medicaid pipeline now: 2 waiting on the state (a waiting record, or submitted), 1 heard from us this week, 1 over 45 days (52), 20 hrs/wk, nobody offered bridge hours yet', M.waiting === 2 && M.checked_in_week === 1 && M.over_45 === 1 && M.hours_week === 20 && M.bridge_offered === 0 && M.long_days === 45, M);
  const MR = R.missingRequired(L);
  ck('missing required: only c (deciding, nothing asked) counts, against Angiel; b has what its stage needs; the converted one is not counted', MR.count === 1 && MR.by_owner.Angiel === 1 && MR.rows[0].id === 'c', MR);
}

/* item 5: the small rules (2026-10-07) */
{
  const C = { today:'2026-10-06', now:'2026-10-06T15:10:00Z', hours:R.responseHours({}), assessments:[], stage:'connected', me:'Krystal Land' };
  const base = { id:'x', first_name:'Diane', client_first_name:'Marjorie', created_at:'2026-09-20T15:00:00Z', first_human_contact_at:'2026-09-25T15:00:00Z', status:'Contacted', desired_start:{ kind:'this_month' } };
  ck('decision over 7 days with no reason → the board asks for one (Waiting on… first, Mark lost… beside it), rank 6.8', R.decisionStale(base, C).days === 11 && R.boardRow(base, C).reason === 'decision_stale' && R.boardRow(base, C).primary.kind === 'waiting' && R.boardRow(base, C).secondary.some(a => a.kind === 'lost'));
  ck('...a waiting reason, a promise or a booked visit is a reason', !R.decisionStale(Object.assign({}, base, { waiting:{ reason:'family_decision', since:'2026-10-01', check_back:'2026-10-13' } }), C) && !R.decisionStale(Object.assign({}, base, { promised_callback_at:'2026-10-08T15:00:00' }), C) && !R.decisionStale(base, Object.assign({}, C, { assessments:[{ status:'Scheduled', visit_date:'2026-10-08' }] })));
  const soon = Object.assign({}, base, { desired_start:{ kind:'this_week' }, first_human_contact_at:'2026-09-30T15:00:00Z' });
  ck('assessment overdue by urgency: this week (target 5 days) talked 6 days ago with nothing booked → overdue; planning ahead (14) is not', R.assessmentOverdue(soon, C) && R.assessmentOverdue(soon, C).target === 5 && R.boardRow(soon, C).reason === 'asmt_overdue' && !R.assessmentOverdue(Object.assign({}, soon, { desired_start:{ kind:'planning' } }), C), R.assessmentOverdue(soon, C));
  ck('...targets: today/tomorrow 1 day, within 3 days 2, within 2 weeks 5, later 14', JSON.stringify(R.ASMT_TARGET_DAYS) === '{"0":1,"1":2,"2":5,"3":14,"4":14}');
  const ro = (n, lastAt) => ({ id:'r', first_name:'Pat', created_at:'2026-10-05T15:00:00Z', status:'Contacted', first_human_attempt_at:'2026-10-05T16:00:00Z', contact_events:Array.from({ length:n }, (_, i) => ({ at:i === n - 1 ? lastAt : '2026-10-05T16:00:00Z', actor:'human', direction:'out', channel:'call', outcome:'voicemail' })) });
  ck('cadence (a suggestion, never a message): 1 try this morning → later today 1 pm; 2 → day 1; 3 → day 3; 4 → day 7; 5 → park as unable to reach', R.cadenceNext(ro(1, '2026-10-06T14:00:00Z'), C).time === '13:00' && R.cadenceNext(ro(1, '2026-10-06T14:00:00Z'), C).step === 'later today'
    && R.cadenceNext(ro(2, '2026-10-06T14:00:00Z'), C).day === '2026-10-07' && R.cadenceNext(ro(3, '2026-10-06T14:00:00Z'), C).day === '2026-10-08' && R.cadenceNext(ro(4, '2026-10-06T14:00:00Z'), C).day === '2026-10-10' && R.cadenceNext(ro(5, '2026-10-06T14:00:00Z'), C).step === 'park', [R.cadenceNext(ro(2, '2026-10-06T14:00:00Z'), C), R.cadenceNext(ro(4, '2026-10-06T14:00:00Z'), C)]);
  const rr = R.boardRow(ro(1, '2026-10-06T14:00:00Z'), Object.assign({}, C, { stage:'reaching_out' }));
  ck('...on the board the No-next-step row says the suggestion and the follow-up button carries it (1 pm today)', /Try again later today/.test(rr.next.text) && rr.secondary.some(a => a.kind === 'followup' && a.suggest && a.suggest.day === '2026-10-06' && a.suggest.time === '13:00'), rr);
  ck('...five tries: the row offers Waiting on… (park)', R.boardRow(ro(5, '2026-10-06T14:00:00Z'), Object.assign({}, C, { stage:'reaching_out' })).primary.kind === 'waiting');
  const med = { id:'m', first_name:'Lou', client_first_name:'Ruth', funding_source:'medicaid', status:'Contacted', first_human_contact_at:'2026-08-10T15:00:00Z', waiting:{ reason:'state', since:'2026-08-15', check_back:'2026-10-13' } };
  const mr = R.boardRow(med, Object.assign({}, C, { stage:'deciding' }));
  ck('45 days with the state (52): red, call the case manager and offer bridge hours; outranks the 21-day DSDS row', mr.reason === 'medicaid_45' && mr.when.tone === 'red' && /offer private bridge hours/.test(mr.when.sub) && mr.secondary.map(a => a.kind).join() === 'case_manager,bridge', mr);
  ck('...bridge hours offered: the offer button goes, the call stays; the case manager called this week: quiet for 7 days (back to the DSDS 21-day row)', R.boardRow(Object.assign({}, med, { bridge_hours_offered_at:'2026-10-01T15:00:00Z' }), Object.assign({}, C, { stage:'deciding' })).secondary.map(a => a.kind).join() === 'case_manager'
    && R.boardRow(Object.assign({}, med, { case_manager_called_at:'2026-10-05T15:00:00Z' }), Object.assign({}, C, { stage:'deciding' })).reason === 'dsds_21');
  ck('the yes handoff: carried forward reads source → reached → yes · payer · start; the thank-you text is in her words with Diane, Marjorie, Krystal', R.carriedForward(Object.assign({}, base, { source:'Website', said_yes_at:'2026-10-06T14:00:00Z', funding_source:'private' }), C) === 'Website Sep 20 → reached Sep 25 → yes today · Private pay · wants care this month'
    && /^Hi Diane, thank you for choosing Caring Companions for Marjorie\. I am Krystal, your Care Coordinator/.test(R.yesThanks(base, C)) && R.SCRIPT_KEYS.indexOf('yes_thanks') > -1 && !R.SCRIPT_DEFAULT.yes_thanks.includes('—'));
}

/* the Hub page and the server run the same file */
const serverCopy = path.join(__dirname, '..', '..', 'Staffing-Coordinator-Hub', 'supabase', 'functions', '_shared', 'lead-rules.js');
ck('the Hub page and the server run the same lead-rules.js', fs.existsSync(serverCopy) && fs.readFileSync(serverCopy, 'utf8') === fs.readFileSync(path.join(__dirname, '..', 'lead-rules.js'), 'utf8'));

console.log(pass + ' passed, ' + fail + ' failed');
process.exitCode = fail ? 1 : 0;

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
ck('compose builds the objects, keeps the old radio untouched, drops the helper keys, ends waiting', l1.desired_start.kind === 'by_date' && l1.desired_start.date === '2026-10-10' && l1.urgency === '7days'
  && l1.schedule.days.join() === 'Mon,Wed' && l1.schedule.hours_per_week === 8 && l1.days_needed === 'Mon/Wed' && l1.first_name === 'Pat' && !('desired_start_kind' in l1) && !('schedule_days' in l1) && l1.waiting === null && l1.waiting_ended === undefined, l1);
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

/* the Hub page and the server run the same file */
const serverCopy = path.join(__dirname, '..', '..', 'Staffing-Coordinator-Hub', 'supabase', 'functions', '_shared', 'lead-rules.js');
ck('the Hub page and the server run the same lead-rules.js', fs.existsSync(serverCopy) && fs.readFileSync(serverCopy, 'utf8') === fs.readFileSync(path.join(__dirname, '..', 'lead-rules.js'), 'utf8'));

console.log(pass + ' passed, ' + fail + ' failed');
process.exitCode = fail ? 1 : 0;

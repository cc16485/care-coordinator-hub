// Who approves a write-up (Samantha 2026-11-17: Care Coordinators send write-ups, Samantha oversees). node tests/writeup-rules-test.js
const W = require('../writeup-rules.js');
const res = []; const ck = (n, c, d) => res.push([n, !!c, c ? '' : JSON.stringify(d === undefined ? '' : d).slice(0, 500)]);
const NOW = '2026-10-17T18:00:00Z';
const SAM = { email: 'samantha@mo-care.com', owner: true, team: true };
const ZACH = { email: 'zach@mo-care.com', owner: true, team: true };
const KRYSTAL = { email: 'krystal@mo-care.com', owner: false, team: true };
const ANGIEL = { email: 'angiel@mo-care.com', owner: false, team: true };
const STAFFING = { email: 'staffing@mo-care.com', owner: false, team: false };
const wu = (level, extra) => Object.assign({ id: 'x' + Math.random(), caregiver: 'Pat Sample', axiscare_caregiver_id: '77', level, status: 'pending_approval', created_by: 'the Hub (missed notes)',
  facts_checked_at: '2026-10-18', handbook: { section: '2U Attendance & Dependability' }, explanation: { asked_on: '2026-10-17', how: 'phone', text: 'Car trouble' }, protected: [] }, extra || {});
const can = (a, who, all) => W.canApprove(a, who, all || [a], NOW);

// 2026-11-17: coaching and verbal warnings are a Care Coordinator's to decide; everything else is Samantha's alone.
for (const lv of ['Coaching', 'Verbal Warning']) {
  const a = wu(lv);
  ck(lv + ': a Care Coordinator decides it', W.tier(a) === 'team' && can(a, KRYSTAL).ok && can(a, ANGIEL).ok);
  ck(lv + ': the Staffing Coordinator cannot', !can(a, STAFFING).ok && /Care Coordinator or Samantha/.test(can(a, STAFFING).why), can(a, STAFFING));
  ck(lv + ': Samantha can', can(a, SAM).ok);
  ck(lv + ': whoApproves names a Care Coordinator', W.whoApproves(a) === 'a Care Coordinator (Samantha sees it)');
  ck(lv + ': a coordinator may decide one she started', can(wu(lv, { created_by: 'krystal', created_by_email: 'krystal@mo-care.com' }), KRYSTAL).ok);
}
for (const lv of ['Written Warning', 'Final Written Warning', 'Suspension', 'Termination Review', 'Something new', '']) {
  const a = wu(lv);
  ck((lv || 'no level') + ': Samantha decides', W.tier(a) === 'leadership' && W.whoApproves(a) === 'Samantha');
  ck((lv || 'no level') + ': a Care Coordinator cannot, and is told to send it to Samantha', !can(a, KRYSTAL).ok && /Samantha approves/.test(can(a, KRYSTAL).why), can(a, KRYSTAL));
  ck((lv || 'no level') + ': Zach cannot (no longer the HR lead)', !can(a, ZACH).ok, can(a, ZACH));
  ck((lv || 'no level') + ': Samantha can', can(a, SAM).ok);
}

// protected situations: Samantha's at every level
for (const k of ['leave', 'accommodation', 'injury', 'discrimination', 'retaliation', 'legal']) {
  const v = wu('Verbal Warning', { protected: [k] });
  ck(k + ': a verbal warning goes to Samantha, not the coordinator', !can(v, KRYSTAL).ok && /Send this to Samantha/.test(can(v, KRYSTAL).why) && W.whoApproves(v) === 'Samantha', can(v, KRYSTAL));
  ck(k + ': ...Samantha can approve it', can(v, SAM).ok);
  ck(k + ': ...a termination too', can(wu('Termination Review', { protected: [k] }), SAM).ok && !can(wu('Termination Review', { protected: [k] }), ZACH).ok);
}
const pw = wu('Written Warning', { protected: ['injury', 'retaliation'] });
const pv = wu('Coaching', { protected: ['injury', 'retaliation'] });
ck('the coordinator is told the situations in words', /an injury or workers' comp, a retaliation concern/.test(can(pv, KRYSTAL).why), can(pv, KRYSTAL).why);
ck('...an unknown marker still goes to Samantha (fails closed)', !can(wu('Coaching', { protected: ['something else'] }), KRYSTAL).ok);
ck('...an empty list is a routine case', can(wu('Coaching', { protected: [] }), KRYSTAL).ok);
ck('the consult flag is never set now (older callers)', !can(pw, KRYSTAL).consult && !can(pv, KRYSTAL).consult);
ck('no email, no approval', !W.canApprove(wu('Coaching'), { email: '', owner: true }).ok);
ck('an owner flag with another email is not Samantha', !can(wu('Written Warning'), { email: 'other@mo-care.com', owner: true, team: true }).ok);
ck('Samantha\'s email without the owner role is not enough', !can(wu('Written Warning'), { email: SAM.email, owner: false, team: true }).ok);
ck('startedBy still reads older drafts that kept only the name', W.startedBy(wu('Verbal Warning', { created_by: 'krystal' }), 'Krystal@mo-care.com'));

// second written warning wording is kept
const prior = wu('Written Warning', { status: 'issued', issued_at: '2026-06-01T12:00:00Z' });
const second = wu('Written Warning');
ck('a second written warning inside 12 months is still called that', W.levelWords(second, [prior, second], NOW) === 'second written warning');
ck('...one issued over 12 months ago does not count', W.levelWords(second, [wu('Written Warning', { status: 'issued', issued_at: '2025-06-01T12:00:00Z' }), second], NOW) === 'written warning');

// routing: Samantha is the HR lead
const whoFor = e => ({ 'krystal@mo-care.com': KRYSTAL, 'samantha@mo-care.com': SAM, 'zach@mo-care.com': ZACH })[e] || { email: e };
const order = [W.HR_LEAD, 'zach@mo-care.com'];
ck('routing: a written warning goes to Samantha', W.approverFor(wu('Written Warning'), order, whoFor, [], NOW) === SAM.email);
ck('routing: never to Zach', W.approverFor(wu('Written Warning'), ['zach@mo-care.com'], whoFor, [], NOW) === '');
ck('routing: a protected verbal warning goes to Samantha', W.approverFor(wu('Verbal Warning', { protected: ['leave'] }), ['krystal@mo-care.com'].concat(order), whoFor, [], NOW) === SAM.email);
ck('the HR lead, the firing approver and the consult are all Samantha', W.HR_LEAD === SAM.email && W.FIRING_APPROVERS.join() === SAM.email && W.CONSULT_WITH === SAM.email && W.OWNER_APPROVER === SAM.email);

// short notice (ruling 5, handbook 2A/2U)
const ci = (o) => Object.assign({ type: 'callin', shift_date: '2026-10-20', shift_time: '08:00' }, o);
ck('short notice: 2h notice is short', W.shortNotice(ci({ notice_hours: 2, reported_at: '2026-10-20T06:00' }), 4).kind === 'hours');
ck('...4h exactly is not short (by hours)', !W.shortNotice(ci({ shift_time: '13:00', notice_hours: 4, reported_at: '2026-10-20T09:00' }), 4).short);
ck('early shift: a call at 7 PM the night before an 8 AM shift is short (13h looks fine)', W.shortNotice(ci({ notice_hours: 13, reported_at: '2026-10-19T19:00' }), 4).kind === 'early');
ck('...a call at 4:30 PM the day before is fine', !W.shortNotice(ci({ notice_hours: 15.5, reported_at: '2026-10-19T16:30' }), 4).short);
ck('...5:00 PM exactly is fine', !W.shortNotice(ci({ notice_hours: 15, reported_at: '2026-10-19T17:00' }), 4).short);
ck('...7:00 AM and 9:00 AM shifts are both covered', W.shortNotice(ci({ shift_time: '07:00', notice_hours: 12, reported_at: '2026-10-19T19:00' }), 4).short && W.shortNotice(ci({ shift_time: '09:00', notice_hours: 14, reported_at: '2026-10-19T19:00' }), 4).short);
ck('...a 9:30 AM shift is not an early shift', !W.shortNotice(ci({ shift_time: '09:30', notice_hours: 14.5, reported_at: '2026-10-19T19:00' }), 4).short);
ck('...across a month start (Nov 1 shift, Oct 31 6 PM call)', W.shortNotice(ci({ shift_date: '2026-11-01', notice_hours: 14, reported_at: '2026-10-31T18:00' }), 4).kind === 'early');
ck('...a server timestamp is read in Central time (23:30Z = 6:30 PM CDT)', W.shortNotice(ci({ notice_hours: 13.5, reported_at: '2026-10-19T23:30:00.000Z' }), 4).kind === 'early');
ck('...21:30Z = 4:30 PM CDT is fine', !W.shortNotice(ci({ notice_hours: 15.5, reported_at: '2026-10-19T21:30:00Z' }), 4).short);
ck('...no call time recorded: nothing guessed', !W.shortNotice(ci({ notice_hours: null }), 4).short);
ck('...not a call-in: never short', !W.shortNotice({ type: 'tardy', shift_date: '2026-10-20', shift_time: '08:00', reported_at: '2026-10-19T19:00' }, 4).short);
ck('...the reason has no em dash', !/—/.test(W.shortNotice(ci({ notice_hours: 13, reported_at: '2026-10-19T19:00' }), 4).why));

// HR step 6 (2026-10-18): the four required items before approval
const bare = { id: 'b', caregiver: 'Pat', level: 'Written Warning', status: 'pending_approval' };
ck('a bare write-up lists all four missing items, in order', JSON.stringify(W.missingBeforeDecision(bare)) === JSON.stringify(['the facts checked against the record', 'the handbook section', "the caregiver's side", 'the protected-situation check']), W.missingBeforeDecision(bare));
ck('...and Samantha cannot approve it, told what to fill in', !can(bare, SAM).ok && can(bare, SAM).missing.length === 4 && /Before this can be approved, fill in: /.test(can(bare, SAM).why));
const bareV = { id: 'bv', caregiver: 'Pat', level: 'Verbal Warning', status: 'draft' };
ck('...a bare verbal warning: the coordinator is told what to fill in', !can(bareV, KRYSTAL).ok && can(bareV, KRYSTAL).missing.length === 4);
ck('a complete one: nothing missing', W.missingBeforeDecision(wu('Written Warning')).length === 0 && can(wu('Written Warning'), SAM).ok);
ck('"they chose not to give their side" counts, with the date asked', W.missingBeforeDecision(wu('Written Warning', { explanation: { asked_on: '2026-10-17', declined: true } })).length === 0);
ck('their side without the date asked is missing', W.missingBeforeDecision(wu('Written Warning', { explanation: { text: 'x' } })).join() === "the caregiver's side");
ck('an empty side is missing', W.missingBeforeDecision(wu('Written Warning', { explanation: { asked_on: '2026-10-17', text: '  ' } })).join() === "the caregiver's side");
ck('the protected check must have been done (an empty list counts as done)', W.missingBeforeDecision(wu('Written Warning', { protected: undefined })).join() === 'the protected-situation check');
ck('a Care Coordinator with a bare written warning is told Samantha approves (not the missing list)', /Samantha approves/.test(can(bare, KRYSTAL).why));
// no em dashes, and no Zach, in anything a person reads
const said = [W.whoApproves(wu('Coaching')), W.whoApproves(pw), can(wu('Suspension'), KRYSTAL).why, can(pv, KRYSTAL).why, can(wu('Coaching'), STAFFING).why, can(wu('Written Warning'), ZACH).why];
ck('no em dashes in the words', said.every(t => !/—/.test(t)), said);
ck('Zach is not named in the words', said.every(t => !/Zach/.test(t)), said);

let f = 0; for (const [n, ok, d] of res) { console.log((ok ? 'PASS' : 'FAIL') + ' · ' + n + (ok ? '' : '  ' + d)); if (!ok) f++; }
console.log((res.length - f) + '/' + res.length); process.exit(f ? 1 : 0);

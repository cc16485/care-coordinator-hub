// Who approves a write-up (HR decisions, Samantha 2026-10-18). node tests/writeup-rules-test.js
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

// HR decisions 1 to 3 (2026-10-18): every write-up is an owner's; Zach approves terminations; protected cases need
// Samantha consulted first; Care Coordinators never approve a write-up.
for (const lv of ['Coaching', 'Verbal Warning', 'Written Warning', 'Final Written Warning', 'Suspension', 'Termination Review', 'Something new', '']) {
  const a = wu(lv);
  ck((lv || 'no level') + ': an owner decides', W.tier(a, [a], NOW) === 'leadership');
  ck((lv || 'no level') + ': a Care Coordinator cannot approve it, and is told Zach does', !can(a, KRYSTAL).ok && /Zach/.test(can(a, KRYSTAL).why), can(a, KRYSTAL));
  ck((lv || 'no level') + ': Angiel and the Staffing Coordinator cannot either', !can(a, ANGIEL).ok && !can(a, STAFFING).ok);
  ck((lv || 'no level') + ': Zach and Samantha can', can(a, ZACH).ok && can(a, SAM).ok);
}
const term = wu('Termination Review');
ck('a routine termination: Zach approves on his own', can(term, ZACH).ok && W.whoApproves(term) === 'Zach (or Samantha)');

// protected situations
for (const k of ['leave', 'accommodation', 'injury', 'discrimination', 'retaliation', 'legal']) {
  const p = wu('Termination Review', { protected: [k] });
  ck(k + ': Zach must consult Samantha first', !can(p, ZACH).ok && can(p, ZACH).consult === true && /Talk to Samantha first/.test(can(p, ZACH).why), can(p, ZACH));
  ck(k + ': ...Samantha can approve it herself', can(p, SAM).ok);
  ck(k + ': ...once she marks the consult, Zach can', can(wu('Termination Review', { protected: [k], samantha_consulted_at: NOW }), ZACH).ok);
}
const pw = wu('Written Warning', { protected: ['injury', 'retaliation'] });
ck('it covers every formal level, not only terminations', !can(pw, ZACH).ok);
ck('...and names the situations in words', /an injury or workers' comp, a retaliation concern/.test(can(pw, ZACH).why), can(pw, ZACH).why);
ck('...an unknown marker still needs the consult (fails closed)', !can(wu('Suspension', { protected: ['something else'] }), ZACH).ok);
ck('...an empty list is a routine case', can(wu('Suspension', { protected: [] }), ZACH).ok);
ck('...whoApproves says so', W.whoApproves(pw) === 'Zach, after talking with Samantha');
ck('...a Care Coordinator still cannot, even after the consult', !can(wu('Suspension', { protected: ['leave'], samantha_consulted_at: NOW }), KRYSTAL).ok);

// owners may approve a case they started (decision 1: Zach decides on his own)
const zachFinal = wu('Final Written Warning', { created_by: 'zach', created_by_email: 'zach@mo-care.com' });
ck('Zach can approve a final warning he started', can(zachFinal, ZACH).ok);
const samTerm = wu('Termination Review', { created_by_email: 'samantha@mo-care.com', created_by: 'samantha' });
ck('Samantha can approve a termination she started', can(samTerm, SAM).ok);
ck('startedBy still reads older drafts that kept only the name', W.startedBy(wu('Verbal Warning', { created_by: 'krystal' }), 'Krystal@mo-care.com'));
ck('no email, no approval', !W.canApprove(wu('Coaching'), { email: '', owner: true }).ok);

// second written warning wording is kept
const prior = wu('Written Warning', { status: 'issued', issued_at: '2026-06-01T12:00:00Z' });
const second = wu('Written Warning');
ck('a second written warning inside 12 months is still called that', W.levelWords(second, [prior, second], NOW) === 'second written warning');
ck('...one issued over 12 months ago does not count', W.levelWords(second, [wu('Written Warning', { status: 'issued', issued_at: '2025-06-01T12:00:00Z' }), second], NOW) === 'written warning');

// routing: Zach first, then Samantha
const whoFor = e => ({ 'krystal@mo-care.com': KRYSTAL, 'samantha@mo-care.com': SAM, 'zach@mo-care.com': ZACH })[e] || { email: e };
const order = ['krystal@mo-care.com', W.HR_LEAD, 'samantha@mo-care.com'];
ck('routing: a write-up skips Krystal and goes to Zach', W.approverFor(wu('Verbal Warning'), order, whoFor, [], NOW) === 'zach@mo-care.com');
ck('routing: a protected case not yet consulted goes to Samantha', W.approverFor(pw, order, whoFor, [], NOW) === 'samantha@mo-care.com');
ck('routing: nobody listed can, empty', W.approverFor(wu('Termination Review'), ['krystal@mo-care.com'], whoFor, [], NOW) === '');
ck('the HR lead is Zach', W.HR_LEAD === 'zach@mo-care.com' && W.FIRING_APPROVERS.indexOf('zach@mo-care.com') > -1);

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
ck('...the reason has no em dash', !/\u2014/.test(W.shortNotice(ci({ notice_hours: 13, reported_at: '2026-10-19T19:00' }), 4).why));

// HR step 6 (2026-10-18): the four required items before approval
const bare = { id: 'b', caregiver: 'Pat', level: 'Written Warning', status: 'pending_approval' };
ck('a bare write-up lists all four missing items, in order', JSON.stringify(W.missingBeforeDecision(bare)) === JSON.stringify(['the facts checked against the record', 'the handbook section', "the caregiver's side", 'the protected-situation check']), W.missingBeforeDecision(bare));
ck('...and Zach cannot approve it, told what to fill in', !can(bare, ZACH).ok && can(bare, ZACH).missing.length === 4 && /Before this can be approved, fill in: /.test(can(bare, ZACH).why));
ck('...nor Samantha', !can(bare, SAM).ok);
ck('a complete one: nothing missing', W.missingBeforeDecision(wu('Written Warning')).length === 0 && can(wu('Written Warning'), ZACH).ok);
ck('"they chose not to give their side" counts, with the date asked', W.missingBeforeDecision(wu('Written Warning', { explanation: { asked_on: '2026-10-17', declined: true } })).length === 0);
ck('their side without the date asked is missing', W.missingBeforeDecision(wu('Written Warning', { explanation: { text: 'x' } })).join() === "the caregiver's side");
ck('an empty side is missing', W.missingBeforeDecision(wu('Written Warning', { explanation: { asked_on: '2026-10-17', text: '  ' } })).join() === "the caregiver's side");
ck('the protected check must have been done (an empty list counts as done)', W.missingBeforeDecision(wu('Written Warning', { protected: undefined })).join() === 'the protected-situation check');
ck('a Care Coordinator is still told Zach approves (not the missing list)', /Zach/.test(can(bare, KRYSTAL).why));
// no em dashes in anything a person reads
const said = [W.whoApproves(wu('Coaching')), W.whoApproves(pw), can(wu('Suspension'), KRYSTAL).why, can(pw, ZACH).why, can(wu('Coaching'), STAFFING).why];
ck('no em dashes in the words', said.every(t => !/—/.test(t)), said);

let f = 0; for (const [n, ok, d] of res) { console.log((ok ? 'PASS' : 'FAIL') + ' · ' + n + (ok ? '' : '  ' + d)); if (!ok) f++; }
console.log((res.length - f) + '/' + res.length); process.exit(f ? 1 : 0);

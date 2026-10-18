// Who approves a write-up (SOP ruling 2, Samantha 2026-10-17). node tests/writeup-rules-test.js
const W = require('../writeup-rules.js');
const res = []; const ck = (n, c, d) => res.push([n, !!c, c ? '' : JSON.stringify(d === undefined ? '' : d).slice(0, 500)]);
const NOW = '2026-10-17T18:00:00Z';
const SAM = { email: 'samantha@mo-care.com', owner: true, team: true };
const ZACH = { email: 'zach@mo-care.com', owner: true, team: true };
const KRYSTAL = { email: 'krystal@mo-care.com', owner: false, team: true };
const ANGIEL = { email: 'angiel@mo-care.com', owner: false, team: true };
const STAFFING = { email: 'staffing@mo-care.com', owner: false, team: false };
const wu = (level, extra) => Object.assign({ id: 'x' + Math.random(), caregiver: 'Pat Sample', axiscare_caregiver_id: '77', level, status: 'pending_approval', created_by: 'the Hub (missed notes)' }, extra || {});
const can = (a, who, all) => W.canApprove(a, who, all || [a], NOW);

// team levels
for (const lv of ['Coaching', 'Verbal Warning', 'Written Warning']) {
  const a = wu(lv);
  ck(lv + ': the team decides', W.tier(a, [a], NOW) === 'team');
  ck(lv + ': a Care Coordinator can approve it', can(a, KRYSTAL).ok, can(a, KRYSTAL));
  ck(lv + ': an owner can too', can(a, SAM).ok && can(a, ZACH).ok);
  ck(lv + ': the Staffing Coordinator cannot', !can(a, STAFFING).ok);
}
// leadership levels
for (const lv of ['Final Written Warning', 'Suspension']) {
  const a = wu(lv);
  ck(lv + ': leadership decides', W.tier(a, [a], NOW) === 'leadership');
  ck(lv + ': a Care Coordinator cannot approve it, and is told who does', !can(a, KRYSTAL).ok && /Samantha or Zach/.test(can(a, KRYSTAL).why), can(a, KRYSTAL));
  ck(lv + ': Samantha or Zach can', can(a, SAM).ok && can(a, ZACH).ok);
}
const term = wu('Termination Review');
ck('termination: only Samantha', can(term, SAM).ok && !can(term, ZACH).ok && !can(term, KRYSTAL).ok && /Only Samantha/.test(can(term, ZACH).why));
ck('a level the rules do not know is leadership, never the team', W.tier(wu('Something new'), [], NOW) === 'leadership' && !can(wu('Something new'), KRYSTAL).ok);
ck('no level at all is leadership', W.tier(wu(''), [], NOW) === 'leadership');

// first vs second written warning
const prior = wu('Written Warning', { status: 'issued', issued_at: '2026-06-01T12:00:00Z' });
const second = wu('Written Warning');
ck('a second written warning inside 12 months goes to leadership', W.tier(second, [prior, second], NOW) === 'leadership' && !can(second, KRYSTAL, [prior, second]).ok, can(second, KRYSTAL, [prior, second]));
ck('...and is called a second written warning', /second written warning/.test(can(second, KRYSTAL, [prior, second]).why));
const old = wu('Written Warning', { status: 'issued', issued_at: '2025-06-01T12:00:00Z' });
ck('a written warning issued more than 12 months ago does not count', W.tier(second, [old, second], NOW) === 'team');
const priorFinal = wu('Final Written Warning', { status: 'issued', issued_at: '2026-09-01T12:00:00Z' });
ck('a final warning already on file also makes the next written warning leadership\'s', W.tier(second, [priorFinal, second], NOW) === 'leadership');
const verbalPrior = wu('Verbal Warning', { status: 'issued', issued_at: '2026-09-01T12:00:00Z' });
ck('a verbal warning on file does not (the written one is still the first)', W.tier(second, [verbalPrior, second], NOW) === 'team');
const draftPrior = wu('Written Warning', { status: 'draft' });
ck('a written warning that was never issued does not count', W.tier(second, [draftPrior, second], NOW) === 'team');
const otherPerson = wu('Written Warning', { status: 'issued', issued_at: '2026-09-01T12:00:00Z', axiscare_caregiver_id: '88', caregiver: 'Pat Sample' });
ck('someone else with the same name but a different AxisCare number does not count', W.tier(second, [otherPerson, second], NOW) === 'team');
const byName = { id: 'n1', caregiver: 'pat  sample', level: 'Written Warning', status: 'issued', issued_at: '2026-09-01T12:00:00Z' };
const noNum = { id: 'n2', caregiver: 'Pat Sample', level: 'Written Warning', status: 'pending_approval' };
ck('name-only records match by name', W.tier(noNum, [byName, noNum], NOW) === 'leadership');

// nobody approves a case they started
const mine = wu('Coaching', { created_by: 'krystal', created_by_email: 'krystal@mo-care.com' });
ck('Krystal cannot approve a coaching she started', !can(mine, KRYSTAL).ok && /someone else/.test(can(mine, KRYSTAL).why));
ck('...Angiel, Samantha or Zach can', can(mine, ANGIEL).ok && can(mine, SAM).ok && can(mine, ZACH).ok);
const oldMine = wu('Verbal Warning', { created_by: 'krystal' });
ck('older drafts that only kept the name before the @ still count as hers', !can(oldMine, KRYSTAL).ok && W.startedBy(oldMine, 'Krystal@mo-care.com'));
const zachFinal = wu('Final Written Warning', { created_by: 'zach', created_by_email: 'zach@mo-care.com' });
ck('Zach cannot approve a final warning he started; Samantha can', !can(zachFinal, ZACH).ok && can(zachFinal, SAM).ok);
const samFinal = wu('Suspension', { created_by_email: 'samantha@mo-care.com', created_by: 'samantha' });
ck('Samantha cannot approve a suspension she started; Zach can', !can(samFinal, SAM).ok && can(samFinal, ZACH).ok);
const samTerm = wu('Termination Review', { created_by_email: 'samantha@mo-care.com', created_by: 'samantha' });
ck('a termination Samantha started herself: she approves it (only she can)', can(samTerm, SAM).ok && !can(samTerm, ZACH).ok);
const krysTerm = wu('Termination Review', { created_by_email: 'krystal@mo-care.com', created_by: 'krystal' });
ck('a termination Krystal started: Samantha only', can(krysTerm, SAM).ok && !can(krysTerm, ZACH).ok && !can(krysTerm, KRYSTAL).ok);
ck('an automatic draft (missed notes) was started by nobody here', !W.startedBy(wu('Coaching'), 'krystal@mo-care.com'));
ck('no email, no approval', !W.canApprove(wu('Coaching'), { email: '', team: true }).ok);

// who approves, in words
ck('whoApproves: team / leadership / termination', /Care Coordinator/.test(W.whoApproves(wu('Coaching'), [])) && W.whoApproves(wu('Suspension'), []) === 'Samantha or Zach' && W.whoApproves(term, []) === 'Samantha');

// routing: the first person in the list who may approve
const whoFor = e => ({ 'krystal@mo-care.com': KRYSTAL, 'samantha@mo-care.com': SAM, 'zach@mo-care.com': ZACH })[e] || { email: e };
const order = ['krystal@mo-care.com', 'samantha@mo-care.com', 'samantha@mo-care.com', 'zach@mo-care.com'];
ck('routing: a team level goes to Krystal', W.approverFor(wu('Coaching'), order, whoFor, [], NOW) === 'krystal@mo-care.com');
ck('routing: one Krystal started goes to Samantha', W.approverFor(mine, order, whoFor, [mine], NOW) === 'samantha@mo-care.com');
ck('routing: a final warning skips Krystal', W.approverFor(wu('Final Written Warning'), order, whoFor, [], NOW) === 'samantha@mo-care.com');
ck('routing: a suspension Samantha started goes to Zach', W.approverFor(samFinal, order, whoFor, [samFinal], NOW) === 'zach@mo-care.com');
ck('routing: nobody listed can, empty', W.approverFor(wu('Termination Review'), ['zach@mo-care.com', 'krystal@mo-care.com'], whoFor, [], NOW) === '');

// no em dashes in anything a person reads
const said = [W.whoApproves(wu('Coaching'), []), can(wu('Suspension'), KRYSTAL).why, can(term, ZACH).why, can(mine, KRYSTAL).why, can(wu('Coaching'), STAFFING).why];
ck('no em dashes in the words', said.every(t => !/—/.test(t)), said);

let f = 0; for (const [n, ok, d] of res) { console.log((ok ? 'PASS' : 'FAIL') + ' · ' + n + (ok ? '' : '  ' + d)); if (!ok) f++; }
console.log((res.length - f) + '/' + res.length); process.exit(f ? 1 : 0);

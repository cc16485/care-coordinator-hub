// The one shared match rule (match-rules.js), against Samantha's rules and the October 11 scenarios. node tests/match-rules-test.js
const M = require('../match-rules.js');
let pass = 0, fail = 0; const ck = (n, c, note) => { if (c) pass++; else { fail++; console.log('FAIL  ' + n + (note ? '  ' + JSON.stringify(note).slice(0, 400) : '')); } };
/* a client with every need confirmed on the care plan; the listed ones required */
const plan = (required = [], x = {}) => ({ name: 'Mary', payer: 'private', level: 1, plan_current: true, needs: Object.fromEntries(M.SKILLS.map(s => [s.key, { value: required.includes(s.key) ? 'required' : 'no', stage: 'plan' }])), facts: {}, ...x });
const C = (sk = {}, x = {}) => ({ name: 'Ann', axiscare_id: '101', cleared: true, level: 2, training: { dementia: true }, cleared_to_drive: true, dl_status: 'Approved Driver', skills: sk, willing: {}, gender: 'female', spanish: 'none', availability: { free: true }, ...x });
const ok = (st) => ({ standing: st });
const ON = { driveGate: true };   /* the Admin switch driver_schedule_gate_live on (2026-10-13 rollout) */

ck('the approved list: 18 skills; lift, two-person and bedbound checked first', M.SKILLS.length === 18 && M.SKILLS.filter(s => s.checkFirst).map(s => s.key).join() === 'two_person_transfers,hoyer_lift,bedbound_care');
/* missing never means none */
let cs = M.clientState({ payer: 'private', plan_current: true, needs: {} });
ck('a client with no needs answered is incomplete (18 of 18 not confirmed), never "none"', cs.status === 'incomplete' && /18 of 18 needs not confirmed/.test(cs.message), cs);
cs = M.clientState({ ...plan([]), needs: { ...plan([]).needs, bathing: { value: 'required', stage: 'intake' } } });
ck('an intake answer is not confirmed: the client stays incomplete', cs.status === 'incomplete' && cs.unconfirmed.join() === 'bathing', cs);
ck('a care plan that is not current: incomplete', M.clientState(plan([], { plan_current: false })).status === 'incomplete');
let r = M.evaluate({ ...plan(['bathing']), plan_current: false }, C({ bathing: ok('corroborated') }));
ck('incomplete client: even a perfect caregiver is at most "Likely fit", never Ready', r.group === 'likely_fit' && /incomplete/.test(r.warnings[0]), r);
/* Medicaid and what we do not provide */
cs = M.clientState(plan(['hoyer_lift'], { payer: 'medicaid' }));
ck('Medicaid client needing a lift: flagged for review (advanced personal care), never matched', cs.status === 'flagged' && /advanced personal care/.test(cs.message) && M.evaluate(plan(['hoyer_lift'], { payer: 'medicaid' }), C({ hoyer_lift: ok('corroborated') }, { level: 3 })).group === 'not_for_visit');
ck('Medicaid client with catheter bag care: flagged until MMAC answers', /MMAC/.test(M.clientState(plan(['catheter_bag'], { payer: 'medicaid' })).message));
ck('private-pay client with catheter bag care: matched normally (her policy)', M.clientState(plan(['catheter_bag'])).status === 'ok');
ck('a task we never provide (catheter change): flagged for any payer', M.clientState(plan([], { advanced_tasks: ['Changing a catheter'] })).status === 'flagged');
ck('CDS and ILW clients are not matched here', M.clientState(plan([], { payer: 'CDS' })).status === 'not_matched');
/* the six checks, in order */
ck('2: not cleared to work is the reason, before anything else', M.evaluate(plan(['bedbound_care']), C({}, { cleared: false, cleared_reason: 'FCSR screening not back' })).reason === 'Not cleared to work: FCSR screening not back');
r = M.evaluate(plan(['bedbound_care'], { level: 1 }), C({ bedbound_care: ok('corroborated') }, { level: 2 }));
ck('3: bedbound care needs Level 3; an approved Level 2 is not for this visit', r.group === 'not_for_visit' && r.reason === 'Approved level 2; this client needs Level 3', r);
r = M.evaluate(plan(['bedbound_care', 'hospice_support']), C({ bedbound_care: ok('corroborated'), hospice_support: ok('corroborated') }, { level: 3 }));
ck('bedbound hospice client, complete plan: a Level 3 caregiver with both confirmed is Ready', r.group === 'ready', r);
r = M.evaluate(plan(['bedbound_care', 'hospice_support']), C({ bedbound_care: ok('self_reported'), hospice_support: ok('corroborated') }, { level: 3 }));
ck('4: bedbound only self-reported: "Needs one more step", with Request a reference', r.group === 'one_more_step' && r.steps[0].action === 'Request a reference' && /says yes, not yet confirmed/.test(r.reason), r);
r = M.evaluate(plan(['hoyer_lift']), C({ hoyer_lift: { standing: 'supported', refresher: true } }, { level: 3 }));
ck('4: lift only "believed" by a reference and a refresher wanted: one more step, both named, never Ready', r.group === 'one_more_step' && r.steps.length === 2 && /refresher/.test(r.steps[1].why), r);
r = M.evaluate(plan(['hoyer_lift'], { lift_type: 'Sit-to-stand' }), C({ hoyer_lift: { standing: 'corroborated', lift_types: ['Full-body sling'] } }, { level: 3 }));
ck('4: lift confirmed on a full-body sling only, client uses a sit-to-stand: one more step', r.group === 'one_more_step' && /not on Sit-to-stand/.test(r.reason), r);
r = M.evaluate(plan(['dementia_care']), C({}, { training: { dementia: false } }));
ck('4: dementia client: dementia training required for everyone', r.reason === 'Dementia training not complete');
r = M.evaluate(plan(['dementia_care'], { dementia_experience_required: true }), C({ dementia_care: ok('questioned') }));
ck('4: dementia experience marked required, a reference did not see it: talk it through (one more step)', r.group === 'one_more_step' && /talk it through/.test(r.reason), r);
r = M.evaluate(plan(['bathing', 'toileting']), C({}));
ck('4: basic personal care rests on the approved Level 2, not a per-task check', r.group === 'ready', r);
r = M.evaluate(plan(['bedbound_care']), C({}, { level: 3 }));
ck('4: a required check-first need with no experience at all: not for this visit', r.group === 'not_for_visit' && /no experience on record/.test(r.reason), r);
r = M.evaluate(plan(['two_person_transfers']), C({ two_person_transfers: ok('corroborated') }));
ck('two-person transfers: confirmed, and the warning that a second caregiver must be on the visit', r.group === 'ready' && /second caregiver/.test(r.warnings.join()), r);
ck('driving a client: an Approved Driver whose documents lapsed is not for this visit', M.evaluate(plan(['transportation']), C({}, { cleared_to_drive: false, dl_expires: '2026-09-30', auto_ins_expires: '2027-01-31' }), ON).reason === 'Not cleared to drive clients: License or insurance expired');
/* 5: restrictions, Do Not Return, home facts, gender, language */
ck('5: a restriction on a required need (not at this time for bedbound): excluded with that reason', /Bedbound care and repositioning: not at this time/.test(M.evaluate(plan(['bedbound_care']), C({ bedbound_care: ok('corroborated') }, { level: 3, restrictions: ['bedbound_care'] })).reason));
ck('5: Do Not Return by AxisCare id', M.evaluate(plan([], { dnr_axiscare_ids: ['101'] }), C()).reason === 'Do Not Return for this client');
ck('5: a smoking home and "not at this time" for smoking', /someone who smokes/.test(M.evaluate(plan([], { facts: { smoking: true } }), C({}, { willing: { smoking: 'not_now' } })).reason));
ck('5: the client requires a male caregiver', /requires a male caregiver/.test(M.evaluate(plan([], { facts: { gender: { value: 'male', strength: 'require' } } }), C()).reason));
r = M.rankFor(plan([], { facts: { gender: { value: 'female', strength: 'prefer' } } }), [C({}, { name: 'Bo', gender: 'male' }), C({}, { name: 'Ann' })]);
ck('a preference only ranks inside the group: both Ready, the preferred one first', r.rows.every(x => x.group === 'ready') && r.rows[0].caregiver === 'Ann', r.rows);
ck('5: Spanish required: basic Spanish is not enough', /Spanish/.test(M.evaluate(plan([], { facts: { spanish: 'require' } }), C({}, { spanish: 'basic' })).reason));
/* 6: free */
ck('6: not free (an overlapping visit) is the reason; over target hours is only a warning', M.evaluate(plan([]), C({}, { availability: { free: false, reason: 'Overlaps a visit 9 to 11' } })).reason === 'Overlaps a visit 9 to 11' && M.evaluate(plan([]), C({}, { availability: { free: true, over_target: true } })).group === 'ready');
/* changing needs: the same caregiver re-checked */
const before = M.evaluate(plan(['bathing']), C({ hoyer_lift: ok('self_reported') }, { level: 3 })).group, after = M.evaluate(plan(['bathing', 'hoyer_lift']), C({ hoyer_lift: ok('self_reported') }, { level: 3 }));
ck('client now needs a lift: the assigned caregiver goes from Ready to one more step, with the reason', before === 'ready' && after.group === 'one_more_step' && /A Hoyer or other mechanical lift: says yes/.test(after.reason), after);
/* adapters: nothing upgrades on the way */
const st1 = M.fromStep1({ skills: [{ key: 'bathing', standing: 'confirmed' }, { key: 'hoyer_lift', standing: 'supported', refresher: true, lifts: ['Full-body sling'] }, { key: 'bedbound_care', standing: 'self_reported' }] });
ck('from Step 1: confirmed becomes corroborated; believed and self-reported stay what they are', st1.bathing.standing === 'corroborated' && st1.hoyer_lift.standing === 'supported' && st1.hoyer_lift.refresher && st1.bedbound_care.standing === 'self_reported');
const ov = M.fromOverlay({ skills: { hoyer_lift: { have: 'yes', evidence: 'attested' }, bedbound_care: { have: 'yes', evidence: 'observed' }, dementia_care: { have: 'no' }, personal_care: { have: 'yes', evidence: 'training' } } });
ck('from today\'s skills record: "observed" counts as corroborated; "attested" and "training" do not; a "no" adds nothing', ov.hoyer_lift.standing === 'self_reported' && ov.bedbound_care.standing === 'corroborated' && !ov.dementia_care && ov.bathing.standing === 'self_reported', ov);
const fl = M.fromLead({ hoyer_lift: 'yes', bed_bound: 'no', dementia: 'preferred', cats: 'yes' });
ck('from the lead: intake answers, never confirmed (so the client stays incomplete until the plan confirms them)', fl.hoyer_lift.stage === 'intake' && fl.hoyer_lift.value === 'required' && fl.bedbound_care.value === 'no' && fl.dementia_care.value === 'preferred' && M.clientState({ plan_current: true, needs: fl }).status === 'incomplete');
/* 1.1.0: the dark report's adapters */
ck('driving (1.2.0, Driver Compliance): no driver record yet is NOT for a visit that needs driving (no assumption), never "one more step"', (() => { const r = M.evaluate(plan(['transportation']), C({}, { cleared_to_drive: null, dl_status: null }), ON); return r.group === 'not_for_visit' && r.reason === 'Not cleared to drive clients: No driver record yet' })())
const rows = [{ kind: 'need_hoyer_lift', layer: 'intake', value: 'required' }, { kind: 'need_hoyer_lift', layer: 'plan', value: 'no' }, { kind: 'need_bathing', layer: 'plan', value: 'required' },
  { kind: 'home_cats', layer: 'plan', value: 'yes' }, { kind: 'home_dogs', layer: 'intake', value: 'yes' }, { kind: 'pref_caregiver_gender', layer: 'plan', value: 'female_required' }, { kind: 'need_spanish', layer: 'current', value: 'preferred' },
  { kind: 'need_lift_type', layer: 'plan', value: 'sit_to_stand' }, { kind: 'need_advanced_tasks', layer: 'plan', value: ['stoma_care'] }]
const ff = M.fromFacts(rows)
ck('from the fact record: the latest layer wins (plan over intake); each need keeps its stage', ff.needs.hoyer_lift.value === 'no' && ff.needs.hoyer_lift.stage === 'plan' && ff.needs.bathing.stage === 'plan', ff)
ck('from the fact record: only confirmed (plan or current) home facts count; an intake "dogs" does not', ff.facts.cats === true && ff.facts.dogs === undefined && ff.facts.gender.value === 'female' && ff.facts.gender.strength === 'require' && ff.facts.spanish === 'prefer', ff.facts)
ck('from the fact record: lift type and advanced tasks in the words the rule shows', ff.lift_type === 'Sit-to-stand' && ff.advanced_tasks[0] === 'Stoma care')
ck('an advanced task from the fact record flags the client for review', M.clientState({ ...plan([]), advanced_tasks: ff.advanced_tasks }).status === 'flagged')
const of = M.overlayFacts({ skills: { ok_cats: { have: 'no' }, ok_dogs: { have: 'yes' } }, spanish_ability: 'Conversational' })
ck('from the skills record: "no" to cats is not at this time; Spanish read as written', of.willing.cats === 'not_now' && !of.willing.dogs && of.spanish === 'conversational')
ck('AxisCare gender: F and M (any case or spelling) or unknown', M.axisGender('F') === 'female' && M.axisGender('male') === 'male' && M.axisGender('') === null)
ck('pure: no clock, no network, no page (runs the same in the browser and on the server)', !/fetch\(|Date\.now\(|document\./.test(require('fs').readFileSync(__dirname + '/../match-rules.js', 'utf8')));
/* 1.2.0 · Driver Compliance in scheduling (2026-10-13). The table below is the same table driver_eligibility_test.mjs (Staffing)
   runs against the server's _shared/driver-eligibility.ts AND this file, so the two copies cannot drift. */
const DRIVE_TABLE = [
  [{ dl_status: 'Approved Driver', cleared_to_drive: true, dl_expires: '2027-05-01', auto_ins_expires: '2027-02-01' }, null, true, 'Approved Driver'],
  [{ dl_status: 'Approved Driver', cleared_to_drive: true, dl_expires: '2027-05-01', auto_ins_expires: '2027-02-01' }, '2026-10-13', true, 'Approved Driver'],
  [{ dl_status: 'Approved Driver', cleared_to_drive: true, dl_expires: '2027-05-01', auto_ins_expires: '2026-10-13' }, '2026-10-13', false, 'License or insurance expired'],
  [{ dl_status: 'Approved Driver', cleared_to_drive: true, dl_expires: '2026-10-01', auto_ins_expires: '2027-02-01' }, '2026-10-13', false, 'License or insurance expired'],
  [{ dl_status: 'Approved Driver', cleared_to_drive: false, dl_expires: '2026-10-01', auto_ins_expires: '2027-02-01' }, null, false, 'License or insurance expired'],
  [{ dl_status: 'Approved Driver', cleared_to_drive: false }, null, false, 'License or insurance expiration not on file'],
  [{ dl_status: 'Approved Driver' }, null, false, 'License or insurance expiration not on file'],
  [{ dl_status: 'Pending Verification', cleared_to_drive: false }, null, false, 'Not an Approved Driver (Pending Verification)'],
  [{ dl_status: 'Pending Verification', cleared_to_drive: true }, null, false, 'Not an Approved Driver (Pending Verification)'],
  [{ dl_status: 'Non-Driver', cleared_to_drive: false }, null, false, 'Not an Approved Driver (Non-Driver)'],
  [{ dl_status: 'Suspended', cleared_to_drive: false, dl_expires: '2027-05-01' }, null, false, 'Driving suspended'],
  [{ dl_status: 'suspended' }, null, false, 'Driving suspended'],
  [{ dl_status: 'Not set up yet' }, null, false, 'No driver record yet'],
  [{}, null, false, 'No driver record yet'],
  [{ cleared_to_drive: true, dl_expires: '2027-05-01', auto_ins_expires: '2027-02-01' }, null, false, 'No driver record yet'],
  [null, null, false, 'No driver record yet'],
  [{ dl_status: 'Maybe' }, null, false, 'Not an Approved Driver (Maybe)'],
];
DRIVE_TABLE.forEach(([cg, today, ok, why], i) => { const r = M.transportEligible(cg, today || undefined); ck('driver table ' + i + ': ' + why, r.ok === ok && r.why === why, r); });
const NEED_TABLE = [
  [{}, null], [{ planNeeds: ['hoyer_lift'] }, null], [{ planNeeds: ['transportation'] }, 'required'],
  [{ facts: [{ kind: 'need_transportation', layer: 'plan', value: 'required' }] }, 'required'],
  [{ facts: [{ kind: 'need_transportation', layer: 'intake', value: 'Required' }] }, 'required'],
  [{ facts: [{ kind: 'need_transportation', layer: 'intake', value: 'required' }, { kind: 'need_transportation', layer: 'plan', value: 'no' }] }, null],
  [{ facts: [{ kind: 'need_transportation', layer: 'plan', value: 'preferred' }] }, 'preferred'],
  [{ attrs: { transportation: 'yes' } }, 'required'], [{ attrs: { transportation: 'preferred' } }, 'preferred'], [{ attrs: { transportation: 'no' } }, null], [{ attrs: { transportation: '' } }, null],
  [{ attrs: { transportation: 'preferred' }, planNeeds: ['transportation'] }, 'required'],
];
NEED_TABLE.forEach(([x, lvl], i) => { const r = M.transportNeed(x); ck('need table ' + i + ': ' + lvl, r.level === lvl, r); });
for (const st of ['Non-Driver', 'Pending Verification', 'Suspended', null]) {
  const r = M.evaluate(plan(['transportation']), C({ transportation: ok('corroborated') }, { dl_status: st, cleared_to_drive: false }), ON);
  ck('her rule: ' + (st || 'no driver record') + ' is never for a visit that needs driving, even with driving "confirmed" on the skills record', r.group === 'not_for_visit' && /^Not cleared to drive clients: /.test(r.reason), r);
}
r = M.evaluate(plan(['transportation']), C({}, { dl_status: 'Approved Driver', cleared_to_drive: true }), ON);
ck('an Approved Driver with current documents is Ready for a visit that needs driving', r.group === 'ready' && r.ranks.includes('Confirmed: Driving clients to appointments and errands'), r);
r = M.evaluate(plan(['transportation']), C({}, { dl_status: 'Approved Driver', cleared_to_drive: true, dl_expires: '2026-10-01', auto_ins_expires: '2027-01-01' }), { today: '2026-10-13', driveGate: true });
ck('the date passed in: a license that ran out since the last mirror is not for this visit', r.group === 'not_for_visit' && /License or insurance expired/.test(r.reason), r);
r = M.evaluate(plan([]), C({}, { dl_status: 'Non-Driver', cleared_to_drive: false }));
ck('non-transport visits are unaffected: a Non-Driver is Ready', r.group === 'ready', r);
{ const cl = plan([]); cl.needs.transportation = { value: 'required', stage: 'intake' };
  r = M.evaluate(cl, C({}, { dl_status: 'Pending Verification', cleared_to_drive: false }), ON);
  ck('driving required even at intake: Pending Verification is not for this visit (the safe side)', r.group === 'not_for_visit' && r.reason === 'Not cleared to drive clients: Not an Approved Driver (Pending Verification)', r); }
{ const cl = plan([]); cl.needs.transportation = { value: 'preferred', stage: 'plan' };
  const rk = M.rankFor(cl, [C({}, { name: 'Pat', dl_status: 'Pending Verification', cleared_to_drive: false }), C({}, { name: 'Dee', dl_status: 'Approved Driver', cleared_to_drive: true })], ON);
  const pat = rk.rows.find(x => x.caregiver === 'Pat');
  ck('driving only preferred: not excluded, ranked lower, and the reason says so', rk.rows.every(x => x.group === 'ready') && rk.rows[0].caregiver === 'Dee' && /ranked lower, not excluded: Not an Approved Driver \(Pending Verification\)/.test(pat.warnings.join(' ')), rk.rows); }
/* the rollout switch OFF (the default): the same check, shown as a warning; nobody left out and nothing moved */
for (const st of ['Non-Driver', 'Pending Verification', 'Suspended', null]) {
  const r0 = M.evaluate(plan(['transportation']), C({}, { dl_status: st, cleared_to_drive: false }));
  ck('switch off: ' + (st || 'no driver record') + ' stays Ready for a visit that needs driving, with "Driver check (not enforced yet)"', r0.group === 'ready' && r0.warnings.some(w => /^Driver check \(not enforced yet\): /.test(w)), r0); }
ck('switch off is the default (no opts) and an explicit false', M.evaluate(plan(['transportation']), C({}, { dl_status: 'Suspended' }), { driveGate: false }).group === 'ready');
{ const cl = plan([]); cl.needs.transportation = { value: 'preferred', stage: 'plan' };
  const rk0 = M.rankFor(cl, [C({}, { name: 'Pat', dl_status: 'Pending Verification', cleared_to_drive: false }), C({}, { name: 'Dee', dl_status: 'Approved Driver', cleared_to_drive: true })]);
  ck('switch off, driving preferred: the order is as before (Pat first, nobody moved), with the warning', rk0.rows[0].caregiver === 'Pat' && /not enforced yet/.test(rk0.rows[0].warnings.join()), rk0.rows); }
ck('switch off: the self-reported driving skill still ranks as it did before', M.evaluate(plan(['transportation']), C({ transportation: ok('corroborated') }, { dl_status: 'Non-Driver' })).ranks.includes('Confirmed: Driving clients to appointments and errands'));
ck('driveGateOn reads only ops_settings.driver_schedule_gate_live === true', M.driveGateOn({ driver_schedule_gate_live: true }) && !M.driveGateOn({ driver_schedule_gate_live: 'yes' }) && !M.driveGateOn({}) && !M.driveGateOn(null));
const DEC = [[{ dl_status: 'Pending Verification' }, 'required', true, true, false, null], [{ dl_status: 'Pending Verification' }, 'required', false, false, false, 'Driver check (not enforced yet): Not an Approved Driver (Pending Verification)'],
  [{ dl_status: 'Suspended' }, 'preferred', true, false, true, 'The client would like help with driving; ranked lower, not excluded: Driving suspended'], [{ dl_status: 'Suspended' }, 'preferred', false, false, false, 'Driver check (not enforced yet): Driving suspended'],
  [{}, null, true, false, false, null], [{ dl_status: 'Approved Driver', cleared_to_drive: true }, 'required', true, false, false, null]];
DEC.forEach(([cg, lvl, live, ex, rl, note], i) => { const d = M.transportDecision(cg, lvl, live); ck('decision table ' + i, d.exclude === ex && d.rankLower === rl && d.note === note, d); });
ck('fromFacts carries need_transportation (with its stage) for the rule', M.fromFacts([{ kind: 'need_transportation', layer: 'assessment', value: 'required' }]).needs.transportation.stage === 'assessment');
console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);

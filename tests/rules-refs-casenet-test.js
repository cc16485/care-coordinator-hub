/* Step 3, the rule files (2026-10-12): references done = two positive with at least one from work (her 10/09 decision 1,
   now the one rule), and Case.net kept at hire with the other checks. FAKE candidates only. */
const path = require('path');
global.window = global; require(path.join(__dirname, '..', 'eligibility-rules.js')); require(path.join(__dirname, '..', 'caregiver-connect-rules.js'));
const E = global.CCElig, C = global.CCConnect;
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ', m); } else { fail++; console.log('FAIL ', m); } };
const clear = { oig:'CLEAR', edl:'Clear', fcsr:'Clear', casenet:'Clear', oos:'no' };
const cand = refs => Object.assign({ id: 9, first: 'Ava', last: 'Sample' }, clear, refs);

ok(E.refPolicy(cand({ r1s:'Positive', r1_type:'personal', r2s:'Positive', r2_type:'personal' })).ok === false, 'two positive, both personal: not done');
ok(/past job/.test(E.refPolicy(cand({ r1s:'Positive', r2s:'Positive' })).why), 'says what is missing, in plain words');
ok(E.refPolicy(cand({ r1s:'Positive', r1_type:'professional', r2s:'Positive', r2_type:'personal' })).ok === true, 'two positive, one from work: done');
ok(E.refPolicy(cand({ r1s:'Positive', r1_manual:{ type:'professional' }, r2s:'Positive' })).ok === true, 'the type recorded with the answers counts');
ok(E.refPolicy(cand({ r1s:'Pending', r1_type:'professional', r2s:'Positive', r3s:'Positive' })).ok === false, 'a work reference that has not answered does not count');
ok(E.refPolicy(cand({ r1s:'Positive', r1_type:'professional' })).why === '1 more positive reference needed (at least one from a past job).', 'one short: says so');
ok(E.refPolicy(cand({ r1s:'Positive', r1_type:'professional', r2s:'Positive', r3s:'Negative' })).blocked === true, 'a Negative still needs a supervisor');
ok(E.obDeriveStatus(cand({ r1s:'Positive', r1_type:'professional', r2s:'Positive' })) === 'Ready for Orientation', 'Ready for Orientation once one is from work');
ok(E.obDeriveStatus(cand({ r1s:'Positive', r2s:'Positive' })) === 'Awaiting', 'Awaiting (not Needs Review) when neither is marked from work');

const rec = C.recordFromCandidate(cand({ casenet_date:'2026-10-09', casenet_proof:'bgcheck/9/casenet.pdf' }), '2026-10-12', '', { id: 1, promoted_at: 'x' });
ok(rec.prehire.casenet && rec.prehire.casenet.status === 'Clear' && rec.prehire.casenet.date === '2026-10-09' && rec.prehire.casenet.proof === 'bgcheck/9/casenet.pdf', 'Case.net frozen with the other pre-hire checks');
ok(rec.casenet === 'Clear' && rec.casenet_date === '2026-10-09', 'and carried on the record like the orientation-call path already did');
ok(rec.prehire.oig.status === 'CLEAR' && rec.prehire.refs.length === 0, 'the rest of the hire record is unchanged');

const fs = require('fs');
const IDX = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
ok(/\['Case\.net',cn,'Clear'\]/.test(IDX), 'the caregiver page shows Case.net with the pre-hire checks');
console.log(`rules-refs-casenet: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

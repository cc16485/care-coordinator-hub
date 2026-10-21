/* node tests/casenet-old-path-test.js
   Case.net on the old process (Samantha 2026-10-11: "yes add case.net to the old process too"). Ready for Orientation
   now also needs Case.net Clear; Case.net "Issues Found" is Needs Review like the other checks; the hire snapshot and the
   outstanding list name it. Runs the one authoritative rules file (eligibility-rules.js). */
require('../eligibility-rules.js');
const E = globalThis.CCElig;
let pass = 0, fail = 0;
const ck = (name, ok, extra) => { if (ok) pass++; else fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (ok || extra === undefined ? '' : '  ' + JSON.stringify(extra))); };
const base = { first: 'Ola', last: 'Oldpath', oos: 'no', fp: 'N/A', oig: 'CLEAR', edl: 'Clear', fcsr: 'Clear', r1s: 'Positive', r1_type: 'professional', r2s: 'Positive' };   /* 2026-10-12: one from work */
const st = (o) => E.obDeriveStatus(Object.assign({}, base, o));
ck('all four old checks clear but no Case.net yet: Awaiting (was Ready before)', st({}) === 'Awaiting', st({}));
ck('Case.net Pending: Awaiting', st({ casenet: 'Pending' }) === 'Awaiting');
ck('Case.net Clear with the rest: Ready for Orientation', st({ casenet: 'Clear' }) === 'Ready for Orientation');
ck('Case.net Issues Found: Needs Review (like OIG, EDL, FCSR)', st({ casenet: 'Issues Found' }) === 'Needs Review');
ck('Case.net Clear does not override another check: FCSR pending stays Awaiting', st({ casenet: 'Clear', fcsr: 'Pending' }) === 'Awaiting');
ck('no fingerprints from 2026-10-21: out of state, nothing recorded, still Ready', st({ casenet: 'Clear', oos: 'yes', fp: 'Required' }) === 'Ready for Orientation');
const p = E.candidateProgress(Object.assign({}, base));
ck('the outstanding list names Case.net', p.blockers.some((b) => b.code === 'casenet' && /Case\.net/.test(b.why)) && !p.ready, p.blockers);
const snap = E.hiringSnapshot(Object.assign({}, base, { casenet: 'Clear' }));
ck('the hire snapshot records the Case.net result and is ready', snap.casenet === 'Clear' && snap.ready === true && !snap.outstanding.includes('casenet'), snap);
ck('no em dash in the reason', !p.blockers.some((b) => /—/.test(b.why)));
console.log(`casenet-old-path: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);

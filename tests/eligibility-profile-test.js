/* node tests/eligibility-profile-test.js
   Part 2, slice 2c: a NEW HIRE cannot be cleared for their first shift until their caregiver profile is published.
   Runs the one authoritative rules file (eligibility-rules.js) the Hub and the server sweep both run. */
require('../eligibility-rules.js');
const F = require('./eligibility-fixtures.js');
const E = globalThis.CCElig;
let pass = 0, fail = 0;
const ck = (name, ok, extra) => { if (ok) pass++; else fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (ok || extra === undefined ? '' : '  ' + JSON.stringify(extra))); };

// 1 · the fixtures
for (const [name, c, want, code] of F.PROFILE_FIXTURES) {
  const e = E.eligibility(c), codes = e.reasons.map(r => r.code);
  ck('2c · ' + name + ' → ' + want, e.state === want && (code ? codes.includes(code) : !codes.includes('caregiver_profile')), { state: e.state, codes });
}
// 2 · the reason a person reads
const blocked = E.eligibility(F.PROFILE_FIXTURES[0][1]);
const why = blocked.reasons.find(r => r.code === 'caregiver_profile');
ck('2c · the reason says "Profile needed before first shift" and the photo', !!why && /^Profile needed before first shift/.test(why.why) && /photo/.test(why.why), why);
ck('2c · no em dash in the reason', !!why && !/[—―]/.test(why.why));
ck('2c · it is agency policy, never a lapse or a work restriction', !!why && why.kind === E.ELIG_AGENCY && !blocked.restricted && !blocked.lapses.length);
// 3 · who is a new hire (the date line, America/Chicago)
ck('2c · the line is 2026-10-02', E.PROFILE_REQUIRED_FROM === '2026-10-02');
ck('2c · hired 2026-10-05 → new hire', E.profileNewHire({ hire_date: '2026-10-05' }) === true);
ck('2c · hired 2026-10-02 → new hire', E.profileNewHire({ hire_date: '2026-10-02' }) === true);
ck('2c · hired 2026-10-01 → not a new hire', E.profileNewHire({ hire_date: '2026-10-01' }) === false);
ck('2c · promoted 2026-10-02 03:00 UTC (Oct 1, 10pm Central) → not a new hire', E.profileNewHire({ hire_date: '2026-09-30', promoted_at: '2026-10-02T03:00:00Z' }) === false);
ck('2c · promoted 2026-10-02 15:00 UTC (Oct 2 Central) → new hire', E.profileNewHire({ hire_date: '2026-09-30', promoted_at: '2026-10-02T15:00:00Z' }) === true);
ck('2c · has a welcome call → new hire', E.profileNewHire({ hire_date: '2025-01-01', has_welcome_call: true }) === true);
ck('2c · no hire date, nothing else → not a new hire', E.profileNewHire({}) === false);
ck('2c · an odd hire date is not a new hire', E.profileNewHire({ hire_date: 'soon' }) === false);
const pg = E.profileGate({ hire_date: '2026-10-05' });
ck('2c · not looked up is never a block, even for a new hire', pg.new_hire && !pg.checked && !pg.blocked, pg);
// 4 · nothing that existed before changes: every older fixture answers the same with the field absent, and every
//     current caregiver answers the same even when told plainly they have no profile
for (const [name, c] of F.FIXTURES.concat(F.CG_FIXTURES)) {
  const before = E.eligibility(c).state;
  ck('unchanged · ' + name, E.eligibility(Object.assign({}, c, { profile_published: undefined })).state === before);
}
for (const [name, c] of F.CG_FIXTURES) {
  /* fixtures with a recent relative hire date cross the 2026-10-02 line as the calendar moves; they are new hires then */
  if (E.profileNewHire(c)) { console.log('skip  (a new hire by date today) · ' + name); continue; }
  const before = E.eligibility(c).state;
  ck('current caregiver never blocked · ' + name, E.eligibility(Object.assign({}, c, { profile_published: false })).state === before);
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

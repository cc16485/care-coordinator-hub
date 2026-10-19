/* node tests/ask-help-test.js
   Tracked Ask for help (Stage 2, approved 2026-10-18 rule 5). When an unanswered ask runs out, and how its state is read.
   Made-up cards only. */
const path = require('path');
const AH = require(path.join(__dirname, '..', 'ask-help.js'));
let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 400))); };
const MIN = 60000, now = Date.parse('2026-10-20T14:00:00-05:00');
const shiftEnd = (e, t) => e === 'angiel' && t >= Date.parse('2026-10-20T13:00:00-05:00') && t < Date.parse('2026-10-20T17:00:00-05:00') ? Date.parse('2026-10-20T17:00:00-05:00') : null;
const nextShift = (e, t) => e === 'krystal' ? { start:Date.parse('2026-10-21T08:00:00-05:00'), end:Date.parse('2026-10-21T14:00:00-05:00') } : null;

ck('urgent work (urgency urgent): 15 minutes to answer', AH.expiresAt({ urgency:'urgent' }, 'angiel', null, now, shiftEnd, nextShift) === now + 15 * MIN);
ck('a missed clock-in: 15 minutes', AH.expiresAt({ opened_by:'timekeeper' }, 'angiel', null, now, shiftEnd, nextShift) === now + 15 * MIN);
ck('needed within 2 hours: 15 minutes', AH.expiresAt({}, 'angiel', now + 90 * MIN, now, shiftEnd, nextShift) === now + 15 * MIN);
ck('ordinary, helper working: the end of their shift (5 PM)', AH.expiresAt({}, 'angiel', now + 24 * 36e5, now, shiftEnd, nextShift) === Date.parse('2026-10-20T17:00:00-05:00'));
ck('ordinary, helper off now: the end of their next shift', AH.expiresAt({}, 'krystal', now + 48 * 36e5, now, shiftEnd, nextShift) === Date.parse('2026-10-21T14:00:00-05:00'));
ck('no hours on file: 5 PM', new Date(AH.expiresAt({}, 'nobody', now + 48 * 36e5, now, shiftEnd, nextShift)).getHours() === 17);

const ask = (o) => Object.assign({ id:'a', to:'angiel', state:'asked', expires_at:new Date(now + 10 * MIN).toISOString() }, o);
ck('asked, before it runs out: asked', AH.stateOf(ask(), now) === 'asked');
ck('asked, after it runs out: no answer (worked out, not written)', AH.stateOf(ask(), now + 11 * MIN) === 'no_answer');
ck('accepted stays accepted after the time', AH.stateOf(ask({ state:'accepted' }), now + 60 * MIN) === 'accepted');
ck('declined stays declined', AH.stateOf(ask({ state:'declined' }), now + 60 * MIN) === 'declined');
ck('the latest ask is the current one', AH.current({ help_asks:[ask({ id:'1' }), ask({ id:'2' })] }).id === '2' && AH.current({}) === null);
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);

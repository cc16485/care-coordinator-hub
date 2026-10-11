// Practice run (2026-10-11): a made-up person reachable only at practice addresses is never filed onto a GoHighLevel contact
// from the Background & References proof save. node tests/practice-proof-skip-test.js
const fs = require('fs'); const src = fs.readFileSync(__dirname + '/../caregivers-engine.js', 'utf8');
const i = src.indexOf('function bgrPracticePerson'), j = src.indexOf('async function bgrPushDocToGHL');
eval(src.slice(i, j) + '; global.bgrPracticePerson = bgrPracticePerson;');
let pass = 0, fail = 0; const ck = (n, c) => { if (c) pass++; else { fail++; console.log('FAIL', n); } };
ck('a practice number', bgrPracticePerson('(417) 555-0183', ''));
ck('a practice number and a practice email', bgrPracticePerson('4175550189', 'pat.practice@practice.invalid'));
ck('a practice email alone', bgrPracticePerson('', 'Pat@Practice.Invalid'));
ck('a practice number with a real email is a real person', !bgrPracticePerson('4175550183', 'someone@gmail.com'));
ck('the tests\' pretend real numbers (555-01xx outside 0180-0189) are real', !bgrPracticePerson('4175550101', '') && !bgrPracticePerson('4175550190', ''));
ck('a real number', !bgrPracticePerson('4175551234', ''));
ck('nothing given', !bgrPracticePerson('', ''));
const k = src.indexOf('async function bgrPushDocToGHL'), body = src.slice(k, src.indexOf('\n}\n', k));
ck('the proof filing returns before calling GoHighLevel for a practice person', body.indexOf('bgrPracticePerson(c.phone, c.email)) return') > -1 && body.indexOf('bgrPracticePerson') < body.indexOf("functions.invoke('ghl-attach-doc'"));
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);

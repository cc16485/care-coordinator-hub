/* node tests/offer-reminders-1e-test.js
   Slice 1e in the Hub (2026-10-09): the Open offers card shows an expired unsigned offer and the reminders the scheduled run
   sent or recorded (plus the day 7 card); the journey lists moment 2 with her exact wording. The card never sends. */
const fs = require('fs'), path = require('path');
const js = fs.readFileSync(path.join(__dirname, '..', 'caregivers-engine.js'), 'utf8');
const journey = fs.readFileSync(path.join(__dirname, '..', 'applicant-journey.js'), 'utf8');
let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 400))); };
const card = js.slice(js.indexOf("/* Start link, one line, because it sends itself."), js.indexOf("<b style=\"color:#0D365F\">Level of care:</b>"));
ck('an expired unsigned offer says so and points at Resend', /expired unsigned; Resend makes a fresh link/.test(card) && /o\.offer_status==='expired'\|\|\(o\.offer_expires_at&&Date\.parse\(o\.offer_expires_at\)<Date\.now\(\)\)/.test(card));
ck('the reminders record sits on the signing-link line', /offerReminderChip\(o\)/.test(card));
const chip = js.slice(js.indexOf('function offerReminderChip('), js.indexOf('function step1Chip('));
ck('the chip reads the stamps and the practice marks: reminder 1 and 2 sent or recorded, the day 7 card', /reminder 1 /.test(chip) && /reminder 2 /.test(chip) && /practice\?'recorded ':'sent '/.test(chip) && /day 7 card raised/.test(chip));
ck('nothing shows once the offer is signed or withdrawn', /if\(o\.offer_signed_at\|\|o\.offer_withdrawn_at\) return '';/.test(chip));
const j4 = journey.slice(journey.indexOf('"order": 13.4'), journey.indexOf('"order": 14'));
ck('the journey lists moment 2 with her wording, the window, one stamp each, stopped by a signature, the day 7 card', /Hi \{first\}, your offer from Caring Companions is still waiting for your signature\. It takes about two minutes:/.test(j4) && /Monday to Saturday 9am to 6pm Central/.test(j4) && /One stamp per reminder/.test(j4) && /Stopped by a signature, a decline or a withdrawal/.test(j4) && /Offer not signed: call \{name\}/.test(j4) && /Reply STOP to opt out\./.test(j4));
ck('no em dash in the new words', !/—/.test(chip + j4));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

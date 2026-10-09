/* node tests/offer-step1-1d-test.js
   Slice 1d in the Hub (2026-10-09): the Open offers card shows the Step 1 line for a fully signed new-path offer (reading the
   Training Platform's record: waiting, practice, held, went, did not go, stopped) with Resend Step 1; the journey lists
   moment 3 with her exact wording. The card never sends; the server does. */
const fs = require('fs'), path = require('path');
const js = fs.readFileSync(path.join(__dirname, '..', 'caregivers-engine.js'), 'utf8');
const journey = fs.readFileSync(path.join(__dirname, '..', 'applicant-journey.js'), 'utf8');
let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 400))); };
const card = js.slice(js.indexOf("/* Start link, one line, because it sends itself."), js.indexOf("<b style=\"color:#0D365F\">Level of care:</b>"));
ck('the Step 1 line appears only once both documents are signed', /o\.offer_signed_at&&o\.pd_signed_at\s*\?[\s\S]*Step 1 link:/.test(card));
ck('Resend Step 1 is a person\'s action, hidden on a withdrawn offer or a finished Step 1', /o\.offer_withdrawn_at\|\|\(o\.step1_delivery&&o\.step1_delivery\.done\)\?'':'<button[^>]*offerResendStep1/.test(card));
const chip = js.slice(js.indexOf('function step1Chip('), js.indexOf('async function offerResendStep1('));
ck('the chip reads the record: waiting, practice, held, went, did not go (retrying), stopped after n tries', /waiting to send/.test(chip) && /recorded in practice/.test(chip) && /held until 8am/.test(chip) && /did not go/.test(chip) && /\(retrying\)/.test(chip) && /stopped after/.test(chip) && /see Needs Attention/.test(chip));
const fn = js.slice(js.indexOf('async function offerResendStep1('), js.indexOf('async function offerAction('));
ck('Resend Step 1 goes through the Training job-offer function (resend_step1) with the staff sign-in', /action:'resend_step1'/.test(fn) && /offerAction\(id/.test(fn));
ck('the helper is exposed to the page', /window\.offerResendStep1 = offerResendStep1;/.test(js));
const j3 = journey.slice(journey.indexOf('"order": 13.3'), journey.indexOf('"order": 14'));
ck('the journey lists moment 3 with her wording, automatic, once, three retries, never after 6pm, the STOP line', /Thank you, \{first\}, your offer is signed and we are so glad to have you\. Next is Step 1, your new-hire paperwork, done right on your phone:/.test(j3) && /"automatic": true/.test(j3) && /up to three times/.test(j3) && /never after 6pm/.test(j3) && /Reply STOP to opt out\./.test(j3) && /"subject": "Step 1: your new-hire paperwork"/.test(j3));
ck('the journey says the stand-in target is the start form until Slice 2', /stand-in; Slice 2 points it at the nine Step 1 screens/.test(j3));
ck('no em dash in the new words', !/—/.test(chip + fn + j3));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

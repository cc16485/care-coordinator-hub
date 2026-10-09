/* node tests/offer-sign-link-test.js
   The offer-and-sign link in the Hub (Slice 1b, 2026-10-09). The links a Desktop step minted never worked because the
   management API hands back a digest of HUB_JOB_SECRET, not the secret; so the office makes the link in the Hub, through
   the Hub's own server (applicant-link, kind offer), from the offer's own expiry. Shown and copied, never sent. Only
   offers on the new path show it; none is real until the switch date. */
const fs = require('fs'), path = require('path');
const js = fs.readFileSync(path.join(__dirname, '..', 'caregivers-engine.js'), 'utf8');
let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 400))); };
const card = js.slice(js.indexOf("/* Start link, one line, because it sends itself."), js.indexOf("<b style=\"color:#0D365F\">Level of care:</b>"));
ck('the Starting soon card shows the signing link line only for an offer on the new path', /o\.onboarding_path==='new'\s*\?/.test(card) && /Signing link:/.test(card));
ck('the line says the link dies with the offer and shows the expiry in Central time', /dies with the offer/.test(card) && /timeZone:'America\/Chicago'/.test(card));
ck('a signed offer says so instead of offering the link again', /both documents signed ✓/.test(card) && /offer signed, position description not yet/.test(card));
ck('a withdrawn offer shows no button', /o\.offer_withdrawn_at\?'':'<button[^>]*offerSignLink/.test(card));
const fn = js.slice(js.indexOf('async function offerSignLink('), js.indexOf('function offerCopyLink('));
ck('the link is made by the Hub server from the offer\'s own expiry, in seconds', /appLinkMint\(\{ kind: 'offer', offer_id: String\(o\.id\), exp: expSec \}\)/.test(fn) && /Math\.floor\(Date\.parse\(o\.offer_expires_at\) \/ 1000\)/.test(fn));
ck('no expiry ahead means no link, with a plain explanation', /expSec \* 1000 < Date\.now\(\)/.test(fn) && /no link can be made/.test(fn));
ck('the box offers Copy only: no text, no email, nothing sent from here', /offerCopyLink/.test(fn) && !/sms:/.test(fn) && !/mailto:/.test(fn) && /nothing is sent from here/.test(fn));
ck('the applicant page action appears for an unsigned, unwithdrawn new-path offer', /r\.offer\.onboarding_path === 'new' && !r\.offer\.offer_withdrawn_at && !\(r\.offer\.offer_signed_at && r\.offer\.pd_signed_at\)/.test(js) && /onclick="offerSignLink\(/.test(js));
ck('the helper is exposed to the page', /window\.offerSignLink = offerSignLink;/.test(js));
ck('no em dash in the new words', !/—/.test(card) && !/—/.test(fn));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

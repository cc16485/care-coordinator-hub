/* node tests/offer-screens-1f-test.js
   Slice 1f in the Hub (2026-10-09): the office opens a stored signed PDF from the card (logged on the server), the three offer
   cards have their own labels on Needs Attention, Background & References and Starting soon show where a new-path offer
   stands, and the signing page has the small Decline link. Nothing here sends. */
const fs = require('fs'), path = require('path');
const js = fs.readFileSync(path.join(__dirname, '..', 'caregivers-engine.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const page = fs.readFileSync(path.join(__dirname, '..', 'offer.html'), 'utf8');
let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 400))); };
const card = js.slice(js.indexOf("/* Start link, one line, because it sends itself."), js.indexOf("<b style=\"color:#0D365F\">Level of care:</b>"));
ck('the card offers "Open the offer letter" and "Open the position description" only for stored PDFs, and says opens are logged', /o\.offer_pdf_path\|\|o\.pd_pdf_path/.test(card) && /Open the offer letter/.test(card) && /Open the position description/.test(card) && /every open is logged/.test(card));
const fn = js.slice(js.indexOf('async function offerOpenDoc('), js.indexOf('function step1Chip('));
ck('the open goes through the signing server with the staff sign-in (action open), opens the 5-minute link, never stores it', /sb\.functions\.invoke\('offer-sign',\{ body:\{ action:'open', offer_id:String\(id\), doc \} \}\)/.test(fn) && /window\.open\(j\.url/.test(fn) && !/localStorage/.test(fn));
ck('the helper is exposed and the offers list is reachable from the Applicants views', /window\.offerOpenDoc = offerOpenDoc;/.test(js) && /window\.SCX = \{getOffers: \(\) => OFFERS,/.test(js));
const chip = js.slice(js.indexOf('function offeredChip('), js.indexOf('function obFillFromIntake('));
ck('Background & References: a new-path offer shows withdrawn / declined / signed / expired / opened / not opened, old path unchanged', /o\.onboarding_path === 'new'/.test(chip) && /offer withdrawn/.test(chip) && /offer declined/.test(chip) && /offer signed/.test(chip) && /offer expired unsigned/.test(chip) && /offer opened, not signed/.test(chip) && /offer not opened yet/.test(chip));
const ss = html.slice(html.indexOf('async function apStartingMount('), html.indexOf('const waiting = steps.filter', html.indexOf('async function apStartingMount(')));
ck('Starting soon: the new-path offer is matched by phone digits or email (never by name) and its state is a step', /SCX\.getOffers/.test(ss) && /digits\(o\.phone\) === d/.test(ss) && /never by name/.test(ss) && /offer signed/.test(ss) && /offer declined/.test(ss));
ck('Starting soon offers the Signing link while the offer is open and unsigned', /offerSignLink\(/.test(ss) && /!npo\.offer_withdrawn_at && !\(npo\.offer_signed_at && npo\.pd_signed_at\)/.test(ss));
ck('the three offer cards have their own labels on Needs Attention', /offer_declined: \{ label:'Offer declined'/.test(html) && /offer_unsigned: \{ label:'Offer not signed'/.test(html) && /offer_delivery: \{ label:'Offer or Step 1 not delivered'/.test(html));
ck('the signing page has the small Decline link under the offer letter only, with a confirm, an optional note, and a thank-you', /Not taking this offer\? Decline it here\./.test(page) && /doc === 'offer' \?/.test(page) && /confirm\('Decline this offer\?/.test(page) && /action: 'decline', note:/.test(page) && /Thank you for letting us know\./.test(page));
ck('no em dash in the new words', !/—/.test(card + fn + chip + ss) && !/—/.test(page.slice(page.indexOf('SLICE 1f'), page.indexOf('async function declineGo') + 900)));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

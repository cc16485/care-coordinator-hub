/* node tests/offer-send-1c-test.js
   Slice 1c in the Hub (2026-10-09): the offer form carries a typed re-offer reason only when an authorized person gives one,
   shows the duplicate refusal with the existing offer, prints the new-path result lines (sent / held / practice / not
   delivered), and the Open offers card hides the start link on the new path and offers Resend and Withdraw. */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(__dirname, '..', 'caregivers-engine.js'), 'utf8');
const journey = fs.readFileSync(path.join(__dirname, '..', 'applicant-journey.js'), 'utf8');
let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 400))); };
const submit = html.slice(html.indexOf('async function submitJobOffer('), html.indexOf('function joShowDuplicate('));
ck('the form sends a re-offer reason only when one was typed by an authorized person (null otherwise)', /reoffer_reason: \(window\.JO_REOFFER_REASON\|\|null\)/.test(submit));
ck('a 409 duplicate shows the existing offer and re-enables the button; nothing else runs', /r\.status===409 && res\.duplicate\)\{ joShowDuplicate\(res\); btn\.disabled=false/.test(submit));
ck('a 403 (not authorized to re-offer) shows the server\'s words and clears the typed reason', /r\.status===403 && res\.duplicate\)/.test(submit) && /window\.JO_REOFFER_REASON=null; return; \}/.test(submit));
ck('the reason is cleared after a successful save', /if\(!r\.ok\|\|res\.error\) throw new Error[^\n]*\n\s*window\.JO_REOFFER_REASON=null;/.test(submit));
ck('new path result lines: practice, sent (with the held text), held only, not delivered; the old path keeps its start-link lines', /recorded in PRACTICE \(nothing sent; the Admin switch is off\)/.test(submit) && /Offer letter link sent by '\+went\.join\(' \+ '\)\+\(o\.held\?' \(the text is held until 8am\)':''\)/.test(submit) && /the text is held until 8am; the email did not go/.test(submit) && /Offer letter link was NOT delivered/.test(submit) && /else if\('start_sms' in res \|\| 'start_email' in res\)/.test(submit));
ck('a re-offer says so on the result list', /Re-offered over an open offer, with your reason on the audit trail/.test(submit));
const dup = html.slice(html.indexOf('function joShowDuplicate('), html.indexOf('function joPreviewMsgs('));
ck('the duplicate box names the person, the offer\'s state, and says nothing was sent', /already has an open offer/.test(dup) && /Nothing was sent\. Withdraw that offer on its card first, or re-offer with a reason if you are authorized/.test(dup));
ck('Re-offer anyway appears only when the Hub said may_reoffer, and needs a typed reason', /res\.may_reoffer\s*\?/.test(dup) && /jo_reoffer_reason/.test(dup) && /Type the reason for the new offer first/.test(dup));
const card = js.slice(js.indexOf("/* Start link, one line, because it sends itself."), js.indexOf("<b style=\"color:#0D365F\">Level of care:</b>"));
ck('the Open offers card shows no start link on the new path (Step 1 follows the signature)', /\(o\.onboarding_path==='new' \? '' :/.test(card));
ck('the signing-link line gains the delivery record, Resend (open, unsigned) and Withdraw (open)', /offerDeliveryChip\(o\)/.test(card) && /offerResend\(/.test(card) && /offerWithdraw\(/.test(card) && /o\.offer_withdrawn_at\|\|\(o\.offer_signed_at&&o\.pd_signed_at\)\?'':'<button[^>]*offerResend/.test(card));
const fn = js.slice(js.indexOf('function offerDeliveryChip('), js.indexOf('/* The same link as a QR code'));
ck('the delivery chip reads the record: practice, held until 8am, went, did not go', /\(practice\)/.test(fn) && /held until 8am/.test(fn) && /did not go/.test(fn));
ck('Resend and Withdraw go through the Training job-offer function with the staff member\'s own sign-in', /functions\/v1\/job-offer/.test(fn) && /'x-hub-token':await trainHubTok\(\)/.test(fn) && /TRAINING_HUB_ANON/.test(fn) && !/COMMS_ANON/.test(fn) && /action:'resend_offer'/.test(fn) && /action:'withdraw_offer'/.test(fn));
ck('Withdraw asks for a reason and says the link dies and nothing is deleted', /Their link stops working at once; nothing is deleted\. Type the reason:/.test(fn) && /reason\.trim\(\)\.length<4/.test(fn));
ck('the helpers are exposed to the page', /window\.offerResend = offerResend;/.test(js) && /window\.offerWithdraw = offerWithdraw;/.test(js));
ck('the journey lists the offer letter link (13.1) and its resend (13.2) with her wording', /"order": 13\.1/.test(journey) && /"order": 13\.2/.test(journey) && /Your offer is ready to read and sign on your phone, it takes about two minutes/.test(journey) && /Reply STOP to opt out\./.test(journey.slice(journey.indexOf('"order": 13.1'), journey.indexOf('"order": 13.2'))));
const mine = [submit.slice(submit.indexOf('SLICE 1c: the duplicate rule'), submit.indexOf('if(!r.ok||res.error) throw')), submit.slice(submit.indexOf('SLICE 1c (2026-10-09): on the NEW path'), submit.indexOf("else if('start_sms' in res")), dup, card.slice(card.indexOf('SLICE 1c'), card.indexOf("'<div id=\"od_'")), fn].join('\n');
ck('no em dash in the new words', mine.length > 1500 && !/—/.test(mine) && !/—/.test(journey.slice(journey.indexOf('"order": 13.1'), journey.indexOf('"order": 14'))), mine.length);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

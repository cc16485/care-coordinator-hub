/* node tests/offers-gone-quiet-test.js
   Offers clean-up (Samantha 2026-10-31, "build all three parts"): (1) someone already on the roster moves to Completed
   Step 1 by themselves, only when certain; (2) Close offer with two reasons, using the server's withdraw step;
   (3) offers with no movement for her number of days fold into one "Gone quiet" line. Real code cut out of
   caregivers-engine.js and index.html, fake people only. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const eng = fs.readFileSync(path.join(__dirname, '..', 'caregivers-engine.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const cut = (src, from, to) => { const a = src.indexOf(from), b = src.indexOf(to, a + 1); if (a < 0 || b < 0) throw new Error('not found: ' + from); return src.slice(a, b); };
let pass = 0, fail = 0; const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 160))); };

const ctx = { console, Date, DATA: { ops_settings: {} }, OFFERS: [], caregivers: [], candidates: [] };
vm.createContext(ctx);
vm.runInContext(cut(eng, 'function offerRejectedWhy(o){', 'function offerStageCounts(){'), ctx);
vm.runInContext(cut(eng, 'function offerMovedOn(o){', 'const OFF_MONTHS='), ctx);
vm.runInContext(cut(eng, 'function offerAgeDays(iso){', '\n}\n') + '\n}', ctx);
const set = (offers, roster, cands) => { ctx.OFFERS = offers; ctx.caregivers = roster; ctx.candidates = cands || []; vm.runInContext('OFFERS=this.OFFERS;caregivers=this.caregivers;candidates=this.candidates;', ctx); };
const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };

/* (1) already working */
const A = { id: 1, name: 'Test Alpha', phone: '(417) 555-0101', email: 'alpha@example.test', onboarding_path: 'old', interview_date: daysAgo(60) };
set([A], [{ id: 'g1', first: 'Test', phone: '417-555-0101', active: true }]);
ck('one active roster caregiver with their phone: certain, moves to Completed Step 1', ctx.offerOnRoster(A).state === 'yes' && ctx.offerStage(A) === 'completed');
set([A], [{ id: 'g1', email: 'ALPHA@example.test ' }]);
ck('an email match counts too (case and spaces ignored)', ctx.offerOnRoster(A).state === 'yes');
set([A], [{ id: 'g1', first: 'Test', last: 'Alpha' }]);
ck('a name alone never counts', ctx.offerOnRoster(A).state === 'no' && ctx.offerStage(A) === 'accepted');
set([A], [{ id: 'g1', phone: '4175550101' }, { id: 'g2', email: 'alpha@example.test' }]);
ck('two roster records share it: maybe, stays put', ctx.offerOnRoster(A).state === 'maybe' && ctx.offerStage(A) === 'accepted');
set([A], [{ id: 'g1', phone: '4175550101', active: false }]);
ck('an inactive roster record (a past caregiver, maybe a rehire): maybe, stays put', ctx.offerOnRoster(A).state === 'maybe' && ctx.offerStage(A) === 'accepted');
set([A], [{ id: 'g1', phone: '4175550101', offer_id: 99 }]);
ck('a roster record tied to a different offer: maybe', ctx.offerOnRoster(A).state === 'maybe');
const B = { id: 2, name: 'Test Beta', phone: '4175550101', onboarding_path: 'old', interview_date: daysAgo(10) };
set([A, B], [{ id: 'g1', phone: '4175550101' }]);
ck('another open offer has the same phone: maybe for both', ctx.offerOnRoster(A).state === 'maybe' && ctx.offerOnRoster(B).state === 'maybe');
set([A, Object.assign({}, B, { offer_withdrawn_at: '2026-09-01' })], [{ id: 'g1', phone: '4175550101' }]);
ck('a closed earlier offer with the same phone does not block it', ctx.offerOnRoster(A).state === 'yes');
set([{ id: 3, phone: '555-01' }], [{ id: 'g1', phone: '555-01' }]);
ck('a short or partial phone never matches', ctx.offerOnRoster(ctx.OFFERS[0]).state === 'no');
ck('nothing is written to the roster (read only)', !/offerOnRoster[\s\S]{0,40}(saveCaregivers|\.offer_id\s*=)/.test(cut(eng, 'function offerOnRoster(o){', 'function offerQuietDays(')));
ck('the past offers list calls a roster match "On the caregiver roster"', /offerOnRoster\(o\)\.state==='yes'\);\n    const where=/.test(eng));
ck('the card says "May already be working: check" for a maybe', /ros\.state==='maybe'\?[^\n]*May already be working: check/.test(eng));

/* (3) gone quiet */
set([], []);
ck('default is 30 days', ctx.offerQuietDays() === 30);
ctx.DATA.ops_settings.offers_quiet_days = 45; vm.runInContext('DATA=this.DATA', ctx);
ck('her number in Settings is used', ctx.offerQuietDays() === 45);
ctx.DATA.ops_settings.offers_quiet_days = 2;
ck('a number outside 7 to 365 falls back to 30', ctx.offerQuietDays() === 30);
ctx.DATA.ops_settings = {}; vm.runInContext('DATA=this.DATA', ctx);
ck('interview 40 days ago, nothing since: quiet', ctx.offerIsQuiet({ interview_date: daysAgo(40) }));
ck('interview 40 days ago but signed 5 days ago: still moving', !ctx.offerIsQuiet({ interview_date: daysAgo(40), offer_signed_at: daysAgo(5) + 'T15:00:00Z' }));
ck('attributes entered recently counts as movement', !ctx.offerIsQuiet({ interview_date: daysAgo(80), attributes_entered_at: daysAgo(3) + 'T10:00:00Z' }));
ck('29 days: not yet', !ctx.offerIsQuiet({ interview_date: daysAgo(29) }));
ck('no dates at all: never folded', !ctx.offerIsQuiet({}));
const ro = cut(eng, 'function renderOffers(){', 'function offerMovedOn(o){');
ck('only Offer sent and Accepted fold; Completed and Rejected never do', /const foldable=stage==='sent'\|\|stage==='accepted';/.test(ro));
ck('moving cards first, then one Gone quiet line with its count', /moving\.map\(card\)[\s\S]*Gone quiet · '\+quiet\.length/.test(ro));
ck('the Gone quiet line stays open across a refresh once opened', /OFF_QUIET_OPEN\?' open':''/.test(ro) && /ontoggle="OFF_QUIET_OPEN=this\.open"/.test(ro));

/* (2) close offer */
const cl = cut(eng, 'let OFF_QUIET_OPEN=false;', '/* The same link as a QR code');
ck('two reasons, exactly hers', /OFFER_CLOSE_REASONS=\['Didn\\'t finish Step 1','Not moving forward'\]/.test(cl));
ck('uses the server withdraw step with the reason; nothing else is called', /action:'withdraw_offer',reason:'Closed: '\+reason/.test(cl) && !/sendSms|ghl|fetch\(/.test(cl));
ck('says nothing is sent and nothing is deleted', /Nothing is sent to them and nothing is deleted/.test(cl));
ck('a failure is shown on the card, never silent', /Could not close it: /.test(cl));
ck('Close offer shows on current-process cards only (the new path has Withdraw)', /\(np\|\|o\.offer_withdrawn_at\?'':'<button[^\n]*offerCloseAsk/.test(ro));

/* Settings */
ck('Settings has the gone-quiet box and it saves offers_quiet_days', /data-set="offers-quiet"/.test(html) && /m\.offers_quiet_days=n/.test(html) && /try\{ offqFill\(\); \}catch/.test(html));
ck('Settings refuses a day count outside 7 to 365', /if\(!\(n>=7&&n<=365\)\)/.test(html));

console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);

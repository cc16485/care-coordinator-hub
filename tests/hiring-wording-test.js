/* node tests/hiring-wording-test.js            (optionally TRAINING_ROOT=/path/to/training node tests/hiring-wording-test.js)
   Hiring wording 415 (2026-10-02, Samantha): after the interview the rest is from home. The Hub's preview of the
   Viventium welcome (joPreviewMsgs in index.html) and applicant-journey.js say exactly what the Training Platform's
   job-offer sends: paid training from home, then a care coordinator calls (2026-11-04: the welcome video call is retired).
   The in-office orientation (the backup)
   asks for the original ID documents from Viventium Step 2, not a Social Security card or voided check. start.html says
   the same next steps. No em dashes, never "remote". With TRAINING_ROOT set, the words are also compared with job-offer. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 600))); };
const EM = /—/, REMOTE = /\bremote(ly)?\b/i;

const NEW_SMS_PARA = "Once your background check and references are complete, we'll text you a private link to your paid orientation, which you do from home on your phone or computer. When you finish, a care coordinator will call you to get you started.";
const STEP3 = "Once your background check and references are complete, we'll send Step 2 of your Viventium paperwork and text you a private link to your paid orientation. Do it on your phone or computer, in pieces if you like.";
const STEP4 = "When you finish orientation, a care coordinator will call you to go over everything, help you set up the AxisCare app, and talk about your first clients and shifts. Please have your ID with you for that call.";
const T3 = 'Step 3: Paid Training From Home', T4 = 'Step 4: A Call From Your Care Coordinator', VIDEO = /video call|book a quick/i;

// ---- the Hub preview, run for real against a tiny fake page ----
const cut = (from, to) => { const a = html.indexOf(from), b = html.indexOf(to, a + 1); if (a < 0 || b < 0) throw new Error('not found: ' + from); return html.slice(a, b); };
const els = { jo_first: { value: 'Ava' }, jo_prev_sms: {}, jo_prev_email: {} };
const ctx = { document: { getElementById: (id) => els[id] } };
vm.createContext(ctx);
vm.runInContext(cut('function escapeHtmlComms(', '\n') + '\n' + cut('function joPreviewMsgs(', '\n}\n') + '\n}', ctx);
ctx.joPreviewMsgs();
const prevSms = els.jo_prev_sms.textContent, prevEmail = els.jo_prev_email.innerHTML.replace(/&#39;/g, "'");
ck('Hub preview text: paid training from home, then the care coordinator calls (no video call)', prevSms.includes(NEW_SMS_PARA) && !/new employee orientation/i.test(prevSms) && !VIDEO.test(prevSms), prevSms);
ck('Hub preview email: Step 3 paid training from home + Step 4 a call from your care coordinator',
   prevEmail.includes(T3) && prevEmail.includes(STEP3) && prevEmail.includes(T4) && prevEmail.includes(STEP4) && !VIDEO.test(prevEmail)
   && !/Schedule Your Paid Orientation|new employee orientation/i.test(prevEmail), prevEmail);
// 2026-10-11 (Samantha: "that text should not be going out"): the welcome preview is off the offer form and the Hub no longer sends it.
ck('the Viventium welcome preview is gone from the offer form, and the Hub no longer sends it', !html.includes('id="jo_prev_sms"') && !/send_welcome/.test(fs.readFileSync(path.join(ROOT, 'caregivers-engine.js'), 'utf8')));
ck('Hub preview: no em dash, never "remote"', ![prevSms, prevEmail].some((x) => EM.test(x) || REMOTE.test(x)));

// ---- applicant-journey.js mirrors it exactly ----
globalThis.window = {}; require('../applicant-journey.js');
const J = globalThis.window.AP_JOURNEY;
const w = J.find((x) => x.name === 'Welcome / what happens next (Viventium)') || {};
ck('journey: the welcome text is the preview text, word for word', w.text === prevSms.replace(/^Hi Ava!/, 'Hi {first}!'), [w.text, prevSms]);
ck('journey: subject without an em dash', w.subject === 'Welcome to Caring Companions, here’s what happens next', w.subject);
ck('journey: the email summary names Step 3 paid training from home and Step 4 the care coordinator call', /Step 3 paid training from home/.test(w.email_summary) && /Step 4 a call from your care coordinator/.test(w.email_summary) && !VIDEO.test(w.email_summary), w.email_summary);
const rc = J.find((x) => x.subject === 'Your Step 1 paperwork is complete') || {};
ck('journey: the Step 1 receipt says orientation, then the care coordinator calls, never the video call', [rc.text, rc.email_summary].every((x) => /your paid online orientation\. When you finish orientation, a care coordinator will call you to get you started\./.test(x || '') && !VIDEO.test(x || '')), [rc.text, rc.email_summary]);
const oc = J.find((x) => x.name === 'Orientation booking confirmation') || {};
ck('journey: in-office booking confirmation asks for the Viventium Step 2 originals, no SSN card, no voided check',
   oc.text.includes('the original ID documents you uploaded in Viventium Step 2 (for example, your photo ID)') && !/Social Security|voided/i.test(oc.text) && !EM.test(oc.text), oc.text);
const inv = J.find((x) => /cleared to join/.test(x.text || '')) || {};
ck('journey: the orientation invite has no em dash, and matches caregivers-engine.js',
   !EM.test(inv.text) && fs.readFileSync(path.join(ROOT, 'caregivers-engine.js'), 'utf8').includes("Congratulations, you've been cleared to join Caring Companions!"), inv.text);
ck('index.html loads the new journey (cache version bumped)', /applicant-journey\.js\?v=2026(100[2-9]|10[1-3]\d|11[0-3]\d)/.test(html));
ck('journey: no em dash in any entry touched by 415', ![w.text, w.subject, w.email_summary, oc.text, inv.text].some((x) => EM.test(x || '')));

// ---- start.html (the start link page) ----
const start = fs.readFileSync(path.join(ROOT, 'start.html'), 'utf8').replace(/\s+/g, ' ');
ck('start.html: about 2 minutes', start.includes('This takes about 2 minutes.') && !/about two minutes/.test(start));
ck('start.html thank-you: paid training from home, then the care coordinator calls, no video call',
   start.includes('Once your background check and references are complete, we will text you a link to your paid training, which you do from home. When you finish, a care coordinator will call you to get you started.')
   && !/lets us book your orientation/.test(start) && !VIDEO.test(start));

// ---- optional: the Training Platform's job-offer sends the same words ----
if (process.env.TRAINING_ROOT) {
  const jo = fs.readFileSync(path.join(process.env.TRAINING_ROOT, 'supabase/functions/job-offer/index.ts'), 'utf8');
  ck('Training job-offer sends the same text paragraph', jo.includes(NEW_SMS_PARA));
  ck('Training job-offer sends the same Step 3 and Step 4', jo.includes(STEP3) && jo.includes(STEP4) && jo.includes(T3) && jo.includes(T4));
  ck('Training job-offer subject matches the journey', jo.includes("subject: '" + w.subject + "'"));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

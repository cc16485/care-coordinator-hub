/* FCSR (Samantha 2026-10-14): when it went to the state and how many days it has waited; the FCSR sheet with the facts in
   the order of the state's forms (Employer Background Screening Request; Worker Registration MO 580-2421, 10-2026).
   FAKE people only. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const ENG = fs.readFileSync(path.join(ROOT, 'caregivers-engine.js'), 'utf8');
const cut = (src, a, b) => { const i = src.indexOf(a); const j = src.indexOf(b, i + 1); if (i < 0 || j < 0) throw new Error('cannot find ' + a); return src.slice(i, j); };
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ', m); } else { fail++; console.log('FAIL ', m); } };
const iso = n => { const d = new Date(Date.now() - n * 864e5); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const x = { String, Date, isNaN, Math, bgrEsc: s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/'/g,'&#39;') };
vm.createContext(x);
vm.runInContext(cut(ENG, 'const BGR_CHECKS = [', 'function bgrEnsureDrawer(){').replace('const BGR_CHECKS', 'var BGR_CHECKS'), x);
vm.runInContext(cut(ENG, 'function obChecksHtml(c){', 'window.obChecksMount = obChecksMount;'), x);
const row = h => (h.match(/<tr style="border-bottom[^]*?<\/tr>/g) || []).find(r => />FCSR</.test(r)) || '';
let r = row(x.obChecksHtml({ id: 9, offer_id: 'o1', fcsr: 'Pending', fcsr_sent_date: iso(5), fcsr_sent_by: 'krystal@mo-care.com' }));
ok(/>Waiting<\/span>/.test(r) && /waiting 5 days/.test(r) && /krystal@mo-care\.com/.test(r), 'sent to the state: Waiting, how many days, who marked it');
ok(/obFcsrSent\(9\)">Change the sent date/.test(r) && /bgrScreeningDesk\(9\)">FCSR sheet/.test(r), 'change the sent date; the FCSR sheet');
r = row(x.obChecksHtml({ id: 9, fcsr: 'Pending' }));
ok(/obFcsrSent\(9\)">Mark as sent to the state/.test(r) && />Pending<\/span>/.test(r) && !/FCSR sheet/.test(r), 'not sent yet: Pending, Mark as sent; no sheet without an offer');
r = row(x.obChecksHtml({ id: 9, fcsr: 'Clear', fcsr_date: '2026-10-14', fcsr_sent_date: '2026-10-09', fcsr_proof: 'f.pdf' }));
ok(/>Clear<\/span>/.test(r) && /sent 10\/09\/2026, back in 5 days/.test(r) && !/obFcsrSent/.test(r), 'the result in: sent date kept, how long it took');

const f = cut(ENG, 'function obFcsrSent(candId){', 'window.obFcsrSent = obFcsrSent;');
const run = answer => { const calls = []; const c = { candidates: [{ id: 9 }], prompt: () => answer, alert: m => calls.push(['alert', m]), bgrApplyBoardChange: (id, ch) => calls.push(['save', id, ch]), Date, String, isNaN };
  vm.createContext(c); vm.runInContext(f, c); c.obFcsrSent(9); return calls; };
let k = run(iso(2)); ok(k[0][0] === 'save' && k[0][2].fcsr_sent_date === iso(2) && 'fcsr_sent_at' in k[0][2], 'saves the sent date with who and when');
ok(run('10/09/2026')[0][0] === 'alert' && run(iso(-3))[0][0] === 'alert', 'a wrong or future date is refused');
ok(run(null).length === 0, 'Cancel saves nothing');

const desk = cut(ENG, 'function sdRender(){', 'async function sdReveal(');
ok(/1 · Run their screening/.test(desk) && /Employer Background Screening Request/.test(desk) && /Worker Registration, MO 580-2421 \(10-2026\)/.test(desk), 'the sheet follows the two state forms');
const order = ['Last name (current/legal)', 'First name (current/legal)', 'Middle initial', 'Social Security number', 'Date of birth'];
ok(order.every((l, i) => i === 0 || desk.indexOf("line('" + l + "'") > desk.indexOf("line('" + order[i - 1] + "'")), 'screening request: last, first, MI, SSN, date of birth, in that order');
for (const l of ['Middle name, suffix', 'Birth name', 'Prior names used', 'Date of birth (MM-DD-YYYY)', 'Gender', 'Mailing address', 'County', 'Telephone (no dashes)', 'Email (required)'])
  ok(desk.includes("line('" + l + "'"), 'registration field: ' + l);
ok((desk.match(/notYet\)/g) || []).length >= 5, 'facts Step 1 does not collect yet say so (MI, middle/suffix, birth name, gender, county)');
ok(!/Fictional offers only/.test(ENG), 'the stale "fictional offers only" line is gone');
ok(/async function sdCopyText\(btn\)/.test(ENG) && /window\.sdCopyText = sdCopyText/.test(ENG), 'Copy buttons for each fact');
ok(!/—/.test(cut(ENG, '2026-10-14 (Samantha: "have all', '  h += \'<div style="display:flex;gap:.5rem;flex-wrap:wrap;margin:.6rem 0">')) && !/—/.test(f), 'no em dashes');
console.log(`fcsr-sent-sheet: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

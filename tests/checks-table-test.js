/* Background checks on the person's page (2026-10-14, step 3): one table, each result with its date, proof and who
   recorded it; Edit candidate no longer edits checks. FAKE people only. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const ENG = fs.readFileSync(path.join(ROOT, 'caregivers-engine.js'), 'utf8');
const IDX = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const cut = (src, a, b) => { const i = src.indexOf(a); const j = src.indexOf(b, i + 1); if (i < 0 || j < 0) throw new Error('cannot find ' + a); return src.slice(i, j); };
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ', m); } else { fail++; console.log('FAIL ', m); } };
const x = { String, Date, isNaN, bgrEsc: s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/'/g,'&#39;') };
vm.createContext(x);
vm.runInContext(cut(ENG, 'const BGR_CHECKS = [', 'function bgrEnsureDrawer(){').replace('const BGR_CHECKS', 'var BGR_CHECKS'), x);
vm.runInContext(cut(ENG, 'function obChecksHtml(c){', 'window.obChecksMount = obChecksMount;'), x);
const h = x.obChecksHtml({ id: 9, oos: 'no', oig: 'CLEAR', oig_date: '2026-10-09', oig_proof: 'bgcheck/9/oig.json', oig_by: 'krystal@mo-care.com', oig_at: '2026-10-09T15:00:00Z',
  edl: 'Clear', edl_date: '2026-10-09', fcsr: 'Pending', casenet: 'Issues Found', casenet_date: '2026-10-10', casenet_proof: 'x.pdf', fp: 'N/A' });
ok((h.match(/<tr style="border-bottom/g) || []).length === 5, 'one row per check: OIG, EDL, FCSR, Case.net, fingerprints');
ok(/krystal@mo-care\.com · 10\/09\/2026/.test(h), 'who recorded it and when');
ok(/not recorded \(before 10\/14\/2026\)/.test(h), 'older results say the recorder was not kept');
ok(/none on file/.test(h), 'a result without its proof says so');
ok(/bgrRecordCheck\(9,'fcsr'\)">Record a result/.test(h) && /bgrRecordCheck\(9,'oig'\)">Record a new result/.test(h), 'record a result uses the existing recorder (which needs date and proof)');
ok(/bgrRunOIG\(9,this\)">Run it now/.test(h), 'OIG can be run from here');
ok(/Not required/.test(h) && !/bgrRecordCheck\(9,'fp'\)/.test(h), 'in-state: fingerprints not required, no button');
ok(/>Clear<\/span>/.test(h) && /Issues Found/.test(h), 'results shown in words');
const o = x.obChecksHtml({ id: 9, oos: 'yes', fp: 'Required' });
ok(/bgrRecordCheck\(9,'fp'\)/.test(o), 'out of state: fingerprints can be recorded');

const save = cut(ENG, 'async function saveOB(){', 'let saved;');
ok(/oig:oldCand\?\(oldCand\.oig\|\|'Pending'\):'Pending'/.test(save) && !/g\('ob-oig'\)/.test(save) && !/g\('ob-fp-proof'\)/.test(save), 'Edit candidate keeps the checks as they are');
ok(/'ob-oig','ob-oig-date','ob-oig-proof','ob-edl'/.test(ENG) && /el\.disabled = true/.test(ENG) && /g\('ob-oig-check-btn'\); if\(b\) b\.style\.display = 'none'/.test(ENG), 'and shows them greyed out, without its OIG button');
ok(/changes\[which\+'_by'\] = /.test(ENG) && /c\.oig_by = /.test(ENG) && /\[check \+ '_by'\]: /.test(ENG), 'who and when on every way a result is recorded (recorder, OIG run, background review)');
ok(/apProfCard\('Background checks', '<div id="apChecksHost">/.test(IDX) && /obChecksMount\(ch, boardCand\.id\)/.test(IDX), 'the table is on the Training & checks tab, found by id');
ok(/document\.querySelectorAll\('\.pp-checks\[data-cand\]'\)/.test(ENG), 'redraws after a Background & References save');
ok(!/—/.test(cut(ENG, '/* ── BACKGROUND CHECKS ON THE PERSON', 'window.obChecksMount')), 'no em dashes');
console.log(`checks-table: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

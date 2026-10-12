/* Step 3, the fixes (2026-10-12): OIG on the agency's monthly policy everywhere, a stored CLEAR is not an override,
   a clear batch result ends an old Overdue, supervisory proof lands where the table reads it, and the applicant page
   finds references asked from Background & References. FAKE data only. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const IDX = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const ENG = fs.readFileSync(path.join(ROOT, 'caregivers-engine.js'), 'utf8');
const ER = fs.readFileSync(path.join(ROOT, 'eligibility-rules.js'), 'utf8');
const cut = (src, a, b) => { const i = src.indexOf(a); const j = src.indexOf(b, i + 1); if (i < 0 || j < 0) throw new Error('cannot find ' + a); return src.slice(i, j); };
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ', m); } else { fail++; console.log('FAIL ', m); } };

ok(!/oig_date,90,14/.test(ENG) && (ENG.match(/oig_date,30,7\)/g) || []).length === 6, 'every OIG check in the engine is monthly (6 places)');
ok(/g\.oig_date,g\.oig_proof,30,'rechecked monthly \(agency policy\)'/.test(IDX) && /g\.edl_date,g\.edl_proof,30,'rechecked monthly \(agency policy\)'/.test(IDX), 'caregiver page: OIG and EDL monthly');
ok(/OIG check is overdue \(monthly, agency policy\)/.test(ER), 'matches the scheduling rule, which already says monthly');
ok(!/rechecked every 90 days/.test(IDX), 'no "every 90 days" left for OIG or EDL');

/* compCell: which status shows */
const cc = cut(ENG, 'function compCell(lastStr,info,overrideStatus,proof){', 'const fpBadge');
const pick = (ov, derived) => { const c = { String }; vm.createContext(c);
  vm.runInContext('function f(overrideStatus,info){ ' + cut(cc, 'const ov=', 'const nd=') + ' return s; }', c); return c.f(ov, { status: derived }); };
ok(pick('CLEAR', 'Overdue') === 'Overdue', 'a CLEAR carried over at hire no longer hides an overdue check');
ok(pick('Current', 'Overdue') === 'Current' && pick('Overdue', 'Current') === 'Overdue', 'a hand-set Current or Overdue still wins');
ok(pick('FLAGGED', 'Current') === 'FLAGGED', 'a flagged result still shows');
ok(pick('', 'Due Soon') === 'Due Soon', 'no override: the date decides');

/* batch OIG */
const bo = cut(ENG, '        caregivers[i].oig_date = today;', '        cleared++;');
const cg = { oig_status: 'Overdue' }; const c2 = { caregivers: [cg], i: 0, today: '2026-10-12', String }; vm.createContext(c2);
vm.runInContext(bo, c2);
ok(cg.oig_status === '' && cg.oig_date === '2026-10-12', 'a clear batch result ends an old Overdue mark');
const cg2 = { oig_status: 'Current' }; c2.caregivers = [cg2]; vm.runInContext(bo, c2);
ok(cg2.oig_status === 'Current', 'a hand-set Current is left alone');

/* supervisory */
ok(/if\(record\.proof_link\) cg\.supv_proof = record\.proof_link;/.test(IDX), 'supervisory visit proof lands in supv_proof, which the table reads');

/* applicant page references */
const ob = cut(IDX, 'async function apOnboardMount(r, hostEl){', 'if(!intake){');
ok(/String\(c\.intake_id \|\| ''\) === String\(intake\.id\)/.test(ob) && /\.in\('candidate_id', ids\)/.test(ob), 'finds requests through the board record made from their start form (ids only)');
ok(!/ilike|phone|email/.test(cut(ob, 'requests asked from Background', 'one line per reference')), 'no name, phone or email matching in the fallback');
const dd = cut(ob, '{ const by = {};', 'R = Object.values');
const c3 = { String, Object }; vm.createContext(c3);
c3.R = [{ slot: 1, created_at: '2026-10-01' }, { slot: 1, created_at: '2026-10-05' }, { slot: 2, created_at: '2026-10-05' }, { slot: 2, created_at: '2026-10-01', responded_at: '2026-10-02' }];
vm.runInContext(dd + 'R = Object.values(by).sort((a, b) => (a.slot||0) - (b.slot||0)); }', c3);
ok(c3.R.length === 2 && c3.R[0].created_at === '2026-10-05' && c3.R[1].responded_at, 'one line per reference: the answered request, else the newest');
ok(/window\.SCX\.getCandidates = \(\) => candidates;/.test(ENG), 'the board list is readable by the applicant page');

console.log(`step3-fixes: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

/* Checks after hire (2026-10-14, step 3): Record a result on the caregiver's page (proof required, who and when), OIG run
   from the page, Edit caregiver keeps the checks, and the hire record carries who recorded each pre-hire check. FAKE data. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const IDX = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), ENG = fs.readFileSync(path.join(ROOT, 'caregivers-engine.js'), 'utf8');
global.window = global; require(path.join(ROOT, 'eligibility-rules.js')); require(path.join(ROOT, 'caregiver-connect-rules.js'));
const cut = (src, a, b) => { const i = src.indexOf(a); const j = src.indexOf(b, i + 1); if (i < 0 || j < 0) throw new Error('cannot find ' + a); return src.slice(i, j); };
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ', m); } else { fail++; console.log('FAIL ', m); } };
(async () => {
  /* the recorder: what it saves for each kind */
  const run = async (kind, opts) => {
    const saved = [], alerts = [];
    const els = { cgrDate: { value: opts.date }, cgrFile: { files: opts.file ? [opts.file] : [] }, cgrLink: { value: opts.link || '' } };
    const x = { CGR: { gid: '7', kind }, document: { getElementById: id => els[id] || null }, alert: m => alerts.push(m), String, Date, Object, JSON, Blob: function(){}, Number,
      sb: { storage: { from: () => ({ upload: async (p) => ({ error: null, path: p }) }) } },
      cgrPut: async (gid, ch) => { saved.push(ch); return true; }, cgrClose(){}, cgrWho: () => 'krystal@mo-care.com', CGD: {}, cgdOpenProfile(){} };
    vm.createContext(x); vm.runInContext(cut(IDX, 'const CGR_KINDS = {', 'let CGR = {').replace('const CGR_KINDS', 'var CGR_KINDS') + cut(IDX, 'async function cgrSave(btn){', 'async function cgrRunOIG('), x);
    await x.cgrSave({});
    return { saved, alerts };
  };
  let r = await run('edl', { date: '2026-10-10' });
  ok(!r.saved.length && /needs its proof/.test(r.alerts[0]), 'no proof, nothing saved');
  r = await run('edl', { date: '2099-01-01', link: 'https://x.example/edl.pdf' });
  ok(!r.saved.length && /date/.test(r.alerts[0]), 'a future date is refused');
  r = await run('edl', { date: '2026-10-10', link: 'https://x.example/edl.pdf' });
  const e = r.saved[0] || {};
  ok(e.edl_date === '2026-10-10' && e.edl_proof === 'https://x.example/edl.pdf' && e.edl_status === '' && e.edl_by === 'krystal@mo-care.com' && e.edl_at, 'EDL: date, proof, who and when; an old hand-set status is cleared so the date decides');
  r = await run('oig', { date: '2026-10-10', file: { name: 'oig result.pdf', size: 1000 } });
  ok(/^bgcheck\/cg-7\/oig-\d+-oig_result\.pdf$/.test(r.saved[0].oig_proof) && r.saved[0].oig === 'CLEAR', 'OIG: the uploaded file is the proof');
  r = await run('fcsr_reg', { date: '2026-10-10', link: 'https://x.example/reg.pdf' });
  ok(r.saved[0].fcsr_reg_date === '2026-10-10' && r.saved[0].fcsr_reg_by && !('fcsr_reg_status' in r.saved[0]), 'FCSR registration: its own date and proof');
  r = await run('fp', { date: '2026-10-10', link: 'https://x.example/fp.pdf' });
  ok(r.saved[0].fp === 'Clear' && r.saved[0].fp_by, 'fingerprints: Clear with proof');
  ok(/Only a clear result is recorded here/.test(IDX), 'only a clear result is recorded; anything else goes to an owner');
  const oigRun = cut(IDX, 'async function cgrRunOIG(gid, btn){', 'window.cgrRecord');
  ok(/if\(!data\.clear\)\{ alert\('Possible match/.test(oigRun) && /Nothing was recorded/.test(oigRun), 'a possible OIG match records nothing and says to tell an owner');
  ok(/leie-result\.json/.test(oigRun) && /if\(up\.error\) throw/.test(oigRun), 'a clear OIG run keeps its result as the proof, or records nothing');
  ok(/const ok = await ccCaregiverPut\(g\)/.test(IDX) && /\.eq\('key','caregivers'\)/.test(cut(IDX, 'async function cgrPut', 'async function cgrSave')), 'saves that one caregiver against the version just read');

  const comp = cut(IDX, 'function cgdComplianceHtml(c,g){', 'async function cgdLoadTraining');
  for (const k of ['oig', 'edl', 'fcsr', 'fcsr_reg', 'fp']) ok(comp.includes(",'" + k + "')"), 'Record a result on ' + k);
  ok(/Verified by:<\/span> '\+\(key&&g\[key\+'_by'\]/.test(comp), 'Verified by shows who recorded it');
  ok(!/—/.test(comp), 'no em dashes in the compliance section');

  const scg = cut(ENG, 'async function saveCG', 'let savedCG');
  ok(/oig_date:oldCG\?\(oldCG\.oig_date\|\|''\):''/.test(scg) && !/g\('cg-oig'\)/.test(scg) && !/g\('cg-fp-proof'\)/.test(scg), 'Edit caregiver keeps the checks as they are');
  ok(/'cg-oig','cg-oig-s','cg-oig-proof'/.test(ENG) && /cg-oig-check-btn/.test(ENG), 'and greys them out, without its OIG button');

  const rec = CCConnect.recordFromCandidate({ id: 9, first: 'A', last: 'B', oig: 'CLEAR', oig_date: '2026-10-09', oig_by: 'krystal@mo-care.com', oig_at: '2026-10-09T15:00:00Z', fcsr: 'Clear', fcsr_sent_date: '2026-10-01', casenet: 'Clear', casenet_by: 'sam@mo-care.com' }, '2026-10-14', '', { id: 1, promoted_at: 'x' });
  ok(rec.prehire.oig.by === 'krystal@mo-care.com' && rec.prehire.oig.at && rec.prehire.casenet.by === 'sam@mo-care.com' && rec.prehire.fcsr.sent === '2026-10-01', 'the hire record keeps who recorded each pre-hire check, and when FCSR went to the state');
  ok(rec.prehire.edl.by === '' && rec.prehire.fp.applicable === false, 'older results: empty, never guessed');
  console.log(`hired-checks: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();

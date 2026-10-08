/* node tests/fix-intake-columns-test.js
   Fix 1 of 4 (Samantha, 2026-10-08): "Start checks early" and the offer-to-checks path read hire_intake with select('*'),
   which the SSN column lock refuses for office staff, so a start form's references never came across. The real
   offerToCandidate, cut out of caregivers-engine.js, run against a fake database that refuses select('*') exactly as
   the lock does: references now come across; the read never names the ssn column; a failed read is said, not
   swallowed; no em dash. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'caregivers-engine.js'), 'utf8');
const cut = (from, to) => { const a = src.indexOf(from), b = src.indexOf(to, a + 1); if (a < 0 || b < 0) throw new Error('not found: ' + from); return src.slice(a, b); };
let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 600))); };
const code = [cut('function obRefType(v){', 'function obRefTypeLabel('), cut('/* The hire_intake columns office staff may read', "/* Step 1 is Viventium's paperwork")].join('\n');
ck('no select(*) on hire_intake is left anywhere in the engine', !/from\('hire_intake'\)\.select\('\*'\)/.test(src));
ck('the granted column list never names the ssn', !/ssn/.test(src.slice(src.indexOf('const INTAKE_READ_COLS'), src.indexOf('async function offerToCandidate('))));
function world(rows, opts = {}) {
  const log = { selects: [], warns: [], alerts: [] };
  const chain = (data, error) => { const b = { order(){ return b; }, limit(){ return Promise.resolve({ data, error }); }, is(){ return b; } }; return b; };
  const ctx = {
    console: { warn: (...a) => log.warns.push(a.join(' ')), error(){}, log(){} }, Date, JSON, String, Array, Object, Number, Promise, RegExp, Math, parseInt,
    OFFERS: [{ id: 'of-1', first_name: 'Kristen', last_name: 'Sample', phone: '(417) 555-0101', email: 'k@example.test', position: 'Caregiver' }],
    candidates: [], caregivers: [], INTAKE_ROWS: [], HYDRATED: true, _tmp: 0,
    safeTmpId: () => --ctx._tmp, saveCandidates: async () => { ctx.candidates.forEach(c => { if (c.id < 0) c.id = 100 - c.id; }); return true; },
    renderOB(){}, renderAlerts(){}, gotoTab(){}, alert: (m) => log.alerts.push(m), loadOffers: async () => {},
    sb: { from: () => ({ select: (cols) => { log.selects.push(cols);
      if (cols === '*') return chain(null, { message: 'permission denied for table hire_intake' });   /* the SSN column lock */
      if (opts.noEmployerCol && /no_employer_history/.test(cols)) return chain(null, { message: 'column hire_intake.no_employer_history does not exist' });
      if (opts.fail) return chain(null, { message: 'network down' });
      return chain(rows, null); } }) },
  };
  ctx.window = ctx; vm.createContext(ctx); vm.runInContext(code, ctx);
  return { ctx, log };
}
const FORM = { id: 'in-1', first_name: 'Kristen', last_name: 'Sample', phone: '4175550101', email: 'k@example.test', lived_outside_mo: true, no_employer_history: false,
  refs: [{ name: 'Ann Boss', phone: '4175550100', email: 'ann@x.test', relationship: 'supervisor', type: 'Professional', company: 'Acme', how_long: '3y' }, { name: 'Pat Pal', type: 'personal' }], created_at: '2026-10-07T15:00:00Z' };
(async () => {
  let W = world([FORM]);
  let r = await W.ctx.offerToCandidate('of-1', null, { quiet: true });
  let c = W.ctx.candidates[0];
  ck('the start form is read with the granted columns, never *', W.log.selects.length === 1 && !W.log.selects.includes('*') && /refs/.test(W.log.selects[0]) && /no_employer_history/.test(W.log.selects[0]), W.log.selects);
  ck('its references and facts come across onto the new row', r.ok && r.gotRefs === 2 && c.r1n === 'Ann Boss' && c.r1_type === 'professional' && c.r2n === 'Pat Pal' && c.oos === 'yes' && c.fp === 'Required' && c.no_employer_history === false, c);
  W = world([FORM], { noEmployerCol: true });
  r = await W.ctx.offerToCandidate('of-1', null, { quiet: true });
  ck('a database without no_employer_history yet: the older column list is used and the references still come', W.log.selects.length === 2 && r.gotRefs === 2 && W.ctx.candidates[0].r1n === 'Ann Boss', W.log.selects);
  W = world([FORM], { fail: true });
  r = await W.ctx.offerToCandidate('of-1', null, { quiet: true });
  ck('a failed read is said in the console and the person is still added, without references', r.ok && r.gotRefs === 0 && W.log.warns.some(w => /hire_intake read failed/.test(w)) && W.ctx.candidates.length === 1, W.log.warns);
  ck('the dormant reconciler reads the same granted columns', /from\('hire_intake'\)\.select\(INTAKE_READ_COLS\)\s*\n\s*\.is\('candidate_id', null\)/.test(src));
  ck('no em dash in the change', !/—/.test(cut('/* Fix 1 of 4 (2026-10-08)', 'intake = (data || []).find')));
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();

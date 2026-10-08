/* node tests/fix-startform-link-test.js
   Fix 2 of 4 (Samantha, 2026-10-08): hire_intake.applicant_id was only ever set by a one-time backfill, so the applicant's
   page said "No start form yet" and Starting soon showed no start-form dot for every newer hire. The two lookups now fall
   back to the phone or email on the application. The real helpers, cut out of index.html, against fake rows: a form is
   found by phone, by email, never given to two applicants, a linked form keeps its link, nothing is written. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const cut = (from, to) => { const a = html.indexOf(from), b = html.indexOf(to, a + 1); if (a < 0 || b < 0) throw new Error('not found: ' + from); return html.slice(a, b); };
let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 500))); };
const code = cut('function apMatchIntakes(rows, linked, recent){', 'async function apOnboardMount(r){');
const calls = [];
const chain = (data) => { const b = { ilike(c, v){ calls.push([c, v]); return b; }, order(){ return b; }, limit(){ return Promise.resolve({ data, error: null }); } }; return b; };
const ctx = { console, Promise, String, Set, Array, Object, sb: { from: () => ({ select: () => chain(ctx.ROWS) }) }, ROWS: [] };
vm.createContext(ctx); vm.runInContext(code, ctx);
(async () => {
  const rows = [{ id: 'a1', phone: '(417) 555-0101', email: 'k@example.test' }, { id: 'a2', phone: '417-555-0102', email: '' }, { id: 'a3', phone: '', email: 'J@Example.test' }, { id: 'a4', phone: '4175550104', email: '' }];
  const linked = [{ applicant_id: 'a1', created_at: '2026-09-01' }];
  const recent = [
    { applicant_id: null, phone: '+1 417 555 0101', email: '', created_at: '2026-10-01' },          /* a1 again, but a1 is already linked: left alone */
    { applicant_id: null, phone: '4175550102', email: '', created_at: '2026-10-02' },                /* a2 by phone */
    { applicant_id: null, phone: '', email: 'j@example.test', created_at: '2026-10-03' },           /* a3 by email, case-insensitive */
    { applicant_id: 'zz', phone: '4175550104', email: '', created_at: '2026-10-04' },               /* carries another applicant's id: never reassigned */
  ];
  const out = ctx.apMatchIntakes(rows, linked, recent);
  ck('a linked form keeps its link and is not duplicated', out.filter(x => x.applicant_id === 'a1').length === 1 && out[0].created_at === '2026-09-01', out);
  ck('a newer form is matched by phone digits', out.some(x => x.applicant_id === 'a2' && x.created_at === '2026-10-02'), out);
  ck('a newer form is matched by email, case-insensitive', out.some(x => x.applicant_id === 'a3'), out);
  ck("a form that carries another applicant's id is never reassigned", !out.some(x => x.applicant_id === 'a4'), out);
  ck('one form is never given to two applicants', (() => { const r2 = ctx.apMatchIntakes([{ id: 'b1', phone: '4175550102' }, { id: 'b2', phone: '4175550102' }], [], [{ applicant_id: null, phone: '4175550102' }]); return r2.length === 1; })());
  ck('inputs are not mutated (nothing is written back)', recent[1].applicant_id === null && linked.length === 1);
  /* the profile card helper */
  ctx.ROWS = [{ id: 'in-9', phone: '417-555-0199', email: 'x@example.test', created_at: '2026-10-05' }, { id: 'in-8', phone: '417-555-0199', email: '', created_at: '2026-09-05' }];
  const one = await ctx.apIntakeByContact({ phone: '(417) 555-0199', email: 'other@example.test' });
  ck('the profile card finds the newest form by phone when the link is missing', one && one.id === 'in-9', one);
  ck('the lookups ask by the last four digits and by email, never by the SSN', calls.every(([c]) => c === 'phone' || c === 'email') && calls.some(([c, v]) => c === 'phone' && v === '%0199'), calls);
  ctx.ROWS = [{ id: 'in-7', phone: '4175550000', email: 'nope@example.test', created_at: '2026-10-05' }];
  const none = await ctx.apIntakeByContact({ phone: '(417) 555-0199', email: 'x@example.test' });
  ck('a form with a different phone and email is not taken', none === null, none);
  ck('the Starting soon list reads recent forms and matches them', /apMatchIntakes\(rows, intakes, recent\.data\|\|\[\]\)/.test(html) && /limit\(200\)/.test(cut("const ids = rows.map(r=>r.id);", 'const digits = p =>')));
  ck('the profile card falls back when the link is missing', /if\(!intake\) intake = await apIntakeByContact\(r\);/.test(html));
  ck('no em dash in the change', !/—/.test(code));
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();

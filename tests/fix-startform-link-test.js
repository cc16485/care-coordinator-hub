/* node tests/fix-startform-link-test.js
   Fix 2 of 4 (Samantha, 2026-10-08): hire_intake.applicant_id was only ever set by a one-time backfill, so the applicant's
   page said "No start form yet" and Starting soon showed no start-form dot for every newer hire. The two lookups now fall
   back to the contact on the application, under her rule that a form is never associated with the wrong caregiver:
   phone or email AND first name must match, and no other applicant may match the same form. Cases: shared phone,
   shared email, phone pointing at one person and email at another, two forms from one person, a linked form, nothing
   written. The real helpers, cut out of index.html, against fake rows. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const cut = (from, to) => { const a = html.indexOf(from), b = html.indexOf(to, a + 1); if (a < 0 || b < 0) throw new Error('not found: ' + from); return html.slice(a, b); };
let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 500))); };
const code = cut('const apDigits = p =>', 'async function apOnboardMount(r){');
const calls = [];
const chain = (data) => { const b = { ilike(c, v){ calls.push([c, v]); return b; }, order(){ return b; }, limit(){ return Promise.resolve({ data, error: null }); } }; return b; };
const ctx = { console, Promise, String, Set, Array, Object, sb: { from: () => ({ select: () => chain(ctx.ROWS) }) }, ROWS: [] };
vm.createContext(ctx); vm.runInContext(code, ctx);
const M = (rows, linked, recent) => ctx.apMatchIntakes(rows, linked, recent);
(async () => {
  const A = { id: 'a1', first_name: 'Kristen', phone: '(417) 555-0101', email: 'k@example.test' };
  const B = { id: 'a2', first_name: 'Holly', phone: '417-555-0102', email: '' };
  const C = { id: 'a3', first_name: 'Jessica', phone: '', email: 'J@Example.test' };
  /* plain cases */
  let out = M([A, B, C], [{ applicant_id: 'a1', created_at: '2026-09-01' }], [
    { applicant_id: null, first_name: 'Kristen', phone: '+1 417 555 0101', email: '', created_at: '2026-10-01' },
    { applicant_id: null, first_name: 'holly', phone: '4175550102', email: '', created_at: '2026-10-02' },
    { applicant_id: null, first_name: 'Jessica', phone: '', email: 'j@example.test', created_at: '2026-10-03' },
    { applicant_id: 'zz', first_name: 'Dee', phone: '4175550102', email: '', created_at: '2026-10-04' } ]);
  ck('a linked form keeps its link and is not duplicated', out.filter(x => x.applicant_id === 'a1').length === 1 && out[0].created_at === '2026-09-01', out);
  ck('matched by phone digits and first name', out.some(x => x.applicant_id === 'a2' && x.created_at === '2026-10-02'), out);
  ck('matched by email and first name, case-insensitive', out.some(x => x.applicant_id === 'a3'), out);
  ck("a form that carries another applicant's id is never reassigned", !out.some(x => x.applicant_id === 'a4' || (x.applicant_id === 'zz' && x.first_name !== 'Dee')), out);
  /* the cases she named */
  const spouse1 = { id: 's1', first_name: 'Maria', phone: '4175550200', email: 'home@example.test' }, spouse2 = { id: 's2', first_name: 'Luis', phone: '4175550200', email: 'home@example.test' };
  out = M([spouse1, spouse2], [], [{ applicant_id: null, first_name: 'Maria', phone: '4175550200', email: 'home@example.test', created_at: '2026-10-05' }]);
  ck('a shared phone and email: the form goes to the person whose first name matches, and only to them', out.length === 1 && out[0].applicant_id === 's1', out);
  out = M([spouse1, { ...spouse2, first_name: 'Maria' }], [], [{ applicant_id: null, first_name: 'Maria', phone: '4175550200', email: '', created_at: '2026-10-05' }]);
  ck('a shared phone and the same first name: two people match, so the form is attached to nobody', out.length === 0, out);
  out = M([A, B], [], [{ applicant_id: null, first_name: 'Kristen', phone: '4175550102', email: 'k@example.test', created_at: '2026-10-06' }]);
  ck('phone points at one applicant and email at another: attached only where the first name agrees (one person), never both', out.length === 1 && out[0].applicant_id === 'a1', out);
  out = M([A, { ...B, first_name: 'Kristen' }], [], [{ applicant_id: null, first_name: 'Kristen', phone: '4175550102', email: 'k@example.test', created_at: '2026-10-06' }]);
  ck('...and when both people could be the match, nobody gets it', out.length === 0, out);
  out = M([A], [], [{ applicant_id: null, first_name: 'Robert', phone: '4175550101', email: '', created_at: '2026-10-07' }]);
  ck('the right phone but a different first name is not taken', out.length === 0, out);
  out = M([A], [], [{ applicant_id: null, first_name: 'Kristen', phone: '4175550101', email: '', created_at: '2026-10-01' }, { applicant_id: null, first_name: 'Kristen', phone: '4175550101', email: '', created_at: '2026-10-08' }]);
  ck('two forms from one person: the newest is attached, once', out.length === 1 && out[0].created_at === '2026-10-08', out);
  const recent = [{ applicant_id: null, first_name: 'Holly', phone: '4175550102', email: '' }], linked = [];
  M([B], linked, recent);
  ck('inputs are not mutated (nothing is written back)', recent[0].applicant_id === null && linked.length === 0);
  /* the profile card helper */
  ctx.ROWS = [{ id: 'in-9', first_name: 'Kristen', phone: '417-555-0199', email: 'x@example.test', created_at: '2026-10-05' }, { id: 'in-8', first_name: 'Kristen', phone: '417-555-0199', email: '', created_at: '2026-09-05' }];
  let one = await ctx.apIntakeByContact({ first_name: 'Kristen', phone: '(417) 555-0199', email: 'other@example.test' });
  ck('the profile card finds the newest form by phone and first name when the link is missing', one && one.id === 'in-9', one);
  ctx.ROWS = [{ id: 'in-7', first_name: 'Robert', phone: '4175550199', email: 'x@example.test', created_at: '2026-10-05' }];
  one = await ctx.apIntakeByContact({ first_name: 'Kristen', phone: '(417) 555-0199', email: 'x@example.test' });
  ck('a form with the same phone and email but another first name is not shown on the page', one === null, one);
  ctx.ROWS = [{ id: 'in-6', first_name: 'Kristen', phone: '4175550199', email: '', applicant_id: 'someone-else', created_at: '2026-10-05' }];
  one = await ctx.apIntakeByContact({ first_name: 'Kristen', phone: '(417) 555-0199', email: '' });
  ck("a form already linked to someone else is never shown on another applicant's page", one === null, one);
  ck('the lookups ask by the last four digits and by email, never by the SSN', calls.every(([c]) => c === 'phone' || c === 'email') && calls.some(([c, v]) => c === 'phone' && v === '%0199'), calls);
  ck('the Starting soon list reads recent forms with first names and matches them', /apMatchIntakes\(rows, intakes, recent\.data\|\|\[\]\)/.test(html) && /phone,email,first_name'\)\.order\('created_at',\{ascending:false\}\)\.limit\(200\)/.test(html));
  ck('the profile card falls back when the link is missing', /if\(!intake\) intake = await apIntakeByContact\(r\);/.test(html));
  ck('no em dash in the change', !/—/.test(code));
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();

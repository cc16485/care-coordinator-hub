/* One profile, step 1 (2026-10-12): a name opens the person's own page, found by ids only.
   Runs the engine's real openPerson/personName and the page's real apCgLinkFill against FAKE people. Nothing leaves this file. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const ENG = fs.readFileSync(path.join(ROOT, 'caregivers-engine.js'), 'utf8');
const IDX = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const cut = (src, a, b) => { const i = src.indexOf(a); const j = src.indexOf(b, i + 1); if (i < 0 || j < 0) throw new Error('cannot find ' + a); return src.slice(i, j); };
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ', m); } else { fail++; console.log('FAIL ', m); } };

/* a fake Supabase that answers the two id lookups */
function fakeSb(tables){
  return { from(t){ const rows = tables[t] || []; let f = rows.slice();
    const q = { select(){ return q; }, eq(k, v){ f = f.filter(r => String(r[k]) === String(v)); return q; },
      not(k){ f = f.filter(r => r[k] != null); return q; }, limit(){ return Promise.resolve({ data: f }); },
      maybeSingle(){ return Promise.resolve({ data: f[0] || null }); } };
    return q; } };
}
function engineCtx(tables, census){
  const calls = [];
  const ctx = {
    caregivers: [ { id: 'r1', first: 'Ann', last: 'Roster', axiscare_id: 5001 },
                  { id: 'r2', first: 'Ben', last: 'Roster', axiscare_id: 9999, candidate_id: 'c2' },
                  { id: 'r3', first: 'Cal', last: 'Roster', candidate_id: 'c3', intake_id: 'i3' } ],
    candidates: [ { id: 'c1', first: 'Dee', last: 'Board' }, { id: 'c4', first: 'Eve', last: 'Board', intake_id: 'i4' }, { id: 'c5', first: 'Fay', last: 'Board' } ],
    sb: fakeSb(tables),
    cgdCensus: async () => census,
    openCaregiverProfile: id => calls.push(['caregiver', id]),
    btOpenApplicant: id => calls.push(['applicant', id]),
    openProfile: (f, l) => calls.push(['oldmodal', f + ' ' + l]),
    window: {}, calls, JSON, String, console
  };
  ctx.window.HP = { open: k => calls.push(['whole', JSON.stringify(k)]) };
  ctx.HP = ctx.window.HP;
  vm.createContext(ctx);
  vm.runInContext(cut(ENG, 'async function openPerson(k', '// ── Employee Profile (name-matched'), ctx);
  return ctx;
}
(async () => {
  const tables = {
    reference_requests: [ { candidate_id: 'c1', applicant_id: null }, { candidate_id: 'c1', applicant_id: 'app-1' }, { candidate_id: 'c2', applicant_id: 'app-2' } ],
    hire_intake: [ { id: 'i3', applicant_id: 'app-3' }, { id: 'i4', applicant_id: 'app-4' } ] };
  const census = { caregivers: [ { id: 5001 }, { id: 7000 } ] };
  const run = async k => { const c = engineCtx(tables, census); await c.openPerson(k); return c.calls; };

  ok(JSON.stringify(await run({ caregiver_id: 'r1' })) === '[["caregiver","5001"]]', 'roster record with an AxisCare id AxisCare knows opens the caregiver page');
  ok(JSON.stringify(await run({ caregiver_id: 'r2' })) === '[["applicant","app-2"]]', 'AxisCare id not in AxisCare: falls to their application through reference requests');
  ok(JSON.stringify(await run({ caregiver_id: 'r3' })) === '[["applicant","app-3"]]', 'roster record without an AxisCare id: application through the start form');
  ok(JSON.stringify(await run({ candidate_id: 'c1' })) === '[["applicant","app-1"]]', 'Background & References person opens their applicant page (skips empty links)');
  ok(JSON.stringify(await run({ candidate_id: 'c4' })) === '[["applicant","app-4"]]', 'board person with only a start form opens their applicant page');
  ok(JSON.stringify(await run({ candidate_id: 'c5' })) === '[["whole","{\\"candidate_id\\":\\"c5\\"}"]]', 'no application on file: the Whole profile panel, by id');
  ok(!(await run({ candidate_id: 'c5' })).some(x => x[0] === 'oldmodal'), 'the name-matched Employee Profile pop-up is not used when the Whole profile exists');
  const src = cut(ENG, 'async function openPerson(k', '// ── Employee Profile (name-matched');
  ok(!/ilike|\.phone|\.email|first\s*\+|toLowerCase/.test(cut(src, 'async function openPerson', 'function personName')), 'openPerson matches by id only: no name, phone or email');

  /* personName: an id with an apostrophe cannot break the link */
  const c = engineCtx(tables, census); vm.runInContext(cut(ENG, 'function personName(', '\n// ── Employee Profile (name-matched'), c);
  const h = c.personName({ candidate_id: "o'brien-1" }, 'Pat O');
  ok(h.includes("onclick='openPerson(") && !/onclick='[^']*o'brien/.test(h) && h.includes('o&#39;brien-1'), 'personName escapes quotes inside the id');
  ok(h.includes('role="link"') && h.includes('tabindex="0"'), 'personName is reachable by keyboard');

  /* the applicant page shows "Their caregiver page" only for one AxisCare caregiver found by id */
  const pg = async (row, intake, cen) => {
    const slot = { innerHTML: '' };
    const ctx = { document: { getElementById: id => id === 'apCgLink' ? slot : null }, AP_PROF: row,
      sb: fakeSb({ hire_intake: intake }), cgdCensus: async () => cen, escapeHtmlComms: s => String(s), window: {}, Object, Set, String };
    vm.createContext(ctx);
    vm.runInContext(cut(IDX, 'const AP_CG_CACHE = {};', 'function apRenderProfile(){').replace('const AP_CG_CACHE', 'var AP_CG_CACHE'), ctx);
    await ctx.apCgLinkFill(row); return slot.innerHTML;
  };
  const cen2 = { caregivers: [ { id: 5001 }, { id: 6002 } ] };
  ok((await pg({ id: 'a1', axiscare_id: 5001 }, [], cen2)).includes('data-open-caregiver="5001"'), 'application carrying the AxisCare id links to the caregiver page');
  ok((await pg({ id: 'a2' }, [ { applicant_id: 'a2', candidate_id: 6002 } ], cen2)).includes('data-open-caregiver="6002"'), 'start form carrying the AxisCare id links to the caregiver page');
  ok((await pg({ id: 'a3' }, [], cen2)) === '', 'no AxisCare id on file: no link (never guessed)');
  ok((await pg({ id: 'a4', axiscare_id: 4444 }, [], cen2)) === '', 'AxisCare id not on the caregiver list (still an applicant there): no link');
  ok((await pg({ id: 'a5', axiscare_id: 5001 }, [ { applicant_id: 'a5', candidate_id: 6002 } ], cen2)) === '', 'two different caregivers: no link, not ours to pick');
  ok(!/ilike|phone|email/.test(cut(IDX, 'async function apCgLinkFill', 'function apRenderProfile(){')), 'apCgLinkFill matches by id only');

  /* the wiring */
  ok(!/onclick="openProfile\(/.test(ENG), 'no list opens the name-matched pop-up any more');
  ok(/data-open-applicant="'\+esc\(b\.applicant_id\)/.test(IDX), 'Interviews: the name opens the applicant page');
  ok(IDX.includes('id="cgdAppLink"') && IDX.includes("j.application.record_id"), 'caregiver page: "Their application" from the hiring history');
  ok(IDX.includes("data-open-caregiver=\"'+esc(String(x.cg.axiscare_id))"), 'Team Builder: a pool name opens the caregiver page');
  ok(/window\.openPerson = openPerson/.test(ENG), 'openPerson is reachable from the inline handlers');
  ok(!/—/.test(src) && !/—/.test(cut(IDX, 'async function apCgLinkFill', 'function apRenderProfile(){')), 'no em dashes in the new code');

  console.log(`person-links: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();

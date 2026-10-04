/* node tests/intake-rules-test.js
   intake-import-rules.js (safe saves step 6, 2026-10-04). Proves: the Import button's candidate is byte-identical to the
   one main built before (main's own code, cut out of git); the engine now builds it through the rules file and says so
   if the file did not load; every one of her rules for a start form that arrives on its own (matched by email or phone,
   never by name; roster / not hired / in Background & References / no job offer / no contact are cards, nothing
   updated); the card words; the file runs with no page around it. */
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process');
const ROOT = path.join(__dirname, '..');
const RULES = fs.readFileSync(path.join(ROOT, 'intake-import-rules.js'), 'utf8');
const ENGINE = fs.readFileSync(path.join(ROOT, 'caregivers-engine.js'), 'utf8');
let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 600))); };
const clone = (x) => JSON.parse(JSON.stringify(x));
const bare = { console }; vm.createContext(bare); vm.runInContext(RULES, bare); const I = bare.CCIntake;
ck('runs with no page around it and defines CCIntake', !!I && typeof I.decide === 'function' && typeof I.candidateFromIntake === 'function');
ck('no em dash in the rules file', !/—/.test(RULES));

/* 1. the Import button's candidate: identical to before */
let BASE = 'main'; try { cp.execSync('git rev-parse --verify origin/main', { cwd: ROOT, stdio: 'ignore' }); BASE = 'origin/main'; } catch (_) {}
const oldSrc = cp.execSync(`git show ${BASE}:caregivers-engine.js`, { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 }).toString();
const ROW = { id: 'b6f0-intake-1', first_name: 'Ava', last_name: 'Applicant', phone: '(417) 555-0199', email: 'Ava@X.com', lived_outside_mo: true, no_employer_history: false,
  refs: [{ name: 'Ann Boss', phone: '4175550100', email: 'ann@x.com', relationship: 'supervisor', type: 'Professional', company: 'Acme', how_long: '3y' }, { name: 'Pat Pal', type: 'personal' },
    { name: 'C' }, { name: 'D' }, { name: 'E (fifth, dropped)' }] };
const FIXED = '2026-10-04T12:00:00.000Z';
const hadOld = oldSrc.indexOf("const rec = {\n    id: safeTmpId(),", oldSrc.indexOf('async function intakeImport(')) > 0 && oldSrc.indexOf("const rec = {\n    id: safeTmpId(),", oldSrc.indexOf('async function intakeImport(')) < oldSrc.indexOf('async function intakeImport(') + 4000;
if (hadOld) {
  const a = oldSrc.indexOf("  const rec = {\n    id: safeTmpId(),", oldSrc.indexOf('async function intakeImport(')), b = oldSrc.indexOf('  candidates.push(rec);', a);
  const oldType = oldSrc.slice(oldSrc.indexOf('function obRefType(v){'), oldSrc.indexOf('function obRefTypeLabel('));
  const ctx = { JSON, Array, Date: class extends Date { constructor(...x) { super(...(x.length ? x : [FIXED])) } } };
  vm.createContext(ctx);
  vm.runInContext(oldType + '\nthis.__b = function(row, who){ const safeTmpId = () => -1;\n' + oldSrc.slice(a, b) + '\n return rec; };', ctx);
  for (const [label, row] of [['with four references and more', ROW], ['no references, in state', { id: 9, first_name: 'Bo', last_name: '', phone: '', email: '', lived_outside_mo: false, refs: null }],
                               ['no employer history recorded', Object.assign(clone(ROW), { no_employer_history: true })], ['no_employer_history missing', (() => { const r = clone(ROW); delete r.no_employer_history; return r; })()]]) {
    const was = ctx.__b(clone(row), 'krystal@mo-care.com'), now = I.candidateFromIntake(clone(row), { id: -1, who: 'krystal@mo-care.com', at: FIXED });
    ck('Import makes the byte-identical candidate: ' + label, JSON.stringify(was) === JSON.stringify(now), [was, now]);
  }
  const w2 = ctx.__b(clone(ROW), ''), n2 = I.candidateFromIntake(clone(ROW), { id: -1, who: '', at: FIXED });
  ck('...and with nobody signed in ("by staff")', JSON.stringify(w2) === JSON.stringify(n2) && /by staff\./.test(n2.notes));
} else ck('main already builds through the rules file (nothing to compare against)', true);
{
  const engineType = new Function(ENGINE.slice(ENGINE.indexOf('function obRefType(v){'), ENGINE.indexOf('function obRefTypeLabel(')) + 'return obRefType;')();
  ck("the rules' refType agrees with the engine's obRefType", ['Professional', 'personal', '', null, 'x', ' PROFESSIONAL '].every((v) => I.refType(v) === engineType(v)));
}
ck('the engine builds the Import candidate through the rules file, and says so if it did not load', /CCIntake\.candidateFromIntake\(row, \{ id: safeTmpId\(\), who, at: new Date\(\)\.toISOString\(\) \}\)/.test(ENGINE) && /The start form rules did not load\. Refresh the page and try again\. Nothing was imported\./.test(ENGINE));
ck('the page loads the rules before the engine, in order', (() => { const h = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'); const k = h.indexOf("t.src='intake-import-rules.js"), e = h.indexOf("s.src = 'caregivers-engine.js"); return k > 0 && e > k; })());

/* 2. her rules for a start form that arrives on its own */
const cands = [{ id: 1, first: 'Old', last: 'Cand', phone: '417.555.0111', email: 'cand@x.com' }, { id: 2, first: 'Nope', last: 'Person', phone: '4175550122', not_hired: true },
  { id: 3, first: 'Done', last: 'Before', intake_id: 'intake-done' }];
const cgs = [{ id: 20, first: 'Hired', last: 'Already', phone: '1-417-555-0133', email: 'hired@x.com' }, { id: 21, intake_id: 'intake-roster' }];
const offers = [{ id: 'o1', phone: '+1 (417) 555-0199', email: '' }, { id: 'o2', email: 'Offered@X.com', phone: '' }];
const D = (row) => I.decide(row, { cands, cgs, offers });
let d = D({ id: 'n1', first_name: 'Ava', last_name: 'A', phone: '417-555-0199', email: '' });
ck('a new person with a job offer (phone, any format): imported', d.action === 'import', d);
d = D({ id: 'n2', first_name: 'Eve', last_name: 'E', phone: '', email: 'offered@x.com' });
ck('...matched by email (any capitals)', d.action === 'import', d);
d = D({ id: 'intake-done', first_name: 'x', phone: '4170000000' });
ck('this very form already imported (a candidate carries its id): nothing to do', d.action === 'done', d);
ck('...or already moved to the roster with it', D({ id: 'intake-roster', phone: '4170000000' }).action === 'done');
d = D({ id: 'n3', first_name: 'Hired', phone: '4175550133' });
ck('already on the caregiver roster (same phone): a card, nothing updated', d.action === 'card' && d.reason === 'roster' && d.match.id === 20, d);
d = D({ id: 'n4', first_name: 'Nope', phone: '(417) 555-0122' });
ck('marked not hired: a card, not added back', d.action === 'card' && d.reason === 'not_hired' && d.match.id === 2, d);
d = D({ id: 'n5', first_name: 'Old', email: 'CAND@x.com' });
ck('already in Background & References (same email): a card, nothing updated', d.action === 'card' && d.reason === 'in_bgr' && d.match.id === 1, d);
d = D({ id: 'n6', first_name: 'Stranger', phone: '4175550999', email: 'stranger@x.com' });
ck('nobody sent them a start link (no job offer has their email or phone): a card, not imported', d.action === 'card' && d.reason === 'no_offer', d);
d = D({ id: 'n7', first_name: 'Blank', phone: '', email: '' });
ck('no email and no phone: a card', d.action === 'card' && d.reason === 'no_contact', d);
d = D({ id: 'n8', first_name: 'Hired', last_name: 'Already', phone: '4175550199' });
ck('a NAME alone never matches anyone (same name as a roster caregiver, different phone, with an offer): imported', d.action === 'import', d);
ck('short numbers never match', D({ id: 'n9', phone: '0199' }).reason === 'no_contact');
for (const r of ['roster', 'not_hired', 'in_bgr', 'no_offer', 'no_contact', 'other']) {
  const t = I.cardText({ first_name: 'Ava', last_name: 'A' }, { reason: r, match: { name: 'Ava A' } });
  if (!t.title || !t.detail || !t.next || /—/.test(t.title + t.detail + t.next)) ck('card words for ' + r, false, t);
}
ck('every card has a title, what happened, and what to do next; no em dash', true);
ck('the no-offer card says why (the start form page is public) and what to do', /no job offer has their email or phone/.test(I.cardText({ first_name: 'A' }, { reason: 'no_offer' }).detail) && /press Import/.test(I.cardText({ first_name: 'A' }, { reason: 'no_offer' }).next));
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);

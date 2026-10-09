/* node tests/offered-checks-test.js
   Offered people go straight into Background & References (2026-10-08, Samantha). The real engine code, cut out of
   caregivers-engine.js and run against a fake database: an offer makes a checks row (quietly, from the offer form),
   never twice; the Offered strip lists only offers with no row and no roster record; the row says Offered and whether
   the start form is back; bringing the form in fills blank reference slots only and links the form; a form that is
   another record's is never taken; the page has the hook, the strip, the Add a person button; no em dash. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'caregivers-engine.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const cut = (from, to) => { const a = src.indexOf(from), b = src.indexOf(to, a + 1); if (a < 0 || b < 0) throw new Error('not found: ' + from); return src.slice(a, b); };
let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 700))); };

const code = [
  "const wcEsc = t => String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#39;');",
  cut('function obRefType(v){', 'function obRefTypeLabel('),
  cut('const OFF_MONTHS=', 'function offerAgeDays('),
  cut('async function offerToCandidate(', "/* Step 1 is Viventium's paperwork"),
].join('\n');
function world(){
  const log = { alerts: [], tabs: [], saves: 0, seen: [] };
  const intakes = [];
  const chain = (data) => { const b = { select(){ return b; }, order(){ return b; }, limit(){ return Promise.resolve({ data, error: null }); }, eq(){ return b; }, maybeSingle(){ return Promise.resolve({ data: Array.isArray(data) ? data[0] || null : data, error: null }); } }; return b; };
  const ctx = {
    console, Date, JSON, String, Array, Object, Number, Promise, RegExp, Math, parseInt,
    OFFERS: [], INTAKE_ROWS: [], candidates: [], caregivers: [], HYDRATED: true, _tmp: 0,
    safeTmpId: () => --ctx._tmp, saveCandidates: async () => { log.saves++; ctx.candidates.forEach(c => { if (c.id < 0) c.id = 100 - c.id; }); return true; },
    renderOB(){}, renderAlerts(){}, gotoTab: (t) => log.tabs.push(t), alert: (m) => log.alerts.push(m), confirm: () => true, loadOffers: async () => {},
    lifecycleRows: () => ctx.OFFERS.map(o => ({ name: o.first_name + ' ' + o.last_name, offer: o, intake: ctx.INTAKE_ROWS.find(r => r.phone === o.phone) || null,
      board: ctx.candidates.find(c => String(c.offer_id) === String(o.id)) || null, roster: ctx.caregivers.find(g => String(g.offer_id) === String(o.id)) || null })),
    sb: { from: (t) => ({ select: (cols) => { const b = chain(ctx.INTAKE_ROWS.map(r => Object.assign({ lived_outside_mo: false, refs: [] }, r))); return b; }, update: () => ({ eq: async (k, v) => { log.seen.push(v); return { error: null }; } }) }) },
    document: { getElementById: (id) => id === 'obOfferedStrip' ? ctx.strip : null }, strip: { style: {}, innerHTML: '' },
  };
  ctx.window = ctx; vm.createContext(ctx); vm.runInContext(code, ctx);
  return { ctx, log };
}
const OFFER = { id: 'of-1', first_name: 'Kristen', last_name: 'Sample', phone: '(417) 555-0101', email: 'k@example.test', position: 'Caregiver', offered_by: 'Krystal', created_at: '2026-10-03T15:00:00Z', interview_date: '2026-10-03' };
const FORM = { id: 'in-1', first_name: 'Kristen', last_name: 'Sample', phone: '(417) 555-0101', email: 'k@example.test', lived_outside_mo: true,
  refs: [{ name: 'Ann Boss', phone: '4175550100', email: 'ann@x.test', relationship: 'supervisor', type: 'Professional', company: 'Acme', how_long: '3y' }, { name: 'Pat Pal', type: 'personal' }] };

(async () => {
  /* 1. from the offer form: a row, quietly */
  let W = world(); W.ctx.OFFERS = [OFFER];
  let r = await W.ctx.offerIntoChecks('of-1');
  const c = W.ctx.candidates[0];
  ck('the offer makes a checks row with the offer on it', r.ok && c && c.offer_id === 'of-1' && c.first === 'Kristen' && c.position === 'Caregiver' && c.r1s === 'Pending' && c.oig === 'Pending', c);
  ck('it says so for the offer form, and no pop-up or tab jump', /In Background & References now/.test(r.line) && !W.log.alerts.length && !W.log.tabs.length, [r, W.log]);
  r = await W.ctx.offerIntoChecks('of-1');
  ck('a second time does not make a second row', r.ok && /Already/.test(r.line) && W.ctx.candidates.length === 1);
  r = await W.ctx.offerIntoChecks('nope');
  ck('an unknown offer is said plainly', !r.ok && /Use Add on the Background/.test(r.line), r);
  /* 2. the row: Offered, and the start form */
  let chip = W.ctx.offeredChip(c);
  ck('the row says Offered and when, and that the start form is not back', /Offered Oct 3/.test(chip) && /start form not back yet/.test(chip), chip);
  W.ctx.INTAKE_ROWS = [FORM];
  chip = W.ctx.offeredChip(c);
  ck('when the form lands, the row offers to bring it in', /Bring in their start form/.test(chip) && /intakeFillFromForm\(101,'in-1'/.test(chip), chip);
  /* what the office typed first stays */
  c.r1n = 'Ann Boss'; c.r1s = 'Positive'; c.r1_phone = '555';
  await W.ctx.intakeFillFromForm(101, 'in-1', null);
  ck('bringing the form in fills blank slots only and never overwrites', c.r1n === 'Ann Boss' && c.r1s === 'Positive' && c.r1_phone === '555' && c.r2n === 'Pat Pal' && c.r2_type === 'personal' && c.intake_id === 'in-1' && c.fp === 'Required' && c.oos === 'yes', c);
  ck('the office is told what came in, and the form is marked seen', /1 reference came in/.test(W.log.alerts[0] || '') && W.log.seen.includes('in-1') && W.log.saves >= 2, W.log);
  ck('afterwards the row says the start form is back', /start form back/.test(W.ctx.offeredChip(c)));
  await W.ctx.intakeFillFromForm(101, 'in-1', null);
  ck('a second press does nothing', /already on this row/.test(W.log.alerts[1] || ''));
  /* 3. a form that is another record's is never taken */
  W = world(); W.ctx.OFFERS = [OFFER]; W.ctx.INTAKE_ROWS = [FORM]; W.ctx.candidates = [{ id: 7, first: 'Other', last: 'Person', intake_id: 'in-1' }];
  await W.ctx.offerIntoChecks('of-1');
  ck("another record's form is not offered to this row", /start form not back yet/.test(W.ctx.offeredChip(W.ctx.candidates[1])));
  /* 4. the strip */
  W = world(); W.ctx.OFFERS = [OFFER, { ...OFFER, id: 'of-2', first_name: 'Holly', phone: '4175550102', email: 'h@example.test' }, { ...OFFER, id: 'of-3', first_name: 'Jess', phone: '4175550103', email: 'j@example.test' }];
  W.ctx.caregivers = [{ id: 1, first: 'Jess', last: 'Sample', offer_id: 'of-3' }];
  W.ctx.renderOfferedStrip();
  let h = W.ctx.strip.innerHTML;
  ck('the strip lists offered people with no row and no roster record, with Add buttons and Add all', /not in the table yet \(2\)/.test(h) && /Kristen Sample/.test(h) && /Holly Sample/.test(h) && !/Jess Sample/.test(h) && /offeredAddOne\('of-1'/.test(h) && /Add all 2/.test(h), h);
  await W.ctx.offeredAddAll(null);
  ck('Add all adds each of them once', W.ctx.candidates.length === 2 && W.ctx.candidates.every(c => c.offer_id) && !W.log.alerts.length, W.ctx.candidates);
  W.ctx.renderOfferedStrip();
  ck('and the strip then goes away', W.ctx.strip.style.display === 'none' && W.ctx.strip.innerHTML === '');
  /* 5. the page */
  const row = cut('function renderOB(){', '// Stats');
  ck('the table draws the strip and the Offered chip', row.includes('renderOfferedStrip()') && row.includes('offeredChip(c)'));
  ck('the offer form sends them into Background & References', html.includes('await SCX.offerIntoChecks(res.id)') && /window\.SCX = \{[^}]*offerIntoChecks,/.test(src));
  ck('the page has the strip and the Add a person button', html.includes('id="obOfferedStrip"') && html.includes('onclick="openOBModal()" title="Someone who came in another way'));
  ck('the row buttons reach the engine', src.includes('Object.assign(window, { offeredAddOne, offeredAddAll, intakeFillFromForm });'));
  const fresh = cut('/* ── OFFERED PEOPLE GO STRAIGHT INTO', "/* Step 1 is Viventium's paperwork"), strip = html.indexOf('<!-- Offered people who are not in the table yet');
  ck('no em dash in the new code', !/—/.test(fresh) && !/—/.test(row) && !/—/.test(html.slice(strip, html.indexOf('id="obImportStrip"', strip))));
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();

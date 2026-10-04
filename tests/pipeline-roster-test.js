/* node tests/pipeline-roster-test.js
   Hiring pipeline after someone moves to the caregiver roster (2026-10-02). The real lifecycleRows /
   renderHirePipeline / bgrTriage / People & Checks card + drawer + timeline / intakeImport guard, plus the real
   welcome-call done path (wcAddToRoster) and the office 🎓 Promote, cut out of caregivers-engine.js and run on fakes.
   Proves, for BOTH paths: the person shows "On the caregiver roster", never "was imported before but the workspace
   is gone", and no Import / Start link / Start checks early button appears (a second Import would make a duplicate).
   Matching is by the intake_id and offer_id the roster record carries; never by hire_intake.candidate_id (an
   AxisCare applicant id). */
const fs = require('fs'), path = require('path'), vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'caregivers-engine.js'), 'utf8');
const cut = (from, to) => { const a = src.indexOf(from), b = src.indexOf(to, a + 1); if (a < 0 || b < 0) throw new Error('not found: ' + from); return src.slice(a, b); };
const code = [
  cut('const WC_MEET =', 'async function wcWho('),
  cut('async function wcAct(', 'function renderOrientReadyQueue('),
  cut('function cgRecordFromCandidate(', 'function closeOutCandidate('),
  cut('function lifecycleRows(', 'let REF_REQUESTS = [];'),
  cut('const bgrEsc =', 'const BGR_ATT_METHODS'),
  cut('function bgrChecksSummary(', 'function bgrToggleTimeline('),
  cut('function bgrPersonCard(', 'function renderPeopleChecks('),
  cut('function bgrDrawerHTML(', 'let _bgrCheckCand = null'),
].join('\n');

let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 600))); };

function world() {
  const alerts = [], box = { innerHTML: '' };
  const cand = { id: 41, first: 'Ava', last: 'Applicant', phone: '417-555-0199', email: 'ava@x.com', offer_id: 'offer-1', intake_id: 'intake-1',
    oig: 'CLEAR', oig_date: '2026-09-20', edl: 'Clear', edl_date: '2026-09-20', fcsr: 'Clear', fcsr_date: '2026-09-21', fp: 'N/A', oos: 'no',
    orient_session_date: '2026-10-01', step2_done_at: '2026-10-01T15:00:00Z' };
  const ctx = {
    console, Date, JSON, Promise, Set, Map, String, Array, Object, Number, Error, RegExp, Intl, Math, isFinite,
    candidates: [cand], caregivers: [], cgId: 100, safeTmpId: (() => { let n = -1; return () => n--; })(), safeIsTmp: (id) => typeof id === 'number' && id < 0,   /* 421: temporary numbers until the database gives the real one */ REF_REQUESTS: [], HYDRATED: true,
    OFFERS: [{ id: 'offer-1', first_name: 'Ava', last_name: 'Applicant', phone: '417-555-0199', email: 'ava@x.com', created_at: '2026-09-15T10:00:00Z',
      attributes_entered_at: '2026-09-15', viventium_entered_at: '2026-09-15', step1_done_at: '2026-09-16' }],
    /* hire_intake.candidate_id is an AxisCare applicant id that HAPPENS to equal the board id here, to prove it is never used */
    INTAKE_ROWS: [{ id: 'intake-1', created_at: '2026-09-17T10:00:00Z', first_name: 'Ava', last_name: 'Applicant', candidate_id: 41,
      email: 'ava@x.com', phone: '417-555-0199', seen_at: '2026-09-17T11:00:00Z', refs: [] }],
    obDeriveStatus: () => 'Ready for Orientation', obPrehireRefs: () => [], hydrateBanner: () => {},
    localStorage: { setItem() {} }, window: {}, CGP2: { isLive: () => true, rowFor: () => ({}) },
    document: { getElementById: (id) => (id === 'hirePipeline' ? box : null) },
    confirm: () => true, alert: (m) => alerts.push(m),
    saveCaregivers: async () => true, saveCandidates: async () => {}, renderOB() {}, renderTR() {}, renderAC() {},
  };
  ctx.window.CGP2 = ctx.CGP2;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'caregiver-connect-rules.js'), 'utf8'), ctx);   /* the one copy the engine's hire record comes from */
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'eligibility-rules.js'), 'utf8'), ctx);   /* the hire snapshot (CCElig.hiringSnapshot) */
  vm.runInContext(code + '\nthis.__x = { wcAddToRoster, promoteToCaregiver, lifecycleRows, renderHirePipeline, bgrTriage, bgrPersonCard, bgrDrawerHTML, bgrTimelineHTML };', ctx);
  return { X: ctx.__x, ctx, box, alerts };
}

function checkMoved(label, W) {
  const rows = W.X.lifecycleRows();
  const row = rows.find((r) => /Ava/.test(r.name)) || {};
  ck(label + ': one row for her, on the roster, no board', rows.length === 1 && row.roster && String(row.roster.candidate_id) === '41' && !row.board && row.checksState === 'roster', rows.map((r) => [r.name, r.checksState, r.attention]));
  ck(label + ': no "workspace is gone" (no attention at all)', !row.attention.length, row.attention);
  W.X.renderHirePipeline();
  const h = W.box.innerHTML;
  ck(label + ': pipeline says On the caregiver roster', /On the caregiver roster/.test(h), h.slice(0, 400));
  ck(label + ': pipeline shows no Import, Start link or Start checks early', !/intakeImport\(/.test(h) && !/offerStartLink\(/.test(h) && !/offerToCandidate\(/.test(h) && !/workspace is gone/.test(h));
  ck(label + ': not counted as waiting to be imported', /0 submitted and waiting to be imported/.test(h), h.slice(0, 200));
  const t = W.X.bgrTriage(row);
  ck(label + ': People & Checks puts her in "On the caregiver roster", next step not Import', t.group === 'roster' && t.stage === 'On the caregiver roster' && t.next !== 'Import', t);
  const card = W.X.bgrPersonCard(row, t), drawer = W.X.bgrDrawerHTML(row, t), tl = W.X.bgrTimelineHTML(row, t);
  ck(label + ': card and drawer carry no Import button', !/intakeImport\(/.test(card) && !/intakeImport\(/.test(drawer));
  ck(label + ': timeline says Caregiver roster, not "Not imported"', /Caregiver roster/.test(tl) && !/Not imported/.test(tl));
}

(async () => {
  // before: she is on the board (control)
  let W = world();
  let r0 = W.X.lifecycleRows()[0];
  ck('control: on the board she is a normal row, not on the roster', r0.board && !r0.roster && r0.checksState === 'ready');

  // control: board gone and NOT on the roster -> the old warning still shows (we did not hide real problems)
  W = world(); W.ctx.candidates = [];
  r0 = W.X.lifecycleRows()[0];
  ck('control: workspace gone and not on the roster still says "workspace is gone" with Import', /workspace is gone/.test(r0.attention.join()) && !r0.roster);
  W.X.renderHirePipeline();
  ck('control: Import still offered there', /intakeImport\(/.test(W.box.innerHTML));

  // control: hire_intake.candidate_id is never matched against the roster's candidate_id
  W = world(); W.ctx.candidates = []; W.ctx.caregivers = [{ id: 7, first: 'Ava', last: 'Applicant', candidate_id: 41 }];
  r0 = W.X.lifecycleRows()[0];
  ck('control: a roster record with only a matching candidate_id (no intake/offer id) is NOT treated as her', !r0.roster);

  // path 1: welcome call done
  W = world();
  const res = await W.X.wcAddToRoster({ id: 'w1', candidate_id: '41' });
  ck('welcome call done: moved to the roster with intake_id and offer_id', res.status === 'added' && W.ctx.caregivers[0].intake_id === 'intake-1' && W.ctx.caregivers[0].offer_id === 'offer-1' && !W.ctx.candidates.length, W.ctx.caregivers[0]);
  checkMoved('welcome call done', W);

  // path 2: office Promote
  W = world();
  await W.X.promoteToCaregiver(41);   // 421: async (waits for the roster save before removing the candidate)
  const pr = W.ctx.caregivers[0] || {};
  ck('office Promote: orient_date = hire date (unchanged) and now carries intake_id and offer_id', pr.orient_date === '2026-10-01' && pr.hire_date === '2026-10-01' && pr.intake_id === 'intake-1' && pr.offer_id === 'offer-1' && !W.ctx.candidates.length, pr);
  checkMoved('office Promote', W);

  // offer-only person (no start link submitted) moved on: matched by offer_id
  W = world(); W.ctx.INTAKE_ROWS = []; W.ctx.candidates[0].intake_id = undefined;
  await W.X.promoteToCaregiver(41);   // 421: async (waits for the roster save before removing the candidate)
  r0 = W.X.lifecycleRows()[0];
  W.X.renderHirePipeline();
  ck('offer only: matched by offer_id, no Start link / Start checks early', r0.roster && r0.checksState === 'roster' && !/offerStartLink\(|offerToCandidate\(/.test(W.box.innerHTML));

  // intakeImport guard: importing again is refused with a message
  const imp = cut('async function intakeImport(', 'const sel');
  const alerts2 = [];
  const ctx2 = { caregivers: [{ first: 'Ava', last: 'Applicant', intake_id: 'intake-1' }], candidates: [], HYDRATED: true, alert: (m) => alerts2.push(m), openOBModal() {} };
  vm.createContext(ctx2);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'caregiver-connect-rules.js'), 'utf8'), ctx2);   /* the one copy the engine's hire record comes from */
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'eligibility-rules.js'), 'utf8'), ctx2);   /* the hire snapshot (CCElig.hiringSnapshot) */
  try {
    vm.runInContext(imp.slice(0, imp.indexOf('if (btn) { btn.disabled = true;')) + '}\nthis.__imp = intakeImport;', ctx2);
    await ctx2.__imp('intake-1', null);
    ck('Import on someone already on the roster: refused and said', alerts2.length === 1 && /already on the caregiver roster/.test(alerts2[0]) && /Nothing was imported/.test(alerts2[0]), alerts2);
  } catch (e) { ck('intakeImport guard runs', false, String(e)); }

  const newBits = cut('  /* Moved to the caregiver roster (welcome call done', '  /* ── IDENTITY GROUPING') + cut('  // 1b) moved on to the caregiver roster', '  // 2) submitted but not imported');
  ck('no em dash in the new pipeline code', !/—/.test(newBits));

  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();

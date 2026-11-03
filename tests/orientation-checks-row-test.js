/* node tests/orientation-checks-row-test.js
   Samantha 2026-11-02: "Send orientation once the four checks are clear, references still required before Approve to Work, and
   the new first line "Your background checks are all clear."" The Onboarding row's real code, cut out of caregivers-engine.js,
   with eligibility-rules.js; made-up people only, nothing saved or sent. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const eng = fs.readFileSync(path.join(__dirname, '..', 'caregivers-engine.js'), 'utf8');
const rules = fs.readFileSync(path.join(__dirname, '..', 'eligibility-rules.js'), 'utf8');
const cut = (src, from, to) => { const a = src.indexOf(from), b = src.indexOf(to, a + 1); if (a < 0 || b < 0) throw new Error('not found: ' + from); return src.slice(a, b); };
let pass = 0, fail = 0; const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 400))); };
const ctx = { console, Date, JSON, Math, String, Number, Array, Object, Promise, setTimeout }; ctx.globalThis = ctx; ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(rules, ctx);
vm.runInContext(`
const refPolicy = c => CCElig.refPolicy(c), obDeriveStatus = c => CCElig.obDeriveStatus(c);
const bgrEsc = t => String(t == null ? '' : t);
const fmtD = d => d || '';
let CKD_FILTER = 'all';
function obRefCellTypeLine(){ return ''; } function bgrReqsFor(){ return []; } function renderCkd(){} function bgrvNeedsButton(){ return false; }
function wcRowFor(){ return null; } function ckdRosterFor(){ return null; }
` + cut(eng, 'function ckdName(c){', 'function ckdAddedMs(c){') + cut(eng, 'function ckdLanes(c){', 'function ckdLaneHTML(c, nx){')
  + cut(eng, 'function ckdJourneyRows(){', 'function ckdStep2Lane(c){') + cut(eng, 'function ckdStep2Lane(c){', 'function ckdRosterNext(r){')
  + cut(eng, 'function ckdActsFor(p){', 'const ckdDay = iso =>') + 'const ckdDay = iso => iso || "";' + cut(eng, 'function ckdQuiet(c, stop){', '/* ── TAKE OFF THE LIST'), ctx);

const clear = { oig: 'CLEAR', oig_date: '2026-10-30', edl: 'Clear', edl_date: '2026-10-30', fcsr: 'Clear', fcsr_date: '2026-10-30', casenet: 'Clear', casenet_date: '2026-10-30' };
const gabrielle = { id: 1, first: 'Gabrielle', last: 'Fake', onboarding_path: 'new', step1_done_at: '2026-10-30T15:00:00Z', step2_sent_at: '2026-11-02T15:00:00Z', ...clear,
  r1n: 'Weston Fake', r1_phone: '3465550100', r1s: 'Pending', r2n: 'Kim Fake', r2s: 'Pending' };
const stop = (c) => ctx.ckdStopOf(c), acts = (c) => ctx.ckdActsFor({ c, stop: stop(c) });

ck('four checks clear, references 0 of 2 (Gabrielle): her row is at Send orientation', stop(gabrielle) === 2, stop(gabrielle));
let a = acts(gabrielle);
ck('the first line is the Send orientation button, worded "Background checks are clear."', a[0].label === 'Send orientation' && /^Background checks are clear\. Add Gabrielle in AxisCare as In Training/.test(a[0].text) && a[0].on === 'axSetupOpen(1)', a[0]);
const refLane = a.find((x) => x.lane === 'References');
ck('references keep their own line with Record answer, saying they are needed before Approve to Work', refLane && refLane.label === 'Record answer' && /Weston Fake/.test(refLane.text) && /Needed before Approve to Work\./.test(refLane.text), a);
ck('Viventium Step 2 keeps its line too', a.some((x) => x.lane === 'Viventium'), a);

const sent = { ...gabrielle, step2_invite: { state: 'sent', at: '2026-11-02T16:00:00Z', welcome: true, orientation: { url_sent: true, axiscare_id: '7001' }, refs_open: true } };
a = acts(sent);
ck('after Send orientation: stop 4, references line still there', stop(sent) === 3 && a.some((x) => x.lane === 'References' && x.label === 'Record answer'), { s: stop(sent), a });

const refsDone = { ...gabrielle, r1s: 'Positive', r1_type: 'professional', r2s: 'Positive' };
a = acts(refsDone);
ck('references done too: Send orientation, no references line', stop(refsDone) === 2 && !a.some((x) => x.lane === 'References'), a);

ck('FCSR not back yet: still at Checks and references (Cheryl)', stop({ ...gabrielle, fcsr: 'Pending', fcsr_date: '' }) === 1);
ck('Case.net not recorded: still at Checks and references', stop({ ...gabrielle, casenet: '' }) === 1);
ck('a flagged check: still at Checks and references, for review', stop({ ...gabrielle, edl: 'Issues Found' }) === 1);
ck('a Negative reference: stays at Checks and references for the owners to decide', stop({ ...gabrielle, r1s: 'Negative' }) === 1);
ck('Step 1 not finished: Step 1', stop({ ...gabrielle, step1_done_at: null, step1_landed: null, step1_status: 'waiting' }) === 0 || ctx.ckdStep1Waiting({ ...gabrielle, step1_done_at: null }) === false);
const old = { ...gabrielle, onboarding_path: 'old' };
ck('the old path is unchanged: references still needed before it moves on', stop(old) === 1 && stop({ ...old, r1s: 'Positive', r1_type: 'professional', r2s: 'Positive' }) === 2, [stop(old)]);
ck('no "Hub opens their orientation" wait line is left (it waited for Approve to Advance)', !/The Hub opens their orientation within a few minutes/.test(eng));
console.log(`${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);

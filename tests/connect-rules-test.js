/* node tests/connect-rules-test.js
   caregiver-connect-rules.js (2026-10-03, auto-connect redo, Samantha "yes to all"). Proves:
   - the Move to caregiver record is byte-identical to the one the engine built before this change (main's own
     cgRecordFromCandidate + obPrehireRefs, cut out of git), for several candidates;
   - the engine now builds it through the rules file (and says so plainly when the file did not load);
   - her rules A link / B move over / C create / D review, inactive ignored, unique-name records, shared phones,
     not-hired candidates, "Not this person" pairs never matched again, the Connect card's options;
   - a moved record = the button's record + axiscare_id + connected; a new record's shape;
   - the file runs with no page around it (the server runs it too) and has no em dash. */
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process');
const ROOT = path.join(__dirname, '..');
const RULES = fs.readFileSync(path.join(ROOT, 'caregiver-connect-rules.js'), 'utf8');
const ENGINE = fs.readFileSync(path.join(ROOT, 'caregivers-engine.js'), 'utf8');
let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 600))); };
const clone = (x) => JSON.parse(JSON.stringify(x));

/* the rules, alone, like the server runs them: a bare context, nothing else */
const bare = { console };
vm.createContext(bare);
vm.runInContext(RULES, bare);
const C = bare.CCConnect;
ck('runs with no page around it and defines CCConnect', !!C && typeof C.plan === 'function' && typeof C.recordFromCandidate === 'function');
ck('no import/export (the server evaluates it as a plain script)', !/^\s*(import|export)\s/m.test(RULES));
ck('no em dash in the rules file', !/\u2014/.test(RULES));

/* ── 1. the Move to caregiver record: identical to before ── */
let BASE = 'main';
try { cp.execSync('git rev-parse --verify origin/main', { cwd: ROOT, stdio: 'ignore' }); BASE = 'origin/main'; } catch (_) {}
const oldSrc = cp.execSync(`git show ${BASE}:caregivers-engine.js`, { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 }).toString();
const hadOld = oldSrc.includes('function cgRecordFromCandidate(c, hireDate, orientDate){\n  return {');
const cut = (src, from, to) => { const a = src.indexOf(from), b = src.indexOf(to, a + 1); if (a < 0 || b < 0) throw new Error('not found: ' + from); return src.slice(a, b); };
function oldBuilder() {
  const ctx = { console, JSON, Object, String, Date, safeTmpId: () => -1, hiringSnapshot: (c) => ({ frozen_for: c.id }) };
  vm.createContext(ctx);
  vm.runInContext([cut(oldSrc, 'function obRefType(v){', 'function obRefTypeLabel('), cut(oldSrc, 'function obPrehireRefs(c){', 'function preHireRows('),
    cut(oldSrc, 'function cgRecordFromCandidate(', '// ── Promote / Close Out')].join('\n') + '\nthis.__b = { cgRecordFromCandidate, obPrehireRefs };', ctx);
  return ctx.__b;
}
function newBuilder() {
  const ctx = { console, JSON, Object, String, Date, globalThis: null, safeTmpId: () => -1, hiringSnapshot: (c) => ({ frozen_for: c.id }) };
  vm.createContext(ctx); ctx.globalThis = ctx;
  vm.runInContext(RULES, ctx);
  vm.runInContext(cut(ENGINE, 'function obPrehireRefs(c){', 'function preHireRows(') + cut(ENGINE, 'function cgRecordFromCandidate(', '// ── Promote / Close Out')
    + '\nthis.__b = { cgRecordFromCandidate, obPrehireRefs };', ctx);
  return ctx.__b;
}
const CASEY = { id: 50, first: 'Casey', last: 'Moreno', phone: '417.555.0103', email: 'casey@example.com', oos: 'no', offer_id: 77, intake_id: 'in-3',
  orient_session_date: '2026-09-25', oig: 'Clear', oig_date: '2026-09-10', oig_proof: 'oig.pdf', edl: 'Clear', edl_date: '2026-09-11', fcsr: 'Clear', fcsr_date: '2026-09-12', fp: 'N/A',
  r1n: 'Ref One', r1s: 'Received', r1_phone: '4175550900', r1_type: 'Professional', r1_company: 'Acme', r1_pdf: 'r1.pdf',
  r1_manual: { relationship: 'boss', how_long: '3 years', date: '2026-09-15', answers: { q1: 'yes' } }, r1_sms_ok: { at: 'x' }, r1_sent: { via: 'sms' },
  r2n: ' Ref Two ', r2s: 'Pending', r2_type: 'personal', r3n: '', r4n: 'Ref Four', r4_manual: { type: 'professional', employer_confirmed: 'Shop' } };
const OOS = { id: 51, first: 'Out', last: 'State', oos: 'yes', fp: 'Clear', fp_date: '2026-09-01', fp_proof: 'fp.pdf', offer_id: '', intake_id: null };
const BARE = { id: 52, first: 'Bare', last: 'Minimum' };
if (!hadOld) {
  ck('main still has the old builder to compare against (skipped: main already has this change)', true);
} else {
  const O = oldBuilder(), N = newBuilder();
  for (const [label, c, h, o] of [['with references and checks', CASEY, '2026-09-25', '2026-09-25'], ['out of state, fingerprints', OOS, '2026-10-01', ''], ['almost empty', BARE, '2026-10-03', '2026-10-03']]) {
    const a = O.cgRecordFromCandidate(clone(c), h, o), b = N.cgRecordFromCandidate(clone(c), h, o);
    a.promoted_at = b.promoted_at = 'X';
    ck('Move to caregiver record byte-identical to before: ' + label, JSON.stringify(a) === JSON.stringify(b), [a, b]);
    ck('reference list identical to before: ' + label, JSON.stringify(O.obPrehireRefs(clone(c))) === JSON.stringify(N.obPrehireRefs(clone(c))));
  }
}
{
  const ctx = { console, JSON, Object, String, Date, safeTmpId: () => -1 };
  vm.createContext(ctx); ctx.globalThis = ctx;
  vm.runInContext(cut(ENGINE, 'function cgRecordFromCandidate(', '// ── Promote / Close Out') + '\nthis.__f = cgRecordFromCandidate;', ctx);
  let msg = ''; try { ctx.__f(clone(BARE), '2026-10-03', ''); } catch (e) { msg = e.message; }
  ck('rules file missing: the engine says so plainly (never builds a record some other way)', /did not load\. Refresh the page/.test(msg), msg);
}
{
  const engineType = new Function(cut(ENGINE, 'function obRefType(v){', 'function obRefTypeLabel(') + 'return obRefType;')();
  const ins = ['professional', 'Professional ', 'PERSONAL', 'personal', '', null, undefined, 'friend', 'pro'];
  ck("the rules' refType agrees with the engine's obRefType", ins.every((v) => C.refType(v) === engineType(v)));
}
ck('the page loads the rules before the engine, in order', (() => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const k = html.indexOf("k.src='caregiver-connect-rules.js"), e = html.indexOf("s.src = 'caregivers-engine.js");
  return k > 0 && e > k && /k\.async=false/.test(html);
})());

/* ── 2. her rules ── */
const blankCg = (o) => Object.assign({ oos: 'no', orient_date: '', alz_date: '', oig_status: '', edl_status: '', fcsr_status: '' }, o);
function fixture() {
  return {
    census: [
      { id: '101', first: 'Jordan', last: 'Pike', mobile: '1-417-555-0101', active: true, hire_date: '2026-09-01' },
      { id: '102', first: 'Riley', last: 'Stone', mobile: '', email: 'Riley.Stone@Example.com', active: true },
      { id: '103', first: 'Casey', last: 'Moreno', mobile: '1-417-555-0103', active: true, hire_date: '2026-09-30T00:00:00' },
      { id: '104', first: 'Quinn', last: 'Ashby', mobile: '1-417-555-0104', active: true, hire_date: '2026-09-29' },
      { id: '105', first: 'Taylor', last: 'Brandt', mobile: '1-417-555-0105', active: true },
      { id: '106', first: 'Morgan', last: 'Lee', mobile: '1-417-555-0106', active: true },
      { id: '107', first: 'Avery', last: 'Cole', mobile: '1-417-555-0107', active: false },
      { id: '108', first: 'Drew', last: 'Palmer', mobile: '1-417-555-0108', active: true },
      { id: '109', first: 'Sam', last: 'Ortiz', mobile: '1-417-555-0109', active: true },
      { id: '110', first: 'Blake', last: 'Hart', mobile: '1-417-555-0110', active: true },
      { id: '111', first: 'Pat', last: 'Gray', mobile: '1-417-555-0111', active: true },
      { id: '112', first: 'Lee', last: 'Gray', mobile: '1-417-555-0111', active: true },
      { id: '113', first: 'Jamie', last: 'Fox', mobile: '1-417-555-0113', active: true },
    ],
    cgs: [
      blankCg({ id: 20, first: 'Jo', last: 'Pike', phone: '(417) 555-0101', email: '' }),
      blankCg({ id: 21, first: 'Riley', last: 'Stone-Hart', phone: '', email: 'riley.stone@example.com' }),
      blankCg({ id: 22, first: 'Tayler', last: 'Brandt', phone: '417-555-9999' }),
      blankCg({ id: 23, first: 'M', last: 'Lee', phone: '4175550106' }),
      blankCg({ id: 24, first: 'Avery', last: 'Coleman', phone: '4175550107' }),
      blankCg({ id: 25, first: 'Drew', last: 'Palmer', phone: '4175558888' }),
      blankCg({ id: 26, first: 'Sam', last: 'Ortiz', phone: '417 555 0109' }),
      blankCg({ id: 27, first: 'Blake', last: 'Hart', phone: '4175550110', axiscare_id: '110' }),
      blankCg({ id: 28, first: 'Patricia', last: 'Gray', phone: '4175550111' }),
    ],
    cands: [
      clone(CASEY),
      { id: 51, first: 'Morgan', last: 'Leigh', phone: '417-555-0106' },
      { id: 53, first: 'Jamie', last: 'Foxx', phone: '4175550113', not_hired: true },
      { id: 54, first: 'Unrelated', last: 'Person', phone: '4175550777' },
    ],
  };
}
const F = fixture();
const P = C.plan(F.census, F.cgs, F.cands);
const axs = (a) => a.map((x) => String(x.ax.id)).sort();
const rv = (ax) => P.review.find((x) => String(x.ax.id) === ax);
ck('A: link by phone ("1-417-..." AxisCare vs "(417) ..." Hub)', P.link.some((x) => x.ax.id === '101' && x.row.id === 20 && x.how === 'phone'));
ck('A: link by email (any capitals)', P.link.some((x) => x.ax.id === '102' && x.row.id === 21 && x.how === 'email'));
ck('A: unique exact name + same phone: AxisCare id recorded', P.link.some((x) => x.ax.id === '109' && x.row.id === 26 && x.byName === true));
ck('A: exactly these are linked', JSON.stringify(axs(P.link)) === JSON.stringify(['101', '102', '109']), axs(P.link));
ck('B: moved over: the one open candidate with the phone', P.move.length === 1 && P.move[0].ax.id === '103' && P.move[0].cand.id === 50 && P.move[0].how === 'phone');
ck('C: created only when nothing matches and no similar name', JSON.stringify(axs(P.create)) === JSON.stringify(['104']), axs(P.create));
ck('D: name only (Taylor / Tayler Brandt): review, never linked', /name is similar/.test((rv('105') || {}).why || ''));
ck('D: two possible records (Hub record + candidate, same phone): review', /more than one record/.test((rv('106') || {}).why || ''), rv('106'));
ck('D: a shared household phone: review for both', !!rv('111') && !!rv('112') && /also on another/.test(rv('111').why));
ck('D: only match is a not-hired candidate: review', /not hired/.test((rv('113') || {}).why || ''));
ck('D: exactly these need a look', JSON.stringify(axs(P.review)) === JSON.stringify(['105', '106', '111', '112', '113']), axs(P.review));
ck('inactive AxisCare caregiver never touched', ![...P.link, ...P.move, ...P.create, ...P.review].some((x) => x.ax.id === '107'));
ck('unique exact name, different phone: left alone (already connected by name)', P.connected.includes('108') && ![...P.link, ...P.review].some((x) => x.ax.id === '108'));
ck('already connected by AxisCare id: nothing to do', P.connected.includes('110') && ![...P.link, ...P.review].some((x) => x.ax.id === '110'));
ck('review options name the records and why, no em dash', (() => {
  const t = rv('106').options.map(C.optionText).join('; ');
  return /M Lee \(Hub record; same phone\)/.test(t) && /Morgan Leigh \(Background & References; same phone/.test(t) && !/\u2014/.test(t);
})(), rv('106').options.map(C.optionText));
ck('the plan changes nothing it was given', JSON.stringify(fixture()) === JSON.stringify(F));
ck('running it again on the result connects nobody new', (() => {
  const g = clone(F.cgs), k = clone(F.cands);
  P.link.forEach((a) => { g.find((r) => r.id === a.row.id).axiscare_id = String(a.ax.id); });
  P.move.forEach((m) => { g.push(Object.assign({ id: 900 }, C.movedRecord(m.cand, m.ax, { today: '2026-10-03' }))); k.splice(k.findIndex((x) => x.id === m.cand.id), 1); });
  P.create.forEach((c) => { g.push(C.newRecord(c.ax, { id: 901 })); });
  const P2 = C.plan(F.census, g, k);
  return P2.link.length + P2.move.length + P2.create.length === 0 && P2.review.length === 5;
})());
ck('phone: last 10 digits; short numbers never match', (() => {
  const a = C.plan([{ id: 'x', first: 'Ann', last: 'Bee', mobile: '1-417-315-3952', active: true }], [{ id: 1, first: 'Zed', last: 'Q', phone: '417.315.3952' }], []);
  const b = C.plan([{ id: 'x', first: 'Ann', last: 'Bee', mobile: '3952', active: true }], [{ id: 1, first: 'Zed', last: 'Q', phone: '3952' }], []);
  return a.link.length === 1 && b.link.length === 0 && b.create.length === 1;
})());
ck('a record already connected to another AxisCare id with the same phone: review, never created', (() => {
  const p = C.plan([{ id: 'x', first: 'Ann', last: 'Bee', mobile: '4173153952', active: true }], [{ id: 1, first: 'Zed', last: 'Q', phone: '4173153952', axiscare_id: '999' }], []);
  return p.review.length === 1 && p.create.length === 0;
})());
ck('similar name: first 3 letters + same last name (Christopher / Chris Dunn): review', (() => {
  const p = C.plan([{ id: 'x', first: 'Christopher', last: 'Dunn', active: true }], [], [{ id: 9, first: 'Chris', last: 'Dunn' }]);
  return p.review.length === 1 && p.create.length === 0;
})());
ck('similar name via AxisCare "goes by"', (() => {
  const p = C.plan([{ id: 'x', first: 'Angela', goes_by: 'Angiel', last: 'Falig', active: true }], [{ id: 3, first: 'Angie', last: 'Falig' }], []);
  return p.review.length === 1;
})());
ck('a nameless AxisCare row is never created', C.plan([{ id: 'x', first: '', last: '', active: true }], [], []).create.length === 0);

/* "Not this person": a pair a person undid is never matched automatically again */
{
  const ax = F.census.find((c) => c.id === '101');
  const p = C.plan([ax], F.cgs, F.cands, { blocked: [{ axiscare_id: '101', kind: 'caregiver', id: 20 }] });
  ck('Not this person (Hub record): no link again, a review instead', p.link.length === 0 && p.create.length === 0 && p.review.length === 1 && /said the matching record is not theirs/.test(p.review[0].why), p);
  ck('...and the card still shows that record, marked', p.review[0].options.some((o) => o.id === 20 && o.why.includes('a person said not theirs')));
  const ax3 = F.census.find((c) => c.id === '103');
  const q = C.plan([ax3], F.cgs, F.cands, { blocked: [{ axiscare_id: '103', kind: 'candidate', id: 50 }] });
  ck('Not this person (candidate): no move again, a review instead', q.move.length === 0 && q.create.length === 0 && q.review.length === 1);
  const ax4 = F.census.find((c) => c.id === '104');
  const u = C.plan([ax4], F.cgs, F.cands, { blocked: [{ axiscare_id: '104', kind: 'new', id: '' }] });
  ck('Not this person (a new record): never started again, a review instead', u.create.length === 0 && u.review.length === 1 && /not to start a new Hub record/.test(u.review[0].why));
  const r = C.plan([ax], F.cgs, F.cands, { blocked: [{ axiscare_id: '999', kind: 'caregiver', id: 20 }] });
  ck("someone else's undo does not block this caregiver", r.link.length === 1);
}

/* ── 3. the records the job writes ── */
{
  const ax = F.census.find((c) => c.id === '103');
  const btn = C.recordFromCandidate(clone(CASEY), '2026-09-30', '2026-09-25', { id: 5, promoted_at: 'P', hiring_snapshot: null });
  const mv = C.movedRecord(clone(CASEY), ax, { id: 5, promoted_at: 'P', hiring_snapshot: null, today: '2026-10-03', connected: { at: 'T', how: 'phone', by: 'auto' } });
  ck('moved record = the button\'s record + axiscare_id + connected (same fields, same order)', JSON.stringify(Object.keys(mv)) === JSON.stringify(Object.keys(btn).concat(['axiscare_id', 'connected'])));
  const strip = (r) => { const x = clone(r); delete x.axiscare_id; delete x.connected; return x; };
  ck('...and the same values', JSON.stringify(strip(mv)) === JSON.stringify(btn));
  ck('moved: AxisCare hire date, orientation date only as recorded, prehire + references carried', mv.hire_date === '2026-09-30' && mv.prehire.hired_at === '2026-09-30' && mv.orient_date === '2026-09-25' && mv.prehire.refs.length === 3 && mv.candidate_id === 50);
  const noHire = C.movedRecord(Object.assign(clone(CASEY), { orient_session_date: '' }), { id: '9', first: 'a', last: 'b' }, { today: '2026-10-03' });
  ck('moved, no AxisCare hire date and no orientation: the button\'s rule (today), orientation left empty', noHire.hire_date === '2026-10-03' && noHire.orient_date === '');
  const nw = C.newRecord(F.census.find((c) => c.id === '104'), { id: 7, connected: { at: 'T', by: 'auto', how: 'new' } });
  ck('new record: AxisCare id, hire date, empty compliance, no prehire', nw.axiscare_id === '104' && nw.hire_date === '2026-09-29' && nw.created_via === 'auto from AxisCare'
    && !('prehire' in nw) && nw.fp === 'N/A' && nw.ojt_signed === 'no' && nw.phone === '1-417-555-0104' && nw.connected.how === 'new');
}

/* ── 4. the Connect card ── */
{
  const o = C.options(F.census.find((c) => c.id === '111'), F.cgs, F.cands, { census: F.census });
  ck('Connect card: a shared-phone caregiver lists the Hub record', !o.certain && o.options.some((x) => x.name === 'Patricia Gray' && x.where === 'hub'));
  const c = C.options(F.census.find((c) => c.id === '101'), F.cgs, F.cands, { census: F.census });
  const n = C.options({ id: '555', first: 'No', last: 'Body', mobile: '4170000000' }, F.cgs, F.cands, { census: F.census });
  ck('Connect card: nobody similar: no choices, not certain (Start a new Hub record is the card\'s own button)', !n.certain && n.options.length === 0);
  ck('Connect card: a certain match is offered as one choice', c.certain && c.options.length === 1 && c.options[0].id === 20);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

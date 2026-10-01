const { loadEngine } = require('./harness');
const assert = require('assert');
/* Run: node tests/cg-connect/connect.test.js
   OLD is caregivers-engine.js as it was before this change (commit 3cdfb2d),
   so the Promote button's row can be proven unchanged by the refactor. */
const path = require('path'), fs = require('fs'), os = require('os'), cp = require('child_process');
const ROOT = path.join(__dirname, '..', '..');
const NEW = path.join(ROOT, 'caregivers-engine.js');
const OLD = path.join(os.tmpdir(), 'caregivers-engine.before-cgconnect.js');
fs.writeFileSync(OLD, cp.execSync('git show 3cdfb2d:caregivers-engine.js', { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 }));
let pass = 0, fail = 0;
async function t(name, fn) { try { await fn(); pass++; console.log('PASS', name); } catch (e) { fail++; console.log('FAIL', name, '\n   ', e && e.message); } }
const clone = x => JSON.parse(JSON.stringify(x));
const blankCg = (o) => Object.assign({ oos:'no', orient_date:'', alz_date:'', oig_status:'', edl_status:'', fcsr_status:'' }, o);
const CAND_CASEY = { id: 50, first: 'Casey', last: 'Moreno', phone: '417.555.0103', email: 'casey@example.com', oos: 'no',
  orient_session_date: '2026-09-25', oig: 'Clear', oig_date: '2026-09-10', oig_proof: 'oig.pdf', edl: 'Clear', edl_date: '2026-09-11', fcsr: 'Clear', fcsr_date: '2026-09-12', fp: 'N/A',
  r1n: 'Ref One', r1s: 'Received', r1_phone: '4175550900', r1_type: 'professional', r2n: 'Ref Two', r2s: 'Pending' };
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
    store: {
      caregivers: [
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
      candidates: [
        clone(CAND_CASEY),
        { id: 51, first: 'Morgan', last: 'Leigh', phone: '417-555-0106' },
        { id: 52, first: 'Jamie', last: 'Foxx', phone: '4175550113', not_hired: true },
        { id: 53, first: 'Unrelated', last: 'Person', phone: '4175550777' },
      ],
      ops_items: [
        { id: 'ops_cgconnect_105', kind: 'caregiver_connect', title: 'Connect caregiver: Taylor Brandt', status: 'open', detail: 'old' },
        { id: 'ops_cgconnect_110', kind: 'caregiver_connect', title: 'Connect caregiver: Blake Hart', status: 'open' },
      ],
      audit_log: [],
    },
  };
}
const row = (store, id) => store.caregivers.find(r => String(r.id) === String(id));
const byAx = (store, ax) => store.caregivers.filter(r => String(r.axiscare_id || '') === String(ax));

(async () => {
  const F = fixture();
  const e = await loadEngine(NEW, F.store);
  const s1 = await e.w.scxAutoConnect(F.census);
  const names = a => JSON.parse(JSON.stringify(a.map(x => x.name).sort()));

  await t('A: link by phone, AxisCare "1-417-..." format vs "(417) ..." Hub format', () => {
    const r = row(e.store, 20); assert.strictEqual(r.axiscare_id, '101'); assert.strictEqual(r.connected.how, 'phone'); assert.strictEqual(r.connected.by, 'auto'); assert.ok(r.connected.at);
  });
  await t('A: link by email (case-insensitive)', () => {
    const r = row(e.store, 21); assert.strictEqual(r.axiscare_id, '102'); assert.strictEqual(r.connected.how, 'email');
  });
  await t('B: moved over: one new row with axiscare_id, AxisCare hire date, prehire + refs carried, from noted', () => {
    const rs = byAx(e.store, '103'); assert.strictEqual(rs.length, 1); const r = rs[0];
    assert.strictEqual(r.candidate_id, 50); assert.strictEqual(r.hire_date, '2026-09-30'); assert.strictEqual(r.prehire.hired_at, '2026-09-30');
    assert.strictEqual(r.orient_date, '2026-09-25'); assert.strictEqual(r.prehire.oig.status, 'Clear'); assert.strictEqual(r.prehire.refs.length, 2);
    assert.strictEqual(r.prehire.refs[0].name, 'Ref One'); assert.strictEqual(r.phone, '417.555.0103');
    assert.deepStrictEqual({ how: r.connected.how, by: r.connected.by, from: r.connected.from }, { how: 'phone', by: 'auto', from: 'background & references' });
  });
  await t('B: candidate removed from Background & References', () => {
    assert.ok(!e.store.candidates.some(c => c.id === 50)); assert.strictEqual(e.store.candidates.length, 3);
  });
  await t('C: created only when nothing matches and no similar name', () => {
    const rs = byAx(e.store, '104'); assert.strictEqual(rs.length, 1); const r = rs[0];
    assert.strictEqual(r.created_via, 'auto from AxisCare'); assert.strictEqual(r.hire_date, '2026-09-29'); assert.strictEqual(r.connected.how, 'new');
    assert.ok(!('prehire' in r)); assert.strictEqual(r.fp, 'N/A'); assert.strictEqual(r.ojt_signed, 'no');
  });
  await t('D: name-only similarity goes to review, never created or linked', () => {
    assert.strictEqual(byAx(e.store, '105').length, 0); assert.strictEqual(row(e.store, 22).axiscare_id, undefined);
    const r = s1.review.find(x => x.axiscare_id === '105'); assert.ok(r); assert.match(r.why, /name is similar/);
  });
  await t('D: existing open review item is not duplicated or rewritten', () => {
    const its = e.store.ops_items.filter(x => x.id === 'ops_cgconnect_105'); assert.strictEqual(its.length, 1); assert.strictEqual(its[0].detail, 'old');
  });
  await t('D: two possible records (Hub row + candidate, same phone) goes to review', () => {
    assert.strictEqual(byAx(e.store, '106').length, 0); assert.ok(e.store.candidates.some(c => c.id === 51));
    const it = e.store.ops_items.find(x => x.id === 'ops_cgconnect_106'); assert.ok(it);
    assert.strictEqual(it.kind, 'caregiver_connect'); assert.strictEqual(it.domain, 'caregivers'); assert.strictEqual(it.title, 'Connect caregiver: Morgan Lee');
    assert.match(it.detail, /M Lee \(Hub record; same phone\)/); assert.match(it.detail, /Morgan Leigh \(Background & References; same phone/);
    assert.ok(!/—/.test(it.detail + it.title + it.next_action), 'no em dash');
  });
  await t('D: shared household phone (two AxisCare caregivers reach one record) goes to review for both', () => {
    assert.strictEqual(row(e.store, 28).axiscare_id, undefined);
    assert.ok(s1.review.find(x => x.axiscare_id === '111')); assert.ok(s1.review.find(x => x.axiscare_id === '112'));
  });
  await t('D: only match is a not-hired candidate goes to review', () => {
    const r = s1.review.find(x => x.axiscare_id === '113'); assert.ok(r); assert.match(r.why, /not hired/); assert.ok(e.store.candidates.some(c => c.id === 52));
  });
  await t('Inactive AxisCare caregiver ignored', () => {
    assert.strictEqual(row(e.store, 24).axiscare_id, undefined); assert.ok(!e.store.ops_items.find(x => x.id === 'ops_cgconnect_107'));
  });
  await t('Unique exact name already connected: untouched when phone differs', () => {
    const r = row(e.store, 25); assert.strictEqual(r.axiscare_id, undefined); assert.strictEqual(r.connected, undefined);
    assert.ok(!e.store.ops_items.find(x => x.id === 'ops_cgconnect_108')); assert.strictEqual(byAx(e.store, '108').length, 0);
  });
  await t('Unique exact name + same phone: axiscare_id recorded (rule A semantics)', () => {
    const r = row(e.store, 26); assert.strictEqual(r.axiscare_id, '109'); assert.strictEqual(r.connected.how, 'phone');
  });
  await t('Already linked by id: open review item closed, row untouched', () => {
    const it = e.store.ops_items.find(x => x.id === 'ops_cgconnect_110'); assert.strictEqual(it.status, 'done'); assert.strictEqual(it.closed_by, 'automation');
    assert.strictEqual(row(e.store, 27).connected, undefined);
  });
  await t('Summary names + one audit_log line', () => {
    assert.deepStrictEqual(names(s1.linked), ['Jordan Pike', 'Riley Stone', 'Sam Ortiz']);
    assert.deepStrictEqual(names(s1.moved), ['Casey Moreno']);
    assert.deepStrictEqual(names(s1.created), ['Quinn Ashby']);
    assert.deepStrictEqual(names(s1.review), ['Jamie Fox', 'Lee Gray', 'Morgan Lee', 'Pat Gray', 'Taylor Brandt']);
    assert.strictEqual(s1.saved, true);
    assert.strictEqual(e.store.audit_log.length, 1); const a = e.store.audit_log[0];
    assert.match(a.id, /^cgconnect_\d+$/); assert.strictEqual(a.kind, 'caregiver_auto_connect'); assert.match(a.note, /Jordan Pike \(by phone\)/); assert.match(a.note, /Quinn Ashby \(new Hub record\)/);
  });
  await t('Idempotent: second run changes nothing', async () => {
    const before = clone(e.store); const logN = e.log.length;
    const s2 = await e.w.scxAutoConnect(F.census);
    assert.strictEqual(s2.linked.length + s2.moved.length + s2.created.length, 0);
    assert.strictEqual(s2.review.length, 5); assert.ok(s2.review.every(x => !x.isNew));
    assert.strictEqual(JSON.stringify(e.store), JSON.stringify(before));
    assert.ok(!e.log.slice(logN).some(x => x[0] === 'upsert' || x[0] === 'rpc'), 'no writes on second run');
  });

  // Never runs before hydration
  await t('Refuses before HYDRATED (shared read failed): no writes at all', async () => {
    const st = fixture().store; st.__failRead = true;
    const e2 = await loadEngine(NEW, st);
    assert.strictEqual(e2.w.scxIsHydrated(), false);
    const before = clone(st);
    const r = await e2.w.scxAutoConnect(fixture().census);
    assert.strictEqual(r.skipped, 'not loaded');
    await assert.rejects(() => e2.w.scxConnectManual(fixture().census[0], 'new', '', 'x'), /has not loaded/);
    assert.strictEqual(JSON.stringify(st), JSON.stringify(before)); assert.ok(!e2.log.some(x => x[0] === 'upsert' || x[0] === 'rpc'));
  });

  // Promote: row shape identical before vs after the refactor
  for (const variant of ['with orientation date', 'without orientation date (today rule)']) {
    await t('promoteToCaregiver row identical to before the refactor: ' + variant, async () => {
      const mk = () => { const c = clone(CAND_CASEY); if (variant.startsWith('without')) delete c.orient_session_date; return { caregivers: [blankCg({ id: 30, first: 'X', last: 'Y' })], candidates: [c], ops_items: [], audit_log: [] }; };
      const a = await loadEngine(OLD, mk()); const b = await loadEngine(NEW, mk());
      for (const x of [a, b]) { try { x.w.promoteToCaregiver(50); } catch (err) { /* renderOB etc. need a real DOM; the row is saved before they run */ } }
      const ra = JSON.parse(a.ls.cc_caregivers), rb = JSON.parse(b.ls.cc_caregivers);
      [ra, rb].forEach(rs => rs.forEach(r => { if (r.promoted_at) r.promoted_at = 'X'; }));
      assert.strictEqual(JSON.stringify(ra), JSON.stringify(rb));   // same keys, same order, same values
      assert.strictEqual(JSON.parse(a.ls.cc_candidates).length, 0); assert.strictEqual(JSON.parse(b.ls.cc_candidates).length, 0);
    });
  }
  await t('Moved row = Promote row + axiscare_id + connected (same fields)', async () => {
    const st = { caregivers: [], candidates: [clone(CAND_CASEY)], ops_items: [], audit_log: [] };
    const a = await loadEngine(NEW, clone(st)); try { a.w.promoteToCaregiver(50); } catch (err) {}
    const pr = JSON.parse(a.ls.cc_caregivers)[0];
    const b = await loadEngine(NEW, clone(st)); await b.w.scxAutoConnect([{ id: '103', first: 'Casey', last: 'Moreno', mobile: '1-417-555-0103', active: true }]);
    const mv = b.store.caregivers[0];
    assert.strictEqual(JSON.stringify(Object.keys(mv)), JSON.stringify(Object.keys(pr).concat(['axiscare_id', 'connected'])));
    assert.strictEqual(JSON.stringify(mv.prehire.refs), JSON.stringify(pr.prehire.refs));
    assert.strictEqual(mv.hire_date, pr.hire_date, 'no AxisCare hire date: falls back to the Promote rule');
  });

  // Pure plan: phone formats
  await t('Plan: phone digits last 10 ("1-417-315-3952" == "417.315.3952"), short numbers ignored', async () => {
    const p = e.w.scxConnectPlan([{ id: 'x', first: 'Ann', last: 'Bee', mobile: '1-417-315-3952', active: true }], [{ id: 1, first: 'Zed', last: 'Q', phone: '417.315.3952' }], []);
    assert.strictEqual(p.link.length, 1);
    const p2 = e.w.scxConnectPlan([{ id: 'x', first: 'Ann', last: 'Bee', mobile: '3952', active: true }], [{ id: 1, first: 'Zed', last: 'Q', phone: '3952' }], []);
    assert.strictEqual(p2.link.length, 0); assert.strictEqual(p2.create.length, 1);
  });
  await t('Plan: a record already linked to another AxisCare id with the same phone blocks auto (review)', async () => {
    const p = e.w.scxConnectPlan([{ id: 'x', first: 'Ann', last: 'Bee', mobile: '4173153952', active: true }], [{ id: 1, first: 'Zed', last: 'Q', phone: '4173153952', axiscare_id: '999' }], []);
    assert.strictEqual(p.review.length, 1); assert.strictEqual(p.create.length, 0);
  });
  await t('Plan: similar name via first-3-letters + same last name', async () => {
    const p = e.w.scxConnectPlan([{ id: 'x', first: 'Christopher', last: 'Dunn', active: true }], [], [{ id: 9, first: 'Chris', last: 'Dunn' }]);
    assert.strictEqual(p.review.length, 1); assert.strictEqual(p.create.length, 0);
  });

  // Manual path
  await t('Manual: link a Hub record, closes the review item, records who', async () => {
    const r = await e.w.scxConnectManual(F.census.find(c => c.id === '105'), 'link', 22, 'Office Person');
    assert.ok(r.ok); const rw = row(e.store, 22);
    assert.strictEqual(rw.axiscare_id, '105'); assert.deepStrictEqual({ by: rw.connected.by, how: rw.connected.how }, { by: 'Office Person', how: 'manual' });
    const it = e.store.ops_items.find(x => x.id === 'ops_cgconnect_105'); assert.strictEqual(it.status, 'done'); assert.strictEqual(it.closed_by, 'Office Person');
    await assert.rejects(() => e.w.scxConnectManual(F.census.find(c => c.id === '105'), 'new', '', 'Office Person'), /already connected/);
  });
  await t('Manual: move over from B&R', async () => {
    const r = await e.w.scxConnectManual(F.census.find(c => c.id === '106'), 'move', 51, 'Office Person');
    assert.ok(r.ok); const rs = byAx(e.store, '106'); assert.strictEqual(rs.length, 1); assert.strictEqual(rs[0].candidate_id, 51);
    assert.strictEqual(rs[0].connected.from, 'background & references'); assert.ok(!e.store.candidates.some(c => c.id === 51));
  });
  await t('Manual: start new record', async () => {
    await e.w.scxConnectManual(F.census.find(c => c.id === '113'), 'new', '', 'Office Person');
    const rs = byAx(e.store, '113'); assert.strictEqual(rs.length, 1); assert.strictEqual(rs[0].created_via, 'manual from AxisCare');
  });
  await t('Options for the Connect card list phone + similar-name records', async () => {
    const o = e.w.scxConnectOptions(F.census.find(c => c.id === '111'));
    assert.ok(o.hydrated); assert.ok(o.options.some(x => x.name === 'Patricia Gray' && x.where === 'hub'));
  });
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();

/* node tests/safe-saves-test.js
   421 safe saves part 2 (Samantha, 2026-10-02/03). The real safe-save module, loadFromSupabase, saveCandidates /
   saveCaregivers, intakeImport, wcAddToRoster, cgRecordFromCandidate, promoteToCaregiver, createRefRequests and
   bootHydrate, cut out of caregivers-engine.js and run against a fake database that behaves like
   app_data_items_apply (Staffing repo safe_saves_2.sql: per-person _rev, server-given numbers that are never reused,
   all-or-nothing, more than 2 removals refused). Proves: only what changed is sent; new people get the database's
   number in place of their temporary one; saves of one list never overlap (no double add); a stale change is refused,
   the list reloaded and the office told who to redo; a failed add is taken back off and said out loud; the
   welcome-call roster add keeps its true/false contract; Import ends with the database's number; boot never saves;
   nothing is sent before a fresh load. Plus the index.html caregiver writers. */
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process');
const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'caregivers-engine.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const cut = (from, to) => { const a = src.indexOf(from), b = src.indexOf(to, a + 1); if (a < 0 || b < 0) throw new Error('not found: ' + from); return src.slice(a, b); };
const code = [
  'let candidates = [], caregivers = [], HYDRATED = false, HYDRATE_ERR = null, editingOB = null, editingCG = null, INTAKE_ROWS = [];',
  'const acSelected = new Set();',
  cut('/* ── SAFE SAVES (421', 'function setSyncStatus('),
  cut('async function saveCandidates(', '// ── TRAINING HUB LIVE SYNC'),
  cut('async function intakeImport(', '/* ══════════════ UI GATE 1'),
  cut('async function wcAddToRoster(', 'function wcRosterMsg('),
  cut('function cgRecordFromCandidate(', '// ── Promote / Close Out'),
  cut('async function promoteToCaregiver(', 'function closeOutCandidate('),
  cut('async function createRefRequests(', 'async function askReferences('),
  cut('async function bootHydrate(', 'async function retryHydrate('),
].join('\n');

let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 700))); };
const tick = () => new Promise((r) => setTimeout(r, 0));

/* ── a fake database: app_data + app_data_items_apply semantics ── */
function server(init) {
  const S = { data: JSON.parse(JSON.stringify(init)), version: { candidates: 3, caregivers: 5 }, counter: { candidates: 0, caregivers: 0 },
    calls: [], writes: [], mode: null, intake: { 'in-1': { id: 'in-1', first_name: 'Aimee', last_name: 'Driggers', phone: '4175550000', email: 'a@x.test', lived_outside_mo: false, refs: [{ name: 'R One', phone: '1' }] } },
    seen: [], refInserts: 0, sessions: true };
  for (const k of ['candidates', 'caregivers']) S.counter[k] = Math.max(0, ...(S.data[k] || []).map((x) => Number(x.id) || 0));
  const rev = (x) => Number(x && x._rev) || 0;
  S.apply = (key, changes) => {
    const cur = S.data[key] || [];
    const byId = {}; const cnt = {};
    cur.forEach((x) => { cnt[x.id] = (cnt[x.id] || 0) + 1; byId[String(x.id)] = x; });
    const conflicts = []; let removes = 0, bulk = false;
    for (const c of changes) {
      if (c.op === 'allow_bulk_remove') { bulk = true; continue; }
      if (c.op === 'remove') removes++;
      if (c.op === 'put' || c.op === 'remove') {
        const now = byId[String(c.id)];
        if (!now) conflicts.push({ id: c.id, reason: 'gone', current_record: null });
        else if (cnt[c.id] > 1) conflicts.push({ id: c.id, reason: 'duplicate_id', current_record: null });
        else if (c.base_rev != null && c.base_rev !== rev(now)) conflicts.push({ id: c.id, reason: 'changed', current_record: now });
      }
    }
    if (conflicts.length) return { ok: false, reason: 'conflict', version: S.version[key], conflicts };
    if (removes > 2 && !bulk) return { ok: false, reason: 'bulk_remove', removes, version: S.version[key], conflicts: [] };
    const rm = new Set(changes.filter((c) => c.op === 'remove').map((c) => String(c.id)));
    const puts = {}; changes.filter((c) => c.op === 'put').forEach((c) => { puts[String(c.id)] = c; });
    const out = []; const revs = {}; const ids = {};
    cur.forEach((x) => {
      if (rm.has(String(x.id))) return;
      if (puts[String(x.id)]) { const r = { ...puts[String(x.id)].record, id: x.id, _rev: rev(x) + 1 }; out.push(r); revs[String(x.id)] = r._rev; }
      else out.push(x);
    });
    changes.filter((c) => c.op === 'add').forEach((c) => {
      const id = ++S.counter[key]; const r = { ...c.record, id }; delete r._rev; out.push(r); ids[c.tmp] = id; revs[String(id)] = 0;
    });
    S.data[key] = out; S.version[key]++;
    return { ok: true, version: S.version[key], ids, revs, removed: [...rm] };
  };
  const q = (table) => {
    const st = { table, filters: {}, op: 'select' };
    const run = () => {
      if (table === 'app_data') {
        if (st.op !== 'select') { S.writes.push({ table, op: st.op }); return { data: null, error: null }; }
        if (S.mode === 'loadfail') return { data: null, error: { message: 'down' } };
        if (st.filters.key) { const k = st.filters.key; return { data: S.data[k] ? { data: JSON.parse(JSON.stringify(S.data[k])), version: S.version[k] } : null, error: null }; }
        return { data: Object.keys(S.data).map((k) => ({ key: k, data: JSON.parse(JSON.stringify(S.data[k])), version: S.version[k] || 0 })), error: null };
      }
      if (table === 'hire_intake') {
        if (st.op === 'update') { S.seen.push(st.filters.id); return { data: null, error: null }; }
        return { data: S.intake[st.filters.id] || null, error: null };
      }
      if (table === 'reference_requests') { if (st.op === 'insert') S.refInserts++; return { data: [], error: null }; }
      return { data: [], error: null };
    };
    const api = {
      select() { return api; }, eq(k, v) { st.filters[k] = v; return api; }, is() { return api; }, order() { return api; }, limit() { return api; }, in() { return api; },
      maybeSingle() { return Promise.resolve(run()); }, single() { return Promise.resolve(run()); },
      update(v) { st.op = 'update'; st.val = v; return api; }, upsert() { st.op = 'upsert'; return api; }, insert() { st.op = 'insert'; return api; }, delete() { st.op = 'delete'; return api; },
      then(res, rej) { return Promise.resolve(run()).then(res, rej); },
    };
    return api;
  };
  S.sb = {
    from: q,
    auth: { getSession: async () => ({ data: { session: S.sessions ? { user: { email: 'krystal@mo-care.com' } } : null } }) },
    rpc: async (name, args) => {
      S.calls.push({ name, args: JSON.parse(JSON.stringify(args)) });
      await tick();
      if (S.mode === 'down') return { data: null, error: { message: 'TypeError: Failed to fetch' } };
      if (S.mode === 'missing') return { data: null, error: { code: 'PGRST202', message: 'Could not find the function public.app_data_items_apply(p_changes, p_key) in the schema cache' } };
      if (S.mode === 'stale-once') { S.mode = null; const k = args.p_key; const c = args.p_changes.find((x) => x.op === 'put'); const t = S.data[k].find((x) => String(x.id) === String(c.id)); t.status = 'changed elsewhere'; t._rev = (Number(t._rev) || 0) + 1; }
      if (name === 'app_data_items_apply') return { data: S.apply(args.p_key, args.p_changes), error: null };
      return { data: null, error: { message: 'unknown rpc ' + name } };
    },
    functions: { invoke: async () => { S.calls.push({ name: 'invoke' }); return { data: {}, error: null }; } },
  };
  return S;
}

/* ── a tiny page ── */
function page() {
  const els = {};
  const mk = (tag) => ({ tag, style: {}, attrs: {}, innerHTML: '', setAttribute(k, v) { this.attrs[k] = v; }, querySelector() { return { onclick: null }; },
    remove() { delete els[this.id]; this.gone = true; } });
  const document = { body: { appendChild(el) { els[el.id] = el; } }, createElement: mk, getElementById: (id) => els[id] || null, querySelector: () => null };
  return { document, els, text: (id) => (els[id] ? els[id].innerHTML.replace(/<[^>]+>/g, '').replace(/OK$/, '').replace(/&amp;/g, '&').trim() : null) };
}

const P = (id, o = {}) => ({ id, first: 'First' + id, last: 'Last' + id, status: 'new', ...o });
async function world(init, opts = {}) {
  const S = server(init || { candidates: [P(1), P(2, { first: 'Ann', last: 'Lee' }), P(3, { first: 'Bo', last: 'Diaz', _rev: 4 })], caregivers: [P(7, { candidate_id: 1 })] });
  const D = page(); const alerts = []; const opened = []; const renders = []; const local = {};
  const ctx = {
    console: { log() {}, warn() {}, error() {} }, Date, JSON, Promise, Set, Map, String, Array, Object, Number, Error, RegExp, Intl, Math, setTimeout,
    sb: S.sb, document: D.document, window: {}, alert: (m) => alerts.push(m), confirm: () => true,
    localStorage: { setItem(k, v) { local[k] = v; }, getItem(k) { return local[k] || null; } },
    setSyncStatus() {}, hydrateBanner: () => renders.push('hydrateBanner'), migrateOldRecipients() {},
    renderAll: () => renders.push('renderAll'), renderOB: () => renders.push('renderOB'), renderTR() {}, renderAC() {}, renderAlerts() {},
    updateCoordreqBadge() {}, renderCoordReqs() {}, renderStaffHome() {}, ZAPIER_FIELDS: [],
    loadOffers: async () => {}, openOBModal: (id) => opened.push(id),
    obRefType: (t) => t || '', obPrehireRefs: () => [], hiringSnapshot: () => null, wcCentralYmd: () => '2026-10-03',
    WC_CARRY: ['offer_id', 'intake_id'], refRequestRow: () => ({}),
  };
  vm.createContext(ctx);
  vm.runInContext(code + `
async function loadIntake(){ INTAKE_ROWS = []; }
this.__x = { get candidates(){ return candidates; }, set candidates(v){ candidates = v; }, get caregivers(){ return caregivers; }, set caregivers(v){ caregivers = v; },
  get HYDRATED(){ return HYDRATED; }, set HYDRATED(v){ HYDRATED = v; }, get editingOB(){ return editingOB; }, set editingOB(v){ editingOB = v; },
  SAFE, safeDiff, safeTmpId, saveCandidates, saveCaregivers, loadFromSupabase, syncToSupabase, intakeImport, wcAddToRoster, promoteToCaregiver,
  createRefRequests, bootHydrate, safeSavesAdopt, safeConflictMsg };`, ctx);
  const X = ctx.__x;
  if (!opts.noLoad) { await X.loadFromSupabase(); X.HYDRATED = true; }
  return { S, X, D, alerts, opened, renders, local, ctx };
}
const applies = (S) => S.calls.filter((c) => c.name === 'app_data_items_apply');

(async () => {
  // ── load keeps the version and a copy per person ──
  let W = await world();
  ck('load: the version and a copy of each person are kept per list', W.X.SAFE.candidates.version === 3 && W.X.SAFE.candidates.snap.size === 3 && W.X.SAFE.caregivers.version === 5);
  W.X.candidates[0].status = 'edited';
  ck('load: the copy is separate from the live list (editing the list does not edit the copy)', W.X.SAFE.candidates.snap.get('1').status === 'new');

  // ── diff → changes ──
  W = await world();
  W.X.candidates[0].status = 'checks';                                   // put
  W.X.candidates = W.X.candidates.filter((c) => c.id !== 2);              // remove
  W.X.candidates.push({ id: W.X.safeTmpId(), first: 'New', last: 'Person' }); // add
  let d = W.X.safeDiff('candidates');
  ck('diff: one put (with the _rev it was based on), one add (temporary negative number), one remove; the unchanged person is not sent',
    d.changes.length === 3 && d.changes.some((c) => c.op === 'put' && c.id === 1 && c.base_rev === 0 && c.record.status === 'checks')
    && d.changes.some((c) => c.op === 'add' && Number(c.tmp) < 0 && c.record.first === 'New') && d.changes.some((c) => c.op === 'remove' && c.id === 2 && c.base_rev === 0)
    && !d.changes.some((c) => c.id === 3), d.changes);
  const p3 = W.X.candidates.find((c) => c.id === 3); p3.status = 'x';
  ck('diff: base_rev is the _rev the page loaded (4)', W.X.safeDiff('candidates').changes.find((c) => c.id === 3).base_rev === 4);
  p3.status = 'new';
  const keyOrder = { status: 'new', last: 'Last1', first: 'First1', id: 1 };
  W = await world(); W.X.candidates[0] = keyOrder;
  ck('diff: the same record with its fields in another order is not a change', W.X.safeDiff('candidates').changes.length === 0);

  // ── save: numbers from the database replace the temporary ones ──
  W = await world();
  const rec = { id: W.X.safeTmpId(), first: 'Aimee', last: 'Driggers' };
  W.X.candidates.push(rec); W.X.candidates[0].status = 'checks';
  let ok = await W.X.saveCandidates();
  ck('save: resolves true when the database confirmed', ok === true);
  ck('save: the new person now carries the database\'s number (4), in place', rec.id === 4 && W.X.candidates.includes(rec) && W.S.data.candidates.some((x) => x.id === 4 && x.first === 'Aimee'), rec);
  ck('save: one call, sent as a list of changes (never the whole list)', applies(W.S).length === 1 && applies(W.S)[0].args.p_key === 'candidates' && applies(W.S)[0].args.p_changes.length === 2, applies(W.S));
  ck('save: the copy now matches (a second save sends nothing) and the put\'s new _rev is kept', W.X.candidates[0]._rev === 1 && W.X.safeDiff('candidates').changes.length === 0);
  ok = await W.X.saveCandidates();
  ck('save: nothing changed = no call at all', ok === true && applies(W.S).length === 1);
  ck('save: the page re-draws after new numbers arrive (buttons carry the real number)', W.renders.includes('renderAll'));
  W.X.candidates.find((c) => c.id === 4).status = 'refs';
  await W.X.saveCandidates();
  ck('save: the next change to the new person is a put on the real number with _rev 0', applies(W.S)[1].args.p_changes[0].op === 'put' && applies(W.S)[1].args.p_changes[0].id === 4 && applies(W.S)[1].args.p_changes[0].base_rev === 0);

  // ── saves never overlap: no double add ──
  W = await world();
  W.X.candidates.push({ id: W.X.safeTmpId(), first: 'One', last: 'Add' });
  const a1 = W.X.saveCandidates(), a2 = W.X.saveCandidates(), a3 = W.X.saveCandidates();
  const all = await Promise.all([a1, a2, a3]);
  ck('three quick saves: the new person is added ONCE (saves of a list run one after another)', all.every((x) => x === true) && W.S.data.candidates.filter((x) => x.first === 'One').length === 1 && applies(W.S).length === 1, applies(W.S));

  // ── conflict ──
  W = await world();
  W.S.data.candidates[1] = { ...W.S.data.candidates[1], status: 'someone else', _rev: 1 };   // another page saved Ann Lee
  W.X.candidates.find((c) => c.id === 2).status = 'mine';
  W.X.candidates.push({ id: W.X.safeTmpId(), first: 'Also', last: 'New' });
  ok = await W.X.saveCandidates();
  const msg1 = 'Someone else changed Ann Lee since this page opened. We loaded the latest; please redo your last change.';
  ck('conflict: refused, resolves false', ok === false);
  ck('conflict: the exact message names the person', W.D.text('safeConflictWarn') === msg1, W.D.text('safeConflictWarn'));
  ck('conflict: the list is reloaded from the database (their change shows, mine is gone, nothing overwritten)', W.X.candidates.find((c) => c.id === 2).status === 'someone else'
    && W.S.data.candidates.find((c) => c.id === 2).status === 'someone else' && !W.S.data.candidates.some((c) => c.first === 'Also') && !W.X.candidates.some((c) => c.first === 'Also'));
  ck('conflict: the copy is the reloaded one, so the redo is based on the new _rev', W.X.SAFE.candidates.snap.get('2')._rev === 1 && W.renders.includes('renderAll'));
  W.S.data.candidates[0] = { ...W.S.data.candidates[0], status: 'x', _rev: 1 }; W.S.data.candidates[2] = { ...W.S.data.candidates[2], status: 'y', _rev: 5 };
  W.X.candidates.find((c) => c.id === 1).status = 'a'; W.X.candidates.find((c) => c.id === 3).status = 'b';
  await W.X.saveCandidates();
  ck('conflict: several people are listed by name', W.D.text('safeConflictWarn') === 'Someone else changed First1 Last1 and Bo Diaz since this page opened. We loaded the latest; please redo your last change.', W.D.text('safeConflictWarn'));
  W = await world();
  W.S.data.candidates = W.S.data.candidates.filter((c) => c.id !== 3);   // removed elsewhere
  W.X.candidates.find((c) => c.id === 3).status = 'z';
  await W.X.saveCandidates();
  ck('conflict: someone removed elsewhere is named from this page\'s copy, never added back', /Bo Diaz/.test(W.D.text('safeConflictWarn')) && !W.S.data.candidates.some((c) => c.id === 3));

  // ── a failed add is taken back off and said ──
  W = await world(); W.S.mode = 'down';
  const lost = { id: W.X.safeTmpId(), first: 'Net', last: 'Down' };
  W.X.candidates.push(lost); W.X.candidates[0].status = 'edited offline';
  ok = await W.X.saveCandidates();
  ck('unreachable: resolves false; the new person is taken back off this page (never local-only)', ok === false && !W.X.candidates.includes(lost) && !JSON.parse(W.local.cc_candidates).some((c) => c.first === 'Net'));
  ck('unreachable: said out loud', W.D.text('safeAddWarn') === 'Could not add Net Down: the shared workspace did not answer, so nothing was saved and they were not added. Check your connection and try again.', W.D.text('safeAddWarn'));
  ck('unreachable: the change to an existing person stays on screen with the "Saved on this device only" warning (and goes on the next save)', W.X.candidates[0].status === 'edited offline' && !!W.D.els.scxSharedSaveWarn);
  W = await world(); W.S.mode = 'down'; W.X.candidates.push({ id: W.X.safeTmpId(), first: 'Only', last: 'Add' });
  await W.X.saveCandidates();
  ck('unreachable, only an add: the add notice, never "Saved on this device only" (nothing was kept here)', !!W.D.els.safeAddWarn && !W.D.els.scxSharedSaveWarn);
  W = await world(); W.S.mode = 'down'; W.X.candidates[0].status = 'edited offline'; await W.X.saveCandidates();
  W.S.mode = null; ok = await W.X.saveCandidates();
  ck('unreachable, then back: the next save sends the kept change only', ok === true && applies(W.S).at(-1).args.p_changes.length === 1 && W.S.data.candidates[0].status === 'edited offline');

  // ── the database function not installed yet ──
  W = await world(); W.S.mode = 'missing';
  W.X.caregivers[0].oig_date = '2026-10-01';
  ok = await W.X.saveCaregivers();
  ck('not installed (421 not run): refused out loud, never a whole-list save instead', ok === false && W.D.text('safeSaveWarn') === 'Not saved. The new safe-save step is not installed on the database yet (421), so nothing in the caregiver roster can be saved. Tell Claude.'
    && W.S.writes.length === 0, W.D.text('safeSaveWarn'));

  // ── bulk removal ──
  W = await world();
  W.X.candidates = [];
  ok = await W.X.saveCandidates();
  ck('three people gone in one save: refused, list reloaded, said', ok === false && W.X.candidates.length === 3 && W.S.data.candidates.length === 3
    && W.D.text('safeBulkWarn') === 'Not saved: that save would have removed 3 people from Background & References at once, so it was stopped and nothing was saved. We loaded the latest list. If this was meant to happen, tell Claude.', W.D.text('safeBulkWarn'));
  ck('no Hub save asks to allow a bulk removal', !/allowBulkRemove\s*:\s*true/.test(src));

  // ── duplicates already in the list ──
  W = await world({ candidates: [P(10, { first: 'Old', last: 'Ten' }), P(10, { first: 'Aimee', last: 'Driggers' }), P(11)], caregivers: [] });
  W.X.candidates[1].status = 'changed';
  W.X.candidates[2].status = 'fine';
  ok = await W.X.saveCandidates();
  ck('two people sharing a number: their change is not sent (the database could not know which), others still save, and it is said',
    applies(W.S).length === 1 && applies(W.S)[0].args.p_changes.length === 1 && applies(W.S)[0].args.p_changes[0].id === 11
    && W.D.text('safeDupWarn') === 'Not saved: two records in Background & References share number 10, so a change to them cannot be saved until that is fixed. Tell Claude.', W.D.text('safeDupWarn'));

  // ── gates ──
  W = await world(null, { noLoad: true });
  W.X.candidates = [{ id: 1, first: 'Cached', last: 'Copy' }];
  ok = await W.X.saveCandidates();
  ck('before a fresh load: nothing is sent (a cached copy is never saved)', ok === false && applies(W.S).length === 0 && W.renders.includes('hydrateBanner'));
  W = await world(); W.X.HYDRATED = false; W.X.candidates[0].status = 'x';
  ok = await W.X.saveCandidates();
  ck('load failed later (HYDRATED off): nothing is sent', ok === false && applies(W.S).length === 0);
  W = await world(); W.S.sessions = false; W.X.candidates[0].status = 'x';
  ok = await W.X.saveCandidates();
  ck('signed out: nothing sent, and said', ok === false && applies(W.S).length === 0 && /signed out/.test(W.D.text('safeSaveWarn')));
  W = await world();
  ck('the whole-list save refuses candidates and caregivers', (await W.X.syncToSupabase('candidates', [])) === false && (await W.X.syncToSupabase('caregivers', [])) === false && W.S.writes.length === 0);
  W = await world({ caregivers: [P(7)] });
  ck('a list with no row in the database loads as empty here (the cached copy is not kept to be "added")', W.X.candidates.length === 0 && W.X.SAFE.candidates.snap.size === 0);

  // ── boot is read-only ──
  W = await world(null, { noLoad: true });
  await W.X.bootHydrate();
  ck('boot (bootHydrate): loads and renders, saves nothing, calls nothing', W.X.HYDRATED === true && W.S.calls.length === 0 && W.S.writes.length === 0 && W.S.seen.length === 0 && W.S.refInserts === 0);

  // ── intakeImport ──
  W = await world();
  await W.X.intakeImport('in-1', null);
  const imp = W.X.candidates.find((c) => c.intake_id === 'in-1');
  ck('Import: the new workspace carries the database\'s number (4), not a temporary one', imp && imp.id === 4 && W.S.data.candidates.some((c) => c.id === 4 && c.intake_id === 'in-1'), imp);
  ck('Import: the start form is marked seen only after the database confirmed', W.S.seen.length === 1 && W.S.seen[0] === 'in-1');
  await W.X.intakeImport('in-1', null);
  ck('Import pressed again: opens the SAME workspace by its real number, adds nothing', W.opened.join() === '4' && W.S.data.candidates.filter((c) => c.intake_id === 'in-1').length === 1);
  W = await world(); W.S.mode = 'down';
  await W.X.intakeImport('in-1', null);
  ck('Import while unreachable: nothing added, not marked seen, said once (no stacked notice)', !W.X.candidates.some((c) => c.intake_id === 'in-1') && W.S.seen.length === 0
    && W.alerts.length === 1 && /did not mark them as imported/.test(W.alerts[0]) && !W.D.els.safeAddWarn, W.alerts);

  // ── wcAddToRoster keeps its contract ──
  W = await world();
  let r = await W.X.wcAddToRoster({ id: 'w1', candidate_id: '2' });
  const g = W.X.caregivers.find((x) => String(x.candidate_id) === '2');
  ck('welcome call done: added (status added), the roster record has the database\'s caregiver number, linked to candidate 2', r.status === 'added' && g && g.id === 8 && W.S.data.caregivers.some((x) => x.id === 8 && x.candidate_id === 2), [r, g]);
  ck('welcome call done: the B&R record is removed after, as ONE remove based on its _rev', !W.X.candidates.some((c) => c.id === 2) && !W.S.data.candidates.some((c) => c.id === 2)
    && applies(W.S).at(-1).args.p_key === 'candidates' && JSON.stringify(applies(W.S).at(-1).args.p_changes) === JSON.stringify([{ op: 'remove', id: 2, base_rev: 0 }]), applies(W.S).at(-1));
  W = await world(); W.S.mode = 'down';
  r = await W.X.wcAddToRoster({ id: 'w1', candidate_id: '2' });
  ck('welcome call done, unreachable: save_failed, nothing on the roster, the candidate kept, no second notice (the caller says it)', r.status === 'save_failed'
    && W.X.caregivers.length === 1 && W.X.candidates.some((c) => c.id === 2) && !W.D.els.safeAddWarn, r);
  W = await world();
  const pending = { id: W.X.safeTmpId(), first: 'Still', last: 'Saving' }; W.X.candidates.push(pending);
  r = await W.X.wcAddToRoster({ id: 'w1', candidate_id: String(pending.id) });
  ck('welcome call done for someone whose number has not come back yet: refused, nothing linked to a temporary number', r.status === 'save_failed' && W.X.caregivers.length === 1, r);

  // ── office Promote ──
  W = await world(); W.S.mode = 'down';
  await W.X.promoteToCaregiver(2);
  ck('Promote, unreachable: the candidate is NOT removed (their checks live only there) and it is said', W.X.candidates.some((c) => c.id === 2) && W.alerts.some((a) => /was NOT promoted/.test(a)) && W.X.caregivers.length === 1, W.alerts);
  W = await world();
  await W.X.promoteToCaregiver(2);
  ck('Promote: roster record numbered by the database, then the candidate removed', W.S.data.caregivers.some((x) => x.id === 8 && x.candidate_id === 2) && !W.S.data.candidates.some((c) => c.id === 2));

  // ── nothing leaves the page with a temporary number ──
  W = await world();
  const tmpC = { id: W.X.safeTmpId(), first: 'T', last: 'Mp', r1n: 'Ref', r1_phone: '1', r1s: 'Pending' };
  const made = await W.X.createRefRequests(tmpC);
  ck('reference requests are never created for a temporary number', Array.isArray(made) && made.length === 0 && W.S.refInserts === 0);
  ck('Ask references and the welcome call invite refuse a temporary number (said, nothing sent)', /if \(safeIsTmp\(c\.id\)\) \{ alert\(c\.first \+ ' ' \+ c\.last \+ ' is still being saved\. Nothing was sent\./.test(src)
    && /if\(safeIsTmp\(c\.id\)\)\{ alert\(c\.first \+ ' is still being saved\. Nothing was sent\./.test(src));

  // ── index.html saved a caregiver: take the database copy unless this page has an unsaved change ──
  W = await world();
  ck('a caregiver saved by the Hub page itself is taken in here (copy updated, nothing re-sent)', W.X.safeSavesAdopt('caregivers', { ...P(7, { candidate_id: 1 }), skills: { a: 1 }, _rev: 1 }) === true
    && W.X.caregivers[0].skills.a === 1 && W.X.safeDiff('caregivers').changes.length === 0);
  W.X.caregivers[0].oig_date = 'unsaved';
  ck('...but never over an unsaved change on this page', W.X.safeSavesAdopt('caregivers', { ...P(7), _rev: 2 }) === false && W.X.caregivers[0].oig_date === 'unsaved');

  // ── static: every number is the database's; no whole-list save of people anywhere in the engine ──
  ck('no per-tab number counter is left (obId++ / cgId++ gone)', !/\bobId\+\+|\bcgId\+\+/.test(src) && !/let obId|let cgId/.test(src));
  ck('every place that makes a person uses a temporary number (7 places)', (src.match(/id: ?safeTmpId\(\)/g) || []).length === 7, (src.match(/id: ?safeTmpId\(\)/g) || []).length);
  ck('the engine never writes candidates/caregivers as a whole (only syncToSupabase writes app_data, and it refuses them first)', (src.match(/from\('app_data'\)\.(upsert|insert|update|delete)\(/g) || []).length === 1
    && /async function syncToSupabase\(key, data\)\{\n  \/\* 421[^\n]*\*\/\n  if\(SAFE_KEYS\.includes\(key\)\)/.test(src));
  ck('boot paths never call a save (bootHydrate, showApp)', !/save(Candidates|Caregivers)\(/.test(cut('async function bootHydrate(', 'async function retryHydrate(')) && !/save(Candidates|Caregivers)\(/.test(cut('async function showApp(', 'function hydrateBanner(')));

  // ── index.html caregiver writers ──
  ck('index.html: no caregiver is saved with upsert_app_data_item or persist() any more', !/persist\('caregivers'/.test(html) && !/target_key:\s*'caregivers'/.test(html));
  ck('index.html: skills, Spanish and the supervisory-visit date go through app_data_items_apply with the _rev the page read', (html.match(/await ccCaregiverPut\(/g) || []).length === 3
    && /sb\.rpc\('app_data_items_apply', \{ p_key:'caregivers',\s*p_changes:\[\{ op:'put', id:g\.id, base_rev:Number\(g\._rev\)\|\|0, record:g \}\] \}\)/.test(html));
  ck('index.html: the same conflict words as the engine', html.includes("'Someone else changed '+name+' since this page opened. We loaded the latest; please redo your last change.'"));
  ck('index.html: a failed supervisory mirror is said, never swallowed; it never matches a caregiver on two blank AxisCare ids', /The visit is saved, but its date did not reach the caregiver roster/.test(html) && /record\.axiscare_caregiver_id && g\.axiscare_id===record\.axiscare_caregiver_id/.test(html));
  ck('index.html: older queued changes to people are kept in the quarantine, never sent', /const peopleKey = entry\.key==='caregivers' \|\| entry\.key==='candidates';/.test(html));

  // ── no em dash in anything this change adds ──
  const BASE = process.env.BASE421 || 'b9a0fe5';
  let added = null;
  try { added = cp.execFileSync('git', ['diff', BASE, '--', 'caregivers-engine.js', 'index.html', 'tests'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')); } catch (_) {}
  if (added === null) console.log('(git history not available: the em dash check is skipped)');
  else ck('no em dash in any line this change adds', added.length > 0 && !added.some((l) => /[—―]/.test(l)), added.filter((l) => /[—―]/.test(l)).slice(0, 5));

  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();

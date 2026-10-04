/* node tests/whole-saves-test.js
   Safe saves step 2 (2026-10-04, Samantha "yes to all"). The real ccMergeSave (index.html: every Settings switch) and the
   real wholeSave / syncToSupabase (caregivers-engine.js: staff settings, orientation sessions, end-of-day reports, the
   EVV correction log), cut out and run against a fake database that does what app_data_save does (compare-and-save on
   the record's version). Proves: one field at a time for settings (someone else's changes kept), a page left open since
   the morning can't save its old copy of a list (it loads the latest and says so), a failed read saves nothing, nothing
   is ever written whole. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), eng = fs.readFileSync(path.join(ROOT, 'caregivers-engine.js'), 'utf8');
const cutFrom = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i + 1); if (i < 0 || j < 0) throw new Error('not found: ' + a); return src.slice(i, j); };
let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 700))); };
const clone = (x) => JSON.parse(JSON.stringify(x));
function fakeDb(rows, opt = {}) {
  const db = { rows: clone(rows), log: [] };
  db.sb = {
    from: () => { const b = { select() { return b; }, eq(k, v) { b.key = v; return b; },
      async maybeSingle() { if (opt.readFails) return { data: null, error: { message: 'network' } };
        const r = db.rows[b.key]; const out = { data: r ? { data: clone(r.data), version: r.version } : null, error: null };
        if (opt.afterRead) { const f = opt.afterRead; opt.afterRead = null; f(db); }
        return out; },
      upsert() { db.log.push('WHOLE'); return Promise.resolve({ error: null }); } }; return b; },
    async rpc(fn, a) { db.log.push(fn);
      if (fn !== 'app_data_save') return { error: { message: 'unexpected ' + fn } };
      const r = db.rows[a.p_key];
      if ((r ? r.version : 0) !== a.p_expected_version) return { data: { ok: false, reason: 'version', version: r ? r.version : null, data: r ? clone(r.data) : null }, error: null };
      db.rows[a.p_key] = { data: clone(a.p_data), version: (r ? r.version : 0) + 1 }; return { data: { ok: true, version: (r ? r.version : 0) + 1 }, error: null }; },
    auth: { getSession: async () => ({ data: { session: { user: {} } } }) },
  };
  return db;
}
(async () => {
  /* ── 1. Settings switches (index.html ccMergeSave) ── */
  const mergeSrc = cutFrom(html, 'async function ccMergeSave(', 'async function tkMerge(');
  const settingsCtx = (db) => { const ctx = { JSON, Number, Array, Object, sb: db.sb, DATA: {} }; vm.createContext(ctx); vm.runInContext(mergeSrc + '\nthis.__m = ccMergeSave;', ctx); return ctx; };
  const SW = { callin_reminders_live: true, cg_connect_live: true, coverage_alert_admins: ['a@x'], office_quiet_from: '20:00' };
  let db = fakeDb({ ops_settings: { data: SW, version: 5 } }), ctx = settingsCtx(db);
  let out = await ctx.__m('ops_settings', (m) => { m.late_watch_live = true; return ['late_watch_live']; });
  ck('a Settings switch: only that field changes, every other switch kept, saved on the version it read', !out.error && db.rows.ops_settings.data.late_watch_live === true && db.rows.ops_settings.data.cg_connect_live === true
     && db.rows.ops_settings.data.office_quiet_from === '20:00' && db.rows.ops_settings.version === 6 && !db.log.includes('WHOLE') && ctx.DATA.ops_settings.late_watch_live === true, [db.rows, db.log]);
  db = fakeDb({ ops_settings: { data: SW, version: 5 } }, { afterRead: (d) => { d.rows.ops_settings.data.callin_reminder_max = 3; d.rows.ops_settings.version++; } }); ctx = settingsCtx(db);
  out = await ctx.__m('ops_settings', (m) => { m.late_watch_live = true; return ['late_watch_live']; });
  ck('someone (or a server job) saves in the same second: read again, both changes kept', !out.error && db.rows.ops_settings.data.callin_reminder_max === 3 && db.rows.ops_settings.data.late_watch_live === true && db.log.filter((x) => x === 'app_data_save').length === 2, db.rows);
  db = fakeDb({ ops_settings: { data: SW, version: 5 } }, { readFails: true }); ctx = settingsCtx(db);
  out = await ctx.__m('ops_settings', (m) => { m.late_watch_live = true; return ['late_watch_live']; });
  ck('the read fails: NOTHING is saved (the old saves started from an empty record here, wiping every switch)', out.error && /could not read/.test(out.error.message) && !db.log.length && db.rows.ops_settings.data.cg_connect_live === true, [out, db.log]);
  ck('no Settings save in the page writes a whole record any more', !/from\('app_data'\)\.upsert/.test(html), (html.match(/from\('app_data'\)\.upsert/g) || []).length);

  /* ── 2. The four records the engine saves whole (caregivers-engine.js) ── */
  const wholeSrc = cutFrom(eng, '/* ── Safe saves step 2', 'async function loadFromSupabase(');
  const page = (db, loaded) => {
    const notices = [], status = [];
    const ctx = { console: { warn() {}, error() {}, log() {} }, JSON, Number, Array, Object, Set, Math, String, Event: class { constructor(t) { this.type = t; } },
      sb: db.sb, HYDRATED: true, SAFE_KEYS: ['candidates', 'caregivers'], setSyncStatus: (s) => status.push(s), safeNotice: (id, h) => notices.push([id, h]),
      safeEsc: (t) => String(t), localStorage: { setItem() {} }, window: { dispatchEvent() {} },
      orientSessions: [], orientId: 1, eodReports: [], appSettings: {} };
    vm.createContext(ctx);
    vm.runInContext('var orientSessions = this.orientSessions, orientId = 1, eodReports = [], appSettings = {};\n' + wholeSrc
      + '\nthis.__w = { syncToSupabase, wholeRemember, get orient(){ return orientSessions; }, set orient(v){ orientSessions = v; }, get settings(){ return appSettings; }, set settings(v){ appSettings = v; } };', ctx);
    for (const [k, r] of Object.entries(loaded)) ctx.__w.wholeRemember(k, r ? r.data : null, r ? r.version : 0);
    return { W: ctx.__w, notices, status };
  };
  const S1 = [{ id: 1, date: '2026-10-06', bookings: [{ first: 'Ava' }] }];
  db = fakeDb({ orient_sessions: { data: S1, version: 4 } });
  let P = page(db, { orient_sessions: db.rows.orient_sessions });
  const mine = clone(S1); mine[0].bookings[0].attend_status = 'attended';
  let ok = await P.W.syncToSupabase('orient_sessions', mine);
  ck('a list (orientation sessions): saved on the version this page loaded, never whole', ok === true && db.rows.orient_sessions.version === 5 && db.rows.orient_sessions.data[0].bookings[0].attend_status === 'attended' && !db.log.includes('WHOLE'), [db.rows, db.log]);
  const mine2 = clone(mine); mine2[0].bookings.push({ first: 'Ben' });
  ok = await P.W.syncToSupabase('orient_sessions', mine2);
  ck('...and the next save from the same page builds on its own save', ok === true && db.rows.orient_sessions.version === 6 && db.rows.orient_sessions.data[0].bookings.length === 2);
  /* a page left open since the morning */
  db = fakeDb({ orient_sessions: { data: S1, version: 4 } });
  const morning = page(db, { orient_sessions: db.rows.orient_sessions });
  const later = page(db, { orient_sessions: db.rows.orient_sessions });
  const today = clone(S1); today[0].bookings.push({ first: 'Cara', booked_at: 'today' });
  await later.W.syncToSupabase('orient_sessions', today);
  const stale = clone(S1); stale[0].date = '2026-10-07';
  ok = await morning.W.syncToSupabase('orient_sessions', stale);
  ck('a page left open since the morning can NOT save its old copy over today\'s booking', ok === false && db.rows.orient_sessions.data[0].bookings.length === 2 && db.rows.orient_sessions.data[0].date === '2026-10-06', db.rows.orient_sessions);
  ck('...it loads the latest and says so: redo your change', morning.W.orient.length === 1 && morning.W.orient[0].bookings.length === 2
     && /someone else changed the orientation sessions since this page loaded\. We loaded the latest; please redo your change\./.test((morning.notices[0] || [])[1]), morning.notices);
  ok = await morning.W.syncToSupabase('orient_sessions', (() => { const x = clone(morning.W.orient); x[0].date = '2026-10-07'; return x; })());
  ck('...and the redone change saves, keeping today\'s booking', ok === true && db.rows.orient_sessions.data[0].date === '2026-10-07' && db.rows.orient_sessions.data[0].bookings.length === 2, db.rows.orient_sessions);
  db = fakeDb({ eod_reports: { data: [{ id: 'r1' }], version: 2 }, evv_corrections: { data: [{ id: 'e1' }], version: 9 } });
  P = page(db, { eod_reports: db.rows.eod_reports, evv_corrections: db.rows.evv_corrections });
  db.rows.evv_corrections = { data: [{ id: 'e1' }, { id: 'e2' }], version: 10 };   /* the Hub saved one EVV entry (one at a time) */
  ok = await P.W.syncToSupabase('evv_corrections', [{ id: 'e1', note: 'x' }]);
  ck('the EVV log: an entry the Hub saved one at a time is never undone by an older copy of the whole log', ok === false && db.rows.evv_corrections.data.length === 2 && /EVV correction log/.test((P.notices[0] || [])[1]), db.rows.evv_corrections);
  ok = await P.W.syncToSupabase('eod_reports', [{ id: 'r1' }, { id: 'r2' }]);
  ck('end-of-day reports save on their own version', ok === true && db.rows.eod_reports.version === 3);
  /* staff settings: one field at a time */
  db = fakeDb({ settings: { data: { staff_users: ['a'], orient_config: { capacity: 6 }, webhook: 'w' }, version: 1 } });
  P = page(db, { settings: db.rows.settings });
  db.rows.settings = { data: { staff_users: ['a'], orient_config: { capacity: 6 }, webhook: 'w', alert_recipients: ['k'] }, version: 2 };   /* someone else added a field */
  const mySettings = { staff_users: ['a', 'b'], orient_config: { capacity: 6 } };   /* this page added a person and removed the webhook */
  ok = await P.W.syncToSupabase('settings', mySettings);
  const st = db.rows.settings.data;
  ck('staff settings: only what this page changed is applied; someone else\'s new field kept', ok === true && JSON.stringify(st.staff_users) === '["a","b"]' && !('webhook' in st) && JSON.stringify(st.alert_recipients) === '["k"]' && st.orient_config.capacity === 6, st);
  ck('...and the page now holds the merged settings', JSON.stringify(P.W.settings.alert_recipients) === '["k"]');
  db.log.length = 0; ok = await P.W.syncToSupabase('settings', clone(P.W.settings));
  ck('...nothing changed: nothing saved', ok === true && !db.log.length, db.log);
  /* refusals */
  db = fakeDb({}); P = page(db, {});
  ck('candidates and caregivers are refused here (one person at a time only)', (await P.W.syncToSupabase('caregivers', [])) === false && (await P.W.syncToSupabase('candidates', [])) === false && !db.log.length);
  ck('any other record is refused (nothing is saved whole from this page)', (await P.W.syncToSupabase('ops_items', [])) === false && !db.log.length);
  ck('a record this page never loaded is refused', (await P.W.syncToSupabase('orient_sessions', [])) === false && !db.log.length);
  ck('the engine has no direct whole write left', !/from\('app_data'\)\.(upsert|insert|update|delete)\(/.test(eng));
  let added = []; try { added = require('child_process').execFileSync('git', ['diff', 'origin/main', '--', 'caregivers-engine.js', 'index.html'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')); } catch (_) {}
  ck('no em dash in any line this change adds', !added.some((l) => /\u2014/.test(l)), added.filter((l) => /\u2014/.test(l)));
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();

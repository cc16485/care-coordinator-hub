/* node tests/caregiver-profile-gate-test.js
   Part 2, slice 2c: the profile panel's lookup (CGP2.gateLoad / gateFor / gateForAx / gateOverride) against a fake
   signed-in client. Proves: one profiles query for everybody, the panel's own order (AxisCare id, then the candidate id
   carried over at promotion, never a name), withdrawn and unpublished do not count, current caregivers are never
   blocked, a failed lookup never blocks and is said, and a go-ahead takes a typed reason that is saved. */
require('../eligibility-rules.js');
const calls = [], inserts = [];
let failProfiles = false, failInsert = false;
const DB = {
  caregiver_profiles: [
    { id: 'p1', axiscare_id: '501', candidate_id: null, published: true, status: 'approved', updated_at: '2026-10-02' },
    { id: 'p2', axiscare_id: null, candidate_id: '77', published: true, status: 'approved', updated_at: '2026-10-02' },
    { id: 'p3', axiscare_id: '503', candidate_id: null, published: false, status: 'new', updated_at: '2026-10-02' },
    { id: 'p4', axiscare_id: null, candidate_id: null, first_name: 'Nina', last_name: 'Name', published: true, status: 'approved', updated_at: '2026-10-02' },
  ],
  welcome_calls: [{ candidate_id: '88', status: 'done' }, { candidate_id: '99', status: 'cancelled' }],
};
function q(table) {
  const st = { table, filters: [] };
  const api = {
    select() { return api; }, neq(k, v) { st.filters.push(r => r[k] !== v); return api; }, order() { return api; },
    insert(row) { inserts.push(row); return Promise.resolve(failInsert ? { error: { message: 'insert refused' } } : { error: null }); },
    then(res, rej) {
      calls.push(table);
      if (table === 'caregiver_profiles' && failProfiles) return Promise.resolve({ error: { message: 'network down' } }).then(res, rej);
      const rows = (DB[table] || []).filter(r => st.filters.every(f => f(r)));
      return Promise.resolve({ data: rows, error: null }).then(res, rej);
    },
  };
  return api;
}
globalThis.sb = { from: q, auth: { getSession: async () => ({ data: { session: { user: { email: 'angiel@mo-care.com' } } } }) } };
globalThis.document = { getElementById: () => null, head: { appendChild() {} }, body: { contains: () => true } };
globalThis.CustomEvent = class { constructor(t) { this.type = t; } };
let events = 0; globalThis.dispatchEvent = () => { events++; };
let answers = []; globalThis.prompt = () => answers.shift(); globalThis.alert = () => {}; globalThis.confirm = () => answers.shift();
require('../caregiver-profile-panel.js');
const C = globalThis.CGP2;
let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x))); };
const roster = [
  { id: 1, first: 'Ann', last: 'Ax', axiscare_id: '501', hire_date: '2026-10-05' },                    // new, profile by AxisCare id
  { id: 2, first: 'Ben', last: 'Cand', axiscare_id: '502', candidate_id: 77, hire_date: '2026-10-06' }, // new, profile by candidate id
  { id: 3, first: 'Cat', last: 'Draft', axiscare_id: '503', hire_date: '2026-10-07' },                 // new, unpublished draft
  { id: 4, first: 'Nina', last: 'Name', axiscare_id: '504', hire_date: '2026-10-08' },                 // new, only a NAME match
  { id: 5, first: 'Dee', last: 'Wc', axiscare_id: '505', candidate_id: 88, hire_date: '2026-09-15' },  // welcome call → new hire
  { id: 6, first: 'Old', last: 'Timer', axiscare_id: '506', hire_date: '2022-03-01' },                 // current caregiver
  { id: 7, first: 'Eve', last: 'Cancelled', axiscare_id: '507', candidate_id: 99, hire_date: '2026-09-15' }, // cancelled call only
];
(async () => {
  const before = C.gateFor(roster[2]);
  ck('before the lookup answers, nobody is blocked', !before.blocked && !before.checked, before);
  await C.gateLoad(roster);
  ck('ONE profiles query (plus the welcome calls) for everybody', calls.filter(t => t === 'caregiver_profiles').length === 1 && calls.length === 2, calls);
  ck('a finished load tells the lists to redraw', events === 1);
  const g = i => C.gateFor(roster[i]);
  ck('new hire with a published profile by AxisCare id: clear', g(0).published && !g(0).blocked);
  ck('new hire with a published profile by candidate id: clear', g(1).published && !g(1).blocked);
  ck('new hire with only an unpublished draft: Profile needed', g(2).blocked && /^Profile needed before first shift/.test(g(2).why));
  ck('a name match never counts (the office links it in the panel)', g(3).blocked);
  ck('welcome call makes them a new hire', g(4).new_hire && g(4).blocked);
  ck('current caregiver with no profile: never blocked', !g(5).new_hire && !g(5).blocked);
  ck('a cancelled welcome call alone does not make a new hire', !g(6).new_hire && !g(6).blocked);
  const ax = C.gateForAx('503', '');
  ck('found by AxisCare id from the list', ax && ax.g.id === 3 && ax.blocked);
  const nm = C.gateForAx('', 'cat draft');
  ck('found by a unique exact name when the list has no id', nm && nm.g.id === 3);
  ck('nobody on the roster: not judged', C.gateForAx('999', 'Zed Unknown') === null);
  const html = C.gateHtml(roster[2]);
  ck('the flag says it and offers the profile', /Profile needed before first shift/.test(html) && /Open their profile/.test(html));
  ck('no flag for a current caregiver', C.gateHtml(roster[5]) === '');
  answers = [null];
  ck('go-ahead: Cancel stops', (await C.gateOverride([{ name: 'Cat Draft', axiscare_id: '503' }], 'send this text')) === false && !inserts.length);
  answers = ['   '];
  ck('go-ahead: an empty reason stops', (await C.gateOverride([{ name: 'Cat Draft' }], 'send this text')) === false && !inserts.length);
  answers = ['Emergency: nobody else for tonight'];
  const okGo = await C.gateOverride([{ name: 'Cat Draft', axiscare_id: '503', id: 3 }], 'send this text');
  const ins = inserts[0] || {};
  ck('go-ahead: a typed reason is saved with who and when', okGo && ins.verb === 'profile_gate_override' && ins.actor_email === 'angiel@mo-care.com'
     && ins.data.reason === 'Emergency: nobody else for tonight' && !!ins.data.at && ins.data.caregivers[0].axiscare_id === '503', ins);
  ck('nobody blocked: no question asked', (await C.gateOverride([], 'x')) === true);
  failInsert = true; answers = ['reason', false];
  ck('reason could not be saved: asked again, Cancel stops', (await C.gateOverride([{ name: 'Cat Draft' }], 'x')) === false);
  failProfiles = true;
  await C.gateLoad(null, true);
  const after = C.gateFor(roster[2]);
  ck('a failed reload keeps the last good answer and reports the error', after.blocked && after.err === 'network down');
  // fresh module state: failure on the very first load
  delete require.cache[require.resolve('../caregiver-profile-panel.js')]; require('../caregiver-profile-panel.js');
  await globalThis.CGP2.gateLoad(roster);
  const f = globalThis.CGP2.gateFor(roster[2]);
  ck('first lookup failed: not blocked, and it says it could not check', !f.blocked && f.new_hire && f.err === 'network down', f);
  ck('the error is shown with the button', /Could not check their caregiver profile/.test(globalThis.CGP2.gateHtml(roster[2], f)));
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();

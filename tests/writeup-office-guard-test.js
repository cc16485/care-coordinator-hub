// Office staff write-ups (Samantha 2026-11-17, "Yes, do both"): the Hub refuses to put a write-up about someone who works
// in the office into the shared list, which the Care Coordinators read. node tests/writeup-office-guard-test.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'caregivers-engine.js'), 'utf8');
const res = []; const ck = (n, c, d) => res.push([n, !!c, c ? '' : JSON.stringify(d === undefined ? '' : d).slice(0, 300)]);
const from = SRC.indexOf('const OFFICE_ROLES='), to = SRC.indexOf('async function attPersist(');
ck('the guard is in the engine, just above the save helper', from > -1 && to > from);
const alerts = [], saved = [];
const ctx = { alert: (m) => alerts.push(m), OPS_PEOPLE: [
    { full_name: 'Angiel Falig', primary_email: 'angiel@example.test' }, { full_name: 'Krystal Land', primary_email: 'krystal@example.test' },
    { full_name: 'Pat Caregiver', primary_email: 'pat@example.test' }, { full_name: 'Owen Owner', primary_email: 'owen@example.test' }],
  CC_ROLE_BY_EMAIL: { 'angiel@example.test': ['care_coordinator'], 'krystal@example.test': ['care_coordinator', 'springfield_lead'], 'owen@example.test': ['owner_admin'] },
  sb: { rpc: async (fn, a) => { saved.push(a); return { error: null }; } } };
vm.createContext(ctx);
vm.runInContext(SRC.slice(from, SRC.indexOf('\n}\n', SRC.indexOf('async function attPersist(')) + 2), ctx);
(async () => {
  ck('a Care Coordinator is office staff', ctx.wuOfficeName('Angiel Falig') === 'Angiel Falig');
  ck('...matched however the name is typed', ctx.wuOfficeName('  angiel   FALIG ') === 'Angiel Falig');
  ck('an owner is office staff', ctx.wuOfficeName('Owen Owner') === 'Owen Owner');
  ck('a caregiver with no office role is not', ctx.wuOfficeName('Pat Caregiver') === '');
  ck('someone unknown is not', ctx.wuOfficeName('Someone New') === '' && ctx.wuOfficeName('') === '');
  let threw = false; try { await ctx.attPersist('discipline_actions', { id: 'x', caregiver: 'Krystal Land' }); } catch (e) { threw = true; }
  ck('saving a write-up about office staff is refused, nothing saved, and the person is told why', threw && !saved.length && /works in the office/.test(alerts[0] || '') && /Tell Samantha/.test(alerts[0] || ''), alerts);
  await ctx.attPersist('discipline_actions', { id: 'y', caregiver: 'Pat Caregiver' });
  ck('a write-up about a caregiver saves', saved.length === 1 && saved[0].item.id === 'y');
  await ctx.attPersist('attendance_events', { id: 'z', caregiver: 'Krystal Land' });
  ck('other lists (attendance) are not touched by the guard', saved.length === 2);
  ck('no em dashes in the words', !alerts.some((m) => /—/.test(m)));
  let f = 0; for (const [n, ok, d] of res) { console.log((ok ? 'PASS' : 'FAIL') + ' · ' + n + (ok ? '' : '  ' + d)); if (!ok) f++; }
  console.log((res.length - f) + '/' + res.length); process.exit(f ? 1 : 0);
})();

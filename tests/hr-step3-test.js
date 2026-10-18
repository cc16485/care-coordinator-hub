// HR Agent step 3 (2026-10-18): the HR page, its menu by role, deadlines, and the Performance order.
// node tests/hr-step3-test.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const H = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const SRC = fs.readFileSync(path.join(ROOT, 'hr.js'), 'utf8');
const res = []; const ck = (n, c, d) => res.push([n, !!c, c ? '' : String(d === undefined ? '' : d).slice(0, 300)]);

function load(isOwner) {
  const store = {};
  const ctx = { window: {}, document: { getElementById: () => null }, localStorage: { getItem: (k) => store[k] || null, setItem: (k, v) => { store[k] = v; } },
    ccCan: (p) => isOwner && p === 'approve_discipline', console };
  ctx.window = ctx; vm.createContext(ctx); vm.runInContext(SRC, ctx); return ctx.HR;
}
const O = load(true), C = load(false);
ck('owners see every HR page', JSON.stringify(O._views()) === JSON.stringify(['home', 'formal', 'oversight', 'coaching', 'attendance', 'terminations', 'handbook', 'role']), O._views());
ck('coordinators see Coaching, Attendance, Handbook and Zach\'s role only', JSON.stringify(C._views()) === JSON.stringify(['coaching', 'attendance', 'handbook', 'role']), C._views());

// business days skip weekends: Fri + 1 = Mon
const fri = '2026-10-16T15:00:00', mon = O._addBusinessDays(fri, 1);
ck('a business day after Friday is Monday', mon.getDay() === 1, mon);
ck('3 business days after Friday is Wednesday', O._addBusinessDays(fri, 3).getDay() === 3);
const dl = O._deadlines([
  { id: 'a', caregiver: 'Pat', level: 'Verbal Warning', status: 'draft', created_at: '2026-10-16T15:00:00' },
  { id: 'b', caregiver: 'Lee', level: 'Written Warning', status: 'approved', created_at: '2026-10-01T15:00:00', approved_at: '2026-10-14T15:00:00' },
  { id: 'c', caregiver: 'Kim', level: 'Verbal Warning', status: 'issued', issued_at: '2026-09-20T15:00:00' },
  { id: 'd', caregiver: 'Done', level: 'Verbal Warning', status: 'issued', issued_at: '2026-09-20T15:00:00', followup_at: '2026-10-19' }]);
ck('deadlines: decide, meet and follow-up, sorted by date; a followed-up one is gone', dl.map((x) => x.id).sort().join(',') === 'a,b,c' && dl.every((x, i) => !i || dl[i - 1].due <= x.due), dl.map((x) => x.id + ':' + x.due.toISOString().slice(0, 10)));
ck('...a draft is due 3 business days after it was made', dl.find((x) => x.id === 'a').due.toISOString().slice(0, 10) === '2026-10-21');
ck('...an approved one is due 5 business days after approval', dl.find((x) => x.id === 'b').due.toISOString().slice(0, 10) === '2026-10-21');
ck('...an issued one gets a 30-day follow-up', dl.find((x) => x.id === 'c').due.toISOString().slice(0, 10) === '2026-10-20');

// wiring in index.html
ck('HR is its own section, and Caregivers no longer holds Attendance or Write-Ups', /cgdir:\['cgdir','supervisory'\],hr:\['hr'\]/.test(H));
ck('the Caregivers bar has no Attendance or Write-Ups pill', !/data-tab="cgattendance" onclick/.test(H) && !/data-tab="cgwriteups" onclick/.test(H));
ck('the HR tab panel exists', /<section class="tabpanel" id="tab-hr"><div id="hrRoot"><\/div><\/section>/.test(H));
ck('opening HR loads hr.js', /sc\.src='hr\.js\?v=\d+[a-z]?'/.test(H));
ck('#hr/<page> deep links work', /if\(head==='hr'\)\{ window\.HR_WANT=/.test(H));
ck('the Write-Ups and Attendance panels still exist (hr.js moves them)', /id="tab-cgwriteups"/.test(H) && /id="tab-cgattendance"/.test(H));
const perf = H.slice(H.indexOf("'<div id=\"cgdSec-performance\""), H.indexOf("'<div id=\"cgdSec-performance\"") + 300);
ck('Performance starts with recognition', perf.indexOf('cgdKind') > -1 && perf.indexOf('cgdKind') < perf.indexOf('cgdPerformanceHtml'), perf);
ck('Performance has a Coaching card for everyone', /card\('Coaching',/.test(H));
ck('the compliments card is called Recognition', /cgdSectionCard\('Recognition /.test(H));
ck('no em dashes in hr.js', !/\u2014/.test(SRC));

let f = 0; for (const [n, ok, d] of res) { console.log((ok ? 'PASS' : 'FAIL') + ' · ' + n + (ok ? '' : '  ' + d)); if (!ok) f++; }
console.log((res.length - f) + '/' + res.length); process.exit(f ? 1 : 0);

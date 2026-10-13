// Driver Compliance in the Hub's scheduling screens (2026-10-13). Her rule: Non-Driver, Pending Verification, Suspended (and no
// driver record yet) are never eligible for a shift that needs transporting a client; only Approved Drivers with a current
// license and insurance. The Team Builder (a plan that needs transportation), the new-hire card, and the page wiring.
// The rule itself is tests/match-rules-test.js (and the Staffing repo's driver_scheduling_test.mjs holds the server copy to it).
// node tests/driver-scheduling-test.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const HUB = path.join(__dirname, '..');
const res = []; const ck = (n, c, d) => res.push([n, !!c, c ? '' : JSON.stringify(d === undefined ? '' : d).slice(0, 700)]);
const APPROVED = { dl_status: 'Approved Driver', cleared_to_drive: true, dl_expires: '2099-01-01', auto_ins_expires: '2099-01-01' };

/* a page with just enough of the Hub for team-builder-2.js and new-hires.js */
const toasts = [], saved = [];
const ctx = { console, Intl, Date, Math, JSON, String, Number, Array, Object, Set, Map, RegExp, Promise, setTimeout };
ctx.window = ctx; ctx.globalThis = ctx;
ctx.escapeHtmlComms = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
ctx.ccToast = (m) => toasts.push(m);
ctx.DATA = { caregivers: [{ axiscare_id: '31', first: 'Rae', last: 'Roster', ...APPROVED }], caregiver_overlay: [{ axiscare_id: '12', skills: { transportation: { have: 'yes', evidence: 'attested' } } }] };
let PLAN = { id: 'tb1', needs: ['transportation'], cells: {}, options: {} };
ctx.tbPlan = () => PLAN; ctx.tbSave = async (p) => { saved.push(JSON.parse(JSON.stringify(p))); }; ctx.tbRender = () => {};
ctx.TB = { pool: [
  { name: 'Ann Approved', axiscare_id: '11', ...APPROVED },
  { name: 'Bo Pending', axiscare_id: '12', dl_status: 'Pending Verification', cleared_to_drive: false },
  { name: 'Nell Nondriver', axiscare_id: '13', dl_status: 'Non-Driver', cleared_to_drive: false, new_hire: { days: 5, hired: '2026-10-08', scheduled_14d: 0 } },
  { name: 'Sue Suspended', axiscare_id: '14', dl_status: 'Suspended', cleared_to_drive: false },
  { name: 'Oz Norecord', axiscare_id: '15', dl_status: null, cleared_to_drive: null },
  { name: 'Rae Roster', axiscare_id: '31' }] };   // an older pool row without the fields: the roster's are read
vm.createContext(ctx);
for (const f of ['match-rules.js', 'team-builder-2.js', 'new-hires.js']) vm.runInContext(fs.readFileSync(path.join(HUB, f), 'utf8'), ctx, { filename: f });
const P = (n) => ctx.TB.pool.find((p) => p.name === n);

/* the Team Builder */
ck('the plan\'s needs include Transportation', /data-need="transportation"/.test(ctx.tb2NeedsHtml(PLAN)));
ck('a plan that needs transportation: the Approved Driver is available', ctx.tb2DriveBlock(PLAN, P('Ann Approved')) === null && /✓ Approved Driver/.test(ctx.tb2SkillFlags(PLAN, P('Ann Approved'))));
ck('...Pending Verification shown as not available, with the why (the self-reported yes on the skills record does not count)', ctx.tb2DriveBlock(PLAN, P('Bo Pending')) === 'This client needs transportation: Not an Approved Driver (Pending Verification)'
  && /Not available: needs transportation; Not an Approved Driver \(Pending Verification\)/.test(ctx.tb2SkillFlags(PLAN, P('Bo Pending'))), ctx.tb2SkillFlags(PLAN, P('Bo Pending')));
ck('...Non-Driver, Suspended and no driver record yet: not available', /Non-Driver/.test(ctx.tb2DriveBlock(PLAN, P('Nell Nondriver'))) && /Driving suspended/.test(ctx.tb2DriveBlock(PLAN, P('Sue Suspended'))) && /No driver record yet/.test(ctx.tb2DriveBlock(PLAN, P('Oz Norecord'))));
ck('...a pool row from before the server change falls back to the roster\'s driver fields', ctx.tb2DriveBlock(PLAN, P('Rae Roster')) === null);
ck('...the skill rank puts not-available people with the other "a need they don\'t have" (2), never hides them', ctx.tb2SkillRank(PLAN, P('Bo Pending')) === 2 && ctx.tb2SkillRank(PLAN, P('Ann Approved')) === 0);
(async () => {
  await ctx.tb2AddPool('mon|s1', ctx.TB.pool.indexOf(P('Bo Pending')));
  ck('...and can\'t be added: the plan is not saved, the toast says why', !saved.length && /Bo Pending is not available for this plan\. This client needs transportation: Not an Approved Driver \(Pending Verification\)\./.test(toasts.at(-1)), toasts);
  await ctx.tb2AddPool('mon|s1', ctx.TB.pool.indexOf(P('Ann Approved')));
  ck('...the Approved Driver is penciled in as before', saved.length === 1 && saved[0].cells['mon|s1'].name === 'Ann Approved', saved);
  PLAN = { id: 'tb2', needs: ['hoyer_lift'], cells: {}, options: {} }; saved.length = 0;
  ck('a plan without transportation: driving changes nothing (no block, no driving flag)', ctx.tb2DriveBlock(PLAN, P('Bo Pending')) === null && !/Approved Driver|transportation/.test(ctx.tb2SkillFlags(PLAN, P('Bo Pending'))));
  await ctx.tb2AddPool('mon|s1', ctx.TB.pool.indexOf(P('Bo Pending')));
  ck('...and the Non-Driver or Pending person can be penciled in', saved.length === 1 && saved[0].cells['mon|s1'].name === 'Bo Pending', saved);

  /* the new-hire card */
  ck('new-hire card: a new hire not cleared to drive says so, with the why', /Not cleared to drive clients: Not an Approved Driver \(Non-Driver\)\. Not for shifts that need transportation\./.test(ctx.NH.driveLine(P('Nell Nondriver'))), ctx.NH.driveLine(P('Nell Nondriver')));
  ck('new-hire card: nothing for an Approved Driver', ctx.NH.driveLine(P('Ann Approved')) === '');

  /* the page */
  const html = fs.readFileSync(path.join(HUB, 'index.html'), 'utf8');
  ck('the page loads match-rules.js before the Team Builder, the new-hire card and the Staffing sheet', html.indexOf('src="match-rules.js') > 0 && html.indexOf('src="match-rules.js') < html.indexOf('src="team-builder-2.js') && html.indexOf('src="match-rules.js') < html.indexOf('src="staffing-rules.js'));
  ck('the pencil-in list swaps the button for "Not available" (disabled, the why on hover) when tb2DriveBlock says so', /var drvNo=\(typeof tb2DriveBlock==='function'\)\?tb2DriveBlock\(plan,x\.cg\):null/.test(html) && /drvNo\?'<button class="cara-btn ghost" style="font-size:11\.5px;" disabled title="'\+esc\(drvNo\)\+'">Not available<\/button>'/.test(html));
  ck('the Staffing sheet\'s filter is named for what it checks', /\['transportation','Approved Driver \(transportation\)'\]/.test(fs.readFileSync(path.join(HUB, 'staffing-sheet.js'), 'utf8')));
  ck('no em dash in the new words', ['team-builder-2.js', 'new-hires.js'].every((f) => !/\u2014/.test(fs.readFileSync(path.join(HUB, f), 'utf8').split('\n').filter((l) => /driv|Driver|transport/i.test(l)).join('\n'))));
  let pass = 0; for (const [n, okk, d] of res) { console.log((okk ? 'PASS  ' : 'FAIL  ') + n + (okk ? '' : '  ' + d)); if (okk) pass++; }
  console.log(`\n${pass} passed, ${res.length - pass} failed`); process.exit(pass === res.length ? 0 : 1);
})();

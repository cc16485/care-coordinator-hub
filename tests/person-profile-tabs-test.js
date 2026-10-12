/* One profile, step 2 (2026-10-12): the top card's next step, which tabs a person has, the caregiver page's tab mapping,
   and the Whole profile never drawing one person into another's page. FAKE people only; nothing leaves this file. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const IDX = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const HPJS = fs.readFileSync(path.join(ROOT, 'hire-profile.js'), 'utf8');
const cut = (src, a, b) => { const i = src.indexOf(a); const j = src.indexOf(b, i + 1); if (i < 0 || j < 0) throw new Error('cannot find ' + a); return src.slice(i, j); };
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ', m); } else { fail++; console.log('FAIL ', m); } };

/* the applicant page's pure pieces */
const ctx = { escapeHtmlComms: s => String(s == null ? '' : s), Date, JSON, String };
vm.createContext(ctx);
vm.runInContext(cut(IDX, 'const PP_TABS = [', 'function apTab(k){').replace(/^const /gm, 'var ').replace(/^let /gm, 'var '), ctx);
const next = (r, b) => ctx.apNextStep(Object.assign({ id: 'x' }, r), b);
ok(next({}, null)[1] === 'No interview booked yet' && /apBookFor/.test(next({}, null)[3]), 'new applicant: book a time');
ok(next({}, { status: 'booked', starts_at: new Date(Date.now() + 864e5).toISOString() })[1] === 'Interview booked', 'booked ahead: shows the time, Move');
ok(/apInterview/.test(next({}, { status: 'booked', starts_at: new Date(Date.now() - 864e5).toISOString() })[3]), 'interview time passed: record how it went');
ok(next({ status: 'hired', hired_at: '2026-10-08' }, null)[1] === 'Getting them started', 'offered: getting them started, opens Hiring');
ok(next({ status: 'declined', decline_reason: 'No transport' }, null)[2] === 'No reason was recorded.' ? false : /No transport/.test(next({ status: 'declined', decline_reason: 'No transport' }, null)[2]), 'not moving forward: the reason is on the top card');
ok(next({ status: 'pool' }, null)[1] === 'In the candidate pool', 'pool: says so, Out of the pool');
ok(next({ status: 'hired', started_at: '2026-10-10' }, null)[1] === 'Working', 'started: working');
ok(ctx.apStageNow({}, null) === 0 && ctx.apStageNow({ post_interview: {} }, null) === 1 && ctx.apStageNow({ status: 'hired' }, null) === 2 && ctx.apStageNow({ started_at: 'x' }, null) === 3, 'the stage strip follows them along');
ok(!/Getting started/.test(ctx.ppStagesHtml(1)) && /pp-now">Interview/.test(ctx.ppStagesHtml(1)), 'stage strip marks where they are now');
const bar = ctx.ppTabBarHtml(['overview', 'messages', 'history'], 'messages', 'apTab');
ok((bar.match(/class="subtab[ "]/g) || []).length === 3 && /active" role="tab" aria-selected="true" id="apTabBtn-messages"/.test(bar), 'tab bar shows only the tabs they have, in the set order');
ok(ctx.PP_TABS.map(t => t[1]).join(' | ') === 'Overview | Application & interview | Hiring | Training & checks | Family profile | Work | Performance | Messages | History', 'her approved tab names and order');

/* which tabs an applicant has, read from the renderer itself */
const render = cut(IDX, 'function apRenderProfile(){', '/* ---- The half of somebody');
ok(/AP_TABS_HAVE = \['overview','interview'\]\.concat\(offered \? \['hiring','checks'\] : \[\]\)/.test(render), 'applicant: 4 tabs, hiring + checks once offered');
ok(/started_at \|\| r\.left_at \|\| r\.status==='left'\) \? \['performance'\]/.test(render), 'performance once they started');
for (const box of ["'What they told us'", "'The screen'", "'Where they have worked'", "'The interview'", "'The offer'", "'Getting them started'", "'Training'", "'Since they started'", "'Texts & emails'", "'How it ended'", 'apNoshowPanel(r)', 'apDecisionPanel(r)', 'apReviewBox', 'apPrnHtml(r)'])
  ok(render.includes(box), 'nothing lost from the old page: ' + box);
for (const act of ['apBookFor', 'apCancelBooking', 'apInterview', 'apToOffer', 'apToPool', 'apFromPool', 'apDecline', 'apOffboard', 'apCgLink', 'ApText.btn'])
  ok(cut(IDX, 'function apNextStep(r, b){', 'function apTab(k){').includes(act) || render.includes(act), 'every action still reachable: ' + act);

/* the caregiver page: tabs hold the old sections; an old section name opens its tab */
const c2 = { document: { getElementById: () => null }, CGD: {}, window: {}, cgdHistoryMount(){ c2.hist = true; }, String };
vm.createContext(c2);
vm.runInContext(cut(IDX, 'const CGD_SECTIONS=[', '/* History: every send').replace(/^const /gm, 'var ').replace(/^let /gm, 'var '), c2);
const tabOf = n => { c2.cgdSection(n); return c2.CGD.section; };
ok(tabOf('profile') === 'family' && tabOf('apphalf') === 'interview' && tabOf('compliance') === 'checks' && tabOf('skills') === 'work' && tabOf('conversations') === 'messages', 'old section names open the tab that holds them');
ok(tabOf('nonsense') === 'overview', 'an unknown tab falls back to Overview');
c2.hist = false; tabOf('history'); ok(c2.hist === true, 'History reads the timeline when opened');
ok(/cgdSection\(tab\|\|keepTab\|\|'overview'\)/.test(IDX), 'caregiver page opens on the asked-for tab, and a refresh keeps your tab');

/* the Whole profile's pieces never draw one person's records into another person's page */
ok(/if\(m\.ks === JSON\.stringify\(KEY\)\) m\.el\.innerHTML/.test(HPJS), 'mounted pieces only redraw for their own person');
ok(/mount,/.test(cut(HPJS, 'window.HP = {', '};')), 'HP.mount is exported');
ok(/hire-profile\.js\?v=2/.test(IDX), 'the browser is told to fetch the new hire-profile.js');
ok(!/—/.test(cut(IDX, 'const PP_TABS = [', '/* ---- The half of somebody')), 'no em dashes in the new page code');

console.log(`person-profile-tabs: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

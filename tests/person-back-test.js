/* One profile, step 2 piece 3 (2026-10-12): Back goes where you came from, and "Profile" opens the person's own page.
   FAKE people; nothing leaves this file. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const IDX = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const HPJS = fs.readFileSync(path.join(ROOT, 'hire-profile.js'), 'utf8');
const ENG = fs.readFileSync(path.join(ROOT, 'caregivers-engine.js'), 'utf8');
const cut = (src, a, b) => { const i = src.indexOf(a); const j = src.indexOf(b, i + 1); if (i < 0 || j < 0) throw new Error('cannot find ' + a); return src.slice(i, j); };
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ', m); } else { fail++; console.log('FAIL ', m); } };

/* the Back helpers, with a fake page */
function page(){
  const els = { applicantProfileView: { style: { display: 'none' } }, cgdFull: { style: { display: 'none' } } };
  const pills = { interviews: 'Interviews', teambuilder: 'Team Builder' };
  const x = { calls: [], activeTab: 'interviews', AP_PROF: {}, CC_SECTION_TITLES: { leadsstarts: 'Leads &amp; Starts' },
    document: { getElementById: id => els[id], querySelector: sel => { const m = sel.match(/data-tab="([^"]+)"/); return m && pills[m[1]] ? { childNodes: [{ nodeType: 3, textContent: ' ' + pills[m[1]] }, { nodeType: 1, textContent: '3' }] } : null; } },
    window: { scrollY: 420, scrollTo: (a, y) => x.calls.push(['scroll', y]) }, Date, String, setTimeout: f => f(),
    switchTab: t => { x.calls.push(['tab', t]); x.activeTab = t; }, apCloseProfile: () => x.calls.push(['apClose']), cgdBackToList: () => x.calls.push(['cgList']) };
  vm.createContext(x);
  vm.runInContext(cut(IDX, 'let PP_BACK = null;', 'window.ppGoBack = ppGoBack;').replace('let PP_BACK', 'var PP_BACK'), x);
  return { x, els };
}
let { x, els } = page();
x.ppRemember(); ok(x.PP_BACK.tab === 'interviews' && x.PP_BACK.y === 420, 'remembers the tab and where you were on it');
ok(x.ppBackText('Applicants') === '← Back to Interviews', 'Back says where it goes (badge numbers left out)');
x.activeTab = 'applicants'; x.ppRemember(true); ok(x.PP_BACK.tab === 'interviews', 'the page opening right after keeps the opener\'s place');
els.applicantProfileView.style.display = 'block'; x.PP_BACK = null; x.ppRemember(); ok(x.PP_BACK === null, 'moving from one person page to another keeps the first place');
els.applicantProfileView.style.display = 'none';
x.PP_BACK = { tab: 'interviews', y: 420, at: Date.now() }; x.calls = []; x.ppGoBack('ap');
ok(JSON.stringify(x.calls) === '[["tab","interviews"],["scroll",420]]' && x.PP_BACK === null, 'Back from an applicant goes to Interviews, at the same spot');
x.PP_BACK = { tab: 'applicants', y: 0, at: Date.now() }; x.calls = []; x.ppGoBack('ap'); ok(x.calls[0][0] === 'apClose', 'opened from Applicants: back to the list');
x.PP_BACK = { tab: 'cgdir', y: 0, at: Date.now() }; x.calls = []; x.ppGoBack('cg'); ok(x.calls[0][0] === 'cgList', 'opened from Caregivers: back to the list');
x.PP_BACK = null; x.calls = []; x.ppGoBack('cg'); ok(x.calls[0][0] === 'cgList', 'nothing remembered: the page\'s own list');
ok(x.ppTabLabel('cgdir') === 'Caregivers' && x.ppTabLabel('leadsstarts') === 'Leads & Starts', 'labels read cleanly');
for (const [fn, kind] of [['function btOpenApplicant(id, tab){\n  ppRemember();', 'hard'], ['async function openCaregiverProfile(ref, tab){\n  ppRemember(true);', 'soft'], ['  const r = AP_ROWS.find(x=>String(x.id)===String(id)); if(!r) return;\n  ppRemember(true);', 'soft'], ["  if(!full||!list) return;\n  ppRemember(true);", 'soft']])
  ok(IDX.includes(fn), 'opener remembers (' + kind + '): ' + fn.split('\n')[0].slice(0, 45));
ok(/onclick="ppGoBack\('ap'\)"/.test(IDX) && /onclick="ppGoBack\(\\'cg\\'\)"/.test(IDX), 'both Back buttons use it');

/* HP.open: the person's page first, the panel only when there is no page */
const hp = (got) => { const calls = []; const c = { calls, document: { getElementById: () => null, addEventListener(){} }, setInterval(){}, sb: { functions: { invoke: async () => ({ data: got || { ids: {} } }) } },
    btOpenApplicant: (id, t) => calls.push(['ap', id, t]), openPerson: (kk, a, b) => calls.push(['person', JSON.stringify(kk), a, b]), window: {}, JSON, String, Object, Promise, Error, MutationObserver: function(){ return { observe(){} }; } };
  c.window = c; vm.createContext(c); vm.runInContext(HPJS, c); c.HP.panel = async kk => calls.push(['panel', JSON.stringify(kk)]);
  return c; };
(async () => {
  let c = hp(); await c.HP.open({ applicant_id: 'a1' }); ok(JSON.stringify(c.calls) === '[["ap","a1","hiring"]]', 'Profile on an application opens their page on Hiring');
  c = hp(); await c.HP.open({ candidate_id: 'c1' }); ok(c.calls[0][0] === 'person' && c.calls[0][2] === 'hiring', 'Profile on Background & References opens their page on Hiring');
  c = hp({ ids: { applicant_id: 'a9' } }); await c.HP.open({ offer_id: 'o1' }); ok(JSON.stringify(c.calls) === '[["ap","a9","hiring"]]', 'Profile on an offer card finds their application by id');
  ok(/\(HP\.panel \|\| HP\.open\)\(rec \?/.test(ENG), 'openPerson falls back to the panel, never back to HP.open (no loop)');
  ok(!/&#128100;/.test(cut(HPJS, 'function chip(k, label){', '\n')), 'the Profile button has no emoji');
  ok(/hire-profile\.js\?v=4/.test(IDX), 'browsers fetch the new hire-profile.js');
  ok(!/—/.test(cut(IDX, 'let PP_BACK = null;', 'window.ppGoBack = ppGoBack;').replace(/'← Back to '/g, '')), 'no em dashes');
  console.log(`person-back: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();

/* One profile, step 2 piece 2 (2026-10-12): a hired caregiver has ONE page, the caregiver page, carrying their
   application and hiring. Found by id only. FAKE people; nothing leaves this file. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const IDX = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const cut = (src, a, b) => { const i = src.indexOf(a); const j = src.indexOf(b, i + 1); if (i < 0 || j < 0) throw new Error('cannot find ' + a); return src.slice(i, j); };
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('PASS ', m); } else { fail++; console.log('FAIL ', m); } };
function fakeSb(rows){ return { from(){ let f = rows.slice(); const q = { select(){ return q; }, eq(k, v){ f = f.filter(r => String(r[k]) === String(v)); return q; }, limit(){ return Promise.resolve({ data: f }); } }; return q; } }; }

(async () => {
  /* apFindCaregiver: ids only, one caregiver or none, nothing cached when AxisCare could not be asked */
  const mk = (intake, census, fails) => { const c = { sb: fakeSb(intake), cgdCensus: async () => { if (fails) throw new Error('down'); return census; }, Object, Set, String };
    vm.createContext(c); vm.runInContext(cut(IDX, 'const AP_CG_CACHE = {};', 'async function apCgLinkFill(r){').replace('const AP_CG_CACHE', 'var AP_CG_CACHE'), c); return c; };
  const cen = { caregivers: [ { id: 5001 }, { id: 6002 } ] };
  let c = mk([], cen); ok(await c.apFindCaregiver({ id: 'a', axiscare_id: 5001 }) === '5001', 'AxisCare id on the application');
  c = mk([ { applicant_id: 'b', candidate_id: 6002 } ], cen); ok(await c.apFindCaregiver({ id: 'b' }) === '6002', 'AxisCare id on their start form');
  c = mk([], cen); ok(await c.apFindCaregiver({ id: 'c', phone: '4175550100', first_name: 'Ann' }) === null, 'no id: no caregiver, even with a phone and name');
  c = mk([ { applicant_id: 'd', candidate_id: 6002 } ], cen); ok(await c.apFindCaregiver({ id: 'd', axiscare_id: 5001 }) === null, 'two different caregivers: none picked');
  c = mk([], cen, true); ok(await c.apFindCaregiver({ id: 'e', axiscare_id: 5001 }) === undefined && !('e' in c.AP_CG_CACHE), 'AxisCare could not be asked: unknown, not cached');
  ok(!/ilike|phone|email|first_name/.test(cut(IDX, 'async function apFindCaregiver', 'async function apCgLinkFill')), 'apFindCaregiver matches by id only');

  /* apOpenProfile: offered + a caregiver number -> the caregiver page; everyone else -> the application page */
  const open = (row, cache, stay) => { const calls = [];
    const x = { AP_ROWS: [row], AP_CG_CACHE: cache, apIsOffered: r => ['hired','offer','left'].includes(r.status) || !!r.hired_at,
      cgdOpenFromApplicant: (ax, id, tab) => calls.push(['cg', ax, id, tab]), apFindCaregiver: async () => null,
      document: { querySelectorAll: () => [], getElementById: () => ({ style: {} }) }, window: { scrollTo(){} }, apRenderProfile: () => calls.push(['ap']), ppRemember(){}, String };
    vm.createContext(x); vm.runInContext(cut(IDX, 'function apOpenProfile(id, tab, stay){', '/* ---- Send the application').replace(/^let /gm, 'var '), x);
    x.AP_TAB = 'overview'; x.AP_TAB_FOR = null; x.apOpenProfile(row.id, 'hiring', stay); return calls; };
  ok(JSON.stringify(open({ id: 'h', status: 'hired' }, { h: '5001' })) === '[["cg","5001","h","hiring"]]', 'hired with a caregiver number: their one page is the caregiver page, on the asked-for tab');
  ok(JSON.stringify(open({ id: 'n', status: 'new' }, {})) === '[["ap"]]', 'not offered: the application page');
  ok(JSON.stringify(open({ id: 'h2', status: 'hired' }, { h2: null })) === '[["ap"]]', 'offered, no caregiver number yet: the application page');
  ok(JSON.stringify(open({ id: 'h3', status: 'hired' }, { h3: '5001' }, true)) === '[["ap"]]', 'booking and the interview form stay on the application page');
  ok((IDX.match(/apOpenProfile\(id, undefined, true\)/g) || []).length === 2, 'apBookFor and apInterview ask to stay');

  /* the caregiver page carries the application half */
  const half = cut(IDX, 'async function cgdAppHalfMount(axid, appId){', 'async function cgdApAct(fn, id){');
  for (const box of ["'What they told us'", "'The screen'", "'Where they have worked'", "'The interview'", "'The offer'", "'Getting them started'", "'Their journey, forms and signed documents'", 'apOffboard', 'apToOffer'])
    ok(half.includes(box), 'caregiver page carries: ' + box);
  ok(/apOnboardMount\(r, document\.getElementById\('cgdApOnboard'\)\)/.test(half) && /async function apOnboardMount\(r, hostEl\)/.test(IDX), 'start paperwork draws into its own box (no shared ids with the application page)');
  ok(/if\(CGD_APP && CGD_APP\.axid===axid\) return;/.test(half), 'mounted once per open');
  ok(/String\(CGD\.openId\)!==axid \|\| !CGD_APP \|\| CGD_APP\.id!==String\(appId\)\) return;/.test(half), 'a slow read never lands on a different caregiver');
  ok(/cgdAppHalfMount\(axid, String\(j\.application\.record_id\)\)/.test(IDX), 'the hiring history\'s own application link fills it too');
  ok(/\['hiring',\['hire'\]\]/.test(IDX) && /no application on file: no Hiring tab/.test(IDX), 'Hiring tab only when there is an application');
  ok(/HP\.mount\(el,\{ applicant_id:CGD_APP\.id \},\['timeline'\]\)/.test(IDX), 'History uses their application timeline when there is one');
  ok(cut(IDX, 'function apToldHtml(r){', 'function apRenderProfile(){').includes("'Are you 18 or older?'") && /const told = apToldHtml\(r\), flags = apFlagsHtml\(r\);/.test(IDX), 'one builder for the application answers, used by both pages');
  ok(!/—/.test(half) && !/New hire — day/.test(IDX), 'no em dashes');

  console.log(`person-both-halves: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();

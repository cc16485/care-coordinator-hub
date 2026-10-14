/* node tests/lpn-hiring-test.js
   708 LPN HIRING (Samantha approved the LPN nurse visit plan, 2026-10-14) on the Hub page. The position key and the one "offer
   signed" rule (nurse-hire.js), the same as the server's positions.ts; every caregiver offer reads exactly as before; the offer
   form keeps its look and sends the key; the signing page shows an LPN or RN the letter alone and renders a caregiver offer
   byte for byte as the reviewed base (LPN_BASE); the nurse forms appear only on an LPN or RN readiness card; the Step 1 page's
   nursing license door. Nothing here sends anything. */
const fs = require('fs'), path = require('path'), vm = require('vm'), { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..'), rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const LPN_BASE = process.env.LPN_BASE || '94e3abc';
let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 500))); };
const base = (f) => { try { return execFileSync('git', ['-C', ROOT, 'show', LPN_BASE + ':' + f], { encoding: 'utf8' }); } catch (e) { return null; } };
/* ═══ 1. the position key and the one signed rule ═══ */
const ctx = { window: {}, console }; vm.createContext(ctx); vm.runInContext(rd('nurse-hire.js'), ctx);
const P = ctx.window.CCPositions, NH = ctx.window.NurseHire;
const W = { 'Caregiver': 'caregiver', 'CNA': 'cna', 'LPN': 'lpn', 'RN': 'rn', 'Office': null, 'Care Coordinator': 'care_coordinator', 'Licensed Practical Nurse (LPN)': 'lpn', 'Registered Nurse (RN)': 'rn', '': null, 'PRN CNA Team': 'cna' };
ck('keyOf: the Hub\'s position choices map to their keys (Office stays empty: today\'s caregiver behaviour)', Object.entries(W).every(([t, k]) => P.keyOf(t) === k), Object.keys(W).map((t) => [t, P.keyOf(t)]));
let same = true;
for (const k of [undefined, null, 'caregiver', 'cna', 'care_coordinator', 'junk']) for (const o of [{}, { offer_signed_at: 'a' }, { pd_signed_at: 'b' }, { offer_signed_at: 'a', pd_signed_at: 'b' }]) if (P.offerSigned({ ...o, position_key: k }) !== !!(o.offer_signed_at && o.pd_signed_at)) same = false;
ck('offerSigned is the old rule exactly for every offer without an LPN or RN key', same);
ck('an LPN or RN offer is signed with the letter alone', P.offerSigned({ offer_signed_at: 'a', position_key: 'lpn' }) && P.offerSigned({ offer_signed_at: 'a', position_key: 'rn' }) && !P.offerSigned({ position_key: 'lpn' }));
const eng = rd('caregivers-engine.js');
const ceSrc = eng.slice(eng.indexOf('function ceOfferSigned('), eng.indexOf('\n', eng.indexOf('function ceOfferSigned(')));
const ce = (win) => { const c = { window: win }; vm.createContext(c); vm.runInContext(ceSrc + '\nthis.f = ceOfferSigned;', c); return c.f; };
const ceNone = ce({}), ceWith = (() => { const c = { window: {}, console }; vm.createContext(c); vm.runInContext(rd('nurse-hire.js'), c); c.CCPositions = c.window.CCPositions; vm.runInContext(ceSrc + '\nthis.f = ceOfferSigned;', c); return c.f; })();
let ok2 = true; for (const o of [{}, { offer_signed_at: 'a' }, { offer_signed_at: 'a', pd_signed_at: 'b' }, { offer_signed_at: 'a', position_key: 'caregiver' }]) if (ceNone(o) !== !!(o.offer_signed_at && o.pd_signed_at) || ceWith(o) !== !!(o.offer_signed_at && o.pd_signed_at)) ok2 = false;
ck('caregivers-engine: every offer-signed check goes through ceOfferSigned; without nurse-hire.js loaded it is the old rule; with it, the same for caregivers', ok2 && !/offer_signed_at\s*&&\s*o\.pd_signed_at\)/.test(eng.replace(ceSrc, '')) && (eng.match(/ceOfferSigned\(/g) || []).length >= 9);
/* ═══ 2. the offer form: same look, sends the key ═══ */
const html = rd('index.html'), bhtml = base('index.html');
const sel = (h) => (h.match(/<select id="jo_position"[^]*?<\/select>/) || [''])[0];
ck('the offer form\'s Position choice is unchanged (same select, same options)', bhtml === null || sel(html) === sel(bhtml));
ck('Save Offer sends position_key from the choice (the server stores it once)', /position_key: window\.CCPositions \? CCPositions\.keyOf\(g\('jo_position'\)\) : null/.test(html));
ck('nurse-hire.js is mounted once, before the readiness card', (html.match(/<script src="nurse-hire\.js\?v=\d+"><\/script>/g) || []).length === 1 && html.indexOf('nurse-hire.js') < html.indexOf('caregiver-readiness.js?v='));
/* ═══ 3. the signing page ═══ */
function renderOffer(src, view, search) {
  const els = {}; const el = (id) => (els[id] = els[id] || { id, innerHTML: '', textContent: '', style: {}, value: '', checked: false });
  const out = { calls: [] };
  const c = { console, URLSearchParams, JSON, Date, Promise, setTimeout, Response, location: { search: search || '?o=0f1e2d3c-4b5a-4968-8777-66554433aabb&e=1&t=x' }, window: { scrollTo() {}, open() {} },
    document: { getElementById: el, querySelector: () => null }, confirm: () => true, alert() {},
    fetch: async (u, o) => { const b = JSON.parse(o.body); out.calls.push(b); return { status: 200, json: async () => (b.action === 'copies' ? { ok: true, copies: {} } : view) }; } };
  c.window.document = c.document; vm.createContext(c);
  const code = src.slice(src.lastIndexOf('<script>') + 8, src.lastIndexOf('</script>'));
  vm.runInContext(code, c);
  return new Promise((r) => setTimeout(() => r({ main: el('main').innerHTML, calls: out.calls }), 30));
}
(async () => {
  const page = rd('offer.html'), bpage = base('offer.html');
  const blocks = [{ k: 'small', t: 'Caring Companions' }, { k: 'p', t: 'Date: October 14, 2026' }, { k: 'h', t: 'YOUR EMPLOYMENT OFFER' }, { k: 'li', t: 'One' }, { k: 'q', t: 'At will.' }];
  const cg = { ok: true, first: 'Ava', state: { status: 'sent', offer_signed_at: null, pd_signed_at: null, expires_at: '2026-10-23T22:00:00Z' }, automation_live: false, offer: blocks, pd: blocks };
  const cg2 = { ...cg, state: { ...cg.state, offer_signed_at: '2026-10-14T15:00:00Z', offer_signer_name: 'Ava Lee' } };
  const cg3 = { ...cg, state: { ...cg.state, offer_signed_at: '2026-10-14T15:00:00Z', pd_signed_at: '2026-10-14T15:05:00Z' } };
  if (bpage) for (const [n, v] of [['unsigned', cg], ['letter signed', cg2], ['both signed', cg3]]) {
    const a = await renderOffer(page, v), b = await renderOffer(bpage, v);
    ck(`a caregiver offer (${n}) renders byte-identical to the base signing page`, a.main === b.main && a.main.length > 200, [a.main.length, b.main.length]);
  }
  const lpn = { ok: true, first: 'Lee', letter_only: true, state: { status: 'sent', offer_signed_at: null, pd_signed_at: null, expires_at: '2026-10-23T22:00:00Z' }, automation_live: false, offer: blocks, pd: null };
  let r = await renderOffer(page, lpn);
  ck('an LPN offer: the letter alone, one sign box, no position description step, says the job description comes in Step 2', /Sign the offer letter/.test(r.main) && !/Position description/.test(r.main) && !/sb_pd/.test(r.main) && /job description comes with your Step 2 paperwork/.test(r.main));
  r = await renderOffer(page, { ...lpn, state: { ...lpn.state, offer_signed_at: '2026-10-14T15:00:00Z' } });
  ck('an LPN offer, letter signed: done (thank you, the copy), no second document asked', /Thank you, Lee/.test(r.main) && /Your offer letter is signed/.test(r.main) && !/One more to go/.test(r.main));
  r = await renderOffer(page, { ...lpn, preview: true }, '?preview=1&position=lpn');
  ck('the preview asks the server for the LPN letter (?position=lpn)', r.calls.some((c) => c.action === 'preview' && c.position === 'lpn'));
  r = await renderOffer(page, cg, '?preview=1');
  ck('the plain preview asks exactly as before (no position)', r.calls.some((c) => c.action === 'preview' && !('position' in c)));
  /* ═══ 4. the readiness card ═══ */
  const rdy = rd('caregiver-readiness.js');
  ck('the readiness card hands the nurse rows to NurseHire (never the generic Record prompt) and exports act and cur', /if\(window\.NurseHire && NurseHire\.handles\(r\.key\)\) line \+= NurseHire\.buttons\(r, may\);/.test(rdy) && /act, cur: \(\) => CUR/.test(rdy) && /if\(window\.NurseHire\) h \+= NurseHire\.setupBlock\(d\);/.test(rdy));
  ck('NurseHire handles exactly the three recorded nurse rows (the LPN packet is a Step 2 tick)', ['cg.credential.nurse_license', 'cg.nurse.orientation', 'cg.nurse.section2_ack'].every(NH.handles) && !NH.handles('cg.step2.position_description') && !NH.handles('cg.credential.cna_hha') && !NH.handles('cg.credential.driver'));
  const bt = NH.buttons({ key: 'cg.nurse.section2_ack', status: 'ready', st: { evidence: {} } }, true);
  ck('the Section 2 row: the printable statement and Record', /NurseHire\.print\('section2'/.test(bt) && /NurseHire\.open\('cg\.nurse\.section2_ack'\)/.test(bt));
  ck('without the permission, no Record button', !/NurseHire\.open/.test(NH.buttons({ key: 'cg.nurse.orientation', status: 'ready', st: {} }, false)));
  const caregiverCard = { facts: { dates: {} }, approve: { approved: true, may_approve_work: true }, view: { rows: [] } };
  ck('a caregiver card shows no nurse setup at all', NH.setupBlock(caregiverCard) === '');
  const nurseCard = { facts: { licensed_nurse: true }, approve: { approved: true, may_approve_work: true }, view: { rows: [{ key: 'cg.approve.work', st: { evidence: { nurse_setup: { state: 'practice', cred: 'LPN', nurse_list: { would: 'add', name: 'Lee Nurse', cred: 'LPN', license: 'on file, ending 6813', expires: '2028-05-31', supervisor: 'Natasha Early', state: 'practice', problems: [] }, axiscare_class: { outcome: 'practice' }, waiver: { courses: ['on-the-job-training'], kept: ['agency-orientation', 'dementia-care'], training: { practice: true } } } } } }] } };
  const sb = NH.setupBlock(nurseCard);
  ck('an LPN card after Approve to Work: the nurse setup in practice (what would be added, Natasha Early, the class, the waiver), and Run nurse setup', /practice: nothing written/.test(sb) && /Natasha Early/.test(sb) && /on file, ending 6813/.test(sb) && /on-the-job-training/.test(sb) && /Compliance tab/.test(sb) && /Run nurse setup/.test(sb));
  ck('Step 2 Verify: the packet tick only when the server names one', NH.step2Tick({}) === '' && NH.step2Tick(null) === '' && /s2nurse/.test(NH.step2Tick({ nurse_packet: 'LPN packet signed in Viventium' })));
  const s2 = eng.slice(eng.indexOf('async function step2Verify('), eng.indexOf('async function step2StillOpen('));
  ck('Step 2 Verify asks with candidate_id, adds the tick, sends nurse_packet only when ticked', /action:'preview', first: c\.first \|\| '', candidate_id: String\(id\)/.test(s2) && /NurseHire\.step2Tick\(p\)/.test(s2) && /np \? \{ nurse_packet: true \} : \{\}/.test(s2));
  /* ═══ 5. the Step 1 page ═══ */
  const s1 = rd('step1.html');
  ck('Step 1: the nursing license number through the locked door (never saved with the answers), with Change', /it\.id === 'nurse_license_number'/.test(s1) && /identitySend\(\\'nurse_license\\'\)/.test(s1) && /body\.nurse_license_number = /.test(s1));
  ck('Step 1: the review tells the office where the license picture opens; ?position=lpn previews a nurse\'s Step 1', /nursing license row/.test(s1) && /PPOS = \['lpn', 'rn'\]\.includes\(q\.get\('position'\)\)/.test(s1));
  ck('no em dash and no "plain language" in anything new on the page side', !/—/.test(rd('nurse-hire.js')) && !/plain (language|english)/i.test(rd('nurse-hire.js')));
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();

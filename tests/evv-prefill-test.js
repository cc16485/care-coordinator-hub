/* node tests/evv-prefill-test.js
   427 (2026-10-03): a form sent from the pre-filled link arrives already linked to the caregiver, the client and the
   AxisCare visit (linked_by 'axiscare-visit', set server side). Proves: Accept & Log shows that link as "From the visit
   (AxisCare)" with no lists and no name guess; confirming keeps it (no overwrite); Change opens the usual pickers;
   Past forms, the profiles and the signed-form page say where the link came from; the AxisCare helper names the visit;
   ordinary forms behave exactly as before; the link page says the form opens filled in; no em dashes in new words. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 700))); };
const idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const lib = fs.readFileSync(path.join(ROOT, 'evv-forms.js'), 'utf8');
const formPage = fs.readFileSync(path.join(ROOT, 'evv-form.html'), 'utf8');
const clockin = fs.readFileSync(path.join(ROOT, 'clockin.html'), 'utf8');
require(path.join(ROOT, 'evv-forms.js'));
const F = globalThis.EVVF;
const DASH = /[—―]/;
const VSUB = { id: '7a1c2d3e-4a5b-4c6d-8e7f-001122334455', attendant: 'Maria Lopez', consumer: 'Ruth A.', visitdate: '2026-09-30', new_in: '09:00', new_out: '13:00',
  reason: 'Forgot to clock in or out', processed: false, outcome: null, caregiver_axiscare_id: '501', caregiver_linked_name: 'Maria Lopez',
  client_axiscare_id: '701', client_linked_name: 'Ruth Adams', linked_by: 'axiscare-visit', linked_at: '2026-09-30T15:00:00Z', axiscare_visit_id: '9001' };
const PLAIN = Object.assign({}, VSUB, { id: '8b1c2d3e-4a5b-4c6d-8e7f-001122334455', caregiver_axiscare_id: null, caregiver_linked_name: null, client_axiscare_id: null, client_linked_name: null, linked_by: null, linked_at: null, axiscare_visit_id: null, consumer: 'Ruth Adams' });

/* ── 1. the shared helpers ── */
ck('fromVisit: only a form linked server side from its visit', F.fromVisit(VSUB) && !F.fromVisit(PLAIN) && !F.fromVisit(Object.assign({}, VSUB, { linked_by: 'krystal@mo-care.com' }))
  && !F.fromVisit(Object.assign({}, VSUB, { caregiver_axiscare_id: null, client_axiscare_id: null })));
const cgs = [{ id: '501', name: 'Maria Lopez', active: true }, { id: '502', name: 'Maria Lopes', active: true }];
const cls = [{ id: '701', name: 'Ruth Adams', active: true }, { id: '702', name: 'Ruth Allen', active: true }];
const m = F.pickerModel(VSUB, cgs, cls);
ck('picker (after Change): the visit\'s people are selected, marked "From the visit (AxisCare)", never "Suggested"', m.fromVisit && m.cg.selected === '501' && m.cl.selected === '701'
  && F.selectHtml('a', m.cg).includes('From the visit (AxisCare)') && !F.selectHtml('a', m.cg).includes('Suggested') && !F.selectHtml('b', m.cl).includes('More than one person'));
const mp = F.pickerModel(PLAIN, cgs, cls);
ck('picker: an ordinary form still only suggests from the typed name (unchanged)', !mp.fromVisit && !F.selectHtml('a', mp.cg).includes('From the visit') && mp.cl.selected === '701' && F.selectHtml('b', mp.cl).includes('Suggested from the name'));
ck('chip + words: "From the visit (AxisCare)" for a visit form, nothing for an ordinary one', F.visitChipHtml(VSUB).includes('From the visit (AxisCare)') && F.visitChipHtml(PLAIN) === ''
  && F.linkedWords(VSUB) === 'from the visit (AxisCare): Maria Lopez · Ruth Adams' && F.linkedWords(Object.assign({}, PLAIN, { caregiver_axiscare_id: '9', caregiver_linked_name: 'X', client_axiscare_id: '8', client_linked_name: 'Y', linked_by: 'k@x' })) === 'linked: X · Y' && F.linkedWords(PLAIN) === '');
ck('profiles: the list marks a visit form', F.sectionHtml({ rows: [VSUB], kind: 'caregiver' }).includes('From the visit (AxisCare)') && !F.sectionHtml({ rows: [PLAIN], kind: 'caregiver' }).includes('From the visit'));
ck('AxisCare helper: names the visit the form came with', F.axHelperHtml(VSUB, {}, 'c', 'p').includes('AxisCare visit 9001, from the pre-filled link'));

/* ── 2. saving: confirming keeps the visit link; changing it is the office's own link ── */
const fakeSb = () => { const calls = []; return { calls, from: () => { let patch; const b = { update(x) { patch = x; return b; }, eq() { return b; }, select() { calls.push(patch); return Promise.resolve({ data: [{ id: 'x' }], error: null }); } }; return b; } }; };
(async () => {
  let sb = fakeSb();
  let r = await F.linkSave(sb, VSUB, { cg: '501', cgName: 'Maria Lopez', cl: '701', clName: 'Ruth Adams' }, { by: 'krystal@mo-care.com', accept: true });
  const p0 = sb.calls[0] || {};
  ck('Accept on a visit form: processed + accepted, and the visit link is kept as it is (no linked_by / ids rewritten)', r.ok && p0.processed === true && p0.outcome === 'accepted' && p0.processed_by === 'krystal@mo-care.com'
    && !('linked_by' in p0) && !('caregiver_axiscare_id' in p0) && !('client_axiscare_id' in p0), p0);
  sb = fakeSb();
  r = await F.linkSave(sb, VSUB, { cg: '502', cgName: 'Maria Lopes', cl: '701', clName: 'Ruth Adams' }, { by: 'krystal@mo-care.com', accept: true });
  ck('Change to someone else: that becomes the office\'s own link (linked_by = who changed it)', r.ok && sb.calls[0].caregiver_axiscare_id === '502' && sb.calls[0].linked_by === 'krystal@mo-care.com', sb.calls[0]);
  sb = fakeSb();
  r = await F.linkSave(sb, VSUB, { cg: '501', cl: '701' }, { by: 'krystal@mo-care.com' });
  ck('Link (no accept) with the same people: nothing to write', r.ok && r.unchanged && sb.calls.length === 0, r);
  sb = fakeSb();
  r = await F.linkSave(sb, PLAIN, { cg: '501', cgName: 'Maria Lopez', cl: '701', clName: 'Ruth Adams' }, { by: 'krystal@mo-care.com', accept: true });
  ck('an ordinary form: Accept saves both people + who linked it (unchanged from 422)', r.ok && sb.calls[0].caregiver_axiscare_id === '501' && sb.calls[0].client_axiscare_id === '701' && sb.calls[0].linked_by === 'krystal@mo-care.com' && sb.calls[0].outcome === 'accepted', sb.calls[0]);

  /* ── 3. index.html: Accept & Log on a visit form skips the lists and the guess ── */
  const grab = (name) => { const i = idx.indexOf((/^async /.test(name) ? '' : '') + name); if (i < 0) throw new Error('missing ' + name); let d = 0, j = idx.indexOf('{', i); for (let k = j; k < idx.length; k++) { if (idx[k] === '{') d++; else if (idx[k] === '}') { d--; if (!d) return idx.slice(i, k + 1); } } };
  const code = ['function evvMe(', 'function evvSubById(', 'async function evvOpenLinker(', 'async function evvLinkUnfix(', 'function evvPaintLinker(', 'function evvLinkCancel(', 'async function evvLinkConfirm(', 'async function evvLinkSave(']
    .map(grab).join('\n');
  const els = {};
  const doc = { getElementById: (id) => els[id] || null, createElement: () => ({ style: {} }), body: { appendChild: (el) => { els.evvLinkModal = el; } } };
  const sb2 = fakeSb(); let listCalls = 0; const persisted = [];
  const ctx = { document: doc, window: { EVVF: F }, EVVF: F, sb: sb2, alert: () => {}, esc: F.esc, ME: { email: 'krystal@mo-care.com' }, DATA: {},
    EVV_SUBS: { data: { rows: [VSUB, PLAIN] } }, EVV_PAST: { data: { rows: [] }, open: {}, ax: {} }, EVV_LINK: null,
    evvAllSubs: () => [VSUB, PLAIN], evvPeopleLists: async () => { listCalls++; return { cgs, cls, cgErr: '', clErr: '' }; },
    persist: async (k, e) => { persisted.push([k, e]); }, evvLoadSubs: () => {}, evvLoadPast: () => {}, evvPaintLog: () => {} };
  vm.createContext(ctx);
  vm.runInContext(code.replace(/^let EVV_LINK.*$/m, '') + '\nthis.__get = () => EVV_LINK; this.__set = (v) => { EVV_LINK = v; };', ctx);
  ctx.EVV_LINK = null;
  await vm.runInContext('evvOpenLinker("' + VSUB.id + '", "accept")', ctx);
  let html = (els.evvLinkModal || {}).innerHTML || '';
  ck('Accept & Log on a visit form: "From the visit (AxisCare)", both names, the visit; no lists loaded, no pickers, no guess', html.includes('From the visit (AxisCare)') && html.includes('Maria Lopez') && html.includes('Ruth Adams')
    && html.includes('AxisCare visit 9001') && !html.includes('<select') && !html.includes('Suggested') && listCalls === 0 && !/id="evvLinkGo"[^>]*disabled/.test(html), html.slice(0, 600));
  ck('... with a Change link if it is wrong', html.includes('evvLinkUnfix()') && html.includes('Change</a> if it is wrong'));
  els.evvLinkMsg = { textContent: '' }; els.evvLinkGo = { disabled: false, textContent: '' };
  await vm.runInContext('evvLinkConfirm()', ctx);
  const sent = sb2.calls[0] || {};
  ck('Confirm and log: accepted with the visit link kept, and the corrections log entry carries the form number', sent.outcome === 'accepted' && !('linked_by' in sent)
    && persisted.length === 1 && persisted[0][0] === 'evv_corrections' && persisted[0][1].submission_id === VSUB.id, { sent, persisted });
  await vm.runInContext('evvOpenLinker("' + VSUB.id + '", "accept")', ctx);
  await vm.runInContext('evvLinkUnfix()', ctx);
  html = els.evvLinkModal.innerHTML;
  ck('Change: loads the lists and shows the pickers, the visit\'s people selected', listCalls === 1 && html.includes('<select') && html.includes('<option value="501" selected>') && html.includes('From the visit (AxisCare)'), html.slice(0, 400));
  await vm.runInContext('evvOpenLinker("' + VSUB.id + '", "link")', ctx);
  html = els.evvLinkModal.innerHTML;
  ck('"Change link" from Past forms goes straight to the pickers', listCalls === 2 && html.includes('<select'));
  await vm.runInContext('evvOpenLinker("' + PLAIN.id + '", "accept")', ctx);
  html = els.evvLinkModal.innerHTML;
  ck('an ordinary form: Accept & Log still loads the lists and suggests (unchanged)', listCalls === 3 && html.includes('<select') && html.includes('Suggested from the name'));
  ck('index.html: the waiting list shows the chip; Past forms say "from the visit (AxisCare)"', /\+EVVF\.visitChipHtml\(s\)/.test(idx) && /F\.linkedWords\(s\)/.test(idx));

  /* ── 4. the signed-form page and the missed clock-in link page ── */
  const inline = [...formPage.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(x => x[1]);
  globalThis.__EVV_TEST__ = true; vm.runInThisContext(inline[inline.length - 1]);
  const out = globalThis.EVVPAGE.render(VSUB, {});
  ck('signed-form page: "Linked by" says it came from the visit (never the raw marker)', out.includes('From the visit (AxisCare), sent from the link filled in for this visit (AxisCare visit 9001)') && !out.includes('>axiscare-visit'), out.slice(out.indexOf('Linked by') - 20, out.indexOf('Linked by') + 300));
  ck('evv-form.html and index.html load the new evv-forms.js', formPage.includes('evv-forms.js?v=427') && idx.includes('evv-forms.js?v=427'));
  ck('link page: after the tap it says the form opens already filled in; before, what the link carries', clockin.includes("(D.evv_prefilled?' The form opens already filled in for this visit.':'')")
    && clockin.includes('She gets the form link (filled in for this visit: her name, '));
  ck('link page: still only a person\'s tap sends it (one button, with a confirm)', (clockin.match(/act\('evv'/g) || []).length === 1 && /act\('evv', null, 'Text '\+D\.caregiver_first\+' the EVV correction form now\?'\)/.test(clockin));

  /* ── 5. words ── */
  const linkedRow = out.slice(out.indexOf('Linked by'), out.indexOf('Linked by') + 300);
  const added = [F.VISIT_WORDS, F.visitChipHtml(VSUB), F.linkedWords(VSUB), F.selectHtml('a', m.cg), linkedRow, html].join(' ');
  const idxNew = idx.slice(idx.indexOf('async function evvLinkUnfix('), idx.indexOf('async function evvLinkConfirm('));
  ck('no em dashes in any new words', !DASH.test(added) && !DASH.test(idxNew) && !DASH.test(lib.slice(lib.indexOf('427'), lib.indexOf('427') + 400)));
  ck('never "plain language" / "plain English"', !/plain (language|english)/i.test(lib + idxNew + clockin));

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();

/* node tests/late-family-step-test.js
   2026-11-05 running late, telling the family (her option A, decisions 2, 3, 4, 9, 10; ops_settings.late_family_step_live).
   April's case: Nerma, 5 minutes, "not sure". The real late.html drawn from a fake server answer, and the Hub card's family
   step (lnBody, lnFamStepHtml) pulled out of index.html. Proves: with the step on, "Tell April's family?" comes first, the
   note reads before the Send button, Send / Don't tell / I called them and a call per Family Circle member; with it off the
   page is as before; nothing here sends by itself; no em dashes. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 900))); };
const OC = read('office-call.js');
function page(fetchImpl) {
  const byId = {};
  const mk = (tag) => ({ tag, innerHTML: '', textContent: '', style: {}, children: [], attrs: {}, onclick: null, value: '', disabled: false,
    setAttribute(k, v) { this.attrs[k] = String(v); }, getAttribute(k) { return this.attrs[k] ?? null; }, appendChild(c) { this.children.push(c); return c; }, addEventListener() {}, querySelector() { return null; } });
  const document = { head: mk('head'), body: mk('body'), createElement: mk, getElementById: (id) => byId[id] || (byId[id] = Object.assign(mk('div'), { id })), querySelector: () => null, addEventListener() {} };
  const calls = [];
  const ctx = { console, JSON, Promise, Object, String, Number, Array, Error, RegExp, Math, Date, URLSearchParams, setTimeout, document,
    location: { search: '?c=x&a=abc&e=9999999999&t=TOK' }, fetch: async (u, o) => { calls.push(JSON.parse(o.body)); return fetchImpl(JSON.parse(o.body)); } };
  ctx.window = ctx;
  vm.createContext(ctx); vm.runInContext(OC, ctx);
  return { ctx, byId, calls };
}
const draw = async (view) => {
  const html = read('late.html'); const script = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));
  const P = page(async () => ({ ok: true, status: 200, json: async () => view }));
  vm.runInContext(script, P.ctx); await new Promise((r) => setTimeout(r, 10));
  return P;
};
const FAM = { can: true, why: '', members: 1, first_names: ['April'], draft: "A quick update from Caring Companions. Nerma is running late for April's 4pm visit today and expects to arrive around 4:05pm. We're sorry for the wait. Questions? Call us at (417) 234-8494.",
  is_update: false, hours_ok: true, hours: '6am to 9pm', sent: [], step: true, note: 'The Hub was not sure about this one. Check the time before you send. Only about 5 minutes late. Send anyway?', decided: false,
  call_list: [{ id: 'm1', first: 'Edwin', relationship: 'Spouse', texts_ok: false, phone: '+14175550301' }, { id: 'm2', first: 'Nancy', relationship: 'Mother', texts_ok: false, phone: '+14175550302' }, { id: 'm3', first: 'April', relationship: null, texts_ok: true, phone: '+14175550303' }],
  client_phone: true, arrived_can: false };
const BASE = { ok: true, me: 'Samantha', kind: 'late', status: 'open', caregiver_first: 'Nerma', client_first: 'April', shift_time: '4pm', eta: '4:05pm', eta_hhmm: '16:05', eta_by: 'from your call', sure: false,
  said: [{ at: '2:36pm', channel: 'call', text: 'I was just wondering if it was okay if I was, like, maybe, like, five minutes late.' }], caregiver_phone: '+14175550101', client_phone: '+14175558000', family: FAM };

(async () => {
  /* ── late.html ── */
  let P = await draw(BASE), h = P.byId.app.innerHTML;
  ck('step on: "Tell April\'s family?" comes before the Seen button', h.indexOf("Tell April's family?") > -1 && h.indexOf("Tell April's family?") < h.indexOf('id="bSeen"'), h.slice(0, 600));
  ck('the note (not sure, only about 5 minutes) is shown before the Send button', h.indexOf('Only about 5 minutes late. Send anyway?') > -1 && h.indexOf('Only about 5 minutes late') < h.indexOf('id="bFam"'));
  ck('who gets it and the exact text are shown; Send, Don\'t tell, and I called them', /Texts April \(Family Circle, agreed to texts\)/.test(h) && h.includes('Nerma is running late for April&#39;s 4pm visit') && /id="bFam"/.test(h) && /id="bSkip"/.test(h) && /id="bCalled"/.test(h));
  ck('a call button for each Family Circle member and the home line', /id="bMem0">📞 Call Edwin \(Spouse\)/.test(h) && /id="bMem1">📞 Call Nancy \(Mother\)/.test(h) && /id="bMem2">📞 Call April</.test(h) && /id="bHome">📞 Call April's home/.test(h));
  ck('opening the page only reads (view), nothing is sent', P.calls.length === 1 && P.calls[0].action === 'view', P.calls);
  P.byId.bMem0.onclick(); await new Promise((r) => setTimeout(r, 5));
  ck('tapping Call Edwin asks the server to ring (bridge, member m1), nothing else', P.calls.at(-1).action === 'bridge' && P.calls.at(-1).target === 'member' && P.calls.at(-1).member_id === 'm1', P.calls.at(-1));
  P = await draw({ ...BASE, family: { ...FAM, can: false, why: 'nobody in the Family Circle has agreed to texts', first_names: [], members: 0 } }); h = P.byId.app.innerHTML;
  ck('nobody to text: no Send, it says why, and the calls and "I called them" are there', !/id="bFam"/.test(h) && /Nobody in the Family Circle has agreed to texts\./.test(h) && /id="bCalled"/.test(h) && /id="bSkip"/.test(h));
  P = await draw({ ...BASE, seen: { by: 'Krystal', at: '2:40pm' }, family: { ...FAM, decided: true, sent: [{ at: '2:41pm', by: 'Krystal Office', what: 'called', count: 0 }] } }); h = P.byId.app.innerHTML;
  ck('answered ("I called them"): the card is quiet, below Seen, and says who called', !/Tell April/.test(h) && /Called by Krystal Office at 2:41pm/.test(h) && !/id="bFam"/.test(h) && !/id="bCalled"/.test(h) && h.indexOf('Seen by Krystal') < h.indexOf('Called by'));
  P = await draw({ ...BASE, family: { ...FAM, step: false, can: false, why: "the Hub couldn't tell which visit, or the message was unclear", note: '', call_list: [] } }); h = P.byId.app.innerHTML;
  ck('step off: the page is as before (no family question, the old reason)', !/Tell April/.test(h) && /The family can't be texted from here: the Hub couldn&#39;t tell which visit/.test(h) && !/id="bCalled"/.test(h));
  P = await draw({ ...BASE, family: { ...FAM, hours_ok: false } }); h = P.byId.app.innerHTML;
  ck('after 9pm: Send is off and it says to call instead', /id="bFam" disabled/.test(h) && /Family texts go 6am to 9pm/.test(h));

  /* ── the Hub card (index.html) ── */
  const idx = read('index.html');
  const fnSrc = (name) => { let i = idx.indexOf('function ' + name + '('); if (idx.slice(i - 6, i) === 'async ') i -= 6; let d = 0, j = idx.indexOf('{', i); for (let k = j; k < idx.length; k++) { if (idx[k] === '{') d++; else if (idx[k] === '}') { d--; if (!d) return idx.slice(i, k + 1); } } };
  const hctx = { escapeHtmlComms: (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])), LN_VIEW: {}, String, JSON, Object, Array };
  vm.createContext(hctx); vm.runInContext(fnSrc('lnBody') + '\n' + fnSrc('lnFamStepHtml'), hctx);
  hctx.LN_VIEW.i1 = { ...BASE }; let c = hctx.lnBody('i1');
  ck('Hub card: "Tell April\'s family?" first, with the note, Send, Don\'t tell, calls and I called them', c.indexOf("Tell April's family?") > -1 && c.indexOf('Tell April') < c.indexOf("'seen')")
    && /Only about 5 minutes late/.test(c) && /Send to the family/.test(c) && /Don't tell the family/.test(c) && /📞 Edwin \(Spouse\)/.test(c) && /member_id:'m1'/.test(c) && /I called them/.test(c), c.slice(0, 900));
  hctx.LN_VIEW.i1 = { ...BASE, family: { ...FAM, step: false, can: false, why: 'under 10 minutes late', note: '', call_list: [] } }; c = hctx.lnBody('i1');
  ck('Hub card, step off: as before', !/Tell April/.test(c) && /Family: under 10 minutes late\./.test(c));
  ck('Hub: the owner preview is asked of the server only for an owner (lnFamPreview checks ccIsOwner)', /function lnFamPreview\(\)\{ try\{ return typeof ccIsOwner==='function' && ccIsOwner\(\) && localStorage/.test(idx) && /lnFamPreview\(\)\?\{ preview:true \}:\{\}/.test(idx));
  ck('Settings: the switch is owner only, and the placeholder says "running late" (no "a little")', /key==='late_family_step_live' && !ccIsOwner\(\)/.test(idx) && !/running a little late/.test(idx));
  ck('no em dashes in the new wording', ![fnSrc('lnFamStepHtml'), read('late.html')].some((x) => /—/.test(x)));
  console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
})();

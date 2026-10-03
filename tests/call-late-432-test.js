/* node tests/call-late-432-test.js
   432 (Samantha, 2026-10-03): "i thought it might have read my transcript from my call to mary to see that she said she
   is running late and will be to Aprils in 8 minutes", then "yes build it". The real clockin.html and late.html scripts
   drawn from a fake server answer, plus the Hub's running-late panel (lnBody) and Settings (lnSetFill) pulled out of
   index.html.
   Proves: the call line ("Mary said on your 4:31pm call: running late, about 8 minutes (around 4:39pm).") and her words
   show on both link pages and the Hub card; "paused until" / "started again"; "Tell the family" is only a link to the
   running-late page (where the text and who gets it are shown first, and only a tap sends); "can't make it" offers
   Open coverage case and nothing else; outside 6am to 9pm the family button is off; the Settings "calls" switch reads ON
   when unset; no em dashes. */
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
  const ctx = { console, JSON, Promise, Object, String, Number, Array, Error, RegExp, Math, Date, URLSearchParams, setTimeout, document,
    location: { search: '?c=x&a=abc&e=9999999999&t=TOK' }, fetch: fetchImpl };
  ctx.window = ctx; ctx.window.open = () => ({});
  vm.createContext(ctx); vm.runInContext(OC, ctx);
  return { ctx, byId };
}
const draw = async (file, view) => {
  const html = read(file); const script = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));
  const P = page(async () => ({ ok: true, status: 200, json: async () => view }));
  vm.runInContext(script, P.ctx); await new Promise((r) => setTimeout(r, 10));
  return P.byId.app.innerHTML;
};
const LINE_K = 'Mary said on your 4:31pm call: running late, about 8 minutes (around 4:39pm).';
const LINE_S = "Mary said on Krystal's 4:31pm call: running late, about 15 minutes (around 4:53pm).";
const LATE_LINK = 'https://cc.mo-care.com/late.html?c=ln_7&a=0123456789abcdef&e=1791093600&t=' + 'A'.repeat(43);
const CBASE = { ok: true, me: 'Samantha', caregiver_first: 'Mary', client_first: 'April', shift_time: '4:30pm', minutes_past_start: 15, open: true, reasons: { other: 'other' }, replies: [], caregiver_phone: null, client_phone: null };
const LBASE = { ok: true, me: 'Krystal', kind: 'late', status: 'open', caregiver_first: 'Mary', client_first: 'April', shift_time: '4:30pm', eta: '4:39pm', eta_hhmm: '16:39', eta_by: 'from your call', sure: true,
  said: [{ at: '4:31pm', channel: 'call', text: "Hi Mary... Hi, yes, I'm running late, I'll be to April's in 8 minutes." }], caregiver_phone: null, client_phone: null };

(async () => {
  /* ── clockin.html ── */
  let h = await draw('clockin.html', { ...CBASE, late_call: { line: LINE_K, quote: "I'm running late, I'll be to April's in 8 minutes", kind: 'late', practice: false, closed: false,
    paused_until: null, resumed_after: '4:44pm', late_link: null, family_ok: false, family_why: 'under 10 minutes late: the family isn\'t told', family_told: false } });
  ck('clockin.html: "From the call" with the line word for word and her words', h.includes('From the call') && h.includes(LINE_K) && h.includes('"I&#39;m running late, I&#39;ll be to April&#39;s in 8 minutes"') && h.includes("Mary's words on the call"), h.slice(0, 1500));
  ck('clockin.html: "were paused until 4:44pm. Still no clock-in, so they started again."', /The reminder texts were paused until 4:44pm\. Still no clock-in, so they started again\./.test(h));
  ck('clockin.html: under 10 minutes: no family link, the reason instead', !h.includes('late.html') && /Family: under 10 minutes late/.test(h));
  h = await draw('clockin.html', { ...CBASE, late_call: { line: LINE_S, quote: null, kind: 'late', practice: false, closed: false, paused_until: '4:58pm', resumed_after: null,
    late_link: LATE_LINK, family_ok: true, family_why: null, family_told: false } });
  ck('clockin.html during the pause: "The reminder texts are paused until 4:58pm"', /The reminder texts are paused until 4:58pm\.<\/b> If there's still no clock-in then, they start again\./.test(h), h);
  ck('clockin.html: "Tell the family" is ONLY a link to her running-late page (the text and who gets it are shown there first); nothing sends from here',
    h.includes('<a class="call" href="' + LATE_LINK.replace(/&/g, '&amp;') + '">Tell the family</a>') && /you see the exact text and who gets it before anything is sent/.test(h) && /The client is never texted/.test(h) && !/id="bFam"/.test(h));
  h = await draw('clockin.html', { ...CBASE, late_call: { line: "Mary said on the 4:20pm call: can't make it to April's 4:30pm shift.", quote: "I can't make it to April's today", kind: 'cant_make_it', practice: false, closed: false,
    paused_until: null, resumed_after: null, late_link: null, family_ok: false, family_why: null, family_told: false } });
  ck("clockin.html can't make it: the line, one button \"Open coverage case\" and \"Nothing opens by itself\"; no family", h.includes("can&#39;t make it to April&#39;s 4:30pm shift.") && /id="bCov2">Open coverage case</.test(h) && /Nothing opens by itself/.test(h) && !/Tell the family/.test(h));
  h = await draw('clockin.html', { ...CBASE, late_call: null });
  ck('clockin.html with no call: no call box (unchanged page)', !/From the call/.test(h));
  h = await draw('clockin.html', { ...CBASE, late_call: { line: LINE_K, quote: null, kind: 'late', practice: true, closed: false, paused_until: null, resumed_after: null, late_link: null, family_ok: false, family_why: null } });
  ck('clockin.html practice: says calls are switched off, so nothing is paused', /calls are switched off in Settings \(Running late\), so nothing is paused/.test(h));

  /* ── late.html ── */
  h = await draw('late.html', { ...LBASE, call: { line: LINE_K, quote: "I'm running late, I'll be to April's in 8 minutes", at: '4:31pm', by: 'Krystal', missed_clockin_paused_until: '4:44pm' }, source: 'call',
    family: { can: false, why: "under 10 minutes late: the family isn't told", members: 1, first_names: ['Linda'], sent: [], draft: 'x', hours_ok: true } });
  ck('late.html: "From the call", the line, her words, the pause, and "Time from your call."', h.includes('From the call') && h.includes(LINE_K) && h.includes("Mary's words on the call")
    && /The missed clock-in texts to the admins are paused until 4:44pm\./.test(h) && /Time from your call\./.test(h), h.slice(0, 1800));
  ck('late.html: under 10 minutes: no send button, the reason', !/id="bFam"/.test(h) && /under 10 minutes late/.test(h));
  const draft = "A quick update from Caring Companions. Mary is running a little late for April's 4:30pm visit today and expects to arrive around 4:53pm. We're sorry for the wait. Questions? Call us at (417) 234-8494.";
  h = await draw('late.html', { ...LBASE, eta: '4:53pm', call: { line: LINE_S, quote: null, at: '4:38pm', by: 'Krystal', missed_clockin_paused_until: '4:58pm' }, source: 'call',
    family: { can: true, why: '', members: 1, first_names: ['Linda'], sent: [], draft, hours_ok: true, hours: '6am to 9pm' } });
  ck('late.html: the exact family text and who gets it are shown before the button ("Goes to Linda ... Hi Linda,")', /Goes to Linda \(Family Circle, agreed to texts\)\. Each text starts "Hi Linda,"/.test(h) && h.includes('A quick update from Caring Companions. Mary is running a little late for April&#39;s 4:30pm visit today and expects to arrive around 4:53pm.')
    && /<button class="primary" id="bFam">Send to the family<\/button>/.test(h) && /Only when you tap\. April is never texted\./.test(h), h.slice(h.indexOf('family'), h.indexOf('family') + 1500));
  h = await draw('late.html', { ...LBASE, eta: '9:15pm', call: { line: 'x', quote: null }, source: 'call', family: { can: true, why: '', members: 1, first_names: ['Linda'], sent: [], draft, hours_ok: false, hours: '6am to 9pm' } });
  ck('late.html after 9pm: the button is off and it says family texts go 6am to 9pm', /<button class="primary" id="bFam" disabled>/.test(h) && /Family texts go 6am to 9pm\.<\/b> It's outside those hours now/.test(h));
  h = await draw('late.html', { ...LBASE, call: null, source: 'text', eta_by: 'from their message', family: { can: false, why: 'x', members: 0, first_names: [], sent: [] } });
  ck('late.html from a text: no call box (unchanged)', !/From the call/.test(h) && /Time from their message\./.test(h));

  /* ── the Hub: the running-late panel and the Settings switch ── */
  const idx = read('index.html');
  const fnSrc = (name) => { let i = idx.indexOf('function ' + name + '('); if (idx.slice(i - 6, i) === 'async ') i -= 6; let d = 0, j = idx.indexOf('{', i); for (let k = j; k < idx.length; k++) { if (idx[k] === '{') d++; else if (idx[k] === '}') { d--; if (!d) return idx.slice(i, k + 1); } } return ''; };
  const hctx = { escapeHtmlComms: (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])), LN_VIEW: {}, String, JSON, Object, Array };
  vm.createContext(hctx); vm.runInContext(fnSrc('lnBody'), hctx);
  hctx.LN_VIEW.i1 = { ...LBASE, call: { line: LINE_K, quote: "I'm running late, I'll be to April's in 8 minutes", missed_clockin_paused_until: '4:44pm' }, family: { can: false, why: 'under 10 minutes late', sent: [] } };
  h = hctx.lnBody('i1');
  ck('Hub card panel: the call line in bold, her words, the pause; the long transcript is not repeated when a quote is there', h.includes('<b>' + LINE_K.replace(/'/g, '&#39;') + '</b>') && /paused until 4:44pm/.test(h) && !/Hi Mary\.\.\./.test(h), h);
  ck('Hub: the missed clock-in card shows "From the call:" and the same running-late panel (Seen, time, family by a tap)', /\(i\.late_call_note && i\.status!=='done' && i\.status!=='resolved' \? '<div[^']*'?/.test(idx) && idx.includes("<b>From the call:</b> '+esc(i.late_call_note)")
    && idx.includes("((i.kind==='late_notice' || i.late_call_note) && i.late_notice_id && i.status!=='done' && i.status!=='resolved' ? lnCardHtml(i) : '')"));
  const sctx = { escapeHtmlComms: hctx.escapeHtmlComms, DATA: { ops_settings: {} }, String, JSON, Object, Array, Date, Number,
    sb: { from: () => ({ select() { return this; }, eq() { return this; }, gte() { return this; }, order() { return Promise.resolve({ data: [] }); } }) } };
  const els = {}; sctx.document = { getElementById: (id) => els[id] || (els[id] = { id, textContent: '', value: '', disabled: false, innerHTML: '' }) };
  vm.createContext(sctx); vm.runInContext(fnSrc('lnSetFill'), sctx);
  await sctx.lnSetFill();
  ck('Settings: the calls switch reads ON when never set ("Turn off calls"), and works while the notices are in practice', els.lnCallBtn.textContent === 'Turn off calls' && els.lnCallBtn.disabled === false && /Calls: ON/.test(els.lnStatus.textContent), [els.lnCallBtn, els.lnStatus.textContent]);
  sctx.DATA.ops_settings = { late_call_live: false }; await sctx.lnSetFill();
  ck('Settings: switched off reads "Turn on calls"', els.lnCallBtn.textContent === 'Turn on calls' && /Calls: off/.test(els.lnStatus.textContent));
  ck('Settings explains it in her words (both ways, a time pauses until 5 minutes after, nothing is texted, the family only by a tap)', /when you or Krystal talk with a caregiver on the office line \(either of you calling, or them calling in\)/.test(idx)
    && /pauses the missed clock-in texts to the admins until 5 minutes after that time/.test(idx) && /Nothing is texted to anyone because of a call; the family only hears when a person taps &quot;Send to the family&quot;|Nothing is texted to anyone because of a call; the family only hears when a person taps "Send to the family"/.test(idx));
  ck('no automatic family switch anywhere in the Hub', !/late_family_auto/.test(idx + read('late.html') + read('clockin.html')));

  /* ── every changed script still parses; no em dashes in what was added ── */
  const bad = [];
  for (const f of ['index.html', 'clockin.html', 'late.html']) {
    const hh = read(f); const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g; let m, i = 0;
    while ((m = re.exec(hh))) { i++; if (/type="(?!text\/javascript)[^"]+"/.test(m[0].slice(0, 60))) continue; try { new vm.Script(m[1]); } catch (e) { bad.push(f + ' script ' + i + ': ' + e.message); } }
  }
  ck('every changed script still parses', bad.length === 0, bad);
  ck('no em dashes in clockin.html, late.html or the new Hub wording', !/\u2014/.test(read('clockin.html') + read('late.html')) && !/\u2014/.test(fnSrc('lnBody') + fnSrc('lnSetFill') + fnSrc('lnSetToggle') + (idx.match(/<p class="hint" id="lnCallHint"[\s\S]*?<\/p>/) || [''])[0]));
  console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
})();

/* node tests/office-call-test.js
   431 (Samantha, 2026-10-03): every staff click-to-call goes from the office line; 433 (her option 1): a tap rings the
   tapper's own phone first through a GoHighLevel call bridge, then connects from the business number.
   The real office-call.js in a fake page (fake document, fake window.open, a fake signed-in sb that records every
   function call), plus the real clockin.html and late.html scripts drawing their Call cards from a fake server, plus
   a scan of every staff Hub file.
   Proves: a Hub call button does nothing until tapped; a tap shows a spinner, asks ghl-call-link for a bridge, then
   says "Ringing your phone now. Answer, then press any key to connect to Ruth." with "Didn't ring? Open in browser ·
   Call from my cell"; every refusal (no GoHighLevel user linked, too soon, workflow not published, GoHighLevel
   refused, not found, several, error) says why and keeps the backups; a double tap sends one request; a link that is
   not ours is never put in an href; the link pages ring the admin through their own sealed link; no staff page keeps a
   bare tel: link; the public pages are untouched; no em dashes. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 900))); };
const OC = read('office-call.js');
const LOC = 'Recp0AhyMh8lrtKJ9kaj';
const APP = (id) => `https://app.leadconnectorhq.com/v2/location/${LOC}/contacts/detail/${id}`;
const WEB = (id) => `https://app.hirecara.com/v2/location/${LOC}/contacts/detail/${id}`;

/* ── a small fake page ── */
function page(extra = {}) {
  const listeners = {}, byId = {}, opened = [], invokes = [];
  const mk = (tag) => { const el = { tag, className: '', innerHTML: '', textContent: '', id: '', style: {}, attrs: {}, children: [], dataset: {}, onclick: null,
    setAttribute(k, v) { this.attrs[k] = String(v); }, getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
    appendChild(c) { this.children.push(c); c.parent = this; if (c.id) byId[c.id] = c; return c; },
    remove() { if (this.parent) this.parent.children = this.parent.children.filter((x) => x !== this); this.removed = true; },
    contains(t) { return t === this || (t && t.inPanel === this); },
    querySelector(sel) { return sel === '.oc-x' ? { addEventListener() {} } : null; },
    addEventListener() {} }; return el; };
  const head = mk('head'), body = mk('body');
  const document = { head, body, createElement: mk, getElementById: (id) => byId[id] || (byId[id] = Object.assign(mk('div'), { id })),
    querySelector: () => null, addEventListener: (t, fn) => { (listeners[t] ||= []).push(fn); } };
  const ctx = { console, JSON, Promise, Object, String, Number, Array, Error, RegExp, Math, Date, URLSearchParams, setTimeout,
    document, location: { search: '?c=tk_1&a=abc&e=9999999999&t=TOK' },
    sb: extra.sb, fetch: extra.fetch };
  ctx.window = ctx; ctx.window.open = (u, t) => { opened.push([u, t]); return extra.blockPopups ? null : {}; };
  vm.createContext(ctx);
  vm.runInContext(OC, ctx);
  const panel = () => body.children.filter((c) => c.className === 'oc-panel').at(-1) || null;
  const tap = async (attrsHtml) => {
    const attrs = {}; String(attrsHtml).replace(/([\w-]+)="([^"]*)"/g, (_, k, v) => { attrs[k] = v.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&'); });
    const a = { getAttribute: (k) => (k in attrs ? attrs[k] : null) };
    let prevented = false, stopped = false;
    const ev = { target: { closest: (s) => (s === '[data-oc-phone]' ? a : null) }, preventDefault() { prevented = true; }, stopPropagation() { stopped = true; } };
    for (const fn of listeners.click || []) fn(ev);
    const spinner = panel() ? panel().innerHTML : '';
    await new Promise((r) => setTimeout(r, 5));
    return { prevented, stopped, spinner, html: panel() ? panel().innerHTML : '' };
  };
  return { ctx, document, byId, opened, invokes, panel, tap };
}
const fakeSb = (answer, log) => ({ functions: { invoke: async (name, o) => { log.push({ name, body: o.body }); return typeof answer === 'function' ? answer(o.body) : answer; } } });

(async () => {
  const OK = (id, name) => ({ data: { ok: true, ringing: 'you', contact_id: id, name, app_url: APP(id), web_url: WEB(id) }, error: null });
  /* ── 1 · the Hub button: attributes only; a tap rings your phone first (433) ── */
  { const log = []; const P = page({ sb: fakeSb(OK('g1', 'Ruth'), log) });
    const at = P.ctx.ocAttrs('(417) 555-0777', { email: 'ann@example.com', client: '701' });
    ck('ocAttrs: href="#", the number in data-oc-phone, email and client carried, no tel: link', /^ href="#"/.test(at) && /data-oc-phone="\(417\) 555-0777"/.test(at) && /data-oc-email="ann@example.com"/.test(at) && /data-oc-client="701"/.test(at) && !/tel:/.test(at), at);
    ck('ocAttrs escapes what it is given', !/"><script/.test(P.ctx.ocAttrs('"><script>')), P.ctx.ocAttrs('"><script>'));
    ck('drawing buttons asks nothing (nothing happens until a tap)', log.length === 0);
    const t = await P.tap(at);
    ck('a tap: the click is taken over (no cell dial, no row click underneath)', t.prevented && t.stopped);
    ck('a tap shows a spinner: "Asking GoHighLevel to ring your phone"', /oc-spin/.test(t.spinner) && /Asking GoHighLevel to ring your phone/.test(t.spinner), t.spinner);
    ck('433: it asks ghl-call-link for a BRIDGE, with the phone, email and client id', log.length === 1 && log[0].name === 'ghl-call-link' && log[0].body.action === 'bridge' && log[0].body.phone === '(417) 555-0777' && log[0].body.email === 'ann@example.com' && log[0].body.axiscare_client_id === '701', log);
    ck('433: "Ringing your phone now. Answer, then press any key to connect to Ruth."', /Ringing your phone now\.<\/b> Answer, then press any key to connect to Ruth\./.test(t.html), t.html);
    ck('433: small "Didn\'t ring? Open in browser · Call from my cell"', /Didn&#39;t ring\? <a href="https:\/\/app\.hirecara\.com\/v2\/location\/[^"]+\/g1"[^>]*>Open in browser<\/a> · <a class="oc-cell" href="tel:4175550777">Call from my cell<\/a>/.test(t.html), t.html);
    ck('433: nothing opens by itself (no LeadConnector tab, no browser tab)', P.opened.length === 0, P.opened);
    await P.tap(at);
    ck('every tap is its own call request (nothing remembered; the server holds the 30-second limit)', log.length === 2, log.length); }

  /* ── 2 · every refusal says why and keeps the backups ── */
  const cases = [
    ['no GoHighLevel user linked: "isn\'t linked yet (Settings → Calls)", browser and cell offered', { data: { ok: false, why: 'no_user', contact_id: 'g1', app_url: APP('g1'), web_url: WEB('g1') }, error: null }, /Your GoHighLevel user isn&#39;t linked yet \(Settings \u2192 Calls\)\./, true],
    ['the token can\'t list users: the server\'s message is shown too', { data: { ok: false, why: 'no_user', message: 'GoHighLevel will not list its users to the Hub, so link yours in Settings, Calls.' }, error: null }, /isn&#39;t linked yet[\s\S]*link yours in Settings, Calls/, false],
    ['too soon: "Try again in 12 seconds"', { data: { ok: false, why: 'too_soon', wait_sec: 12 }, error: null }, /You just started a call\. Try again in 12 seconds\./, false],
    ['the workflow is not published: says so and where the steps are', { data: { ok: false, why: 'no_workflow', web_url: WEB('g1') }, error: null }, /workflow &quot;Hub call bridge&quot; isn&#39;t published[\s\S]*Settings \u2192 Calls/, true],
    ['GoHighLevel refused the assignment: its reason is shown', { data: { ok: false, why: 'assign_failed', message: 'GoHighLevel would not assign Ruth to you (422).' }, error: null }, /did not start the call\. GoHighLevel would not assign Ruth to you \(422\)\./, false],
    ['not found: "Not in GoHighLevel" and the cell', { data: { ok: false, why: 'not_found' }, error: null }, /Not in GoHighLevel/, false],
    ['several on the line: says so, never picks, offers the cell', { data: { ok: false, why: 'several' }, error: null }, /more than one GoHighLevel contact/, false],
    ['the function answers an error: says so and offers the cell', { data: null, error: { message: 'boom' } }, /Could not check GoHighLevel[\s\S]*Could not reach the Hub&#39;s call service/, false],
    ['a browser link that is not ours is never used', { data: { ok: false, why: 'no_user', web_url: 'javascript:alert(1)' }, error: null }, /isn&#39;t linked yet/, false],
  ];
  for (const [name, ans, re, web] of cases) {
    const log = []; const P = page({ sb: fakeSb(ans, log) });
    const t = await P.tap(P.ctx.ocAttrs('417-555-0777'));
    ck(name, re.test(t.html) && /href="tel:4175550777"[^>]*>Call from my cell/.test(t.html) && (web ? t.html.includes('href="' + WEB('g1') + '"') : true) && !/Ringing your phone/.test(t.html) && P.opened.length === 0 && !/javascript:|evil\.example/.test(t.html), t.html);
  }
  { const P = page({ sb: { functions: { invoke: async () => { throw new Error('offline'); } } } }); const t = await P.tap(P.ctx.ocAttrs('4175550777'));
    ck('the request throws (offline): says it could not check, offers the cell', /Could not check GoHighLevel/.test(t.html) && /tel:4175550777/.test(t.html), t.html); }
  { const P = page({}); const t = await P.tap(P.ctx.ocAttrs('4175550777'));
    ck('no sign-in client on the page: says it could not check, offers the cell', /Could not check GoHighLevel/.test(t.html) && /tel:4175550777/.test(t.html), t.html); }
  { let release; const log = []; const P = page({ sb: { functions: { invoke: (n, o) => { log.push(o.body); return new Promise((r) => { release = () => r(OK('g1', 'Ruth')); }); } } } });
    const at = P.ctx.ocAttrs('4175550777'); P.tap(at); await new Promise((r) => setTimeout(r, 1)); P.tap(at); await new Promise((r) => setTimeout(r, 1)); release(); await new Promise((r) => setTimeout(r, 5));
    ck('a double tap while the first is still asking sends ONE request', log.length === 1, log); }

  /* ── 3 · the link pages: the Call button rings the admin's phone through the page's own function ── */
  for (const file of ['clockin.html', 'late.html']) {
    const html = read(file); const script = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));
    const draw = async (view, onBridge) => {
      const posts = [];
      const P = page({ fetch: async (u, o) => { const b = JSON.parse(o.body); posts.push(b); return { ok: true, status: 200, json: async () => (b.action === 'bridge' ? (onBridge ? onBridge(b) : { ok: true, ringing: 'you', name: 'Ruth' }) : view) }; } });
      vm.runInContext(script, P.ctx); await new Promise((r) => setTimeout(r, 10));
      return { h: P.byId.app.innerHTML, P, posts };
    };
    const base = file === 'clockin.html'
      ? { ok: true, me: 'Samantha', caregiver_first: 'Maria', client_first: 'Ruth', shift_time: '9am', minutes_past_start: 8, open: true, reasons: { other: 'other' }, replies: [] }
      : { ok: true, me: 'Samantha', kind: 'late', caregiver_first: 'Maria', client_first: 'Ruth', shift_time: '9am', said: [], family: { can: false, why: 'x', members: 0, first_names: [], sent: [] } };
    const found = { ...base, caregiver_phone: '+14175550111', client_phone: '+14175550777',
      caregiver_ghl: { contact_id: 'gM', app_url: APP('gM'), web_url: WEB('gM') }, client_ghl: { contact_id: 'gR', app_url: APP('gR'), web_url: WEB('gR') } };
    let { h, P, posts } = await draw(found);
    ck(file + ': found: "Call Maria" and "Call Ruth\'s home" are ring-your-phone buttons, numbers shown',
       /data-oc-bridge="caregiver" data-oc-name="Maria"[^>]*>📞 Call Maria · \(417\) 555-0111/.test(h) && /data-oc-bridge="client" data-oc-name="Ruth"[^>]*>📞 Call Ruth&#39;s home · \(417\) 555-0777/.test(h) && !h.includes('href="' + APP('gR') + '"'), h.match(/<h2>Call[\s\S]*$/)?.[0]);
    ck(file + ': found: "Open in browser" (app.hirecara.com) and "Call from my cell" stay on the page', h.includes('href="' + WEB('gR') + '"') && /href="tel:\+14175550777"[^>]*>Call from my cell/.test(h) && /href="tel:\+14175550111"[^>]*>Call from my cell/.test(h));
    const btn = (tgt) => { const m = h.match(new RegExp('<a [^>]*data-oc-bridge="' + tgt + '"[^>]*>')); return m[0]; };
    let t = await P.tap(btn('client'));
    ck(file + ': tapping "Call Ruth\'s home" posts bridge {target: client} with the link, nothing else', posts.filter((b) => b.action === 'bridge').length === 1 && posts.at(-1).target === 'client' && posts.at(-1).c === 'tk_1' && posts.at(-1).t === 'TOK', posts.at(-1));
    ck(file + ': then "Ringing your phone now ... connect to Ruth" with "Didn\'t ring?" backups', /Ringing your phone now\.<\/b> Answer, then press any key to connect to Ruth\./.test(t.html) && /Didn&#39;t ring\?[\s\S]*Open in browser[\s\S]*Call from my cell/.test(t.html), t.html);
    ({ h, P, posts } = await draw(found, () => ({ ok: false, why: 'no_user' })));
    t = await P.tap(btn('caregiver'));
    ck(file + ': an admin with no GoHighLevel user: "isn\'t linked yet (Settings → Calls)" and the backups', posts.at(-1).target === 'caregiver' && /isn&#39;t linked yet \(Settings \u2192 Calls\)/.test(t.html) && /Open in browser/.test(t.html) && /tel:\+14175550111/.test(t.html), t.html);
    ({ h } = await draw({ ...base, caregiver_phone: '+14175550111', client_phone: '+14175550777', caregiver_ghl: null, client_ghl: null }));
    ck(file + ': not in GoHighLevel: says so, no call button, cell link kept', /Not in GoHighLevel/.test(h) && !/data-oc-bridge|leadconnectorhq/.test(h) && /href="tel:\+14175550777"/.test(h), h.match(/<h2>Call[\s\S]*$/)?.[0]);
    ({ h } = await draw({ ...base, caregiver_phone: '+14175550111', client_phone: '+14175550777' }));
    ck(file + ': an older server with no lookup: "GoHighLevel was not checked" and the cell, nothing breaks', /GoHighLevel was not checked/.test(h) && /tel:\+14175550111/.test(h), h.match(/<h2>Call[\s\S]*$/)?.[0]);
    ({ h } = await draw({ ...base, caregiver_phone: null, client_phone: null, caregiver_ghl: null, client_ghl: null }));
    ck(file + ': no numbers: the roster note, no buttons', /No phone for Maria on the roster/.test(h) && !/tel:|leadconnectorhq|data-oc-bridge/.test(h));
    ck(file + ': loads office-call.js (433)', /<script src="office-call\.js\?v=433"><\/script>/.test(html));
  }

  /* ── 3b · ocInline without a bridge function keeps the 431 link (older pages) ── */
  { const P = page({}); const h = P.ctx.ocInline('+14175550777', 'Call Ruth', { contact_id: 'gR', app_url: APP('gR'), web_url: WEB('gR') }, null, 'client');
    ck('ocInline with no page bridge function: the 431 LeadConnector link, unchanged', h.includes('href="' + APP('gR') + '"') && !/data-oc-bridge/.test(h), h); }

  /* ── 4 · the scan: no staff page keeps a bare tel: link ── */
  const PUBLIC = new Set(['welcome.html', 'start.html', 'meet.html', 'caregiver-profile.html', 'reference.html', 'fix-reference.html', 'email-library.js', 'caregiver.html']);
  const files = fs.readdirSync(ROOT).filter((f) => /\.(html|js)$/.test(f) && f !== 'office-call.js');
  const bare = files.filter((f) => !PUBLIC.has(f)).filter((f) => /tel:/.test(read(f)));
  ck('scan: no staff Hub file outside office-call.js has a tel: link (every call is office line first, cell inside the panel)', bare.length === 0, bare);
  const idx = read('index.html'), eng = read('caregivers-engine.js');
  ck('scan: index.html loads office-call.js before the Hub code', /<script src="office-call\.js\?v=433"><\/script>/.test(idx) && idx.indexOf('office-call.js') < idx.indexOf('let sb = null'));
  ck('scan: the office-line helper is used at every former call site (index.html 20: 18 buttons + 2 lead-profile links; caregivers-engine.js 3)',
     (idx.match(/ocAttrs\(/g) || []).length === 18 && (idx.match(/dataset\.ocPhone/g) || []).length === 2 && (eng.match(/ocAttrs\(/g) || []).length === 3,
     { idx: (idx.match(/ocAttrs\(/g) || []).length, ds: (idx.match(/dataset\.ocPhone/g) || []).length, eng: (eng.match(/ocAttrs\(/g) || []).length });
  ck('scan: the public pages (families, applicants, references) still call the office by phone, untouched', ['welcome.html', 'start.html', 'meet.html', 'reference.html', 'fix-reference.html', 'caregiver-profile.html', 'caregiver.html'].every((f) => /tel:/.test(read(f)) && !/office-call\.js/.test(read(f))));
  ck('scan: office-call.js only ever calls ghl-call-link (it never creates a contact or sends anything itself)', !/upsert|conversations|messages|invoke\('(?!ghl-call-link)/.test(OC) && (OC.match(/invoke\(/g) || []).length === 1);
  /* every inline script still parses (the edits are inside long string and template builders) */
  const bad = [];
  for (const f of ['index.html', 'clockin.html', 'late.html']) {
    const h = read(f); const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g; let m, i = 0;
    while ((m = re.exec(h))) { i++; if (/type="(?!text\/javascript)[^"]+"/.test(m[0].slice(0, 60))) continue; try { new vm.Script(m[1]); } catch (e) { bad.push(f + ' script ' + i + ': ' + e.message); } }
  }
  for (const f of ['caregivers-engine.js', 'office-call.js']) { try { new vm.Script(read(f)); } catch (e) { bad.push(f + ': ' + e.message); } }
  ck('every changed script still parses', bad.length === 0, bad);
  ck('no em dashes in office-call.js or the new wording', !/\u2014/.test(OC) && !/\u2014[^\n]*office line|office line[^\n]*\u2014/.test(idx + eng + read('clockin.html') + read('late.html')));
  console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
})();

/* node tests/office-call-test.js
   431 (Samantha, 2026-10-03): "I want it to be like that across the hub for everything that is a click to call, it
   should call from leadconnector app, or just have it say call from office line".
   The real office-call.js in a fake page (fake document, fake window.open, a fake signed-in sb that records every
   function call), plus the real clockin.html and late.html scripts drawing their Call cards from a fake server, plus
   a scan of every staff Hub file.
   Proves: a Hub call button does no lookup until tapped; a tap shows a spinner, asks ghl-call-link only, then opens
   the contact in LeadConnector with "Open in browser" and "Call from my cell"; not found / several / error each say so
   and offer the cell; a link that is not ours is never put in an href; the link pages draw the three buttons from the
   server's lookup; no staff page keeps a bare tel: link; the public pages are untouched; no em dashes. */
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
  /* ── 1 · the Hub button: attributes only, no lookup when the page draws ── */
  { const log = []; const P = page({ sb: fakeSb({ data: { found: true, contact_id: 'g1', app_url: APP('g1'), web_url: WEB('g1') }, error: null }, log) });
    const at = P.ctx.ocAttrs('(417) 555-0777', { email: 'ann@example.com', client: '701' });
    ck('ocAttrs: href="#", the number in data-oc-phone, email and client carried, no tel: link', /^ href="#"/.test(at) && /data-oc-phone="\(417\) 555-0777"/.test(at) && /data-oc-email="ann@example.com"/.test(at) && /data-oc-client="701"/.test(at) && !/tel:/.test(at), at);
    ck('ocAttrs escapes what it is given', !/"><script/.test(P.ctx.ocAttrs('"><script>')), P.ctx.ocAttrs('"><script>'));
    ck('drawing buttons asks nothing (no lookup until a tap)', log.length === 0);
    const t = await P.tap(at);
    ck('a tap: the click is taken over (no cell dial, no row click underneath)', t.prevented && t.stopped);
    ck('a tap shows a spinner while it looks', /oc-spin/.test(t.spinner) && /Finding them in GoHighLevel/.test(t.spinner), t.spinner);
    ck('it asks ghl-call-link only, with the phone, email and client id', log.length === 1 && log[0].name === 'ghl-call-link' && log[0].body.phone === '(417) 555-0777' && log[0].body.email === 'ann@example.com' && log[0].body.axiscare_client_id === '701', log);
    ck('found: it opens the contact in LeadConnector (app.leadconnectorhq.com)', P.opened.length === 1 && P.opened[0][0] === APP('g1'), P.opened);
    ck('found: the panel has "Call" (LeadConnector), "Open in browser" (app.hirecara.com) and "Call from my cell"',
       t.html.includes('href="' + APP('g1') + '"') && /📞 Call</.test(t.html) && t.html.includes('href="' + WEB('g1') + '"') && /Open in browser/.test(t.html)
       && /href="tel:4175550777"[^>]*>Call from my cell/.test(t.html) && /Tap Call on their contact there/.test(t.html), t.html);
    const t2 = await P.tap(at);
    ck('the same number again: no second lookup (remembered for the page)', log.length === 1 && P.opened.length === 2, log.length); }

  /* ── 2 · not found, several, error, a bad link ── */
  const cases = [
    ['not found: "Not in GoHighLevel" and the cell', { data: { found: false, why: 'not_found' }, error: null }, /Not in GoHighLevel/],
    ['several on the line: says so, never picks, offers the cell', { data: { found: false, why: 'several' }, error: null }, /more than one GoHighLevel contact/],
    ['the function answers an error: "Could not check GoHighLevel" and the cell', { data: null, error: { message: 'boom' } }, /Could not check GoHighLevel/],
    ['a link that is not a LeadConnector contact link is never used', { data: { found: true, contact_id: 'x', app_url: 'javascript:alert(1)', web_url: 'https://evil.example/x' }, error: null }, /Could not check GoHighLevel/],
  ];
  for (const [name, ans, re] of cases) {
    const log = []; const P = page({ sb: fakeSb(ans, log) });
    const t = await P.tap(P.ctx.ocAttrs('417-555-0777'));
    ck(name, re.test(t.html) && /href="tel:4175550777"[^>]*>Call from my cell/.test(t.html) && P.opened.length === 0 && !/javascript:|evil\.example/.test(t.html), t.html);
  }
  { const P = page({ sb: { functions: { invoke: async () => { throw new Error('offline'); } } } }); const t = await P.tap(P.ctx.ocAttrs('4175550777'));
    ck('the lookup throws (offline): says it could not check, offers the cell', /Could not check GoHighLevel/.test(t.html) && /tel:4175550777/.test(t.html), t.html); }
  { const P = page({}); const t = await P.tap(P.ctx.ocAttrs('4175550777'));
    ck('no sign-in client on the page: says it could not check, offers the cell', /Could not check GoHighLevel/.test(t.html) && /tel:4175550777/.test(t.html), t.html); }
  { const log = []; const P = page({ sb: fakeSb({ data: { found: true, contact_id: 'g1', app_url: APP('g1'), web_url: WEB('g1') }, error: null }, log), blockPopups: true });
    const t = await P.tap(P.ctx.ocAttrs('4175550777'));
    ck('a phone that blocks the automatic open still gets the tap-to-open button', t.html.includes('href="' + APP('g1') + '"') && !/Opened in LeadConnector/.test(t.html), t.html); }

  /* ── 3 · the link pages: the three buttons from the server's lookup ── */
  for (const file of ['clockin.html', 'late.html']) {
    const html = read(file); const script = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));
    const draw = async (view) => {
      const P = page({ fetch: async () => ({ ok: true, status: 200, json: async () => view }) });
      vm.runInContext(script, P.ctx); await new Promise((r) => setTimeout(r, 10));
      return P.byId.app.innerHTML;
    };
    const base = file === 'clockin.html'
      ? { ok: true, me: 'Samantha', caregiver_first: 'Maria', client_first: 'Ruth', shift_time: '9am', minutes_past_start: 8, open: true, reasons: { other: 'other' }, replies: [] }
      : { ok: true, me: 'Samantha', kind: 'late', caregiver_first: 'Maria', client_first: 'Ruth', shift_time: '9am', said: [], family: { can: false, why: 'x', members: 0, first_names: [], sent: [] } };
    let h = await draw({ ...base, caregiver_phone: '+14175550111', client_phone: '+14175550777',
      caregiver_ghl: { contact_id: 'gM', app_url: APP('gM'), web_url: WEB('gM') }, client_ghl: { contact_id: 'gR', app_url: APP('gR'), web_url: WEB('gR') } });
    ck(file + ': found: "Call Maria" and "Call Ruth\'s home" open LeadConnector, numbers shown',
       h.includes('href="' + APP('gM') + '"') && /📞 Call Maria · \(417\) 555-0111/.test(h) && h.includes('href="' + APP('gR') + '"') && /📞 Call Ruth&#39;s home · \(417\) 555-0777/.test(h), h.match(/<h2>Call[\s\S]*$/)?.[0]);
    ck(file + ': found: each has a small "Open in browser" (app.hirecara.com) and "Call from my cell"', h.includes('href="' + WEB('gR') + '"') && /href="tel:\+14175550777"[^>]*>Call from my cell/.test(h) && /href="tel:\+14175550111"[^>]*>Call from my cell/.test(h));
    h = await draw({ ...base, caregiver_phone: '+14175550111', client_phone: '+14175550777', caregiver_ghl: null, client_ghl: null });
    ck(file + ': not in GoHighLevel: says so, no LeadConnector button, cell link kept', /Not in GoHighLevel/.test(h) && !/leadconnectorhq/.test(h) && /href="tel:\+14175550777"/.test(h), h.match(/<h2>Call[\s\S]*$/)?.[0]);
    h = await draw({ ...base, caregiver_phone: '+14175550111', client_phone: '+14175550777' });
    ck(file + ': an older server with no lookup: "GoHighLevel was not checked" and the cell, nothing breaks', /GoHighLevel was not checked/.test(h) && /tel:\+14175550111/.test(h), h.match(/<h2>Call[\s\S]*$/)?.[0]);
    h = await draw({ ...base, caregiver_phone: null, client_phone: null, caregiver_ghl: null, client_ghl: null });
    ck(file + ': no numbers: the roster note, no buttons', /No phone for Maria on the roster/.test(h) && !/tel:|leadconnectorhq/.test(h));
    ck(file + ': loads office-call.js', /<script src="office-call\.js\?v=431"><\/script>/.test(html));
  }

  /* ── 4 · the scan: no staff page keeps a bare tel: link ── */
  const PUBLIC = new Set(['welcome.html', 'start.html', 'meet.html', 'caregiver-profile.html', 'reference.html', 'fix-reference.html', 'email-library.js', 'caregiver.html']);
  const files = fs.readdirSync(ROOT).filter((f) => /\.(html|js)$/.test(f) && f !== 'office-call.js');
  const bare = files.filter((f) => !PUBLIC.has(f)).filter((f) => /tel:/.test(read(f)));
  ck('scan: no staff Hub file outside office-call.js has a tel: link (every call is office line first, cell inside the panel)', bare.length === 0, bare);
  const idx = read('index.html'), eng = read('caregivers-engine.js');
  ck('scan: index.html loads office-call.js before the Hub code', /<script src="office-call\.js\?v=431"><\/script>/.test(idx) && idx.indexOf('office-call.js') < idx.indexOf('let sb = null'));
  ck('scan: the office-line helper is used at every former call site (index.html 20: 18 buttons + 2 lead-profile links; caregivers-engine.js 3)',
     (idx.match(/ocAttrs\(/g) || []).length === 18 && (idx.match(/dataset\.ocPhone/g) || []).length === 2 && (eng.match(/ocAttrs\(/g) || []).length === 3,
     { idx: (idx.match(/ocAttrs\(/g) || []).length, ds: (idx.match(/dataset\.ocPhone/g) || []).length, eng: (eng.match(/ocAttrs\(/g) || []).length });
  ck('scan: the public pages (families, applicants, references) still call the office by phone, untouched', ['welcome.html', 'start.html', 'meet.html', 'reference.html', 'fix-reference.html', 'caregiver-profile.html', 'caregiver.html'].every((f) => /tel:/.test(read(f)) && !/office-call\.js/.test(read(f))));
  ck('scan: office-call.js only ever calls ghl-call-link (it never creates a contact or sends anything)', !/upsert|conversations|messages|invoke\('(?!ghl-call-link)/.test(OC) && (OC.match(/invoke\(/g) || []).length === 1);
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

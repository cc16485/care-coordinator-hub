/* node tests/call-bridge-settings-433-test.js
   433 · Settings, Calls ("your phone rings first"): the real cbFill / cbParse / cbSave / cbCheck cut out of index.html,
   run with a fake page, a fake tkMerge and a fake ghl-call-link answer.
   Proves: the by-hand links load and save as ops_settings.ghl_user_ids {email: id}; bad lines are refused with the
   line shown; the check shows whether the "Hub call bridge" workflow is published, whether GoHighLevel lists its
   users, and who is linked; the setup steps are on the card; no em dashes. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const cut = (from, to) => { const a = src.indexOf(from), b = src.indexOf(to, a + 1); if (a < 0 || b < 0) throw new Error('not found: ' + from); return src.slice(a, b); };
const block = cut('/* 433 · Settings, Calls', '/* Settings: the three switches');
const card = cut('<div class="settings-section" id="cbSettings" data-set="calls-ring">', '<div class="settings-section" id="cpSettings" data-set="calls-ghl">');
let pass = 0, fail = 0;
const ck = (n, ok, x) => { ok ? pass++ : fail++; console.log((ok ? 'PASS  ' : 'FAIL  ') + n + (ok || x === undefined ? '' : '  ' + JSON.stringify(x).slice(0, 700))); };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function world(ops, answer) {
  const els = {}, merged = [], invokes = [];
  const el = (id) => els[id] || (els[id] = { id, innerHTML: '', textContent: '', value: '', disabled: false });
  const ctx = { console, JSON, Object, String, Array, Promise, RegExp, Number, DATA: { ops_settings: ops }, escapeHtmlComms: esc, document: { getElementById: el },
    tkMerge: async (apply) => { const m = { ...ops }; const ch = apply(m, ops); if (ch.length) merged.push(m); return { changed: ch, error: null }; },
    sb: { functions: { invoke: async (n, o) => { invokes.push([n, o.body]); return answer; } } } };
  vm.createContext(ctx); vm.runInContext(block, ctx);
  return { ctx, el, merged, invokes };
}
(async () => {
  let W = world({ ghl_user_ids: { 'kry@mo-care.com': 'uKry' } });
  W.ctx.cbFill(); ck('cbFill shows the saved links as "email = id"', W.el('set_cb_users').value === 'kry@mo-care.com = uKry', W.el('set_cb_users').value);
  W = world({}); W.el('set_cb_users').value = 'Kry@Mo-Care.com = uKry\n\nsam@mo-care.com=uSam\n'; await W.ctx.cbSave(null);
  ck('cbSave stores {email (lower case): id} in ops_settings.ghl_user_ids', JSON.stringify(W.merged[0]?.ghl_user_ids) === '{"kry@mo-care.com":"uKry","sam@mo-care.com":"uSam"}' && W.el('cbSaved').textContent === 'Saved.', [W.merged, W.el('cbSaved').textContent]);
  W = world({}); W.el('set_cb_users').value = 'krystal = abc\nsam@mo-care.com = bad/id'; await W.ctx.cbSave(null);
  ck('a line that is not "email = id" is refused and shown, nothing saved', !W.merged.length && /Not understood: krystal = abc \| sam@mo-care.com = bad\/id/.test(W.el('cbSaved').textContent), W.el('cbSaved').textContent);
  W = world({ ghl_user_ids: { 'a@b.co': 'x' } }); W.el('set_cb_users').value = ''; await W.ctx.cbSave(null);
  ck('emptying the box removes the links', W.merged.length === 1 && !('ghl_user_ids' in W.merged[0]), W.merged);
  W = world({ ghl_user_ids: { 'a@b.co': 'x' } }); W.el('set_cb_users').value = 'a@b.co = x'; await W.ctx.cbSave(null);
  ck('no change: nothing saved', !W.merged.length && W.el('cbSaved').textContent === 'Nothing changed.');

  W = world({}, { data: { ok: true, configured: true, workflow: 'published', users_api: 'ok', users_count: 4, staff_linked: 1, staff_total: 2, me: 'kat@cc.test',
    staff: [{ email: 'kat@cc.test', name: 'Kat W', linked: true, via: 'gohighlevel' }, { email: 'kry@mo-care.com', name: 'Krystal L', linked: false, via: null }] }, error: null });
  await W.ctx.cbCheck(null); let h = W.el('cbStatus').innerHTML;
  ck('cbCheck asks ghl-call-link {action: setup} only', W.invokes.length === 1 && W.invokes[0][0] === 'ghl-call-link' && W.invokes[0][1].action === 'setup', W.invokes);
  ck('the check: workflow published, users listed, 1 of 2 linked, who is not', /Hub call bridge&quot; workflow is published/.test(h) && /lists its users \(4\)/.test(h) && /1 of 2 office people linked/.test(h) && /✓ Kat W · you/.test(h) && /✗ Krystal L \(not linked/.test(h), h);
  W = world({}, { data: { ok: true, configured: true, workflow: 'missing', users_api: 'no_scope', staff: [], staff_linked: 0, staff_total: 0 }, error: null });
  await W.ctx.cbCheck(null); h = W.el('cbStatus').innerHTML;
  ck('the check: no workflow yet says calls will not ring; no users scope says link by hand', /no workflow named &quot;Hub call bridge&quot;/.test(h) && /Calls will not ring until it is published/.test(h) && /link each person by hand/.test(h), h);
  W = world({}, { data: { ok: true, configured: true, workflow: 'unknown', users_api: 'ok', users_count: 1, staff: [{ email: 'a@b.co', name: 'A', linked: true, via: 'settings' }], staff_linked: 1, staff_total: 1 }, error: null });
  await W.ctx.cbCheck(null); h = W.el('cbStatus').innerHTML;
  ck('the check: workflows can\'t be read says test one call; a by-hand link says so', /Test one call/.test(h) && /linked by hand/.test(h), h);
  W = world({}, { data: null, error: { message: 'x' } }); await W.ctx.cbCheck(null);
  ck('the check fails: says it could not reach the call service', /Could not reach/.test(W.el('cbStatus').textContent));
  ck('the card has the setup steps: name, trigger, Call action whisper + keypress, remove tag, re-entry, publish, staff phones',
     /Hub call bridge/.test(card) && /Contact Tag<\/b>, filter Tag Added = <code>hub-call-bridge/.test(card) && /Caring Companions call to \{\{contact\.first_name\}\} \{\{contact\.last_name\}\}\. Press any key to connect\./.test(card)
     && /Connect call after keypress/.test(card) && /Remove Contact Tag/.test(card) && /Allow re-entry ON/.test(card) && /Publish/.test(card) && /My Staff/.test(card));
  ck('fillSettingsPanel fills the card', /try\{ cbFill\(\); \}catch\(_\)\{\}/.test(src));
  ck('no em dashes in the new card or code', !/—/.test(block + card));
  console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
})();

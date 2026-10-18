"""Engine buttons that were unreachable (2026-10-18 audit). caregivers-engine.js runs in a closure, so a button it draws
works only if its function is put on window. This fires the real inline handlers of the three it had missed (Active
Compliance's row tick, the orientation time preview, Add to roster on a welcome call) and checks none throws, and that the
row tick really feeds the bulk bar. Offline, every server answer faked, nothing saved.
(python3 -m http.server <port> in the repo, then BASE=http://localhost:<port> python3 tests/browser/engine_buttons_look.py)"""
import os
from playwright.sync_api import sync_playwright
BASE = os.environ.get('BASE', 'http://localhost:8794')
FAKE = r"""() => {
  const q = (t) => { const p = new Proxy(function () {}, { get(_, k) {
    if (k === 'then') return (a, b) => Promise.resolve({ data: t === 'app_data' ? [{ key: 'caregivers', data: [{ id: 1, first: 'Jordan', last: 'Test', hire_date: '2026-01-01' }] }] : [], error: null }).then(a, b);
    if (k === 'maybeSingle' || k === 'single') return () => Promise.resolve({ data: null, error: null });
    return () => p; } }); return p; };
  const sess = { user: { id: 'u1', email: 'zach@mo-care.com', app_metadata: { hub_access: ['care_coordinator', 'team_hub', 'staffing'] } }, access_token: 'x' };
  const auth = { getSession: async () => ({ data: { session: sess }, error: null }), getUser: async () => ({ data: { user: sess.user }, error: null }), signOut: async () => ({ error: null }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) };
  const fake = { from: q, rpc: async () => ({ data: null, error: null }), functions: { invoke: async () => ({ data: null, error: { message: 'offline' } }) }, auth, channel: () => { const c = { on: () => c, subscribe: () => c, unsubscribe() {} }; return c; }, removeChannel() {} };
  supabase.createClient = () => fake; sb.from = q; sb.rpc = fake.rpc; sb.auth.getSession = auth.getSession;
  (0, eval)("ME={ email:'zach@mo-care.com', name:'Zach Test', shift:'day' };"); window.ccCan = () => true; window.ccConfirm = async () => false;
}"""
R = []
with sync_playwright() as pw:
    b = pw.chromium.launch()
    pg = b.new_page(viewport={'width': 390, 'height': 844})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:160]))
    pg.route('**/*', lambda r: r.abort() if ('supabase.co' in r.request.url or 'leadconnectorhq' in r.request.url or 'hub.mo-care.com' in r.request.url) else r.continue_())
    pg.goto(BASE + '/index.html?m=hr'); pg.wait_for_timeout(1500)
    pg.evaluate(FAKE); pg.evaluate("phStart()"); pg.wait_for_timeout(500)
    pg.evaluate("HR.go('formal')"); pg.wait_for_timeout(2500)
    R.append(['PASS' if pg.evaluate("!!window.SCX") else 'FAIL', 'the engine is loaded', ''])
    for name, html in (('toggleACSelect', '<input type="checkbox" id="t1" onchange="toggleACSelect(1,this.checked)">'),
                       ('updateOrientGenPreview', '<select id="t2" onchange="updateOrientGenPreview()"><option>a</option><option>b</option></select>'),
                       ('wcRosterAdd', '<button id="t3" onclick="wcRosterAdd(\'none\',this)">Add to roster</button>')):
        errs.clear()
        pg.evaluate("(h) => { const d = document.createElement('div'); d.innerHTML = h; document.body.appendChild(d); }", html)
        el = {'toggleACSelect': '#t1', 'updateOrientGenPreview': '#t2', 'wcRosterAdd': '#t3'}[name]
        if name == 'toggleACSelect': pg.evaluate("document.querySelector('#t1').click()")
        elif name == 'updateOrientGenPreview': pg.evaluate("(() => { const s = document.querySelector('#t2'); s.selectedIndex = 1; s.dispatchEvent(new Event('change')); })()")
        else: pg.evaluate("document.querySelector('#t3').click()")
        pg.wait_for_timeout(300)
        bad = [e for e in errs if name in e]
        R.append(['PASS' if not bad else 'FAIL', f'{name}: its button reaches the function', bad])
    bar = pg.evaluate("(() => { const b = document.getElementById('ac-bulk-bar'); return b ? getComputedStyle(b).display : 'no bar'; })()")
    R.append(['PASS' if bar not in ('none', 'no bar') else 'FAIL', 'ticking an Active Compliance row shows the bulk bar', bar])
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

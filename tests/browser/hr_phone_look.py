"""The HR desk on the phone (2026-10-18, Samantha: "can the button Open the HR Page open only the HR page not the whole
hub - and make it mobile friendly"). index.html?m=hr at phone size, offline, made-up records: every Supabase answer is
faked and nothing is saved or sent. Also: a phone opening an HR link is sent to the HR desk; a computer is not.
(python3 -m http.server 8791 in the repo, then python3 tests/browser/hr_phone_look.py)"""
from playwright.sync_api import sync_playwright
FAKE = r"""
() => {
  const iso = (d) => new Date(Date.now() - d * 864e5).toISOString();
  window.__T = {
    hr_cases: [{ id: 'c1', axiscare_caregiver_id: '1', caregiver: 'Jordan Test', kind: 'recurring', rule: 'w02', title: '3 call-ins in 90 days', facts: [{ date: '2026-10-01', what: 'Called in 2 hours before shift' }], handbook: '2V Attendance', practice: true, status: 'open', created_at: iso(1) },
                { id: 'c2', axiscare_caregiver_id: '2', caregiver: 'Riley Test', kind: 'coaching', rule: 'w03', title: 'Late arrivals', facts: [], handbook: '', practice: true, status: 'open', created_at: iso(2) }],
    hr_coaching: [{ id: 'k1', caregiver: 'Riley Test', axiscare_caregiver_id: '2', kind: 'coaching', topic: 'Late arrivals', status: 'open', assigned_to: 'krystal@mo-care.com', due_on: '2026-10-25', help_at: iso(0.2), help_note: 'Can you join the call?', created_at: iso(2) }],
  };
  const WU = [{ id: 'w1', caregiver: 'Jordan Test', level: 'Verbal Warning', status: 'pending_approval', reason: 'Attendance', created_at: iso(1), body: 'CARING COMPANIONS: CORRECTIVE ACTION NOTICE' },
              { id: 'w2', caregiver: 'Riley Test', level: 'Written Warning', status: 'issued', reason: 'Late arrivals', created_at: iso(20), issued_at: iso(15), body: 'x' }];
  const res = (t) => ({ data: t === 'app_data' ? [{ key: 'discipline_actions', data: WU }] : (window.__T[t] || []), error: null });
  const q = (t) => { const p = new Proxy(function () {}, {
      get(_, k) {
        if (k === 'then') return (ok, bad) => Promise.resolve(res(t)).then(ok, bad);
        if (k === 'maybeSingle' || k === 'single') return () => Promise.resolve({ data: null, error: null });
        return () => p; } }); return p; };
  sb.from = q;
  sb.rpc = async () => ({ data: null, error: null });
  const sess = { user: { id: 'u1', email: 'zach@mo-care.com', app_metadata: { hub_access: ['care_coordinator', 'team_hub', 'staffing'] } }, access_token: 'x' };
  sb.auth.getSession = async () => ({ data: { session: sess }, error: null });
  sb.auth.getUser = async () => ({ data: { user: sess.user }, error: null });
  sb.functions = { invoke: async () => ({ data: null, error: { message: 'offline' } }) };
  /* the write-up engine opens its own client: hand it the same fake */
  const fakeClient = { from: q, rpc: sb.rpc, functions: sb.functions, auth: { signOut: async () => ({ error: null }), getSession: sb.auth.getSession, getUser: sb.auth.getUser, onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    channel: () => { const c = { on: () => c, subscribe: () => c, unsubscribe() {} }; return c; }, removeChannel() {} };
  supabase.createClient = () => fakeClient;
  (0, eval)("ME={ email:'zach@mo-care.com', name:'Zach Test', shift:'day' };");
  window.ccCan = () => true;
  DATA.discipline_actions = [{ id: 'w1', caregiver: 'Jordan Test', level: 'Verbal Warning', status: 'pending_approval', reason: 'Attendance', created_at: iso(1), body: 'CORRECTIVE ACTION NOTICE' }];
}
"""
T = r"""
async () => {
  const R = [], ok = (n, c, d) => R.push([c ? 'PASS' : 'FAIL', n, c ? '' : JSON.stringify(d === undefined ? '' : d).slice(0, 500)]);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  ok('the HR desk is phone mode, HR only', window.CC_PHONE === true && window.CC_PHONE_HR === true && document.documentElement.classList.contains('ph-hr'));
  phStart(); await sleep(900);
  const app = document.getElementById('phApp');
  ok('it shows the HR section and nothing else: no Needs me / Find / Today tabs, no computer screen', !!document.querySelector('#phHr #hrRoot .hr-menu') && !document.querySelector('.ph-tabs') && getComputedStyle(document.getElementById('appScreen')).display === 'none');
  ok('the top bar says HR and has Sign out', /HR/.test(app.querySelector('.ph-top').innerText) && !!document.getElementById('phHrOut'));
  const chips = [...document.querySelectorAll('.hr-item')].map((b) => b.innerText.trim());
  ok("Zach's menu is a row of chips you swipe", chips.length >= 7 && getComputedStyle(document.querySelector('.hr-menu')).flexDirection === 'row' && getComputedStyle(document.querySelector('.hr-menu')).flexWrap === 'nowrap', chips);
  ok('fits the phone: nothing wider than the screen (dashboard)', document.documentElement.scrollWidth <= window.innerWidth + 1, [document.documentElement.scrollWidth, window.innerWidth]);
  return R;
}
"""
VIEW = r"""
async (v) => { const sleep = (ms) => new Promise((r) => setTimeout(r, ms)); HR.go(v); await sleep(v === 'formal' ? 2500 : 700);
  return { v, wide: document.documentElement.scrollWidth <= window.innerWidth + 1, sw: document.documentElement.scrollWidth, text: (document.getElementById('hrMain') || {}).innerText?.slice(0, 160) }; }
"""
with sync_playwright() as pw:
    import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from clock_pin import pin
    b = pw.chromium.launch()
    block = lambda r: r.abort() if ('supabase.co' in r.request.url or 'leadconnectorhq' in r.request.url or 'hub.mo-care.com' in r.request.url) else r.continue_()
    pg = b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    pin(pg); pg.route('**/*', block)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200])); pg.on('console', lambda m: print('CONSOLE', m.text[:200]) if ('hydrate' in m.text.lower() or 'scx' in m.text.lower() or 'caregiver' in m.text.lower()) else None)
    pg.goto('http://localhost:8791/index.html?m=hr'); pg.wait_for_timeout(1500)
    pg.evaluate(FAKE)
    R = pg.evaluate(T)
    pg.screenshot(path='tests/browser/hr_phone_home.png')
    for v in ('practice', 'formal', 'oversight', 'coaching', 'attendance', 'terminations', 'handbook', 'role'):
        r = pg.evaluate(VIEW, v)
        R.append(['PASS' if r['wide'] else 'FAIL', f'fits the phone: {v}', '' if r['wide'] else r])
        if v in ('practice', 'formal', 'coaching'): pg.screenshot(path=f'tests/browser/hr_phone_{v}.png', full_page=False)
    # the write-up window, full screen
    pg.evaluate("HR.go('formal')"); pg.wait_for_timeout(800)
    pg.evaluate("""async()=>{ SCX.renderWriteups(); await new Promise(r=>setTimeout(r,300)); }""")
    R.append(['PASS' if pg.evaluate("document.documentElement.scrollWidth<=window.innerWidth+1 && /Jordan Test/.test(document.getElementById('wuList').innerText)") else 'FAIL', 'the write-up list shows and fits the phone', pg.evaluate("[document.documentElement.scrollWidth, document.getElementById('wuList').innerText.slice(0,200)]")])
    pg.screenshot(path='tests/browser/hr_phone_formal.png')
    opened = pg.evaluate("""async()=>{ SCX.openWriteup('w1'); await new Promise(r=>setTimeout(r,500));
      const m=document.getElementById('writeup-modal'); if(!m) return 'no window';
      const md=m.querySelector('.modal'); return { open:m.classList.contains('open'), inBody:m.parentNode===document.body, w:md.getBoundingClientRect().width, vw:window.innerWidth, wide:document.documentElement.scrollWidth<=window.innerWidth+1 }; }""")
    R.append(['PASS' if isinstance(opened, dict) and opened['open'] and opened['inBody'] and opened['w'] >= opened['vw'] - 1 else 'FAIL', 'a write-up opens full screen on the phone', opened])
    pg.screenshot(path='tests/browser/hr_phone_writeup.png')
    back = pg.evaluate("(()=>{ const b=document.querySelector('#writeup-modal .ph-close button'); if(!b) return 'no back'; const top=b.getBoundingClientRect().top; b.click(); return { top, closed: !document.getElementById('writeup-modal').classList.contains('open') }; })()")
    R.append(['PASS' if isinstance(back, dict) and back['top'] < 80 and back['closed'] else 'FAIL', 'the window has Back at the top, and it closes it', back])
    # a phone opening the alert's link goes to the HR desk; a computer keeps the Hub
    p2 = b.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True); p2.route('**/*', block)
    p2.goto('http://localhost:8791/index.html#hr/formal'); p2.wait_for_timeout(1200)
    R.append(['PASS' if 'm=hr' in p2.url and p2.url.endswith('#hr/formal') else 'FAIL', "a phone opening the alert's link lands on the HR desk", p2.url])
    p3 = b.new_page(viewport={'width': 1280, 'height': 800}); p3.route('**/*', block)
    p3.goto('http://localhost:8791/index.html#hr'); p3.wait_for_timeout(1200)
    R.append(['PASS' if 'm=hr' not in p3.url and p3.evaluate('window.CC_PHONE') is False else 'FAIL', 'a computer opening it keeps the Hub (its HR page)', p3.url])
    p4 = b.new_page(viewport={'width': 390, 'height': 844}); p4.route('**/*', block)
    p4.goto('http://localhost:8791/index.html?m=1'); p4.wait_for_timeout(1000)
    R.append(['PASS' if p4.evaluate('window.CC_PHONE===true && window.CC_PHONE_HR===false') else 'FAIL', 'the CC Office phone app (?m=1) is unchanged', ''])
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, dd in R: print(s_, '·', n, '' if s_ == 'PASS' else dd)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

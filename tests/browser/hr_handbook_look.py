"""The HR Handbook view with topics (2026-10-18, Samantha: the HR look "is not as good as you have here with the topics",
meaning the Handbook Rules Index page). Offline, the real approved rules from hr-agent/hr_handbook.sql; nothing is saved.
(python3 -m http.server 8791 in the repo, then python3 tests/browser/hr_handbook_look.py)"""
import json, os, re, sys
from playwright.sync_api import sync_playwright
SQL = os.path.expanduser('~/Claude/Projects/hr-agent/hr_handbook.sql')
HB = json.loads(re.search(r'\$h\$(.*?)\$h\$', open(SQL).read(), re.S).group(1))
FAKE = r"""
(HB) => {
  const one = (t) => { const p = new Proxy(function () {}, { get(_, k) {
      if (k === 'then') return (ok, bad) => Promise.resolve({ data: [], error: null }).then(ok, bad);
      if (k === 'maybeSingle' || k === 'single') return () => Promise.resolve({ data: t === 'app_data' ? { data: HB } : null, error: null });
      return () => p; } }); return p; };
  sb.from = one; sb.rpc = async () => ({ data: null, error: null });
  const sess = { user: { id: 'u1', email: 'krystal@mo-care.com', app_metadata: { hub_access: ['care_coordinator'] } }, access_token: 'x' };
  sb.auth.getSession = async () => ({ data: { session: sess }, error: null });
  (0, eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Test', shift:'day' };");
}
"""
T = r"""
async () => {
  const R = [], ok = (n, c, d) => R.push([c ? 'PASS' : 'FAIL', n, c ? '' : JSON.stringify(d === undefined ? '' : d).slice(0, 400)]);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  HR.go('handbook'); await sleep(700);
  const chips = () => [...document.querySelectorAll('#hrHbChips .hr-chip')];
  const count = () => document.querySelector('#hrHbList .field-note').innerText;
  ok('topic chips like the index: All topics, the topics, Serious only', chips()[0].innerText === 'All topics' && chips().some((c) => c.innerText === 'Attendance') && chips().at(-1).innerText === 'Serious only', chips().map((c) => c.innerText));
  ok('every rule shows, grouped under its handbook section', /^(\d+) of \1 rules$/.test(count()) && document.querySelectorAll('.hr-sec').length > 10, count());
  ok('each rule card has its topic tag and the handbook words', !!document.querySelector('.hr-rc .hr-tag') && !!document.querySelector('.hr-rc .hr-quote'));
  chips().find((c) => c.innerText === 'Attendance').click(); await sleep(100);
  const att = count();
  ok('Attendance narrows to attendance rules only', !/^(\d+) of \1/.test(att) && [...document.querySelectorAll('.hr-rc .hr-tag')].every((t) => t.innerText === 'Attendance') && chips().find((c) => c.innerText === 'Attendance').getAttribute('aria-pressed') === 'true', att);
  chips().at(-1).click(); await sleep(100);
  ok('Serious only on top of a topic', [...document.querySelectorAll('.hr-rc')].every((r) => r.querySelector('.hr-serious')), count());
  chips().at(-1).click(); chips()[0].click(); await sleep(100);
  ok('All topics brings everything back', /^(\d+) of \1 rules$/.test(count()), count());
  const q = document.getElementById('hrHbQ'); q.value = 'gifts'; q.dispatchEvent(new Event('input')); await sleep(100);
  ok('search still works', document.querySelectorAll('.hr-rc').length > 0 && /gift/i.test(document.getElementById('hrHbList').innerText), count());
  q.value = 'zzqx'; q.dispatchEvent(new Event('input')); await sleep(100);
  ok('no match says so', /No rule matches/.test(document.getElementById('hrHbList').innerText));
  q.value = ''; q.dispatchEvent(new Event('input')); await sleep(100);
  ok('fits the screen', document.documentElement.scrollWidth <= window.innerWidth + 1, [document.documentElement.scrollWidth, window.innerWidth]);
  return R;
}
"""
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from clock_pin import pin
R = []
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for name, opts, url in (('desktop', dict(viewport={'width': 1280, 'height': 900}), 'index.html'),
                            ('phone', dict(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True), 'index.html?m=hr')):
        pg = b.new_page(**opts); pin(pg)
        pg.route('**/*', lambda r: r.abort() if ('supabase.co' in r.request.url or 'leadconnectorhq' in r.request.url or 'hub.mo-care.com' in r.request.url) else r.continue_())
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        pg.goto('http://localhost:8791/' + url); pg.wait_for_timeout(1500)
        pg.evaluate(FAKE, HB)
        if name == 'phone': pg.evaluate("phStart()"); pg.wait_for_timeout(900)
        else:
            pg.add_script_tag(url='http://localhost:8791/hr.js?v=test'); pg.wait_for_timeout(300)
            pg.evaluate("""() => { document.getElementById('appScreen').style.display = 'block'; document.querySelectorAll('.tabpanel').forEach((t) => t.classList.remove('active'));
              document.getElementById('tab-hr').classList.add('active'); document.getElementById('tab-hr').style.display = 'block'; HR.render('handbook'); }"""); pg.wait_for_timeout(600)
        for r in pg.evaluate(T): R.append([r[0], f'{name}: {r[1]}', r[2]])
        R.append(['PASS' if not errs else 'FAIL', f'{name}: no page errors', errs])
        pg.evaluate("HR.go('handbook')"); pg.wait_for_timeout(400)
        pg.evaluate("(() => { const l = document.getElementById('signinScreen'); if (l) l.style.display = 'none'; document.getElementById('hrHbQ').scrollIntoView({ block: 'start' }); window.scrollBy(0, -60); })()"); pg.wait_for_timeout(200)
        pg.screenshot(path=f'tests/browser/hr_handbook_{name}.png')
    b.close()
for s, n, d in R: print(s, n, d)
print(f"{sum(1 for r in R if r[0] == 'PASS')}/{len(R)} passed"); sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

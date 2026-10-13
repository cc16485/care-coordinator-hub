"""2026-10-13: the Applicant Journey tab's "See a real applicant's journey" box. The real page offline, made-up offers.
python3 tests/browser/apj_person_look.py"""
import os, socket, subprocess, sys, time
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
s_ = socket.socket(); s_.bind(('127.0.0.1', 0)); PORT = s_.getsockname()[1]; s_.close()
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '-d', ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
R = []
ok = lambda n, c, d='': R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:300]))
try:
  with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1100, 'height': 900})
    pg.route('**/*supabase.co/**', lambda r: r.fulfill(status=200, content_type='application/json', body='{}'))
    pg.goto(f'http://127.0.0.1:{PORT}/index.html'); pg.wait_for_timeout(1200)
    pg.evaluate("""() => { OFFERS = [
      { id:'11111111-2222-3333-4444-555555555555', first_name:'Robin', last_name:'Newpath', phone:'4175550301', email:'robin@practice.invalid', position:'Caregiver', onboarding_path:'new', created_at:'2026-10-12T15:00:00Z' },
      { id:'22222222-2222-3333-4444-555555555555', first_name:'Olive', last_name:'Oldpath', phone:'4175550302', position:'CNA', onboarding_path:'old', created_at:'2026-10-01T15:00:00Z' },
      { id:'33333333-2222-3333-4444-555555555555', first_name:'Pat', last_name:'Practice (TEST)', phone:'', position:'Caregiver', onboarding_path:'new', created_at:'2026-10-11T15:00:00Z' } ];
      window.HPCALLS = []; window.HP = { open: (k) => HPCALLS.push(k) };
      document.querySelectorAll('.tabpanel').forEach(p => p.classList.remove('active')); document.getElementById('tab-apjourney').classList.add('active'); }""")
    FILL = lambda v: pg.evaluate("(v) => { document.getElementById('apjPerson').value = v; apjPersonFind(); }", v)
    FILL('robin'); pg.wait_for_timeout(500); t = pg.evaluate("document.getElementById('apjPersonList').textContent")
    ok('a name finds the person, says new path, and offers both buttons', 'Robin Newpath' in t and 'new path' in t and 'Their whole journey' in t and pg.locator('#apjPersonList a[href="step1.html?review=11111111-2222-3333-4444-555555555555"]').count() == 1, t)
    pg.evaluate("document.querySelector('#apjPersonList button').click()")
    ok('Their whole journey opens their page by offer', pg.evaluate('HPCALLS')[0] == {'offer_id': '11111111-2222-3333-4444-555555555555'}, pg.evaluate('HPCALLS'))
    FILL('0302'); pg.wait_for_timeout(500); t = pg.evaluate("document.getElementById('apjPersonList').textContent")
    ok('phone digits find an old-path person; no Step 1 screens button on the old path', 'Olive Oldpath' in t and 'old path' in t and pg.locator('#apjPersonList a').count() == 0, t)
    FILL('pat'); pg.wait_for_timeout(500); t = pg.evaluate("document.getElementById('apjPersonList').textContent")
    ok('a practice person is marked practice', 'practice' in t, t)
    FILL('zzzz'); pg.wait_for_timeout(500)
    ok('nobody: says where applicants without an offer are', 'Applicants tab' in pg.evaluate("document.getElementById('apjPersonList').textContent"))
    b.close()
finally:
  srv.terminate()
for s, n, d in R: print(s, ' ', n, ('  ' + d) if d else '')
print(f"{sum(r[0] == 'PASS' for r in R)}/{len(R)} passed"); sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

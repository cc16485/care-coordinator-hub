"""Step 1 DRIVING SCREEN, CLEAR (2026-11-21, Samantha: "make sure that the step one paperwork is clear, because it seems many are
doing this and it may be by mistake"; all 11 Step 1 Non-Drivers had said on their application they have a license and a car).
step1.html?preview=1 with the server's read-only preview run offline from the Staffing code. Screen 8: what each answer means
before they choose, buttons that say the whole answer, and a "Just to check" before the Non-Driver form with an easy way back.
python3 tests/browser/step1_driving_clear_look.py <Staffing supabase/functions> tests/browser/step1_preview_srv.mjs [screenshot dir]"""
import json, sys, os, subprocess, threading, http.server, functools, socketserver
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
_srv = socketserver.TCPServer(('127.0.0.1', 0), functools.partial(http.server.SimpleHTTPRequestHandler, directory=os.path.abspath(os.path.join(HERE, '..', '..'))))
_srv.RequestHandlerClass.log_message = lambda *a: None; threading.Thread(target=_srv.serve_forever, daemon=True).start()
PAGE = 'http://127.0.0.1:%d/step1.html?preview=1' % _srv.server_address[1]
FNDIR, SRV = sys.argv[1], sys.argv[2]; OUT = sys.argv[3] if len(sys.argv) > 3 else '/tmp'
def handle(route, request):
    b = request.post_data or '{}'
    out = subprocess.run(['node', SRV, FNDIR], input=b, capture_output=True, text=True, timeout=60).stdout
    return route.fulfill(status=200, content_type='application/json', body=out or '{}')
R = []
ok = lambda n, c, d='': R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:400]))
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_context(viewport={'width': 390, 'height': 844}).new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.route('**/functions/v1/step1-sign', handle)
    pg.goto(PAGE); pg.wait_for_timeout(2500)
    pg.wait_for_function("() => /Welcome/.test(document.getElementById('main').innerText)", timeout=60000)
    pg.evaluate("() => { delete ANS.transport_willing; go('8'); delete ANS.transport_willing; render(); }"); pg.wait_for_timeout(300)
    t = pg.inner_text('#main')
    ok('before choosing: why it matters and what Yes and No each mean, Yes naming the photos', 'Many of our clients need a ride' in t and 'photos of your driver\'s license (front and back) and your auto insurance card' in t and "won't be able to work with clients who have transportation on their care plan" in t, t[:600])
    ok('the buttons say the whole answer', pg.locator('.seg button', has_text='Yes, I can drive clients').count() == 1 and pg.locator('.seg button', has_text="No, I won't drive clients").count() == 1)
    pg.screenshot(path=os.path.join(OUT, 'step1_driving_choose.png'), full_page=True)
    pg.locator('.seg button', has_text="No, I won't drive clients").click(); pg.wait_for_timeout(400)
    t = pg.inner_text('#main')
    ok('No: "Just to check" comes first, saying they will not work with clients who need rides; no Non-Driver form yet', 'just to check' in t.lower() and 'Is that right?' in t and pg.locator('.nd-check').count() == 1 and 'Non-Driver Agreement &' not in t, t[:1200])
    pg.screenshot(path=os.path.join(OUT, 'step1_driving_check.png'), full_page=True)
    pg.click('.nd-check button.back'); pg.wait_for_timeout(500)
    t = pg.inner_text('#main')
    ok('"I can drive clients" switches the answer to Yes and shows the driver agreement', pg.evaluate('ANS.transport_willing') == 'yes' and 'just to check' not in t.lower() and 'Driver/Vehicle' in t, t[:500])
    pg.locator('.seg button', has_text="No, I won't drive clients").click(); pg.wait_for_timeout(400)
    pg.click(".nd-check button.go"); pg.wait_for_timeout(500)
    t = pg.inner_text('#main')
    ok('"Yes, I won\'t drive clients" goes on to the Non-Driver form', pg.evaluate('ANS.transport_willing') == 'no' and 'just to check' not in t.lower() and 'Non-Driver' in t, t[:500])
    ok('no em dash on the screen', '—' not in t)
    ok('no page errors', not errs, errs)
    b.close()
_srv.shutdown()
for r in R: print(r[0], ' ', r[1], ' ', r[2])
print('\n%d/%d passed' % (sum(1 for r in R if r[0] == 'PASS'), len(R)))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

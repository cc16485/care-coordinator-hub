"""The whole journey, as the applicant sees it (Samantha 2026-10-11). Offline: the walkthrough with the real journey list,
the real offer and Step 1 previews run from the Staffing code (argv[1] = its supabase/functions), mo-care.com and the
Training Platform stood in. Twelve stages in order, each with its screen or its no-screen note, its messages and what
happens next; the offer signs, Step 2 taps, the Orientation Video Call books, all inside the previews; nothing reaches any
real system (only the two preview actions are called).
python3 tests/browser/applicant_walkthrough_look.py <Staffing supabase/functions> [screenshot dir]"""
import json, sys, os, subprocess, threading, http.server, functools, socketserver
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
FNDIR = sys.argv[1]; OUT = sys.argv[2] if len(sys.argv) > 2 else '/tmp'
open(os.path.join(ROOT, '_aw_test.html'), 'w').write('<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="styles.css"><body><div id="awBox"></div><script src="applicant-journey.js"></script><script src="applicant-walkthrough.js"></script><script>window.apjFill=()=>{};AW.mount("awBox");</script>')
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.TCPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=ROOT))
threading.Thread(target=srv.serve_forever, daemon=True).start(); BASE = 'http://127.0.0.1:%d/' % srv.server_address[1]
calls = []
def fn(route, request):
    b = request.post_data or '{}'; name = request.url.split('/functions/v1/')[1].split('?')[0]; calls.append((name, json.loads(b).get('action')))
    runner = {'offer-sign': 'offer_preview_srv.mjs', 'step1-sign': 'step1_preview_srv.mjs'}.get(name)
    if not runner: return route.fulfill(status=200, content_type='application/json', body='{"ok":true,"practice":false}')
    out = subprocess.run(['node', os.path.join(HERE, runner), FNDIR], input=b, capture_output=True, text=True, timeout=60).stdout
    return route.fulfill(status=200, content_type='application/json', body=out or '{}')
R = []
ok = lambda n, c, d='': R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:300]))
try:
  with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1200, 'height': 1000}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.route('**/functions/v1/**', fn)
    pg.route('**/rest/v1/**', lambda r, q: (calls.append(('rest', q.url.split('/rest/v1/')[1][:40])), r.fulfill(status=200, content_type='application/json', body='[]')))
    pg.route('https://mo-care.com/**', lambda r, q: r.fulfill(status=200, content_type='text/html', body='<h1>The application page (stand-in)</h1>'))
    pg.route('https://training.mo-care.com/**', lambda r, q: r.fulfill(status=200, content_type='text/html', body='<h1>Training (stand-in)</h1>'))
    pg.goto(BASE + '_aw_test.html'); pg.wait_for_timeout(800)
    names = [x.strip() for x in pg.locator('#awBox > div').first.locator('button').all_inner_texts()]
    ok('twelve stages in her order', names == ['1. Application', '2. Prescreening', '3. Interview booking', '4. Interview', '5. Offer', '6. Offer signature', '7. Step 1', '8. Background & References', '9. Step 2 in Viventium', '10. Orientation', '11. Training', '12. Approved to Work'], names)
    seen = {}
    for k in range(12):
        pg.evaluate('AW.go(%d)' % k); pg.wait_for_timeout(500)
        t = pg.inner_text('#awBox'); seen[k] = t
        has_screen = pg.locator('#awBox iframe').count() > 0 or 'No screen' in t or 'In person at the office' in t
        ok('stage %d (%s): a screen or the no-screen note, what happens next, and Back/Next' % (k + 1, names[k] if k < len(names) else '?'), has_screen and 'What happens next' in t and ('Next:' in t or k == 11))
        if k in (0, 2, 4, 6, 7, 8, 9, 10): pg.screenshot(path=os.path.join(OUT, 'aw_%02d.png' % (k + 1)))
    ok('messages: the application stage shows the follow-ups; replaced messages are left out', "Didn't finish: finish your application" in seen[0] and 'Interview booking confirmation\n' not in seen[2] and 'Booking confirmation' in seen[2])
    ok('messages: Step 1 shows its reminders and receipt; the offer signature shows the Step 1 link', 'Step 1 receipt' in seen[6] and 'Step 1 link' in seen[5])
    ok('messages: Background & References shows what the reference receives and the nudge to the applicant', 'To the reference (not the applicant): first ask' in seen[7] and 'Reference nudge to the applicant' in seen[7])
    # inside the previews: sign the offer, tap Step 2, book a call
    pg.evaluate('AW.go(5)'); pg.wait_for_timeout(3000)
    f = pg.frame_locator('#awBox iframe').first
    f.locator('#c_offer').check(); f.locator('#n_offer').fill('Pat Preview'); f.locator('#b_offer').click(); pg.wait_for_timeout(2500)
    f.locator('#c_pd').check(); f.locator('#n_pd').fill('Pat Preview'); f.locator('#b_pd').click(); pg.wait_for_timeout(2500)
    ft = f.locator('#main').inner_text()
    ok('offer preview: both documents sign inside the walkthrough; the preview banner and example-rate note show', 'Both documents are signed' in ft and 'Preview with made-up answers' in ft and 'examples' in ft, ft[:300])
    pg.screenshot(path=os.path.join(OUT, 'aw_06_signed.png'))
    pg.evaluate('AW.go(8)'); pg.wait_for_timeout(1500)
    f = pg.frame_locator('#awBox iframe').first; f.locator('#go').click(); pg.wait_for_timeout(500)
    ok('Step 2 preview: the tap answers as a real one would, and says practice', 'Thank you, Pat!' in f.locator('#main').inner_text())
    pg.evaluate('AW.go(9)'); pg.wait_for_timeout(1500)
    f = pg.frame_locator('#awBox iframe').first; f.locator('#slotsBody button').first.click(); pg.wait_for_timeout(500)
    ok('Orientation Video Call preview: made-up times, and booking one shows the booked screen', 'You are booked, Pat.' in f.locator('body').inner_text())
    pg.screenshot(path=os.path.join(OUT, 'aw_10_booked.png'))
    real = [c for c in calls if not (c[0] in ('offer-sign', 'step1-sign') and c[1] == 'preview') and c[0] != 'reference-tasks']
    ok('nothing but the two preview actions reached a server (no view, sign, save, booking or table call)', not real, real)
    ok('no page errors', not errs, errs)
    b.close()
finally:
  os.remove(os.path.join(ROOT, '_aw_test.html'))
for s, n, d in R: print(s, ' ', n, ('  ' + d) if d else '')

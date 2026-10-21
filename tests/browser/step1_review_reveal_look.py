"""Step 1 office view: the Reveal box (Samantha 2026-10-21: "it still opens the pdf and doesnt let us"). step1.html?review=<offer>
with a fake staff sign-in; the review answer is the real server's preview (made-up Pat) plus a made-up identity on file. The reveal
is faked: 987-65-4321, a number never issued. Checks: buttons only for what is on file, a reason is required before anything is
asked, one field per request with the reason, the value shows with a countdown, is wiped when it ends, never lands in storage.
python3 tests/browser/step1_review_reveal_look.py <Staffing supabase/functions> tests/browser/step1_preview_srv.mjs [screenshot dir]"""
import json, sys, os, subprocess, threading, http.server, functools, socketserver
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
_srv = socketserver.TCPServer(('127.0.0.1', 0), functools.partial(http.server.SimpleHTTPRequestHandler, directory=os.path.abspath(os.path.join(HERE, '..', '..'))))
_srv.RequestHandlerClass.log_message = lambda *a: None; threading.Thread(target=_srv.serve_forever, daemon=True).start()
OID = '11111111-1111-4111-8111-111111111111'
PAGE = 'http://127.0.0.1:%d/step1.html?review=%s' % (_srv.server_address[1], OID)
FNDIR, SRV = sys.argv[1], sys.argv[2]; OUT = sys.argv[3] if len(sys.argv) > 3 else '/tmp'
PREV = json.loads(subprocess.run(['node', SRV, FNDIR], input='{}', capture_output=True, text=True, timeout=60).stdout)
REVIEW = dict(PREV); REVIEW.pop('preview', None)
REVIEW.update({'identity': {'ssn': 'ending 4321', 'dob': True, 'license': None}, 'signed': {}, 'completed_at': '2026-10-19T23:01:20Z'})
asked = []
def handle(route, request):
    b = json.loads(request.post_data or '{}'); asked.append(b)
    if b.get('action') == 'review': return route.fulfill(status=200, content_type='application/json', body=json.dumps(REVIEW))
    if b.get('action') == 'reveal':
        v = {'ssn': '987654321', 'dob': '1990-05-05'}[b['field']]
        return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'field': b['field'], 'value': v, 'expires_in': 3, 'by': 'Krystal'}))
    return route.fulfill(status=200, content_type='application/json', body='{"ok":true}')
R = []
ok = lambda n, c, d='': R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:300]))
with sync_playwright() as pw:
    br = pw.chromium.launch(); ctx = br.new_context(viewport={'width': 390, 'height': 844}); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.add_init_script("localStorage.setItem('sb-zngsgedlsxinbygwmxwn-auth-token', JSON.stringify({access_token:'staff-token'}))")
    pg.route('**/functions/v1/step1-sign', handle)
    pg.goto(PAGE); pg.wait_for_timeout(2500)
    t = pg.inner_text('#main')
    ok('the summary opens with the Reveal box', 'reveal for the checks' in t.lower(), t[-600:])
    ok('buttons only for what is on file: SSN and date of birth, no license', pg.locator('#rvBox button:has-text("Reveal (5 min)")').count() == 2 and "Driver's license number" not in pg.inner_text('#rvBox'))
    pg.locator('#rvBox button:has-text("Reveal (5 min)")').first.click(); pg.wait_for_timeout(300)
    ok('no reason: refused on the page, nothing asked of the server', 'Please type why first' in pg.inner_text('#rv_err') and not [a for a in asked if a.get('action') == 'reveal'])
    pg.fill('#rv_reason', 'FCSR registration'); pg.locator('#rvBox button:has-text("Reveal (5 min)")').first.click(); pg.wait_for_timeout(500)
    rv = [a for a in asked if a.get('action') == 'reveal']
    ok('one request: the SSN only, with the reason, this offer, the staff sign-in', len(rv) == 1 and rv[0] == {'action': 'reveal', 'offer_id': OID, 'field': 'ssn', 'reason': 'FCSR registration'}, rv)
    box = pg.inner_text('#rvBox')
    ok('the SSN shows with a countdown, a Copy and a Hide; the date of birth still locked; the reason kept', '987654321' in box and 'hides in' in box and pg.locator('#rvBox button:has-text("Copy")').count() == 1 and pg.locator('#rvBox button:has-text("Reveal (5 min)")').count() == 1 and pg.input_value('#rv_reason') == 'FCSR registration', box)
    pg.screenshot(path=os.path.join(OUT, 'reveal_shown.png'), full_page=True)
    st = pg.evaluate("JSON.stringify(localStorage) + JSON.stringify(sessionStorage) + location.href")
    ok('the value is in no storage and not in the address', '987654321' not in st)
    pg.wait_for_timeout(3600)
    ok('when the countdown ends the value is wiped and the button is back', '987654321' not in pg.inner_text('#main') and pg.locator('#rvBox button:has-text("Reveal (5 min)")').count() == 2)
    pg.select_option('.pbar select', '5b'); pg.wait_for_timeout(500)
    ok('the background-details screen has the Reveal box too', pg.locator('#rvBox').count() == 1 and 'reveal for the checks' in pg.inner_text('#main').lower(), pg.inner_text('h1'))
    pg.locator('#rvBox button:has-text("Reveal (5 min)")').nth(1).click(); pg.wait_for_timeout(500)
    ok('the date of birth reveals on its own request there', '1990-05-05' in pg.inner_text('#rvBox') and [a for a in asked if a.get('action') == 'reveal'][-1]['field'] == 'dob')
    pg.locator('#rvBox button:has-text("Hide")').click(); pg.wait_for_timeout(200)
    ok('Hide wipes it at once', '1990-05-05' not in pg.inner_text('#main'))
    ok('no em dash in the box', '—' not in pg.inner_text('#rvBox'))
    pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)[:200])); pg.route('**/functions/v1/step1-sign', handle); pg.goto(PAGE + '#reveal'); pg.wait_for_timeout(2500)
    ok('#reveal (the profile button) opens straight at the Reveal box with the reason box ready', pg.evaluate("document.activeElement && document.activeElement.id === 'rv_reason'") and pg.evaluate("(() => { const r = document.getElementById('rvBox').getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; })()"))
    ok('no page errors', not errs, errs)
    br.close()
for r in R: print(r[0], '·', r[1], r[2])
print(sum(1 for r in R if r[0] == 'PASS'), '/', len(R))

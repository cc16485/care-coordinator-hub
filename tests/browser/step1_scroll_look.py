"""Step 1 page (Samantha 2026-10-11, station 2): "every single form pops to the top after each answer" and "its hard to click
these". Offline, the server faked from a real view (step1_sign_2b_test.mjs with DUMP_VIEW). An answer keeps the screen where
it is; moving to another screen starts at the top; the answer buttons are a full thumb tall and share the row.
python3 tests/browser/step1_scroll_look.py <step1_view.json> [screenshot dir]"""
import json, sys, os
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); PAGE = 'file://' + os.path.abspath(os.path.join(HERE, '..', '..', 'step1.html')) + '?o=x&e=1&t=y'
VIEW = json.load(open(sys.argv[1])); OUT = sys.argv[2] if len(sys.argv) > 2 else '/tmp'
VIEW.update({'esign_consent_at': '2026-10-11T00:00:00Z', 'current_screen': '7', 'answers': {}, 'signatures': {k: {'at': 'x', 'typed_name': 'Pat', 'version': 1} for k in ['employee_application', 'reference_consent', 'fcra_disclosure', 'edl_fcsr_consent', 'availability']}})
saves = []
def handle(route, request):
    b = json.loads(request.post_data or '{}'); a = b.get('action')
    if a == 'view': return route.fulfill(status=200, content_type='application/json', body=json.dumps(VIEW))
    if a == 'save': saves.append(b); return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True}))
    return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True}))
R = []
ok = lambda n, c, d='': R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:300]))
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 390, 'height': 800}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.route('**/functions/v1/step1-sign', handle)
    pg.goto(PAGE); pg.wait_for_timeout(800)
    head = pg.inner_text('#main')[:400]
    ok('the experience screen opens (Client population is on it)', 'Client population' in pg.inner_text('#main'), head)
    row = pg.locator('.row', has_text='Bedbound clients').first
    row.scroll_into_view_if_needed(); pg.wait_for_timeout(200)
    y0 = pg.evaluate('window.scrollY')
    btn = row.locator('button', has_text='Yes').first
    box = btn.bounding_box()
    ok('the answer button is a full thumb tall (at least 48px) and wide (at least 120px)', box and box['height'] >= 48 and box['width'] >= 120, box)
    btn.click(); pg.wait_for_timeout(300)
    y1 = pg.evaluate('window.scrollY')
    ok('after answering far down the screen, the page stays where it was (no jump to the top)', y0 > 300 and abs(y1 - y0) < 5, (y0, y1))
    ok('the answer is shown as chosen and saved', pg.locator('.row', has_text='Bedbound clients').first.locator('button.on', has_text='Yes').count() == 1 and any('specialties' in (s.get('answers') or {}) for s in saves), saves[-1:] )
    row2 = pg.locator('.row', has_text="Parkinson's disease").first; row2.scroll_into_view_if_needed(); y2 = pg.evaluate('window.scrollY')
    row2.locator('button', has_text='Not at this time').first.click(); pg.wait_for_timeout(300)
    ok('a second answer higher up also stays put', abs(pg.evaluate('window.scrollY') - y2) < 5, (y2, pg.evaluate('window.scrollY')))
    for name in ["Alzheimer's disease", "Parkinson's disease"]:
        r_ = pg.locator('.row', has_text=name).first; r_.scroll_into_view_if_needed(); r_.locator('button', has_text='Yes').first.click(); pg.wait_for_timeout(200)
        ok('a row with an apostrophe answers: ' + name, r_.locator('button.on', has_text='Yes').count() == 1)
    ch = pg.locator('button', has_text="None, I'm new to caregiving.").first
    if ch.count():
        ch.scroll_into_view_if_needed(); ch.click(); pg.wait_for_timeout(200)
        ok('a choice with an apostrophe answers ("None, I\'m new to caregiving.")', pg.locator('button.on', has_text="None, I'm new to caregiving.").count() == 1)
    pg.screenshot(path=os.path.join(OUT, 'step1_scroll_look.png'))
    ok('no page errors', not errs, errs)
    b.close()
for s, n, d in R: print(s, ' ', n, ('  ' + d) if d else '')

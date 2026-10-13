"""2026-10-13 (Samantha: sign one form, saved at once, move to the next; never shown as signed until the server confirms;
a failed save keeps the form and its entries with a safe retry; no duplicate signatures; reopening the link goes to the
first incomplete form; "Form 4 of 12" over their own forms). Offline: a stateful fake server that keeps signatures the way
step1-sign does (write once; a second sign answers 409 already). Chromium and WebKit.
python3 tests/browser/step1_submit_look.py <step1_view.json> [out dir]"""
import json, sys, os, copy
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); PAGE = 'file://' + os.path.abspath(os.path.join(HERE, '..', '..', 'step1.html')) + '?o=11111111-2222-3333-4444-555555555555&e=9999999999&t=x'
BASE = json.load(open(sys.argv[1]))
R = []
def ck(n, c, d=''): R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:300]))
def run(eng, p):
    st = {'answers': {'transport_willing': 'no'}, 'sigs': {}, 'calls': [], 'mode': 'ok', 'screen': '2', 'esign': '2026-10-13T03:00:00Z'}
    order = [f['key'] for f in BASE['forms'] if not f.get('when') or st['answers'].get(f['when']['id']) == f['when']['equals']]
    def view():
        v = copy.deepcopy(BASE); v['answers'] = st['answers']; v['signatures'] = {k: {'at': x, 'typed_name': 'Pat Practice', 'version': 1} for k, x in st['sigs'].items()}
        v['esign_consent_at'] = st['esign']; v['current_screen'] = st['screen']; v['signed_count'] = len(st['sigs']); v['form_count'] = len(order); v['test_mode'] = False
        v['completed_at'] = '2026-10-13T04:00:00Z' if len(st['sigs']) == len(order) else None; return v
    def handle(route, request):
        b = json.loads(request.post_data or '{}'); a = b.get('action'); st['calls'].append((a, b.get('form')))
        if a == 'view': return route.fulfill(status=200, content_type='application/json', body=json.dumps(view()))
        if a == 'save':
            st['answers'].update(b.get('answers') or {}); st['screen'] = b.get('screen') or st['screen']; return route.fulfill(status=200, content_type='application/json', body='{"ok":true,"saved":1,"rejected":[]}')
        if a == 'sign':
            f = b['form']
            if st['mode'] == 'fail500': return route.fulfill(status=500, content_type='application/json', body='{"ok":false,"error":"Something went wrong. Nothing was changed."}')
            if f in st['sigs']: return route.fulfill(status=409, content_type='application/json', body=json.dumps({'ok': False, 'error': 'This form is already signed.', 'already': True}))
            st['sigs'][f] = '2026-10-13T03:%02d:00Z' % len(st['sigs'])
            if st['mode'] == 'drop': st['mode'] = 'ok'; return route.abort('connectionreset')   # saved on the server, the answer never arrives
            done = len(st['sigs']) == len(order)
            return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'form': f, 'signed_at': st['sigs'][f], 'version': 1, 'pdf': True, 'done': done, 'signed_count': len(st['sigs']), 'form_count': len(order)}))
        if a == 'copies': return route.fulfill(status=200, content_type='application/json', body='{"ok":true,"copies":{}}')
        return route.fulfill(status=200, content_type='application/json', body='{"ok":true}')
    b = getattr(p, eng).launch(); ctx = b.new_context(viewport={'width': 390, 'height': 844}); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.route('**/functions/v1/step1-sign', handle)
    def sign_here(name='Pat Practice'):
        pg.locator('#c_sign').check(); pg.fill('#n_sign', name); pg.click('#b_sign'); pg.wait_for_timeout(700)
    pg.goto(PAGE); pg.wait_for_timeout(900)
    # straight to the application's sign screen (screen 3) and sign it
    pg.evaluate("go('3')"); pg.wait_for_timeout(300)
    t = pg.inner_text('.prog')
    ck(f'{eng}: the progress says "Form 1 of {len(order)}", counted over their own forms (Non-Driver path)', f'Form 1 of {len(order)}' in t, t)
    sign_here(); signed1 = list(st['sigs'])
    ck(f'{eng}: signing saves that one form at once and moves to the next form', signed1 == ['employee_application'] and 'Form 2 of' in pg.inner_text('.prog'), (signed1, pg.inner_text('.prog')))
    # a save that goes through on the server but the answer is lost: shown as NOT signed, entries kept, retry is safe
    st['mode'] = 'drop'; pg.locator('#c_sign').check(); pg.fill('#n_sign', 'Pat Practice'); pg.click('#b_sign'); pg.wait_for_timeout(900)
    ck(f'{eng}: the answer never arrived: the form is NOT shown as signed, the name stays, the button offers a retry', 'could not reach' in pg.inner_text('#e_sign') and pg.input_value('#n_sign') == 'Pat Practice' and 'Try again' in pg.inner_text('#b_sign'), pg.inner_text('#main')[:200])
    pg.click('#b_sign'); pg.wait_for_timeout(900)
    ck(f'{eng}: the retry finds it already saved: no second signature, the page moves on', list(st['sigs']).count('reference_consent') == 1 and 'Form 3 of' in pg.inner_text('.prog') and sum(1 for a, f in st['calls'] if a == 'sign' and f == 'reference_consent') == 2, (st['sigs'], pg.inner_text('.prog')))
    # a server error: stays, keeps entries, nothing recorded
    pg.evaluate("go('5a')"); pg.wait_for_timeout(300); st['mode'] = 'fail500'
    st['answers'].update({'edl_listed': 'no', 'fcsr_listed': 'No', 'convicted': 'no'})
    sign_here(); ck(f'{eng}: a failed save: still on the form, its words shown, nothing signed, the name kept', 'fcra_disclosure' not in st['sigs'] and 'Something went wrong' in pg.inner_text('#e_sign') and pg.input_value('#n_sign') == 'Pat Practice', pg.inner_text('#e_sign'))
    st['mode'] = 'ok'
    # double tap: one sign call only
    n0 = sum(1 for a, f in st['calls'] if a == 'sign' and f == 'fcra_disclosure')
    pg.locator('#c_sign').check(); pg.fill('#n_sign', 'Pat Practice'); pg.evaluate("document.getElementById('b_sign').click(); document.getElementById('b_sign').click();"); pg.wait_for_timeout(900)
    n1 = sum(1 for a, f in st['calls'] if a == 'sign' and f == 'fcra_disclosure')
    ck(f'{eng}: a double tap sends one signature', n1 - n0 == 1 and list(st['sigs']).count('fcra_disclosure') == 1, (n0, n1))
    # closing the browser and reopening the link: straight to the first incomplete form, signed forms stay signed
    st['screen'] = '5b'; pg.goto('about:blank'); pg.goto(PAGE); pg.wait_for_timeout(900)
    t = pg.inner_text('#main')
    ck(f'{eng}: reopening the link lands on the first form not signed yet, with 3 of {len(order)} signed', 'Details for the Background Checks' in t and f'3 of {len(order)} signed' in pg.inner_text('.prog'), (pg.inner_text('.prog'), t[:200]))
    # they had moved ahead to screen 7 with an earlier form still unsigned: reopening still goes to the first unsigned form
    st['screen'] = '7'; pg.goto('about:blank'); pg.goto(PAGE); pg.wait_for_timeout(900)
    ck(f'{eng}: even after moving ahead, reopening goes to the first unsigned form', 'Details for the Background Checks' in pg.inner_text('#main'), pg.inner_text('#main')[:200])
    ck(f'{eng}: no page errors', not errs, errs[:2])
    b.close()
with sync_playwright() as p:
    for eng in ('chromium', 'webkit'): run(eng, p)
for r in R: print(f'{r[0]:6} {r[1]} {r[2]}')
print(f"{sum(r[0] == 'PASS' for r in R)}/{len(R)} passed"); sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

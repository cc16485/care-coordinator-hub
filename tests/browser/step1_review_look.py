"""2026-10-13: the office view of a real applicant's Step 1 (step1.html?review=<offer>), offline. The server is faked from the
real form texts (step1_view.json made by step1_sign_2b_test with DUMP_VIEW); nothing reaches production.
Run: python3 tests/browser/step1_review_look.py <step1_view.json> [out dir]"""
import json, sys, os
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); OFFER = '11111111-2222-3333-4444-555555555555'
PAGE = 'file://' + os.path.abspath(os.path.join(HERE, '..', '..', 'step1.html')) + '?review=' + OFFER
VIEW = json.load(open(sys.argv[1])); OUT = sys.argv[2] if len(sys.argv) > 2 else '/tmp'
ANS = {'preferred_name': 'Robin', 'lived_outside_mo': 'no', 'windows': {'Monday': {'Morning': True}, 'Sunday': {'Not available': True}}, 'hours_ideal': 30, 'initials': 'RT',
       'professional_refs': [{'name': 'Jane Example', 'company': 'Home Helpers', 'role': 'Supervisor', 'phone': '417-555-0181', 'may_contact': 'yes'}]}
SIGNED = {'employee_application': {'at': '2026-10-12T15:00:00Z', 'typed_name': 'Robin Test', 'version': 2, 'current_version': 3, 'version_mismatch': True, 'ip': '203.0.113.9', 'pdf': True},
          'reference_consent': {'at': '2026-10-12T15:05:00Z', 'typed_name': 'Robin Test', 'version': 3, 'current_version': 3, 'version_mismatch': False, 'ip': '203.0.113.9', 'pdf': True}}
calls = []
ST = {}
def handle(route, request):
    body = json.loads(request.post_data or '{}'); calls.append((body.get('action'), request.headers.get('authorization', '')))
    if body.get('action') == 'review':
        if body.get('offer_id') != OFFER: return route.fulfill(status=400, content_type='application/json', body='{"ok":false,"error":"Which offer?"}')
        v = dict(VIEW); v.update({'review': True, 'who': {'first': 'Robin', 'last': 'Test', 'phone': '(417) 555-0100', 'email': 'robin@practice.invalid', 'position': 'Caregiver'}, 'answers': ANS,
            'signatures': {k: {'at': x['at'], 'typed_name': x['typed_name'], 'version': x['version']} for k, x in SIGNED.items()}, 'signed': SIGNED, 'identity': {'ssn': 'ending 4321', 'dob': True, 'license': None},
            'started_at': '2026-10-12T14:50:00Z', 'esign_consent_at': '2026-10-12T14:51:00Z', 'esign_consent_detail': {'ip': '203.0.113.9'}, 'completed_at': None, 'current_screen': '5a', 'signed_count': 2, 'sent_at': '2026-10-12T14:00:00Z', 'test_mode': False, 'countersign_forms': ['reference_consent'], 'countersignatures': ST.get('cs', {}), 'may_countersign': True})
        return route.fulfill(status=200, content_type='application/json', body=json.dumps(v))
    if body.get('action') == 'countersign':
        if not body.get('consent') or len((body.get('typed_name') or '').split()) < 2: return route.fulfill(status=400, content_type='application/json', body=json.dumps({'ok': False, 'error': 'Please tick that you are signing for Caring Companions first.'}))
        ST['cs'] = {body['form']: {'at': '2026-10-13T15:00:00Z', 'typed_name': body['typed_name'], 'by_name': 'Samantha'}}; ST['cs_auth'] = request.headers.get('authorization', '')
        return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'form': body['form']}))
    if body.get('action') == 'open': return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'url': 'about:blank#' + body.get('form', '')}))
    return route.fulfill(status=400, content_type='application/json', body='{"ok":false,"error":"refused in the test: ' + str(body.get('action')) + '"}')
R = []
def ck(n, c, d=''): R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:300]))
with sync_playwright() as p:
    b = p.chromium.launch()
    # signed out: a clear message, no call made with a staff token
    pg = b.new_page(viewport={'width': 390, 'height': 844}); pg.route('**/functions/v1/step1-sign', handle); pg.goto(PAGE); pg.wait_for_timeout(700)
    ck('signed out of the Hub: "sign in to the Hub first", nothing shown', 'sign in to the Hub' in pg.inner_text('body'), pg.inner_text('body')[:200])
    pg.close(); calls.clear()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}); ctx.add_init_script("localStorage.setItem('sb-zngsgedlsxinbygwmxwn-auth-token', JSON.stringify({access_token: 'staff-token-xyz'}))")
    pg = ctx.new_page(); pg.route('**/functions/v1/step1-sign', handle); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(PAGE); pg.wait_for_timeout(800); t = pg.inner_text('body')
    ck('the review asks with the staff sign-in, never the link', calls and calls[0] == ('review', 'Bearer staff-token-xyz'), calls[:2])
    ck('summary: name, sent/opened/e-sign times with device, 2 of their forms signed, where they stopped', 'Step 1 for Robin Test' in t and 'Agreed to sign electronically' in t and '203.0.113.9' in t and ('2 of %d forms signed' % VIEW['form_count']) in t, t[:600])
    ck('summary: every form listed with signer, time and version; the older-version note', t.count('See the screen') == len([f for f in VIEW['forms'] if not f.get('when') or f['key'] == 'vehicle']) and 'Signed by Robin Test' in t and 'current wording is version 3' in t, (t.count('See the screen'), 'current wording is version 3' in t, 'Signed by Robin Test' in t))
    ck('identity stays sealed: only "ending 4321"', 'ending 4321' in t and '987' not in t)
    pg.locator('button', has_text='See the screen').first.click(); pg.wait_for_timeout(300); t = pg.inner_text('body')
    ck('screen 2 shows their own answers (preferred name Robin), the office bar, no sign box, no Begin', pg.locator('input[data-id="preferred_name"]').input_value() == 'Robin' and 'Office view of Robin Test' in t and pg.locator('#b_sign').count() == 0, t[:300])
    ck('every answer box is locked (nothing can be typed)', pg.locator('#main input:not([disabled]):not([type=hidden])').count() == 0, pg.locator('#main input:not([disabled])').count())
    pg.select_option('.pbar select', '3'); pg.wait_for_timeout(300); t = pg.inner_text('body')
    ck('screen 3: signed line with the version note and the signed PDF button', 'They signed version 2; the words shown are version 3' in t and pg.locator('button', has_text='Open the signed PDF').count() == 1, t[:400])
    pg.select_option('.pbar select', '4'); pg.wait_for_timeout(300); t = pg.inner_text('body')
    ck('an agreement marked for the company: the Sign for Caring Companions box on the office view', 'Sign for Caring Companions' in t and pg.locator('#cs_name').count() == 1, t[:300])
    pg.click('text=Sign for Caring Companions >> nth=-1'); pg.wait_for_timeout(300)
    ck('...refused without the tick, with the reason', 'tick' in pg.inner_text('#e_cs'), pg.inner_text('#e_cs'))
    pg.check('#cs_ok'); pg.fill('#cs_name', 'Samantha Troutman'); pg.click('button:has-text("Sign for Caring Companions")'); pg.wait_for_timeout(600); t = pg.inner_text('body')
    ck('...signed with the staff sign-in; the screen now shows who signed for the company', ST.get('cs_auth') == 'Bearer staff-token-xyz' and 'Signed for Caring Companions by Samantha Troutman' in t, t[:300])
    pg.select_option('.pbar select', '6'); pg.wait_for_timeout(300); t = pg.inner_text('body')
    ck('screen 6 (not signed): "Not signed yet", their availability ticks shown, initials shown, no sign box', 'Not signed yet' in t and pg.locator('.row.day').nth(0).locator('input').nth(0).is_checked() and pg.locator('#b_sign').count() == 0, t[:300])
    ck('moving between screens saved nothing (only review calls, plus the company signature pressed on purpose)', all(a in ('review', 'countersign') for a, _ in calls), calls)
    pg.screenshot(path=os.path.join(OUT, 'step1_review_screen6.png'), full_page=False)
    ck('no page errors', not errs, errs)
    b.close()
for r in R: print(f'{r[0]:6} {r[1]} {r[2]}')
print(f"{sum(r[0] == 'PASS' for r in R)}/{len(R)} passed"); sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

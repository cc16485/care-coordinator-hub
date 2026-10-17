"""Client Care Agreement, Stage 3 (874, 2026-10-17): signing from home. The office sends the link from the fill page
("Send to sign from home"); the family opens sign.html#t=... on a phone, gets a 6-digit code, fills in, initials and
signs, with no Hub sign-in. Offline: the Hub folder is served locally; client-agreement and agreement-sign are fakes in
the test (every call recorded). Chromium and WebKit; the family at phone size (390) and tablet size (768).
python3 tests/browser/agreement_home_look.py [screenshot dir]"""
import json, sys, os, threading, http.server, functools
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp'
FIELDS = json.load(open(os.path.join(HERE, 'agreement_fields.json')))
OFFICE_KEYS = ['level.wellness_care', 'level.personal_care', 'level.advanced_care', 'level.hourly_rate', 'rates.wellness_care', 'rates.personal_care', 'rates.advanced_care']
SERVER_ONLY = lambda k: k.startswith(('ini.', 'sig.', 'ci.sig.', 'date.')) or k in ('poa.initials', 'ci.client_s_name')
INITIALS = {str(n): f'Part {n}' for n in range(1, 7)}
FORM = {'doc': 'client-care-agreement', 'version': 'Rev. 10/2026', 'esign_words': 'I agree to sign this Client Care Agreement electronically.', 'initials': INITIALS, 'fields': FIELDS, 'office_keys': OFFICE_KEYS}
TOKEN = 'pL-Y5CyZWDovmYgOw8ant1Xf8DCEh9YKZPL5DgNrjU4'
R = []
def ck(n, c, d=''): R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:600]))
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=ROOT))
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f'http://127.0.0.1:{srv.server_address[1]}'
SESSION = {'access_token': 'kr', 'refresh_token': 'r', 'token_type': 'bearer', 'expires_in': 3600, 'expires_at': 4102444800, 'user': {'id': 'u-kr', 'email': 'kr@mo-care.com', 'aud': 'authenticated', 'role': 'authenticated', 'app_metadata': {}, 'user_metadata': {}}}
ANS = {'c1.name': 'Nancy Anderson', 'c1.cell_phone': '417-863-7309', 'c1.email': 'nancy@example.com'}

def J(route, code, o): route.fulfill(status=code, content_type='application/json', headers={'access-control-allow-origin': '*'}, body=json.dumps(o))
def office_fake(st):
    def h(route, req):
        if req.method == 'OPTIONS': return route.fulfill(status=200, headers={'access-control-allow-origin': '*', 'access-control-allow-headers': '*'}, body='ok')
        b = json.loads(req.post_data or '{}'); st['calls'].append(b); a = b.get('action')
        if a == 'get': return J(route, 200, {'ok': True, 'agreement': st['ag'], 'form': FORM})
        if a == 'save': st['ag']['answers'] = b['answers']; return J(route, 200, {'ok': True})
        if a == 'link_send':
            if st.get('late'): return J(route, 200, {'ok': False, 'outcome': 'not_sent', 'sent': [], 'error': 'Texts and emails to families go between 8am and 6pm Central. Send it then.'})
            st['ag']['link'] = {'to_name': b['to_name'], 'to_phone': '(417) ***-7309', 'to_email': None, 'created_at': '2026-10-17T15:00:00Z', 'expires_at': '2026-10-24T15:00:00Z', 'sent_by': 'kr@mo-care.com', 'live': True}
            return J(route, 200, {'ok': True, 'outcome': 'sent', 'sent': [{'channel': c, 'outcome': 'sent', 'detail': 'Texted.' if c == 'sms' else 'Emailed.'} for c in b['channels']], 'link': st['ag']['link']})
        if a == 'link_cancel': return J(route, 200, {'ok': True, 'outcome': 'cancelled'})
        return J(route, 400, {'error': 'x'})
    return h
def public_fake(st):
    def h(route, req):
        if req.method == 'OPTIONS': return route.fulfill(status=200, headers={'access-control-allow-origin': '*', 'access-control-allow-headers': '*'}, body='ok')
        st['auth'].append(req.headers.get('authorization'))
        b = json.loads(req.post_data or '{}'); st['calls'].append(b); a = b.get('action')
        if b.get('t') != TOKEN: return J(route, 404, {'error': 'This link does not work. Please call Caring Companions at (417) 234-8494.', 'outcome': 'bad_link'})
        if st.get('signed'): return J(route, 200, {'ok': True, 'state': 'signed'})
        if a == 'open': return J(route, 200, {'ok': True, 'state': 'need_code', 'to_name': 'Nancy Anderson', 'options': [{'via': 'sms', 'to': '(417) ***-7309'}, {'via': 'email', 'to': 'n****@example.com'}]})
        if a == 'code': return J(route, 200, {'ok': True, 'outcome': 'sent', 'to': '(417) ***-7309' if b['via'] == 'sms' else 'n****@example.com'})
        if a == 'verify':
            if b.get('code', '').replace(' ', '') != '123456': return J(route, 400, {'error': 'That code is not right. 4 tries left.', 'outcome': 'wrong'})
            return J(route, 200, {'ok': True, 's': 'S' * 43, 'agreement': st['ag'], 'form': FORM, 'to_name': 'Nancy Anderson'})
        if b.get('s') != 'S' * 43 or st.get('expire'): return J(route, 401, {'error': 'For your privacy, please confirm it is you again.', 'outcome': 'need_code'})
        if a == 'get': return J(route, 200, {'ok': True, 'agreement': st['ag'], 'form': FORM, 'to_name': 'Nancy Anderson'})
        if a == 'save':
            bad = [k for k in b['answers'] if k not in FIELDS or k in OFFICE_KEYS or SERVER_ONLY(k)]
            if bad: return J(route, 422, {'error': 'Some answers are not right.'})
            st['ag']['answers'] = b['answers']; return J(route, 200, {'ok': True})
        if a == 'sign': st['signedBody'] = b; return J(route, 200, {'ok': True, 'outcome': 'signed', 'at': '2026-10-17T20:00:00Z'})
        return J(route, 400, {'error': 'x'})
    return h

def draw(page, sel):
    bx = page.locator(sel).bounding_box()
    page.mouse.move(bx['x'] + 20, bx['y'] + bx['height'] * .7); page.mouse.down()
    for i in range(1, 10): page.mouse.move(bx['x'] + 20 + i * 25, bx['y'] + bx['height'] * (.3 if i % 2 else .7), steps=3)
    page.mouse.up()

with sync_playwright() as p:
    for eng in ('chromium', 'webkit'):
        br = getattr(p, eng).launch()
        # ---------- the office sends the link ----------
        ctx = br.new_context(viewport={'width': 1024, 'height': 768})
        ctx.add_init_script('localStorage.setItem("sb-zngsgedlsxinbygwmxwn-auth-token", %s)' % json.dumps(json.dumps(SESSION)))
        pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        st = {'calls': [], 'ag': {'id': '11111111-1111-4111-8111-111111111111', 'status': 'draft', 'version': 'Rev. 10/2026', 'office': {'answers': {'level.personal_care': True, 'level.hourly_rate': '32'}}, 'answers': dict(ANS), 'link': None}}
        pg.route('**/functions/v1/client-agreement', office_fake(st))
        pg.goto(BASE + '/agreement.html?id=11111111-1111-4111-8111-111111111111&cn=Edward%20Anderson'); pg.wait_for_selector('#homeCard')
        pg.click('#homeCard summary')
        ck(f'{eng} office: "Send to sign from home" is filled from the primary contact and the client\'s name, text and email ticked',
           pg.input_value('#hName') == 'Nancy Anderson' and pg.input_value('#hPhone') == '417-863-7309' and pg.input_value('#hEmail') == 'nancy@example.com' and pg.input_value('#hCN') == 'Edward Anderson' and pg.is_checked('#hSms') and pg.is_checked('#hMail'))
        pg.uncheck('#hSms'); pg.uncheck('#hMail'); pg.click('#hSend')
        ck(f'{eng} office: nothing ticked: it says so and sends nothing', 'Tick Text it, Email it, or both' in pg.inner_text('#hMsg') and not any(c['action'] == 'link_send' for c in st['calls']))
        st['late'] = True; pg.check('#hSms'); pg.click('#hSend'); pg.wait_for_timeout(400)
        ck(f'{eng} office: after 6pm it says when texts can go', 'Not sent' in pg.inner_text('#hMsg') and '8am and 6pm' in pg.inner_text('#hMsg'))
        st['late'] = False; pg.click('#hSend'); pg.wait_for_timeout(400)
        ls = [c for c in st['calls'] if c['action'] == 'link_send'][-1]
        ck(f'{eng} office: it saves first, then sends to the person, by the ways ticked, with the client\'s name',
           [c['action'] for c in st['calls']][-2:] == ['save', 'link_send'] and ls['to_name'] == 'Nancy Anderson' and ls['channels'] == ['sms'] and ls['phone'] == '417-863-7309' and ls['client_name'] == 'Edward Anderson', ls)
        ck(f'{eng} office: sent, and it says Needs Attention will say when they sign', 'Text: Texted.' in pg.inner_text('#hMsg') and 'Needs Attention' in pg.inner_text('#hMsg'))
        pg.reload(); pg.wait_for_selector('#homeCard')
        ck(f'{eng} office: reopened, the link is shown with who, when, until when, and a Cancel button', 'Link sent to Nancy Anderson ((417) ***-7309)' in pg.inner_text('#homeCard') and 'Not opened yet' in pg.inner_text('#homeCard') and pg.locator('#linkCancel').count() == 1)
        pg.click('#linkCancel'); pg.wait_for_timeout(300)
        ck(f'{eng} office: Cancel the link', any(c['action'] == 'link_cancel' for c in st['calls']) and 'cancelled' in pg.inner_text('#linkNow'))
        ck(f'{eng} office: no page errors', not errs, errs)
        ctx.close()
        # ---------- the family, from home ----------
        for w, h in ((390, 844), (768, 1024)):
            name = f'{eng}-{w}'
            ctx = br.new_context(viewport={'width': w, 'height': h})
            pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            st = {'calls': [], 'auth': [], 'ag': {'id': '11111111-1111-4111-8111-111111111111', 'status': 'draft', 'version': 'Rev. 10/2026', 'office': {'answers': {'level.personal_care': True, 'level.hourly_rate': '32'}}, 'answers': dict(ANS)}}
            pg.route('**/functions/v1/agreement-sign', public_fake(st))
            pg.route('**/functions/v1/client-agreement', lambda route, req: J(route, 500, {'error': 'the family page must never call the staff door'}))
            pg.goto(BASE + '/sign.html#t=' + TOKEN); pg.wait_for_selector('[data-via="sms"]')
            ck(f'{name}: sign.html opens the agreement page with the link, greets them, no Hub sign-in, no Back to the Hub', 'agreement.html#t=' in pg.url and 'Hi Nancy!' in pg.inner_text('#view') and not pg.locator('#gate').is_visible() and not pg.locator('#backLink').is_visible(), pg.url)
            ck(f'{name}: offers the code by text or email, masked', pg.inner_text('[data-via="sms"]') == 'Text me a code at (417) ***-7309' and pg.inner_text('[data-via="email"]') == 'Email me a code at n****@example.com')
            pg.screenshot(path=os.path.join(OUT, f'home-code-{name}.png'))
            pg.click('[data-via="sms"]'); pg.wait_for_selector('#code')
            ck(f'{name}: "We sent a code to (417) ***-7309. It works for 10 minutes."', 'We sent a code to (417) ***-7309' in pg.inner_text('#codeMsg'))
            pg.fill('#code', '111111'); pg.click('#codeGo'); pg.wait_for_timeout(300)
            ck(f'{name}: a wrong code says how many tries are left', '4 tries left' in pg.inner_text('#codeMsg'))
            pg.fill('#code', '123 456'); pg.press('#code', 'Enter'); pg.wait_for_selector('[data-tap="1"]')
            ck(f'{name}: the right code opens their agreement: the real pages, their answers, typeable blanks', pg.locator('.pg').count() == 23 and pg.locator('input[data-k="c1.name"]').input_value() == 'Nancy Anderson' and pg.locator('input[data-k]').count() > 50)
            ck(f'{name}: no "Office: back" button for the family at home', not pg.locator('#backBtn').is_visible())
            ck(f'{name}: every call carried the link and never a Hub sign-in', all(c.get('t') == TOKEN for c in st['calls']) and not any(a and a.startswith('Bearer') for a in st['auth']), st['auth'])
            ck(f'{name}: the name on the link fills in "who is signing"', pg.input_value('#sName') == 'Nancy Anderson')
            pg.click('[data-role="representative"]'); pg.fill('#sRel', 'Wife')
            for k, v in {'client.client_s_name': 'Edward Anderson', 'client.address': '1 Elm', 'client.city': 'Springfield', 'client.zip': '65804', 'client.phone_number': '4175550100', 'poa.name': 'Nancy Anderson', 'c1.relationship': 'Wife', 'backup.full_name': 'Tom', 'backup.primary_phone': '4175550111'}.items():
                pg.fill(f'input[data-k="{k}"]', v)
            for k in ['c1.hipaa_yes', 'c1.medical_yes', 'access.1_client_responsible_party', 'car.decline', 'photos.no_photos', 'comm.accept']: pg.click(f'button[data-t="{k}"]')
            pg.wait_for_timeout(1900)
            sv = [c for c in st['calls'] if c['action'] == 'save']
            ck(f'{name}: their typing saves on its own, with the session', sv and sv[-1]['s'] == 'S' * 43 and sv[-1]['answers'].get('client.address') == '1 Elm', sv[-1:])
            for n in ['1', '2', '3', '4', '5', '6', 'poa']: pg.click(f'[data-tap="{n}"]')
            big = pg.evaluate("() => [...document.querySelectorAll('[data-sign]')].map(b => { const r = b.getBoundingClientRect(); return [r.width, r.height] })")
            ck(f'{name}: the signature buttons are big enough for a finger on this screen', all(a >= 148 and b >= 50 for a, b in big), big)
            pg.click('#nextBtn'); pg.wait_for_selector('#sig'); pg.check('#consent'); draw(pg, '#sig')
            pg.screenshot(path=os.path.join(OUT, f'home-sign-{name}.png'))
            pg.click('#signBtn'); pg.wait_for_timeout(500)
            sb = st.get('signedBody') or {}
            ck(f'{name}: sign sends their signature, name, role, 7 initials and consent, with the link and session',
               sb.get('t') == TOKEN and sb.get('s') == 'S' * 43 and sb.get('consent') is True and sorted(sb.get('initials', {})) == ['1', '2', '3', '4', '5', '6', 'poa'] and sb.get('signature', '').startswith('data:image/png') and sb['signer']['name'] == 'Nancy Anderson', {k: v for k, v in sb.items() if k != 'signature'})
            ck(f'{name}: thank you, Caring Companions will countersign and send the copy; no countersign button', 'Caring Companions will countersign it and send you your copy' in pg.inner_text('#view') and pg.locator('#toOffice').count() == 0)
            ck(f'{name}: nothing wider than the screen', pg.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'))
            ck(f'{name}: no page errors', not errs, errs)
            ctx.close()
        # reload keeps the session; an expired session goes back to the code; a signed link says thank you; a bad link
        ctx = br.new_context(viewport={'width': 390, 'height': 844}); pg = ctx.new_page()
        st = {'calls': [], 'auth': [], 'ag': {'id': '1', 'status': 'draft', 'version': 'Rev. 10/2026', 'office': {'answers': {}}, 'answers': dict(ANS)}}
        pg.route('**/functions/v1/agreement-sign', public_fake(st)); pg.goto(BASE + '/sign.html#t=' + TOKEN); pg.wait_for_selector('[data-via="sms"]')
        pg.click('[data-via="sms"]'); pg.wait_for_selector('#code'); pg.fill('#code', '123456'); pg.click('#codeGo'); pg.wait_for_selector('[data-tap="1"]')
        pg.reload(); pg.wait_for_selector('[data-tap="1"]')
        ck(f'{eng}: a reload keeps them signed in for the session (no new code)', [c['action'] for c in st['calls']][-1] == 'get')
        st['expire'] = True; pg.fill('input[data-k="client.city"]', 'Ozark'); pg.wait_for_timeout(2200)
        ck(f'{eng}: when the session ends, it asks for a code again', pg.locator('[data-via="sms"]').count() == 1 and 'Hi Nancy!' in pg.inner_text('#view'))
        st['signed'] = True; pg.reload(); pg.wait_for_timeout(600)
        ck(f'{eng}: a link already signed just says thank you', 'already signed' in pg.inner_text('#view'))
        pg.goto(BASE + '/sign.html#t=' + 'X' * 43); pg.wait_for_timeout(600)
        ck(f'{eng}: a bad link says to call the office', 'This link does not work' in pg.inner_text('#view') and '(417) 234-8494' in pg.inner_text('#view'))
        pg.goto(BASE + '/sign.html'); pg.wait_for_timeout(600)
        ck(f'{eng}: no link at all: the Hub sign-in, nothing else', pg.locator('#gate').is_visible())
        ctx.close(); br.close()
    for f in ('agreement.html', 'agreement-card.js', 'sign.html'):
        ck(f'no em dash in {f}', '—' not in open(os.path.join(ROOT, f)).read())
srv.shutdown()
bad = [r for r in R if r[0] == 'FAIL']
for r in R: print(r[0], r[1] + ('\n     ' + r[2] if r[2] else ''))
print(f'\n{len(R) - len(bad)}/{len(R)} passed'); sys.exit(1 if bad else 0)

"""driver.html, the caregiver's Driver Compliance page (2026-10-13, spec launch/review/driver-compliance-spec.md), offline with
the driver-compliance server faked to the spec's link contract (view / sign / upload_url / uploaded; the body carries k, e, t)
and the signed upload PUT routed. Chromium AND WebKit (iPhone Safari's engine) at 360px and 1024px:
  the Yes/No question, the vehicle agreement with consent + typed name (client checks, then the server's refusal words, then
  signed); license and insurance uploads (expiry first; the file PUT to the signed upload address; uploaded with the expiry
  and insurer; on file after); a server refusal at upload; the No path (Non-Driver Agreement in the long-document reader, no
  uploads); a dead link; no browser storage written; nothing wider than the screen; big tap targets.
python3 tests/browser/driver_page_look.py [screenshot dir]"""
import json, sys, os, copy
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp'
DC = '22222222-3333-4444-5555-666666666666'
PAGE = 'file://' + os.path.join(ROOT, 'driver.html') + '?k=' + DC + '&e=1999999999&t=' + 'x' * 43
VEHICLE = {'key': 'vehicle', 'title': 'Responsibility for Personal Vehicle Insurance & Transportation Standards', 'version': 4, 'signature': 'typed',
           'sections': [{'h': 'Insurance responsibility', 'p': ['I agree to notify Caring Companions within three (3) calendar days of any policy renewal, change, lapse, or cancellation.']},
                        {'h': 'Your driving details', 'items': [{'id': 'license_number', 'label': 'Driver\'s license number', 'kind': 'text', 'locked': True},
                                                                {'id': 'insurance_photo', 'label': 'Photo', 'kind': 'photo'}]},
                        {'h': 'Driver Acknowledgment', 'items': [{'id': 'driver_ack', 'label': 'Choose one', 'kind': 'choice', 'required': True,
                                                                  'options': ['I meet all requirements and request approval to transport clients.', 'I do not meet the requirements.']}]}],
           'certification': ['I have read this policy and the acknowledgment I chose above is true.']}
NONDRIVER = {'key': 'non_driver', 'title': 'Non-Driver Agreement', 'version': 1, 'signature': 'typed', 'layout': 'document',
             'intro': ['This agreement is between Caring Companions and you.'],
             'sections': [{'h': '%d. Section' % i, 'p': ['I will not transport any client in any vehicle. ' * 5]} for i in range(1, 9)],
             'certification': ['I have read the whole Non-Driver Agreement.']}
UPLOAD_HOST = 'https://zngsgedlsxinbygwmxwn.supabase.co/storage/v1/object/upload/sign/driver-docs/'
STORAGE_SPY = """(() => { window.__w = []; for (const S of [Storage.prototype]) { const o = S.setItem; S.setItem = function(k, v){ window.__w.push(k); return o.call(this, k, v); }; }
  const io = indexedDB && indexedDB.open ? indexedDB.open.bind(indexedDB) : null; if (io) indexedDB.open = function(n){ window.__w.push('idb:' + n); return io.apply(null, arguments); }; })()"""
R = []
def ck(n, c, d=''): R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:400]))

def server(st):
    def view():
        v = {'ok': True, 'name': 'Pat Practice', 'first': 'Pat', 'status': st['status'], 'status_reason': st.get('reason'),
             'license_expires': st.get('lic'), 'insurance_expires': st.get('ins'), 'insurer': st.get('insurer'), 'docs': st['docs'],
             'needed': st['needed'], 'agreement_signed_at': st.get('signed_at'), 'agreement_title': st.get('signed_title')}
        if st.get('agreements'): v['agreements'] = st['agreements']
        return v
    def handle(route, request):
        body = json.loads(request.post_data or '{}'); a = body.get('action'); st['calls'].append(body)
        J = lambda code, obj: route.fulfill(status=code, content_type='application/json', body=json.dumps(obj))
        if body.get('k') != DC or not body.get('t'): return J(401, {'error': 'This link is not valid or has run out. Ask the office for a new one.'})
        if st.get('dead'): return J(401, {'error': 'This link has run out. Ask the office for a new one.'})
        if a == 'view': return J(200, view())
        if a == 'sign':
            if body.get('form') == 'vehicle' and not (body.get('answers') or {}).get('driver_ack'): return J(400, {'error': 'Please answer these first: Choose one.'})
            if not body.get('consent'): return J(400, {'error': 'consent'})
            st['signed'] = body; st['agreements'] = None; st['signed_at'] = '2026-10-13T16:00:00Z'
            if body['form'] == 'non_driver': st.update(status='non_driver', needed=[], signed_title='Non-Driver Agreement')
            else: st.update(status='pending', needed=['Driver\'s license, front', 'Driver\'s license, back', 'Proof of auto insurance'], signed_title='Vehicle agreement')
            return J(200, {'ok': True, 'signed_at': '2026-10-13T16:00:00Z'})
        if a == 'upload_url':
            if st.get('refuse_upload'): return J(400, {'error': 'Please choose a photo (JPG, PNG, HEIC or WEBP) or a PDF.'})
            path = 'dc/%s/%s-%d.%s' % (DC, body['kind'], len(st['calls']), body.get('ext') or 'jpg')
            return J(200, {'ok': True, 'path': path, 'token': 'tok', 'signed_url': UPLOAD_HOST + path + '?token=tok'})
        if a == 'uploaded':
            if not any(p['path'] == body['path'] for p in st['puts']): return J(400, {'error': 'That file did not arrive.'})
            st['uploaded'].append(body); st['docs'].append({'id': 'd%d' % len(st['docs']), 'kind': body['kind'], 'uploaded_at': '2026-10-13T16:05:00Z'})
            if body['kind'] == 'license_front': st['lic'] = body.get('expires')
            if body['kind'] == 'insurance': st['ins'] = body.get('expires'); st['insurer'] = body.get('insurer')
            st['needed'] = [n for n in st['needed'] if not (('front' in n and body['kind'] == 'license_front') or ('back' in n and body['kind'] == 'license_back') or ('insurance' in n and body['kind'] == 'insurance'))]
            return J(200, {'ok': True})
        return J(400, {'error': 'unknown action'})
    def put(route, request):
        st['puts'].append({'path': request.url.split('/driver-docs/')[1].split('?')[0], 'method': request.method, 'ct': request.headers.get('content-type'), 'size': len(request.post_data_buffer or b'')})
        return route.fulfill(status=200, content_type='application/json', body='{"Key":"x"}')
    return handle, put

JPG = b'\xff\xd8\xff\xe0' + b'0' * 2000
with sync_playwright() as p:
    for eng in ('chromium', 'webkit'):
        b = getattr(p, eng).launch()
        for (w, h, label) in [(360, 740, 'phone 360'), (1024, 900, 'desktop 1024')]:
            tag = f'{eng} {label}'
            st = {'status': 'none', 'needed': ['Sign the driving agreement'], 'docs': [], 'agreements': [VEHICLE, NONDRIVER], 'calls': [], 'puts': [], 'uploaded': []}
            ctx = b.new_context(viewport={'width': w, 'height': h}); ctx.add_init_script(STORAGE_SPY); pg = ctx.new_page(); errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
            handle, put = server(st)
            def other(route, request):
                u = request.url
                if u.startswith('file:'): return route.continue_()
                return route.abort()
            pg.route('**/*', other)
            pg.route('**/functions/v1/driver-compliance', handle)
            pg.route('**/storage/v1/object/upload/sign/**', put)
            pg.goto(PAGE); pg.wait_for_timeout(500)
            t = pg.inner_text('body')
            ck(f'{tag}: opens with their name, the status in words and what is still needed', 'Hi, Pat.' in t and 'Not set up yet' in t and 'Sign the driving agreement' in t and 'never makes you a driver' in t, t[:500])
            ck(f'{tag}: the link\'s k, e and t go with every call', all(c.get('k') == DC and c.get('e') == '1999999999' and c.get('t') for c in st['calls']))
            ck(f'{tag}: asks the transport question, Yes / No', 'Are you willing and able to transport clients in your personal vehicle as part of your caregiving duties?' in t and pg.locator('.seg button', has_text='Yes').count() == 1)
            pg.locator('.seg button', has_text='Yes').click(); pg.wait_for_timeout(150)
            t = pg.inner_text('body')
            ck(f'{tag}: Yes shows the vehicle agreement, sections and certification, with only the questions this page can answer', 'Responsibility for Personal Vehicle Insurance' in t and 'insurance responsibility' in t.lower() and 'Choose one' in t and "Driver's license number" not in t and 'YOUR DRIVING DETAILS' not in t.upper().replace('YOUR DRIVING DETAILS ARE', '') and pg.locator('#b_sign').count() == 1, t[:900])
            ck(f'{tag}: no upload boxes before the agreement is signed', pg.locator('.slot').count() == 0)
            pg.click('#b_sign'); pg.wait_for_timeout(100)
            ck(f'{tag}: signing without the box ticked is stopped with clear words', 'tick "I agree to sign electronically"' in pg.inner_text('#e_sign'))
            pg.locator('#c_sign').check(); pg.fill('#n_sign', 'Pat'); pg.click('#b_sign'); pg.wait_for_timeout(100)
            ck(f'{tag}: a single name is stopped: first and last', 'first and last' in pg.inner_text('#e_sign'))
            pg.fill('#n_sign', 'Pat Practice'); pg.click('#b_sign'); pg.wait_for_timeout(300)
            ck(f'{tag}: the server\'s refusal is shown in its own words', 'Please answer these first: Choose one.' in pg.inner_text('#e_sign'), pg.inner_text('#e_sign'))
            pg.locator('.seg button', has_text='I meet all requirements').click(); pg.wait_for_timeout(100)
            pg.locator('#c_sign').check(); pg.fill('#n_sign', 'Pat Practice'); pg.click('#b_sign'); pg.wait_for_timeout(500)
            sg = st.get('signed') or {}
            ck(f'{tag}: signed with the form, the typed name, consent and the answer', sg.get('form') == 'vehicle' and sg.get('typed_name') == 'Pat Practice' and sg.get('consent') is True and sg.get('answers', {}).get('driver_ack', '').startswith('I meet'), sg)
            t = pg.inner_text('body')
            ck(f'{tag}: after signing: Waiting for the office, the three uploads and what is needed', 'Waiting for the office to check' in t and 'You may not drive clients until the office tells you' in t and pg.locator('.slot').count() == 3 and "Driver's license, back" in t, t[:700])
            ck(f'{tag}: each upload offers BOTH a photo and a file; the camera is never forced on "Choose a file"',
               pg.locator('input[type=file][capture]').count() == 3 and pg.locator('input[type=file]:not([capture])').count() == 3
               and all(a == 'image/*,application/pdf' for a in pg.eval_on_selector_all('input[type=file]:not([capture])', 'els => els.map(e => e.accept)')))
            pg.screenshot(path=os.path.join(OUT, f'drv_page_{eng}_{w}_uploads.png'), full_page=True)
            # license front: the expiry first
            pg.set_input_files('#slot_license_front input[type=file]:not([capture])', files=[{'name': 'front.jpg', 'mimeType': 'image/jpeg', 'buffer': JPG}]); pg.wait_for_timeout(200)
            ck(f'{tag}: license front without the expiry date is stopped, nothing uploaded', 'license expiration date first' in pg.inner_text('#e_license_front') and not st['puts'])
            pg.fill('#lic_exp', '2030-05-31'); pg.dispatch_event('#lic_exp', 'change')
            pg.set_input_files('#slot_license_front input[type=file]:not([capture])', files=[{'name': 'front.jpg', 'mimeType': 'image/jpeg', 'buffer': JPG}]); pg.wait_for_timeout(700)
            seq = [c['action'] for c in st['calls']][-3:]
            ck(f'{tag}: upload: upload_url, the photo PUT to the signed upload address, then uploaded with the expiry', len(st['puts']) == 1 and st['puts'][0]['method'] == 'PUT' and st['puts'][0]['ct'] == 'image/jpeg' and (st['puts'][0]['size'] == len(JPG) or eng == 'webkit')
               and st['uploaded'] and st['uploaded'][0]['kind'] == 'license_front' and st['uploaded'][0]['expires'] == '2030-05-31' and seq == ['upload_url', 'uploaded', 'view'], [st['puts'], st['uploaded'], seq])
            t = pg.inner_text('body')
            ck(f'{tag}: then it says thank you, shows the front on file waiting for the office, and the expiry', 'is on file. The office checks it before you drive clients.' in t and 'On file, sent' in pg.inner_text('#slot_license_front') and 'May 31, 2030' in t, t[:800])
            # back: from the camera input
            pg.set_input_files('#slot_license_back input[type=file][capture]', files=[{'name': 'back.jpg', 'mimeType': 'image/jpeg', 'buffer': JPG}]); pg.wait_for_timeout(700)
            ck(f'{tag}: license back from "Take a photo" uploads too (no expiry needed)', len(st['uploaded']) == 2 and st['uploaded'][1]['kind'] == 'license_back')
            # insurance: company and date first
            pg.fill('#ins_exp', '2027-04-30'); pg.dispatch_event('#ins_exp', 'change')
            pg.set_input_files('#slot_insurance input[type=file]:not([capture])', files=[{'name': 'dec.pdf', 'mimeType': 'application/pdf', 'buffer': b'%PDF-1.4 practice'}]); pg.wait_for_timeout(200)
            ck(f'{tag}: insurance without the company is stopped', 'insurance company and the expiration date first' in pg.inner_text('#e_insurance') and len(st['uploaded']) == 2)
            pg.fill('#ins_co', 'Practice Mutual')
            st['refuse_upload'] = True
            pg.set_input_files('#slot_insurance input[type=file]:not([capture])', files=[{'name': 'dec.pdf', 'mimeType': 'application/pdf', 'buffer': b'%PDF-1.4 practice'}]); pg.wait_for_timeout(400)
            ck(f'{tag}: a server refusal at upload is shown in its words, and the typed company stays', 'Please choose a photo (JPG, PNG, HEIC or WEBP) or a PDF.' in pg.inner_text('#e_insurance') and pg.input_value('#ins_co') == 'Practice Mutual', pg.inner_text('#e_insurance'))
            st['refuse_upload'] = False
            pg.set_input_files('#slot_insurance input[type=file]:not([capture])', files=[{'name': 'dec.pdf', 'mimeType': 'application/pdf', 'buffer': b'%PDF-1.4 practice'}]); pg.wait_for_timeout(700)
            u = st['uploaded'][-1]
            ck(f'{tag}: insurance (a PDF) uploaded with the expiry and the insurer', u['kind'] == 'insurance' and u.get('expires') == '2027-04-30' and u.get('insurer') == 'Practice Mutual' and st['puts'][-1]['ct'] == 'application/pdf', u)
            t = pg.inner_text('body')
            ck(f'{tag}: nothing left on "What we still need", insurer and expiry on file', 'What we still need' not in t and 'Practice Mutual' in t and 'April 30, 2027' in t, t[:800])
            big = pg.eval_on_selector_all('.pick label, button.go, .seg button', 'els => els.filter(e => e.offsetParent).map(e => e.getBoundingClientRect().height)')
            ck(f'{tag}: big tap targets (every upload and action button at least 44px tall)', big and min(big) >= 44, big)
            wide = pg.evaluate('document.documentElement.scrollWidth - innerWidth')
            ck(f'{tag}: nothing wider than the screen', wide <= 0, wide)
            ck(f'{tag}: no browser storage written (localStorage, sessionStorage, IndexedDB)', pg.evaluate('window.__w.length === 0 && localStorage.length === 0 && sessionStorage.length === 0'), pg.evaluate('window.__w'))
            ck(f'{tag}: no em dash on the page', '—' not in pg.inner_text('body'))
            pg.screenshot(path=os.path.join(OUT, f'drv_page_{eng}_{w}_done.png'), full_page=True)
            ctx.close()
            # the No path
            st2 = {'status': 'none', 'needed': ['Sign the driving agreement'], 'docs': [], 'agreements': [VEHICLE, NONDRIVER], 'calls': [], 'puts': [], 'uploaded': []}
            ctx = b.new_context(viewport={'width': w, 'height': h}); ctx.add_init_script(STORAGE_SPY); pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
            handle2, put2 = server(st2)
            pg.route('**/*', other); pg.route('**/functions/v1/driver-compliance', handle2); pg.route('**/storage/v1/object/upload/sign/**', put2)
            pg.goto(PAGE); pg.wait_for_timeout(500)
            pg.locator('.seg button', has_text='No').click(); pg.wait_for_timeout(150)
            sc = pg.evaluate("(() => { const r = document.querySelector('.reader'); return r ? { sh: r.scrollHeight, ch: r.clientHeight, n: r.querySelectorAll('h3').length } : null })()")
            ck(f'{tag}: No shows the Non-Driver Agreement whole, in the long-document reader (scrolls in its own box)', sc and sc['n'] == 9 and sc['sh'] > sc['ch'] and pg.locator('.dochead').count() == 1, sc)
            ck(f'{tag}: ...and no upload boxes', pg.locator('.slot').count() == 0)
            pg.screenshot(path=os.path.join(OUT, f'drv_page_{eng}_{w}_nondriver.png'), full_page=True)
            pg.locator('#c_sign').check(); pg.fill('#n_sign', 'Pat Practice'); pg.click('#b_sign'); pg.wait_for_timeout(500)
            t = pg.inner_text('body')
            ck(f'{tag}: signed the Non-Driver Agreement: Non-Driver in words, may work every non-driving assignment, no uploads', (st2.get('signed') or {}).get('form') == 'non_driver' and 'You will not be asked to drive clients' in t and 'Signed. You are set up as a non-driver.' in t and pg.locator('.slot').count() == 0, t[:600])
            wide = pg.evaluate('document.documentElement.scrollWidth - innerWidth')
            ck(f'{tag}: No path: nothing wider than the screen, nothing stored', wide <= 0 and pg.evaluate('window.__w.length === 0'), wide)
            ctx.close()
            # suspended, then a dead link
            st3 = {'status': 'suspended', 'reason': 'Your insurance expired on October 1, 2026.', 'needed': ['Proof of auto insurance'], 'docs': [{'id': 'a', 'kind': 'license_front', 'uploaded_at': '2026-01-01T00:00:00Z', 'verified_at': '2026-01-02T00:00:00Z'}], 'calls': [], 'puts': [], 'uploaded': [], 'lic': '2030-01-01'}
            ctx = b.new_context(viewport={'width': w, 'height': h}); pg = ctx.new_page(); handle3, put3 = server(st3)
            pg.route('**/*', other); pg.route('**/functions/v1/driver-compliance', handle3); pg.route('**/storage/v1/object/upload/sign/**', put3)
            pg.goto(PAGE); pg.wait_for_timeout(500); t = pg.inner_text('body')
            ck(f'{tag}: Suspended: paused in words, the reason, the uploads open, the verified front marked checked', 'Driving clients is paused' in t and 'Your insurance expired on October 1, 2026.' in t and pg.locator('.slot').count() == 3 and 'checked by the office' in pg.inner_text('#slot_license_front'), t[:600])
            st3['dead'] = True; pg.goto(PAGE); pg.wait_for_timeout(500); t = pg.inner_text('body')
            ck(f'{tag}: a link that has run out says so in the server\'s words, with the office number', 'This link has run out. Ask the office for a new one.' in t and '(417) 234-8494' in t, t[:400])
            pg.goto('file://' + os.path.join(ROOT, 'driver.html')); pg.wait_for_timeout(300)
            ck(f'{tag}: a link with no code says so without calling the server', 'missing its code' in pg.inner_text('body'))
            ctx.close()
            ck(f'{tag}: no page errors', not errs, errs)
        b.close()
for s, n, d in R: print(s, ' ', n, ('  ' + d) if d else '')
print(f"\n{sum(1 for r in R if r[0] == 'PASS')}/{len(R)} passed"); raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

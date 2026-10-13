"""driver.html, the caregiver's Driver Compliance page (2026-10-13, spec launch/review/driver-compliance-spec.md), offline with
the driver-compliance server faked to the spec's link contract (view / sign / upload_url / uploaded; the body carries d, e, t; shapes copied from driver-compliance/index.ts)
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
DC = 'aaaaaaaa-bbbb-4ccc-8ddd-000000000001'
PAGE = 'file://' + os.path.join(ROOT, 'driver.html') + '?d=' + DC + '&e=1999999999&t=' + 'x' * 43
# the vehicle form as the server's formPayload sends it ({ key, title, version, intro, sections, certification, fingerprint }); its
# items are Step 1 questions the server answers itself when it makes the signed PDF, so this page shows only the words
VEHICLE = {'key': 'vehicle', 'title': 'Responsibility for Personal Vehicle Insurance & Transportation Standards', 'version': 4, 'intro': [], 'fingerprint': 'f' * 64,
           'sections': [{'h': 'Your driving details', 'items': [{'id': 'license_number', 'label': 'Driver\'s license number', 'kind': 'text', 'locked': True}, {'id': 'insurance_photo', 'label': 'Photo', 'kind': 'photo'}]},
                        {'h': 'Insurance responsibility', 'p': ['I agree to notify Caring Companions within three (3) calendar days of any policy renewal, change, lapse, or cancellation.']},
                        {'h': 'Driver Acknowledgment', 'p': ['If you choose the second option, you will not be asked to transport clients.'], 'items': [{'id': 'driver_ack', 'label': 'Choose one', 'kind': 'choice', 'options': ['I meet all requirements.', 'I do not meet the requirements.']}]}],
           'certification': ['I have read this policy and the acknowledgment I chose above is true.']}
# a Non-Driver Agreement in the long-document layout (the server sends null until that form is in its list)
NONDRIVER = {'key': 'non_driver', 'title': 'Non-Driver Agreement', 'version': 1, 'layout': 'document', 'intro': ['This agreement is between Caring Companions and you.'],
             'sections': [{'h': '%d. Section' % i, 'p': ['I will not transport any client in any vehicle. ' * 5]} for i in range(1, 9)], 'certification': ['I have read the whole Non-Driver Agreement.'], 'fingerprint': 'e' * 64}
UPLOAD_HOST = 'https://zngsgedlsxinbygwmxwn.supabase.co/storage/v1/object/upload/sign/driver-docs/'
MIME = {'image/jpeg': 'jpg', 'image/png': 'png', 'image/heic': 'heic', 'image/webp': 'webp', 'application/pdf': 'pdf'}
LBL = {'non_driver': 'Non-Driver', 'pending': 'Pending Verification', 'approved': 'Approved Driver', 'suspended': 'Suspended'}
NOPE = 'This link is not valid or has run out. Please ask the office for a new one: (417) 234-8494.'
STORAGE_SPY = """(() => { window.__w = []; for (const S of [Storage.prototype]) { const o = S.setItem; S.setItem = function(k, v){ window.__w.push(k); return o.call(this, k, v); }; }
  const io = indexedDB && indexedDB.open ? indexedDB.open.bind(indexedDB) : null; if (io) indexedDB.open = function(n){ window.__w.push('idb:' + n); return io.apply(null, arguments); }; })()"""
R = []
def ck(n, c, d=''): R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:400]))
LONG = lambda d: __import__('datetime').date.fromisoformat(d).strftime('%B ') + str(int(d[8:])) + ', ' + d[:4]

def server(st):
    # the real view's shape (driver-compliance/index.ts, action view)
    def needed():
        if st['status'] == 'non_driver': return []
        out = []
        if st.get('agreement', {}) is None or (st.get('agreement') or {}).get('form') != 'vehicle': out.append('the Driver/Vehicle Insurance and Transportation Standards Agreement, signed')
        for k, w in (('license_front', "a photo of the front of the driver's license"), ('license_back', "a photo of the back of the driver's license"), ('insurance', 'proof of current auto insurance (the card or the declarations page)')):
            if not st['on'][k]: out.append(w)
        if not st.get('lic'): out.append('the license expiration date')
        if not st.get('ins'): out.append('the insurance expiration date')
        if not st.get('insurer'): out.append('the insurance company')
        return out
    def view():
        e = lambda d: {'date': d, 'label': LONG(d)} if d else None
        a = st.get('agreement')
        return {'ok': True, 'first': 'Pat', 'status': st['status'], 'status_label': LBL[st['status']], 'cleared_to_drive': st['status'] == 'approved', 'needed': needed(),
                'expiries': {'license': e(st.get('lic')), 'insurance': e(st.get('ins'))}, 'renewals': [], 'on_file': dict(st['on']), 'agreement': a,
                'agreement_needed': 'vehicle' if st['status'] != 'non_driver' and (a or {}).get('form') != 'vehicle' else None,
                'forms': {'vehicle': VEHICLE, 'non_driver': st.get('nd_form')}, 'office_phone': '(417) 234-8494'}
    def handle(route, request):
        body = json.loads(request.post_data or '{}'); a = body.get('action'); st['calls'].append(body)
        J = lambda code, obj: route.fulfill(status=code, content_type='application/json', body=json.dumps(obj))
        if body.get('t') is None or body.get('d') != DC or st.get('dead'): return J(401, {'ok': False, 'error': NOPE})
        if a == 'view': return J(200, view())
        if a == 'sign':
            f = body.get('form')
            if f not in ('vehicle', 'non_driver'): return J(400, {'ok': False, 'error': 'Which agreement?'})
            if f == 'non_driver' and not st.get('nd_form'): return J(409, {'ok': False, 'error': 'The Non-Driver Agreement is not ready to sign online yet. Please call the office: (417) 234-8494.', 'not_ready': True})
            if body.get('consent') is not True: return J(400, {'ok': False, 'error': 'Please tick "I agree to sign this agreement electronically" first.'})
            if st.pop('not_approved', False): return J(409, {'ok': False, 'error': 'This agreement is waiting for its final approval, so it cannot be signed yet. The office will let you know: (417) 234-8494.', 'not_approved': True})
            st['signed'] = body; st['agreement'] = {'form': f, 'signed_at': '2026-10-13T16:00:00Z', 'version': 4 if f == 'vehicle' else 1}
            if f == 'non_driver': st['status'] = 'non_driver'
            elif st['status'] in ('non_driver', 'suspended'): st['status'] = 'pending'
            return J(200, {'ok': True, 'status': st['status'], 'status_label': LBL[st['status']], 'pdf': True, 'copy_url': 'https://zngsgedlsxinbygwmxwn.supabase.co/storage/v1/object/sign/onboarding-documents/copy?token=c', 'mirror': None})
        if a == 'upload_url':
            k, ct = body.get('kind'), body.get('content_type')
            if k not in ('license_front', 'license_back', 'insurance'): return J(400, {'ok': False, 'error': 'Which document: the front of your license, the back, or your insurance?'})
            if ct not in MIME: return J(400, {'ok': False, 'error': 'Please use a photo (JPG, PNG, HEIC or WebP) or a PDF.'})
            path = 'dc/%s/%s/1760371200%03d-ab12cd34.%s' % (DC, k, len(st['calls']), MIME[ct])
            return J(200, {'ok': True, 'path': path, 'token': 'tok', 'url': UPLOAD_HOST + path + '?token=tok'})
        if a == 'uploaded':
            k, path, ct = body.get('kind'), body.get('path', ''), body.get('content_type')
            if not path.startswith('dc/%s/%s/' % (DC, k)) or ct not in MIME: return J(403, {'ok': False, 'error': 'That upload is not one of yours. Please try again.'})
            if not any(p['path'] == path for p in st['puts']): return J(409, {'ok': False, 'error': 'We did not receive the file. Please upload it again.'})
            ex = body.get('expires')
            if k != 'license_back' and ex and ex <= '2026-10-13': return J(400, {'ok': False, 'error': 'That expiration date has already passed. Please upload the current one.'})
            st['uploaded'].append(body); st['on'][k] = True
            if k == 'license_front' and ex: st['lic'] = ex
            if k == 'insurance': st['ins'] = ex or st.get('ins'); st['insurer'] = body.get('insurer') or st.get('insurer')
            if st['status'] in ('non_driver', 'suspended'): st['status'] = 'pending'
            return J(200, {'ok': True, 'status': st['status'], 'status_label': LBL[st['status']], 'mirror': None})
        return J(400, {'ok': False, 'error': 'Unknown action.'})
    def put(route, request):
        st['puts'].append({'path': request.url.split('/driver-docs/')[1].split('?')[0], 'method': request.method, 'ct': request.headers.get('content-type'), 'size': len(request.post_data_buffer or b'')})
        return route.fulfill(status=200, content_type='application/json', body='{"Key":"x"}')
    return handle, put
def fresh(**x):
    st = {'status': 'pending', 'agreement': None, 'on': {'license_front': False, 'license_back': False, 'insurance': False}, 'calls': [], 'puts': [], 'uploaded': []}
    st.update(x); return st

JPG = b'\xff\xd8\xff\xe0' + b'0' * 2000
def other(route, request):
    return route.continue_() if request.url.startswith('file:') else route.abort()
with sync_playwright() as p:
    for eng in ('chromium', 'webkit'):
        b = getattr(p, eng).launch()
        for (w, h, label) in [(360, 740, 'phone 360'), (1024, 900, 'desktop 1024')]:
            tag = f'{eng} {label}'; errs = []
            def open_page(st, spy=True):
                ctx = b.new_context(viewport={'width': w, 'height': h})
                if spy: ctx.add_init_script(STORAGE_SPY)
                pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
                handle, put = server(st)
                pg.route('**/*', other); pg.route('**/functions/v1/driver-compliance', handle); pg.route('**/storage/v1/object/upload/sign/**', put)
                pg.goto(PAGE); pg.wait_for_timeout(500); return ctx, pg
            st = fresh(not_approved=True)
            ctx, pg = open_page(st)
            t = pg.inner_text('body')
            ck(f'{tag}: opens with their first name, the status in words and what is still needed (the server\'s list)', 'Hi, Pat.' in t and 'Not complete yet' in t and 'The Driver/Vehicle Insurance and Transportation Standards Agreement, signed' in t and 'never makes you a driver' in t, t[:600])
            ck(f'{tag}: the link\'s d, e and t go with every call', st['calls'] and all(c.get('d') == DC and c.get('e') == '1999999999' and c.get('t') and 'k' not in c for c in st['calls']))
            ck(f'{tag}: asks the transport question, Yes / No', 'Are you willing and able to transport clients in your personal vehicle as part of your caregiving duties?' in t and pg.locator('.seg button', has_text='Yes').count() == 1)
            pg.locator('.seg button', has_text='Yes').click(); pg.wait_for_timeout(150)
            t = pg.inner_text('body')
            ck(f'{tag}: Yes shows the vehicle agreement\'s words and certification; the Step 1 questions the server answers itself are not asked', 'Responsibility for Personal Vehicle Insurance' in t and 'insurance responsibility' in t.lower() and 'If you choose the second option' in t and 'Choose one' not in t and "Driver's license number" not in t and 'YOUR DRIVING DETAILS' not in t.upper().replace('YOUR DRIVING DETAILS ARE', '') and pg.locator('#b_sign').count() == 1, t[:900])
            ck(f'{tag}: no upload boxes before the agreement is signed', pg.locator('.slot').count() == 0)
            pg.click('#b_sign'); pg.wait_for_timeout(100)
            ck(f'{tag}: signing without the box ticked is stopped with clear words', 'tick "I agree to sign electronically"' in pg.inner_text('#e_sign'))
            pg.locator('#c_sign').check(); pg.fill('#n_sign', 'Pat'); pg.click('#b_sign'); pg.wait_for_timeout(100)
            ck(f'{tag}: a single name is stopped: first and last', 'first and last' in pg.inner_text('#e_sign'))
            pg.fill('#n_sign', 'Pat Practice'); pg.click('#b_sign'); pg.wait_for_timeout(300)
            ck(f'{tag}: the server\'s refusal (wording not yet approved) is shown in its own words', 'waiting for its final approval' in pg.inner_text('#e_sign'), pg.inner_text('#e_sign'))
            pg.locator('#c_sign').check(); pg.fill('#n_sign', 'Pat Practice'); pg.click('#b_sign'); pg.wait_for_timeout(500)
            sg = st.get('signed') or {}
            ck(f'{tag}: signed with exactly {{ form, typed_name, consent }} plus the link', sg.get('form') == 'vehicle' and sg.get('typed_name') == 'Pat Practice' and sg.get('consent') is True and sorted(sg) == ['action', 'consent', 'd', 'e', 'form', 't', 'typed_name'], sg)
            t = pg.inner_text('body')
            ck(f'{tag}: after signing: the signed line, a link to their signed copy, the three uploads and what is still needed', 'Driver/Vehicle agreement signed on' in t and pg.locator('#okmsg a', has_text='Open your signed copy').count() == 1 and pg.locator('.slot').count() == 3 and "A photo of the back of the driver's license" in t, t[:900])
            ck(f'{tag}: each upload offers BOTH a photo and a file; the camera is never forced on "Choose a file"',
               pg.locator('input[type=file][capture]').count() == 3 and pg.locator('input[type=file]:not([capture])').count() == 3
               and all(a == 'image/*,application/pdf' for a in pg.eval_on_selector_all('input[type=file]:not([capture])', 'els => els.map(e => e.accept)')))
            pg.screenshot(path=os.path.join(OUT, f'drv_page_{eng}_{w}_uploads.png'), full_page=True)
            pg.set_input_files('#slot_license_front input[type=file]:not([capture])', files=[{'name': 'front.jpg', 'mimeType': 'image/jpeg', 'buffer': JPG}]); pg.wait_for_timeout(200)
            ck(f'{tag}: license front without the expiry date is stopped, nothing uploaded', 'license expiration date first' in pg.inner_text('#e_license_front') and not st['puts'])
            pg.fill('#lic_exp', '2026-10-01'); pg.dispatch_event('#lic_exp', 'change')
            pg.set_input_files('#slot_license_front input[type=file]:not([capture])', files=[{'name': 'front.jpg', 'mimeType': 'image/jpeg', 'buffer': JPG}]); pg.wait_for_timeout(700)
            ck(f'{tag}: a past expiry is refused by the server after the file arrived, in its words', 'That expiration date has already passed' in pg.inner_text('#e_license_front') and not st['uploaded'], pg.inner_text('#e_license_front'))
            pg.fill('#lic_exp', '2030-05-31'); pg.dispatch_event('#lic_exp', 'change')
            pg.set_input_files('#slot_license_front input[type=file]:not([capture])', files=[{'name': 'front.jpg', 'mimeType': 'image/jpeg', 'buffer': JPG}]); pg.wait_for_timeout(700)
            seq = [c['action'] for c in st['calls']][-3:]
            uu = [c for c in st['calls'] if c['action'] == 'upload_url'][-1]
            ck(f'{tag}: upload: upload_url {{ kind, content_type }}, the photo PUT to the url it gave, then uploaded {{ kind, path, content_type, expires }}',
               sorted(uu) == ['action', 'content_type', 'd', 'e', 'kind', 't'] and uu['content_type'] == 'image/jpeg' and st['puts'][-1]['method'] == 'PUT' and st['puts'][-1]['ct'] == 'image/jpeg' and (st['puts'][-1]['size'] == len(JPG) or eng == 'webkit')
               and st['uploaded'] and st['uploaded'][0]['kind'] == 'license_front' and st['uploaded'][0]['expires'] == '2030-05-31' and st['uploaded'][0]['content_type'] == 'image/jpeg' and seq == ['upload_url', 'uploaded', 'view'], [uu, st['puts'], st['uploaded'], seq])
            t = pg.inner_text('body')
            ck(f'{tag}: then it says thank you, shows the front on file, and the expiry in the server\'s words', 'is on file. The office checks it before you drive clients.' in t and 'On file' in pg.inner_text('#slot_license_front') and 'May 31, 2030' in t, t[:800])
            pg.set_input_files('#slot_license_back input[type=file][capture]', files=[{'name': 'back.jpg', 'mimeType': 'image/jpeg', 'buffer': JPG}]); pg.wait_for_timeout(700)
            ck(f'{tag}: license back from "Take a photo" uploads too (no expiry needed)', len(st['uploaded']) == 2 and st['uploaded'][1]['kind'] == 'license_back' and 'expires' not in st['uploaded'][1])
            pg.fill('#ins_exp', '2027-04-30'); pg.dispatch_event('#ins_exp', 'change')
            pg.set_input_files('#slot_insurance input[type=file]:not([capture])', files=[{'name': 'dec.pdf', 'mimeType': 'application/pdf', 'buffer': b'%PDF-1.4 practice'}]); pg.wait_for_timeout(200)
            ck(f'{tag}: insurance without the company is stopped', 'insurance company and the expiration date first' in pg.inner_text('#e_insurance') and len(st['uploaded']) == 2)
            pg.fill('#ins_co', 'Practice Mutual')
            pg.set_input_files('#slot_insurance input[type=file]:not([capture])', files=[{'name': 'dec.gif', 'mimeType': 'image/gif', 'buffer': b'GIF89a'}]); pg.wait_for_timeout(300)
            ck(f'{tag}: a kind of file the server does not take is stopped with clear words, and the typed company stays', 'Please choose a photo (JPG, PNG, HEIC or WebP) or a PDF.' in pg.inner_text('#e_insurance') and pg.input_value('#ins_co') == 'Practice Mutual', pg.inner_text('#e_insurance'))
            pg.set_input_files('#slot_insurance input[type=file]:not([capture])', files=[{'name': 'dec.pdf', 'mimeType': 'application/pdf', 'buffer': b'%PDF-1.4 practice'}]); pg.wait_for_timeout(700)
            u = st['uploaded'][-1]
            ck(f'{tag}: insurance (a PDF) uploaded with the expiry and the insurer', u['kind'] == 'insurance' and u.get('expires') == '2027-04-30' and u.get('insurer') == 'Practice Mutual' and u.get('content_type') == 'application/pdf' and st['puts'][-1]['ct'] == 'application/pdf', u)
            t = pg.inner_text('body')
            ck(f'{tag}: everything in: "Waiting for the office to check", nothing left to do, both expiries on file', 'Waiting for the office to check' in t and 'What we still need' not in t and 'April 30, 2027' in t and 'May 31, 2030' in t, t[:800])
            big = pg.eval_on_selector_all('.pick label, button.go, .seg button', 'els => els.filter(e => e.offsetParent).map(e => e.getBoundingClientRect().height)')
            ck(f'{tag}: big tap targets (every upload and action button at least 44px tall)', big and min(big) >= 44, big)
            wide = pg.evaluate('document.documentElement.scrollWidth - innerWidth')
            ck(f'{tag}: nothing wider than the screen', wide <= 0, wide)
            ck(f'{tag}: no browser storage written (localStorage, sessionStorage, IndexedDB)', pg.evaluate('window.__w.length === 0 && localStorage.length === 0 && sessionStorage.length === 0'), pg.evaluate('window.__w'))
            ck(f'{tag}: no em dash on the page', '—' not in pg.inner_text('body'))
            pg.screenshot(path=os.path.join(OUT, f'drv_page_{eng}_{w}_done.png'), full_page=True)
            ctx.close()
            # No, while the server has no Non-Driver Agreement to sign yet (forms.non_driver null, as today)
            st2 = fresh(); ctx, pg = open_page(st2)
            pg.locator('.seg button', has_text='No').click(); pg.wait_for_timeout(150); t = pg.inner_text('body')
            ck(f'{tag}: No while the Non-Driver Agreement is not online yet: call the office, never asked to drive, no form, no uploads', 'not ready to sign online yet' in t and '(417) 234-8494' in t and pg.locator('#b_sign').count() == 0 and pg.locator('.slot').count() == 0, t[:700])
            ctx.close()
            # No, once the server sends the Non-Driver Agreement (here in the long-document layout)
            st2 = fresh(nd_form=NONDRIVER); ctx, pg = open_page(st2)
            pg.locator('.seg button', has_text='No').click(); pg.wait_for_timeout(150)
            sc = pg.evaluate("(() => { const r = document.querySelector('.reader'); return r ? { sh: r.scrollHeight, ch: r.clientHeight, n: r.querySelectorAll('h3').length } : null })()")
            ck(f'{tag}: No shows the Non-Driver Agreement whole, in the long-document reader (scrolls in its own box)', sc and sc['n'] == 9 and sc['sh'] > sc['ch'] and pg.locator('.dochead').count() == 1, sc)
            ck(f'{tag}: ...and no upload boxes', pg.locator('.slot').count() == 0)
            pg.screenshot(path=os.path.join(OUT, f'drv_page_{eng}_{w}_nondriver.png'), full_page=True)
            pg.locator('#c_sign').check(); pg.fill('#n_sign', 'Pat Practice'); pg.click('#b_sign'); pg.wait_for_timeout(500)
            t = pg.inner_text('body')
            ck(f'{tag}: signed the Non-Driver Agreement: Non-Driver in words, no uploads, and the way back to driving offered', (st2.get('signed') or {}).get('form') == 'non_driver' and 'You will not be asked to drive clients' in t and 'Signed. You are set up as a non-driver.' in t and pg.locator('.slot').count() == 0 and 'I want to drive clients' in t, t[:600])
            pg.click('text=I want to drive clients'); pg.wait_for_timeout(150)
            ck(f'{tag}: ...which shows the vehicle agreement to sign', 'Responsibility for Personal Vehicle Insurance' in pg.inner_text('body') and pg.locator('#b_sign').count() == 1)
            wide = pg.evaluate('document.documentElement.scrollWidth - innerWidth')
            ck(f'{tag}: No path: nothing wider than the screen, nothing stored', wide <= 0 and pg.evaluate('window.__w.length === 0'), wide)
            ctx.close()
            # Suspended (approved before, documents on file), then a dead link
            st3 = fresh(status='suspended', agreement={'form': 'vehicle', 'signed_at': '2026-01-02T15:00:00Z', 'version': 4}, on={'license_front': True, 'license_back': True, 'insurance': True}, lic='2030-01-01', ins='2026-10-01', insurer='Practice Mutual')
            ctx, pg = open_page(st3, spy=False); t = pg.inner_text('body')
            ck(f'{tag}: Suspended: paused in words, the uploads open with each on file, no agreement asked again', 'Driving clients is paused' in t and pg.locator('.slot').count() == 3 and 'On file' in pg.inner_text('#slot_insurance') and pg.locator('#b_sign').count() == 0, t[:600])
            st3['dead'] = True; pg.goto(PAGE); pg.wait_for_timeout(500); t = pg.inner_text('body')
            ck(f'{tag}: a link that has run out says so in the server\'s words, with the office number', NOPE in t, t[:400])
            pg.goto('file://' + os.path.join(ROOT, 'driver.html') + '?k=' + DC + '&e=1&t=x'); pg.wait_for_timeout(300)
            ck(f'{tag}: an old-style link (k, not d) says it is missing its code, without calling the server', 'missing its code' in pg.inner_text('body'))
            ctx.close()
            ck(f'{tag}: no page errors', not errs, errs)
        b.close()
for s_, n, d in R: print(s_, ' ', n, ('  ' + d) if d else '')
print(f"\n{sum(1 for r in R if r[0] == 'PASS')}/{len(R)} passed"); raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

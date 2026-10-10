"""Slice 2b: the Step 1 page on a phone, offline. The server is faked from the real form texts (step1_view.json made from
step1-documents.ts); nothing reaches production. Screenshots land in the scratchpad."""
import json, sys, os
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); PAGE = 'file://' + os.path.abspath(os.path.join(HERE, '..', '..', 'step1.html'))
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp'
VIEW = json.load(open(sys.argv[2] if len(sys.argv) > 2 else os.path.join(OUT, 'step1_view.json')))
state = {'answers': {}, 'signatures': {}, 'identity': {'ssn': None, 'dob': False, 'license': None}, 'esign': None, 'screen': '1', 'calls': []}
def handle(route, request):
    body = json.loads(request.post_data or '{}'); a = body.get('action'); state['calls'].append(a)
    if a == 'view':
        v = dict(VIEW); v['answers'] = state['answers']; v['signatures'] = state['signatures']; v['identity'] = dict(VIEW['identity'], **state['identity']); v['esign_consent_at'] = state['esign']; v['current_screen'] = state['screen']; v['signed_count'] = len(state['signatures'])
        return route.fulfill(status=200, content_type='application/json', body=json.dumps(v))
    if a == 'begin': state['esign'] = '2026-10-10T03:00:00Z'; return route.fulfill(status=200, content_type='application/json', body='{"ok":true}')
    if a == 'save':
        for k, val in (body.get('answers') or {}).items():
            if val == '' or val is None: state['answers'].pop(k, None)
            else: state['answers'][k] = val
        if body.get('screen'): state['screen'] = body['screen']
        return route.fulfill(status=200, content_type='application/json', body='{"ok":true,"saved":1,"rejected":[]}')
    if a == 'identity':
        if 'ssn' in body:
            if body['ssn'] != body.get('ssn2'): return route.fulfill(status=400, content_type='application/json', body=json.dumps({'ok': False, 'error': 'The two Social Security numbers do not match. Please type it twice, digits only.'}))
            state['identity']['ssn'] = 'ending ' + body['ssn'][-4:]
        if 'dob' in body: state['identity']['dob'] = True
        if 'license_number' in body: state['identity']['license'] = 'ending ' + body['license_number'][-4:]
        return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'identity': dict(VIEW['identity'], **state['identity'])}))
    if a == 'sign':
        f = body['form']
        if f == 'employee_application' and 'lived_outside_mo' not in state['answers']: return route.fulfill(status=400, content_type='application/json', body=json.dumps({'ok': False, 'error': 'Please answer these first: Have you lived outside Missouri in the last five years?.'}))
        state['signatures'][f] = {'at': '2026-10-10T03:05:00Z', 'typed_name': body['typed_name'], 'version': 2}
        done = len(state['signatures']) == 7
        return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'form': f, 'signed_at': '2026-10-10T03:05:00Z', 'version': 2, 'fingerprint': 'f' * 64, 'pdf': True, 'done': done, 'signed_count': len(state['signatures']), 'form_count': 7}))
    if a == 'copies': return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'copies': {k: 'https://example.invalid/' + k for k in state['signatures']}, 'expires_in': 600}))
    return route.fulfill(status=400, content_type='application/json', body='{"ok":false,"error":"Unknown action."}')
R = []
def ck(n, c, d=''): R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:300]))
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
    pg.route('**/functions/v1/step1-sign', handle)
    pg.route('**/fonts.googleapis.com/**', lambda r, q: r.abort()); pg.route('**/images.leadconnectorhq.com/**', lambda r, q: r.abort())
    pg.goto(PAGE + '?o=11111111-2222-4333-8444-555555555555&e=4102444800&t=' + 'A' * 43); pg.wait_for_timeout(600)
    ck('screen 1: welcome, the seven forms, the practice banner, the e-sign consent', 'Welcome, Ava' in pg.inner_text('#main') and 'Practice only' in pg.inner_text('#main') and pg.locator('#esign').count() == 1, pg.inner_text('#main')[:200])
    pg.screenshot(path=os.path.join(OUT, 'step1_1_welcome.png'), full_page=True)
    pg.click('button.go'); pg.wait_for_timeout(300)
    ck('Begin without the tick: refused on the page', 'tick the box' in pg.inner_text('#e_begin'))
    pg.check('#esign'); pg.click('button.go'); pg.wait_for_timeout(500)
    t = pg.inner_text('#main')
    ck('screen 2: about you, prefilled "lived outside Missouri" marked from the application, the states question appears', 'About you' in t and 'FROM YOUR APPLICATION' in t.upper() and 'Which states?' in t, t[:400])
    ck('the name, phone and email from the offer are shown, not asked again', 'Ava Lee' in t and '(417) 555-0101' in t and 'call or text the office' in t.lower())
    pg.fill('input[data-id="hs_name"]', 'Central High'); pg.wait_for_timeout(1000)
    ck('typing saves to the server as you go (no browser storage)', state['answers'].get('hs_name') == 'Central High' and pg.evaluate('Object.keys(localStorage).length') == 0, state['answers'])
    pg.screenshot(path=os.path.join(OUT, 'step1_2_about.png'), full_page=True)
    pg.click('button.go'); pg.wait_for_timeout(500)
    t = pg.inner_text('#main')
    ck('screen 3: work history with Add an employer, the criminal record wording, the sign box for the application', 'Add an employer' in t and 'conviction is not an automatic bar' in t and pg.locator('#b_sign').count() == 1, t[:300])
    pg.click('text=+ Add an employer'); pg.wait_for_timeout(200)
    rows = pg.locator('.row input'); rows.nth(0).fill('Home Helpers'); rows.nth(3).fill('Jane Boss'); pg.wait_for_timeout(1000)
    pg.screenshot(path=os.path.join(OUT, 'step1_3_work.png'), full_page=True)
    pg.check('#c_sign'); pg.fill('#n_sign', 'Ava Lee'); pg.click('#b_sign'); pg.wait_for_timeout(500)
    ck('a sign refused by the server shows its words under the button', 'lived outside Missouri' in pg.inner_text('#e_sign'), pg.inner_text('#e_sign'))
    state['answers']['lived_outside_mo'] = 'yes'
    pg.click('#b_sign'); pg.wait_for_timeout(600)
    t = pg.inner_text('#main')
    ck('after signing, the page moves to the references screen with the supervisor one-tap button', 'Your references' in t and 'Use Jane Boss' in t and state['signatures'].get('employee_application', {}).get('typed_name') == 'Ava Lee', t[:300])
    pg.click('text=Use Jane Boss'); pg.wait_for_timeout(400)
    ck('one tap copies the supervisor into the professional references', (state['answers'].get('professional_refs') or [[None]])[0][0] == 'Jane Boss', state['answers'].get('professional_refs'))
    pg.screenshot(path=os.path.join(OUT, 'step1_4_refs.png'), full_page=True)
    pg.evaluate("go('5b')"); pg.wait_for_timeout(500)
    t = pg.inner_text('#main')
    ck('screen 5b: the EDL and FCSR consent, the SSN typed twice, the date of birth, the address', 'Employee Disqualification List' in t and pg.locator('#id_ssn').count() == 1 and pg.locator('#id_ssn2').count() == 1 and pg.locator('#id_dob').count() == 1, t[:300])
    pg.fill('#id_ssn', '529123456'); pg.fill('#id_ssn2', '529123457'); pg.click('text=Save my Social Security number'); pg.wait_for_timeout(400)
    ck('two different numbers: the server\'s words show, nothing saved', 'do not match' in pg.inner_text('#e_screen') and state['identity']['ssn'] is None)
    pg.fill('#id_ssn2', '529123456'); pg.click('text=Save my Social Security number'); pg.wait_for_timeout(500)
    t = pg.inner_text('#main')
    ck('a matching pair: "on file, ending 3456" and the number is nowhere on the page or in the answers', 'ending 3456' in t and '529123456' not in t and '529123456' not in json.dumps(state['answers']), t[:200])
    pg.screenshot(path=os.path.join(OUT, 'step1_5b_identity.png'), full_page=True)
    pg.evaluate("go('6')"); pg.wait_for_timeout(500)
    t = pg.inner_text('#main')
    ck('screen 6: the hint from the application, the weekly grid, the initials line beside the certification', 'From your application' in t and pg.locator('table.grid').count() == 1 and pg.locator('input[data-id="initials"]').count() == 1, t[:200])
    pg.locator('table.grid input[type=checkbox]').nth(0).check(); pg.wait_for_timeout(900)
    ck('ticking Monday morning lands in the grid answer', (state['answers'].get('windows') or {}).get('Monday', {}).get('Morning') is True, state['answers'].get('windows'))
    pg.screenshot(path=os.path.join(OUT, 'step1_6_availability.png'), full_page=True)
    pg.evaluate("go('7')"); pg.wait_for_timeout(900)
    t = pg.inner_text('#main'); h = pg.inner_html('#main')
    ck('screen 7: the three levels', 'level 1, wellness' in t.lower(), t[:200])
    ck('screen 7: the matching facts, prefilled from the interview (cats yes, dogs not at this time) and marked so', 'Homes with cats' in h and 'from your interview' in h and 'class="on"' in h, h[h.find('Homes with cats')-100:h.find('Homes with cats')+300])
    pg.screenshot(path=os.path.join(OUT, 'step1_7_experience.png'), full_page=True)
    pg.evaluate("go('8')"); pg.wait_for_timeout(500)
    t = pg.inner_text('#main')
    ck('screen 8: the license number asks only because has_license is yes (from the application); no MVR described as existing', pg.locator('#id_license').count() == 1 and 'Motor Vehicle Record check ordered by the office' in t and 'Successfully pass' not in t, t[:200])
    pg.screenshot(path=os.path.join(OUT, 'step1_8_vehicle.png'), full_page=True)
    for f in ['reference_consent', 'fcra_disclosure', 'edl_fcsr_consent', 'availability', 'experience', 'vehicle']: state['signatures'][f] = {'at': '2026-10-10T03:05:00Z', 'typed_name': 'Ava Lee', 'version': 2}
    pg.evaluate("V.completed_at='2026-10-10T03:06:00Z'; SIGS=" + json.dumps(state['signatures']) + "; go('9')"); pg.wait_for_timeout(600)
    t = pg.inner_text('#main')
    ck('screen 9: all done, what happens next, seven copies', 'All done' in t and 'Step 2' in t and pg.locator('.copies a').count() == 7, t[:200])
    pg.screenshot(path=os.path.join(OUT, 'step1_9_done.png'), full_page=True)
    ck('the page never used browser storage', pg.evaluate('Object.keys(localStorage).length + Object.keys(sessionStorage).length') == 0)
    b.close()
for r in R: print(r[0], ' ', r[1], ('  ' + r[2]) if r[2] else '')
bad = sum(1 for r in R if r[0] == 'FAIL'); print(f"{len(R)-bad}/{len(R)} passed"); sys.exit(1 if bad else 0)

"""Client Care Agreement pre-fill (Samantha 2026-10-29: "the more they only have to tap the better"). Offline, like
agreement_look.py: the Hub folder is served locally, the sign-in is a stored fake session and the client-agreement function
is faked. Checks the set-up screen picks the home visit's level and rate and says what will be filled in, the filled boxes
show in blue until someone changes them, names are tapped for "Who is signing" and the backup caregiver, number and email
boxes open the right keyboard, the vehicle boxes are "Not needed" after Decline, and "Fill in empty boxes from the Hub".
python3 tests/browser/agreement_prefill_look.py [screenshot dir]"""
import json, sys, os, threading, http.server, functools
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp'
FIELDS = json.load(open(os.path.join(HERE, 'agreement_fields.json')))
OFFICE_KEYS = ['level.wellness_care', 'level.personal_care', 'level.advanced_care', 'level.hourly_rate', 'rates.wellness_care', 'rates.personal_care', 'rates.advanced_care']
CURRENT = 'e11cbf8295107d42be8419fc76069543371c3788b0981d4c915823244bfc6309'
FORM = {'doc': 'client-care-agreement', 'version': 'Rev. 10/2026', 'pdf_sha256': CURRENT, 'esign_words': 'I agree.', 'initials': {str(n): 'x' for n in range(1, 7)}, 'fields': FIELDS, 'office_keys': OFFICE_KEYS}
FILLED = {'client.client_s_name': 'Edward Anderson', 'client.address': '123 Maple St', 'client.city': 'Springfield', 'client.zip': '65804', 'client.phone_number': '(417) 555-0100',
          'ci.date_of_birth': '03/04/1941', 'c1.name': 'Nancy Anderson', 'c1.relationship': 'Daughter', 'c1.cell_phone': '(417) 863-7309', 'c1.home_phone': '(417) 555-0200', 'c1.email': 'nancy@example.com',
          'c2.name': 'Tom Anderson', 'c2.relationship': 'Son'}
R = []
def ck(n, c, d=''): R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:500]))

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=ROOT))
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f'http://127.0.0.1:{srv.server_address[1]}'
SESSION = {'access_token': 'kr', 'refresh_token': 'r', 'token_type': 'bearer', 'expires_in': 3600, 'expires_at': 4102444800, 'user': {'id': 'u-kr', 'email': 'kr@mo-care.com', 'aud': 'authenticated', 'role': 'authenticated', 'app_metadata': {}, 'user_metadata': {}}}

def fake(state):
    def handle(route, request):
        if request.method == 'OPTIONS': return route.fulfill(status=200, headers={'access-control-allow-origin': '*', 'access-control-allow-headers': '*'}, body='ok')
        b = json.loads(request.post_data or '{}'); state['calls'].append(b)
        J = lambda code, o: route.fulfill(status=code, content_type='application/json', headers={'access-control-allow-origin': '*'}, body=json.dumps(o))
        a = b.get('action'); ag = state.get('ag')
        if a == 'form': return J(200, {'ok': True, 'form': FORM})
        if a == 'prefill':
            if state.get('prefill_down'): return J(500, {'error': 'The database did not answer.'})
            return J(200, {'ok': True, 'count': len(FILLED), 'sources': ['AxisCare', 'Family Circle'], 'notes': ['5 people are on file; the agreement has room for 4, so Amy Lee was left off.'],
                           'office': {'level.personal_care': True, 'level.hourly_rate': '32'}, 'visit_found': True})
        if a == 'start':
            state['ag'] = {'id': '11111111-1111-4111-8111-111111111111', 'client_ax': b['client_ax'], 'status': 'draft', 'version': 'Rev. 10/2026', 'pdf_sha256': CURRENT,
                           'office': {'answers': b['office'], 'addenda': [], 'prefill': {k: 'AxisCare' for k in FILLED}, 'prefill_values': dict(FILLED), 'prefill_notes': []}, 'answers': dict(FILLED)}
            return J(200, {'ok': True, 'agreement': state['ag'], 'form': FORM})
        if a == 'save': ag['answers'] = b['answers']; return J(200, {'ok': True, 'outcome': 'saved'})
        if a == 'fill_blanks':
            add = {'c3.name': 'Amy Lee', 'c3.relationship': 'Niece'}
            ag['answers'].update(add); ag['office']['prefill'].update({k: 'Family Circle' for k in add}); ag['office']['prefill_values'].update(add)
            return J(200, {'ok': True, 'filled': len(add), 'notes': [], 'agreement': ag})
        return J(400, {'error': 'Unknown action.'})
    return handle

def run(browser, name):
    ctx = browser.new_context(viewport={'width': 1024, 'height': 1300})
    ctx.add_init_script('localStorage.setItem("sb-zngsgedlsxinbygwmxwn-auth-token", %s);' % json.dumps(json.dumps(SESSION)))
    page = ctx.new_page(); errs = []; page.on('pageerror', lambda e: errs.append(str(e)))
    st = {'calls': []}; page.route('**/functions/v1/client-agreement', fake(st))
    page.goto(BASE + '/agreement.html?ax=296'); page.wait_for_selector('#startBtn'); page.wait_for_function("document.getElementById('pfNote').innerText.indexOf('Looking')<0")
    ck(f'{name}: set-up picks the home visit\'s level and rate', page.locator('[data-t="level.personal_care"].on').count() == 1 and page.input_value('[data-k="level.hourly_rate"]') == '32')
    note = page.inner_text('#pfNote')
    ck(f'{name}: set-up says how many boxes will be filled in, from where, and why someone was left off', '13 boxes will be filled in' in note and 'from AxisCare and the Family Circle.' in note and 'home visit' in note and 'Amy Lee' in note, note)
    page.screenshot(path=os.path.join(OUT, f'agreement-prefill-setup-{name}.png'))
    page.click('#startBtn'); page.wait_for_selector('#sName')
    s = [c for c in st['calls'] if c.get('action') == 'start'][0]
    ck(f'{name}: start sends the picked level and rate', s['office'] == {'level.personal_care': True, 'rates.personal_care': True, 'level.hourly_rate': '32'}, s['office'])
    ck(f'{name}: filled boxes show their values in blue', page.input_value('input[data-k="client.address"]') == '123 Maple St' and page.locator('input.pf').count() == len(FILLED), page.locator('input.pf').count())
    ck(f'{name}: the office card says how many were filled in', '13 boxes' in page.inner_text('#pfCard'), page.inner_text('#pfCard'))
    page.fill('input[data-k="client.city"]', 'Ozark')
    ck(f'{name}: a box someone changes is no longer blue', page.locator('input[data-k="client.city"].pf').count() == 0)
    page.fill('input[data-k="client.city"]', 'Springfield')
    ck(f'{name}: changed back to what was filled in, it is blue again', page.locator('input[data-k="client.city"].pf').count() == 1)
    page.fill('input[data-k="client.city"]', 'Ozark')
    # keyboards
    im = lambda k: page.get_attribute(f'input[data-k="{k}"]', 'inputmode')
    ck(f'{name}: phones, zips, dates and emails open the right keyboard', im('c1.cell_phone') == 'tel' and im('client.zip') == 'numeric' and im('ci.date_of_birth') == 'numeric' and im('c1.email') == 'email' and im('vehicle.year') == 'numeric' and im('client.address') is None,
       [im(k) for k in ['c1.cell_phone', 'client.zip', 'ci.date_of_birth', 'c1.email', 'vehicle.year', 'client.address']])
    # who is signing: tap a name
    chips = page.locator('[data-who]').all_inner_texts()
    ck(f'{name}: "Who is signing today?" lists the people on the agreement', chips == ['Edward Anderson (the client)', 'Nancy Anderson (Daughter)', 'Tom Anderson (Son)'], chips)
    page.click('[data-who="1"]')
    ck(f'{name}: tapping a family member fills the name, "someone signing for the client" and the relationship',
       page.input_value('#sName') == 'Nancy Anderson' and page.locator('[data-role="representative"].on').count() == 1 and page.input_value('#sRel') == 'Daughter' and page.locator('[data-who="1"].on').count() == 1)
    page.click('[data-who="0"]')
    ck(f'{name}: tapping the client makes the client the signer', page.input_value('#sName') == 'Edward Anderson' and page.locator('[data-role="client"].on').count() == 1)
    # backup caregiver: tap a name
    page.click('#backupCard [data-backup="1"]')
    ck(f'{name}: tapping a backup copies their name, relationship and both phones to page 16',
       page.input_value('input[data-k="backup.full_name"]') == 'Nancy Anderson' and page.input_value('input[data-k="backup.relationship_to_client"]') == 'Daughter'
       and page.input_value('input[data-k="backup.primary_phone"]') == '(417) 863-7309' and page.input_value('input[data-k="backup.secondary_phone"]') == '(417) 555-0200' and page.locator('#backupCard').count() == 0)
    # the car: Decline -> the vehicle boxes are not needed
    page.click('button[data-t="car.decline"]')
    ck(f'{name}: after Decline the vehicle boxes say Not needed and cannot be typed in', page.locator('input[data-k^="vehicle."]:disabled').count() == 7 and page.get_attribute('input[data-k="vehicle.insurance"]', 'placeholder') == 'Not needed')
    page.click('button[data-t="car.accept"]')
    ck(f'{name}: after Accept they open again', page.locator('input[data-k^="vehicle."]:disabled').count() == 0)
    page.wait_for_timeout(1700)
    sv = [c for c in st['calls'] if c.get('action') == 'save'][-1]['answers']
    ck(f'{name}: the filled-in and tapped answers save', sv.get('client.address') == '123 Maple St' and sv.get('client.city') == 'Ozark' and sv.get('backup.full_name') == 'Nancy Anderson' and sv.get('car.accept') is True, sv)
    # fill the empty boxes again
    page.click('#pfAgain'); page.wait_for_function("document.getElementById('pfMsg') && document.getElementById('pfMsg').innerText.indexOf('filled')>=0")
    ck(f'{name}: "Fill in empty boxes from the Hub" fills new ones and says how many', page.input_value('input[data-k="c3.name"]') == 'Amy Lee' and '2 more filled in' in page.inner_text('#pfMsg') and page.input_value('input[data-k="client.city"]') == 'Ozark'
       and page.locator('input[data-k="client.city"].pf').count() == 0 and page.locator('input[data-k="c3.name"].pf').count() == 1 and '14 boxes' in page.inner_text('#pfCard'), (page.inner_text('#pfMsg'), page.inner_text('#pfCard')))
    page.screenshot(path=os.path.join(OUT, f'agreement-prefill-fill-{name}.png'))
    page.click('#nextBtn'); page.wait_for_selector('#famGo'); page.click('#famGo'); page.wait_for_selector('[data-tap="1"]')
    ck(f'{name}: the family is told the blue boxes were filled in for them to check', 'blue boxes' in page.inner_text('#view .lead'), page.inner_text('#view .lead'))
    ck(f'{name}: no page errors', not errs, errs)
    ctx.close()
    # the look-up fails: the agreement still starts, and says so
    ctx = browser.new_context(viewport={'width': 1024, 'height': 1000})
    ctx.add_init_script('localStorage.setItem("sb-zngsgedlsxinbygwmxwn-auth-token", %s);' % json.dumps(json.dumps(SESSION)))
    page = ctx.new_page(); st = {'calls': [], 'prefill_down': True}; page.route('**/functions/v1/client-agreement', fake(st))
    page.goto(BASE + '/agreement.html?ax=296'); page.wait_for_selector('#startBtn'); page.wait_for_function("document.getElementById('pfNote').innerText.indexOf('Looking')<0")
    ck(f'{name}: when the look-up fails it says so, nothing is picked, and Start still works', 'Could not look up' in page.inner_text('#pfNote') and page.locator('[data-t].on').count() == 0 and page.is_enabled('#startBtn'), page.inner_text('#pfNote'))
    ctx.close()

with sync_playwright() as p:
    for eng in ['chromium', 'webkit']:
        br = getattr(p, eng).launch(); run(br, eng); br.close()
src = open(os.path.join(ROOT, 'agreement.html'), encoding='utf-8').read()
ck('no em dash in agreement.html', '—' not in src)
for r in R: print(r[0], r[1], ('  ' + r[2]) if r[2] else '')
print(f"\n{sum(1 for r in R if r[0] == 'PASS')}/{len(R)} passed")
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

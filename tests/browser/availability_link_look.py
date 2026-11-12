"""OPEN DOORS (2026-11-12, from the systems audit) · the My Hours page (availability.html).
A typed phone number no longer opens anyone's hours: the page offers "Text me my link" and the personal sealed link is the
only way in. The real page from THIS checkout, offline, the server faked, MADE-UP people only. Nothing reaches production.
(python3 tests/browser/availability_link_look.py; OUT=<dir> for screenshots)"""
import os, json, sys
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
HTML = open(os.path.join(ROOT, 'availability.html'), encoding='utf-8').read()
OUT = os.environ.get('OUT', '')
res = []
def ck(name, ok, note=''): res.append((name, bool(ok), '' if ok else str(note)[:600]))
CALLS = []; MODE = {'server': 'new'}
SAME = 'If that number is on file with us, we just texted your personal link. It can take a minute. No text? Call the office and we will help.'
def answer(body):
    if body.get('action') == 'link':
        if MODE['server'] == 'old':   # a server from before this change: it ignores the action and looks the phone up
            return 200, {'name': 'Ann Aide', 'first_name': 'Ann', 'target_hours': 25, 'windows': {'mon': ['morning']}, 'via_link': False}
        if MODE['server'] == 'night': return 200, {'link_flow': True, 'held': True, 'message': 'Links are texted between 7am and 10pm. Please try again then, or call the office.'}
        if len(''.join(ch for ch in str(body.get('phone', '')) if ch.isdigit())) != 10: return 400, {'error': 'enter your 10-digit phone number'}
        return 200, {'link_flow': True, 'message': SAME}
    if body.get('t') == 'good':
        if body.get('action') == 'save': return 200, {'saved': True, 'name': 'Ann Aide', 'message': 'Saved, Ann! The office sees this right away. Update it any time.'}
        if body.get('action') == 'confirm': return 200, {'confirmed': True, 'name': 'Ann Aide', 'message': 'Thank you, Ann! Your availability is confirmed.'}
        return 200, {'name': 'Ann Aide', 'first_name': 'Ann', 'target_hours': 25, 'windows': {'mon': ['morning']}, 'outside_ok': True, 'updated_at': '2026-11-01T00:00:00Z', 'via_link': True}
    if body.get('t'): return 401, {'unknown': True, 'message': 'This link has expired or is not valid. Enter your phone number instead, or call the office.'}
    return 200, {'unknown': True, 'need_link': True, 'link_flow': True, 'message': 'For your privacy, we now text you a personal link to this page. Enter your phone number and tap the button to get yours.'}
def route(r):
    u = r.request.url
    if '/functions/v1/caregiver-availability' in u:
        if r.request.method == 'OPTIONS': return r.fulfill(status=200, headers={'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type'}, body='ok')
        body = json.loads(r.request.post_data or '{}'); CALLS.append(body); s, j = answer(body)
        return r.fulfill(status=s, headers={'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}, body=json.dumps(j))
    if u.split('?')[0].endswith('/availability.html'): return r.fulfill(status=200, content_type='text/html; charset=utf-8', body=HTML)
    return r.fulfill(status=200, content_type='image/png', body=b'')
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 390, 'height': 800}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.route('**/*', route)
    vis = lambda sel: pg.eval_on_selector(sel, 'e => getComputedStyle(e).display !== "none"')
    txt = lambda sel: pg.inner_text(sel).strip()

    # 1 · no link: the phone box, and a typed number only asks for a text
    pg.goto('https://cc.mo-care.test/availability.html'); pg.wait_for_timeout(200)
    ck('without a link the page asks for a phone number and offers "Text me my link"', vis('#phoneCard') and not vis('#form') and txt('#linkBtn') == 'Text me my link', txt('#phoneCard'))
    ck('... and says why (privacy), in plain words', 'we text you a personal link' in txt('#phoneCard'))
    ck('opening the page with no link asks the server nothing', CALLS == [], CALLS)
    pg.fill('#ph', '417-555'); pg.click('#linkBtn'); pg.wait_for_timeout(150)
    ck('a short number is caught on the page, nothing sent', 'Enter your 10-digit phone number' in txt('#phErr') and CALLS == [], CALLS)
    pg.fill('#ph', '(417) 555-0107'); pg.click('#linkBtn'); pg.wait_for_timeout(300)
    ck('a full number sends ONE request: action link and the phone, nothing else', CALLS == [{'action': 'link', 'phone': '4175550107'}], CALLS)
    ck('the page shows the server\'s same-for-everyone answer', SAME in txt('#linkDone') and txt('#phErr') == '', txt('#phoneCard'))
    ck('... and still shows nobody\'s hours', not vis('#form') and txt('#hello') == '')
    if OUT: pg.screenshot(path=os.path.join(OUT, 'availability-text-me-my-link.png'))

    # 2 · an older server (answers with a person): the page must NOT show them and must NOT claim a text was sent
    CALLS.clear(); MODE['server'] = 'old'; pg.reload(); pg.wait_for_timeout(200)
    pg.fill('#ph', '4175550107'); pg.click('#linkBtn'); pg.wait_for_timeout(300)
    ck('against an older server: no "we texted you", a plain try-again message', 'could not text your link just now' in txt('#phErr') and txt('#linkDone') == '', txt('#phoneCard'))
    ck('... and the person that server sent back is not shown', not vis('#form') and 'Ann' not in pg.inner_text('body'))
    MODE['server'] = 'night'; pg.click('#linkBtn'); pg.wait_for_timeout(300)
    ck('overnight: the held message is shown, no "texted"', 'between 7am and 10pm' in txt('#phErr') and txt('#linkDone') == '', txt('#phoneCard'))
    MODE['server'] = 'new'

    # 3 · with their personal link: straight to their hours, save and keep-the-same work
    CALLS.clear(); pg.goto('https://cc.mo-care.test/availability.html?c=77&e=1999999999&t=good'); pg.wait_for_timeout(400)
    ck('with a personal link the phone box is gone and their hours show', not vis('#phoneCard') and vis('#form') and 'Hi Ann' in txt('#hello') and pg.input_value('#hours') == '25', txt('#form')[:200])
    ck('the page sent only the link (no phone number)', CALLS and all('phone' not in c for c in CALLS) and CALLS[0] == {'c': '77', 'e': '1999999999', 't': 'good'}, CALLS)
    pg.click('#saveBtn'); pg.wait_for_timeout(300)
    ck('Save works with the link', 'Saved, Ann!' in txt('#done') and CALLS[-1].get('action') == 'save' and CALLS[-1].get('t') == 'good' and 'phone' not in CALLS[-1], CALLS[-1])
    pg.click('#stillRight'); pg.wait_for_timeout(300)
    ck('"Keep it the same" works with the link', 'confirmed' in txt('#stillDone') and CALLS[-1].get('action') == 'confirm', CALLS[-1])
    if OUT: pg.screenshot(path=os.path.join(OUT, 'availability-with-link.png'))

    # 4 · a bad or expired link: back to "Text me my link", nothing shown
    CALLS.clear(); pg.goto('https://cc.mo-care.test/availability.html?c=77&e=1&t=bad'); pg.wait_for_timeout(400)
    ck('an expired or forged link falls back to the phone box with the reason', vis('#phoneCard') and not vis('#form') and 'expired or is not valid' in txt('#phErr'), txt('#phoneCard'))
    pg.fill('#ph', '4175550107'); pg.click('#linkBtn'); pg.wait_for_timeout(300)
    ck('... and from there they can ask for a fresh link', CALLS[-1] == {'action': 'link', 'phone': '4175550107'} and SAME in txt('#linkDone'), CALLS[-1])
    ck('no script errors on the page', errs == [], errs)
    ck('the old "Continue" lookup button is gone', 'onclick="lookup()"' not in HTML and '>Continue<' not in HTML)
    b.close()
for n, ok, note in res: print(('PASS' if ok else 'FAIL') + ' · ' + n + ('' if ok else '\n     ' + note))
passed = sum(1 for r in res if r[1]); print(f'{passed}/{len(res)}'); sys.exit(0 if passed == len(res) else 1)

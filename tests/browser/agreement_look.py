"""Client Care Agreement on a tablet (Stage 1, 2026-10-16): the tablet page (agreement.html) and the client card
(agreement-card.js). Offline: the Hub folder is served locally, Supabase sign-in is a stored fake session, and the
client-agreement function is faked (every call recorded and checked against the printed agreement's field list).
Walks the whole flow at tablet sizes (1024 and 768) in Chromium and WebKit: office set-up, the office filling in the REAL
agreement pages in place, hand-off, the family tapping the initials boxes on the pages and signing (drawn with the mouse),
countersign, open.
python3 tests/browser/agreement_look.py [screenshot dir]"""
import json, sys, os, threading, http.server, functools, re
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp'
FIELDS = json.load(open(os.path.join(HERE, 'agreement_fields.json')))
SERVER_ONLY = lambda k: k.startswith(('ini.', 'sig.', 'ci.sig.', 'date.')) or k in ('poa.initials', 'ci.client_s_name')
OFFICE_KEYS = ['level.wellness_care', 'level.personal_care', 'level.advanced_care', 'level.hourly_rate', 'rates.wellness_care', 'rates.personal_care', 'rates.advanced_care']
INITIALS = {'1': 'Rates, billing, cancellations and the app', '2': 'Services, safety, home access and the emergency plan (Exhibits B and D)', '3': 'Transportation and use of my car',
            '4': 'Privacy and communication choices (photos, permission to communicate, HIPAA)', '5': 'I received the Client Handbook (Exhibits C and E) and agree to the Infectious Disease Waiver (Exhibit F)', '6': 'Non-solicitation and the $5,000 direct hire fee'}
FORM = {'doc': 'client-care-agreement', 'version': 'Rev. 10/2026', 'esign_words': 'I agree to sign this Client Care Agreement electronically.', 'initials': INITIALS, 'fields': FIELDS, 'office_keys': OFFICE_KEYS}
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
        if request.headers.get('authorization') != 'Bearer kr': return J(401, {'error': 'Sign in first.'})
        a = b.get('action'); ag = state.get('ag')
        if a == 'form': return J(200, {'ok': True, 'form': FORM})
        if a == 'start':
            state['ag'] = {'id': '11111111-1111-4111-8111-111111111111', 'client_ax': b['client_ax'], 'status': 'draft', 'version': 'Rev. 10/2026', 'office': {'answers': b['office'], 'addenda': b.get('addenda', [])}, 'answers': {}}
            return J(200, {'ok': True, 'agreement': state['ag'], 'form': FORM})
        if a == 'get': return J(200, {'ok': True, 'agreement': ag, 'form': FORM}) if ag and b.get('id') == ag['id'] else J(404, {'error': 'Agreement not found.'})
        if a == 'save' and state.get('fail_save'): return J(500, {'error': 'The database did not answer.'})
        if a == 'save':
            bad = [k for k in b['answers'] if k not in FIELDS or k in OFFICE_KEYS]
            if bad: return J(422, {'error': 'Some answers are not right.', 'problems': [{'field': k, 'error': 'not allowed'} for k in bad]})
            ag['answers'] = b['answers']; return J(200, {'ok': True, 'outcome': 'saved'})
        if a == 'sign':
            state['signed'] = b; ag['status'] = 'signed'; return J(200, {'ok': True, 'outcome': 'signed'})
        if a == 'countersign':
            state['counter'] = b; ag['status'] = 'countersigned'; return J(200, {'ok': True, 'outcome': 'countersigned'})
        if a == 'open': return J(200, {'ok': True, 'url': 'https://example.com/signed.pdf', 'expires_in': 300})
        if a == 'list': return J(200, {'ok': True, 'agreements': state.get('list', [])})
        return J(400, {'error': 'Unknown action.'})
    return handle

def draw(page, sel):
    bx = page.locator(sel).bounding_box()
    page.mouse.move(bx['x'] + 20, bx['y'] + bx['height'] * .7); page.mouse.down()
    for i in range(1, 12): page.mouse.move(bx['x'] + 20 + i * 30, bx['y'] + bx['height'] * (.3 if i % 2 else .7), steps=3)
    page.mouse.up()

def flow(browser, name, w, h):
    ctx = browser.new_context(viewport={'width': w, 'height': h})
    ctx.add_init_script('localStorage.setItem("sb-zngsgedlsxinbygwmxwn-auth-token", %s); window.__opened=[]; window.open=(u)=>{ window.__opened.push(u); return null; };' % json.dumps(json.dumps(SESSION)))
    page = ctx.new_page(); errs = []; page.on('pageerror', lambda e: errs.append(str(e)))
    st = {'calls': []}; page.route('**/functions/v1/client-agreement', fake(st))
    page.goto(BASE + '/agreement.html?ax=296'); page.wait_for_selector('#startBtn')
    ck(f'{name}: office set-up shows for a new agreement', page.locator('#view h1').inner_text() == 'Set up the agreement')
    page.click('[data-t="level.personal_care"]'); page.fill('[data-k="level.hourly_rate"]', '32'); page.click('[data-ad="guide"]'); page.click('#startBtn')
    page.wait_for_selector('#sName')
    s = [c for c in st['calls'] if c.get('action') == 'start'][0]
    ck(f'{name}: start sends the level (and the same row of the page 11 rate table), the rate and the addenda',
       s['office'] == {'level.personal_care': True, 'rates.personal_care': True, 'level.hourly_rate': '32'} and s['addenda'] == ['guide'] and s['client_ax'] == '296', s)
    ck(f'{name}: the address bar now holds the agreement id (a reload continues it)', 'id=11111111' in page.url, page.url)
    # the real pages, with the blanks on them
    ck(f'{name}: the office sees all 23 real agreement pages', page.locator('.pg').count() == 23 and page.locator('#view h1').inner_text() == 'Fill in the agreement')
    pos = page.evaluate('window.__AG_TEST.POS')
    fam_text = [k for k, f in pos.items() if f['type'] == 'text' and k not in OFFICE_KEYS and not SERVER_ONLY(k)]
    fam_check = [k for k, f in pos.items() if f['type'] == 'check' and k not in OFFICE_KEYS]
    ck(f'{name}: every blank the family answers is fillable on its page ({len(fam_text)} blanks, {len(fam_check)} boxes)',
       page.locator('input[data-k]').count() == len(fam_text) and page.locator('button[data-t]').count() == len(fam_check), (page.locator('input[data-k]').count(), len(fam_text)))
    ck(f'{name}: office answers show on the page but cannot be changed there',
       page.locator('input[data-k^="level."], button[data-t^="level."], button[data-t^="rates."]').count() == 0
       and page.locator('[data-key="level.personal_care"]').inner_text() == '✓' and page.locator('[data-key="rates.personal_care"]').inner_text() == '✓' and page.locator('[data-key="level.hourly_rate"]').inner_text() == '32')
    # each blank sits on its printed line (left edge and bottom within 2 px of the measured box)
    off = page.evaluate("""() => { const out=[]; for (const k of ['client.client_s_name','c1.name','backup.full_name','access.lockbox_code']) {
        const el=document.querySelector('[data-key="'+k+'"]'), pg=el.closest('.pg').getBoundingClientRect(), r=el.getBoundingClientRect(), b=window.__AG_TEST.POS[k].box, s=pg.width/612;
        out.push([k, Math.abs(r.left-(pg.left+b[0]*s)), Math.abs(r.bottom-(pg.top+b[3]*s))]); } return out; }""")
    ck(f'{name}: the blanks sit exactly on the printed lines', all(dx < 2 and dy < 2 for _, dx, dy in off), off)
    page.screenshot(path=os.path.join(OUT, f'agreement-fill-{name}.png'))
    # the office fills in part of it ...
    page.fill('#sName', 'Nancy Anderson'); page.click('[data-role="representative"]'); page.fill('#sRel', 'Wife')
    office_vals = {'client.client_s_name': 'Edward Anderson', 'client.address': '123 Maple St', 'client.city': 'Springfield', 'client.zip': '65804', 'client.phone_number': '417-555-0100', 'ci.date_of_birth': '3/4/1941'}
    for k, v in office_vals.items(): page.fill(f'input[data-k="{k}"]', v)
    ck(f'{name}: the printed name and the client name on Exhibit I fill themselves in',
       page.locator('[data-pv="sig.client.printed_name"]').inner_text() == 'Nancy Anderson' and page.locator('[data-pv="ci.client_s_name"]').inner_text() == 'Edward Anderson')
    for k in ['car.accept', 'car.decline', 'photos.share_with_my_family', 'photos.no_photos']: page.click(f'button[data-t="{k}"]')
    ck(f'{name}: Accept/Decline is one-or-the-other on the page', page.locator('button[data-t="car.accept"].on').count() == 0 and page.locator('button[data-t="car.decline"]').inner_text() == '✓')
    ck(f'{name}: "No photos" clears the other photo choices', page.locator('button[data-t="photos.share_with_my_family"].on').count() == 0)
    page.wait_for_timeout(1900)
    saves = [c for c in st['calls'] if c.get('action') == 'save']
    ck(f'{name}: answers save on their own a moment after typing', saves and saves[-1]['answers'].get('client.client_s_name') == 'Edward Anderson' and saves[-1]['answers'].get('car.decline') is True, saves[-1:])
    st['fail_save'] = True; page.click('#nextBtn'); page.wait_for_timeout(400)
    ck(f'{name}: a save that fails says so and keeps the office on the pages', 'Not saved' in page.locator('#barMsg').inner_text() and page.locator('#famGo').count() == 0, page.locator('#barMsg').inner_text())
    st['fail_save'] = False; page.click('#nextBtn'); page.wait_for_selector('#famGo')
    ck(f'{name}: the office can hand over a part-filled agreement, and the hand-off says how much is still blank',
       page.locator('#view h1').inner_text() == 'Hand the tablet to Nancy Anderson' and 'still blank' in page.locator('#view').inner_text(), page.locator('#view').inner_text())
    page.click('#famGo'); page.wait_for_selector('[data-tap="1"]')
    # ... and the family (an adult child) types in the rest
    ck(f'{name}: the family sees the same 23 pages and can type into any blank', page.locator('.pg').count() == 23 and page.locator('input[data-k]').count() == len(fam_text) and page.locator('button[data-t]').count() == len(fam_check))
    ck(f'{name}: the office answers show on their pages', page.locator('input[data-k="client.client_s_name"]').input_value() == 'Edward Anderson' and page.locator('button[data-t="car.decline"]').inner_text() == '✓')
    page.locator('[data-sign]').first.click(); page.wait_for_selector('#sheet')
    ck(f'{name}: tapping Sign with blanks left lists them (incl. the POA, since someone signs for the client)',
       'A few things first' in page.locator('#sheet').inner_text() and 'POA name' in page.locator('#sheet').inner_text() and 'Backup caregiver' in page.locator('#sheet').inner_text(), page.locator('#sheet').inner_text())
    page.locator('#sheet [data-goto="c1.name"]').click(); page.wait_for_timeout(500)
    ck(f'{name}: tapping an item closes the list and goes to that blank', page.locator('#sheet').count() == 0 and page.evaluate('document.activeElement && document.activeElement.dataset.k') == 'c1.name')
    fam_vals = {'poa.name': 'Nancy Anderson', 'poa.relationship': 'Wife', 'c1.name': 'Nancy Anderson', 'c1.relationship': 'Wife', 'c1.cell_phone': '417-863-7309', 'c2.name': 'Tom Anderson',
                'access.lockbox_location': 'Back porch', 'access.lockbox_code': '2468', 'backup.full_name': 'Tom Anderson', 'backup.primary_phone': '417-555-0111'}
    for k, v in fam_vals.items(): page.fill(f'input[data-k="{k}"]', v)
    for k in ['c1.hipaa_yes', 'c1.hipaa_no', 'c1.hipaa_yes', 'c1.medical_no', 'c1.text_running_late', 'c1.axis_care_notes', 'c1.email_invoices', 'c2.hipaa_no', 'c2.medical_no', 'access.2_lockbox_access_a_ke', 'comm.accept']:
        page.click(f'button[data-t="{k}"]')
    ck(f'{name}: Yes/No is one-or-the-other for the family too', page.locator('button[data-t="c1.hipaa_no"].on').count() == 0 and page.locator('button[data-t="c1.hipaa_yes"]').inner_text() == '✓')
    ck(f'{name}: 6 initials boxes plus the POA box, and 2 signature lines (agreement and Exhibit I)', page.locator('[data-tap]').count() == 7 and page.locator('[data-sign]').count() == 2)
    big = page.evaluate("() => [...document.querySelectorAll('[data-tap],[data-sign]')].map(b => { const r=b.getBoundingClientRect(); return [r.width, r.height]; })")
    ck(f'{name}: every box to tap is big enough for a finger (at least 140 x 52)', all(w_ >= 138 and h_ >= 50 for w_, h_ in big), big)
    page.locator('[data-sign]').first.click(); page.wait_for_selector('#shNext')
    ck(f'{name}: tapping Sign before the initials asks for the initials first', 'Initials first' in page.locator('#sheet').inner_text())
    page.click('#shNext'); page.wait_for_timeout(300)
    ck(f'{name}: Show me the next one closes the sheet', page.locator('#sheet').count() == 0)
    ck(f'{name}: the bar counts the initials', 'Initials: 0 of 7' in page.locator('#barMsg').inner_text(), page.locator('#barMsg').inner_text())
    page.wait_for_timeout(1500); page.screenshot(path=os.path.join(OUT, f'agreement-family-{name}.png'))
    clear = page.evaluate("""() => [...document.querySelectorAll('[data-tap]')].map(b => { const r=b.getBoundingClientRect(), f=window.__AG_TEST.POS[b.dataset.key], pg=b.closest('.pg').getBoundingClientRect(), s=pg.width/612;
        return [b.dataset.tap, r.left >= pg.left + f.box[0]*s - 1, r.right <= window.innerWidth]; })""")
    ck(f'{name}: initials buttons start at the box, leave the printed label readable and stay on screen', all(a_ and b_ for _, a_, b_ in clear), clear)
    for n in ['1', '2', '3', '4', '5', '6', 'poa']:
        page.click(f'[data-tap="{n}"]')
    ck(f'{name}: tapped boxes show the signer\'s initials (NA) in the box', page.locator('[data-tap="1"]').inner_text() == 'NA' and 'All initials done' in page.locator('#barMsg').inner_text())
    page.locator('[data-tap="3"]').scroll_into_view_if_needed(); page.screenshot(path=os.path.join(OUT, f'agreement-initialed-{name}.png'))
    page.click('#nextBtn'); page.wait_for_selector('#sig')
    page.click('#signBtn'); ck(f'{name}: signing without the e-sign box ticked is refused on the page', 'tick the box' in page.locator('#signErr').inner_text())
    page.check('#consent'); page.click('#signBtn'); ck(f'{name}: signing with an empty signature box is refused on the page', 'finger' in page.locator('#signErr').inner_text())
    draw(page, '#sig'); ck(f'{name}: the warning clears once they start signing', page.locator('#signErr').inner_text() == ''); page.screenshot(path=os.path.join(OUT, f'agreement-sign-{name}.png'))
    page.click('#signBtn'); page.wait_for_selector('#toOffice')
    sg = st['signed']
    ck(f'{name}: sign sends consent, the typed name, the role, six initials + POA, and a real PNG signature',
       sg['consent'] is True and sg['signer']['name'] == 'Nancy Anderson' and sg['signer']['role'] == 'representative' and sorted(sg['initials']) == ['1', '2', '3', '4', '5', '6', 'poa']
       and sg['signature'].startswith('data:image/png;base64,') and len(sg['signature']) > 1500, {k: (v if k != 'signature' else len(v)) for k, v in sg.items()})
    ck(f'{name}: every answer sent is a field on the printed agreement, none of them office or server fields', all(k in FIELDS and k not in OFFICE_KEYS and not SERVER_ONLY(k) for k in sg['answers']) and sg['answers'].get('access.lockbox_code') == '2468',
       [k for k in sg['answers'] if k not in FIELDS or k in OFFICE_KEYS or SERVER_ONLY(k)])
    page.click('#toOffice'); page.wait_for_selector('#osig'); draw(page, '#osig'); page.click('#cBtn'); page.wait_for_selector('#openPdf')
    ck(f'{name}: countersign sends the office signature, then Signed and saved', st['counter']['signature'].startswith('data:image/png') and 'Signed and saved' in page.locator('#view h1').inner_text())
    page.click('#openPdf'); page.wait_for_timeout(300)
    ck(f'{name}: Open the signed agreement opens the 5-minute link', page.evaluate('window.__opened') == ['https://example.com/signed.pdf'], page.evaluate('window.__opened'))
    ck(f'{name}: no page errors', not errs, errs)
    ctx.close()
    return st

def no_wide(page, label):
    return page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1')

with sync_playwright() as p:
    for eng in ('chromium', 'webkit'):
        br = getattr(p, eng).launch()
        for w, h in ((1024, 768), (768, 1024)):
            flow(br, f'{eng}-{w}', w, h)
        # a resumed draft opens at About you, a signed one at Countersign, a finished one at Signed and saved
        for status, expect in (('draft', '#sName'), ('signed', '#osig'), ('countersigned', '#openPdf')):
            ctx = br.new_context(viewport={'width': 768, 'height': 1024})
            ctx.add_init_script('localStorage.setItem("sb-zngsgedlsxinbygwmxwn-auth-token", %s)' % json.dumps(json.dumps(SESSION)))
            pg = ctx.new_page(); st = {'calls': [], 'ag': {'id': '22222222-2222-4222-8222-222222222222', 'status': status, 'version': 'Rev. 10/2026', 'office': {'answers': {'level.wellness_care': True, 'level.hourly_rate': '30'}}, 'answers': {'c1.name': 'A B', 'c2.name': 'C D'}}}
            pg.route('**/functions/v1/client-agreement', fake(st)); pg.goto(BASE + '/agreement.html?id=22222222-2222-4222-8222-222222222222')
            try: pg.wait_for_selector(expect, timeout=8000); ok = True
            except Exception: ok = False
            ck(f'{eng}: a {status} agreement opens at the right screen', ok)
            if status == 'draft': ck(f'{eng}: a resumed draft shows the pages with its answers', pg.locator('.pg').count() == 23 and pg.locator('input[data-k="c1.name"]').input_value() == 'A B')
            ck(f'{eng}: nothing wider than the tablet ({status})', no_wide(pg, status))
            ctx.close()
        ctx = br.new_context(viewport={'width': 768, 'height': 1024}); pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.route('**/functions/v1/client-agreement', fake({'calls': []})); pg.goto(BASE + '/agreement.html?ax=296'); pg.wait_for_selector('#signin')
        ck(f'{eng}: not signed in: the Hub sign-in shows, nothing else', pg.locator('#gate').is_visible() and pg.locator('#view').inner_text().strip() == '', errs)
        ctx.close()
        # the client card
        ctx = br.new_context(viewport={'width': 1024, 'height': 768}); pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        card = '''<!doctype html><meta charset="utf-8"><body><div id="cp_agreement"></div><script>
const CP = { ax: '296' }; window.CALLS = [];
window.callAction = async (fn, b) => { CALLS.push(b); if (b.action === 'list') return { status: 200, data: { agreements: [
 { id: 'a1', status: 'countersigned', version: 'Rev. 10/2026', created_at: '2026-10-16T15:00:00Z', countersigned_at: '2026-10-16T16:00:00Z', has_pdf: true, signer: { name: 'Nancy Anderson', role: 'representative' } },
 { id: 'a2', status: 'draft', version: 'Rev. 10/2026', created_at: '2026-10-17T15:00:00Z', has_pdf: false, signer: null }] } };
 if (b.action === 'open') return { status: 200, data: { url: 'https://example.com/a1.pdf' } }; return { status: 400, data: { error: 'x' } }; };
window.__opened = []; window.open = (u) => { __opened.push(u); };
</script><script src="agreement-card.js"></script><script>CAG.mount('cp_agreement')</script>'''
        open(os.path.join(ROOT, '_cag_test.html'), 'w').write(card)
        pg.goto(BASE + '/_cag_test.html'); pg.wait_for_selector('[data-cag-open]')
        txt = pg.locator('#cp_agreement').inner_text()
        ck(f'{eng} card: lists signed and started agreements with who signed', 'Signed' in txt and 'Started, not signed' in txt and 'Nancy Anderson (for the client)' in txt, txt)
        pg.click('[data-cag-open]'); pg.wait_for_timeout(300)
        ck(f'{eng} card: Open signed PDF opens the link', pg.evaluate('window.__opened') == ['https://example.com/a1.pdf'])
        ck(f'{eng} card: a draft offers Continue on the tablet', pg.locator('[data-cag-go="a2"]').inner_text() == 'Continue on the tablet')
        ck(f'{eng} card: no page errors', not errs, errs)
        os.remove(os.path.join(ROOT, '_cag_test.html')); ctx.close()
        br.close()
    # no em dashes in what families and staff read
    for f in ('agreement.html', 'agreement-card.js'):
        visible = re.sub(r'<!--.*?-->|/\*.*?\*/', '', open(os.path.join(ROOT, f)).read(), flags=re.S)
        ck(f'no em dash in {f}', '—' not in visible)
srv.shutdown()
bad = [r for r in R if r[0] == 'FAIL']
for r in R: print(r[0], r[1] + ('\n     ' + r[2] if r[2] else ''))
print(f'\n{len(R) - len(bad)}/{len(R)} passed'); sys.exit(1 if bad else 0)

"""supplies.html, Order Supplies under SOPs (2026-10-17, her "a tab in SOPs that says order supplies"; printed pieces,
office supplies, caregiver supplies and a request list), offline. A fake Supabase session in localStorage, Supabase faked at
the network (app_data supply_requests / supply_items, rpc upsert_app_data_item with the bodies recorded).
Chromium AND WebKit at 360px and 1024px: the pay rule shows; the order list sorts "we're out" first; ask for something
(blank refused, saved with who and when, kind taken from a known item); Mark ordered asks where and records it; Mark received;
Cancel keeps it under Received and cancelled; the supply lists add, edit and remove (removed is kept, nothing deleted);
a card number in the notes is refused; a bad link is refused; a javascript: link never becomes a link; printed requests point
to Client Folders; no em dashes on screen; nothing wider than the screen. Also the Hub wiring: the SOPs row has Order Supplies,
it opens supplies.html?in=hub inside the Hub, and #order-supplies works.
python3 tests/browser/supplies_look.py"""
import json, sys, os, threading, functools, http.server, re
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
R = []
def ck(n, c, d=''): R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:400]))
SESSION = {'access_token': 'x.y.z', 'refresh_token': 'r', 'token_type': 'bearer', 'expires_in': 3600, 'expires_at': 4102444800,
           'user': {'id': 'u1', 'aud': 'authenticated', 'role': 'authenticated', 'email': 'samantha@mo-care.com'}}
ITEMS = [{'id': 'i1', 'cat': 'office', 'name': 'HP 206A toner', 'where': 'Amazon', 'link': 'https://www.amazon.com/x', 'keep': '2 cartridges', 'notes': '', 'by': 'samantha@mo-care.com', 'at': '2026-10-17T15:00:00Z'},
         {'id': 'i2', 'cat': 'caregiver', 'name': 'Gloves', 'where': 'Evil', 'link': 'javascript:alert(1)', 'keep': '', 'notes': '', 'by': 'samantha@mo-care.com', 'at': '2026-10-17T15:00:00Z'},
         {'id': 'i3', 'cat': 'office', 'name': 'Old thing', 'where': '', 'link': '', 'keep': '', 'notes': '', 'removed': {'by': 'x', 'at': '2026-10-01T00:00:00Z'}}]
REQS = [{'id': 'r1', 'name': 'Printer paper', 'cat': 'office', 'qty': '1 case', 'note': '', 'out': False, 'by': 'krystal@mo-care.com', 'at': '2026-10-16T15:00:00Z', 'status': 'requested'},
        {'id': 'r2', 'name': 'HP 206A toner', 'cat': 'office', 'qty': '1', 'note': '', 'out': True, 'by': 'krystal@mo-care.com', 'at': '2026-10-17T15:00:00Z', 'status': 'requested'},
        {'id': 'r3', 'name': 'Client Handbook', 'cat': 'printed', 'qty': '25', 'note': '', 'out': False, 'by': 'krystal@mo-care.com', 'at': '2026-10-15T15:00:00Z', 'status': 'ordered', 'ordered': {'by': 'samantha@mo-care.com', 'at': '2026-10-16T15:00:00Z', 'where': 'Vistaprint'}}]

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=ROOT))
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = 'http://127.0.0.1:%d' % srv.server_address[1]

def wire(pg, st):
    def rest(route, request):
        url = request.url
        if '/rpc/upsert_app_data_item' in url:
            b = json.loads(request.post_data or '{}'); st['saves'].append(b)
            return route.fulfill(status=200, content_type='application/json', body='null')
        key = 'supply_requests' if 'supply_requests' in url else ('supply_items' if 'supply_items' in url else None)
        rows = [{'data': st['reqs'] if key == 'supply_requests' else st['items']}] if key else []
        if 'vnd.pgrst.object' in (request.headers.get('accept') or ''):
            return route.fulfill(status=200, content_type='application/json', body=json.dumps(rows[0] if rows else None))
        return route.fulfill(status=200, content_type='application/json', body=json.dumps(rows))
    pg.route('**/rest/v1/**', rest)
    pg.route('**/auth/v1/**', lambda r, q: r.fulfill(status=200, content_type='application/json', body=json.dumps(SESSION['user'])))
INIT = "(() => { try { localStorage.setItem('sb-zngsgedlsxinbygwmxwn-auth-token', %s); } catch (e) {} })()" % json.dumps(json.dumps(SESSION))

with sync_playwright() as p:
    for eng in ('chromium', 'webkit'):
        b = getattr(p, eng).launch()
        for width in (360, 1024):
            tag = '%s %dpx' % (eng, width)
            st = {'reqs': json.loads(json.dumps(REQS)), 'items': json.loads(json.dumps(ITEMS)), 'saves': []}
            pg = b.new_page(viewport={'width': width, 'height': 900})
            errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            answers = []; prompts = []
            def dlg(d):
                prompts.append(d.message)
                if d.type == 'prompt' and answers: d.accept(answers.pop(0))
                else: d.accept()
            pg.on('dialog', dlg)
            pg.add_init_script(INIT); wire(pg, st)
            pg.goto(BASE + '/supplies.html'); pg.wait_for_selector('#openList .req', timeout=15000)
            ck(tag + ': the pay rule shows', 'Never type a card number' in pg.inner_text('.pay'))
            order = pg.eval_on_selector_all('#openList .req .g b', 'els => els.map(e => e.textContent)')
            ck(tag + ": the order list: we're out first, then what needs ordering, then what's ordered", order == ['HP 206A toner', 'Printer paper', 'Client Handbook'], order)
            ck(tag + ': a known item shows where to buy it, with its store link', 'Buy at Amazon' in pg.inner_text('#openList') and pg.locator('#openList a[href="https://www.amazon.com/x"]').count() == 1)
            ck(tag + ': a printed piece points to Client Folders', pg.locator('#openList a[href="client-folders.html"]').count() == 1)
            ck(tag + ': a javascript: link never becomes a link', pg.locator('a[href^="javascript"]').count() == 0)
            ck(tag + ': a removed item is not listed', 'Old thing' not in pg.inner_text('#sec-office'))

            pg.click('#rAdd'); ck(tag + ': asking with nothing typed is refused', 'Type what we need first' in pg.inner_text('#askMsg') and not st['saves'])
            pg.fill('#rName', 'Gloves'); pg.dispatch_event('#rName', 'change'); pg.fill('#rQty', '3 boxes'); pg.check('#rOut'); pg.click('#rAdd')
            pg.wait_for_function("document.getElementById('askMsg').textContent.includes('Added')")
            s = st['saves'][-1]
            ck(tag + ': ask saves one request with who, when, kind from the known item', s['target_key'] == 'supply_requests' and s['item']['name'] == 'Gloves' and s['item']['cat'] == 'caregiver'
               and s['item']['qty'] == '3 boxes' and s['item']['out'] is True and s['item']['by'] == 'samantha@mo-care.com' and s['item']['status'] == 'requested', s)

            answers.append('Staples'); pg.click('#openList button[data-ordered="r1"]'); pg.wait_for_timeout(300)
            s = st['saves'][-1]['item']
            ck(tag + ': Mark ordered asks where and records who and where', s['id'] == 'r1' and s['status'] == 'ordered' and s['ordered']['where'] == 'Staples' and s['ordered']['by'] == 'samantha@mo-care.com', s)
            pg.click('#openList button[data-received="r3"]'); pg.wait_for_timeout(300)
            s = st['saves'][-1]['item']
            ck(tag + ': Mark received records it and moves it to Received and cancelled', s['id'] == 'r3' and s['status'] == 'received' and s['received']['by'] and 'Client Handbook' in (pg.text_content('#doneList') or ''), s)
            pg.click('#openList button[data-cancel="r2"]'); pg.wait_for_timeout(300)
            s = st['saves'][-1]['item']
            ck(tag + ': Cancel keeps it, marked cancelled', s['id'] == 'r2' and s['status'] == 'cancelled' and 'HP 206A toner' in (pg.text_content('#doneList') or ''), s)

            n0 = len(st['saves'])
            pg.click('#sec-office button[data-quick="Printer paper"]'); pg.wait_for_selector('#eName')
            ck(tag + ': a suggestion opens the add form with the name filled', pg.input_value('#eName') == 'Printer paper')
            pg.fill('#eWhere', 'Staples'); pg.fill('#eKeep', '2 cases'); pg.fill('#eNotes', 'card 4111 1111 1111 1111'); pg.click('#eSave')
            ck(tag + ': a card number in the notes is refused, nothing saved', 'card number' in pg.inner_text('#eMsg') and len(st['saves']) == n0)
            pg.fill('#eNotes', ''); pg.fill('#eLink', 'not a link at all'); pg.click('#eSave')
            ck(tag + ': a bad link is refused', 'link does not look right' in pg.inner_text('#eMsg') and len(st['saves']) == n0)
            pg.fill('#eLink', 'staples.com/paper'); pg.click('#eSave'); pg.wait_for_timeout(300)
            s = st['saves'][-1]
            ck(tag + ': the new item is saved to the supply list', s['target_key'] == 'supply_items' and s['item']['name'] == 'Printer paper' and s['item']['cat'] == 'office' and s['item']['where'] == 'Staples', s)
            ck(tag + ': it shows with its store link', pg.locator('#sec-office a[href="https://staples.com/paper"]').count() == 1)
            pg.click('#sec-office button[data-edit="i1"]'); pg.fill('#eKeep', '3 cartridges'); pg.click('#eSave'); pg.wait_for_timeout(300)
            ck(tag + ': Edit saves the same item', st['saves'][-1]['item']['id'] == 'i1' and st['saves'][-1]['item']['keep'] == '3 cartridges')
            pg.click('#sec-office button[data-edit="i1"]'); pg.click('#eRemove'); pg.wait_for_timeout(300)
            s = st['saves'][-1]['item']
            ck(tag + ': Remove keeps the item, marked removed', s['id'] == 'i1' and s['removed']['by'] == 'samantha@mo-care.com' and 'HP 206A toner' not in pg.eval_on_selector_all('#sec-office .req .g b', 'els => els.map(e => e.textContent)'), s)
            ck(tag + ': no em dashes on screen', '—' not in pg.inner_text('body'))
            ck(tag + ': nothing wider than the screen', pg.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'))
            ck(tag + ': no page errors', not errs, errs)
            pg.close()
        b.close()

    # the Hub wiring (static checks on index.html and inhub.js)
    idx = open(os.path.join(ROOT, 'index.html')).read(); ih = open(os.path.join(ROOT, 'inhub.js')).read()
    row = idx[idx.index('id="fsub-sops"'):idx.index('</div>\n\n', idx.index('id="fsub-sops"'))]
    # 2026-10-30 Videos sits between Client Folders and Order Supplies
    # 2026-10-17 her "i want it inside SOPs": Forms & Templates and Client Folders sit before Order Supplies; Scripts is off the row
    ck('the SOPs row has Order Supplies, last', re.findall(r"switchTab\('(\w+)'\)", row) == ['sops', 'sopref', 'docs', 'docfolders', 'videos', 'supplies'], re.findall(r"switchTab\('(\w+)'\)", row))
    ck('it is in the SOPs group and has a panel with a frame', "sops:['sops','sopref','playbook','docs','docfolders','videos','routing','supplies']" in idx and 'id="tab-supplies"' in idx and 'id="suppliesFrame"' in idx)
    ck('it opens supplies.html inside the Hub', "ccHubFrame(document.getElementById('suppliesFrame'), 'supplies.html?in=hub')" in idx)
    ck('#order-supplies opens it, and links stay inside the Hub', "'order-supplies':'supplies'" in idx and 'forms|supplies)' in ih)
srv.shutdown()
bad = [r for r in R if r[0] == 'FAIL']
for s, n, d in R: print(s, n, ('\n     ' + d) if d else '')
print('\n%d/%d passed' % (len(R) - len(bad), len(R))); sys.exit(1 if bad else 0)

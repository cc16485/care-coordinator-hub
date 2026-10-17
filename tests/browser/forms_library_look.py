"""forms.html, the Hub-wide Forms & Templates library (2026-10-16, Samantha approved the design the same day), offline.
Served over a local http server with a fake Supabase session in localStorage, and Supabase faked at the network:
app_data (GET agency_docs / guide_screens), rpc upsert_app_data_item (bodies recorded), storage upload and sign.
Chromium AND WebKit at 360px and 1024px:
  groups and their labels, revision tags, an old GUIDE-written item (no rev, no family) shown as current,
  Replaced versions under the right document, the Removed section, search, ?cat=GUIDE preselects the filter;
  multi-file upload = one item per file with cat / rev / family, a single-file name override, a 25MB+ file refused;
  the newer-version flow (new item first, then the old item with replaced.with = the new id, same family);
  Remove asks why and refuses under 5 characters; nothing deletes; no em dashes on screen; nothing wider than the screen.
Also guide.html: the Documents button opens forms.html?cat=GUIDE and the other GUIDE tabs still switch (on its own; inside the
Hub it moves the Hub to Documents, see documents_tab_look.py).
python3 tests/browser/forms_library_look.py [screenshot dir]"""
import json, sys, os, threading, functools, http.server
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp'
R = []
def ck(n, c, d=''): R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:400]))

SESSION = {'access_token': 'x.y.z', 'refresh_token': 'r', 'token_type': 'bearer', 'expires_in': 3600, 'expires_at': 4102444800,
           'user': {'id': 'u1', 'aud': 'authenticated', 'role': 'authenticated', 'email': 'samantha@mo-care.com'}}
SEED = [
    # written by the GUIDE page before this library: no rev, no family
    {'id': 'g1', 'name': 'GUIDE Partner Agreement', 'cat': 'GUIDE', 'path': 'guide/g1.pdf', 'size': 204800, 'filename': 'partner.pdf', 'by': 'samantha@mo-care.com', 'at': '2026-07-01T15:00:00Z'},
    {'id': 'h1', 'name': 'Client Handbook', 'cat': 'Client', 'path': 'client/h1.pdf', 'size': 900000, 'filename': 'handbook.pdf', 'by': 'samantha@mo-care.com', 'at': '2026-01-05T15:00:00Z',
     'rev': 'Rev. 01/2026', 'family': 'h1', 'replaced': {'by': 'samantha@mo-care.com', 'at': '2026-10-16T15:00:00Z', 'with': 'h2'}},
    {'id': 'h2', 'name': 'Client Handbook', 'cat': 'Client', 'path': 'client/h2.pdf', 'size': 1900000, 'filename': '16-client-handbook.pdf', 'by': 'samantha@mo-care.com', 'at': '2026-10-16T15:00:00Z',
     'rev': 'Rev. 10/2026', 'family': 'h1'},
    {'id': 'c1', 'name': 'Client Care Agreement', 'cat': 'Contract', 'path': 'contract/c1.docx', 'size': 207000, 'filename': 'agreement.docx', 'by': 'krystal@mo-care.com', 'at': '2026-10-16T16:00:00Z', 'rev': 'Rev. 10/2026', 'family': 'c1'},
    {'id': 'r1', 'name': 'Old intake form', 'cat': 'Form', 'path': 'form/r1.pdf', 'size': 50000, 'filename': 'intake.pdf', 'by': 'samantha@mo-care.com', 'at': '2025-03-01T15:00:00Z',
     'removed': {'by': 'samantha@mo-care.com', 'at': '2026-09-01T15:00:00Z', 'why': 'We stopped using it'}},
]


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass


def serve():
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=ROOT))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def wire(pg, st):
    def rest(route, request):
        url = request.url
        if '/rpc/upsert_app_data_item' in url:
            body = json.loads(request.post_data or '{}'); st['saves'].append(body)
            return route.fulfill(status=200, content_type='application/json', body='null')
        if '/rpc/' in url:
            return route.fulfill(status=200, content_type='application/json', body='null')
        key = 'agency_docs' if 'agency_docs' in url else ('guide_screens' if 'guide_screens' in url else None)
        rows = [{'data': st['docs']}] if key == 'agency_docs' else ([{'data': []}] if key else [])
        accept = (request.headers.get('accept') or '')
        if 'vnd.pgrst.object' in accept:
            return route.fulfill(status=200, content_type='application/json', body=json.dumps(rows[0] if rows else None))
        return route.fulfill(status=200, content_type='application/json', body=json.dumps(rows))
    def storage(route, request):
        url = request.url
        if '/object/sign/' in url:
            st['signed'].append(url)
            return route.fulfill(status=200, content_type='application/json', body=json.dumps({'signedURL': '/object/sign/agency-docs/x?token=t'}))
        if request.method in ('POST', 'PUT'):
            st['uploads'].append(url.split('/object/agency-docs/')[-1])
            return route.fulfill(status=200, content_type='application/json', body=json.dumps({'Key': 'agency-docs/x', 'Id': 'i'}))
        return route.fulfill(status=404, body='')
    def auth(route, request):
        return route.fulfill(status=200, content_type='application/json', body=json.dumps(SESSION['user']))
    pg.route('**/rest/v1/**', rest)
    pg.route('**/storage/v1/**', storage)
    pg.route('**/auth/v1/**', auth)


INIT = """(() => { try { localStorage.setItem('sb-zngsgedlsxinbygwmxwn-auth-token', %s); } catch (e) {}
  window.__opened = []; window.open = function (u) { window.__opened.push(u); return null; }; })()""" % json.dumps(json.dumps(SESSION))


def run(p, eng, base):
    b = getattr(p, eng).launch()
    for width in (360, 1024):
        tag = '%s %dpx' % (eng, width)
        st = {'docs': json.loads(json.dumps(SEED)), 'saves': [], 'uploads': [], 'signed': []}
        pg = b.new_page(viewport={'width': width, 'height': 900})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        answers = []
        def dlg(d):
            prompts.append(d.message)
            if d.type == 'prompt' and answers: d.accept(answers.pop(0))
            else: d.accept()
        prompts = []; pg.on('dialog', dlg)
        pg.add_init_script(INIT); wire(pg, st)
        pg.goto(base + '/forms.html'); pg.wait_for_selector('#list .doc', timeout=15000)

        groups = pg.eval_on_selector_all('#list > .group', 'els => els.map(e => e.textContent.trim())')
        ck(tag + ': groups in order with friendly labels', groups == ['CLIENT DOCUMENTS', 'CONTRACTS & AGREEMENTS', 'GUIDE PROGRAM MATERIAL'] or
           [g.upper() for g in groups] == ['CLIENT DOCUMENTS', 'CONTRACTS & AGREEMENTS', 'GUIDE PROGRAM MATERIAL'], groups)
        cur = pg.eval_on_selector_all('#list > .doc', 'els => els.map(e => e.querySelector(".g b").textContent + "|" + ((e.querySelector(".tag")||{}).textContent||""))')
        ck(tag + ': current documents with revision tags; the old GUIDE item shows with no tag', cur == ['Client Handbook|Rev. 10/2026', 'Client Care Agreement|Rev. 10/2026', 'GUIDE Partner Agreement|'], cur)
        older = pg.eval_on_selector_all('#list details.older', 'els => els.map(e => [e.previousElementSibling.querySelector(".g b").textContent, e.querySelector("summary").textContent, e.querySelectorAll(".doc").length, e.querySelector(".tag").textContent])')
        ck(tag + ': Replaced versions sit under the handbook with the old revision', older == [['Client Handbook', 'Replaced versions (1)', 1, 'Rev. 01/2026']], older)
        ck(tag + ': replaced versions open but cannot be replaced or removed', pg.eval_on_selector('details.older .doc', 'e => !!e.querySelector("[data-open]") && !e.querySelector("[data-ver]") && !e.querySelector("[data-del]")'))
        gone = pg.eval_on_selector('details.gone', 'e => [e.querySelector("summary").textContent, e.textContent.includes("We stopped using it")]')
        ck(tag + ': Removed section keeps the removed form with its reason', gone == ['Removed (1), kept for the record', True], gone)

        pg.fill('#q', 'agreement')
        names = pg.eval_on_selector_all('#list > .doc .g b', 'els => els.map(e => e.textContent)')
        ck(tag + ': search narrows the list', names == ['Client Care Agreement', 'GUIDE Partner Agreement'], names)
        pg.fill('#q', 'zzzz'); ck(tag + ': search with no match says so', 'Nothing matches.' in pg.inner_text('#list'))
        pg.fill('#q', '')

        txt = pg.inner_text('body')
        ck(tag + ': no em dashes on screen', '—' not in txt, [l for l in txt.split('\n') if '—' in l])
        ck(tag + ': a link to the printed Client Folders sits above the upload box', pg.get_attribute('#toFolders', 'href') == 'client-folders.html')
        ck(tag + ': revision label starts as this month', pg.input_value('#uRev').startswith('Rev. ') and len(pg.input_value('#uRev')) == 12, pg.input_value('#uRev'))
        wide = pg.evaluate('document.documentElement.scrollWidth - innerWidth')
        ck(tag + ': nothing wider than the screen', wide <= 0, wide)
        pg.screenshot(path=os.path.join(OUT, 'forms-library-%s-%d.png' % (eng, width)), full_page=True)

        # Open makes a signed link
        pg.click('#list > .doc [data-open]'); pg.wait_for_function('window.__opened.length > 0', timeout=5000)
        ck(tag + ': Open asks storage for a signed link to the file', st['signed'] and 'client/h2.pdf' in st['signed'][0], st['signed'])

        # multi-file upload: one item per file, category + revision shared, file names tidied
        pg.select_option('#uCat', 'Client'); pg.fill('#uRev', 'Rev. 10/2026')
        files = [{'name': '1-levels-of-care.pdf', 'mimeType': 'application/pdf', 'buffer': b'%PDF-1.4 a'},
                 {'name': '5-rates-and-ways-to-pay.pdf', 'mimeType': 'application/pdf', 'buffer': b'%PDF-1.4 b'}]
        pg.set_input_files('#fileIn', files)
        pg.wait_for_function('document.querySelector("#upMsg").innerText.includes("Saved 2 files")', timeout=8000)
        ups = [s['item'] for s in st['saves'] if s.get('target_key') == 'agency_docs']
        ck(tag + ': two files make two items', len(ups) == 2 and len(st['uploads']) == 2, ups)
        ck(tag + ': each new item has category, revision, its own family and a tidy name',
           all(u['cat'] == 'Client' and u['rev'] == 'Rev. 10/2026' and u['family'] == u['id'] and u['by'] == 'samantha@mo-care.com' and not u.get('replaced') for u in ups)
           and sorted(u['name'] for u in ups) == ['levels of care', 'rates and ways to pay'], ups)
        ck(tag + ': files go into the category folder in storage', all(x.startswith('client/') and x.endswith('.pdf') for x in st['uploads']), st['uploads'])
        ck(tag + ': the new files show under Client documents', pg.inner_text('#list').count('Rev. 10/2026') >= 4)

        # one file with a typed name
        st['saves'].clear(); st['uploads'].clear()
        pg.select_option('#uCat', 'Form'); pg.fill('#uName', 'Emergency information sheet')
        pg.set_input_files('#fileIn', [{'name': 'x.pdf', 'mimeType': 'application/pdf', 'buffer': b'%PDF c'}])
        pg.wait_for_function('document.querySelector("#upMsg").innerText.includes("Saved 1 file")', timeout=8000)
        one = st['saves'][0]['item'] if st['saves'] else {}
        ck(tag + ': a single file uses the typed name and kind', one.get('name') == 'Emergency information sheet' and one.get('cat') == 'Form', one)
        ck(tag + ': the name box clears after saving', pg.input_value('#uName') == '')

        # too big
        st['saves'].clear(); st['uploads'].clear()
        pg.set_input_files('#fileIn', [{'name': 'huge.pdf', 'mimeType': 'application/pdf', 'buffer': b'0' * (25 * 1024 * 1024 + 1)}])
        pg.wait_for_function('document.querySelector("#upMsg").innerText.includes("Too big")', timeout=8000)
        ck(tag + ': a file over 25MB is refused and nothing is stored', not st['saves'] and not st['uploads'], st)

        # a newer version of the agreement
        st['saves'].clear(); st['uploads'].clear()
        answers.append('Rev. 11/2026')
        row = pg.locator('#list > .doc', has_text='Client Care Agreement')
        with pg.expect_file_chooser() as fc:
            row.locator('[data-ver]').click()
        fc.value.set_files([{'name': 'agreement-v2.docx', 'mimeType': 'application/octet-stream', 'buffer': b'PK v2'}])
        pg.wait_for_function('document.querySelector("#upMsg").innerText.includes("Replaced versions")', timeout=8000)
        sv = [s['item'] for s in st['saves']]
        ok = len(sv) == 2 and sv[0]['id'] not in ('c1',) and sv[0]['name'] == 'Client Care Agreement' and sv[0]['cat'] == 'Contract' and sv[0]['family'] == 'c1' \
            and sv[0]['rev'] == 'Rev. 11/2026' and not sv[0].get('replaced') and sv[1]['id'] == 'c1' and sv[1]['replaced']['with'] == sv[0]['id'] and sv[1]['family'] == 'c1'
        ck(tag + ': newer version saves the new item first, then marks the old one replaced (same family)', ok, sv)
        ck(tag + ': the newer version goes into the contract folder', st['uploads'] and st['uploads'][0].startswith('contract/'), st['uploads'])
        row = pg.locator('#list > .doc', has_text='Client Care Agreement')
        ck(tag + ': the list shows the new revision with the old one under it',
           row.locator('.tag').text_content() == 'Rev. 11/2026' and 'Rev. 10/2026' in (row.evaluate('e => e.nextElementSibling && e.nextElementSibling.matches("details.older") ? e.nextElementSibling.textContent : ""')),
           row.evaluate('e => e.outerHTML + (e.nextElementSibling ? e.nextElementSibling.outerHTML : "")'))

        # Remove: asks why, refuses too short, then keeps it under Removed
        st['saves'].clear()
        answers.append('old')
        pg.locator('#list > .doc', has_text='GUIDE Partner Agreement').locator('[data-del]').click()
        pg.wait_for_timeout(300)
        ck(tag + ': Remove refuses a reason under 5 characters', not st['saves'] and any('Say why' in m for m in prompts), prompts[-2:])
        answers.append('Replaced by the 2027 agreement')
        pg.locator('#list > .doc', has_text='GUIDE Partner Agreement').locator('[data-del]').click()
        pg.wait_for_function('document.querySelector("details.gone summary").textContent.includes("(2)")', timeout=5000)
        rm = st['saves'][0]['item'] if st['saves'] else {}
        ck(tag + ': Remove keeps the item with who and why', rm.get('id') == 'g1' and rm.get('removed', {}).get('why') == 'Replaced by the 2027 agreement' and rm.get('path') == 'guide/g1.pdf', rm)
        ck(tag + ': no page errors', not errs, errs)
        pg.close()

        # ?cat=GUIDE preselects the filter and the upload kind
        pg = b.new_page(viewport={'width': width, 'height': 900}); pg.add_init_script(INIT)
        st = {'docs': json.loads(json.dumps(SEED)), 'saves': [], 'uploads': [], 'signed': []}; wire(pg, st)
        pg.goto(base + '/forms.html?cat=GUIDE'); pg.wait_for_selector('#list .doc', timeout=15000)
        names = pg.eval_on_selector_all('#list > .doc .g b', 'els => els.map(e => e.textContent)')
        ck(tag + ': ?cat=GUIDE shows only GUIDE material', pg.input_value('#fCat') == 'GUIDE' and pg.input_value('#uCat') == 'GUIDE' and names == ['GUIDE Partner Agreement'], names)
        pg.close()

        # guide.html: Documents opens the library, the other tabs still switch
        pg = b.new_page(viewport={'width': width, 'height': 900}); pg.add_init_script(INIT)
        st = {'docs': json.loads(json.dumps(SEED)), 'saves': [], 'uploads': [], 'signed': []}; wire(pg, st)
        gerrs = []; pg.on('pageerror', lambda e: gerrs.append(str(e)))
        pg.goto(base + '/guide.html'); pg.wait_for_selector('#app:not(.hide)', timeout=15000)
        pg.click('nav button[data-s="say"]')
        ck(tag + ': GUIDE tabs still switch', pg.eval_on_selector('#s-say', 'e => e.classList.contains("on")'))
        pg.click('nav button[data-s="docs"]'); pg.wait_for_url('**/forms.html?cat=GUIDE', timeout=8000)
        ck(tag + ': GUIDE Documents opens the library filtered to GUIDE', pg.url.endswith('/forms.html?cat=GUIDE'), pg.url)
        ck(tag + ': guide page has no errors', not gerrs, gerrs)
        pg.close()
    b.close()


if __name__ == '__main__':
    srv = serve(); base = 'http://127.0.0.1:%d' % srv.server_address[1]
    with sync_playwright() as p:
        for eng in ('chromium', 'webkit'):
            run(p, eng, base)
    srv.shutdown()
    idx = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
    sops = idx[idx.index('id="fsub-sops"'):idx.index('</div>\n\n', idx.index('id="fsub-sops"'))]
    ck('index.html: Forms & Templates and Client Folders sit inside SOPs (no separate Documents tab)',
       'data-g="docs"' not in idx and "switchTab('docs')" in sops and "switchTab('docfolders')" in sops
       and "'docs','docfolders'" in idx and 'forms.html?in=hub' in idx and 'client-folders.html?in=hub' in idx)
    for r in R:
        if r[0] == 'FAIL': print(r[0], r[1], r[2])
    print('forms_library_look: %d passed, %d failed' % (sum(r[0] == 'PASS' for r in R), sum(r[0] == 'FAIL' for r in R)))
    sys.exit(1 if any(r[0] == 'FAIL' for r in R) else 0)

"""2026-10-13: a long document on Step 1 (Samantha: the whole Employment Agreement / Employee Manual in one scrollable reader,
heading visible, a copy to open or save, initials and signature right below). Offline, faked server built from a real view
(step1_view.json from step1_sign_2b_test DUMP_VIEW) plus a made-up long agreement. Chromium AND WebKit (iPhone Safari's
engine), at phone, tablet and desktop widths.  python3 tests/browser/step1_document_look.py <step1_view.json> [out dir]"""
import json, sys, os, copy
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); PAGE = 'file://' + os.path.abspath(os.path.join(HERE, '..', '..', 'step1.html')) + '?o=11111111-2222-3333-4444-555555555555&e=9999999999&t=x'
BASE = json.load(open(sys.argv[1])); OUT = sys.argv[2] if len(sys.argv) > 2 else '/tmp'
PARAS = ['Paragraph %d of section %d. ' % (j, i) + 'These are the exact approved words. ' * 6 for i in range(1, 24) for j in range(1, 3)]
DOC = {'key': 'test_long_doc', 'screen': '8b', 'title': 'Test Employment Agreement', 'short': 'Your employment agreement', 'layout': 'document', 'version': 1, 'status': 'proposed', 'signature': 'typed',
       'intro': ['This agreement is between the Company and you.'], 'sections': [{'h': '%d. Section %d' % (i, i), 'p': [p for p in PARAS if p.endswith('') and (' of section %d. ' % i) in p],
       'items': ([{'id': 'tld_arb_a', 'label': 'Your initials: 19(a) arbitration', 'kind': 'initials', 'required': True}, {'id': 'tld_arb_b', 'label': 'Your initials: 19(b) class action waiver', 'kind': 'initials', 'required': True}] if i == 19 else [])} for i in range(1, 24)],
       'certification': ['I have read the whole agreement.'], 'fingerprint': 'f' * 64, 'approved_for_real': True}
def view():
    v = copy.deepcopy(BASE); v['forms'] = v['forms'] + [DOC]; v['screens'] = ['1', '2', '3', '4', '5a', '5b', '6', '7', '8', '8b', '9']
    v['esign_consent_at'] = '2026-10-13T03:00:00Z'; v['current_screen'] = '8b'; v['test_mode'] = False
    v['signatures'] = {k: {'at': '2026-10-13T03:01:00Z', 'typed_name': 'Pat Practice', 'version': f['version']} for k, f in [(f['key'], f) for f in BASE['forms']]}
    v['signed_count'] = len(v['signatures']); v['form_count'] = 8; v['answers'] = {}
    return v
R = []
def ck(n, c, d=''): R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:300]))
with sync_playwright() as p:
    for eng in ('chromium', 'webkit'):
        b = getattr(p, eng).launch()
        for (w, h, label) in [(375, 740, 'phone'), (820, 1100, 'tablet'), (1280, 900, 'desktop')]:
            st = {'calls': [], 'answers': {}}
            def handle(route, request, st=st):
                body = json.loads(request.post_data or '{}'); a = body.get('action'); st['calls'].append(a)
                if a == 'view': v = view(); v['answers'] = st['answers']; return route.fulfill(status=200, content_type='application/json', body=json.dumps(v))
                if a == 'save':
                    st['answers'].update({k: x for k, x in (body.get('answers') or {}).items()}); return route.fulfill(status=200, content_type='application/json', body='{"ok":true,"saved":1,"rejected":[]}')
                if a == 'document': return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'form': body.get('form'), 'version': 1, 'pdf_base64': 'JVBERi0xLjQK'}))
                if a == 'sign':
                    miss = [x for x in ('tld_arb_a', 'tld_arb_b') if not st['answers'].get(x)]
                    if miss: return route.fulfill(status=400, content_type='application/json', body=json.dumps({'ok': False, 'error': 'Please answer these first: ' + '; '.join(miss) + '.'}))
                    st['signed'] = body; return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'form': body['form'], 'signed_at': '2026-10-13T03:05:00Z', 'version': 1, 'pdf': True, 'done': True, 'signed_count': 8, 'form_count': 8}))
                if a == 'copies': return route.fulfill(status=200, content_type='application/json', body='{"ok":true,"copies":{}}')
                return route.fulfill(status=400, content_type='application/json', body='{"ok":false}')
            ctx = b.new_context(viewport={'width': w, 'height': h}); pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.route('**/functions/v1/step1-sign', handle); pg.goto(PAGE); pg.wait_for_timeout(900)
            tag = f'{eng} {label}'
            t = pg.inner_text('body')
            ck(f'{tag}: the agreement has its own screen (9 of 11), named, before All done', 'Your employment agreement' in t and 'Screen 10 of 11' in t, t[:300])
            n_in_reader = pg.evaluate("document.querySelectorAll('.reader p:not(.inimark)').length")
            ck(f'{tag}: every paragraph of the document is in the reader (nothing shortened)', n_in_reader == len(PARAS) + 1 + 1 + 1, n_in_reader)
            sc = pg.evaluate("(() => { const r = document.querySelector('.reader'); return { sh: r.scrollHeight, ch: r.clientHeight, ov: getComputedStyle(r).overflowY } })()")
            ck(f'{tag}: the reader scrolls inside its own box', sc['sh'] > sc['ch'] * 2 and sc['ov'] == 'auto', sc)
            pg.evaluate("document.querySelector('.reader').scrollTop = 4000"); pg.wait_for_timeout(150)
            hb = pg.evaluate("(() => { const h = document.querySelector('.dochead').getBoundingClientRect(), r = document.querySelector('.docwrap').getBoundingClientRect(); return { top: h.top - r.top, vis: h.height > 0 } })()")
            ck(f'{tag}: the document heading stays put while reading', hb['top'] <= 1 and hb['vis'], hb)
            wide = pg.evaluate("document.documentElement.scrollWidth - innerWidth")
            ck(f'{tag}: nothing wider than the screen', wide <= 0, wide)
            ck(f'{tag}: initials for 19(a) and 19(b) right below, each with a link to its section; then the signature', pg.locator('input.ini').count() == 2 and pg.locator('text=Read this section').count() == 2 and pg.locator('#b_sign').count() == 1)
            pg.evaluate("document.querySelector('.reader').scrollTop = 0"); pg.locator('text=Read this section').first.click(); pg.wait_for_timeout(500)
            st19 = pg.evaluate("(() => { const r = document.querySelector('.reader'), s = document.getElementById('dsec_test_long_doc_18'); return { top: r.scrollTop, target: s.offsetTop - r.offsetTop } })()")
            ck(f'{tag}: "Read this section" scrolls the reader to section 19', abs(st19['top'] - st19['target']) < 40, st19)
            pg.locator('#c_sign').check(); pg.fill('#n_sign', 'Pat Practice'); pg.click('#b_sign'); pg.wait_for_timeout(500)
            ck(f'{tag}: signing without the initials is refused with the reason', 'tld_arb_a' in pg.inner_text('#e_sign') and 'signed' not in st, pg.inner_text('#e_sign'))
            pg.locator('input.ini').nth(0).fill('pp'); pg.locator('input.ini').nth(1).fill('PP'); pg.wait_for_timeout(1000)
            pg.locator('#c_sign').check(); pg.fill('#n_sign', 'Pat Practice'); pg.click('#b_sign'); pg.wait_for_timeout(700)
            ck(f'{tag}: with both initials saved the agreement signs and Step 1 is complete', st.get('signed', {}).get('form') == 'test_long_doc' and 'All done' in pg.inner_text('body'), (st.get('signed'), st['answers']))
            pg.goto(PAGE); pg.wait_for_timeout(600)
            with ctx.expect_page(timeout=5000) as newp: pg.click('text=Open or save a copy (PDF)')
            ck(f'{tag}: "Open or save a copy" asks the server for the whole document and opens it', 'document' in st['calls'], st['calls'])
            if label == 'phone': pg.goto(PAGE); pg.wait_for_timeout(600); pg.screenshot(path=os.path.join(OUT, f'step1_doc_{eng}_phone.png'))
            ck(f'{tag}: no page errors', not errs, errs[:2])
            ctx.close()
        b.close()
for r in R: print(f'{r[0]:6} {r[1]} {r[2]}')
print(f"{sum(r[0] == 'PASS' for r in R)}/{len(R)} passed"); sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

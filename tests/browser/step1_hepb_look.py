"""2026-10-13 HEPATITIS B IN STEP 1 (Samantha: the Hepatitis B form in Step 1, offered to everyone; bloodborne pathogens
training stays in the on-the-job courses). The real Step 1 link (not the preview) on its last form, with a faked server built
from the REAL step1-sign words (its read-only preview payload, run offline from the Staffing code). Chromium and WebKit
(iPhone Safari's engine) at phone and desktop widths, plus the office review.
  - the vaccine information is in the reader before the choice; five answers; nothing wider than the screen
  - the choice and the statement agreement go ONLY in the sign request (never a save), a declination shows Appendix A
  - a refused or failed sign keeps the choice on the page and offers a safe retry; a signed form never shows the answer
  - a yes on prior series shows the private proof link; the review shows only the status words
python3 tests/browser/step1_hepb_look.py <Staffing supabase/functions> tests/browser/step1_preview_srv.mjs [out dir]"""
import json, sys, os, subprocess, copy
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
FNDIR, SRV = sys.argv[1], sys.argv[2]; OUT = sys.argv[3] if len(sys.argv) > 3 else '/tmp'
BASE = json.loads(subprocess.run(['node', SRV, FNDIR], input='{"action":"preview"}', capture_output=True, text=True, timeout=60).stdout)
OID = '11111111-2222-3333-4444-555555555555'
PAGE = 'file://' + os.path.join(ROOT, 'step1.html') + '?o=' + OID + '&e=9999999999&t=x'
REVIEW = 'file://' + os.path.join(ROOT, 'step1.html') + '?review=' + OID + '&screen=16'
APPX = 'I understand that due to my occupational exposure to blood or other potentially infectious materials I may be at risk of acquiring hepatitis B virus (HBV) infection. I have been given the opportunity to be vaccinated with hepatitis B vaccine, at no charge to myself. However, I decline hepatitis B vaccination at this time. I understand that by declining this vaccine, I continue to be at risk of acquiring hepatitis B, a serious disease. If in the future I continue to have occupational exposure to blood or other potentially infectious materials and I want to be vaccinated with hepatitis B vaccine, I can receive the vaccination series at no charge to me.'
def view(signed_hepb=False):
    v = copy.deepcopy(BASE); v.pop('preview', None)
    v['answers'] = {'transport_willing': 'no'}; v['esign_consent_at'] = '2026-10-13T03:00:00Z'; v['current_screen'] = '16'; v['test_mode'] = False
    keys = [f['key'] for f in v['forms'] if f['key'] not in ('vehicle', 'hepb_vaccination')]
    v['signatures'] = {k: {'at': '2026-10-13T03:01:00Z', 'typed_name': 'Dee Office', 'version': 1} for k in keys}
    if signed_hepb: v['signatures']['hepb_vaccination'] = {'at': '2026-10-13T03:05:00Z', 'typed_name': 'Dee Office', 'version': 1}
    v['signed_count'] = len(v['signatures']); v['form_count'] = 13
    return v
R = []
def ck(n, c, d=''): R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:300]))
ck('the real words: the Hepatitis B form is in the payload with its five choices and Appendix A', any(f['key'] == 'hepb_vaccination' and len(f['choices']['options']) == 5 and f['decline']['statement'] == APPX for f in BASE['forms']))
with sync_playwright() as p:
    for eng in ('chromium', 'webkit'):
        b = getattr(p, eng).launch()
        for (w, h, label) in [(375, 740, 'phone'), (1280, 900, 'desktop')]:
            st = {'calls': [], 'signs': [], 'fail_next': True}
            def handle(route, request, st=st):
                body = json.loads(request.post_data or '{}'); a = body.get('action'); st['calls'].append(body)
                if a == 'view': return route.fulfill(status=200, content_type='application/json', body=json.dumps(view(bool(st.get('signed')))))
                if a == 'save': return route.fulfill(status=200, content_type='application/json', body='{"ok":true,"saved":0,"rejected":[]}')
                if a == 'sign':
                    st['signs'].append(body)
                    if st['fail_next']: st['fail_next'] = False; return route.fulfill(status=500, content_type='application/json', body=json.dumps({'ok': False, 'error': 'We could not save your answer, so this form is not signed yet. Your choice is kept on this page. Please tap the button again, or call the office: (417) 234-8494.'}))
                    st['signed'] = True
                    return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'form': body['form'], 'signed_at': '2026-10-13T03:05:00Z', 'version': 1, 'pdf': True, 'done': True, 'signed_count': 13, 'form_count': 13, 'practice': False, 'proof_link': 'https://cc.mo-care.com/hepb.html?h=abc&e=1&t=x' if body.get('choice') == 'prior_series' else None}))
                if a == 'copies': return route.fulfill(status=200, content_type='application/json', body='{"ok":true,"copies":{"hepb_vaccination":"https://signed/hb/x.pdf"}}')
                return route.fulfill(status=400, content_type='application/json', body='{"ok":false}')
            ctx = b.new_context(viewport={'width': w, 'height': h}); pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.route('**/functions/v1/step1-sign', handle); pg.goto(PAGE); pg.wait_for_timeout(900)
            tag = f'{eng} {label}'; t = pg.inner_text('#main')
            ck(f'{tag}: opens on the Hepatitis B form, Form 13 of 13', 'Hepatitis B Vaccination' in t and 'Form 13 of 13' in t, t[:200])
            pos = pg.evaluate("(() => { const r = document.querySelector('.reader'), c = document.getElementById('hchoice'); return !!r && !!c && (r.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING) > 0 })()")
            ck(f'{tag}: the vaccine information reader comes before the choice', pos)
            ck(f'{tag}: five answers, each a full-width button', pg.locator('#hchoice .seg.vert button').count() == 5)
            ck(f'{tag}: nothing wider than the screen', pg.evaluate('document.documentElement.scrollWidth - innerWidth') <= 0)
            pg.locator('#hchoice .seg.vert button', has_text='No, I decline').click(); pg.wait_for_timeout(200)
            ck(f'{tag}: declining shows Appendix A word for word with its own agreement box', pg.inner_text('#decl blockquote').strip() == APPX and pg.locator('#c_decl').count() == 1)
            pg.locator('#c_decl').check(); pg.locator('#hchoice .seg.vert button', has_text='I already completed').click(); pg.wait_for_timeout(200)
            ck(f'{tag}: another choice hides the statement and clears its agreement', pg.locator('#decl').count() == 0 and 'add a copy of your vaccine record' in pg.inner_text('#hchoice'))
            ck(f'{tag}: choosing saved nothing (no save carries the choice)', not any(c.get('action') == 'save' and ('choice' in json.dumps(c.get('answers') or {}) or 'prior_series' in json.dumps(c)) for c in st['calls']))
            pg.check('#c_sign'); pg.fill('#n_sign', 'Dee Office'); pg.click('#b_sign'); pg.wait_for_timeout(500)
            ck(f'{tag}: a failed sign keeps the choice on the page and offers a safe retry', 'not signed yet' in pg.inner_text('#e_sign') and pg.locator('#hchoice button.on').inner_text().startswith('I already completed') and 'Try again' in pg.inner_text('#b_sign'), pg.inner_text('#e_sign'))
            pg.click('#b_sign'); pg.wait_for_timeout(700)
            s = st['signs'][-1] if st['signs'] else {}
            ck(f'{tag}: the sign request carries the choice (and only there)', s.get('form') == 'hepb_vaccination' and s.get('choice') == 'prior_series' and s.get('decline_consent') is False, s)
            t = pg.inner_text('#main')
            ck(f'{tag}: All done, with the private link to add the proof', 'All done' in t and 'Add my record or result' in t, t[:300])
            ck(f'{tag}: the link is the private hepatitis B page', pg.locator('a', has_text='Add my record or result').get_attribute('href').startswith('https://cc.mo-care.com/hepb.html?h='))
            pg.screenshot(path=os.path.join(OUT, f'hepb_done_{eng}_{label}.png'), full_page=True)
            # reopened later: signed; the answer is never shown again
            pg.reload(); pg.wait_for_timeout(900)
            pg.evaluate("go('16')"); pg.wait_for_timeout(300); t = pg.inner_text('#main')
            ck(f'{tag}: a signed Hepatitis B form never shows the answer again (confidential record)', 'saved in your confidential employee medical record' in t and pg.locator('#hchoice').count() == 0 and 'prior' not in t.lower(), t[:300])
            ck(f'{tag}: no page errors', not errs, errs)
            ctx.close()
        # the office review: the status words only
        ctx = b.new_context(viewport={'width': 375, 'height': 740}); pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.add_init_script("localStorage.setItem('sb-zngsgedlsxinbygwmxwn-auth-token', JSON.stringify({ access_token: 'staff' }))")
        def rv(route, request):
            body = json.loads(request.post_data or '{}'); v = view(True); v.update({'review': True, 'hepb_status': 'Answered, the office is checking', 'signed': {k: {**x, 'pdf': k != 'hepb_vaccination'} for k, x in v['signatures'].items()}, 'countersign_forms': [], 'countersignatures': {}})
            return route.fulfill(status=200, content_type='application/json', body=json.dumps(v))
        pg.route('**/functions/v1/step1-sign', rv); pg.goto(REVIEW); pg.wait_for_timeout(900); t = pg.inner_text('#main')
        ck(f'{eng} review: the office sees the information and the status words, never the answer or a PDF button', 'Answered, the office is checking' in t and 'confidential medical record' in t and pg.locator('#hchoice').count() == 0 and 'Open the signed PDF' not in t, t[:400])
        ck(f'{eng} review: no page errors', not errs, errs)
        b.close()
for s_, n, d in R: print(s_, ' ', n, ('  ' + d) if d else '')
bad = [x for x in R if x[0] == 'FAIL']; print(f'{len(R) - len(bad)}/{len(R)} passed'); sys.exit(1 if bad else 0)

"""hepb.html, the caregiver's hepatitis B vaccine offer page (OSHA 1910.1030; 2026-10-13), offline with the hepb server faked to its
link contract (view / choose / decline / upload_url / uploaded; the body carries h, e, t; shapes copied from supabase/functions/hepb/index.ts
in the Staffing repo) and the signed upload PUT routed. Chromium AND WebKit (iPhone Safari's engine) at 360px and 1024px:
  the five answers; (1) the vaccine; (2) completed series with a proof upload; (3) immune; (4) contraindicated with no medical
  detail asked; (5) decline: the Appendix A statement shown word for word, consent + typed name, the fingerprint sent, the server's
  refusal shown; after declining only the vaccine is offered ((f)(2)(iii)); a dead link; no browser storage written; nothing wider
  than the screen; big tap targets.
python3 tests/browser/hepb_page_look.py [screenshot dir]"""
import json, sys, os
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp'
HB = 'aaaaaaaa-bbbb-4ccc-8ddd-000000000001'
PAGE = 'file://' + os.path.join(ROOT, 'hepb.html') + '?h=' + HB + '&e=1999999999&t=' + 'x' * 43
APPX = ('I understand that due to my occupational exposure to blood or other potentially infectious materials I may be at risk of acquiring hepatitis B virus (HBV) infection. '
        'I have been given the opportunity to be vaccinated with hepatitis B vaccine, at no charge to myself. However, I decline hepatitis B vaccination at this time. '
        'I understand that by declining this vaccine, I continue to be at risk of acquiring hepatitis B, a serious disease. If in the future I continue to have occupational exposure '
        'to blood or other potentially infectious materials and I want to be vaccinated with hepatitis B vaccine, I can receive the vaccination series at no charge to me.')
FP = 'c' * 64
DECL = {'title': 'Hepatitis B Vaccine Declination (Mandatory)', 'version': 1, 'intro': ['Federal workplace safety rules (OSHA 29 CFR 1910.1030) say that if you choose not to get the hepatitis B vaccine, you sign this exact statement. The words come from the regulation and cannot be changed.',
        'Signing is your choice. You can change your mind at any time while you work here and get the vaccine at no cost to you.'], 'statement': APPX, 'fingerprint': FP}
NOPE = 'This link is not valid or has run out. Please ask the office for a new one: (417) 234-8494.'
CHOICES = ['vaccine', 'prior_series', 'immune', 'contraindicated']
MIME = {'image/jpeg': 'jpg', 'image/png': 'png', 'image/heic': 'heic', 'image/webp': 'webp', 'application/pdf': 'pdf'}
UPLOAD_HOST = 'https://zngsgedlsxinbygwmxwn.supabase.co/storage/v1/object/upload/sign/hepb-docs/'
STORAGE_SPY = """(() => { window.__w = []; const o = Storage.prototype.setItem; Storage.prototype.setItem = function(k, v){ window.__w.push(k); return o.call(this, k, v); };
  const io = indexedDB && indexedDB.open ? indexedDB.open.bind(indexedDB) : null; if (io) indexedDB.open = function(n){ window.__w.push('idb:' + n); return io.apply(null, arguments); }; })()"""
R = []
def ck(n, c, d=''): R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:400]))

def server(st):
    def can():
        s = st['status']
        if s == 'declined': return ['vaccine']
        if s == 'complete' or st.get('verified') or st.get('doses'): return []
        out = [c for c in CHOICES if c != s]
        if not st.get('declined_at'): out.append('declined')
        return out
    def view():
        return {'ok': True, 'first': 'Pat', 'status': st['status'], 'status_label': st['status'], 'answered': st['status'] != 'pending', 'verified': bool(st.get('verified')), 'can_choose': can(),
                'declination': DECL, 'doses_recorded': len(st.get('doses', [])), 'series_complete': False, 'declined_at': st.get('declined_at'),
                'proofs_on_file': {'series_proof': st.get('series_proof', False), 'titer_proof': False}, 'office_phone': '(417) 234-8494'}
    def handle(route, request):
        body = json.loads(request.post_data or '{}'); a = body.get('action'); st['calls'].append(body)
        J = lambda code, obj: route.fulfill(status=code, content_type='application/json', body=json.dumps(obj))
        if body.get('t') is None or body.get('h') != HB or st.get('dead'): return J(401, {'ok': False, 'error': NOPE})
        if a == 'view': return J(200, view())
        if a == 'choose':
            c = body.get('choice')
            if c not in can() or c == 'declined': return J(409, {'ok': False, 'error': 'The office has already recorded your answer. To change it, please call (417) 234-8494.'})
            st['status'] = c; return J(200, {'ok': True, 'status': c})
        if a == 'decline':
            if st.pop('not_live', False): return J(409, {'ok': False, 'error': 'This form is not open for signing yet. The office will let you know: (417) 234-8494.', 'not_live': True})
            if body.get('consent') is not True: return J(400, {'ok': False, 'error': 'Please tick "I agree to sign this statement electronically" first.'})
            if body.get('fingerprint') != FP: return J(409, {'ok': False, 'error': 'stale'})
            st['signed'] = body; st['status'] = 'declined'; st['declined_at'] = '2026-10-13T16:00:00Z'
            return J(200, {'ok': True, 'status': 'declined', 'pdf': True, 'copy_url': 'https://zngsgedlsxinbygwmxwn.supabase.co/storage/v1/object/sign/hepb-docs/copy?token=c'})
        if a == 'upload_url':
            k, ct = body.get('kind'), body.get('content_type')
            if k not in ('series_proof', 'titer_proof') or ct not in MIME: return J(400, {'ok': False, 'error': 'Please use a photo (JPG, PNG, HEIC or WebP) or a PDF.'})
            p = 'hb/%s/%s/1760371200-ab12cd34.%s' % (HB, k, MIME[ct]); return J(200, {'ok': True, 'path': p, 'token': 'tok', 'url': UPLOAD_HOST + p + '?token=tok'})
        if a == 'uploaded':
            if not any(x['path'] == body.get('path') for x in st['puts']): return J(409, {'ok': False, 'error': 'We did not receive the file. Please upload it again.'})
            st['uploaded'].append(body); st[body['kind']] = True; return J(200, {'ok': True})
        return J(400, {'ok': False, 'error': 'Unknown action.'})
    def put(route, request):
        st['puts'].append({'path': request.url.split('/hepb-docs/')[1].split('?')[0], 'ct': request.headers.get('content-type')})
        return route.fulfill(status=200, content_type='application/json', body='{"Key":"x"}')
    return handle, put
def fresh(**x):
    st = {'status': 'pending', 'calls': [], 'puts': [], 'uploaded': []}; st.update(x); return st
def other(route, request): return route.continue_() if request.url.startswith('file:') else route.abort()
JPG = b'\xff\xd8\xff\xe0' + b'0' * 2000

with sync_playwright() as p:
    for eng in ('chromium', 'webkit'):
        b = getattr(p, eng).launch()
        for (w, h, label) in [(360, 740, 'phone 360'), (1024, 900, 'desktop 1024')]:
            tag = f'{eng} {label}'; errs = []
            def open_page(st):
                ctx = b.new_context(viewport={'width': w, 'height': h}); ctx.add_init_script(STORAGE_SPY)
                pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
                handle, put = server(st)
                pg.route('**/*', other); pg.route('**/functions/v1/hepb', handle); pg.route('**/storage/v1/object/upload/sign/**', put)
                pg.goto(PAGE); pg.wait_for_timeout(400); return ctx, pg
            def wide(pg): return pg.evaluate('document.documentElement.scrollWidth > window.innerWidth + 1')
            def small_taps(pg): return pg.evaluate("[...document.querySelectorAll('button.opt, button.go, .pick label')].filter(e => e.offsetParent && e.getBoundingClientRect().height < 44).length")
            # ── (5) decline, word for word ──
            st = fresh(not_live=True); ctx, pg = open_page(st)
            t = pg.inner_text('body')
            ck(f'{tag}: opens with their name, no cost, their choice; the five answers', 'Hi, Pat.' in t and 'no cost to you' in t and 'It is your choice' in t and pg.locator('button.opt').count() == 5, t[:500])
            ck(f'{tag}: the link\'s h, e and t go with every call', st['calls'] and all(c.get('h') == HB and c.get('e') == '1999999999' and c.get('t') for c in st['calls']))
            ck(f'{tag}: nothing wider than the screen; every answer and button is a big tap target', not wide(pg) and small_taps(pg) == 0)
            pg.locator('button.opt[data-k=declined]').click(); pg.wait_for_timeout(150)
            ck(f'{tag}: decline shows the Appendix A statement exactly, character for character', pg.inner_text('#stmt').strip() == APPX, pg.inner_text('#stmt')[:200])
            ck(f'{tag}: the words around it say it is optional and can be changed later at no cost; nothing discourages or adds liability', 'change your mind' in pg.inner_text('#decl') and 'liab' not in pg.inner_text('#decl').lower())
            if eng == 'chromium' and w == 360: pg.screenshot(path=os.path.join(OUT, 'hepb_decline_360.png'), full_page=True)
            pg.click('#b_sign'); pg.wait_for_timeout(100)
            ck(f'{tag}: decline without the consent tick: the page says so, nothing sent', 'Please tick' in pg.inner_text('#e_sign') and not any(c.get('action') == 'decline' for c in st['calls']))
            pg.check('#c_sign'); pg.fill('#n_sign', 'Pat'); pg.click('#b_sign'); pg.wait_for_timeout(100)
            ck(f'{tag}: one name only: asks for first and last', 'first and last' in pg.inner_text('#e_sign'))
            pg.fill('#n_sign', 'Pat Practice'); pg.click('#b_sign'); pg.wait_for_timeout(300)
            ck(f'{tag}: the server\'s refusal (switch off) is shown in its own words; the button comes back', 'not open for signing yet' in pg.inner_text('#e_sign') and pg.is_enabled('#b_sign'))
            pg.click('#b_sign'); pg.wait_for_timeout(400)
            s = st.get('signed') or {}
            ck(f'{tag}: signed with consent, the typed name and the wording fingerprint', s.get('consent') is True and s.get('typed_name') == 'Pat Practice' and s.get('fingerprint') == FP, s)
            t = pg.inner_text('body')
            ck(f'{tag}: after signing: the declination is on file, the signed copy link, and ONLY the vaccine is offered (they can change their mind)', 'You declined the vaccine' in t and pg.locator('a', has_text='Open your signed copy').count() == 1 and pg.locator('button.opt').count() == 1 and pg.locator('button.opt[data-k=vaccine]').count() == 1, t[:600])
            pg.locator('button.opt[data-k=vaccine]').click(); pg.click('#b_choose'); pg.wait_for_timeout(300)
            ck(f'{tag}: (f)(2)(iii) after declining, choosing the vaccine works from the same page', st['status'] == 'vaccine' and 'set up your shots at no cost' in pg.inner_text('body'))
            ck(f'{tag}: no browser storage written; no page errors', pg.evaluate('window.__w.length') == 0 and not errs, errs)
            ctx.close()
            # ── (1) vaccine ──
            st = fresh(); ctx, pg = open_page(st)
            pg.locator('button.opt[data-k=vaccine]').click(); pg.click('#b_choose'); pg.wait_for_timeout(300)
            t = pg.inner_text('body')
            ck(f'{tag}: (1) the vaccine: recorded, the office arranges it at no cost; the other answers stay open until the office records a dose', st['status'] == 'vaccine' and 'You chose the vaccine' in t and pg.locator('button.opt').count() == 4, t[:400])
            ctx.close()
            # ── (2) completed series, with proof ──
            st = fresh(); ctx, pg = open_page(st)
            pg.locator('button.opt[data-k=prior_series]').click(); pg.click('#b_choose'); pg.wait_for_timeout(300)
            ck(f'{tag}: (2) completed series: the proof box appears', st['status'] == 'prior_series' and pg.locator('#proof').count() == 1 and 'vaccine record' in pg.inner_text('#proof').lower())
            pg.set_input_files('#proof input[accept="image/*,application/pdf"]', files=[{'name': 'card.jpg', 'mimeType': 'image/jpeg', 'buffer': JPG}]); pg.wait_for_timeout(500)
            ck(f'{tag}: (2) the proof goes to the private upload address and is recorded; on file after', len(st['puts']) == 1 and st['puts'][0]['ct'] == 'image/jpeg' and st['uploaded'] and st['uploaded'][0]['kind'] == 'series_proof' and 'On file' in pg.inner_text('#proof'), st['puts'])
            if eng == 'webkit' and w == 360: pg.screenshot(path=os.path.join(OUT, 'hepb_proof_360_webkit.png'), full_page=True)
            ctx.close()
            # ── (3) immune; (4) contraindicated ──
            st = fresh(); ctx, pg = open_page(st)
            pg.locator('button.opt[data-k=immune]').click(); pg.click('#b_choose'); pg.wait_for_timeout(300)
            ck(f'{tag}: (3) immune: recorded, asks for the antibody result', st['status'] == 'immune' and 'antibody' in pg.inner_text('#proof').lower())
            ctx.close()
            st = fresh(); ctx, pg = open_page(st)
            pg.locator('button.opt[data-k=contraindicated]').click(); pg.wait_for_timeout(100)
            ck(f'{tag}: (4) contraindicated: no box asks for any medical detail', pg.locator('#main textarea, #main input[type=text]').count() == 0)
            pg.click('#b_choose'); pg.wait_for_timeout(300)
            ck(f'{tag}: (4) recorded with only the choice sent; the page says no medical details are kept', st['status'] == 'contraindicated' and set(st['calls'][-2].keys()) <= {'action', 'choice', 'h', 'e', 't'} and 'never your medical details' not in '' and 'only that you cannot receive it' in pg.inner_text('body'))
            ctx.close()
            # ── a dead link ──
            st = fresh(dead=True); ctx, pg = open_page(st)
            ck(f'{tag}: a dead link says so with the office number', 'could not open' in pg.inner_text('body') and '(417) 234-8494' in pg.inner_text('body'))
            ctx.close()
        b.close()
for r in R: print(r[0] + '  ' + r[1] + ('  ' + r[2] if r[2] else ''))
print(f"{sum(1 for r in R if r[0] == 'PASS')}/{len(R)} passed"); sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

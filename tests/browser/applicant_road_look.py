"""The road to your first shift on the pages a new hire opens (2026-10-18, her "can those cute visuals be added to the
applicants side that they see as well?"). Each page in its own made-up preview: the offer (at Offer, Paperwork once
both are signed), Step 1 (Paperwork on the welcome screen, Checks & references when all done), Step 2 (Payroll setup,
Orientation next after "I finished"), the Orientation Video Call page (Orientation). Nothing is sent: the server is
cut off, except the Step 1 page's own practice preview, which only reads. (python3 tests/browser/applicant_road_look.py; SHOT=dir saves screenshots)"""
import os, sys, mimetypes
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
R = []
def ok(n, c, d=''): R.append(['PASS' if c else 'FAIL', n, '' if c else str(d)[:400]])
def serve(route):
    path = route.request.url.split('://', 1)[1].split('/', 1)[1].split('?')[0] or 'index.html'
    f = os.path.join(ROOT, path)
    if os.path.isfile(f): route.fulfill(path=f, content_type=mimetypes.guess_type(f)[0] or 'application/octet-stream')
    else: route.fulfill(status=404, body='')
road = "()=>{ const r=document.querySelector('.aroad'); return r ? { label:r.getAttribute('aria-label'), say:r.querySelector('.aroad-say').textContent, ticks:r.querySelectorAll('svg path[stroke=\"#fff\"]').length, visible:!!(r.offsetParent||r.getClientRects().length) } : null }"
shot = os.environ.get('SHOT')
with sync_playwright() as pw:
    b = pw.chromium.launch()
    def page(w=420):
        pg = b.new_page(viewport={'width': w, 'height': 900})
        def rt(r):
            u = r.request.url
            if u.startswith('http://hub.test/'): return serve(r)
            body = r.request.post_data or ''
            # only the Step 1 page's own made-up preview may reach the server (it reads practice data and writes nothing)
            if 'supabase.co' in u and r.request.resource_type != 'script' and not ('"action":"preview' in body): return r.abort()
            return r.continue_()
        pg.route('**/*', rt)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200])); return pg, errs
    # the road itself
    pg, errs = page(700); pg.goto('http://hub.test/step2.html?preview=1'); pg.wait_for_timeout(800)
    stops = pg.evaluate("ARoad.STOPS")
    ok('eight stops in the real order', stops == ['Applied', 'Interview', 'Offer', 'Paperwork', 'Checks & references', 'Payroll setup', 'Orientation', 'First shift'], stops)
    no_dash = pg.evaluate("[0,1,2,3,4,5,6,7].every(i=>!/\\u2014/.test(ARoad.html(i)))")
    ok('no em dashes in anything the road says', no_dash)
    r = pg.evaluate(road)
    ok('Step 2 page · at Payroll setup, five stops ticked behind, Orientation next', r and r['label'] == 'Your road to your first shift: you are at Payroll setup, next is Orientation.' and r['ticks'] == 5 and 'Next: Orientation' in r['say'], r)
    if shot: os.makedirs(shot, exist_ok=True); pg.locator('.wrap').first.screenshot(path=os.path.join(shot, 'step2-wide.png'))
    pg.click('#go'); pg.wait_for_timeout(400)
    r = pg.evaluate(road)
    ok('Step 2 page · after "I finished Step 2": at Orientation, the road stays on the page', r and 'you are at Orientation' in r['label'] and r['ticks'] == 6, r)
    ok('Step 2 page · no page errors', not errs, errs)
    pg.close()
    pg, errs = page(); pg.goto('http://hub.test/step2.html?preview=1'); pg.wait_for_timeout(600)
    if shot: pg.screenshot(path=os.path.join(shot, 'step2-phone.png'), full_page=True)
    lbl_hidden = pg.evaluate("getComputedStyle(document.querySelector('.aroad .lbl')).display")
    ok('phone width · the stop names under the dots hide, the sentence stays', lbl_hidden == 'none' and pg.evaluate("!!document.querySelector('.aroad-say')"), lbl_hidden)
    wide = pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
    ok('phone width · no sideways scrolling', wide)
    pg.close()
    # offer
    pg, errs = page(); pg.goto('http://hub.test/offer.html?preview=1'); pg.wait_for_timeout(1200)
    r = pg.evaluate(road)
    ok('offer page · at Offer, Applied and Interview ticked', r and 'you are at Offer, next is Paperwork' in r['label'] and r['ticks'] == 2, [r, errs])
    if shot: pg.screenshot(path=os.path.join(shot, 'offer-phone.png'))
    ok('offer page · no page errors', not errs, errs)
    pg.close()
    # step 1
    pg, errs = page(); pg.goto('http://hub.test/step1.html?preview=1'); pg.wait_for_timeout(1200)
    r = pg.evaluate(road)
    ok('Step 1 welcome screen · at Paperwork', r and 'you are at Paperwork, next is Checks & references' in r['label'], [r, errs])
    pg.evaluate("go('9')"); pg.wait_for_timeout(500)
    r = pg.evaluate(road)
    ok('Step 1 all-done screen · at Checks & references, Payroll setup next', r and 'you are at Checks & references, next is Payroll setup' in r['label'], r)
    pg.evaluate("go('3')"); pg.wait_for_timeout(300)
    ok('Step 1 form screens · no road (it stays out of the way while they fill forms)', pg.evaluate("!document.querySelector('.aroad')"))
    ok('Step 1 · no page errors', not errs, errs)
    pg.close()
    # orientation video call page
    pg, errs = page(); pg.goto('http://hub.test/welcome.html?preview=1'); pg.wait_for_timeout(1500)
    r = pg.evaluate(road)
    ok('Orientation Video Call page · at Orientation, with the booking view', r and 'you are at Orientation, next is First shift' in r['label'] and r['visible'], [r, errs, pg.evaluate("[...document.querySelectorAll('[id$=View]')].filter(e=>!e.classList.contains('hide')).map(e=>e.id)")])
    if shot: pg.screenshot(path=os.path.join(shot, 'welcome-phone.png'))
    ok('Orientation page · no page errors', not errs, errs)
    pg.close()
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

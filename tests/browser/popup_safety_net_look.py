"""2026-10-15 · The pop-up safety net (her no-silent-failures rule). Every alert() shows on the page (and is still there
after a reload until OK is pressed); a confirm()/prompt() the browser blocks (comes back at once) shows a red note
saying nothing was done; one a person actually answers shows nothing extra. Offline, no Supabase.
(python3 tests/browser/popup_safety_net_look.py)  HUB_URL defaults to http://localhost:8765."""
import os, time
from playwright.sync_api import sync_playwright
URL = os.environ.get('HUB_URL', 'http://localhost:8765')
R = []
def ok(n, c, d=''): R.append(['PASS' if c else 'FAIL', n, '' if c else str(d)[:400]])
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page()
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    MODE = {'v': 'block'}
    def on_dialog(d):
        if MODE['v'] == 'block': d.dismiss()          # what a switched-off browser does, at once
        else: time.sleep(0.3); d.accept('typed by a person') if d.type == 'prompt' else d.accept()
    pg.on('dialog', on_dialog)
    pg.goto(URL + '/index.html?proof=popupnet'); pg.wait_for_timeout(1200)

    pg.evaluate("alert('Could not save that: test reason')")
    n = pg.locator('#ccNoticeStack .cc-notice')
    ok('alert() shows on the page with its words', n.count() == 1 and 'Could not save that: test reason' in n.first.inner_text(), n.all_inner_texts())
    pg.reload(); pg.wait_for_timeout(1200)
    n = pg.locator('#ccNoticeStack .cc-notice')
    ok('...still there after a reload, until OK is pressed', n.count() == 1 and 'test reason' in n.first.inner_text(), n.all_inner_texts())
    pg.locator('.cc-notice-ok').first.click(); pg.reload(); pg.wait_for_timeout(1000)
    ok('...OK clears it for good', pg.locator('#ccNoticeStack .cc-notice').count() == 0)

    r = pg.evaluate("confirm('Delete Pat from the pool?')")
    red = pg.locator('.cc-notice-blocked')
    ok('a blocked confirm() still says no (nothing happens)', r is False)
    ok('...and a red note says the browser blocked it, with the question', red.count() == 1 and 'Your browser blocked a question' in red.first.inner_text()
       and 'Delete Pat from the pool?' in red.first.inner_text() and 'Nothing was saved or sent' in red.first.inner_text(), red.all_inner_texts())
    red.first.locator('.cc-notice-ok').click()
    r = pg.evaluate("prompt('Why are we not hiring them?', '')")
    ok('a blocked prompt() comes back empty and shows the red note', r is None and pg.locator('.cc-notice-blocked').count() == 1 and 'Why are we not hiring them?' in pg.locator('.cc-notice-blocked').first.inner_text())
    pg.locator('.cc-notice-ok').first.click()

    MODE['v'] = 'person'
    r1 = pg.evaluate("confirm('Send it now?')"); r2 = pg.evaluate("prompt('Reason?', '')")
    ok('a question a person answers works as before, with no red note', r1 is True and r2 == 'typed by a person' and pg.locator('.cc-notice').count() == 0, [r1, r2])
    src = open(os.path.join(os.path.dirname(__file__), '..', '..', 'index.html')).read()
    a = src.index("var KEY = 'ccPageNotices'"); ok('no em dashes in the notes', '—' not in src[a:src.index('})();', a)])
    ok('no page errors', not errs, errs[:3])
    b.close()
for s_, n_, d in R: print(s_, '·', n_, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

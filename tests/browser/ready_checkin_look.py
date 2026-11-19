"""READY TO WORK check-in (Samantha approved 2026-11-19): checkin.html?demo=caregiver&kind=ready, from disk, nothing saved.
The four questions, Send refused until the first three are answered, and the thank-you words.
(python3 tests/browser/ready_checkin_look.py [screenshot.png])"""
import sys, os
from playwright.sync_api import sync_playwright
SHOT = sys.argv[1] if len(sys.argv) > 1 else ''
URL = 'file://' + os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'checkin.html') + '?demo=caregiver&kind=ready'
R = []
def ok(n, c, d=''): R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:500]))
with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []
    pg = b.new_page(viewport={'width': 390, 'height': 900}); pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.route('**/*', lambda r: r.abort() if r.request.url.startswith('http') else r.continue_())
    pg.goto(URL); pg.wait_for_timeout(600)
    t = pg.inner_text('#main')
    ok('the four questions show', 'How ready do you feel for your first shift?' in t and 'Is the AxisCare app set up?' in t and 'Is Viventium set up?' in t and 'Any questions or anything we should know?' in t, t)
    ok('no mood faces on this check-in', pg.locator('.face').count() == 0)
    ok('the lead says they are cleared', "cleared to work" in pg.inner_text('body'))
    if SHOT: pg.screenshot(path=SHOT, full_page=True)
    pg.click('#send'); ok('Send before answering: asks for the first three', 'Answer the first three questions first.' in pg.inner_text('#err'))
    pg.click('[data-f="ready"] .chip[data-v="4"]'); pg.click('[data-f="axiscare"] .chip[data-v="yes"]'); pg.click('[data-f="viventium"] .chip[data-v="help"]')
    ok('progress fills as they answer', pg.eval_on_selector('#prog', 'e => e.style.width') == '100%')
    pg.click('#send'); pg.wait_for_timeout(300)
    d = pg.inner_text('#main')
    ok('"I need help" gets "someone will reach out"', 'Thank you, Rachel!' in d and 'will reach out to help' in d, d)
    ok('no page errors', not errs, errs)
    ok('no em dash on the page', '—' not in open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'checkin.html'), encoding='utf-8').read())
    b.close()
for s, n, d in R: print(s, n, ('\n     ' + d) if d else '')
print(f"\n{sum(1 for s,_,_ in R if s=='PASS')}/{len(R)} passed"); sys.exit(0 if all(s == 'PASS' for s, _, _ in R) else 1)

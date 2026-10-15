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
    MODE['v'] = 'block'
    # the in-page questions every converted button now uses (same meaning as the browser's)
    pg.evaluate("window.__r=[]; ccConfirm('Delete this question?\\n\\nInterviews already recorded keep it.').then(v=>__r.push(v)); 0")
    a = pg.locator('.cc-ask')
    ok('ccConfirm asks on the page: the first line bold, the rest below, OK and Cancel', a.count() == 1 and 'Delete this question?' in a.locator('b').inner_text()
       and 'Interviews already recorded keep it.' in a.inner_text() and a.locator('.cc-ask-ok').inner_text() == 'OK' and a.locator('.cc-ask-cancel').inner_text() == 'Cancel', a.all_inner_texts())
    a.locator('.cc-ask-ok').click(); pg.wait_for_timeout(50)
    pg.evaluate("ccConfirm('Again?').then(v=>__r.push(v)); 0"); pg.locator('.cc-ask-cancel').click(); pg.wait_for_timeout(50)
    pg.evaluate("ccConfirm('Enter?').then(v=>__r.push(v)); 0"); pg.keyboard.press('Enter'); pg.wait_for_timeout(50)
    pg.evaluate("ccConfirm('Escape?').then(v=>__r.push(v)); 0"); pg.keyboard.press('Escape'); pg.wait_for_timeout(50)
    ok('...OK is yes, Cancel is no, Enter is yes, Escape is no', pg.evaluate("__r") == [True, False, True, False], pg.evaluate("__r"))
    pg.evaluate("window.__r=[]; ccPrompt('Copy this link:', 'https://x.test/a').then(v=>__r.push(v)); 0")
    ta = pg.locator('.cc-ask textarea')
    ok('ccPrompt shows the starting words in the box', ta.input_value() == 'https://x.test/a', ta.input_value())
    ta.fill('Weekends'); pg.locator('.cc-ask-ok').click(); pg.wait_for_timeout(50)
    pg.evaluate("ccPrompt('Optional note:', '').then(v=>__r.push(v)); 0"); pg.locator('.cc-ask-ok').click(); pg.wait_for_timeout(50)
    pg.evaluate("ccPrompt('Reason?', 'x').then(v=>__r.push(v)); 0"); pg.locator('.cc-ask-cancel').click(); pg.wait_for_timeout(50)
    ok('...OK gives the typed words (even empty), Cancel gives nothing', pg.evaluate("__r") == ['Weekends', '', None], pg.evaluate("__r"))
    # two real buttons, with the browser refusing every pop-up
    pg.evaluate("""()=>{ window.__UP=[]; (0,eval)(`AP_ROWS=[{ id:'p1', first_name:'Pat', status:'pool' }]; apLoad=async()=>{};
      sb.from=()=>({ update:(p)=>{ window.__UP.push(p); const q={ eq:()=>q, then:(f)=>f({ error:null }) }; return q; } });`); apFromPool('p1'); }""")
    pg.wait_for_timeout(100)
    ok('Take out of the pool now asks on the page (the browser is refusing pop-ups)', 'Take Pat out of the pool?' in (pg.locator('.cc-ask').inner_text() if pg.locator('.cc-ask').count() else ''))
    pg.locator('.cc-ask-ok').click(); pg.wait_for_timeout(150)
    ok('...and OK does it', pg.evaluate("__UP.some(p=>p.status==='reviewing')"), pg.evaluate("__UP"))
    pg.evaluate("window.__lost=null; askLostReason({}).then(v=>window.__lost=v); 0"); pg.wait_for_timeout(80)
    ok('Mark lost asks why on the page, with the list', 'Why did this family not start with us?' in pg.locator('.cc-ask').inner_text() and pg.locator('.cc-ask textarea').count() == 1)
    pg.locator('.cc-ask-cancel').click(); pg.wait_for_timeout(50)
    ok('...Cancel marks nothing', pg.evaluate("window.__lost") is None)
    ok('no red "blocked" note: nothing used a browser pop-up', pg.locator('.cc-notice-blocked').count() == 0)
    src = open(os.path.join(os.path.dirname(__file__), '..', '..', 'index.html')).read()
    a = src.index("var KEY = 'ccPageNotices'"); ok('no em dashes in the notes', '\u2014' not in src[a:src.index('})();', a)])
    import re, glob
    left = []
    for fp in [os.path.join(os.path.dirname(__file__), '..', '..', 'index.html')] + glob.glob(os.path.join(os.path.dirname(__file__), '..', '..', '*.js')):
        for i, l in enumerate(open(fp).read().split('\n'), 1):
            t = l.strip()
            if t.startswith(('/*', '*', '//')) or 'window.apAsk ?' in l or 'nConfirm' in l or 'nPrompt' in l: continue
            if re.search(r"(^|[^.\w])(?<!function )(window\.)?(confirm|prompt)\((?!\))", re.sub(r"/\*.*?\*/", '', l)): left.append(os.path.basename(fp) + ':' + str(i))
    ok('no browser confirm()/prompt() left in the Hub (only the apAsk fallback)', not left, left[:10])
    ok('no page errors', not errs, errs[:3])
    b.close()
for s_, n_, d in R: print(s_, '·', n_, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

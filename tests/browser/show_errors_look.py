"""A script error shows a small red note with what broke (2026-10-06, no silent failures on the page). Offline, made-up."""
from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width':1200,'height':800})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    pg.goto('http://localhost:8765/index.html?proof=errs'); pg.wait_for_timeout(1200)
    R=[]
    pg.evaluate("()=>{ const b=document.createElement('button'); b.id='boom'; b.setAttribute('onclick','notAFunction123()'); document.body.appendChild(b); }")
    pg.click('#boom'); pg.wait_for_timeout(200)
    t = pg.evaluate("(document.getElementById('ccErrNote')||{}).innerText||''")
    R.append(('a broken button shows the red note with the error', 'Something on this page didn' in t and 'notAFunction123' in t))
    pg.evaluate("()=>{ Promise.reject(new Error('saving failed xyz')); }"); pg.wait_for_timeout(200)
    R.append(('a second error within 10 seconds does not pile up notes, but is kept', pg.evaluate("document.querySelectorAll('#ccErrNote').length")==1 and pg.evaluate("window.__ccErrors.some(e=>/saving failed xyz/.test(e.msg))")))
    pg.click('#ccErrNote'); pg.wait_for_timeout(100)
    R.append(('clicking the note closes it', pg.evaluate("!document.getElementById('ccErrNote')")))
    R.append(('no error notes on a normal page load', pg.evaluate("window.__ccErrors.filter(e=>!/notAFunction123|saving failed/.test(e.msg)).length")==0))
    b.close()
for n,o in R: print('PASS' if o else 'FAIL','·',n)
print(sum(1 for _,o in R if o),'/',len(R))

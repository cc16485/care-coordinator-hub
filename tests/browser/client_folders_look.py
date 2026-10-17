"""Client Folders page (Samantha 2026-10-17): the three level folders, how to put a folder together, every printed piece
with its PDF, and how to order more from Vistaprint (no card number anywhere). Every PDF link must open a real PDF.
Chromium + WebKit, desktop and phone. python3 tests/browser/client_folders_look.py [screenshot dir]"""
import sys, os, re, threading, http.server, functools
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..')); OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp'
R = []
def ck(n, c, d=''): R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:400]))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Q, directory=ROOT)); threading.Thread(target=srv.serve_forever, daemon=True).start()
B = f'http://127.0.0.1:{srv.server_address[1]}'
html = open(os.path.join(ROOT, 'client-folders.html')).read()
links = sorted(set(re.findall(r'href="(client-folders/[^"]+\.pdf)"', html)))
ck(f'every PDF link points at a real PDF ({len(links)})', links and all(open(os.path.join(ROOT, l), 'rb').read(5) == b'%PDF-' for l in links))
ck('no card number, no em dashes', not re.search(r'\b(?:\d[ -]?){13,16}\b', html) and '—' not in html)
ck('Client Folders opens inside the Hub, as a procedure under Assessment and start of care (2026-10-17)', "page:'client-folders.html'" in open(os.path.join(ROOT, 'index.html')).read())
with sync_playwright() as p:
    for eng in ('chromium', 'webkit'):
        br = getattr(p, eng).launch()
        for w, h in ((1280, 900), (390, 844)):
            pg = br.new_page(viewport={'width': w, 'height': h}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto(B + '/client-folders.html')
            t = pg.inner_text('main').lower()
            ck(f'{eng}-{w}: the three level folders, the two pockets, ordering and the saved-card rule', all(x.lower() in t for x in ('Open the Wellness folder', 'Open the Personal folder', 'Open the Advanced folder', 'Left pocket', 'Right pocket', 'Reorder', 'saved in the Caring Companions Vistaprint account', 'Client Care Agreement', 'Client Handbook')))
            st = [pg.request.get(B + '/' + l).status for l in links[:6]]
            ck(f'{eng}-{w}: PDFs are served', all(s == 200 for s in st), st)
            ck(f'{eng}-{w}: nothing wider than the screen', pg.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'))
            ck(f'{eng}-{w}: no page errors', not errs, errs)
            pg.screenshot(path=os.path.join(OUT, f'client-folders-{eng}-{w}.png'), full_page=True); pg.close()
        br.close()
srv.shutdown()
bad = [r for r in R if r[0] == 'FAIL']
for r in R: print(r[0], r[1] + ('\n     ' + r[2] if r[2] else ''))
print(f'\n{len(R) - len(bad)}/{len(R)} passed'); sys.exit(1 if bad else 0)

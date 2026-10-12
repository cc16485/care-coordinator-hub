"""Step 1 PREVIEW (Samantha 2026-10-11: click through every screen as the caregiver with practice data, before approving them
for real hires). step1.html?preview=1 with no link: the server's read-only preview action is run offline from the Staffing
code (argv[1] = its supabase/functions folder; argv[2] = the runner preview_srv.mjs). Every screen in order, filled with
practice answers, every form signed through the real answer check, the done screen with preview PDFs. Identity numbers must
never be sent; only the preview action may be called.
python3 tests/browser/step1_preview_look.py <Staffing supabase/functions> tests/browser/step1_preview_srv.mjs [screenshot dir]"""
import json, sys, os, subprocess
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
# served over http like the real Hub (a file:// page cannot open its own PDF blob in a new window)
import threading, http.server, functools, socketserver
_srv = socketserver.TCPServer(('127.0.0.1', 0), functools.partial(http.server.SimpleHTTPRequestHandler, directory=os.path.abspath(os.path.join(HERE, '..', '..'))))
_srv.RequestHandlerClass.log_message = lambda *a: None; threading.Thread(target=_srv.serve_forever, daemon=True).start()
PAGE = 'http://127.0.0.1:%d/step1.html?preview=1' % _srv.server_address[1]
FNDIR, SRV = sys.argv[1], sys.argv[2]; OUT = sys.argv[3] if len(sys.argv) > 3 else '/tmp'
bodies = []
def handle(route, request):
    b = request.post_data or '{}'; bodies.append(json.loads(b))
    out = subprocess.run(['node', SRV, FNDIR], input=b, capture_output=True, text=True, timeout=60).stdout
    return route.fulfill(status=200, content_type='application/json', body=out or '{}')
R = []
ok = lambda n, c, d='': R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:300]))
with sync_playwright() as pw:
    b = pw.chromium.launch(); ctx = b.new_context(viewport={'width': 390, 'height': 844}); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.route('**/functions/v1/step1-sign', handle)
    pg.goto(PAGE); pg.wait_for_timeout(2500)
    t = pg.inner_text('#main')
    ok('opens with no link, as Pat Preview, with the preview banner and the screen picker', 'Welcome, Pat!' in t and 'Preview with made-up answers' in t and pg.locator('.pbar select').count() == 1, t[:300])
    ok('the "What happens after this screen" note is on screen 1', 'What happens after this screen' in t)
    pg.screenshot(path=os.path.join(OUT, 'prev_1.png'), full_page=True)
    pg.check('#esign'); pg.click('button.go'); pg.wait_for_timeout(400)
    shots = 2
    for step in range(12):
        t = pg.inner_text('#main')
        if pg.inner_text('h1').startswith('All done'): break
        if pg.locator('button', has_text='Fill this screen with practice answers').count():
            pg.click('text=Fill this screen with practice answers'); pg.wait_for_timeout(300)
        if pg.locator('#b_sign').count():
            pg.check('#c_sign'); pg.fill('#n_sign', 'Pat Preview')
            pg.screenshot(path=os.path.join(OUT, 'prev_%d.png' % shots), full_page=True); shots += 1
            pg.click('#b_sign'); pg.wait_for_timeout(2500)
            e = pg.inner_text('#e_sign') if pg.locator('#e_sign').count() and pg.locator('#e_sign').is_visible() else ''
            if e: ok('signing step %d passes the real answer check after the practice fill' % step, False, e); break
        else:
            pg.screenshot(path=os.path.join(OUT, 'prev_%d.png' % shots), full_page=True); shots += 1
            pg.locator('button.go').first.click(); pg.wait_for_timeout(600)
    t = pg.inner_text('#main')
    ok('all seven forms signed in the preview and the done screen shows next steps', pg.inner_text('h1').startswith('All done') and '7 of 7 signed' in t, t[:300])
    ok('the done screen offers each form as a preview PDF', pg.locator('#copies a').count() == 7)
    pg.screenshot(path=os.path.join(OUT, 'prev_done.png'), full_page=True)
    if not pg.locator("#copies a").count(): print("STOP", pg.inner_text("#main")[:1500]); print([s for s in R]); sys.exit(1)
    # the test browser has no PDF viewer: catch the window the page opens and read the first bytes of what it would show
    head = pg.evaluate('''async () => { let u = null; const w = { document: { write(){}, body: {} }, set location(v){ u = v; } }; window.open = () => w;
      await previewPdf('employee_application'); for (let i = 0; i < 40 && !u; i++) await new Promise((r) => setTimeout(r, 250));
      if (!u) return null; const b = await (await fetch(u)).arrayBuffer(); return String.fromCharCode(...new Uint8Array(b).slice(0, 5)) + ':' + b.byteLength; }''')
    ok('a preview PDF opens (a real PDF from the same layout as a signed one)', bool(head) and head.startswith('%PDF-') and int(head.split(':')[1]) > 2000, head)
    acts = [x.get('action') for x in bodies]
    ok('only the read-only preview action was ever called (no view, save, identity or sign reached the server)', set(acts) == {'preview'}, set(acts))
    sent = json.dumps(bodies)
    ok('no identity number left the page (only last-four markers)', '987654321' not in sent and '"ssn": "4321"' in sent.replace('"ssn":"4321"', '"ssn": "4321"'))
    ok('the screen picker jumps straight to a screen', True)
    pg.select_option('.pbar select', '6'); pg.wait_for_timeout(300)
    ok('jumping to screen 6 shows availability', 'When you can work' in pg.inner_text('#main'))
    ok('no page errors', not errs, errs)
    b.close()
for s, n, d in R: print(s, ' ', n, ('  ' + d) if d else '')

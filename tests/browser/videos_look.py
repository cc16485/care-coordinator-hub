"""videos.html, the Hub's Videos page in SOPs (2026-10-30, Samantha: "When we make videos can you save them in the hub"),
offline. Served over a local http server with a fake Supabase session in localStorage, and Supabase faked at the network:
app_data (GET agency_videos), rpc upsert_app_data_item (bodies recorded), storage upload and sign.
Chromium AND WebKit at 360px and 1024px:
  groups (Recruiting and ads, Welcome and orientation), newest first, Approved / Not approved yet tags, the Removed section,
  search and ?cat=; Watch opens a player from a signed link and Close shuts it; Download asks for a download link;
  as an owner: Add a video, Approve and Remove (asks why, refuses under 5 characters, nothing deleted);
  as office staff (not an owner): no Add, Approve or Remove, but Watch and Download;
  no em dashes on screen; nothing wider than the screen.
python3 tests/browser/videos_look.py [screenshot dir]"""
import json, sys, os, threading, functools, http.server
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp'
R = []
def ck(n, c, d=''): R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:400]))

def session(email):
    return {'access_token': 'x.y.z', 'refresh_token': 'r', 'token_type': 'bearer', 'expires_in': 3600, 'expires_at': 4102444800,
            'user': {'id': 'u1', 'aud': 'authenticated', 'role': 'authenticated', 'email': email}}
SEED = [
    {'id': 'v1', 'name': 'Join Our PRN Teams', 'cat': 'Recruiting', 'path': 'recruiting/v1.mp4', 'size': 4982893, 'filename': 'prn.mp4', 'length': 76,
     'made': '2026-10-28', 'size_note': 'Vertical 9:16', 'by': 'samantha@mo-care.com', 'at': '2026-10-30T15:00:00Z',
     'approved': {'by': 'samantha@mo-care.com', 'at': '2026-10-28T20:00:00Z'}},
    {'id': 'v2', 'name': 'Older recruiting video', 'cat': 'Recruiting', 'path': 'recruiting/v2.mp4', 'size': 3000000, 'filename': 'old.mp4', 'length': 40,
     'made': '2026-09-01', 'by': 'samantha@mo-care.com', 'at': '2026-10-30T15:00:00Z'},
    {'id': 'v3', 'name': 'Welcome to Caring Companions', 'cat': 'Welcome', 'path': 'welcome/v3.mp4', 'size': 9000000, 'filename': 'welcome.mp4', 'length': 130,
     'made': '2026-10-20', 'by': 'samantha@mo-care.com', 'at': '2026-10-30T15:00:00Z', 'approved': {'by': 'samantha@mo-care.com', 'at': '2026-10-20T15:00:00Z'}},
    {'id': 'v4', 'name': 'Draft we did not use', 'cat': 'Other', 'path': 'other/v4.mp4', 'size': 2000000, 'filename': 'draft.mp4', 'length': 30,
     'made': '2026-08-01', 'by': 'samantha@mo-care.com', 'at': '2026-10-30T15:00:00Z', 'removed': {'by': 'samantha@mo-care.com', 'at': '2026-10-30T16:00:00Z', 'why': 'Never used it'}},
]


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass


def serve():
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=ROOT))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def wire(pg, st, email):
    def rest(route, request):
        url = request.url
        if '/rpc/upsert_app_data_item' in url:
            st['saves'].append(json.loads(request.post_data or '{}'))
            return route.fulfill(status=200, content_type='application/json', body='null')
        rows = [{'data': st['vids']}] if 'agency_videos' in url else []
        if 'vnd.pgrst.object' in (request.headers.get('accept') or ''):
            return route.fulfill(status=200, content_type='application/json', body=json.dumps(rows[0] if rows else None))
        return route.fulfill(status=200, content_type='application/json', body=json.dumps(rows))
    def storage(route, request):
        url = request.url
        if '/object/sign/' in url:
            if request.method == 'POST': st['signed'].append(url)
            return route.fulfill(status=200, content_type='application/json', body=json.dumps({'signedURL': '/object/sign/agency-videos/x?token=t'}))
        return route.fulfill(status=404, body='')
    pg.route('**/rest/v1/**', rest)
    pg.route('**/storage/v1/**', storage)
    pg.route('**/auth/v1/**', lambda route, request: route.fulfill(status=200, content_type='application/json', body=json.dumps(session(email)['user'])))


def init(email):
    return """(() => { try { localStorage.setItem('sb-zngsgedlsxinbygwmxwn-auth-token', %s); } catch (e) {} })()""" % json.dumps(json.dumps(session(email)))


def page(b, base, w, email, q=''):
    st = {'vids': json.loads(json.dumps(SEED)), 'saves': [], 'signed': []}
    pg = b.new_page(viewport={'width': w, 'height': 900})
    pg.add_init_script(init(email)); wire(pg, st, email)
    pg.goto(base + '/videos.html' + q); pg.wait_for_selector('.vid', timeout=8000)
    return pg, st


def run(p, eng, base):
    b = getattr(p, eng).launch()
    for w in (360, 1024):
        tag = '%s %dpx' % (eng, w)
        pg, st = page(b, base, w, 'samantha@mo-care.com')
        groups = pg.eval_on_selector_all('.group', 'e => e.map(x => x.textContent)')
        ck(tag + ': groups in order', groups == ['Recruiting and ads', 'Welcome and orientation'], groups)
        names = pg.eval_on_selector_all('#list > .vid b', 'e => e.map(x => x.textContent)')
        ck(tag + ': newest first inside a group', names[:2] == ['Join Our PRN Teams', 'Older recruiting video'], names)
        txt = pg.inner_text('#list')
        ck(tag + ': approved and not-approved tags', 'Approved' in txt and 'Not approved yet' in txt, txt[:300])
        ck(tag + ': length, size, made date shown', '1:16' in txt and '4.8 MB' in txt and 'made Oct 28, 2026' in txt, txt[:300])
        ck(tag + ': removed kept for the record', 'Removed (1), kept for the record' in txt)
        ck(tag + ': owner sees Add a video', pg.is_visible('#addBtn'))
        ck(tag + ': Approve only on the one not approved', pg.locator('[data-ok]').count() == 1 and pg.get_attribute('[data-ok]', 'data-ok') == 'v2')

        pg.click('[data-play="v1"]'); pg.wait_for_selector('.player video', timeout=5000)
        ck(tag + ': Watch opens a player from a signed link', 'agency-videos' in pg.get_attribute('.player video', 'src') and len(st['signed']) == 1, st['signed'])
        pg.click('[data-play="v1"]'); pg.wait_for_timeout(200)
        ck(tag + ': Close shuts it', pg.locator('.player video').count() == 0)
        pg.evaluate("HTMLAnchorElement.prototype.click = function(){ window.__dl = this.href; }")
        pg.click('[data-dl="v3"]'); pg.wait_for_timeout(400)
        ck(tag + ': Download asks for a download link', 'download=' in pg.evaluate('window.__dl || ""'), pg.evaluate('window.__dl || ""'))

        pg.click('[data-ok="v2"]'); pg.wait_for_timeout(300)
        sv = st['saves'][-1]['item'] if st['saves'] else {}
        ck(tag + ': Approve saves who and when', st['saves'] and st['saves'][-1]['target_key'] == 'agency_videos' and sv.get('id') == 'v2' and sv.get('approved', {}).get('by') == 'samantha@mo-care.com', st['saves'])

        n = len(st['saves']); answers = ['no', None, 'Made a newer one']
        def dlg(d):
            a = answers.pop(0)
            d.accept(a) if a is not None else d.accept()
        pg.on('dialog', dlg)
        pg.click('[data-del="v3"]'); pg.wait_for_timeout(300)
        ck(tag + ': Remove refuses a too-short reason', len(st['saves']) == n)
        pg.click('[data-del="v3"]'); pg.wait_for_timeout(300)
        pg.remove_listener('dialog', dlg)
        sv = st['saves'][-1]['item']
        ck(tag + ': Remove keeps the item with why', sv.get('id') == 'v3' and sv.get('removed', {}).get('why') == 'Made a newer one' and sv.get('path') == 'welcome/v3.mp4', sv)

        pg.fill('#q', 'prn'); pg.wait_for_timeout(150)
        ck(tag + ': search', pg.eval_on_selector_all('#list > .vid b', 'e => e.map(x => x.textContent)') == ['Join Our PRN Teams'])
        pg.fill('#q', '')
        body = pg.inner_text('body')
        ck(tag + ': no em dashes', '—' not in body)
        ck(tag + ': nothing wider than the screen', pg.evaluate('document.documentElement.scrollWidth') <= w, pg.evaluate('document.documentElement.scrollWidth'))
        pg.screenshot(path=os.path.join(OUT, 'videos_%s_%d.png' % (eng, w)), full_page=True)
        pg.close()

        pg, st = page(b, base, w, 'krystal@mo-care.com', '?cat=Welcome')
        ck(tag + ': ?cat= preselects the filter', pg.input_value('#fCat') == 'Welcome' and pg.locator('.group').count() == 1)
        ck(tag + ': office staff see no Add, Approve or Remove', not pg.is_visible('#addBtn') and pg.locator('[data-ok],[data-del]').count() == 0)
        ck(tag + ': office staff can Watch and Download', pg.locator('[data-play]').count() >= 1 and pg.locator('[data-dl]').count() >= 1)
        pg.close()
    b.close()


srv = serve(); base = 'http://127.0.0.1:%d' % srv.server_address[1]
with sync_playwright() as p:
    for eng in ('chromium', 'webkit'):
        run(p, eng, base)
srv.shutdown()
bad = [r for r in R if r[0] != 'PASS']
for r in R: print(*r)
print('\n%d passed, %d failed' % (len(R) - len(bad), len(bad)))
sys.exit(1 if bad else 0)

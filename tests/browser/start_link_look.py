"""Private applicant links (2026-10-04): the start form page in a real browser with a fake Hub server.
python3 tests/browser/start_link_look.py (static server on 8765)"""
import json
from playwright.sync_api import sync_playwright
R = []
def ck(n, c, d=''): R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:600]))
def run(query, now_ms=None, open_ok=True, column_missing=False):
    calls = []
    with sync_playwright() as pw:
        b = pw.chromium.launch(); pg = b.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        if now_ms: pg.add_init_script(f"Date.now = () => {now_ms};")
        state = {'n': 0}
        def handle(route):
            u = route.request.url; body = route.request.post_data or ''
            calls.append((u, body))
            if '/functions/v1/applicant-link' in u:
                return route.fulfill(status=200 if open_ok else 401, content_type='application/json',
                    body=json.dumps({"ok": True, "first": "Ben", "last": "B", "phone": "4175550111", "email": "ben@x.com"} if open_ok else {"ok": False}))
            if '/rest/v1/hire_intake' in u:
                state['n'] += 1
                if column_missing and 'start_offer_id' in body:
                    return route.fulfill(status=400, content_type='application/json', body=json.dumps({"message": "Could not find the 'start_offer_id' column of 'hire_intake'"}))
                return route.fulfill(status=201, content_type='application/json', body='')
            return route.fulfill(status=200, content_type='application/json', body='{}')
        pg.route('**/*supabase.co/**', handle)
        pg.goto('http://localhost:8765/start.html' + query); pg.wait_for_timeout(1500)
        info = pg.evaluate("({ url: location.href, h1: ((document.getElementById('linkGone')||document.getElementById('formView')).querySelector('h1')||{}).textContent||'', first: (document.getElementById('first')||{}).value, phone: (document.getElementById('phone')||{}).value, form: getComputedStyle(document.getElementById('formView')).display !== 'none' })")
        b.close()
        return info, calls, errs, state
ALLERR = []
_run = run
def run(*a, **k):
    r = _run(*a, **k); ALLERR.extend(r[2]); return r
CODE = '?o=b3f0c2aa-1111-4222-8333-444455556666&e=1999999999&t=' + 'A' * 43
info, calls, errs, _ = run(CODE)
ck('with a private link: asks the server, greets them and fills in what we know (decision 1)', info['h1'] == 'Great news, Ben.' and info['first'] == 'Ben' and info['phone'] == '4175550111' and any('"open"' in c[1] for c in calls), info)
ck('...the address keeps only the code', 'phone=' not in info['url'] and 'o=b3f0' in info['url'], info['url'])
info, calls, errs, _ = run(CODE, open_ok=False)
ck('a made-up or expired code: "ask the office for a new one", no form', 'run out' in info['h1'] and not info['form'], info)
info, calls, errs, _ = run('')
ck('no link at all: "ask the office for a new one", no form (the public page no longer takes a form from anyone)', 'run out' in info['h1'] and not info['form'], info)
OLD = '?first=Old&last=L&phone=4175550100&email=o%40x.com'
info, calls, errs, _ = run(OLD, now_ms=1791100000000)
ck('an old link with details inside the 30 days: still fills in as before', info['first'] == 'Old' and info['form'], info)
ck('...but the details come off the address bar straight away', 'first=' not in info['url'] and 'phone=' not in info['url'] and 'email=' not in info['url'], info['url'])
info, calls, errs, _ = run(OLD, now_ms=1762300000000 + 86400000 * 400)
ck('an old link after Nov 3: "ask the office for a new one"', 'run out' in info['h1'] and not info['form'], info)
src = open('/Users/samantha/Claude/Projects/cc-hub-live/start.html').read()
ck('the form records the link it came through (the server checks the code itself)', "Object.assign(row, { start_offer_id: LINK.o, start_link_exp: Number(LINK.e) || null, start_link_sig: LINK.t })" in src)
ck('...and never loses a start form over those columns (retries without them)', "delete row.start_offer_id; delete row.start_link_exp; delete row.start_link_sig;" in src)
ck('no page errors in any of the runs', not ALLERR, ALLERR)
for s, n, d in R: print(s, '·', n, '' if s == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

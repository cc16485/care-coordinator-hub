"""(phone lead) on My Work journey cards (2026-10-22, her: "fix the phone lead no name"): a card the old AI named
"(phone lead)" shows the lead's real name, else who called and their number, else "Name not on file"; a real name is
untouched. The real page, offline, made-up people. (python3 tests/browser/phone_lead_name_look.py)"""
import os, mimetypes
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]);
  const b=h=>{ const m=String(h).match(/<b>(.*?)<\/b>/); return m?m[1]:''; };
  ok('a "(phone lead)" card with no journey on file: "Name not on file"', b(cjWorkCard({ id:'c1', about:'(phone lead)', journey_id:'none' }))==='Name not on file', cjWorkCard({ id:'c1', about:'(phone lead)', journey_id:'none' }));
  ok('a real name is left as it is', b(cjWorkCard({ id:'c2', about:'Helen Brooks', journey_id:'none' }))==='Helen Brooks');
  ok('an empty name: "Name not on file", never blank', b(cjWorkCard({ id:'c3', about:'', journey_id:'none' }))==='Name not on file');
  return R;
}
"""
def serve(route):
    path = route.request.url.split('://', 1)[1].split('/', 1)[1].split('?')[0] or 'index.html'
    f = os.path.join(ROOT, path)
    if os.path.isfile(f):
        route.fulfill(path=f, content_type=mimetypes.guess_type(f)[0] or 'application/octet-stream')
    else:
        route.fulfill(status=404, body='')
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1360, 'height': 1000})
    pg.route('**/*', lambda r: serve(r) if r.request.url.startswith('http://hub.test/') else (r.abort() if 'supabase.co' in r.request.url else r.continue_()))
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://hub.test/index.html?proof=phonelead'); pg.wait_for_timeout(1500)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

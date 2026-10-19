"""Owner Overview as the first screen (Samantha 2026-10-18): an owner with it on lands on it at sign-in; pressing Dashboard
then pressing Today opens My Work (2026-10-19: the Dashboard retired); a link that names a page (#leadsstarts) still lands there; Krystal, and everyone while it is
off, land on the Dashboard as before. A fresh page for each case; made-up people only. (python3 tests/browser/owner_overview_land_look.py)"""
import os, mimetypes
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SETUP = r"""
(a)=>{
  (0,eval)(`sb={ from:()=>{ const p={ select(){return p;}, eq(){return p;}, in(){return p;}, gte(){return p;}, not(){return p;}, order(){return p;}, limit(){return p;},
      maybeSingle:async()=>({data:null,error:null}), then(r){ return Promise.resolve({data:[],error:null}).then(r); } }; return p; },
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async()=>({data:null,error:null}) }, auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };`);
  window.alert=()=>{}; window.Bonus={ call:async()=>({ lines:[] }) }; window.CcTeam={ call:async()=>({ reviews:[] }) }; window.CRX={ call:async()=>({ rows:[] }) };
  (0,eval)(`ME={ email:'${a.who}', name:'X Y', shift:'day' }; CC_ROLE_BY_EMAIL={ 'sam@mo-care.com':['owner_admin'], 'kry@mo-care.com':['care_coordinator'] };`);
  DATA.ops_items=[]; DATA.coordinator_staff=[]; DATA.ops_settings={ owner_overview_live:a.on, lead_rotation:{ people:[] } };
  document.getElementById('appScreen').classList.add('on');
  renderActiveTab();
}
"""
CASES = [('owner, on', 'sam@mo-care.com', True, '', 'owneroverview'), ('Krystal, on', 'kry@mo-care.com', True, '', 'mywork'),
         ('owner, off', 'sam@mo-care.com', False, '', 'mywork'), ('owner, on, a link to Leads', 'sam@mo-care.com', True, '#leadsstarts', 'leadsstarts')]
def serve(route):
    path = route.request.url.split('://', 1)[1].split('/', 1)[1].split('?')[0] or 'index.html'
    f = os.path.join(ROOT, path)
    if os.path.isfile(f):
        route.fulfill(path=f, content_type=mimetypes.guess_type(f)[0] or 'application/octet-stream')
    else:
        route.fulfill(status=404, body='')
R = []
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for name, who, on, hsh, want in CASES:
        pg = b.new_page(viewport={'width': 1360, 'height': 900}); errs = []
        pg.route('**/*', lambda r: serve(r) if r.request.url.startswith('http://hub.test/') else (r.abort() if 'supabase.co' in r.request.url else r.continue_()))
        pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        pg.goto('http://hub.test/index.html?proof=land' + hsh); pg.wait_for_timeout(1500)
        pg.evaluate(SETUP, {'who': who, 'on': on}); pg.wait_for_timeout(500)
        if hsh: pg.evaluate("()=>{ window.dispatchEvent(new HashChangeEvent('hashchange')); }"); pg.wait_for_timeout(400)
        got = pg.evaluate("()=>activeTab")
        R.append(['PASS' if got == want else 'FAIL', name + ' · lands on ' + want, got])
        if name == 'owner, on':
            pg.evaluate("()=>{ ccGroupClick('today'); renderActiveTab(); }"); pg.wait_for_timeout(300)   # 2026-10-19: Today opens My Work (the Dashboard retired)
            got2 = pg.evaluate("()=>activeTab")
            R.append(['PASS' if got2 == 'mywork' else 'FAIL', 'owner, on · after landing, pressing Today opens My Work and stays there', got2])
        R.append(['PASS' if not errs else 'FAIL', name + ' · no page errors', errs[:2]])
        pg.close()
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

"""Planned time off in the Hub (2026-10-18): lead turns and the Owner Overview treat someone as out only from their Out from
day through Out until (no Out from = from today, as before); the owners-only switch in Settings. Made-up people only.
(python3 tests/browser/out_from_look.py)"""
import os, mimetypes
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]);
  (0,eval)(`sb={ from:()=>{ const p={ select(){return p;}, eq(){return p;}, in(){return p;}, gte(){return p;}, not(){return p;}, order(){return p;}, limit(){return p;}, maybeSingle:async()=>({data:null,error:null}), then(r){ return Promise.resolve({data:[],error:null}).then(r); } }; return p; }, rpc:async()=>({data:null,error:null}), functions:{ invoke:async()=>({data:null,error:null}) }, auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };`);
  (0,eval)(`ME={ email:'sam@mo-care.com', name:'Samantha T', shift:'day' }; CC_ROLE_BY_EMAIL={ 'sam@mo-care.com':['owner_admin'], 'kry@mo-care.com':['care_coordinator'] };`);
  window.Bonus={ call:async()=>({ lines:[] }) }; window.CcTeam={ call:async()=>({ reviews:[] }) }; window.CRX={ call:async()=>({ rows:[] }) };
  const day=n=>new Date(Date.now()+n*864e5).toLocaleDateString('en-CA',{ timeZone:'America/Chicago' });
  DATA.coordinator_staff=[{ email:'kry@mo-care.com', name:'Krystal Land', out_from:day(3), out_until:day(6) }, { email:'ang@mo-care.com', name:'Angiel Rose', out_until:day(2) }];
  DATA.ops_items=[]; DATA.ops_settings={ owner_overview_live:true, planned_time_off_live:false, lead_rotation:{ people:[{ name:'Krystal' }, { name:'Angiel' }] } };
  ok('lead turns · Krystal (planned from 3 days out) is not out today; Angiel (no Out from) is', !leadTurnIsOut('Krystal')&&leadTurnIsOut('Angiel'));
  document.getElementById('appScreen').classList.add('on'); switchTab('owneroverview'); await new Promise(r=>setTimeout(r,250));
  const t=(document.getElementById('ovWrap')||{}).innerText||'';
  ok('Owner Overview · out today shows Angiel only', /Out today: Angiel/.test(t)&&!/Out today:[^\n]*Krystal/.test(t), t.slice(0,300));
  DATA.coordinator_staff[0].out_from=day(0);
  ok('lead turns · once Out from arrives, Krystal is out', leadTurnIsOut('Krystal'));
  lhSetFill();
  ok('settings · off, with the button for Samantha', /Off\./.test(document.getElementById('ptSetNow').textContent)&&document.getElementById('ptToggleBtn').style.display==='');
  window.ccConfirm=async()=>true; window.tkMerge=async(apply)=>{ const m=JSON.parse(JSON.stringify(DATA.ops_settings)); apply(m, DATA.ops_settings); DATA.ops_settings=m; return { changed:true, error:null }; };
  await ptToggle(); ok('settings · Samantha turns it on', DATA.ops_settings.planned_time_off_live===true&&/On\./.test(document.getElementById('ptSetNow').textContent));
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
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1360, 'height': 900}); errs = []
    pg.route('**/*', lambda r: serve(r) if r.request.url.startswith('http://hub.test/') else (r.abort() if 'supabase.co' in r.request.url else r.continue_()))
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://hub.test/index.html?proof=outfrom'); pg.wait_for_timeout(1500)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

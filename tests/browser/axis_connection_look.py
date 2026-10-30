"""Settings > AxisCare connection in the REAL Hub page, offline (files served from this folder; made-up numbers only; nothing is
saved or sent). Proves the section reads the page's own DATA and sb (2026-10-30 fix: through window it never found them, so the
switches always read Off and the box said "not signed in"). (python3 tests/browser/axis_connection_look.py)"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
STUB = r"""
(()=>{
  const W=window, S='samantha@mo-care.com', ago=m=>new Date(Date.now()-m*60000).toISOString();
  W.__rpc=[];
  W.__conn={ as_of:ago(0), scheduling_current:false, reader_on:false, cards_on:false, totals:{ calls:212, failed:9, r429:7, held:0, shared:0 },
    sources:{ caregivers:{ calls:4, failed:0, r429:0, held:0, shared:0, last_try_ok:true, last_ok_at:ago(2) },
      visits:{ calls:150, failed:9, r429:7, held:0, shared:0, last_try_ok:false, last_ok_at:ago(16), last_fail_at:ago(1), last_error:'AxisCare answered 429' } }, jobs:[], hours:[] };
  (0,eval)(`sb={ from:()=>{ const p={ select(){return p;}, eq(){return p;}, in(){return p;}, order(){return p;}, limit(){return p;},
      maybeSingle:async()=>({ data:null, error:null }), then(a){ return Promise.resolve({data:[],error:null}).then(a); } }; return p; },
    rpc:async(n,a)=>{ window.__rpc.push(n); return n==='axis_connection' ? { data:window.__conn, error:null } : { data:null, error:null }; },
    auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };
    CC_ROLE_BY_EMAIL={ '${S}':['owner_admin'] }; ME={ email:'${S}', name:'Samantha Troutman', shift:'day' };`);
  W.tkMerge=async(fn)=>{ const m=JSON.parse(JSON.stringify(DATA.ops_settings||{})); fn(m); DATA.ops_settings=m; return {}; };
  W.ccConfirm=async()=>true;
  DATA.ops_settings={ axis_shared_reader_live:true };
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  await AxisConn.fill(true); await sleep(100);
  const box=document.getElementById('axcBox').innerText;
  ok('the box reads axis_connection through the page\'s own sb', window.__rpc.includes('axis_connection') && /Scheduling information is NOT current/.test(box) && /212 AxisCare reads/.test(box), box.slice(0,300));
  ok('a switch that is on in DATA reads On', /^On\./.test(document.getElementById('axcReaderNow').innerText) && /^Off\./.test(document.getElementById('axcCardsNow').innerText), document.getElementById('axcReaderNow').innerText);
  ok('the button offers to turn it off', /Turn off the shared AxisCare reader/.test(document.getElementById('axcReaderBtn').textContent));
  await AxisConn.toggle(AxisConn.READER, document.getElementById('axcReaderBtn')); await sleep(100);
  ok('turning it off really turns it off (and back says Turn on)', DATA.ops_settings.axis_shared_reader_live===false && /Turn on the shared AxisCare reader/.test(document.getElementById('axcReaderBtn').textContent));
  return R;
}
"""
MIME = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.json':'application/json', '.webmanifest':'application/json'}
def serve(route):
    url = route.request.url
    if 'supabase.co' in url: return route.abort()
    if not url.startswith('http://axc.local/'): return route.continue_()
    p = (ROOT / url.split('http://axc.local/', 1)[1].split('?')[0].split('#')[0])
    if not p.is_file(): return route.fulfill(status=404, body='')
    route.fulfill(status=200, body=p.read_bytes(), content_type=MIME.get(p.suffix, 'application/octet-stream'))
with sync_playwright() as pw:
    b = pw.chromium.launch(); cx = b.new_context(viewport={'width': 1280, 'height': 900}, timezone_id='America/Chicago'); pg = cx.new_page()
    pg.route('**/*', serve)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://axc.local/index.html?proof=axc'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

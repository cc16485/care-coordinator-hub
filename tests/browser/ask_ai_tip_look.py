"""Ask AI new-feature tip (2026-11-15, her "New tip in the Hub"): the real Hub page offline, made-up people only.
A small bubble under the ✨ Ask AI button tells each office person what it is: shown on their first 5 page loads, gone for
good once they close it or open Ask AI, never shown to someone who cannot see the button, and it sends nothing.
(python3 tests/browser/ask_ai_tip_look.py; SHOTS=<dir> also saves a screenshot)"""
import os, json, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = os.environ.get('SHOTS')
MIME = {'.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json'}
SETUP = r"""
(who)=>{
  const W=window; W.__sent=[];
  (0,eval)(`sb={ from:(tb)=>{ const p={ select(){return p;}, eq(){return p;}, gte(){return p;}, in(){return p;}, order(){return p;}, limit(){return p;}, not(){return p;},
      single:async()=>({ data:null, error:null }), maybeSingle:async()=>({ data:null, error:null }), insert:async()=>{ window.__sent.push(tb); return {error:null}; }, then(a){ return Promise.resolve({ data:[], error:null }).then(a); } }; return p; },
    rpc:async(n)=>{ window.__sent.push('rpc:'+n); return {data:null,error:null}; }, functions:{ invoke:async()=>({data:null,error:null}) }, auth:{ getSession:async()=>({data:{session:{access_token:'tok-1'}}}) } };
    CC_ROLE_BY_EMAIL={ 'owner@example.com':['owner_admin'], 'kris@example.com':['care_coordinator'] };`);
  (0,eval)("ME="+JSON.stringify(who));
  W.persist=async(k)=>{ W.__sent.push(k); };
  DATA.ops_settings={ ask_cara_live:true };
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  ASKC.showButton();
}
"""
def serve(route):
    url = route.request.url
    if 'supabase.co' in url: return route.abort()
    if not url.startswith('http://asktip.local/'): return route.continue_()
    p = ROOT / url.split('asktip.local/')[1].split('?')[0]
    if not p.is_file(): return route.fulfill(status=404, body='')
    route.fulfill(status=200, body=p.read_bytes(), content_type=MIME.get(p.suffix, 'application/octet-stream'))

R = []
def ok(n, c, d=''): R.append(['PASS' if c else 'FAIL', n, '' if c else json.dumps(d)[:400]])
KRIS = {'email': 'kris@example.com', 'name': 'Kris Coord', 'shift': 'day'}
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1500, 'height': 800}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('**/*', serve)
    def load(who=KRIS):
        pg.goto('http://asktip.local/index.html?proof=asktip'); pg.wait_for_timeout(1200); pg.evaluate(SETUP, who); pg.wait_for_timeout(150)
        return pg.evaluate("""()=>{ const t=document.getElementById('askaiTip'), b=document.getElementById('askCaraBtn');
          if(!t) return null; const r=t.getBoundingClientRect(), br=b.getBoundingClientRect();
          return { text:t.innerText, below:r.top>br.bottom, onScreen:r.left>=0 && r.right<=innerWidth }; }""")
    pg.goto('http://asktip.local/index.html?proof=asktip'); pg.evaluate("()=>localStorage.clear()")
    t = load()
    ok('a coordinator sees the tip under the ✨ Ask AI button', bool(t) and 'New: ✨ Ask AI' in t['text'] and t['below'] and t['onScreen'], t)
    ok('it says what it is for and that it only reads', bool(t) and 'Hoyer lift' in t['text'] and 'never texts anyone or changes AxisCare' in t['text'] and 'Try it' in t['text'], t)
    if SHOTS: pg.screenshot(path=os.path.join(SHOTS, 'ask_ai_tip.png'), clip={'x': 700, 'y': 0, 'width': 800, 'height': 260})
    seen = [bool(load()) for _ in range(5)]
    ok('it shows on the first 5 page loads only', seen == [True, True, True, True, False], seen)
    pg.evaluate("()=>localStorage.clear()"); load()
    pg.evaluate("()=>document.querySelector('#askaiTip button[aria-label=Close]').click()")
    ok('× closes it', pg.evaluate("()=>!document.getElementById('askaiTip')"))
    ok('...and it stays closed on the next load', load() is None)
    pg.evaluate("()=>localStorage.clear()"); load()
    pg.evaluate("()=>[...document.querySelectorAll('#askaiTip button')].find(x=>/Try it/.test(x.textContent)).click()"); pg.wait_for_timeout(100)
    ok('Try it opens Ask AI and the tip goes', pg.evaluate("()=>!!document.getElementById('askcRoot') && !document.getElementById('askaiTip')"))
    ok('...and stays gone', load() is None)
    pg.evaluate("()=>localStorage.clear()")
    pg.goto('http://asktip.local/index.html?proof=asktip'); pg.wait_for_timeout(1200)
    pg.evaluate(SETUP.replace('ask_cara_live:true', 'ask_cara_live:false'), KRIS); pg.wait_for_timeout(150)
    ok('nobody who cannot see the button gets the tip', pg.evaluate("()=>!document.getElementById('askaiTip')"))
    ok('nothing is sent or saved to the database', pg.evaluate("()=>window.__sent.length===0"), pg.evaluate("()=>window.__sent"))
    ok('no page errors', not errs, errs[:3])
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

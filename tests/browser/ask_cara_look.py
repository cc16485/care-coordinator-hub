"""Ask Cara for the Office (2026-11-07, her "Ask Cara chat"): the real Hub page offline, made-up people only. The Ask Cara
top-bar button shows for owners while practicing and for everyone once ops_settings.ask_cara_live is on; the panel opens
over the page, sends the question (and the recent conversation) to ask-cara with the user's sign-in, shows the answer and
its sources as chips (a client chip opens the profile), shows a refusal plainly, and never writes anything itself.
(python3 tests/browser/ask_cara_look.py; SHOTS=<dir> also saves a screenshot)"""
import os, sys, json, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = os.environ.get('SHOTS')
STUB = r"""
()=>{
  const W=window; W.__log={ writes:[], asked:[], opened:[] };
  (0,eval)(`sb={ from:(tb)=>{ const p={ select(){return p;}, eq(){return p;}, gte(){return p;}, in(){return p;}, order(){return p;}, limit(){return p;}, not(){return p;},
      single:async()=>({ data:null, error:null }), maybeSingle:async()=>({ data:null, error:null }), insert:async()=>{ window.__log.writes.push(tb); return {error:null}; }, then(a){ return Promise.resolve({ data:[], error:null }).then(a); } }; return p; },
    rpc:async(n)=>{ window.__log.writes.push('rpc:'+n); return {data:null,error:null}; }, functions:{ invoke:async()=>({data:null,error:null}) }, auth:{ getSession:async()=>({data:{session:{access_token:'tok-1'}}}) } };
    CC_ROLE_BY_EMAIL={ 'samantha@mo-care.com':['owner_admin'], 'kris@mo-care.com':['care_coordinator'] };
    ME={ email:'samantha@mo-care.com', name:'Samantha Troutman', shift:'day' };`);
  W.persist=async(k,v)=>{ W.__log.writes.push(k); };
  W.openClientProfile=(id)=>{ W.__log.opened.push(['client',id]); };
  W.openCaregiverProfile=(id)=>{ W.__log.opened.push(['caregiver',id]); };
  DATA.ops_settings={ team_work_live:true, my_work_tiers_live:true };
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
}
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,800)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const btn=()=>document.getElementById('askCaraBtn'), root=()=>document.getElementById('askcRoot'), txt=()=>root()?root().innerText:'';
  ASKC.showButton();
  ok('the Ask Cara button is in the top bar for an owner while practicing', btn() && btn().style.display!=='none' && btn().closest('header.topbar'));
  (0,eval)("ME={ email:'kris@mo-care.com', name:'Kris Coord', shift:'day' }"); ASKC.showButton();
  ok('a coordinator does not see it while practicing', btn().style.display==='none' && !ASKC.allowed());
  DATA.ops_settings.ask_cara_live=true; ASKC.showButton();
  ok('once she switches it on, every office user sees it', btn().style.display!=='none' && ASKC.allowed());
  delete DATA.ops_settings.ask_cara_live; (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha Troutman', shift:'day' }"); ASKC.showButton();
  btn().click(); await sleep(150);
  ok('the panel opens over the page, saying it only reads, with starter questions', root() && /Reads our records and your rules\. Never changes anything\./.test(txt()) && /Practice: owners only/.test(txt()) && root().querySelectorAll('.askc-start button').length===4, txt().slice(0,400));
  document.getElementById('askcIn').value='What changed with Ned this week?'; ASKC.send(); await sleep(50);
  ok('while it looks things up, it says so', /Looking that up/.test(txt()));
  await sleep(400);
  const a1=window.__log.asked[0]||{};
  ok('the question goes to ask-cara with the user\'s own sign-in', a1.url && /\/functions\/v1\/ask-cara$/.test(a1.url) && a1.auth==='Bearer tok-1' && a1.body.question==='What changed with Ned this week?' && Array.isArray(a1.body.history), a1);
  ok('the answer shows with its sources as chips', /Ned came home Nov 5\. He is bed-bound/.test(txt()) && root().querySelectorAll('.askc-chip').length===3, txt());
  [...root().querySelectorAll('.askc-chip.go')].find(c=>/Ned Fakename/.test(c.innerText)).click();
  ok('a client chip opens their profile', JSON.stringify(window.__log.opened)==='[["client","901"]]', window.__log.opened);
  ok('a call chip is a plain label (not a link)', [...root().querySelectorAll('.askc-chip')].some(c=>/Call with Pat/.test(c.innerText)&&!c.classList.contains('go')));
  document.getElementById('askcIn').value='And who is with him tomorrow?'; ASKC.send(); await sleep(450);
  const a2=window.__log.asked[1]||{};
  ok('a follow-up carries the conversation so far', a2.body && a2.body.history.length===2 && a2.body.history[0].text==='What changed with Ned this week?', a2.body);
  window.__FAIL=true; document.getElementById('askcIn').value='Anything else?'; ASKC.send(); await sleep(450); window.__FAIL=false;
  ok('a refusal or failure is said plainly', /Cara could not answer: AxisCare could not be read/.test(txt()), txt().slice(-300));
  ok('the panel writes nothing itself', window.__log.writes.length===0, window.__log.writes);
  if(window.__SHOT) await window.__SHOT();
  ASKC.close(); await sleep(50);
  ok('Close takes the panel away; the page underneath is as it was', !root() && document.getElementById('appScreen'));
  return R;
}
"""
MIME = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.json':'application/json', '.webmanifest':'application/json'}
ANSWER = {'text': 'Ned came home Nov 5. He is bed-bound and uses a sit-to-stand.\n\n- Mia Fakecare is with him tomorrow at 9 AM.', 'sources': [{'id': 'client:901', 'label': 'Ned Fakename (client)'}, {'id': 'call:m1', 'label': 'Call with Pat Fakename, Thu, Nov 5'}, {'id': 'rule:OR01', 'label': 'Rule: Falls'}]}
def serve(route):
    url = route.request.url
    if '/functions/v1/ask-cara' in url:
        req = route.request
        return route.fulfill(status=200, headers={'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}, body=json.dumps(ANSWER))
    if 'supabase.co' in url: return route.abort()
    if not url.startswith('http://askcara.local/'): return route.continue_()
    p = (ROOT / url.split('http://askcara.local/', 1)[1].split('?')[0].split('#')[0])
    if not p.is_file(): return route.fulfill(status=404, body='')
    route.fulfill(status=200, body=p.read_bytes(), content_type=MIME.get(p.suffix, 'application/octet-stream'))
with sync_playwright() as pw:
    b = pw.chromium.launch(); cx = b.new_context(viewport={'width': 1280, 'height': 900}, timezone_id='America/Chicago'); pg = cx.new_page()
    pg.route('**/*', serve)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://askcara.local/index.html?proof=askcara'); pg.wait_for_timeout(1500)
    pg.evaluate(STUB)
    pg.evaluate("""()=>{ const real=window.fetch; window.fetch=async(url,o={})=>{ if(String(url).includes('/functions/v1/ask-cara')){ const body=JSON.parse(o.body); window.__log.asked.push({ url:String(url), auth:(o.headers||{}).Authorization, body });
      if(window.__FAIL) return new Response(JSON.stringify({ error:'Cara could not answer: AxisCare could not be read just now' }), { status:502 }); }
      return real(url,o); }; }""")
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True)
        pg.evaluate("async()=>{ ASKC.open(); document.getElementById('askcIn').value='What changed with Ned this week?'; ASKC.send(); await new Promise(r=>setTimeout(r,500)); }")
        pg.screenshot(path=os.path.join(SHOTS, 'ask-cara.png'))
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

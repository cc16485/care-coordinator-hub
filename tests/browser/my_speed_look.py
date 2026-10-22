"""My speed (Speed to lead, Samantha 2026-10-22, design approved). The real Hub page, offline (files served from this folder, no server
needed), made-up families only; nothing is saved, texted, emailed or called. Her rules checked: only your own families, good news only,
no names or ranking on the team goal, time off never breaks a streak, the Monday celebration.
Clock pinned to Thursday 22 October 2026, 2:00 PM Chicago. (python3 tests/browser/my_speed_look.py; SHOTS=<dir> saves screenshots)"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = os.environ.get('SHOTS')
STUB = r"""
(()=>{
  const W=window; W.__log={ writes:[], fn:[] };
  (0,eval)(`sb={ from:()=>{ const p={ select(){return p;}, eq(){return p;}, gte(){return p;}, in(){return p;}, order(){return p;}, limit(){return p;},
      single:async()=>({ data:null, error:null }), maybeSingle:async()=>({ data:null, error:null }),
      then(a){ return Promise.resolve({data:[],error:null}).then(a); } }; return p; },
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async(n)=>{ window.__log.fn.push(n); return {data:null,error:null}; } },
    auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };`);
  W.persist=async(k,v)=>{ W.__log.writes.push(k); };
  const at=(iso,m)=>new Date(Date.parse(iso)+m*60000).toISOString();
  const L=(id,who,created,tryMin,o)=>Object.assign({ id, first_name:id, last_name:'Fam', created_at:created, assigned_coordinator:who,
    first_human_attempt_at: tryMin==null?undefined:at(created,tryMin), contact_events:[{ at:created, channel:'web', direction:'in', outcome:'inquiry', actor:'family' }] }, o||{});
  DATA.ops_settings={};
  DATA.leads=[
    L('Ann','Krystal','2026-10-19T14:00:00Z',2), L('Bea','Krystal','2026-10-20T15:00:00Z',4), L('Cal','Krystal','2026-10-21T16:00:00Z',3),
    L('Dee','Krystal','2026-10-22T15:00:00Z',1),
    L('Old','Krystal','2026-10-05T15:00:00Z',3), L('Old2','Krystal','2026-10-06T15:00:00Z',2),
    L('Zed','Angiel','2026-10-21T15:00:00Z',40), L('Yan','Angiel','2026-10-22T14:00:00Z',30) ];
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const as=(e,n)=>(0,eval)("ME={ email:'"+e+"', name:'"+n+"', shift:'day' };");
  const box=()=>document.getElementById('mySpeedBox').innerText;
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  as('krystal@mo-care.com','Krystal Land');
  switchTab('myspeed'); await sleep(150);
  ok('Leads has a My speed pill', [...document.querySelectorAll('.fpill[data-tab="myspeed"]')].some(p=>/My speed/.test(p.innerText)));
  ok('the tab opens and draws the page', document.getElementById('tab-myspeed').classList.contains('active') || getComputedStyle(document.getElementById('tab-myspeed')).display!=='none', box().slice(0,300));
  ok('it is Krystal\'s own page', /Your speed/.test(box()) && /Just for you, Krystal\. Nobody else sees this page\./.test(box()), box().slice(0,300));
  ok('her streak: 6 families in a row within 5 minutes, one house each', /6 families in a row heard from you within 5 minutes/.test(box()) && document.querySelectorAll('#mySpeedBox svg path[fill="#FFC671"]').length>=6, box());
  ok('time off never breaks a streak is said', /Time off never breaks a streak/.test(box()));
  ok('team goal counts everyone this week, with no names', /A 5-minute week: 4 of 6 families so far/.test(box()) && !/Angiel|Zed|Yan/.test(box()), box());
  ok('her middle wait this month and her best week', /Your middle wait this month/.test(box()) && /Your best week/.test(box()), box());
  ok('how it counts: office hours, call from GoHighLevel', /Office hours only/.test(box()) && /call from GoHighLevel/.test(box()));
  ok('good news only: no ranking, no nudging words', !/rank #|slowest|behind|you should|hurry|worst|—/i.test(box().replace('No names, no ranking','')), box());
  ok('no celebration on a Thursday', !/Last week was a 5-minute week/.test(box()));

  as('angiel@mo-care.com','Angiel Test'); renderMySpeed(); await sleep(50);
  ok('Angiel sees only her own: a neutral new-streak line, never a "you broke it" message', /Your next family starts a new streak/.test(box()) && !/Krystal|Ann|broke|missed/i.test(box()), box());
  ok('nothing was saved, texted, emailed or called', window.__log.writes.length===0 && window.__log.fn.length===0, window.__log);
  as('krystal@mo-care.com','Krystal Land'); renderMySpeed();
  return R;
}
"""
MON = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Land', shift:'day' };");
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  /* the 5-minute week is the whole team's: make every family last week fast */
  DATA.leads.forEach(l=>{ if(l.first_human_attempt_at) l.first_human_attempt_at=new Date(Date.parse(l.created_at)+2*60000).toISOString(); });
  switchTab('myspeed'); await sleep(150);
  const t=document.getElementById('mySpeedBox').innerText;
  ok('Monday after a 5-minute week: the celebration shows', /Last week was a 5-minute week/.test(t), t.slice(0,400));
  return R;
}
"""
MIME = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.json':'application/json', '.webmanifest':'application/json'}
def serve(route):
    url = route.request.url
    if 'supabase.co' in url: return route.abort()
    if not url.startswith('http://myspeed.local/'): return route.continue_()
    p = (ROOT / url.split('http://myspeed.local/', 1)[1].split('?')[0].split('#')[0])
    if not p.is_file(): return route.fulfill(status=404, body='')
    route.fulfill(status=200, body=p.read_bytes(), content_type=MIME.get(p.suffix, 'application/octet-stream'))
def run(b, clock, script, tag):
    cx = b.new_context(viewport={'width': 1280, 'height': 1100}, timezone_id='America/Chicago'); pg = cx.new_page()
    pg.clock.install(time=clock); pg.clock.resume()
    pg.route('**/*', serve)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://myspeed.local/index.html?proof=myspeed'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(script); R.append(['PASS' if not errs else 'FAIL', tag + ': no page errors', errs[:3]])
    if SHOTS: pg.locator('#tab-myspeed').screenshot(path=os.path.join(SHOTS, 'my_speed_' + tag + '.png'))
    cx.close()
    return R
with sync_playwright() as pw:
    b = pw.chromium.launch()
    R = run(b, '2026-10-22T14:00:00-05:00', T, 'Thursday') + run(b, '2026-10-26T09:00:00-05:00', MON, 'Monday')
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

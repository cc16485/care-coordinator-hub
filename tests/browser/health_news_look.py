"""Health news for the care plan (2026-11-06, Part 2 step 1, PRACTICE; plan https://claude.ai/artifact/8FHJhCQ6wj21zjA18JkAHu).
The real Hub page offline (files served from this folder), made-up readings only. The AI call reader tab shows, under each
call, the health news the second reading found (each with the words said on the call) and the care plan changes it would
draft, with "Ask before approving" where nobody said; a Health news filter; search finds it; a call with no news shows
nothing extra; a failed health reading says so. Nothing is written, sent, or made into a card.
(python3 tests/browser/health_news_look.py; SHOTS=<dir> also saves screenshots)"""
import os, sys, json, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = os.environ.get('SHOTS')
ROWS = [
  { 'message_id': 'm_ed', 'version': 'v13-2026-10-12', 'channel': 'call', 'call_at': '2026-11-05T13:05:00-06:00', 'direction': 'in', 'seconds': 387, 'caller': 'Pat F.', 'match': 'one',
    'who_name': 'Pat Fakename', 'who_roles': ['contact'], 'call_type': 'family', 'tasks': [], 'resolves': [], 'no_task_reason': 'the caller will update us', 'read_at': '2026-11-05T13:20:00-06:00', 'attempt': 1,
    'detail': { 'summary': 'Pat called about her father coming home.', 'about': 'Ned Fakename, client', 'understood': ['Homecoming may move'], 'commitments': [], 'items': [],
      'health': { 'version': 'hn1-2026-11-06', 'has_news': True, 'client': 'Ned Fakename', 'dropped': 1,
        'news': [ { 'kind': 'injury', 'what': 'Compression fracture in the mid back, found on an X-ray', 'when': 'overnight', 'said_by': 'daughter', 'quote': 'the X-ray showed a compression fracture' },
                  { 'kind': 'fall', 'what': 'Family thinks he fell and nobody reported it', 'when': '', 'said_by': 'daughter', 'quote': 'we think he had a fall nobody reported' } ],
        'plan_changes': [ { 'task': 'Gentle repositioning in bed', 'change': 'add', 'because': [0, 1], 'when': { 'text': '', 'ask': True }, 'how': { 'steps': [], 'ask': True },
            'equipment': { 'text': 'Sit-to-stand from hospice', 'ask': False }, 'preferences': { 'text': '', 'ask': True }, 'safety': { 'text': 'Careful of his back', 'ask': False }, 'report_if': { 'text': 'More pain', 'ask': False } } ],
        'ask': ['How should caregivers use the sit-to-stand?'] } } },
  { 'message_id': 'm_steve', 'version': 'v13-2026-10-12', 'channel': 'call', 'call_at': '2026-11-05T10:00:00-06:00', 'direction': 'out', 'seconds': 136, 'caller': 'Stu F.', 'match': 'one',
    'who_name': 'Stu Fakeclient', 'who_roles': ['client'], 'call_type': 'client', 'tasks': [], 'resolves': [], 'no_task_reason': 'nothing to follow up', 'read_at': '2026-11-05T10:10:00-06:00', 'attempt': 1,
    'detail': { 'summary': 'Stu asked about a ride.', 'items': [], 'health': { 'version': 'hn1-2026-11-06', 'has_news': False, 'client': '', 'news': [], 'plan_changes': [], 'ask': [], 'dropped': 0 } } },
  { 'message_id': 'm_err', 'version': 'v13-2026-10-12', 'channel': 'call', 'call_at': '2026-11-05T09:00:00-06:00', 'direction': 'in', 'seconds': 200, 'caller': 'Cara F.', 'match': 'one',
    'who_name': 'Cara Fakecare', 'who_roles': ['caregiver'], 'call_type': 'caregiver', 'tasks': [], 'resolves': [], 'no_task_reason': 'nothing', 'read_at': '2026-11-05T09:10:00-06:00', 'attempt': 1,
    'detail': { 'summary': 'A caregiver called.', 'items': [], 'health': { 'version': 'hn1-2026-11-06', 'error': 'overloaded' } } } ]
STUB = r"""
(rows)=>{
  const W=window; W.__log={ writes:[], fn:[], events:[] };
  W.__rows=rows;
  (0,eval)(`sb={ from:(tb)=>{ const p={ select(){return p;}, eq(){return p;}, gte(){return p;}, in(){return p;}, order(){return p;}, limit(){return p;}, not(){return p;},
      single:async()=>({ data:null, error:null }), maybeSingle:async()=>({ data:null, error:null }),
      insert:async()=>{ window.__log.writes.push(tb); return { error:null }; }, update:()=>{ window.__log.writes.push(tb); return p; }, upsert:async()=>{ window.__log.writes.push(tb); return { error:null }; },
      then(a){ return Promise.resolve({ data: tb==='call_task_reading' ? window.__rows : [], error:null }).then(a); } }; return p; },
    rpc:async(n)=>{ window.__log.writes.push('rpc:'+n); return {data:null,error:null}; }, functions:{ invoke:async(n)=>{ window.__log.fn.push(n); return {data:null,error:null}; } },
    auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };
    CC_ROLE_BY_EMAIL={ 'samantha@mo-care.com':['owner_admin'] };
    ME={ email:'samantha@mo-care.com', name:'Samantha Troutman', shift:'day' };`);
  W.persist=async(k,v)=>{ W.__log.writes.push(k); };
  W.opEvent=(v,o)=>W.__log.events.push(v);
  DATA.ops_items=[]; DATA.leads=[]; DATA.handoffs=[]; DATA.coverage_cases=[];
  DATA.ops_settings={ call_tasks_live:true, team_work_live:true, my_work_tiers_live:true };
}
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const cfu=()=>document.getElementById('cfuWrap').innerText;
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  switchTab('callfollowups'); await sleep(400);
  const t=cfu();
  ok('the call shows HEALTH NEWS FOR THE CARE PLAN for the client, marked practice', /HEALTH NEWS FOR THE CARE PLAN: NED FAKENAME/.test(t) && /practice: no card, nothing changed in the care plan or AxisCare/.test(t), t.slice(0,1500));
  ok('each piece of news with the words said on the call', /Compression fracture in the mid back/.test(t) && /On the call: “the X-ray showed a compression fracture”/.test(t) && /Family thinks he fell/.test(t), t.slice(0,2000));
  ok('the care plan change with its six parts; unspoken parts say Ask before approving', /CARE PLAN CHANGES IT WOULD DRAFT/.test(t) && /Gentle repositioning in bed/.test(t) && /from news 1, 2/.test(t) && /When: Ask before approving/.test(t) && /How to help: Ask before approving/.test(t) && /Equipment: Sit-to-stand from hospice/.test(t) && /Safety: Careful of his back/.test(t) && /Report to the office if: More pain/.test(t), t.slice(0,2500));
  ok('questions before approving', /QUESTIONS BEFORE APPROVING/.test(t) && /How should caregivers use the sit-to-stand\?/.test(t));
  ok('a call with no health news shows nothing extra', (t.match(/HEALTH NEWS FOR THE CARE PLAN/g)||[]).length===1);
  ok('a failed health reading says so, plainly', /Health news: could not be read this time \(overloaded\)/.test(t));
  ok('a Health news filter with the count', /Health news \(1\)/.test(t));
  CPR.setFilter('health'); await sleep(150);
  const h=cfu();
  ok('the filter shows only calls with health news', /Pat Fakename/.test(h) && !/Stu Fakeclient/.test(h) && !/Cara Fakecare/.test(h), h.slice(0,800));
  CPR.setFilter('all'); CPR.setQuery('fracture'); await sleep(400);
  const q=cfu();
  ok('search finds the call by its health news', /Pat Fakename/.test(q) && !/Stu Fakeclient/.test(q), q.slice(0,600));
  CPR.setQuery(''); await sleep(300);
  ok('nothing was written, saved, sent or made into a card', window.__log.writes.length===0 && window.__log.fn.length===0 && DATA.ops_items.length===0, window.__log);
  return R;
}
"""
MIME = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.json':'application/json', '.webmanifest':'application/json'}
def serve(route):
    url = route.request.url
    if 'supabase.co' in url: return route.abort()
    if not url.startswith('http://healthnews.local/'): return route.continue_()
    p = (ROOT / url.split('http://healthnews.local/', 1)[1].split('?')[0].split('#')[0])
    if not p.is_file(): return route.fulfill(status=404, body='')
    route.fulfill(status=200, body=p.read_bytes(), content_type=MIME.get(p.suffix, 'application/octet-stream'))
with sync_playwright() as pw:
    b = pw.chromium.launch(); cx = b.new_context(viewport={'width': 1280, 'height': 900}, timezone_id='America/Chicago'); pg = cx.new_page()
    pg.clock.install(time='2026-11-06T14:40:00-06:00'); pg.clock.resume()
    pg.route('**/*', serve)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://healthnews.local/index.html?proof=healthnews'); pg.wait_for_timeout(1500)
    pg.evaluate(STUB, ROWS)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True)
        pg.evaluate("()=>{ const el=[...document.querySelectorAll('#cfuWrap div')].find(d=>/^HEALTH NEWS FOR THE CARE PLAN/.test(d.innerText||'')); if(el) el.parentElement.parentElement.scrollIntoView({block:'start'}); }")
        pg.wait_for_timeout(200); pg.screenshot(path=os.path.join(SHOTS, 'health-news.png'))
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

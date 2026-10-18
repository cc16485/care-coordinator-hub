"""Client Goals (2026-10-18, her ask: a fun, interactive Client Goals tab on My Work; owners set a weekly hours goal and a
CDS consumers goal). The My Work strip shows the tab; hours come from coverage-shifts (faked here) for this week and the
five before it; only an owner sees Set a goal, +1 and -1; saves go to cc_goals rows client_hours and cds_consumers.
Made-up people only. (python3 tests/browser/client_goals_look.py; SHOT=dir to save screenshots)"""
import os, mimetypes
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
STUB = r"""
(()=>{
  const W=window; W.__log={ writes:[], toasts:[], reads:[], events:[] };
  const clone=x=>JSON.parse(JSON.stringify(x));
  (0,eval)(`sb={ from:()=>{ const p={ select(){return p;}, eq(){return p;}, in(){return p;}, not(){return p;}, order(){return p;}, limit(){return p;},
      maybeSingle:async()=>({data:null,error:null}), then(a){ return Promise.resolve({data:[],error:null}).then(a); } }; return p; },
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async()=>({data:null,error:null}) },
    auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };`);
  W.persist=async(k,v)=>{ W.__log.writes.push({ k, v:clone(v) }); };
  W.ccToast=m=>W.__log.toasts.push(m); W.opEvent=(t,o)=>W.__log.events.push(o);
  W.ccPrompt=async()=>'18';
  (0,eval)(`ME={ email:'kry@mo-care.com', name:'Krystal Land', shift:'day' }; CC_ROLE_BY_EMAIL={ 'sam@mo-care.com':['owner_admin'], 'kry@mo-care.com':['care_coordinator'] };`);
  DATA.cc_goals=[{ id:'main', inquiries:12, starts:4, ref_week:5 }];
  /* this week: 3 clients; 8-12 (4h) x5 worked, 20:00-08:00 overnight (12h) x2, one open 9-14 (5h) */
  const chi=()=>new Date().toLocaleString('sv-SE',{timeZone:'America/Chicago'}).slice(0,10);
  W.__fakeWeek=(start)=>{ const add=(d,n)=>{ const [y,m,dd]=d.split('-').map(Number); return new Date(Date.UTC(y,m-1,dd+n)).toISOString().slice(0,10); };
    const rows=[]; const now=chi();
    const cur=start<=now&&now<=add(start,6);
    for(let i=0;i<5;i++) rows.push({ date:add(start,i), time:'08:00', end:'12:00', client:'Ann Able', client_id:'1', caregiver:'Bea B', clock_in:'08:00', clock_out:'12:00' });
    for(let i=0;i<2;i++) rows.push({ date:add(start,i), time:'20:00', end:'08:00', client:'Cal Cole', client_id:'2', caregiver:'Dee D', clock_in:null, clock_out:null });
    rows.push({ date:add(start,3), time:'09:00', end:'14:00', client:'Eve Ellis', client_id:'3', caregiver:null });
    /* past weeks are bigger so a bar reaches the goal */
    if(!cur){ for(let i=0;i<4;i++) rows.push({ date:add(start,i), time:'08:00', end:'18:00', client:'Fay Fox', client_id:'4', caregiver:'Gus G', clock_out:'18:00' }); }
    return rows; };
  W.__failWeeks=false;
  W.fetch=async(url,opt)=>{ const b=JSON.parse(opt.body); W.__log.reads.push(b);
    if(W.__failWeeks) return { ok:false, status:502, json:async()=>({ error:'AxisCare responded 503' }) };
    return { ok:true, status:200, json:async()=>({ start:b.start, end:b.end, rows:W.__fakeWeek(b.start) }) }; };
  try{ localStorage.clear(); }catch(e){}
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log;
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  const txt=()=>document.getElementById('cgoWrap').textContent;
  try{

  ok('pure · overnight visit counts 12 hours', CGO.visitHours({ time:'20:00', end:'08:00' })===12 && CGO.visitHours({ time:'08:00', end:'12:30' })===4.5 && CGO.visitHours({ time:'', end:'' })===0);
  const s=CGO.summarize(window.__fakeWeek('2026-10-12').slice(0,8));
  ok('pure · summary: booked, worked, open, clients', s.hours===49&&s.worked===20&&s.open===5&&s.clients===3&&s.visits===8, s);
  ok('pure · week starts Monday', CGO.weekStart('2026-10-18')==='2026-10-12'&&CGO.weekStart('2026-10-12')==='2026-10-12');

  switchTab('mywork'); await sleep(30);
  const pill=[...document.querySelectorAll('.fpill,.fsub2 *,[onclick]')].find(e=>/Client Goals/.test(e.textContent||'')&&/clientgoals/.test(e.getAttribute('onclick')||''));
  ok('My Work strip · has a Client Goals tab', !!pill, [...document.querySelectorAll('[onclick*="clientgoals"]')].map(e=>e.outerHTML.slice(0,120)));
  switchTab('clientgoals'); await sleep(250);
  ok('tab opens with both cards', document.getElementById('tab-clientgoals').classList.contains('active')&&/Weekly care hours/.test(txt())&&/CDS consumers/.test(txt()));
  ok('hours · read this week from coverage-shifts as a Mon-Sun range', L.reads[0]&&L.reads[0].live_schedule===true&&L.reads[0].start===CGO.weekStart(new Date().toLocaleString('sv-SE',{timeZone:'America/Chicago'}).slice(0,10)), L.reads[0]);
  ok('hours · this week numbers', /49 hours booked/.test(txt())&&/20 worked so far/.test(txt())&&/5 hours still need a caregiver/.test(txt()), txt().slice(0,600));
  await sleep(200);
  ok('hours · read the five weeks before, one at a time', L.reads.length===6, L.reads.length);
  ok('Krystal (not an owner) · no Set a goal, no +1', !/Set a goal/.test(txt())&&!document.querySelector('.cgo-plus')&&/Samantha or Zachary sets it/.test(txt()));
  ok('no em dashes in the words', !/—/.test(txt()));

  (0,eval)(`ME={ email:'sam@mo-care.com', name:'Samantha Troutman', shift:'manager' }`);
  CGO.paint(); await sleep(30);
  ok('Samantha · Set a goal on both cards, +1 New consumer', document.querySelectorAll('.cgo-set').length===2&&!!document.querySelector('.cgo-plus'));
  cgoEditGoal('client_hours'); await sleep(20);
  ok('editor · slider and number', !!document.getElementById('cgoRange_client_hours')&&!!document.getElementById('cgoNum_client_hours'));
  document.getElementById('cgoNum_client_hours').value='80';
  CGO.paint(); await sleep(10);
  ok('editor · a half-typed goal survives a repaint', document.getElementById('cgoNum_client_hours').value==='80');
  document.getElementById('cgoBy_client_hours').value='2026-12-31';
  await cgoSaveGoal('client_hours'); await sleep(40);
  const w=L.writes.find(x=>x.k==='cc_goals'&&x.v.id==='client_hours');
  ok('save · cc_goals client_hours with who and when', w&&w.v.goal===80&&w.v.by==='2026-12-31'&&w.v.set_by==='sam@mo-care.com'&&w.v.history.length===1, w);
  ok('save · the Dashboard main row is kept', DATA.cc_goals.some(x=>x.id==='main'));
  ok('save · audit line', L.events.some(e=>/weekly care hours goal to 80/.test(e.summary)), L.events);
  ok('trail · drawn with percent and to-go words', !!document.querySelector('.cgo-trail')&&/61%/.test(txt())&&/31 hours to go/.test(txt())&&/about 2 more clients/.test(txt()), txt().slice(0,900));
  await sleep(1300);
  const walker=(document.querySelector('.cgo-walker')||{getAttribute:()=>'MISSING '+txt().slice(0,400)}).getAttribute('transform');
  ok('trail · the walker moved up the hill', /translate\(/.test(walker)&&!/translate\(24 /.test(walker), walker);
  ok('bars · goal line and a star on a week that reached it', /Goal 80/.test(document.getElementById('cgoBars').textContent)&&document.querySelectorAll('#cgoBars polygon').length>=1);
  ok('streak · past weeks at the goal are counted', /5 weeks in a row at the goal/.test(document.getElementById('cgoStreak').textContent), document.getElementById('cgoStreak').textContent);

  cgoEditGoal('cds_consumers'); await sleep(10);
  document.getElementById('cgoNum_cds_consumers').value='3'; await cgoSaveGoal('cds_consumers'); await sleep(20);
  ok('CDS · a street of 3 dark houses', document.querySelectorAll('#cgoStreet .cgo-house').length===3&&!document.querySelector('#cgoStreet .cgo-house.lit'));
  await cgoBump(1); await cgoBump(1); await sleep(20);
  const c=L.writes.filter(x=>x.v.id==='cds_consumers').pop()||{v:{}};
  ok('CDS · +1 twice saves count 2 with a log', c.v.count===2&&c.v.log.length===2&&c.v.goal===3&&c.v.log[1].by==='sam@mo-care.com', c.v);
  ok('CDS · 2 lit houses, 1 to go', document.querySelectorAll('#cgoStreet .cgo-house.lit').length===2&&/1 more to go/.test(txt()));
  await cgoBump(1); await sleep(20);
  ok('CDS · reaching the goal says so', L.toasts.some(t=>/CDS goal is reached/.test(t))&&/Goal reached!/.test(document.getElementById('cgoCds').textContent), L.toasts);
  await cgoSetCount(); await sleep(20);
  ok('CDS · Set the exact number (18): extra houses past the goal', JSON.parse(JSON.stringify(DATA.cc_goals.find(x=>x.id==='cds_consumers'))).count===18&&document.querySelectorAll('#cgoStreet .cgo-house.extra').length===15);
  await cgoBump(-1); await sleep(20);
  ok('CDS · -1 saves 17', DATA.cc_goals.find(x=>x.id==='cds_consumers').count===17&&/marked one as left/.test(txt()));

  (0,eval)(`ME={ email:'kry@mo-care.com', name:'Krystal Land', shift:'day' }`);
  const before=L.writes.length; await cgoBump(1); await cgoSaveGoal('client_hours');
  ok('Krystal · cannot change the count or a goal, even by calling it', L.writes.length===before&&L.toasts.some(t=>/Only Samantha or Zachary/.test(t)));
  CGO.paint(); await sleep(10);
  ok('Krystal · sees the goals Samantha set', /of 80 hours/.test(txt())&&/17 of 3 consumers|17 of 3/.test(txt())&&/Set by Samantha/.test(txt()));

  window.__failWeeks=true; CGO.state.weeks={}; CGO.state.at=0; await cgoLoad(true); await sleep(60);
  ok('AxisCare down · says so with Try again (no silent failure)', /Could not read this week from AxisCare: AxisCare responded 503/.test(txt())&&/Try again/.test(txt()), txt().slice(0,300));
  }catch(e){ R.push(['FAIL','threw',String(e&&e.stack||e).slice(0,400)]); }
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
    pg.goto('http://hub.test/index.html?proof=goals'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    shot = os.environ.get('SHOT')
    if shot:
        os.makedirs(shot, exist_ok=True)
        pg.evaluate("""async()=>{ window.__failWeeks=false; (0,eval)(`ME={ email:'sam@mo-care.com', name:'Samantha Troutman', shift:'manager' }`);
          const g=DATA.cc_goals.find(x=>x.id==='cds_consumers'); g.goal=25; g.count=16; g.by='2027-06-01';
          DATA.cc_goals.find(x=>x.id==='client_hours').goal=80; CGO.state.weeks={}; CGO.state.at=0; await cgoLoad(true); }""")
        pg.wait_for_timeout(1800)
        pg.locator('#tab-clientgoals').screenshot(path=os.path.join(shot, 'client-goals.png'))
        pg.set_viewport_size({'width': 390, 'height': 900}); pg.wait_for_timeout(300)
        pg.evaluate("CGO.paint()"); pg.wait_for_timeout(1400)
        pg.locator('#tab-clientgoals').screenshot(path=os.path.join(shot, 'client-goals-phone.png'))
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

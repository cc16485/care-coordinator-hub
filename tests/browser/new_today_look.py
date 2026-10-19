"""The new Today screen (2026-10-19, her yes to https://claude.ai/artifact/EFKms6fU32DfSTyTZPX1kS): My Work is the first
screen with a five-tile strip on top (Since you left, Coverage, Today in AxisCare, Booked today, Responsible now); no
Dashboard or Call Follow Ups pill on Today; the AI call reader under Conversations; To talk about retired; the scorecard
and the Communication Log in Team Meetings. The real Hub page, offline, made-up people only.
(python3 tests/browser/new_today_look.py; SHOT=dir saves screenshots)"""
import os, re, sys, mimetypes
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
STUB = re.search(r'STUB = r"""(.*?)"""', open(os.path.join(HERE, 'standup_look.py')).read(), re.S).group(1)
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  try{
  try{ localStorage.clear(); }catch(e){}
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Land', shift:'day' }; CC_ROLE_BY_EMAIL={ 'krystal@mo-care.com':['care_coordinator'], 'samantha@mo-care.com':['owner_admin'] };");
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  const vis=sel=>{ const e=document.querySelector(sel); return !!e && e.offsetParent!==null; };
  const now=new Date().toISOString(), today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Chicago'});
  DATA.ops_items=[ { id:'ops_n1', kind:'capture', status:'open', title:'Ann asked about Tuesday', about:'Ann Able', owner:'krystal@mo-care.com', created_at:now, created_by:'samantha@mo-care.com', opened_by:'person' },
    { id:'ops_robot', kind:'staffing_issue', status:'open', title:'robot item', about:'Robo', created_at:now, created_by:'timekeeper' },
    { id:'ops_secret', kind:'discipline', sensitive:true, status:'open', title:'Write-up for Pat (fake)', about:'Pat Example', owner:'samantha@mo-care.com', created_at:now, created_by:'samantha@mo-care.com', created_by_email:'samantha@mo-care.com' } ];
  DATA.leads=[ { id:'l1', first_name:'Gina', last_name:'Gale', status:'New', created_at:now } ];
  DATA.coverage_cases=[ { id:'c1', status:'open', client:'Edward Anderson', shift_date:today, shift_time:'16:00-21:00' }, { id:'c2', status:'open', kind:'interest', client:'New Family' } ];
  window.fetch=async(u,o)=>{ const b=JSON.parse((o&&o.body)||'{}'); if(b.today_board) return { ok:true, status:200, json:async()=>({ total:13, open:[{ client:'Tommy Mason', time:'09:30', end:'11:30' }] }) }; return { ok:true, status:200, json:async()=>({}) }; };
  sb.auth=Object.assign({}, sb.auth, { getSession:async()=>({ data:{ session:{ access_token:'t' } } }) });
  (0,eval)("BT_IV={ bookings:[], applicants:[] }; BT_IV_AT=Date.now();");

  /* Today opens My Work */
  ccGroupClick('today'); await sleep(400);
  ok('Today opens My Work', document.getElementById('tab-mywork').classList.contains('active') && !document.getElementById('tab-today').classList.contains('active'));
  ok('no Dashboard or Call Follow Ups pill on Today', !document.querySelector('#fsub-today [data-tab="today"]') && !document.querySelector('#fsub-today [data-tab="callfollowups"]'));
  ok('the AI call reader is under Conversations', !!document.querySelector('#fsub-team [data-tab="callfollowups"]') && /AI call reader/.test(document.querySelector('#fsub-team [data-tab="callfollowups"]').textContent));
  ok('My Work\'s pills: My Work, My Desk, Client Goals (no To talk about)', !(CC_SUBTABS.myworkgrp||[]).some(x=>x.t==='standup') && (CC_SUBTABS.myworkgrp||[]).some(x=>x.t==='clientgoals'));

  /* the strip */
  await sleep(300);
  const tiles=[...document.querySelectorAll('#todayStrip .ts-tile')].map(t=>t.innerText.replace(/\n+/g,' | '));
  ok('the strip has five tiles in order', tiles.length===5 && /^SINCE YOU LEFT/i.test(tiles[0]) && /^COVERAGE/i.test(tiles[1]) && /^TODAY IN AXISCARE/i.test(tiles[2]) && /^BOOKED TODAY/i.test(tiles[3]) && /^RESPONSIBLE NOW/i.test(tiles[4]), tiles);
  ok('Since you left: people\'s items and new leads, not the robot\'s, not a write-up Krystal can\'t open', /2 came in/.test(tiles[0]) && /Ann, Gina/.test(tiles[0]) && !/Pat/.test(tiles[0]), tiles[0]);
  ok('Coverage: one open case (a new-client check is not counted), the first one named', /1 open case/.test(tiles[1]) && /Edward Anderson, \w{3}, \w{3} \d+ 16:00/.test(tiles[1]), tiles[1]);
  ok('Today in AxisCare: visits and the open shift', /13 visits/.test(tiles[2]) && /1 open shift: Tommy, 09:30/.test(tiles[2]), tiles[2]);
  ok('Booked today: interviews and assessments', /0 interviews/.test(tiles[3]) && /assessment/.test(tiles[3]), tiles[3]);
  ok('Responsible now names a person or says nobody is on Staffing', /RESPONSIBLE NOW \| ([A-Z][a-z]+|Nobody on Staffing)/.test(tiles[4]) && !/@/.test(tiles[4]), tiles[4]);
  document.querySelector('#todayStrip .ts-tile').click(); await sleep(150);
  const panel=document.querySelector('#todayStrip .ts-panel');
  ok('tapping Since you left opens the list (and Fold away closes it)', !!panel && /Ann Able/.test(panel.innerText) && /Gina Gale/.test(panel.innerText) && !/Pat Example/.test(panel.innerText), panel && panel.innerText);
  window.__shotStrip=true;
  return R;
  }catch(e){ ok('the run did not crash', false, String(e && e.stack || e)); return R; }
}
"""
T2 = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  try{
  document.querySelector('#todayStrip .ts-panel button.linklike').click(); await sleep(100);
  ok('Fold away closes the list', !document.querySelector('#todayStrip .ts-panel'));
  ok('the desk line and the Staffing view sit on My Work now', !!document.querySelector('#tab-mywork #dkDashLine') && !!document.querySelector('#tab-mywork #staffingView'));
  switchTab('today'); await sleep(200);
  ok('an old link to the Dashboard lands on My Work', document.getElementById('tab-mywork').classList.contains('active'));
  switchTab('standup'); await sleep(300);
  ok('an old link to To talk about lands on Team Meetings', document.getElementById('tab-teammeetings').classList.contains('active'));
  ok('Team Meetings holds the Team scorecard, the huddle questions and the Communication Log', !!document.querySelector('#tab-teammeetings #standupCard') && /huddle questions/.test(document.querySelector('#tab-teammeetings #standupCard').innerText) && !!document.querySelector('#tab-teammeetings #commLog'));
  switchTab('callfollowups'); await sleep(200);
  ok('the AI call reader opens, titled AI call reader', document.getElementById('tab-callfollowups').classList.contains('active') && /AI call reader/.test(document.title + ' ' + (document.getElementById('sectionTitle')||{textContent:''}).textContent + ' ' + document.body.innerText.slice(0,400)));
  return R;
  }catch(e){ ok('the second part did not crash', false, String(e && e.stack || e)); return R; }
}
"""
def serve(route):
    path = route.request.url.split('://', 1)[1].split('/', 1)[1].split('?')[0] or 'index.html'
    f = os.path.join(ROOT, path)
    if os.path.isfile(f): route.fulfill(path=f, content_type=mimetypes.guess_type(f)[0] or 'application/octet-stream')
    else: route.fulfill(status=404, body='')
sys.path.insert(0, HERE)
from clock_pin import pin
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1300, 'height': 1000})
    pin(pg)
    pg.route('**/*', lambda r: serve(r) if r.request.url.startswith('http://hub.test/') else (r.abort() if 'supabase.co' in r.request.url else r.continue_()))
    errs = []; pg.on('pageerror', lambda e: errs.append((str(e) + ' @ ' + str(getattr(e, 'stack', '') or ''))[:600]))
    pg.goto('http://hub.test/index.html?proof=newtoday'); pg.wait_for_timeout(1500)
    pg.evaluate('window.__origFetch=window.fetch.bind(window)')
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T)
    shot = os.environ.get('SHOT')
    if shot:
        os.makedirs(shot, exist_ok=True); pg.evaluate('window.scrollTo(0,0)'); pg.wait_for_timeout(200)
        pg.screenshot(path=os.path.join(shot, 'new-today.png'))
    R += pg.evaluate(T2)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

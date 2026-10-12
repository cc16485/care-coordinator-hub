"""The Clients directory (2026-10-12, hers: "Clients need to have a directory just like caregivers", after "dan has not
been pulled over from Axiscare!"). The real Hub page, offline: the list starts from the live AxisCare census, a client
AxisCare has and the Hub doesn't shows as Not connected yet (never invisible), search finds current and past, past
AxisCare-only clients open in AxisCare, and the client sync's last run shows. Made-up TEST clients only.
(python3 tests/browser/client_directory_look.py, static server for THIS checkout on PORT, default 8765)"""
import re, os, sys
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
STUB = re.search(r'STUB = r"""(.*?)"""', open(os.path.join(HERE, 'standup_look.py')).read(), re.S).group(1)
PORT = os.environ.get('PORT', '8765')
T = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  DATA.client_checkins=[]; DATA.care_plan_reviews=[]; DATA.staffing_tasks=[]; DATA.coverage_cases=[];
  const HUB=[{ axiscare_client_id:'101', client_name:'Tess Current', role_status:'active', person_id:'p1' },
             { axiscare_client_id:'102', client_name:'Pat Ended', role_status:'former', end_reason:'moved', person_id:'p2' }];
  const CEN={ total:5, truncated:false, clients:[
    { id:'101', first:'Tess', last:'Current', goes_by:'', active:true, status_label:'Active', city:'Joplin', classes:['Level 2','Private Pay'] },
    { id:'102', first:'Pat', last:'Ended', goes_by:'', active:false, status_label:'Discharged', city:'', classes:[] },
    { id:'103', first:'Dan', last:'Testnew', goes_by:'', active:true, status_label:'Active', city:'Carthage', classes:['Level 3'] },
    { id:'104', first:'Olga', last:'Longgone', goes_by:'', active:false, status_label:'Deceased', city:'', classes:[] },
    { id:'105', first:'Robert', last:'Testgoesby', goes_by:'Bob', active:true, status_label:'Active', city:'', classes:[] } ] };
  window.cl360Roster=async()=>HUB.map(x=>Object.assign({},x));
  window.clLoadIssues=async()=>[];
  window.clCensusLoad=async()=>CEN;
  window.clBeatLoad=async()=>({ id:'hb_client-sync', automation:'client-sync', at:new Date(Date.now()-2*36e5).toISOString(), ok:true, note:'1 new client added, 0 left to connect by hand' });
  CL.roster=null; CL.filter='Active'; CL.picked=true;
  switchTab('clientsboard'); await clLoad(true); renderClientsBoard(); await sleep(150);
  const B=()=>document.getElementById('clBoard').innerText, CNT=document.getElementById('clCount').innerText, SL=document.getElementById('clSyncLine').innerText;
  ok('the count is live from AxisCare, like Caregivers', /3 active clients · live from AxisCare \(5 total on record\)/.test(CNT), CNT);
  ok('the client sync shows when it last ran and what it did', /Client sync from AxisCare: last ran/.test(SL) && /1 new client added/.test(SL), SL);
  ok('Active lists the Hub client AND the AxisCare clients the Hub does not have yet', /Tess Current/.test(B()) && /Dan Testnew/.test(B()) && /Bob Testgoesby/.test(B()) && !/Pat Ended|Olga/.test(B()), B());
  ok('Dan is never invisible: Not connected yet, with what happens next', /Not connected yet/.test(B()) && /In AxisCare, not in the Hub yet · connects on the next sync/.test(B()) && /every 6 hours/.test(document.getElementById('clBoard').innerHTML), B());
  ok('care level comes from AxisCare', /Tess Current[\s\S]*Level 2/.test(B()) && /Dan Testnew[\s\S]*Level 3/.test(B()), B());
  const pills=[...document.querySelectorAll('#clFilters .filter-pill')].map(b=>b.innerText.replace(/\s+/g,' ').trim());
  ok('filters include Active, Past and Not connected yet (with counts)', pills.includes('Active 3') && pills.includes('Past 2') && pills.includes('Not connected yet 2'), pills);
  CL.filter='Needs something'; renderClientsBoard();
  ok('Needs something includes the not-connected clients', /Dan Testnew/.test(B()), B());
  CL.filter='Past'; renderClientsBoard();
  const pastRow=[...document.querySelectorAll('#clBoard tr')].find(t=>/Olga Longgone/.test(t.innerText));
  ok('Past shows Hub past clients and AxisCare-only past clients (read, not kept)', /Pat Ended/.test(B()) && !!pastRow && /Deceased in AxisCare · not kept in the Hub/.test(pastRow.innerText), B());
  ok('an AxisCare-only past client opens in AxisCare, not a Hub profile', !!pastRow && !!pastRow.querySelector('a[href*="clients-profile.php&id=104"]') && !pastRow.querySelector('[data-open-client]'), pastRow&&pastRow.innerHTML.slice(0,400));
  CL.filter='Active'; clSearchGo('olga'); await sleep(300);
  ok('search finds anyone, current or past, whatever the filter', /Olga Longgone/.test(B()) && !/Tess Current/.test(B()), B());
  clSearchGo('bob'); await sleep(300);
  ok('search knows the name they go by', /Bob Testgoesby/.test(B()), B());
  clSearchGo('zzz'); await sleep(300);
  ok('no match says so', /No client by that name in the Hub or AxisCare/.test(B()), B());
  document.getElementById('clSearch').value=''; clSearchGo(''); await sleep(300);
  let opened=null; const oo=window.openClient; window.openClient=(seed,tab)=>{ opened={ seed, tab }; };
  const dan=[...document.querySelectorAll('#clBoard a')].find(a=>/Dan Testnew/.test(a.innerText)); dan&&dan.click();
  window.openClient=oo;
  ok('a not-connected client opens the one client profile, named as AxisCare names them', opened && opened.seed.ax==='103' && opened.seed.r.client_name==='Dan Testnew', opened);
  ok('a connected client still opens the usual way', !!document.querySelector('#clBoard [data-open-client="101"]'));
  window.clCensusLoad=async()=>{ throw new Error('AxisCare responded 503 on page 1'); };
  CL.census=null; await clLoad(true); renderClientsBoard();
  ok('if AxisCare is down it says so, and still shows who the Hub knows', /Couldn't reach AxisCare/.test(document.getElementById('clCount').innerText) && /Tess Current/.test(B()), document.getElementById('clCount').innerText);
  window.clBeatLoad=async()=>({ automation:'client-sync', at:new Date(Date.now()-30*36e5).toISOString(), ok:true });
  await clLoad(true); renderClientsBoard();
  ok('a sync that stopped running shows red', /should run every 6 hours/.test(document.getElementById('clSyncLine').innerText) && /font-weight:700/.test(document.getElementById('clSyncLine').innerHTML));
  return R; }"""
with sync_playwright() as pw:
    sys.path.insert(0, HERE)
    from clock_pin import pin
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1280, 'height': 1000}); errs = []
    pin(pg)
    pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    pg.goto(f'http://localhost:{PORT}/index.html?proof=cdir'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T)
    pg.evaluate("""async()=>{ window.clCensusLoad=async()=>({ total:5, clients:[
      { id:'101', first:'Tess', last:'Current', active:true, classes:['Level 2'] }, { id:'102', first:'Pat', last:'Ended', active:false, status_label:'Discharged', classes:[] },
      { id:'103', first:'Dan', last:'Testnew', active:true, classes:['Level 3'] }, { id:'104', first:'Olga', last:'Longgone', active:false, status_label:'Deceased', classes:[] },
      { id:'105', first:'Robert', last:'Testgoesby', goes_by:'Bob', active:true, classes:[] } ] });
      window.clBeatLoad=async()=>({ automation:'client-sync', at:new Date(Date.now()-2*36e5).toISOString(), ok:true, note:'1 new client added, 0 left to connect by hand' });
      CL.filter='Active'; await clLoad(true); renderClientsBoard(); window.scrollTo(0,0); }""")
    pg.wait_for_timeout(300)
    pg.screenshot(path=os.environ.get('SHOT', '/tmp/client_directory.png'), full_page=False)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

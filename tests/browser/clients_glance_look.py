"""Clients at a glance (Samantha 2026-11-05: the plan she approved with nine refinements). The real Hub page, offline,
made-up clients only: off by default (current list, owner preview link); the preview shows five tiles, one check-ins and
plan reviews line (no record vs overdue), labeled columns, Check with AxisCare, Needs you (who has it, how long),
call-offs split by how they ended, and the coverage chart. Hours reconcile across tiles, chart and rows; an open square
lists its visits and goes to Coverage. Saves screenshots to SHOTS (default /tmp/clg_*.png).
(python3 tests/browser/clients_glance_look.py; serves this checkout itself)"""
import re, os, sys, threading, functools, http.server, socketserver
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
STUB = re.search(r'STUB = r"""(.*?)"""', open(os.path.join(HERE, 'standup_look.py')).read(), re.S).group(1)
SHOTS = os.environ.get('SHOTS', '/tmp/clg_')
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
H = functools.partial(Quiet, directory=ROOT)
srv = socketserver.TCPServer(('127.0.0.1', 0), H); PORT = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
SETUP = r"""async()=>{
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha Troutman' };"); CC_ROLES=['owner_admin']; CC_ROLES_CHECKED=true; CC_ROLE_BY_EMAIL['samantha@mo-care.com']=['owner_admin'];
  window.ccIsOwner=()=>/samantha/.test(ME.email);
  try{ localStorage.removeItem('clGlance'); }catch(e){}
  const T0=covChicagoToday(), d=n=>CLG._.addDays(T0,n), ago=n=>new Date(Date.now()-n*864e5).toISOString();
  DATA.ops_settings=Object.assign({}, DATA.ops_settings||{}, { clients_glance_live:false }); delete DATA.ops_settings.not_client_ax;
  DATA.client_checkins=[
    { client_name:'Rose Example', axiscare_client_id:'201', checkin_date:ago(2).slice(0,10), next_checkin_due:d(20), escalated:true, concerns_raised:'Says she nearly fell in the bathroom', coordinator:'Krys Office' },
    { client_name:'June Testcase', axiscare_client_id:'203', checkin_date:ago(40).slice(0,10), next_checkin_due:ago(5).slice(0,10), coordinator:'Krys Office' } ];
  DATA.care_plan_reviews=[{ axiscare_client_id:'202', at:ago(10), next_due:d(80), kind:'review' }];
  DATA.staffing_tasks=[{ id:'t1', axiscare_client_id:'201', status:'open', message:'Daughter asks to move the Tuesday visit to Wednesday', from_name:'Ann (daughter)', created_at:ago(2) }];
  DATA.coverage_cases=[
    { id:'c1', client:'Rose Example', client_axiscare_id:'201', status:'resolved', resolved_how:'covered', opened_at:ago(6) },
    { id:'c2', client:'Rose Example', client_axiscare_id:'201', status:'done', resolved_how:'uncovered', opened_at:ago(9) },
    { id:'c3', client:'Hank Sample', client_axiscare_id:'202', status:'needs_outcome', opened_at:ago(4) },
    { id:'c4', client:'June Testcase', client_axiscare_id:'203', status:'open', opened_at:ago(0.2), axiscare_visit_id:'v-j1', shift_date:d(4), shift_time:'9a-11a' },
    { id:'c5', client:'Hank Sample', client_axiscare_id:'202', status:'dismissed', opened_at:ago(3) },
    { id:'c6', client:'Hank Sample', client_axiscare_id:'202', status:'resolved', resolved_how:'covered', opened_at:ago(45) } ];
  window.CJ_PAUSED=[{ axiscare_client_id:'207', followup_date:d(14) }];
  const HUB=[{ axiscare_client_id:'201', client_name:'Rose Example', role_status:'active', person_id:'p201' },
    { axiscare_client_id:'202', client_name:'Hank Sample', role_status:'active', person_id:'p202' },
    { axiscare_client_id:'203', client_name:'June Testcase', role_status:'active', person_id:'p203' },
    { axiscare_client_id:'205', client_name:'Gus Mismatch', role_status:'active', person_id:'p205' },
    { axiscare_client_id:'206', client_name:'Ida Ended', role_status:'former', end_reason:'moved', person_id:'p206' },
    { axiscare_client_id:'207', client_name:'Paula Paused', role_status:'active', person_id:'p207' }];
  const CEN={ total:7, clients:[
    { id:'201', first:'Rose', last:'Example', active:true, status_label:'Active', classes:['Level 3'] },
    { id:'202', first:'Hank', last:'Sample', active:true, status_label:'Active', classes:['Level 2'] },
    { id:'203', first:'June', last:'Testcase', active:true, status_label:'Active', classes:['Level 1'] },
    { id:'204', first:'Walt', last:'Pretend', active:true, status_label:'Active', classes:['Level 1'] },
    { id:'205', first:'Gus', last:'Mismatch', active:false, status_label:'Deceased', classes:['Level 2'] },
    { id:'206', first:'Ida', last:'Ended', active:true, status_label:'Active', classes:['Level 1'] },
    { id:'207', first:'Paula', last:'Paused', active:false, status_label:'Hold', classes:['Level 1'] } ] };
  window.cl360Roster=async()=>HUB.map(x=>Object.assign({},x));
  window.clCensusLoad=async()=>CEN;
  window.clLoadIssues=async()=>[{ id:'i1', client_person_id:'p202', axiscare_client_id:'202', summary:'Family upset about a late arrival', state:'open', urgency:'normal', owner:'Krys Office', waiting_on:'a call back from the son', reported_at:ago(3) }];
  window.clBeatLoad=async()=>({ automation:'client-sync', at:new Date(Date.now()-2*36e5).toISOString(), ok:true, note:'0 new clients added' });
  /* the AxisCare week: Rose 4 h + an open 10 pm to 6 am + 4 h; Hank 8 pm to 8 am + 4 h; June an open 2 h (its case is c4) */
  const V=(id,day,time,end,cl,cid,cg,cgid)=>({ visit_id:id, date:d(day), time, end, client:cl, client_id:cid, caregiver:cg, caregiver_id:cgid||'' });
  Object.assign(CLG._.ST, { start:T0, at:Date.now(), err:'', loading:false, rows:[
    V('v-r1',0,'08:00','12:00','Rose Example','201','Pat Helper','1'), V('v-r2',0,'22:00','06:00','Rose Example','201',null), V('v-r3',1,'10:00','14:00','Rose Example','201','Pat Helper','1'),
    V('v-h1',2,'20:00','08:00','Hank Sample','202','Lee Helper','2'), V('v-h2',3,'09:00','13:00','Hank Sample','202','Lee Helper','2'), V('v-h3',3,'14:00','16:00','Hank Sample','202','Pat Helper','1'),
    V('v-j1',4,'09:00','11:00','June Testcase','203',null), V('v-x',0,'00:00','06:00','Rose Example','201','Pat Helper','1') ] });
  CL.roster=null; CL.filter='Active'; CL.picked=true;
  switchTab('clientsboard'); await clLoad(true); renderClientsBoard();
}"""
T = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const B=()=>document.getElementById('clBoard').innerText, G=()=>(document.getElementById('clGlance')||{}).innerText||'';
  await sleep(150);
  ok('off: the current list, no tiles', !document.querySelector('.clg-tile') && /Narrow down/.test(document.getElementById('clFilters').innerText));
  ok('off: the owner sees a preview link', /Preview the new Clients look/.test(document.getElementById('clCount').innerText), document.getElementById('clCount').innerText);
  CLG.preview(true); await sleep(200);
  const tiles=[...document.querySelectorAll('.clg-tile')].map(t=>t.innerText.replace(/\s+/g,' ').trim());
  ok('preview: five tiles', tiles.length===5, tiles);
  ok('Active clients: AxisCare\'s count, by level', /^Active clients 5 in AxisCare · L1 3 · L2 1 · L3 1/.test(tiles[0]), tiles[0]);
  ok('Hours: 36 h scheduled, 26 h with a caregiver, 10 h open, 72% (the midnight-to-6 visit is last week\'s night)', /Hours of care, next 7 days 36 h 26 h with a caregiver · 10 h open · 72%/.test(tiles[1]), tiles[1]);
  ok('Open visits: 2, 10 h, 2 clients', /Open visits, next 7 days 2 10 h · 2 clients/.test(tiles[2]), tiles[2]);
  ok('Call-offs: 4 in 30 days, split covered / missed care / no outcome / still open (dismissed and 45-day-old left out)', /Call-offs, last 30 days 4 1 covered · 1 missed care · 1 no outcome yet · 1 still open/.test(tiles[3]), tiles[3]);
  ok('Needs you: 3', /^Needs you 3/.test(tiles[4]), tiles[4]);
  ok('one line for check-ins and plan reviews: no record is not overdue', /Check-ins: 1 no record yet · 1 overdue · 0 due this week/.test(G()) && /Plan reviews: 2 no record yet · 0 overdue · 0 due this week/.test(G()), G());
  ok('no repeating "no check-in yet" or "first plan review needed" chips on rows', !/no check-in yet|first plan review needed/.test(B()), B());
  ok('a real overdue check-in still shows on its row', [...document.querySelectorAll('#clBoard tr')].some(t=>/June Testcase/.test(t.innerText)&&/check-in overdue since/.test(t.innerText)));
  const pills=[...document.querySelectorAll('#clFilters .filter-pill')].map(b=>b.innerText.replace(/\s+/g,' ').trim());
  ok('views: Active 5 (matches AxisCare), Paused 1, Past, Check with AxisCare 2, Coverage chart button', pills.includes('Active 5') && pills.includes('Paused 1') && pills.includes('Check with AxisCare 2') && pills.includes('Coverage chart') && pills.some(p=>/^Past/.test(p)), pills);
  const hd=[...document.querySelectorAll('#clBoard th')].map(t=>t.innerText.trim().toLowerCase());
  ok('labeled columns', JSON.stringify(hd)===JSON.stringify(['client','care level','next 7 days','main caregiver this week','call-offs, 30 days','open or due']), hd);
  const row=n=>([...document.querySelectorAll('#clBoard tbody tr')].find(t=>t.innerText.includes(n))||{}).innerText||'';
  ok('Rose: 16 h scheduled, 8 h covered, 8 h open, 50%', /16 h scheduled/.test(row('Rose')) && /8 h covered · 8 h open · 50%/.test(row('Rose')), row('Rose'));
  ok('Hank: 18 h, all covered, 100%; main caregiver Lee 16 h and 1 other', /18 h scheduled/.test(row('Hank')) && /18 h covered · 0 h open · 100%/.test(row('Hank')) && /Lee Helper 16 h/.test(row('Hank')) && /and 1 other/.test(row('Hank')), row('Hank'));
  ok('June: 2 h, all open, main caregiver no one yet', /2 h scheduled/.test(row('June')) && /0 h covered · 2 h open · 0%/.test(row('June')) && /no one yet/.test(row('June')), row('June'));
  ok('Rose call-offs: 1 missed care, 1 covered', /1 missed care/.test(row('Rose')) && /1 covered/.test(row('Rose')), row('Rose'));
  ok('Hank call-offs: 1 no outcome yet', /1 no outcome yet/.test(row('Hank')) && !/covered/.test(row('Hank').split('Lee')[1]||''), row('Hank'));
  ok('Ida: on Active (AxisCare active), flagged for checking', /Care ended in the Hub · still active in AxisCare/.test(row('Ida')), row('Ida'));
  ok('Walt (not connected yet) is on Active, never invisible', /Not connected yet/.test(row('Walt')));
  /* reconcile: tiles = sum of rows = sum of chart squares */
  const rowsH=[...document.querySelectorAll('#clBoard tbody tr')].map(t=>{ const m=/([\d.]+) h scheduled/.exec(t.innerText); return m?+m[1]:0; }).reduce((a,b)=>a+b,0);
  const rowsOpen=[...document.querySelectorAll('#clBoard tbody tr')].map(t=>{ const m=/([\d.]+) h open/.exec(t.innerText); return m?+m[1]:0; }).reduce((a,b)=>a+b,0);
  ok('the rows add up to the tile: 36 h scheduled, 10 h open', rowsH===36 && rowsOpen===10, [rowsH, rowsOpen]);
  ok('no "hours don\'t add up" warning', !/don't add up/.test(G()));
  window.__shot='tiles';
  return R; }"""
CHART = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  CLG.panelGo('coverage'); await sleep(150);
  const cells=[...document.querySelectorAll('.clg-gc')];
  const num=s=>{ const m=/^([\d.]+) h/.exec(s); return m?+m[1]:0; };
  const sum=cells.reduce((a,c)=>a+num(c.innerText),0), open=cells.reduce((a,c)=>{ const m=/([\d.]+) h open/.exec(c.innerText); return a+(m?+m[1]:0); },0);
  ok('chart: 28 squares (7 days by 4 blocks)', cells.length===28, cells.length);
  ok('chart squares add up to the tile: 36 h, 10 h open', sum===36 && open===10, [sum, open]);
  const night0=cells[3*7+0].innerText.replace(/\s+/g,' ');
  ok('Rose\'s open 10 pm to 6 am sits whole on day 1\'s Overnight', /^8 h 8 h open/.test(night0), night0);
  const ev2=cells[2*7+2].innerText, ov2=cells[3*7+2].innerText, mo3=cells[0*7+3].innerText;
  ok('Hank\'s 8 pm to 8 am splits: 2 h Evening, 8 h Overnight, 2 h next Morning (+ 3 h of the 9 am visit = 5 h)', /^2 h/.test(ev2) && /^8 h/.test(ov2) && /^5 h/.test(mo3), [ev2, ov2, mo3]);
  cells[3*7+0].click(); await sleep(120);
  let P=document.querySelector('.clg-panel').innerText;
  ok('an open square lists its visits: Rose, 10 pm to 6 am, Open, 8 h', /Rose Example/.test(P) && /10 pm to 6 am/.test(P) && /Open/.test(P), P.slice(-400));
  ok('...with a way into Coverage (no case yet: Start a coverage case)', /Start a coverage case/.test(P));
  window.__shot='chart';
  return R; }"""
COV = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const before=(DATA.coverage_cases||[]).length;
  [...document.querySelectorAll('.clg-panel button')].find(b=>/Start a coverage case/.test(b.innerText)).click(); await sleep(250);
  const v=id=>(document.getElementById(id)||{}).value||'';
  ok('Start a coverage case: Coverage opens with the form filled in (client, date, time)', activeTab==='coverage' && document.getElementById('covAddBackdrop').classList.contains('open') && v('covClient')==='Rose Example' && v('covDate')===CLG._.ST.start && v('covTime')==='10 pm to 6 am', [activeTab, v('covClient'), v('covDate'), v('covTime')]);
  ok('...and nothing is saved until a person presses Open case', (DATA.coverage_cases||[]).length===before);
  covShowAdd(false); switchTab('clientsboard'); renderClientsBoard(); await sleep(100);
  CLG.cellGo(0,4); await sleep(100);
  const P=document.querySelector('.clg-panel').innerText;
  ok('June\'s open visit already has a case: Go to its coverage case', /June Testcase/.test(P) && /Go to its coverage case/.test(P), P.slice(-300));
  let shown=null; const o=window.caraShowCase; window.caraShowCase=id=>{ shown=id; };
  [...document.querySelectorAll('.clg-panel button')].find(b=>/Go to its coverage case/.test(b.innerText)).click(); await sleep(100);
  window.caraShowCase=o;
  ok('...which opens that case in Coverage', shown==='c4' && activeTab==='coverage', [shown, activeTab]);
  switchTab('clientsboard'); CLG.panelGo('coverage'); renderClientsBoard(); await sleep(80);
  return R; }"""
NEEDS = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  CLG.pick('needs'); await sleep(120);
  const rows=[...document.querySelectorAll('.clg-panel tbody tr')].map(t=>t.innerText.replace(/\s+/g,' '));
  ok('Needs you lists 3 items, oldest first', rows.length===3 && /Hank Sample/.test(rows[0]), rows);
  ok('a concern: who has it, what it waits on, how long', rows.some(r=>/Family upset about a late arrival/.test(r) && /Krys Office/.test(r) && /waiting on a call back from the son/.test(r) && /3 days/.test(r)), rows);
  ok('a family request: Staffing has it, who asked, 2 days', rows.some(r=>/Family request: Daughter asks/.test(r) && /Staffing/.test(r) && /asked by Ann \(daughter\)/.test(r) && /2 days/.test(r)), rows);
  ok('an escalated check-in: the coordinator has it', rows.some(r=>/Check-in escalated: Says she nearly fell/.test(r) && /Krys Office/.test(r)), rows);
  window.__shot='needs';
  return R; }"""
MORE = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const B=()=>document.getElementById('clBoard').innerText;
  CLG.pick('needs'); CLG.panelGo('records'); await sleep(100);
  const P=document.querySelector('.clg-panel').innerText;
  ok('Review the list: no record yet vs overdue, by client', /No record yet" means nothing has been saved/.test(P) && /June Testcase[\s\S]*check-in overdue since/.test(P) && /Hank Sample\s+no record yet\s+up to date/.test(P), P);
  CLG.panelGo('records'); CLG.pick('open'); await sleep(100);
  ok('Open visits tile: Rose and June, most open hours first', /Rose Example[\s\S]*June Testcase/.test(B()) && !/Hank Sample/.test(B()), B());
  CLG.pick('calloff'); await sleep(100);
  const names=[...document.querySelectorAll('#clBoard tbody tr a[data-open-client]')].map(a=>a.innerText);
  ok('Call-offs tile: missed care first (Rose), then the rest', names[0]==='Rose Example' && names.includes('Hank Sample') && names.includes('June Testcase'), names);
  CLG.pick('calloff'); CL.filter='Check with AxisCare'; renderClientsBoard(); await sleep(100);
  ok('Check with AxisCare: Gus (Deceased in AxisCare) and Ida, and says nothing changes by itself', /Gus Mismatch/.test(B()) && /Deceased in AxisCare/.test(B()) && /Ida Ended/.test(B()) && /Nothing changes by itself/.test(B()) && !/Rose/.test(B()), B());
  window.__shot='recon';
  return R; }"""
FINAL = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const up=document.getElementById('clgUpkeep');
  ok('upkeep lines moved under the list', !!up && up.contains(document.getElementById('clSyncLine')));
  ok('no status changed by itself', CL.roster.find(r=>r.axiscare_client_id==='205').role_status==='active' && CL.roster.find(r=>r.axiscare_client_id==='206').role_status==='former');
  CL.filter='Active'; CLG.preview(false); await sleep(100);
  ok('preview off: the current list is back, upkeep back on top', !document.querySelector('.clg-tile') && /Narrow down/.test(document.getElementById('clFilters').innerText) && document.getElementById('clSyncLine').nextElementSibling.id==='clGlance');
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal' };"); CC_ROLES=['coordinator'];
  renderClientsBoard(); await sleep(80);
  ok('a coordinator gets no preview link', !/Preview the new/.test(document.getElementById('clCount').innerText));
  DATA.ops_settings.clients_glance_live=true; renderClientsBoard(); await sleep(120);
  ok('switch on: a coordinator sees the tiles, no preview banner', document.querySelectorAll('.clg-tile').length===5 && !document.querySelector('.clg-pv'));
  CLG._.ST.rows=null; CLG._.ST.err='AxisCare responded 503'; renderClientsBoard(); await sleep(80);
  ok('if the schedule can\'t load it says so, with try again', /couldn't load: AxisCare responded 503/.test(document.getElementById('clGlance').innerText) && /try again/.test(document.getElementById('clGlance').innerText));
  return R; }"""
R = []
with sync_playwright() as pw:
    sys.path.insert(0, HERE)
    from clock_pin import pin
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1360, 'height': 1000}); errs = []
    pin(pg)
    pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    pg.goto(f'http://127.0.0.1:{PORT}/index.html?proof=clg'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    pg.evaluate(SETUP)
    def shot(name, sel=None):
        pg.evaluate("window.scrollTo(0,0)"); pg.wait_for_timeout(200)
        el = pg.query_selector(sel) if sel else None
        (el.screenshot if el else functools.partial(pg.screenshot, full_page=True))(path=SHOTS + name + '.png')
    for step, name, sel in [(T, 'tiles', '#tab-clientsboard'), (CHART, 'chart', '#tab-clientsboard'), (COV, None, None), (NEEDS, 'needs', '#tab-clientsboard'), (MORE, 'recon', '#tab-clientsboard'), (FINAL, None, None)]:
        R += pg.evaluate(step)
        if name: shot(name, sel)
    pg.set_viewport_size({'width': 400, 'height': 900})
    pg.evaluate("()=>{ (0,eval)(\"ME={ email:'samantha@mo-care.com', name:'Samantha Troutman' };\"); CC_ROLES=['owner_admin']; CLG._.ST.err=''; CL.roster=null; switchTab('clientsboard'); }")
    pg.evaluate(SETUP); pg.evaluate("()=>{ CLG.preview(true); }"); pg.wait_for_timeout(300)
    w = pg.evaluate("()=>document.documentElement.scrollWidth")
    R.append(['PASS' if w <= 410 else 'FAIL', 'phone width: the page does not scroll sideways (tables scroll inside their box)', w])
    shot('phone', '#tab-clientsboard')
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
srv.shutdown()
for r in R: print(r[0], '·', r[1], ('→ ' + str(r[2])) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

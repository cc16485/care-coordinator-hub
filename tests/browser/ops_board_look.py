"""Operations Board (Samantha 2026-11-05: "Approved with your six recommendations. Build it switched off, in practice
mode."). The real Hub page, offline, MADE-UP people only. Practice: owners get "Operations Board (practice)" as the first
My Work tab, coordinators see nothing new. The table: columns, what it opens on (mine + care nobody has), tiles, menus,
Do it opening the card itself, Take it, approvals as rows, Board cleanup with Undo. On: the board is the only tab and opens
first, the menu says Operations Board, older views for a week. Saves screenshots to SHOTS (default /tmp/opb_*.png).
(python3 tests/browser/ops_board_look.py; serves this checkout)"""
import re, os, sys, threading, functools, http.server, socketserver
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
STUB = re.search(r'STUB = r"""(.*?)"""', open(os.path.join(HERE, 'standup_look.py')).read(), re.S).group(1)
SHOTS = os.environ.get('SHOTS', '/tmp/opb_')
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.TCPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=ROOT)); PORT = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
SETUP = r"""async(mode)=>{
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  const owner = mode!=='staff';
  (0,eval)(owner ? "ME={ email:'samantha@mo-care.com', name:'Samantha Troutman' };" : "ME={ email:'krystal@mo-care.com', name:'Krystal Smith' };");
  CC_ROLES = owner ? ['owner_admin'] : ['care_coordinator']; CC_ROLES_CHECKED=true;
  window.ccIsOwner=()=>/samantha/.test(ME.email);
  window.ccActor=()=>({ email:ME.email, name:ME.name });
  window.opsMeKey=()=>ME.email;
  try{ ['opbF','mwtLastClear'].forEach(k=>localStorage.removeItem(k)); }catch(e){}
  Object.assign(OPB.state, { tile:'', open:'', clean:false, appr:false, started:false, older:false, f:{ when:'', who:'', need:'', owner:'start' } });
  if(window.MWTidy) MWTidy.state.last=null;
  DATA.ops_settings=Object.assign({}, DATA.ops_settings||{}, { ops_board_live: mode==='live', ops_board_live_since: mode==='live'?new Date(Date.now()-2*864e5).toISOString():undefined, cc_followups_live:false, mywork_tidy_live: mode==='tidy' });
  const ago=h=>new Date(Date.now()-h*36e5).toISOString(), ahead=h=>new Date(Date.now()+h*36e5).toISOString();
  const S='samantha@mo-care.com', K='krystal@mo-care.com';
  DATA.ops_items=[
    { id:'t_care', kind:'care_note', status:'open', urgency:'urgent', domain:'client_care', level:'red', owner:K, about:'Example: Ruth P.', title:'Red flag: fell in the bathroom', detail:'Helped her sit up, no injury.', client_ax:'1', created_at:ago(1), due:ahead(1) },
    { id:'t_cov', kind:'coverage', status:'open', urgency:'urgent', domain:'scheduling_coverage', owner:'', about:'Example: Harold B.', title:'Open shift tomorrow 8 to 12, nobody on it', created_at:ago(3), due:ahead(2) },
    { id:'t_call', kind:'call_followup', status:'open', urgency:'today', domain:'money', owner:S, caregiver_ax:'7', about:'Example: Dana W.', title:'Call back about mileage for 11-04', created_at:ago(5), due:ahead(1) },
    { id:'t_old', kind:'call_followup', status:'open', urgency:'normal', domain:'program_administration', owner:S, about:'Example: Old call', title:'Send the form she asked for', created_at:ago(24*12), due:ago(24*10) },
    { id:'cfp_keep', kind:'call_followup', status:'open', urgency:'normal', domain:'program_administration', owner:S, about:'Example: A promise', title:'Call her back Friday as promised', created_at:ago(24*12), due:ago(24*10) },
    { id:'t_stale', kind:'call_followup', status:'open', urgency:'urgent', domain:'scheduling_coverage', owner:S, about:'(phone lead)', title:'Open a call-off for an old visit', created_at:ago(24*21), due:ago(24*21) },
    { id:'t_req', kind:'request', status:'open', urgency:'normal', owner:'', about:'Example: Office request', title:'Order more gloves', created_at:ago(30), due:ahead(30) },
    { id:'t_later', kind:'request', status:'open', urgency:'normal', owner:S, sub_state:'waiting', check_back:new Date(Date.now()+3*864e5).toISOString().slice(0,10), about:'Example: Waiting on a fax', title:'Fax from the doctor', created_at:ago(24), due:ago(2) },
    { id:'t_k', kind:'confirm_times', status:'open', urgency:'today', domain:'client_care', owner:K, about:'Example: Tom R.', title:'Confirm times', created_at:ago(6), due:ago(2) }
  ];
  window.discMayApproveAny=()=>owner; window.discForMe=()=>owner?[{ id:'d1', caregiver:'Example: Lee M.', level:'Written warning', reason:'Late three times', status:'pending_approval', created_at:ago(4) }]:[];
  window.persist=async()=>{}; window.opEvent=()=>{}; window.ccToast=()=>{};
  /* offline: no server refresh of the cards (it would replace these made-up ones) */
  window.ccOpsRefresh=()=>{}; window.ccRecentFetch=async()=>{}; try{ CC_RECENT.tried=Date.now(); }catch(e){}
  switchTab('mywork'); myWorkGo('today'); await new Promise(r=>setTimeout(r,80));
  return true;
}"""
T = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const tabs=()=>myWorkTabs(myWorkBuckets()).map(t=>t[0]+':'+t[1]);
  ok('practice, owner: "Operations Board (practice)" is the first tab, the others are all still there', tabs()[0]==='board:Operations Board (practice)' && tabs().some(t=>/^today:/.test(t)) && tabs().some(t=>/^approvals:/.test(t)), tabs());
  ok('practice: My Work still opens on Today', MYWORK_TAB==='today');
  myWorkGo('board'); await sleep(80);
  const W=()=>document.getElementById('myWorkWrap').innerText;
  ok('the practice banner', /Practice, switched off/.test(W()) && /Owners Hub Admin page/.test(W()), W().slice(0,200));
  const heads=[...document.querySelectorAll('.opb thead th')].map(x=>x.innerText.trim());
  ok('the columns', JSON.stringify(heads)===JSON.stringify(['Who','What came in','Need','Owner','When','Waiting','Do it','Move it','Done']), heads);
  const rows=()=>[...document.querySelectorAll('.opb tbody tr[data-id]')];
  const ids=()=>rows().map(r=>r.getAttribute('data-id'));
  ok('opens on mine + care nobody has: the approval, the open shift, my calls, my waiting card; not Krystal\'s, not nobody\'s gloves', JSON.stringify(ids().slice().sort())===JSON.stringify(['appr_d1','cfp_keep','t_call','t_cov','t_later','t_old','t_stale']), ids());
  ok('care or safety first, then the approval; waiting card last', ids()[0]==='t_cov' && ids()[1]==='appr_d1' && ids()[ids().length-1]==='t_later', ids());
  ok('red edge on care or safety, gold on today', /opb-red/.test(rows()[0].className) && /opb-gold/.test(rows()[2].className));
  const cov=rows()[0].innerText;
  ok('nobody\'s open shift: Take it in Owner, Find cover in Do it, Care or safety', /Take it/.test(cov) && /Find cover/.test(cov) && /Care or safety/.test(cov), cov);
  const tiles=[...document.querySelectorAll('.opb-tile')].map(t=>t.innerText.replace(/\s+/g,' ').trim());
  ok('tiles: 2 care or safety, Yours 5, Nobody\'s yet 2', /^2 Care or safety/.test(tiles[0]) && /^6 Yours/.test(tiles[1]) && /^2 Nobody's yet/.test(tiles[4]), tiles);
  ok('the tab badge counts care that is mine or nobody\'s', /subtab-badge red">1</.test(myWorkTabBadge('board',{})), myWorkTabBadge('board',{}));
  window.__shot='board';
  return R; }"""
ACT = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const rows=()=>[...document.querySelectorAll('.opb tbody tr[data-id]')], ids=()=>rows().map(r=>r.getAttribute('data-id'));
  OPB.tile('care'); await sleep(40);
  ok('Care or safety tile: Krystal\'s red flag and the open shift', JSON.stringify(ids().sort())===JSON.stringify(['t_care','t_cov']), ids());
  OPB.tile('nobody'); await sleep(40);
  ok('Nobody\'s yet: the open shift and the gloves', JSON.stringify(ids().sort())===JSON.stringify(['t_cov','t_req']), ids());
  OPB.tile('nobody'); OPB.set('owner',''); await sleep(40);
  ok('Owner: Everyone shows the whole office (9 cards + 1 approval)', rows().length===10, ids());
  ok('the menus are remembered', JSON.parse(localStorage.getItem('opbF')).owner==='');
  OPB.set('who','caregiver'); await sleep(40);
  ok('Who: Caregiver', ids().includes('t_call') && !ids().includes('t_req'), ids());
  OPB.reset(); await sleep(40);
  ok('Back to mine + care nobody has', rows().length===7);
  [...rows().find(r=>r.getAttribute('data-id')==='t_call').querySelectorAll('button')].find(b=>b.innerText==='See the call').click(); await sleep(60);
  const card=document.querySelector('.opb-card .wkcard[data-id="t_call"]');
  ok('Do it opens the card itself under the row, with its own buttons', !!card && /Done/.test(card.innerText) && /Hand off/.test(card.innerText), card&&card.innerText.slice(0,200));
  OPB.toggle('t_call'); await sleep(40);
  ok('Close folds it again', !document.querySelector('.opb-card'));
  OPB.approvals(); await sleep(60);
  ok('Review on the approval opens the approvals card on the board', document.getElementById('myWorkApprovals').style.display==='' && MYWORK_TAB==='board');
  ok('owners see the Board cleanup line with the count (1: the 10-day-old call, not the promise)', /1 open card is more than 7 days past its day/.test(document.getElementById('myWorkWrap').innerText), document.getElementById('myWorkWrap').innerText.slice(0,600));
  OPB.cleanOpen(); await sleep(40);
  ok('Board cleanup asks first and says what it never touches', /Board cleanup: clear 1 old card\?/.test(document.getElementById('myWorkWrap').innerText) && /Never care or safety, never a promise made on a call/.test(document.getElementById('myWorkWrap').innerText));
  await OPB.cleanGo(); await sleep(60);
  const o=DATA.ops_items.find(i=>i.id==='t_old'), p=DATA.ops_items.find(i=>i.id==='cfp_keep');
  ok('Clear them: the old card closes with "Board cleanup", the promise stays open', o.status==='done' && o.close_reason==='Board cleanup' && o.resolution_code==='cleared' && p.status==='open', [o.status,o.close_reason,p.status]);
  ok('Undo is offered', /Board cleanup cleared 1 card/.test(document.getElementById('myWorkWrap').innerText) && /Undo/.test(document.getElementById('myWorkWrap').innerText));
  await OPB.undo(); await sleep(60);
  ok('Undo reopens it', DATA.ops_items.find(i=>i.id==='t_old').status==='open');
  ok('after many redraws the board still has its look (style kept in the page head)', !!document.head.querySelector('#opbCss') && getComputedStyle(document.querySelector('.opb-tiles')).display==='grid' && getComputedStyle(document.querySelector('.opb-menus')).display==='flex');
  ok('an urgent card three weeks late is not in the red tile', !rows().some(r=>r.getAttribute('data-id')==='t_stale' && /opb-red/.test(r.className)));
  ok('"(phone lead)" shows as Name not on file', /Name not on file/.test(document.getElementById('myWorkWrap').innerText) && !/\(phone lead\)/.test(document.getElementById('myWorkWrap').innerText));
  ok('no em dash on the board', !document.getElementById('myWorkWrap').innerText.includes('—'));
  return R; }"""
STAFF = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]);
  const t=myWorkTabs(myWorkBuckets()).map(x=>x[0]);
  ok('practice, coordinator: no board tab, My Work as before', t.indexOf('board')===-1 && MYWORK_TAB==='today', t);
  ok('practice: the menu still says My Work', /My Work/.test(document.querySelector('.fpill[data-parent="myworkgrp"]').innerText));
  return R; }"""
LIVE = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  renderMyWork(); await sleep(60);
  ok('on, coordinator: opens on the board', MYWORK_TAB==='board' && !!document.querySelector('.opb'));
  ok('on: the board is the only tab', JSON.stringify(myWorkTabs(myWorkBuckets()).map(x=>x[0]))==='["board"]');
  ok('on: the menu and the heading say Operations Board', /Operations Board/.test(document.querySelector('.fpill[data-parent="myworkgrp"]').innerText) && document.querySelector('#tab-mywork h2').innerText==='Operations Board' && CC_SUBTABS.myworkgrp[0].l==='Operations Board');
  ok('on: no practice banner', !/Practice, switched off/.test(document.getElementById('myWorkWrap').innerText));
  ok('on: older views for one week', /Older views, for one week/.test(document.getElementById('myWorkWrap').innerText));
  ok('on, coordinator: opens on Krystal\'s rows plus the open shift nobody has', JSON.stringify([...document.querySelectorAll('.opb tbody tr[data-id]')].map(r=>r.getAttribute('data-id')).sort())===JSON.stringify(['t_care','t_cov','t_k']));
  ok('on, coordinator: no Board cleanup (owners only), no approvals', !/Board cleanup/.test(document.getElementById('myWorkWrap').innerText) && !/appr_/.test(document.getElementById('myWorkWrap').innerHTML));
  OPB.older('today'); await sleep(60);
  ok('an older view brings the tabs back, with the board first', MYWORK_TAB==='today' && myWorkTabs(myWorkBuckets())[0][0]==='board' && myWorkTabs(myWorkBuckets()).length>2);
  myWorkGo('board'); await sleep(40);
  DATA.ops_settings.ops_board_live_since=new Date(Date.now()-8*864e5).toISOString(); renderMyWork(); await sleep(40);
  ok('after a week the older views link is gone', !/Older views/.test(document.getElementById('myWorkWrap').innerText));
  return R; }"""
TIDY = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]);
  renderMyWork();
  const first=document.querySelector('#myWorkTabs .subtab');
  ok('with the tidier My Work on, the board tab is first, not under More', first && /Operations Board \(practice\)/.test(first.innerText), first&&first.innerText);
  return R; }"""
R = []
with sync_playwright() as pw:
    sys.path.insert(0, HERE)
    from clock_pin import pin
    b = pw.chromium.launch(); errs = []
    def page():
        pg = b.new_page(viewport={'width': 1360, 'height': 1000}); pin(pg)
        pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
        pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
        pg.goto(f'http://127.0.0.1:{PORT}/index.html?proof=opb'); pg.wait_for_timeout(1500)
        pg.evaluate('s=>(0,eval)(s)', STUB); return pg
    pg = page(); pg.evaluate(SETUP, 'practice'); R += pg.evaluate(T); print('stage T', flush=True)
    pg.evaluate("window.scrollTo(0,0)"); pg.wait_for_timeout(150); pg.screenshot(path=SHOTS + 'board.png', full_page=True)
    R += pg.evaluate(ACT); print('stage ACT', flush=True)
    pg = page(); pg.evaluate(SETUP, 'staff'); R += pg.evaluate(STAFF)
    pg = page(); pg.evaluate(SETUP, 'live'); pg.evaluate("()=>{ (0,eval)(\"ME={ email:'krystal@mo-care.com', name:'Krystal Smith' };\"); window.ccIsOwner=()=>false; window.discMayApproveAny=()=>false; }")
    R += pg.evaluate(LIVE); pg.screenshot(path=SHOTS + 'live.png', full_page=True)
    pg = page(); pg.evaluate(SETUP, 'tidy'); R += pg.evaluate(TIDY)
    pg.set_viewport_size({'width': 400, 'height': 900}); pg.evaluate("()=>{ myWorkGo('board'); }"); pg.wait_for_timeout(200)
    wv = pg.evaluate("()=>document.documentElement.scrollWidth")
    R.append(['PASS' if wv <= 410 else 'FAIL', 'phone width: the page does not scroll sideways (the table scrolls inside its box)', wv])
    pg.screenshot(path=SHOTS + 'phone.png', full_page=True)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
srv.shutdown()
for st, n, d in R: print(st + '  ' + n + ('' if st == 'PASS' else '  ' + str(d)))
print(f"{sum(1 for r in R if r[0]=='PASS')}/{len(R)} passed")
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

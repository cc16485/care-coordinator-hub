"""Operations Board, the new layout (Samantha 2026-11-07, "Approve all picks"; plan
https://claude.ai/artifact/Ep6gjjMwVNnNLMFbGMZDsg). The real Hub page, offline, MADE-UP people only.
Practice: owners see "Try the new layout" on the table, coordinators don't. The lanes: Waiting on us (one person once,
longest wait first), Care today, Batches with counts that open into a list, Open shifts next 7 days on top,
"Was it covered?" not shown, Older than a week folded, one team line for owners, Show everyone, back to the table.
On (ops_board_lanes_live): a coordinator gets the lanes with no practice banner. Phone width, no page errors.
Saves screenshots to SHOTS (default /tmp/opl_*.png). (python3 tests/browser/ops_board_lanes_look.py; serves this checkout)"""
import re, os, sys, threading, functools, http.server, socketserver
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
STUB = re.search(r'STUB = r"""(.*?)"""', open(os.path.join(HERE, 'standup_look.py')).read(), re.S).group(1)
SHOTS = os.environ.get('SHOTS', '/tmp/opl_')
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.TCPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=ROOT)); PORT = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
SETUP = r"""async(mode)=>{
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  const owner = mode!=='staff';
  (0,eval)(owner ? "ME={ email:'samantha@mo-care.com', name:'Samantha Troutman' };" : "ME={ email:'krystal@mo-care.com', name:'Krystal Smith' };");
  CC_ROLES = owner ? ['owner_admin'] : ['care_coordinator']; CC_ROLES_CHECKED=true;
  window.ccIsOwner=()=>owner;
  window.ccActor=()=>({ email:ME.email, name:ME.name });
  window.opsMeKey=()=>ME.email;
  try{ ['opbF','opbLanes','mwtLastClear'].forEach(k=>localStorage.removeItem(k)); }catch(e){}
  Object.assign(OPB.state, { tile:'', open:'', clean:false, appr:false, started:false, older:false, f:{ when:'', who:'', need:'', owner:'start' } });
  Object.assign(OPB.lanes, { who:'mine', bopen:'', oldOpen:false, week:undefined, weekAt:0, weekErr:'' });
  const live = mode==='live' || mode==='staff';
  DATA.ops_settings=Object.assign({}, DATA.ops_settings||{}, { ops_board_live:live, ops_board_live_since:live?new Date(Date.now()-2*864e5).toISOString():undefined,
    ops_board_lanes_live: mode==='staff', cc_followups_live:true });
  const ago=h=>new Date(Date.now()-h*36e5).toISOString(), ahead=h=>new Date(Date.now()+h*36e5).toISOString();
  const S='samantha@mo-care.com', K='krystal@mo-care.com';
  DATA.ops_items=[
    { id:'fu_1', kind:'reply_needed', status:'open', owner:S, contact_id:'c1', about:'Example: Linda P.', title:'Call or text back Example: Linda P.', detail:'Example: Linda P.: "Can the Thursday visit move to Friday?"', created_at:ago(19), due:ago(18) },
    { id:'fu_2', kind:'reply_needed', status:'open', owner:S, phone:'8165550142', about:'A number we do not know', title:'Call or text back a number we do not know', detail:'Missed call. No voicemail.', created_at:ago(2), due:ahead(1) },
    { id:'cf_1', kind:'call_followup', status:'open', owner:S, contact_id:'c1', about:'Example: Linda P.', title:'Text Example: Linda the new time', created_at:ago(10), due:ahead(5) },
    { id:'cf_2', kind:'call_followup', status:'open', owner:S, about:'Example: Tom R.', title:'Change the visit in AxisCare', created_at:ago(8), due:ahead(20) },
    { id:'cf_3', kind:'call_followup', status:'open', owner:K, about:'Example: Rita G.', title:'Call Example: Rita back after talking to the caregiver', created_at:ago(9), due:ahead(3) },
    { id:'cn_1', kind:'care_note', status:'open', urgency:'urgent', domain:'client_care', owner:S, about:'Example: Ellen B.', title:'Shift note: seemed more confused than usual', client_ax:'4', created_at:ago(2), due:ahead(2) },
    { id:'ops_covq_1', kind:'coverage_outcome', status:'open', urgency:'urgent', domain:'scheduling_coverage', owner:S, about:'Example: Harold J.', title:'Was it covered?', created_at:ago(30), due:ago(20) },
    { id:'fw_1', kind:'family_welcome', status:'open', owner:'', about:'Example: Family One', title:'Send the welcome', created_at:ago(5), due:ahead(10) },
    { id:'fw_2', kind:'family_welcome', status:'open', owner:'', about:'Example: Family Two', title:'Send the welcome', created_at:ago(5), due:ahead(10) },
    { id:'fw_3', kind:'family_welcome', status:'open', owner:'', about:'Example: Family Three', title:'Send the welcome', created_at:ago(5), due:ahead(10) },
    { id:'sp_1', kind:'send_problem', status:'open', owner:S, about:'Example: Walt S.', title:'The text did not go out', created_at:ago(6), due:ahead(4) },
    { id:'old_1', kind:'request', status:'open', owner:S, about:'Example: Old request', title:'Order more gloves', created_at:ago(24*20), due:ago(24*19) }
  ];
  window.discMayApproveAny=()=>owner; window.discForMe=()=>owner?[{ id:'d1', caregiver:'Example: Lee M.', level:'Written warning', reason:'Late three times', status:'pending_approval', created_at:ago(4) }]:[];
  window.persist=async()=>{}; window.opEvent=()=>{}; window.ccToast=()=>{};
  window.ccOpsRefresh=()=>{}; window.ccRecentFetch=async()=>{}; try{ CC_RECENT.tried=Date.now(); }catch(e){}
  /* the AxisCare open-shifts lookup, made up: tomorrow 8 am, and the day after tomorrow 7 pm */
  const day=n=>{ const d=new Date(Date.now()+n*864e5); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
  window.trainHubTok=async()=>'tok'; window.__osCalls=0;
  const real=window.fetch.bind(window);
  window.fetch=async(u,o)=>{ if(String(u).indexOf('axiscare-open-shifts')>=0){ /* the Care Match row (board-feeds.js) asks the same service for pairs; this counts the week card's ask only */ if(/"pairs"/.test(String(o&&o.body||''))) return new Response(JSON.stringify({ pairs:[] })); window.__osCalls++; window.__osBody=o&&o.body;
      return new Response(JSON.stringify({ open_count:2, open:[{ client:'Example: Harold J.', date:day(1), start:'8:00 AM', end:'12:00 PM', start24:'08:00' }, { client:'Example: Ruth K.', date:day(5), start:'7:00 PM', end:'11:00 PM', start24:'19:00' }] }), { headers:{ 'Content-Type':'application/json' } }); }
    return real(u,o); };
  switchTab('mywork'); myWorkGo(live ? 'board' : 'today'); await new Promise(r=>setTimeout(r,80));
  return true;
}"""
OWNER = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const W=()=>document.getElementById('myWorkWrap').innerText;
  myWorkGo('board'); await sleep(80);
  ok('the table is still the board until you try it', !!document.querySelector('.opb thead') && !document.querySelector('.opl-lane'));
  ok('owners see "Try the new layout" on the table', /Try the new layout/.test(W()), W().slice(0,400));
  OPB.lanesTry(true); await sleep(150);
  ok('Try the new layout draws the lanes and remembers it', !!document.getElementById('oplWait') && !!document.getElementById('oplCare') && !!document.getElementById('oplBatch') && localStorage.getItem('opbLanes')==='1');
  ok('practice banner: only you see it, Admin page, Back to the table', /New layout, practice/.test(W()) && /Owners Hub Admin page/.test(W()) && /Back to the table/.test(W()), W().slice(0,300));
  const ids=sel=>[...document.querySelectorAll(sel+' > .opl-row[data-id]')].map(r=>r.getAttribute('data-id'));
  ok('Waiting on us: longest wait first, one person once (the call card for the same contact moves to Batches), not Krystal\'s',
    JSON.stringify(ids('#oplWait'))===JSON.stringify(['fu_1','fu_2']), ids('#oplWait'));
  const w1=document.querySelector('#oplWait .opl-row[data-id="fu_1"]').innerText;
  ok('a Follow-ups row says what came in, Called or texted, also on a call card, and the wait in red past 12 hours',
    /^"Can the Thursday visit move/m.test(document.querySelector('#oplWait .opl-row[data-id="fu_1"] .opl-what').innerText) && /Called or texted/.test(w1) && /also on a call card/.test(w1) && !!document.querySelector('#oplWait .opl-row[data-id="fu_1"] .opl-t.long') && /Call back/.test(w1), w1);
  ok('Care today: the fresh shift-note flag', JSON.stringify(ids('#oplCare'))===JSON.stringify(['cn_1']), ids('#oplCare'));
  const tiles=[...document.querySelectorAll('.opl-tile')].map(t=>t.innerText.replace(/\s+/g,' ').trim());
  ok('tiles: 2 Waiting on us, 1 Care today, 4 Batches', /^2 Waiting on us oldest 19 h/.test(tiles[0]) && /^1 Care today/.test(tiles[1]) && /^4 Batches 7 items in all/.test(tiles[2]), tiles);
  const batches=[...document.querySelectorAll('.opl-brow')].map(b=>b.getAttribute('data-batch')+':'+b.querySelector('.n').innerText);
  ok('batches in order with counts: approvals, 3 welcomes, the send problem, 2 office to-dos from calls', JSON.stringify(batches)===JSON.stringify(['approval:1','welcome:3','send:1','calls:2']), batches);
  ok('a batch row names the first people', /Family welcomes to send/.test(W()) && /Example: Family One, Example: Family Two, Example: Family Three/.test(W()));
  OPB.batch('welcome'); await sleep(60);
  ok('Open on a batch lists its cards, each with its own buttons', document.querySelectorAll('.opl-in .opl-row').length===3 && /Take it/.test(document.querySelector('.opl-in').innerText));
  OPB.toggle('fw_1'); await sleep(60);
  ok('Do it opens the card itself under the row', !!document.querySelector('.opl-in .opl-card'));
  OPB.batch('welcome'); await sleep(40);
  ok('"Was it covered?" is not on the board, and the foot says so', !document.querySelector('[data-id="ops_covq_1"]') && /1 "Was it covered\?" question is no longer shown here/.test(W()), W().slice(-500));
  ok('the team line: Krystal 1 waiting', /Team: Krystal[^\n]* 1 waiting/.test(W()), W().slice(-500));
  ok('older than a week is folded', !document.querySelector('[data-id="old_1"]') && /Show 1 older than a week/.test(W()));
  OPB.oldToggle(); await sleep(40);
  ok('Show older lists it', !!document.querySelector('#oplOld [data-id="old_1"]'));
  OPB.lanesWho('all'); await sleep(40);
  ok('Show everyone adds Krystal\'s promise to Waiting on us', ids('#oplWait').indexOf('cf_3')>=0, ids('#oplWait'));
  OPB.lanesWho('mine'); await sleep(40);
  const wk=document.getElementById('oplWeek'), wt=wk?wk.innerText:'';
  ok('open shifts, next 7 days: one column per day, tomorrow in red, all covered days say so', document.querySelectorAll('#oplWeek .opl-day').length===7 && !!document.querySelector('#oplWeek .opl-sh.soon') && /All covered/.test(wt) && /Example: Harold J\./.test(wt) && /Example: Ruth K\./.test(wt), wt);
  ok('the week line: 2 open, 1 within 48 hours', /2 open this week/.test(wt) && /1 within 48 hours/.test(wt), wt);
  ok('it asks AxisCare for 7 days, once', window.__osCalls===1 && /"days":7/.test(window.__osBody||''), [window.__osCalls, window.__osBody]);
  ok('no em dashes anywhere on the board', !/—/.test(W()));
  window.scrollTo(0,0);
  return R; }"""
BACK = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  OPB.lanesTry(false); await sleep(60);
  ok('Back to the table', !!document.querySelector('.opb thead') && !document.querySelector('.opl-lane') && localStorage.getItem('opbLanes')==='0');
  return R; }"""
STAFF = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const W=()=>document.getElementById('myWorkWrap').innerText;
  myWorkGo('board'); await sleep(150);
  ok('switch on, coordinator: the lanes, no practice banner, no Try link, no table', !!document.getElementById('oplWait') && !/New layout, practice/.test(W()) && !/Try the new layout/.test(W()) && !document.querySelector('.opb thead'), W().slice(0,300));
  const ids=[...document.querySelectorAll('#oplWait > .opl-row[data-id]')].map(r=>r.getAttribute('data-id'));
  ok('Krystal\'s Waiting on us: her promise to call back', JSON.stringify(ids)===JSON.stringify(['cf_3']), ids);
  ok('coordinators get no team line and no See the table', !/Team:/.test(W()) && !/See the table/.test(W()));
  ok('the open shifts card is there for coordinators too', document.querySelectorAll('#oplWeek .opl-day').length===7);
  return R; }"""
R = []
with sync_playwright() as pw:
    sys.path.insert(0, HERE)
    from clock_pin import pin
    b = pw.chromium.launch(); errs = []
    def page():
        pg = b.new_page(viewport={'width': 1360, 'height': 1000}); pin(pg)
        pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
        pg.route('**/*', lambda r: r.abort() if ('supabase.co' in r.request.url and 'axiscare-open-shifts' not in r.request.url) else r.continue_())
        pg.goto(f'http://127.0.0.1:{PORT}/index.html?proof=opl'); pg.wait_for_timeout(1500)
        pg.evaluate('s=>(0,eval)(s)', STUB); return pg
    pg = page(); pg.evaluate(SETUP, 'practice'); R += pg.evaluate(OWNER)
    pg.wait_for_timeout(150); pg.screenshot(path=SHOTS + 'owner.png', full_page=True)
    pg.set_viewport_size({'width': 400, 'height': 900}); pg.wait_for_timeout(200)
    wv = pg.evaluate("()=>document.documentElement.scrollWidth")
    R.append(['PASS' if wv <= 410 else 'FAIL', 'phone width: the page does not scroll sideways', wv])
    pg.screenshot(path=SHOTS + 'phone.png', full_page=True)
    pg.set_viewport_size({'width': 1360, 'height': 1000}); R += pg.evaluate(BACK)
    pg = page(); pg.evaluate(SETUP, 'staff'); R += pg.evaluate(STAFF); pg.screenshot(path=SHOTS + 'staff.png', full_page=True)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
srv.shutdown()
for st, n, d in R: print(st + '  ' + n + ('' if st == 'PASS' else '  ' + str(d)))
print(f"{sum(1 for r in R if r[0]=='PASS')}/{len(R)} passed")
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

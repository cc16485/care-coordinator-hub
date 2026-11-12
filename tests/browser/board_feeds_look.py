"""Board feeds (Samantha 2026-11-12, One Work List: if it needs a person, it is on the board). The real Hub page, offline,
MADE-UP people only. Lists from other tabs show in Batches as one row with a count and a button to that tab; a list with
nothing to do shows no row; a list that could not be read says so. Coordinators do not see Needs an owner.
(python3 tests/browser/board_feeds_look.py; serves this checkout)"""
import re, os, sys, threading, functools, http.server, socketserver
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
STUB = re.search(r'STUB = r"""(.*?)"""', open(os.path.join(HERE, 'standup_look.py')).read(), re.S).group(1)
SHOTS = os.environ.get('SHOTS', '/tmp/bf_')
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
  window.fetch=async(u,o)=>{ if(String(u).indexOf('axiscare-open-shifts')>=0){ window.__osCalls++; window.__osBody=o&&o.body;
      return new Response(JSON.stringify({ open_count:2, open:[{ client:'Example: Harold J.', date:day(1), start:'8:00 AM', end:'12:00 PM', start24:'08:00' }, { client:'Example: Ruth K.', date:day(5), start:'7:00 PM', end:'11:00 PM', start24:'19:00' }] }), { headers:{ 'Content-Type':'application/json' } }); }
    return real(u,o); };
  switchTab('mywork'); myWorkGo(live ? 'board' : 'today'); await new Promise(r=>setTimeout(r,80));
  return true;
}"""
FEEDS = r"""async(mode)=>{
  BF.state.wait=1500;
  for(let i=0;i<200 && BF.state.busy;i++) await new Promise(r=>setTimeout(r,100));
  DATA.feedback=[{ id:'f1', seen:false }, { id:'f2', seen:true }, { id:'f3', seen:false }];
  DATA.client_checkins=[{ id:'k1', client_name:'Example: Nora T.', checkin_date:'2026-11-01' }, { id:'k2', client_name:'Example: Sam W.', axiscare_client_id:'9' }];
  DATA.referral_orgs=[{ id:'o1', name:'Example: Oak Clinic' }, { id:'o2', name:'Example: Elm Rehab' }]; DATA.leads=[];
  window.PartnerRules=Object.assign({}, window.PartnerRules||{}, { needsOwner:o=>o, unlinked:()=>[{ id:'l1' }] });
  window.cmDue=async()=>({ names:['Example: Ada L. and Example: Jo C.','Example: Ben M. and Example: Kay D.'] });
  window.cl360Identity=async()=>[{ client_name:'Example: Ada L.', axiscare_client_id:'1', role_status:'active' }, { client_name:'Example: Sam W.', axiscare_client_id:'9', role_status:'active' }, { client_name:'Example: Gone G.', axiscare_client_id:'7', role_status:'ended' }];
  DATA.care_plan_reviews=[{ id:'r1', axiscare_client_id:'9', at:'2026-10-01', next_due:'2027-06-01' }];
  DATA.client_checkins.push({ id:'k3', client_name:'Example: Sam W.', axiscare_client_id:'9', checkin_date:'2026-11-01', next_checkin_due:'2027-06-01' });
  const fake={ data:[{ id:'q1', client_name:'Example: Cy N.', status:'open', first_shift_done:true, followup_client_done:true, followup_caregiver_done:false }, { id:'q2', client_name:'Example: Di O.', status:'open', first_shift_done:true, followup_client_done:true, followup_caregiver_done:true }] };
  const chain={ select:()=>chain, eq:()=>chain, neq:()=>Promise.resolve(fake) }; const realFrom=sb.from.bind(sb); sb.from=t=>t==='client_queue'?chain:realFrom(t);
  window.__ffAsked=0; window.FFT={ needs:async()=>{ window.__ffAsked++; return { n:3 }; } };
  window.FCK={ look:async()=> mode==='bad' ? { err:'x', names:[] } : { names:['Example: Ada L.','Example: Ben M.','Example: Cy N.','Example: Di O.'] } };
  BF.state.at=0; BF.state.found={}; BF.state.cm=null; await BF.refresh(true); myWorkGo('board'); await new Promise(r=>setTimeout(r,150)); return true; }"""
CHECK = r"""async(who)=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const rows=()=>[...document.querySelectorAll('#oplBatch .opl-brow[data-feed]')].map(b=>b.getAttribute('data-feed')+':'+b.querySelector('.n').innerText);
  const T=()=>document.getElementById('oplBatch').innerText;
  if(who==='owner'){
    ok('lists from other tabs are rows in Batches, with counts', JSON.stringify(rows())===JSON.stringify(['feedback:2','circles:4','partner_owner:2','partner_link:1','carematch:2','first_shift:1','no_checkin:1','no_review:1','ff_needs:3','checkins_unlinked:1']), rows());
    ok('the Family Circles row names the first three and says 1 more', /Family Circles need a look/.test(T()) && /Example: Ada L\., Example: Ben M\., Example: Cy N\. and 1 more/.test(T()), T());
    ok('card batches still come first', document.querySelector('#oplBatch .opl-brow').hasAttribute('data-batch'));
    const tile=[...document.querySelectorAll('.opl-tile')][2].innerText.replace(/\s+/g,' ');
    ok('the Batches tile counts them: 14 batches, 25 items', /^14 Batches 25 items in all/.test(tile), tile);
    ok('Care Match names the pairs; first shift lists only the launch with a call still open', /Example: Ada L\. and Example: Jo C\./.test(T()) && /Example: Cy N\./.test(T()) && !/Example: Di O\./.test(T()), T());
    ok('a client with no check-in and no plan review is counted; one with both, and one whose care ended, is not', /1\s+Client with no check-in yet\s+Example: Ada L\./.test(T()) && /1\s+Client needs a first plan review\s+Example: Ada L\./.test(T()), T());
    let went=''; const real=window.switchTab; window.switchTab=t=>{ went=t; };
    document.querySelector('[data-feed="circles"] button').click(); window.switchTab=real;
    ok('the button goes to that list\'s own tab', went==='fccheck', went);
    DATA.feedback.forEach(f=>f.seen=true); renderMyWork(); await sleep(60);
    ok('a list that is finished leaves the board by itself', rows().indexOf('feedback:2')<0 && !/feedback/.test(T()), rows());
    ok('no em dashes', !/—/.test(T()));
  } else if(who==='staff'){
    ok('a coordinator\'s board never asks the Friends & Family service', window.__ffAsked===0, window.__ffAsked);
    ok('a coordinator sees the rows but not Needs an owner', rows().indexOf('circles:4')>=0 && !rows().some(x=>/^partner_owner/.test(x)) && rows().indexOf('partner_link:1')>=0 && !rows().some(x=>/^ff_needs/.test(x)) && rows().indexOf('carematch:2')>=0, rows());
  } else {
    ok('a list that could not be read says so instead of showing nothing', /Couldn't check: Family Circles/.test(T()) && !rows().some(x=>/^circles/.test(x)), T());
  }
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
        pg.goto(f'http://127.0.0.1:{PORT}/index.html?proof=bf'); pg.wait_for_timeout(1500)
        pg.evaluate('s=>(0,eval)(s)', STUB); return pg
    pg = page(); pg.evaluate(SETUP, 'live'); pg.evaluate("()=>OPB.lanesTry(true)"); pg.evaluate(FEEDS, 'ok')
    pg.screenshot(path=SHOTS + 'owner.png', full_page=True); R += pg.evaluate(CHECK, 'owner')
    pg.set_viewport_size({'width': 400, 'height': 900}); pg.wait_for_timeout(200)
    wv = pg.evaluate("()=>document.documentElement.scrollWidth")
    R.append(['PASS' if wv <= 410 else 'FAIL', 'phone width: the page does not scroll sideways', wv])
    pg = page(); pg.evaluate(SETUP, 'staff'); pg.evaluate(FEEDS, 'ok'); R += pg.evaluate(CHECK, 'staff')
    pg = page(); pg.evaluate(SETUP, 'staff'); pg.evaluate(FEEDS, 'bad'); R += pg.evaluate(CHECK, 'bad')
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
srv.shutdown()
for st, n, d in R: print(st + '  ' + n + ('' if st == 'PASS' else '  ' + str(d)))
print(f"{sum(1 for r in R if r[0]=='PASS')}/{len(R)} passed")
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

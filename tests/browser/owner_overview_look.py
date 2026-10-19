"""Owner Overview (audit step 9, Samantha 2026-10-18, from the plan approved 2026-10-17): owners only and switched by
ops_settings.owner_overview_live; the status line and duty chips (an empty seat in red, who is out today); Your decisions
from every place they live (a question asked of her, write-ups, post-call drafts, SOP drafts, Approve to Work, new-client
decisions, bonuses, unresolved reviews), with a line when a server part could not be read; care at risk; team support;
by person; overdue (five, then all grouped by owner); the 7-day numbers incl. times work reached her. It only reads.
Servers faked; made-up people only. (python3 tests/browser/owner_overview_look.py)"""
import os, mimetypes
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
STUB = r"""
(()=>{
  const W=window; W.__log={ writes:[], alerts:[], toasts:[], tabs:[] };
  (0,eval)(`sb={ from:(t)=>{ const p={ select(){return p;}, eq(){return p;}, in(){return p;}, not(){return p;}, order(){return p;}, limit(){return p;},
      maybeSingle:async()=>({data:null,error:null}), then(a){ return Promise.resolve(t==='client_admission_case'?{data:[{ case_id:'c1', axiscare_name:'Walt Wise', observed_label:'Active in AxisCare, no lead', observed_at:new Date(Date.now()-3600e3).toISOString(), needs_owner_decision:true },{ case_id:'c2', axiscare_name:'Not Me', needs_owner_decision:false }],error:null}:{data:[],error:null}).then(a); } }; return p; },
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async()=>({data:null,error:null}) }, auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };`);
  W.persist=async(k,v)=>{ W.__log.writes.push({ k }); };
  W.ccToast=m=>W.__log.toasts.push(m); W.alert=m=>W.__log.alerts.push(m); W.opEvent=()=>{}; W.ccConfirm=async()=>true;
  (0,eval)(`ME={ email:'sam@mo-care.com', name:'Samantha T', shift:'day' }; CC_ROLE_BY_EMAIL={ 'sam@mo-care.com':['owner_admin'], 'kry@mo-care.com':['care_coordinator'], 'ang@mo-care.com':['care_coordinator'] };`);
  (0,eval)(`dutyNow=()=>[{ area:'in_charge', label:'In charge', holder:{ person:'kry@mo-care.com' }, gap:false }, { area:'staffing', label:'Staffing', holder:null, gap:true }]; discCanApprove=()=>({ ok:true });`);
  const H=h=>new Date(Date.now()+h*3600e3).toISOString(), T=new Date().toLocaleDateString('en-CA',{ timeZone:'America/Chicago' });
  DATA.coordinator_staff=[{ email:'kry@mo-care.com', name:'Krystal Land' }, { email:'ang@mo-care.com', name:'Angiel Rose', out_until:T }, { email:'sam@mo-care.com', name:'Samantha T' }];
  DATA.ops_settings={ owner_overview_live:false, lead_rotation:{ people:[{ name:'Krystal' }, { name:'Angiel' }] } };
  DATA.ops_items=[
    { id:'d1', kind:'task', status:'open', owner:'kry@mo-care.com', title:'3h visits for a new family', due:H(5), created_at:H(-2), decision:{ to:'sam@mo-care.com', question:'Allow 3h visits once (minimum is 4h)?', recommend:'allow once', asked_by:'kry@mo-care.com', asked_by_name:'Krystal', asked_at:H(-1) } },
    { id:'c1', kind:'missed_clockin', domain:'staffing', status:'open', owner:'ang@mo-care.com', urgency:'urgent', title:'Missed clock-in: Rose Able 7am', due:H(-0.5), created_at:H(-1), escalation:{ to:'sam@mo-care.com', level:'urgent', at:H(-0.3) } },
    { id:'h1', kind:'task', status:'open', owner:'kry@mo-care.com', title:'Reference checks for 2 applicants', due:H(20), created_at:H(-4), help_asked_at:H(-3) },
    { id:'l1', kind:'task', status:'open', owner:'kry@mo-care.com', title:'Family callback promised by noon', due:H(-2), created_at:H(-30) },
    { id:'l2', kind:'task', status:'open', owner:'kry@mo-care.com', title:'Care plan update', due:H(-26), created_at:H(-60) },
    ...[3,4,5,6,7].map(n=>({ id:'l'+n, kind:'task', status:'open', owner:'ang@mo-care.com', title:'Late task '+n, due:H(-n), created_at:H(-50) })),
    { id:'x1', kind:'task', status:'done', owner:'kry@mo-care.com', title:'Old', closed_at:H(-0.1), created_at:H(-80), escalation:{ to:'sam@mo-care.com', at:H(-48) } } ];
  DATA.discipline_actions=[{ id:'w1', status:'pending_approval', level:'Final warning', caregiver:'Pat Doe', sent_for_approval_at:H(-5) }, { id:'w2', status:'draft', level:'Verbal', caregiver:'Lee' }];
  DATA.post_call_followups=[{ id:'p1', status:'pending_approval' }, { id:'p2', status:'sent' }];
  DATA.sop_library=[{ id:'s1', status:'draft' }, { id:'s2', status:'published' }];
  DATA.leads=[{ id:'n1', created_at:H(-24), first_human_attempt_at:H(-23.8), assigned_coordinator:'Krystal' }, { id:'n2', created_at:H(-48), first_shift_at:H(-30) }];
  DATA.coverage_cases=[{ id:'cc1', status:'resolved', resolved_at:H(-10), resolved_how:'covered' }, { id:'cc2', status:'resolved', resolved_at:H(-20), resolved_how:'uncovered' }];
  DATA.timekeeper_cases=[{ id:'t1', kind:'clock_in', created_at:H(-5) }, { id:'t2', kind:'clock_out', created_at:H(-5) }];
  W.Bonus={ call:async()=>({ lines:[{ id:'b1', recipient:'Krystal', client:'Rose Able', status:'ready', status_words:'Ready for approval' }, { id:'b2', recipient:'Angiel', client:'X', status:'paid' }] }) };
  W.CcTeam={ call:async()=>({ error:'team service down' }) };
  W.CRX={ call:async()=>({ rows:[{ offer_id:'o1', name:'Nia New', ready_for_final:true }, { offer_id:'o2', name:'Done Already', ready_for_final:true, approved_to_work:true, axiscare:'confirmed' }] }), open:(id)=>W.__log.tabs.push('crx:'+id) };
  W.bnOpen=()=>W.__log.tabs.push('bonus');
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,900)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, $=id=>document.getElementById(id), pill=()=>document.querySelector('.fpill[data-tab="owneroverview"]'), txt=()=>($('ovWrap')||{}).innerText||'';
  OV.pillSync();
  ok('off · no pill, and the tab refuses', pill().style.display==='none'&&(switchTab('owneroverview'), L.alerts.some(a=>/Owner Overview is for Samantha and Zachary/.test(a))));
  DATA.ops_settings.owner_overview_live=true; OV.pillSync();
  ok('on · Samantha (an owner) sees the pill', pill().style.display==='');
  (0,eval)(`ME={ email:'kry@mo-care.com', name:'Krystal Land', shift:'day' }`); OV.pillSync();
  ok('on · Krystal (not an owner) never sees it', pill().style.display==='none'&&!OV.allowed());
  (0,eval)(`ME={ email:'sam@mo-care.com', name:'Samantha T', shift:'day' }`);
  try{ localStorage.setItem('ov_last_look', new Date(Date.now()-3600e3).toISOString()); }catch(e){}
  const writes0=L.writes.length;
  switchTab('owneroverview'); await sleep(250);
  const t=txt();
  ok('status · care at risk shown first, with the count of things for her', /1 care at risk · \d+ things for you/.test(t), t.slice(0,300));
  ok('duty · In charge Krystal, Staffing nobody (red), Angiel out today, since you looked', /In charge: Krystal/.test(t)&&/Staffing: nobody/.test(t)&&!!document.querySelector('.ov-chip.gap')&&/Out today: Angiel/.test(t)&&/Since you looked 1h ago: 1 closed/.test(t), t.slice(0,500));
  ok('decisions · the question Krystal asked her, with the recommendation and Answer', /Allow 3h visits once \(minimum is 4h\)\?/.test(t)&&/From Krystal · owner Krystal Land · recommends allow once/.test(t), t);
  ok('decisions · the write-up to approve (not the draft), 1 post-call draft, 1 SOP draft', /Write-up to approve: Final warning for Pat Doe/.test(t)&&!/Lee/.test(t)&&/1 post-call message waiting for approval/.test(t)&&/1 SOP draft not published/.test(t), t);
  ok('decisions · from the servers: Approve to Work for Nia (not the approved one), the new client Walt, 1 bonus ready', /Approve to Work: Nia New/.test(t)&&!/Done Already/.test(t)&&/New client needs your decision: Walt Wise/.test(t)&&!/Not Me/.test(t)&&/1 bonus waiting on a decision/.test(t)&&/Krystal \(Rose Able, Ready for approval\)/.test(t), t);
  ok('decisions · a server part that could not be read says so (never silent)', /Could not check: management reviews \(team service down\)/.test(t), t);
  ok('urgent · the missed clock-in, owner Angiel, waiting on you', /Missed clock-in: Rose Able 7am/.test(t)&&/Owner Angiel Rose/.test(t)&&/waiting on you/.test(t), t);
  ok('team support · the reference checks, nobody helping yet', /Reference checks for 2 applicants/.test(t)&&/nobody yet/.test(t), t);
  ok('by person · Krystal 2 late, Angiel out', /Krystal Land[\s\S]*?2 late/.test(t)&&/Angiel Rose[\s\S]*?out today/.test(t), t);
  ok('overdue · five shown, then See all 8', (t.match(/Owner [A-Z][a-z]+ [A-Z][a-z]+ · due/g)||[]).length===5&&/See all 8, grouped by owner/.test(t), t);
  OV.all(); await sleep(30);
  ok('overdue · See all groups by owner', /Angiel Rose \(6\)/.test(txt())&&/Krystal Land \(2\)/.test(txt()), txt());
  ok('numbers · call-offs 1 of 2, median first call over 2 new leads, 1 missed clock-in, 1 started, 3 times work reached her (a decision, an escalation, one from 2 days ago)', /1 of 2\s*call-offs covered/.test(t)&&/\d+ min\s*median first call to a new lead \(2 new\)/.test(t)&&/1\s*missed clock-ins/.test(t)&&/1\s*clients started/.test(t)&&/3\s*times work reached you/.test(t), t.slice(-500));
  ok('it only reads: nothing was saved', L.writes.length===writes0, L.writes.slice(writes0));
  OV.atw('o1'); OV.bonus();
  ok('open · Approve to Work opens that card; bonuses open the Bonuses window', L.tabs.includes('crx:o1')&&L.tabs.includes('bonus'), L.tabs);
  lhSetFill();
  ok('settings · On, with the button for Samantha', /On\./.test($('ovSetNow').textContent)&&$('ovToggleBtn').style.display==='');
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
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1360, 'height': 900})
    pg.route('**/*', lambda r: serve(r) if r.request.url.startswith('http://hub.test/') else (r.abort() if 'supabase.co' in r.request.url else r.continue_()))
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://hub.test/index.html?proof=overview'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

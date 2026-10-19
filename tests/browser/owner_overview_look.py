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
  W.__ivRows=[{ status:'attended', outcome_at:new Date(Date.now()-2*864e5).toISOString() }, { status:'attended', outcome_at:new Date(Date.now()-3*864e5).toISOString() }, { status:'noshow', outcome_at:new Date(Date.now()-3*864e5).toISOString() }, { status:'attended', outcome_at:new Date(Date.now()-9*864e5).toISOString() }];
  W.__hireRows=[{ hired_at:new Date(Date.now()-1*864e5).toISOString() }];
  (0,eval)(`sb={ from:(t)=>{ const p={ select(){return p;}, eq(){return p;}, in(){return p;}, not(){return p;}, order(){return p;}, limit(){return p;}, gte(){return p;},
      maybeSingle:async()=>({data:null,error:null}), then(a){ return Promise.resolve(t==='interview_bookings'?{data:window.__ivRows,error:null}:t==='job_applicants'?{data:window.__hireRows,error:null}:t==='client_admission_case'?{data:[{ case_id:'c1', axiscare_name:'Walt Wise', observed_label:'Active in AxisCare, no lead', observed_at:new Date(Date.now()-3600e3).toISOString(), needs_owner_decision:true },{ case_id:'c2', axiscare_name:'Not Me', needs_owner_decision:false }],error:null}:{data:[],error:null}).then(a); } }; return p; },
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
    { id:'x1', kind:'task', status:'done', owner:'kry@mo-care.com', title:'Old', closed_at:H(-0.1), created_at:H(-80), escalation:{ to:'sam@mo-care.com', at:H(-48) } },
    { id:'x2', kind:'task', status:'done', owner:'kry@mo-care.com', title:'On time', due:H(-20), closed_at:H(-21), created_at:H(-40) },
    { id:'x3', kind:'task', status:'done', owner:'kry@mo-care.com', title:'Late', due:H(-30), closed_at:H(-25), created_at:H(-40) },
    { id:'x4', kind:'task', status:'done', owner:'kry@mo-care.com', title:'Auto', due:H(-30), closed_at:H(-25), closed_by:'system', created_at:H(-40) },
    { id:'x5', kind:'task', status:'done', owner:'kry@mo-care.com', title:'Last week on time', due:H(-200), closed_at:H(-201), created_at:H(-220) },
    { id:'x6', kind:'task', status:'open', owner:'kry@mo-care.com', title:'Asked last week', escalation:{ to:'sam@mo-care.com', at:H(-200) } } ];
  DATA.discipline_actions=[{ id:'w1', status:'pending_approval', level:'Final warning', caregiver:'Pat Doe', sent_for_approval_at:H(-5) }, { id:'w2', status:'draft', level:'Verbal', caregiver:'Lee' }];
  DATA.post_call_followups=[{ id:'p1', status:'pending_approval' }, { id:'p2', status:'sent' }];
  DATA.sop_library=[{ id:'s1', status:'draft' }, { id:'s2', status:'published' }];
  DATA.leads=[{ id:'n1', created_at:H(-24), first_human_attempt_at:H(-23.8), assigned_coordinator:'Krystal' }, { id:'n2', created_at:H(-48), first_shift_at:H(-30) }];
  DATA.coverage_cases=[{ id:'cc1', status:'resolved', resolved_at:H(-10), resolved_how:'covered' }, { id:'cc2', status:'resolved', resolved_at:H(-20), resolved_how:'uncovered' }];
  DATA.timekeeper_cases=[{ id:'t1', kind:'clock_in', created_at:H(-5) }, { id:'t2', kind:'clock_out', created_at:H(-5) }, { id:'t3', kind:'clock_in', created_at:H(-200) }, { id:'t4', kind:'clock_in', created_at:H(-210) }];
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
  ok('numbers · this week vs last: call-offs 50%, work on time 50% (system closes left out) down 50 pts from 100%, 1 missed clock-in (-1, better), 2 interviews → 1 hire, times work reached her 3 (+2)', /50%\s*call-offs covered \(2\)/.test(t)&&/50%\s*work closed on time \(2 closed\)\s*-50 pts vs last week/.test(t)&&/1\s*missed clock-ins\s*-1 vs last week/.test(t)&&/2 → 1\s*interviews to hires\s*\+1 hires vs last week/.test(t)&&/3\s*times work reached you\s*\+2 vs last week/.test(t), t.slice(-900));
  const red=[...document.querySelectorAll('.ov-stat .d')].find(d=>/-50 pts/.test(d.textContent)), grn=[...document.querySelectorAll('.ov-stat .d')].find(d=>/-1 vs last week/.test(d.textContent));
  ok('numbers · worse is red, better is green (fewer missed clock-ins is better)', red&&/178, 59, 46|B23B2E/i.test(red.getAttribute('style'))&&grn&&/31, 122, 77|1F7A4D/i.test(grn.getAttribute('style')), [red&&red.getAttribute('style'), grn&&grn.getAttribute('style')]);
  ok('looking saves nothing (only the help buttons below do)', L.writes.length===writes0, L.writes.slice(writes0));
  OV.atw('o1'); OV.bonus();
  ok('open · Approve to Work opens that card; bonuses open the Bonuses window', L.tabs.includes('crx:o1')&&L.tabs.includes('bonus'), L.tabs);
  /* ── helping from here (plan step 4) ── */
  window.myWorkRefresh=()=>{}; if(typeof window.opsLog!=='function') window.opsLog=(it,t)=>{ it.log=(it.log||[]).concat([t]); };
  const rowOf=id=>[...document.querySelectorAll('#ovWrap .ov-it')].find(r=>r.querySelector('button[onclick*="\''+id+'\'"]'));
  ok('help · a teammate\'s late row offers Help with this, Open and Make this mine', /Help with this/.test((rowOf('l1')||{}).innerText||'')&&/Make this mine/.test((rowOf('l1')||{}).innerText||''), (rowOf('l1')||{}).innerText);
  const w0=L.writes.length;
  await OV.help('l1'); await sleep(60);
  const l1=DATA.ops_items.find(x=>x.id==='l1');
  ok('help · Help with this adds her as helper, the owner stays Krystal, saved once', l1.help_from==='sam@mo-care.com'&&l1.owner==='kry@mo-care.com'&&L.writes.slice(w0).some(w=>w.k==='ops_items'), { l1, w:L.writes.slice(w0) });
  ok('help · the row now says You are helping, with My part is done and This is finished', /You are helping · still Krystal’s/.test((rowOf('l1')||{}).innerText||'')&&/My part is done/.test((rowOf('l1')||{}).innerText||'')&&/This is finished/.test((rowOf('l1')||{}).innerText||''), (rowOf('l1')||{}).innerText);
  document.getElementById('ovA_l1f').click(); await sleep(80);
  const pop=document.querySelector('.ccpop'); ok('finish · asks what finished it', !!pop&&/This is finished/.test(pop.innerText), pop&&pop.innerText);
  pop.querySelector('#taWhy').value='Called the family, all set'; pop.querySelector('#taGo').click(); await sleep(500);
  ok('finish · closed by her with the reason; Krystal can reopen for a day; the row is gone', l1.status==='done'&&l1.closed_by==='sam@mo-care.com'&&l1.finished_for&&l1.finished_for.owner==='kry@mo-care.com'&&!rowOf('l1'), { l1, row:!!rowOf('l1') });
  document.getElementById('ovA_l2t').click(); await sleep(80);
  const tp=document.querySelector('.ccpop'); ok('make this mine · a separate step that asks for a reason', !!tp&&/Take responsibility from Krystal/.test(tp.innerText)&&!!tp.querySelector('#taWhy'), tp&&tp.innerText);
  ccPopClose(); await sleep(350);
  ok('make this mine · cancelling changes nothing', DATA.ops_items.find(x=>x.id==='l2').owner==='kry@mo-care.com');
  ok('care at risk · the 911 line comes first on the row', /If someone is in danger, call 911 now/.test(txt()));
  DATA.ops_items.push({ id:'own1', kind:'task', status:'open', owner:'sam@mo-care.com', title:'My own late thing', due:new Date(Date.now()-3600e3).toISOString(), created_at:new Date().toISOString() }); OV.draw(true);
  ok('her own row · just Open (helping is for other people\'s work)', rowOf('own1')&&!/Help with this/.test(rowOf('own1').innerText), rowOf('own1')&&rowOf('own1').innerText);
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

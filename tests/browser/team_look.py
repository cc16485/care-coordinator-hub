"""Team numbers and reviews (Care Coordinator Leads and Bonus, Stage 5, policy approved by Samantha 2026-10-18): the My Work
button (My month / Team), My month for a Care Coordinator (only their own), Team for the owners (side by side), management
reviews for the HR lead (decide: cause, No action or Coaching with owner, deadline, plan), Samantha's unresolved view, a
coaching owner's done check, and the settings (owners only). The server function is faked: the page never reads review
records itself. Made-up people only. (python3 tests/browser/team_look.py)"""
import os, mimetypes
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
STUB = r"""
(()=>{
  const W=window; W.__log={ writes:[], alerts:[], toasts:[] };
  const clone=x=>JSON.parse(JSON.stringify(x));
  (0,eval)(`sb={ from:()=>{ const p={ select(){return p;}, eq(){return p;}, in(){return p;}, not(){return p;}, order(){return p;}, limit(){return p;},
      maybeSingle:async()=>({data:null,error:null}), then(a){ return Promise.resolve({data:[],error:null}).then(a); } }; return p; },
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async()=>({data:null,error:null}) },
    auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };`);
  W.persist=async(k,v)=>{ W.__log.writes.push({ k, v:clone(v) }); };
  W.ckCheckNewInquiry=async()=>({proceed:true, note:''});
  W.jcLoadConn=async()=>null; W.renderLeads=()=>{}; W.renderFollowUpQueue=()=>{}; W.cjAutoOpen=()=>{};
  W.ccToast=m=>W.__log.toasts.push(m); W.alert=m=>W.__log.alerts.push(m); W.myWorkRefresh=()=>{}; W.opEvent=()=>{};
  W.ccPrompt=async()=>'the family asked for Angiel'; W.ccConfirm=async()=>true;
  (0,eval)(`ME={ email:'kry@mo-care.com', name:'Krystal Land', shift:'day' }; CC_ROLE_BY_EMAIL={ 'sam@mo-care.com':['owner_admin'], 'kry@mo-care.com':['care_coordinator'] };`);
  DATA.coordinator_staff=[{ email:'kry@mo-care.com', name:'Krystal Land' }, { email:'ang@mo-care.com', name:'Angiel Rose' }, { email:'sam@mo-care.com', name:'Samantha T' }];
  DATA.ops_settings={ team_live:false, team:{ hr_lead:'zach@mo-care.com' }, bonus_live:false, bonus:{ payroll:'kry@mo-care.com', decider:'sam@mo-care.com', ot_checked:null }, relationship_calls_live:true, relationship_calls_live_since:new Date(Date.now()-40*864e5).toISOString(), lead_rotation_live:true, lead_rotation:{ people:[{ name:'Krystal', on:true }, { name:'Angiel', on:true }] } };
  DATA.leads=[{ id:'k1', first_name:'Kay', last_name:'One', status:'Contacted', assigned_coordinator:'Krystal', created_at:'2026-10-18T14:00:00Z', first_human_attempt_at:'2026-10-18T14:05:00Z',
    owner_turn:{ to:'Krystal', how:'turn', at:'2026-10-18T14:00:00Z', seq:1 }, original_owner:{ name:'Krystal', at:'2026-10-18T14:00:00Z', how:'turn' } }];
  DATA.referral_orgs=[]; DATA.care_assessments=[]; DATA.post_call_followups=[];
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log; L.calls=[];
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  const M=(p,o)=>Object.assign({ person:p, month:'November 2026', leads_assigned:2, assessments_owned:1, assessments_helped:0, starts:1, retained_30:1, overdue_now:0, bonuses:1, bonus_dollars:100 }, o||{});
  const CAUSES={ workload:'Workload', training:'Training', accountability:'Accountability' };
  const REV={ id:'rev_k', person:'Krystal', opened_on:'2026-11-20', status:'open', items:[{ kind:'follow_up', client:'Rose', day:'2026-11-20' }, { kind:'promise', client:'Bea', day:'2026-11-20' }] };
  let ROLE='kry';
  const LISTS={
    kry:{ live:true, month:'November 2026', me:{ owner:false, hr:false, decider:false, cc:true, email:'kry@mo-care.com' }, months:[M('Krystal',{ overdue_now:2 })], my_overdue:[{ kind:'follow_up', client:'Rose', since:'2026-11-18', lead_id:'l1' }], reviews:[], waiting:0, causes:CAUSES },
    zach:{ live:true, month:'November 2026', me:{ owner:true, hr:true, decider:false, cc:false, email:'zach@mo-care.com' }, months:[M('Krystal',{ overdue_now:2 }), M('Angiel')], my_overdue:[], reviews:[REV], waiting:1, causes:CAUSES },
    sam:{ live:true, month:'November 2026', me:{ owner:true, hr:false, decider:true, cc:false, email:'sam@mo-care.com' }, months:[M('Krystal'), M('Angiel')], my_overdue:[], reviews:[], waiting:0, causes:CAUSES },
    coach:{ live:true, month:'November 2026', me:{ owner:false, hr:false, decider:false, cc:true, email:'kry@mo-care.com' }, months:[M('Krystal')], my_overdue:[], reviews:[Object.assign({}, REV, { person:'Angiel', status:'coaching', coaching:{ owner:'kry@mo-care.com', deadline:'2026-11-27', plan:'Next dates' }, items:undefined })], waiting:0, causes:CAUSES } };
  sb.functions={ invoke:async(name,{body})=>{ L.calls.push({ name, body:JSON.parse(JSON.stringify(body)) }); if(body.action==='list') return { data:JSON.parse(JSON.stringify(LISTS[ROLE])), error:null }; return { data:{ ok:true }, error:null }; } };
  window.OPS_PEOPLE=[{ primary_email:'zach@mo-care.com', full_name:'Zach Troutman' }, { primary_email:'kry@mo-care.com', full_name:'Krystal Land' }]; (0,eval)(`OPS_PEOPLE=window.OPS_PEOPLE`);
  const txt=()=>((document.querySelector('#cctModal .cct-dlg')||{}).textContent||'');

  /* ── the button ── */
  cctBtnSync(); const b=document.getElementById('cctBtn');
  ok('button · off: hidden for a Care Coordinator', b.style.display==='none');
  DATA.ops_settings.team_live=true; cctBtnSync();
  ok('button · on: "My month" for Krystal', b.style.display===''&&b.textContent==='My month', b.textContent);

  /* ── a Care Coordinator ── */
  await cctOpen(); await sleep(50);
  ok('Krystal · My month with her own numbers only (one column), overdue in red', /My month/.test(txt())&&document.querySelectorAll('#cctModal .cct-t th.n').length===1&&/Krystal/.test(txt())&&!/Angiel/.test(txt())&&document.querySelector('#cctModal .cct-red'), txt().slice(0,300));
  ok('Krystal · what is overdue for her now, with Open; no reviews section', /Overdue for you now/.test(txt())&&/follow-up: Rose/.test(txt())&&!/review/i.test(txt()));
  ok('the page asked the server, never the review records', L.calls.every(c=>c.name==='cc-team')&&!L.writes.some(w=>/review|overdue/.test(w.k||'')));
  cctClose();

  /* ── the HR lead ── */
  (0,eval)(`ME={ email:'zach@mo-care.com', name:'Zach Troutman', shift:'day' }; CC_ROLE_BY_EMAIL['zach@mo-care.com']=['owner_admin'];`);
  cctBtnSync(); ok('button · "Team" for an owner', b.textContent==='Team');
  ROLE='zach'; await cctOpen(); await sleep(50);
  ok('Zach · Team side by side (two columns) and the review with its overdue items', /Team/.test(txt())&&document.querySelectorAll('#cctModal .cct-t th.n').length===2&&/Management reviews/.test(txt())&&/follow-up \(Rose\)/.test(txt())&&/never discipline/.test(txt()), txt().slice(0,400));
  document.getElementById('cctChoice_rev_k').value='coaching'; cctChoice('rev_k');
  ok('choosing Coaching shows owner, deadline and plan', document.getElementById('cctDead_rev_k').parentElement.style.display===''&&document.getElementById('cctPlan_rev_k').style.display==='');
  document.getElementById('cctCause_rev_k').value='training'; document.getElementById('cctOwner_rev_k').value='zach@mo-care.com'; document.getElementById('cctDead_rev_k').value='2026-11-27'; document.getElementById('cctPlan_rev_k').value='Next dates on every call';
  await cctDecide('rev_k'); await sleep(60);
  ok('decide · sends cause, coaching owner, deadline and plan', L.calls.some(c=>c.body.do==='decide'&&c.body.cause==='training'&&c.body.choice==='coaching'&&c.body.coaching_owner==='zach@mo-care.com'&&c.body.deadline==='2026-11-27'&&/Next dates/.test(c.body.plan)), L.calls.slice(-2));
  cctClose();

  /* ── Samantha (decider, not the HR lead) ── */
  ROLE='sam'; await cctOpen(); await sleep(50);
  ok('Samantha · Team, and "Unresolved reviews: nothing" (Zachary handles them)', /Unresolved reviews/.test(txt())&&/Nothing unresolved/.test(txt()), txt().slice(-300));
  cctClose();

  /* ── a coaching owner ── */
  (0,eval)(`ME={ email:'kry@mo-care.com', name:'Krystal Land', shift:'day' }`);
  ROLE='coach'; await cctOpen(); await sleep(50);
  ok('Krystal as a coaching owner · sees only "Your coaching" with the plan and deadline (no overdue items of Angiel)', /Your coaching/.test(txt())&&/Next dates/.test(txt())&&!/Overdue:/.test(txt()));
  document.getElementById('cctDone_rev_k').value='Covered next dates'; await cctDone('rev_k'); await sleep(60);
  ok('coaching done · sends her note', L.calls.some(c=>c.body.do==='coaching_done'&&c.body.note==='Covered next dates'));
  cctClose();

  /* ── audit step 7: balanced measures ── */
  ROLE='zach'; await cctOpen(); await sleep(50);
  ok('step 7 · off (no balance from the server): no balanced measures table', !document.getElementById('cctBal'));
  cctClose();
  const BAL=(o)=>Object.assign({ rel_calls:{ due:2, on_time:1 }, followups:{ due:0, on_time:0 }, help_given:1, help_received:0, first_call_median_min:12, first_call_n:3 }, o||{});
  LISTS.zach.months=[M('Krystal',{ overdue_now:2, balance:BAL() }), M('Angiel',{ balance:BAL({ help_given:0, help_received:1, first_call_median_min:null, first_call_n:0 }) })];
  ROLE='zach'; await cctOpen(); await sleep(50);
  const bt=()=>(document.getElementById('cctBal')||{}).innerText||'';
  ok('step 7 · on: the table shows calls on time, follow-ups, help both ways and the median first call', /Relationship calls on time\s+1 of 2/.test(bt())&&/Concern follow-ups on time\s+none due/.test(bt())&&/Helped a teammate\s+1\s+0/.test(bt())&&/Got help from a teammate\s+0\s+1/.test(bt())&&/12 min \(3 leads\)\s+no calls yet/.test(bt()), bt());
  cctClose();

  /* ── settings ── */
  lhSetFill();
  ok('step 7 · settings: off, and Krystal sees no button', /Off\./.test(document.getElementById('bmSetNow').textContent)&&document.getElementById('bmToggleBtn').style.display==='none');
  ok('settings · Krystal sees them read-only, no buttons', document.getElementById('tnHr').disabled&&document.getElementById('tnSaveBtn').style.display==='none');
  (0,eval)(`ME={ email:'sam@mo-care.com', name:'Samantha T', shift:'day' }`);
  window.tkMerge=async(apply,what)=>{ const m=JSON.parse(JSON.stringify(DATA.ops_settings)); const ch=apply(m, DATA.ops_settings); DATA.ops_settings=m; return { changed:ch, error:null }; };
  lhSetFill(); document.getElementById('tnHr').value='zach@mo-care.com'; await tnSave(); await sleep(30);
  window.ccConfirm=async()=>true; await bmToggle(); await sleep(30);
  ok('step 7 · Samantha turns the balanced measures on', DATA.ops_settings.balanced_measures_live===true&&/On\./.test(document.getElementById('bmSetNow').textContent));
  ok('settings · Samantha saves the HR lead', DATA.ops_settings.team.hr_lead==='zach@mo-care.com'&&/Saved/.test(document.getElementById('tnSaved').textContent));
  return R;
}
"""
SHOTJS = r"""async()=>{ (0,eval)(`ME={ email:'zach@mo-care.com', name:'Zach Troutman', shift:'day' }`); sb.functions={ invoke:async(n,{body})=>({ data: body.action==='list' ? { live:true, month:'November 2026', me:{ owner:true, hr:true, decider:false, cc:false, email:'zach@mo-care.com' },
  months:[{ person:'Krystal', leads_assigned:6, assessments_owned:4, assessments_helped:1, starts:3, retained_30:2, overdue_now:2, bonuses:2, bonus_dollars:200 }, { person:'Angiel', leads_assigned:5, assessments_owned:4, assessments_helped:0, starts:3, retained_30:3, overdue_now:0, bonuses:3, bonus_dollars:300 }],
  my_overdue:[], reviews:[{ id:'rev_k', person:'Krystal', opened_on:'2026-11-20', status:'open', items:[{ kind:'follow_up', client:'Rose Able', day:'2026-11-18' }, { kind:'promise', client:'Bea Bond', day:'2026-11-19' }] }], waiting:1, causes:{ workload:'Workload', training:'Training', accountability:'Accountability' } } : {}, error:null }) }; await cctOpen(); }"""
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
    pg.goto('http://hub.test/index.html?proof=team'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    if os.environ.get('SHOT'):
        pg.evaluate(SHOTJS); pg.wait_for_timeout(300); pg.locator('#cctModal .cct-dlg').screenshot(path=os.environ['SHOT'])
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

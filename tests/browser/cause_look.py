"""Causes and cover reasons (audit step 3, Samantha 2026-10-18): the Settings switch (owners only, off by default), the
cover reason asked when someone takes a teammate's inquiry or logs a call on a teammate's lead or family (cancel = nothing
changes for Take it), nothing asked while off, and the cause picker in My month and in a review. Servers faked; made-up
people only. (python3 tests/browser/cause_look.py)"""
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
  DATA.ops_settings={ lead_rotation_live:true, lead_rotation:{ people:[{ name:'Krystal', on:true }, { name:'Angiel', on:true }] } };
  DATA.leads=[{ id:'k1', first_name:'Kay', last_name:'One', status:'Contacted', assigned_coordinator:'Krystal', created_at:'2026-10-18T14:00:00Z', first_human_attempt_at:'2026-10-18T14:05:00Z',
    owner_turn:{ to:'Krystal', how:'turn', at:'2026-10-18T14:00:00Z', seq:1 }, original_owner:{ name:'Krystal', at:'2026-10-18T14:00:00Z', how:'turn' } }];
  DATA.referral_orgs=[]; DATA.care_assessments=[]; DATA.post_call_followups=[];
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log; let ASKED=[]; let ANSWER='Angiel is out today';
  window.ccPrompt=async(m)=>{ ASKED.push(m); return ANSWER; };
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  DATA.ops_settings.overdue_causes_live=true;
  /* ── Take it: helping asks why ── */
  DATA.leads.push({ id:'h1', first_name:'Hal', last_name:'Ivey', status:'New', assigned_coordinator:'Angiel', created_at:'2026-10-18T15:00:00Z' });
  DATA.ops_items=[{ id:'ops_lead_h1', kind:'new_lead', source_id:'h1', status:'open', owner:'ang@mo-care.com', owner_name:'Angiel Rose', title:'New lead: Hal Ivey', about:'Hal Ivey', created_at:'2026-10-18T15:00:00Z' }];
  ANSWER=null; await opsTakeIt('ops_lead_h1'); await sleep(40);
  ok('Take it · cancelling the question changes nothing', ASKED.length===1&&!DATA.ops_items[0].help_from&&!(DATA.leads.find(x=>x.id==='h1').helpers||[]).length, DATA.ops_items[0]);
  ANSWER='Angiel is out today'; await opsTakeIt('ops_lead_h1'); await sleep(60);
  const it=DATA.ops_items[0], h=DATA.leads.find(x=>x.id==='h1');
  ok('Take it · asked why; the card keeps covering {for, by, reason} and the lead keeps the helper’s why', /Why are you covering for Angiel/.test(ASKED[1])&&it.covering&&it.covering.reason==='Angiel is out today'&&it.covering.by==='kry@mo-care.com'&&h.helpers.at(-1).why==='Angiel is out today'&&h.assigned_coordinator==='Angiel', { it, h:h.helpers });
  /* ── a relationship call on a teammate's family ── */
  DATA.leads.push({ id:'r1', first_name:'Dee', last_name:'Ward', status:'Converted', assigned_coordinator:'Angiel', first_shift_at:new Date(Date.now()-3*864e5).toISOString(), comm_log:[] });
  DATA.ops_items.push({ id:'ops_rel_r1_day7', kind:'relationship_call', call_key:'day7', source_id:'r1', status:'open', owner:'ang@mo-care.com', owner_name:'Angiel Rose', title:'7-day relationship call: Ruth' });
  ANSWER='Angiel asked me to'; ASKED=[];
  await relCallSave('ops_rel_r1_day7','talked','Going well'); await sleep(60);
  const rl=DATA.leads.find(x=>x.id==='r1'), rc=DATA.ops_items.find(x=>x.id==='ops_rel_r1_day7');
  ok('relationship call · asked why; the call and the card keep the reason', ASKED.length===1&&rl.relationship_calls.at(-1).cover_reason==='Angiel asked me to'&&rc.covering&&rc.covering.reason==='Angiel asked me to', { calls:rl.relationship_calls, rc });
  /* ── off: nothing asked ── */
  DATA.ops_settings.overdue_causes_live=false; ASKED=[];
  DATA.leads.push({ id:'h2', first_name:'Gus', status:'New', assigned_coordinator:'Angiel', created_at:'2026-10-18T15:00:00Z' });
  DATA.ops_items.push({ id:'ops_lead_h2', kind:'new_lead', source_id:'h2', status:'open', owner:'ang@mo-care.com', owner_name:'Angiel Rose', title:'New lead: Gus', about:'Gus', created_at:'2026-10-18T15:00:00Z' });
  await opsTakeIt('ops_lead_h2'); await sleep(40);
  ok('off · Take it asks nothing and works as in Stage 1 (helping, no covering reason)', ASKED.length===0&&DATA.ops_items.find(x=>x.id==='ops_lead_h2').help_from==='kry@mo-care.com'&&!DATA.ops_items.find(x=>x.id==='ops_lead_h2').covering);
  /* ── My month: the cause picker ── */
  DATA.ops_settings.team_live=true; const calls=[];
  sb.functions={ invoke:async(n,{body})=>{ calls.push(JSON.parse(JSON.stringify(body))); return { data: body.action==='list' ? { live:true, causes_live:true, overdue_causes:{ employee:'Mine (it counts)', staffing:'Staffing shortage', client:'Client or family decision', leave:'Approved leave', technical:'Phone or Hub problem' },
    month:'November 2026', me:{ owner:false, hr:false, decider:false, cc:true, email:'kry@mo-care.com' }, months:[{ person:'Krystal', leads_assigned:1, assessments_owned:0, assessments_helped:0, starts:0, retained_30:0, overdue_now:1, bonuses:0, bonus_dollars:0 }],
    my_overdue:[], my_missed:[{ key:'follow_up:l1:2026-11-18', kind:'follow_up', client:'Rose', day:'2026-11-20', cause:'employee', counts:true, in_review:false }, { key:'rel:x', kind:'relationship_call', client:'Eve', day:'2026-11-19', cause:'leave', counts:false, in_review:false }], reviews:[], waiting:0, causes:{} } : { ok:true }, error:null }; } };
  await cctOpen(); await sleep(60);
  const txt=(document.querySelector('#cctModal .cct-dlg')||{}).textContent||'';
  ok('My month · "Missed in the last 30 days" with a picker for Rose; Eve shows approved leave, never counts', /Missed in the last 30 days/.test(txt)&&!!document.getElementById('cctCz_follow_up:l1:2026-11-18')&&/Approved leave \(you were out\)/.test(txt), txt.slice(0,600));
  document.getElementById('cctCz_follow_up:l1:2026-11-18').value='client'; document.getElementById('cctCn_follow_up:l1:2026-11-18').value='Family asked us to wait';
  await cctCause('follow_up:l1:2026-11-18'); await sleep(60);
  ok('My month · Save sends the cause and the note', calls.some(c=>c.action==='set_cause'&&c.key==='follow_up:l1:2026-11-18'&&c.cause==='client'&&c.note==='Family asked us to wait'), calls);
  cctClose();
  /* ── settings ── */
  lhSetFill();
  ok('settings · off now, and Krystal (not an owner) sees no button', /Off\./.test(document.getElementById('ocSetNow').textContent)&&document.getElementById('ocToggleBtn').style.display==='none');
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
    pg.goto('http://hub.test/index.html?proof=cause'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

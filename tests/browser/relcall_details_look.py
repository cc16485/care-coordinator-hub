"""Concerns, follow-ups and the welcome call (audit step 4, Samantha 2026-10-18): with the switch on, a relationship call that
reaches the family can carry a concern (sent to Client Care through the issues intake) and a follow-up (a card for its owner by
a date); a voicemail cannot; a failed send says so and keeps the concern; the welcome call logs attempts and only a
conversation completes it; off = the simple log. Servers faked; made-up people only. (python3 tests/browser/relcall_details_look.py)"""
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
  DATA.ops_settings={ relcall_details_live:true, relationship_calls_live:true, relationship_calls_live_since:new Date(Date.now()-40*864e5).toISOString(), lead_rotation_live:true, lead_rotation:{ people:[{ name:'Krystal', on:true }, { name:'Angiel', on:true }] } };
  DATA.leads=[{ id:'k1', first_name:'Kay', last_name:'One', status:'Contacted', assigned_coordinator:'Krystal', created_at:'2026-10-18T14:00:00Z', first_human_attempt_at:'2026-10-18T14:05:00Z',
    owner_turn:{ to:'Krystal', how:'turn', at:'2026-10-18T14:00:00Z', seq:1 }, original_owner:{ name:'Krystal', at:'2026-10-18T14:00:00Z', how:'turn' } }];
  DATA.referral_orgs=[]; DATA.care_assessments=[]; DATA.post_call_followups=[];
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, pop=()=>document.querySelector('.ccpop');
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  window.OPS_PEOPLE=[{ primary_email:'kry@mo-care.com', full_name:'Krystal Land' }, { primary_email:'ang@mo-care.com', full_name:'Angiel Rose' }]; (0,eval)(`OPS_PEOPLE=window.OPS_PEOPLE`);
  const ISSUES=[]; let ISSUE_FAIL=false;
  CCIssue.call=async(mode,body)=>{ ISSUES.push({ mode, body }); return ISSUE_FAIL ? { error:'issues service down' } : { issue_id:'iss1', owner:'ang@mo-care.com' }; };
  const l={ id:'r1', first_name:'Ann', last_name:'Able', client_first_name:'Rose', client_last_name:'Able', status:'Converted', assigned_coordinator:'Krystal', first_shift_at:new Date(Date.now()-3*864e5).toISOString(), comm_log:[] }; DATA.leads.push(l);
  DATA.ops_items=[{ id:'ops_rel_r1_day7', kind:'relationship_call', call_key:'day7', source_id:'r1', status:'open', owner:'kry@mo-care.com', owner_name:'Krystal Land', title:'7-day relationship call: Rose Able' }];
  const btn=document.createElement('button'); document.body.appendChild(btn);
  relCallLog('ops_rel_r1_day7', btn); await sleep(40);
  ok('on · the log asks about a concern and a follow-up', !!pop().querySelector('#relConcern')&&!!pop().querySelector('#relFuWhat')&&!!pop().querySelector('#relFuDue'));
  pop().querySelector('input[value=voicemail]').click(); await sleep(20);
  ok('voicemail · the concern and follow-up fields hide', pop().querySelector('#relMore').style.display==='none');
  pop().querySelector('input[value=talked]').click(); pop().querySelector('#relNote').value='Going well';
  pop().querySelector('#relConcern').value='Rose fell on Sunday'; pop().querySelector('#relFuWhat').value='Check that the walker came';
  pop().querySelector('#relGo').click(); await sleep(40);
  ok('follow-up · refused without a date', L.alerts.some(a=>/who owns it and by when/.test(a))&&!!pop(), L.alerts);
  const d=new Date(Date.now()+3*864e5).toLocaleDateString('en-CA',{timeZone:'America/Chicago'});
  pop().querySelector('#relFuDue').value=d; pop().querySelector('#relFuOwner').value='ang@mo-care.com';
  pop().querySelector('#relGo').click(); await sleep(200);
  const e=l.relationship_calls.at(-1), fu=DATA.ops_items.find(x=>x.kind==='relationship_followup');
  ok('talked · the concern went to Client Care through the issues intake (needs triage, from the family)', ISSUES.length===1&&ISSUES[0].mode==='intake=1'&&ISSUES[0].body.category==='needs_triage'&&/Rose fell on Sunday/.test(ISSUES[0].body.summary)&&ISSUES[0].body.reported_by_role==='family'&&e.issue_id==='iss1', { ISSUES, e });
  ok('talked · the follow-up is a card for Angiel by that date, and the call card is done', fu&&fu.owner==='ang@mo-care.com'&&/Check that the walker came/.test(fu.next_action)&&e.followup.card===fu.id&&DATA.ops_items.find(x=>x.id==='ops_rel_r1_day7').status==='done', { fu, e });
  window.ccPrompt=async()=>'Called the supplier, walker arrives Friday';
  await relFollowupDone(fu.id); await sleep(40);
  ok('follow-up done · needs what was done; kept on the card and the family', fu.status==='done'&&/walker arrives Friday/.test(fu.close_note)&&l.comm_log.some(c=>/Follow-up done/.test(c.body)), fu);
  /* a failed concern send is never silent */
  ISSUE_FAIL=true; L.alerts.length=0;
  DATA.ops_items.push({ id:'ops_rel_r1_day30', kind:'relationship_call', call_key:'day30', source_id:'r1', status:'open', owner:'kry@mo-care.com', owner_name:'Krystal Land', title:'30-day relationship call: Rose Able' });
  await relCallSave('ops_rel_r1_day30','talked','Fine',{ concern:'Wants a different caregiver', followup:null }); await sleep(80);
  ok('concern send failed · she is told, and the concern stays on the call', L.alerts.some(a=>/could not be sent to Client Care/.test(a))&&l.relationship_calls.at(-1).concern_error==='issues service down'&&l.relationship_calls.at(-1).concern==='Wants a different caregiver', L.alerts);
  ISSUE_FAIL=false;
  /* the welcome call */
  let talked=null; const l2={ id:'w1', first_name:'Bo', client_first_name:'Bea', status:'Converted', assigned_coordinator:'Krystal', comm_log:[] }; DATA.leads.push(l2);
  relWelcomeLog('w1', btn, async (x)=>{ talked=x; }); await sleep(40);
  ok('welcome · the same log opens, titled for the family', /Welcome call: Bea/.test(pop().textContent));
  pop().querySelector('input[value=no_answer]').click(); pop().querySelector('#relGo').click(); await sleep(80);
  ok('welcome · no answer is kept as an attempt and does NOT complete the step', talked===null&&l2.relationship_calls.length===1&&l2.relationship_calls[0].key==='welcome'&&l2.relationship_calls[0].outcome==='no_answer');
  relWelcomeLog('w1', btn, async (x)=>{ talked=x; }); await sleep(40);
  pop().querySelector('input[value=talked]').click(); pop().querySelector('#relNote').value='They feel good about the first visit'; pop().querySelector('#relGo').click(); await sleep(100);
  ok('welcome · a conversation with a note completes it (the journey step is finished from here)', talked&&talked.key==='welcome'&&/feel good/.test(talked.note), talked);
  /* off */
  DATA.ops_settings.relcall_details_live=false; relCallLog('ops_rel_r1_day7', btn); await sleep(40);
  ok('off · the simple log, no concern or follow-up fields', !pop().querySelector('#relConcern')&&!pop().querySelector('#relFuWhat'));
  ccPopClose();
  lhSetFill();
  ok('settings · off, and Krystal (not an owner) sees no button', /Off\./.test(document.getElementById('rdSetNow').textContent)&&document.getElementById('rdToggleBtn').style.display==='none');
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
    pg.goto('http://hub.test/index.html?proof=relcalldetails'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

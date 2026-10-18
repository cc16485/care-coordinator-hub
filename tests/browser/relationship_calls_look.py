"""Relationship calls (Care Coordinator Leads and Bonus, Stage 3, policy approved by Samantha 2026-10-18): after a client's
first visit the 7-day and then the 30-day relationship call come as one card for the client's Care Coordinator (the
journey's), Log the call records who and what, a call that reached nobody keeps the card, care stopping closes it, older
clients are left alone, and with the switch OFF there are no cards. The real page, offline, made-up people only.
(python3 tests/browser/relationship_calls_look.py)"""
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
  DATA.ops_settings={ relationship_calls_live:true, relationship_calls_live_since:new Date(Date.now()-40*864e5).toISOString(), lead_rotation_live:true, lead_rotation:{ people:[{ name:'Krystal', on:true }, { name:'Angiel', on:true }] } };
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
  const ago=d=>new Date(Date.now()-d*864e5).toISOString();
  const J={}; window.cjJourneyFor=o=>J[o&&o.lead&&o.lead.id]||null;
  window.opsCanonicalPerson=n=>({ krystal:'kry@mo-care.com', angiel:'ang@mo-care.com' })[String(n||'').toLowerCase().split(' ')[0]]||'';
  const mk=(id,extra)=>{ const l=Object.assign({ id, first_name:'Dee', last_name:'Ward'+id, client_first_name:'Ruth', client_last_name:'Ward'+id, status:'Converted', said_yes_at:ago(20), assigned_coordinator:'Krystal', created_at:ago(30), comm_log:[] }, extra||{}); DATA.leads.push(l); return l; };
  const card=id=>(DATA.ops_items||[]).find(i=>i.id===id);
  DATA.ops_items=[];

  /* ── first visit 3 days ago; the journey says Angiel is the client's Care Coordinator ── */
  const a=mk('r1',{ first_shift_at:ago(3) }); J.r1={ status:'active', assigned_cc:'ang@mo-care.com' };
  opsReconcileLeads(); await sleep(40);
  let c=card('ops_rel_r1_day7');
  ok('day 3 · one 7-day relationship call card, for Angiel (the journey’s Care Coordinator), not supervisory', c&&c.status==='open'&&c.owner==='ang@mo-care.com'&&/7-day relationship call/.test(c.title)&&/not a supervisory visit/.test(c.detail), c);
  ok('day 3 · no 30-day card yet (one at a time)', !card('ops_rel_r1_day30'));
  const act=obligationOpenAction(c)||'';
  ok('card · Log the call and Open the family buttons', /Log the call/.test(act)&&/Open the family/.test(act), act.slice(0,300));

  /* ── a call that reached nobody keeps the card ── */
  await relCallSave('ops_rel_r1_day7','no_answer',''); await sleep(60);
  ok('no answer · recorded, the card stays', card('ops_rel_r1_day7').status==='open'&&a.relationship_calls.length===1&&a.relationship_calls[0].outcome==='no_answer'&&a.relationship_calls[0].by==='kry@mo-care.com', a.relationship_calls);

  /* ── the popup: talked needs a note ── */
  const btn=document.createElement('button'); document.body.appendChild(btn); relCallLog('ops_rel_r1_day7', btn); await sleep(40);
  pop().querySelector('#relGo').click(); await sleep(40);
  ok('popup · "Talked" with no note is refused', L.alerts.some(x=>/short note/.test(x))&&!!pop(), L.alerts);
  pop().querySelector('#relNote').value='Going well, likes her caregiver'; pop().querySelector('#relGo').click(); await sleep(150);
  c=card('ops_rel_r1_day7');
  ok('talked · the card is done, the note kept, Krystal recorded as the helper for Angiel’s family', c.status==='done'&&/Going well/.test(c.close_note)&&/Krystal helped; it stays Angiel’s family/.test(a.comm_log.at(-1).body), { st:c.status, log:a.comm_log.at(-1) });
  opsReconcileLeads(); await sleep(40);
  ok('day 3 after the 7-day call · still no 30-day card (opens day 25), and the 7-day card stays done', !card('ops_rel_r1_day30')&&card('ops_rel_r1_day7').status==='done');

  /* ── the 30-day call ── */
  const b=mk('r2',{ first_shift_at:ago(26), relationship_calls:[{ key:'day7', outcome:'talked', at:ago(19), by:'kry@mo-care.com' }] }); J.r2={ status:'active', assigned_cc:'kry@mo-care.com' };
  opsReconcileLeads(); await sleep(40);
  ok('day 26, 7-day logged · the 30-day card for Krystal', card('ops_rel_r2_day30')&&card('ops_rel_r2_day30').status==='open'&&card('ops_rel_r2_day30').owner==='kry@mo-care.com', card('ops_rel_r2_day30'));
  const late=mk('r3',{ first_shift_at:ago(12) });
  opsReconcileLeads(); await sleep(40);
  ok('no journey on file · the lead’s owner gets it; 12 days in, the 7-day card is past due', card('ops_rel_r3_day7')&&card('ops_rel_r3_day7').owner==='kry@mo-care.com'&&Date.parse(card('ops_rel_r3_day7').due)<Date.now(), card('ops_rel_r3_day7'));

  /* ── care stops: the card closes ── */
  J.r2.status='closed'; opsReconcileLeads(); await sleep(40);
  ok('care ended (journey closed) · the open card closes', card('ops_rel_r2_day30').status==='done'&&/Care stopped/.test(card('ops_rel_r2_day30').auto_closed_reason), card('ops_rel_r2_day30'));

  /* ── older clients are left alone ── */
  mk('r4',{ first_shift_at:ago(45) }); opsReconcileLeads(); await sleep(40);
  ok('first visit before the switch went on · no card', !card('ops_rel_r4_day7')&&!card('ops_rel_r4_day30'));

  /* ── settings ── */
  lhSetFill();
  ok('settings · On, and Krystal (not an owner) sees no switch', /On\./.test(document.getElementById('rcSetNow').textContent)&&document.getElementById('rcToggleBtn').style.display==='none', document.getElementById('rcSetNow').textContent);

  /* ── switch OFF: no new cards ── */
  DATA.ops_settings.relationship_calls_live=false;
  mk('r5',{ first_shift_at:ago(3) }); opsReconcileLeads(); await sleep(40);
  ok('off · no card for a new first visit', !card('ops_rel_r5_day7'));
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
    pg.goto('http://hub.test/index.html?proof=relcalls'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

"""Follow-up rules (Care Coordinator Leads and Bonus, Stage 2, policy approved by Samantha 2026-10-18): a call log carries the
next follow-up date (by 2 days after a first call that reached nobody), "No more follow-up" closes the lead, Save for Future
needs a check-back date and a card comes back that day, the board shows a late second try in red, a teammate's call is
recorded as helping, the workspace owner picker follows the owners-only rule, and with the switch OFF everything is as before.
The real page, offline, made-up people only; saves are recorded, never sent. (python3 tests/browser/lead_followup_look.py)"""
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
  DATA.ops_settings={ lead_followup_live:true, lead_rotation_live:true, lead_rotation:{ people:[{ name:'Krystal', on:true }, { name:'Angiel', on:true }] } };
  DATA.leads=[{ id:'k1', first_name:'Kay', last_name:'One', status:'Contacted', assigned_coordinator:'Krystal', created_at:'2026-10-18T14:00:00Z', first_human_attempt_at:'2026-10-18T14:05:00Z',
    owner_turn:{ to:'Krystal', how:'turn', at:'2026-10-18T14:00:00Z', seq:1 }, original_owner:{ name:'Krystal', at:'2026-10-18T14:00:00Z', how:'turn' } }];
  DATA.referral_orgs=[]; DATA.care_assessments=[]; DATA.post_call_followups=[];
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, $=id=>document.getElementById(id), pop=()=>document.querySelector('.ccpop');
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  const T0=today(), plus=n=>LeadRules.addDays(T0,n);
  const pick=o=>{ const r=pop().querySelector('.ccpick-row[data-o='+o+']'); r.click(); };
  const shown=el=>!!el&&el.style.display!=='none';
  const mk=(id,extra)=>{ const l=Object.assign({ id, first_name:'Gil', last_name:'Ray'+id, status:'New', assigned_coordinator:'Krystal', created_at:new Date(Date.now()-3600e3).toISOString(), comm_log:[] }, extra||{}); DATA.leads.push(l); return l; };

  /* ── a first call that reaches nobody ── */
  let l=mk('g1'); commsLead=l; logManualCall(); await sleep(60);
  pick('voicemail'); await sleep(30);
  ok('voicemail · the Next follow-up box shows, set to 2 days out and no later', shown($('ldNextWrap'))&&$('ldNextDate').value===plus(2)&&$('ldNextDate').max===plus(2), { v:$('ldNextDate').value, max:$('ldNextDate').max });
  $('ldNextDate').value=plus(4); $('ldCallGo').click(); await sleep(60);
  ok('voicemail · a date past the 2 days is refused', L.alerts.some(a=>/second try is within 2 days/.test(a))&&!!pop(), L.alerts);
  $('ldNextDate').value=plus(1); $('ldCallGo').click(); await sleep(120);
  ok('voicemail · logged with the follow-up date', l.follow_up_due===plus(1)&&l.contact_events.length===1&&l.comm_log.some(c=>/Next follow-up/.test(c.body)), { fu:l.follow_up_due, ev:(l.contact_events||[]).length });

  /* ── a conversation needs a date; "No more follow-up" closes it ── */
  commsLead=l; logManualCall(); await sleep(60); pick('connected'); await sleep(30);
  ok('connected · required, no 2-day limit', shown($('ldNextWrap'))&&!$('ldNextDate').max, $('ldNextDate').max);
  $('ldNextDate').value=''; $('ldCallGo').click(); await sleep(60);
  ok('connected · no date: refused', L.alerts.some(a=>/Pick the next follow-up date/.test(a))&&!!pop());
  window.askLostReason=async()=>({ lost_reason:'Chose another agency', lost_reason_key:'chose_agency' });
  $('ldNextClose').checked=true; $('ldCallGo').click(); await sleep(250);
  ok('connected · "No more follow-up" logs it and closes it as lost with a reason', l.status==='Lost'&&l.lost_reason_key==='chose_agency'&&l.contact_events.length===2, { st:l.status, k:l.lost_reason_key });

  /* ── they asked for a call back: their date is the next date ── */
  l=mk('g2'); commsLead=l; logManualCall(); await sleep(60); pick('requested_callback'); await sleep(30);
  ok('call back · no extra box (their date carries it)', !shown($('ldNextWrap'))&&shown($('ldCbWrap')));
  ccPopClose();

  /* ── a teammate's call is recorded as helping ── */
  l=mk('g3',{ assigned_coordinator:'Angiel' }); commsLead=l; logManualCall(); await sleep(60); pick('no_answer'); await sleep(30);
  $('ldCallGo').click(); await sleep(120);
  ok('helper · Krystal calling Angiel’s lead is recorded as helping; it stays Angiel’s', l.assigned_coordinator==='Angiel'&&(l.helpers||[]).some(h=>h.name==='Krystal'&&h.what==='a call'), l.helpers);

  /* ── the board ── */
  const old=new Date(Date.now()-4*864e5).toISOString();
  mk('g4',{ first_human_attempt_at:old, contact_attempts:1, contact_events:[{ at:old, channel:'call', direction:'out', outcome:'voicemail', actor:'human', by:'kry@mo-care.com' }] });
  renderLeadsStarts(); await sleep(200);
  ok('board · a late second try shows red', /Second try \d+ days late/.test(($('lbBoard')||{}).textContent||''), (($('lbBoard')||{}).textContent||'').slice(0,400));

  /* ── save for future needs a check-back date, and the card comes back that day ── */
  l=mk('g5',{ client_city:'Bolivar', county:'Polk' }); FutureOpps.save('g5'); await sleep(80);
  ok('save · the check-back date is required', /Check back on \(required/.test(document.getElementById('foModal').textContent));
  document.getElementById('foGo').click(); await sleep(60);
  ok('save · no date: refused', /Pick the check-back date/.test(document.getElementById('foErr').textContent), document.getElementById('foErr').textContent);
  document.getElementById('foLook').value=T0; document.getElementById('foGo').click(); await sleep(200);
  ok('save · saved with the check-back date', l.status==='Saved'&&l.future&&l.future.look_again===T0, l.future);
  opsReconcileLeads(); await sleep(50);
  let card=(DATA.ops_items||[]).find(i=>i.id==='ops_future_g5');
  ok('card · on the check-back day the family’s Care Coordinator gets one card (same owner rule as inquiry cards); it says not to call (no permission)', card&&card.status==='open'&&card.owner===(opsCanonicalPerson('Krystal')||opsDomainOwner('family_enquiries')||'')&&/don't call/.test(card.next_action), card);
  l.future.look_again=plus(30); opsReconcileLeads(); await sleep(50); card=(DATA.ops_items||[]).find(i=>i.id==='ops_future_g5');
  ok('card · saved again with a later date: the card closes', card&&card.status==='done', card&&card.status);

  /* ── the workspace owner picker ── */
  window.CP=window.CP||{}; CP.lead=DATA.leads.find(x=>x.id==='g3');
  L.alerts.length=0; await lwOwner('Krystal'); await sleep(60);
  ok('workspace · Krystal (not an owner) can’t move the lead', CP.lead.assigned_coordinator==='Angiel'&&L.alerts.some(a=>/Only Samantha or Zachary/.test(a)), L.alerts);

  /* ── switch OFF: as before ── */
  DATA.ops_settings.lead_followup_live=false;
  l=mk('g6'); commsLead=l; logManualCall(); await sleep(60); pick('voicemail'); await sleep(30);
  ok('off · no Next follow-up box', !shown($('ldNextWrap')));
  $('ldCallGo').click(); await sleep(120);
  ok('off · logs with no date, as before', l.contact_events.length===1&&!l.follow_up_due);
  renderLeadsStarts(); await sleep(200);
  ok('off · no second-try rows on the board', !/Second try/.test(($('lbBoard')||{}).textContent||''));
  l=mk('g7',{ client_city:'Bolivar', county:'Polk' }); FutureOpps.save('g7'); await sleep(80);
  ok('off · Save for future: the date is optional again', /Look again by \(optional\)/.test(document.getElementById('foModal').textContent));
  document.getElementById('foGo').click(); await sleep(200);
  ok('off · saves with no date', l.status==='Saved', l.status);
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
    pg.goto('http://hub.test/index.html?proof=followup'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

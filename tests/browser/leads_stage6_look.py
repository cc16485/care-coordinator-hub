"""Clean-up 6.1 / 6.2: one card per family, one next per lead. The real page, offline, made-up families, the clock frozen at Tue
Oct 6 2026 10:10 am Chicago. Proves: once a client journey carries a family (journeys live), the Hub closes the inquiry card and
says why; the board's Set follow-up goes through the one writer (a waiting family's check-back moves with it); logging a call
with "they asked us to call back" writes the promise through the same writer and the board reads it back as the one next.
(python3 tests/browser/leads_stage6_look.py, static server on 8765)"""
from playwright.sync_api import sync_playwright
STUB = r"""
(()=>{
  const W=window; W.__log={ writes:[] };
  (0,eval)(`window.__RealDate=Date; window.__NOW=new __RealDate('2026-10-06T15:10:00Z').getTime();
    Date=class extends __RealDate{ constructor(...a){ if(a.length) super(...a); else super(window.__NOW); } static now(){ return window.__NOW; } };`);
  (0,eval)(`sb={ from:()=>{ const p={ select(){return p;}, eq(){return p;}, in(){return p;}, not(){return p;}, order(){return p;}, limit(){return p;},
      maybeSingle:async()=>({data:null,error:null}), then(a){ return Promise.resolve({data:[],error:null}).then(a); } }; return p; },
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async()=>({data:null,error:null}) }, auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };`);
  W.persist=async(k,v)=>{ W.__log.writes.push(JSON.parse(JSON.stringify(v))); };
  W.lsLoadFacts=async()=>{ LS.facts={ epOf:{}, scOf:{}, planOf:{} }; }; W.ccToast=()=>{}; W.opEvent=()=>{}; W.renderCommsTimeline=()=>{}; W.myWorkRefresh=()=>{};
  /* the journey list, faked: Lorene has a live journey; nobody else */
  W.__journeys=[{ journey_id:'j1', lead_id:'lor', status:'open', stage:'prechecks', is_test:false, next:{ key:'med.fusion', title:'Review FUSION', status:'ready' }, ref:'Llor' }];
  W.cjJourneyFor=o=>{ const id=o&&o.lead&&String(o.lead.id); return W.__journeys.find(j=>String(j.lead_id)===id)||null; };
  DATA.ops_settings={ lead_response_hours:{ days:[0,1,2,3,4,5,6], start:'08:00', end:'18:00' }, client_journey_live:true };
  DATA.referral_orgs=[]; DATA.care_assessments=[]; DATA.post_call_followups=[];
  const mk=(id,who,at)=>({ id:'ops_lead_'+id, kind:'new_lead', source_id:id, title:'New lead: '+who, status:'open', created_at:at, due:at, owner:'krystal@mo-care.com', domain:'family_enquiries', urgency:'normal', lead_contacted_at:at.slice(0,10) });
  DATA.ops_items=[ mk('lor','Carla Abbott','2026-09-24T13:00:00Z'), mk('har','Harold Pruitt','2026-10-01T13:00:00Z') ];
  DATA.leads=[
    { id:'lor', first_name:'Carla', last_name:'Abbott', client_first_name:'Lorene', client_last_name:'Abbott', why_called:'Daughter manages for now', funding_source:'medicaid', desired_start:{ kind:'asap' }, client_city:'Marshfield', status:'Contacted', phone:'4175550117', assigned_coordinator:'Krystal',
      waiting:{ reason:'state', since:'2026-10-01', check_back:'2026-10-13', note:'DCN in' }, first_human_contact_at:'2026-10-01T14:00:00Z', last_contacted_at:'2026-10-01', created_at:'2026-10-01T13:00:00Z', contact_events:[{ at:'2026-10-01T14:00:00Z', channel:'call', direction:'out', outcome:'connected', actor:'human' }] },
    { id:'har', first_name:'Harold', last_name:'Pruitt', client_first_name:'Harold', client_last_name:'Pruitt', why_called:'Calling for himself', funding_source:'va', desired_start:{ kind:'asap' }, client_city:'Ozark', status:'Contacted', phone:'4175550177', assigned_coordinator:'Krystal', follow_up_due:'2026-10-08',
      first_human_contact_at:'2026-10-01T20:00:00Z', last_contacted_at:'2026-10-01', created_at:'2026-10-01T13:00:00Z', contact_events:[{ at:'2026-10-01T20:00:00Z', channel:'call', direction:'out', outcome:'connected', actor:'human' }] } ];
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,800)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  switchTab('leadsstarts'); await sleep(500); renderLeadsStarts(); await sleep(200);
  const rows=()=>[...document.querySelectorAll('#lbBoard .lb-row')], row=n=>rows().find(r=>new RegExp(n).test(r.innerText)), T=()=>document.getElementById('lbBoard').innerText;
  const card=id=>DATA.ops_items.find(i=>i.id==='ops_lead_'+id);
  opsReconcileLeads();
  ok('Lorene has a live journey: her inquiry card is closed and says the journey card carries her now', card('lor').status==='done' && card('lor').closed_by==='journey' && /journey card carries/.test(card('lor').auto_closed_reason), card('lor'));
  ok('Harold has no journey: his inquiry card stays open, parked until his follow-up on Thursday', card('har').status==='open' && card('har').sub_state==='waiting' && card('har').check_back==='2026-10-08', card('har'));
  /* the board's Set follow-up on Lorene (waiting on the state): her check-back moves with it */
  const lor=row('Lorene'); lor.querySelector('.lb-more').click(); await sleep(80);
  [...document.querySelectorAll('.ccpop .ccpick-row')].find(x=>/Set a follow-up/.test(x.textContent)).click(); await sleep(120);
  const pop=document.querySelector('.ccpop'); pop.querySelector('#lbFuDate').value='2026-10-20'; pop.querySelector('#lbFuTime').value=''; pop.querySelector('#lbFuNote').value='ask DSDS about the hours'; pop.querySelector('#lbFuGo').click(); await sleep(300);
  const l=DATA.leads.find(x=>x.id==='lor');
  ok('Set follow-up went through the one writer: follow_up_due Oct 20 AND waiting.check_back Oct 20, note kept', l.follow_up_due==='2026-10-20' && l.waiting.check_back==='2026-10-20' && l.follow_up_note==='ask DSDS about the hours', [l.follow_up_due, l.waiting]);
  ok('...the board reads ONE next: Waiting · Next check Oct 20', /The state[\s\S]*Lorene Abbott[\s\S]*Next check Oct 20/.test(T()), T().slice(T().indexOf('WAITING')));
  /* logging a call with "they asked us to call back" writes the promise through the same writer */
  const h=DATA.leads.find(x=>x.id==='har'); commsLead=h;
  await ldLogCall('requested_callback', 'wants Tuesday', '2026-10-13', '16:30'); await sleep(200); renderLeadsStarts(); await sleep(150);
  ok('the promise is written as Central wall-clock with the follow-up day', h.promised_callback_at==='2026-10-13T16:30:00' && h.follow_up_due==='2026-10-13', [h.promised_callback_at, h.follow_up_due]);
  const nx=LeadRules.leadNext(h);
  ok('leadNext reads it back as the one next: a promise, Oct 13 4:30 pm, "Call back: we said Oct 13 4:30 pm"', nx.kind==='promise' && nx.day==='2026-10-13' && LeadRules.nextWords(nx)==='Call back: we said Oct 13 4:30 pm', [nx, LeadRules.nextWords(nx)]);
  ok('...and the board shows Harold under Scheduled · Oct 13 · 4:30 pm · callback we promised', /OCT 13\n4:30 pm\ncallback we promised\nHarold Pruitt/i.test(T()), T().slice(T().indexOf('SCHEDULED')));
  ok('...his inquiry card is parked until Oct 13 (the same date, the same reader)', card('har').sub_state==='waiting' && card('har').check_back==='2026-10-13', card('har'));
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1360, 'height': 900})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=leads6'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

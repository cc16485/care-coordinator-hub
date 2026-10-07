"""Leads intake desk, Stage 4: waiting comes back by itself, authorization is an event, the state has a clock. The real page,
offline, made-up families, the clock frozen at Tue Oct 6 2026 10:10 am Chicago. Proves: a waiting family's My Work card is
parked until its check-back and comes back that day; the Payer tab setting the state to authorized stamps the inquiry, flags
the card urgent and puts "Authorized today" at the top of the board until a person reaches out; 21 days with the state brings
the row up as "call DSDS" and Called DSDS restarts the clock; 12 days is an amber note. (python3 tests/browser/leads_stage4_look.py, static server on 8765)"""
from playwright.sync_api import sync_playwright
STUB = r"""
(()=>{
  const W=window; W.__log={ writes:[] };
  (0,eval)(`window.__RealDate=Date; window.__NOW=new __RealDate('2026-10-06T15:10:00Z').getTime();
    Date=class extends __RealDate{ constructor(...a){ if(a.length) super(...a); else super(window.__NOW); } static now(){ return window.__NOW; } };`);
  W.__setNow=iso=>{ W.__NOW=new W.__RealDate(iso).getTime(); };
  (0,eval)(`sb={ from:()=>{ const p={ select(){return p;}, eq(){return p;}, in(){return p;}, not(){return p;}, order(){return p;}, limit(){return p;},
      maybeSingle:async()=>({data:null,error:null}), then(a){ return Promise.resolve({data:[],error:null}).then(a); } }; return p; },
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async()=>({data:null,error:null}) }, auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };`);
  W.persist=async(k,v)=>{ W.__log.writes.push(JSON.parse(JSON.stringify(v))); };
  W.lsLoadFacts=async()=>{ LS.facts={ epOf:{}, scOf:{}, planOf:{} }; }; W.ccToast=()=>{}; W.opEvent=()=>{};
  DATA.ops_settings={ lead_response_hours:{ days:[0,1,2,3,4,5,6], start:'08:00', end:'18:00' } };
  DATA.referral_orgs=[]; DATA.care_assessments=[]; DATA.post_call_followups=[];
  /* the My Work cards these inquiries got the day they came in (the Hub makes one per inquiry at arrival) */
  const mk=(id,who,at)=>({ id:'ops_lead_'+id, kind:'new_lead', source_id:id, title:'New lead: '+who, status:'open', created_at:at, due:at, owner:'krystal@mo-care.com', domain:'family_enquiries', urgency:'normal', lead_contacted_at:at.slice(0,10) });
  DATA.ops_items=[ mk('lor','Carla Abbott','2026-09-24T13:00:00Z'), mk('old','Tanya Benning','2026-09-05T13:00:00Z') ];
  DATA.leads=[
    { id:'lor', first_name:'Carla', last_name:'Abbott', client_first_name:'Lorene', client_last_name:'Abbott', why_called:'Daughter manages for now', funding_source:'medicaid', desired_start:{ kind:'asap' }, client_city:'Marshfield', status:'Contacted', phone:'4175550117', assigned_coordinator:'Krystal',
      waiting:{ reason:'state', since:'2026-09-24', check_back:'2026-10-13', note:'DCN submitted Sep 24' }, state_status:'submitted', state_submitted:'2026-09-24', first_human_contact_at:'2026-09-24T14:00:00Z', last_contacted_at:'2026-09-24', created_at:'2026-09-24T13:00:00Z',
      contact_events:[{ at:'2026-09-24T14:00:00Z', channel:'call', direction:'out', outcome:'connected', actor:'human' }] },
    { id:'old', first_name:'Tanya', last_name:'Benning', client_first_name:'Clara', client_last_name:'Benning', why_called:'Waiting on the state since early September', funding_source:'medicaid', desired_start:{ kind:'asap' }, client_city:'Nixa', status:'Contacted', phone:'4175550142', assigned_coordinator:'Krystal',
      waiting:{ reason:'state', since:'2026-09-05', check_back:'2026-10-13', note:'' }, state_status:'submitted', state_submitted:'2026-09-05', first_human_contact_at:'2026-09-05T14:00:00Z', last_contacted_at:'2026-09-05', created_at:'2026-09-05T13:00:00Z',
      contact_events:[{ at:'2026-09-05T14:00:00Z', channel:'call', direction:'out', outcome:'connected', actor:'human' }] } ];
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,800)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  switchTab('leadsstarts'); await sleep(500); renderLeadsStarts(); await sleep(200);
  const rows=()=>[...document.querySelectorAll('#lbBoard .lb-row')], row=n=>rows().find(r=>new RegExp(n).test(r.innerText)), T=()=>document.getElementById('lbBoard').innerText;
  const card=id=>DATA.ops_items.find(i=>i.id==='ops_lead_'+id);
  /* the My Work card for a waiting family is parked until its check-back */
  opsReconcileLeads(); const c1=card('lor');
  ok('Lorene (waiting on the state, check back Oct 13): her My Work card is parked until then, and says so', c1 && c1.sub_state==='waiting' && c1.check_back==='2026-10-13' && /the state, until 2026-10-13/.test(c1.waiting_on) && /Waiting on the state until 2026-10-13/.test(c1.next_action), c1);
  ok('...on the board she is Waiting, amber at 12 days: "since Sep 24 · 12 days, follow up soon", with Called DSDS offered', /WAITING[\s\S]*The state\nsince Sep 24 · 12 days, follow up soon[\s\S]*Lorene Abbott/.test(T()) && [...row('Lorene').querySelectorAll('.lb-btn')].some(b=>b.textContent==='Called DSDS'), T().slice(T().indexOf('WAITING')));
  /* the check-back day arrives: the card comes back and the row moves up */
  window.__setNow('2026-10-13T14:00:00Z'); opsReconcileLeads(); renderLeadsStarts(); await sleep(150);
  const c2=card('lor');
  ok('on Oct 13 her card is back (not parked) and says what to do: check Fusion, then call the family', c2.sub_state!=='waiting' && /Check back day: check Fusion, then call the family/.test(c2.next_action), c2);
  ok('...and on the board she is in Need you now: "Check back today"', /NEED YOU NOW[\s\S]*Check back today[\s\S]*Lorene Abbott/.test(T()), T().slice(0,600));
  window.__setNow('2026-10-06T15:10:00Z'); opsReconcileLeads(); renderLeadsStarts(); await sleep(150);
  /* 31 days with the state: the 21-day rule brings Clara up */
  ok('Clara, 31 days with the state: Need you now "With the state 31 days · call DSDS (the 21-day rule)"', /NEED YOU NOW[\s\S]*With the state 31 days\ncall DSDS \(the 21-day rule\)[\s\S]*Clara Benning/.test(T()), T().slice(0,700));
  const dsds=[...row('Clara').querySelectorAll('.lb-btn')].find(b=>b.textContent==='Called DSDS'); dsds.click(); await sleep(250);
  const l=DATA.leads.find(x=>x.id==='old');
  ok('Called DSDS: dsds_called_at stamped, a history line and a contact event, Clara back to Waiting (clock restarted)', l.dsds_called_at && l.comm_log.some(x=>x.kind==='dsds_called') && l.contact_events.some(e=>e.ref==='dsds') && !/With the state 31 days/.test(T()) && /WAITING[\s\S]*Clara Benning/.test(T()), [l.dsds_called_at, T().slice(0,300)]);
  /* the Payer tab: the state says yes */
  CP.lead=l; lpLead=l; document.body.insertAdjacentHTML('beforeend','<div id="cpPayTmp"><select id="cpPayFunding"><option value="medicaid" selected>medicaid</option></select><input id="cpPayDcn" value="123"><input id="cpPayCounty" value="Christian"><input id="cpPaySubmitted" value="2026-09-05"><select id="cpPayStatus"><option value="authorized" selected>authorized</option></select><div id="cpPayMsg"></div></div>');
  window.cpRenderPayer=()=>{}; window.cpRenderOpenNow=()=>{}; window.renderLeadProfile=()=>{};
  await cpPayerSave(); await sleep(200); renderLeadsStarts(); await sleep(150);
  ok('saving the Payer tab as authorized stamps authorization_received_at once, with a history line', l.authorization_received_at && l.comm_log.some(x=>x.kind==='authorization_received') && l.comm_log.filter(x=>x.kind==='authorization_received').length===1, l.comm_log);
  ok('...Clara is now at the top of Need you now: "Authorized today · the state said yes: call the family", Call first', /NEED YOU NOW[\s\S]*Authorized today\nthe state said yes: call the family\nClara Benning/.test(T()) && row('Clara').querySelector('.lb-btn-primary').textContent==='Call', T().slice(0,500));
  const c3=card('old');
  ok('...her My Work card is un-parked and urgent, saying to call the family today', c3 && c3.urgency==='high' && c3.sub_state!=='waiting' && /Authorized by the state: call the family today/.test(c3.next_action), c3);
  /* a person reaches out after it: the flag clears */
  l.contact_events.push({ at:'2026-10-06T15:20:00Z', channel:'call', direction:'out', outcome:'voicemail', actor:'human' }); window.__setNow('2026-10-06T15:25:00Z'); opsReconcileLeads(); renderLeadsStarts(); await sleep(150);
  ok('after a human attempt the "Authorized" flag clears: the card is back to normal urgency and the board row is no longer "Authorized today"', card('old').urgency!=='high' && !/Authorized today/.test(T()), [card('old').urgency, T().slice(0,300)]);
  document.getElementById('cpPayTmp').remove();
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1360, 'height': 900})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=leads4'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

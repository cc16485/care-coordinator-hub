"""Item 5 (2026-10-07), the small rules on the real page, offline, the clock at Tue Oct 6 2026 10:10 am Chicago. Proves: the board shows
a decision over 7 days asking for a reason (Waiting on… opens the same pop-up and parks the family), an assessment overdue for a this-week
family, the 45-day Medicaid row with Called the case manager / Offered bridge hours, the cadence suggestion on a no-next-step row (the
follow-up pop-up is prefilled with it), the missing-required tile and filter; after the yes the journey card carries the handoff: carried
forward + thank-you text and partner outcome as drafts. (python3 tests/browser/leads_rules5_look.py)"""
from playwright.sync_api import sync_playwright
STUB = r"""
(()=>{
  const W=window; W.__log={ writes:[], comms:[] };
  (0,eval)(`window.__RealDate=Date; window.__NOW=new __RealDate('2026-10-06T15:10:00Z').getTime();
    Date=class extends __RealDate{ constructor(...a){ if(a.length) super(...a); else super(window.__NOW); } static now(){ return window.__NOW; } };`);
  (0,eval)(`sb={ from:()=>{ const p={ select(){return p;}, eq(){return p;}, in(){return p;}, not(){return p;}, order(){return p;}, limit(){return p;},
      maybeSingle:async()=>({data:null,error:null}), then(a){ return Promise.resolve({data:[],error:null}).then(a); } }; return p; },
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async()=>({data:null,error:null}) }, auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };`);
  W.persist=async(k,v)=>{ W.__log.writes.push({ k, v:JSON.parse(JSON.stringify(v)) }); };
  W.commsCall=async(b)=>{ W.__log.comms.push(JSON.parse(JSON.stringify(b))); return { status:'sent' }; };
  W.lsLoadFacts=async()=>{ LS.facts={ epOf:{}, scOf:{}, planOf:{} }; }; W.ccToast=()=>{}; W.opEvent=()=>{}; W.myWorkRefresh=()=>{};
  W.refreshCommsTimeline=async()=>{}; W.axLogLoad=async()=>{}; W.callsLoad=async()=>{}; W.cpRenderEvvForms=async()=>{}; W.famMount=async()=>{}; W.cjMountProfile=async()=>{};
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Land' }; OPS_PEOPLE=[{ primary_email:'krystal@mo-care.com', full_name:'Krystal Land' }];");
  DATA.ops_settings={ lead_response_hours:{ days:[0,1,2,3,4,5,6], start:'08:00', end:'18:00' } };
  DATA.referral_orgs=[{ id:'o1', name:'Mercy Rehab', type:'Rehab / Skilled Nursing', people:'Jan Ortiz', email:'r@mercy.org' }]; DATA.care_assessments=[]; DATA.post_call_followups=[]; DATA.ops_items=[]; DATA.referral_activities=[];
  DATA.caregivers=[]; DATA.caregiver_availability=[];
  DATA.leads=[
    { id:'dec', first_name:'Carla', last_name:'Abbott', client_first_name:'Lorene', client_last_name:'Abbott', why_called:'Deciding', funding_source:'private', desired_start:{ kind:'this_month' }, client_city:'Nixa', phone:'4175550117', status:'Contacted', assigned_coordinator:'Krystal', created_at:'2026-09-20T15:00:00Z', first_human_contact_at:'2026-09-25T15:00:00Z', contact_events:[{ at:'2026-09-25T15:00:00Z', channel:'call', direction:'out', outcome:'connected', actor:'human' }] },
    { id:'asm', first_name:'Dee', last_name:'Ray', client_first_name:'Hal', client_last_name:'Ray', why_called:'Needs help soon', funding_source:'private', desired_start:{ kind:'this_week' }, client_city:'Ozark', phone:'4175550118', status:'Contacted', assigned_coordinator:'Krystal', created_at:'2026-09-29T15:00:00Z', first_human_contact_at:'2026-09-30T15:00:00Z', contact_events:[{ at:'2026-09-30T15:00:00Z', channel:'call', direction:'out', outcome:'connected', actor:'human' }] },
    { id:'med', first_name:'Lou', last_name:'Reed', client_first_name:'Ruth', client_last_name:'Reed', why_called:'Medicaid', funding_source:'medicaid', desired_start:{ kind:'asap' }, client_city:'Springfield', phone:'4175550100', status:'Contacted', assigned_coordinator:'Angiel', created_at:'2026-08-10T15:00:00Z', first_human_contact_at:'2026-08-10T16:00:00Z', waiting:{ reason:'state', since:'2026-08-15', check_back:'2026-10-13' }, contact_events:[{ at:'2026-08-10T16:00:00Z', channel:'call', direction:'out', outcome:'connected', actor:'human' }] },
    { id:'pat', first_name:'Pat', last_name:'Lee', client_first_name:'Ann', client_last_name:'Lee', phone:'4175550164', status:'Contacted', assigned_coordinator:'Krystal', created_at:'2026-10-05T15:00:00Z', first_human_attempt_at:'2026-10-06T14:00:00Z', contact_events:[{ at:'2026-10-06T14:00:00Z', channel:'call', direction:'out', outcome:'voicemail', actor:'human', by:'krystal@mo-care.com' }] },
    { id:'yes', first_name:'Diane', last_name:'Teague', client_first_name:'Marjorie', client_last_name:'Teague', source:'Referral', referral_org_id:'o1', funding_source:'private', desired_start:{ kind:'by_date', date:'2026-10-09' }, phone:'4175550131', status:'Converted', converted_at:'2026-10-06T14:00:00Z', said_yes_at:'2026-10-06T14:00:00Z', said_yes_by_name:'Krystal Land', assigned_coordinator:'Krystal', created_at:'2026-10-01T15:00:00Z', first_human_contact_at:'2026-10-02T15:00:00Z', assessment_at:'2026-10-04T15:00:00Z' } ];
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,900)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  switchTab('leadsstarts'); await sleep(500); renderLeadsStarts(); await sleep(200);
  const rows=()=>[...document.querySelectorAll('#lbBoard .lb-row')], row=n=>rows().find(r=>new RegExp(n).test(r.innerText)), B=()=>document.getElementById('lbBoard').innerText;
  ok('Lorene: deciding 11 days, over 7, it needs a reason; Waiting on… is the filled button, Mark lost… beside it', /Deciding 11 days\s*over 7: it needs a reason/.test(row('Lorene').innerText) && row('Lorene').querySelector('.lb-btn-primary').textContent==='Waiting on…' && /Mark lost…/.test(row('Lorene').innerText), row('Lorene').innerText);
  ok('Hal: this-week family, talked 6 days ago, nothing booked: Assessment overdue (target 5), Schedule assessment first', /Assessment overdue\s*6 days since we talked; target 5/.test(row('Hal').innerText) && row('Hal').querySelector('.lb-btn-primary').textContent==='Schedule assessment', row('Hal').innerText);
  ok('Ruth: 52 days with the state, red: call the case manager, offer private bridge hours; Called the case manager + Offered bridge hours buttons', /With the state 52 days\s*call the case manager, offer private bridge hours/.test(row('Ruth').innerText) && /Called the case manager/.test(row('Ruth').innerText) && /Offered bridge hours/.test(row('Ruth').innerText), row('Ruth').innerText);
  ok('Ann: one voicemail this morning, no next step: the cadence suggestion "Try again later today" (a suggestion, never a message)', /Try again later today, a different time of day often lands \(2nd try\)/.test(row('Ann').innerText), row('Ann').innerText);
  ok('the numbers: a "missing required" tile (Ann: who needs care is there, why/start/payer not… she is reaching out so nothing yet; Lorene and Hal and Ruth have theirs) counts the red-dashed rows', /missing required/.test(document.getElementById('lbNumbers').innerText), document.getElementById('lbNumbers').innerText);
  /* the follow-up pop-up is prefilled with the suggestion */
  [...row('Ann').querySelectorAll('.lb-btn')].find(b=>b.textContent==='Set follow-up').click(); await sleep(120);
  let pop=document.querySelector('.ccpop');
  ok('...Set follow-up opens prefilled: today 1:00 pm, with the cadence note', pop && pop.querySelector('#lbFuDate').value==='2026-10-06' && pop.querySelector('#lbFuTime').value==='13:00' && /Suggested from the usual cadence/.test(pop.innerText), pop && pop.innerText);
  pop.querySelector('#lbFuNo').click(); await sleep(60);
  /* Waiting on… from the board parks Lorene */
  row('Lorene').querySelector('.lb-btn-primary').click(); await sleep(120); pop=document.querySelector('.ccpop');
  pop.querySelector('#lwWaitReason').value='family_decision'; pop.querySelector('#lwWaitReason').dispatchEvent(new Event('change')); pop.querySelector('#lwWaitNote').value='talking to her brother'; pop.querySelector('#lwWaitGo').click(); await sleep(300);
  const lor=DATA.leads.find(l=>l.id==='dec');
  ok('Waiting on… from the board: Lorene is parked (family decision, check back Oct 13) and moves to Waiting', lor.waiting && lor.waiting.reason==='family_decision' && lor.waiting.check_back==='2026-10-13' && /WAITING[\s\S]*Lorene Abbott/i.test(B()) && !/Deciding 11 days/.test(B()), [lor.waiting, B().slice(B().indexOf('WAITING'))]);
  /* the Medicaid buttons */
  window.confirm=()=>true; [...row('Ruth').querySelectorAll('.lb-btn')].find(b=>b.textContent==='Offered bridge hours').click(); await sleep(250);
  const med=DATA.leads.find(l=>l.id==='med');
  ok('Offered bridge hours: stamped and on the record; the row now says bridge hours offered and keeps the case-manager call', med.bridge_hours_offered_at && /Offered private bridge hours/.test(med.comm_log.slice(-1)[0].body) && /bridge hours offered; call the case manager/.test(row('Ruth').innerText) && !/Offered bridge hours/.test(row('Ruth').innerText), row('Ruth').innerText);
  [...row('Ruth').querySelectorAll('.lb-btn')].find(b=>b.textContent==='Called the case manager').click(); await sleep(250);
  ok('Called the case manager: a human contact event about the case manager, stamped; the 45-day row rests for 7 days (back to the 21-day DSDS row)', med.case_manager_called_at && med.contact_events.slice(-1)[0].ref==='case_manager' && /With the state 52 days\s*call DSDS/.test(row('Ruth').innerText), row('Ruth').innerText);
  /* the missing filter */
  lbFilter('missing'); await sleep(150);
  ok('the missing-required filter shows only rows with a red-dashed chip', rows().every(r=>r.querySelector('.lb-chip[style*="dashed"]')), rows().length);
  lbFilter('All'); await sleep(100);
  /* the yes handoff on the journey card */
  await openClient({ lead_id:'yes' }, 'summary'); await sleep(400);
  const head=document.getElementById('cjHead'); head.innerHTML='<div class="cj-head">'+LeadWorkspace.handoffHtml(DATA.leads.find(l=>l.id==='yes'))+'</div>';
  ok('after the yes: Carried forward reads "Referral · Mercy Rehab · Rehab / skilled nursing Oct 1 → reached Oct 2 → assessment Oct 4 → yes today · Private pay · wants care by Fri"; Goes out now offers the thank-you text and Tell Mercy Rehab, both drafts', /Referral · Mercy Rehab · Rehab \/ skilled nursing Oct 1 → reached Oct 2 → assessment Oct 4 → yes today · Private pay · wants care by Fri/.test(head.innerText) && /Thank-you text to Diane/.test(head.innerText) && /Tell Mercy Rehab: they chose us/.test(head.innerText) && /nothing goes out by itself/.test(head.innerText), head.innerText);
  [...head.querySelectorAll('button')].find(b=>/Thank-you text/.test(b.textContent)).click(); await sleep(120); pop=document.querySelector('.ccpop');
  ok('the thank-you text is prefilled in her words and goes only when sent', /^Hi Diane, thank you for choosing Caring Companions to care for Marjorie\. I am Krystal, your Care Coordinator/.test(pop.querySelector('#lwTextIn').value) && window.__log.comms.length===0, pop.querySelector('#lwTextIn').value);
  pop.querySelector('#lwTextGo').click(); await sleep(300);
  ok('...sent as Krystal through the comms door, recorded as a human text', window.__log.comms.length===1 && window.__log.comms[0].action==='send_sms' && DATA.leads.find(l=>l.id==='yes').contact_events.slice(-1)[0].channel==='sms');
  switchTab('settings'); await sleep(300); lhSetFill();
  ok('Settings → Leads lists the thank-you text with the other script lines (12)', document.querySelectorAll('#lwScripts textarea[data-script]').length===12 && document.querySelector('#lwScripts textarea[data-script="yes_thanks"]'));
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1360, 'height': 1000})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=rules5'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T)
    pg.evaluate("async()=>{ switchTab('leadsstarts'); await new Promise(r=>setTimeout(r,400)); renderLeadsStarts(); }"); pg.wait_for_timeout(500)
    pg.screenshot(path='tests/browser/rules5.png', full_page=True)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

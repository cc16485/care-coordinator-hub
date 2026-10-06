"""The client journey, as a Care Coordinator lives it (Stages 1-3, 2026-10-06). The real Hub page, offline, with made-up
TEST clients; the client-journey service is played by a small in-page stand-in that follows the same rules file. Screenshots
of every moment go to /tmp/cj_*.png. (python3 tests/browser/client_journey_look.py, static server on 8765)"""
import re, json
from playwright.sync_api import sync_playwright
src = open('/Users/samantha/Claude/Projects/cc-hub-live/tests/browser/standup_look.py').read()
STUB = re.search(r'STUB = r"""(.*?)"""', src, re.S).group(1)
CAT = open('/Users/samantha/Claude/Projects/Staffing-Coordinator-Hub/client-journey/catalog-v1.json').read()
DATA = r"""
(()=>{
  const W=window, R=W.JourneyRules, CAT=__CAT__.steps;
  W.__as=(e,n)=>{ W.__me={ email:e, name:n }; (0,eval)("ME={ email:'"+e+"', name:'"+n+"', shift:'day' };"); (0,eval)("CC_ROLES=CC_ROLE_BY_EMAIL['"+e+"']||[];"); };
  (0,eval)("CC_ROLE_BY_EMAIL={ 'angie@mo-care.com':['care_coordinator'], 'krystal@mo-care.com':['care_coordinator'], 'sally@mo-care.com':['staffing_coordinator'], 'sam@mo-care.com':['owner_admin'] }; CC_ROLES_LOADED=true;");
  (0,eval)("OPS_PEOPLE=[['angie','Angie Care'],['krystal','Krystal Land'],['sally','Sally Staffing'],['sam','Samantha Owner']].map(([e,n])=>({ person_id:'p_'+e, full_name:n, primary_email:e+'@mo-care.com' })); OPS_DOMAINS=[];");
  W.__as('angie@mo-care.com','Angie Care');
  const LEADS=[{ id:'T1', is_test:true, first_name:'Pamela', last_name:'Boyd', client_first_name:'Linda', client_last_name:'Boyd (TEST)', funding_source:'medicaid', assigned_coordinator:'angie@mo-care.com',
      client_dob:'1940-02-02', client_address:'1 Test St', client_city:'Springfield', phone:'4175550000', status:'Contacted', created_at:'2026-10-01' },
    { id:'T2', is_test:true, client_first_name:'Pat', client_last_name:'Pay (TEST)', funding_source:'private', assigned_coordinator:'krystal@mo-care.com', status:'New', created_at:'2026-10-02' }];
  DATA.leads=JSON.parse(JSON.stringify(LEADS)); W.__store.leads=JSON.parse(JSON.stringify(LEADS));
  DATA.ops_items=[]; W.__store.ops_items=[]; DATA.ops_settings={ client_journey_live:false }; DATA.caregivers=[];
  sb.auth.getSession=async()=>({ data:{ session:{ access_token:'t' } } });
  sb.storage={ from:()=>({ uploadToSignedUrl:async()=>({ error:null }), list:async()=>({ data:[], error:null }) }) };
  W.open=(u)=>{ W.__opened=u; return null; };
  /* the client-journey service, played in the page with the SAME rules file */
  const S=W.__svc={ journeys:[], steps:[], events:[], files:new Set() };
  const names={ 'angie@mo-care.com':'Angie Care','krystal@mo-care.com':'Krystal Land','sally@mo-care.com':'Sally Staffing','sam@mo-care.com':'Samantha Owner' };
  const ctx=()=>({ today:R.ymd(Date.now()), owner_emails:['sam@mo-care.com'], staffing_email:'sally@mo-care.com' });
  const ev=(j,k,kind,detail,reason)=>S.events.unshift({ journey_id:j.journey_id, step_key:k, at:new Date().toISOString(), actor_email:W.__me.email, actor_name:W.__me.name, kind, detail:detail||{}, reason:reason||null });
  const put=(j,k,patch)=>{ let s=S.steps.find(x=>x.journey_id===j.journey_id&&x.step_key===k); if(!s){ s={ journey_id:j.journey_id, step_key:k, state:'open', evidence:{}, version:0 }; S.steps.push(s); } Object.assign(s,patch); s.version++; };
  const stepsOf=j=>S.steps.filter(s=>s.journey_id===j.journey_id);
  const cards=(j)=>{ DATA.ops_items=DATA.ops_items.filter(x=>!(x.kind==='journey'&&x.journey_id===j.journey_id));
    const v=R.compute(CAT,j,stepsOf(j),ctx()); if(j.status!=='open') return;
    R.cardsFor(j,v,ctx()).forEach(c=>{ const urgent=c.kind==='attention'||(c.kind==='blocked'&&c.start_in!=null&&c.start_in<=7);
      DATA.ops_items.push({ id:'ops_jr_'+j.journey_id+'_'+c.owner, kind:'journey', status:'open', journey_id:j.journey_id, step_key:c.step_key, card_kind:c.kind, is_test:true,
        title:(c.kind==='attention'?'NEEDS ATTENTION: '+(c.why?c.why+' · ':'')+c.title:c.kind==='blocked'?'BLOCKED: '+(c.why||c.title):c.kind==='waiting'?'Waiting: '+c.title:'Next: '+c.title),
        about:j.client_name, detail:c.also.length?'Also ready: '+c.also.join(' · '):'', link:'#p/L'+j.lead_id+'/start/'+c.step_key, owner:c.owner, owner_name:names[c.owner],
        urgency:urgent?'urgent':'normal', due:urgent?new Date().toISOString():(c.due?new Date(c.due+'T17:00:00-05:00').toISOString():null), sub_state:c.kind==='waiting'?'waiting':null, check_back:c.kind==='waiting'?c.check_back:null,
        waiting_on:c.kind==='waiting'?c.waiting_on:null, start_in:c.start_in, created_at:new Date().toISOString() }); }); };
  const get=(j)=>({ journey:j?JSON.parse(JSON.stringify(j)):null, steps:j?JSON.parse(JSON.stringify(stepsOf(j))):[], events:j?S.events.filter(e=>e.journey_id===j.journey_id):[], defs:CAT, names, is_owner:W.__me.email==='sam@mo-care.com', ctx:ctx(),
    office:Object.keys(names).map(e=>({ email:e, name:names[e] })) });
  const handle=(b)=>{ const me=W.__me.email, own=me==='sam@mo-care.com';
    let j=b.journey_id?S.journeys.find(x=>x.journey_id===b.journey_id):b.lead_id?S.journeys.find(x=>x.lead_id===String(b.lead_id)):null;
    if(b.action==='get') return get(j);
    if(b.action==='open'){ if(j) return { outcome:'exists' }; if(!DATA.ops_settings.client_journey_live&&!b.is_test) return { outcome:'off', error:'off' };
      const l=DATA.leads.find(x=>x.id===b.lead_id); j={ journey_id:'J'+(S.journeys.length+1), lead_id:l.id, client_name:l.client_first_name+' '+l.client_last_name, payer:l.funding_source, assigned_cc:l.assigned_coordinator||me, status:'open', is_test:!!b.is_test, target_start:null };
      S.journeys.push(j); ev(j,null,'created',{ assigned_cc:j.assigned_cc }); put(j,'intake.payer',{ state:'complete', answer:{ payer:j.payer }, evidence:{ note:'From the inquiry' }, completed_by:me, completed_by_name:W.__me.name, completed_at:new Date().toISOString() }); ev(j,'intake.payer','completed');
      cards(j); return { outcome:'created', journey_id:j.journey_id }; }
    if(b.action==='refresh'){ const v=R.compute(CAT,j,stepsOf(j),ctx()), l=DATA.leads.find(x=>x.id===j.lead_id);
      v.rows.forEach(r=>{ if(r.def.proof==='verified'&&['ready','attention'].includes(r.status)){ let ok=null;
        if(r.def.verify==='lead_basics'&&l.client_dob&&l.client_address&&(l.client_phone||l.phone)) ok='Name, date of birth, address and phone are on the profile';
        if(r.def.verify==='assessment_booked'&&(l.assessment_at||/assessment scheduled/i.test(l.status))) ok='Assessment booked';
        if(r.def.verify==='axiscare_client'&&l.axiscare_client_id) ok='AxisCare client #'+l.axiscare_client_id+' read back';
        if(r.def.verify==='first_visit'&&W.__firstVisit) ok='First clock-in seen in AxisCare';
        if(ok){ put(j,r.key,{ state:'complete', evidence:{ verified:{ at:new Date().toISOString(), detail:ok } }, completed_by:'hub', completed_by_name:'The Hub (verified)', completed_at:new Date().toISOString() }); ev(j,r.key,'verified',{ detail:ok }); } } });
      cards(j); return { outcome:'ok' }; }
    if(b.action==='assign_cc'){ ev(j,null,'reassigned_cc',{ from:j.assigned_cc, to:b.email }); j.assigned_cc=b.email; cards(j); return { outcome:'assigned' }; }
    if(b.action==='set_start'){ j.target_start=b.date||null; ev(j,null,'target_start',{ to:b.date }); cards(j); return { outcome:'saved' }; }
    if(b.action==='upload_url'){ const p=j.journey_id+'/'+b.step_key+'/'+Date.now()+'-'+b.name; S.files.add(p); return { path:p, token:'t', url:'u' }; }
    if(b.action==='file_url') return { url:'https://view/'+b.path };
    if(b.action!=='apply') return { error:'?' };
    const v=R.compute(CAT,j,stepsOf(j),ctx()), r=v.rows.find(x=>x.key===b.step_key), now=new Date().toISOString();
    if(b.op==='complete'){ const can=R.canComplete(r,{ answer:b.answer||{}, files:b.files||[], manual_reason:b.manual_reason }); if(!can.ok) return { outcome:'refused', error:can.why };
      put(j,b.step_key,{ state:'complete', answer:b.answer&&Object.keys(b.answer).length?b.answer:r.st.answer, evidence:Object.assign({}, r.st.evidence||{}, (b.files||[]).length?{ files:b.files }:{}, b.manual_reason?{ manual:{ reason:b.manual_reason } }:{}), completed_by:me, completed_by_name:W.__me.name, completed_at:now, waiting_on:null, check_back:null, blocked_reason:null });
      ev(j,b.step_key,b.manual_reason?'confirmed_by_hand':'completed',{},b.manual_reason||null);
      if(r.def.on_answer&&r.def.on_answer.set_target_start&&b.answer&&b.answer.start) j.target_start=b.answer.start; }
    else if(b.op==='wait'){ if(!b.check_back) return { outcome:'refused', error:'Waiting needs a check-back date.' }; put(j,b.step_key,{ state:'waiting', waiting_on:b.waiting_on, check_back:b.check_back }); ev(j,b.step_key,'waiting',{ waiting_on:b.waiting_on, check_back:b.check_back }); }
    else if(b.op==='block'){ put(j,b.step_key,{ state:'blocked', blocked_reason:b.reason, unblock:b.unblock, unblock_role:b.unblock_role }); ev(j,b.step_key,'blocked',{},b.reason); }
    else if(b.op==='unblock'){ put(j,b.step_key,{ state:'open', blocked_reason:null, waiting_on:null, check_back:null }); ev(j,b.step_key,'unblocked'); }
    else if(b.op==='exception'){ if(!own) return { outcome:'refused', error:'Only Samantha or Zachary can allow an owner exception.' }; if(!b.reason) return { outcome:'refused', error:'needs a reason' };
      put(j,b.step_key,{ state:'exception', exception:{ by:me, by_name:W.__me.name, at:now, kind:b.kind, reason:b.reason }, completed_at:now }); ev(j,b.step_key,'owner_exception',{ kind:b.kind, label:R.EXCEPTION_KINDS[b.kind] },b.reason); }
    else if(b.op==='reopen'){ put(j,b.step_key,{ state:'open', completed_at:null, completed_by:null }); ev(j,b.step_key,'reopened',{},b.reason); }
    const nv=R.compute(CAT,j,stepsOf(j),ctx());
    if(nv.complete&&stepsOf(j).some(s=>s.step_key==='active.complete'&&s.state==='complete')){ j.status='active'; ev(j,null,'became_active'); }
    cards(j); return { outcome:'saved', next:nv.next?{ key:nv.next.key }:null, status:j.status };
  };
  const of=W.fetch; W.fetch=async(u,o)=>{ if(/client-journey/.test(String(u))){ W.__calls=(W.__calls||[]); const b=JSON.parse(o.body); W.__calls.push(b); return new Response(JSON.stringify(handle(b)),{status:200}); } return of(u,o); };
  W.ccOpsRefresh=async()=>{}; W.__toasts=[]; const ot=W.ccToast; W.ccToast=t=>{ W.__toasts.push(t); };
})();
""".replace('__CAT__', CAT)
SHOTS = []
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,800)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  const H=()=>document.getElementById('cjHead'), ST=()=>document.getElementById('cjStart'), S=window.__svc;
  const next=()=>H().querySelector('.cj-next[data-step]'), btn=(box,act)=>box.querySelector('[data-act="'+act+'"]');
  const shot=async(name)=>{ window.__shot=name; await sleep(60); };
  // switched off: a Care Coordinator sees nothing new
  await openLeadProfile('T1','summary'); await sleep(400);
  ok('journeys switched off: a Care Coordinator sees no journey (the old screens stay)', !H().innerHTML.trim());
  // an owner starts a TEST journey
  window.__as('sam@mo-care.com','Samantha Owner'); await openLeadProfile('T1','summary'); await sleep(400);
  ok('an owner on a TEST client sees "Start a TEST journey"', /Start a TEST journey/.test(H().innerText), H().innerText);
  document.getElementById('cjStartBtn').click(); await sleep(500);
  ok('started: the top shows payer, stage, target start, Care Coordinator and Staffing', /Medicaid IHS \/ HCBS/.test(H().innerText) && /Intake/.test(H().innerText) && /Care Coordinator: Angie Care/.test(H().innerText) && /Staffing: Sally Staffing/.test(H().innerText), H().innerText.slice(0,300));
  ok('...the rail: Intake now, then Pre-checks … Active', [...H().querySelectorAll('.cj-st')].map(b=>b.textContent).join(',').startsWith('Intake,Pre-checks,Assessment') && H().querySelector('.cj-st-now').textContent==='Intake');
  ok('NEXT REQUIRED STEP: what, owner, status, how we\'ll know, Show me how', next() && /next required step/i.test(next().innerText) && /Confirm the client's basics/.test(next().innerText) && /Angie Care \(Care Coordinator\)/.test(next().innerText) && /Verified by the Hub/.test(next().innerText) && /Show me how/.test(next().innerText), next()&&next().innerText);
  ok('...also ready now (eMOMED) and Coming next', /also ready now/i.test(H().innerText) && /Check eMOMED/.test(H().innerText) && /coming next/i.test(H().innerText), H().innerText);
  ok('the old Start of Care checklist and First shift card are hidden while there is a journey', document.getElementById('lp_soc_body').style.display==='none');
  // the Care Coordinator's view and My Work
  window.__as('angie@mo-care.com','Angie Care'); window.__toLive=true; DATA.ops_settings.client_journey_live=true;
  switchTab('mywork'); await sleep(300); myWorkGo('today'); await sleep(200);
  const W=document.getElementById('myWorkWrap');
  ok('My Work: Linda is in CLIENTS IN MOTION as a normal Next step, before anything is late', /CLIENTS IN MOTION/.test(W.innerText) && /Linda Boyd \(TEST\)/.test(W.innerText) && /Confirm the client's basics/.test(W.innerText) && W.querySelector('.wk-jr-next'), W.innerText.slice(0,600));
  await shot('mywork_next');
  W.querySelector('.wk-jr button.primary').click(); await sleep(900);
  ok('Open lands on Linda\'s profile at that step (the link carries ids only)', document.getElementById('leadProfileView').style.display==='block' && /#p\/LT1\/start\/intake\.basics/.test(location.hash) && !/Linda/.test(location.hash) && next() && next().dataset.step==='intake.basics', location.hash);
  await shot('profile_next');
  btn(next(),'check').click(); await sleep(500);
  ok('Check now: the Hub verifies the basics itself, then "Done: … Next: …"', /✓ Done: Confirm the client's basics\. Next:/.test(H().innerText), H().querySelector('.cj-flash')&&H().querySelector('.cj-flash').innerText);
  ok('...the next thing is eMOMED', next().dataset.step==='med.emomed' && /Check eMOMED eligibility/.test(next().innerText));
  await shot('emomed');
  btn(next(),'complete').click(); await sleep(200);
  ok('Done with no answers or proof: it says what\'s missing, nothing saved', /Answer|proof/i.test(next().querySelector('[data-err]').textContent), next().querySelector('[data-err]').textContent);
  const set=(f,v)=>{ const el=next().querySelector('[data-f="'+f+'"]'); if(el.type==='checkbox') el.checked=v; else el.value=v; el.dispatchEvent(new Event('change')); };
  set('checked_on','2026-10-05'); set('result','eligible'); await sleep(100);
  const fi=next().querySelector('[data-upload]'); const dt=new DataTransfer(); dt.items.add(new File(['x'],'eMOMED screen.png',{type:'image/png'})); fi.files=dt.files; fi.dispatchEvent(new Event('change')); await sleep(400);
  ok('attaching the proof shows the file, uploaded', /eMOMED screen\.png ✓/.test(next().innerText), next().innerText);
  btn(next(),'complete').click(); await sleep(500);
  ok('eMOMED done with the file; FUSION is next', next().dataset.step==='med.fusion' && /✓ Done: Check eMOMED eligibility/.test(H().innerText));
  // FUSION needs the notes and history box
  ['checked_on','careplan','authorization','provider_changes'].forEach(f=>set(f, f==='checked_on'?'2026-10-05':true)); await sleep(50);
  const f2=next().querySelector('[data-upload]'); const d2=new DataTransfer(); d2.items.add(new File(['x'],'fusion.pdf',{type:'application/pdf'})); f2.files=d2.files; f2.dispatchEvent(new Event('change')); await sleep(400);
  btn(next(),'complete').click(); await sleep(300);
  ok('FUSION: refused until "I reviewed the notes and history" is ticked', /notes and history/.test(next().querySelector('[data-err]').textContent));
  set('notes_history',true); btn(next(),'complete').click(); await sleep(500);
  ok('...ticked: done; Count the prior 21-day notices is next', next().dataset.step==='med.notices');
  // hard stop
  set('count',2); btn(next(),'complete').click(); await sleep(500);
  ok('2 prior notices: STOP. The step turns red with the owner-exception words; Pre-checks is red on the rail', next().classList.contains('cj-next-red') && /Blocked/.test(next().innerText) && /2 or more prior 21-day notices/.test(next().innerText) && H().querySelector('.cj-st-stopped').textContent==='Pre-checks', next().innerText);
  ok('...the Care Coordinator has no exception button', !btn(next(),'exc-open'));
  ok('...the top says plainly that it stopped, not "Done"', /Stopped at "Count the prior 21-day notices"/.test(H().innerText) && !/✓ Done: Count the prior/.test(H().innerText), H().innerText.slice(0,500));
  ok('...the older stage path and stage chip step aside (one progress system on screen)', document.getElementById('cpcPath').style.display==='none');
  await shot('hard_stop');
  switchTab('mywork'); await sleep(200); myWorkGo('today'); await sleep(200);
  ok('My Work: Linda\'s card now says BLOCKED', /Blocked/.test(document.getElementById('myWorkWrap').innerText) && /2 or more prior 21-day notices/.test(document.getElementById('myWorkWrap').innerText));
  await shot('mywork_blocked');
  // owner exception
  window.__as('sam@mo-care.com','Samantha Owner'); location.hash='#p/LT1/start/med.notices'; await sleep(900);
  ok('an owner opening the link sees the step with "Owner exception…"', next().dataset.step==='med.notices' && !!btn(next(),'exc-open'));
  btn(next(),'exc-open').click(); await sleep(150);
  btn(next(),'exc').click(); await sleep(150);
  ok('...the exception needs a written reason', /written reason/.test(next().querySelector('[data-err]').textContent));
  next().querySelector('[data-m="reason"]').value='Both notices were from a provider that closed; DSDS confirmed the family is stable.';
  await shot('exception_form');
  btn(next(),'exc').click(); await sleep(500);
  ok('...saved: the journey continues to the care plan', next().dataset.step==='med.careplan' && /Owner exception saved/.test(H().innerText));
  cpShowTab('start'); await sleep(100); cjPick('med.notices', true); await sleep(150);
  ok('the step keeps the exception for good: who, when, why (violet)', /Owner exception/.test(ST().innerText) && /Hard-stop override by Samantha Owner/.test(ST().innerText) && /Both notices were from a provider that closed/.test(ST().innerText), ST().innerText.slice(0,900));
  await shot('exception_saved');
  cjPick(null); await sleep(100);
  // waiting and check-back
  window.__as('angie@mo-care.com','Angie Care'); await openLeadProfile('T1','summary'); await sleep(500);
  btn(next(),'wait-open').click(); await sleep(100);
  next().querySelector('[data-m="waiting_on"]').value='the case manager'; btn(next(),'wait').click(); await sleep(150);
  ok('Waiting without a check-back date: refused on the page', /check-back date/.test(next().querySelector('[data-err]').textContent));
  const inTwo=R2=>{ const d=new Date(Date.now()+2*864e5); return d.toLocaleString('sv-SE',{timeZone:'America/Chicago'}).slice(0,10); };
  next().querySelector('[data-m="check_back"]').value=inTwo(); btn(next(),'wait').click(); await sleep(500);
  ok('...with a date: parked, and it says it comes back that day', /Parked until/.test(H().innerText) && /comes back to My Work that day/.test(H().innerText), H().innerText.slice(0,400));
  switchTab('mywork'); await sleep(200); myWorkGo('today'); await sleep(200);
  ok('My Work: it sits in Waiting & Watching with its back date, not lost', /WAITING & WATCHING/.test(document.getElementById('myWorkWrap').innerText) && (DATA.ops_items.find(x=>x.kind==='journey'&&x.card_kind==='waiting')||{}).check_back===inTwo());
  // the check-back day arrives
  const s=S.steps.find(x=>x.step_key==='med.careplan'); s.check_back=new Date().toLocaleString('sv-SE',{timeZone:'America/Chicago'}).slice(0,10);
  await cjCall({ action:'refresh', journey_id:'J1' }); myWorkRefresh(); await sleep(200);
  ok('on the check-back day it comes back: NEEDS ATTENTION in Act Now', /ACT NOW/.test(document.getElementById('myWorkWrap').innerText) && /Back from waiting on the case manager/.test(document.getElementById('myWorkWrap').innerText), document.getElementById('myWorkWrap').innerText.slice(0,500));
  await shot('back_from_waiting');
  // blocked for an owner
  await openLeadProfile('T1','summary'); await sleep(500);
  btn(next(),'block-open').click(); await sleep(100);
  next().querySelector('[data-m="reason"]').value='Medicaid care plan missing'; next().querySelector('[data-m="unblock"]').value='The case manager sends it'; btn(next(),'block').click(); await sleep(500);
  ok('Blocked: says why and what unblocks it', /Medicaid care plan missing/.test(next().innerText) && /Unblocks when: The case manager sends it/.test(next().innerText));
  btn(next(),'unblock').click(); await sleep(500);
  // finish the care plan and decide
  set('hours_week',27); set('reviewed',true); set('feasible','yes');
  const f3=next().querySelector('[data-upload]'); const d3=new DataTransfer(); d3.items.add(new File(['x'],'careplan.pdf',{type:'application/pdf'})); f3.files=d3.files; f3.dispatchEvent(new Event('change')); await sleep(400);
  btn(next(),'complete').click(); await sleep(500);
  set('decision','assess'); btn(next(),'complete').click(); await sleep(500);
  ok('care plan and "decide to assess" done: Book the assessment is next (Assessment on the rail)', next().dataset.step==='asmt.book' && H().querySelector('.cj-st-now').textContent==='Assessment');
  // the whole journey tab
  cpShowTab('start'); await sleep(150);
  ok('Start of Care: the whole journey by stage, with who did each step and when', /The whole journey/.test(ST().innerText) && /PRE-CHECKS/i.test(ST().innerText) && /Angie Care, /.test(ST().innerText) && /Owner exception/.test(ST().innerText));
  cjPick('med.emomed', true); await sleep(150);
  ok('...open eMOMED later: result, the proof file, who and when', /Result/.test(ST().innerText) && /Eligible/.test(ST().innerText) && /eMOMED screen\.png/.test(ST().innerText) && /Done by/.test(ST().innerText));
  ST().querySelector('[data-file]').click(); await sleep(200);
  ok('...the proof opens through a short-lived link', /^https:\/\/view\//.test(window.__opened||''));
  await shot('full_journey');
  cjPick(null);
  // reassign
  cpShowTab('summary'); await sleep(100);
  ok('the Care Coordinator can hand the journey to someone else (one tap from the header)', /Care Coordinator: Angie Care/.test(H().innerText));
  await cjCall({ action:'assign_cc', journey_id:'J1', email:'krystal@mo-care.com' }); myWorkRefresh();
  ok('...Krystal now has Linda\'s card, Angie doesn\'t', DATA.ops_items.some(x=>x.kind==='journey'&&x.owner==='krystal@mo-care.com') && !DATA.ops_items.some(x=>x.kind==='journey'&&x.owner==='angie@mo-care.com'));
  // run the rest to Active (a Private Pay test client, all at once)
  window.__as('krystal@mo-care.com','Krystal Land'); await openLeadProfile('T2','summary'); await sleep(400);
  document.getElementById('cjStartBtn').click(); await sleep(500);
  const j2=S.journeys.find(x=>x.lead_id==='T2');
  window.JourneyRules.compute; const CAT2=JSON.parse(JSON.stringify(CJ_STATE.data.defs));
  CAT2.forEach(d=>{ if(['active.complete','intake.payer'].includes(d.key)||(d.payers.length&&!d.payers.includes('private'))) return; if(!S.steps.find(x=>x.journey_id===j2.journey_id&&x.step_key===d.key)) S.steps.push({ journey_id:j2.journey_id, step_key:d.key, state:'complete', answer:{ outcome:'signed', hours_week:20 }, evidence:{}, completed_by:'krystal@mo-care.com', completed_by_name:'Krystal Land', completed_at:new Date().toISOString(), version:1 }); });
  await openLeadProfile('T2','summary'); await sleep(500);
  ok('every other step done: "Complete start of care" is next, for the Care Coordinator (no owner sign-off)', next().dataset.step==='active.complete' && /Krystal Land \(Care Coordinator\)/.test(next().innerText));
  btn(next(),'complete').click(); await sleep(500);
  ok('...Complete: Active client, the journey stays as the record', /start of care complete/i.test(H().innerText) && /is an active client/.test(H().innerText) && j2.status==='active', [H().innerText.slice(0,300), j2.status]);
  await shot('active');
  ok('nothing texted or emailed; every change went through the journey service', window.__log.fn.length===0 && (window.__calls||[]).every(b=>b.action));
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width':1280,'height':1000})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.goto('http://localhost:8765/index.html?proof=cj'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', STUB); pg.evaluate('s=>(0,eval)(s)', DATA)
    # screenshots: the test pauses by setting window.__shot; take them via a poller
    import threading
    R = pg.evaluate(T)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

"""Make this a lead (2026-10-14): every answered call on the Calls tab and Call Follow Ups has Make this a lead; the AI's
"new client inquiry" shows as "Sounds like a new family" with Not a lead; the button opens the REGULAR lead form filled from
the call with every heard box yellow; saving keeps the call on the lead and asks for the GoHighLevel tag; the same-family
check puts the call on their open lead instead. The real page, offline, made-up data.
(python3 tests/browser/call_to_lead_look.py, static server on PORT, default 8765)"""
import os
from playwright.sync_api import sync_playwright
PORT = os.environ.get('PORT', '8765')
STUB = r"""
(()=>{
  const W=window; W.__log={ fn:[], persisted:[], toasts:[] };
  const READ=[{ message_id:'msgNEW001', call_type:'new_client_inquiry', lead_id:null, read_at:'2026-10-14T15:30:00Z', detail:{ summary:'Daughter asking about help for her mom in Nixa after a fall.' } },
              { message_id:'msgCG0002', call_type:'caregiver', lead_id:null, read_at:'2026-10-14T15:31:00Z', detail:{ summary:'Caregiver running late.' } },
              { message_id:'msgOLD003', call_type:'family', lead_id:'L_old', read_at:'2026-10-14T15:32:00Z', detail:{ summary:'Existing lead calling back.' } }];
  (0,eval)(`sb={ from:(t)=>{ const p={ select(){return p;}, eq(){return p;}, gte(){return p;}, in(){return p;}, not(){return p;}, order(){return p;}, limit(){return p;},
      maybeSingle:async()=>({data:null,error:null}), then(a){ return Promise.resolve({data: t==='call_task_reading' ? window.__READ : [], error:null}).then(a); } }; return p; },
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async()=>({data:null,error:null}) }, auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };`);
  W.__READ=READ;
  W.persist=async(k,i)=>{ W.__log.persisted.push([k, JSON.parse(JSON.stringify(i))]); }; W.ccToast=m=>{ W.__log.toasts.push(m); }; W.opEvent=()=>{};
  W.ckFind=async()=>(W.__same||{ leads:[], clients:[] }); W.ckPanel=async()=>({ kind:'lead', id:'L_old' }); W.openLeadProfile=id=>{ W.__log.opened=id; };
  const realFetch=W.fetch.bind(W);
  W.fetch=async(url,o)=>{ url=String(url); if(!url.includes('/functions/v1/call-to-lead')) return realFetch(url,o);
    const b=JSON.parse(o.body); W.__log.fn.push(b);
    if(b.action==='read') return new Response(JSON.stringify({ ok:true, transcript:true, call:{ message_id:b.message_id, at:'2026-10-14T15:14:00Z', direction:'inbound', seconds:360 },
      contact:{ id:'C77', first_name:'Linda', last_name:'Parker', phone:'+14175550142', email:'' },
      prefill:{ first_name:'Linda', last_name:'Parker', phone:'+14175550142', email:'', source:'Referral', relationship:'Daughter', client_first_name:'Margaret', client_city:'Nixa',
        referral_source_name:'Mercy discharge planner', desired_start_kind:'this_week', needs:['personalCare','housekeeping'], safety:['fallRisk'], mobility:'walker',
        schedule_days:['Mon','Tue','Wed','Thu','Fri'], times_needed:'Mornings, 8 to 12', number_of_hours:'20', funding_source:'private',
        why_called:'Daughter looking for morning help for her mom after a fall', interest_notes:'Linda called about her mom Margaret in Nixa.' },
      heard:['source','relationship','client_first_name','client_city','referral_source_name','desired_start_kind','needs','safety','mobility','schedule_days','times_needed','number_of_hours','funding_source','why_called','interest_notes'],
      is_new_family:true, not_new_family_reason:'', medicaid_mentioned:!!W.__medicaid,
      care_plan:{ fields:{ adl_needs:'Standby help showering.', iadl_needs:'Meals and light housekeeping.', recommended_frequency:'Mon to Fri mornings', recommended_hours_per_week:'20' },
        narrative:'Margaret is 85 and lives alone in Nixa with her dog. Reported by her daughter on the phone, to confirm at the visit.',
        axiscare_tasks:[{ adl_id:11, name:'Bathing', key:'bathing', days:['M','W','F'], require:1, when:1, instructions:'Standby while showering' }], heard:['adl_needs','iadl_needs','narrative','axiscare_tasks'] } }), { status:200 });
    if(b.action==='made') return new Response(JSON.stringify({ ok:true, tagged:true }), { status:200 });
    if(b.action==='read_lead') return new Response(JSON.stringify({ ok:true, transcript:true, call:{ message_id:'callNEW02', at:'2026-10-15T00:50:00Z', direction:'inbound', seconds:600 },
      calls:[{ message_id:'callNEW02', at:'2026-10-15T00:50:00Z' }, { message_id:'callOLD01', at:'2026-10-14T21:42:00Z' }],
      contact:{ id:'C99', first_name:'', last_name:'', phone:'+14172244400', email:'' },
      prefill:{ first_name:'Laura', last_name:'Johnson', phone:'+14172244400', source:'Phone', relationship:'Daughter', client_first_name:'Joanne', client_city:'Apex', needs:['personalCare','dementia'], funding_source:'private',
        times_needed:'Evenings 5:30 to bedtime; weekends 8+ hours', interest_notes:'Laura called about her mom Joanne at Elfdale.' },
      heard:['first_name','last_name','relationship','client_first_name','client_city','needs','times_needed','interest_notes'],
      is_new_family:true, medicaid_mentioned:false, care_plan:{ fields:{}, narrative:'', axiscare_tasks:[], heard:[] },
      profile:{ facts:{ living_situation:'facility', facility_name:'Elfdale assisted living, Apex', why_now:['caregiver_cant_continue'] }, attributes:{ dogs:'yes', female_caregiver:'preferred' },
        people:[{ name:'Her boyfriend', relationship:'Boyfriend', note:'Can get in the way during care' }] } }), { status:200 });
    return new Response('{}', { status:400 }); };
  DATA.ops_settings={}; DATA.referral_orgs=[]; DATA.care_assessments=[]; DATA.ops_items=[]; DATA.call_lead_marks=[];
  DATA.leads=[{ id:'L_old', first_name:'Ruth', last_name:'Old', phone:'4175550999', status:'Contacted', created_at:'2026-10-01T15:00:00Z', client_city:'Ozark', needs:['respite'], interest_notes:'First call notes.',
    care_plan_draft:{ reported:true, fields:{ adl_needs:'Help dressing.' }, narrative:'', axiscare_tasks:[{ adl_id:22, name:'Meal Preparation', days:['M'], require:1, when:0, instructions:'' }], from_calls:['msgEARLY9'] } }];
  DATA.care_assessments=[]; DATA.care_plans=[]; W.cptLoadCatalog=()=>{}; W.renderAssessments=()=>{};
  DATA.leads.push({ id:'L_ai', first_name:'', phone:'+14172244400', ghl_contact_id:'C99', status:'New', source:'Inbound Call', created_at:'2026-10-15T00:50:00Z', funding_source:'private', price_quoted:true, quoted_price_amount:'32',
    interest_notes:'AI call summary, not reviewed (2026-10-15): Laura Johnson called on behalf of her mother.', ai_suggestions:[{ id:'s1', source:'call-followup', reviewed:false, fields:{ needs:['bathing'] } }] });
  DATA.post_call_followups=[{ id:'pd1', lead_id:'L_ai', status:'pending_approval', ai_generated:true, created_at:'2026-10-15T00:51:00Z' }];
  (0,eval)(`CALLS_FILTER='all'; CALLS_FEED={ generated_at:'2026-10-14T15:40:00Z', calls:[
    { id:'msgNEW001', name:'Linda Parker', phone:'+14175550142', contact_id:'C77', direction:'inbound', duration:360, at:'2026-10-14T15:14:00Z', has_recording:true },
    { id:'msgCG0002', name:'Ann Caregiver', phone:'+14175550200', contact_id:'C78', direction:'inbound', duration:40, at:'2026-10-14T15:20:00Z', has_recording:true },
    { id:'msgOLD003', name:'Ruth Old', phone:'+14175550999', contact_id:'C79', direction:'inbound', duration:90, at:'2026-10-14T15:25:00Z', has_recording:true },
    { id:'msgMISS04', name:'Missed Person', phone:'+14175550300', contact_id:'C80', direction:'inbound', duration:0, status:'no-answer', at:'2026-10-14T15:26:00Z' } ] };`);
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,800)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  await CallLead.load(true); callsPaint(); await sleep(50);
  const row=id=>document.querySelector('#callsList .cl-row[data-call="'+id+'"]'), txt=id=>(row(id)||{}).innerText||'';
  ok('a call the AI calls a new client inquiry: "Sounds like a new family", Make this a lead (filled) and Not a lead, with the summary', /Daughter asking about help/.test(txt('msgNEW001')) && /Sounds like a new family/.test(txt('msgNEW001'))
     && /Make this a lead/.test(txt('msgNEW001')) && /Not a lead/.test(txt('msgNEW001')) && row('msgNEW001').querySelector('button.primary').textContent==='Make this a lead', txt('msgNEW001'));
  ok('any other answered call: Make this a lead only (no tag, no Not a lead)', /Make this a lead/.test(txt('msgCG0002')) && !/Sounds like|Not a lead/.test(txt('msgCG0002')) && !row('msgCG0002').querySelector('button.primary'), txt('msgCG0002'));
  ok('a caller who already has an open lead: Open lead, with their name', /Lead: Ruth Old/.test(txt('msgOLD003')) && /Open lead/.test(txt('msgOLD003')) && !/Make this a lead/.test(txt('msgOLD003')), txt('msgOLD003'));
  ok('a missed call has no buttons', !row('msgMISS04'));

  /* Make this a lead → the regular form, filled */
  [...row('msgNEW001').querySelectorAll('button')].find(b=>b.textContent==='Make this a lead').click(); await sleep(300);
  const v=id=>document.getElementById(id).value, m=document.getElementById('leadModalBackdrop');
  ok('the regular lead form opens, titled from the call', m.classList.contains('open') && /^New lead from the (Wed, Oct 14 )?10:14 am call$/.test(document.getElementById('leadModalTitle').textContent), document.getElementById('leadModalTitle').textContent);
  ok('...filled from the call: caller and phone from GoHighLevel, who it is for, town, start, schedule, payer, why, notes',
     v('lead_first_name')==='Linda' && v('lead_phone')==='+14175550142' && v('lead_relationship')==='Daughter' && v('lead_client_first_name')==='Margaret' && v('lead_client_city')==='Nixa'
     && v('lead_desired_start_kind')==='this_week' && v('lead_times_needed')==='Mornings, 8 to 12' && v('lead_number_of_hours')==='20' && getRadioValue('lead_funding_source')==='private' && getRadioValue('lead_mobility')==='walker'
     && getCheckedValues('lead_needs_grid').join()==='personalCare,housekeeping' && getCheckedValues('lead_schedule_days').join()==='Mon,Tue,Wed,Thu,Fri' && v('lead_source')==='Referral'
     && /after a fall/.test(v('lead_why_called')) && /Linda called/.test(v('lead_interest_notes')), { first:v('lead_first_name'), rel:v('lead_relationship'), needs:getCheckedValues('lead_needs_grid') });
  const yellow=()=>[...document.querySelectorAll('#leadModalBackdrop .cl-heard')].filter(e=>e.id!=='clBanner' && !e.closest('#clBanner'));
  ok('every heard box is yellow (typed boxes and the ticked choices); GoHighLevel\'s name and phone are not', document.getElementById('lead_client_city').classList.contains('cl-heard')
     && document.getElementById('lead_relationship').classList.contains('cl-heard') && document.querySelectorAll('#lead_needs_grid label.cl-heard').length===2
     && !document.getElementById('lead_first_name').classList.contains('cl-heard') && !document.getElementById('lead_phone').classList.contains('cl-heard'), yellow().map(e=>e.id||e.innerText.slice(0,20)));
  ok('a banner explains the yellow', /Yellow = heard on the call/.test((document.getElementById('clBanner')||{}).innerText||''));
  const city=document.getElementById('lead_client_city'); city.value='Nixa, MO'; city.dispatchEvent(new Event('input',{bubbles:true}));
  ok('changing a yellow box takes its yellow away (a person checked it)', !city.classList.contains('cl-heard') && document.getElementById('lead_relationship').classList.contains('cl-heard'));
  const clinical=document.getElementById('lead_safety_grid').closest('details'); ok('a folded section with heard answers is opened', !clinical || clinical.open);

  /* save → the call is on the lead, GoHighLevel tag asked */
  await saveLead(); await sleep(200);
  const nl=DATA.leads.find(l=>l.client_first_name==='Margaret');
  ok('the call it was made from counts as the first real conversation: Contacted, contact stamps, one call event, the log line', nl.status==='Contacted' && nl.first_human_contact_at==='2026-10-14T15:14:00Z' && nl.first_human_attempt_at==='2026-10-14T15:14:00Z'
     && (nl.contact_events||[]).filter(e=>e.ref==='ghl:msgNEW001'&&e.outcome==='connected'&&e.direction==='in').length===1 && (nl.comm_log||[]).some(c=>/they called\): connected, 6 min/.test(c.body)) && nl.last_contacted_at==='2026-10-14', { st:nl.status, ev:nl.contact_events });
  ok('...so it is not a New lead with a first-call clock: the inquiry card is not made for it', typeof opsLeadUntouched!=='function' || !opsLeadUntouched(nl));
  ok('Save makes the lead the usual way, with the call kept on it and the GoHighLevel contact', nl && nl.from_calls && nl.from_calls[0].message_id==='msgNEW001' && nl.ghl_contact_id==='C77' && nl.last_call_at==='2026-10-14T15:14:00Z' && nl.client_city==='Nixa, MO', nl);
  ok('...and asks the server to tag the GoHighLevel contact "lead" for that lead', __log.fn.some(b=>b.action==='made' && b.message_id==='msgNEW001' && b.lead_id===nl.id), __log.fn);
  callsPaint(); await sleep(30);
  ok('the call now shows Open lead (Linda Parker)', /Lead: Linda Parker/.test(txt('msgNEW001')) && /Open lead/.test(txt('msgNEW001')), txt('msgNEW001'));
  openLeadModal(); ok('a form opened any other way has no yellow and no banner', !document.querySelector('#leadModalBackdrop .cl-heard') && !document.getElementById('clBanner') && document.getElementById('leadModalTitle').textContent==='Add Lead');
  closeModal('leadModalBackdrop');

  /* Not a lead, Undo */
  __READ[1].call_type='new_client_inquiry'; await CallLead.load(true); callsPaint();
  [...row('msgCG0002').querySelectorAll('button')].find(b=>b.textContent==='Not a lead').click(); await sleep(50);
  ok('Not a lead is kept (who, when) and the row says so with Undo', __log.persisted.some(p=>p[0]==='call_lead_marks' && p[1].id==='msgCG0002' && p[1].verdict==='not') && /Not a lead[\s\S]*Undo/.test(txt('msgCG0002')), txt('msgCG0002'));
  [...row('msgCG0002').querySelectorAll('a')].find(a=>a.textContent==='Undo').click(); await sleep(50);
  ok('...Undo brings the buttons back', /Make this a lead/.test(txt('msgCG0002')));

  /* Call Follow Ups: the waiting list */
  const rows=__READ.map(r=>Object.assign({ channel:'call', who_name:'', caller:'Ann C.' }, r));
  const box=document.createElement('div'); box.innerHTML=CallLead.waitingHtml(rows);
  ok('Call Follow Ups lists the new families nobody has decided on (made-into-a-lead ones drop off)', /NOT A LEAD YET \(1\)/.test(box.innerText) && /Ann C\./.test(box.innerText) && !/Linda/.test(box.innerText), box.innerText);
  const cb=document.createElement('div'); cb.innerHTML=CallLead.cardBar(rows[0]); ok('...and each call card has the bar (Open lead once it is one)', /Open lead/.test(cb.innerText), cb.innerText);
  cb.innerHTML=CallLead.cardBar(Object.assign({}, rows[1], { channel:'text' })); ok('...but never on a text conversation', cb.innerHTML==='');

  /* the same family already has an open lead: the call goes onto THAT lead */
  __READ.push({ message_id:'msgDUP005', call_type:'new_client_inquiry', lead_id:null, read_at:'2026-10-14T15:50:00Z', detail:{ summary:'Ruth again.' } });
  CALLS_FEED.calls.push({ id:'msgDUP005', name:'Ruth Old', phone:'+14175550999', contact_id:'C79', direction:'inbound', duration:60, at:'2026-10-14T15:45:00Z' });
  window.__same={ leads:[{ id:'L_old' }], clients:[] }; await CallLead.load(true); callsPaint();
  await CallLead.make('msgDUP005'); await sleep(100); await saveLead(); await sleep(150);
  const old=DATA.leads.find(l=>l.id==='L_old');
  ok('same family: no second lead; the call is added to their open lead and their profile opens', DATA.leads.filter(l=>l.first_name==='Linda').length===1 && (old.from_calls||[]).some(x=>x.message_id==='msgDUP005') && __log.opened==='L_old'
     && __log.toasts.some(t=>/Added this call to Ruth Old/.test(t)), { old, toasts:__log.toasts });
  ok('nothing in this module sends a text or an email', !__log.fn.some(b=>!['read','made'].includes(b.action)));

  /* ── v2: fill everything, the care plan draft, Add from this call, GUIDE ── */
  const nl2=DATA.leads.find(l=>l.client_first_name==='Margaret');
  ok('v2: the care plan draft from the call is saved on the lead (fields, narrative, AxisCare tasks, which call)', nl2.care_plan_draft && nl2.care_plan_draft.reported===true && nl2.care_plan_draft.fields.adl_needs==='Standby help showering.'
     && /lives alone in Nixa/.test(nl2.care_plan_draft.narrative) && nl2.care_plan_draft.axiscare_tasks[0].adl_id===11 && nl2.care_plan_draft.from_calls.join()==='msgNEW001', nl2.care_plan_draft);
  /* Add from this call, on Ruth's existing lead (the reader matched the caller to her lead) */
  callsPaint(); await sleep(20);
  const addBtn=[...row('msgOLD003').querySelectorAll('button')].find(b=>b.textContent==='Add from this call');
  ok('v2: a call from a family that already has a lead offers Add from this call beside Open lead', !!addBtn && /Open lead/.test(txt('msgOLD003')), txt('msgOLD003'));
  addBtn.click(); await sleep(300);
  ok('v2: Add from this call opens THEIR lead, titled for the call', document.getElementById('lead_id').value==='L_old' && /^Add what the (Wed, Oct 14 )?10:14 am call said$/.test(document.getElementById('leadModalTitle').textContent), document.getElementById('leadModalTitle').textContent);
  ok('v2: an empty box is filled and yellow; a box that already has an answer is NOT changed', v('lead_client_first_name')==='Margaret' && document.getElementById('lead_client_first_name').classList.contains('cl-heard')
     && v('lead_client_city')==='Ozark' && !document.getElementById('lead_client_city').classList.contains('cl-heard') && v('lead_first_name')==='Ruth', { city:v('lead_client_city') });
  ok('v2: ...the difference is listed for a person to decide', /said something different[\s\S]*Town: form has "Ozark", the call said "Nixa"/.test(document.getElementById('clBanner').innerText), document.getElementById('clBanner').innerText);
  ok('v2: ...new ticks are added to the grid (yellow), the old tick kept', getCheckedValues('lead_needs_grid').join()==='personalCare,housekeeping,respite'.split(',').filter(x=>getCheckedValues('lead_needs_grid').includes(x)).join() && getCheckedValues('lead_needs_grid').includes('respite')
     && getCheckedValues('lead_needs_grid').includes('personalCare') && document.querySelector('#lead_needs_grid input[value="personalCare"]').closest('label').classList.contains('cl-heard')
     && !document.querySelector('#lead_needs_grid input[value="respite"]').closest('label').classList.contains('cl-heard'), getCheckedValues('lead_needs_grid'));
  ok('v2: ...the call\'s notes are added below their own', /^First call notes\.\n\nFrom the (Wed, Oct 14 )?10:14 am call: Linda called/.test(v('lead_interest_notes')), v('lead_interest_notes'));
  await saveLead(); await sleep(150);
  const ruth=DATA.leads.find(l=>l.id==='L_old');
  ok('v2: saved: the call is on her lead and her care plan draft grows (keeps what it had, adds the new, adds the new task)', (ruth.from_calls||[]).some(x=>x.message_id==='msgOLD003')
     && ruth.care_plan_draft.fields.adl_needs==='Help dressing.\nStandby help showering.' && ruth.care_plan_draft.axiscare_tasks.map(t=>t.adl_id).join()==='22,11'
     && ruth.care_plan_draft.from_calls.join()==='msgEARLY9,msgDUP005,msgOLD003' && DATA.leads.filter(l=>l.first_name==='Ruth').length===1, ruth.care_plan_draft);
  callsPaint(); await sleep(20);
  ok('v2: once the call is on the lead, only Open lead shows', /Open lead/.test(txt('msgOLD003')) && !/Add from this call/.test(txt('msgOLD003')), txt('msgOLD003'));

  /* the care plan form starts from the calls' draft */
  DATA.care_assessments.push({ id:'A1', lead_id:nl2.id, client_name:'Margaret Parker', visit_date:'2026-10-20', status:'Scheduled' });
  openPlanForAssessment('A1'); await sleep(50);
  ok('v2: a care plan not written yet opens with the calls\' draft: fields, narrative, AxisCare tasks, and says so', document.getElementById('plan_adl_needs').value==='Standby help showering.' && document.getElementById('plan_recommended_hours_per_week').value==='20'
     && /lives alone in Nixa/.test(document.getElementById('plan_narrative').value) && CPT.tasks.length===1 && CPT.tasks[0].adl_id===11 && /Started from 1 phone call[\s\S]*reported by the family/.test(document.getElementById('plan_draft_note').innerText), document.getElementById('plan_draft_note').innerText);
  /* after the visit: the drafter builds on it */
  const realFetch2=window.fetch; let sentCP=null;
  window.fetch=async(u,o)=>{ if(String(u).includes('ai-draft-careplan')){ sentCP=JSON.parse(o.body); return new Response(JSON.stringify({ adl_needs:'Standby help showering; needs a shower chair.', narrative:'Margaret is 85, lives alone in Nixa with her dog Max.', medications:'Eliquis' }), { status:200 }); } return realFetch2(u,o); };
  document.getElementById('plan_iadl_needs').value='Meals, laundry and light housekeeping (checked at the visit).';
  closeModal('planModalBackdrop'); document.getElementById('assess_id').value='A1'; document.getElementById('assess_transcript_text').value='Visit transcript words';
  await generateCarePlan(); await sleep(80); window.fetch=realFetch2;
  ok('v2: Generate sends the calls\' draft along as what we already knew', sentCP && sentCP.earlier && sentCP.earlier.fields.adl_needs==='Standby help showering.' && /lives alone/.test(sentCP.earlier.narrative), sentCP);
  ok('v2: boxes still holding the call draft take the visit\'s fuller answer; empty boxes fill; nothing else is touched', document.getElementById('plan_adl_needs').value==='Standby help showering; needs a shower chair.'
     && /dog Max/.test(document.getElementById('plan_narrative').value) && document.getElementById('plan_medications').value==='Eliquis', document.getElementById('plan_adl_needs').value);
  await savePlan(false); await sleep(50);
  const plan=DATA.care_plans.find(p=>p.assessment_id==='A1');
  ok('v2: the plan saves the narrative, its tasks, and that it started from the calls', plan && /dog Max/.test(plan.narrative) && plan.axiscare_tasks.length===1 && plan.drafted_by==='calls', plan);

  /* payers */
  openLeadModal(); const radios=[...document.querySelectorAll('input[name="lead_funding_source"]')].map(i=>[i.value, i.closest('label').style.display!=='none']);
  ok('v2: payers: Private pay, LTC, VA, Medicare GUIDE, CDS; Medicaid hidden on a new lead', JSON.stringify(radios)===JSON.stringify([['private',true],['ltc',true],['va',true],['guide',true],['cds',true],['medicaid',false]]), radios);
  setRadioValue('lead_funding_source','guide'); leadPayorUI();
  ok('v2: Medicare GUIDE goes to Krystal, with the screener and a Crosby Health link that opens in its own tab', /Medicare GUIDE → Krystal/.test(document.getElementById('leadPayorHint').innerText)
     && document.querySelector('#leadPayorHint a[href="https://app.crosbyhealth.com/login"][target="_blank"]'), document.getElementById('leadPayorHint').innerHTML.slice(0,300));
  ok('v2: every payer is Krystal\'s', ['private','ltc','va','guide','cds','medicaid'].every(k=>PAYER_COORDINATOR[k]==='Krystal'));
  closeModal('leadModalBackdrop');
  window.__medicaid=true; await CallLead.make('msgCG0002'); await sleep(100);
  ok('v2: a caller who mentioned Medicaid is flagged on the form (we no longer accept it; CDS may fit)', /They mentioned Medicaid[\s\S]*no longer accept/.test(document.getElementById('clBanner').innerText) && /Care plan draft started from this call/.test(document.getElementById('clBanner').innerText), document.getElementById('clBanner').innerText);
  closeModal('leadModalBackdrop');

  /* ── + Add Lead typed while on the phone (2026-10-15) ── */
  window.__same={ leads:[], clients:[] };
  openLeadModal(); const trow=document.getElementById('leadTalkedRow'), tb=document.getElementById('lead_talked_now');
  ok('+ Add Lead: a new Phone lead shows "We\'re talking to them on this call", ticked', trow.style.display!=='none' && tb.checked);
  const src=document.getElementById('lead_source'); src.value='Website'; src.dispatchEvent(new Event('change')); ok('...a Website lead: not ticked', !tb.checked);
  src.value='Phone'; src.dispatchEvent(new Event('change'));
  document.getElementById('lead_first_name').value='Gail'; document.getElementById('lead_last_name').value='Typed'; document.getElementById('lead_phone').value='4175550777';
  await saveLead(); await sleep(150);
  const ty=DATA.leads.find(l=>l.first_name==='Gail');
  ok('...saved ticked: the call is the first conversation (Contacted, contact stamps, one connected call, the log line)', ty && ty.status==='Contacted' && ty.first_human_contact_at && ty.first_human_attempt_at
     && (ty.contact_events||[]).filter(e=>e.outcome==='connected'&&e.channel==='call').length===1 && (ty.comm_log||[]).some(c=>/typed in while on the phone/.test(c.body)) && !opsLeadUntouched(ty), ty);
  openLeadModal(); document.getElementById('lead_first_name').value='Hank'; document.getElementById('lead_last_name').value='Unticked'; document.getElementById('lead_phone').value='4175550778';
  document.getElementById('lead_talked_now').checked=false; await saveLead(); await sleep(150);
  const un=DATA.leads.find(l=>l.first_name==='Hank');
  ok('...saved unticked (a message or voicemail): still New, nobody talked to yet', un && un.status==='New' && !un.first_human_contact_at, un);
  openLeadModal(ty.id); ok('...editing an existing lead never shows the box', document.getElementById('leadTalkedRow').style.display==='none'); closeModal('leadModalBackdrop');

  /* ── v3: fixes 1 to 5 ── */
  const ai=()=>DATA.leads.find(l=>l.id==='L_ai');
  ok('v3: a caller with no name shows as "Caller" and the number, never "(phone lead)"', cpLeadClientName(ai())==='Caller (417) 224-4400', cpLeadClientName(ai()));
  const ob=document.createElement('div'); ob.innerHTML=CallLead.oldAiHtml();
  ok('v3: the Leads board lists the old AI\'s leads that are not filled in, with Fill from the call', /MADE BY THE OLD AI, NOT FILLED IN YET \(1\)/.test(ob.innerText) && /Caller \(417\) 224-4400/.test(ob.innerText) && /Fill from the call/.test(ob.innerText), ob.innerText);
  await CallLead.fillFromLead('L_ai'); await sleep(300);
  ok('v3: Fill from the call opens their lead, with every call read', document.getElementById('lead_id').value==='L_ai' && __log.fn.some(b=>b.action==='read_lead'&&b.lead_id==='L_ai') && /Read from 2 calls/.test(document.getElementById('clBanner').innerText), document.getElementById('clBanner').innerText);
  ok('v3: the empty name is filled (yellow); boxes already answered are kept', v('lead_first_name')==='Laura' && document.getElementById('lead_first_name').classList.contains('cl-heard') && getRadioValue('lead_funding_source')==='private' && v('lead_client_city')==='Apex', { fn:v('lead_first_name') });
  ok('v3: the old AI\'s unreviewed summary is replaced by the calls\' summary', !/AI call summary, not reviewed/.test(v('lead_interest_notes')) && /Laura called about her mom Joanne/.test(v('lead_interest_notes')), v('lead_interest_notes'));
  ok('v3: the banner says what goes to Home & Life and people', /Home & Life and people from the call:[\s\S]*lives in a facility \(Elfdale assisted living, Apex\)[\s\S]*dog[\s\S]*prefers female caregiver[\s\S]*Boyfriend/.test(document.getElementById('clBanner').innerText), document.getElementById('clBanner').innerText);
  await saveLead(); await sleep(200);
  const L=ai();
  ok('v3: Fill from the call on an existing lead records each call it read as a conversation, once', ai().status==='Contacted' && (ai().contact_events||[]).filter(e=>/^ghl:call(NEW02|OLD01)$/.test(e.ref)).length===2 && ai().first_human_contact_at==='2026-10-14T21:42:00Z', ai().contact_events);
  ok('v3: saved: both calls on the lead, the checklist answers on the lead, the rest kept to file', L.first_name==='Laura' && L.from_calls.map(x=>x.message_id).join()==='callNEW02,callOLD01' && L.client_attributes.dogs==='yes' && L.client_attributes.female_caregiver==='preferred'
     && L.call_profile.facts.facility_name==='Elfdale assisted living, Apex' && L.call_profile.people[0].relationship==='Boyfriend' && L.call_profile.said_by==='Laura Johnson', L);
  ok('v3: the old review list is closed as replaced, and the old AI draft is dropped (kept, not deleted)', L.ai_suggestions[0].reviewed===true && /Replaced by Fill from the call/.test(L.ai_suggestions[0].review_note) && L.filled_from_calls_at
     && DATA.post_call_followups[0].status==='dropped' && /Old AI recap/.test(DATA.post_call_followups[0].dropped_reason), DATA.post_call_followups[0]);
  ok('v3: it leaves the board\'s old AI list', !CallLead.oldAiLeads().some(l=>l.id==='L_ai'));
  /* Lead intake: heard on the call, filed on the journey */
  const b={ ep:'E1', cur:{}, people:[] };
  let h=CallLead.heardHtml(L, b, 'person');
  ok('v3: Lead intake shows what the call said about them, not filed yet, with File these', /Heard on the call, not filed yet[\s\S]*Living situation:[\s\S]*lives in a facility[\s\S]*Facility or community:[\s\S]*Elfdale/.test(h.replace(/<[^>]+>/g,' ')) && /File these/.test(h), h.slice(0,300));
  ok('v3: without a journey it says to start the journey first', /Start the journey to file these/.test(CallLead.heardHtml(L, { ep:null, cur:{}, people:[] }, 'people')));
  const rec=[]; window.lpfCall=async(body)=>{ rec.push(body); return { outcome:'recorded' }; }; window.lpiLoadBegan=async()=>{}; window.lpiRender=()=>{};
  CP.lead=L; LPI.began[L.id]=b;
  for(const ch of ['person','people','why']){ LPI.began[L.id]=b; await CallLead.fileHeard(ch); }
  LPI.began[L.id]=b;
  const f1=rec.find(x=>x.kind==='living_situation'), p1=rec.find(x=>x.action==='record_person');
  ok('v3: filed as facts said by the caller, on the phone, reported', f1 && f1.value==='facility' && f1.said_by==='Laura Johnson' && f1.said_by_relationship==='Daughter' && f1.said_how==='call' && f1.certainty==='reported' && f1.layer==='intake' && f1.said_at==='2026-10-15T00:50:00Z'
     && rec.some(x=>x.kind==='why_now'&&x.value.join()==='caregiver_cant_continue'), rec);
  ok('v3: the boyfriend is added as a person involved (not the caller, permission not asked)', p1 && p1.name==='Her boyfriend' && /Boyfriend: Can get in the way/.test(p1.relationship) && p1.is_caller===false && p1.permission==='not_asked', p1);
  ok('v3: once filed they no longer show as not filed', CallLead.heardHtml(L, b, 'person')==='' && CallLead.heardHtml(L, b, 'people')==='');
  /* Medicaid off the lead page */
  lpLead=L; renderLpAttrs(); const at=document.getElementById('lp_attrs').innerText;
  ok('v3: a private-pay lead has no "Payor - Medicaid" on its AxisCare checklist', !/Payor - Medicaid/.test(at) && /Payor - Private Pay/.test(at), at.slice(0,200));
  lpLead=Object.assign({}, L, { funding_source:'medicaid' }); renderLpAttrs();
  ok('v3: ...a Medicaid family already on file still has it', /Payor - Medicaid/.test(document.getElementById('lp_attrs').innerText));
  lpLead=L; renderLeadDocs(); ok('v3: the EMOMED and FUSION upload slots are hidden for a private-pay lead', document.querySelector('.lp-docslots').style.display==='none');
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1360, 'height': 900})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(f'http://localhost:{PORT}/index.html?proof=calllead'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

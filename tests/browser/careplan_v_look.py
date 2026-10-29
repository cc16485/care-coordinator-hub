"""Care plan Stage 1 (2026-10-29, Samantha approved Stage 1 of "From Visit to First Shift" with her decisions). The real Hub
page, offline, made-up families, a pretend drafting service and a pretend AxisCare. Walks the whole path:
the safety screen (short, follow-ups only when relevant, existing allergies and emergency contact confirmed); Finish asks for
missing safety answers; finishing starts the draft by itself from every visit answer; a failed draft says so with a card and
Try again; the review screen shows the six parts per task with sources and "Ask before approving"; approval is blocked until
every check passes; high-risk concerns need an owner; an unsafe issue (two-person transfer without a lift, a lift for a
Medicaid client) blocks every approval; urgent starts need every safety check and every task instruction, and only the
nonessential parts get a finish-by date (3 days or before the second shift); nothing reaches AxisCare before approval; a
partial push says what worked and stays Approved, not Active; a full push makes it Active and writes the plan the rest of the
Hub reads; changes make a new version while the old one stays active; a later recording never overwrites edited lines; a new
safety concern on an approved plan raises a card at once; a plan written before approvals is kept as version 0; the old form
only saves a draft; no "AI" and no em dashes; it fits an iPad and a phone.
(python3 tests/browser/careplan_v_look.py; SHOTS=<dir> saves screenshots)"""
import os, sys, re, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = os.environ.get('SHOTS')
STUB = r"""
(()=>{
  const W=window; W.__log={ persists:[], drafts:[], cpt:[], asks:[], toast:'' };
  W.__recs=[{ id:'r1', kind:'assessment', status:'done', consent_given:true, part:1 }];
  W.__draftFail=false; W.__pushMode='ok'; W.__ask=true;
  /* the pretend drafting service: tasks from the visit, six parts, one part left for the coordinator */
  W.__draftReply=(b)=>{ const f=Object.fromEntries((b.facts||[]).map(x=>[x.path,x.value])); const S=p=>[{ path:p }];
    const L=(t,p)=>({ text:t, src:S(p), ask:false }), A=()=>({ text:'', src:[], ask:true });
    const tasks=[{ adl_id:11, name:'Bathing - Shower', key:'shower', days:['T','R'], require:1, when:1,
      parts:{ when:L('Tuesdays and Thursdays, after breakfast','visit.acts.bathing.level'), how:{ steps:[L('Ask before starting.','visit.acts.bathing.level'), L('Stay within arm\'s reach on the shower chair.','visit.equipment')], ask:false },
        equipment:L('Shower chair and grab bars.','visit.equipment'), preferences:A(), safety:L('Fell in the shower Oct 12. Never lift her after a fall.','visit.safety.falls_note'), report_if:A() } }];
    if(W.__extraTask) tasks.push({ adl_id:12, name:'Meal Preparation', days:['T','R'], require:1, when:2, parts:{ when:L('Lunch','visit.acts.meals.level'), how:{ steps:[L('Make lunch.','visit.acts.meals.level')], ask:false }, equipment:L('Kitchen.','visit.acts.meals.level'), preferences:L('Soup.','visit.acts.meals.level'), safety:L('Stove off.','visit.acts.meals.level'), report_if:L('Skipped meals.','visit.acts.meals.level') } });
    if(W.__hoyer) tasks.push({ adl_id:13, name:'Transfer - Hoyer Lift', days:['T'], require:1, when:0, parts:{ when:L('Each visit','visit.acts.transfers.level'), how:{ steps:[L('Use the lift.','visit.acts.transfers.level')], ask:false }, equipment:L('Hoyer.','visit.acts.transfers.level'), preferences:L('Slowly.','visit.acts.transfers.level'), safety:L('Two straps.','visit.acts.transfers.level'), report_if:L('Pain.','visit.acts.transfers.level') } });
    const fields={}; ['adl_needs','iadl_needs','medical_conditions','medications','safety_concerns','client_goals','services_recommended','recommended_frequency','recommended_hours_per_week','narrative'].forEach(k=>{ fields[k]=L(k+' from the visit','visit.acts.bathing.level'); });
    fields.medications={ text:'', src:[], ask:true };
    return { ok:true, mode:'visit', model:'claude-opus-5-5', at:new Date().toISOString(), fields, tasks, ask:['Which pharmacy refills her pills?'], dropped:1, parts:W.__recs.filter(r=>r.status==='done').map(r=>({ rec:r.id })), parts_waiting:0 }; };
  const of=W.fetch;
  W.fetch=async(u,o)=>{ u=String(u);
    if(/ai-draft-careplan/.test(u)){ const b=JSON.parse(o.body); W.__log.drafts.push(b); await new Promise(r=>setTimeout(r,30));
      if(W.__draftFail) return new Response(JSON.stringify({ error:'The drafting service did not answer: overloaded. Nothing changed; try again.' }),{ status:502 });
      return new Response(JSON.stringify(W.__draftReply(b)),{ status:200 }); }
    if(/careplan-tasks/.test(u)){ const b=JSON.parse(o.body); W.__log.cpt.push(b);
      if(b.action==='catalog') return new Response(JSON.stringify({ catalog:[{ id:11, name:'Bathing - Shower', adlKey:'shower' },{ id:12, name:'Meal Preparation' },{ id:13, name:'Transfer - Hoyer Lift' }] }),{ status:200 });
      const plan=(DATA.care_plans||[]).find(p=>p.id===b.plan_id), tasks=(plan&&plan.axiscare_tasks)||[];
      if(b.action==='preview') return new Response(JSON.stringify({ client_ax:'777', tasks:tasks.map(t=>({ task:t, name:t.name, state:'new', in_catalog:true })), others:[{ assignment_id:'x9', name:'Companionship', events:[] }], task_errors:[] }),{ status:200 });
      if(b.action==='push'){ const bad=W.__pushMode==='partial';
        const steps=[{ step:'note', ok:true }].concat(tasks.map((t,i)=>({ step:'task', name:t.name, action:'added', ok:!(bad&&i===0), detail:bad&&i===0?'AxisCare answered 500':null })));
        return new Response(JSON.stringify({ outcome:bad?'partly_pushed':'pushed', all_confirmed:!bad, record:{ at:new Date().toISOString(), by:'krystal@mo-care.com', client_ax:'777', steps, readback:tasks.map((t,i)=>({ name:t.name, in_axiscare:!(bad&&i===0), as_planned:!(bad&&i===0) })) } }),{ status:200 }); } }
    return of(u,o); };
  (0,eval)(`sb={ from:(t)=>{ const f=[]; const p={ select(){return p;}, eq(c,v){f.push([c,v]);return p;}, gte(){return p;}, in(){return p;}, order(){return p;}, limit(){return p;}, is(){return p;},
      single:async()=>({ data:null, error:null }), maybeSingle:async()=>({ data:null, error:null }),
      then(a){ const d=t==='recordings'?window.__recs.slice():[]; return Promise.resolve({data:d,error:null}).then(a); } }; return p; },
    storage:{ from:()=>({ upload:async()=>({ error:null }) }) }, rpc:async()=>({data:null,error:null}),
    functions:{ invoke:async()=>({ data:null, error:null }) },
    auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };
    CONFIG.supabase_url='https://zz.supabase.co';
    ME={ email:'krystal@mo-care.com', name:'Krystal Land' }; CC_ROLES=['care_coordinator']; CC_ROLES_CHECKED=true;
    CC_ROLE_BY_EMAIL['krystal@mo-care.com']=['care_coordinator']; CC_ROLE_BY_EMAIL['samantha@mo-care.com']=['owner_admin']; CC_ROLE_BY_EMAIL['val@mo-care.com']=['staffing_coordinator'];
    persist=async(k,v)=>{ window.__log.persists.push([k, JSON.parse(JSON.stringify(v))]); };
    tkMerge=async()=>({}); ccConfirm=async(m)=>{ window.__log.asks.push(m); return window.__ask; }; ccToast=(m)=>{ window.__log.toast=m; };`);
  DATA.ops_settings={}; DATA.care_assessments=[]; DATA.care_plans=[]; DATA.client_profiles=[]; DATA.ops_items=[];
  DATA.leads=[{ id:'lead_betty', first_name:'Karen', last_name:'Price (fake)', relationship:'Daughter', phone:'(417) 555-0172', client_first_name:'Betty', client_last_name:'Harlow (fake)', status:'Contacted', funding_source:'private', axiscare_client_id:'777' },
    { id:'lead_urgent', first_name:'Joe', last_name:'Dunn (fake)', relationship:'Son', phone:'(417) 555-0190', client_first_name:'Ruth', client_last_name:'Dunn (fake)', status:'Contacted', funding_source:'private', desired_start:{ kind:'asap' } },
    { id:'lead_mcd', first_name:'Ann', last_name:'Lee (fake)', relationship:'Self', phone:'(417) 555-0101', client_first_name:'Ann', client_last_name:'Lee (fake)', status:'Contacted', funding_source:'medicaid' }];
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,900)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, q=s=>document.querySelector('#hvRoot '+s), qa=s=>[...document.querySelectorAll('#hvRoot '+s)];
  const c=s=>document.querySelector('#cpvRoot '+s), ca=s=>[...document.querySelectorAll('#cpvRoot '+s)];
  const tap=(p,v)=>{ const b=q('[data-hvp="'+p+'"][data-v="'+v+'"]'); if(!b) throw new Error('no pill '+p+' '+v); b.click(); };
  const type=(p,v)=>{ const el=q('[data-hv="'+p+'"]'); el.value=v; el.dispatchEvent(new Event('input',{bubbles:true})); };
  const card=id=>(DATA.ops_items||[]).find(x=>x.id&&x.id.indexOf(id)===0);
  const ctype=(sel,v)=>{ const el=c(sel); el.value=v; el.dispatchEvent(new Event('input',{bubbles:true})); };
  try{
  /* ---------- the safety screen ---------- */
  await HV.open({ leadId:'lead_betty' }); await sleep(150);
  const a=HV._st.a;
  q('[data-hvs="2"]').click(); await sleep(50);
  const st=()=>q('#hvSafety').innerText;
  ok('Health opens with the safety check; it says how many are still to answer', /Safety check/.test(st()) && /\d+ to answer/.test(st()), st().slice(0,200));
  ok('the emergency contact starts as the caller from the lead, in blue, to confirm', a.visit.safety.ec.name==='Karen Price (fake)' && a.visit.safety.ec.phone==='(417) 555-0172' && q('[data-hv="visit.safety.ec.name"]').classList.contains('hv-from'));
  ok('follow-ups stay hidden until an answer calls for them', !q('[data-hv="visit.safety.falls_note"]') && !q('[data-hvp="visit.safety.two_person"]') && !q('[data-hv="visit.safety.oxygen_note"]') && !q('[data-hv="visit.safety.cognition_note"]') && !q('[data-hv="visit.safety.hazards_note"]'));
  tap('visit.safety.falls','yes'); await sleep(20);
  ok('a fall: "How, where, was anyone hurt?" opens', !!q('[data-hv="visit.safety.falls_note"]'));
  type('visit.safety.falls_note','Fell in the shower Oct 12, bruised hip');
  tap('visit.safety.lives_alone','yes'); tap('visit.acts.mobility.level','standby'); tap('visit.acts.transfers.level','standby');
  tap('visit.memory','no'); tap('visit.supervision','no'); tap('visit.safety.decline','no'); tap('visit.safety.summon','phone'); tap('visit.safety.oxygen','no'); tap('visit.prefs.smoking','no');
  tap('visit.safety.hazards','rugs'); await sleep(20);
  ok('a hazard ticked: a note opens; walking and transfers are the same answers as Daily activities', !!q('[data-hv="visit.safety.hazards_note"]') && a.visit.acts.transfers.level==='standby');
  type('visit.safety.hazards_note','Loose rug in the hall; Karen will remove it');
  q('[data-hva="noallergy"]').click(); await sleep(20);
  ok('"None known" is a real answer for allergies', a.visit.allergies==='None known');
  ok('...but it still has to be confirmed with the family, and so does the emergency contact', CPV.safetyMissing(a.visit).map(m=>m[0]).join('|')==='Allergies confirmed with the family|Emergency contact confirmed with the family', CPV.safetyMissing(a.visit));
  /* Finish with the safety check unfinished */
  q('[data-hvs="7"]').click(); await sleep(30); window.__ask=false; q('[data-hva="finish"]').click(); await sleep(150);
  ok('Finish with safety answers missing: lists them; Cancel goes back to the safety check', /safety check still has 2 to answer/.test(L.asks.slice(-1)[0]) && HV._st.sec===2 && !a.visit.finished_at, L.asks.slice(-1)[0]);
  window.__ask=true; tap('visit.safety.allergies_ok','yes'); tap('visit.safety.ec_ok','yes'); await sleep(20);
  ok('every safety answer in: the tag says All answered', /All answered/.test(st()));
  tap('visit.acts.bathing.level','standby'); a.visit.equipment=['Shower chair','Grab bars']; a.visit.week={ tue:{ from:'09:00', to:'13:00' }, thu:{ from:'09:00', to:'13:00' } };
  /* ---------- finishing starts the draft by itself ---------- */
  q('[data-hvs="7"]').click(); await sleep(30); q('[data-hva="finish"]').click(); await sleep(700);
  const d0=L.drafts[0]||{}, fp=(d0.facts||[]).map(f=>f.path);
  ok('Finish starts the draft at once, from the whole visit (visit mode, safety answers, schedule)', L.drafts.length===1 && d0.mode==='visit' && d0.assessment_id===a.id && fp.includes('visit.safety.falls_note') && fp.includes('visit.allergies') && fp.includes('visit.week') && d0.week.tue.from==='09:00', fp.slice(0,10));
  ok('...each answer says where it came from (the emergency contact was from the phone call, then confirmed)', (d0.facts.find(f=>f.path==='visit.safety.ec')||{}).value.indexOf('(confirmed)')>-1);
  const p=CPV._plan(a), v1=p.versions[0];
  ok('the draft is saved as version 1, Draft ready, with the drafting model and parts it read', p.versions.length===1 && v1.n===1 && v1.status==='draft' && v1.draft.model==='claude-opus-5-5' && v1.draft.parts.join()==='r1', v1.status);
  ok('nothing written to the plan the rest of the Hub reads yet, and nothing sent to AxisCare', !p.adl_needs && !p.axiscare_tasks && !L.cpt.some(x=>x.action==='push'));
  ok('a card to review it, for whoever finished the visit; and an owner card for the fall and the hazard', card('ops_cp_review_') && card('ops_cp_review_').owner==='krystal@mo-care.com' && card('ops_cp_owner_review_') && /fall/i.test(card('ops_cp_owner_review_').detail) && /hazards/i.test(card('ops_cp_owner_review_').detail), (DATA.ops_items||[]).map(x=>x.id));
  /* ---------- the review screen ---------- */
  CPV.open(a.id); await sleep(150);
  const txt=()=>document.getElementById('cpvRoot').innerText;
  ok('the review screen: version 1 Draft ready, the plan, the tasks', /Version 1 · Draft ready/.test(txt()) && /Bathing - Shower/.test(txt()) && /Before approval/.test(txt()));
  ok('each task shows the six parts; lines without a source are yellow "Ask before approving"', ['When','How to help','Equipment and supplies','Their preferences','Safety','Report to the office if'].every(w=>txt().includes(w)) && c('[data-cpv="task.0.report_if"]').classList.contains('cpv-ask') && c('[data-cpv="task.0.report_if"]').placeholder==='Ask before approving');
  ok('...and where each line came from', /From visit: safety.falls_note/.test(txt()));
  const ap=()=>c('[data-cpva="approve"]');
  ok('Approve is locked: report-if, preferences, medicines, the question, the owner reviews and the services tick', ap().disabled && /Report to the office if/i.test(txt()) && /needs an owner's review/.test(txt()) && /I checked that each task/.test(txt()));
  ok('no urgent button for a start that is not urgent', !c('[data-cpva="approveurgent"]'));
  /* a coordinator can't clear a high-risk concern */
  ok("a coordinator sees the concerns but can't mark them reviewed", !c('[data-cpva="riskok"]'));
  ctype('[data-cpv="task.0.report_if"]','Dizzy standing, a new bruise, or she refuses two showers in a row.');
  ctype('[data-cpv="task.0.preferences"]','She keeps a towel over her lap.');
  ctype('[data-cpv="field.medications"]','None she takes herself; Karen fills a weekly box.');
  await sleep(1300);
  c('[data-cpva="askdone"]').click(); await sleep(20); c('[data-cpva="scope"]').click(); await sleep(20);
  ok('typed lines are marked written by a person; the services tick records who', CPV._plan(a).versions[0].tasks[0].parts.report_if.edited && CPV._plan(a).versions[0].scope_ok.by==='Krystal Land');
  ok('still locked: only the owner reviews are left', ap().disabled && CPV.gate(a,CPV._plan(a).versions[0]).cs.filter(x=>!x.ok).every(x=>x.kind==='risk'));
  /* the owner reviews */
  (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha' };"); CPV.open(a.id); await sleep(80);
  const rk=ca('[data-cpva="riskok"]');
  ok('an owner sees Reviewed on each concern', rk.length===2);
  document.getElementById('cpvRisk_risk_falls').value='Stand-by in the shower, never alone in the bathroom'; c('[data-cpva="riskok"][data-k="falls"]').click(); await sleep(30);
  document.getElementById('cpvRisk_risk_hazards').value='Karen removes the hall rug before the first shift'; c('[data-cpva="riskok"][data-k="hazards"]').click(); await sleep(60);
  ok('...each review is saved with who and how the plan handles it; the owner card closes', CPV._plan(a).versions[0].owner_reviews.falls.by==='Samantha' && card('ops_cp_owner_review_').status==='done');
  (0,eval)("ME={ email:'val@mo-care.com', name:'Val' };"); CPV.open(a.id); await sleep(50);
  ok('a staffing coordinator can review but not approve', ap().disabled && /Only care coordinators and owners can approve/.test(txt()));
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Land' };"); CPV.open(a.id); await sleep(50);
  ok('every check done: a care coordinator can approve', !ap().disabled);
  ap().click(); await sleep(80);
  let v=CPV._plan(a).versions[0];
  ok('approved: who, when, normal approval; the review card closes', v.status==='approved' && v.approved_by==='Krystal Land' && v.approved_kind==='normal' && card('ops_cp_review_').status==='done');
  ok('...the concerns at approval are remembered for the safety watch', v.risks_at_approval.join()==='falls,hazards', v.risks_at_approval);
  ok('approved is not sent: AxisCare untouched until Send', !L.cpt.some(x=>x.action==='push') && /Send version 1 to AxisCare/.test(txt()));
  /* a partial push */
  window.__pushMode='partial'; c('[data-cpva="send"]').click(); await sleep(250);
  v=CPV._plan(a).versions[0];
  ok('a partial push shows what worked and what did not, and stays Approved (not Active)', v.status==='approved' && !v.push.verified && /✓ Care plan note/.test(txt()) && /✗ Bathing - Shower/.test(txt()) && /Not every task is confirmed/.test(txt()) && CPV._plan(a).axiscare_synced===false, txt().slice(-600));
  ok('...the approved version was what went: its six parts as the task instructions, and the plan text the Hub reads', /HOW TO HELP:\n1\. Ask before starting\./.test(CPV._plan(a).axiscare_tasks[0].instructions) && /REPORT TO THE OFFICE IF: Dizzy/.test(CPV._plan(a).axiscare_tasks[0].instructions) && /None she takes herself/.test(CPV._plan(a).medications));
  { const nt=(L.cpt.filter(x=>x.action==='push').slice(-1)[0]||{}).note_text||''; ok('...the AxisCare note puts the emergency steps first (never cut off), then the plan', /^CARE PLAN v1/.test(nt) && nt.indexOf('IF SOMETHING GOES WRONG')>-1 && nt.indexOf('IF SOMETHING GOES WRONG')<nt.indexOf('DAILY LIVING') && /Do not lift/.test(nt) && nt.length<=6000, nt.slice(0,300)); }
  ok('...AxisCare tasks not on the plan are left alone (never removed by this)', L.cpt.filter(x=>x.action==='push').every(x=>!(x.remove||[]).length) && /Companionship/.test(txt()));
  window.__pushMode='ok'; c('[data-cpva="send"]').click(); await sleep(250);
  v=CPV._plan(a).versions[0];
  ok('sent again and every task read back: Active in AxisCare; the assessment says pushed', v.status==='active' && v.push.verified && CPV._plan(a).axiscare_synced===true && a.status==='Pushed to AxisCare' && /Every task confirmed in AxisCare/.test(txt()));
  /* versions */
  c('[data-cpva="newver"]').click(); await sleep(50);
  const p2=CPV._plan(a);
  ok('Change this plan starts version 2 as a copy; version 1 stays active and says so', p2.versions.length===2 && p2.versions[1].status==='draft' && p2.versions[0].status==='active' && /Caregivers still follow version 1/.test(txt()) && /v2 draft ready \(v1 active\)/.test(CPV.label(a)), CPV.label(a));
  ctype('[data-cpv="task.0.how"]','Ask before starting.\nRun the water warm first.\nStay within arm\'s reach.'); await sleep(1300);
  /* the rest of the recording arrives later */
  window.__recs.push({ id:'r2', kind:'assessment', status:'done', consent_given:true, part:2 }); window.__extraTask=true;
  CPV.open(a.id); await sleep(150);
  ok('more of the recording written out: "Update the draft" appears', !!c('[data-cpva="recupdate"]'));
  c('[data-cpva="recupdate"]').click(); await sleep(400);
  const v2=CPV._plan(a).versions[1];
  ok('updating never overwrites a line someone edited (the three steps stay); new tasks come in marked new', v2.tasks[0].parts.how.steps.length===3 && /Run the water warm/.test(v2.tasks[0].parts.how.steps[1].text) && v2.tasks.some(t=>t.name==='Meal Preparation' && t.fresh) && /New from the recording/.test(txt()), v2.tasks.map(t=>t.name));
  ok('...version 1 is still the active one', CPV._plan(a).versions[0].status==='active');
  /* a new safety concern on the approved plan */
  HV.close && await HV.close(); await HV.open({ id:a.id }); await sleep(100);
  q('[data-hvs="2"]').click(); tap('visit.safety.oxygen','yes'); tap('visit.prefs.smoking','yes'); await sleep(1600);
  const sc=card('ops_cp_safety_');
  CPV.open(a.id); await sleep(80); c('[data-cpva="ver"][data-n="1"]').click(); await sleep(50);
  ok('the active version shows what it was approved with, no live checklist, and the new concern in red', /Approval/.test(txt()) && !/Before approval/.test(txt()) && /New safety concern since this was approved: Oxygen in a home where someone smokes/.test(txt()) && /Owner review by Samantha/.test(txt()));
  CPV.close();
  ok('a new safety concern after approval raises an urgent card for owners at once', sc && sc.urgency==='high' && sc.owner==='' && /Oxygen in a home where someone smokes/.test(sc.detail) && /version 1 was approved/.test(sc.detail), (DATA.ops_items||[]).map(x=>x.id));
  await HV.close(); await sleep(50);
  /* ---------- an urgent start ---------- */
  window.__extraTask=false; L.drafts.length=0;
  await HV.open({ leadId:'lead_urgent' }); await sleep(120);
  const u=HV._st.a;
  Object.assign(u.visit.safety,{ falls:'no', lives_alone:'no', oxygen:'no', decline:'no', summon:'both', hazards:['none'], allergies_ok:'yes', ec_ok:'yes' });
  Object.assign(u.visit,{ allergies:'Sulfa', memory:'no', supervision:'no', equipment:['Shower chair'], week:{ mon:{ from:'09:00', to:'12:00' }, wed:{ from:'09:00', to:'12:00' } } });
  u.visit.prefs.smoking='no'; u.visit.acts.mobility={ level:'none' }; u.visit.acts.transfers={ level:'none' }; u.visit.acts.bathing={ level:'standby' };
  const t0=new Date(); u.visit.start=t0.getFullYear()+'-'+String(t0.getMonth()+1).padStart(2,'0')+'-'+String(t0.getDate()).padStart(2,'0');
  q('[data-hvs="7"]').click(); await sleep(20); q('[data-hva="finish"]').click(); await sleep(700);
  CPV.open(u.id); await sleep(120);
  ok('an ASAP lead: the plan shows Urgent start and why', /Urgent start/.test(txt()) && /as soon as possible/.test(txt()));
  const urg=()=>c('[data-cpva="approveurgent"]');
  ok('urgent approval is still locked while a task instruction (report if) is missing', urg().disabled);
  ctype('[data-cpv="task.0.report_if"]','A new bruise or dizziness.'); ctype('[data-cpv="field.medications"]','None.'); await sleep(1300);
  c('[data-cpva="scope"]').click(); await sleep(30);
  ok('every safety check and instruction done, preferences and the question still open: urgent approval unlocks, normal approval does not', !urg().disabled && ap().disabled && /can follow an urgent start/.test(txt()));
  urg().click(); await sleep(80);
  const uv=CPV._plan(u).versions[0];
  const fb=Date.parse(uv.urgent.finish_by), three=Date.parse(uv.approved_at)+3*864e5;
  ok('approved for an urgent start; only the nonessential parts are left, with a finish-by date no later than 3 days', uv.status==='approved' && uv.approved_kind==='urgent' && uv.urgent.items.some(x=>/preferences/.test(x)) && uv.urgent.items.some(x=>/Question/.test(x)) && fb<=three+1000, uv.urgent);
  ok('...the date is the earlier of 3 days or before the second shift', uv.urgent.finish_by===CPV.finishBy(u, uv.approved_at));
  const fc=card('ops_cp_finish_');
  ok('...a high-urgency card for the approver, due on that date, listing what is left', fc && fc.owner==='krystal@mo-care.com' && fc.urgency==='high' && fc.due===uv.urgent.finish_by && /preferences/.test(fc.detail));
  ok('finish-by math: before the second shift when that comes first', (()=>{ const x={ visit:{ start:'2026-11-02', week:{ mon:{from:'09:00',to:'12:00'}, tue:{from:'09:00',to:'12:00'} } } }; const f=new Date(CPV.finishBy(x,'2026-11-01T15:00:00Z')); return f.getDate()===3 && f.getHours()===9; })());
  /* ---------- unsafe issues block every approval ---------- */
  u.visit.acts.transfers={ level:'full' }; u.visit.safety.two_person='yes';
  c('[data-cpva="newver"]').click(); await sleep(60);
  ok('a new version starts clean: no urgent banner, approval or owner reviews carried over from version 1', !CPV._plan(u).versions[1].urgent && !CPV._plan(u).versions[1].approved_by && !/finish by/.test(txt().split('Before approval')[0]) && getComputedStyle(urg()).backgroundColor==='rgb(174, 187, 189)');
  ok('needs more than one person to transfer, no lift: unsafe, no approval of any kind', /a lift must be in place first/.test(txt()) && ap().disabled && urg().disabled && /can't be approved while an unsafe issue is open/.test(txt()));
  CPV.close(); u.visit.acts.transfers={ level:'none' }; u.visit.safety.two_person='';
  window.__hoyer=true; await HV.open({ leadId:'lead_mcd' }); await sleep(100);
  const m=HV._st.a; Object.assign(m.visit.safety,{ falls:'no', lives_alone:'no', oxygen:'no', decline:'no', summon:'phone', hazards:['none'], allergies_ok:'yes', ec_ok:'yes' });
  Object.assign(m.visit,{ allergies:'None known', memory:'no', supervision:'no' }); m.visit.prefs.smoking='no'; m.visit.acts.mobility={ level:'none' }; m.visit.acts.transfers={ level:'standby' }; m.visit.acts.bathing={ level:'standby' };
  m.visit.safety.ec={ name:'Ann Lee (fake)', phone:'(417) 555-0101' };
  q('[data-hvs="7"]').click(); await sleep(20); q('[data-hva="finish"]').click(); await sleep(700);
  CPV.open(m.id); await sleep(100);
  ok('a lift task for a Medicaid client: blocked as outside our Medicaid services', /Transfer - Hoyer Lift for a Medicaid client is outside our Medicaid services/.test(txt()) && ap().disabled);
  CPV.close(); window.__hoyer=false;
  /* ---------- a failed draft ---------- */
  window.__draftFail=true; const fa={ id:'asm_fail', lead_id:'lead_betty', client_name:'Betty Harlow (fake)', status:'Completed', visit:JSON.parse(JSON.stringify(a.visit)) }; DATA.care_assessments.push(fa);
  await CPV.draft(fa,{ from:'visit' }); await sleep(50);
  const fv=CPV._plan(fa).versions[0], fcard=(DATA.ops_items||[]).find(x=>x.kind==='care_plan_draft_failed');
  ok('a draft that fails says so in words, with a high card and Try again; never silently', fv.status==='draft_failed' && /overloaded/.test(fv.error) && fcard && fcard.urgency==='high' && fcard.status==='open');
  window.__draftFail=false; CPV.open('asm_fail'); await sleep(60); c('[data-cpva="draftnow"]').click(); await sleep(400);
  ok('...Try again works, and the failed card closes', CPV._plan(fa).versions[0].status==='draft' && fcard.status==='done');
  CPV.close();
  /* ---------- a plan written before approvals ---------- */
  const la={ id:'asm_old', lead_id:'lead_betty', client_name:'Betty Harlow (fake)', status:'Pushed to AxisCare', axiscare_client_id:'777', visit:JSON.parse(JSON.stringify(a.visit)) };
  DATA.care_assessments.push(la); DATA.care_plans.push({ id:'plan_old', assessment_id:'asm_old', adl_needs:'Old words', axiscare_tasks:[{ adl_id:11, name:'Bathing - Shower', days:['T'], require:1, when:0, instructions:'Help her shower' }], created_at:'2026-09-01' });
  CPV.open('asm_old'); await sleep(80);
  ok('a plan written before approvals shows as version 0, read-only, kept as it was', /Version 0 · Before versions/.test(txt()) && /Written before care plans had approvals/.test(txt()) && !c('[data-cpv]') && /Old words/.test(txt()));
  c('[data-cpva="draftnow"]').click(); await sleep(400);
  const op=DATA.care_plans.find(x=>x.id==='plan_old');
  ok('...drafting version 1 keeps version 0 in the history and leaves the old plan fields untouched', op.versions.length===2 && op.versions[0].n===0 && op.versions[0].fields.adl_needs.text==='Old words' && op.adl_needs==='Old words' && /Old words/.test((L.drafts.slice(-1)[0]||{}).earlier||''));
  CPV.close();
  /* ---------- the old form only saves a draft ---------- */
  const before=L.cpt.filter(x=>x.action==='push').length;
  openPlanForAssessment('asm_old'); await sleep(50);
  ok('the old care plan form has no push button any more', !document.querySelector('#planModalBackdrop [onclick="savePlan(true)"]') && /Save as a draft for review/.test(document.querySelector('#planModalBackdrop').innerText));
  document.getElementById('plan_safety_concerns').value='Typed in the old form'; await savePlan(false); await sleep(80);
  ok('...saving it makes a draft version for review, sends nothing', L.cpt.filter(x=>x.action==='push').length===before && /Typed in the old form/.test(JSON.stringify(op.versions.slice(-1)[0].fields)) && !!document.getElementById('cpvRoot'));
  CPV.close();
  /* the Care tab line */
  CP.lead=DATA.leads[0]; CP.ax=''; document.getElementById('leadProfileView').style.display='block'; try{ cpShowTab('care'); }catch(e){} cpRenderCare(); await sleep(30);
  const care=document.getElementById('cp_care').innerHTML;
  ok('the Care tab shows each plan version and status and opens the review screen', /care plan v2 draft ready \(v1 active\)/.test(care) && /CPV\.open/.test(care), care.match(/care plan v[^<]*/g));
  CPV.open(a.id); await sleep(80);
  const all=document.getElementById('cpvRoot').innerText;
  ok('no "AI" words and no em dashes on the care plan screen', !/\bAI\b/.test(all) && !all.includes('—'));
  }catch(e){ R.push(['FAIL','the walk-through stopped: '+e.message, (e.stack||'').split('\n')[1]]); }
  return R;
}
"""
MIME = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.json':'application/json', '.webmanifest':'application/json'}
def serve(route):
    url = route.request.url
    if 'supabase.co' in url: return route.abort()
    if not url.startswith('http://hv.local/'): return route.continue_()
    p = (ROOT / url.split('http://hv.local/', 1)[1].split('?')[0].split('#')[0])
    if not p.is_file(): return route.fulfill(status=404, body='')
    route.fulfill(status=200, body=p.read_bytes(), content_type=MIME.get(p.suffix, 'application/octet-stream'))
def overflow(pg, rid):
    return pg.evaluate("rid=>{ const r=document.getElementById(rid); if(!r) return 'none'; const w=r.clientWidth; return [...r.querySelectorAll('*')].filter(e=>{ const b=e.getBoundingClientRect(); return b.width>0 && b.right>w+1 && !e.closest('.hv-rail'); }).slice(0,4).map(e=>e.className+' '+Math.round(e.getBoundingClientRect().right)); }", rid)
with sync_playwright() as pw:
    b = pw.chromium.launch(); cx = b.new_context(viewport={'width': 1180, 'height': 820}, timezone_id='America/Chicago', has_touch=True); pg = cx.new_page()
    pg.route('**/*', serve)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://hv.local/index.html?proof=careplan'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T)
    for w, h, name in [(1180, 820, 'iPad (1180 wide)'), (820, 1180, 'iPad upright (820 wide)'), (390, 844, 'phone (390 wide)')]:
        pg.set_viewport_size({'width': w, 'height': h}); pg.wait_for_timeout(150)
        o = overflow(pg, 'cpvRoot'); R.append(['PASS' if not o else 'FAIL', f'{name}, care plan screen: nothing runs off the side', o])
        if SHOTS:
            os.makedirs(SHOTS, exist_ok=True); pg.screenshot(path=os.path.join(SHOTS, f'cpv-{w}.png'))
    pg.evaluate("async()=>{ CPV.close(); await HV.open({ leadId:'lead_betty' }); document.querySelector('#hvRoot [data-hvs=\"2\"]').click(); }"); pg.wait_for_timeout(200)
    for w, h, name in [(1180, 820, 'iPad (1180 wide)'), (390, 844, 'phone (390 wide)')]:
        pg.set_viewport_size({'width': w, 'height': h}); pg.wait_for_timeout(150)
        o = overflow(pg, 'hvRoot'); R.append(['PASS' if not o else 'FAIL', f'{name}, safety check: nothing runs off the side', o])
        if SHOTS: pg.screenshot(path=os.path.join(SHOTS, f'safety-{w}.png'))
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

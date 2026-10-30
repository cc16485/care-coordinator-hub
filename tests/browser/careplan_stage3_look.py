"""Care plan Stage 3 (2026-10-29, Samantha: "Stage 3 approved as written, with your suggestions on the 4 decisions"). The real
Hub page, offline, a made-up family whose lead came from a phone call, a pretend drafting service and a pretend fact door.
Proves: what a call or the lead put in a box is kept; "Checked with the family" turns a blue answer into one the family
confirmed; "Seen" can be ticked only on the equipment, hazards, getting in, stairs, walking and transfers, and the draft is
told how each answer is known; the care plan screen shows each line's mark; a visit that changed what a call said is flagged
"doesn't match" and approval waits for "Checked"; the recording reader's missed or unclear items are questions an urgent start
can follow; the care needs worked out from the visit follow her approved table (help levels, skills, two-person, gender,
Spanish, pets, smoking), never send an unchecked phone-call answer or an unanswered activity, and can be unticked; on
approval they go through the same door as the Care needs card, with the approver's name; with no Start of Care yet they
wait and go when it starts; an answer already on file is not sent again and a newer one is never overwritten; a refusal says
so with Try again; a new version checks them again; no "AI" and no em dashes; it fits an iPad and a phone.
(python3 tests/browser/careplan_stage3_look.py; SHOTS=<dir> saves screenshots)"""
import os, sys, re, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = os.environ.get('SHOTS')
STUB = r"""
(()=>{
  const W=window; W.__log={ persists:[], drafts:[], facts:[], asks:[] }; W.__ask=true;
  W.__T={ episode_source:[], client_fact_current:[], person_source_id:[], journey_episode:[], recordings:[] }; W.__refuse=null;
  const L=(t,p)=>({ text:t, src:[{ path:p }], ask:false });
  const of=W.fetch;
  W.fetch=async(u,o)=>{ u=String(u);
    if(/ai-draft-careplan/.test(u)){ W.__log.drafts.push(JSON.parse(o.body)); const fields={}; ['adl_needs','iadl_needs','medical_conditions','medications','safety_concerns','client_goals','services_recommended','recommended_frequency','recommended_hours_per_week','narrative'].forEach(k=>fields[k]=L(k+' from the visit','visit.acts.bathing.level'));
      return new Response(JSON.stringify({ ok:true, model:'m', at:new Date().toISOString(), fields, ask:[], parts:[], tasks:[{ adl_id:11, name:'Bathing - Shower', days:['T'], require:1, when:1,
        parts:{ when:L('Tuesday morning','visit.acts.bathing.level'), how:{ steps:[L('Stay close.','visit.equipment')], ask:false }, equipment:L('Shower chair.','visit.equipment'), preferences:L('Towel over her lap.','visit.acts.bathing.level'), safety:L('Stand slowly.','visit.acts.bathing.level'), report_if:L('Dizziness.','visit.acts.bathing.level') } }] }),{ status:200 }); }
    if(/careplan-tasks/.test(u)) return new Response(JSON.stringify({ catalog:[] }),{ status:200 });
    return of(u,o); };
  (0,eval)(`sb={ from:(t)=>{ const f=[]; const p={ select(){return p;}, eq(c,v){f.push([c,v]);return p;}, gte(){return p;}, in(){return p;}, order(){return p;}, limit(){return p;}, is(){return p;},
      single:async()=>({ data:null, error:null }), maybeSingle:async()=>({ data:null, error:null }),
      then(a){ const d=(window.__T[t]||[]).filter(r=>f.every(([c,v])=>r[c]===undefined||r[c]===v)); return Promise.resolve({data:d,error:null}).then(a); } }; return p; },
    storage:{ from:()=>({ upload:async()=>({ error:null }) }) }, rpc:async()=>({data:null,error:null}), functions:{ invoke:async()=>({ data:null, error:null }) },
    auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };
    CONFIG.supabase_url='https://zz.supabase.co';
    lpfCall=async(b)=>{ window.__log.facts.push(JSON.parse(JSON.stringify(b))); if(window.__refuse&&window.__refuse===b.kind) return { outcome:'refused', message:'stale: someone saved a newer answer' }; return { outcome:'recorded' }; };
    ME={ email:'krystal@mo-care.com', name:'Krystal Land' }; CC_ROLES=['care_coordinator']; CC_ROLES_CHECKED=true;
    CC_ROLE_BY_EMAIL['krystal@mo-care.com']=['care_coordinator']; CC_ROLE_BY_EMAIL['samantha@mo-care.com']=['owner_admin'];
    persist=async(k,v)=>{ window.__log.persists.push([k, JSON.parse(JSON.stringify(v))]); };
    tkMerge=async()=>({}); ccConfirm=async(m)=>{ window.__log.asks.push(m); return window.__ask; }; ccToast=()=>{};`);
  DATA.ops_settings={ care_needs_live:true }; DATA.care_assessments=[]; DATA.care_plans=[]; DATA.client_profiles=[]; DATA.ops_items=[];
  DATA.leads=[{ id:'lead_betty', first_name:'Karen', last_name:'Price (fake)', relationship:'Daughter', phone:'(417) 555-0172', client_first_name:'Betty', client_last_name:'Harlow (fake)', client_gender:'Female', status:'Contacted',
    funding_source:'private', mobility:'walker', from_calls:[{ message_id:'m1' }], call_profile:{ facts:{ allergies:'Penicillin (hives)' }, people:[] }, client_attributes:{ female_caregiver:'yes', dogs:'yes' } }];
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,900)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, q=s=>document.querySelector('#hvRoot '+s), qa=s=>[...document.querySelectorAll('#hvRoot '+s)];
  const c=s=>document.querySelector('#cpvRoot '+s), ca=s=>[...document.querySelectorAll('#cpvRoot '+s)];
  const tap=(p,v)=>{ const b=q('[data-hvp="'+p+'"][data-v="'+v+'"]'); if(!b) throw new Error('no pill '+p+' '+v); b.click(); };
  const type=(p,v)=>{ const el=q('[data-hv="'+p+'"]'); if(!el) throw new Error('no box '+p); el.value=v; el.dispatchEvent(new Event('input',{bubbles:true})); };
  const txt=()=>document.getElementById('cpvRoot').innerText;
  try{
  await HV.open({ leadId:'lead_betty' }); await sleep(150);
  const a=HV._st.a, v=a.visit;
  ok('what the call and the lead put in boxes is kept (allergies, walker, female caregiver, dogs, the emergency contact)', v.call_said['visit.allergies']==='Penicillin (hives)' && v.call_said['visit.equipment:Walker']===true && v.call_said['visit.prefs.gender:female_preferred']===true && v.call_said['visit.prefs.dogs:yes']===true && v.call_said['visit.safety.ec.name']==='Karen Price (fake)', v.call_said);
  q('[data-hvs="5"]').click(); await sleep(40);
  const chk=q('#hvSafety [data-hva="checked"][data-p="visit.allergies"]');
  ok('a blue answer has "Checked with the family"', !!chk && q('[data-hv="visit.allergies"]').classList.contains('hv-from'));
  chk.click(); await sleep(30);
  ok('...tapped: the blue goes and the answer counts as confirmed by the family', !q('[data-hv="visit.allergies"]').classList.contains('hv-from') && HV.markFor(a,'visit.allergies')==='checked' && /checked with the family at the visit/.test((HV.factsFor(a).find(f=>f.path==='visit.allergies')||{}).value));
  ok('...one confirmation, not two: the safety check counts allergies as confirmed', v.safety.allergies_ok==='yes');
  ok('...and it is not a mismatch (same words as the call)', !HV.mismatchesFor(a).some(m=>m[0]==='visit.allergies'));
  /* Seen ticks: only on the six things that can be seen */
  const seenKeys=()=>qa('.hv-sec[data-sec="'+HV._st.sec+'"] [data-hva="seen"]').map(b=>b.getAttribute('data-p'));
  ok('Seen is offered on walking, transfers and hazards (safety check) and the equipment (Health)', ['visit.acts.mobility.level','visit.acts.transfers.level','visit.safety.hazards','visit.equipment'].every(k=>seenKeys().includes(k)) && seenKeys().length===4, seenKeys());
  q('[data-hva="seen"][data-p="visit.equipment"]').click(); await sleep(30);
  ok('Seen ticked: the equipment is verified, with who', HV.markFor(a,'visit.equipment')==='seen' && v.seen_visit['visit.equipment'].by==='Krystal Land' && /Seen at the visit/.test(q('[data-hva="seen"][data-p="visit.equipment"]').innerText));
  /* the visit changes what the call said */
  tap('visit.equipment','Walker'); tap('visit.equipment','Wheelchair'); await sleep(20);
  const mm=HV.mismatchesFor(a);
  ok("the call's walker is gone at the visit: flagged as doesn't match, with what each said", mm.some(m=>m[0]==='visit.equipment:Walker' && /Equipment/.test(m[1]) && m[3]==='Wheelchair'), mm);
  ok('the facts the draft reads say how each answer is known (seen)', /seen by the coordinator/.test((HV.factsFor(a).find(f=>f.path==='visit.equipment')||{}).value));
  q('[data-hvs="9"]').click(); await sleep(30);
  ok('Home and safety (the Home walk-through) offers Seen on getting in and stairs', seenKeys().includes('visit.home.entry') && seenKeys().includes('visit.home.stairs') && seenKeys().length===2, seenKeys());
  q('[data-hvs="4"]').click(); await sleep(30); const sk4=seenKeys();
  q('[data-hvs="6"]').click(); await sleep(30);
  ok('no Seen anywhere else (Around the house and Personal care have none)', !sk4.length && !seenKeys().length, [sk4, seenKeys()]);
  /* answers for the needs */
  q('[data-hvs="5"]').click(); await sleep(20); tap('visit.safety.ec_ok','yes'); await sleep(20);
  ok('confirming the emergency contact on the safety check clears its blue boxes', !Object.keys(v.from_call||{}).some(k=>/safety\.ec\./.test(k)) && HV.markFor(a,'visit.safety.ec.name')==='checked');
  Object.assign(v.safety,{ falls:'no', lives_alone:'no', oxygen:'no', decline:'no', summon:'phone', hazards:['none'] });
  Object.assign(v,{ memory:'no', supervision:'no' }); v.prefs.smoking='no'; v.prefs.skills=['dementia_care'];
  v.acts.mobility={ level:'standby' }; v.acts.transfers={ level:'standby' }; v.acts.bathing={ level:'standby' }; v.acts.dressing={ level:'cues' }; v.acts.meals={ level:'full' }; v.acts.meds={ level:'needed' }; v.acts.transport={ level:'none' }; v.acts.eating={ level:'none' };
  v.after={ at:'2026-10-30', summary:'s', fills:[], voices:[], missed:[{ title:'Evening medicines', text:'Ask which is right.' }] };
  const nd=CPV.needsFrom(a), nm=Object.fromEntries(nd.map(x=>[x.kind,x.value]));
  ok("needs follow her table: bathing, dressing, walking, meals, medication reminders and dementia Required; eating and transportation No", nm.need_bathing==='required' && nm.need_dressing_grooming==='required' && nm.need_walking_wheelchair==='required' && nm.need_meals_housekeeping==='required' && nm.need_med_reminders==='required' && nm.need_dementia_care==='required' && nm.need_feeding==='no' && nm.need_transportation==='no', nm);
  ok('...transfers alone never sends gait belt; toileting (unanswered) sends nothing; no two-person (not asked)', !('need_transfers_gait_belt' in nm) && !('need_toileting' in nm) && !('need_more_than_one_to_transfer' in nm));
  ok('...the female caregiver and dogs said only by the lead and never checked are not sent; smoking (answered) is', !('pref_caregiver_gender' in nm) && !('home_dogs' in nm) && nm.home_smoking==='no');
  q('[data-hvs="7"]').click(); await sleep(30); q('[data-hva="checked"][data-p="visit.prefs.gender"]').click(); await sleep(20);
  ok('once the gender is checked with the family, it is sent', CPV.needsFrom(a).some(x=>x.kind==='pref_caregiver_gender' && x.value==='female_preferred'));
  /* finish, draft, review */
  q('[data-hvs="10"]').click(); await sleep(20); q('[data-hva="finish"]').click(); await sleep(600);
  CPV.open(a.id); await sleep(150);
  ok('the care plan screen shows each line\'s mark (seen, family)', /From visit \(seen at the visit\): equipment/.test(txt()) && /From visit \(family\): acts.bathing.level/.test(txt()), txt().match(/From visit[^\n]{0,60}/g));
  ok("doesn't match is on the checklist and holds approval", /Doesn't match: Equipment/.test(txt()) && c('[data-cpva="approve"]').disabled);
  ok('missed or unclear is a question that can follow an urgent start', /Missed or unclear: Evening medicines\. Ask which is right\. \(can follow an urgent start\)/.test(txt()));
  ok('the care needs for matching are listed for the approver, each ticked', /Care needs for matching/.test(txt()) && ca('[data-cpvneed]').length===nd.length+1 && ca('[data-cpvneed]').every(x=>x.checked), ca('[data-cpvneed]').length);
  const tr=c('[data-cpvneed="need_transportation"]'); tr.checked=false; tr.dispatchEvent(new Event('change',{bubbles:true})); await sleep(30);
  document.getElementById('cpvMm_visit_equipment_Walker').value='They switched to a wheelchair last week'; c('[data-cpva="mmok"]').click(); await sleep(40);
  ok('Checked: the flag clears, with who and the note, on the visit record', a.visit.mismatch_ok['visit.equipment:Walker'].by==='Krystal Land' && /wheelchair last week/.test(a.visit.mismatch_ok['visit.equipment:Walker'].note) && !/Doesn't match: Equipment/.test(txt()));
  c('[data-cpva="misseddone"]').click(); await sleep(20); c('[data-cpva="scope"]').click(); await sleep(30);
  ok('every check done: approve unlocks', !c('[data-cpva="approve"]').disabled, txt().slice(txt().indexOf('Before approval'),txt().indexOf('Before approval')+900));
  c('[data-cpva="approve"]').click(); await sleep(300);
  let vv=CPV._plan(a).versions[0];
  ok('approved with the needs; transportation left out by the approver', vv.status==='approved' && vv.care_needs.items.length===nd.length && !vv.care_needs.items.some(x=>x.kind==='need_transportation') && vv.care_needs.unticked.join()==='Driving clients to appointments and errands');
  ok('no Start of Care yet: nothing sent, the plan says it waits for Start of Care', vv.care_needs.status==='waiting' && !L.facts.length && /Waiting for Start of Care/.test(txt()));
  /* Start of Care begins */
  window.__T.episode_source=[{ episode_id:'ep1', system:'lead', role:'origin', source_ref:'lead_betty' }];
  window.__T.client_fact_current=[{ fact_id:'f1', episode_id:'ep1', kind:'need_bathing', layer:'plan', value:'required', recorded_at:'2026-10-01T00:00:00Z' },
    { fact_id:'f2', episode_id:'ep1', kind:'need_dementia_care', layer:'plan', value:'no', recorded_at:'2026-10-01T00:00:00Z' },
    { fact_id:'f3', episode_id:'ep1', kind:'need_med_reminders', layer:'plan', value:'no', recorded_at:'2099-01-01T00:00:00Z' }];
  window.__refuse='need_meals_housekeeping';
  c('[data-cpva="needsretry"]').click(); await sleep(300);
  vv=CPV._plan(a).versions[0]; const res=vv.care_needs.results, sent=L.facts.map(f=>f.kind);
  ok('once the journey exists: sent through the same door, care plan layer, confirmed, at the approval time', L.facts.length>0 && L.facts.every(f=>f.action==='record' && f.episode_id==='ep1' && f.layer==='plan' && f.certainty==='confirmed' && f.said_at===vv.approved_at), L.facts[0]);
  ok('an answer already on file is not sent again (bathing)', !sent.includes('need_bathing') && res.need_bathing.outcome==='same');
  ok('an older different answer is updated, replacing it by id (dementia)', L.facts.some(f=>f.kind==='need_dementia_care' && f.change_kind==='update' && f.supersedes_fact_id==='f2' && f.value==='required'));
  ok('a newer answer on file is never overwritten (medication reminders)', !sent.includes('need_med_reminders') && res.need_med_reminders.outcome==='kept_newer' && /kept the newer answer on file: No/.test(txt()));
  ok('a refusal says so, Not every need was sent, with Try again', vv.care_needs.status==='partly' && res.need_meals_housekeeping.ok===false && /Not every need was sent/.test(txt()) && !!c('[data-cpva="needsretry"]') && /stale/.test(txt()));
  window.__refuse=null; const before=L.facts.length; c('[data-cpva="needsretry"]').click(); await sleep(300);
  vv=CPV._plan(a).versions[0];
  ok('Try again sends only what did not go, and then all is sent', L.facts.length===before+1 && L.facts[L.facts.length-1].kind==='need_meals_housekeeping' && vv.care_needs.status==='sent' && /Sent to caregiver matching/.test(txt()));
  c('[data-cpva="newver"]').click(); await sleep(60);
  const v2=CPV._plan(a).versions[1];
  ok('a new version checks the needs again (nothing carried over)', !v2.care_needs && ca('[data-cpvneed]').length>0);
  const all=txt();
  ok('no "AI" words and no em dashes', !/\bAI\b/.test(all) && !all.includes('—'));
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
    pg.goto('http://hv.local/index.html?proof=stage3'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T)
    for w, h, name in [(1180, 820, 'iPad (1180 wide)'), (390, 844, 'phone (390 wide)')]:
        pg.set_viewport_size({'width': w, 'height': h}); pg.wait_for_timeout(150)
        o = overflow(pg, 'cpvRoot'); R.append(['PASS' if not o else 'FAIL', f'{name}, care plan screen: nothing runs off the side', o])
        if SHOTS:
            os.makedirs(SHOTS, exist_ok=True); pg.screenshot(path=os.path.join(SHOTS, f's3-cpv-{w}.png'))
    pg.evaluate("async()=>{ const id=CPV._s.a.id; CPV.close(); await HV.open({ id, sec:'health' }); }"); pg.wait_for_timeout(250)
    for w, h, name in [(1180, 820, 'iPad (1180 wide)'), (390, 844, 'phone (390 wide)')]:
        pg.set_viewport_size({'width': w, 'height': h}); pg.wait_for_timeout(150)
        o = overflow(pg, 'hvRoot'); R.append(['PASS' if not o else 'FAIL', f'{name}, Health with Seen and Checked: nothing runs off the side', o])
        if SHOTS: pg.screenshot(path=os.path.join(SHOTS, f's3-health-{w}.png'))
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

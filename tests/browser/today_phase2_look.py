"""Today cockpit, Phase 2 (the Hub closes its own loops): the cards the server opens answer in place. The real page,
offline, made-up people only; saves are recorded, never sent, and nobody is texted or emailed.
(python3 tests/browser/today_phase2_look.py, with the static server on 8765)"""
from playwright.sync_api import sync_playwright

STUB = r"""
(()=>{
  const W=window, H=h=>new Date(Date.now()+h*36e5).toISOString();
  W.__log={ writes:[], fn:[], rpc:[], toasts:[] };
  const K='krystal@mo-care.com', S='samantha@mo-care.com';
  W.__store={ coverage_cases:[
    { id:'c2', status:'needs_outcome', client:'Ted B. (fake)', shift_date:'2026-10-05', shift_time:'14:00-16:00', closure_notified:H(-1), closure_skip_reason:'The shift was over before the case closed; no texts sent.', family_notified:H(-1), family_no_recipients:true, family_skip_reason:'x', closed_after_shift:true },
    { id:'c3', status:'needs_outcome', client:'Old C. (fake)', shift_date:'2026-09-16', shift_time:'09:00-11:00', closure_notified:H(-1), closed_after_shift:true },
    { id:'c6', status:'done', client:'Uncov F. (fake)', resolved_how:'uncovered', resolved_at:H(-1), family_call_item:'ops_famcall_c6' },
    { id:'c8', status:'resolved', client:'Ruth A. (fake)', resolved_how:'covered', covered_by:'Joyce Kim', closed_after_shift:true,
      closure_notified:H(-1), closure_courtesy_count:0, closure_skip_reason:'Closed by Cara after the shift was over, from AxisCare; no texts sent.',
      family_notified:H(-1), family_notified_count:0, family_no_recipients:true, family_skip_reason:'Closed by Cara after the shift was over, from AxisCare; no texts sent.', asked:[] } ] };
  const clone=x=>JSON.parse(JSON.stringify(x));
  const q=()=>{ const st={key:null}; const p=new Proxy(function(){}, { get(_,k){
      if(k==='then') return (a,b)=>Promise.resolve({data:[],error:null}).then(a,b);
      if(k==='maybeSingle'||k==='single') return ()=>Promise.resolve({ data: st.key&&W.__store[st.key]?{data:clone(W.__store[st.key])}:null, error:null });
      return (...args)=>{ if(k==='eq'&&args[0]==='key') st.key=args[1]; return p; }; } }); return p; };
  W.__q=q;
  (0,eval)(`sb={ from:()=>window.__q(), rpc:(n)=>{ window.__log.rpc.push(n); return Promise.resolve({data:null,error:null}); },
    auth:{ getSession:async()=>({data:{session:null}}), getUser:async()=>({data:{user:null}}) },
    functions:{ invoke:async(n)=>{ window.__log.fn.push(n); return {data:null,error:null}; } }, storage:{ from:()=>({}) } };
    ME={ email:'${K}', name:'Krystal Land', shift:'day' };
    OPS_PEOPLE=[{ person_id:'p_k', full_name:'Krystal Land', primary_email:'${K}' },{ person_id:'p_s', full_name:'Samantha Troutman', primary_email:'${S}' }];
    OPS_DOMAINS=[{ code:'scheduling_coverage', label:'Scheduling and coverage', owner_person:'p_k', escalation_person:'p_s' },
                 { code:'caregiver_performance', label:'Caregiver Performance', owner_person:'p_k', escalation_person:'p_s' }];`);
  W.persist=async(k,v)=>{ W.__log.writes.push(k+':'+v.id); const a=W.__store[k]=W.__store[k]||[]; const i=a.findIndex(x=>x.id===v.id); if(i>=0) a[i]=clone(v); else a.push(clone(v)); };
  W.ccOpsRefresh=()=>{}; W.ccRecentFetch=async()=>{}; W.ccToast=m=>W.__log.toasts.push(m);
  DATA.coverage_cases=clone(W.__store.coverage_cases); DATA.leads=DATA.leads||[];
  DATA.ops_items=[
    { id:'ops_covq_c2', kind:'coverage_outcome', case_id:'c2', status:'open', domain:'scheduling_coverage', title:"Was Ted B. (fake)'s shift covered? (Mon, Oct 5, 2pm-4pm)", about:'Ted B. (fake)',
      detail:'The shift is over and AxisCare shows nobody on the shift.', owner:K, urgency:'today', due:H(3), created_at:H(-1), created_by:'coverage-watch', opened_by:'loops' },
    { id:'ops_covq_c3', kind:'coverage_outcome', case_id:'c3', status:'open', domain:'scheduling_coverage', title:"Was Old C. (fake)'s shift covered?", about:'Old C. (fake)', owner:K, urgency:'today', due:H(3), created_at:H(-1), created_by:'coverage-watch', opened_by:'loops' },
    { id:'ops_famcall_c6', kind:'family_call', case_id:'c6', status:'open', domain:'scheduling_coverage', title:"Call Uncov F. (fake)'s family: the shift wasn't covered", about:'Uncov F. (fake)', owner:K, urgency:'urgent', due:H(1), created_at:H(-1), created_by:'coverage-watch', opened_by:'loops' },
    { id:'ops_evvrev_2026-09-28', kind:'evv_review', status:'open', domain:'caregiver_performance', title:'Caregiver EVV Review, week of Sep 28: 1 below 90%', about:'1 caregiver',
      detail:'• Joyce Kim (fake): 6 of 7 visits (85%)', owner:K, urgency:'normal', due:H(2), created_at:H(-1), created_by:'coverage-watch', opened_by:'loops' },
    { id:'ops_evvfix_9301', kind:'evv_fix', status:'open', domain:'scheduling_coverage', title:"EVV fix needed: Maria Lopez (fake), Ruth's 9am shift had no clock-in", about:'Maria Lopez (fake)', owner:K, urgency:'today', due:H(3), created_at:H(-1), created_by:'timekeeper-watch', opened_by:'loops' } ];
})();
"""

T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, S=window.__store, item=id=>DATA.ops_items.find(x=>x.id===id), kase=id=>S.coverage_cases.find(c=>c.id===id);
  const card=id=>document.querySelector('.wkcard[data-id="'+id+'"]');
  const press=(id,label)=>{ const b=[...card(id).querySelectorAll('button')].find(x=>x.textContent===label); if(!b) throw new Error('no '+label+' on '+id); b.click(); };
  document.getElementById('appScreen').classList.add('on');
  switchTab('mywork'); myWorkGo('today'); await sleep(150);

  ok('the new cards have plain labels', ['coverage_outcome','family_call','evv_review','evv_fix'].map(k=>opsKindLabel({kind:k})).join('|')==='Was it covered?|Call the family|Caregiver EVV review|EVV fix needed');
  ok('"Was it covered?" answers in place: Covered / Not covered / Client cancelled', ['Covered','Not covered','Client cancelled'].every(l=>[...card('ops_covq_c2').querySelectorAll('button')].some(b=>b.textContent===l))
     && /Answering closes the case\. No texts are sent\./.test(card('ops_covq_c2').innerText));
  ok('...and says why it is yours (the role, not the alert list)', /Why you’re seeing this: You own Scheduling and coverage\./.test(card('ops_covq_c2').innerText), card('ops_covq_c2').innerText.slice(0,300));
  ok('the family card: called / already knew, and the Hub never calls', /I called the family/.test(card('ops_famcall_c6').innerText) && /They already knew/.test(card('ops_famcall_c6').innerText) && /never calls or texts the family itself/.test(card('ops_famcall_c6').innerText));
  ok('the EVV review opens Attendance; the EVV fix opens Missing EVV', /Open Attendance/.test(card('ops_evvrev_2026-09-28').innerText) && /Open Missing EVV/.test(card('ops_evvfix_9301').innerText));

  /* Not covered */
  L.writes.length=0; press('ops_covq_c2','Not covered'); await sleep(150);
  let c=kase('c2');
  ok('Not covered: the case is closed by a person (Done), as not covered', c.status==='done' && c.resolved_how==='uncovered' && c.resolved_by==='krystal@mo-care.com' && /recorded: not covered/.test(c.note), c);
  ok('...still marked so nothing is texted (its no-texts mark kept)', !!c.closure_notified && /no texts sent/.test(c.closure_skip_reason), c);
  ok('...the question card is Done with the answer', item('ops_covq_c2').status==='done' && item('ops_covq_c2').close_note==='Answered: not covered');
  const fam=item('ops_famcall_c2');
  ok('...and a "call the family" card lands on MY list, urgent, with ownership history', fam && fam.owner==='krystal@mo-care.com' && fam.urgency==='urgent' && fam.owner_history[0].how==='assigned' && c.family_call_item==='ops_famcall_c2', fam);
  ok('...saved: the case, the question, the family card', L.writes.includes('coverage_cases:c2') && L.writes.includes('ops_items:ops_covq_c2') && L.writes.includes('ops_items:ops_famcall_c2'), L.writes);

  /* Covered */
  press('ops_covq_c3','Covered'); await sleep(150);
  c=kase('c3');
  ok('Covered: closed as covered another way; family marked "no texts" (nothing will be sent)', c.status==='done' && c.resolved_how==='covered_other_way' && !!c.family_notified && c.family_no_recipients===true, c);
  ok('...no family card for a covered shift', !item('ops_famcall_c3'));

  /* the family call */
  myWorkGo('today'); await sleep(80);
  press('ops_famcall_c6','I called the family'); await sleep(150);
  ok('I called the family: recorded on the case with who and when; the card is Done', kase('c6').family_contact?.how==='called' && kase('c6').family_contact.by==='krystal@mo-care.com' && item('ops_famcall_c6').status==='done', kase('c6'));

  /* the case view says the truth */
  const loopU=covLoopHtml(kase('c6')), loopC=covLoopHtml(kase('c8'));
  ok('case view (not covered): "The family was called · Krystal Land"', /The family was called · Krystal Land/.test(loopU), loopU);
  ok('case view (closed by Cara after the shift): says no texts were sent, never "no consent on file"', /no texts sent/.test(loopC) && !/texting consent/.test(loopC), loopC);

  ok('nothing was texted, emailed or called', L.fn.length===0 && L.rpc.length===0, [L.fn,L.rpc]);
  return R;
}
"""

R = []
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1360, 'height': 900})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=today2'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

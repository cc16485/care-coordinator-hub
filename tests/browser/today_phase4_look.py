"""Today cockpit, Phase 4: the Staffing view of Today and Prepare Stand-Up. The real page, offline, made-up people
only; saves are recorded, never sent; nobody is texted or emailed. (python3 tests/browser/today_phase4_look.py, with the
static server on 8765)"""
from playwright.sync_api import sync_playwright
STUB = r"""
(()=>{
  const W=window, H=h=>new Date(Date.now()+h*36e5).toISOString();
  const chi=d=>new Date(Date.now()+d*864e5).toLocaleDateString('en-CA',{timeZone:'America/Chicago'});
  const hm=h=>new Date(Date.now()+h*36e5).toLocaleTimeString('en-GB',{timeZone:'America/Chicago',hour:'2-digit',minute:'2-digit'});
  W.__chi=chi; W.__log={ writes:[], fn:[], fetch:[], toasts:[] };
  const K='krystal@mo-care.com', S='samantha@mo-care.com';
  W.__store={
    coverage_cases:[
      { id:'cy', status:'open', client:'Ruth A. (fake)', shift_date:chi(0), shift_time:hm(2)+'-'+hm(6), calling_off:'Maria L.', asked:[{name:'Joyce Kim',state:'yes'},{name:'Pat Long',state:'no'}] },
      { id:'cn', status:'open', client:'Ted B. (fake)', shift_date:chi(0), shift_time:hm(0.5)+'-'+hm(3), asked:[] },
      { id:'cw', status:'open', client:'Ann C. (fake)', shift_date:chi(0), shift_time:hm(4)+'-'+hm(8), asked:[{name:'A',state:'waiting',at:H(-0.3)},{name:'B',state:'no',at:H(-0.4)}] },
      { id:'ct', status:'open', client:'Tom D. (fake)', shift_date:chi(1), shift_time:'09:00-13:00', axiscare_visit_id:'v77', asked:[] },
      { id:'old', status:'done', client:'Closed (fake)', shift_date:chi(0), shift_time:'08:00-09:00', asked:[] } ],
    timekeeper_cases:[ { id:'tk1', visit_id:'9', caregiver:'Joyce K. (fake)', client_first:'Linda', shift_date:chi(0), shift_time:'09:00', office_alerted_at:H(-0.5), texted_at:H(-0.6), minutes_late:12 },
                       { id:'tk2', visit_id:'8', caregiver:'Done (fake)', client_first:'X', shift_date:chi(0), shift_time:'08:00', office_alerted_at:H(-2), resolved_at:H(-1) } ],
    standup_notes:[ { id:'s1', summary:'Night call-out (fake)', status:'open', occurred_at:H(-20), created_at:H(-20), assigned_to_email:K, urgent:true } ],
    team_meetings:[] };
  const clone=x=>JSON.parse(JSON.stringify(x));
  (0,eval)(`sb={ from:()=>{ const st={key:null}; const p={ select(){return p;}, eq(c,v){ if(c==='key') st.key=v; return p; },
      maybeSingle:async()=>({ data: window.__store[st.key]?{data:JSON.parse(JSON.stringify(window.__store[st.key]))}:null, error:null }),
      then(a){ return Promise.resolve({data:[],error:null}).then(a); } }; return p; },
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async(n)=>{ window.__log.fn.push(n); return {data:null,error:null}; } },
    auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };
    OPS_PEOPLE=[{ person_id:'p_k', full_name:'Krystal Land', primary_email:'${K}' },{ person_id:'p_s', full_name:'Samantha Troutman', primary_email:'${S}' }];
    OPS_DOMAINS=[{ code:'scheduling_coverage', label:'Scheduling and coverage', owner_person:'p_k', escalation_person:'p_s' }];`);
  W.fetch=async(u,o)=>{ W.__log.fetch.push(String(u)+' '+(o&&o.body||'')); return new Response(JSON.stringify({ date:chi(1), rows:[
      { visit_id:'v77', time:'09:00', end:'13:00', client:'Tom D. (fake)', caregiver:null },
      { visit_id:'v78', time:'10:00', end:'12:00', client:'Sue E. (fake)', caregiver:null },
      { visit_id:'v79', time:'10:00', end:'12:00', client:'Covered (fake)', caregiver:'Pat Long' } ] }), { status:200 }); };
  W.persist=async(k,v)=>{ W.__log.writes.push(k+':'+v.id); const a=W.__store[k]=W.__store[k]||[]; const i=a.findIndex(x=>x.id===v.id); if(i>=0) a[i]=clone(v); else a.push(clone(v)); };
  W.ccOpsRefresh=()=>{}; W.ccRecentFetch=async()=>{}; W.ccToast=m=>W.__log.toasts.push(m);
  W.roleEveryone=()=>[{ email:K, name:'Krystal Land' },{ email:S, name:'Samantha Troutman' }];
  try{ localStorage.removeItem('cc_staffing_view'); }catch(e){}
  DATA.ops_settings={ coverage_alert_admins:[S,K] }; DATA.positions=[];
  DATA.duty_windows=[{ id:'dw', area:'staffing', person:K, status:'live', active:true, recur:{ days:[0,1,2,3,4,5,6], from:'00:00', to:'23:59' } }];
  DATA.coverage_cases=clone(W.__store.coverage_cases);
  DATA.ops_items=[
    { id:'u1', kind:'staffing_issue', status:'open', about:'Urgent fake', urgency:'urgent', owner:S, due:H(1), created_at:H(-1) },
    { id:'ci', kind:'client_issue', status:'open', about:'Family worried (fake)', owner:K, due:H(5), created_at:H(-3) },
    { id:'pr', kind:'promise_update', status:'open', about:'Call Betsy back (fake)', owner:K, due:H(-1), created_at:H(-30) },
    { id:'pl', kind:'promise_update', status:'open', about:'Next week promise (fake)', owner:K, due:H(100), created_at:H(-3) },
    { id:'ef', kind:'evv_fix', status:'open', about:'EVV fix (fake)', owner:K, due:H(3), created_at:H(-1) } ];
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, S=window.__store;
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  /* ── the Staffing view, for the person on Staffing duty ── */
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Land', shift:'day' };");
  switchTab('today'); await sleep(700);
  const box=document.getElementById('staffingView'), t=()=>box.innerText;
  ok('on Staffing duty: the view is open, says so', /Staffing view/.test(t()) && /You’re on Staffing duty now\./.test(t()), t().slice(0,200));
  ok('it sits under the Stand-Up card, above the day\'s numbers', !!(document.getElementById('suTodayLine').compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING) && !!(box.compareDocumentPosition(document.getElementById('todayGlance')) & Node.DOCUMENT_POSITION_FOLLOWING));
  ok('ACCEPTED, NEEDS CONFIRMING: Joyce said yes for Ruth', /ACCEPTED, NEEDS CONFIRMING · 1/.test(t()) && /Ruth A\. \(fake\)[\s\S]*Joyce said yes/.test(t()));
  const todayPart=t().split('OPEN SHIFTS AND CALL-OFFS TODAY')[1].split('LATE OR MISSING')[0];
  ok('OPEN SHIFTS TODAY: soonest first, who called off, who was asked', /· 3/.test(todayPart.slice(0,6)) && todayPart.indexOf('Ted B.')<todayPart.indexOf('Ruth A.') && todayPart.indexOf('Ruth A.')<todayPart.indexOf('Ann C.')
     && /Maria L\. called off/.test(todayPart) && /nobody asked yet/.test(todayPart) && /2 asked · 1 said no · 1 waiting · last ask \d+m ago/.test(todayPart) && !/Closed \(fake\)/.test(todayPart), todayPart);
  ok('...with how soon it starts (red inside the hour)', /starts in 30m/.test(todayPart) || /starts in 2\dm|starts in 3\dm/.test(todayPart), todayPart);
  ok('LATE OR MISSING CLOCK-INS: the open one only', /LATE OR MISSING CLOCK-INS · 1/.test(t()) && /Joyce K\. \(fake\) · Linda’s 9am shift/.test(t()) && /12 min late · caregiver texted/.test(t()) && !/Done \(fake\)/.test(t()));
  const tomPart=t().split('TOMORROW')[1];
  ok('TOMORROW: the open case, plus AxisCare\'s unassigned shift with no case (not the covered one, not the one with a case twice)', /· 2/.test(tomPart.slice(0,6)) && /Tom D\. \(fake\)/.test(tomPart) && /Sue E\. \(fake\)[\s\S]*no coverage case yet/.test(tomPart) && !/Covered \(fake\)/.test(tomPart) && (tomPart.match(/Tom D\./g)||[]).length===1, tomPart);
  ok('tomorrow came from the same read Live Schedule uses (live_schedule, tomorrow\'s date)', L.fetch.some(f=>/coverage-shifts/.test(f) && f.includes('"live_schedule":true') && f.includes(window.__chi(1))), L.fetch);
  /* ── someone not on Staffing duty: folded, one tap opens it, remembered ── */
  (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha Troutman', shift:'day' };"); SVX.SV.open=null; svRender(); await sleep(50);
  ok('not on duty: folded, saying who is', /Krystal is on Staffing duty now\./.test(t()) && /Show/.test(t()) && !/ACCEPTED/.test(t()));
  svToggle(true); await sleep(200);
  ok('...Show opens it, and it is remembered in this browser', /ACCEPTED, NEEDS CONFIRMING/.test(t()) && localStorage.getItem('cc_staffing_view')==='1');
  svToggle(false); await sleep(50);
  /* ── Prepare Stand-Up ── */
  const list=prepList();
  const secs=[...new Set(list.map(r=>r.sec))];
  ok('the list, in her order: urgent, coverage today+tomorrow, client issues, staffing issues, promises due, carried over', JSON.stringify(secs)===JSON.stringify(['Urgent and high-risk, not resolved','Coverage today and tomorrow','Client issues','Staffing issues','Promises due','From the old Stand-Up board']), secs);
  ok('each item once (the urgent staffing item is not repeated under staffing issues)', list.filter(r=>r.id==='u1').length===1 && list.some(r=>r.id==='ef' && r.sec==='Staffing issues'));
  ok('coverage: today\'s and tomorrow\'s open cases only', list.filter(r=>r.kind==='case').map(r=>r.id).sort().join()==='cn,ct,cw,cy');
  ok('promises: only those due by today', list.some(r=>r.id==='pr') && !list.some(r=>r.id==='pl'));
  ok('carried over: the open Stand-Up item', list.some(r=>r.kind==='su' && r.id==='s1'));
  await tmPrepare(); await sleep(200);
  const pp=[...document.querySelectorAll('.ccpop')].pop(), row=id=>[...pp.querySelectorAll('.prepRow')].find(n=>list[Number(n.dataset.n)].id===id);
  ok('Prepare Stand-Up opens with every item and the decision boxes', pp.querySelectorAll('.prepRow').length===list.length && !!pp.querySelector('.prepOwner') && /Who was there/.test(pp.innerText));
  row('ci').querySelector('.prepOwner').value='samantha@mo-care.com'; row('ci').querySelector('.prepNote').value='Samantha calls the daughter';
  row('s1').querySelector('.prepDue').value=window.__chi(1); row('s1').querySelector('.prepNote').value='Krystal follows up';
  row('cy').querySelector('.prepNote').value='Confirm Joyce';
  row('pr').querySelector('.prepDone').checked=true;
  pp.querySelectorAll('.prepAtt').forEach(x=>x.checked=true);
  L.writes.length=0; pp.querySelector('#prepLog').click(); await sleep(400);
  const ci=DATA.ops_items.find(x=>x.id==='ci');
  ok('a decided owner moves the item, with "Stand-up" in its ownership history', ci.owner==='samantha@mo-care.com' && ci.owner_history.slice(-1)[0].note==='Stand-up: Samantha calls the daughter', ci.owner_history);
  const s1=S.standup_notes.find(x=>x.id==='s1');
  ok('a Stand-Up item gets its by-when and the decision as an update', s1.due===window.__chi(1) && s1.updates.some(u=>u.text==='Stand-up: Krystal follows up'));
  ok('a coverage case gets the decision in its notes', /Stand-up \(Samantha Troutman\): Confirm Joyce/.test(S.coverage_cases.find(x=>x.id==='cy').note||''));
  const m=S.team_meetings.slice(-1)[0];
  ok('the stand-up is logged under Team Meetings as Daily Stand-Up, with who was there and the decisions', m && m.meeting_name==='Daily Stand-Up' && m.attendee_emails.length===2 && /Decisions:/.test(m.notes) && /Family worried \(fake\): owner Samantha Troutman, Samantha calls the daughter/.test(m.notes) && /Call Betsy back \(fake\): discussed/.test(m.notes) && m.reviewed.length===4, m);
  ok('items nobody touched were not changed', !L.writes.includes('ops_items:u1') && !L.writes.includes('ops_items:ef'), L.writes);
  ok('nothing was texted, emailed or called', L.fn.length===0);
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1360, 'height': 900})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=today4'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

"""Today cockpit, Phase 3 (right person first, then escalate): what the Hub shows for routed and escalated work, and
the Settings card. The real page, offline, made-up people only; nothing is saved or sent.
(python3 tests/browser/today_phase3_look.py, with the static server on 8765)"""
from playwright.sync_api import sync_playwright
STUB = r"""
(()=>{
  const W=window, H=h=>new Date(Date.now()+h*36e5).toISOString();
  W.__log={ writes:[], fn:[], toasts:[], merges:[] };
  const K='krystal@mo-care.com', S='samantha@mo-care.com';
  (0,eval)(`sb={ from:()=>({ select(){return this;}, eq(){return this;}, maybeSingle:async()=>({data:null,error:null}), then(a){ return Promise.resolve({data:[],error:null}).then(a); } }),
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async(n)=>{ window.__log.fn.push(n); return {data:null,error:null}; } }, auth:{ getSession:async()=>({data:{session:null}}) } };
    ME={ email:'${S}', name:'Samantha Troutman', shift:'day' };
    OPS_PEOPLE=[{ person_id:'p_k', full_name:'Krystal Land', primary_email:'${K}' },{ person_id:'p_s', full_name:'Samantha Troutman', primary_email:'${S}' }];
    OPS_DOMAINS=[{ code:'scheduling_coverage', label:'Scheduling and coverage', owner_person:'p_k', escalation_person:'p_s' }];`);
  W.persist=async(k,v)=>{ W.__log.writes.push(k+':'+v.id); };
  W.ccOpsRefresh=()=>{}; W.ccRecentFetch=async()=>{}; W.ccToast=m=>W.__log.toasts.push(m); W.confirm=()=>true;
  W.tkMerge=async(fn,what)=>{ const m=JSON.parse(JSON.stringify(DATA.ops_settings||{})); fn(m); DATA.ops_settings=m; W.__log.merges.push(what); return {data:m,error:null}; };
  W.roleEveryone=()=>[{ email:K, name:'Krystal Land' },{ email:S, name:'Samantha Troutman' }];
  DATA.ops_settings={ coverage_alert_admins:[S,K] };
  DATA.duty_windows=[{ id:'dw1', area:'staffing', person:K, recur:{ days:[0,1,2,3,4,5,6], from:'00:00', to:'23:59' }, active:true }];
  DATA.positions=[]; DATA.coverage_cases=[]; DATA.leads=DATA.leads||[];
  DATA.ops_items=[
    { id:'u1', kind:'staffing_issue', status:'open', domain:'scheduling_coverage', about:'Joyce (fake) no clock-in', owner:K, owner_name:'Krystal Land', urgency:'urgent', due:H(1), created_at:H(-0.5), opened_by:'timekeeper',
      escalation:{ to:S, to_name:'Samantha Troutman', seat:'owner_escalation', level:'urgent', why:"Krystal hasn't taken it in 15 minutes", at:H(-0.1) } },
    { id:'o1', kind:'request', status:'open', about:'Pat (fake) paperwork', owner:K, owner_name:'Krystal Land', due:H(-30), created_at:H(-60),
      escalation:{ to:S, to_name:'Samantha Troutman', seat:'owner_escalation', level:'overdue', why:"it's overdue (it was due Oct 4, 9:00 AM)", at:H(-0.2) } },
    { id:'c1', kind:'request', status:'open', about:'Cleared (fake)', owner:K, due:H(-30), created_at:H(-60), escalation:{ to:S, level:'overdue', why:'x', at:H(-1), cleared_at:H(-0.5) } },
    { id:'r1', kind:'coverage', status:'open', domain:'scheduling_coverage', about:'Ruth (fake) uncovered shift', owner:S, owner_name:'Samantha Troutman', due:H(2), created_at:H(-0.1), created_by:'coverage-run',
      routed:{ seat:'staffing', person:S, source:'default', at:H(-0.05) }, owner_history:[{ at:H(-0.05), by:'cara', by_name:'Cara', from:'', to:S, to_name:'Samantha Troutman', how:'routed' }] } ];
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const card=id=>document.querySelector('.wkcard[data-id="'+id+'"]'), item=id=>DATA.ops_items.find(x=>x.id===id);
  document.getElementById('appScreen').classList.add('on');
  switchTab('mywork'); myWorkGo('today'); await sleep(150);
  const wrap=document.getElementById('myWorkWrap');
  ok('an URGENT escalation to me is in Act Now', !!card('u1') && wrap.innerText.indexOf('ACT NOW')<wrap.innerText.indexOf('Joyce (fake)') && wrap.innerText.indexOf('Joyce (fake)')<wrap.innerText.indexOf('DUE TODAY'));
  ok('...saying why and whose it stays', /Escalated to you \(Owner Escalation\): Krystal hasn't taken it in 15 minutes\. It stays Krystal’s unless you take it\./.test(card('u1').innerText), card('u1').innerText.slice(0,300));
  ok('an OVERDUE escalation is NOT in my Today (my Today stays quiet)', !card('o1'));
  ok('routed work says why it came to me', /You’re on Staffing duty now, so it came to you first\./.test(card('r1').innerText), card('r1').innerText.slice(0,300));
  const tabs=document.getElementById('myWorkTabs').innerText;
  ok('an "Escalated to you" tab with its count', /Escalated to you\s*2/.test(tabs), tabs);
  myWorkGo('escalated'); await sleep(80);
  ok('...listing the urgent and the overdue one, not the cleared one', !!card('u1') && !!card('o1') && !card('c1'));
  [...card('o1').querySelectorAll('button')].find(b=>b.textContent==='Take it').click(); await sleep(100);
  ok('Take it: mine now, and the escalation is cleared', item('o1').owner==='samantha@mo-care.com' && !!item('o1').escalation.cleared_at && item('o1').escalation.cleared_why==='taken');
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Land', shift:'day' };"); myWorkGo('today'); await sleep(100);
  ok('the owner sees that Samantha was pulled in', /Samantha pulled in/.test((card('u1')||{}).innerText||''), (card('u1')||{}).innerText);
  (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha Troutman', shift:'day' };");
  /* Settings card */
  switchTab('settings'); routeSetRender(); await sleep(50);
  const box=document.getElementById('routeSet');
  ok('Settings: who holds each seat now, and from where', /Staffing now: Krystal Land \(the schedule\)/.test(box.innerText) && /Owner Escalation now: Samantha Troutman \(first on the alert list\)/.test(box.innerText), box.innerText);
  await routeSetDefault('owner_escalation','krystal@mo-care.com');
  ok('choosing "when nobody is scheduled" saves through the safe merge and shows', DATA.ops_settings.duty_default_owner_escalation==='krystal@mo-care.com' && /Owner Escalation now: Krystal Land \(when nobody is scheduled\)/.test(box.innerText), box.innerText);
  await routeToggle(document.getElementById('routeSetBtn'));
  ok('the switch turns on and stamps when', DATA.ops_settings.routing_live===true && !!DATA.ops_settings.routing_since && /On\./.test(box.innerText));
  ok('nothing was texted or called', window.__log.fn.length===0);
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1360, 'height': 900})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=today3'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

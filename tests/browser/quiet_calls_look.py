"""Quieter call reader (2026-10-29, plan M2yJiaLMGCekNzZrL6WdT6, her approval with all three recommendations). The real Hub
page, offline (files served from this folder, no server needed), made-up people and cards only; saves are recorded, never
sent; nobody is texted, emailed or called. Team Work and the My Work tiers are on, as they are live. Checks: switch off,
nothing moves and owners see a preview; switch on, only promises and care at risk stay in Team Work, the rest are one
"From calls" line in the owner's Hub reminders and the AI call reader's Open from calls list, with Done and Reopen.
(python3 tests/browser/quiet_calls_look.py; SHOTS=<dir> also saves screenshots)"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = os.environ.get('SHOTS')
STUB = r"""
(()=>{
  const W=window, at=(hm,d)=>new Date('2026-10-'+(d||'07')+'T'+hm+':00-05:00').toISOString();
  W.__log={ writes:[], fn:[], toasts:[], events:[], alerts:[] };
  const K='krystal@mo-care.com', S='samantha@mo-care.com', A='angiel@mo-care.com';
  (0,eval)(`sb={ from:()=>{ const p={ select(){return p;}, eq(){return p;}, gte(){return p;}, in(){return p;}, order(){return p;}, limit(){return p;},
      single:async()=>({ data:null, error:null }), maybeSingle:async()=>({ data:null, error:null }),
      then(a){ return Promise.resolve({data:[],error:null}).then(a); } }; return p; },
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async(n)=>{ window.__log.fn.push(n); return {data:null,error:null}; } },
    auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };
    CC_ROLE_BY_EMAIL={ '${S}':['owner_admin'], '${K}':['care_coordinator'], '${A}':['care_coordinator'] };
    OPS_PEOPLE=[{ person_id:'p_k', full_name:'Krystal Land', primary_email:'${K}' },{ person_id:'p_s', full_name:'Samantha Troutman', primary_email:'${S}' },{ person_id:'p_a', full_name:'Angiel Test', primary_email:'${A}' }];`);
  W.persist=async(k,v)=>{ W.__log.writes.push(k+':'+v.id); };
  W.opEvent=(v,o)=>W.__log.events.push(v+':'+(o&&o.summary||''));
  W.ccOpsRefresh=()=>{}; W.ccRecentFetch=async()=>{}; W.ccToast=m=>W.__log.toasts.push(m); W.alert=m=>W.__log.alerts.push(m);
  W.tkMerge=async(fn)=>{ const m=JSON.parse(JSON.stringify(DATA.ops_settings||{})); fn(m); DATA.ops_settings=m; W.__log.writes.push('ops_settings'); return {}; };
  W.ccConfirm=async()=>true;
  W.TA.coordinators=()=>[K,A];
  /* each family's coordinator: AxisCare client 101 is Krystal's, 202 is Angiel's (read only; the test checks nothing writes it) */
  W.__journeys=[{ axiscare_client_id:'101', assigned_cc:K },{ axiscare_client_id:'202', assigned_cc:A }];
  W.cjJourneyFor=o=>W.__journeys.find(j=>String(j.axiscare_client_id)===String((o&&(o.ax||(o.lead&&o.lead.axiscare_client_id)))||''))||null;
  DATA.handoffs=[]; DATA.leads=[]; DATA.coverage_cases=[];
  DATA.coordinator_staff=[{ id:'sk', name:'Krystal Land', email:K }, { id:'sa', name:'Angiel Test', email:A }, { id:'ss', name:'Samantha Troutman', email:S }];
  DATA.duty_windows=[
    { id:'dk', area:'operations', person:K, recur:{ days:[1,2,3,4,5], from:'08:00', to:'14:00' } },
    { id:'da', area:'staffing',   person:A, recur:{ days:[1,2,3,4,5], from:'13:00', to:'17:00' } },
    /* Angiel also works as a caregiver mornings: not office duty */
    { id:'dc', area:'direct_care', person:A, recur:{ days:[1,2,3,4,5], from:'08:00', to:'12:00' } } ];
  DATA.ops_settings={ team_work_live:true, my_work_tiers_live:true, call_tasks_live:true };
  const cf=(id,o)=>Object.assign({ id, kind:'call_followup', opened_by:'call-tasks', created_by:'call-tasks', status:'open', owner:K, owner_name:'Krystal Land', urgency:'normal', domain:'scheduling_coverage',
    due:at('17:00'), created_at:at('09:00'), source:{ type:'call_reading', message_id:'m_'+id } }, o);
  DATA.ops_items=[
    cf('cf_sched_0', { title:'Put Mary on April visits (fake)', about:'April Fake', due:at('17:00','05'), source:{ message_id:'m1', day:'2026-10-05' } }),
    cf('cf_file_0', { title:'Update Kyra file (fake)', about:'Kyra Fake', domain:'program_administration' }),
    cf('cfp_prom_0', { title:'Promise not kept yet: call the fake family back', about:'Fake Family', urgency:'today' }),
    cf('cf_fall_0', { title:'Record fake head bump', about:'Dan Fake', domain:'incidents', urgency:'today' }),
    cf('cf_cond_0', { title:'Check on new confusion (fake)', about:'Carol Fake', domain:'client_care', urgency:'today' }),
    cf('cf_ang_0', { title:'Angiel fake follow-up', about:'Someone Fake', owner:A, owner_name:'Angiel Test' }),
    cf('cf_gone_0', { title:'Confirm Monday visit (fake)', about:'Karen Fake', status:'done', resolution_code:'day_passed', closed_by:'call-tasks', closed_at:at('10:00'),
      close_reason:'Closed: the day has passed.', source:{ message_id:'m9', day:'2026-10-01' } }),
    { id:'calloff', kind:'coverage', opened_by:'callout', status:'open', title:'Call-off: tonight (fake)', owner:K, owner_name:'Krystal Land', created_at:at('14:00') } ];
  W.__n0=DATA.ops_items.length;
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, it=id=>DATA.ops_items.find(x=>x.id===id), mw=()=>document.getElementById('tab-mywork').innerText, cfu=()=>document.getElementById('cfuWrap').innerText;
  const as=(e,n)=>(0,eval)("ME={ email:'"+e+"', name:'"+n+"', shift:'day' };");
  const team=()=>TW.list().map(x=>x.it.id);
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';

  /* ── OFF: nothing moves ── */
  as('krystal@mo-care.com','Krystal Land'); switchTab('mywork'); myWorkGo('today'); await sleep(200);
  ok('off: every open call card is in Team Work, as today', ['cf_sched_0','cf_file_0','cfp_prom_0','cf_fall_0','cf_cond_0','cf_ang_0'].every(i=>team().includes(i)), team());
  ok('off: no From calls line in Krystal\'s My Work', !/From calls:/.test(mw()), mw().slice(0,600));
  switchTab('callfollowups'); await sleep(250);
  ok('off: Krystal sees no Open from calls on the AI call reader', !/Open from calls/.test(cfu()), cfu().slice(0,500));
  as('samantha@mo-care.com','Samantha Troutman'); CPR.setFilter('open'); await sleep(150);
  ok('off: Samantha (owner) sees a preview of what would leave Team Work', /Preview, switched off/.test(cfu()) && /WOULD LEAVE TEAM WORK \(3\)/.test(cfu()) && /Put Mary on April visits/.test(cfu()) && !/Record fake head bump/.test(cfu()), cfu().slice(0,900));
  ok('off: the preview shows no day-passed list', !/CLOSED BECAUSE THE DAY PASSED/.test(cfu()));
  if(window.__shot) await window.__shot('preview-owner');

  /* ── ON ── */
  DATA.ops_settings.quiet_calls_live=true; CPR.setFilter('all');
  ok('on: Team Work keeps the promise, the fall, the condition change and the call-off', ['cfp_prom_0','cf_fall_0','cf_cond_0','calloff'].every(i=>team().includes(i)), team());
  ok('on: the ordinary call cards leave Team Work', ['cf_sched_0','cf_file_0','cf_ang_0'].every(i=>!team().includes(i)), team());
  ok('on: nobody\'s card changed owner or status', it('cf_sched_0').owner==='krystal@mo-care.com' && it('cf_sched_0').status==='open' && L.writes.length===0, L.writes);
  as('krystal@mo-care.com','Krystal Land'); switchTab('mywork'); myWorkGo('today'); await sleep(200);
  ok('on: Krystal\'s Hub reminders have ONE From calls line with her 2 follow-ups (1 past its time)', /From calls: 2 follow-ups the call reader gave you/.test(mw()) && /1 past its time/.test(mw()) && document.querySelectorAll('.mwt-calls').length===1, mw().slice(0,1200));
  ok('on: the cards themselves are not listed one by one in My Work', !/Put Mary on April visits/.test(mw()) && !/Update Kyra file/.test(mw()));
  const b=myWorkBuckets(), red=b.today.filter(i=>!opsTeamSummary(i) && !(MWT.on()&&MWT.tierOf(i)==='rem')).map(i=>i.id);
  ok('on: they are never in the red number', !red.includes('cf_sched_0') && !red.includes('cf_file_0'), red);
  if(window.__shot) await window.__shot('mywork-krystal');
  document.querySelector('.mwt-calls button').click(); await sleep(300);
  ok('Open them: goes to the AI call reader, Open from calls, Krystal\'s own', activeTab==='callfollowups' && /OPEN FROM CALLS \(2\)/.test(cfu()) && document.getElementById('cprWho').value==='krystal@mo-care.com', [activeTab, cfu().slice(0,700)]);
  ok('...lists both, not Angiel\'s, not the promise or the fall', /Put Mary on April visits/.test(cfu()) && /Update Kyra file/.test(cfu()) && !/Angiel fake follow-up/.test(cfu()) && !/Promise not kept yet/.test(cfu()) && !/Record fake head bump/.test(cfu()));
  ok('...says the day each one is about', /about Mon, Oct 5/.test(cfu()), cfu().slice(0,900));
  CPR.setWho(''); await sleep(100);
  ok('Everyone: 3, Angiel\'s too', /OPEN FROM CALLS \(3\)/.test(cfu()) && /Angiel fake follow-up/.test(cfu()));
  ok('the day-passed list shows the card the Hub closed, with Reopen', /CLOSED BECAUSE THE DAY PASSED, LAST 7 DAYS \(1\)/.test(cfu()) && document.querySelector('.cpr-open[data-id="cf_gone_0"] button').textContent==='Reopen');
  if(window.__shot) await window.__shot('open-from-calls');
  await CPR.done('cf_file_0'); await sleep(100);
  ok('Done closes it with Krystal\'s name', it('cf_file_0').status==='done' && it('cf_file_0').closed_by==='krystal@mo-care.com' && L.writes.includes('ops_items:cf_file_0'), it('cf_file_0'));
  await CPR.reopen('cf_gone_0'); await sleep(100);
  const g=it('cf_gone_0');
  ok('Reopen: open again, never closed that way again, history says so', g.status==='open' && g.keep_open===true && !g.resolution_code && !g.closed_at && /Reopened: it still needs doing/.test(g.history.at(-1).text) && L.writes.includes('ops_items:cf_gone_0'), g);
  ok('...and it is back in the list (not Team Work)', /Confirm Monday visit/.test(cfu()) && !team().includes('cf_gone_0'));

  ok('no cards created or removed', DATA.ops_items.length===window.__n0, DATA.ops_items.length);
  ok('nothing was texted, emailed or called', L.fn.length===0, L.fn);
  return R;
}
"""
MIME = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.json':'application/json', '.webmanifest':'application/json'}
def serve(route):
    url = route.request.url
    if 'supabase.co' in url: return route.abort()
    if not url.startswith('http://quietcalls.local/'): return route.continue_()
    p = (ROOT / url.split('http://quietcalls.local/', 1)[1].split('?')[0].split('#')[0])
    if not p.is_file(): return route.fulfill(status=404, body='')
    route.fulfill(status=200, body=p.read_bytes(), content_type=MIME.get(p.suffix, 'application/octet-stream'))
with sync_playwright() as pw:
    b = pw.chromium.launch(); cx = b.new_context(viewport={'width': 1280, 'height': 900}, timezone_id='America/Chicago'); pg = cx.new_page()
    pg.clock.install(time='2026-10-07T14:40:00-05:00'); pg.clock.resume()
    pg.route('**/*', serve)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True)
        pg.expose_function('__shot', lambda name: pg.screenshot(path=os.path.join(SHOTS, name + '.png'), full_page=False) and None)
    pg.goto('http://quietcalls.local/index.html?proof=quietcalls'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

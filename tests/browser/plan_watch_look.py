"""The plan's end and care plan changes (Medicaid slice C, 2026-10-08), in the real Hub page offline, clock Oct 18 2026: a plan
ending within 60 days (the reassessment) on the Payer tab and on Nurse Scheduling's list; an ended plan; recommending a change,
the supervisor's approval, the PCCP Request Form submitted, DSDS's decision; the Hub never changes an authorization.
(python3 tests/browser/plan_watch_look.py [port])"""
import os, sys
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from clock_pin import pin
src = open(os.path.join(HERE, 'client_journey_look.py')).read()
ns = {'__file__': os.path.join(HERE, 'client_journey_look.py')}; exec(src[:src.rindex('with sync_playwright() as pw:')], ns)
STUB, DATA = ns['STUB'], ns['DATA']
PORT = sys.argv[1] if len(sys.argv) > 1 else '8765'
FAKE = r"""
(()=>{
  const W=window; W.__P=[];
  (0,eval)("persist=async(k,i)=>{ window.__P.push([k,JSON.parse(JSON.stringify(i))]); }");
  (0,eval)("ccToast=(m)=>{ window.__toast=m; }"); (0,eval)("lpfRenderPayerFacts=()=>{}");
  (0,eval)("CC_PICK_OPTS=[{name:'Pat Soon',ax:'901',pid:'p1',past:false},{name:'Lou Long',ax:'902',pid:'p2',past:false}]"); (0,eval)("ccPickOptions=async()=>CC_PICK_OPTS");
  const svc=[{ type:'PC - Agency', kind:'pc', label:'Agency personal care', program:'ihs', start:'2026-06-01', end:'2026-12-05', ours:true, prior_auth:'20260000000001', units:[], tasks:[] }];
  DATA.medicaid_plans=[
    { id:'mcp_901', kind:'plan', axiscare_client_id:'901', lead_id:'L1', client_name:'Pat Soon', dcn:'12345678', plan_start:'2026-06-01', plan_end:'2026-12-05', generated:'2026-05-28', received_on:'2026-05-29', services:svc, ghe_months:[], confirmed_by:'angiel@mo-care.com' },
    { id:'mcp_902', kind:'plan', axiscare_client_id:'902', lead_id:'', client_name:'Lou Long', dcn:'22222222', plan_start:'2026-06-01', plan_end:'2027-05-31', generated:'2026-05-28', received_on:'2026-05-29', services:svc.map(x=>Object.assign({},x,{end:'2027-05-31'})), ghe_months:[], confirmed_by:'angiel@mo-care.com' },
    { id:'mcp_903', kind:'plan', axiscare_client_id:'903', lead_id:'', client_name:'Ed Ended', dcn:'33333333', plan_start:'2026-03-01', plan_end:'2026-09-30', generated:'2026-02-28', received_on:'2026-02-28', services:svc, ghe_months:[], confirmed_by:'angiel@mo-care.com' }];
  W.__lead={ id:'L1', client_first_name:'Pat', client_last_name:'Soon', funding_source:'medicaid', dcn:'12345678', state_status:'authorized', axiscare_client_id:'901', first_shift_at:'2026-06-03T14:00:00Z' };
  DATA.leads=[W.__lead]; DATA.nurse_clients=[]; DATA.ghe_forms=[]; DATA.nurse_staff=[];
  W.__open=(lead,ax,name)=>{ CP.lead=lead; CP.ax=ax; CP.r={ client_name:name }; cpRenderPayer(); };
})();
"""
T = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  window.__as('angiel@mo-care.com','Angiel');
  __open(__lead,'901','Pat Soon'); await sleep(150);
  const box=()=>document.getElementById('cpPlanBox').innerText;
  ok('A plan ending in 48 days: "The plan ends 12/05/2026 · 48 days left", DSDS reassesses, watch Fusion for the new plan', /The plan ends 12\/05\/2026\s*48 days left/.test(box()) && /DSDS reassesses before then/.test(box()) && /My Agency's Participants/.test(box()), box());
  __open(null,'903','Ed Ended'); await sleep(100);
  ok('A plan that ended Sep 30 with nothing newer: "no newer plan uploaded"', /The plan ended 09\/30\/2026\s*no newer plan uploaded/.test(box()), box());
  __open(__lead,'901','Pat Soon'); await sleep(100);
  ok('Care plan changes: "Only DSDS changes the units ... The Hub never changes an authorization", and a Recommend button', /Only DSDS changes the units/.test(box()) && /The Hub never changes an authorization/.test(box()) && /Recommend a change/.test(box()));
  mcpChangeForm(true); await sleep(60); await mcpChangeNew(); await sleep(60);
  ok('...a recommendation needs what changed', /Pick what changed/.test(document.getElementById('mcpCMsg').textContent) && window.__P.length===0);
  document.getElementById('mcpCK').value='more'; document.getElementById('mcpCW').value='Now needs help bathing every day, not 4 days a week.'; await mcpChangeNew(); await sleep(120);
  const p=()=>DATA.medicaid_plans.find(x=>x.id==='mcp_901'), c=()=>p().changes[0];
  ok('...saved: "Needs more help than authorized · waiting for the supervisor", seen by Angiel', c() && c().status==='recommended' && c().seen_by==='angiel@mo-care.com' && /Needs more help than authorized · waiting for the supervisor/.test(box()), box());
  const id=c().id;
  document.getElementById('mcpCS_'+id)||null;
  ok('...it can\'t be submitted before the supervisor approves (no submit step shown yet)', !document.getElementById('mcpCS_'+id) && document.getElementById('mcpCA_'+id));
  await mcpChange(id,'approve'); await sleep(60);
  ok('...approval needs the supervisor\'s name', /Name the supervisor/.test(document.getElementById('mcpCMsg_'+id).textContent));
  document.getElementById('mcpCA_'+id).value='Rita Reed'; await mcpChange(id,'approve'); await sleep(120);
  ok('...approved: "approved by Rita Reed ...: submit the PCCP Request Form"', c().status==='approved' && /approved by Rita Reed 10\/18\/2026: submit the PCCP Request Form/.test(box()) && /Submit the online PCCP Request Form to DSDS/.test(box()), box());
  await mcpChange(id,'submit'); await sleep(120);
  ok('...submitted: "waiting on DSDS"', c().status==='submitted' && c().submitted_on==='2026-10-18' && /submitted 10\/18\/2026: waiting on DSDS/.test(box()));
  document.getElementById('mcpCO_'+id).value='approved_new_plan'; await mcpChange(id,'close'); await sleep(120);
  ok('...DSDS\'s decision closes it into "earlier change requests"; the plan itself is untouched (no units changed)', c().status==='closed' && c().outcome==='approved_new_plan' && /1 earlier change request/.test(box()) && p().plan_end==='2026-12-05' && p().services.length===1);
  /* Nurse Scheduling */
  switchTab('nursevisits'); await sleep(300);
  const card=document.getElementById('mcpCard').innerText;
  ok('Nurse Scheduling\'s short list includes the plan ending soon ("48 days left"; watch Fusion for the new plan) and leaves out the long one', /Pat Soon\s*Plan to 12\/05\/2026 \(48 days left\)/.test(card) && /watch Fusion for the new plan/.test(card) && !/Lou Long/.test(card), card.slice(0,700));
  return R; }"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []
    pg = b.new_page(viewport={'width': 1280, 'height': 1100})
    pin(pg, '2026-10-18T10:00:00-05:00')
    pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    pg.goto(f'http://localhost:{PORT}/index.html?proof=planwatch'); pg.wait_for_timeout(1500)
    for s in (STUB, DATA, FAKE): pg.evaluate('s=>(0,eval)(s)', s)
    R = pg.evaluate(T)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

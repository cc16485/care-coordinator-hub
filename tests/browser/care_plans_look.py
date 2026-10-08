"""The state's Medicaid care plan, uploaded in the client's profile (GHE fix slice 1, her rule 2026-10-08: "in the intake,
in the client's profile"), in the real Hub page offline: the Payer tab's State care plan box; upload (the fixture: two
real Fusion plans with every name and number replaced); what was read; the received date required; a plan for someone
else caught (DCN stops it, a different name must be confirmed); confirm; the plan kept without address/phone/birth date;
an empty DCN filled; the GHE month on the nurse board; a client with no inquiry; a CDS plan stopped; and Nurse
Scheduling's list of who still needs a plan, each name opening the profile's Payer tab. (python3 tests/browser/care_plans_look.py [port])"""
import os, sys, json
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, 'client_journey_look.py')).read()
ns = {'__file__': os.path.join(HERE, 'client_journey_look.py')}; exec(src[:src.rindex('with sync_playwright() as pw:')], ns)
STUB, DATA = ns['STUB'], ns['DATA']
FX = json.load(open(os.path.join(HERE, '..', 'fixtures', 'care-plans.json')))
PORT = sys.argv[1] if len(sys.argv) > 1 else '8765'
FAKE = r"""
(()=>{
  const W=window; W.__P=[];
  (0,eval)("persist=async(k,i)=>{ window.__P.push([k,JSON.parse(JSON.stringify(i))]); }");
  (0,eval)("ccToast=(m)=>{ window.__toast=m; }");
  (0,eval)("lpfRenderPayerFacts=()=>{}");
  (0,eval)("CC_PICK_OPTS=[{name:'Pat Sample',ax:'901',pid:'p1',past:false},{name:'Lou Two',ax:'902',pid:'p2',past:false},{name:'Kim Medicaid',ax:'903',pid:'p3',past:false},{name:'Old Client',ax:'904',pid:'p4',past:true}]");
  (0,eval)("ccPickOptions=async()=>CC_PICK_OPTS");
  (0,eval)("CL360_IDENTITY=[{axiscare_client_id:'901',client_name:'Pat Sample',phone:'4175550101'}]");
  DATA.nurse_clients=[]; DATA.nurse_visits=[]; DATA.ghe_forms=[]; DATA.nurse_staff=[]; DATA.medicaid_plans=[];
  W.__lead={ id:'L1', is_test:true, client_first_name:'Pat', client_last_name:'Sample', funding_source:'medicaid', dcn:'', state_status:'submitted', state_submitted:'2026-09-20', axiscare_client_id:'901', soc:{ steps:[] } };
  DATA.leads=[W.__lead];
  W.__open=(lead,ax,name)=>{ (0,eval)('CP'); CP.lead=lead; CP.ax=ax; CP.r={ client_name:name }; cpRenderPayer(); };
})();
"""
T = r"""async(FX)=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  window.__as('krystal@mo-care.com','Krystal Land');
  __open(__lead,'901','Pat Sample'); await sleep(150);
  const box=()=>document.getElementById('cpPlanBox');
  ok('The profile\'s Payer tab has a "State care plan" box with an upload button, and says none is uploaded yet', box() && /State care plan/.test(box().innerText) && /Upload the care plan/.test(box().innerText) && /No care plan uploaded yet/.test(box().innerText) && document.getElementById('mcpFile').accept.includes('pdf'));
  let row=await mcpAddItems('plan-agency.pdf', FX.agency); await sleep(150);
  let tx=document.getElementById('mcpPend').innerText;
  ok('Uploaded: what was read (name, DCN, plan period, generated date), our services and their authorizations', /PAT SAMPLE/.test(tx) && /DCN 12345678/.test(tx) && /08\/10\/2026 to 01\/31\/2027/.test(tx) && /generated 10\/08\/2026/.test(tx) && /Agency personal care/.test(tx) && /GHE \(nurse visit\)/.test(tx) && /20260000000001/.test(tx), tx);
  ok('...the GHE month it authorizes, and the other provider noted, not taken', /GHE authorized: Nov 2026 \(T1001\)/.test(tx) && /Also served by EMEREST HEALTH CDS OF MISSOU/.test(tx));
  ok('...no client to pick: it is this profile\'s client, and the names match so no extra confirmation', !document.querySelector('#mcpPend [list]') && !document.getElementById('mcpNameOk'));
  ok('...Confirm stays off until the received date is entered, and says why; nothing saved', document.getElementById('mcpSave').disabled && /Enter the date we received this plan/.test(tx) && window.__P.length===0);
  mcpRecv('2099-01-01'); await sleep(80);
  ok('...a future received date is refused', document.getElementById('mcpSave').disabled && /can't be in the future/.test(document.getElementById('mcpPend').innerText));
  mcpRecv('2026-10-07'); await sleep(80);
  ok('...with the date, Confirm and save turns on', !document.getElementById('mcpSave').disabled);
  await mcpSave(); await sleep(250);
  const plans=window.__P.filter(x=>x[0]==='medicaid_plans').map(x=>x[1]), nc=window.__P.filter(x=>x[0]==='nurse_clients').map(x=>x[1]), leads=window.__P.filter(x=>x[0]==='leads').map(x=>x[1]);
  ok('Saved: the plan for this client (inquiry and AxisCare #901), received Oct 7, confirmed by Krystal', plans.length===1 && plans[0].lead_id==='L1' && plans[0].axiscare_client_id==='901' && plans[0].received_on==='2026-10-07' && plans[0].confirmed_by==='krystal@mo-care.com' && plans[0].ghe_months.join()==='2026-11', plans);
  ok('...never the address, phone or date of birth', !/ADDRESS|0000000000|1950|Phone|DOB/.test(JSON.stringify(plans[0])));
  ok('...the inquiry had no DCN: it is filled from the plan', leads.length===1 && leads[0].dcn==='12345678' && __lead.dcn==='12345678', leads);
  ok('...Pat Sample goes on the nurse board with the GHE in November 2026 and its authorization', nc.length===1 && nc[0].name==='Pat Sample' && nc[0].axiscare_client_id==='901' && nc[0].lead_id==='L1' && nc[0].ghe1==='2026-11' && nc[0].ghe_auth['2026-11'].code==='T1001' && nc[0].phone==='4175550101', nc);
  ok('...the toast says so', /Care plan saved for Pat Sample\. GHE Nov 2026 on the nurse board\. Added to the nurse board\./.test(window.__toast||''), window.__toast);
  const after=box().innerText;
  ok('...the box now shows the current plan, who confirmed it, and the services with their authorizations', /Current plan\s*08\/10\/2026 to 01\/31\/2027 · GHE Nov 2026/.test(after) && /Received 10\/07\/2026, confirmed by krystal@mo-care.com/.test(after) && /Agency personal care: 08\/10\/2026 to 01\/31\/2027 · PA 20260000000001/.test(after) && /Upload a newer plan/.test(after), after);
  ok('...and points out where the state is still says "submitted" (a person sets Authorized)', /Where the state is still says "submitted"/.test(after) && __lead.state_status==='submitted');
  /* the same plan again: no second record or board entry */
  window.__P.length=0; await mcpAddItems('plan-agency.pdf', FX.agency); mcpRecv('2026-10-07'); await sleep(50); await mcpSave(); await sleep(150);
  ok('The same plan again: replaces the record, no second nurse-board entry', DATA.medicaid_plans.filter(p=>p.kind==='plan').length===1 && DATA.nurse_clients.length===1);
  /* someone else's plan: a DCN that isn't this client's stops it */
  __lead.dcn='99999999'; __open(__lead,'901','Pat Sample'); await mcpAddItems('plan-agency.pdf', FX.agency); await sleep(100);
  tx=document.getElementById('mcpPend').innerText;
  ok('A plan whose DCN is not this client\'s is stopped: "Check you have the right PDF", no Confirm', /This plan is for DCN 12345678, but this client's DCN is 99999999/.test(tx) && !document.getElementById('mcpSave'), tx);
  mcpDiscard(); __lead.dcn='12345678';
  /* a different name must be confirmed */
  __open(__lead,'901','Patricia Jones'); await mcpAddItems('plan-agency.pdf', FX.agency); mcpRecv('2026-10-07'); await sleep(100);
  ok('A different name on the plan must be confirmed ("Yes, this is Patricia Jones\'s plan") before Confirm turns on', document.getElementById('mcpNameOk') && document.getElementById('mcpSave').disabled && /Confirm this is Patricia Jones's plan/.test(document.getElementById('mcpPend').innerText));
  mcpNameOk(true); await sleep(80);
  ok('...ticked: Confirm turns on', !document.getElementById('mcpSave').disabled);
  window.__P.length=0; await mcpSave(); await sleep(150);
  ok('...and the record keeps that the name was confirmed, and by whom', (window.__P.find(x=>x[0]==='medicaid_plans')||[])[1] && window.__P.find(x=>x[0]==='medicaid_plans')[1].name_confirmed.plan_name==='PAT SAMPLE');
  /* a client with no inquiry (an existing AxisCare client) */
  __open(null,'902','Lou Two'); await sleep(100);
  ok('A client with no inquiry: the Payer card says so, and the State care plan box is still there', /No inquiry is connected/.test(document.getElementById('cp_payer').innerText) && box() && /Upload the care plan/.test(box().innerText));
  await mcpAddItems('plan-cds.pdf', FX.cds); await sleep(100);
  ok('...a CDS plan is stopped: "belongs on the CDS side", no Confirm', /This is a CDS plan\. It belongs on the CDS side/.test(document.getElementById('mcpPend').innerText) && !document.getElementById('mcpSave'));
  mcpDiscard();
  await mcpAddItems('invoice.pdf', [{page:1,x:10,y:400,str:'Invoice 42'}]); await sleep(100);
  ok('Not a care plan: says so, nothing to confirm', /No service lines found/.test(document.getElementById('mcpPend').innerText) && !document.getElementById('mcpSave'));
  mcpDiscard();
  /* Nurse Scheduling: who still needs a plan, each name opens the profile on the Payer tab */
  switchTab('nursevisits'); await sleep(300);
  const card=document.getElementById('mcpCard');
  ok('Nurse Scheduling: no upload there; it says plans are uploaded in each client\'s profile', !card.querySelector('input[type=file]') && /uploaded in each client's profile, on the Payer tab/.test(card.innerText));
  ok('...the standing of the 3 active clients (Pat has a current plan; 2 not sorted; the past client left out)', /3 active clients:\s*1 with a current plan.*2 not sorted/.test(card.innerText) && !/Old Client/.test(card.innerText), card.innerText.slice(0,500));
  const a=card.querySelector('[data-open-client="902"]');
  ok('...each name opens their profile on the Payer tab', a && a.getAttribute('data-open-tab')==='payer');
  window.__P.length=0; await mcpMark('902','private'); await mcpMark('903','medicaid'); await sleep(150);
  ok('..."How do they pay": Lou private pay, Kim Medicaid with a plan to upload, each saved with who', window.__P.length===2 && window.__P[0][1].payer==='private' && window.__P[0][1].by==='krystal@mo-care.com' && window.__P[1][1].payer==='medicaid');
  ok('...the list now shows only Kim (open their profile and upload)', /Kim Medicaid\s*Medicaid, no plan uploaded\s*Open their profile and upload their plan/.test(card.innerText) && !/Lou Two/.test(card.innerText) && /0 not sorted/.test(card.innerText), card.innerText.slice(0,600));
  return R; }"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []
    pg = b.new_page(viewport={'width': 1280, 'height': 1000})
    pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    pg.goto(f'http://localhost:{PORT}/index.html?proof=careplans'); pg.wait_for_timeout(1500)
    for s in (STUB, DATA, FAKE): pg.evaluate('s=>(0,eval)(s)', s)
    R = pg.evaluate(T, FX)
    shot = """async(FX)=>{ __lead.dcn=''; DATA.medicaid_plans=[]; __open(__lead,'901','Pat Sample'); const host=document.getElementById('cp_payer');
      document.body.appendChild(host); host.style.cssText='position:fixed;inset:0;overflow:auto;background:#fff;z-index:99999;padding:16px;';
      await mcpAddItems('plan-agency.pdf', FX.agency); await new Promise(r=>setTimeout(r,200)); document.getElementById('cpPlanBox').scrollIntoView();
      return { sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth, hw:host.scrollWidth, hc:host.clientWidth }; }"""
    pg.evaluate(shot, FX); pg.wait_for_timeout(200); pg.screenshot(path='/tmp/care_plans_profile.png')
    ph = b.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True)
    ph.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    ph.goto(f'http://localhost:{PORT}/index.html?proof=careplans'); ph.wait_for_timeout(1500)
    for s in (STUB, DATA, FAKE): ph.evaluate('s=>(0,eval)(s)', s)
    ph.evaluate("()=>{ document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; window.__as('krystal@mo-care.com','Krystal Land'); }")
    w = ph.evaluate(shot, FX)
    R.append(['PASS' if w['hw'] <= w['hc'] + 1 else 'FAIL', 'on a phone: the State care plan box fits, no sideways scroll', str(w)])
    ph.screenshot(path='/tmp/care_plans_phone.png')
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

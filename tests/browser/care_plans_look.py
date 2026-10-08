"""Medicaid care plans on the Nurse Visits tab (GHE fix slice 1, 2026-10-08), in the real Hub page offline: upload a plan
(the fixture: two real Fusion plans with every name and number replaced), see what was read, the client guessed, the
received date required, confirm, the plan kept without address/phone/birth date, the GHE month on the nurse board, a CDS
plan stopped, every active client's standing and "how do they pay". (python3 tests/browser/care_plans_look.py [port])"""
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
  (0,eval)("CC_PICK_OPTS=[{name:'Pat Sample',ax:'901',pid:'p1',past:false},{name:'Lou Private',ax:'902',pid:'p2',past:false},{name:'Kim Medicaid',ax:'903',pid:'p3',past:false},{name:'Old Client',ax:'904',pid:'p4',past:true}]");
  (0,eval)("ccPickOptions=async()=>CC_PICK_OPTS");
  (0,eval)("CL360_IDENTITY=[{axiscare_client_id:'901',client_name:'Pat Sample',phone:'4175550101'}]");
  DATA.nurse_clients=[]; DATA.nurse_visits=[]; DATA.ghe_forms=[]; DATA.nurse_staff=[]; DATA.medicaid_plans=[];
})();
"""
T = r"""async(FX)=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  window.__as('krystal@mo-care.com','Krystal Land');
  switchTab('nursevisits'); await sleep(300);
  const card=()=>document.getElementById('mcpCard');
  ok('Nurse Visits opens with the "Medicaid care plans" card and an upload button', card() && /Medicaid care plans/.test(card().innerText) && document.getElementById('mcpFile') && document.getElementById('mcpFile').accept.includes('pdf'));
  ok('...every active client\'s standing: 3 active, 3 not sorted (the past client is left out)', /3 active clients:.*3 not sorted/.test(card().innerText) && !/Old Client/.test(card().innerText), card().innerText.slice(0,600));
  const row=await mcpAddItems('plan-agency.pdf', FX.agency); await sleep(200);
  const pend=()=>document.getElementById('mcpPend_'+row.id);
  const tx=pend().innerText;
  ok('Uploaded: what was read (name, DCN, plan period, generated date)', /PAT SAMPLE/.test(tx) && /DCN 12345678/.test(tx) && /08\/10\/2026 to 01\/31\/2027/.test(tx) && /generated 10\/08\/2026/.test(tx), tx.slice(0,400));
  ok('...our services: agency personal care and the GHE, with their authorizations', /Agency personal care/.test(tx) && /GHE \(nurse visit\)/.test(tx) && /20260000000001/.test(tx), tx);
  ok('...the GHE month it authorizes: Nov 2026 (T1001), "goes on the nurse board when you confirm"', /GHE authorized: Nov 2026 \(T1001\)/.test(tx));
  ok('...the other provider is noted, not taken', /Also served by EMEREST HEALTH CDS OF MISSOU/.test(tx) && !/EMEREST.*Prior/.test(pend().querySelector('table').innerText));
  ok('...the client is guessed from the name (PAT SAMPLE = Pat Sample)', document.getElementById('mcpPick_'+row.id).value==='Pat Sample · #901', document.getElementById('mcpPick_'+row.id).value);
  ok('...Confirm stays off until the received date is entered, and says why', document.getElementById('mcpSave_'+row.id).disabled && /Enter the date we received this plan/.test(tx));
  mcpRecv(row.id,'2099-01-01'); await sleep(150);
  ok('...a future received date is refused', document.getElementById('mcpSave_'+row.id).disabled && /can't be in the future/.test(pend().innerText));
  ok('...nothing was saved yet', window.__P.length===0, window.__P);
  mcpRecv(row.id,'2026-10-07'); await sleep(150);
  ok('...with the date, Confirm and save turns on', !document.getElementById('mcpSave_'+row.id).disabled);
  await mcpSave(row.id); await sleep(300);
  const plans=window.__P.filter(x=>x[0]==='medicaid_plans').map(x=>x[1]), nc=window.__P.filter(x=>x[0]==='nurse_clients').map(x=>x[1]);
  ok('Saved: the plan, confirmed by Krystal, received Oct 7, for client #901', plans.length===1 && plans[0].axiscare_client_id==='901' && plans[0].received_on==='2026-10-07' && plans[0].confirmed_by==='krystal@mo-care.com' && plans[0].ghe_months.join()==='2026-11', plans);
  ok('...never the address, phone or date of birth', !/ADDRESS|0000000000|1950|Phone|DOB/.test(JSON.stringify(plans[0])));
  ok('...Pat Sample is added to the nurse board with the GHE in November 2026, its authorization kept', nc.length===1 && nc[0].name==='Pat Sample' && nc[0].axiscare_client_id==='901' && nc[0].ghe1==='2026-11' && !nc[0].ghe2 && nc[0].ghe_auth['2026-11'].code==='T1001' && nc[0].added_from==='care_plan' && nc[0].phone==='4175550101', nc);
  ok('...the toast says so', /Care plan saved for Pat Sample\. GHE Nov 2026 on the nurse board\. Added to the nurse board\./.test(window.__toast||''), window.__toast);
  ok('...the GHE list now shows Pat Sample', /Pat Sample/.test(document.getElementById('nvGheList').innerText));
  ok('...and the client list: Pat Sample has a plan to 01/31/2027 with GHE Nov 2026', (MCP_STATE.showAll=true, await mcpRender(), /Pat Sample\s*Plan to 01\/31\/2027 · GHE Nov 2026/.test(card().innerText)), card().innerText.slice(0,900));
  /* a second upload of the same plan: no second nurse-board entry */
  window.__P.length=0; const again=await mcpAddItems('plan-agency.pdf', FX.agency); mcpRecv(again.id,'2026-10-07'); await sleep(100); await mcpSave(again.id); await sleep(200);
  ok('The same plan again: replaces the record, no second nurse-board entry', DATA.medicaid_plans.filter(p=>p.kind==='plan').length===1 && DATA.nurse_clients.length===1 && DATA.nurse_clients[0].ghe1==='2026-11', DATA.nurse_clients);
  /* a CDS plan */
  const cds=await mcpAddItems('plan-cds.pdf', FX.cds); await sleep(150);
  const ct=document.getElementById('mcpPend_'+cds.id).innerText;
  ok('A CDS plan is stopped: "belongs on the CDS side", no Confirm button', /This is a CDS plan\. It belongs on the CDS side/.test(ct) && !document.getElementById('mcpSave_'+cds.id) && /Remove/.test(ct), ct);
  mcpDiscard(cds.id);
  /* not a plan */
  const junk=await mcpAddItems('invoice.pdf', [{page:1,x:10,y:400,str:'Invoice 42'}]); await sleep(150);
  ok('Not a care plan: says so, nothing to confirm', /No service lines found/.test(document.getElementById('mcpPend_'+junk.id).innerText) && !document.getElementById('mcpSave_'+junk.id));
  mcpDiscard(junk.id);
  /* how do they pay */
  window.__P.length=0; await mcpMark('902','private'); await mcpMark('903','medicaid'); await sleep(200);
  const marks=window.__P.map(x=>x[1]);
  ok('"How do they pay": Lou is private pay, Kim is Medicaid with a plan to upload; each saved with who and when', marks.length===2 && marks[0].kind==='payer_mark' && marks[0].payer==='private' && marks[0].by==='krystal@mo-care.com' && marks[1].payer==='medicaid', marks);
  MCP_STATE.showAll=false; await mcpRender();
  const left=card().innerText;
  ok('...the short list now shows only what needs doing: Kim (upload their plan); Lou and Pat are off it', /Kim Medicaid\s*Medicaid, no plan uploaded/.test(left) && !/Lou Private/.test(left) && !/Pat Sample\s*Plan to/.test(left) && /0 not sorted/.test(left), left.slice(0,700));
  return R; }"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []
    pg = b.new_page(viewport={'width': 1280, 'height': 1000})
    pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    pg.goto(f'http://localhost:{PORT}/index.html?proof=careplans'); pg.wait_for_timeout(1500)
    for s in (STUB, DATA, FAKE): pg.evaluate('s=>(0,eval)(s)', s)
    R = pg.evaluate(T, FX)
    pg.screenshot(path='/tmp/care_plans_desk.png', full_page=False)
    ph = b.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True)
    ph.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    ph.goto(f'http://localhost:{PORT}/index.html?proof=careplans'); ph.wait_for_timeout(1500)
    for s in (STUB, DATA, FAKE): ph.evaluate('s=>(0,eval)(s)', s)
    w = ph.evaluate("""async(FX)=>{ document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; window.__as('krystal@mo-care.com','Krystal Land');
      switchTab('nursevisits'); await new Promise(r=>setTimeout(r,300)); await mcpAddItems('plan-agency.pdf', FX.agency); await new Promise(r=>setTimeout(r,300));
      const c=document.getElementById('mcpCard').getBoundingClientRect(); document.getElementById('mcpCard').scrollIntoView();
      return { sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth, w:c.width }; }""", FX)
    R.append(['PASS' if w['sw'] <= w['cw'] + 1 and w['w'] <= 390 else 'FAIL', 'on a phone: the care plan card fits, no sideways scroll', str(w)])
    ph.screenshot(path='/tmp/care_plans_phone.png')
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

"""Starting care for an IHS / ADW client (Medicaid intake slice A, 2026-10-08), in the real Hub page offline, the clock at
Oct 18 2026: the 10-day start clock on the client's Payer tab (State care plan box); overdue → the written justification
(drafted, edited, recorded as sent with how and the copy in the file; nothing sent by the Hub); the five start checks;
started on time from the first clock-in; a first visit entered by hand for a client with no inquiry; a renewal has no
clock. (python3 tests/browser/ihs_start_look.py [port])"""
import os, sys, json
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
  (0,eval)("ccToast=(m)=>{ window.__toast=m; }"); (0,eval)("lpfRenderPayerFacts=()=>{}"); (0,eval)("ccPickOptions=async()=>[]");
  const svc=(start)=>[{ type:'PC - Agency', kind:'pc', label:'Agency personal care', program:'ihs', start, end:'2027-03-31', ours:true, prior_auth:'20260000000001', units:[], tasks:[] },
                      { type:'GHE', kind:'ghe', label:'GHE (nurse visit)', program:'ihs', start:'2027-01-01', end:'2027-01-31', ours:true, prior_auth:'20260000000002', units:[], tasks:[] }];
  DATA.medicaid_plans=[
    { id:'mcp_901_a', kind:'plan', axiscare_client_id:'901', lead_id:'L1', client_name:'Pat Sample', dcn:'12345678', plan_start:'2026-10-05', plan_end:'2027-03-31', generated:'2026-10-07', received_on:'2026-10-07', services:svc('2026-10-05'), ghe_months:['2027-01'], confirmed_by:'angiel@mo-care.com' },
    { id:'mcp_902_a', kind:'plan', axiscare_client_id:'902', lead_id:'L2', client_name:'Quinn Ontime', dcn:'22222222', plan_start:'2026-10-05', plan_end:'2027-03-31', generated:'2026-10-07', received_on:'2026-10-07', services:svc('2026-10-05'), ghe_months:[], confirmed_by:'angiel@mo-care.com' },
    { id:'mcp_903_a', kind:'plan', axiscare_client_id:'903', lead_id:'', client_name:'Rae Nolead', dcn:'33333333', plan_start:'2026-10-05', plan_end:'2027-03-31', generated:'2026-10-07', received_on:'2026-10-10', services:svc('2026-10-12'), ghe_months:[], confirmed_by:'angiel@mo-care.com' },
    { id:'mcp_904_a', kind:'plan', axiscare_client_id:'904', lead_id:'L4', client_name:'Sal Renewal', dcn:'44444444', plan_start:'2026-10-01', plan_end:'2027-03-31', generated:'2026-09-30', received_on:'2026-10-01', services:svc('2026-10-01'), ghe_months:[], confirmed_by:'angiel@mo-care.com' }];
  W.__leads={ L1:{ id:'L1', client_first_name:'Pat', client_last_name:'Sample', funding_source:'medicaid', dcn:'12345678', state_status:'authorized', axiscare_client_id:'901' },
    L2:{ id:'L2', client_first_name:'Quinn', client_last_name:'Ontime', funding_source:'medicaid', dcn:'22222222', state_status:'authorized', axiscare_client_id:'902', first_shift_at:'2026-10-15T14:00:00Z' },
    L4:{ id:'L4', client_first_name:'Sal', client_last_name:'Renewal', funding_source:'medicaid', dcn:'44444444', state_status:'authorized', axiscare_client_id:'904', first_shift_at:'2025-04-02T14:00:00Z' } };
  DATA.leads=Object.values(W.__leads); DATA.nurse_clients=[]; DATA.ghe_forms=[]; DATA.nurse_staff=[];
  W.__open=(lead,ax,name)=>{ CP.lead=lead; CP.ax=ax; CP.r={ client_name:name }; cpRenderPayer(); };
})();
"""
T = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  window.__as('angiel@mo-care.com','Angiel');
  __open(__leads.L1,'901','Pat Sample'); await sleep(150);
  const box=()=>document.getElementById('cpPlanBox').innerText;
  ok('Pat (plan received Oct 7, care to start by Oct 17, no clock-in): "Not started: the deadline was 10/17/2026 (1 day ago)"', /Starting care\s*Not started: the deadline was 10\/17\/2026 \(1 day ago\)/.test(box()), box());
  ok('...the rule is spelled out: within 10 calendar days of receiving it, or its start date, whichever is later', /within 10 calendar days of receiving the authorization \(2026-10-07\), or the start date it gives \(2026-10-05\), whichever is later/.test(box()));
  ok('...a written justification is owed to DSDS, with a draft letter (Hub sends nothing)', /Written justification owed to DSDS/.test(box()) && /The Hub drafts it; you edit it and send it yourself/.test(box()) && /received the service authorization on 2026-10-07/.test(document.getElementById('mcpSText').value));
  mcpLateField('reason','No caregiver was free for the authorized morning hours until a new hire finished orientation.'); mcpLateField('planned_start','2026-10-21'); await sleep(80);
  ok('...the letter fills in the reason and the expected start as they are typed', /because: No caregiver was free/.test(document.getElementById('mcpSText').value) && /begin services on 2026-10-21/.test(document.getElementById('mcpSText').value));
  await mcpLateSave(); await sleep(80);
  ok('...recording it needs the date sent, how, and the copy in the file; nothing saved before that', /date it was sent/.test(document.getElementById('mcpSMsg').textContent) && window.__P.length===0, document.getElementById('mcpSMsg').textContent);
  mcpLateField('sent_on','2026-10-18'); mcpLateField('how','Fusion'); mcpLateField('copy_in_file',true); await sleep(80);
  document.getElementById('mcpSText').value+='\nEdited by Angiel.'; await mcpLateSave(); await sleep(150);
  const p1=window.__P.filter(x=>x[0]==='medicaid_plans').map(x=>x[1]).pop();
  ok('...recorded: the reason, the letter as edited, sent Oct 18 through Fusion, the copy in the file, by Angiel', p1 && p1.start.late.sent_on==='2026-10-18' && p1.start.late.how==='Fusion' && p1.start.late.copy_in_file && /Edited by Angiel/.test(p1.start.late.text) && p1.start.late.by==='angiel@mo-care.com', p1&&p1.start);
  ok('...the box now says it was sent, and the form is gone', /Written justification sent to DSDS\s*10\/18\/2026 \(Fusion\), copy in the file/.test(box()) && !document.getElementById('mcpSText'), box());
  /* the start checks */
  ok('The five start checks (state rules), each with its source', ['PCCP','rights statement','code of ethics','EVV is required','caregiver has the care plan'].every(x=>box().toLowerCase().includes(x.toLowerCase())) && /MAN 4.20/.test(box()) && /13 CSR 70-3.320/.test(box()));
  document.getElementById('mcpSC_pccp_copy').value='2026-10-16'; window.__P.length=0; await mcpStartCheck('pccp_copy'); await sleep(120);
  const p2=window.__P.filter(x=>x[0]==='medicaid_plans').map(x=>x[1]).pop();
  ok('...ticking one records the date and who', p2 && p2.start.checks.pccp_copy.on==='2026-10-16' && p2.start.checks.pccp_copy.by==='angiel@mo-care.com' && /10\/16\/2026\s*A copy of the care plan \(PCCP\) given/.test(box()));
  /* started on time */
  __open(__leads.L2,'902','Quinn Ontime'); await sleep(120);
  ok('Quinn (first clock-in Oct 15): "Started 10/15/2026 (first clock-in), on time"; no justification', /Started 10\/15\/2026 \(first clock-in\), on time/.test(box()) && !/justification owed/.test(box()) && !document.getElementById('mcpSManual'), box());
  /* no inquiry: the first visit typed from AxisCare */
  __open(null,'903','Rae Nolead'); await sleep(120);
  ok('Rae (no inquiry; received Oct 10, plan starts Oct 12): "Start care by 10/20/2026 (2 days left)" and a box for the first visit from AxisCare', /Start care by 10\/20\/2026 \(2 days left\)/.test(box()) && document.getElementById('mcpSManual'), box());
  window.__P.length=0; await mcpStartManual('2026-10-17'); await sleep(120);
  ok('...entering the first visit (Oct 17) records it and shows "Started 10/17/2026 ..., on time"', /Started 10\/17\/2026 \(first clock-in\), on time/.test(box()) && window.__P.some(x=>x[0]==='medicaid_plans'&&x[1].start.started_on_manual==='2026-10-17'), box());
  /* a renewal */
  __open(__leads.L4,'904','Sal Renewal'); await sleep(120);
  ok('Sal (care began 2025): a renewal, no new 10-day clock', /Care began 04\/02\/2025, before this plan arrived, so this is a renewal or change/.test(box()) && !/Start care by/.test(box()), box());
  return R; }"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []
    pg = b.new_page(viewport={'width': 1280, 'height': 1200})
    pin(pg, '2026-10-18T10:00:00-05:00')
    pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    pg.goto(f'http://localhost:{PORT}/index.html?proof=ihsstart'); pg.wait_for_timeout(1500)
    for s in (STUB, DATA, FAKE): pg.evaluate('s=>(0,eval)(s)', s)
    R = pg.evaluate(T)
    shot = """async()=>{ DATA.medicaid_plans.forEach(p=>{ delete p.start; }); __open(__leads.L1,'901','Pat Sample'); const host=document.getElementById('cp_payer');
      document.body.appendChild(host); host.style.cssText='position:fixed;inset:0;overflow:auto;background:#fff;z-index:99999;padding:16px;';
      await new Promise(r=>setTimeout(r,200)); document.getElementById('cpPlanBox').scrollIntoView(); return { hw:host.scrollWidth, hc:host.clientWidth }; }"""
    pg.evaluate(shot); pg.wait_for_timeout(200); pg.screenshot(path='/tmp/ihs_start.png')
    ph = b.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True)
    pin(ph, '2026-10-18T10:00:00-05:00')
    ph.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    ph.goto(f'http://localhost:{PORT}/index.html?proof=ihsstart'); ph.wait_for_timeout(1500)
    for s in (STUB, DATA, FAKE): ph.evaluate('s=>(0,eval)(s)', s)
    ph.evaluate("()=>{ document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; window.__as('angiel@mo-care.com','Angiel'); }")
    w = ph.evaluate(shot)
    R.append(['PASS' if w['hw'] <= w['hc'] + 1 else 'FAIL', 'on a phone: Starting care fits, no sideways scroll', str(w)])
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

"""Visits from AxisCare on the client's Payer tab (Medicaid slice D, 2026-10-08), the real Hub page offline, clock Oct 20 2026:
this month's units delivered (clocked time) vs authorized, visits not delivered with their reasons, the risk line; last
month's review, signed only by the Medicaid coordinator (Angiel) or an owner, with an explanation when something needs it;
signing closes the My Work card. (python3 tests/browser/visits_look.py [port])"""
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
  (0,eval)("ccToast=(m)=>{ window.__toast=m; }"); (0,eval)("lpfRenderPayerFacts=()=>{}"); (0,eval)("ccPickOptions=async()=>[]");
  (0,eval)("opsDomainOwner=c=>c==='payer_programs'?'angiel@mo-care.com':''"); (0,eval)("ccIsOwner=()=>false");
  DATA.medicaid_plans=[{ id:'mcp_901', kind:'plan', axiscare_client_id:'901', lead_id:'', client_name:'Ann Risk', dcn:'12345678', plan_start:'2026-06-01', plan_end:'2027-03-31', generated:'2026-05-30', received_on:'2026-05-30',
    services:[{ type:'PC - Agency', kind:'pc', label:'Agency personal care', program:'ihs', start:'2026-06-01', end:'2027-03-31', ours:true, prior_auth:'2026', units:[], tasks:[] }], ghe_months:[], confirmed_by:'angiel@mo-care.com' }];
  DATA.visit_watch=[
    { id:'vw_901_2026-10', ax:'901', name:'Ann Risk', month:'2026-10', authorized_units:120, delivered_units:16, visits_scheduled:4, visits_delivered:2, checked_at:'2026-10-20T14:45:00Z',
      missed:[{ id:'a', day:'2026-10-16', caregiver:'Maria Lopez', reason:{ reason:'calling_off', note:'', by:'Krystal Land' } }, { id:'b', day:'2026-10-19', caregiver:'Maria Lopez', reason:null }], short:[],
      risk:{ at_risk:true, in_a_row:2, days_without:6, last_delivered:'2026-10-14', since_missed:['2026-10-16','2026-10-19'] } },
    { id:'vw_901_2026-09', ax:'901', name:'Ann Risk', month:'2026-09', authorized_units:120, delivered_units:96, visits_scheduled:13, visits_delivered:12, checked_at:'2026-10-02T14:45:00Z',
      missed:[{ id:'c', day:'2026-09-10', caregiver:'Maria Lopez', reason:null }], short:[{ day:'2026-09-03', minutes:80, scheduled:120 }] }];
  DATA.ops_items=[{ id:'ops_vreview_901_2026-09', kind:'visit_review', status:'open', title:'Monthly visit review, 2026-09: Ann Risk', owner:'angiel@mo-care.com' }];
  DATA.leads=[]; DATA.nurse_clients=[]; DATA.ghe_forms=[]; DATA.nurse_staff=[];
  W.__open=()=>{ CP.lead=null; CP.ax='901'; CP.r={ client_name:'Ann Risk' }; cpRenderPayer(); };
})();
"""
T = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  window.__as('krystal@mo-care.com','Krystal Land'); __open(); await sleep(150);
  const box=()=>document.getElementById('cpPlanBox').innerText;
  ok('This month from AxisCare: "16 of 120 authorized units delivered (clocked time) · 2 of 4 visits delivered"', /10\/2026 so far: 16 of 120 authorized units delivered \(clocked time\) · 2 of 4 visits delivered/.test(box()), box());
  ok('...the risk line: 2 in a row not delivered, last delivered Oct 14, make-up before 1 week or 3 in a row (4)(A)5', /2 scheduled visits in a row not delivered \(2026-10-16, 2026-10-19\); last delivered 2026-10-14/.test(box()) && /\(4\)\(A\)5/.test(box()));
  ok('...visits not delivered with their reasons from the missed clock-in alert, or "no reason yet"', /2026-10-16 \(caregiver called off\), 2026-10-19 \(no reason yet\)/.test(box()), box());
  ok('Last month\'s review: the numbers, the visit with no reason on file, the short visit', /Monthly visit review, 2026-09/.test(box()) && /96 of 120 authorized units delivered/.test(box()) && /2026-09-10 Maria Lopez \(no reason on file\)/.test(box()) && /Short visits: 2026-09-03 80 of 120 min/.test(box()), box());
  ok('...someone other than the Medicaid coordinator sees "waiting for the Medicaid coordinator", no Sign button', /Waiting for the Medicaid coordinator to review and sign it/.test(box()) && !/Sign the review/.test(box()));
  window.__as('angiel@mo-care.com','Angiel'); __open(); await sleep(120);
  ok('The Medicaid coordinator (Angiel) can sign; it says what needs writing (the reason, and units under authorized)', /Sign the review/.test(box()) && /Write the reason for each visit not delivered with no reason on file, and why fewer units were delivered than authorized/.test(box()));
  await mcpVisitSign('vw_901_2026-09'); await sleep(80);
  ok('...signing without an explanation is refused', /Explain the 1 visit/.test(document.getElementById('mcpVMsg').textContent) && !window.__P.length);
  document.getElementById('mcpVX').value='Sep 10: caregiver sick, no substitute free; client agreed to skip. Units low: two short visits at the family\'s request.'; window.__P.length=0; await mcpVisitSign('vw_901_2026-09'); await sleep(150);
  const w=window.__P.filter(x=>x[0]==='visit_watch').map(x=>x[1]).pop(), card=window.__P.filter(x=>x[0]==='ops_items').map(x=>x[1]).pop();
  ok('...signed: the explanation, her name, who and when, kept on the month', w && w.review.signed_name==='Angiel' && w.review.signed_by==='angiel@mo-care.com' && /caregiver sick/.test(w.review.explanation), w&&w.review);
  ok('...and the monthly review card on My Work closes', card && card.id==='ops_vreview_901_2026-09' && card.status==='done' && /signed by Angiel/.test(card.resolution));
  ok('...the box now says Signed', /Signed\s*by Angiel/.test(box()));
  ok('My Work knows the two new card kinds', OPS_KINDS.visit_risk && OPS_KINDS.visit_review);
  return R; }"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []
    pg = b.new_page(viewport={'width': 1280, 'height': 1100})
    pin(pg, '2026-10-20T10:00:00-05:00')
    pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    pg.goto(f'http://localhost:{PORT}/index.html?proof=visits'); pg.wait_for_timeout(1500)
    for s in (STUB, DATA, FAKE): pg.evaluate('s=>(0,eval)(s)', s)
    R = pg.evaluate(T)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

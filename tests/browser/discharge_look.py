"""End care for a Medicaid client (Medicaid intake slice B, 2026-10-08), in the real Hub page offline: the rule for the reason
picked (21-day notice / tell DSDS right away / DSDS closed / the participant's choice), the notice dates and the earliest last
day, and what is sent to the service (which enforces the same rule). A private-pay client gets no Medicaid box.
(python3 tests/browser/discharge_look.py [port])"""
import os, sys
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
PORT = sys.argv[1] if len(sys.argv) > 1 else '8765'
src = open(os.path.join(HERE, 'client_care_look.py')).read()
ns = {'__file__': os.path.join(HERE, 'client_care_look.py')}; exec(src[:src.index('T = r"""')], ns)
STUB, DATA, FAKE = ns['STUB'], ns['DATA'], ns['FAKE']
EXTRA = r"""
(()=>{
  const W=window, of=W.fetch;
  W.__payer='medicaid';
  W.fetch=async(u,o)=>{ const r=await of(u,o);
    if(/client-journey/.test(String(u)) && JSON.parse(o.body).action==='care_state'){ const j=await r.json();
      j.payer=W.__payer; j.reasons.end=Object.assign({}, j.reasons.end, { noncompliance:'Does not follow the care plan (we are ending services)', safety:'Threats or abuse toward our staff (we are ending services)' });
      j.discharge={ beyond_scope:'notice21', unable_to_staff:'notice21', noncompliance:'notice21', deceased:'immediate', facility:'immediate', moved_out:'immediate', safety:'immediate', auth_ended:'dsds', other_provider:'choice', requested_discharge:'choice', other:'choice' };
      return new Response(JSON.stringify(j),{status:200}); }
    return r; };
})();
"""
T = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  DATA.ops_settings.client_journey_live=true; window.__as('sam@mo-care.com','Samantha Owner');
  DATA.leads.push({ id:'R3', client_first_name:'Rhoda', client_last_name:'Real', funding_source:'medicaid', status:'Converted', said_yes_at:'2026-10-01', axiscare_client_id:'777' });
  const B=()=>document.getElementById('ccCare'), dlg=()=>document.querySelector('.cc-dlg'), C=window.__care;
  await openLeadProfile('R3','summary'); await sleep(500);
  [...B().querySelectorAll('button')].find(b=>/End care/.test(b.textContent)).click(); await sleep(150);
  const pick=v=>{ const s=dlg().querySelector('#ccR'); s.value=v; s.dispatchEvent(new Event('change')); };
  const rule=()=>(dlg().querySelector('#ccRule')||{innerText:''}).innerText;
  ok('End care lists the two new reasons we end services for (does not follow the plan; threats or abuse)', /Does not follow the care plan/.test(dlg().innerText) && /Threats or abuse/.test(dlg().innerText));
  pick('unable_to_staff'); await sleep(60);
  ok('Unable to staff, on Medicaid: the 21-day rule, with both notice dates required and "an owner records this end"', /we are ending services while they still need care/.test(rule()) && /at least 21 days before the last day/.test(rule()) && /\(16\)\(D\)/.test(rule()) && /An owner records this end/.test(rule()) && dlg().querySelector('#ccNP') && dlg().querySelector('#ccND') && dlg().querySelector('#ccNA'), rule());
  const d=n=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago'}).format(new Date(Date.now()+n*864e5));
  const set=(id,v)=>{ const e=dlg().querySelector('#'+id); e.value=v; e.dispatchEvent(new Event('change')); };
  set('ccNP',d(-25)); set('ccND',d(-24)); await sleep(40);
  ok('...entering both notice dates shows the earliest last day (21 days after the later one)', new RegExp('The last day can be '+d(-3)+' at the earliest').test(rule()), rule());
  dlg().querySelector('#ccD').value=d(0); dlg().querySelector('#ccGo').click(); await sleep(600);
  const e1=C.calls.filter(b=>b.action==='care_end').pop();
  ok('...the notice dates go to the service with the end (it enforces the same rule)', e1 && e1.reason==='unable_to_staff' && e1.notice_participant_on===d(-25) && e1.notice_dsds_on===d(-24) && !e1.dsds_arranged_on, e1);
  /* immediate */
  C.state['777']='active'; await openLeadProfile('R3','summary'); await sleep(400);
  [...B().querySelectorAll('button')].find(b=>/End care/.test(b.textContent)).click(); await sleep(150);
  pick('facility'); await sleep(40);
  ok('Admitted to a facility: "tell DSDS in writing, right away", no 21-day notice, the date it went if it has', /tell DSDS in writing, right away/.test(rule()) && /No 21-day notice/.test(rule()) && /\(16\)\(B\)/.test(rule()) && dlg().querySelector('#ccDN') && !dlg().querySelector('#ccNP'), rule());
  pick('safety'); await sleep(40);
  ok('Threats or abuse: right away, and DSDS and we decide together (16)(C)', /decide together/.test(rule()) && /\(16\)\(C\)/.test(rule()));
  pick('auth_ended'); await sleep(40);
  ok('Authorization ended: DSDS closed the case, stop right away, the closure date from Fusion (16)(A)', /DSDS closed the case/.test(rule()) && /closure date from Fusion/.test(rule()));
  pick('other_provider'); await sleep(40);
  ok('Chose another provider: the participant\'s choice, DSDS moves the case (866-835-3505)', /participant's choice/.test(rule()) && /866-835-3505/.test(rule()));
  pick('facility'); set('ccDN',d(0)); dlg().querySelector('#ccD').value=d(0); dlg().querySelector('#ccGo').click(); await sleep(600);
  const e2=C.calls.filter(b=>b.action==='care_end').pop();
  ok('...the DSDS notice date goes with a facility end (it ticks that step)', e2 && e2.reason==='facility' && e2.dsds_notice_on===d(0), e2);
  /* private pay */
  C.state['777']='active'; window.__payer='private'; await openLeadProfile('R3','summary'); await sleep(400);
  [...B().querySelectorAll('button')].find(b=>/End care/.test(b.textContent)).click(); await sleep(150); pick('unable_to_staff'); await sleep(40);
  ok('A private-pay client: no Medicaid box', !dlg().querySelector('#ccRule'));
  return R; }"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1280, 'height': 1000}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    pg.goto(f'http://localhost:{PORT}/index.html?proof=discharge'); pg.wait_for_timeout(1500)
    for s in (STUB, DATA, FAKE, EXTRA): pg.evaluate('s=>(0,eval)(s)', s)
    R = pg.evaluate(T)
    pg.evaluate("""async()=>{ window.__care.state['777']='active'; window.__payer='medicaid'; await openLeadProfile('R3','summary'); await new Promise(r=>setTimeout(r,400));
      [...document.getElementById('ccCare').querySelectorAll('button')].find(b=>/End care/.test(b.textContent)).click(); await new Promise(r=>setTimeout(r,150));
      const s=document.querySelector('.cc-dlg #ccR'); s.value='unable_to_staff'; s.dispatchEvent(new Event('change')); }""")
    pg.wait_for_timeout(200); pg.screenshot(path='/tmp/discharge_form.png')
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

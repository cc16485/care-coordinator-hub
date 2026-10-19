"""Planned end of care on the Hub (Samantha 2026-10-15: "Yes: both new reasons under the 21-day notice rule, plus planned
future end dates"). The real page, offline, with the care service played in the page: End care with a future last day
reads "Plan the end"; the Medicaid 21-day box shows for the IHS/ADW reasons on any client; the profile shows the plan, its
steps and Cancel (owners only for 21-day ends); an AxisCare review still can't use a future date.
(python3 tests/browser/client_care_planned_end_look.py, static server on 8765)"""
from playwright.sync_api import sync_playwright
import os
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'client_journey_look.py')).read()
ns = {'__file__': os.path.join(os.path.dirname(os.path.abspath(__file__)), 'client_journey_look.py')}; exec(src.split('with sync_playwright() as pw:')[0], ns)
STUB, DATA = ns['STUB'], ns['DATA']
FAKE = r"""
(()=>{
  const W=window, reasons={ end:{ other_provider:'Chose another provider', moved_cds:'Moved to Caring CDS (we no longer provide IHS or ADW)', program_ended:'We no longer provide this program (IHS or ADW)', deceased:'Deceased', other:'Other' }, pause:{ hospital:'Hospital stay', other:'Other' } };
  W.__care={ calls:[], pe:null, owner:false };
  const C=W.__care;
  const stateOf=ax=>({ axiscare_client_id:ax, client_name:'Penny Private', state:'active', pause:null, payer:'private',
    episodes:[{ episode_n:1, status:'open', created_at:'2026-09-01' }], roles:[{ status:'active' }], changes:C.pe?[C.pe]:[], reasons,
    discharge:{ moved_cds:'notice21', program_ended:'notice21', other_provider:'their_choice' }, always_medicaid:['moved_cds','program_ended'],
    planned_end:C.pe, can:{ pause:true, end:true, cancel_end:!!C.pe && C.owner } });
  const of=W.fetch; W.fetch=async(u,o)=>{ if(/client-journey/.test(String(u))){ const b=JSON.parse(o.body);
      if(String(b.action||'').startsWith('care_')){ C.calls.push(b); let out={};
        if(b.action==='care_state') out=stateOf(b.axiscare_client_id);
        if(b.action==='care_end'){ C.pe={ change_id:'pe1', kind:'end_planned', reason:b.reason, effective_date:b.effective_date, made_by:'sam@mo-care.com', made_by_name:'Samantha Owner', made_at:new Date().toISOString(),
            checklist:[{ key:'notice_21', label:'21-day written notice to the participant or family', rule:'19 CSR 15-7.021(16)(D)', when:'At least 21 days before the last day.', state:'done', on:b.notice_participant_on, by_name:'Samantha Owner' },
              { key:'continue_21', label:'Keep providing care for the 21 days', rule:'19 CSR 15-7.021(16)(D)', when:'Until the last day.', state:'open' }] };
          out={ outcome:'planned', last_day:b.effective_date }; }
        if(b.action==='care_end_cancel'){ C.pe=null; out={ outcome:'cancelled' }; }
        return new Response(JSON.stringify(out),{status:200}); }
    } return of(u,o); };
})();
"""
T = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  DATA.ops_settings.client_journey_live=true; window.__as('sam@mo-care.com','Samantha Owner'); window.__care.owner=true;
  DATA.leads.push({ id:'P1', client_first_name:'Penny', client_last_name:'Private', funding_source:'private', status:'Converted', said_yes_at:'2026-10-01', axiscare_client_id:'888' });
  const B=()=>document.getElementById('ccCare'), dlg=()=>document.querySelector('.cc-dlg'), C=window.__care;
  const ymd=d=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago'}).format(d), today=ymd(new Date()), later=ymd(new Date(Date.now()+28*864e5)), past=ymd(new Date(Date.now()-30*864e5));
  await openLeadProfile('P1','summary'); await sleep(500);
  [...B().querySelectorAll('button')].find(b=>/End care/.test(b.textContent)).click(); await sleep(150);
  ok('End care takes a future last day (no "today" limit), and the plan note is hidden for today', !dlg().querySelector('#ccD').max && dlg().querySelector('#ccPlanNote').hidden && dlg().querySelector('#ccGo').textContent!=='Plan the end', dlg().innerText);
  const r=dlg().querySelector('#ccR'); r.value='other_provider'; r.dispatchEvent(new Event('change')); await sleep(50);
  ok('...a private client choosing another provider gets no Medicaid box', !dlg().querySelector('#ccRule').innerText.trim(), dlg().querySelector('#ccRule').innerText);
  r.value='moved_cds'; r.dispatchEvent(new Event('change')); await sleep(50);
  ok('..."Moved to Caring CDS" shows the 21-day box even with no Medicaid plan on file', /21 days before the last day/.test(dlg().querySelector('#ccRule').innerText) && /19 CSR 15-7\.021\(16\)\(D\)/.test(dlg().querySelector('#ccRule').innerText) && dlg().querySelector('#ccNP'), dlg().querySelector('#ccRule').innerText);
  r.value='program_ended'; r.dispatchEvent(new Event('change')); await sleep(50);
  ok('..."We no longer provide this program (IHS or ADW)" shows it too', /21 days before the last day/.test(dlg().querySelector('#ccRule').innerText) && dlg().querySelector('#ccND'));
  const d=dlg().querySelector('#ccD'); d.value=later; d.dispatchEvent(new Event('input')); await sleep(50);
  ok('...a future last day shows the plan note and the button reads "Plan the end"', !dlg().querySelector('#ccPlanNote').hidden && /care continues as normal until then/.test(dlg().querySelector('#ccPlanNote').innerText) && dlg().querySelector('#ccGo').textContent==='Plan the end', dlg().querySelector('#ccGo').textContent);
  ok('...no em dash in the form', !/\u2014/.test(dlg().innerText));
  dlg().querySelector('#ccNP').value=past; dlg().querySelector('#ccNP').dispatchEvent(new Event('change')); dlg().querySelector('#ccND').value=past; dlg().querySelector('#ccND').dispatchEvent(new Event('change'));
  dlg().querySelector('#ccN').value='Samantha'; await window.shot('plan_form'); dlg().querySelector('#ccGo').click(); await sleep(800);
  const ec=C.calls.find(b=>b.action==='care_end');
  ok('Plan the end saves through the service with the future day, the reason and both notice dates', ec && ec.effective_date===later && ec.reason==='program_ended' && ec.notice_participant_on===past && ec.notice_dsds_on===past, ec);
  ok('...the care block is in sight on an active client (not tucked into More)', B().style.display!=='none' && !!B().offsetParent && B().getBoundingClientRect().height>0, B().style.display);
  ok('...the profile says "Care ends after <date> (planned)", the reason and who recorded it', /Care ends after [A-Z][a-z]{2} \d{1,2}, \d{4} \(planned\)/.test(B().innerText) && /We no longer provide this program \(IHS or ADW\)/.test(B().innerText) && /recorded by Samantha Owner/.test(B().innerText), B().innerText);
  ok('...care continues and nothing is sent; no second End care button', /Care continues as normal until then/.test(B().innerText) && /Nothing is sent to anyone/.test(B().innerText) && ![...B().querySelectorAll('button')].some(b=>/^End care$/.test(b.textContent)), B().innerText);
  ok('...the 21-day steps show for the planned end, one still to do', /Medicaid steps for this planned end of care/.test(B().innerText) && /1 still to do/.test(B().innerText) && /Keep providing care for the 21 days/.test(B().innerText), B().innerText);
  ok('...the care history names it', /Care end planned \(last day\)/.test(B().querySelector('.cc-hist').textContent));
  ok('...an owner sees Cancel the planned end', [...B().querySelectorAll('button')].some(b=>/Cancel the planned end/.test(b.textContent)));
  await window.shot('planned');
  window.__as('angie@mo-care.com','Angie Care'); C.owner=false; await openLeadProfile('P1','summary'); await sleep(500);
  ok('a Care Coordinator sees the plan but no Cancel for a 21-day end (the server refuses it too)', /Care ends after/.test(B().innerText) && ![...B().querySelectorAll('button')].some(b=>/Cancel the planned end/.test(b.textContent)), B().innerText);
  window.__as('sam@mo-care.com','Samantha Owner'); C.owner=true; await openLeadProfile('P1','summary'); await sleep(500);
  [...B().querySelectorAll('button')].find(b=>/Cancel the planned end/.test(b.textContent)).click(); await sleep(300);
  const inp=document.querySelector('input:focus, textarea:focus') || [...document.querySelectorAll('input,textarea')].filter(e=>e.offsetParent).pop();
  ok('Cancel asks why on the page (not a browser prompt)', !!inp, document.body.innerText.slice(-300));
  inp.value='They are staying with us after all'; inp.dispatchEvent(new Event('input'));
  const okBtn=[...document.querySelectorAll('button')].filter(b=>b.offsetParent && /^(OK|Save|Continue|Done)$/i.test(b.textContent.trim())).pop(); if(okBtn) okBtn.click(); else inp.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); await sleep(800);
  ok('...the reason goes to the server and End care is back', C.calls.some(b=>b.action==='care_end_cancel'&&b.axiscare_client_id==='888'&&b.explanation==='They are staying with us after all') && [...B().querySelectorAll('button')].some(b=>/^End care$/.test(b.textContent)) && !/Care ends after/.test(B().innerText), [C.calls.slice(-2), B().innerText]);
  return R; }"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1280, 'height': 1000}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    pg.goto('http://localhost:' + os.environ.get('HUB_PORT', '8765') + '/index.html?proof=care'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB); pg.evaluate('s=>(0,eval)(s)', DATA); pg.evaluate('s=>(0,eval)(s)', FAKE)
    pg.evaluate("()=>{ window.shot=async()=>{}; }")
    R = pg.evaluate(T)
    if os.environ.get('SHOTS'):   # the planned end as the office sees it (the plan is put back after the cancel test)
        pg.evaluate("async()=>{ const C=window.__care; C.pe=C.calls.filter(b=>b.action==='care_end').length?{ change_id:'pe1', kind:'end_planned', reason:'program_ended', effective_date:C.calls.find(b=>b.action==='care_end').effective_date, made_by_name:'Samantha Owner', made_at:new Date().toISOString(), checklist:[{ key:'notice_21', label:'21-day written notice to the participant or family', rule:'19 CSR 15-7.021(16)(D)', when:'At least 21 days before the last day.', state:'open' }] }:null; await openLeadProfile('P1','summary'); await new Promise(r=>setTimeout(r,500)); const d=document.querySelector('#ccCare details.cc-check'); if(d) d.open=true; }")
        pg.wait_for_timeout(400)
        pg.evaluate("()=>{ const c=document.getElementById('ccCare'); if(c) c.scrollIntoView(); }"); pg.screenshot(path=os.path.join(os.environ['SHOTS'], 'planned_end.png'))
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

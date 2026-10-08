"""Pause care / End care on the Hub (2026-10-07): the care block on a client's profile, the forms (required reason, dates,
explanation for Other), the Medicaid checklist (a person's steps), Past and Deceased views (nothing implied that AxisCare
doesn't have), the AxisCare status card opening the same forms, and Paused on the Clients list. The real page, offline, with
the care service played in the page. (python3 tests/browser/client_care_look.py, static server on 8765)"""
import re
from playwright.sync_api import sync_playwright
import os
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'client_journey_look.py')).read()
ns = {}; exec(src.split('with sync_playwright() as pw:')[0], ns)
STUB, DATA = ns['STUB'], ns['DATA']
FAKE = r"""
(()=>{
  const W=window, reasons={ end:{ other_provider:'Chose another provider', moved_out:'Moved out of our service area', facility:'Admitted to a facility', beyond_scope:'Needs exceed our scope', unable_to_staff:'Unable to staff', requested_discharge:'Client or family requested discharge', auth_ended:'Medicaid or authorization ended', deceased:'Deceased', other:'Other' },
    pause:{ hospital:'Hospital stay', rehab:'Rehab or skilled nursing stay', family_away:'Family away', other:'Other' } };
  W.__care={ calls:[], state:{ '777':'active', '500':'past', '501':'deceased' }, pause:null, changes:[], r500:{ status:'former', started_at:'2025-03-01', ended_at:'2026-10-08', ended_date_basis:'on_or_before', end_reason:null }, ch500:[] };
  const C=W.__care;
  const stateOf=ax=>({ axiscare_client_id:ax, client_name:{ '777':'Rhoda Real','500':'Olive Past','501':'Gil Gone' }[ax], state:C.state[ax], pause:ax==='777'?C.pause:null, payer:'medicaid',
    episodes:[{ episode_n:1, status:C.state[ax]==='active'||C.state[ax]==='paused'?'open':'closed', created_at:'2026-09-01', closed_reason:C.state[ax]==='past'?null:null }],
    roles:ax==='500'?[C.r500]:ax==='501'?[{ status:'former', ended_at:'2026-01-02', end_reason:'deceased' }]:[{ status:C.state[ax]==='past'?'former':'active' }],
    changes:ax==='777'?C.changes:ax==='500'?C.ch500:[], reasons,
    can:{ pause:['active','starting'].includes(C.state[ax]), resume:C.state[ax]==='paused', end:['active','starting','paused'].includes(C.state[ax]), return:C.state[ax]==='past'&&W.__me.email==='sam@mo-care.com', end_date:['past','deceased'].includes(C.state[ax]) } });
  const of=W.fetch; W.fetch=async(u,o)=>{ if(/client-journey/.test(String(u))){ const b=JSON.parse(o.body);
      if(String(b.action||'').startsWith('care_')){ C.calls.push(b); let out={};
        if(b.action==='care_state') out=stateOf(b.axiscare_client_id);
        if(b.action==='care_pause'){ C.state['777']='paused'; C.pause={ paused_from:b.effective_date, followup_date:b.followup_date, reason:b.reason, explanation:b.explanation||null };
          C.changes.push({ change_id:'ch1', kind:'pause', reason:b.reason, effective_date:b.effective_date, made_by:'angie@mo-care.com', made_by_name:'Angie Care', made_at:new Date().toISOString(), notified_by:b.notified_by||null,
            checklist:[{ key:'missed_visits', label:'Record the missed visits with the reason', source:'regulation', rule:'19 CSR 15-7.021(18)(L)', when:'Services can\'t be billed in a hospital.', state:'open' }] }); out={ outcome:'paused' }; }
        if(b.action==='care_resume'){ C.state['777']='active'; C.pause=null; C.changes.push({ change_id:'ch2', kind:'resume', effective_date:b.effective_date, made_by_name:'Angie Care', made_at:new Date().toISOString() }); out={ outcome:'resumed' }; }
        if(b.action==='care_end'){ C.state['777']=b.reason==='deceased'?'deceased':'past'; out={ outcome:'ended', sympathy:b.reason==='deceased'?'ops_sym_777':null }; }
        if(b.action==='care_end_date'){ const was='on or before '+C.r500.ended_at; Object.assign(C.r500,{ ended_at:b.effective_date, ended_date_basis:'exact' });
          C.ch500.push({ change_id:'ch9', kind:'end_date', effective_date:b.effective_date, explanation:'Was '+was+'. How we know: '+b.explanation, made_by_name:'Angie Care', made_at:new Date().toISOString() }); out={ outcome:'corrected' }; }
        if(b.action==='care_checklist'){ const ch=C.changes.find(x=>x.change_id===b.change_id); Object.assign(ch.checklist.find(x=>x.key===b.item),{ state:b.state, how:b.how, by_name:'Angie Care', on:b.on }); out={ outcome:'saved' }; }
        return new Response(JSON.stringify(out),{status:200}); }
    } return of(u,o); };
})();
"""
T = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  DATA.ops_settings.client_journey_live=true; window.__as('angie@mo-care.com','Angie Care');
  DATA.leads.push({ id:'R3', client_first_name:'Rhoda', client_last_name:'Real', funding_source:'medicaid', status:'Converted', said_yes_at:'2026-10-01', axiscare_client_id:'777' },
    { id:'R5', client_first_name:'Olive', client_last_name:'Past', status:'Converted', axiscare_client_id:'500' }, { id:'R6', client_first_name:'Gil', client_last_name:'Gone', status:'Converted', axiscare_client_id:'501' });
  const B=()=>document.getElementById('ccCare'), dlg=()=>document.querySelector('.cc-dlg'), C=window.__care;
  await openLeadProfile('R3','summary'); await sleep(500);
  ok('an active client: the care block says Active, with Pause care and End care', /Active/.test(B().innerText) && /Pause care/.test(B().innerText) && /End care/.test(B().innerText) && !/Start a new episode/.test(B().innerText), B().innerText);
  [...B().querySelectorAll('button')].find(b=>/Pause care/.test(b.textContent)).click(); await sleep(150);
  ok('Pause care: why, from when, the follow-up date, who told us', dlg() && dlg().querySelector('#ccR') && dlg().querySelector('#ccD') && dlg().querySelector('#ccF') && dlg().querySelector('#ccN') && /Is care restarting/.test(dlg().innerText), dlg()&&dlg().innerText);
  dlg().querySelector('#ccGo').click(); await sleep(100);
  ok('...nothing is saved without a reason', /Pick the reason/.test(dlg().querySelector('#ccErr').textContent) && !C.calls.some(b=>b.action==='care_pause'));
  dlg().querySelector('#ccR').value='other'; dlg().querySelector('#ccR').dispatchEvent(new Event('change')); dlg().querySelector('#ccGo').click(); await sleep(100);
  ok('...Other needs an explanation', /Explain/.test(dlg().querySelector('#ccErr').textContent) && !dlg().querySelector('#ccWhyReq').hidden);
  dlg().querySelector('#ccR').value='hospital'; dlg().querySelector('#ccF').value=''; dlg().querySelector('#ccGo').click(); await sleep(100);
  ok('...and a follow-up date', /follow-up date is required/.test(dlg().querySelector('#ccErr').textContent));
  const fu=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago'}).format(new Date(Date.now()+5*864e5));
  dlg().querySelector('#ccF').value=fu; dlg().querySelector('#ccN').value='her daughter'; await shot('pause_form'); dlg().querySelector('#ccGo').click(); await sleep(700);
  const pc=C.calls.find(b=>b.action==='care_pause');
  ok('Pause saved through the service with the reason, dates and who told us', pc && pc.reason==='hospital' && pc.followup_date===fu && pc.notified_by==='her daughter' && pc.axiscare_client_id==='777', pc);
  ok('...the profile now says Paused, since when, why and the follow-up date, with Resume, Pause longer and End care', /Paused/.test(B().innerText) && /Hospital stay/.test(B().innerText) && /follow up/.test(B().innerText) && /Resume care/.test(B().innerText) && /Pause longer/.test(B().innerText) && !/Pause care\b/.test(B().innerText.replace('Pause longer','')), B().innerText);
  ok('...with the Medicaid steps as a checklist for a person, citing the regulation', /Medicaid steps for this pause/.test(B().innerText) && /Record the missed visits/.test(B().innerText) && /19 CSR 15-7\.021\(18\)\(L\)/.test(B().innerText) && /the Hub never sends a notice/.test(B().innerText), B().innerText);
  await shot('paused');
  B().querySelector('[data-how="missed_visits"]').value='Noted in AxisCare, visits 10/7 to 10/9'; [...B().querySelectorAll('.cc-ci button')].find(b=>/Done/.test(b.textContent)).click(); await sleep(500);
  ok('...ticking a step records how, by whom', C.calls.some(b=>b.action==='care_checklist'&&b.state==='done'&&/Noted in AxisCare/.test(b.how)) && /all recorded/.test(B().innerText) && /✓ Done by Angie Care/.test(B().querySelector('.cc-check').textContent), B().innerText);
  [...B().querySelectorAll('button')].find(b=>/Resume care/.test(b.textContent)).click(); await sleep(150); dlg().querySelector('#ccGo').click(); await sleep(700);
  ok('Resume: back to Active, and the care history shows the pause and the resume with who and when', /Active/.test(B().innerText) && C.calls.some(b=>b.action==='care_resume') && /Care history/.test(B().innerText), B().innerText);
  [...B().querySelectorAll('button')].find(b=>/End care/.test(b.textContent)).click(); await sleep(150);
  ok('End care: her nine reasons, the effective date (no later than today) and who told us', dlg().querySelector('#ccR').options.length===10 && /Needs exceed our scope/.test(dlg().innerText) && dlg().querySelector('#ccD').max===new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago'}).format(new Date()) && dlg().querySelector('#ccN'), dlg().innerText);
  await shot('end_form');
  dlg().querySelector('#ccR').value='deceased'; dlg().querySelector('#ccGo').click(); await sleep(700);
  ok('...ended (deceased): the profile says Deceased and offers nothing; kept for the record only', /Deceased/.test(B().innerText) && !B().querySelector('button') && /No outreach of any kind/.test(B().innerText), B().innerText);
  await openLeadProfile('R5','summary'); await sleep(500);
  ok('a past client imported from AxisCare: Past, "on or before" the date we first saw them inactive, never an exact date, and no guessed reason', /Past client/.test(B().innerText) && /Care ended on or before [A-Z][a-z]{2} 8, 2026 · exact date not recorded in AxisCare/.test(B().innerText) && /reason not recorded in AxisCare/.test(B().innerText), B().innerText);
  ok('...a Care Coordinator can\'t resume a past client\'s care', !/Resume care/.test(B().innerText));
  /* END DATE FIX (2026-10-08) */
  const fixA=()=>[...B().querySelectorAll('a')].find(a=>/Correct end date/.test(a.textContent));
  ok('end date fix: a past client shows a "Correct end date" link', !!fixA());
  fixA().click(); await sleep(150);
  ok('...the form shows the date now and when care started', /Now: care ended on or before Oct 8, 2026/.test(dlg().innerText) && /Care started Mar 1, 2025/.test(dlg().innerText), dlg().innerText);
  dlg().querySelector('#ccD').value='2026-09-30'; dlg().querySelector('#ccGo').click(); await sleep(150);
  ok('...it asks how you know before saving', /Say how you know the date/.test(dlg().innerText) && !window.__care.calls.some(c=>c.action==='care_end_date'));
  dlg().querySelector('#ccX').value='AxisCare notes'; dlg().querySelector('#ccGo').click(); await sleep(700);
  ok('...saved: the profile says "Care ended Sep 30, 2026", no longer "on or before"', /Care ended Sep 30, 2026/.test(B().innerText) && !/on or before/.test(B().innerText), B().innerText);
  ok('...the care history keeps the old date and how we know', /End date corrected: Was on or before 2026-10-08\. How we know: AxisCare notes/.test(B().querySelector('.cc-hist').textContent), B().querySelector('.cc-hist')&&B().querySelector('.cc-hist').textContent);
  await shot('past');
  window.__as('sam@mo-care.com','Samantha Owner'); await openLeadProfile('R5','summary'); await sleep(500);
  ok('...an owner can, on purpose: the button says Resume care, never "new episode"', /Resume care/.test(B().innerText) && !/episode/i.test(B().innerText));
  [...B().querySelectorAll('button')].find(b=>/Resume care/.test(b.textContent)).click(); await sleep(150);
  ok('...the form says they were served before and the old history stays', /was served before/.test(dlg().innerText) && /earlier history stays/.test(dlg().innerText)); dlg().querySelector('#ccNo').click();
  await openLeadProfile('R6','summary'); await sleep(500);
  ok('a deceased client: Deceased, no buttons at all, not even for an owner (only the Correct end date link)', /Deceased/.test(B().innerText) && !B().querySelector('button') && /Correct end date/.test(B().innerText), B().innerText);
  await shot('deceased');
  /* the AxisCare status card opens the same forms */
  const ofrom=sb.from.bind(sb); sb.from=t=>{ if(t==='client_status_review'||t==='person_identity'){ const row=t==='client_status_review'?{ review_id:'11111111-1111-4111-8111-111111111111', axiscare_client_id:'777', person_id:'p1', old_label:'Active', new_label:'Inactive', observed_at:new Date().toISOString(), status:'open' }:{ display_name:'Rhoda Real' };
      const pr=new Proxy(function(){},{ get(_,k){ if(k==='maybeSingle'||k==='single') return ()=>Promise.resolve({ data:row, error:null }); if(k==='then') return (a,b)=>Promise.resolve({ data:[row], error:null }).then(a,b); return ()=>pr; } }); return pr; } return ofrom(t); };
  window.__care.state['777']='active'; window.__as('angie@mo-care.com','Angie Care');
  await csrOpen('11111111-1111-4111-8111-111111111111'); await sleep(300);
  const rad=document.querySelector('input[name=csrD][value=care_ended]'); rad.checked=true; rad.dispatchEvent(new Event('change')); document.querySelector('#csrGo').click(); await sleep(500);
  ok('AxisCare status card → "Care ended" opens End care (the reason is captured; nothing ends from AxisCare alone)', dlg() && /End care · Rhoda Real/.test(dlg().innerText) && /Answers the AxisCare status change/.test(dlg().innerText), dlg()&&dlg().innerText);
  dlg().querySelector('#ccR').value='other_provider'; dlg().querySelector('#ccGo').click(); await sleep(500);
  ok('...and the end carries the review, so the card is answered', C.calls.some(b=>b.action==='care_end'&&b.review_id==='11111111-1111-4111-8111-111111111111'&&b.reason==='other_provider'));
  sb.from=ofrom;
  /* Paused on the Clients list */
  window.CJ_PAUSED=[{ axiscare_client_id:'777', followup_date:'2026-10-20', reason:'hospital' }];
  CL.roster=[{ axiscare_client_id:'777', client_name:'Rhoda Real', role_status:'active' }, { axiscare_client_id:'888', client_name:'Ann Active', role_status:'active' }]; CL.issues=[]; CL.filter='Paused'; CL.picked=true;
  switchTab('clientsboard'); renderClientsBoard(); await sleep(200);
  const CB=document.getElementById('clBoard');
  ok('Clients list: a Paused filter shows paused clients, with their follow-up date', /Rhoda Real/.test(CB.innerText) && /Paused · follow up Oct 20/.test(CB.innerText) && !/Ann Active/.test(CB.innerText), CB.innerText.slice(0,400));
  ok('My Work knows the two new card kinds', OPS_KINDS.pause_followup && OPS_KINDS.sympathy);
  return R; }"""
shots = []
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1280, 'height': 1000}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    pg.goto('http://localhost:8765/index.html?proof=care'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB); pg.evaluate('s=>(0,eval)(s)', DATA); pg.evaluate('s=>(0,eval)(s)', FAKE)
    pg.evaluate("()=>{ window.shot=async(n)=>{ window.__shot=n; }; }")
    R = pg.evaluate(T.replace('await shot(', 'await window.shot('))
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

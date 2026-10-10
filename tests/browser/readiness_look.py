"""Slice 3b + Slice 5: the one new-hire readiness card (and the final approval block), offline, against a stand-in caregiver-journey server. python3 tests/browser/readiness_look.py <out dir>
Needs a static server on 8768 (python3 -m http.server 8768) so the page has a real origin."""
from playwright.sync_api import sync_playwright
import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp'
CODE = open(os.path.join(HERE, '..', '..', 'caregiver-readiness.js')).read()
T = r"""
async(CODE)=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  window.__calls=[]; window.__alerts=[]; window.alert=m=>__alerts.push(String(m)); window.confirm=()=>true; window.prompt=()=>'verified by the office';
  const def=(key,title,stage,proof,permission,extra={})=>({ key, title, stage, proof, permission, required:true, ...extra });
  let advanced=false, isOwner=false, mayAdvance=false, mayWork=false, A=null;   /* A: the slice 5 approve state the stand-in answers with */
  const view=()=>{ const rows=[
      { key:'cg.offer.signed', def:def('cg.offer.signed','Offer letter and position description signed','offer','verified','hub'), st:{ state:'complete', completed_at:'2026-10-09T20:00:00Z', completed_by_name:'The Hub (verified)', evidence:{ offer_signed_at:'x' } }, status:'complete', owner:{ role:'hub' } },
      { key:'cg.step1.application', def:def('cg.step1.application','Employee Application signed','step1','verified','hub'), st:{ state:'complete', completed_at:'2026-10-10T01:00:00Z', completed_by_name:'The Hub (verified)', evidence:{ fingerprint:'751522b8a4921234' } }, status:'complete', owner:{ role:'hub' } },
      { key:'cg.check.edl', def:def('cg.check.edl','Employee Disqualification List check','screening','proof','screening',{ expires_after_days:30 }), st:{ state:'complete', completed_at:'2026-08-01T00:00:00Z', completed_by_name:'The Hub (verified)', evidence:{ result:'Clear', document:'bgcheck/1/edl.pdf' } }, status:'attention', expired:'2026-08-30', attention:'Expired on 2026-08-30: due again', owner:{ email:'sally@x.com', role:'staffing_coordinator' } },
      { key:'cg.check.oig', def:def('cg.check.oig','OIG exclusion check (LEIE)','screening','proof','screening'), st:{ state:'blocked', blocked_reason:'Flagged: see the background review before anything else moves.' }, status:'blocked', why:'Flagged', owner:{ email:'sally@x.com', role:'staffing_coordinator' } },
      { key:'cg.approve.advance', def:def('cg.approve.advance','Approved to advance to orientation','approval','confirmed','advance'), st: advanced ? { state:'complete', completed_at:'2026-10-10T02:00:00Z', completed_by_name:'Samantha' } : { state:'open' }, status: advanced ? 'complete' : 'ready', owner:{ role:'owner' } },
      { key:'cg.approve.work', def:def('cg.approve.work','Approved to Work (owners only)','ready','confirmed','work'), st:{ state:'open' }, status:'later', why:'After: Approved to advance to orientation', owner:{ role:'owner' } },
    ];
    const next=rows.find(r=>['ready','attention','blocked'].includes(r.status));
    return { rows, next, complete:false, stage:'approval', stageLabel:'Approval', rail:[{key:'offer',label:'Offer',state:'done'},{key:'step1',label:'Step 1',state:'done'},{key:'screening',label:'Screening',state:'stopped'},{key:'approval',label:'Approval',state:'now'},{key:'ready',label:'Ready',state:'todo'},{key:'active',label:'Active',state:'todo'}] }; };
  const approve=()=>A||{ ready_for_final:false, approved:false, axiscare:{state:'pending'}, text:null, blocked:['OIG exclusion check (LEIE)'], locked:true, lock_why:'Scheduling stays locked until Approved to Work and AxisCare reads back Active.', level_of_care:{ level:'Level 1', source:'the default: nothing higher is recorded' }, may_approve_work:mayWork, may_retry:false, switches:{ axiscare_live:false, text_live:false } };
  let mayExport=false;
  const answer=()=>({ ok:true, approve:approve(), may_export:mayExport, journey:{ journey_id:'j-1', client_name:'Ava Lee', status:'open' }, steps:[], view:view(), events:[{ at:'2026-10-10T01:00:00Z', kind:'verified', step_key:'cg.step1.application', actor_name:'The Hub' }], may:{ 'cg.approve.advance':mayAdvance, 'cg.approve.work':false, 'cg.check.edl':false }, is_owner:isOwner, facts:{ dates:{ orientation:null, axiscare_hire:'2026-10-05', differ:false } } });
  window.sb={ functions:{ invoke:async(fn,o)=>{ const b=(o&&o.body)||{}; __calls.push({fn,b}); if(fn!=='caregiver-journey') return { data:null, error:{ message:'unexpected '+fn } };
    if(b.action==='get') return { data:answer(), error:null };
    if(b.action==='confirm'){ if(!mayAdvance) return { data:{ error:'Only a person on the Approve to Advance list may approve this.' }, error:null }; advanced=true; return { data:answer(), error:null }; }
    if(b.action==='not_needed'){ if(!isOwner) return { data:{ error:'Only an owner may mark a requirement not needed.' }, error:null }; return { data:answer(), error:null }; }
    if(b.action==='approve_work'){ if(!mayWork) return { data:{ error:'Only a person on the Approve to Work list (owners) may approve to work.' }, error:null }; A={ ...approve(), ready_for_final:false, approved:true, approved_at:'2026-10-14T15:00:00Z', approved_by:'Samantha', axiscare:{ state:'failed', detail:'Approval recorded, AxisCare update failed: AxisCare answered 400' }, may_retry:true, locked:true }; return { data:answer(), error:null }; }
    if(b.action==='retry_axiscare'){ A={ ...approve(), axiscare:{ state:'confirmed', label:'Active', at:'2026-10-14T15:02:00Z' }, text:{ state:'sent', at:'2026-10-14T15:02:05Z' }, may_retry:false, locked:false, lock_why:null }; return { data:answer(), error:null }; }
    if(b.action==='list') return { data:{ ok:true, may_approve_work:mayWork, rows:[{ journey_id:'j-1', offer_id:'o-1', name:'Ava Lee', ready_for_final:true, approved_to_work:false, axiscare:'pending', locked:true }, { journey_id:'j-2', offer_id:'o-2', name:'Ben Ray', ready_for_final:false, approved_to_work:true, axiscare:'failed', locked:true }, { journey_id:'j-3', offer_id:'o-3', name:'Cy Lo', ready_for_final:false, approved_to_work:false, axiscare:'pending', locked:true }] }, error:null };
    return { data:{ error:'Unknown action.' }, error:null }; } } };
  const sc=document.createElement('script'); sc.textContent=CODE; document.head.appendChild(sc); await sleep(30);
  ok('the row chip exists and names the card', /Readiness/.test(CRX.chip('o-1')) && /CRX.open/.test(CRX.chip('o-1')));
  await CRX.open('o-1','Ava Lee'); await sleep(120);
  let t=document.getElementById('crBody').innerText;
  ok('the card: name, Not approved to work, the rail with Screening stopped and Approval now, the next move with its owner', /Readiness · Ava Lee/.test(t) && /Not approved to work/.test(t) && /SCREENING/.test(t.toUpperCase()) && /Next: Employee Disqualification List check · sally@x.com/.test(t), t.slice(0,500));
  ok('rows: done with time and verifier, expired EDL flagged as due again, OIG blocked with its reason, Approve to Work later', /Done · .*The Hub \(verified\)/.test(t) && /Expired on 2026-08-30: due again/.test(t) && /Flagged: see the background review/.test(t) && /After: Approved to advance to orientation/.test(t), t.slice(0,900));
  ok('evidence is shown as words, never a number: the signed form fingerprint and the document on file', /signed form 751522b8a492/.test(t) && /document on file/.test(t));
  const btns=()=>[...document.querySelectorAll('#crBody button')].map(b=>b.textContent.trim());
  ok('a coordinator not on the Advance list sees no Confirm button; nobody sees Not needed (owners only)', !btns().includes('Confirm') && !btns().includes('Not needed'), btns());
  ok('the dates line: employment start (orientation) not yet, AxisCare hire date shown', /Employment start \(orientation completed\): not yet · AxisCare hire date: 2026-10-05/.test(t));
  CRX.close(); mayAdvance=true; isOwner=true; await CRX.open('o-1','Ava Lee'); await sleep(120);
  t=document.getElementById('crBody').innerText;
  ok('on the Advance list and an owner: one Confirm (the ready confirmed row), Not needed on open rows', btns().filter(x=>x==='Confirm').length===1 && btns().includes('Not needed'), btns());
  const btn=[...document.querySelectorAll('#crBody button')].find(b=>b.textContent==='Confirm'); btn.click(); await sleep(150);
  t=document.getElementById('crBody').innerText;
  ok('Confirm asks the server for that row and the card re-draws it as done by Samantha', __calls.some(c=>c.b.action==='confirm' && c.b.step_key==='cg.approve.advance' && c.b.journey_id==='j-1') && /Approved to advance to orientation[\s\S]*Done · .*Samantha/.test(t), t.slice(0,700));
  ok('the history is on the card', /History \(1\)/.test(t));
  ok('no em dash anywhere it drew', !/—/.test(t));
  /* ═══ SLICE 5: the final approval block ═══ */
  ok('not ready: the Final approval block says what blocks, Level 1 by default, scheduling locked; no Approve button for anyone', /Final approval/.test(t) && /Level of Care: Level 1/.test(t) && /Scheduling: locked/.test(t) && /Not ready: blocked on OIG exclusion check/.test(t) && !btns().some(x=>/Approve to Work/.test(x)), t.slice(0,900));
  CRX.close(); A={ ...approve(), ready_for_final:true, blocked:[] }; mayWork=false; await CRX.open('o-1','Ava Lee'); await sleep(120); t=document.getElementById('crBody').innerText;
  ok('ready, a coordinator: the pill says Ready for final approval, the block says only the Approve to Work list may press, no button', /Ready for final approval/.test(t) && /Only a person on the Approve to Work list/.test(t) && !btns().some(x=>/Approve to Work/.test(x)), [t.slice(0,600), btns()]);
  CRX.close(); mayWork=true; A={ ...approve(), ready_for_final:true, blocked:[], may_approve_work:true }; await CRX.open('o-1','Ava Lee'); await sleep(120); t=document.getElementById('crBody').innerText;
  ok('ready, on the Work list: the Approve to Work button, the practice warning (switch off); never a generic Confirm on the Approve to Work row', btns().some(x=>/Approve to Work/.test(x)) && /AxisCare update switch is off/.test(t) && btns().filter(x=>x==='Confirm').length===0, [btns(), t.slice(0,800)]);
  const ab=[...document.querySelectorAll('#crBody button')].find(b=>/Approve to Work/.test(b.textContent)); ab.click(); await sleep(150); t=document.getElementById('crBody').innerText;
  ok('the press asks the server for approve_work (nothing else) and the card re-draws: Approval recorded, AxisCare update failed, with Retry; still locked; Approved to Work NOT shown', __calls.some(c=>c.b.action==='approve_work' && c.b.journey_id==='j-1') && /Approval recorded, AxisCare update failed/.test(t) && /AxisCare answered 400/.test(t) && btns().some(x=>/Retry the AxisCare update/.test(x)) && /Scheduling: locked/.test(t) && !/Approved to Work Oct/.test(t), t.slice(0,900));
  const rb=[...document.querySelectorAll('#crBody button')].find(b=>/Retry/.test(b.textContent)); rb.click(); await sleep(150); t=document.getElementById('crBody').innerText;
  ok('Retry asks the server; after the read-back the pill says Approved to Work with the date, AxisCare read back Active, the text sent, scheduling unlocked, no Retry', __calls.some(c=>c.b.action==='retry_axiscare') && /Approved to Work Oct 14, 2026/.test(t) && /read back Active/.test(t) && /cleared text sent/.test(t) && /Scheduling: unlocked/.test(t) && !btns().some(x=>/Retry/.test(x)), t.slice(0,900));
  ok('the owner never sees Not needed on the Approve to Work or AxisCare rows', !btns().some(x=>x==='Not needed') || ![...document.querySelectorAll('#crBody button')].some(b=>b.textContent==='Not needed' && /approve\.work|axiscare\.active/.test(b.getAttribute('onclick')||'')));
  /* the Orientations tab list */
  let rows=CRX.list(); await sleep(50); rows=CRX.list(); const fl=CRX.finalListHtml(rows);
  ok('the Ready for final approval list: Ava (ready) and Ben (approval recorded, AxisCare failed) with a Readiness chip each; Cy (neither) left out', /Ready for final approval/.test(fl) && /Ava Lee/.test(fl) && /Ben Ray/.test(fl) && /AxisCare update failed/.test(fl) && !/Cy Lo/.test(fl) && (fl.match(/CRX\.open/g)||[]).length===2, fl.slice(0,600));
  ok('the list says what to do for the Work list member', /Open the card and press Approve to Work/.test(fl));
  ok('an empty list draws nothing', CRX.finalListHtml([])==='');
  ok('no em dash anywhere (slice 5)', !/—/.test(t) && !/—/.test(fl));
  /* ═══ SLICE 6: the personnel-file export button ═══ */
  ok('no export button for a person not on the Audit export list', !btns().some(x=>/Personnel file/.test(x)), btns());
  CRX.close(); mayExport=true; await CRX.open('o-1','Ava Lee'); await sleep(120);
  ok('on the Audit export list (or an owner): the Personnel file (PDF) button', btns().some(x=>/Personnel file \(PDF\)/.test(x)), btns());
  window.prompt=()=>'DHSS review';
  window.sb.functions.invoke=async(fn,o)=>{ __calls.push({fn,b:(o&&o.body)||{}}); if(fn==='caregiver-export') return { data:{ ok:true, url:'https://signed/pdf', expires_in:300, proofs:[{ label:'OIG exclusion check (LEIE)', url:'https://signed/oig' }, { label:'CNA or HHA credential verified', url:null }] }, error:null }; return { data:answer(), error:null }; };
  const eb=[...document.querySelectorAll('#crBody button')].find(b=>/Personnel file/.test(b.textContent)); eb.click(); await sleep(150); t=document.getElementById('crBody').innerText;
  ok('the press asks caregiver-export with the reason and this card, then shows the five-minute links and the proofs (one without a link says so)', __calls.some(c=>c.fn==='caregiver-export' && c.b.action==='export' && c.b.reason==='DHSS review' && c.b.journey_id==='j-1') && /Personnel file ready/.test(t) && /open the PDF/.test(t) && /OIG exclusion check/.test(t) && /no link/.test(t), t.slice(-500));
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1100, 'height': 1100})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://127.0.0.1:8768/tests/browser/'); pg.wait_for_timeout(200)
    pg.evaluate("document.body.innerHTML=''; const st=document.createElement('style'); st.textContent='.ibtn{font:inherit;font-size:.8rem;padding:.3rem .6rem;border:1px solid #d9d4c8;border-radius:8px;background:#fff;cursor:pointer}body{font-family:-apple-system,sans-serif}'; document.head.appendChild(st)")
    R = pg.evaluate(T, CODE)
    pg.screenshot(path=os.path.join(OUT, 'readiness_card.png'), full_page=True)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

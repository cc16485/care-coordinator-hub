"""Interviewer observations (2026-10-13, her "yes to all" + "build"): the same section on the phone interview and the Hub's
Interview & outcome card, the family reflection gate before an outcome, Save notes, and the profile's Interview tab.
Offline, made-up applicant; every Supabase answer is faked; nothing is saved or sent. (python3 tests/browser/interview_obs_look.py)"""
from playwright.sync_api import sync_playwright
import os
PORT = os.environ.get('PORT', '8765')
FAKE = r"""
  const APID='0b7e6a1c-1111-4222-8333-444455556666';
  window.__U=[]; window.__DB={ job_applicants:[{ id:APID, first_name:'Jordan', last_name:'Ellis', position:'caregiver', status:'new', post_interview:{ notes:'from before', script:{} } }],
    interview_questions:[{ id:'q1', position:'caregiver', section:'Your story', sort:1, question:'Tell me about yourself', active:true }] };
  sb.from=(t)=>{ const f=[]; let up=null; const b={ select(){return b;}, order(){return b;}, limit(){return b;}, in(){return b;},
      eq(c,v){ f.push([c,v]); return b; }, update(p){ up=p; window.__U.push([t,JSON.parse(JSON.stringify(p))]); const row=(window.__DB[t]||[])[0]; if(row) Object.assign(row,p); return b; },
      maybeSingle(){ return b.then(x=>({data:(x.data||[])[0]||null,error:null})); },
      then(okf){ if(up) return Promise.resolve({data:null,error:null}).then(okf); let d=(window.__DB[t]||[]).slice(); f.forEach(([c,v])=>{ d=d.filter(x=>x[c]===undefined||String(x[c])===String(v)); }); return Promise.resolve({data:JSON.parse(JSON.stringify(d)),error:null}).then(okf); } }; return b; };
  sb.rpc=async()=>({data:null,error:null});
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Test', shift:'day' };");
"""
PHONE = r"""
async()=>{ const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
""" + FAKE + r"""
  window.recMount=()=>{}; window.apDecisionOffer=async()=>{ window.__DEC=true; };
  try{ localStorage.clear(); }catch(e){}
  DATA.coordinator_staff=[{ email:'krystal@mo-care.com', name:'Krystal Test' }]; DATA.ops_items=[];
  phStart(); await sleep(100);
  document.querySelector('.ph-tabs [data-v="find"]').click(); await sleep(100);
  document.getElementById('phFindBody').innerHTML='<button data-ivopen="'+APID+'">open</button>';
  document.querySelector('[data-ivopen]').click(); await sleep(400);
  const ob=document.getElementById('phIvObs'), body=()=>document.getElementById('phIvBody');
  ok('phone: the observations section is on the interview, with the guardrail and all 7 categories', ob && /Interviewer observations/i.test(ob.innerText) && /Not appearance preferences/.test(ob.innerText) && ob.querySelectorAll('details.ob-cat').length===7 && /Care situations/i.test(ob.innerText), ob && ob.innerText.slice(0,400));
  ok('...the consent line is in Say first', /written out by software and summarized to help me review it/.test(body().innerText));
  ob.querySelector('[data-obp="Arrived early"]').click(); ob.querySelector('[data-obp="Knows what to do after a fall"]').click(); await sleep(50);
  ok('...a quick pick turns on', ob.querySelector('[data-obp="Arrived early"]').classList.contains('on'));
  ob.querySelector('[data-oba="boundaries"]').click(); await sleep(60);
  const nt=ob.querySelector('[data-obn="boundaries"]'); nt.value='Named a past client and her street.'; nt.dispatchEvent(new Event('input',{bubbles:true})); await sleep(400);
  ok('...+ Add an observation opens a note box with the time, and typing is kept on this phone', nt && /Observation · /.test(ob.innerText) && /Named a past client/.test(localStorage.getItem('cc_iv_'+APID)||''), localStorage.getItem('cc_iv_'+APID));
  /* the reflection gate */
  let alerted=''; window.alert=m=>{ alerted=m; }; window.prompt=()=>'not a fit';
  body().querySelector('[data-iv="declined"]').click(); await sleep(200);
  ok('Not hiring without the family reflection: stopped, says what is needed, nothing saved', /Answer the reflection first/.test(alerted) && !window.__U.some(u=>u[1].status), [alerted, window.__U]);
  ob.querySelector('[data-obf="unsure"]').click(); alerted=''; body().querySelector('[data-iv="declined"]').click(); await sleep(200);
  ok('...an answer without why: still stopped', /Say why/.test(alerted), alerted);
  const w=ob.querySelector('[data-obw]'); w.value='Warm, but left a client alone.'; w.dispatchEvent(new Event('input',{bubbles:true}));
  const o=ob.querySelector('[data-obo]'); o.value='Engaged the whole time.'; o.dispatchEvent(new Event('input',{bubbles:true})); await sleep(50);
  body().querySelector('[data-iv="save"]').click(); await sleep(300);
  const saved=window.__DB.job_applicants[0].post_interview;
  const O=saved.observations||{};
  ok('Save: observations go on their record (picks, the note, family answer and why, overall, who), old notes kept', O.cats && O.cats.punctual.picks[0]==='Arrived early' && O.cats.care.picks[0]==='Knows what to do after a fall' && O.cats.boundaries.notes[0].text==='Named a past client and her street.' && O.family.answer==='unsure' && /left a client alone/.test(O.family.why) && O.overall==='Engaged the whole time.' && O.by==='Krystal Test' && saved.notes==='from before', saved);
  ok('...an empty category is not stored', !O.cats.communication);
  body().querySelector('[data-iv="declined"]').click(); await sleep(400);
  ok('with the reflection done, Not hiring goes ahead (and the message step is offered)', window.__DB.job_applicants[0].status==='declined' && window.__DEC===true, window.__DB.job_applicants[0].status);
  return R; }
"""
DESK = r"""
async()=>{ const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
""" + FAKE + r"""
  try{ localStorage.clear(); }catch(e){}
  window.apOpenProfile=()=>{}; window.recMount=()=>{}; window.apMatchMount=()=>{}; window.apLoad=async()=>{}; window.apDecisionOffer=async()=>{ window.__DEC=true; }; window.apToOffer=()=>{};
  AP_ROWS.length=0; AP_ROWS.push(JSON.parse(JSON.stringify(window.__DB.job_applicants[0])));
  IQ.length=0; IQ.push({ id:'q1', question:'Tell me about yourself', section:'Your story' });
  await apInterview(APID); await sleep(150);
  const ob=document.getElementById('apIntObs');
  ok('Hub: Interview & outcome has the same section, every category open', ob && ob.querySelectorAll('details.ob-cat[open]').length===7 && /Would I feel comfortable assigning this person/.test(ob.innerText), ob && ob.innerText.slice(0,300));
  ob.querySelector('[data-obp="Listened carefully"]').click();
  ob.querySelector('[data-obf="yes"]').click(); await sleep(50);
  let alerted=''; window.alert=m=>{ alerted=m; }; window.prompt=()=>'x';
  const btn=document.createElement('button');
  await apOutcome('pool', btn);
  ok('Candidate pool with Yes but no why: stopped, nothing saved', /Say why/.test(alerted) && !window.__U.length, [alerted, window.__U]);
  const w=ob.querySelector('[data-obw]'); w.value='Patient and kind in every example.'; w.dispatchEvent(new Event('input',{bubbles:true})); await sleep(500);
  ok('...typing is kept on this computer', /Patient and kind/.test(localStorage.getItem('cc_ivd_'+APID)||''));
  await apIntSaveNotes(btn); await sleep(100);
  const P=window.__DB.job_applicants[0];
  ok('Save notes: on their record without an outcome, status unchanged, earlier notes kept', P.post_interview.observations.family.why==='Patient and kind in every example.' && P.post_interview.observations.cats.communication.picks[0]==='Listened carefully' && P.status==='new' && /Saved to their record/.test(document.getElementById('apIntSaid').innerText), P);
  ok('...the draft on this computer is cleared once saved', !localStorage.getItem('cc_ivd_'+APID));
  const html=apProfInterview({ id:APID, post_interview:P.post_interview });
  ok('the profile Interview tab shows Interviewer observations: picks, the family answer and why, who saved', /Interviewer observations/.test(html) && /Listened carefully/.test(html) && /Family question/.test(html) && /Patient and kind/.test(html) && /Krystal Test/.test(html), html.slice(-900));
  ok('...labelled a reflection, not a score', /A reflection, not a score/.test(html));
  /* an outcome with everything in place */
  const R0=window.__U.length; await apOutcome('hired', btn); await sleep(100);
  ok('Hire with the reflection done: saved with the observations', window.__U.slice(R0).some(u=>u[0]==='job_applicants' && u[1].status==='hired' && u[1].post_interview.observations.family.answer==='yes'), window.__U.slice(R0));
  ok('the recorder\'s consent note carries the approved line', /written out by software and summarized to help me review it/.test(document.documentElement.innerHTML));
  return R; }
"""
with sync_playwright() as pw:
    b = pw.chromium.launch()
    block = lambda r: r.abort() if ('supabase.co' in r.request.url or 'leadconnectorhq' in r.request.url or 'hub.mo-care.com' in r.request.url) else r.continue_()
    errs = []
    pg = b.new_page(viewport={'width': 375, 'height': 812}, device_scale_factor=2); pg.route('**/*', block); pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(f'http://localhost:{PORT}/index.html?m=1'); pg.wait_for_timeout(1500)
    R = pg.evaluate(PHONE)
    pg.evaluate("()=>document.getElementById('phIvObs').scrollIntoView()"); pg.wait_for_timeout(200)
    pg.screenshot(path='tests/browser/interview_obs_phone.png')
    d = b.new_page(viewport={'width': 1280, 'height': 900}); d.route('**/*', block); d.on('pageerror', lambda e: errs.append(str(e)[:200]))
    d.goto(f'http://localhost:{PORT}/index.html'); d.wait_for_timeout(1500)
    R += d.evaluate(DESK)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, dd in R: print(s_, '·', n, '' if s_ == 'PASS' else dd)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

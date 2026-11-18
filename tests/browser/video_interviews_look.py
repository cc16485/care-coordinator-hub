"""Katlin video interviews, Stage A (2026-11-17): Interview hours shows the Video link button and chip; the Hub's interview
card shows the driver's license check only for a video interview; not Matched holds Hire for an owner and sends one task.
Offline, made-up applicant; the page is served from disk; every Supabase answer is faked; nothing is saved or sent.
python3 tests/browser/video_interviews_look.py"""
from playwright.sync_api import sync_playwright
import os, mimetypes
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
T = r"""
async()=>{ const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const APID='0b7e6a1c-1111-4222-8333-444455556666', APIP='0b7e6a1c-1111-4222-8333-444455550000';
  window.__U=[]; window.__DB={ job_applicants:[{ id:APID, first_name:'Jordan', last_name:'Ellis', position:'caregiver', status:'new', post_interview:{ script:{} } },
      { id:APIP, first_name:'Pat', last_name:'Lane', position:'caregiver', status:'new', post_interview:{ script:{} } }],
    coordinators:[{ id:'co-v', name:'Katlin', active:true, meeting_link:'https://meet.google.com/abc-defg-hij' }, { id:'co-k', name:'Krystal', active:true, meeting_link:null }],
    coordinator_availability:[], activity_types:[{ key:'interview', label:'Interview', minutes:30 }], scheduling_settings:[{ id:1, day_start:'06:00', day_end:'21:00' }], coordinator_busy:[], interview_questions:[] };
  sb.from=(t)=>{ const f=[]; let up=null; const b={ select(){return b;}, order(){return b;}, limit(){return b;}, in(){return b;}, gte(){return b;}, lt(){return b;},
      eq(c,v){ f.push([c,v]); return b; }, update(p){ up=p; window.__U.push([t,JSON.parse(JSON.stringify(p))]); return b; }, insert(){ return Promise.resolve({error:null}); },
      maybeSingle(){ return b.then(x=>({data:(x.data||[])[0]||null,error:null})); },
      then(okf){ let d=(window.__DB[t]||[]); f.forEach(([c,v])=>{ d=d.filter(x=>x[c]===undefined||String(x[c])===String(v)); });
        if(up){ d.forEach(r=>Object.assign(r,up)); return Promise.resolve({data:null,error:null}).then(okf); }
        return Promise.resolve({data:JSON.parse(JSON.stringify(d)),error:null}).then(okf); } }; return b; };
  sb.rpc=async()=>({data:null,error:null});
  (0,eval)("ME={ email:'katlin@mo-care.com', name:'Katlin', shift:'day' };");
  window.ccIsOwner=()=>false; (0,eval)('ccIsOwner=window.ccIsOwner');
  window.ccActor=()=>({ email:'katlin@mo-care.com', name:'Katlin' }); (0,eval)('ccActor=window.ccActor');
  const TASKS=[]; window.persist=async(k,t)=>{ TASKS.push([k,t]); }; (0,eval)('persist=window.persist');
  try{ localStorage.clear(); }catch(e){}
  ok('video-interviews.js loaded', !!window.VI);
  /* Interview hours */
  let box=document.getElementById('ivHosts'); if(!box){ box=document.createElement('div'); box.id='ivHosts'; document.body.appendChild(box); }
  await ivLoad(); await sleep(100);
  const ht=box.innerText;
  ok('Interview hours: Katlin shows "Video interviews" and a Video link button', /Katlin[\s\S]*Video interviews/.test(ht) && /Video link/.test(ht), ht.slice(0,400));
  ok('...Krystal (no link) shows Add video link, one Video chip only', /Add video link/.test(ht) && (ht.match(/Video interviews/g)||[]).length===1, ht.slice(0,400));
  window.ccPrompt=async()=>'https://meet.google.com/new-link-xyz'; (0,eval)('ccPrompt=window.ccPrompt');
  await VI.setLink('co-k'); await sleep(50);
  ok('saving a link for Krystal writes coordinators.meeting_link', window.__U.some(u=>u[0]==='coordinators' && u[1].meeting_link==='https://meet.google.com/new-link-xyz'), window.__U);
  window.__DB.coordinators[1].meeting_link=null;
  /* the interview card */
  window.apOpenProfile=()=>{}; window.recMount=()=>{}; window.apMatchMount=()=>{}; window.apLoad=async()=>{}; window.apDecisionOffer=async()=>{}; window.apToOffer=()=>{ window.__OFFER=true; };
  (0,eval)('apOpenProfile=window.apOpenProfile; recMount=window.recMount; apMatchMount=window.apMatchMount; apLoad=window.apLoad; apDecisionOffer=window.apDecisionOffer; apToOffer=window.apToOffer');
  AP_ROWS.length=0; window.__DB.job_applicants.forEach(r=>AP_ROWS.push(JSON.parse(JSON.stringify(r))));
  AP_BOOK[APID]={ applicant_id:APID, coordinator_id:'co-v', status:'booked' }; AP_BOOK[APIP]={ applicant_id:APIP, coordinator_id:'co-k', status:'booked' };
  let asked=''; window.apAsk=async(o)=>{ asked=o.title+' '+o.text; return true; }; (0,eval)('apAsk=window.apAsk');
  if(window.OBS) OBS.missing=()=>null;   /* the family reflection gate is tested in interview_obs_look.py */
  const btn=document.createElement('button');
  await apInterview(APIP); await sleep(300);
  ok('in-person interview: no license check on the card', document.getElementById('apIntIdCheck').innerText.trim()==='');
  await apInterview(APID); await sleep(300);
  const ic=document.getElementById('apIntIdCheck');
  ok("video interview: the Driver's license check with three choices", /Driver's license check/.test(ic.innerText) && ic.querySelectorAll('input[name=apIntIdCk]').length===3, ic.innerText);
  ok('...it sits above "How did it go?"', !!(ic.compareDocumentPosition(document.getElementById('apIntNotes')) & Node.DOCUMENT_POSITION_FOLLOWING));
  const before=window.__U.length;
  await apOutcome('hired', btn); await sleep(100);
  ok('Hire before marking it: stopped, nothing saved', /Mark the driver's license check first/.test(asked) && !window.__U.slice(before).some(u=>u[0]==='job_applicants'), asked);
  ic.querySelector('input[value=wrong]').click(); await sleep(30); asked='';
  await apOutcome('hired', btn); await sleep(100);
  ok("Didn't look right + Hire (Katlin is not an owner): held for Samantha, nothing saved", /Samantha looks before an offer/.test(asked) && !window.__U.slice(before).some(u=>u[0]==='job_applicants' && u[1].status), asked);
  await apIntSaveNotes(btn); await sleep(150);
  const P=window.__DB.job_applicants[0].post_interview||{};
  ok('Save notes keeps the check on their record (choice, who, review flag)', P.id_check==='wrong' && P.id_review===true && P.id_check_by==='Katlin', P);
  ok('...and one task goes to the owners', TASKS.length===1 && TASKS[0][0]==='staffing_tasks' && TASKS[0][1].direction==='to_owners' && /Jordan Ellis/.test(TASKS[0][1].message), TASKS.map(t=>t[1].message));
  await apOutcome('pool', btn); await sleep(150);
  ok('Candidate pool still goes ahead (never an automatic no), no second task', window.__DB.job_applicants[0].status==='pool' && TASKS.length===1, [window.__DB.job_applicants[0].status, TASKS.length, asked]);
  return R; }
"""
def serve(route):
    path = route.request.url.split('://', 1)[1].split('/', 1)[1].split('?')[0] or 'index.html'
    f = os.path.join(ROOT, path)
    if os.path.isfile(f):
        route.fulfill(path=f, content_type=mimetypes.guess_type(f)[0] or 'application/octet-stream')
    else:
        route.fulfill(status=404, body='')
with sync_playwright() as pw:
    b = pw.chromium.launch()
    errs = []
    d = b.new_page(viewport={'width': 1280, 'height': 900})
    d.route('**/*', lambda r: serve(r) if r.request.url.startswith('http://hub.test/') else (r.abort() if ('supabase.co' in r.request.url or 'leadconnectorhq' in r.request.url) else r.continue_()))
    d.on('pageerror', lambda e: errs.append(str(e)[:200]))
    d.goto('http://hub.test/index.html?proof=video'); d.wait_for_timeout(1500)
    R = d.evaluate(T)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, dd in R: print(s_, '·', n, '' if s_ == 'PASS' else dd)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

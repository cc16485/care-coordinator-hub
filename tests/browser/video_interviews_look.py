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
  ok('Interview hours: Katlin shows "Video link set" and a Video link button', /Katlin[\s\S]*Video link set/.test(ht) && /Video link/.test(ht), ht.slice(0,400));
  ok('...Krystal (no link) shows Add video link, one Video chip only', /Add video link/.test(ht) && (ht.match(/Video link set/g)||[]).length===1, ht.slice(0,400));
  window.ccPrompt=async()=>'https://meet.google.com/new-link-xyz'; (0,eval)('ccPrompt=window.ccPrompt');
  await VI.setLink('co-k'); await sleep(50);
  ok('saving a link for Krystal writes coordinators.meeting_link', window.__U.some(u=>u[0]==='coordinators' && u[1].meeting_link==='https://meet.google.com/new-link-xyz'), window.__U);
  window.__DB.coordinators[1].meeting_link=null; await ivLoad(); await sleep(50);
  /* 1541: add hours with the Video tick, Monday to Friday */
  const INS=[]; const realFrom=sb.from; sb.from=(t)=>{ const b=realFrom(t); if(t==='coordinator_availability'){ b.insert=(rows)=>{ INS.push(rows); return Promise.resolve({error:null}); }; } return b; };
  IV_DAYWIN={ start:'06:00', end:'21:00' }; (0,eval)("IV_DAYWIN={ start:'06:00', end:'21:00' }");
  ivAddBlock('co-k'); await sleep(50);
  const fm=document.getElementById('ivHoursForm'), vrow=document.getElementById('ivHoursVideoRow');
  ok('the add-hours form has Monday to Friday and a Video tick for interviews', /Monday to Friday/.test(document.getElementById('ivHoursDay').innerText) && vrow.style.display!=='none' && /Video interviews/.test(vrow.innerText), [document.getElementById('ivHoursDay').innerText.slice(0,40), vrow.style.display]);
  document.getElementById('ivHoursDay').value='wk'; document.getElementById('ivHoursFrom').value='06:00'; document.getElementById('ivHoursTo').value='07:30'; document.getElementById('ivHoursVideo').checked=true;
  await ivHoursSave(document.createElement('button')); await sleep(50);
  ok('Video hours for someone with no video link: refused, says add the link first', INS.length===0 && /Add their video link first/.test(document.getElementById('ivHoursErr').innerText), document.getElementById('ivHoursErr').innerText);
  ivAddBlock('co-v'); document.getElementById('ivHoursDay').value='wk'; document.getElementById('ivHoursFrom').value='17:30'; document.getElementById('ivHoursTo').value='19:30'; document.getElementById('ivHoursVideo').checked=true;
  await ivHoursSave(document.createElement('button')); await sleep(50);
  ok('Katlin Mon-Fri 5:30-7:30 PM video: five rows, each video', INS.length===1 && INS[0].length===5 && INS[0].every(r=>r.video===true && r.start_time==='17:30' && r.end_time==='19:30' && r.coordinator_id==='co-v') && INS[0].map(r=>r.day_of_week).join()==='1,2,3,4,5', INS);
  ivAddBlock('co-k'); document.getElementById('ivHoursDay').value='wk'; document.getElementById('ivHoursFrom').value='10:00'; document.getElementById('ivHoursTo').value='12:00';
  await ivHoursSave(document.createElement('button')); await sleep(50);
  ok('Krystal Mon-Fri 10-12 without the tick: in person (no video field)', INS.length===2 && INS[1].length===5 && INS[1].every(r=>r.video===undefined), INS[1]);
  sb.from=realFrom;
  window.__DB.coordinator_availability=[{ id:'av1', coordinator_id:'co-v', activity:'interview', day_of_week:1, start_time:'17:30:00', end_time:'19:30:00', video:true }];
  await ivLoad(); await sleep(80);
  ok('a video block shows 🎥 and "video" on its chip', /🎥 Mon[^\n]*video/.test(document.getElementById('ivHosts').innerText), document.getElementById('ivHosts').innerText.slice(0,300));
  /* the interview card */
  window.apOpenProfile=()=>{}; window.recMount=()=>{}; window.apMatchMount=()=>{}; window.apLoad=async()=>{}; window.apDecisionOffer=async()=>{}; window.apToOffer=()=>{ window.__OFFER=true; };
  (0,eval)('apOpenProfile=window.apOpenProfile; recMount=window.recMount; apMatchMount=window.apMatchMount; apLoad=window.apLoad; apDecisionOffer=window.apDecisionOffer; apToOffer=window.apToOffer');
  AP_ROWS.length=0; window.__DB.job_applicants.forEach(r=>AP_ROWS.push(JSON.parse(JSON.stringify(r))));
  AP_BOOK[APID]={ applicant_id:APID, coordinator_id:'co-v', status:'booked', video:true }; AP_BOOK[APIP]={ applicant_id:APIP, coordinator_id:'co-v', status:'booked', video:false };
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

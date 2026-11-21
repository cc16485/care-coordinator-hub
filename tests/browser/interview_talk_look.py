"""The caregiver interview as a conversation (2026-11-21, her "Caregiver Interview Redesign"): the six sections on the
phone interview and on the Hub's Interview & outcome card, exact day-by-day availability, the Before they leave list,
Save, the profile, the owner switch, and that PRN and switch-off interviews are exactly the question list.
Offline, made-up applicants; every Supabase answer is faked; nothing is saved or sent. Serves the files from disk itself.
The section words are tests/browser/interview_talk_sections.json, a copy of the Staffing repo's
interview_sections_caregiver.json (what Desktop step 1569 installs).   (python3 tests/browser/interview_talk_look.py)"""
from playwright.sync_api import sync_playwright
import os, json, threading, http.server, functools
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
SECTIONS = json.load(open(os.path.join(HERE, 'interview_talk_sections.json')))
ROWS = [dict(s, position='caregiver', sort=(i + 1) * 10, active=True) for i, s in enumerate(SECTIONS)]
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Q, directory=ROOT)); threading.Thread(target=srv.serve_forever, daemon=True).start()
PORT = srv.server_address[1]
FAKE = r"""
  const CG='0b7e6a1c-1111-4222-8333-444455556666', PRN='0b7e6a1c-1111-4222-8333-777788889999';
  window.__U=[]; window.__DB={ job_applicants:[
      { id:CG, first_name:'Jordan', last_name:'Ellis', position:'caregiver', status:'new', post_interview:{ notes:'from before', script:{} } },
      { id:PRN, first_name:'Riley', last_name:'Stone', position:'prn_cna', status:'new', post_interview:{ script:{} } }],
    interview_questions:[{ id:'q1', position:'caregiver', section:'Your story', sort:1, question:'Tell me about yourself', active:true }],
    interview_sections: __SECTIONS__ };
  sb.from=(t)=>{ const f=[]; let up=null; const b={ select(){return b;}, order(){return b;}, limit(){return b;}, in(){return b;},
      eq(c,v){ f.push([c,v]); return b; },
      update(p){ up=p; return b; },
      maybeSingle(){ return b.then(x=>({data:(x.data||[])[0]||null,error:null})); },
      then(okf){ let d=(window.__DB[t]||[]); f.forEach(([c,v])=>{ d=d.filter(x=>x[c]===undefined||String(x[c])===String(v)); });
        if(up){ window.__U.push([t,JSON.parse(JSON.stringify(up))]); d.forEach(row=>Object.assign(row,JSON.parse(JSON.stringify(up)))); return Promise.resolve({data:null,error:null}).then(okf); }
        return Promise.resolve({data:JSON.parse(JSON.stringify(d)),error:null}).then(okf); } }; return b; };
  sb.rpc=async()=>({data:null,error:null});
  (0,eval)("ME={ email:'owner@test.local', name:'Sam Test', shift:'day' }; CC_ROLE_BY_EMAIL['owner@test.local']=['owner_admin'];");
  const setSel=(el,v)=>{ el.value=v; el.dispatchEvent(new Event('change',{bubbles:true})); };
  const type=(el,v)=>{ el.value=v; el.dispatchEvent(new Event('input',{bubbles:true})); };
""".replace('__SECTIONS__', json.dumps(ROWS))
PHONE = r"""
async()=>{ const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
""" + FAKE + r"""
  window.recMount=()=>{}; window.apDecisionOffer=async()=>{};
  try{ localStorage.clear(); sessionStorage.clear(); }catch(e){}
  DATA.coordinator_staff=[{ email:'owner@test.local', name:'Sam Test' }]; DATA.ops_items=[]; DATA.ops_settings={};
  const open=async(id)=>{ phStart(); await sleep(80); document.querySelector('.ph-tabs [data-v="find"]').click(); await sleep(80);
    document.getElementById('phFindBody').innerHTML='<button data-ivopen="'+id+'">open</button>'; document.querySelector('[data-ivopen]').click(); await sleep(450); };
  const body=()=>document.getElementById('phIvBody'), tk=()=>document.getElementById('phIvTalk'), txt=()=>tk().innerText;
  const q=(s)=>tk().querySelector(s), chip=(g,v)=>tk().querySelector('[data-tkc="'+g+'"][data-tkv="'+v+'"]');

  /* switch off: exactly the question list */
  await open(CG);
  ok('switch off: the phone interview is the question list as before (Say first, the question card, the honest picture)', !tk() && /Say first/i.test(body().innerText) && body().querySelectorAll('[data-ivq]').length===1 && /The honest picture, 2 minutes/i.test(body().innerText), body().innerText.slice(0,300));

  /* switch on */
  DATA.ops_settings={ interview_talk_live:true };
  await open(PRN);
  ok('switch on, PRN CNA applicant: still the question list, no conversation sections', !tk() && body().querySelectorAll('[data-ivq]').length===1 && /Say first/i.test(body().innerText));
  await open(CG);
  ok('switch on, regular Caregiver: section 1 of 6, "Getting to know you", about 2 minutes', tk() && /Section 1 of 6/i.test(txt()) && /Getting to know you/.test(txt()) && /About 2 minutes/.test(txt()), tk() && txt().slice(0,300));
  ok('...the old Say first card, question cards and honest picture card are not shown (the sections cover them)', !/Say first/i.test(body().innerText) && body().querySelectorAll('[data-ivq]').length===0 && !/The honest picture, 2 minutes/i.test(body().innerText));
  ok('...her opening words, and the recording ask', /Hi! It.s nice to meet you! Thanks for taking the time to come in today\./.test(txt()) && /Is it okay if I record our conversation\?/.test(txt()));
  ok('...no scores or ratings anywhere on the section', !/score|rating|No go|Acceptable|Amazing/i.test(txt()));
  ok('...the information notes are hidden until the button is tapped', !/Why we ask/.test(txt()));
  q('[data-tkinfo]').click(); await sleep(50);
  ok('...tap i: why we ask, listen for, follow up when, important', /Why we ask\./.test(txt()) && /Listen for/i.test(txt()) && /Follow up when/i.test(txt()) && /Do not judge personality style/.test(txt()));
  window.__shot1=true;
  q('[data-tkinfo]').click(); await sleep(50);
  tk().querySelector('[data-tkmode="video"]').click(); await sleep(50);
  ok('Video: the opening changes to meeting words and checks they can see and hear', /Thanks for taking the time to meet with me today\. Can you see and hear me okay\?/.test(txt()) && !/come in today/.test(txt()));
  tk().querySelector('[data-tkmode="person"]').click(); await sleep(50);
  chip('consent','no').click(); await sleep(50);
  ok('They said no to recording: carry on, it says so', /Carry on without recording/.test(txt()));
  chip('consent','yes').click(); await sleep(50);

  /* section 2 */
  tk().querySelector('.tk-b.p').click(); await sleep(80);
  ok('Next: section 2, current work and exact availability', /Section 2 of 6/i.test(txt()) && /Current work and exact availability/.test(txt()) && /Are you working anywhere right now\?/.test(txt()));
  ok('...employer, hours and keeping-or-leaving only appear once they say they are working', !q('[data-tkf="work.employer"]'));
  chip('work.working','yes').click(); await sleep(50); chip('work.plan','keep').click(); await sleep(50); chip('work.sched','rotating').click(); await sleep(50);
  ok('...working, keeping it, changes week to week: asks when the schedule comes out', !!q('[data-tkf="work.published"]'));
  type(q('[data-tkf="work.employer"]'),'Maple Grove Assisted Living'); type(q('[data-tkf="work.hours"]'),'24');
  ok('availability: seven day rows, each with an earliest start and latest end; there is nowhere to enter "anytime"', tk().querySelectorAll('.tk-day').length===7 && tk().querySelectorAll('select[data-tkw="f"]').length===7 && !tk().querySelector('[data-tkv="anytime"]') && /Anytime.{0,4} is not an answer yet/.test(txt()));
  ok('...no read-back until every day is answered', !/Read it back/i.test(txt()));
  const sel=(d,i,w)=>tk().querySelector('select[data-tkt="'+d+'"][data-tki="'+i+'"][data-tkw="'+w+'"]');
  setSel(sel('mon',0,'f'),'07:00'); await sleep(30); setSel(sel('mon',0,'t'),'11:00'); await sleep(30);
  tk().querySelector('[data-tka="add"][data-tkd="mon"]').click(); await sleep(30);
  setSel(sel('mon',1,'f'),'16:00'); await sleep(30); setSel(sel('mon',1,'t'),'21:00'); await sleep(30);
  ok('...two windows on one day (7 to 11 and 4 to 9), and Monday is ticked', tk().querySelectorAll('select[data-tkt="mon"][data-tkw="f"]').length===2 && tk().querySelector('.tk-day').classList.contains('ok'));
  for(const d of ['tue','wed','thu']){ tk().querySelector('[data-tka="same"][data-tkd="'+d+'"]').click(); await sleep(30); }
  setSel(sel('fri',0,'f'),'22:00'); await sleep(30); setSel(sel('fri',0,'t'),'06:00'); await sleep(30);
  ok('...a shift that ends after midnight says so', /ends the next morning/.test(txt()));
  tk().querySelector('[data-tka="off"][data-tkd="sat"]').click(); await sleep(30);
  ok('...six of seven days done: still no read-back, and Sunday is not assumed', !/Read it back/i.test(txt()));
  window.__shot2=true;
  return R; }
"""
PHONE2A = r"""
async()=>{ const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const CG='0b7e6a1c-1111-4222-8333-444455556666';
  const body=()=>document.getElementById('phIvBody'), tk=()=>document.getElementById('phIvTalk'), txt=()=>tk().innerText;
  const q=(s)=>tk().querySelector(s), chip=(g,v)=>tk().querySelector('[data-tkc="'+g+'"][data-tkv="'+v+'"]');
  const type=(el,v)=>{ el.value=v; el.dispatchEvent(new Event('input',{bubbles:true})); };
  /* finish with Sunday missing */
  for(let i=0;i<5;i++){ tk().querySelector('.tk-b.p').click(); await sleep(40); }
  ok('Finish the conversation: Before they leave lists what is still needed, by name', /Before they leave/i.test(txt()) && /Exact availability missing for Sunday/.test(txt()) && /Minimum weekly hours they need/.test(txt()) && /Other job changes week to week: when the schedule comes out/.test(txt()) && !/missing for Monday/.test(txt()), txt());
  ok('...and never tells anyone to fill it in for them', /Never fill it in for them/.test(txt()));
  return R; }
"""
PHONE2B = r"""
async()=>{ const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const CG='0b7e6a1c-1111-4222-8333-444455556666';
  const body=()=>document.getElementById('phIvBody'), tk=()=>document.getElementById('phIvTalk'), txt=()=>tk().innerText;
  const q=(s)=>tk().querySelector(s), chip=(g,v)=>tk().querySelector('[data-tkc="'+g+'"][data-tkv="'+v+'"]');
  const type=(el,v)=>{ el.value=v; el.dispatchEvent(new Event('input',{bubbles:true})); };
  q('[data-tkgo="1"]').click(); await sleep(60);
  tk().querySelector('[data-tka="off"][data-tkd="sun"]').click(); await sleep(40);
  ok('all seven days answered: the read-back appears in plain words', /Read it back/i.test(txt()) && /Monday 7 AM to 11 AM and 4 PM to 9 PM\. Tuesday 7 AM to 11 AM and 4 PM to 9 PM/.test(txt()) && /Friday 10 PM to 6 AM the next morning\. Saturday not available\. Sunday not available/.test(txt()), txt().slice(-900));
  chip('avail.confirmed','true').click(); await sleep(40); chip('avail.steady','yes').click(); await sleep(40);
  type(q('[data-tkf="hours.want"]'),'30'); type(q('[data-tkf="hours.min"]'),'20'); chip('hours.type','part').click(); await sleep(40);
  type(q('[data-tkf="work.published"]'),'Thursdays for the next week'); type(q('[data-tkf="work.start"]'),'2026-12-01');
  /* section 3: levels */
  q('.tk-b.p').click(); await sleep(60);
  ok('section 3: her three level scripts, word for word', /Level 1: Wellness Care/.test(txt()) && /There.s no hands-on personal care at this level\./.test(txt()) && /Level 2: Personal Care/.test(txt()) && /incontinence care, walking, or getting safely from one place to another/.test(txt()) && /Level 3: Advanced Care/.test(txt()) && /bedbound, needs a Hoyer lift/.test(txt()));
  ok('...what they say is marked as not verified, and everyone starts at Level 1', /What they told us \(not verified yet\)/i.test(txt()) && /Everyone starts at Level 1\. A level only changes after it is verified\./.test(txt()));
  return R; }
"""
PHONE2C = r"""
async()=>{ const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const CG='0b7e6a1c-1111-4222-8333-444455556666';
  const body=()=>document.getElementById('phIvBody'), tk=()=>document.getElementById('phIvTalk'), txt=()=>tk().innerText;
  const q=(s)=>tk().querySelector(s), chip=(g,v)=>tk().querySelector('[data-tkc="'+g+'"][data-tkv="'+v+'"]');
  const type=(el,v)=>{ el.value=v; el.dispatchEvent(new Event('input',{bubbles:true})); };
  chip('care.levels','1').click(); await sleep(30); chip('care.levels','2').click(); await sleep(30); chip('care.settings','facilities').click(); await sleep(30);
  q('.tk-b.p').click(); await sleep(60);
  ok('section 4: hard client, dementia, change in condition', /a little more challenging\?/.test(txt()) && /Alzheimer.s or dementia\?/.test(txt()) && /what would you do\?/.test(txt()));
  chip('dementia','no').click(); await sleep(40);
  ok('...no dementia experience: asks if they would like to learn, nothing negative', !!chip('dementia_learn','yes'));
  chip('dementia_learn','yes').click(); await sleep(30);
  q('.tk-b.p').click(); await sleep(60); chip('fit.cc_before','yes').click(); await sleep(30);
  q('.tk-b.p').click(); await sleep(60);
  ok('section 6: honest picture, the couldn\'t-make-it question, the pause question, and the close', /Everyone starts at Level 1 while we verify/.test(txt()) && /Have you ever had something come up where you couldn.t make it to work\?/.test(txt()) && /Is there anything that gives you pause\?/.test(txt()) && /What questions do you have for me\?/.test(txt()) && /Finish the conversation/.test(txt()));
  q('.tk-b.p').click(); await sleep(60);
  ok('Before they leave now: only what is really missing, plus the office follow-ups', !/Exact availability missing/.test(txt()) && /Where they gained their Level 2 or 3 experience/.test(txt()) && /Worked for Caring Companions before: review their old employment record/.test(txt()) && /Level 2 experience is what they told us/.test(txt()), txt());
  await sleep(450);
  ok('...typing was kept on this phone as it went', /Maple Grove/.test(localStorage.getItem('cc_iv_'+CG)||''));
  body().querySelector('[data-iv="save"]').click(); await sleep(350);
  const P=window.__DB.job_applicants[0].post_interview, T=P.talk||{};
  ok('Save: the conversation goes on their record with exact times, and earlier notes are kept', T.avail && T.avail.days.mon.w.length===2 && T.avail.days.mon.w[0].f==='07:00' && T.avail.days.mon.w[1].t==='21:00' && T.avail.days.sat.off===true && T.avail.days.fri.w[0].t==='06:00' && T.avail.complete===true && T.work.employer==='Maple Grove Assisted Living' && T.hours.min==='20' && T.consent==='yes' && T.saved_by==='Sam Test' && P.notes==='from before', P);
  ok('...nothing but their interview record was written: no status, level or application answer', window.__U.length===1 && Object.keys(window.__U[0][1]).join()==='post_interview', window.__U.map(u=>Object.keys(u[1])));
  /* Needs follow-up */
  const N=TALK.norm({}); N.avail.status='followup'; N.avail.why='other job posts Friday'; const mm=TALK.missing(N);
  ok('cannot confirm their schedule today: closes as Needs follow-up, no times invented, no day-by-day nagging', mm.follow.some(x=>/Availability needs follow-up: other job posts Friday/.test(x)) && !mm.missing.some(x=>/Exact availability/.test(x)) && TALK.clean(N).avail.complete===false && TALK.readback(N)==='');
  const H=TALK.norm({}); H.avail.days.mon.w=[{f:'07:00',t:'07:00'}];
  ok('a start with no real end is not an answer', TALK.missing(H).missing.some(x=>/missing for Monday/.test(x)));
  return R; }
"""
DESK = r"""
async()=>{ const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
""" + FAKE + r"""
  try{ localStorage.clear(); sessionStorage.clear(); }catch(e){}
  window.apOpenProfile=()=>{}; window.recMount=()=>{}; window.apMatchMount=()=>{}; window.apLoad=async()=>{}; window.apDecisionOffer=async()=>{}; window.apToOffer=()=>{};
  DATA.ops_settings={};
  AP_ROWS.length=0; window.__DB.job_applicants.forEach(a=>AP_ROWS.push(JSON.parse(JSON.stringify(a))));
  IQ.length=0; IQ.push({ id:'q1', question:'Tell me about yourself', section:'Your story', active:true, position:'caregiver' });
  await apInterview(CG); await sleep(200);
  ok('Hub, switch off: the Interview card is the question list as before', !document.getElementById('apIntTalk') && /Tell me about yourself/.test(document.getElementById('apIntForm').innerText));
  /* Settings: owner only, try it alone first */
  TALK.settingsFill();
  ok('Settings: says it is off, with Turn on and Try it (only me)', /Off: every interview is exactly as before/.test(document.getElementById('talkSetNow').textContent) && /Turn on the new caregiver interview/.test(document.getElementById('talkToggleBtn').textContent) && /Try it \(only me\)/.test(document.getElementById('talkTryBtn').textContent));
  TALK.tryIt(true);
  await apInterview(CG); await sleep(250);
  const tb=()=>document.getElementById('apIntTalk');
  ok('Try it (only me): the owner sees the six sections with the switch still off, and a note that only they see it', tb() && /Section 1 of 6/i.test(tb().innerText) && /You are trying the new interview\. Only you see it/.test(tb().innerText) && DATA.ops_settings.interview_talk_live!==true, tb() && tb().innerText.slice(0,200));
  (0,eval)("ME={ email:'krystal@test.local', name:'Krystal Test' };");
  await apInterview(CG); await sleep(200);
  ok('...a coordinator on the same computer does not get it while the switch is off', !tb());
  let said=''; window.alert=m=>{ said=m; }; await TALK.settingsToggle(null);
  ok('...and a coordinator cannot turn the switch on', /Only Samantha or Zachary/.test(said) && DATA.ops_settings.interview_talk_live!==true);
  (0,eval)("ME={ email:'owner@test.local', name:'Sam Test' };");
  TALK.tryIt(false); DATA.ops_settings={ interview_talk_live:true };
  await apInterview(PRN); await sleep(200);
  ok('Hub, switch on, PRN CNA applicant: the question list, no sections', !tb() && /Tell me about yourself/.test(document.getElementById('apIntForm').innerText));
  await apInterview(CG); await sleep(250);
  ok('Hub, switch on, regular Caregiver: the six sections, and the question list is not shown', tb() && /Getting to know you/.test(tb().innerText) && !/Tell me about yourself\b(?!!)/.test(document.getElementById('apIntForm').innerText.replace(/So, tell me a little about yourself!/,'')));
  tb().querySelector('[data-tkc="consent"][data-tkv="yes"]').click(); await sleep(40);
  tb().querySelector('.tk-b.p').click(); await sleep(80);
  tb().querySelector('[data-tkc="work.working"][data-tkv="no"]').click(); await sleep(40);
  const sel=(d,w)=>tb().querySelector('select[data-tkt="'+d+'"][data-tki="0"][data-tkw="'+w+'"]');
  setSel(sel('mon','f'),'08:00'); await sleep(30); setSel(sel('mon','t'),'16:30'); await sleep(450);
  ok('...kept on this computer as it goes', /"08:00"/.test(localStorage.getItem('cc_ivd_'+CG)||''));
  /* a quick-check tap redraws the card: the conversation must still be there, on the same section */
  apIntRender(); await sleep(60);
  ok('...the card redrawing keeps the section and what was entered', /Section 2 of 6/i.test(tb().innerText) && sel('mon','t').value==='16:30');
  window.__shotD=true;
  const btn=document.createElement('button'); await apIntSaveNotes(btn); await sleep(120);
  const P=window.__DB.job_applicants[0];
  ok('Save notes: on their record, status unchanged, Monday 8 to 4:30, the other days left empty (not guessed)', P.status==='new' && P.post_interview.talk.avail.days.mon.w[0].t==='16:30' && P.post_interview.talk.avail.days.tue.w.length===0 && P.post_interview.talk.avail.complete===false && P.post_interview.talk.work.working==='no', P.post_interview.talk);
  const html=apProfInterview({ id:CG, post_interview:P.post_interview });
  ok('their profile shows "From the interview conversation" with the times and that it is not confirmed yet', /From the interview conversation/.test(html) && /Monday 8 AM to 4:30 PM/.test(html) && /not confirmed yet/.test(html) && /Not working right now/.test(html), html.slice(-700));
  /* ---- how it went: the score, your take, the outcome (her drawing, "Yes, build this") ---- */
  const saidQ=[{ quote:'I waited, came back in ten minutes and let her pick the towel', source:'transcript', part:1, at:252, rec:'r1' }];
  const AREAS=(c,e,j,r,s)=>[['compassion','Compassion and respect',c,'Waited and came back when a client refused a shower.'],['experience','Experience',e,'Described two years of personal care.'],['judgment','Safety and judgment',j,'Called the office about new confusion.'],['reliability','Reliability',r,'Called two hours ahead when her car broke down.'],['schedule','Schedule fit',s,'Evenings and Saturdays, confirmed.']].map(x=>({ key:x[0], label:x[1], score:x[2], why:x[2]?x[3]:'' }));
  const mk=(over)=>({ id:'rv'+Math.random().toString(36).slice(2,7), applicant_id:CG, kind:'full', created_at:'2026-11-21T15:00:00Z', created_by:'Sam Test', marks:{},
    review:Object.assign({ kind:'full', style:'talk', notes_only:false, score:4, fit:'Good fit', score_held:[], areas:AREAS(5,4,4,5,3),
      opinion:'Jordan described two years of hands-on personal care and gave a clear example of staying patient with a client who refused a shower. She called her supervisor two hours ahead the one time she could not make it in.',
      items:[{ id:'ts1', section:'strengths', said:saidQ, text:'Patience with a client refusing care.' }, { id:'tv2', section:'verify', said:[], text:'Confirm two years at Maple Grove with a reference.' },
        { id:'tt3', section:'training', said:[], text:'Dementia training would open more clients.' }], parts:[{ rec:'r1', part:1 }], stats:null }, over||{}) });
  let rh=IR.scoreHtml(mk(),'Jordan');
  ok('score card: "4 out of 5", the word Good fit, the question about fit, and the opinion', /<b>4<\/b><span>out of 5<\/span>/.test(rh) && />Good fit</.test(rh) && /Is Jordan a good fit for Caring Companions\?/.test(rh) && /two years of hands-on personal care/.test(rh), rh.slice(0,500));
  ok('...five area bars with their numbers and the reason for each', ['Compassion and respect','Experience','Safety and judgment','Reliability','Schedule fit'].every(x=>rh.includes(x)) && (rh.match(/class="ir-bar"/g)||[]).length===5 && /Called two hours ahead when her car broke down/.test(rh));
  ok('...the quote behind it with its time, and Before you decide', /4:12/.test(rh) && /let her pick the towel/.test(rh) && /Before you decide/.test(rh) && /Confirm two years at Maple Grove/.test(rh) && /Dementia training would open more clients/.test(rh));
  ok('...it says it is an opinion, you decide, and nothing changes their status, level or offer', /An opinion to help you/.test(rh) && /You decide\. It never changes their status, level or offer\./.test(rh));
  ok('...nothing to confirm, correct or dismiss', !/>Confirm<|>Correct<|>Dismiss</.test(rh) && !/IR\.mark\(/.test(rh));
  rh=IR.scoreHtml(mk({ score:3, fit:'Possible fit', areas:AREAS(5,5,5,5,2), score_held:['The overall score is held at 3 until exact availability is complete.'], items:[{ id:'tav1', section:'availability', said:[], text:'Exact availability was not entered for Tuesday.' }] }),'Jordan');
  ok('a held score says why, first thing under Before you decide', /<b>3<\/b>/.test(rh) && />Possible fit</.test(rh) && /Before you decide<\/b><ul><li>The overall score is held at 3 until exact availability is complete\./.test(rh) && /not entered for Tuesday/.test(rh), rh.slice(-600));
  rh=IR.scoreHtml(mk({ score:null, fit:'Not scored', areas:AREAS(5,null,null,null,3), score_held:['Not enough of the interview was covered to give an overall score.'] }),'Jordan');
  ok('an area that did not come up shows "not covered", never a number; with too few there is no overall score', /not covered/.test(rh) && /no score/.test(rh) && />Not scored</.test(rh) && /Not enough of the interview was covered/.test(rh));
  rh=IR.scoreHtml(mk({ notes_only:true, score:3, fit:'Possible fit', items:[{ id:'ts1', section:'strengths', said:[{ quote:'Called her supervisor two hours ahead', source:'notes' }], text:'Called in early.' }] }),'Jordan');
  ok('from notes only: says there was no recording and marks the quote as interviewer notes', /No recording\./.test(rh) && /from the interviewer notes/.test(rh) && /interviewer notes<\/span> <q>Called her supervisor/.test(rh));
  const oldRow={ id:'rvold', applicant_id:PRN, kind:'full', created_at:'2026-11-21T15:00:00Z', marks:{}, review:{ kind:'full', summary:'Three years of home care.', items:[{ id:'s1', section:'strengths', said:saidQ, text:'Experience.' }], parts:[{ rec:'r1', part:1 }] } };
  rh=IR.reviewHtml(oldRow);
  ok('a PRN (or any old-style) review is shown exactly as before: no score, Confirm and Dismiss still there', />Confirm</.test(rh) && />Dismiss</.test(rh) && /second set of ears/.test(rh) && /Summary/.test(rh) && !/out of 5|good fit/i.test(rh) && /any hiring recommendation, score or verdict/.test(rh));

  /* the page: three steps */
  window.__DB.recordings=[{ id:'r1', kind:'interview', subject_id:CG, status:'done', consent_given:true, turns:[{ start:0, text:'hi', name:'A' }], created_at:'2026-11-21T14:00:00Z' }];
  window.__DB.interview_reviews=[];
  await apInterview(CG); await sleep(250);
  const card=document.getElementById('apIntCard'), step=(v)=>tb().querySelector('.tk-step[data-tkview="'+v+'"]');
  ok('the Interview card shows three steps: 1 The conversation, 2 How it went, 3 Outcome', card.classList.contains('ap-talk') && /1 The conversation/.test(step('talk').textContent) && /2 How it went/.test(step('went').textContent) && /3 Outcome/.test(step('outcome').textContent));
  const hidden=(id)=>getComputedStyle(document.getElementById(id)).display==='none';
  ok('...while talking, the old lower part is out of the way: no observation groups, no old outcome buttons', hidden('apIntHome') && hidden('apIntOutcomeRow') && document.getElementById('apIntObs').parentNode.id==='apIntHome');
  step('went').click(); await sleep(350);
  const went=tb().innerText;
  ok('How it went: the review card, Your take, What we learned and the Outcome on one page', /Is Jordan a good fit for Caring Companions\?/.test(went) && /Would you send Jordan to care for someone in your own family\?/.test(went) && /What we learned/i.test(went) && /your decision/i.test(went) && /Hire/.test(went) && /Candidate pool/.test(went) && /Not hiring/.test(went) && /Save and decide later/.test(went) && /Did not show/.test(went), went.slice(0,500));
  ok('...no review yet: one button, Get the review, and it says it runs only when tapped', /Get the review/.test(document.getElementById('tkReview').innerText) && /Only when you tap it\. You decide\./.test(document.getElementById('tkReview').innerText));
  ok('...What we learned shows what was entered (Monday 8 AM to 4:30 PM)', /Monday 8 AM to 4:30 PM/.test(went));
  const more=document.getElementById('tkMore');
  ok('...+ More is folded, and holds the quick check, the observation groups and the notes', !more.open && document.getElementById('apIntObs').parentNode.id==='tkMoreBody' && document.getElementById('apIntLegacy').parentNode.id==='tkMoreBody' && document.getElementById('apIntQuickWrap').parentNode.id==='tkMoreBody' && !/Would I feel comfortable assigning this person/.test(document.getElementById('apIntObs').innerText));
  let asked=''; const realAsk=window.apAsk; window.apAsk=async(o)=>{ asked=(o&&o.text)||''; return null; };
  const U0=window.__U.length; tb().querySelector('[data-tkout="pool"]').click(); await sleep(250);
  ok('an outcome before the family question is tapped: stopped, says what to tap, nothing saved', /Tap Yes, Unsure or No/.test(asked) && window.__U.length===U0, [asked, window.__U.slice(U0)]);
  tb().querySelector('[data-tkfam="yes"]').click(); await sleep(120);
  ok('one tap answers it, with no note needed', tb().querySelector('[data-tkfam="yes"]').classList.contains('on') && window.__apInt.observations.family.answer==='yes' && !window.__apInt.observations.family.why);
  document.getElementById('tkMore').open=true; document.querySelector('#tkMoreBody [onclick*="apIntPick"]') && document.querySelector('#tkMoreBody [onclick*="apIntPick"]').click(); await sleep(250);
  ok('...a tap inside + More keeps the page where it was: still How it went, More still open, the answer kept', /your decision/i.test(tb().innerText) && document.getElementById('tkMore').open && tb().querySelector('[data-tkfam="yes"]').classList.contains('on') && document.getElementById('apIntObs').parentNode.id==='tkMoreBody', [/your decision/i.test(tb().innerText), document.getElementById('tkMore') && document.getElementById('tkMore').open, !!tb().querySelector('[data-tkfam="yes"].on'), document.getElementById('apIntObs').parentNode.id, window.__apInt.talk && window.__apInt.talk.view, !!document.querySelector('#tkMoreBody [onclick*="apIntPick"]')]);
  tb().querySelector('[data-tkout="save"]').click(); await sleep(300);
  const P2=window.__DB.job_applicants[0];
  ok('Save and decide later: on their record, status unchanged, the family answer kept, the open page not saved', P2.status==='new' && P2.post_interview.observations.family.answer==='yes' && P2.post_interview.talk.view===undefined && P2.post_interview.talk.avail.days.mon.w[0].t==='16:30', P2.post_interview);
  window.__DB.interview_reviews=[mk()]; await IR.card(document.getElementById('tkReview'), P2); await sleep(120);
  const rc=document.getElementById('tkReview').innerText;
  ok('with a review: the score card shows on the page, the full detail is folded, Review again is offered', /out of 5/.test(rc) && /Good fit/.test(rc) && /See the full review/.test(rc) && /Review again/.test(rc) && !document.querySelector('#tkReview details').open, rc.slice(0,300));
  window.__wentShot=true;
  window.apToOffer=()=>{ window.__OFFER=true; }; asked='';
  tb().querySelector('[data-tkout="hired"]').click(); await sleep(350);
  ok('Hire: the same outcome step as before runs (status hired, on to the offer), decided by the person, not the score', window.__DB.job_applicants[0].status==='hired' && !/Tap Yes/.test(asked), [window.__DB.job_applicants[0].status, asked]);
  window.apAsk=realAsk;
  await apInterview(PRN); await sleep(250);
  ok('opening a PRN applicant afterwards: the old card comes back whole (observations with the family question, old buttons, no steps)', !card.classList.contains('ap-talk') && !hidden('apIntHome') && !hidden('apIntOutcomeRow') && document.getElementById('apIntObs').parentNode.id==='apIntHome' && document.getElementById('apIntLegacy').parentNode.id==='apIntHome' && /Would I feel comfortable assigning this person/.test(document.getElementById('apIntObs').innerText) && !document.querySelector('.tk-step'));
  /* the Interview tab: notes-only and recording buttons */
  window.__DB.recordings=[]; window.__DB.interview_reviews=[];
  window.__DB.job_applicants[0].post_interview.notes='Warm and calm. Said she did bathing and dressing at Maple Grove for two years.';
  const host=document.createElement('div'); document.body.appendChild(host); await IR.mount(host,{ id:CG }); await sleep(80);
  ok('Interview tab, no recording, notes typed: "Review from the interviewer notes", and it says it reads only the notes', /Review from the interviewer notes/.test(host.innerText) && /There is no recording, so it reads only the notes/.test(host.innerText), host.innerText);
  const host2=document.createElement('div'); document.body.appendChild(host2); await IR.mount(host2,{ id:PRN }); await sleep(80);
  ok('...a PRN applicant with no recording gets no such button (as before)', !/Review from the interviewer notes/.test(host2.innerText) && /Analyze appears once a recorded interview/.test(host2.innerText), host2.innerText);
  host.remove(); host2.remove();
  ok('Settings: the switch has its own section, New caregiver interview (not inside Leads)', document.getElementById('talkToggleBtn').closest('.settings-section').getAttribute('data-set')==='caregiver-interview');
  ok('Settings with the switch on: says who gets it and that PRN is unchanged', (TALK.settingsFill(), /regular Caregiver applicants get the six-section interview\. PRN and every other position are unchanged/.test(document.getElementById('talkSetNow').textContent)));
  return R; }
"""
OUT = os.environ.get('SHOTS', HERE)
with sync_playwright() as pw:
    b = pw.chromium.launch()
    block = lambda r: r.abort() if ('supabase.co' in r.request.url or 'leadconnectorhq' in r.request.url or 'hub.mo-care.com' in r.request.url) else r.continue_()
    errs = []
    pg = b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2); pg.route('**/*', block); pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(f'http://127.0.0.1:{PORT}/index.html?m=1'); pg.wait_for_timeout(1500)
    R = pg.evaluate(PHONE)
    shot = lambda name, sel='#phIvTalk': pg.locator(sel).screenshot(path=os.path.join(OUT, name))
    shot('interview_talk_phone_2_availability.png')
    pg.evaluate("()=>{ const T=document.getElementById('phIvTalk'); T.querySelector('[data-tkgo=\"0\"]').click(); }"); pg.wait_for_timeout(150)
    pg.evaluate("()=>document.getElementById('phIvTalk').querySelector('[data-tkinfo]').click()"); pg.wait_for_timeout(150)
    shot('interview_talk_phone_1_opening.png')
    pg.evaluate("()=>{ const T=document.getElementById('phIvTalk'); T.querySelector('[data-tkinfo]').click(); T.querySelector('[data-tkgo=\"1\"]').click(); }"); pg.wait_for_timeout(150)
    R += pg.evaluate(PHONE2A); shot('interview_talk_phone_4_before_they_leave.png')
    R += pg.evaluate(PHONE2B); shot('interview_talk_phone_3_levels.png')
    R += pg.evaluate(PHONE2C)
    wide = pg.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1')
    R.append(['PASS' if wide else 'FAIL', 'phone width: the interview does not scroll sideways', ''])
    d = b.new_page(viewport={'width': 1280, 'height': 900}); d.route('**/*', block); d.on('pageerror', lambda e: errs.append(str(e)[:200]))
    d.goto(f'http://127.0.0.1:{PORT}/index.html'); d.wait_for_timeout(1500)
    R += d.evaluate(DESK)
    # the picture: the same section drawn by itself at the card's width (the real card sits inside a profile this test does not open)
    d.evaluate("""()=>{ const T=TALK.norm(JSON.parse(JSON.stringify(window.__DB.job_applicants[0].post_interview.talk))); T.at=1;
      const x=document.createElement('div'); x.id='tkShot'; x.style.cssText='position:fixed;left:0;top:0;width:760px;max-height:100vh;overflow:auto;background:#fff;padding:18px;z-index:99999';
      x.innerHTML=TALK.html(window.__DB.interview_sections, T, {}); document.body.appendChild(x); }""")
    d.set_viewport_size({'width': 800, 'height': 1900}); d.wait_for_timeout(150)
    d.locator('#tkShot').screenshot(path=os.path.join(OUT, 'interview_talk_hub_availability.png'))
    d.evaluate("""async()=>{ const x=document.getElementById('tkShot'); x.style.width='1080px'; x.style.background='#F6F9FD'; const A=window.__DB.job_applicants[0];
      const T=TALK.norm(JSON.parse(JSON.stringify(A.post_interview.talk))); T.view='went';
      T.avail.days={ mon:{w:[{f:'16:00',t:'22:00'}]}, tue:{w:[{f:'16:00',t:'22:00'}]}, wed:{w:[{f:'16:00',t:'22:00'}]}, thu:{w:[{f:'16:00',t:'22:00'}]}, fri:{w:[{f:'16:00',t:'22:00'}]}, sat:{w:[{f:'08:00',t:'20:00'}]}, sun:{off:true,w:[]} }; T.avail.confirmed=true; T.avail.steady='yes';
      T.work={ working:'yes', employer:'Maple Grove', hours:'24', plan:'keep', sched:'fixed', start:'2026-12-01' }; T.hours={ want:'25', min:'15', type:'part' }; T.care.levels=['1','2']; T.care.settings=['facilities']; T.dementia='no'; T.dementia_learn='yes';
      DATA.ops_settings={ interview_talk_live:true };
      x.innerHTML=TALK.html(window.__DB.interview_sections, T, { steps:true, family:{ answer:'yes' }, first:'Jordan' });
      const rv=window.__DB.interview_reviews; window.__DB.recordings=[{ id:'r1', kind:'interview', subject_id:A.id, status:'done', consent_given:true, turns:[{start:0,text:'hi'}], created_at:'2026-11-21T14:00:00Z' }];
      if(!rv.length) rv.push({ id:'rvpic', applicant_id:A.id, kind:'full', created_at:'2026-11-21T15:00:00Z', marks:{}, review:{ kind:'full', style:'talk', score:4, fit:'Good fit', score_held:[], notes_only:false,
        opinion:'Jordan described two years of hands-on personal care and gave a clear example of staying patient with a client who refused a shower. She called her supervisor two hours ahead the one time she could not make it in. Her evening and weekend hours are steady. She has not done dementia care and wants to learn.',
        areas:[['compassion','Compassion and respect',5,'Waited and came back when a client refused a shower.'],['experience','Experience',4,'Described two years of personal care at an assisted living home.'],['judgment','Safety and judgment',4,'Called the office when a client seemed more confused.'],['reliability','Reliability',5,'Called two hours ahead when her car broke down.'],['schedule','Schedule fit',3,'Evenings and Saturdays only, because she keeps another job.']].map(a=>({key:a[0],label:a[1],score:a[2],why:a[3]})),
        items:[{ id:'ts1', section:'strengths', said:[{ quote:'I waited, came back in ten minutes and let her pick the towel.', source:'transcript', part:1, at:252, rec:'r1' }], text:'Patience.' },{ id:'ts2', section:'strengths', said:[{ quote:'My car broke down once and I called my supervisor two hours before my shift.', source:'transcript', part:1, at:580, rec:'r1' }], text:'Called early.' },
          { id:'tv1', section:'verify', said:[], text:'Confirm two years at Maple Grove with a reference.' },{ id:'tv2', section:'verify', said:[], text:'She keeps her other job: evenings and weekends only.' },{ id:'tt1', section:'training', said:[], text:'Dementia training would open more clients.' }], parts:[{rec:'r1',part:1}] } });
      await IR.card(x.querySelector('#tkReview'), A); }"""); d.wait_for_timeout(250)
    d.set_viewport_size({'width': 1130, 'height': 1500}); d.wait_for_timeout(150)
    d.locator('#tkShot').screenshot(path=os.path.join(OUT, 'interview_talk_hub_how_it_went.png'))
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, dd in R: print(s_, '·', n, '' if s_ == 'PASS' else dd)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

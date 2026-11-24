"""My interviews (2026-11-23, her ask: "Make samantha and krystals video interview setup like katlins"). The real Hub page,
offline, Wednesday Nov 18 2026 at 9:50 AM Missouri. A made-up database holds three interviewers (Krystal and Samantha
with Meet links, Katlin) and bookings for each. Checks: Krystal sees the pill and only her own interviews, the 10 AM video
lights Join with her own link, an in-person one says so, About shows the application (no phone or email), Open full
profile / How did it go / Hand over use the Hub's own screens, an owner can pick whose, someone who is not an interviewer
does not see the pill, and nothing is written. (python3 tests/browser/my_interviews_look.py)"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright
HERE = pathlib.Path(__file__).resolve()
src = (HERE.parent / 'katlin_page_look.py').read_text().split('with sync_playwright() as pw:')[0]
g = {'__file__': str(HERE.parent / 'katlin_page_look.py')}; exec(src, g)
SHOTS = os.environ.get('SHOTS')

SETUP = r"""
()=>{
  const T={
    coordinators:[ { id:'co_k', name:'Katlin', email:'katlin@mo-care.com', meeting_link:'https://meet.google.com/kat-kat-kat', active:true },
                   { id:'co_y', name:'Krystal', email:'Krystal@mo-care.com', meeting_link:'https://meet.google.com/kry-kry-kry', active:true },
                   { id:'co_s', name:'Samantha', email:'samantha@mo-care.com', meeting_link:'https://meet.google.com/sam-sam-sam', active:true } ],
    interview_bookings:[
      { id:'b1', applicant_id:'a1', coordinator_id:'co_y', starts_at:'2026-11-18T16:00:00Z', ends_at:'2026-11-18T16:30:00Z', status:'booked', video:true, notes:'Mornings are best' },
      { id:'b2', applicant_id:'a2', coordinator_id:'co_y', starts_at:'2026-11-18T17:00:00Z', status:'booked', video:false },
      { id:'b3', applicant_id:'a3', coordinator_id:'co_y', starts_at:'2026-11-17T12:30:00Z', status:'booked', video:true },
      { id:'b4', applicant_id:'a4', coordinator_id:'co_s', starts_at:'2026-11-19T18:00:00Z', status:'booked', video:true },
      { id:'b5', applicant_id:'a5', coordinator_id:'co_k', starts_at:'2026-11-19T00:00:00Z', status:'booked', video:true } ],
    job_applicants:[
      { id:'a1', first_name:'Rosa', last_name:'Fakeapplicant', phone:'4175550101', email:'rosa@example.com', posting_title:'Caregiver, Nixa', city:'Nixa',
        availability:'Weekday mornings', experience_years:'3', has_license:true, has_transport:true, has_insurance:false, one_year:'yes', created_at:'2026-11-15T14:00:00Z' },
      { id:'a2', first_name:'Pat', last_name:'Inpersonfake', posting_title:'Caregiver' },
      { id:'a3', first_name:'Tom', last_name:'Testerson', posting_title:'Caregiver' },
      { id:'a4', first_name:'Sam', last_name:'Ownersfake', posting_title:'Caregiver' },
      { id:'a5', first_name:'Kat', last_name:'Eveningfake', posting_title:'Caregiver' } ] };
  window.__q=[]; window.__w=[];
  const q=(table)=>{ const f=[]; const p={ select(){return p;}, order(){return p;}, limit(){return p;},
      eq(k,v){ f.push(r=>String(r[k])===String(v)); return p; }, ilike(k,v){ f.push(r=>String(r[k]||'').toLowerCase()===String(v).toLowerCase()); return p; },
      in(k,v){ f.push(r=>v.map(String).includes(String(r[k]))); return p; }, gte(k,v){ f.push(r=>String(r[k])>=String(v)); return p; },
      update(){ window.__w.push(table); return p; }, insert(){ window.__w.push(table); return p; }, upsert(){ window.__w.push(table); return p; }, delete(){ window.__w.push(table); return p; },
      maybeSingle:async()=>({ data:null, error:null }),
      then(a){ window.__q.push(table); return Promise.resolve({ data:(T[table]||[]).filter(r=>f.every(fn=>fn(r))), error:null }).then(a); } }; return p; };
  (0,eval)('sb').from=q;
  window.__hp=[]; window.HP={ open:k=>window.__hp.push(k) };
  window.__out=[]; (0,eval)('ivqOutcome=function(id){ window.__out.push(id); }');
  window.__ho=[]; window.IHO=Object.assign(window.IHO||{}, { open:id=>window.__ho.push(id) });
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Fake', shift:'day' };");
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
}
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const $=id=>document.getElementById(id), txt=()=>($('mivWrap')||{}).innerText||'';
  const asWho=async(email,name,owner)=>{ (0,eval)(`ME={ email:'${email}', name:'${name}', shift:'day' };`); (0,eval)('ccIsOwner=function(){ return '+(owner?'true':'false')+'; }');
    MIV._s.coords=null; MIV._s.who=''; MIV._s.list=null; MIV._s.loadedFor=''; MIV.pillSync(); await sleep(150); };
  await asWho('krystal@mo-care.com','Krystal Fake',false);
  switchTab('mywork'); await sleep(300); MIV.pillSync(); await sleep(100);
  ok('Krystal sees the My interviews pill on the My Work row', !!document.querySelector('#fsub2 [data-tab="myinterviews"]'), ($('fsub2')||{}).innerText);
  switchTab('myinterviews'); await sleep(400);
  ok('the title is My interviews', /My interviews/.test(txt()), txt().slice(0,300));
  const wed=[...document.querySelectorAll('#mivWrap .mv-col')].find(c=>/Wed/.test(c.innerText));
  ok('Wednesday shows her 10 AM video and 11 AM in person', wed && /10:00 AM Rosa F\./.test(wed.innerText) && /11:00 AM Pat I\./.test(wed.innerText), wed && wed.innerText);
  ok('only her own interviews', !/Ownersfake|Eveningfake|Sam O\.|Kat E\./.test(txt()), txt());
  const j=document.querySelector('#mivWrap .mv-iv a.mv-join');
  ok('Join video opens her own link in a new tab and is lit (10 minutes before)', j && j.href==='https://meet.google.com/kry-kry-kry' && j.target==='_blank' && j.classList.contains('live') && /Join video now/.test(j.innerText), j && j.outerHTML);
  ok('the bar shows the next interview with Join', /Next: Today 10:00 AM with Rosa F\./.test(document.querySelector('#mivWrap .mv-bar').innerText) && !!document.querySelector('#mivWrap .mv-bar a.mv-join'), document.querySelector('#mivWrap .mv-bar').innerText);
  ok('her video room link is shown', /Your video room: meet\.google\.com\/kry-kry-kry/.test(txt()));
  ok('the in-person interview says In person at the office', /In person at the office/.test(txt()) && document.querySelectorAll('#mivWrap .mv-iv a.mv-join').length===1);
  MIV.toggle('iv:b1'); await sleep(50);
  const ab=(document.querySelector('#mivWrap .mv-about')||{}).innerText||'';
  ok('About shows the application', /Applying for\s*Caregiver, Nixa/.test(ab) && /Can work\s*Weekday mornings/.test(ab) && /License yes · Car yes · Insurance no/.test(ab) && /Their note\s*Mornings are best/.test(ab), ab);
  ok('About does not show their phone or email', !/4175550101|rosa@example\.com/.test(ab));
  MIV.openApplicant('a1'); MIV.ivOutcome('a1'); MIV.handOver('a2');
  ok('Open full profile, How did it go and Hand over use the Hub\'s own screens', JSON.stringify(window.__hp)==='[{"applicant_id":"a1"}]' && JSON.stringify(window.__out)==='["a1"]' && JSON.stringify(window.__ho)==='["a2"]', [window.__hp, window.__out, window.__ho]);
  MIV.pick('2026-11-17'); await sleep(50);
  ok('yesterday\'s booked one asks How did it go, no Join', /Tom Testerson/.test(txt()) && /How did it go\?/.test(txt()) && !document.querySelector('#mivWrap .mv-iv a.mv-join'), txt().slice(0,1200));
  MIV.shift(7); await sleep(50);
  ok('next week has no interviews', /No interviews this day/.test(txt()));
  MIV.thisWeek(); await sleep(50);
  ok('Krystal has no Whose picker', !document.querySelector('#mivWrap select'));
  /* owner: Samantha, own first, can pick Krystal */
  await asWho('samantha@mo-care.com','Samantha Troutman',true); MIV.render(); await sleep(300);
  ok('Samantha sees her own Thursday interview first', /My interviews/.test(txt()) && /Sam O\./.test(txt()) && !/Rosa F\./.test(txt()), txt().slice(0,800));
  MIV.pick('2026-11-19'); await sleep(50);
  const sj=document.querySelector('#mivWrap .mv-iv a.mv-join');
  ok('Samantha\'s Join opens her own link (not lit yet)', sj && sj.href==='https://meet.google.com/sam-sam-sam' && !sj.classList.contains('live'), sj && sj.outerHTML);
  ok('an owner gets the Whose picker with all three', document.querySelectorAll('#mivWrap select option').length===3);
  MIV.setWho('co_y'); await sleep(300);
  ok('picking Krystal shows Krystal\'s interviews', /Krystal's interviews/.test(txt()) && /Rosa F\./.test(txt()), txt().slice(0,500));
  /* not an interviewer, not an owner */
  await asWho('someone@mo-care.com','Some One',false);
  switchTab('mywork'); await sleep(200); MIV.pillSync(); await sleep(100);
  ok('someone who is not an interviewer does not see the pill', !document.querySelector('#fsub2 [data-tab="myinterviews"]'));
  ok('reads the interviewers, their bookings and the applications', ['coordinators','interview_bookings','job_applicants'].every(t=>window.__q.includes(t)), window.__q);
  ok('nothing written', window.__w.length===0, window.__w);
  return R;
}
"""
with sync_playwright() as pw:
    b, pg, errs = g['page'](pw, '2026-11-18T09:50:00-06:00')
    pg.evaluate(SETUP)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True)
        pg.evaluate("async()=>{ (0,eval)(\"ME={ email:'krystal@mo-care.com', name:'Krystal Fake', shift:'day' };\"); (0,eval)('ccIsOwner=function(){return false;}'); MIV._s.coords=null; MIV._s.who=''; MIV._s.list=null; MIV._s.loadedFor=''; switchTab('myinterviews'); await new Promise(r=>setTimeout(r,400)); MIV.toggle('iv:b1'); }"); pg.wait_for_timeout(300)
        pg.locator('#mivWrap').screenshot(path=os.path.join(SHOTS, 'my-interviews.png'))
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

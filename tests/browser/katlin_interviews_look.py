"""Katlin's calendar: her interviews (2026-11-18, her ask: "will it show her booked interviews with an easy way for her to
join it and see some about the applicant" ... "Yes, build it"). The real Hub page, offline, on a computer in VIETNAM,
Wednesday Nov 18 at 5:50 PM Missouri. A made-up database holds Katlin's coordinators row (with a Meet link), three of
her bookings (tonight 6 PM video, yesterday booked with no outcome, Monday a no-show) and one booking of someone else.
Checks: the chip on Wednesday, the bar's "Interview 6:00 PM", Join lights up and opens her link, About shows the
application, Open full profile and How did it go use the Hub's own screens, someone else's interview is not shown, and
without a link she is told to ask Samantha. Nothing is written. (python3 tests/browser/katlin_interviews_look.py)"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright
HERE = pathlib.Path(__file__).resolve()
src = (HERE.parent / 'katlin_page_look.py').read_text().split('with sync_playwright() as pw:')[0]
g = {'__file__': str(HERE.parent / 'katlin_page_look.py')}; exec(src, g)
SHOTS = os.environ.get('SHOTS')

SETUP = r"""
()=>{
  const KT='katlin@mo-care.com';
  const T={
    coordinators:[ { id:'co_k', email:'Katlin@mo-care.com', meeting_link:'https://meet.google.com/abc-defg-hij' }, { id:'co_x', email:'krystal@mo-care.com', meeting_link:'' } ],
    interview_bookings:[
      { id:'b1', applicant_id:'a1', coordinator_id:'co_k', starts_at:'2026-11-19T00:00:00Z', ends_at:'2026-11-19T00:30:00Z', status:'booked', video:true, notes:'I work days, evenings are best', reply_text:null },
      { id:'b2', applicant_id:'a2', coordinator_id:'co_k', starts_at:'2026-11-17T23:30:00Z', ends_at:'2026-11-18T00:00:00Z', status:'booked', video:true },
      { id:'b3', applicant_id:'a3', coordinator_id:'co_k', starts_at:'2026-11-16T23:45:00Z', status:'noshow', video:true },
      { id:'b4', applicant_id:'a4', coordinator_id:'co_x', starts_at:'2026-11-18T16:00:00Z', status:'booked', video:false } ],
    job_applicants:[
      { id:'a1', first_name:'Rosa', last_name:'Fakeapplicant', phone:'4175550101', email:'rosa@example.com', posting_title:'Caregiver, Nixa', city:'Nixa', miles_out:14,
        availability:'Weekday evenings and weekends', hours_wanted:'20 to 30 hours', job_type:'Part time', experience_years:'3', experience_kinds:['dementia','personal care'],
        experience:'Cared for my grandmother for two years.', has_license:true, has_transport:true, has_insurance:false, one_year:'yes', referral_source:'Indeed',
        screen_flags:['Lived outside Missouri'], created_at:'2026-11-15T14:00:00Z' },
      { id:'a2', first_name:'Tom', last_name:'Testerson', posting_title:'Caregiver' },
      { id:'a3', first_name:'Ann', last_name:'Noshowfake', posting_title:'Caregiver' },
      { id:'a4', first_name:'Other', last_name:'Persons', posting_title:'Caregiver' } ] };
  window.__q=[];
  const q=(table)=>{ const f=[]; const p={ select(){return p;}, order(){return p;}, limit(){return p;},
      eq(k,v){ f.push(r=>String(r[k])===String(v)); return p; }, ilike(k,v){ f.push(r=>String(r[k]||'').toLowerCase()===String(v).toLowerCase()); return p; },
      in(k,v){ f.push(r=>v.map(String).includes(String(r[k]))); return p; }, gte(k,v){ f.push(r=>String(r[k])>=String(v)); return p; },
      maybeSingle:async()=>({ data:null, error:null }),
      then(a){ window.__q.push(table); return Promise.resolve({ data:(T[table]||[]).filter(r=>f.every(fn=>fn(r))), error:null }).then(a); } }; return p; };
  (0,eval)('sb').from=q;
  DATA.ops_settings.katlin_page={ email:KT, tasks:[ { id:'t1', every:'day', text:'Answer every comment on our Nextdoor posts.' } ], done:{}, posted:{}, occ:{} };
  window.__hp=[]; window.HP={ open:k=>window.__hp.push(k) };
  window.__out=[]; (0,eval)('ivqOutcome=function(id){ window.__out.push(id); }');
  (0,eval)("ME={ email:'katlin@mo-care.com', name:'Katlin Fake', shift:'day' };");
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
}
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const $=id=>document.getElementById(id), cal=()=>($('kpWrapCal')||{}).innerText||'';
  switchTab('kpcal'); await sleep(600); KP.render('kpcal'); await sleep(100);
  const wed=[...document.querySelectorAll('#kpWrapCal .kc-col')].find(c=>/Wed/.test(c.innerText));
  ok('Wednesday shows her 6 PM interview', wed && /6:00 PM Rosa F\./.test(wed.innerText), wed && wed.innerText);
  ok('someone else\'s interview is not on her calendar', !/Other P|Persons/.test(document.body.innerText));
  ok('the bar says the interview and has Join', /Interview 6:00 PM with Rosa F\./.test(document.querySelector('#kpWrapCal .kc-bar').innerText) && !!document.querySelector('#kpWrapCal .kc-bar a.kc-join'), document.querySelector('#kpWrapCal .kc-bar').innerText);
  const j=document.querySelector('#kpWrapCal .kc-iv a.kc-join');
  ok('Join video opens her own link in a new tab and is lit (10 minutes before)', j && j.href==='https://meet.google.com/abc-defg-hij' && j.target==='_blank' && j.classList.contains('live') && /Join video now/.test(j.innerText), j && j.outerHTML);
  ok('the interview shows Missouri and Vietnam time', /6:00 PM Missouri/.test(cal()) && /Thu 7:00 AM Vietnam/.test(cal()), cal().slice(0,1500));
  KPC.toggle('iv:b1'); await sleep(50);
  const ab=(document.querySelector('#kpWrapCal .kc-about')||{}).innerText||'';
  ok('About shows the application', /Applying for\s*Caregiver, Nixa/.test(ab) && /Can work\s*Weekday evenings/.test(ab) && /3 years · dementia, personal care/.test(ab) && /License yes · Car yes · Insurance no/.test(ab) && /Can stay a year\s*Yes/.test(ab) && /Worth asking about\s*Lived outside Missouri/.test(ab) && /Their note\s*I work days/.test(ab), ab);
  ok('About does not show their phone or email', !/4175550101|rosa@example\.com/.test(ab));
  KPC.openApplicant('a1'); KPC.ivOutcome('a2');
  ok('Open full profile and How did it go use the Hub\'s own screens', JSON.stringify(window.__hp)==='[{"applicant_id":"a1"}]' && JSON.stringify(window.__out)==='["a2"]', [window.__hp, window.__out]);
  KPC.pick('2026-11-17',''); await sleep(50);
  ok('yesterday\'s booked interview asks How did it go', /Tom Testerson/.test(cal()) && /How did it go\?/.test(cal()) && !document.querySelector('#kpWrapCal .kc-agenda a.kc-join'), cal().slice(0,1500));
  KPC.pick('2026-11-16',''); await sleep(50);
  ok('Monday\'s no-show says No-show', /Ann Noshowfake/.test(cal()) && /No-show/.test(cal()));
  KPC.setView('month'); await sleep(50);
  ok('month view counts interviews', /1 interview/.test(cal()), cal().slice(0,800));
  KPC.setView('week'); KPC.pick('2026-11-18',''); await sleep(30);
  switchTab('kptasks'); await sleep(150);
  ok('her other pills show the next interview with Join', /Interview 6:00 PM with Rosa F\./.test(($('kpWrapTasks')||{}).innerText||'') && !!document.querySelector('#kpWrapTasks a.kc-join'));
  /* no link yet */
  KPC._iv.link=''; switchTab('kpcal'); await sleep(100); KP.render('kpcal');
  ok('without a link she is told to ask Samantha', /No video link on your profile yet\. Ask Samantha/.test(cal()));
  (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha Troutman', shift:'day' };"); KP.render('kpcal');
  ok('an owner is told where to add it', /Interview hours, 🎥 Add video link/.test(cal()));
  ok('the guide explains interviews', /Interviews show in blue/.test(document.querySelector('#kpWrapCal .kc-guide').textContent));
  ok('only reads: coordinators, interview_bookings, job_applicants', window.__q.every(t=>['coordinators','interview_bookings','job_applicants'].includes(t)) && window.__q.includes('job_applicants'), window.__q);
  return R;
}
"""
with sync_playwright() as pw:
    b, pg, errs = g['page'](pw, '2026-11-18T17:50:00-06:00')
    pg.evaluate(SETUP)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True)
        pg.evaluate("()=>{ (0,eval)(\"ME={ email:'katlin@mo-care.com', name:'Katlin Fake', shift:'day' };\"); KPC._iv.link='https://meet.google.com/abc-defg-hij'; KPC._state.open['iv:b1']=true; KP.render('kpcal'); }"); pg.wait_for_timeout(300)
        pg.locator('#kpWrapCal').screenshot(path=os.path.join(SHOTS, 'interviews.png'))
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

"""Coordinator Training: the Practice tab (2026-11-14, her "All five" after the mockup). The real Hub page, offline, with the
Team Work test's made-up people and a stand-in practice-call server. Checks: the tab is there; scenarios and steps-in-order
are built only from PUBLISHED procedures (never a draft, never one with too few steps); wrong answers say why; a slip comes
back tomorrow, a perfect run in 3 days; the practice rounds work and send nothing; a practice call takes turns, lights
the beats and saves the coaching with the call; the trainer sees the trainee's card, someone else does not; nothing but the
practice-call service is ever called; no em dash. (python3 tests/browser/coordinator_practice_look.py; SHOTS=<dir>)"""
import os, sys, pathlib, re
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = os.environ.get('SHOTS')
src = (ROOT / 'tests/browser/team_work_look.py').read_text()
STUB = re.search(r'STUB = r"""(.*?)"""', src, re.S).group(1)
EXTRA = r"""
(()=>{
  DATA.ops_settings={ team_work_live:true };
  DATA.sop_library=[
    { id:'sop_fall', title:'A fall, injury or hospital trip', moment:'wrong', status:'published', when:'A caregiver tells us the client fell.', steps:['Fall step one','Fall step two','Fall step three','Fall step four','Fall step five'], done_when:'Fall done when', escalate_if:'Fall tell-them-if' },
    { id:'sop_abuse', title:'Suspected abuse, neglect or exploitation', moment:'wrong', status:'published', when:'You suspect abuse.', steps:['Abuse step one','Abuse step two','Abuse step three'] },
    { id:'sop_calloff', title:'A caregiver calls off: finding coverage', moment:'ongoing', status:'published', when:'A call-off.', steps:['C1','C2','C3','C4','C5','C6'] },
    { id:'sop_draft', title:'A draft', moment:'wrong', status:'draft', steps:['Draft step A','Draft step B','Draft step C'] },
    { id:'sop_short', title:'Too short', moment:'wrong', status:'published', steps:['Only one','Only two'] } ];
  DATA.call_coaching=[{ id:'training:angiel@mo-care.com', kind:'training', email:'angiel@mo-care.com', name:'Angiel Falig', trainer:'krystal@mo-care.com', start:'2026-11-17', days:[1,2,3], stages:[{name:'Learning',hours:'Mon-Wed 10am-4pm',from:'2026-11-17'},{},{}], done:{}, notes:[] }];
  window.__calls=[];
  sb.functions.invoke=async(n,{body})=>{ window.__log.fn.push(n); window.__calls.push(body);
    if(n!=='practice-call') return { data:null, error:null };
    if(body.finish) return { data:{ ok:true, report:{ beats:{story:true,home:true,help:true,paid:false,next:true}, did_well:['You asked about her day.'], work_on:['Ask how they plan to pay.'], rule_slips:[], from_procedure:true } }, error:null };
    const mine=(body.turns||[]).filter(t=>t.who==='me').length;
    return { data:{ ok:true, reply: mine? 'She is alone most days.' : 'Hi, I am calling about my mom.', beats:{ story: mine>0, home:false, help:false, paid:false, next:false }, call_over:false }, error:null }; };
  window.confirm=()=>true;
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, $=id=>document.getElementById(id);
  const as=(e,n)=>(0,eval)("ME={ email:'"+e+"', name:'"+n+"', shift:'day' };");
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  try{ localStorage.removeItem('cch_training_view'); }catch(e){}
  const pop=()=>($('ctpBody')||{}).innerText||'', ctp=()=>$('ctWrap').innerText;
  const rec=e=>DATA.call_coaching.find(x=>x.id==='practice:'+e);

  as('angiel@mo-care.com','Angiel Falig'); switchTab('cctraining'); await sleep(150);
  ok('a Practice tab beside This week', [...document.querySelectorAll('#ctPills .ct-pill')].map(b=>b.textContent).join('|')==='This week|Practice|The whole program|Skills|The plan');
  CTR.show('practice'); await sleep(80);
  ok('Angiel sees her own practice card, her week\'s procedures, the practice calls and rounds', /Your practice/.test(ctp()) && /For week 1/.test(ctp()) && /A fall, injury or hospital trip/.test(ctp()) && /A worried daughter/.test(ctp()) && /Nobody clocked in/.test(ctp()), ctp().slice(0,600));
  ok('...the list of every procedure leaves out drafts and ones with too few steps', /Every procedure \(3\)/.test(ctp()) && !/A draft/.test(ctp()) && !/Too short/.test(ctp()));

  /* scenarios: built only from published steps */
  const sc=CTP.build('sop_fall');
  ok('a scenario has one question per step (up to 6), the right step is always one option', sc.qs.length===5 && sc.qs.every((q,i)=>q.opts.filter(o=>o.ok).length===1 && q.opts.find(o=>o.ok).t===['Fall step one','Fall step two','Fall step three','Fall step four','Fall step five'][i]));
  ok('...the wrong options are a later step of the same procedure or a step of another PUBLISHED one', sc.qs.every(q=>q.opts.filter(o=>!o.ok).every(o=>/^Fall step/.test(o.t) ? /comes later/.test(o.why) : /different procedure/.test(o.why))));
  ok('...never a draft step, never invented text', !JSON.stringify(sc).includes('Draft step') && sc.qs.every(q=>q.opts.every(o=>DATA.sop_library.filter(d=>d.status!=='draft').some(d=>d.steps.includes(o.t)))));
  ok('a draft or a short procedure gives no scenario', CTP.build('sop_draft')===null && CTP.build('sop_short')===null);
  ok('the same procedure shuffles the same way every time', JSON.stringify(CTP.build('sop_fall'))===JSON.stringify(sc));

  CTP.scenario('sop_fall'); await sleep(60);
  ok('the scenario opens with the procedure\'s own situation', $('ctpBackdrop').classList.contains('open') && /A caregiver tells us the client fell/.test(pop()) && /What do you do first\?/.test(pop()));
  L.writes.length=0;
  for(let i=0;i<5;i++){
    const q=CTP.state().sc.qs[i];
    if(i===1){ const w=q.opts.findIndex(o=>!o.ok); CTP.pick(w); await sleep(20); if(i===1) ok('a wrong pick says why and lets her try again', /Not quite/.test(pop()) && /Try again/.test(pop())); }
    CTP.pick(q.opts.findIndex(o=>o.ok)); await sleep(20); CTP.next(); await sleep(20);
  }
  await sleep(60);
  ok('the end shows the score, done when and when to tell the person in charge', /4 of 5 right the first time/.test(pop()) && /Fall done when/.test(pop()) && /Fall tell-them-if/.test(pop()), pop().slice(0,400));
  const r1=rec('angiel@mo-care.com');
  ok('it saves on her own practice row only', L.writes.join()==='call_coaching:practice:angiel@mo-care.com' && r1 && r1.results.length===1 && r1.results[0].score===4, [L.writes, r1]);
  const tom=new Date(); tom.setHours(0,0,0,0); tom.setDate(tom.getDate()+1);
  ok('a slip comes back tomorrow', r1.review['scen:sop_fall'].box===0 && r1.review['scen:sop_fall'].due===tom.toISOString().slice(0,10), r1.review);
  CTP.close(); await sleep(40);

  /* a perfect run comes back in 3 days */
  CTP.scenario('sop_abuse'); await sleep(40);
  for(let i=0;i<3;i++){ CTP.pick(CTP.state().sc.qs[i].opts.findIndex(o=>o.ok)); await sleep(10); CTP.next(); await sleep(10); }
  await sleep(40);
  const in3=new Date(); in3.setHours(0,0,0,0); in3.setDate(in3.getDate()+3);
  ok('a perfect run comes back in 3 days', rec('angiel@mo-care.com').review['scen:sop_abuse'].box===1 && rec('angiel@mo-care.com').review['scen:sop_abuse'].due===in3.toISOString().slice(0,10));
  CTP.close();

  /* steps in order */
  CTP.order('sop_calloff'); await sleep(40);
  ok('steps in order opens shuffled (not already in order)', JSON.stringify(CTP.state().mix)!==JSON.stringify([0,1,2,3,4,5]));
  for(let i=0;i<6;i++) CTP.place(i); CTP.checkOrder(); await sleep(40);
  ok('all six in order: says so and saves 6 of 6', /All in order/.test(pop()) && rec('angiel@mo-care.com').results.slice(-1)[0].score===6);
  CTP.close();
  CTP.order('sop_fall'); await sleep(20); [1,0,2,3,4].forEach(i=>CTP.place(i)); CTP.checkOrder(); await sleep(30);
  ok('two swapped: 3 of 5 in the right place, the wrong ones marked', /3 of 5 in the right place/.test(pop()) && document.querySelectorAll('#ctpBody .ctp-place.no').length===2);
  CTP.close();

  /* practice rounds */
  const fnBefore=L.fn.length;
  CTP.round('calloff'); await sleep(40);
  ok('a practice round says it is practice and starts with the pretend call-off', /Pretend people/.test($('ctpSub').innerText) && /Brenda \(pretend caregiver\)/.test(pop()));
  CTP.pick(CTP.ROUNDS.calloff.nodes[0].choices.findIndex(c=>!c.ok)); await sleep(10);
  ok('...a wrong move says why', /Not quite/.test(pop()));
  for(let i=0;i<CTP.ROUNDS.calloff.nodes.length;i++){ CTP.pick(CTP.ROUNDS.calloff.nodes[i].choices.findIndex(c=>c.ok)); await sleep(10); CTP.next(); await sleep(10); }
  await sleep(30);
  ok('...the end says what done looks like and where the rule comes from', /3 of 4 right the first time/.test(pop()) && /The shift has a caregiver/.test(pop()) && /How-to: Scheduling/.test(pop()));
  ok('...and nothing was called or sent', L.fn.length===fnBefore);
  CTP.close();

  /* a practice call */
  CTP.call('daughter_falls'); await sleep(120);
  ok('a practice call opens with the caller\'s first line', /Hi, I am calling about my mom\./.test(pop()) && window.__calls.slice(-1)[0].persona==='daughter_falls' && window.__calls.slice(-1)[0].turns.length===0, pop().slice(0,300));
  $('ctpSay').value='Tell me what is going on with your mom.'; CTP.send(); await sleep(150);
  ok('her line goes to the caller with the whole call so far, and the reply comes back', /She is alone most days\./.test(pop()) && window.__calls.slice(-1)[0].turns.length===2);
  ok('...the beat she covered lights up', document.querySelectorAll('#ctpBody .ctp-beat.on').length===1);
  L.writes.length=0; await CTP.endCall(); await sleep(80);
  ok('ending the call shows the coaching: beats, did well, next time', /Your coach: 4 of 5 beats/.test(pop()) && /You asked about her day/.test(pop()) && /Ask how they plan to pay/.test(pop()) && window.__calls.slice(-1)[0].finish===true);
  const rc=rec('angiel@mo-care.com');
  ok('...the call is saved with its coaching and the words', L.writes.join()==='call_coaching:practice:angiel@mo-care.com' && rc.calls.length===1 && rc.calls[0].turns.length===3 && rc.results.slice(-1)[0].k==='call:daughter_falls');
  ok('...no voice is ever read out', !/speechSynthesis/.test(document.documentElement.innerHTML + String(CTP.call)));
  CTP.close(); await sleep(40);

  /* how families pay: read live from the real programs.html */
  await CTP.loadPrograms(); await sleep(50);
  const PG=CTP.programs();
  ok('the Payors & Programs page is read: getting-started steps for all five paths', PG && ['private','guide','vacc','aa','ltc'].every(k=>PG[k].steps.length>=3), PG && Object.fromEntries(Object.entries(PG).map(([k,v])=>[k,v.steps.length+'/'+v.facts.length])));
  ok('...GUIDE steps are the page\'s own, in its order', PG.guide.steps[0].t==='Screen on the phone' && PG.guide.steps.some(x=>x.t==='Submit in Crosby Health by Friday noon'));
  ok('...VA is split into Community Care and Aid & Attendance', PG.vacc.steps.some(x=>/authorization/i.test(x.t)) && PG.aa.steps.some(x=>/Veterans Service Officer/.test(x.t)) && PG.aa.facts.some(f=>/surviving spouse/i.test(f)));
  ok('..."Still to confirm" lists are never used as rules', !Object.values(PG).some(v=>v.facts.some(f=>/HSRM sign-in and watches/.test(f))));
  const ps=CTP.progScenario('ltc');
  ok('a program scenario: the right step is the page\'s next step; the others are a later step or another program\'s step', ps.qs.every((q,i)=>q.opts.find(o=>o.ok).t===PG.ltc.steps[i].t && q.opts.filter(o=>!o.ok).every(o=>/comes later|is a step for/.test(o.why))));
  const wq=CTP.whichQuiz();
  ok('Which program is it?: two rules from each of the five, the name hidden', wq.length===10 && ['private','guide','vacc','aa','ltc'].every(k=>wq.filter(q=>q.ans===k).length===2) && !wq.some(q=>/\bGUIDE\b|Community Care|Aid (&|and) Attendance|\bLTC\b/.test(q.fact)), wq.map(q=>q.fact).slice(0,4));
  ok('...each rule really is on that program\'s part of the page', wq.every(q=>PG[q.ans].facts.includes(q.orig)));
  CTP.which(); await sleep(40);
  for(let i=0;i<wq.length;i++){ const q=CTP.state().qs[i]; if(i===0){ CTP.pick(['private','guide','vacc','aa','ltc'].find(k=>k!==q.ans)); await sleep(10); } CTP.pick(q.ans); await sleep(10); CTP.next(); await sleep(10); }
  await sleep(40);
  ok('...played through: 9 of 10, saved, and comes back tomorrow', /9 of 10 right the first time/.test(pop()) && rec('angiel@mo-care.com').review['pwhich'] && rec('angiel@mo-care.com').review['pwhich'].box===0, pop().slice(0,200));
  CTP.close();
  CTP.progNext('guide'); await sleep(40);
  ok('What do you do next? for GUIDE opens with the page\'s steps', /From the Payors & Programs page/.test($('ctpSub').innerText) && /What do you do first\?/.test(pop()));
  const g0=CTP.state().sc.qs[0]; CTP.pick(g0.opts.findIndex(o=>o.ok)); await sleep(20);
  ok('...a right pick shows the step\'s full wording from the page', /Use the screener/.test(pop()));
  CTP.close();
  CTP.progOrder('private'); await sleep(30);
  for(let i=0;i<CTP.state().st.length;i++) CTP.place(i); CTP.checkOrder(); await sleep(30);
  ok('Steps in order for private pay saves under its own name', /All in order/.test(pop()) && rec('angiel@mo-care.com').results.slice(-1)[0].label==='Steps in order: Private pay');
  CTP.close();
  CTR.show('practice'); await sleep(60);
  ok('the Practice tab has How families pay with each program', /How families pay/.test(ctp()) && /Which program is it\?/.test(ctp()) && /Long-term care insurance/.test(ctp()) && /VA Community Care/.test(ctp()) && /Aid & Attendance/.test(ctp()));
  ok('a veteran\'s widow is a practice caller', /A veteran's widow/.test(ctp()) && CTP.PERSONAS.some(x=>x[0]==='aa_widow'));

  /* the trainer view */
  as('krystal@mo-care.com','Krystal Land'); CTR.pick('angiel@mo-care.com'); CTR.show('practice'); await sleep(80);
  ok('Krystal (her trainer) sees Angiel\'s card: practiced, calls, right first time', /What Angiel has practiced/.test(ctp()) && /Practiced this week: 8/.test(ctp()) && /Practice calls: 1/.test(ctp()) && /Right the first time: 3 of 8/.test(ctp()), ctp().slice(0,900));
  ok('...what is coming back to her, and her last practice call with its words', /Coming back/.test(ctp()) && /What do you do next: A fall, injury or hospital trip/.test(ctp()) && /Steps in order: A fall, injury or hospital trip/.test(ctp()) && /Last practice call: A worried daughter, Tue, Nov 17/.test(ctp()), ctp().slice(-900));
  ok('...never ranked or compared', !/\brank|leaderboard|compared to/i.test(ctp().replace('never ranked','')));
  (0,eval)("CC_ROLE_BY_EMAIL['katlin@mo-care.com']=['care_coordinator'];"); as('katlin@mo-care.com','Katlin H'); CTR.pick(''); CTR.show('practice'); await sleep(60);
  ok('someone who is not her trainer sees only their own practice', /Your practice/.test(ctp()) && !/Angiel/.test(ctp()));

  /* her slip comes back to her */
  as('angiel@mo-care.com','Angiel Falig');
  const rv=rec('angiel@mo-care.com').review; rv['scen:sop_fall'].due=new Date().toISOString().slice(0,10);
  CTR.pick(''); CTR.show('practice'); await sleep(60);
  ok('a due item shows as Coming back to you today, and opens', /Coming back to you today/.test(ctp()));
  [...document.querySelectorAll('#ctWrap .ctp-launch button')].find(b=>/A fall, injury/.test(b.textContent) && /Last time/.test(b.textContent)).click(); await sleep(60);
  ok('...it opens the same scenario', CTP.state() && CTP.state().type==='scen' && CTP.state().sc.id==='sop_fall'); CTP.close();

  /* the drill buttons */
  CTR.show('program'); await sleep(40); document.querySelectorAll('.ct-week, .ct-drill, .ct-drill details').forEach(d=>d.open=true);
  ok('each week\'s drills have Practice it and Put the steps in order', [...document.querySelectorAll('#ctWrap button')].some(b=>/Practice it: what do you do next\?/.test(b.textContent)) && [...document.querySelectorAll('#ctWrap button')].some(b=>/Put the steps in order/.test(b.textContent)));
  ok('no em dash anywhere on the practice pages', !/[—–]/.test($('ctWrap').innerText));
  ok('only the practice-call service was ever called', L.fn.every(f=>f==='practice-call'), L.fn);
  return R;
}
"""
MIME = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.json':'application/json', '.webmanifest':'application/json'}
def serve(route):
    url = route.request.url
    if 'supabase.co' in url: return route.abort()
    if not url.startswith('http://teamwork.local/'): return route.continue_()
    p = (ROOT / url.split('http://teamwork.local/', 1)[1].split('?')[0].split('#')[0])
    if not p.is_file(): return route.fulfill(status=404, body='')
    route.fulfill(status=200, body=p.read_bytes(), content_type=MIME.get(p.suffix, 'application/octet-stream'))
with sync_playwright() as pw:
    b = pw.chromium.launch(); cx = b.new_context(viewport={'width': 1280, 'height': 900}, timezone_id='America/Chicago'); pg = cx.new_page()
    pg.clock.install(time='2026-11-17T11:00:00-06:00'); pg.clock.resume()
    pg.route('**/*', serve)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://teamwork.local/index.html?proof=practice'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB); pg.evaluate('s=>(0,eval)(s)', EXTRA)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True)
        pg.evaluate("()=>{ (0,eval)(\"ME={ email:'angiel@mo-care.com', name:'Angiel Falig', shift:'day' };\"); switchTab('cctraining'); CTR.pick(''); CTR.show('practice'); }"); pg.wait_for_timeout(250)
        pg.screenshot(path=os.path.join(SHOTS, '1-practice-tab.png'), full_page=True)
        pg.evaluate("async()=>{ CTP.call('daughter_falls'); await new Promise(r=>setTimeout(r,150)); document.getElementById('ctpSay').value='Tell me what is going on with your mom.'; CTP.send(); }"); pg.wait_for_timeout(400)
        pg.screenshot(path=os.path.join(SHOTS, '2-practice-call.png'))
        pg.evaluate("()=>{ CTP.close(); CTP.scenario('sop_fall'); }"); pg.wait_for_timeout(200)
        pg.evaluate("()=>{ const q=CTP.state().sc.qs[0]; CTP.pick(q.opts.findIndex(o=>!o.ok)); }"); pg.wait_for_timeout(150)
        pg.screenshot(path=os.path.join(SHOTS, '3-scenario.png'))
        pg.evaluate("()=>{ CTP.close(); (0,eval)(\"ME={ email:'krystal@mo-care.com', name:'Krystal Land', shift:'day' };\"); CTR.pick('angiel@mo-care.com'); CTR.show('practice'); document.querySelectorAll('#ctWrap details').forEach(d=>d.open=true); }"); pg.wait_for_timeout(250)
        pg.screenshot(path=os.path.join(SHOTS, '4-trainer-view.png'), full_page=True)
        pg.set_viewport_size({'width': 390, 'height': 860}); pg.evaluate("()=>{ CTP.round('calloff'); }"); pg.wait_for_timeout(250)
        pg.screenshot(path=os.path.join(SHOTS, '5-phone-round.png'))
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

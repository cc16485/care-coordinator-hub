"""Coordinator Training (2026-11-14, her ask: "build an entire training program for care coordinators! Put it in the hub").
The real Hub page, offline, with the Team Work test's made-up people. Checks: the pill sits beside How-to on the Operations
Board row; with no plan it shows the program and tells an owner how to start one; an owner starts a plan (Angiel, Mon-Wed,
trainer Krystal); the dates land on her office days; every link goes to a real page; drills come only from PUBLISHED
procedures and show the procedure's own steps; a draft never appears; ticks save to call_coaching training:<email>;
only the trainer or an owner can sign off a skill, never the trainee; no em dash; nothing is texted, emailed or called.
(python3 tests/browser/coordinator_training_look.py; SHOTS=<dir>)"""
import os, sys, pathlib, re
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = os.environ.get('SHOTS')
src = (ROOT / 'tests/browser/team_work_look.py').read_text()
STUB = re.search(r'STUB = r"""(.*?)"""', src, re.S).group(1)
EXTRA = r"""
(()=>{
  DATA.ops_settings={ team_work_live:true };
  DATA.call_coaching=[{ id:'person:someone@mo-care.com', kind:'person', email:'someone@mo-care.com' }];
  DATA.sop_library=[
    { id:'sop_fall', title:'A fall, injury or hospital trip', moment:'wrong', status:'published', when:'A caregiver tells us the client fell.', steps:['Made-up fall step one','Made-up fall step two'], done_when:'Made-up done when', escalate_if:'Made-up tell-them-if' },
    { id:'sop_abuse', title:'Suspected abuse, neglect or exploitation', moment:'wrong', status:'published', when:'You suspect abuse.', steps:['Made-up abuse step'] },
    { id:'sop_privacy', title:'Privacy and what we share', moment:'office', status:'draft', when:'x', steps:['A draft step nobody should see'] },
    { id:'sop_first_call', title:'First call with a new lead', moment:'lead', status:'published', when:'A family calls.', steps:['Made-up call step'] } ];
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
  const page=()=>$('ctWrap').innerText, txt=()=>$('ctWrap').textContent;

  /* the pill */
  as('samantha@mo-care.com','Samantha Troutman');
  switchTab('mywork'); await sleep(200);
  const row=()=>[...document.querySelectorAll('#fsub2 .fpill2')].map(p=>p.textContent.trim());
  ok('the Operations Board row has a Coordinator Training pill beside How-to', row().indexOf('Coordinator Training')===row().indexOf('How-to')+1, row());
  document.querySelector('#fsub2 [data-tab="cctraining"]').click(); await sleep(200);
  ok('the pill opens the training page', (0,eval)('activeTab')==='cctraining' && $('tab-cctraining').classList.contains('active'));
  ok('five views', [...document.querySelectorAll('#ctPills .ct-pill')].map(b=>b.textContent).join('|')==='This week|Practice|The whole program|Skills|The plan');
  ok('with no plan an owner is told how to start one, and sees week 1', /Nobody is in training right now/.test(page()) && /Week 1: Welcome/.test(page()));

  /* the whole program: eight weeks, every link real, drafts never shown */
  CTR.show('program'); await sleep(60);
  ok('eight weeks', document.querySelectorAll('.ct-week').length===8, document.querySelectorAll('.ct-week').length);
  document.querySelectorAll('.ct-week, .ct-drill, .ct-drill details').forEach(d=>d.open=true);
  const bad=[];
  for(const a of $('ctWrap').querySelectorAll('a[onclick]')){
    const oc=a.getAttribute('onclick'); let m;
    if((m=/switchTab\('([a-z]+)'\)/.exec(oc))){ if(!$('tab-'+m[1])) bad.push('no page '+m[1]); }
    else if((m=/covSubGo\('([a-z]+)'\)/.exec(oc))){ if(!['calloffs','clockins','ongoing','hours'].includes(m[1])) bad.push('no Cara tab '+m[1]); }
    else if((m=/CTR\.openHowTo\('([a-z]+)'\)/.exec(oc))){ if(!HT.CARDS[m[1]]) bad.push('no How-to tab '+m[1]); }
    else if((m=/CTR\.openProcedure\('([a-z_]+)'\)/.exec(oc))){ if(!DATA.sop_library.some(d=>d.id===m[1]&&d.status!=='draft')) bad.push('link to unpublished '+m[1]); }
    else if(!/CTR\.openWeek/.test(oc)) bad.push('odd link '+oc);
  }
  ok('every link goes to a real page, a How-to tab, or a published procedure', !bad.length, bad.slice(0,8));
  ok('a draft procedure is never linked or drilled', !/A draft step nobody should see/.test(txt()) && ![...$('ctWrap').querySelectorAll('a')].some(a=>/sop_privacy/.test(a.getAttribute('onclick')||'')));
  ok('an unpublished procedure is named as words, not a link', /Privacy and what we share/.test(txt()));
  ok('a drill shows the published procedure\'s own situation, steps, done when and when to tell', /A caregiver tells us the client fell/.test(txt()) && /Made-up fall step two/.test(txt()) && /Made-up done when/.test(txt()) && /Made-up tell-them-if/.test(txt()));
  ok('no em or en dash anywhere, no "plain language"', !/[—–]/.test(txt()) && !/plain (language|English)/i.test(txt()));

  /* an owner starts Angiel's plan */
  CTR.show('plan'); await sleep(60);
  ok('an owner sees the start form', !!$('ctForm'));
  $('ct_name').value='Angiel Falig'; $('ct_email').value='angiel@mo-care.com'; $('ct_start').value='2026-11-17';
  document.querySelectorAll('.ct_day').forEach(c=>{ c.checked=['1','2','3'].includes(c.value); });
  $('ct_trainer').value='krystal@mo-care.com'; $('ct_hours0').value='Mon-Wed 10am-4pm'; $('ct_hours1').value='Adds Thu-Fri 10:30am-1:30pm'; $('ct_from1').value='2027-01-11';
  $('ct_hours2').value='Mon-Fri 9am-5pm'; $('ct_from2').value='2027-03-01';
  L.writes.length=0; await CTR.save(); await sleep(80);
  const pl=DATA.call_coaching.find(x=>x.id==='training:angiel@mo-care.com');
  ok('saving writes one row to call_coaching as training:angiel', L.writes.join()==='call_coaching:training:angiel@mo-care.com' && pl && pl.kind==='training' && pl.trainer==='krystal@mo-care.com', [L.writes, pl]);
  ok('the record of changes names it', L.events.some(e=>/Started the coordinator training plan for Angiel Falig/.test(e)), L.events);
  ok('The plan shows her days, trainer and the three stages', /Mon, Tue, Wed/.test(page()) && /Krystal/.test(page()) && /March 1, 2027/.test(page()) && /Mon-Fri 9am-5pm/.test(page()), page().slice(0,700));
  ok('pay is not kept in the plan', !Object.keys(pl).some(k=>/pay|rate|wage/i.test(k)));
  ok('the call coaching rows are untouched', DATA.call_coaching.some(x=>x.id==='person:someone@mo-care.com'));

  /* dates: week 1 falls on her office days */
  const d1=CTR.officeDays(pl,1).map(d=>d.toDateString());
  ok('week 1 is Tue 11-17 and Wed 11-18 (she starts on a Tuesday)', d1.join('|')==='Tue Nov 17 2026|Wed Nov 18 2026', d1);
  ok('week 2 is Mon-Wed 11-23 to 11-25', CTR.officeDays(pl,2).map(d=>d.getDate()).join()==='23,24,25');
  ok('on 11-17 she is in week 1', CTR.weekNow(pl)===1, CTR.weekNow(pl));

  /* Angiel sees her own week and ticks it */
  as('angiel@mo-care.com','Angiel Falig'); CTR.show('week'); await sleep(60);
  ok('Angiel sees her own week 1 with her dates', /You are in week 1 of 8/.test(page()) && /Nov 17/.test(page()) && /With Krystal/.test(page()), page().slice(0,400));
  ok('two office days but three sessions: she is told to carry the rest into next week', /carry what is left into next week/.test(page()));
  L.writes.length=0; await CTR.tick('w1-1w-1', true); await sleep(40);
  ok('a tick saves on her own row', L.writes.join()==='call_coaching:training:angiel@mo-care.com' && DATA.call_coaching.find(x=>x.id==='training:angiel@mo-care.com').done['w1-1w-1']);
  ok('the progress line moved', /1 of \d+ done/.test(page()), page().slice(0,500));
  CTR.show('skills'); await sleep(40);
  ok('Angiel cannot sign off her own skills', !document.querySelector('#ctBody button.secondary') && /Not yet/.test(page()));
  L.writes.length=0; await CTR.sign('wr_fall', true);
  ok('...and a direct call to sign is refused', !L.writes.length);

  /* Krystal, the trainer, signs one off on a separate row */
  as('krystal@mo-care.com','Krystal Land'); CTR.show('skills'); await sleep(60);
  ok('the trainer sees Angiel\'s skills with Sign off buttons', document.querySelectorAll('#ctBody button.secondary').length===24, document.querySelectorAll('#ctBody button.secondary').length);
  L.writes.length=0; await CTR.sign('wr_fall', true); await sleep(40);
  ok('a sign-off saves on trainsign:angiel, not on her plan', L.writes.join()==='call_coaching:trainsign:angiel@mo-care.com', L.writes);
  ok('it shows who signed it', /Signed off by Krystal/.test(page()) && /1 of 24 skills signed off/.test(page()));
  ok('Angiel\'s tick is still there after Krystal saved', !!DATA.call_coaching.find(x=>x.id==='training:angiel@mo-care.com').done['w1-1w-1']);
  CTR.show('plan'); await sleep(40);
  ok('the trainer cannot change the plan', !/Change the plan/.test(page()) && !$('ctForm'));

  /* someone not in training and not the trainer */
  (0,eval)("CC_ROLE_BY_EMAIL['katlin@mo-care.com']=['care_coordinator'];"); as('katlin@mo-care.com','Katlin H');
  CTR.show('week'); await sleep(40);
  ok('someone else sees the program but not Angiel\'s plan', /You do not have a training plan/.test(page()) && !/Angiel/.test(page()));

  /* a remote plan (Katlin, Vietnam, Mon-Fri evenings, trained by Samantha) leaves out what needs someone in Springfield */
  as('samantha@mo-care.com','Samantha Troutman'); DATA.coordinator_staff.push({ id:'skat', name:'Katlin H', email:'katlin@mo-care.com', active:true });
  CTR.startNew(); await sleep(60);
  $('ct_name').value='Katlin H'; $('ct_email').value='katlin@mo-care.com'; $('ct_start').value='2026-11-16';
  document.querySelectorAll('.ct_day').forEach(c=>{ c.checked=true; }); $('ct_trainer').value='samantha@mo-care.com'; $('ct_remote').checked=true;
  $('ct_hours0').value='Mon-Fri 5:30-7:30pm Central';
  L.writes.length=0; await CTR.save(); await sleep(60);
  const kp=DATA.call_coaching.find(x=>x.id==='training:katlin@mo-care.com');
  ok('an owner can be the trainer and the plan saves as remote', kp && kp.remote===true && kp.trainer==='samantha@mo-care.com' && L.writes.join()==='call_coaching:training:katlin@mo-care.com', kp);
  ok('The plan says training days and works remotely, with the remote day', /Training days:\s*Mon, Tue, Wed, Thu, Fri \(works remotely\)/.test(page()) && /What a training day looks like \(remote\)/.test(page()) && /Start on a video call together/.test(page()), page().slice(0,900));
  ok('Angiel\'s plan is untouched', !DATA.call_coaching.find(x=>x.id==='training:angiel@mo-care.com').remote);
  as('katlin@mo-care.com','Katlin H'); CTR.show('program'); await sleep(60);
  document.querySelectorAll('.ct-week').forEach(d=>d.open=true);
  ok('Katlin does not see home visits, folders or holding the office', !/Go along on a home visit/.test(txt()) && !/Lead a home visit/.test(txt()) && !/Put together one practice folder/.test(txt()) && !/hold the office this afternoon/i.test(txt()) && !/Sit in on an in-person interview/.test(txt()));
  ok('...but keeps video-friendly work: interviews, calls, AxisCare, the Leads board', /You lead an interview and your trainer sits in/.test(txt()) && /AxisCare together/.test(txt()) && /Take your first real new family call/.test(txt()));
  const kt=CTR.totals(kp), at=CTR.totals(DATA.call_coaching.find(x=>x.id==='training:angiel@mo-care.com'));
  ok('her total is smaller by exactly the in-person lines, and 21 skills instead of 24', at.of-kt.of===CTR.IN_PERSON.size && kt.skills===21 && at.skills===24, [kt,at]);
  CTR.show('week'); await sleep(40);
  ok('her week shows training days Mon-Fri and spreads the three sessions', /Training days: Mon, Nov 16/.test(page()) && /Spread the three sessions/.test(page()) && /With Samantha/.test(page()), page().slice(0,700));
  CTR.show('skills'); await sleep(40);
  ok('her skills leave out the home visit and holding the office', !/Holds the office alone/.test(page()) && !/Runs a home visit/.test(page()) && /Leads an interview alone/.test(page()));
  as('samantha@mo-care.com','Samantha Troutman'); CTR.pick('katlin@mo-care.com'); CTR.show('skills'); await sleep(40);
  ok('Samantha, her trainer, can sign off her 21 skills', document.querySelectorAll('#ctBody button.secondary').length===21, document.querySelectorAll('#ctBody button.secondary').length);
  CTR.pick('angiel@mo-care.com');

  /* links out */
  as('samantha@mo-care.com','Samantha Troutman'); CTR.show('program'); await sleep(40);
  document.querySelectorAll('.ct-week').forEach(d=>d.open=true);
  [...$('ctWrap').querySelectorAll('a')].find(a=>/CTR\.openHowTo\('wrong'\)/.test(a.getAttribute('onclick')||'')).click(); await sleep(200);
  ok('a How-to link opens that How-to tab', (0,eval)('activeTab')==='howto' && HT.view()==='wrong');
  switchTab('cctraining'); await sleep(60); CTR.show('program'); document.querySelectorAll('.ct-week').forEach(d=>d.open=true);
  [...$('ctWrap').querySelectorAll('a')].find(a=>/CTR\.openProcedure\('sop_fall'\)/.test(a.getAttribute('onclick')||'')).click(); await sleep(400);
  ok('a procedure link opens it in SOPs > Procedures', (0,eval)('activeTab')==='sops' && /Made-up fall step one/.test(($('sop-viewer-body')||{}).innerText||''));
  switchTab('mywork'); await sleep(60); location.hash='#cctraining'; await sleep(300);
  ok('#cctraining opens it', (0,eval)('activeTab')==='cctraining');
  ok('How-to and Client Goals are still on the row', row().includes('How-to') && row().includes('Client Goals'));
  ok('nothing was texted, emailed or called', !(L.fn||[]).some(f=>/sms|text|email|send|call/i.test(String(f))), L.fn);
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
    pg.goto('http://teamwork.local/index.html?proof=training'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB); pg.evaluate('s=>(0,eval)(s)', EXTRA)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True)
        pg.evaluate("()=>{ (0,eval)(\"ME={ email:'angiel@mo-care.com', name:'Angiel Falig', shift:'day' };\"); switchTab('cctraining'); CTR.show('week'); }"); pg.wait_for_timeout(250)
        pg.screenshot(path=os.path.join(SHOTS, '1-this-week.png'), full_page=True)
        pg.evaluate("()=>{ CTR.show('program'); document.querySelectorAll('.ct-week')[6].open=true; document.querySelectorAll('.ct-week')[6].querySelectorAll('.ct-drill, .ct-drill details').forEach(d=>d.open=true); }"); pg.wait_for_timeout(250)
        pg.screenshot(path=os.path.join(SHOTS, '2-program-week7-drill.png'), full_page=True)
        pg.evaluate("()=>{ (0,eval)(\"ME={ email:'krystal@mo-care.com', name:'Krystal Land', shift:'day' };\"); CTR.show('skills'); }"); pg.wait_for_timeout(250)
        pg.screenshot(path=os.path.join(SHOTS, '3-skills-trainer.png'), full_page=True)
        pg.evaluate("()=>{ (0,eval)(\"ME={ email:'samantha@mo-care.com', name:'Samantha Troutman', shift:'day' };\"); CTR.show('plan'); }"); pg.wait_for_timeout(250)
        pg.screenshot(path=os.path.join(SHOTS, '4-the-plan.png'), full_page=True)
        pg.set_viewport_size({'width': 390, 'height': 900}); pg.evaluate("()=>{ (0,eval)(\"ME={ email:'angiel@mo-care.com', name:'Angiel Falig', shift:'day' };\"); CTR.show('week'); }"); pg.wait_for_timeout(250)
        pg.screenshot(path=os.path.join(SHOTS, '5-phone.png'), full_page=True)
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

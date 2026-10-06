"""Projects on My Work + ALL HANDS ON DECK (Stage 1, 2026-10-06). The real Hub page, offline, made-up people; every save
lands in an in-memory copy. Nothing is texted or emailed. (python3 tests/browser/projects_look.py, static server on 8765)"""
import re
from playwright.sync_api import sync_playwright
src = open('/Users/samantha/Claude/Projects/cc-hub-live/tests/browser/standup_look.py').read()
STUB = re.search(r'STUB = r"""(.*?)"""', src, re.S).group(1)
DATA = r"""
(()=>{
  const now=Date.now(), I=h=>new Date(now+h*36e5).toISOString();
  window.__as=(e,n)=>{ window.__me={ email:e, name:n }; (0,eval)("ME={ email:'"+e+"', name:'"+n+"', shift:'day' };"); (0,eval)("CC_ROLES=CC_ROLE_BY_EMAIL['"+e+"']||[];"); };
  (0,eval)("CC_ROLE_BY_EMAIL={ 'krystal@mo-care.com':['care_coordinator'], 'angie@mo-care.com':['care_coordinator'], 'sally@mo-care.com':['staffing_coordinator'], 'sam@mo-care.com':['owner_admin'], 'zach@mo-care.com':['owner_admin'] }; CC_ROLES_LOADED=true;");
  (0,eval)("OPS_PEOPLE=[['krystal','Krystal Land'],['angie','Angie Care'],['sally','Sally Staffing'],['sam','Samantha Owner'],['zach','Zachary Owner']].map(([e,n])=>({ person_id:'p_'+e, full_name:n, primary_email:e+'@mo-care.com' })); OPS_DOMAINS=[];");
  window.__as('krystal@mo-care.com','Krystal Land');
  const items=[ { id:'ops_task_1', kind:'request', status:'open', title:'Find a Hoyer pad for the Smith home', owner:'krystal@mo-care.com', owner_name:'Krystal Land', created_at:I(-3), due:I(5) },
                { id:'ops_late_1', kind:'request', status:'open', title:'Old late thing', owner:'krystal@mo-care.com', created_at:I(-100), due:I(-50) } ];
  DATA.ops_items=JSON.parse(JSON.stringify(items)); window.__store.ops_items=JSON.parse(JSON.stringify(items));
  DATA.ops_settings={}; DATA.coordinator_staff=[];
  window.__toasts=[]; window.ccToast=t=>window.__toasts.push(t);
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  const S=window.__store, pop=()=>[...document.querySelectorAll('.ccpop')].pop(), ymd=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const inDays=n=>{ const d=new Date(); d.setDate(d.getDate()+n); return ymd(d); };
  const storeP=id=>S.ops_items.find(x=>x.id===id);
  switchTab('mywork'); await sleep(400); try{ myWorkGo('today'); }catch(e){} await sleep(200);
  ok('My Work has a "New project" button', [...document.querySelectorAll('#tab-mywork button')].some(b=>/New project/.test(b.textContent)));
  // create Ed's project through the form
  pjNewOpen(document.querySelector('#tab-mywork button.addlead')); await sleep(100);
  let p=pop();
  ok('the form starts on Client start / coming home, owner defaults to a Care Coordinator', p && p.querySelector('#pjNT').value==='client_start' && /krystal|angie/.test(p.querySelector('#pjNO').value));
  p.querySelector('#pjNA').value='Ed Anderson (fake)'; p.querySelector('#pjNA').dispatchEvent(new Event('input'));
  ok('...typing the client fills "coming home"', p.querySelector('#pjNTi').value==='Ed Anderson (fake) coming home');
  p.querySelector('#pjNO').value='krystal@mo-care.com'; p.querySelector('#pjNR').value=inDays(7);
  p.querySelector('#pjNDC').value='Pamela Anderson (daughter)'; p.querySelector('#pjNSh').value='9am–2pm and 4pm–9pm, 7 days a week'; p.querySelector('#pjNCL').value='bed bound, Hoyer or sit-to-stand';
  p.querySelector('#pjNGo').click(); await sleep(400);
  const P=S.ops_items.find(x=>x.kind==='project'); const id=P&&P.id;
  ok('the project is saved: kind project, Krystal owns it, ready in 7 days, 8 steps', P && P.owner==='krystal@mo-care.com' && P.ready_by===inDays(7) && P.steps.length===8, P);
  ok('...the Staffing Coordinator joined the team by themselves, and it shows on their My Work (also_for)', P.team.includes('sally@mo-care.com') && P.also_for.includes('sally@mo-care.com'));
  ok('...it needs owner sign-off, and all hands is on', P.signoff.needed===true && P.all_hands.on===true);
  ok('...step 1 names Pamela and asks for 48 hours notice; step 5 carries the shifts', /Pamela Anderson \(daughter\), ask for 48 hours notice/.test(P.steps[0].label) && /Every shift confirmed \(9am–2pm and 4pm–9pm, 7 days a week\)/.test(P.steps[4].label));
  ok('...recruiting is the Staffing Coordinator\'s; shifts and transfer practice are both of theirs; the rest Krystal\'s',
    JSON.stringify(P.steps[3].who)==='["sally@mo-care.com"]' && JSON.stringify(P.steps[4].who)==='["krystal@mo-care.com","sally@mo-care.com"]' && JSON.stringify(P.steps[6].who)==='["krystal@mo-care.com"]');
  ok('...every step is due on or before the ready-by date, none in the past', P.steps.every(s=>s.due<=P.ready_by && s.due>=inDays(0)), P.steps.map(s=>s.due));
  await sleep(200); myWorkGo('today'); await sleep(200);
  let C=document.querySelector('#myWorkWrap .wkcard[data-id="'+id+'"]');
  ok('the card is in Act Now with PROJECT, ALL HANDS ON DECK, owner, ready-by, Pamela and the shifts', C && /PROJECT/.test(C.innerText) && /ALL HANDS ON DECK/.test(C.innerText) && /Krystal owns it/.test(C.innerText) && /in 7 days/.test(C.innerText) && /Pamela Anderson/.test(C.innerText) && /9am–2pm and 4pm–9pm/.test(C.innerText) && opsPriorityKey(P)[0]===0, C&&C.innerText.slice(0,500));
  ok('...a progress bar: 0 of 8 steps, and the close is locked with the reason', /0 of 8 steps/.test(C.innerText) && /8 steps are still open\. A project closes when every step is done and an owner signs it off\./.test(C.innerText) && !C.querySelector('.pj-close'));
  ok('...no bulk tick box on a project, and it is not selectable', !C.querySelector('.wkchk') && !myWorkSelectable(true).some(r=>r.id===id));
  ok('the ALL HANDS banner is on My Work', /ALL HANDS ON DECK/.test(document.getElementById('pjWorkBanner').innerText) && /Ed Anderson \(fake\) coming home/.test(document.getElementById('pjWorkBanner').innerText));
  // tick a step
  C.querySelector('.pj-step[data-sid="s1"] .pj-tick').click(); await sleep(300);
  C=document.querySelector('#myWorkWrap .wkcard[data-id="'+id+'"]');
  ok('ticking a step saves who and when; the bar says 1 of 8', storeP(id).steps[0].done_by==='krystal@mo-care.com' && C && /1 of 8 steps/.test(C.innerText), [storeP(id).steps[0], MYWORK_TAB, document.getElementById('myWorkWrap').innerText.slice(0,300), window.__toasts]);
  // close blocked everywhere
  window.__toasts=[]; opsClose(id); await sleep(100);
  ok('Done on a project with open steps: refused with the reason, nothing closed', storeP(id).status==='open' && /still open/.test(window.__toasts.join(' ')), window.__toasts);
  await opsTriage(id,'already_handled'); await opsTriage(id,'stale');
  ok('quick-close reasons (already handled, stale) never close a project', storeP(id).status==='open' && DATA.ops_items.find(x=>x.id===id).status==='open');
  ok('Fresh Start never lists a project (the late request is listed)', !freshCandidates().some(x=>x.it.id===id) && freshCandidates().some(x=>x.it.id==='ops_late_1'));
  // the Staffing Coordinator
  window.__as('sally@mo-care.com','Sally Staffing'); myWorkGo('today'); await sleep(200);
  ok('the Staffing Coordinator sees it on their My Work, in Act Now', myWorkBuckets().mine.some(x=>x.id===id) && opsPriorityKey(DATA.ops_items.find(x=>x.id===id))[0]===0);
  C=document.querySelector('#myWorkWrap .wkcard[data-id="'+id+'"]');
  C.querySelector('.pj-step[data-sid="s7"] .pj-claim').click(); await sleep(300);
  ok('"I\'ve got this" shows only on steps not already theirs', !C.querySelector('.pj-step[data-sid="s4"] .pj-claim') && !C.querySelector('.pj-step[data-sid="s6"] .pj-claim') && !!C.querySelector('.pj-step[data-sid="s7"] .pj-claim'));
  ok('"I\'ve got this" takes a step: their name on it; the project stays Krystal\'s', storeP(id).steps[6].claimed_by==='sally@mo-care.com' && storeP(id).steps[6].who.includes('sally@mo-care.com') && storeP(id).owner==='krystal@mo-care.com');
  window.__toasts=[]; await pjAllHandsSet(id,false);
  ok('someone who is not the owner can\'t turn all hands off', storeP(id).all_hands.on===true && /Only Krystal/.test(window.__toasts.join(' ')), window.__toasts);
  // a care coordinator NOT on the team, and Zach
  window.__as('angie@mo-care.com','Angie Care');
  ok('all hands: another Care Coordinator (not on the team) sees it too', myWorkBuckets().mine.some(x=>x.id===id));
  window.__as('zach@mo-care.com','Zachary Owner'); switchTab('today'); await sleep(300);
  ok('...and an owner: the banner is on the Dashboard', /ALL HANDS ON DECK/.test(document.getElementById('pjDashBanner').innerText) && /Ed Anderson/.test(document.getElementById('pjDashBanner').innerText));
  // To talk about
  switchTab('standup'); await sleep(500);
  const su=document.getElementById('suWrap');
  ok('To talk about opens with an "All hands on deck" section and the open steps', su && /All hands on deck/.test(su.innerText) && /Still open: .*Care level set/.test(su.innerText), su&&su.innerText.slice(0,500));
  // someone else ticked a step in another window: my stale copy must not undo it
  window.__as('krystal@mo-care.com','Krystal Land');
  storeP(id).steps[1].done_at=new Date().toISOString(); storeP(id).steps[1].done_by='sally@mo-care.com';
  await pjStepTick(id,'s3');
  ok('two people ticking different steps: both stay done (it reads the latest copy before saving)', !!storeP(id).steps[1].done_at && !!storeP(id).steps[2].done_at);
  for(const s of storeP(id).steps.filter(s=>!s.done_at)) await pjStepTick(id, s.id);
  switchTab('mywork'); await sleep(300); myWorkGo('mine'); await sleep(200);
  C=document.querySelector('#myWorkWrap .wkcard[data-id="'+id+'"]');
  ok('every step done: Krystal sees it waiting on an owner\'s sign-off, no close button', C && /8 of 8 steps/.test(C.innerText) && /needs an owner’s sign-off/.test(C.innerText) && !C.querySelector('.pj-close'), C&&C.innerText.slice(-300));
  window.__as('sam@mo-care.com','Samantha Owner'); myWorkGo('mine'); await sleep(200);
  C=document.querySelector('#myWorkWrap .wkcard[data-id="'+id+'"]');
  ok('...an owner sees "Sign off and close"', C && C.querySelector('.pj-close') && /Sign off and close/.test(C.querySelector('.pj-close').textContent), C&&C.innerText.slice(-300));
  C.querySelector('.pj-close').click(); await sleep(100); pop().querySelector('#pjCGo').click(); await sleep(400);
  ok('signing off closes it, with who signed', storeP(id).status==='done' && storeP(id).signoff.by==='sam@mo-care.com' && !!storeP(id).signoff.at);
  ok('...and the banner is gone', !/ALL HANDS/.test(document.getElementById('pjWorkBanner').innerText));
  // an ordinary project far out: no all hands; inside the window it turns on by itself
  window.__as('krystal@mo-care.com','Krystal Land');
  const B=pjBuild({ template:'blank', title:'Move the office files', owner:'krystal@mo-care.com', ready_by:inDays(20), steps:['Boxes','Labels'] });
  DATA.ops_items.push(B); S.ops_items.push(JSON.parse(JSON.stringify(B)));
  ok('another project 20 days out: no all hands, no sign-off needed, only its team sees it', !pjAllHands(B) && B.signoff.needed===false && (window.__as('angie@mo-care.com','A'), !myWorkBuckets().mine.some(x=>x.id===B.id)));
  B.ready_by=inDays(5); B.due=new Date(Date.now()+5*864e5).toISOString();
  ok('...5 days out with open steps: all hands by itself; Angie and the owners see it', pjAllHands(B) && myWorkBuckets().mine.some(x=>x.id===B.id) && (window.__as('zach@mo-care.com','Z'), myWorkBuckets().mine.some(x=>x.id===B.id)));
  window.__as('krystal@mo-care.com','Krystal Land'); S.ops_items.find(x=>x.id===B.id).ready_by=B.ready_by;
  await pjAllHandsSet(B.id,false);
  ok('...one tap by the owner turns it off; Angie no longer sees it', pjAllHands(DATA.ops_items.find(x=>x.id===B.id))===false && (window.__as('angie@mo-care.com','A'), !myWorkBuckets().mine.some(x=>x.id===B.id)));
  window.__as('krystal@mo-care.com','Krystal Land');
  for(const s of ['s1','s2']) await pjStepTick(B.id,s);
  myWorkGo('mine'); await sleep(200);
  C=document.querySelector('#myWorkWrap .wkcard[data-id="'+B.id+'"]');
  ok('...steps done, no sign-off needed: the owner closes it', C && /Close the project/.test(C.innerText));
  // all hands on an ordinary task
  myWorkGo('mine'); await sleep(150);
  myWorkMore('ops_task_1','more_ops_task_1'); await sleep(100);
  const row=[...document.querySelectorAll('.ccpop .ccpick-row')].find(r=>r.dataset.what==='all_hands');
  ok('any task\'s ⋯ menu offers "All hands on deck"', !!row);
  row.click(); await sleep(400);
  ok('...turning it on: the chip on the card, and the whole team sees the task', storeP('ops_task_1').all_hands.on===true && /ALL HANDS ON DECK/.test(document.querySelector('#myWorkWrap .wkcard[data-id="ops_task_1"]').innerText) && (window.__as('sally@mo-care.com','S'), myWorkBuckets().mine.some(x=>x.id==='ops_task_1')));
  window.__as('krystal@mo-care.com','Krystal Land');
  // Find in AxisCare: live lookup, a person picks, the project and its plan keep the number
  const E=pjBuild({ template:'client_start', title:'Ed Anderson coming home', about:'Ed Anderson', owner:'krystal@mo-care.com', ready_by:inDays(7) });
  E.plan_id='tb_ed'; DATA.ops_items.push(E); S.ops_items.push(JSON.parse(JSON.stringify(E)));
  S.staffing_plans=[{ id:'tb_ed', client:'Ed Anderson', slots:[] }]; DATA.staffing_plans=JSON.parse(JSON.stringify(S.staffing_plans));
  window.__asked=[]; window.ckLookup=async q=>{ window.__asked.push(q); return { axiscare_ok:false, axiscare_error:'AxisCare answered 503' }; };
  myWorkGo('mine'); await sleep(200);
  C=document.querySelector('#myWorkWrap .wkcard[data-id="'+E.id+'"]');
  ok('a client-start project offers "Find in AxisCare"', C && C.querySelector('.pj-axfind'));
  C.querySelector('.pj-axfind').click(); await sleep(100); p=pop();
  ok('...it fills in Ed / Anderson', p.querySelector('#pjAF').value==='Ed' && p.querySelector('#pjAL').value==='Anderson');
  p.querySelector('#pjAGo').click(); await sleep(150);
  ok('...AxisCare down: it says so and changes nothing', /couldn’t be checked just now \(AxisCare answered 503\)/.test(p.innerText) && !storeP(E.id).axiscare_client_id, p.innerText);
  window.ckLookup=async q=>{ window.__asked.push(q); return { axiscare_ok:true, matches:[{ axiscare_client_id:'812', name:'Ed Anderson', active:false, why:['name_only'] },{ axiscare_client_id:null, name:'Family circle only' }] }; };
  p.querySelector('#pjAGo').click(); await sleep(150);
  ok('...a former client is shown as inactive with its AxisCare number', /Ed Anderson · AxisCare #812/.test(p.innerText) && /former client \(inactive\)/.test(p.innerText) && window.__asked.at(-1).first==='ed' && window.__asked.at(-1).last==='anderson', p.innerText);
  p.querySelector('.pj-axpick').click(); await sleep(400);
  ok('...picking it links the project and its Team Builder plan to #812', storeP(E.id).axiscare_client_id==='812' && storeP(E.id).ax_active===false && S.staffing_plans[0].axiscare_client_id==='812');
  C=document.querySelector('#myWorkWrap .wkcard[data-id="'+E.id+'"]');
  ok('...the card links to his profile and the Find button is gone', C && /AxisCare: Ed Anderson #812 \(inactive in AxisCare\)/.test(C.innerText) && /openClientProfile\('812'\)/.test(C.innerHTML) && !C.querySelector('.pj-axfind'), C&&C.innerText.slice(0,600));
  ok('nothing was texted or emailed', window.__log.fn.length===0 && window.__log.rpc.length===0, [window.__log.fn, window.__log.rpc]);
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width':1300,'height':1000})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=projects'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', STUB); pg.evaluate('s=>(0,eval)(s)', DATA)
    R = pg.evaluate(T)
    # picture: a fresh Ed project, a few steps done
    pg.evaluate('s=>(0,eval)(s)', DATA)
    pg.evaluate("""async()=>{ const d=new Date(); d.setDate(d.getDate()+7); const r=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
      const P=pjBuild({ template:'client_start', title:'Ed Anderson (fake) coming home', about:'Ed Anderson (fake)', owner:'krystal@mo-care.com', ready_by:r, date_contact:'Pamela Anderson (daughter)', notice:'48 hours', shifts:'9am–2pm and 4pm–9pm, 7 days a week', care_level:'bed bound, Hoyer or sit-to-stand' });
      P.steps[0].done_at=new Date().toISOString(); P.steps[0].done_by_name='Krystal Land'; P.steps[3].claimed_by='sally@mo-care.com';
      DATA.ops_items.push(P); window.__store.ops_items.push(P); switchTab('mywork'); await new Promise(r=>setTimeout(r,400)); myWorkGo('today'); await new Promise(r=>setTimeout(r,300)); window.scrollTo(0,0); }""")
    pg.screenshot(path='/tmp/projects.png', full_page=False)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

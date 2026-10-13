"""Team Builder ranked choices + still onboarding (2026-10-13, her "1st, 2nd, 3rd ... choice" and "yes to a and b").
The 1st choice is the main person; ↑ ↓ reorder; a Yes stays 1st; when the 1st choice says No the next who hasn't said
No moves up (A); someone with an offer, or a new hire awaiting Approve to Work, is marked "still onboarding", can be
ranked and marked Yes, is never texted from here (B). The real Hub page, offline, made-up people; saves land in memory.
Nothing is texted or emailed. (python3 tests/browser/tb_choices_look.py, server on 8765)"""
import os, re
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, 'standup_look.py')).read()
STUB = re.search(r'STUB = r"""(.*?)"""', src, re.S).group(1)
PORT = os.environ.get('HUB_PORT', '8765')
DATA = r"""
(()=>{
  window.__me={ email:'krystal@mo-care.com', name:'Krystal Land' }; (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Land', shift:'day' };");
  (0,eval)("CC_ROLE_BY_EMAIL={ 'krystal@mo-care.com':['care_coordinator'] }; CC_ROLES=['care_coordinator']; OPS_PEOPLE=[]; OPS_DOMAINS=[];");
  const plan={ id:'tb_ed', client:'Ed Fake', city:'Springfield', level:2, status:'building', days:['mon','tue'],
    slots:[{k:'s1',label:'Mornings',start:'09:00',end:'14:00'}], cells:{} };
  window.__store.staffing_plans=[JSON.parse(JSON.stringify(plan))]; DATA.staffing_plans=[plan];
  window.__store.caregiver_overlay=[]; DATA.caregiver_overlay=[]; DATA.caregivers=[]; DATA.ops_settings={};
  (0,eval)("TB.pool=[{ name:'Kim Aide', axiscare_id:'11', level:2, city:'Springfield', windows:null, visits:[] },{ name:'Di Aide', axiscare_id:'12', level:2, city:'Nixa', windows:null, visits:[] },{ name:'Lo Skill', axiscare_id:'13', level:2, city:'Springfield', windows:null, visits:[] },{ name:'Nia Newhire', axiscare_id:'14', level:2, city:'Ozark', windows:null, visits:[], work_locked:true, new_hire:{ days:3, hired:'2026-10-10', scheduled_14d:0 } }]; TB.journeys=[]; TB.links={}; TB.axLv={ tb_ed:null };");
  window.famMount=()=>{}; window.famResolve=async()=>null; window.cgpgAxHtml=()=>''; window.swRenderBar=()=>{};
  window.__toasts=[]; window.ccToast=t=>window.__toasts.push(t);
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  const S=window.__store, plan=()=>S.staffing_plans[0], root=()=>document.getElementById('tbRoot');
  const order=k=>tb2People(plan(),k).map(p=>p.name.split(' ')[0]+':'+(p.status||'penciled')).join(',');
  switchTab('hourswatch'); await sleep(200); swSubGo('builder'); await sleep(200); tbOpen('tb_ed'); await sleep(200);
  tbCell('mon|s1'); await sleep(200);
  for(const i of [0,1,2]) await tb2AddPool('mon|s1',i);
  ok('three people added in order: Kim 1st, Di 2nd, Lo 3rd', order('mon|s1')==='Kim:penciled,Di:penciled,Lo:penciled', order('mon|s1'));
  let PP=root().querySelector('.tb2-people');
  ok('the panel numbers them 1st, 2nd, 3rd with ↑ ↓', [...PP.querySelectorAll('.tb2-rank')].map(x=>x.textContent).join()==='1st,2nd,3rd' && PP.querySelectorAll('.tb2-mv').length===4, PP.innerText.slice(0,400));
  ok('...and says how the order works', /The 1st choice is who you ask first/.test(PP.innerText) && /If the 1st choice says No, the next choice moves up/.test(PP.innerText));
  const lo=plan().options['mon|s1'][1].id;
  await tb2Move('mon|s1',lo,-1);
  ok('↑ moves Lo above Di', order('mon|s1')==='Kim:penciled,Lo:penciled,Di:penciled', order('mon|s1'));
  await tb2Move('mon|s1',plan().options['mon|s1'][0].id,-1);
  ok('↑ again makes Lo the 1st choice (the main person, no option id); Kim drops to 2nd', plan().cells['mon|s1'].name==='Lo Skill' && !plan().cells['mon|s1'].id && plan().options['mon|s1'][0].name==='Kim Aide' && plan().options['mon|s1'].every(o=>o.id), plan());
  await tb2Move('mon|s1','main',1);
  ok('↓ on the 1st choice swaps them back', order('mon|s1')==='Kim:penciled,Lo:penciled,Di:penciled', order('mon|s1'));
  const cellTd=()=>[...root().querySelectorAll('td')].find(td=>/tbCell\('mon\|s1'\)/.test(td.getAttribute('onclick')));
  ok('the square shows the 1st choice and "2nd Lo +1"', /Kim A/.test(cellTd().innerText) && /2nd Lo \+1/.test(cellTd().innerText), cellTd().innerText);
  // decision A
  await tb2Answer('mon|s1','main','asked');
  await tb2Answer('mon|s1',plan().options['mon|s1'][0].id,'no');
  window.__toasts=[]; await tb2Answer('mon|s1','main','no');
  ok('A: the 1st choice says No, the next who hasn\'t said No (Di, not Lo) moves up; the Nos go to the end', order('mon|s1')==='Di:penciled,Lo:no,Kim:no', order('mon|s1'));
  ok('...it says so, and nobody was texted', /Kim Aide said no; Di Aide is now the 1st choice/.test(window.__toasts.join(' ')) && window.__log.fn.length===0, window.__toasts);
  ok('...the square no longer counts the Nos: "2nd" is gone', !/2nd/.test(cellTd().innerText), cellTd().innerText);
  await tb2Answer('mon|s1','main','no');
  ok('A: when everyone has said No, the 1st choice just shows No (nobody to move up)', plan().cells['mon|s1'].name==='Di Aide' && plan().cells['mon|s1'].status==='no', order('mon|s1'));
  // a Yes stays 1st
  await tb2Answer('mon|s1',plan().options['mon|s1'][0].id,'yes');
  ok('a Yes becomes 1st', plan().cells['mon|s1'].status==='yes' && plan().cells['mon|s1'].name==='Lo Skill', order('mon|s1'));
  window.__toasts=[]; await tb2Move('mon|s1',plan().options['mon|s1'][0].id,-1);
  ok('...nobody can be moved above a Yes; it says why', plan().cells['mon|s1'].name==='Lo Skill' && /said yes, so they stay 1st/.test(window.__toasts.join(' ')), window.__toasts);
  // B: still onboarding
  tbCell('tue|s1'); await sleep(200);
  let L=document.getElementById('tbPoolList');
  const nia=[...L.children].find(d=>/Nia Newhire/.test(d.innerText));
  ok('B: the new hire awaiting Approve to Work is listed (not hidden) as still onboarding, can be penciled in', nia && /still onboarding · waiting on Approve to Work/.test(nia.innerText) && !/not to be scheduled/.test(nia.innerText) && /Pencil in/.test(nia.innerText), nia && nia.innerText);
  TB2_APPS.rows=[{ id:'a1', first_name:'Ana', last_name:'New', status:'hired' }];
  await tb2AddPool('tue|s1',3); await tb2AddApplicant('tue|s1','a1'); await tb2AddPool('tue|s1',0);
  PP=root().querySelector('.tb2-people');
  ok('B: on the shift each says where they are: "waiting on Approve to Work", "getting ready to start"', /Nia Newhire\s*still onboarding · waiting on Approve to Work/.test(PP.innerText) && /Ana New\s*still onboarding · getting ready to start/.test(PP.innerText), PP.innerText);
  const rows=[...PP.querySelectorAll('.tb2-person')];
  ok('B: no Text button for either; Kim (on the roster, approved) still has one', !rows[0].querySelector('.tb2-text') && !rows[1].querySelector('.tb2-text') && !!rows[2].querySelector('.tb2-text'));
  ok('...and "Text everyone on this shift" leaves them out (only Kim is textable, so it isn\'t offered)', !PP.querySelector('.tb2-textall'));
  ok('...and "Text several people" leaves them out', !tb2Textable(plan()).some(x=>/Nia|Ana/.test(x.name)), tb2Textable(plan()).map(x=>x.name));
  ok('the square says "still onboarding"', [...root().querySelectorAll('td')].find(td=>/tbCell\('tue\|s1'\)/.test(td.getAttribute('onclick'))).querySelector('.tb2-onb').textContent==='still onboarding');
  await tb2Answer('tue|s1','main','yes');
  const tueTd=[...root().querySelectorAll('td')].find(td=>/tbCell\('tue\|s1'\)/.test(td.getAttribute('onclick')));
  ok('B: Nia can be marked Yes; the square says "waiting on onboarding"', plan().cells['tue|s1'].name==='Nia Newhire' && plan().cells['tue|s1'].status==='yes' && /waiting on onboarding/.test(tueTd.innerText), tueTd.innerText);
  ok('...and the Yes counts on the board (the AxisCare step is what waits)', /Mornings: 2 of 2 confirmed/.test(root().innerText), root().innerText.slice(0,300));
  ok('nothing was texted, emailed or sent anywhere', window.__log.fn.length===0);
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width':1300,'height':1000})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(f'http://localhost:{PORT}/index.html?proof=tbchoices'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', STUB); pg.evaluate('s=>(0,eval)(s)', DATA)
    R = pg.evaluate(T)
    pg.evaluate("""async()=>{ tbCell('mon|s1'); await new Promise(r=>setTimeout(r,300)); const e=document.querySelector('.tb2-people'); e.scrollIntoView({block:'start'}); window.scrollBy(0,-260); }""")
    pg.screenshot(path=os.environ.get('SHOT', '/tmp/tb_choices.png'), full_page=False)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

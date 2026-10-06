"""Team Builder Stage 2 (2026-10-06): several people per shift with answers, a Yes becomes the main person, readiness per
shift, the project step follows the board, offered applicants, skill fit. The real Hub page, offline, made-up people; every
save lands in an in-memory copy. Nothing is texted or emailed. (python3 tests/browser/team_builder2_look.py, server on 8765)"""
import re
from playwright.sync_api import sync_playwright
src = open('/Users/samantha/Claude/Projects/cc-hub-live/tests/browser/standup_look.py').read()
STUB = re.search(r'STUB = r"""(.*?)"""', src, re.S).group(1)
DATA = r"""
(()=>{
  window.__me={ email:'krystal@mo-care.com', name:'Krystal Land' }; (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Land', shift:'day' };");
  (0,eval)("CC_ROLE_BY_EMAIL={ 'krystal@mo-care.com':['care_coordinator'], 'sam@mo-care.com':['owner_admin'] }; CC_ROLES=['care_coordinator']; OPS_PEOPLE=[{person_id:'k',full_name:'Krystal Land',primary_email:'krystal@mo-care.com'}]; OPS_DOMAINS=[];");
  const d=new Date(); d.setDate(d.getDate()+7); const ready=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const plan={ id:'tb_ed', client:'Ed Anderson', city:'Springfield', level:2, status:'building', days:['mon','tue','wed','thu','fri','sat','sun'],
    slots:[{k:'s1',label:'Mornings',start:'09:00',end:'14:00'},{k:'s2',label:'Evenings',start:'16:00',end:'21:00'}], cells:{}, project_id:'ops_proj_ed' };
  const P=pjBuild({ template:'client_start', title:'Ed Anderson coming home', about:'Ed Anderson', owner:'krystal@mo-care.com', ready_by:ready });
  P.id='ops_proj_ed'; P.plan_id='tb_ed';
  window.__store.staffing_plans=[JSON.parse(JSON.stringify(plan))]; DATA.staffing_plans=[plan];
  window.__store.ops_items=[JSON.parse(JSON.stringify(P))]; DATA.ops_items=[P];
  window.__store.caregiver_overlay=[{ id:'cgov_11', axiscare_id:'11', skills:{ hoyer_lift:{ have:'yes' } } },{ id:'cgov_13', axiscare_id:'13', skills:{ hoyer_lift:{ have:'no' } } }];
  DATA.caregiver_overlay=JSON.parse(JSON.stringify(window.__store.caregiver_overlay)); DATA.caregivers=[]; DATA.ops_settings={};
  (0,eval)("TB.pool=[{ name:'Lo Skill', axiscare_id:'13', level:2, city:'Springfield', windows:null, visits:[] },{ name:'Kim Aide', axiscare_id:'11', level:2, city:'Springfield', windows:null, visits:[] },{ name:'Di Aide', axiscare_id:'12', level:2, city:'Nixa', windows:null, visits:[] }]; TB.journeys=[]; TB.links={}; TB.axLv={ tb_ed:null };");
  window.famMount=()=>{}; window.famResolve=async()=>null; window.cgpgAxHtml=()=>''; window.swRenderBar=()=>{};
  window.__toasts=[]; window.ccToast=t=>window.__toasts.push(t);
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  const S=window.__store, plan=()=>S.staffing_plans[0], root=()=>document.getElementById('tbRoot');
  switchTab('hourswatch'); await sleep(200); swSubGo('builder'); await sleep(200); tbOpen('tb_ed'); await sleep(200);
  ok('the board says how many of each shift are confirmed: Mornings 0 of 7, Evenings 0 of 7', /Mornings: 0 of 7 confirmed/.test(root().innerText) && /Evenings: 0 of 7 confirmed/.test(root().innerText) && /Only a confirmed yes counts/.test(root().innerText), root().innerText.slice(0,500));
  ok('...and each shift row has its own count', root().querySelectorAll('.tb2-rowcount').length===2);
  root().querySelector('.tb2-needs button[data-need="hoyer_lift"]').click(); await sleep(250);
  ok('"This client needs" Hoyer lift is saved on the plan', JSON.stringify(plan().needs)==='["hoyer_lift"]');
  tbCell('mon|s1'); await sleep(200);
  let L=document.getElementById('tbPoolList');
  const names=[...L.querySelectorAll('b')].map(b=>b.textContent).filter(t=>/Aide|Skill/.test(t));
  ok('skill fit: who can do a Hoyer comes first, unknown next, a no last', names.join(',')==='Kim Aide,Di Aide,Lo Skill', names);
  ok('...each says yes / not on file (with yes/no to record it) / no', /✓ Hoyer lift/.test(L.innerText) && /Hoyer lift\? yes\/no/.test(L.innerText) && /✗ no Hoyer lift/.test(L.innerText), L.innerText.slice(0,600));
  L.querySelector('.tb2-sk').click(); await sleep(250);
  ok('recording "yes" saves it on the caregiver\'s profile', S.caregiver_overlay.some(o=>o.axiscare_id==='12' && o.skills.hoyer_lift.have==='yes' && /Team Builder/.test(o.skills.hoyer_lift.note)));
  // add people
  L=document.getElementById('tbPoolList'); [...L.querySelectorAll('button')].find(b=>/tb2AddPool\('mon\|s1',1\)/.test(b.getAttribute('onclick'))).click(); await sleep(250);
  ok('the first person penciled in is the main one, with their AxisCare id', plan().cells['mon|s1'].name==='Kim Aide' && plan().cells['mon|s1'].cg_ax_id==='11' && plan().cells['mon|s1'].status==='penciled');
  L=document.getElementById('tbPoolList');
  ok('...then the button says "Add to this shift"', /Add to this shift/.test(L.innerText));
  [...L.querySelectorAll('button')].find(b=>/tb2AddPool\('mon\|s1',2\)/.test(b.getAttribute('onclick'))).click(); await sleep(250);
  ok('a second person joins the list for the same shift', plan().options['mon|s1'].length===1 && plan().options['mon|s1'][0].name==='Di Aide');
  await tb2AddPool('mon|s1',1); 
  ok('the same person twice is refused', plan().options['mon|s1'].length===1 && /already on this shift/.test(window.__toasts.join(' ')));
  const cellTd=[...root().querySelectorAll('td')].find(td=>/tbCell\('mon\|s1'\)/.test(td.getAttribute('onclick')));
  ok('the grid cell shows the main person and "+1 more"', /Kim A/.test(cellTd.innerText) && /\+1 more/.test(cellTd.innerText), cellTd.innerText);
  let PP=root().querySelector('.tb2-people');
  ok('the shift panel lists both, main first, each with Asked / Yes / Maybe / No / No reply', PP && /Asked about this shift \(2\)/.test(PP.innerText) && /Kim Aide\s*main/.test(PP.innerText) && ['📞 Asked','✓ Yes','Maybe','✗ No','No reply','Remove'].every(t=>PP.innerText.includes(t)), PP&&PP.innerText);
  const diId=plan().options['mon|s1'][0].id;
  await tb2Answer('mon|s1','main','asked'); await tb2Answer('mon|s1',diId,'maybe');
  ok('answers are saved with who and when', plan().cells['mon|s1'].status==='asked' && plan().cells['mon|s1'].by==='Krystal Land' && plan().options['mon|s1'][0].status==='maybe');
  await tb2Answer('mon|s1',diId,'yes');
  ok('a Yes becomes the main person; the old main stays on the list with their answer', plan().cells['mon|s1'].name==='Di Aide' && plan().cells['mon|s1'].status==='yes' && plan().options['mon|s1'][0].name==='Kim Aide' && plan().options['mon|s1'][0].status==='asked');
  ok('...the count says Mornings 1 of 7', /Mornings: 1 of 7 confirmed/.test(root().innerText));
  const asked=[]; window.confirm=t=>{ asked.push(t); return true; };
  await tb2Answer('mon|s1',plan().options['mon|s1'][0].id,'yes');
  ok('only one Yes per shift: it asks, then the other Yes becomes a maybe', /Di Aide is already confirmed/.test(asked[0]) && plan().cells['mon|s1'].name==='Kim Aide' && plan().options['mon|s1'][0].name==='Di Aide' && plan().options['mon|s1'][0].status==='maybe');
  // offered applicants
  TB2_APPS.rows=[{ id:'a1', first_name:'Ana', last_name:'New', status:'offer', start_date:'2026-10-20', offer_position:'Caregiver' }];
  tbCell('tue|s1'); await sleep(200);
  L=document.getElementById('tbPoolList');
  ok('people with an accepted offer are listed: "starts after onboarding", with their start date', /OFFERED, STARTS AFTER ONBOARDING · 1/.test(L.innerText) && /Ana New/.test(L.innerText) && /start date Oct 20/.test(L.innerText), L.innerText.slice(-400));
  L.querySelector('.tb2-app button').click(); await sleep(250);
  PP=root().querySelector('.tb2-people');
  ok('...adding one keeps them marked; no Text button for them', plan().cells['tue|s1'].applicant_id==='a1' && /starts after onboarding/.test(PP.innerText) && !/💬 Text/.test(PP.innerText));
  await tb2AddPool('tue|s1',0); await tb2Answer('tue|s1','main',null);
  ok('removing the main person moves the next one up', plan().cells['tue|s1'].name==='Lo Skill' && !plan().options['tue|s1']);
  // every shift confirmed: the project step ticks itself, and reopens
  const p=plan(); p.days.forEach(d=>p.slots.forEach(s=>{ p.cells[d+'|'+s.k]={ name:'Kim Aide', cg_ax_id:'11', status:'yes' }; }));
  DATA.staffing_plans[0]=JSON.parse(JSON.stringify(p)); tbOpen('tb_ed'); await sleep(100);
  await tbSet('sun|s2','yes'); await sleep(400);
  const step=()=>S.ops_items[0].steps.find(s=>s.key==='shifts');
  ok('every shift confirmed: the project\'s "Every shift confirmed" ticks itself', !!step().done_at && step().auto===true && step().done_by_name==='the Team Builder', step());
  await tbSet('sun|s2','no'); await sleep(400);
  ok('...a Yes taken back: the step reopens by itself', !step().done_at, step());
  ok('...both are on the project\'s record', S.ops_items[0].history.some(h=>/Step done by itself: Every shift confirmed/.test(h.text)) && S.ops_items[0].history.some(h=>/Step reopened by itself/.test(h.text)));
  // the project card
  switchTab('mywork'); await sleep(300); myWorkGo('today'); await sleep(200);
  const C=document.querySelector('#myWorkWrap .wkcard[data-id="ops_proj_ed"]');
  ok('the project card shows the board: Mornings 7 of 7, Evenings 6 of 7, and Open the Team Builder', C && /Mornings: 7 of 7 confirmed/.test(C.innerText) && /Evenings: 6 of 7 confirmed/.test(C.innerText) && /Open the Team Builder/.test(C.innerText), C&&C.innerText.slice(0,700));
  // a plan as a project on My Work
  switchTab('hourswatch'); await sleep(150); swSubGo('builder'); tbClose(); await sleep(150);
  tbNewForm(); await sleep(50);
  ok('the new-plan form offers "Put it on My Work as a project" (ticked) with a ready-by date', document.getElementById('tb-asproject').checked && /^\d{4}-\d{2}-\d{2}$/.test(document.getElementById('tb-ready').value));
  document.getElementById('tb-client').value='Bea Fake'; document.getElementById('tb-townzip').value='Nixa 65714'; document.getElementById('tb-pattern').value='daily4';
  await tbCreate(); await sleep(400);
  const bea=S.staffing_plans.find(x=>x.client==='Bea Fake'), bp=S.ops_items.find(x=>x.plan_id===bea.id);
  ok('creating the board puts it on My Work: a "care team" project, linked both ways, Krystal owns it', bp && bp.kind==='project' && bp.template==='care_team' && bp.title==='Bea Fake care team' && bea.project_id===bp.id && bp.owner==='krystal@mo-care.com', [bea, bp]);
  ok('...its steps: Every shift confirmed (with the hours) and Schedules sent to AxisCare', bp.steps.length===2 && bp.steps[0].key==='shifts' && /Every shift confirmed \(9a–1p, 7 days a week\)/.test(bp.steps[0].label) && bp.steps[1].key==='axis', bp.steps);
  ok('...the board says it is on My Work', /On My Work: Bea Fake care team · Krystal owns it/.test(root().innerText));
  const B2=S.staffing_plans.find(x=>x.client==='Bea Fake'); B2.days.forEach(d=>{ B2.cells[d+'|main']={ name:'Kim Aide', cg_ax_id:'11', status:'yes' }; });
  B2.axiscare_push={ at:new Date().toISOString(), created:[{ id:'x' }] }; DATA.staffing_plans=DATA.staffing_plans.map(x=>x.id===B2.id?JSON.parse(JSON.stringify(B2)):x);
  await tb2Sync(DATA.staffing_plans.find(x=>x.id===B2.id)); await sleep(300);
  const bp2=S.ops_items.find(x=>x.id===bp.id);
  ok('...the board fills both steps in by itself (all confirmed, schedules in AxisCare)', bp2.steps.every(s=>s.done_at && s.auto), bp2.steps);
  // an older plan without a project
  const old={ id:'tb_old', client:'Cal Fake', days:['mon','tue'], slots:[{k:'s1',label:'Days',start:'08:00',end:'12:00'}], cells:{}, status:'building' };
  S.staffing_plans.push(JSON.parse(JSON.stringify(old))); DATA.staffing_plans.push(old); tbOpen('tb_old'); await sleep(150);
  root().querySelector('.tb2-make').click(); await sleep(120);
  const pp=[...document.querySelectorAll('.ccpop')].pop(); pp.querySelector('#tb2K').value='client_start'; pp.querySelector('#tb2Go').click(); await sleep(500);
  const cp=S.ops_items.find(x=>x.plan_id==='tb_old');
  ok('"Make this a project" on an existing plan: Client start makes the full project', cp && cp.template==='client_start' && cp.steps.length===8 && !cp.all_hands && /Cal Fake coming home/.test(cp.title) && S.staffing_plans.find(x=>x.id==='tb_old').project_id===cp.id);
  window.__toasts=[]; await tb2MakeProject('tb_old',{});
  ok('...never twice', S.ops_items.filter(x=>x.plan_id==='tb_old').length===1 && /already a project/.test(window.__toasts.join(' ')));
  // TEXT SEVERAL AT ONCE (team-ask is faked here: it records what would be sent)
  window.cgpgBeforeOffer=async()=>true;
  const TS={ drafts:[], sends:[], live:true };
  window.taCall=async b=>{ if(b.action==='draft'){ TS.drafts.push(b); const opted=b.caregiver_name==='Opal Out';
      return { live:TS.live, caregiver:{ first:String(b.caregiver_name).split(' ')[0], on_roster:true, phone_last4:'0'+String(b.caregiver_axiscare_id||'9').slice(-1)+'00', opt_out:opted?['opted out by text']:[] },
        client:{ first:'Gus', town:'Ozark', start_target:null, care_line:'' }, template:"Hi {first_name}, it's Caring Companions. We're building a care team for {client}, a new client{where}: {when}{start}. {care}Would you be interested?", asked_before:[] }; }
    TS.sends.push(b); const pl=JSON.parse(JSON.stringify(DATA.staffing_plans.find(x=>x.id===b.plan_id)));
    return { outcome:'sent', plan:pl }; };
  const G={ id:'tb_gus', client:'Gus Fake', days:['mon','tue','wed'], slots:[{k:'am',label:'Mornings',start:'09:00',end:'14:00'}],
    cells:{ 'mon|am':{ name:'Kim Aide', cg_ax_id:'11', status:'penciled' }, 'tue|am':{ name:'Kim Aide', cg_ax_id:'11', status:'penciled' }, 'wed|am':{ name:'Lo Skill', cg_ax_id:'13', status:'yes' } },
    options:{ 'mon|am':[{ id:'o1', name:'Di Aide', cg_ax_id:'12', status:'maybe' },{ id:'o2', name:'Opal Out', cg_ax_id:'22', status:'penciled' },{ id:'o3', name:'Ana New', applicant_id:'a1', status:'penciled' }] } };
  S.staffing_plans.push(JSON.parse(JSON.stringify(G))); DATA.staffing_plans.push(G); tbOpen('tb_gus'); await sleep(200);
  ok('the board has "Text several people"', !!root().querySelector('.tb2-several-btn'));
  root().querySelector('.tb2-several-btn').click(); await sleep(400);
  let W2=document.querySelector('.tb2-several');
  const rows=[...W2.querySelectorAll('.ts-person')], txt=W2.innerText;
  ok('it lists everyone who can be asked: Kim (2 shifts), Di, Opal; not the Yes (Lo) and not the applicant (Ana)', rows.length===3 && /Kim Aide/.test(txt) && /Di Aide/.test(txt) && /Opal Out/.test(txt) && !/Lo Skill/.test(txt) && !/Ana New/.test(txt), txt.slice(0,600));
  const kim=rows.find(r=>/Kim Aide/.test(r.innerText)), di=rows.find(r=>/Di Aide/.test(r.innerText)), opal=rows.find(r=>/Opal Out/.test(r.innerText));
  ok('...Opal can\'t be ticked and it says why', opal.querySelector('.ts-on').disabled && /Can’t text: asked not to get texts \(opted out by text\)/.test(opal.innerText));
  ok('...each person sees their own text: first name and their own shifts', /Hi Kim, it's Caring Companions\. We're building a care team for Gus, a new client in Ozark: Mon & Tue 9am–2pm \(10 hrs a week\)\./.test(kim.querySelector('.ts-preview').textContent) && /Hi Di,.*: Mon 9am–2pm \(5 hrs a week\)/.test(di.querySelector('.ts-preview').textContent), [kim.querySelector('.ts-preview').textContent, di.querySelector('.ts-preview').textContent]);
  ok('...the message box shows [first name] and [their shifts]', /\[first name\]/.test(W2.querySelector('#tsMsg').value) && /\[their shifts\]/.test(W2.querySelector('#tsMsg').value) && /2 texts, one per person/.test(W2.innerText));
  const m=W2.querySelector('#tsMsg'); m.value=m.value.replace('Would you be interested?','Can you call me back today?'); m.dispatchEvent(new Event('input'));
  ok('...editing the message updates every preview', /Can you call me back today\?/.test(kim.querySelector('.ts-preview').textContent) && /Can you call me back today\?/.test(di.querySelector('.ts-preview').textContent));
  kim.querySelector('.ts-cell[data-k="tue|am"]').click(); await sleep(50);
  ok('...unticking a shift changes only that person\'s text', /: Mon 9am–2pm \(5 hrs a week\)/.test(kim.querySelector('.ts-preview').textContent));
  W2.querySelector('#tsSend').click(); await sleep(600);
  ok('Send: one text per person through team-ask, each with their own shifts and words; nothing for Opal', TS.sends.length===2 && TS.sends.every(b=>b.action==='send' && b.plan_id==='tb_gus' && /^[a-z0-9-]{8,64}$/i.test(b.ask_id)) && TS.sends.some(b=>b.caregiver_axiscare_id==='11' && JSON.stringify(b.cells)==='["mon|am"]' && /^Hi Kim,/.test(b.message)) && TS.sends.some(b=>b.caregiver_axiscare_id==='12' && /^Hi Di,/.test(b.message) && /call me back/.test(b.message)) && !TS.sends.some(b=>/Opal/.test(b.caregiver_name)), TS.sends);
  ok('...it shows each result and the total', /✓ Sent to Kim Aide/.test(W2.innerText) && /✓ Sent to Di Aide/.test(W2.innerText) && /2 of 2 sent/.test(W2.innerText));
  W2.querySelector('#tsX').click(); await sleep(150);
  // from one shift: only that shift is ticked
  tbCell('tue|am'); await sleep(150); TS.sends=[];
  const PP2=root().querySelector('.tb2-people');
  ok('the main person on a shift still has the single Text', PP2 && PP2.querySelector('.tb2-text'));
  tbCell('mon|am'); await sleep(150);
  root().querySelector('.tb2-textall').click(); await sleep(400);
  W2=[...document.querySelectorAll('.tb2-several')].pop();
  const kim2=[...W2.querySelectorAll('.ts-person')].find(r=>/Kim Aide/.test(r.innerText));
  ok('"Text everyone on this shift" ticks only that shift for each person', kim2.querySelector('.ts-cell[data-k="mon|am"]').checked && !kim2.querySelector('.ts-cell[data-k="tue|am"]').checked);
  W2.querySelector('#tsX').click(); await sleep(100);
  TS.live=false; root().querySelector('.tb2-several-btn').click(); await sleep(400);
  W2=[...document.querySelectorAll('.tb2-several')].pop();
  ok('switch off: it says so and Send can\'t be pressed', W2.querySelector('#tsSend').disabled && /switched off/.test(W2.innerText));
  W2.querySelector('#tsX').click(); await sleep(100);
  ok('nothing was texted or emailed outside the faked team-ask', window.__log.fn.length===0 && !window.__log.fetch.some(u=>/team-ask/.test(u)));
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width':1300,'height':1100})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=tb2'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', STUB); pg.evaluate('s=>(0,eval)(s)', DATA)
    R = pg.evaluate(T)
    pg.evaluate('s=>(0,eval)(s)', DATA)
    pg.evaluate("""async()=>{ const p=window.__store.staffing_plans[0]; p.needs=['hoyer_lift','bedbound_care'];
      p.cells={ 'mon|s2':{name:'Kim Aide',cg_ax_id:'11',status:'yes'}, 'tue|s2':{name:'Kim Aide',cg_ax_id:'11',status:'yes'}, 'wed|s2':{name:'Di Aide',cg_ax_id:'12',status:'asked',ask_channel:'sms',at:new Date(Date.now()-3*36e5).toISOString()}, 'mon|s1':{name:'Lo Skill',cg_ax_id:'13',status:'maybe'} };
      p.options={ 'mon|s1':[{id:'o1',name:'Ana New',applicant_id:'a1',status:'penciled'},{id:'o2',name:'Di Aide',cg_ax_id:'12',status:'no'}] };
      DATA.staffing_plans=[JSON.parse(JSON.stringify(p))]; TB2_APPS.rows=[{ id:'a1', first_name:'Ana', last_name:'New', status:'offer', start_date:'2026-10-20' }];
      switchTab('hourswatch'); swSubGo('builder'); tbOpen('tb_ed'); tbCell('mon|s1'); await new Promise(r=>setTimeout(r,400)); window.scrollTo(0, document.getElementById('tbRoot').getBoundingClientRect().top+window.scrollY-10); }""")
    pg.screenshot(path='/tmp/tb2.png', full_page=False)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

"""The on-duty schedule editor (Dashboard, Responsible now, Manage), 2026-10-05: readable day boxes, Edit says what it
is editing and brings the form into view, a handoff can be cleared, and editing Krystal's planned staffing shift to
Mon-Fri 8-2 Live makes her the Staffing holder. Offline, made-up data; nothing is saved.
(python3 tests/browser/duty_editor_look.py, with the static server on 8765)"""
from playwright.sync_api import sync_playwright
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,400)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  (0,eval)("ME={email:'samantha@mo-care.com',name:'Samantha Troutman'}; CC_ROLES=['owner_admin']; CC_ROLES_CHECKED=true; OPS_PEOPLE=[{person_id:'p_k',full_name:'Krystal Land',primary_email:'krystal@mo-care.com'},{person_id:'p_s',full_name:'Samantha Troutman',primary_email:'samantha@mo-care.com'}];");
  const saved=[]; window.persist=async(k,v)=>saved.push(k+':'+v.id);
  DATA.positions=[{id:'pos_staffing_coordinator',title:'Staffing Coordinator',status:'open'}];
  DATA.duty_windows=[
    {id:'dw_plan_kry_staff_mt',area:'staffing',person:'krystal@mo-care.com',active:true,status:'planned',recur:{days:[1,2],from:'08:00',to:'14:00'}},
    {id:'dw_plan_kry_staff_wf',area:'staffing',person:'krystal@mo-care.com',active:true,status:'planned',recur:{days:[3,4,5],from:'08:00',to:'11:00'}},
    {id:'dw_plan_sc_weekday',area:'staffing',position:'pos_staffing_coordinator',active:true,status:'planned',recur:{days:[3,4,5],from:'11:00',to:'19:00'}}];
  switchTab('today'); await sleep(300);
  const wed10=new Date(2026,9,7,10,0);
  ok('before: planned shifts hold no duty (Staffing has nobody on a Wednesday at 10)', !dutyHolder('staffing', wed10));
  dutyEdit(); await sleep(200);
  const pop=[...document.querySelectorAll('.ccpop')].pop();
  const labs=[...pop.querySelectorAll('.dwDay')].map(x=>x.parentElement.getBoundingClientRect().width);
  ok('day boxes are readable: each label has room for its day name', labs.length===7 && labs.every(w=>w>=30) && [...pop.querySelectorAll('.dwDay')].every(x=>x.getBoundingClientRect().width>=12), labs);
  ok('...and each says its day', [...pop.querySelectorAll('.dwDay')].map(x=>x.parentElement.textContent.trim()).join(' ')==='Sun Mon Tue Wed Thu Fri Sat');
  [...pop.querySelectorAll('#dwList button')].find(b=>b.textContent==='Edit').click(); await sleep(150);
  ok('Edit says what is being edited and the button is Save changes', /EDITING: Staffing · Krystal Land/.test(pop.querySelector('#dwFormHead').textContent) && pop.querySelector('#dwAdd').textContent==='Save changes');
  pop.querySelectorAll('.dwDay').forEach(x=>{ x.checked=[1,2,3,4,5].includes(Number(x.value)); });
  pop.querySelector('#dwFrom').value='08:00'; pop.querySelector('#dwTo').value='14:00'; pop.querySelector('#dwStatus').value='live';
  pop.querySelector('#dwHandTo').textContent='Samantha Troutman'; pop.querySelector('#dwHandUntil').value='14:00';
  pop.querySelector('#dwHandClear').click();
  ok('Clear removes a handoff', pop.querySelector('#dwHandTo').textContent==='Nobody (ordinary window)' && pop.querySelector('#dwHandUntil').value==='');
  pop.querySelector('#dwAdd').click(); await sleep(150);
  const old=DATA.duty_windows.find(w=>w.id==='dw_plan_kry_staff_mt'), nu=DATA.duty_windows.find(w=>w.replaced==='dw_plan_kry_staff_mt');
  ok('saving ends the old shift and opens the new one (history kept)', old.active===false && !!old.ended_at && nu && nu.active===true);
  ok('the new shift: Krystal, Staffing, Mon-Fri 8-2, Live, no handoff', nu.person==='krystal@mo-care.com' && nu.area==='staffing' && nu.status==='live' && JSON.stringify(nu.recur)===JSON.stringify({days:[1,2,3,4,5],from:'08:00',to:'14:00'}) && !nu.handoff, nu);
  ok('the form goes back to ADD A WINDOW', pop.querySelector('#dwFormHead').textContent==='ADD A WINDOW' && pop.querySelector('#dwAdd').textContent==='Add');
  [...pop.querySelectorAll('#dwList > div')].find(d=>/Wed Thu Fri 8am to 11am/.test(d.innerText)).querySelector('button:last-child').click(); await sleep(200);
  ok('End it on the old Wed-Fri shift', DATA.duty_windows.find(w=>w.id==='dw_plan_kry_staff_wf').active===false);
  ok('now Krystal holds Staffing on a Wednesday at 10 (and Monday 1:30)', (dutyHolder('staffing', wed10)||{}).person==='krystal@mo-care.com' && (dutyHolder('staffing', new Date(2026,9,5,13,30))||{}).person==='krystal@mo-care.com');
  ok('...not at 3pm or on Saturday', !dutyHolder('staffing', new Date(2026,9,7,15,0)) && !dutyHolder('staffing', new Date(2026,9,10,10,0)));
  ok('the Staffing Coordinator shift stays planned', rowPlanned(DATA.duty_windows.find(w=>w.id==='dw_plan_sc_weekday')));
  ok('the one-time setup now holds her real hours (Mon-Fri 8-2)', PLAN_DUTY.filter(w=>w.person==='krystal@mo-care.com'&&w.area==='staffing').map(w=>w.days.join(',')+' '+w.from+'-'+w.to).join('|')==='1,2,3,4,5 08:00-14:00');
  DATA.duty_windows=DATA.duty_windows.filter(w=>w.area!=='staffing'||!w.person); DATA.ops_settings={coverage_alert_admins:['samantha@mo-care.com']};
  const panel=dutyPanelHtml();
  ok('Responsible now: outside scheduled shifts, Staffing shows the fallback person, not "nobody assigned"', /Staffing<\/span><b>Samantha Troutman<\/b><span class="field-note"> · when nobody is scheduled/.test(panel.replace(/\s+</g,'<')), panel.slice(0,1500));
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1400, 'height': 900})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=duty'); pg.wait_for_timeout(1200)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    pg.screenshot(path='/private/tmp/claude-501/-Users-samantha-Claude/018b1120-923f-4111-b458-44c2e50fd52c/scratchpad/duty_fixed.png'); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

"""Caregivers at a glance (Samantha 2026-11-04, "room for improvement here?" then "build it ... behind a switch"): while
ops_settings.caregivers_glance_live is off everyone keeps the current list and an owner can preview; the preview shows the
four tiles, counts on the filter buttons, labeled columns, the dot key and the upkeep lines under the list; the two tiles
narrow the list; the switch turns it on for a coordinator too. Offline, made-up data, nothing saved.
(PORT=<static server port> python3 tests/browser/caregivers_glance_look.py)"""
import os
from playwright.sync_api import sync_playwright
H = open('/Users/samantha/Claude/Projects/cc-hub-live/.claude/g1a_harness.js').read()
PORT = os.environ.get('PORT', '8811')
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; await sleep(600);
  (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha Troutman' };"); CC_ROLES=['owner_admin']; CC_ROLES_CHECKED=true; CC_ROLE_BY_EMAIL['samantha@mo-care.com']=['owner_admin'];
  try{ localStorage.removeItem('cgGlance'); }catch(e){}
  const ago=d=>new Date(Date.now()-d*864e5).toISOString().slice(0,10);
  CGD.census={ caregivers:[
    { id:'1', first:'Makala', last:'Adkins', city:'Ozark', mobile:'417-403-3030', hire_date:ago(150), classes:['Level 3'], active:true, status_label:'Active' },
    { id:'2', first:'Kim', last:'Fakename', city:'Springfield', mobile:'971-313-4667', hire_date:ago(1500), classes:['Level 2'], active:true, status_label:'Active' },
    { id:'3', first:'Robin', last:'Barclay', city:'Fair Grove', mobile:'417-766-8511', hire_date:ago(20), classes:['Level 2'], active:true, status_label:'Active' },
    { id:'4', first:'Newt', last:'Hire', city:'Ava', mobile:'', hire_date:ago(3), classes:[], active:true, status_label:'In Training' },
    { id:'5', first:'Old', last:'Timer', city:'Ozark', mobile:'', hire_date:ago(3000), classes:['Level 1'], active:false, status_label:'Terminated' } ], at:Date.now() };
  CGD.at=Date.now(); CGD.filter='active'; CGD.q='';
  DATA.caregiver_availability=[{ axiscare_id:'1', target_hours:40, updated_at:ago(9) },{ axiscare_id:'2', target_hours:30, updated_at:ago(9) }];
  DATA.ops_settings=Object.assign({}, DATA.ops_settings||{}, { caregivers_glance_live:false });
  HW_SCHED={ '1':36, '2':9, '3':0 };
  switchTab('cgdir'); await sleep(250); cgdRenderList(); await sleep(150);
  const txt=id=>(document.getElementById(id)||{}).innerText||'';
  ok('off: no tiles, the current list', !document.querySelector('.cgg-tiles') && !document.querySelector('.cgg-row'), txt('cgdGlance'));
  ok('off: the owner sees a preview link', /Preview the new Caregivers look/.test(txt('cgdCount')), txt('cgdCount'));
  CGG.preview(true); await sleep(150);
  const tiles=[...document.querySelectorAll('.cgg-tile')].map(t=>t.innerText.replace(/\s+/g,' ').trim());
  ok('preview: four tiles', tiles.length===4, tiles);
  ok('tile 1: 3 active, by level', /Active caregivers 3 L1 0 · L2 2 · L3 1/.test(tiles[0]), tiles[0]);
  ok('tile 2: 45 h scheduled, % of wanted', /45 h/.test(tiles[1]) && /64% of the hours they want/.test(tiles[1]) && /1 haven't said/.test(tiles[1]), tiles[1]);
  ok('tile 3: 2 want more hours (Kim 21 h short, Makala 4 h)', /Want more hours 2/.test(tiles[2]), tiles[2]);
  ok('tile 4: 1 with nothing scheduled', /Nothing on the schedule 1/.test(tiles[3]), tiles[3]);
  const pills=[...document.querySelectorAll('#cgdFilters .filter-pill')].map(b=>b.innerText.replace(/\s+/g,'').trim());
  ok('counts on the filter buttons', pills.includes('Active3') && pills.includes('Onboarding(InTraining)1') && pills.includes('Inactive1') && pills.includes('Needsattention3'), pills);
  const hd=(document.querySelector('.cgg-row.hd')||{}).innerText||'';
  ok('labeled columns', /Caregiver/.test(hd)&&/Town/.test(hd)&&/Next 7 days/.test(hd)&&/With us/.test(hd)&&/Phone/.test(hd), hd);
  const rows=[...document.querySelectorAll('.cgg-row.cg')].map(r=>r.innerText.replace(/\s+/g,' ').trim());
  ok('Kim: 9 of 30 h, wants 21 h more, 4 yrs', rows.some(r=>/Kim Fakename/.test(r)&&/9 of 30 h/.test(r)&&/wants 21 h more/.test(r)&&/4 yrs/.test(r)), rows);
  ok('Robin: none scheduled, goal not set, new', rows.some(r=>/Robin Barclay/.test(r)&&/none/.test(r)&&/goal not set/.test(r)&&/new/.test(r)), rows);
  ok('a key explains the dots', /checks recorded/.test(txt('cgdList')) && /background issue/.test(txt('cgdList')), txt('cgdList').slice(0,200));
  const up=document.getElementById('cggUpkeep');
  ok('upkeep lines moved under the list', up && up.contains(document.getElementById('cgaxLine')) && up.contains(document.getElementById('cgcLine')));
  CGG.pick('wantmore'); await sleep(120);
  let names=[...document.querySelectorAll('.cgg-row.cg b')].map(b=>b.innerText);
  ok('Want more hours: biggest gap first (Kim, then Makala)', JSON.stringify(names)==='["Kim Fakename","Makala Adkins"]', names);
  CGG.pick('nosched'); await sleep(120);
  names=[...document.querySelectorAll('.cgg-row.cg b')].map(b=>b.innerText);
  ok('Nothing on the schedule tile narrows to Robin', JSON.stringify(names)==='["Robin Barclay"]', names);
  CGG.pick('nosched'); await sleep(120);
  ok('tapping again goes back to Active', CGD.filter==='active' && document.querySelectorAll('.cgg-row.cg').length===3);
  CGG.preview(false); await sleep(120);
  ok('preview off: current list back, counts gone, upkeep back on top', !document.querySelector('.cgg-tiles') && !document.querySelector('.cgg-n')
     && document.getElementById('cgaxLine').nextElementSibling===document.getElementById('cgdList'));
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal' };"); CC_ROLES=['coordinator']; CC_ROLE_BY_EMAIL['krystal@mo-care.com']=['coordinator'];
  cgdRenderList(); await sleep(100);
  ok('a coordinator gets no preview link', !/Preview the new/.test(txt('cgdCount')), txt('cgdCount'));
  DATA.ops_settings.caregivers_glance_live=true; cgdRenderList(); await sleep(150);
  ok('switch on: a coordinator sees the tiles, no preview banner', document.querySelectorAll('.cgg-tile').length===4 && !document.querySelector('.cgg-pv'));
  (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha Troutman' };"); CC_ROLES=['owner_admin']; DATA.ops_settings.caregivers_glance_live=false; CGG.preview(true);
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1300, 'height': 900})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(f'http://localhost:{PORT}/index.html?proof=cgglance'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', H)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    pg.wait_for_timeout(300)
    pg.screenshot(path=os.environ.get('SHOT', '/tmp/caregivers_glance.png'), full_page=False); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

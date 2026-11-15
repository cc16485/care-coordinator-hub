"""Performance > Caregivers (Samantha 2026-11-14): the Performance tab inside Caregivers opens on one row per working
caregiver with counts from the record for the last 90 days; no score. Formal records show for owners only; a bare #hr
link still opens Zach's dashboard; a row opens the profile on Performance. Offline, made-up people, nothing saved.
(PORT=<static server port> python3 tests/browser/perf_people_look.py)"""
import os
from playwright.sync_api import sync_playwright
H = open('/Users/samantha/Claude/Projects/cc-hub-live/.claude/g1a_harness.js').read()
PORT = os.environ.get('PORT', '8843')
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; await sleep(600);
  const as=(email,name,roles)=>{ (0,eval)("ME={ email:'"+email+"', name:'"+name+"' };"); CC_ROLES=roles; CC_ROLES_CHECKED=true; CC_ROLE_BY_EMAIL[email]=roles; };
  as('samantha@mo-care.com','Samantha Troutman',['owner_admin']);
  const ago=n=>new Date(Date.now()-n*864e5).toISOString().slice(0,10);
  const cen={ caregivers:[
    { id:'11', first:'Dana', last:'Reed', active:true, status_label:'Active', hire_date:ago(20) },
    { id:'12', first:'Old', last:'Hand', active:true, status_label:'Active', hire_date:'2021-03-01' },
    { id:'13', first:'Lena', last:'Kim', active:true, status_label:'Active', hire_date:'2024-01-10' },
    { id:'14', first:'Still', last:'Training', active:true, status_label:'In Training', hire_date:ago(3) },
    { id:'15', first:'Gone', last:'Away', active:false, status_label:'Inactive' } ] };
  (0,eval)("cgdCensus=async function(){ CGD.census=window.__CEN; CGD.at=Date.now(); return CGD.census; }"); window.__CEN=cen;
  DATA.attendance_events=[
    { axiscare_caregiver_id:'12', type:'callin', shift_date:ago(5) }, { axiscare_caregiver_id:'12', type:'callin', shift_date:ago(40) },
    { axiscare_caregiver_id:'12', type:'tardy', shift_date:ago(10) }, { axiscare_caregiver_id:'12', type:'callin', shift_date:ago(200) },
    { caregiver:'Lena Kim', type:'ncns', shift_date:ago(8) }, { axiscare_caregiver_id:'13', type:'evv_missing_in', shift_date:ago(2) },
    { axiscare_caregiver_id:'99', caregiver:'Dana Reed', type:'callin', shift_date:ago(2) } ];
  DATA.discipline_actions=[{ id:'w1', axiscare_caregiver_id:'12', caregiver:'Old Hand', level:'Verbal Warning', status:'draft' }];
  window.__CO=[{ id:'c1', axiscare_caregiver_id:'12', caregiver:'Old Hand', status:'open', kind:'coaching', due_on:ago(-3), assigned_to:'krystal@mo-care.com' },
               { id:'c2', axiscare_caregiver_id:'12', caregiver:'Old Hand', status:'done', kind:'coaching', due_on:ago(30), assigned_to:'krystal@mo-care.com' }];
  window.__KW=[{ id:'k1', about:'Dana R.', link:null }, { id:'k2', about:'', link:{ type:'caregiver', id:'13' } }];
  const q=(t)=>new Proxy(function(){}, { get(_,k){ if(k==='then') return (a,b)=>Promise.resolve({ data: t==='hr_coaching'?window.__CO : t==='kind_words'?window.__KW : (t==='app_data'?null:[]), error:null }).then(a,b); return ()=>q(t); } });
  sb.from=q;
  try{ localStorage.removeItem('cch_hr_view'); }catch(e){}
  switchTab('hr'); await sleep(1500);
  const box=()=>document.getElementById('hrView');
  const names=()=>[...document.querySelectorAll('.hr-ppl tbody tr td:first-child b')].map(x=>x.textContent);
  ok('the Performance tab opens on the caregiver list', /How each caregiver is doing/.test(box().innerText) && document.querySelector('.hr-item.on .hr-item-label').textContent==='Caregivers', box().innerText.slice(0,200));
  ok('only working caregivers: nobody In Training or inactive', JSON.stringify(names().slice().sort())===JSON.stringify(['Dana Reed','Lena Kim','Old Hand']), names());
  ok('most call-ins, late arrivals and no-shows first', names().join('|')==='Old Hand|Lena Kim|Dana Reed', names());
  const row=n=>[...document.querySelectorAll('.hr-ppl tbody tr')].find(r=>r.innerText.includes(n)).innerText.replace(/\s+/g,' ');
  ok('Old Hand: 2 call-ins and 1 late in 90 days (the one from 200 days ago is left out), 1 open and 1 done coaching, 1 formal record', /Old Hand 2 1 0 0 1 open, 1 done 0 .* 1$/.test(row('Old Hand')), row('Old Hand'));
  ok('Lena Kim: a no-show matched by name, a missed clock-in by number, one kind word by link', /Lena Kim 0 0 1 1 0 1 /.test(row('Lena Kim')), row('Lena Kim'));
  ok("Dana Reed: someone else's record with her name but another number is not hers; First L. kind word is; shows her day", /Dana Reed ?day (19|20) 0 0 0 0 0 1 /.test(row('Dana Reed')), row('Dana Reed'));
  ok('four numbers on top', /Working caregivers\s*3/.test(box().innerText) && /no-show\s*2/.test(box().innerText) && /With open coaching\s*1/.test(box().innerText) && /With kind words\s*2/.test(box().innerText), box().innerText.slice(0,300));
  ok('it says these are facts, not a rating', /facts, not a rating/.test(box().innerText));
  ok('owners see the Formal records column', /Formal records/.test(document.querySelector('.hr-ppl thead').innerText));
  ok('Last check-in shows ? until the check-ins have loaded', /\?/.test(row('Dana Reed').split(' 1 ').pop()), row('Dana Reed'));
  window.CHK=window.CHK||{}; CHK.VIEW=CHK.VIEW||{}; CHK.VIEW.data={ people:[{ axiscare_id:'11', name:'Dana Reed', day:19, checkins:[{ id:'o1', sent_at:new Date(Date.now()-2*864e5).toISOString(), label:'First shift', reply:{ at:new Date().toISOString(), text:'good' } }] }] };
  await sleep(1300);
  ok('when the check-ins land, the column fills in by itself', /answered/.test(row('Dana Reed')) && /none yet/.test(row('Old Hand')), [row('Dana Reed'), row('Old Hand')]);
  HR.pplSort('name'); await sleep(100);
  ok('pressing Caregiver sorts by last name', names().join('|')==='Old Hand|Lena Kim|Dana Reed', names());
  HR.pplFind('lena'); await sleep(100);
  ok('the search box narrows the list', names().join('|')==='Lena Kim' && /1 of 3/.test(box().innerText), names());
  HR.pplFind(''); await sleep(50);
  let opened=null; (0,eval)("cgdOpenProfile=async function(a,t){ window.__OP=[a,t]; }");
  document.querySelector('.hr-ppl tbody tr').click(); await sleep(400);
  ok("pressing a row opens that caregiver's profile on Performance", JSON.stringify(window.__OP)===JSON.stringify(['12','performance']) && activeTab==='cgdir', [window.__OP, activeTab]);
  location.hash='#mywork'; await sleep(150); location.hash='#hr'; await sleep(700);
  ok("a bare #hr link (Zach's alert) opens his dashboard", activeTab==='hr' && /Here is what needs you/.test(box().innerText), [activeTab, box().innerText.slice(0,120)]);
  switchTab('mywork'); await sleep(100); switchTab('hr'); await sleep(400);
  ok('coming back to the tab stays where you were', /Here is what needs you/.test(box().innerText));
  as('krystal@mo-care.com','Krystal Land',['care_coordinator']); CC_ROLE_BY_EMAIL['samantha@mo-care.com']=[]; 
  HR.go('people'); await sleep(900);
  ok('a coordinator sees the list without the Formal records column or the owner note', names().length===3 && !/Formal records/.test(box().innerText), box().innerText.slice(0,400));
  ok('a coordinator still has no owner pages in the menu', ![...document.querySelectorAll('.hr-item-label')].some(x=>/dashboard|Formal cases|Terminations/.test(x.textContent)), [...document.querySelectorAll('.hr-item-label')].map(x=>x.textContent));
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1300, 'height': 760})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(f'http://localhost:{PORT}/index.html?proof=perfpeople'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', H)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    if os.environ.get('SHOT'):
        pg.evaluate("()=>{ (0,eval)(\"ME={ email:'samantha@mo-care.com', name:'Samantha Troutman' };\"); CC_ROLES=['owner_admin']; CC_ROLE_BY_EMAIL['samantha@mo-care.com']=['owner_admin']; HR.pplSort('events'); HR.go('people'); }"); pg.wait_for_timeout(900)
        pg.screenshot(path=os.environ['SHOT'])
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

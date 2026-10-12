"""New hires waiting for hours (2026-10-12, her ask + "B"): one card at the top of Cara, Hours & matching (who, when hired,
hours scheduled vs wanted, their availability or "assumed any time"), its count on the tab, Find them hours opens the open
shifts, and the same people are tagged and first among equal fits in Cara's ask list and the Team Builder list. Locked
new hires are not on it. Offline; reads only. (python3 tests/browser/new_hires_look.py, static server on PORT)"""
import os
from playwright.sync_api import sync_playwright
PORT = os.environ.get('PORT', '8765')
H = open('/Users/samantha/Claude/Projects/cc-hub-live/.claude/g1a_harness.js').read()
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; await sleep(500);
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Land' };"); CC_ROLES=['owner_admin']; CC_ROLES_CHECKED=true;
  const of=window.fetch; window.fetch=async(u,o)=>{ if(/supabase|functions\/v1/.test(String(u))) return new Response(JSON.stringify({ rows:[], start:'2026-10-12', end:'2026-10-18' }),{status:200}); return of(u,o); };
  TB.loading=false; TB.pool=[
    { name:'Oscar Oldhand', axiscare_id:'1', city:'Ozark', windows:null, visits:[], new_hire:null },
    { name:'Nina Newhire', axiscare_id:'2', city:'Nixa', windows:{ mon:['morning','afternoon'], wed:['morning','afternoon'], fri:['evening'] }, target_hours:30, visits:[],
      new_hire:{ hired:'2026-10-02', days:10, scheduled_14d:0, target_week:30 } },
    { name:'Lee Later', axiscare_id:'3', city:'Ozark', windows:null, visits:[], new_hire:{ hired:'2026-10-09', days:3, scheduled_14d:4, target_week:null } },
    { name:'Lock Ed', axiscare_id:'4', windows:null, visits:[], work_locked:true, new_hire:{ hired:'2026-10-11', days:1, scheduled_14d:0, target_week:null } } ];
  schedGo('coverage'); covSubGo('hours'); await sleep(300);
  const card=document.getElementById('nhCard'), t=card.innerText;
  ok('the card sits at the top of Hours & matching', !!card && card.closest('#swHoursWrap') && card.nextElementSibling && card.nextElementSibling.id==='ssRoot' && /New hires waiting for hours/.test(t));
  ok('it lists the two new hires who need hours, longest waiting first; not the old hand, not the locked new hire', /Nina Newhire[\s\S]*Lee Later/.test(t) && !/Oscar/.test(t) && !/Lock Ed/.test(t), t.slice(0,600));
  ok('Nina: hired Oct 2 (10 days ago), Nixa, nothing scheduled, wants 30 a week', /hired Oct 2 \(10 days ago\) · Nixa/.test(t) && /nothing scheduled in the next 2 weeks · wants 30 h a week/.test(t), t.slice(0,600));
  ok('her availability in words', /Mon, Wed: mornings, daytimes · Fri: evenings/.test(t), t.slice(0,800));
  ok('Lee: 4 hours scheduled, no form: "assumed available any time" (her rule)', /4 h in the next 2 weeks/.test(t) && /No availability on file: assumed available any time/.test(t));
  const subs=[...document.querySelectorAll('#covSubBar button')].map(b=>b.textContent.trim());
  ok('the Hours & matching tab shows the count (2)', subs.some(s=>/Hours & matching\s*2/.test(s)), subs);
  [...card.querySelectorAll('button')].find(b=>/Find them hours/.test(b.textContent)).click(); await sleep(300);
  ok('Find them hours opens the Live Schedule week with only open shifts', activeTab==='liveschedule' && LC.open===true && LC.view==='week', [activeTab, LC.open, LC.view]);
  /* Cara's ask list: the tag */
  DATA.coverage_cases=[{ id:'cv1', status:'open', reason:'calloff', client:'Ruth Kay', shift_date:'2099-10-20', shift_time:'09:00-13:00', asked:[] }];
  COV_PICK['cv1']={ data:{ group0:[], group1:[], group2:[{ name:'Nina Newhire', first:'Nina', axiscare_id:'2', new_hire:{ hired:'2026-10-02', days:10 }, free_then:true, why:'active caregiver' }, { name:'Oscar Oldhand', first:'Oscar', axiscare_id:'1', why:'active caregiver' }], prn_other:[], prn_ongoing:[], excluded:[], meta:{} } };
  const ph=document.createElement('div'); ph.innerHTML=covPickerHtml(DATA.coverage_cases[0]);
  ok('Cara\'s ask list tags her "new hire, needs hours"', /Nina Newhire[\s\S]*new hire, needs hours/.test(ph.innerText) && !/Oscar Oldhand[^\n]*new hire/.test(ph.innerText), ph.innerText.slice(0,500));
  /* Team Builder list: first among equal fits, tagged */
  const plan={ id:'tbN', client:'Mary Ex', city:'Branson', days:['mon'], slots:[{ k:'s1', label:'Shift 1', start:'09:00', end:'13:00' }], cells:{} };
  DATA.staffing_plans=[plan]; TB.planId='tbN'; TB.poolQ='';
  TB.pool=TB.pool.map(p=>Object.assign({},p,{ windows:null }));   // nobody has a form: all fit the same
  const pl=document.createElement('div'); pl.innerHTML=tbPoolListHtml(plan,'mon|s1');
  const names=[...pl.querySelectorAll('div')].map(d=>d.innerText).filter(x=>/Newhire|Oldhand|Later/.test(x)).map(x=>x.split('\n')[0]);
  ok('Team Builder list: new hires who need hours come first when everyone fits the same, tagged', /new hire, needs hours/.test(pl.innerText) && pl.innerText.indexOf('Nina Newhire') < pl.innerText.indexOf('Oscar Oldhand') && pl.innerText.indexOf('Lee Later') < pl.innerText.indexOf('Oscar Oldhand'), pl.innerText.slice(0,600));
  ok('...a locked new hire keeps the lock warning, not the tag', /Lock Ed[\s\S]{0,300}awaiting Approve to Work/.test(pl.innerText) && !/Lock Ed[^\n]{0,80}new hire, needs hours/.test(pl.innerText), '');
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1300, 'height': 1000})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(f'http://localhost:{PORT}/index.html?proof=newhires'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', H)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    pg.evaluate("()=>{ schedGo('coverage'); covSubGo('hours'); window.scrollTo(0,0); }"); pg.wait_for_timeout(300)
    pg.screenshot(path=os.environ.get('SHOT', '/tmp/new_hires.png')); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

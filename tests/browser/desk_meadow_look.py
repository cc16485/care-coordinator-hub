"""My Desk, the Meadow look (2026-10-18, Samantha: "build the Meadow look as shown: default for everyone, old mats stay in
Make it yours, all three fun moments"). The real Hub page, offline, made-up people and lines; the desk's database is the
pretend one from my_desk_look.py, so nothing is saved anywhere and nobody is texted or emailed.
(python3 tests/browser/desk_meadow_look.py; HUB_PORT=<port of a static server on this folder>, default 8765;
SHOT=dir saves screenshots)"""
import os, re, sys
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
STUB = re.search(r'STUB = r"""(.*?)"""', open(os.path.join(HERE, 'my_desk_look.py')).read(), re.S).group(1)
PORT = os.environ.get('HUB_PORT', '8765'); SHOT = os.environ.get('SHOT', '')
T = r"""
async()=>{
  const R=window.__R=window.__R||[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const db=window.__db, X=window.DKX, today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Chicago'});
  const W=()=>document.getElementById('dkWrap'), mat=()=>W().querySelector('#dkMat');
  const phase=window.__phase=(window.__phase||0)+1;
  if(phase===1){
  window.dkStore=window.__fakeStore;
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Land', shift:'day' };");
  ['Call Linda Martin\'s son at 2 (fake)', 'Check tomorrow\'s open shift (fake)', 'Order gloves (fake)'].forEach((b, i) =>
    db.desk_lines.push({ id:'t' + i, person_id:'p_k', place:'day', day:today, pos:i + 1, kind:'todo', body:b, origin_day:today, rev:1 }));
  switchTab('mydesk'); await sleep(500);
  ok('no mat chosen: the desk is Meadow', mat() && mat().classList.contains('dk-mat-meadow'), mat() && mat().className);
  ok('Meadow has its sky: hills with two lit houses and the sun', !!mat().querySelector(':scope > .dk-hills') && mat().querySelectorAll('.dk-hills .dk-lit').length >= 2 && !!mat().querySelector(':scope > .dk-sun'));
  const bg=getComputedStyle(mat()).backgroundImage;
  ok('the felt is gone: a pale sky gradient', /linear-gradient/.test(bg) && !/repeating-radial/.test(bg), bg.slice(0, 160));
  ok('the planner page has a navy outline', getComputedStyle(W().querySelector('.dk-page')).borderTopColor === 'rgb(13, 54, 95)');
  ok('the Later tab is the hill color', getComputedStyle(W().querySelector('.dk-ptab[data-dk="later"]')).backgroundColor === 'rgb(202, 221, 217)', getComputedStyle(W().querySelector('.dk-ptab[data-dk="later"]')).backgroundColor);
  ok('sticky pad labels read on the sky (not white)', getComputedStyle(W().querySelector('.dk-plabel')).color !== 'rgba(255, 255, 255, 0.92)');
  ok('the motto is the usual one while there is work', !/All crossed off/.test(W().querySelector('.dk-motto').textContent) && !W().querySelector('.dk-porch'));
  ok('no season on the hills while seasons are off', !mat().querySelector('.dk-sea'));
  return 'desk'; }
  if(phase===2){

  /* Make it yours: Meadow first and chosen; the old mats are still there */
  document.querySelector('.dk-cup').click(); await sleep(200);
  const prefs=[...document.querySelectorAll('[data-pk="mat"]')].map(b => b.dataset.pv + (b.classList.contains('dk-on') ? '*' : ''));
  ok('Make it yours: Meadow first and chosen; teal, navy, sage and cork still offered', prefs.join() === 'meadow*,teal,navy,sage,cork', prefs);
  document.querySelector('[data-pk="mat"][data-pv="teal"]').click(); await sleep(250); try{ ccPopClose(); }catch(e){}
  ok('picking Teal felt saves it and the desk turns teal, without the sky', db.desk_settings[0] && db.desk_settings[0].mat === 'teal' && mat().classList.contains('dk-mat-teal') && !mat().querySelector('.dk-hills'));
  ok('the teal page keeps its old look (no navy outline)', getComputedStyle(W().querySelector('.dk-page')).borderTopStyle === 'none');
  db.desk_settings[0].mat = 'meadow'; await X.load(true); await sleep(250);
  ok('back to Meadow', mat().classList.contains('dk-mat-meadow'));

  /* the season, when the owners have seasons on */
  DATA.ops_settings.seasons_live = true; X.render(); await sleep(150);
  const sea=mat().querySelector('.dk-sea');
  ok('seasons on: the season sits on the hills', !!sea && ['autumn', 'winter', 'spring', 'summer'].includes(sea.dataset.season) && sea.children.length >= 9, sea && sea.outerHTML.slice(0, 200));
  DATA.ops_settings.seasons_live = false;

  /* every to-do crossed off: the page gets its stamp and the porch */
  db.desk_lines.forEach(l => { l.done_at = new Date().toISOString(); l.rev++; });
  db.desk_pages.push({ person_id:'p_k', day:today, stamp:'a' }); await X.load(true); await sleep(300);
  ok('all crossed off: the porch with the lights on', !!W().querySelector('.dk-porch .hs-svg'));
  ok('...and the motto says so', /All crossed off\. Enjoy the quiet\./.test(W().querySelector('.dk-motto').textContent));
  return 'porch'; }
  if(phase===3){

  /* Friday: the road, a flag for each finished page */
  const mon=X.prevBiz(X.prevBiz(X.prevBiz(X.prevBiz(today)))), days=[0,1,2,3,4].map(k => { let d=mon; for(let i=0;i<k;i++) d=X.nextBiz(d); return d; });
  db.desk_pages.push({ person_id:'p_k', day:days[1], stamp:'b' }); await X.load(true); await sleep(150);
  const road=X.weekRoad(days);
  ok('Friday road: five signposts, a flag for each finished page, words only', (road.match(/<line /g) || []).length === 5 && (road.match(/fill="#F0A63A" stroke="#0D365F" stroke-width="1.6"/g) || []).length === days.filter(d => db.desk_pages.some(p => p.day === d && p.stamp)).length && !/\d+ (lines|done|crossed)/.test(road));

  /* the month view and Everyone's desks are Meadow too */
  W().querySelector('.dk-ptab[data-dk="month"]').click(); await sleep(300);
  ok('Month: the same sky', mat().classList.contains('dk-mat-meadow') && !!mat().querySelector('.dk-hills'));
  ok('a desk nobody chose a mat for is Meadow on Everyone\'s desks', X.matOf(undefined) === 'meadow' && X.matOf('cork') === 'cork' && X.matOf('nonsense') === 'meadow');
  return 'month'; }
  return 'done';
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={ 'width':1400, 'height':1000 })
    pg.route('**/*', lambda r: r.abort() if ('supabase.co' in r.request.url or 'fonts.g' in r.request.url) else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:' + PORT + '/index.html?proof=meadow'); pg.wait_for_timeout(1200)
    pg.evaluate(STUB)
    for _ in range(3):
        name = pg.evaluate(T)
        if SHOT: os.makedirs(SHOT, exist_ok=True); pg.screenshot(path=os.path.join(SHOT, 'desk-meadow-' + str(name) + '.png'))
    R = pg.evaluate('()=>window.__R')
    # the reduced-motion promise: with reduced motion asked for, the twinkle has no time to run
    pg.emulate_media(reduced_motion='reduce'); pg.wait_for_timeout(100)
    dur = pg.evaluate("()=>{ const e=document.querySelector('.dk-mat-meadow .dk-lit'); return e ? getComputedStyle(e).animationDuration : 'none'; }")
    R = R + [['PASS' if dur in ('0.001s', '1e-03s', 'none') or dur.startswith('0.001') else 'FAIL', 'reduced motion: the houses do not twinkle', dur]]
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] and r[0] == 'FAIL' else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

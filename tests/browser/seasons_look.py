"""Seasons and moments (2026-10-18, fun step 4, her "build step 4 as shown"): with ops_settings.seasons_live the top bar
gets one minute of the season's weather once a day and the Dashboard greeting a small scene; with anniversaries_live the
Dashboard lists this week's caregiver work anniversaries (AxisCare hire dates) and the caregiver's page shows a banner.
Both off = nothing. The real page, offline, made-up people. (python3 tests/browser/seasons_look.py; SHOT=dir)"""
import os, re, sys, mimetypes
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
STUB = re.search(r'STUB = r"""(.*?)"""', open(os.path.join(HERE, 'standup_look.py')).read(), re.S).group(1)
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  try{
  try{ localStorage.clear(); }catch(e){}
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  ok('seasons.js loaded', !!window.SEA);
  ok('season by the calendar', SEA.seasonOf('2026-10-18')==='autumn' && SEA.seasonOf('2026-12-01')==='winter' && SEA.seasonOf('2027-02-28')==='winter' && SEA.seasonOf('2027-03-01')==='spring' && SEA.seasonOf('2027-07-04')==='summer');
  const a=SEA.annivIn('2023-10-23','2026-10-19','2026-10-25'), b=SEA.annivIn('2026-10-20','2026-10-19','2026-10-25'), c=SEA.annivIn('2024-02-29','2027-02-22','2027-02-28');
  ok('anniversary maths: 3 years this week; hired this week is not an anniversary; Feb 29 counts on Feb 28', a&&a.years===3&&a.day==='2026-10-23' && b===null && c&&c.day==='2027-02-28'&&c.years===3, [a,b,c]);
  ok('anniversary across New Year', (SEA.annivIn('2025-01-01','2025-12-29','2026-01-04')||{}).years===1 && (SEA.annivIn('2024-01-02','2025-12-29','2026-01-04')||{}).years===2);

  const today=new Date().toLocaleString('sv-SE',{timeZone:'America/Chicago'}).slice(0,10);
  const yrsAgo=(n,off)=>{ const d=new Date(today+'T12:00:00Z'); d.setUTCFullYear(d.getUTCFullYear()-n); d.setUTCDate(d.getUTCDate()+(off||0)); return d.toISOString().slice(0,10); };
  const census={ caregivers:[ { id:'11', first:'Maya', last:'Cole', active:true, hire_date:yrsAgo(3) }, { id:'12', first:'Dee', last:'Dawson', active:true, hire_date:yrsAgo(1) },
    { id:'13', first:'Old', last:'Gone', active:false, hire_date:yrsAgo(5) }, { id:'14', first:'New', last:'Hire', active:true, hire_date:yrsAgo(0) }, { id:'15', first:'Far', last:'Off', active:true, hire_date:yrsAgo(2,60) } ] };
  window.cgdCensus=async()=>census; (0,eval)('cgdCensus=window.cgdCensus');

  /* ── both off ── */
  DATA.ops_settings=Object.assign({}, DATA.ops_settings||{}, { seasons_live:false, anniversaries_live:false });
  switchTab('today'); await sleep(300); renderOverviewTop(0,0); await sleep(80);
  ok('off · no weather, no scene, no anniversaries', !document.querySelector('header.topbar .sea-fx') && !document.getElementById('seaScene') && !document.getElementById('seaAnniv'));

  /* ── seasons on ── */
  DATA.ops_settings.seasons_live=true; renderOverviewTop(0,0); await sleep(80);
  const fx=document.querySelector('header.topbar .sea-fx');
  ok('seasons · the top bar gets the season\'s weather', !!fx && fx.querySelectorAll('i').length===18 && fx.getAttribute('aria-hidden')==='true');
  ok('seasons · a scene by the greeting, the greeting words unchanged', !!document.querySelector('#todayHeading #seaScene svg') && /^Good (morning|afternoon|evening)/.test(document.getElementById('todayHeading').textContent));
  ok('seasons · the top bar\'s own content stays clickable above the weather', getComputedStyle(fx).pointerEvents==='none');
  fx.remove(); renderOverviewTop(0,0); await sleep(30);
  ok('seasons · the weather comes once a day, not on every redraw', !document.querySelector('header.topbar .sea-fx') && !!document.getElementById('seaScene'));
  DATA.ops_settings.seasons_live=false; renderOverviewTop(0,0); await sleep(30);
  ok('seasons · turned off: the scene goes', !document.getElementById('seaScene'));

  /* ── anniversaries on ── */
  DATA.ops_settings.anniversaries_live=true; renderOverviewTop(0,0); await sleep(120);
  const card=document.getElementById('seaAnniv'), t=card?card.innerText:'';
  ok('anniversaries · the Dashboard card lists this week, active caregivers only', /Anniversaries this week/.test(t) && /Maya Cole · 3 years with us/.test(t) && /Dee Dawson · 1 year with us/.test(t) && !/Old Gone/.test(t) && !/New Hire/.test(t) && !/Far Off/.test(t), t);
  ok('anniversaries · each row opens their page', (card.innerHTML.match(/Open their page/g)||[]).length===2 && /cgdOpenProfile\('11'\)/.test(card.innerHTML));
  ok('anniversaries · the banner for the caregiver\'s page', /3 years with Caring Companions today/.test(SEA.profileBanner(census.caregivers[0])) && /Nothing is sent to them/.test(SEA.profileBanner(census.caregivers[0])) && SEA.profileBanner(census.caregivers[4])==='');
  window.cgdCensus=async()=>({ caregivers:[census.caregivers[4]] }); (0,eval)('cgdCensus=window.cgdCensus'); renderOverviewTop(0,0); await sleep(120);
  ok('anniversaries · nobody this week: no card', !document.getElementById('seaAnniv'));
  window.cgdCensus=async()=>{ throw new Error('census down'); }; (0,eval)('cgdCensus=window.cgdCensus'); renderOverviewTop(0,0); await sleep(120);
  ok('anniversaries · census unreachable: no card, no error', !document.getElementById('seaAnniv'));
  window.cgdCensus=async()=>census; (0,eval)('cgdCensus=window.cgdCensus');
  DATA.ops_settings.anniversaries_live=false;
  ok('anniversaries · off: no banner', SEA.profileBanner(census.caregivers[0])==='');

  const src=async f=>(await (await window.__origFetch(f+'?x='+Date.now())).text()); const ih=await src('index.html');
  ok('wired · Dashboard, caregiver page, script tag', /if\(window\.SEA\) SEA\.onDashboard\(\);/.test(ih) && /SEA\.profileBanner\(c\)/.test(ih) && /<script src="seasons\.js\?v=1">/.test(ih));
  }catch(e){ R.push(['FAIL','threw',String(e&&e.stack||e).slice(0,500)]); }
  return R;
}
"""
def serve(route):
    path = route.request.url.split('://', 1)[1].split('/', 1)[1].split('?')[0] or 'index.html'
    f = os.path.join(ROOT, path)
    if os.path.isfile(f): route.fulfill(path=f, content_type=mimetypes.guess_type(f)[0] or 'application/octet-stream')
    else: route.fulfill(status=404, body='')
sys.path.insert(0, HERE)
from clock_pin import pin
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1300, 'height': 900})
    pin(pg)
    pg.route('**/*', lambda r: serve(r) if r.request.url.startswith('http://hub.test/') else (r.abort() if 'supabase.co' in r.request.url else r.continue_()))
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://hub.test/index.html?proof=seasons'); pg.wait_for_timeout(1500)
    pg.evaluate('window.__origFetch=window.fetch.bind(window)')
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    shot = os.environ.get('SHOT')
    if shot:
        os.makedirs(shot, exist_ok=True)
        pg.evaluate("async()=>{ localStorage.clear(); DATA.ops_settings.seasons_live=true; DATA.ops_settings.anniversaries_live=true; window.scrollTo(0,0); renderOverviewTop(0,0); }")
        pg.wait_for_timeout(1800)
        pg.screenshot(path=os.path.join(shot, 'dashboard-autumn.png'), clip={'x': 0, 'y': 0, 'width': 1300, 'height': 640})
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

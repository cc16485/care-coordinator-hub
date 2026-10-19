"""Progress you can see (2026-10-18, fun step 3, her "build step 3 as shown"): Start of Care as stepping stones (the same
nine pick buttons), a person's stages as a road, and the first two weeks as a sun for each day (only this client's
visits, only with the whole fortnight in hand). The real page, offline, made-up people.
(python3 tests/browser/progress_paths_look.py; SHOT=dir saves screenshots)"""
import os, re, sys, mimetypes
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
STUB = re.search(r'STUB = r"""(.*?)"""', open(os.path.join(HERE, 'standup_look.py')).read(), re.S).group(1)
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  try{
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  ok('progress-paths.js loaded', !!window.PATHS);

  /* ── stepping stones ── */
  const names=['Lead','Assess','Outcome','AxisCare','Confirm team','AxisCare schedule','Confirm start','First shift','Follow-up'];
  const items=names.map((l,i)=>({ k:'soc.'+i, n:i+1, title:'Step title '+(i+1), label:l, cls:i<3?'d':i===3?'n s':i===5?'x':'' }));
  const sb1=document.createElement('div'); sb1.id='stonesBox'; sb1.style.cssText='width:900px;background:#fff;padding:12px'; sb1.innerHTML=PATHS.stones(items,false); document.body.prepend(sb1);
  const btns=[...sb1.querySelectorAll('button[data-n9a="pick"]')];
  ok('stones · nine pick buttons, tabs, in order, with their steps', btns.length===9 && btns.every(b=>b.getAttribute('role')==='tab') && btns[4].getAttribute('data-k')==='soc.4' && /Step 5: Step title 5/.test(btns[4].getAttribute('aria-label')));
  ok('stones · done steps show a tick, the rest their number', btns[0].querySelector('i').textContent==='✓' && btns[3].querySelector('i').textContent==='4' && btns[8].querySelector('i').textContent==='9');
  ok('stones · the step you are on is the honey stone', getComputedStyle(btns[3].querySelector('i')).backgroundColor==='rgb(240, 166, 58)' && getComputedStyle(btns[0].querySelector('i')).backgroundColor==='rgb(15, 122, 115)');
  ok('stones · the house at the end, lights off until the journey is active', !!sb1.querySelector('.pth-house') && /opacity="0.2"/.test(sb1.querySelector('.pth-house').innerHTML) && /opacity="1"/.test(PATHS.stones(items,true)));
  let picked=null; btns.forEach(b=>b.onclick=()=>{ picked=b.getAttribute('data-k'); }); btns[6].click();
  ok('stones · a stone still clicks like the old dot', picked==='soc.6');

  /* ── the road ── */
  const rd=PATHS.road(2,'');
  ok('road · Offered: aria says so, the car is drawn, the three mileposts are named', /Where they are: Offered/.test(rd) && /translate\(310 92\)/.test(rd) && /References &amp; checks/.test(rd) && /Start paperwork/.test(rd) && /Orientation/.test(rd));
  ok('road · mileposts never claim done before Working', (rd.match(/r="7" fill="#fff"/g)||[]).length===3);
  ok('road · Working: mileposts done, the house at the end', (PATHS.road(3,'').match(/r="7" fill="#0F7A73"/g)||[]).length===3 && /translate\(856 54\)/.test(PATHS.road(3,'')));
  const ended=PATHS.road(0,'Not moving forward');
  ok('road · ended: no car, says why', !/translate\(\d+ 92\)/.test(ended) && /Not moving forward/.test(ended));
  ok('the person page uses the road', /pth-road/.test(ppStagesHtml(1,'')));

  /* ── suns ── */
  sb.auth=Object.assign({}, sb.auth, { getSession:async()=>({ data:{ session:{ access_token:'t' } } }) });
  const from='2026-10-21';   /* a Wednesday */
  const add=(n)=>{ const d=new Date(Date.UTC(2026,9,21+n)); return d.toISOString().slice(0,10); };
  let FAKE={ rows:[
    { date:add(0), client_id:'900', caregiver:'Bea B' }, { date:add(0), client_id:'900', caregiver:'Dee D' },
    { date:add(1), client_id:'900', caregiver:null },
    { date:add(2), client_id:'900', caregiver:'Bea B' },
    { date:add(5), client_id:'900', caregiver:'Bea B' },
    { date:add(2), client_id:'901', caregiver:null } ] }, reads=[];
  window.fetch=async(u,o)=>{ reads.push(JSON.parse(o.body)); return { ok:true, status:200, json:async()=>JSON.parse(JSON.stringify(FAKE)) }; };
  const mk=()=>{ const b=document.createElement('div'); b.innerHTML='<div class="n9"><div class="n9-cov"><b>First two weeks: 1 of 5 visits still have no caregiver.</b></div></div>'; b.style.cssText='width:620px;background:#fff;padding:12px'; document.body.prepend(b); return b; };
  let b1=mk(); b1.id='sunBox'; await PATHS.suns(b1, { journey_id:'jx', axiscare_client_id:'900' }, { from, total:5 }); await sleep(10);
  ok('suns · asked AxisCare for the fourteen days from the first visit', reads.length===1 && reads[0].live_schedule===true && reads[0].start===from && reads[0].end===add(13), reads);
  const dys=[...b1.querySelectorAll('.pth-suns .dy')];
  ok('suns · fourteen days drawn, starting on its own weekday', dys.length===14 && b1.querySelectorAll('.pth-suns .wk').length===3, dys.length);
  const t=x=>x.getAttribute('title');
  ok('suns · a covered day is a full sun, an open one dashed, an empty one a dot', /2 visits, all covered/.test(t(dys[0])) && /1 still needs a caregiver/.test(t(dys[1])) && /no visits/.test(t(dys[3])) && /stroke-dasharray/.test(dys[1].innerHTML) && !/stroke-dasharray/.test(dys[0].innerHTML));
  ok('suns · another client\'s open visit does not count', /1 visit, all covered/.test(t(dys[2])), t(dys[2]));
  ok('suns · the sentence with the open times stays underneath', /still have no caregiver/.test(b1.innerText) && b1.innerHTML.indexOf('pth-suns') < b1.innerHTML.indexOf('n9-cov'));
  await PATHS.suns(b1, { journey_id:'jx', axiscare_client_id:'900' }, { from, total:5 });
  ok('suns · drawn once, and the cache saves a second read', b1.querySelectorAll('.pth-suns').length===1 && reads.length===1);
  FAKE={ rows:[{ date:add(0), client_id:'900', caregiver:'Bea B' }], partial:'more' };
  let b2=mk(); await PATHS.suns(b2, { journey_id:'jy', axiscare_client_id:'900' }, { from, total:5 });
  ok('suns · only part of the fortnight: no suns, the sentence alone', !b2.querySelector('.pth-suns') && !!b2.querySelector('.n9-cov'));
  let b3=mk(); await PATHS.suns(b3, { journey_id:'jz' }, { from, total:5 });
  ok('suns · no AxisCare client id: no suns', !b3.querySelector('.pth-suns'));
  window.fetch=async()=>({ ok:false, status:502, json:async()=>({ error:'AxisCare responded 503' }) });
  let b4=mk(); await PATHS.suns(b4, { journey_id:'jw', axiscare_client_id:'900' }, { from, total:5 });
  ok('suns · AxisCare down: no suns, the sentence still says it', !b4.querySelector('.pth-suns') && /still have no caregiver/.test(b4.innerText));
  [b2,b3,b4].forEach(b=>b.remove());

  /* ── the wiring ── */
  const src=async f=>(await (await window.__origFetch(f+'?x='+Date.now())).text());
  const cj=await src('client-journey.js');
  ok('wired · the Start of Care card draws the stones and asks for the suns', /PATHS\.stones\(v\.rows\.map/.test(cj) && /PATHS\.suns\(box, j, f\)/.test(cj));
  ok('wired · script tag', /<script src="progress-paths\.js\?v=1">/.test(await src('index.html')));
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
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1300, 'height': 1000})
    pin(pg)
    pg.route('**/*', lambda r: serve(r) if r.request.url.startswith('http://hub.test/') else (r.abort() if 'supabase.co' in r.request.url else r.continue_()))
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://hub.test/index.html?proof=paths'); pg.wait_for_timeout(1500)
    pg.evaluate('window.__origFetch=window.fetch.bind(window)')
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    shot = os.environ.get('SHOT')
    if shot:
        os.makedirs(shot, exist_ok=True)
        pg.locator('#stonesBox').screenshot(path=os.path.join(shot, 'stones.png'))
        pg.evaluate("const r=document.createElement('div'); r.id='roadBox'; r.style.cssText='width:900px;background:#fff;padding:12px'; r.innerHTML=PATHS.road(2,''); document.body.prepend(r);")
        pg.locator('#roadBox').screenshot(path=os.path.join(shot, 'road.png'))
        pg.locator('#sunBox').screenshot(path=os.path.join(shot, 'suns.png'))
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

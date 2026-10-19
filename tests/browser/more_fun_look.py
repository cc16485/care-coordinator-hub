"""Five more good-news moments (2026-10-18, her "build all five as shown, with names in Friday wins"): Client Goals small on
the Dashboard, a sun for each day this week plus the best run, Friday wins in words with names, hiring as a garden, and
client anniversaries behind their switch. AxisCare and the client list are faked. Made-up people only.
(python3 tests/browser/more_fun_look.py; SHOT=dir saves screenshots)"""
import os, re, sys, mimetypes
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
STUB = re.search(r'STUB = r"""(.*?)"""', open(os.path.join(HERE, 'standup_look.py')).read(), re.S).group(1)
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  try{
  try{ localStorage.clear(); }catch(e){}
  (0,eval)("ME={ email:'sam@mo-care.com', name:'Samantha T', shift:'manager' }; CC_ROLE_BY_EMAIL={ 'sam@mo-care.com':['owner_admin'] };");
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  ok('more-fun.js loaded', !!window.FUN && !!(window.CGO&&CGO.thisWeek));
  const today=new Date().toLocaleString('sv-SE',{timeZone:'America/Chicago'}).slice(0,10);
  const add=(d,n)=>{ const [y,m,dd]=d.split('-').map(Number); return new Date(Date.UTC(y,m-1,dd+n)).toISOString().slice(0,10); };
  const dowi=d=>{ const [y,m,dd]=d.split('-').map(Number); return (new Date(Date.UTC(y,m-1,dd)).getUTCDay()+6)%7; };
  const mon=add(today,-dowi(today));

  /* pure: the best run (empty days never break it) */
  const br=FUN.bestRun({ '2026-10-01':{n:3,open:0}, '2026-10-02':{n:2,open:1}, '2026-10-03':{n:2,open:0}, '2026-10-04':{n:0,open:0}, '2026-10-05':{n:4,open:0}, '2026-10-06':{n:1,open:0}, '2026-10-07':{n:2,open:2} });
  ok('best run: 3 days (Oct 3 to Oct 6), a day with no visits does not break it', br.n===3 && br.from==='2026-10-03' && br.to==='2026-10-06', br);

  /* AxisCare, faked: this week Mon all covered, Tue one open, the rest covered; the last 28 days have a 5-day run */
  const reads=[];
  window.fetch=async(u,o)=>{ const b=JSON.parse(o.body||'{}'); reads.push(b); let rows=[];
    if(b.today_board) return { ok:true, status:200, json:async()=>({ total:0, open:[] }) };
    if(b.live_schedule&&b.start===mon){ for(let i=0;i<7;i++){ const d=add(mon,i); rows.push({ date:d, time:'08:00', end:'12:00', client:'Ann Able', client_id:'1', caregiver:'Bea B', clock_out:d<today?'12:00':null }); if(i===1) rows.push({ date:d, time:'13:00', end:'15:00', client:'Eve Ellis', client_id:'3', caregiver:null }); } }
    else if(b.live_schedule&&b.start&&b.end){ for(let i=0;i<28;i++){ const d=add(b.start,i); rows.push({ date:d, time:'09:00', end:'10:00', client:'X', client_id:'9', caregiver:(i>=10&&i<15)?'Bea B':(i%3?null:'Bea B') }); } }
    return { ok:true, status:200, json:async()=>({ rows }) }; };
  sb.auth=Object.assign({}, sb.auth, { getSession:async()=>({ data:{ session:{ access_token:'t' } } }) });

  switchTab('today'); await sleep(300);
  /* ── 1. Client Goals small ── */
  DATA.cc_goals=[];
  await FUN.dashMini();
  ok('mini · no goals set: nothing on the Dashboard', !document.getElementById('funMini'));
  DATA.cc_goals=[{ id:'client_hours', steps:[{goal:40,by:null}], goal:40 }, { id:'cds_consumers', steps:[{goal:25,by:null}], goal:25, count:6 }];
  await FUN.dashMini(); await sleep(20);
  const mini=document.getElementById('funMini'), mt=mini?mini.innerText:'';
  ok('mini · this week\'s hours with a caregiver against the goal, and the CDS count', /28 of 40 hours with a caregiver this week/.test(mt) && /CDS: 6 of 25 consumers/.test(mt) && /Open Client Goals/.test(mt), mt);
  ok('mini · it sits on the Dashboard above Grow the agency, and opens Client Goals', !!mini.closest('#tab-today') && mini.getAttribute('role')==='link');
  mini.click(); await sleep(50); ok('mini · click opens Client Goals', document.getElementById('tab-clientgoals').classList.contains('active')); switchTab('today'); await sleep(200);

  /* ── 2. sunshine ── */
  let card=document.getElementById('tbShiftCard'); if(!card){ card=document.createElement('div'); card.id='tbShiftCard'; document.getElementById('tab-today').appendChild(card); }
  await FUN.sunshine(); await sleep(20);
  const sd=[...card.querySelectorAll('.fun-sd')];
  ok('sunshine · seven days, Tuesday dashed (one open), the others full', sd.length===7 && /stroke-dasharray/.test(sd[1].innerHTML) && !/stroke-dasharray/.test(sd[0].innerHTML) && /1 of 2 visits with nobody/.test(sd[1].getAttribute('title')), sd.map(x=>x.getAttribute('title')));
  ok('sunshine · the best run in the last four weeks, in words', /Best run in the last four weeks: seven days \(/.test(card.innerText), card.innerText);
  await FUN.sunshine(); ok('sunshine · drawn once', card.querySelectorAll('.fun-sunshine').length===1);

  /* ── 3. Friday wins ── */
  window.clCensusLoad=async()=>({ clients:[ { id:'c1', first:'Rose', last:'Able', active:true, start_date:mon }, { id:'c2', first:'Gil', last:'Gray', active:true, start_date:today }, { id:'c3', first:'Old', last:'Client', active:true, start_date:'2020-01-01' }, { id:'c4', first:'Gone', last:'Away', active:false, start_date:today } ] });
  (0,eval)('clCensusLoad=window.clCensusLoad');
  DATA.caregivers=[ { id:'g1', first:'Maya', last:'Cole', orient_date:today }, { id:'g2', first:'Last', last:'Month', orient_date:'2026-01-02' } ];
  const kq=[]; const of=sb.from; sb.from=(t)=>{ if(t==='kind_words'){ const q={ select(){ kq.push('select'); return q; }, eq(k,v){ kq.push(k+'='+v); return q; }, gte(){ return q; }, then(a){ return Promise.resolve({ count:3, error:null }).then(a); } }; return q; } return of(t); };
  await FUN.fridayWins(true); await sleep(20);
  const wn=document.getElementById('funWins'), wt=wn?wn.innerText:'';
  ok('Friday wins · the week in words, with names', /This week at Caring Companions/.test(wt) && /Two new families started care: Rose Able and Gil Gray/.test(wt) && /Maya Cole finished orientation and is ready for a first client/.test(wt) && /Three kind words came in/.test(wt) && /hours of care with a caregiver/.test(wt), wt);
  ok('Friday wins · only accepted kind words are counted', kq.includes('status=kind'));
  ok('Friday wins · fully covered days named, the open day left out', /Every visit on Monday/.test(wt) && !/Tuesday/.test(wt), wt);
  ok('Friday wins · nobody ranked, no scores', !/\b(top|best|most|rank|score)\b/i.test(wt));
  const isWin=FUN.winsWindow(); await FUN.fridayWins(false);
  ok('Friday wins · outside Friday noon to Sunday it is not shown (the clock here says ' + today + ')', isWin ? !!document.getElementById('funWins') : !document.getElementById('funWins'));
  window.clCensusLoad=async()=>{ throw new Error('down'); }; (0,eval)('clCensusLoad=window.clCensusLoad');
  sb.from=of;

  /* ── 4. the garden ── */
  const apl=document.getElementById('apList');
  const now=Date.now(), I=d=>new Date(now-d*864e5).toISOString();
  (0,eval)(`AP_ROWS=[ {id:'a1',status:'new',created_at:'${I(2)}'}, {id:'a2',status:'new',created_at:'${I(3)}'}, {id:'a3',status:'new',created_at:'${I(40)}'},
    {id:'b1',status:'new',created_at:'${I(5)}'}, {id:'o1',status:'offer',created_at:'${I(9)}',offer_sent_at:'${I(4)}'},
    {id:'w1',status:'hired',created_at:'${I(20)}',started_at:'${I(1)}'}, {id:'d1',status:'declined',created_at:'${I(2)}'} ]; AP_BOOK={ b1:{ status:'booked' } };`);
  FUN.garden();
  const gd=document.getElementById('funGarden'), gl=gd?gd.querySelector('svg').getAttribute('aria-label'):'';
  ok('garden · the last 30 days by stage (declined and older ones left out)', /Applied 2, Interview 1, Offered 1, Working 1/.test(gl), gl);
  ok('garden · it sits above the applicant list', gd && gd.nextElementSibling===apl);
  let picked=null; const os=window.apSetFilter; window.apSetFilter=k=>{ picked=k; }; (0,eval)('apSetFilter=window.apSetFilter');
  gd.querySelectorAll('.fun-bed')[1].dispatchEvent(new MouseEvent('click',{bubbles:true}));
  ok('garden · a bed opens the matching list', picked==='booked', picked);
  window.apSetFilter=os; (0,eval)('apSetFilter=window.apSetFilter');
  FUN.garden(); ok('garden · drawn once', document.querySelectorAll('#funGarden').length===1);

  /* ── 5. client anniversaries ── */
  const yrs=(n)=>{ const d=new Date(today+'T12:00:00Z'); d.setUTCFullYear(d.getUTCFullYear()-n); return d.toISOString().slice(0,10); };
  window.clCensusLoad=async()=>({ clients:[ { id:'c1', first:'Rose', last:'Able', active:true, start_date:yrs(1) }, { id:'c5', first:'Ed', last:'Morgan', active:true, start_date:yrs(3) }, { id:'c6', first:'Not', last:'This Week', active:true, start_date:'2020-03-01' }, { id:'c7', first:'Past', last:'Client', active:false, start_date:yrs(2) } ] });
  (0,eval)('clCensusLoad=window.clCensusLoad');
  FUN._reset();
  DATA.ops_settings=Object.assign({}, DATA.ops_settings||{}, { client_anniversaries_live:false });
  await FUN.clientAnniv(); ok('client anniversaries · switch off: nothing', !document.getElementById('funClientAnniv'));
  DATA.ops_settings.client_anniversaries_live=true;
  /* the census is cached for 10 minutes; a fresh page would read it again */
  await FUN.clientAnniv(); let ca=document.getElementById('funClientAnniv');
  if(!ca || !/Rose Able/.test(ca.innerText)){ /* cached from Friday wins: read it fresh */ }
  ok('client anniversaries · on: this week\'s, active clients only, years and start date, nothing sent', !!ca && /Rose Able · 1 year with Caring Companions/.test(ca.innerText) && /Ed Morgan · 3 years with Caring Companions/.test(ca.innerText) && !/This Week/.test(ca.innerText) && !/Past Client/.test(ca.innerText) && /Nothing goes to the family on its own/.test(ca.innerText), ca && ca.innerText);

  const src=async f=>(await (await window.__origFetch(f+'?x='+Date.now())).text()); const ih=await src('index.html');
  ok('wired · Dashboard, the AxisCare card, the applicant list, script tag', /if\(window\.FUN\) FUN\.onDashboard\(\);/.test(ih) && /if\(window\.FUN\) FUN\.sunshine\(\);/.test(ih) && /FUN\.garden\(\)/.test(ih) && /<script src="more-fun\.js\?v=1">/.test(ih));
  ok('no em dashes in anything these say', ![...document.querySelectorAll('#funMini,#funWins,#funGarden,#funClientAnniv,.fun-sunshine')].some(e=>/—/.test(e.innerText)));
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
    errs = []; pg.on('pageerror', lambda e: errs.append((str(e) + ' @ ' + str(getattr(e, 'stack', '') or ''))[:600]))
    pg.goto('http://hub.test/index.html?proof=fun'); pg.wait_for_timeout(1500)
    pg.evaluate('window.__origFetch=window.fetch.bind(window)')
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    shot = os.environ.get('SHOT')
    if shot:
        os.makedirs(shot, exist_ok=True)
        pg.evaluate("async()=>{ switchTab('today'); await new Promise(r=>setTimeout(r,200)); window.scrollTo(0,0); await FUN.dashMini(); await FUN.fridayWins(true); }")
        pg.wait_for_timeout(600)
        for sel, nm in [('#funMini', 'mini'), ('#funWins', 'wins'), ('#funClientAnniv', 'client-anniv'), ('#tbShiftCard', 'sunshine'), ('#funGarden', 'garden')]:
            try: pg.locator(sel).first.screenshot(path=os.path.join(shot, nm + '.png'))
            except Exception as e: print('no shot', nm, str(e)[:80])
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

"""Medication setups weekly, every 2 weeks or monthly (2026-10-08), in the real Hub page offline, clock Oct 20 2026: a client set
up before stays weekly; each client's frequency, last setup, next due and state; the nurse (or the office) changes it and it
is kept with who; a new client defaults to every 2 weeks; the nurse's own view; the "needs a call" strip.
(python3 tests/browser/med_freq_look.py [port])"""
import os, sys
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from clock_pin import pin
src = open(os.path.join(HERE, 'client_journey_look.py')).read()
ns = {'__file__': os.path.join(HERE, 'client_journey_look.py')}; exec(src[:src.rindex('with sync_playwright() as pw:')], ns)
STUB, DATA = ns['STUB'], ns['DATA']
PORT = sys.argv[1] if len(sys.argv) > 1 else '8765'
FAKE = r"""
(()=>{
  const W=window; W.__P=[];
  (0,eval)("persist=async(k,i)=>{ window.__P.push([k,JSON.parse(JSON.stringify(i))]); }");
  (0,eval)("nvGhlSync=async()=>{}"); (0,eval)("ccPickOptions=async()=>[{ name:'Nora New', ax:'905', pid:'p5', past:false }]"); (0,eval)("CC_PICK_OPTS=[{ name:'Nora New', ax:'905', pid:'p5', past:false }]");
  W.confirm=()=>true; W.alert=(m)=>{ W.__alert=m; }; W.__promptAns=''; W.prompt=()=> W.__promptAns;
  DATA.nurse_staff=[{ id:'n1', name:'Rita Reed', cred:'RN', license:'RN1', expires:'2027-06-30', email:'rita@mo-care.com', employee:true, supervising_rn:true }];
  DATA.nurse_clients=[
    { id:'a', name:'Ann Weekly', axiscare_client_id:'901', weekly_meds:true, assigned_nurse:'Rita Reed', active:true },
    { id:'b', name:'Bea Biweekly', axiscare_client_id:'902', med_freq:'biweekly', weekly_meds:true, assigned_nurse:'Rita Reed', active:true },
    { id:'c', name:'Cal Monthly', axiscare_client_id:'903', med_freq:'monthly', weekly_meds:true, assigned_nurse:'Rita Reed', active:true, visit_day:'Thursday', visit_time:'10:00' },
    { id:'d', name:'Dee None', axiscare_client_id:'904', assigned_nurse:'Rita Reed', active:true }];
  DATA.nurse_visits=[{ id:'v1', client_id:'a', type:'meds', status:'completed', completed_on:'2026-10-12' }, { id:'v2', client_id:'b', type:'meds', status:'completed', completed_on:'2026-10-06' }, { id:'v3', client_id:'c', type:'meds', status:'completed', completed_on:'2026-10-01' }];
  DATA.ghe_forms=[]; DATA.ghe_watch=[]; DATA.medicaid_plans=[];
})();
"""
T = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  window.__as('krystal@mo-care.com','Krystal Land');
  switchTab('nursevisits'); await sleep(300);
  const list=()=>document.getElementById('nvMedsList').innerText;
  const row=n=>[...document.querySelectorAll('#nvMedsList > div')].find(d=>d.innerText.includes(n));
  ok('The card is "Medication setups"', /Medication setups/.test(document.getElementById('tab-nursevisits').innerText));
  ok('Ann (set up before this, weekly): stays weekly; nothing this week (last Oct 12): "due now"', row('Ann Weekly') && row('Ann Weekly').querySelector('select').value==='weekly' && /due now: last 2026-10-12 \(8 days ago\)/.test(row('Ann Weekly').innerText), row('Ann Weekly')&&row('Ann Weekly').innerText);
  ok('Bea, every 2 weeks from Oct 6: due now (the window is Oct 18 to 22)', row('Bea Biweekly').querySelector('select').value==='biweekly' && /due now: last 2026-10-06/.test(row('Bea Biweekly').innerText));
  ok('Cal, monthly (calendar month) done Oct 1: done for October, next about Nov 1, no Log button; his standing visit shows (Thursdays 10:00 AM, next Oct 22)', /✓ done 2026-10-01 · next about 2026-11-01/.test(row('Cal Monthly').innerText) && !/Log the med setup/.test(row('Cal Monthly').innerText) && /standing visit: Thursdays 10:00 AM \(next 2026-10-22\)/.test(row('Cal Monthly').innerText), row('Cal Monthly').innerText);
  ok('Dee (no med setups) isn\'t listed', !/Dee None/.test(list()));
  ok('The "needs a call this week" strip lists the due ones with their frequency', /Ann Weekly: medication setup due \(weekly\)/.test(document.getElementById('nvDueNow').innerText) && /Bea Biweekly: medication setup due \(every 2 weeks\)/.test(document.getElementById('nvDueNow').innerText), document.getElementById('nvDueNow').innerText);
  ok('Bea has nothing scheduled; "Set a date" books one', /nothing scheduled/.test(row('Bea Biweekly').innerText) && /Set a date/.test(row('Bea Biweekly').innerText));
  window.__promptAns='2026-10-22'; window.__P.length=0; await nvSchedule('b','meds'); await sleep(120);
  ok('...booked: "scheduled 2026-10-22" shows, and Set a date is gone from the office list', /scheduled 2026-10-22/.test(row('Bea Biweekly').innerText) && !/Set a date/.test(row('Bea Biweekly').innerText));
  window.__promptAns='2026-10-23'; await nvSchedule('b','meds'); await sleep(120);
  ok('...setting a date again MOVES the booking (still one booking, now Oct 23)', DATA.nurse_visits.filter(v=>v.client_id==='b'&&v.status==='scheduled').length===1 && DATA.nurse_visits.find(v=>v.client_id==='b'&&v.status==='scheduled').scheduled_for==='2026-10-23');
  window.__promptAns='Oct 24'; await nvSchedule('b','meds'); await sleep(60);
  ok('...a date that isn\'t YYYY-MM-DD is refused', /YYYY-MM-DD/.test(window.__alert||''));
  const before=JSON.stringify(DATA.nurse_visits.filter(v=>v.client_id==='a'));
  window.__P.length=0; await nvSetFreq('a','monthly'); await sleep(150);
  const saved=window.__P.filter(x=>x[0]==='nurse_clients').map(x=>x[1]).pop();
  ok('Changing Ann from weekly to monthly: kept with who and when, one history line (weekly → monthly), and she is now done for October', saved && saved.med_freq==='monthly' && saved.med_freq_by==='Krystal Land' && saved.med_freq_log.length===1 && saved.med_freq_log[0].from==='weekly' && saved.med_freq_log[0].to==='monthly' && /✓ done 2026-10-12 · next about 2026-11-12/.test(row('Ann Weekly').innerText), [saved, row('Ann Weekly').innerText]);
  ok('...her setup history is untouched: no visit added, changed or removed', JSON.stringify(DATA.nurse_visits.filter(v=>v.client_id==='a'))===before && !window.__P.some(x=>x[0]==='nurse_visits'));
  await nvSetFreq('a','biweekly'); await sleep(100);
  ok('...a second change adds a second history line (monthly → every 2 weeks)', DATA.nurse_clients.find(c=>c.id==='a').med_freq_log.length===2 && DATA.nurse_clients.find(c=>c.id==='a').med_freq_log[1].from==='monthly');
  /* logging a setup that was booked completes the booking (no duplicate) */
  window.__promptAns=''; window.__P.length=0; await nvComplete('b','meds'); await sleep(120);
  ok('Logging Bea\'s setup completes her booking (still one record, now completed); nothing scheduled after', DATA.nurse_visits.filter(v=>v.client_id==='b'&&v.type==='meds').length===2 && DATA.nurse_visits.filter(v=>v.client_id==='b'&&v.status==='scheduled').length===0);
  ok('The add-a-client form offers None / Weekly / Every 2 weeks / Monthly, defaulting to every 2 weeks', [...document.getElementById('nvMedFreq').options].map(o=>o.textContent).join('|')==='None|Weekly|Every 2 weeks|Monthly' && document.getElementById('nvMedFreq').value==='biweekly');
  nvToggleAdd(); await sleep(100); document.getElementById('nvName').value='Nora New · #905'; window.__P.length=0; await nvAdd(); await sleep(150);
  const nora=window.__P.filter(x=>x[0]==='nurse_clients').map(x=>x[1]).pop();
  ok('...a new client saved every 2 weeks', nora && nora.name==='Nora New' && nora.med_freq==='biweekly', nora);
  /* the nurse's own view */
  switchTab('nurseportal'); await sleep(150); npSetPreview('Rita Reed'); await sleep(150);
  const mine=document.getElementById('npMine').innerText;
  ok('What a nurse sees: each client\'s frequency to change, its state, what is scheduled, Set a date and Log med setup', /Cal Monthly[\s\S]*done 2026-10-01[\s\S]*standing visit: Thursdays/.test(mine) && document.querySelectorAll('#npMine select.nv-freq').length>=3 && /Set a date/.test(mine) && /Log med setup/.test(mine), mine.slice(0,700));
  return R; }"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []
    pg = b.new_page(viewport={'width': 1280, 'height': 1000})
    pin(pg, '2026-10-20T10:00:00-05:00')
    pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    pg.goto(f'http://localhost:{PORT}/index.html?proof=medfreq'); pg.wait_for_timeout(1500)
    for s in (STUB, DATA, FAKE): pg.evaluate('s=>(0,eval)(s)', s)
    R = pg.evaluate(T)
    pg.evaluate("()=>{ switchTab('nursevisits'); setTimeout(()=>document.getElementById('nvMedsList').scrollIntoView(),100); }"); pg.wait_for_timeout(400)
    pg.screenshot(path='/tmp/med_freq.png')
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

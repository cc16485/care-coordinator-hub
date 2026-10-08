"""GHE oversight on Nurse Scheduling (GHE fix slice 3, 2026-10-08), in the real Hub page offline, the clock at Nov 20 2026:
what AxisCare shows for each GHE month (booked, visited, not booked, booked but never clocked, missed); no "book" or
"done" buttons (the nurse books it in AxisCare as T1001); the Missed GHEs card that only clears with what happened and
the next step (closing the card, a make-up month going on the board); the nurse's own view showing their booking.
(python3 tests/browser/ghe_watch_look.py [port])"""
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
  (0,eval)("nvGhlSync=async()=>{}"); (0,eval)("ccPickOptions=async()=>[]");
  W.confirm=()=>true; W.alert=(m)=>{ W.__alert=m; };
  DATA.nurse_staff=[{ id:'n1', name:'Natasha Early', cred:'RN', license:'RN1', expires:'2027-06-30', email:'natasha@mo-care.com', employee:true, supervising_rn:true }];
  DATA.nurse_clients=[
    { id:'c1', name:'Ann Booked', axiscare_client_id:'1', ghe1:'2026-11', ghe2:'2027-05', assigned_nurse:'Natasha Early', active:true },
    { id:'c2', name:'Bea Unbooked', axiscare_client_id:'2', ghe1:'2026-11', assigned_nurse:'Natasha Early', active:true },
    { id:'c3', name:'Cal Visited', axiscare_client_id:'3', ghe1:'2026-11', assigned_nurse:'Natasha Early', active:true },
    { id:'c4', name:'Dee Passed', axiscare_client_id:'4', ghe1:'2026-11', assigned_nurse:'Natasha Early', active:true },
    { id:'c5', name:'Eve October', axiscare_client_id:'5', ghe1:'2026-10', assigned_nurse:'Natasha Early', active:true },
    { id:'c6', name:'Fay Nolink', axiscare_client_id:'', ghe1:'2026-11', assigned_nurse:'', active:true }];
  const at=(d)=>d+'T16:00:00Z';
  DATA.ghe_watch=[
    { id:'gw_c1_2026-11', client_id:'c1', name:'Ann Booked', month:'2026-11', state:'booked', stage:'booked', visit:{ at:at('2026-11-27'), nurse:'Natasha Early' } },
    { id:'gw_c2_2026-11', client_id:'c2', name:'Bea Unbooked', month:'2026-11', state:'none', stage:'not_booked', visit:null },
    { id:'gw_c3_2026-11', client_id:'c3', name:'Cal Visited', month:'2026-11', state:'visited', stage:'done', visit:{ at:at('2026-11-12'), nurse:'Natasha Early', clock_in:'x', clock_out:'y' } },
    { id:'gw_c4_2026-11', client_id:'c4', name:'Dee Passed', month:'2026-11', state:'not_visited', stage:'not_visited', visit:{ at:at('2026-11-13'), nurse:'Natasha Early' } },
    { id:'gw_c5_2026-10', client_id:'c5', name:'Eve October', month:'2026-10', nurse:'Natasha Early', state:'not_visited', stage:'missed', visit:{ at:at('2026-10-20'), nurse:'Natasha Early' } }];
  DATA.ops_items=[{ id:'ops_ghe_missed_c5_2026-10', kind:'ghe_missed', status:'open', title:'Missed GHE: Eve October (2026-10)', owner:'krystal@mo-care.com' }];
  DATA.nurse_visits=[]; DATA.ghe_forms=[]; DATA.medicaid_plans=[];
})();
"""
T = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  window.__as('krystal@mo-care.com','Krystal Land');
  switchTab('nursevisits'); await sleep(300);
  const board=()=>document.getElementById('nvGheList').innerText;
  const row=n=>[...document.querySelectorAll('#nvGheList tr')].find(t=>t.innerText.includes(n))||{innerText:'(no row) '+board().slice(0,2000)+' | errs: '+(window.__errs||'')};
  ok('Ann: "Booked in AxisCare Nov 27 · Natasha Early"', /Booked in AxisCare Nov 27 · Natasha Early/.test(row('Ann Booked').innerText), row('Ann Booked').innerText);
  ok('Bea: "Due this month · not booked in AxisCare yet"', /Due this month · not booked in AxisCare yet/.test(row('Bea Unbooked').innerText));
  ok('Cal: "Visited Nov 12 · Natasha Early (AxisCare)"', /Visited Nov 12 · Natasha Early \(AxisCare\)/.test(row('Cal Visited').innerText), row('Cal Visited').innerText);
  ok('Dee: "Booked Nov 13 but not clocked in and out"', /Booked Nov 13 but not clocked in and out/.test(row('Dee Passed').innerText));
  ok('Eve: "Missed: window was 2026-10 (booked Oct 20, never clocked)"', /Missed: window was 2026-10 \(booked Oct 20, never clocked\)/.test(row('Eve October').innerText), row('Eve October').innerText);
  ok('Fay (not linked): says to link to AxisCare so the Hub can check', /link to AxisCare so the Hub can check/.test(row('Fay Nolink').innerText));
  ok('No "book" or "done" buttons: "the nurse books it in AxisCare as T1001"', ![...document.querySelectorAll('#nvGheList button')].some(b=>/^(book|done)$/.test(b.textContent.trim())) && /the nurse books it in AxisCare as T1001/.test(row('Bea Unbooked').innerText));
  const miss=document.getElementById('nvMissed');
  ok('The Missed GHEs card lists Eve (October), with what happened and the next step to fill in', miss.style.display!=='none' && /Missed GHEs/.test(miss.innerText) && /Eve October/.test(miss.innerText) && /GHE window 2026-10/.test(miss.innerText) && /booked 2026-10-20, never clocked/.test(miss.innerText), miss.innerText);
  const k='gw_c5_2026-10', sel=document.getElementById('nvmR_'+k);
  ok('...its choices are the next steps: next month (not paid), outside our control (PCCP), refused (DSDS), care ended, month corrected', [...sel.options].map(o=>o.value).join()===',make_up,outside_control,refused,ended,wrong_month');
  await nvMissedSave(k); await sleep(80);
  ok('...Save with nothing picked: "Pick what happened.", nothing saved', /Pick what happened/.test(document.getElementById('nvmMsg_'+k).textContent) && window.__P.length===0);
  sel.value='refused'; nvMissedShape(k); await nvMissedSave(k); await sleep(80);
  ok('...refused without the date: "Enter the date it was reported to DSDS."', /reported to DSDS/.test(document.getElementById('nvmMsg_'+k).textContent) && document.getElementById('nvmDL_'+k).style.display==='' && window.__P.length===0);
  sel.value='make_up'; nvMissedShape(k); document.getElementById('nvmN_'+k).value='Nurse was out sick';
  ok('...make-up: the month it will be done, defaulting to the next month', document.getElementById('nvmML_'+k).style.display==='' && document.getElementById('nvmM_'+k).value==='2026-11');
  document.getElementById('nvmM_'+k).value='2026-12'; await nvMissedSave(k); await sleep(200);
  const w=window.__P.filter(x=>x[0]==='ghe_watch').map(x=>x[1]).pop(), card=window.__P.filter(x=>x[0]==='ops_items').map(x=>x[1]).pop(), nc=window.__P.filter(x=>x[0]==='nurse_clients').map(x=>x[1]).pop();
  ok('Saved: the missed GHE keeps what happened, the next step, the note, who and when', w && w.resolved.reason==='make_up' && w.resolved.make_up_month==='2026-12' && w.resolved.note==='Nurse was out sick' && w.resolved.by==='krystal@mo-care.com', w);
  ok('...the Missed GHE card on My Work is closed with the reason', card && card.id==='ops_ghe_missed_c5_2026-10' && card.status==='done' && /Doing it next month/.test(card.resolution), card);
  ok('...the make-up month goes on the board (December), so it is watched like any GHE', nc && nc.ghe_makeup==='2026-12' && /Make-up GHE 2026-12/.test(row('Eve October').innerText), [nc, row('Eve October').innerText]);
  ok('...and the Missed GHEs card is gone; Eve\'s October now reads "Missed 2026-10: doing it 2026-12"', document.getElementById('nvMissed').style.display==='none' && /Missed 2026-10: doing it 2026-12/.test(row('Eve October').innerText), row('Eve October').innerText);
  /* the nurse's own view */
  switchTab('nurseportal'); await sleep(200); npSetPreview('Natasha Early'); await sleep(150);
  const mine=document.getElementById('npMine').innerText;
  ok('What a nurse sees: their booking from AxisCare, and which are not booked yet', /Ann Booked[\s\S]*Booked in AxisCare Nov 27/.test(mine) && /Bea Unbooked[\s\S]*not booked in AxisCare yet/.test(mine) && !/Cal Visited[^\n]*Visited/.test(mine), mine.slice(0,700));
  return R; }"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []
    pg = b.new_page(viewport={'width': 1280, 'height': 1000})
    pin(pg, '2026-11-20T10:00:00-06:00')
    pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    pg.goto(f'http://localhost:{PORT}/index.html?proof=ghewatch'); pg.wait_for_timeout(1500)
    for s in (STUB, DATA, FAKE): pg.evaluate('s=>(0,eval)(s)', s)
    R = pg.evaluate(T)
    pg.evaluate("()=>{ switchTab('nursevisits'); }"); pg.wait_for_timeout(300)
    pg.screenshot(path='/tmp/ghe_watch_desk.png', full_page=False)
    ph = b.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True)
    pin(ph, '2026-11-20T10:00:00-06:00')
    ph.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    ph.goto(f'http://localhost:{PORT}/index.html?proof=ghewatch'); ph.wait_for_timeout(1500)
    for s in (STUB, DATA, FAKE): ph.evaluate('s=>(0,eval)(s)', s)
    w = ph.evaluate("""async()=>{ document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; window.__as('krystal@mo-care.com','Krystal Land');
      switchTab('nursevisits'); await new Promise(r=>setTimeout(r,300)); document.getElementById('nvMissed').scrollIntoView();
      return { sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth }; }""")
    R.append(['PASS' if w['sw'] <= w['cw'] + 1 else 'FAIL', 'on a phone: the Missed GHEs card fits, no sideways scroll', str(w)])
    ph.screenshot(path='/tmp/ghe_watch_phone.png')
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

"""Live Schedule as a calendar (2026-10-06): Day / Week / Month, back / today / forward, find a client or caregiver, only open
shifts, a click on a day opens it. The real Hub page, offline; AxisCare is faked. (python3 tests/browser/live_calendar_look.py)"""
import re
from playwright.sync_api import sync_playwright
src = open('/Users/samantha/Claude/Projects/cc-hub-live/tests/browser/standup_look.py').read()
STUB = re.search(r'STUB = r"""(.*?)"""', src, re.S).group(1)
DATA = r"""
(()=>{
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Land', shift:'day' };");
  window.__asks=[]; window.__oldServer=false;
  sb.auth.getSession=async()=>({ data:{ session:{ access_token:'t' } } });
  const ymdAdd=(ymd,n)=>{ const [y,m,d]=ymd.split('-').map(Number); return new Date(Date.UTC(y,m-1,d+n)).toISOString().slice(0,10); };
  const V=(date,time,end,client,cg,extra)=>Object.assign({ visit_id:date+time+client, date, time, end, client, client_id:client==='Ed Anderson'?'1':'2', caregiver:cg||null, caregiver_id:cg?'5':'', clock_in:null, clock_out:null }, extra||{});
  window.fetch=async(u,o)=>{ const b=JSON.parse((o&&o.body)||'{}'); window.__asks.push(b);
    if(/visit-change/.test(String(u))){ window.__vc.push(b);
      if(b.action==='reasons') return new Response(JSON.stringify({ live:window.__vcLive, reasons:[{id:5,name:'Staffing Change - Caregiver Change'},{id:6,name:'Staffing Change - Caregiver Call Off'},{id:8,name:'Staffing Change - No Show'},{id:10,name:'Schedule Change - Client Schedule Change'},{id:13,name:'Administrative Correction - Office Error'}] }),{status:200});
      if(b.action==='get'){ const st=window.__vcVisit; return new Response(JSON.stringify({ live:window.__vcLive, visit:st, undo:window.__vcUndo||[] }),{status:200}); }
      if(b.action==='change'){ if(window.__vcRefuse) return new Response(JSON.stringify({ outcome:'changed_meanwhile', error:'Someone changed this visit since you opened it. Look again. Nothing was changed.' }),{status:409});
        return new Response(JSON.stringify({ outcome:'changed', confirmed:true, change_id:b.change_id, words:'caregiver Kim Aide → Lia Listed', reason:'Staffing Change - Caregiver Change' }),{status:200}); }
      if(b.action==='undo') return new Response(JSON.stringify({ outcome:'changed', words:'caregiver Lia Listed → Kim Aide' }),{status:200});
    }
    if(!/coverage-shifts/.test(String(u)) || !b.live_schedule) return new Response('{"open":[],"total":0}',{status:200});
    const from=b.start||b.date, to=b.end||b.date, rows=[];
    for(let d=from; d<=to; d=ymdAdd(d,1)){ rows.push(V(d,'09:00','14:00','Ed Anderson',null)); rows.push(V(d,'16:00','21:00','Ed Anderson','Kim Aide')); if(d.endsWith('-15')) rows.push(V(d,'08:00','12:00','Ruth Barnes','Di Aide')); }
    const body=(window.__oldServer&&b.start)?{ date:'2026-10-06', total:2, unassigned:1, rows:rows.slice(0,2) }:{ date:from, start:b.start?from:undefined, end:b.start?to:undefined, total:rows.length, unassigned:rows.filter(r=>!r.caregiver).length, rows };
    if(!b.start){ delete body.start; delete body.end; }
    return new Response(JSON.stringify(body),{status:200}); };
  try{ localStorage.removeItem('cch_lsview'); }catch(e){}
  window.__vc=[]; window.__vcLive=true; window.__vcRefuse=false;
  window.__vcVisit={ visit_id:'2026-10-1409:00Ed Anderson', client:'Ed Anderson', client_id:'1', caregiver_id:'5', caregiver:'Kim Aide', date:'2026-10-14', start:'09:00', end:'14:00', started:false, verified:false };
  (0,eval)("TB.pool=[{ name:'Lia Listed', axiscare_id:'7', level:2, windows:null, visits:[] },{ name:'Bo Busy', axiscare_id:'8', level:2, windows:null, visits:[{ day:'2026-10-14', start:'08:00', end:'12:00', client:'Ruth Barnes' }] },{ name:'Kim Aide', axiscare_id:'5', level:2, windows:null, visits:[] }]; CC_ROLE_BY_EMAIL={ 'krystal@mo-care.com':['owner_admin'] };");
  DATA.ops_settings={ visit_change_live:true };
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  const B=()=>document.getElementById('ls-board');
  LS_STATE.date='2026-10-14'; LC.view='day'; switchTab('liveschedule'); await sleep(200); await lsLoad(true); await sleep(150);
  ok('Day: the list as before, with Day / Week / Month, back / Today / forward, find and only-open', /2 visits · 1 unassigned/.test(B().innerText) && ['Day','Week','Month','Today'].every(t=>[...B().querySelectorAll('.lc-bar button')].some(b=>b.textContent===t)) && B().querySelector('#lcQ') && B().querySelector('#lcOpen'), B().innerText.slice(0,400));
  ok('...it asked AxisCare for that one day', window.__asks.at(-1).date==='2026-10-14' && !window.__asks.at(-1).start);
  lcView('week'); await sleep(250);
  ok('Week: asks for Monday to Sunday in one read', window.__asks.at(-1).start==='2026-10-12' && window.__asks.at(-1).end==='2026-10-18', window.__asks.at(-1));
  const heads=[...B().querySelectorAll('.lc-dayhead')], crow=[...B().querySelectorAll('tr.lc-client')];
  ok('...the week across the top, Mon 12 to Sun 18, each day saying how many are open', heads.length===7 && /Mon 12/.test(heads[0].innerText) && /Sun 18/.test(heads[6].innerText) && heads.every(h=>/1 open/.test(h.innerText)), heads.map(h=>h.innerText));
  ok('...one row per client down the left, each with its visits, hours and open count', crow.length===2 && crow[0].dataset.client==='Ed Anderson' && crow[1].dataset.client==='Ruth Barnes' && /14 visits · 70h · 7 open/.test(crow[0].cells[0].innerText) && /1 visit · 4h/.test(crow[1].cells[0].innerText), crow.map(r=>r.cells[0].innerText));
  ok('...each day cell has that client\'s visits: time and caregiver, NOBODY in red (no client name repeated)', /9a–2p\s*NOBODY/.test(crow[0].cells[1].innerText) && /4p–9p\s*Kim A\./.test(crow[0].cells[1].innerText) && !/Ed A\./.test(crow[0].cells[1].innerText) && crow[0].cells[1].querySelector('.lc-visit[data-state="open"]') && crow[1].cells[4].querySelectorAll('.lc-visit').length===1 && !crow[1].cells[1].innerText.trim(), [crow[0].cells[1].innerText, crow[1].cells[4].innerText]);
  const key=B().querySelector('.lc-key');
  ok('a colour key above the calendar: six states, each its own colour, with how many are showing', key && key.querySelectorAll('.lc-keyitem').length===6 && /Open: nobody on it\s*\(7\)/.test(key.innerText) && new Set([...key.querySelectorAll('.lc-keyitem > span:first-child')].map(x=>getComputedStyle(x).borderLeftColor)).size===6, key&&key.innerText);
  const openC=B().querySelector('.lc-visit[data-state="open"]'), upC=B().querySelector('.lc-visit[data-state="up"],.lc-visit[data-state="past"],.lc-visit[data-state="done"]');
  ok('...an open shift and a covered one look clearly different (bar and background)', openC && upC && getComputedStyle(openC).borderLeftColor!==getComputedStyle(upC).borderLeftColor && getComputedStyle(openC).backgroundColor!==getComputedStyle(upC).backgroundColor);
  lcFind('ruth'); await sleep(100);
  ok('Find narrows to a client or caregiver (only Ruth\'s row, her Thursday visit)', B().querySelectorAll('.lc-visit').length===1 && B().querySelectorAll('tr.lc-client').length===1 && /Ruth Barnes/.test(B().innerText) && /\(filtered\)/.test(B().innerText));
  lcFind(''); lcOnlyOpen(true); await sleep(100);
  ok('Only open shifts: just the 7 with nobody', B().querySelectorAll('.lc-visit').length===7 && [...B().querySelectorAll('.lc-visit')].every(x=>x.dataset.state==='open'));
  lcOnlyOpen(false);
  lcStep(1); await sleep(250);
  ok('forward: the next week', window.__asks.at(-1).start==='2026-10-19' && window.__asks.at(-1).end==='2026-10-25');
  lcView('month'); await sleep(250);
  ok('Month: the whole grid in one read (Mon Sep 28 to Sun Nov 1 for October)', window.__asks.at(-1).start==='2026-09-28' && window.__asks.at(-1).end==='2026-11-01', window.__asks.at(-1));
  const cells=[...B().querySelectorAll('.lc-mday')];
  ok('...35 days, each with its visit count and how many are open', cells.length===35 && /2 visits\s*1 open/.test(cells[0].innerText) && /October 2026/.test(B().innerText), cells[0].innerText);
  ok('Month: each day shows coloured counts by state, and the key', /color/.test(cells[3].querySelector('.lc-mdots span').getAttribute('style')) && !!B().querySelector('.lc-key'));
  cells.find(c=>c.dataset.day==='2026-10-15').click(); await sleep(250);
  ok('clicking a day opens that day', LC.view==='day' && window.__asks.at(-1).date==='2026-10-15' && /3 visits/.test(B().innerText), B().innerText.slice(0,300));
  ok('...the Day list uses the same colour code and key', !!B().querySelector('.lc-key') && B().querySelector('.ls-state[data-state="open"]') && /Open: nobody on it/.test(B().querySelector('tr.ls-row').innerText));
  window.__oldServer=true; lcView('week'); await sleep(250);
  ok('before Desktop 478 runs, Week says it turns on after 478 (never shows one day as a week)', /turn on once Desktop step 478 has run/.test(B().innerText) && !B().querySelector('tr.lc-client'));
  window.__oldServer=false; lcView('day'); await sleep(200);
  // CLICK A VISIT AND CHANGE IT
  LS_STATE.date='2026-10-14'; await lsLoad(true); await sleep(150);
  const ov=()=>document.querySelector('.vc-ov:last-of-type');
  ok('the Day list and the Week chips open a visit when clicked', /lcVisitOpen/.test(B().querySelector('tr.ls-row').getAttribute('onclick')) && /Click a visit to change it/.test(B().innerText));
  ok('an owner sees the switch above the calendar', /Changing visits from the Hub: On/.test(B().innerText));
  await lcVisitOpen('2026-10-1409:00Ed Anderson'); await sleep(300);
  let P=document.querySelector('.vc-panel');
  ok('the panel reads the visit from AxisCare: client, day, time, caregiver, and three ways to change it', P && /Ed Anderson · Wednesday, Oct 14/.test(P.innerText) && /9:00am–2:00pm · Kim Aide/.test(P.innerText) && ['Change the caregiver','Take the caregiver off','Change the time or day'].every(t=>P.innerText.includes(t)) && window.__vc.some(x=>x.action==='get'), P&&P.innerText.slice(0,400));
  const cgs=[...P.querySelectorAll('.vc-cg')].map(x=>x.innerText);
  ok('...the roster, without the caregiver already on it; someone busy then is flagged and sorted last', cgs.length===2 && /Lia Listed/.test(cgs[0]) && /Bo Busy[\s\S]*already with Ruth Barnes 8a–12p/.test(cgs[1]), cgs);
  ok('...the reason starts at "Staffing Change - Caregiver Change"', P.querySelector('.vc-r').selectedOptions[0].text==='Staffing Change - Caregiver Change');
  P.querySelector('.vc-go').click(); await sleep(80);
  ok('Review with nobody picked: asks to pick, nothing sent', /Pick a caregiver/.test(P.innerText) && !window.__vc.some(x=>x.action==='change'));
  P.querySelector('.vc-cg[data-ax="7"]').click(); await sleep(50); P=document.querySelector('.vc-panel');
  P.querySelector('.vc-go').click(); await sleep(80);
  const rv=P.querySelector('.vc-review');
  ok('Review shows exactly what will change in AxisCare, the reason, one visit only, nobody texted', rv && /In AxisCare, this one visit will change:/.test(rv.innerText) && /Caregiver: Kim Aide → Lia Listed/.test(rv.innerText) && /Reason: Staffing Change - Caregiver Change/.test(rv.innerText) && /repeating schedule is not changed\. Nobody is texted/.test(rv.innerText) && !window.__vc.some(x=>x.action==='change'), rv&&rv.innerText);
  rv.querySelector('.vc-confirm').click(); await sleep(250);
  const ch=window.__vc.find(x=>x.action==='change');
  ok('Confirm sends the change: that visit, what you saw, the new caregiver, the reason, a fresh change id', ch && ch.visit_id==='2026-10-1409:00Ed Anderson' && JSON.stringify(ch.expect)==='{"caregiver_id":"5","date":"2026-10-14","start":"09:00","end":"14:00"}' && JSON.stringify(ch.set)==='{"caregiver_id":"7"}' && ch.reason_id===5 && /^[a-z0-9-]{8,64}$/i.test(ch.change_id), ch);
  P=document.querySelector('.vc-panel');
  ok('..."Changed in AxisCare and read back", with Undo', /✓ Changed in AxisCare and read back/.test(P.innerText) && P.querySelector('.vc-undo'));
  P.querySelector('.vc-undo').click(); await sleep(250);
  ok('Undo asks the server to put it back', window.__vc.some(x=>x.action==='undo' && x.change_id===ch.change_id) && /Put back as it was/.test(document.querySelector('.vc-panel').innerText));
  document.querySelector('.vc-panel .vc-done-btn').click(); await sleep(200);
  // take off, with a coverage case offered
  window.__vc=[]; await lcVisitOpen('2026-10-1409:00Ed Anderson'); await sleep(300); P=document.querySelector('.vc-panel');
  P.querySelector('.vc-tab[data-k="off"]').click(); await sleep(50); P=document.querySelector('.vc-panel');
  ok('Take the caregiver off: the reason starts at "Caregiver Call Off"', P.querySelector('.vc-r').selectedOptions[0].text==='Staffing Change - Caregiver Call Off' && /Kim Aide comes off this visit/.test(P.innerText));
  P.querySelector('.vc-go').click(); await sleep(60); P.querySelector('.vc-confirm').click(); await sleep(250);
  ok('...sends caregiver: nobody, and offers a coverage case', JSON.stringify(window.__vc.find(x=>x.action==='change').set)==='{"caregiver_id":null}' && document.querySelector('.vc-panel .vc-cov'));
  document.querySelector('.vc-panel .vc-done-btn').click(); await sleep(200);
  // time
  window.__vc=[]; await lcVisitOpen('2026-10-1409:00Ed Anderson'); await sleep(300); P=document.querySelector('.vc-panel');
  P.querySelector('.vc-tab[data-k="time"]').click(); await sleep(50); P=document.querySelector('.vc-panel');
  ok('Change the time or day: the reason starts at "Client Schedule Change"', P.querySelector('.vc-r').selectedOptions[0].text==='Schedule Change - Client Schedule Change');
  P.querySelector('.vc-s').value='15:00'; P.querySelector('.vc-go').click(); await sleep(60);
  ok('...an end before the start is caught before anything is sent', /end must be after the start/.test(P.innerText) && !window.__vc.some(x=>x.action==='change'));
  P.querySelector('.vc-s').value='10:00'; P.querySelector('.vc-e').value='15:00'; P.querySelector('.vc-d').value='2026-10-15'; P.querySelector('.vc-go').click(); await sleep(60);
  ok('...the review says the new day and time', /Day: Wednesday, Oct 14 → Thursday, Oct 15/.test(P.innerText) && /Time: 9:00am–2:00pm → 10:00am–3:00pm/.test(P.innerText), P.querySelector('.vc-review').innerText);
  window.__vcRefuse=true; P.querySelector('.vc-confirm').click(); await sleep(250);
  ok('...someone changed it meanwhile: the reason shows, the panel stays open', /Someone changed this visit since you opened it/.test(document.querySelector('.vc-panel').innerText) && JSON.stringify(window.__vc.find(x=>x.action==='change').set)==='{"date":"2026-10-15","start":"10:00","end":"15:00"}');
  document.querySelector('.vc-panel .vc-x').click(); window.__vcRefuse=false;
  // started, switched off, undo offered
  window.__vcVisit=Object.assign({}, window.__vcVisit, { started:true }); await lcVisitOpen('2026-10-1409:00Ed Anderson'); await sleep(300);
  ok('a visit that has started: no changes offered (an EVV correction in AxisCare)', /has started, so it isn’t changed here/.test(document.querySelector('.vc-panel').innerText) && !document.querySelector('.vc-panel .vc-tab'));
  document.querySelector('.vc-panel .vc-x').click();
  window.__vcVisit=Object.assign({}, window.__vcVisit, { started:false }); window.__vcLive=false; LC_VCQ; await lcVisitOpen('2026-10-1409:00Ed Anderson'); await sleep(300);
  ok('switched off: says so, no changes offered', /switched off/.test(document.querySelector('.vc-panel').innerText) && !document.querySelector('.vc-panel .vc-tab'));
  document.querySelector('.vc-panel .vc-x').click(); window.__vcLive=true;
  window.__vcUndo=[{ change_id:'chg-1', words:'caregiver Kim Aide → Lia Listed', by:'Krystal Land' }]; await lcVisitOpen('2026-10-1409:00Ed Anderson'); await sleep(300);
  ok('a change made today shows on the visit with Undo', /Changed today by Krystal: caregiver Kim Aide → Lia Listed/.test(document.querySelector('.vc-panel').innerText) && document.querySelector('.vc-panel .vc-undo'));
  document.querySelector('.vc-panel .vc-x').click(); window.__vcUndo=[];
  // the owner's switch
  const asked=[]; window.confirm=t=>{ asked.push(t); return true; }; window.__merged=[]; window.tkMerge=async(fn)=>{ const m={}; const ch=fn(m); window.__merged.push(m); return { changed:ch, error:null }; };
  B().querySelector('.vc-switch button').click(); await sleep(150);
  ok('the switch asks first and saves only that setting', /^Turn off changing visits from the Live Schedule\?/.test(asked[0]) && JSON.stringify(window.__merged[0])==='{"visit_change_live":false}' && /Changing visits from the Hub: Off/.test(B().innerText));
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width':1300,'height':1000})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=lc'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', STUB); pg.evaluate('s=>(0,eval)(s)', DATA)
    R = pg.evaluate(T)
    pg.evaluate("async()=>{ LS_STATE.date='2026-10-14'; lcView('week'); await new Promise(r=>setTimeout(r,300)); window.scrollTo(0,0); }")
    pg.evaluate("""async()=>{ const now=new Date().toLocaleString('sv-SE',{timeZone:'America/Chicago'}), today=now.slice(0,10), hm=now.slice(11,16);
      const ymdAdd=(ymd,n)=>{ const [y,m,d]=ymd.split('-').map(Number); return new Date(Date.UTC(y,m-1,d+n)).toISOString().slice(0,10); };
      const r=LC_STATES?lcRange('week',today):null; const rows=[], V=(date,time,end,client,id,cg,x)=>rows.push(Object.assign({ visit_id:date+time+client, date, time, end, client, client_id:id, caregiver:cg||null, clock_in:null, clock_out:null }, x||{}));
      for(let i=0;i<7;i++){ const d=ymdAdd(r.start,i);
        V(d,'09:00','14:00','Ed Anderson','1', i%3===0?null:'Kim Aide', d<today?{clock_in:'09:01',clock_out:'14:02'}:{});
        V(d,'16:00','21:00','Ed Anderson','1','Lia Listed', d<today?(i%2?{clock_in:'16:00',clock_out:'21:00'}:{}):{});
        V(d,'08:00','12:00','Ruth Barnes','2','Di Aide', d<today?{clock_in:'08:05',clock_out:'12:00'}:{}); }
      V(today,'00:00','23:58','Gus Fake','3','Bo Busy',{clock_in:'00:02'}); V(today,'00:01','23:59','Hal Fake','4','Ann Late');
      LS_STATE.data={ date:r.start, start:r.start, end:r.end, total:rows.length, unassigned:rows.filter(x=>!x.caregiver).length, rows }; LS_STATE.date=today; LC.view='week'; LC.q=''; LC.open=false; lsPaint(); window.scrollTo(0,0); }""")
    pg.screenshot(path='/tmp/lc_week.png')
    pg.evaluate("async()=>{ lcView('month'); await new Promise(r=>setTimeout(r,300)); window.scrollTo(0,0); }")
    pg.screenshot(path='/tmp/lc_month.png')
    pg.evaluate("async()=>{ window.__vcLive=true; window.__vcUndo=[]; window.__vcVisit=Object.assign({}, window.__vcVisit, { started:false }); document.querySelectorAll('.vc-ov').forEach(x=>x.remove()); LS_STATE.date='2026-10-14'; lcView('day'); await new Promise(r=>setTimeout(r,300)); await lcVisitOpen('2026-10-1409:00Ed Anderson'); await new Promise(r=>setTimeout(r,300)); document.querySelector('.vc-panel .vc-cg[data-ax=\"7\"]').click(); await new Promise(r=>setTimeout(r,80)); document.querySelector('.vc-panel .vc-go').click(); await new Promise(r=>setTimeout(r,120)); }")
    pg.screenshot(path='/tmp/vc_review.png')
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

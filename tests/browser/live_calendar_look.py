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
  const V=(date,time,end,client,cg,extra)=>Object.assign({ visit_id:date+time+client, date, time, end, client, client_id:'1', caregiver:cg||null, caregiver_id:cg?'5':'', clock_in:null, clock_out:null }, extra||{});
  window.fetch=async(u,o)=>{ const b=JSON.parse((o&&o.body)||'{}'); window.__asks.push(b);
    if(!/coverage-shifts/.test(String(u)) || !b.live_schedule) return new Response('{"open":[],"total":0}',{status:200});
    const from=b.start||b.date, to=b.end||b.date, rows=[];
    for(let d=from; d<=to; d=ymdAdd(d,1)){ rows.push(V(d,'09:00','14:00','Ed Anderson',null)); rows.push(V(d,'16:00','21:00','Ed Anderson','Kim Aide')); if(d.endsWith('-15')) rows.push(V(d,'08:00','12:00','Ruth Barnes','Di Aide')); }
    const body=(window.__oldServer&&b.start)?{ date:'2026-10-06', total:2, unassigned:1, rows:rows.slice(0,2) }:{ date:from, start:b.start?from:undefined, end:b.start?to:undefined, total:rows.length, unassigned:rows.filter(r=>!r.caregiver).length, rows };
    if(!b.start){ delete body.start; delete body.end; }
    return new Response(JSON.stringify(body),{status:200}); };
  try{ localStorage.removeItem('cch_lsview'); }catch(e){}
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
  const days=[...B().querySelectorAll('.lc-day')];
  ok('...seven columns, Mon 12 to Sun 18, each with its visits and "1 open"', days.length===7 && /Mon 12/.test(days[0].innerText) && /Sun 18/.test(days[6].innerText) && days.every(d=>/1 open/.test(d.innerText)) && days[3].querySelectorAll('.lc-visit').length===3, days.map(d=>d.innerText.slice(0,40)));
  ok('...an open shift says NOBODY in red; a covered one names the caregiver', /9a–2p Ed A\.\s*NOBODY/.test(days[0].innerText) && /4p–9p Ed A\.\s*Kim A\./.test(days[0].innerText) && days[0].querySelector('.lc-visit[data-state="open"]'));
  lcFind('ruth'); await sleep(100);
  ok('Find narrows to a client or caregiver (only Ruth\'s Thursday visit)', B().querySelectorAll('.lc-visit').length===1 && /Ruth B\./.test(B().innerText) && /\(filtered\)/.test(B().innerText));
  lcFind(''); lcOnlyOpen(true); await sleep(100);
  ok('Only open shifts: just the 7 with nobody', B().querySelectorAll('.lc-visit').length===7 && [...B().querySelectorAll('.lc-visit')].every(x=>x.dataset.state==='open'));
  lcOnlyOpen(false);
  lcStep(1); await sleep(250);
  ok('forward: the next week', window.__asks.at(-1).start==='2026-10-19' && window.__asks.at(-1).end==='2026-10-25');
  lcView('month'); await sleep(250);
  ok('Month: the whole grid in one read (Mon Sep 28 to Sun Nov 1 for October)', window.__asks.at(-1).start==='2026-09-28' && window.__asks.at(-1).end==='2026-11-01', window.__asks.at(-1));
  const cells=[...B().querySelectorAll('.lc-mday')];
  ok('...35 days, each with its visit count and how many are open', cells.length===35 && /2 visits\s*1 open/.test(cells[0].innerText) && /October 2026/.test(B().innerText), cells[0].innerText);
  cells.find(c=>c.dataset.day==='2026-10-15').click(); await sleep(250);
  ok('clicking a day opens that day', LC.view==='day' && window.__asks.at(-1).date==='2026-10-15' && /3 visits/.test(B().innerText), B().innerText.slice(0,300));
  window.__oldServer=true; lcView('week'); await sleep(250);
  ok('before Desktop 478 runs, Week says it turns on after 478 (never shows one day as a week)', /turn on once Desktop step 478 has run/.test(B().innerText) && !B().querySelector('.lc-day'));
  window.__oldServer=false; lcView('day'); await sleep(200);
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
    pg.screenshot(path='/tmp/lc_week.png')
    pg.evaluate("async()=>{ lcView('month'); await new Promise(r=>setTimeout(r,300)); window.scrollTo(0,0); }")
    pg.screenshot(path='/tmp/lc_month.png')
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

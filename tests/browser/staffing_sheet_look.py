"""Where we can staff this week (Referral Partner Desk Step 4, 2026-10-08), in the real Hub page offline: Staffing's sheet
(names inside, skill filter, set by hand with a reason, Confirm), the caregivers who need an answer, why the others aren't
counted, the Referrers desk (confirmed only, re-checking held back, Copy for a partner with no names), Today's reminder,
and a phone. (python3 tests/browser/staffing_sheet_look.py [port])"""
import os, sys, json
from playwright.sync_api import sync_playwright
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'client_journey_look.py')).read()
ns = {'__file__': os.path.abspath(__file__)}; exec(src[:src.rindex('with sync_playwright() as pw:')], ns)
STUB, DATA = ns['STUB'], ns['DATA']
PORT = sys.argv[1] if len(sys.argv) > 1 else '8765'
FAKE = r"""
(()=>{
  const W=window, D=(n)=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago'}).format(new Date(Date.now()+n*864e5));
  W.__P=[]; W.__TK=[]; W.__copied='';
  (0,eval)("persist=async(k,i)=>{ window.__P.push([k,JSON.parse(JSON.stringify(i))]); }");
  (0,eval)("tkMerge=async(apply,what)=>{ const m=JSON.parse(JSON.stringify(DATA.ops_settings||{})); const lines=apply(m); window.__TK.push({ m, lines, what }); DATA.ops_settings=m; return {}; }");
  (0,eval)("ccToast=(m)=>{ window.__toast=m; }");
  try{ navigator.clipboard.writeText=async t=>{ W.__copied=t; }; }catch(e){}
  const all=['mon','tue','wed','thu','fri','sat','sun'], wins=w=>Object.fromEntries(all.map(d=>[d,w]));
  const cg=(id,name,o)=>Object.assign({ axiscare_id:id, name, city:'Springfield', windows:wins(['morning']), availability_updated:D(-10), target_hours:30, visits:[] }, o||{});
  W.__POOL=[cg('1','Ann Able'), cg('2','Bea Busy'), cg('3','Cal Nixa',{ city:'Nixa', windows:wins(['evening']) }), cg('4','Dee New'), cg('5','Eve Stale',{ availability_updated:D(-200) })];
  DATA.caregiver_overlay=[
    { id:'cgov_1', axiscare_id:'1', accepting_new:{ v:'yes' }, travel_towns:['Springfield','Nixa'], skills:{ hoyer_lift:{ have:'yes' } } },
    { id:'cgov_2', axiscare_id:'2', accepting_new:{ v:'yes' }, travel_towns:['Springfield'] },
    { id:'cgov_3', axiscare_id:'3', accepting_new:{ v:'yes' }, travel_towns:['Nixa'] },
    { id:'cgov_5', axiscare_id:'5', accepting_new:{ v:'yes' }, travel_towns:['Springfield'] }];
  DATA.coverage_do_not_offer=[]; DATA.caregivers=[];
  DATA.ops_settings=Object.assign({}, DATA.ops_settings||{}, { partner_desk:{ since:'2026-10-08', towns:['Springfield','Nixa','Ozark'] } });
  const of=W.fetch; W.fetch=async(u,o)=>{ if(/coverage-shifts/.test(String(u))){ W.__pools=(W.__pools||0)+1; return new Response(JSON.stringify({ caregivers:W.__POOL }),{status:200}); } return of(u,o); };
})();
"""
T = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  CC_ROLE_BY_EMAIL['sally@mo-care.com']=['staffing_coordinator']; window.__as('sally@mo-care.com','Sally Staffing');
  switchTab('hourswatch'); swSubGo('hours'); await sleep(800);
  const box=()=>document.getElementById('ssRoot');
  ok('Staffing: the sheet loads from the same read Team Builder uses, "Not confirmed this week"', window.__pools>=1 && /Where we can staff this week/.test(box().innerText) && /Not confirmed this week/.test(box().innerText), box().innerText.slice(0,300));
  const cell=(t,w)=>box().querySelector('td.ss-'+['open','limited','none'].find(s=>box().querySelector('tr')&&1)+'');
  const row=t=>[...box().querySelectorAll('tbody tr')].find(r=>r.children[0].textContent===t);
  ok('Springfield mornings Open (Ann and Bea), Nixa mornings Limited (Ann travels there), Nixa evenings Limited (Cal)', /Open/.test(row('Springfield').children[1].innerText) && /Limited/.test(row('Nixa').children[1].innerText) && /Limited/.test(row('Nixa').children[3].innerText), [row('Springfield')&&row('Springfield').innerText, row('Nixa')&&row('Nixa').innerText]);
  ok('...only towns with capacity show unless asked (Ozark hidden)', !row('Ozark'));
  ok('Needs an answer: Dee (never asked, no towns), with Yes/No and the town choices; "living in a town doesn\'t count by itself"', /Needs an answer \(1\)[\s\S]*Dee New/.test(box().innerText) && /doesn't count by itself/.test(box().innerText), box().innerText);
  ok('Not counted: Eve, with the reason (availability older than 90 days)', /Not counted \(1\)/.test(box().innerText) && /Eve Stale: availability older than 90 days/.test(box().querySelector('.ss-rest').textContent));
  /* answer for Dee */
  const n=document.getElementById('ssn_4'); n.querySelector('input[value="yes"]').checked=true; n.querySelector('input[value="Ozark"]').checked=true; n.querySelector('button').click(); await sleep(400);
  const ov=window.__P.filter(x=>x[0]==='caregiver_overlay').slice(-1)[0];
  ok('...saved on Dee\'s caregiver record: accepting new clients (who and when), and the towns', ov && ov[1].axiscare_id==='4' && ov[1].accepting_new.v==='yes' && ov[1].accepting_new.by==='sally@mo-care.com' && ov[1].travel_towns.join()==='Ozark', ov);
  ok('...and Ozark mornings now shows Limited', row('Ozark') && /Limited/.test(row('Ozark').children[1].innerText), box().innerText.slice(0,500));
  /* skill filter */
  [...box().querySelectorAll('.ss-filters input')][1].click(); await sleep(150);
  ok('A skill filter (Hoyer lift): Springfield mornings drop to Limited (only Ann has it)', /Limited/.test(row('Springfield').children[1].innerText));
  [...box().querySelectorAll('.ss-filters input')][1].click(); await sleep(150);
  /* set by hand */
  row('Springfield').children[3].querySelector('button').click(); await sleep(100);
  document.getElementById('ssOv').value='limited'; [...box().querySelectorAll('.ss-ovr button')][0].click(); await sleep(100);
  ok('Set by hand needs a reason', /Say why/.test(document.getElementById('ssOvErr').textContent));
  document.getElementById('ssOvNote').value='Bea can take one evening client from next week'; [...box().querySelectorAll('.ss-ovr button')][0].click(); await sleep(100);
  ok('...applied, marked "set by hand"', /Limited[\s\S]*set by hand/.test(row('Springfield').children[3].innerText));
  /* confirm */
  [...box().querySelectorAll('button')].find(b=>/Confirm this week/.test(b.textContent)).click(); await sleep(300);
  const c=window.__TK.slice(-1)[0];
  ok('Confirm: saved through the logged settings save (who, when, every town/time, the by-hand ones with their reason)', c && c.m.staffing_sheet && c.m.staffing_sheet.by==='sally@mo-care.com' && c.m.staffing_sheet.cells['Springfield|evening'].override.note && /confirmed for the week of/.test(c.lines[0]), c);
  ok('...the sheet now says "Confirmed by Sally Staffing"', /Confirmed by Sally Staffing/.test(box().innerText));
  /* the desk */
  window.__as('krystal@mo-care.com','Krystal Land'); switchTab('referrers'); await sleep(300);
  const d=document.getElementById('ssDesk');
  ok('Referrers desk: the confirmed sheet, towns and times only (no caregiver names)', d && /Confirmed by Sally Staffing/.test(d.innerText) && /Springfield[\s\S]*mornings/.test(d.innerText) && !/Ann|Bea|Cal|Dee/.test(d.innerText), d&&d.innerText);
  [...d.querySelectorAll('button')].find(b=>/Copy for a partner/.test(b.textContent)).click(); await sleep(300);
  ok('Copy for a partner: towns and times, "not a promise of a start date or a particular caregiver", no names or counts', /openings for new clients in/.test(window.__copied) && /Springfield \(mornings, evenings\)/.test(window.__copied) && /not a promise of a start date or a particular caregiver/.test(window.__copied) && !/Ann|Bea|\b2\b/.test(window.__copied), window.__copied);
  /* a meaningful change after confirming */
  window.__POOL[1].visits=[0,1,2,3,4,5,6].map(i=>({ day:new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago'}).format(new Date(Date.now()+i*864e5)), start:'06:00', end:'12:00' }));
  await ssLoad(true); await sleep(200);
  ok('After confirming, Bea gets booked every morning: Springfield mornings is "being re-checked" and left out of what\'s shared', /being re-checked/.test(document.getElementById('ssDesk').innerText) && !/Springfield \(mornings/.test(window.__copied=''||(StaffingRules.shareable(DATA.ops_settings.staffing_sheet, StaffingRules.sheet(window.__POOL, { today:new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago'}).format(new Date()), overlay:Object.fromEntries((DATA.caregiver_overlay).map(o=>[o.axiscare_id,o])).valueOf(), towns:['Springfield','Nixa','Ozark'] }), new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago'}).format(new Date())).text)), document.getElementById('ssDesk').innerText);
  window.__as('sally@mo-care.com','Sally Staffing'); renderMyDay(); await sleep(200);
  ok('Today (Staffing): "Staffing sheet: 1 changed since confirmed"', /Staffing sheet: \d changed since confirmed/.test(document.getElementById('myDayList').innerText), document.getElementById('myDayList').innerText.slice(0,400));
  window.__as('krystal@mo-care.com','Krystal Land'); switchTab('hourswatch'); swSubGo('hours'); await sleep(300);
  ok('A Care Coordinator can see the sheet but not confirm or set by hand', !/Confirm this week/.test(box().innerText) && /Staffing Coordinators and owners confirm/.test(box().innerText));
  DATA.ops_settings.staffing_sheet=null; window.__as('krystal@mo-care.com','Krystal Land'); switchTab('referrers'); await sleep(200);
  ok('Not confirmed: the desk says "Openings we expect, not confirmed yet" and offers nothing to copy', /not confirmed yet/.test(document.getElementById('ssDesk').innerText) && ![...document.getElementById('ssDesk').querySelectorAll('button')].some(b=>/Copy/.test(b.textContent)));
  return R; }"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []
    pg = b.new_page(viewport={'width': 1280, 'height': 1000})
    pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    pg.goto(f'http://localhost:{PORT}/index.html?proof=ssheet'); pg.wait_for_timeout(1500)
    for s in (STUB, DATA, FAKE): pg.evaluate('s=>(0,eval)(s)', s)
    R = pg.evaluate(T)
    ph = b.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True)
    ph.on('pageerror', lambda e: errs.append(str(e)[:300]))
    ph.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    ph.goto(f'http://localhost:{PORT}/index.html?proof=ssheet'); ph.wait_for_timeout(1500)
    for s in (STUB, DATA, FAKE): ph.evaluate('s=>(0,eval)(s)', s)
    w = ph.evaluate("""async()=>{ document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; CC_ROLE_BY_EMAIL['sally@mo-care.com']=['staffing_coordinator']; window.__as('sally@mo-care.com','Sally Staffing');
      switchTab('hourswatch'); swSubGo('hours'); await new Promise(r=>setTimeout(r,800)); return { sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth }; }""")
    R.append(['PASS' if w['sw'] <= w['cw'] + 1 else 'FAIL', 'on a phone: the sheet scrolls inside its own box, the page never scrolls sideways', str(w)])
    ph.screenshot(path='/tmp/ss_phone.png', full_page=False); pg.screenshot(path='/tmp/ss_desk.png')
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

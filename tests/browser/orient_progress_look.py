"""Orientation tab (Samantha 2026-11-01): who was invited and when, the unit they are on, who is stuck, who finished. The real Hub
page, offline (files served from this folder, no server needed), made-up people only; the Training read is answered here, the
one setting save is recorded, nobody is texted, emailed or called.
(python3 tests/browser/orient_progress_look.py; SHOTS=<dir> also saves screenshots)"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = os.environ.get('SHOTS')
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const H=3600e3, D=24*H, ago=ms=>new Date(Date.now()-ms).toISOString();
  const full=n=>({ module:n, scene:9, complete:true, heard:10, first_at:ago(5*D), last_at:ago(5*D), moved_at:ago(5*D) });
  const ROWS=[
    { name:'Fake Stuck Person', axiscare_id:'9001', phone:'4175550101', email:'stuck@example.test', status_label:'In Training', status:'in_progress',
      assigned_at:ago(6*D), welcome_sent_at:ago(6*D), nudged_at:ago(2*D), due_date:new Date(Date.now()+D).toLocaleDateString('en-CA',{timeZone:'America/Chicago'}),
      messages:[{ kind:'invite', how:'office', by:'krystal@mo-care.com', channels:['text','email'], at:ago(6*D) }, { kind:'reminder', how:'automatic', channels:['text','email'], at:ago(2*D) },
        { kind:'reminder', how:'office', by:'krystal@mo-care.com', channels:['email'], not_sent:['text: after 6pm'], at:ago(1*D) }], units:[full(1),full(2),full(3),{ module:4, scene:2, complete:false, heard:3, first_at:ago(4*D), last_at:ago(1*H), moved_at:ago(3*D) }] },
    { name:'Fake Moving Person', axiscare_id:'9002', phone:'4175550102', status_label:'In Training', status:'in_progress',
      assigned_at:ago(2*D), welcome_sent_at:ago(2*D), units:[full(1),{ module:2, scene:6, complete:false, heard:7, first_at:ago(3*H), last_at:ago(1*H), moved_at:ago(1*H) }] },
    { name:'Fake Never Opened', axiscare_id:'9003', phone:'4175550103', status_label:'In Training', status:'not_started', assigned_at:ago(9*D), welcome_sent_at:ago(9*D), due_date:'2026-01-02', units:[] },
    { name:'Fake Just Invited', axiscare_id:'9004', status_label:'In Training', status:'not_started', assigned_at:ago(3*H), welcome_sent_at:ago(3*H), units:[] },
    { name:'Fake Finished', axiscare_id:'9005', status_label:'Active', status:'complete', assigned_at:ago(20*D), welcome_sent_at:ago(20*D), completed_at:ago(10*D), attested_at:ago(10*D), units:[1,2,3,4,5,6,7,8,9,10,11].map(full),
      certificate_at:ago(10*D), messages:[{ kind:'certificate', how:'caregiver', channels:['email'], at:ago(10*D) }] },
    { name:'Fake No Signoff', axiscare_id:'9006', status_label:'Active', status:'complete', assigned_at:ago(30*D), completed_at:ago(25*D), cleared_notified_at:ago(24*D), certificate_at:ago(25*D), units:[1,2,3,4,5,6,7,8,9,10,11].map(full) } ];
  const AFTER={ ok:true, rows:[{ axiscare_id:'9005', name:'Fake Finished', card:'closed', active:{ state:'confirmed', at:ago(10*D), at_orientation:true }, approved:{ at:ago(9*D), by:'The Hub (verified)' },
    text:{ state:'sent', at:ago(9*D) }, checkin:{ done:false, at:null, opened_at:ago(9*D) } }] };
  let AFAIL=false; const INV=[];
  window.__inv=async(name,o)=>{ INV.push([name,o&&o.body&&o.body.action]); if(name==='caregiver-journey') return AFAIL?{ data:null, error:{ message:'Edge Function returned a non-2xx status code' } }:{ data:AFTER, error:null }; return { data:null, error:null }; };
  /* the real client makes .functions fresh on every read, so wrap it */
  (0,eval)("sb=new Proxy(sb||{},{ get:(t,k)=>k==='functions'?{ invoke:(n,o)=>window.__inv(n,o) }:(typeof t[k]==='function'?t[k].bind(t):t[k]) });");
  DATA.coordinator_staff=[{ name:'Krystal Land', email:'krystal@mo-care.com' }];
  const CALLS=[], WRITES=[]; let FAIL=false;
  window.fetch=async(u,o)=>{ if(String(u).includes('/functions/v1/hub-training-data')){ CALLS.push(String(u));
      return FAIL?new Response(JSON.stringify({error:'Sign in to the Hub with an office account first.'}),{status:401}):new Response(JSON.stringify(ROWS),{status:200}); }
    return new Response('{}',{status:200}); };
  (0,eval)("trainHubTok=async()=>'t'");
  window.tkMerge=async(fn,what)=>{ const m=JSON.parse(JSON.stringify(DATA.ops_settings||{})); fn(m); DATA.ops_settings=m; WRITES.push(what); return { changed:[what] }; };
  (0,eval)('tkMerge=window.tkMerge');
  (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha Troutman' };"); CC_ROLES=['owner_admin']; CC_ROLES_CHECKED=true; CC_ROLE_BY_EMAIL['samantha@mo-care.com']=['owner_admin'];
  DATA.ops_settings=DATA.ops_settings||{};
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; await sleep(300);

  /* the pill count, as sign-in starts it */
  OPR.watch(); await sleep(150);
  const pb=document.getElementById('orpPillBadge');
  ok('the Orientation pill shows 2 (the stuck one and the one who never opened it)', pb && pb.style.display!=='none' && pb.textContent==='2', pb&&[pb.style.display,pb.textContent]);
  ok('it read through hub-training-data orientation_progress', CALLS.some(u=>u.includes('?action=orientation_progress')), CALLS);

  switchTab('orientprog'); await sleep(250);
  const P=document.getElementById('tab-orientprog'), t=()=>P.innerText;
  ok('the tab is open in Recruit & Onboard, the Orientation pill lit', P.classList.contains('active') && document.querySelector('.fpill[data-tab="orientprog"]').classList.contains('active'));
  const cards=[...P.querySelectorAll('.orp-card')].map(c=>c.querySelector('h3').innerText);
  ok('four lists in order: Needs you, In orientation, Invited, Finished', JSON.stringify(cards)==='["Needs you (3)","In orientation (1)","Invited, not started yet (1)","Finished in the last 60 days (1)"]', cards);
  const need=P.querySelectorAll('.orp-card')[0].innerText;
  ok('stuck: unit, screen, how long, and that they came back but could not get further', /Fake Stuck Person/.test(need) && /Unit 4 of 11: Caring for Clients the Caring Companions Way, screen 3 of 12/.test(need) && /Stuck on Unit 4, screen 3 of 12: no new screen since/.test(need) && /3 days ago/.test(need) && /could not get further/.test(need), need);
  ok('stuck: invited when', /Invited [A-Z][a-z]{2} \d+, \d+:\d\d [AP]M/.test(need), need);
  ok('never opened: invited 9 days ago and has not opened orientation yet', /Fake Never Opened/.test(need) && /Invited 9 days ago and has not opened orientation yet/.test(need), need);
  ok('finished without signing off: in Needs you, worded as a note', /Fake No Signoff/.test(need) && /never signed off/.test(need), need);
  ok('the stuck one comes first', need.indexOf('Fake Stuck Person') < need.indexOf('Fake Never Opened') && need.indexOf('Fake Never Opened') < need.indexOf('Fake No Signoff'));
  const inp=P.querySelectorAll('.orp-card')[1].innerText;
  ok('moving today: Unit 2, screen 7, 1 unit done, no alert', /Fake Moving Person/.test(inp) && /Unit 2 of 11: Becoming a Caring Companion, screen 7 of 12 · 1 unit done/.test(inp) && !/Stuck/.test(inp), inp);
  const bars=P.querySelectorAll('.orp-bar');
  ok('the unit bar: stuck person has 3 done and Unit 4 in red', bars.length===2 && bars[0].querySelectorAll('i.d').length===3 && bars[0].querySelectorAll('i.s').length===1, bars.length);
  ok('just invited: waiting, no alert', /Fake Just Invited/.test(P.querySelectorAll('.orp-card')[2].innerText) && /Has not opened orientation yet/.test(P.querySelectorAll('.orp-card')[2].innerText));
  ok('finished: the day and the sign-off', /Fake Finished/.test(P.querySelectorAll('.orp-card')[3].innerText) && /Finished [A-Z][a-z]{2} \d+.* · signed off/.test(P.querySelectorAll('.orp-card')[3].innerText));
  const calls=[...P.querySelectorAll('.acts a')].filter(a=>a.innerText==='Call');
  ok('Call buttons go through the office line (no tel: link)', calls.length===3 && calls.every(a=>!String(a.getAttribute('href')||'').startsWith('tel:')), calls.map(a=>a.outerHTML.slice(0,120)));
  ok('summary counts', /3\s*Need you/.test(t()) && /2\s*In orientation/.test(t()) && /2\s*Invited, not started/.test(t()) && /2\s*Finished, last 60 days/.test(t()), P.querySelector('.orp-sum').innerText);

  ok('the readiness cards were read once with the list', INV.some(x=>x[0]==='caregiver-journey'&&x[1]==='orientation_after'), INV);
  ok('stuck person: due tomorrow, and every invite and reminder with who and how', /due [A-Z][a-z]{2} \d+/.test(need) && /Sent: Invite [A-Z][a-z]{2} \d+, by Krystal, text and email · Reminder [A-Z][a-z]{2} \d+, automatic, text and email · Reminder [A-Z][a-z]{2} \d+, by Krystal, email \(text: after 6pm\)/.test(need), need);
  ok('never opened: past due in red', /past due Jan 2/.test(need) && P.querySelector('.orp-late'), need);
  const fin=P.querySelectorAll('.orp-card')[3].innerText;
  ok('finished (new way): certificate emailed, Active, approved, text sent, check-in call waiting', /After finishing: Certificate emailed [A-Z][a-z]{2} \d+ · Active in AxisCare [A-Z][a-z]{2} \d+ · Approved to Work [A-Z][a-z]{2} \d+ · "You finished your orientation" text sent [A-Z][a-z]{2} \d+ · Check-in call waiting since/.test(fin), fin);
  ok('finished (older way): certificate saved, Active from AxisCare status, the cleared text', /After finishing: Certificate saved [A-Z][a-z]{2} \d+ · Active in AxisCare · "Cleared to work" text sent/.test(need), need);
  AFAIL=true; await OPR.load(); await sleep(50);
  ok('readiness read fails: said on the page, the Training lines still show', /Could not read the readiness cards/.test(t()) && /Certificate emailed/.test(t()) && /Readiness card not read/.test(t()) && !/Approved to Work [A-Z]/.test(t()), t().slice(0,400));
  AFAIL=false; await OPR.load(); await sleep(50);

  /* the stuck setting */
  document.getElementById('orpDays').value='5'; await OPR.saveDays(); await sleep(50);
  ok('Stuck after 5 days: saved to ops_settings', DATA.ops_settings.orient_stuck_days===5 && WRITES.length===1, DATA.ops_settings);
  ok('...and at 5 days the stuck one (3 days) is no longer stuck; the pill drops to 1', !/Stuck on Unit 4/.test(t()) && pb.textContent==='1', pb.textContent);
  document.getElementById('orpDays').value='0'; await OPR.saveDays();
  ok('a bad number is refused', /1 to 30/.test(document.getElementById('orpDaysSaved').innerText) && WRITES.length===1);
  DATA.ops_settings.orient_stuck_days=2;

  /* a failed read says so, and keeps the last list */
  FAIL=true; await OPR.load(); await sleep(50);
  ok('a failed read is shown, not hidden, and the last list stays', /Could not read orientation: Sign in to the Hub/.test(t()) && /Fake Stuck Person/.test(t()), t().slice(0,300));
  FAIL=false;

  /* phone width */
  return R;
}
"""
MIME = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.json':'application/json', '.webmanifest':'application/json'}
def serve(route):
    url = route.request.url
    if 'supabase.co' in url: return route.abort()
    if not url.startswith('http://orientprog.local/'): return route.continue_()
    p = (ROOT / url.split('http://orientprog.local/', 1)[1].split('?')[0].split('#')[0])
    if not p.is_file(): return route.fulfill(status=404, body='')
    route.fulfill(status=200, body=p.read_bytes(), content_type=MIME.get(p.suffix, 'application/octet-stream'))
with sync_playwright() as pw:
    b = pw.chromium.launch(); cx = b.new_context(viewport={'width': 1280, 'height': 900}, timezone_id='America/Chicago'); pg = cx.new_page()
    pg.route('**/*', serve)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    if SHOTS: os.makedirs(SHOTS, exist_ok=True)
    pg.goto('http://orientprog.local/index.html?proof=orientprog'); pg.wait_for_timeout(1500)
    R = pg.evaluate(T)
    pg.evaluate("()=>OPR.load()"); pg.wait_for_timeout(300)
    if SHOTS: pg.locator('#tab-orientprog').screenshot(path=os.path.join(SHOTS, 'orientation_tab.png'))
    pg.set_viewport_size({'width': 390, 'height': 844}); pg.wait_for_timeout(200)
    over = pg.evaluate("()=>document.getElementById('tab-orientprog').scrollWidth > document.documentElement.clientWidth + 2")
    R.append(['PASS' if not over else 'FAIL', 'phone width: no sideways scroll', over])
    if SHOTS: pg.screenshot(path=os.path.join(SHOTS, 'orientation_tab_phone.png'), full_page=False)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

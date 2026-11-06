"""Orientation tab (Samantha 2026-11-01): who was invited and when, the unit they are on, who is stuck, who finished. 2026-11-02: the
counts are sub-tabs, one search looks through every tab, Finished is everyone who ever finished (25 at a time, time filter, only
with a problem), each with the certificate PDF. The real Hub
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
    { name:'Fake Never Opened', axiscare_id:'9003', phone:'4175550103', status_label:'Active', status:'not_started', assigned_at:ago(9*D), welcome_sent_at:ago(9*D), due_date:'2026-01-02', units:[] },
    { name:'Fake Just Invited', axiscare_id:'9004', status_label:'In Training', status:'not_started', assigned_at:ago(3*H), welcome_sent_at:ago(3*H), units:[] },
    { name:'Fake Finished', axiscare_id:'9005', status_label:'Active', status:'complete', assigned_at:ago(20*D), welcome_sent_at:ago(20*D), completed_at:ago(10*D), attested_at:ago(10*D), units:[1,2,3,4,5,6,7,8,9,10,11].map(full),
      certificate_at:ago(10*D), messages:[{ kind:'certificate', how:'caregiver', channels:['email'], at:ago(10*D) }] },
    { name:'Fake No Signoff', axiscare_id:'9006', status_label:'Active', status:'complete', assigned_at:ago(30*D), completed_at:ago(25*D), cleared_notified_at:ago(24*D), certificate_at:ago(25*D), units:[1,2,3,4,5,6,7,8,9,10,11].map(full) } ];
  const FIN=[ Object.assign({}, ROWS[4], { training_id:'00000000-0000-0000-0000-000000009005', has_pdf:true, active:true }),
    Object.assign({}, ROWS[5], { training_id:'00000000-0000-0000-0000-000000009006', has_pdf:false, active:true }),
    ...Array.from({length:30}, (_, i) => ({ training_id:'00000000-0000-0000-0000-0000000081' + String(i).padStart(2,'0'), name:'Fake Old ' + (i+1), axiscare_id:String(8100+i), phone:'41755581' + String(i).padStart(2,'0'),
      status_label:'Active', active:true, completed_at:ago((31+i)*D), attested_at:ago((31+i)*D), has_pdf:true, messages:[] })),
    { training_id:'00000000-0000-0000-0000-000000007001', name:'Fake Long Ago', axiscare_id:'7001', status_label:'Inactive', active:false, completed_at:ago(400*D), has_pdf:false, messages:[] } ].map(x => { const y = Object.assign({}, x); delete y.units; delete y.status; return y; });
  const AFTER={ ok:true, rows:[{ axiscare_id:'9005', name:'Fake Finished', card:'closed', active:{ state:'confirmed', at:ago(10*D), at_orientation:true }, approved:{ at:ago(9*D), by:'The Hub (verified)' },
    text:{ state:'sent', at:ago(9*D) }, checkin:{ done:false, at:null, opened_at:ago(9*D) } }] };
  let AFAIL=false; const INV=[];
  window.__inv=async(name,o)=>{ INV.push([name,o&&o.body&&o.body.action]); if(name==='caregiver-journey') return AFAIL?{ data:null, error:{ message:'Edge Function returned a non-2xx status code' } }:{ data:AFTER, error:null }; return { data:null, error:null }; };
  /* the real client makes .functions fresh on every read, so wrap it */
  (0,eval)("sb=new Proxy(sb||{},{ get:(t,k)=>k==='functions'?{ invoke:(n,o)=>window.__inv(n,o) }:(typeof t[k]==='function'?t[k].bind(t):t[k]) });");
  DATA.coordinator_staff=[{ name:'Krystal Land', email:'krystal@mo-care.com' }];
  const CALLS=[], WRITES=[]; let FAIL=false;
  window.fetch=async(u,o)=>{ if(String(u).includes('/functions/v1/hub-training-data')){ CALLS.push(String(u) + (o && o.body && o.body !== '{}' ? ' ' + o.body : ''));
      if(FAIL) return new Response(JSON.stringify({error:'Sign in to the Hub with an office account first.'}),{status:401});
      if(String(u).includes('orientation_finished')) return new Response(JSON.stringify(FIN),{status:200});
      if(String(u).includes('certificate_link')) return new Response(JSON.stringify({ url:'https://example.test/cert.pdf' }),{status:200});
      return new Response(JSON.stringify(ROWS),{status:200}); }
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
  ok('the pill read did not fetch the whole finished history (only opening the tab does, once)', CALLS[0].includes('orientation_progress') && CALLS.filter(u=>u.includes('orientation_finished')).length===1, CALLS);
  const tabs=()=>[...P.querySelectorAll('.orp-tab')].map(x=>x.innerText.replace(/\s+/g,' ').trim());
  const body=()=>P.querySelector('.orp-card').innerText;
  ok('five tabs with their counts', JSON.stringify(tabs())==='["3 Needs you","0 Finish line","1 In orientation","1 Invited, not started","33 Finished"]', tabs());
  ok('it opens on Needs you (the first tab with work), shown red', P.querySelector('.orp-tab.on') && /Needs you/.test(P.querySelector('.orp-tab.on').innerText) && P.querySelector('.orp-tab.on').classList.contains('hot'));
  ok('opening the tab read everyone who finished', CALLS.some(u=>u.includes('?action=orientation_finished')), CALLS);
  const need=body();
  ok('stuck: unit, screen, how long, and that they came back but could not get further', /Fake Stuck Person/.test(need) && /Unit 4 of 11: Caring for Clients the Caring Companions Way, screen 3 of 12/.test(need) && /Stuck on Unit 4, screen 3 of 12: no new screen since/.test(need) && /3 days ago/.test(need) && /could not get further/.test(need), need);
  ok('stuck: invited when', /Invited [A-Z][a-z]{2} \d+, \d+:\d\d [AP]M/.test(need), need);
  ok('never opened: invited 9 days ago and has not opened orientation yet', /Fake Never Opened/.test(need) && /Invited 9 days ago and has not opened orientation yet/.test(need), need);
  ok('a current caregiver redoing orientation is tagged Already working (only them)', P.querySelectorAll('.orp-card .orp-chip[title^="Already Active"]').length===1 && /Fake Never Opened\s*Not started\s*Already working/.test(need), need);
  ok('finished without signing off: in Needs you, worded as a note', /Fake No Signoff/.test(need) && /never signed off/.test(need), need);
  ok('the stuck new hire comes first, then the one already working, then the note', need.indexOf('Fake Stuck Person') < need.indexOf('Fake Never Opened') && need.indexOf('Fake Never Opened') < need.indexOf('Fake No Signoff'));
  const bars=P.querySelectorAll('.orp-bar');
  ok('the unit bar: stuck person has 3 done and Unit 4 in red', bars.length===1 && bars[0].querySelectorAll('i.d').length===3 && bars[0].querySelectorAll('i.s').length===1, bars.length);
  const calls=[...P.querySelectorAll('.acts a')].filter(a=>a.innerText==='Call');
  ok('Call buttons go through the office line (no tel: link)', calls.length===2 && calls.every(a=>!String(a.getAttribute('href')||'').startsWith('tel:')), calls.map(a=>a.outerHTML.slice(0,120)));
  ok('the readiness cards were read once with the list', INV.some(x=>x[0]==='caregiver-journey'&&x[1]==='orientation_after'), INV);
  ok('stuck person: due tomorrow, and every invite and reminder with who and how', /due [A-Z][a-z]{2} \d+/.test(need) && /Sent: Invite [A-Z][a-z]{2} \d+, by Krystal, text and email · Reminder [A-Z][a-z]{2} \d+, automatic, text and email · Reminder [A-Z][a-z]{2} \d+, by Krystal, email \(text: after 6pm\)/.test(need), need);
  ok('never opened: past due in red', /past due Jan 2/.test(need) && P.querySelector('.orp-late'), need);
  ok('finished (older way): certificate saved, Active from AxisCare status, the cleared text', /After finishing: Certificate saved [A-Z][a-z]{2} \d+ · Active in AxisCare · "Cleared to work" text sent/.test(need), need);
  ok('no "older way" warning anywhere', !/the older way\)/.test(t()), t().slice(0,200));

  OPR.tab('inp'); await sleep(30);
  ok('In orientation: Unit 2, screen 7, 1 unit done, no alert', /Fake Moving Person/.test(body()) && /Unit 2 of 11: Becoming a Caring Companion, screen 7 of 12 · 1 unit done/.test(body()) && !/Stuck/.test(body()), body());
  OPR.tab('wait'); await sleep(30);
  ok('Invited, not started: waiting, no alert', /Fake Just Invited/.test(body()) && /Has not opened orientation yet/.test(body()), body());
  OPR.tab('fin'); await sleep(30);
  ok('Finish line empty says so', /Nobody is waiting at the finish line/.test(body()), body());

  OPR.tab('done'); await sleep(30);
  const frows=()=>[...P.querySelectorAll('.orp-frow:not(.hd)')];
  ok('Finished: one line each, 25 at a time, last 90 days by default', frows().length===25 && /Showing 25 of 32/.test(t()) && document.getElementById('orpWin').value==='90', [frows().length, document.getElementById('orpWin')&&document.getElementById('orpWin').value]);
  ok('newest first', frows()[0].innerText.startsWith('Fake Finished') && /Fake No Signoff/.test(frows()[1].innerText), frows().slice(0,2).map(x=>x.innerText));
  const ff=frows()[0];
  ok('a line: name, signed off, the day, where they are after finishing, PDF', /Signed off [A-Z][a-z]{2} \d+/.test(ff.innerText) && /Check-in call waiting/.test(ff.innerText) && [...ff.querySelectorAll('button')].some(x=>x.innerText==='PDF'), ff.innerText);
  ok('a line with a phone has Call through the office line', [...frows()[2].querySelectorAll('a')].some(x=>x.innerText==='Call' && !String(x.getAttribute('href')||'').startsWith('tel:')), frows()[2].innerHTML.slice(0,300));
  ok('no PDF saved says so (no button)', /No PDF saved/.test(frows()[1].innerText) && ![...frows()[1].querySelectorAll('button')].some(x=>x.innerText==='PDF'), frows()[1].innerText);
  ok('no full history until the name is opened', !/After finishing:/.test(ff.innerText));
  [...P.querySelectorAll('.orp-foot button')].find(x=>/Show 7 more/.test(x.innerText)).click(); await sleep(30);
  ok('Show 7 more shows all 32', frows().length===32 && !/Showing/.test(t()), frows().length);
  OPR.win('all'); await sleep(30);
  ok('Everyone: 33, with the one who finished 400 days ago and left', frows().length===25 && /Showing 25 of 33/.test(t()), frows().length);
  OPR.win('30'); await sleep(30);
  ok('Last 30 days: 2', frows().length===2, frows().map(x=>x.innerText.split('\n')[0]));
  OPR.win('90'); OPR.prob(true); await sleep(30);
  ok('Only with a problem: the one who never signed off', frows().length===1 && /Fake No Signoff/.test(frows()[0].innerText) && /never signed off/.test(frows()[0].innerText), frows().map(x=>x.innerText));
  OPR.prob(false); await sleep(30);
  frows()[0].querySelector('.orp-hist').click(); await sleep(30);
  const fd=frows()[0].innerText;
  ok('History opens the full history', /After finishing: Certificate emailed [A-Z][a-z]{2} \d+ · Active in AxisCare [A-Z][a-z]{2} \d+ · Approved to Work [A-Z][a-z]{2} \d+ · "You finished your orientation" text sent [A-Z][a-z]{2} \d+ · Check-in call waiting since/.test(fd) && /Training Platform/.test(fd), fd);
  const W=[]; window.open=()=>{ const w={ location:'', close(){ w.closed=true; } }; W.push(w); return w; };
  [...frows()[0].querySelectorAll('button')].find(x=>x.innerText==='PDF').click(); await sleep(80);
  ok('PDF: asks for a private link for that person and opens it', W.length===1 && W[0].location==='https://example.test/cert.pdf' && CALLS.some(u=>u.includes('certificate_link') && u.includes('00000000-0000-0000-0000-000000009005')), [W, CALLS.slice(-2)]);

  /* one search through every tab */
  OPR.find('stuck'); await sleep(200);
  ok('search by name finds them in their tab', /Needs you \(1\)/.test(t()) && /Fake Stuck Person/.test(t()) && !P.querySelector('.orp-tab.on'), t().slice(0,300));
  OPR.find('555 0102'); await sleep(200);
  ok('search by phone digits', /In orientation \(1\)/.test(t()) && /Fake Moving Person/.test(t()) && !/Fake Stuck/.test(t()), t().slice(0,300));
  OPR.find('long ago'); await sleep(200);
  ok('search reaches the full finished history', /Finished \(1\)/.test(t()) && /Fake Long Ago/.test(t()), t().slice(0,300));
  OPR.find('9002'); await sleep(200);
  ok('search by AxisCare number', /Fake Moving Person/.test(t()), t().slice(0,300));
  OPR.find('zzzz'); await sleep(200);
  ok('no match says so', /Nobody matches "zzzz"/.test(t()), t().slice(0,300));
  OPR.find(''); await sleep(200);

  OPR.tab('done'); await sleep(20);
  AFAIL=true; await OPR.load(); await sleep(50);
  ok('readiness read fails: said on the page, the Training lines still show', /Could not read the readiness cards/.test(t()) && /Certificate emailed/.test(t()) && /Readiness card not read/.test(t()) && !/Approved to Work [A-Z]/.test(t()), t().slice(0,400));
  AFAIL=false; await OPR.load(); await sleep(50);
  OPR.tab('need'); await sleep(20);

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
    if SHOTS:
        pg.evaluate("()=>{ OPR.tab('done'); document.querySelector('.orp-frow:not(.hd) .orp-hist').click(); }"); pg.wait_for_timeout(150)
        pg.locator('#tab-orientprog').screenshot(path=os.path.join(SHOTS, 'orientation_finished.png'))
        pg.evaluate("()=>OPR.tab('need')"); pg.wait_for_timeout(100)
    pg.set_viewport_size({'width': 390, 'height': 844}); pg.wait_for_timeout(200)
    over = pg.evaluate("()=>document.getElementById('tab-orientprog').scrollWidth > document.documentElement.clientWidth + 2")
    R.append(['PASS' if not over else 'FAIL', 'phone width: no sideways scroll', over])
    if SHOTS: pg.screenshot(path=os.path.join(SHOTS, 'orientation_tab_phone.png'), full_page=False)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

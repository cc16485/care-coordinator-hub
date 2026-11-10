"""After-Hours shift card (2026-11-09, Katlin's Portal Plan). The real Hub page, offline, with the Team Work test's
made-up people plus Katlin, opened on a computer in VIETNAM (Asia/Ho_Chi_Minh) on Monday Nov 9, 5:45pm Missouri time
(Tuesday 6:45am in Vietnam). Checks: duty windows are read in Missouri time wherever the computer is; Katlin's After
Hours window puts her on duty and on shift for Team Work; her card shows both clocks, her own interviews and the role
card; nobody else gets the card; an owner writes the role card in Settings (saved through the audited save); after her
shift the card shows the next one. Nothing is texted. (python3 tests/browser/after_hours_shift_look.py; SHOTS=<dir>)"""
import os, sys, pathlib, re
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = os.environ.get('SHOTS')
src = (ROOT / 'tests/browser/team_work_look.py').read_text()
STUB = re.search(r'STUB = r"""(.*?)"""', src, re.S).group(1)
EXTRA = r"""
(()=>{
  const KT='katlin@mo-care.com';
  (0,eval)(`OPS_PEOPLE.push({ person_id:'p_kt', full_name:'Katlin Fake', primary_email:'${KT}' });
    sb.from=(t)=>{ const rows={ coordinators:[{ id:'c_kt', name:'Katlin Fake', email:'${KT}' },{ id:'c_k', name:'Krystal Land', email:'krystal@mo-care.com' }],
        interview_bookings:[{ id:'b1', applicant_id:'a1', starts_at:'2026-11-10T00:00:00Z', status:'booked', coordinator_id:'c_kt' }],
        job_applicants:[{ id:'a1', first_name:'Jane', last_name:'Applicant (fake)' }] }[t]||[];
      window.__log.tables=(window.__log.tables||[]).concat([t]);
      const p={ select(){return p;}, eq(){return p;}, gte(){return p;}, lt(){return p;}, in(){return p;}, order(){return p;}, limit(){return p;},
        then(a){ return Promise.resolve({data:rows,error:null}).then(a); } }; return p; };`);
  DATA.coordinator_staff.push({ id:'skt', name:'Katlin Fake', email:KT });
  DATA.duty_windows.push({ id:'dkt', area:'after_hours', person:KT, recur:{ days:[1,2,3,4,5], from:'17:30', to:'19:30' } });
  DATA.ops_settings={ team_work_live:true };
  DATA.ops_items.push({ id:'mci_now', kind:'staffing_issue', opened_by:'timekeeper', status:'open', urgency:'urgent', title:'Missed clock-in 5:30 PM visit (fake)', owner:'krystal@mo-care.com', client_ax:'101', created_at:new Date().toISOString() });
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, $=id=>document.getElementById(id), KT='katlin@mo-care.com';
  const as=(e,n)=>(0,eval)("ME={ email:'"+e+"', name:'"+n+"', shift:'day' };");
  const pin=()=>($('afhPin')||{}).innerText||'';
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  const now=new Date();
  ok('the test computer is in Vietnam (6:45am there)', /Ho_Chi_Minh|Saigon/.test(Intl.DateTimeFormat().resolvedOptions().timeZone) && now.getHours()===6, [Intl.DateTimeFormat().resolvedOptions().timeZone, now.getHours()]);

  /* ── Missouri time wherever the computer is ── */
  const h=dutyHolder('after_hours', now);
  ok('After Hours is Katlin right now (5:45pm Missouri), read in Missouri time', h && h.person===KT, h);
  ok('Krystal (8am to 2pm Missouri) is not on Operations now', !dutyHolder('operations', now), dutyHolder('operations', now));
  ok('at 10am Missouri Krystal is on Operations', (dutyHolder('operations', new Date('2026-11-09T10:00:00-06:00'))||{}).person==='krystal@mo-care.com');

  /* ── Team Work: on shift ── */
  const end=TW.shiftEnd(KT, now.getTime());
  ok('Team Work counts Katlin on shift until 7:30pm Missouri', end===Date.parse('2026-11-09T19:30:00-06:00'), [end, new Date(end||0).toISOString()]);
  ok('Team Work: nobody else is on an office shift now', TW.shiftEnd('krystal@mo-care.com', now.getTime())==null);
  ok('Team Work: Katlin is on duty now (no Care Coordinator role needed)', JSON.stringify(TW.onDuty(TW.ctx()))===JSON.stringify([KT]), TW.onDuty(TW.ctx()));
  ok('new family work still goes only to Care Coordinators, never Katlin', TA.coordinators().indexOf(KT)===-1 && ((TA.lighterCoordinator&&TA.lighterCoordinator())||{}).email!==KT, [TA.coordinators(), TA.lighterCoordinator&&TA.lighterCoordinator()]);
  (0,eval)("ME={ email:'katlin@mo-care.com', name:'Katlin Fake', shift:'day' };");
  const care=TW.careForMe().map(x=>x.it.id);
  ok('care at risk reaches Katlin while she is on duty', care.length>0, care);
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Land', shift:'day' };");
  ok('and not Krystal, who is off now', TW.careForMe().length===0, TW.careForMe().map(x=>x.it.id));

  /* ── Katlin's My Work ── */
  as(KT,'Katlin Fake'); switchTab('mywork'); myWorkGo('today'); renderMyWork(); await sleep(400); renderMyWork(); await sleep(100);
  ok('the card is at the top of My Work', !!$('afhCard') && $('afhPin').compareDocumentPosition($('myWorkTabs')) & Node.DOCUMENT_POSITION_FOLLOWING, pin());
  ok('On shift now, until 7:30pm Missouri (8:30am your time)', /On shift now/.test(pin()) && /until 7:30pm Missouri \(8:30am your time\)/.test(pin()), pin());
  ok('her interview: 6:00pm Missouri (7:00am your time), Jane', /6:00pm Missouri \(7:00am your time\)/.test(pin()) && /Jane Applicant \(fake\)/.test(pin()), pin());
  ok('the role card says it is not written yet', /EVERY SHIFT/i.test(pin()) && /Not written yet/.test(pin()), pin());
  ok('how to reach the office: write on the card, End my shift', /write on the card itself/.test(pin()) && /End my shift/.test(pin()));
  window.__shot && await window.__shot('1-katlin');

  /* ── nobody else gets it ── */
  as('krystal@mo-care.com','Krystal Land'); renderMyWork(); await sleep(100);
  ok('Krystal (no After Hours window) sees no card', pin().trim()==='', pin());
  as('samantha@mo-care.com','Samantha Troutman'); renderMyWork(); await sleep(100);
  ok('Samantha sees no card on her own My Work', pin().trim()==='', pin());

  /* ── Settings: the owner writes the role card ── */
  switchTab('settings'); await sleep(150); AFH.settingsFill();
  const set=()=>($('afhSet')||{}).innerText||'';
  ok('Settings lists Katlin on After Hours, Mon to Fri 5:30pm to 7:30pm Missouri time', /Katlin Fake/.test(set()) && /Mon Tue Wed Thu Fri 5:30pm to 7:30pm \(Missouri time\)/.test(set()), set());
  $('afhEvery').value='Hold every booked interview\n- Check the EVV list'; $('afhDone').value='Notes are on the applicant'; $('afhNot').value='Family complaints';
  await AFH.saveRole(document.querySelector('#afhSet button')); await sleep(60);
  const rr=DATA.ops_settings.after_hours_role||{};
  ok('saved through the audited settings save, with who and when', L.writes.includes('ops_settings') && rr.every_shift==='Hold every booked interview\n- Check the EVV list' && rr.updated_by==='samantha@mo-care.com' && !!rr.updated_at, rr);
  ok('Team Work stayed on (her switch untouched)', DATA.ops_settings.team_work_live===true);
  as(KT,'Katlin Fake'); switchTab('mywork'); renderMyWork(); await sleep(100);
  ok('Katlin sees the role card, one item per line', /Hold every booked interview/.test(pin()) && /Check the EVV list/.test(pin()) && !/- Check/.test(pin()) && /Notes are on the applicant/.test(pin()) && /Family complaints/.test(pin()), pin());
  ok('Katlin cannot edit the role card', (AFH.settingsFill(), true) && (switchTab('settings'), true) && (AFH.settingsFill(), $('afhEvery').disabled===true));
  switchTab('mywork'); renderMyWork(); await sleep(50);
  /* ── the recruitment posting log ── */
  window.__asked=[]; window.ccConfirm=async m=>{ window.__asked.push(m); return true; };
  as(KT,'Katlin Fake'); switchTab('mywork'); renderMyWork(); await sleep(100);
  const card=()=>$('rpCard'), cv=(id,v)=>{ const x=card().querySelector('#'+id); x.value=v; };
  ok('the card has the posting log with where each business sends applicants', !!card() && /findcdscaregivers\.com/.test(card().innerText) && /21 and up/.test(card().innerText) && /No posts logged yet/.test(card().innerText), card()&&card().innerText);
  await AFH.addPost(card().querySelector('button')); await sleep(30);
  ok('it asks for the business first, saves nothing', /Pick which business/.test(card().innerText) && !(DATA.recruit_posts||[]).length);
  cv('rpBiz','cds'); cv('rpWhere','cna_school'); cv('rpPlace','Ozarks Tech CNA program'); cv('rpLink','https://example.com/p1');
  await AFH.addPost(card().querySelector('button')); await sleep(60);
  const p1=(DATA.recruit_posts||[])[0]||{};
  ok('Log this post · saved with who, when, business and place', p1.business==='cds' && p1.where==='cna_school' && p1.place==='Ozarks Tech CNA program' && p1.by===KT && !!p1.at && L.writes.includes('recruit_posts:'+p1.id), p1);
  ok('it shows on her card', /Ozarks Tech CNA program/.test(card().innerText) && /CDS/.test(card().innerText) && /0 applicants/.test(card().innerText), card().innerText);
  cv('rpBiz','cds'); cv('rpWhere','cna_school'); cv('rpPlace','  ozarks tech  CNA program'); cv('rpLink','');
  await AFH.addPost(card().querySelector('button')); await sleep(60);
  ok('same business, same place within 14 days: she is asked first', window.__asked.length===1 && /Already posted for CDS in Ozarks Tech CNA program/.test(window.__asked[0]) && DATA.recruit_posts.length===2, window.__asked);
  cv('rpBiz','cc'); cv('rpWhere','cna_school'); cv('rpPlace','Ozarks Tech CNA program');
  await AFH.addPost(card().querySelector('button')); await sleep(60);
  ok('another business in the same place is not a repeat', window.__asked.length===1 && DATA.recruit_posts.length===3);
  await AFH.addReply(p1.id); await AFH.addReply(p1.id); await sleep(30);
  ok('+1 applicant · counted and saved', p1.replies===2 && p1.replies_by===KT && /2 applicants/.test(card().innerText));
  as('samantha@mo-care.com','Samantha Troutman'); switchTab('settings'); await sleep(100); AFH.settingsFill();
  const full=()=>($('rpFull')||{}).innerText||'';
  ok('Settings · the whole log, who posted, and which places bring applicants', /Which places bring applicants/i.test(full()) && /Ozarks Tech CNA program\s*2 posts, 2 applicants/.test(full()) && /Katlin/.test(full()), full());
  AFH.logFilter('smn'); await sleep(20);
  ok('Settings · filter by business', /No posts logged yet/.test(full()));
  AFH.logFilter('');
  ok('no texts or emails were sent', !L.fn.some(f=>/send|sms|text|email|notify/i.test(f)), L.fn);
  return R;
}
"""
T2 = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const $=id=>document.getElementById(id), pin=()=>($('afhPin')||{}).innerText||'';
  (0,eval)("ME={ email:'katlin@mo-care.com', name:'Katlin Fake', shift:'day' };"); switchTab('mywork'); renderMyWork(); await sleep(150);
  ok('after her shift (8pm Missouri): Next shift Tue 5:30pm Missouri (Wed 6:30am your time)', /Next shift/.test(pin()) && /Tue 5:30pm Missouri \(Wed 6:30am your time\)/.test(pin()), pin());
  ok('After Hours has nobody at 8pm', !dutyHolder('after_hours', new Date()));
  return R;
}
"""
MIME = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.json':'application/json', '.webmanifest':'application/json'}
def serve(route):
    url = route.request.url
    if 'supabase.co' in url: return route.abort()
    if not url.startswith('http://teamwork.local/'): return route.continue_()
    p = (ROOT / url.split('http://teamwork.local/', 1)[1].split('?')[0].split('#')[0])
    if not p.is_file(): return route.fulfill(status=404, body='')
    route.fulfill(status=200, body=p.read_bytes(), content_type=MIME.get(p.suffix, 'application/octet-stream'))
def page(pw, when):
    b = pw.chromium.launch(); cx = b.new_context(viewport={'width': 1280, 'height': 900}, timezone_id='Asia/Ho_Chi_Minh'); pg = cx.new_page()
    pg.clock.install(time=when); pg.clock.resume()
    pg.route('**/*', serve)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://teamwork.local/index.html?proof=afterhours'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB); pg.evaluate('s=>(0,eval)(s)', EXTRA)
    return b, pg, errs
with sync_playwright() as pw:
    b, pg, errs = page(pw, '2026-11-09T17:45:00-06:00')
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True)
        pg.evaluate("()=>{ document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; DATA.ops_settings.after_hours_role={ every_shift:'Hold every booked interview, or reschedule it\\nCheck the EVV list\\nPost recruiting posts for all three businesses', done_means:'Interview notes are on the applicant\\nEach post is in the posting log', not_yours:'Family complaints\\nPay questions\\nAnything that needs a judgment call' }; DATA.recruit_posts=[{ id:'s1', at:'2026-11-09T23:50:00Z', by:'katlin@mo-care.com', business:'cds', where:'cna_school', place:'Ozarks Tech CNA program (fake)', replies:2 },{ id:'s2', at:'2026-11-09T23:40:00Z', by:'katlin@mo-care.com', business:'cc', where:'facebook_group', place:'Nixa Community Board (fake)', replies:0 },{ id:'s3', at:'2026-11-06T23:40:00Z', by:'katlin@mo-care.com', business:'smn', where:'facebook_group', place:'Branson Locals (fake)', replies:1 }]; (0,eval)(\"ME={ email:'katlin@mo-care.com', name:'Katlin Fake', shift:'day' };\"); switchTab('mywork'); myWorkGo('today'); renderMyWork(); }"); pg.wait_for_timeout(800)
        pg.evaluate("()=>renderMyWork()"); pg.wait_for_timeout(200)
        pg.locator('#afhPin').screenshot(path=os.path.join(SHOTS, '1-katlin-card.png'))
        pg.set_viewport_size({'width': 390, 'height': 900}); pg.wait_for_timeout(300)
        pg.locator('#afhPin').screenshot(path=os.path.join(SHOTS, '2-phone.png'))
        b.close(); print('saved to', SHOTS); sys.exit(0)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
    b, pg, errs = page(pw, '2026-11-09T20:00:00-06:00')
    R += pg.evaluate(T2); R.append(['PASS' if not errs else 'FAIL', 'no page errors (8pm)', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

"""Katlin's Follow-ups (2026-11-09, Samantha: personal follow-ups for applicants who "have not completed their form, have
not booked interview, or have fallen off at any stage"). The real Hub page, offline, on a computer in Vietnam on Tue
Nov 17, 11am Missouri time, with made-up applicants at every stage plus a no-show, a hire, someone booked, someone with
only background checks open (Krystal's) and someone only the office can move. Checks: the right people, longest first,
in her words, with the Hub's own Text and Call buttons and the latest text chip; the rest left out; desktop and phone
widths with no sideways scroll and no page errors; nothing is sent. (python3 tests/browser/katlin_followups_look.py;
SHOT=<png path>)"""
import os, sys, pathlib, re
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOT = os.environ.get('SHOT')
src = (ROOT / 'tests/browser/team_work_look.py').read_text()
STUB = re.search(r'STUB = r"""(.*?)"""', src, re.S).group(1)
EXTRA = r"""
(()=>{
  const KT='katlin@mo-care.com';
  (0,eval)(`OPS_PEOPLE.push({ person_id:'p_kt', full_name:'Katlin Fake', primary_email:'${KT}' });
    CC_ROLE_BY_EMAIL['${KT}']=['care_coordinator'];`);
  DATA.coordinator_staff.push({ id:'skt', name:'Katlin Fake', email:KT });
  DATA.ops_settings={ team_work_live:true, katlin_page:{ email:KT } };
  DATA.staffing_tasks=[]; DATA.recruit_posts=[];
  window.__alerts=[]; window.alert=m=>window.__alerts.push(String(m)); window.confirm=()=>true;
  const now=Date.now(), ago=d=>new Date(now-d*864e5).toISOString();
  /* Applicants (made up): the list the Applicants tab reads */
  (0,eval)(`AP_ROWS = ${JSON.stringify([
    { id:'ap1', first_name:'Wren', last_name:'Fakeform', status:'partial', phone:'4175550101', email:'wren@example.test', sms_consent:true, created_at:ago(3) },
    { id:'ap2', first_name:'Opal', last_name:'Nobook', status:'new', phone:'4175550102', sms_consent:true, created_at:ago(12) },
    { id:'ap3', first_name:'Rex', last_name:'Noshowfake', status:'noshow', phone:'4175550103', created_at:ago(6) },
    { id:'ap4', first_name:'Ivy', last_name:'Bookedfake', status:'new', phone:'4175550104', created_at:ago(5) },
    { id:'ap5', first_name:'Hal', last_name:'Hiredfake', status:'hired', hired_at:ago(10), offer_sent_at:ago(20), phone:'4175550105', created_at:ago(30) },
    { id:'ap6', first_name:'Dot', last_name:'Declinedfake', status:'declined', decline_reason:'not a fit', phone:'4175550106', created_at:ago(7) },
    { id:'ap7', first_name:'Gus', last_name:'Todayfake', status:'new', phone:'4175550107', created_at:new Date(now-3*36e5).toISOString() },
    { id:'ap8', first_name:'Mae', last_name:'Stepone', status:'offer', offer_sent_at:ago(9), phone:'4175550108', email:'mae@example.test', created_at:ago(15) }
  ])}; AP_BOOK = { ap4:{ applicant_id:'ap4', status:'booked', starts_at:'${new Date(now+2*864e5).toISOString()}' }, ap3:{ applicant_id:'ap3', status:'noshow' } };`);
  /* Offers and Onboarding (made up): ckdPeople's rows and each one's Onboarding row (obtModel's cells) */
  const W=(who,x)=>Object.assign({ s:'wait', who },x||{});
  const P=[
    { stop:0, name:'Mae Stepone', o:{ id:'of8', first_name:'Mae', last_name:'Stepone', phone:'4175550108', email:'mae@example.test', position:'Caregiver' }, j:{ offer_id:'of8', journey_id:'jr8', name:'Mae Stepone' },
      m:{ days:9, cells:{ offer:{ s:'ok' }, step1:W('applicant') } } },
    { stop:0, name:'Lou Offerfake', o:{ id:'of9', first_name:'Lou', last_name:'Offerfake', phone:'4175550109', position:'PRN Caregiver' },
      m:{ days:5, cells:{ offer:W('applicant',{ days:5 }) } } },
    { stop:1, name:'Bea Refsfake', c:{ id:31, first:'Bea', last:'Refsfake', phone:'4175550110', offer_id:'of10' },
      m:{ days:8, cells:{ offer:{ s:'ok' }, step1:{ s:'ok' }, oig:{ s:'ok' }, edl:{ s:'ok' }, fcsr:W('outside',{ days:2 }), casenet:{ s:'ok' }, refs:{ s:'todo', who:'office', days:6, late:true } } } },
    { stop:1, name:'Kit Checksfake', c:{ id:32, first:'Kit', last:'Checksfake', phone:'4175550111' },
      m:{ days:4, cells:{ step1:{ s:'ok' }, oig:{ s:'todo', who:'office' }, fcsr:W('outside',{ days:1 }), refs:{ s:'ok', t:'2/2' } } } },
    { stop:3, name:'Fay Orientfake', c:{ id:33, first:'Fay', last:'Orientfake', phone:'4175550112' },
      m:{ days:20, cells:{ step1:{ s:'ok' }, refs:{ s:'ok' }, step2:{ s:'ok' }, orient:W('applicant',{ t:'U2/6' }) } } },
    { stop:2, name:'Sam Officefake', c:{ id:34, first:'Sam', last:'Officefake', phone:'4175550113' },
      m:{ days:3, cells:{ step1:{ s:'ok' }, refs:{ s:'ok' }, orient:{ s:'todo', who:'office' } } } },
    { stop:4, name:'Ann Approvedfake', j:{ offer_id:'of14', approved_to_work:true }, m:{ days:30, cells:{} } }
  ];
  window.__fn=[];
  window.HSTRIP_ENGINE={ offers:()=>P.filter(p=>p.o).map(p=>p.o), offerStage:()=>'accepted', offerMovedOn:()=>false, offerIsQuiet:()=>false,
    people:()=>P, hydrated:()=>true, model:p=>p.m,
    step1Stuck:j=>j.journey_id==='jr8' ? { days:9, card:{ stuck_on:'work history' }, text:'' } : null };
  window.HP={ open:k=>window.__fn.push('open:'+JSON.stringify(k)) };
  ApText.load=()=>{}; Object.assign(ApText._latest(), { ap2:{ applicant_id:'ap2', kind:'office', status:'sent', sent_at:ago(2), created_by:'Krystal Land' } });
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const $=id=>document.getElementById(id), KT='katlin@mo-care.com';
  const as=(e,n)=>(0,eval)("ME={ email:'"+e+"', name:'"+n+"', shift:'day' };");
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  as(KT,'Katlin Fake'); KP.pillSync();
  const sub=()=>($('fsub2')||{}).innerText||'';
  ccParentClick('katlingrp'); await sleep(150);
  ok('Follow-ups is a pill on her page', /Follow-ups/.test(sub()), sub());
  switchTab('kpfollow'); await sleep(200);
  ok('it opens', activeTab==='kpfollow', activeTab);
  const host=$('kpWrapFollow'), txt=host.innerText;
  const names=[...host.querySelectorAll('.kp-fu-name')].map(a=>a.textContent);
  ok('one card', host.querySelectorAll('.kp-card').length===1);
  ok('the right people, longest first', names.join('|')==='Fay Orientfake|Opal Nobook|Mae Stepone|Bea Refsfake|Lou Offerfake|Wren Fakeform', names);
  ok('a count', (host.querySelector('.kp-fu-n')||{}).textContent==='6');
  const line=n=>{ const a=[...host.querySelectorAll('.kp-fu')].find(x=>x.querySelector('.kp-fu-name').textContent===n); return a ? a.innerText : ''; };
  ok('unfinished form', /Started the application, didn't finish · 3 days/.test(line('Wren Fakeform')), line('Wren Fakeform'));
  ok('not booked', /Hasn't booked an interview · 12 days/.test(line('Opal Nobook')), line('Opal Nobook'));
  ok('Step 1, with the screen they stopped on', /Offer accepted, Step 1 not done \(stopped on work history\) · 9 days/.test(line('Mae Stepone')), line('Mae Stepone'));
  ok('references', /References not in · 6 days/.test(line('Bea Refsfake')), line('Bea Refsfake'));
  ok('offer not signed', /Offer sent, not signed yet · 5 days/.test(line('Lou Offerfake')) && /PRN Caregiver/.test(line('Lou Offerfake')), line('Lou Offerfake'));
  ok('orientation', /Orientation not finished · 20 days/.test(line('Fay Orientfake')), line('Fay Orientfake'));
  ok('left out: no-show, booked, hired, declined, applied today, approved, office-only', !/Noshowfake|Bookedfake|Hiredfake|Declinedfake|Todayfake|Approvedfake|Officefake|Checksfake/.test(txt), txt);
  ok('the one with only background checks is Krystal\'s (counted, not listed)', /1 more is waiting on background checks: Krystal has that one/.test(txt), txt.slice(-300));
  ok('Mae is listed once (from Onboarding, not again from Applicants)', names.filter(n=>n==='Mae Stepone').length===1);
  const texts=[...host.querySelectorAll('button')].filter(b=>/Text/.test(b.textContent)).length, calls=[...host.querySelectorAll('a[data-oc-phone]')].length;
  ok('Text buttons (the Hub\'s ApText) where there is an applicant record', texts===3, texts);
  ok('Call buttons (office line) on every row', calls===6, calls);
  ok('the latest text chip shows', /texted 2d ago by Krystal/.test(line('Opal Nobook')), line('Opal Nobook'));
  ok('no em dashes, no "AI" or "VA"', !/[—–]/.test(txt) && !/\bAI\b|\bVA\b/.test(txt));
  host.querySelector('.kp-fu-name').click(); await sleep(30);
  ok('a name opens their profile', (window.__fn||[]).some(f=>/^open:/.test(f)), window.__fn);
  ok('nothing was texted, emailed or called', !((window.__log||{}).fn||[]).some(f=>/sms|text|email|send|call/i.test(String(f))) && !document.getElementById('aptBack'), (window.__log||{}).fn);
  as('krystal@mo-care.com','Krystal Land'); window.__alerts=[]; switchTab('mywork'); switchTab('kpfollow');
  ok('another coordinator is turned away', window.__alerts.some(a=>/private/.test(a)) && activeTab==='mywork', [window.__alerts, activeTab]);
  as('samantha@mo-care.com','Samantha Troutman'); switchTab('kpfollow'); await sleep(100);
  ok('an owner sees the same list', [...$('kpWrapFollow').querySelectorAll('.kp-fu-name')].length===6 && /This is the list Katlin sees/.test($('kpWrapFollow').innerText));
  as(KT,'Katlin Fake'); switchTab('kpfollow'); await sleep(100);
  return R;
}
"""
MIME = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.json':'application/json', '.webmanifest':'application/json'}
def serve(route):
    url = route.request.url
    if 'supabase.co' in url: return route.abort()
    if not url.startswith('http://teamwork.local/'): return route.continue_()
    p = (ROOT / url.split('http://teamwork.local/', 1)[1].split('?')[0].split('#')[0])
    if not p.is_file(): return route.fulfill(status=404, body='')
    route.fulfill(status=200, body=p.read_bytes(), content_type=MIME.get(p.suffix, 'application/octet-stream'))
WIDE = "()=>({ sw:document.documentElement.scrollWidth, w:window.innerWidth })"
with sync_playwright() as pw:
    b = pw.chromium.launch(); cx = b.new_context(viewport={'width': 1280, 'height': 900}, timezone_id='Asia/Ho_Chi_Minh'); pg = cx.new_page()
    pg.clock.install(time='2026-11-17T11:00:00-06:00'); pg.clock.resume()
    pg.route('**/*', serve)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://teamwork.local/index.html?proof=katlinfollow'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB); pg.evaluate('s=>(0,eval)(s)', EXTRA)
    R = pg.evaluate(T)
    # at 1280 the page header (End my shift, Fax, Sign Out...) already runs ~40px wide on every page, My Work included, so
    # the desktop check is on the list itself: nothing in it goes past its own box or the window
    d = pg.evaluate("()=>{ const h=document.getElementById('kpWrapFollow'); return { sw:h.scrollWidth, cw:h.clientWidth, out:[...h.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>window.innerWidth).length }; }")
    R.append(['PASS' if d['sw'] <= d['cw'] and d['out'] == 0 else 'FAIL', 'desktop: the list has no sideways scroll', d])
    if SHOT: pg.locator('#kpWrapFollow').screenshot(path=SHOT)
    pg.set_viewport_size({'width': 390, 'height': 900}); pg.wait_for_timeout(300)
    pg.evaluate("()=>KP.render('kpfollow')"); pg.wait_for_timeout(200)
    d = pg.evaluate(WIDE); R.append(['PASS' if d['sw'] <= d['w'] else 'FAIL', 'phone: no sideways scroll', d])
    n = pg.evaluate("()=>[...document.querySelectorAll('#kpWrapFollow .kp-fu')].filter(x=>x.getBoundingClientRect().right<=window.innerWidth+1).length")
    R.append(['PASS' if n == 6 else 'FAIL', 'phone: every row fits', n])
    if SHOT: pg.screenshot(path=SHOT.replace('.png', '-phone.png'), full_page=True)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

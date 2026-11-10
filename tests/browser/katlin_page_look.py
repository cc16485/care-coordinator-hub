"""Katlin's page (2026-11-10, her call: "just for Katlin ... her own page on the side menu"). The real Hub page,
offline, with the Team Work test's made-up people plus Katlin, opened on a computer in VIETNAM on Tuesday Nov 17,
11am Missouri time. Checks: nobody sees the pill until an owner picks whose page it is; the owner picks her and adds a
task; she sees "My page" with the starter Nextdoor tasks and the new one, ticks a task, sees week 2's post with its
photo and marks it posted, and sends Samantha a note (the existing message to the Owners); another coordinator sees
no pill and is turned away. Nothing is texted. (python3 tests/browser/katlin_page_look.py; SHOTS=<dir>)"""
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
    CC_ROLE_BY_EMAIL['${KT}']=['care_coordinator'];`);
  DATA.coordinator_staff.push({ id:'skt', name:'Katlin Fake', email:KT });
  DATA.ops_settings={ team_work_live:true };
  DATA.staffing_tasks=[]; DATA.recruit_posts=[];
  window.__alerts=[]; window.alert=m=>window.__alerts.push(String(m)); window.confirm=()=>true;
  /* AxisCare open shifts (made-up clients) and the client roster with towns */
  window.__axCalls=[]; const realFetch=window.fetch.bind(window);
  window.fetch=(u,o)=>{ if(String(u).includes('axiscare-open-shifts')){ window.__axCalls.push((0,eval)('ME.email'));
      return Promise.resolve(new Response(JSON.stringify({ open:[
        { date:'2026-11-21', start:'9:30am', end:'1:30pm', client:'Pat Fakename' }, { date:'2026-11-22', start:'9:30am', end:'1:30pm', client:'Pat Fakename' },
        { date:'2026-11-18', start:'5:00pm', end:'10:00pm', client:'Ned Testperson' }, { date:'2026-11-19', start:'5:00pm', end:'10:00pm', client:'Ned Testperson' } ], incomplete_dates:[] }), { headers:{ 'Content-Type':'application/json' } })); }
    return realFetch(u,o); };
  window.matchClients=()=>[ { name:'Pat Fakename', town:'Nixa' }, { name:'Ned Testperson', town:'Ozark' } ];
  window.trainHubTok=async()=>'fake-token';
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, $=id=>document.getElementById(id), KT='katlin@mo-care.com';
  const as=(e,n)=>(0,eval)("ME={ email:'"+e+"', name:'"+n+"', shift:'day' };");
  const pill=()=>document.querySelector('.fpill[data-parent="katlingrp"]');
  const shown=()=>{ KP.pillSync(); return pill().style.display!=='none'; };
  const HOST={ kptasks:'kpWrapTasks', kpnextdoor:'kpWrapNextdoor', kpnotes:'kpWrapNotes', kprecruit:'kpWrapRecruit' };
  const page=()=>($(HOST[activeTab])||{}).innerText||'';
  const go=async t=>{ switchTab(t); await sleep(150); };
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  ok('the test computer is in Vietnam', /Ho_Chi_Minh|Saigon/.test(Intl.DateTimeFormat().resolvedOptions().timeZone));

  as(KT,'Katlin Fake');
  ok('before an owner picks her, she has no pill', !shown());
  as('krystal@mo-care.com','Krystal Land');
  ok('another coordinator has no pill', !shown());

  /* the owner sets it up */
  as('samantha@mo-care.com','Samantha Troutman');
  ok('an owner sees the pill to set it up', shown());
  ccParentClick('katlingrp'); await sleep(150);
  ok('the parent pill opens Tasks', activeTab==='kptasks', activeTab);
  ok('the owner is asked whose page it is', /Whose page is this\?/.test(page()), page().slice(0,300));
  $('kpWho').value=KT; await KP.setWho(); await sleep(50);
  ok('whose page it is is saved in ops_settings (audited save)', (DATA.ops_settings.katlin_page||{}).email===KT && L.writes.includes('ops_settings'), DATA.ops_settings.katlin_page);
  ok('the owner\'s pill now says Katlin\'s page', /Katlin's page/.test(pill().innerText), pill().innerText);
  const sub=($('fsub2')||{}).innerText||'';
  ok('four pills under it: Tasks, Nextdoor, Notes, Recruiting', /Tasks/.test(sub)&&/Nextdoor/.test(sub)&&/Notes/.test(sub)&&/Recruiting/.test(sub), sub);
  ok('the owner sees her tasks, with the starter Nextdoor ones', /Katlin's tasks/.test(page()) && /Search Nextdoor for neighbors/.test(page()), page().slice(0,500));
  $('kpNew').value='Call the CNA school about a posting (fake task)'; $('kpEvery').value=''; await KP.addTask(); await sleep(50);
  ok('the owner adds a task', (DATA.ops_settings.katlin_page.tasks||[]).some(t=>/CNA school/.test(t.text)) && /CNA school/.test(page()));
  await sleep(300); await go('kprecruit');
  ok('open shifts were read from the owner\'s browser and summed up by town', (window.__axCalls||[]).length===1 && window.__axCalls[0]==='samantha@mo-care.com' && ((DATA.ops_settings.katlin_page.auto_needs||{}).list||[]).length===2, [window.__axCalls, DATA.ops_settings.katlin_page.auto_needs]);
  ok('the saved summary has no client names', !/Fakename|Testperson|Pat |Ned /.test(JSON.stringify(DATA.ops_settings.katlin_page)), JSON.stringify(DATA.ops_settings.katlin_page.auto_needs));
  ok('Recruiting shows open shifts by town, day and time', /Open shifts to hire for/.test(page()) && /Ozark · Wed, Thu/.test(page()) && /5:00pm to 10:00pm/.test(page()) && /Nixa · Sat, Sun/.test(page()), page().slice(0,700));
  ok('Recruiting: starter places and where to send people', /Facebook community and job groups/.test(page()) && /mo-care.com\/careers/.test(page()), page().slice(0,600));
  $('kpNdBiz').value='Caring Companions'; $('kpNdPos').value='Caregiver (fake test need)'; $('kpNdArea').value='Nixa, Ozark'; $('kpNdHours').value='Weekends 8am to 2pm'; await KP.addNeed(); await sleep(50);
  ok('the owner adds a hiring need (position, area, days and hours)', (DATA.ops_settings.katlin_page.hiring_needs||[]).length===1 && /Caregiver \(fake test need\)/.test(page()) && /Nixa, Ozark · Weekends 8am to 2pm/.test(page()), page().slice(0,500));
  $('kpPlName').value='Fake Test CNA Program board'; $('kpPlEvery').value='month'; await KP.addPlace(); await sleep(50);
  ok('the owner adds a place to post', (DATA.ops_settings.katlin_page.places||[]).length===3 && /Fake Test CNA Program board/.test(page()));

  /* Katlin */
  as(KT,'Katlin Fake');
  ok('Katlin sees her pill', shown());
  ok('it says My page', /My page/.test(pill().innerText), pill().innerText);
  await go('kptasks');
  ok('her Tasks: the owner\'s new task is there', /Your tasks/.test(page()) && /CNA school/.test(page()), page().slice(0,400));
  ok('she cannot add or remove tasks', !$('kpNew') && !document.querySelector('.kpw .kp-x[title="Remove this task"]'));
  await KP.tick('kp_nd_search', true); await sleep(50);
  ok('she ticks a daily task, saved with her name', ((DATA.ops_settings.katlin_page.done||{}).kp_nd_search||{}).by===KT && /Done .* by Katlin/.test(page()), DATA.ops_settings.katlin_page.done);
  await go('kpnextdoor'); await sleep(400); KP.render('kpnextdoor');
  const p=page();
  ok('Nextdoor: this week is week 2 (Nov 17)', /Week 2 · Tue, Nov 17/i.test(p), p.slice(0,700));
  ok('the post text is there', /Ozarks ice storm/.test(p));
  await sleep(700); const img=document.querySelector('#kpWrapNextdoor .kp-photo img');
  ok('its photo loads', img && img.complete && img.naturalWidth>0, img && img.src);
  ok('week 1 is flagged as not marked posted', /Not marked posted yet: week 1/.test(p));
  ok('coming up lists the next posts', /Coming up/i.test(p) && /Week 3/.test(p));
  await KP.posted(2, true); await sleep(50);
  ok('she marks week 2 posted', ((DATA.ops_settings.katlin_page.posted||{})[2]||{}).by===KT && /✓ Posted/.test(page()));
  await go('kpnotes');
  $('kpNote').value='A neighbor on Nextdoor asked about care for her dad (fake test note).'; await KP.sendNote(); await sleep(50);
  const note=(DATA.staffing_tasks||[]).slice(-1)[0]||{};
  ok('her note becomes a message to the Owners', note.direction==='to_owners' && note.from_email===KT && /fake test note/.test(note.message) && L.writes.some(w=>w.startsWith('staffing_tasks:')), note);
  ok('and shows in her notes as waiting', /fake test note/.test(page()) && /waiting/.test(page()), page().slice(0,500));
  await go('kprecruit');
  ok('she sees the hiring need', /Caregiver \(fake test need\)/.test(page()) && /Weekends 8am to 2pm/.test(page()));
  ok('she sees the open shifts by town', /Ozark · Wed, Thu/.test(page()) && /Nixa · Sat, Sun/.test(page()));
  ok('her browser never asked AxisCare and her page holds no client name', !(window.__axCalls||[]).includes(KT) && !/Fakename|Testperson/.test(document.body.innerHTML), window.__axCalls);
  ok('she has no Refresh button', !/Refresh now/.test(page()));
  ok('she cannot add needs or places', !$('kpNdPos') && !$('kpPlName'));
  const plId=DATA.ops_settings.katlin_page.places[2].id;
  $('kpLk_'+plId).value='facebook.com/groups/fake-test/post'; window.__alerts=[]; await KP.logPost(plId); await sleep(50);
  ok('she must pick the business first', window.__alerts.some(a=>/which business/.test(a)) && !(DATA.recruit_posts||[]).length);
  $('kpBz_'+plId).value='cc'; await KP.logPost(plId); await sleep(50);
  const rp=(DATA.recruit_posts||[])[0]||{};
  ok('she logs a recruiting post in the ONE shared log (recruit_posts, the After-Hours card\'s)', (DATA.recruit_posts||[]).length===1 && rp.business==='cc' && rp.where==='cna_school' && rp.place_id===plId && L.writes.includes('recruit_posts:'+rp.id) && !('recruit_log' in DATA.ops_settings.katlin_page), rp);
  ok('the place shows when she last posted, and the log shows it', /Last posted .* by Katlin/.test(page()) && /Caring Companions · Fake Test CNA Program board/.test(page()) && /see the post/.test(page()), page().slice(0,1200));

  /* the owner replies to her note */
  as('samantha@mo-care.com','Samantha Troutman');
  await go('kpnotes');
  ok('the owner sees her note with a reply box', /Notes from Katlin/.test(page()) && !!$('kpRe_'+note.id));
  $('kpRe_'+note.id).value='Thank you! I will call her today.'; await KP.reply(note.id); await sleep(50);
  ok('the reply is saved and the note is done (its card closes itself)', note.status==='done' && note.reply==='Thank you! I will call her today.' && /Samantha: Thank you!/.test(page()), note);
  as(KT,'Katlin Fake'); KP.render('kpnotes');
  ok('Katlin sees the reply', /Samantha: Thank you!/.test(page()));

  /* someone else */
  as('krystal@mo-care.com','Krystal Land');
  ok('another coordinator still has no pill', !shown());
  window.__alerts=[]; switchTab('mywork'); switchTab('kprecruit');
  ok('and is turned away if she opens it by link', window.__alerts.some(a=>/private/.test(a)) && activeTab==='mywork', [window.__alerts, activeTab]);
  ok('nothing was texted, emailed or called', !(L.fn||[]).some(f=>/sms|text|email|send|call/i.test(String(f))), L.fn);
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
def page(pw, when, w=1280):
    b = pw.chromium.launch(); cx = b.new_context(viewport={'width': w, 'height': 900}, timezone_id='Asia/Ho_Chi_Minh'); pg = cx.new_page()
    pg.clock.install(time=when); pg.clock.resume()
    pg.route('**/*', serve)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://teamwork.local/index.html?proof=katlinpage'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB); pg.evaluate('s=>(0,eval)(s)', EXTRA)
    return b, pg, errs
with sync_playwright() as pw:
    b, pg, errs = page(pw, '2026-11-17T11:00:00-06:00')
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True)
        pg.evaluate("()=>{ (0,eval)(\"ME={ email:'katlin@mo-care.com', name:'Katlin Fake', shift:'day' };\"); switchTab('kprecruit'); }"); pg.wait_for_timeout(800)
        pg.screenshot(path=os.path.join(SHOTS, '1-katlin.png'), full_page=True)
        pg.evaluate("()=>{ (0,eval)(\"ME={ email:'samantha@mo-care.com', name:'Samantha Troutman', shift:'day' };\"); switchTab('kprecruit'); }"); pg.wait_for_timeout(300)
        pg.screenshot(path=os.path.join(SHOTS, '2-samantha.png'), full_page=True)
        pg.set_viewport_size({'width': 390, 'height': 900}); pg.evaluate("()=>{ (0,eval)(\"ME={ email:'katlin@mo-care.com', name:'Katlin Fake', shift:'day' };\"); switchTab('kpnotes'); }"); pg.wait_for_timeout(300)
        pg.screenshot(path=os.path.join(SHOTS, '3-phone.png'), full_page=True)
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

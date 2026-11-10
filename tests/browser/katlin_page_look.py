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
  DATA.staffing_tasks=[];
  window.__alerts=[]; window.alert=m=>window.__alerts.push(String(m)); window.confirm=()=>true;
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, $=id=>document.getElementById(id), KT='katlin@mo-care.com';
  const as=(e,n)=>(0,eval)("ME={ email:'"+e+"', name:'"+n+"', shift:'day' };");
  const pill=()=>document.querySelector('.fpill[data-tab="katlinpage"]');
  const shown=()=>{ KP.pillSync(); return pill().style.display!=='none'; };
  const page=()=>($('kpWrap')||{}).innerText||'';
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  ok('the test computer is in Vietnam', /Ho_Chi_Minh|Saigon/.test(Intl.DateTimeFormat().resolvedOptions().timeZone));

  as(KT,'Katlin Fake');
  ok('before an owner picks her, she has no pill', !shown());
  as('krystal@mo-care.com','Krystal Land');
  ok('another coordinator has no pill', !shown());

  /* the owner sets it up */
  as('samantha@mo-care.com','Samantha Troutman');
  ok('an owner sees the pill to set it up', shown());
  switchTab('katlinpage'); await sleep(100);
  ok('the owner is asked whose page it is', /Whose page is this\?/.test(page()), page().slice(0,300));
  $('kpWho').value=KT; await KP.setWho(); await sleep(50);
  ok('whose page it is is saved in ops_settings (audited save)', (DATA.ops_settings.katlin_page||{}).email===KT && L.writes.includes('ops_settings'), DATA.ops_settings.katlin_page);
  ok('the owner\'s pill now says Katlin\'s page', /Katlin's page/.test(pill().innerText), pill().innerText);
  await sleep(400); KP.render();
  ok('the owner sees her tasks, with the starter Nextdoor ones', /Katlin's tasks/.test(page()) && /Search Nextdoor for neighbors/.test(page()), page().slice(0,500));
  $('kpNew').value='Call the CNA school about a posting (fake task)'; $('kpEvery').value=''; await KP.addTask(); await sleep(50);
  ok('the owner adds a task', (DATA.ops_settings.katlin_page.tasks||[]).some(t=>/CNA school/.test(t.text)) && /CNA school/.test(page()));
  ok('the owner does not get a note box (it is for her)', !/Send Samantha a note/.test(page()));

  /* Katlin */
  as(KT,'Katlin Fake');
  ok('Katlin sees her pill', shown());
  ok('it says My page', /My page/.test(pill().innerText), pill().innerText);
  switchTab('katlinpage'); await sleep(500);
  const p=page();
  ok('her page: her tasks, this week\'s Nextdoor post, a note box', /Your tasks/.test(p) && /This week on Nextdoor/.test(p) && /Send Samantha a note/.test(p), p.slice(0,600));
  ok('the owner\'s new task is on her page', /CNA school/.test(p));
  ok('this week is week 2 (Nov 17)', /Week 2 · Tue, Nov 17/i.test(p), p.slice(0,900));
  ok('the post text is there', /Getting Mom or Dad's house ready|Ozarks ice storm/.test(p));
  const img=document.querySelector('#kpWrap .kp-photo img');
  ok('its photo loads', img && img.complete && img.naturalWidth>0, img && img.src);
  ok('week 1 is flagged as not marked posted', /Not marked posted yet: week 1/.test(p));
  ok('coming up lists the next posts', /Coming up/i.test(p) && /Week 3/.test(p));
  await KP.tick('kp_nd_search', true); await sleep(50);
  ok('she ticks a daily task, saved with her name', ((DATA.ops_settings.katlin_page.done||{}).kp_nd_search||{}).by===KT && /Done .* by Katlin/.test(page()), DATA.ops_settings.katlin_page.done);
  await KP.posted(2, true); await sleep(50);
  ok('she marks week 2 posted', ((DATA.ops_settings.katlin_page.posted||{})[2]||{}).by===KT && /✓ Posted/.test(page()));
  ok('she cannot add or remove tasks', !$('kpNew') && !document.querySelector('#kpWrap .kp-x[title="Remove this task"]'));
  $('kpNote').value='A neighbor on Nextdoor asked about care for her dad (fake test note).'; await KP.sendNote(); await sleep(50);
  const note=(DATA.staffing_tasks||[]).slice(-1)[0]||{};
  ok('her note becomes a message to the Owners', note.direction==='to_owners' && note.from_email===KT && /fake test note/.test(note.message) && L.writes.some(w=>w.startsWith('staffing_tasks:')), note);

  /* someone else */
  as('krystal@mo-care.com','Krystal Land');
  ok('another coordinator still has no pill', !shown());
  window.__alerts=[]; switchTab('mywork'); switchTab('katlinpage');
  ok('and is turned away if she opens it by link', window.__alerts.some(a=>/private/.test(a)), window.__alerts);
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
        pg.evaluate("()=>{ (0,eval)(\"ME={ email:'katlin@mo-care.com', name:'Katlin Fake', shift:'day' };\"); switchTab('katlinpage'); }"); pg.wait_for_timeout(800)
        pg.screenshot(path=os.path.join(SHOTS, '1-katlin.png'), full_page=True)
        pg.evaluate("()=>{ (0,eval)(\"ME={ email:'samantha@mo-care.com', name:'Samantha Troutman', shift:'day' };\"); KP.render(); }"); pg.wait_for_timeout(300)
        pg.screenshot(path=os.path.join(SHOTS, '2-samantha.png'), full_page=True)
        pg.set_viewport_size({'width': 390, 'height': 900}); pg.evaluate("()=>{ (0,eval)(\"ME={ email:'katlin@mo-care.com', name:'Katlin Fake', shift:'day' };\"); KP.render(); }"); pg.wait_for_timeout(300)
        pg.screenshot(path=os.path.join(SHOTS, '3-phone.png'), full_page=True)
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

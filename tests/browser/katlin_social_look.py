"""Katlin's page, Coming up pill (2026-11-10, her "Yes, build it" to reviewing Blotato's scheduled posts on her page).
The real Hub page, offline, on a computer in VIETNAM, Tuesday Nov 17 11am Missouri. blotato-coming-up is faked with
MADE-UP posts. Checks: she sees the posts grouped by Missouri day with Missouri times, the page and platform, words,
photo and video; the page filter; "Tell Samantha" sends a note to the owners naming the post; an error shows a
message instead of a blank; the owner sees the same list; another coordinator has no pill; nothing is texted and
nothing but the read function is called. (python3 tests/browser/katlin_social_look.py; SHOTS=<dir>)"""
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
  DATA.ops_settings={ team_work_live:true, katlin_page:{ email:KT } };
  DATA.staffing_tasks=[]; DATA.recruit_posts=[];
  window.__alerts=[]; window.alert=m=>window.__alerts.push(String(m)); window.confirm=()=>true;
  window.__calls=[]; window.__fail=false; const realFetch=window.fetch.bind(window);
  const PX='data:image/svg+xml;utf8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="#54BDB8"/></svg>');
  window.fetch=(u,o)=>{ const s=String(u);
    if(s.includes('supabase.co/functions/')){ window.__calls.push({ url:s, method:(o||{}).method, tok:((o||{}).headers||{})['x-hub-token'] });
      if(!s.includes('blotato-coming-up')) return Promise.resolve(new Response('{}',{ headers:{ 'Content-Type':'application/json' } }));
      if(window.__fail) return Promise.resolve(new Response(JSON.stringify({ error:'Blotato did not answer (503). Try again in a few minutes.' }), { status:502, headers:{ 'Content-Type':'application/json' } }));
      return Promise.resolve(new Response(JSON.stringify({ ok:true, count:3, posts:[
        { id:'s1', at:'2026-11-17T22:00:00.000Z', platform:'facebook', platform_name:'Facebook', page:'Fake Home Care Page', title:'', text:'Made-up post about tea time with Grandma.', media:[PX] },
        { id:'s2', at:'2026-11-18T02:30:00.000Z', platform:'youtube', platform_name:'YouTube', page:'Fake Channel', title:'Made-up video title', text:'Made-up description.', media:['https://example.invalid/clip.mp4'] },
        { id:'s3', at:'2026-11-19T15:00:00.000Z', platform:'facebook', platform_name:'Facebook', page:'Fake Neighbors Page', title:'', text:'Made-up Thursday post.', media:[] } ] }), { headers:{ 'Content-Type':'application/json' } })); }
    return realFetch(u,o); };
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
  const page=()=>($('kpWrapSocial')||{}).innerText||'';
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  ok('the test computer is in Vietnam', /Ho_Chi_Minh|Saigon/.test(Intl.DateTimeFormat().resolvedOptions().timeZone));

  as(KT,'Katlin Fake');
  ok('she has her pill', shown());
  ccParentClick('katlingrp'); await sleep(150);
  const sub=($('fsub2')||{}).innerText||'';
  ok('Coming up is one of her pills', /Coming up/.test(sub), sub);
  switchTab('kpsocial'); await sleep(400);
  ok('the page asked the read function with her Hub sign-in', window.__calls.some(c=>c.url.includes('blotato-coming-up') && c.tok==='fake-token'), window.__calls);
  const t=page();
  ok('header says how many posts', /Coming up on our pages\s*3/.test(t), t.slice(0,200));
  ok('grouped by Missouri day: Tue has 2 (8:30pm Missouri is Wednesday in Vietnam and UTC)', /Tue, Nov 17 · 2 posts/i.test(t) && /Thu, Nov 19 · 1 post/i.test(t), t);
  ok('times are Missouri times', /4:00 PM/.test(t) && /8:30 PM/.test(t) && /9:00 AM/.test(t), t);
  ok('page, platform, title and words show', /Fake Home Care Page/.test(t) && /YouTube/.test(t) && /Made-up video title/.test(t) && /tea time with Grandma/.test(t));
  ok('the photo and the video show', !!document.querySelector('#kpWrapSocial .kp-media img') && !!document.querySelector('#kpWrapSocial .kp-media video'));
  ok('it says nothing here can change a post', /Nothing here can change or delete a post/.test(t));
  ok('no edit or delete buttons', ![...document.querySelectorAll('#kpWrapSocial button')].some(b=>/delete|edit|remove|reschedule/i.test(b.innerText)));

  /* filter */
  KP.socialPick('Fake Neighbors Page'); await sleep(50);
  ok('the page filter shows one page only', /Coming up on our pages\s*1/.test(page()) && !/Grandma/.test(page()), page().slice(0,300));
  KP.socialPick(''); await sleep(50);

  /* tell Samantha */
  KP.flagOpen('s2', true); await sleep(30);
  $('kpSp_s2').value='The title has a typo'; await KP.flagPost('s2'); await sleep(50);
  const n=DATA.staffing_tasks[DATA.staffing_tasks.length-1]||{};
  ok('Tell Samantha sends a note to the owners naming the post', n.direction==='to_owners' && /YouTube post on Fake Channel/.test(n.message) && /typo/.test(n.message) && /s2/.test(n.message) && n.from_email===KT, n);
  ok('a post going out within a day is marked Today', n.urgency==='Today', n.urgency);
  ok('she sees it was sent', /Sent\. Samantha will see it/.test(page()));
  ok('the note also shows in her Notes pill', (switchTab('kpnotes'), /The title has a typo/.test(($('kpWrapNotes')||{}).innerText||'')));

  /* error */
  window.__fail=true; switchTab('kpsocial'); KP.socialRefresh(); await sleep(300);
  ok('a failed read shows a message, not a blank page', /did not load/.test(page()) && /Blotato did not answer/.test(page()), page().slice(0,300));
  window.__fail=false; KP.socialRefresh(); await sleep(300);
  ok('Refresh brings the list back', /Coming up on our pages\s*3/.test(page()));

  /* owner sees the same; another coordinator does not */
  as('samantha@mo-care.com','Samantha Troutman'); KP.render('kpsocial'); await sleep(50);
  ok('the owner sees what Katlin reviews', /What Katlin reviews/.test(page()) && /tea time/.test(page()), page().slice(0,200));
  as('krystal@mo-care.com','Krystal Land');
  ok('another coordinator has no pill', !shown());
  ok('the Coming up pill calls only the read function (the owner-only open-shifts refresh is the Recruiting pill\'s own)', window.__calls.filter(c=>!c.url.includes('axiscare-open-shifts')).every(c=>c.url.includes('blotato-coming-up') && c.method==='POST'), window.__calls.map(c=>c.url));
  ok('nothing was texted, emailed or called', !(L.fn||[]).some(f=>/sms|text|email|send|call/i.test(String(f))), L.fn);
  return R;
}
"""
MIME = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.json':'application/json', '.webmanifest':'application/json'}
def serve(route):
    url = route.request.url
    if 'supabase.co' in url or 'example.invalid' in url: return route.abort()
    if not url.startswith('http://teamwork.local/'): return route.continue_()
    p = (ROOT / url.split('http://teamwork.local/', 1)[1].split('?')[0].split('#')[0])
    if not p.is_file(): return route.fulfill(status=404, body='')
    route.fulfill(status=200, body=p.read_bytes(), content_type=MIME.get(p.suffix, 'application/octet-stream'))
with sync_playwright() as pw:
    b = pw.chromium.launch(); cx = b.new_context(viewport={'width': 1280, 'height': 900}, timezone_id='Asia/Ho_Chi_Minh'); pg = cx.new_page()
    pg.clock.install(time='2026-11-17T11:00:00-06:00'); pg.clock.resume()
    pg.route('**/*', serve)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://teamwork.local/index.html?proof=katlinsocial'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB); pg.evaluate('s=>(0,eval)(s)', EXTRA)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True)
        pg.evaluate("()=>{ (0,eval)(\"ME={ email:'katlin@mo-care.com', name:'Katlin Fake', shift:'day' };\"); switchTab('kpsocial'); KP.render('kpsocial'); }"); pg.wait_for_timeout(500)
        pg.screenshot(path=os.path.join(SHOTS, '1-katlin-coming-up.png'), full_page=True)
        pg.set_viewport_size({'width': 390, 'height': 900}); pg.wait_for_timeout(300)
        pg.screenshot(path=os.path.join(SHOTS, '2-phone.png'), full_page=True)
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

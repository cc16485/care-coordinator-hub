"""Calmer My Work (Samantha 2026-11-05: "Approve the Calmer My Work plan as shown, with all eleven of your picks. Build it
switched off."). The real Hub page, offline, made-up people and cards only (the My Work tiers test's stub plus a Team Work
pile); saves are recorded, never sent. Clock pinned to Wednesday 7 October 2026, 10:00 AM Chicago.
Off: My Work exactly as before (Team Work tab, the groups, the five part line); only owners see a preview link.
On: one line at the top (and the header's late number is the page's), Hub problems as a yellow note, the Staffing view as
one line when nothing waits, no Team Work tab, On duty now for people on duty only, cards a text is handling hidden until
their deadline, Late / Today / Later this week, reminders folded, one-line cards with Hand off and Talk about in the menu,
no Unclassified or code names, tick boxes only for owners, + Add work gone and + Add lead kept, honest escalation words.
(python3 tests/browser/calmer_mywork_look.py; SHOTS=<dir> saves screenshots)"""
import os, sys, re, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
STUB = re.search(r'STUB = r"""(.*?)"""', open(ROOT / 'tests/browser/my_work_tiers_look.py').read(), re.S).group(1)
SHOTS = os.environ.get('SHOTS')
MIME = {'.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/json'}
def serve(route):
    url = route.request.url
    if 'supabase.co' in url: return route.abort()
    if not url.startswith('http://calm.local/'): return route.continue_()
    p = ROOT / url.split('http://calm.local/')[1].split('?')[0]
    if not p.is_file(): return route.fulfill(status=404, body='')
    route.fulfill(status=200, body=p.read_bytes(), content_type=MIME.get(p.suffix, 'application/octet-stream'))
SETUP = r"""(live)=>{
  const at=(hm,d)=>new Date('2026-10-'+(d||'07')+'T'+hm+':00-05:00').toISOString();
  DATA.ops_settings={ team_work_live:true, my_work_tiers_live:true, mywork_tidy_live:true, timekeeper_admin_loop_live:true, calmer_mywork_live:!!live };
  DATA.ops_items.push(
    { id:'ct1', kind:'confirm_times', opened_by:'confirm_times', status:'open', title:'Confirm times: Walt Pretend Monday (fake)', due:at('15:00'), created_at:at('07:00') },
    { id:'ops_covfill_9', kind:'coverage', opened_by:'coverage-reply', status:'open', title:'Call-off: Rose Example 4-8 pm, a caregiver said yes (fake)', due:at('11:00'), created_at:at('09:40') },
    { id:'ops_covfill_8', kind:'coverage', opened_by:'coverage-reply', status:'open', title:'Call-off: June Testcase 9-1, nobody handled it (fake)', due:at('09:30'), created_at:at('08:40') },
    { id:'ops_tk_5', kind:'staffing_issue', opened_by:'timekeeper', status:'open', urgency:'now', title:'NO CLOCK-IN: Pat Helper at Hank Sample (fake)', due:at('10:45'), created_at:at('09:55') });
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Land', shift:'day' };");
  try{ localStorage.removeItem('cmwPreview'); }catch(e){}
  switchTab('mywork'); myWorkGo('today');
}"""
T = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const mw=()=>document.getElementById('tab-mywork').innerText, tabs=()=>myWorkTabs(myWorkBuckets()).map(t=>t[0]);
  const as=(e,n)=>{ (0,eval)("ME={ email:'"+e+"', name:'"+n+"', shift:'day' };"); };
  /* ── OFF ── */
  await sleep(200);
  ok('off: My Work as before: the Team Work tab, the groups, no calm line', tabs().includes('team') && !!document.querySelector('.mwt-tier') && !document.querySelector('.cmw-line') && !document.body.classList.contains('cmw-on'), tabs());
  ok('off: Krystal sees no preview link', !/Preview Calmer My Work/.test(mw()));
  as('samantha@mo-care.com','Samantha Troutman'); myWorkGo('today'); await sleep(150);
  ok('off: Samantha (owner) sees "Preview Calmer My Work (only you)"', /Preview Calmer My Work \(only you\)/.test(mw()));
  CMW.preview(true); await sleep(200);
  ok('preview: the owner gets the calm page with a preview note', document.body.classList.contains('cmw-on') && /Calmer My Work, preview\. Only you see this/.test(mw()), mw().slice(0,400));
  CMW.preview(false); as('krystal@mo-care.com','Krystal Land');
  /* ── ON, Krystal on duty ── */
  DATA.ops_settings.calmer_mywork_live=true; myWorkGo('today'); await sleep(250);
  const line=(document.querySelector('.cmw-line')||{}).innerText||'';
  ok('on: one line at the top (late, due today, for whoever is on duty, urgent or not), no five part strip', /\d+ late/.test(line) && /due today/.test(line) && /for whoever is on duty/.test(line) && !document.querySelector('.ts-strip,.mwt-strip'), line);
  ok('on: no Team Work tab', !tabs().includes('team'), tabs());
  const groupNames=[...document.querySelectorAll('.cmw-grp b')].map(b=>b.innerText.replace(/ · .*/,''));
  ok('on: groups in time order: On duty now, Late, Today, Later this week', JSON.stringify(groupNames.filter(g=>['ON DUTY NOW','LATE','TODAY','LATER THIS WEEK'].includes(g)))===JSON.stringify(['ON DUTY NOW','LATE','TODAY','LATER THIS WEEK']), groupNames);
  const duty=[...document.querySelectorAll('.cmw-grp')].find(g=>/ON DUTY NOW/.test(g.innerText));
  const dutyText=()=>{ let t='', n=duty&&duty.nextElementSibling; while(n && !n.classList.contains('cmw-grp')){ t+=n.innerText+'\n'; n=n.nextElementSibling; } return t; };
  ok('On duty now: confirm times (no text) and the call-off nobody handled past its deadline', /Confirm times: Walt/.test(dutyText()) && /June Testcase 9-1/.test(dutyText()), dutyText());
  ok('a call-off the office was texted about, still inside its deadline, is not a card', !/Rose Example 4-8 pm/.test(mw()));
  ok('a missed clock-in the text loop is working on, inside its deadline, is not a card', !/NO CLOCK-IN: Pat Helper/.test(mw()));
  DATA.ops_settings.timekeeper_admin_loop_live=false; myWorkGo('today'); await sleep(150);
  ok('...but with the text loop off, the missed clock-in shows (nothing else would tell anyone)', /NO CLOCK-IN: Pat Helper/.test(mw()));
  DATA.ops_settings.timekeeper_admin_loop_live=true; myWorkGo('today'); await sleep(150);
  const lateG=[...document.querySelectorAll('.cmw-grp')].find(g=>/^LATE/.test(g.innerText.trim()));
  const lateN=+((lateG&&lateG.innerText.match(/LATE · (\d+)/))||[])[1];
  ok('the line\'s late number is the Late group\'s', new RegExp('^'+lateN+' late').test(line.trim()), [lateN, line]);
  ccRenderPulse(); await sleep(50);
  const pulse=document.getElementById('topbarPulse').innerText;
  ok('the header\'s number is the page\'s too', new RegExp('\\b'+lateN+'\\b\\s*late for you').test(pulse) || /need/.test(pulse), [pulse, lateN]);
  ok('reminders fold into one line', /\d+ reminders? for your information/.test(mw()) && !/Yellow flag: client seemed tired/.test(mw()));
  CMW.rem(); await sleep(80);
  ok('...and open on Show', /Yellow flag: client seemed tired/.test(mw()));
  CMW.rem();
  const cards=[...document.querySelectorAll('#tab-mywork .wkcard')];
  const vis=e=>e && e.offsetParent!==null;
  ok('cards: no Hand off or Talk about buttons, no "Unclassified", no code names, no made-on date', !cards.some(c=>[...c.querySelectorAll('button')].some(b=>vis(b)&&/^(Hand off|Talk about)$/.test(b.innerText.trim())))
     && ![...document.querySelectorAll('#tab-mywork .wkchip')].some(c=>vis(c)&&/Unclassified/.test(c.innerText)) && !/relationship_call/.test(mw()) && !/Oct 5 8:00 AM/.test(mw()), cards.length);
  ok('cards: no tick boxes for a coordinator', !cards.some(c=>vis(c.querySelector('.wkchkhit'))));
  const more=document.querySelector('#tab-mywork .wkcard .wkmore'); more.click(); await sleep(80);
  const pop=[...document.querySelectorAll('.ccpick-row')].map(r=>r.innerText);
  ok('⋯ holds Hand off and Talk about', pop.some(t=>/^Hand off/.test(t)) && pop.some(t=>/Talk about/.test(t)), pop);
  if(typeof ccPopClose==='function') ccPopClose();
  const addWork=[...document.querySelectorAll('#tab-mywork button')].find(b=>/Add work/.test(b.innerText)), addLead=[...document.querySelectorAll('#tab-mywork button')].find(b=>/\+ Add lead/.test(b.innerText));
  ok('+ Add work on the page is gone; + Add lead (her ask) stays', !vis(addWork) && vis(addLead));
  ok('nothing says "NEEDS YOU NOW · 0" or "Nothing waiting" (empty sections hidden)', !/NEEDS YOU NOW · 0/.test(mw()) && !/Nothing waiting\./.test(mw()));
  const tw=TW.list().find(x=>x.it.id==='ops_covfill_8');
  ok('care-at-risk words say only what happens (no texts to Samantha or Zach)', !/text to Samantha|text to Zach/.test(JSON.stringify(TW.escalation?TW.escalation(tw.it,TW.ctx()):'')) && !/text to Samantha|text to Zach/.test(mw()));
  /* Hub problems and the Staffing view */
  window.TB_CACHE={ error:'AxisCare did not answer' }; window.TB_AT=Date.now(); (0,eval)('TB_CACHE=window.TB_CACHE; TB_AT=window.TB_AT;'); renderTodayStrip(); await sleep(50);
  ok('a Hub problem is a small yellow note, not red work', /AxisCare did not answer just now/.test((document.querySelector('.cmw-warn')||{}).innerText||''));
  svToggle(true); await sleep(250);
  const sv=document.getElementById('staffingView').innerText;
  ok('the Staffing view is one line when nothing waits', /Nothing waiting: no call-offs to confirm/.test(sv) && !/ACCEPTED, NEEDS CONFIRMING/.test(sv), sv.slice(0,300));
  /* off duty */
  DATA.duty_windows=[{ id:'dk', area:'operations', person:'krystal@mo-care.com', recur:{ days:[1,2,3,4,5], from:'14:00', to:'17:00' } }, { id:'da', area:'operations', person:'angiel@mo-care.com', recur:{ days:[1,2,3,4,5], from:'08:00', to:'14:00' } }];
  myWorkGo('today'); await sleep(200);
  ok('off duty: no On duty now (Angiel is on duty)', !/ON DUTY NOW/.test(mw()));
  as('angiel@mo-care.com','Angiel Test'); myWorkGo('today'); await sleep(200);
  ok('Angiel on duty: On duty now is hers', /ON DUTY NOW/.test(mw()));
  window.__shotReady=true;
  return R; }"""
R = []
with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []
    cx = b.new_context(viewport={'width': 1280, 'height': 1000}, timezone_id='America/Chicago'); pg = cx.new_page()
    pg.clock.install(time='2026-10-07T10:00:00-05:00'); pg.clock.resume()
    pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.route('**/*', serve); pg.goto('http://calm.local/index.html?proof=calm'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB); pg.evaluate(SETUP, False); pg.wait_for_timeout(300)
    R += pg.evaluate(T)
    if SHOTS:
        pg.evaluate("()=>{ (0,eval)(\"ME={ email:'krystal@mo-care.com', name:'Krystal Land', shift:'day' };\"); DATA.duty_windows=[{ id:'dk', area:'operations', person:'krystal@mo-care.com', recur:{ days:[1,2,3,4,5], from:'08:00', to:'14:00' } }]; (0,eval)('TB_CACHE=null'); myWorkGo('today'); window.scrollTo(0,0); }")
        pg.wait_for_timeout(400); pg.set_viewport_size({'width': 1280, 'height': 800})
        pg.screenshot(path=SHOTS + '/calm_laptop_first.png'); pg.screenshot(path=SHOTS + '/calm_full.png', full_page=True)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for st, n, d in R: print(st + '  ' + n + ('' if st == 'PASS' else '  ' + str(d)))
print(f"{sum(1 for r in R if r[0]=='PASS')}/{len(R)} passed")
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

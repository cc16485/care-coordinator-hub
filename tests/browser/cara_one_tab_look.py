"""Schedule Watch folded away (2026-10-12, her call: "i want schedule watch tab to go away, and put the missed clock in and
clock outs inside the cara tab - team builder needs to be in client care" · "all need to be in Cara - AI Scheduling
Assistant"). Missed clock-ins & outs, New clients and Hours & matching are Cara sub-tabs; Team Builder is a Client Care
tab; every old Schedule Watch link lands on the new home. Offline, made-up data, nothing sent.
(python3 tests/browser/cara_one_tab_look.py, with a static server on PORT, default 8765)"""
import os
from playwright.sync_api import sync_playwright
PORT = os.environ.get('PORT', '8765')
H = open('/Users/samantha/Claude/Projects/cc-hub-live/.claude/g1a_harness.js').read()
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; await sleep(600);
  (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha Troutman' };"); CC_ROLES=['owner_admin']; CC_ROLES_CHECKED=true; CC_ROLE_BY_EMAIL['samantha@mo-care.com']=['owner_admin'];
  const day=new Date().toISOString().slice(0,10);
  DATA.ops_settings={ timekeeper_watch_live:true, timekeeper_text_live:false };
  DATA.timekeeper_cases=[{ id:'tk_1', kind:'clock_in', caregiver:'Joyce K. (fake)', client_first:'Linda', shift_date:day, minutes_late:12 },
                         { id:'tk_2', kind:'clock_in', caregiver:'Bo B. (fake)', client_first:'Hal', shift_date:day, minutes_late:20 }];
  DATA.coverage_cases=[{ id:'int_1', kind:'interest', status:'open', client:'Prospect Pat (fake)', opened_at:new Date().toISOString(), asked:[] }];
  DATA.staffing_plans=[];
  const vis=id=>{ const el=document.getElementById(id); return !!el && el.offsetParent!==null; };
  const pills=[...document.querySelectorAll('.fpill')].map(p=>p.textContent.trim());
  ok('no Schedule Watch tab anywhere in the menu', !pills.some(t=>/Schedule Watch/.test(t)) && !document.querySelector('[data-tab="hourswatch"]'), pills);
  ok('the Cara tab says "Cara - AI Scheduling Assistant"', /^Cara - AI Scheduling Assistant/.test(document.querySelector('.fpill[data-tab="coverage"]').textContent.trim()));
  ok('no Schedule Watch page is left', !document.getElementById('tab-hourswatch'));
  const cc=[...document.querySelectorAll('#fsub-clients .fpill')].map(p=>p.textContent.trim());
  ok('Client Care has Team Builder beside Getting ready and Clients', cc.join('|')==='Getting ready|Clients|Team Builder', cc);
  schedGo('coverage'); await sleep(250);
  const subs=[...document.querySelectorAll('#covSubBar button')].map(b=>b.textContent.trim());
  ok('Cara sub-tabs include Missed clock-ins & outs and Hours & matching (New clients moved to Team Builder in step 3)', /Missed clock-ins & outs/.test(subs.join('|')) && !/New clients/.test(subs.join('|')) && /Hours & matching/.test(subs.join('|')), subs);
  ok('the missed clock-ins count shows on its sub-tab', /Missed clock-ins & outs\s*2/.test(subs.join('|')), subs);
  ok('the eyebrow says AI Scheduling Assistant', /AI Scheduling Assistant/i.test(document.getElementById('tab-coverage').innerText));
  covSubGo('today'); await sleep(150);
  ok('Cara Today shows the board, none of the moved parts', vis('caraCC') && !vis('swTodayWrap') && !vis('swNewWrap') && !vis('swHoursWrap'));
  covSubGo('clockins'); await sleep(250);
  ok('Missed clock-ins & outs shows the live shift watch with the late caregivers', vis('swTodayWrap') && !vis('caraCC') && /Joyce K\. \(fake\)/.test(document.getElementById('swLive').innerText), document.getElementById('swLive').innerText.slice(0,300));
  ok('Cara\'s red badge counts the missed clock-ins too', +document.getElementById('covPillBadge2').textContent>=2, document.getElementById('covPillBadge2').textContent);
  swSubGo('newclients'); await sleep(250);
  ok('New clients now opens Team Builder (step 3)', activeTab==='teambuilder', activeTab);
  schedGo('coverage'); await sleep(150);
  covSubGo('hours'); await sleep(300);
  ok('Hours & matching shows the staffing sheet, radar and hours list', vis('swHoursWrap') && !!document.getElementById('ssRoot') && vis('hwRadar'));
  switchTab('teambuilder'); await sleep(300);
  ok('Team Builder opens under Client Care', activeTab==='teambuilder' && document.querySelector('.ftab.active,.ftab.on')?.dataset.g==='clients' && vis('tbRoot'), [activeTab, document.querySelector('.ftab.active,.ftab.on')?.dataset.g]);
  /* old links */
  switchTab('hourswatch'); await sleep(250);
  ok('an old Schedule Watch link lands on Cara > Missed clock-ins & outs', activeTab==='coverage' && COV_SUB==='clockins' && vis('swTodayWrap'), [activeTab, COV_SUB]);
  switchTab('hourswatch'); swSubGo('builder'); await sleep(250);
  ok('the old "Schedule Watch, then Team builder" route lands on Team Builder', activeTab==='teambuilder', activeTab);
  switchTab('hourswatch'); swSubGo('hours'); await sleep(250);
  ok('the old Hours & matching route lands on Cara > Hours & matching', activeTab==='coverage' && COV_SUB==='hours' && vis('swHoursWrap'), [activeTab, COV_SUB]);
  switchTab('today'); await sleep(100); location.hash='#schedwatch'; await sleep(300);
  ok('the #schedwatch web address opens Cara > Missed clock-ins & outs', activeTab==='coverage' && COV_SUB==='clockins', [activeTab, COV_SUB]);
  switchTab('today'); await sleep(100); location.hash='#team-builder'; await sleep(300);
  ok('#team-builder opens Team Builder', activeTab==='teambuilder', activeTab);
  switchTab('today'); await sleep(100); caraShowCase('int_1'); await sleep(300);
  ok('opening an interest check lands on Team Builder (step 3)', activeTab==='teambuilder', [activeTab, COV_SUB]);
  switchTab('today'); await sleep(100); swOpenShift('tk_1'); await sleep(300);
  ok('opening a missed clock-in lands on Cara > Missed clock-ins & outs', activeTab==='coverage' && COV_SUB==='clockins' && vis('swTodayWrap'), [activeTab, COV_SUB]);
  covSubGo('calloffs'); await sleep(200);
  ok('Call-offs still shows its own list, the moved parts hidden', !vis('swTodayWrap') && !vis('swNewWrap') && !vis('swHoursWrap') && vis('covList'));
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1400, 'height': 900})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(f'http://localhost:{PORT}/index.html?proof=caraonetab'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', H)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    pg.evaluate("()=>{ schedGo('coverage'); covSubGo('clockins'); window.scrollTo(0,0); }"); pg.wait_for_timeout(400)
    pg.screenshot(path=os.environ.get('SHOT', '/tmp/cara_one_tab.png')); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

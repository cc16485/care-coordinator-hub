"""My Work, Being handled: booked assessments (2026-10-06, Samantha: "consultation set? where is that coming from? ...
Theres not info"). Only assessments still ahead, with day and time, click opens the lead; leads still marked Assessment
Scheduled with a past date or no date are one line pointing to Leads & Starts. The real page, offline, made-up leads.
(python3 tests/browser/assessment_strip_look.py, static server on 8765)"""
import re
from playwright.sync_api import sync_playwright
STUB = re.search(r'STUB = r"""(.*?)"""', open('/Users/samantha/Claude/Projects/cc-hub-live/tests/browser/standup_look.py').read(), re.S).group(1)
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  window.__me={ email:'sam@mo-care.com', name:'Sam Owner' }; (0,eval)("ME={ email:'sam@mo-care.com', name:'Sam Owner', shift:'day' };");
  const ymd=d=>new Date(Date.now()+d*864e5).toLocaleDateString('en-CA',{timeZone:'America/Chicago'});
  const words=d=>new Date(ymd(d)+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  DATA.leads=[
    { id:'L1', first_name:'Tammy', last_name:'Smith (fake)', status:'Assessment Scheduled', assessment_at:words(2)+' 2:00 PM' },
    { id:'L2', first_name:'Ann', last_name:'Today (fake)', status:'Assessment Scheduled', assessment_at:ymd(0)+'T09:30' },
    { id:'L3', first_name:'Shawn', last_name:'Alcorn (fake)', status:'Assessment Scheduled', assessment_at:'Monday, September 14, 2026 1:30 PM' },
    { id:'L4', first_name:'Test Dementia', last_name:'Lead', status:'Assessment Scheduled' },
    { id:'L5', first_name:'Won', last_name:'Already', status:'Converted', assessment_at:words(3)+' 1:00 PM' } ];
  DATA.ops_items=[]; window.__store.ops_items=[];
  window.openLeadProfile=(id,tab)=>{ window.__opened=[id,tab]; };
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  switchTab('mywork'); await sleep(400); myWorkGo('today'); await sleep(200);
  const W=document.getElementById('myWorkWrap'), txt=W.innerText;
  ok('no more "Consultation set"', !/Consultation set/.test(txt));
  ok('an upcoming assessment shows as "Assessment booked" with the day and time', new RegExp('Assessment booked: Tammy Smith \\(fake\\), '+new Date(ymd(2)+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})+', 2:00pm').test(txt), txt.slice(0,800));
  ok("...today's says today, and they're in time order (today first)", /Assessment booked: Ann Today \(fake\), today, 9:30am/.test(txt) && txt.indexOf('Ann Today')<txt.indexOf('Tammy Smith'));
  ok('a past date and no date are not "being handled": one line names them and points to Leads & Starts', /2 leads still say Assessment Scheduled with a past date or no date: Shawn Alcorn \(fake\), Test Dementia Lead\. Update them in Leads & Starts\./.test(txt) && !/Assessment booked: Shawn/.test(txt));
  ok('a won lead is not listed', !/Won Already/.test(txt));
  [...W.querySelectorAll('div')].find(d=>/^Assessment booked: Tammy/.test(d.textContent)).click(); await sleep(50);
  ok('clicking a booked assessment opens the lead (care tab)', JSON.stringify(window.__opened)==='["L1","care"]', window.__opened);
  [...W.querySelectorAll('div')].find(d=>/still say Assessment Scheduled/.test(d.textContent) && d.children.length<=1).click(); await sleep(200);
  ok('clicking the line opens Leads & Starts', activeTab==='leadsstarts', activeTab);
  ok('no em dash in the strip heading', !/no action needed —/.test(document.body.innerHTML));
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width':1300,'height':1000})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=asmt'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', STUB); R = pg.evaluate(T)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

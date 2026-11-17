"""My Week (2026-11-17, her "Yes, build it"): Samantha's own weekly schedule with Claude, a pill on the Today row.
Checks: a coordinator does not see the pill and gets no schedule; Samantha sees it; it shows the five times together,
the things that run on their own, today marked, the coming dates, no em dash, and nothing is saved or sent.
(python3 tests/browser/my_week_look.py; SHOTS=<dir>)"""
import os, sys, pathlib, re
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = os.environ.get('SHOTS')
src = (ROOT / 'tests/browser/team_work_look.py').read_text()
STUB = re.search(r'STUB = r"""(.*?)"""', src, re.S).group(1)
EXTRA = r"""
(()=>{
  DATA.ops_settings={ team_work_live:true };
  DATA.sop_library=[
    { id:'sop_fall_test', title:'A fall, injury or hospital stay', moment:'wrong', status:'published', steps:['Made-up step'], state:'MO' },
    { id:'sop_draft_test', title:'A draft nobody should see yet', moment:'wrong', status:'draft', steps:['x'] },
    { id:'sop_first_call', title:'First call with a new lead', moment:'lead', status:'published', steps:['Made-up step'] } ];
  window.__alerts=[]; window.alert=m=>window.__alerts.push(String(m)); window.confirm=()=>true;
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, $=id=>document.getElementById(id);
  const as=(e,n)=>{ (0,eval)("ME={ email:'"+e+"', name:'"+n+"', shift:'day' };"); MW.pillSync(); };
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  const pill=()=>document.querySelector('.fpill[data-tab="myweek"]');
  as('krystal@mo-care.com','Krystal Land');
  ok('a coordinator does not see the My Week pill', pill() && pill().style.display==='none');
  switchTab('myweek'); await sleep(150);
  ok('a coordinator who opens it anyway gets no schedule', /Samantha's own page/.test($('mwWrap').innerText) && !/Money in/.test($('mwWrap').innerText), $('mwWrap').innerText.slice(0,120));
  as('samantha@mo-care.com','Samantha Troutman');
  ok('Samantha sees the My Week pill on the Today row', pill().style.display==='' && !!pill().closest('#fsub-today'));
  pill().click(); await sleep(200);
  const t=$('mwWrap').innerText;
  ok('the pill opens My Week', (0,eval)('activeTab')==='myweek' && $('tab-myweek').classList.contains('active'), (0,eval)('activeTab'));
  ok('the five times together', ['Money in','CDS payroll and Medicaid','Marketing','Growth','Big picture'].every(x=>t.includes(x)) && document.querySelectorAll('#mwWrap .mw-tog').length===5, t.slice(0,300));
  ok('Monday 9 AM is Money in, Tuesday 9:30 is CDS payroll', /9:00 AM[\s\S]{0,20}Money in/.test(t) && /9:30 AM[\s\S]{0,20}CDS payroll/.test(t));
  ok('what runs on its own is there', /AxisCare billing and payroll prep email/.test(t) && /CDS payroll locks/.test(t) && /EVV forms email to you and Katlin/.test(t) && /6:30 AM WellSky check/.test(t));
  ok('the week starts on Monday', document.querySelector('#mwWrap .mw-dn').textContent.startsWith('Monday'));
  const td=document.querySelector('#mwWrap .mw-day.today');
  ok('today (Tuesday Nov 17) is marked', !!td && /^Tuesday/.test(td.textContent), td&&td.textContent.slice(0,40));
  ok('coming up starts with the Nov 20 cutoff and drops past dates', /Fri, Nov 20/.test(t) && !/Nov 1[0-6]\b/.test(t.split('Coming up')[1]||''));
  ok('no em dash, no "plain language"', !/[\u2014\u2013]/.test(t) && !/plain language/i.test(t));
  location.hash='#myweek'; await sleep(200);
  ok('Owner Overview pill is untouched for a non-owner', !document.querySelector('.fpill[data-tab="owneroverview"]') || document.querySelector('.fpill[data-tab="owneroverview"]').style.display==='none');
  ok('nothing was saved, texted, emailed or called', !(L.writes||[]).length && !(L.fn||[]).some(f=>/sms|text|email|send|call/i.test(String(f))), [L.writes,L.fn]);
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
with sync_playwright() as pw:
    b = pw.chromium.launch(); cx = b.new_context(viewport={'width': 1280, 'height': 900}, timezone_id='America/Chicago'); pg = cx.new_page()
    pg.clock.install(time='2026-11-17T11:00:00-06:00'); pg.clock.resume()
    pg.route('**/*', serve)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://teamwork.local/index.html?proof=myweek'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB); pg.evaluate('s=>(0,eval)(s)', EXTRA)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True)
        pg.evaluate("()=>{ switchTab('myweek'); }"); pg.wait_for_timeout(250)
        pg.screenshot(path=os.path.join(SHOTS, '1-my-week.png'), full_page=True)
        pg.set_viewport_size({'width': 390, 'height': 900}); pg.wait_for_timeout(250)
        pg.screenshot(path=os.path.join(SHOTS, '2-phone.png'), full_page=True)
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

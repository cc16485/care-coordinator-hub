"""My Week calendar (2026-11-17): Samantha's own calendar, a pill on the Today row. The calendar server (cds-my-calendar)
is replaced by an in-memory copy. Checks: a coordinator does not see the pill and gets no schedule; Samantha sees it;
then tests/browser/my_week_checks.js (the SAME file as the CDS hub's): week, month and year views, check off, Undo, move
to the next day, drag, pick a day, still open from before, her own items, a failed save shows; nothing goes to the
Hub's own storage and nothing is texted, emailed or called.
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
  window.__openMW=async()=>{ pill().click(); };
  const C=await (0,eval)('('+window.__CHECKS+')')();
  C.forEach(r=>R.push(r));
  ok('the pill opens My Week', (0,eval)('activeTab')==='myweek' && $('tab-myweek').classList.contains('active'), (0,eval)('activeTab'));
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
    pg.evaluate('c=>{ window.__CHECKS=c; }', (ROOT / 'tests/browser/my_week_checks.js').read_text())
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True)
        pg.evaluate("()=>{ switchTab('myweek'); MW._state.view='week'; MW._state.anchor=null; MW._state.undo=null; MW.render('mwWrap'); }"); pg.wait_for_timeout(250)
        pg.screenshot(path=os.path.join(SHOTS, '1-my-week.png'), full_page=True)
        pg.set_viewport_size({'width': 390, 'height': 900}); pg.wait_for_timeout(250)
        pg.screenshot(path=os.path.join(SHOTS, '2-phone.png'), full_page=True)
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

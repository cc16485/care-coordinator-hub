"""The real Hub page, offline, for browser tests (kept from the old Katlin page test, 2026-11-25, when Katlin's page was
removed): the Team Work test's made-up people plus one extra coordinator, a Vietnam-clock browser, files served from disk."""
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

"""The Booking App visit offer (visit-offer.html) with the client profile (Samantha 2026-10-25: the app works like the
call-in shift page). Phone size, offline, a stand-in family-offer server, made-up people. Proves: switch off (no profile)
looks as before with the About row; switch on shows Meet <client>, the About, What they enjoy, a picture (no photo), Good to
know from the profile and the care plan together, Skills needed when approved; nothing about the client's last name;
never says "extra visit".
(python3 tests/browser/visit_offer_profile_look.py; SHOTS=<dir> saves phone screenshots)"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = os.environ.get('SHOTS')
SERVER = r"""
(()=>{
  window.__calls=[];
  const V=()=>({ state:'open', answer:'sent', first_name:'Maria', client:'Dot', town:'Nixa', date:'2026-10-22', day:'Thu, Oct 22', kind:'set', start:'10:00', end:'13:00',
    window_start:'10:00', window_end:'13:00', hours:3, tasks:['Companionship','Meal preparation'], note:'Soup please', choices:['10:00'], picked:null, mode:'first', asked_for_you:false,
    about:'Dot taught school for 30 years.', home:['Cats in the home'], profile: window.__profile || null });
  const real=window.fetch;
  window.fetch=async(url,o)=>{ url=String(url); if(!url.includes('/functions/v1/family-offer')) return real(url,o);
    const b=JSON.parse(o.body); window.__calls.push(b); return new Response(JSON.stringify(b.action==='view'?V():{ok:true,message:'Thank you!'}),{status:200}); };
})();
"""
MIME = {'.html':'text/html', '.js':'application/javascript'}
def serve(route):
    url = route.request.url
    if 'supabase.co' in url and 'family-offer' not in url: return route.abort()
    if not url.startswith('http://offer.local/'): return route.continue_()
    p = (ROOT / url.split('http://offer.local/', 1)[1].split('?')[0])
    if not p.is_file(): return route.fulfill(status=404, body='')
    route.fulfill(status=200, body=p.read_bytes(), content_type=MIME.get(p.suffix, 'application/octet-stream'))
def page(b, init=''):
    cx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    cx.add_init_script(SERVER + init)
    pg = cx.new_page(); pg.route('**/*', serve)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://offer.local/visit-offer.html?o=1&e=9&t=x'); pg.wait_for_timeout(400)
    return cx, pg, errs
R = []
ok = lambda n, c, d='': R.append(['PASS' if c else 'FAIL', n, d])
with sync_playwright() as pw:
    b = pw.chromium.launch()
    cx, pg, errs = page(b)
    t = pg.inner_text('body')
    ok('switch off: as before (About row, Good to know, the family note), no Meet, no picture', 'About Dot' in t and 'Dot taught school' in t and 'Cats in the home' in t and 'Soup please' in t and 'Meet Dot' not in t and not pg.query_selector('.hero svg'), t[:500])
    ok('never "extra visit"; says it came from the Booking App', 'extra' not in t.lower() and 'A family asked for a visit in the Booking App' in t, t[:200])
    ok('no page errors (off)', not errs, errs); cx.close()
    prof = "window.__profile={ about:'Dot taught school for 30 years and still loves a crossword.', enjoys:['Gardening','Sweet tea'], help:['Companionship'], needs:[\"Dementia or Alzheimer's care\"], home:['Cats in the home','Someone smokes in the home'], level:1, scene:'garden', basics:false, life:[{label:'Loves to talk about',text:'Her grandkids and the Cardinals'}], source:'family' };"
    cx, pg, errs = page(b, prof)
    t = pg.inner_text('body')
    ok('switch on: Meet Dot, the approved About, What she enjoys, a picture (no photo)', 'Meet Dot' in t and 'still loves a crossword' in t and 'Gardening' in t and 'Sweet tea' in t and pg.query_selector('.hero svg') is not None and not pg.query_selector('img'), t[:600])
    ok('the family\'s own answers show with their labels', 'loves to talk about' in t.lower() and 'Her grandkids and the Cardinals' in t, t[:800])
    ok('switch on: the About shows once (not again as a row)', t.count('taught school') == 1, t[:600])
    ok('switch on: Good to know joins the care plan and the profile, no repeats', 'Cats in the home. Someone smokes in the home.' in t and t.count('Cats in the home') == 1, t)
    ok('switch on: Skills needed when the office approved sharing them', "Level 1, Dementia or Alzheimer's care" in t, t)
    ok('switch on: the request itself still shows (when, help with, the family note) and the answer buttons', 'Thu, Oct 22' in t and 'Companionship, Meal preparation' in t and 'Soup please' in t and "I'll accept this shift" in t, t)
    ok('no page errors (on)', not errs, errs)
    if SHOTS: os.makedirs(SHOTS, exist_ok=True); pg.screenshot(path=os.path.join(SHOTS, 'visit-offer-profile.png'), full_page=True)
    cx.close()
    cx, pg, errs = page(b, "window.__profile={ about:null, enjoys:[], help:[], needs:[], home:[], level:null, scene:'porch', basics:true };")
    t = pg.inner_text('body')
    ok('no approved profile yet: Meet Dot with the basics, nothing invented', 'Meet Dot' in t and 'Soup please' in t and 'enjoys' not in t.lower(), t[:400])
    cx.close(); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else str(d)[:600])
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

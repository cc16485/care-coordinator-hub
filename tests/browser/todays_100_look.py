"""Today's 100 (2026-11-25): the card on My Week (Samantha) and the one line above My Work (everyone). The save to
ops_settings is replaced by an in-memory copy. Checks: counts from the Hub's own logs, +1, Undo, targets (owner only),
a failed save shows, nothing is texted, emailed or called. (python3 tests/browser/todays_100_look.py; SHOTS=<dir>)"""
import os, sys, pathlib, re
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = os.environ.get('SHOTS')
src = (ROOT / 'tests/browser/team_work_look.py').read_text()
STUB = re.search(r'STUB = r"""(.*?)"""', src, re.S).group(1)
EXTRA = r"""
(()=>{
  const at=h=>'2026-11-25T'+String(h).padStart(2,'0')+':00:00-06:00';
  DATA.ops_settings={ team_work_live:true, t100:{ start:'2026-11-22', taps:{ '2026-11-25':{ 'krystal@mo-care.com':{ local:6 } } } } };
  DATA.coordinator_staff=(DATA.coordinator_staff||[]).concat([{ email:'krystal@mo-care.com', name:'Krystal' },{ email:'samantha@mo-care.com', name:'Samantha' }]);
  DATA.referral_activities=[{ org_id:'o1', kind:'call', at:at(9), by:'krystal@mo-care.com' },{ org_id:'o2', kind:'email', at:at(9), by:'campaign-auto' }];
  DATA.recruit_posts=[{ at:at(10), by:'krystal@mo-care.com' }];
  window.__saves=[]; window.__failSave=false;
  window.ccMergeSave=async(key,apply)=>{ if(window.__failSave) return { changed:[], error:{ message:'test failure' } };
    const m=JSON.parse(JSON.stringify(DATA[key]||{})); const ch=apply(m, DATA[key]||{})||[]; if(ch.length){ DATA[key]=m; window.__saves.push(key); } return { changed:ch, error:null }; };
  window.confirm=()=>true;
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,400)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, $=id=>document.getElementById(id);
  const as=(e,n)=>{ (0,eval)("ME={ email:'"+e+"', name:'"+n+"', shift:'day' };"); try{ MW.pillSync(); }catch(x){} };
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  as('samantha@mo-care.com','Samantha Troutman');
  switchTab('myweek'); await sleep(200);
  const wk=()=>$('t100Week').innerText;
  ok('the card sits above the calendar', !!$('t100Week').querySelector('.t100') && $('t100Week').nextElementSibling===$('mwWrap'));
  ok('day 4 of 100', /Day 4 of 100/.test(wk()), wk().slice(0,80));
  ok('9 of 100: 6 taps, 1 call, series once, 1 job post', /\b9\b\s*of 100 today/.test(wk()) || /^Today's 100[\s\S]*\n9\s/.test(wk()), wk().slice(0,160));
  ok('1 counted on its own', /1 counted on their own/.test(wk()));
  ok('people line names Krystal by first name', /Krystal 8/.test(wk()) && !/Krystal Land/.test(wk()), wk());
  $('t100Week').querySelector('button[aria-label="Add one to Content"]').click(); await sleep(100);
  ok('+1 adds to Content', /Content[\s\S]*?1 \/ 5/.test(wk()) && window.__saves.length===1, wk());
  ok('+1 is saved under her email', DATA.ops_settings.t100.taps['2026-11-25']['samantha@mo-care.com'].content===1);
  [...$('t100Week').querySelectorAll('button')].find(b=>/Undo last/.test(b.textContent)).click(); await sleep(100);
  ok('Undo takes it back', DATA.ops_settings.t100.taps['2026-11-25']['samantha@mo-care.com'].content===0 && /Content[\s\S]*?0 \/ 5/.test(wk()));
  [...$('t100Week').querySelectorAll('button')].find(b=>/Change the targets/.test(b.textContent)).click(); await sleep(100);
  const inp=$('t100Week').querySelector('[data-t100t="partners"]'); ok('owner can change targets', !!inp);
  inp.value='25'; T100.saveTargets(); await sleep(100);
  ok('new target shows and the goal is 105', /of 105 today/.test(wk()) && /0?\d+ \/ 25/.test(wk()), wk().slice(0,200));
  window.__failSave=true; $('t100Week').querySelector('button[aria-label="Add one to Recruiting"]').click(); await sleep(100);
  ok('a failed save says so', /Not saved: test failure/.test(wk()), wk().slice(-120)); window.__failSave=false;
  as('krystal@mo-care.com','Krystal Land');
  switchTab('mywork'); await sleep(250);
  const wl=()=>$('t100Work').innerText;
  ok('one line above My Work for a coordinator', !!$('t100Work').querySelector('.t100') && $('t100Work').nextElementSibling===$('myWorkWrap'), wl());
  ok('her own count and the team count', /You 8 · Team 9 of 105/.test(wl()), wl());
  ok('no targets link for a coordinator', !/Change the targets/.test(wl()));
  [...$('t100Work').querySelectorAll('button')].find(b=>/\+1 Local/.test(b.textContent)).click(); await sleep(100);
  ok('+1 Local from My Work', /You 9 · Team 10/.test(wl()) && DATA.ops_settings.t100.taps['2026-11-25']['krystal@mo-care.com'].local===7, wl());
  ok('only ops_settings was saved', window.__saves.every(k=>k==='ops_settings'), window.__saves);
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
with sync_playwright() as pw:
    b = pw.chromium.launch(); cx = b.new_context(viewport={'width': 1280, 'height': 900}, timezone_id='America/Chicago'); pg = cx.new_page()
    pg.clock.install(time='2026-11-25T14:00:00-06:00'); pg.clock.resume()
    pg.route('**/*', serve)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://teamwork.local/index.html?proof=t100'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB); pg.evaluate('s=>(0,eval)(s)', EXTRA)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True)
        pg.evaluate("()=>{ (0,eval)(\"ME={ email:'samantha@mo-care.com', name:'Samantha', shift:'day' };\"); switchTab('myweek'); }"); pg.wait_for_timeout(300)
        pg.locator('#t100Week').screenshot(path=os.path.join(SHOTS, '1-my-week-card.png'))
        pg.evaluate("()=>{ (0,eval)(\"ME={ email:'krystal@mo-care.com', name:'Krystal', shift:'day' };\"); switchTab('mywork'); }"); pg.wait_for_timeout(300)
        pg.screenshot(path=os.path.join(SHOTS, '2-my-work-line.png'), clip={'x':0,'y':0,'width':1280,'height':700})
        pg.set_viewport_size({'width': 390, 'height': 900}); pg.wait_for_timeout(250)
        pg.locator('#t100Work').screenshot(path=os.path.join(SHOTS, '3-phone-line.png'))
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

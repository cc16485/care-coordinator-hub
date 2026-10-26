"""Step 1 alert switch (2026-10-26, Desktop 1136), in the real Hub page offline: Settings > Step 1 alert shows Off, who it
goes to (the call-in alert list, a missing phone flagged), only an owner can turn it on, turning it on saves
step1_alert_live and stamps step1_alert_live_since (no backlog), turning it off saves it off.
(PORT=<port> python3 tests/browser/step1_alert_switch_look.py, static server on that port, 8765 by default)"""
import os
from playwright.sync_api import sync_playwright
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'client_journey_look.py')).read()
ns = {'__file__': os.path.abspath(__file__)}; exec(src[:src.rindex('with sync_playwright() as pw:')], ns)
STUB, DATA = ns['STUB'], ns['DATA']
PORT = os.environ.get('PORT', '8765')
FAKE = r"""
(()=>{
  const W=window; W.__saved=[]; W.__alert=[]; W.__asked=[];
  W.ccConfirm=async(m)=>{ W.__asked.push(m); return true; }; (0,eval)('ccConfirm=window.ccConfirm');
  W.alert=(m)=>{ W.__alert.push(m); };
  (0,eval)("tkMerge=async(apply,what)=>{ const m=JSON.parse(JSON.stringify(DATA.ops_settings||{})); const ch=apply(m, DATA.ops_settings||{}); DATA.ops_settings=m; window.__saved.push({ what, m:JSON.parse(JSON.stringify(m)), ch }); return { changed:ch, error:null }; }");
  DATA.ops_settings=Object.assign(DATA.ops_settings||{}, { step1_alert_live:false, coverage_alert_admins:['sam@mo-care.com','krystal@mo-care.com'] });
  DATA.coordinator_staff=[{ email:'sam@mo-care.com', name:'Samantha Owner', phone:'4175550101' }, { email:'krystal@mo-care.com', name:'Krystal Land', phone:'' }];
})();
"""
T = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  const box=()=>document.getElementById('s1aSet').innerText, btn=()=>document.getElementById('s1aSetBtn');
  window.__as('krystal@mo-care.com','Krystal Land'); CC_ROLE_BY_EMAIL['krystal@mo-care.com']=['care_coordinator']; (0,eval)("CC_ROLES=CC_ROLE_BY_EMAIL['krystal@mo-care.com']");
  switchTab('settings'); await sleep(300); s1aSetFill();
  ok('a Care Coordinator sees it Off and who it goes to, with no button', /^Off\./.test(box()) && /Goes to: Samantha Owner, Krystal Land \(no phone in the staff list, email only\)/.test(box()) && btn().style.display==='none', [box(), btn().style.display]);
  await s1aToggle(btn());
  ok('...and can\'t turn it on', window.__alert.some(m=>/Only Samantha or Zachary/.test(m)) && !window.__saved.length);
  window.__as('sam@mo-care.com','Samantha Owner'); s1aSetFill();
  ok('Samantha sees "Turn on"', btn().style.display==='' && btn().textContent==='Turn on');
  const t0=Date.now(); btn().click(); await sleep(250);
  const s=window.__saved.slice(-1)[0];
  ok('Turn on: asks first, in her words (email at once, text 7am to 8pm, nobody who already finished)', /Turn on the Step 1 alert\?/.test(window.__asked[0]||'') && /one email at once, any hour/.test(window.__asked[0]) && /7am to 8pm/.test(window.__asked[0]) && /Nobody who already finished Step 1 is alerted/.test(window.__asked[0]), window.__asked);
  ok('...saves step1_alert_live true and stamps the turn-on time', s && s.m.step1_alert_live===true && Date.parse(s.m.step1_alert_live_since)>=t0-1000, s);
  ok('...and shows On', /^On\./.test(box()) && btn().textContent==='Turn off' && /On from the next person who finishes Step 1/.test(document.getElementById('s1aSetSaved').textContent), box());
  btn().click(); await sleep(250);
  ok('Turn off: saves it off', window.__saved.slice(-1)[0].m.step1_alert_live===false && /^Off\./.test(box()));
  ok('no em dashes in what it says', !/—/.test(document.querySelector('[data-set="step1-alert"]').innerText + window.__asked.join('')));
  (0,eval)("CC_SETTINGS_FOCUS='step1-alert'"); settingsFocusApply(); await sleep(100);
  const shown=(q)=>getComputedStyle(document.querySelector(q)).display!=='none';
  ok('the link #settings/step1-alert shows just this setting', shown('[data-set="step1-alert"]') && !shown('[data-set="leads"]'));
  (0,eval)("CC_SETTINGS_FOCUS=null"); settingsFocusApply();
  return R; }"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []
    pg = b.new_page(viewport={'width': 1280, 'height': 1000})
    pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    pg.goto(f'http://localhost:{PORT}/index.html?proof=s1a'); pg.wait_for_timeout(1500)
    for s in (STUB, DATA, FAKE): pg.evaluate('s=>(0,eval)(s)', s)
    R = pg.evaluate(T)
    pg.evaluate("()=>{ DATA.ops_settings.step1_alert_live=false; s1aSetFill(); document.getElementById('tab-settings').style.display='block'; document.querySelector('[data-set=\"step1-alert\"]').scrollIntoView(); }"); pg.wait_for_timeout(200)
    try: pg.locator('[data-set="step1-alert"]').screenshot(path=os.environ.get('SHOT', '/tmp/step1_alert_switch.png'), timeout=5000)
    except Exception as e: R.append(['FAIL', 'screenshot of the setting', str(e)[:200]])
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

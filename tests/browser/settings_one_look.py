"""Hub settings open from the Owners Hub Admin page, one at a time (2026-10-05): cc.mo-care.com/#settings/<name> waits
for the roles, then shows just that setting with a way back to all of them; the sidebar has no Settings tab. The real
page, offline (python3 tests/browser/settings_one_look.py, with the static server on 8765)."""
from playwright.sync_api import sync_playwright
H = open('/Users/samantha/Claude/Projects/cc-hub-live/.claude/g1a_harness.js').read()
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const alerts=[]; window.alert=m=>alerts.push(m);
  const P=()=>document.getElementById('tab-settings');
  const all=()=>P().querySelectorAll('[data-set]').length; const vis=()=>[...P().querySelectorAll('[data-set]')].filter(x=>x.style.display!=='none').map(x=>x.dataset.set);
  document.getElementById('appScreen').classList.add('on'); await sleep(600);
  CC_ROLES=[]; CC_ROLES_CHECKED=false; CC_SETTINGS_PENDING=false; switchTab('cgdir'); await sleep(30);
  location.hash='#settings/missed-clockins'; await sleep(150);
  ok('arrives before the roles are known: waits, no refusal', alerts.length===0 && CC_SETTINGS_PENDING===true);
  (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha Troutman' };");
  CC_ROLES=['owner_admin']; CC_ROLES_CHECKED=true; CC_ROLE_BY_EMAIL['samantha@mo-care.com']=['owner_admin']; ccApplyRoleUi(); await sleep(150);
  ok('then only the Missed clock-ins setting shows, with its own Save', P().classList.contains('active') && JSON.stringify(vis())==='["missed-clockins"]' && !!document.getElementById('set_tk_msg') && document.getElementById('set_tk_msg').offsetParent!==null, vis());
  ok('it says which setting, with "Show all settings"', /Showing one setting: ⏰ Missed clock-ins/.test(document.getElementById('settingsFocusBar').innerText) && /Show all settings/.test(document.getElementById('settingsFocusBar').innerText));
  ok('the page-wide Save is hidden for a setting with its own save', P().querySelector('.modal-actions').style.display==='none');
  location.hash='#settings/cadences'; await sleep(200);
  ok('a setting that uses the page-wide Save keeps it', JSON.stringify(vis())==='["cadences"]' && P().querySelector('.modal-actions').style.display==='');
  location.hash='#settings/fresh-start'; await sleep(200);
  ok('Fresh start opens by itself for an owner', JSON.stringify(vis())==='["fresh-start"]', vis());
  location.hash='#settings'; await sleep(200);
  ok('#settings shows them all again', vis().length===all() && all()>=26 && !document.getElementById('settingsFocusBar').innerText.trim(), vis().length);
  location.hash='#settings/nope'; await sleep(200);
  ok('an unknown name shows all, and says so', vis().length===all() && /was not found/.test(document.getElementById('settingsFocusBar').innerText));
  ok('the sidebar has no Settings tab, even for an owner', document.getElementById('settingsFtab').style.display==='none');
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page()
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=settingsone'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', H)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

"""The Hub Settings link opened before the roles are read (2026-10-03): it waits, then opens for an owner and refuses
anyone else. The real page, offline (python3 tests/browser/settings_link_look.py, with the static server on 8765)."""
from playwright.sync_api import sync_playwright
H = open('/Users/samantha/Claude/Projects/cc-hub-live/.claude/g1a_harness.js').read()
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const alerts=[]; window.alert=m=>alerts.push(m);
  const shown=()=>{ const p=document.getElementById('tab-settings'); return !!p && (p.classList.contains('active') || getComputedStyle(p).display!=='none'); };
  document.getElementById('appScreen').classList.add('on');
  /* the Hub reads the address once, up to 400ms after it is shown; let that happen first, or it can land mid-test
     and open Settings a second time (a test timing race, not a page fault) */
  await sleep(600);
  CC_ROLES=[]; CC_ROLES_CHECKED=false; CC_SETTINGS_PENDING=false;
  switchTab('cgdir'); await sleep(30);
  location.hash='#settings'; await sleep(150);
  ok('the link arrives before the roles are known: no refusal, it waits', alerts.length===0 && CC_SETTINGS_PENDING===true && !shown(), [alerts, CC_SETTINGS_PENDING, shown()]);
  CC_ROLES=['owner_admin']; CC_ROLES_CHECKED=true; ccApplyRoleUi(); await sleep(80);
  ok('the roles arrive (owner): Settings opens by itself, no message', shown() && alerts.length===0 && CC_SETTINGS_PENDING===false, [shown(), alerts]);
  ok('...and the Caregiver connect switch is on that page', !!document.getElementById('cgcSetBtn') && document.getElementById('tab-settings').contains(document.getElementById('cgcSetBtn')));
  switchTab('cgdir'); await sleep(30);
  CC_ROLES=[]; CC_ROLES_CHECKED=false; switchTab('settings');
  CC_ROLES=['care_coordinator']; CC_ROLES_CHECKED=true; ccApplyRoleUi(); await sleep(50);
  ok('the roles arrive (not an owner): refused then, as before', alerts.length===1 && /do not have permission/.test(alerts[0]) && !shown(), [alerts, shown()]);
  alerts.length=0; switchTab('settings'); await sleep(30);
  ok('once the roles are known, a non-owner is refused straight away (unchanged)', alerts.length===1);
  alerts.length=0; CC_ROLES=['owner_admin']; switchTab('settings'); await sleep(30);
  ok('once the roles are known, an owner opens it straight away (unchanged)', alerts.length===0 && shown());
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page()
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=settingslink'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', H)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

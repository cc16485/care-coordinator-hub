"""2026-10-05 (her call): no My Team tab; the Owners Hub Admin page's Team buttons open the Hub's team tools by link
(#myteam/add, #myteam/access/<email>, #myteam/role/<email>). Offline, made-up data; nothing is saved or sent.
(python3 tests/browser/team_links_look.py, with the static server on 8765)"""
from playwright.sync_api import sync_playwright
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,400)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on');
  const calls=[]; window.staffAddOpen=()=>calls.push('add'); window.hubAccessOpen=(e)=>calls.push('access:'+e); window.roleOpen=(e)=>calls.push('role:'+e);
  DATA.positions=DATA.positions||[]; (0,eval)('CC_ROLES=["owner_admin"]; CC_ROLES_CHECKED=true;');
  ok('no My Team tab in the Today row', !document.querySelector('#fsub-today [data-tab="myteam"]'));
  location.hash='#myteam/add'; await sleep(500);
  ok('#myteam/add opens Add staff member', calls.includes('add') && activeTab==='myteam', [calls, activeTab]);
  location.hash='#myteam/access/kat%40mo-care.com'; await sleep(500);
  ok('#myteam/access/<email> opens that person\'s Hub access', calls.includes('access:kat@mo-care.com'), calls);
  location.hash='#myteam/role/kat%40mo-care.com'; await sleep(500);
  ok('#myteam/role/<email> opens their role', calls.includes('role:kat@mo-care.com'), calls);
  (0,eval)('CC_ROLES_CHECKED=false;'); calls.length=0; location.hash='#myteam/add'; await sleep(400);
  ok('before the roles are read, it waits', !calls.includes('add'), calls);
  (0,eval)('CC_ROLES_CHECKED=true;'); await sleep(700);
  ok('...then opens once they are', calls.includes('add'), calls);
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page()
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=team'); pg.wait_for_timeout(1200)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

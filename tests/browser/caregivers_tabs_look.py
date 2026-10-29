"""Training & Compliance folded into Caregivers (Samantha 2026-10-28): Caregivers has Directory, Supervisory Visits,
Background Checks, Orientation & Training and Training Platform; there is no Training & Compliance section; old links
(#caregivers, #training, #compliance, #training-compliance, #cgtraining, #cgcompliance, #trainhub) land on the same pages
under Caregivers. Offline, made-up data, nothing saved. (PORT=<static server port> python3 tests/browser/caregivers_tabs_look.py)"""
import os
from playwright.sync_api import sync_playwright
H = open('/Users/samantha/Claude/Projects/cc-hub-live/.claude/g1a_harness.js').read()
PORT = os.environ.get('PORT', '8811')
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; await sleep(600);
  (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha Troutman' };"); CC_ROLES=['owner_admin']; CC_ROLES_CHECKED=true; CC_ROLE_BY_EMAIL['samantha@mo-care.com']=['owner_admin'];
  const tabs=[...document.querySelectorAll('.fbar .ftab')].map(x=>x.innerText.trim());
  ok('no Training & Compliance section in the top bar', !tabs.some(t=>/Training\s*&\s*Compliance/.test(t)) && tabs.some(t=>/^Caregivers$/.test(t)), tabs);
  const pills=[...document.querySelectorAll('#fsub-cgdir .fpill')].map(x=>x.innerText.trim());
  ok('Caregivers has five tabs, in order', JSON.stringify(pills)===JSON.stringify(['Directory','Supervisory Visits','Background Checks','Orientation & Training','Training Platform']), pills);
  ok('the old Training & Compliance tab row is gone', !document.getElementById('fsub-caregivers'));
  const where=()=>({ tab:activeTab, group:(document.querySelector('.fbar .ftab.active')||{}).innerText, sub:(document.querySelector('.fsubbar.on')||{}).id,
    shown:!!document.getElementById('tab-'+activeTab) && getComputedStyle(document.getElementById('tab-'+activeTab)).display!=='none' });
  for (const [h, want] of [['cgcompliance','cgcompliance'],['cgtraining','cgtraining'],['trainhub','trainhub'],['training','cgtraining'],['compliance','cgcompliance'],['training-compliance','cgtraining'],['caregivers','cgdir'],['performance','cgdir']]) {
    try{ localStorage.removeItem('cch_last_cgdir'); }catch(e){}   /* a section opens on its last-used tab; start fresh */
    location.hash='#'+h; await sleep(250); const w=where();
    ok('#'+h+' opens '+want+' under Caregivers', w.tab===want && /Caregivers/.test(w.group||'') && w.sub==='fsub-cgdir' && w.shown, w);
    location.hash='#mywork'; await sleep(150);
  }
  switchTab('cgcompliance'); await sleep(150);
  ok('the page header names the tab', /Background Checks/.test(document.getElementById('ccSectionTitle')?.innerText || document.title), [document.getElementById('ccSectionTitle')?.innerText, document.title]);
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page()
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(f'http://localhost:{PORT}/index.html?proof=cgtabs'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', H)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    pg.set_viewport_size({'width': 1300, 'height': 500}); pg.evaluate("()=>switchTab('cgcompliance')"); pg.wait_for_timeout(300)
    pg.screenshot(path=os.environ.get('SHOT', '/tmp/caregivers_tabs.png'), clip={'x': 0, 'y': 0, 'width': 1300, 'height': 260}); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

"""760b (2026-10-15): giving the Care Coordinator Hub gives the staffing records too (Samantha: "I want most to have access
to both hubs staffing and care coordinator"); removing it removes both; an account with the Care Coordinator Hub but not
the staffing records gets an "Add the staffing tools" button; no hub list = no hub. The real page, offline, made-up
people; nothing is sent.   HUB_PAGE=http://localhost:PORT/index.html python3 tests/browser/hub_access_both_760b_look.py"""
import os
from playwright.sync_api import sync_playwright
H = open('/Users/samantha/Claude/Projects/cc-hub-live/.claude/g1a_harness.js').read()
PAGE = os.environ.get('HUB_PAGE', 'http://localhost:8765/index.html')
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  window.ccCan=()=>true; let calls=[]; window.__st={ state:'none' };
  window.hubAccessCall=async(a,e,h)=>{ calls.push([a,h]); return a==='status'?window.__st:{ ok:true }; };
  const open=async()=>{ try{ ccPopClose(); }catch(_){} calls=[]; await hubAccessOpen('pat@example.test'); await sleep(80); return document.getElementById('haBody'); };
  const click=async(sel)=>{ const el=document.querySelector(sel); if(!el){ ok('found '+sel,false,(document.getElementById('haBody')||{}).innerHTML); return; } el.click(); await sleep(60); };
  let b=await open();
  ok('the Care Coordinator Hub row says it includes the staffing tools', /includes the staffing tools/.test(b.innerText), b.innerText);
  await click('[data-ha-give="care_coordinator"]');
  ok('Invite on the Care Coordinator Hub sends ONE invitation with both hubs', calls.filter(c=>c[0]==='invite').length===1 && JSON.stringify(calls.find(c=>c[0]==='invite')[1])==='["care_coordinator","staffing"]', calls);
  window.__st={ state:'active', access:['care_coordinator'] }; b=await open();
  ok('Care Coordinator Hub without the staffing records: Has access, plus an Add the staffing tools button', /Has access/.test(b.innerText) && /Add the staffing tools/.test(b.innerText), b.innerText);
  await click('button[data-ha-give="care_coordinator"]');
  ok('Add the staffing tools restores both (the server keeps what is there)', calls.some(c=>c[0]==='restore' && JSON.stringify(c[1])==='["care_coordinator","staffing"]'), calls);
  window.__st={ state:'active', access:['care_coordinator','staffing','team_hub'] }; b=await open();
  ok('with both: no Add button', !/Add the staffing tools/.test(b.innerText), b.innerText);
  await click('[data-ha-remove="care_coordinator"]'); await click('#haYes');
  ok('Remove on the Care Coordinator Hub removes it and the staffing records', JSON.stringify(calls.filter(c=>c[0]==='revoke').map(c=>c[1]))==='["care_coordinator","staffing"]', calls);
  window.__st={ state:'active', access:['care_coordinator','team_hub'] }; b=await open();
  await click('[data-ha-remove="care_coordinator"]'); await click('#haYes');
  ok('...and only what they have (no staffing record to remove: one call)', JSON.stringify(calls.filter(c=>c[0]==='revoke').map(c=>c[1]))==='["care_coordinator"]', calls);
  window.__st={ state:'active', access:[] }; b=await open();
  ok('an account with no hub list shows No access on every row (no list = no hub)', (b.innerText.match(/No access/g)||[]).length===2 && !/Has access/.test(b.innerText), b.innerText);
  window.__st={ state:'active' }; b=await open();
  ok('a missing list (older server) also shows No access, never every hub', (b.innerText.match(/No access/g)||[]).length===2, b.innerText);
  await click('[data-ha-give="team_hub"]');
  ok('the Team Hub row still gives just the Team Hub', calls.some(c=>c[0]==='restore' && c[1]==='team_hub'), calls);
  try{ ccPopClose(); }catch(_){}
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page()
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(PAGE + '?proof=ha760b'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', H)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

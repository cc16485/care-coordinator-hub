"""Hub access shows the Care Coordinator Hub and the Team Hub only (2026-10-05: the Staffing Hub page is retired).
The real page, offline, made-up people; nothing is sent."""
from playwright.sync_api import sync_playwright
H = open('/Users/samantha/Claude/Projects/cc-hub-live/.claude/g1a_harness.js').read()
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  window.ccCan=()=>true; const calls=[]; window.__st={ state:'active', access:['care_coordinator','staffing','team_hub'] };
  window.hubAccessCall=async(a,e,h)=>{ calls.push([a,h]); return a==='status'?window.__st:{ ok:true }; };
  const rows=async()=>{ await hubAccessOpen('pat@example.test'); await sleep(80); const b=document.getElementById('haBody'); const t=b?b.innerText:''; document.querySelectorAll('.ccpop, [class*=ccPop]').forEach(x=>{}); return t; };
  let t=await rows();
  ok('two hubs shown: Care Coordinator Hub and Team Hub', /Care Coordinator Hub/.test(t) && /Team Hub/.test(t), t);
  ok('the retired Staffing Hub is not shown, even for someone who still has it', !/Staffing Hub|sc\.mo-care\.com/.test(t), t);
  try{ ccPopClose(); }catch(_){}
  window.__st={ state:'none' }; t=await rows();
  ok('someone with no sign-in: Invite on both rows', (t.match(/Invite/g)||[]).length>=2 && !/Staffing/.test(t), t);
  try{ ccPopClose(); }catch(_){}
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page()
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=ha'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', H)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
src = open('/Users/samantha/Claude/Projects/cc-hub-live/index.html').read()
R.append(['PASS' if "for(const h of ['team_hub','staffing','care_coordinator'])" in src else 'FAIL', 'Deactivate still removes the old Staffing grant too', ''])
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

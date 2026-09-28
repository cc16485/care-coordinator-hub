"""Z1: nothing in the Care Coordinator Hub sends to Zapier, even with Zapier addresses left in the browser. Offline."""
import re
from playwright.sync_api import sync_playwright
H = open('/Users/samantha/Claude/Projects/cc-hub-live/.claude/g1a_harness.js').read()
Z = "https://hooks.zapier.com/hooks/catch/1/abc/"
TESTS = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,400)]);
  window.__out=[]; const base=window.fetch; window.fetch=async(u,o)=>{ if(/zapier/i.test(String(u))) __out.push(String(u)); return base(u,o); };
  window.alert=()=>{}; window.confirm=()=>true;
  if(!(window.SCX&&SCX.saveSettings)){ await new Promise(res=>{ window.addEventListener('scx-ready',res,{once:true}); const s=document.createElement('script'); s.src='caregivers-engine.js?z1'; document.head.appendChild(s); setTimeout(res,4000); }); }
  const stored=JSON.parse(localStorage.getItem('cc_settings')||'{}');
  ok('the caregiver engine loads', !!(window.SCX&&SCX.saveSettings));
  let err=null; try{ SCX.saveSettings(); }catch(e){ err=String(e); }
  ok('Settings still save (no missing boxes break it)', !err, err);
  const after=JSON.parse(localStorage.getItem('cc_settings')||'{}');
  ok('Zapier addresses left in this browser are dropped', !/zapier/i.test(JSON.stringify(after)), after);
  ok('nothing was sent to Zapier', __out.length===0, __out);
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1280, 'height': 1000})
    pg.route('**/*', lambda r: r.abort() if ('supabase.co' in r.request.url or 'zapier' in r.request.url) else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.add_init_script("try{ localStorage.setItem('cc_settings', JSON.stringify({zapier_cand_webhook:'%s', zapier_attend_webhook:'%s', ac_orient_webhook:'%s', ac_new_client_webhook:'%s', staff_users:[]})); }catch(e){}" % (Z,Z,Z,Z))
    pg.goto('http://localhost:8765/index.html?proof=z1'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', H)
    R = pg.evaluate(TESTS); b.close()
P='/Users/samantha/Claude/Projects/'
for f in ['cc-hub-live/index.html','cc-hub-live/caregivers-engine.js','Staffing-Coordinator-Hub/index.html','team-hub/index.html']:
    s=open(P+f).read()
    R.append(['PASS' if not re.search(r"hooks\.zapier\.com|zapFire\(|access_webhook_url\)|fetch\(webhook", s) else 'FAIL', f+': no Zapier address, sender or webhook call left', ''])
R.append(['PASS' if not errs else 'FAIL','no page errors',errs[:3]])
for s_, n, d in R: print(s_, '·', n, '' if s_=='PASS' else d)
print(sum(r[0]=='PASS' for r in R), '/', len(R))

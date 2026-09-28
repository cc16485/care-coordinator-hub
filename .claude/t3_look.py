"""T3: the Care Coordinator Hub with no Training key anywhere. Offline."""
from playwright.sync_api import sync_playwright
H = open('/Users/samantha/Claude/Projects/cc-hub-live/.claude/g1a_harness.js').read()
SETUP = r"""
(()=>{ window.sleep=ms=>new Promise(r=>setTimeout(r,ms)); window.__tr=[];
  const base=window.fetch;
  window.fetch=async(u,o)=>{ const url=String(u), J=(s,b)=>new Response(JSON.stringify(b),{status:s,headers:{'content-type':'application/json'}});
    if(/rdqujxiycycwhskyvrwa/.test(url)){ const h=(o&&o.headers)||{}, b=JSON.parse((o&&o.body)||'{}'); __tr.push({url, tok:h['x-hub-token']||'', hasKey:('key' in b)||('p_key' in b)});
      if(/ghl-lead-comms/.test(url)) return J(200,{status:'sent',timeline:[]}); if(/job-offer/.test(url)) return J(200,{ok:true,id:'x'}); return J(200,{}); }
    return base(u,o); };
  window.__alerts=[]; window.alert=m=>__alerts.push(String(m)); window.confirm=()=>true;
})();
"""
TESTS = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]);
  ok('a browser that had the key saved no longer has it (scrubbed on load)', !('training_hub_key' in CONFIG) && !/training_hub_key/.test(localStorage.getItem('cch_config')||''), localStorage.getItem('cch_config'));
  ok('the settings screen no longer has a key box or an AxisCare token box', !document.getElementById('set_training_hub_key')&&!document.getElementById('set_axiscare_token')&&!document.getElementById('settings-training-key'));
  ok('shared settings no longer carry the key or a token', !CC_SHARED_SETTINGS.includes('training_hub_key')&&!CC_SHARED_SETTINGS.includes('axiscare_token'), CC_SHARED_SETTINGS);
  initCommsPanel({id:'L1',first_name:'Test',phone:'4175550100'}); await sleep(80);
  ok('the Communications panel opens with no key (it used to stay locked)', document.getElementById('commsPanel').style.display==='block'&&document.getElementById('commsLocked').style.display==='none', document.getElementById('commsLocked').innerText);
  const n=__tr.length; DATA.coordinator_staff=[{name:'Kat',phone:'4175550101',notify_checkins:true}]; await notifyEscalation({client_name:'Test',concerns_raised:'x',satisfaction_rating:2}); await sleep(50);
  ok('an escalation alert goes out with your sign-in and no key (it used to stop and ask for the key)', __tr.length>n && !__alerts.some(a=>/Training Hub key/.test(a)), [__alerts,__tr.slice(n)]);
  ok('no Training call sent a key, and every one carried your sign-in', __tr.length>0 && __tr.every(x=>!x.hasKey&&x.tok==='preview-token'), __tr);
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1280, 'height': 1000})
    blocked=[]; pg.route('**/*', lambda r: (blocked.append(1), r.abort()) if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.add_init_script("try{ localStorage.setItem('cch_config', JSON.stringify({training_hub_key:'cchub_OLD', axiscare_token:'', checkin_cadence:30})); }catch(e){}")
    pg.goto('http://localhost:8765/index.html?proof=t3'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', H); pg.evaluate('s=>(0,eval)(s)', SETUP)
    R = pg.evaluate(TESTS); b.close()
R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); R.append(['PASS' if not blocked else 'FAIL','no request reached a real database',len(blocked)])
for s, n, d in R: print(s, '·', n, '' if s == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

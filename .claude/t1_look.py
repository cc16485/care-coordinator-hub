"""T1: every Hub call to the four Training functions carries the person's own sign-in; no saved key needed. Offline."""
import os, sys
from playwright.sync_api import sync_playwright
H = open('/Users/samantha/Claude/Projects/cc-hub-live/.claude/g1a_harness.js').read()
SETUP = r"""
(()=>{ window.sleep=ms=>new Promise(r=>setTimeout(r,ms)); window.__tr=[];
  const base=window.fetch;
  window.fetch=async(u,o)=>{ const url=String(u), J=(s,b)=>new Response(JSON.stringify(b),{status:s,headers:{'content-type':'application/json'}});
    const m=/rdqujxiycycwhskyvrwa\.supabase\.co\/functions\/v1\/([a-z-]+)/.exec(url);
    if(m){ const h=(o&&o.headers)||{}, b=JSON.parse((o&&o.body)||'{}'); __tr.push({fn:m[1], tok:h['x-hub-token']||'', key:('key' in b)?b.key:null, mode:b.mode||null});
      if(!h['x-hub-token']) return J(401,{error:'Sign in to the Hub with an office account first.'});
      if(m[1]==='ghl-replies') return J(200,{replies:[{id:'c1',contact_id:'k1',name:'Test Person',preview:'hi',at:null,unread:1}]});
      if(m[1]==='ghl-thread') return J(200,{thread:[{direction:'inbound',body:'hello there',at:null}]});
      if(m[1]==='ghl-nurse-assign') return J(200,{ok:true,contactId:'k9',assignedTo:'n1'});
      if(b.mode==='clockins') return J(200,{late:[],missed:[],window:'x'});
      if(b.mode==='pairs') return J(200,{pairs:[{client:'Test Client',client_id:'501',caregiver:'Test Cg',caregiver_id:'9',last_date:'2026-09-20',visits:3}]});
      return J(200,{window:'x',total_visits:1,open_count:1,open:[{date:'2026-09-30',start:'9:00 AM',end:'1:00 PM',client:'Test Client'}]}); }
    return base(u,o); };
  window.__alerts=[]; window.alert=m=>__alerts.push(String(m)); window.confirm=()=>true;
  try{ CONFIG.training_hub_key=''; appSettings.training_hub_key=''; }catch(e){}
})();
"""
TESTS = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]);
  if(!(window.SCX&&SCX.scanClockins)){ await new Promise(res=>{ window.addEventListener('scx-ready',res,{once:true}); const s=document.createElement('script'); s.src='caregivers-engine.js?t1'; document.head.appendChild(s); setTimeout(res,4000); }); }
  try{ CONFIG.training_hub_key=''; appSettings.training_hub_key=''; }catch(e){}
  const last=fn=>__tr.filter(x=>x.fn===fn).slice(-1)[0];
  const need=(id,tag='div')=>{ if(!document.getElementById(id)){ const e=document.createElement(tag); e.id=id; document.body.appendChild(e); } return document.getElementById(id); };
  const signed=x=>x&&x.tok==='preview-token'&&x.key===null;
  /* Hub manager strip */
  try{ window._openShifts=undefined; }catch(e){}
  await loadOpenShiftsForStrip(); await sleep(50);
  ok('manager strip: open shifts load with your sign-in and no key', signed(last('axiscare-open-shifts')), __tr);
  /* engine boards */
  need('att-scan-results'); await SCX.scanClockins(); await sleep(50);
  ok('tardy scan: runs with your sign-in and no key (it used to stop and ask for the key)', signed(last('axiscare-open-shifts'))&&last('axiscare-open-shifts').mode==='clockins'&&!/Paste the Training Hub/.test(document.getElementById('att-scan-results').innerText), [last('axiscare-open-shifts'),document.getElementById('att-scan-results').innerText]);
  /* Care Match pairs board */
  const n2=__tr.length; try{ await cmLoadPairs(); }catch(e){} await sleep(50);
  ok('Care Match: caregiver/client pairs load with your sign-in', __tr.length>n2&&signed(last('axiscare-open-shifts'))&&last('axiscare-open-shifts').mode==='pairs', __tr.slice(-2));
  /* nurse claim */
  const n3=__tr.length; DATA.nurse_staff=[{name:'Nurse N',ghl_user_id:'n1'}]; await nvGhlSync({phone:'4175550100',name:'A B'},'Nurse N'); await sleep(30);
  ok('a nurse claim still mirrors into GoHighLevel, with your sign-in and no key (it used to skip silently without one)', __tr.length>n3&&signed(last('ghl-nurse-assign'))&&!__alerts.length, [__tr.slice(-1),__alerts]);
  /* with a saved key during the switch-over, it is still sent alongside, so the old functions keep working until deployed */
  CONFIG.training_hub_key='cchub_x'; window._openShifts=undefined; await loadOpenShiftsForStrip(); await SCX.scanClockins();
  ok('during the switch-over a saved key still rides along (old functions keep working until the new ones deploy)', (x=>x.tok==='preview-token'&&x.key==='cchub_x')(last('axiscare-open-shifts')), last('axiscare-open-shifts'));
  ok('every call to these Training functions carried your sign-in', __tr.every(x=>x.tok==='preview-token'), __tr.filter(x=>x.tok!=='preview-token'));
  return R;
}
"""
blocked = []
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1280, 'height': 1000})
    pg.route('**/*', lambda r: (blocked.append(r.request.url[:80]), r.abort()) if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=t1'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', H); pg.evaluate('s=>(0,eval)(s)', SETUP)
    R = pg.evaluate(TESTS)
    b.close()
import re
P='/Users/samantha/Claude/Projects/'
for f in ['cc-hub-live/index.html','cc-hub-live/caregivers-engine.js','Staffing-Coordinator-Hub/index.html','team-hub/owners.html']:
    src=open(P+f).read(); calls=[m.start() for m in re.finditer(r"await fetch\(('https://rdqujxiycycwhskyvrwa\.supabase\.co/functions/v1/(axiscare-open-shifts|ghl-replies|ghl-thread)'|NURSE_ASSIGN_API|HUB_FN),", src)]
    good=[c for c in calls if "'x-hub-token':" in src[c:c+260]]
    R.append(['PASS' if calls and len(good)==len(calls) else 'FAIL', f'{f}: every call to the four functions sends your sign-in ({len(good)} of {len(calls)})', ''])
R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
R.append(['PASS' if not blocked else 'FAIL', 'no request reached a real database', blocked[:3]])
for s, n, d in R: print(s, '·', n, '' if s == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

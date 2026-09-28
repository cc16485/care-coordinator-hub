"""T2: the Hub reads offers and training, and saves offer updates, through hub-training-data with your own sign-in;
the background-check upload goes with your sign-in and a short link. Offline."""
import os, re
from playwright.sync_api import sync_playwright
H = open('/Users/samantha/Claude/Projects/cc-hub-live/.claude/g1a_harness.js').read()
SETUP = r"""
(()=>{ window.sleep=ms=>new Promise(r=>setTimeout(r,ms)); window.__tr=[];
  const base=window.fetch;
  window.fetch=async(u,o)=>{ const url=String(u), J=(s,b)=>new Response(JSON.stringify(b),{status:s,headers:{'content-type':'application/json'}});
    if(/rdqujxiycycwhskyvrwa/.test(url)){ const h=(o&&o.headers)||{}, b=JSON.parse((o&&o.body)||'{}'); __tr.push({url, tok:h['x-hub-token']||'', body:b});
      if(!h['x-hub-token']) return J(401,{error:'Sign in to the Hub with an office account first.'});
      if(/action=job_offers/.test(url)) return J(200,[{id:'11111111-2222-3333-4444-555555555555',name:'Test Hire',first_name:'Test',last_name:'Hire',position:'Caregiver',created_at:'2026-09-20'}]);
      if(/action=training_status/.test(url)) return J(200,[{name:'Test Cg',axiscare_id:'9',trainings:[]}]);
      return J(200,{ok:true}); }
    return base(u,o); };
  window.__alerts=[]; window.alert=m=>__alerts.push(String(m)); window.confirm=()=>true;
  try{ CONFIG.training_hub_key=''; }catch(e){}
})();
"""
TESTS = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]);
  if(!(window.SCX&&SCX.loadOffers)){ await new Promise(res=>{ window.addEventListener('scx-ready',res,{once:true}); const s=document.createElement('script'); s.src='caregivers-engine.js?t2'; document.head.appendChild(s); setTimeout(res,4000); }); }
  try{ CONFIG.training_hub_key=''; }catch(e){}
  const last=()=>__tr[__tr.length-1];
  const box=document.getElementById('offersList')||Object.assign(document.body.appendChild(document.createElement('div')),{id:'offersList'});
  await SCX.loadOffers(); await sleep(80);
  ok('offers: loaded through hub-training-data with your sign-in and no key', /hub-training-data\?action=job_offers/.test(last().url)&&last().tok==='preview-token'&&!('p_key' in last().body), last());
  ok('…and shown (no "paste the key" message)', /Test Hire/.test(box.innerText)&&!/Paste the Training Hub/.test(box.innerText), box.innerText.slice(0,200));
  const n=__tr.length; await SCX.syncFromTrainingHub(); await sleep(80);
  ok('training sync: reads through hub-training-data with your sign-in, no key asked for', __tr.length>n&&/action=training_status/.test(last().url)&&last().tok==='preview-token'&&!__alerts.some(a=>/read key/.test(a)), [__tr.slice(-1),__alerts]);
  TRAIN_ROWS=null; const rows=await trainLoad();
  ok('the profile\'s training line: reads with your sign-in and no key', rows.length===1&&/action=training_status/.test(last().url)&&last().tok==='preview-token', [rows,last()]);
  const ib=document.getElementById('interviewsList')||Object.assign(document.body.appendChild(document.createElement('div')),{id:'interviewsList'});
  await renderInterviewsLegacy(); await sleep(30);
  ok('the older interviews list: loads with your sign-in and no key', /action=job_offers/.test(last().url)&&last().tok==='preview-token'&&/Test Hire/.test(ib.innerText), ib.innerText.slice(0,150));
  ok('no page call went to the Training database functions directly', !__tr.some(x=>/rest\/v1\/rpc/.test(x.url)), __tr.map(x=>x.url));
  return R;
}
"""
blocked = []
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1280, 'height': 1000})
    pg.route('**/*', lambda r: (blocked.append(r.request.url[:80]), r.abort()) if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=t2'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', H); pg.evaluate('s=>(0,eval)(s)', SETUP)
    R = pg.evaluate(TESTS)
    b.close()
P='/Users/samantha/Claude/Projects/'
for f in ['cc-hub-live/index.html','cc-hub-live/caregivers-engine.js','Staffing-Coordinator-Hub/index.html','team-hub/index.html','team-hub/offer.html']:
    src=open(P+f).read(); direct=len(re.findall(r"rest/v1/rpc/hub_", src))
    calls=[m.start() for m in re.finditer(r"await fetch\((TRAINING_DATA_FN\+|TRAINING_HUB_API|TRAIN_API|TRAINING_API|'https://rdqujxiycycwhskyvrwa\.supabase\.co/functions/v1/(hub-training-data|ghl-attach-doc))", src)]
    good=[c for c in calls if re.search(r"'x-hub-token'\s*:", src[c:c+320])]
    R.append(['PASS' if direct==0 and len(good)==len(calls) else 'FAIL', f'{f}: no direct database-function calls ({direct}); every Training data call sends your sign-in ({len(good)} of {len(calls)})', ''])
E=open(P+'cc-hub-live/caregivers-engine.js').read(); i=E.index('async function bgrPushDocToGHL'); fn=E[i:E.index('\n}\n',i)]
R.append(['PASS' if 'createSignedUrl(proof, 600)' in fn and "ghlLink || undefined" in fn and 'key: trainingKey' not in fn and "'x-hub-token': await trainHubTok()" in fn else 'FAIL', 'background-check upload: your sign-in, a 10-minute link, no key, and a pasted outside link is never sent', ''])
R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
R.append(['PASS' if not blocked else 'FAIL', 'no request reached a real database', blocked[:3]])
for s, n, d in R: print(s, '·', n, '' if s == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

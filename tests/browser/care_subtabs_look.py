"""The client profile's Care tab in four sub-tabs (2026-10-13, her ask): Assessments & care plans, Care plan reviews & message
care team, Caregiver packet, Care notes. The real page, offline, a made-up client; nothing is sent. Proves each card sits in
its sub-tab, the profile opens on Assessments, a 'care:reviews' link opens straight onto the reviews, the chosen sub-tab is kept
while you move between profile tabs, and a different client starts on Assessments again.
(python3 tests/browser/care_subtabs_look.py, static server on 8765; writes care_subtabs.png)"""
from playwright.sync_api import sync_playwright
STUB = r"""
(()=>{
  const W=window;
  (0,eval)(`sb={ from:()=>{ const p={ select(){return p;}, eq(){return p;}, neq(){return p;}, gte(){return p;}, lte(){return p;}, in(){return p;}, not(){return p;}, order(){return p;}, limit(){return p;},
      maybeSingle:async()=>({data:null,error:null}), single:async()=>({data:null,error:null}), then(a){ return Promise.resolve({data:[],error:null}).then(a); } }; return p; },
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async()=>({data:null,error:null}) }, auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };`);
  W.persist=async()=>{}; W.ccToast=()=>{}; W.opEvent=()=>{}; W.myWorkRefresh=()=>{}; W.renderLeadsStarts=()=>{};
  W.refreshCommsTimeline=async()=>{}; W.axLogLoad=async()=>{}; W.callsLoad=async()=>{}; W.cpRenderEvvForms=async()=>{}; W.famMount=async()=>{}; W.cjMountProfile=async()=>{};
  W.lsLoadFacts=async()=>{ LS.facts={ epOf:{}, scOf:{}, planOf:{} }; };
  /* AxisCare shift notes are read on opening Care; answer with nothing */
  const rf=W.fetch; W.fetch=async(u,o)=>{ if(/functions\/v1\//.test(String(u))) return new Response(JSON.stringify({ ok:true, shifts:[] }),{ status:200 }); return rf(u,o); };
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Land' }; OPS_PEOPLE=[{ primary_email:'krystal@mo-care.com', full_name:'Krystal Land' }];");
  DATA.ops_settings={}; DATA.ops_items=[]; DATA.care_assessments=[]; DATA.care_plans=[];
  DATA.care_plan_reviews=[{ id:'rv1', kind:'review', axiscare_client_id:'901', at:'2026-09-20T15:00:00Z', care_level:'2', findings:'Doing well (fake)', next_due:'2026-10-20' }];
  DATA.leads=[
    { id:'pat', first_name:'Pat', last_name:'Example', client_first_name:'Pat', client_last_name:'Example', status:'Converted', axiscare_client_id:'901', phone:'4175550190', created_at:'2026-09-01T13:00:00Z', said_yes_at:'2026-09-05T15:00:00Z' },
    { id:'lou', first_name:'Lou', last_name:'Sample', client_first_name:'Lou', client_last_name:'Sample', status:'Converted', axiscare_client_id:'902', phone:'4175550191', created_at:'2026-09-01T13:00:00Z', said_yes_at:'2026-09-05T15:00:00Z' } ];
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const shown=el=>!!el && el.offsetParent!==null;
  const sub=k=>document.querySelector('#leadProfileView .cp-care-sub[data-cs="'+k+'"]');
  const onSub=()=>[...document.querySelectorAll('#leadProfileView .cp-care-sub')].filter(shown).map(p=>p.dataset.cs);
  const btn=k=>document.querySelector('#cpCareSubs .subtab[data-cs="'+k+'"]');
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  await openClient({ ax:'901' }, 'care'); await sleep(500);
  const labels=[...document.querySelectorAll('#cpCareSubs .subtab')].map(b=>b.textContent.trim());
  ok('Care has four sub-tabs, in her order', JSON.stringify(labels)===JSON.stringify(['Assessments & care plans','Care plan reviews & message care team','Caregiver packet','Care notes']), labels);
  ok('it opens on Assessments & care plans, and only that one shows', JSON.stringify(onSub())==='["asmt"]' && btn('asmt').classList.contains('active'), onSub());
  ok('Assessments: the assessments card, with New assessment', /Assessments & care plan/.test(sub('asmt').innerText) && /New assessment/.test(sub('asmt').innerText), sub('asmt').innerText.slice(0,300));
  ok('...and no reviews, packet or notes in it', !/Care plan reviews|Caregiver packet|From the shifts/.test(sub('asmt').innerText), sub('asmt').innerText.slice(0,500));
  btn('reviews').click(); await sleep(100);
  ok('Care plan reviews: the reviews card with Ask caregivers and Log a review, and the logged review', JSON.stringify(onSub())==='["reviews"]' && /Care plan reviews/.test(sub('reviews').innerText) && /Ask caregivers/.test(sub('reviews').innerText) && /Log a review/.test(sub('reviews').innerText) && /Doing well \(fake\)/.test(sub('reviews').innerText), sub('reviews').innerText.slice(0,500));
  cpAskHere(); await sleep(150);
  ok('Ask caregivers opens its panel inside the reviews sub-tab', (()=>{ const p=document.getElementById('cp-ask-ax:901'); return !!p && sub('reviews').contains(p) && p.style.display!=='none'; })());
  cpLogReview(); await sleep(100);
  ok('Log a review opens its form inside the reviews sub-tab', (()=>{ const f=document.getElementById('cp-form'); return !!f && sub('reviews').contains(f) && shown(f); })());
  btn('packet').click(); await sleep(400);
  ok('Caregiver packet: only the packet card', JSON.stringify(onSub())==='["packet"]' && /Caregiver packet/.test(sub('packet').innerText), sub('packet').innerText.slice(0,300));
  btn('notes').click(); await sleep(200);
  ok('Care notes: From the shifts', JSON.stringify(onSub())==='["notes"]' && /From the shifts/.test(sub('notes').innerText), sub('notes').innerText.slice(0,300));
  cpShowTab('summary'); await sleep(50); cpShowTab('care'); await sleep(100);
  ok('going to another profile tab and back keeps Care notes', JSON.stringify(onSub())==='["notes"]');
  await openClient({ ax:'902' }, 'care'); await sleep(400);
  ok('a different client starts on Assessments again', JSON.stringify(onSub())==='["asmt"]', onSub());
  ok('...and the first client\'s review is not shown for them', !/Doing well \(fake\)/.test(sub('reviews').innerText));
  await openClient({ ax:'901' }, 'care:reviews'); await sleep(400);
  ok('a "care:reviews" link (plan review due, the reviews board) opens straight onto the reviews', JSON.stringify(onSub())==='["reviews"]' && document.querySelector('#cpTabs .cp-tab.on').dataset.cp==='care', onSub());
  return R;
}
"""
with sync_playwright() as pw:
    import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from clock_pin import pin
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1360, 'height': 1000})
    pin(pg)
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=caresubs'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T)
    pg.screenshot(path='tests/browser/care_subtabs.png')
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

"""CC Office on the phone, screen 1 (Needs me now), 2026-10-07. index.html?m=1 at phone size, offline, made-up items;
every Supabase answer is faked and every save is recorded; nothing reaches the database and nothing is sent.
(python3 tests/browser/phone_needs_me_look.py)"""
from playwright.sync_api import sync_playwright
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const iso=(h)=>new Date(Date.now()+h*36e5).toISOString(), ymd=(d)=>new Date(Date.now()+d*864e5).toISOString().slice(0,10);
  ok('phone mode is on, and the computer screens are hidden', window.CC_PHONE===true && document.documentElement.classList.contains('ccphone') && getComputedStyle(document.getElementById('appScreen')).display==='none');
  ok('not signed in: the sign-in shows first', getComputedStyle(document.getElementById('signinScreen')).display!=='none');
  /* the store the fake database keeps */
  const ME_E='krystal@mo-care.com';
  window.__STORE=[
    { id:'A', kind:'staffing_issue', opened_by:'timekeeper', status:'open', title:'Missed clock-in: Tasha R.', about:'Mr. Hale', phone:'4175550142', created_at:iso(-0.2), due:iso(-0.1), urgency:'urgent', domain:'' },
    { id:'B', kind:'missed_call', status:'open', title:'Call back: new inquiry', about:'Daughter of Mr. Bell', owner:ME_E, owner_name:'Krystal Test', created_at:iso(-3), due:iso(Math.max(0.3,(new Date().setHours(23,0,0,0)-Date.now())/36e5-0.5)) },
    { id:'C', kind:'project', status:'open', title:'Mrs. Ortiz coming home', owner:ME_E, owner_name:'Krystal Test', created_at:iso(-48), due:iso(-1), urgency:'urgent' },
    { id:'D', kind:'missed_call', status:'open', title:'Someone else\'s call', owner:'sam@mo-care.com', owner_name:'Sam Test', created_at:iso(-1), due:iso(72) },
    { id:'E', kind:'missed_call', status:'open', title:'Parked till tomorrow', owner:ME_E, owner_name:'Krystal Test', sub_state:'waiting', check_back:ymd(2), created_at:iso(-5), due:iso(-2) } ];
  window.__RPC=[]; window.__EV=[]; window.__FAILSAVE=false; window.__SIGNOUT=0;
  const clone=x=>JSON.parse(JSON.stringify(x));
  sb.from=(t)=>{ const b={ _t:t, select(){return b;}, eq(){return b;}, order(){return b;}, limit(){return b;}, is(){return b;}, gte(){return b;},
      insert(row){ if(t==='op_events') window.__EV.push(row); return Promise.resolve({data:null,error:null}); },
      maybeSingle(){ return Promise.resolve(t==='app_data'?{data:{data:clone(window.__STORE)},error:null}:{data:null,error:null}); },
      single(){ return b.maybeSingle(); },
      then(okf){ return Promise.resolve({data:[],error:null}).then(okf); } }; return b; };
  sb.rpc=async(fn,a)=>{ window.__RPC.push([fn,a&&a.item&&clone(a.item)]);
    if(window.__FAILSAVE) return { data:null, error:{ message:'Failed to fetch' } };
    if(fn==='upsert_app_data_item'&&a.target_key==='ops_items'){ const i=window.__STORE.findIndex(x=>x.id===a.item.id); if(i>-1) window.__STORE[i]=clone(a.item); else window.__STORE.push(clone(a.item)); }
    return { data:null, error:null }; };
  sb.auth.signOut=async()=>{ window.__SIGNOUT++; return {error:null}; };
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Test', shift:'day' };");
  DATA.coordinator_staff=[{ email:ME_E, name:'Krystal Test' }];
  DATA.ops_items=clone(window.__STORE);
  window.__SIW=0; const realSIW=window.runSignInWork; window.runSignInWork=async()=>{ window.__SIW++; };
  phStart(); await sleep(150);
  const L=()=>document.getElementById('phList'), txt=()=>L().innerText;
  ok('the phone list shows; the sign-in is gone', getComputedStyle(document.getElementById('phApp')).display==='block' && getComputedStyle(document.getElementById('signinScreen')).display==='none');
  const cards=[...L().querySelectorAll('.ph-card')].map(c=>c.id.replace('ph_',''));
  ok('the Hub\'s own Today: urgent and late first (A, C), then due today (B); someone else\'s and the parked one are not shown', JSON.stringify(cards)===JSON.stringify(['A','C','B']) || JSON.stringify(cards)===JSON.stringify(['C','A','B']), cards);
  ok('lanes: Act Now 2, Due Today 1', /ACT NOW · 2/.test(txt()) && /DUE TODAY · 1/.test(txt()), txt());
  const cA=()=>document.getElementById('ph_A');
  ok('the missed clock-in says nobody has it, offers Take it, Done, Note and Call (office line)', /Nobody has it/.test(cA().innerText) && cA().querySelector('[data-ph="take"]') && cA().querySelector('[data-ph="done"]') && cA().querySelector('[data-ph="note"]') && cA().querySelector('a[data-oc-phone="4175550142"]'), cA().innerHTML);
  const cC=document.getElementById('ph_C');
  ok('a project has no Done on the phone: it opens in the Hub (it closes when every step is done)', !cC.querySelector('[data-ph="done"]') && /Open in the Hub/.test(cC.innerText) && !cC.querySelector('[data-ph="take"]'), cC.innerHTML);
  ok('my own item: no Take it, says Yours', /Yours/.test(document.getElementById('ph_B').innerText) && !document.getElementById('ph_B').querySelector('[data-ph="take"]'));
  /* Take it */
  window.__RPC=[]; cA().querySelector('[data-ph="take"]').click(); await sleep(250);
  const sa=window.__STORE.find(x=>x.id==='A');
  ok('Take it: read fresh, then saved through the Hub\'s own save, owner is me with the history kept', window.__RPC.length===1 && window.__RPC[0][0]==='upsert_app_data_item' && sa.owner===ME_E && Array.isArray(sa.owner_history) && sa.owner_history.length===1 && sa.owner_history[0].how==='took', [window.__RPC, sa]);
  ok('...the event record says who took it', window.__EV.some(e=>e.verb==='item_claimed' && e.item_id==='A' && e.actor_email===ME_E), window.__EV);
  ok('...the phone says so and the card now says Yours', /It’s yours now/.test(document.getElementById('phMsg').innerText) && /Yours/.test(cA().innerText), document.getElementById('phMsg').innerText);
  /* Note */
  window.__RPC=[]; window.__EV=[];
  cA().querySelector('[data-ph="note"]').click(); await sleep(80);
  let sh=document.querySelector('.ph-sheet'); ok('Note opens a sheet', !!sh);
  sh.querySelector('[data-x="go"]').click(); await sleep(60);
  ok('...a note needs words (nothing saved when empty)', !!document.querySelector('.ph-sheet') && window.__RPC.length===0);
  document.getElementById('phSheetText').value='10 min out, client told'; document.querySelector('.ph-sheet [data-x="go"]').click(); await sleep(250);
  const na=window.__STORE.find(x=>x.id==='A');
  ok('...saved on the item\'s history, the item stays open', na.status==='open' && na.history.slice(-1)[0].text==='Note: 10 min out, client told' && window.__EV.some(e=>e.verb==='item_note'), na.history);
  /* Done */
  window.__RPC=[]; window.__EV=[];
  document.getElementById('ph_B').querySelector('[data-ph="done"]').click(); await sleep(80);
  document.getElementById('phSheetText').value='Called back, booked assessment'; document.querySelector('.ph-sheet [data-x="go"]').click(); await sleep(300);
  const sb_=window.__STORE.find(x=>x.id==='B');
  ok('Done: the Hub\'s own mark-done (closed by me, note kept, event recorded)', sb_.status==='done' && sb_.closed_by===ME_E && sb_.close_note==='Called back, booked assessment' && /Closed/.test(sb_.history.slice(-1)[0].text) && window.__EV.some(e=>e.verb==='item_resolved'), sb_);
  ok('...and it leaves the list', !document.getElementById('ph_B') && /DUE TODAY · 0/.test(txt()), txt());
  /* closed by someone else meanwhile */
  window.__STORE.find(x=>x.id==='A').status='done'; window.__RPC=[];
  cA().querySelector('[data-ph="done"]').click(); await sleep(60); document.querySelector('.ph-sheet [data-x="go"]').click(); await sleep(250);
  ok('already closed by someone else: nothing is saved over it, and the phone says so', window.__RPC.length===0 && /already closed by someone else/.test(document.getElementById('phMsg').innerText) && !document.getElementById('ph_A'), document.getElementById('phMsg').innerText);
  /* a save that fails */
  window.__STORE.push({ id:'F', kind:'missed_call', status:'open', title:'Call back: Ann', created_at:iso(-1), due:iso(-0.5) });
  await phRender(); document.getElementById('phRefresh').click(); await sleep(200);
  window.__FAILSAVE=true;
  document.getElementById('ph_F').querySelector('[data-ph="take"]').click(); await sleep(300);
  ok('a save that does not go through says so in red (never silent)', document.getElementById('phMsg').className.includes('bad') && /Not saved yet/.test(document.getElementById('phMsg').innerText), document.getElementById('phMsg').innerText);
  window.__FAILSAVE=false;
  /* sign-in on the phone skips the computer-only sign-in work */
  ok('opening the phone never ran the sign-in work', window.__SIW===0);
  window.hasHubAccess=()=>true; const realLoad=window.loadAllData; window.loadAllData=async()=>{};
  sb.auth.signInWithPassword=async()=>({ data:{ user:{ email:ME_E } }, error:null });
  document.getElementById('loginEmail').value=ME_E; document.getElementById('loginPassword').value='x';
  try{ localStorage.removeItem('cc_phone_signed_in_at'); }catch(e){}
  await signIn(); await sleep(100);
  ok('signing in on the phone: no sign-in work, the 14-day clock starts', window.__SIW===0 && Number(localStorage.getItem('cc_phone_signed_in_at'))>Date.now()-60000);
  /* 14 days */
  localStorage.setItem('cc_phone_signed_in_at', String(Date.now()-15*864e5)); window.__SIGNOUT=0;
  const g1=await phGate();
  ok('after 14 days the phone signs out and asks again', g1===false && window.__SIGNOUT===1 && /every 14 days/.test(document.getElementById('loginError').innerText));
  localStorage.setItem('cc_phone_signed_in_at', String(Date.now()-3*864e5)); window.__SIGNOUT=0;
  ok('...within 14 days it stays signed in', (await phGate())===true && window.__SIGNOUT===0);
  phStart(); await sleep(100);
  ok('fits a phone screen: nothing wider than the screen', document.documentElement.scrollWidth<=window.innerWidth+1, [document.documentElement.scrollWidth, window.innerWidth]);
  return R;
}
"""
D = r"""
async()=>{ const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,300)]);
  ok('the computer Hub (no ?m=1) is unchanged: no phone mode, no phone screen', window.CC_PHONE===false && !document.documentElement.classList.contains('ccphone') && !document.getElementById('phApp'));
  ok('...and the Hub\'s Done is the same one (opsClose uses opsCloseCommit)', /opsCloseCommit\(it, note, outcome\)/.test(opsClose.toString()));
  return R; }
"""
with sync_playwright() as pw:
    b = pw.chromium.launch()
    pg = b.new_page(viewport={'width': 375, 'height': 812}, device_scale_factor=2)
    pg.route('**/*', lambda r: r.abort() if ('supabase.co' in r.request.url or 'leadconnectorhq' in r.request.url or 'hub.mo-care.com' in r.request.url) else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?m=1'); pg.wait_for_timeout(1500)
    R = pg.evaluate(T)
    pg.screenshot(path='tests/browser/phone_needs_me.png')
    d = b.new_page(); d.route('**/*', lambda r: r.abort() if ('supabase.co' in r.request.url or 'leadconnectorhq' in r.request.url or 'hub.mo-care.com' in r.request.url) else r.continue_())
    d.goto('http://localhost:8765/index.html'); d.wait_for_timeout(1200)
    R += d.evaluate(D)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, dd in R: print(s_, '·', n, '' if s_ == 'PASS' else dd)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

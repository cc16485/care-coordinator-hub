"""Up for grabs (2026-10-13): put a task out for anyone with time. The real page, offline, made-up people and items only;
saves are recorded, never sent; nobody is texted or emailed. (python3 tests/browser/pool_look.py, with the static server on 8765)"""
from playwright.sync_api import sync_playwright
STUB = r"""
(()=>{
  const W=window, H=h=>new Date(Date.now()+h*36e5).toISOString();
  W.__log={ writes:[], fn:[], toasts:[], events:[], alerts:[] }; W.__store={ ops_items:null };
  const K='krystal@mo-care.com', S='samantha@mo-care.com', A='angiel@mo-care.com';
  const clone=x=>JSON.parse(JSON.stringify(x));
  /* the "database" copy of ops_items is what TP.take reads first; null = same as this page */
  (0,eval)(`sb={ from:()=>{ const st={key:null}; const p={ select(){return p;}, eq(c,v){ if(c==='key') st.key=v; return p; },
      single:async()=>({ data:{ data: JSON.parse(JSON.stringify(window.__store.ops_items||DATA.ops_items)) }, error:null }),
      maybeSingle:async()=>({ data:null, error:null }),
      then(a){ return Promise.resolve({data:[],error:null}).then(a); } }; return p; },
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async(n)=>{ window.__log.fn.push(n); return {data:null,error:null}; } },
    auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };
    OPS_PEOPLE=[{ person_id:'p_k', full_name:'Krystal Land', primary_email:'${K}' },{ person_id:'p_s', full_name:'Samantha Troutman', primary_email:'${S}' },{ person_id:'p_a', full_name:'Angiel Test', primary_email:'${A}' }];`);
  W.persist=async(k,v)=>{ W.__log.writes.push(k+':'+v.id); };
  W.opEvent=(v,o)=>W.__log.events.push(v+':'+(o&&o.summary||''));
  W.ccOpsRefresh=()=>{}; W.ccRecentFetch=async()=>{}; W.ccToast=m=>W.__log.toasts.push(m); W.alert=m=>W.__log.alerts.push(m);
  DATA.handoffs=[]; DATA.duty_windows=[]; DATA.ops_settings={};
  DATA.ops_items=[
    { id:'mine1', kind:'request', status:'open', title:'Call the Medicaid office about Dana (fake)', owner:S, owner_name:'Samantha Troutman', due:H(30), created_at:H(-1) },
    { id:'mine2', kind:'request', status:'open', title:'Order gloves (fake)', owner:S, owner_name:'Samantha Troutman', due:H(1), created_at:H(-1) },
    { id:'kwork', kind:'request', status:'open', title:'Krystal own thing (fake)', owner:K, owner_name:'Krystal Land', due:H(200), created_at:H(-1) } ];
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, it=id=>DATA.ops_items.find(x=>x.id===id), mw=()=>document.getElementById('tab-mywork').innerText;
  const as=(e,n)=>(0,eval)("ME={ email:'"+e+"', name:'"+n+"', shift:'day' };");
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  as('samantha@mo-care.com','Samantha Troutman');
  switchTab('mywork'); myWorkGo('today'); await sleep(300);
  ok('My Work has an Up for grabs tab', [...document.querySelectorAll('#myWorkTabs .subtab')].some(t=>/Up for grabs/.test(t.textContent)));

  /* ── the Add work form ── */
  opsToggleAdd(); await sleep(50);
  const own=document.getElementById('opsNewOwner');
  ok('Who owns it offers "Up for grabs (anyone with time)"', [...own.options].some(o=>o.value==='__pool' && /Up for grabs/.test(o.text)));
  ok('size and come-back are hidden until Up for grabs is picked', document.getElementById('opsNewPoolWrap').style.display==='none');
  own.value='__pool'; own.onchange(); await sleep(30);
  document.getElementById('opsNewDue').value='tomorrow'; TP.formSync();
  ok('picking it shows About how long and when it comes back', document.getElementById('opsNewPoolWrap').style.display!=='none' && /If nobody takes it by tomorrow .* it comes back to you\./.test(document.getElementById('opsNewPoolBack').textContent), document.getElementById('opsNewPoolBack').textContent);
  document.getElementById('opsNewPoolSize').value='15m'; TP.formSync();
  ok('the come-back time follows the size (15 min: an hour before the office closes on the due day)', /tomorrow 4:00 PM/.test(document.getElementById('opsNewPoolBack').textContent), document.getElementById('opsNewPoolBack').textContent);
  document.getElementById('opsNewTitle').value='Update the binder index (fake)';
  document.getElementById('opsNewDetail').value='Just the tabs';
  L.writes.length=0; await opsAdd(); await sleep(100);
  const nw=DATA.ops_items.find(x=>x.title==='Update the binder index (fake)');
  ok('it is saved as Samantha\'s, offered, with the size and come-back time', nw && nw.owner==='samantha@mo-care.com' && nw.pool && nw.pool.size==='15m' && nw.pool.by==='samantha@mo-care.com' && new Date(nw.pool.back_at).getHours()===16 && L.writes.includes('ops_items:'+nw.id), nw);
  ok('...and it is off her own lists, in OFFERED TO THE TEAM with Take it back', !myWorkBuckets().mine.some(i=>i.id===nw.id) && /OFFERED TO THE TEAM/.test(mw()) && /Update the binder index \(fake\)/.test(mw()) && /nobody has taken it yet/.test(mw()) && /Take it back/.test(mw()), mw().slice(0,900));
  ok('Samantha does not see her own offer on the shelf', !TP.shelf().some(i=>i.id===nw.id));

  /* ── offering from the ⋯ menu ── */
  const mb=document.querySelector('[data-id="mine1"] .wkmore')||(()=>{ myWorkGo('mine'); return document.querySelector('[data-id="mine1"] .wkmore'); })();
  myWorkMore('mine1', mb.id); await sleep(50);
  const pr=[...document.querySelectorAll('.ccpick-row')].find(r=>/Put it up for grabs/.test(r.textContent));
  ok('the ⋯ menu on her own card offers "Put it up for grabs"', !!pr);
  pr.click(); await sleep(50);
  const pop=[...document.querySelectorAll('.ccpop')].pop();
  ok('it asks how long, and says when it comes back', /About how long/.test(pop.innerText) && /comes back to you/.test(pop.innerText), pop.innerText);
  pop.querySelector('#tpSize').value='half'; pop.querySelector('#tpSize').onchange();
  pop.querySelector('#tpGo').click(); await sleep(100);
  ok('offered: half a day, back 4 hours before it is due', it('mine1').pool && it('mine1').pool.size==='half' && Date.parse(it('mine1').pool.back_at)===Date.parse(it('mine1').due)-4*36e5 && L.events.some(e=>/^item_pool_offered:Samantha Troutman put/.test(e)));
  /* due within the hour: too soon */
  myWorkGo('today'); await sleep(50);
  const mb2=document.querySelector('[data-id="mine2"] .wkmore'); myWorkMore('mine2', mb2.id); await sleep(30);
  [...document.querySelectorAll('.ccpick-row')].find(r=>/Put it up for grabs/.test(r.textContent)).click(); await sleep(30);
  const pop2=[...document.querySelectorAll('.ccpop')].pop();
  ok('something due within the hour says it is too soon', /too soon/.test(pop2.innerText), pop2.innerText);
  pop2.querySelector('#tpGo').click(); await sleep(30);
  ok('...and is not offered', !it('mine2').pool && L.alerts.some(a=>/too soon/.test(a)));
  ccPopClose && ccPopClose();

  /* ── Krystal's side ── */
  as('krystal@mo-care.com','Krystal Land');
  myWorkGo('pool'); await sleep(100);
  const tab=[...document.querySelectorAll('#myWorkTabs .subtab')].find(t=>/Up for grabs/.test(t.textContent));
  ok('Krystal sees a count of 2 on Up for grabs', /Up for grabs\s*2/.test(tab.textContent), tab.textContent);
  ok('the shelf lists both, with size, who offered it, and I\'ll take it', /Update the binder index \(fake\)/.test(mw()) && /15 min/.test(mw()) && /from Samantha/.test(mw()) && /half a day/.test(mw()) && document.querySelectorAll('#myWorkWrap .tp-card button').length===2, mw().slice(0,900));
  ok('the shelf cards have no tick boxes or close keys', myWorkRows().length===0);
  /* caught up: Krystal's own work is next week, nothing urgent or due today */
  myWorkGo('today'); await sleep(100);
  ok('Today: Krystal is caught up, so the shelf comes to her', /You're caught up\. Can you help with one of these\?/.test(mw()) && mw().indexOf('caught up')<mw().indexOf('ACT NOW'), mw().slice(0,600));
  /* someone else (Angiel) took mine1 a moment ago: the database copy says so */
  window.__store.ops_items=JSON.parse(JSON.stringify(DATA.ops_items)); const db1=window.__store.ops_items.find(x=>x.id==='mine1');
  db1.pool.taken_by='angiel@mo-care.com'; db1.pool.taken_by_name='Angiel Test'; db1.pool.taken_at=new Date().toISOString(); db1.owner='angiel@mo-care.com';
  L.writes.length=0; await TP.take('mine1'); await sleep(100);
  ok('taking one Angiel just took: told so, nothing saved, Krystal does not get it', L.toasts.some(t=>/Angiel just took that one/.test(t)) && !L.writes.length && it('mine1').owner==='angiel@mo-care.com', [L.toasts, L.writes]);
  window.__store.ops_items=null;
  await TP.take(nw.id); await sleep(150);
  const t1=it(nw.id);
  ok('I\'ll take it: it is Krystal\'s now, with who and when on the record', t1.owner==='krystal@mo-care.com' && t1.pool.taken_by==='krystal@mo-care.com' && !!t1.pool.taken_at && (t1.history||[]).some(h=>/Took it from Up for grabs/.test(h.text)) && L.writes.includes('ops_items:'+nw.id), t1);
  ok('...the record of what happened says so', L.events.some(e=>/^item_pool_taken:Krystal Land took Update the binder index \(fake\) from Up for grabs \(offered by Samantha\)/.test(e)), L.events);
  ok('Krystal is thanked, and told Samantha will see it', L.toasts.some(t=>/Thanks for helping! Samantha will see you took it\./.test(t)), L.toasts);
  ok('...and it is on her own list, off the shelf', myWorkBuckets().mine.some(i=>i.id===nw.id) && !TP.shelf().some(i=>i.id===nw.id));

  /* ── Samantha sees who took it ── */
  as('samantha@mo-care.com','Samantha Troutman'); myWorkGo('today'); await sleep(100);
  ok('Samantha\'s Today: "Krystal took ..." (the quiet notice, nothing sent)', /✓ Krystal took “Update the binder index \(fake\)”/.test(mw()), mw().slice(0,1200));

  /* ── nobody takes it in time: it comes back ── */
  const back={ id:'old', kind:'request', status:'open', title:'Shred old files (fake)', owner:'samantha@mo-care.com', owner_name:'Samantha Troutman', due:new Date(Date.now()+30*60000).toISOString(), created_at:new Date(Date.now()-5*36e5).toISOString(),
    pool:{ by:'samantha@mo-care.com', by_name:'Samantha Troutman', size:'1h', offered_at:new Date(Date.now()-4*36e5).toISOString(), back_at:new Date(Date.now()-90*60000).toISOString() } };
  DATA.ops_items.push(back); myWorkGo('today'); await sleep(100);
  ok('past its come-back time, nobody took it: it is back on her Today with a note', myWorkBuckets().mine.some(i=>i.id==='old') && /nobody took it from Up for grabs, back with you/.test(mw()) && !TP.shelf('krystal@mo-care.com').some(i=>i.id==='old'), mw().slice(0,900));

  /* ── Take it back ── */
  const again={ id:'tb', kind:'request', status:'open', title:'Restock the welcome folders (fake)', owner:'samantha@mo-care.com', owner_name:'Samantha Troutman', due:new Date(Date.now()+48*36e5).toISOString(), created_at:new Date().toISOString() };
  DATA.ops_items.push(again); TP.stamp(again,'1h'); myWorkGo('today'); await sleep(50);
  await TP.withdraw('tb'); await sleep(50);
  ok('Take it back: on her list again, off the shelf', !!it('tb').pool.withdrawn_at && myWorkBuckets().mine.some(i=>i.id==='tb') && !TP.shelf('krystal@mo-care.com').some(i=>i.id==='tb') && L.toasts.includes('Back on your list'));

  /* ── End my shift mentions it ── */
  TP.stamp(it('tb'), '1h'); it('tb').pool.withdrawn_at=undefined; TP.stamp(it('tb'),'1h');
  as('krystal@mo-care.com','Krystal Land');
  const eb=[...document.querySelectorAll('header.topbar button')].find(b=>/End my shift/.test(b.textContent)); eoOpen(eb); await sleep(150);
  const ep=[...document.querySelectorAll('.ccpop')].pop().innerText;
  ok('End my shift tells Krystal what is up for grabs', /1 up for grabs from the team/.test(ep), ep.slice(0,800));
  ccPopClose();
  ok('nothing was texted, emailed or called', L.fn.length===0, L.fn);
  return R;
}
"""
with sync_playwright() as pw:
    import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from clock_pin import pin  # tests/browser/clock_pin.py: same answer at any hour
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1360, 'height': 900})
    pin(pg)
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=pool'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

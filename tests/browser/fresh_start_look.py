"""Fresh start (Samantha, 2026-10-05): clear past-due work so the office starts clean. The real page, offline, made-up
items only; saves are recorded, never sent; nobody is texted or emailed. (python3 tests/browser/fresh_start_look.py,
with the static server on 8765)"""
from playwright.sync_api import sync_playwright
STUB = r"""
(()=>{
  const W=window, H=h=>new Date(Date.now()+h*36e5).toISOString();
  const chi=d=>new Date(Date.now()+d*864e5).toLocaleDateString('en-CA',{timeZone:'America/Chicago'});
  W.__log={ writes:[], fn:[], toasts:[], merges:[] };
  const K='krystal@mo-care.com', S='samantha@mo-care.com';
  const clone=x=>JSON.parse(JSON.stringify(x));
  (0,eval)(`sb={ from:()=>{ const p={ select(){return p;}, eq(){ return p; }, maybeSingle:async()=>({data:null,error:null}),
      then(a){ return Promise.resolve({data:[],error:null}).then(a); } }; return p; },
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async(n)=>{ window.__log.fn.push(n); return {data:null,error:null}; } },
    auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };
    CC_ROLE_BY_EMAIL['${S}']=['owner_admin']; CC_ROLE_BY_EMAIL['${K}']=['staffing'];`);
  W.persist=async(k,v)=>{ W.__log.writes.push(k+':'+v.id+':'+v.status); };
  W.tkMerge=async(fn,what)=>{ const m=clone(DATA.ops_settings||{}); const ch=fn(m)||[]; DATA.ops_settings=m; W.__log.merges.push(what); return { changed:ch, error:null }; };
  W.opEvent=(v,o)=>W.__log.fn.push('event:'+v+':'+(o&&o.summary||''));
  W.ccOpsRefresh=()=>{}; W.ccRecentFetch=async()=>{}; W.ccToast=m=>W.__log.toasts.push(m);
  DATA.ops_settings={ coverage_alert_admins:[S,K] };
  DATA.coverage_cases=[ { id:'cOpen', status:'open', client:'Ruth A. (fake)', shift_date:chi(0), shift_time:'09:00-13:00' },
                        { id:'cDone', status:'done', client:'Ted B. (fake)', shift_date:chi(-2), shift_time:'09:00-13:00' } ];
  DATA.ops_items=[
    { id:'l1', kind:'lead_followup', status:'open', about:'Call the Smiths back (fake)', owner:S, due:H(-50), created_at:H(-90) },
    { id:'l2', kind:'lead_followup', status:'open', about:'Call the Joneses back (fake)', owner:'', due:H(-30), created_at:H(-90) },
    { id:'p1', kind:'promise_update', status:'open', about:'Promise to Betsy (fake)', owner:K, due:H(-5), created_at:H(-30),
      escalation:{ to:S, to_name:'Samantha', level:'overdue', why:'it is overdue', at:H(-4) } },
    { id:'cv1', kind:'coverage', status:'open', about:'Uncovered shift, Ruth (fake)', coverage_case_id:'cOpen', owner:K, due:H(-1), created_at:H(-3) },
    { id:'cv2', kind:'coverage', status:'open', about:'Uncovered shift, Ted (fake)', coverage_case_id:'cDone', owner:K, due:H(-40), created_at:H(-60) },
    { id:'ops_ref_77', kind:'reference', status:'open', about:'References still out (fake)', owner:K, due:H(-8), created_at:H(-40) },
    { id:'fut', kind:'promise_update', status:'open', about:'Not due yet (fake)', owner:K, due:H(20), created_at:H(-3) },
    { id:'park', kind:'promise_update', status:'open', about:'Parked with a wake-up (fake)', owner:K, due:H(-10), sub_state:'waiting', check_back:chi(3), created_at:H(-30) },
    { id:'dn', kind:'promise_update', status:'done', about:'Already done (fake)', owner:K, due:H(-100), created_at:H(-200) },
    { id:'nodue', kind:'client_issue', status:'open', about:'No due date (fake)', owner:K, created_at:H(-100) } ];
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, it=id=>DATA.ops_items.find(x=>x.id===id);
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Land', shift:'day' };");
  freshRender();
  ok('not an owner: the Fresh start card is hidden', document.getElementById('freshSection').style.display==='none');
  freshPreview(document.body); await sleep(100);
  ok('...and the button refuses', L.toasts.some(t=>/Only an owner/.test(t)) && !document.getElementById('freshGo'));
  (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha Troutman', shift:'day' };");
  freshRender();
  ok('owner: the card shows, with how many are past due now', document.getElementById('freshSection').style.display==='' && /6 items are past due right now\./.test(document.getElementById('freshSet').innerText), document.getElementById('freshSet').innerText);
  ok('past due only: not the future one, the parked one, the done one or the one with no due date', freshCandidates().map(x=>x.it.id).sort().join()==='cv1,cv2,l1,l2,ops_ref_77,p1', freshCandidates().map(x=>x.it.id));
  ok('no Undo before anything was cleared', document.getElementById('freshUndoBtn').style.display==='none');
  freshPreview(document.getElementById('freshSet')); await sleep(150);
  const pop=[...document.querySelectorAll('.ccpop')].pop(), txt=pop.innerText;
  ok('the preview counts and splits by whose', /Fresh start: 6 past-due items/.test(txt) && /1 yours · 1 with no owner · 4 other people’s/.test(txt), txt.slice(0,300));
  const grp=[...pop.querySelectorAll('.freshGrp')].map(x=>({ on:x.checked, t:x.closest('div').innerText }));
  ok('grouped by type with counts and examples', grp.length===4 && grp.some(g=>/Lead|lead/.test(g.t) && /2/.test(g.t) && /Call the Smiths back/.test(g.t)), grp);
  const comes=grp.find(g=>/Come back by themselves/.test(g.t));
  ok('things a job would reopen (open-case shift, outstanding references) are their own group, unticked', comes && !comes.on && /Ruth/.test(comes.t) && /References still out/.test(comes.t) && !/Ted/.test(comes.t), grp);
  ok('everything else starts ticked', grp.filter(g=>g!==comes).every(g=>g.on));
  ok('the preview says nothing is sent and Undo works for 7 days', /Nothing is sent/.test(txt) && /7 days/.test(txt));
  /* keep the promises group */
  const promise=[...pop.querySelectorAll('.freshGrp')].find(x=>/Promise to Betsy/.test(x.closest('div').innerText)); promise.checked=false;
  L.writes.length=0; pop.querySelector('#freshGo').click(); await sleep(400);
  ok('ticked items closed: both leads and the finished-case shift card', ['l1','l2','cv2'].every(id=>it(id).status==='done'), DATA.ops_items.map(x=>x.id+':'+x.status));
  ok('kept: the unticked promise, the open-case shift card and the references card', it('p1').status==='open' && it('cv1').status==='open' && it('ops_ref_77').status==='open');
  ok('untouched: future, parked, already done, no due date', it('fut').status==='open' && it('park').status==='open' && it('nodue').status==='open' && !it('dn').fresh_start);
  const l1=it('l1');
  ok('closed WITH a note, a reason code, who and when (not deleted)', l1.resolution_code==='fresh_start' && /^Fresh start \d{4}-\d\d-\d\d: past due, cleared without action$/.test(l1.close_note) && l1.closed_by==='samantha@mo-care.com' && !!l1.closed_at && l1.history.slice(-1)[0].text==='Cleared in the fresh start (it was past due)' && DATA.ops_items.length===10, l1);
  ok('each closed item saved one at a time', L.writes.sort().join()==='ops_items:cv2:done,ops_items:l1:done,ops_items:l2:done', L.writes);
  const last=DATA.ops_settings.fresh_start_last;
  ok('the batch is recorded for Undo (who, when, which)', last && last.ids.sort().join()==='cv2,l1,l2' && last.by==='samantha@mo-care.com' && /^fs_/.test(last.id), last);
  ok('it is in the record of what happened', L.fn.some(f=>/^event:fresh_start:Samantha Troutman cleared 3 past-due items/.test(f)), L.fn);
  ok('she is told how many and where Undo is', L.toasts.some(t=>/3 past-due items cleared\. Undo is in Settings for 7 days\./.test(t)), L.toasts);
  freshRender();
  ok('Settings now offers Undo and shows the last fresh start', document.getElementById('freshUndoBtn').style.display==='' && /3 closed/.test(document.getElementById('freshSet').innerText), document.getElementById('freshSet').innerText);
  /* someone reopens one by hand meanwhile; Undo must only reopen what is still closed by this fresh start */
  it('l2').status='open'; it('l2').owner=''; delete it('l2').fresh_start; it('l2').note_by_hand='x';
  L.writes.length=0; await freshUndo(document.getElementById('freshUndoBtn')); await sleep(100);
  ok('Undo reopens exactly what it closed', it('l1').status==='open' && it('cv2').status==='open' && !it('l1').resolution_code && !it('l1').close_note && !it('l1').closed_at && it('l1').history.slice(-1)[0].text==='Fresh start undone; open again');
  ok('...and does not touch one someone already handled by hand', !L.writes.some(w=>/:l2:/.test(w)) && it('l2').note_by_hand==='x', L.writes);
  ok('after Undo the button goes away and the record says undone', !!DATA.ops_settings.fresh_start_last.undone_at && document.getElementById('freshUndoBtn').style.display==='none' && /\(undone\)/.test(document.getElementById('freshSet').innerText));
  ok('nothing was texted, emailed or called', !L.fn.some(f=>!/^event:/.test(f)), L.fn);
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1360, 'height': 900})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=fresh'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

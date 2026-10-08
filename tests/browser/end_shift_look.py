"""Today cockpit, Phase 5: End My Shift. The real page, offline, made-up people and items only; saves are recorded,
never sent; nobody is texted or emailed. (python3 tests/browser/end_shift_look.py, with the static server on 8765)"""
from playwright.sync_api import sync_playwright
STUB = r"""
(()=>{
  const W=window, H=h=>new Date(Date.now()+h*36e5).toISOString();
  W.__log={ writes:[], fn:[], toasts:[], events:[] }; W.__store={ handoffs:[], standup_notes:[], team_meetings:[] };
  const K='krystal@mo-care.com', S='samantha@mo-care.com';
  const clone=x=>JSON.parse(JSON.stringify(x));
  (0,eval)(`sb={ from:()=>{ const st={key:null}; const p={ select(){return p;}, eq(c,v){ if(c==='key') st.key=v; return p; },
      maybeSingle:async()=>({ data: window.__store[st.key]?{data:JSON.parse(JSON.stringify(window.__store[st.key]))}:null, error:null }),
      then(a){ return Promise.resolve({data:[],error:null}).then(a); } }; return p; },
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async(n)=>{ window.__log.fn.push(n); return {data:null,error:null}; } },
    auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };
    OPS_PEOPLE=[{ person_id:'p_k', full_name:'Krystal Land', primary_email:'${K}' },{ person_id:'p_s', full_name:'Samantha Troutman', primary_email:'${S}' }];`);
  W.persist=async(k,v)=>{ W.__log.writes.push(k+':'+v.id); const a=W.__store[k]=W.__store[k]||[]; const i=a.findIndex(x=>x.id===v.id); if(i>=0) a[i]=clone(v); else a.push(clone(v)); };
  W.opEvent=(v,o)=>W.__log.events.push(v+':'+(o&&o.summary||''));
  W.ccOpsRefresh=()=>{}; W.ccRecentFetch=async()=>{}; W.ccToast=m=>W.__log.toasts.push(m); W.reviewMaybeCreate=async()=>{};
  W.roleEveryone=()=>[{ email:K, name:'Krystal Land' },{ email:S, name:'Samantha Troutman' }];
  DATA.positions=[]; DATA.handoffs=[];
  DATA.ops_settings={ coverage_alert_admins:[S,K], duty_default_operations:S, duty_default_staffing:S, duty_default_owner_escalation:S };
  /* Krystal holds Operations and Staffing for the next 30 minutes, then nobody is scheduled (Samantha). */
  const hm=h=>new Date(Date.now()+h*36e5).toLocaleTimeString('en-GB',{timeZone:'America/Chicago',hour:'2-digit',minute:'2-digit'});
  const win=a=>({ id:'w_'+a, area:a, person:K, status:'live', active:true, start:H(-6), end:H(0.5) });
  DATA.duty_windows=[win('operations'), win('staffing')];
  DATA.ops_items=[
    { id:'cov', kind:'coverage', domain:'scheduling_coverage', status:'open', about:'Ruth 4pm shift has nobody (fake)', owner:K, urgency:'urgent', due:H(1), created_at:H(-1) },
    { id:'call', kind:'promise_update', status:'open', about:'Call Betsy\'s daughter back (fake)', owner:K, due:H(2), created_at:H(-20) },
    { id:'evv', kind:'evv_fix', domain:'scheduling_coverage', status:'open', about:'Linda EVV correction (fake)', owner:K, due:H(-2), created_at:H(-5) },
    { id:'park', kind:'promise_update', status:'open', about:'Parked (fake)', owner:K, due:H(-1), sub_state:'waiting', check_back:new Date(Date.now()+3*864e5).toLocaleDateString('en-CA'), created_at:H(-30) },
    { id:'lat', kind:'client_issue', status:'open', about:'Next week thing (fake)', owner:K, due:H(100), created_at:H(-3) },
    { id:'hot', kind:'staffing_issue', domain:'scheduling_coverage', status:'open', about:'Tomorrow 7am shift uncovered (fake)', owner:'', urgency:'urgent', due:H(15), created_at:H(-1) },
    { id:'sam', kind:'promise_update', status:'open', about:'Samantha\'s own (fake)', owner:S, due:H(1), created_at:H(-1) } ];
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, S=window.__store, it=id=>DATA.ops_items.find(x=>x.id===id);
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Land', shift:'day' };");
  switchTab('mywork'); await sleep(300);
  const btn=[...document.querySelectorAll('#tab-mywork button')].find(b=>/End my shift/.test(b.textContent));
  ok('My Work has an End my shift button', !!btn);
  ok('next on duty: Samantha for both seats (Krystal is off in 30 minutes)', EOX.nextOnDuty('operations').person==='samantha@mo-care.com' && EOX.nextOnDuty('staffing').person==='samantha@mo-care.com');
  const Ls=eoLists();
  ok('it walks through what is still moving today, most urgent first', Ls.moving.map(i=>i.id).join()==='cov,evv,call', Ls.moving.map(i=>i.id));
  ok('parked and later work are counted, not listed', Ls.parked.length===1 && Ls.later.some(i=>i.id==='lat'));
  ok('needs attention: the urgent item nobody has', Ls.attention.map(i=>i.id).join()==='hot', Ls.attention.map(i=>i.id));
  eoOpen(btn); await sleep(150);
  const pop=[...document.querySelectorAll('.ccpop')].pop(), txt=pop.innerText;
  ok('the screen says who is next on duty', /Operations: Samantha Troutman/.test(txt) && /Staffing: Samantha Troutman/.test(txt), txt.slice(0,300));
  ok('says what happens: nobody texted, top of their Today until Got it', /Nobody is texted/.test(txt) && /Got it/.test(txt));
  const rows=[...pop.querySelectorAll('.eoRow')];
  const sel=id=>rows.find(r=>r.innerText.includes(it(id).about)).querySelector('.eoWhat');
  ok('the urgent shift defaults to Hand to Samantha; the rest stay', sel('cov').value==='hand' && sel('evv').value==='keep' && sel('call').value==='keep' && /Hand to Samantha \(Staffing\)/.test(sel('cov').innerText));
  ok('the urgent unowned item is listed for the handoff and the Stand-Up board', /NEEDS ATTENTION, NOBODY HAS IT · 1/.test(txt) && /Tomorrow 7am shift uncovered/.test(txt));
  rows.find(r=>r.innerText.includes(it('cov').about)).querySelector('.eoNote').value='Asked 4, waiting on Maria';
  sel('call').value='done'; rows.find(r=>r.innerText.includes(it('call').about)).querySelector('.eoNote').value='Called, all set';
  rows.find(r=>r.innerText.includes(it('evv').about)).querySelector('.eoNote').value='Waiting on Linda to sign';
  pop.querySelector('#eoGeneral').value='Quiet afternoon otherwise';
  L.writes.length=0; pop.querySelector('#eoGo').click(); await sleep(500);
  const cov=it('cov');
  ok('handed: the shift is Samantha\'s now, with "End of shift" and the note in its ownership history', cov.owner==='samantha@mo-care.com' && /End of shift: Asked 4, waiting on Maria/.test(cov.owner_history.slice(-1)[0].note) && cov.owner_history.slice(-1)[0].how==='handed', cov.owner_history);
  ok('done: closed with the note, Krystal\'s name on it', it('call').status==='done' && it('call').close_note==='Called, all set' && it('call').closed_by==='krystal@mo-care.com');
  ok('kept: stays Krystal\'s, the note on its record', it('evv').owner==='krystal@mo-care.com' && it('evv').history.slice(-1)[0].text==='End of shift note: Waiting on Linda to sign');
  ok('untouched: parked, later, someone else\'s, the unowned one', it('park').owner==='krystal@mo-care.com' && it('lat').owner==='krystal@mo-care.com' && it('sam').owner==='samantha@mo-care.com' && !it('hot').owner && it('hot').status==='open');
  const ho=S.handoffs;
  ok('one handoff, to Samantha, kept on the record', ho.length===1 && ho[0].to==='samantha@mo-care.com' && ho[0].from_name==='Krystal Land' && ho[0].kind==='end_of_shift' && !ho[0].ack_at, ho);
  ok('it lists the handed and kept items with notes, and the attention item', (()=>{ const i=ho[0].items; return i.length===3 && i.some(x=>x.ops_id==='cov'&&x.what==='handed'&&x.note==='Asked 4, waiting on Maria') && i.some(x=>x.ops_id==='evv'&&x.what==='kept') && i.some(x=>x.ops_id==='hot'&&x.what==='attention') && !i.some(x=>x.ops_id==='call'); })(), ho[0].items);
  ok('the urgent unowned item went on the Stand-Up board (urgent), once', S.standup_notes.length===1 && S.standup_notes[0].urgent && S.standup_notes[0].ops_item_id==='hot' && /nobody has it; from Krystal/.test(S.standup_notes[0].summary), S.standup_notes);
  ok('Krystal is told who got it and that nobody was texted', L.toasts.some(t=>/Handoff posted to Samantha\. Nobody was texted\./.test(t)), L.toasts);
  ok('the end of the shift is in the record of what happened', L.events.some(e=>/^shift_ended:Krystal Land ended their shift: handoff to Samantha Troutman \(1 handed, 1 done\)/.test(e)), L.events);
  ok('Krystal does not see her own handoff', !document.getElementById('hoCardWork').innerText.trim());
  /* ── Samantha's side ── */
  (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha Troutman', shift:'day' };");
  switchTab('today'); await sleep(400);
  const dash=document.getElementById('hoCardDash').innerText;
  ok('top of Samantha\'s Dashboard: the handoff from Krystal', /Handoff from Krystal Land/.test(dash) && /2 things still moving/.test(dash) && /Ruth 4pm shift has nobody \(fake\) \(now yours\): Asked 4, waiting on Maria/.test(dash) && /Linda EVV correction \(fake\) \(stays with Krystal\): Waiting on Linda to sign/.test(dash) && /1 needs attention, nobody has it/.test(dash) && /Quiet afternoon otherwise/.test(dash), dash);
  ok('it sits above the Stand-Up card', !!(document.getElementById('hoCardDash').compareDocumentPosition(document.getElementById('suTodayLine')) & Node.DOCUMENT_POSITION_FOLLOWING));
  switchTab('mywork'); await sleep(300);
  ok('and at the top of her My Work', /Handoff from Krystal Land/.test(document.getElementById('hoCardWork').innerText));
  /* her call 2026-10-07: what was handed sits above everything until Got it */
  const mw=()=>document.getElementById('tab-mywork').innerText;
  const lanesTxt=()=>[...document.querySelectorAll('#tab-mywork b')].map(b=>b.innerText).filter(t=>/^(FROM YOUR HANDOFF|ACT NOW|DUE TODAY)/.test(t));
  ok('the handed shift sits at the very top of her Today, in FROM YOUR HANDOFF, above Act Now', lanesTxt()[0]==='FROM YOUR HANDOFF · 1' && mw().indexOf('FROM YOUR HANDOFF')<mw().indexOf('ACT NOW') && mw().indexOf('Ruth 4pm shift has nobody')<mw().indexOf('ACT NOW'), [lanesTxt(), mw().slice(0,600)]);
  const list=()=>mw().replace(document.getElementById('hoCardWork').innerText,'');
  ok('...and only once in the list (not repeated in Act Now; the handoff note above also names it)', list().split('Ruth 4pm shift has nobody').length===2, list().split('Ruth 4pm shift has nobody').length);
  await hoAck(ho[0].id); await sleep(150);
  ok('after Got it it drops back into its usual lane (Act Now: urgent), and the handoff section is gone', !/FROM YOUR HANDOFF/.test(mw()) && mw().indexOf('Ruth 4pm shift has nobody')>mw().indexOf('ACT NOW') && mw().indexOf('Ruth 4pm shift has nobody')<mw().indexOf('DUE TODAY'), mw().slice(0,600));
  ok('Got it: marked seen with her name, and it leaves her Today', !!S.handoffs[0].ack_at && S.handoffs[0].ack_by==='Samantha Troutman' && !document.getElementById('hoCardWork').innerText.trim() && L.events.some(e=>/^handoff_seen:Samantha Troutman saw Krystal Land/.test(e)));
  /* ── nobody else on duty: nothing handed ── */
  DATA.ops_settings.duty_default_operations='samantha@mo-care.com'; DATA.duty_windows=[];
  ok('when Samantha ends her day and nobody else is ever on duty, nothing is handed to herself', EOX.nextOnDuty('operations')===null || EOX.nextOnDuty('operations').person!=='samantha@mo-care.com');
  ok('nothing was texted, emailed or called', L.fn.length===0, L.fn);
  return R;
}
"""
with sync_playwright() as pw:
    import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from clock_pin import pin  # tests/browser/clock_pin.py: same answer at any hour
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1360, 'height': 900})
    pin(pg)  # same answer at any hour (tests/browser/clock_pin.py)
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=endshift'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

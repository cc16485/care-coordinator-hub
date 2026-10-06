"""My Desk, Stage 4: the Stand-Up tray (through the real Stand-Up board and Prepare Stand-Up), the Stand-Up schedule in
Team Meetings, "Jot on my desk" in + Add, the desk step in End My Shift and the ribbon, and the Friday card. The real Hub
page, offline, made-up people and lines; the desk and the Hub lists are pretend stores. Nothing is saved or sent.
(python3 tests/browser/my_desk_stage4_look.py, with the static server on 8765)"""
from playwright.sync_api import sync_playwright
STUB = r"""
(()=>{
  const W=window, clone=x=>JSON.parse(JSON.stringify(x));
  W.__fn=[]; W.__calls=[]; W.__merge=[];
  (0,eval)(`sb={ from:()=>{ const p={ select(){return p;}, eq(){return p;}, maybeSingle:async()=>({data:null,error:null}), then(a){ return Promise.resolve({data:[],error:null}).then(a); } }; return p; },
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async(n)=>{ window.__fn.push(n); return {data:null,error:null}; } },
    auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };`);
  W.ccMergeSave=async(key, apply)=>{ const m=clone(DATA.ops_settings||{}); const ch=apply(m); W.__merge.push({key, m, ch}); DATA.ops_settings=m; return { changed:ch||[], error:null }; };
  W.opEvent=()=>{};
  W.roleEveryone=()=>[{ email:'krystal@mo-care.com', name:'Krystal Land' },{ email:'samantha@mo-care.com', name:'Samantha Troutman' },{ email:'angiel@mo-care.com', name:'Angiel Falig' }];
  (0,eval)("CC_ROLE_BY_EMAIL={ 'krystal@mo-care.com':['care_coordinator'], 'samantha@mo-care.com':['owner_admin'] }; CC_ROLES_CHECKED=true;");
  DATA.ops_settings={ desk_access:{ mode:'some', people:['samantha@mo-care.com','krystal@mo-care.com'] } };
  DATA.role_profiles=[{ id:'angiel@mo-care.com', title:'Care Coordinator (Medicaid & VA)' }];
  /* the pretend desk database: rows, versions, and a switch to pretend another screen changed a row */
  const db=W.__db={ desk_lines:[], desk_stickies:[], desk_settings:[], desk_pages:[] };
  W.__conflict=false;
  W.__fakeStore={
    async me(){ W.__calls.push('me'); return 'p_k'; },
    async load(){ W.__calls.push('load'); return { lines:clone(db.desk_lines.filter(l=>!l.erased_at)), stickies:clone(db.desk_stickies.filter(s=>!s.erased_at)), settings:clone(db.desk_settings[0]||null), pages:clone(db.desk_pages) }; },
    async insert(t,row){ W.__calls.push('insert:'+t); const r=Object.assign({ rev:1 }, clone(row)); db[t].push(r); return clone(r); },
    async update(t,id,rev,patch){ W.__calls.push('update:'+t); if(W.__conflict){ W.__conflict=false; return null; } const r=db[t].find(x=>x.id===id); if(!r||r.rev!==rev) return null; Object.assign(r, clone(patch)); r.rev++; return clone(r); },
    async loadDays(){ return { lines:[], pages:[] }; },
    async visits(){ return []; },
    async remove(t,id){ db[t]=db[t].filter(x=>x.id!==id); return true; },
    async saveSettings(row){ W.__calls.push('settings'); db.desk_settings=[Object.assign(db.desk_settings[0]||{}, clone(row))]; return true; },
    async savePage(row){ W.__calls.push('page'); const i=db.desk_pages.findIndex(p=>p.day===row.day); if(i>=0) db.desk_pages[i]=Object.assign(db.desk_pages[i], row); else db.desk_pages.push(clone(row)); return true; }
  };
})();
"""
EXTRA = r"""
(()=>{
  const W=window, clone=x=>JSON.parse(JSON.stringify(x));
  W.__store={ standup_notes:[], team_meetings:[], handoffs:[] }; W.__persist=[];
  (0,eval)(`sb={ from:(t)=>{ const st={key:null}; const p={ select(){return p;}, eq(c,v){ if(c==='key') st.key=v; return p; },
      maybeSingle:async()=>({ data: window.__store[st.key]?{data:JSON.parse(JSON.stringify(window.__store[st.key]))}:null, error:null }),
      then(a){ return Promise.resolve({data:[],error:null}).then(a); } }; return p; },
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async(n)=>{ window.__fn.push(n); return {data:null,error:null}; } },
    auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };
    OPS_PEOPLE=[{ person_id:'p_k', full_name:'Krystal Land', primary_email:'krystal@mo-care.com' },{ person_id:'p_s', full_name:'Samantha Troutman', primary_email:'samantha@mo-care.com' }];`);
  W.persist=async(k,v)=>{ W.__persist.push(k+':'+v.id); const a=W.__store[k]=W.__store[k]||[]; const i=a.findIndex(x=>x.id===v.id); if(i>=0) a[i]=clone(v); else a.push(clone(v)); };
  W.ccOpsRefresh=()=>{}; W.ccRecentFetch=async()=>{}; W.reviewMaybeCreate=async()=>{}; W.myWorkRefresh=()=>{};
  DATA.ops_items=[]; DATA.handoffs=[]; DATA.duty_windows=[]; DATA.positions=[];
  DATA.ops_settings=Object.assign(DATA.ops_settings||{}, { duty_default_operations:'samantha@mo-care.com', duty_default_staffing:'samantha@mo-care.com', duty_default_owner_escalation:'samantha@mo-care.com' });
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const db=window.__db, X=window.DKX, S=window.__store, today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Chicago'});
  window.dkStore=window.__fakeStore;
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Land', shift:'day' };");
  switchTab('mydesk'); await sleep(400);
  const W=()=>document.getElementById('dkWrap'), row=id=>W().querySelector('[data-dkid="'+id+'"]');
  const jot=v=>{ const i=document.getElementById('dkJot'); i.value=v; i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); };
  // the schedule
  ok('with no schedule saved, Stand-Up is every weekday at 9:00 AM Central (her answer)', suSchedWords()==='every weekday at 9:00 AM Central' && suSchedule().saved===false);
  const n=suNextStandup();
  ok('the tray is on the desk, labelled with the next Stand-Up from the schedule', !!W().querySelector('.dk-tray') && W().querySelector('.dk-dymo').textContent==='STAND-UP · '+n.label, W().querySelector('.dk-dymo').textContent);
  const mon=new Date('2026-10-05T13:00:00Z'), mon10=new Date('2026-10-05T15:30:00Z'), fri=new Date('2026-10-09T15:00:00Z');
  ok('before 9 on a weekday the next Stand-Up is today; after 9 it is the next weekday; Friday afternoon it is Monday', suNextStandup(mon).day==='2026-10-05' && suNextStandup(mon10).day==='2026-10-06' && suNextStandup(fri).day==='2026-10-12');
  DATA.ops_settings.standup_schedule={ days:[2,4], time:'10:30' };
  ok('a saved schedule is what counts (Tue and Thu at 10:30 here)', suSchedWords()==='Tue, Thu at 10:30 AM Central' && suNextStandup(mon).label==='TUE 10:30');
  delete DATA.ops_settings.standup_schedule;
  // into the tray
  jot('Weekend coverage looks thin (fake)'); jot('Ask about the new gloves (fake)'); jot('Call Mary back (fake)'); await sleep(200);
  const [a,b,c]=db.desk_lines.filter(l=>l.day===today).map(l=>l.id);
  row(a).focus(); row(a).dispatchEvent(new KeyboardEvent('keydown',{key:'s',bubbles:true})); await sleep(400);
  const A=()=>db.desk_lines.find(l=>l.id===a), it=()=>S.standup_notes.find(x=>x.desk_line_id===a);
  ok('S drops a line into the Stand-Up tray', A().place==='tray' && /Weekend coverage/.test(W().querySelector('.dk-tray').innerText));
  ok('...where it becomes Krystal\'s item on the shared Stand-Up board', it() && it().source==='desk' && it().assigned_to_email==='krystal@mo-care.com' && /Weekend coverage/.test(it().summary) && A().standup_item_id===it().id, S.standup_notes);
  row(b).querySelector('[data-dk="t-tray"]').click(); await sleep(400);
  ok('the tray button does the same', db.desk_lines.find(l=>l.id===b).place==='tray' && S.standup_notes.length===2);
  // Prepare Stand-Up lists tray cards first; discussing one marks it talked about
  
  const pl=prepList();
  ok('Prepare Stand-Up lists everyone\'s tray cards first', pl[0] && pl[0].sec==="From everyone's Stand-Up trays" && pl.filter(r=>r.sec==="From everyone's Stand-Up trays").length===2 && /Krystal Land's tray/.test(pl[0].sub), pl.slice(0,3));
  await tmPrepare(); await sleep(200);
  const pop=[...document.querySelectorAll('#prepLog')].map(x=>x.closest('div[class]')).pop() && document.getElementById('prepLog').parentElement.parentElement, first=[...pop.querySelectorAll('.prepRow')].find(r=>/Weekend coverage/.test(r.innerText));
  if(!first){ ok('Prepare Stand-Up popover shows the tray card', false, pop && pop.innerText.slice(0,500)); return R; }
  first.querySelector('.prepDone').checked=true; pop.querySelector('#prepLog').click(); await sleep(500);
  ok('ticking it at Stand-Up marks it "talked about" on the board', !!it().talked_at && !S.standup_notes.find(x=>x.desk_line_id===b).talked_at);
  await X.load(true); await sleep(200);
  ok('...and it comes back to the tray stamped "talked about"', !!W().querySelector('.dk-icard.dk-talked') && W().querySelectorAll('.dk-icard.dk-talked').length===1);
  // after Stand-Up: All set / Something to do; before: back to the page / take it out
  W().querySelector('.dk-tray').click(); await sleep(150);
  let tp=[...document.querySelectorAll('.ccpop')].pop();
  ok('clicking the tray lists its cards: the talked-about one asks All set or Something to do', /TALKED ABOUT/.test(tp.innerText) && !!tp.querySelector('[data-t="done"]') && !!tp.querySelector('[data-t="back"]'));
  tp.querySelector('[data-id="'+a+'"] [data-t="done"]').click(); await sleep(400);
  ok('"All set" takes it off the tray and closes the board item', !!A().erased_at && it().status==='done');
  W().querySelector('.dk-tray').click(); await sleep(150); tp=[...document.querySelectorAll('.ccpop')].pop();
  tp.querySelector('[data-id="'+b+'"] [data-t="back"]').click(); await sleep(400);
  const B=db.desk_lines.find(l=>l.id===b), Bi=S.standup_notes.find(x=>x.desk_line_id===b);
  ok('taking a card back to the page before Stand-Up takes it off the board too', B.place==='day' && B.day===today && !!Bi.archived_at && !B.standup_item_id);
  row(c).focus(); row(c).dispatchEvent(new KeyboardEvent('keydown',{key:'s',bubbles:true})); await sleep(400);
  row(c) || 0; const Ci=()=>S.standup_notes.find(x=>x.desk_line_id===c);
  X.eraseLine(c); await sleep(300);
  ok('erasing a card that wasn\'t talked about takes it off the board', !!Ci() && !!Ci().archived_at);
  // + Add
  switchTab('today'); await sleep(100);
  ccAddOpen(document.getElementById('ccAddBtn')); await sleep(100);
  let ap=[...document.querySelectorAll('.ccpop')].pop();
  ok('＋ Add offers "Jot on my desk" first', ap.querySelector('button').id==='ccAddDk' && /Jot on my desk/.test(ap.innerText));
  ap.querySelector('#ccAddDk').click(); await sleep(150);
  const q=document.getElementById('dkQuick'); q.value='Ring the pharmacy (fake)'; q.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); await sleep(500);
  ok('...and what you type lands on today\'s page without leaving where you are', db.desk_lines.some(l=>/pharmacy/.test(l.body) && l.day===today && l.kind==='todo') && activeTab==='today');
  // End My Shift
  switchTab('mywork'); await sleep(300);
  const eb=[...document.querySelectorAll('#tab-mywork button')].find(x=>/End my shift/i.test(x.textContent));
  eoOpen(eb); await sleep(150);
  const ep=[...document.querySelectorAll('.ccpop')].pop();
  ok('End My Shift has a "Your desk" step listing what is still open on today\'s page', /YOUR DESK/.test(ep.innerText) && ep.querySelectorAll('.dkEsRow').length>=2, ep.innerText.slice(0,400));
  const pr=[...ep.querySelectorAll('.dkEsRow')].find(r=>/pharmacy/.test(r.innerText)); pr.querySelector('.dkEsWhat').value='next';
  ep.querySelector('#eoGo').click(); await sleep(900);
  const P=db.desk_lines.find(l=>/pharmacy/.test(l.body)), pg=db.desk_pages.find(p=>p.day===today)||{};
  ok('the line you chose moves to the next working day; the rest stay', P.day===X.nextBiz(today) && db.desk_lines.find(l=>l.id===b).day===today);
  ok('the day is wrapped and the ribbon moves to the next page', !!pg.wrapped_at);
  switchTab('mydesk'); await sleep(300);
  ok('today\'s page says "Wrapped up at … See you …" and has no ribbon', /Wrapped up at .*See you/.test(W().querySelector('.dk-page').innerText) && !W().querySelector('.dk-page .dk-ribbon'));
  X.flipTo(X.nextBiz(today)); await sleep(300);
  ok('the ribbon is on the next page now', !!W().querySelector('.dk-page:not(.dk-out) .dk-ribbon'));
  // Friday card
  ok('the Friday card shows Friday from noon until Monday morning, never midweek', X.fridayWeek(new Date('2026-10-09T17:30:00Z'))==='2026-10-05' && X.fridayWeek(new Date('2026-10-12T13:00:00Z'))==='2026-10-05' && X.fridayWeek(new Date('2026-10-09T15:00:00Z'))===null && X.fridayWeek(new Date('2026-10-07T20:00:00Z'))===null);
  ok('nothing was texted or emailed', window.__fn.length===0);
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={ 'width':1400, 'height':1000 })
    pg.route('**/*', lambda r: r.abort() if ('supabase.co' in r.request.url or 'fonts.g' in r.request.url) else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=desk4'); pg.wait_for_timeout(1200)
    pg.evaluate(STUB); pg.evaluate(EXTRA); R = pg.evaluate(T)
    pg.evaluate("async()=>{ window.DKX.flipTo(new Date().toLocaleDateString('en-CA',{timeZone:'America/Chicago'})); await new Promise(r=>setTimeout(r,400)); }")
    pg.screenshot(path='/tmp/my_desk_stage4.png')
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

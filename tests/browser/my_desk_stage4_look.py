"""My Desk, Stage 4 (updated 2026-10-06 for Talk about: the tray became a flag on the line), the Stand-Up schedule in
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
  // TALK ABOUT (2026-10-06): no tray, no schedule; a flag on the line
  ok('there is no Stand-Up tray on the desk any more', !W().querySelector('.dk-tray') && !W().querySelector('.dk-dymo'));
  jot('Weekend coverage looks thin (fake)'); jot('Ask about the new gloves (fake)'); jot('Call Mary back (fake)'); await sleep(200);
  const [a,b,c]=db.desk_lines.filter(l=>l.day===today).map(l=>l.id);
  row(a).focus(); row(a).dispatchEvent(new KeyboardEvent('keydown',{key:'s',bubbles:true})); await sleep(400);
  const A=()=>db.desk_lines.find(l=>l.id===a), it=()=>S.standup_notes.find(x=>x.desk_line_id===a);
  ok('S flags a line to talk about: it stays on today\'s page with a little bubble', A().place==='day' && A().day===today && !!row(a).querySelector('.dk-talk') && /to talk about/.test(row(a).innerText));
  ok('...and it is Krystal\'s item on the shared To talk about list', it() && it().source==='desk' && it().assigned_to_email==='krystal@mo-care.com' && /Weekend coverage/.test(it().summary) && A().standup_item_id===it().id && /Flagged to talk about from Krystal's desk/.test(it().history[0].what), it());
  row(b).querySelector('[data-dk="t-talk"]').click(); await sleep(400);
  ok('the bubble button does the same', !!db.desk_lines.find(l=>l.id===b).standup_item_id && S.standup_notes.length===2);
  const pl=prepList();
  ok('Prepare a meeting lists the flags first', pl[0] && pl[0].sec==='Flagged to talk about' && pl.filter(r=>r.sec==='Flagged to talk about').length===2 && /Krystal Land's desk/.test(pl[0].sub), pl.slice(0,3));
  switchTab('standup'); await sleep(300);
  ok('on the To talk about list as "From their desk" under You', /You/.test(document.querySelector('#suWrap .su-tgroup').innerText) && /Weekend coverage[\s\S]*From their desk/.test(document.getElementById('suWrap').innerText));
  await suAct(it().id,'talked'); await sleep(200);
  switchTab('mydesk'); await X.load(true); await sleep(300);
  ok('once someone taps Talked, the flag comes off the line (it stays on the page)', !A().standup_item_id && !!A().talked_at && A().place==='day' && !row(a).querySelector('.dk-talk'));
  row(b).focus(); row(b).dispatchEvent(new KeyboardEvent('keydown',{key:'s',bubbles:true})); await sleep(400);
  const B=db.desk_lines.find(l=>l.id===b), Bi=S.standup_notes.find(x=>x.desk_line_id===b);
  ok('S again takes the flag off, and off the list', !B.standup_item_id && !!Bi.archived_at && B.place==='day');
  row(c).focus(); row(c).dispatchEvent(new KeyboardEvent('keydown',{key:'s',bubbles:true})); await sleep(400);
  const Ci=()=>S.standup_notes.find(x=>x.desk_line_id===c);
  X.eraseLine(c); await sleep(300);
  ok('erasing a flagged line takes it off the list', !!Ci() && !!Ci().archived_at);
  // a card left in the old tray comes back to today's page, still flagged
  S.standup_notes.push({ id:'su_oldtray', summary:'Old tray card (fake)', source:'desk', status:'open', assigned_to_email:'krystal@mo-care.com', created_at:new Date().toISOString(), history:[], updates:[] });
  db.desk_lines.push({ id:'l_oldtray', person_id:'p_k', place:'tray', day:null, pos:1, kind:'todo', body:'Old tray card (fake)', standup_item_id:'su_oldtray', rev:1 });
  await X.load(true); await sleep(300);
  const OT=db.desk_lines.find(l=>l.id==='l_oldtray');
  ok('a card still in the old tray lands back on today\'s page, still flagged', OT.place==='day' && OT.day===today && OT.standup_item_id==='su_oldtray' && !!row('l_oldtray') && !!row('l_oldtray').querySelector('.dk-talk'));
  // + Add
  switchTab('today'); await sleep(100);
  ccAddOpen(document.getElementById('ccAddBtn')); await sleep(100);
  let ap=[...document.querySelectorAll('.ccpop')].pop();
  ok('＋ Add offers "Jot on my desk" first, then My Work, and a Talk about tick', ap.querySelector('button').id==='ccAddDk' && /Jot on my desk/.test(ap.innerText) && !!ap.querySelector('#ccAddCap') && !ap.querySelector('#ccAddSu') && !!ap.querySelector('#ccAddTalk'));
  ap.querySelector('#ccAddDk').click(); await sleep(150);
  const q=document.getElementById('dkQuick'); q.value='Ring the pharmacy (fake)'; q.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); await sleep(500);
  ok('...and what you type lands on today\'s page without leaving where you are', db.desk_lines.some(l=>/pharmacy/.test(l.body) && l.day===today && l.kind==='todo' && !l.standup_item_id) && activeTab==='today');
  ccAddOpen(document.getElementById('ccAddBtn')); await sleep(100); ap=[...document.querySelectorAll('.ccpop')].pop();
  ap.querySelector('#ccAddTalk').checked=true; ap.querySelector('#ccAddDk').click(); await sleep(150);
  ok('...with the tick, the jot box opens already ticked', document.getElementById('dkQTalk').checked===true);
  const q2=document.getElementById('dkQuick'); q2.value='Ask Samantha about mileage (fake)'; q2.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); await sleep(600);
  const ML=db.desk_lines.find(l=>/mileage/.test(l.body));
  ok('...and the line is flagged to talk about', !!ML && !!ML.standup_item_id && S.standup_notes.some(x=>x.id===ML.standup_item_id && x.source==='desk'));
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

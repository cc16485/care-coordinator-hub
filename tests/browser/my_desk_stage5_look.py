"""My Desk, Stage 5: the desk follows you around the Hub (tab + drawer + N, paperclips, select-to-jot, On your desk,
phone numbers, Make it a Hub follow-up, Jot on my desk on My Work cards, the Dashboard line). Based on Stage 4's set-up: the Stand-Up tray (through the real Stand-Up board and Prepare Stand-Up), the Stand-Up schedule in
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
  const db=window.__db, X=window.DKX, today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Chicago'});
  window.dkStore=window.__fakeStore; window.__opened=[];
  window.openClient=(seed)=>{ window.__opened.push(seed); };
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Land', shift:'day' };");
  DATA.ops_items=[{ id:'ops_w1', kind:'promise_update', status:'open', about:'Call Betsy\'s daughter back (fake)', owner:'krystal@mo-care.com', owner_name:'Krystal Land', due:new Date(Date.now()+36e5).toISOString(), created_at:new Date().toISOString() }];
  switchTab('mydesk'); await sleep(400);
  switchTab('today'); await sleep(300); X.chromeTick(); await sleep(50);
  const tab=document.getElementById('dkTab');
  ok('the yellow My Desk tab is on other screens', tab && !tab.hidden);
  ok('your Dashboard has one line about your own desk', /My Desk:/.test(document.getElementById('dkDashLine').innerText), document.getElementById('dkDashLine').innerText);
  // pretend Linda's client profile is open
  const lpv=document.getElementById('leadProfileView'); lpv.style.display='block';
  (0,eval)("CP.ax='123'; CP.lead=null; CP.r={ client_name:'Linda Martin (fake)', axiscare_client_id:'123' };");
  const p=document.createElement('p'); p.id='dkSelTest'; p.textContent='Rachel asked about adding Saturday mornings in November.'; lpv.appendChild(p);
  ok('the desk knows Linda\'s profile is open', JSON.stringify(X.deskContext())===JSON.stringify({ type:'client', ax:'123', lead_id:'', name:'Linda Martin (fake)' }), X.deskContext());
  // N opens the drawer
  document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'n',bubbles:true})); await sleep(250);
  const dr=document.getElementById('dkDrawer');
  ok('N (anywhere but a text box) opens today\'s page in a drawer', dr && !dr.hidden && /Jotting from Linda Martin/.test(dr.innerText));
  const dj=document.getElementById('dkDJot'); dj.value='Call Linda\'s son about the 14th (fake)'; dj.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); await sleep(300);
  const L=db.desk_lines.find(l=>/Linda's son/.test(l.body));
  ok('a line jotted from her profile gets Linda\'s paperclip', L && L.day===today && L.link && L.link.ax==='123' && L.link.name==='Linda Martin (fake)', L);
  X.toggleDrawer(false); await sleep(50); X.chromeTick(); await sleep(50);
  const od=document.getElementById('dkOnDesk');
  ok('her profile shows an "On your desk" note with that line', od && !od.hidden && /Linda's son/.test(od.innerText));
  // select-to-jot
  const r=document.createRange(); r.selectNodeContents(p); const sel=getSelection(); sel.removeAllRanges(); sel.addRange(r);
  p.dispatchEvent(new MouseEvent('mouseup',{bubbles:true})); await sleep(80);
  const pill=document.querySelector('.dk-jotpill');
  ok('selecting words shows "Jot it on my desk"', !!pill);
  pill.querySelector('[data-p="jot"]').click(); await sleep(300);
  const SL=db.desk_lines.find(l=>/Saturday mornings/.test(l.body));
  ok('...which puts them on today\'s page with Linda\'s paperclip', SL && SL.link && SL.link.ax==='123' && /^Rachel asked/.test(SL.body));
  lpv.style.display='none'; X.chromeTick(); await sleep(50);
  ok('the note goes away when her profile closes', document.getElementById('dkOnDesk').hidden);
  // paperclip opens her profile; phone numbers call from the office line
  switchTab('mydesk'); await sleep(300);
  ok('the tab hides on My Desk itself', document.getElementById('dkTab').hidden);
  const W=()=>document.getElementById('dkWrap');
  W().querySelector('[data-dkid="'+L.id+'"] [data-dk="link"]').click(); await sleep(100);
  ok('clicking the paperclip opens Linda\'s profile', window.__opened.length===1 && window.__opened[0].ax==='123');
  switchTab('mydesk'); await sleep(200);
  const jot=v=>{ const i=document.getElementById('dkJot'); i.value=v; i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); };
  jot('Ring the Garcias at 417-555-0142 (fake)'); await sleep(200);
  const ph=W().querySelector('.dk-phone');
  ok('a phone number on a line calls from the office line (never a bare tel: link)', ph && ph.getAttribute('data-oc-phone')==='417-555-0142' && ph.getAttribute('href')==='#');
  // Make it a Hub follow-up
  jot('Call the Wilsons back tomorrow (fake)'); await sleep(200);
  const F=db.desk_lines.find(l=>/Wilsons back/.test(l.body));
  ok('a line that sounds like a promise to a family offers "Make it a Hub follow-up"', !!W().querySelector('.dk-hint[data-for="'+F.id+'"]'));
  W().querySelector('.dk-hint[data-for="'+F.id+'"] [data-dk="follow"]').click(); await sleep(150);
  ok('...it opens Capture with the words already in', document.getElementById('capWhat') && document.getElementById('capWhat').value===F.body);
  await ccCaptureSave(); await sleep(700);
  const made=DATA.ops_items.find(x=>x.kind==='capture' && x.title===F.body);
  ok('...saving makes the follow-up in My Work (only because the person saved it)', !!made);
  ok('...and the line gets a paperclip to it', db.desk_lines.find(l=>l.id===F.id).link && db.desk_lines.find(l=>l.id===F.id).link.id===made.id && !W().querySelector('.dk-hint[data-for="'+F.id+'"]'));
  jot('Told the Pattersons I\'d call Friday (fake)'); await sleep(200);
  const G=db.desk_lines.find(l=>/Pattersons/.test(l.body));
  W().querySelector('.dk-hint[data-for="'+G.id+'"] [data-dk="nohint"]').click(); await sleep(150);
  ok('"Just for me" puts the question away for good', !W().querySelector('.dk-hint[data-for="'+G.id+'"]') && db.desk_lines.find(l=>l.id===G.id).link.nohint===true && !DATA.ops_items.some(x=>/Pattersons/.test(x.title||'')));
  // My Work card
  switchTab('mywork'); await sleep(400);
  const wb=[...document.querySelectorAll('.wkcard[data-id="ops_w1"] button')].find(b=>/Jot on my desk/.test(b.textContent));
  ok('My Work cards have "Jot on my desk"', !!wb);
  wb.click(); await sleep(150);
  const q=document.getElementById('dkQuick'); q.value='First ask Maria if she can do Thursday (fake)'; q.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); await sleep(400);
  const M=db.desk_lines.find(l=>/ask Maria/.test(l.body));
  ok('...your own step lands on today\'s page clipped to the card', M && M.link && M.link.type==='work' && M.link.id==='ops_w1');
  switchTab('mydesk'); await sleep(300);
  W().querySelector('[data-dkid="'+M.id+'"] .dk-cb').click(); await sleep(200);
  ok('ticking the step never closes the card', DATA.ops_items.find(x=>x.id==='ops_w1').status==='open');
  W().querySelector('[data-dkid="'+M.id+'"] [data-dk="link"]').click(); await sleep(700);
  ok('the paperclip takes you to the card in My Work', activeTab==='mywork' && !!document.querySelector('.wkcard[data-id="ops_w1"]'));
  // Dashboard line
  switchTab('today'); await sleep(300);
  const dl=document.getElementById('dkDashLine').innerText;
  ok('the Dashboard line counts only your own desk', /My Desk:\s*\d+ open on today's page/.test(dl) && !/Samantha/.test(dl), dl);
  ok('nothing was texted or emailed', window.__fn.length===0);
  return R;
}
"""
with sync_playwright() as pw:
    import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from clock_pin import pin  # tests/browser/clock_pin.py: same answer at any hour
    b = pw.chromium.launch(); pg = b.new_page(viewport={ 'width':1400, 'height':1000 })
    pin(pg)  # same answer at any hour (tests/browser/clock_pin.py)
    pg.route('**/*', lambda r: r.abort() if ('supabase.co' in r.request.url or 'fonts.g' in r.request.url) else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=desk5'); pg.wait_for_timeout(1200)
    pg.evaluate(STUB); pg.evaluate(EXTRA); R = pg.evaluate(T)
    pg.evaluate("async()=>{ const lpv=document.getElementById('leadProfileView'); switchTab('today'); await new Promise(r=>setTimeout(r,200)); lpv.style.display='block'; window.DKX.chromeTick(); await window.DKX.toggleDrawer(true); await new Promise(r=>setTimeout(r,300)); }")
    pg.screenshot(path='/tmp/my_desk_stage5.png')
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

"""My Desk, Stage 1. The real Hub page, offline, made-up people and lines; the desk's database is a pretend one in the
page (window.dkStore), so nothing is saved anywhere and nobody is texted or emailed.
(python3 tests/browser/my_desk_look.py, with the static server on 8765)"""
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
    async remove(t,id){ db[t]=db[t].filter(x=>x.id!==id); return true; },
    async saveSettings(row){ W.__calls.push('settings'); db.desk_settings=[Object.assign(db.desk_settings[0]||{}, clone(row))]; return true; },
    async savePage(row){ W.__calls.push('page'); const i=db.desk_pages.findIndex(p=>p.day===row.day); if(i>=0) db.desk_pages[i]=Object.assign(db.desk_pages[i], row); else db.desk_pages.push(clone(row)); return true; }
  };
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const db=window.__db, X=window.DKX, today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Chicago'});
  const isWk=s=>{ const [y,m,d]=s.split('-').map(Number); const w=new Date(y,m-1,d).getDay(); return w===0||w===6; };
  const vis=sel=>{ const e=document.querySelector(sel); return !!e && e.offsetParent!==null; };
  window.dkStore=window.__fakeStore;
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';

  // who sees it
  (0,eval)("ME={ email:'angiel@mo-care.com', name:'Angiel Falig', shift:'day' };"); switchTab('today'); await sleep(100);
  ok('the pill is hidden for someone not ticked (Angiel)', !vis('#fsub-today [data-tab="mydesk"]'));
  ok('...who still counts as having a desk by her job title', X.access({ desk_access:{ mode:'everyone' } }, 'angiel@mo-care.com', true) === true);
  switchTab('mydesk'); await sleep(150);
  ok('opening it anyway says it is not switched on, and touches no data', /isn't switched on for you yet/.test(document.getElementById('dkWrap').innerText) && !window.__calls.includes('load'));
  ok('off means off for everyone', !X.access({ desk_access:{ mode:'off', people:['krystal@mo-care.com'] } }, 'krystal@mo-care.com', true) && !X.access({}, 'krystal@mo-care.com', true));
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Land', shift:'day' };"); switchTab('today'); await sleep(100);
  ok('the pill shows for Krystal (ticked)', vis('#fsub-today [data-tab="mydesk"]'));

  // yesterday's leftovers, made before opening
  const prev=X.prevBiz(today);
  db.desk_lines.push({ id:'a1', person_id:'p_k', place:'day', day:prev, pos:1, kind:'todo', body:'Order gloves (fake)', origin_day:prev, rev:1 },
                     { id:'a2', person_id:'p_k', place:'day', day:prev, pos:2, kind:'note', body:'the Smith house (fake)', origin_day:prev, rev:1 },
                     { id:'a3', person_id:'p_k', place:'day', day:prev, pos:3, kind:'todo', body:'Done thing (fake)', origin_day:prev, done_at:new Date().toISOString(), rev:1 },
                     { id:'a4', person_id:'p_k', place:'day', day:prev, pos:4, kind:'todo', body:'Text Jessica (fake)', origin_day:X.prevBiz(prev), rev:1 });
  switchTab('mydesk'); await sleep(400);
  const W=()=>document.getElementById('dkWrap');
  ok('the desk opens on today\'s page', W().querySelector('.dk-page').dataset.day===today && /today/i.test(W().querySelector('.dk-dow').textContent));
  ok('pages peek out on both sides', !!W().querySelector('.dk-peek.dk-prev') && !!W().querySelector('.dk-peek.dk-next'));
  ok('"2 left on yesterday\'s page" (open to-dos only)', /2 left on/.test(W().querySelector('.dk-left').innerText), W().querySelector('.dk-left')&&W().querySelector('.dk-left').innerText);

  // jot
  const jot=v=>{ const i=document.getElementById('dkJot'); i.value=v; i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); };
  jot('Call Linda Martin\'s son at 2 (fake)'); await sleep(150);
  let L=db.desk_lines.find(l=>/Linda/.test(l.body));
  ok('Enter writes a to-do, saved as Krystal\'s line on today\'s page', L && L.kind==='todo' && L.day===today && L.person_id==='p_k' && L.origin_day===today, L);
  ok('"at 2" becomes a 2:00 PM time chip', L && L.time_text==='2:00 PM' && /2:00 PM/.test(W().innerText));
  ok('the jot line keeps the cursor for the next one', document.activeElement && document.activeElement.id==='dkJot');
  const i=document.getElementById('dkJot'); i.value='she prefers mornings (fake)'; i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',shiftKey:true,bubbles:true})); await sleep(150);
  const N=db.desk_lines.find(l=>/mornings/.test(l.body));
  ok('Shift+Enter writes a note (no checkbox)', N && N.kind==='note' && !W().querySelector('[data-dkid="'+N.id+'"] .dk-cb'));
  jot('Check tomorrow\'s open shift (fake)'); await sleep(150);

  // check off
  const row=id=>W().querySelector('[data-dkid="'+id+'"]');
  row(L.id).querySelector('.dk-cb').click(); await sleep(150);
  ok('checking off draws the tick and crosses it out, and saves when', row(L.id).classList.contains('dk-done') && !!db.desk_lines.find(l=>l.id===L.id).done_at);
  row(L.id).querySelector('.dk-cb').click(); await sleep(150);
  ok('...and unchecks', !row(L.id).classList.contains('dk-done') && !db.desk_lines.find(l=>l.id===L.id).done_at);

  // the note under Linda's line travels with it to tomorrow; a faint line stays behind
  const tomorrow=X.nextBiz(today);
  row(L.id).querySelector('[data-dk="t-next"]').click(); await sleep(200);
  const L2=db.desk_lines.find(l=>l.id===L.id), N2=db.desk_lines.find(l=>l.id===N.id);
  ok('"→ Tue" moves the line to the next working day', L2.day===tomorrow && L2.place==='day', L2);
  ok('...the note written under it goes too', N2.day===tomorrow && N2.pos>L2.pos, N2);
  const G=db.desk_lines.find(l=>l.kind==='ghost' && l.ghost_of===L.id);
  ok('...a faint "→ day" line stays on today\'s page', G && G.day===today && G.moved_to===tomorrow && /→/.test(W().querySelector('.dk-ghost').innerText));
  ok('...and the peeking page reacts', !!W().querySelector('.dk-peek.dk-next') );
  ok('the toast offers Undo', /Moved to/.test(document.getElementById('dkToast').innerText) && !!document.querySelector('#dkToast button'));
  window.DKX.undoLast(); await sleep(250);
  ok('Undo puts it back on today\'s page, note and all, and erases the faint line', db.desk_lines.find(l=>l.id===L.id).day===today && db.desk_lines.find(l=>l.id===N.id).day===today && !!db.desk_lines.find(l=>l.id===G.id).erased_at);

  // carried label: a line from two working days ago
  ok('a line carried over says where it came from', X.carryInfo({ kind:'todo', origin_day:prev }, today).label.startsWith('↪ from'));
  ok('...or how many days it has ridden along', X.carryInfo({ kind:'todo', origin_day:X.prevBiz(X.prevBiz(prev)) }, today).label==='↪ carried 3 days');
  ok('no label on its own day, or on notes', X.carryInfo({ kind:'todo', origin_day:today }, today)===null && X.carryInfo({ kind:'note', origin_day:prev }, today)===null);

  // leftovers: bring them over
  W().querySelector('[data-dk="lo-bring"]').click(); await sleep(250);
  const a1=db.desk_lines.find(l=>l.id==='a1'), a2=db.desk_lines.find(l=>l.id==='a2'), a3=db.desk_lines.find(l=>l.id==='a3');
  ok('"Bring them over" moves the open to-dos (and their notes) to today', a1.day===today && a2.day===today && db.desk_lines.find(l=>l.id==='a4').day===today);
  ok('...finished lines stay on yesterday\'s page', a3.day===prev);
  ok('...each leaves a faint line behind', db.desk_lines.filter(l=>l.kind==='ghost' && l.day===prev && !l.erased_at).length===2);
  ok('...and the banner is gone', !W().querySelector('.dk-left'));
  ok('the carried line shows "↪ from"', /↪ from|↪ carried/.test(row('a1').innerText) && /↪ carried 2 days/.test(row('a4').innerText), row('a4').innerText);

  // reorder with the keyboard
  const order=()=>X.inPlace(db.desk_lines,'day',today).filter(l=>l.kind!=='ghost').map(l=>l.id);
  const before=order(); const first=before[0];
  row(first).focus(); row(first).dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',altKey:true,bubbles:true})); await sleep(150);
  ok('Alt+↓ moves a line down one', order()[1]===first, order());

  // Later folder
  const C=db.desk_lines.find(l=>/open shift/.test(l.body));
  row(C.id).querySelector('[data-dk="t-later"]').click(); await sleep(200);
  ok('into the Later folder (no day, no faint line)', db.desk_lines.find(l=>l.id===C.id).place==='later' && !db.desk_lines.find(l=>l.kind==='ghost' && l.ghost_of===C.id));
  ok('the folder label counts it', /1 tucked away/.test(W().querySelector('.dk-flabel').innerText));
  W().querySelector('.dk-folder').click(); await sleep(120);
  ok('the folder opens to its list', /open shift/.test(W().querySelector('.dk-later').innerText));

  // erase + undo
  const E=db.desk_lines.find(l=>l.id==='a4');
  row('a4').focus(); row('a4').dispatchEvent(new KeyboardEvent('keydown',{key:'Delete',bubbles:true})); await sleep(150);
  ok('Delete erases (kept 30 days, gone from the page)', !!db.desk_lines.find(l=>l.id==='a4').erased_at && !row('a4'));
  window.DKX.undoLast(); await sleep(200);
  ok('Undo brings it back', !db.desk_lines.find(l=>l.id==='a4').erased_at && !!row('a4'));

  // another screen changed it first
  window.__conflict=true; const loads=window.__calls.filter(c=>c==='load').length;
  row('a4').querySelector('.dk-cb').click(); await sleep(600);
  ok('a change made on another screen is never overwritten: the desk says so and reloads', /another screen/.test(document.getElementById('dkToast').innerText) && window.__calls.filter(c=>c==='load').length>loads);

  // pages
  W().querySelector('.dk-peek.dk-next').click(); await sleep(150);
  ok('clicking the peeking page turns to it', W().querySelector('.dk-page:not(.dk-out)').dataset.day===tomorrow && !!W().querySelector('.dk-back'));
  W().querySelector('.dk-back').click(); await sleep(150);
  ok('"Back to today" returns', W().querySelector('.dk-page:not(.dk-out)').dataset.day===today);

  // stickies
  W().querySelector('.dk-pad[data-c="pink"]').click(); await sleep(150);
  const ed=document.activeElement;
  ok('clicking a pad peels off a sticky of that color, ready to write on', ed && ed.classList.contains('dk-stt') && db.desk_stickies.some(s=>s.color==='pink'));
  ed.textContent='ask Angiel:\nBarnes papers (fake)'; ed.blur(); await sleep(150);
  const S=db.desk_stickies.find(s=>s.color==='pink');
  ok('...what you write is saved on it', /Barnes/.test(S.body));
  W().querySelector('[data-sid="'+S.id+'"] [data-dk="s-color"]').click(); await sleep(120);
  ok('the color button changes its color', db.desk_stickies.find(s=>s.id===S.id).color==='blue');
  const lab=W().querySelector('.dk-plabel[data-c="yellow"]'); lab.click(); lab.textContent='remember'; lab.blur(); await sleep(120);
  ok('a pad label is saved as your own meaning for that color', db.desk_settings[0] && db.desk_settings[0].pad_labels.yellow==='remember');

  // settings
  dkSetFill && (document.getElementById('dkSet') || (()=>{ const d=document.createElement('div'); d.id='dkSet'; document.body.appendChild(d); })());
  dkSetFill(); await sleep(50);
  const set=document.getElementById('dkSet');
  ok('Settings lists the team with ticks, Samantha and Krystal ticked', [...set.querySelectorAll('#dkPeople input:checked')].map(x=>x.value).sort().join()==='krystal@mo-care.com,samantha@mo-care.com');
  set.querySelector('input[value="everyone"]').checked=true; await dkSetSave(); await sleep(50);
  ok('Settings saves who sees My Desk into the Hub settings (with who and when)', DATA.ops_settings.desk_access.mode==='everyone' && window.__merge.length===1 && window.__merge[0].key==='ops_settings');
  ok('nothing was texted, emailed or sent anywhere', window.__fn.length===0);
  return R;
}
"""
T2 = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const db=window.__db, W=()=>document.getElementById('dkWrap');
  ok('a dragged line landed on the next page', db.desk_lines.some(l=>/drag me/.test(l.body) && l.day===window.DKX.nextBiz(new Date().toLocaleDateString('en-CA',{timeZone:'America/Chicago'}))));
  const s=db.desk_stickies.find(x=>/move me/.test(x.body));
  ok('a dragged sticky remembers where it was put', s && (s.x!==20 || s.y!==120 || s.side!=='L'), s);
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={ 'width':1400, 'height':1000 })
    pg.route('**/*', lambda r: r.abort() if ('supabase.co' in r.request.url or 'fonts.g' in r.request.url) else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=desk'); pg.wait_for_timeout(1200)
    pg.evaluate(STUB)
    R = pg.evaluate(T)
    # real mouse drags: a line onto the next page peeking out, and a sticky across the desk
    pg.evaluate("""async()=>{ window.__db.desk_lines.push({ id:'dd', person_id:'p_k', place:'day', day:new Date().toLocaleDateString('en-CA',{timeZone:'America/Chicago'}), pos:99, kind:'todo', body:'drag me (fake)', origin_day:new Date().toLocaleDateString('en-CA',{timeZone:'America/Chicago'}), rev:1 });
      window.__db.desk_stickies.push({ id:'ss', person_id:'p_k', color:'green', body:'move me (fake)', side:'L', x:20, y:120, rot:0, z:1, rev:1 }); window.DKX.load(true); await new Promise(r=>setTimeout(r,300)); }""")
    row = pg.locator('[data-dkid="dd"] .dk-txt').bounding_box(); pk = pg.locator('.dk-peek.dk-next').bounding_box(); page = pg.locator('.dk-page:not(.dk-out)').bounding_box()
    pg.mouse.move(row['x'] + 30, row['y'] + 10); pg.mouse.down(); pg.mouse.move(row['x'] + 80, row['y'] + 30, steps=5)
    pg.mouse.move(page['x'] + page['width'] + 8, page['y'] + page['height'] * .75, steps=8); pg.mouse.up(); pg.wait_for_timeout(500)
    st = pg.locator('[data-sid="ss"]').bounding_box()
    pg.mouse.move(st['x'] + 70, st['y'] + 60); pg.mouse.down(); pg.mouse.move(st['x'] + 140, st['y'] + 260, steps=10); pg.mouse.up(); pg.wait_for_timeout(400)
    R += pg.evaluate(T2)
    pg.screenshot(path='/tmp/my_desk_look.png')
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

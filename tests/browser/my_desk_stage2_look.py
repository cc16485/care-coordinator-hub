"""My Desk, Stage 2: Month, stamps, the ribbon, folded corners, star and circle, the tent calendar, Make it yours.
The real Hub page, offline, made-up lines, a pretend desk database (window.dkStore). Nothing is saved or sent.
(python3 tests/browser/my_desk_stage2_look.py, with the static server on 8765)"""
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
    async loadDays(me,from,to){ W.__calls.push('loadDays:'+from); return { lines:clone(db.desk_lines.filter(l=>!l.erased_at && l.place==='day' && l.day>=from && l.day<=to)), pages:clone(db.desk_pages.filter(p=>p.day>=from && p.day<=to)) }; },
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
  window.dkStore=window.__fakeStore;
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Land', shift:'day' };");
  const old=(()=>{ const d=new Date(); d.setMonth(d.getMonth()-4); d.setDate(10); while(d.getDay()===0||d.getDay()===6) d.setDate(d.getDate()+1); return d.toLocaleDateString('en-CA'); })();
  db.desk_lines.push({ id:'o1', person_id:'p_k', place:'day', day:old, pos:1, kind:'todo', body:'An old page line (fake)', origin_day:old, done_at:new Date().toISOString(), rev:1 });
  db.desk_pages.push({ person_id:'p_k', day:old, stamp:'sun', dogear:true });
  switchTab('mydesk'); await sleep(400);
  const W=()=>document.getElementById('dkWrap'), row=id=>W().querySelector('[data-dkid="'+id+'"]');
  const jot=v=>{ const i=document.getElementById('dkJot'); i.value=v; i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); };
  ok('the ribbon marks today\'s page', !!W().querySelector('.dk-page .dk-ribbon'));
  ok('the tent calendar sits on the desk, today circled', !!W().querySelector('.dk-tent .dk-ring') && /[A-Z]{3,}/.test(W().querySelector('.dk-band span').textContent));
  ok('the photo frame and the pencil cup are on the desk', !!W().querySelector('.dk-polaroid') && !!W().querySelector('.dk-cup'));
  jot('Call the Wilsons (fake)'); jot('Send Pat the schedule (fake)'); jot('Order gloves (fake)'); await sleep(200);
  const ids=db.desk_lines.filter(l=>l.day===today && l.kind==='todo').map(l=>l.id);
  // star and circle
  row(ids[0]).querySelector('[data-dk="mstar"]').click(); await sleep(120);
  ok('clicking the margin draws a star (saved)', db.desk_lines.find(l=>l.id===ids[0]).star===true && row(ids[0]).querySelector('.dk-mstar.dk-on'));
  row(ids[1]).focus(); row(ids[1]).dispatchEvent(new KeyboardEvent('keydown',{key:'c',bubbles:true})); await sleep(120);
  ok('C circles a line (saved, drawn)', db.desk_lines.find(l=>l.id===ids[1]).circle===true && !!row(ids[1]).querySelector('.dk-circ'));
  row(ids[1]).querySelector('[data-dk="more"]').click(); await sleep(60);
  ok('the ⋯ menu offers star and circle too', /Star it in the margin/.test(document.getElementById('dkMenu').innerText) && /Remove the circle/.test(document.getElementById('dkMenu').innerText));
  document.querySelector('#dkMenu [data-m="circle"]').click(); await sleep(120);
  ok('...and takes the circle off', db.desk_lines.find(l=>l.id===ids[1]).circle===false);
  // stamp
  for(const id of ids){ row(id).querySelector('.dk-cb').click(); await sleep(120); }
  const pg=()=>db.desk_pages.find(p=>p.day===today)||{};
  ok('crossing off the last line stamps the page (saved)', ['house','sun','cup'].includes(pg().stamp) && !!W().querySelector('.dk-page .dk-stamp'), pg());
  ok('...with "Good day\'s work, Krystal."', /Good day's work, Krystal\./.test(W().querySelector('.dk-stamp').innerText));
  row(ids[2]).querySelector('.dk-cb').click(); await sleep(150);
  ok('unchecking one takes the stamp off', !pg().stamp && !W().querySelector('.dk-page .dk-stamp'));
  row(ids[2]).querySelector('.dk-cb').click(); await sleep(150);
  // folded corner
  W().querySelector('.dk-dogear').click(); await sleep(120);
  ok('folding the corner is saved for that page', pg().dogear===true && W().querySelector('.dk-dogear.dk-on'));
  // calendar
  const tm=X.nextBiz(today), cb=W().querySelector('.dk-calg [data-day="'+tm+'"]');
  if(cb){ cb.click(); await sleep(150); ok('clicking a date on the calendar opens its page', W().querySelector('.dk-page:not(.dk-out)').dataset.day===tm); ok('...no ribbon on another day\'s page', !W().querySelector('.dk-page:not(.dk-out) .dk-ribbon')); W().querySelector('.dk-back').click(); await sleep(150); }
  else ok('(tomorrow is next month, so the calendar check is skipped today)', true);
  ok('weekend dates can\'t be picked', [...W().querySelectorAll('.dk-calg button:disabled')].length>=8);
  // month
  W().querySelector('.dk-nav [data-dk="month"]').click(); await sleep(900);
  const [y,m]=today.split('-').map(Number), days=new Date(y,m,0).getDate(); let wd=0; for(let i=1;i<=days;i++){ const w=new Date(y,m-1,i).getDay(); if(w&&w<6) wd++; }
  ok('Month shows every weekday of this month as a little page', W().querySelectorAll('.dk-mini:not(.dk-wk)').length===wd, W().querySelectorAll('.dk-mini:not(.dk-wk)').length);
  ok('today\'s little page is marked, with its stamp and folded corner', !!W().querySelector('.dk-mini.dk-today .dk-ms') && !!W().querySelector('.dk-mini.dk-today .dk-de'));
  ok('...and shows its lines and counts', /3 ✓/.test(W().querySelector('.dk-mini.dk-today').innerText), W().querySelector('.dk-mini.dk-today').innerText);
  ok('no week days are wrong: the month grid starts on Monday', W().querySelector('.dk-mw').textContent==='Mon');
  for(let k=0;k<4;k++){ W().querySelector('[data-dk="mnav"][data-n="-1"]').click(); await sleep(200); }
  ok('going back 4 months fetches that month (older than the desk keeps loaded)', window.__calls.some(c=>c.startsWith('loadDays:')));
  ok('...and shows its old page with its stamp and corner', /An old page line/.test(W().innerText) && !!W().querySelector('[data-mday="'+old+'"] .dk-ms') && !!W().querySelector('[data-mday="'+old+'"] .dk-de'));
  W().querySelector('[data-mday="'+old+'"]').click(); await sleep(700);
  ok('clicking it opens that page, lines and all', W().querySelector('.dk-page').dataset.day===old && /An old page line/.test(W().querySelector('.dk-page').innerText));
  W().querySelector('.dk-back').click(); await sleep(200);
  // make it yours
  W().querySelector('.dk-cup').click(); await sleep(150);
  const pop=[...document.querySelectorAll('.ccpop')].pop();
  ok('the pencil cup opens Make it yours', pop && /Make it yours/.test(pop.innerText));
  pop.querySelector('[data-pk="mat"][data-pv="navy"]').click(); await sleep(120);
  ok('a new desk mat is saved and shows', db.desk_settings[0] && db.desk_settings[0].mat==='navy' && W().querySelector('.dk-mat').classList.contains('dk-mat-navy'));
  pop.querySelector('[data-pk="ink"][data-pv="plum"]').click(); pop.querySelector('[data-pk="neat"][data-pv="true"]').click(); await sleep(120);
  ok('plum ink and neat print are saved and show', db.desk_settings[0].ink==='plum' && db.desk_settings[0].neat===true && W().querySelector('.dk-mat').classList.contains('dk-ink-plum') && W().querySelector('.dk-mat').classList.contains('dk-neat'));
  try{ ccPopClose(); }catch(e){}
  // photo
  const c=document.createElement('canvas'); c.width=900; c.height=600; const g=c.getContext('2d'); for(let i=0;i<4000;i++){ g.fillStyle='hsl('+(i*37%360)+',70%,50%)'; g.fillRect(Math.random()*900,Math.random()*600,12,12); }
  const blob=await new Promise(r=>c.toBlob(r,'image/png')); X.photoPicked(new File([blob],'me.png',{type:'image/png'})); await sleep(900);
  const ph=(db.desk_settings[0]||{}).photo||'';
  ok('a photo is made small before it is saved (a JPEG under the size limit)', ph.startsWith('data:image/jpeg;base64,') && ph.length<=78000, ph.length);
  ok('...and shows in the frame on the desk', /url\(/.test(W().querySelector('.dk-img').getAttribute('style')||''));
  ok('nothing was texted, emailed or sent anywhere', window.__fn.length===0);
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={ 'width':1400, 'height':1000 })
    pg.route('**/*', lambda r: r.abort() if ('supabase.co' in r.request.url or 'fonts.g' in r.request.url) else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=desk2'); pg.wait_for_timeout(1200)
    pg.evaluate(STUB); R = pg.evaluate(T)
    pg.screenshot(path='/tmp/my_desk_stage2.png')
    pg.evaluate("()=>{ document.querySelector('#dkWrap [data-dk=\"month\"]').click(); }"); pg.wait_for_timeout(1000); pg.screenshot(path='/tmp/my_desk_stage2_month.png')
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

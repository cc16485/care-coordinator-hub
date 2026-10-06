"""My Desk, Stage 3: owners. The real Hub page, offline, made-up people and lines, a pretend desk database
(window.dkStore) shared by everyone's desk. The database's own rules were proven live by Desktop 463; this checks the
page only ever asks for what an owner may do. Nothing is saved or sent. (python3 tests/browser/my_desk_stage3_look.py)"""
from playwright.sync_api import sync_playwright
STUB = r"""
(()=>{
  const W=window, clone=x=>JSON.parse(JSON.stringify(x));
  W.__fn=[]; W.__calls=[];
  (0,eval)(`sb={ from:()=>{ const p={ select(){return p;}, eq(){return p;}, maybeSingle:async()=>({data:null,error:null}), then(a){ return Promise.resolve({data:[],error:null}).then(a); } }; return p; },
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async(n)=>{ window.__fn.push(n); return {data:null,error:null}; } },
    auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };`);
  W.ccMergeSave=async()=>({changed:[],error:null}); W.opEvent=()=>{};
  const S='samantha@mo-care.com', K='krystal@mo-care.com', Z='zach@mo-care.com', A='angiel@mo-care.com', C='caregiver@example.invalid';
  (0,eval)(`OPS_PEOPLE=[{person_id:'p_s',full_name:'Samantha Troutman',primary_email:'${S}'},{person_id:'p_k',full_name:'Krystal Land',primary_email:'${K}'},
    {person_id:'p_z',full_name:'Zach Example',primary_email:'${Z}'},{person_id:'p_a',full_name:'Angiel Falig',primary_email:'${A}'},{person_id:'p_c',full_name:'Cara Giver',primary_email:'${C}'}];
    CC_ROLE_BY_EMAIL={ '${S}':['owner_admin'], '${Z}':['owner_admin'], '${K}':['care_coordinator'] }; CC_ROLES_CHECKED=true;`);
  W.roleEveryone=()=>[{email:S,name:'Samantha Troutman'},{email:K,name:'Krystal Land'}];
  DATA.ops_settings={ desk_access:{ mode:'some', people:[S,K] } };
  DATA.role_profiles=[{ id:A, title:'Care Coordinator (Medicaid & VA)' }];
  const db=W.__db={ desk_lines:[], desk_stickies:[], desk_settings:[{ person_id:'p_k', mat:'sage', pad_labels:{} }], desk_pages:[], desk_visits:[] };
  const today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Chicago'});
  const old=(()=>{ let d=today; for(let i=0;i<5;i++){ const [y,m,dd]=d.split('-').map(Number); const t=new Date(y,m-1,dd-1); while(t.getDay()===0||t.getDay()===6) t.setDate(t.getDate()-1); d=t.toLocaleDateString('en-CA'); } return d; })();
  db.desk_lines.push({ id:'k1', person_id:'p_k', place:'day', day:today, pos:1, kind:'todo', body:'Call Carol (fake)', origin_day:today, done_at:new Date().toISOString(), rev:1 },
    { id:'k2', person_id:'p_k', place:'day', day:today, pos:2, kind:'todo', body:'Finish Linda\'s care plan (fake)', origin_day:old, rev:1 },
    { id:'k3', person_id:'p_k', place:'day', day:today, pos:3, kind:'note', body:'Mrs. Lee likes calls after 10 (fake)', origin_day:today, rev:1 },
    { id:'s1', person_id:'p_s', place:'day', day:today, pos:1, kind:'todo', body:'Sign the Barnes agreement (fake)', origin_day:today, rev:1 },
    { id:'z1', person_id:'p_z', place:'day', day:today, pos:1, kind:'todo', body:'Review payroll (fake)', origin_day:today, rev:1 });
  db.desk_stickies.push({ id:'ks', person_id:'p_k', color:'pink', body:'Krystal\'s own sticky (fake)', side:'L', x:20, y:120, rot:0, z:1, rev:1 });
  W.__me='p_s';
  W.__fakeStore={
    async me(){ return W.__me; },
    async load(who){ W.__calls.push('load:'+who); return { lines:clone(db.desk_lines.filter(l=>l.person_id===who && !l.erased_at)), stickies:clone(db.desk_stickies.filter(s=>s.person_id===who && !s.erased_at)), settings:clone(db.desk_settings.find(x=>x.person_id===who)||null), pages:clone(db.desk_pages.filter(p=>p.person_id===who)) }; },
    async loadDays(){ return { lines:[], pages:[] }; },
    async insert(t,row){ W.__calls.push('insert:'+t+':'+row.person_id+':'+(row.from_person_id||'')); const r=Object.assign({ rev:1 }, clone(row)); db[t].push(r); return clone(r); },
    async update(t,id,rev,patch){ W.__calls.push('update:'+t+':'+id+':'+Object.keys(patch).join('+')); const r=db[t].find(x=>x.id===id); if(!r||r.rev!==rev) return null; Object.assign(r, clone(patch)); r.rev++; return clone(r); },
    async remove(t,id){ W.__calls.push('remove:'+t+':'+id); db[t]=db[t].filter(x=>x.id!==id); return true; },
    async saveSettings(row){ W.__calls.push('settings:'+row.person_id); return true; },
    async savePage(row){ W.__calls.push('page:'+row.person_id); return true; },
    async visit(desk, me, day){ W.__calls.push('visit:'+desk+':'+me); const i=db.desk_visits.findIndex(v=>v.desk_person_id===desk&&v.visitor_person_id===me&&v.day===day); const v={ desk_person_id:desk, visitor_person_id:me, day, at:new Date().toISOString() }; if(i>=0) db.desk_visits[i]=v; else db.desk_visits.push(v); return true; },
    async visits(desk, day){ return clone(db.desk_visits.filter(v=>v.desk_person_id===desk && v.day===day)); },
    async star(id, on){ W.__calls.push('star:'+id+':'+on); const l=db.desk_lines.find(x=>x.id===id); l.owner_star_by=on?W.__me:null; l.rev++; return true; },
    async everyone(ids, day){ W.__calls.push('everyone:'+ids.join(',')); return { lines:clone(db.desk_lines.filter(l=>ids.includes(l.person_id) && l.day===day && !l.erased_at)), settings:clone(db.desk_settings.filter(x=>ids.includes(x.person_id))), stickies:clone(db.desk_stickies.filter(x=>ids.includes(x.person_id) && !x.erased_at)) }; }
  };
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const db=window.__db, X=window.DKX, C=window.__calls;
  window.dkStore=window.__fakeStore;
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha Troutman', shift:'day' };");
  switchTab('mydesk'); await sleep(400);
  const W=()=>document.getElementById('dkWrap'), tabs=()=>[...W().querySelectorAll('.dk-tab')].map(b=>b.textContent);
  ok('owners see desk tabs: My Desk, then each desk, then Everyone', tabs().join('|')==="My Desk|Angiel's Desk|Krystal's Desk|Zach's Desk|Everyone", tabs());
  ok('...built from who has a desk (a caregiver with no desk role or title gets none)', !tabs().some(t=>/Cara/.test(t)));
  // Krystal's desk
  [...W().querySelectorAll('.dk-tab')].find(b=>/Krystal/.test(b.textContent)).click(); await sleep(400);
  ok('opening Krystal\'s desk shows her page and her desk mat', /Call Carol/.test(W().innerText) && W().querySelector('.dk-mat').classList.contains('dk-mat-sage') && !/Sign the Barnes/.test(W().innerText));
  ok('...says you are at her desk and she will see it', /You are at Krystal's desk\. Krystal will see you stopped by\./.test(W().querySelector('.dk-strip').innerText));
  ok('...records the stop-by', db.desk_visits.some(v=>v.desk_person_id==='p_k' && v.visitor_person_id==='p_s'));
  ok('it is read-only: no jot line, no tools, no drag, no checkbox, no eraser, no pencil cup', !document.getElementById('dkJot') && !W().querySelector('.dk-page .dk-tools') && !W().querySelector('.dk-page [data-dkdrag="line"]') && W().querySelector('.dk-page .dk-cb').disabled && !W().querySelector('.dk-eraser') && !W().querySelector('.dk-cup'));
  ok('...her own sticky can\'t be moved or changed by you', !W().querySelector('[data-sid="ks"]').hasAttribute('data-dkdrag') && !W().querySelector('[data-sid="ks"] [data-dk="s-edit"]') && !W().querySelector('[data-sid="ks"] .dk-sbtns'));
  ok('"might need a hand?" on a line carried 4+ days, for owners', /might need a hand\?/.test(W().querySelector('[data-dkid="k2"]').innerText));
  const writes0=C.filter(c=>/^(update|insert|remove|settings|page):/.test(c)).length;
  W().querySelector('[data-dkid="k1"]').click(); await sleep(150);
  ok('clicking a finished line gives it a star (through the checked function only)', C.includes('star:k1:true') && db.desk_lines.find(l=>l.id==='k1').owner_star_by==='p_s' && !!W().querySelector('[data-dkid="k1"] .dk-ostar'));
  W().querySelector('[data-dkid="k2"]').click(); await sleep(150);
  ok('...not an unfinished one', !C.includes('star:k2:true'));
  ok('looking around changed nothing on her desk', C.filter(c=>/^(update|insert|remove|settings|page):/.test(c)).length===writes0, C.slice(-6));
  // a signed note
  W().querySelector('.dk-pad[data-c="yellow"]').click(); await sleep(150);
  ok('the pads say "Leave Krystal a note"', /Leave Krystal a note/.test(W().querySelector('.dk-padh').textContent));
  const ed=document.activeElement; ed.textContent='Can you check on Linda today? (fake)'; ed.blur(); await sleep(200);
  const N=db.desk_stickies.find(s=>s.from_person_id==='p_s');
  ok('the note is saved on Krystal\'s desk, signed from you', N && N.person_id==='p_k' && /Linda/.test(N.body) && C.some(c=>c==='insert:desk_stickies:p_k:p_s'));
  const nEl=W().querySelector('[data-sid="'+N.id+'"]');
  ok('...with washi tape, "Your note to Krystal", your signature, and "Not seen yet"', nEl.classList.contains('dk-owner') && /Your note to Krystal/i.test(nEl.innerText) && /Samantha/.test(nEl.querySelector('.dk-sig').textContent) && /Not seen yet/.test(nEl.innerText));
  ok('...you can move your own note and take it back', nEl.hasAttribute('data-dkdrag') && !!nEl.querySelector('[data-dk="s-back"]'));
  // Everyone
  [...W().querySelectorAll('.dk-tab')].find(b=>/Everyone/.test(b.textContent)).click(); await sleep(400);
  ok('Everyone shows each desk\'s page today (not yours), on their own mat', W().querySelectorAll('.dk-evcard').length===3 && /Call Carol/.test(W().innerText) && /Review payroll/.test(W().innerText) && !/Sign the Barnes/.test(W().innerText));
  ok('...no counts, scores or "last active" anywhere', !/\b\d+ (done|open|crossed|%)\b|last active|score/i.test(W().querySelector('.dk-evgrid').innerText));
  W().querySelector('.dk-evcard[data-who="p_z"]').click(); await sleep(300);
  ok('clicking a desk in Everyone opens it (an owner can look at another owner\'s desk)', /Zach's desk/.test(W().querySelector('.dk-strip').innerText) && /Review payroll/.test(W().innerText));
  [...W().querySelectorAll('.dk-tab')].find(b=>b.textContent==='My Desk').click(); await sleep(300);
  ok('back on My Desk it is yours and writable again', /Sign the Barnes/.test(W().innerText) && !!document.getElementById('dkJot') && !W().querySelector('.dk-strip'));

  // ── KRYSTAL'S SIDE ──
  window.__me='p_k'; (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Land', shift:'day' };");
  X.openDesk(null); await sleep(500);
  ok('Krystal sees no desk tabs (only owners do)', !W().querySelector('.dk-tabs'));
  ok('Krystal sees "Samantha stopped by your desk today at …"', /Samantha stopped by your desk today at \d/.test(W().querySelector('.dk-visit').innerText));
  const n2=W().querySelector('[data-sid="'+N.id+'"]');
  ok('Krystal sees "Samantha left you a note", signed, with washi tape', /Samantha left you a note/i.test(n2.innerText) && n2.classList.contains('dk-owner'));
  ok('...it is marked seen now that her desk is open', !!db.desk_stickies.find(s=>s.id===N.id).seen_at);
  ok('...she can move it but not change its words', n2.hasAttribute('data-dkdrag') && !n2.querySelector('[data-dk="s-edit"]'));
  ok('Krystal sees the gold star on her finished line, with who gave it', /Samantha gave this a star/.test(W().querySelector('[data-dkid="k1"] .dk-ostar title').textContent));
  ok('...and no "might need a hand?" (that is for owners)', !/might need a hand/.test(W().innerText));
  n2.querySelector('[data-dk="s-ack"]').click(); await sleep(150);
  ok('"Got it" is saved', !!db.desk_stickies.find(s=>s.id===N.id).ack_at && /You said got it/.test(W().querySelector('[data-sid="'+N.id+'"]').innerText));
  // back to Samantha: the receipt
  window.__me='p_s'; (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha Troutman', shift:'day' };");
  X.openDesk('p_k'); await sleep(400);
  ok('back at Krystal\'s desk, your note says "Krystal said got it"', /Krystal said got it/.test(W().querySelector('[data-sid="'+N.id+'"]').innerText));
  W().querySelector('[data-sid="'+N.id+'"] [data-dk="s-back"]').click(); await sleep(150);
  ok('taking a note back removes it', !db.desk_stickies.some(s=>s.id===N.id) && C.includes('remove:desk_stickies:'+N.id));
  ok('nothing was texted, emailed or sent anywhere', window.__fn.length===0);
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={ 'width':1400, 'height':1000 })
    pg.route('**/*', lambda r: r.abort() if ('supabase.co' in r.request.url or 'fonts.g' in r.request.url) else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=desk3'); pg.wait_for_timeout(1200)
    pg.evaluate(STUB); R = pg.evaluate(T)
    pg.evaluate("async()=>{ window.__db.desk_stickies.push({ id:'nn', person_id:'p_k', from_person_id:'p_s', color:'honey', body:'Can you check on Linda today? (fake)', side:'R', x:40, y:150, rot:3, z:5, seen_at:new Date().toISOString(), rev:1 }); await window.DKX.openDesk('p_k'); await new Promise(r=>setTimeout(r,500)); }")
    pg.screenshot(path='/tmp/my_desk_stage3.png')
    pg.evaluate("async()=>{ await window.DKX.openEveryone(); await new Promise(r=>setTimeout(r,400)); }"); pg.screenshot(path='/tmp/my_desk_stage3_everyone.png')
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

"""My Desk, Stage 6a: kind words (arrive tucked under the page; Into the jar, Tape it, Read it at Stand-Up, Tell the
caregiver; the shared jar; clip by hand or from selected words). Based on Stage 4's set-up: the Stand-Up tray (through the real Stand-Up board and Prepare Stand-Up), the Stand-Up schedule in
Team Meetings, "Jot on my desk" in + Add, the desk step in End My Shift and the ribbon, and the Friday card. The real Hub
page, offline, made-up people and lines; the desk and the Hub lists are pretend stores. Nothing is saved or sent.
(python3 tests/browser/my_desk_stage4_look.py, with the static server on 8765)"""
from playwright.sync_api import sync_playwright
STUB = r"""
(()=>{
  const W=window, clone=x=>JSON.parse(JSON.stringify(x));
  W.__fn=[]; W.__calls=[]; W.__merge=[]; W.__clips=[];
  W.__kwords=[{ id:'k1', quote:'Maria is the best thing that has happened to Mom this year. (fake)', who:'The Henderson family', about:'Maria R.', about_role:'caregiver', source:'shift_note', said_on:'2026-10-03', status:'kind', created_by:'p_s' },
              { id:'k2', quote:'Kind, on time, and they call you back. (fake)', who:'A Google review', about:'Caring Companions', about_role:'', source:'review', said_on:'2026-09-21', status:'kind', created_by:'p_s' },
              { id:'k3', quote:'Dad asked for James by name today. (fake)', who:'The Wilson family', about:'James T.', about_role:'caregiver', source:'call', said_on:'2026-09-24', status:'kind', created_by:'p_s' }];
  W.__kdrops=[{ kind_word_id:'k1', person_id:'p_k', state:'tucked' }, { kind_word_id:'k2', person_id:'p_k', state:'tucked' }, { kind_word_id:'k3', person_id:'p_k', state:'tucked' }];
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
    async kindDrops(me){ W.__calls.push('kindDrops'); return clone(W.__kdrops.filter(d=>d.state!=='done').map(d=>Object.assign({}, d, { kind_words:W.__kwords.find(k=>k.id===d.kind_word_id) }))); },
    async dropState(kw, me, st){ W.__calls.push('drop:'+kw+':'+st); const d=W.__kdrops.find(x=>x.kind_word_id===kw); if(d) d.state=st; return true; },
    async jar(){ return clone(W.__kwords.filter(k=>k.status==='kind')); },
    async jarCount(){ return W.__kwords.filter(k=>k.status==='kind').length; },
    async clip(f){ W.__calls.push('clip'); W.__clips.push(clone(f)); const k=Object.assign({ id:'kw'+(W.__kwords.length+1), status:'kind', created_by:'p_k' }, clone(f)); W.__kwords.push(k); return { id:k.id, tucked:2 }; },
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
  const db=window.__db, X=window.DKX, S=window.__store, C=window.__calls;
  window.dkStore=window.__fakeStore;
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Land', shift:'day' };");
  switchTab('mydesk'); await sleep(500);
  const W=()=>document.getElementById('dkWrap'), lastPop=()=>[...document.querySelectorAll('.ccpop')].pop();
  ok('kind words that came in are tucked under the page, with how many', /Kind words came in/i.test(W().querySelector('.dk-kindtuck').innerText) && W().querySelector('.dk-kn').textContent==='3');
  ok('the Kind Words jar is on the desk', !!W().querySelector('.dk-jar'));
  W().querySelector('.dk-kindtuck').click(); await sleep(150);
  let p=lastPop();
  ok('it unfolds: the words, who said them, about whom, from where', /Maria is the best/.test(p.innerText) && /The Henderson family, about Maria R\. \(caregiver\)/.test(p.innerText) && /Shift note/.test(p.innerText));
  ok('...with Into the jar, Tape it to my desk, Read it at Stand-Up, Tell Maria', ['jar','tape','standup','tell'].every(k=>!!p.querySelector('[data-k="'+k+'"]')) && /Tell Maria/.test(p.innerText));
  p.querySelector('[data-k="tell"]').click(); await sleep(150);
  ok('"Tell Maria" opens the text to Maria (from the office number, sent only on Send; tested in kind_tell_look.py)', /Tell Maria/.test(lastPop().innerText));
  try{ ccPopClose(); }catch(e){}
  W().querySelector('.dk-kindtuck').click(); await sleep(150);
  lastPop().querySelector('[data-k="tape"]').click(); await sleep(400);
  ok('"Tape it to my desk": it is taped up on the desk', C.includes('drop:k1:taped') && /Maria is the best/.test(W().querySelector('.dk-taped').innerText));
  p=lastPop(); ok('...and the next one unfolds', p && /Kind, on time/.test(p.innerText));
  p.querySelector('[data-k="standup"]').click(); await sleep(600);
  const card=db.desk_lines.find(l=>l.place==='day' && /Read out loud/.test(l.body) && l.standup_item_id);
  ok('"Talk about it": a line on today\'s page to read out loud, flagged on the To talk about list', card && /A Google review about Caring Companions/.test(card.body) && C.includes('drop:k2:done') && S.standup_notes.some(x=>x.desk_line_id===card.id));
  p=lastPop(); p.querySelector('[data-k="jar"]').click(); await sleep(300);
  ok('"Into the jar": off the desk (it was already in the office jar)', C.includes('drop:k3:done') && !W().querySelector('.dk-kindtuck'));
  W().querySelector('.dk-taped [data-dk="taped-jar"]').click(); await sleep(200);
  ok('taking the taped one down leaves it in the jar', C.includes('drop:k1:done') && !W().querySelector('.dk-taped'));
  W().querySelector('.dk-jar').click(); await sleep(300);
  p=lastPop();
  ok('the jar opens to everything the office saved, with who saved it', p.querySelectorAll('.dk-jslip').length===3 && /Saved by Samantha/.test(p.innerText));
  p.querySelector('[data-j="clip"]').click(); await sleep(150);
  p=lastPop(); p.querySelector('#dkKq').value='Thank you for finding someone on a Sunday. (fake)'; p.querySelector('#dkKw').value="Carol's daughter"; p.querySelector('#dkKs').value='text';
  p.querySelector('[data-k="save"]').click(); await sleep(300);
  const cl=window.__clips[0];
  ok('clipping one by hand puts it in the jar (the database tucks it under the right desks)', cl && /Sunday/.test(cl.quote) && cl.who==="Carol's daughter" && cl.source==='text' && cl.about_role==='' && /Tucked under 2 desks/.test(document.getElementById('dkToast').innerText));
  // from selected words, on a caregiver's page
  switchTab('today'); await sleep(200);
  const lpv=document.getElementById('leadProfileView'); lpv.style.display='block'; (0,eval)("CP.ax='77'; CP.lead=null; CP.r={ client_name:'Ruth Barnes (fake)', axiscare_client_id:'77' };");
  const para=document.createElement('p'); para.textContent='Ruth said Tia is the kindest person she knows.'; lpv.appendChild(para);
  const r=document.createRange(); r.selectNodeContents(para); getSelection().removeAllRanges(); getSelection().addRange(r);
  para.dispatchEvent(new MouseEvent('mouseup',{bubbles:true})); await sleep(80);
  const pill=document.querySelector('.dk-jotpill');
  ok('selected words offer "Clip as kind words" next to "Jot it on my desk"', pill && !!pill.querySelector('[data-p="kind"]') && !!pill.querySelector('[data-p="jot"]'));
  pill.querySelector('[data-p="kind"]').click(); await sleep(150);
  p=lastPop();
  ok('...which opens the clip form with the words in and Ruth\'s paperclip', p.querySelector('#dkKq').value==='Ruth said Tia is the kindest person she knows.' && /paperclip to Ruth Barnes/.test(p.innerText));
  p.querySelector('#dkKw').value='Ruth Barnes'; p.querySelector('#dkKa').value='Tia K.'; p.querySelector('#dkKr').value='caregiver'; p.querySelector('[data-k="save"]').click(); await sleep(300);
  const c2=window.__clips[1];
  ok('...saved about the caregiver, clipped to the client', c2 && c2.about==='Tia K.' && c2.about_role==='caregiver' && c2.link && c2.link.ax==='77');
  lpv.style.display='none';
  ok('nothing was texted or emailed', window.__fn.length===0);
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={ 'width':1400, 'height':1000 })
    pg.route('**/*', lambda r: r.abort() if ('supabase.co' in r.request.url or 'fonts.g' in r.request.url) else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=desk6'); pg.wait_for_timeout(1200)
    pg.evaluate(STUB); pg.evaluate(EXTRA); R = pg.evaluate(T)
    pg.evaluate("async()=>{ window.__kdrops.push({ kind_word_id:'k3', person_id:'p_k', state:'taped' }); window.__kdrops.push({ kind_word_id:'k2', person_id:'p_k', state:'tucked' }); switchTab('mydesk'); await window.DKX.load(true); await new Promise(r=>setTimeout(r,400)); }")
    pg.screenshot(path='/tmp/my_desk_stage6a.png')
    pg.evaluate("async()=>{ document.querySelector('#dkWrap .dk-jar').click(); await new Promise(r=>setTimeout(r,400)); }"); pg.screenshot(path='/tmp/my_desk_stage6a_jar.png')
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

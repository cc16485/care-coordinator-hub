"""My Desk: repeating tasks (495, Samantha 2026-10-07 "yes to all"). The real Hub page, offline, a pretend desk database. Proves: the rules
(every weekday, every 2 weeks from a date, monthly, last business day, skips, until); a due rule puts a line on the day's page with the ↻ chip
when the page opens, once; done is per day; Skip this time erases today's line and remembers the day; Make this repeat from a line's menu
writes a rule and the line becomes its first instance; the Repeating list with Change and Stop; an OWNER on Krystal's desk adds a signed
repeating task (from Samantha) that Krystal sees as a line she can tick and skip but not stop; the owner sees it as a virtual line before
Krystal opens the page. Nothing is sent. (python3 tests/browser/my_desk_repeats_look.py)"""
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
  const db=W.__db={ desk_lines:[], desk_stickies:[], desk_settings:[{ person_id:'p_k', mat:'sage', pad_labels:{} }], desk_pages:[], desk_visits:[], desk_repeats:[] };
  const today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Chicago'});
  const old=(()=>{ let d=today; for(let i=0;i<5;i++){ const [y,m,dd]=d.split('-').map(Number); const t=new Date(y,m-1,dd-1); while(t.getDay()===0||t.getDay()===6) t.setDate(t.getDate()-1); d=t.toLocaleDateString('en-CA'); } return d; })();
  db.desk_repeats.push({ id:'rk', person_id:'p_k', from_person_id:null, body:'Check the EVV queue (fake)', time_text:null, rule:{ kind:'weekdays' }, start_day:'2026-01-01', end_day:null, skips:[], link:null, active:true, rev:1 });
  db.desk_lines.push({ id:'k1', person_id:'p_k', place:'day', day:today, pos:1, kind:'todo', body:'Call Carol (fake)', origin_day:today, done_at:new Date().toISOString(), rev:1 },
    { id:'k2', person_id:'p_k', place:'day', day:today, pos:2, kind:'todo', body:'Finish Linda\'s care plan (fake)', origin_day:old, rev:1 },
    { id:'k3', person_id:'p_k', place:'day', day:today, pos:3, kind:'note', body:'Mrs. Lee likes calls after 10 (fake)', origin_day:today, rev:1 },
    { id:'s1', person_id:'p_s', place:'day', day:today, pos:1, kind:'todo', body:'Sign the Barnes agreement (fake)', origin_day:today, rev:1 },
    { id:'z1', person_id:'p_z', place:'day', day:today, pos:1, kind:'todo', body:'Review payroll (fake)', origin_day:today, rev:1 });
  db.desk_stickies.push({ id:'ks', person_id:'p_k', color:'pink', body:'Krystal\'s own sticky (fake)', side:'L', x:20, y:120, rot:0, z:1, rev:1 });
  W.__me='p_s';
  W.__fakeStore={
    async me(){ return W.__me; },
    async load(who){ W.__calls.push('load:'+who); return { lines:clone(db.desk_lines.filter(l=>l.person_id===who && !l.erased_at)), stickies:clone(db.desk_stickies.filter(s=>s.person_id===who && !s.erased_at)), settings:clone(db.desk_settings.find(x=>x.person_id===who)||null), pages:clone(db.desk_pages.filter(p=>p.person_id===who)), repeats:clone(db.desk_repeats.filter(r=>r.person_id===who && !r.erased_at)) }; },
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
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const db=window.__db, X=window.DKX, C=window.__calls;
  window.dkStore=window.__fakeStore;
  /* the rules on their own */
  const wk={ active:true, rule:{ kind:'weekdays' }, start_day:'2026-01-01', skips:[] };
  ok('rule · every weekday: Mon yes, Sat no; a skipped day no; before the start day no; after until no', X.repeatDue(wk,'2026-10-05') && !X.repeatDue(wk,'2026-10-10') && !X.repeatDue(Object.assign({},wk,{skips:['2026-10-05']}),'2026-10-05') && !X.repeatDue(Object.assign({},wk,{start_day:'2026-10-06'}),'2026-10-05') && !X.repeatDue(Object.assign({},wk,{end_day:'2026-10-01'}),'2026-10-05'));
  const bi={ active:true, rule:{ kind:'biweekly', anchor:'2026-10-09' }, start_day:'2026-10-09', skips:[] };
  ok('rule · every 2 weeks from Fri Oct 9: Oct 9 and Oct 23 yes, Oct 16 no, Oct 2 (before) no', X.repeatDue(bi,'2026-10-09') && X.repeatDue(bi,'2026-10-23') && !X.repeatDue(bi,'2026-10-16') && !X.repeatDue(bi,'2026-10-02'));
  ok('rule · monthly on the 31st falls on the 30th in a 30-day month; the last business day of Oct 2026 is Fri the 30th', X.repeatDue({ active:true, rule:{ kind:'monthly', dom:31 }, skips:[] },'2026-11-30') && !X.repeatDue({ active:true, rule:{ kind:'monthly', dom:31 }, skips:[] },'2026-11-29') && X.lastBiz('2026-10')==='2026-10-30' && X.repeatDue({ active:true, rule:{ kind:'last_biz' }, skips:[] },'2026-10-30'));
  ok('rule · words: "every 2 weeks on Friday (from Fri 9)", "monthly on the 15th · 9 am", "the last business day of the month"', X.repeatWords(bi)==='every 2 weeks on Friday (from Fri 9)' && X.repeatWords({ rule:{ kind:'monthly', dom:15 }, time_text:'9 am' })==='monthly on the 15th · 9 am' && X.repeatWords({ rule:{ kind:'last_biz' } })==='the last business day of the month', [X.repeatWords(bi)]);
  ok('rule · a stopped rule is never due', !X.repeatDue(Object.assign({},wk,{active:false}),'2026-10-05'));
  /* Krystal opens her own desk on a weekday */
  const today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Chicago'}), isWk=[0,6].includes(new Date(today+'T12:00:00').getDay());
  window.__me='p_k'; document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Land', shift:'day' };");
  switchTab('mydesk'); await sleep(500);
  const W=()=>document.getElementById('dkWrap'), lines=()=>db.desk_lines.filter(l=>l.person_id==='p_k' && !l.erased_at && l.day===today && l.link && l.link.repeat_id);
  if(isWk) ok('(weekend today: the weekday rule is not due, the first checks are skipped)', true);
  else {
    ok('opening today\'s page writes the due line once, with the ↻ chip ("every weekday")', lines().length===1 && lines()[0].body==='Check the EVV queue (fake)' && /↻ repeats/.test(W().innerText) && W().querySelector('.dk-chip.dk-rep').title==='every weekday', [lines().length, W().innerText.slice(0,300)]);
    await X.load(true); await sleep(200);
    ok('...loading again does not write a second one', lines().length===1);
    const id=lines()[0].id; X.toggle(id); await sleep(150);
    ok('ticking it done is for today only (the rule is untouched)', db.desk_lines.find(l=>l.id===id).done_at && db.desk_repeats[0].active===true && !db.desk_repeats[0].skips.length);
    X.toggle(id); await sleep(100); X.repeatSkip(id); await sleep(200);
    ok('Skip this time: today\'s line is erased and the day is remembered on the rule', db.desk_lines.find(l=>l.id===id).erased_at && db.desk_repeats[0].skips.includes(today) && C.some(c=>c.startsWith('update:desk_repeats:rk:skips')), [db.desk_repeats[0].skips, C.filter(c=>c.includes('desk_repeats'))]);
    await X.load(true); await sleep(200);
    ok('...and it does not come back today', lines().filter(l=>!l.erased_at).length===0);
  }
  /* Make this repeat from an ordinary line */
  X.addLine('Payroll (fake)'); await sleep(150);
  const pl=db.desk_lines.find(l=>l.body==='Payroll (fake)');
  X.repeatOpen(document.body, { lineId:pl.id }); await sleep(100);
  let m=document.getElementById('dkMenu');
  ok('Make this repeat opens the form with the line\'s words and the six kinds', m && /Make this repeat/.test(m.innerText) && /Payroll \(fake\)/.test(m.innerText) && m.querySelectorAll('#rpKind option').length===6, m && m.innerText.slice(0,200));
  m.querySelector('#rpKind').value='biweekly'; m.querySelector('#rpKind').dispatchEvent(new Event('change')); m.querySelector('#rpAnchorIn').value='2026-10-09'; m.querySelector('#rpTime').value='9 am'; m.querySelector('[data-rp="save"]').click(); await sleep(300);
  const pr=db.desk_repeats.find(r=>r.body==='Payroll (fake)');
  ok('...saves a rule for Krystal (every 2 weeks from Oct 9, 9 am, unsigned) and the line becomes its first instance', pr && pr.person_id==='p_k' && pr.from_person_id===null && pr.rule.kind==='biweekly' && pr.rule.anchor==='2026-10-09' && pr.time_text==='9 am' && db.desk_lines.find(l=>l.id===pl.id).link.repeat_id===pr.id, pr);
  ok('the Repeating list under the Later folder shows it with Change and Stop', (document.querySelector('[data-dk="rep-open"]').click(), true) && (await sleep(150), /Repeating \(2\)/.test(W().innerText) && /Payroll \(fake\)[\s\S]*every 2 weeks on Friday/.test(W().innerText) && W().querySelectorAll('[data-dk="rep-stop"]').length===2), W().innerText.slice(W().innerText.indexOf('Repeating')));
  window.confirm=()=>true; X.repeatStop(pr.id); await sleep(200);
  ok('Stop repeating: the rule is switched off; the line already on the page stays', db.desk_repeats.find(r=>r.id===pr.id).active===false && !db.desk_lines.find(l=>l.id===pl.id).erased_at);
  /* an OWNER on Krystal's desk */
  window.__me='p_s'; (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha Troutman', shift:'day' };"); window.DK.me=null; await X.load(true); await sleep(300);
  await X.openDesk('p_k'); await sleep(400);
  ok('Samantha at Krystal\'s desk: the Repeating list offers "Add a repeating task for Krystal"', /Add a repeating task for Krystal/.test(W().innerText) || (document.querySelector('[data-dk="rep-open"]').click(), await sleep(150), /Add a repeating task for Krystal/.test(W().innerText)), W().innerText.slice(W().innerText.indexOf('Repeating')));
  document.querySelector('[data-dk="rep-add"]').click(); await sleep(100); m=document.getElementById('dkMenu');
  ok('...the form says it is signed from Samantha and that Krystal can tick and skip but not change it', /signed from Samantha/.test(m.innerText) && /Krystal can tick it done each time and skip a day; only you can change or stop it/.test(m.innerText), m.innerText);
  m.querySelector('#rpBody').value='Payroll timesheets to Samantha (fake)'; m.querySelector('#rpKind').value='weekly'; m.querySelector('#rpKind').dispatchEvent(new Event('change'));
  [...m.querySelectorAll('#rpDays input')].forEach(i=>{ i.checked=(i.value==='5'); }); m.querySelector('[data-rp="save"]').click(); await sleep(300);
  const sr=db.desk_repeats.find(r=>/timesheets/.test(r.body));
  ok('...saves a SIGNED rule on Krystal\'s desk (person Krystal, from Samantha, weekly Fri), and writes no line (only Krystal\'s own browser writes her lines)', sr && sr.person_id==='p_k' && sr.from_person_id==='p_s' && sr.rule.kind==='weekly' && sr.rule.days.join()==='5' && !db.desk_lines.some(l=>l.link && l.link.repeat_id===sr.id), [sr, C.filter(c=>c.startsWith('insert:desk_lines')).slice(-2)]);
  /* the owner sees it as a virtual line on the next Friday page; Krystal sees it as a real line with "from Samantha" */
  const fri=(()=>{ let d=new Date(today+'T12:00:00'); do{ d.setDate(d.getDate()+1); }while(d.getDay()!==5); return d.toLocaleDateString('en-CA'); })();
  X.flipTo(fri); await sleep(300);
  ok('Samantha flips to Friday: the signed task shows as a line "↻ repeats · from Samantha" (read-only, not written)', /Payroll timesheets to Samantha \(fake\)/.test(W().innerText) && /from Samantha/.test(W().innerText) && !db.desk_lines.some(l=>l.link && l.link.repeat_id===sr.id), W().innerText.slice(0,400));
  ok('...she cannot stop Krystal\'s own (stopped) rule and sees Change/Stop only on hers', W().querySelectorAll('[data-dk="rep-stop"]').length===1 && W().querySelector('[data-dk="rep-stop"]').dataset.rid===sr.id);
  window.__me='p_k'; (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Land', shift:'day' };"); window.DK.me=null; window.DK.who=null; await X.load(true); await sleep(300); X.flipTo(fri); await sleep(300);
  const kl=db.desk_lines.find(l=>l.person_id==='p_k' && l.link && l.link.repeat_id===sr.id && l.day===fri);
  ok('Krystal opens Friday: the signed task is written as her line, from Samantha, and her menu offers Skip but not Stop or Change', kl && kl.link.from==='p_s' && (document.querySelector('[data-dkid="'+kl.id+'"] [data-dk="more"]').click(), await sleep(100), /Skip this time/.test(document.getElementById('dkMenu').innerText) && !/Stop repeating/.test(document.getElementById('dkMenu').innerText) && !/Change the repeat/.test(document.getElementById('dkMenu').innerText)), kl && document.getElementById('dkMenu') && document.getElementById('dkMenu').innerText);
  document.body.click(); await sleep(50);
  ok('no line is ever written on someone else\'s desk (every desk_lines insert was by its own person)', C.filter(c=>c.startsWith('insert:desk_lines')).every(c=>c.split(':')[2]==='p_k'), C.filter(c=>c.startsWith('insert:desk_lines')));
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1360, 'height': 1000})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=repeats'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T)
    pg.screenshot(path='tests/browser/repeats.png', full_page=True)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

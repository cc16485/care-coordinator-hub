"""Stand-Up and Team Meetings in Today (2026-10-05). The real page, offline, fake data only: every Supabase read is
answered from an in-memory copy of app_data and every save lands in that copy, so nothing reaches the live Hub and
nobody is texted or emailed. (python3 tests/browser/standup_look.py, with the static server on 8765)"""
import re
from playwright.sync_api import sync_playwright

ROOT = '/Users/samantha/Claude/Projects/cc-hub-live/'
SRC = open(ROOT + 'standup-board.js').read()
HUB = open(ROOT + 'index.html').read()

STUB = r"""
(()=>{
  const W=window, iso=d=>new Date(Date.now()+d*864e5).toISOString(), ymd=d=>new Date(Date.now()+d*864e5).toLocaleDateString('en-CA',{timeZone:'America/Chicago'});
  W.__iso=iso; W.__ymd=ymd; W.__log={ reads:[], writes:[], rpc:[], fn:[], fetch:[], opened:[] };
  const K='kat@mo-care.com', J='jess@mo-care.com';
  W.__store={
    standup_notes:[
      { id:'old1', summary:'Legacy call-out from Saturday', category:'Caregiver / Scheduling', occurred_at:iso(-6), reported_by:'Night On-Call', assigned_to:'Kat', assigned_to_id:'td1', resolved:false, created_at:iso(-6) },
      { id:'old2', summary:'Fixed the fax', category:'General', occurred_at:iso(-2), reported_by:'Jess', resolved:true, resolved_by:'Jess', resolved_at:iso(-1), created_at:iso(-2) },
      { id:'old3', summary:'Due soon item', category:'Client', occurred_at:iso(-3), due:ymd(2), assigned_to_email:J, status:'open', created_at:iso(-3) },
      { id:'old4', summary:'Overdue thing', category:'Incident', occurred_at:iso(-1), due:ymd(-1), status:'open', created_at:iso(-1) },
      { id:'old5', summary:'Brand new urgent', category:'Lead', occurred_at:iso(-0.1), urgent:true, assigned_to_email:K, status:'open', created_at:iso(-0.1) } ],
    team_meetings:[
      { id:'mt_old', meeting_date:ymd(-14), meeting_name:'Weekly Team Meeting', attendees:'Kat, Jess', notes:'old notes', action_items:'Call the county\nFix the fax', transcript_url:'javascript:window.__pwned=9', source:'manual', created_at:iso(-14) },
      { id:'mt_staff', meeting_date:ymd(-3), meeting_name:'Staffing Sync', attendees:'Jess', notes:'staffing notes', action_ids:['old3'], transcript_url:'https://example.com/transcript', source:'manual', created_at:iso(-3) } ],
    ops_settings:{ afternoon_interviews:{ from:'14:00' }, team_video_room:{ room_name:'CaringCompanions-TeamHub-test123', copied_from:'team_hub_settings' } } };
  const clone=x=>JSON.parse(JSON.stringify(x));
  function q(table){
    const st={ ops:[], key:null };
    const res=(one)=>{ W.__log.reads.push(table+':'+(st.key||'')+':'+st.ops.join('.'));
      if(table==='app_data'&&st.key!==null){ if(W.__offline) return { data:null, error:{ message:'offline' } };
        return { data: W.__store[st.key]? { data: clone(W.__store[st.key]) } : null, error:null }; }
      return { data: one?null:[], error:null }; };
    const p=new Proxy(function(){}, { get(_,k){
      if(k==='then') return (a,b)=>Promise.resolve(res(false)).then(a,b);
      if(k==='maybeSingle'||k==='single') return ()=>Promise.resolve(res(true));
      return (...args)=>{ st.ops.push(String(k)); if(k==='eq'&&args[0]==='key') st.key=args[1]; return p; }; } });
    return p;
  }
  (0,eval)("sb={ from:(t)=>window.__q(t), rpc:(n)=>{ window.__log.rpc.push(n); return Promise.resolve({data:null,error:null}); }, auth:{ getSession:async()=>({data:{session:null}}), getUser:async()=>({data:{user:null}}) }, functions:{ invoke:async(n)=>{ window.__log.fn.push(n); return {data:null,error:null}; } }, storage:{ from:()=>({ list:async()=>({data:[],error:null}) }) } }");
  W.__q=q;
  W.persist=async(k,item)=>{ W.__log.writes.push(k+':'+item.id); const a=W.__store[k]=W.__store[k]||[]; const i=a.findIndex(x=>x.id===item.id); const c=clone(item); if(i>=0) a[i]=c; else a.push(c); };
  /* the Dashboard's open-shifts card (not part of this change) gets an empty day back, shaped like the real answer */
  W.fetch=async(u)=>{ W.__log.fetch.push(String(u)); return new Response(/coverage-shifts/.test(String(u))?'{"open":[],"total":0}':'{}',{status:200}); };
  W.__me={ email:K, name:'Kat Smith' };
  W.ccActor=()=>W.__me;
  W.roleEveryone=()=>[{ email:K, name:'Kat Smith' },{ email:J, name:'Jess Lee' },{ email:'sam@mo-care.com', name:'Samantha Owner' }];
  W.ccPickOptions=async()=>{ (0,eval)("CC_PICK_OPTS=[{ name:'Mary Test', ax:'501' },{ name:'Bob Example', ax:'502' }]"); return CC_PICK_OPTS; };
  W.open=(u)=>{ const w={ location:{ href:u||'' }, close(){ w.closed=true; } }; W.__log.opened.push(w); return w; };
})();
"""

T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const S=window.__store, L=window.__log, $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const item=id=>S.standup_notes.find(x=>x.id===id), wrap=()=>$('#suWrap'), cards=()=>$$('#suList > .card');
  const cardFor=txt=>cards().find(c=>c.textContent.includes(txt));
  const popTop=()=>{ const p=$$('.ccpop'); return p[p.length-1]; };
  const clickBtn=(root,txt)=>{ const b=[...root.querySelectorAll('button')].find(x=>x.textContent.trim()===txt); if(!b) throw new Error('no button '+txt); b.click(); };
  document.getElementById('appScreen').classList.add('on');

  /* --- where it lives --- */
  const today=$('#fsub-today');
  ok('Stand-Up and Team Meetings are tabs under Today', !!today.querySelector('[data-tab=standup]') && !!today.querySelector('[data-tab=teammeetings]'));
  ok('the old Meetings tab is gone from the Team section', !$('[data-tab=meetings]') && !$('#tab-meetings'));
  switchTab('meetings'); await sleep(60);
  ok('an old #meetings link lands on Team Meetings', activeTab==='teammeetings', activeTab);
  location.hash='#standup'; await sleep(150);
  ok('the Team Hub link cc.mo-care.com/#standup opens Stand-Up', activeTab==='standup', activeTab);
  location.hash='#teammeetings'; await sleep(150);
  ok('...and #teammeetings opens Team Meetings', activeTab==='teammeetings', activeTab);
  ok('the request-a-meeting card moved into Team Meetings with the same fields', ['mpg_with','mpg_topic','mpg_when','meetingsPageList'].every(id=>$('#tab-teammeetings #'+id)));

  /* --- the board, urgent first, aging --- */
  switchTab('standup'); await sleep(250);
  const order=cards().map(c=>c.querySelector('b').textContent);
  ok('open work: urgent, then overdue, then due date, then the oldest', JSON.stringify(order)===JSON.stringify(['Brand new urgent','Overdue thing','Due soon item','Legacy call-out from Saturday']), order);
  const c1=cardFor('Legacy call-out');
  ok('6 days open shows in red', /open 6 days/.test(c1.textContent) && /var\(--red\)/.test(c1.innerHTML), c1.textContent.slice(0,300));
  const c3=cardFor('Due soon item');
  ok('3 days open shows in amber', /open 3 days/.test(c3.textContent) && /var\(--amber\)/.test(c3.querySelector('.field-note').innerHTML));
  ok('older items keep working: the name typed as "Kat" is matched to Kat Smith', /Assigned to Kat Smith/.test(c1.textContent));
  ok('overdue is marked', /Overdue since/.test(cardFor('Overdue thing').textContent));
  ok('a resolved older item counts as Done, not open', !cardFor('Fixed the fax'));
  suSet('status','done'); await sleep(20);
  ok('...and shows under Done with who did it', /done by Jess/.test((cardFor('Fixed the fax')||{}).textContent||''));
  suSet('status','active');

  /* --- add, with HTML typed into every field --- */
  const evil='<img src=x onerror="window.__pwned=1">Client fell <b>bold</b>';
  clickBtn(wrap(),'＋ Add to Stand-Up'); await sleep(120);
  let f=popTop();
  ok('the add form opens with the client list filled in', !!f && f.querySelectorAll('#suClientList option').length===2);
  f.querySelector('#suF_summary').value=evil; f.querySelector('#suF_category').value='Incident';
  f.querySelector('#suF_client').value='Mary Test · #501'; f.querySelector('#suF_related').value='<script>window.__pwned=2</script>Aide';
  f.querySelector('#suF_assign').value='jess@mo-care.com'; f.querySelector('#suF_due').value=window.__ymd(1); f.querySelector('#suF_urgent').checked=true;
  L.writes.length=0; f.querySelector('#suF_save').click(); await sleep(150);
  const nu=S.standup_notes[S.standup_notes.length-1];
  ok('saved once, as one item', L.writes.length===1 && L.writes[0]==='standup_notes:'+nu.id, L.writes);
  ok('client and category saved (client picked from the list keeps its AxisCare number)', nu.client==='Mary Test' && nu.client_ax==='501' && nu.category==='Incident', nu);
  ok('reported by the signed-in person, automatically', nu.reported_by==='Kat Smith' && nu.reported_by_email==='kat@mo-care.com');
  ok('assigned by person (email), with the name kept for older screens', nu.assigned_to_email==='jess@mo-care.com' && nu.assigned_to==='Jess Lee');
  ok('history starts with who added it', nu.history.length===1 && nu.history[0].what==='Added' && nu.history[0].by==='Kat Smith');
  ok('the new urgent item sorts with the urgent ones (it has a due date, so above the urgent one without)', cards()[0].textContent.includes('Client fell') && cards()[1].textContent.includes('Brand new urgent'), cards().map(c=>c.querySelector('b').textContent));
  ok('typed HTML shows as text and never runs', window.__pwned===undefined && !wrap().querySelector('img') && !wrap().querySelector('script') && wrap().textContent.includes('<img src=x'), window.__pwned);

  /* --- edit, status, update --- */
  suEdit(nu.id); await sleep(100); f=popTop();
  ok('the edit form shows the picked client the same way', f.querySelector('#suF_client').value==='Mary Test · #501', f.querySelector('#suF_client').value);
  f.querySelector('#suF_assign').value=''; f.querySelector('#suF_due').value=window.__ymd(4); f.querySelector('#suF_save').click(); await sleep(150);
  let it=item(nu.id), hw=it.history.map(h=>h.what);
  ok('edits land in the history in words', hw.includes('Unassigned (was Jess Lee)') && hw.some(w=>/^Due \d{4}-/.test(w)) && it.rev===2, hw);
  await suAct(nu.id,'working'); await suAct(nu.id,'done'); it=item(nu.id);
  ok('Done records who and when (and the older resolved fields)', it.status==='done' && it.done_by==='Kat Smith' && it.resolved===true && it.resolved_by==='Kat Smith' && !!it.done_at);
  await suAct(nu.id,'reopen'); it=item(nu.id);
  ok('Reopen puts it back on the board', it.status==='open' && it.resolved===false && !it.done_by && it.history.some(h=>h.what==='Reopened'));
  const pu=suAct(nu.id,'update'); await sleep(80); f=popTop();
  f.querySelector('textarea').value='<img src=x onerror="window.__pwned=3">Called the family'; clickBtn(f,'Save'); await pu; it=item(nu.id);
  ok('an update is saved with who and when', it.updates.length===1 && it.updates[0].by==='Kat Smith' && /Called the family/.test(it.updates[0].text));
  ok('...and shows as text', window.__pwned===undefined && /Called the family/.test(cardFor('Client fell').textContent) && !wrap().querySelector('img'));

  /* --- two people at once --- */
  const o1=item('old1'); o1.assigned_to_email='jess@mo-care.com'; o1.updates=[{ at:new Date().toISOString(), by:'Jess Lee', text:'Jess found cover' }]; o1.rev=5;
  await suAct('old1','done'); const a1=item('old1');
  ok('an out-of-date page does not undo someone else\'s change', a1.status==='done' && a1.assigned_to_email==='jess@mo-care.com' && a1.updates[0].text==='Jess found cover' && a1.rev===6, a1);
  S.standup_notes=S.standup_notes.filter(x=>x.id!=='old4'); L.writes.length=0;
  await suAct('old4','working');
  ok('an item that is gone is not written back', L.writes.length===0 && !S.standup_notes.some(x=>x.id==='old4'), L.writes);
  window.__offline=true; L.writes.length=0; await suAct('old3','working'); window.__offline=false;
  ok('when the Hub cannot be reached, nothing is changed', L.writes.length===0 && item('old3').status==='open');

  /* --- delete is archive --- */
  let pa=suAct(nu.id,'archive'); await sleep(80); clickBtn(popTop(),'Cancel'); await pa;
  ok('Cancel on archive changes nothing', !item(nu.id).archived_at);
  pa=suAct(nu.id,'archive'); await sleep(80); clickBtn(popTop(),'Archive'); await pa; it=item(nu.id);
  ok('Archive keeps the item and its history, off the board', !!it.archived_at && it.archived_by==='Kat Smith' && S.standup_notes.some(x=>x.id===nu.id) && !cardFor('Client fell'));
  suSet('status','archived'); await sleep(20);
  ok('Archived shows it, with Restore', !!cardFor('Client fell') && /Restore/.test(cardFor('Client fell').textContent));
  await suAct(nu.id,'restore'); it=item(nu.id);
  ok('Restore brings it back', !it.archived_at && it.history.some(h=>h.what==='Restored from the archive'));
  suSet('status','active');

  /* --- filters --- */
  const shown=()=>cards().map(c=>c.querySelector('b').textContent).sort();
  suSet('who','mine'); ok('Mine = assigned to me', JSON.stringify(shown())===JSON.stringify(['Brand new urgent']), shown());
  suSet('who','unassigned'); ok('Unassigned', shown().length===1 && shown()[0].includes('Client fell'), shown());
  suSet('who','jess@mo-care.com'); ok('one person', JSON.stringify(shown())===JSON.stringify(['Due soon item']), shown());
  suSet('who','all'); suSet('cat','Incident'); ok('category', shown().length===1 && shown()[0].includes('Client fell'), shown());
  suSet('cat','all'); suSet('q','called the FAMILY',true); ok('search reaches the updates too', shown().length===1, shown());
  suSet('q','mary',true); ok('search reaches the client', shown().length===1, shown()); suSet('q','');
  ok('unassigning really unassigns, after a reload too', (await (async()=>{ SUB.SU.items=null; await suOpen(); return !item(nu.id).assigned_to && !SUB.SU.items.find(x=>x.id===nu.id).assigned_to_email; })()));
  S.standup_notes.push({ id:'old6', summary:'Typed-name item', occurred_at:window.__iso(-1), assigned_to:'Night Nurse', resolved:false, created_at:window.__iso(-1) });
  await suOpen(); suEdit('old6'); await sleep(100); f=popTop();
  ok('an older typed name nobody matches is kept by an edit', f.querySelector('#suF_assign').value==='__keep');
  f.querySelector('#suF_urgent').checked=true; f.querySelector('#suF_save').click(); await sleep(150);
  ok('...and stays after saving', item('old6').assigned_to==='Night Nurse' && item('old6').urgent===true);
  suEdit('old6'); await sleep(100); f=popTop(); f.querySelector('#suF_assign').value=''; f.querySelector('#suF_save').click(); await sleep(150);
  ok('...until someone picks Unassigned', item('old6').assigned_to==='' && item('old6').history.some(h=>h.what==='Unassigned (was Night Nurse)'), item('old6'));
  pa=suAct('old6','archive'); await sleep(80); clickBtn(popTop(),'Archive'); await pa;

  /* --- Today line and My Team --- */
  const tl=$('#suTodayLine'); suTodayRender(); await sleep(30);
  ok('Today shows my open and urgent count', /1 open for you · 1 urgent/.test(tl.textContent), tl.textContent);
  const mt=suTeamCountHtml('kat@mo-care.com'), mj=suTeamCountHtml('jess@mo-care.com');
  ok('My Team card line: open and urgent stand-up items per person', /1 open stand-up · <b[^>]*>1 urgent<\/b>/.test(mt) && /^<span[^>]*>1 open stand-up<\/span>$/.test(mj), [mt,mj]);

  /* --- Team Meetings --- */
  switchTab('teammeetings'); await sleep(250);
  const tw=$('#tmWrap');
  ok('meetings in month folders, newest first', $$('#tmList > div').filter(d=>/^[A-Z]+ \d{4}$/.test(d.textContent)).length>=1 && tw.textContent.indexOf('Staffing Sync')<tw.textContent.indexOf('Weekly Team Meeting'));
  tmToggle('mt_old'); tmToggle('mt_staff'); await sleep(20);
  ok('older action items (typed lines) still show, marked as older', /Call the county.*older note/.test(tw.textContent));
  ok('a javascript: transcript is never a link; an https one is', ![...tw.querySelectorAll('a')].some(a=>/^javascript/i.test(a.getAttribute('href'))) && [...tw.querySelectorAll('a')].some(a=>a.getAttribute('href')==='https://example.com/transcript'));
  ok('a meeting\'s board items show their live status', /Due soon item.*Open/.test(tw.textContent));

  tmEdit(); await sleep(120); f=popTop();
  f.querySelector('#tmF_date').value=window.__ymd(0); f.querySelector('#tmF_date').onchange();
  ok('a new Weekly meeting carries the last Weekly meeting (not the newer Staffing Sync)', /Still open from Weekly Team Meeting/.test(f.querySelector('#tmF_carry').textContent) && /Call the county/.test(f.querySelector('#tmF_carry').textContent), f.querySelector('#tmF_carry').textContent);
  f.querySelectorAll('.tmF_att')[0].checked=true; f.querySelectorAll('.tmF_att')[1].checked=true;
  f.querySelector('#tmF_notes').value='Talked about <b>weekend</b> coverage';
  let rows=f.querySelectorAll('.tmA'); rows[0].querySelector('.tmA_t').value='Send the weekend schedule'; rows[0].querySelector('.tmA_o').value='jess@mo-care.com'; rows[0].querySelector('.tmA_d').value=window.__ymd(3);
  f.querySelector('#tmF_more').click(); rows=f.querySelectorAll('.tmA'); rows[1].querySelector('.tmA_t').value='Call the Smith family back'; rows[1].querySelector('.tmA_o').value='kat@mo-care.com';
  f.querySelector('#tmF_save').click(); await sleep(250);
  const m1=S.team_meetings[S.team_meetings.length-1], acts=m1.action_ids.map(id=>item(id));
  ok('the meeting is saved with who was there', m1.meeting_name==='Weekly Team Meeting' && m1.attendees==='Kat Smith, Jess Lee' && m1.history[0].by==='Kat Smith', m1);
  ok('each action item is a Stand-Up item with its owner and due date', acts.length===2 && acts.every(a=>a.category==='Meeting action' && a.meeting_id===m1.id && /Weekly Team Meeting/.test(a.related_to))
     && acts[0].assigned_to_email==='jess@mo-care.com' && acts[0].due===window.__ymd(3) && acts[1].assigned_to_email==='kat@mo-care.com', acts);
  switchTab('standup'); await sleep(200);
  ok('...and they are on the board', !!cardFor('Send the weekend schedule') && !!cardFor('Call the Smith family back'));
  await suAct(acts[1].id,'done');

  switchTab('teammeetings'); await sleep(200);
  tmEdit(); await sleep(120); f=popTop();
  f.querySelector('#tmF_date').value=window.__ymd(7); f.querySelector('#tmF_date').onchange();
  const ct=f.querySelector('#tmF_carry').textContent;
  ok('next week: only the still-open action item carries forward', /Send the weekend schedule/.test(ct) && !/Smith family/.test(ct), ct);
  f.querySelector('#tmF_name').value='Staffing Sync'; f.querySelector('#tmF_name').onchange();
  ok('a different meeting carries its own last meeting', /Still open from Staffing Sync/.test(f.querySelector('#tmF_carry').textContent) && /Due soon item/.test(f.querySelector('#tmF_carry').textContent));
  f.querySelector('#tmF_name').value='Weekly Team Meeting'; f.querySelector('#tmF_name').onchange();
  f.querySelector('#tmF_save').click(); await sleep(250);
  const m2=S.team_meetings[S.team_meetings.length-1];
  ok('the carried item is recorded on the new meeting', JSON.stringify(m2.carried_ids)===JSON.stringify([acts[0].id]) && /1 open item carried/.test(m2.history[0].what), m2);
  tmToggle(m2.id); await sleep(20);
  ok('...and shows under "Carried from last time"', /Carried from last time.*Send the weekend schedule/.test(tw.textContent));
  tmEdit(m1.id); await sleep(120); f=popTop(); f.querySelector('#tmF_notes').value='Edited notes'; f.querySelector('#tmF_save').click(); await sleep(200);
  ok('editing a meeting is in its history', S.team_meetings.find(x=>x.id===m1.id).history.some(h=>h.what==='Notes edited'));
  pa=tmAct(m1.id,'archive'); await sleep(80); clickBtn(popTop(),'Archive'); await pa;
  const am=S.team_meetings.find(x=>x.id===m1.id);
  ok('archiving a meeting keeps it (and its board items)', !!am.archived_at && acts.every(a=>S.standup_notes.some(x=>x.id===a.id)) && !tw.textContent.includes('Edited notes'));
  tmShowArchived(true); await sleep(20); ok('Show archived lists it', tw.textContent.includes(window.__ymd(0).slice(0,4)) && $$('#tmList .card').length===1);
  await tmAct(m1.id,'restore'); tmShowArchived(false);
  ok('restored', !S.team_meetings.find(x=>x.id===m1.id).archived_at);
  ok('typed HTML in meeting notes shows as text', window.__pwned===undefined && !tw.querySelector('b b'));

  /* --- video room --- */
  await tmVideo(); ok('the team video room is the same room the Team Hub used', L.opened.length===1 && L.opened[0].location.href==='https://meet.jit.si/CaringCompanions-TeamHub-test123', L.opened.map(w=>w.location.href));
  const before=JSON.stringify(S); delete S.ops_settings.team_video_room; L.writes.length=0; await tmVideo();
  ok('with no room on file it says so, makes nothing and saves nothing', L.opened[1].closed===true && L.writes.length===0 && !S.ops_settings.team_video_room);
  ok('the Hub never reads the Team Hub settings list', !L.reads.some(r=>r.startsWith('app_data:team_hub_settings')), L.reads.filter(r=>/team_hub/.test(r)));

  /* --- no messages --- */
  ok('nothing was texted, emailed or called: no functions, no RPCs, no outside requests', L.fn.length===0 && L.rpc.length===0 && L.fetch.length===0, [L.fn,L.rpc,L.fetch]);
  ok('no browser alert/confirm/prompt boxes were used', !window.__dialogs);
  return R;
}
"""

PHONE = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,400)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on');
  switchTab('standup'); await sleep(250);
  const b=[...document.querySelectorAll('#suWrap button')].find(x=>x.textContent.includes('Add to Stand-Up'));
  const r=b.getBoundingClientRect();
  ok('phone: "＋ Add to Stand-Up" is on screen', r.width>0 && r.right<=window.innerWidth && r.left>=0, [r.left,r.right,window.innerWidth]);
  b.click(); await sleep(150);
  const p=[...document.querySelectorAll('.ccpop')].pop(), pr=p.getBoundingClientRect();
  ok('phone: the form is a bottom sheet the width of the screen', Math.round(pr.left)===0 && Math.round(pr.right)===window.innerWidth && Math.round(pr.bottom)===window.innerHeight, [pr.left,pr.right,pr.bottom,window.innerHeight]);
  p.querySelector('#suF_summary').value='Phone test: caregiver called out'; p.querySelector('#suF_save').click(); await sleep(150);
  ok('phone: saved', window.__store.standup_notes.some(x=>x.summary==='Phone test: caregiver called out'));
  ok('phone: the page does not scroll sideways', document.documentElement.scrollWidth<=window.innerWidth, [document.documentElement.scrollWidth, window.innerWidth]);
  return R;
}
"""

R = []
def static(n, c, d=''):
    R.append(['PASS' if c else 'FAIL', n, '' if c else d])

static('the board code never sends anything (no functions, fetch, texts, emails)', not re.search(r'functions\.invoke|fetch\(|sendCandidateSMS|ghlSend|\.rpc\(', SRC))
static('My Team cards carry the stand-up count', "suTeamCountHtml(e)" in HUB)
static('standup-board.js is loaded by the Hub', '<script src="standup-board.js?v=' in HUB)

with sync_playwright() as pw:
    b = pw.chromium.launch()
    for name, size, body in (('desktop', {'width': 1360, 'height': 900}, T), ('phone', {'width': 390, 'height': 844}, PHONE)):
        pg = b.new_page(viewport=size)
        pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        pg.on('dialog', lambda d: (pg.evaluate('window.__dialogs=1'), d.dismiss()))
        pg.goto('http://localhost:8765/index.html?proof=standup-' + name); pg.wait_for_timeout(1200)
        pg.evaluate('s=>(0,eval)(s)', STUB)
        out = pg.evaluate(body)
        mine = [e for e in errs]
        out.append(['PASS' if not mine else 'FAIL', name + ': no page errors', mine[:3]])
        R += out
        pg.close()
    # if standup-board.js ever fails to load, the rest of the Hub still works
    pg = b.new_page(viewport={'width': 1360, 'height': 900})
    pg.route('**/*', lambda r: r.abort() if ('supabase.co' in r.request.url or 'standup-board.js' in r.request.url) else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=standup-missing'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    pg.evaluate("async()=>{ document.getElementById('appScreen').classList.add('on'); for(const t of ['today','myteam','standup','teammeetings','today']){ switchTab(t); await new Promise(r=>setTimeout(r,400)); } }")
    R.append(['PASS' if not errs else 'FAIL', 'without standup-board.js: Dashboard, My Team and both new tabs open without errors', errs[:3]])
    pg.close()
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

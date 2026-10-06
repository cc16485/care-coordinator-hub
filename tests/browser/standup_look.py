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
  const item=id=>S.standup_notes.find(x=>x.id===id), wrap=()=>$('#suWrap'), cards=()=>$$('#suWrap .su-talk');
  const cardFor=txt=>cards().find(c=>c.textContent.includes(txt)) || { textContent:'', missing:true };
  const popTop=()=>{ const p=$$('.ccpop'); return p[p.length-1]; };
  const clickBtn=(root,txt)=>{ const b=[...root.querySelectorAll('button')].find(x=>x.textContent.trim()===txt); if(!b) throw new Error('no button '+txt); b.click(); };
  document.getElementById('appScreen').classList.add('on');

  /* --- where it lives --- */
  const today=$('#fsub-today');
  ok('To talk about and Team Meetings are tabs under Today', !!today.querySelector('[data-tab=standup]') && !!today.querySelector('[data-tab=teammeetings]'));
  ok('the old Meetings tab is gone from the Team section', !$('[data-tab=meetings]') && !$('#tab-meetings'));
  switchTab('meetings'); await sleep(60);
  ok('an old #meetings link lands on Team Meetings', activeTab==='teammeetings', activeTab);
  location.hash='#standup'; await sleep(150);
  ok('the Team Hub link cc.mo-care.com/#standup opens To talk about', activeTab==='standup', activeTab);
  location.hash='#teammeetings'; await sleep(150);
  ok('...and #teammeetings opens Team Meetings', activeTab==='teammeetings', activeTab);
  ok('the request-a-meeting card moved into Team Meetings with the same fields', ['mpg_with','mpg_topic','mpg_when','meetingsPageList'].every(id=>$('#tab-teammeetings #'+id)));

  /* --- To talk about (2026-10-06): the Stand-Up board became a list of flags --- */
  S.standup_notes.push({ id:'xss', summary:'<img src=x onerror="window.__pwned=1">', occurred_at:window.__iso(-0.2), status:'open', assigned_to_email:'jess@mo-care.com', created_at:window.__iso(-0.2) });
  S.ops_items=[{ id:'ops_u1', kind:'client_issue', title:'Mary fell on Tuesday', about:'Mary Test', urgency:'urgent', status:'open', owner:'jess@mo-care.com', owner_name:'Jess Lee', created_at:new Date().toISOString(), due:new Date().toISOString() }];
  (0,eval)("DATA.ops_items=[{ id:'ops_u1', kind:'client_issue', title:'Mary fell on Tuesday', about:'Mary Test', urgency:'urgent', status:'open', owner:'jess@mo-care.com', owner_name:'Jess Lee', created_at:new Date().toISOString(), due:new Date().toISOString() }]");
  switchTab('standup'); await sleep(300);
  ok('the tab is called To talk about', /To talk about/.test($('[data-tab=standup]').textContent) && /To talk about/.test(wrap().querySelector('h2').textContent));
  ok('it says what it is: flags from My Work or My Desk, Talked clears it, nothing is sent', /flagged to bring up the next time you're together/.test(wrap().innerText) && /Tap Talked/.test(wrap().innerText) && /Nothing here texts or emails anyone/.test(wrap().innerText));
  const groups=()=>$$('#suWrap .su-tgroup').map(g=>g.firstElementChild.textContent.replace(/\s*\(\d+\)$/,'').trim());
  ok('grouped by person, mine first ("You"), older typed names matched (Kat)', groups()[0]==='You' && groups().includes('Jess Lee'), groups());
  ok('my group has my two open items, urgent first', (()=>{ const g=$$('#suWrap .su-tgroup')[0]; const t=[...g.querySelectorAll('.su-talk b')].map(b=>b.textContent); return t[0]==='Brand new urgent' && t.includes('Legacy call-out from Saturday'); })());
  ok('a done item is not on the list', cardFor('Fixed the fax').missing);
  ok('older board items say so, with "Still needs doing: put it on My Work"', /From the old Stand-Up board/.test(cardFor('Due soon item').textContent) && /Still needs doing: put it on My Work/.test(cardFor('Due soon item').textContent));
  ok('typed HTML shows as text and never runs', window.__pwned===undefined && !wrap().querySelector('img') && /<img/.test(wrap().textContent));
  window.__wm=[wrap().innerText.slice(-600), (()=>{ try{ return JSON.stringify(prepList()); }catch(e){ return String(e); } })()];
  ok('"Worth mentioning": what the Hub found on its own (an urgent client issue)', /Worth mentioning/.test(wrap().innerText) && /URGENT AND HIGH-RISK[\s\S]*Mary Test/.test(wrap().innerText), window.__wm);
  L.writes.length=0;
  [...cardFor('Brand new urgent').querySelectorAll('button')].find(b=>/Talked/.test(b.textContent)).click(); await sleep(200);
  let it=item('old5');
  ok('Talked: done, stamped, in its history, off the list', it.status==='done' && !!it.talked_at && it.history.some(h=>h.what==='Talked about' && h.by==='Kat Smith') && cardFor('Brand new urgent').missing && L.writes.length===1, it);
  ok('...and under "Talked about this week"', /Talked about this week \(1\)/.test(wrap().innerText));
  // an older item that still needs doing goes onto My Work
  await suAct('old4','towork'); await sleep(150);
  ok('"Still needs doing" opens the My Work form with the words filled in', $('#ccCapWrap').style.display==='flex' && $('#capWhat').value==='Overdue thing');
  await ccCaptureSave(); await sleep(250);
  const made=(DATA.ops_items||[]).find(x=>x.title==='Overdue thing');
  ok('...saved as a My Work item, and the old item is closed "Put on My Work"', !!made && S.ops_items.some(x=>x.id===made.id) && item('old4').status==='done' && item('old4').history.some(h=>h.what==='Put on My Work'), item('old4'));
  // the flag on a My Work card
  await myWorkTalk('ops_u1'); await sleep(200);
  const fl=S.standup_notes.find(x=>x.source==='work' && x.ops_id==='ops_u1');
  ok('Talk about on a My Work card: one flag, under whoever owns the card', !!fl && fl.assigned_to_email==='jess@mo-care.com' && fl.summary==='Mary fell on Tuesday' && /from My Work/.test(fl.history[0].what), fl);
  ok('...the card shows "to talk about" and the button turns into "Don\'t need to talk about it"', /to talk about/.test(myWorkCard(DATA.ops_items[0],0)) && /Don’t need to talk about it/.test(myWorkCard(DATA.ops_items[0],0)));
  await myWorkTalk('ops_u1'); await sleep(50); await myWorkTalk('ops_u1'); await sleep(150);
  ok('...off and on again never makes two open flags', S.standup_notes.filter(x=>x.source==='work' && x.ops_id==='ops_u1' && !x.archived_at && x.status!=='done').length===1);
  switchTab('standup'); await sleep(250);
  ok('...on the list as "From My Work" with Open in My Work', !!(window.__dbg=wrap().innerText) && /From My Work/.test(cardFor('Mary fell on Tuesday').textContent) && /Open in My Work/.test(cardFor('Mary fell on Tuesday').textContent));
  ok('"Take the flag off" for whoever flagged it or owns it, not on other people\'s (Jess\'s old item has none for Kat)', /Take the flag off/.test(cardFor('Mary fell on Tuesday').textContent) && !/Take the flag off/.test(cardFor('Due soon item').textContent) && /Take the flag off/.test(cardFor('Legacy call-out from Saturday').textContent), [cardFor('Mary fell on Tuesday').textContent, cardFor('Legacy call-out from Saturday').textContent]);

  /* --- Today line and My Team --- */
  const tl=$('#suTodayLine'); suTodayRender(); await sleep(30);
  ok('Dashboard: the To talk about card sits at the TOP (above the day\'s numbers)', !!(tl.compareDocumentPosition($('#todayGlance')) & Node.DOCUMENT_POSITION_FOLLOWING));
  ok('Dashboard: how many are flagged, and yours, with Open the list (no Add to Stand-Up)', /To talk about/.test(tl.innerText) && /\d+ flagged · 1 yours/.test(tl.innerText) && /Open the list/.test(tl.innerText) && !/Stand-Up/.test(tl.innerText), tl.innerText);
  ok('Dashboard: typed HTML stays text there too', !tl.querySelector('img') && window.__pwned===undefined);
  ccAddOpen(document.getElementById('ccAddBtn')); await sleep(60);
  let pp=popTop();
  ok('top bar "＋ Add": My Work (no Stand-Up board), with a Talk about tick', !!pp && !pp.querySelector('#ccAddSu') && !!pp.querySelector('#ccAddCap') && /My Work/.test(pp.innerText) && !!pp.querySelector('#ccAddTalk'));
  pp.querySelector('#ccAddTalk').checked=true; pp.querySelector('#ccAddCap').click(); await sleep(120);
  ok('...ticking it opens My Work with "Talk about it" already ticked', $('#capTalk').checked===true);
  $('#capWhat').value='Ask about the weekend float'; await ccCaptureSave(); await sleep(250);
  const wk=(DATA.ops_items||[]).find(x=>x.title==='Ask about the weekend float');
  ok('...saved on My Work AND flagged to talk about', !!wk && S.standup_notes.some(x=>x.source==='work' && x.ops_id===wk.id && x.status==='open'));
  ok('the top bar says "＋ Add" (no separate Capture button)', /＋ Add/.test($('#ccAddBtn').textContent) && ![...document.querySelectorAll('header button, .topbar button')].some(b=>/✎ Capture/.test(b.textContent)));
  const mt=suTeamCountHtml('kat@mo-care.com');
  ok('My Team card line: how many to talk about', /\d+ to talk about/.test(mt), mt);

  /* --- Team Meetings --- */
  switchTab('teammeetings'); await sleep(250);
  const tw=$('#tmWrap');
  ok('meetings in month folders, newest first', $$('#tmList > div').filter(d=>/^[A-Z]+ \d{4}$/.test(d.textContent)).length>=1 && tw.textContent.indexOf('Staffing Sync')<tw.textContent.indexOf('Weekly Team Meeting'));
  tmToggle('mt_old'); tmToggle('mt_staff'); await sleep(20);
  ok('older action items (typed lines) still show, marked as older', /Call the county.*older note/.test(tw.textContent));
  ok('a javascript: transcript is never a link; an https one is', ![...tw.querySelectorAll('a')].some(a=>/^javascript/i.test(a.getAttribute('href'))) && [...tw.querySelectorAll('a')].some(a=>a.getAttribute('href')==='https://example.com/transcript'));
  ok('a meeting\'s action items show their live status', /Due soon item.*Open/.test(tw.textContent));

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
  ok('...and they are on the To talk about list', !cardFor('Send the weekend schedule').missing && !cardFor('Call the Smith family back').missing);
  ok('Team Meetings: no Stand-Up schedule any more, and "Prepare a meeting"', !$('#suSchedLine') && /Prepare a meeting/.test($('#tmWrap') ? $('#tmWrap').innerText : 'Prepare a meeting'));
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
  switchTab('standup'); await sleep(300);
  const b=[...document.querySelectorAll('#suWrap button')].find(x=>x.textContent.includes('Something to talk about'));
  const r=b.getBoundingClientRect();
  ok('phone: "＋ Something to talk about" is on screen', r.width>0 && r.right<=window.innerWidth && r.left>=0, [r.left,r.right,window.innerWidth]);
  ok('phone: Talked buttons fit', [...document.querySelectorAll('#suWrap .su-talk button')].every(x=>{ const q=x.getBoundingClientRect(); return q.right<=window.innerWidth+1; }));
  b.click(); await sleep(150);
  ok('phone: without a desk it opens My Work with Talk about ticked', document.getElementById('ccCapWrap').style.display==='flex' && document.getElementById('capTalk').checked===true);
  ok('phone: the page does not scroll sideways', document.documentElement.scrollWidth<=window.innerWidth, [document.documentElement.scrollWidth, window.innerWidth]);
  return R;
}
"""

R = []
def static(n, c, d=''):
    R.append(['PASS' if c else 'FAIL', n, '' if c else d])

static('the board code never sends anything (no functions, fetch, texts, emails)', not re.search(r'functions\.invoke|fetch\(|sendCandidateSMS|ghlSend|\.rpc\(', SRC))
static('My Team cards carry the to-talk-about count', "suTeamCountHtml(e)" in HUB)
static('the "What runs by itself" button is gone from the top bar (her call)', 'onclick="autoOpen()"' not in HUB)
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

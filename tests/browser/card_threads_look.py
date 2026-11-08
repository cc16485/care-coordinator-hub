"""Card conversations on Operations Board cards (Samantha 2026-11-08, "Approve all picks"; plan
https://claude.ai/artifact/CzKDf6SUTZSwmqTczn51R2). The real Hub page, offline, MADE-UP people only, with a stand-in for the
server doors (card_msg_post, answer, complete, pin, delete, seen) that keeps rows in the page.
Off: a coordinator sees nothing new; an owner sees "Try card conversations". Trying it: For you on top (a question and a
late task waiting on you, a mention, "You are waiting on"), 💬 counts and a red dot on rows, Open from For you opens the card
with its conversation, Ask/Assign/Send go through the doors with the right person and by-when, @Name becomes a mention,
one-tap answers, Complete with a note, pin the decision, delete your own, Done with a question still open asks first.
On (card_threads_live): a coordinator sees it in the table layout too. Phone width, no page errors.
Screenshots to SHOTS (default /tmp/ct_*.png). (python3 tests/browser/card_threads_look.py; serves this checkout)"""
import re, os, sys, threading, functools, http.server, socketserver
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
STUB = re.search(r'STUB = r"""(.*?)"""', open(os.path.join(HERE, 'standup_look.py')).read(), re.S).group(1)
SHOTS = os.environ.get('SHOTS', '/tmp/ct_')
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.TCPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=ROOT)); PORT = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
SETUP = r"""async(mode)=>{
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  const owner = mode==='owner' || mode==='ownerTable';
  (0,eval)(owner ? "ME={ email:'samantha@mo-care.com', name:'Samantha Troutman' };" : "ME={ email:'krystal@mo-care.com', name:'Krystal Smith' };");
  CC_ROLES = owner ? ['owner_admin'] : ['care_coordinator']; CC_ROLES_CHECKED=true;
  window.ccIsOwner=()=>owner; window.ccActor=()=>({ email:ME.email, name:ME.name }); window.opsMeKey=()=>ME.email;
  try{ ['opbF','opbLanes','ctTry','mwtLastClear'].forEach(k=>localStorage.removeItem(k)); }catch(e){}
  if(mode!=='ownerTable' && mode!=='staffOn') localStorage.setItem('opbLanes', owner ? '1' : '0');
  Object.assign(OPB.state, { tile:'', open:'', clean:false, appr:false, started:false, older:false, f:{ when:'', who:'', need:'', owner:'start' } });
  Object.assign(OPB.lanes, { who:'mine', bopen:'', oldOpen:false, week:[], weekAt:Date.now(), weekErr:'' });
  Object.assign(CT.state, { msgs:[], seen:{}, loadedAt:0, loading:false, err:'', drafts:{}, busy:false, shownSeen:{} });
  DATA.ops_settings=Object.assign({}, DATA.ops_settings||{}, { ops_board_live:true, ops_board_live_since:new Date(Date.now()-2*864e5).toISOString(),
    ops_board_lanes_live: mode==='staff', card_threads_live: mode==='staff' || mode==='staffOn', cc_followups_live:true });
  DATA.coordinator_staff=[{ name:'Samantha Troutman', email:'samantha@mo-care.com' }, { name:'Krystal Smith', email:'krystal@mo-care.com' }, { name:'Zach Troutman', email:'zach@mo-care.com' }];
  const ago=h=>new Date(Date.now()-h*36e5).toISOString(), ahead=h=>new Date(Date.now()+h*36e5).toISOString();
  const S='samantha@mo-care.com', K='krystal@mo-care.com', Z='zach@mo-care.com';
  DATA.ops_items=[
    { id:'fu_1', kind:'reply_needed', status:'open', owner:S, about:'Example: Dana P.', title:'Call or text back Example: Dana P.', detail:'Example: Dana P.: "Do I get paid for the cancelled visit?"', created_at:ago(20), due:ago(19) },
    { id:'fu_2', kind:'reply_needed', status:'open', owner:S, about:'Example: Ruth B.', title:'Call or text back Example: Ruth B.', detail:'Missed call.', created_at:ago(3), due:ahead(1) },
    { id:'fu_3', kind:'reply_needed', status:'open', owner:K, about:'Example: Tom R.', title:'Call or text back Example: Tom R.', detail:'About his hours.', created_at:ago(5), due:ahead(1) }
  ];
  /* the server, made up: rows kept here, the same rules as the 1381 doors */
  const me=()=>ME.email.toLowerCase(), nm=e=>(DATA.coordinator_staff.find(s=>s.email===e)||{}).name||e;
  const rows=window.__ct=[
    { id:'m1', card_id:'fu_1', kind:'ask', body:'Example: Dana says she drove there before the family cancelled. Do we pay the visit?', by_email:K, by_name:'Krystal Smith', to_email:S, to_name:'Samantha Troutman', mentions:[], created_at:ago(2) },
    { id:'m2', card_id:'fu_1', kind:'msg', body:'The family called at 8:50 for a 9:00 visit.', by_email:K, by_name:'Krystal Smith', mentions:[], created_at:ago(1.9) },
    { id:'m3', card_id:'fu_2', kind:'assign', body:'Call Example: Ruth back with two caregivers who can travel', by_email:Z, by_name:'Zach Troutman', to_email:S, to_name:'Samantha Troutman', due_at:ago(1), mentions:[], created_at:ago(3) },
    { id:'m4', card_id:'fu_3', kind:'msg', body:'@Samantha can you look at this one?', by_email:K, by_name:'Krystal Smith', mentions:[S], created_at:ago(1) },
    { id:'m5', card_id:'fu_3', kind:'ask', body:'Can you check his Monday shifts?', by_email:S, by_name:'Samantha Troutman', to_email:K, to_name:'Krystal Smith', mentions:[], created_at:ago(4) },
    { id:'m6', card_id:'gone_card', kind:'ask', body:'On a closed card', by_email:K, by_name:'Krystal Smith', to_email:S, to_name:'Samantha Troutman', mentions:[], created_at:ago(5) }];
  window.__rpc=[]; window.__seen=[];
  const err=m=>({ data:null, error:{ message:'card conversations: '+m } }), find=id=>rows.find(r=>r.id===id);
  const q=(t)=>{ const st={ f:[] }; const b={ select(){return b}, gte(){return b}, order(){return b}, limit(){return b}, eq(c,v){ st.f.push([c,v]); return b },
    then(res){ const data = t==='card_messages' ? rows.slice() : []; return Promise.resolve({ data, error:null }).then(res); } }; return b; };
  const fake={ from:q, rpc:async(fn,a)=>{ window.__rpc.push([fn,a]);
    if(fn==='card_thread_seen_mark'){ window.__seen.push(a.p_card); return { data:new Date().toISOString(), error:null }; }
    if(fn==='card_msg_post'){ if(a.p_kind!=='msg' && !DATA.coordinator_staff.some(s=>s.email===a.p_to)) return err('pick someone in the office');
      const r={ id:'n'+rows.length, card_id:a.p_card, kind:a.p_kind, body:a.p_body, by_email:me(), by_name:ME.name, to_email:a.p_to, to_name:a.p_to?nm(a.p_to):null, due_at:a.p_due, due_label:a.p_due_label, mentions:a.p_mentions||[], created_at:new Date().toISOString() };
      rows.push(r); return { data:r, error:null }; }
    const r=find(a.p_id); if(!r) return err('that message is gone');
    if(fn==='card_msg_answer'){ if(r.to_email!==me()) return err('only '+r.to_name+' can answer this'); Object.assign(r,{ answer:a.p_answer, answered_by:ME.name, answered_at:new Date().toISOString() }); return { data:r, error:null }; }
    if(fn==='card_msg_complete'){ if(r.to_email!==me()) return err('only '+r.to_name+' can complete this'); Object.assign(r,{ done_note:a.p_note, done_by:ME.name, done_at:new Date().toISOString() }); return { data:r, error:null }; }
    if(fn==='card_msg_pin'){ rows.forEach(x=>{ if(x.card_id===r.card_id) x.pinned_at=null; }); if(a.p_on) r.pinned_at=new Date().toISOString(); return { data:r, error:null }; }
    if(fn==='card_msg_delete'){ r.deleted_at=new Date().toISOString(); return { data:true, error:null }; }
    return err('unknown'); } };
  window.__fakeSb=fake; (0,eval)('sb=window.__fakeSb');
  window.__asked=[]; window.ccConfirm=async m=>{ window.__asked.push(m); return window.__yes!==false; }; (0,eval)('ccConfirm=window.ccConfirm');
  window.__closed=[]; window.__realClose=window.opsClose;
  window.persist=async()=>{}; window.opEvent=()=>{}; window.ccToast=t=>{ (window.__toasts=window.__toasts||[]).push(t); };
  window.ccOpsRefresh=()=>{}; window.ccRecentFetch=async()=>{}; try{ CC_RECENT.tried=Date.now(); }catch(e){}
  window.trainHubTok=async()=>'tok';
  switchTab('mywork'); myWorkGo('board'); await new Promise(r=>setTimeout(r,120));
  return true;
}"""
OWNER = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const W=()=>document.getElementById('myWorkWrap').innerText;
  ok('off: nothing loads, no For you, no 💬; owners see "Try card conversations"', !document.getElementById('ctForYou') && !/💬/.test(W()) && /Try card conversations/.test(W()) && !window.__rpc.length, W().slice(0,300));
  CT.tryIt(true); await sleep(200);
  ok('trying it: the practice note says only owners who try it see it and points to the Admin page', /Card conversations, practice/.test(W()) && /Owners Hub Admin page/.test(W()), W().slice(0,400));
  const fy=document.getElementById('ctForYou'), ft=fy?fy.innerText:'';
  ok('For you: 3 waiting on you, the late task first, then the question, then the mention', /For you\s*3/.test(ft)
    && [...fy.querySelectorAll('.ct-fi')].map(x=>x.getAttribute('data-card')).join(',')==='fu_2,fu_1,fu_3', ft);
  ok('...the task says it is late; the question names who asked and the card', /Task[\s\S]*Zach Troutman[\s\S]*late/.test(ft) && /Question[\s\S]*Krystal Smith on Example: Dana P\./.test(ft), ft);
  ok('...a question on a card that is closed is not there', !/On a closed card/.test(ft));
  ok('You are waiting on: Krystal (Example: Tom R.)', /You are waiting on: Krystal \(Example: Tom R\.\)/.test(ft), ft);
  const row=id=>document.querySelector('.opl-row[data-id="'+id+'"]');
  ok('rows show 💬 with a count and a red dot when something waits on you', /💬 2/.test(row('fu_1').innerText) && !!row('fu_1').querySelector('.ct-dot') && /💬 1/.test(row('fu_2').innerText));
  ok('...the wait time on the row is unchanged by messages (pick 6)', /20 h/.test(row('fu_1').querySelector('.opl-t').innerText), row('fu_1').querySelector('.opl-t').innerText);
  document.querySelector('.ct-fi[data-card="fu_1"] button').click(); await sleep(150);
  const th=document.getElementById('ctT_fu_1'), tt=th?th.innerText:'';
  ok('Open from For you opens the card with its conversation under it', !!th && /Conversation/.test(tt) && /Do we pay the visit\?/.test(tt) && /8:50/.test(tt), tt.slice(0,400));
  ok('...opening it marks it seen', window.__seen.includes('fu_1'));
  ok('...the question for you has Yes, No, Call me, Let me look and a box', ['Yes','No','Call me','Let me look'].every(b=>[...th.querySelectorAll('.ct-q button')].some(x=>x.innerText===b)) && !!document.getElementById('ctA_m1'));
  [...th.querySelectorAll('.ct-q button')].find(x=>x.innerText==='Yes').click(); await sleep(150);
  ok('one tap answers it through the door', window.__rpc.some(([f,a])=>f==='card_msg_answer'&&a.p_id==='m1'&&a.p_answer==='Yes') && /Samantha Troutman answered: Yes/.test(document.getElementById('ctT_fu_1').innerText));
  ok('...and it leaves For you', !/Do we pay the visit/.test(document.getElementById('ctForYou').innerText));
  [...document.querySelectorAll('#ctT_fu_1 .ct-lk')].find(x=>/Pin as the decision/.test(x.innerText) && x.closest('.ct-m').getAttribute('data-mid')==='m1').click(); await sleep(150);
  const pin=document.querySelector('#ctT_fu_1 .ct-pin');
  ok('pin the decision: it sits on top of the conversation, with the answer', !!pin && /Decision/i.test(pin.innerText) && /Do we pay the visit\? Yes \(Samantha Troutman\)/.test(pin.innerText), pin && pin.innerText);
  const tx=document.getElementById('ctTx_fu_1'); tx.value='Tell her yes and add it to payroll @Zach'; tx.dispatchEvent(new Event('input'));
  document.getElementById('ctTo_fu_1').value='krystal@mo-care.com'; document.getElementById('ctDue_fu_1').value='3pm'; CT.draft('fu_1');
  [...document.querySelectorAll('#ctT_fu_1 .ct-c button')].find(b=>/Assign/.test(b.innerText)).click(); await sleep(150);
  const post=window.__rpc.filter(([f])=>f==='card_msg_post').pop();
  ok('Assign: to Krystal, with a by-when at 3 pm today, and @Zach as a mention', post && post[1].p_kind==='assign' && post[1].p_to==='krystal@mo-care.com' && new Date(post[1].p_due).getHours()===15 && JSON.stringify(post[1].p_mentions)==='["zach@mo-care.com"]', post);
  ok('...shows in the conversation as Assigned Krystal, by today 3 pm, and the box is cleared', /Assigned Krystal · by today 3 pm/.test(document.getElementById('ctT_fu_1').innerText) && document.getElementById('ctTx_fu_1').value==='', document.getElementById('ctT_fu_1').innerText.slice(-500));
  ok('...and in You are waiting on', /Krystal \(Example: Dana P\.\)/.test(document.getElementById('ctForYou').innerText));
  document.getElementById('ctTx_fu_1').value='Is this the right card?'; document.getElementById('ctDue_fu_1').value='eod'; CT.draft('fu_1');
  [...document.querySelectorAll('#ctT_fu_1 .ct-c button')].find(b=>/Ask/.test(b.innerText)).click(); await sleep(120);
  ok('a by-when on a question is caught on the page, nothing sent', /only for a task/.test(document.getElementById('ctT_fu_1').innerText) && window.__rpc.filter(([f])=>f==='card_msg_post').length===1);
  document.getElementById('ctDue_fu_1').value=''; document.getElementById('ctTx_fu_1').value=''; CT.draft('fu_1');
  [...document.querySelectorAll('#ctT_fu_1 .ct-c button')].find(b=>b.innerText==='Send').click(); await sleep(100);
  ok('an empty message is caught on the page', /Write a message first/.test(document.getElementById('ctT_fu_1').innerText));
  document.getElementById('ctTx_fu_1').value='Oops, wrong card'; CT.draft('fu_1');
  [...document.querySelectorAll('#ctT_fu_1 .ct-c button')].find(b=>b.innerText==='Send').click(); await sleep(150);
  const mine=[...document.querySelectorAll('#ctT_fu_1 .ct-m')].pop();
  ok('Send: a message to the card, and your own new message can be deleted', /Oops, wrong card/.test(mine.innerText) && /Delete/.test(mine.innerText) && !/Delete/.test(document.querySelector('#ctT_fu_1 .ct-m[data-mid="m2"]').innerText));
  [...mine.querySelectorAll('.ct-lk')].find(x=>x.innerText==='Delete').click(); await sleep(150);
  ok('...Delete asks first, then it is gone', window.__asked.some(m=>/Delete this message/.test(m)) && !/Oops, wrong card/.test(document.getElementById('ctT_fu_1').innerText));
  CT.go('fu_2'); await sleep(150);
  const t2=document.getElementById('ctT_fu_2');
  ok('the task for you: Late, and Complete with a note', !!t2 && /Late/.test(t2.innerText) && !!document.getElementById('ctN_m3'));
  document.getElementById('ctN_m3').value='Left a voicemail, trying again at 4'; [...t2.querySelectorAll('.ct-q button')].find(b=>b.innerText==='Complete').click(); await sleep(150);
  ok('Complete goes through the door with the note and shows who completed it', window.__rpc.some(([f,a])=>f==='card_msg_complete'&&a.p_id==='m3'&&/voicemail/.test(a.p_note)) && /Samantha Troutman completed it[\s\S]*voicemail/.test(document.getElementById('ctT_fu_2').innerText));
  ok('...For you now has only the mention', /For you\s*1/.test(document.getElementById('ctForYou').innerText), document.getElementById('ctForYou').innerText);
  window.__yes=false; const before=(DATA.ops_items.find(i=>i.id==='fu_1')||{}).status;
  await opsClose('fu_1', 'opldn_fu_1'); await sleep(80);
  ok('Done with a task still open asks "Close the card anyway?" and No keeps it open', window.__asked.some(m=>/Krystal hasn't completed "Tell her yes/.test(m) && /Close the card anyway\?/.test(m)) && (DATA.ops_items.find(i=>i.id==='fu_1')||{}).status===before, window.__asked);
  const n=window.__asked.length; window.__yes=true;
  window.scrollTo(0,0);
  return R; }"""
STAFF = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const W=()=>document.getElementById('myWorkWrap').innerText;
  await sleep(150);
  const ft=(document.getElementById('ctForYou')||{}).innerText||'';
  ok('switched on: Krystal gets For you with Samantha\'s question, no practice note, no Try link', /For you\s*1/.test(ft) && /Can you check his Monday shifts/.test(ft) && !/practice/.test(W()) && !/Try card conversations/.test(W()), ft);
  ok('...she is waiting on Samantha for her question about Example: Dana P.', /You are waiting on: Samantha \(Example: Dana P\.\)/.test(ft), ft);
  CT.go('fu_3'); await sleep(150);
  const t=document.getElementById('ctT_fu_3');
  ok('her question has the answer buttons; Samantha\'s own name is not in To for Samantha, but Krystal\'s To lists the others', !!t && !!document.getElementById('ctA_m5') && ![...document.getElementById('ctTo_fu_3').options].some(o=>o.value==='krystal@mo-care.com'));
  document.getElementById('ctA_m5').value='Yes, two of them conflict'; [...t.querySelectorAll('.ct-q button')].find(b=>b.innerText==='Answer').click(); await sleep(150);
  ok('a typed answer saves', window.__rpc.some(([f,a])=>f==='card_msg_answer'&&a.p_answer==='Yes, two of them conflict'));
  return R; }"""
TABLE = r"""async(id)=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  await sleep(150);
  ok('the table layout gets For you and 💬 too', !!document.getElementById('ctForYou') && !!document.querySelector('table.opb') && /💬 2/.test((document.querySelector('tr[data-id="'+id+'"]')||{}).innerText||''), document.getElementById('myWorkWrap').innerText.slice(0,500));
  CT.go(id); await sleep(150);
  ok('...Open opens the card in the table with its conversation', !!document.querySelector('tr.opb-card #ctT_'+id));
  return R; }"""
R = []
with sync_playwright() as pw:
    sys.path.insert(0, HERE)
    from clock_pin import pin
    b = pw.chromium.launch(); errs = []
    def page():
        pg = b.new_page(viewport={'width': 1360, 'height': 1000}); pin(pg)
        pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
        pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
        pg.goto(f'http://127.0.0.1:{PORT}/index.html?proof=ct'); pg.wait_for_timeout(1500)
        pg.evaluate('s=>(0,eval)(s)', STUB); return pg
    pg = page(); pg.evaluate(SETUP, 'owner'); R += pg.evaluate(OWNER)
    pg.wait_for_timeout(150); pg.screenshot(path=SHOTS + 'owner.png', full_page=True)
    pg.evaluate("()=>CT.go('fu_1')"); pg.wait_for_timeout(200)
    pg.set_viewport_size({'width': 400, 'height': 900}); pg.wait_for_timeout(200)
    wv = pg.evaluate("()=>document.documentElement.scrollWidth")
    R.append(['PASS' if wv <= 410 else 'FAIL', 'phone width: the page does not scroll sideways with a conversation open', wv])
    pg.screenshot(path=SHOTS + 'phone.png', full_page=True)
    pg = page(); pg.evaluate(SETUP, 'staffOn'); R += pg.evaluate(TABLE.replace("ok('the table", "ok('Krystal, switched on: the table"), 'fu_3')
    pg = page(); pg.evaluate(SETUP, 'staff'); R += pg.evaluate(STAFF); pg.screenshot(path=SHOTS + 'staff.png', full_page=True)
    pg = page(); pg.evaluate(SETUP, 'ownerTable'); pg.evaluate("()=>CT.tryIt(true)"); R += pg.evaluate(TABLE, 'fu_1')
    pg = page(); pg.evaluate(SETUP, 'staffOff')
    off = pg.evaluate("()=>({ fy:!!document.getElementById('ctForYou'), tr:/Try card conversations/.test(document.getElementById('myWorkWrap').innerText), rpc:window.__rpc.length })")
    R.append(['PASS' if not off['fy'] and not off['tr'] and not off['rpc'] else 'FAIL', 'switched off: a coordinator sees nothing new and nothing is read', off])
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
srv.shutdown()
for st, n, d in R: print(st + '  ' + n + ('' if st == 'PASS' else '  ' + str(d)))
print(f"{sum(1 for r in R if r[0]=='PASS')}/{len(R)} passed")
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

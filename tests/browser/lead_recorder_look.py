"""Calls and texts record themselves (769, Samantha 2026-10-15). The real page, offline, made-up families (the lead
workspace test's setup). Proves: in PRACTICE the Leads board lists what the recorder would record, by family, and changes
nothing; once LIVE, "Couldn't tell whose" lets a person pick (the call goes on that family's record the way Log a call
writes it), "Couldn't record" is listed (never silent), Log call leaves the board rows and becomes "Log a call from another
phone"; and the Hub's own save of a lead keeps whatever the recorder added since the page loaded it.
(python3 tests/browser/lead_recorder_look.py, static server on PORT, default 8765)"""
import os, re
from playwright.sync_api import sync_playwright
PORT = os.environ.get('PORT', '8765')
SRC = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'leads_workspace_look.py')).read()
STUB = re.search(r'STUB = r"""(.*?)"""', SRC, re.S).group(1)
MORE = r"""
(()=>{
  DATA.leads.push({ id:'sh1', first_name:'Ann', last_name:'Shared', client_first_name:'Bea', client_last_name:'Shared', status:'New', phone:'4175550300', created_at:'2026-10-06T14:00:00Z', funding_source:'private', assigned_coordinator:'Krystal' },
    { id:'sh2', first_name:'Al', last_name:'Shared', client_first_name:'Cy', client_last_name:'Shared', status:'New', client_phone:'4175550300', created_at:'2026-10-06T14:05:00Z', funding_source:'private', assigned_coordinator:'Krystal' });
  window.__seen={ practice:[
      { message_id:'p1', mode:'practice', msg_at:'2026-10-06T14:40:00Z', kind:'call', status:'would_record', lead_id:'dia', line:'☎ Krystal called them, 11 min' },
      { message_id:'p2', mode:'practice', msg_at:'2026-10-06T14:48:00Z', kind:'sms', status:'would_record', lead_id:'dia', line:'💬 They texted: "Thursday works"' },
      { message_id:'p3', mode:'practice', msg_at:'2026-10-06T13:12:00Z', kind:'call', status:'already', lead_id:'dia', line:'☎ Krystal called, reached voicemail' },
      { message_id:'p4', mode:'practice', msg_at:'2026-10-06T14:50:00Z', kind:'call', status:'several', candidates:['sh1','sh2'], line:'☎ They called, Krystal answered, 3 min' }],
    live:[{ message_id:'s1', mode:'live', msg_at:'2026-10-06T14:50:00Z', kind:'call', status:'several', candidates:['sh1','sh2'], line:'☎ They called, Krystal answered, 3 min',
        ev:{ channel:'call', direction:'in', outcome:'connected', actor:'human', by:'krystal@mo-care.com', duration_s:180, ref:'ghl:s1', at:'2026-10-06T14:50:00Z' } },
      { message_id:'e1', mode:'live', msg_at:'2026-10-06T14:30:00Z', kind:'sms', status:'error', lead_id:'dia', line:'💬 Krystal texted: "hi"', note:'the lead kept changing; tried 3 times' }] };
  window.__picks=[]; window.__asked=[];
  sb.from=(t)=>{ const st={ f:{} }; const p={ select(){return p;}, eq(k,v){ st.f[k]=v; return p;}, in(){return p;}, gte(){return p;}, order(){return p;}, limit(){return p;},
      then(a){ window.__asked.push([t, st.f.mode]); return Promise.resolve({ data: t==='lead_record_seen' ? JSON.parse(JSON.stringify(window.__seen[st.f.mode]||[])) : [], error:null }).then(a); } }; return p; };
  sb.rpc=async(fn,a)=>{ if(fn==='lead_record_pick'){ window.__picks.push(a); return { data:true, error:null }; }
    if(fn==='app_data_item_get') return { data: window.__dbLead||null, error:null };
    if(fn==='upsert_app_data_item'){ window.__upserts=(window.__upserts||[]).concat([JSON.parse(JSON.stringify(a.item))]); return { data:null, error:null }; }
    return { data:null, error:null }; };
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,900)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  (0,eval)("renderLeadsStarts=window.__realRLS||renderLeadsStarts"); switchTab('leadsstarts'); await sleep(300);
  const draw=async()=>{ try{ LeadsBoard.render(lsRows(), {}); }catch(e){} await sleep(150); try{ LeadsBoard.render(lsRows(), {}); }catch(e){} await sleep(100); };
  const B=()=>document.getElementById('lbBoard');
  /* off: nothing shows, labels unchanged */
  DATA.ops_settings=Object.assign({}, DATA.ops_settings); delete DATA.ops_settings.lead_record_since; await draw();
  ok('off: no recorder card, nothing read', !B().querySelector('.lr-card') && !window.__asked.some(x=>x[0]==='lead_record_seen'), window.__asked);
  /* PRACTICE */
  DATA.ops_settings.lead_record_since='2026-10-01T00:00:00Z'; DATA.ops_settings.lead_record_live=false; await LeadRecorder.load(true); await draw();
  const card=B().querySelector('.lr-card');
  ok('practice: the board shows what it would have recorded, with the counts', card && /Practice: calls and texts recording themselves/.test(card.innerText) && /would have recorded 2 on 1 family, 1 already logged by hand, 1 on a shared number/.test(card.innerText), card && card.innerText.slice(0,500));
  card.open=true; await sleep(50);
  ok('practice: by family, oldest first, each line tagged', /Marjorie Teague|Diane Teague/.test(card.innerText) && /Krystal called, reached voicemail[\s\S]*already logged[\s\S]*Krystal called them, 11 min[\s\S]*would record/.test(card.innerText), card.innerText.slice(0,900));
  ok('practice: no lead was saved, and the board still offers Log call', !window.__log.writes.length && document.body.dataset.leadRecord==='practice' && [...B().querySelectorAll('button')].some(b=>b.textContent==='Log call'));
  /* LIVE */
  DATA.ops_settings.lead_record_live=true; await LeadRecorder.load(true); await draw();
  const lc=B().querySelector('.lr-card');
  ok('live: "Couldn\'t tell whose" lists the shared-number call with a button per family and Neither', lc && /Couldn't tell whose/.test(lc.innerText) && /It was Bea Shared/.test(lc.innerText) && /It was Cy Shared/.test(lc.innerText) && /Neither/.test(lc.innerText), lc && lc.innerText);
  ok('live: "Couldn\'t record" lists what did not go on a record, with why (never silent)', /Couldn't record[\s\S]*Marjorie Teague: 💬 Krystal texted: "hi"[\s\S]*tried 3 times/.test(lc.innerText), lc.innerText);
  ok('live: board rows no longer offer Log call', ![...B().querySelectorAll('.lb-row button')].some(b=>/^Log call$/.test(b.textContent)));
  [...lc.querySelectorAll('button')].find(b=>/It was Bea Shared/.test(b.textContent)).click(); await sleep(200);
  const s1=DATA.leads.find(l=>l.id==='sh1'), s2=DATA.leads.find(l=>l.id==='sh2');
  ok('picking marks it on the server with the chosen family', window.__picks.length===1 && window.__picks[0].p_message_id==='s1' && window.__picks[0].p_lead_id==='sh1', window.__picks);
  ok('...and the call goes on Bea\'s record the way Log a call writes it (event, line, reached, Contacted)', s1.contact_events.some(e=>e.ref==='ghl:s1' && e.outcome==='connected') && s1.comm_log.some(c=>c.body==='☎ They called, Krystal answered, 3 min' && c.src==='auto')
     && s1.first_human_contact_at==='2026-10-06T14:50:00Z' && s1.status==='Contacted' && s1.last_contacted_at==='2026-10-06' && window.__log.writes.some(w=>w.id==='sh1'), s1);
  ok('...the other family is untouched', !s2.contact_events && s2.status==='New');
  /* the label */
  await openClient({ lead_id:'dia' }, 'summary'); await sleep(300);
  const lg=[...document.querySelectorAll('button')].filter(b=>/Log a call/.test(b.innerText) && b.offsetParent);
  ok('live: Log a call reads "Log a call from another phone"', lg.length && lg.every(b=>/Log a call from another phone/.test(b.innerText)), lg.map(b=>b.innerText));
  /* the save merge */
  const l={ id:'mx', status:'New', contact_attempts:1, contact_events:[{ at:'2026-10-06T10:00:00Z', channel:'call', direction:'out', outcome:'no_answer', actor:'human' }], comm_log:[{ body:'☎ call: no answer', at:'2026-10-06T10:00:00Z' }], notes:'typed here' };
  window.__dbLead={ id:'mx', status:'Contacted', status_history:[{ to:'Contacted' }], first_human_attempt_at:'2026-10-06T09:00:00Z', first_human_contact_at:'2026-10-06T11:00:00Z', family_last_reply_at:'2026-10-06T10:30:00Z', last_contacted_at:'2026-10-06', contact_attempts:2,
    contact_events:[{ at:'2026-10-06T09:00:00Z', channel:'call', direction:'out', outcome:'voicemail', actor:'human', ref:'ghl:a' }, { at:'2026-10-06T10:00:00Z', channel:'call', direction:'out', outcome:'no_answer', actor:'human' },
      { at:'2026-10-06T10:30:00Z', channel:'sms', direction:'in', outcome:'reply', actor:'family', ref:'ghl:b' }, { at:'2026-10-06T11:00:00Z', channel:'call', direction:'out', outcome:'connected', actor:'human', ref:'ghl:c' }],
    comm_log:[{ body:'☎ Krystal called, reached voicemail', at:'2026-10-06T09:00:00Z', src:'auto', ref:'ghl:a' }, { body:'💬 They texted: "ok"', at:'2026-10-06T10:30:00Z', src:'auto', ref:'ghl:b' }, { body:'☎ Krystal called them, 6 min', at:'2026-10-06T11:00:00Z', src:'auto', ref:'ghl:c' }] };
  window.__upserts=[];
  await window.__realPersist('leads', l);
  const up=(window.__upserts||[])[0]||{};
  ok('a Hub save keeps the recorder\'s events and lines added since the page loaded the lead, in time order', up.contact_events && up.contact_events.map(e=>e.ref||'hub').join(',')==='ghl:a,hub,ghl:b,ghl:c' && up.comm_log.length===4 && up.notes==='typed here', up);
  ok('...and its facts: earliest first try and first reached, their reply, Contacted, tries counted once each', up.first_human_attempt_at==='2026-10-06T09:00:00Z' && up.first_human_contact_at==='2026-10-06T11:00:00Z' && up.family_last_reply_at==='2026-10-06T10:30:00Z'
     && up.status==='Contacted' && up.contact_attempts===2 && up.last_attempt_kind==='voicemail', up);
  window.__upserts=[]; window.__dbLead=JSON.parse(JSON.stringify(up)); const again=JSON.parse(JSON.stringify(up)); again.notes='second save';
  await window.__realPersist('leads', again);
  ok('...saving again adds nothing twice', (window.__upserts[0]||{}).contact_events.length===4 && window.__upserts[0].contact_attempts===2, window.__upserts[0]);
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1360, 'height': 1000})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(f'http://localhost:{PORT}/index.html?proof=leadrecorder'); pg.wait_for_timeout(1200)
    pg.evaluate("()=>{ window.__realRLS = window.renderLeadsStarts; window.__realPersist = window.persist; }")
    pg.evaluate('s=>(0,eval)(s)', STUB); pg.evaluate('s=>(0,eval)(s)', MORE)
    R = pg.evaluate(T)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

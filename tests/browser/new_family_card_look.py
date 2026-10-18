"""The one-tap New family? card on Today (2026-10-18, her "Yes, build the one-tap New Family card as shown"). A call the AI
tagged as a new family gets one Act now card: Yes, lead (a short Undo window, then the REGULAR save), Not a lead (who was
it?), Check the form first, Play the call. The real page, offline, made-up people: nothing is saved anywhere (saves are
recorded, not sent) and nobody is texted or emailed. Page clock pinned to Wed 7 Oct 2026 10:00am Chicago (clock_pin.py).
(HUB_ROOT=<folder> PORT=<port> python3 tests/browser/new_family_card_look.py, with a static server on that folder and port)"""
import os, sys
from playwright.sync_api import sync_playwright

PORT = os.environ.get('PORT', '8765')

STUB = r"""
(()=>{
  const W=window; W.__log={ fn:[], persisted:[], toasts:[] };
  const S='samantha@mo-care.com';
  W.__READ=[
    { message_id:'msgNEW001', call_type:'new_client_inquiry', lead_id:null, read_at:'2026-10-07T14:50:00Z', call_at:'2026-10-07T14:42:00Z', seconds:372, who_name:null, caller:'Linda P.', detail:{ summary:'Daughter asking about morning help for her mom in Nixa after a fall.', answered_by:'ghlSam' } },
    { message_id:'msgKRY008', call_type:'new_client_inquiry', lead_id:null, read_at:'2026-10-07T14:20:00Z', call_at:'2026-10-07T14:10:00Z', seconds:240, who_name:null, caller:'Kay K.', detail:{ summary:'Son asking about help for his dad.', answered_by:'ghlKry' } },
    { message_id:'msgSPAM07', call_type:'new_client_inquiry', lead_id:null, read_at:'2026-10-07T14:05:00Z', call_at:'2026-10-07T14:00:00Z', seconds:90, who_name:null, caller:'Sales G.', detail:{ summary:'Says they need care.' } },
    { message_id:'msgSAME05', call_type:'new_client_inquiry', lead_id:null, read_at:'2026-10-07T14:55:00Z', call_at:'2026-10-07T14:52:00Z', seconds:200, who_name:null, caller:'Ruth O.', detail:{ summary:'Asking about care again.' } },
    { message_id:'msgOLD003', call_type:'new_client_inquiry', lead_id:null, read_at:'2026-10-03T15:00:00Z', call_at:'2026-10-03T14:00:00Z', seconds:300, who_name:null, caller:'Old C.', detail:{ summary:'Three days ago.' } },
    { message_id:'msgCG0002', call_type:'caregiver', lead_id:null, read_at:'2026-10-07T14:31:00Z', call_at:'2026-10-07T14:30:00Z', seconds:40, who_name:'Ann Caregiver', caller:'Ann C.', detail:{ summary:'Caregiver running late.' } }];
  (0,eval)(`sb={ from:(t)=>{ const p={ select(){return p;}, gte(){return p;}, in(){return p;}, not(){return p;}, order(){return p;}, limit(){return p;},
      _k:'', eq(c,v){ if(c==='key') p._k=v; return p; }, maybeSingle:async()=>({data: t==='app_data'&&p._k==='ghl_users' ? { data:[{ id:'people', people:{ ghlSam:{ email:'samantha@mo-care.com', first:'Samantha' }, ghlKry:{ email:'krystal@mo-care.com', first:'Krystal' } } }] } : null, error:null}), then(a,b){ return Promise.resolve({data: t==='call_task_reading' ? window.__READ : [], error:null}).then(a,b); } }; return p; },
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async()=>({data:null,error:null}) }, storage:{ from:()=>({}) },
    auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}), getUser:async()=>({data:{user:null}}) } };
    ME={ email:'${S}', name:'Samantha Troutman', shift:'day' };
    OPS_PEOPLE=[{ person_id:'p_s', full_name:'Samantha Troutman', primary_email:'${S}' }, { person_id:'p_k', full_name:'Krystal Example', primary_email:'krystal@mo-care.com' }];
    CALLS_FEED={ generated_at:'2026-10-07T14:59:00Z', calls:[ { id:'msgSPAM07', name:'Sales Guy', phone:'+14175550777', direction:'inbound', duration:90, at:'2026-10-07T14:00:00Z' },
      { id:'missBLK1', name:'Sales Guy', phone:'(417) 555-0777', direction:'inbound', duration:0, status:'no-answer', at:'2026-10-07T14:30:00Z' },
      { id:'missOK01', name:'Real Person', phone:'+14175550300', direction:'inbound', duration:0, status:'no-answer', at:'2026-10-07T14:31:00Z' } ] };
    OPS_DOMAINS=[{ code:'family_enquiries', label:'Family inquiries', owner_person:'p_s', escalation_person:'p_s' }];`);
  W.persist=async(k,i)=>{ W.__log.persisted.push([k, JSON.parse(JSON.stringify(i))]); };
  W.ccToast=m=>{ W.__log.toasts.push(m); }; W.opEvent=()=>{}; W.ccOpsRefresh=()=>{}; W.ccRecentFetch=async()=>{}; W.reviewMaybeCreate=async()=>{};
  W.cjAutoOpen=()=>{ W.__log.journey=(W.__log.journey||0)+1; };
  W.ckFind=async()=>(W.__same||{ leads:[], clients:[] }); W.ckPanel=async()=>({ kind:'cancel' });
  const realFetch=W.fetch.bind(W);
  W.fetch=async(url,o)=>{ url=String(url);
    if(url.includes('/functions/v1/calls-feed')) return new Response(new Blob(['x'],{type:'audio/mpeg'}), { status:200 });
    if(!url.includes('/functions/v1/call-to-lead')) return realFetch(url,o);
    const b=JSON.parse(o.body); W.__log.fn.push(b);
    if(b.action==='read') return new Response(JSON.stringify({ ok:true, transcript:true, call:{ message_id:b.message_id, at:'2026-10-07T14:42:00Z', direction:'inbound', seconds:372 },
      contact:{ id:'C77', first_name:'Linda', last_name:'Parker', phone:'+14175550142', email:'' },
      prefill:{ first_name: b.message_id==='msgSAME05'?'Ruth':'Linda', last_name: b.message_id==='msgSAME05'?'Old':'Parker', phone:'+14175550142', source:'Phone', relationship:'Daughter',
        client_first_name:'Margaret', client_city:'Nixa', desired_start_kind:'this_week', schedule_days:['Mon','Tue','Wed','Thu','Fri'], times_needed:'Mornings',
        number_of_hours:'20', funding_source:'private', interest_notes:'Linda called about her mom Margaret in Nixa.' },
      heard:['relationship','client_first_name','client_city','desired_start_kind','schedule_days','times_needed','number_of_hours','funding_source','interest_notes'],
      is_new_family:true, medicaid_mentioned:false, care_plan:{ fields:{}, narrative:'', axiscare_tasks:[], heard:[] } }), { status:200 });
    if(b.action==='made') return new Response(JSON.stringify({ ok:true, tagged:true }), { status:200 });
    return new Response('{}', { status:400 }); };
  DATA.ops_settings={}; DATA.referral_orgs=[]; DATA.care_assessments=[]; DATA.care_plans=[]; DATA.ops_items=[]; DATA.call_lead_marks=[]; DATA.coverage_cases=[];
  DATA.leads=[]; DATA.post_call_followups=[];
  DATA.phone_suppress=[{ id:'s_old', phone:'+14175550777', digits:'4175550777', why:'Spam or Sales', at:'2026-10-01T15:00:00Z', by:'phone screen' }];
})();
"""

T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, $=s=>document.querySelector(s);
  const item=id=>DATA.ops_items.find(x=>x.id==='ops_newfam_'+id);
  const card=id=>document.querySelector('.wkcard[data-id="ops_newfam_'+id+'"]');
  const until=async(f,ms)=>{ const t=Date.now(); while(Date.now()-t<(ms||3000)){ if(f()) return true; await sleep(50); } return false; };
  document.getElementById('appScreen').classList.add('on');

  await CallLead.reconcile();
  const it=item('msgNEW001');
  ok('a card for the new-family call', !!it && it.kind==='new_family_call' && it.status==='open', DATA.ops_items);
  ok('due 2 hours after the call', it && it.due==='2026-10-07T16:42:00.000Z', it&&it.due);
  ok('owner = whoever answered (Samantha)', it && it.owner==='samantha@mo-care.com' && it.source.answered_by_name, it);
  ok('answered by Krystal: her card', item('msgKRY008') && item('msgKRY008').owner==='krystal@mo-care.com', item('msgKRY008'));
  ok('nobody named on the call: whoever owns Family inquiries', item('msgSAME05') && item('msgSAME05').owner==='samantha@mo-care.com' && !item('msgSAME05').source.answered_by_name, item('msgSAME05'));
  ok('a number on the block list gets no card', !item('msgSPAM07'));
  opsReconcileCalls();
  ok('a blocked number gets no missed-call card (any phone format)', !DATA.ops_items.some(x=>x.id==='ops_missBLK1'));
  ok('another missed call still gets its card', DATA.ops_items.some(x=>x.id==='ops_missOK01'));
  ok('saved', L.persisted.some(p=>p[0]==='ops_items'&&p[1].id==='ops_newfam_msgNEW001'));
  ok('no card for a call older than 48 hours', !item('msgOLD003'));
  ok('no card for a caregiver call', !item('msgCG0002'));
  ok('Act now', myWorkLane(it)===0, myWorkLane(it));
  ok('nothing was made or tagged by itself', !DATA.leads.length && !L.fn.some(f=>f.action==='made'));

  switchTab('mywork'); myWorkGo('today'); await sleep(200);
  ok('card on Today', !!card('msgNEW001'));
  ok('facts read once', await until(()=>it.facts && card('msgNEW001') && /About 20 a week/.test(card('msgNEW001').innerText)), it.facts);
  const t1=card('msgNEW001').innerText;
  ok('says New family? and the call', /New family\?/.test(t1) && /Call on the office line/.test(t1) && /6 min/.test(t1), t1);
  ok('says who took it', /Samantha took it/.test(t1), t1);
  ok('who and about whom', /Linda Parker \(daughter\), calling about Margaret/.test(t1), t1);
  ok('the four facts', /Private pay/.test(t1) && /This week/.test(t1) && /Mon, Tue, Wed, Thu, Fri · Mornings/.test(t1) && /Nixa/.test(t1), t1);
  ok('the summary', /morning help for her mom in Nixa/.test(t1));
  ok('Yes, lead / Not a lead / Check the form first / Play the call', ['Yes, lead','Not a lead','Check the form first','Play the call'].every(w=>t1.indexOf(w)>-1), t1);
  ok('no em dash on the card', !/—/.test(card('msgNEW001').innerHTML));
  ok('one read for the card', L.fn.filter(f=>f.action==='read'&&f.message_id==='msgNEW001').length===1, L.fn);

  /* Play the call */
  [...card('msgNEW001').querySelectorAll('a')].find(a=>/Play the call/.test(a.textContent)).click();
  ok('plays the recording', await until(()=>!!document.querySelector('#nfrec-msgNEW001 audio')));

  /* Not a lead, then Undo brings it back */
  [...card('msgNEW001').querySelectorAll('button')].find(b=>/Not a lead/.test(b.textContent)).click(); await sleep(100);
  const t2=card('msgNEW001').innerText;
  ok('asks who it was', /Who was it\?/.test(t2) && ['Caregiver or applicant','Current client or family','Referral partner','Spam or sales','Something else'].every(w=>t2.indexOf(w)>-1), t2);
  [...card('msgNEW001').querySelectorAll('button')].find(b=>/Spam or sales/.test(b.textContent)).click();
  ok('closed as not a lead', await until(()=>it.status==='done'), it);
  const mk=DATA.call_lead_marks.find(m=>m.id==='msgNEW001');
  ok('kept on the call with the reason', mk && mk.verdict==='not' && mk.reason==='spam', mk);
  ok('close note says why', /Not a lead \(Spam or sales\)/.test(it.close_note||''), it.close_note);
  const blk=DATA.phone_suppress.find(x=>x.id==='sup_msgNEW001');
  ok('spam: the number goes on the block list', blk && blk.digits==='4175550142' && /spam or sales/.test(blk.why) && L.persisted.some(p=>p[0]==='phone_suppress'&&p[1].id==='sup_msgNEW001'), blk);
  ok('spam: the toast says it is blocked', L.toasts.some(m=>/That number is blocked/.test(m)), L.toasts);
  ok('the Hub now honors it', !!CallLead.suppressed('417-555-0142'));
  await sleep(150);
  ok('gone from Today', !card('msgNEW001'));
  await CallLead.undoNot('msgNEW001'); await CallLead.reconcile(); await sleep(150);
  ok('Undo brings the card back', it.status==='open' && !!card('msgNEW001'), it);
  ok('Undo takes the number off the block list (kept, marked undone)', blk.undone_at && !CallLead.suppressed('4175550142'), blk);

  /* Yes, then Undo before anything is saved */
  CallLead._state.waitS=0.6;
  const nPersist=L.persisted.length;
  [...card('msgNEW001').querySelectorAll('button')].find(b=>/Yes, lead/.test(b.textContent)).click(); await sleep(100);
  ok('says it is about to make the lead, with Undo', /Making Linda Parker a lead in a few seconds\./.test(card('msgNEW001').innerText) && /Undo/.test(card('msgNEW001').innerText), card('msgNEW001').innerText);
  [...card('msgNEW001').querySelectorAll('a')].find(a=>/Undo/.test(a.textContent)).click(); await sleep(900);
  ok('Undo: no lead, nothing tagged', !DATA.leads.length && !L.fn.some(f=>f.action==='made'));
  ok('Undo: card back to its buttons', /Yes, lead/.test(card('msgNEW001').innerText));

  /* Yes for real */
  [...card('msgNEW001').querySelectorAll('button')].find(b=>/Yes, lead/.test(b.textContent)).click();
  ok('the lead is made after the wait', await until(()=>DATA.leads.length===1, 4000), DATA.leads);
  const l=DATA.leads[0]||{};
  ok('through the regular save: the form\'s facts', l.first_name==='Linda' && l.client_city==='Nixa' && l.funding_source==='private', l);
  ok('the call is on the lead', Array.isArray(l.from_calls) && l.from_calls.some(c=>c.message_id==='msgNEW001'), l.from_calls);
  ok('the call counts as the first conversation', !!l.first_human_contact_at && l.status==='Contacted', l);
  ok('GoHighLevel tag asked for', await until(()=>L.fn.some(f=>f.action==='made'&&f.message_id==='msgNEW001')));
  ok('journey started', L.journey===1, L.journey);
  ok('form never shown and closed after', !$('#leadModalBackdrop').classList.contains('open') && !$('#leadModalBackdrop').classList.contains('cl-quiet'));
  ok('card closed: Made a lead', await until(()=>it.status==='done' && /Made a lead: Linda Parker/.test(it.close_note||'')), it);
  ok('toast says what is next', L.toasts.some(m=>/Linda Parker is a lead\. Next: book the home visit\./.test(m)), L.toasts);
  ok('still one read of the call', L.fn.filter(f=>f.action==='read'&&f.message_id==='msgNEW001').length===1, L.fn);

  /* Same family found: the save stops for a person, the filled form shows */
  window.__same={ leads:[{ lead:{ id:'L_r', first_name:'Ruth', last_name:'Old' }, why:['phone'] }], clients:[] };
  const it2=item('msgSAME05');
  ok('second card exists', !!it2 && it2.status==='open');
  await sleep(200);
  [...card('msgSAME05').querySelectorAll('button')].find(b=>/Yes, lead/.test(b.textContent)).click();
  ok('same family: the form opens for a person', await until(()=>$('#leadModalBackdrop').classList.contains('open') && !$('#leadModalBackdrop').classList.contains('cl-quiet') && !CallLead._state.working.msgSAME05, 4000));
  ok('same family: no second lead saved', DATA.leads.length===1, DATA.leads.length);
  ok('same family: says check it', L.toasts.some(m=>/Check this one before it is saved\./.test(m)), L.toasts);
  ok('same family: card still open', it2.status==='open');
  closeModal('leadModalBackdrop');
  return R;
}
"""

R = []
with sync_playwright() as pw:
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from clock_pin import pin
    b = pw.chromium.launch()
    for name, size in (('desktop', {'width': 1360, 'height': 900}), ('phone', {'width': 390, 'height': 844})):
        pg = b.new_page(viewport=size)
        pin(pg)
        pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        pg.goto('http://localhost:' + PORT + '/index.html?proof=newfam-' + name); pg.wait_for_timeout(1200)
        pg.evaluate('s=>(0,eval)(s)', STUB)
        out = pg.evaluate(T)
        if name == 'desktop':
            pg.screenshot(path=os.environ.get('SHOT', '/tmp/newfam.png'), full_page=False)
        out = [[s_, name + ': ' + n, d] for s_, n, d in out]
        out.append(['PASS' if not errs else 'FAIL', name + ': no page errors', errs[:3]])
        R += out; pg.close()
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

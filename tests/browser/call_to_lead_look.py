"""Make this a lead (2026-10-14): every answered call on the Calls tab and Call Follow Ups has Make this a lead; the AI's
"new client inquiry" shows as "Sounds like a new family" with Not a lead; the button opens the REGULAR lead form filled from
the call with every heard box yellow; saving keeps the call on the lead and asks for the GoHighLevel tag; the same-family
check puts the call on their open lead instead. The real page, offline, made-up data.
(python3 tests/browser/call_to_lead_look.py, static server on PORT, default 8765)"""
import os
from playwright.sync_api import sync_playwright
PORT = os.environ.get('PORT', '8765')
STUB = r"""
(()=>{
  const W=window; W.__log={ fn:[], persisted:[], toasts:[] };
  const READ=[{ message_id:'msgNEW001', call_type:'new_client_inquiry', lead_id:null, read_at:'2026-10-14T15:30:00Z', detail:{ summary:'Daughter asking about help for her mom in Nixa after a fall.' } },
              { message_id:'msgCG0002', call_type:'caregiver', lead_id:null, read_at:'2026-10-14T15:31:00Z', detail:{ summary:'Caregiver running late.' } },
              { message_id:'msgOLD003', call_type:'family', lead_id:'L_old', read_at:'2026-10-14T15:32:00Z', detail:{ summary:'Existing lead calling back.' } }];
  (0,eval)(`sb={ from:(t)=>{ const p={ select(){return p;}, eq(){return p;}, gte(){return p;}, in(){return p;}, not(){return p;}, order(){return p;}, limit(){return p;},
      maybeSingle:async()=>({data:null,error:null}), then(a){ return Promise.resolve({data: t==='call_task_reading' ? window.__READ : [], error:null}).then(a); } }; return p; },
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async()=>({data:null,error:null}) }, auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };`);
  W.__READ=READ;
  W.persist=async(k,i)=>{ W.__log.persisted.push([k, JSON.parse(JSON.stringify(i))]); }; W.ccToast=m=>{ W.__log.toasts.push(m); }; W.opEvent=()=>{};
  W.ckFind=async()=>(W.__same||{ leads:[], clients:[] }); W.ckPanel=async()=>({ kind:'lead', id:'L_old' }); W.openLeadProfile=id=>{ W.__log.opened=id; };
  const realFetch=W.fetch.bind(W);
  W.fetch=async(url,o)=>{ url=String(url); if(!url.includes('/functions/v1/call-to-lead')) return realFetch(url,o);
    const b=JSON.parse(o.body); W.__log.fn.push(b);
    if(b.action==='read') return new Response(JSON.stringify({ ok:true, transcript:true, call:{ message_id:b.message_id, at:'2026-10-14T15:14:00Z', direction:'inbound', seconds:360 },
      contact:{ id:'C77', first_name:'Linda', last_name:'Parker', phone:'+14175550142', email:'' },
      prefill:{ first_name:'Linda', last_name:'Parker', phone:'+14175550142', email:'', source:'Referral', relationship:'Daughter', client_first_name:'Margaret', client_city:'Nixa',
        referral_source_name:'Mercy discharge planner', desired_start_kind:'this_week', needs:['personalCare','housekeeping'], safety:['fallRisk'], mobility:'walker',
        schedule_days:['Mon','Tue','Wed','Thu','Fri'], times_needed:'Mornings, 8 to 12', number_of_hours:'20', funding_source:'private',
        why_called:'Daughter looking for morning help for her mom after a fall', interest_notes:'Linda called about her mom Margaret in Nixa.' },
      heard:['source','relationship','client_first_name','client_city','referral_source_name','desired_start_kind','needs','safety','mobility','schedule_days','times_needed','number_of_hours','funding_source','why_called','interest_notes'],
      is_new_family:true, not_new_family_reason:'' }), { status:200 });
    if(b.action==='made') return new Response(JSON.stringify({ ok:true, tagged:true }), { status:200 });
    return new Response('{}', { status:400 }); };
  DATA.ops_settings={}; DATA.referral_orgs=[]; DATA.care_assessments=[]; DATA.ops_items=[]; DATA.call_lead_marks=[];
  DATA.leads=[{ id:'L_old', first_name:'Ruth', last_name:'Old', phone:'4175550999', status:'Contacted', created_at:'2026-10-01T15:00:00Z' }];
  (0,eval)(`CALLS_FILTER='all'; CALLS_FEED={ generated_at:'2026-10-14T15:40:00Z', calls:[
    { id:'msgNEW001', name:'Linda Parker', phone:'+14175550142', contact_id:'C77', direction:'inbound', duration:360, at:'2026-10-14T15:14:00Z', has_recording:true },
    { id:'msgCG0002', name:'Ann Caregiver', phone:'+14175550200', contact_id:'C78', direction:'inbound', duration:40, at:'2026-10-14T15:20:00Z', has_recording:true },
    { id:'msgOLD003', name:'Ruth Old', phone:'+14175550999', contact_id:'C79', direction:'inbound', duration:90, at:'2026-10-14T15:25:00Z', has_recording:true },
    { id:'msgMISS04', name:'Missed Person', phone:'+14175550300', contact_id:'C80', direction:'inbound', duration:0, status:'no-answer', at:'2026-10-14T15:26:00Z' } ] };`);
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,800)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  await CallLead.load(true); callsPaint(); await sleep(50);
  const row=id=>document.querySelector('#callsList .cl-row[data-call="'+id+'"]'), txt=id=>(row(id)||{}).innerText||'';
  ok('a call the AI calls a new client inquiry: "Sounds like a new family", Make this a lead (filled) and Not a lead, with the summary', /Daughter asking about help/.test(txt('msgNEW001')) && /Sounds like a new family/.test(txt('msgNEW001'))
     && /Make this a lead/.test(txt('msgNEW001')) && /Not a lead/.test(txt('msgNEW001')) && row('msgNEW001').querySelector('button.primary').textContent==='Make this a lead', txt('msgNEW001'));
  ok('any other answered call: Make this a lead only (no tag, no Not a lead)', /Make this a lead/.test(txt('msgCG0002')) && !/Sounds like|Not a lead/.test(txt('msgCG0002')) && !row('msgCG0002').querySelector('button.primary'), txt('msgCG0002'));
  ok('a caller who already has an open lead: Open lead, with their name', /Lead: Ruth Old/.test(txt('msgOLD003')) && /Open lead/.test(txt('msgOLD003')) && !/Make this a lead/.test(txt('msgOLD003')), txt('msgOLD003'));
  ok('a missed call has no buttons', !row('msgMISS04'));

  /* Make this a lead → the regular form, filled */
  [...row('msgNEW001').querySelectorAll('button')].find(b=>b.textContent==='Make this a lead').click(); await sleep(300);
  const v=id=>document.getElementById(id).value, m=document.getElementById('leadModalBackdrop');
  ok('the regular lead form opens, titled from the call', m.classList.contains('open') && /^New lead from the (Wed, Oct 14 )?10:14 am call$/.test(document.getElementById('leadModalTitle').textContent), document.getElementById('leadModalTitle').textContent);
  ok('...filled from the call: caller and phone from GoHighLevel, who it is for, town, start, schedule, payer, why, notes',
     v('lead_first_name')==='Linda' && v('lead_phone')==='+14175550142' && v('lead_relationship')==='Daughter' && v('lead_client_first_name')==='Margaret' && v('lead_client_city')==='Nixa'
     && v('lead_desired_start_kind')==='this_week' && v('lead_times_needed')==='Mornings, 8 to 12' && v('lead_number_of_hours')==='20' && getRadioValue('lead_funding_source')==='private' && getRadioValue('lead_mobility')==='walker'
     && getCheckedValues('lead_needs_grid').join()==='personalCare,housekeeping' && getCheckedValues('lead_schedule_days').join()==='Mon,Tue,Wed,Thu,Fri' && v('lead_source')==='Referral'
     && /after a fall/.test(v('lead_why_called')) && /Linda called/.test(v('lead_interest_notes')), { first:v('lead_first_name'), rel:v('lead_relationship'), needs:getCheckedValues('lead_needs_grid') });
  const yellow=()=>[...document.querySelectorAll('#leadModalBackdrop .cl-heard')].filter(e=>e.id!=='clBanner' && !e.closest('#clBanner'));
  ok('every heard box is yellow (typed boxes and the ticked choices); GoHighLevel\'s name and phone are not', document.getElementById('lead_client_city').classList.contains('cl-heard')
     && document.getElementById('lead_relationship').classList.contains('cl-heard') && document.querySelectorAll('#lead_needs_grid label.cl-heard').length===2
     && !document.getElementById('lead_first_name').classList.contains('cl-heard') && !document.getElementById('lead_phone').classList.contains('cl-heard'), yellow().map(e=>e.id||e.innerText.slice(0,20)));
  ok('a banner explains the yellow', /Yellow = heard on the call/.test((document.getElementById('clBanner')||{}).innerText||''));
  const city=document.getElementById('lead_client_city'); city.value='Nixa, MO'; city.dispatchEvent(new Event('input',{bubbles:true}));
  ok('changing a yellow box takes its yellow away (a person checked it)', !city.classList.contains('cl-heard') && document.getElementById('lead_relationship').classList.contains('cl-heard'));
  const clinical=document.getElementById('lead_safety_grid').closest('details'); ok('a folded section with heard answers is opened', !clinical || clinical.open);

  /* save → the call is on the lead, GoHighLevel tag asked */
  await saveLead(); await sleep(200);
  const nl=DATA.leads.find(l=>l.client_first_name==='Margaret');
  ok('Save makes the lead the usual way, with the call kept on it and the GoHighLevel contact', nl && nl.from_calls && nl.from_calls[0].message_id==='msgNEW001' && nl.ghl_contact_id==='C77' && nl.last_call_at==='2026-10-14T15:14:00Z' && nl.client_city==='Nixa, MO', nl);
  ok('...and asks the server to tag the GoHighLevel contact "lead" for that lead', __log.fn.some(b=>b.action==='made' && b.message_id==='msgNEW001' && b.lead_id===nl.id), __log.fn);
  callsPaint(); await sleep(30);
  ok('the call now shows Open lead (Linda Parker)', /Lead: Linda Parker/.test(txt('msgNEW001')) && /Open lead/.test(txt('msgNEW001')), txt('msgNEW001'));
  openLeadModal(); ok('a form opened any other way has no yellow and no banner', !document.querySelector('#leadModalBackdrop .cl-heard') && !document.getElementById('clBanner') && document.getElementById('leadModalTitle').textContent==='Add Lead');
  closeModal('leadModalBackdrop');

  /* Not a lead, Undo */
  __READ[1].call_type='new_client_inquiry'; await CallLead.load(true); callsPaint();
  [...row('msgCG0002').querySelectorAll('button')].find(b=>b.textContent==='Not a lead').click(); await sleep(50);
  ok('Not a lead is kept (who, when) and the row says so with Undo', __log.persisted.some(p=>p[0]==='call_lead_marks' && p[1].id==='msgCG0002' && p[1].verdict==='not') && /Not a lead[\s\S]*Undo/.test(txt('msgCG0002')), txt('msgCG0002'));
  [...row('msgCG0002').querySelectorAll('a')].find(a=>a.textContent==='Undo').click(); await sleep(50);
  ok('...Undo brings the buttons back', /Make this a lead/.test(txt('msgCG0002')));

  /* Call Follow Ups: the waiting list */
  const rows=__READ.map(r=>Object.assign({ channel:'call', who_name:'', caller:'Ann C.' }, r));
  const box=document.createElement('div'); box.innerHTML=CallLead.waitingHtml(rows);
  ok('Call Follow Ups lists the new families nobody has decided on (made-into-a-lead ones drop off)', /NOT A LEAD YET \(1\)/.test(box.innerText) && /Ann C\./.test(box.innerText) && !/Linda/.test(box.innerText), box.innerText);
  const cb=document.createElement('div'); cb.innerHTML=CallLead.cardBar(rows[0]); ok('...and each call card has the bar (Open lead once it is one)', /Open lead/.test(cb.innerText), cb.innerText);
  cb.innerHTML=CallLead.cardBar(Object.assign({}, rows[1], { channel:'text' })); ok('...but never on a text conversation', cb.innerHTML==='');

  /* the same family already has an open lead: the call goes onto THAT lead */
  __READ.push({ message_id:'msgDUP005', call_type:'new_client_inquiry', lead_id:null, read_at:'2026-10-14T15:50:00Z', detail:{ summary:'Ruth again.' } });
  CALLS_FEED.calls.push({ id:'msgDUP005', name:'Ruth Old', phone:'+14175550999', contact_id:'C79', direction:'inbound', duration:60, at:'2026-10-14T15:45:00Z' });
  window.__same={ leads:[{ id:'L_old' }], clients:[] }; await CallLead.load(true); callsPaint();
  await CallLead.make('msgDUP005'); await sleep(100); await saveLead(); await sleep(150);
  const old=DATA.leads.find(l=>l.id==='L_old');
  ok('same family: no second lead; the call is added to their open lead and their profile opens', DATA.leads.filter(l=>l.first_name==='Linda').length===1 && (old.from_calls||[]).some(x=>x.message_id==='msgDUP005') && __log.opened==='L_old'
     && __log.toasts.some(t=>/Added this call to Ruth Old/.test(t)), { old, toasts:__log.toasts });
  ok('nothing in this module sends a text or an email', !__log.fn.some(b=>!['read','made'].includes(b.action)));
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1360, 'height': 900})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(f'http://localhost:{PORT}/index.html?proof=calllead'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

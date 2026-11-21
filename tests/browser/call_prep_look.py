"""New family cards, practice replay (2026-11-19, her "Yes, build step 1" + "I also want a summary of the call"). The real
Hub page, offline (files served from this folder), made-up people only. Checks: only owners get the "New family cards" view
in Call Follow Ups; each prepared card shows the summary, what would be ready (lead, assessment, CDS, call back, promises),
what the office really did, the prep email draft; a mark saves through call_prep_mark and nothing else is written or sent.
(python3 tests/browser/call_prep_look.py; SHOTS=<dir> also saves screenshots)"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = os.environ.get('SHOTS')
STUB = r"""
(()=>{
  const W=window; W.__log={ writes:[], fn:[], toasts:[], alerts:[], rpc:[], tables:[] };
  const K='krystal@mo-care.com', S='samantha@mo-care.com';
  const prep={ summary:'Linda called about her mom Dorothy and her mother-in-law Ruth, who both live with her. She wants one day a week. We set a visit for Friday.',
    people:[{ name:'Dorothy Fake', dob:'1941-03-09', relationship:'Mother', about:'Uses a walker and forgets it.', needs:'Shower help twice a week.' },{ name:'Ruth Fake', dob:'', relationship:'Mother-in-law', about:'Memory loss and low vision.', needs:'Reminders.' }],
    assessment:{ day:'2026-11-20', time:'11:00', address:'12 Elm Street', city:'Springfield', zip:'', address_unsure:'ZIP heard as "03"', who_goes:'' },
    cds:{ person:'Dorothy Fake', medicaid:'yes', attendant:'a friend', note:'Was in a nursing home.' }, wants:'One day a week, 4 hours.', pay:'Private pay, $30 an hour quoted.', caregiver_talk:'',
    promises:['Call Linda back with the Medicaid result'], visit_questions:['Which day works best?'] };
  W.__rows=[
    { message_id:'m1', msg_at:'2026-11-18T20:00:00Z', direction:'inbound', seconds:1075, staff:S, status:'read', tries:1, verdict:null,
      reading:{ who:{ name:'Linda Fake', phone:'(417) 555-0100', relationship:'Daughter' }, prep, email:{ subject:'Friday 11-20 at 11 AM assessment: Linda Fake (2 people in one home)', body:'The visit\nFriday 11-20 at 11 AM\n12 Elm Street, Springfield\n\nThe call in short\nLinda called.' },
        lead:{ prefill:{ client_first_name:'Dorothy', number_of_hours:'4', interest_notes:'long' }, heard:['client_first_name','number_of_hours','interest_notes'], medicaid_mentioned:true, call_back:{ day:'2026-11-20', why:'the Medicaid result' } } } },
    { message_id:'m2', msg_at:'2026-11-10T16:00:00Z', direction:'inbound', seconds:300, staff:K, status:'read', tries:1, verdict:'close', verdict_note:'hours were off',
      reading:{ who:{ name:'Greg <b>Fake</b>', phone:'(417) 555-0111', relationship:'Self' }, prep:{ summary:'Greg asked about help after surgery.', people:[], assessment:null, cds:null, wants:'', pay:'', caregiver_talk:'', promises:[], visit_questions:[] }, email:{ subject:'New family call: Greg Fake', body:'The call in short\nGreg asked.' }, lead:{ prefill:{}, heard:[], call_back:null } } },
    { message_id:'m3', msg_at:'2026-11-09T16:00:00Z', seconds:12, status:'skipped', tries:1, note:'shorter than 30 seconds' } ];
  (0,eval)(`sb={ from:(t)=>{ window.__log.tables.push(t); const p={ select(){return p;}, eq(){return p;}, gte(){return p;}, in(){return p;}, order(){return p;}, limit(){return p;},
      insert(){ window.__log.writes.push('insert:'+t); return p; }, update(){ window.__log.writes.push('update:'+t); return p; }, upsert(){ window.__log.writes.push('upsert:'+t); return p; }, delete(){ window.__log.writes.push('delete:'+t); return p; },
      single:async()=>({ data:null, error:null }), maybeSingle:async()=>({ data:null, error:null }),
      then(a){ return Promise.resolve(t==='call_prep' ? (window.__prepErr ? { data:null, error:{ message:window.__prepErr } } : { data:JSON.parse(JSON.stringify(window.__rows)), error:null }) : { data:[], error:null }).then(a); } }; return p; },
    rpc:async(n,a)=>{ window.__log.rpc.push([n,a]); return n==='call_prep_mark' ? { data:!window.__markFails, error:null } : { data:null, error:null }; },
    functions:{ invoke:async(n)=>{ window.__log.fn.push(n); return {data:null,error:null}; } },
    auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };
    CC_ROLE_BY_EMAIL={ '${S}':['owner_admin'], '${K}':['care_coordinator'] };
    OPS_PEOPLE=[{ person_id:'p_k', full_name:'Krystal Land', primary_email:'${K}' },{ person_id:'p_s', full_name:'Samantha Troutman', primary_email:'${S}' }];`);
  W.persist=async(k,v)=>{ W.__log.writes.push(k+':'+(v&&v.id)); };
  W.opEvent=()=>{}; W.ccOpsRefresh=()=>{}; W.ccRecentFetch=async()=>{}; W.ccToast=m=>W.__log.toasts.push(m); W.alert=m=>W.__log.alerts.push(m); W.prompt=()=>W.__promptAnswer;
  DATA.handoffs=[]; DATA.coverage_cases=[]; DATA.ops_items=[]; DATA.call_lead_marks=[{ id:'m2', verdict:'not', reason:'current' }];
  DATA.leads=[{ id:'L1', first_name:'Linda', last_name:'Fake', status:'Contacted', phone:'4175550100', created_at:'2026-11-18T21:00:00Z', from_calls:[{ message_id:'m1' }], assessment_booking_id:'b1' }];
  DATA.coordinator_staff=[{ id:'sk', name:'Krystal Land', email:K }, { id:'ss', name:'Samantha Troutman', email:S }];
  DATA.ops_settings={ team_work_live:true, my_work_tiers_live:true, call_tasks_live:true };
  W.__leads0=JSON.stringify(DATA.leads);
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, cfu=()=>document.getElementById('cfuWrap').innerText;
  const as=(e,n)=>(0,eval)("ME={ email:'"+e+"', name:'"+n+"', shift:'day' };");
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';

  as('krystal@mo-care.com','Krystal Land'); switchTab('callfollowups'); await sleep(300);
  ok('a coordinator does not get the New family cards view', !/New family cards/.test(cfu()), cfu().slice(0,500));
  CPR.setFilter('prep'); await sleep(200);
  ok('...even by asking for it; nothing is loaded for her', !/Practice\. Only owners see this/.test(cfu()) && !L.tables.includes('call_prep'), [cfu().slice(0,300), L.tables]);

  as('samantha@mo-care.com','Samantha Troutman'); CPR.setFilter('all'); await sleep(200);
  ok('an owner sees the New family cards link', /New family cards/.test(cfu()), cfu().slice(0,600));
  CPR.setFilter('prep'); await sleep(400);
  const t=cfu();
  ok('the practice banner says nothing was made, booked or sent', /Practice\. Only owners see this\./.test(t) && /Nothing here made a lead, booked a visit, or sent anything/.test(t), t.slice(0,500));
  ok('the tally: 2 prepared, a lead for 1, 1 assessment, 1 CDS, 1 marked close', /2 cards prepared/.test(t) && /a lead for 1 of them/.test(t) && /1 had an assessment time/.test(t) && /1 asked about CDS/.test(t) && /0 right, 1 close, 0 wrong/.test(t), t.slice(0,700));
  const c1=document.querySelector('.cp-card[data-id="m1"]').innerText;
  ok('the card leads with the summary of the call', /Summary of the call: Linda called about her mom Dorothy/.test(c1), c1.slice(0,400));
  ok('who took it and how long', /they called · 17 min · Samantha took it/.test(c1), c1.slice(0,200));
  ok('what would be ready: the lead, both people', /Lead: Linda Fake \(daughter\) \(417\) 555-0100, for Dorothy Fake and Ruth Fake/.test(c1), c1);
  ok('...the assessment to hold, with the address and the thing to check', /Assessment to hold: Friday 11-20 at 11 AM, 12 Elm Street, Springfield/.test(c1) && /Check: ZIP heard as "03"/.test(c1), c1);
  ok('...the CDS lead, the call back and what we promised', /CDS lead to make: Dorothy Fake\. Medicaid, as said: yes/.test(c1) && /Call back for My Week: Friday 11-20, the Medicaid result/.test(c1) && /Call Linda back with the Medicaid result/.test(c1), c1);
  ok('what the office did: lead made from this call, assessment on it', /Lead made from this call: Linda Fake \(Contacted\)/.test(c1) && /An assessment is on that lead/.test(c1), c1);
  ok('the prep email draft is there, marked not sent', /Prep email draft for whoever goes \(not sent\)/.test(c1) && document.querySelector('.cp-card[data-id="m1"] pre').textContent.startsWith('The visit\nFriday 11-20 at 11 AM'));
  ok('the lead boxes it would fill are listed (not the long notes)', /client first name: Dorothy/.test(document.querySelector('.cp-card[data-id="m1"]').textContent) && !/interest notes/.test(document.querySelector('.cp-card[data-id="m1"]').textContent));
  const c2=document.querySelector('.cp-card[data-id="m2"]');
  ok('a call with no visit says so; no lead, and the office marked it Not a lead', /No assessment time was set on the call/.test(c2.innerText) && /No lead was made from this call/.test(c2.innerText) && /The office marked it Not a lead \(current\)/.test(c2.innerText), c2.innerText);
  ok('names from the call are shown as text, never as page code', !c2.querySelector('b b') && /Greg <b>Fake<\/b>/.test(c2.innerText), c2.innerHTML.slice(0,300));
  ok('an earlier mark shows', /Marked close: hours were off/.test(c2.innerText));
  ok('calls with no card are folded away with the reason', /CALLS WITH NO CARD \(1\)/.test(t) && /shorter than 30 seconds/.test(document.getElementById('cfuWrap').textContent));
  if(window.__shot) await window.__shot('new-family-cards');

  await CallPrep.mark('m1','right'); await sleep(150);
  ok('Right saves one mark through call_prep_mark', L.rpc.length===1 && L.rpc[0][0]==='call_prep_mark' && L.rpc[0][1].p_message_id==='m1' && L.rpc[0][1].p_verdict==='right' && /Marked right/.test(document.querySelector('.cp-card[data-id="m1"]').innerText), L.rpc);
  window.__promptAnswer=null; await CallPrep.mark('m1','wrong'); await sleep(100);
  ok('Wrong asks what was wrong; cancelling saves nothing', L.rpc.length===1);
  window.__promptAnswer='wrong day'; await CallPrep.mark('m1','wrong'); await sleep(150);
  ok('...and with an answer it saves the note', L.rpc.length===2 && L.rpc[1][1].p_note==='wrong day' && /Marked wrong: wrong day/.test(document.querySelector('.cp-card[data-id="m1"]').innerText), L.rpc);
  window.__markFails=true; await CallPrep.mark('m2','right'); await sleep(150);
  ok('a mark the server refuses says so and changes nothing on the page', L.alerts.some(a=>/was not saved/.test(a)) && /Marked close/.test(document.querySelector('.cp-card[data-id="m2"]').innerText), L.alerts);

  window.__prepErr='relation "public.call_prep" does not exist'; CallPrep.refresh(); await sleep(400);
  ok('before the server piece is in, it says so plainly', /The server piece is not in yet/.test(cfu()), cfu().slice(0,500));
  window.__prepErr='permission denied'; CallPrep.refresh(); await sleep(400);
  ok('a load failure is said, never a blank page', /could not be loaded: permission denied/.test(cfu()), cfu().slice(0,500));

  ok('no lead changed, nothing written to any table', JSON.stringify(DATA.leads)===window.__leads0 && L.writes.length===0, L.writes);
  ok('nothing was texted, emailed or called', L.fn.length===0, L.fn);
  return R;
}
"""
MIME = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.json':'application/json', '.webmanifest':'application/json'}
def serve(route):
    url = route.request.url
    if 'supabase.co' in url: return route.abort()
    if not url.startswith('http://callprep.local/'): return route.continue_()
    p = (ROOT / url.split('http://callprep.local/', 1)[1].split('?')[0].split('#')[0])
    if not p.is_file(): return route.fulfill(status=404, body='')
    route.fulfill(status=200, body=p.read_bytes(), content_type=MIME.get(p.suffix, 'application/octet-stream'))
with sync_playwright() as pw:
    b = pw.chromium.launch(); cx = b.new_context(viewport={'width': 1280, 'height': 900}, timezone_id='America/Chicago'); pg = cx.new_page()
    pg.clock.install(time='2026-11-19T14:40:00-06:00'); pg.clock.resume()
    pg.route('**/*', serve)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True)
        pg.expose_function('__shot', lambda name: pg.screenshot(path=os.path.join(SHOTS, name + '.png'), full_page=False) and None)
    pg.goto('http://callprep.local/index.html?proof=callprep'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

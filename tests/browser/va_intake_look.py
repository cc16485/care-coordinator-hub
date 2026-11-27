"""The VA intake on the lead page (2026-11-27). The real page, offline, made-up families, the clock frozen at Fri Nov 27 2026
9:00 am Chicago. Proves: with the switch off the old VA paperwork card is unchanged; with it on, every open lead asks Veteran?;
Yes writes the Payer tab's answer, opens the VA path and the intake, and sets the 7-day follow-up; enrolled No turns the path to
sign-up first; the intake saves the lead's own lines and its VA record; a Social Security number typed in another box is refused;
the locked box only ever shows the last 4 and a reveal needs a reason; steps set the next reminder; the letter never names a
caregiver and uses the full name. (python3 tests/browser/va_intake_look.py, static server on 8765; writes va-intake.png)"""
import os
from playwright.sync_api import sync_playwright
STUB = r"""
(()=>{
  const W=window; W.__log={ writes:[], fn:[], opened:[] };
  (0,eval)(`window.__RealDate=Date; window.__NOW=new __RealDate('2026-11-27T15:00:00Z').getTime();
    Date=class extends __RealDate{ constructor(...a){ if(a.length) super(...a); else super(window.__NOW); } static now(){ return window.__NOW; } };`);
  (0,eval)(`sb={ from:()=>{ const p={ select(){return p;}, eq(){return p;}, in(){return p;}, not(){return p;}, order(){return p;}, limit(){return p;},
      maybeSingle:async()=>({data:null,error:null}), then(a){ return Promise.resolve({data:[],error:null}).then(a); } }; return p; },
    rpc:async()=>({data:null,error:null}), auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) },
    functions:{ invoke:async(name,o)=>{ window.__log.fn.push({ name, body:o.body }); if(name!=='va-identity') return {data:null,error:null};
      const b=o.body; window.__SSN=window.__SSN||{};
      if(b.action==='state') return { data:{ ok:true, state:Object.fromEntries(b.lead_ids.map(i=>[i, window.__SSN[i]||{ on_file:false }])) } };
      if(b.action==='save'){ window.__SSN[b.lead_id]={ on_file:true, last4:String(b.ssn).replace(/\D/g,'').slice(-4), captured_by:'Krystal Land', captured_at:'2026-11-27T15:01:00Z', reveals:0 }; return { data:{ ok:true, state:window.__SSN[b.lead_id] } }; }
      if(b.action==='reveal') return b.reason && b.reason.length>=3 ? { data:{ ok:true, value:'234567891', ttl_seconds:300 } } : { data:{ ok:false, error:'Type why you are opening it first.' } };
      return { data:{ ok:false, error:'?' } }; } } };`);
  W.persist=async(k,v)=>{ W.__log.writes.push(JSON.parse(JSON.stringify(v))); };
  W.commsCall=async()=>({ ok:true }); W.ccConfirm=async()=>true;
  W.open=()=>{ const doc={ html:'', write(s){ this.html+=s; }, close(){} }; W.__log.opened.push(doc); return { document:doc, print(){} }; };
  W.lsLoadFacts=async()=>{ LS.facts={ epOf:{}, scOf:{}, planOf:{} }; }; W.ccToast=(m)=>{ W.__lastToast=m; }; W.opEvent=()=>{}; W.myWorkRefresh=()=>{}; W.renderLeadsStarts=()=>{};
  W.refreshCommsTimeline=async()=>{}; W.axLogLoad=async()=>{}; W.callsLoad=async()=>{}; W.cpRenderEvvForms=async()=>{}; W.famMount=async()=>{}; W.cjMountProfile=async()=>{};
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Land' }; OPS_PEOPLE=[{ primary_email:'krystal@mo-care.com', full_name:'Krystal Land' }];");
  DATA.ops_settings={ lead_response_hours:{ days:[0,1,2,3,4,5,6], start:'08:00', end:'18:00' } };
  DATA.referral_orgs=[]; DATA.care_assessments=[]; DATA.post_call_followups=[]; DATA.ops_items=[]; DATA.caregivers=[]; DATA.caregiver_availability=[];
  const base={ source:'Phone', status:'Contacted', assigned_coordinator:'Krystal', created_at:'2026-11-27T14:00:00Z', first_human_attempt_at:'2026-11-27T14:05:00Z', first_human_contact_at:'2026-11-27T14:05:00Z',
    contact_events:[{ at:'2026-11-27T14:05:00Z', channel:'call', direction:'in', outcome:'connected', actor:'human' }] };
  DATA.leads=[
    Object.assign({ id:'vet1', first_name:'Linda', last_name:'Price', relationship:'daughter', phone:'4175550142', client_first_name:'Harold', client_last_name:'Price', client_city:'Springfield', funding_source:'private' }, base),
    Object.assign({ id:'old1', first_name:'Pat', last_name:'Moss', relationship:'son', phone:'4175550150', client_first_name:'Dale', client_last_name:'Moss', funding_source:'va', va_referral:{ cg_name:'Pat Moss', cg_rel:'son', ok_at:'2026-11-20T15:00:00Z', clinic:'Example VA clinic' } }, base),
    Object.assign({ id:'fam2', first_name:'Ann', last_name:'Lowe', relationship:'daughter', phone:'4175550160', client_first_name:'Ruth', client_last_name:'Lowe' }, base) ];
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,900)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const last=id=>window.__log.writes.filter(x=>x.id===id).slice(-1)[0];
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  const host=()=>document.getElementById('lwHost'), H=()=>host().innerText;
  /* switch OFF: the old card, as it was */
  await openClient({ lead_id:'old1' }, 'summary'); await sleep(400);
  ok('switch off: a VA lead shows the VA paperwork card as before, no Veteran? question', !!document.getElementById('lwVa') && !document.getElementById('vaiStrip'), H().slice(0,300));
  ok('...its caregiver box now says it is for our office only', /for our office only, never sent to the VA/i.test(H()));
  lwVaLetter(); await sleep(200); const doc=window.__log.opened.slice(-1)[0];
  ok('...and its letter uses the full name and never names the caregiver', doc && /Caring Companions In-Home Senior Care/.test(doc.html) && !/caregiver/i.test(doc.html), doc && doc.html.slice(0,400));
  await openClient({ lead_id:'fam2' }, 'summary'); await sleep(300);
  ok('switch off: a family with no veteran answer sees nothing new', !document.getElementById('vaiStrip'));
  /* switch ON */
  DATA.ops_settings.va_intake_live=true;
  await openClient({ lead_id:'fam2' }, 'summary'); await sleep(300);
  ok('switch on: every open lead asks Veteran?, with Yes, No and Not sure', /Veteran\?\s*Did they serve in the military/.test(H()) && !document.getElementById('vaiCard'), H().slice(0,400));
  await vaiVet('no'); await sleep(200);
  ok('No: saved as the Payer tab answer, the question folds to "Veteran? No · change", no intake', last('fam2').program_check.veteran==='no' && /Veteran\? No/.test(H()) && !document.getElementById('vaiCard'));
  await openClient({ lead_id:'vet1' }, 'summary'); await sleep(300);
  await vaiVet('yes'); await sleep(400); let w=last('vet1');
  ok('Yes: program_check.veteran = yes and the 7-day follow-up is set (Dec 4) with what to ask', w.program_check.veteran==='yes' && w.follow_up_due==='2026-12-04' && /VA:/.test(w.follow_up_note), [w.program_check, w.follow_up_due, w.follow_up_note]);
  ok('...the VA path and the VA intake open, the path starts at the first call', !!document.getElementById('vaiPath') && !!document.getElementById('vaiCard') && document.querySelector('#vaiPath .vai-st.now') && /First call/.test(document.querySelector('#vaiPath .vai-st.now').innerText));
  ok('...the intake has the six sections and the words to tell the VA, with the full name', ['1 · Who is calling','2 · The veteran','3 · VA health care','4 · Help needed','5 · Who would be the caregiver','6 · Before you hang up'].every(s=>H().indexOf(s)>-1) && /I would like Caring Companions In-Home Senior Care to provide it/.test(H()));
  ok('...it filled in what the lead already had (caller, relationship, veteran)', document.getElementById('vai_caller').value==='Linda Price' && document.getElementById('vai_rel').value==='daughter' && document.getElementById('vai_vet').value==='Harold Price');
  ok('...the locked box asked the server what is on file and offers a hidden 9-digit box', window.__log.fn.some(x=>x.name==='va-identity'&&x.body.action==='state') && document.getElementById('vai_ssn_new') && document.getElementById('vai_ssn_new').type==='password');
  /* enrolled: No */
  await vaiEnrolled('no'); await sleep(300); w=last('vet1');
  ok('Enrolled No: the sign-up help shows and the follow-up asks if the enrollment came through', /Sign up for VA health care first/.test(H()) && /enrollment come through/.test(w.follow_up_note) && w.va_referral.enrolled==='no', w.follow_up_note);
  /* fill in and save */
  document.getElementById('vai_dob').value='1946-03-14'; document.getElementById('vai_vphone').value='4175550177'; document.getElementById('vai_city').value='Springfield, Greene';
  document.getElementById('vai_best_time').value='after 3 pm'; document.getElementById('lwVa_clinic').value='Example VA clinic';
  document.querySelector('#vaiCard input[data-adl="bathing"]').checked=true; document.querySelector('#vaiCard input[data-adl="memory"]').checked=true;
  document.getElementById('vai_hours_day').value='4'; document.getElementById('vai_days_week').value='5';
  document.getElementById('vai_read_words').checked=true;
  await vaiSave(document.createElement('button')); await sleep(300); w=last('vet1');
  ok('Save: the lead\'s own lines (birth date, veteran phone, town, county) and the VA record (best time, clinic, help, about 20 h a week)', w.client_dob==='1946-03-14' && w.client_phone==='4175550177' && w.client_city==='Springfield' && w.county==='Greene' && w.va_referral.best_time==='after 3 pm' && w.va_referral.clinic==='Example VA clinic' && w.va_referral.hours==='20' && /Bathing, Memory/.test(w.va_referral.needs), [w.client_city, w.county, w.va_referral]);
  ok('...the checkboxes also add to the lead\'s care needs (personal care, dementia), and "read the words" is stamped', w.needs.includes('personalCare') && w.needs.includes('dementia') && !!w.va_referral.read_words_at);
  /* the Social Security number guard */
  const n=window.__log.writes.length; document.getElementById('vai_best_time').value='234-56-7891';
  let threw=false; try{ await vaiSave(document.createElement('button')); }catch(e){ threw=true; } await sleep(200);
  ok('a Social Security number typed in another box is refused, nothing saved', threw && window.__log.writes.length===n && /locked box/.test(document.getElementById('lwVaMsg').textContent), document.getElementById('lwVaMsg').textContent);
  document.getElementById('vai_best_time').value='after 3 pm';
  document.getElementById('vai_ssn_new').value='234-56-7891'; await vaiSsnSave(); await sleep(300);
  ok('the locked box saves it through the server and shows only "ending 7891"', /On file, ending 7891/.test(document.getElementById('vaiSsn').innerText) && !/234-56-7891|234567891/.test(H()) && !JSON.stringify(window.__log.writes).includes('234567891') && !JSON.stringify(window.__log.writes).includes('7891'));
  vaiSsnAsk(true); await sleep(100); await vaiSsnReveal(); await sleep(150);
  ok('Reveal with no reason: refused, nothing shown', !/234-56-7891/.test(H()) && /why/i.test(document.getElementById('vaiSsn').innerText));
  document.getElementById('vai_ssn_reason').value='VA enrollment call'; await vaiSsnReveal(); await sleep(200);
  ok('Reveal with a reason: the number shows with a countdown', /234-56-7891/.test(document.getElementById('vaiSsn').innerText) && /hides in/.test(document.getElementById('vaiSsn').innerText) && window.__log.fn.some(x=>x.body.action==='reveal'&&x.body.reason==='VA enrollment call'));
  vaiSsnHide(); await sleep(100);
  ok('Hide now: gone from the page', !/234-56-7891/.test(H()));
  /* steps set reminders */
  await vaiStep('first'); await sleep(250); w=last('vet1');
  ok('Checklist sent: step 1 done, sign-up is now the step', !!w.va_referral.checklist_at && /Signed up for VA health care/.test(document.querySelector('#vaiPath .vai-st.now').innerText));
  await vaiSet('enroll_way','mail'); await sleep(200); await vaiStep('applied'); await sleep(250); w=last('vet1');
  ok('Helped them apply (by mail): the reminder is a week out to check the enrollment', w.va_referral.enroll_way==='mail' && !!w.va_referral.applied_at && w.follow_up_due==='2026-12-04' && /enrollment come through/.test(w.follow_up_note), [w.follow_up_due, w.follow_up_note]);
  ok('...the by-mail help says leave the Social Security number box blank and they sign it themselves', /leave the Social Security number box blank/.test(H()) && /We never sign for them/.test(H()));
  await vaiStep('enroll_confirmed'); await sleep(250); w=last('vet1');
  ok('Enrollment came through: enrolled yes, the ask to the VA is next, reminder in 7 days', w.va_referral.enrolled==='yes' && /Three-way call/.test(document.querySelector('#vaiPath .vai-st.now').innerText) && /did they ask/.test(w.follow_up_note));
  document.getElementById('vai_ask_spoke_to').value='Nurse on the Blue team'; document.getElementById('vai_ask_promised').value='consult to the social worker';
  await vaiStep('ask'); await sleep(250); w=last('vet1');
  ok('Call made: who, what they promised, and a check-in in 5 days', w.va_referral.ask_spoke_to==='Nurse on the Blue team' && w.follow_up_due==='2026-12-02' && /Call the social worker/i.test(w.follow_up_note) && /three-way call to the VA care team, spoke to Nurse/.test(w.comm_log.slice(-1)[0].body), [w.follow_up_due, w.follow_up_note]);
  /* caregiver: office only */
  await vaiSet('cg_choice','family'); await sleep(250);
  ok('Family or friend caregiver: name, relationship and phone boxes, marked office only; the path offers the application link', !!document.getElementById('lwVa_cg_name') && /never goes on anything sent to the VA/.test(H()) && /Copy the application link/.test(H()));
  document.getElementById('lwVa_cg_name').value='Linda Price'; document.getElementById('lwVa_cg_rel').value='daughter'; document.getElementById('lwVa_ok').checked=true;
  await vaiSave(null); await sleep(200); lwVaLetter(); await sleep(250); const d2=window.__log.opened.slice(-1)[0];
  ok('the referral sheet for the VA: full name, the help needed, about 20 hours, and NO caregiver name', d2 && /Caring Companions In-Home Senior Care/.test(d2.html) && /Bathing, Memory/.test(d2.html) && /20/.test(d2.html) && !/caregiver/i.test(d2.html), d2 && d2.html.slice(0,500));
  /* the VA emails box */
  document.getElementById('vai_va_emails').checked=true; await vaiSave(document.createElement('button')); await sleep(250); w=last('vet1');
  ok('On the VA emails: email_campaign va and the va lead tag, logged', w.email_campaign==='va' && w.intent_tags.includes('va lead') && w.comm_log.some(c=>/VA series/.test(c.body)));
  ok('no em dashes anywhere on the VA cards', !/—/.test(document.getElementById('vaiPath').innerText + document.getElementById('vaiCard').innerText + document.getElementById('vaiStrip').innerText));
  /* Settings */
  switchTab('settings'); await sleep(300); vaiSetFill();
  ok('Settings → Leads: the VA intake switch says On (it was set for this test) and owners can change it', /On\./.test(document.getElementById('vaiSetNow').innerText));
  DATA.ops_settings.va_intake_live=false; vaiSetFill();
  ok('...and Off reads "Lead pages show the VA paperwork card as today"', /Off\.\s*Lead pages show the VA paperwork card as today/.test(document.getElementById('vaiSetNow').innerText), document.getElementById('vaiSetNow').innerText);
  DATA.ops_settings.va_intake_live=true;
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1360, 'height': 1000})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(os.environ.get('HUB_URL', 'http://localhost:8765') + '/index.html?proof=vaintake'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T)
    pg.evaluate("async()=>{ await openClient({ lead_id:'vet1' }, 'summary'); }"); pg.wait_for_timeout(700)
    pg.screenshot(path='tests/browser/va-intake.png', full_page=True)
    R.append(['PASS' if not [e for e in errs if 'supabase' not in e] else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

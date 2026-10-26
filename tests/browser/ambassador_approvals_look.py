"""Community Ambassadors, step 2 (2026-10-26), in the real Hub page offline: owners see the applications (with flags) on
Referral Partners > Program and approve, ask or decline; approving makes the link and sends the welcome email through the
campaign sender; a Care Coordinator never sees an applicant anywhere (desk, Needs an owner, My Work, pickers).
(PORT=<port> python3 tests/browser/ambassador_approvals_look.py, static server on that port, 8765 by default)"""
import os
from playwright.sync_api import sync_playwright
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'client_journey_look.py')).read()
ns = {'__file__': os.path.abspath(__file__)}; exec(src[:src.rindex('with sync_playwright() as pw:')], ns)
STUB, DATA = ns['STUB'], ns['DATA']
PORT = os.environ.get('PORT', '8765')
FAKE = r"""
(()=>{
  const W=window, at='2026-10-26T15:00:00Z';
  W.__P=[]; W.__alert=[]; W.__mail=[]; W.__screen={ ok:true, all:true };
  (0,eval)("persist=async(k,i)=>{ window.__P.push([k,JSON.parse(JSON.stringify(i))]); }");
  (0,eval)("ccToast=(m)=>{ window.__toast=m; }");
  W.ccConfirm=async()=>true; (0,eval)('ccConfirm=window.ccConfirm');
  W.alert=(m)=>{ window.__alert.push(m); };
  (0,eval)("cmpAuthHeaders=async()=>({ 'Content-Type':'application/json', Authorization:'Bearer test' })");
  const realFetch=W.fetch.bind(W);
  W.fetch=async(url,o)=>{ url=String(url);
    if(/campaign-send/.test(url)){ const b=JSON.parse(o.body||'{}'); W.__mail.push(b);
      if(b.screen) return new Response(JSON.stringify(W.__screen.all ? { ok:true, allowed:b.recipients, left_out:[] } : { ok:true, allowed:[], left_out:[{ email:b.recipients[0].email, why:'tied to a past client' }] }), { status:200 });
      return new Response(JSON.stringify({ results:b.recipients.map(r=>({ email:r.email, ok:true })) }), { status:200 }); }
    return realFetch(url,o); };
  const A=(o)=>Object.assign({ type:'Community Ambassador', program_track:'ambassador', program_status:'applied', applied_at:at, created_at:at }, o);
  DATA.referral_orgs=[
    { id:'mercy', name:'Mercy Hospital', type:'Hospital', created_at:'2025-01-10T00:00:00Z', owner_email:'krystal@mo-care.com' },
    { id:'newp', name:'Ozark Rehab', type:'Rehab / Skilled Nursing', created_at:'2026-10-20T12:00:00Z' },
    A({ id:'amb1', name:'Linda Ortiz', email:'linda@example.com', phone:'417-555-0123', application:{ first_name:'Linda', last_name:'Ortiz', town:'Nixa', share:['Friends and family','Church or community group'], works_in_healthcare:false, works_for_us:false, flags:[] } }),
    A({ id:'amb2', name:'Dana Smith', email:'dana@example.com', phone:'', application:{ first_name:'Dana', last_name:'Smith', town:'Springfield', share:[], works_in_healthcare:true, healthcare_where:'Nurse at Mercy', works_for_us:false, flags:['healthcare'] } }),
    A({ id:'amb3', name:'Ray Cole', email:'ray@example.com', phone:'4175550777', application:{ first_name:'Ray', last_name:'Cole', town:'Ozark', share:['Neighbors'], works_in_healthcare:false, works_for_us:true, flags:['employee'] } }),
    A({ id:'amb4', name:'Pat Past', email:'pat@example.com', phone:'', application:{ first_name:'Pat', last_name:'Past', town:'Nixa', share:[], flags:[] } })];
  DATA.referral_activities=[]; DATA.activities=[];
  DATA.leads=(DATA.leads||[]).concat([{ id:'RC1', first_name:'Ray', last_name:'Cole', phone:'(417) 555-0777', source:'Website', status:'New', created_at:at }]);
  DATA.ops_items=DATA.ops_items||[];
})();
"""
T = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  const P=()=>window.__P, last=(k)=>P().filter(x=>x[0]===k).slice(-1)[0], page=()=>document.getElementById('tab-referrers').innerText;
  const NAMES=/Linda Ortiz|Dana Smith|Ray Cole|Pat Past/;
  /* a Care Coordinator */
  window.__as('krystal@mo-care.com','Krystal Land'); CC_ROLE_BY_EMAIL['krystal@mo-care.com']=['care_coordinator','springfield_lead']; (0,eval)("CC_ROLES=CC_ROLE_BY_EMAIL['krystal@mo-care.com']");
  switchTab('referrers'); await sleep(300);
  ok('Krystal (who assigns partners): no applicant anywhere on Referral Partners (desk, Needs an owner, the list, the counts)', !NAMES.test(page()) && /Needs an owner/.test(page()) && /Ozark Rehab/.test(page()), page().slice(0,900));
  ok('...the page says 2 referral sources (applicants not counted)', /2 referral sources/.test(document.getElementById('refSub').textContent), document.getElementById('refSub').textContent);
  ok('...no owner-only Program view', document.getElementById('plProgram').innerHTML==='');
  window.__P.length=0; try{ await pdEnsureWeeklyCard(true); }catch(e){}
  ok('...My Work: no partner card ever names an applicant', !(DATA.ops_items||[]).some(x=>NAMES.test(JSON.stringify(x))), (DATA.ops_items||[]).filter(x=>x.kind==='partner_week'));
  ok('...Needs an owner and anyone\'s week never hold an ambassador (the rules everywhere use)', !PartnerRules.needsOwner(DATA.referral_orgs).some(o=>o.program_track==='ambassador') && !PartnerRules.week(DATA.referral_orgs,{ today:'2026-10-26', leads:DATA.leads, activities:[], planned:[], settings:{} },'*').some(x=>/^amb/.test(x.id)));
  openLeadModal(); await sleep(150);
  ok('...Referred By on a lead doesn\'t offer applicants', ![...document.querySelectorAll('#lead_referral_org_id option')].some(o=>NAMES.test(o.textContent)) && [...document.querySelectorAll('#lead_referral_org_id option')].some(o=>/Mercy Hospital/.test(o.textContent)));
  closeModal('leadModalBackdrop');
  openActivityModal(null,null); await sleep(100);
  ok('...nor does the activity form', ![...document.querySelectorAll('#act_org option')].some(o=>NAMES.test(o.textContent))); closeModal('activityModalBackdrop');

  /* the owner */
  window.__as('sam@mo-care.com','Samantha Owner'); switchTab('referrers'); await sleep(300);
  const pg=()=>document.getElementById('plProgram').innerText;
  ok('Samantha: "Community Ambassador applications · 4" in the Program view, each with town, how they\'d share and contact', /Community Ambassador applications · 4/i.test(pg()) && /Linda Ortiz[\s\S]*Nixa · would share with friends and family, church or community group/.test(pg()) && /linda@example.com · 417-555-0123/.test(pg()), pg().slice(0,800));
  ok('...flags for review, not refusals: healthcare (with where), works for us, possibly already known (the family inquiry with the same phone)', /Works in healthcare or a regulated field: Nurse at Mercy/.test(pg()) && /Says they work for Caring Companions/.test(pg()) && /Possibly already known: a family inquiry \(Ray Cole\)/.test(pg()) && document.querySelectorAll('[data-flag]').length===3, pg());
  ok('...each with Approve, Ask a question, Decline', document.querySelectorAll('#plProgram button').length>=12 && /Approve[\s\S]*Ask a question[\s\S]*Decline/.test(pg()));
  /* approve Linda */
  window.__P.length=0; window.__mail.length=0;
  plAmbApprove('amb1'); await sleep(200);
  const dlg=()=>document.getElementById('plAmbOv');
  ok('Approve: says nothing is active before this, and shows the welcome email to read first', /Nothing is active before this/.test(dlg().innerText) && /Welcome to Caring Companions Community Ambassadors/.test(dlg().innerText) && /Hi Linda/.test(dlg().innerText) && !window.__P.length && !window.__mail.length, dlg().innerText.slice(0,500));
  [...dlg().querySelectorAll('button')].find(b=>/Approve and send/.test(b.textContent)).click(); await sleep(500);
  const ap=P().filter(x=>x[0]==='referral_orgs' && x[1].id==='amb1').slice(-1)[0];
  ok('...approved: a code, active, who and when; the link is now live', ap && /^LINDA-[A-HJ-NP-Z2-9]{2}$/.test(ap[1].partner_code) && ap[1].program_status==='active' && ap[1].approved_by==='sam@mo-care.com' && !!ap[1].welcome_sent_at, ap&&ap[1]);
  const send=window.__mail.find(m=>!m.screen);
  ok('...the welcome email went through the campaign sender (checked first): to Linda, with her link, QR code page and the guidelines', window.__mail[0].screen===true && send && send.recipients[0].email==='linda@example.com' && send.subject==='Welcome to Caring Companions Community Ambassadors' && send.html.includes('https://mo-care.com/r/?p='+ap[1].partner_code) && send.html.includes('https://mo-care.com/r/qr/?p='+ap[1].partner_code) && send.tag==='referral-partner', send);
  ok('...recorded on her history, and she leaves the applications list for the Partners table with an Ambassador label', last('referral_activities') && last('referral_activities')[1].email_key==='ambassador:welcome' && !/Linda Ortiz[\s\S]*Approve/.test(pg().split('Sources to check')[0]) && /Linda Ortiz\s*Ambassador/.test(pg()), pg());
  /* ask Ray a question */
  window.__mail.length=0; plAmbAsk('amb3'); await sleep(150);
  [...dlg().querySelectorAll('button')].find(b=>/Send the question/.test(b.textContent)).click(); await sleep(150);
  ok('Ask a question: needs the question; nothing sent without it', /Write the question/.test(document.getElementById('plAmbErr').textContent) && !window.__mail.length);
  document.getElementById('plAmbQ').value='Do you work in our office or as a caregiver?'; [...dlg().querySelectorAll('button')].find(b=>/Send the question/.test(b.textContent)).click(); await sleep(400);
  const rq=P().filter(x=>x[0]==='referral_orgs' && x[1].id==='amb3').slice(-1)[0];
  ok('...sent: waiting on their answer, the question kept and emailed, still in the list (no link)', rq && rq[1].program_status==='info_requested' && !rq[1].partner_code && window.__mail.some(m=>!m.screen && /quick question/.test(m.subject) && /office or as a caregiver/.test(m.html)) && /Ray Cole\s*Waiting on their answer/.test(pg()), rq&&rq[1]);
  /* decline Dana without a note */
  window.__mail.length=0; plAmbDecline('amb2'); await sleep(150);
  [...dlg().querySelectorAll('button')].find(b=>b.textContent==='Decline').click(); await sleep(100);
  ok('Decline: needs a reason (owners only)', /short reason/.test(document.getElementById('plAmbErr').textContent));
  document.getElementById('plAmbWhy').value='Asked to set her up as a professional partner instead'; [...dlg().querySelectorAll('button')].find(b=>b.textContent==='Decline').click(); await sleep(300);
  const dc=P().filter(x=>x[0]==='referral_orgs' && x[1].id==='amb2').slice(-1)[0];
  ok('...declined, no email unless the box is ticked, kept but off the list', dc && dc[1].program_status==='declined' && !dc[1].partner_code && !window.__mail.length && !/Dana Smith/.test(pg().split('Sources to check')[0].split('Partners')[0]) && /1 declined/.test(pg()), dc&&dc[1]);
  /* the email check leaves Pat out */
  window.__screen.all=false; window.__alert.length=0; plAmbApprove('amb4'); await sleep(150);
  [...dlg().querySelectorAll('button')].find(b=>/Approve and send/.test(b.textContent)).click(); await sleep(400);
  const pp=P().filter(x=>x[0]==='referral_orgs' && x[1].id==='amb4').slice(-1)[0];
  ok('when the email check leaves someone out: still approved, the link shown, and it says why (no silent failure)', pp && pp[1].program_status==='active' && pp[1].welcome_problem && /tied to a past client/.test(pp[1].welcome_problem.why) && window.__alert.some(m=>/welcome email didn't go: the email check left them out \(tied to a past client\)/.test(m) && /mo-care\.com\/r\/\?p=PAT-/.test(m)), [pp&&pp[1], window.__alert]);
  /* back to the coordinator: the approved ambassador can now be picked */
  window.__as('krystal@mo-care.com','Krystal Land'); openLeadModal(); await sleep(150);
  ok('Krystal: an APPROVED ambassador can be picked in Referred By (a phone referral); the others still can\'t', [...document.querySelectorAll('#lead_referral_org_id option')].some(o=>/Linda Ortiz/.test(o.textContent)) && ![...document.querySelectorAll('#lead_referral_org_id option')].some(o=>/Dana Smith|Ray Cole/.test(o.textContent)));
  closeModal('leadModalBackdrop'); switchTab('referrers'); await sleep(200);
  ok('...but even approved, ambassadors stay off her desk and Needs an owner', !/Linda Ortiz|Pat Past/.test(page()));
  ok('no money anywhere on the owners\' screens', !/reward|commission|\$\d/i.test(document.getElementById('plProgram').innerText + JSON.stringify(window.__mail)));
  return R; }"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []
    pg = b.new_page(viewport={'width': 1280, 'height': 1000})
    pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url and 'campaign-send' not in r.request.url else r.continue_())
    pg.goto(f'http://localhost:{PORT}/index.html?proof=amb'); pg.wait_for_timeout(1500)
    for s in (STUB, DATA, FAKE): pg.evaluate('s=>(0,eval)(s)', s)
    R = pg.evaluate(T)
    pg.evaluate("()=>{ window.__as('sam@mo-care.com','Samantha Owner'); switchTab('referrers'); }"); pg.wait_for_timeout(300)
    pg.screenshot(path='/tmp/amb_hub.png')
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

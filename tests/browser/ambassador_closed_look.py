"""Community Ambassadors CLOSED (her decision 5, 2026-10-26), in the real Hub page offline: owners no longer get applications
to approve, ask or decline, only a note of how many are on file (kept); nothing can approve one; an ambassador approved
before keeps their link; a Care Coordinator still never sees an applicant anywhere (desk, Needs an owner, My Work, pickers).
(PORT=<port> python3 tests/browser/ambassador_closed_look.py, static server on that port, 8765 by default)"""
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
    A({ id:'amb4', name:'Pat Past', email:'pat@example.com', phone:'', program_status:'active', partner_code:'PAT-K7', approved_at:at, application:{ first_name:'Pat', last_name:'Past', town:'Nixa', share:[], flags:[] } })];
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
  ok('...Referred By on a lead doesn\'t offer applicants (Pat, approved before, may still be picked)', ![...document.querySelectorAll('#lead_referral_org_id option')].some(o=>/Linda Ortiz|Dana Smith|Ray Cole/.test(o.textContent)) && [...document.querySelectorAll('#lead_referral_org_id option')].some(o=>/Mercy Hospital/.test(o.textContent)));
  closeModal('leadModalBackdrop');
  openActivityModal(null,null); await sleep(100);
  ok('...nor does the activity form', ![...document.querySelectorAll('#act_org option')].some(o=>NAMES.test(o.textContent))); closeModal('activityModalBackdrop');

  /* the owner */
  window.__as('sam@mo-care.com','Samantha Owner'); switchTab('referrers'); await sleep(300);
  const pg=()=>document.getElementById('plProgram').innerText;
  ok('Samantha: the Program view says applications closed on Oct 26, 4 on file, kept as they are', /Applications closed on Oct 26\. 4 on file, kept as they are\./.test(pg()), pg().slice(0,900));
  ok('...no applications list: no Approve, Ask a question or Decline, and no applicant details', !/Community Ambassador applications/i.test(pg()) && !/Approve|Ask a question|Decline/.test(pg()) && !/would share with|Nurse at Mercy/.test(pg()), pg().slice(0,900));
  ok('...nothing on the page can approve, ask or decline any more', typeof window.plAmbApprove==='undefined' && typeof window.plAmbAsk==='undefined' && typeof window.plAmbDecline==='undefined');
  ok('...the rest of Program is still there (Sources to check, partners)', /Sources to check/i.test(pg()) && /Pat Past/.test(pg().split(/Partners/i).slice(-1)[0]), pg().slice(0,900));
  openRefProfile('amb1'); await sleep(200);
  ok('an application on file still opens and shows no link (never approved)', /Not approved|Applied/i.test(document.body.innerText) && !/mo-care\.com\/r\/\?p=LINDA/.test(document.body.innerHTML));
  try{ closeModal('refProfileBackdrop'); }catch(e){}
  openRefProfile('amb4'); await sleep(200);
  ok('an ambassador approved before keeps their working link and QR', /mo-care\.com\/r\/\?p=PAT-K7/.test(document.body.innerHTML));
  try{ closeModal('refProfileBackdrop'); }catch(e){}
  ok('no partner record was changed by any of this', !P().some(x=>x[0]==='referral_orgs'), P().filter(x=>x[0]==='referral_orgs'));
  ok('nothing was emailed', !window.__mail.length, window.__mail);
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
    
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

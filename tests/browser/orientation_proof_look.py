"""Orientation proof (Samantha 2026-10-28): the Orientation & Training section near the top of a caregiver's profile, the Needs
orientation proof list on Caregivers, Orientation & Training, the past-record dialog, opening a Training certificate, and the
Settings section with its three switches (all off). Offline, made-up people; every server call is answered here, nothing is
saved or sent. (PORT=<static server port> python3 tests/browser/orientation_proof_look.py)"""
import os
from playwright.sync_api import sync_playwright
H = open('/Users/samantha/Claude/Projects/cc-hub-live/.claude/g1a_harness.js').read()
PORT = os.environ.get('PORT', '8811')
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  window.ccConfirm=async()=>true; (0,eval)('ccConfirm=window.ccConfirm');
  const merges=[]; window.tkMerge=async(fn,what)=>{ const base=JSON.parse(JSON.stringify(DATA.ops_settings||{})), m=JSON.parse(JSON.stringify(base)); const ch=fn(m,base)||[]; DATA.ops_settings=m; merges.push([what,ch]); return { changed:ch, error:null }; };
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; await sleep(600);
  (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha Troutman' };"); CC_ROLES=['owner_admin']; CC_ROLES_CHECKED=true; CC_ROLE_BY_EMAIL['samantha@mo-care.com']=['owner_admin'];
  const CALLS=[], UPLOADS=[], OPENED=[]; const realFetch=window.fetch;
  const STATUS={ '1':{ ok:true, axiscare_id:'1', state:'verified', date:'2026-07-01', why:'Certificate on file', can_make_certificate:false, proof:{kind:'certificate', ref:'training:certificates/t-amy/agency-orientation.pdf', date:'2026-07-01', by:'Training Platform'}, excluded:false, settings:{} },
    '3':{ ok:true, axiscare_id:'3', state:'needs_certificate', date:'2026-07-23', why:'Finished on the Training Platform, but the certificate was never saved', can_make_certificate:true, proof:null, excluded:false, settings:{} },
    '2':{ ok:true, axiscare_id:'2', state:'missing', date:null, why:'No orientation on record', can_make_certificate:false, proof:null, excluded:false, settings:{} },
    '9':{ ok:true, axiscare_id:'9', state:'verified', date:'2024-03-02', why:'Historical record, verified by the office', can_make_certificate:false, proof:{kind:'office_verified', ref:'training/19/orient-1.pdf', date:'2024-03-02', by:'Krystal Office', at:'2026-10-30T10:00:00Z'}, excluded:false, settings:{} } };
  const LIST={ ok:true, checked:5, verified:2, excluded:4, settings:{gate:false,audit:false,autogen:false}, flagged:[{axiscare_id:'2',name:'Ben B',state:'missing',why:'No orientation on record',date:null,can_make_certificate:false},{axiscare_id:'3',name:'Eve E',state:'needs_certificate',why:'Finished on the Training Platform, but the certificate was never saved',date:'2026-07-23',can_make_certificate:true}] };
  window.fetch=async(u,o)=>{ if(String(u).includes('/functions/v1/orientation-proof')){ const b=JSON.parse(o.body); CALLS.push(b);
      const res = b.action==='status'?STATUS[b.axiscare_id]: b.action==='list'?LIST: b.action==='open'?{url:'https://tr.example/signed'}: b.action==='send_link'?{outcome:'sent',channels:['sms','email']}:{outcome:'ok'};
      return new Response(JSON.stringify(res),{status:200}); } return realFetch(u,o); };
  sb.auth.getSession=async()=>({ data:{ session:{ access_token:'t' } } });
  sb.storage.from=()=>({ upload:async(p,f)=>{ UPLOADS.push(p); return { error:null }; }, createSignedUrl:async()=>({ data:{ signedUrl:'https://x/signed' }, error:null }) });
  window.open=(u)=>{ OPENED.push(u); return { location:'', close(){} }; };
  /* 1. the profile section, as the profile mounts it */
  const host=document.createElement('div'); host.innerHTML='<div id="cgdOrient"></div>'; document.body.appendChild(host);
  CGD.openId='1'; await OP.profile('1', { id:11, alz_date:'2026-08-01', alz_proof:'training:certificates/t-amy/dementia-care.pdf' }); await sleep(50);
  let t=document.getElementById('cgdOrient').innerText;
  ok('profile: Orientation & Training, completed with its date and a certificate link', /Orientation & Training/.test(t) && /Completed Jul 1, 2026/.test(t) && /View certificate \(PDF\)/.test(t) && /Training Platform certificate/.test(t), t);
  ok('profile: optional training listed underneath', /Optional training: Dementia care Aug 1, 2026/.test(t), t);
  ok('profile: nothing to fix, no buttons', !document.querySelector('#cgdOrient .op-acts'));
  document.querySelector('#cgdOrient a').click(); await sleep(80);
  ok('the certificate opens through the server (a short-lived link)', CALLS.some(c=>c.action==='open' && c.ref==='training:certificates/t-amy/agency-orientation.pdf'));
  CGD.openId='9'; await OP.profile('9', { id:19 }); t=document.getElementById('cgdOrient').innerText;
  ok('profile: a historical record shows who verified it and when', /Completed Mar 2, 2024/.test(t) && /historical record, verified by Krystal Office on Oct 30, 2026/.test(t) && /View document/.test(t), t);
  STATUS['6']={ ok:true, axiscare_id:'6', state:'verified', date:null, why:'Hired 2026-06-19, before AxisCare started; completed orientation then', can_make_certificate:false, proof:{kind:'pre_axiscare', ref:null, date:'2026-06-19', by:'Samantha Troutman, Oct 28, 2026'}, excluded:false, settings:{} };
  CGD.openId='6'; await OP.profile('6', { id:16 }); t=document.getElementById('cgdOrient').innerText;
  ok('profile: hired before AxisCare: completed, on her confirmation, no buttons', /Completed before AxisCare/.test(t) && /confirmed by Samantha Troutman, Oct 28, 2026/.test(t) && !document.querySelector('#cgdOrient .op-acts'), t);
  CGD.openId='3'; await OP.profile('3', { id:13 }); t=document.getElementById('cgdOrient').innerText;
  ok('profile: finished, certificate not saved: red, with Make certificate', /Finished, certificate not saved/.test(t) && /Make certificate/.test(t) && document.querySelector('#cgdOrient .op-card').classList.contains('op-attn'), t);
  await OP.make('3'); ok('Make certificate asks the server for exactly that caregiver', CALLS.some(c=>c.action==='make_certificate' && c.axiscare_id==='3'));
  CGD.openId='2'; await OP.profile('2', { id:12 }); t=document.getElementById('cgdOrient').innerText;
  ok('profile: nothing on record: Send orientation link and Verify a past record', /No orientation on record/.test(t) && /Send orientation link/.test(t) && /Verify a past record/.test(t), t);
  await OP.link('2'); await sleep(30);
  ok('Send orientation link: sent, and it says how', CALLS.some(c=>c.action==='send_link' && c.axiscare_id==='2') && /Sent by sms and email/.test(document.getElementById('opSt_2').innerText));
  STATUS['13']={ ok:true, axiscare_id:'13', state:'missing', date:null, why:'No orientation on record', can_make_certificate:false, proof:null, excluded:false, settings:{}, earlier:[{ training_id:'t-old', completed_at:'2025-09-12', document:'training:prior/rachel-old.pdf' }] };
  CGD.openId='13'; await OP.profile('13', { id:113 }); t=document.getElementById('cgdOrient').innerText;
  ok('rehire: the earlier record is offered, with its date and document', /Earlier Training Platform record found: orientation completed Sep 12, 2025/.test(t) && /Use this record/.test(t), t);
  await OP.useEarlier('13', 0);
  const ue=CALLS.find(c=>c.action==='verify_record' && c.axiscare_id==='13');
  ok('Use this record: verified with the earlier document and its own date, after the confirmation', ue && ue.document==='training:prior/rachel-old.pdf' && ue.date==='2025-09-12' && ue.attest===true, ue);
  /* 2. the past-record dialog */
  window.cgdLegacyFor=()=>({ id:12 });
  OP.verifyOpen('2'); await sleep(30);
  const save=()=>document.getElementById('opVSave').click();
  save(); await sleep(30); ok('dialog: nothing saved without a document', /Choose the document first/.test(document.getElementById('opVErr').innerText) && !UPLOADS.length);
  const dt=new DataTransfer(); dt.items.add(new File(['%PDF-1.4'], 'old orientation.pdf', { type:'application/pdf' })); document.getElementById('opVFile').files=dt.files;
  document.getElementById('opVDate').value='2024-03-02'; save(); await sleep(30);
  ok('dialog: nothing saved without the "I looked at it" confirmation', /Confirm you looked/.test(document.getElementById('opVErr').innerText) && !UPLOADS.length);
  document.getElementById('opVAtt').checked=true; save(); await sleep(150);
  const vr=CALLS.find(c=>c.action==='verify_record' && c.axiscare_id==='2');
  ok('dialog: uploads to the caregiver\'s training folder, then the server saves it with the date and the confirmation', UPLOADS.length===1 && /^training\/12\/orient-\d+-old_orientation\.pdf$/.test(UPLOADS[0]) && vr && vr.document===UPLOADS[0] && vr.date==='2024-03-02' && vr.attest===true, [UPLOADS, vr]);
  ok('dialog: closes when saved', !document.getElementById('opVerify'));
  /* 3. the cleanup list */
  location.hash='#cgtraining'; await sleep(600); await OP.cleanup(); await sleep(50);
  const L=document.getElementById('tr-orient').innerText;
  ok('Caregivers, Orientation & Training: Needs orientation proof at the top, with the counts', /Needs orientation proof/.test(L) && /5 checked, 2 verified, 4 left out/.test(L) && /Nobody is deactivated automatically/.test(L), L);
  ok('...each flagged caregiver with what is missing and the right button', /Ben B/.test(L) && /No orientation on record/.test(L) && /Eve E/.test(L) && /Finished, certificate not saved/.test(L) && /Make certificate/.test(L) && /Send orientation link/.test(L), L);
  ok('...and it says the three switches are off', /daily audit cards off/.test(L) && /automatically off/.test(L) && /requires verified orientation off/.test(L), L);
  /* 4. the Hub's proof viewer opens Training certificates too */
  CALLS.length=0; await bgrViewProof('training:certificates/t-eve/agency-orientation.pdf'); await sleep(50);
  ok('the Hub\'s document opener handles Training certificates', CALLS.some(c=>c.action==='open'));
  /* 5. settings */
  DATA.ops_settings={}; location.hash='#settings/orientation-proof'; await sleep(300); opSetFill();
  const P=document.getElementById('tab-settings'), vis=[...P.querySelectorAll('[data-set]')].filter(x=>x.style.display!=='none').map(x=>x.dataset.set);
  ok('Settings: its own section, opened by itself from the Admin page', JSON.stringify(vis)==='["orientation-proof"]', vis);
  const sw=document.getElementById('opSwitches').innerText;
  ok('Settings: three switches, all off', (sw.match(/: off/g)||[]).length===3 && /Daily AxisCare orientation audit/.test(sw) && /Make missing certificates/.test(sw) && /Approve to Work requires verified orientation/.test(sw), sw);
  document.getElementById('set_orient_exclude').value='110, 604, 261, 618, 594'; await opSetSave();
  ok('Settings: the left-out list saves as AxisCare numbers', JSON.stringify(DATA.ops_settings.orientation_audit_exclude)===JSON.stringify(['110','604','261','618','594']));
  document.getElementById('set_orient_exclude').value='Lydia'; await opSetSave();
  ok('Settings: anything but numbers is refused', /AxisCare numbers only/.test(document.getElementById('opSetStatus').innerText) && DATA.ops_settings.orientation_audit_exclude.length===5);
  await opSetToggle('orientation_audit_live'); ok('Settings: a switch turns on by itself', DATA.ops_settings.orientation_audit_live===true && DATA.ops_settings.orientation_gate_live===undefined);
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1300, 'height': 1400})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co/rest' in r.request.url or 'supabase.co/auth' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(f'http://localhost:{PORT}/index.html?proof=orient'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', H)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    pg.evaluate("async()=>{ CGD.openId='3'; await OP.profile('3',{id:13}); document.getElementById('cgdOrient').scrollIntoView(); }"); pg.wait_for_timeout(200)
    pg.locator('#cgdOrient').screenshot(path=os.environ.get('SHOT', '/tmp/op_profile.png'))
    pg.evaluate("async()=>{ location.hash='#cgtraining'; await new Promise(r=>setTimeout(r,500)); await OP.cleanup(); document.getElementById('tr-orient').scrollIntoView(); }"); pg.wait_for_timeout(300); pg.locator('#tr-orient').screenshot(path=os.environ.get('SHOT2', '/tmp/op_list.png')); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

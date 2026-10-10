"""Slice 2c: the Screening desk and proof-required saves, offline. The engine's own code for these features runs in a blank
page with fake candidates and a stand-in Step 1 server (the engine keeps its functions private). Nothing reaches production.
python3 tests/browser/screening_desk_look.py <out dir>, with a static server on 8768 (python3 -m http.server 8768)"""
from playwright.sync_api import sync_playwright
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp'
ENG = open(os.path.join(HERE, '..', '..', 'caregivers-engine.js')).read()
def cut(a, b):
    i = ENG.index(a); j = ENG.index(b, i + 1); return ENG[i:j]
CODE = """
let candidates = []; var HYDRATED = true; let OFFERS = [];
const bgrEsc = t => String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function saveCandidates(){ return Promise.resolve(true); } function renderOB(){} function renderAlerts(){} function renderPeopleChecks(){}
function bgrViewProof(){} function phdFor(){ return []; } function phdLink(){ return ''; }
window.__applied = null; function bgrApplyBoardChange(id, ch){ window.__applied = ch; } function bgrPushDocToGHL(){}
""" + cut('const BGR_CHECKS = [', 'function bgrEnsureDrawer(){') + cut('let _bgrCheckCand = null, _bgrCheckWhich = null;', '/* File the proof onto the caregiver') \
    + cut('/* ── SLICE 2c (Samantha "start slice 2c", 2026-10-10): the Screening desk', '/* Record a reference\'s answer from the card.')
T = r"""
async(CODE)=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  window.__calls=[]; window.__alerts=[]; window.alert=m=>__alerts.push(String(m)); window.prompt=()=>'FCSR registration';
  let mayReveal=false, revealsLog=[], reveals=0;
  const screening=()=>({ ok:true, may_reveal:mayReveal, ttl_seconds:300, fields:['ssn','dob','license'], identity:{ ssn:'ending 3456', dob:true, license:'ending 6789', license_state:'MO', license_expires:'2029-01-01', captured_at:'2026-10-10T03:00:00Z', reveals, purged_at:null, purge_after:null },
    facts:{ first:'Ava', last:'Lee', phone:'(417) 555-0101', email:'ava@example.com', preferred_name:'Ava', other_names:'Ava Smith', lived_outside_mo:'yes', states_lived:['KS'], address:'12 Oak St, Springfield MO 65802' }, consent_signed_at:'2026-10-10T02:50:00Z', step1_completed_at:'2026-10-10T03:10:00Z', reveals_log:revealsLog });
  window.sb={ functions:{ invoke:async(fn,o)=>{ const b=(o&&o.body)||{}; __calls.push({fn,b});
    if(fn!=='step1-sign') return { data:null, error:{ message:'unexpected '+fn } };
    if(b.action==='screening') return { data:screening(), error:null };
    if(b.action==='reveal'){ if(!mayReveal) return { data:{ ok:false, error:"Only a person named on the Admin page's Screening staff list may reveal identity details. Ask an owner to add you there." }, error:null };
      reveals++; revealsLog.unshift({ at:new Date().toISOString(), doc:'identity:'+b.field, by_name:'Krystal', reason:b.reason }); return { data:{ ok:true, field:b.field, value:b.field==='ssn'?'529123456':b.field==='dob'?'1990-05-05':'M123456789', expires_in:300, by:'Krystal' }, error:null }; }
    return { data:{ ok:false, error:'Unknown action.' }, error:null }; } }, storage:{ from:()=>({ upload:async()=>({ error:null }) }) } };
  const sc=document.createElement('script'); sc.textContent=CODE; document.head.appendChild(sc); await sleep(30);
  OFFERS=[{ id:'o-new', onboarding_path:'new' },{ id:'o-old', onboarding_path:'old' }];
  candidates=[{ id:901, first:'Ava', last:'Lee', phone:'4175550101', offer_id:'o-new', oig:'Pending', edl:'Pending', fcsr:'Pending' },{ id:902, first:'Old', last:'Path', offer_id:'o-old', oig:'Pending' }];
  ok('the desk shows only for a new-path offer', sdEligible(candidates[0]) && !sdEligible(candidates[1]));
  await bgrScreeningDesk(901); await sleep(120);
  let body=document.getElementById('sdBody').innerText;
  ok('the desk opens: on file with last four only, the FCSR sheet, the clearance statement, the DHSS links, no reveal buttons for someone not on the list',
     /on file, ending 3456/.test(body) && /Ava Smith/.test(body) && /must clear before this person has any participant contact/.test(body) && /never permission to work/.test(body) && /not on the Screening staff list/.test(body) && !/Reveal \(5 min\)/.test(body) && document.querySelectorAll('#sdBody a[href*="health.mo.gov"]').length===2 && !/529123456/.test(body), body.slice(0,400));
  ok('fingerprints flagged because they lived outside Missouri; the consent time is shown', /fingerprint check required/.test(body) && /consent signed/i.test(body), body.slice(0,400));
  sdClose();
  mayReveal=true; await bgrScreeningDesk(901); await sleep(120);
  body=document.getElementById('sdBody').innerText;
  ok('on the list: three Reveal buttons, one per field', (body.match(/Reveal \(5 min\)/g)||[]).length===3, body.slice(0,300));
  const btn=[...document.querySelectorAll('#sdBody button')].find(b=>/Reveal \(5 min\)/.test(b.textContent)); btn.click(); await sleep(200);
  body=document.getElementById('sdBody').innerText;
  const rev=__calls.filter(c=>c.b.action==='reveal');
  ok('one reveal: the server was asked for one field with the typed reason', rev.length===1 && rev[0].b.field==='ssn' && rev[0].b.reason==='FCSR registration', rev);
  ok('the SSN shows with a countdown and a Copy button, appears on the registration sheet, and the log shows who and why', /529123456/.test(body) && /wipes in [45]:\d\d/.test(body) && /Copy/.test(body) && /Krystal · "FCSR registration"/.test(body), body.slice(0,700));
  ok('the value lives only in page memory: nothing in localStorage or sessionStorage', Object.keys(localStorage).length===0 && Object.keys(sessionStorage).length===0);
  SD.shown.ssn.until=Date.now()+900; await sleep(1600);
  body=document.getElementById('sdBody').innerText;
  ok('when the countdown ends the value is wiped from the page and the field shows "on file" again', !/529123456/.test(body) && /on file, ending 3456/.test(body), body.slice(0,300));
  sdClose(); ok('closing the desk clears everything', JSON.stringify(SD.shown)==='{}' && Object.keys(SD.timers).length===0);
  /* proof required */
  bgrRecordCheck(901,'edl'); await sleep(30);
  document.getElementById('bgrCheckResult').value='Clear'; document.getElementById('bgrCheckDate').value='2026-10-10'; document.getElementById('bgrCheckProof').value='';
  __alerts=[]; window.__applied=null; await bgrSaveCheck(null); await sleep(30);
  ok('a Clear result with no document and no link is refused with the plain words, nothing saved', __alerts.length===1 && /needs its evidence/.test(__alerts[0]) && !window.__applied, __alerts);
  document.getElementById('bgrCheckProof').value='https://example.invalid/edl-result.pdf'; __alerts=[]; await bgrSaveCheck(null); await sleep(30);
  ok('the same result with a link saves (result, date, proof)', !__alerts.length && window.__applied && window.__applied.edl==='Clear' && window.__applied.edl_proof==='https://example.invalid/edl-result.pdf', [__alerts, window.__applied]);
  bgrRecordCheck(901,'fcsr'); await sleep(30); document.getElementById('bgrCheckResult').value='Pending'; document.getElementById('bgrCheckProof').value=''; __alerts=[]; window.__applied=null; await bgrSaveCheck(null); await sleep(30);
  ok('Pending needs no proof', !__alerts.length && window.__applied && window.__applied.fcsr==='Pending', [__alerts, window.__applied]);
  mayReveal=true; await bgrScreeningDesk(901); await sleep(120);
  ok('no em dash anywhere the desk drew', !/—/.test(document.getElementById('sdBody').innerText));
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1100, 'height': 1000})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://127.0.0.1:8768/tests/browser/'); pg.wait_for_timeout(200)   # a real origin (a static server on 8768 serving the repo), so storage can be checked
    pg.evaluate("document.body.innerHTML=''; const st=document.createElement('style'); st.textContent='.ibtn{font:inherit;font-size:.8rem;padding:.3rem .6rem;border:1px solid #d9d4c8;border-radius:8px;background:#fff;cursor:pointer}body{font-family:-apple-system,sans-serif}'; document.head.appendChild(st)")
    R = pg.evaluate(T, CODE)
    pg.screenshot(path=os.path.join(OUT, 'screening_desk.png'), full_page=True)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

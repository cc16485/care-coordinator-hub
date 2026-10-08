"""From the GHE visit to Fusion (GHE fix slice 4, 2026-10-08), in the real Hub page offline, the clock at Nov 20 2026: a
visited GHE with no form (due 2 days later); an LPN's form through RN review (a reviewing RN who signed); an RN's form
straight to Ready; the upload with its date against the earlier deadline; the Fusion check (seen, or not there with a note);
saving a form keeps its status and upload; the nurse's view shows their next step. (python3 tests/browser/ghe_forms_look.py [port])"""
import os, sys
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from clock_pin import pin
src = open(os.path.join(HERE, 'client_journey_look.py')).read()
ns = {'__file__': os.path.join(HERE, 'client_journey_look.py')}; exec(src[:src.rindex('with sync_playwright() as pw:')], ns)
STUB, DATA = ns['STUB'], ns['DATA']
PORT = sys.argv[1] if len(sys.argv) > 1 else '8765'
FAKE = r"""
(()=>{
  const W=window; W.__P=[];
  (0,eval)("persist=async(k,i)=>{ window.__P.push([k,JSON.parse(JSON.stringify(i))]); }");
  (0,eval)("nvGhlSync=async()=>{}"); (0,eval)("ccPickOptions=async()=>[]");
  W.confirm=()=>true; W.alert=(m)=>{ W.__alert=m; };
  DATA.nurse_staff=[{ id:'n1', name:'Rita Reed', cred:'RN', license:'RN1', expires:'2027-06-30', email:'rita@mo-care.com', employee:true, supervising_rn:true },
                    { id:'n2', name:'Lena Lowe', cred:'LPN', license:'PN1', expires:'2027-06-30', email:'lena@mo-care.com', employee:true }];
  DATA.nurse_clients=[
    { id:'c1', name:'Ann Nopaper', axiscare_client_id:'1', ghe1:'2026-11', assigned_nurse:'Lena Lowe', active:true },
    { id:'c2', name:'Bea Lpn', axiscare_client_id:'2', ghe1:'2026-11', assigned_nurse:'Lena Lowe', active:true },
    { id:'c3', name:'Cal Rn', axiscare_client_id:'3', ghe1:'2026-11', assigned_nurse:'Rita Reed', active:true }];
  DATA.ghe_watch=[
    { id:'gw_c1_2026-11', client_id:'c1', month:'2026-11', state:'visited', stage:'done', visit:{ at:'2026-11-12T16:00:00Z', nurse:'Lena Lowe' } },
    { id:'gw_c2_2026-11', client_id:'c2', month:'2026-11', state:'visited', stage:'done', visit:{ at:'2026-11-13T16:00:00Z', nurse:'Lena Lowe' } },
    { id:'gw_c3_2026-11', client_id:'c3', month:'2026-11', state:'visited', stage:'done', visit:{ at:'2026-11-16T16:00:00Z', nurse:'Rita Reed' } }];
  DATA.ghe_forms=[
    { id:'f1', client:'Bea Lpn', client_id:'c2', visit_date:'2026-11-13', nurse:'Lena Lowe', status:'draft', sig_nurse:'data:x', f:{ ghe_client:'Bea Lpn', ghe_visit_date:'2026-11-13', ghe_nurse:'Lena Lowe' } },
    { id:'f2', client:'Cal Rn', client_id:'c3', visit_date:'2026-11-16', nurse:'Rita Reed', status:'draft', sig_nurse:'data:x', f:{} },
    { id:'f3', client:'Dee Old', visit_date:'2026-10-06', nurse:'Rita Reed', status:'uploaded', uploaded_on:'2026-10-15', uploaded_by:'krystal@mo-care.com', uploaded_on_time:true, sig_nurse:'data:x', f:{ ghe_client:'Dee Old', ghe_visit_date:'2026-10-06', ghe_nurse:'Rita Reed' } },
    { id:'f4', client:'Eve Gone', visit_date:'2026-10-08', nurse:'Rita Reed', status:'uploaded', uploaded_on:'2026-10-16', uploaded_on_time:true, sig_nurse:'data:x', f:{} }];
  DATA.nurse_visits=[]; DATA.medicaid_plans=[];
})();
"""
T = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  window.__as('krystal@mo-care.com','Krystal Land');
  switchTab('nursevisits'); await sleep(300);
  const row=n=>[...document.querySelectorAll('#nvGheList tr')].find(t=>t.innerText.includes(n))||{innerText:''};
  ok('A visit with no GHE form yet: "GHE form missing (due 2026-11-14)", red once past due', /Visited Nov 12 · Lena Lowe · GHE form missing \(due 2026-11-14\)/.test(row('Ann Nopaper').innerText), row('Ann Nopaper').innerText);
  ok('...a visit with a form shows the form\'s place: "Draft · upload by 2026-11-27"', /Visited Nov 13 · Lena Lowe · Draft · upload by 2026-11-27/.test(row('Bea Lpn').innerText), row('Bea Lpn').innerText);
  const list=()=>document.getElementById('gheList').innerText, msg=id=>(document.getElementById('gheMsg_'+id)||{}).textContent||'';
  ok('The forms list has no free status picker; each form shows its one next step', !document.querySelector('#gheList select') && /Send to RN review/.test(list()) && /Cal Rn[\s\S]*Ready for Fusion/.test(list()), list());
  /* the LPN's form */
  await gheSetStatus('f1','rn_review'); await sleep(100);
  ok('An LPN\'s form: Send to RN review', DATA.ghe_forms.find(f=>f.id==='f1').status==='rn_review' && /RN reviewed: Ready for Fusion/.test(list()));
  await gheSetStatus('f1','ready'); await sleep(60);
  ok('...Ready needs a reviewing RN: refused with the reason, nothing saved', /An RN must review this LPN form: pick the reviewing RN/.test(msg('f1')) && DATA.ghe_forms.find(f=>f.id==='f1').status==='rn_review', msg('f1'));
  DATA.ghe_forms.find(f=>f.id==='f1').rn_reviewer='Rita Reed'; await gheSetStatus('f1','ready'); await sleep(60);
  ok('...and the RN signs it first (Supervisory Nurse signature)', /signs the form/.test(msg('f1')));
  DATA.ghe_forms.find(f=>f.id==='f1').sig_sup='data:rn'; window.__P.length=0; await gheSetStatus('f1','ready'); await sleep(100);
  const f1=window.__P.filter(x=>x[0]==='ghe_forms').map(x=>x[1]).pop();
  ok('...reviewed and signed: Ready for Fusion, with the RN named and who marked it', f1 && f1.status==='ready' && f1.rn_reviewer==='Rita Reed' && f1.rn_reviewed_by==='krystal@mo-care.com' && /Bea Lpn[\s\S]*Ready for Fusion · upload by 2026-11-27[\s\S]*reviewed by Rita Reed/.test(list()), [f1, list()]);
  document.getElementById('gheUpOn_f1').value='2026-11-19'; window.__P.length=0; await gheSetStatus('f1','uploaded'); await sleep(100);
  const u=window.__P.filter(x=>x[0]==='ghe_forms').map(x=>x[1]).pop();
  ok('Uploaded on Nov 19: recorded with the date, who, the deadline (Nov 27: 10 working days) and on time', u && u.status==='uploaded' && u.uploaded_on==='2026-11-19' && u.uploaded_by==='krystal@mo-care.com' && u.upload_due==='2026-11-27' && u.uploaded_on_time===true, u);
  /* the RN's form */
  window.__P.length=0; await gheSetStatus('f2','rn_review'); await sleep(60);
  ok('An RN\'s own form doesn\'t go to RN review ("does not need a second RN")', /does not need a second RN/.test(msg('f2')) && window.__P.length===0);
  await gheSetStatus('f2','ready'); await sleep(80);
  ok('...it goes straight to Ready for Fusion', DATA.ghe_forms.find(f=>f.id==='f2').status==='ready');
  document.getElementById('gheUpOn_f2').value='2026-11-25'; await gheSetStatus('f2','uploaded'); await sleep(60);
  ok('...an upload date in the future is refused', /future/.test(msg('f2')) && DATA.ghe_forms.find(f=>f.id==='f2').status==='ready');
  /* the Fusion check */
  const fc=()=>document.getElementById('gheFusion').innerText;
  ok('Fusion check lists the uploads not yet seen in Fusion, oldest first (Dee, Eve, then Bea)', /Fusion check/.test(fc()) && fc().indexOf('Dee Old')<fc().indexOf('Eve Gone') && fc().indexOf('Eve Gone')<fc().indexOf('Bea Lpn'), fc());
  window.__P.length=0; await gheFusionCheck('f3',true); await sleep(100);
  const f3=window.__P.filter(x=>x[0]==='ghe_forms').map(x=>x[1]).pop();
  ok('...Seen in Fusion: kept with who and when, and off the list', f3 && f3.fusion_checked.seen===true && f3.fusion_checked.by==='krystal@mo-care.com' && !/Dee Old/.test(fc()));
  await gheFusionCheck('f4',false); await sleep(60);
  ok('...Not in Fusion needs a note', /Say what was wrong/.test(document.getElementById('gheFcMsg_f4').textContent));
  document.getElementById('gheFcN_f4').value='Not in the Documents tab'; await gheFusionCheck('f4',false); await sleep(100);
  const f4=DATA.ghe_forms.find(f=>f.id==='f4');
  ok('...with a note: back to Ready for Fusion to upload again, the note kept', f4.status==='ready' && f4.fusion_checked.seen===false && f4.fusion_checked.note==='Not in the Documents tab' && /Eve Gone[\s\S]*Ready for Fusion · upload by 2026-10-22 \(OVERDUE\)/.test(list()), [f4, list()]);
  /* saving a form keeps what isn't on the form */
  gheOpen('f3'); await sleep(150);
  ok('The form shows its status at the top; the status is not picked there', document.getElementById('ghe_status_lbl').textContent==='Uploaded to Fusion' && getComputedStyle(document.getElementById('ghe_status')).display==='none');
  window.__P.length=0; await gheSave(); await sleep(100); gheClose();
  const saved=window.__P.filter(x=>x[0]==='ghe_forms').map(x=>x[1]).pop();
  ok('...saving it again keeps the status, the upload and the Fusion check', saved && saved.status==='uploaded' && saved.uploaded_on==='2026-10-15' && saved.fusion_checked && saved.fusion_checked.seen===true, saved);
  ok('...the reviewing RN list offers only RNs', [...document.getElementById('ghe_rn_reviewer').options].map(o=>o.textContent).join('|')==='Pick the RN|Rita Reed');
  /* the nurse's own view */
  switchTab('nurseportal'); await sleep(150); npSetPreview('Rita Reed'); await sleep(150);
  const ng=document.getElementById('npGhe').innerText;
  ok('What a nurse sees: their forms with the next step, and "the office uploads it to Fusion" (no upload button)', /Cal Rn[\s\S]*Ready for Fusion · upload by 2026-11-30[\s\S]*the office uploads it to Fusion/.test(ng) && !document.querySelector('#npGhe input[type=date]'), ng);
  return R; }"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []
    pg = b.new_page(viewport={'width': 1280, 'height': 1000})
    pin(pg, '2026-11-20T10:00:00-06:00')
    pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    pg.goto(f'http://localhost:{PORT}/index.html?proof=gheforms'); pg.wait_for_timeout(1500)
    for s in (STUB, DATA, FAKE): pg.evaluate('s=>(0,eval)(s)', s)
    R = pg.evaluate(T)
    pg.evaluate("()=>{ switchTab('nursevisits'); setTimeout(()=>document.getElementById('gheList').scrollIntoView(),100); }"); pg.wait_for_timeout(400)
    pg.screenshot(path='/tmp/ghe_forms_desk.png')
    ph = b.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True)
    pin(ph, '2026-11-20T10:00:00-06:00')
    ph.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    ph.goto(f'http://localhost:{PORT}/index.html?proof=gheforms'); ph.wait_for_timeout(1500)
    for s in (STUB, DATA, FAKE): ph.evaluate('s=>(0,eval)(s)', s)
    w = ph.evaluate("""async()=>{ document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; window.__as('krystal@mo-care.com','Krystal Land');
      switchTab('nursevisits'); await new Promise(r=>setTimeout(r,300)); document.getElementById('gheFusion').scrollIntoView();
      return { sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth }; }""")
    R.append(['PASS' if w['sw'] <= w['cw'] + 1 else 'FAIL', 'on a phone: the forms and the Fusion check fit, no sideways scroll', str(w)])
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

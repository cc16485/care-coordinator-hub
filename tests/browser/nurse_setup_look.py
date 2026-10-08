"""Nurse setup (GHE fix slice 2, 2026-10-08), in the real Hub page offline: today's nurse record (name only) shows Not ready
and exactly what's missing; editing it; a supervising RN; one supervising RN at a time; only ready nurses can be given a
client; the portal won't let a nurse who isn't ready claim; a claim records "not this client's immediate family"; a
renamed nurse keeps their clients. (python3 tests/browser/nurse_setup_look.py [port])"""
import os, sys
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, 'client_journey_look.py')).read()
ns = {'__file__': os.path.join(HERE, 'client_journey_look.py')}; exec(src[:src.rindex('with sync_playwright() as pw:')], ns)
STUB, DATA = ns['STUB'], ns['DATA']
PORT = sys.argv[1] if len(sys.argv) > 1 else '8765'
FAKE = r"""
(()=>{
  const W=window; W.__P=[]; W.__R=[];
  (0,eval)("persist=async(k,i)=>{ window.__P.push([k,JSON.parse(JSON.stringify(i))]); }");
  (0,eval)("removeItem=async(k,id)=>{ window.__R.push([k,id]); }");
  (0,eval)("nvGhlSync=async()=>{}");
  (0,eval)("ccPickOptions=async()=>[]");
  W.confirm=(m)=>{ W.__confirm=m; return true; }; W.alert=(m)=>{ W.__alert=m; };
  DATA.nurse_staff=[{ id:'n1', name:'Natasha Early', created_at:'2026-08-01T00:00:00Z' }];
  DATA.nurse_clients=[{ id:'c1', name:'Pat Sample', axiscare_client_id:'901', ghe1:'2026-11', active:true, assigned_nurse:'' },
                      { id:'c2', name:'Lou Two', axiscare_client_id:'902', ghe1:'2026-12', active:true, assigned_nurse:'' }];
  DATA.nurse_visits=[]; DATA.ghe_forms=[]; DATA.medicaid_plans=[];
})();
"""
T = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  window.__as('krystal@mo-care.com','Krystal Land');
  switchTab('nursevisits'); await sleep(300);
  const list=()=>document.getElementById('nsList').innerText, team=()=>document.getElementById('nsTeam').innerText;
  ok('Today\'s nurse (name only): Not ready, and exactly what is missing', /Natasha Early[\s\S]*Not ready[\s\S]*Needs: RN or LPN; confirmed as our employee \(not a contractor\); license number; license expiry date/.test(list()), list());
  ok('...and the team line: no supervising RN named', /No supervising RN is named/.test(team()), team());
  const set=(id,v)=>{ const e=document.getElementById(id); if(e.type==='checkbox') e.checked=v; else e.value=v; };
  nsEdit('n1'); await sleep(50);
  ok('Edit opens the form with what is on file', document.getElementById('nsAddWrap').style.display==='block' && document.getElementById('nsName').value==='Natasha Early' && document.getElementById('nsId').value==='n1');
  set('nsCred','LPN'); set('nsLicense','PN12345'); set('nsExpires','2027-03-31'); set('nsEmail','Natasha@MO-care.com'); set('nsEmployee',true); set('nsSup',true);
  await nsAdd(); await sleep(50);
  ok('An LPN can\'t be the supervising RN: refused with a reason, nothing saved', /Only an RN can be the supervising RN/.test(document.getElementById('nsFormMsg').textContent) && window.__P.length===0);
  set('nsSup',false); await nsAdd(); await sleep(150);
  const nat=window.__P.filter(x=>x[0]==='nurse_staff').map(x=>x[1]).pop();
  ok('Saved: LPN, license, expiry, employee, email lower-cased, same record (not a second one)', nat && nat.id==='n1' && nat.cred==='LPN' && nat.license==='PN12345' && nat.employee===true && nat.email==='natasha@mo-care.com' && DATA.nurse_staff.length===1 && nat.updated_by==='krystal@mo-care.com', nat);
  ok('...still not ready: an LPN needs a supervising RN on the team', /Natasha Early[\s\S]*Not ready[\s\S]*a supervising RN on the team/.test(list()), list());
  nsToggleAdd(); await sleep(50);
  ok('Add a nurse opens an empty form', document.getElementById('nsName').value==='' && document.getElementById('nsId').value==='' && !document.getElementById('nsEmployee').checked);
  set('nsName','Rita Reed'); set('nsCred','RN'); set('nsLicense','RN777'); set('nsExpires','2027-06-30'); set('nsEmail','rita@mo-care.com'); set('nsEmployee',true); set('nsSup',true);
  await nsAdd(); await sleep(150);
  ok('A supervising RN: both nurses are now Ready for GHEs; the team line names her', /Supervising RN: Rita Reed/.test(team()) && (list().match(/Ready for GHEs/g)||[]).length===2, list()+' | '+team());
  nsToggleAdd(); set('nsName','Rob Second'); set('nsCred','RN'); set('nsLicense','RN888'); set('nsExpires','2027-06-30'); set('nsEmployee',true); set('nsSup',true); await nsAdd(); await sleep(150);
  ok('One supervising RN at a time: marking Rob unmarks Rita (both saved)', DATA.nurse_staff.filter(n=>n.supervising_rn).map(n=>n.name).join()==='Rob Second' && window.__P.some(x=>x[0]==='nurse_staff'&&x[1].name==='Rita Reed'&&x[1].supervising_rn===false));
  nsToggleAdd(); set('nsName','Carl Contract'); set('nsCred','RN'); set('nsLicense','RN999'); set('nsExpires','2027-06-30'); set('nsEmployee',false); await nsAdd(); await sleep(150);
  ok('A contractor is listed as Not ready ("confirmed as our employee")', /Carl Contract[\s\S]*Not ready[\s\S]*confirmed as our employee/.test(list()), list());
  nsToggleAdd(); set('nsName','rita reed'); await nsAdd(); await sleep(50);
  ok('The same name twice is refused', /already on the list/.test(document.getElementById('nsFormMsg').textContent)); nsToggleAdd(false);
  /* assignment */
  const opts=[...document.getElementById('nvNurse').options].map(o=>o.textContent);
  ok('Add a client: the nurse list offers only ready nurses (no Carl)', opts.includes('Rita Reed') && opts.includes('Natasha Early') && !opts.includes('Carl Contract'), opts);
  window.__alert=''; const r1=await nvAssign('c1','Carl Contract');
  ok('Giving a client to a nurse who isn\'t ready is refused, with the reason; nothing saved', r1===false && /Carl Contract isn't ready for GHEs yet: needs confirmed as our employee/.test(window.__alert) && !DATA.nurse_clients[0].assigned_nurse, window.__alert);
  await nvAssign('c2','Rita Reed'); await sleep(100);
  ok('...a ready nurse is fine', DATA.nurse_clients[1].assigned_nurse==='Rita Reed');
  /* the portal, previewed as Carl (not ready), then Natasha (ready) */
  switchTab('nurseportal'); await sleep(200); npSetPreview('Carl Contract'); await sleep(100);
  ok('Nurse Portal for a nurse who isn\'t ready: "can\'t claim clients until the office finishes your setup", no Claim buttons', /can't claim clients until the office finishes your setup/.test(document.getElementById('npHello').textContent) && !/Claim this client/.test(document.getElementById('npOpen').innerText) && /setup not finished/.test(document.getElementById('npOpen').innerText));
  npSetPreview('Natasha Early'); await sleep(100);
  ok('...for a ready nurse: Claim buttons', /Claim this client/.test(document.getElementById('npOpen').innerText));
  window.__P.length=0; await npClaim('c1'); await sleep(150);
  const saved=window.__P.filter(x=>x[0]==='nurse_clients').map(x=>x[1]).pop();
  ok('Claiming asks the nurse to confirm they are not the client\'s immediate family', /not Pat Sample's immediate family/.test(window.__confirm||''), window.__confirm);
  ok('...and keeps that confirmation with the claim', saved && saved.assigned_nurse==='Natasha Early' && saved.not_family && saved.not_family.nurse==='Natasha Early' && saved.not_family.by==='krystal@mo-care.com', saved);
  /* rename keeps clients */
  switchTab('nursevisits'); await sleep(200); nsEdit('n1'); set('nsName','Natasha Early-Banks'); await nsAdd(); await sleep(150);
  ok('A renamed nurse keeps their clients', DATA.nurse_clients[0].assigned_nurse==='Natasha Early-Banks');
  /* an expired license after the fact: the caseload says so */
  const rita=DATA.nurse_staff.find(n=>n.name==='Rita Reed'); rita.expires='2026-09-01'; renderNurseVisits(); await sleep(150);
  ok('A nurse whose license lapses keeps their clients, flagged "nurse not ready: reassign or finish their setup"', /Rita Reed[\s\S]*nurse not ready: reassign or finish their setup/.test(document.getElementById('nvCaseloads').innerText), document.getElementById('nvCaseloads').innerText.slice(0,500));
  return R; }"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []
    pg = b.new_page(viewport={'width': 1280, 'height': 1000})
    pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    pg.goto(f'http://localhost:{PORT}/index.html?proof=nurses'); pg.wait_for_timeout(1500)
    for s in (STUB, DATA, FAKE): pg.evaluate('s=>(0,eval)(s)', s)
    R = pg.evaluate(T)
    pg.evaluate("()=>{ switchTab('nursevisits'); document.getElementById('nsList').scrollIntoView(); }"); pg.wait_for_timeout(300)
    pg.screenshot(path='/tmp/nurse_setup_desk.png')
    ph = b.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True)
    ph.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    ph.goto(f'http://localhost:{PORT}/index.html?proof=nurses'); ph.wait_for_timeout(1500)
    for s in (STUB, DATA, FAKE): ph.evaluate('s=>(0,eval)(s)', s)
    w = ph.evaluate("""async()=>{ document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; window.__as('krystal@mo-care.com','Krystal Land');
      switchTab('nursevisits'); await new Promise(r=>setTimeout(r,300)); nsEdit('n1'); await new Promise(r=>setTimeout(r,100)); document.getElementById('nsAddWrap').scrollIntoView();
      return { sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth }; }""")
    R.append(['PASS' if w['sw'] <= w['cw'] + 1 else 'FAIL', 'on a phone: the nurse form fits, no sideways scroll', str(w)])
    ph.screenshot(path='/tmp/nurse_setup_phone.png')
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

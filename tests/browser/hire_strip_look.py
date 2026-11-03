"""The hiring strip and the name links (Samantha 2026-11-02: "we need to know exactly where every applicant is ... click at any
time on any name and get to the applicant's profile"). The real Hub page, offline (files served from this folder), made-up
people only; the profile opener is recorded, nothing is texted, emailed or saved.
(python3 tests/browser/hire_strip_look.py; SHOTS=<dir> also saves screenshots)"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = os.environ.get('SHOTS')
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const D=864e5, ago=ms=>new Date(Date.now()-ms).toISOString(), soon=ms=>new Date(Date.now()+ms).toISOString();
  const full=n=>({ module:n, scene:9, complete:true, heard:10, first_at:ago(5*D), last_at:ago(5*D), moved_at:ago(5*D) });
  /* Orientation: one stuck, one moving, one finished at the finish line is not needed here */
  const ROWS=[
    { training_id:'t1', name:'Fake Stuck Orient', axiscare_id:'', phone:'4175550101', status_label:'In Training', status:'in_progress', assigned_at:ago(6*D), welcome_sent_at:ago(6*D), units:[full(1),{ module:2, scene:1, complete:false, heard:2, first_at:ago(5*D), last_at:ago(5*D), moved_at:ago(5*D) }] },
    { training_id:'t2', name:'Fake Moving Orient', axiscare_id:'', status_label:'In Training', status:'in_progress', assigned_at:ago(1*D), welcome_sent_at:ago(1*D), units:[{ module:1, scene:3, complete:false, heard:3, first_at:ago(2*3600e3), last_at:ago(3600e3), moved_at:ago(3600e3) }] } ];
  const OFFS=[
    { id:'off-sent-1', name:'Fake Offer Sent', position:'Caregiver', interview_date:ago(2*D).slice(0,10), onboarding_path:'new' },
    { id:'off-sent-2', name:'Fake Offer Old', position:'Caregiver', interview_date:ago(9*D).slice(0,10), onboarding_path:'new' },
    { id:'off-acc-1', name:'Fake Moving Orient', position:'Caregiver', interview_date:ago(3*D).slice(0,10), onboarding_path:'new', offer_signed_at:ago(2*D), pd_signed_at:ago(2*D) } ];
  const OPENED=[];
  window.fetch=async(u,o)=>{ u=String(u);
    if(u.includes('hub-training-data')) return new Response(JSON.stringify(u.includes('job_offers')?OFFS:u.includes('orientation_finished')?[]:ROWS),{status:200});
    return new Response('{}',{status:200}); };
  (0,eval)("trainHubTok=async()=>'t'");
  window.__inv=async()=>({ data:{ ok:true, rows:[] }, error:null });
  (0,eval)("sb=new Proxy(sb||{},{ get:(t,k)=>k==='functions'?{ invoke:(n,o)=>window.__inv(n,o) }:(typeof t[k]==='function'?t[k].bind(t):t[k]) });");
  (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha Troutman' };"); CC_ROLES=['owner_admin']; CC_ROLES_CHECKED=true; CC_ROLE_BY_EMAIL['samantha@mo-care.com']=['owner_admin'];
  DATA.ops_settings=DATA.ops_settings||{};
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; await sleep(300);
  /* Applicants and Interviews, as their own reads would leave them */
  (0,eval)(`AP_ROWS=[
    { id:'a1', first_name:'Fake', last_name:'New', status:'new', created_at:'${ago(1*D)}', position:'caregiver' },
    { id:'a2', first_name:'Fake', last_name:'Looked', status:'reviewing', screen_grade:'review', created_at:'${ago(2*D)}', position:'caregiver' },
    { id:'a3', first_name:'Fake', last_name:'Booked', status:'reviewing', screen_grade:'qualified', created_at:'${ago(3*D)}', position:'caregiver' },
    { id:'a4', first_name:'Fake', last_name:'Hired', status:'hired', created_at:'${ago(40*D)}', position:'caregiver' } ];
    AP_BOOK={ a3:{ applicant_id:'a3', status:'booked', starts_at:'${soon(D)}' } };
    IVQ=[{ id:'b1', applicant_id:'a3', status:'booked', starts_at:'${soon(D)}' }, { id:'b2', applicant_id:'a5', status:'booked', starts_at:'${ago(D)}' }];
    IVQ_APP={ a3:{ id:'a3', first_name:'Fake', last_name:'Booked', phone:'4175550103' }, a5:{ id:'a5', first_name:'Fake', last_name:'Past', phone:'4175550105' } };`);
  window.apLoad=async()=>{}; (0,eval)('apLoad=window.apLoad; ivqLoad=async()=>{};');
  const OPEN=[]; const hpWait=async()=>{ for(let i=0;i<40&&!window.HP;i++) await sleep(50); };

  switchTab('applicants'); await sleep(300);
  await OPR.load(); await sleep(100);
  for(let i=0;i<40 && (!window.OFFERS && typeof OFFERS==='undefined');i++) await sleep(50);
  switchTab('offers'); await sleep(1200);   /* loads the caregiver engine and the offers */
  await hpWait(); window.HP.open=k=>OPEN.push(JSON.stringify(k));
  switchTab('applicants'); await sleep(300);
  const strip=()=>[...document.querySelectorAll('#tab-applicants .hs-st')].map(b=>b.innerText.replace(/\s+/g,' ').trim());
  ok('the strip sits at the top of Applicants', !!document.querySelector('#tab-applicants > .hs-mount .hs-strip'), document.querySelector('#tab-applicants').innerHTML.slice(0,200));
  ok('seven stages in order', JSON.stringify([...document.querySelectorAll('#tab-applicants .hs-st span')].map(x=>x.innerText))==='["Applied","Interview","Offer","Step 1","Checks and Step 2","Orientation","Finish line"]', strip());
  ok('Applied: the new one and the one to look at, both need us; the booked and the hired are not here', /^Applied 2 2 need you$/.test(strip()[0]), strip()[0]);
  ok('Interview: 2 booked, 1 whose time passed with no outcome', /^Interview 2 1 needs you$/.test(strip()[1]), strip()[1]);
  ok('Offer: 2 sent, 1 a week old', /^Offer 2 1 needs you$/.test(strip()[2]), strip()[2]);
  ok('Step 1: 1 accepted, nobody waiting on us yet', /^Step 1 1 nobody waiting on us$/.test(strip()[3]), strip()[3]);
  ok('Orientation: 2, the stuck one needs us', /^Orientation 2 1 needs you$/.test(strip()[5]), strip()[5]);
  ok('Finish line: nobody', /^Finish line 0 nobody waiting on us$/.test(strip()[6]), strip()[6]);
  ok('Applied is lit on Applicants', document.querySelector('#tab-applicants .hs-st.on') && /Applied/.test(document.querySelector('#tab-applicants .hs-st.on').innerText));

  if(!document.querySelectorAll('#tab-applicants .hs-st')[3]) return R;
  /* a stage opens its tab */
  document.querySelectorAll('#tab-applicants .hs-st')[3].click(); await sleep(400);
  ok('Step 1 opens Offers on Accepted, with Step 1 lit', activeTab==='offers' && OFF_STAGE==='accepted' && /Step 1/.test((document.querySelector('#tab-offers .hs-st.on')||{}).innerText||''), [activeTab, OFF_STAGE]);
  const nm=document.querySelector('#offersList .hs-name');
  ok('Offers: the name is a profile link', nm && nm.innerText==='Fake Moving Orient', nm && nm.outerHTML.slice(0,200));
  const det=nm && nm.closest('details'), was=det && det.open; if(nm) nm.click(); await sleep(50);
  ok('...it opens their profile by the offer and does not open or close the card', OPEN.includes('{"offer_id":"off-acc-1"}') && det.open===was, [OPEN, was, det&&det.open]);

  document.querySelectorAll('#tab-offers .hs-st')[5].click(); await sleep(500);
  ok('Orientation opens the Orientation tab on Needs you', activeTab==='orientprog' && /Needs you/.test((document.querySelector('.orp-tab.on')||{}).innerText||''), activeTab);
  const on=[...document.querySelectorAll('#tab-orientprog .orp-name .name-cell')].map(x=>x.innerText.trim());
  OPEN.length=0; OPR.tab('inp'); await sleep(50);
  const mv=[...document.querySelectorAll('#tab-orientprog .orp-name .name-cell')].find(x=>/Fake Moving Orient/.test(x.innerText));
  ok('Orientation: a name not on the caregiver list but with an offer links to their profile', !!mv, document.querySelector('#tab-orientprog .orp-card') && document.querySelector('#tab-orientprog .orp-card').innerHTML.slice(0,400));
  if(mv){ mv.click(); await sleep(50); }
  ok('...by their offer', OPEN.includes('{"offer_id":"off-acc-1"}'), OPEN);
  OPR.tab('need'); await sleep(50);
  const st=document.querySelector('#tab-orientprog .orp-name span[title^="Not found"]');
  ok('a name the Hub cannot find says so on hover (no dead link)', st && /Fake Stuck Orient/.test(st.innerText), document.querySelector('#tab-orientprog .orp-name') && document.querySelector('#tab-orientprog .orp-name').innerHTML);

  /* Checks and Step 2: the shared data never loads offline, so the strip says it is still reading (the Onboarding rows and
     their name links are checked in checks_dash_look.py); then the count, with the engine's answers stood in */
  ok('Checks and Step 2 waits for the shared data (offline it never comes): reading, not a wrong 0', /^Checks and Step 2 … reading…$/.test([...document.querySelectorAll('#tab-orientprog .hs-st')][4].innerText.replace(/\s+/g,' ').trim()), [...document.querySelectorAll('#tab-orientprog .hs-st')][4].innerText);
  const E=window.HSTRIP_ENGINE, keep={ h:E.hydrated, p:E.people, a:E.acts };
  E.hydrated=()=>true; E.people=()=>[{ stop:0 }, { stop:1, n:'a' }, { stop:2, n:'b' }, { stop:3 }];
  E.acts=p=>p.n==='a'?[{ label:'Run OIG' }]:[{ label:'', wait:true, text:'Waiting on references' }];
  HSTRIP.draw(); await sleep(20);
  ok('Checks and Step 2: the two at those stops, one with something only we can do', /^Checks and Step 2 2 1 needs you$/.test([...document.querySelectorAll('#tab-orientprog .hs-st')][4].innerText.replace(/\s+/g,' ').trim()), [...document.querySelectorAll('#tab-orientprog .hs-st')][4].innerText);
  Object.assign(E, { hydrated:keep.h, people:keep.p, acts:keep.a });
  return R;
}
"""
MIME = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.json':'application/json', '.webmanifest':'application/json', '.webp':'image/webp'}
def serve(route):
    url = route.request.url
    if 'supabase.co' in url: return route.abort()
    if not url.startswith('http://hstrip.local/'): return route.continue_()
    p = (ROOT / url.split('http://hstrip.local/', 1)[1].split('?')[0].split('#')[0])
    if not p.is_file(): return route.fulfill(status=404, body='')
    route.fulfill(status=200, body=p.read_bytes(), content_type=MIME.get(p.suffix, 'application/octet-stream'))
with sync_playwright() as pw:
    b = pw.chromium.launch(); cx = b.new_context(viewport={'width': 1280, 'height': 900}, timezone_id='America/Chicago'); pg = cx.new_page()
    pg.route('**/*', serve)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    if SHOTS: os.makedirs(SHOTS, exist_ok=True)
    pg.goto('http://hstrip.local/index.html?proof=hstrip'); pg.wait_for_timeout(1500)
    R = pg.evaluate(T)
    if SHOTS:
        pg.evaluate("()=>switchTab('offers')"); pg.wait_for_timeout(400)
        pg.locator('#tab-offers').screenshot(path=os.path.join(SHOTS, 'hire_strip_offers.png'))
        pg.evaluate("()=>switchTab('cgbackground')"); pg.wait_for_timeout(400)
        pg.locator('#tab-cgbackground').screenshot(path=os.path.join(SHOTS, 'hire_strip_onboarding.png'))
    pg.set_viewport_size({'width': 390, 'height': 844}); pg.wait_for_timeout(200)
    over = pg.evaluate("()=>{ const s=document.querySelector('.tabpanel.active .hs-strip'); return !s || s.scrollWidth > document.documentElement.clientWidth + 2; }")
    R.append(['PASS' if not over else 'FAIL', 'phone width: the strip wraps, no sideways scroll', over])
    if SHOTS: pg.screenshot(path=os.path.join(SHOTS, 'hire_strip_phone.png'), full_page=False)
    # the Onboarding row, cut out of the engine (its shared data never loads offline): the name opens the profile, Checklist the checklist
    ENG = (ROOT / 'caregivers-engine.js').read_text()
    i = ENG.index('function ckdRowHTML(p){'); j = ENG.index('\n}\n', i) + 3
    row = pg.evaluate('''(code)=>{ const OPEN=[], CK=[], SIDE=[];
      const f = new Function('HP','ckdOpen','CRX', `const bgrEsc=t=>String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;');
        const ckdActsFor=()=>[], ckdWait=()=>({text:'2 days waiting',color:'#000'}), ckdRosterFor=()=>null, ckdRoadHTML=()=>'', ckdOrientHTML=()=>'',
          ckdSteps=()=>[], ckdPill=()=>'', ckdLaneHTML=()=>'', CKD_STOPS=['Step 1','Checks and references'];
        ${code}; return ckdRowHTML;`);
      const fn = f({ open:k=>OPEN.push(JSON.stringify(k)) }, id=>CK.push(id), { openSide:id=>SIDE.push(id) });
      const box = document.createElement('div'); document.body.appendChild(box);
      window.HP = { open:k=>OPEN.push(JSON.stringify(k)) }; window.ckdOpen = id=>CK.push(id); window.CRX = Object.assign(window.CRX||{}, { openSide:id=>SIDE.push(id) });
      box.innerHTML = fn({ name:'Fake Cand', stop:1, c:{ id:77 } }) + fn({ name:'Fake Card', stop:0, j:{ offer_id:'o-9' } });
      const rows = box.querySelectorAll('.ckd-row');
      rows[0].querySelector('.ckd-name').click(); rows[0].querySelector('.ckd-check').click();
      rows[1].querySelector('.ckd-name').click(); rows[1].querySelector('.ckd-check').click();
      box.remove(); return { OPEN, CK, SIDE }; }''', ENG[i:j])
    R.append(['PASS' if row['OPEN'] == ['{"candidate_id":"77"}', '{"offer_id":"o-9"}'] else 'FAIL', 'Onboarding: the name opens their profile (by their record, or by their offer for a readiness card)', row])
    R.append(['PASS' if row['CK'] == [77] and row['SIDE'] == ['o-9'] else 'FAIL', 'Onboarding: Checklist opens the checklist, as the name used to', row])
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

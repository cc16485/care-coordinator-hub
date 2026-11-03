"""Orientation and Onboarding linked (Samantha 2026-11-02: "link the two tabs: show where they are in orientation on the Onboarding
rows, add the badge to the Orientation tab, and add a link between them"). The real Hub page, offline (files served from this
folder), made-up people only; the Onboarding list is two made-up people, nothing is saved, texted, emailed or called.
(python3 tests/browser/orient_onboarding_link_look.py; SHOTS=<dir> also saves screenshots)"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = os.environ.get('SHOTS')
ENG = (ROOT / 'caregivers-engine.js').read_text(); RULES = (ROOT / 'eligibility-rules.js').read_text()
def cut(a, b):
    i = ENG.index(a); j = ENG.index(b, i + 1); return ENG[i:j]
# Onboarding's own code, cut out of caregivers-engine.js as tests/browser/checks_dash_look.py does (the engine itself is a closed
# block that needs the live server); the made-up people are two readiness cards on the orientation step
CODE = RULES + """
const refPolicy = c => CCElig.refPolicy(c), obDeriveStatus = c => CCElig.obDeriveStatus(c), refDecisionCovers = c => CCElig.refDecisionCovers(c);
const bgrEsc = t => String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const fmtD = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '';
const bgrD = d => d ? new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '';
const bgrCheckProofHtml = p => p ? '<a class="proof-link">PDF</a>' : '';
let HYDRATED = true, OFFERS = [], _bgrDrawerKey = null;
let candidates = [];
var caregivers = [{ id:1, first:'Fake', last:'Stuck Person', axiscare_id:'9001', offer_id:'o1' }, { id:2, first:'Fake', last:'Moving Person', offer_id:'o2', badge_mailed_at:'2026-10-30T15:00:00Z' }];
async function saveCandidates(){ return true; } async function ccConfirm(){ return false; } async function saveCaregivers(){ return true; }
function bgrEnsureDrawer(){} function bgrCloseDrawer(){} function lifecycleRows(){ return []; } function bgrReqsFor(){ return []; }
async function offerToCandidate(){ return { ok:true }; } async function bgrSyncRefAnswers(){ return { merged:0, cleared:0, err:'' }; }
function renderOB(){ renderCkd(); } function renderAlerts(){}
""" + cut('function obRefType(v){', 'function obRefTypeLabel(') + cut('function obRefCellTypeLine(c,n){', '/* &t= and &co=') \
  + cut('function obSendDay(iso){', 'function obRefSendRecordLines(') + cut('function obFmtPhone(ph){', 'function obRefCellHTML(') \
  + cut('/* ── CHECKS DASHBOARD (2026-10-21)', 'function renderOB(){')
T = r"""
async(CODE)=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const H=3600e3, D=24*H, ago=ms=>new Date(Date.now()-ms).toISOString();
  const full=n=>({ module:n, scene:9, complete:true, heard:10, first_at:ago(5*D), last_at:ago(5*D), moved_at:ago(5*D) });
  const ROWS=[
    { training_id:'aaaa-1', name:'Fake Stuck Person', axiscare_id:'9001', status_label:'In Training', status:'in_progress', welcome_sent_at:ago(6*D),
      units:[full(1),full(2),full(3),{ module:4, scene:2, complete:false, heard:3, first_at:ago(4*D), last_at:ago(3*D), moved_at:ago(3*D) }] },
    { training_id:'aaaa-2', name:'Fake Moving Person', axiscare_id:'', status_label:'In Training', status:'in_progress', welcome_sent_at:ago(2*D),
      units:[full(1),{ module:2, scene:6, complete:false, heard:7, first_at:ago(3*H), last_at:ago(1*H), moved_at:ago(1*H) }] },
    { training_id:'aaaa-3', name:'Fake Finished', axiscare_id:'9005', status_label:'Active', status:'complete', completed_at:ago(10*D), attested_at:ago(10*D), units:[] } ];
  window.__inv=async()=>({ data:{ ok:true, rows:[] }, error:null });
  (0,eval)("sb=new Proxy(sb||{},{ get:(t,k)=>k==='functions'?{ invoke:(n,o)=>window.__inv(n,o) }:(typeof t[k]==='function'?t[k].bind(t):t[k]) });");
  window.fetch=async(u,o)=>String(u).includes('/functions/v1/hub-training-data')?new Response(JSON.stringify(String(u).includes('orientation_finished')?ROWS.filter(r=>r.status==='complete'):ROWS),{status:200}):new Response('{}',{status:200});
  (0,eval)("trainHubTok=async()=>'t'");
  (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha Troutman' };"); CC_ROLES=['owner_admin']; CC_ROLES_CHECKED=true; CC_ROLE_BY_EMAIL['samantha@mo-care.com']=['owner_admin'];
  DATA.ops_settings=DATA.ops_settings||{};
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; await sleep(300);

  /* the caregiver part of the Hub, as if a caregiver tab already loaded it (its real Onboarding code, made-up people) */
  (0,eval)("scxState='ready'"); window.SCX={};
  const sc=document.createElement('script'); sc.textContent=CODE; document.head.appendChild(sc); await sleep(50);
  window.CRX={ list:()=>[{ offer_id:'o1', name:'Fake Stuck Person', next:{ key:'cg.orientation.done', title:'Finish orientation' } }, { offer_id:'o2', name:'Fake Moving Person', next:{ key:'cg.orientation.done', title:'Finish orientation' } }], open(){} };
  ok('the Onboarding list has the two made-up people on the orientation step', JSON.stringify(ckdOrientWho().map(x=>[x.name,x.ax,x.stop]))==='[["Fake Stuck Person","9001",3],["Fake Moving Person","",3]]', ckdOrientWho());
  switchTab('orientprog');
  await OPR.load(); OPR.mount(); await sleep(150);
  OPR.find('fake'); await sleep(200);   /* the search shows every tab at once (2026-11-02 sub-tabs) */
  const P=document.getElementById('tab-orientprog'), rowOf=n=>[...P.querySelectorAll('.orp-row,.orp-frow')].find(r=>r.innerText.includes(n));
  const f0=rowOf('Fake Finished'); if(f0) f0.querySelector('.orp-nm').click(); await sleep(50);
  const st=rowOf('Fake Stuck Person'), mv=rowOf('Fake Moving Person'), fin=rowOf('Fake Finished');
  ok('Orientation: the stuck one on Onboarding without a badge says Badge not mailed yet', st && /Badge not mailed yet/.test(st.innerText), st&&st.innerText);
  ok('Orientation: the badge mailed Oct 30 shows (matched by name, no AxisCare number)', mv && /Badge mailed Oct 30/.test(mv.innerText), mv&&mv.innerText);
  ok('Orientation: someone not on Onboarding and not on the caregiver list: no badge line, no Onboarding button', fin && !/Badge/.test(fin.innerText) && ![...fin.querySelectorAll('button')].some(b=>b.innerText==='Onboarding'), fin&&fin.innerText);
  const ob=st && [...st.querySelectorAll('button')].find(b=>b.innerText==='Onboarding');
  ok('Orientation: an Onboarding button on the people who are on Onboarding', !!ob && !!mv && [...mv.querySelectorAll('button')].some(b=>b.innerText==='Onboarding'));
  ok('Orientation: no to-do buttons here (no Mailed, no check-in Done)', ![...P.querySelectorAll('button')].some(b=>/^(Mailed|✓ Done|Done)$/.test(b.innerText.trim())));

  if(!ob){ ok('no Onboarding button to click', false, [typeof ckdOrientWho, (()=>{try{return ckdOrientWho()}catch(e){return String(e)}})(), (()=>{try{return caregivers.length}catch(e){return String(e)}})(), st&&st.innerHTML.slice(0,900)]); return R; }
  ob.click(); renderCkd(); await sleep(300);   /* (the real tab draws itself on opening) */
  const O=document.getElementById('ckdDash');
  ok('the Onboarding button opens Onboarding', activeTab==='cgbackground', activeTab);
  ok('...searched to that one person', document.getElementById('ckdSearch') && document.getElementById('ckdSearch').value==='fake stuck person' && O.querySelectorAll('.ckd-row:not(.ckd-row-h)').length===1 && /Fake Stuck Person/.test(O.innerText), O.innerText.slice(0,600));
  const line=O.querySelector('.ckd-orient');
  ok('Onboarding row: where they are in orientation, in red when stuck', line && /Stuck in orientation on Unit 4 of 11/.test(line.innerText) && line.classList.contains('ckd-orient-bad'), line&&line.outerHTML);
  ok('Onboarding row: the badge to-do is still here, with its Mailed button', /Make their employee badge and mail it/.test(O.innerText) && [...O.querySelectorAll('button')].some(b=>b.innerText.trim()==='Mailed'), O.innerText.slice(0,900));
  document.getElementById('ckdSearch').value=''; renderCkd(); await sleep(100);
  const lines=[...O.querySelectorAll('.ckd-orient')].map(x=>x.innerText);
  ok('Onboarding: the moving one shows its unit, not red', lines.some(x=>/^Orientation: Unit 2 of 11/.test(x)) && [...O.querySelectorAll('.ckd-orient')].filter(x=>x.classList.contains('ckd-orient-bad')).length===1, lines);
  [...O.querySelectorAll('.ckd-orient')].find(x=>/Stuck/.test(x.innerText)).click(); await sleep(300);
  const f=document.getElementById('orp-p-aaaa-1');
  ok('the orientation line opens Orientation on that person, marked', activeTab==='orientprog' && f && f.classList.contains('orp-focus'), [activeTab, f&&f.className]);
  return R;
}
"""
MIME = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.json':'application/json', '.webmanifest':'application/json'}
def serve(route):
    url = route.request.url
    if 'supabase.co' in url: return route.abort()
    if not url.startswith('http://orientprog.local/'): return route.continue_()
    p = (ROOT / url.split('http://orientprog.local/', 1)[1].split('?')[0].split('#')[0])
    if not p.is_file(): return route.fulfill(status=404, body='')
    route.fulfill(status=200, body=p.read_bytes(), content_type=MIME.get(p.suffix, 'application/octet-stream'))
with sync_playwright() as pw:
    b = pw.chromium.launch(); cx = b.new_context(viewport={'width': 1280, 'height': 900}, timezone_id='America/Chicago'); pg = cx.new_page()
    pg.route('**/*', serve)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    if SHOTS: os.makedirs(SHOTS, exist_ok=True)
    pg.goto('http://orientprog.local/index.html?proof=orientprog'); pg.wait_for_timeout(1500)
    R = pg.evaluate(T, CODE)
    if SHOTS:
        pg.locator('#tab-orientprog').screenshot(path=os.path.join(SHOTS, 'orientation_linked.png'))
        pg.evaluate("()=>{ switchTab('cgbackground'); renderCkd(); }"); pg.wait_for_timeout(300)
        pg.locator('#ckdDash').screenshot(path=os.path.join(SHOTS, 'onboarding_linked.png'))
        pg.evaluate("()=>switchTab('orientprog')"); pg.wait_for_timeout(200)
    pg.set_viewport_size({'width': 390, 'height': 844}); pg.wait_for_timeout(200)
    over = pg.evaluate("()=>document.getElementById('tab-orientprog').scrollWidth > document.documentElement.clientWidth + 2")
    R.append(['PASS' if not over else 'FAIL', 'phone width: no sideways scroll', over])
    if SHOTS: pg.screenshot(path=os.path.join(SHOTS, 'orientation_linked_phone.png'), full_page=False)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

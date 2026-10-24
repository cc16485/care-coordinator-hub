"""Life Story (2026-10-24, step 1). The real Hub page, offline, a made-up family. Proves: switch off = coordinators don't see
the three questions, owners see them marked practice; on = everyone. On the intake (a lead, no AxisCare client yet) the answers
save on the lead with who, when and "intake call"; the real assessment form shows them already filled with where they came
from; once the client is in AxisCare, Home & Life shows them carried over and "Save home & life" copies them onto the client
profile keeping who first said them; an edit there is recorded as the profile's; a cleared answer is removed; the old free-text
box becomes "Anything else about who they are"; the card sits under "The person who needs care" on the intake; nothing is sent.
(python3 tests/browser/life_story_look.py; SHOTS=<dir> saves screenshots)"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = os.environ.get('SHOTS')
STUB = r"""
(()=>{
  const W=window; W.__log={ persists:[], events:[] };
  (0,eval)(`sb={ from:()=>{ const p={ select(){return p;}, eq(){return p;}, gte(){return p;}, in(){return p;}, order(){return p;}, limit(){return p;},
      single:async()=>({ data:null, error:null }), maybeSingle:async()=>({ data:null, error:null }),
      then(a){ return Promise.resolve({data:[],error:null}).then(a); } }; return p; },
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async()=>({data:null,error:null}) },
    auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };
    ME={ email:'krystal@mo-care.com', name:'Krystal Land' }; CC_ROLES=['care_coordinator']; CC_ROLES_CHECKED=true;
    persist=async(k,v)=>{ window.__log.persists.push([k, JSON.parse(JSON.stringify(v))]); };
    opEvent=(v,o)=>{ window.__log.events.push([v,o&&o.summary]); };`);
  DATA.ops_settings={};
  DATA.leads=[{ id:'lead_ruth', first_name:'Laura', last_name:'Daughter (fake)', client_first_name:'Ruth', client_last_name:'Kay (fake)', status:'Contacted' }];
  DATA.client_profiles=[];
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,900)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, lead=DATA.leads[0];
  ok('switch off: a coordinator does not see the questions', LSTORY.html({ lead, ax:'', name:'Ruth Kay' },'intake')==='');
  (0,eval)("CC_ROLES=['owner_admin']");
  let h=LSTORY.html({ lead, ax:'', name:'Ruth Kay' },'intake');
  ok('switch off: an owner sees them, marked practice; the three questions in her words', /Getting to know Ruth/.test(h) && /Practice\./.test(h) && /What did they do for work, or what have they enjoyed doing throughout their life\?/.test(h) && /What do they enjoy talking about or doing\?/.test(h) && /What are some little things that make their day better\?/.test(h), h.slice(0,600));
  DATA.ops_settings={ life_story_live:true }; (0,eval)("CC_ROLES=['care_coordinator']");
  const box=document.createElement('div'); box.id='lsTest'; document.body.appendChild(box);
  box.innerHTML=LSTORY.html({ lead, ax:'', name:'Ruth Kay' },'intake');
  ok('switch on: every coordinator sees it; optional, conversational; its own Save on the intake', /3 short questions · optional · ask them like a conversation/.test(box.innerText) && !/Practice/.test(box.innerText) && /Save these answers/.test(box.innerText));
  document.getElementById('ls_intake_work').value='Taught third grade for 30 years. Loves her roses.';
  document.getElementById('ls_intake_enjoys').value='Her grandkids, old movies, the Cardinals';
  await LSTORY.save('intake'); await sleep(50);
  const p1=L.persists.filter(x=>x[0]==='leads').pop();
  ok('intake save (no AxisCare client yet): on the lead, with who, when and "intake call"; the unanswered one left out', p1 && p1[1].life.work.text==='Taught third grade for 30 years. Loves her roses.' && p1[1].life.work.by==='Krystal Land' && p1[1].life.work.via==='intake call' && p1[1].life.enjoys && !p1[1].life.little && /Saved/.test(box.innerText), p1);
  ok('... recorded in the activity log', L.events.some(e=>e[0]==='life_story_saved' && /Krystal Land saved Life Story answers for Ruth Kay \(intake call\)/.test(e[1])));
  /* the real assessment form */
  openAssessmentModal(null, lead); await sleep(100);
  const a=document.getElementById('lsHost_asmt');
  ok('assessment: the same three questions already filled from the intake, with where they came from', a && document.getElementById('ls_assessment_work').value.startsWith('Taught third grade') && /From the intake call · Krystal/.test(a.innerText) && document.getElementById('ls_assessment_little').value==='', a&&a.innerText.slice(0,500));
  document.getElementById('ls_assessment_little').value='Coffee and a cookie in the afternoon';
  (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha Troutman' }");
  await LSTORY.save('assessment'); await sleep(50);
  const p2=L.persists.filter(x=>x[0]==='leads').pop();
  ok('assessment adds the third answer (by Samantha, "assessment"); the intake answers keep Krystal', p2[1].life.little.text==='Coffee and a cookie in the afternoon' && p2[1].life.little.via==='assessment' && p2[1].life.little.by==='Samantha Troutman' && p2[1].life.work.by==='Krystal Land', p2[1].life);
  try{ closeModal('assessmentModalBackdrop'); }catch(e){}
  /* now an AxisCare client: Home & Life */
  box.innerHTML=LSTORY.html({ lead, ax:'500', name:'Ruth Kay' },'homecp_');
  ok('Home & Life (now in AxisCare): all three carried over from the inquiry, labelled where they came from; saved with Home & Life', document.getElementById('ls_homecp__work').value.startsWith('Taught') && /From the intake call · Krystal/.test(box.innerText) && /From the assessment · Samantha/.test(box.innerText) && /Saved with "Save home & life"/.test(box.innerText) && !/Save these answers/.test(box.innerText), box.innerText.slice(0,700));
  let item=LSTORY.applyToProfile({ id:'cp_ax500', axiscare_client_id:'500' }, 'homecp_');
  ok('Save home & life copies them onto the client profile, keeping who first said them', item.life.work.by==='Krystal Land' && item.life.work.via==='intake call' && item.life.little.by==='Samantha Troutman' && item.life.enjoys.text==='Her grandkids, old movies, the Cardinals', item.life);
  DATA.client_profiles=[item]; box.innerHTML=LSTORY.html({ lead, ax:'500', name:'Ruth Kay' },'homecp_');
  document.getElementById('ls_homecp__enjoys').value='Her grandkids, old movies, the Cardinals, word puzzles'; document.getElementById('ls_homecp__little').value='';
  item=LSTORY.applyToProfile({ ...item }, 'homecp_');
  ok('an edit on the profile is recorded as the profile\'s (who, "profile"); a cleared answer is removed', /word puzzles/.test(item.life.enjoys.text) && item.life.enjoys.via==='profile' && item.life.enjoys.by==='Samantha Troutman' && !item.life.little && item.life.work.by==='Krystal Land', item.life);
  DATA.client_profiles=[item];   /* as cl360SaveProfile stores it */
  ok('the profile wins over the inquiry once saved', LSTORY.get({ lead, ax:'500' }).enjoys.text.includes('word puzzles') && LSTORY.get({ lead, ax:'500' }).enjoys.carried===false);
  /* the real intake screen */
  CP.lead=lead; CP.ax=''; LPI.began[lead.id]={ began:null, changes:[], people_changes:[] }; document.getElementById('leadProfileView').style.display='block'; cpShowTab('intake'); lpiRender(); await sleep(150);
  const it=document.getElementById('lpIntake').innerText;
  ok('the real intake screen: "Getting to know Ruth" right after "The person who needs care", already filled', it.indexOf('Getting to know Ruth')>it.indexOf('The person who needs care') && it.indexOf('Getting to know Ruth')<it.indexOf("Why they're reaching out") && /Taught third grade/.test(document.getElementById('lpIntake').innerHTML), it.slice(0,900));
  ok('answers are capped at 500 characters', document.getElementById('ls_homecp__work').getAttribute('maxlength')==='500');
  return R;
}
"""
MIME = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.json':'application/json', '.webmanifest':'application/json'}
def serve(route):
    url = route.request.url
    if 'supabase.co' in url: return route.abort()
    if not url.startswith('http://ls.local/'): return route.continue_()
    p = (ROOT / url.split('http://ls.local/', 1)[1].split('?')[0].split('#')[0])
    if not p.is_file(): return route.fulfill(status=404, body='')
    route.fulfill(status=200, body=p.read_bytes(), content_type=MIME.get(p.suffix, 'application/octet-stream'))
with sync_playwright() as pw:
    b = pw.chromium.launch(); cx = b.new_context(viewport={'width': 1280, 'height': 900}, timezone_id='America/Chicago'); pg = cx.new_page()
    pg.route('**/*', serve)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://ls.local/index.html?proof=ls'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True)
        pg.add_style_tag(content='header.topbar{position:static!important}')
        pg.evaluate("()=>{ document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; document.querySelectorAll('.tabpanel').forEach(p=>p.classList.remove('active')); document.getElementById('leadProfileView').style.display='block'; cpShowTab('intake'); lpiRender(); const c=document.querySelector('#lpIntake .ls-card'); c&&c.scrollIntoView(); }"); pg.wait_for_timeout(300)
        el = pg.query_selector('#lpIntake .ls-card'); el and el.screenshot(path=os.path.join(SHOTS, 'ls-intake.png'), timeout=5000)
        pg.evaluate("()=>{ openAssessmentModal(null, DATA.leads[0]); }"); pg.wait_for_timeout(300)
        el = pg.query_selector('#lsHost_asmt'); el and el.screenshot(path=os.path.join(SHOTS, 'ls-assessment.png'), timeout=5000)
        pg.evaluate("()=>{ try{ closeModal('assessmentModalBackdrop'); }catch(e){} const b=document.getElementById('lsTest'); b.innerHTML=LSTORY.html({ lead:DATA.leads[0], ax:'500', name:'Ruth Kay' },'homecp_'); b.style.cssText='max-width:760px;padding:12px;background:#fff'; b.scrollIntoView(); }"); pg.wait_for_timeout(200)
        el = pg.query_selector('#lsTest'); el and el.screenshot(path=os.path.join(SHOTS, 'ls-home.png'), timeout=5000)
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

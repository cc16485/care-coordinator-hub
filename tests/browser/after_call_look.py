"""The call after orientation, no video call (Samantha 2026-11-04, switch after_orientation_call_live): on the Orientation tab
Finish line the call comes FIRST (I-9 on camera, everything checked, app, clients and shifts, Send video link), then Approve to
Work, then Ready for shifts; the readiness card shows the same call before approval; its card lands in Team Work. The real Hub
page, offline, made-up people only; every press is recorded. Nobody is texted, emailed or called.
(python3 tests/browser/after_call_look.py; SHOTS=<dir> also saves screenshots)"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = os.environ.get('SHOTS')
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const H=3600e3, D=24*H, ago=ms=>new Date(Date.now()-ms).toISOString();
  const full=n=>({ module:n, scene:9, complete:true, heard:10, first_at:ago(5*D), last_at:ago(5*D), moved_at:ago(5*D) });
  const done=(name,ax,days)=>({ name, axiscare_id:ax, phone:'41755501'+ax.slice(-2), status_label:'In Training', status:'complete', assigned_at:ago(20*D), welcome_sent_at:ago(20*D),
    completed_at:ago(days*D), attested_at:ago(days*D), certificate_at:ago(days*D), units:[1,2,3,4,5,6,7,8,9,10,11].map(full) });
  const ROWS=[ done('Fake Calling Person','9102',2), done('Fake Just Finished','9101',0.02) ];
  const TK={ i9:'Saw their ID on camera and completed I-9 Section 2 in Viventium', on_file:'Everything on file and complete', questions:'Questions about orientation and the job answered', app:'AxisCare app downloaded and signed in', profile:'Profile complete', shifts:'Talked about clients and shifts to get them started' };
  const AFTER={ ok:true, may_approve_work:true, ticks:TK, switches:{ checkin_live:true, after_call:true, axiscare_live:true }, rows:[
    { axiscare_id:'9102', name:'Fake Calling Person', card:'open', journey_id:'j-call', offer_id:'o-call', active:{ state:'confirmed', at:ago(2*D) }, approved:null, text:null,
      checkin:{ done:false, at:null, opened_at:ago(2*D), ticks:{ i9:true, on_file:true }, test_clock:null, tries:0 }, ready:{ ready_for_final:false, missing:['Call after orientation from a care coordinator'] } },
    { axiscare_id:'9101', name:'Fake Just Finished', card:'open', journey_id:'j-new', offer_id:'o-new', active:null, approved:null, text:null, checkin:null, ready:{ ready_for_final:false, missing:['Call after orientation from a care coordinator'] } } ] };
  const CARD={ ok:true, journey:{ journey_id:'j-call', offer_id:'o-call', client_name:'Fake Calling Person', status:'open' }, steps:[], view:{ rows:[{ key:'a', status:'complete', def:{ title:'A', stage:'s' } }], rail:[] }, events:[], may:{}, facts:{ after_call:true, rights:{ state:'waiting_explanation', signed_at:ago(10*D) } },
    approve:{ ready_for_final:false, approved:false, may_approve_work:true, level_of_care:{ level:'Level 1', source:'the default' }, switches:{ axiscare_live:true, text_live:true, after_call:true }, axiscare:{ state:'pending' }, blocked:[], missing:['Call after orientation from a care coordinator'],
      locked:true, lock_why:'Scheduling stays locked until Approved to Work and AxisCare reads back Active.', call_ticks:TK,
      checkin:{ open:true, done:false, ticks:{ i9:true, on_file:true }, test_clock:null, tries:[] } } };
  const INV=[];
  window.__inv=async(name,o)=>{ const b=(o&&o.body)||{}; INV.push(JSON.parse(JSON.stringify(b)));
    if(name!=='caregiver-journey') return { data:null, error:null };
    if(b.action==='orientation_after') return { data:AFTER, error:null };
    if(b.action==='get') return { data:CARD, error:null };
    if(b.action==='checkin'){ const r=AFTER.rows.find(x=>x.journey_id===b.journey_id); if(b.video_link) return { data:CARD, error:null }; if(b.ticks) Object.assign(r.checkin.ticks,b.ticks); return { data:CARD, error:null }; }
    return { data:{ ok:true }, error:null }; };
  (0,eval)("sb=new Proxy(sb||{},{ get:(t,k)=>k==='functions'?{ invoke:(n,o)=>window.__inv(n,o) }:(typeof t[k]==='function'?t[k].bind(t):t[k]) });");
  window.fetch=async(u,o)=>String(u).includes('/functions/v1/hub-training-data')?new Response(JSON.stringify(ROWS),{status:200}):new Response('{}',{status:200});
  (0,eval)("trainHubTok=async()=>'t'");
  const ALERTS=[], CONFIRMS=[]; window.alert=m=>ALERTS.push(String(m)); (0,eval)("ccConfirm=async m=>{ window.__cf.push(String(m)); return true; }; ccPrompt=async()=>'';"); window.__cf=CONFIRMS;
  (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha Troutman' };"); CC_ROLES=['owner_admin']; CC_ROLES_CHECKED=true; CC_ROLE_BY_EMAIL['samantha@mo-care.com']=['owner_admin'];
  DATA.ops_settings=Object.assign(DATA.ops_settings||{}, { after_orientation_call_live:true });
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; await sleep(300);
  switchTab('orientprog'); await OPR.load(); await sleep(150);
  const P=document.getElementById('tab-orientprog');
  OPR.tab('fin'); await sleep(40);
  const rowOf=n=>[...P.querySelectorAll('.orp-fin')].find(r=>r.innerText.includes(n));
  const r2=rowOf('Fake Calling Person');
  ok('switch on: the call comes first, then Approve to Work, then Ready for shifts', r2 && [...r2.querySelectorAll('.orp-st')].map(x=>x.innerText).join('|')==='Call after orientation|Approve to Work|Ready for shifts', r2 && r2.innerText);
  const boxes=r2?[...r2.querySelectorAll('.orp-tick input[type=checkbox]')]:[];
  ok('the call: six lines, I-9 on camera first and clients and shifts last, two ticked', boxes.length===6 && boxes.filter(b=>b.checked).length===2 && /Saw their ID on camera/.test(r2.querySelector('.orp-tick').innerText) && /Talked about clients and shifts/.test(r2.innerText), r2 && r2.innerText);
  ok('the call says what it covers (ID on video, I-9 in Viventium, clients and shifts)', /Look at their ID on video and complete I-9 Section 2 in Viventium/.test(r2.innerText));
  ok('Approve to Work waits: not ready, the call is named as missing', /Still needs \(1\)/.test(r2.innerText) && /Call after orientation/.test(r2.querySelector('.orp-miss').innerText) && !r2.querySelector('.orp-go[onclick*="approve"]'), r2.innerText);
  const r1=rowOf('Fake Just Finished');
  ok('just finished: the call says it opens within the hour as a Team Work card', r1 && /Opens within the hour of finishing orientation, as a Team Work card for the care coordinators/.test(r1.innerText), r1 && r1.innerText);
  ok('no video call anywhere on the Finish line', !/video call/i.test(P.querySelector('.orp-card').innerText), P.querySelector('.orp-card').innerText.slice(0,300));
  INV.length=0; [...r2.querySelectorAll('button')].find(b=>b.innerText==='Send video link').click(); await sleep(200);
  ok('Send video link: asks first, then one checkin video_link for that card', /video room link/.test(CONFIRMS.at(-1)||'') && INV.some(b=>b.action==='checkin'&&b.video_link===true&&b.journey_id==='j-call'), [CONFIRMS,INV]);
  let rr=rowOf('Fake Calling Person'); const b5=[...rr.querySelectorAll('.orp-tick input[type=checkbox]')][5]; b5.checked=true; b5.dispatchEvent(new Event('change')); await sleep(150);
  ok('ticking clients and shifts saves that one line', INV.some(b=>b.action==='checkin'&&b.ticks&&b.ticks.shifts===true), INV);
  /* the readiness card shows the same call before approval */
  await CRX.open('o-call'); await sleep(250);
  const C=document.getElementById('crBody'), ct=()=>C.innerText;
  ok('readiness card: "Call after orientation" before approval, with the six lines and Send video link', /Call after orientation/.test(ct()) && /Approve to Work waits for this call/.test(ct()) && C.querySelectorAll('input[type=checkbox]').length>=6 && /Send video link/.test(ct()) && /Not ready/.test(ct()), ct().slice(0,800));
  ok('readiness card: no Orientation Video Call wording', !/Orientation Video Call|video call/i.test(ct().replace(/Send video link/g,'')), ct().slice(0,600));
  /* 2026-11-04 the AxisCare Class and attributes lines: the Class is not a checkbox (Check / Set it), the attributes show the interview answers */
  CARD.facts.call={ axiscare_class:'PRN TEAM - CNA', axiscare_id:'9102', attributes:{ dogs:true, smoking:false } };
  CARD.approve.call_ticks=Object.assign({}, TK, { attributes:'Attributes entered in AxisCare (asked anything not asked at the interview)', axclass:'AxisCare Class is right' });
  await CRX.open('o-call'); await sleep(250);
  ok('call card: the AxisCare Class line names PRN TEAM - CNA with Check and Set it, and is not a box a person can tick', /AxisCare Class: PRN TEAM - CNA/.test(ct()) && [...C.querySelectorAll('button')].some(b=>b.innerText==='Set it') && C.querySelectorAll('input[type=checkbox]').length===7, ct().slice(0,900));
  ok('call card: the attributes line shows what to tick and what to leave off (the Not asked list needs the Offers code, not loaded on this page)', /Tick these \(1\)/.test(ct()) && /Dogs/.test(ct()) && /Leave these off \(1\)/.test(ct()) && /Smoking/.test(ct()), ct().slice(700,1700));
  INV.length=0; CONFIRMS.length=0; [...C.querySelectorAll('button')].find(b=>b.innerText==='Set it').click(); await sleep(200);
  ok('Set it asks first, then one checkin class_set for that card', /Set their Class in AxisCare/.test(CONFIRMS.at(-1)||'') && INV.some(b=>b.action==='checkin'&&b.class_set===true&&b.journey_id==='j-call'), [CONFIRMS, INV]);
  INV.length=0; [...C.querySelectorAll('button')].find(b=>b.innerText==='Check').click(); await sleep(200);
  ok('Check reads AxisCare (checkin class_check), nothing written', INV.some(b=>b.action==='checkin'&&b.class_check===true) && !INV.some(b=>b.class_set), INV);
  window.__shotCard=true;
  /* Team Work: the call card is for whoever is free */
  const pl=TW.place({ id:'cj_checkin_j-call', kind:'orientation_call', status:'open', owner:'', opened_by:'caregiver-journey', urgency:'today', due:ago(-D) }, TW.ctx());
  ok('Team Work: the call card (kind orientation_call, no owner) is on the Team Work tab', pl.tab==='team', pl);
  ok('no em dash on the tab', !/—/.test(P.innerText));
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
    pg.goto('http://orientprog.local/index.html?proof=aftercall'); pg.wait_for_timeout(1500)
    R = pg.evaluate(T)
    if SHOTS:
        try: pg.locator('#crBody').screenshot(path=os.path.join(SHOTS, 'after_call_card.png'))
        except Exception: pass
        pg.evaluate("()=>{ try{ CRX.close() }catch(e){} }"); pg.wait_for_timeout(200)
        pg.locator('#tab-orientprog').screenshot(path=os.path.join(SHOTS, 'after_call_finish_line.png'))
    pg.set_viewport_size({'width': 390, 'height': 844}); pg.wait_for_timeout(200)
    over = pg.evaluate("()=>document.getElementById('tab-orientprog').scrollWidth > document.documentElement.clientWidth + 2")
    R.append(['PASS' if not over else 'FAIL', 'phone width: no sideways scroll', over])
    if SHOTS: pg.screenshot(path=os.path.join(SHOTS, 'after_call_phone.png'), full_page=False)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

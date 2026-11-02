"""The Finish line on the Orientation tab (Samantha 2026-11-02: "Approve to Work button, then the check-in call with a profile tick,
then Ready for shifts"). The real Hub page, offline, made-up people only; the Training read and the readiness server are answered
here and every press is recorded. Nobody is texted, emailed or called.
(python3 tests/browser/finish_line_look.py; SHOTS=<dir> also saves screenshots)"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = os.environ.get('SHOTS')
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const H=3600e3, D=24*H, ago=ms=>new Date(Date.now()-ms).toISOString();
  const full=n=>({ module:n, scene:9, complete:true, heard:10, first_at:ago(5*D), last_at:ago(5*D), moved_at:ago(5*D) });
  const done=(name,ax,days,extra)=>Object.assign({ name, axiscare_id:ax, phone:'41755501'+ax.slice(-2), status_label:'In Training', status:'complete', assigned_at:ago(20*D), welcome_sent_at:ago(20*D),
    completed_at:ago(days*D), attested_at:ago(days*D), certificate_at:ago(days*D), units:[1,2,3,4,5,6,7,8,9,10,11].map(full) }, extra||{});
  const ROWS=[ done('Fake Ready Person','9101',2), done('Fake Calling Person','9102',4), done('Fake Not Ready','9103',1), done('Fake All Done','9104',8), done('Fake Older Way','9105',3),
    { name:'Fake Moving Person', axiscare_id:'9106', status:'in_progress', assigned_at:ago(2*D), welcome_sent_at:ago(2*D), units:[full(1),{ module:2, scene:6, complete:false, heard:7, first_at:ago(3*H), last_at:ago(1*H), moved_at:ago(1*H) }] } ];
  const TK={ on_file:'Everything on file and complete', questions:'Questions about orientation and the job answered', app:'AxisCare app downloaded and signed in', profile:'Profile complete' };
  const AFTER={ ok:true, may_approve_work:true, ticks:TK, switches:{ checkin_live:true, axiscare_live:true }, rows:[
    { axiscare_id:'9101', name:'Fake Ready Person', card:'open', journey_id:'j-ready', offer_id:'o-ready', active:{ state:'confirmed', at:ago(2*D), at_orientation:true }, approved:null, text:null, checkin:null, ready:{ ready_for_final:true, missing:[] } },
    { axiscare_id:'9102', name:'Fake Calling Person', card:'active', journey_id:'j-call', offer_id:'o-call', active:{ state:'confirmed', at:ago(3*D) }, approved:{ at:ago(3*D), by:'Samantha Troutman' }, text:{ state:'sent', at:ago(3*D) },
      checkin:{ done:false, at:null, opened_at:ago(3*D), ticks:{ on_file:true, questions:true, app:false, profile:false }, test_clock:null, tries:1 }, ready:null },
    { axiscare_id:'9103', name:'Fake Not Ready', card:'open', journey_id:'j-notready', offer_id:'o-notready', active:{ state:'confirmed', at:ago(1*D) }, approved:null, text:null, checkin:null,
      ready:{ ready_for_final:false, missing:['TB test','Hepatitis B choice'] } },
    { axiscare_id:'9104', name:'Fake All Done', card:'closed', journey_id:'j-done', offer_id:'o-done', active:{ state:'confirmed', at:ago(7*D) }, approved:{ at:ago(7*D), by:'Samantha Troutman' }, text:{ state:'sent', at:ago(7*D) },
      checkin:{ done:true, at:ago(6*D), opened_at:ago(7*D), ticks:{ on_file:true, questions:true, app:true, profile:true }, test_clock:'done', tries:0 }, ready:null } ] };
  const CARD={ ok:true, journey:{ journey_id:'j-ready', offer_id:'o-ready', client_name:'Fake Ready Person', status:'open' }, steps:[], view:{ rows:[{ key:'a', status:'complete', def:{ title:'A', stage:'s' } }], rail:[] }, events:[], may:{},
    approve:{ ready_for_final:true, may_approve_work:true, level_of_care:{ level:'Level 1' }, switches:{ axiscare_live:true, text_live:true }, axiscare:{ state:'pending' } } };
  const INV=[]; let REFUSE='';
  window.__inv=async(name,o)=>{ const b=(o&&o.body)||{}; INV.push(JSON.parse(JSON.stringify(b)));
    if(name!=='caregiver-journey') return { data:null, error:null };
    if(b.action==='orientation_after') return { data:AFTER, error:null };
    if(REFUSE) return { data:{ error:REFUSE }, error:null };
    if(b.action==='get') return { data:CARD, error:null };
    if(b.action==='approve_work'){ const r=AFTER.rows[0]; r.approved={ at:new Date().toISOString(), by:'Samantha Troutman' }; r.ready=null; r.checkin={ done:false, opened_at:new Date().toISOString(), ticks:{}, test_clock:null, tries:0 }; return { data:CARD, error:null }; }
    if(b.action==='checkin'){ const r=AFTER.rows.find(x=>x.journey_id===b.journey_id); if(b.ticks) Object.assign(r.checkin.ticks,b.ticks); if(b.test_clock) r.checkin.test_clock=b.test_clock; if(b.no_answer) r.checkin.tries++;
      if(b.finish){ if(!Object.values(r.checkin.ticks).every(Boolean)||!r.checkin.test_clock) return { data:{ error:'Tick every box and choose test clock-in done or no thanks first. Your ticks are saved; nothing was finished.' }, error:null }; r.checkin.done=true; r.checkin.at=new Date().toISOString(); }
      return { data:{ ok:true }, error:null }; }
    return { data:{ ok:true }, error:null }; };
  (0,eval)("sb=new Proxy(sb||{},{ get:(t,k)=>k==='functions'?{ invoke:(n,o)=>window.__inv(n,o) }:(typeof t[k]==='function'?t[k].bind(t):t[k]) });");
  window.fetch=async(u,o)=>String(u).includes('/functions/v1/hub-training-data')?new Response(JSON.stringify(ROWS),{status:200}):new Response('{}',{status:200});
  (0,eval)("trainHubTok=async()=>'t'");
  const ALERTS=[], CONFIRMS=[]; window.alert=m=>ALERTS.push(String(m)); (0,eval)("ccConfirm=async m=>{ window.__cf.push(String(m)); return true; }; ccPrompt=async()=>'left a voicemail';"); window.__cf=CONFIRMS;
  (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha Troutman' };"); CC_ROLES=['owner_admin']; CC_ROLES_CHECKED=true; CC_ROLE_BY_EMAIL['samantha@mo-care.com']=['owner_admin'];
  DATA.ops_settings=DATA.ops_settings||{};
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; await sleep(300);
  switchTab('orientprog'); await OPR.load(); await sleep(150);
  const P=document.getElementById('tab-orientprog'), t=()=>P.innerText;
  const heads=[...P.querySelectorAll('.orp-card')].map(c=>c.querySelector('h3').innerText);
  ok('the Finish line sits at the top, with the three new hires who finished and are not done', heads[0]==='Finish line (3)' && heads.includes('In orientation (1)') && heads.includes('Finished in the last 60 days (2)'), heads);
  const F=()=>P.querySelector('.orp-card').innerText, rowOf=n=>[...P.querySelectorAll('.orp-fin')].find(r=>r.innerText.includes(n));
  ok('oldest finished first', F().indexOf('Fake Calling Person') < F().indexOf('Fake Ready Person') && F().indexOf('Fake Ready Person') < F().indexOf('Fake Not Ready'), F());
  ok('fully done and the older way stay in Finished, not on the Finish line', !/Fake All Done|Fake Older Way/.test(F()) && /Fake All Done/.test(P.querySelectorAll('.orp-card')[1].innerText+P.querySelectorAll('.orp-card')[2].innerText+t()), heads);
  ok('summary: At the finish line 3', /3\s*At the finish line/.test(P.querySelector('.orp-sum').innerText), P.querySelector('.orp-sum').innerText);
  const r1=rowOf('Fake Ready Person');
  ok('each row shows three steps in order', [...r1.querySelectorAll('.orp-st')].map(x=>x.innerText).join('|')==='Approve to Work|Check-in call|Ready for shifts');
  ok('ready: the green Approve to Work button, with what it does', r1.querySelector('.orp-go') && r1.querySelector('.orp-go').innerText.includes('Approve to Work') && /sets them Active in AxisCare/.test(r1.innerText), r1.innerText);
  ok('ready: the call waits for the approval, and says what the call covers', /After Approve to Work\. Call them to answer questions, make sure the AxisCare app is downloaded and they can sign in, and that their profile is complete/.test(r1.innerText));
  const r3=rowOf('Fake Not Ready');
  ok('not ready: no button, what is missing by name, the readiness card one click away', !r3.querySelector('.orp-go') && /Not ready yet: still needs TB test, Hepatitis B choice/.test(r3.innerText) && [...r3.querySelectorAll('button')].some(b=>b.innerText==='Readiness card'), r3.innerText);
  const r2=rowOf('Fake Calling Person');
  ok('approved: step 1 done with who and when', /Approved [A-Z][a-z]{2} \d+.* by Samantha Troutman/.test(r2.innerText) && r2.querySelector('.orp-step.done'), r2.innerText);
  const boxes=[...r2.querySelectorAll('.orp-tick input[type=checkbox]')];
  ok('the call: four ticks with profile complete, two already ticked, the try count', boxes.length===4 && boxes.filter(b=>b.checked).length===2 && /Profile complete/.test(r2.innerText) && /Tried 1 time with no answer/.test(r2.innerText), r2.innerText);
  ok('the call: a Call button through the office line, Call done and No answer', [...r2.querySelectorAll('a.ibtn')].some(a=>a.innerText==='Call'&&!String(a.getAttribute('href')||'').startsWith('tel:')) && /Call done/.test(r2.innerText) && /No answer/.test(r2.innerText));
  ok('Ready for shifts waits while the call is open', /Shift texts wait until the steps above are done/.test(r2.innerText));

  /* the presses */
  INV.length=0; r2.querySelector('button.orp-go').click(); await sleep(150);
  ok('Call done with boxes missing: the server refusal is shown, nothing hidden', ALERTS.some(a=>/Tick every box/.test(a)) && INV.some(b=>b.action==='checkin'&&b.finish===true&&b.journey_id==='j-call'), [ALERTS,INV]);
  let rr=rowOf('Fake Calling Person'); let bx=[...rr.querySelectorAll('.orp-tick input[type=checkbox]')];
  bx[3].checked=true; bx[3].dispatchEvent(new Event('change')); await sleep(120);
  ok('ticking Profile complete saves that one tick on the card', INV.some(b=>b.action==='checkin'&&b.journey_id==='j-call'&&b.ticks&&b.ticks.profile===true), INV);
  rr=rowOf('Fake Calling Person'); bx=[...rr.querySelectorAll('.orp-tick input[type=checkbox]')]; bx[2].checked=true; bx[2].dispatchEvent(new Event('change')); await sleep(120);
  rr=rowOf('Fake Calling Person'); const rad=rr.querySelector('input[type=radio]'); rad.checked=true; rad.dispatchEvent(new Event('change')); await sleep(120);
  ok('the test clock-in choice saves', INV.some(b=>b.action==='checkin'&&b.test_clock==='done'), INV);
  rr=rowOf('Fake Calling Person'); [...rr.querySelectorAll('button')].find(b=>b.innerText==='No answer').click(); await sleep(150);
  ok('No answer saves a try with the note', INV.some(b=>b.action==='checkin'&&b.no_answer===true&&b.note==='left a voicemail'), INV);
  rr=rowOf('Fake Calling Person'); rr.querySelector('button.orp-go').click(); await sleep(150);
  ok('every box ticked: Call done finishes, and they leave the Finish line for Finished', !rowOf('Fake Calling Person') && /Finish line \(2\)/.test(t()) && /Fake Calling Person/.test(t()), t().slice(0,500));

  INV.length=0; rowOf('Fake Ready Person').querySelector('button.orp-go').click(); await sleep(250);
  ok('Approve to Work: the card is read fresh, the same confirm as the card, then approve_work for that card', INV.map(b=>b.action).filter(a=>a!=='list').join()==='get,approve_work,orientation_after' && INV[1].journey_id==='j-ready' && /Approve Fake Ready Person to work\?/.test(CONFIRMS[0]||''), [INV,CONFIRMS]);
  const ra=rowOf('Fake Ready Person');
  ok('after approving: step 1 done, the call ticks are open', ra && /Approved [A-Z][a-z]{2} \d+.* by Samantha Troutman/.test(ra.innerText) && ra.querySelectorAll('.orp-tick input[type=checkbox]').length===4, ra&&ra.innerText);

  /* not on the Approve to Work list */
  AFTER.may_approve_work=false; AFTER.rows.push(Object.assign(JSON.parse(JSON.stringify(AFTER.rows[2])),{ axiscare_id:'9105', name:'Fake Older Way', journey_id:'j-x', offer_id:'o-x', ready:{ ready_for_final:true, missing:[] } }));
  await OPR.load(); await sleep(100);
  const rx=rowOf('Fake Older Way');
  ok('someone not on the Approve to Work list: no button, says who may', rx && !rx.querySelector('.orp-go') && /Waiting for a person on the Approve to Work list\./.test(rx.innerText), rx&&rx.innerText);
  AFTER.switches.checkin_live=false; AFTER.rows[0].checkin=null; AFTER.rows[0].approved={ at:ago(H), by:'Samantha Troutman' };
  await OPR.load(); await sleep(100);
  ok('check-in switch off: approved and Active counts as ready for shifts (they leave the Finish line)', !rowOf('Fake Ready Person'), t().slice(0,400));
  ok('no em dash on the tab', !/—/.test(t()));
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
    pg.goto('http://orientprog.local/index.html?proof=finishline'); pg.wait_for_timeout(1500)
    R = pg.evaluate(T)
    if SHOTS: pg.locator('#tab-orientprog').screenshot(path=os.path.join(SHOTS, 'finish_line.png'))
    pg.set_viewport_size({'width': 390, 'height': 844}); pg.wait_for_timeout(200)
    over = pg.evaluate("()=>document.getElementById('tab-orientprog').scrollWidth > document.documentElement.clientWidth + 2")
    R.append(['PASS' if not over else 'FAIL', 'phone width: no sideways scroll', over])
    if SHOTS: pg.screenshot(path=os.path.join(SHOTS, 'finish_line_phone.png'), full_page=False)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

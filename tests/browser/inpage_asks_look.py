"""2026-10-15 · The candidate pool, Send the application, the Cancel fallback and the office orientation booking ask on the
page (apAsk), not with confirm()/prompt()/alert(). Chrome can switch those pop-ups off for cc.mo-care.com, and then the
button did nothing and said nothing. Offline, made-up people, every server answer faked, and confirm/prompt/alert all
say no, the way a switched-off browser does. (python3 tests/browser/inpage_asks_look.py)
HUB_URL defaults to http://localhost:8765; point it at your own copy if that port serves another folder."""
import os, re
from playwright.sync_api import sync_playwright
ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
H = open(os.environ.get('HUB_HARNESS', '/Users/samantha/Claude/Projects/cc-hub-live/.claude/g1a_harness.js')).read()
URL = os.environ.get('HUB_URL', 'http://localhost:8765')
ENG = open(os.path.join(ROOT, 'caregivers-engine.js')).read()
a = ENG.index('async function bookOfficeOrientation('); BOOK = ENG[a:ENG.index('let _notHireId=null;', a)]

T = r"""
async(BOOK)=>{
  const R=[], ok=(n,c,d)=>(console.log('STEP '+(c?'PASS ':'FAIL ')+n+' '+(c?'':JSON.stringify(d===undefined?'':d).slice(0,300))),R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)])); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  window.__DLG=0; window.confirm=()=>{ window.__DLG++; return false; }; window.prompt=()=>{ window.__DLG++; return null; }; window.alert=()=>{ window.__DLG++; };
  window.__UP=[]; window.__RPC=[]; window.__DEC=[];
  const ask=()=>document.querySelector('.ap-ask'), txt=()=>(ask()||{}).innerText||'';
  (0,eval)(`AP_ROWS=[{ id:'p1', first_name:'Pat', last_name:'Pool', status:'reviewing', job_type:'Part time', city:'Nixa' }];
    AP_BOOK={ p1:{ status:'booked', starts_at: new Date(Date.now()+864e5).toISOString() } };
    apLoad=async()=>{}; apDecisionOffer=async(id,o)=>{ window.__DEC.push([id,o]); };
    sb.from=()=>({ update:(p)=>{ window.__UP.push(p); const q={ eq:()=>q, then:(f)=>f({ error:null }) }; return q; } });
    sb.rpc=async(fn,a)=>{ window.__RPC.push([fn,a]); return { data:{ cancelled:true }, error:null }; };`);

  /* 1. candidate pool from the list: one in-page ask, all three boxes, filled from their application */
  let pr=apToPool('p1'); await sleep(80);
  ok('Candidate pool asks on the page with all three questions', ask() && /Put Pat Pool in the candidate pool/.test(txt())
    && /What are they holding out for\?/.test(txt()) && /Which area do they need it in\?/.test(txt()) && /Anything to remember about them\?/.test(txt())
    && ask().querySelectorAll('textarea').length===3, txt());
  const tas=ask().querySelectorAll('textarea');
  ok('...filled from their application (Part time, Nixa)', tas[0].value==='Part time' && tas[1].value==='Nixa', [tas[0].value, tas[1].value]);
  ask().querySelector('.ap-ask-back').click(); await pr;
  ok('...Back changes nothing', !window.__UP.length && !ask());
  pr=apToPool('p1'); await sleep(80);
  ask().querySelectorAll('textarea')[0].value='Weekends'; ask().querySelectorAll('textarea')[2].value='Great with dementia';
  ask().querySelector('.ap-ask-ok').click(); await pr; await sleep(50);
  const u=window.__UP[0]||{};
  ok('...Put in the pool saves status pool with what was typed', u.status==='pool' && u.pool_wants==='Weekends' && u.pool_area==='Nixa' && u.pool_note==='Great with dementia', u);
  ok('...and offers the decision message', window.__DEC.some(d=>d[0]==='p1' && d[1]==='pool'), window.__DEC);
  window.__UP=[];
  pr=apToPool('nobody'); await sleep(50);
  ok('not on the list: says so on the page', /Could not find this application/.test(txt()), txt());
  ask().querySelector('.ap-ask-ok').click(); await pr;

  /* 2. candidate pool from the interview outcome */
  document.getElementById('apIntId').value='p1'; window.__apInt={};
  const nb=document.createElement('button'); pr=apOutcome('pool', nb); await sleep(80);
  ok('an outcome before the family reflection says Not yet on the page', /Not yet/.test(txt()) && /Answer the reflection first/.test(txt()), txt());
  ask().querySelector('.ap-ask-ok').click(); await pr;
  const keepObs=window.OBS; window.OBS={ missing:()=>'', clean:o=>o };
  pr=apOutcome('pool', nb); await sleep(80);
  ok('interview outcome Candidate pool asks the same way on the page', /Put Pat Pool in the candidate pool/.test(txt()), txt());
  ask().querySelector('.ap-ask-ok').click(); await pr; await sleep(50);
  ok('...and saves it (interview closed too)', window.__UP.some(p=>p.status==='pool') && window.__UP.some(p=>p.status==='attended'), window.__UP);
  window.__UP=[];
  pr=apOutcome('declined', nb); await sleep(80);
  ok('Not hiring asks why on the page', /Why are we not hiring Pat\?/.test(txt()) && !!ask().querySelector('textarea'), txt());
  ask().querySelector('.ap-ask-back').click(); await pr;
  ok('...Back saves nothing', !window.__UP.length);
  window.OBS=keepObs;

  /* 3. Send the application */
  (0,eval)(`apInvBody=()=>({ action:'send', first_name:'Sam' }); AP_INV_OK=JSON.stringify({ action:'preview', first_name:'Sam' });
    window.__INV=[]; apInvCall=async(b)=>{ window.__INV.push(b); return { ok:true, texted:true, emailed:false, not_sent:['email: no address'] }; };
    apInvClose=()=>{}; apInvLoad=()=>{};`);
  const sbtn=document.createElement('button'); pr=apInvSend(sbtn); await sleep(80);
  ok('Send the application asks on the page: Send the application to Sam now?', /Send the application to Sam now\?/.test(txt()) && /Send/.test(txt()) && /Back/.test(txt()), txt());
  ask().querySelector('.ap-ask-back').click(); await pr;
  ok('...Back sends nothing', !window.__INV.length);
  pr=apInvSend(sbtn); await sleep(80); ask().querySelector('.ap-ask-ok').click(); await sleep(120);
  ok('...Send sends, and says what went on the page', window.__INV.length===1 && /Sent by text\./.test(txt()) && /Not sent: email: no address/.test(txt()), [window.__INV, txt()]);
  ask().querySelector('.ap-ask-ok').click(); await pr;

  /* 4. the Cancel fallback (only when the who-is-cancelling sheet is not loaded) */
  const keep=window.ApText; window.ApText=undefined;
  pr=apCancelBooking('p1'); await sleep(80);
  ok('Cancel (fallback) asks on the page with a why box', /Cancel Pat Pool's interview, .+\?/.test(txt()) && !!ask().querySelector('textarea') && /Cancel the interview/.test(txt()), txt());
  ask().querySelector('.ap-ask-back').click(); await pr;
  ok('...Back cancels nothing', !window.__RPC.some(r=>r[0]==='interview_cancel'));
  pr=apCancelBooking('p1'); await sleep(80); ask().querySelector('textarea').value='found other work'; ask().querySelector('.ap-ask-ok').click(); await pr;
  ok('...Cancel the interview cancels with the reason', window.__RPC.some(r=>r[0]==='interview_cancel' && r[1].p_reason==='found other work' && r[1].p_by==='office'), window.__RPC);
  window.ApText=keep;

  /* 5. office orientation booking (the real function, cut from caregivers-engine.js) */
  document.body.insertAdjacentHTML('beforeend','<input id="inv-manual-date"><input id="inv-manual-time">');
  const fut=new Date(Date.now()+3*864e5).toISOString().slice(0,10);
  (0,eval)(`var candidates=[{ id:'c1', first:'Olivia', last:'Orient', phone:'4175550100' }], invitingId='c1', orientSessions=[], orientId=1;
    window.__SMS=[]; window.__SAVED=0;
    var localDay=d=>d.toISOString().slice(0,10), safeIsTmp=()=>false, officeOrientWhen=s=>s.date+' at '+s.time,
      officeOrientConfirmText=(f,d,t)=>'Hi '+f+', you are booked for orientation '+d+' at '+t+'.', wcWho=async()=>'Test',
      getOrientConfig=()=>({}), saveOrientStore=()=>{}, gcalCreateEvent=async()=>null, closeModal=()=>{}, renderOB=()=>{},
      renderOrientations=()=>{}, renderAlerts=()=>{}, saveCandidates=async()=>{ window.__SAVED++; return true; },
      sendCandidateSMS=async(o)=>{ window.__SMS.push(o); },
      officeOrientBookingFor=(c,ss)=>{ for(const s of ss){ const i=(s.bookings||[]).findIndex(b=>b.candidate_id===c.id); if(i>=0) return { session:s, idx:i }; } return null; },
      officeOrientSlot=(ss,d,t,mk)=>{ const s=mk(d,t); ss.push(s); return { session:s, created:true }; };`);
  (0,eval)(BOOK);
  pr=bookOfficeOrientation(false); await sleep(50);
  ok('Book with no date says so on the page', /Type the date and the time of the orientation first/.test(txt()), txt());
  ask().querySelector('.ap-ask-ok').click(); await pr;
  document.getElementById('inv-manual-date').value=fut; document.getElementById('inv-manual-time').value='10:00';
  pr=bookOfficeOrientation(true); await sleep(50);
  ok('Book and text asks on the page, showing the text', /Book Olivia Orient for .+ and text them now\?/.test(txt()) && /Hi Olivia/.test(txt()) && /Book and text/.test(txt()), txt());
  ask().querySelector('.ap-ask-back').click(); await pr;
  ok('...Back books nothing and texts nothing', !orientSessions.length && !window.__SMS.length && !window.__SAVED);
  pr=bookOfficeOrientation(true); await sleep(50); ask().querySelector('.ap-ask-ok').click(); await sleep(120);
  ok('...Book and text books, texts, and says so on the page', orientSessions.length===1 && window.__SMS.length===1 && /Olivia Orient is booked for the office orientation/.test(txt()) && /They were texted the details/.test(txt()), [orientSessions.length, window.__SMS, txt()]);
  ask().querySelector('.ap-ask-ok').click(); await pr;
  document.getElementById('inv-manual-time').value='14:00';
  pr=bookOfficeOrientation(false); await sleep(50);
  ok('already booked: asks on the page to move them', /already booked for .+10:00/.test(txt()) && /Move them to .+14:00\?/.test(txt()) && /Move them/.test(txt()), txt());
  ask().querySelector('.ap-ask-back').click(); await pr;
  ok('...Back moves nothing', orientSessions.length===1 && orientSessions[0].bookings.length===1);

  ok('no em dashes in any of these asks', !/—/.test(BOOK.match(/(say|ask)\([^;]*/g).join('') ));
  ok('no browser pop-up used anywhere', window.__DLG===0, window.__DLG);
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page()
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200])); pg.on('console', lambda m: m.text.startswith('STEP') and print(m.text, flush=True))
    pg.goto(URL + '/index.html?proof=inpageasks'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', H)
    R = pg.evaluate(T, BOOK); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
src = open(os.path.join(ROOT, 'index.html')).read() + open(os.path.join(ROOT, 'phone-mode.js')).read()
R.append(['PASS' if 'await apPoolPrompts(' in open(os.path.join(ROOT, 'phone-mode.js')).read() else 'FAIL', 'phone: interview Candidate pool waits for the in-page ask', ''])
R.append(['PASS' if not re.search(r"confirm\('Send the application", src) else 'FAIL', 'Send the application: no confirm() left (Hub and phone)', ''])
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

"""Assessments on the calendar (Samantha, 2026-10-07: "fix the assessments on the calendar"; her call: add a visit time).
The real page, offline, made-up assessments; the database is faked and every calendar write is recorded; nothing is
sent. (python3 tests/browser/assessment_calendar_look.py)"""
from playwright.sync_api import sync_playwright
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,900)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const chiDay=n=>new Date(Date.now()+n*864e5).toLocaleDateString('en-CA',{timeZone:'America/Chicago'});
  const d1=chiDay(1), d2=chiDay(2);
  const words=(ymd,t)=>{ const d=new Date(ymd+'T12:00:00Z'); return d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric',timeZone:'UTC'})+' '+t; };
  const asChi=iso=>new Date(iso).toLocaleString('en-US',{timeZone:'America/Chicago',month:'2-digit',day:'2-digit',hour:'numeric',minute:'2-digit'});
  window.__UP=[]; window.__DEL=[]; window.__FAILGHL=false;
  /* GoHighLevel already blocks Mr. Bell's 10:00am tomorrow (assessment-intake) */
  const tenAm=(()=>{ const guess=Date.parse(d1+'T10:00:00Z'); const c=new Date(guess).toLocaleString('sv-SE',{timeZone:'America/Chicago'}).replace(' ','T')+'Z'; return new Date(guess+(guess-Date.parse(c))).toISOString(); })();
  const busy={ ghl_assessment:[{ starts_at:tenAm }], assessment:[{ id:91, source_id:'A1' },{ id:95, source_id:'A5' }] };
  (0,eval)(`sb.from=(t)=>{ const f={}; const b={ select(){return b;}, order(){return b;}, gte(){return b;},
      eq(c,v){ f[c]=v; return b; }, in(c,v){ f.in=[c,v]; return b; },
      upsert(rows){ window.__UP.push(...rows); return Promise.resolve({error:null}); },
      delete(){ return { in:(c,v)=>{ window.__DEL.push(...v); return Promise.resolve({error:null}); } }; },
      then(o){ let d=[];
        if(t==='coordinators') d=[{ id:'H1', name:'Krystal Test' }];
        if(t==='coordinator_busy'){ if(f.source==='ghl_assessment'&&window.__FAILGHL) return Promise.resolve({data:null,error:{message:'down'}}).then(o); d=(window.__BUSY[f.source]||[]); }
        return Promise.resolve({data:d,error:null}).then(o); } }; return b; };`);
  window.__BUSY=busy;
  (0,eval)("IV_HOSTS=[];");
  DATA.leads=[{ id:'L2', first_name:'Ann', last_name:'Bell', client_first_name:'Martin', client_last_name:'Bell', status:'Assessment Scheduled', assessment_at:words(d1,'10:00 AM') },
              { id:'L6', first_name:'Joe', last_name:'Ray', status:'Assessment Scheduled', assessment_at:words(d2,'9:00 AM') }];
  DATA.care_assessments=[
    { id:'A1', client_name:'Joan Ross', visit_date:d1, visit_time:'14:00', status:'Scheduled', coordinator:'Krystal Test' },
    { id:'A2', client_name:'Martin Bell', lead_id:'L2', visit_date:d1, status:'Scheduled', coordinator:'Krystal Test' },
    { id:'A3', client_name:'No Time', visit_date:d1, status:'Scheduled', coordinator:'Krystal Test' },
    { id:'A4', client_name:'Done One', visit_date:d1, visit_time:'09:00', status:'Completed — Awaiting Plan' },
    { id:'A5', client_name:'Cancelled One', visit_date:d1, visit_time:'11:00', status:'Cancelled' },
    { id:'A6', client_name:'Joe Ray', lead_id:'L6', visit_date:d2, status:'Scheduled', coordinator:'Someone Else' } ];
  DATA.orient_sessions=[]; DATA.consult_bookings=[];
  await busySync(); await sleep(50);
  const up=window.__UP.filter(r=>r.source==='assessment'), by=id=>up.find(r=>r.source_id===id);
  ok('a scheduled assessment with a visit time blocks its coordinator 90 minutes, in Chicago time', by('A1') && by('A1').coordinator_id==='H1' && asChi(by('A1').starts_at).endsWith('2:00 PM') && asChi(by('A1').ends_at).endsWith('3:30 PM'), [by('A1'), by('A1')&&asChi(by('A1').starts_at)]);
  ok('one GoHighLevel already blocks at the same time is not doubled', !by('A2'), up);
  ok('no time anywhere: no block (nothing to place it at)', !by('A3'));
  ok('done or cancelled: no block', !by('A4') && !by('A5'));
  ok('no visit time but GoHighLevel booked a time that day: it uses that time (9:00am); a coordinator who doesn\'t interview blocks everybody, as before', by('A6') && by('A6').coordinator_id===null && asChi(by('A6').starts_at).endsWith('9:00 AM'), [by('A6'), by('A6')&&asChi(by('A6').starts_at)]);
  ok('the old block of the cancelled one is removed; the still-booked one is kept', JSON.stringify(window.__DEL)==='[95]', window.__DEL);
  ok('labels say who is going', by('A1').label==='Care assessment: Krystal Test', by('A1').label);
  window.__UP=[]; window.__DEL=[]; window.__FAILGHL=true; await busySync(); await sleep(50);
  ok('if GoHighLevel\'s blocks can\'t be read, nothing is removed (better to over-block than lose a block)', window.__DEL.length===0, window.__DEL);
  window.__FAILGHL=false;
  /* the shared rule for Today and the Morning Brief */
  const tod=btAssessmentsOn(d1, DATA.care_assessments, DATA.leads), j=tod.find(x=>x.name==='Joan Ross');
  ok('Today: the visit time is the assessment\'s time (2:00pm)', j && j.min===14*60, tod);
  /* the form */
  openAssessmentModal('A2'); await sleep(50);
  ok('the form has a visit time; an older assessment shows GoHighLevel\'s booked time', document.getElementById('assess_visit_time').value==='10:00' && document.getElementById('assess_visit_date').value===d1);
  window.__P=[]; window.persist=async(k,v)=>{ window.__P.push([k, JSON.parse(JSON.stringify(v))]); }; window.__BS=0; const realBS=window.busySync; window.busySync=async()=>{ window.__BS++; };
  document.getElementById('assess_visit_time').value='10:30';
  try{ await saveAssessment(); }catch(e){ R.push(['FAIL','save threw',String(e)]); }
  await sleep(50);
  const sv=(window.__P.find(x=>x[0]==='care_assessments')||[])[1];
  ok('saving keeps the visit time on the record, and the calendar updates straight away', sv && sv.visit_time==='10:30' && window.__BS===1, [sv, window.__BS]);
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1360, 'height': 900})
    pg.route('**/*', lambda r: r.abort() if ('supabase.co' in r.request.url or 'hub.mo-care.com' in r.request.url or 'leadconnectorhq' in r.request.url) else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=asmtcal'); pg.wait_for_timeout(1300)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

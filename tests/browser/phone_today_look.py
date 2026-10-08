"""CC Office on the phone, screen 3 (Today), 2026-10-07. index.html?m=1 at phone size, offline, made-up day; every
Supabase answer is faked and every save recorded; nothing reaches the database and nothing is sent.
(python3 tests/browser/phone_today_look.py)"""
from playwright.sync_api import sync_playwright
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,800)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const day=btChiToday(), tom=new Date(Date.parse(day+'T12:00:00Z')+864e5).toISOString().slice(0,10);
  /* Chicago wall-clock HH:MM today as a real instant (offset worked out, so it is right in any season) */
  const at=(d,hmm)=>{ const guess=Date.parse(d+'T'+hmm+':00Z'); const c=new Date(guess).toLocaleString('sv-SE',{timeZone:'America/Chicago'}).replace(' ','T')+'Z'; return new Date(guess+(guess-Date.parse(c))).toISOString(); };
  const ME_E='krystal@mo-care.com';
  window.__STORE={
    ops_items:[{ id:'ops_cov_V1', kind:'coverage', coverage_case_id:'V1', status:'open', title:'Uncovered shift: Joan Ross', urgency:'high', created_at:at(day,'07:00') },
               { id:'ops_asmt_L1', kind:'request', status:'open', title:'Assessment prep: Martin Bell', created_at:at(day,'06:00'), due:at(day,'08:00') }],
    coverage_cases:[{ id:'V1', client:'Joan Ross', status:'open', kind:'calloff', shift_date:day, shift_time:'18:00-22:00', calling_off:'Dee Miller',
                      asked:[{ name:'Joyce Q', state:'yes', at:at(day,'08:10') },{ name:'Al P', state:'no', at:at(day,'08:11') }] },
                    { id:'V2', client:'Tomorrow Person', status:'open', kind:'calloff', shift_date:tom, shift_time:'09:00-12:00' }],
    timekeeper_cases:[{ id:'K1', caregiver:'Tasha R.', client_first:'Joan', shift_date:day, shift_time:'09:00-13:00', minutes_late:12, office_alerted_at:at(day,'09:10') }],
    leads:null };
  const TBL={
    interview_bookings:[{ id:'B1', applicant_id:'AP1', starts_at:at(day,'10:00'), status:'booked' },{ id:'B0', applicant_id:'AP0', starts_at:at(day,'08:30'), status:'attended' },
                        { id:'B9', applicant_id:'AP9', starts_at:at(tom,'10:00'), status:'booked' }],
    job_applicants:[{ id:'AP1', first_name:'Marcus', last_name:'Hill', phone:'4175550177' },{ id:'AP0', first_name:'Ava', last_name:'Early', phone:'4175550178' },{ id:'AP9', first_name:'Tom', last_name:'Morrow' }],
    welcome_calls:[{ id:'W1', first_name:'Rita', last_name:'New', phone:'4175550191', starts_at:at(day,'15:00'), status:'booked' }] };
  window.__W=[]; window.__FAILIV=false;
  const clone=x=>JSON.parse(JSON.stringify(x));
  sb.from=(t)=>{ const f=[]; let key=null; const b={ select(){return b;}, order(){return b;}, limit(){return b;},
      eq(c,v){ if(t==='app_data'&&c==='key') key=v; else f.push(['eq',c,v]); return b; }, in(c,v){ f.push(['in',c,v]); return b; },
      gte(c,v){ f.push(['gte',c,v]); return b; }, lt(c,v){ f.push(['lt',c,v]); return b; },
      insert(){ window.__W.push('insert:'+t); return Promise.resolve({error:null}); },
      maybeSingle(){ return Promise.resolve(t==='app_data'?{data:{data:clone(window.__STORE[key]||[])},error:null}:{data:null,error:null}); }, single(){ return b.maybeSingle(); },
      then(okf){ if(t==='interview_bookings'&&window.__FAILIV) return Promise.resolve({data:null,error:{message:'timeout'}}).then(okf);
        let d=clone(TBL[t]||[]); f.forEach(([op,c,v])=>{ d=d.filter(x=> op==='eq'?String(x[c])===String(v) : op==='in'?v.map(String).includes(String(x[c])) : op==='gte'?String(x[c])>=v : String(x[c])<v); });
        return Promise.resolve({data:d,error:null}).then(okf); } }; return b; };
  sb.rpc=async(fn,a)=>{ window.__W.push('rpc:'+fn); if(fn==='upsert_app_data_item'){ const L=window.__STORE[a.target_key]; const i=L.findIndex(x=>x.id===a.item.id); if(i>-1) L[i]=clone(a.item); } return {data:null,error:null}; };
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Test', shift:'day' };");
  DATA.coordinator_staff=[{ email:ME_E, name:'Krystal Test' }]; DATA.ops_items=clone(window.__STORE.ops_items);
  DATA.leads=[{ id:'L1', first_name:'Ann', last_name:'Bell', phone:'4175550155', client_first_name:'Martin', client_last_name:'Bell', client_address:'12 Elm St, Nixa', status:'Assessment Scheduled', assessment_at:day+'T13:30:00', created_at:at(day,'06:00') }];
  DATA.care_assessments=[]; DATA.ops_settings={ afternoon_interviews:{ from:'14:00', name:'Samantha' } };
  DATA.orient_sessions=[{ id:'O1', date:day, time:'16:00', bookings:[{ first:'A' },{ first:'B' },{ first:'C', attend_status:'canceled' }] }];
  phStart(); await sleep(80);
  ok('three tabs: Needs me now, Find a person, Today', [...document.querySelectorAll('.ph-tabs button')].map(b=>b.innerText).join('|')==='Needs me now|Find a person|Today');
  document.querySelector('.ph-tabs [data-v="today"]').click(); await sleep(400);
  const body=()=>document.getElementById('phTodayBody'), cards=()=>[...body().querySelectorAll('.ph-tl')].map(x=>x.querySelector('.ph-tm').innerText+' '+x.querySelector('.ph-k').textContent+': '+x.querySelector('.ph-t').innerText);
  ok('Today: the title changes and today\'s date heads the list', /Today/.test(document.getElementById('phTitle').innerText) && body().querySelector('.ph-lane'), body().innerText.slice(0,200));
  const c=cards();
  ok('one timeline in time order: interview done 8:30, missed clock-in 9:00, interview 10:00, assessment 1:30 (GoHighLevel\'s time), welcome call 3:00, orientation 4:00, open shift 6:00', JSON.stringify(c)===JSON.stringify(['8:30am Interview: Ava Early','9:00am No clock-in yet: Tasha R.','10:00am Interview: Marcus Hill','1:30pm Assessment: Martin Bell','3:00pm Welcome call: Rita New','4:00pm Orientation: Orientation session','6:00pm Open shift: Joan Ross']), c);
  ok('...nothing from tomorrow', !/Tomorrow Person|Tom Morrow/.test(body().innerText));
  ok('a NOW line sits between what is past and what is next', !!body().querySelector('.ph-now'));
  const card=(k)=>[...body().querySelectorAll('.ph-tl')].find(x=>x.querySelector('.ph-k').innerText===k && true);
  const os=card('OPEN SHIFT') || [...body().querySelectorAll('.ph-tl')].find(x=>/Open shift/i.test(x.querySelector('.ph-k').innerText));
  ok('open shift: who called off and how the asking went (the Staffing view\'s own words), nobody has it, Take it, and Open in the Hub on the case', /6:00pm-10:00pm/.test(os.innerText) && /Dee called off/.test(os.innerText) && /Joyce said yes/.test(os.innerText) && /Nobody has it/.test(os.innerText) && os.querySelector('[data-pt="take"]') && os.querySelector('a[href="index.html#cara/case/V1"]'), os.innerText);
  const iv=[...body().querySelectorAll('.ph-tl')].find(x=>/Marcus/.test(x.innerText));
  ok('interview: Call the applicant from the office line, Open in the Hub on them', iv.querySelector('a[data-oc-phone="4175550177"]') && iv.querySelector('a[href="index.html#ap/AP1"]'), iv.innerHTML.slice(0,400));
  const asm=[...body().querySelectorAll('.ph-tl')].find(x=>/Martin Bell/.test(x.innerText));
  ok('assessment: address, Call Ann, Take it on the prep card, Open in the Hub', /12 Elm St, Nixa/.test(asm.innerText) && asm.querySelector('a[data-oc-phone="4175550155"]') && /Call Ann/.test(asm.innerText) && asm.querySelector('[data-pt="take"][data-id="ops_asmt_L1"]') && asm.querySelector('a[href="index.html#p/LL1/summary"]'), asm.innerText);
  const orr=[...body().querySelectorAll('.ph-tl')].find(x=>/Orientation/.test(x.innerText));
  ok('orientation: counts who is coming (a cancelled booking is not counted)', /2 booked/.test(orr.innerText), orr.innerText);
  const mc=[...body().querySelectorAll('.ph-tl')].find(x=>/Tasha/.test(x.innerText));
  ok('missed clock-in: the shift in 12-hour time, how late, and a button to its card in Needs me now', /Joan’s 9:00am-1:00pm shift/.test(mc.innerText) && /12 min late/.test(mc.innerText) && mc.querySelector('[data-pt="need"]'), mc.innerText);
  ok('looking only so far: nothing saved', window.__W.length===0, window.__W);
  /* Take it on the open shift */
  os.querySelector('[data-pt="take"]').click(); await sleep(400);
  const it=window.__STORE.ops_items.find(x=>x.id==='ops_cov_V1');
  ok('Take it on the open shift: the Hub\'s own Take it on its work item (owner me, history kept)', it.owner===ME_E && (it.owner_history||[]).length===1 && window.__W.filter(w=>w==='rpc:upsert_app_data_item').length===1, [it, window.__W]);
  const os2=[...body().querySelectorAll('.ph-tl')].find(x=>/Joan Ross/.test(x.innerText) && /Open shift/i.test(x.innerText));
  ok('...the card now says Yours, and the message shows on this screen', /Yours/.test(os2.innerText) && !os2.querySelector('[data-pt="take"]') && /yours now/.test(document.getElementById('phMsg').innerText), [os2.innerText, document.getElementById('phMsg').innerText]);
  mc.querySelector('[data-pt="need"]') && [...body().querySelectorAll('.ph-tl')].find(x=>/Tasha/.test(x.innerText)).querySelector('[data-pt="need"]').click(); await sleep(100);
  ok('"See in Needs me now" goes there', !document.getElementById('phNeed').hidden);
  /* one source failing */
  window.__FAILIV=true; document.querySelector('.ph-tabs [data-v="today"]').click(); document.getElementById('phRefresh').click(); await sleep(500);
  ok('if interviews can\'t load, it says so in red and still shows the rest', /Could not load interviews \(timeout\)/.test(body().innerText) && /Joan Ross/.test(body().innerText) && !/Marcus/.test(body().innerText), body().innerText.slice(0,400));
  ok('fits a phone screen', document.documentElement.scrollWidth<=window.innerWidth+1, [document.documentElement.scrollWidth, window.innerWidth]);
  return R;
}
"""
LOAD = r"""
async()=>{ const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,300)]);
  let inflight=0, peak=0, n=0;
  sb.from=(t)=>{ const b={ select(){return b;}, eq(){return b;}, in(){return b;}, order(){return b;}, limit(){return b;}, gte(){return b;}, is(){return b;},
      single(){ if(t!=='app_data') return Promise.resolve({data:null,error:null}); n++; inflight++; peak=Math.max(peak,inflight); return new Promise(r=>setTimeout(()=>{ inflight--; r({data:{data:[]},error:null}); },30)); },
      maybeSingle(){ return Promise.resolve({data:null,error:null}); }, then(o){ return Promise.resolve({data:[],error:null}).then(o); } }; return b; };
  sb.rpc=async()=>({data:null,error:null}); sb.auth.getSession=async()=>({data:{session:null}});
  const t0=Date.now(); try{ await loadAllData(); }catch(e){}
  ok((window.CC_PHONE?'phone':'computer')+': reads every record ('+n+')'+(window.CC_PHONE?', all at once':', one after another as before'), n>50 && (window.CC_PHONE ? peak>40 : peak===1), [n, peak, Date.now()-t0]);
  return R; }
"""
with sync_playwright() as pw:
    b = pw.chromium.launch()
    block = lambda r: r.abort() if ('supabase.co' in r.request.url or 'leadconnectorhq' in r.request.url or 'hub.mo-care.com' in r.request.url) else r.continue_()
    errs = []
    pg = b.new_page(viewport={'width': 375, 'height': 812}, device_scale_factor=2); pg.route('**/*', block); pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?m=1'); pg.wait_for_timeout(1500)
    R = pg.evaluate(T)
    pg.evaluate("()=>{ window.__FAILIV=false; document.querySelector('.ph-tabs [data-v=\"today\"]').click(); document.getElementById('phRefresh').click(); }"); pg.wait_for_timeout(600)
    pg.screenshot(path='tests/browser/phone_today.png', full_page=True)
    for url in ('http://localhost:8765/index.html?m=1', 'http://localhost:8765/index.html'):
        q = b.new_page(); q.route('**/*', block); q.on('pageerror', lambda e: errs.append(str(e)[:200]))
        q.goto(url); q.wait_for_timeout(1300)
        R += q.evaluate(LOAD)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, dd in R: print(s_, '·', n, '' if s_ == 'PASS' else dd)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

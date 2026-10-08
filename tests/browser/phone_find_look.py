"""CC Office on the phone, screen 2 (Find a person), 2026-10-07. index.html?m=1 at phone size, offline, made-up people;
every Supabase answer and the AxisCare reads are faked; nothing reaches the database and nothing is saved or sent.
(python3 tests/browser/phone_find_look.py)"""
from playwright.sync_api import sync_playwright
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const iso=(h)=>new Date(Date.now()+h*36e5).toISOString();
  window.__W=[]; window.__R=[];
  const APID='0b7e6a1c-1111-4222-8333-444455556666';
  const rows={
    job_applicants:[{ id:APID, first_name:'Marcus', last_name:'Hill', phone:'(417) 555-0177', email:'m@example.com', status:'new', screen_grade:'qualified', position:'caregiver', created_at:iso(-50), city:'Nixa', ssn:'123-45-6789' },
                    { id:'0b7e6a1c-1111-4222-8333-000000000000', first_name:'Mary', last_name:'Hired', phone:'4175550000', status:'hired', created_at:iso(-500) }],
    interview_bookings:[{ applicant_id:APID, starts_at:iso(40), status:'booked', coordinator_id:'K1' }],
    coordinators:[{ id:'K1', name:'Krystal Test' }],
    care_circles:[{ id:'CC1', client_name:'Martha Green', axiscare_client_id:'9001', active:true }],
    circle_contacts:[{ name:'Ann Green', relationship:'Daughter', phone:'4175550123', email:'ann@example.com', is_primary:true, axiscare_removed_at:null },
                     { name:'Old Contact', relationship:'Son', phone:'4175550999', axiscare_removed_at:iso(-100) }] };
  sb.from=(t)=>{ const f=[]; const b={ select(){return b;}, order(){return b;}, limit(){return b;}, gte(){return b;}, in(){return b;},
      eq(c,v){ f.push([c,v]); return b; },
      insert(){ window.__W.push('insert:'+t); return Promise.resolve({error:null}); }, update(){ window.__W.push('update:'+t); return b; }, upsert(){ window.__W.push('upsert:'+t); return Promise.resolve({error:null}); }, delete(){ window.__W.push('delete:'+t); return b; },
      maybeSingle(){ return Promise.resolve({data:null,error:null}); }, single(){ return b.maybeSingle(); },
      then(okf){ window.__R.push(t); let d=(rows[t]||[]).slice(); f.forEach(([c,v])=>{ d=d.filter(x=>x[c]===undefined||String(x[c])===String(v)); }); return Promise.resolve({data:d,error:null}).then(okf); } }; return b; };
  sb.rpc=async(n)=>{ window.__W.push('rpc:'+n); return {data:null,error:null}; };
  sb.auth.getSession=async()=>({ data:{ session:{ access_token:'t', user:{ email:'krystal@mo-care.com' } } } });
  window.cgdCensus=async()=>({ caregivers:[
    { id:123, first:'Maria', last:'Lopez', mobile:'(417) 555-0142', email:'maria@example.com', active:true, city:'Springfield', hire_date:'2024-03-02', oig_status:'FLAGGED-SECRET' },
    { id:124, first:'Mark', last:'Old', mobile:'4175550188', active:false, city:'Ozark' } ] });
  window.cl360Identity=async()=>[
    { client_name:'Martha Green', person_id:'P1', axiscare_client_id:'9001', role_status:'active', phone:'4175550111', ghl_contact_id:'abc123XYZ' },
    { client_name:'Marvin Past', person_id:'P2', axiscare_client_id:'9002', role_status:'former', ended_at:'2026-05-01', end_reason:'moved to a facility', phone:'' } ];
  DATA.leads=[
    { id:'L1', first_name:'Ann', last_name:'Bell', relationship:'Daughter', phone:'4175550155', client_first_name:'Martin', client_last_name:'Bell', client_phone:'4175550156', status:'Contacted', assigned_coordinator:'Krystal', created_at:iso(-30), client_dob:'1931-01-01', dcn:'99887766', medical_conditions:['alzheimers'] },
    { id:'L2', first_name:'Spam', last_name:'Bot', spam:true, phone:'4175550001', client_first_name:'Mars', status:'New', created_at:iso(-2) },
    { id:'L3', first_name:'Done', last_name:'Deal', phone:'4175550002', client_first_name:'Mabel', client_last_name:'Care', status:'Converted', soc:{ launch_completed_at:iso(-100) }, created_at:iso(-900) } ];
  const realFetch=window.fetch; window.__F=[];
  window.fetch=async(u,o)=>{ window.__F.push([String(u), o&&o.body]); if(/coverage-shifts/.test(String(u))) return new Response(JSON.stringify({ shifts:[{ client:'Martha Green', date:'Wed Oct 8', time:'8:00a-12:00p' },{ client:'Joan Ross', date:'Thu Oct 9', time:'1:00p-5:00p' }] }),{status:200}); return new Response('{}',{status:404}); };
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Test', shift:'day' };");
  DATA.coordinator_staff=[{ email:'krystal@mo-care.com', name:'Krystal Test' }]; DATA.ops_items=[];
  phStart(); await sleep(100);
  ok('tabs at the bottom: Needs me now, Find a person, Today', [...document.querySelectorAll('.ph-tabs button')].map(b=>b.innerText).join('|')==='Needs me now|Find a person|Today');
  document.querySelector('.ph-tabs [data-v="find"]').click(); await sleep(300);
  ok('Find a person: title changes, the search box shows, the work list is hidden', /Find a person/.test(document.getElementById('phTitle').innerText) && !document.getElementById('phFind').hidden && document.getElementById('phNeed').hidden);
  const q=document.getElementById('phQ'), body=()=>document.getElementById('phFindBody');
  const type=async v=>{ q.value=v; q.dispatchEvent(new Event('input')); await sleep(250); };
  await type('m');
  ok('one letter: asks for two', /at least two letters/.test(body().innerText));
  await type('ma');
  const names=[...body().querySelectorAll('.ph-row b')].map(b=>b.innerText);
  ok('"ma" finds clients, inquiries, caregivers and applicants (current first, past last)', JSON.stringify(names)===JSON.stringify(['Martha Green','Martin Bell','Maria Lopez','Marcus Hill','Marvin Past','Mark Old']), names);
  ok('...spam, a converted inquiry (she is a client now) and a hired applicant are not listed separately', !/Mars|Mabel|Mary Hired/.test(body().innerText), body().innerText);
  ok('...the applicant row shows the booked interview', /Interview /.test(body().innerText));
  await type('0142');
  ok('four digits of a phone number finds the person', [...body().querySelectorAll('.ph-row b')].map(b=>b.innerText).join()==='Maria Lopez', body().innerText);
  /* caregiver */
  body().querySelector('.ph-row').click(); await sleep(150);
  let t=body().innerText;
  ok('caregiver card: status, phone, town, hired; Call from the office line; Next shifts; Open in the Hub goes to their profile', /Active caregiver/.test(t) && /\(417\) 555-0142/.test(t) && /Springfield/.test(t) && body().querySelector('a[data-oc-phone="(417) 555-0142"]') && body().querySelector('a[href="index.html#cg/123"]'), t);
  ok('...never shows a background result', !/FLAGGED|SECRET/.test(body().innerHTML));
  body().querySelector('[data-pf="shifts"]').click(); await sleep(250);
  ok('Next shifts reads their next 14 days from AxisCare (the Hub\'s own shifts reader)', /NEXT SHIFTS/.test(body().innerText) && /Joan Ross/.test(body().innerText) && window.__F.some(f=>/coverage-shifts/.test(f[0]) && /"caregiver_axiscare_id":"123"/.test(f[1])), body().innerText);
  body().querySelector('[data-pf="back"]').click(); await sleep(100);
  /* client */
  await type('martha');
  body().querySelector('.ph-row').click(); await sleep(250);
  t=body().innerText;
  ok('client card: receiving care, phone, Call, GoHighLevel and Open in the Hub (#p/A9001/summary)', /Receiving care/.test(t) && body().querySelector('a[data-oc-phone="4175550111"]') && body().querySelector('a[href$="/contacts/detail/abc123XYZ"]') && body().querySelector('a[href="index.html#p/A9001/summary"]'), body().innerHTML.slice(0,900));
  ok('...family from the care circle, main contact first, each with Call; a removed contact is not shown', /FAMILY · 1/.test(t) && /Ann Green · main contact/.test(t) && body().querySelector('#phFam a[data-oc-phone="4175550123"]') && !/Old Contact/.test(t), t);
  body().querySelector('[data-pf="back"]').click(); await sleep(80);
  await type('marvin'); body().querySelector('.ph-row').click(); await sleep(150);
  ok('past client: says so, with when and why', /Past client, ended May 1, 2026 \(moved to a facility\)/.test(body().innerText), body().innerText);
  body().querySelector('[data-pf="back"]').click(); await sleep(80);
  /* inquiry */
  await type('bell'); body().querySelector('.ph-row').click(); await sleep(150);
  t=body().innerText;
  ok('inquiry card: stage, caller and relationship, coordinator; Call Ann and Call Martin; Open in the Hub (#p/L + its id)', /Talking/.test(t) && /Ann Bell \(daughter\)/.test(t) && /Krystal/.test(t) && body().querySelector('a[data-oc-phone="4175550155"]') && body().querySelector('a[data-oc-phone="4175550156"]') && body().querySelector('a[href="index.html#p/LL1/summary"]'), [t, [...body().querySelectorAll('a')].map(a=>a.outerHTML.slice(0,140))]);
  ok('...never shows the birth date, Medicaid number or medical details', !/1931|99887766|alzheimers/i.test(body().innerHTML));
  body().querySelector('[data-pf="back"]').click(); await sleep(80);
  /* applicant */
  await type('marcus'); body().querySelector('.ph-row').click(); await sleep(150);
  t=body().innerText;
  ok('applicant card: where they are, the interview with whom, Call, Open in the Hub (#ap/<id>)', /Applied/.test(t) && /with Krystal/.test(t) && body().querySelector('a[data-oc-phone="(417) 555-0177"]') && body().querySelector('a[href="index.html#ap/'+APID+'"]'), t);
  ok('...never shows a Social Security number', !/123-45-6789/.test(body().innerHTML));
  ok('looking only: nothing was saved anywhere while searching and opening people', window.__W.length===0, window.__W);
  ok('fits a phone screen', document.documentElement.scrollWidth<=window.innerWidth+1, [document.documentElement.scrollWidth, window.innerWidth]);
  document.querySelector('.ph-tabs [data-v="need"]').click(); await sleep(150);
  ok('back to Needs me now', !document.getElementById('phNeed').hidden && /Needs me now/.test(document.getElementById('phTitle').innerText));
  return R;
}
"""
FAIL = r"""
async()=>{ const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  sb.from=()=>{ const b={ select(){return b;}, order(){return b;}, limit(){return b;}, gte(){return b;}, eq(){return b;}, in(){return b;}, maybeSingle(){return Promise.resolve({data:null,error:null});}, then(o){ return Promise.resolve({data:[],error:null}).then(o);} }; return b; };
  window.cgdCensus=async()=>{ throw new Error('census 503'); };
  window.cl360Identity=async()=>[{ client_name:'Martha Green', person_id:'P1', axiscare_client_id:'9001', role_status:'active', phone:'4175550111' }];
  DATA.leads=[]; DATA.ops_items=[]; (0,eval)("ME={ email:'k@mo-care.com', name:'K' };");
  phStart(); document.querySelector('.ph-tabs [data-v="find"]').click(); await sleep(300);
  const q=document.getElementById('phQ'); q.value='mar'; q.dispatchEvent(new Event('input')); await sleep(250);
  const t=document.getElementById('phFindBody').innerText;
  ok('a list that fails to load is said in red, and the rest still search (never silent)', /Could not load caregivers \(census 503\)/.test(t) && /Martha Green/.test(t), t);
  return R; }
"""
DESK = r"""
async()=>{ const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,300)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  window.__CG=null; window.openCaregiverProfile=(id)=>{ window.__CG=id; };
  location.hash='#cg/123'; await sleep(200);
  ok('the Hub opens a caregiver from #cg/<AxisCare id>', window.__CG==='123', window.__CG);
  window.__AP=null; window.apOpenProfile=(id)=>{ window.__AP=id; }; window.apLoad=async()=>{ window.__APL=true; };
  location.hash='#ap/0b7e6a1c-1111-4222-8333-444455556666'; await sleep(250);
  ok('the Hub opens an applicant from #ap/<id> (loading the list first)', window.__AP==='0b7e6a1c-1111-4222-8333-444455556666' && window.__APL===true, [window.__AP, window.__APL]);
  window.__CG=null; location.hash='#cg/<script>'; await sleep(150);
  ok('...and ignores anything that is not an id', window.__CG===null);
  return R; }
"""
with sync_playwright() as pw:
    b = pw.chromium.launch()
    block = lambda r: r.abort() if ('supabase.co' in r.request.url or 'leadconnectorhq' in r.request.url or 'hub.mo-care.com' in r.request.url) else r.continue_()
    errs = []
    pg = b.new_page(viewport={'width': 375, 'height': 812}, device_scale_factor=2); pg.route('**/*', block); pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?m=1'); pg.wait_for_timeout(1500)
    R = pg.evaluate(T)
    pg.evaluate("()=>{ document.querySelector('.ph-tabs [data-v=\"find\"]').click(); const q=document.getElementById('phQ'); q.value='ma'; q.dispatchEvent(new Event('input')); }"); pg.wait_for_timeout(400)
    pg.screenshot(path='tests/browser/phone_find.png')
    f = b.new_page(viewport={'width': 375, 'height': 812}); f.route('**/*', block); f.on('pageerror', lambda e: errs.append(str(e)[:200]))
    f.goto('http://localhost:8765/index.html?m=1'); f.wait_for_timeout(1300)
    R += f.evaluate(FAIL)
    d = b.new_page(); d.route('**/*', block); d.on('pageerror', lambda e: errs.append(str(e)[:200]))
    d.goto('http://localhost:8765/index.html'); d.wait_for_timeout(1300)
    R += d.evaluate(DESK)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, dd in R: print(s_, '·', n, '' if s_ == 'PASS' else dd)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

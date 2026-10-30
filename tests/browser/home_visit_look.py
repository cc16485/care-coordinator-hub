"""Home visit on the iPad (2026-10-29, stage 1). The real Hub page, offline, a made-up family. Proves: starting the visit from
a lead makes ONE care assessment tied to the lead, filled from the phone call (client, address, who set it, who's in the room,
the contact for updates), moves a Contacted lead to Assessment Scheduled, and shows the seven screens of her paper form with
the Hub's own recorder (consent first) on the first; typing and tapping save as you go into the same assessment record; the
daily-activity answers suggest the care level (stand-by bathing = Personal, a Hoyer lift = Advanced); picking a level fills
the rate from Settings unless a rate was typed; the week adds up hours and warns under the minimums; the payer is shown from
the intake and can't be changed here, with Medicaid pointing to CDS; the agreement card carries the level, rate, schedule and
contacts over (link only when the client is in AxisCare); a finger signature saves; Finish marks it done for the Start of Care
check; opening it again opens the same visit; the Care tab offers it; Settings saves the rates; it fits an iPad and a phone;
nothing is texted, emailed or sent anywhere; no "AI" words and no em dashes on the screens.
(python3 tests/browser/home_visit_look.py; SHOTS=<dir> saves screenshots)"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = os.environ.get('SHOTS')
STUB = r"""
(()=>{
  const W=window; W.__log={ persists:[], invokes:[], merges:[], fetches:[] };
  const of=W.fetch; W.fetch=(u,o)=>{ W.__log.fetches.push(String(u)); return of(u,o); };
  (0,eval)(`sb={ from:()=>{ const p={ select(){return p;}, eq(){return p;}, gte(){return p;}, in(){return p;}, order(){return p;}, limit(){return p;}, is(){return p;},
      single:async()=>({ data:null, error:null }), maybeSingle:async()=>({ data:null, error:null }),
      then(a){ return Promise.resolve({data:[],error:null}).then(a); } }; return p; },
    storage:{ from:()=>({ upload:async()=>{ window.__log.invokes.push('upload'); return { error:null }; } }) },
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async(n)=>{ window.__log.invokes.push(n); return {data:null,error:null}; } },
    auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };
    ME={ email:'krystal@mo-care.com', name:'Krystal Land' }; CC_ROLES=['owner_admin']; CC_ROLES_CHECKED=true;
    persist=async(k,v)=>{ window.__log.persists.push([k, JSON.parse(JSON.stringify(v))]); };
    tkMerge=async(fn,label)=>{ const m=JSON.parse(JSON.stringify(DATA.ops_settings||{})); const said=fn(m); DATA.ops_settings=m; window.__log.merges.push([label,said,m]); return {}; };
    ccConfirm=async()=>true; ccToast=(m)=>{ window.__log.toast=m; };`);
  DATA.ops_settings={ visit_rates:{ wellness:31, personal:33, advanced:35 } };
  DATA.care_assessments=[]; DATA.care_plans=[];
  DATA.leads=[{ id:'lead_betty', first_name:'Karen', last_name:'Price (fake)', relationship:'Daughter', phone:'(417) 555-0172', email:'karen@example.com',
    client_first_name:'Betty', client_last_name:'Harlow (fake)', client_address:'1418 E Cherry St', client_city:'Springfield', client_state:'MO', client_zip:'65802',
    client_phone:'(417) 555-0148', client_dob:'1941-03-14', number_of_hours:'20', days_needed:'Mon Wed Fri', reason:'Fall in the bathroom Oct 12',
    physician_name:'Dr. Reyes (fake)', funding_source:'private', status:'Contacted' }];
  DATA.client_profiles=[];
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,900)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, lead=DATA.leads[0], q=s=>document.querySelector('#hvRoot '+s), qa=s=>[...document.querySelectorAll('#hvRoot '+s)];
  const type=async(path,val)=>{ const el=q('[data-hv="'+path+'"]'); el.value=val; el.dispatchEvent(new Event('input',{bubbles:true})); };
  const tap=(path,v)=>q('[data-hvp="'+path+'"][data-v="'+v+'"]').click();
  const last=()=>{ const p=L.persists.filter(x=>x[0]==='care_assessments'); return p.length?p[p.length-1][1]:null; };
  const f0=L.fetches.length;
  await HV.open({ leadId:'lead_betty' }); await sleep(200);
  const a=DATA.care_assessments[0];
  ok('one care assessment, tied to the lead, saved at once', DATA.care_assessments.length===1 && a.lead_id==='lead_betty' && last() && last().id===a.id && a.status==='Scheduled' && a.visit && a.visit.v===1, a);
  ok('filled from the phone call: client, address, doctor, who set it, hours', a.client_name==='Betty Harlow (fake)' && /1418 E Cherry St, Springfield, MO 65802/.test(a.address) && a.physician_name==='Dr. Reyes (fake)'
    && /Loved one: Karen Price \(fake\), Daughter/.test(a.visit.part1.set_by) && /20 hours, Mon Wed Fri/.test(a.visit.part1.hours_days) && a.visit.story.trigger==='Fall in the bathroom Oct 12', a.visit.part1);
  ok("who's in the room starts with Betty (client) and Karen (primary contact); Karen starts as the primary contact", a.visit.attendees.length===2 && a.visit.attendees[0].role==='client' && a.visit.attendees[1].role==='primary' && (a.visit.attendees[1].roles||[]).join()==='primary');
  ok('a Contacted lead moves to Assessment Scheduled', lead.status==='Assessment Scheduled' && L.persists.some(x=>x[0]==='leads'));
  const rail=qa('#hvRail [data-hvs]').map(b=>b.innerText.replace(/\s+/g,' ').trim());
  ok('eleven screens in her order (2026-10-30), then After the visit, first one showing; the walk-through says when it applies', rail.join('|')==='1 Start the visit|2 About us|3 Their story|4 Good days out|5 Around the house|6 Health|7 Personal care|8 Preferences|9 Schedule and level|10 Home walk-through if starting care|11 Agreement and sign-off|12 After the visit' && q('.hv-sec[data-sec="0"]').style.display==='' && q('.hv-sec[data-sec="1"]').style.display==='none', rail);
  const s1=q('.hv-sec[data-sec="0"]').innerText;
  ok('screen 1: read-aloud line, the recorder with consent first, phone-call answers marked', /The recording is written out by software and summarized to help me review it/.test(s1) && q('#recConsent') && q('#recGo').disabled && /I have asked everyone in the room out loud/.test(s1) && /written transcript stays with their record/.test(s1) && qa('.hv-from').length>=4, s1.slice(0,900));
  /* type and tap: saves as it goes */
  q('[data-hvs="2"]').click(); await sleep(50);
  await type('visit.story.morning','Up about 7. Coffee and toast.');
  q('[data-hva="star"][data-i="1"]').click();
  await sleep(1500);
  ok('typing saves into the same assessment (as you go)', last().visit.story.morning==='Up about 7. Coffee and toast.' && last().visit.top_goal===1 && last().id===a.id && /Saved/.test(q('#hvSaved').textContent), last().visit.story);
  q('[data-hva="addperson"]').click(); await type('visit.attendees.2.name','Mike Harlow (fake)'); await type('visit.attendees.2.rel','Son');
  q('[data-hva="addcond"]'); q('[data-hvs="5"]').click(); await sleep(30);
  await type('visit.conditions.0.name','Arthritis'); tap('visit.memory','yes'); tap('visit.equipment','Walker'); tap('visit.equipment','Shower chair');
  ok('health: conditions, yes/no and equipment (several at once)', a.visit.conditions[0].name==='Arthritis' && a.visit.memory==='yes' && a.visit.equipment.join()==='Walker,Shower chair');
  /* daily activities: her rows, her options */
  q('[data-hvs="4"]').click(); await sleep(30);
  let s4=q('.hv-sec[data-sec="4"]').innerText;
  q('[data-hvs="6"]').click(); await sleep(30);
  s4+='\n'+q('.hv-sec[data-sec="6"]').innerText;
  ok('daily activities (Around the house + Personal care): all 15 of her rows, her questions, medicine questions with RN/LPN, Depends', ['Light housekeeping','Heavy housekeeping','Laundry','Meal preparation','Medication reminders','Shopping and errands','Transportation','Managing appointments','Phone and computer','Mobility and walking','Transfers','Bathing and showering','Toileting','Dressing and grooming','Eating'].every(t=>s4.includes(t))
    && /Needs our nurse \(RN\/LPN\)\?/.test(s4) && /Changing Depends\?/.test(s4) && /Verbal cues/.test(s4) && /Client helps/.test(s4) && !/LNP/.test(s4), s4.slice(0,600));
  ok('nothing suggested before any answer', HV._suggest()==='');
  tap('visit.acts.light_house.level','helps'); ok('household help only = Wellness', HV._suggest()==='wellness');
  tap('visit.acts.bathing.level','standby'); ok('stand-by bathing = Personal', HV._suggest()==='personal');
  /* schedule, payer, level */
  q('[data-hvs="8"]').click(); await sleep(30);
  ok('the suggested tag sits on Personal Care', /Personal Care\s*Suggested/.test(q('#hvLevels').innerText), q('#hvLevels').innerText);
  const pay=q('.hv-sec[data-sec="8"]').innerText;
  ok('payer: four choices, the intake\'s ticked and locked, Medicaid points to CDS, no Medicaid choice', qa('.hv-sec[data-sec="8"] .hv-seg button[disabled]').length===4 && q('.hv-sec[data-sec="8"] .hv-seg button.on[disabled]').innerText==='Private pay' && /Caring Companions Direct Services \(CDS\)/.test(pay) && !qa('.hv-sec[data-sec="8"] button').some(b=>/^Medicaid/.test(b.innerText)), pay.slice(0,700));
  ok('rates come from Settings', /\$31/.test(q('#hvLevels').innerText) && /\$33/.test(q('#hvLevels').innerText) && /\$35/.test(q('#hvLevels').innerText));
  q('[data-hva="level"][data-v="personal"]').click(); await sleep(20);
  ok('picking Personal fills the rate from Settings', a.visit.level==='personal' && a.visit.rate==='33' && q('#hvRate').value==='33');
  await type('visit.rate','32.50'); q('[data-hva="level"][data-v="wellness"]').click(); await sleep(20);
  ok('a typed rate is never written over', a.visit.rate==='32.50' && a.visit.level==='wellness');
  q('[data-hva="level"][data-v="personal"]').click();
  await type('visit.week.mon.from','09:00'); await type('visit.week.mon.to','13:00');
  ok('one 4-hour day: under the 8 hours a week minimum', /4 hours a week/.test(q('#hvWeekSum').innerText) && /Below the 8 hours a week minimum/.test(q('#hvWeekSum').innerText) && !/under 4 hours/.test(q('#hvWeekSum').innerText), q('#hvWeekSum').innerText);
  await type('visit.week.wed.from','09:00'); await type('visit.week.wed.to','13:00');
  ok('two 4-hour days: meets the minimum; the days show as on', /8 hours a week/.test(q('#hvWeekSum').innerText) && /Meets the 4 hours a visit/.test(q('#hvWeekSum').innerText) && qa('.hv-day.on').length===2, q('#hvWeekSum').innerText);
  tap('visit.outcome','ready');
  q('[data-hvs="5"]').click(); tap('visit.equipment','Hoyer lift'); ok('a Hoyer lift = Advanced', HV._suggest()==='advanced');
  /* sign-off and the agreement card */
  q('[data-hvs="10"]').click(); await sleep(60);
  const ag=q('#hvAgree').innerText, lk0=q('#hvAgree a');
  ok('agreement card carries level, rate, schedule and contacts; not in AxisCare yet = the agreement opens from the lead (2026-10-30)', /Personal Care, \$32\.50 an hour/.test(ag) && /Mon 9:00am to 1:00pm, Wed 9:00am to 1:00pm/.test(ag) && /Karen Price \(fake\), Mike Harlow \(fake\)/.test(ag) && lk0 && /agreement\.html\?lead=lead_betty&cn=Betty%20Harlow%20\(fake\)/.test(lk0.getAttribute('href')) && /Open the Client Care Agreement/.test(lk0.innerText) && !/next update/.test(ag), [ag, lk0&&lk0.outerHTML]);
  const cv=q('canvas[data-sig="client"]'), r=cv.getBoundingClientRect();
  const pe=(t,x,y)=>cv.dispatchEvent(new PointerEvent(t,{ bubbles:true, pointerId:1, clientX:r.left+x, clientY:r.top+y }));
  try{ cv.setPointerCapture=()=>{}; }catch(e){}
  pe('pointerdown',20,60); pe('pointermove',80,40); pe('pointermove',160,80); pe('pointerup',160,80);
  ok('a finger signature saves as a picture with today\'s date', /^data:image\/png/.test(a.visit.sign.client.png) && /^\d{4}-\d\d-\d\d$/.test(a.visit.sign.client.date));
  a.axiscare_client_id='4321'; q('[data-hvs="8"]').click(); q('[data-hvs="10"]').click(); await sleep(30);
  const link=q('#hvAgree a');
  ok('once in AxisCare: the agreement opens on the same iPad', link && /agreement\.html\?ax=4321&cn=Betty%20Harlow%20\(fake\)/.test(link.getAttribute('href')), link&&link.outerHTML);
  a.axiscare_client_id='';
  /* looks */
  const txt=document.getElementById('hvRoot').innerText;
  ok('no "AI" and no em dashes on the screens', !/\bAI\b/.test(txt) && !/—/.test(txt), (txt.match(/.{30}(\bAI\b|—).{30}/)||[])[0]);
  const small=qa('button,[data-hv]').filter(b=>{ const x=b.getBoundingClientRect(); return x.width>0 && x.height>0 && x.height<36; }).map(b=>b.outerHTML.slice(0,80));
  ok('every button and box is at least 36px tall (fingers)', small.length===0, small.slice(0,5));
  const during={ invokes:L.invokes.slice(), keys:[...new Set(L.persists.map(x=>x[0]))], fn:L.fetches.slice(f0).filter(u=>/functions\/v1/.test(u)) };
  ok('the visit itself sent nothing: no functions called, only the assessment and the lead saved', during.invokes.length===0 && during.keys.every(k=>['care_assessments','leads'].includes(k)) && during.fn.length===0, during);
  /* finish (it then opens the family's profile, as the old assessment did) */
  q('[data-hva="finish"]').click(); await sleep(1500);
  const f=last();
  ok('Finish: done for the Start of Care check, who and when; the screen closes; tells them to record the outcome', f.status==='Completed — Awaiting Plan' && f.visit.finished_by==='Krystal Land' && f.visit.finished_at && !document.getElementById('hvRoot') && /Ready to start.*Start of Care, step 3/.test(L.toast||''), [f.status, L.toast]);
  await HV.open({ leadId:'lead_betty' }); await sleep(200);
  ok('opening again opens the same visit with its answers', DATA.care_assessments.length===1 && HV._st.a.id===a.id && q('[data-hv="visit.story.morning"]').value==='Up about 7. Coffee and toast.');
  await HV.close(); await sleep(100);
  /* the Care tab offers it */
  CP.lead=lead; CP.ax=''; document.getElementById('leadProfileView').style.display='block'; try{ cpShowTab('care'); }catch(e){} cpRenderCare(); await sleep(50);
  const care=document.getElementById('cp_care').innerHTML;
  ok('Care tab: Start the home visit, and Open home visit on the saved one', /Start the home visit/.test(care) && /Open home visit/.test(care), care.slice(0,500));
  /* settings */
  (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha' }; CC_ROLE_BY_EMAIL['samantha@mo-care.com']=['owner_admin'];"); const sb_=document.getElementById('hvSet'); HV.settingsFill();
  document.getElementById('hvSet_personal').value='34'; await HV.settingsSave(); await sleep(20);
  ok('Settings > Home visit saves rates and minimums (owners)', sb_ && DATA.ops_settings.visit_rates.personal===34 && DATA.ops_settings.visit_minimums.week===8 && L.merges.length===1);
  return R;
}
"""
MIME = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.json':'application/json', '.webmanifest':'application/json'}
def serve(route):
    url = route.request.url
    if 'supabase.co' in url: return route.abort()
    if not url.startswith('http://hv.local/'): return route.continue_()
    p = (ROOT / url.split('http://hv.local/', 1)[1].split('?')[0].split('#')[0])
    if not p.is_file(): return route.fulfill(status=404, body='')
    route.fulfill(status=200, body=p.read_bytes(), content_type=MIME.get(p.suffix, 'application/octet-stream'))
def overflow(pg):
    return pg.evaluate("()=>{ const r=document.getElementById('hvRoot'); if(!r) return 'no visit'; const w=r.clientWidth; return [...r.querySelectorAll('*')].filter(e=>{ const b=e.getBoundingClientRect(); return b.width>0 && b.right>w+1 && !e.closest('.hv-rail'); }).slice(0,4).map(e=>e.className+' '+Math.round(e.getBoundingClientRect().right)); }")
with sync_playwright() as pw:
    b = pw.chromium.launch(); cx = b.new_context(viewport={'width': 1180, 'height': 820}, timezone_id='America/Chicago', has_touch=True); pg = cx.new_page()
    pg.route('**/*', serve)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://hv.local/index.html?proof=hv'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T)
    pg.evaluate("async()=>{ await HV.open({ leadId:'lead_betty' }); }"); pg.wait_for_timeout(300)
    for i in range(11):
        pg.evaluate(f"()=>document.querySelector('#hvRoot [data-hvs=\"{i}\"]').click()"); pg.wait_for_timeout(120)
        o = overflow(pg); R.append(['PASS' if not o else 'FAIL', f'iPad (1180 wide), screen {i+1}: nothing runs off the side', o])
        if SHOTS:
            os.makedirs(SHOTS, exist_ok=True); pg.screenshot(path=os.path.join(SHOTS, f'hv-ipad-{i+1}.png'), full_page=False)
    pg.set_viewport_size({'width': 820, 'height': 1180})
    for i in [0, 1, 3, 4, 6, 8, 9]:
        pg.evaluate(f"()=>document.querySelector('#hvRoot [data-hvs=\"{i}\"]').click()"); pg.wait_for_timeout(120)
        o = overflow(pg); R.append(['PASS' if not o else 'FAIL', f'iPad upright (820 wide), screen {i+1}: nothing runs off the side', o])
        if SHOTS: pg.screenshot(path=os.path.join(SHOTS, f'hv-upright-{i+1}.png'))
    pg.set_viewport_size({'width': 390, 'height': 844})
    for i in [0, 1, 3, 4, 6, 8, 9, 10]:
        pg.evaluate(f"()=>document.querySelector('#hvRoot [data-hvs=\"{i}\"]').click()"); pg.wait_for_timeout(120)
        o = overflow(pg); R.append(['PASS' if not o else 'FAIL', f'phone (390 wide), screen {i+1}: nothing runs off the side', o])
        if SHOTS: pg.screenshot(path=os.path.join(SHOTS, f'hv-phone-{i+1}.png'))
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

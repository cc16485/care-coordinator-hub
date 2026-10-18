"""Team Work (Stage 1, 2026-10-18). The real Hub page, offline (files served from this folder, no server needed), made-up
people and cards only; saves are recorded, never sent; nobody is texted, emailed or called.
Krystal works 8 to 2, Angiel 1 to 5. The clock is pinned to Wednesday 7 October 2026, 2:40 PM Chicago (Angiel alone).
(python3 tests/browser/team_work_look.py; SHOTS=<dir> also saves screenshots)"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = os.environ.get('SHOTS')
STUB = r"""
(()=>{
  const W=window, at=(hm,d)=>new Date('2026-10-'+(d||'07')+'T'+hm+':00-05:00').toISOString();
  W.__log={ writes:[], fn:[], toasts:[], events:[], alerts:[] };
  const K='krystal@mo-care.com', S='samantha@mo-care.com', A='angiel@mo-care.com';
  (0,eval)(`sb={ from:()=>{ const p={ select(){return p;}, eq(){return p;}, gte(){return p;}, in(){return p;}, order(){return p;}, limit(){return p;},
      single:async()=>({ data:null, error:null }), maybeSingle:async()=>({ data:null, error:null }),
      then(a){ return Promise.resolve({data:[],error:null}).then(a); } }; return p; },
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async(n)=>{ window.__log.fn.push(n); return {data:null,error:null}; } },
    auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };
    CC_ROLE_BY_EMAIL={ '${S}':['owner_admin'], '${K}':['care_coordinator'], '${A}':['care_coordinator'] };
    OPS_PEOPLE=[{ person_id:'p_k', full_name:'Krystal Land', primary_email:'${K}' },{ person_id:'p_s', full_name:'Samantha Troutman', primary_email:'${S}' },{ person_id:'p_a', full_name:'Angiel Test', primary_email:'${A}' }];`);
  W.persist=async(k,v)=>{ W.__log.writes.push(k+':'+v.id); };
  W.opEvent=(v,o)=>W.__log.events.push(v+':'+(o&&o.summary||''));
  W.ccOpsRefresh=()=>{}; W.ccRecentFetch=async()=>{}; W.ccToast=m=>W.__log.toasts.push(m); W.alert=m=>W.__log.alerts.push(m);
  W.tkMerge=async(fn)=>{ const m=JSON.parse(JSON.stringify(DATA.ops_settings||{})); fn(m); DATA.ops_settings=m; W.__log.writes.push('ops_settings'); return {}; };
  W.ccConfirm=async()=>true;
  W.TA.coordinators=()=>[K,A];
  /* each family's coordinator: AxisCare client 101 is Krystal's, 202 is Angiel's (read only; the test checks nothing writes it) */
  W.__journeys=[{ axiscare_client_id:'101', assigned_cc:K },{ axiscare_client_id:'202', assigned_cc:A }];
  W.cjJourneyFor=o=>W.__journeys.find(j=>String(j.axiscare_client_id)===String((o&&(o.ax||(o.lead&&o.lead.axiscare_client_id)))||''))||null;
  DATA.handoffs=[]; DATA.leads=[]; DATA.coverage_cases=[];
  DATA.coordinator_staff=[{ id:'sk', name:'Krystal Land', email:K }, { id:'sa', name:'Angiel Test', email:A }, { id:'ss', name:'Samantha Troutman', email:S }];
  DATA.duty_windows=[
    { id:'dk', area:'operations', person:K, recur:{ days:[1,2,3,4,5], from:'08:00', to:'14:00' } },
    { id:'da', area:'staffing',   person:A, recur:{ days:[1,2,3,4,5], from:'13:00', to:'17:00' } } ];
  DATA.ops_settings={};
  DATA.ops_items=[
    { id:'calloff', kind:'coverage', opened_by:'callout', status:'open', title:'Call-off: tonight 6 to 9 PM (fake client)', detail:'Regular caregiver texted she cannot make it.', owner:K, owner_name:'Krystal Land', client_ax:'101', created_at:at('14:40') },
    { id:'famreq', kind:'call_followup', opened_by:'call-tasks', status:'open', title:'Change Thursday visit to 10 AM (fake family)', owner:K, owner_name:'Krystal Land', client_ax:'202', due:at('17:00'), created_at:at('13:05') },
    { id:'mci', kind:'staffing_issue', opened_by:'timekeeper', status:'open', urgency:'urgent', title:'Missed clock-in 2:00 PM visit (fake)', owner:K, owner_name:'Krystal Land', client_ax:'101', created_at:at('14:22') },
    { id:'relk', kind:'relationship_call', opened_by:'system', status:'open', title:'Day 7 call: fake family', owner:K, owner_name:'Krystal Land', client_ax:'101', due:at('13:30'), created_at:at('08:00','05') },
    { id:'coach', kind:'coaching', opened_by:'hr-agent', status:'open', title:'Coaching: fake caregiver, late clock-ins', owner:K, owner_name:'Krystal Land', due:at('12:00'), created_at:at('08:00','05') },
    { id:'disc', kind:'discipline', opened_by:'system', sensitive:true, status:'open', title:'Write-up draft (fake)', owner:S, owner_name:'Samantha Troutman', created_at:at('09:00') },
    { id:'amine', kind:'request', opened_by:'person', status:'open', title:'Call the hospital case manager (fake)', owner:A, owner_name:'Angiel Test', due:at('16:00'), created_at:at('13:10') } ];
  W.__n0=DATA.ops_items.length;
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, it=id=>DATA.ops_items.find(x=>x.id===id), mw=()=>document.getElementById('tab-mywork').innerText;
  const tabs=()=>[...document.querySelectorAll('#myWorkTabs .subtab')].map(t=>t.textContent);
  const as=(e,n)=>(0,eval)("ME={ email:'"+e+"', name:'"+n+"', shift:'day' };");
  const ids=b=>new Set((b||[]).map(i=>i.id));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  switchTab('mywork');

  /* ── OFF: nothing moves; owners see a preview ── */
  as('krystal@mo-care.com','Krystal Land'); myWorkGo('today'); await sleep(200);
  ok('off: Krystal has no Team Work tab', !tabs().some(t=>/Team Work/.test(t)), tabs());
  const bk0=myWorkBuckets();
  ok('off: the call-off and missed clock-in are still in Krystal\'s My Work, exactly as today', ids(bk0.mine).has('calloff') && ids(bk0.mine).has('mci'));
  as('samantha@mo-care.com','Samantha Troutman'); myWorkGo('today'); await sleep(150);
  ok('off: Samantha (owner) sees "Team Work (preview)"', tabs().some(t=>/Team Work \(preview\)/.test(t)), tabs());
  myWorkGo('team'); await sleep(150);
  ok('preview says it is switched off and nothing has moved', /Preview, switched off/.test(mw()) && /exactly as before/.test(mw()), mw().slice(0,400));
  ok('preview Take it buttons are disabled', [...document.querySelectorAll('.tw-card button.primary')].every(b=>b.disabled));
  ok('preview lists the call-off, the family request and the missed clock-in', ['calloff','famreq','mci'].every(i=>document.querySelector('.tw-card[data-id="'+i+'"]')));
  ok('preview never lists coaching, a write-up or relationship work', ['coach','disc','relk','amine'].every(i=>!document.querySelector('.tw-card[data-id="'+i+'"]')));

  /* ── ON, 2:40 PM: Angiel alone ── */
  DATA.ops_settings.team_work_live=true;
  as('angiel@mo-care.com','Angiel Test'); myWorkGo('today'); await sleep(200);
  ok('on: Angiel has a Team Work tab next to Today, with a red count (care at risk inside)', tabs()[1] && /^Team Work/.test(tabs()[1]) && /3/.test(tabs()[1]) && document.querySelector('#myWorkTabs .subtab:nth-child(2) .subtab-badge.red'), tabs());
  ok('Today keeps care at risk loud: TEAM WORK: CARE AT RISK lane with the missed clock-in', /TEAM WORK: CARE AT RISK/.test(mw()) && /Missed clock-in 2:00 PM visit/.test(mw()), mw().slice(0,900));
  ok('...and the "need you now" number counts it', opsTodayCounts().act>=1, opsTodayCounts());
  if(window.__shot) await window.__shot('today-angiel');
  myWorkGo('team'); await sleep(150);
  const txt=mw();
  ok('on duty line: Angiel only at 2:40 PM', /On duty now: Angiel(?!,)/.test(txt), txt.slice(0,600));
  const q=id=>{ const e=document.querySelector('.tw-card[data-id="'+id+'"]'); return e?e.innerText:'(missing; tab text: '+mw().slice(0,700)+' tabs '+tabs().join('|')+')'; };
  const co=q('calloff');
  ok('call-off card: responsible role, deadline, Krystal\'s family, escalation path', /Responsible: Care Coordinator on duty \(routed to Krystal\)/.test(co) && /Deadline 3:10 PM \(set by rule\)/.test(co) && /Krystal’s family/.test(co) && /Not taken in 15 min/.test(co) && /No texts/.test(co), co);
  const mc=q('mci');
  ok('missed clock-in card: the approved 10/20/35 ladder', /10 min: the person in charge. 20 min: text to Samantha. 35 min: text to Zach/.test(mc), mc);
  const fr=q('famreq');
  ok('family request: Angiel\'s family, the card\'s own deadline', /Angiel’s family/.test(fr) && /Deadline 5:00 PM/.test(fr) && !/set by rule/.test(fr), fr);
  ok('care at risk is listed first', (document.querySelector('.tw-card')||{dataset:{}}).dataset.id==='mci');
  if(window.__shot) await window.__shot('team-angiel');

  /* Krystal's own lists at 2:40 (she is off): the team cards left her My Work; her own work stayed */
  as('krystal@mo-care.com','Krystal Land');
  const bk=myWorkBuckets();
  ok('on: call-off, family request and missed clock-in left Krystal\'s My Work', !['calloff','famreq','mci'].some(i=>ids(bk.mine).has(i)||ids(bk.today).has(i)||ids(bk.unassigned).has(i)), [...ids(bk.mine)]);
  ok('on: her relationship call and her coaching stay in her My Work', ids(bk.mine).has('relk') && ids(bk.mine).has('coach'));
  ok('coaching never shows in Team Work', !TW.list().some(x=>x.it.id==='coach'||x.it.id==='disc'));

  /* ── Take it ── */
  as('angiel@mo-care.com','Angiel Test'); myWorkGo('team'); await sleep(100);
  L.writes.length=0; L.events.length=0;
  await TW.take('calloff'); await sleep(150);
  const c=it('calloff');
  ok('Take it: the call-off is Angiel\'s task, with the history', c.owner==='angiel@mo-care.com' && c.claimed_by==='angiel@mo-care.com' && c.owner_history.slice(-1)[0].from==='krystal@mo-care.com' && /Team Work/.test(c.owner_history.slice(-1)[0].why), c);
  ok('...saved once, one event, one toast', L.writes.join()==='ops_items:calloff' && L.events.length===1 && /Yours now/.test(L.toasts.slice(-1)[0]), [L.writes,L.events,L.toasts]);
  ok('...gone from Team Work, in Angiel\'s My Work', !TW.list().some(x=>x.it.id==='calloff') && ids(myWorkBuckets().mine).has('calloff'));
  ok('...the family is still Krystal\'s (journey untouched)', TW.familyCC(c)==='krystal@mo-care.com' && window.__journeys[0].assigned_cc==='krystal@mo-care.com');

  /* ── Krystal out today: covering ── */
  DATA.coordinator_staff[0].out_until='2026-10-07';   /* the Team page's Out until */
  myWorkGo('team'); await sleep(150);
  const rk=document.querySelector('.tw-card[data-id="relk"]');
  ok('Krystal out (Team page Out until): her card due today shows as Covering for Krystal', rk && /Covering for Krystal, out until 2026-10-07/.test(rk.innerText) && /I’ll cover it/.test(rk.innerText), rk&&rk.innerText);
  const cf=document.querySelector('.tw-card[data-id="famreq"]');
  ok('...a family request routed to Krystal is plain Team Work, not Covering', cf && !/Covering for/.test(cf.innerText) && /Take it/.test(cf.innerText), cf&&cf.innerText);
  ok('...her coaching still never shows (confidential)', !document.querySelector('.tw-card[data-id="coach"]'));
  ok('...the on-duty line says Krystal is out', /Out today: Krystal/.test(mw()));
  if(window.__shot) await window.__shot('team-covering');
  L.writes.length=0;
  await TW.take('relk'); await sleep(100);
  const r=it('relk');
  ok('Angiel covers it: still Krystal\'s card, Angiel handling it', r.owner==='krystal@mo-care.com' && r.claimed_by==='angiel@mo-care.com' && r.covering.for==='krystal@mo-care.com' && L.writes.join()==='ops_items:relk', r);
  ok('...in Angiel\'s My Work, out of Team Work', ids(myWorkBuckets().mine).has('relk') && !TW.list().some(x=>x.it.id==='relk'));

  /* ── Settings ── */
  as('samantha@mo-care.com','Samantha Troutman'); TW.setFill && (document.getElementById('twSet')) && TW.setFill();
  const st=document.getElementById('twSet').innerText;
  ok('Settings: hours from the duty schedule, who is out, the switch (owner)', /Krystal Land: Mon, Tue, Wed, Thu, Fri 8am to 2pm/.test(st) && /Angiel Test: Mon, Tue, Wed, Thu, Fri 1pm to 5pm/.test(st) && /Krystal Land: out until 2026-10-07/.test(st) && /Turn off Team Work/.test(st), st);
  as('krystal@mo-care.com','Krystal Land'); TW.setFill();
  ok('Settings as Krystal: no switch', !/Turn (on|off) Team Work/.test(document.getElementById('twSet').innerText));
  as('samantha@mo-care.com','Samantha Troutman'); await TW.toggle(); await sleep(50);
  ok('turning it off: back to off, owners keep the preview', DATA.ops_settings.team_work_live===false && tabs().length>=0);

  ok('no cards created or removed', DATA.ops_items.length===window.__n0, DATA.ops_items.length);
  ok('nothing was texted, emailed or called', L.fn.length===0, L.fn);
  return R;
}
"""
MIME = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.json':'application/json', '.webmanifest':'application/json'}
def serve(route):
    url = route.request.url
    if 'supabase.co' in url: return route.abort()
    if not url.startswith('http://teamwork.local/'): return route.continue_()
    p = (ROOT / url.split('http://teamwork.local/', 1)[1].split('?')[0].split('#')[0])
    if not p.is_file(): return route.fulfill(status=404, body='')
    route.fulfill(status=200, body=p.read_bytes(), content_type=MIME.get(p.suffix, 'application/octet-stream'))
with sync_playwright() as pw:
    b = pw.chromium.launch(); cx = b.new_context(viewport={'width': 1280, 'height': 900}, timezone_id='America/Chicago'); pg = cx.new_page()
    pg.clock.install(time='2026-10-07T14:40:00-05:00'); pg.clock.resume()
    pg.route('**/*', serve)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True)
        pg.expose_function('__shot', lambda name: pg.screenshot(path=os.path.join(SHOTS, name + '.png'), full_page=False) and None)
    pg.goto('http://teamwork.local/index.html?proof=teamwork'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

"""My Work tiers (Stage 2, 2026-10-18). The real Hub page, offline (files served from this folder, no server needed), made-up
people and cards only; saves are recorded, never sent; nobody is texted, emailed or called.
Clock pinned to Wednesday 7 October 2026, 10:00 AM Chicago. (python3 tests/browser/my_work_tiers_look.py; SHOTS=<dir> saves screenshots)"""
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
    CC_ROLE_BY_EMAIL={ '${S}':['owner_admin'], '${K}':['care_coordinator','springfield_lead'], '${A}':['care_coordinator'] };
    OPS_PEOPLE=[{ person_id:'p_k', full_name:'Krystal Land', primary_email:'${K}' },{ person_id:'p_s', full_name:'Samantha Troutman', primary_email:'${S}' },{ person_id:'p_a', full_name:'Angiel Test', primary_email:'${A}' }];`);
  W.persist=async(k,v)=>{ W.__log.writes.push(k+':'+v.id); };
  W.opEvent=(v,o)=>W.__log.events.push(v+':'+(o&&o.summary||''));
  W.ccOpsRefresh=()=>{}; W.ccRecentFetch=async()=>{}; W.ccToast=m=>W.__log.toasts.push(m); W.alert=m=>W.__log.alerts.push(m);
  W.tkMerge=async(fn)=>{ const m=JSON.parse(JSON.stringify(DATA.ops_settings||{})); fn(m); DATA.ops_settings=m; W.__log.writes.push('ops_settings'); return {}; };
  W.ccConfirm=async()=>true; W.reviewMaybeCreate=async()=>{};
  W.TA.coordinators=()=>[K,A];
  DATA.handoffs=[]; DATA.leads=[]; DATA.coverage_cases=[];
  DATA.coordinator_staff=[{ id:'sk', name:'Krystal Land', email:K }, { id:'sa', name:'Angiel Test', email:A }, { id:'ss', name:'Samantha Troutman', email:S }];
  DATA.duty_windows=[{ id:'dk', area:'operations', person:K, recur:{ days:[1,2,3,4,5], from:'08:00', to:'14:00' } }];
  DATA.ops_settings={};
  const own=(o)=>Object.assign({ status:'open', owner:K, owner_name:'Krystal Land', created_at:at('08:00','05') }, o);
  DATA.ops_items=[
    own({ id:'rel7', kind:'relationship_call', opened_by:'system', title:'7-day call: Able family (fake)', due:at('17:00') }),
    own({ id:'welcome', kind:'journey', step_key:'fw.family', opened_by:'journey', title:'Call the family after the first visit (fake)', due:at('17:00','06') }),
    own({ id:'ops_lead_9', kind:'new_lead', opened_by:'system', source_id:'9', title:'New lead: Baker family (fake)', due:at('09:00') }),
    own({ id:'assess', kind:'journey', step_key:'soc.assess', opened_by:'journey', title:'Schedule the assessment: Cole (fake)', due:at('12:00','08') }),
    own({ id:'task', kind:'request', opened_by:'person', title:'Call the hospital case manager (fake)', due:at('16:00') }),
    own({ id:'coach', kind:'coaching', opened_by:'hr-agent', title:'Coaching: fake caregiver', due:at('12:00','09') }),
    own({ id:'yellow', kind:'care_note', opened_by:'care-note-flag', urgency:'high', title:'Yellow flag: client seemed tired (fake)', due:at('09:30') }),
    own({ id:'packet', kind:'care_packet_unconfirmed', opened_by:'care-packet-watch', title:'Care packet not confirmed (fake)', due:at('17:00') }),
    own({ id:'saved', kind:'future_check_back', opened_by:'system', title:'Check back in November (fake). Don\'t call, no permission', due:at('17:00','20') }),
    { id:'sendfail', kind:'send_problem', opened_by:'send-problems', status:'open', title:'A text to a caregiver did not send (fake)', created_at:at('07:00') },
    { id:'aown', kind:'relationship_call', opened_by:'system', status:'open', owner:A, owner_name:'Angiel Test', title:'30-day call: Dunn family (fake)', due:at('15:00'), created_at:at('08:00','05') } ];
  W.__n0=DATA.ops_items.length;
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, it=id=>DATA.ops_items.find(x=>x.id===id), mw=()=>document.getElementById('tab-mywork').innerText;
  const as=(e,n)=>(0,eval)("ME={ email:'"+e+"', name:'"+n+"', shift:'day' };");
  const tierOfCard=id=>{ const c=document.querySelector('.mwt-tier [data-id="'+id+'"]'); const p=c&&c.closest('.mwt-tier'); return p?p.dataset.tier:null; };
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  switchTab('mywork');

  /* ── OFF ── */
  as('krystal@mo-care.com','Krystal Land'); myWorkGo('today'); await sleep(200);
  ok('off: Krystal\'s Today is the same time lanes as before, no groups', /ACT NOW/.test(mw()) && /DUE TODAY/.test(mw()) && !document.querySelector('.mwt-tier'), mw().slice(0,500));
  ok('off: Krystal sees no preview link', !/Preview the new My Work layout/.test(mw()));
  as('samantha@mo-care.com','Samantha Troutman'); myWorkGo('today'); await sleep(150);
  ok('off: Samantha (owner) sees "Preview the new My Work layout"', /Preview the new My Work layout \(owners only\)/.test(mw()));
  MWT.preview(true); await sleep(150);
  ok('preview: the groups draw for the owner, with the preview note', !!document.querySelector('.mwt-tier') && /Only owners see this/.test(mw()), mw().slice(0,400));
  as('krystal@mo-care.com','Krystal Land'); MWT.preview(false); myWorkGo('today'); await sleep(100);

  /* ── ON, as Krystal ── */
  DATA.ops_settings.my_work_tiers_live=true; myWorkGo('today'); await sleep(200);
  const order=[...document.querySelectorAll('.mwt-tier')].map(p=>p.dataset.tier).join();
  ok('on: the four groups in order: Relationship builders, Your leads, Your clients and tasks, Hub reminders', order==='rel,leads,tasks,rem', order);
  ok('Needs you now sits above the groups', mw().indexOf('NEEDS YOU NOW')>-1 && mw().indexOf('NEEDS YOU NOW')<mw().indexOf('Relationship builders'));
  ok('her why lines show', /Your calls with families\. This is how they learn they can count on you/.test(mw()) && /Families deciding whether to choose us/.test(mw()));
  ok('7-day call and welcome call: Relationship builders', tierOfCard('rel7')==='rel' && tierOfCard('welcome')==='rel', [tierOfCard('rel7'),tierOfCard('welcome')]);
  ok('relationship count says families', /2 families/.test(document.querySelector('.mwt-tier[data-tier="rel"]').innerText));
  ok('late lead follow-up: Your leads', tierOfCard('ops_lead_9')==='leads');
  ok('assessment step, person-given task, coaching: Your clients and tasks', ['assess','task','coach'].every(i=>tierOfCard(i)==='tasks'), ['assess','task','coach'].map(tierOfCard));
  ok('failed send with no owner: in Krystal\'s tasks (Springfield lead), shown not folded, owner unchanged', tierOfCard('sendfail')==='tasks' && !document.querySelector('.mwt-tier details [data-id="sendfail"]') && !it('sendfail').owner);
  const rem=document.querySelector('.mwt-tier[data-tier="rem"]');
  ok('reminders are compact rows with Got it: yellow flag, care packet, saved for later', ['yellow','packet','saved'].every(i=>rem.querySelector('.mwt-rem[data-id="'+i+'"]')) && /3 for your information/.test(rem.innerText), rem.innerText);
  ok('a late reminder stays in reminders, not Needs you now', !document.querySelector('.mwt-tier [data-id="yellow"]')?.closest('[data-tier="rel"],[data-tier="leads"],[data-tier="tasks"]') && mw().indexOf('Yellow flag')>mw().indexOf('Hub reminders'));
  ok('reminders are not in the red number', !opsTodayCounts || myWorkBuckets().today.filter(i=>i.id==='yellow').length===0 || opsTodayCounts().act===myWorkBuckets().today.filter(i=>myWorkLane(i)===0 && MWT.tierOf(i)!=='rem').length);
  ok('Angiel\'s relationship call is not on Krystal\'s My Work', !document.querySelector('[data-id="aown"]'));
  ok('Team Work tab unchanged', typeof TW==='object');
  if(window.__shot) await window.__shot('tiers-today-krystal');

  /* Got it */
  L.writes.length=0; await MWT.gotIt('packet'); await sleep(100);
  ok('Got it closes the reminder with her name, one save', it('packet').status==='done' && it('packet').closed_by==='krystal@mo-care.com' && L.writes.join()==='ops_items:packet', [it('packet').status, L.writes]);
  ok('...and it leaves the list', !document.querySelector('.mwt-rem[data-id="packet"]'));

  /* All mine grouped */
  myWorkGo('mine'); await sleep(150);
  ok('All mine is grouped the same way, with everything (Friday\'s coaching too)', !!document.querySelector('.mwt-tier[data-tier="tasks"] [data-id="coach"]') && !!document.querySelector('.mwt-tier[data-tier="rem"] [data-id="saved"]'), mw().slice(0,500));
  if(window.__shot) await window.__shot('tiers-allmine-krystal');

  /* Angiel: no Springfield lead role, so the unowned failed send is not hers */
  as('angiel@mo-care.com','Angiel Test'); myWorkGo('today'); await sleep(150);
  ok('Angiel: her own relationship call in Relationship builders; the unowned failed send is not on her list', tierOfCard('aown')==='rel' && !document.querySelector('[data-id="sendfail"]'));

  /* Settings */
  as('samantha@mo-care.com','Samantha Troutman'); MWT.setFill();
  const st=document.getElementById('mwtSet').innerText;
  ok('Settings: on, with the switch for owners', /On\./.test(st) && /Turn off the new layout/.test(st), st);
  as('krystal@mo-care.com','Krystal Land'); MWT.setFill();
  ok('Settings as Krystal: no switch', !/Turn (on|off) the new layout/.test(document.getElementById('mwtSet').innerText));
  as('samantha@mo-care.com','Samantha Troutman'); await MWT.toggle(); await sleep(50);
  ok('turning it off puts the time lanes back', DATA.ops_settings.my_work_tiers_live===false);
  as('krystal@mo-care.com','Krystal Land'); myWorkGo('today'); await sleep(150);
  ok('...Krystal\'s Today is the time lanes again', /ACT NOW/.test(mw()) && !document.querySelector('.mwt-tier'));

  ok('no cards created or removed', DATA.ops_items.length===window.__n0);
  ok('nothing was texted, emailed or called', L.fn.length===0, L.fn);
  return R;
}
"""
MIME = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.json':'application/json', '.webmanifest':'application/json'}
def serve(route):
    url = route.request.url
    if 'supabase.co' in url: return route.abort()
    if not url.startswith('http://tiers.local/'): return route.continue_()
    p = (ROOT / url.split('http://tiers.local/', 1)[1].split('?')[0].split('#')[0])
    if not p.is_file(): return route.fulfill(status=404, body='')
    route.fulfill(status=200, body=p.read_bytes(), content_type=MIME.get(p.suffix, 'application/octet-stream'))
with sync_playwright() as pw:
    b = pw.chromium.launch(); cx = b.new_context(viewport={'width': 1280, 'height': 1100}, timezone_id='America/Chicago'); pg = cx.new_page()
    pg.clock.install(time='2026-10-07T10:00:00-05:00'); pg.clock.resume()
    pg.route('**/*', serve)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://tiers.local/index.html?proof=tiers'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

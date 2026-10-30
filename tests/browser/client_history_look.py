"""The client profile's ONE History list (Hub CRM Build Plan, Step D, 2026-10-15). The real Hub page, offline, with a
made-up TEST client: calls, the inquiry's log, AxisCare changes, record edits, Journey events and care changes all on one
list, newest first, the chips narrowing it, a call recorded twice shown once, long entries opening in place, and a source
that fails leaving the rest showing with a plain line. A screenshot of the last moment goes to /tmp/ch_fail.png.
(python3 tests/browser/client_history_look.py, static server on 8817 from the repo root)"""
import re, os, sys
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
STUB = re.search(r'STUB = r"""(.*?)"""', open(os.path.join(HERE, 'standup_look.py')).read(), re.S).group(1)
FIX = r"""
(()=>{
  const W=window;
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Land', shift:'day' }; CC_ROLE_BY_EMAIL={ 'krystal@mo-care.com':['care_coordinator'] }; CC_ROLES=['care_coordinator']; CC_ROLES_LOADED=true;");
  (0,eval)("OPS_PEOPLE=[['krystal','Krystal Land'],['sam','Samantha Owner']].map(([e,n])=>({ person_id:'p_'+e, full_name:n, primary_email:e+'@mo-care.com' }));");
  sb.auth.getSession=async()=>({ data:{ session:{ access_token:'t' } } });
  const at=(d,h,m)=>new Date(Date.UTC(2026,9,d,h+5,m)).toISOString();   /* Central (CDT) wall clock */
  const L={ id:'H1', is_test:true, first_name:'Karen', last_name:'Hale', relationship:'daughter', phone:'4175550100', client_first_name:'Dorothy', client_last_name:'Hale (TEST)',
    funding_source:'private', status:'Converted', axiscare_client_id:'48213', said_yes_at:at(9,15,0), created_at:at(7,12,47), source:'Website',
    contact_events:[{ at:at(7,13,12), channel:'call', direction:'out', outcome:'connected', by:'krystal@mo-care.com', note:'Booked the home visit for Friday', duration_s:840 },
      { at:at(12,15,30), channel:'sms', direction:'out', by:'krystal@mo-care.com', ref:'Tasha will be there Wednesday at 9. She is great with gardening talk!' }],
    comm_log:[{ at:at(15,10,2), by:'krystal@mo-care.com', kind:'note', body:'Thursday start time change asked for. Checking with Tasha before I promise it.' }] };
  DATA.leads=[L]; W.__store.leads=[L]; DATA.ops_items=[]; DATA.ops_settings={ client_journey_live:true }; DATA.caregivers=[];
  const T={
    person_source_id:[{ person_id:'PC' }],
    person_relationship:[{ person_id:'PK', relationship:'daughter', active:true }],
    person_identity:[{ id:'PC', display_name:'Dorothy Hale' }, { id:'PK', display_name:'Karen Hale' }],
    call_record:[
      { id:11, recorded_at:at(7,13,13), kind:'summary', direction:'outbound', caller_phone:'4175550100', person_id:'PK', lead_id:'H1', summary:'Booked the home visit for Friday 1:30. Private pay, wants about 12 hours a week.', summary_source:'ghl', axiscare:'posted', ghl_contact_id:'g1' },
      { id:12, recorded_at:at(7,13,14), kind:'outcome', direction:'outbound', caller_phone:'4175550100', person_id:'PK', lead_id:'H1', outcome:'connected' },
      { id:13, recorded_at:at(15,14,14), kind:'summary', direction:'inbound', caller_phone:'4175550100', person_id:'PK', lead_id:'H1', summary:'Karen says her mom really liked Tasha on the first shift and is eating better. She asked whether Thursdays could start at 9 instead of 10 because of a standing hair appointment at 1, and whether the same caregiver can cover the Thursday visits going forward. She also mentioned the walker needs a new tip.', summary_source:'ghl', axiscare:'posted', ghl_contact_id:'g1' }],
    call_placement:[],
    axiscare_change_log:[
      { id:1, at:at(7,13,20), via:'call-disposition', outcome:'sent_confirmed', summary:'Call summary posted', by_who:'krystal@mo-care.com' },
      { id:2, at:at(14,16,40), via:'careplan-tasks', outcome:'sent_confirmed', summary:'Care plan tasks sent (8)', by_who:'krystal@mo-care.com' },
      { id:3, at:at(15,9,42), via:'schedule-push', outcome:'sent_confirmed', summary:'Schedule sent: Mon, Wed, Thu 9 to 1', by_who:'krystal@mo-care.com' }],
    lead_change:[
      { id:1, field:'days_needed', kind:'changed', old_value:'Mon, Wed', new_value:'Mon, Wed, Thu', changed_at:at(12,11,5), changed_by:'krystal@mo-care.com', changed_via:'person' },
      { id:2, field:'number_of_hours', kind:'changed', old_value:'12', new_value:'16', changed_at:at(12,11,5), changed_by:'krystal@mo-care.com', changed_via:'person' }],
    care_circles:[{ id:'C1' }],
    circle_contacts:[{ id:'m1', name:'Karen Hale', relationship:'Daughter', phone:'(417) 555-0100' }, { id:'m2', name:'Linda Hale', relationship:'granddaughter', phone:'417-555-0177' }, { id:'m3', name:'Ed Hale', relationship:'son' }],
    op_events:[{ id:9, at:at(12,15,31), verb:'family_text_sent', summary:'Krystal texted Karen', actor_name:'Krystal Land', item_id:'H1' }]
  };
  W.__fail={};
  const base=W.__q;
  W.__q=(t)=>{ if(!(t in T)) return base(t);
    const p=new Proxy(function(){}, { get(_,k){ if(k==='then') return (a,b)=>Promise.resolve(W.__fail[t]?{ data:null, error:{ message:W.__fail[t] } }:{ data:JSON.parse(JSON.stringify(T[t])), error:null }).then(a,b);
      if(k==='maybeSingle'||k==='single') return ()=>Promise.resolve({ data:T[t][0]||null, error:null }); return ()=>p; } });
    return p; };
  const J={ journey:{ journey_id:'j1', lead_id:'H1', status:'open' }, steps:[], names:{ 'krystal@mo-care.com':'Krystal Land', 'sam@mo-care.com':'Samantha Owner' },
    defs:[{ key:'asmt.visit', title:'Assessment at the home' }], ctx:{}, office:[], is_owner:false,
    events:[{ id:101, at:at(9,14,0), step_key:'asmt.visit', kind:'completed', actor_email:'krystal@mo-care.com', actor_name:'Krystal Land', detail:{} },
      { id:102, at:at(11,10,0), step_key:null, kind:'reassigned_cc', actor_email:'sam@mo-care.com', actor_name:'Samantha Owner', detail:{ from:'sam@mo-care.com', to:'krystal@mo-care.com' } }] };
  const CARE={ axiscare_client_id:'48213', state:'active', pause:null, payer:'private', episodes:[], roles:[], reasons:{ pause:{ hospital:'Hospital stay' }, end:{} }, can:{},
    changes:[{ change_id:'c1', kind:'pause', reason:'hospital', effective_date:'2026-10-13', followup_date:'2026-10-14', made_by:'krystal@mo-care.com', made_by_name:'Krystal Land', made_at:at(13,8,30), explanation:'Overnight at Mercy for observation after a dizzy spell.' },
      { change_id:'c2', kind:'resume', effective_date:'2026-10-14', made_by:'krystal@mo-care.com', made_by_name:'Krystal Land', made_at:at(14,9,0) }] };
  const of=W.fetch; W.__fn=[];
  const GHLT={ '4175550100':{ contact_id:'g1', name:'Karen Hale', messages:[{ at:at(12,15,30), direction:'out', type:'SMS', body:'Tasha will be there Wednesday at 9. She is great with gardening talk!' }] },
    '4175550177':{ contact_id:'g7', name:'Linda Hale', messages:[{ at:at(14,19,5), direction:'in', type:'SMS', body:'Grandma said Tasha made her laugh all morning. Thank you!' }, { at:at(14,19,6), direction:'in', type:'Call', body:'Call (completed)' }] } };
  W.__ghl=[];
  W.fetch=async(u,o)=>{ if(/functions\/v1\/ghl-thread/.test(String(u))){ const b=JSON.parse(o.body); W.__ghl.push(b.phone||b.email);
      if(W.__fail.ghl) return new Response(JSON.stringify({ error:W.__fail.ghl }),{ status:502 });
      return new Response(JSON.stringify(Object.assign({ ok:true }, GHLT[b.phone]||{ contact_id:'', messages:[] })),{ status:200 }); }
    if(/functions\/v1\/client-journey/.test(String(u))){ const b=JSON.parse(o.body); W.__fn.push(b.action);
      if(W.__fail.journey&&b.action==='get') return new Response(JSON.stringify({ error:W.__fail.journey }),{ status:409 });
      return new Response(JSON.stringify(b.action==='care_state'?CARE:b.action==='get'?J:{}),{ status:200 }); }
    return of(u,o); };
})();
"""
T = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,900)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  await openClient({ lead_id:'H1', ax:'48213' },'history'); await sleep(1200);
  const B=()=>document.getElementById('cp_history'), txt=()=>B().innerText;
  ok('the tab shows ONE History card', !!B() && /Communication/.test(txt()) && !document.getElementById('cp_calls') && !document.getElementById('cp_ax_log') && !document.getElementById('cp_change_log'), txt());
  ok('her seven chips, in order', [...B().querySelectorAll('.ch-chip')].map(b=>b.firstChild.textContent).join('|')==='All|Calls|Texts & emails|Notes|Journey|Care changes|AxisCare', [...B().querySelectorAll('.ch-chip')].map(b=>b.textContent));
  const rows=()=>[...B().querySelectorAll('.ch-row')].map(r=>r.innerText.replace(/\s+/g,' '));
  ok('newest first: today\'s call is the first entry', /Karen \(daughter\) called us/.test(rows()[0]||''), rows());
  ok('every source is on the list', /Thursday start time/.test(txt()) && /Schedule sent/.test(txt()) && /changed 2 things/.test(txt()) && /Assessment at the home: done/.test(txt()) && /Care paused/.test(txt()) && /Care resumed/.test(txt()) && /texted/.test(txt()), txt());
  ok('the Oct 7 call shows once (inquiry log + call record + AxisCare call summary)', rows().filter(r=>/We called Karen/.test(r)).length===1 && !/Call summary posted/.test(txt()), rows());
  ok('the copied text from the activity record is not a second entry', rows().filter(r=>/We texted|Krystal texted/i.test(r)).length===1, rows());
  ok('a Family Circle member\'s text names who sent it', rows().some(r=>/Linda \(granddaughter\) texted us/.test(r) && /made her laugh/.test(r)), rows());
  ok('our text to the family names who it went to, and shows once', rows().filter(r=>/We texted Karen \(daughter\)/.test(r)).length===1 && !rows().some(r=>/Krystal texted/.test(r)), rows());
  ok('one lookup per member with a phone, none for a member without one', window.__ghl.length===2 && window.__ghl.indexOf('4175550177')>=0, window.__ghl);
  ok('important changes are marked', /Schedule change/.test(txt()) && /Care needs change/.test(txt()) && /Care Coordinator change/.test(txt()) && /Important/.test(txt()), txt());
  ok('who did it is on the entry', /Care paused · Hospital stay · Krystal/.test(rows().join('\n')), rows());
  ok('EVV forms keep their own place beside it', !!document.getElementById('cp_evv_forms') && !B().contains(document.getElementById('cp_evv_forms')));
  const more=B().querySelector('[data-ch-open]');
  ok('a long call summary is cut, with "more"', !!more && /…more/.test(txt()), txt());
  more.click(); await sleep(150);
  ok('...and opens in place', /standing hair appointment at 1, and whether the same caregiver/.test(txt()) && /\bless\b/.test(txt()));
  [...B().querySelectorAll('.ch-chip')].find(b=>/Care changes/.test(b.textContent)).click(); await sleep(150);
  ok('the Care changes chip shows only care changes', rows().length===3 && rows().filter(r=>/Care change/.test(r)).length===2 && rows().some(r=>/Record edit.*Schedule change/.test(r)), rows());
  [...B().querySelectorAll('.ch-chip')].find(b=>/^Calls/.test(b.textContent)).click(); await sleep(150);
  ok('the Calls chip shows the two calls', rows().length===2 && rows().every(r=>/^.*Call/.test(r)), rows());
  ok('no em dashes on the card', !/\u2014/.test(txt()));
  /* a source fails */
  window.__fail.axiscare_change_log='permission denied'; window.__fail.ghl='GoHighLevel is not connected on this project.'; window.__fail.journey='Client journeys are switched off right now.';
  await chReload(); await sleep(900);
  [...B().querySelectorAll('.ch-chip')].find(b=>/^All/.test(b.textContent)).click(); await sleep(150);
  const F=[/Could not load AxisCare changes \(permission denied\)\. Everything else is shown\./.test(txt()), /Journey history is switched off right now/.test(txt()), /Karen \(daughter\) called us/.test(txt()), /Care paused/.test(txt()), !/Schedule sent/.test(txt())];
  ok('texts that could not load name the member', /Could not load the texts with Linda \(granddaughter\) \(GoHighLevel is not connected on this project\.\)/.test(txt()), txt());
  ok('a failed source is named, and the rest still shows', /Could not load AxisCare changes \(permission denied\)\. Everything else is shown\./.test(txt()) && /Journey history is switched off right now/.test(txt()) && /Karen \(daughter\) called us/.test(txt()) && /Care paused/.test(txt()) && !/Schedule sent/.test(txt()), txt());
  return R; }"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width':1280,'height':1100})
    pg.clock.install(time='2026-10-15T15:00:00-05:00'); pg.clock.resume()
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.goto('http://localhost:8817/index.html?proof=ch'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', STUB); pg.evaluate('s=>(0,eval)(s)', FIX)
    R = pg.evaluate(T)
    pg.screenshot(path='/tmp/ch_fail.png', full_page=False)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', ' | '.join(errs[:3])]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

"""Who did they call for? (2026-10-29, her "do the same for our leads" after the CDS hub's linking; her pick: build on what the
CC Hub has). Kim (a daughter) comes in as her own lead; the ··· menu's window links her to Walter Price: she goes on Walter's People
involved with her phone, her note, form answers, call and call back date move over, her lead closes as linked; search finds Walter
by her name or number; Unlink puts everything back; Someone new makes the lead the client's; a refused save changes nothing.
The real page, offline, made-up people only. (python3 tests/browser/family_link_look.py)"""
import os, mimetypes
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SHOTS = os.environ.get('FL_SHOTS', '')
STUB = r"""
(()=>{
  const W=window; W.__log={ writes:[], alerts:[], toasts:[], opened:[] };
  const clone=x=>JSON.parse(JSON.stringify(x));
  (0,eval)(`sb={ from:()=>{ const p={ select(){return p;}, eq(){return p;}, in(){return p;}, not(){return p;}, order(){return p;}, limit(){return p;}, upsert(){return p;}, update(){return p;},
      maybeSingle:async()=>({data:null,error:null}), single:async()=>({data:null,error:null}), then(a){ return Promise.resolve({data:[],error:null}).then(a); } }; return p; },
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async()=>({data:null,error:null}) },
    auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };`);
  W.persist=async(k,v)=>{ W.__log.writes.push({ k, v:clone(v) }); };
  W.jcLoadConn=async()=>null; W.renderLeads=()=>{}; W.renderFollowUpQueue=()=>{}; W.cjAutoOpen=()=>{};
  W.ccToast=m=>W.__log.toasts.push(m); W.alert=m=>W.__log.alerts.push(m); W.myWorkRefresh=()=>{}; W.opEvent=()=>{};
  W.ccConfirm=async()=>true; W.clientRatesRec=()=>({ levels:{ l1:{ rate:32 }, l2:{ rate:34 }, l3:{ rate:36 } } });
  W.tkMerge=async(apply,what)=>{ const m=DATA.ops_settings||(DATA.ops_settings={}); apply(m); W.__log.writes.push({ k:'ops_settings', v:clone(m), what }); return { error:null }; };
  (0,eval)(`ME={ email:'sam@mo-care.com', name:'Samantha T', shift:'day' }; CC_ROLE_BY_EMAIL={ 'sam@mo-care.com':['owner_admin'], 'kry@mo-care.com':['care_coordinator'] }; CC_ROLES_CHECKED=true;`);
  try{ ['lcPreview','lcStep','ltTab','ltSort','ltPer'].forEach(k=>localStorage.removeItem(k)); }catch(e){} LeadTable.state.tab='all'; LeadTable.state.sort='imp'; LeadTable.state.per=50; LeadTable.state.page=0;
  DATA.coordinator_staff=[{ email:'kry@mo-care.com', name:'Krystal Land' }, { email:'sam@mo-care.com', name:'Samantha T' }];
  DATA.ops_settings={};
  const H=3600e3, D=24*H, ago=ms=>new Date(Date.now()-ms).toISOString(), ymd=n=>LeadRules.addDays(LeadRules.ymd(new Date()), n);
  const call=(ms,o)=>Object.assign({ at:ago(ms), channel:'call', direction:'out', actor:'human', outcome:'connected', by:'kry@mo-care.com' }, o||{});
  const web=ms=>({ at:ago(ms), channel:'web', direction:'in', outcome:'inquiry' });
  DATA.leads=[
    { id:'L1', first_name:'Mark', last_name:'Brooks', relationship:'Son', client_first_name:'Helen', client_last_name:'Brooks', client_city:'Springfield', phone:'4175550142', funding_source:'private', status:'New', assigned_coordinator:'Krystal', why_called:'Helen fell last week and lives alone.', created_at:ago(3*60e3), contact_events:[web(3*60e3)], number_of_hours:'15' },
    { id:'L2', first_name:'Amy', last_name:'Ellis', relationship:'Daughter', client_first_name:'George', client_last_name:'Ellis', client_city:'Nixa', phone:'4175550188', funding_source:'va', status:'Contacted', assigned_coordinator:'Samantha', why_called:'George is a veteran with Parkinson’s.', created_at:ago(2*D), first_human_contact_at:ago(2*D-H), family_last_reply_at:ago(20*60e3),
      contact_events:[call(2*D-H), { at:ago(20*60e3), channel:'sms', direction:'in', actor:'family', outcome:'replied' }] },
    { id:'L3', first_name:'Ruth', last_name:'Adams', client_city:'Springfield', phone:'4175550111', funding_source:'guide', status:'Contacted', assigned_coordinator:'Krystal', why_called:'Respite for her mom, who has dementia.', created_at:ago(7*D), first_human_contact_at:ago(5*D), follow_up_due:ymd(1), follow_up_time:'10:00', follow_up_note:'Call after she talks to her brother', contact_events:[call(5*D)] },
    { id:'L4', first_name:'June', last_name:'Price', relationship:'Wife', client_first_name:'Walter', client_last_name:'Price', client_city:'Rogersville', phone:'4175550174', funding_source:'va', status:'Assessment Scheduled', assigned_coordinator:'Samantha', why_called:'Walter needs help with showers.', created_at:ago(8*D), first_human_contact_at:ago(8*D-H), contact_events:[call(2*D)] },
    { id:'L5', first_name:'Kay', last_name:'Bennett', relationship:'Daughter', client_first_name:'Lois', client_last_name:'Bennett', client_city:'Springfield', phone:'4175550151', funding_source:'ltc', status:'Assessment Scheduled', assigned_coordinator:'Krystal', why_called:'Lois uses a walker and needs help bathing.', created_at:ago(12*D), first_human_contact_at:ago(12*D-H), contact_events:[call(6*D)] },
    { id:'L6', first_name:'Sue', last_name:'Porter', relationship:'Wife', client_first_name:'Jim', client_last_name:'Porter', client_city:'Ozark', phone:'4175550109', funding_source:'private', status:'Contacted', assigned_coordinator:'Krystal', why_called:'Wants to talk to the kids first.', created_at:ago(13*D), first_human_contact_at:ago(13*D-H),
      waiting:{ reason:'family_decision', since:ymd(-6), check_back:ymd(0), note:'Sue is talking to the kids' }, contact_events:[call(6*D)] }
  ];
  DATA.leads[2].comm_log=[{ body:'Ruth asked about weekends', at:ago(3*H), by:'kry@mo-care.com' }];
  DATA.leads[3].contact_events.push({ at:ago(8*H), channel:'call', direction:'in', actor:'family', outcome:'connected' });
  for(let i=0;i<22;i++) DATA.leads.push({ id:'X'+i, first_name:'Test'+i, last_name:'Family', client_first_name:'Pat'+String.fromCharCode(65+i), client_last_name:'Zed', phone:'41755501'+String(i).padStart(2,'0'), funding_source:'private', status:'Contacted', assigned_coordinator:'Krystal', created_at:ago((20+i)*D), first_human_contact_at:ago((19+i)*D), follow_up_due:ymd(3+i), contact_events:[call((19+i)*D)] });
  DATA.leads.push({ id:'K1', first_name:'Kim', last_name:'Price', phone:'4175550199', email:'kim@example.com', relationship:'daughter', status:'Contacted', assigned_coordinator:'Krystal',
    why_called:'Asking about help for her dad', created_at:ago(3*H), first_human_contact_at:ago(2*H), follow_up_due:ymd(1), follow_up_time:'09:00', follow_up_note:'Call Kim back',
    comm_log:[{ body:'Kim wants mornings', at:ago(2*H), by:'kry@mo-care.com' }], contact_events:[{ at:ago(3*H), channel:'web', direction:'in', outcome:'inquiry' }, call(2*H)] });
  W.__people={}; W.__calls=[];
  W.lpiLoadBegan=async l=>({ ep:'ep-'+l.id, people:(W.__people[l.id]||[]).slice() });
  W.lpfCall=async b=>{ W.__calls.push(b); const id=b.episode_id.slice(3);
    if(b.change_kind==='removed'){ W.__people[id]=(W.__people[id]||[]).filter(p=>p.person_key!==b.person_key); return { outcome:'recorded', person_key:b.person_key, row_id:'r2' }; }
    (W.__people[id]=W.__people[id]||[]).push({ person_key:'pk1', row_id:'r1', name:b.name, phone:b.phone, relationship:b.relationship }); return { outcome:'recorded', person_key:'pk1', row_id:'r1' }; };
  W.cl360Identity=async()=>[];
  DATA.care_assessments=[{ id:'A4', lead_id:'L4', status:'Scheduled', visit_date:ymd(1) }, { id:'A5', lead_id:'L5', status:'Completed — Awaiting Plan', visit_date:ymd(-2) }, { id:'A6', lead_id:'L6', status:'Plan Drafted', visit_date:ymd(-6) }];
  DATA.referral_orgs=[]; DATA.post_call_followups=[];
  W.openLeadProfile=(id,tab)=>W.__log.opened.push([id,tab]);
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const $=id=>document.getElementById(id), lead=id=>DATA.leads.find(x=>x.id===id);
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  switchTab('leadsstarts'); await sleep(200); lcPreview(true); await sleep(250);
  const rows=()=>[...document.querySelectorAll('#lbBoard .lt-row:not(.lt-headrow)')], names=()=>rows().map(r=>r.querySelector('.lt-namebtn').textContent);
  /* the ··· menu has the row */
  const kimRow=rows().find(r=>/Kim/.test(r.textContent)); kimRow.querySelector('.lb-more').click(); await sleep(100);
  const menu=[...document.querySelectorAll('.ccpick-row')].map(x=>x.textContent);
  ok('··· has "Who did they call for?"', menu.includes('Who did they call for?'), menu);
  [...document.querySelectorAll('.ccpick-row')].find(x=>x.textContent==='Who did they call for?').click(); await sleep(250);
  const ov=()=>document.querySelector('.fl-ov');
  ok('window · "Who did Kim call for?"', !!ov()&&/Who did Kim call for\?/.test(ov().textContent));
  const q=$('flQ'); q.value='walter'; q.dispatchEvent(new Event('input')); await sleep(80);
  const btns=[...ov().querySelectorAll('#flList button')];
  ok('search · finds Walter Price, "Link Kim to Walter"', btns.length===1&&/Link Kim to Walter/.test(btns[0].textContent), ov().querySelector('#flList').textContent);
  q.value='555-0174'; q.dispatchEvent(new Event('input')); await sleep(80);
  ok('search · by phone too', /Walter Price/.test(ov().querySelector('#flList').textContent));
  const walterBefore=JSON.parse(JSON.stringify(lead('L4')));
  ov().querySelector('#flList button').click(); await sleep(400);
  const W=lead('L4'), K=lead('K1');
  ok('link · Kim on Walter\'s People involved, with her phone', __calls.some(c=>c.action==='record_person'&&c.episode_id==='ep-L4'&&c.name==='Kim Price'&&c.phone==='4175550199'&&c.relationship==='daughter'), __calls);
  ok('link · her note and form answers moved, marked from her call', W.comm_log.some(n=>n.linked_from==='K1'&&/From Kim Price’s call: Kim wants mornings/.test(n.body))&&W.comm_log.some(n=>/own inquiry: Why they called: Asking about help/.test(n.body)), W.comm_log);
  ok('link · her call moved (the inquiry itself did not)', W.contact_events.filter(e=>e.linked_from==='K1').length===1, W.contact_events);
  ok('link · her call back date moved (Walter had none)', String(W.follow_up_due).slice(0,10)===LeadRules.addDays(LeadRules.ymd(new Date()),1)&&W.follow_up_time==='09:00');
  ok('link · Kim\'s lead closed as linked', K.archived===true&&K.linked_to&&K.linked_to.lead_id==='L4'&&K.linked_to.person_key==='pk1'&&/Linked: called for Walter Price/.test(K.archive_reason), K.linked_to);
  ok('link · the window closed with a toast', !ov()&&__log.toasts.some(t=>/Kim Price is linked to Walter Price/.test(t)), __log.toasts);
  ok('list · Kim\'s own row is gone from the open list', !names().some(n=>/Kim Price/.test(n))&&names().includes('Walter Price'), names());
  const wr=rows().find(r=>/Walter/.test(r.textContent));
  ok('list · Walter\'s last activity is Kim\'s call', /2 hours ago/.test(wr.textContent), wr.querySelectorAll('.lt-c-date')[1].textContent);
  $('globalSearch').value='Kim'; renderLeadsStarts(); await sleep(150);
  ok('search · "Kim" finds Walter (her linked family)', names().join('|')==='Walter Price', names());
  $('globalSearch').value='0199'; renderLeadsStarts(); await sleep(150);
  ok('search · her number finds Walter', names().join('|')==='Walter Price', names()); $('globalSearch').value=''; renderLeadsStarts(); await sleep(100);
  K.contact_events.push({ at:new Date(Date.now()+1000).toISOString(), channel:'call', direction:'in', actor:'family', outcome:'connected' }); renderLeadsStarts(); await sleep(150);
  const wr2=rows().find(r=>/Walter/.test(r.textContent));
  ok('list · a later call on Kim\'s own number counts as Walter\'s last activity', /1 min ago/.test(wr2.textContent), wr2.querySelectorAll('.lt-c-date')[1].textContent);
  K.contact_events.pop();
  const note=FamilyLink.noteFor('pk1','L4');
  ok('profile · People involved says linked from her own call, with Unlink', /Linked from Kim’s own call/.test(note)&&/flUnlink\('K1'/.test(note), note);
  lbFilter('set:archived'); await sleep(120);
  ok('Look up · Archived says where she went', /Linked: called for Walter Price/.test($('lbBoard').textContent)); lbFilter('All'); await sleep(100);
  /* Unlink */
  await flUnlink('K1'); await sleep(300);
  const W2=lead('L4'), K2=lead('K1');
  ok('unlink · Kim off People involved', __calls.some(c=>c.change_kind==='removed'&&c.person_key==='pk1'&&c.supersedes_row_id==='r1'), __calls.slice(-1));
  ok('unlink · Walter is as he was', JSON.stringify(W2.comm_log||[])===JSON.stringify(walterBefore.comm_log||[])&&(W2.contact_events||[]).length===(walterBefore.contact_events||[]).length&&(W2.follow_up_due||null)===(walterBefore.follow_up_due||null), { now:[W2.comm_log,W2.follow_up_due], before:[walterBefore.comm_log,walterBefore.follow_up_due] });
  ok('unlink · Kim\'s lead is open again, with everything', !K2.archived&&!K2.linked_to&&!K2.folded_into&&K2.comm_log.length===1&&K2.follow_up_due, K2);
  ok('unlink · back on the list', names().some(n=>/Kim Price/.test(n)), names());
  /* Someone new */
  flOpen('K1'); await sleep(250);
  $('flFirst').value='Rose'; $('flLast').value='Price'; $('flRel').value='daughter'; $('flNew').click(); await sleep(250);
  const K3=lead('K1');
  ok('someone new · this lead is Rose Price\'s, Kim stays the caller', K3.client_first_name==='Rose'&&K3.client_last_name==='Price'&&K3.first_name==='Kim'&&K3.phone==='4175550199'&&K3.relationship==='daughter', K3);
  ok('someone new · the list shows Rose Price', names().includes('Rose Price'), names());
  /* a failed People save changes nothing */
  window.lpfCall=async()=>({ outcome:'refused', message:'stale' });
  const before=JSON.stringify(lead('L4')); flOpen('K1'); await sleep(250); $('flQ').value='walter'; $('flQ').dispatchEvent(new Event('input')); await sleep(60);
  document.querySelector('.fl-ov #flList button').click(); await sleep(300);
  ok('no silent failures · a refused save says so and changes nothing', !!document.querySelector('.fl-ov')&&/Not linked/.test($('flMsg').textContent)&&JSON.stringify(lead('L4'))===before&&!lead('K1').linked_to, $('flMsg').textContent);
  document.querySelector('.fl-ov').remove();
  return R;
}
"""
def serve(route):
    path = route.request.url.split('://', 1)[1].split('/', 1)[1].split('?')[0] or 'index.html'
    f = os.path.join(ROOT, path)
    if os.path.isfile(f):
        route.fulfill(path=f, content_type=mimetypes.guess_type(f)[0] or 'application/octet-stream')
    else:
        route.fulfill(status=404, body='')
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1360, 'height': 1000})
    pg.route('**/*', lambda r: serve(r) if r.request.url.startswith('http://hub.test/') else (r.abort() if 'supabase.co' in r.request.url else r.continue_()))
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://hub.test/index.html?proof=familylink'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True)
        steps = [('1-window', "switchTab('leadsstarts'); lcPreview(true); flOpen('K1'); setTimeout(()=>{ const q=document.getElementById('flQ'); q.value='walter'; q.dispatchEvent(new Event('input')); },300);")]
        pg.evaluate("()=>{ document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; }")
        for name, js in steps:
            pg.evaluate('s=>(0,eval)(s)', js); pg.wait_for_timeout(500)
            pg.wait_for_timeout(500)
            pg.screenshot(path=os.path.join(SHOTS, name + '.png'))
        b.close(); print('saved to', SHOTS); raise SystemExit(0)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

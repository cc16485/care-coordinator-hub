"""The Leads list the GoHighLevel way, made better (2026-10-29, her "do the same for our leads on the Caring Companions sub
account" after the CDS hub's list): tabs All / To call / Home visit / Deciding with counts and late, a count pill, Sort menu
and sortable columns (second click flips), initials, phone from the office line, came in with the time, last activity with an
icon and "8 hours ago", 20/50/100 a page. The real page, offline, made-up people only. (python3 tests/browser/lead_table_look.py)
LT_SHOTS=<folder> saves screenshots instead of running the checks."""
import os, mimetypes
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SHOTS = os.environ.get('LT_SHOTS', '')
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
  DATA.care_assessments=[{ id:'A4', lead_id:'L4', status:'Scheduled', visit_date:ymd(1) }, { id:'A5', lead_id:'L5', status:'Completed — Awaiting Plan', visit_date:ymd(-2) }, { id:'A6', lead_id:'L6', status:'Plan Drafted', visit_date:ymd(-6) }];
  DATA.referral_orgs=[]; DATA.post_call_followups=[];
  W.openLeadProfile=(id,tab)=>W.__log.opened.push([id,tab]);
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, $=id=>document.getElementById(id), txt=id=>(($(id)||{}).textContent||'');
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  switchTab('leadsstarts'); await sleep(200); renderLeadsStarts(); await sleep(200);
  ok('off · the older list, an owner sees "Preview the new Leads list"', /need you now/.test(txt('lbNumbers'))&&/Preview the new Leads list/.test(txt('lbNumbers'))&&!document.querySelector('.lt-row'));
  lcPreview(true); await sleep(250);
  const rows=()=>[...document.querySelectorAll('#lbBoard .lt-row:not(.lt-headrow)')], names=()=>rows().map(r=>r.querySelector('.lt-namebtn').textContent);
  const tabs=[...document.querySelectorAll('.lt-tab')].map(b=>b.textContent.replace(/\s+/g,' ').trim());
  ok('tabs · All 28, To call 25, Home visit 2, Deciding 1, with late counts', tabs[0].startsWith('All 28')&&tabs[1].startsWith('To call 25')&&tabs[2].startsWith('Home visit 2')&&tabs[3].startsWith('Deciding 1')&&/late/.test(tabs[0]), tabs);
  ok('count pill · 28 leads', /28 leads/.test(document.querySelector('.lt-count').textContent));
  ok('pages · 50 a page shows all 28, Page 1 of 1', rows().length===28&&/Page 1 of 1/.test(document.querySelector('.lt-pager').textContent));
  ltPer(20); await sleep(150);
  ok('pages · 20 a page: 20 rows, Page 1 of 2, Prev off', rows().length===20&&/Page 1 of 2/.test(document.querySelector('.lt-pager').textContent)&&document.querySelector('.lt-pagebtns button').disabled);
  ltPage(1); await sleep(150);
  ok('pages · Next shows the other 8', rows().length===8&&/Page 2 of 2/.test(document.querySelector('.lt-pager').textContent)); ltPer(50); await sleep(150);
  const helen=rows().find(r=>/Helen/.test(r.textContent));
  ok('row · initials circle HB', helen.querySelector('.lt-av').textContent==='HB');
  ok('row · phone formatted, rings from the office line', /\(417\) 555-0142/.test(helen.textContent)&&!!helen.querySelector('[data-oc-phone="4175550142"]'));
  ok('row · Came in with the time of day', /Came in\s*[A-Z][a-z]{2} \d+\d*:?\d* ?[ap]m|Came in\s*[A-Z][a-z]{2} \d+.*[ap]m/.test(helen.querySelector('.lt-c-date').textContent), helen.querySelector('.lt-c-date').textContent);
  ok('row · keeps the When pill, owner and Next step', !!helen.querySelector('.ltd')&&/Krystal/.test(helen.textContent)&&/Next:/.test(helen.textContent));
  const walter=rows().find(r=>/Walter/.test(r.textContent)), ruth=rows().find(r=>/Ruth/.test(r.textContent));
  ok('last activity · a call 8 hours ago with the call icon', /8 hours ago/.test(walter.textContent)&&/Call from them/.test(walter.textContent)&&!!walter.querySelectorAll('.lt-c-date')[1].querySelector('svg'), walter.querySelectorAll('.lt-c-date')[1].textContent);
  ok('last activity · a note 3 hours ago', /3 hours ago/.test(ruth.textContent)&&/Note/.test(ruth.textContent), ruth.querySelectorAll('.lt-c-date')[1].textContent);
  ok('last activity · Helen: Not yet', /Last activity\s*Not yet/.test(helen.textContent));
  ltSortCol('name'); await sleep(150);
  ok('sort · Name A to Z', names()[0]==='George Ellis'&&$('ltSort').value==='name:asc', names().slice(0,3));
  ltSortCol('name'); await sleep(150);
  ok('sort · second click flips to Z to A', $('ltSort').value==='name:desc'&&names()[0]==='Walter Price', names().slice(0,3));
  ltSortCol('came'); await sleep(150);
  ok('sort · Came in newest first', names()[0]==='Helen Brooks', names().slice(0,3));
  ltSortBy('last:asc'); await sleep(150);
  ok('sort · Quiet the longest puts never-talked-to first', names()[0]==='Helen Brooks', names().slice(0,3));
  ltSortBy('usd:desc'); await sleep(150);
  ok('sort · Worth the most a month puts Helen ($ from 15 hrs) first', names()[0]==='Helen Brooks', names().slice(0,3));
  ltSortBy('imp'); await sleep(100);
  ltTab('visit'); await sleep(150);
  ok('tab · Home visit: Walter and Lois', names().sort().join('|')==='Lois Bennett|Walter Price', names());
  ltTab('decide'); await sleep(150);
  ok('tab · Deciding: Jim with They said yes', names().join('|')==='Jim Porter'&&!!rows()[0].querySelector('.lb-btn-yes'));
  rows()[0].querySelector('.lt-namebtn').click(); await sleep(50);
  ok('name opens the profile', L.opened.some(o=>o[0]==='L6'), L.opened);
  $('globalSearch').value='Helen'; renderLeadsStarts(); await sleep(150);
  ok('search looks across every tab', names().join('|')==='Helen Brooks', names()); $('globalSearch').value=''; ltTab('all'); await sleep(150);
  ok('the ··· menu is on every row', rows().every(r=>!!r.querySelector('.lb-more')));
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
    pg.goto('http://hub.test/index.html?proof=leadtable'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True)
        steps = [('1-all', "switchTab('leadsstarts'); lcPreview(true); ltPer(20); ltTab('all');"), ('2-sorted-by-last-activity', "ltSortBy('last:desc');"),
                 ('3-home-visit', "ltSortBy('imp'); ltTab('visit');"), ('4-sort-menu', "ltTab('all');")]
        pg.evaluate("()=>{ document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; }")
        for name, js in steps:
            pg.evaluate('s=>(0,eval)(s)', js); pg.wait_for_timeout(500)
            pg.evaluate("()=>{ const e=document.getElementById('lbNumbers'); e.scrollIntoView(); window.scrollBy(0,-90); }"); pg.wait_for_timeout(200)
            pg.screenshot(path=os.path.join(SHOTS, name + '.png'))
        b.close(); print('saved to', SHOTS); raise SystemExit(0)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

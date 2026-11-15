"""Cleaner Leads list, the GoHighLevel layout (2026-11-15, her "Mock up Leads" then "Build it switched off"): one row of tabs,
Add filter / Sort / list or card view / Search, plain columns (Family, Hours, Per month, When, Status, ···) and Rows per page.
Off = today's list; an owner's preview and the switch (ops_settings.leads_simple_live) show the cleaner one with the same families
and order. The real page, offline, made-up people only. (python3 tests/browser/leads_simple_look.py) LTS_SHOTS=<folder> saves screenshots.
Built from the calm-look check: Calmer Leads list (2026-10-30, her "so busy and colorful ... still a lot to the eye"; approved mockup
https://claude.ai/artifact/9ReTBpXJ7PwkbreCVSb8te): colour only means "this needs you". Off = the colourful list as before; an
owner's preview and the switch (ops_settings.leads_calm_live) show the calm one with the same rows, order and buttons. The real
page, offline, made-up people only. (python3 tests/browser/lead_calm_look.py) LTC_SHOTS=<folder> saves screenshots."""
import os, mimetypes
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SHOTS = os.environ.get('LTS_SHOTS', '')
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
  try{ ['lcPreview','lcStep','ltTab','ltSort','ltPer','ltCalm','ltSimple','ltView'].forEach(k=>localStorage.removeItem(k)); }catch(e){} LeadTable.state.tab='all'; LeadTable.state.sort='imp'; LeadTable.state.per=50; LeadTable.state.page=0; LeadTable.state.view='list'; LeadTable.state.q=''; LeadTable.state.fPay=''; LeadTable.state.fReady='';
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
  switchTab('leadsstarts'); await sleep(250);
  ok('off · no cleaner list', !document.querySelector('.lts'));
  ok('off · an owner sees "Preview the cleaner Leads list"', /Preview the cleaner Leads list/.test(txt('lbNumbers')), txt('lbNumbers'));
  lcPreview(true); await sleep(250);
  const oldNames=()=>[...document.querySelectorAll('#lbBoard .lt-row:not(.lt-headrow) .lt-namebtn')].map(b=>b.textContent);
  const before=oldNames().join('|');
  ltSimplePreview(true); await sleep(300);
  const rows=()=>[...document.querySelectorAll('#lbBoard .lts-row:not(.lts-head)')], row=re=>rows().find(r=>re.test(r.textContent)), names=()=>rows().map(r=>r.querySelector('.lt-namebtn').textContent);
  ok('preview · cleaner list and its preview bar', !!document.querySelector('.lts')&&/Preview of the cleaner Leads list/.test(txt('lbNumbers')), txt('lbNumbers'));
  ok('preview · no second preview bar for the other looks', !/Preview of the new Leads list|Preview the calmer/.test(txt('lbNumbers')), txt('lbNumbers'));
  ok('same families in the same order as today', names().join('|')===before, [names(), before]);
  const tabs=[...document.querySelectorAll('.lts-tab')].map(t=>t.textContent);
  ok('one row of tabs with counts', tabs.length===4&&/^All \(\d+\)$/.test(tabs[0])&&/To call/.test(tabs[1]), tabs);
  ok('tools · Add filter, Sort, list or card, Search', !!document.querySelector('.lts-tools .lts-pill')&&/Add filter/.test(txt('lbBoard'))&&!!$('ltSort')&&document.querySelectorAll('.lts-view button').length===2&&!!$('ltQ'));
  const head=[...document.querySelectorAll('.lts-head > *')].map(e=>e.textContent.trim());
  ok('columns · Family, Hours, Per month, When, Status', /^Family/.test(head[0])&&/^Hours/.test(head[1])&&/^Per month/.test(head[2])&&/^When/.test(head[3])&&head[4]==='Status', head);
  const helen=row(/Helen/), george=row(/George/), ruth=row(/Ruth/);
  ok('Family · caller and payer on one gray line', /Son Mark/.test(helen.querySelector('.lt-facts').textContent)&&/Private/.test(helen.querySelector('.lt-facts').textContent)&&!/\/mo/.test(helen.querySelector('.lt-facts').textContent), helen.querySelector('.lt-facts').textContent);
  ok('Hours and Per month', /15 \/ wk/.test(helen.textContent)&&/\$[\d,]+/.test(helen.querySelectorAll('.lts-num')[1].textContent), helen.textContent);
  ok('a family with no hours says Not heard', /Not heard/.test(ruth.textContent), ruth.textContent);
  ok('red row · George texted back', george.classList.contains('ltr-now')&&!!george.querySelector('.ltw-now'), george.className);
  ok('a row that can wait · gray', !ruth.className.match(/ltr-/)&&!!ruth.querySelector('.ltw-wait'), ruth.className);
  ok('Status · New, Replied, Talked', helen.querySelector('.lts-tag').textContent==='New'&&george.querySelector('.lts-tag').textContent==='Replied'&&ruth.querySelector('.lts-tag').textContent==='Talked', [helen,george,ruth].map(r=>r.querySelector('.lts-tag').textContent));
  ok('no buttons on the row, one ··· each', rows().every(r=>r.querySelectorAll('.lts-dots').length===1&&!r.querySelector('.lb-btn')));
  ok('Status words for no answer', LeadTable.statusWord({ contact_events:[{ at:new Date().toISOString(), channel:'call', direction:'out', outcome:'no_answer' }] })==='No answer');
  helen.querySelector('.lts-dots').click(); await sleep(200);
  let pop=document.querySelector('.ccpop');
  ok('··· · Call with the number at the top, then the usual menu', !!pop&&!!pop.querySelector('.ltm-top [data-oc-phone]')&&/Call \(417\) 555-0142/.test(pop.textContent)&&/Open their profile/.test(pop.textContent)&&/Mark lost/.test(pop.textContent), pop&&pop.textContent);
  ccPopClose(); await sleep(100);
  let topBtn=null;
  for(const r of rows()){ r.querySelector('.lts-dots').click(); await sleep(120); pop=document.querySelector('.ccpop'); topBtn=pop&&pop.querySelector('.ltm-top button'); if(topBtn) break; ccPopClose(); await sleep(60); }
  ok('··· · the next step button is there too', !!topBtn, pop&&pop.innerHTML.slice(0,400));
  if(topBtn){ topBtn.click(); await sleep(250); ok('pressing it closes the menu and does its job', !document.querySelector('.ccpop .ltm-top'), document.querySelector('.ccpop')&&document.querySelector('.ccpop').textContent.slice(0,200)); try{ ccPopClose(); }catch(e){} }
  const n0=rows().length;
  ltSearch('george'); await sleep(200);
  ok('Search · finds George and keeps the cursor in the box', names().length===1&&names()[0]==='George Ellis'&&document.activeElement===$('ltQ'), [names(), document.activeElement&&document.activeElement.id]);
  ltSearch('0174'); await sleep(200);
  ok('Search · by phone', names().length===1&&/Walter/.test(names()[0]), names());
  ltSearch(''); await sleep(150);
  ok('Search cleared · everyone back', rows().length===n0);
  document.querySelector('.lts-tools .lts-pill').click(); await sleep(200);
  pop=document.querySelector('.ccpop'); pop.querySelector('#ltfPay').value='va'; pop.querySelector('#ltfGo').click(); await sleep(200);
  ok('Add filter · payer VA leaves George and Walter, with a chip', names().length===2&&names().every(n=>/George|Walter/.test(n))&&/Payer: /.test(txt('lbBoard')), [names(), [...document.querySelectorAll('.lts-chip')].map(c=>c.textContent)]);
  const tabsNow=[...document.querySelectorAll('.lts-tab')].map(t=>t.textContent);
  ok('tab counts follow the filter', /^All \(2\)$/.test(tabsNow[0]), tabsNow);
  document.querySelector('.lts-chip button').click(); await sleep(200);
  ok('chip × takes the filter off', rows().length===n0&&!document.querySelector('.lts-chip'));
  document.querySelector('.lts-tools .lts-pill').click(); await sleep(200);
  pop=document.querySelector('.ccpop'); pop.querySelector('#ltfOwner').value='Samantha'; pop.querySelector('#ltfGo').click(); await sleep(250);
  ok('Add filter · whose families', names().length>0&&names().every(n=>/George|Walter/.test(n))&&/Showing Samantha/.test(txt('lbBoard')), names());
  document.querySelector('.lts-chip button').click(); await sleep(250);
  ok('owner chip off', rows().length===n0);
  ltSortCol('name'); await sleep(150);
  ok('heading sorts · Family A to Z', names()[0]==='George Ellis', names().slice(0,3)); ltSortBy('imp'); await sleep(100);
  ltSortCol('hours'); await sleep(150);
  ok('heading sorts · Hours, most first', /Helen/.test(names()[0]), names().slice(0,3)); ltSortBy('imp'); await sleep(100);
  ltPer(20); await sleep(150);
  ok('Rows per page · 20, "1 to 20 of N", Next works', rows().length===20&&/Rows per page/.test(txt('lbBoard'))&&/1 to 20 of \d+/.test(document.querySelector('.lts-pager').textContent), document.querySelector('.lts-pager')&&document.querySelector('.lts-pager').textContent);
  ltPage(1); await sleep(150);
  ok('page 2', /21 to \d+ of \d+/.test(document.querySelector('.lts-pager').textContent)); ltPer(50); await sleep(100);
  ltView('cards'); await sleep(200);
  ok('card view · cards, no table', !!document.querySelector('.lts-cards .lc-card, .lts-cards article')&&!document.querySelector('.lts-head'), (document.querySelector('.lts-cards')||{}).innerHTML&&document.querySelector('.lts-cards').innerHTML.slice(0,200));
  ltView('list'); await sleep(150);
  ok('list view again', !!document.querySelector('.lts-head'));
  ltTab('decide'); await sleep(150);
  ok('Deciding tab', rows().length>0&&rows().length<n0); ltTab('all'); await sleep(150);
  ok('nothing was saved while previewing', !L.writes.some(w=>w.k==='ops_settings'));
  ltSimplePreview(false); await sleep(200);
  ok('Back to today\'s list', !document.querySelector('.lts')&&oldNames().join('|')===before);
  await ltsToggle(); await sleep(200);
  ok('switch · an owner turns it on for everyone', DATA.ops_settings.leads_simple_live===true&&!!document.querySelector('.lts')&&!/Preview of the cleaner/.test(txt('lbNumbers')));
  await ltsToggle(); await sleep(200);
  ok('switch · off again', DATA.ops_settings.leads_simple_live===false&&!document.querySelector('.lts'));
  lcPreview(false); ltSimplePreview(true); await sleep(250);
  ok('preview works even when the older board is showing', !!document.querySelector('.lts'));
  ltSimplePreview(false); await sleep(150);
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
    pg.goto('http://hub.test/index.html?proof=leadsimple'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True)
        steps = [('1-today', "switchTab('leadsstarts'); lcPreview(true); ltPer(20); ltTab('all');"), ('2-cleaner', "ltSimplePreview(true);"), ('3-cards', "ltView('cards');")]
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

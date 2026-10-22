"""How did they reach us? (2026-10-22, her mockup board 3 of https://claude.ai/artifact/UsJfjnivkUHXSRJjsRgi2U): with the switch OFF
Add lead is as before (the "talking to them on this call" box, nothing new saved); ON it asks how the family reached us,
Called us counts as the first conversation, a website lead changed to Called us stops its first-call alerts, the Leads cards
show the tag, and only an owner can flip the switch. The real page, offline, made-up people only; saves are recorded, never
sent. (python3 tests/browser/reached_by_look.py)  RB_SHOTS=<folder> also saves screenshots."""
import os, mimetypes
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SHOTS = os.environ.get('RB_SHOTS', '')
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
  W.ccConfirm=async()=>true;
  W.tkMerge=async(apply,what)=>{ const m=DATA.ops_settings||(DATA.ops_settings={}); apply(m); W.__log.writes.push({ k:'ops_settings', v:clone(m), what }); return { error:null }; };
  (0,eval)(`ME={ email:'sam@mo-care.com', name:'Samantha T', shift:'day' }; CC_ROLE_BY_EMAIL={ 'sam@mo-care.com':['owner_admin'], 'kry@mo-care.com':['care_coordinator'] }; CC_ROLES_CHECKED=true;`);
  try{ localStorage.removeItem('lcPreview'); localStorage.removeItem('lcStep'); }catch(e){}
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
  DATA.care_assessments=[{ id:'A4', lead_id:'L4', status:'Scheduled', visit_date:ymd(1) }, { id:'A5', lead_id:'L5', status:'Completed — Awaiting Plan', visit_date:ymd(-2) }, { id:'A6', lead_id:'L6', status:'Plan Drafted', visit_date:ymd(-6) }];
  DATA.referral_orgs=[]; DATA.post_call_followups=[];
  W.openLeadProfile=(id,tab)=>W.__log.opened.push([id,tab]); W.ckCheckNewInquiry=async()=>({proceed:true, note:''}); W.cjAutoOpen=()=>{}; W.opsReconcileLeads=()=>{};
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, $=id=>document.getElementById(id), shown=el=>!!el&&getComputedStyle(el).display!=='none';
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  const lead=id=>DATA.leads.find(x=>x.id===id);

  /* ── off: the form as before ── */
  openLeadModal(); await sleep(100);
  ok('off · Add lead shows the "talking to them on this call" box, not the new question', shown($('leadTalkedRow'))&&!shown($('leadReachedRow')));
  closeModal('leadModalBackdrop');
  $('lead_first_name'); openLeadModal(); await sleep(80); $('lead_first_name').value='Offy'; $('lead_phone').value='4175550100'; $('lead_talked_now').checked=true;
  await saveLead(); await sleep(150);
  const off=DATA.leads.find(x=>x.first_name==='Offy');
  ok('off · saving writes no reached_by, and the old box still counts the call', off&&!('reached_by' in off)&&!!off.first_human_contact_at, off);

  /* ── on: the question ── */
  DATA.ops_settings.lead_reached_by_live=true;
  openLeadModal(); await sleep(100);
  ok('on · Add lead asks "How did they reach us?" with six answers, Called us picked; the old box steps aside', shown($('leadReachedRow'))&&!shown($('leadTalkedRow'))&&$('leadReachedPills').querySelectorAll('.rb-pill').length===6&&$('leadReachedPills').querySelector('.rb-pill.on').textContent==='Called us', $('leadReachedPills').textContent);
  ok('on · the note says it counts as the first conversation', /No first-call alerts/.test($('leadReachedNote').textContent));
  [...$('leadReachedPills').querySelectorAll('.rb-pill')].find(b=>b.textContent==='Website form').click(); await sleep(30);
  ok('on · picking Website form: the note says the 5-minute clock starts', /5-minute first-call clock starts/.test($('leadReachedNote').textContent)&&$('lead_reached_by').value==='web');
  [...$('leadReachedPills').querySelectorAll('.rb-pill')].find(b=>b.textContent==='Called us').click(); await sleep(30);
  $('lead_first_name').value='Callie'; $('lead_phone').value='4175550111';
  await saveLead(); await sleep(150);
  const c=DATA.leads.find(x=>x.first_name==='Callie');
  ok('on · new lead, Called us: saved as call, counts as talked to, Contacted, one conversation', c&&c.reached_by==='call'&&!!c.first_human_contact_at&&c.status==='Contacted'&&(c.contact_events||[]).filter(e=>e.outcome==='connected').length===1, c);

  /* ── Greg: a website lead, changed to Called us later ── */
  const g=lead('L1'); ok('Greg-like lead: a website form, nobody has talked to them', !g.first_human_contact_at);
  openLeadModal('L1'); await sleep(100);
  ok('editing a website lead: the question shows Website form', $('lead_reached_by').value==='web', $('lead_reached_by').value);
  [...$('leadReachedPills').querySelectorAll('.rb-pill')].find(b=>b.textContent==='Called us').click(); await sleep(30);
  await saveLead(); await sleep(150);
  ok('changed to Called us: counts as talked to now (no more first-call alerts)', lead('L1').reached_by==='call'&&!!lead('L1').first_human_contact_at&&/Set on the lead/.test(lead('L1').contact_events.at(-1).note), lead('L1').contact_events);
  const n1=lead('L1').contact_events.length; openLeadModal('L1'); await sleep(80); await saveLead(); await sleep(150);
  ok('saving it again writes nothing more', lead('L1').contact_events.length===n1);

  /* ── the cards ── */
  lcPreview(true); switchTab('leadsstarts'); await sleep(150); renderLeadsStarts(); await sleep(200);
  const txt=$('lbBoard').textContent;
  ok('cards · the tags show: Called us (Helen, changed) and Website form', /Called us/.test(txt), txt.slice(0,400));
  DATA.ops_settings.lead_reached_by_live=false; renderLeadsStarts(); await sleep(150);
  ok('cards · switch off: no tags, the website pill as before', !/Called us/.test($('lbBoard').textContent));
  lcPreview(false);

  /* ── the switch: owners only ── */
  (0,eval)(`ME={ email:'kry@mo-care.com', name:'Krystal Land', shift:'day' };`); L.alerts.length=0; await rbToggle(); await sleep(50);
  ok('switch · a coordinator cannot turn it on', !DATA.ops_settings.lead_reached_by_live&&L.alerts.some(a=>/Only Samantha or Zachary/.test(a)), L.alerts);
  (0,eval)(`ME={ email:'sam@mo-care.com', name:'Samantha T', shift:'day' };`); await rbToggle(); await sleep(80);
  ok('switch · the owner turns it on, saved with the date', DATA.ops_settings.lead_reached_by_live===true&&!!DATA.ops_settings.lead_reached_by_live_since);
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
    pg.goto('http://hub.test/index.html?proof=reachedby'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True)
        pg.evaluate("()=>{ document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; DATA.ops_settings.lead_reached_by_live=true; }")
        pg.evaluate("()=>{ openLeadModal(); document.getElementById('lead_first_name').value='Greg'; document.getElementById('lead_phone').value='(417) 555-0123'; }"); pg.wait_for_timeout(500)
        pg.evaluate("()=>document.getElementById('leadReachedRow').scrollIntoView({block:'center'})"); pg.wait_for_timeout(200)
        pg.screenshot(path=os.path.join(SHOTS, '1-add-lead-question.png'))
        pg.evaluate("()=>{ closeModal('leadModalBackdrop'); const g=DATA.leads.find(x=>x.id==='L1'); ReachedBy.applyOnSave(g,'call',{isNew:false,by:'kry@mo-care.com',push:ldPush}); g.referral_source_name='Mercy discharge planner'; lcPreview(true); switchTab('leadsstarts'); renderLeadsStarts(); }"); pg.wait_for_timeout(600)
        pg.evaluate("()=>{ const e=document.getElementById('lbNumbers'); e.scrollIntoView(); window.scrollBy(0,-90); }"); pg.wait_for_timeout(200)
        pg.screenshot(path=os.path.join(SHOTS, '2-cards-tags.png'))
        b.close(); print('saved to', SHOTS); raise SystemExit(0)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

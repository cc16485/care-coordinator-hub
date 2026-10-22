"""Leads as cards (2026-10-22, her approved mockup https://claude.ai/artifact/UsJfjnivkUHXSRJjsRgi2U): with the switch OFF the
Leads page is the list as before and only an owner sees "Preview the new card look"; the owner's preview shows three steps
(To call, Home visit, Deciding) and one card per family with both dates; a coordinator still sees the list; the Settings
switch is owners only and, once on, everyone sees the cards; every card button reaches what the list's buttons reach.
The real page, offline, made-up people only; saves are recorded, never sent. (python3 tests/browser/lead_cards_look.py)
LC_SHOTS=<folder> saves screenshots of the list and the three steps there instead of running the checks."""
import os, mimetypes
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SHOTS = os.environ.get('LC_SHOTS', '')
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
  W.openLeadProfile=(id,tab)=>W.__log.opened.push([id,tab]);
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, $=id=>document.getElementById(id), txt=id=>(($(id)||{}).textContent||'');
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  switchTab('leadsstarts'); await sleep(200); renderLeadsStarts(); await sleep(200);

  /* ── off: the list as before ── */
  ok('off · the list as before (Need you now tile, no cards)', /need you now/.test(txt('lbNumbers'))&&!document.querySelector('.lc-card'), txt('lbNumbers').slice(0,300));
  ok('off · an owner sees "Preview the new card look"', /Preview the new card look/.test(txt('lbNumbers')));

  /* ── the owner's preview ── */
  document.querySelector('.lb-preview-ask button').click(); await sleep(250);
  const cards=()=>[...document.querySelectorAll('#lbBoard .lc-card')];
  ok('preview · cards show, with the preview bar', cards().length>0&&/Only you see it/.test(txt('lbNumbers')), txt('lbNumbers'));
  const stepN=[...document.querySelectorAll('.lc-step')].map(b=>b.querySelector('.lc-step-n').textContent+' '+b.querySelector('.lc-step-l').textContent).join('|');
  ok('preview · three steps: To call 3, Home visit 2, Deciding 1', stepN==='3 To call|2 Home visit|1 Deciding', stepN);
  const names=()=>cards().map(c=>c.querySelector('.lc-name').textContent);
  ok('To call · Helen (new) and George (replied) are red and on top, Ruth (follow-up tomorrow) last', names().join('|')==='Helen Brooks|George Ellis|Ruth Adams'||names().join('|')==='George Ellis|Helen Brooks|Ruth Adams', names());
  const helen=cards().find(c=>/Helen/.test(c.textContent));
  ok('card · both dates: "Lead came in Today, …" and "Last contact None yet"', /Lead came in\s*Today, /.test(helen.textContent)&&/Last contact\s*None yet/.test(helen.textContent), helen.textContent);
  ok('card · payer, town, hours, From website, red due, next step, owner', /Private pay/.test(helen.textContent)&&/Springfield/.test(helen.textContent)&&/About 15 hrs a week/.test(helen.textContent)&&/From website/.test(helen.textContent)&&!!helen.querySelector('.lcd-red')&&/Next:/.test(helen.textContent)&&/Krystal’s family/.test(helen.textContent), helen.textContent);
  const ruth=cards().find(c=>/Ruth/.test(c.textContent));
  ok('card · a follow-up tomorrow says its day ("Tomorrow, 10 am")', /Tomorrow, 10 am/.test(ruth.textContent), ruth.textContent);
  ok('page · the line under Leads talks about steps, not groups', /in three steps/.test(document.getElementById('lsSubtitle').textContent));
  const george=cards().find(c=>/George/.test(c.textContent));
  ok('card · last contact is the family\'s text', /Last contact\s*Amy texted, today, /.test(george.textContent), george.textContent);
  ok('card · Call rings from the office line (same button as the list)', !!helen.querySelector('[data-oc-phone="4175550142"]'));
  lcStep('visit'); await sleep(200);
  ok('Home visit · Walter (booked) and Lois (plan to write)', names().sort().join('|')==='Lois Bennett|Walter Price', names());
  const lois=cards().find(c=>/Lois/.test(c.textContent));
  ok('Home visit · the last contact is the home visit', /Last contact\s*Home visit, /.test(lois.textContent), lois.textContent);
  ok('Home visit · the cards say home visit, not assessment', !/ssessment/.test(cards().map(c=>c.textContent).join(' '))&&/Open home visit/.test(lois.textContent), lois.textContent);
  lcStep('decide'); await sleep(200);
  ok('Deciding · Jim, with They said yes', names().join('|')==='Jim Porter'&&!!cards()[0].querySelector('.lc-yes'), names());
  cards()[0].querySelector('.lc-open').click(); await sleep(50);
  ok('card · Open opens the profile', L.opened.some(o=>o[0]==='L6'), L.opened);

  /* ── the owner filter still works ── */
  lcStep('call'); await sleep(100); lbOwner('Samantha'); await sleep(200);
  ok('Showing Samantha\'s · only George in To call', names().join('|')==='George Ellis', names()); lbOwner(''); await sleep(150);

  /* ── a coordinator never sees the preview ── */
  (0,eval)(`ME={ email:'kry@mo-care.com', name:'Krystal Land', shift:'day' };`); renderLeadsStarts(); await sleep(200);
  ok('coordinator · the list, no preview link, even with the owner\'s preview on in this browser', !cards().length&&!/Preview the new card look/.test(txt('lbNumbers')), txt('lbNumbers').slice(0,200));
  L.alerts.length=0; await lcToggle(); await sleep(50);
  ok('coordinator · cannot turn it on', !DATA.ops_settings.leads_cards_live&&L.alerts.some(a=>/Only Samantha or Zachary/.test(a)), L.alerts);

  /* ── the owner turns it on for everyone ── */
  (0,eval)(`ME={ email:'sam@mo-care.com', name:'Samantha T', shift:'day' };`); lcPreview(false); await sleep(100);
  await lcToggle(); await sleep(150);
  ok('switch · on, saved with the date it went on', DATA.ops_settings.leads_cards_live===true&&!!DATA.ops_settings.leads_cards_live_since&&L.writes.some(w=>w.k==='ops_settings'), DATA.ops_settings);
  (0,eval)(`ME={ email:'kry@mo-care.com', name:'Krystal Land', shift:'day' };`); renderLeadsStarts(); await sleep(200);
  ok('switch on · the coordinator sees the cards, no preview bar', cards().length>0&&!/Only you see it/.test(txt('lbNumbers')));
  lbFilter('set:past'); await sleep(150);
  ok('switch on · Look up still works, with a way back', /Back to the cards/.test(txt('lbFilters'))&&!cards().length);
  lbFilter('All'); await sleep(150);
  (0,eval)(`ME={ email:'sam@mo-care.com', name:'Samantha T', shift:'day' };`); await lcToggle(); await sleep(150); renderLeadsStarts(); await sleep(200);
  ok('switch off again · the line under Leads is the list\'s again', /Work the top group/.test(document.getElementById('lsSubtitle').textContent));
  ok('switch off again · back to the list', DATA.ops_settings.leads_cards_live===false&&!cards().length&&/need you now/.test(txt('lbNumbers')));
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
    pg.goto('http://hub.test/index.html?proof=leadcards'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True)
        steps = [('1-list-before', "switchTab('leadsstarts'); renderLeadsStarts();"), ('2-cards-to-call', "lcPreview(true); lcStep('call');"),
                 ('3-cards-home-visit', "lcStep('visit');"), ('4-cards-deciding', "lcStep('decide');")]
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

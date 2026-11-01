"""Send to Caring CDS (2026-11-01, her ask: CDS callers on 417-234-8494 go to the CDS sub-account, out of our follow-up). The real page,
offline, made-up people only: off shows nothing; an owner's preview shows the Leads card; Send asks, calls the server with the lead id
only, closes the lead as Referred to Caring CDS, and the card empties; a part that did not finish stays with Try again; the Settings
switch. (python3 tests/browser/send_to_cds_look.py) STC_SHOTS=<folder> saves screenshots."""
import os, mimetypes
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SHOTS = os.environ.get('STC_SHOTS', '')
STUB = r"""
(()=>{
  const W=window; W.__log={ writes:[], alerts:[], toasts:[], asked:[], posts:[] };
  const clone=x=>JSON.parse(JSON.stringify(x));
  (0,eval)(`sb={ from:()=>{ const p={ select(){return p;}, eq(){return p;}, in(){return p;}, not(){return p;}, gte(){return p;}, order(){return p;}, limit(){return p;}, upsert(){return p;}, update(){return p;},
      maybeSingle:async()=>({data:null,error:null}), single:async()=>({data:null,error:null}), then(a){ return Promise.resolve({data:[],error:null}).then(a); } }; return p; },
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async()=>({data:null,error:null}) },
    auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };`);
  W.persist=async(k,v)=>{ W.__log.writes.push({ k, v:clone(v) }); };
  W.jcLoadConn=async()=>null; W.renderLeads=()=>{}; W.renderFollowUpQueue=()=>{}; W.cjAutoOpen=()=>{};
  W.ccToast=m=>W.__log.toasts.push(m); W.alert=m=>W.__log.alerts.push(m); W.myWorkRefresh=()=>{}; W.opEvent=()=>{};
  W.ccConfirm=async(m)=>{ W.__log.asked.push(m); return true; };
  W.tkMerge=async(apply,what)=>{ const m=DATA.ops_settings||(DATA.ops_settings={}); apply(m); W.__log.writes.push({ k:'ops_settings', v:clone(m), what }); return { error:null }; };
  W.__answer={ ok:true, cds:{ added:true, name:'Ann Lee' }, ghl:{ done:['a','b','c'], problems:[], contact_id:'C1', workflows_listed:2 } };
  const f0=W.fetch; W.fetch=async(u,o)=>{ if(String(u).includes('/functions/v1/send-to-cds')){ W.__log.posts.push(JSON.parse(o.body)); return new Response(JSON.stringify(W.__answer),{status:200}); } return f0(u,o); };
  (0,eval)(`ME={ email:'sam@mo-care.com', name:'Samantha T', shift:'day' }; CC_ROLE_BY_EMAIL={ 'sam@mo-care.com':['owner_admin'] }; CC_ROLES_CHECKED=true;`);
  try{ ['cc_send_to_cds_preview','lcPreview'].forEach(k=>localStorage.removeItem(k)); }catch(e){}
  DATA.coordinator_staff=[{ email:'sam@mo-care.com', name:'Samantha T' }];
  DATA.ops_settings={};
  const ago=ms=>new Date(Date.now()-ms).toISOString(), D=864e5;
  DATA.leads=[
    { id:'L1', first_name:'Kim', last_name:'Lee', relationship:'Daughter', client_first_name:'Ann', client_last_name:'Lee', phone:'4175550142', funding_source:'cds', status:'New', assigned_coordinator:'Samantha', why_called:'Mom has Medicaid; Kim wants to be paid as her caregiver.', created_at:ago(2*3600e3), contact_events:[] },
    { id:'L2', first_name:'Bo', last_name:'Hart', client_first_name:'Rita', client_last_name:'Hart', phone:'4175550188', funding_source:'medicaid', status:'Contacted', assigned_coordinator:'Samantha', created_at:ago(3*D), first_human_contact_at:ago(3*D), contact_events:[] },
    { id:'L3', first_name:'Sue', last_name:'Porter', client_first_name:'Jim', client_last_name:'Porter', phone:'4175550109', funding_source:'private', status:'Contacted', assigned_coordinator:'Samantha', created_at:ago(5*D), first_human_contact_at:ago(5*D), contact_events:[] }
  ];
  DATA.care_assessments=[]; DATA.referral_orgs=[]; DATA.post_call_followups=[]; DATA.call_lead_marks=[];
  W.openLeadProfile=()=>{};
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, $=id=>document.getElementById(id), txt=id=>(($(id)||{}).textContent||'');
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  switchTab('leadsstarts'); await sleep(250);
  ok('off · no CDS card on Leads', !/SOUNDS LIKE CDS/.test(txt('lbNumbers')));
  ok('off · an owner is offered the preview', /Preview Send to Caring CDS/.test(txt('lbNumbers')), txt('lbNumbers').slice(0,300));
  SendToCds.preview(true); await sleep(250);
  const t=txt('lbNumbers');
  ok('preview · the card lists the CDS and Medicaid leads, not the private one', /SOUNDS LIKE CDS, NOT SENT YET \(2\)/.test(t) && /Ann Lee/.test(t) && /Rita Hart/.test(t) && !/Jim Porter/.test(t), t.slice(0,400));
  ok('preview · says only you see it', /Preview: only you see Send to Caring CDS/.test(t));
  const btn=[...document.querySelectorAll('#lbNumbers button')].find(b=>/Send to Caring CDS/.test(b.textContent)&&/L1/.test(b.getAttribute('onclick')));
  btn.click(); await sleep(400);
  ok('Send asks first, nothing goes to the family', /Send Ann Lee to Caring CDS\?/.test(L.asked[0]||'') && /Nothing is sent to the family/.test(L.asked[0]||''), L.asked);
  ok('the server gets the lead id only', JSON.stringify(L.posts[0])==='{"lead_id":"L1"}', L.posts);
  const l=DATA.leads[0];
  ok('the lead closes as Referred to Caring CDS', l.status==='Lost' && l.lost_reason_key==='referred_cds' && l.sent_to_cds && l.sent_to_cds.by, l);
  ok('saved once to leads', L.writes.filter(w=>w.k==='leads').length===1);
  ok('told what happened', /Sent to Caring CDS\. Their office gets the alert and calls Ann\./.test(L.toasts.join(' ')), L.toasts);
  ok('the card now has only Rita', /NOT SENT YET \(1\)/.test(txt('lbNumbers')) && !/Ann Lee/.test(txt('lbNumbers')));
  window.__answer={ ok:true, cds:{ added:true }, ghl:{ done:['a'], problems:['out of workflow wf-1: GoHighLevel answered 422'], contact_id:'C2', workflows_listed:1 } };
  [...document.querySelectorAll('#lbNumbers button')].find(b=>/Send to Caring CDS/.test(b.textContent)).click(); await sleep(400);
  ok('a part that did not finish is shown', /Not finished in GoHighLevel: out of workflow wf-1/.test(L.alerts.join(' ')), L.alerts);
  ok('it stays on Leads with Try again', /SENT TO CDS, NOT FINISHED \(1\)/.test(txt('lbNumbers')) && [...document.querySelectorAll('#lbNumbers button')].some(b=>b.textContent==='Try again'));
  /* Settings switch */
  stcSetFill(); ok('Settings · off, an owner can turn it on', /Off\./.test(txt('stcSetNow')) && $('stcToggleBtn').style.display!=='none');
  await stcToggle($('stcToggleBtn')); await sleep(150);
  ok('Settings · on for everyone', DATA.ops_settings.send_to_cds_live===true && /On\./.test(txt('stcSetNow')));
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
    pg.goto('http://hub.test/index.html?proof=sendcds'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True)
        pg.evaluate("()=>{ document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; switchTab('leadsstarts'); SendToCds.preview(true); }")
        pg.wait_for_timeout(600)
        pg.evaluate("()=>{ const e=document.getElementById('lbNumbers'); e.scrollIntoView(); window.scrollBy(0,-90); }"); pg.wait_for_timeout(200)
        pg.screenshot(path=os.path.join(SHOTS, 'leads-card.png'))
        b.close(); print('saved to', SHOTS); raise SystemExit(0)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

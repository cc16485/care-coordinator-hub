"""The database guard on lead owners, the Hub half (audit step 8, Samantha 2026-10-18): when the database refuses a lead save
because it changes who owns the lead (LEAD_OWNER_GUARD), the Hub says why, puts the lead back as it is on file, and never
queues the refused save to retry. Any other failed save still goes to the retry queue. The owners-only switch in Settings.
Servers faked; made-up people only. (python3 tests/browser/owner_guard_look.py)"""
import os, mimetypes
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
STUB = r"""
(()=>{
  const W=window; W.__log={ writes:[], alerts:[], toasts:[] };
  const clone=x=>JSON.parse(JSON.stringify(x));
  (0,eval)(`sb={ from:()=>{ const p={ select(){return p;}, eq(){return p;}, in(){return p;}, not(){return p;}, order(){return p;}, limit(){return p;},
      maybeSingle:async()=>({data:null,error:null}), then(a){ return Promise.resolve({data:[],error:null}).then(a); } }; return p; },
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async()=>({data:null,error:null}) },
    auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };`);
  W.ckCheckNewInquiry=async()=>({proceed:true, note:''});
  W.jcLoadConn=async()=>null; W.renderLeads=()=>{}; W.renderFollowUpQueue=()=>{}; W.cjAutoOpen=()=>{};
  W.ccToast=m=>W.__log.toasts.push(m); W.alert=m=>W.__log.alerts.push(m); W.myWorkRefresh=()=>{}; W.opEvent=()=>{};
  W.ccPrompt=async()=>'the family asked for Angiel'; W.ccConfirm=async()=>true;
  (0,eval)(`ME={ email:'kry@mo-care.com', name:'Krystal Land', shift:'day' }; CC_ROLE_BY_EMAIL={ 'sam@mo-care.com':['owner_admin'], 'kry@mo-care.com':['care_coordinator'] };`);
  DATA.coordinator_staff=[{ email:'kry@mo-care.com', name:'Krystal Land' }, { email:'ang@mo-care.com', name:'Angiel Rose' }, { email:'sam@mo-care.com', name:'Samantha T' }];
  DATA.ops_settings={ lead_rotation_live:true, lead_rotation:{ people:[{ name:'Krystal', on:true }, { name:'Angiel', on:true }] } };
  DATA.leads=[{ id:'k1', first_name:'Kay', last_name:'One', status:'Contacted', assigned_coordinator:'Krystal', created_at:'2026-10-18T14:00:00Z', first_human_attempt_at:'2026-10-18T14:05:00Z',
    owner_turn:{ to:'Krystal', how:'turn', at:'2026-10-18T14:00:00Z', seq:1 }, original_owner:{ name:'Krystal', at:'2026-10-18T14:00:00Z', how:'turn' } }];
  DATA.referral_orgs=[]; DATA.care_assessments=[]; DATA.post_call_followups=[];
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, $=id=>document.getElementById(id);
  try{ localStorage.removeItem('cch_pending_sync'); }catch(e){}
  const ONFILE={ id:'k1', first_name:'Kay', last_name:'One', status:'Contacted', assigned_coordinator:'Krystal', original_owner:{ name:'Krystal' } };
  let fail='guard';
  sb.rpc=async(fn,a)=>fail==='guard'?{ data:null, error:{ message:'LEAD_OWNER_GUARD: Only Samantha or Zachary can change who owns a lead, and a lead\'s first owner never changes. Nothing was saved (Kay One).', code:'42501' } }
    : fail==='server'?{ data:null, error:{ message:'something else broke' } } : { data:null, error:null };
  sb.from=()=>{ const p={ select(){return p;}, eq(){return p;}, maybeSingle:async()=>({ data:{ data:[JSON.parse(JSON.stringify(ONFILE))] }, error:null }) }; return p; };
  const l=DATA.leads.find(x=>x.id==='k1'); l.assigned_coordinator='Angiel';
  await persist('leads', l); await sleep(50);
  const pend=()=>JSON.parse(localStorage.getItem('cch_pending_sync')||'{}');
  ok('refused · she is told why', L.alerts.some(a=>/Only Samantha or Zachary can change who owns a lead/.test(a)), L.alerts);
  ok('refused · the lead is put back as it is on file (Krystal)', DATA.leads.find(x=>x.id==='k1').assigned_coordinator==='Krystal', DATA.leads.find(x=>x.id==='k1'));
  ok('refused · never queued to retry, and the pill says what happened', !pend()['leads:k1']&&/owner change refused/.test(($('syncPill')||{}).textContent||''), { p:pend(), pill:($('syncPill')||{}).textContent });
  fail='server'; L.alerts.length=0;
  await persist('leads', DATA.leads.find(x=>x.id==='k1')); await sleep(30);
  ok('any other failed save · still queued to retry, no owner message', !!pend()['leads:k1']&&!L.alerts.some(a=>/who owns a lead/.test(a)), pend());
  lhSetFill();
  ok('settings · off, and Krystal (not an owner) sees no button', /Off\./.test($('ogSetNow').textContent)&&$('ogToggleBtn').style.display==='none');
  (0,eval)(`ME={ email:'sam@mo-care.com', name:'Samantha T', shift:'day' }`);
  window.tkMerge=async(apply)=>{ const m=JSON.parse(JSON.stringify(DATA.ops_settings)); apply(m, DATA.ops_settings); DATA.ops_settings=m; return { changed:true, error:null }; };
  lhSetFill(); await ogToggle(); await sleep(20);
  ok('settings · Samantha turns the guard on', DATA.ops_settings.owner_guard_live===true&&/On\./.test($('ogSetNow').textContent));
  try{ localStorage.removeItem('cch_pending_sync'); }catch(e){}
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
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1360, 'height': 900})
    pg.route('**/*', lambda r: serve(r) if r.request.url.startswith('http://hub.test/') else (r.abort() if 'supabase.co' in r.request.url else r.continue_()))
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://hub.test/index.html?proof=ownerguard'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

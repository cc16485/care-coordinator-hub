"""Time off and coverage never count (audit step 2, Samantha 2026-10-18): the Settings switch (owners only, off by default)
and Team showing what went overdue while someone was out apart, "not counted". The server is faked. Made-up people only.
(python3 tests/browser/fair_look.py)"""
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
  W.persist=async(k,v)=>{ W.__log.writes.push({ k, v:clone(v) }); };
  W.ckCheckNewInquiry=async()=>({proceed:true, note:''});
  W.jcLoadConn=async()=>null; W.renderLeads=()=>{}; W.renderFollowUpQueue=()=>{}; W.cjAutoOpen=()=>{};
  W.ccToast=m=>W.__log.toasts.push(m); W.alert=m=>W.__log.alerts.push(m); W.myWorkRefresh=()=>{}; W.opEvent=()=>{};
  W.ccPrompt=async()=>'the family asked for Angiel'; W.ccConfirm=async()=>true;
  (0,eval)(`ME={ email:'kry@mo-care.com', name:'Krystal Land', shift:'day' }; CC_ROLE_BY_EMAIL={ 'sam@mo-care.com':['owner_admin'], 'kry@mo-care.com':['care_coordinator'] };`);
  DATA.coordinator_staff=[{ email:'kry@mo-care.com', name:'Krystal Land' }, { email:'ang@mo-care.com', name:'Angiel Rose' }, { email:'sam@mo-care.com', name:'Samantha T' }];
  DATA.ops_settings={ team_live:false, team:{ hr_lead:'zach@mo-care.com' }, bonus_live:false, bonus:{ payroll:'kry@mo-care.com', decider:'sam@mo-care.com', ot_checked:null }, relationship_calls_live:true, relationship_calls_live_since:new Date(Date.now()-40*864e5).toISOString(), lead_rotation_live:true, lead_rotation:{ people:[{ name:'Krystal', on:true }, { name:'Angiel', on:true }] } };
  DATA.leads=[{ id:'k1', first_name:'Kay', last_name:'One', status:'Contacted', assigned_coordinator:'Krystal', created_at:'2026-10-18T14:00:00Z', first_human_attempt_at:'2026-10-18T14:05:00Z',
    owner_turn:{ to:'Krystal', how:'turn', at:'2026-10-18T14:00:00Z', seq:1 }, original_owner:{ name:'Krystal', at:'2026-10-18T14:00:00Z', how:'turn' } }];
  DATA.referral_orgs=[]; DATA.care_assessments=[]; DATA.post_call_followups=[];
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  DATA.ops_settings.team_live=true;
  sb.functions={ invoke:async(n,{body})=>({ data: body.action==='list' ? { live:true, month:'November 2026', me:{ owner:true, hr:true, decider:false, cc:false, email:'zach@mo-care.com' },
    months:[{ person:'Krystal', leads_assigned:2, assessments_owned:0, assessments_helped:1, starts:1, retained_30:0, overdue_now:0, overdue_while_out:2, bonuses:0, bonus_dollars:0 }, { person:'Angiel', leads_assigned:2, assessments_owned:1, assessments_helped:0, starts:0, retained_30:1, overdue_now:1, overdue_while_out:0, bonuses:0, bonus_dollars:0 }],
    my_overdue:[], reviews:[], waiting:0, causes:{} } : {}, error:null }) };
  (0,eval)(`ME={ email:'zach@mo-care.com', name:'Zach Troutman', shift:'day' }; CC_ROLE_BY_EMAIL['zach@mo-care.com']=['owner_admin'];`);
  await cctOpen(); await sleep(60);
  const txt=(document.querySelector('#cctModal .cct-dlg')||{}).textContent||'';
  ok('Team · Krystal shows "0 (+2 while out, not counted)"; Angiel just "1"', /0 \(\+2 while out, not counted\)/.test(txt)&&!/1 \(\+/.test(txt), txt.slice(0,500));
  cctClose();
  lhSetFill();
  ok('settings · off by default, and the hint explains it', /Off\./.test(document.getElementById('fcSetNow').textContent)&&/Time off and coverage never count/.test(document.body.textContent));
  (0,eval)(`ME={ email:'kry@mo-care.com', name:'Krystal Land', shift:'day' }`); lhSetFill();
  ok('settings · Krystal (not an owner) sees no button', document.getElementById('fcToggleBtn').style.display==='none');
  (0,eval)(`ME={ email:'sam@mo-care.com', name:'Samantha T', shift:'day' }`);
  window.tkMerge=async(apply,what)=>{ const m=JSON.parse(JSON.stringify(DATA.ops_settings)); const ch=apply(m, DATA.ops_settings); DATA.ops_settings=m; return { changed:ch, error:null }; };
  window.ccConfirm=async()=>true; lhSetFill(); await fcToggle(); await sleep(30);
  ok('settings · Samantha turns it on (with when, kept)', DATA.ops_settings.fair_counts_live===true&&!!DATA.ops_settings.fair_counts_live_since&&/On\./.test(document.getElementById('fcSetNow').textContent));
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
    pg.goto('http://hub.test/index.html?proof=fair'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

"""Bonuses (Care Coordinator Leads and Bonus, Stage 4, policy approved by Samantha 2026-10-18): the My Work button, the Bonuses
window for a Care Coordinator (only their own), the payroll person (approved ones, Mark paid needs a date) and the owners
(decisions; only the decider makes exceptions and the Viventium check), and the Bonus program settings (owners only). The
server function is faked: the page never reads bonus records itself. Made-up people only. (python3 tests/browser/bonus_look.py)"""
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
  DATA.ops_settings={ bonus_live:false, bonus:{ payroll:'kry@mo-care.com', decider:'sam@mo-care.com', ot_checked:null }, relationship_calls_live:true, relationship_calls_live_since:new Date(Date.now()-40*864e5).toISOString(), lead_rotation_live:true, lead_rotation:{ people:[{ name:'Krystal', on:true }, { name:'Angiel', on:true }] } };
  DATA.leads=[{ id:'k1', first_name:'Kay', last_name:'One', status:'Contacted', assigned_coordinator:'Krystal', created_at:'2026-10-18T14:00:00Z', first_human_attempt_at:'2026-10-18T14:05:00Z',
    owner_turn:{ to:'Krystal', how:'turn', at:'2026-10-18T14:00:00Z', seq:1 }, original_owner:{ name:'Krystal', at:'2026-10-18T14:00:00Z', how:'turn' } }];
  DATA.referral_orgs=[]; DATA.care_assessments=[]; DATA.post_call_followups=[];
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log; L.calls=[];
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  const line=(id,o)=>Object.assign({ id:'bonus_'+id, lead_id:id, client:'Client '+id, recipient:'Angiel', recipient_email:'ang@mo-care.com', first_visit:'2026-11-03', amount:100, status:'on_the_way', status_words:'On the way', words:'Day 8 of 30 · 12 of 20 hours' }, o||{});
  let ROLE='ang';
  const LISTS={
    ang:{ live:true, start:'2026-11-01', amount:100, min_hours:20, days:30, me:{ owner:false, decider:false, payroll:false, email:'ang@mo-care.com' }, ot_checked:null, lines:[line('a')] },
    kry:{ live:true, start:'2026-11-01', amount:100, min_hours:20, days:30, me:{ owner:false, decider:false, payroll:true, email:'kry@mo-care.com' }, ot_checked:null,
      lines:[line('k',{ recipient:'Krystal', recipient_email:'kry@mo-care.com' }), line('b',{ status:'approved', status_words:'Approved', words:'Approved' })] },
    sam:{ live:true, start:'2026-11-01', amount:100, min_hours:20, days:30, me:{ owner:true, decider:true, payroll:false, email:'sam@mo-care.com' }, ot_checked:null,
      lines:[line('r',{ status:'ready', status_words:'Ready for approval', words:'Ready for approval' }), line('u',{ recipient:'Krystal', recipient_email:'kry@mo-care.com', status:'under_review', status_words:'Under review', words:'Under review: 18 of 20 hours by day 30' }), line('b',{ status:'approved', status_words:'Approved' })] },
    zach:{ live:true, start:'2026-11-01', amount:100, min_hours:20, days:30, me:{ owner:true, decider:false, payroll:false, email:'zach@mo-care.com' }, ot_checked:null,
      lines:[line('u',{ recipient:'Krystal', recipient_email:'kry@mo-care.com', status:'under_review', status_words:'Under review' })] } };
  sb.functions={ invoke:async(name,{body})=>{ L.calls.push({ name, body:JSON.parse(JSON.stringify(body)) }); if(body.action==='list') return { data:JSON.parse(JSON.stringify(LISTS[ROLE])), error:null };
    if(body.action==='act') return { data:{ ok:true, line:{ status_words:'Approved' } }, error:null }; return { data:{ ok:true }, error:null }; } };
  const dlg=()=>document.querySelector('#bnModal .bn-dlg'), txt=()=>(dlg()||{}).textContent||'';

  /* ── the button ── */
  bnBtnSync();
  ok('button · off and not an owner: hidden', document.getElementById('bnBtn').style.display==='none');
  DATA.ops_settings.bonus_live=true; bnBtnSync();
  ok('button · on: shows for a Care Coordinator', document.getElementById('bnBtn').style.display==='');

  /* ── a Care Coordinator ── */
  await bnOpen(); await sleep(50);
  ok('Angiel · sees her own bonus with the progress words', /Your bonuses/.test(txt())&&/Day 8 of 30 · 12 of 20 hours/.test(txt())&&/\$100/.test(txt()), txt().slice(0,300));
  ok('Angiel · no payroll or decision sections', !/Approved, to enter in Viventium/.test(txt())&&!/Waiting on a decision/.test(txt()));
  ok('the page asked the server, never the bonus records', L.calls.every(c=>c.name==='cc-bonus')&&!L.writes.some(w=>/bonus/.test(w.k||'')));
  bnClose();

  /* ── payroll ── */
  ROLE='kry'; await bnOpen(); await sleep(50);
  ok('Krystal (payroll) · her own, plus approved ones to enter, and the Viventium note', /Approved, to enter in Viventium/.test(txt())&&/Client b/.test(txt())&&/Before the first payout, Samantha confirms with Viventium/.test(txt())&&!/I checked with Viventium/.test(txt()));
  L.alerts.length=0; bnAct('bonus_b','paid'); await sleep(40);
  ok('Mark paid · needs the payroll date first', L.alerts.some(a=>/payroll date/.test(a))&&!L.calls.some(c=>c.body.do==='paid'), L.alerts);
  document.getElementById('bnPaid_bonus_b').value='2026-12-11'; await bnAct('bonus_b','paid'); await sleep(60);
  ok('Mark paid · sends the date to the server', L.calls.some(c=>c.body.action==='act'&&c.body.do==='paid'&&c.body.paid_on==='2026-12-11'&&c.body.id==='bonus_b'), L.calls.slice(-3));
  bnClose();

  /* ── the decider ── */
  ROLE='sam'; await bnOpen(); await sleep(50);
  ok('Samantha · waiting on a decision: Approve (ready) and Approve as an exception (under review), plus Not earned', /Waiting on a decision/.test(txt())&&/Approve as an exception/.test(txt())&&/Not earned/.test(txt())&&/I checked with Viventium/.test(txt()));
  window.ccPrompt=async()=>'hospital stay'; await bnAct('bonus_u','approve',true); await sleep(60);
  ok('exception · sends her reason', L.calls.some(c=>c.body.do==='approve'&&c.body.id==='bonus_u'&&c.body.why==='hospital stay'), L.calls.slice(-2));
  window.ccPrompt=async()=>'Viventium adds it to the regular rate'; await bnOt(); await sleep(60);
  ok('Viventium check · sent with her note', L.calls.some(c=>c.body.action==='ot_checked'&&/regular rate/.test(c.body.note)));
  bnClose();
  ROLE='zach'; await bnOpen(); await sleep(50);
  ok('Zach · an under-review bonus says Samantha decides (no exception or not-earned buttons)', /Samantha decides/.test(txt())&&!/Approve as an exception/.test(txt())&&!/Not earned/.test(txt()));
  bnClose();

  /* ── audit step 5: the payroll summary, and the owners' Leaving note ── */
  LISTS.kry.lines=[line('k',{ recipient:'Krystal', recipient_email:'kry@mo-care.com' }), line('b',{ status:'approved', status_words:'Approved' }), line('c',{ recipient:'Krystal', recipient_email:'kry@mo-care.com', status:'approved', status_words:'Approved' }),
    line('d',{ recipient:'Krystal', recipient_email:'kry@mo-care.com', status:'approved', status_words:'Approved' }),
    line('p1',{ status:'paid', paid_on:'2026-12-11' }), line('p2',{ recipient:'Krystal', recipient_email:'kry@mo-care.com', status:'paid', paid_on:'2026-12-11' }), line('p3',{ status:'paid', paid_on:'2026-11-27' })];
  ROLE='kry'; await bnOpen(); await sleep(50);
  const sm=()=>(document.getElementById('bnSummary')||{}).innerText||'';
  ok('summary · next payroll per person and the total ($100 Angiel, $200 Krystal, $300)', /Angiel: 1 bonus, \$100/.test(sm())&&/Krystal: 2 bonuses, \$200/.test(sm())&&/Total \$300/.test(sm()), sm());
  ok('summary · each payroll date, newest first, with its total', /Paid on the 2026-12-11 payroll[\s\S]*Total \$200[\s\S]*Paid on the 2026-11-27 payroll[\s\S]*Total \$100/.test(sm()), sm());
  ok('summary · payroll never sees a Leaving note', !document.querySelector('.bn-leaving'));
  bnClose();
  LISTS.sam.lines[1].leaving={ kind:'Resignation', last_day:'2026-12-15' };
  ROLE='sam'; await bnOpen(); await sleep(50);
  ok('owners · a leaving Care Coordinator\'s bonus says so, and that nothing changes by itself', /Leaving: Resignation, last day 2026-12-15\. Nothing changes by itself; you decide this one for final pay\./.test(txt()), txt());
  ok('owners · the summary shows for owners too', !!document.getElementById('bnSummary'));
  bnClose();
  ROLE='ang'; await bnOpen(); await sleep(50);
  ok('a Care Coordinator · no payroll summary', !document.getElementById('bnSummary'));
  bnClose();

  /* ── settings ── */
  window.OPS_PEOPLE=[{ primary_email:'kry@mo-care.com', full_name:'Krystal Land' }, { primary_email:'sam@mo-care.com', full_name:'Samantha T' }];
  (0,eval)(`OPS_PEOPLE=window.OPS_PEOPLE`);
  lhSetFill();
  ok('settings · Krystal (not an owner) sees them read-only, no buttons', document.getElementById('bpStart').disabled&&document.getElementById('bpSaveBtn').style.display==='none'&&/Only Samantha or Zachary/.test(document.getElementById('bpSetNow').textContent));
  (0,eval)(`ME={ email:'sam@mo-care.com', name:'Samantha T', shift:'day' }`);
  window.tkMerge=async(apply,what)=>{ const m=JSON.parse(JSON.stringify(DATA.ops_settings)); const ch=apply(m, DATA.ops_settings); DATA.ops_settings=m; L.merges=(L.merges||[]).concat([what]); return { changed:ch, error:null }; };
  DATA.ops_settings.bonus.ot_checked={ at:'2026-12-01T00:00:00Z', by:'sam@mo-care.com', note:'ok' };
  lhSetFill(); document.getElementById('bpAmount').value='150'; document.getElementById('bpPayroll').value='kry@mo-care.com';
  await bpSave(); await sleep(40);
  ok('settings · Samantha saves; the Viventium check on file is kept', DATA.ops_settings.bonus.amount===150&&DATA.ops_settings.bonus.payroll==='kry@mo-care.com'&&DATA.ops_settings.bonus.ot_checked&&DATA.ops_settings.bonus.ot_checked.note==='ok', DATA.ops_settings.bonus);
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
    pg.goto('http://hub.test/index.html?proof=bonus'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    if os.environ.get('SHOT'):
        pg.evaluate("async()=>{ sb.functions={ invoke:async(n,{body})=>({ data: body.action==='list' ? { live:true, start:'2026-11-01', amount:100, min_hours:20, days:30, me:{ owner:true, decider:true, payroll:false, email:'sam@mo-care.com' }, ot_checked:null, lines:[{ id:'bonus_r', client:'Rose Able', recipient:'Angiel', recipient_email:'ang@mo-care.com', first_visit:'2026-11-03', amount:100, status:'ready', status_words:'Ready for approval', words:'Ready for approval' }, { id:'bonus_u', client:'Eve Ellis', recipient:'Krystal', recipient_email:'kry@mo-care.com', first_visit:'2026-11-03', amount:100, status:'under_review', status_words:'Under review', words:'Under review: 18 of 20 hours by day 30' }, { id:'bonus_o', client:'Gil Gray', recipient:'Krystal', recipient_email:'kry@mo-care.com', first_visit:'2026-11-20', amount:100, status:'on_the_way', status_words:'On the way', words:'Day 12 of 30 · 14 of 20 hours' }] } : {}, error:null }) }; await bnOpen(); }")
        pg.wait_for_timeout(300); pg.locator('#bnModal .bn-dlg').screenshot(path=os.environ['SHOT'])
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

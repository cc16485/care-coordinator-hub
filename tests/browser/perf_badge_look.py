"""The red number on Caregivers > Performance (Samantha 2026-11-14): it counts only what is waiting on the person
looking. Offline, made-up data, nothing saved. (PORT=<static server port> python3 tests/browser/perf_badge_look.py)"""
import os
from playwright.sync_api import sync_playwright
H = open('/Users/samantha/Claude/Projects/cc-hub-live/.claude/g1a_harness.js').read()
PORT = os.environ.get('PORT', '8843')
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; await sleep(600);
  const as=(email,name,roles)=>{ (0,eval)("ME={ email:'"+email+"', name:'"+name+"' };"); CC_ROLES=roles; CC_ROLES_CHECKED=true; for(const k in CC_ROLE_BY_EMAIL) delete CC_ROLE_BY_EMAIL[k]; CC_ROLE_BY_EMAIL[email]=roles; };
  as('krystal@mo-care.com','Krystal Land',['care_coordinator']);
  (0,eval)("cgdCensus=async function(){ CGD.census={ caregivers:[] }; CGD.at=Date.now(); return CGD.census; }");
  const ago=n=>new Date(Date.now()-n*864e5).toISOString().slice(0,10);
  window.__N={ hr_coaching:0, hr_cases:0 };
  window.__CO=[
    { id:'c1', caregiver:'A', status:'open', kind:'coaching', due_on:ago(-3), assigned_to:'krystal@mo-care.com' },
    { id:'c2', caregiver:'B', status:'open', kind:'coaching', due_on:ago(-3), assigned_to:'krystal@mo-care.com', help_at:'2026-11-10T10:00:00Z' },
    { id:'c3', caregiver:'C', status:'done', kind:'coaching', improved:null, check_on:ago(1), assigned_to:'krystal@mo-care.com' },
    { id:'c4', caregiver:'D', status:'done', kind:'coaching', improved:true, check_on:ago(1), assigned_to:'krystal@mo-care.com' },
    { id:'c5', caregiver:'E', status:'open', kind:'coaching', due_on:ago(-3), assigned_to:'someone@mo-care.com', handoff_at:'2026-11-12T10:00:00Z' } ];
  window.__CA=[
    { id:'k1', rule:'office_concern', caregiver:'A', title:'t', decided_at:null },
    { id:'k2', rule:'office_concern', caregiver:'A', title:'t', decided_at:'2026-11-01' },
    { id:'k3', rule:'w01', caregiver:'B', title:'t', practice:true, review:null },
    { id:'k4', rule:'w01', caregiver:'B', title:'t', practice:false, review:null },
    { id:'k5', rule:'w02', caregiver:'B', title:'t', practice:false, review:'agree' } ];
  DATA.discipline_actions=[{ id:'w1', caregiver:'A', level:'Verbal Warning', status:'draft' }, { id:'w2', caregiver:'B', level:'Verbal Warning', status:'issued' }];
  const q=(t)=>new Proxy(function(){}, { get(_,k){ if(k==='then') return (a,b)=>{ if(t in window.__N) window.__N[t]++; return Promise.resolve({ data: t==='hr_coaching'?window.__CO : t==='hr_cases'?window.__CA : (t==='app_data'?null:[]), error:null }).then(a,b); }; return ()=>q(t); } });
  sb.from=q;
  const b=()=>document.getElementById('perfBadge'), shown=()=>b().style.display!=='none';
  ok('the number is hidden before anything is known', !!b() && !shown());
  switchTab('cgdir'); await sleep(1500);
  ok('opening Caregivers shows a coordinator her own 3: two talks to have and one 30-day check', shown() && b().textContent==='3', [b().outerHTML]);
  ok('hovering says what the 3 are', /2 coaching talks for you to have/.test(b().title) && /1 30-day check due/.test(b().title), b().title);
  ok('a coordinator never asks for the flagged cases', window.__N.hr_cases===0, window.__N);
  const n0=window.__N.hr_coaching; renderActiveTab(); renderActiveTab(); switchTab('cgcompliance'); await sleep(400);
  ok('redrawing or moving between Caregivers tabs does not ask again', window.__N.hr_coaching===n0, [n0, window.__N.hr_coaching]);
  window.__CO[0].status='done'; window.__CO[0].improved=true;
  switchTab('hr'); await sleep(1200);
  ok('opening Performance brings the number up to date (2 after a talk is recorded)', b().textContent==='2', b().outerHTML);
  window.__CO=[]; HR.go('coaching'); await sleep(900);
  ok('with nothing waiting the number goes away', !shown() && b().textContent==='', b().outerHTML);
  const W=HR.waiting, co=[
    { status:'open', assigned_to:'krystal@mo-care.com', help_at:'2026-11-10T10:00:00Z' },
    { status:'open', assigned_to:'someone@mo-care.com', handoff_at:'2026-11-12T10:00:00Z' },
    { status:'open', assigned_to:'zach@mo-care.com' } ];
  const z=W(co, window.__CA, 1, 'zach@mo-care.com', true, ago(0));
  ok('an owner: 1 own talk + 1 write-up + 1 office report + 1 real flagged case + 1 help ask + 1 hand-off = 6; practice and decided ones never count', z.n===6, z);
  const k=W(co, window.__CA, 1, 'krystal@mo-care.com', false, ago(0));
  ok('the same facts for a coordinator: only her own open talk', k.n===1 && k.parts.join()==='1 coaching talk for you to have', k);
  ok('coaching that could not be read counts nothing, never an error', W(null, null, 0, 'x', true, ago(0)).n===0);
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1300, 'height': 760})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(os.environ.get('URL', f'http://localhost:{PORT}/index.html?proof=perfbadge')); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', H)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    if os.environ.get('SHOT'):
        pg.evaluate("()=>{ window.__CO=[{ id:'c1', caregiver:'A', status:'open', kind:'coaching', due_on:'2099-01-01', assigned_to:'krystal@mo-care.com' },{ id:'c2', caregiver:'B', status:'open', kind:'coaching', due_on:'2099-01-01', assigned_to:'krystal@mo-care.com' }]; switchTab('cgdir'); HR.peek(true); }"); pg.wait_for_timeout(900)
        pg.screenshot(path=os.environ['SHOT'], clip={'x': 0, 'y': 0, 'width': 1300, 'height': 200})
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

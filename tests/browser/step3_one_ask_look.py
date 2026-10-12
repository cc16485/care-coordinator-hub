"""Scheduling review step 3 (2026-10-12): Cara's New clients tab is gone (every old way in lands on Team Builder), older
checks still open show at the top of Team Builder to turn into a plan (answers come along) or close, and Team Builder's
Text box shows Cara's checks (No shift texts, Do Not Return, active, new-hire readiness). Offline; nothing sent.
(python3 tests/browser/step3_one_ask_look.py, with a static server on PORT, default 8765)"""
import os
from playwright.sync_api import sync_playwright
PORT = os.environ.get('PORT', '8765')
H = open('/Users/samantha/Claude/Projects/cc-hub-live/.claude/g1a_harness.js').read()
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; await sleep(500);
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Land' };"); CC_ROLES=['owner_admin']; CC_ROLES_CHECKED=true;
  sb.auth.getSession=async()=>({ data:{ session:{ access_token:'t' } } });
  window.__saved=[]; (0,eval)("persist=async function(k,item){ window.__saved.push([k,JSON.parse(JSON.stringify(item))]); return true; }");
  TB.pool=[{ name:'Ariel Smith', axiscare_id:'11', visits:[] }]; TB.journeys=[];
  const DAD={ id:'cov_dad', kind:'interest', status:'open', client:'Dad', client_city:'Ozark', interest_days:['mon','wed','fri'], interest_start:'09:00', interest_end:'13:00', opened_at:'2026-10-10T15:00:00Z',
    asked:[{ id:'a1', name:'Mary Evans', state:'yes', reply:'yes!', axiscare_id:'21' }, { id:'a2', name:'Bo Bright', state:'no' }, { id:'a3', name:'Kim Aide', state:'inquiry', reply:'which town?' }, { id:'a4', name:'Di W', state:'waiting' }] };
  DATA.coverage_cases=[DAD, { id:'cv1', status:'open', reason:'calloff', client:'Ruth Kay', asked:[] }]; DATA.staffing_plans=[];
  /* Cara */
  schedGo('coverage'); await sleep(200);
  const subs=[...document.querySelectorAll('#covSubBar button')].map(b=>b.textContent.trim());
  ok('Cara no longer has a New clients tab', !subs.some(t=>/New clients/.test(t)) && subs.length===7, subs);
  ok('...and no "New client: ask the team" button', !document.getElementById('swNewWrap') && !/New client: ask the team/.test(document.getElementById('tab-coverage').innerText));
  covSubGo('newclients'); await sleep(100);
  ok('a remembered New clients tab opens Cara Today instead', COV_SUB==='today', COV_SUB);
  switchTab('today'); swSubGo('newclients'); await sleep(150);
  ok('an old "New clients" link lands on Team Builder', activeTab==='teambuilder', activeTab);
  switchTab('today'); caraShowCase('cov_dad'); await sleep(150);
  ok('opening a new-client check lands on Team Builder', activeTab==='teambuilder', activeTab);
  /* Team Builder home */
  TB.planId=null; tbRender(); await sleep(100);
  const H0=document.getElementById('tbRoot').innerText;
  ok('Team Builder lists the older check with its answers', /Earlier new-client asks from Cara \(1\)/.test(H0) && /Dad/.test(H0) && /Ozark · Mon Wed Fri 9a-1p/.test(H0) && /🟢 1 \(Mary\) · 🟡 1 · 🔴 1 · ⏳ 1/.test(H0), H0.slice(0,700));
  await OH.convert('cov_dad'); await sleep(150);
  const plan=DATA.staffing_plans[0];
  ok('Make it a plan: Dad\'s days and hours on a new board, linked to the check', plan && plan.client==='Dad' && plan.city==='Ozark' && plan.days.join()==='mon,wed,fri' && plan.slots[0].start==='09:00' && plan.slots[0].end==='13:00' && plan.open_hours===true && plan.from_case==='cov_dad' && DAD.plan_id===plan.id && DAD.open_hours===true && DAD.offered.length===3, [plan, DAD.offered]);
  const B=document.getElementById('tbRoot').innerText;
  ok('...its answers show in the boxes (a yes then = all of the hours)', TB.planId===plan.id && /🟢 Yes \(1\)/.test(B) && /Mary Evans: any of it/.test(B) && /🟡 Questions \(1\)/.test(B) && /🔴 No \(1\)/.test(B) && /Not answered yet: 1/.test(B), B.slice(0,900));
  ok('...and both were saved', window.__saved.some(([k,i])=>k==='staffing_plans'&&i.id===plan.id) && window.__saved.some(([k,i])=>k==='coverage_cases'&&i.id==='cov_dad'&&i.plan_id===plan.id));
  tbClose(); await sleep(80);
  ok('the converted check leaves the earlier list', !/Earlier new-client asks/.test(document.getElementById('tbRoot').innerText));
  const OLD={ id:'cov_old2', kind:'interest', status:'open', client:'Mrs B', asked:[] }; DATA.coverage_cases.push(OLD); tbRender(); await sleep(50);
  await OH.closeOld('cov_old2'); await sleep(80);
  ok('Close it: closed with who, nobody texted, gone from the list', OLD.status==='closed' && OLD.resolved_by==='Krystal Land' && !/Mrs B/.test(document.getElementById('tbRoot').innerText));
  /* Team Builder's Text box shows Cara's checks */
  const of=window.fetch;
  window.fetch=async(u,o)=>{ if(/team-ask/.test(String(u))) return new Response(JSON.stringify({ live:true, blocked:'Ariel Smith is on the No shift texts list (asked for fewer texts)',
      caregiver:{ first:'Ariel', on_roster:true, phone_last4:'0101', opt_out:[] }, client:{ first:'Mary', town:'Nixa', linked:false }, template:'Hi {first_name}', asked_before:[] }),{status:200}); return of(u,o); };
  const P2={ id:'tbX', client:'Mary Example', city:'Nixa', days:['mon'], slots:[{ k:'s1', label:'Shift 1', start:'09:00', end:'13:00' }], cells:{ 'mon|s1':{ name:'Ariel Smith', status:'penciled', cg_ax_id:'11' } } };
  DATA.staffing_plans.push(P2); TB.planId='tbX'; tbRender(); await sleep(50);
  await tbAskOpen('mon|s1'); await sleep(300);
  const box=[...document.querySelectorAll('[role="dialog"]')].pop(), bt=box?box.innerText:'';
  const sendBtn=box?[...box.querySelectorAll('button')].find(b=>/^Send/.test(b.textContent.trim())):null;
  ok('the Text box says why not, from Cara\'s checks', /Ariel Smith is on the No shift texts list \(asked for fewer texts\)\./.test(bt), bt.slice(0,700));
  ok('...and there is no way to send', !sendBtn || sendBtn.disabled, sendBtn&&sendBtn.outerHTML);
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1400, 'height': 1000})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200])); pg.on('dialog', lambda d: d.accept())
    pg.goto(f'http://localhost:{PORT}/index.html?proof=step3'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', H)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

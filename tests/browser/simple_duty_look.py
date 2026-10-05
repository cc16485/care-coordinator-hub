"""Keep it simple (Samantha, 2026-10-05): Krystal is first for Operations and Staffing 8am-2pm Mon-Fri, Samantha the rest
of the time. Responsible now shows the three seats the office always has someone in, with the "when nobody is
scheduled" person; unused areas stay hidden unless someone is scheduled. Made-up data, offline.
(python3 tests/browser/simple_duty_look.py, with the static server on 8765)"""
from playwright.sync_api import sync_playwright
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]);
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  const K='krystal@mo-care.com', S='samantha@mo-care.com';
  (0,eval)(`ME={ email:'${S}', name:'Samantha Troutman', shift:'day' }; OPS_PEOPLE=[{ person_id:'p_k', full_name:'Krystal Land', primary_email:'${K}' },{ person_id:'p_s', full_name:'Samantha Troutman', primary_email:'${S}' }];`);
  window.roleEveryone=()=>[{ email:K, name:'Krystal Land' },{ email:S, name:'Samantha Troutman' }];
  DATA.positions=[]; DATA.ops_settings={ coverage_alert_admins:[S,K] };
  const all=[0,1,2,3,4,5,6];
  DATA.duty_windows=[
    { id:'a', area:'operations', person:K, status:'live', active:true, recur:{ days:all, from:'00:00', to:'23:59' } },
    { id:'b', area:'staffing', person:K, status:'live', active:true, recur:{ days:all, from:'00:00', to:'23:59' } },
    { id:'c', area:'field_response', person:'cierra@mo-care.com', status:'planned', active:true, recur:{ days:all, from:'00:00', to:'23:59' } } ];
  let h=dutyPanelHtml(); const box=document.createElement('div'); box.innerHTML=h; let t=box.innerText;
  ok('Krystal\'s hours: she shows for Operations and Staffing', /Operations[\s\S]*Krystal[\s\S]*Staffing[\s\S]*Krystal/.test(t), t);
  ok('Owner Escalation: Samantha, when nobody is scheduled', /Owner Escalation[\s\S]*Samantha[\s\S]*when nobody is scheduled/.test(t), t);
  ok('unused areas hidden (Field Response, Advanced Care, After Hours) and no "nobody" warnings', !/Field Response|Advanced Care|After Hours/.test(t) && !/[Nn]obody (is )?(assigned|on duty)/.test(t), t);
  DATA.duty_windows.forEach(w=>{ if(w.area!=='field_response') w.recur.days=[]; w.recur.from='03:00'; w.recur.to='03:01'; });
  box.innerHTML=dutyPanelHtml(); t=box.innerText;
  ok('outside Krystal\'s hours: Operations and Staffing fall to Samantha', (t.match(/Samantha Troutman · when nobody is scheduled/g)||[]).length===3, t);
  DATA.duty_windows.push({ id:'d', area:'after_hours', person:K, status:'live', active:true, recur:{ days:all, from:'00:00', to:'23:59' } });
  box.innerHTML=dutyPanelHtml(); t=box.innerText;
  ok('an area someone IS scheduled in shows up again', /After Hours[\s\S]*Krystal/.test(t), t);
  ok('the Settings seats card lists Operations too', (()=>{ const d=document.getElementById('routeSet'); routeSetRender(); return /Operations<\/b> now/.test(d.innerHTML) && /onchange="routeSetDefault\('operations'/.test(d.innerHTML); })());
  ok('the coordinator is not on the plan with made-up hours', !PLAN_DUTY.some(w=>w.position==='pos_staffing_coordinator') && /8 hours a day, 5 days a week/.test(POS_SEED.find(p=>p.id==='pos_staffing_coordinator').note));
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1360, 'height': 900})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=simpleduty'); pg.wait_for_timeout(1200)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

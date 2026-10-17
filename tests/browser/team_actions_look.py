"""Springfield structure (2026-10-17): Help with this, Needs team support, Escalate for decision, Take it (transfer),
My part is done, This is finished, the In charge seat, the lighter Care Coordinator and the 911 line on critical cards.
The real page, offline, served from this checkout (no server needed); made-up people and items only; saves are recorded,
never sent; nobody is texted or emailed. (python3 tests/browser/team_actions_look.py)"""
import os, sys, mimetypes
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
STUB = r"""
(()=>{
  const W=window, H=h=>new Date(Date.now()+h*36e5).toISOString();
  W.__log={ writes:[], fn:[], toasts:[], events:[], alerts:[] };
  const K='krystal@mo-care.com', S='samantha@mo-care.com', A='angiel@mo-care.com', C='coord@mo-care.com', Z='zach@mo-care.com';
  (0,eval)(`sb={ from:()=>{ const p={ select(){return p;}, eq(){ return p; }, single:async()=>({ data:{ data: JSON.parse(JSON.stringify(DATA.ops_items)) }, error:null }),
      maybeSingle:async()=>({ data:null, error:null }), then(a){ return Promise.resolve({data:[],error:null}).then(a); } }; return p; },
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async(n)=>{ window.__log.fn.push(n); return {data:null,error:null}; } },
    auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };
    OPS_PEOPLE=[{ person_id:'p_k', full_name:'Krystal Land', primary_email:'${K}' },{ person_id:'p_s', full_name:'Samantha Troutman', primary_email:'${S}' },
      { person_id:'p_a', full_name:'Angiel Test', primary_email:'${A}' },{ person_id:'p_c', full_name:'Casey Coord', primary_email:'${C}' },{ person_id:'p_z', full_name:'Zach Troutman', primary_email:'${Z}' }];
    CC_ROLE_BY_EMAIL={ '${S}':['owner_admin'], '${Z}':['owner_admin'], '${K}':['care_coordinator'], '${A}':['care_coordinator'], '${C}':['staffing_coordinator'] };`);
  W.persist=async(k,v)=>{ W.__log.writes.push(k+':'+v.id); };
  W.opEvent=(v,o)=>W.__log.events.push(v+':'+(o&&o.summary||''));
  W.tkMerge=async(fn)=>{ fn(DATA.ops_settings); return {}; };
  W.ccOpsRefresh=()=>{}; W.ccRecentFetch=async()=>{}; W.ccToast=m=>W.__log.toasts.push(m); W.alert=m=>W.__log.alerts.push(m);
  DATA.handoffs=[]; DATA.ops_settings={ duty_default_owner_escalation:S, leadership_backup:Z, coverage_alert_admins:[S] };
  DATA.coordinator_staff=[{ email:K, name:'Krystal Land', active:true },{ email:A, name:'Angiel Test', active:true },{ email:C, name:'Casey Coord', active:true },{ email:S, name:'Samantha Troutman', active:true }];
  const all=[0,1,2,3,4,5,6];
  DATA.duty_windows=[{ id:'w1', area:'in_charge', person:K, recur:{ days:all, from:'00:00', to:'23:59' }, active:true },
    { id:'w2', area:'staffing', person:C, recur:{ days:all, from:'00:00', to:'23:59' }, active:true }];
  DATA.ops_items=[
    { id:'k1', kind:'request', status:'open', title:'Call the Jones family back (fake)', owner:K, owner_name:'Krystal Land', due:H(-1), created_at:H(-5) },
    { id:'k2', kind:'request', status:'open', title:'Care plan review for Ruth (fake)', owner:K, owner_name:'Krystal Land', due:H(-2), created_at:H(-5) },
    { id:'c1', kind:'staffing_issue', status:'open', domain:'scheduling_coverage', opened_by:'timekeeper', urgency:'urgent', title:'NO CLOCK-IN: Maria for Ruth (fake)', owner:C, owner_name:'Casey Coord', due:H(1), created_at:H(-0.3),
      escalation:{ to:K, to_name:'Krystal Land', seat:'in_charge', stage:'in_charge', level:'urgent', why:'Casey hasn’t taken it in 10 minutes', at:H(-0.1) } },
    { id:'c2', kind:'request', status:'open', title:'Reference checks for 2 applicants (fake)', owner:C, owner_name:'Casey Coord', due:H(20), created_at:H(-3) },
    { id:'a1', kind:'request', status:'open', title:'Angiel thing (fake)', owner:A, owner_name:'Angiel Test', due:H(30), created_at:H(-3) } ];
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, it=id=>DATA.ops_items.find(x=>x.id===id), mw=()=>document.getElementById('tab-mywork').innerText;
  const as=(e,n)=>(0,eval)("ME={ email:'"+e+"', name:'"+n+"', shift:'day' };");
  const pop=()=>[...document.querySelectorAll('.ccpop')].pop();
  const card=id=>document.querySelector('[data-id="'+id+'"]');
  const K='krystal@mo-care.com', S='samantha@mo-care.com', A='angiel@mo-care.com', C='coord@mo-care.com', Z='zach@mo-care.com';
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';

  /* ── seats ── */
  ok('In charge is a duty seat; Owner Escalation is now called Leadership', dutyAreaLabel('in_charge')==='In charge' && dutyAreaLabel('owner_escalation')==='Leadership' && DUTY_CORE.includes('in_charge'));
  ok('In charge now: Krystal (from the schedule)', routeSeatNow('in_charge').person===K && TA.inCharge()===K);
  DATA.duty_windows=DATA.duty_windows.filter(w=>w.area!=='staffing');
  ok('Staffing with nobody scheduled falls to In charge, not the alert list (Samantha)', routeSeatNow('staffing').person===K && routeSeatNow('staffing').from==='In charge now', routeSeatNow('staffing'));
  DATA.duty_windows.push({ id:'w2', area:'staffing', person:C, recur:{ days:[0,1,2,3,4,5,6], from:'00:00', to:'23:59' }, active:true });
  ok('Leadership is Samantha; the backup is Zach', TA.leadership()===S && TA.backup()===Z && TA.deciders().map(d=>d.email).join()===S+','+Z);

  /* ── workload (refinement 1) ── */
  ok('two Care Coordinators: new Care Coordination work goes to the one carrying less (Angiel)', TA.lighterCoordinator()?.email===A, TA.lighterCoordinator());
  DATA.ops_settings.payroll_person=A; DATA.ops_settings.payroll_days=[new Date().getDay()];
  ok('...but not to the payroll person on payroll day', TA.lighterCoordinator()?.email===K && /Angiel is on payroll today/.test(TA.lighterCoordinator().reason), TA.lighterCoordinator());
  DATA.ops_settings.payroll_days=[];
  DATA.coordinator_staff.find(s=>s.email===A).active=false;
  ok('one Care Coordinator: nothing changes (no suggestion from workload)', TA.lighterCoordinator()===null);
  DATA.coordinator_staff.find(s=>s.email===A).active=true;
  ok('Needs team support suggests the other Care Coordinator for Krystal’s work, and In charge for the coordinator’s', TA.teammate(it('k1'))?.email===A && TA.teammate(it('c2'))?.email===K);

  /* ── the critical card, as Krystal (In charge) ── */
  as(K,'Krystal Land'); switchTab('mywork'); myWorkGo('today'); await sleep(250);
  ok('the escalated no clock-in is on Krystal’s list, saying she is In charge and Casey keeps it', /Escalated to you \(you’re In charge\)/.test(mw()) && /It stays Casey’s unless you take it/.test(mw()), mw().slice(0,1500));
  ok('the critical card opens with the 911 line', /If someone is in danger, call 911 now\. Anyone on the team can act on this/.test(card('c1')?.innerText||''), card('c1')?.innerText);
  ok('...and offers Help with this first, Take it… second', /Help with this/.test(card('c1').innerText) && /Take it…/.test(card('c1').innerText) && card('c1').querySelector('button.primary')?.textContent==='Help with this');

  /* Help with this */
  await TA.helpWith('c1'); await sleep(50);
  ok('Help with this: Krystal is the helper, Casey still owns it, Casey is told', it('c1').owner===C && it('c1').help_from===K && TA.unseen(it('c1'), C).some(n=>n.kind==='helping') && L.writes.includes('ops_items:c1'));
  myWorkGo('helping'); await sleep(150);
  ok('...on her Helping list with My part is done and This is finished', /My part is done/.test(card('c1')?.innerText||'') && /This is finished/.test(card('c1')?.innerText||''), card('c1')?.innerText);

  /* My part is done */
  TA.partDone('c1','act_c1'); await sleep(50);
  pop().querySelector('#taGo').click(); await sleep(30);
  ok('My part is done needs to say what was done', L.alerts.some(a=>/Say what you did/.test(a)) && !TA.unseen(it('c1'), C).some(n=>n.kind==='part_done'));
  pop().querySelector('#taDid').value='Called Maria, she is on her way (fake)'; pop().querySelector('#taNext').value='Check she clocked in (fake)';
  pop().querySelector('#taGo').click(); await sleep(80);
  ok('...then Casey gets it with what is left, Krystal stops being the helper, owner unchanged', it('c1').owner===C && !it('c1').help_from && TA.unseen(it('c1'), C).some(n=>n.kind==='part_done' && /on her way/.test(n.text) && /clocked in/.test(n.next)), it('c1'));

  /* ── Casey's side ── */
  as(C,'Casey Coord'); myWorkGo('today'); await sleep(200);
  ok('Casey sees FOR YOU TO KNOW: Krystal did their part', /FOR YOU TO KNOW/.test(mw()) && /Krystal did their part: NO CLOCK-IN/.test(mw()), mw().slice(0,900));
  ok('...and on the card, "Your turn: Check she clocked in"', /Krystal did their part:.*\n?.*Your turn: Check she clocked in/s.test(card('c1')?.innerText||''), card('c1')?.innerText);

  /* Escalate for decision (from the menu) */
  myWorkMore('c2', 'act_c2'); await sleep(30);
  const rows=[...document.querySelectorAll('.ccpick-row')].map(r=>r.textContent);
  ok('the menu says Needs team support… and Escalate for decision…, both "stays mine"; no "needs Samantha"', rows.some(t=>/Needs team support… \(stays mine\)/.test(t)) && rows.some(t=>/Escalate for decision… \(stays mine\)/.test(t)) && !rows.some(t=>/needs Samantha/.test(t)), rows);
  ccPopClose();
  await opsTriage('c2','needs_samantha'); await sleep(50);
  ok('Escalate asks the question, a recommendation, and Samantha or Zach', /What needs deciding\?/.test(pop().innerText) && /Samantha Troutman \(Leadership\)/.test(pop().innerText) && /Zach Troutman \(Leadership backup\)/.test(pop().innerText) && /never on firing or changing policy or pay/.test(pop().innerText), pop().innerText);
  pop().querySelector('#taQ').value='Can we run checks on Saturday at overtime? (fake)'; pop().querySelector('#taRec').value='Yes, this once';
  pop().querySelector('#taGo').click(); await sleep(80);
  ok('...the owner keeps it, it waits on the decision with a wake-up, Samantha is told', it('c2').owner===C && it('c2').decision?.to===S && it('c2').sub_state==='waiting' && /a decision from Samantha/.test(it('c2').waiting_on) && !!it('c2').check_back && TA.unseen(it('c2'),S).some(n=>n.kind==='decide'), it('c2'));

  /* Needs team support (from the menu): the picker suggests Krystal (In charge) */
  await opsTriage('a1','ask_help', true); await sleep(50);
  ok('Needs team support opens a picker, suggesting a teammate, not leadership', /Krystal|Casey/.test(pop()?.innerText||'') && !/Samantha Troutman.*Suggested/.test(pop()?.innerText||''), pop()?.innerText);
  ccPopClose();

  /* ── Samantha answers ── */
  as(S,'Samantha Troutman'); myWorkGo('today'); await sleep(200);
  ok('Samantha sees the decision on Today: "Casey asks you to decide"', /Casey asks you to decide\. It stays Casey’s\./.test(mw()) && /Waiting on a decision from Samantha/.test(card('c2')?.innerText||''), mw().slice(0,1200));
  ok('...with Answer as the main button', card('c2').querySelector('button.primary')?.textContent==='Answer');
  TA.answer('c2','act_c2'); await sleep(40);
  ok('the answer box shows the question and the recommendation', /overtime/.test(pop().innerText) && /Casey recommends: Yes, this once/.test(pop().innerText), pop().innerText);
  pop().querySelector('#taA').value='Yes, this Saturday only (fake)'; pop().querySelector('#taGo').click(); await sleep(80);
  ok('answered: Casey still owns it, no longer waiting, Casey is told', it('c2').owner===C && it('c2').decision.answer==='Yes, this Saturday only (fake)' && !it('c2').sub_state && TA.unseen(it('c2'),C).some(n=>n.kind==='decision'));

  /* ── Take it (transfer) needs a reason ── */
  as(A,'Angiel Test');
  TA.transfer('k2','act_k2'); await sleep(40);
  ok('Take it… asks to confirm with a reason, and points to Help with this', /Take responsibility from Krystal\?/.test(pop().innerText) && /use Help with this instead/.test(pop().innerText), pop().innerText);
  pop().querySelector('#taGo').click(); await sleep(30);
  ok('...no reason, no transfer', L.alerts.some(a=>/Pick a reason/.test(a)) && it('k2').owner===K);
  pop().querySelector('#taWhy').value='They’re out today'; pop().querySelector('#taGo').click(); await sleep(120);
  ok('...with a reason: Angiel owns it, the history keeps the reason, Krystal is told', it('k2').owner===A && /out today/.test(it('k2').owner_history.at(-1).note||'') && TA.unseen(it('k2'),K).some(n=>n.kind==='transferred' && /out today/.test(n.text)), it('k2'));

  /* ── This is finished (helper closes; owner can reopen) ── */
  await TA.helpWith('k1'); TA.finish('k1','act_k1'); await sleep(40);
  pop().querySelector('#taWhy').value='Called them, they are all set (fake)'; pop().querySelector('#taGo').click(); await sleep(80);
  ok('This is finished: closed by Angiel with the reason, owner unchanged, Krystal told, reopenable for a day', it('k1').status==='done' && it('k1').closed_by===A && it('k1').owner===K && TA.canReopen(it('k1')) && TA.unseen(it('k1'),K).some(n=>n.kind==='finished'));
  as(K,'Krystal Land'); myWorkGo('today'); await sleep(200);
  ok('Krystal sees "Angiel finished it" with Reopen and Got it', /Angiel finished it: Call the Jones family back/.test(mw()) && /Reopen/.test(document.getElementById('taNotices')?.innerText||'') && /Angiel took responsibility/.test(mw()), mw().slice(0,1200));
  await TA.reopen('k1'); await sleep(50);
  ok('Reopen: open and hers again; Angiel is told', it('k1').status==='open' && it('k1').owner===K && TA.unseen(it('k1'),A).some(n=>n.kind==='reopened'));
  const n=TA.myNotices().length; const f=TA.myNotices()[0]; await TA.gotIt(f.it.id, f.n.id); await sleep(30);
  ok('Got it clears a notice', TA.myNotices().length===n-1);

  /* ── settings ── */
  routeSetRender(); const rs=document.getElementById('routeSet').innerText;
  ok('Settings shows In charge, Leadership, Leadership backup, Payroll day and the ladder', /In charge now: Krystal/.test(rs) && /Leadership now: Samantha/.test(rs) && /Leadership backup/.test(rs) && /Payroll day/.test(rs) && /In charge at 10 min, Leadership at 20, backup at 35/.test(rs) && /911/.test(rs), rs);
  ok('nothing was texted, emailed or called', L.fn.length===0, L.fn);
  return R;
}
"""
def serve(route):
    url = route.request.url
    if 'supabase.co' in url: return route.abort()
    if url.startswith('http://hub.test/'):
        rel = url[len('http://hub.test/'):].split('?')[0].split('#')[0] or 'index.html'
        p = os.path.join(ROOT, rel)
        if os.path.isfile(p):
            return route.fulfill(status=200, body=open(p, 'rb').read(), headers={'Content-Type': mimetypes.guess_type(p)[0] or 'application/octet-stream'})
        return route.fulfill(status=404, body='')
    return route.continue_()
with sync_playwright() as pw:
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from clock_pin import pin
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1360, 'height': 900})
    pin(pg)
    pg.route('**/*', serve)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://hub.test/index.html?proof=team'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    if os.environ.get('SHOT'):
        pg.evaluate("()=>{ (0,eval)(\"ME={ email:'krystal@mo-care.com', name:'Krystal Land', shift:'day' };\"); myWorkGo('today'); }")
        pg.wait_for_timeout(300); pg.screenshot(path=os.environ['SHOT'], full_page=False)
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

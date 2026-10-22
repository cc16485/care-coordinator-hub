"""New clients scoreboard (bonus v2, Samantha 2026-10-22; mockup https://claude.ai/artifact/79mQxzxzEqGTebQPhPvMVS): off, only owners see
it as a practice preview; on, everyone sees the team goal and each person's client counts, dollars only on her own card
(owners see all), the earner sees "+$75" once and the teammate sees it without dollars; Settings is owners only. The real
page with a stand-in for the bonus service (made-up people). (python3 tests/browser/new_clients_look.py)
NC_SHOTS=<folder> also saves screenshots."""
import os, mimetypes
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SHOTS = os.environ.get('NC_SHOTS', '')
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
  (0,eval)(`ME={ email:'sam@mo-care.com', name:'Samantha T', shift:'day' }; CC_ROLE_BY_EMAIL={ 'sam@mo-care.com':['owner_admin'], 'kry@mo-care.com':['care_coordinator'], 'ang@mo-care.com':['care_coordinator'] }; CC_ROLES_CHECKED=true;`);
  try{ localStorage.clear(); }catch(e){}
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
  W.__board=(who)=>{ const owner=who==='sam', k=who==='kry'||owner, a=who==='ang'||owner;
    const kc=[{ client:'Helen Sample', first_visit:'2026-11-14', stage:'pending', day:9, visits:2, words:k?'Day 9 of 30 · 2 of 3 visits':'Day 9 of 30 · 2 of 3 visits', amount:k?75:undefined },
      { client:'Lois Sample', first_visit:'2026-11-02', stage:'earned', words:k?'Ready for approval':'Made it to day 30', amount:k?75:undefined }];
    const ac=[{ client:'Walter Sample', first_visit:'2026-11-05', stage:'pending', day:23, visits:7, words:'Day 23 of 30 · 3 of 3 visits', amount:a?75:undefined },
      { client:'Carol Sample', first_visit:'2026-11-01', stage:'earned', words:a?'Ready for approval':'Made it to day 30', amount:a?75:undefined }];
    return { v2:!!(DATA.ops_settings&&DATA.ops_settings.bonus_v2_live), month:'2026-11', goal:{ count:8, prize:'team lunch', got:4, left:4, reached:false },
      people:[{ name:'Krystal', you:who==='kry', money:k, count:2, pending:k?75:1, earned:k?75:1, paid:k?0:0, clients:kc }, { name:'Angiel', you:who==='ang', money:a, count:2, pending:a?75:1, earned:a?75:1, paid:0, clients:ac }],
      moments:[{ id:'bonus_carol', name:'Angiel', client:'Carol Sample', you:who==='ang', amount:a?75:undefined, earned_on:'2026-12-01' }] }; };
  W.__bonusCalls=[];
  W.Bonus=Object.assign(W.Bonus||{}, { call: async (b)=>{ W.__bonusCalls.push(b); const who=ME.email.startsWith('sam')?'sam':ME.email.startsWith('kry')?'kry':'ang';
    if(b.action==='scoreboard'){ if(!DATA.ops_settings.bonus_v2_live&&who!=='sam') return { off:true }; return W.__board(who); } return { error:'not in this test' }; } });
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, $=id=>document.getElementById(id), txt=()=>($('cgoNewClients')||{}).textContent||'', top=()=>($('todayNewClients')||{}).textContent||'';
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  switchTab('mywork'); await sleep(150);
  ok('the scoreboard lives on Client Goals now, not at the top of My Work', !!$('cgoNewClients')&&$('cgoNewClients').closest('#tab-clientgoals')&&!$('todayNewClients').closest('#tab-clientgoals'));
  const as=async e=>{ (0,eval)(`ME={ email:'${e}@mo-care.com', name:'${e}', shift:'day' };`); await NewClients.refresh(true); await sleep(80); };

  /* ── off ── */
  await as('kry');
  ok('off · a Care Coordinator sees no scoreboard', txt()==='', txt());
  await as('sam');
  ok('off · an owner sees only a preview link, and nothing is asked of the bonus service', /Preview the new clients scoreboard/.test(txt())&&window.__bonusCalls.length===0, window.__bonusCalls);
  ncPreview(); await sleep(100);
  ok('off · an owner sees it marked as a practice preview', /Practice preview/.test(txt())&&/Team goal: 8 new clients = team lunch/.test(txt()), txt().slice(0,300));

  /* ── on ── */
  DATA.ops_settings.bonus_v2_live=true;
  await as('kry');
  const t=txt();
  ok('on · Krystal sees the team goal: 4 of 8, 4 more to go', /Team goal: 8 new clients = team lunch/.test(t)&&/4 of 8 · 4 more to go/.test(t), t.slice(0,300));
  const cards=[...$('cgoNewClients').querySelectorAll('.nc-grid .nc-card')];
  ok('My Work top: nothing there for Krystal (no moment of her own)', top()==='', top());
  ok('on · her own card: dollars ($75 pending, $75 pending on Helen)', /Krystal \(you\)/.test(cards[0].textContent)&&/\$75/.test(cards[0].textContent)&&/\$75 pending · Day 9 of 30/.test(cards[0].textContent), cards[0].textContent);
  ok('on · Angiel’s card: counts only, no dollars, and it says why', !/\$/.test(cards[1].textContent)&&/Made it to day 30/.test(cards[1].textContent)&&/private to her and the owners/.test(cards[1].textContent), cards[1].textContent);
  ok('on · Krystal sees Angiel’s client made it, without dollars', /Angiel’s new client Carol Sample made it to day 30\./.test(t)&&!/You just earned/.test(t), t.slice(0,400));
  window.__shot1=true;
  await as('ang');
  ok('on · Angiel sees her moment at the top of My Work: +$75, and where the scoreboard is', /You just earned \$75/.test(top())&&/Carol Sample made it to day 30\. 4 of 8 toward team lunch\. The scoreboard is on Client Goals\./.test(top()), top().slice(0,300));
  $('todayNewClients').querySelector('.nc-moment button').click(); await sleep(50);
  ok('Got it: the moment goes away (this browser) and My Work is empty again', !/You just earned/.test(top()+txt())&&top()==='');
  await NewClients.refresh(true); await sleep(50);
  ok('…after a refresh too', !/You just earned/.test(top()+txt()));
  await as('sam');
  const c2=[...$('cgoNewClients').querySelectorAll('.nc-grid .nc-card')];
  ok('on · an owner sees dollars on both cards, no practice banner', c2.every(c=>/\$75/.test(c.textContent))&&!/Practice preview/.test(txt()));

  /* ── settings ── */
  switchTab('settings'); await sleep(150); try{ bvSetFill(); }catch(e){}
  ok('settings · the four fields show 75, 3, 8, team lunch', $('bvAmount').value==='75'&&$('bvVisits').value==='3'&&$('bvGoal').value==='8'&&$('bvPrize').value==='team lunch', [$('bvAmount').value,$('bvVisits').value,$('bvGoal').value,$('bvPrize').value]);
  $('bvGoal').value='10'; $('bvPrize').value='team lunch at Lambert’s'; await bvSave(); await sleep(80);
  ok('settings · an owner saves a new goal and prize', DATA.ops_settings.bonus.team_goal.count===10&&/Lambert/.test(DATA.ops_settings.bonus.team_goal.prize), DATA.ops_settings.bonus);
  (0,eval)(`ME={ email:'kry@mo-care.com', name:'kry', shift:'day' };`); L.alerts.length=0; await bvToggle(); await sleep(50);
  ok('settings · a Care Coordinator cannot turn it off or on', DATA.ops_settings.bonus_v2_live===true&&L.alerts.some(a=>/Only Samantha or Zachary/.test(a)), L.alerts);
  (0,eval)(`ME={ email:'sam@mo-care.com', name:'sam', shift:'day' };`); await bvToggle(); await sleep(80);
  ok('settings · the owner turns it off, saved', DATA.ops_settings.bonus_v2_live===false);
  ok('the page never reads the bonus records itself: only the scoreboard action is asked', window.__bonusCalls.every(b=>b.action==='scoreboard'), window.__bonusCalls);
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
    pg.goto('http://hub.test/index.html?proof=newclients'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True)
        pg.evaluate("()=>{ document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; DATA.ops_settings.bonus_v2_live=true; switchTab('clientgoals'); }")
        for who, name in (('kry', '1-krystal-sees'), ('ang', '2-angiel-sees')):
            pg.evaluate("e=>{ (0,eval)(`ME={ email:'${e}@mo-care.com', name:'${e}', shift:'day' };`); return NewClients.refresh(true); }", who); pg.wait_for_timeout(500)
            pg.evaluate("()=>{ const e=document.getElementById('cgoNewClients'); e.scrollIntoView(); window.scrollBy(0,-90); }"); pg.wait_for_timeout(200)
            pg.screenshot(path=os.path.join(SHOTS, name + '.png'))
        b.close(); print('saved to', SHOTS); raise SystemExit(0)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

"""Leads intake desk, Stage 2: the board. The real page, offline, made-up families only, with the clock frozen at Tuesday
Oct 6 2026 10:10 am Chicago. Proves the five numbers, the three groups in order, the story rows (name · why · need · last
· next), one primary button per row, the follow-up pop-up moving a row to Scheduled, the ··· menu, the look-ups and the
older header-chip filters. Saves are recorded, never sent. (python3 tests/browser/leads_stage2_look.py, static server on 8765)"""
from playwright.sync_api import sync_playwright
STUB = r"""
(()=>{
  const W=window; W.__log={ writes:[], opened:[] };
  (0,eval)(`window.__RealDate=Date; window.__NOW=new __RealDate('2026-10-06T15:10:00Z').getTime();
    Date=class extends __RealDate{ constructor(...a){ if(a.length) super(...a); else super(window.__NOW); } static now(){ return window.__NOW; } };`);
  (0,eval)(`sb={ from:()=>{ const p={ select(){return p;}, eq(){return p;}, in(){return p;}, not(){return p;}, order(){return p;}, limit(){return p;},
      maybeSingle:async()=>({data:null,error:null}), then(a){ return Promise.resolve({data:[],error:null}).then(a); } }; return p; },
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async()=>({data:null,error:null}) }, auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };`);
  W.persist=async(k,v)=>{ W.__log.writes.push(JSON.parse(JSON.stringify(v))); };
  W.openLeadProfile=(id,tab)=>{ W.__log.opened.push(id+':'+(tab||'')); };
  W.lsLoadFacts=async()=>{ LS.facts={ epOf:{}, scOf:{}, planOf:{} }; };
  W.ccToast=()=>{}; W.opEvent=()=>{};
  const H=h=>new Date(Date.now()+h*36e5).toISOString();
  DATA.ops_settings={ lead_response_hours:{ days:[0,1,2,3,4,5,6], start:'08:00', end:'18:00' } };
  DATA.referral_orgs=[{ id:'org1', name:'Mercy Rehab', type:'Rehab / Skilled Nursing' }];
  DATA.care_assessments=[{ id:'a1', lead_id:'dor', status:'Scheduled', visit_date:'2026-10-08', client_name:'Dorothy Lindqvist' }, { id:'a2', lead_id:'wal', status:'Completed — Awaiting Plan', visit_date:'2026-10-04', client_name:'Walter Brandt' }];
  DATA.post_call_followups=[{ id:'d1', status:'pending_approval' }];
  DATA.leads=[
    { id:'ruth', first_name:'Patrice', last_name:'Keller', relationship:'Niece', client_first_name:'Ruth Ann', client_last_name:'Keller', client_city:'Republic', status:'New', source:'Website', phone:'4175550164', created_at:'2026-10-06T14:58:00Z', ack_sent_at:'2026-10-06T14:58:20Z', interest_notes:'Aunt home from Mercy Thursday, needs help mornings\nCity: Republic', assigned_coordinator:'Krystal',
      contact_events:[{ at:'2026-10-06T14:58:00Z', channel:'web', direction:'in', outcome:'inquiry', actor:'family' }] },
    { id:'marj', first_name:'Diane', last_name:'Teague', client_first_name:'Marjorie', client_last_name:'Teague', why_called:'Daughter looking for care for her mom', funding_source:'private', desired_start:{ kind:'by_date', date:'2026-10-09' }, schedule:{ days:['Mon','Tue','Wed','Thu','Fri'], times:'9 am–1 pm', hours_per_week:20 }, client_city:'Nixa', status:'Contacted', phone:'4175550131', source:'Website', assigned_coordinator:'Krystal', family_last_reply_at:'2026-10-06T14:48:00Z', first_human_attempt_at:'2026-10-06T13:12:00Z',
      contact_events:[{ at:'2026-10-06T13:12:00Z', channel:'call', direction:'out', outcome:'voicemail', actor:'human' }, { at:'2026-10-06T14:48:00Z', channel:'sms', direction:'in', outcome:'reply', actor:'family' }] },
    { id:'har', first_name:'Harold', last_name:'Pruitt', client_first_name:'Harold', client_last_name:'Pruitt', why_called:'Calling for himself', funding_source:'va', desired_start:{ kind:'asap' }, client_city:'Ozark', status:'Contacted', phone:'4175550177', source:'Phone', assigned_coordinator:'Krystal', promised_callback_at:'2026-10-06T09:00:00', first_human_contact_at:'2026-10-01T20:00:00Z', first_human_attempt_at:'2026-10-01T20:00:00Z',
      contact_events:[{ at:'2026-10-01T20:00:00Z', channel:'call', direction:'out', outcome:'connected', actor:'human', duration_s:840, note:'quoted $32/hr' }] },
    { id:'dor', first_name:'Greg', last_name:'Lindqvist', client_first_name:'Dorothy', client_last_name:'Lindqvist', why_called:'Son arranging care before she leaves rehab', funding_source:'medicaid', desired_start:{ kind:'by_date', date:'2026-10-08' }, client_city:'Springfield', status:'Assessment Scheduled', phone:'4175550126', source:'Referral', referral_org_id:'org1', assigned_coordinator:'Krystal', first_human_contact_at:'2026-10-05T20:40:00Z', first_human_attempt_at:'2026-10-05T20:40:00Z', schedule:{ days:['Mon','Tue','Wed','Thu','Fri'], times:'mornings', hours_per_week:null } },
    { id:'wal', first_name:'Walter', last_name:'Brandt', client_first_name:'Walter', client_last_name:'Brandt', why_called:'Recently widowed', funding_source:'private', desired_start:{ kind:'this_month' }, client_city:'Nixa', status:'Assessment Scheduled', phone:'4175550190', source:'Phone', assigned_coordinator:'Krystal', first_human_contact_at:'2026-10-02T20:00:00Z', schedule:{ days:['Mon','Wed','Fri'], times:'mornings', hours_per_week:12 } },
    { id:'eve', first_name:'Tom', last_name:'Marsh', client_first_name:'Evelyn', client_last_name:'Marsh', why_called:'Son gathering her LTC policy', funding_source:'ltc', desired_start:{ kind:'this_month' }, client_city:'Springfield', status:'Contacted', phone:'4175550109', source:'Referral', referral_source_name:'Cox South discharge planner', assigned_coordinator:'Krystal', follow_up_due:'2026-10-03', first_human_contact_at:'2026-09-30T14:00:00Z' },
    { id:'ber', first_name:'Linda', last_name:'Oakes', client_first_name:'Bernard', client_last_name:'Oakes', why_called:'Daughter-in-law checking what the VA will cover', funding_source:'va', desired_start:{ kind:'planning' }, client_city:'Rogersville', status:'Contacted', phone:'4175550155', source:'Website', assigned_coordinator:'Krystal', follow_up_due:'2026-10-07', follow_up_time:'10:00', first_human_contact_at:'2026-09-30T14:00:00Z' },
    { id:'lor', first_name:'Carla', last_name:'Abbott', client_first_name:'Lorene', client_last_name:'Abbott', why_called:'Daughter manages for now, worried about falls', funding_source:'medicaid', desired_start:{ kind:'asap' }, client_city:'Marshfield', status:'Contacted', phone:'4175550117', source:'Referral', assigned_coordinator:'Krystal', waiting:{ reason:'state', since:'2026-09-20', check_back:'2026-10-12', note:'DCN submitted Sep 20' }, first_human_contact_at:'2026-09-20T14:00:00Z', state_status:'submitted', state_submitted:'2026-09-20' },
    { id:'cli', first_name:'Joyce', last_name:'Haney', client_first_name:'Clifford', client_last_name:'Haney', why_called:'Wife took the dementia course, not ready yet', funding_source:'private', desired_start:{ kind:'planning' }, client_city:'Springfield', status:'Contacted', phone:'4175550171', source:'Website', assigned_coordinator:'Samantha', waiting:{ reason:'not_ready', since:'2026-09-02', check_back:'2026-10-06', note:'' }, first_human_contact_at:'2026-09-02T14:00:00Z' },
    { id:'lost1', first_name:'Gone', last_name:'Family', status:'Lost', lost_reason:'Price', created_at:'2026-09-01T14:00:00Z' },
    { id:'spam1', first_name:'Spam', last_name:'Bot', status:'Lost', spam:{ at:'2026-09-01T14:00:00Z', by:'x' }, created_at:'2026-09-01T14:00:00Z' } ];
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,800)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  switchTab('leadsstarts'); await sleep(500); renderLeadsStarts(); await sleep(200);
  /* 2026-10-18 test refresh: the board's rows are compact now (a name button, then details that fold open under the row),
     and the default order is Most important; this test checks the grouped view, so it asks for Due first. Since
     2026-10-14 (her decision: no IHS or ADW Medicaid from 11-16) a Medicaid family needs a person now: Change payer. */
  lbSort('due'); await sleep(150);
  const T=()=>document.getElementById('lbBoard').innerText, rows=()=>[...document.querySelectorAll('#lbBoard .lb-row.lbc')];
  const names=()=>rows().map(r=>r.querySelector('.lbc-name').textContent.trim());
  const det=r=>{ const d=r.nextElementSibling; return d && d.classList.contains('lbc-det') ? d : null; };
  const full=r=>(r.textContent+' '+(det(r)?det(r).textContent:'')).replace(/\s+/g,' ');
  const tiles=[...document.querySelectorAll('#lbNumbers .lb-tile')].map(t=>t.innerText.replace(/\s+/g,' ').trim());
  ok('the numbers: 8 need you now (the two Medicaid families now need a person) · 1 new nobody has tried · 0 assessments today · 0 waiting · 0 missing required · median –', tiles[0]==='8 need you now' && tiles[1]==='1 new, nobody has tried' && tiles[2]==='0 assessments today' && tiles[3]==='0 waiting' && tiles[4]==='0 missing required' && /median first attempt today/.test(tiles[5]), tiles);
  ok('groups in order: Need you now, Scheduled, Waiting', T().indexOf('NEED YOU NOW')<T().indexOf('SCHEDULED') && T().indexOf('SCHEDULED')<T().indexOf('WAITING'));
  ok('Need you now, most urgent first: NEW overdue → replied → promised call late → the two Medicaid families → plan not written → follow-up late → check-back due', names().slice(0,8).join('|')==='Ruth Ann Keller|Marjorie Teague|Harold Pruitt|Dorothy Lindqvist|Lorene Abbott|Walter Brandt|Evelyn Marsh|Clifford Haney', names());
  const r0=full(rows()[0]);
  ok('the NEW row: "NEW · 12 min" + OVERDUE, why from the notes, Republic; Call is the filled button and calls from the office line', /NEW · 12 min/.test(r0) && /OVERDUE: first call was due at 5 minutes/.test(r0) && /Aunt home from Mercy Thursday, needs help mornings/.test(r0) && /Call Patrice: first attempt/.test(r0) && /Republic/.test(r0) && rows()[0].querySelector('.lb-btn-primary').textContent==='Call' && rows()[0].querySelector('.lb-btn-primary').getAttribute('data-oc-phone')==='4175550164', r0);
  const r1=full(rows()[1]);
  ok('the replied row tells the story: Wants care by Fri · Private pay · Mon–Fri 9 am–1 pm · about 20 hrs/wk · Nixa; They texted 9:48 am; Text back is primary', /Replied 22 min ago/.test(r1) && /Wants care by Fri · Private pay · Mon–Fri 9 am–1 pm · about 20 hrs\/wk · Nixa/.test(r1) && /They texted 9:48 am/.test(r1) && rows()[1].querySelector('.lb-btn-primary').textContent==='Text back', r1);
  const r2=full(rows()[2]);
  ok('the promised-call row: "Call promised 9 am" · "1 h 10 min late" · last = 14-min call Thu 3 pm "quoted $32/hr"', /Call promised 9 am/.test(r2) && /1 h 10 min late/.test(r2) && /14-min call, we talked Thu 3 pm · "quoted \$32\/hr"/.test(r2), r2);
  const dor=rows().find(r=>/Dorothy/.test(r.textContent));
  ok('a Medicaid family (Dorothy) needs a person now: we no longer take Medicaid, Change payer is the one button', /Medicaid: not accepted/.test(full(dor)) && dor.querySelector('.lb-btn-primary').textContent==='Change payer', full(dor));
  ok('referral shows as Mercy Rehab on the row that has it', /Referral · Mercy Rehab/.test(full(dor)));
  ok('the Waiting group is empty and says so; Clifford\'s check-back is due, so he moved up to Need you now', /Nobody is waiting\./.test(T()) && /Check back today[\s\S]*Family not ready since/.test(full(rows().find(r=>/Clifford/.test(r.textContent)))));
  ok('Scheduled has day headers and Bernard at 10 am tomorrow', /TOMORROW[\s\S]*Bernard Oakes[\s\S]*10 am/.test(T().slice(T().indexOf('SCHEDULED'), T().indexOf('WAITING'))), T().slice(T().indexOf('SCHEDULED'), T().indexOf('WAITING')));
  ok('Need you now rows have exactly one filled button; Scheduled rows none; every row has ··· in its details', rows().slice(0,8).every(r=>r.querySelectorAll('.lb-btn-primary').length===1) && rows().slice(8).every(r=>r.querySelectorAll('.lb-btn-primary').length===0) && rows().every(r=>det(r) && det(r).querySelector('.lb-more')), rows().map(r=>r.querySelectorAll('.lb-btn-primary').length));
  ok('owner shown with an initial; Clifford is Samantha\'s', rows().every(r=>r.querySelector('.lb-av')) && rows().find(r=>/Clifford/.test(r.textContent)).querySelector('.lb-av').textContent==='S');
  /* a row click shows the details; the name opens the profile; a button click does not open twice */
  const marj=rows()[1]; marj.click(); await sleep(50);
  ok('clicking the row folds its details open (and opens nothing)', !det(rows()[1]).hidden && window.__log.opened.length===0, window.__log.opened);
  rows()[1].querySelector('.lbc-name').click(); await sleep(50);
  ok('clicking the name opens the profile on Summary', window.__log.opened.slice(-1)[0]==='marj:summary', window.__log.opened);
  rows()[1].querySelector('.lb-btn-primary').click(); await sleep(50);
  ok('Text back opens the conversation (profile Summary) and does not double-open', window.__log.opened.length===2 && window.__log.opened.slice(-1)[0]==='marj:summary', window.__log.opened);
  /* Set follow-up on Evelyn (late): pick Friday 2:30, note → she moves to Scheduled */
  const eve=rows().find(r=>/Evelyn Marsh/.test(r.textContent));
  ok('the late follow-up row: Call is primary, Log call in its details, the rest behind ···', eve.querySelector('.lb-btn-primary').textContent==='Call' && [...det(eve).querySelectorAll('.lb-btn')].some(b=>b.textContent==='Log call') && det(eve).querySelector('.lb-more'), full(eve));
  det(eve).querySelector('.lb-more').click(); await sleep(80);
  [...document.querySelectorAll('.ccpop .ccpick-row')].find(x=>/Set a follow-up/.test(x.textContent)).click(); await sleep(120);
  const pop=document.querySelector('.ccpop'); pop.querySelector('#lbFuDate').value='2026-10-09'; pop.querySelector('#lbFuTime').value='14:30'; pop.querySelector('#lbFuNote').value='Did Genworth send the policy?'; pop.querySelector('#lbFuGo').click(); await sleep(300);
  const w=window.__log.writes.filter(x=>x.id==='eve').slice(-1)[0];
  ok('saved: follow_up_due Fri, time 2:30, note; the row is now under Scheduled · Friday · 2:30 pm', w && w.id==='eve' && w.follow_up_due==='2026-10-09' && w.follow_up_time==='14:30' && /FRIDAY[\s\S]*Evelyn Marsh[\s\S]*2:30 pm/.test(T()) && !/Follow-up 3 days late/.test(T()), [w && w.follow_up_due, w && w.follow_up_time, T().slice(T().indexOf('SCHEDULED'), T().indexOf('WAITING'))]);
  ok('...and Need you now went from 8 to 7', document.querySelector('#lbNumbers .lb-tile').innerText.replace(/\s+/g,' ').trim()==='7 need you now', document.querySelector('#lbNumbers .lb-tile').innerText);
  /* the ··· menu */
  det(rows()[0]).querySelector('.lb-more').click(); await sleep(80);
  const items=[...document.querySelectorAll('.ccpop .ccpick-row')].map(x=>x.textContent);
  ok('··· menu: open profile, edit the inquiry, schedule, follow-up, save for future, They said yes, mark lost, spam (a web inquiry)', items.length===8 && /Save for future/.test(items.join()) && /They said yes/.test(items.join()) && /Mark lost/.test(items.join()) && /spam/.test(items.join()), items);
  ccPopCloseAll();
  /* look-ups */
  lbFilter('set:past'); await sleep(100);
  ok('Look up → Past shows the lost family with its reason, not the working rows', /Gone Family/.test(T()) && /Lost: Price/.test(T()) && !/Ruth Ann/.test(T()), T().slice(0,300));
  lbFilter('set:spam'); await sleep(50); ok('Spam look-up shows the spam row', /Spam Bot/.test(T()), T().slice(0,200));
  lbFilter('now'); await sleep(50); ok('the Need you now tile filters to that group only', /NEED YOU NOW/.test(T()) && !/SCHEDULED/.test(T()));
  lbFilter('All'); lsGo('Follow-up due'); await sleep(100);
  ok('the older header chip (Follow-up due) still lands on the board (Need you now)', /NEED YOU NOW/.test(T()) && LeadsBoard.state.filter==='now', LeadsBoard.state.filter);
  lbFilter('All'); lbOwner('Samantha'); await sleep(50);
  ok('the owner lens: Samantha\'s families only (Clifford)', names().length===1 && names()[0]==='Clifford Haney', names());
  lbOwner(''); await sleep(50);
  ok('the look-up row has Said yes this month, Future opportunities, Receiving care, Past, Archived, Spam, State submissions and the drafts archive link', /Said yes this month 0/.test(document.getElementById('lbLookup').innerText) && /Future opportunities/.test(document.getElementById('lbLookup').innerText) && /All follow-up drafts/.test(document.getElementById('lbLookup').innerText), document.getElementById('lbLookup').innerText);
  lbSort('imp');
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1360, 'height': 900})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=leads2'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

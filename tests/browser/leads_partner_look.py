"""Item 3 (2026-10-07): referral subtype, the two flags, the partner loop as drafts. The real page, offline. Proves: the board row and the
workspace carry the discharge and staffing-risk chips; the Referral partner card lists what is due and what they heard; Draft it opens the
words, Email sends through the comms door pointed at the partner (never the family) and records it; Copy + mark records a call; the intake
form fills the subtype from the partner's record; Settings → Leads has the five partner lines. (python3 tests/browser/leads_partner_look.py)"""
from playwright.sync_api import sync_playwright
STUB = r"""
(()=>{
  const W=window; W.__log={ writes:[], comms:[] };
  (0,eval)(`window.__RealDate=Date; window.__NOW=new __RealDate('2026-10-06T15:10:00Z').getTime();
    Date=class extends __RealDate{ constructor(...a){ if(a.length) super(...a); else super(window.__NOW); } static now(){ return window.__NOW; } };`);
  (0,eval)(`sb={ from:()=>{ const p={ select(){return p;}, eq(){return p;}, in(){return p;}, not(){return p;}, order(){return p;}, limit(){return p;},
      maybeSingle:async()=>({data:null,error:null}), then(a){ return Promise.resolve({data:[],error:null}).then(a); } }; return p; },
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async()=>({data:null,error:null}) }, auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };`);
  W.persist=async(k,v)=>{ W.__log.writes.push({ k, v:JSON.parse(JSON.stringify(v)) }); };
  W.commsCall=async(b)=>{ W.__log.comms.push(JSON.parse(JSON.stringify(b))); return { status:'sent' }; };
  W.lsLoadFacts=async()=>{ LS.facts={ epOf:{}, scOf:{}, planOf:{} }; }; W.ccToast=()=>{}; W.opEvent=()=>{}; W.myWorkRefresh=()=>{};
  W.refreshCommsTimeline=async()=>{}; W.axLogLoad=async()=>{}; W.callsLoad=async()=>{}; W.cpRenderEvvForms=async()=>{}; W.famMount=async()=>{}; W.cjMountProfile=async()=>{};
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Land' }; OPS_PEOPLE=[{ primary_email:'krystal@mo-care.com', full_name:'Krystal Land' }];");
  DATA.ops_settings={ lead_response_hours:{ days:[0,1,2,3,4,5,6], start:'08:00', end:'18:00' } };
  DATA.referral_orgs=[{ id:'o1', name:'Mercy Rehab', type:'Rehab / Skilled Nursing', people:'Jan Ortiz (discharge planner)', phone:'4175550100', email:'referrals@mercy.org' }];
  DATA.care_assessments=[]; DATA.post_call_followups=[]; DATA.ops_items=[]; DATA.referral_activities=[];
  DATA.caregivers=[]; DATA.caregiver_availability=[{ axiscare_id:'11', name:'A', windows:{ mon:['morning'] } },{ axiscare_id:'12', name:'B', windows:{ sat:['overnight'], sun:['overnight'] } }];
  DATA.leads=[{ id:'mar', first_name:'Diane', last_name:'Teague', client_first_name:'Marjorie', client_last_name:'Teague', relationship:'daughter', source:'Referral', referral_org_id:'o1', client_city:'Nixa', funding_source:'private', phone:'4175550131',
      desired_start:{ kind:'by_date', date:'2026-10-08' }, schedule:{ days:['Sat','Sun'], times:'overnight', hours_per_week:20 }, why_called:'Coming home from rehab Thursday', status:'Contacted', assigned_coordinator:'Krystal', created_at:'2026-10-05T14:00:00Z',
      first_human_attempt_at:'2026-10-06T14:00:00Z', first_human_contact_at:'2026-10-06T14:00:00Z', contact_events:[{ at:'2026-10-06T14:00:00Z', channel:'call', direction:'out', outcome:'connected', actor:'human', by:'krystal@mo-care.com' }] }];
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,900)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  switchTab('leadsstarts'); await sleep(500); renderLeadsStarts(); await sleep(200);
  const row=[...document.querySelectorAll('#lbBoard .lb-row')].find(r=>/Marjorie/.test(r.innerText));
  ok('the board row: red "Needs care by Thu · rehab discharge, assessment not booked", with the discharge and staffing-risk chips', row && /Needs care by Thu\s*rehab discharge, assessment not booked/.test(row.innerText) && row.querySelector('[data-flag="urgent_discharge"]') && row.querySelector('[data-flag="staffing_risk"]') && /Staffing risk: 1 caregiver available Weekends overnights/.test(row.innerText), row && row.innerText.slice(0,300));
  await openClient({ lead_id:'mar' }, 'summary'); await sleep(400);
  const host=document.getElementById('lwHost'), T=()=>host.innerText;
  ok('the workspace header carries both chips; the staffing card says 1 caregiver and shows Staffing risk', /Rehab discharge: needs care by Thu/.test(T()) && /Staffing risk: 1 caregiver available Weekends overnights/.test(T()) && /1 caregiver says they are available Weekends overnights/.test(T()), T().slice(0,600));
  ok('the Referral partner card: Mercy Rehab · Rehab / skilled nursing, Jan, the phone from the office line, the email; "We reached the family" is due with Draft it; nothing has gone to them', /Referral partner\s*Mercy Rehab · Rehab \/ skilled nursing\s*Jan Ortiz/.test(T()) && host.querySelector('a[data-oc-phone="4175550100"]') && /referrals@mercy.org/.test(T()) && /DUE TO GO \(A DRAFT, YOU SEND IT\)\s*We reached the family\s*Draft it/i.test(T()) && /Nothing has gone to them yet/.test(T()), T().slice(T().indexOf('Referral partner'), T().indexOf('Referral partner')+400));
  /* Draft it → Email */
  [...host.querySelectorAll('button')].find(b=>b.textContent==='Draft it').click(); await sleep(120);
  const pop=document.querySelector('.ccpop');
  ok('Draft it opens her words, editable, with Email referrals@mercy.org and Copy', pop && /To Mercy Rehab: We reached the family/.test(pop.innerText) && /^Hi Jan, this is Krystal with Caring Companions\. Thank you for referring Marjorie Teague to us\./.test(pop.querySelector('#lwPdText').value) && /Email referrals@mercy.org/.test(pop.innerText) && /Copy, I will call or text/.test(pop.innerText), pop && pop.innerText);
  pop.querySelector('#lwPdText').value='Hi Jan, Krystal here. We reached Diane this morning; visit set up soon.'; pop.querySelector('#lwPdEmail').click(); await sleep(400);
  const c=window.__log.comms[0], l=DATA.leads[0];
  ok('Email: goes through the comms door pointed at the PARTNER (email referrals@mercy.org, no phone, first name Jan), subject names the update and the client; the family is not the recipient', c && c.action==='send_email' && c.email==='referrals@mercy.org' && c.phone===undefined && c.first_name==='Jan' && /We reached the family \(Marjorie Teague\)/.test(c.subject) && /Krystal here/.test(c.message), c);
  ok('...recorded on the inquiry (kind receipt, email, by Krystal) and as a touch on the partner\'s record; the card now shows "They heard from us" and the receipt is no longer due', l.partner_msgs.length===1 && l.partner_msgs[0].kind==='receipt' && l.partner_msgs[0].channel==='email' && l.partner_msgs[0].by==='krystal@mo-care.com' && DATA.referral_activities.length===1 && DATA.referral_activities[0].org_id==='o1' && /We reached the family/.test(DATA.referral_activities[0].note)
    && /They heard from us\s*We reached the family · today 10:10 am · email · Krystal/i.test(T()) && !/Draft it/.test(T()) && window.__log.writes.some(w=>w.k==='leads'&&w.v.partner_msgs) && window.__log.writes.some(w=>w.k==='referral_activities'), [l.partner_msgs, DATA.referral_activities, T().slice(T().indexOf('Referral partner'), T().indexOf('Referral partner')+300)]);
  ok('...and the timeline shows it', /Krystal emailed Mercy Rehab: we reached the family/.test(T()));
  /* a booked visit: the assessment line is due; Copy + mark by call */
  DATA.care_assessments=[{ id:'a1', lead_id:'mar', status:'Scheduled', visit_date:'2026-10-07' }]; lwRender(); await sleep(100);
  ok('a booked visit: "Assessment scheduled" is due', /Assessment scheduled\s*Draft it/.test(T()));
  window.confirm=()=>true; [...host.querySelectorAll('button')].find(b=>b.textContent==='Draft it').click(); await sleep(120);
  const pop2=document.querySelector('.ccpop'); ok('...the words say tomorrow', /assessment scheduled for tomorrow/.test(pop2.querySelector('#lwPdText').value), pop2.querySelector('#lwPdText').value);
  pop2.querySelector('#lwPdCopy').click(); await sleep(300);
  ok('Copy and mark: recorded as told by call, a call touch on the partner; nothing else went through the comms door', l.partner_msgs.length===2 && l.partner_msgs[1].kind==='assessment' && l.partner_msgs[1].channel==='call' && DATA.referral_activities.length===2 && DATA.referral_activities[1].kind==='call' && window.__log.comms.length===1, l.partner_msgs);
  /* the intake form: the subtype fills itself from the partner */
  openLeadModal(); await sleep(100);
  const sel=document.getElementById('lead_referral_org_id'); sel.value='o1'; leadRefOrgPicked();
  ok('the intake form: picking Mercy Rehab fills the subtype (rehab / skilled nursing) and the source; it can be changed', document.getElementById('lead_referral_subtype').value==='snf_rehab' && document.getElementById('lead_source').value==='Referral');
  document.getElementById('lead_first_name').value='Pat'; document.getElementById('lead_last_name').value='Lee'; document.getElementById('lead_phone').value='4175550199'; document.getElementById('lead_referral_subtype').value='case_manager'; await saveLead(); await sleep(150);
  const w=window.__log.writes.filter(x=>x.k==='leads').slice(-1)[0].v;
  ok('...and saves on the inquiry (referral_subtype case_manager, org o1)', w.referral_subtype==='case_manager' && w.referral_org_id==='o1', w);
  /* settings */
  switchTab('settings'); await sleep(300); lhSetFill();
  ok('Settings → Leads: the five partner lines, blank, standard wording in grey', document.querySelectorAll('#lwPartner textarea[data-partner]').length===5 && /Thank you for referring/.test(document.querySelector('#lwPartner textarea[data-partner="receipt"]').placeholder));
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1360, 'height': 1000})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=partner'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T)
    pg.evaluate("async()=>{ await openClient({ lead_id:'mar' }, 'summary'); }"); pg.wait_for_timeout(500)
    pg.screenshot(path='tests/browser/partner.png', full_page=True)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

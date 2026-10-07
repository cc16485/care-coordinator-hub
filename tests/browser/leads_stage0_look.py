"""Leads intake desk, Stage 0: the intake form asks the new questions (when they want care, the days, why they called,
waiting on something) and the saved lead carries desired_start / schedule / waiting, never the form's helper fields; an
older lead's urgency radio still reads; the lost-reason list is the fixed one. The real page, offline, made-up people
only; saves are recorded, never sent. (python3 tests/browser/leads_stage0_look.py, with the static server on 8765)"""
from playwright.sync_api import sync_playwright
STUB = r"""
(()=>{
  const W=window; W.__log={ writes:[], prompts:[] };
  const clone=x=>JSON.parse(JSON.stringify(x));
  (0,eval)(`sb={ from:()=>{ const p={ select(){return p;}, eq(){return p;}, in(){return p;}, not(){return p;}, order(){return p;}, limit(){return p;},
      maybeSingle:async()=>({data:null,error:null}), then(a){ return Promise.resolve({data:[],error:null}).then(a); } }; return p; },
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async()=>({data:null,error:null}) },
    auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };`);
  W.persist=async(k,v)=>{ W.__log.writes.push(clone(v)); };
  W.ckCheckNewInquiry=async()=>({proceed:true, note:''});
  W.jcLoadConn=async()=>null; W.renderLeads=()=>{}; W.renderLeadsStarts=()=>{}; W.renderFollowUpQueue=()=>{};
  W.ccToast=()=>{}; W.alert=m=>W.__log.alerts=(W.__log.alerts||[]).concat([m]);
  DATA.leads=[
    { id:'old1', first_name:'Tom', last_name:'Marsh', client_first_name:'Evelyn', client_last_name:'Marsh', urgency:'7days', days_needed:'Mon, Wed, Fri', times_needed:'9-1', number_of_hours:'12', status:'Contacted', created_at:new Date(Date.now()-5*864e5).toISOString() },
    { id:'drip1', first_name:'Joyce', last_name:'Haney', client_first_name:'Clifford', client_last_name:'Haney', urgency:'researching', status:'Contacted', nurture_sequence:'not_ready', nurture_started_at:new Date(Date.now()-10*864e5).toISOString(), created_at:new Date(Date.now()-12*864e5).toISOString() } ];
  DATA.referral_orgs=[]; DATA.care_assessments=[]; DATA.post_call_followups=[];
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, v=id=>document.getElementById(id).value, set=(id,x)=>{ document.getElementById(id).value=x; };
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  const chi=d=>new Date(Date.now()+d*864e5).toLocaleDateString('en-CA',{timeZone:'America/Chicago'});

  /* ── a new lead, the first call ── */
  openLeadModal(); await sleep(100);
  ok('the form asks when they want care (a select), not the four urgency radios', !!document.getElementById('lead_desired_start_kind') && !document.querySelector('input[name=lead_urgency]'));
  ok('the date box is hidden until "By a date"', document.getElementById('leadStartDateBox').style.display==='none');
  set('lead_first_name','Diane'); set('lead_last_name','Teague'); set('lead_client_first_name','Marjorie'); set('lead_client_last_name','Teague'); set('lead_client_city','Nixa');
  set('lead_desired_start_kind','by_date'); leadStartUI(); ok('...picking By a date shows the date', document.getElementById('leadStartDateBox').style.display!=='none');
  set('lead_desired_start_date', chi(3));
  setCheckedValues('lead_schedule_days',['Mon','Tue','Wed','Thu','Fri']); set('lead_times_needed','9 am–1 pm'); set('lead_number_of_hours','20');
  set('lead_why_called','Daughter looking for morning help for her mom after a fall'); set('lead_interest_notes','Mom fell last week.\nCity: Nixa');
  await saveLead(); await sleep(150);
  const s1=L.writes[L.writes.length-1];
  ok('saved: desired_start by that date', s1&&s1.desired_start&&s1.desired_start.kind==='by_date'&&s1.desired_start.date===chi(3)&&!!s1.desired_start.asked_at, s1&&s1.desired_start);
  ok('...schedule as days + times + hours; the old days text is NOT written any more (clean-up 6.4)', s1.schedule&&s1.schedule.days.join()==='Mon,Tue,Wed,Thu,Fri'&&s1.schedule.times==='9 am–1 pm'&&s1.schedule.hours_per_week===20&&!s1.days_needed, s1.schedule);
  ok('...why they called kept; no waiting; none of the form helpers on the record', s1.why_called==='Daughter looking for morning help for her mom after a fall'&&!s1.waiting&&!('desired_start_kind' in s1)&&!('schedule_days' in s1)&&!('waiting_reason' in s1)&&!('waiting_check_back' in s1)&&!('urgency' in s1), Object.keys(s1));
  ok('...the board words for this family', LeadRules.desiredStartWords(s1)==='Wants care by '+LeadRules.dayWords(chi(3),chi(0))&&LeadRules.scheduleWords(s1)==='Mon–Fri 9 am–1 pm · about 20 hrs/wk', [LeadRules.desiredStartWords(s1), LeadRules.scheduleWords(s1)]);
  const newId=s1.id; DATA.leads.push(s1);

  /* ── reopen: the form fills from the objects ── */
  openLeadModal(newId); await sleep(100);
  ok('reopened: kind, date, days, why all fill back', v('lead_desired_start_kind')==='by_date'&&v('lead_desired_start_date')===chi(3)&&getCheckedValues('lead_schedule_days').length===5&&v('lead_why_called').startsWith('Daughter'), [v('lead_desired_start_kind'), v('lead_desired_start_date'), getCheckedValues('lead_schedule_days')]);
  /* waiting on the state, no date typed → the default a week out */
  set('lead_waiting_reason','state'); leadWaitingUI(true);
  ok('picking "the state" fills a check-back a week out', v('lead_waiting_check_back')===chi(7), v('lead_waiting_check_back'));
  set('lead_waiting_note','DCN went in today'); await saveLead(); await sleep(150);
  const s2=L.writes[L.writes.length-1];
  ok('saved waiting: reason, since today, check-back, note', s2.waiting&&s2.waiting.reason==='state'&&s2.waiting.since===chi(0)&&s2.waiting.check_back===chi(7)&&s2.waiting.note==='DCN went in today', s2.waiting);
  ok('...and the start and schedule survived the second save', s2.desired_start.date===chi(3)&&s2.schedule.days.length===5);
  /* a waiting reason with the date wiped: the default comes back, so no waiting family is ever saved without one (her rule) */
  openLeadModal(newId); await sleep(80); set('lead_waiting_check_back',''); await saveLead(); await sleep(100);
  const s2b=L.writes[L.writes.length-1];
  ok('a waiting family can never be saved without a check-back date (the default returns)', s2b.waiting&&s2b.waiting.check_back===chi(7)&&s2b.waiting.since===chi(0), s2b.waiting);
  closeModal('leadModalBackdrop');

  /* ── an older lead: the urgency radio still reads, the free-text schedule still reads ── */
  const old=DATA.leads.find(x=>x.id==='old1');
  ok('old radio 7days reads "Wants care this week"; old text schedule reads', LeadRules.desiredStartWords(old)==='Wants care this week'&&LeadRules.scheduleWords(old)==='Mon, Wed, Fri 9-1 · about 12 hrs/wk', [LeadRules.desiredStartWords(old), LeadRules.scheduleWords(old)]);
  openLeadModal('old1'); await sleep(80);
  ok('...its form shows This week, no days ticked, the typed days in the older box', v('lead_desired_start_kind')==='this_week'&&getCheckedValues('lead_schedule_days').length===0&&v('lead_days_needed')==='Mon, Wed, Fri');
  await saveLead(); await sleep(120); const s3=L.writes[L.writes.length-1];
  ok('...saving it untouched keeps the old radio AND writes the new shape (nothing lost)', s3.urgency==='7days'&&s3.desired_start.kind==='this_week'&&s3.schedule.times==='9-1'&&s3.schedule.hours_per_week===12&&s3.days_needed==='Mon, Wed, Fri', s3);
  closeModal('leadModalBackdrop');

  /* ── a running not-ready drip reads as Waiting · family not ready ── */
  const drip=DATA.leads.find(x=>x.id==='drip1');
  openLeadModal('drip1'); await sleep(80);
  ok('a lead on the not-ready drip opens with Waiting on = family not ready and a check-back offered', v('lead_waiting_reason')==='not_ready'&&!!v('lead_waiting_check_back'), [v('lead_waiting_reason'), v('lead_waiting_check_back')]);
  closeModal('leadModalBackdrop');

  /* ── the board chip and the profile line use the words ── */
  const sig=lsSignals(s1);
  ok('the Leads list chip says the start in words', /Wants care by/.test(sig), sig);
  ok('the lost-reason list is the fixed 14, "Other" last', LOST_REASONS.length===14&&LOST_REASONS[13].startsWith('Other'));
  window.prompt=q=>{ L.prompts.push(q); return /What happened/.test(q)?'moved to Texas':'14'; };
  const lr=askLostReason(s1);
  ok('"Other" asks what happened and keeps it with the reason', lr&&lr.lost_reason_key==='other'&&lr.lost_reason==='Other (say what): moved to Texas'&&lr.lost_detail==='moved to Texas', lr);
  window.prompt=q=>'1';
  const lr2=askLostReason(s1);
  ok('"Could not staff" keeps the schedule and town for the owners', lr2.lost_reason_key==='could_not_staff'&&lr2.lost_schedule.days.length===5&&lr2.lost_schedule.city==='Nixa', lr2);
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1360, 'height': 900})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=leads0'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

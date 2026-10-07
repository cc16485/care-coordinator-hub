"""Leads intake desk, Stage 1: the new-lead card's 5-minute clock (inside hours: due 5 minutes after the inquiry; after
hours: the family is acknowledged at once and the clock starts at opening; the true inquiry time stays on the card) and
the Lead response hours settings card. The real page, offline, made-up people only; saves are recorded, never sent.
(python3 tests/browser/leads_stage1_look.py, with the static server on 8765)"""
from playwright.sync_api import sync_playwright
STUB = r"""
(()=>{
  const W=window; W.__log={ merges:[] };
  (0,eval)(`sb={ from:()=>{ const p={ select(){return p;}, eq(){return p;}, in(){return p;}, not(){return p;}, order(){return p;}, limit(){return p;},
      maybeSingle:async()=>({data:{data:JSON.parse(JSON.stringify(DATA.ops_settings||{})),version:3},error:null}), then(a){ return Promise.resolve({data:[],error:null}).then(a); } }; return p; },
    rpc:async(n,a)=>{ if(n==='app_data_save'){ window.__log.merges.push(a); DATA.ops_settings=a.p_data; return {data:{ok:true},error:null}; } return {data:null,error:null}; },
    functions:{ invoke:async()=>({data:null,error:null}) }, auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };`);
  W.persist=async()=>{}; W.opEvent=()=>{}; W.ccToast=()=>{}; W.renderLeads=()=>{};
  /* a Tuesday 10:04 am Chicago inquiry and a Monday 9:02 pm one, with "now" = Tuesday 10:10 am Chicago */
  /* freeze the page clock: new Date() and Date.now() both read "now" (W.__setNow moves it) */
  (0,eval)(`window.__RealDate=Date; window.__NOW=new __RealDate('2026-10-06T15:10:00Z').getTime();
    Date=class extends __RealDate{ constructor(...a){ if(a.length) super(...a); else super(window.__NOW); } static now(){ return window.__NOW; } };`);
  W.__setNow=iso=>{ W.__NOW=new W.__RealDate(iso).getTime(); }; W.__restoreDate=()=>{ (0,eval)('Date=window.__RealDate;'); };
  DATA.ops_settings={};
  DATA.leads=[
    { id:'day', first_name:'Diane', last_name:'Teague', status:'New', created_at:'2026-10-06T15:04:00Z', ack_sent_at:'2026-10-06T15:04:20Z', interest_notes:'Mom fell' },
    { id:'night', first_name:'Patrice', last_name:'Keller', status:'New', created_at:'2026-10-06T02:02:00Z', ack_sent_at:'2026-10-06T02:02:30Z', interest_notes:'Aunt home Thursday' },
    { id:'tried', first_name:'Tom', last_name:'Marsh', status:'New', created_at:'2026-10-06T02:30:00Z', first_human_attempt_at:'2026-10-06T13:03:00Z', contact_events:[{at:'2026-10-06T13:03:00Z',channel:'call',direction:'out',outcome:'voicemail',actor:'human'}] } ];
  DATA.ops_items=[]; DATA.referral_orgs=[]; DATA.care_assessments=[]; DATA.post_call_followups=[];
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  const L=window.__log;
  opsReconcileLeads();
  const card=id=>DATA.ops_items.find(i=>i.id==='ops_lead_'+id);
  const day=card('day'), night=card('night'), tried=card('tried');
  ok('a 10:04 am inquiry at 10:10: due 10:09, OVERDUE 1 min, urgent, says it came in 6 min ago and was acknowledged at 10:04',
    day && day.due==='2026-10-06T15:09:00.000Z' && day.urgency==='high' && /OVERDUE, first call 1 min late/.test(day.title) && /Came in 6 min ago · auto-acknowledged at 10:04 am · no human attempt yet\./.test(day.detail) && /First call was due at 5 minutes/.test(day.detail), day);
  ok('a 9:02 pm Monday inquiry: due Tuesday 8:05 am, overdue 2 h 5 min at 10:10, card says "came in last night at 9:02 pm · auto-acknowledged immediately"',
    night && night.due==='2026-10-06T13:05:00.000Z' && night.urgency==='high' && /first call 125 min late/.test(night.title) && /Came in last night at 9:02 pm · auto-acknowledged immediately/.test(night.detail), night);
  ok('a lead somebody already tried is not urgent on the clock (it is the attempts card)', tried && tried.urgency!=='high' && /1 attempt/.test(tried.title), tried);
  /* a lead that arrives at 9 pm tonight, seen at 10 pm: not running, says when the clock starts */
  DATA.leads.push({ id:'tonight', first_name:'Ruth', last_name:'Ann', status:'New', created_at:'2026-10-07T02:00:00Z', ack_sent_at:'2026-10-07T02:00:10Z' });
  window.__setNow('2026-10-07T03:00:00Z'); opsReconcileLeads(); window.__setNow('2026-10-06T15:10:00Z');
  const tn=card('tonight');
  ok('a 9 pm inquiry seen at 10 pm: due tomorrow 8:05, NOT urgent, "the clock starts tomorrow at 8 am"', tn && tn.due==='2026-10-07T13:05:00.000Z' && tn.urgency!=='high' && /The clock starts tomorrow at 8 am\./.test(tn.detail) && !/OVERDUE/.test(tn.title), tn);

  /* the settings card */
  switchTab('settings'); await sleep(300); try{ fillSettingsPanel(); }catch(e){}
  const days=[...document.querySelectorAll('#lhDays input:checked')].map(c=>c.value).join();
  ok('the card shows the default every day 8:00 to 18:00 and says it is not set yet', days==='1,2,3,4,5,6,0' && document.getElementById('lhStart').value==='08:00' && document.getElementById('lhEnd').value==='18:00' && /Not set yet, so the Hub uses Every day 8 am to 6 pm/.test(document.getElementById('lhSetNow').textContent), [days, document.getElementById('lhSetNow').textContent]);
  /* Sunday off, 7:30 to 5 */
  document.querySelector('#lhDays input[value="0"]').checked=false; document.getElementById('lhStart').value='07:30'; document.getElementById('lhEnd').value='17:00';
  await lhSave(document.getElementById('lhSaveBtn')); await sleep(100);
  const m=L.merges[L.merges.length-1];
  ok('Save writes ops_settings.lead_response_hours one field at a time (app_data_save with the version)', m && m.p_key==='ops_settings' && m.p_expected_version===3 && JSON.stringify(m.p_data.lead_response_hours)==='{"days":[1,2,3,4,5,6],"start":"07:30","end":"17:00"}', m);
  ok('...the card now says Now: Mon–Sat 7:30 am to 5 pm', /Now: Mon–Sat 7:30 am to 5 pm/.test(document.getElementById('lhSetNow').textContent), document.getElementById('lhSetNow').textContent);
  ok('...and the Saturday rule reaches the cards: the 9 pm Monday lead is unchanged, a Saturday 10 am lead would be due 10:05', LeadRules.firstAttemptDue({created_at:'2026-10-10T15:00:00Z'}, LeadRules.responseHours(DATA.ops_settings))==='2026-10-10T15:05:00.000Z');
  /* a bad save is refused */
  document.querySelectorAll('#lhDays input').forEach(c=>{ c.checked=false; }); const before=L.merges.length; await lhSave(); await sleep(50);
  ok('no days ticked: refused with a plain message, nothing saved', L.merges.length===before && /Pick at least one day/.test(document.getElementById('lhSaved').textContent), document.getElementById('lhSaved').textContent);
  window.__restoreDate();
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1360, 'height': 900})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=leads1'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

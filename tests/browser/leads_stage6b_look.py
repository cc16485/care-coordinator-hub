"""Clean-ups 6.3 / 6.5 / 6.6: no drip card on the profile, the Follow-ups sub-tab folded into the board (a draft waiting for approval
is a Need-you-now row; the drafts archive opens from Look up with a way back), and one Leads card on Settings (hours, the
acknowledgment switch, where website forms land). The real page, offline, made-up data. (python3 tests/browser/leads_stage6b_look.py, static server on 8765)"""
from playwright.sync_api import sync_playwright
STUB = r"""
(()=>{
  const W=window; W.__log={ modals:[] };
  (0,eval)(`window.__RealDate=Date; window.__NOW=new __RealDate('2026-10-06T15:10:00Z').getTime();
    Date=class extends __RealDate{ constructor(...a){ if(a.length) super(...a); else super(window.__NOW); } static now(){ return window.__NOW; } };`);
  (0,eval)(`sb={ from:()=>{ const p={ select(){return p;}, eq(){return p;}, in(){return p;}, not(){return p;}, order(){return p;}, limit(){return p;},
      maybeSingle:async()=>({data:null,error:null}), then(a){ return Promise.resolve({data:[],error:null}).then(a); } }; return p; },
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async()=>({data:null,error:null}) }, auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };`);
  W.persist=async()=>{}; W.lsLoadFacts=async()=>{ LS.facts={ epOf:{}, scOf:{}, planOf:{} }; }; W.ccToast=()=>{}; W.opEvent=()=>{};
  W.openFollowUpModal=(id,leadId)=>{ W.__log.modals.push(id+':'+leadId); };
  DATA.ops_settings={ lead_response_hours:{ days:[0,1,2,3,4,5,6], start:'08:00', end:'18:00' }, inquiry_ack_live:true };
  DATA.referral_orgs=[]; DATA.care_assessments=[]; DATA.ops_items=[];
  DATA.post_call_followups=[{ id:'d1', lead_id:'tom', status:'pending_approval', created_at:'2026-10-05T15:00:00Z' }, { id:'d0', lead_id:'tom', status:'sent', created_at:'2026-09-01T15:00:00Z' }];
  DATA.leads=[
    { id:'tom', first_name:'Tom', last_name:'Marsh', client_first_name:'Evelyn', client_last_name:'Marsh', why_called:'Son gathering her LTC policy', funding_source:'ltc', desired_start:{ kind:'this_month' }, client_city:'Springfield', status:'Contacted', phone:'4175550109', assigned_coordinator:'Krystal', follow_up_due:'2026-10-09', first_human_contact_at:'2026-09-30T14:00:00Z', created_at:'2026-09-30T13:00:00Z',
      nurture_sequence:'not_ready', nurture_started_at:'2026-09-02T15:00:00Z', nurture_stopped_at:'2026-10-07T04:00:00Z', nurture_stop_reason:'retired 2026-10-07' } ];
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,800)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  switchTab('leadsstarts'); await sleep(500); renderLeadsStarts(); await sleep(200);
  const rows=()=>[...document.querySelectorAll('#lbBoard .lb-row')], T=()=>document.getElementById('lbBoard').innerText;
  ok('no Board / Follow-ups sub-tab bar any more', !document.getElementById('lsViewBar') && !document.getElementById('lsViewBtn-followups'));
  ok('a draft waiting for approval is a Need-you-now row: "Draft ready", Review draft is the filled button', /NEED YOU NOW[\s\S]*Draft ready\nan AI follow-up is waiting for your approval\nEvelyn Marsh/.test(T()) && rows()[0].querySelector('.lb-btn-primary').textContent==='Review draft', T().slice(0,400));
  rows()[0].querySelector('.lb-btn-primary').click(); await sleep(50);
  ok('Review draft opens that draft for that lead', window.__log.modals.slice(-1)[0]==='d1:tom', window.__log.modals);
  ok('a stopped (retired) drip shows nothing on the row: no "nurture running" anywhere', !/nurture/i.test(T()));
  /* the archive of drafts, from Look up, with a way back */
  const link=[...document.querySelectorAll('#lbLookup button')].find(b=>/All follow-up drafts/.test(b.textContent)); ok('Look up has "All follow-up drafts (pending, approved, sent)"', !!link);
  link.click(); await sleep(200);
  ok('...it opens the drafts view (board hidden) with a Back to the board link', document.getElementById('lsFollowView').style.display!=='none' && document.getElementById('lsBoardView').style.display==='none' && /Back to the board/.test(document.getElementById('lsFollowView').innerText));
  switchLeadsSubtab('pipeline'); await sleep(100);
  ok('...Back returns to the board', document.getElementById('lsBoardView').style.display!=='none' && document.getElementById('lsFollowView').style.display==='none');
  /* the profile: no Nurture card */
  ok('the lead profile has no Nurture drip card (clean-up 6.3)', !document.getElementById('lp_nurture') && typeof renderLpNurture==='undefined' && typeof lpStartNurture==='undefined');
  /* Settings: one Leads card */
  switchTab('settings'); await sleep(300); try{ fillSettingsPanel(); }catch(e){}
  const card=document.querySelector('.settings-section[data-set="leads"]');
  ok('one Leads settings card holds the hours, the acknowledgment switch and where website forms land', !!card && card.querySelector('#lhDays') && card.querySelector('#inqSet') && card.querySelector('#leadWebhookUrl') && /Response hours[\s\S]*Inquiry acknowledgment[\s\S]*Where website forms land/.test(card.innerText), card&&card.innerText.slice(0,300));
  ok('...the old three cards are gone', !document.querySelector('[data-set="lead-hours"]') && !document.querySelector('[data-set="inquiry-messages"]') && !document.querySelector('[data-set="lead-intake"]'));
  ok('...the acknowledgment shows On with a Turn off button; no nudges switch', /Inquiry acknowledgment[\s\S]*On/.test(card.innerText) && /Turn off/.test(card.innerText) && !/Day 1/.test(card.innerText), card.innerText.slice(0,400));
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1360, 'height': 900})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=leads6b'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

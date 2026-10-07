"""Clean-up 6.7: one status writer. The real page, offline, made-up families. Proves: the intake form has no Status dropdown (a read-only
stage line instead) and saving does not touch status; the profile shows the stage words with Mark lost / Not lost after all instead of
a dropdown; Mark lost asks the reason and writes status_history with who and why; Not lost after all puts them back where they were;
a logged real conversation moves New to Contacted through the same writer; the board's Mark lost does too.
(python3 tests/browser/leads_stage6c_look.py, static server on 8765)"""
from playwright.sync_api import sync_playwright
STUB = r"""
(()=>{
  const W=window; W.__log={ writes:[] };
  (0,eval)(`window.__RealDate=Date; window.__NOW=new __RealDate('2026-10-06T15:10:00Z').getTime();
    Date=class extends __RealDate{ constructor(...a){ if(a.length) super(...a); else super(window.__NOW); } static now(){ return window.__NOW; } };`);
  (0,eval)(`sb={ from:()=>{ const p={ select(){return p;}, eq(){return p;}, in(){return p;}, not(){return p;}, order(){return p;}, limit(){return p;},
      maybeSingle:async()=>({data:null,error:null}), then(a){ return Promise.resolve({data:[],error:null}).then(a); } }; return p; },
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async()=>({data:null,error:null}) }, auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };`);
  W.persist=async(k,v)=>{ W.__log.writes.push(JSON.parse(JSON.stringify(v))); };
  W.ckCheckNewInquiry=async()=>({proceed:true, note:''}); W.jcLoadConn=async()=>null; W.renderLeads=()=>{}; W.renderLeadsStarts=()=>{}; W.renderFollowUpQueue=()=>{}; W.renderLeadProfile=()=>{};
  W.lsLoadFacts=async()=>{ LS.facts={ epOf:{}, scOf:{}, planOf:{} }; }; W.ccToast=()=>{}; W.opEvent=()=>{}; W.renderCommsTimeline=()=>{}; W.myWorkRefresh=()=>{};
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Land' };");
  DATA.ops_settings={ lead_response_hours:{ days:[0,1,2,3,4,5,6], start:'08:00', end:'18:00' } };
  DATA.referral_orgs=[]; DATA.care_assessments=[]; DATA.post_call_followups=[]; DATA.ops_items=[];
  DATA.leads=[
    { id:'har', first_name:'Harold', last_name:'Pruitt', client_first_name:'Harold', client_last_name:'Pruitt', why_called:'Calling for himself', funding_source:'va', desired_start:{ kind:'asap' }, client_city:'Ozark', status:'Contacted', phone:'4175550177', assigned_coordinator:'Krystal', follow_up_due:'2026-10-08', first_human_contact_at:'2026-10-01T20:00:00Z', created_at:'2026-10-01T13:00:00Z',
      contact_events:[{ at:'2026-10-01T20:00:00Z', channel:'call', direction:'out', outcome:'connected', actor:'human' }] },
    { id:'new1', first_name:'Patrice', last_name:'Keller', client_first_name:'Ruth Ann', client_last_name:'Keller', status:'New', phone:'4175550164', created_at:'2026-10-06T14:58:00Z', assigned_coordinator:'Krystal' } ];
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,800)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  /* the intake form */
  openLeadModal('har'); await sleep(100);
  ok('the intake form has no Status dropdown; a read-only stage line says Talking', !document.getElementById('lead_status') && /Talking/.test(document.getElementById('lead_stage_ro').innerText), document.getElementById('lead_stage_ro').innerText);
  document.getElementById('lead_why_called').value='Calling for himself, wife passed'; await saveLead(); await sleep(150);
  let w=window.__log.writes.filter(x=>x.id==='har').slice(-1)[0];
  ok('saving the form leaves status alone (Contacted) and writes no history', w.status==='Contacted' && !w.status_history, [w.status, w.status_history]);
  /* a brand-new lead starts New */
  openLeadModal(); await sleep(80); document.getElementById('lead_first_name').value='Diane'; document.getElementById('lead_last_name').value='Teague'; document.getElementById('lead_phone').value='4175550131';
  await saveLead(); await sleep(150); w=window.__log.writes.slice(-1)[0];
  ok('a brand-new lead starts New', w.status==='New' && w.first_name==='Diane', w.status);
  /* the profile head: stage words + Mark lost */
  const h=DATA.leads.find(x=>x.id==='har'); lpLead=h; const head=document.getElementById('lp_stage'); head.innerHTML=lpStageControlHtml(h);
  ok('the profile shows the stage words and a Mark lost… link, no dropdown', !document.getElementById('lp_status') && /Talking/.test(head.innerText) && /Mark lost/.test(head.innerText), head.innerText);
  window.prompt=q=>'3'; /* Price */ window.confirm=()=>true;
  await lpSetStatus('Lost'); await sleep(150);
  ok('Mark lost: asks the reason, writes Lost with the reason key, lost_at, and status_history (who, why)', h.status==='Lost' && h.lost_reason_key==='price' && h.lost_at && h.status_history.length===1 && h.status_history[0].from==='Contacted' && h.status_history[0].to==='Lost' && h.status_history[0].by==='krystal@mo-care.com' && /Price/.test(h.status_history[0].why), h.status_history);
  head.innerHTML=lpStageControlHtml(h);
  ok('...now the head offers Not lost after all', /Not lost after all/.test(head.innerText) && !/Mark lost/.test(head.innerText), head.innerText);
  await lpSetStatus('unlost'); await sleep(150);
  ok('Not lost after all: back to Contacted, reason cleared, lost_undone_at stamped, history keeps both moves', h.status==='Contacted' && !h.lost_reason_key && h.lost_undone_at && h.status_history.length===2 && h.status_history[1].why==='not lost after all', h.status_history);
  /* a logged real conversation moves New → Contacted through the same writer */
  const n=DATA.leads.find(x=>x.id==='new1'); commsLead=n;
  await ldLogCall('connected', 'spoke with Patrice', '', ''); await sleep(150);
  ok('a logged connected call: New → Contacted with history "first real conversation (logged call)"', n.status==='Contacted' && n.status_history && /first real conversation/.test(n.status_history[0].why) && n.status_history[0].by==='krystal@mo-care.com', n.status_history);
  /* the board's Mark lost */
  switchTab('leadsstarts'); await sleep(400); renderLeadsStarts(); await sleep(150);
  window.prompt=q=>'5'; /* chose another agency */
  await lbLost('new1'); await sleep(150);
  ok("the board's Mark lost goes through the same writer", n.status==='Lost' && n.lost_reason_key==='chose_agency' && n.status_history.slice(-1)[0].to==='Lost' && /Chose another agency/.test(n.status_history.slice(-1)[0].why), n.status_history);
  ok('a Converted lead offers no Mark lost on the head', !/Mark lost/.test(lpStageControlHtml({ status:'Converted' })));
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1360, 'height': 900})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=leads6c'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

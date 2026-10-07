"""Leads intake desk, Stage 3: They said yes. The real page, offline, made-up families, the journey service faked. Proves the
green button appears only once a real conversation has happened, the ··· menu offers it, pressing it calls said_yes, the
family leaves the Leads board at once with a 60-second Undo toast, the page lands on the next step, Undo puts them back,
a refusal for missing facts opens the inquiry form, and the profile's More menu offers Undo after a yes.
(python3 tests/browser/leads_stage3_look.py, static server on 8765)"""
from playwright.sync_api import sync_playwright
STUB = r"""
(()=>{
  const W=window; W.__log={ calls:[], opened:[], hashes:[], modals:[] };
  (0,eval)(`window.__RealDate=Date; window.__NOW=new __RealDate('2026-10-06T15:10:00Z').getTime();
    Date=class extends __RealDate{ constructor(...a){ if(a.length) super(...a); else super(window.__NOW); } static now(){ return window.__NOW; } };`);
  (0,eval)(`sb={ from:()=>{ const p={ select(){return p;}, eq(){return p;}, in(){return p;}, not(){return p;}, order(){return p;}, limit(){return p;},
      maybeSingle:async()=>({data:null,error:null}), then(a){ return Promise.resolve({data:[],error:null}).then(a); } }; return p; },
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async()=>({data:null,error:null}) }, auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };`);
  /* the journey service, faked: said_yes answers yes (or missing when the test says so), undo answers undone */
  W.__refuse=null;
  W.fetch=async(u,o)=>{ const b=JSON.parse((o&&o.body)||'{}'); W.__log.calls.push(b);
    if(b.action==='said_yes'){ if(W.__refuse) return new Response(JSON.stringify(W.__refuse),{status:422}); return new Response(JSON.stringify({ outcome:'yes', ref:'L'+b.lead_id, journey_id:'j1', live:true, next:{ key:'intake.basics', title:'Client basics', status:'ready' } }),{status:200}); }
    if(b.action==='undo_yes') return new Response(JSON.stringify({ outcome:'undone', status:'Contacted' }),{status:200});
    return new Response(JSON.stringify({ ok:true, journeys:[] }),{status:200}); };
  CONFIG.supabase_url='https://x'; CONFIG.supabase_anon_key='k';
  W.persist=async()=>{}; W.ccToast=m=>W.__log.toasts=(W.__log.toasts||[]).concat([m]); W.opEvent=()=>{};
  W.openLeadProfile=async(id,tab)=>{ W.__log.opened.push(id+':'+(tab||'')); }; W.openLeadModal=id=>{ W.__log.modals.push(id); };
  W.lsLoadFacts=async()=>{ LS.facts={ epOf:{}, scOf:{}, planOf:{} }; };
  W.alert=m=>W.__log.alerts=(W.__log.alerts||[]).concat([m]);
  window.addEventListener('hashchange',()=>W.__log.hashes.push(location.hash));
  DATA.ops_settings={ lead_response_hours:{ days:[0,1,2,3,4,5,6], start:'08:00', end:'18:00' }, client_journey_live:true };
  DATA.referral_orgs=[]; DATA.care_assessments=[]; DATA.post_call_followups=[];
  DATA.leads=[
    { id:'ruth', first_name:'Patrice', client_first_name:'Ruth Ann', client_last_name:'Keller', status:'New', created_at:'2026-10-06T14:58:00Z', phone:'4175550164', assigned_coordinator:'Krystal' },
    { id:'har', first_name:'Harold', last_name:'Pruitt', client_first_name:'Harold', client_last_name:'Pruitt', why_called:'Calling for himself', funding_source:'va', desired_start:{ kind:'asap' }, schedule:{ days:['Mon','Wed'], times:'afternoons', hours_per_week:15 }, client_city:'Ozark', status:'Contacted', phone:'4175550177', assigned_coordinator:'Krystal', follow_up_due:'2026-10-07', first_human_contact_at:'2026-10-01T20:00:00Z',
      contact_events:[{ at:'2026-10-01T20:00:00Z', channel:'call', direction:'out', outcome:'connected', actor:'human' }] } ];
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,800)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  switchTab('leadsstarts'); await sleep(500); renderLeadsStarts(); await sleep(200);
  const rows=()=>[...document.querySelectorAll('#lbBoard .lb-row')], row=n=>rows().find(r=>new RegExp(n).test(r.innerText)), T=()=>document.getElementById('lbBoard').innerText;
  ok('a brand-new, never-reached inquiry has no They said yes button', !row('Ruth Ann').querySelector('.lb-btn-yes'));
  ok('a reached family (Harold) has the green They said yes beside the primary button', !!row('Harold').querySelector('.lb-btn-yes'));
  row('Harold').querySelector('.lb-more').click(); await sleep(80);
  ok('··· offers They said yes too', [...document.querySelectorAll('.ccpop .ccpick-row')].some(x=>x.textContent==='They said yes')); ccPopCloseAll();
  /* press it */
  row('Harold').querySelector('.lb-btn-yes').click(); await sleep(400);
  const call=window.__log.calls.find(c=>c.action==='said_yes');
  ok('pressing it calls the journey service once with the lead id', call && call.lead_id==='har' && window.__log.calls.filter(c=>c.action==='said_yes').length===1, window.__log.calls);
  const l=DATA.leads.find(x=>x.id==='har');
  ok('the lead is marked at once: said_yes_at, by, status Converted (was Contacted), converted_at', l.said_yes_at && l.status==='Converted' && l.said_yes_prev_status==='Contacted' && l.converted_at, l);
  ok('Harold has left the Leads board', !row('Harold') && /Ruth Ann/.test(T()), T().slice(0,200));
  ok('the page lands on the next required step: #p/Lhar/start/intake.basics', window.__log.hashes.slice(-1)[0]==='#p/Lhar/start/intake.basics', window.__log.hashes);
  const toast=document.getElementById('cjYesToast');
  ok('a green toast says he said yes and offers Undo', toast && /Harold Pruitt said yes/.test(toast.innerText) && toast.querySelector('button').textContent==='Undo', toast&&toast.innerText);
  /* undo from the toast */
  toast.querySelector('button').click(); await sleep(400);
  const undo=window.__log.calls.find(c=>c.action==='undo_yes');
  ok('Undo calls undo_yes with the reason "pressed by mistake"', undo && undo.lead_id==='har' && undo.reason==='pressed by mistake', undo);
  ok('...the lead is back: Contacted, no said_yes_at, converted_at cleared, and Harold is on the board again', l.status==='Contacted' && !l.said_yes_at && !l.converted_at && !!row('Harold'), [l.status, l.said_yes_at, !!row('Harold')]);
  ok('...a toast says so', (window.__log.toasts||[]).some(t=>/back on the Leads board/.test(t)), window.__log.toasts);
  /* a refusal for missing facts opens the inquiry form */
  window.__refuse={ outcome:'missing', error:'Before the yes counts, the inquiry needs: the schedule they need.', missing:[{key:'schedule'}] };
  row('Harold').querySelector('.lb-btn-yes').click(); await sleep(300);
  ok('a refusal for missing facts explains and opens the inquiry form; nothing marked', (window.__log.alerts||[]).some(a=>/the inquiry needs/.test(a)) && window.__log.modals.slice(-1)[0]==='har' && !l.said_yes_at, [window.__log.alerts, window.__log.modals]);
  window.__refuse=null;
  /* the profile More menu offers Undo after a yes */
  l.said_yes_at='2026-10-06T15:00:00Z'; l.status='Converted'; lpLead=l; lpMoreOpen(); await sleep(80);
  const items=[...document.querySelectorAll('.ccpop button')].map(b=>b.textContent);
  ok('the profile More menu offers Undo "They said yes"', items.some(t=>/Undo "They said yes"/.test(t)), items); ccPopCloseAll();
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1360, 'height': 900})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=leads3'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

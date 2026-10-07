"""Speed to lead, the Hub side (item 2, 2026-10-07). The real page, offline. Proves: Settings → Leads carries the switch with the
Admin page's exact words and the 15/30 minutes; saving the minutes writes ops_settings.lead_rungs through the merge-save; Take it on an
inquiry card makes the inquiry theirs too; the workspace timeline shows a rung. (python3 tests/browser/leads_rungs_look.py, server on 8765)"""
from playwright.sync_api import sync_playwright
STUB = r"""
(()=>{
  const W=window; W.__log={ writes:[], merges:[] };
  (0,eval)(`sb={ from:()=>{ const p={ select(){return p;}, eq(){return p;}, in(){return p;}, not(){return p;}, order(){return p;}, limit(){return p;},
      maybeSingle:async()=>({data:null,error:null}), then(a){ return Promise.resolve({data:[],error:null}).then(a); } }; return p; },
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async()=>({data:null,error:null}) }, auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };`);
  W.persist=async(k,v)=>{ W.__log.writes.push({ k, v:JSON.parse(JSON.stringify(v)) }); };
  W.ccMergeSave=async(key, apply)=>{ const m=JSON.parse(JSON.stringify(DATA.ops_settings||{})); const changed=apply(m)||[]; DATA.ops_settings=m; W.__log.merges.push({ key, changed }); return { changed, error:null }; };
  W.ccToast=()=>{}; W.opEvent=()=>{}; W.myWorkRefresh=()=>{}; W.renderLeadsStarts=()=>{};
  (0,eval)("ME={ email:'angiel@mo-care.com', name:'Angiel Rose' }; OPS_PEOPLE=[{ primary_email:'krystal@mo-care.com', full_name:'Krystal Land' },{ primary_email:'angiel@mo-care.com', full_name:'Angiel Rose' }];");
  DATA.ops_settings={ lead_response_hours:{ days:[0,1,2,3,4,5,6], start:'08:00', end:'18:00' } };
  DATA.leads=[{ id:'dia', first_name:'Diane', last_name:'Teague', status:'New', phone:'4175550131', assigned_coordinator:'Krystal', created_at:'2026-10-06T14:40:00Z', rungs:{ owner_at:'2026-10-06T14:46:00Z', owner_to:'krystal@mo-care.com', owner_sent:true } }];
  DATA.ops_items=[{ id:'ops_lead_dia', kind:'new_lead', source_id:'dia', status:'open', owner:'krystal@mo-care.com', owner_name:'Krystal Land', created_at:'2026-10-06T14:40:00Z', title:'New care inquiry: Diane Teague', also_for:['angiel@mo-care.com'] }];
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,900)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  switchTab('settings'); await sleep(300); lhSetFill(); inqSetFill();
  const sw=INQ_SWITCHES.find(x=>x.k==='lead_rungs_live');
  ok('the Leads settings card carries the speed-to-lead switch, Off', sw && /Speed to lead: 5, 15 and 30 minutes/.test(document.getElementById('inqSet').innerText) && /Off/.test(document.getElementById('inqSet').innerText), document.getElementById('inqSet').innerText.slice(0,200));
  ok('the minutes fields show the defaults 15 and 30', document.getElementById('lrBackup').value==='15' && document.getElementById('lrManager').value==='30');
  document.getElementById('lrBackup').value='10'; document.getElementById('lrManager').value='8'; await lrSave(); await sleep(50);
  ok('a manager time before the backup is refused', /after the backup/.test(document.getElementById('lrSaved').textContent) && !window.__log.merges.length, document.getElementById('lrSaved').textContent);
  document.getElementById('lrManager').value='20'; await lrSave(); await sleep(50);
  ok('10 and 20 save through the merge-save as ops_settings.lead_rungs, with an audit line', window.__log.merges.length===1 && DATA.ops_settings.lead_rungs.backup_min===10 && DATA.ops_settings.lead_rungs.manager_min===20 && /speed to lead minutes 10\/20/.test(window.__log.merges[0].changed[0]), [window.__log.merges, DATA.ops_settings.lead_rungs]);
  /* Take it on the backup's My Work card: the inquiry follows */
  await opsTakeIt('ops_lead_dia'); await sleep(100);
  const l=DATA.leads[0], it=DATA.ops_items[0];
  ok('Angiel takes the inquiry card from her My Work (it was on her desk as backup): the card is hers AND the inquiry\'s owner is Angiel, with a history line', it.owner==='angiel@mo-care.com' && l.assigned_coordinator==='Angiel' && /Angiel took this inquiry from Krystal/.test(l.comm_log.slice(-1)[0].body) && window.__log.writes.some(w=>w.k==='leads'&&w.v.assigned_coordinator==='Angiel'), [it.owner, l.assigned_coordinator, l.comm_log]);
  /* the workspace timeline shows the rung */
  const tl=LeadRules.timeline(l, { now:'2026-10-06T15:00:00Z', names:{ 'krystal@mo-care.com':'Krystal Land' } });
  ok('the workspace timeline shows "Texted Krystal at 5 minutes, nobody had called"', tl.some(x=>x.text==='Texted Krystal at 5 minutes, nobody had called'), tl.map(x=>x.text));
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1360, 'height': 900})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=rungs'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

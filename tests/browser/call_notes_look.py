"""Call notes from recorded calls (2026-10-29, her "do the same for our leads" after the CDS hub's call notes). Off by default;
an owner's preview shows each waiting note on the family's Leads row and profile: the note, the call back date, people heard;
Read the whole call, Listen, Add as a contact; OK saves the note on the lead's call log and sets the call back; Not about them
changes nothing on the lead; a refused save says so; the Settings switch is owners only. Made-up people, offline.
(python3 tests/browser/call_notes_look.py)"""
import os, mimetypes
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SHOTS = os.environ.get('CN_SHOTS', '')
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
  W.ccConfirm=async()=>true; W.clientRatesRec=()=>({ levels:{ l1:{ rate:32 }, l2:{ rate:34 }, l3:{ rate:36 } } });
  W.tkMerge=async(apply,what)=>{ const m=DATA.ops_settings||(DATA.ops_settings={}); apply(m); W.__log.writes.push({ k:'ops_settings', v:clone(m), what }); return { error:null }; };
  (0,eval)(`ME={ email:'sam@mo-care.com', name:'Samantha T', shift:'day' }; CC_ROLE_BY_EMAIL={ 'sam@mo-care.com':['owner_admin'], 'kry@mo-care.com':['care_coordinator'] }; CC_ROLES_CHECKED=true;`);
  try{ ['lcPreview','lcStep','ltTab','ltSort','ltPer'].forEach(k=>localStorage.removeItem(k)); }catch(e){} LeadTable.state.tab='all'; LeadTable.state.sort='imp'; LeadTable.state.per=50; LeadTable.state.page=0;
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
  DATA.leads[2].comm_log=[{ body:'Ruth asked about weekends', at:ago(3*H), by:'kry@mo-care.com' }];
  DATA.leads[3].contact_events.push({ at:ago(8*H), channel:'call', direction:'in', actor:'family', outcome:'connected' });
  for(let i=0;i<22;i++) DATA.leads.push({ id:'X'+i, first_name:'Test'+i, last_name:'Family', client_first_name:'Pat'+String.fromCharCode(65+i), client_last_name:'Zed', phone:'41755501'+String(i).padStart(2,'0'), funding_source:'private', status:'Contacted', assigned_coordinator:'Krystal', created_at:ago((20+i)*D), first_human_contact_at:ago((19+i)*D), follow_up_due:ymd(3+i), contact_events:[call((19+i)*D)] });
  const fut=ymd(3);
  W.__rows=[{ message_id:'m1', lead_id:'L3', msg_at:ago(2*H), direction:'inbound', seconds:250, staff:'kry@mo-care.com', status:'read', decided:null,
      reading:{ call_note:{ note:'Ruth says weekends are hard. She will talk to her brother.', call_back:{ day:fut, why:'after she talks to her brother' } }, profile:{ people:[{ name:'Tom Adams', relationship:'Brother', phone:'4175550123' }, { name:'Ruth Adams', relationship:'self' }] } } },
    { message_id:'m2', lead_id:'L2', msg_at:ago(5*H), direction:'outbound', seconds:90, staff:'', status:'read', decided:null, reading:{ call_note:{ note:'Wrong number, a sales call.', call_back:null }, profile:{ people:[] } } },
    { message_id:'m3', lead_id:'L2', msg_at:ago(9*H), direction:'outbound', seconds:90, staff:'', status:'read', decided:null, reading:{ call_note:null } }];
  W.__rpc=[]; W.__rpcFail=false; W.__people={}; W.__calls=[];
  (0,eval)(`sb={ from:(t)=>{ const p={ select(){return p;}, eq(){return p;}, is(){return p;}, gte(){return p;}, in(){return p;}, not(){return p;}, order(){return p;}, limit(){return p;}, upsert(){return p;}, update(){return p;},
      maybeSingle:async()=>({data:null,error:null}), single:async()=>({data:null,error:null}), then(a){ return Promise.resolve({ data:t==='call_learned'?JSON.parse(JSON.stringify(window.__rows)):[], error:null }).then(a); } }; return p; },
    rpc:async(fn,a)=>{ window.__rpc.push([fn,a]); if(fn==='call_learned_decide') return window.__rpcFail?{ data:null, error:{ message:'not allowed' } }:{ data:true, error:null }; return { data:null, error:null }; },
    functions:{ invoke:async()=>({data:null,error:null}) }, auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };`);
  W.callAction=async(fn,b)=>{ W.__calls.push([fn,b]); return b.action==='transcript'?{ status:200, data:{ ok:true, transcript:'Speaker 1: Caring Companions.\nSpeaker 2: This is Ruth.' } }:{ status:400, data:{ error:'no' } }; };
  const realFetch=W.fetch; W.fetch=async(u,o)=>{ if(String(u).includes('/functions/v1/call-to-lead')) return new Response(new Uint8Array([82,73,70,70]),{ status:200, headers:{ 'content-type':'audio/x-wav' } }); return realFetch(u,o); };
  W.lpiLoadBegan=async l=>({ ep:'ep-'+l.id, people:(W.__people[l.id]||[]).slice() });
  W.lpfCall=async b=>{ W.__calls.push(['client-fact',b]); (W.__people[b.episode_id.slice(3)]=W.__people[b.episode_id.slice(3)]||[]).push({ name:b.name }); return { outcome:'recorded', person_key:'pk', row_id:'r' }; };
  try{ localStorage.removeItem('cnPreview'); }catch(e){}
  DATA.care_assessments=[{ id:'A4', lead_id:'L4', status:'Scheduled', visit_date:ymd(1) }, { id:'A5', lead_id:'L5', status:'Completed — Awaiting Plan', visit_date:ymd(-2) }, { id:'A6', lead_id:'L6', status:'Plan Drafted', visit_date:ymd(-6) }];
  DATA.referral_orgs=[]; DATA.post_call_followups=[];
  W.openLeadProfile=(id,tab)=>W.__log.opened.push([id,tab]);
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const $=id=>document.getElementById(id), lead=id=>DATA.leads.find(x=>x.id===id), L=window.__log;
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  switchTab('leadsstarts'); await sleep(200); lcPreview(true); await sleep(300);
  ok('switch off · no call notes on Leads', !document.querySelector('.cn-panel')&&!document.querySelector('.cn-sum'));
  cnPreview(true); CallNotes.load(true); await sleep(400);
  ok('owner preview · the line says 2 families wait, and that it is a preview', /2 families have call notes waiting for your OK/.test(($('lbBoard').querySelector('.cn-sum')||{}).textContent||'')&&/Preview/.test($('lbBoard').querySelector('.cn-sum').textContent));
  const ruth=()=>[...document.querySelectorAll('.lt-row')].find(r=>/Ruth Adams/.test(r.textContent));
  const p=ruth().querySelector('.cn-panel');
  ok('row · Ruth\'s note, call back date and why, with who took the call', !!p&&$('cnt_m1').value.startsWith('Ruth says weekends')&&$('cnd_m1').value===LeadRules.addDays(LeadRules.ymd(new Date()),3)&&/after she talks to her brother/.test(p.textContent)&&/4 min/.test(p.textContent), p&&p.textContent);
  ok('row · heard on the call: Tom (brother) with his phone; Ruth herself is not offered', /Tom Adams, Brother, \(417\) 555-0123/.test(p.textContent)&&!/Ruth Adams, self/.test(p.textContent));
  const george=[...document.querySelectorAll('.lt-row')].find(r=>/George Ellis/.test(r.textContent));
  ok('row · a reading with no note never shows (George has 1, not 2)', george.querySelectorAll('.cn-panel').length===1&&!/more on their profile/.test(george.textContent));
  /* Read the whole call and Listen */
  await cnWhole('m1'); await sleep(50);
  ok('Read the whole call · the transcript, read through call-to-lead', /This is Ruth/.test($('cnm_m1').textContent)&&__calls.some(c=>c[0]==='call-to-lead'&&c[1].action==='transcript'&&c[1].message_id==='m1'));
  await cnListen('m1'); await sleep(50);
  ok('Listen · an audio player from our server (a blob, not a GoHighLevel link)', /^blob:/.test(($('cnm_m1').querySelector('audio')||{}).src||''));
  /* Add as a contact */
  await cnAddPerson('m1',0,ruth().querySelector('.cn-heard button')); await sleep(50);
  ok('Add as a contact · Tom goes on Ruth\'s People involved with his phone', __calls.some(c=>c[0]==='client-fact'&&c[1].action==='record_person'&&c[1].name==='Tom Adams'&&c[1].phone==='4175550123'&&c[1].episode_id==='ep-L3'), __calls.slice(-1));
  /* OK, save it (edited note, changed date) */
  const before=(lead('L3').comm_log||[]).length;
  $('cnt_m1').value='Ruth: weekends are hard; calling her brother first.'; $('cnd_m1').value=LeadRules.addDays(LeadRules.ymd(new Date()),4);
  await cnDecide('m1','ok'); await sleep(200);
  const l3=lead('L3'), last=l3.comm_log[l3.comm_log.length-1];
  ok('OK · marked added with the edited note', __rpc.some(([f,a])=>f==='call_learned_decide'&&a.p_message_id==='m1'&&a.p_decided==='added'&&/calling her brother first/.test(a.p_note)), __rpc);
  ok('OK · the note goes on Ruth\'s call log, marked with the call', l3.comm_log.length===before+1&&last.kind==='call_note'&&last.from_call==='m1'&&/calling her brother first/.test(last.body), last);
  ok('OK · the call back date is the one in the box', String(l3.follow_up_due).slice(0,10)===LeadRules.addDays(LeadRules.ymd(new Date()),4), l3.follow_up_due);
  ok('OK · saved, and the panel is gone', L.writes.some(w=>w.k==='leads'&&w.v.id==='L3')&&!document.getElementById('cn_m1'));
  /* Not about them */
  const l2before=JSON.stringify(lead('L2'));
  await cnDecide('m2','not_about'); await sleep(150);
  ok('Not about them · marked wrong, George\'s lead unchanged', __rpc.some(([f,a])=>a.p_message_id==='m2'&&a.p_decided==='wrong')&&JSON.stringify(lead('L2'))===l2before&&!document.getElementById('cn_m2'));
  ok('nothing left · the line goes quiet', !/waiting for your OK/.test(($('lbBoard').querySelector('.cn-sum')||{}).textContent||''));
  /* no silent failures */
  __rows.push({ message_id:'m4', lead_id:'L3', msg_at:new Date().toISOString(), seconds:60, status:'read', decided:null, reading:{ call_note:{ note:'Another note', call_back:null }, profile:{ people:[] } } });
  CallNotes.load(true); await sleep(300); window.__rpcFail=true; const n0=lead('L3').comm_log.length;
  await cnDecide('m4','ok'); await sleep(100);
  ok('a refused save says so on the panel and changes nothing', /Not saved: not allowed/.test($('cne_m4').textContent)&&lead('L3').comm_log.length===n0, $('cne_m4')&&$('cne_m4').textContent);
  $('cnt_m4').value=''; window.__rpcFail=false; await cnDecide('m4','ok');
  ok('OK with an empty note asks for one', /Write the note first/.test($('cne_m4').textContent));
  /* the profile */
  window.lpLead=lead('L3'); (0,eval)('lpLead=window.lpLead'); const box=document.createElement('div'); box.id='lp_callnotes_t'; 
  ok('profile · the same panel shows on the profile', (()=>{ const host=$('lp_callnotes'); CallNotes.renderProfile(); return !!host&&/Another note/.test(host.innerHTML); })());
  /* the switch */
  await cnToggle(); await sleep(100);
  ok('Settings · an owner turns it on, saved with the date', DATA.ops_settings.call_notes_live===true&&!!DATA.ops_settings.call_notes_live_since);
  (0,eval)(`ME={ email:'kry@mo-care.com', name:'Krystal Land', shift:'day' };`); L.alerts.length=0; await cnToggle();
  ok('Settings · a coordinator cannot change it', DATA.ops_settings.call_notes_live===true&&L.alerts.some(a=>/Only Samantha or Zachary/.test(a)));
  cnPreview(false); DATA.ops_settings.leads_cards_live=true; renderLeadsStarts(); await sleep(200);
  ok('switch on · the coordinator sees the notes without a preview', !!document.querySelector('.lt-row .cn-panel')&&!/Preview/.test(($('lbBoard').querySelector('.cn-sum')||{}).textContent||''));
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
    pg.goto('http://hub.test/index.html?proof=callnotes'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True)
        steps = [('1-leads', "switchTab('leadsstarts'); lcPreview(true); cnPreview(true); CallNotes.load(true); setTimeout(()=>{ ltSortBy('last:desc'); document.getElementById('cnm_m1')&&cnWhole('m1'); },500);")]
        pg.evaluate("()=>{ document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; }")
        for name, js in steps:
            pg.evaluate('s=>(0,eval)(s)', js); pg.wait_for_timeout(500)
            pg.wait_for_timeout(900); pg.evaluate("()=>{ const e=document.querySelector('.cn-sum'); e&&e.scrollIntoView(); window.scrollBy(0,-90); }"); pg.wait_for_timeout(200)
            pg.screenshot(path=os.path.join(SHOTS, name + '.png'))
        b.close(); print('saved to', SHOTS); raise SystemExit(0)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

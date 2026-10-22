"""Learned on this call, step 1 (1050, Samantha 2026-10-22: "dont lose any info", her yes to all 5 decisions, "Build step 1 in
practice"). The real page, offline, made-up families (the lead workspace test's setup). Proves: in PRACTICE only an owner sees
the box on the lead's Overview, every button off; nobody else sees it; once LIVE everyone sees it, Add opens the REGULAR lead
form with only what was checked (the call's answer where "Use the new one"), the save marks the box done, "Something is wrong"
keeps it marked with why, and a call with no transcript says so. Nothing is sent to anyone.
(python3 tests/browser/call_learned_look.py, static server on PORT, default 8765)"""
import os, re
from playwright.sync_api import sync_playwright
PORT = os.environ.get('PORT', '8765')
SRC = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'leads_workspace_look.py')).read()
STUB = re.search(r'STUB = r"""(.*?)"""', SRC, re.S).group(1)
MORE = r"""
(()=>{
  window.__rows=[
    { message_id:'m3', lead_id:'dia', msg_at:'2026-10-06T15:10:00Z', direction:'inbound', seconds:720, staff:'krystal@mo-care.com', status:'read', tries:1, decided:null,
      reading:{ prefill:{ relationship:'Daughter', number_of_hours:'30', safety:['fallRisk','livesAlone'], physician_name:'Dr. Patel', client_city:'Nixa', interest_notes:'Diane called back; her mom is alone all morning.' },
        heard:['relationship','number_of_hours','safety','physician_name','client_city','interest_notes'],
        profile:{ facts:{}, attributes:{}, people:[{ name:'Mark Teague', relationship:'Son', note:'pays the bills' }] }, care_plan:{ fields:{ safety_concerns:'Alone all morning' }, narrative:'', axiscare_tasks:[] }, medicaid_mentioned:false } },
    { message_id:'m2', lead_id:'dia', msg_at:'2026-10-06T13:00:00Z', direction:'outbound', seconds:300, staff:'krystal@mo-care.com', status:'no_transcript', tries:4, decided:null, reading:null, note:'GoHighLevel has no transcript for this call' }];
  window.__rpc=[]; window.__asked=0;
  sb.from=(t)=>{ const st={ f:{} }; const p={ select(){return p;}, eq(k,v){ st.f[k]=v; return p;}, in(){return p;}, gte(){return p;}, order(){return p;}, limit(){return p;},
      then(a){ if(t==='call_learned') window.__asked++; return Promise.resolve({ data: t==='call_learned' ? JSON.parse(JSON.stringify(window.__rows.filter(r=>r.lead_id===st.f.lead_id))) : [], error:null }).then(a); } }; return p; };
  sb.rpc=async(fn,a)=>{ window.__rpc.push([fn,a]); if(fn==='call_learned_decide'){ const r=window.__rows.find(x=>x.message_id===a.p_message_id); if(r){ r.decided=a.p_decided; r.decided_by='krystal@mo-care.com'; r.decided_note=a.p_note||null; } return { data:true, error:null }; }
    if(fn==='app_data_item_get') return { data:null, error:null }; return { data:null, error:null }; };
  window.__owner=false; (0,eval)("ccIsOwner=()=>window.__owner");
  window.prompt=()=>'the hours were for the summer only';
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,900)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  const open=async()=>{ CallLearned._state.at={}; CallLearned._state.rows={}; await openClient({ lead_id:'dia' }, 'summary'); await sleep(400); lwRender(); await sleep(150); };
  const box=()=>document.querySelector('.cl2-box');
  /* PRACTICE, not an owner */
  DATA.ops_settings.call_learn_live=false; window.__owner=false; await open();
  ok('practice: someone who is not an owner sees nothing, and nothing is even read', !box() && window.__asked===0, window.__asked);
  /* PRACTICE, owner */
  window.__owner=true; await open();
  const b=box(), t=b && b.innerText;
  ok('practice: an owner sees the box at the top of the Overview, marked Practice', b && /Learned on this call/.test(t) && /Practice: only owners see this/.test(t) && b.compareDocumentPosition(document.querySelector('.lw-top')) & Node.DOCUMENT_POSITION_FOLLOWING, t);
  ok('practice: the call line says who and how long', /They called, Krystal answered · .*12 min/.test(t), t);
  ok('new: the doctor, and only the safety tick the lead lacks (marked Safety)', /Doctor: Dr\. Patel/.test(t) && /Safety: adds lives alone/.test(t) && b.querySelector('.cl2-safe'), t);
  ok('changed: hours 20 before, 30 now, with Use the new one / Keep the old one', /Hours a week[\s\S]*Before: 20[\s\S]*Now: 30/.test(t) && /Use the new one/.test(t) && /Keep the old one/.test(t), t);
  ok('people and also said', /Mark Teague, Son: pays the bills/.test(t) && /her mom is alone all morning/.test(t), t);
  ok('already on the profile: who called and the town are not offered again', /Already on the profile[\s\S]*Who called[\s\S]*Town/i.test(t) && !/Town: Nixa/.test(t), t);
  ok('practice: every button and tick is off', [...b.querySelectorAll('button, input')].every(x=>x.disabled), [...b.querySelectorAll('button,input')].filter(x=>!x.disabled).map(x=>x.outerHTML.slice(0,80)));
  const notes=document.querySelector('.cl2-notes');
  ok('a call with no transcript says so on the profile (never quiet)', notes && /no transcript/.test(notes.innerText) && /Listen to the call/.test(notes.innerText), notes && notes.innerText);
  /* LIVE, not an owner */
  DATA.ops_settings.call_learn_live=true; window.__owner=false; await open();
  ok('live: everyone sees it, no Practice label, buttons on', box() && !/Practice/.test(box().innerText) && !box().querySelector('.cl2-bar .primary').disabled, box() && box().innerText);
  ok('live: Add counts what is checked (2 new, 1 changed, 1 person)', /Add the 4 checked/.test(box().querySelector('.cl2-bar .primary').innerText), box().querySelector('.cl2-bar .primary').innerText);
  /* untick the doctor */
  const doc=[...box().querySelectorAll('.cl2-row')].find(r=>/Doctor/.test(r.innerText)); doc.querySelector('input').click(); await sleep(150);
  ok('unticking one: Add the 3 checked', /Add the 3 checked/.test(box().querySelector('.cl2-bar .primary').innerText));
  box().querySelector('.cl2-bar .primary').click(); await sleep(400);
  const modal=document.getElementById('leadModalBackdrop');
  ok('Add opens the regular lead form', modal && modal.classList.contains('open'));
  ok('...hours replaced with what the call said (30), and yellow', document.getElementById('lead_number_of_hours').value==='30' && document.getElementById('lead_number_of_hours').classList.contains('cl-heard'), document.getElementById('lead_number_of_hours').value);
  ok('...the unticked doctor is not filled', document.getElementById('lead_physician_name').value==='', document.getElementById('lead_physician_name').value);
  const ticks=getCheckedValues('lead_safety_grid');
  ok('...lives alone added to the safety ticks, fall risk kept', ticks.indexOf('livesAlone')>-1 && ticks.indexOf('fallRisk')>-1, ticks);
  ok('...the call\'s notes go below the lead\'s', /her mom is alone all morning/.test(document.getElementById('lead_interest_notes').value));
  ok('nothing saved yet, nothing marked yet', !window.__rpc.some(x=>x[0]==='call_learned_decide'));
  const before=window.__log.writes.length;
  await saveLead(); await sleep(400);
  const d=DATA.leads.find(l=>l.id==='dia');
  ok('save: the lead is saved by the regular save with the new hours and Mark', window.__log.writes.length>before && d.schedule && Number(d.schedule.hours_per_week)===30 && (d.call_profile.people||[]).some(p=>p.name==='Mark Teague'), [d.schedule, d.call_profile]);
  ok('save: the box is marked added (the call is not offered again)', window.__rpc.some(x=>x[0]==='call_learned_decide' && x[1].p_message_id==='m3' && x[1].p_decided==='added'), window.__rpc);
  ok('save: the call is not logged a second time on the history (the recorder already has it)', !(d.contact_events||[]).some(e=>e.ref==='ghl:m3'), d.contact_events);
  await open();
  ok('after: the box is gone; the no-transcript note stays', !box() && document.querySelector('.cl2-notes'));
  /* Something is wrong */
  window.__rows[0].decided=null; await open();
  box().querySelector('.cl2-bar .ghost').click(); await sleep(300);
  ok('Something is wrong: marked with why, the box closes, the note shows who and why', window.__rpc.some(x=>x[1].p_decided==='wrong' && x[1].p_note==='the hours were for the summer only') && !box() && /marked wrong by Krystal \("the hours were for the summer only"\)/.test(document.querySelector('.cl2-notes').innerText), document.querySelector('.cl2-notes') && document.querySelector('.cl2-notes').innerText);
  ok('nothing was texted or emailed', !(window.__log.sms||[]).length);
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1360, 'height': 1000})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(f'http://localhost:{PORT}/index.html?proof=calllearned'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', STUB); pg.evaluate('s=>(0,eval)(s)', MORE)
    R = pg.evaluate(T)
    if os.environ.get('SHOT'):
        pg.evaluate("async()=>{ window.__rows[0].decided=null; DATA.ops_settings.call_learn_live=false; window.__owner=true; CallLearned._state.at={}; CallLearned._state.rows={}; await openClient({ lead_id:'dia' }, 'summary'); }"); pg.wait_for_timeout(700)
        pg.evaluate("()=>lwRender()"); pg.wait_for_timeout(200); pg.screenshot(path=os.environ['SHOT'], full_page=False)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

"""Shift-note flags, red or yellow (2026-10-06): the card on My Work and Needs Attention, its next steps, Done asks what
was done, and the client's profile lists recent flags. The real Hub page, offline, made-up people and notes; every save
lands in an in-memory copy. Nothing is texted or emailed. (python3 tests/browser/shift_flags_look.py, static server on 8765)"""
import re
from playwright.sync_api import sync_playwright
src = open('/Users/samantha/Claude/Projects/cc-hub-live/tests/browser/standup_look.py').read()
STUB = re.search(r'STUB = r"""(.*?)"""', src, re.S).group(1)
DATA = r"""
(()=>{
  const now=Date.now(), I=h=>new Date(now+h*36e5).toISOString();
  window.__me={ email:'krystal@mo-care.com', name:'Krystal Land' };
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Land', shift:'day' };");
  (0,eval)("OPS_DOMAINS=[{ code:'client_care', label:'Client Care', owner_person:'p_k', entity:'cc_ihs' },{ code:'incidents', label:'Incidents', owner_person:'p_s', entity:'cc_ihs' }]; OPS_PEOPLE=[{ person_id:'p_k', full_name:'Krystal Land', primary_email:'krystal@mo-care.com' },{ person_id:'p_s', full_name:'Samantha Owner', primary_email:'sam@mo-care.com' }];");
  const items=[
    { id:'ops_carenote_9_601', kind:'care_note', status:'open', level:'red', flag_kind:'a fall or injury', why:'Ruth slipped getting out of the bath and hit her arm.', trigger:'Ruth slipped getting out and hit her arm on the sink',
      title:"Red flag: Ruth's Mon, Oct 5 visit, a fall or injury", about:'Ruth Barnes (fake)', caregiver:'Kim Aide', caregiver_phone:'4175550909', client_ax:'601', visit_day:'Mon, Oct 5', flags_14d:2, pattern_count:0,
      detail:'Kim Aide wrote after the Mon, Oct 5, 1:00 PM visit:\n\n"Helped with bath. Ruth slipped getting out and hit her arm on the sink, says she is fine."\n\nBathing: not done ("Refused")\n\nWhy it\'s here: Ruth slipped.\nThis never contacts anyone by itself.',
      owner:'krystal@mo-care.com', owner_name:'Krystal Land', also_for:['sam@mo-care.com'], urgency:'urgent', created_at:I(-2), due:I(2), family_line:'Ruth slipped after her bath; she says she is okay.' },
    { id:'ops_carenote_8_602', kind:'care_note', status:'open', level:'yellow', flag_kind:'eating or drinking', why:'Patsy ate very little for the second visit in a row.', trigger:'Only ate a few bites of lunch again',
      title:"Yellow flag: Patsy's Sun, Oct 4 visit, eating or drinking", about:'Patsy Lane (fake)', caregiver:'Di Aide', caregiver_phone:'', client_ax:'602', visit_day:'Sun, Oct 4', flags_14d:1,
      detail:'Di Aide wrote after the Sun, Oct 4 visit:\n\n"Good visit overall. Only ate a few bites of lunch again, said she wasn\'t hungry."\n\nWhy it\'s here: Patsy ate very little.', owner:'krystal@mo-care.com', owner_name:'Krystal Land', urgency:'normal', created_at:I(-5), due:I(19) },
    { id:'ops_old_flag', kind:'care_note', status:'open', title:"Possible concern on Nora's visit: mood", about:'Nora Fine (fake)', detail:'An older flag with no level.', owner:'krystal@mo-care.com', created_at:I(-30), due:I(5) },
    { id:'ops_carenote_past', kind:'care_note', status:'done', level:'yellow', why:'Ruth was more tired than usual.', client_ax:'601', visit_day:'Thu, Oct 1', outcome:['called','watch'], created_at:I(-24*5) } ];
  DATA.ops_items=JSON.parse(JSON.stringify(items)); window.__store.ops_items=JSON.parse(JSON.stringify(items));
  DATA.coordinator_staff=[{ email:'krystal@mo-care.com', name:'Krystal Land' },{ email:'sam@mo-care.com', name:'Samantha Owner' }];
  window.n3Open=(id)=>{ window.__n3=id; };
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  switchTab('mywork'); await sleep(500); try{ myWorkGo('today'); }catch(e){} await sleep(300);
  const W=document.getElementById('tab-mywork'), card=id=>W.querySelector('.wkcard[data-id="'+id+'"]');
  const red=card('ops_carenote_9_601'), old=card('ops_old_flag');
  const yel=(()=>{ const d=document.createElement('div'); d.innerHTML=myWorkCard(DATA.ops_items.find(x=>x.id==='ops_carenote_8_602'),0); document.body.appendChild(d); return d; })();   /* due tomorrow: on another My Work tab */
  ok('the red flag is on My Work with its level, kind, client, day and caregiver', red && /Red flag · act today/.test(red.innerText) && /a fall or injury · Ruth Barnes \(fake\) · Mon, Oct 5 · Kim Aide/.test(red.innerText), red && red.innerText.slice(0,400));
  ok("...why it's here, in one sentence", /Why it's here: Ruth slipped getting out of the bath and hit her arm\./.test(red.innerText));
  ok("...the caregiver's words, with the part that caused it highlighted", red.querySelector('.cn-hl') && red.querySelector('.cn-hl').textContent==='Ruth slipped getting out and hit her arm on the sink' && /Helped with bath\./.test(red.querySelector('.cn-words').textContent));
  ok('...the not-done task under it, and "2nd flag for Ruth in 14 days"', /Bathing: not done/.test(red.innerText) && /2nd flag for Ruth in 14 days/.test(red.innerText));
  ok('...next steps: call Kim (office line), tell the family, nurse visit, incident, watch, not a concern', ['Call Kim','Tell the family','Nurse or supervisor visit','Write it up as an incident','Watch it (3 days)','Not a concern, close'].every(t=>red.innerText.includes(t)) && red.querySelector('.cn-call[data-oc-phone="4175550909"]'));
  ok('the yellow flag: its own level, no incident step, and no call link without a number', yel && /Yellow flag · look within 24 hours/.test(yel.innerText) && !/Write it up as an incident/.test(yel.innerText) && !yel.querySelector('.cn-call') && /Call the caregiver/.test(yel.innerText), yel && yel.innerText.slice(0,600));
  ok('an older flag with no level looks as it did', old && !old.querySelector('.cn-flag') && /An older flag with no level/.test(old.innerText));
  // steps
  await cnStep('ops_carenote_9_601','nurse'); await sleep(200);
  const nurse=DATA.ops_items.find(x=>x.source_id==='ops_carenote_9_601' && /Nurse or supervisor visit/.test(x.title));
  ok('Nurse or supervisor visit: a new card for Client Care, linked back, and recorded on the flag', nurse && nurse.owner==='krystal@mo-care.com' && /Ruth Barnes/.test(nurse.title) && DATA.ops_items[0].cn_actions.some(a=>a.what==='nurse'));
  await cnStep('ops_carenote_9_601','incident'); await sleep(200);
  const inc=DATA.ops_items.find(x=>x.source_id==='ops_carenote_9_601' && /^Incident: /.test(x.title));
  ok('Write it up as an incident: a card on the Incidents owner\'s My Work (Samantha)', inc && inc.owner==='sam@mo-care.com' && inc.domain==='incidents' && /a fall or injury/.test(inc.title), inc);
  await cnStep('ops_carenote_9_601','family'); await sleep(100);
  ok('Tell the family opens the draft a person sends (never sends by itself)', window.__n3==='ops_carenote_9_601' && window.__log.fn.length===0);
  await cnDid('ops_carenote_9_601','called'); await sleep(200);
  const r2=card('ops_carenote_9_601');
  ok('the card says what was done so far, by whom', /Done so far: Asked for a nurse or supervisor visit \(Krystal/.test(r2.innerText) && /Called the caregiver/.test(r2.innerText));
  // Done asks what was done
  opsClose('ops_carenote_9_601'); await sleep(150);
  const pop=[...document.querySelectorAll('.ccpop')].pop();
  const ticked=[...pop.querySelectorAll('.cn-out input')].filter(x=>x.checked).map(x=>x.value);
  ok('Done asks "What was done?", already ticked for what was recorded', /What was done\?/.test(pop.innerText) && JSON.stringify(ticked.sort())===JSON.stringify(['called','family','incident','nurse']), ticked);
  pop.querySelector('#clGo').click(); await sleep(250);
  const R0=DATA.ops_items.find(x=>x.id==='ops_carenote_9_601');
  ok('...and the closed flag keeps that outcome', R0.status==='done' && JSON.stringify(R0.outcome.sort())===JSON.stringify(['called','family','incident','nurse']), R0.outcome);
  opsClose('ops_carenote_8_602'); await sleep(150);
  let p2=[...document.querySelectorAll('.ccpop')].pop(); p2.querySelector('#clGo').click(); await sleep(150);
  ok('Done with nothing ticked and no note: asks first, nothing closed', DATA.ops_items.find(x=>x.id==='ops_carenote_8_602').status==='open');
  try{ ccPopClose(); }catch(e){}
  await cnStep('ops_carenote_8_602','watch'); await sleep(200);
  const Y=DATA.ops_items.find(x=>x.id==='ops_carenote_8_602');
  ok('Watch it parks it for 3 days (comes back on its own)', Y.sub_state==='waiting' && /^\d{4}-\d{2}-\d{2}$/.test(Y.check_back) && /next shift notes for Patsy/.test(Y.waiting_on));
  await cnStep('ops_carenote_8_602','ok'); await sleep(200);
  ok('Not a concern closes it with that outcome', Y.status==='done' && JSON.stringify(Y.outcome)==='["ok"]' && Y.close_note==='Not a concern');
  // also on the Incidents owner's My Work
  window.__me={ email:'sam@mo-care.com', name:'Samantha Owner' }; (0,eval)("ME={ email:'sam@mo-care.com', name:'Samantha Owner' };");
  DATA.ops_items.push(Object.assign({}, DATA.ops_items[0], { id:'ops_carenote_red2', status:'open', cn_actions:[], outcome:null }));
  const b=myWorkBuckets();
  ok('a red flag is also on the Incidents owner\'s My Work (also_for)', b.mine.some(x=>x.id==='ops_carenote_red2'));
  ok('...a yellow one is not', !b.mine.some(x=>x.id==='ops_carenote_8_602'));
  // profile
  const pf=cnProfileFlags('601'), d=document.createElement('div'); d.innerHTML=pf;
  ok('the client profile lists recent flags with what was done', /Flags in the last 30 days/.test(d.innerText) && /Thu, Oct 1: Ruth was more tired than usual\./.test(d.innerText) && /Called the caregiver, Watching it/.test(d.innerText));
  // Needs Attention row
  const row=document.createElement('div'); row.innerHTML=opsRow(DATA.ops_items.find(x=>x.id==='ops_carenote_red2'), true);
  ok('Needs Attention shows the same card and steps', !!row.querySelector('.cn-flag.cn-red') && /What happens next/.test(row.innerText));
  // Settings > Shift-note flags
  window.__merged=[]; window.tkMerge=async(fn,what)=>{ const m=JSON.parse(JSON.stringify(DATA.ops_settings||{})); const ch=fn(m,m); window.__merged.push({ m, ch }); return { changed:ch, error:null }; };
  DATA.ops_settings={}; let box=document.getElementById('cnSet'); if(!box){ box=document.createElement('div'); box.id='cnSet'; document.body.appendChild(box); } cnSetFill();
  const btns=()=>[...box.querySelectorAll('button')];
  ok('Settings: both switches off; texts can\'t go on while red and yellow flags are off', btns().length===2 && btns()[1].disabled && /red and yellow flags are off/.test(box.innerText));
  const asked=[]; window.confirm=t=>{ asked.push(t); return true; };
  btns()[0].click(); await sleep(150);
  ok('...turning on red and yellow flags asks first and saves only that switch', /Turn on red and yellow shift-note flags\?/.test(asked[0]) && window.__merged.at(-1).m.care_notes_levels_live===true && JSON.stringify(window.__merged.at(-1).ch)==='["Red and yellow flags ON"]' && !btns()[1].disabled);
  btns()[1].click(); await sleep(150);
  ok('...then red flag texts (8am to 9pm only, it says so)', /between 8am and 9pm only/.test(asked[1]) && window.__merged.at(-1).m.care_notes_red_text_live===true);
  btns()[0].click(); await sleep(150);
  ok('...turning red and yellow flags off turns the texts off too', window.__merged.at(-1).m.care_notes_levels_live===false && window.__merged.at(-1).m.care_notes_red_text_live===false && DATA.ops_settings.care_notes_red_text_live===false);
  // the Dashboard's overnight list
  const rowF=(m,sub,tab)=>'<div class="hero-row" onclick="switchTab(\''+tab+'\')"><div class="m">'+m+'<div class="sub">'+sub+'</div></div></div>', whenF=()=>'9:15am this morning';
  const dv=document.createElement('div');
  dv.innerHTML=dashOvernightRow(Object.assign({}, DATA.ops_items.find(x=>x.id==='ops_carenote_red2')), rowF, whenF, '');
  ok('Dashboard overnight: a red flag says Red flag and why, not the first words of the note', /Red flag/.test(dv.innerText) && /Ruth slipped getting out of the bath/.test(dv.innerText) && !/wrote after/.test(dv.innerText) && /suOpenWork\('ops_carenote_red2'\)/.test(dv.innerHTML), dv.innerHTML);
  dv.innerHTML=dashOvernightRow({ id:'old9', kind:'care_note', about:'Nora Fine (fake)', title:"Possible concern on Nora's Tue, Oct 6 visit: something else worth a look", detail:'Kim wrote after the visit: "x"' }, rowF, whenF, '');
  ok('...an older flag says what it is ("Shift note", "Possible concern: ...")', /Shift note/.test(dv.innerText) && /Possible concern: Nora's Tue, Oct 6 visit/.test(dv.innerText) && !/wrote after/.test(dv.innerText), dv.innerText);
  ok('nothing was texted or emailed', window.__log.fn.length===0 && window.__log.rpc.length===0);
  window.__me={ email:'krystal@mo-care.com', name:'Krystal Land' }; (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Land', shift:'day' };");
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width':1300,'height':1000})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=shiftflags'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', STUB); pg.evaluate('s=>(0,eval)(s)', DATA)
    R = pg.evaluate(T)
    pg.evaluate('s=>(0,eval)(s)', DATA)
    pg.evaluate("async()=>{ switchTab('mywork'); await new Promise(r=>setTimeout(r,500)); try{ myWorkGo('today'); }catch(e){} await new Promise(r=>setTimeout(r,300)); const c=document.querySelector('.wkcard[data-id=\"ops_carenote_9_601\"]'); if(c) c.scrollIntoView({block:'start'}); window.scrollBy(0,-20); }")
    pg.screenshot(path='/tmp/shift_flags.png')
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

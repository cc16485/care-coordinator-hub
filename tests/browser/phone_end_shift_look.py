"""CC Office on the phone, screen 4 (End my shift), 2026-10-07. index.html?m=1 at phone size, offline, made-up shift;
every Supabase answer is faked and every save recorded; nothing reaches the database and nobody is texted.
(python3 tests/browser/phone_end_shift_look.py)"""
from playwright.sync_api import sync_playwright
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,900)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const iso=h=>new Date(Date.now()+h*36e5).toISOString();
  const endToday=()=>{ const e=new Date(); e.setHours(23,30,0,0); return e.getTime()>Date.now()+6e4 ? e.toISOString() : iso(0.2); };
  const ME_E='krystal@mo-care.com', SAM='sam@mo-care.com', ZACH='zach@mo-care.com';
  window.__STORE={
    ops_items:[
      { id:'A', kind:'coverage', status:'open', title:'Uncovered shift: Joan Ross', owner:ME_E, owner_name:'Krystal Test', urgency:'urgent', created_at:iso(-2), due:iso(-0.5) },
      { id:'B', kind:'missed_call', status:'open', title:'Call back: Ann Bell', owner:ME_E, owner_name:'Krystal Test', created_at:iso(-3), due:endToday() },
      { id:'C', kind:'missed_call', status:'open', title:'Call back: Ray', owner:ME_E, owner_name:'Krystal Test', created_at:iso(-3), due:endToday() },
      { id:'D', kind:'coverage', status:'open', title:'Uncovered shift: Mr. Hale', urgency:'urgent', created_at:iso(-1), due:iso(-0.2) },
      { id:'E', kind:'missed_call', status:'open', title:'Parked one', owner:ME_E, sub_state:'waiting', check_back:new Date(Date.now()+3*864e5).toISOString().slice(0,10), created_at:iso(-9), due:iso(-5) } ],
    handoffs:[{ id:'ho_old_krystal', kind:'end_of_shift', from:ZACH, from_name:'Zach Test', to:ME_E, to_name:'Krystal Test', posted_at:iso(-10), general_note:'Mrs. Ortiz family may call back',
                items:[{ label:'Call back: new inquiry', what:'handed', note:'left a voicemail' },{ label:'Open shift Fri', what:'attention' }], ack_at:null }],
    standup_notes:[] };
  window.__RPC=[]; window.__EV=[];
  const clone=x=>JSON.parse(JSON.stringify(x));
  sb.from=(t)=>{ let key=null; const b={ select(){return b;}, order(){return b;}, limit(){return b;}, in(){return b;}, gte(){return b;}, lt(){return b;},
      eq(c,v){ if(c==='key') key=v; return b; },
      insert(row){ if(t==='op_events') window.__EV.push(row); return Promise.resolve({error:null}); },
      maybeSingle(){ return Promise.resolve(t==='app_data'?{data:{data:clone(window.__STORE[key]||[])},error:null}:{data:null,error:null}); }, single(){ return b.maybeSingle(); },
      then(o){ return Promise.resolve({data:[],error:null}).then(o); } }; return b; };
  sb.rpc=async(fn,a)=>{ window.__RPC.push([fn,a&&a.target_key,a&&a.item&&a.item.id]);
    if(fn==='upsert_app_data_item'){ const L=(window.__STORE[a.target_key]=window.__STORE[a.target_key]||[]); const i=L.findIndex(x=>x.id===a.item.id); if(i>-1) L[i]=clone(a.item); else L.push(clone(a.item)); }
    return {data:null,error:null}; };
  window.dutyHolder=(area)=>({ person: area==='staffing'?SAM:ZACH });
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Test', shift:'day' };");
  DATA.coordinator_staff=[{ email:ME_E, name:'Krystal Test' },{ email:SAM, name:'Sam Test' },{ email:ZACH, name:'Zach Test' }];
  DATA.ops_items=clone(window.__STORE.ops_items); DATA.handoffs=clone(window.__STORE.handoffs); DATA.ops_settings={};
  phStart(); await sleep(120);
  ok('four tabs fit: Needs me, Find, Today, End shift', [...document.querySelectorAll('.ph-tabs button')].map(b=>b.innerText).join('|')==='Needs me|Find|Today|End shift');
  /* a handoff posted to me */
  const ho=()=>document.querySelector('#phList .ph-ho');
  ok('a handoff someone posted to me shows at the top of Needs me (the Hub\'s own list), with Got it', ho() && /Handoff from Zach Test/.test(ho().innerText) && /left a voicemail/.test(ho().innerText) && /1 needs attention/.test(ho().innerText) && /Mrs\. Ortiz family may call back/.test(ho().innerText), ho() && ho().innerText);
  ho().querySelector('[data-ho]').click(); await sleep(300);
  ok('Got it clears it (saved on the record, the Hub\'s own Got it)', !ho() && window.__STORE.handoffs.find(h=>h.id==='ho_old_krystal').ack_at && window.__EV.some(e=>e.verb==='handoff_seen'), [window.__STORE.handoffs, window.__EV.map(e=>e.verb)]);
  window.__RPC=[]; window.__EV=[];
  /* End my shift */
  document.querySelector('.ph-tabs [data-v="end"]').click(); await sleep(300);
  const body=()=>document.getElementById('phEndBody');
  ok('End my shift: who is next on duty for each area', /Next on duty/.test(body().innerText) && /Sam Test \(now\)/.test(body().innerText) && /Zach Test \(now\)/.test(body().innerText), body().innerText.slice(0,300));
  const cards=()=>[...body().querySelectorAll('[data-eo]')];
  ok('still moving today: mine, urgent first (A, then B and C); the parked one is counted, not listed', JSON.stringify(cards().map(c=>c.getAttribute('data-eo')))==='["A","B","C"]' && /1 waiting with a wake-up stays with you/.test(body().innerText), [cards().map(c=>c.getAttribute('data-eo')), body().innerText.slice(0,500)]);
  const on=id=>cards().find(c=>c.getAttribute('data-eo')===id).querySelector('.ph-ch .on').innerText;
  ok('the Hub\'s own defaults: the urgent shift goes To Sam (next on Staffing), the rest stay with me', on('A')==='To Sam' && on('B')==='Stays with me' && on('C')==='Stays with me', [on('A'),on('B'),on('C')]);
  ok('needs attention, nobody has it: the unowned urgent shift', /NEEDS ATTENTION, NOBODY HAS IT · 1/.test(body().innerText) && /Mr\. Hale/.test(body().innerText));
  /* choices */
  cards().find(c=>c.getAttribute('data-eo')==='C').querySelector('[data-pk="done"]').click(); await sleep(50);
  const setNote=(id,v)=>{ const i=body().querySelector('[data-note="'+id+'"]'); i.value=v; i.dispatchEvent(new Event('input',{bubbles:true})); };
  setNote('A','Joyce said maybe'); setNote('C','Reached him, all set');
  const g=document.getElementById('phEoGeneral'); g.value='Quiet afternoon'; g.dispatchEvent(new Event('input',{bubbles:true}));
  ok('choosing Done and writing notes keeps them (nothing saved yet)', on('C')==='Done' && body().querySelector('[data-note="A"]').value==='Joyce said maybe' && window.__RPC.length===0, [on('C'), window.__RPC]);
  /* someone else changes B before I post */
  window.__STORE.ops_items.find(x=>x.id==='B').owner=ZACH;
  body().querySelector('[data-pe="post"]').click(); await sleep(700);
  const S=id=>window.__STORE.ops_items.find(x=>x.id===id);
  ok('posted: A is now Sam\'s with my note in its history (the Hub\'s own hand-off)', S('A').owner===SAM && JSON.stringify(S('A').history||[]).includes('Joyce said maybe'), S('A'));
  ok('...C is done, closed by me, with my note', S('C').status==='done' && S('C').closed_by===ME_E && S('C').close_note==='Reached him, all set', S('C'));
  ok('...B (taken by Zach meanwhile) was left alone', S('B').owner===ZACH && S('B').status==='open');
  const hs=window.__STORE.handoffs.filter(h=>h.id!=='ho_old_krystal');
  const toSam=hs.find(h=>h.to===SAM);
  ok('...a handoff for Sam: A handed with the note, and the unowned urgent shift as needs attention; my general note on it', toSam && toSam.items.some(i=>i.ops_id==='A'&&i.what==='handed'&&i.note==='Joyce said maybe') && toSam.items.some(i=>i.ops_id==='D'&&i.what==='attention') && toSam.general_note==='Quiet afternoon', hs);
  ok('...the unowned urgent shift went on the Stand-Up board once', window.__STORE.standup_notes.length===1 && window.__STORE.standup_notes[0].ops_item_id==='D' && window.__STORE.standup_notes[0].urgent===true, window.__STORE.standup_notes);
  ok('...recorded as a shift ended', window.__EV.some(e=>e.verb==='shift_ended'), window.__EV.map(e=>e.verb));
  ok('the phone says what happened: posted to Sam, 1 handed, 1 done, 1 left alone, nobody texted', /Handoff posted to Sam/.test(body().innerText) && /1 handed on · 1 marked done · 1 already changed by someone else, left alone/.test(body().innerText) && /Nobody was texted/.test(body().innerText), body().innerText);
  ok('nothing was sent to anyone (no text or email calls)', !window.__RPC.some(r=>/send|sms|email/i.test(String(r[0]))), window.__RPC);
  body().querySelector('[data-pe="again"]').click(); await sleep(300);
  ok('Back to my lists: A and C are gone, B is Zach\'s now', !cards().length && /Nothing of yours is moving today/.test(body().innerText), body().innerText.slice(0,300));
  ok('fits a phone screen with four tabs', document.documentElement.scrollWidth<=window.innerWidth+1, [document.documentElement.scrollWidth, window.innerWidth]);
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch()
    block = lambda r: r.abort() if ('supabase.co' in r.request.url or 'leadconnectorhq' in r.request.url or 'hub.mo-care.com' in r.request.url) else r.continue_()
    errs = []
    pg = b.new_page(viewport={'width': 375, 'height': 812}, device_scale_factor=2); pg.route('**/*', block); pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?m=1'); pg.wait_for_timeout(1500)
    R = pg.evaluate(T)
    pg.screenshot(path='tests/browser/phone_end_shift.png')
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, dd in R: print(s_, '·', n, '' if s_ == 'PASS' else dd)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

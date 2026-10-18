"""919 (2026-10-17): Looks done on AI call cards, and Card checks on Call Follow Ups. The real page, offline, made-up people and
work only: nothing is saved anywhere and nobody is texted or emailed. Uses the fixtures of today_calm_look.py.
(PORT=<port> python3 tests/browser/looks_done_look.py, with a static server on the Hub folder and port)"""
import os, sys
from playwright.sync_api import sync_playwright

PORT = os.environ.get('PORT', '8765')
HERE = os.path.dirname(os.path.abspath(__file__))
STUB = open(os.path.join(HERE, 'today_calm_look.py')).read().split('STUB = r"""')[1].split('"""')[0]
EXTRA = r"""
(()=>{ const H=h=>new Date(Date.now()+h*36e5).toISOString();
  const it=DATA.ops_items.find(x=>x.id==='cf1');
  it.looks_done={ at:H(-0.5), why:'The office texted Tom that Angela is on for Saturday.', evidence:['Office text Mon 2:10 pm: Angela is on for Saturday'], source:'ai', sig:'s1' };
  DATA.ops_items.push({ id:'cf2', kind:'call_followup', status:'open', about:'Nora (fake)', title:'Call Nora back', owner:'samantha@mo-care.com', owner_name:'Samantha Troutman',
    domain:'scheduling_coverage', due:new Date(Date.now()-3*36e5).toISOString(), created_at:H(-6), created_by:'call-tasks',
    looks_done:{ at:H(-2), why:'Office texted them Mon 2:10 PM', evidence:['Office texted them Mon 2:10 PM'], source:'proof', sig:'s2' }, looks_done_no:{ at:H(-1), by:'Samantha Troutman' } });
  DATA.ops_settings=Object.assign(DATA.ops_settings||{}, { call_tasks_live:true, call_cards_practice:true });
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const card=id=>document.querySelector('.wkcard[data-id="'+id+'"]'), item=id=>DATA.ops_items.find(x=>x.id===id);
  document.getElementById('appScreen').classList.add('on');
  switchTab('mywork'); myWorkGo('today'); await sleep(200);
  const b=card('cf1')&&card('cf1').querySelector('.wk-looksdone');
  ok('Looks done shows on the card, with what showed it', b && /Looks done: The office texted Tom that Angela is on for Saturday\./.test(b.innerText) && /Office text Mon 2:10 pm/.test(b.innerText) && /The AI read the calls and texts/.test(b.innerText), b&&b.innerText);
  ok('a Not yet that came after the Looks done hides it', card('cf2') && !card('cf2').querySelector('.wk-looksdone'));
  ok('no Looks done on cards without one', !card('hand1').querySelector('.wk-looksdone'));
  /* Not yet */
  [...b.querySelectorAll('button')].find(x=>/Not yet/.test(x.textContent)).click(); await sleep(200);
  ok('Not yet: remembered with when and who, saved, banner gone, card still open', item('cf1').looks_done_no && item('cf1').looks_done_no.by==='Samantha Troutman' && window.__log.writes.includes('ops_items:cf1')
    && item('cf1').status==='open' && !card('cf1').querySelector('.wk-looksdone'));
  ok('Not yet: in the card history', /Not done yet \(the check said it looked done\)/.test(JSON.stringify(item('cf1').history)));
  /* a new Looks done after the Not yet shows again; Close it closes with the reason */
  item('cf1').looks_done=Object.assign({}, item('cf1').looks_done, { at:new Date(Date.now()+1000).toISOString(), why:'Office called Tom back.' }); renderMyWork(); await sleep(150);
  const b2=card('cf1').querySelector('.wk-looksdone');
  ok('a newer Looks done shows again', b2 && /Office called Tom back/.test(b2.innerText));
  [...b2.querySelectorAll('button')].find(x=>/Close it/.test(x.textContent)).click(); await sleep(250);
  ok('Close it: closed by me, with what showed it in the note', item('cf1').status==='done' && item('cf1').closed_by==='samantha@mo-care.com' && /^Looked done: Office called Tom back/.test(item('cf1').close_note), item('cf1'));

  /* Card checks on Call Follow Ups */
  const CHECKS=[
    { card_id:'cf2', message_id:'m2', mode:'practice', checked_at:new Date().toISOString(), verdict:'done', why:'Office texted them Mon 2:10 PM', evidence:['Office texted them Mon 2:10 PM'], would:'close', done:'none',
      proofs:[{ kind:'call_back', proven:true, how:'Office texted them Mon 2:10 PM' }] },
    { card_id:'cf1', message_id:'m1', mode:'practice', checked_at:new Date().toISOString(), verdict:'done', why:'Told Tom.', evidence:['Office text: told Tom'], would:'suggest', done:'none',
      proofs:[{ kind:'text_caregiver', proven:false, how:'' }] },
    { card_id:'cf9', message_id:'m9', mode:'practice', checked_at:new Date().toISOString(), verdict:'none', why:'Nothing has happened with them since the card was made.', evidence:[], would:'none', done:'none', proofs:[] } ];
  /* the tab reads call_card_check itself: the stand-in database answers with these rows */
  const rowsOf=d=>{ const p=new Proxy(function(){}, { get(_,k){ if(k==='then') return (a,b2)=>Promise.resolve({data:d,error:null}).then(a,b2); if(k==='maybeSingle') return ()=>Promise.resolve({data:null,error:null}); return ()=>p; } }); return p; };
  const from0=sb.from; sb.from=t=>t==='call_card_check'?rowsOf(CHECKS):from0(t);
  const wrap=document.createElement('div'); document.body.appendChild(wrap);
  CPR.setFilter('checks'); await CPR.load(true); CPR.render(wrap); await sleep(150);
  const t=wrap.innerText;
  ok('Card checks: says it is practice and what counts as proof', /Practice: nothing on any card changes/.test(t) && /every prepared step has proof/.test(t), t.slice(0,500));
  ok('Card checks: grouped would close / would say Looks done / still open', /WOULD CLOSE ON PROOF \(1\)/.test(t) && /WOULD SAY LOOKS DONE \(1\)/.test(t) && /STILL OPEN \(1\)/.test(t), t.slice(0,900));
  ok('Card checks: each step with its proof, or "no proof the Hub can see"', /✓ Call back Office texted them/.test(t) && /Text the caregiver no proof the Hub can see/.test(t), t);
  ok('Card checks: a card with no steps says it can only ever say Looks done', /No prepared steps, so it can only ever say Looks done/.test(t));
  ok('Card checks: the filter shows how many look done', /Card checks \(2 look done\)/.test(t));
  return R;
}
"""
R = []
with sync_playwright() as pw:
    sys.path.insert(0, HERE)
    from clock_pin import pin
    b = pw.chromium.launch()
    pg = b.new_page(viewport={'width': 1360, 'height': 1000})
    pin(pg)
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:' + PORT + '/index.html?proof=looks-done'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', STUB); pg.evaluate('s=>(0,eval)(s)', EXTRA)
    R += pg.evaluate(T)
    if len(sys.argv) > 1:
        pg.evaluate("""async()=>{ const it=DATA.ops_items.find(x=>x.id==='cf1'); it.status='open'; it.looks_done_no=null; it.looks_done.why='The office texted Tom that Angela is on for Saturday.'; myWorkGo('today'); await new Promise(r=>setTimeout(r,200)); }""")
        pg.locator('.wkcard[data-id="cf1"]').screenshot(path=sys.argv[1] + '-card.png')
        pg.evaluate("""()=>{ const w=document.querySelector('body > div:last-child'); w.id='ckshot'; w.style.width='900px'; w.style.background='#fff'; }""")
        pg.locator('#ckshot').screenshot(path=sys.argv[1] + '-checks.png')
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

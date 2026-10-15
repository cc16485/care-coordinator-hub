"""2026-10-15 · Book/Move and the no-show buttons ask on the page, not with confirm()/prompt()/alert() (Niasia Fulton's
move did nothing because Chrome had switched those pop-ups off). Offline, made-up applicants, every server answer faked,
and confirm/prompt/alert all say no, the way a switched-off browser does. (python3 tests/browser/book_move_inpage_look.py)
HUB_URL defaults to http://localhost:8765; point it at your own copy if that port serves another folder."""
import os
from playwright.sync_api import sync_playwright
H = open(os.environ.get('HUB_HARNESS', '/Users/samantha/Claude/Projects/cc-hub-live/.claude/g1a_harness.js')).read()
URL = os.environ.get('HUB_URL', 'http://localhost:8765')
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  window.__DLG=0; window.confirm=()=>{ window.__DLG++; return false; }; window.prompt=()=>{ window.__DLG++; return null; }; window.alert=()=>{ window.__DLG++; };
  window.__RPC=[]; window.__NS=[]; window.__LOADS=0;
  const day=(n,h)=>{ const d=new Date(); d.setDate(d.getDate()+n); d.setHours(h,0,0,0); return d.toISOString(); };
  window.__OLD=day(1,10); window.__NEW=day(2,14);
  (0,eval)(`AP_ROWS=[{ id:'n1', first_name:'Niasia', last_name:'Test', status:'reviewing' }];
    AP_BOOK={ n1:{ status:'booked', starts_at: window.__OLD } };
    AP_PROF={ id:'n1', first_name:'Niasia', last_name:'Test', status:'reviewing' };
    apLoad=async()=>{ window.__LOADS++; };
    apNoshowCall=async(o)=>{ window.__NS.push(o); return o.action==='preview' ? { text:'Hi Niasia', email:null } : { texted:true }; };
    sb.rpc=async(fn,a)=>{ window.__RPC.push([fn,a]); if(fn==='interview_open_slots') return { data:[{ starts_at: window.__NEW }], error:null };
      return { data:null, error:null }; };`);
  const card=document.getElementById('apBookCard'), slots=document.getElementById('apBookSlots'), err=document.getElementById('apBookErr');
  await apBookFor('n1'); await sleep(100);
  const t=slots.querySelector('button.fb');
  ok('the move picker opens with a free time', card.style.display==='block' && !!t, slots.innerText);
  t.click(); await sleep(100);
  const ask=document.getElementById('apBookAsk');
  ok('picking a time asks in the card: Move Niasia\'s interview from A to B?', ask && ask.style.display==='block' && /Move Niasia's interview from .+ to .+\?/.test(ask.innerText) && /Move it/.test(ask.innerText) && /Back/.test(ask.innerText), ask && ask.innerText);
  ok('...and no browser pop-up was used, nothing moved yet', window.__DLG===0 && !window.__RPC.some(r=>r[0]==='interview_reschedule'), [window.__DLG, window.__RPC]);
  document.getElementById('apBookBack').click(); await sleep(50);
  ok('Back puts the times back, nothing moved', ask.style.display==='none' && slots.style.display!=='none' && !window.__RPC.some(r=>r[0]==='interview_reschedule'));
  slots.querySelector('button.fb').click(); await sleep(50);
  document.getElementById('apBookYes').click(); await sleep(150);
  const mv=window.__RPC.find(r=>r[0]==='interview_reschedule');
  ok('Move it moves the interview (p_by office) and closes the card', mv && mv[1].p_applicant==='n1' && mv[1].p_starts===window.__NEW && mv[1].p_by==='office' && card.style.display==='none', window.__RPC);
  ok('no em dashes in the question', !/—/.test(ask.innerText + card.innerText));
  /* booking someone with no live booking */
  (0,eval)(`AP_BOOK={}`); window.__RPC=[];
  await apBookFor('n1'); await sleep(100); slots.querySelector('button.fb').click(); await sleep(50);
  ok('booking asks "Book Niasia in for ...?" with Book it', /Book Niasia in for .+\?/.test(document.getElementById('apBookAsk').innerText) && /Book it/.test(document.getElementById('apBookAsk').innerText));
  document.getElementById('apBookYes').click(); await sleep(150);
  ok('...Book it books', window.__RPC.some(r=>r[0]==='interview_book' && r[1].p_applicant==='n1'), window.__RPC);
  /* not on the list */
  window.__LOADS=0; card.style.display='none';
  await apBookFor('zz9'); await sleep(50);
  ok('not on the list: reloads it, then says so in the card', window.__LOADS===1 && card.style.display==='block' && err.style.display==='block' && /Could not find this application\. Refresh the page and try again/.test(err.innerText), [window.__LOADS, err.innerText]);
  document.getElementById('apBookId').value='zz9'; err.style.display='none';
  await apBookTake(window.__NEW, document.createElement('button'));
  ok('taking a time for somebody not on the list also says so', err.style.display==='block' && /Could not find this application/.test(err.innerText));
  /* no-show excuse */
  const pe=apNoshowExcuse('n1'); await sleep(80);
  let ov=document.querySelector('.ap-ask');
  ok('Excuse no-show asks on the page with a reason box', ov && /Excuse Niasia Test's no-show\?/.test(ov.innerText) && !!ov.querySelector('textarea'), ov && ov.innerText);
  ov.querySelector('.ap-ask-ok').click(); await sleep(30);
  ok('...an empty reason is refused on the page', document.querySelector('.ap-ask') && /Write down the reason they gave/.test(ov.querySelector('.ap-ask-err').innerText));
  ov.querySelector('textarea').value='car broke down'; ov.querySelector('.ap-ask-ok').click(); await pe; await sleep(100);
  ok('...with a reason it excuses and opens the picker', window.__NS.some(o=>o.action==='excuse' && o.reason==='car broke down') && card.style.display==='block', window.__NS);
  /* no-show mark */
  const pm=apNoshowMark('n1'); await sleep(80); ov=document.querySelector('.ap-ask');
  ok('Mark no-show shows the message on the page', ov && /Mark Niasia Test as a no-show\?/.test(ov.innerText) && /Hi Niasia/.test(ov.innerText), ov && ov.innerText);
  ov.querySelector('.ap-ask-back').click(); await pm;
  ok('...Back marks nothing', !window.__NS.some(o=>o.action==='mark') && !document.querySelector('.ap-ask'));
  ok('no browser pop-up used anywhere', window.__DLG===0, window.__DLG);
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page()
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(URL + '/index.html?proof=bookmove'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', H)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

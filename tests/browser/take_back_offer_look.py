"""Take back the offer (2026-11-20): the readiness card (the Onboarding table's Checklist for a signed hire) has a way out.
Offline, against a stand-in caregiver-journey server. python3 tests/browser/take_back_offer_look.py <out dir>
Serves its own blank page through Playwright routing, so no server is needed. Made-up names only."""
from playwright.sync_api import sync_playwright
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp'
ROOT = os.path.join(HERE, '..', '..')
CODE = open(os.path.join(ROOT, 'caregiver-readiness.js')).read(); ENG = open(os.path.join(ROOT, 'caregivers-engine.js')).read(); IDX = open(os.path.join(ROOT, 'index.html')).read()
SETUP = r"""
async(CODE)=>{
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  window.__R=[]; window.ok=(n,c,d)=>__R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); window.sleep=sleep;
  window.__alerts=[]; window.alert=m=>__alerts.push(String(m)); window.__leave=[]; window.__S={ approved:false, status:'open' };
  window.ckdLeaveOpen=(id,offerId)=>{ __leave.push([id,offerId]); const w=document.createElement('div'); w.id='ckdLeave'; w.textContent='Take Ava Lee off the onboarding list'; document.body.appendChild(w); };
  const row=(key,title,stage,st,status)=>({ key, def:{ key, title, stage, proof:'verified', permission:'hub', required:true }, st, status, owner:{ role:'hub' } });
  const answer=()=>{ const approved=__S.approved; return { ok:true, may_export:false, is_owner:true, may:{}, steps:[], events:[], facts:{ dates:{ orientation:null, axiscare_hire:'2026-10-05', differ:false } },
    journey:{ journey_id:'j-1', client_name:'Ava Lee', status:__S.status },
    approve:{ ready_for_final:false, approved, approved_at: approved ? '2026-11-01T15:00:00Z' : null, approved_by: approved ? 'Samantha' : null, axiscare:{ state: approved ? 'confirmed' : 'pending', label:'Active' }, text:null, prep:{ hire_date:{state:'pending'}, level:{state:'pending'} }, blocked: approved ? [] : ['Orientation finished'], locked:!approved, lock_why:'Scheduling stays locked until Approved to Work.', level_of_care:{ level:'Level 1', source:'the default' }, may_approve_work:true, may_retry:false, switches:{ axiscare_live:false, text_live:false } },
    view:{ rows:[ row('cg.offer.signed','Offer letter and position description signed','offer',{ state:'complete', completed_at:'2026-10-09T20:00:00Z', completed_by_name:'The Hub (verified)' },'complete'),
                  row('cg.orientation.done','Orientation finished','orientation',{ state:'open' },'ready'),
                  row('cg.approve.work','Approved to Work (owners only)','ready',{ state: approved ? 'complete' : 'open' }, approved ? 'complete' : 'later') ],
      next:null, complete:false, stage:'orientation', stageLabel:'Orientation', rail:[{key:'offer',label:'Offer',state:'done'},{key:'orientation',label:'Orientation',state:'now'}] } }; };
  window.sb={ functions:{ invoke:async(fn,o)=>{ const b=(o&&o.body)||{}; if(b.action==='get') return { data:answer(), error:null }; if(b.action==='list') return { data:{ ok:true, rows:[] }, error:null }; return { data:{ error:'Unknown action.' }, error:null }; } } };
  window.btns=()=>[...document.querySelectorAll('#crBody button')].map(b=>b.textContent.trim());
  window.shown=()=>{ const m=document.getElementById('crModal'); return !!m && m.style.display!=='none'; };
  const sc=document.createElement('script'); sc.textContent=CODE; document.head.appendChild(sc); await sleep(30);
  await CRX.openSide('o-1'); await sleep(150);
  ok('a signed hire still in orientation: the checklist card has Take back the offer', btns().includes('Take back the offer'), btns());
}
"""
REST = r"""
async()=>{
  const b=[...document.querySelectorAll('#crBody button')].find(x=>x.textContent.trim()==='Take back the offer');
  ok('the button says what it does before anything happens (nothing is deleted)', /Nothing is deleted/.test(b.title), b.title);
  b.click(); await sleep(60);
  ok('pressing it closes the card and opens the same Take off window for that offer (the reason is picked there; nothing has happened yet)', !shown() && __leave.length===1 && __leave[0][0]===null && __leave[0][1]==='o-1' && !!document.getElementById('ckdLeave') && __alerts.length===0, [__leave, __alerts]);
  document.getElementById('ckdLeave').remove();
  __S.approved=true; await CRX.openSide('o-1'); await sleep(150);
  ok('already Approved to Work: no Take back the offer (that is an employee leaving, not an offer)', !btns().includes('Take back the offer') && btns().includes('Close'), btns());
  __S.approved=false; __S.status='closed'; await CRX.openSide('o-1'); await sleep(150);
  ok('already taken off: no button', !btns().includes('Take back the offer'), btns());
  __S.status='open';
  const keep=window.ckdLeaveOpen; window.ckdLeaveOpen=(id,o)=>{ __leave.push([id,o]); };
  await CRX.openSide('o-1'); await sleep(150); CRX.takeBack(); await sleep(40);
  ok('if the take-off window cannot open, the office is told in plain words (never silent)', __alerts.length===1 && /could not open/.test(__alerts[0]), __alerts);
  window.ckdLeaveOpen=undefined; await CRX.openSide('o-1'); await sleep(150);
  ok('where the Onboarding list is not loaded, no button is offered', !btns().includes('Take back the offer'), btns());
  window.ckdLeaveOpen=keep;
  ok('no em dash anywhere it drew', !/—/.test(document.getElementById('crBody').innerText));
  return __R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 760, 'height': 620})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.route('http://hub.test/**', lambda r: r.fulfill(status=200, content_type='text/html', body='<!doctype html><html><head></head><body></body></html>'))
    pg.goto('http://hub.test/'); pg.wait_for_timeout(200)
    pg.evaluate("document.body.innerHTML=''; const st=document.createElement('style'); st.textContent='.ibtn{font:inherit;font-size:.8rem;padding:.3rem .6rem;border:1px solid #d9d4c8;border-radius:8px;background:#fff;cursor:pointer}body{font-family:-apple-system,sans-serif}'; document.head.appendChild(st);")
    pg.evaluate(SETUP, CODE)
    pg.screenshot(path=os.path.join(OUT, 'take_back_offer_card.png'), full_page=True)
    R = pg.evaluate(REST)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
ck = lambda n, c: R.append(['PASS' if c else 'FAIL', n, ''])
ck('the Onboarding list still offers its Take off window by offer to the page', 'function ckdLeaveOpen(id, offerId){' in ENG and 'window.ckdLeaveOpen = ckdLeaveOpen' in ENG)
ck('the page loads the new copy of the card', 'caregiver-readiness.js?v=14' in IDX)
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

"""The Live Schedule visit box (2026-10-12, her "this is stuck and wont let me cancel or x out"): one box at a time, Close,
Escape and a click outside all close it, a visit AxisCare didn't send back is never offered for a change, and a roster
still loading draws itself when it lands. Offline; AxisCare is faked; nothing is changed or sent.
(python3 tests/browser/visit_box_look.py, with a static server on PORT, default 8765)"""
import os
from playwright.sync_api import sync_playwright
PORT = os.environ.get('PORT', '8765')
H = open('/Users/samantha/Claude/Projects/cc-hub-live/.claude/g1a_harness.js').read()
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; await sleep(500);
  (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha Troutman' };"); CC_ROLES=['owner_admin']; CC_ROLES_CHECKED=true;
  const sess={ data:{ session:{ access_token:'t' } } }; sb.auth.getSession=async()=>sess;
  window.__get=null; window.__changes=[]; const of=window.fetch;
  window.fetch=async(u,o)=>{ u=String(u); if(/visit-change/.test(u)){ const b=JSON.parse(o.body);
      if(b.action==='reasons') return new Response(JSON.stringify({ live:true, reasons:[{ id:5, name:'Staffing Change - Caregiver Change' }] }),{status:200});
      if(b.action==='get'){ await new Promise(r=>setTimeout(r,120)); return new Response(JSON.stringify(window.__get),{status:window.__get.error?502:200}); }
      window.__changes.push(b); return new Response('{}',{status:200}); }
    if(/coverage-shifts/.test(u)){ await new Promise(r=>setTimeout(r,400)); return new Response(JSON.stringify({ caregivers:[{ name:'Kim Aide', axiscare_id:'7', visits:[] }] }),{status:200}); }
    return of(u,o); };
  LS_STATE.data={ rows:[{ visit_id:'s=1:d=2026-10-12', date:'2026-10-12', time:'08:00', end:'09:00', client:'April Davidson', caregiver:'Autumn R.', caregiver_id:'3' }] };
  const n=()=>document.querySelectorAll('.vc-ov').length, txt=()=>(document.querySelector('.vc-panel')||{}).innerText||'';
  /* the stuck case: AxisCare answers without the visit's details */
  window.__get={ error:'AxisCare didn’t send this visit’s details back, so it can’t be changed from the Hub. Change it in AxisCare.', seen:{ top:['results','success'], results:[] } };
  lcVisitOpen('s=1:d=2026-10-12'); lcVisitOpen('s=1:d=2026-10-12'); await lcVisitOpen('s=1:d=2026-10-12'); await sleep(250);
  ok('three quick clicks: still only one box', n()===1, n());
  ok('a visit AxisCare didn\'t send back says so, with no change buttons', /didn.t send this visit/.test(txt()) && !document.querySelector('.vc-go') && /AxisCare answered with results, success/.test(txt()), txt());
  document.querySelector('.vc-x').click(); await sleep(50);
  ok('Close closes it', n()===0, n());
  /* an older Hub answer: a visit with no day or time */
  window.__get={ live:true, visit:{ visit_id:'s=1:d=2026-10-12', client:'', caregiver:null, caregiver_id:null, date:'', start:'', end:'' }, undo:[] };
  await lcVisitOpen('s=1:d=2026-10-12'); await sleep(250);
  ok('an empty visit is never offered for a change; it shows the calendar\'s own time and caregiver', /can.t be changed from the Hub/.test(txt()) && /8a.9a with Autumn R\./.test(txt()) && !document.querySelector('.vc-go') && !/nobody/.test(txt()), txt());
  document.dispatchEvent(new KeyboardEvent('keydown',{ key:'Escape' })); await sleep(50);
  ok('Escape closes it', n()===0, n());
  /* a real visit: the roster lands while the box is open */
  window.__get={ live:true, visit:{ visit_id:'s=1:d=2026-10-12', client:'April Davidson', caregiver:'Autumn R.', caregiver_id:'3', date:'2026-10-12', start:'08:00', end:'09:00' }, undo:[] };
  TB.pool=null; TB.loading=true;   // another screen is already loading the roster
  await lcVisitOpen('s=1:d=2026-10-12'); await sleep(200);
  ok('a real visit shows its time and caregiver with the change buttons', /8:00am.9:00am/.test(txt()) && /Autumn R\./.test(txt()) && !!document.querySelector('.vc-go'), txt());
  ok('while the roster is loading elsewhere it says so', /Loading the roster/.test(txt()), txt());
  TB.pool=[{ name:'Kim Aide', axiscare_id:'7', visits:[] }]; TB.loading=false; await sleep(900);
  ok('...and draws the roster when it lands (no more stuck "Loading the roster")', !/Loading the roster/.test(txt()) && /Kim Aide/.test(txt()), txt());
  const ov=document.querySelector('.vc-ov'); ov.dispatchEvent(new MouseEvent('click',{ bubbles:true })); await sleep(50);
  ok('a click outside the box closes it', n()===0, n());
  ok('nothing was changed', window.__changes.length===0, window.__changes);
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1300, 'height': 900})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(f'http://localhost:{PORT}/index.html?proof=visitbox'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', H)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

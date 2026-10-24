"""Reasons by AxisCare id (2026-10-24). The real Hub page, offline; AxisCare is faked. Proves: switch off = the Live
Schedule picks reasons exactly as before; on = defaults come from each reason's MEANING (a renamed reason keeps it): a new
caregiver = our change, a new day or time = "Client Added or Changed Visit" (id 10), taking someone off = the office must choose (call-off or our change);
Settings shows each reason and what Cara does (practice says what would change); owners can change a meaning (saved with
tkMerge); Cara's Today shows a quiet "Cancelled today" line only when the switch is on. (python3 tests/browser/visit_reasons_look.py)"""
import re, os, sys
from playwright.sync_api import sync_playwright
here = os.path.dirname(os.path.abspath(__file__))
lc = open(os.path.join(here, 'live_calendar_look.py')).read()
src = open('/Users/samantha/Claude/Projects/cc-hub-live/tests/browser/standup_look.py').read()
STUB = re.search(r'STUB = r"""(.*?)"""', src, re.S).group(1)
DATA = re.search(r'DATA = r"""(.*?)"""', lc, re.S).group(1)
EXTRA = r"""
(()=>{
  const MEAN={5:'swap',6:'call_off',8:'no_show',10:'moved',13:'office_fix'};
  const f0=window.fetch;
  window.fetch=async(u,o)=>{ const b=JSON.parse((o&&o.body)||'{}');
    if(/visit-change/.test(String(u)) && b.action==='reasons'){ window.__vc.push(b);
      return new Response(JSON.stringify({ live:window.__vcLive, reasons_live:window.__rl, reasons:[{id:5,name:'Office Changed Caregiver'},{id:6,name:'Caregiver Called Off'},{id:8,name:'Staffing Change - No Show'},{id:10,name:'Client Added or Changed Visit'},{id:13,name:'Office Entry Error'}].map(r=>Object.assign(r,{meaning:MEAN[r.id]})) }),{status:200}); }
    return f0(u,o); };
  window.__rl=false;
  window.__rep={ at:new Date().toISOString(), live:false, by_id:false, list_read:true, would:[{ visit:'s=1:d=x', client:'Dan P', when:'2026-10-25T08:00:00', reason:'Staffing Change - Caregiver Change', before:'opens a call-off case', by_id:'open-shift card, never a call-off' }], acted:[],
    cancelled_today:[{ client:'April', start:'16:00', by:'client' },{ client:'Steve', start:'18:00', by:'us' }], cancelled_day:new Date().toLocaleString('sv-SE',{timeZone:'America/Chicago'}).slice(0,10) };
  const from0=sb.from.bind(sb);
  sb.from=(t)=>{ if(t!=='app_data') return from0(t); const p={ select(){return p;}, eq(k,v){ p._v=v; return p; }, maybeSingle:async()=>({ data: p._v==='visit_reason_practice'?{ data:window.__rep }:null, error:null }) }; return p; };
  window.__merged=[]; window.tkMerge=async(fn,what)=>{ const m={}; const w=fn(m); window.__merged.push({ m, w, what }); DATA.ops_settings=Object.assign({}, DATA.ops_settings, m); return {}; }; (0,eval)('tkMerge=window.tkMerge');
  (0,eval)("CC_ROLES=['owner_admin']");
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  LS_STATE.date='2026-10-14'; LC.view='day'; switchTab('liveschedule'); await sleep(200); await lsLoad(true); await sleep(150);
  const open=async(k)=>{ document.querySelectorAll('.vc-ov').forEach(x=>x.remove()); await lcVisitOpen('2026-10-1409:00Ed Anderson'); await sleep(300); let P=document.querySelector('.vc-panel'); if(k){ P.querySelector('.vc-tab[data-k="'+k+'"]').click(); await sleep(60); P=document.querySelector('.vc-panel'); } return P; };
  const selText=P=>P.querySelector('.vc-r').selectedOptions[0].text;
  let P;
  if(!window.__rl){ /* switch OFF (its own page load): the old name match; a renamed "Office Changed Caregiver" no longer matches "caregiver change" */
    P=await open();
    ok('off: a renamed reason defeats the old name match (why the switch must be on before renaming)', selText(P)!=='Office Changed Caregiver', selText(P));
    return R; }
  /* switch ON */
  window.__vc=[];
  P=await open();
  ok('on: a new caregiver defaults to OUR change (by meaning, even renamed)', selText(P)==='Office Changed Caregiver', selText(P));
  P=await open('time');
  ok('on: a new day or time defaults to "Client Added or Changed Visit" (AxisCare id 10, found by its meaning, renamed or not)', selText(P)==='Client Added or Changed Visit' && P.querySelector('.vc-r').value==='10' && !/No reason/.test(P.querySelector('.vc-r').innerText), selText(P));
  P.querySelector('.vc-s').value='10:00'; P.querySelector('.vc-e').value='15:00'; P.querySelector('.vc-go').click(); await sleep(60);
  P.querySelector('.vc-confirm').click(); await sleep(250);
  ok('...and sends reason 10 for the move', window.__vc.find(x=>x.action==='change')?.reason_id===10, window.__vc);
  document.querySelector('.vc-panel .vc-done-btn')?.click(); window.__vc=[];
  P=await open('off');
  ok('on: taking someone off has NO default: the office must choose', P.querySelector('.vc-r').value==='' && /Choose why/.test(selText(P)));
  P.querySelector('.vc-go').click(); await sleep(60);
  ok('...review without choosing: asks "did they call off, or is it our change?", nothing sent', /Choose why first/.test(P.innerText) && !window.__vc.some(x=>x.action==='change'));
  P.querySelector('.vc-r').value='6'; P.querySelector('.vc-go').click(); await sleep(60); P.querySelector('.vc-confirm').click(); await sleep(250);
  ok('...choosing "Caregiver Called Off" sends reason 6', window.__vc.find(x=>x.action==='change')?.reason_id===6);
  document.querySelector('.vc-panel .vc-done-btn')?.click();
  /* Settings */
  DATA.ops_settings=Object.assign({}, DATA.ops_settings, { visit_reasons_live:false });
  let host=document.getElementById('vrHost'); VR.render(); await VR.load(true); await sleep(200); host=document.getElementById('vrHost');
  ok('Settings: every reason by id with what Cara does; practice says what reading by id would change', /What AxisCare reasons mean/.test(host.innerText) && /Practice\./.test(host.innerText) && /Caregiver Called Off/.test(host.innerText)
    && /Call-off case \(finds coverage\)/.test(host.innerText) && /Dan P/.test(host.innerText) && /open-shift card, never a call-off/.test(host.innerText) && /Canceled Shift/.test(host.innerText), host.innerText.slice(0,1500));
  VR.toggle(); await sleep(50); const sel=document.querySelector('#vrHost select[data-vr="13"]'); sel.value='records'; sel.dispatchEvent(new Event('change')); await sleep(100);
  ok('an owner changes a meaning: saved through tkMerge, recorded with the reason name', JSON.stringify(window.__merged[0]?.m)==='{"visit_reason_meanings":{"13":"records"}}' && /Office Entry Error/.test(window.__merged[0].w[0]) && /Saved/.test(document.getElementById('vrHost').innerText), window.__merged);
  /* Today line */
  ok('Today: no "Cancelled today" line while the switch is off', VR.todayLine()==='');
  DATA.ops_settings.visit_reasons_live=true;
  ok('Today: on, one quiet line names today\'s cancelled visits, and which we couldn\'t staff', /Cancelled today: April 4pm, Steve 6pm \(we couldn't staff\)/.test(VR.todayLine()), VR.todayLine());
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width':1300,'height':1000})
    sys.path.insert(0, here)
    from clock_pin import pin
    pin(pg)
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=vr'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', STUB); pg.evaluate('s=>(0,eval)(s)', DATA); pg.evaluate('s=>(0,eval)(s)', EXTRA)
    R = pg.evaluate(T)
    pg.goto('http://localhost:8765/index.html?proof=vr2'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', STUB); pg.evaluate('s=>(0,eval)(s)', DATA); pg.evaluate('s=>(0,eval)(s)', EXTRA); pg.evaluate('()=>{ window.__rl=true; }')
    R += pg.evaluate(T)
    if os.environ.get('SHOT'):
        pg.evaluate("async()=>{ DATA.ops_settings.visit_reasons_live=false; switchTab('settings'); }"); pg.wait_for_timeout(400)
        el = pg.query_selector('#vrHost')
        if el: el.screenshot(path=os.environ['SHOT'])
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

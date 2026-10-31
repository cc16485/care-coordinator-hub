"""Reasons by AxisCare id (2026-10-24). The real Hub page, offline; AxisCare is faked. Proves (the Live Schedule and its visit changes are gone, 2026-10-31):
Settings shows each reason and what Cara does (practice says what would change); owners can change a meaning (saved with
tkMerge); Cara's Today shows a quiet "Cancelled today" line only when the switch is on. (python3 tests/browser/visit_reasons_look.py)"""
import re, os, sys
from playwright.sync_api import sync_playwright
here = os.path.dirname(os.path.abspath(__file__))
src = open('/Users/samantha/Claude/Projects/cc-hub-live/tests/browser/standup_look.py').read()
STUB = re.search(r'STUB = r"""(.*?)"""', src, re.S).group(1)
DATA = r"""
(()=>{
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Land', shift:'day' };");
  window.__asks=[]; window.__oldServer=false;
  sb.auth.getSession=async()=>({ data:{ session:{ access_token:'t' } } });
  const ymdAdd=(ymd,n)=>{ const [y,m,d]=ymd.split('-').map(Number); return new Date(Date.UTC(y,m-1,d+n)).toISOString().slice(0,10); };
  const V=(date,time,end,client,cg,extra)=>Object.assign({ visit_id:date+time+client, date, time, end, client, client_id:client==='Ed Anderson'?'1':'2', caregiver:cg||null, caregiver_id:cg?'5':'', clock_in:null, clock_out:null }, extra||{});
  window.fetch=async(u,o)=>{ const b=JSON.parse((o&&o.body)||'{}'); window.__asks.push(b);
    if(/visit-change/.test(String(u))){ window.__vc.push(b);
      if(b.action==='reasons') return new Response(JSON.stringify({ live:window.__vcLive, reasons:[{id:5,name:'Staffing Change - Caregiver Change'},{id:6,name:'Staffing Change - Caregiver Call Off'},{id:8,name:'Staffing Change - No Show'},{id:10,name:'Schedule Change - Client Schedule Change'},{id:13,name:'Administrative Correction - Office Error'}] }),{status:200});
      if(b.action==='get'){ const st=window.__vcVisit; return new Response(JSON.stringify({ live:window.__vcLive, visit:st, undo:window.__vcUndo||[] }),{status:200}); }
      if(b.action==='change'){ if(window.__vcRefuse) return new Response(JSON.stringify({ outcome:'changed_meanwhile', error:'Someone changed this visit since you opened it. Look again. Nothing was changed.' }),{status:409});
        return new Response(JSON.stringify({ outcome:'changed', confirmed:true, change_id:b.change_id, words:'caregiver Kim Aide → Lia Listed', reason:'Staffing Change - Caregiver Change' }),{status:200}); }
      if(b.action==='undo') return new Response(JSON.stringify({ outcome:'changed', words:'caregiver Lia Listed → Kim Aide' }),{status:200});
    }
    if(!/coverage-shifts/.test(String(u)) || !b.live_schedule) return new Response('{"open":[],"total":0}',{status:200});
    const from=b.start||b.date, to=b.end||b.date, rows=[];
    for(let d=from; d<=to; d=ymdAdd(d,1)){ rows.push(V(d,'09:00','14:00','Ed Anderson',null)); rows.push(V(d,'16:00','21:00','Ed Anderson','Kim Aide')); if(d.endsWith('-15')) rows.push(V(d,'08:00','12:00','Ruth Barnes','Di Aide')); }
    const body=(window.__oldServer&&b.start)?{ date:'2026-10-06', total:2, unassigned:1, rows:rows.slice(0,2) }:{ date:from, start:b.start?from:undefined, end:b.start?to:undefined, total:rows.length, unassigned:rows.filter(r=>!r.caregiver).length, rows };
    if(!b.start){ delete body.start; delete body.end; }
    return new Response(JSON.stringify(body),{status:200}); };
  try{ localStorage.removeItem('cch_lsview'); }catch(e){}
  window.__vc=[]; window.__vcLive=true; window.__vcRefuse=false;
  window.__vcVisit={ visit_id:'2026-10-1409:00Ed Anderson', client:'Ed Anderson', client_id:'1', caregiver_id:'5', caregiver:'Kim Aide', date:'2026-10-14', start:'09:00', end:'14:00', started:false, verified:false };
  (0,eval)("TB.pool=[{ name:'Lia Listed', axiscare_id:'7', level:2, windows:null, visits:[] },{ name:'Bo Busy', axiscare_id:'8', level:2, windows:null, visits:[{ day:'2026-10-14', start:'08:00', end:'12:00', client:'Ruth Barnes' }] },{ name:'Kim Aide', axiscare_id:'5', level:2, windows:null, visits:[] }]; CC_ROLE_BY_EMAIL={ 'krystal@mo-care.com':['owner_admin'] };");
  DATA.ops_settings={ visit_change_live:true };
})();
"""
PORT = os.environ.get('PORT', '8765')
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
  /* 2026-10-31: the Live Schedule tab (and changing a visit from it) is gone; Settings and Today keep the reasons */
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
    pg.goto(f'http://localhost:{PORT}/index.html?proof=vr'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', STUB); pg.evaluate('s=>(0,eval)(s)', DATA); pg.evaluate('s=>(0,eval)(s)', EXTRA)
    R = pg.evaluate(T)
    if os.environ.get('SHOT'):
        pg.evaluate("async()=>{ DATA.ops_settings.visit_reasons_live=false; switchTab('settings'); }"); pg.wait_for_timeout(400)
        el = pg.query_selector('#vrHost')
        if el: el.screenshot(path=os.environ['SHOT'])
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

"""2026-10-17 · the EVV tab is gone; a visit missing a clock-in or clock-out is a "Call <client> to confirm <caregiver>'s
times" card that answers in place (confirm-times.js). The real page, offline, made-up people only; saves are recorded,
never sent, and nobody is texted, emailed or called.
(HUB_PORT=<port> python3 tests/browser/confirm_times_look.py, with the static server on that port; 8765 by default)"""
from playwright.sync_api import sync_playwright
import os, sys
PORT = os.environ.get('HUB_PORT', '8765')
SHOT = os.environ.get('SHOT', '')

STUB = r"""
(()=>{
  const W=window, H=h=>new Date(Date.now()+h*36e5).toISOString(), K='krystal@mo-care.com', S='samantha@mo-care.com';
  W.__log={ writes:[], fn:[], toasts:[] };
  const clone=x=>JSON.parse(JSON.stringify(x));
  const q=()=>{ const p=new Proxy(function(){}, { get(_,k){ if(k==='then') return (a,b)=>Promise.resolve({data:[],error:null}).then(a,b);
      if(k==='maybeSingle'||k==='single') return ()=>Promise.resolve({ data:null, error:null }); return ()=>p; } }); return p; };
  W.__q=q;
  (0,eval)(`sb={ from:()=>window.__q(), rpc:()=>Promise.resolve({data:null,error:null}),
    auth:{ getSession:async()=>({data:{session:null}}), getUser:async()=>({data:{user:null}}) },
    functions:{ invoke:async(n)=>{ window.__log.fn.push(n); return {data:null,error:null}; } }, storage:{ from:()=>({}) } };
    ME={ email:'${K}', name:'Krystal Land', shift:'day' };
    OPS_PEOPLE=[{ person_id:'p_k', full_name:'Krystal Land', primary_email:'${K}' },{ person_id:'p_s', full_name:'Samantha Troutman', primary_email:'${S}' }];
    OPS_DOMAINS=[{ code:'scheduling_coverage', label:'Scheduling and coverage', owner_person:'p_k', escalation_person:'p_s' }];`);
  W.persist=async(k,v)=>{ W.__log.writes.push(k+':'+v.id); };
  W.ccToast=m=>W.__log.toasts.push(m);
  DATA.ops_items=[
    { id:'ops_cft_9401', kind:'confirm_times', status:'open', domain:'scheduling_coverage', urgency:'today', owner:K, due:H(3), created_at:H(-1), opened_by:'confirm_times', source:'timekeeper-watch (missed clock-out)',
      title:"Call Ruth to confirm Maria's departure time (Tuesday, Oct 6, 9 AM to 1 PM)", about:'Maria Lopez (fake)', caregiver:'Maria Lopez (fake)', client_first:'Ruth', client_axiscare_id:'701',
      visit_id:'9401', shift_date:'2026-10-06', shift_time:'09:00', shift_end:'13:00', clock_in:'09:04', missing:'out',
      detail:"Maria Lopez (fake)'s visit with Ruth on Tuesday, Oct 6 (scheduled 9 AM to 1 PM) is missing its clock-out. AxisCare shows a clock-in at 9:04 AM and no clock-out. Call Ruth (or the family member who handles the care) and ask what time Maria got there and what time Maria left. Let them tell you the times." } ];
})();
"""

T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, item=id=>DATA.ops_items.find(x=>x.id===id), card=id=>document.querySelector('.wkcard[data-id="'+id+'"]');
  document.getElementById('appScreen').classList.add('on');
  ok('the menu has no EVV tab', !document.querySelector('[data-tab="evv"]') && !document.getElementById('tab-evv'));
  switchTab('evv'); await sleep(80);
  ok('an old EVV link opens Needs Attention', document.getElementById('tab-ops').classList.contains('active') || activeTab==='ops', typeof activeTab!=='undefined'?activeTab:'');
  switchTab('mywork'); myWorkGo('today'); await sleep(200);
  const c=card('ops_cft_9401');
  ok('the card is on my list with its label', !!c && opsKindLabel({kind:'confirm_times'})==='Confirm times with the client', c&&c.innerText.slice(0,200));
  ok('...Call Ruth, Record the call, No answer', /Call Ruth/.test(c.innerText) && /Record the call/.test(c.innerText) && /No answer/.test(c.innerText) && !!c.querySelector('[data-oc-client="701"]'), c.innerText);
  [...c.querySelectorAll('button')].find(b=>b.textContent==='Record the call').click(); await sleep(120);
  ok('Record the call opens the box: who, how related, what they said, the departure time only', !!document.getElementById('cftWith') && !!document.getElementById('cftRel') && !!document.getElementById('cftDep') && !document.getElementById('cftArr'));
  document.getElementById('cftWith').value='Ruth Adams (fake)'; document.getElementById('cftRel').value='client';
  document.querySelector('input[name="cftOut"][value="confirmed"]').click(); ccCftSync();
  document.getElementById('cftDep').value='13:05';
  await ccCftSave('ops_cft_9401'); await sleep(200);
  ok('saved on the card, the card stays open', item('ops_cft_9401').confirm?.departure==='13:05' && item('ops_cft_9401').status==='open' && L.writes.includes('ops_items:ops_cft_9401'), item('ops_cft_9401'));
  myWorkGo('today'); await sleep(150);
  const c2=card('ops_cft_9401');
  ok('the card now says what Ruth said and offers Fixed in AxisCare', /confirmed Maria left 1:05 PM/.test(c2.innerText) && /Fixed in AxisCare/.test(c2.innerText), c2.innerText);
  [...c2.querySelectorAll('button')].find(b=>/Fixed in AxisCare/.test(b.textContent)).click(); await sleep(200);
  ok('Fixed in AxisCare closes it', item('ops_cft_9401').status==='done' && /Fixed in AxisCare/.test(item('ops_cft_9401').close_note), item('ops_cft_9401'));
  switchTab('settings'); await sleep(150);
  ok('Settings, Missed clock-outs: the call-the-client minutes box, and no form link in the standard wording', !!document.getElementById('set_cft_after') && !/evv-correction-form/.test(document.getElementById('set_tko_msg').getAttribute('placeholder')));
  ok('nothing was texted, emailed or called', L.fn.length===0, L.fn);
  return R;
}
"""

R = []
with sync_playwright() as pw:
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from clock_pin import pin
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1360, 'height': 900})
    pin(pg)
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://127.0.0.1:' + PORT + '/index.html?proof=cft'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    if SHOT:
        pg.evaluate("()=>{ document.getElementById('appScreen').classList.add('on'); switchTab('mywork'); myWorkGo('today'); }"); pg.wait_for_timeout(300)
        el = pg.query_selector('.wkcard[data-id="ops_cft_9401"]')
        if el: el.screenshot(path=SHOT)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

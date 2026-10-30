"""Couple care and short visits on Schedule and level (2026-10-30, Samantha: "1.5x if its for a couple who both need personal
care, $5 additional per hour for shorter than 4 hour shift"; her answer: a flat $5 an hour on any approved visit under 4 hours).
Proves: one client shows the plain rate; a couple who both need hands-on care shows 1.5 x the rate; a day under 4 hours shows
$5 more an hour and says the office approves it first; the week line says so instead of a hard warning; the agreement card
carries the couple and short-visit rates; the care plan facts say it is a couple; owners change 1.5 and $5 in Settings.
(python3 tests/browser/visit_price_look.py)"""
import os, sys, json, pathlib, threading, http.server, functools
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = os.environ.get('SHOTS')
PLACES = {'generated': '2026-10-15', 'items': [
    {'id': 'o1', 'name': 'Northview Center (fake)', 'category': 'senior-center', 'town': 'Springfield', 'what': 'Lunch, cards and bingo.', 'access': 'Ramp at the front.', 'cost': 'Free', 'minutes': 10},
    {'id': 'o2', 'name': 'Nixa Park Trail (fake)', 'category': 'park-garden', 'town': 'Nixa', 'what': 'A short paved loop with benches.', 'access': 'Flat and paved.', 'cost': 'Free', 'minutes': 20},
    {'id': 'o3', 'name': 'Springfield Garden (fake)', 'category': 'park-garden', 'town': 'Springfield', 'what': 'A slow walk through the garden.', 'access': 'Paved paths.', 'cost': '$5', 'minutes': 12}]}
STUB = r"""
(()=>{
  const W=window; W.__log={ persists:[], merges:[], calls:[] };
  (0,eval)(`sb={ from:()=>{ const p={ select(){return p;}, eq(){return p;}, gte(){return p;}, in(){return p;}, order(){return p;}, limit(){return p;}, is(){return p;},
      single:async()=>({ data:null, error:null }), maybeSingle:async()=>({ data:null, error:null }),
      then(a){ return Promise.resolve({data:[],error:null}).then(a); } }; return p; },
    storage:{ from:()=>({ upload:async()=>({ error:null }) }) }, rpc:async()=>({data:null,error:null}), functions:{ invoke:async()=>({data:null,error:null}) },
    auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };
    ME={ email:'samantha@mo-care.com', name:'Samantha' }; CC_ROLES=['owner_admin']; CC_ROLES_CHECKED=true; CC_ROLE_BY_EMAIL['samantha@mo-care.com']=['owner_admin'];
    persist=async(k,v)=>{ window.__log.persists.push([k, JSON.parse(JSON.stringify(v))]); };
    tkMerge=async(fn,label)=>{ const m=JSON.parse(JSON.stringify(DATA.ops_settings||{})); const said=fn(m); DATA.ops_settings=m; window.__log.merges.push([label,said]); return {}; };
    callAction=async(n,b)=>{ window.__log.calls.push([n,b]); return { status:200, data:{ ok:true, agreements:window.__agList||[] } }; };
    ckFind=async()=>({ clients:[], note:'' });
    ccvCall=async(b)=>{ window.__log.calls.push(['client-convert',b]); return window.__ccv(b); };
    ccConfirm=async()=>true; ccToast=(m)=>{ window.__log.toast=m; };`);
  DATA.ops_settings={ visit_rates:{ wellness:30, personal:32, advanced:34 } };
  DATA.care_assessments=[]; DATA.care_plans=[];
  DATA.leads=[{ id:'lead_betty', first_name:'Karen', last_name:'Price (fake)', relationship:'Daughter', phone:'(417) 555-0172',
    client_first_name:'Betty', client_last_name:'Harlow (fake)', client_address:'1418 E Cherry St', client_city:'Springfield', client_state:'MO', client_zip:'65802',
    client_phone:'(417) 555-0148', funding_source:'private', status:'Contacted' }];
  DATA.client_profiles=[];
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,900)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const q=s=>document.querySelector('#hvRoot '+s);
  const type=async(path,val)=>{ const el=q('[data-hv="'+path+'"]'); el.value=val; el.dispatchEvent(new Event('input',{bubbles:true})); };
  const tap=(path,v)=>q('[data-hvp="'+path+'"][data-v="'+v+'"]').click();
  await HV.open({ leadId:'lead_betty' }); await sleep(200);
  const a=DATA.care_assessments[0], v=a.visit, price=()=>document.getElementById('hvPrice').innerText.replace(/\s+/g,' ');
  q('[data-hvs="8"]').click(); await sleep(60);
  ok('before a level: asks to pick one', /Pick a care level/.test(price()));
  q('[data-hva="level"][data-v="personal"]').click(); await sleep(40);
  ok('one client: the plain rate', /Hourly rate \$32 an hour/.test(price()) && !/Couple/.test(price()), price());
  ok('the couple question and the agreement\'s rule are on the screen', /Who is getting care\?/.test(q('.hv-sec[data-sec="8"]').innerText) && /1.5 × the rate/.test(q('.hv-sec[data-sec="8"]').innerText) && /sharing only household help pays the regular rate/.test(q('.hv-sec[data-sec="8"]').innerText));
  tap('visit.couple','both'); await sleep(40);
  ok('a couple who both need hands-on care: 1.5 × $32 = $48 an hour', v.couple==='both' && /Couple care rate \(1.5 × \$32\) \$48 an hour/.test(price()), price());
  await type('visit.week.mon.from','09:00'); await type('visit.week.mon.to','13:00'); await type('visit.week.wed.from','09:00'); await type('visit.week.wed.to','12:00'); await sleep(40);
  ok('a 3-hour Wednesday: $5 more an hour on top ($53), the office approves it first', /Wed, 3 hours \(under 4\): \+\$5 an hour \$53 an hour/.test(price()) && /only when the office approves it/.test(price()) && !/Mon,/.test(price()), price());
  const wk=document.getElementById('hvWeekSum').innerText;
  ok('the week line says what a short visit costs, not just "below the minimum"', /A visit under 4 hours: \$5 more an hour, with the office's OK/.test(wk) && !/Below the 4 hours a visit/.test(wk), wk);
  tap('visit.couple','no'); await sleep(40);
  ok('one client with a short day: $37 an hour that day', /Hourly rate \$32 an hour/.test(price()) && /\$37 an hour/.test(price()), price());
  tap('visit.couple','both'); await sleep(40);
  q('[data-hvs="10"]').click(); await sleep(60);
  const ag=document.getElementById('hvAgree').innerText.replace(/\s+/g,' ');
  ok('the agreement card carries the couple rate and the short visits', /Couple care rate \$48 an hour \(1.5 × the rate\)/.test(ag) && /Short visits \(Wed\) \$53 an hour, with the office's OK/.test(ag), ag);
  ok('the care plan facts say it is a couple', HV.factsFor(a).some(f=>f.path==='visit.couple' && f.value==='Yes'));
  await HV.close(); await sleep(50);
  HV.settingsFill(); document.getElementById('hvSet_couple').value='1.6'; document.getElementById('hvSet_short').value='6'; await HV.settingsSave(); await sleep(20);
  ok('Settings: owners change the couple rate and the short-visit amount', DATA.ops_settings.visit_extras.couple_x===1.6 && DATA.ops_settings.visit_extras.short_fee===6, DATA.ops_settings.visit_extras);
  await HV.open({ leadId:'lead_betty' }); await sleep(150); q('[data-hvs="8"]').click(); await sleep(60);
  ok('and the visit uses them: 1.6 × $32 = $51.20, short day $57.20', /\$51.20 an hour/.test(price()) && /\$57.20 an hour/.test(price()), price());
  const txt=document.getElementById('hvRoot').innerText;
  ok('no em dashes on the screens', !/—/.test(txt));
  return R;
}
"""
MIME = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.json':'application/json', '.webmanifest':'application/json', '.webp':'image/webp', '.jpg':'image/jpeg'}
def serve(route):
    url = route.request.url
    if url.startswith('https://mo-care.com/assets/outings.json'):
        return route.fulfill(status=200, body=json.dumps(PLACES), content_type='application/json', headers={'access-control-allow-origin': '*'})
    if 'supabase.co' in url: return route.abort()
    if not url.startswith('http://hv.local/'): return route.continue_()
    p = (ROOT / url.split('http://hv.local/', 1)[1].split('?')[0].split('#')[0])
    if not p.is_file(): return route.fulfill(status=404, body='')
    route.fulfill(status=200, body=p.read_bytes(), content_type=MIME.get(p.suffix, 'application/octet-stream'))
def overflow(pg):
    return pg.evaluate("()=>{ const r=document.getElementById('hvRoot'); if(!r) return 'no visit'; const w=r.clientWidth; return [...r.querySelectorAll('*')].filter(e=>{ const b=e.getBoundingClientRect(); return b.width>0 && b.right>w+1 && !e.closest('.hv-rail'); }).slice(0,4).map(e=>e.className+' '+Math.round(e.getBoundingClientRect().right)); }")


with sync_playwright() as pw:
    b = pw.chromium.launch(); cx = b.new_context(viewport={'width': 1180, 'height': 820}, timezone_id='America/Chicago', has_touch=True); pg = cx.new_page()
    pg.route('**/*', serve)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://hv.local/index.html?proof=hv'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T)
    for wd, ht in [(820, 1180), (390, 844)]:
        pg.set_viewport_size({'width': wd, 'height': ht}); pg.wait_for_timeout(150)
        o = overflow(pg); R.append(['PASS' if not o else 'FAIL', f'{wd} wide, Schedule and level: nothing runs off the side', o])
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

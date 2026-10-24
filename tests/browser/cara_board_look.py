"""Cara's response board (2026-10-24). The real Hub page, offline (files served from this folder), made-up cases; the coverage
server is a stand-in that records what it was asked. Proves: switch off = today's confirm block; on (or an owner's preview) =
five boxes (full, part or different hours, question, no, Needs Verification) plus who hasn't answered; a click shows the exact
answer, when, eligibility and why; Confirm only for an eligible full-shift yes and through covResolve; Needs Verification has
no Confirm; the time rules are two separate settings saved through the server; nothing else is saved or sent.
(python3 tests/browser/cara_board_look.py; SHOT=<file> saves a screenshot)"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOT = os.environ.get('SHOT')
STUB = r"""
(()=>{
  const W=window, iso=(min)=>new Date(Date.now()+min*60000).toISOString();
  const chi=(min)=>{ const t=new Date(Date.now()+min*60000).toLocaleString('sv-SE',{timeZone:'America/Chicago'}); return [t.slice(0,10), t.slice(11,16)]; };
  W.__log={ calls:[], resolved:[], writes:[], alerts:[] };
  (0,eval)(`sb={ from:()=>{ const p={ select(){return p;}, eq(){return p;}, gte(){return p;}, in(){return p;}, order(){return p;}, limit(){return p;},
      single:async()=>({ data:null, error:null }), maybeSingle:async()=>({ data:null, error:null }),
      then(a){ return Promise.resolve({data:[],error:null}).then(a); } }; return p; },
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async()=>({data:null,error:null}) },
    auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };
    ME={ email:'samantha@mo-care.com', name:'Samantha Troutman' }; CC_ROLES=['owner_admin']; CC_ROLES_CHECKED=true; CC_ROLE_BY_EMAIL={ 'samantha@mo-care.com':['owner_admin'] };`);
  W.persist=async(k,v)=>{ W.__log.writes.push(k+':'+v.id); };
  W.opEvent=()=>{}; W.alert=m=>W.__log.alerts.push(m); W.ccConfirm=async()=>true; W.ccToast=()=>{};
  (0,eval)("covResolve=async(id,how,name)=>{ window.__log.resolved.push([id,how,name]); }");
  const P=(o)=>Object.assign({ eligibility:{ ok:true, why:'Can be offered and confirmed' }, reasons:[], concerns:[], score:0, channel:'text', asked_at:iso(-60) }, o);
  W.__board={ note:'A yes is interest only. Nothing is assigned until you confirm and AxisCare shows them on the visit.', time_flex:'exact', handoff_ok:false, people:[
    P({ ask_id:'a1', name:'Maria Lane (fake)', column:'full', said:'full', reply:'Yes I can do Saturday!', replied_at:iso(-50), recommended:true, why:'Cara recommends them for this shift', reasons:['6 visits with this client','the shift is inside their availability'], can_confirm:true }),
    P({ ask_id:'a2', name:'Dee Hours (fake)', column:'full', said:'full', reply:'yes', replied_at:iso(-40), why:'Another yes ranks higher', concerns:['Overtime risk: 38h already this week + 9h = 47h'], can_confirm:true }),
    P({ ask_id:'a3', name:'Jess Part (fake)', column:'partial', said:'partial', channel:'shift page', answer_kind:'part', offer_from:'08:00', offer_to:'13:00', note:'school pickup at 2', replied_at:iso(-30), why:'Not recommended alone: they can cover only part of the shift', can_confirm:false }),
    P({ ask_id:'a4', name:'Heather Ask (fake)', column:'question', said:'question', reply:'Are there stairs?', replied_at:iso(-20), why:'Waiting on an answer to their question', can_confirm:false }),
    P({ ask_id:'a5', name:'Taylor No (fake)', column:'no', said:'no', reply:'sorry cant', replied_at:iso(-25), why:'Said no', can_confirm:false }),
    P({ ask_id:'a6', name:'Hal Lapsed (fake)', column:'nv', said:'full', reply:'yes', replied_at:iso(-35), eligibility:{ ok:false, why:'Needs Verification: OIG check over 30 days' }, why:'Not recommended: Needs Verification: OIG check over 30 days', can_confirm:false }),
    P({ ask_id:'a7', name:'Wendy Wait (fake)', column:'waiting', said:'waiting', why:'Has not answered yet', can_confirm:false }) ] };
  const realFetch=W.fetch;
  W.fetch=async(url,o)=>{ url=String(url);
    if(url.includes('/functions/v1/coverage-run')){ const b=JSON.parse(o.body); W.__log.calls.push(b);
      if(b.action==='board') return new Response(JSON.stringify(W.__board),{status:200});
      if(b.action==='set_time_rules') return new Response(JSON.stringify({ ok:true, time_flex:b.time_flex, flex_minutes:b.time_flex==='flexible_start'?b.flex_minutes:null, handoff_ok:b.handoff_ok }),{status:200});
      return new Response(JSON.stringify({ group0:[],group1:[],group2:[],prn_other:[],prn_ongoing:[],excluded:[],meta:{} }),{status:200}); }
    return realFetch(url,o); };
  const [d,t]=chi(300), [,e]=chi(840);
  const A=(id,name,state,extra)=>Object.assign({ id, name, state, at:iso(-60) }, extra||{});
  DATA.ops_settings={};
  DATA.coverage_cases=[{ id:'b1', status:'open', reason:'call_off', client:'Ruth Kay (fake)', shift_date:d, shift_time:t+'-'+e, opened_at:iso(-90), admin_alerted:iso(-89),
    asked:[A('a1','Maria Lane (fake)','yes',{replied_at:iso(-50), reply:'Yes I can do Saturday!'}), A('a2','Dee Hours (fake)','yes',{replied_at:iso(-40)}), A('a3','Jess Part (fake)','yes',{answer_kind:'part'}),
           A('a4','Heather Ask (fake)','inquiry'), A('a5','Taylor No (fake)','no'), A('a6','Hal Lapsed (fake)','yes'), A('a7','Wendy Wait (fake)','waiting')] }];
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,800)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, tab=()=>document.getElementById('tab-coverage').innerText;
  try{ localStorage.removeItem('cara_p1_preview'); }catch(e){}
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  switchTab('coverage'); caraShowCase('b1'); await sleep(500);
  ok('switch off: today\'s confirm block, no board, the board server not asked', !/Who answered/.test(tab()) && /can cover/i.test(tab()) && !L.calls.some(c=>c.action==='board'), tab().slice(0,600));
  DATA.ops_settings={ cara_board_live:true }; renderCoverage(); await sleep(700);
  const t=tab();
  ok('switch on: the board replaces the confirm block (one place to pick); the banner points to it', /Who answered/.test(t) && !/can cover: pick the best fit/i.test(t) && /Answers are sorted below\. Only a full-shift yes from someone eligible can be confirmed\./.test(t), t.slice(0,800));
  ok('five boxes with their counts: full 2, part or different hours 1, question 1, no 1, Needs Verification 1', /Yes, full shift \(2\)/.test(t) && /Part or different hours \(1\)/.test(t) && /Question \(1\)/.test(t) && /No \(1\)/.test(t) && /Needs Verification \(1\)/.test(t), t.slice(0,1200));
  ok('who hasn\'t answered is listed apart', /Not answered yet: Wendy Wait \(fake\)/.test(t));
  ok('the chips say Cara\'s pick, overtime risk, and the partial hours', /Cara's pick/.test(t) && /overtime risk/.test(t) && /8am to 1pm/.test(t));
  CB.pick('b1','a1'); await sleep(200); let dr=tab();
  ok('each person has a Preview of their shift page (office only, opens in a new tab)', [...document.querySelectorAll('#tab-coverage a')].some(x=>/shift\.html\?preview=1&case=b1&ask=a1/.test(x.getAttribute('href')||'')&&x.target==='_blank'));
  ok('a click shows the exact answer, when and how, eligibility, and why Cara picks them', /“Yes I can do Saturday!”/.test(dr) && /✓ Eligible/.test(dr) && /Cara recommends them for this shift/.test(dr) && /6 visits with this client/.test(dr) && /text · /.test(dr), dr.slice(0,1500));
  [...document.querySelectorAll('#tab-coverage button')].find(b=>/^Confirm Maria/.test(b.textContent)).click(); await sleep(150);
  ok('Confirm uses covResolve (the one confirm path) for that person', JSON.stringify(L.resolved)==='[["b1","covered","Maria Lane (fake)"]]', L.resolved);
  CB.pick('b1','a2'); await sleep(200); dr=tab();
  ok('another full yes: why not (another ranks higher) and the overtime concern; Confirm still possible', /Another yes ranks higher/.test(dr) && /Overtime risk: 38h/.test(dr) && [...document.querySelectorAll('#tab-coverage button')].some(b=>/^Confirm Dee/.test(b.textContent)));
  CB.pick('b1','a3'); await sleep(200); dr=tab();
  ok('part of the shift: their hours and note from the shift page; no Confirm; hand-off not allowed said plainly', /Can work part of it: 8am to 1pm/.test(dr) && /school pickup at 2/.test(dr) && /Hand-off isn't allowed for this shift/.test(dr) && ![...document.querySelectorAll('#tab-coverage button')].some(b=>/^Confirm Jess/.test(b.textContent)), dr.slice(0,1500));
  CB.pick('b1','a6'); await sleep(200); dr=tab();
  ok('Needs Verification: not eligible with the reason; no Confirm; says it can\'t be offered or confirmed', /✕ Not eligible/.test(dr) && /OIG check over 30 days/.test(dr) && /Can't be offered or confirmed until the record is verified/.test(dr) && ![...document.querySelectorAll('#tab-coverage button')].some(b=>/^Confirm Hal/.test(b.textContent)), dr.slice(0,1500));
  CB.pick('b1','a4'); await sleep(200);
  ok('a question shows their exact words', /“Are there stairs\?”/.test(tab()));
  L.calls=[]; const sel=document.getElementById('cbtf_b1'); sel.value='flexible_start'; sel.dispatchEvent(new Event('change')); await sleep(400);
  ok('time rules: flexible start saved through the server, hand-off stays a separate setting (still off)', L.calls.some(c=>c.action==='set_time_rules'&&c.time_flex==='flexible_start'&&c.handoff_ok===false) && DATA.coverage_cases[0].time_flex==='flexible_start', L.calls);
  L.calls=[]; const ho=document.getElementById('cbho_b1'); ho.checked=true; ho.dispatchEvent(new Event('change')); await sleep(400);
  ok('time rules: hand-off allowed saved on its own', L.calls.some(c=>c.action==='set_time_rules'&&c.handoff_ok===true), L.calls);
  try{ localStorage.setItem('cara_p1_preview','1'); }catch(e){} DATA.ops_settings={ cara_today_live:true }; covSubGo('today'); await sleep(700);
  const td=document.getElementById('caraCC').innerText;
  ok('owner preview: the board shows on Today\'s Waiting for your OK too', /Waiting for your OK/.test(td) && /Who answered/.test(td), td.slice(0,800));
  try{ localStorage.removeItem('cara_p1_preview'); }catch(e){}
  ok('nothing saved from the page itself; nothing texted', !L.writes.length && !L.calls.some(c=>c.action==='send_selected'), [L.writes, L.calls.map(c=>c.action)]);
  return R;
}
"""
MIME = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.json':'application/json', '.webmanifest':'application/json'}
def serve(route):
    url = route.request.url
    if 'supabase.co' in url: return route.abort()
    if not url.startswith('http://caraboard.local/'): return route.continue_()
    p = (ROOT / url.split('http://caraboard.local/', 1)[1].split('?')[0].split('#')[0])
    if not p.is_file(): return route.fulfill(status=404, body='')
    route.fulfill(status=200, body=p.read_bytes(), content_type=MIME.get(p.suffix, 'application/octet-stream'))
with sync_playwright() as pw:
    b = pw.chromium.launch(); cx = b.new_context(viewport={'width': 1280, 'height': 900}, timezone_id='America/Chicago'); pg = cx.new_page()
    pg.route('**/*', serve)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    if os.environ.get('DEBUG'): pg.on('console', lambda m: print('console:', m.text[:200], flush=True))
    pg.goto('http://caraboard.local/index.html?proof=caraboard'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    if SHOT:   # the board on a case, Maria's answer open (taken after the checks: the sync API can't shoot mid-evaluate)
        pg.evaluate("()=>{ DATA.ops_settings={ cara_board_live:true }; switchTab('coverage'); caraShowCase('b1'); }"); pg.wait_for_timeout(900)
        pg.evaluate("()=>{ CB.pick('b1','a1'); }"); pg.wait_for_timeout(400)
        el = pg.query_selector('#tab-coverage'); (el or pg).screenshot(path=SHOT)
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

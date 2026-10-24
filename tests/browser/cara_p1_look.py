"""Cara Phase 1 in the Hub (2026-10-23). The real Hub page, offline (files served from this folder), made-up cases only;
the coverage server is a stand-in that records what was asked of it; nothing is texted, assigned or saved.
Proves: switch off = today's page (an owner sees a Preview link); the new Today answers the five questions; Cara recommends
one yes with reasons and Confirm uses the existing confirm path; "Send Cara's list" sends only Cara's default picks after the
office confirms; the picker shows the new flags and leaves overtime / overlapping people unticked; a texted call-off with
its AxisCare shift attached confirms without asking for the client, and several shifts ask which one.
(python3 tests/browser/cara_p1_look.py; SHOT=<file> saves a screenshot of the new Today)"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOT = os.environ.get('SHOT')
STUB = r"""
(()=>{
  const W=window, iso=(min)=>new Date(Date.now()+min*60000).toISOString();
  const chi=(min)=>{ const t=new Date(Date.now()+min*60000).toLocaleString('sv-SE',{timeZone:'America/Chicago'}); return [t.slice(0,10), t.slice(11,16)]; };
  W.__log={ calls:[], resolved:[], writes:[], alerts:[], prompts:[] };
  (0,eval)(`sb={ from:()=>{ const p={ select(){return p;}, eq(){return p;}, gte(){return p;}, in(){return p;}, order(){return p;}, limit(){return p;},
      single:async()=>({ data:null, error:null }), maybeSingle:async()=>({ data:null, error:null }),
      then(a){ return Promise.resolve({data:[],error:null}).then(a); } }; return p; },
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async()=>({data:null,error:null}) },
    auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };
    ME={ email:'samantha@mo-care.com', name:'Samantha Troutman' }; CC_ROLES=['owner_admin']; CC_ROLES_CHECKED=true; CC_ROLE_BY_EMAIL={ 'samantha@mo-care.com':['owner_admin'] };`);
  W.persist=async(k,v)=>{ W.__log.writes.push(k+':'+v.id); };
  /* the response board (cara-board.js) has its own test; here Today's Waiting for your OK shows the Cara recommends card */
  if(W.CB) W.CB.on=()=>false;
  W.opEvent=()=>{}; W.alert=m=>W.__log.alerts.push(m); W.ccConfirm=async()=>true; W.ccPrompt=async(q)=>{ W.__log.prompts.push(q); return '2'; };
  (0,eval)("covResolve=async(id,how,name)=>{ window.__log.resolved.push([id,how,name]); }");
  const realFetch=W.fetch;
  W.fetch=async(url,o)=>{ url=String(url);
    if(url.includes('/functions/v1/coverage-run')){ const b=JSON.parse(o.body); W.__log.calls.push(b);
      if(b.action==='recommend') return new Response(JSON.stringify({ pick:{ name:'Amy Fit (fake)', score:40, reasons:['the shift is inside their availability','4 visits with this client'], concerns:[] },
        others:[{ name:'Dee Hours (fake)', concerns:['Overtime risk: 38h already this week + 4h = 42h'] }], not_eligible:[{ name:'Eve Skills (fake)', why:'Skills rules: Dementia training not complete' }],
        note:'A yes is interest only. Nothing is assigned until you confirm and AxisCare shows them on the visit.' }),{status:200});
      if(b.action==='send_selected') return new Response(JSON.stringify({ sent:b.recipients, failed:[] }),{status:200});
      if(b.action==='candidates_v2') return new Response(JSON.stringify({ group0:[], group1:[{ name:'Amy Fit (fake)', why:'4 visits', avail_state:'fits' }], group2:[{ name:'Ben Unknown (fake)', why:'active', avail_state:'unknown', avail_unknown:'Availability unknown: nothing on file' }],
        excluded:[{ name:'Eve Skills (fake)', why:'Skills rules: Dementia training not complete' }], meta:{ cara_list:{ on:true, skills:'checked with match-rules 1.3.0', hours:'weekly hours counted' } } }),{status:200});
      return new Response(JSON.stringify(W.__cands),{status:200}); }
    return realFetch(url,o); };
  const [dC,tC]=chi(120), [,eC]=chi(360), [dT,tT]=chi(26*60), [,eT]=chi(30*60), [dY,tY]=chi(10*60), [,eY]=chi(14*60);
  W.__cands={ group0:[], prn_other:[], prn_ongoing:[], excluded:[], meta:{ census:'5 active' },
    group1:[{ name:'Amy Fit (fake)', axiscare_id:'1', why:'4 visits with this client', avail_state:'fits' },
            { name:'Dee Hours (fake)', axiscare_id:'4', why:'2 visits', hours:{ level:'ot', text:'Overtime risk: 38h already this week + 4h = 42h' } }],
    group2:[{ name:'Ben Unknown (fake)', axiscare_id:'2', why:'active caregiver', avail_unknown:'Availability unknown: nothing on file', avail_state:'unknown' },
            { name:'Fran Overlap (fake)', axiscare_id:'6', why:'active caregiver', overlaps:['Said yes to another open shift then: Ida 08:00-10:00'] },
            { name:'Gus Busy (fake)', axiscare_id:'7', why:'active caregiver', working_then:{ detail:'2pm-6pm with Joe' } },
            ],
    needs_verification:[{ name:'Hal Lapsed (fake)', axiscare_id:'8', why:'active caregiver', history:{ visits:3 }, needs_verification:'Needs Verification: OIG check over 30 days' }] };
  DATA.ops_settings={};
  DATA.coverage_cases=[
    { id:'crit', status:'open', reason:'call_off', client:'Critical Client (fake)', shift_date:dC, shift_time:tC+'-'+eC, asked:[], opened_at:iso(-30), admin_alerted:iso(-29), prebuilt:W.__cands, prebuilt_at:iso(-5) },
    { id:'yes1', status:'open', reason:'call_off', client:'Yes Client (fake)', shift_date:dY, shift_time:tY+'-'+eY, opened_at:iso(-90),
      asked:[{ id:'a1', name:'Amy Fit (fake)', state:'yes', at:iso(-80), replied_at:iso(-20), reply:'yes' },
             { id:'a2', name:'Dee Hours (fake)', state:'yes', at:iso(-80), replied_at:iso(-10), reply:'yes but only till 3', condition:'until 3pm' },
             { id:'a3', name:'Gus Busy (fake)', state:'no', at:iso(-80), replied_at:iso(-15), reply:'no sorry' }] },
    { id:'work', status:'open', reason:'call_off', client:'Waiting Client (fake)', shift_date:dT, shift_time:tT+'-'+eT, opened_at:iso(-15), asked:[{ id:'w1', name:'Ben Unknown (fake)', state:'waiting', at:iso(-10) }] },
    { id:'done', status:'open', reason:'call_off', client:'Covered Client (fake)', shift_date:dT, shift_time:tT+'-'+eT, opened_at:iso(-15), covered_by:'Amy Fit (fake)', asked:[] },
    { id:'flag1', status:'flagged', kind:'calloff', client:'Ruth Kay (fake)', calling_off:'Amy Fit (fake)', flag_evidence:'I am sick', axiscare_visit_id:'s=1:d=x', client_axiscare_id:'500', shift_date:dT, shift_time:'09:00-13:00',
      visit_match:{ state:'one', options:[], why:'their only visit' }, opened_at:iso(-5) },
    { id:'flag2', status:'flagged', kind:'calloff', client:'(from text, confirm the client)', calling_off:'Ben Unknown (fake)', flag_evidence:'cant come', opened_at:iso(-4),
      visit_match:{ state:'several', why:'2 visits', options:[{ visit_id:'v1', client:'One Client (fake)', client_axiscare_id:'1', shift_date:dT, shift_time:'08:00-10:00' },{ visit_id:'v2', client:'Two Client (fake)', client_axiscare_id:'2', shift_date:dT, shift_time:'14:00-18:00' }] } } ];
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>{ console.log('step: '+n); R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); }; const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, cc=()=>document.getElementById('caraCC').innerText;
  try{ localStorage.removeItem('cara_p1_preview'); }catch(e){}
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  schedGo('coverage'); covSubGo('today'); await sleep(300);
  /* ── OFF ── */
  ok('switch off: today\'s Cara Today (no new sections)', !/Waiting for your OK/.test(cc()) && !/Clients at risk/.test(cc()) && /Needs you/.test(cc()), cc().slice(0,400));
  ok('switch off: an owner sees the Preview link', /Preview Cara's new Today/.test(cc()));
  ok('switch off: a flag still shows the shift Cara found (informational)', /Cara found the shift in AxisCare: Ruth Kay \(fake\)/.test(cc()), cc().slice(0,900));
  ok('switch off: "said yes" wording unchanged', COV_STATE_UI.yes[0]==='✅ yes');
  /* ── preview ── */
  CP1.preview(true); await sleep(600);
  const t=cc();
  ok('the new Today answers the five questions', ['Needs you now','Waiting for your OK','Cara is working on','Replies','Clients at risk'].every(h=>t.includes(h)), t.slice(0,600));
  ok('the preview says only this browser sees it', /Preview of Cara's new Today, only in this browser/.test(t));
  ok('Needs you now: the shift starting in 2 hours is Critical, with a one-tap Send Cara\'s list', /Critical[\s\S]{0,80}starts in (1h|2h)[\s\S]{0,40}Send Cara's list/.test(t) && t.indexOf('Critical Client')<t.indexOf('Waiting for your OK'), t.slice(0,900));
  ok('Waiting for your OK: Cara recommends one person, with reasons, and what to check on the others', /Cara recommends Amy Fit \(fake\)/.test(t) && /inside their availability/.test(t) && /Dee Hours \(fake\) \(Overtime risk/.test(t) && /Eve Skills \(fake\) \(Skills rules/.test(t), t);
  ok('Waiting for your OK: says a yes is interest only', /Nothing is assigned until you confirm and AxisCare shows them/.test(t));
  ok('Needs you now: a shift with a caregiver confirmed is not asking for a list', !/Covered Client/.test(t.split('Waiting for your OK')[0]), t.split('Waiting for your OK')[0].slice(0,1500));
  ok('Cara is working on: the case with asks out', /Waiting Client \(fake\)/.test(t.split('Cara is working on')[1]||''));
  ok('Replies: the condition shows; a no shows', /Dee Hours \(fake\) said yes, with a condition: until 3pm/.test(t) && /Gus Busy \(fake\) said no/.test(t), (t.split('Replies')[1]||'').slice(0,500));
  const risk=(t.split('Clients at risk')[1]||'');
  ok('Clients at risk: open shifts in 72 hours with nobody confirmed; the covered one is not there; interest vs assigned words', /Critical Client/.test(risk) && /Waiting Client/.test(risk) && !/Covered Client/.test(risk) && /2 said yes \(interest, nobody assigned\)/.test(risk), risk.slice(0,600));
  ok('words: "said yes (not assigned)" while Cara\'s Today is on', COV_STATE_UI.yes[0]==='✅ said yes (not assigned)');
  /* Confirm = the existing confirm path */
  [...document.querySelectorAll('#caraCC button')].find(b=>/^Confirm Amy/.test(b.textContent)).click(); await sleep(150);
  ok('Confirm uses covResolve (the one confirm path: AxisCare write + read-back), for the recommended person', JSON.stringify(L.resolved)==='[["yes1","covered","Amy Fit (fake)"]]', L.resolved);
  /* Send Cara's list */
  L.calls=[]; await CP1.sendCaraList('crit'); await sleep(100);
  const sent=L.calls.find(c=>c.action==='send_selected');
  ok('Send Cara\'s list: after the office confirms, only Cara\'s picks (never overtime, an overlapping yes, or someone working then)', sent && JSON.stringify(sent.recipients)==='["Amy Fit (fake)","Ben Unknown (fake)"]', L.calls);
  ok('Send Cara\'s list: used the list Cara had already built (no rebuild)', !L.calls.some(c=>c.action==='candidates'));
  /* the picker */
  switchTab('coverage'); caraShowCase('crit'); await sleep(400);
  const box=document.getElementById('tab-coverage').innerText;
  ok('picker: Unknown availability, overtime risk and the overlapping yes are shown', /Availability unknown: nothing on file/.test(box) && /Overtime risk: 38h/.test(box) && /Said yes to another open shift then/.test(box), box.slice(0,1500));
  const ck=n=>{ const el=[...document.querySelectorAll('input[data-pick="crit"]')].find(i=>i.value===n); return el&&el.checked; };
  ok('picker: Needs Verification is listed with the reason so the office knows why, and has no tick box (cannot be offered)', /Needs Verification \(1\): can't be offered a shift until verified as eligible[\s\S]{0,80}Hal Lapsed \(fake\)[\s\S]{0,40}OIG check over 30 days/.test(box) && !document.querySelector('input[data-pick="crit"][value="Hal Lapsed (fake)"]'), box.slice(0,2500));
  ok('picker: overtime and overlapping people start unticked; Unknown stays ticked (shown, not hidden)', ck('Amy Fit (fake)')===true && ck('Dee Hours (fake)')===false && ck('Fran Overlap (fake)')===false && ck('Ben Unknown (fake)')===true);
  ok('picker: "Send Cara\'s list" is there, and the preview of the new list is offered (list switch off)', /Send Cara's list/.test(box) && /Compare with Cara's new list/.test(box));
  L.calls=[]; await CP1.previewList('crit'); await sleep(200);
  const box2=document.getElementById('tab-coverage').innerText;
  ok('preview list: read only (asks candidates_v2), shows Unknown and who the skills rules left out', L.calls.length===1 && L.calls[0].action==='candidates_v2' && /Preview: Cara's new list \(nothing is sent from here\)/.test(box2) && /Left out by the skills rules: Eve Skills/.test(box2), box2.slice(0,2000));
  /* flags */
  L.prompts=[]; await covFlagConfirm('flag1'); await sleep(150);
  const f1=DATA.coverage_cases.find(c=>c.id==='flag1');
  ok('a flag with its shift attached confirms without asking which client', f1.status==='open' && f1.client==='Ruth Kay (fake)' && !L.prompts.length, [f1.status, L.prompts]);
  await covFlagConfirm('flag2'); await sleep(150);
  const f2=DATA.coverage_cases.find(c=>c.id==='flag2');
  ok('a flag with several shifts asks which one, and takes the shift picked', /Which shift is Ben calling off/.test(L.prompts[0]||'') && f2.axiscare_visit_id==='v2' && f2.client==='Two Client (fake)' && f2.status==='open', [L.prompts, f2]);
  /* the switch itself */
  CP1.preview(false); DATA.ops_settings={ cara_today_live:true }; covSubGo('today'); await sleep(300);
  ok('switch on: everyone gets the new Today (no preview banner)', /Waiting for your OK/.test(cc()) && !/Preview of Cara's new Today/.test(cc()));
  ok('nothing was saved except the two confirmed flags', JSON.stringify(L.writes.sort())==='["coverage_cases:flag1","coverage_cases:flag2"]', L.writes);
  return R;
}
"""
MIME = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.json':'application/json', '.webmanifest':'application/json'}
def serve(route):
    url = route.request.url
    if 'supabase.co' in url: return route.abort()
    if not url.startswith('http://carap1.local/'): return route.continue_()
    p = (ROOT / url.split('http://carap1.local/', 1)[1].split('?')[0].split('#')[0])
    if not p.is_file(): return route.fulfill(status=404, body='')
    route.fulfill(status=200, body=p.read_bytes(), content_type=MIME.get(p.suffix, 'application/octet-stream'))
with sync_playwright() as pw:
    b = pw.chromium.launch(); cx = b.new_context(viewport={'width': 1280, 'height': 900}, timezone_id='America/Chicago'); pg = cx.new_page()
    pg.route('**/*', serve)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    if os.environ.get('DEBUG'): pg.on('console', lambda m: print('console:', m.text[:200], flush=True))
    pg.goto('http://carap1.local/index.html?proof=carap1'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    if SHOT:   # the new Today, as an owner's preview shows it (taken after the checks: the sync API can't shoot mid-evaluate)
        pg.evaluate("()=>{ DATA.ops_settings={ cara_today_live:true }; schedGo('coverage'); covSubGo('today'); window.scrollTo(0,0); }"); pg.wait_for_timeout(800)
        pg.screenshot(path=SHOT, full_page=True)
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

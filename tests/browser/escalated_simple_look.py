"""Escalated to you, made simple (2026-10-30). The real Hub page, offline (files served from this folder, no server needed),
made-up people and cards only; saves are recorded, never sent; nobody is texted, emailed or called. Samantha is signed in;
Krystal has six late cards escalated to Samantha (two about care at risk or a promise).
(python3 tests/browser/escalated_simple_look.py; SHOTS=<dir> also saves screenshots)"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = os.environ.get('SHOTS')
STUB = r"""
(()=>{
  const W=window, at=(hm,d)=>new Date('2026-10-'+(d||'30')+'T'+hm+':00-05:00').toISOString();
  W.__log={ writes:[], toasts:[], events:[] };
  const K='krystal@mo-care.com', S='samantha@mo-care.com';
  (0,eval)(`sb={ from:()=>{ const p={ select(){return p;}, eq(){return p;}, gte(){return p;}, in(){return p;}, order(){return p;}, limit(){return p;},
      single:async()=>({ data:null, error:null }), maybeSingle:async()=>({ data:null, error:null }),
      then(a){ return Promise.resolve({data:[],error:null}).then(a); } }; return p; },
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async()=>({data:null,error:null}) },
    auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };
    CC_ROLE_BY_EMAIL={ '${S}':['owner_admin'], '${K}':['care_coordinator'] };
    OPS_PEOPLE=[{ person_id:'p_k', full_name:'Krystal Land', primary_email:'${K}' },{ person_id:'p_s', full_name:'Samantha Troutman', primary_email:'${S}' }];
    ME={ email:'${S}', name:'Samantha Troutman', shift:'day' };`);
  W.persist=async(k,v)=>{ W.__log.writes.push(k+':'+v.id); };
  W.opEvent=(v,o)=>W.__log.events.push(v);
  W.ccOpsRefresh=()=>{}; W.ccRecentFetch=async()=>{}; W.ccToast=m=>W.__log.toasts.push(m);
  W.tkMerge=async(fn)=>{ const m=JSON.parse(JSON.stringify(DATA.ops_settings||{})); fn(m); DATA.ops_settings=m; W.__log.writes.push('ops_settings'); return {}; };
  W.ccConfirm=async()=>true;
  DATA.handoffs=[]; DATA.leads=[]; DATA.coverage_cases=[];
  DATA.coordinator_staff=[{ id:'sk', name:'Krystal Land', email:K }, { id:'ss', name:'Samantha Troutman', email:S }];
  DATA.ops_settings={ quiet_calls_live:true };
  const esc={ to:S, to_name:'Samantha Troutman', stage:'in_charge', level:'overdue', why:'it is overdue', at:at('14:00','29') };
  const c=(id,o)=>Object.assign({ id, status:'open', owner:K, owner_name:'Krystal Land', opened_by:'call-tasks', created_at:at('09:00','14'), escalation:Object.assign({},esc) }, o);
  DATA.ops_items=[
    c('cf_a', { kind:'call_followup', title:'Reply to Maria M. about starting pay (text received Oct 14)', about:'Maria M.', due:at('16:05','15'), detail:'Maria texted asking what the starting pay is.' }),
    c('cf_b', { kind:'call_followup', title:'Reply to Maria M. on rehire availability', about:'Maria M.', due:at('18:00','16') }),
    c('cfp_c', { kind:'call_followup', title:'Call the Fake family back as promised', about:'Fake Family', due:at('12:00','27') }),
    c('cn_d', { kind:'care_note', opened_by:'care-notes', domain:'client_care', urgency:'today', title:'Shift note: client fell, check in today', about:'Bo Fake', due:at('18:00','16') }),
    c('cn_e', { kind:'care_note', opened_by:'care-notes', title:'Shift note: ran out of gloves', about:'Bo Fake', due:at('18:00','16') }),
    c('cn_f', { kind:'care_note', opened_by:'care-notes', title:'Shift note: left early, family knew', about:'Cy Fake', due:at('18:00','17') }) ];
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, it=id=>DATA.ops_items.find(x=>x.id===id), mw=()=>document.getElementById('myWorkWrap').innerText;
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  switchTab('mywork'); await sleep(300);

  /* OFF: exactly as before */
  myWorkGo('escalated'); await sleep(300);
  ok('off: the old full cards (Why you\'re seeing this, Help with this)', /Help with this/.test(mw()) && !document.querySelector('.esc-line'), mw().slice(0,500));

  /* ON */
  DATA.ops_settings.escalated_simple_live=true; renderMyWork(); await sleep(300);
  const t=mw();
  ok('on: one heading for Krystal with the count and kinds', /Krystal\s*· 6 late cards/.test(t) && /3 shift-note flags, 3 call follow-ups|3 call follow-ups, 3 shift-note flags/.test(t), t.slice(0,600));
  ok('on: only the 2 about care at risk or a promise, one line each', document.querySelectorAll('.esc-line').length===2 && !!document.getElementById('esc_cfp_c') && !!document.getElementById('esc_cn_d'), [...document.querySelectorAll('.esc-line')].map(e=>e.id));
  const line=document.getElementById('esc_cfp_c').innerText;
  ok('a line: what, how late and whose, three buttons and ⋯', /Call the Fake family back as promised/.test(line) && /2 days late · Krystal’s/.test(line) && /I’ll do it/.test(line) && /Leave with Krystal/.test(line) && /Close ▾/.test(line) && /⋯/.test(line)
    && !/Why you’re seeing this|Help with this|Helping keeps it/.test(line), line);
  ok('the group buttons: Leave the other 4 with Krystal, Show all 6', /Leave the other 4 with Krystal/.test(t) && /Show all 6/.test(t));

  /* tap a line: the full card underneath */
  document.getElementById('esc_cn_d').click(); await sleep(200);
  ok('tapping a line shows the full card', /Shift note: client fell/.test(document.getElementById('esc_cn_d').innerText) && document.getElementById('esc_cn_d').querySelectorAll('button').length>4);
  document.getElementById('esc_cn_d').click(); await sleep(200);

  /* Close and ⋯ menus */
  document.getElementById('escCl_cfp_c').click(); await sleep(200);
  const pop=()=>[...document.querySelectorAll('.ccpick-row')].map(r=>r.textContent.trim());
  ok('Close: Done elsewhere, No longer needed', pop().join('|')==='Done elsewhere|No longer needed', pop());
  ccPopClose(); await sleep(100);
  document.getElementById('escMo_cfp_c').click(); await sleep(200);
  ok('⋯: at most four choices, Help with this keeps it Krystal\'s', pop().length<=4 && /Help with this \(it stays Krystal’s\)/.test(pop().join('|')) && /Waiting on someone/.test(pop().join('|')), pop());
  ccPopClose(); await sleep(100);

  /* Leave with one card */
  document.getElementById('escAct_cfp_c').querySelectorAll('button')[1].click(); await sleep(300);
  const x=it('cfp_c');
  ok('Leave with: still Krystal\'s, escalation cleared, stop date set, saved once', x.owner==='krystal@mo-care.com' && x.status==='open' && !!x.escalation.cleared_at && !!x.left_with_owner && L.writes.filter(w=>w==='ops_items:cfp_c').length===1, x);
  ok('...and it left my list', !document.getElementById('esc_cfp_c') && /Krystal\s*· 5 late cards/.test(mw()), mw().slice(0,300));

  /* Leave the rest */
  [...document.querySelectorAll('#myWorkWrap button')].find(b=>/Leave the other/.test(b.textContent)).click(); await sleep(500);
  ok('Leave the rest: the 4 non-urgent ones left with Krystal, the fall check stays', ['cf_a','cf_b','cn_e','cn_f'].every(i=>it(i).left_with_owner && it(i).owner==='krystal@mo-care.com') && !it('cn_d').left_with_owner && !!document.getElementById('esc_cn_d'), DATA.ops_items.map(i=>[i.id,!!i.left_with_owner]));
  ok('nothing closed, nothing sent', DATA.ops_items.every(i=>i.status==='open') && !L.events.some(e=>/sent|text/.test(e)));

  /* the switch in Settings */
  ESC.settingsFill();
  ok('Settings: the switch reads On, owners see the button', /On\./.test(document.getElementById('escSetNow').innerText) && document.getElementById('escToggleBtn').textContent==='Turn off the simpler Escalated to you');
  return R;
}
"""
MIME = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.json':'application/json', '.webmanifest':'application/json'}
def serve(route):
    url = route.request.url
    if 'supabase.co' in url: return route.abort()
    if not url.startswith('http://esc.local/'): return route.continue_()
    p = (ROOT / url.split('http://esc.local/', 1)[1].split('?')[0].split('#')[0])
    if not p.is_file(): return route.fulfill(status=404, body='')
    route.fulfill(status=200, body=p.read_bytes(), content_type=MIME.get(p.suffix, 'application/octet-stream'))
with sync_playwright() as pw:
    b = pw.chromium.launch(); cx = b.new_context(viewport={'width': 1280, 'height': 900}, timezone_id='America/Chicago'); pg = cx.new_page()
    pg.clock.install(time='2026-10-30T09:00:00-05:00'); pg.clock.resume()
    pg.route('**/*', serve)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://esc.local/index.html?proof=esc'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True)
        pg.evaluate("()=>{ DATA.ops_items.forEach(i=>{ delete i.left_with_owner; if(i.escalation) delete i.escalation.cleared_at; }); ESC.state.open.clear(); renderMyWork(); document.getElementById('myWorkWrap').scrollIntoView(); }")
        pg.wait_for_timeout(300); pg.screenshot(path=os.path.join(SHOTS, 'esc_on.png'))
        pg.evaluate("()=>{ DATA.ops_settings.escalated_simple_live=false; renderMyWork(); }"); pg.wait_for_timeout(300); pg.screenshot(path=os.path.join(SHOTS, 'esc_off.png'))
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

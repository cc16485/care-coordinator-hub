"""A calmer profile top (Samantha 2026-10-15, refined the same day). The real Hub page, offline, with made-up TEST people,
through every case she asked for: active clients (nothing to do, a safety issue, an uncovered shift), a paused client, a
client restarting care, a pending start, and leads at three stages. Above the tabs: one header line and one next action
(or none); Pause/End care, the review ask and the journey links in More; the path on Start of Care. The journey and care
services are the stand-ins from client_journey_look.py and client_care_look.py.
(python3 tests/browser/profile_top_look.py [screenshot folder], static server on 8829 from the repo root)"""
import os, sys
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
SHOTS = sys.argv[1] if len(sys.argv) > 1 else ''
ns = {'__file__': os.path.join(HERE, 'client_care_look.py')}; exec(open(os.path.join(HERE, 'client_care_look.py')).read().split('\nwith sync_playwright() as pw:')[0], ns)
STUB, DATA, FAKE = ns['STUB'], ns['DATA'], ns['FAKE']
SETUP = r"""
(async()=>{ const W=window, of=W.fetch;
  W.fetch=async(u,o)=>{ if(/review-moments/.test(String(u))) return new Response(JSON.stringify({ can_suggest:true, live:true, history:[], current:null }),{ status:200 }); return of(u,o); };
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  DATA.ops_settings.client_journey_live=true;
  const ago=d=>new Date(Date.now()-d*864e5).toLocaleDateString('en-CA',{ timeZone:'America/Chicago' }), ahead=d=>new Date(Date.now()+d*864e5).toLocaleDateString('en-CA',{ timeZone:'America/Chicago' });
  /* clients in AxisCare (no inquiry): quiet, safety, uncovered shift, paused */
  Object.assign(W.__care.state, { '801':'active', '802':'active', '803':'active', '804':'paused', '805':'starting', '806':'starting' });
  const NM={ '801':'Ruth Ames (TEST)', '802':'Walt Hale (TEST)', '803':'June Bell (TEST)', '804':'Otis Gray (TEST)' };
  const ok=ax=>({ id:'ci'+ax, client_name:NM[ax], axiscare_client_id:ax, checkin_date:ago(5), next_checkin_due:ahead(20), coordinator:'Krystal' });
  DATA.client_checkins=[ok('801'), Object.assign(ok('802'), { escalated:true, concerns_raised:'Fell in the bathroom Tuesday, bruised hip' }), ok('803'), ok('804')];
  DATA.care_plan_reviews=['801','802','803','804'].map(ax=>({ id:'rv'+ax, kind:'review', axiscare_client_id:ax, at:ago(30), next_due:ahead(60) }));
  DATA.coverage_cases=[{ id:'cv1', client:'Ruth Ames (TEST)', client_axiscare_id:'803', calling_off:'Tasha', shift_date:ahead(1), shift_time:'08:00-12:00', status:'open', opened_at:new Date().toISOString() }];
  /* leads: New, Talking (T1), Assessment, plus a restart and a pending start that have inquiries */
  DATA.leads.push(
    { id:'N1', is_test:true, first_name:'Gail', last_name:'Ford', relationship:'daughter', phone:'4175550111', client_first_name:'Hank', client_last_name:'Ford (TEST)', funding_source:'private', status:'New', assigned_coordinator:'krystal@mo-care.com', created_at:new Date(Date.now()-40*60000).toISOString() },
    { id:'A1', is_test:true, first_name:'Joe', last_name:'Lane', relationship:'son', phone:'4175550122', client_first_name:'Mae', client_last_name:'Lane (TEST)', funding_source:'private', status:'Assessment Scheduled', assessment_at:ahead(2), assigned_coordinator:'angie@mo-care.com', created_at:ago(6) },
    { id:'RS', is_test:true, first_name:'Bea', last_name:'Cole', relationship:'wife', phone:'4175550133', client_first_name:'Abe', client_last_name:'Cole (TEST)', funding_source:'private', status:'Contacted', axiscare_client_id:'805', assigned_coordinator:'angie@mo-care.com', created_at:ago(2) },
    { id:'PS', is_test:true, first_name:'Lou', last_name:'Park', relationship:'daughter', phone:'4175550144', client_first_name:'Ida', client_last_name:'Park (TEST)', funding_source:'private', status:'Converted', said_yes_at:ago(5), axiscare_client_id:'806', assigned_coordinator:'angie@mo-care.com', created_at:ago(12) });
  window.__as('sam@mo-care.com','Samantha Owner');
  for(const id of ['T1','A1','RS','PS']) await cjCall({ action:'open', lead_id:id });
  /* the pending start moves past intake, pre-checks, the assessment, signing, AxisCare and billing (an owner exception each) */
  const S=W.__svc, R=W.JourneyRules; const PS=S.journeys.find(j=>j.lead_id==='PS');
  for(let i=0;i<40;i++){ const d=await cjCall({ action:'get', journey_id:PS.journey_id }); const v=R.compute(d.defs,d.journey,d.steps,d.ctx);
    if(!v.next||['schedule','team'].indexOf(v.next.def.stage)>-1) break;
    await cjCall({ action:'apply', journey_id:PS.journey_id, step_key:v.next.key, op:'exception', kind:'other', reason:'Preview: done before tracking' }); }
  window.__as('angie@mo-care.com','Angie Care');
})();
"""
CASES = [  # name, how to open, what must be true (T = the top's text, N = the next card's text or null, M = More items, C = care block shown)
    ('active-quiet', "openClient({ ax:'801' },'summary')", "/Receiving care/.test(document.getElementById('cpChips').innerText) && !N && M.includes('Pause care') && !C"),
    ('active-safety', "openClient({ ax:'802' },'summary')", "!!N && /Safety/i.test(N) && /Fell in the bathroom/.test(N)"),
    ('active-uncovered', "openClient({ ax:'803' },'summary')", "!!N && /Uncovered shift/i.test(N) && /open call-off/.test(N) && /Tasha called off/.test(N)"),
    ('paused', "openClient({ ax:'804' },'summary')", "C && /Resume care/.test(document.getElementById('ccCare').innerText) && document.getElementById('cpChips').firstElementChild.textContent==='Paused'"),
    ('restart', "openLeadProfile('RS','summary')", "!!N && !/Receiving care/.test(document.getElementById('cpChips').innerText)"),
    ('pending-start', "openLeadProfile('PS','care')", "!!N && /Start\\s/.test(T) && !C"),
    ('lead-new', "openLeadProfile('N1','summary')", "/Gail Ford/.test(T) && /Call/.test(T) && /Text/.test(T) && !!N"),
    ('lead-talking', "openLeadProfile('T1','start')", "!!N && !!document.getElementById('cpPath').closest('[data-cp-pane=\"start\"]') && !!document.querySelector('#cpPath .cj-path-tracks')"),
    ('lead-assessment', "openLeadProfile('A1','summary')", "!!N && /assessment/i.test(N) && !/4175550122/.test(N)"),
]
READ = r"""()=>{ const $=id=>document.getElementById(id), vis=el=>!!el&&el.offsetParent!==null&&getComputedStyle(el).display!=='none';
  const tabs=$('cpTabs'), above=[...$('leadProfileView').querySelectorAll('*')].filter(el=>(el.compareDocumentPosition(tabs)&Node.DOCUMENT_POSITION_FOLLOWING)&&!tabs.contains(el)&&vis(el));
  return { T:$('cpTop').innerText, N:($('cpTop').querySelector('.pt-next')||{}).innerText||null, M:[...$('cpTopMenu').querySelectorAll('.pt-item')].map(b=>b.textContent.trim()), C:vis($('ccCare')),
    cards:$('cpTop').querySelectorAll('.pt-next').length, path:above.some(el=>el.id==='cpPath'), review:above.some(el=>el.id==='ccReview'), journeyCard:vis($('cjHead')),
    em:/\u2014/.test($('cpTop').innerText), twice:/Receiving care|New lead|Getting ready|Paused/.test($('cpTop').innerText) }; }"""
R = []
ok = lambda n, c, d='': R.append(['PASS' if c else 'FAIL', n, '' if c else str(d)[:700]])
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1280, 'height': 900}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    pg.goto('http://localhost:8829/index.html?proof=pt'); pg.wait_for_timeout(1500)
    for s in (STUB, DATA, FAKE): pg.evaluate('s=>(0,eval)(s)', s)
    pg.evaluate('s=>(0,eval)(s)', SETUP); pg.wait_for_timeout(3000)
    for name, how, want in CASES:
        pg.set_viewport_size({'width': 1280, 'height': 900})
        pg.evaluate('async()=>{ await ' + how + '; }'); pg.wait_for_timeout(1200)
        pg.evaluate('()=>window.scrollTo(0,0)')
        x = pg.evaluate(READ)
        good = pg.evaluate('([T,N,M,C])=>!!(' + want + ')', [x['T'], x['N'], x['M'], x['C']])
        ok(name + ': ' + want, good, x)
        ok(name + ': one next card at most; no path, review box or journey card above the tabs; no em dashes; status said once', x['cards'] <= 1 and not x['twice'] and not x['path'] and not x['review'] and not x['journeyCard'] and not x['em'], x)
        if SHOTS:
            h = pg.evaluate("()=>Math.round(document.getElementById('cpTabs').getBoundingClientRect().bottom+window.scrollY+120)")
            pg.screenshot(path=os.path.join(SHOTS, name + '-desktop.png'), clip={'x': 0, 'y': 0, 'width': 1280, 'height': min(h, 900)})
            pg.set_viewport_size({'width': 390, 'height': 844}); pg.wait_for_timeout(300); pg.evaluate('()=>window.scrollTo(0,0)')
            y0, y1 = pg.evaluate("()=>{ const v=document.getElementById('leadProfileView').getBoundingClientRect(), t=document.getElementById('cpTabs').getBoundingClientRect(); return [Math.max(0,Math.round(v.top+window.scrollY-8)), Math.round(t.bottom+window.scrollY+60)]; }")
            pg.screenshot(path=os.path.join(SHOTS, name + '-phone.png'), full_page=True, clip={'x': 0, 'y': y0, 'width': 390, 'height': y1 - y0})
    pg.set_viewport_size({'width': 1280, 'height': 900})
    pg.evaluate("async()=>{ await openClient({ ax:'801' },'summary'); }"); pg.wait_for_timeout(1000)
    pg.click('#cpTopMoreBtn'); pg.wait_for_timeout(150)
    pg.evaluate("()=>{ const b=[...document.querySelectorAll('#cpTopMenu .pt-item')].find(b=>b.textContent.trim()==='Pause care'); if(b) b.click(); }"); pg.wait_for_timeout(300)
    ok('Pause care from More opens the usual Pause care form', pg.evaluate("()=>!!document.querySelector('.cc-dlg #ccR')"))
    pg.evaluate("()=>{ document.querySelectorAll('.cc-dlg,.cc-ov').forEach(d=>d.remove()); }")
    # 2026-10-29: a client receiving care has the at-a-glance card on the Overview (client-glance.js), so the header line and
    # its NEXT bar show on the other tabs; the bar is clicked from Check-ins here
    pg.evaluate("async()=>{ await openClient({ ax:'803' },'checkins'); }"); pg.wait_for_timeout(1000)
    if pg.evaluate("()=>!!document.querySelector('#cpTop .pt-go')"): pg.click('#cpTop .pt-go'); pg.wait_for_timeout(300)
    ok('the uncovered-shift card opens Team & Schedule', pg.evaluate("()=>CP.tab==='team'"), pg.evaluate("()=>CP.tab"))
    pg.evaluate("async()=>{ await openLeadProfile('T1','summary'); }"); pg.wait_for_timeout(1000)
    if pg.evaluate("()=>!!document.querySelector('#cpTop .pt-go')"): pg.click('#cpTop .pt-go'); pg.wait_for_timeout(400)
    ok('a journey next step opens that step on Start of Care', pg.evaluate("()=>CP.tab==='start'"), pg.evaluate("()=>CP.tab"))
    pg.evaluate("async()=>{ window.__as('sally@mo-care.com','Sally Staffing'); await openLeadProfile('T1','summary'); }"); pg.wait_for_timeout(1000)
    ok('a Staffing Coordinator sees the Care Coordinator but cannot change it', pg.evaluate("()=>!document.querySelector('#cpTop .pt-cc') && /is the Care Coordinator/.test(document.getElementById('cpTop').innerText)"))
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', ' | '.join(errs[:3])]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

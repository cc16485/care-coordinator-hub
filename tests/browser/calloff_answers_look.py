"""Was it covered? answers (Samantha 2026-11-05: "start with the cleanup and the Hub card fix, behind a switch"). The real
Hub page, offline, made-up call-offs only: off = cards as before; preview = Cara gets a Was it covered? tab listing
every finished call-off waiting for an answer (even with no card), What AxisCare shows, five answers including Not
needed, owners answer several at once with one reason, and a Was it covered? card closes only with an answer (Done,
This is finished, Clear old cards). Nothing is sent. Saves screenshots to SHOTS (default /tmp/caa_*.png).
(python3 tests/browser/calloff_answers_look.py; serves this checkout itself)"""
import re, os, sys, threading, functools, http.server, socketserver
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
STUB = re.search(r'STUB = r"""(.*?)"""', open(os.path.join(HERE, 'standup_look.py')).read(), re.S).group(1)
SHOTS = os.environ.get('SHOTS', '/tmp/caa_')
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.TCPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=ROOT)); PORT = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
SETUP = r"""async()=>{
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha Troutman' };"); CC_ROLES=['owner_admin']; CC_ROLES_CHECKED=true; CC_ROLE_BY_EMAIL['samantha@mo-care.com']=['owner_admin'];
  window.ccIsOwner=()=>/samantha/.test(ME.email);
  try{ localStorage.removeItem('caaPreview'); }catch(e){}
  const ago=n=>new Date(Date.now()-n*864e5).toISOString(), day=n=>new Date(Date.now()-n*864e5).toLocaleDateString('en-CA',{timeZone:'America/Chicago'});
  DATA.ops_settings=Object.assign({}, DATA.ops_settings||{}, { calloff_answers_live:false });
  const cases=[
    { id:'cwo_t1', client:'Ed Example', client_axiscare_id:'296', shift_date:day(23), shift_time:'09:00-14:00', status:'needs_outcome', opened_by:'ongoing-sweep', opened_at:ago(30), outcome_asked_at:ago(23), axiscare_visit_id:'s=1:d=x' },
    { id:'cwo_t2', client:'Ed Example', client_axiscare_id:'296', shift_date:day(22), shift_time:'16:00-21:00', status:'needs_outcome', opened_by:'ongoing-sweep', opened_at:ago(29), outcome_asked_at:ago(22) },
    { id:'cwo_t3', client:'Ed Example', client_axiscare_id:'296', shift_date:day(21), shift_time:'09:00-14:00', status:'needs_outcome', opened_by:'ongoing-sweep', opened_at:ago(28), outcome_asked_at:ago(21) },
    { id:'cw_t4', client:'Jackie Sample', client_axiscare_id:'120', shift_date:day(2), shift_time:'12:00-16:00', status:'needs_outcome', opened_by:'axiscare-watch', calling_off:'Iris Testcase', opened_at:ago(3), outcome_asked_at:ago(2) },
    { id:'cwf_t5', client:'(from call — confirm the client)', shift_date:day(5), status:'needs_outcome', opened_by:'cara-flag', calling_off:'Rita Caller', kind:'calloff', opened_at:ago(5), outcome_asked_at:ago(4) },
    { id:'done_t6', client:'Done Client', client_axiscare_id:'1', shift_date:day(3), status:'done', resolved_how:'covered', opened_at:ago(3) } ];
  window.__store.coverage_cases=JSON.parse(JSON.stringify(cases)); DATA.coverage_cases=JSON.parse(JSON.stringify(cases));
  DATA.ops_items=[
    { id:'ops_covq_cwo_t3', kind:'coverage_outcome', case_id:'cwo_t3', status:'open', owner:'samantha@mo-care.com', escalation:{ to_name:'Krystal Land' }, title:'Was Ed Example\'s shift covered?', about:'Ed Example', created_at:ago(21), due:ago(21), domain:'scheduling_coverage' },
    { id:'ops_covq_cw_t4', kind:'coverage_outcome', case_id:'cw_t4', status:'open', owner:'krystal@mo-care.com', title:'Was Jackie Sample\'s shift covered?', about:'Jackie Sample', created_at:ago(2), due:ago(2), domain:'scheduling_coverage' } ];
  /* AxisCare for Jackie's day: Pat clocked in during the shift */
  window.__axDays={}; window.__axDays[day(2)]=[{ date:day(2), time:'12:00', end:'16:00', client:'Jackie Sample', client_id:'120', caregiver:'Pat Helper', caregiver_id:'7', clock_in:'12:03', clock_out:'16:01' }];
  const of=window.fetch; window.fetch=async(u,o)=>{ if(/coverage-shifts/.test(String(u))){ const b=JSON.parse(o.body||'{}'); window.__log.fetch.push(b); return new Response(JSON.stringify({ rows:window.__axDays[b.start]||[] }),{ status:200 }); } return of(u,o); };
  window.__saved=[]; const op=window.persist; window.persist=async(k,i)=>{ window.__saved.push([k,JSON.parse(JSON.stringify(i))]); };
  window.__events=[]; const oe=window.opEvent; window.opEvent=(v,o)=>{ window.__events.push([v,o&&o.summary]); };
  window.ccPrompt=async()=>window.__promptAnswer; window.ccConfirm=async()=>true;
  sb.auth={ getSession:async()=>({ data:{ session:{ access_token:'test' } } }) }; window.CONFIG=window.CONFIG||{}; CONFIG.supabase_url=CONFIG.supabase_url||'https://example.supabase.co';
}"""
T = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const tabs=()=>[...document.querySelectorAll('#covSubBar button')].map(b=>b.innerText.replace(/\s+/g,' ').trim());
  switchTab('coverage'); await sleep(200);
  ok('off: no Was it covered? tab', !tabs().some(t=>/Was it covered/.test(t)), tabs());
  ok('off: the card keeps its three old buttons', (()=>{ const h=obligationOpenAction(DATA.ops_items[1]); return /Client cancelled/.test(h) && !/Not needed/.test(h) && !/What AxisCare shows/.test(h); })());
  CAA.preview(true); await sleep(150);
  ok('preview: a Was it covered? tab with 5 waiting', tabs().some(t=>/Was it covered\? 5/.test(t)), tabs());
  covSubGo('answers'); await sleep(150);
  const L=()=>document.getElementById('covList').innerText;
  ok('the list: 5 waiting, 2 with a card, oldest first, grouped by client', /5 waiting, 2 with a card/.test(L()) && L().indexOf('Ed Example')<L().indexOf('Jackie Sample'), L().slice(0,500));
  ok('a call-off whose card is gone says nobody is being asked', (L().match(/No card: nobody is being asked/g)||[]).length===3, L());
  ok('a card still out says whose list and the escalation', /Card on [^,]+'s list, escalated to Krystal Land/.test(L()) && (L().match(/Card on [^·]+'s list/g)||[]).length===2, L());
  ok('how each was opened, in words', /open slot in the AxisCare schedule, found by Cara's sweep/.test(L()) && /Iris Testcase was taken off the shift in AxisCare/.test(L()) && /Cara flagged a phone call from Rita Caller, no client attached/.test(L()), L());
  ok('five answers on each row', document.querySelectorAll('.caa-row')[0].innerText.match(/Covered|Not covered|Client cancelled|Couldn't staff|Not needed/g).length===5);
  ok('the done call-off is not listed', !/Done Client/.test(L()));
  ok('no answer is picked before AxisCare is checked', !document.querySelector('.caa-row button.primary'));
  ok('a call-off with no client is grouped as No client attached', /No client attached/.test(L()));
  await CAA.look('cw_t4'); await sleep(100);
  ok('What AxisCare shows: Pat clocked in at 12:03, looks covered', /AxisCare: Pat Helper clocked in at 12:03 pm, out at 4:01 pm\. Looks covered/.test(L()), L());
  ok('...and Covered is now the suggested answer on that row', /Covered/.test((document.querySelector('.caa-row[data-case="cw_t4"] button.primary')||{}).innerText||''));
  ok('...the read was one day of the live schedule', window.__log.fetch.some(b=>b.live_schedule===true));
  await CAA.look('cwf_t5'); await sleep(50);
  ok('no client attached: says AxisCare can\'t be checked', /no client attached, so AxisCare can't be checked/.test(L()), L());
  window.__shot='list';
  return R; }"""
ANSWER = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=()=>document.getElementById('covList').innerText;
  /* Jackie: Covered, from AxisCare */
  await CAA.answerOne('cw_t4','covered_other_way'); await sleep(100);
  const c4=window.__saved.filter(s=>s[0]==='coverage_cases').map(s=>s[1]).find(c=>c.id==='cw_t4');
  ok('Covered: the call-off closes, covered by Pat (from AxisCare), no texts', c4 && c4.status==='done' && c4.resolved_how==='covered_other_way' && c4.covered_by==='Pat Helper' && !!c4.closure_notified && c4.family_no_recipients===true, c4);
  const i4=window.__saved.filter(s=>s[0]==='ops_items').map(s=>s[1]).find(i=>i.id==='ops_covq_cw_t4');
  ok('...and its card closes with it', i4 && i4.status==='done' && /Answered: covered/.test(i4.close_note), i4);
  ok('...and it leaves the list', !/Jackie Sample/.test(L()));
  /* owners: Ed's three at once as Not needed, with one reason */
  CAA.checkAll(['cwo_t1','cwo_t2','cwo_t3'], true); await sleep(80);
  ok('ticking shows the answer-them-all bar', /3 ticked/.test(L()), L().slice(0,300));
  await CAA.answerChecked('not_needed'); await sleep(80);
  ok('no reason, nothing changes', window.__saved.filter(s=>s[0]==='coverage_cases').length===1);
  CAA._.ST.why='Care hadn\'t started (Samantha 10-13: not starting until the 23rd)';
  await CAA.answerChecked('not_needed'); await sleep(150);
  const cs=window.__saved.filter(s=>s[0]==='coverage_cases').map(s=>s[1]).filter(c=>/^cwo_t/.test(c.id));
  ok('all three: Not needed, the reason on each, no texts', cs.length===3 && cs.every(c=>c.resolved_how==='not_needed' && /not needed: no care was owed \(Care hadn't started/.test(c.note) && c.family_no_recipients===true), cs.map(c=>[c.id,c.resolved_how]));
  ok('...the one with a card has it closed too; no family call card', (window.__saved.find(s=>s[0]==='ops_items'&&s[1].id==='ops_covq_cwo_t3')||[])[1]?.status==='done' && !window.__saved.some(s=>/ops_famcall_cwo/.test(s[1].id)));
  ok('...recorded, with who', window.__events.filter(e=>/Ed Example’s shift was not needed/.test(e[1])).length===3, window.__events);
  ok('1 left: the flagged call', /\b1 waiting, 0 with a card/.test(L()) && /Rita Caller/.test(L()), L().slice(0,200));
  /* Not covered: a call-the-family card for a person */
  await CAA.answerOne('cwf_t5','uncovered'); await sleep(100);
  ok('Not covered: a call-the-family card for the person who answered, nothing sent', window.__saved.some(s=>s[0]==='ops_items' && s[1].id==='ops_famcall_cwf_t5' && s[1].kind==='family_call' && s[1].owner===ccActor().email));
  ok('none left: the goal state', /Every finished call-off has an answer/.test(L()), L());
  return R; }"""
GUARD = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const card={ id:'ops_covq_cw_t9', kind:'coverage_outcome', case_id:'cw_t9', status:'open', owner:'samantha@mo-care.com', title:'Was Gina Test\'s shift covered?', about:'Gina Test', created_at:new Date().toISOString(), domain:'scheduling_coverage' };
  DATA.ops_items.push(card);
  const h=obligationOpenAction(card);
  ok('preview: the card has five answers and What AxisCare shows', /Not needed/.test(h) && /Couldn't staff/.test(h) && /What AxisCare shows/.test(h));
  const a=document.createElement('div'); a.id='act_ops_covq_cw_t9'; document.body.appendChild(a);
  opsClose('ops_covq_cw_t9'); await sleep(80);
  const pop=document.querySelector('.cc-pop, [class*=pop]')||document.body;
  ok('Done on the card asks Was it covered? instead of closing it', /Was it covered\?/.test(document.body.innerText) && /closes with an answer/.test(document.body.innerText) && card.status==='open');
  try{ ccPopClose(); }catch(e){}
  await opsCloseCommit(card, 'just closing it', null); await sleep(50);
  ok('the phone\'s Done (opsCloseCommit) refuses it too', card.status==='open');
  const before=card.status; await (window.MWTidy&&MWTidy.clear?MWTidy.clear(['ops_covq_cw_t9'],'The day has passed'):Promise.resolve());
  ok('Clear old cards leaves it open', card.status==='open', card.status);
  CAA.preview(false); await sleep(80);
  ok('preview off: the tab goes away, the old buttons are back', ![...document.querySelectorAll('#covSubBar button')].some(b=>/Was it covered/.test(b.innerText)) && !/Not needed/.test(obligationOpenAction(card)));
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal' };"); CC_ROLES=['coordinator'];
  DATA.ops_settings.calloff_answers_live=true; renderCoverage(); await sleep(80);
  ok('switch on: a coordinator gets the tab', [...document.querySelectorAll('#covSubBar button')].some(b=>/Was it covered/.test(b.innerText)));
  covSubGo('answers'); await sleep(80);
  ok('...but no tick boxes (answering several at once is for owners)', !document.querySelector('#covList input[type=checkbox]'));
  return R; }"""
R = []
with sync_playwright() as pw:
    sys.path.insert(0, HERE)
    from clock_pin import pin
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1300, 'height': 1000}); errs = []
    pin(pg)
    pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    pg.goto(f'http://127.0.0.1:{PORT}/index.html?proof=caa'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    pg.evaluate(SETUP)
    def shot(name):
        pg.evaluate("window.scrollTo(0,0)"); pg.wait_for_timeout(200)
        el = pg.query_selector('#tab-coverage') or None
        (el.screenshot if el else functools.partial(pg.screenshot, full_page=True))(path=SHOTS + name + '.png')
    R += pg.evaluate(T); shot('list')
    pg.evaluate("()=>{ CAA.checkAll(['cwo_t1','cwo_t2','cwo_t3'], true); CAA._.ST.why='Care hadn\\'t started yet'; }"); shot('bulk')
    pg.evaluate("()=>{ CAA.checkAll(['cwo_t1','cwo_t2','cwo_t3'], false); CAA._.ST.why=''; }")
    pg.evaluate("()=>{ switchTab('mywork'); }"); pg.wait_for_timeout(200)
    R += pg.evaluate(ANSWER)
    R += pg.evaluate(GUARD)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
srv.shutdown()
for r in R: print(r[0], '·', r[1], ('→ ' + str(r[2])) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

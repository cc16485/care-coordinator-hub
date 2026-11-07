"""Health news step 2 (2026-11-07, her "Straight to AxisCare" + "Awareness of Diagnosis / Injury" with the date): the real Hub
page offline, a made-up client only. A health_news card in My Work has "Review and send to AxisCare"; the review shows what
was said with the words on the call, the Awareness task first with the dated news on top of what the task already says, each
care task change with "Ask before approving"; nothing is approved or sent by itself; Approve, then Send sends only approved
ones (careplan-tasks health_send), the result shows; Done closes the card only when nothing is left. A viewer who is not a
care coordinator or owner cannot approve.
(python3 tests/browser/health_update_look.py; SHOTS=<dir> also saves screenshots)"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = os.environ.get('SHOTS')
CARD = { 'id': 'chn_famcall0001', 'kind': 'health_news', 'domain': 'client_care', 'status': 'open', 'urgency': 'today', 'title': 'Health news for the care plan: Ned Fakename', 'about': 'Ned Fakename',
  'who': 'Pat Fakename', 'detail': 'On a call with Pat Fakename: Injury: Sprained left wrist', 'owner': 'samantha@mo-care.com', 'owner_name': 'Samantha Troutman', 'client_ax': '901',
  'created_at': '2026-11-05T19:20:00Z', 'due': '2026-11-06T19:20:00Z', 'created_by': 'call-tasks', 'opened_by': 'call-tasks',
  'source': { 'type': 'health_news', 'message_id': 'famcall0001', 'call_at': '2026-11-05T19:05:00Z', 'version': 'hn3-2026-11-07' },
  'history': [{ 'at': '2026-11-05T19:20:00Z', 'by': 'AI (health news)', 'text': 'Health news found on the call' }],
  'health': { 'client': 'Ned Fakename', 'client_ax': '901', 'ask': ['How should caregivers help him move with the sprain?'],
    'news': [ { 'kind': 'injury', 'what': 'Sprained left wrist, found on an X-ray', 'when': 'overnight', 'said_by': 'daughter', 'quote': 'showed a sprained left wrist' },
              { 'kind': 'help_needed', 'what': 'Max assist to stand', 'when': '', 'said_by': 'daughter', 'quote': 'they said he is max assist' } ],
    'changes': [ { 'i': 0, 'task': 'Gentle moving and repositioning', 'change': 'change', 'because': [0, 1], 'state': 'proposed', 'when': { 'text': '', 'ask': True }, 'how': { 'steps': [], 'ask': True },
        'equipment': { 'text': '', 'ask': True }, 'preferences': { 'text': '', 'ask': True }, 'safety': { 'text': 'Careful of his left wrist', 'ask': False }, 'report_if': { 'text': 'More pain', 'ask': False } } ] } }
STUB = r"""
(card)=>{
  const W=window; W.__log={ writes:[], cpt:[] };
  (0,eval)(`sb={ from:(tb)=>{ const p={ select(){return p;}, eq(){return p;}, gte(){return p;}, in(){return p;}, order(){return p;}, limit(){return p;}, not(){return p;},
      single:async()=>({ data:null, error:null }), maybeSingle:async()=>({ data:null, error:null }), then(a){ return Promise.resolve({ data:[], error:null }).then(a); } }; return p; },
    rpc:async(n)=>({data:null,error:null}), functions:{ invoke:async()=>({data:null,error:null}) }, auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };
    CC_ROLE_BY_EMAIL={ 'samantha@mo-care.com':['owner_admin'], 'viewer@mo-care.com':['scheduler'] };
    ME={ email:'samantha@mo-care.com', name:'Samantha Troutman', shift:'day' };`);
  W.persist=async(k,v)=>{ W.__log.writes.push([k, JSON.parse(JSON.stringify(v))]); };
  W.cptCall=async(body)=>{ W.__log.cpt.push(JSON.parse(JSON.stringify(body)));
    if(body.action==='health_tasks') return { client_ax:'901', tasks:[ { assignment_id:'as1', name:'Repositioning', instructions:'HOW TO HELP:\n1. Turn him every two hours', events:[] },
      { assignment_id:'as2', name:'Awareness of Diagnosis / Injury', instructions:'HEALTH UPDATE Oct 1, 2026: Uses a walker', events:[] } ],
      catalog:[ { id:77, name:'Awareness of Diagnosis / Injury' }, { id:12, name:'Repositioning' }, { id:30, name:'Meal preparation' } ], days:3,
      upcoming: W.__UP===undefined ? [ { caregiver_axiscare_id:'55', caregiver_name:'Mia Fakecare', next_start:'2026-11-07T15:00:00Z' }, { caregiver_axiscare_id:'56', caregiver_name:'Lu Fakecare', next_start:'2026-11-08T15:00:00Z' } ] : W.__UP, ...(W.__UP===null?{upcoming_error:"AxisCare's schedule could not be read"}:{}) };
    if(body.action==='health_send'){ const it=JSON.parse(JSON.stringify(DATA.ops_items.find(x=>x.id===body.card_id)));
      const steps=it.health.changes.filter(c=>c.state==='approved').map(c=>{ c.sent={ at:'2026-11-06T20:00:00Z', by:'samantha@mo-care.com', ok:true, action:c.send.mode==='add'?'added':'updated' }; return { step:'task', i:c.i, name:c.send.name, ok:true, confirmed:true }; });
      it.history.push({ at:'2026-11-06T20:00:00Z', by:'samantha@mo-care.com', text:'Sent to AxisCare: '+steps.length+' of '+steps.length+' confirmed' });
      return { outcome:'sent', steps, card:it, card_saved:true }; }
    return { error:'unexpected' }; };
  DATA.caregivers=[ { id:'g55', axiscare_id:'55', first:'Mia', last:'Fakecare', skills:{ complex_transfers:{ have:'yes', evidence:'observed' } } }, { id:'g56', axiscare_id:'56', first:'Lu', last:'Fakecare', skills:{} } ];
  DATA.ops_items=[card]; DATA.leads=[]; DATA.handoffs=[]; DATA.coverage_cases=[];
  DATA.ops_settings={ team_work_live:true, my_work_tiers_live:true };
}
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,900)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const it=()=>DATA.ops_items[0], root=()=>document.getElementById('huRoot'), txt=()=>root()?root().innerText:'';
  const btn=(a,i)=>root().querySelector('[data-hua="'+a+'"]'+(i==null?'':'[data-hui="'+i+'"]'));
  ok('the My Work card offers Review and send to AxisCare', /Review and send to AxisCare/.test(obligationOpenAction(it())) && /2 pieces of news/.test(obligationOpenAction(it())), obligationOpenAction(it()));
  await HU.open('chn_famcall0001'); await sleep(300);
  const t=txt();
  ok('the review: what was said, with the words on the call', /Health news for Ned Fakename/.test(t) && /Sprained left wrist, found on an X-ray/.test(t) && /On the call: "showed a sprained left wrist"/.test(t) && /Max assist to stand/.test(t), t.slice(0,900));
  const aw=it().health.changes.find(c=>c.i===100);
  ok('the Awareness of Diagnosis / Injury task comes first', it().health.changes[0].i===100 && /Awareness of Diagnosis \/ Injury/.test(t), it().health.changes.map(c=>c.i));
  ok('it updates the task the client already has: the dated news on top, what it said kept below', aw.send && aw.send.mode==='update' && aw.send.assignment_id==='as2'
    && /^HEALTH UPDATE Nov 5, 2026 \(call with Pat Fakename\):\n- Injury: Sprained left wrist, found on an X-ray \(overnight\)\n- Help needed: Max assist to stand\n\nHEALTH UPDATE Oct 1, 2026: Uses a walker$/.test(aw.send.instructions), aw.send);
  ok('skill check: the news (max assist) needs complex transfers, checked for each caregiver on the next 3 days', /Can the next caregivers do this\?/.test(t) && /The news needs: Complex transfers \(max assist\)/.test(t) && /Mia Fakecare/.test(t) && /Lu Fakecare/.test(t), t.slice(0,1800));
  ok('skill check: says which kind of record: seen by the office (green) or not recorded (red), and a warning, never a block', /Complex transfers \(max assist\): seen by the office/.test(t) && /Complex transfers \(max assist\): not recorded/.test(t) && /Check before the shift: 1 skill is not on record/.test(t) && /nothing changes the schedule/.test(t), t.slice(0,1800));
  ok('the new skill can be recorded in Skills and Willingness', CC_SKILLS.some(x=>x[0]==='complex_transfers'));
  ok('the care task change shows its parts; unspoken parts say Ask before approving', /Gentle moving and repositioning/.test(t) && /When: Ask before approving/.test(t) && /Safety: Careful of his left wrist/.test(t) && /Questions before approving/.test(t), t.slice(0,2500));
  ok('nothing is approved or sent by itself; Send is off until something is approved', it().health.changes.every(c=>c.state==='proposed') && !window.__log.cpt.some(c=>c.action==='health_send') && btn('send').disabled);
  ok('the change with no AxisCare task picked cannot be approved yet', btn('approve',0).disabled);
  /* pick the task the client already has: the instructions are dated, with what AxisCare said kept below */
  const sel=root().querySelector('[data-husel="0"]'); sel.value='u:as1'; sel.dispatchEvent(new Event('change',{bubbles:true})); await sleep(200);
  const c0=it().health.changes.find(c=>c.i===0);
  ok('picking a task: it updates that task; days stay as AxisCare has them', c0.send.mode==='update' && c0.send.assignment_id==='as1' && /^UPDATE Nov 5, 2026:\nSAFETY: Careful of his left wrist\nREPORT TO THE OFFICE IF: More pain\n\nHOW TO HELP:\n1\. Turn him every two hours$/.test(c0.send.instructions) && /days and times stay as AxisCare has them/.test(txt()), c0.send);
  window.__UP=null; await HU.open('chn_famcall0001'); await sleep(300);
  ok('skill check: when AxisCare\'s schedule cannot be read, it says so plainly', /AxisCare's schedule could not be read\. Check who is coming up in AxisCare yourself/.test(txt()), txt().slice(0,1500));
  window.__UP=[]; await HU.open('chn_famcall0001'); await sleep(300);
  ok('skill check: nobody scheduled in the next 3 days says so', /Nobody is scheduled with Ned Fakename in the next 3 days/.test(txt()));
  delete window.__UP;
  /* a viewer who is not a coordinator or owner */
  (0,eval)("ME={ email:'viewer@mo-care.com', name:'Viewer', shift:'day' }"); await HU.open('chn_famcall0001'); await sleep(300);
  ok('someone who is not a care coordinator or owner cannot approve', btn('approve',100).disabled && /Care coordinators and owners approve/.test(txt()));
  (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha Troutman', shift:'day' }"); await HU.open('chn_famcall0001'); await sleep(300);
  btn('approve',100).click(); await sleep(150);
  ok('Approve marks it approved by who, not sent', it().health.changes.find(c=>c.i===100).state==='approved' && it().health.changes.find(c=>c.i===100).approved_by==='Samantha Troutman' && /Approved by Samantha Troutman, not sent yet/.test(txt()) && !window.__log.cpt.some(c=>c.action==='health_send'));
  btn('skip',0).click(); await sleep(150);
  ok('Skip is kept on the card', it().health.changes.find(c=>c.i===0).state==='skipped' && /Skipped by Samantha Troutman/.test(txt()));
  ok('Done stays off while an approved change is not sent', btn('done').disabled);
  btn('send').click(); await sleep(300);
  const sends=window.__log.cpt.filter(c=>c.action==='health_send');
  ok('Send asks the server once, for this card; the approvals were saved first', sends.length===1 && sends[0].card_id==='chn_famcall0001' && window.__log.writes.some(w=>w[0]==='ops_items' && w[1].health.changes.find(c=>c.i===100).state==='approved'), [sends, window.__log.writes.length]);
  ok('the result shows: confirmed in AxisCare, and on the task', /1 of 1 confirmed in AxisCare/.test(txt()) && /In AxisCare Nov 6, 2026/.test(txt()), txt().slice(0,600));
  if(window.__SHOT) await window.__SHOT();
  btn('done').click(); await sleep(150);
  ok('Done closes the card', it().status==='done' && it().closed_by==='Samantha Troutman' && /Card closed/.test(txt()));
  HU.close();
  ok('the screen closes', !root());
  return R;
}
"""
MIME = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.json':'application/json', '.webmanifest':'application/json'}
def serve(route):
    url = route.request.url
    if 'supabase.co' in url: return route.abort()
    if not url.startswith('http://healthupdate.local/'): return route.continue_()
    p = (ROOT / url.split('http://healthupdate.local/', 1)[1].split('?')[0].split('#')[0])
    if not p.is_file(): return route.fulfill(status=404, body='')
    route.fulfill(status=200, body=p.read_bytes(), content_type=MIME.get(p.suffix, 'application/octet-stream'))
with sync_playwright() as pw:
    b = pw.chromium.launch(); cx = b.new_context(viewport={'width': 1280, 'height': 900}, timezone_id='America/Chicago'); pg = cx.new_page()
    pg.clock.install(time='2026-11-06T14:40:00-06:00'); pg.clock.resume()
    pg.route('**/*', serve)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://healthupdate.local/index.html?proof=healthupdate'); pg.wait_for_timeout(1500)
    pg.evaluate(STUB, CARD)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True)
        pg.evaluate("async()=>{ DATA.ops_items[0]=JSON.parse(JSON.stringify(DATA.ops_items[0])); const c=DATA.ops_items[0]; c.status='open'; c.health.changes.forEach(x=>{ x.state='proposed'; delete x.sent; delete x.send; }); await HU.open('chn_famcall0001'); }")
        pg.wait_for_timeout(500); pg.screenshot(path=os.path.join(SHOTS, 'health-update.png'), full_page=True)
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

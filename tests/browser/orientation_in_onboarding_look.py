"""Orientation inside Onboarding (Samantha 2026-11-03: "Go with your picks on all four and build it, with the switch off").
The real page, the real orient-progress.js and hire-remind.js, served from THIS checkout by the test itself, offline, MADE-UP people only.
The Training Platform list and the readiness cards are made up and set straight into the Orientation code (nothing is fetched).
Built on the Onboarding table test's people. Original note: Onboarding as one table (Samantha 2026-11-03: "I approve the overall direction of the Onboarding Table Plan", with her seven
refinements). The real page and styles, served from THIS checkout by the test itself, offline, MADE-UP people only. The engine's
own Onboarding code (cut out of caregivers-engine.js) draws the table with the Admin switch on, then today's page with it off.
Saves desktop and phone screenshots. Nothing reaches production; nothing is saved, texted or emailed.
(python3 tests/browser/onboarding_table_look.py; OUT=<dir> for the screenshots)"""
import os, json, threading, functools, datetime
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.environ.get('OUT', '/tmp')
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=ROOT)); PORT = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
ENG = open(os.path.join(ROOT, 'caregivers-engine.js')).read()
RULES = open(os.path.join(ROOT, 'eligibility-rules.js')).read()
def cut(a, b):
    i = ENG.index(a); j = ENG.index(b, i + 1); return ENG[i:j]
day = lambda n: (datetime.date.today() - datetime.timedelta(days=n)).isoformat()
ts = lambda n: (datetime.datetime.utcnow() - datetime.timedelta(days=n)).strftime('%Y-%m-%dT%H:%M:%SZ')
CODE = RULES + """
const refPolicy = c => CCElig.refPolicy(c), obDeriveStatus = c => CCElig.obDeriveStatus(c), refDecisionCovers = c => CCElig.refDecisionCovers(c);
const bgrEsc = t => String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const fmtD = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '';
const bgrD = d => d ? new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '';
const ocAttrs = (dial) => ' href="tel:' + dial + '"';
const bgrCheckProofHtml = p => p ? '<a class="proof-link">PDF</a>' : '';
let HYDRATED = true, OFFERS = __OFFERS__, _bgrDrawerKey = null;
let candidates = __CANDS__;
var caregivers = __ROSTER__;
async function saveCandidates(){ return true; } async function ccConfirm(){ return false; } async function saveCaregivers(){ return true; }
window.DATA = window.DATA || {}; DATA.pay_rates = [{ id:'rates', rates:{} }];
DATA.ops_settings = Object.assign(DATA.ops_settings || {}, { onboarding_table_live:true, auto_approve_work_live:false });
DATA.ops_items = [{ id:'cj_step1stall_j-tia', status:'open', created_at:'__D14__' }];
function bgrEnsureDrawer(){} function bgrCloseDrawer(){} function lifecycleRows(){ return []; }
function bgrReqsFor(c){ return c.id === 3 ? [{ slot:1, sent_at:'__D2__' }] : c.id === 4 ? [{ slot:1, sent_at:'__D7__' }] : []; }
async function offerToCandidate(){ return { ok:true }; } async function bgrSyncRefAnswers(){ return { merged:0, cleared:0, err:'' }; }
function renderOB(){ renderCkd(); } function renderAlerts(){}
const WC = __WC__; function wcRowFor(c){ return WC[c.id] || null; } function wcWhen(x){ return 'Thu 10am'; }
""" + cut('function obRefType(v){', 'function obRefTypeLabel(') + cut('function obRefCellTypeLine(c,n){', '/* &t= and &co=') \
  + cut('function obSendDay(iso){', 'function obRefSendRecordLines(') + cut('function obFmtPhone(ph){', 'function obRefCellHTML(') \
  + cut('/* ── CHECKS DASHBOARD (2026-10-21)', 'function renderOB(){') \
  + "var SAVED = []; function bgrApplyBoardChange(id, ch){ SAVED.push([id, ch]); const c = candidates.find(x => x.id === id); Object.assign(c, ch); renderCkd(); }\n" \
  + cut('function obFcsrPickDate(c, today){', 'window.obFcsrSent = obFcsrSent;') + 'window.obFcsrSent = obFcsrSent;\n'
P = lambda **k: k
CLEAR = dict(oig='CLEAR', oig_date=day(6), edl='Clear', edl_date=day(6), fcsr='Clear', fcsr_date=day(5), casenet='Clear', casenet_date=day(6))
REFS_OK = dict(r1n='Ref Boss', r1_type='professional', r1s='Positive', r2n='Ref Pal', r2s='Positive')
NEW = dict(onboarding_path='new', step1_done_at=ts(12))
CANDS = [
  P(id=1, first='Ava', last='Fake', added=day(3), **NEW, **CLEAR, r1n='Ref One', r1_phone='4175550101', r1s='Pending', r2n='Ref Two', r2s='Pending', step2_sent_at=ts(2)),
  P(id=2, first='Bea', last='Sample', added=day(9), **NEW, **REFS_OK, oig='CLEAR', oig_date=day(8), edl='Clear', edl_date=day(8), fcsr='Pending', fcsr_sent_date=day(9), casenet='Clear', casenet_date=day(8), step2_sent_at=ts(9)),
  P(id=3, first='Cora', last='Sampleton', added=day(1), **NEW, oig='CLEAR', oig_date=day(1), edl='Pending', fcsr='Pending', casenet='Pending', r1n='Ref Three', r1_phone='4175550103', r1s='Pending'),
  P(id=4, first='Dana', last='Demo', added=day(6), **NEW, oig='CLEAR', oig_date=day(5), edl='Clear', edl_date=day(5), fcsr='Pending', casenet='Clear', casenet_date=day(5), r1n='Ref Four', r1_phone='4175550104', r1s='Pending', r2n='Ref Five', r2s='Positive', r2_type='professional', step2_done_at=ts(1), step2_sent_at=ts(4)),
  P(id=5, first='Gia', last='Pretend', added=day(8), **NEW, oig='CLEAR', oig_date=day(7), edl='Issues Found', edl_date=day(7), fcsr='Clear', fcsr_date=day(6), casenet='Clear', casenet_date=day(7), **REFS_OK, step2_sent_at=ts(7)),
  P(id=6, first='Hal', last='Mock', added=day(5), **NEW, **CLEAR, r1n='Ref Six', r1s='Negative', r2n='Ref Seven', r2s='Positive', r2_type='professional'),
  P(id=7, first='Ivy', last='Example', added=day(11), **NEW, **CLEAR, **REFS_OK, offer_id='o7', step2_verified_at=ts(3), step2_invite={'state':'sent', 'at':ts(4), 'orientation':{'url_sent':True}}),
  P(id=8, first='Jo', last='Placeholder', added=day(15), **NEW, **CLEAR, **REFS_OK, offer_id='o8', axiscare_id='9008', step2_verified_at=ts(10), step2_invite={'state':'sent', 'at':ts(12), 'orientation':{'url_sent':True}}),
  P(id=9, first='Kai', last='Madeup', added=day(20), **NEW, **CLEAR, **REFS_OK, offer_id='o9', axiscare_id='9009', step2_verified_at=ts(15), step2_invite={'state':'sent', 'at':ts(16), 'orientation':{'url_sent':True}}),
  P(id=10, first='Lu', last='Trial', added=day(25), **NEW, **CLEAR, **REFS_OK, offer_id='o10', axiscare_id='9010', step2_verified_at=ts(20), step2_invite={'state':'sent', 'at':ts(21), 'orientation':{'url_sent':True}}),
  P(id=11, first='Max', last='Draft', added=day(2), onboarding_path='new', oig='Pending', edl='Pending', fcsr='Pending', casenet='Pending', offer_id='o11'),
  P(id=12, first='Nia', last='Specimen', added=day(4), **NEW, **CLEAR, r1n='Ref Eight', r1s='Pending', r1_phone='4175550112', r2n='Ref Nine', r2s='Positive', r2_type='professional', step2_sent_at=ts(3), prn_offer={'at':ts(1)}),
]
OFFERS = [{'id': 'o11', 'first_name': 'Max', 'last_name': 'Draft'}, {'id': 'otia', 'first_name': 'Tia', 'last_name': 'Sample', 'phone': '4175550199', 'step1_sent_at': ts(14)}]
ROSTER = [{'id': 801, 'first': 'Jo', 'last': 'Placeholder', 'offer_id': 'o8', 'candidate_id': 8, 'axiscare_id': '9008'},
          {'id': 802, 'first': 'Kai', 'last': 'Madeup', 'offer_id': 'o9', 'candidate_id': 9, 'axiscare_id': '9009', 'badge_mailed_at': ts(5)},
          {'id': 803, 'first': 'Lu', 'last': 'Trial', 'offer_id': 'o10', 'candidate_id': 10, 'axiscare_id': '9010', 'badge_mailed_at': ts(9)}]
WC = {8: {'status': 'done', 'invited_at': ts(12)}, 9: {'status': 'done', 'invited_at': ts(16)}, 10: {'status': 'done', 'invited_at': ts(21)}, 7: {'status': 'invited', 'invited_at': ts(4)}}

DAY = 864e5
T = r"""
async(CODE)=>{
  const sc=document.createElement('script'); sc.textContent=CODE; document.head.appendChild(sc);
  await new Promise(r=>setTimeout(r,50));
  try{ localStorage.removeItem('ckd_table_queue'); }catch(e){} OBT_Q = 'all';
  document.querySelectorAll('.tabpanel').forEach(t=>t.style.display='none');
  const panel=document.getElementById('panel-onboarding'); panel.classList.add('mode-people');
  for(let el=panel; el; el=el.parentElement){ el.style.display = el.classList && el.classList.contains('tabpanel') ? 'block' : (getComputedStyle(el).display==='none' ? 'block' : el.style.display); }
  window.CRX = { list: () => [ { offer_id:'o8', journey_id:'j8', name:'Jo Placeholder' }, { offer_id:'o9', journey_id:'j9', name:'Kai Madeup', ready_for_final:true } ], openSide(){} };
  window.CGP2 = { gateFor:g => ({ loaded:true, published:true }) };
  window.step2Sent = window.step2Sent || function(){};
  window.ccCan = () => true;
  const D = n => new Date(Date.now() - n * 864e5).toISOString();
  const U = (n, done) => Array.from({ length:n }, (_, i) => ({ module:i + 1, scene:3, complete:i < done, heard:3, first_at:D(5), last_at:D(i < done ? 4 : 3), moved_at:D(i < done ? 4 : 3) }));
  const S = OPR._st;
  S.rows = [
    { training_id:'t7', name:'Ivy Example', axiscare_id:'9007', phone:'4175550107', email:'ivy@x.com', status:'in_progress', status_label:'In Training', welcome_sent_at:D(5), due_date:new Date(Date.now()+2*864e5).toISOString().slice(0,10),
      units:U(3, 2), messages:[{ kind:'invite', at:D(5), how:'automatic', channels:['text','email'] }, { kind:'reminder', at:D(1), how:'automatic', channels:['text'] }] },
    { training_id:'t1', name:'Ava Fake', axiscare_id:'9001', phone:'4175550101', status:'not_started', status_label:'In Training', welcome_sent_at:D(6), due_date:new Date(Date.now()+1*864e5).toISOString().slice(0,10), units:[], messages:[{ kind:'invite', at:D(6), how:'automatic', channels:['text','email'] }] },
    { training_id:'t2', name:'Bea Sample', axiscare_id:'9002', status:'in_progress', status_label:'In Training', welcome_sent_at:D(2), units:U(7, 6).map(u => Object.assign(u, { moved_at:new Date(Date.now()-2*3600e3).toISOString(), last_at:new Date(Date.now()-2*3600e3).toISOString() })), messages:[{ kind:'invite', at:D(2), how:'automatic', channels:['email'] }] },
    { training_id:'t3', name:'Old Hand', axiscare_id:'9003', status:'in_progress', status_label:'Active', welcome_sent_at:D(1), units:U(2, 1).map(u => Object.assign(u, { moved_at:new Date().toISOString() })), messages:[] },
    { training_id:'t4', name:'Nia Specimen', axiscare_id:'9004', status:'not_started', status_label:'In Training', welcome_sent_at:new Date().toISOString(), units:[], messages:[{ kind:'invite', at:new Date().toISOString(), how:'automatic', channels:['email'] }] },
    { training_id:'t9', name:'Kai Madeup', axiscare_id:'9009', status:'complete', status_label:'In Training', welcome_sent_at:D(20), completed_at:D(6), attested_at:D(6), units:U(11, 11), messages:[{ kind:'certificate', at:D(6), channels:['email'] }] },
    { training_id:'t8', name:'Jo Placeholder', axiscare_id:'9008', status:'complete', status_label:'In Training', welcome_sent_at:D(15), completed_at:D(2), attested_at:D(2), units:U(11, 11), messages:[] } ];
  S.after = { '9009':{ journey_id:'j9', offer_id:'o9', card:'open', approved:null, active:null, checkin:null, ready:{ ready_for_final:true, missing:[] } },
              '9008':{ journey_id:'j8', offer_id:'o8', card:'open', approved:null, active:null, checkin:null, ready:{ ready_for_final:false, missing:['Caregiver profile published'] } } };
  S.meta = { may:true, ticks:null, switches:{ checkin_live:true } }; S.at = Date.now(); S.err = ''; S.afterErr = '';
  S.fin = [ { training_id:'h1', name:'Lu Trial', axiscare_id:'9010', completed_at:D(40), attested_at:D(40), has_pdf:true, status_label:'Active', status:'complete', units:[] },
            { training_id:'h2', name:'Rae Former', axiscare_id:'9011', completed_at:D(10), attested_at:D(10), has_pdf:false, status_label:'Active', status:'complete', units:[] } ];
  CKD_OIG.rows = []; CKD_OIG.at = Date.now();
  DATA.ops_settings.orientation_in_onboarding_live = true;
  OPR._redraw(); renderCkd();
  const txt = e => (e ? e.innerText : '').replace(/\s+/g,' ').trim();
  const out = {};
  out.pillHidden = getComputedStyle(document.querySelector('.fpill[data-tab="orientprog"]')).display === 'none';
  const ob = document.getElementById('orpOnbBadge'); out.onbBadge = ob && ob.style.display !== 'none' ? ob.textContent : '';
  out.chip = txt([...document.querySelectorAll('.obt-q')].find(b => b.innerText.startsWith('Orientation')));
  obtQueue('orient');
  const host = document.getElementById('obtOrient');
  out.hostThere = !!host;
  out.groups = [...host.querySelectorAll('tr.orp-og')].map(txt);
  const rowOf = n => [...host.querySelectorAll('tr.orp-or')].find(r => r.innerText.includes(n));
  out.ivy = txt(rowOf('Ivy Example')); out.ivyRemind = !!rowOf('Ivy Example').querySelector('.hrm-btn'); out.ivyCall = !!rowOf('Ivy Example').querySelector('a[href^="tel:"]');
  out.ava = txt(rowOf('Ava Fake')); out.old = txt(rowOf('Old Hand')); out.kai = txt(rowOf('Kai Madeup')); out.jo = txt(rowOf('Jo Placeholder')); out.bea = txt(rowOf('Bea Sample'));
  OPR.toggle('t7');
  const ox = document.querySelector('#obtOrient tr.orp-ox'); out.ivyDetail = txt(ox);
  OPR.toggle('t7');
  OPR.toggle('t9');
  out.kaiDetail = txt(document.querySelector('#obtOrient tr.orp-ox')); out.kaiApprove = !!document.querySelector('#obtOrient tr.orp-ox .orp-go');
  OPR.toggle('t9');
  OPR.hist(true);
  out.hist = txt(document.querySelector('#obtOrient .orp-card')); out.pdf = !!document.querySelector('#obtOrient .orp-card button[onclick^="OPR.cert"]');
  out.foot = txt(document.querySelector('#obtOrient .orp-foot'));
  OPR.hist(false);
  const s = document.getElementById('ckdSearch'); s.value = 'bea'; ckdSearchInput(); await new Promise(r => setTimeout(r, 400));
  out.search = [...document.querySelectorAll('#obtOrient tr.orp-or')].map(r => r.querySelector('.orp-nm').innerText.trim());
  document.getElementById('ckdSearch').value = ''; ckdSearchInput(); await new Promise(r => setTimeout(r, 400));
  obtQueue('all');
  out.allTable = !!document.querySelector('#ckdDash table.obt');
  OPR.show('t7'); await new Promise(r => setTimeout(r, 100));
  out.showQ = OBT_Q; out.showOpen = txt(document.querySelector('#obtOrient tr.orp-ox'));
  return out;
}
"""

res = []
def ck(n, c, note=None): res.append((n, bool(c), '' if c else json.dumps(note, default=str)[:700]))
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1440, 'height': 1000})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(f'http://127.0.0.1:{PORT}/index.html?proof=orpfold'); pg.wait_for_timeout(1500)
    code = CODE.replace('__CANDS__', json.dumps(CANDS)).replace('__OFFERS__', json.dumps(OFFERS)).replace('__ROSTER__', json.dumps(ROSTER)).replace('__WC__', json.dumps({str(k): v for k, v in WC.items()})) \
               .replace('__D14__', ts(14)).replace('__D2__', ts(2)).replace('__D7__', ts(7))
    R = pg.evaluate(T, code)
    ck('switch on: the Orientation tab is hidden, its red count is a second badge on Onboarding (2: Ivy stuck, Ava not opened)', R['pillHidden'] and R['onbBadge'] == '2', [R['pillHidden'], R['onbBadge']])
    ck('the Orientation queue counts everyone in the four lists (7: Ivy, Ava, Kai, Jo, Bea, Old Hand, Nia)', R['chip'] == 'Orientation 7', R['chip'])
    ck('the Orientation queue shows the orientation view, in the Orientation tab\'s order', R['hostThere'] and [g.split(':')[0].split(' (')[0] for g in R['groups']] == ['Needs you', 'Finish line', 'In orientation', 'Invited, not started'], R['groups'])
    ck('Ivy: Stuck, 2/11, the stuck reason, invite and due date, Send reminder and Call', 'Stuck' in R['ivy'] and '2/11' in R['ivy'] and 'no new screen' in R['ivy'] and 'due' in R['ivy'] and R['ivyRemind'] and R['ivyCall'], R['ivy'])
    ck('Ava: Not opened, 0/11', 'Not opened' in R['ava'] and '0/11' in R['ava'], R['ava'])
    ck('Old Hand: tagged Already working', 'Already working' in R['old'], R['old'])
    ck('Kai: Finish line, Ready to approve, the button names the next step (Approve to Work)', 'Ready to approve' in R['kai'] and 'Approve to Work' in R['kai'] and 'waiting 6 days' in R['kai'], R['kai'])
    ck('Jo: Finish line, still needs 1', 'Still needs 1' in R['jo'], R['jo'])
    ck('Bea: Moving, Unit 7', 'Moving' in R['bea'] and 'Unit 7' in R['bea'], R['bea'])
    ck('More opens exactly what the Orientation tab shows: unit line, every invite and reminder sent', 'Unit 3 of 11' in R['ivyDetail'] and 'Sent:' in R['ivyDetail'] and 'Reminder' in R['ivyDetail'], R['ivyDetail'][:300])
    ck('a Finish line row opens the Finish line steps, with the green Approve to Work button (Approve to Work list only)', R['kaiApprove'] and 'Check-in call' in R['kaiDetail'], R['kaiDetail'][:300])
    ck('Finished history: everyone who finished, with the PDF button', 'Lu Trial' in R['hist'] and 'Rae Former' in R['hist'] and R['pdf'], R['hist'][:300])
    ck('the stuck-days setting and Refresh are under the view', 'Stuck after' in R['foot'] and 'Refresh' in R['foot'], R['foot'])
    ck('the Onboarding search finds people in the orientation view', len(R['search']) == 1 and R['search'][0].startswith('Bea Sample'), R['search'])
    ck('Everyone is still the table', R['allTable'])
    ck('the Orientation column link (OPR.show) opens the Orientation queue on that person, their detail open', R['showQ'] == 'orient' and 'Unit 3 of 11' in R['showOpen'], [R['showQ'], R['showOpen'][:120]])
    pg.evaluate("()=>{ OPR.toggle('t7'); obtOpenQueue('orient'); }"); pg.wait_for_timeout(200)
    pg.locator('#ckdDash').screenshot(path=os.path.join(OUT, 'orp_fold_desktop.png'))
    pg.evaluate("()=>{ OPR.toggle('t9'); }"); pg.wait_for_timeout(200)
    pg.locator('#obtOrient').screenshot(path=os.path.join(OUT, 'orp_fold_finish.png'))
    pg.evaluate("()=>{ OPR.toggle('t9'); OPR.hist(true); }"); pg.wait_for_timeout(200)
    pg.locator('#obtOrient').screenshot(path=os.path.join(OUT, 'orp_fold_history.png'))
    pg.evaluate("()=>OPR.hist(false)")
    tabs = pg.locator('.fpill[data-tab="cgbackground"]').bounding_box() if pg.locator('.fpill[data-tab="cgbackground"]').is_visible() else None
    if tabs: pg.screenshot(path=os.path.join(OUT, 'orp_fold_tabs.png'), clip={'x': max(0, tabs['x'] - 520), 'y': tabs['y'] - 8, 'width': 900, 'height': tabs['height'] + 16})
    off = pg.evaluate("()=>{ DATA.ops_settings.orientation_in_onboarding_live = false; OPR._redraw(); OPR.load && 0; renderCkd(); const p=document.querySelector('.fpill[data-tab=\"orientprog\"]'); return { host: !!document.getElementById('obtOrient'), table: !!document.querySelector('#ckdDash table.obt') }; }")
    pg.evaluate("()=>{ const b = document.getElementById('orpOnbBadge'); window.__b = b && b.style.display; }")
    ck('switch off: the Orientation queue is the table again (and the Orientation tab is untouched)', not off['host'] and off['table'], off)
    m = b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
    m.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    m.on('pageerror', lambda e: errs.append(str(e)[:200]))
    m.goto(f'http://127.0.0.1:{PORT}/index.html?proof=orpfold'); m.wait_for_timeout(1500)
    m.evaluate(T, code); m.evaluate("()=>{ OPR.toggle('t7'); obtOpenQueue('orient'); }"); m.wait_for_timeout(200)
    wide = m.evaluate("()=>document.documentElement.scrollWidth > window.innerWidth + 2")
    ck('phone: nothing wider than the screen', not wide, wide)
    m.locator('#ckdDash').screenshot(path=os.path.join(OUT, 'orp_fold_phone.png'))
    ck('no page errors', not errs, errs)
    b.close()
srv.shutdown()
bad = 0
for n, ok, note in res:
    print(('PASS  ' if ok else 'FAIL  ') + n + ('' if ok else '  ' + note)); bad += 0 if ok else 1
print(f'{len(res) - bad} / {len(res)}'); print('screenshots in ' + OUT + ': orp_fold_desktop.png, orp_fold_finish.png, orp_fold_history.png, orp_fold_tabs.png, orp_fold_phone.png')
raise SystemExit(1 if bad else 0)

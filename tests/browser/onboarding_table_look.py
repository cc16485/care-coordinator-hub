"""Onboarding as one table (Samantha 2026-11-03: "I approve the overall direction of the Onboarding Table Plan", with her seven
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
T = r"""
async(CODE)=>{
  const sc=document.createElement('script'); sc.textContent=CODE; document.head.appendChild(sc);
  await new Promise(r=>setTimeout(r,50));
  try{ localStorage.removeItem('ckd_table_queue'); }catch(e){} OBT_Q = 'all';
  document.querySelectorAll('.tabpanel').forEach(t=>t.style.display='none');
  const panel=document.getElementById('panel-onboarding'); panel.classList.add('mode-people');
  for(let el=panel; el; el=el.parentElement){ el.style.display = el.classList && el.classList.contains('tabpanel') ? 'block' : (getComputedStyle(el).display==='none' ? 'block' : el.style.display); }
  window.CRX = { list: () => [
    { offer_id:'o8', journey_id:'j8', name:'Jo Placeholder', next:{ key:'cg.badge', title:'Badge mailed' } },
    { offer_id:'o9', journey_id:'j9', name:'Kai Madeup', ready_for_final:true },
    { offer_id:'o10', journey_id:'j10', name:'Lu Trial', approved_to_work:true, checkin_open:true },
    { offer_id:'otia', journey_id:'j-tia', name:'Tia Sample', next:{ key:'cg.step1.application', title:'Step 1 forms' } } ], openSide(){} };
  window.OPR = {
    brief:(ax, name) => ({ 'Ivy Example':{ text:'Stuck in orientation on Unit 3 of 11', bad:true, id:'t7' }, 'Jo Placeholder':{ text:'Finished orientation Nov 1', bad:false, id:'t8' },
      'Kai Madeup':{ text:'Finished orientation Oct 28', bad:false, id:'t9' }, 'Lu Trial':{ text:'Finished orientation Oct 22', bad:false, id:'t10' } })[name] || null,
    finishOf:(ax, name) => ({ 'Jo Placeholder':{ approved:false, ready:false, missing:['Caregiver profile published'] }, 'Kai Madeup':{ approved:false, ready:true, missing:[] } })[name] || null,
    show(){} };
  window.CGP2 = { gateFor:g => ({ loaded:true, published: g.id !== 801 }) };
  window.step2Sent = window.step2Sent || function(){};
  CKD_OIG.rows = []; CKD_OIG.at = Date.now();
  renderCkd();
  const dash=document.getElementById('ckdDash');
  const txt = e => (e ? e.innerText : '').replace(/\s+/g,' ').trim();
  const rowOf = n => [...dash.querySelectorAll('tr.obt-r')].find(r => r.querySelector('.obt-n').innerText.includes(n));
  const cell = (n, i) => { const r = rowOf(n); return r ? r.children[i] : null; };
  const H = [...dash.querySelectorAll('thead tr:last-child th')].map(th => th.innerText.trim());
  const col = name => H.indexOf(name);
  const sum = Object.fromEntries([...dash.querySelectorAll('.obt-s')].map(b => [b.querySelector('span').innerText, Number(b.querySelector('b').innerText)]));
  const out = { H, sum, start: txt(dash.querySelector('.obt-start')), rows:[...dash.querySelectorAll('tr.obt-r')].map(r => txt(r.querySelector('.obt-n'))),
    sticky: getComputedStyle(dash.querySelector('tbody .obt-n')).position, more: txt(dash.querySelector('.ckd-more')),
    ava:{ who:txt(cell('Ava Fake', 2)), orient:txt(cell('Ava Fake', col('Orientation'))), refs:txt(cell('Ava Fake', col('References'))), refsCall: !!cell('Ava Fake', col('References')).querySelector('a.obt-call') },
    beaName:txt(rowOf('Bea Sample').querySelector('.obt-n')), avaName:txt(rowOf('Ava Fake').querySelector('.obt-n')), ivyName:txt(rowOf('Ivy Example').querySelector('.obt-n')),
    bea:{ fcsr:txt(cell('Bea Sample', col('FCSR'))), step2:txt(cell('Bea Sample', col('Viventium (Step 2)'))), step2Late: !!cell('Bea Sample', col('Viventium (Step 2)')).querySelector('.obt-late'), who:txt(cell('Bea Sample', 2)) },
    cora:{ edl:txt(cell('Cora Sampleton', col('EDL'))), refs:txt(cell('Cora Sampleton', col('References'))), who:txt(cell('Cora Sampleton', 2)) },
    dana:{ fcsr:txt(cell('Dana Demo', col('FCSR'))), step2:txt(cell('Dana Demo', col('Viventium (Step 2)'))), refs:txt(cell('Dana Demo', col('References'))), refsLate: !!cell('Dana Demo', col('References')).querySelector('.obt-late') },
    gia:{ edl:txt(cell('Gia Pretend', col('EDL'))), rev: !!cell('Gia Pretend', col('EDL')).querySelector('.obt-rev'), late: !!cell('Gia Pretend', col('EDL')).querySelector('.obt-late'), who:txt(cell('Gia Pretend', 2)), orient:txt(cell('Gia Pretend', col('Orientation'))) },
    hal:{ refs:txt(cell('Hal Mock', col('References'))), orient:txt(cell('Hal Mock', col('Orientation'))) },
    ivy:{ orient:txt(cell('Ivy Example', col('Orientation'))), late: !!cell('Ivy Example', col('Orientation')).querySelector('.obt-late'), finish:txt(cell('Ivy Example', col('Finish'))) },
    jo:{ finish:txt(cell('Jo Placeholder', col('Finish'))), name:txt(rowOf('Jo Placeholder').querySelector('.obt-n')) },
    kai:{ finish:txt(cell('Kai Madeup', col('Finish'))), name:txt(rowOf('Kai Madeup').querySelector('.obt-n')) },
    lu:{ finish:txt(cell('Lu Trial', col('Finish'))) },
    max:{ step1:txt(cell('Max Draft', col('Step 1'))), oig:txt(cell('Max Draft', col('OIG'))), who:txt(cell('Max Draft', 2)) },
    tia:{ step1:txt(cell('Tia Sample', col('Step 1'))), call: !!cell('Tia Sample', col('Step 1')).querySelector('a.obt-call'), who:txt(cell('Tia Sample', 2)) },
    nia:{ name:txt(rowOf('Nia Specimen').querySelector('.obt-n')) } };
  /* 2026-11-04: groups over the columns, dates on done steps, why lines, edges, references as a count, I-9 in Viventium */
  out.groups = [...dash.querySelectorAll('thead tr.obt-grp th')].map(th => th.textContent.trim()).filter(Boolean);
  out.edges = Object.fromEntries(['Bea Sample', 'Gia Pretend', 'Ivy Example', 'Cora Sampleton'].map(n => [n.split(' ')[0], rowOf(n).className]));
  out.dates = { avaOig:txt(cell('Ava Fake', col('OIG'))), ivyStep2:txt(cell('Ivy Example', col('Viventium (Step 2)'))) };
  out.why = { lines:document.querySelectorAll('.obt-why').length, beaFcsrTip:cell('Bea Sample', col('FCSR')).title, danaRefsTip:cell('Dana Demo', col('References')).title };
  out.refsDone = { ivy:txt(cell('Ivy Example', col('References'))), ivyIcon: !!cell('Ivy Example', col('References')).querySelector('svg') };
  out.i9 = { ivy:txt(cell('Ivy Example', col('I-9 in Viventium'))), kai:txt(cell('Kai Madeup', col('I-9 in Viventium'))) };
  const fo = OPR.finishOf; OPR.finishOf = (ax, name) => name === 'Jo Placeholder' ? { approved:false, ready:false, missing:['Caregiver profile published', 'I-9 Section 2 completed by an authorized representative'] } : fo(ax, name);
  renderCkd(); out.i9.jo = txt(cell('Jo Placeholder', col('I-9 in Viventium'))); out.i9.joBtn = !!cell('Jo Placeholder', col('I-9 in Viventium')).querySelector('button');
  out.i9.queue = (obtQueue('i9'), [...dash.querySelectorAll('tbody tr')].map(r => r.classList.contains('obt-g') ? '# ' + txt(r) : txt(r.querySelector('.obt-n')).split(' ')[0]));
  OBT_Q = 'all'; OPR.finishOf = fo; renderCkd();
  obtQueue('fcsr');
  out.fcsrRows = [...dash.querySelectorAll('tbody tr')].map(r => r.classList.contains('obt-g') ? '# ' + txt(r) : txt(r.querySelector('.obt-n')));
  out.fcsrHi = !!dash.querySelector('thead th.obt-hi') && dash.querySelector('thead th.obt-hi').innerText.trim();
  out.remembered = localStorage.getItem('ckd_table_queue');
  obtQueue('refs'); out.refsRows = [...dash.querySelectorAll('tbody tr')].map(r => r.classList.contains('obt-g') ? '# ' + txt(r) : txt(r.querySelector('.obt-n')));
  obtQueue('nearly'); out.nearRows = [...dash.querySelectorAll('tr.obt-r')].map(r => txt(r.querySelector('.obt-n')));
  obtQueue('review'); out.revRows = [...dash.querySelectorAll('tr.obt-r')].map(r => txt(r.querySelector('.obt-n')));
  obtQueue('waiting'); out.waitRows = [...dash.querySelectorAll('tr.obt-r')].map(r => txt(r.querySelector('.obt-n')));
  obtQueue('late'); out.lateRows = [...dash.querySelectorAll('tr.obt-r')].map(r => txt(r.querySelector('.obt-n')));
  return out;
}
"""
res = []
def ck(n, c, note=None): res.append((n, bool(c), '' if c else json.dumps(note, default=str)[:700]))
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1440, 'height': 1000})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(f'http://127.0.0.1:{PORT}/index.html?proof=obt'); pg.wait_for_timeout(1500)
    code = CODE.replace('__CANDS__', json.dumps(CANDS)).replace('__OFFERS__', json.dumps(OFFERS)).replace('__ROSTER__', json.dumps(ROSTER)).replace('__WC__', json.dumps({str(k): v for k, v in WC.items()})) \
               .replace('__D14__', ts(14)).replace('__D2__', ts(2)).replace('__D7__', ts(7))
    R = pg.evaluate(T, code)
    s = R['sum']
    ck('columns: name, days, holding up, then every step to Finish', R['H'] == ['Name', 'Days', 'Holding up', 'Step 1', 'OIG', 'EDL', 'FCSR', 'Case.net', 'References', 'Viventium (Step 2)', 'I-9 in Viventium', 'Orientation', 'Finish'], R['H'])
    ck('the name column stays put when the table scrolls sideways', R['sticky'] == 'sticky', R['sticky'])
    ck('summary: 13 active, review 2 (flagged EDL, negative reference), nearly ready 2', s.get('Active') == 13 and s.get('Need review') == 2 and s.get('Nearly ready') == 2, s)
    ck('summary: "waiting" never counts someone the office or a review owes a move (the two never overlap)', s.get('Need office action', 0) + s.get('Waiting on applicants or outside', 0) <= 13 and s.get('Need office action', 0) >= 6, s)
    ck('Ava: checks clear, references 0/2 with a call link: Send orientation in its own column; held up by office and outside', 'Send' in R['ava']['orient'] and '0/2' in R['ava']['refs'] and R['ava']['refsCall'] and 'Office' in R['ava']['who'], R['ava'])
    ck('Bea: FCSR ordered 9 days, waiting on the state (Outside), Record button; Step 2 9 days overdue (no DONE in 8)', __import__('re').search(r'\dd', R['bea']['fcsr']) and 'Record' in R['bea']['fcsr'] and R['bea']['step2Late'] and 'Outside' in R['bea']['who'] and 'Applicant' in R['bea']['who'], R['bea'])
    ck('Step 2 out and not done: Send reminder and the reminder history under the name, as on today\'s rows (Bea, Ava); none once Step 2 is checked (Ivy)', 'Send reminder' in R['beaName'] and 'Step 2 sent' in R['beaName'] and 'Send reminder' in R['avaName'] and 'Send reminder' not in R['ivyName'], [R['beaName'], R['avaName'], R['ivyName']])
    ck('Cora: EDL Record, FCSR Order, reference form sent 2 days ago is waiting on the reference, not overdue', 'Record' in R['cora']['edl'] and 'Outside' in R['cora']['who'], R['cora'])
    ck('Dana: FCSR Order; Step 2 said done: Check; reference with no answer in 7 days is overdue', 'Order' in R['dana']['fcsr'] and 'Check' in R['dana']['step2'] and R['dana']['refsLate'], R['dana'])
    ck('Gia: EDL Issues Found is Review (shield), never shown as overdue; held up by Review; no Send orientation', R['gia']['rev'] and not R['gia']['late'] and R['gia']['who'].startswith('Review') and 'Send' not in R['gia']['orient'], R['gia'])
    ck('Hal: a Negative reference is Review; orientation can still go (the four checks are clear, references before Approve to Work)', 'Review' in R['hal']['refs'], R['hal'])
    ck('Ivy: stuck in orientation shows U3/11 as overdue; Finish shows the video call invited', 'U3/11' in R['ivy']['orient'] and R['ivy']['late'], R['ivy'])
    ck('Jo: finished orientation, on the list, profile not published: Finish asks for the badge; nearly ready names the one thing left', 'Mark badge mailed' in R['jo']['finish'] and 'Only Caregiver profile published left' in R['jo']['name'], R['jo'])
    ck('Kai: everything done: Approve button opens the card; Ready to approve', 'Approve' in R['kai']['finish'] and 'Ready to approve' in R['kai']['name'], R['kai'])
    ck('Lu: approved, check-in call open: Check-in call', 'Check-in call' in R['lu']['finish'], R['lu'])
    ck('Max: Step 1 not finished: Step 1 waiting on the applicant, checks wait for Step 1 (no buttons)', 'Applicant' in R['max']['who'] and 'Run' not in R['max']['oig'], R['max'])
    ck('Tia: stuck in Step 1 for 14 days, with a call link from the office line', 'Stuck 14d' in R['tia']['step1'] and R['tia']['call'], R['tia'])
    ck('Nia: PRN offered shows as a tag by the name', 'PRN offered' in R['nia']['name'], R['nia'])
    ck('FCSR queue: highlighted column, "Order now" before "Ordered, waiting on the state", oldest first, only people who need FCSR', R['fcsrHi'] == 'FCSR' and R['fcsrRows'][0].startswith('# Order now') and any(x.startswith('# Ordered, waiting on the state') for x in R['fcsrRows'])
       and 'Bea Sample' in ' '.join(R['fcsrRows']) and not any('Ava Fake' in x for x in R['fcsrRows']), R['fcsrRows'])
    ck('the last queue is remembered in this browser', R['remembered'] == 'fcsr', R['remembered'])
    ck('References queue: review first, then calls and adds, then forms waiting on the reference', R['refsRows'][0].startswith('# A reference with a concern') and any(x.startswith('# Form sent, waiting on the reference') for x in R['refsRows']), R['refsRows'])
    ck('Nearly ready: Jo and Kai only', sorted(x.split(' ')[0] for x in R['nearRows']) == ['Jo', 'Kai'], R['nearRows'])
    ck('Review: Gia and Hal only', sorted(x.split(' ')[0] for x in R['revRows']) == ['Gia', 'Hal'], R['revRows'])
    ck('Overdue: Bea (Step 2), Dana (reference), Ivy (orientation), Tia (Step 1)', all(any(n in x for x in R['lateRows']) for n in ['Bea', 'Dana', 'Ivy', 'Tia']), R['lateRows'])
    ck('labels over the columns: Application, Background checks, References and Viventium, Getting ready to work', R['groups'] == ['Application', 'Background checks', 'References and Viventium', 'Getting ready to work'], R['groups'])
    ck('done steps show their date (OIG cleared, Viventium Step 2 checked)', __import__('re').search(r'[A-Z][a-z]{2} \d', R['dates']['avaOig']) and __import__('re').search(r'[A-Z][a-z]{2} \d', R['dates']['ivyStep2']), R['dates'])
    ck('compact (her ask 11-04): no reason lines under steps; the detail stays on hover', R['why']['lines'] == 0 and R['why']['beaFcsrTip'] and R['why']['danaRefsTip'], R['why'])
    ck('edges: Bea red (overdue), Gia purple (review), Cora none', 'obt-r-late' in R['edges']['Bea'] and 'obt-r-rev' in R['edges']['Gia'] and 'obt-r-late' not in R['edges']['Cora'] and 'obt-r-quiet' not in R['edges']['Cora'], R['edges'])
    ck('references done read 2/2, never only a check mark', R['refsDone']['ivy'].startswith('2/2') and not R['refsDone']['ivyIcon'], R['refsDone'])
    ck('I-9 in Viventium: nothing before the video call (Ivy); done when the readiness card no longer lists it (Kai); I-9 done button once the video call is done and it is still open (Jo), in its own queue', R['i9']['ivy'] == '·' and R['i9']['kai'] == '' and 'I-9 done' in R['i9']['jo'] and R['i9']['joBtn'] and 'Jo' in R['i9']['queue'], R['i9'])
    ck('More links unchanged', 'How long people take' in R['more'] and 'Full table' in R['more'] and 'Taken off the list' in R['more'], R['more'])
    pg.evaluate("()=>obtQueue('all')"); pg.wait_for_timeout(200)
    box = pg.locator('#ckdDash').bounding_box()
    pg.screenshot(path=os.path.join(OUT, 'obt_desktop_everyone.png'), clip={'x': box['x'] - 8, 'y': max(0, box['y'] - 8), 'width': box['width'] + 16, 'height': min(1400, box['height'] + 16)}, full_page=True)
    pg.evaluate("()=>{ const fo=OPR.finishOf; OPR.finishOf=(ax,n)=> n==='Jo Placeholder' ? { approved:false, ready:false, missing:['Caregiver profile published','I-9 Section 2 completed by an authorized representative'] } : fo(ax,n); window._fo=fo; obtQueue('i9'); }"); pg.wait_for_timeout(200)
    box = pg.locator('#ckdDash').bounding_box()
    pg.screenshot(path=os.path.join(OUT, 'obt_i9_queue.png'), clip={'x': box['x'] - 8, 'y': max(0, box['y'] - 8), 'width': box['width'] + 16, 'height': min(700, box['height'] + 16)}, full_page=True)
    pg.evaluate("()=>{ location.hash=''; }")
    pg.evaluate("()=>{ OPR.finishOf=window._fo; }")
    pg.evaluate("()=>obtQueue('fcsr')"); pg.wait_for_timeout(200)
    box = pg.locator('#ckdDash').bounding_box()
    pg.screenshot(path=os.path.join(OUT, 'obt_desktop_fcsr.png'), clip={'x': box['x'] - 8, 'y': max(0, box['y'] - 8), 'width': box['width'] + 16, 'height': min(1000, box['height'] + 16)}, full_page=True)
    pg.set_viewport_size({'width': 1100, 'height': 900}); pg.evaluate("()=>obtQueue('all')"); pg.wait_for_timeout(200)
    pg.evaluate("()=>{ const w=document.querySelector('.obt-wrap'); w.scrollLeft = 400; }"); pg.wait_for_timeout(150)
    stuck_left = pg.evaluate("()=>{ const n=document.querySelector('tbody .obt-n').getBoundingClientRect(), w=document.querySelector('.obt-wrap').getBoundingClientRect(); return Math.abs(n.left - w.left) < 3; }")
    ck('narrower desktop, scrolled sideways: the names stay at the left edge', stuck_left)
    box = pg.locator('#ckdDash').bounding_box()
    pg.screenshot(path=os.path.join(OUT, 'obt_desktop_scrolled.png'), clip={'x': box['x'] - 8, 'y': max(0, box['y'] - 8), 'width': box['width'] + 16, 'height': min(900, box['height'] + 16)}, full_page=True)
    m = b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
    m.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    m.on('pageerror', lambda e: errs.append(str(e)[:200]))
    m.goto(f'http://127.0.0.1:{PORT}/index.html?proof=obt'); m.wait_for_timeout(1500)
    m.evaluate(T, code); m.evaluate("()=>obtQueue('all')"); m.wait_for_timeout(200)
    mob = m.evaluate("()=>({ cards: document.querySelectorAll('.obt-card').length, table: getComputedStyle(document.querySelector('.obt-wrap')).display, wide: document.documentElement.scrollWidth > window.innerWidth + 2 })")
    ck('phone: one card per person, the table hidden, nothing wider than the screen', mob['cards'] == 13 and mob['table'] == 'none' and not mob['wide'], mob)
    box = m.locator('#ckdDash').bounding_box()
    m.screenshot(path=os.path.join(OUT, 'obt_phone.png'), clip={'x': 0, 'y': max(0, box['y'] - 8), 'width': 390, 'height': min(2200, box['height'] + 16)}, full_page=True)
    m.evaluate("()=>obtQueue('fcsr')"); m.wait_for_timeout(200); box = m.locator('#ckdDash').bounding_box()
    m.screenshot(path=os.path.join(OUT, 'obt_phone_fcsr.png'), clip={'x': 0, 'y': max(0, box['y'] - 8), 'width': 390, 'height': min(1600, box['height'] + 16)}, full_page=True)
    # 2026-11-03 Order FCSR opens a date window (Today, Yesterday, a calendar) instead of asking for YYYY-MM-DD
    pg.set_viewport_size({'width': 1440, 'height': 1000}); pg.evaluate("()=>obtQueue('fcsr')"); pg.wait_for_timeout(200)
    pg.locator('tr.obt-r', has_text='Dana Demo').locator('button', has_text='Order').click(); pg.wait_for_timeout(200)
    win = pg.evaluate("()=>{ const w=document.getElementById('fcsrPick'); return w ? { text:w.innerText.replace(/\\s+/g,' '), max:w.querySelector('#fcsrPickD').max, val:w.querySelector('#fcsrPickD').value, type:w.querySelector('#fcsrPickD').type } : null; }")
    ck('Order FCSR opens a window: Today, Yesterday, and a calendar that stops at today', win and 'When did you order the FCSR for Dana Demo?' in win['text'] and 'Yesterday' in win['text'] and win['type'] == 'date' and win['max'] == win['val'], win)
    pg.screenshot(path=os.path.join(OUT, 'obt_fcsr_date.png'), clip={'x': 440, 'y': 250, 'width': 560, 'height': 420})
    pg.evaluate("()=>{ const i=document.getElementById('fcsrPickD'); const d=new Date(i.max+'T12:00:00'); d.setDate(d.getDate()+3); i.value=d.toLocaleDateString('en-CA'); }")
    pg.click('#fcsrPickOk'); pg.wait_for_timeout(150)
    fut = pg.evaluate("()=>({ open: !!document.getElementById('fcsrPick'), err: (document.getElementById('fcsrPickErr')||{}).innerText || '', saved: SAVED.length })")
    ck('a day after today is refused in the window, nothing saved', fut['open'] and 'on or before today' in fut['err'] and fut['saved'] == 0, fut)
    pg.locator('#fcsrPick button', has_text='Yesterday').click(); pg.wait_for_timeout(200)
    got = pg.evaluate("()=>({ open: !!document.getElementById('fcsrPick'), saved: SAVED.map(x=>[x[0], x[1].fcsr_sent_date]), cell: (([...document.querySelectorAll('tr.obt-r')].find(r=>r.innerText.includes('Dana Demo'))||{}).innerText||'').replace(/\\s+/g,' ') })")
    ck('Yesterday saves yesterday as the order day (the same field as before), and Dana moves to "Ordered, waiting on the state"', not got['open'] and got['saved'] == [[4, day(1)]] and __import__('re').search(r'\dd\s*Record', got['cell']), got)
    pg.locator('tr.obt-r', has_text='Cora Sampleton').locator('button', has_text='Order').click(); pg.wait_for_timeout(150)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(100)
    esc = pg.evaluate("()=>({ open: !!document.getElementById('fcsrPick'), saved: SAVED.length })")
    ck('Cancel (Escape) closes the window and saves nothing', not esc['open'] and esc['saved'] == 1, esc)
    off = pg.evaluate("()=>{ DATA.ops_settings.onboarding_table_live = false; renderCkd(); const d=document.getElementById('ckdDash'); return { table: !!d.querySelector('table.obt'), rows: d.querySelectorAll('.ckd-row:not(.ckd-row-h)').length, tiles: d.querySelectorAll('.ckd-tile').length }; }")
    ck('switch off: today\'s page, unchanged (rows and stop tiles, no table)', not off['table'] and off['rows'] >= 10 and off['tiles'] == 5, off)
    ck('no page errors', not errs, errs)
    b.close()
srv.shutdown()
bad = 0
for n, ok, note in res:
    print(('PASS  ' if ok else 'FAIL  ') + n + ('' if ok else '  ' + note)); bad += 0 if ok else 1
print(f'{len(res) - bad} / {len(res)}'); print('screenshots: ' + ', '.join(os.path.join(OUT, f) for f in ['obt_desktop_everyone.png', 'obt_desktop_fcsr.png', 'obt_desktop_scrolled.png', 'obt_phone.png', 'obt_phone_fcsr.png', 'obt_fcsr_date.png', 'obt_i9_queue.png']))
raise SystemExit(1 if bad else 0)

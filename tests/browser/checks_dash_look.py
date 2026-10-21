"""Checks dashboard (2026-10-21): the real page and styles, offline, FAKE people only. The engine's own dashboard code
(cut out of caregivers-engine.js) draws People & Checks and one person's checklist. Saves two screenshots and checks
what the coordinator sees. Nothing reaches production; nothing is sent."""
import os, json
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..', '..')
PORT = os.environ.get('PORT', '8793'); OUT = os.environ.get('OUT', '/tmp')
ENG = open(os.path.join(ROOT, 'caregivers-engine.js')).read()
RULES = open(os.path.join(ROOT, 'eligibility-rules.js')).read()
def cut(a, b):
    i = ENG.index(a); j = ENG.index(b, i + 1); return ENG[i:j]
day = lambda n: __import__('datetime').date.fromordinal(__import__('datetime').date.today().toordinal() - n).isoformat()
CODE = RULES + """
const refPolicy = c => CCElig.refPolicy(c), obDeriveStatus = c => CCElig.obDeriveStatus(c), refDecisionCovers = c => CCElig.refDecisionCovers(c);
const bgrEsc = t => String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const fmtD = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '';
const bgrD = d => d ? new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '';
const ocAttrs = (dial) => ' href="tel:' + dial + '"';
const bgrCheckProofHtml = p => p ? '<a class="proof-link">PDF</a>' : '';
let HYDRATED = true, OFFERS = [], _bgrDrawerKey = null;
let candidates = __CANDS__;
function bgrEnsureDrawer(){ if(document.getElementById('bgrDrawer')) return;
  const bd=document.createElement('div'); bd.id='bgrDrawerBackdrop'; bd.style.cssText='display:none;position:fixed;inset:0;background:rgba(15,54,95,.28);z-index:9998';
  const dr=document.createElement('div'); dr.id='bgrDrawer'; dr.style.cssText='position:fixed;top:0;right:0;bottom:0;width:470px;background:#fff;z-index:9999;overflow-y:auto';
  document.body.appendChild(bd); document.body.appendChild(dr); }
function bgrCloseDrawer(){}
function lifecycleRows(){ return []; }
async function offerToCandidate(){ return { ok:true }; }
async function bgrSyncRefAnswers(){ return { merged:0, cleared:0, err:'' }; }
function renderOB(){ renderCkd(); } function renderAlerts(){}
""" + cut('function obRefType(v){', 'function obRefTypeLabel(') + cut('function obRefCellTypeLine(c,n){', '/* &t= and &co=') \
  + cut('function obSendDay(iso){', 'function obRefSendRecordLines(') + cut('function obFmtPhone(ph){', 'function obRefCellHTML(') \
  + cut('/* ── CHECKS DASHBOARD (2026-10-21)', 'function renderOB(){')
P = lambda **k: k
CANDS = [
  P(id=1, first='Claire', last='Sample', added=day(13), position='Caregiver', r1n='Susie Boss', r1_type='professional', r1_company='Lakeview Childcare', r1_phone='4175550101', r1s='Pending',
    r2n='Pat Friend', r2_type='personal', r2s='Positive', oig='Pending', edl='Pending', fcsr='Pending', casenet='Pending', oos='yes', fp='Required'),
  P(id=2, first='Kristin', last='Sample', added=day(12), oig='Pending', edl='Pending', fcsr='Pending', casenet='Pending'),
  P(id=3, first='Holly', last='Sample', added=day(12), oig='CLEAR', oig_date=day(10), edl='Pending', fcsr='Pending', casenet='Pending'),
  P(id=4, first='Denise', last='Sample', added=day(2), r1n='A Boss', r1_type='professional', r1s='Positive', r2n='B Pal', r2s='Positive', oig='CLEAR', edl='Clear', fcsr='Pending', fcsr_date=day(1), casenet='Pending'),
  P(id=5, first='Ready', last='Person', added=day(4), r1n='A Boss', r1_type='professional', r1s='Positive', r2n='B Pal', r2s='Positive', oig='CLEAR', edl='Clear', fcsr='Clear', casenet='Clear', oos='yes', fp='Required'),
  P(id=6, first='Flagged', last='Person', added=day(6), oig='FLAGGED', edl='Pending', fcsr='Pending', casenet='Pending'),
  P(id=7, first='Test', last='Signer', added=day(14), oig='Pending', edl='Pending', fcsr='Pending', casenet='Pending'),
  P(id=8, first='Pat', last='Practice', added=day(14), oig='Pending', edl='Pending', fcsr='Pending', casenet='Pending'),
  P(id=9, first='Gone', last='Person', added=day(20), not_hired=True),
]
T = r"""
async(CODE)=>{
  const sc=document.createElement('script'); sc.textContent=CODE; document.head.appendChild(sc);
  await new Promise(r=>setTimeout(r,50));
  document.querySelectorAll('.tabpanel').forEach(t=>t.style.display='none');
  const panel=document.getElementById('panel-onboarding'); panel.classList.add('mode-people');
  for(let el=panel; el; el=el.parentElement){ el.style.display = el.classList && el.classList.contains('tabpanel') ? 'block' : (getComputedStyle(el).display==='none' ? 'block' : el.style.display); }
  renderCkd();
  const dash=document.getElementById('ckdDash');
  const rows=[...dash.querySelectorAll('.ckd-row:not(.ckd-row-h)')].map(r=>r.innerText.replace(/\s+/g,' ').trim());
  const tiles=[...dash.querySelectorAll('.ckd-tile')].map(t=>t.innerText.replace(/\s+/g,' ').trim());
  const oldHidden=[...panel.querySelectorAll('.ckd-old')].every(e=>getComputedStyle(e).display==='none');
  dash.scrollIntoView();
  return { rows, tiles, oldHidden, more: dash.querySelector('.ckd-more').innerText.replace(/\s+/g,' '), html: dash.innerHTML };
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1440, 'height': 1000})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(f'http://localhost:{PORT}/index.html?proof=ckd'); pg.wait_for_timeout(1500)
    R = pg.evaluate(T, CODE.replace('__CANDS__', json.dumps(CANDS)))
    box = pg.locator('#ckdDash').bounding_box()
    pg.screenshot(path=os.path.join(OUT, 'checks_dash.png'), clip={'x': box['x'] - 8, 'y': max(0, box['y'] - 8), 'width': box['width'] + 16, 'height': min(1000, box['height'] + 16)})
    pg.evaluate("()=>{ ckdOpen(1); }"); pg.wait_for_timeout(400)
    person = pg.locator('#bgrDrawer').inner_text()
    pg.screenshot(path=os.path.join(OUT, 'checks_person.png'), clip={'x': 1440 - 470, 'y': 0, 'width': 470, 'height': 1000})
    pg.evaluate("()=>{ ckdFilter('checks'); }"); chk_rows = pg.locator('#ckdDash .ckd-row:not(.ckd-row-h)').locator('.ckd-go').all_inner_texts()
    pg.evaluate("()=>{ ckdFilter('refs'); }"); refs_rows = pg.locator('#ckdDash .ckd-row:not(.ckd-row-h)').count()
    pg.evaluate("()=>{ ckdToggleTest(); }"); with_tests = pg.locator('#ckdDash .ckd-row:not(.ckd-row-h)').count()
    b.close()
ok = fail = 0
def ck(name, cond, extra=''):
    global ok, fail
    ok, fail = (ok + 1, fail) if cond else (ok, fail + 1)
    print(('PASS  ' if cond else 'FAIL  ') + name + ('' if cond else '  ' + str(extra)[:600]))
rows = R['rows']
ck('no page errors', not errs, errs)
ck('the old table, toolbar and strips are hidden', R['oldHidden'])
ck('tiles: 4 need references, 5 need checks, 1 done', R['tiles'][0].startswith('4 Call references') and R['tiles'][1].startswith('5 Run background checks') and R['tiles'][2].startswith('1 Done'), R['tiles'])
ck('test people and not-hired people are left out; the cleared one is not in the waiting list', len(rows) == 5 and not any('Test' in r or 'Practice' in r or 'Gone' in r or 'Ready Person' in r for r in rows), rows)
ck('oldest first', rows[0].startswith('Claire Sample') and rows[-1].startswith('Denise Sample'), rows)
ck('a reference you can call comes first, with the phone and Record answer', 'Call Susie Boss (Professional · Lakeview Childcare)' in rows[0] and '(417) 555-0101' in rows[0] and rows[0].endswith('Record answer'), rows[0])
ck('no references given: ask for them', any(r.startswith('Kristin') and 'No references given yet' in r and r.endswith('Add references') for r in rows), rows)
ck('references first: no references given, so Holly is asked for them before EDL', any(r.startswith('Holly') and r.endswith('Add references') for r in rows), rows)
ck('FCSR ordered: record the result when it comes', any(r.startswith('Denise') and 'FCSR ordered' in r and r.endswith('Record FCSR') for r in rows), rows)
ck('a flagged check says review', any(r.startswith('Flagged') and r.endswith('Review') for r in rows), rows)
ck('no fingerprint anywhere: not on the dashboard, not in the checklist', 'ingerprint' not in R['html'] and 'ingerprint' not in person)
ck('out-of-state person with every check clear counts as done', R['tiles'][2].startswith('1 '))
ck('progress pills: References 1 of 2, OIG, EDL, FCSR, Case.net', 'References 1 of 2 OIG EDL FCSR Case.net' in rows[0], rows[0])
ck('More has the rare jobs, test people and the full table', all(x in R['more'] for x in ['Pre-Hire Audit', 'Reference activity', 'Not hired (1)', 'Show test people (2)', 'Full table', 'Sync reference answers now']), R['more'])
ck('the checklist: name, 1 of 5 done, both references, four checks', 'Claire Sample' in person and '0 of 5 done' in person and 'Susie Boss' in person and 'Pat Friend' in person and all(x in person for x in ['OIG', 'EDL', 'FCSR', 'Case.net']) and 'Call (417) 555-0101' in person, person)
ck('Call references tile filters the list; Show test people adds them back', refs_rows == 4 and with_tests == 6, (refs_rows, with_tests))
ck('Run background checks tile puts the checks first: Kristin gets Run OIG', 'Run OIG' in chk_rows, chk_rows)
ck('no em dash on the dashboard or checklist', '—' not in R['html'] and '—' not in person)
print(f'checks_dash_look: {ok} passed, {fail} failed'); print('screenshots:', os.path.join(OUT, 'checks_dash.png'), os.path.join(OUT, 'checks_person.png'))
raise SystemExit(1 if fail else 0)

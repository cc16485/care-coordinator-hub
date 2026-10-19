"""Training tab, orientation only with Medicaid caregivers (Samantha 2026-10-15 and 2026-10-19).
Offline: the Training tab block lifted from caregivers-engine.js with the real eligibility-rules.js, a stand-in caregiver
list, Hub data and AxisCare visits. Checks: AxisCare visits with a Medicaid client mark the caregiver and are saved; a visit
with a private client does not; the Worked with Medicaid clients filter lists them; a Medicaid caregiver shows what the
IHS rules still need; everyone else shows optional records only; the list downloads with training proof.
python3 tests/browser/medicaid_training_look.py [shots]"""
import os, sys
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp'
src = open(os.path.join(ROOT, 'caregivers-engine.js')).read()
i = src.index("let trFilterVal='all';"); j = src.index('// ── ACTIVE COMPLIANCE RENDER')
block = src[i:j]
rules = open(os.path.join(ROOT, 'eligibility-rules.js')).read()
page = '''<!doctype html><meta charset="utf-8"><body>
<div id="panel-training"><div id="train-alert"></div><div class="stats" id="tr-stats"></div>
<input type="text"><button class="fb active" id="fb-all" onclick="SCX.trFilter('all',this)">All</button><button class="fb" id="fb-med" onclick="SCX.trFilter('medicaid',this)">Medicaid</button>
<div id="tr-medicaid" style="display:none"></div><table><tbody id="tr-tbody"></tbody></table><div id="tr-empty"></div></div>
<script>''' + rules + '''</script><script>
window.ME = { email: 'kay@mo-care.com' }; window.SAVES = 0; window.CSV = null; window.FETCHES = 0;
const globalSearch = '';
const DATA = { medicaid_plans: [ { kind: 'plan', axiscare_client_id: '501' }, { kind: 'payer_mark', payer: 'private', axiscare_client_id: '503' } ],
  leads: [ { id: 'l1', axiscare_client_id: '502', funding_source: 'medicaid' }, { id: 'l2', axiscare_client_id: '503', funding_source: 'private' } ] };
const iso = d => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
let caregivers = [
  { id: 1, first: 'Ann', last: 'Able', axiscare_id: '9001', hire_date: iso(-400), orient_date: iso(-398), th_synced: true },
  { id: 2, first: 'Bo', last: 'Bright', axiscare_id: '9002', hire_date: iso(-400), orient_date: iso(-398), th_synced: true },
  { id: 3, first: 'Cy', last: 'Hand', hire_date: iso(-700), orient_date: iso(-698), alz_date: iso(-697), alz_proof: 'training/3/alz.pdf', ojt_date: iso(-690), ojt_signed: 'yes', ojt_online: iso(-690), annual_date: iso(-100), annual_hrs: '5', medicaid_hand: 'yes', medicaid_hand_note: 'Mary S., IHS, 2025' },
  { id: 4, first: 'Di', last: 'Done', axiscare_id: '9004', hire_date: iso(-400), orient_date: iso(-398), th_synced: true, medicaid_clients: [ { client_id: '777', client: 'Old Client', first_date: '2026-08-20', last_date: '2026-08-30' } ],
    alz_date: iso(-397), ojt_date: iso(-390), ojt_signed: 'yes', ojt_online: iso(-390), annual_date: iso(-30), annual_hrs: '5' } ];
const PAIRS = [ { client_id: '501', client: 'Pat Plan', caregiver_id: '9001', first_date: '2026-09-01', last_date: '2026-10-15', visits: 20 },
  { client_id: '503', client: 'Priv Ate', caregiver_id: '9002', first_date: '2026-09-01', last_date: '2026-10-15', visits: 8 },
  { client_id: '502', client: 'Lee Lead', caregiver_id: '9004', first_date: '2026-09-10', last_date: '2026-10-01', visits: 5 } ];
window.fetch = async () => { window.FETCHES++; return { json: async () => ({ pairs: PAIRS }) }; };
const TRAINING_HUB_ANON = 'anon'; async function trainHubTok(){ return 't'; }
function __elig(){ return globalThis.CCElig; }
function trainStatus(c){ return __elig().trainStatus(c); }
function pd(s){ return s ? new Date(s + 'T00:00:00') : null; }
function fmtD(s){ const d = pd(s); return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''; }
const wcEsc = t => String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function personName(o, n){ return n; } function cgpgFor(){ return null; } function sdEligible(){ return false; }
async function saveCaregivers(){ window.SAVES++; return true; }
document.createElement = (orig => function(t){ const e = orig.call(document, t); if(t === 'a') e.click = () => { window.CSV = decodeURIComponent(e.href.split(',')[1]); window.CSVNAME = e.download; }; return e; })(document.createElement);
''' + block + '''
window.SCX = { renderTR, trFilter, medicaidSync, medicaidCSV };
window.CG = () => caregivers;
</script></body>'''
open(os.path.join(ROOT, '_mt_test.html'), 'w').write(page)
R = []
ok = lambda n, c, d='': R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:300]))
try:
  with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1300, 'height': 900}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('file://' + os.path.join(ROOT, '_mt_test.html')); pg.evaluate('SCX.renderTR()'); pg.wait_for_timeout(400)
    cg = pg.evaluate('CG()')
    ann, bo, di = cg[0], cg[1], cg[3]
    ok('the Training tab checks AxisCare once on its own', pg.evaluate('FETCHES') == 1)
    ok('a visit with a client on a state care plan marks the caregiver, saved', (ann.get('medicaid_clients') or [{}])[0].get('client') == 'Pat Plan' and pg.evaluate('SAVES') == 1, ann)
    ok('a visit with a private client does not', not bo.get('medicaid_clients'), bo)
    ok('a lead whose payer is Medicaid counts, and older visits are kept', [m['client_id'] for m in di.get('medicaid_clients', [])] == ['777', '502'], di.get('medicaid_clients'))
    pg.evaluate('SCX.medicaidSync()'); pg.wait_for_timeout(300)
    ok('checking again saves nothing new', pg.evaluate('SAVES') == 1)
    t = pg.inner_text('#tr-tbody')
    ok('everyone else: optional records only, never needed or overdue', 'Bo Bright' in t and t.count('Medicaid caregiver') == 3)
    stats = pg.inner_text('#tr-stats')
    ok('a Medicaid Caregivers count', 'Medicaid Caregivers' in stats and '3' in stats.split('Medicaid Caregivers')[1], stats)
    pg.click('#fb-med'); pg.wait_for_timeout(200)
    t = pg.inner_text('#tr-tbody')
    ok('the filter lists only Medicaid caregivers (AxisCare and by hand)', 'Ann Able' in t and 'Cy Hand' in t and 'Di Done' in t and 'Bo Bright' not in t, t[:300])
    ok('the box explains it and offers the download', 'kept for good' in pg.inner_text('#tr-medicaid') and pg.is_visible('#tr-medicaid'))
    row = pg.inner_text('#tr-tbody tr:nth-child(1)')
    if pg.evaluate("CCElig.medicaidTrainingApplies({medicaid_hand:'yes'})"):
      ok('before Nov 16: a Medicaid caregiver with no dementia training shows it is needed', 'Medicaid: needed by Nov 16' in row and 'Dementia training: needed' in row and 'Agency Orientation: no certificate' in row, row)
    else:
      ok('from Nov 16: a gap shows as not on record, never needed', 'not on record' in row and 'needed' not in row.replace('not on record', ''), row)
    pg.screenshot(path=os.path.join(OUT, 'medicaid_training.png'), full_page=True)
    pg.evaluate('SCX.medicaidCSV()'); csv = pg.evaluate('CSV') or ''
    ok('the download lists each Medicaid caregiver with clients, proof and what is not on file', csv.count('\n') == 3 and 'Pat Plan' in csv and 'Mary S., IHS, 2025' in csv and 'training/3/alz.pdf' in csv and 'Dementia training' in csv and 'Bo Bright' not in csv, csv[:400])
    ok('the file is named for the audit', (pg.evaluate('CSVNAME') or '').startswith('medicaid_caregivers_training_'))
    cy = pg.inner_text('#tr-tbody tr:nth-child(2)')
    ok('a date without its certificate is flagged on the row', 'Cy Hand' in cy and 'On-the-job, in person: no certificate' in cy and 'certificate missing' in cy, cy)
    ok('a Proof Missing count', 'Medicaid: Proof Missing' in pg.inner_text('#tr-stats'))
    ok('the download says who is still working', 'Still working' in csv and 'no certificate' in csv)
    ok('no em dashes on the tab', '—' not in pg.inner_text('body'))
    ok('no page errors', not errs, errs)
    b.close()
finally:
  os.remove(os.path.join(ROOT, '_mt_test.html'))
for s, n, d in R: print(s, ' ', n, ('  ' + d) if d else '')
sys.exit(1 if any(r[0] == 'FAIL' for r in R) else 0)

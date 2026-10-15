"""Training proof catch-up (Samantha 2026-10-12: training from another platform, PDF proof on profiles for the MMAC audit).
Offline: the catch-up block lifted from caregivers-engine.js, with a stand-in caregiver list, storage and safe save. Every
active caregiver's items (done with a PDF, date without proof, a link only, missing, optional none recorded); recording refuses
without a date or a file; a recorded item uploads to lead-docs under training/, saves the dates, who and when, through the
caregivers save; the personnel file export is offered; proofs open by a private link.  python3 tests/browser/training_proof_look.py [shots]"""
import os, sys, re
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp'
src = open(os.path.join(ROOT, 'caregivers-engine.js')).read()
i = src.index('/* ───── TRAINING PROOF CATCH-UP'); j = src.index('window.SCX = {')
block = src[i:j]
page = '''<!doctype html><meta charset="utf-8"><body><div id="out"></div><script>
window.ME = { email: 'kay@mo-care.com' }; window.UP = []; window.SAVES = 0; window.VIEWS = []; window.EXPORTS = [];
let caregivers = [
  { id: 1, first: 'Ann', last: 'Able', hire_date: '2024-01-10', orient_date: '2024-01-12', orient_proof: 'training/1/orient-1-a.pdf', alz_date: '2024-01-13', alz_hrs: '4', alz_proof: 'training/1/alz-1-a.pdf', ojt_date: '2024-02-01', ojt_signed: 'yes', ojt_proof: 'training/1/ojt.pdf', ojt_online: '2024-02-02', ojt_online_proof: 'training/1/o.pdf', annual_date: '2025-01-15', annual_hrs: '5', annual_proof: 'training/1/a.pdf' },
  { id: 2, first: 'Bo', last: 'Bright', hire_date: '2023-05-01', orient_date: '2023-05-02', orient_proof: 'https://drive.google.com/x', alz_date: '2023-05-03' },
  { id: 3, first: 'Cy', last: 'New', hire_date: new Date().toISOString().slice(0, 10) },
  { id: 4, first: 'Di', last: 'Gone', active: false }, { id: 5, first: 'Ex', last: 'Former', axiscare_status_active: false } ];
function trainStatus(c){ return { isFirstYear: c.hire_date && (Date.now() - Date.parse(c.hire_date)) < 365 * 864e5 }; }
async function saveCaregivers(){ window.SAVES++; return true; }
async function bgrViewProof(p){ window.VIEWS.push(p); }
function renderTR(){}
window.sb = { storage: { from: (b) => ({ upload: async (path, file) => { window.UP.push({ b, path, name: file.name }); return { error: null }; } }) } };
window.CRX = { exportFile: (btn, id) => window.EXPORTS.push(id) };
''' + block + '''
window.SCX = { tpfOpen, tpfRecord, tpfSave, tpfFilter: (k) => { TPF_FILTER = k; tpfRender(); }, tpfSearch: (q) => { TPF_Q = q; tpfRender(); }, viewProof: bgrViewProof };
window.CG = () => caregivers;
</script></body>'''
open(os.path.join(ROOT, '_tp_test.html'), 'w').write(page)
R = []
ok = lambda n, c, d='': R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:300]))
try:
  with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1300, 'height': 900}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:200])); pg.on('dialog', lambda d: d.accept())
    pg.goto('file://' + os.path.join(ROOT, '_tp_test.html')); pg.evaluate('SCX.tpfOpen()'); pg.wait_for_timeout(200)
    t = pg.inner_text('#tpfBody')
    ok('the list counts who has orientation on file with proof (optional courses never count), and by default shows only who still needs something', '1 of 3 with orientation on file with proof' in t and 'Ann Able' not in t and 'Bo Bright' in t and 'Cy New' in t, t[:300])
    ok('an inactive caregiver is not listed, here or in AxisCare', 'Di Gone' not in t and 'Ex Former' not in t)
    ok('each state in words: a link only, a date with no proof, missing (orientation), optional none recorded (2026-10-15)', 'a link only' in t and 'date, no proof' in t and 'missing' in t and 'optional, none recorded' in t and 'year 1' not in t)
    pg.evaluate("SCX.tpfFilter('all')"); pg.wait_for_timeout(100)
    ok('Everyone shows the complete caregiver with "PDF on file"', 'Ann Able' in pg.inner_text('#tpfBody') and 'PDF on file' in pg.inner_text('#tpfBody'))
    pg.screenshot(path=os.path.join(OUT, 'tp_list.png'), full_page=True)
    pg.locator('#tpfBody a[data-proof]').first.click(); pg.wait_for_timeout(100)
    ok('a proof opens through the private-link viewer', len(pg.evaluate('VIEWS')) == 1)
    pg.locator('#tpfBody button', has_text='Personnel file').first.click(); pg.wait_for_timeout(100)
    ok('the personnel file export is offered for any caregiver', len(pg.evaluate('EXPORTS')) == 1)
    # record Cy's dementia training: refused without a date, then without a file, then saved
    pg.evaluate("SCX.tpfRecord('3','alz')"); pg.wait_for_timeout(100)
    pg.click('#tpfSaveBtn'); pg.wait_for_timeout(100)
    ok('refused without a date', 'date it was completed' in pg.inner_text('#tpfErr'))
    pg.fill('#tpfDate', '2026-09-01'); pg.click('#tpfSaveBtn'); pg.wait_for_timeout(100)
    ok('refused without the certificate (never a date without its proof)', 'never saved without its proof' in pg.inner_text('#tpfErr') and pg.evaluate('SAVES') == 0)
    pg.set_input_files('#tpfFile', files=[{'name': 'Cy Dementia cert.pdf', 'mimeType': 'application/pdf', 'buffer': b'%PDF-1.4 test'}])
    pg.screenshot(path=os.path.join(OUT, 'tp_record.png'))
    pg.click('#tpfSaveBtn'); pg.wait_for_timeout(300)
    up = pg.evaluate('UP'); cy = pg.evaluate('CG().find(c => c.id === 3)')
    ok('the file goes to lead-docs under training/<caregiver>/', len(up) == 1 and up[0]['b'] == 'lead-docs' and up[0]['path'].startswith('training/3/alz-'), up)
    ok('the date, hours, proof path, who and when land on the record, through the caregivers save', cy.get('alz_date') == '2026-09-01' and cy.get('alz_hrs') == '4' and cy.get('alz_proof', '').startswith('training/3/') and cy.get('alz_recorded_by') == 'kay@mo-care.com' and cy.get('alz_recorded_at') and pg.evaluate('SAVES') == 1, cy)
    ok('the list redraws with the item done', 'PDF on file' in pg.inner_text('#tpfBody'))
    # Bo: replace a link-only orientation with a PDF; OJT in person keeps the sign-off
    pg.evaluate("SCX.tpfRecord('3','ojt')"); pg.wait_for_timeout(100)
    pg.fill('#tpfDate', '2026-09-10'); pg.check('#tpfSigned'); pg.set_input_files('#tpfFile', files=[{'name': 'ojt.pdf', 'mimeType': 'application/pdf', 'buffer': b'%PDF-1.4'}]); pg.click('#tpfSaveBtn'); pg.wait_for_timeout(300)
    ok('in-person on-the-job training keeps the supervisor sign-off', pg.evaluate("CG().find(c => c.id === 3).ojt_signed") == 'yes')
    pg.evaluate("SCX.tpfRecord('3','orient')"); pg.wait_for_timeout(100)
    pg.fill('#tpfDate', '2099-01-01'); pg.set_input_files('#tpfFile', files=[{'name': 'o.pdf', 'mimeType': 'application/pdf', 'buffer': b'%PDF'}]); pg.click('#tpfSaveBtn'); pg.wait_for_timeout(100)
    ok('a date in the future is refused', 'in the future' in pg.inner_text('#tpfErr'))
    ok('no page errors', not errs, errs)
    b.close()
finally:
  os.remove(os.path.join(ROOT, '_tp_test.html'))
for s, n, d in R: print(s, ' ', n, ('  ' + d) if d else '')

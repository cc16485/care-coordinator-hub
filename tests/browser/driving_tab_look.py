"""The Driving tab (2026-11-21, Samantha: "make it clear if this caregiver is an approved driver or NOT A DRIVER", the pre-hire
license and insurance "embedded for a quick look", Non-Drivers sign the form, "if they have been mistakenly marked non-driver we
need to get clarity", "make sure all active caregivers have that tab fully completed").
driver-compliance.js offline with the server faked to its contract: the banner for every state, the three pictures read through
the logged open and shown from memory (no storage address in the page), nothing read while the tab is hidden, the Non-Driver
agreement and the "Is Non-Driver right?" check, and the everyone list. Chromium.
python3 tests/browser/driving_tab_look.py [screenshot dir]"""
import json, sys, os
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp'
TEST = os.path.join(ROOT, '_drv_tab_test.html')
DC = 'aaaaaaaa-bbbb-4ccc-8ddd-000000000001'
U = lambda n: 'aaaaaaaa-bbbb-4ccc-8ddd-%012d' % n
def row(status, **x):
    r = {'id': DC, 'caregiver_id': '7', 'name': 'Pat Practice', 'status': status, 'status_reason': 'Step 1: will not transport clients' if status == 'non_driver' else None,
         'status_at': '2026-11-01T15:00:00Z', 'agreement_form': 'non_driver' if status == 'non_driver' else 'vehicle', 'agreement_signed_at': '2026-11-01T15:00:00Z',
         'agreement_pdf': 'x.pdf', 'license_expires': '2027-03-01', 'insurance_expires': '2027-01-01'}
    r.update(x); return r
DOCS = [{'id': U(11), 'kind': 'insurance', 'label': 'Proof of auto insurance', 'content_type': 'application/pdf', 'uploaded_at': '2026-11-01T15:03:00Z', 'superseded_at': None},
        {'id': U(12), 'kind': 'license_back', 'label': 'License (back)', 'content_type': 'image/jpeg', 'uploaded_at': '2026-11-01T15:02:00Z', 'superseded_at': None},
        {'id': U(13), 'kind': 'license_front', 'label': 'License (front)', 'content_type': 'image/jpeg', 'uploaded_at': '2026-11-01T15:01:00Z', 'superseded_at': None, 'verified_at': '2026-11-02T15:00:00Z'}]
def audit(done, left, confirmed=None): return {'state': '', 'done': done, 'left': left, 'confirmed': confirmed}
CASES = {
  'approved': {'row': row('approved'), 'docs': DOCS, 'derived': {'cleared_to_drive': True, 'audit': audit(True, [])}},
  'expired': {'row': row('approved', insurance_expires='2026-10-01'), 'docs': DOCS, 'derived': {'cleared_to_drive': False, 'audit': audit(False, ['License or insurance has expired: new documents needed'])}},
  'pending': {'row': row('pending'), 'docs': DOCS[1:], 'derived': {'cleared_to_drive': False, 'approve_blockers': ['The insurance is not verified'], 'audit': audit(False, ['Proof of current auto insurance is not on file', 'The insurance is not verified'])}},
  'non_driver': {'row': row('non_driver'), 'docs': [], 'derived': {'cleared_to_drive': False, 'audit': audit(False, ['Check with them that Non-Driver is right, then record it'])}},
  'nd_unsigned': {'row': row('non_driver', agreement_form=None, agreement_signed_at=None, agreement_pdf=None, status_reason='told us they do not drive'), 'docs': [], 'derived': {'cleared_to_drive': False, 'audit': audit(False, ['Non-Driver Agreement not signed: send them their secure link to sign it', 'Check with them that Non-Driver is right, then record it'])}},
  'nd_done': {'row': row('non_driver'), 'docs': [], 'derived': {'cleared_to_drive': False, 'audit': audit(True, [], {'at': '2026-11-21T16:00:00Z', 'by': 'Krystal Land', 'how': 'by phone'})}},
  'suspended': {'row': row('suspended', status_reason='insurance expired'), 'docs': DOCS, 'derived': {'cleared_to_drive': False, 'audit': audit(False, ['The insurance is expired or has no expiration date'])}},
  'none': {'row': None, 'docs': [], 'derived': None},
  'from_ghl': {'row': row('pending', status_reason='pre-hire license and insurance copied from GoHighLevel; the office verifies', agreement_form=None, agreement_signed_at=None), 'docs': [dict(d, uploaded_by='GoHighLevel (pre-hire)', expires='2030-03-04') for d in DOCS],
               'derived': {'cleared_to_drive': False, 'approve_blockers': ['The Driver/Vehicle agreement is not signed'], 'audit': audit(False, ['The Driver/Vehicle agreement is not signed', 'The license is not verified'])}},
}
AUDIT = {'ok': True, 'source': 'axiscare', 'counts': {'active': 3, 'done': 1, 'approved': 0, 'non_driver': 2, 'pending': 0, 'none': 1},
  'rows': [{'name': 'Old Driver', 'axiscare_id': '9003', 'status': 'none', 'done': False, 'left': ['Not set up: ask them whether they drive clients, then set them up as a driver or a Non-Driver']},
           {'name': 'Pat Practice', 'axiscare_id': '9001', 'status': 'non_driver', 'done': False, 'left': ['Check with them that Non-Driver is right, then record it']},
           {'name': 'Ava Lee', 'axiscare_id': '9002', 'status': 'non_driver', 'done': True, 'left': []}]}
CSS = """body{font-family:Poppins,system-ui,sans-serif;background:#F6F9FD;padding:16px;color:#1f2937}.card{background:#fff;border:1px solid #e4e1d8;border-radius:12px;padding:14px 16px;max-width:860px}
.ibtn{font:inherit;font-size:12.5px;font-weight:700;padding:5px 11px;border-radius:8px;border:1.5px solid #e4e1d8;background:#fff;color:#0E3860;cursor:pointer}.ibtn-strong{background:#0E3860;color:#fff;border-color:#0E3860}
.field-note{font-size:12px;color:#6E6559}.tag-chip{display:inline-block;padding:2px 9px;border-radius:999px;font-size:12px}"""
FAKE = r"""<!doctype html><meta charset="utf-8"><style>%s</style><body><div class="card"><div style="font-weight:800;color:#0E3860;margin-bottom:8px">Driving</div><div id="card"></div></div>
<div id="hidden" style="display:none"><div id="hcard"></div></div>
<script>
window.CALLS = []; window.LOOKS = []; window.CASE = 'approved'; const CASES = %s, AUDIT = %s;
window.ccConfirm = async () => true; window.openCaregiverProfile = (ax, tab) => { window.OPENED_PROFILE = [ax, tab]; };
window.sb = { functions: { invoke: async (name, o) => {
  const b = o.body; if(b.action === 'open' && b.reason) window.LOOKS.push(b.doc_id); else window.CALLS.push(b);
  const C = CASES[window.CASE];
  if(b.action === 'get') return { data: Object.assign({ ok:true, events:[] }, C) };
  if(b.action === 'open') return { data:{ ok:true, url:'http://pics.test/' + b.doc_id } };
  if(b.action === 'confirm'){ if(!b.how) return { data:{ ok:false, error:'How did you check with them: by phone, by text or in person?' } }; window.CASE = 'nd_done'; return { data:{ ok:true } }; }
  if(b.action === 'audit') return { data: AUDIT };
  if(b.action === 'ghl_pull'){ if(window.GHL_ANSWER) return { data: window.GHL_ANSWER }; window.CASE = 'from_ghl'; return { data:{ ok:true, state:'copied', created:true, copied:[{ kind:'license_front', ok:true }, { kind:'license_back', ok:true }, { kind:'insurance', ok:true }] } }; }
  if(b.action === 'send_link') return { data:{ ok:true, state:'practice', why:'nothing was sent', link:'https://cc.mo-care.com/driver.html?d=x' } };
  return { data:{ ok:false, error:'Unknown action.' } };
} } };
</script><script src="driver-compliance.js"></script></body>""" % (CSS, json.dumps(CASES), json.dumps(AUDIT))
open(TEST, 'w').write(FAKE)
SVG = lambda t, c: ('<svg xmlns="http://www.w3.org/2000/svg" width="340" height="215"><rect width="340" height="215" rx="14" fill="%s"/><text x="20" y="40" font-size="20" font-family="Arial" fill="#fff">%s</text><rect x="20" y="70" width="80" height="100" fill="#fff" opacity=".7"/><text x="120" y="100" font-size="14" font-family="Arial" fill="#fff">PRACTICE PERSON</text><text x="120" y="125" font-size="12" font-family="Arial" fill="#fff">EXP 03/01/2027</text></svg>' % (c, t))
R = []
def ck(n, c, d=''): R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:500]))
try:
  with sync_playwright() as pw:
    br = pw.chromium.launch(); pg = br.new_page(viewport={'width': 940, 'height': 1100}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    def pic(route, request):
        i = request.url.rsplit('/', 1)[1]
        if i == U(11): return route.fulfill(status=200, content_type='application/pdf', body=b'%PDF-1.4\n%%EOF')
        return route.fulfill(status=200, content_type='image/svg+xml', body=SVG('MISSOURI LICENSE ' + ('FRONT' if i == U(13) else 'BACK'), '#2563EB' if i == U(13) else '#64748B'))
    pg.route('http://pics.test/**', pic)
    pg.goto('file://' + TEST); pg.wait_for_timeout(200)
    def show(case, el='card'):
        pg.evaluate('(c) => { window.CASE = c; window.CALLS = []; window.LOOKS = []; }', case)
        pg.evaluate('(e) => DRV.mount(document.getElementById(e), { caregiver_id:"7", axiscare_id:"9001-" + Math.random() })', el); pg.wait_for_timeout(500)
        return pg.inner_text('#' + el)
    t = show('approved')
    ck('Approved Driver: a green APPROVED DRIVER banner that says they may drive clients', '✓ APPROVED DRIVER' in t and 'May drive clients' in t and 'NOT A DRIVER' not in t, t)
    ck('...the three pictures (license front, back, insurance) are read through the logged open, each once', sorted(pg.evaluate('LOOKS')) == sorted([U(11), U(12), U(13)]), pg.evaluate('LOOKS'))
    ck('...and shown on the page from memory: two images and the insurance PDF, all blob: addresses', pg.locator('#card .drv-look img').count() == 2 and pg.locator('#card .drv-look iframe').count() == 1
       and pg.evaluate('[...document.querySelectorAll("#card .drv-look img, #card .drv-look iframe")].every(e => e.src.startsWith("blob:"))'), pg.inner_html('#card')[:400])
    ck('...no storage or picture address is ever written into the page', 'pics.test' not in pg.inner_html('#card') and 'storage/v1' not in pg.inner_html('#card'))
    ck('...verified and not verified said under each picture', 'verified' in t and 'not verified' in t)
    ck('...the tab says it is complete', 'This tab is complete' in t, t)
    pg.screenshot(path=os.path.join(OUT, 'driving_tab_approved.png'), full_page=True)
    t = show('expired')
    ck('Approved but a date passed: red NOT CLEARED TO DRIVE, never schedule them', 'NOT CLEARED TO DRIVE' in t and 'Never schedule them to drive a client' in t, t)
    t = show('pending')
    ck('Pending: NOT A DRIVER YET, never schedule until Approved Driver; what is left listed', 'NOT A DRIVER YET (WAITING FOR THE OFFICE)' in t and 'Still to do on this tab' in t and 'Proof of current auto insurance is not on file' in t, t)
    ck('...a missing picture says Not on file', 'Not on file' in t and pg.locator('#card .drv-look').count() == 2, t)
    ck('...the office buttons (Verify, Approve) are in view for a driver', pg.locator('#card button:has-text("Approve driver")').is_visible() and pg.locator('#card button:has-text("Verify license")').is_visible())
    pg.screenshot(path=os.path.join(OUT, 'driving_tab_pending.png'), full_page=True)
    t = show('suspended')
    ck('Suspended: NOT A DRIVER RIGHT NOW', 'NOT A DRIVER RIGHT NOW (SUSPENDED)' in t, t)
    t = show('none')
    ck('Not set up: NOT A DRIVER (NOT SET UP), with what to ask and both set up buttons', 'NOT A DRIVER (NOT SET UP)' in t and 'ask them whether they will drive clients' in t and pg.locator('#card button:has-text("Set up driver compliance")').count() == 1 and pg.locator('#card button:has-text("Set up as Non-Driver")').count() == 1, t)
    pg.evaluate('() => { window.GHL_ANSWER = { ok:true, state:"not found in GoHighLevel", copied:[] }; }')
    pg.click('#card button:has-text("Copy their license and insurance from GoHighLevel")'); pg.wait_for_timeout(400)
    ck('Not set up: Copy from GoHighLevel, not found: says so in words, nothing changes', any(c.get('action') == 'ghl_pull' and c.get('caregiver_id') == '7' for c in pg.evaluate('CALLS')) and 'contact was not found' in pg.inner_text('#card') and 'NOT A DRIVER (NOT SET UP)' in pg.inner_text('#card'), pg.inner_text('#card'))
    pg.evaluate('() => { window.GHL_ANSWER = null; }')
    pg.click('#card button:has-text("Copy their license and insurance from GoHighLevel")'); pg.wait_for_timeout(700)
    t = pg.inner_text('#card')
    ck('...copied: the card reads again, Pending Verification, the three pictures labeled from GoHighLevel with the date it lists', 'Copied from GoHighLevel: license front, license back, insurance' in t and 'Pending Verification' in t and 'NOT A DRIVER YET' in t
       and t.count('from GoHighLevel (pre-hire), it says expires Mar 4, 2030') == 3 and pg.locator('#card .drv-look img').count() == 2, t)
    ck('...with all three on file, the copy button is not offered again', pg.locator('#card button:has-text("Copy their license and insurance from GoHighLevel")').count() == 0)
    pg.screenshot(path=os.path.join(OUT, 'driving_tab_from_ghl.png'), full_page=True)
    t = show('non_driver')
    ck('Non-Driver: a red NOT A DRIVER banner, never schedule them to drive a client', '✕ NOT A DRIVER' in t and 'Never schedule them to drive a client' in t and 'every non-driving visit' in t, t)
    ck('...the Non-Driver Agreement signed, with its open button; no pictures asked for', 'Non-Driver Agreement: ✓ signed' in t and pg.locator('#card button:has-text("Open the signed form")').count() == 1 and pg.locator('#card .drv-look').count() == 0 and not pg.evaluate('LOOKS').__len__(), t)
    ck('...Is Non-Driver right? not checked yet, with both answers', 'Not checked with them yet' in t and pg.locator('#card button:has-text("They confirmed: they do not drive clients")').count() == 1 and pg.locator('#card button:has-text("They do drive: send them the driver link")').count() == 1, t)
    pg.screenshot(path=os.path.join(OUT, 'driving_tab_non_driver.png'), full_page=True)
    pg.click('#card button:has-text("They confirmed: they do not drive clients")'); pg.click('#card .drv-form button:has-text("Record it")'); pg.wait_for_timeout(200)
    ck('...recording it needs how you checked (nothing sent to the server first)', 'Please choose how you checked' in pg.inner_text('#card') and not any(c.get('action') == 'confirm' for c in pg.evaluate('CALLS')))
    pg.select_option('#card .drv-form select', 'phone'); pg.fill('#card .drv-form textarea', 'no car right now'); pg.click('#card .drv-form button:has-text("Record it")'); pg.wait_for_timeout(400)
    t = pg.inner_text('#card')
    ck('...recorded: confirm { key, how, note } sent, the card reads again and says checked by whom', any(c.get('action') == 'confirm' and c.get('key') == DC and c.get('how') == 'phone' and c.get('note') == 'no car right now' for c in pg.evaluate('CALLS'))
       and 'Checked with them by phone by Krystal Land' in t and 'This tab is complete' in t, t)
    t = show('nd_unsigned')
    ck('Office-set Non-Driver with no signature: Not signed, they must sign it, with the send button', 'Not signed.' in t and 'They must sign it' in t and pg.locator('#card button:has-text("Send them the form to sign")').count() == 1, t)
    pg.click('#card button:has-text("Send them the form to sign")'); pg.wait_for_timeout(200)
    ck('...the send form opens set to sign the agreement (change), asks before sending', pg.evaluate('document.querySelector("#card select[id^=drvWhy]").value') == 'change' and pg.locator('#card .drv-form').is_visible())
    pg.click('#card .drv-form button:has-text("Send the link")'); pg.wait_for_timeout(300)
    ck('...send_link why change goes to the server', any(c.get('action') == 'send_link' and c.get('why') == 'change' for c in pg.evaluate('CALLS')), pg.evaluate('CALLS'))
    # hidden tab: no looks until shown
    pg.evaluate('() => { window.CASE = "approved"; window.LOOKS = []; }')
    pg.evaluate('() => DRV.mount(document.getElementById("hcard"), { caregiver_id:"8", axiscare_id:"h1" })'); pg.wait_for_timeout(400)
    ck('Hidden tab: opening a profile reads no pictures (a look is logged with your name)', pg.evaluate('LOOKS.length') == 0, pg.evaluate('LOOKS'))
    pg.evaluate('() => { document.getElementById("hidden").style.display = "block"; DRV.shown(); }'); pg.wait_for_timeout(400)
    ck('...shown: the pictures appear then (already read once on this visit, so not read again)', pg.locator('#hcard .drv-look img').count() == 2 and pg.evaluate('LOOKS.length') == 0, pg.inner_html('#hcard')[:300])
    pg.evaluate('() => document.getElementById("hidden").style.display = "none"')
    # everyone
    show('approved'); pg.click('#card button:has-text("Driving check: see every active caregiver")'); pg.wait_for_timeout(300)
    t = pg.inner_text('#drvAuditModal')
    ck('Driving check: everyone Active in AxisCare (said so), how many are complete, and each one\'s next step', 'Everyone Active in AxisCare right now' in t and '1 of 3' in t and 'Not set up' in t and 'NOT A DRIVER' in t and 'Check with them that Non-Driver is right' in t and '✓ complete' in t, t)
    pg.screenshot(path=os.path.join(OUT, 'driving_check_list.png'))
    pg.click('#drvAuditModal a:has-text("Old Driver")'); pg.wait_for_timeout(100)
    ck('...a name opens their profile on the Driving tab', pg.evaluate('OPENED_PROFILE') == ['9003', 'driving'] and pg.locator('#drvAuditModal').count() == 0)
    allText = pg.evaluate('document.body.innerText')
    ck('no em dash and no "plain language" anywhere', '—' not in open(os.path.join(ROOT, 'driver-compliance.js')).read() and 'plain language' not in allText.lower())
    ck('no page errors', not errs, errs)
    br.close()
finally:
  try: os.remove(TEST)
  except Exception: pass
for r in R: print(r[0], ' ', r[1], ' ', r[2])
print('\n%d/%d passed' % (sum(1 for r in R if r[0] == 'PASS'), len(R)))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

"""Driver Compliance card (2026-10-13, spec launch/review/driver-compliance-spec.md): driver-compliance.js offline with the
driver-compliance server faked to the spec's contract. Every status (incl. Not set up yet), Approve refused with the server's
blockers, the verify flow (license with expiry; driving record with a staff upload through the signed upload, PUT routed),
documents opened only through the server's logged open, the full history collapsed, the Overview line, and the applicant
page's key resolved to the offer through hire-profile. Chromium.
python3 tests/browser/driver_card_look.py [screenshot dir]"""
import json, sys, os
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp'
TEST = os.path.join(ROOT, '_drv_card_test.html')
UPLOAD = 'https://zngsgedlsxinbygwmxwn.supabase.co/storage/v1/object/upload/sign/driver-docs/cg/7/mvr-1.pdf?token=tok'

def row(status, **x):
    r = {'id': 'dc-1', 'name': 'Pat Practice', 'status': status, 'status_reason': None, 'status_at': '2026-10-10T15:00:00Z',
         'agreement_form': 'non_driver' if status == 'non_driver' else 'vehicle', 'agreement_signed_at': '2026-10-09T15:00:00Z', 'agreement_version': 4,
         'license_state': 'MO', 'license_expires': '2027-03-01', 'insurance_expires': '2026-11-01', 'insurer': 'Practice Mutual',
         'license_verified_at': None, 'license_verified_by': None, 'insurance_verified_at': None, 'insurance_verified_by': None,
         'coverage_verified_at': None, 'coverage_verified_by': None, 'coverage_note': None, 'mvr_verified_at': None, 'mvr_verified_by': None, 'mvr_result': None,
         'approved_at': None, 'approved_by': None}
    if status == 'non_driver': r.update(license_expires=None, insurance_expires=None, insurer=None, license_state=None)
    if status == 'approved': r.update(license_verified_at='2026-10-10T15:00:00Z', license_verified_by='Krystal Land', insurance_verified_at='2026-10-10T15:00:00Z', insurance_verified_by='Krystal Land',
                                      coverage_verified_at='2026-10-10T15:00:00Z', coverage_verified_by='Krystal Land', mvr_verified_at='2026-10-10T15:00:00Z', mvr_verified_by='Krystal Land', mvr_result='acceptable',
                                      approved_at='2026-10-11T15:00:00Z', approved_by='Samantha Owner')
    if status == 'suspended': r.update(status_reason='insurance expired')
    r.update(x); return r
DOCS = [{'id': 'd-lf', 'kind': 'license_front', 'content_type': 'image/jpeg', 'uploaded_at': '2026-10-09T15:01:00Z', 'uploaded_by': 'caregiver'},
        {'id': 'd-lb', 'kind': 'license_back', 'content_type': 'image/jpeg', 'uploaded_at': '2026-10-09T15:02:00Z', 'uploaded_by': 'caregiver'},
        {'id': 'd-in', 'kind': 'insurance', 'content_type': 'application/pdf', 'uploaded_at': '2026-10-09T15:03:00Z', 'uploaded_by': 'caregiver'},
        {'id': 'd-old', 'kind': 'insurance', 'uploaded_at': '2026-01-01T15:00:00Z', 'uploaded_by': 'caregiver', 'superseded_at': '2026-10-09T15:03:00Z'}]
EVENTS = [{'id': 1, 'at': '2026-10-09T15:00:00Z', 'kind': 'agreement_signed', 'by_name': 'Pat Practice', 'detail': {'form': 'vehicle'}},
          {'id': 2, 'at': '2026-10-09T15:01:00Z', 'kind': 'doc_uploaded', 'by_name': 'Pat Practice', 'detail': {'kind': 'license_front', 'expires': '2027-03-01'}},
          {'id': 3, 'at': '2026-10-10T15:00:00Z', 'kind': 'verified', 'by_name': 'Krystal Land', 'detail': {'what': 'license', 'expires': '2027-03-01'}}]
def payload(status):
    if status == 'none': return {'ok': True, 'row': None, 'docs': [], 'events': [], 'derived': {'status_label': 'Not set up yet', 'missing': [], 'renewals': [], 'can_approve': False, 'approve_blockers': []}}
    bl = [] if status == 'approved' else ['License not verified', 'Insurance not verified', 'Coverage not verified', 'Driving record not checked']
    return {'ok': True, 'row': row(status), 'docs': [] if status == 'non_driver' else DOCS, 'events': EVENTS,
            'derived': {'status_label': status, 'missing': [] if status in ('approved', 'non_driver') else ['Driving record (MVR) result'],
                        'renewals': [{'what': 'Insurance', 'expires': '2026-11-01', 'days_left': 19}] if status != 'non_driver' else [],
                        'can_approve': status == 'approved', 'approve_blockers': bl}}

FAKE = r"""<!doctype html><meta charset="utf-8"><body><div id="card" style="max-width:820px"></div><div id="gate"></div><div id="ap"></div>
<script>
window.CALLS = []; window.OPENED = []; window.SERVER = { status:'pending' };
window.open = function(){ const w = { document:{ write(){}, body:{} }, closed:false, close(){ this.closed = true; } }; Object.defineProperty(w, 'location', { set(v){ window.OPENED.push(String(v)); } }); return w; };
window.confirm = () => true;
const P = %s;
function refuse(status, body){ return { data:null, error:{ message:'Edge Function returned a non-2xx status code', context:{ status, json: async () => body } } }; }
window.sb = { functions: { invoke: async (name, o) => {
  const b = o.body; window.CALLS.push(Object.assign({ fn:name }, b));
  if(name === 'hire-profile') return { data:{ ok:true, ids:{ offer_id:'11111111-2222-3333-4444-555555555555', applicant_id:'a1' } } };
  const S = window.SERVER;
  if(b.action === 'get') return { data: JSON.parse(JSON.stringify(P[S.status])) };
  if(b.action === 'open'){ if(S.refuseOpen) return refuse(403, { error:'Opening driver documents is for office staff.' }); return { data:{ ok:true, url:'https://example.invalid/signed/' + (b.doc_id || b.doc) } }; }
  if(b.action === 'approve'){ if(S.status !== 'approved') return refuse(409, { error:'Not ready to approve.', approve_blockers: P[S.status].derived.approve_blockers }); return { data:{ ok:true } }; }
  if(b.action === 'verify'){ if(b.what === 'license' && b.expires < '2026-10-14') return refuse(400, { error:'The license expiry must be in the future.' });
    const r = P[S.status].row; r[b.what + '_verified_at'] = '2026-10-13T16:00:00Z'; r[b.what + '_verified_by'] = 'Test Staff'; if(b.result) r.mvr_result = b.result; if(b.what === 'license') r.license_expires = b.expires;
    P[S.status].events.push({ id:9, at:'2026-10-13T16:00:00Z', kind:'verified', by_name:'Test Staff', detail:{ what:b.what, expires:b.expires, result:b.result, note:b.note } }); return { data:{ ok:true } }; }
  if(b.action === 'upload_url') return { data:{ ok:true, path:'cg/7/mvr-1.pdf', token:'tok', signed_url:'%s' } };
  if(b.action === 'record'){ P[S.status].docs.push({ id:'d-mvr', kind:'mvr', uploaded_at:'2026-10-13T16:00:00Z', uploaded_by:'Test Staff' }); return { data:{ ok:true } }; }
  if(b.action === 'suspend'){ if(!S.maySuspend) return refuse(403, { error:'Only office staff may suspend a driver.' }); return { data:{ ok:true } }; }
  if(b.action === 'setup') return refuse(400, { error:"action must be one of get, open, upload_url, record, verify, approve, suspend, non_driver, send_link" });
  if(b.action === 'send_link') return { data:{ ok:true, message:'Sent by text and email.' } };
  if(b.action === 'non_driver') return { data:{ ok:true } };
  return refuse(400, { error:'unknown' });
} } };
</script><script src="driver-compliance.js"></script></body>""" % (json.dumps({s: payload(s) for s in ('none', 'non_driver', 'pending', 'approved', 'suspended')}), UPLOAD)
open(TEST, 'w').write(FAKE)
R = []
def ck(n, c, d=''): R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:400]))
try:
  with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1000, 'height': 1300}); errs = []; puts = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    def put(route, request):
        puts.append({'method': request.method, 'ct': request.headers.get('content-type'), 'size': len(request.post_data_buffer or b'')}); return route.fulfill(status=200, body='{"Key":"driver-docs/cg/7/mvr-1.pdf"}')
    pg.route('**/storage/v1/object/upload/sign/**', put)
    pg.goto('file://' + TEST); pg.wait_for_timeout(200)
    def show(status, key=None):
        pg.evaluate('(s) => { window.SERVER = { status:s }; window.CALLS = []; }', status)
        pg.evaluate('(k) => DRV.mount(document.getElementById("card"), k, { roster:{ dl_expires:"2027-01-31", auto_ins_expires:"2026-12-01" } })', key or {'caregiver_id': '7', 'axiscare_id': 'ax-' + status}); pg.wait_for_timeout(250)
        return pg.inner_text('#card')
    t = show('none')
    ck('Not set up yet: the pill, nothing assumed, the office-typed roster dates said to be unverified, and Set up', 'Not set up yet' in t and 'Nobody is treated as a driver' in t and 'typed by the office and not verified' in t and 'Set up driver compliance' in t, t)
    pg.click('text=Set up driver compliance'); pg.wait_for_timeout(250)
    ck('...Set up asks the server, and a refusal shows in the server\'s own words', pg.evaluate('CALLS.some(c => c.action === "setup" && c.caregiver_id === "7")') and 'action must be one of get' in pg.inner_text('#card'), pg.inner_text('#card'))
    pg.screenshot(path=os.path.join(OUT, 'drv_card_none.png'))
    t = show('non_driver')
    ck('Non-Driver: pill, agreement signed with the Open button, non-driving work allowed, no license rows', 'Non-Driver' in t and 'Non-Driver Agreement' in t and 'Open the signed agreement' in t and 'every non-driving assignment' in t and 'License expires' not in t, t)
    t = show('pending')
    ck('Pending Verification: the pill, license front and back and insurance open buttons (the superseded card is not offered)', 'Pending Verification' in t and pg.locator('#card button[data-doc]').count() == 3, t)
    ck('...expiries with days left, the insurer, coverage and driving record not verified', 'Mar 1, 2027' in t and 'days left' in t and 'Practice Mutual' in t and 'Not checked yet' in t and t.count('Not verified') >= 3, t)
    ck('...missing items and upcoming renewals from the server', 'Missing: Driving record (MVR) result' in t and 'Upcoming renewals: Insurance' in t and '19 days left' in t, t)
    ck('...not eligible for transport shifts, said on the card', 'Not eligible for shifts that include transporting a client' in t)
    ck('...the full history is collapsed by default, with every event', pg.locator('#card details').count() == 1 and pg.evaluate('!document.querySelector("#card details").open') and 'Full history (3)' in t)
    pg.click("#card summary"); pg.wait_for_timeout(100); ht = pg.inner_text('#card details')
    ck('...opened, it lists each event with who (newest first)', 'Agreement signed' in ht and 'Document uploaded' in ht and 'Krystal Land' in ht and ht.index('Verified') < ht.index('Agreement signed'), ht)
    # open through the server only
    pg.evaluate('CALLS = []; OPENED = []'); pg.click('#card button[data-doc="d-lf"]'); pg.wait_for_timeout(250)
    ck('Open: asks the server (action open, the document id) and opens only the link it returns', pg.evaluate('CALLS.length === 1 && CALLS[0].action === "open" && CALLS[0].doc_id === "d-lf"') and pg.evaluate('OPENED') == ['https://example.invalid/signed/d-lf'], pg.evaluate('[CALLS, OPENED]'))
    ck('...no storage address is ever written into the card', 'storage/v1' not in pg.inner_html('#card') and 'driver-docs' not in pg.inner_html('#card'))
    pg.evaluate('CALLS = []; OPENED = []'); pg.click('text=Open the signed agreement'); pg.wait_for_timeout(250)
    ck('...the signed agreement opens the same way (server open, doc agreement)', pg.evaluate('CALLS[0] && CALLS[0].action === "open" && CALLS[0].doc === "agreement"') and len(pg.evaluate('OPENED')) == 1)
    pg.evaluate('SERVER.refuseOpen = true; CALLS = []; OPENED = []'); pg.click('#card button[data-doc="d-in"]'); pg.wait_for_timeout(250)
    ck('...a refused open opens nothing and shows the server\'s words', pg.evaluate('OPENED.length') == 0 and 'Not opened: Opening driver documents is for office staff.' in pg.inner_text('#card'), pg.inner_text('#card'))
    pg.evaluate('SERVER.refuseOpen = false')
    # approve refused with blockers
    pg.click('text=Approve driver'); pg.wait_for_timeout(150)
    t = pg.inner_text('#card')
    ck('Approve driver: the form shows the server\'s approve_blockers before anything is pressed', 'Not ready to approve' in t and 'Driving record not checked' in t, t)
    pg.click('#card .drv-form button.ibtn-strong'); pg.wait_for_timeout(300); t = pg.inner_text('#card')
    ck('...pressed anyway, the server refuses (409) and its words and list are shown; the record is read again', 'Not ready to approve.' in t and 'License not verified' in t and pg.evaluate('CALLS.filter(c => c.action === "get").length') >= 1 and pg.evaluate('CALLS.some(c => c.action === "approve" && c.dc_id === "dc-1" && c.caregiver_id === "7")'), t)
    pg.screenshot(path=os.path.join(OUT, 'drv_card_blockers.png'), full_page=True)
    # verify license
    pg.click('text=Verify license'); pg.wait_for_timeout(100)
    ck('Verify license: the expiry is prefilled from the record', pg.input_value('.drv-form input[type=date]') == '2027-03-01')
    pg.fill('.drv-form input[type=date]', '2026-01-01'); pg.click('.drv-form button.ibtn-strong'); pg.wait_for_timeout(300)
    ck('...a past expiry is refused by the server, in its words', 'The license expiry must be in the future.' in pg.inner_text('#card'))
    pg.click('text=Verify license'); pg.fill('.drv-form input[type=date]', '2027-03-01'); pg.fill('.drv-form textarea', 'Checked the card against the photo'); pg.click('.drv-form button.ibtn-strong'); pg.wait_for_timeout(300)
    t = pg.inner_text('#card')
    ck('...accepted: the stamp shows who and when, the form closes and the card is read again', 'recorded as verified' in t and 'Test Staff' in t and pg.locator('.drv-form').count() == 0 and pg.evaluate('CALLS.some(c => c.action === "verify" && c.what === "license" && c.expires === "2027-03-01" && c.note)'), t)
    # verify mvr with a staff upload
    pg.click('text=Verify driving record'); pg.wait_for_timeout(100)
    pg.click('.drv-form button.ibtn-strong'); pg.wait_for_timeout(100)
    ck('Verify driving record: a result is required first', 'choose the driving record result' in pg.inner_text('#card'))
    pg.click('text=Verify driving record'); pg.select_option('.drv-form select', 'acceptable')
    pg.set_input_files('.drv-form input[type=file]', files=[{'name': 'mvr.pdf', 'mimeType': 'application/pdf', 'buffer': b'%PDF-1.4 practice'}])
    pg.evaluate('CALLS = []'); pg.click('.drv-form button.ibtn-strong'); pg.wait_for_timeout(500)
    seq = pg.evaluate('CALLS.map(c => c.action)')
    ck('...with the proof: upload_url, the file PUT to the signed upload, record, then verify, then a fresh read', seq[:4] == ['upload_url', 'record', 'verify', 'get'] and len(puts) == 1 and puts[0]['method'] == 'PUT' and puts[0]['ct'] == 'application/pdf' and puts[0]['size'] > 0, [seq, puts])
    t = pg.inner_text('#card')
    ck('...the result shows as Acceptable, verified by the staff member, with the driving record\'s open button', 'Acceptable' in t and pg.locator('#card button[data-doc="d-mvr"]').count() == 1, t)
    # suspend refused, words
    pg.click('#card button:has-text("Suspend")'); pg.click('.drv-form button.ibtn-strong'); pg.wait_for_timeout(100)
    ck('Suspend: a reason is required', 'give the reason' in pg.inner_text('#card'))
    pg.click('#card button:has-text("Suspend")'); pg.fill('.drv-form textarea', 'License suspended by the state'); pg.click('.drv-form button.ibtn-strong'); pg.wait_for_timeout(300)
    ck('...the server refuses and the card shows its words', 'Only office staff may suspend a driver.' in pg.inner_text('#card') and pg.evaluate('CALLS.some(c => c.action === "suspend" && c.reason === "License suspended by the state")'))
    pg.click('text=Send the caregiver their secure link'); pg.select_option('.drv-form select', 'renewal'); pg.click('.drv-form button.ibtn-strong'); pg.wait_for_timeout(300)
    ck('Send the secure link: asks first, sends why, and shows the server\'s answer', pg.evaluate('CALLS.some(c => c.action === "send_link" && c.why === "renewal")') and 'Sent by text and email.' in pg.inner_text('#card'))
    pg.screenshot(path=os.path.join(OUT, 'drv_card_pending.png'), full_page=True)
    t = show('approved')
    ck('Approved Driver: the pill, every check verified, approval date and approver, no Approve button', 'Approved Driver' in t and 'Samantha Owner' in t and 'Acceptable' in t and 'Not verified' not in t and pg.locator('#card button:has-text("Approve driver")').count() == 0, t)
    t = show('suspended')
    ck('Suspended: the pill and the reason', 'Suspended' in t and 'insurance expired' in t, t)
    pg.screenshot(path=os.path.join(OUT, 'drv_card_suspended.png'), full_page=True)
    # the Overview line
    for st, want in (('pending', 'Pending Verification'), ('suspended', 'insurance expired'), ('none', 'Not set up yet'), ('non_driver', 'non-driving assignments only')):
        pg.evaluate('(s) => { window.SERVER = { status:s }; document.getElementById("gate").innerHTML = ""; }', st)
        pg.evaluate('() => DRV.gate(document.getElementById("gate"), { caregiver_id:"g-" + Math.random() })'); pg.wait_for_timeout(200)
        g = pg.inner_text('#gate')
        ck(f'Overview line, {st}: says the status and that they are not eligible for transport shifts', want in g and 'Not eligible for transport shifts' in g, g)
    pg.evaluate('() => { window.SERVER = { status:"approved" }; return DRV.gate(document.getElementById("gate"), { caregiver_id:"g-approved" }) }'); pg.wait_for_timeout(200)
    ck('Overview line, Approved Driver: nothing in the way, so no line', pg.inner_text('#gate').strip() == '')
    # applicant page: key resolved through hire-profile to the offer
    pg.evaluate('() => { window.SERVER = { status:"pending" }; window.CALLS = []; return DRV.mount(document.getElementById("ap"), { applicant_id:"a1" }) }'); pg.wait_for_timeout(300)
    ck('Applicant page: the application is resolved to its offer through hire-profile, then read by offer_id', pg.evaluate('CALLS[0].fn === "hire-profile" && CALLS[0].applicant_id === "a1" && CALLS.some(c => c.fn === "driver-compliance" && c.action === "get" && c.offer_id === "11111111-2222-3333-4444-555555555555")') and 'Pending Verification' in pg.inner_text('#ap'), pg.evaluate('CALLS'))
    ck('no em dash anywhere on the card', '—' not in pg.inner_text('body'))
    ck('no page errors', not errs, errs)
    b.close()
finally:
    os.remove(TEST)
for s, n, d in R: print(s, ' ', n, ('  ' + d) if d else '')
print(f"\n{sum(1 for r in R if r[0] == 'PASS')}/{len(R)} passed"); raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

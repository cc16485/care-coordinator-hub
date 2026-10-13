"""END TO END with the REAL server (2026-10-13): the driver-compliance edge function from the Staffing repo runs in node against a
fake database and bucket (tests/driver_e2e_server.mjs); Playwright sends the pages' requests to it (request body -> the real
handler -> its response) and the signed uploads land in the fake bucket. The caregiver path on driver.html (view, sign the
vehicle agreement, three uploads) in Chromium and WebKit, then the office card from driver-compliance.js (get, a refused
approve, verify license / insurance / coverage / driving record with the MVR proof uploaded, approve refused for a person not
on the list, approve, the logged opens).
python3 tests/browser/driver_e2e_look.py [<Staffing supabase/functions dir>] [screenshot dir]"""
import json, sys, os, subprocess, urllib.request, urllib.error
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
FNDIR = sys.argv[1] if len(sys.argv) > 1 else '/Users/samantha/Claude/Projects/Staffing-Coordinator-Hub/launch/driver-staff/supabase/functions'
OUT = sys.argv[2] if len(sys.argv) > 2 else '/tmp'
R = []
def ck(n, c, d=''): R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:500]))
def start():
    p = subprocess.Popen(['node', os.path.join(ROOT, 'tests', 'driver_e2e_server.mjs'), FNDIR], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    info = json.loads(p.stdout.readline()); assert 'port' in info, info; return p, info
def post(port, path_, data, headers=None):
    req = urllib.request.Request('http://127.0.0.1:%d%s' % (port, path_), data=data, headers=headers or {}, method='POST')
    try:
        with urllib.request.urlopen(req) as r: return r.status, r.read()
    except urllib.error.HTTPError as e: return e.code, e.read()
def db(port):
    with urllib.request.urlopen('http://127.0.0.1:%d/db' % port) as r: return json.loads(r.read())
def wire(pg, port, calls):
    def fn(route, request):
        body = request.post_data or '{}'; calls.append(json.loads(body))
        st, out = post(port, '/fn', body.encode(), {'Content-Type': 'application/json', 'Authorization': request.headers.get('authorization', '')})
        return route.fulfill(status=st, content_type='application/json', body=out)
    def put(route, request):
        p = request.url.split('https://up.test/')[1].split('?')[0]
        st, out = post(port, '/put?p=' + urllib.request.quote(p, safe='/'), request.post_data_buffer or b'')
        return route.fulfill(status=st, content_type='application/json', body=out)
    pg.route('**/*', lambda r, q: r.continue_() if q.url.startswith('file:') else r.abort())
    pg.route('**/functions/v1/driver-compliance', fn); pg.route('https://up.test/**', put)
JPG = b'\xff\xd8\xff\xe0' + b'0' * 3000
STAFF = r"""<!doctype html><meta charset="utf-8"><body><div id="card" style="max-width:900px"></div><div id="gate"></div>
<script>
window.TOKEN = 'sam'; window.OPENED = [];
window.open = function(){ const w = { document:{ write(){}, body:{} }, close(){} }; Object.defineProperty(w, 'location', { set(v){ window.OPENED.push(String(v)); } }); return w; };
window.confirm = () => true;
/* the supabase-js functions.invoke contract: 2xx -> { data }, otherwise { error: { context: Response } } */
window.sb = { functions: { invoke: async (name, o) => {
  const r = await fetch('https://zngsgedlsxinbygwmxwn.supabase.co/functions/v1/' + name, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:'Bearer ' + window.TOKEN }, body:JSON.stringify(o.body) });
  if(r.ok) return { data: await r.json() };
  return { data:null, error:{ message:'Edge Function returned a non-2xx status code', context:r } };
} } };
</script><script src="driver-compliance.js"></script></body>"""
TEST = os.path.join(ROOT, '_drv_e2e_staff.html'); open(TEST, 'w').write(STAFF)
procs = []
try:
  with sync_playwright() as pw:
    for eng in ('chromium', 'webkit'):
        proc, info = start(); procs.append(proc); port, key = info['port'], info['key']
        b = getattr(pw, eng).launch(); errs = []
        # ── the caregiver ──
        ctx = b.new_context(viewport={'width': 390, 'height': 800}); pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)[:200])); calls = []
        wire(pg, port, calls)
        q = info['link'].split('?')[1]
        pg.goto('file://' + os.path.join(ROOT, 'driver.html') + '?' + q); pg.wait_for_timeout(800)
        t = pg.inner_text('body')
        ck(f'{eng} caregiver: the real view opens on the real link (d, e, t): first name, Pending, what is needed, the question', 'Hi, Pat.' in t and 'Not complete yet' in t and 'Your status: Pending Verification' in t and 'Are you willing and able to transport clients' in t, t[:700])
        pg.locator('.seg button', has_text='Yes').click(); pg.wait_for_timeout(150)
        t = pg.inner_text('body')
        ck(f'{eng} caregiver: Yes shows the real vehicle agreement (version from the server)', 'Responsibility for Personal Vehicle Insurance & Transportation Standards' in t and 'Required Standards for Transporting Clients'.upper() in t.upper() and pg.locator('#b_sign').count() == 1, t[:600])
        pg.locator('#c_sign').check(); pg.fill('#n_sign', 'Pat Practice'); pg.click('#b_sign'); pg.wait_for_timeout(1500)
        t = pg.inner_text('body')
        ck(f'{eng} caregiver: signed for real (practice person): the signed line, the copy link, the three uploads', 'Driver/Vehicle agreement signed on' in t and pg.locator('#okmsg a').count() == 1 and pg.locator('.slot').count() == 3, [t[:900], calls[-2:]])
        pg.fill('#lic_exp', '2030-05-31'); pg.dispatch_event('#lic_exp', 'change')
        pg.set_input_files('#slot_license_front input[type=file]:not([capture])', files=[{'name': 'front.jpg', 'mimeType': 'image/jpeg', 'buffer': JPG}]); pg.wait_for_timeout(900)
        ck(f'{eng} caregiver: license front: upload_url, the PUT to the real signed address, uploaded accepted by the real server', 'is on file' in pg.inner_text('body') and 'On file' in pg.inner_text('#slot_license_front'), [pg.inner_text('#e_license_front'), calls[-3:]])
        pg.set_input_files('#slot_license_back input[type=file][capture]', files=[{'name': 'back.jpg', 'mimeType': 'image/jpeg', 'buffer': JPG}]); pg.wait_for_timeout(900)
        ck(f'{eng} caregiver: license back accepted', 'On file' in pg.inner_text('#slot_license_back'), pg.inner_text('#e_license_back'))
        pg.fill('#ins_co', 'Practice Mutual'); pg.fill('#ins_exp', '2027-04-30'); pg.dispatch_event('#ins_exp', 'change')
        pg.set_input_files('#slot_insurance input[type=file]:not([capture])', files=[{'name': 'dec.pdf', 'mimeType': 'application/pdf', 'buffer': b'%PDF-1.4 practice'}]); pg.wait_for_timeout(900)
        t = pg.inner_text('body')
        ck(f'{eng} caregiver: insurance accepted; nothing left to do; both expiries back from the server in words', 'On file' in pg.inner_text('#slot_insurance') and 'Waiting for the office to check' in t and 'What we still need' not in t and 'May 31, 2030' in t and 'April 30, 2027' in t, [t[:900], pg.inner_text('#e_insurance')])
        D = db(port); row = [r for r in D['driver_compliance'] if r['id'] == key][0]
        ck(f'{eng} caregiver: the real record: vehicle agreement, three documents in the private bucket, expiries and insurer, still Pending', row['agreement_form'] == 'vehicle' and row['status'] == 'pending' and row['license_expires'] == '2030-05-31' and row['insurance_expires'] == '2027-04-30' and row['insurer'] == 'Practice Mutual'
           and sorted(d['kind'] for d in D['driver_document'] if d['dc_id'] == key) == ['insurance', 'license_back', 'license_front'] and all(d['uploaded_by'] == 'caregiver' for d in D['driver_document']), row)
        ck(f'{eng} caregiver: nothing stored in the browser', pg.evaluate('localStorage.length === 0 && sessionStorage.length === 0'))
        pg.screenshot(path=os.path.join(OUT, f'drv_e2e_{eng}_caregiver.png'), full_page=True); ctx.close()
        # ── the office ──
        ctx = b.new_context(viewport={'width': 1000, 'height': 1400}); pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)[:200])); calls = []
        wire(pg, port, calls); pg.goto('file://' + TEST); pg.wait_for_timeout(200)
        pg.evaluate('() => DRV.mount(document.getElementById("card"), { caregiver_id:"204", axiscare_id:"9204" })'); pg.wait_for_timeout(500)
        t = pg.inner_text('#card')
        ck(f'{eng} office: get by caregiver_id: Pending Verification, three documents to open, the server\'s blockers', 'Pending Verification' in t and pg.locator('#card button[data-doc]').count() == 3 and 'The license is not verified' in t, t[:900])
        pg.click('text=Approve driver'); pg.click('.drv-form button.ibtn-strong'); pg.wait_for_timeout(500); t = pg.inner_text('#card')
        ck(f'{eng} office: approve before the checks: the real 409 with its list', 'Not yet:' in t and 'The insurance is not verified' in t, t[:900])
        pg.click('text=Verify license'); pg.click('.drv-form button.ibtn-strong'); pg.wait_for_timeout(500)
        pg.click('text=Verify insurance'); pg.click('.drv-form button.ibtn-strong'); pg.wait_for_timeout(500)
        pg.click('text=Verify coverage'); pg.fill('.drv-form textarea', 'Policy covers transporting clients during paid caregiving'); pg.click('.drv-form button.ibtn-strong'); pg.wait_for_timeout(500)
        pg.click('text=Verify driving record'); pg.select_option('.drv-form select', 'acceptable')
        pg.set_input_files('.drv-form input[type=file]', files=[{'name': 'mvr.pdf', 'mimeType': 'application/pdf', 'buffer': b'%PDF-1.4 mvr'}]); pg.click('.drv-form button.ibtn-strong'); pg.wait_for_timeout(800)
        D = db(port); row = [r for r in D['driver_compliance'] if r['id'] == key][0]
        ck(f'{eng} office: all four verified on the real record, by name; the MVR proof recorded (upload_url, PUT, record)', all(row[k + '_verified_by'] == 'Samantha Troutman' for k in ('license', 'insurance', 'coverage', 'mvr')) and row['mvr_result'] == 'acceptable'
           and any(d['kind'] == 'mvr' and d['uploaded_by'] == 'Samantha Troutman' for d in D['driver_document']), [row, [c.get('action') for c in calls], pg.inner_text('#card')[:600]])
        ck(f'{eng} office: every action named the record by key and nothing else', all(c.get('key') == key for c in calls if c.get('action') in ('verify', 'approve', 'upload_url', 'record')))
        pg.evaluate('TOKEN = "kry"'); pg.click('text=Approve driver'); pg.click('.drv-form button.ibtn-strong'); pg.wait_for_timeout(500)
        ck(f'{eng} office: approve by someone not on the Approve drivers list: the real 403 words', 'Approve drivers list' in pg.inner_text('#card'), pg.inner_text('#card')[:600])
        pg.evaluate('TOKEN = "sam"'); pg.click('text=Approve driver'); pg.click('.drv-form button.ibtn-strong'); pg.wait_for_timeout(600)
        t = pg.inner_text('#card'); D = db(port); row = [r for r in D['driver_compliance'] if r['id'] == key][0]
        ck(f'{eng} office: approve by the owner: Approved Driver on the card and the record, approver named', 'Approved Driver' in t and row['status'] == 'approved' and row['approved_by'] == 'Samantha Troutman' and 'Samantha Troutman' in t, [t[:600], row['status']])
        pg.evaluate('OPENED = []'); pg.locator('#card button[data-doc]').first.click(); pg.wait_for_timeout(500)
        pg.click('text=Open the signed agreement'); pg.wait_for_timeout(500)
        D = db(port)
        ck(f'{eng} office: a document and the signed agreement open by the real server\'s five-minute links, each open logged with the name', len(pg.evaluate('OPENED')) == 2 and all('signed.test' in u for u in pg.evaluate('OPENED')) and len(D['document_access_log']) >= 2, [pg.evaluate('OPENED'), D['document_access_log'][-2:], pg.inner_text('#card')[-300:]])
        pg.click('#card summary'); pg.wait_for_timeout(100); h = pg.inner_text('#card details')
        ck(f'{eng} office: the real history lists the signature, uploads, verifications and approval', all(w in h for w in ('Agreement signed', 'Document uploaded', 'Verified', 'Approved to drive')), h[:800])
        pg.evaluate('() => DRV.gate(document.getElementById("gate"), { caregiver_id:"204" })'); pg.wait_for_timeout(400)
        ck(f'{eng} office: the Overview line is empty for an Approved Driver', pg.inner_text('#gate').strip() == '')
        pg.screenshot(path=os.path.join(OUT, f'drv_e2e_{eng}_office.png'), full_page=True); ctx.close()
        ck(f'{eng}: no page errors', not errs, errs)
        b.close(); proc.kill()
finally:
    for p in procs:
        try: p.kill()
        except Exception: pass
    os.remove(TEST)
for s_, n, d in R: print(s_, ' ', n, ('  ' + d) if d else '')
print(f"\n{sum(1 for r in R if r[0] == 'PASS')}/{len(R)} passed"); raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

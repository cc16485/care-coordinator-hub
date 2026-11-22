"""The client's Driving tab (2026-11-21, Samantha: "a clear mark on driving - do they want us to provide transportation? Do they
want the caregiver to drive the caregivers car or drive the clients car? If want us to drive the clients car we need to see that
inspection is up to date and insurance proof before our caregiver can drive the clients car").
client-driving.js offline with the server faked to its contract: the banner for every answer, whose-car buttons, the client's
car box with "Still to do", the papers read through the logged open and shown from memory (no storage address on the page),
nothing read while the tab is hidden, check / exempt calls, and phone width. Chromium.
python3 tests/browser/client_driving_look.py [screenshot dir]"""
import json, sys, os
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp'
TEST = os.path.join(ROOT, '_cdrv_tab_test.html')
K = 'aaaaaaaa-bbbb-4ccc-8ddd-000000000001'; D1 = 'aaaaaaaa-bbbb-4ccc-8ddd-000000000011'
def row(mode, **x):
    r = {'id': K, 'client_ax_id': '300', 'lead_id': 'L1', 'name': 'Betty Harlow', 'mode': mode, 'mode_from': 'visit', 'mode_by': 'Casey', 'mode_at': '2026-11-20T15:00:00Z'}
    r.update(x); return r
NOT = {'ok': False, 'why': "The client's car is not cleared yet", 'missing': ["Proof of insurance on the client's car, checked by the office", 'A current vehicle inspection paper, checked by the office (or mark the car exempt)']}
CASES = {
  'unset': {'row': None, 'docs': [], 'events': [], 'derived': {'mode_label': 'Not asked yet', 'uses_client_car': False, 'car': NOT, 'shift_words': None, 'renewals': []}},
  'none': {'row': row('none'), 'docs': [], 'events': [], 'derived': {'mode_label': 'No driving', 'uses_client_car': False, 'car': NOT, 'shift_words': None, 'renewals': []}},
  'own': {'row': row('caregiver_car'), 'docs': [], 'events': [], 'derived': {'mode_label': "Caregiver's car", 'uses_client_car': False, 'car': NOT, 'shift_words': 'Driver needed: you drive the client in your own car', 'renewals': []}},
  'client': {'row': row('client_car', mode_from='agreement', car_make_model='Honda CR-V', car_year=2018), 'docs': [{'id': D1, 'kind': 'car_insurance', 'content_type': 'image/jpeg', 'uploaded_at': '2026-11-21T15:00:00Z', 'superseded_at': None, 'verified_at': None}],
             'events': [{'at': '2026-11-21T15:00:00Z', 'kind': 'car', 'by_name': 'Casey', 'detail': {'from': 'agreement', 'car': 'accept', 'make_model': 'Honda CR-V', 'year': 2018, 'insurance_expires_typed': '2027-03-01'}},
                        {'at': '2026-11-21T15:01:00Z', 'kind': 'conflict', 'by_name': 'Casey', 'detail': {'why': 'The signed agreement says "No driving", but the office set "Client\'s car". Check with the family.'}}],
             'derived': {'mode_label': "Client's car", 'uses_client_car': True, 'car': NOT, 'shift_words': "Driver needed: the client's car (the office is still checking its papers)", 'renewals': []}},
  'cleared': {'row': row('client_car', insurance_verified_at='2026-11-21T15:00:00Z', insurance_verified_by='Casey', insurance_expires='2027-03-01', inspection_exempt_at='2026-11-21T15:00:00Z', inspection_exempt_by='Samantha Troutman', car_year=2022, car_miles=31200),
              'docs': [{'id': D1, 'kind': 'car_insurance', 'content_type': 'image/jpeg', 'uploaded_at': '2026-11-21T15:00:00Z', 'superseded_at': None, 'verified_at': '2026-11-21T15:00:00Z'}], 'events': [],
              'derived': {'mode_label': "Client's car", 'uses_client_car': True, 'car': {'ok': True, 'why': 'cleared', 'missing': []}, 'shift_words': "Driver needed: you drive the client's car", 'renewals': []}},
}
FAKE = r"""<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:system-ui;background:#F6F9FD;padding:16px;margin:0}.card{background:#fff;border:1px solid #e4e1d8;border-radius:12px}
.btn{font:inherit;padding:6px 12px;border-radius:8px;border:1px solid #ccc;background:#fff}.btn-primary{background:#0E3860;color:#fff}:root{--gray:#6B7280;--border:#E2E8F0}</style><body>
<div id="tabwrap"><div id="cdrvHost"></div></div>
<script>
window.CALLS = []; window.CASE = 'unset'; const CASES = %s;
window.sb = { functions: { invoke: async (name, o) => {
  const b = o.body; window.CALLS.push(Object.assign({ fn:name }, b));
  if(b.action === 'get') return { data: Object.assign({ ok:true }, CASES[window.CASE]) };
  if(b.action === 'open') return { data:{ ok:true, url:'http://pics.test/' + b.doc_id } };
  if(b.action === 'verify' && !b.expires) return { data:{ ok:false, error:'Enter the expiration date shown on the paper. It must be in the future.' } };
  return { data:{ ok:true } };
} } };
</script><script src="client-driving.js"></script></body>""" % json.dumps(CASES)
open(TEST, 'w').write(FAKE)
SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="340" height="215"><rect width="340" height="215" rx="14" fill="#2563EB"/><text x="20" y="40" font-size="20" fill="#fff">INSURANCE CARD</text></svg>'
R = []
def ck(n, c, d=''): R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:500]))
try:
  with sync_playwright() as pw:
    br = pw.chromium.launch(); pg = br.new_page(viewport={'width': 940, 'height': 1100}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.route('http://pics.test/**', lambda route, req: route.fulfill(status=200, content_type='image/svg+xml', body=SVG))
    pg.goto('file://' + TEST); pg.wait_for_timeout(200)
    def show(case):
        pg.evaluate('(c) => { window.CASE = c; window.CALLS = []; CDRV.mount({ ax:"300", lead:"L1", name:"Betty Harlow" }); return CDRV.load(); }', case); pg.wait_for_timeout(400)
        return pg.inner_text('#cdrvHost')
    pg.evaluate('() => { CDRV.mount({ ax:"300", lead:"L1", name:"Betty Harlow" }); }')
    ck('mounting a profile reads nothing (the server is read only when the tab is opened)', pg.evaluate('CALLS.length') == 0)
    t = show('unset')
    ck('not asked yet: the banner says so and asks the question', 'Not asked yet' in t and 'Do they want us to drive, and in whose car?' in t, t)
    ck('...the four answers are buttons', all(x in t for x in ['No driving', "Caregiver's car", "Client's car", "Caregiver's car or the client's car"]), t)
    ck('...the get call names the client by AxisCare number and lead', pg.evaluate('CALLS[0]') == {'fn': 'client-driving', 'action': 'get', 'ax': '300', 'lead': 'L1', 'name': 'Betty Harlow'}, pg.evaluate('CALLS[0]'))
    t = show('none')
    ck('No driving: a clear banner, no car box, no shift line', 'No driving' in t and "The client's car" not in t and 'Shifts and coverage texts say' not in t, t)
    t = show('own')
    ck("caregiver's car: banner, where it came from, and what shifts say", "Caregiver's car" in t and 'From the home visit (Casey)' in t and 'Driver needed: you drive the client in your own car' in t, t)
    pg.evaluate('CALLS = []'); pg.click('[data-cdrv="mode"][data-v="either"]'); pg.wait_for_timeout(300)
    c = pg.evaluate('CALLS[0]')
    ck("tapping an answer saves it from the office", c.get('action') == 'set_mode' and c.get('mode') == 'either' and c.get('from') == 'office' and c.get('ax') == '300', c)
    t = show('client')
    ck("client's car, not cleared: a red NOT cleared line", "The client's car is NOT cleared yet" in t, t)
    ck('...Still to do lists the insurance check and the inspection', 'Still to do before a caregiver may drive this car' in t and 'Proof of insurance' in t and 'vehicle inspection paper' in t, t)
    ck('...the signed agreement said Accept, the car and the typed date marked not checked', 'Accepted use of the client' in t and 'Honda CR-V (2018)' in t and '(not checked)' in t, t)
    ck('...the conflict card words show', 'Check with the family' in t, t)
    ck('...the insurance card is uploaded, not checked yet; the inspection is not on file', 'Uploaded, not checked yet' in t and 'Not on file' in t, t)
    ck('...the insurance picture is read through the logged open and shown from memory (blob:)', pg.evaluate('CALLS.some(c => c.action === "open" && c.doc_id === "%s")' % D1) and pg.evaluate('!!document.querySelector(".cdrv-look img") && document.querySelector(".cdrv-look img").src.startsWith("blob:")'))
    ck('...no storage address anywhere on the page', 'driver-docs' not in pg.content() and 'pics.test' not in pg.evaluate('document.getElementById("cdrvHost").innerHTML'))
    pg.evaluate('CALLS = []'); pg.click('[data-cdrv="verify"][data-v="insurance"]'); pg.wait_for_timeout(400)
    ck("'I checked it' with no date: the server's own words show", 'Enter the expiration date shown on the paper' in pg.inner_text('#cdrvHost'), pg.inner_text('#cdrvHost'))
    pg.fill('[data-cdrv-exp="car_insurance"]', '2027-03-01'); pg.evaluate('CALLS = []'); pg.click('[data-cdrv="verify"][data-v="insurance"]'); pg.wait_for_timeout(400)
    c = pg.evaluate('CALLS[0]')
    ck("'I checked it' with the date: verify insurance with that date", c.get('action') == 'verify' and c.get('what') == 'insurance' and c.get('expires') == '2027-03-01' and c.get('key') == K, c)
    pg.click('details.cdrv-ex summary'); pg.fill('[data-cdrv-ey]', '2022'); pg.fill('[data-cdrv-em]', '31200'); pg.fill('[data-cdrv-en]', 'saw the dashboard')
    pg.evaluate('CALLS = []'); pg.click('[data-cdrv="exempt"]'); pg.wait_for_timeout(400)
    c = pg.evaluate('CALLS[0]')
    ck('mark exempt sends the year, miles and note', c.get('action') == 'exempt' and c.get('year') == '2022' and c.get('miles') == '31200' and c.get('note') == 'saw the dashboard', c)
    t = show('cleared')
    ck("cleared: green line, exempt with year and miles, shifts say the client's car", "is cleared for a caregiver to drive" in t and 'Exempt: 2022, 31,200 miles' in t and "Driver needed: you drive the client's car" in t and 'Still to do' not in t, t)
    pg.screenshot(path=os.path.join(OUT, 'client_driving_tab.png'), full_page=True)
    pg.evaluate('() => { document.getElementById("tabwrap").style.display = "none"; window.CASE = "client"; window.CALLS = []; CDRV.mount({ ax:"301", lead:"", name:"X" }); return CDRV.load(); }'); pg.wait_for_timeout(400)
    ck('a hidden tab never opens a paper (opening is logged with your name)', not pg.evaluate('CALLS.some(c => c.action === "open")'), pg.evaluate('CALLS'))
    pg.evaluate('() => { document.getElementById("tabwrap").style.display = ""; }')
    pg.set_viewport_size({'width': 375, 'height': 900}); show('client')
    w = pg.evaluate('document.documentElement.scrollWidth')
    ck('phone width: no sideways scroll', w <= 375, w)
    pg.screenshot(path=os.path.join(OUT, 'client_driving_tab_phone.png'), full_page=True)
    ck('no page errors', not errs, errs)
    br.close()
finally:
  try: os.remove(TEST)
  except Exception: pass
for s, n, d in R: print(('  ✓ ' if s == 'PASS' else '  ✗ ') + n + (('\n      ' + d) if d else ''))
p = sum(1 for r in R if r[0] == 'PASS'); print(f'\n{p}/{len(R)} passed'); sys.exit(0 if p == len(R) else 1)

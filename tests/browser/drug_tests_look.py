"""Drug tests card (Samantha's ruling 2026-10-13): drug-tests.js offline with the drug-test server faked to its contract
(Staffing supabase/functions/drug-test/index.ts). The owner view (a full test: reason, type, result, proof, history),
another staff member's view (only that a record exists, no buttons), starting a record (the server's refusal shown when
the reason is missing; the reason and date sent as typed), recording a result with a proof (upload_url, the PUT to the
signed upload, then result with the path), a correction as a new line, the proof opened only through the server, and the
applicant page's key resolved through hire-profile. Chromium.
python3 tests/browser/drug_tests_look.py [screenshot dir]"""
import json, sys, os
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp'
TEST = os.path.join(ROOT, '_dt_card_test.html')
T1 = '00000000-0000-4000-8000-000000000001'
UPLOAD = 'https://zngsgedlsxinbygwmxwn.supabase.co/storage/v1/object/upload/sign/drug-test-docs/dt/' + T1 + '/1760371200000-ab12cd34.pdf?token=tok'
TEST1 = {'id': T1, 'name': 'Pat Practice', 'date_requested': '2026-10-12', 'requested_by': {'name': 'Samantha', 'email': 'samantha@mo-care.com'},
         'reason': 'Our written policy calls for a test here; details in the HR file.', 'test_type': '10-panel urine', 'notes': 'At the clinic on Glenstone',
         'result': 'negative', 'result_date': '2026-10-13', 'result_notes': 'MRO report', 'result_entry_id': '00000000-0000-4000-8000-000000000002',
         'has_proof': True, 'proof_entry_id': '00000000-0000-4000-8000-000000000002', 'corrected': False,
         'history': [{'id': T1, 'at': '2026-10-12T15:00:00Z', 'kind': 'request', 'entered_by': 'Samantha', 'date_requested': '2026-10-12', 'reason': 'Our written policy calls for a test here; details in the HR file.', 'test_type': '10-panel urine', 'has_proof': False},
                     {'id': '00000000-0000-4000-8000-000000000002', 'at': '2026-10-13T15:00:00Z', 'kind': 'result', 'entered_by': 'Samantha', 'result': 'negative', 'result_date': '2026-10-13', 'has_proof': True, 'notes': 'MRO report'}]}
FAKE = r"""<!doctype html><meta charset="utf-8"><body><div id="card" style="max-width:820px"></div><div id="ap"></div>
<script>
window.CALLS = []; window.OPENED = []; window.SERVER = { owner:true, tests:[] };
window.open = function(){ const w = { document:{ write(){} }, close(){} }; Object.defineProperty(w, 'location', { set(v){ window.OPENED.push(String(v)); } }); return w; };
const T1 = %s;
function refuse(status, body){ return { data:null, error:{ message:'Edge Function returned a non-2xx status code', context:{ status, json: async () => Object.assign({ ok:false }, body) } } }; }
window.sb = { functions: { invoke: async (name, o) => {
  const b = o.body, S = window.SERVER; window.CALLS.push(Object.assign({ fn:name }, b));
  if(name === 'hire-profile') return { data:{ ok:true, ids:{ offer_id:'11111111-2222-4333-8444-555555555555', candidate_id:42, applicant_id:'a1' } } };
  if(b.action === 'get') return { data:{ ok:true, may_record:S.owner, tests: S.owner ? JSON.parse(JSON.stringify(S.tests)) : S.tests.map(t => ({ id:t.id, restricted:true })) } };
  if(!S.owner) return refuse(403, { error:'Only an owner may record a drug test. Nothing was saved.' });
  if(b.action === 'request'){ if(String(b.reason || '').trim().length < 5) return refuse(400, { error:'Please write the reason in your own words (at least five characters). Nothing was saved.' });
    S.tests.push({ id:'00000000-0000-4000-8000-000000000009', date_requested:b.date_requested, requested_by:{ name:'Samantha' }, reason:b.reason, test_type:b.test_type, notes:b.notes, result:'pending', has_proof:false, history:[{ id:'x', at:'2026-10-13T16:00:00Z', kind:'request', entered_by:'Samantha', reason:b.reason }] });
    return { data:{ ok:true, test_id:'00000000-0000-4000-8000-000000000009' } }; }
  if(b.action === 'upload_url'){ if(b.content_type !== 'application/pdf') return refuse(400, { error:'Use a photo (JPG, PNG, HEIC or WebP) or a PDF.' }); return { data:{ ok:true, path:'dt/' + b.test_id + '/1760371200000-ab12cd34.pdf', token:'tok', url:'%s' } }; }
  if(b.action === 'result'){ const t = S.tests.find(x => x.id === b.test_id); if(['negative','positive','refused'].includes(b.result) && !b.result_date) return refuse(400, { error:'Please give the result date. Nothing was saved.' });
    Object.assign(t, { result:b.result, result_date:b.result_date || null, has_proof:!!b.proof_path || t.has_proof, proof_entry_id:'r9', result_entry_id:'r9' }); t.history.push({ id:'r9', at:'2026-10-13T16:05:00Z', kind:'result', entered_by:'Samantha', result:b.result, result_date:b.result_date, has_proof:!!b.proof_path }); return { data:{ ok:true, entry_id:'r9' } }; }
  if(b.action === 'correct'){ if(String(b.correction_reason || '').trim().length < 5) return refuse(400, { error:'Please say what is being corrected and why (at least five characters). Nothing was saved.' });
    const t = S.tests.find(x => x.id === b.entry_id || x.result_entry_id === b.entry_id); t.result = b.result || t.result; t.corrected = true; t.history.push({ id:'c1', at:'2026-10-13T16:10:00Z', kind:'correction', entered_by:'Samantha', corrects:b.entry_id, correction_reason:b.correction_reason, result:b.result }); return { data:{ ok:true, entry_id:'c1' } }; }
  if(b.action === 'open'){ if(S.refuseOpen) return refuse(500, { error:'The open could not be logged, so the document is not shown. Try again.' }); return { data:{ ok:true, url:'https://zngsgedlsxinbygwmxwn.supabase.co/storage/v1/object/sign/drug-test-docs/x?token=' + b.entry_id, expires_in:300 } }; }
  return refuse(400, { error:'Unknown action.' });
} } };
</script><script src="drug-tests.js"></script></body>""" % (json.dumps(TEST1), UPLOAD)
open(TEST, 'w').write(FAKE)
R = []
def ck(n, c, d=''): R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:400]))
try:
  with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1000, 'height': 1300}); errs = []; puts = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    def put(route, request):
        puts.append({'method': request.method, 'ct': request.headers.get('content-type'), 'size': len(request.post_data_buffer or b'')}); return route.fulfill(status=200, body='{}')
    pg.route('**/storage/v1/object/upload/sign/**', put)
    pg.goto('file://' + TEST); pg.wait_for_timeout(200)
    def show(owner, tests, key=None):
        pg.evaluate('([o, t]) => { window.SERVER = { owner:o, tests:t }; window.CALLS = []; window.OPENED = []; }', [owner, tests])
        pg.evaluate('(k) => DT.mount(document.getElementById("card"), k)', key or {'caregiver_id': '7', 'offer_id': '11111111-2222-4333-8444-555555555555'}); pg.wait_for_timeout(250)
        return pg.inner_text('#card')
    t = show(True, [])
    ck('nothing on file: says so, explains it is not an onboarding step and nothing is automatic, and an owner may start a record', 'No drug test on record.' in t and 'This is not an onboarding step: nothing here happens on its own and nothing reminds anyone.' in t and 'Start a drug test record' in t, t)
    pg.click('text=Start a drug test record'); pg.wait_for_timeout(100)
    ck('the form: date requested (today by default), the reason in your own words, test type, notes; no list of grounds anywhere', pg.locator('.dt-form textarea').count() == 2 and pg.locator('.dt-form select').count() == 0 and pg.input_value('.dt-form input[type=date]') != '' and 'Reason, in your own words (required)' in pg.inner_text('#card'), pg.inner_text('#card'))
    pg.click('.dt-form button:has-text("Save")'); pg.wait_for_timeout(250)
    ck('saved without a reason: the server refuses, its words are shown, the form stays', 'Please write the reason in your own words' in pg.inner_text('#card') and pg.locator('.dt-form').count() == 1, pg.inner_text('#card'))
    pg.fill('#card .dt-form input[type=date]', '2026-10-12'); pg.fill('#card .dt-form textarea >> nth=0', 'Our written policy calls for this test.'); pg.fill('#card .dt-form input[type=text]', 'Breath alcohol')
    pg.click('.dt-form button:has-text("Save")'); pg.wait_for_timeout(300)
    ck('saved: request sent with the date, the reason and type as typed, and the person keys; then read again', pg.evaluate('CALLS.some(c => c.action === "request" && c.date_requested === "2026-10-12" && c.reason === "Our written policy calls for this test." && c.test_type === "Breath alcohol" && c.caregiver_id === "7" && c.offer_id)') and 'Recorded, with your name and the time.' in pg.inner_text('#card') and 'Pending' in pg.inner_text('#card'), pg.evaluate('CALLS'))
    t = show(True, [TEST1])
    ck('owner view: the result pill, requested date and who, the reason, the type, the result date, notes', 'Negative' in t and 'Requested Oct 12, 2026' in t and 'by Samantha' in t and 'Our written policy calls for a test here; details in the HR file.' in t and '10-panel urine' in t and 'Oct 13, 2026' in t and 'At the clinic on Glenstone' in t, t)
    ck('owner view: record a result, correct the request, correct the result; the history collapsed', all(x in t for x in ('Record a result', 'Correct the request', 'Correct the result')) and pg.locator('#card details').count() == 1 and pg.evaluate('!document.querySelector("#card details").open') and 'History (2 lines, never changed)' in t, t)
    pg.screenshot(path=os.path.join(OUT, 'dt_card_owner.png'), full_page=True)
    # open the proof
    pg.click('text=Open the document'); pg.wait_for_timeout(250)
    ck('the proof opens only through the server (open { entry_id }) and only the link it returns', pg.evaluate('CALLS.filter(c => c.action === "open").length === 1 && CALLS.find(c => c.action === "open").entry_id === "00000000-0000-4000-8000-000000000002"') and len(pg.evaluate('OPENED')) == 1, pg.evaluate('[CALLS, OPENED]'))
    ck('no storage address is ever written into the card', 'storage/v1' not in pg.inner_html('#card') and 'drug-test-docs' not in pg.inner_html('#card'))
    pg.evaluate('SERVER.refuseOpen = true; OPENED = []'); pg.click('text=Open the document'); pg.wait_for_timeout(250)
    ck('a refused open opens nothing and shows the server\'s words', pg.evaluate('OPENED.length') == 0 and 'The open could not be logged' in pg.inner_text('#card'))
    pg.evaluate('SERVER.refuseOpen = false')
    # record a result with a proof
    pg.click('text=Record a result'); pg.wait_for_timeout(100)
    pg.select_option('#card .dt-form select', 'refused'); pg.click('.dt-form button:has-text("Save")'); pg.wait_for_timeout(250)
    ck('a refused result without its date: the server refuses and says so', 'Please give the result date.' in pg.inner_text('#card'))
    pg.select_option('#card .dt-form select', 'positive'); pg.fill('#card .dt-form input[type=date]', '2026-10-13')
    pg.set_input_files('#card .dt-form input[type=file]', files=[{'name': 'report.pdf', 'mimeType': 'application/pdf', 'buffer': b'%PDF-1.4 practice'}])
    pg.evaluate('CALLS = []'); pg.click('.dt-form button:has-text("Save")'); pg.wait_for_timeout(500)
    seq = pg.evaluate('CALLS.map(c => c.action)')
    ck('with the proof: upload_url, the PUT to the signed upload, result with the path, then a fresh read', seq[:3] == ['upload_url', 'result', 'get'] and pg.evaluate('CALLS[1].result === "positive" && CALLS[1].result_date === "2026-10-13" && /^dt\\//.test(CALLS[1].proof_path) && CALLS[1].proof_content_type === "application/pdf"') and len(puts) == 1 and puts[0]['method'] == 'PUT' and puts[0]['size'] > 0, [seq, puts])
    ck('the result shows as Positive', 'Positive' in pg.inner_text('#card') and 'Result recorded, with your name and the time.' in pg.inner_text('#card'))
    # correction
    pg.click('text=Correct the result'); pg.wait_for_timeout(100)
    ck('correct: the form says it is a new line and asks what and why', 'A correction is a new line in the history; the earlier line is kept exactly as it was.' in pg.inner_text('#card') and 'What is being corrected and why (required)' in pg.inner_text('#card'))
    pg.select_option('#card .dt-form select', 'cancelled'); pg.click('.dt-form button:has-text("Save")'); pg.wait_for_timeout(250)
    ck('without the why: refused, in the server\'s words', 'Please say what is being corrected and why' in pg.inner_text('#card'))
    pg.fill('#card .dt-form textarea >> nth=-1', 'The clinic cancelled; entered on the wrong day.'); pg.click('.dt-form button:has-text("Save")'); pg.wait_for_timeout(300)
    t = pg.inner_text('#card')
    ck('saved: a correction line, the record reads Cancelled and says it was corrected', pg.evaluate('CALLS.some(c => c.action === "correct" && c.entry_id === "r9" && c.result === "cancelled" && c.correction_reason)') and 'Cancelled' in t and '(corrected; see the history)' in t and 'Correction recorded as a new line' in t, t)
    pg.click('#card summary'); pg.wait_for_timeout(100)
    ck('the history lists every line, the correction with its why', 'Correction' in pg.inner_text('#card details') and 'why: The clinic cancelled' in pg.inner_text('#card details'))
    pg.screenshot(path=os.path.join(OUT, 'dt_card_corrected.png'), full_page=True)
    # another staff member
    t = show(False, [TEST1])
    ck('other office staff: only that a record exists; no reason, result, type, dates, names or buttons', 'A drug test record exists.' in t and 'Only an owner or the person who requested it can see it.' in t and not any(x in t for x in ('Negative', 'policy calls for a test', '10-panel', 'Oct 12', 'Samantha', 'Record a result', 'Start a drug test record')), t)
    pg.screenshot(path=os.path.join(OUT, 'dt_card_staff.png'), full_page=True)
    # applicant page
    pg.evaluate('() => { window.SERVER = { owner:true, tests:[] }; window.CALLS = []; return DT.mount(document.getElementById("ap"), { applicant_id:"a1" }) }'); pg.wait_for_timeout(300)
    ck('applicant page: resolved through hire-profile, then read by the offer, the Hub record and the application', pg.evaluate('CALLS[0].fn === "hire-profile" && CALLS.some(c => c.fn === "drug-test" && c.action === "get" && c.offer_id === "11111111-2222-4333-8444-555555555555" && c.candidate_id === "42" && c.applicant_id === "a1")'), pg.evaluate('CALLS'))
    pg.set_viewport_size({'width': 375, 'height': 900}); t = show(True, [TEST1])
    ck('phone width: no sideways scroll', pg.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'))
    ck('no em dash anywhere on the card', '—' not in pg.inner_text('body'))
    ck('no page errors', not errs, errs)
    b.close()
finally:
    os.remove(TEST)
for s, n, d in R: print(s, ' ', n, ('  ' + d) if d else '')
print(f"\n{sum(1 for r in R if r[0] == 'PASS')}/{len(R)} passed"); raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

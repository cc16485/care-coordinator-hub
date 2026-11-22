"""A signed paper Client Care Agreement uploaded as a PDF (Samantha 2026-11-21; her answers: Accept counts as signed; any version).
agreement-paper.js with the server faked to its contract, served from disk on a local port: upload, read, the review (sections,
"Please look", the missing-signature warning, not-on-this-version), fixing a box, Save, Accept (save then accept, the card
redraws), Set aside, and the PDF opened only through the server. Chromium.
python3 tests/browser/agreement_paper_look.py"""
import json, sys, os, threading, http.server, socketserver, functools
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
TEST = os.path.join(ROOT, '_cap_test.html')
READ = {'version_label': 'Client Service Agreement (12-25)', 'client_signed': False, 'signer_name': 'Mary Harlow', 'signer_role': 'representative', 'signed_date': '2025-12-03',
        'office_signed': False, 'client_name_on_paper': 'Betty Harlow', 'unclear': [{'key': 'client.address', 'why': 'smudged'}], 'not_on_this_version': ['esv.enrolled'], 'notes': 'Page 4 is upside down.'}
PAPER = {'id': 'p1', 'status': 'review', 'read': READ, 'answers': {'c1.name': 'Mary Harlow', 'c1.hipaa_yes': True, 'client.address': '12 Elm', 'car.accept': True}, 'read_at': '2026-11-21T18:00:00Z', 'read_by': 'Casey'}
FAKE = r"""<!doctype html><meta charset="utf-8"><style>body{font-family:system-ui;padding:16px}:root{--navy:#0E3860;--border:#ddd;--text-muted:#666}</style>
<div id="slot"></div>
<script>
window.CALLS = []; window.STATE = 'none'; window.DONE = 0; const PAPER = %s;
window.CP = { r:{ client_name:'Betty Harlow' } };
window.sb = { functions: { invoke: async (n, o) => { const b = o.body; CALLS.push(b);
  if(b.action === 'list') return { data:{ ok:true, papers: STATE === 'review' ? [PAPER] : [] } };
  if(b.action === 'upload_url') return { data:{ ok:true, id:'p1', path:'x', url:'http://upload.test/put' } };
  if(b.action === 'read'){ STATE = 'review'; return { data:{ ok:true, paper:PAPER } }; }
  if(b.action === 'open') return { data:{ ok:true, url:'http://signed.test/pdf' } };
  if(b.action === 'set_aside') return b.reason && b.reason.length > 2 ? { data:{ ok:true } } : { data:{ error:'Say why it is set aside.' } };
  return { data:{ ok:true } }; } } };
window.open = (u) => { window.OPENED = u; return null; };
</script><script src="agreement-paper.js"></script>""" % json.dumps(PAPER)
open(TEST, 'w').write(FAKE)
R = []
def ck(n, c, d=''): R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:500]))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.TCPServer(('127.0.0.1', 0), functools.partial(Q, directory=ROOT)); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
try:
  with sync_playwright() as pw:
    br = pw.chromium.launch(); pg = br.new_page(viewport={'width': 1000, 'height': 1200}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.route('http://upload.test/**', lambda route, req: route.fulfill(status=200, body='{}'))
    pg.goto(f'http://127.0.0.1:{port}/_cap_test.html'); pg.wait_for_timeout(300)
    pg.evaluate('CAP.mount(document.getElementById("slot"), { client_ax:"300" }, () => { window.DONE++; })'); pg.wait_for_timeout(400)
    t = pg.inner_text('#slot')
    ck('the Upload button, and nothing in review yet', 'Upload a signed paper agreement (PDF)' in t and 'Accept as the signed agreement' not in t, t)
    pg.set_input_files('[data-cap-file]', files=[{'name': 'agreement.pdf', 'mimeType': 'application/pdf', 'buffer': b'%PDF-1.4 test'}]); pg.wait_for_timeout(900)
    acts = [c['action'] for c in pg.evaluate('CALLS')]
    ck('upload: a slot for this client with the client name, the PDF put, then read', acts[:4] == ['list', 'upload_url', 'read', 'list'] and pg.evaluate('CALLS[1]').get('client_ax') == '300' and pg.evaluate('CALLS[1]').get('name') == 'Betty Harlow', acts)
    t = pg.inner_text('#slot')
    ck('review: the version, the signer for the client, the date', 'Paper agreement: Client Service Agreement (12-25)' in t and 'Mary Harlow (for the client)' in t and '2025-12-03' in t, t)
    ck('review: no family signature found = a red warning; the name on the paper', "did not find the family's signature" in t and 'Name on the paper: Betty Harlow' in t, t)
    ck('review: "Please look" on the unclear answer, the note, what this version did not ask', 'Please look: smudged' in t and 'upside down' in t and 'did not ask 1 of today' in t, t)
    ck('review: the pulled answers are in their boxes (text and ticks)', pg.input_value('[data-cap-k="c1.name"]') == 'Mary Harlow' and pg.is_checked('[data-cap-k="c1.hipaa_yes"]') and pg.is_checked('[data-cap-k="car.accept"]'))
    ck('review: no signature, initials or date boxes to fill', pg.locator('[data-cap-k^="sig."], [data-cap-k^="ini."], [data-cap-k^="date."]').count() == 0)
    ck('review: sections with nothing on the paper stay closed', pg.evaluate('[...document.querySelectorAll("#slot details")].filter(d => !d.open).length') > 3)
    pg.click('[data-cap-open="p1"]'); pg.wait_for_timeout(200)
    ck('Open the PDF: through the server link', pg.evaluate('window.OPENED') == 'http://signed.test/pdf')
    pg.fill('[data-cap-k="client.address"]', '12 Elm St'); pg.evaluate('CALLS = []'); pg.click('[data-cap-save="p1"]'); pg.wait_for_timeout(300)
    c = pg.evaluate('CALLS[0]')
    ck('Save: every box as it is now, the fix included', c.get('action') == 'save' and c['answers'].get('client.address') == '12 Elm St' and c['answers'].get('c1.hipaa_yes') is True and 'c1.hipaa_no' not in c['answers'], c)
    pg.evaluate('CALLS = []'); pg.click('[data-cap-aside="p1"]'); pg.wait_for_timeout(300)
    ck('Set aside without a reason: the server words show', 'Say why it is set aside.' in pg.inner_text('#slot'))
    pg.evaluate('CALLS = []'); pg.click('[data-cap-accept="p1"]'); pg.wait_for_timeout(400)
    acts = [c['action'] for c in pg.evaluate('CALLS')]
    ck('Accept: saves the boxes first, then accepts; the card redraws', acts[:2] == ['save', 'accept'] and pg.evaluate('DONE') == 1, acts)
    t = pg.inner_text('#slot') if pg.locator('#slot').count() else ''
    ck('no "AI" wording and no em dashes on the screen', '—' not in pg.content().split('<script')[0] and ' AI ' not in t)
    ck('no page errors', not errs, errs)
    br.close()
finally:
  srv.shutdown()
  try: os.remove(TEST)
  except Exception: pass
for s, n, d in R: print(('  ✓ ' if s == 'PASS' else '  ✗ ') + n + (('\n      ' + d) if d else ''))
p = sum(1 for r in R if r[0] == 'PASS'); print(f'\n{p}/{len(R)} passed'); sys.exit(0 if p == len(R) else 1)

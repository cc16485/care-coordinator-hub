"""Family notes, top of Family & Contacts (profile fill, Stage B; Samantha 2026-11-21, "as recommended"): the call order, the
email permission and the photo choice from the client's profile record; the home visit's people and emergency contact not yet
in People involved, offered one tap at a time, never added silently; Add goes through client-fact record_person (first record,
permission not asked); Not now is kept on the visit so it never comes back. family-notes.js offline. Chromium.
python3 tests/browser/family_notes_look.py"""
import json, sys, os
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
TEST = os.path.join(ROOT, '_fnote_test.html')
DATA = {'client_profiles': [{'id': 'cp_ax300', 'call_order': 'Mary first, then John', 'email_ok': 'no', 'photos': 'none'}],
        'care_assessments': [{'id': 'a1', 'lead_id': 'L1', 'axiscare_client_id': '300', 'visit': {'finished_at': '2026-11-21T17:00:00Z',
          'attendees': [{'name': 'Betty Harlow', 'role': 'client'}, {'name': 'Mary Harlow', 'rel': 'Daughter', 'role': 'primary'}, {'name': 'John Reed', 'rel': 'Son-in-law', 'role': 'family'}, {'name': 'Ann Old', 'role': 'family'}],
          'safety': {'ec': {'name': 'John Reed', 'rel': 'Son-in-law', 'phone': '417-555-0199'}}}}]}
FAKE = r"""<!doctype html><meta charset="utf-8"><style>body{font-family:system-ui;padding:16px}.card{border:1px solid #ddd;border-radius:10px}:root{--navy:#0E3860;--text-muted:#6B7280}</style>
<div id="famNotesHost"></div>
<script>
window.DATA = %s; window.CP = { ax:'300', lead:{ id:'L1' }, r:{ client_name:'Betty Harlow' } };
window.CALLS = []; window.SAVED = [];
window.LPI = { began:{} };
window.lpiLoadBegan = async (l) => ({ ep:'ep1', people:[{ name:'Ann Old' }] });
window.lpfCall = async (b) => { CALLS.push(b); return { outcome:'recorded' }; };
window.persist = async (k, item) => { SAVED.push([k, JSON.parse(JSON.stringify(item))]); };
</script><script src="family-notes.js"></script>""" % json.dumps(DATA)
open(TEST, 'w').write(FAKE)
R = []
def ck(n, c, d=''): R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:500]))
try:
  with sync_playwright() as pw:
    br = pw.chromium.launch(); pg = br.new_page(viewport={'width': 900, 'height': 900}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('file://' + TEST); pg.evaluate('FNOTE.load()'); pg.wait_for_timeout(300)
    t = pg.inner_text('#famNotesHost')
    ck('Family notes: the call order', 'Call the family in this order' in t and 'Mary first, then John' in t, t)
    ck('...no email, said plainly', 'No email.' in t and 'declined email' in t, t)
    ck('...the photo choice, and that caregivers see it', 'No photos, please' in t and 'shift page' in t, t)
    ck('the visit offers the people not yet in People involved (not the client, not someone already there)', 'Mary Harlow' in t and 'John Reed' in t and 'Betty Harlow' not in t and 'Ann Old' not in t, t)
    ck('...the emergency contact is marked, with the phone, merged with the same person in the room', t.count('John Reed') == 1 and 'Emergency contact' in t and '417-555-0199' in t, t)
    ck('...nothing was added by opening the tab', pg.evaluate('CALLS.length') == 0)
    pg.click('[data-fn-add="johnreed"]'); pg.wait_for_timeout(300)
    c = pg.evaluate('CALLS[0]')
    ck('Add: client-fact record_person, a first record, emergency role, permission not asked', c.get('action') == 'record_person' and c.get('change_kind') == 'first' and c.get('episode_id') == 'ep1'
       and c.get('name') == 'John Reed' and c.get('roles') == ['emergency'] and c.get('phone') == '417-555-0199' and c.get('permission') == 'not_asked', c)
    s = pg.evaluate('SAVED[SAVED.length-1]')
    ck('...kept on the visit as added', s[0] == 'care_assessments' and s[1]['visit']['people_offers'].get('johnreed') == 'added', s)
    t = pg.inner_text('#famNotesHost')
    ck('...and not offered again', 'John Reed is in People involved now.' in t and 'Add to People involved' in t and t.count('John Reed') == 1, t)
    pg.click('[data-fn-skip="maryharlow"]'); pg.wait_for_timeout(300)
    t = pg.inner_text('#famNotesHost')
    ck('Not now: kept on the visit, the offer is gone, nothing recorded', pg.evaluate('CALLS.length') == 1 and pg.evaluate('SAVED[SAVED.length-1][1].visit.people_offers.maryharlow') == 'not_now' and 'Add to People involved' not in t, t)
    ck('no page errors', not errs, errs)
    br.close()
finally:
  try: os.remove(TEST)
  except Exception: pass
for s, n, d in R: print(('  ✓ ' if s == 'PASS' else '  ✗ ') + n + (('\n      ' + d) if d else ''))
p = sum(1 for r in R if r[0] == 'PASS'); print(f'\n{p}/{len(R)} passed'); sys.exit(0 if p == len(R) else 1)

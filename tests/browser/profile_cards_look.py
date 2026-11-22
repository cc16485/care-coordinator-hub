"""Profile cards, profile fill Stage C (Samantha 2026-11-21): what the visit and the signed agreement filled, shown on the Care
tab (health, medicines, equipment, goals), Team & Schedule (hours wanted, Early Support Visits) and Payer (signed and proposed
level and rate), editable, saved to the same profile record with the name. profile-cards.js offline. Chromium.
python3 tests/browser/profile_cards_look.py"""
import json, sys, os
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
TEST = os.path.join(ROOT, '_pcard_test.html')
DATA = {'client_profiles': [{'id': 'cp_ax300', 'health': 'Diabetes (since 2019): tired', 'medicines': 'Pharmacy: Walgreens', 'goals': 'Most important: Walk to the mailbox',
  'hours_wanted': 'Days and hours: Mon 9am to 1:30pm', 'esv': 'Enrolled · once a month', 'level_signed': 'Personal Care', 'rate_signed': '$32 an hour', 'rate_proposed': '$30 an hour',
  'filled_from': [{'from': 'visit', 'at': '2026-11-21T17:00:00Z'}], 'pets': 'Daisy'}]}
FAKE = r"""<!doctype html><meta charset="utf-8"><style>body{font-family:system-ui;padding:16px}:root{--navy:#0E3860;--text-muted:#666}</style>
<div id="pcCareHost"></div><div id="pcTeamHost"></div><div id="pcPayerHost"></div>
<script>window.DATA = %s; window.CP = { ax:'300', lead:null, r:{ client_name:'Betty Harlow' } }; window.ME = { name:'Casey' };
window.SAVED = []; window.persist = async (k, item) => { SAVED.push([k, JSON.parse(JSON.stringify(item))]); };</script><script src="profile-cards.js"></script>""" % json.dumps(DATA)
open(TEST, 'w').write(FAKE)
R = []
def ck(n, c, d=''): R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:500]))
try:
  with sync_playwright() as pw:
    br = pw.chromium.launch(); pg = br.new_page(viewport={'width': 900, 'height': 1200}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('file://' + TEST); pg.evaluate("['care','team','payer'].forEach(k => PCARD.render(k))"); pg.wait_for_timeout(200)
    v = lambda k: pg.input_value(f'[data-pc-k="{k}"]')
    ck('Care: health, medicines, goals from the profile; empty equipment box', v('health').startswith('Diabetes') and v('medicines') == 'Pharmacy: Walgreens' and 'Walk to the mailbox' in v('goals') and v('equipment') == '')
    ck('Care: says where it came from', 'Last filled from the home visit on 2026-11-21' in pg.inner_text('#pcCareHost'))
    ck('Team & Schedule: hours wanted and Early Support Visits', v('hours_wanted').startswith('Days and hours') and v('esv') == 'Enrolled · once a month')
    ck('Payer: signed level and rate, and what the visit proposed', v('level_signed') == 'Personal Care' and v('rate_signed') == '$32 an hour' and v('rate_proposed') == '$30 an hour')
    ck('cards with something in them are open', pg.evaluate('[...document.querySelectorAll("details")].every(d => d.open)'))
    pg.fill('[data-pc-k="equipment"]', 'Walker'); pg.click('[data-pc-save="care"]'); pg.wait_for_timeout(200)
    s = pg.evaluate('SAVED[0]')
    ck('Save: the same profile record, the change, every other place kept, your name', s[0] == 'client_profiles' and s[1]['id'] == 'cp_ax300' and s[1]['equipment'] == 'Walker' and s[1]['pets'] == 'Daisy' and s[1]['rate_signed'] == '$32 an hour' and s[1]['updated_by'] == 'Casey', s)
    ck('Save: says Saved', 'Saved.' in pg.inner_text('#pcCareHost'))
    pg.evaluate("window.DATA.client_profiles = []; window.CP = { ax:'', lead:{ id:'L9' }, r:{ client_name:'New Person' } }; PCARD.render('payer')"); pg.wait_for_timeout(100)
    ck('a client with nothing yet: the card says so and stays closed', '(nothing from the visit or the agreement yet)' in pg.inner_text('#pcPayerHost') and not pg.evaluate('document.querySelector("#pcPayerHost details").open'))
    ck('no page errors', not errs, errs)
    br.close()
finally:
  try: os.remove(TEST)
  except Exception: pass
for s, n, d in R: print(('  ✓ ' if s == 'PASS' else '  ✗ ') + n + (('\n      ' + d) if d else ''))
p = sum(1 for r in R if r[0] == 'PASS'); print(f'\n{p}/{len(R)} passed'); sys.exit(0 if p == len(R) else 1)

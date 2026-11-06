"""Level 3 PRN Caregivers (Samantha 2026-11-02, "Yes to my recommendations on all five calls. Build it with the new switch off."):
a Level 3 PRN Caregiver's own PRN Team page (prn.html) shows On call and the Field Support Visits line; the office preview marks it
waiting while the switch is off; a Level 1 or 2 PRN Caregiver sees neither; the Settings switch is listed. Offline, made-up data;
every server call is answered here, nothing is sent or saved. (PORT=<static server port> python3 tests/browser/prn_level3_look.py)"""
import os, sys, json, re
sys.path.insert(0, os.path.dirname(__file__))
from playwright.sync_api import sync_playwright
# the made-up On call page and the page opener from prn_oncall_look.py (only its fixtures, not its checks)
_src = open(os.path.join(os.path.dirname(__file__), 'prn_oncall_look.py')).read()
base = type('base', (), {})(); _ns = {}; exec(_src.split('\nwith sync_playwright()')[0], _ns)
base.view, base.page = _ns['view'], _ns['page']
PORT = os.environ.get('PORT', '8811')
R = []; ok = lambda n, c, d='': R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:500]))
def cg(level3=None, oncall=True):
    v = base.view(); v.update({ 'first': 'Tina', 'team': 'caregiver', 'team_label': 'PRN Caregiver Team', 'mentor': None, 'level3': level3 })
    if not oncall: v['oncall'] = None
    return v
Q = '?p=0f1e2d3c-4b5a-4968-8776-655443322110&e=1999999999&t=' + 'x' * 43
with sync_playwright() as pw:
    b, pg, calls, errs = base.page(pw, Q, lambda body: (200, cg({ 'on': True, 'waiting': False })))
    t = pg.inner_text('body')
    ok('a Level 3 PRN Caregiver: On call on their page, with the On call link', 'On call is optional' in t and pg.locator('nav a[href="#oncall"]').count() == 1, t[:600])
    ok('...and what Field Support Visits are, naming Level 3 PRN Caregivers', 'Some of our PRN CNAs and Level 3 PRN Caregivers are approved for Field Support Visits' in t, t[-900:])
    ok('...no office-preview note on their own page', 'Office preview' not in t)
    ok('...no page errors', not errs, errs); b.close()
    b, pg, calls, errs = base.page(pw, Q, lambda body: (200, cg({ 'on': True, 'waiting': True })))
    t = pg.inner_text('body')
    ok('the office preview while the switch is off: marked waiting, by name', "Office preview: Level 3 PRN Caregivers is switched off (Settings, PRN Teams), so Tina doesn't see On call or Field Support Visits yet." in t, t[:900]); b.close()
    b, pg, calls, errs = base.page(pw, Q, lambda body: (200, cg(None, oncall=False)))
    t = pg.inner_text('body')
    ok('a Level 1 or 2 PRN Caregiver: no On call, no Field Support Visits', 'On call is optional' not in t and 'Field Support Visits' not in t and pg.locator('nav a[href="#oncall"]').count() == 0, t[:600])
    ok('...no page errors', not errs, errs); b.close()
html = open(os.path.join(os.path.dirname(__file__), '..', '..', 'index.html')).read()
ok('Settings, PRN Teams: the new switch, off by default wording', "key:'prn_level3_caregiver_live'" in html and "Off: nothing changes for anyone." in html)
ok('no em dash in the new words', not re.search('—', ''.join(l for l in html.splitlines() if 'prn_level3_caregiver_live' in l or 'Level 3 PRN Caregivers' in l)))
for s, n, d in R: print(s, '·', n, d)
print(f"{sum(1 for r in R if r[0] == 'PASS')}/{len(R)}")
if any(r[0] == 'FAIL' for r in R): sys.exit(1)

"""At a glance + the documents card: Social Security number and date of birth SHOWN automatically (Samantha, owner, 2026-10-21:
"show the full Social Security number and date of birth on the profile automatically for any active office user, no click or
reason. Keep logging each showing."). hire-profile.js in a blank page with a fake sb: hire-profile 'get' gives the offer id,
step1-sign 'screening' what is on file, 'reveal' a made-up value (987-65-4321 is never issued). Checks: both show with no click,
one logged request per field with the reason "Shown on their profile", a redraw within 30 minutes asks again for nothing, no
storage, a refusal shows the server's words and no number, the documents card opens the same rows in place (no new tab).
python3 tests/browser/profile_glance_reveal_look.py [screenshot dir]"""
import os, sys
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp'
JS = open(os.path.join(HERE, '..', '..', 'hire-profile.js')).read()
FAKE = """
window.ASK = []; window.REFUSE = false; window.OID = 'off-1';
window.sb = { functions: { invoke: async (fn, { body }) => { ASK.push({ fn, body });
  if (fn === 'hire-profile') return { data: { ids: { offer_id: OID }, documents: [{ label: 'Step 1: Employee Application (signed)' }, { label: 'Step 1: Details for the Background Checks (signed)', at: '2026-10-19T22:52:00Z' }] } };
  if (body.action === 'screening') return { data: { ok: true, may_reveal: true, identity: { ssn: 'ending 4321', dob: true, license: null } } };
  if (body.action === 'reveal') { if (REFUSE) return { data: { ok: false, error: 'Your role does not allow this.' } };
    return { data: { ok: true, value: body.field === 'ssn' ? '987654321' : '1990-05-05', expires_in: 300 } }; }
  return { data: { ok: true } }; } } };
"""
R = []
ok = lambda n, c, d='': R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:300]))
reveals = lambda pg: [a['body'] for a in pg.evaluate('ASK') if a['body'].get('action') == 'reveal']
with sync_playwright() as pw:
    br = pw.chromium.launch(); pg = br.new_page(viewport={'width': 390, 'height': 700}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.route('http://hub.test/', lambda route, req: route.fulfill(status=200, content_type='text/html', body='<html><body><div id="apIdRows"></div><div id="docs"></div></body></html>'))
    pg.goto('http://hub.test/'); pg.add_script_tag(content=FAKE); pg.add_script_tag(content=JS)
    pg.evaluate("HP.identity(document.getElementById('apIdRows'), { applicant_id: 'a1' })"); pg.wait_for_timeout(500)
    t = pg.inner_text('#apIdRows')
    ok('with no click: the full SSN (dashes) and the date of birth show, each with Copy', '987-65-4321' in t and '1990-05-05' in t and pg.locator('#apIdRows button:has-text("Copy")').count() == 2 and pg.locator('#apIdRows button:has-text("Click to reveal")').count() == 0, t)
    rv = reveals(pg)
    ok('one logged request per field, this offer, reason "Shown on their profile"', rv == [{'action': 'reveal', 'offer_id': 'off-1', 'field': 'ssn', 'reason': 'Shown on their profile'}, {'action': 'reveal', 'offer_id': 'off-1', 'field': 'dob', 'reason': 'Shown on their profile'}], rv)
    pg.screenshot(path=os.path.join(OUT, 'glance_auto.png'), full_page=True)
    ok('no countdown, no Hide', 'hides in' not in t and pg.locator('#apIdRows button:has-text("Hide")').count() == 0)
    ok('the numbers are in no storage', '987654321' not in pg.evaluate('JSON.stringify(localStorage) + JSON.stringify(sessionStorage)'))
    pg.evaluate("HP.identity(document.getElementById('apIdRows'), { applicant_id: 'a1' })"); pg.wait_for_timeout(400)
    ok('drawing the profile again within 30 minutes shows them without asking (no second log)', len(reveals(pg)) == 2 and '987-65-4321' in pg.inner_text('#apIdRows'))
    pg.evaluate("HP.mount(document.getElementById('docs'), { applicant_id: 'a1' }, ['docs'])"); pg.wait_for_timeout(400)
    ok('the background-details card has Reveal SSN / DOB as a button (no new-tab link)', pg.locator('#docs button:has-text("Reveal SSN / DOB")').count() == 1 and pg.locator('#docs a[target=_blank]').count() == 0)
    n_tabs = len(pg.context.pages); pg.click('#docs button:has-text("Reveal SSN / DOB")'); pg.wait_for_timeout(500)
    ok('the card opens the same rows in place, numbers shown', len(pg.context.pages) == n_tabs and '987-65-4321' in pg.inner_text('#docs .hp-docreveal'))
    pg.evaluate("OID = 'off-2'; REFUSE = true; HP.identity(document.getElementById('apIdRows'), { applicant_id: 'a2' })"); pg.wait_for_timeout(500)
    t = pg.inner_text('#apIdRows')
    ok('a refusal (another person, not allowed) shows the server\'s words and no number', 'Your role does not allow this.' in t and '987' not in t and '1990' not in t, t)
    ok('no em dash', '—' not in pg.inner_text('body'))
    ok('no page errors', not errs, errs)
    br.close()
for r in R: print(r[0], '·', r[1], r[2])
print(sum(1 for r in R if r[0] == 'PASS'), '/', len(R))

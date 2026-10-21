"""At a glance: Social Security number and date of birth, click to reveal (Samantha 2026-10-21). hire-profile.js's HP.identity in a
blank page with a fake sb: hire-profile 'get' gives the offer id, step1-sign 'screening' gives what is on file, 'reveal' gives a
made-up value (987-65-4321 is never issued). Checks: last four only until revealed, a reason before anything is asked, one field
per request, five-minute countdown then wiped, Hide, no storage, a refusal shows the server's words.
python3 tests/browser/profile_glance_reveal_look.py [screenshot dir]"""
import os, sys, json
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp'
JS = open(os.path.join(HERE, '..', '..', 'hire-profile.js')).read()
FAKE = """
window.ASK = []; window.REFUSE = false;
window.sb = { functions: { invoke: async (fn, { body }) => { ASK.push({ fn, body });
  if (fn === 'hire-profile') return { data: { ids: { offer_id: 'off-1' }, documents: [{ label: 'Step 1: Employee Application (signed)' }, { label: 'Step 1: Details for the Background Checks (signed)', at: '2026-10-19T22:52:00Z' }] } };
  if (body.action === 'screening') return { data: { ok: true, may_reveal: true, identity: { ssn: 'ending 4321', dob: true, license: null } } };
  if (body.action === 'reveal') { if (REFUSE) return { data: { ok: false, error: 'Your role does not allow this.' } };
    return { data: { ok: true, value: body.field === 'ssn' ? '987654321' : '1990-05-05', expires_in: 3 } }; }
  return { data: { ok: true } }; } } };
"""
R = []
ok = lambda n, c, d='': R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:300]))
with sync_playwright() as pw:
    br = pw.chromium.launch(); pg = br.new_page(viewport={'width': 390, 'height': 700}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.route('http://hub.test/', lambda route, req: route.fulfill(status=200, content_type='text/html', body='<html><body><div id="apIdRows"></div><div id="docs"></div></body></html>'))
    pg.goto('http://hub.test/')
    pg.add_script_tag(content=FAKE); pg.add_script_tag(content=JS)
    pg.evaluate("HP.identity(document.getElementById('apIdRows'), { applicant_id: 'a1' })"); pg.wait_for_timeout(400)
    t = pg.inner_text('#apIdRows')
    ok('two rows: SSN on file ending 4321, date of birth on file, each with Click to reveal', 'Social Security number' in t and 'ending 4321' in t and 'Date of birth' in t and pg.locator('button:has-text("Click to reveal")').count() == 2, t)
    ok('loading asks nothing to be revealed', not [a for a in pg.evaluate('ASK') if a['body'].get('action') == 'reveal'])
    pg.locator('button:has-text("Click to reveal")').first.click(); pg.wait_for_timeout(200)
    ok('the click asks why first', pg.locator('#hpIdReason').count() == 1 and 'Why are you opening the Social Security number' in pg.inner_text('#apIdRows'))
    pg.click('button:has-text("Reveal for 5 minutes")'); pg.wait_for_timeout(200)
    ok('no reason: refused on the page, nothing asked', 'Please type why first' in pg.inner_text('#apIdRows') and not [a for a in pg.evaluate('ASK') if a['body'].get('action') == 'reveal'])
    pg.fill('#hpIdReason', 'FCSR registration'); pg.click('button:has-text("Reveal for 5 minutes")'); pg.wait_for_timeout(400)
    rv = [a['body'] for a in pg.evaluate('ASK') if a['body'].get('action') == 'reveal']
    ok('one request: the SSN, this offer, the reason', rv == [{'action': 'reveal', 'offer_id': 'off-1', 'field': 'ssn', 'reason': 'FCSR registration'}], rv)
    t = pg.inner_text('#apIdRows')
    ok('the SSN shows with Copy, a countdown and Hide; the date of birth still locked', '987654321' in t and 'hides in' in t and pg.locator('button:has-text("Copy")').count() == 1 and pg.locator('button:has-text("Click to reveal")').count() == 1, t)
    pg.screenshot(path=os.path.join(OUT, 'glance_reveal.png'), full_page=True)
    ok('the value is in no storage', '987654321' not in pg.evaluate('JSON.stringify(localStorage) + JSON.stringify(sessionStorage)'))
    pg.wait_for_timeout(3600)
    ok('after the countdown it is wiped and the button is back', '987654321' not in pg.inner_text('#apIdRows') and pg.locator('button:has-text("Click to reveal")').count() == 2)
    pg.locator('button:has-text("Click to reveal")').nth(1).click(); pg.wait_for_timeout(150)
    ok('the reason is remembered for the next field', pg.input_value('#hpIdReason') == 'FCSR registration')
    pg.click('button:has-text("Reveal for 5 minutes")'); pg.wait_for_timeout(300)
    ok('the date of birth reveals on its own request', '1990-05-05' in pg.inner_text('#apIdRows'))
    pg.click('button:has-text("Hide")'); pg.wait_for_timeout(150)
    ok('Hide wipes it at once', '1990-05-05' not in pg.inner_text('#apIdRows'))
    pg.evaluate('REFUSE = true'); pg.locator('button:has-text("Click to reveal")').first.click(); pg.wait_for_timeout(150); pg.click('button:has-text("Reveal for 5 minutes")'); pg.wait_for_timeout(300)
    ok('a refusal shows the server\'s words and no number', 'Your role does not allow this.' in pg.inner_text('#apIdRows') and '987654321' not in pg.inner_text('#apIdRows'))
    ok('no em dash', '—' not in pg.inner_text('#apIdRows'))
    pg.evaluate('REFUSE = false')
    pg.evaluate("HP.mount(document.getElementById('docs'), { applicant_id: 'a1' }, ['docs'])"); pg.wait_for_timeout(400)
    ok('2026-10-21: the background-details card has Reveal SSN / DOB as a button (no new tab); other cards do not', pg.locator('#docs button:has-text("Reveal SSN / DOB")').count() == 1 and pg.locator('#docs a[target=_blank]').count() == 0)
    n_tabs = len(pg.context.pages)
    pg.click('#docs button:has-text("Reveal SSN / DOB")'); pg.wait_for_timeout(500)
    ok('the click opens the two rows right under the documents, in this page', len(pg.context.pages) == n_tabs and pg.locator('#docs .hp-docreveal button:has-text("Click to reveal")').count() == 2 and 'ending 4321' in pg.inner_text('#docs .hp-docreveal'))
    pg.locator('#docs .hp-docreveal button:has-text("Click to reveal")').first.click(); pg.wait_for_timeout(150)
    pg.fill('#hpIdReason', 'FCSR registration'); pg.click('#docs button:has-text("Reveal for 5 minutes")'); pg.wait_for_timeout(400)
    ok('...and reveals there, for this offer', '987654321' in pg.inner_text('#docs .hp-docreveal') and [a['body'] for a in pg.evaluate('ASK') if a['body'].get('action') == 'reveal'][-1]['offer_id'] == 'off-1')
    pg.screenshot(path=os.path.join(OUT, 'card_reveal.png'), full_page=True)
    ok('no page errors', not errs, errs)
    br.close()
for r in R: print(r[0], '·', r[1], r[2])
print(sum(1 for r in R if r[0] == 'PASS'), '/', len(R))

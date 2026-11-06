"""The reference form's "Is this right?" (Samantha 2026-11-05: "put in the dates that the applicant gave that they were
employed, what positions, etc prefill and give the reference the option to mark they are correct or to make a change to
what we gave"). The real reference.html, offline: the reference-tasks and reference_answer answers are faked, nothing is
saved. Checks: a professional reference sees what the applicant told us, Yes sends exactly that, Something is different
opens the filled-in boxes to fix, it must be answered, the claim is saved before the answers; a personal reference and a
request with no match see today's form. Screenshots to SHOTS (default /tmp/rc_*.png).
(python3 tests/browser/reference_claim_look.py; serves this checkout itself)"""
import os, json, threading, functools, http.server, socketserver
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
SHOTS = os.environ.get('SHOTS', '/tmp/rc_')
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.TCPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=ROOT)); PORT = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
RID = '11111111-1111-4111-8111-111111111111'
CLAIMED = {'company': 'Mercy Hospital', 'role': 'CNA', 'from': 'March 2022', 'to': 'June 2024'}
R = []
def ok(n, c, d=''): R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:400]))

def run(p, t, claimed, label):
    calls = []
    page = p.new_page(viewport={'width': 390, 'height': 900})
    def tasks(route):
        b = json.loads(route.request.post_data or '{}'); calls.append(('tasks', b))
        body = {'ok': True, 'practice': False, 'show': False, **({'first': 'Jordan', 'claimed': claimed} if claimed else {})} if b.get('action') == 'view' else {'ok': True, 'saved': b.get('answer')}
        route.fulfill(status=200, content_type='application/json', headers={'Access-Control-Allow-Origin': '*'}, body=json.dumps(body))
    def answer(route):
        calls.append(('answer', json.loads(route.request.post_data or '{}')))
        route.fulfill(status=200, content_type='application/json', headers={'Access-Control-Allow-Origin': '*'}, body='"saved"')
    page.route('**/functions/v1/reference-tasks', lambda r: r.fulfill(status=200, headers={'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*'}) if r.request.method == 'OPTIONS' else tasks(r))
    page.route('**/rest/v1/rpc/reference_answer', lambda r: r.fulfill(status=200, headers={'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*'}) if r.request.method == 'OPTIONS' else answer(r))
    page.goto(f'http://127.0.0.1:{PORT}/reference.html?r={RID}&c=Jordan%20Ellis&n=Susie&t={t}&co=Mercy%20Hospital')
    page.wait_for_timeout(1200)
    return page, calls

def fill_rest(page, pro=True):
    for name, v in ([('rehire', 'yes')] if pro else [('trust', 'yes')]) + [('concerns', 'none'), ('recommend', 'yes')]:
        page.check(f'input[name="{name}"][value="{v}"]')
    page.fill('#who', 'Susie Manning')

with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b
    # 1 · Yes, that's right
    page, calls = run(b, 'professional', CLAIMED, 'yes')
    ok('the question shows what Jordan told us', page.is_visible('#claimCard') and 'Jordan told us: CNA at Mercy Hospital, March 2022 to June 2024.' in page.inner_text('#claimQ'), page.inner_text('#claimQ') if page.is_visible('#claimCard') else 'hidden')
    ok('...the boxes are hidden until they say something is different', not page.is_visible('#timeCard'))
    page.screenshot(path=SHOTS + '1_question.png', full_page=True)
    fill_rest(page); page.click('#submitBtn'); page.wait_for_timeout(600)
    ok('it must be answered before sending', 'whether what they told us about the job is right' in page.inner_text('#err') and not any(c[0] == 'answer' for c in calls), page.inner_text('#err'))
    page.check('input[name="claim"][value="right"]'); page.click('#submitBtn'); page.wait_for_timeout(1200)
    seq = [c for c in calls if c[0] == 'answer' or c[1].get('action') == 'claim']
    ok('Yes: the claim is saved first, then the answers', len(seq) == 2 and seq[0][1] == {'action': 'claim', 'r': RID, 'answer': 'right'} and seq[1][0] == 'answer', seq)
    a = seq[1][1].get('p_answers', {}) if len(seq) == 2 else {}
    ok('...and the answers carry exactly what Jordan told us', a.get('employer_confirmed') == 'Mercy Hospital' and a.get('emp_from') == 'March 2022' and a.get('emp_to') == 'June 2024' and a.get('job_title') == 'CNA', a)
    ok('...the thank-you page shows', page.is_visible('#doneView'))
    page.close()
    # 2 · Something is different
    page, calls = run(b, 'professional', {**CLAIMED, 'to': 'still working here'}, 'diff')
    ok('"still working here" reads "now"', 'March 2022 to now.' in page.inner_text('#claimQ'), page.inner_text('#claimQ'))
    page.check('input[name="claim"][value="changed"]'); page.wait_for_timeout(200)
    ok('Something is different opens the boxes, filled in, with "still works here" ticked', page.is_visible('#timeCard') and page.input_value('#empFrom') == 'March 2022' and page.is_checked('#stillHere') and page.input_value('#jobTitle') == 'CNA' and page.is_visible('#timeHint'))
    page.screenshot(path=SHOTS + '2_changed.png', full_page=True)
    page.fill('#empFrom', 'May 2023'); page.fill('#jobTitle', 'Caregiver'); fill_rest(page); page.click('#submitBtn'); page.wait_for_timeout(1200)
    seq = [c for c in calls if c[0] == 'answer' or c[1].get('action') == 'claim']
    a = seq[-1][1].get('p_answers', {}) if seq else {}
    ok('...their fixes are what is sent, with changed', len(seq) == 2 and seq[0][1].get('answer') == 'changed' and a.get('emp_from') == 'May 2023' and a.get('job_title') == 'Caregiver' and a.get('emp_to') == 'present', seq)
    page.close()
    # 3 · no match, and a personal reference
    page, calls = run(b, 'professional', None, 'nomatch')
    ok('no match: today\'s form, the boxes showing, company from the link', not page.is_visible('#claimCard') and page.is_visible('#timeCard') and page.input_value('#employer') == 'Mercy Hospital' and page.input_value('#empFrom') == '')
    fill_rest(page); page.click('#submitBtn'); page.wait_for_timeout(1200)
    ok('...sends as before, no claim call', not any(c[0] == 'tasks' and c[1].get('action') == 'claim' for c in calls) and any(c[0] == 'answer' for c in calls), calls)
    page.close()
    page, calls = run(b, 'personal', CLAIMED, 'personal')
    ok('a personal reference never sees it, even if the server answered with one', not page.is_visible('#claimCard'))
    page.close()
    b.close()
srv.shutdown()
for s, n, d in R: print(s, ' ', n, ('\n    ' + d) if d else '')
print(sum(1 for r in R if r[0] == 'PASS'), 'passed,', sum(1 for r in R if r[0] == 'FAIL'), 'failed')
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

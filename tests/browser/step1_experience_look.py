"""Step 1 experience and references (Samantha 2026-10-11, approving the previews with refinements). Offline, the server faked
from a real view (step1_sign_2b_test.mjs with DUMP_VIEW). On a phone: "Your experience matters!" first; a job card with the
task ticks, the lift type only when a lift is ticked, the refresher question offering only what was ticked ("No, I am ready"
stands alone); family care with several payment sources; the references with her reminder, may-we-contact, one tap from the
job, a backup. Every tap saves and the page stays where it is. Then the reference form for a practice hire (task by task,
the comfortable question) and for a real hire (exactly as before).
python3 tests/browser/step1_experience_look.py <step1_view.json> [screenshot dir]"""
import json, sys, os
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
PAGE = 'file://' + os.path.join(ROOT, 'step1.html') + '?o=x&e=1&t=y'
VIEW = json.load(open(sys.argv[1])); OUT = sys.argv[2] if len(sys.argv) > 2 else '/tmp'
VIEW.update({'esign_consent_at': '2026-10-11T00:00:00Z', 'current_screen': '3', 'answers': {'lived_outside_mo': 'no'}, 'signatures': {}, 'completed_at': None, 'prefill': {}})
saves = []
def handle(route, request):
    b = json.loads(request.post_data or '{}'); a = b.get('action')
    if a == 'view': return route.fulfill(status=200, content_type='application/json', body=json.dumps(VIEW))
    if a == 'save': saves.append(b)
    return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True}))
last = lambda k: next((s['answers'][k] for s in reversed(saves) if k in (s.get('answers') or {})), None)
R = []
ok = lambda n, c, d='': R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:300]))
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 390, 'height': 844}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.route('**/functions/v1/step1-sign', handle)
    pg.goto(PAGE); pg.wait_for_timeout(700)
    m = pg.inner_text('#main')
    ok('Work History opens with "Your experience matters!" in its encouraging box, before the jobs', pg.locator('.cheer h3', has_text='Your experience matters!').count() == 1 and m.index('Your experience matters!') < m.index('+ Add another job') and 'Criminal Record' not in m, m[:300])
    ok('no sideways scrolling on a phone', pg.evaluate('document.documentElement.scrollWidth') <= 391)
    pg.screenshot(path=os.path.join(OUT, 'exp_1_top.png'))
    pg.locator('button', has_text='+ Add another job').click(); pg.wait_for_timeout(200)
    card = pg.locator('.card').first
    for k, v in [('company', 'Home Helpers'), ('city_state', 'Springfield, MO'), ('role', "Caregiver's aide"), ('from', 'March 2019'), ('to', 'June 2023'), ('supervisor', 'Jane Boss'), ('phone', '417-555-0202'), ('reason_leaving', 'Moved')]:
        card.locator('input[data-k="' + k + '"]').fill(v)
    pg.wait_for_timeout(1000)
    ok('typing saves quietly as a card (apostrophes kept)', (last('jobs') or [{}])[0].get('role') == "Caregiver's aide", last('jobs'))
    ok('the task ticks only show once they say they gave care', card.locator('input[data-k="tasks"]').count() == 0)
    card.locator('.fl', has_text='May we contact them').locator('button', has_text='Yes').click(); pg.wait_for_timeout(150)
    card = pg.locator('.card').first; yb = card.locator('.fl', has_text='Did you care for clients').locator('button', has_text='Yes'); yb.scroll_into_view_if_needed(); pg.wait_for_timeout(100); y0 = pg.evaluate('window.scrollY')
    yb.click(); pg.wait_for_timeout(250)
    ok('answering a question keeps the page where it is', abs(pg.evaluate('window.scrollY') - y0) < 5, (y0, pg.evaluate('window.scrollY')))
    card = pg.locator('.card').first
    ok('the tasks show in three groups, catheter and ostomy as two separate tasks', card.locator('input[data-k="tasks"]').count() == 16 and card.locator('.sg').count() == 3 and card.locator('label.chk', has_text='Emptying a catheter bag').count() == 1 and card.locator('label.chk', has_text='Emptying an ostomy bag').count() == 1)
    box = card.locator('label.chk', has_text='Bathing or showering').bounding_box()
    ok('each task is a full-width tap target at least 44px tall', box and box['height'] >= 44 and box['width'] > 300, box)
    ok('no lift type and no refresher question before anything is ticked', card.locator('input[data-k="lifts"]').count() == 0 and card.locator('input[data-k="refresher"]').count() == 0)
    for t in ['Bathing or showering', 'A Hoyer or other mechanical lift', 'Emptying a catheter bag']:
        pg.locator('.card').first.locator('label.chk', has_text=t).click(); pg.wait_for_timeout(200)
    card = pg.locator('.card').first
    ok('a lift ticked: full-body sling / sit-to-stand / other appear', card.locator('input[data-k="lifts"]').count() == 3)
    ok('the refresher question offers only the three ticked tasks plus "No, I am ready"', card.locator('input[data-k="refresher"]').count() == 4)
    card.locator('label.chk', has_text='Full-body sling').click(); pg.wait_for_timeout(200)
    pg.locator('.card').first.locator('.fl', has_text='refresher').locator('label.chk', has_text='A Hoyer or other mechanical lift').click(); pg.wait_for_timeout(200)
    pg.locator('.card').first.locator('label.chk', has_text='No, I am ready for all of these').click(); pg.wait_for_timeout(200)
    j = (last('jobs') or [{}])[0]
    ok('"No, I am ready" stands alone; the tasks and lift type are saved by key', j.get('refresher') == ['none'] and j.get('tasks') == ['bathing', 'hoyer_lift', 'catheter_bag'] and j.get('lifts') == ['Full-body sling'], j)
    pg.locator('.card').first.locator('label.chk', has_text='A Hoyer or other mechanical lift').first.click(); pg.wait_for_timeout(200)
    ok('un-ticking the lift drops the lift type', 'lifts' not in (last('jobs') or [{}])[0], last('jobs'))
    pg.locator('.card').first.screenshot(path=os.path.join(OUT, 'exp_2_job.png'))
    pg.locator('button', has_text='+ Add family or private-client care').click(); pg.wait_for_timeout(200)
    fam = pg.locator('.card').nth(1)
    fam.locator('.fl', has_text='Who did you care for').locator('button', has_text='A family member').click(); pg.wait_for_timeout(200)
    fam = pg.locator('.card').nth(1)
    for t in ['Not paid', 'A VA program']: fam.locator('label.chk', has_text=t).click(); pg.wait_for_timeout(150); fam = pg.locator('.card').nth(1)
    ok('family care: her final wording (paid or unpaid), and several payment sources saved', "Your caregiving experience matters, whether it was paid or unpaid." in pg.inner_text('#main') and (last('family_care') or [{}])[0].get('paid') == ['Not paid', 'A VA program'], last('family_care'))
    ok('family care shows its tasks without a "did you give care" question', fam.locator('input[data-k="tasks"]').count() == 16)
    fam.screenshot(path=os.path.join(OUT, 'exp_3_family.png'))
    VIEW['current_screen'] = '4'; VIEW['answers'] = {'jobs': [{**j, 'may_contact': 'yes', 'email': 'jane@hh.com'}]}
    pg.goto(PAGE); pg.wait_for_timeout(700)
    m = pg.inner_text('#main')
    ok('references: her reminder beside the contact boxes', pg.locator('.tip', has_text='Please provide accurate contact information for someone who knows your work.').count() == 1)
    pg.locator('button', has_text='Use Jane Boss (Home Helpers)').click(); pg.wait_for_timeout(250)
    pr = last('professional_refs') or [{}]
    ok('one tap from the job: name, company, phone, email and permission carried over', pr[0].get('name') == 'Jane Boss' and pr[0].get('company') == 'Home Helpers' and pr[0].get('phone') == '417-555-0202' and pr[0].get('email') == 'jane@hh.com' and pr[0].get('may_contact') == 'yes', pr)
    ok('every reference card asks for a phone, an email and "May we contact them?"', pg.locator('.card').first.locator('input[data-k="phone"]').count() == 1 and pg.locator('.card').first.locator('input[data-k="email"]').count() == 1 and 'May we contact them?' in pg.locator('.card').first.inner_text())
    ok('a backup reference can be added; it never counts against them', pg.locator('button', has_text='+ Add a backup reference').count() == 1 and 'never counts against you' in m)
    pg.screenshot(path=os.path.join(OUT, 'exp_4_refs.png'), full_page=True)
    ok('no page errors', not errs, errs)
    # ── the reference form ──
    RID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
    REF = 'file://' + os.path.join(ROOT, 'reference.html') + '?r=' + RID + '&c=Pat%20Practice&n=Jane%20Boss&t=professional&co=Home%20Helpers'
    for practice in (True, False):
        p2 = b.new_page(viewport={'width': 390, 'height': 844}); e2 = []; calls = []
        p2.on('pageerror', lambda e: e2.append(str(e)[:200]))
        def tasks(route, request, practice=practice):
            bb = json.loads(request.post_data or '{}'); calls.append(bb)
            if not practice: return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'practice': False}))
            if bb.get('action') == 'view': return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'practice': True, 'first': 'Pat', 'entries': [{'kind': 'job', 'where': 'Home Helpers, Caregiver', 'when': 'March 2019 to June 2023', 'tasks': [{'key': 'bathing', 'label': 'Bathing or showering'}, {'key': 'hoyer_lift', 'label': 'A Hoyer or other mechanical lift'}]}]}))
            return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'practice': True, 'saved': 2}))
        rpc = []
        p2.route('**/functions/v1/reference-tasks', tasks)
        p2.route('**/rest/v1/rpc/reference_answer', lambda route, request: (rpc.append(json.loads(request.post_data)), route.fulfill(status=200, content_type='application/json', body='"saved"')))
        p2.goto(REF); p2.wait_for_timeout(1500)
        t = p2.inner_text('body')
        if practice:
            ok('practice hire: each task with four answers that tell seeing from believing from not knowing', p2.locator('input[name="task_bathing"]').count() == 4 and 'Yes, I saw it myself' in t and 'I believe so, but did not see it' in t and "I don't know" in t and 'From your own knowledge' in t)
            ok('practice hire: the final question, by first name, with an optional why', 'Would you feel comfortable having Pat provide similar care to someone you care about?' in t and p2.locator('#comfortWhy').count() == 1)
            p2.locator('button.go').click(); p2.wait_for_timeout(300)
            ok('nothing sends until every task and the comfortable question are answered', 'an answer for each task (2 left' in p2.inner_text('#err') and not rpc, p2.inner_text('#err'))
            for sel in ['task_bathing" value="saw', 'task_hoyer_lift" value="unknown', 'comfort" value="reservations', 'rehire" value="yes', 'concerns" value="none', 'recommend" value="yes']:
                p2.locator('input[name="' + sel.replace('" value="', '"][value="') + '"]').check()
            p2.fill('#comfortWhy', 'She was new then'); p2.locator('#taskCards').screenshot(path=os.path.join(OUT, 'exp_5a_ref_tasks.png')); p2.locator('#comfortCard').screenshot(path=os.path.join(OUT, 'exp_5b_ref_comfort.png'))
            p2.locator('button.go').click(); p2.wait_for_timeout(800)
            sv = [c for c in calls if c.get('action') == 'save']
            ok('sent: the task answers and the why first, then the usual answers (the comfortable answer as trust)', sv and sv[0]['task_confirm'] == {'bathing': 'saw', 'hoyer_lift': 'unknown'} and sv[0]['comfort_why'] == 'She was new then' and rpc and rpc[0]['p_answers'].get('trust_family') == 'reservations', (sv, rpc))
            p2.screenshot(path=os.path.join(OUT, 'exp_5_ref_practice.png'), full_page=True)
        else:
            ok('real hire: the form is exactly as before (no task questions, no comfortable question)', p2.locator('input[name^="task_"]').count() == 0 and not p2.locator('#comfortCard').is_visible())
            for sel in ['rehire" value="yes', 'concerns" value="none', 'recommend" value="yes']: p2.locator('input[name="' + sel.replace('" value="', '"][value="') + '"]').check()
            p2.locator('button.go').click(); p2.wait_for_timeout(800)
            ok('real hire: only the usual answers are sent; nothing to reference-tasks but the look-up', rpc and 'trust_family' not in rpc[0]['p_answers'] and not [c for c in calls if c.get('action') == 'save'], (rpc, calls))
        ok('reference form: no page errors (' + ('practice' if practice else 'real') + ')', not e2, e2)
        p2.close()
    b.close()
for s, n, d in R: print(s, ' ', n, ('  ' + d) if d else '')

"""1383 feature OK (Samantha, 2026-11-08: "Add a separate box"). The real caregiver page, offline: the caregiver-profile
function is stubbed, made-up people only, nothing is saved or sent. Checks the optional box to be featured on Facebook and
the website: unticked by default, saved on its own the moment it changes, never needed to save the profile, shown after
publishing so they can change their mind, and a failed save is said out loud and undone.
(python3 tests/browser/feature_ok_look.py; SHOTS=<dir> saves screenshots)"""
import os, json, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = os.environ.get('SHOTS')
WORDS = 'Yes, Caring Companions may also feature me (my photo, first name and my words) on its Facebook page and website.'
res = []
def ck(n, ok, note=''): res.append((n, bool(ok), '' if ok else str(note)[:400]))

def page_run(b, mine, fail_feature=False):
    calls = []
    p = b.new_page(viewport={'width': 390, 'height': 900})
    def fn(route):
        body = json.loads(route.request.post_data or '{}'); calls.append(body)
        a = body.get('action'); r = {}; st = 200
        if a == 'mine': r = mine
        elif a == 'feature' and fail_feature: r = {'error': 'Please try again, or call (417) 234-8494.'}; st = 500
        elif a == 'feature': r = {'ok': True, 'feature_ok': body.get('ok')}
        else: r = {'ok': True}
        route.fulfill(status=st, content_type='application/json', headers={'Access-Control-Allow-Origin': '*'}, body=json.dumps(r))
    p.route('**/functions/v1/caregiver-profile', fn)
    errs = []; p.on('pageerror', lambda e: errs.append(str(e)))
    p.goto((ROOT / 'caregiver-profile.html').as_uri() + '?t=00000000-0000-4000-8000-000000000001')
    p.wait_for_timeout(800)
    return p, calls, errs

NEW = {'first_name': 'Dana', 'preferred_name': None, 'consent': False, 'self_complete': True, 'about': '', 'experience': '', 'why_this_work': '', 'photo_url': None, 'feature_ok': False}
PUB = {'first_name': 'Dana', 'preferred_name': 'Dee', 'consent': True, 'published': True, 'about': 'Dee is patient.', 'experience': '6 years.', 'why_this_work': 'The stories.', 'photo_url': None, 'feature_ok': True}

with sync_playwright() as pw:
    b = pw.chromium.launch()
    # 1. the form
    p, calls, errs = page_run(b, NEW)
    ck('form: the optional card is shown, with her exact words', p.is_visible('#featureCard') and WORDS in p.inner_text('#featureCard'), p.inner_text('body')[-600:])
    ck('form: it says Optional and that no changes nothing', 'Optional' in p.inner_text('#featureCard') and 'Saying no never changes your job or your profile' in p.inner_text('#featureCard'))
    ck('form: unticked by default', not p.is_checked('#featureOk'))
    order = p.evaluate("() => { const c = document.getElementById('featureCard'), g = document.getElementById('go'), k = document.getElementById('consent'); return !!(k.compareDocumentPosition(c) & 4) && !!(c.compareDocumentPosition(g) & 4) }")
    ck('form: it sits after the required box and before Save', order)
    ck('form: the required box now says never posted publicly unless they tick the optional box', 'never posted publicly unless you tick the optional box below' in p.inner_text('#form'))
    p.check('#featureOk'); p.wait_for_timeout(300)
    fe = [c for c in calls if c.get('action') == 'feature']
    ck('ticking saves it on its own, right away', fe and fe[-1].get('ok') is True and fe[-1].get('t'), fe)
    ck('ticking: says Saved', 'Saved. Thank you!' in p.inner_text('#featureSaved'), p.inner_text('#featureSaved'))
    if SHOTS: p.screenshot(path=os.path.join(SHOTS, 'feature-1-form.png'), full_page=True)
    p.uncheck('#featureOk'); p.wait_for_timeout(300)
    fe = [c for c in calls if c.get('action') == 'feature']
    ck('unticking saves a no', fe[-1].get('ok') is False and 'We will not feature you' in p.inner_text('#featureSaved'), fe)
    ck('no submit was sent by the feature box', not [c for c in calls if c.get('action') == 'submit'])
    ck('no page errors (form)', not errs, errs)
    # 2. a failed save is said out loud and undone
    p, calls, errs = page_run(b, NEW, fail_feature=True)
    p.check('#featureOk'); p.wait_for_timeout(300)
    ck('a failed save: the box goes back and says it did not save', not p.is_checked('#featureOk') and 'That did not save' in p.inner_text('#featureSaved'), p.inner_text('#featureSaved'))
    ck('no page errors (failed save)', not errs, errs)
    # 3. published: they can still change their mind
    p, calls, errs = page_run(b, PUB)
    ck('published: the card shows under their profile, ticked as saved', p.is_visible('#published') and p.is_visible('#featureCard') and p.is_checked('#featureOk'), p.inner_text('body')[:400])
    if SHOTS: p.screenshot(path=os.path.join(SHOTS, 'feature-2-published.png'), full_page=True)
    p.uncheck('#featureOk'); p.wait_for_timeout(300)
    fe = [c for c in calls if c.get('action') == 'feature']
    ck('published: unticking still saves', fe and fe[-1].get('ok') is False, fe)
    ck('no page errors (published)', not errs, errs)
    # 4. a bad link: no card
    p = b.new_page(); p.goto((ROOT / 'caregiver-profile.html').as_uri() + '?t=bad'); p.wait_for_timeout(300)
    ck('bad link: no feature card', not p.is_visible('#featureCard'))
    b.close()

bad = [r for r in res if not r[1]]
for n, ok, note in res: print(('PASS ' if ok else 'FAIL ') + n + ('' if ok else '  ' + note))
print(f'\n{len(res) - len(bad)}/{len(res)} passed'); raise SystemExit(1 if bad else 0)

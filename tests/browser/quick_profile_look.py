"""1181 quick caregiver profile (Samantha, 2026-10-29: "photo plus 3 short answers, office writes it with Beef it up, caregiver
replies OK to approve"). The real caregiver page and the real office panel, offline: the caregiver-profile function is stubbed,
made-up people only, nothing is saved or sent. (python3 tests/browser/quick_profile_look.py; SHOTS=<dir> saves screenshots)"""
import os, sys, json, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = os.environ.get('SHOTS')
WORDS = {'about': 'Dee is patient, cheerful and dependable. She loves gardening with her grandkids.',
         'experience': 'Dee has been a caregiver for 6 years.', 'why_this_work': 'Dee enjoys making each day a little brighter.'}
res = []
def ck(n, ok, note=''): res.append((n, bool(ok), '' if ok else str(note)[:400]))

def page_run(b, stage, mine_extra=None):
    calls = []
    p = b.new_page(viewport={'width': 390, 'height': 900})
    def fn(route):
        body = json.loads(route.request.post_data or '{}'); calls.append(body)
        a = body.get('action'); r = {}
        if a == 'mine':
            r = dict({'first_name': 'Dana', 'preferred_name': None, 'consent': False, 'quick': True, 'stage': stage,
                      'quick_answers': {'years': '', 'words': '', 'outside': ''}, 'photo_url': None}, **(mine_extra or {}))
        elif a == 'upload_url': r = {'ok': True, 'path': 'x/photo-1.jpg', 'token': 't'}
        else: r = {'ok': True}
        route.fulfill(status=200, content_type='application/json', headers={'Access-Control-Allow-Origin': '*'}, body=json.dumps(r))
    p.route('**/functions/v1/caregiver-profile', fn)
    p.route('**/storage/v1/object/upload/sign/**', lambda r: r.fulfill(status=200, content_type='application/json', headers={'Access-Control-Allow-Origin': '*'}, body='{"Key":"x"}'))
    errs = []; p.on('pageerror', lambda e: errs.append(str(e)))
    p.goto((ROOT / 'caregiver-profile.html').as_uri() + '?t=00000000-0000-4000-8000-000000000001')
    p.wait_for_timeout(800)
    return p, calls, errs

with sync_playwright() as pw:
    b = pw.chromium.launch()
    # 1. the quick form
    p, calls, errs = page_run(b, 'answers')
    ck('quick form: 3 questions and photo shown, the long boxes hidden', p.is_visible('#quickCard') and not p.is_visible('#wordsCard') and p.is_visible('#photoPick'), p.inner_text('body')[:300])
    ck('quick form: her questions', 'How many years have you been a caregiver?' in p.inner_text('#quickCard') and 'Three words that describe you as a caregiver' in p.inner_text('#quickCard') and 'One thing you love doing outside of work' in p.inner_text('#quickCard'))
    ck('quick form: button says photo and answers', p.inner_text('#go') == 'Send my photo and answers', p.inner_text('#go'))
    if SHOTS: p.screenshot(path=os.path.join(SHOTS, 'quick-1-form.png'), full_page=True)
    p.fill('#qYears', '6'); p.click('#go'); p.wait_for_timeout(200)
    ck('missing pieces are listed at once', 'a photo of yourself' in p.inner_text('#err') and 'three words' in p.inner_text('#err') and 'outside of work' in p.inner_text('#err'), p.inner_text('#err'))
    p.set_input_files('#photo', files=[{'name': 'me.png', 'mimeType': 'image/png', 'buffer': bytes.fromhex('89504e470d0a1a0a0000000d4948445200000001000000010806000000') + bytes(60)}])
    p.fill('#qWords', 'patient, cheerful, dependable'); p.fill('#qOutside', 'gardening'); p.fill('#qPreferred', 'Dee')
    p.check('#consent'); p.click('#go'); p.wait_for_timeout(800)
    sub = [c for c in calls if c.get('action') == 'submit']
    ck('sent: the answers, the photo and permission; no long sections', sub and sub[-1]['quick'] == {'years': '6', 'words': 'patient, cheerful, dependable', 'outside': 'gardening'} and sub[-1]['photo_path'] and sub[-1]['consent'] is True and 'about' not in sub[-1] and sub[-1]['preferred_name'] == 'Dee', sub)
    ck('then: we are writing it, we will text you', p.is_visible('#writing') and 'text you when it is ready' in p.inner_text('#writing'), p.inner_text('body')[:300])
    if SHOTS: p.screenshot(path=os.path.join(SHOTS, 'quick-2-thanks.png'), full_page=True)
    ck('no page errors (form)', not errs, errs)
    # 2. their OK
    p, calls, errs = page_run(b, 'approve', dict(WORDS, consent=True))
    ck('OK screen: shows the words and the two buttons', p.is_visible('#approve') and 'gardening with her grandkids' in p.inner_text('#apCard') and p.is_visible('#apYes') and p.is_visible('#apChg'), p.inner_text('body')[:300])
    if SHOTS: p.screenshot(path=os.path.join(SHOTS, 'quick-3-ok.png'), full_page=True)
    p.click('#apChg'); p.click('#apSend'); p.wait_for_timeout(100)
    ck('Change something with nothing typed: asks for it', 'what you would like changed' in p.inner_text('#apErr'))
    p.fill('#apText', 'Please say I have two grandkids.'); p.click('#apSend'); p.wait_for_timeout(300)
    ch = [c for c in calls if c.get('action') == 'approve']
    ck('Change something: the note goes to the office', ch and ch[-1].get('change') == 'Please say I have two grandkids.' and p.is_visible('#apAsked'), ch)
    p.click('#apYes'); p.wait_for_timeout(300)
    ok = [c for c in calls if c.get('action') == 'approve' and c.get('ok')]
    ck('Looks good: sends the words it showed', ok and ok[-1]['words'] == WORDS and p.is_visible('#approved'), ok)
    if SHOTS: p.screenshot(path=os.path.join(SHOTS, 'quick-4-thanks.png'), full_page=True)
    ck('no page errors (OK)', not errs, errs)
    p, calls, errs = page_run(b, 'approved', dict(WORDS, consent=True))
    ck('already OK\'d: the thank-you shows', p.is_visible('#approved'))

    # 3. the office panel
    p = b.new_page(viewport={'width': 1100, 'height': 1000})
    errs = []; p.on('pageerror', lambda e: errs.append(str(e)))
    p.set_content('<html><body><div id="host"></div></body></html>')
    ROW = {'id': '11111111-1111-4111-8111-111111111111', 'axiscare_id': '7001', 'first_name': 'Dana', 'last_name': 'Lee', 'status': 'new', 'published': False,
           'self_complete': True, 'quick': True, 'quick_answers': {'years': '6', 'words': 'patient, cheerful, dependable', 'outside': 'gardening'},
           'submitted_at': '2026-10-29T15:00:00Z', 'photo_path': '1111/photo-1.jpg', 'consent': True, 'link_sent_at': '2026-10-28T15:00:00Z',
           'about': None, 'experience': None, 'why_this_work': None, 'updated_at': '2026-10-29T15:00:00Z'}
    p.evaluate("""(row) => { window.__row = row; window.__calls = []; window.__alerts = [];
      window.alert = m => window.__alerts.push(m); window.ccConfirm = async () => true;
      window.__cgpSb = { from: () => { const q = { select(){return q;}, neq(){return q;}, eq(){return q;}, order(){return q;}, limit(){return q;}, is(){return q;}, ilike(){return q;}, in(){return q;},
          update(pt){ Object.assign(window.__row, pt); return q; }, then(a){ return Promise.resolve({ data: [window.__row], error: null }).then(a); } }; return q; },
        auth: { getSession: async () => ({ data: { session: { access_token: 't' } } }) } }; }""", ROW)
    def office(route):
        body = json.loads(route.request.post_data or '{}'); a = body.get('action')
        p.evaluate('b => window.__calls.push(b)', body)
        r = {'ok': True}
        if a == 'enhance': r = {'ok': True, 'suggestion': {'about': WORDS['about'], 'experience': WORDS['experience'], 'why': WORDS['why_this_work']}, 'application_found': True}
        if a == 'send_approval' and body.get('dry'): r = {'ok': True, 'dry': True, 'text': 'Hi Dana, it\'s Caring Companions! We wrote your caregiver profile.', 'subject': 'Your caregiver profile is ready for your OK', 'to': {'phone': '4175550101', 'email': 'd@example.com'}}
        if a == 'send_approval' and not body.get('dry'):
            r = {'ok': True, 'texted': True, 'emailed': True, 'not_sent': []}
            p.evaluate("() => Object.assign(window.__row, { approval_sent_at: '2026-10-29T16:00:00Z', approval_words: { about: window.__row.about, experience: window.__row.experience, why_this_work: window.__row.why_this_work } })")
        route.fulfill(status=200, content_type='application/json', headers={'Access-Control-Allow-Origin': '*'}, body=json.dumps(r))
    p.route('**/functions/v1/caregiver-profile', office)
    p.add_script_tag(path=str(ROOT / 'caregiver-profile-panel.js'))
    p.evaluate("() => CGP2.mount(document.getElementById('host'), { mode: 'employee', axiscare_id: '7001', first: 'Dana', last: 'Lee', phone: '4175550101', email: 'd@example.com' })")
    p.wait_for_timeout(300)
    t = p.inner_text('#host')
    ck('panel: quick box with their 3 answers and the next step', 'Quick profile' in t and 'patient, cheerful, dependable' in t and 'gardening' in t and 'Write it for them' in t, t[:600])
    ck('panel chip: answers in, write it', 'Answers in: write it for them' in t, t[:200])
    ck('panel: no long-form link button once answers are in', 'Send profile link' not in t)
    ck('panel: the video is optional (522), never "required"', 'No video (optional)' in t and 'No video yet (required)' not in t, t[:400])
    if SHOTS: p.screenshot(path=os.path.join(SHOTS, 'quick-5-panel-answers.png'), full_page=True)
    p.click('button:has-text("Write it for them")'); p.wait_for_timeout(300)
    ck('Write it for them: the fuller version shows from their quick answers', 'from their quick answers' in p.inner_text('#host') and 'gardening with her grandkids' in p.inner_text('#host'), p.inner_text('#host')[-800:])
    for _ in range(3):
        if p.locator('button:has-text("Use this")').count(): p.locator('button:has-text("Use this")').first.click(); p.wait_for_timeout(100)
    p.click('button:has-text("Send it to them to OK")'); p.wait_for_timeout(200)
    ck('send before Save: told to Save first, nothing sent', 'Press Save first' in p.inner_text('#host') and not any(c.get('action') == 'send_approval' for c in p.evaluate('window.__calls')))
    p.click('button:has-text("Save")'); p.wait_for_timeout(300)
    ck('saved into the profile', p.evaluate('window.__row.about') == WORDS['about'], p.evaluate('window.__row'))
    p.click('button:has-text("Send it to them to OK")'); p.wait_for_timeout(500)
    sa = [c for c in p.evaluate('window.__calls') if c.get('action') == 'send_approval']
    ck('send for their OK: preview first, then the send', len(sa) == 2 and sa[0].get('dry') and not sa[1].get('dry'), sa)
    t = p.inner_text('#host')
    ck('then: waiting for their OK, They said OK offered', 'Waiting for their OK' in t and 'They said OK' in t and 'Send it to them to OK again' in t, t[:600])
    if SHOTS: p.screenshot(path=os.path.join(SHOTS, 'quick-6-panel-waiting.png'), full_page=True)
    p.evaluate("() => Object.assign(window.__row, { change_request: 'Please say I have two grandkids.', change_request_at: '2026-10-29T17:00:00Z' })")
    p.evaluate("() => CGP2.reload(document.getElementById('host').getAttribute('data-cgp'))"); p.wait_for_timeout(300)
    t = p.inner_text('#host')
    ck('their change request shows in red with the next step', 'They asked for a change' in t and 'two grandkids' in t, t[:600])
    p.evaluate("() => Object.assign(window.__row, { approved_at: '2026-10-29T18:00:00Z', approved_by: 'them, on their page', change_request_at: '2026-10-29T17:00:00Z', approval_words: { about: window.__row.about, experience: window.__row.experience, why_this_work: window.__row.why_this_work } })")
    p.evaluate("() => CGP2.reload(document.getElementById('host').getAttribute('data-cgp'))"); p.wait_for_timeout(300)
    ck('after their OK: ready to publish', "They OK'd it: publish" in p.inner_text('#host'), p.inner_text('#host')[:300])
    p.evaluate("() => { window.__row.why_this_work = 'Something new.'; }")
    p.evaluate("() => CGP2.reload(document.getElementById('host').getAttribute('data-cgp'))"); p.wait_for_timeout(300)
    ck('words changed after their OK: back to them', 'Words changed: send for their OK again' in p.inner_text('#host'))
    # the Profiles list
    p.evaluate("""() => { document.body.insertAdjacentHTML('beforeend', '<div id="list"></div>');
      const R = (o) => Object.assign({ status: 'new', published: false, self_complete: true, updated_at: '2026-10-29' }, o);
      const rows = [R({ axiscare_id: '1', quick: true, submitted_at: '2026-10-29', photo_path: 'p', consent: true }), R({ axiscare_id: '2', link_sent_at: '2026-10-06' }),
        R({ axiscare_id: '3', quick: true, link_sent_at: '2026-10-29' }), R({ axiscare_id: '5', published: true })];
      window.__cgpSb.from = () => { const q = { select(){return q;}, neq(){return q;}, in(){return q;}, then(a){ return Promise.resolve({ data: rows, error: null }).then(a); } }; return q; };
      const P = (id, f) => ({ id, first: f, last: 'X', hire_date: '2024-01-01', mobile: '4175550100', email: '' });
      return CGP2.catchupRender(document.getElementById('list'), [P('1', 'Ann'), P('2', 'Bo'), P('3', 'Cy'), P('4', 'Di'), P('5', 'Ed')]); }""")
    p.wait_for_timeout(300)
    t = p.inner_text('#list')
    ck('Profiles list: the quick sections', 'WRITE IT FOR THEM · 1' in t and 'QUICK LINK SENT, WAITING FOR THEIR PHOTO AND ANSWERS · 1' in t and 'NO QUICK LINK YET · 1' in t and 'LONG-FORM LINK SENT, NOT FILLED IN' in t and 'PUBLISHED · 1' in t, t[:900])
    ck('Profiles list: the quick link goes to no-profile AND long-form waiters (2)', 'Send the quick link to everyone who needs one (2)' in t, t[:900])
    ck('4 of 5 not published yet', '4 of 5 current caregivers' in t, t[:200])
    if SHOTS: p.screenshot(path=os.path.join(SHOTS, 'quick-7-list.png'), full_page=True)
    ck('no page errors (office)', not errs, errs)
    b.close()

for n, ok, note in res: print(('PASS ' if ok else 'FAIL ') + n + ('' if ok else '  ' + note))
print(f"{sum(1 for r in res if r[1])}/{len(res)} passed"); sys.exit(0 if all(r[1] for r in res) else 1)

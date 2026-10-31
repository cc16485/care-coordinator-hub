"""A Level 3 caregiver's "My on-call" page (oncall.html, Samantha 2026-10-30, Krystal's idea, Level 3 only): what on call is, sign the
On-Call Expectations, ask for shifts one time or every week. Offline, made-up data; every server call is answered here, nothing is
sent or saved. (PORT=<static server port> python3 tests/browser/oncall_page_look.py)"""
import os, json
from playwright.sync_api import sync_playwright
PORT = os.environ.get('PORT', '8811')
TERMS = "PRN CNA On-Call Expectations\nWhen you sign up for an on-call shift, families are counting on you.\n1. On call comes in two shifts: daytime, 7am to 5pm, and overnight, 5pm to 7am.\n2. Keep your phone on and with you. Answer the office, or call back, within 15 minutes.\n3. Be ready to start a shift within 1 hour.\n4. If the office calls you about an open shift during your on-call time, you cover it.\n5. If you don't answer the office within 15 minutes, or you don't cover the shift, you won't be paid for that on-call shift, and you won't be able to sign up for on call again.\n6. If something comes up, call the office at least 24 hours before your on-call shift starts. To stop an every-week on-call shift, call the office at least 24 hours before the next one starts."
ABOUT = "On call means keeping your phone close during a daytime (7am to 5pm) or overnight (5pm to 7am) shift. If a caregiver can't make it, the office calls you first. You're paid for each on-call shift, plus your pay for any shift you cover. Sign up for the shifts that fit your life, one time or every week. Once you're on call, families are counting on you."
def slots():
    out = []
    for i in range(28):
        d = f'2026-{10 if i < 3 else 11}-{29 + i if i < 3 else i - 2:02d}'
        r = { 'date': d, 'day': { 'state': 'open' }, 'overnight': { 'state': 'open' } }
        if i == 0: r = dict(r, day={ 'state': 'past' })
        if i == 2: r = dict(r, day={ 'state': 'mine', 'weekly': True, 'can_give_back': True })
        out.append(r)
    return out
def view(**su):
    base = { 'ready': True, 'terms': TERMS, 'version': 'v1234abcd', 'signed': True, 'signed_before': True, 'blocked': False, 'days': 28, 'give_back_hours': 24, 'slots': slots(),
             'weekly_ready': True, 'weekly': [{ 'id': 3, 'word': 'Saturdays, daytime', 'slot': 'day', 'weekday': 6, 'status': 'confirmed', 'since': '2026-10-31' }] }
    base.update(su)
    return { 'ok': True, 'preview': False, 'waiting': False, 'first': 'Maria', 'today': '2026-10-29', 'about': ABOUT, 'office': '(417) 234-8494', 'signup': base }
R = []; ok = lambda n, c, d='': R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:500]))
def page(pw, qs, answer):
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 400, 'height': 1800}); calls = []
    def route(r):
        u = r.request.url
        if '/functions/v1/oncall-page' in u:
            body = json.loads(r.request.post_data or '{}'); calls.append((body, r.request.headers.get('authorization'))); s, j = answer(body)
            return r.fulfill(status=s, content_type='application/json', body=json.dumps(j))
        if 'fonts.g' in u: return r.abort()
        return r.continue_()
    pg.route('**/*', route); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200])); pg.on('dialog', lambda d: d.accept())
    pg.goto(f'http://localhost:{PORT}/oncall.html{qs}'); pg.wait_for_timeout(700)
    return b, pg, calls, errs
LINK = '?c=501&e=1999999999&t=' + 'x' * 43
with sync_playwright() as pw:
    b, pg, calls, errs = page(pw, '', lambda body: (200, {}))
    ok('no link: "open this page from the link in our text", nothing asked', 'from the link in our text' in pg.inner_text('#app') and not calls); b.close()
    for ans, want in (({ 'closed': True, 'message': "On-call sign-up isn't open yet. We'll text you when it is.", 'office': '(417) 234-8494' }, "isn't open yet"),
                      ({ 'expired': True, 'message': 'This link has expired or is not valid. Text us and we will send you a fresh one.' }, 'This link has expired'),
                      ({ 'notlevel': True, 'message': 'On call is for our caregivers at Level 3 (Advanced Care). Call the office with any questions.' }, 'Level 3 (Advanced Care)'),
                      ({ 'prn': True, 'message': 'You sign up for on call on your PRN Team page.' }, 'PRN Team page')):
        b, pg, calls, errs = page(pw, LINK, lambda body, a=ans: (401 if a.get('expired') else 403 if a.get('notlevel') else 200, a))
        ok(f'the server says "{want}": the page says it, nothing else', want in pg.inner_text('#app') and pg.locator('#oncall').count() == 0, pg.inner_text('#app')); b.close()
    # not signed
    V = view(signed=False, signed_before=False)
    b, pg, calls, errs = page(pw, LINK, lambda body: (200, V) if body.get('action') == 'view' else (200, { 'ok': True, 'message': 'Thank you, Maria. You can sign up for on-call shifts now.' }))
    t = pg.inner_text('#app')
    ok('C3: Hi Maria, "On call · Level 3", what on call means, the two shifts, the office number', 'Hi, Maria!' in t and 'On call · Level 3' in t and 'keeping your phone close' in t and '5pm to 7am the next morning' in t and '(417) 234-8494' in t, t[:600])
    ok('...the expectations word for word (all six, the new Rule 6), a box and their name; no shifts yet', all(f'{i}. ' in t for i in range(1, 7)) and 'To stop an every-week on-call shift' in t and pg.locator('#ocAgree').count() == 1 and pg.locator('[data-ocp]').count() == 0)
    ok('...never a dollar amount', '$' not in t)
    pg.check('#ocAgree'); pg.fill('#ocName', 'Maria Lopez'); pg.click('#ocSign'); pg.wait_for_timeout(200)
    sc = [c for c, _ in calls if c.get('action') == 'sign']
    ok('...Sign goes to the server as "sign" with her link, her name, the box and the version', sc and sc[-1]['typed_name'] == 'Maria Lopez' and sc[-1]['agree'] is True and sc[-1]['version'] == 'v1234abcd' and sc[-1]['c'] == '501' and sc[-1].get('t'), sc)
    b.close()
    # signed
    V = view()
    b, pg, calls, errs = page(pw, LINK, lambda body: (200, V) if body.get('action') == 'view' else (200, { 'ok': True, 'message': 'Thank you, Maria! The office will confirm them with you.' }))
    t = pg.inner_text('#oncall')
    ok('C3: signed: her every-week Saturday, the calendar, Just this one / Every week', pg.locator('.ocrow').count() == 28 and 'Every week: Saturdays, daytime (since Oct 31)' in t and 'every week' in t and pg.locator('[data-ocm]').count() == 2, t[:500])
    pg.click('[data-ocp="2026-11-02|day"]'); pg.click('[data-ocm="weekly"]'); pg.click('[data-ocp="2026-11-03|overnight"]'); pg.click('#ocAsk'); pg.wait_for_timeout(200)
    ac = [c for c, _ in calls if c.get('action') == 'ask']
    ok('...Ask goes to the server as "ask": one time and every week, with her link', ac and sorted(s['date'] + s['slot'] + ('W' if s.get('weekly') else '') for s in ac[-1]['slots']) == ['2026-11-02day', '2026-11-03overnightW'] and ac[-1]['c'] == '501', ac)
    pg.locator('#oncall').screenshot(path=os.environ.get('SHOT', '/tmp/oncall_page.png'))
    ok('no page errors', not errs, errs); b.close()
    # the office preview
    V = view(); V['preview'] = True; V['waiting'] = True
    b, pg, calls, errs = page(pw, '?preview=501', lambda body: (200, V))
    t = pg.inner_text('#app')
    ok('office preview: says so, uses the Hub sign-in, asks by her AxisCare id; invites-off note', 'Office preview' in t and calls and calls[0][0].get('action') == 'preview' and calls[0][0].get('caregiver_ax') == '501' and (calls[0][1] or '').startswith('Bearer')
       and "caregivers don't see this page yet" in t, [t[:300], calls[:1]])
    pg.click('[data-ocp="2026-11-02|day"]'); pg.click('#ocAsk'); pg.wait_for_timeout(200)
    ok('...nothing tapped in the preview is sent', not any(c.get('action') == 'ask' for c, _ in calls)); b.close()
for s, n, d in R: print(s, '·', n, d)
print(f"{sum(1 for r in R if r[0] == 'PASS')} / {len(R)}")

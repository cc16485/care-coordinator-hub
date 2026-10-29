"""PRN step 5a (Samantha 2026-10-29): a PRN member's own PRN Team page (prn.html), as the member and as the office's read-only
preview, plus its Hub side (This week lines, Our teams, What they see, the switch). Offline, made-up data; every server call is
answered here, nothing is sent or saved. (PORT=<static server port> python3 tests/browser/prn_page_look.py)"""
import os, json
from playwright.sync_api import sync_playwright
H = open('/Users/samantha/Claude/Projects/cc-hub-live/.claude/g1a_harness.js').read()
PORT = os.environ.get('PORT', '8811'); SHOTS = os.environ.get('SHOTS', '/tmp')
VIEW = { 'ok': True, 'preview': False, 'live': True, 'today': '2026-10-29', 'first': 'Grace', 'team': 'cna', 'team_label': 'PRN CNA Team', 'since': '2026-03-14', 'on_schedule': True,
  'looking': { 'on': False, 'note': None, 'since': None, 'until': None },
  'offered': [{ 'case_id': 'c1', 'client_first': 'Mary', 'town': 'Nixa', 'shift_date': '2026-11-01', 'shift_time': '08:00-12:00', 'answered': None, 'link': 'https://cc.mo-care.com/shift.html?c=c1&a=a1&e=1&t=x' }],
  'clients': [{ 'first': 'Ruth', 'last_visit': '2026-10-12', 'glad': True, 'star': False }], 'clients_why': None,
  'thanks': [{ 'kind': 'kind_words', 'at': '2026-10-25T15:00:00Z', 'text': "Mary's daughter said you made her mom laugh all morning.", 'from': 'Samantha' }, { 'kind': 'milestone', 'at': '', 'text': "You've stepped in for 10 PRN shifts. Thank you for standing in the gap." }],
  'hours': { 'windows': { 'mon': ['morning'], 'sat': ['evening'] }, 'target_hours': 12, 'outside_ok': False, 'updated_at': '2026-10-20T15:00:00Z', 'short_notice_ok': None, 'break_until': None },
  'courses': [{ 'slug': 'dementia-care', 'title': "Alzheimer's & Dementia Care", 'hours': 4, 'about': 'Understanding memory loss.', 'requested': False }, { 'slug': 'on-the-job-training', 'title': 'On-the-Job Skills Training', 'hours': 6, 'about': 'Hands-on care skills.', 'requested': True }],
  'office': '(417) 234-8494' }
R = []; ok = lambda n, c, d='': R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:400]))

def page(pw, qs, answer):
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 400, 'height': 1600}); calls = []
    def route(r):
        u = r.request.url
        if '/functions/v1/prn-page' in u:
            body = json.loads(r.request.post_data or '{}'); calls.append({ 'body': body, 'auth': r.request.headers.get('authorization', '') })
            s, j = answer(body); return r.fulfill(status=s, content_type='application/json', body=json.dumps(j))
        if 'fonts.g' in u: return r.abort()
        return r.continue_()
    pg.route('**/*', route); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(f'http://localhost:{PORT}/prn.html{qs}'); pg.wait_for_timeout(700)
    return b, pg, calls, errs

with sync_playwright() as pw:
    def member(body):
        a = body.get('action')
        if a == 'view': return 200, VIEW
        return 200, { 'ok': True, 'message': {'looking': 'Thank you! The office will see this today.', 'hours': 'Saved, Grace! The office sees this right away.', 'short_notice': 'Saved. Thank you for letting us know.',
          'break': "Enjoy your break. We won't text you about shifts until it ends.", 'course': 'Thank you! The office will set it up and send you the link.', 'idea': 'Thank you for sharing. The office reads every idea.'}.get(a, 'ok') }
    b, pg, calls, errs = page(pw, '?p=0f1e2d3c-4b5a-4968-8776-655443322110&e=1999999999&t=' + 'x' * 43, member)
    txt = pg.inner_text('body')
    ok('member: "Hi, Grace!", PRN CNA Team, We Stand in the Gap since March 2026', 'Hi, Grace!' in txt and 'PRN CNA Team' in txt and 'We Stand in the Gap. Part of our care continuity team since March 2026.' in txt, txt[:300])
    ok('...the view is asked with their link, no sign-in', calls[0]['body'].get('action') == 'view' and calls[0]['body'].get('p') and not calls[0]['auth'])
    ok('...Offered to You: Mary in Nixa, Sun Nov 1 8am to 12pm, opens the shift page they know', 'Mary in Nixa' in txt and 'Sun, Nov 1 · 8am to 12pm' in txt and pg.locator('a:has-text("See this shift and answer")').get_attribute('href').startswith('https://cc.mo-care.com/shift.html'), txt)
    ok('...My clients: Ruth, glad to go back; no last names anywhere', 'Ruth' in txt and "You said you'd gladly go back" in txt)
    ok('...Thank-yous: the kind words, from Samantha, and the 10-shift milestone', "Mary's daughter said you made her mom laugh all morning." in txt and 'Kind words from Samantha' in txt and 'stepped in for 10 PRN shifts' in txt)
    ok('...My hours: Mon morning and Sat evening ticked, 12 hours', pg.locator('.grid button.on').count() == 2 and pg.locator('#tgt').input_value() == '12')
    ok('...a course already asked for shows Asked', pg.locator('button.req[data-slug="on-the-job-training"]').inner_text() == 'Asked ✓')
    ok('...Talk to us texts and calls the office line', pg.locator('a:has-text("Text the office")').get_attribute('href') == 'sms:+14172348494' and pg.locator('a:has-text("Call")').get_attribute('href') == 'tel:+14172348494')
    ok('...no pay, no em dash', '$' not in txt and '—' not in txt)
    pg.click('#lookSw'); pg.fill('#lookTxt', 'any morning next week'); pg.click('#lookSave'); pg.wait_for_timeout(200)
    ok('looking for hours: on, with the note', any(c['body'].get('action') == 'looking' and c['body'].get('on') is True and c['body'].get('note') == 'any morning next week' for c in calls) and 'The office will see this today' in pg.inner_text('#lookMsg'))
    pg.wait_for_timeout(1000)
    pg.click('.grid button[data-d="tue"][data-t="afternoon"]'); pg.fill('#tgt', '15'); pg.check('#outOk'); pg.click('#hrsSave'); pg.wait_for_timeout(200)
    hc = [c for c in calls if c['body'].get('action') == 'hours'][-1]['body']
    ok('My hours: saves the grid, 15 hours, outside-hours texts', hc['windows']['tue'] == ['afternoon'] and hc['windows']['mon'] == ['morning'] and hc['target_hours'] == '15' and hc['outside_ok'] is True, hc)
    b2, pg2, calls2, errs2 = page(pw, '?p=0f1e2d3c-4b5a-4968-8776-655443322110&e=1999999999&t=' + 'x' * 43 + '#hours', member)
    top = pg2.evaluate("()=>({ y: scrollY, top: document.getElementById('hours').getBoundingClientRect().top, max: document.documentElement.scrollHeight - innerHeight })")
    pg2.click('#hrsSame'); pg2.wait_for_timeout(200)
    sc = [c for c in calls2 if c['body'].get('action') == 'hours']
    ok('the 60-day check-in link opens at My hours; "These are still right" saves what is on file, unchanged', top['y'] > 300 and (abs(top['top'] - 60) < 20 or top['y'] >= top['max'] - 2) and sc and sc[-1]['body']['windows']['mon'] == ['morning'] and sc[-1]['body']['windows']['sat'] == ['evening']
       and sc[-1]['body']['target_hours'] == '12' and sc[-1]['body']['outside_ok'] is False and 'Saved, Grace' in pg2.inner_text('#hrsMsg') and not errs2, [top, sc, errs2])
    b2.close()
    pg.click('[data-sn="yes"]'); pg.wait_for_timeout(200)
    ok('short notice: yes, saved by them', any(c['body'].get('action') == 'short_notice' and c['body'].get('ok') is True for c in calls) and pg.locator('[data-sn="yes"]').get_attribute('class').endswith('on'))
    pg.click('#brkSet'); pg.wait_for_timeout(100)
    ok('a break with no date: asks for the date, sends nothing', 'Pick the date' in pg.inner_text('#brkMsg') and not any(c['body'].get('action') == 'break' for c in calls))
    pg.fill('#brkDate', '2026-11-15'); pg.click('#brkSet'); pg.wait_for_timeout(200)
    ok('...with a date: the break is set', any(c['body'].get('action') == 'break' and c['body'].get('until') == '2026-11-15' for c in calls))
    pg.wait_for_timeout(1400)
    pg.click('button.req[data-slug="dementia-care"]'); pg.wait_for_timeout(200)
    ok("a course: I'd like this, then Asked", any(c['body'].get('action') == 'course' and c['body'].get('slug') == 'dementia-care' for c in calls) and pg.locator('button.req[data-slug="dementia-care"]').inner_text() == 'Asked ✓')
    pg.click('#ideaBtn'); pg.fill('#ideaTxt', 'A group text for open weekends'); pg.click('#ideaSend'); pg.wait_for_timeout(200)
    ok('an idea goes to the office', any(c['body'].get('action') == 'idea' and c['body'].get('text') == 'A group text for open weekends' for c in calls))
    pg.screenshot(path=os.path.join(SHOTS, 'prn_page_member.png'), full_page=True)
    ok('no page errors (member)', not errs, errs); b.close()

    src = open('index.html').read()
    ok("step 8b: a Gap Mentor note or set-aside never counts as the client's latest plan review", "filter(x=>x&&!/^mentor_/.test(String(x.kind||''))&&String(x.axiscare_client_id||'')===ax)" in src)
    # STEP 8a: a Gap Mentor's page
    V8 = dict(VIEW, mentor={ 'skills': ['Hoyer lift transfers'], 'waiting': False, 'first_done': False, 'rules': 'You observe, practice and listen. You never change the care plan, diagnose or give medical advice: anything medical goes to the family, their doctor or home health. In an emergency call 911, then the office.',
      'offers': [{ 'id': 7, 'kind': 'refresher', 'kind_label': 'Refresher with a caregiver in the home', 'client_first': 'Ruth', 'visit_date': '2026-11-05', 'visit_time': '09:00-10:00', 'skill': 'Hoyer lift transfers', 'caregiver_first': 'Amy', 'note': None, 'answer': None, 'familiar': True }],
      'mine': [{ 'id': 6, 'kind': 'care_update', 'kind_label': 'Care update visit', 'client_first': 'Mary', 'visit_date': '2026-10-29', 'visit_time': '13:00-14:00', 'skill': None, 'caregiver_first': None, 'note': None, 'answer': 'yes', 'familiar': False,
        'status': 'assigned', 'note_due': True, 'done': False, 'rules': 'x', 'fields': [['mobility', 'Mobility and transfers'], ['eating', 'Eating and drinking'], ['skin', 'Skin']] }] })
    def m8(body):
        a = body.get('action')
        if a == 'view': return 200, V8
        return 200, { 'ok': True, 'message': { 'mentor_answer': 'Thank you! The office will confirm with you before it is set.', 'mentor_note': 'Thank you, Grace! The office has your note.' }.get(a, 'ok') }
    b, pg, calls, errs = page(pw, '?p=0f1e2d3c-4b5a-4968-8776-655443322110&e=1999999999&t=' + 'x' * 43, m8)
    mt = pg.inner_text('#mentor')
    ok('their page (step 8a): Gap Mentor for Hoyer; the refresher with Amy for Ruth, a client they know; the rules; no last names', "You're one of our Gap Mentors for Hoyer lift transfers" in mt and 'Refresher with a caregiver in the home · Ruth' in mt
       and 'Amy' in mt and 'A client you know' in mt and 'never change the care plan, diagnose or give medical advice' in mt and 'Lane' not in mt and 'Dale' not in mt, mt)
    pg.locator('[data-ma="0"][data-ans="yes"]').click(); pg.wait_for_timeout(200)
    ok('..."I can do it" sends that visit with their link', any(c['body'].get('action') == 'mentor_answer' and c['body'].get('id') == 7 and c['body'].get('answer') == 'yes' and c['body'].get('t') for c in calls) and 'office will confirm' in pg.inner_text('#maMsg0'))
    ok('...their own visit: the "What\'s changed" note opens on the day', 'Care update visit · Mary' in mt and pg.locator('#mn0_mobility').count() == 1 and pg.locator('#mn0_skin').count() == 1)
    pg.fill('#mn0_mobility', 'Needs two people to stand now'); pg.fill('#mn0_eating', 'Eating about half'); pg.click('[data-mn="0"]'); pg.wait_for_timeout(200)
    nc = [c['body'] for c in calls if c['body'].get('action') == 'mentor_note']
    ok('...the note is sent with each part', nc and nc[-1]['id'] == 6 and nc[-1]['mobility'] == 'Needs two people to stand now' and nc[-1]['eating'] == 'Eating about half' and nc[-1]['skin'] == '' and 'The office has your note' in pg.inner_text('#mnMsg0'), nc)
    ok('no page errors (step 8a)', not errs, errs); b.close()
    b, pg, calls, errs = page(pw, '?p=0f1e2d3c-4b5a-4968-8776-655443322110&e=1999999999&t=' + 'x' * 43, member)
    ok('...not a Gap Mentor: no Gap Mentor section', pg.locator('#mentor').count() == 0); b.close()

    # STEP 7: the twice-yearly questions, on call, milestones
    V7 = dict(VIEW, feedback={ 'round': '2026-11', 'until': '2026-11-30', 'questions': ['What would make being on the PRN Team better for you?', 'Is there anything we could do to make picking up shifts easier?'], 'answered': False, 'waiting': False },
      oncall={ 'pattern': 'every_other_weekend', 'pattern_word': 'Every other weekend', 'confirmed': [{ 'start_date': '2026-11-07', 'end_date': '2026-11-08' }],
        'patterns': { 'every_weekend': 'Every weekend', 'every_other_weekend': 'Every other weekend', 'one_weekend_month': 'One weekend a month', 'weekday': 'A weekday', 'not_now': 'Not right now' },
        'words': 'On call comes in two shifts: daytime, 7am to 5pm, and overnight, 5pm to 7am the next morning. Take one, or both for a whole day. On call means you reply within 15 minutes and can start a shift within 1 hour. The office confirms each date and shift with you first.' },
      thanks=[{ 'kind': 'milestone', 'at': '', 'text': 'You stepped in for your first PRN shift. Thank you for standing in the gap.' }, { 'kind': 'milestone', 'at': '', 'text': 'You kept every shift you said yes to this season. Families count on that, and so do we.' }])
    def m7(body):
        a = body.get('action')
        if a == 'view': return 200, V7
        return 200, { 'ok': True, 'message': { 'feedback': 'Thank you, Grace! The office reads every answer.', 'oncall': 'Thank you! The office will confirm any dates with you first.' }.get(a, 'ok') }
    b, pg, calls, errs = page(pw, '?p=0f1e2d3c-4b5a-4968-8776-655443322110&e=1999999999&t=' + 'x' * 43, m7)
    ft = pg.inner_text('#feedback')
    ok('their page (step 7): the two questions, open until Nov 30', 'What would make PRN better?' in ft and 'What would make being on the PRN Team better for you?' in ft and 'picking up shifts easier' in ft and 'Nov 30' in ft, ft)
    pg.fill('#fbA1', 'More weekend notice'); pg.click('#fbSend'); pg.wait_for_timeout(200)
    fc = [c['body'] for c in calls if c['body'].get('action') == 'feedback']
    ok('...answers are sent with their link; thanks them', fc and fc[-1]['a1'] == 'More weekend notice' and fc[-1]['a2'] == '' and fc[-1].get('t') and 'The office reads every answer' in pg.inner_text('#fbMsg'), fc)
    ht = pg.inner_text('#hours')
    ok('on call under My hours: the question, what it means, their choice marked, their confirmed weekend; no pay', 'Would you like to be on call sometimes?' in ht and 'daytime, 7am to 5pm, and overnight, 5pm to 7am' in ht and 'reply within 15 minutes' in ht and pg.locator('[data-oc="every_other_weekend"]').get_attribute('class').endswith('on')
       and "You're on call: Sat, Nov 7 to Sun, Nov 8" in ht and '$' not in ht, ht)
    pg.click('[data-oc="weekday"]'); pg.wait_for_timeout(200)
    ok('...tapping a choice sends it, and it is marked', any(c['body'].get('action') == 'oncall' and c['body'].get('pattern') == 'weekday' for c in calls) and pg.locator('[data-oc="weekday"]').get_attribute('class').endswith('on'))
    tt = pg.inner_text('#thanks')
    ok('milestones: first shift, and kept every yes this season', 'your first PRN shift' in tt and 'kept every shift you said yes to this season' in tt, tt)
    ok('no page errors (step 7)', not errs, errs); b.close()
    b, pg, calls, errs = page(pw, '?p=0f1e2d3c-4b5a-4968-8776-655443322110&e=1999999999&t=' + 'x' * 43, member)
    ok('...no round and not on the CNA Team: no questions, no on-call question', pg.locator('#feedback').count() == 0 and 'on call' not in pg.inner_text('#hours').lower()); b.close()

    # STEP 6: the monthly update at the top of their page
    VU = dict(VIEW, update={ 'month': '2026-10', 'title': 'Your PRN Team update for October', 'facts': ['In October our PRN Teams stepped in for 3 shifts, for 2 different families. Thank you for standing in the gap.'],
      'paragraph': 'Thank you for everything you did this month.', 'from': 'Samantha', 'kind_word': 'She made Mom laugh.', 'tip': None, 'steady': 'Want steady hours? Text us and we will talk about what is open.' })
    b, pg, calls, errs = page(pw, '?p=0f1e2d3c-4b5a-4968-8776-655443322110&e=1999999999&t=' + 'x' * 43, lambda body: (200, VU) if body.get('action') == 'view' else (200, { 'ok': True }))
    ut = pg.inner_text('#monthly') if pg.locator('#monthly').count() else ''
    ok('their page (step 6): the October update at the top, signed Samantha, the kind word, the steady-hours line', 'Your PRN Team update for October' in ut and 'stepped in for 3 shifts' in ut and 'Thank you for everything you did this month.' in ut and 'Samantha' in ut
       and 'She made Mom laugh.' in ut and 'Want steady hours?' in ut and pg.evaluate("()=>document.getElementById('monthly').getBoundingClientRect().top < document.getElementById('shifts').getBoundingClientRect().top") and not errs, ut); b.close()
    b, pg, calls, errs = page(pw, '?p=0f1e2d3c-4b5a-4968-8776-655443322110&e=1999999999&t=' + 'x' * 43, member)
    ok('...no update sent: nothing shows', pg.locator('#monthly').count() == 0); b.close()

    # STEP 5b: open shifts and I'm Interested
    OPEN = [{ 'case_id': 'c9', 'shift_date': '2026-11-02', 'shift_time': '09:00-13:00', 'hours': 4, 'town': 'Ozark', 'familiar': True, 'client_first': 'Ruth', 'outside_my_times': False, 'shift_key': '2026-11-02|09:00-13:00' },
            { 'case_id': 'c8', 'shift_date': '2026-10-31', 'shift_time': '18:00-22:00', 'hours': 4, 'town': 'Nixa', 'familiar': False, 'client_first': None, 'outside_my_times': True, 'shift_key': '2026-10-31|18:00-22:00' }]
    VO = dict(VIEW, open_live=True)
    def member5b(body):
        a = body.get('action')
        if a == 'view': return 200, VO
        if a == 'open': return 200, { 'ok': True, 'shifts': OPEN, 'open_live': True, 'why': None }
        if a == 'interested': return 200, { 'ok': True, 'message': 'Thank you, Grace! The office will look at it and let you know. Nothing is set until they confirm it with you.' }
        return 200, { 'ok': True }
    b, pg, calls, errs = page(pw, '?p=0f1e2d3c-4b5a-4968-8776-655443322110&e=1999999999&t=' + 'x' * 43, member5b)
    pg.wait_for_timeout(300); txt = pg.inner_text('#shifts')
    ok('open shifts: loaded after the page, with their link', any(c['body'].get('action') == 'open' and c['body'].get('p') for c in calls) and 'Open shifts you can pick up' in txt and pg.inner_text('#openN') == '2', txt)
    ok('...a client they know first: "A client you know", Ruth in Ozark, Mon Nov 2 9am to 1pm, 4 hours', txt.index('A client you know') < txt.index('Ruth in Ozark') < txt.index('A client in Nixa') and 'Mon, Nov 2 · 9am to 1pm · 4 hours' in txt, txt)
    ok('...a client they don\'t know: no name, just the town; outside their usual times says so', 'A client in Nixa' in txt and 'Outside your usual times' in txt and txt.count('A client you know') == 1, txt)
    ok('...says a coordinator confirms first; no pay, no em dash', "Saying you're interested doesn't schedule you" in txt and '$' not in txt and '—' not in txt)
    pg.locator('[data-int="1"]').click(); pg.wait_for_timeout(200)
    ic = [c['body'] for c in calls if c['body'].get('action') == 'interested']
    ok("I'm Interested: sends that shift and the hours they saw", ic and ic[-1]['case_id'] == 'c8' and ic[-1]['shift_key'] == '2026-10-31|18:00-22:00' and ic[-1].get('t'), ic)
    ok('...thanks them and says nothing is set until the office confirms', 'Nothing is set until they confirm it with you' in pg.inner_text('#intMsg1') and pg.locator('[data-int="1"]').inner_text() == 'Interested ✓')
    ok('no page errors (open shifts)', not errs, errs); b.close()
    VO2 = dict(VO, offered=[dict(VIEW['offered'][0], answered='yes', from_page=True)])
    b, pg, calls, errs = page(pw, '?p=0f1e2d3c-4b5a-4968-8776-655443322110&e=1999999999&t=' + 'x' * 43, lambda body: (200, VO2) if body.get('action') == 'view' else (200, { 'ok': True, 'shifts': [], 'why': None }))
    pg.wait_for_timeout(300); txt = pg.inner_text('#shifts')
    ok('...afterwards it shows in Offered to You as "You said you\'re interested"; none left: a kind empty line', "You said you're interested" in txt and 'No open shifts that fit you right now' in txt, txt); b.close()
    b, pg, calls, errs = page(pw, '?p=0f1e2d3c-4b5a-4968-8776-655443322110&e=1999999999&t=' + 'x' * 43, lambda body: (200, VO) if body.get('action') == 'view' else (200, { 'ok': True, 'shifts': [], 'why': "We can't check the schedule right now, so open shifts aren't shown. Check back soon." }))
    pg.wait_for_timeout(300)
    ok("...AxisCare can't be read: no open shifts, and says why", "We can't check the schedule right now" in pg.inner_text('#shifts') and pg.locator('[data-int]').count() == 0); b.close()
    b, pg, calls, errs = page(pw, '?p=0f1e2d3c-4b5a-4968-8776-655443322110&e=1999999999&t=' + 'x' * 43, member)
    pg.wait_for_timeout(300)
    ok('open shifts switched off: the member page never asks for them', not any(c['body'].get('action') == 'open' for c in calls) and 'Soon you' in pg.inner_text('#shifts')); b.close()

    V2 = dict(VIEW, hours=dict(VIEW['hours'], break_until='2026-11-15'))
    b, pg, calls, errs = page(pw, '?p=0f1e2d3c-4b5a-4968-8776-655443322110&e=1999999999&t=' + 'x' * 43, lambda body: (200, V2) if body.get('action') == 'view' else (200, { 'ok': True, 'message': "Welcome back! You'll hear about shifts again." }))
    ok('on a break: said at the top, with End my break now', "You're on a break until Sunday, Nov 15" in pg.inner_text('body') and pg.locator('#brkEnd').count() == 1)
    pg.click('#brkEnd'); pg.wait_for_timeout(200)
    ok('...ending it sends an empty date', any(c['body'].get('action') == 'break' and c['body'].get('until') == '' for c in calls)); b.close()

    b, pg, calls, errs = page(pw, '?p=0f1e2d3c-4b5a-4968-8776-655443322110&e=1999999999&t=' + 'x' * 43, lambda body: (200, { 'closed': True, 'message': "Your PRN Team page isn't open yet. We'll text you when it is.", 'office': '(417) 234-8494' }))
    ok('switch off: "isn\'t open yet", nothing else', "isn't open yet" in pg.inner_text('body') and 'My hours' not in pg.inner_text('body')); b.close()
    b, pg, calls, errs = page(pw, '?p=x&e=1&t=y', lambda body: (401, { 'expired': True, 'message': 'This link has expired or is not valid. Text us and we will send you a fresh one.', 'office': '(417) 234-8494' }))
    ok('an expired link: says so, with the office number to text', 'This link has expired' in pg.inner_text('body') and pg.locator('a[href="sms:+14172348494"]').count() == 1); b.close()

    PV = dict(VIEW, preview=True, live=False); PV['offered'] = [dict(VIEW['offered'][0], link=None)]
    b, pg, calls, errs = page(pw, '?preview=0f1e2d3c-4b5a-4968-8776-655443322110', lambda body: (200, PV) if body.get('action') == 'preview' else (200, { 'ok': True, 'shifts': OPEN, 'open_live': False }) if body.get('action') == 'open_preview' else (500, { 'error': 'should never be called' }))
    pg.evaluate("()=>{ localStorage.setItem('sb-zngsgedlsxinbygwmxwn-auth-token', JSON.stringify({ access_token: 'office-token' })); }"); pg.reload(); pg.wait_for_timeout(700)
    t2 = pg.inner_text('body')
    ok('office preview: the banner, read-only, with their sign-in', "Office preview of Grace's page · nothing you tap here is sent · the page is switched off for members" in t2 and calls[-1]['auth'] == 'Bearer office-token' and calls[-1]['body'].get('applicant_id'))
    n = len(calls); pg.click('#lookSw'); pg.click('#lookSave'); pg.click('[data-sn="no"]'); pg.click('#hrsSave'); pg.click('button.req[data-slug="dementia-care"]'); pg.wait_for_timeout(300)
    ok('...nothing you tap is sent', len(calls) == n and 'Preview only' in pg.inner_text('#pvtoast'))
    ok('...no shift link in the preview', pg.locator('a:has-text("See this shift")').count() == 0)
    ok('...open shifts: what they would see, marked waiting while the switch is off', any(c['body'].get('action') == 'open_preview' for c in calls) and 'Waiting:' in t2 and 'Ruth in Ozark' in pg.inner_text('#shifts'))
    n = len(calls); pg.locator('[data-int="0"]').click(); pg.wait_for_timeout(200)
    ok("...I'm Interested in the preview sends nothing", len(calls) == n)
    pg.screenshot(path=os.path.join(SHOTS, 'prn_page_preview.png'))
    ok('no page errors (preview)', not errs, errs); b.close()

    # the Hub side
    T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,400)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; await sleep(600);
  (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha Troutman' };"); CC_ROLES=['owner_admin']; CC_ROLES_CHECKED=true; CC_ROLE_BY_EMAIL['samantha@mo-care.com']=['owner_admin'];
  (0,eval)(`PRN_T = { at: Date.now(), history: [], shifts: [], tracks: [ { applicant_id:'g', track:'prn_team', team:'cna', since:'2026-10-19', axiscare_caregiver_id:'11', linked_at:'2026-10-27T15:00:00Z' } ],
    apps: { g:{ first_name:'Grace', last_name:'Hill', prn:{} } } }; prnLoad = async()=>PRN_T; prnDashLoad = async()=>{};`);
  const WEEK={ ok:true, today:'2026-10-29', live:true, page_live:false, owner:'Krystal', more:0, familiar_note:null,
    members:[{applicant_id:'g',name:'Grace Hill',team:'cna',axiscare_id:'11',familiar:{why:null,clients:[]}, page:{ last_looked:'2026-10-28T15:00:00Z', looking:{on:true,note:'any morning next week'}, break_until:'2026-11-15' }}],
    items:[{id:'looking:g:2026-10-28',kind:'looking',applicant_id:'g',name:'Grace Hill',team:'PRN CNA Team',ref:'looking:2026-10-28',title:'Grace is looking for hours',detail:'"any morning next week". From their PRN Team page.'},
           {id:'course:g:dementia-care',kind:'course',applicant_id:'g',name:'Grace Hill',team:'PRN CNA Team',ref:'course:dementia-care',title:"Grace would like to take Alzheimer's & Dementia Care",detail:'Assign it on the Training Platform.'},
           {id:'idea:g:9',kind:'idea',applicant_id:'g',name:'Grace Hill',team:'PRN CNA Team',ref:'idea:9',title:'Grace shared an idea',detail:'"A group text"'},
           {id:'feedback:g:41',kind:'feedback',applicant_id:'g',name:'Grace Hill',team:'PRN CNA Team',ref:'feedback:41',title:'Grace answered "What would make PRN better?"',detail:'1: More weekend notice · 2: (left blank)'},
           {id:'oncall:g:42',kind:'oncall',applicant_id:'g',name:'Grace Hill',team:'PRN CNA Team',ref:'oncall:42',title:'Grace would like to be on call: every other weekend',detail:'From their PRN Team page. Confirm dates with them in On call, then mark it done here.'}],
    oncall:{ stipend:null, patterns:{}, offers:[], weekends:[] } };
  let MONTHLY={ ok:true, month:'2026-10', month_word:'October', live:false, switch_on:false, page_live:false, facts:['In October our PRN Teams stepped in for 3 shifts, for 2 different families. Thank you for standing in the gap.','Welcome to our newest members, Denise and Tina!'],
    paragraph:'', kind_word:'', tip:'', steady:'Want steady hours? Text us and we will talk about what is open.', saved_by:null, sent_by:null, sent_at:null, members:3, sent_to:0 };
  const MLIST={ ok:true, live:true, visits:[{ id:7, kind:'refresher', client_ax:'501', client_name:'Ruth Lane', visit_date:'2026-11-03', visit_time:'09:00-10:00', skill:'hoyer', caregiver_name:'Amy Dale', status:'open', asked_by:'Krystal Land',
    answers:[{ applicant_id:'g', name:'Grace Hill', answer:'yes' }, { applicant_id:'d', name:'Denise Gough', answer:'no' }] }] };
  const CALLS=[]; const realFetch=window.fetch;
  window.fetch=async(u,o)=>{ if(String(u).includes('/functions/v1/prn-week')){ const b=JSON.parse(o.body); CALLS.push(b); return new Response(JSON.stringify(b.action==='week'?WEEK:b.action==='monthly'?MONTHLY:b.action==='mentor_list'?MLIST:b.action==='mentor_ask'?{outcome:'asked',id:7}:b.action==='mentor_set'?{outcome:'saved'}:b.action==='monthly_send'?{outcome:'sent',sent:['Grace Hill'],already:0,no_phone:[],refused:['Tom Ray (asked not to get texts)'],failed:[]}:b.action==='page_link'?{link:'https://cc.mo-care.com/prn.html?p=g&e=1&t=x',live:false,days:30}:{outcome:'recorded'}),{status:200}); } return realFetch(u,o); };
  sb.auth.getSession=async()=>({ data:{ session:{ access_token:'t' } } });
  let alerted=''; window.ccAlert=(m)=>{ alerted=m; }; (0,eval)('ccAlert=window.ccAlert');
  location.hash='#prnteams'; await sleep(800); PW.tab('week'); await PW.load(); await sleep(150);
  const wk=document.getElementById('prnWeek').innerText;
  ok('This week: looking for hours first, then the course and the idea', wk.indexOf('Grace is looking for hours') > -1 && wk.indexOf('Grace is looking for hours') < wk.indexOf('would like to take') && /Grace shared an idea/.test(wk), wk.slice(0,400));
  await sleep(150);
  const mo=document.getElementById('pwMonthly'); const mt=mo?mo.innerText:'';
  ok('This week (step 6): the October update with the facts from the records, your paragraph box, and why it can\'t send yet', /Monthly PRN Team update · October/.test(mt) && /stepped in for 3 shifts, for 2 different families/.test(mt) && /Denise and Tina/.test(mt)
    && !!document.getElementById('pwMoPara') && /the PRN Team page isn't open yet/.test(mt) && mo.querySelector('button.addlead').disabled, mt);
  await PW.moSave(); ok('...Save with no paragraph: asks for it, sends nothing', /Write your paragraph first/.test(document.getElementById('pwMoSt').innerText) && !CALLS.some(c=>c.action==='monthly_save'));
  document.getElementById('pwMoPara').value='Thank you — all'; await PW.moSave(); ok('...an em dash is refused before anything is sent', /em dash/.test(document.getElementById('pwMoSt').innerText) && !CALLS.some(c=>c.action==='monthly_save'));
  document.getElementById('pwMoPara').value='Thank you for everything you did this month.'; document.getElementById('pwMoKind').value='She made Mom laugh.'; await PW.moSave();
  ok('...Save sends your paragraph and kind word', CALLS.some(c=>c.action==='monthly_save' && c.month==='2026-10' && c.paragraph==='Thank you for everything you did this month.' && c.kind_word==='She made Mom laugh.' && c.tip===''));
  MONTHLY=Object.assign({},MONTHLY,{ live:true, switch_on:true, page_live:true, paragraph:'Thank you for everything you did this month.' }); window.ccConfirm=async()=>true; (0,eval)('ccConfirm=window.ccConfirm');
  PW._setMonthly(MONTHLY); await sleep(50);
  const sendBtn=[...document.querySelectorAll('#pwMonthly button')].find(b=>/Save and send to 3 members/.test(b.innerText));
  ok('...switched on: "Save and send to 3 members"', sendBtn && !sendBtn.disabled);
  MONTHLY=Object.assign({},MONTHLY,{ sent_at:'2026-11-02T16:00:00Z', sent_by:'Krystal Land', sent_to:2 });
  await PW.moSend(sendBtn); await sleep(100);
  ok('...send: saves, sends, then says who was reached and who was not (no silent failures)', CALLS.some(c=>c.action==='monthly_send' && c.month==='2026-10') && /Sent to 1\. Not reached: Tom Ray \(asked not to get texts\) \(not cleared for texts\)\. Each one is also on Needs Attention\./.test(document.getElementById('pwMoSt').innerText), document.getElementById('pwMoSt').innerText);
  ok('...afterwards: sent by, 2 of 3, read-only, and a button for the one not reached', /Sent by Krystal Land on Nov 2 · 2 of 3 members/.test(document.getElementById('pwMonthly').innerText) && document.getElementById('pwMoPara').disabled && /Send to the 1 not reached yet/.test(document.getElementById('pwMonthly').innerText), document.getElementById('pwMonthly').innerText);
  /* step 8a: Our teams, Make a Gap Mentor */
  PW.tab('teams'); await sleep(60);
  ok('Our teams (step 8a): a PRN CNA can be made a Gap Mentor', [...document.querySelectorAll('#prnTeams button')].some(b=>b.innerText==='Make a Gap Mentor'));
  const W2=PW._state(); W2.mentor_skills={ hoyer:'Hoyer lift transfers', dementia:'Dementia care' }; PW.gapOpen('g'); await sleep(40);
  document.querySelector('.pwGapSk_g[value="hoyer"]').checked=true; document.getElementById('pwGapEv_g').value='References from Mercy, registry-checked CNA';
  await PW.gapSave('g'); ok('...saves the verified skills and how they were verified', CALLS.some(c=>c.action==='mentor_set' && c.applicant_id==='g' && c.on===true && c.skills.join()==='hoyer' && c.evidence==='References from Mercy, registry-checked CNA'));
  PW.tab('week'); await sleep(40);
  /* the client's Care tab: Ask a Gap Mentor */
  DATA.ops_settings=Object.assign({},DATA.ops_settings,{ prn_mentor_live:true, prn_page_live:true }); DATA.caregivers=[{ axiscare_id:'77', first:'Amy', last:'Dale' }];
  const gh=document.createElement('div'); gh.id='gmHostT'; document.body.appendChild(gh);
  DATA.care_plan_reviews=[{ id:'gm7', kind:'mentor_report', axiscare_client_id:'501', title:"What's changed, from Denise (Gap Mentor), Nov 3", report:{ mobility:'Needs two people to stand now' }, reminder:'GUIDE client: share this with their GUIDE care navigator through Continuum. Their care plan changes only together with them.', at:'2026-11-03T18:00:00Z' },
    { id:'gm8', kind:'mentor_refresher', axiscare_client_id:'501', caregiver_ax:'77', caregiver_name:'Amy Dale', title:'Refresher with Grace (CNA), Nov 3: Hoyer lift transfers', report:{ practiced:'Hoyer bed to chair', comfort:'yes' }, at:'2026-11-03T19:00:00Z' }];
  GM.mountClient('gmHostT','501','Ruth Lane'); await sleep(150);
  const gt=gh.innerText;
  ok('Care tab (step 8a): the ask, Grace can do it (put in AxisCare), Denise said not this time, and the notes with the GUIDE reminder', /Refresher with a caregiver in the home/.test(gt) && /Grace Hill can do it: put in AxisCare/.test(gt) && /1 said not this time/.test(gt)
    && /What's changed, from Denise/.test(gt) && /Needs two people to stand now/.test(gt) && /GUIDE care navigator through Continuum/.test(gt) && /The Care Coordinator decides any care plan change/.test(gt), gt);
  GM.toggle(); await sleep(30);
  document.getElementById('gmKind').value='refresher'; document.getElementById('gmDate').value='2026-11-05'; document.getElementById('gmFrom').value='09:00'; document.getElementById('gmTo').value='10:00';
  document.getElementById('gmSkill').value='hoyer'; document.getElementById('gmCg').value='77'; document.getElementById('gmFam').checked=true; document.getElementById('gmNote').value='She uses a Hoyer from bed to chair.';
  await GM.ask(); await sleep(80);
  const ak=CALLS.find(c=>c.action==='mentor_ask');
  ok('...Ask a Gap Mentor sends the visit, the caregiver, the skill and the family\'s OK', ak && ak.client_ax==='501' && ak.client_name==='Ruth Lane' && ak.visit_time==='09:00-10:00' && ak.caregiver_ax==='77' && ak.caregiver_name==='Amy Dale' && ak.skill==='hoyer' && ak.family_ok===true, ak);
  /* step 8b: suggestions from shift notes and Care Match */
  const iso=(d)=>new Date(Date.now()-d*864e5).toISOString();
  DATA.ops_items=[{ id:'cn1', kind:'care_note', level:'yellow', flag_kind:'eating or drinking', client_ax:'501', about:'Ruth Lane', caregiver:'Amy Dale', caregiver_ax:'77', created_at:iso(3) },
    { id:'cn2', kind:'care_note', level:'yellow', flag_kind:'a fall or injury', client_ax:'501', about:'Ruth Lane', caregiver:'Amy Dale', caregiver_ax:'77', created_at:iso(5) },
    { id:'cn3', kind:'care_note', level:'red', flag_kind:'skin or a wound', client_ax:'502', about:'Mary Cole', caregiver:'Bo Lee', caregiver_ax:'78', created_at:iso(2), cn_actions:[{ what:'ok' }] },
    { id:'cn4', kind:'care_note', level:'yellow', flag_kind:'mood', client_ax:'503', about:'Al Fox', caregiver:'Bo Lee', caregiver_ax:'78', created_at:iso(2) },
    { id:'cn5', kind:'care_note', level:'red', flag_kind:'confusion or a change in behavior', client_ax:'504', about:'Jo Ray', caregiver:'Bo Lee', caregiver_ax:'78', created_at:iso(40) }];
  DATA.client_checkins=[{ id:'ci1', axiscare_client_id:'503', client:'Al Fox', rating:'concern', notes:'Seems more tired', at:iso(4) }];
  const sg=GM.suggestFor('501');
  ok('suggestions (step 8b): two yellow decline flags = a care update for Ruth, with the reasons', sg.some(g=>g.kind==='care_update' && g.why.length===2 && /eating or drinking/.test(g.why.join()) && /a fall or injury/.test(g.why.join())), sg);
  ok('...a fall on Amy\'s own shift note = a refresher with Amy (fall prevention)', sg.some(g=>g.kind==='refresher' && g.caregiver_ax==='77' && g.caregiver_name==='Amy Dale' && g.skill==='falls'), sg);
  ok('...a flag closed as "not a concern": nothing (Mary)', GM.suggestFor('502').length===0);
  ok('...one yellow "mood" flag alone: no care update; a Care Match concern: a care update (Al)', GM.suggestFor('503').length===1 && /Care Match .*a concern \("Seems more tired"\)/.test(GM.suggestFor('503')[0].why[0]), GM.suggestFor('503'));
  ok('...older than 30 days: nothing (Jo)', GM.suggestFor('504').length===0);
  GM.mountClient('gmHostT','501','Ruth Lane'); await sleep(150);
  ok('...on Ruth\'s Care tab: "Suggested by the Hub", the reasons, and that nobody is asked until you tap Ask', /Suggested by the Hub/.test(gh.innerText) && /A care update visit/.test(gh.innerText) && /A refresher with Amy Dale/.test(gh.innerText) && /Nobody is asked or contacted until you tap Ask/.test(gh.innerText), gh.innerText);
  GM.fromSuggest(1); await sleep(40);
  ok('...Ask a Gap Mentor from the refresher suggestion fills in the kind, Amy, the skill and why', document.getElementById('gmKind').value==='refresher' && document.getElementById('gmCg').value==='77' && document.getElementById('gmSkill').value==='falls' && /^Why: Shift note/.test(document.getElementById('gmNote').value));
  GM.toggle(); await sleep(20);
  let saved=null; window.persist=async(k,v)=>{ saved=[k,v]; }; (0,eval)('persist=window.persist');
  await GM.setAside('cu:501'); await sleep(20);
  ok('..."Not needed now" sets it aside for 30 days, kept with the care records (never a review)', saved && saved[0]==='care_plan_reviews' && saved[1].kind==='mentor_set_aside' && saved[1].suggestion==='cu:501' && !GM.suggestFor('501').some(g=>g.kind==='care_update'), saved);
  const ss=GM.skillSuggest({ hoyer_lift:{ have:'yes', evidence:'attested' }, transfers_gait_belt:{ have:'yes', evidence:'observed' }, dementia_care:{ have:'yes' } });
  ok('the caregiver\'s record: a refresher is suggested for a high-risk skill we only know because they told us (Hoyer), not one we saw (transfers)', ss.length===1 && ss[0].skill==='hoyer', ss);
  ok('This week: Gap Mentor suggestions (owners, practice while off)', /Gap Mentor suggestions/.test(GM.weekHtml()) && /Al Fox/.test(GM.weekHtml()) && /Practice: only owners/.test(GM.weekHtml()));
  const cg=document.createElement('div'); GM.cgMount(cg,'77');
  ok("the caregiver's record: refreshers in the home, apart from online courses", /Refreshers in the home/.test(cg.innerText) && /Refresher with Grace \(CNA\), Nov 3: Hoyer lift transfers/.test(cg.innerText) && /apart from online courses/.test(cg.innerText), cg.innerText);
  /* the case card's "Keep off the PRN page" (decision 13) */
  const kc={ id:'cvk', status:'open', client:'Ruth Lane', shift_date:'2026-11-02', shift_time:'09:00-13:00', asked:[] }; DATA.coverage_cases=[kc];
  let persisted=null; window.persist=async(k,v)=>{ persisted=[k,v&&v.id]; }; (0,eval)('persist=window.persist');
  const host=document.createElement('div'); host.id='covWord_cvk'; host.innerHTML=covWordingPreview(kc); document.body.appendChild(host);
  ok('case card: "Keep off the PRN page", unticked by default', /Keep off the PRN page/.test(host.innerText) && !host.querySelector('input[type=checkbox]').checked, host.innerText);
  await covPrnPageOff('cvk', true);
  ok('...ticked: saved on the case with who ticked it', kc.prn_page_off===true && kc.prn_page_off_by && persisted && persisted[0]==='coverage_cases' && /Ticked by/.test(host.innerText), [kc, persisted]);
  await covPrnPageOff('cvk', false); ok('...unticked: cleared', !('prn_page_off' in kc));
  ok('...not on a regular weekly opening', !/Keep off the PRN page/.test(covWordingPreview({ id:'w', status:'open', kind:'interest', client:'X' })));
  ok('This week (step 7): her answers to the questions (Read) and an on-call offer from her page (Open On call, Done)', /Grace answered "What would make PRN better\?"/.test(wk) && /More weekend notice/.test(wk) && /Grace would like to be on call: every other weekend/.test(wk)
    && [...document.querySelectorAll('#prnWeek button')].some(b=>b.innerText==='Open On call'), wk);
  await PW.mark('feedback:g:41','handled'); ok('...Read marks the answers handled', CALLS.some(c=>c.action==='mark' && c.kind==='handled' && c.ref==='feedback:41'));
  await PW.mark('course:g:dementia-care','handled'); ok('...Assigned marks the course line handled', CALLS.some(c=>c.action==='mark' && c.kind==='handled' && c.ref==='course:dementia-care'));
  await PW.mark('looking:g:2026-10-28','called'); ok('...Called on looking for hours', CALLS.some(c=>c.action==='mark' && c.kind==='called' && c.ref==='looking:2026-10-28'));
  PW.tab('teams'); await sleep(80);
  const tt=document.getElementById('prnTeams').innerText;
  ok('Our teams: looking for hours (her note), on a break, last looked', /Looking for hours \(any morning next week\)/.test(tt) && /On a break until Nov 15/.test(tt) && /Last looked at their page Oct 28/.test(tt), tt);
  const copyBtn=[...document.querySelectorAll('#prnTeams button')].find(b=>/Copy page link/.test(b.innerText));
  try{ Object.defineProperty(navigator,'clipboard',{ value:{ writeText: async(t)=>{ window.__clip=t; } }, configurable:true }); }catch(e){}
  await PW.copyLink('g', copyBtn); await sleep(50);
  ok('...Copy page link: their link, and a note that the page is still off', CALLS.some(c=>c.action==='page_link' && c.applicant_id==='g') && window.__clip==='https://cc.mo-care.com/prn.html?p=g&e=1&t=x' && /still switched off/.test(alerted));
  PW.see('g'); await sleep(200);
  const fr=document.querySelector('#prnSee iframe');
  ok("What they see: Grace's real page, read-only, and a note that it's off for members", fr && /prn\.html\?preview=g$/.test(fr.src) && /switched off for members/.test(document.getElementById('prnSee').innerText) && /each look is recorded/.test(document.getElementById('prnSee').innerText));
  DATA.ops_settings={}; location.hash='#settings/prn'; await sleep(300); prnSetFill();
  const sw=document.getElementById('prnStep5Switches').innerText;
  ok('Settings: "Open the PRN Team page to members", off', /Open the PRN Team page to members/.test(sw) && /: off/.test(sw), sw);
  window.tkMerge=async(fn)=>{ const base=JSON.parse(JSON.stringify(DATA.ops_settings||{})), m=JSON.parse(JSON.stringify(base)); const ch=fn(m,base)||[]; DATA.ops_settings=m; return { changed:ch, error:null }; }; (0,eval)('tkMerge=window.tkMerge');
  window.ccConfirm=async()=>true; (0,eval)('ccConfirm=window.ccConfirm');
  ok('Settings: the three link texts, each off', ['"Your PRN Team page is ready" text','Page link in the welcome text','60-day check-in opens their PRN Team page'].every(n=>sw.includes(n)) && (sw.match(/: off/g)||[]).length===9, sw);
  ok('Settings (step 8b): Gap Mentor suggestions, off', /Gap Mentor suggestions \(needs Gap Mentors on too\): off/.test(sw), sw);
  ok('Settings (step 8a): Gap Mentors, off', /Gap Mentors: "Ask a Gap Mentor" and their visits on the PRN Team page: off/.test(sw), sw);
  ok('Settings (step 7): the twice-yearly questions, off; the invite wording box shows the standard text', /Twice-yearly "What would make PRN better\?" questions: off/.test(sw)
    && document.getElementById('set_prn_feedback_msg').placeholder==="Hi {first_name}, it's Caring Companions. We'd love to hear from you: two quick questions about the PRN Team are on your page: {link} Thank you for standing in the gap with us.", sw);
  ok('Settings (step 6): Send the monthly PRN Team update, off; its wording box shows the standard text', /Send the monthly PRN Team update: off/.test(sw)
    && document.getElementById('set_prn_monthly_msg').placeholder==="Hi {first_name}, the Caring Companions PRN Team update for {month} is on your PRN Team page: {link} Thank you for standing in the gap with us.", sw);
  ok('Settings (step 5b): Open shifts and "I\'m Interested", off', /Open shifts and "I'm Interested" on the PRN Team page: off/.test(sw), sw);
  ok('...their wording boxes show the approved wording as the standard', document.getElementById('set_prn_page_ready_msg').placeholder.startsWith("Hi {first_name}, your Caring Companions PRN Team page is ready: {link} See the shifts")
    && /on your PRN Team page: \{link\}$/.test(document.getElementById('set_prn_reconfirm_page_msg').placeholder));
  await prnStep1Toggle('prn_page_ready_live'); prnStep5Fill();
  ok('...a link text on while the page is closed says it is waiting', /page is ready" text: ON \(waiting: the page isn't open yet, so nothing goes\)/.test(document.getElementById('prnStep5Switches').innerText), document.getElementById('prnStep5Switches').innerText);
  await prnStep1Toggle('prn_page_ready_live');
  document.getElementById('set_prn_page_ready_msg').value='Your page, {first_name}.'; await prnStep5Save();
  ok('...wording without {link} is refused', /needs \{link\}/.test(document.getElementById('prnStep5Status').innerText) && DATA.ops_settings.prn_page_ready_msg===undefined);
  document.getElementById('set_prn_page_ready_msg').value='Your page, {first_name}: {link}'; await prnStep5Save();
  ok('...her own wording is saved', DATA.ops_settings.prn_page_ready_msg==='Your page, {first_name}: {link}');
  document.getElementById('set_prn_page_ready_msg').value=''; await prnStep5Save();
  ok('...emptied, back to the standard wording', !('prn_page_ready_msg' in DATA.ops_settings));
  await prnStep1Toggle('prn_page_live'); ok('...it turns on by itself', DATA.ops_settings.prn_page_live===true && DATA.ops_settings.prn_welcome_live===undefined && DATA.ops_settings.prn_page_ready_live===false);
  return R;
}
"""
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1300, 'height': 1000})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co/rest' in r.request.url or 'supabase.co/auth' in r.request.url or '/functions/v1/prn-page' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(f'http://localhost:{PORT}/index.html?proof=prnpage'); pg.wait_for_timeout(1200); pg.evaluate('s=>(0,eval)(s)', H)
    for s_, n, d in pg.evaluate(T): R.append((s_, n, d))
    ok('no page errors (Hub)', not errs, errs)
    pg.evaluate("()=>{ location.hash='#prnteams'; PW.tab('teams'); }"); pg.wait_for_timeout(300); pg.screenshot(path=os.path.join(SHOTS, 'prn_page_hub_teams.png'))
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

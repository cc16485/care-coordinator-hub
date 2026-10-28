"""Send to family (Samantha 2026-10-28: "build it with your picks: Billing owner enters payment forms, no 3-digit code unless
AxisCare needs it, start with the four pieces"). Offline: files served from disk, every server answer faked, made-up people.
(1) The Hub card on a bare page (family-send.js): the history, the send sheet (pieces, Family Circle people with reasons, the
text preview), sending, a returned payment form with last 4 only, Show (a care coordinator) with its countdown, Entered.
(2) family-form.html at phone size: the code, then the payment form (card and bank), the circle check and GUIDE.
python3 tests/browser/family_send_look.py"""
import json, pathlib, mimetypes
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
R = []
def ok(n, c, d=''): R.append(['PASS' if c else 'FAIL', n, '' if c else str(d)[:500]])
def serve(route):
    u = route.request.url
    if not u.startswith('http://hub.test/'): return route.abort()
    f = ROOT / u[len('http://hub.test/'):].split('?')[0].split('#')[0]
    if not f.exists(): return route.fulfill(status=404, body='')
    route.fulfill(status=200, body=f.read_bytes(), content_type=mimetypes.guess_type(str(f))[0] or 'text/html')

PEOPLE = [{'id': 'linda', 'name': 'Linda Sample', 'relationship': 'Daughter', 'main': True, 'sms': True, 'email': True, 'phone': '(417) ***-0142', 'mail': 'l*****@example.com', 'why': ''},
          {'id': 'jan', 'name': 'Jan Miller', 'relationship': 'Neighbor', 'main': False, 'sms': False, 'email': False, 'phone': '', 'mail': '', 'why': 'No phone or email on file. Add one on Family & Contacts.'},
          {'id': 'mark', 'name': 'Mark Sample', 'relationship': 'Son', 'main': False, 'sms': True, 'email': False, 'phone': '(417) ***-0177', 'mail': '', 'why': ''}]
PAY = {'id': 'pay1', 'method': 'card', 'brand': 'Visa', 'last4': '1111', 'exp': '08/29', 'zip': '65804', 'holder_name': 'Linda Sample', 'invoice_email': 'linda@example.com', 'all_future': True,
       'signer_name': 'Linda Sample', 'signed_at': '2026-10-28T15:40:00Z', 'words': 'I authorize ... every Thursday.', 'reveals': 0, 'entered_at': None, 'erased_at': None, 'locked': True, 'erase_by': '2026-11-04T15:40:00Z'}
SENDS = [{'id': 's2', 'piece': 'guide', 'piece_name': 'GUIDE program', 'to_name': 'Linda Sample', 'sent_by_name': 'Krystal Test', 'created_at': '2026-10-27T15:00:00Z', 'expires_at': '2026-11-03T15:00:00Z', 'opened_at': None, 'done_at': None, 'revoked_at': None, 'live': True, 'result': None},
         {'id': 's1', 'piece': 'payment', 'piece_name': 'Payment authorization', 'to_name': 'Linda Sample', 'sent_by_name': 'Krystal Test', 'created_at': '2026-10-27T14:00:00Z', 'expires_at': '2026-11-03T14:00:00Z', 'opened_at': '2026-10-27T18:00:00Z', 'done_at': '2026-10-28T15:40:00Z', 'revoked_at': None, 'live': False, 'result': None, 'payment': PAY}]

HUB_JS = """() => {
  window.CALLS = []; window.CP = { ax: '290', r: { client_name: 'Dorothy Sample' } };
  window.ccToast = (m) => { window.TOAST = m }; window.ccConfirm = async () => true;
  window.callAction = async (fn, body) => { window.CALLS.push(body); const D = window.FAKE;
    if (body.action === 'list') return { status: 200, data: { ok: true, live: D.live, can_send: D.can_send, can_show: D.can_show, billing_owner: 'billie@mo-care.com', linked: true, people: D.people, sends: D.sends } };
    if (body.action === 'send') return { status: 200, data: { ok: true, outcome: 'sent', message: 'Payment authorization sent to Linda Sample.' } };
    if (body.action === 'show') return { status: 200, data: { ok: true, method: 'card', number: '4111111111111111', seconds: 300 } };
    if (body.action === 'entered') { D.sends[1].payment = Object.assign({}, D.sends[1].payment, { locked: false, erased_at: 'x', erased_why: 'entered', entered_at: '2026-10-28T16:00:00Z', entered_by: 'Billie Billing' }); return { status: 200, data: { ok: true } }; }
    return { status: 400, data: { error: 'unknown' } }; };
  document.body.innerHTML = '<div id="cp_agreement"><div class="card">Client Care Agreement</div></div><div id="cp_payer"><div class="card">Payer</div></div>';
}"""

with sync_playwright() as pw:
    b = pw.chromium.launch()
    # ── 1. the Hub card ──
    ctx = b.new_context(viewport={'width': 1100, 'height': 1000}); ctx.route('**/*', serve)
    q = ctx.new_page(); errs = []; q.on('pageerror', lambda e: errs.append(str(e)))
    q.goto('http://hub.test/tests/browser/blank.html' if (ROOT / 'tests/browser/blank.html').exists() else 'http://hub.test/family-form.html#none')
    q.evaluate("() => { document.open(); document.write('<!doctype html><html><head></head><body></body></html>'); document.close(); }")
    q.evaluate('(d) => { window.FAKE = d }', {'live': False, 'can_send': True, 'can_show': False, 'people': PEOPLE, 'sends': SENDS})
    q.evaluate(HUB_JS); q.add_script_tag(url='http://hub.test/family-send.js'); q.evaluate('() => FSEND.mount()'); q.wait_for_timeout(300)
    t = q.inner_text('#cp_fsend')
    ok('the card sits under the Client Care Agreement, with the history newest first', q.evaluate("() => document.getElementById('cp_agreement').nextElementSibling.id") == 'cp_fsend'
       and t.index('GUIDE program') < t.index('Payment authorization') and 'Send something' in t, t)
    ok('...switch off: says only owners can send, to try it', 'only owners can send' in t)
    ok('...a returned payment form shows the last 4 and "waiting to be entered", never the number', 'Visa ending 1111' in t and 'waiting to be entered' in t and '41111111' not in q.content())
    ok('...the Payer tab gets its own card with payment forms only', 'Payment forms' in q.inner_text('#cp_fsend_payer') and 'GUIDE' not in q.inner_text('#cp_fsend_payer') and 'Send a payment form' in q.inner_text('#cp_fsend_payer'))
    q.click('#cp_fsend button:has-text("Send something")'); q.wait_for_timeout(100)
    ok('Send something: the four pieces', q.locator('#cp_fsend input[name=fsPiece]').count() == 4)
    q.check('#cp_fsend input[name=fsPiece][value=agreement]'); q.wait_for_timeout(100)
    ok('...the whole agreement points to the agreement card (its own link and code)', 'Send to sign from home' in q.inner_text('#cp_fsend') and q.locator('#cp_fsend button:has-text("Go to the agreement card")').count() == 1)
    q.check('#cp_fsend input[name=fsPiece][value=payment]'); q.wait_for_timeout(100)
    t = q.inner_text('#cp_fsend')
    ok('...payment: the Family Circle people, main contact marked; Jan can\'t be picked and says why', 'Main contact' in t and q.is_disabled('#cp_fsend input[name=fsWho][value=jan]') and 'No phone or email on file' in t, t)
    q.check('#cp_fsend input[name=fsWho][value=linda]'); q.wait_for_timeout(100)
    t = q.inner_text('#cp_fsend')
    ok('...picking Linda: the text preview ("the payment form for Dorothy\'s care"), Send text, Send email and Both', "Hi Linda, this is Caring Companions. Here is the payment form for Dorothy's care" in t
       and q.locator('#cp_fsend [data-fs-send]').count() == 3, t)
    q.screenshot(path='tests/browser/family_send_sheet.png', full_page=True)
    q.click('#cp_fsend [data-fs-send=sms]'); q.wait_for_timeout(300)
    sent = [c for c in q.evaluate('CALLS') if c.get('action') == 'send']
    ok('Send text: the client, the piece, Linda, by text; the sheet closes', sent and sent[-1] == {'action': 'send', 'client_ax': '290', 'client_name': 'Dorothy Sample', 'piece': 'payment', 'contact_id': 'linda', 'channels': ['sms']}
       and q.evaluate('TOAST') == 'Payment authorization sent to Linda Sample.' and q.locator('#cp_fsend input[name=fsPiece]').count() == 0, sent)
    q.click('#cp_fsend [data-fs-row=s1]'); q.wait_for_timeout(100)
    ok('a staffing coordinator opens the returned form: masked, and told who can see the numbers; no Show button', '•••• •••• •••• 1111' in q.inner_text('#cp_fsend') and 'Only a care coordinator, billie@mo-care.com or an owner' in q.inner_text('#cp_fsend') and q.locator('#cp_fsend [data-fs-show]').count() == 0, q.inner_text('#cp_fsend'))
    q.evaluate("() => { FAKE.can_show = true; FSEND.reload() }"); q.wait_for_timeout(300)
    q.click('#cp_fsend [data-fs-show]'); q.wait_for_timeout(300)
    t = q.inner_text('#cp_fsend')
    ok('a care coordinator\'s Show: the number grouped in 4s, hidden again in 5 minutes', '4111 1111 1111 1111' in t and 'Hidden again in' in t, t)
    ok('...never written to the browser\'s storage', q.evaluate("() => JSON.stringify(Object.assign({}, localStorage, sessionStorage)).indexOf('4111') === -1"))
    q.screenshot(path='tests/browser/family_send_show.png', full_page=True)
    q.click('#cp_fsend [data-fs-entered]'); q.wait_for_timeout(400)
    t = q.inner_text('#cp_fsend')
    ok('Entered in AxisCare: the number is gone from the page, "entered by Billie Billing"', '4111' not in q.content() and 'entered in AxisCare' in t and 'Billie Billing' in t, t)
    ok('no page errors (Hub card)', not errs, errs)
    ctx.close()

    # ── 2. the family's page ──
    st = {'piece': 'payment', 'done': False, 'last': None}
    def door(route):
        body = json.loads(route.request.post_data or '{}'); st['last'] = body; a = body.get('action')
        if route.request.headers.get('apikey') or route.request.headers.get('authorization'): st['bad_header'] = True
        def ans(o, s=200): route.fulfill(status=s, content_type='application/json', body=json.dumps(o))
        if a == 'open': return ans({'ok': True, 'state': 'need_code', 'piece': st['piece'], 'piece_name': {'payment': 'Payment authorization', 'circle': 'Family Circle check', 'guide': 'GUIDE program'}[st['piece']],
                                    'to_name': 'Linda Sample', 'client_first': 'Dorothy', 'options': [{'via': 'sms', 'to': '(417) ***-0142'}, {'via': 'email', 'to': 'l*****@example.com'}]})
        if a == 'code': return ans({'ok': True, 'outcome': 'sent', 'to': '(417) ***-0142'})
        if a == 'verify': return ans({'ok': True, 's': 'S' * 43, 'data': {'words': 'I authorize Troutman Enterprises, LLC DBA Caring Companions In-Home Senior Care to charge my credit card or bank account for the invoice every Thursday.', 'card_fee': 'Cards have a 3% admin fee on each charge.',
                                      'people': [{'id': 'linda', 'name': 'Linda Sample', 'relationship': 'Daughter', 'phone': '4175550142', 'email': 'linda@example.com'}, {'id': 'mark', 'name': 'Mark Sample', 'relationship': 'Son', 'phone': '4175550177', 'email': ''}]}})
        if a == 'submit':
            st['sub'] = body
            if st['piece'] == 'payment' and body.get('card_number', '').startswith('4111 1111 1111 1112'): return ans({'error': 'Some answers need a fix.', 'problems': ["That card number doesn't look right. Check it and try again."]}, 422)
            if st['piece'] == 'payment': return ans({'ok': True, 'state': 'done', 'label': 'Visa ending 1111' if body.get('method') == 'card' else 'Checking account ending 6789', 'signed_at': '2026-10-28T15:40:00Z', 'words': 'I authorize ...'})
            if st['piece'] == 'circle': return ans({'ok': True, 'state': 'done', 'changes': 1})
            return ans({'ok': True, 'state': 'done', 'answer': body.get('answer')})
        ans({'error': 'x'}, 400)
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, device_scale_factor=2)
    ctx.route('**/*', serve); ctx.route('https://zngsgedlsxinbygwmxwn.supabase.co/functions/v1/family-form', door)
    p = ctx.new_page(); perr = []; p.on('pageerror', lambda e: perr.append(str(e)))
    TOK = 'T' * 43
    p.goto('http://hub.test/family-form.html#t=' + TOK); p.wait_for_timeout(500)
    ok('the family\'s page: "Hi Linda", what it is and for whom; the secret is taken out of the address bar', 'Hi Linda' in p.inner_text('main') and 'Payment authorization · for Dorothy' in p.inner_text('#sub') and TOK not in p.url, p.url)
    p.click('text=Text me a code'); p.wait_for_timeout(200); p.fill('#code', '123456'); p.click('#go'); p.wait_for_timeout(300)
    ok('...the code opens the payment form: card first, the 3% fee, the Thursday words; no 3-digit code field', 'Payment for Dorothy\'s care' in p.inner_text('main') and '3% admin fee' in p.inner_text('main') and 'every Thursday' in p.inner_text('main')
       and "We don't need the 3-digit code" in p.inner_text('main') and p.locator('input[autocomplete=cc-csc]').count() == 0)
    p.fill('#holder', 'Linda Sample'); p.fill('#num', '4111 1111 1111 1112'); p.fill('#exp', '0829'); p.fill('#zip', '65804'); p.check('#future'); p.check('#agree'); p.fill('#sig', 'Linda Sample')
    ok('...the expiration fills in its slash', p.input_value('#exp') == '08/29')
    p.click('#send'); p.wait_for_timeout(300)
    ok('...a wrong card number says what to fix', "card number doesn't look right" in p.inner_text('#err'))
    p.screenshot(path='tests/browser/family_form_payment.png', full_page=True)
    p.fill('#num', '4111 1111 1111 1111'); p.click('#send'); p.wait_for_timeout(300)
    s = st['sub']
    ok('Sign and send: card, number, mm/yy, ZIP, future, agree, the typed name, with the session', s.get('method') == 'card' and s.get('card_number') == '4111 1111 1111 1111' and s.get('exp') == '08/29' and s.get('all_future') is True and s.get('agree') is True and s.get('signer_name') == 'Linda Sample' and s.get('s') == 'S' * 43 and s.get('t') == TOK, s)
    ok('...thank-you shows the last 4 only', 'Visa ending 1111' in p.inner_text('main') and '4111 1111' not in p.inner_text('main'))
    ok('...the door is called with no keys (its CORS takes content-type only)', not st.get('bad_header'))
    # bank
    p.goto('http://hub.test/family-form.html#t=' + TOK); p.wait_for_timeout(400); p.click('text=Text me a code'); p.wait_for_timeout(100); p.fill('#code', '123456'); p.click('#go'); p.wait_for_timeout(300)
    p.click('#mBank'); p.fill('#bholder', 'Linda Sample'); p.select_option('#btype', 'checking'); p.fill('#routing', '101000019'); p.fill('#acct', '000123456789'); p.check('#future'); p.check('#agree'); p.fill('#sig', 'Linda Sample'); p.click('#send'); p.wait_for_timeout(300)
    s = st['sub']
    ok('a bank account: checking, routing, account (no card fields sent)', s.get('method') == 'bank' and s.get('routing') == '101000019' and s.get('account') == '000123456789' and 'card_number' not in s and 'Checking account ending 6789' in p.inner_text('main'), s)
    # circle
    st['piece'] = 'circle'; p.goto('http://hub.test/family-form.html#t=' + TOK); p.wait_for_timeout(400); p.click('text=Text me a code'); p.wait_for_timeout(100); p.fill('#code', '123456'); p.click('#go'); p.wait_for_timeout(300)
    ok('the circle check lists the people with Looks right / Needs a change / Remove', 'Who should we keep in touch with?' in p.inner_text('main') and p.locator('.person[data-id]').count() == 2)
    p.locator('.person[data-id=mark] input[value=change]').check(); p.wait_for_timeout(100); p.locator('.person[data-id=mark] .em').fill('mark@example.com')
    p.locator('.person.add .nm').fill('Jan Miller'); p.locator('.person.add .rl').fill('Neighbor')
    p.screenshot(path='tests/browser/family_form_circle.png', full_page=True)
    p.click('#send'); p.wait_for_timeout(300)
    s = st['sub']
    ok('...sends Mark\'s change, Linda kept, and Jan added', any(x['id'] == 'mark' and x['what'] == 'change' and x['email'] == 'mark@example.com' for x in s['people']) and any(x['id'] == 'linda' and x['what'] == 'keep' for x in s['people'])
       and s['add'] == [{'name': 'Jan Miller', 'relationship': 'Neighbor', 'phone': '', 'email': ''}] and "update our records" in p.inner_text('main'), s)
    # guide
    st['piece'] = 'guide'; p.goto('http://hub.test/family-form.html#t=' + TOK); p.wait_for_timeout(400); p.click('text=Email me a code'); p.wait_for_timeout(100); p.fill('#code', '123456'); p.click('#go'); p.wait_for_timeout(300)
    t = p.inner_text('main')
    ok('GUIDE: the website\'s wording (20 four-hour visits, approved provider), who it is for, a link to the full page', 'up to 20 four-hour respite visits a year' in t and 'approved GUIDE respite provider' in t and 'Medicare Advantage' in t and p.locator('a[href="https://mo-care.com/medicare-guide"]').count() == 1)
    p.fill('#best', 'after 3pm'); p.click('#yes'); p.wait_for_timeout(300)
    ok('...Yes, call me about it: the answer and the best time', st['sub'].get('answer') == 'call_me' and st['sub'].get('best_time') == 'after 3pm' and "We'll call you" in p.inner_text('main'))
    ok('no long dashes on the family\'s page', '—' not in (ROOT / 'family-form.html').read_text() and '–' not in (ROOT / 'family-form.html').read_text())
    ok('no page errors (family page)', not perr, perr)
    b.close()

for r in R: print(r[0], r[1], r[2])
print(f"{sum(1 for r in R if r[0] == 'PASS')}/{len(R)} passed")
import sys; sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

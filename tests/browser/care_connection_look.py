"""Care & Connection (Samantha 2026-11-14): the check-in page, the private page and the owners' inbox in the Hub, against a
pretend server (nothing real is called, nothing is saved). Proves: codes travel in the request body and never in a web
address; the pages show first names only; coordinators get no inbox, no pill and no count; owners get the inbox.
(PORT=<static server port> python3 tests/browser/care_connection_look.py)"""
import os, json
from playwright.sync_api import sync_playwright
H = open('/Users/samantha/Claude/Projects/cc-hub-live/.claude/g1a_harness.js').read()
PORT = os.environ.get('PORT', '8811')
BASE = f'http://localhost:{PORT}/'
CODE = '00000000-0000-4000-8000-000000000001.1900000000.' + 'A' * 43
R = []
def ok(n, c, d=''): R.append(['PASS' if c else 'FAIL', n, '' if c else str(d)[:400]])

with sync_playwright() as pw:
    b = pw.chromium.launch()
    # ------------------------------------------------------------ the check-in page, real mode
    pg = b.new_page(viewport={'width': 390, 'height': 844}); calls = []; errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    def checkin(route):
        req = route.request; body = json.loads(req.post_data or '{}'); calls.append((req.url, body))
        if body.get('action') == 'open':
            return route.fulfill(json={'state': 'ok', 'audience': 'family', 'kind': 'day_30', 'first': 'Linda', 'client': 'Dorothy', 'caregiver': 'Tanya', 'caregivers': ['Tanya', 'Marcus'], 'phone_tail': '42'})
        return route.fulfill(json={'ok': True, 'follow': 'card'})
    pg.route('**/functions/v1/checkin-link', checkin)
    pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    pg.goto(BASE + 'checkin.html#k=' + CODE); pg.wait_for_timeout(700)
    ok('check-in: opens with the first name from the server', 'Hi Linda' in pg.inner_text('header') and 'Dorothy' in pg.inner_text('main'))
    ok('check-in: the code went in the request body', calls and calls[0][1].get('code') == CODE and calls[0][1].get('action') == 'open', calls)
    ok('check-in: the code is never in a web address it requested', all(CODE not in u for u, _ in calls) and CODE.split('.')[0] not in ''.join(u for u, _ in calls))
    pg.click('.face[data-v=improve]'); pg.wait_for_timeout(300)
    pg.click('[data-f=what] .chip >> nth=0'); pg.click('[data-f=call] .chip >> nth=0'); pg.click('[data-f=when] .chip >> nth=1')
    pg.click('#send'); pg.wait_for_timeout(500)
    ans = [c for c in calls if c[1].get('action') == 'answer']
    ok('check-in: the answer is sent with the code', ans and ans[0][1]['code'] == CODE and ans[0][1]['answers']['mood'] == 'improve' and ans[0][1]['answers']['when'] == 'afternoon', ans)
    ok('check-in: thank-you says when we will call', 'afternoon' in pg.inner_text('main'), pg.inner_text('main')[:200])
    pv = pg.get_attribute('a.private', 'href') or ''
    ok('check-in: "Message the owners" carries the code after #', pv.startswith('private.html#k=') and CODE in pv, pv)
    ok('check-in: no page errors', not errs, errs)
    # the client's own check-in (2026-11-14): "your care", never their own name in third person
    def selfck(route):
        body = json.loads(route.request.post_data or '{}')
        if body.get('action') == 'open': return route.fulfill(json={'state': 'ok', 'audience': 'family', 'kind': 'first_visit', 'self': True, 'first': 'Dorothy', 'client': 'Dorothy', 'caregiver': 'Tanya', 'caregivers': ['Tanya'], 'phone_tail': '90'})
        return route.fulfill(json={'ok': True, 'follow': 'kind_words'})
    pg.unroute('**/functions/v1/checkin-link'); pg.route('**/functions/v1/checkin-link', selfck)
    pg.goto('about:blank'); pg.goto(BASE + 'checkin.html#k=' + CODE); pg.wait_for_timeout(700)
    mt = pg.inner_text('main') + pg.inner_text('header')
    ok('check-in (the client): speaks to them about "your" care', 'You had your first visit with Tanya' in mt and 'How are things going with your care?' in mt, mt[:300])
    ok('check-in (the client): never "Dorothy\'s care" to Dorothy', "Dorothy's" not in mt and 'with Dorothy' not in mt, mt[:300])
    # "Stop these check-ins" from the email link (2026-11-14)
    stops = []
    def stopck(route):
        body = json.loads(route.request.post_data or '{}'); stops.append(body)
        if body.get('action') == 'open': return route.fulfill(json={'state': 'expired', 'audience': 'family', 'kind': 'quarterly', 'first': 'Linda', 'client': 'Dorothy', 'caregivers': [], 'phone_tail': '42'})
        return route.fulfill(json={'ok': True, 'stopped': True})
    pg.unroute('**/functions/v1/checkin-link'); pg.route('**/functions/v1/checkin-link', stopck)
    pg.goto('about:blank'); pg.goto(BASE + 'checkin.html#k=' + CODE + '&stop=1'); pg.wait_for_timeout(700)
    mt = pg.inner_text('main')
    ok('stop: the email link opens "Stop these check-ins?" even after the link expired, and says care messages are not affected', 'Stop these check-ins?' in mt and 'about Dorothy' in mt and 'not affected' in mt, mt[:300])
    pg.click('#stopGo'); pg.wait_for_timeout(500)
    ok('stop: pressing it sends the stop with the code in the body, and confirms', any(b.get('action') == 'stop' and b.get('code') == CODE for b in stops) and 'You will not get these check-ins again' in pg.inner_text('main'), stops)
    pg.goto('about:blank'); pg.unroute('**/functions/v1/checkin-link'); pg.route('**/functions/v1/checkin-link', checkin)
    pg.goto(BASE + 'checkin.html#k=' + CODE); pg.wait_for_timeout(700)
    ok('stop: every family check-in page has a small "Stop these check-ins" link', pg.is_visible('#stopLink'))
    pg.goto(BASE + 'checkin.html'); pg.wait_for_timeout(300)
    ok('check-in: without a code it asks them to open the link again', 'not complete' in pg.inner_text('main'))
    pg.close()

    # ------------------------------------------------------------ the private page, real mode
    pg = b.new_page(viewport={'width': 390, 'height': 844}); calls = []; errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    def owner(route):
        req = route.request; body = json.loads(req.post_data or '{}'); calls.append((req.url, body, req.headers.get('authorization')))
        a = body.get('action')
        if a == 'who': return route.fulfill(json={'first': 'Linda', 'initial': 'S.', 'role': 'family', 'client_first': 'Dorothy', 'has_phone': True})
        if a == 'send': return route.fulfill(json={'ok': True, 'reply_link': 'https://cc.mo-care.com/private.html#r=' + CODE})
        if a == 'thread_open':
            return route.fulfill(json={'first': 'Linda', 'session': 's', 'thread': [{'from': 'you', 'at': '2026-11-12T15:00:00Z', 'body': 'hello'}, {'from': 'Samantha', 'at': '2026-11-13T15:00:00Z', 'body': 'Thank you'}]}) if body.get('pin') == '2580' else route.fulfill(status=401, json={'error': 'That PIN is not right. 4 tries left.'})
        if a == 'pin_reset': return route.fulfill(json={'ok': True}) if body.get('code') == '482913' else route.fulfill(status=401, json={'error': 'That reset code is not right or has run out.'})
        return route.fulfill(status=400, json={'error': 'bad request'})
    pg.route('**/functions/v1/owner-inbox', owner)
    pg.route('**/fonts.googleapis.com/**', lambda r: r.abort())
    pg.goto(BASE + 'private.html#k=' + CODE); pg.wait_for_timeout(600)
    ok('private: knows "Linda S." from the code', 'Linda S.' in pg.inner_text('main') and "Dorothy's family" in pg.inner_text('main'), pg.inner_text('main')[:300])
    pg.click('[data-f=kind] .opt >> nth=0'); pg.fill('#body', 'A private worry'); pg.click('[data-f=reply] .opt >> nth=1')
    pg.fill('#pin', '2580'); pg.fill('#pin2', '2580'); pg.click('#send'); pg.wait_for_timeout(500)
    sends = [c for c in calls if c[1].get('action') == 'send']
    ok('private: sends with the code, the PIN and no name typed', sends and sends[0][1].get('code') == CODE and sends[0][1].get('pin') == '2580' and 'name' not in sends[0][1], sends)
    ok('private: no sign-in token is sent from the public page', all(not c[2] for c in calls))
    ok('private: the thank-you gives their conversation link', 'Your private conversation' in pg.inner_text('main'))
    ok('private: codes never in a web address', all(CODE not in c[0] for c in calls))
    pg.goto(BASE + 'private.html#r=' + CODE); pg.reload(); pg.wait_for_timeout(500)
    ok('reply: asks for their PIN first and shows nothing else', 'Your PIN' in pg.inner_text('main') and 'Thank you' not in pg.inner_text('main'))
    pg.fill('#pinin', '1111'); pg.click('#ok'); pg.wait_for_timeout(300)
    ok('reply: a wrong PIN says tries left', '4 tries left' in pg.inner_text('main'))
    pg.fill('#pinin', '2580'); pg.click('#ok'); pg.wait_for_timeout(400)
    ok('reply: the right PIN shows the conversation and the 15-minute close', 'Thank you' in pg.inner_text('main') and 'closes in' in pg.inner_text('main'))
    pg.goto(BASE + 'private.html#r=' + CODE); pg.reload(); pg.wait_for_timeout(400)
    pg.check('#showpin'); ok('reply: "Show my PIN" shows what they typed', pg.get_attribute('#pinin', 'type') == 'text')
    pg.click('#forgot'); pg.wait_for_timeout(200)
    ok('forgot PIN: explains to call for a reset code', 'reset code' in pg.inner_text('body').lower() and 'Thank you' not in pg.inner_text('main'))
    pg.fill('#rcode', '111111'); pg.fill('#np1', '7395'); pg.fill('#np2', '7395'); pg.click('#setpin'); pg.wait_for_timeout(300)
    ok('forgot PIN: a wrong reset code is refused', 'not right' in pg.inner_text('main'))
    pg.fill('#rcode', '482 913'); pg.click('#setpin'); pg.wait_for_timeout(300)
    rs = [c for c in calls if c[1].get('action') == 'pin_reset']
    ok('forgot PIN: the right code saves the new PIN and returns to the PIN screen', 'new PIN is saved' in pg.inner_text('main') and rs[-1][1].get('r') == CODE and rs[-1][1].get('pin') == '7395', rs[-1:])
    pg.goto(BASE + 'private.html'); pg.reload(); pg.wait_for_timeout(400)
    ok('standalone: asks for name and phone or email', 'Who is this from?' in pg.inner_text('main'))
    pg.click('[data-f=kind] .opt >> nth=1'); pg.fill('#body', 'An idea'); pg.click('[data-f=reply] .opt >> nth=2'); pg.click('#send'); pg.wait_for_timeout(200)
    ok('standalone: refuses without a name', 'Add your name' in pg.inner_text('main'))
    ok('private: no page errors', not errs, errs)
    pg.close()

    # ------------------------------------------------------------ the Hub
    def hub(role_email, roles):
        pg = b.new_page(); errs = []; hits = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        def oi(route):
            req = route.request; body = json.loads(req.post_data or '{}'); hits.append(body)
            a = body.get('action')
            if a == 'list': return route.fulfill(json={'messages': [{'id': 'm1', 'created_at': '2026-11-14T15:00:00Z', 'role': 'caregiver', 'kind': 'concern', 'reply_wanted': 'private', 'sender_name': 'Rachel Moore', 'sender_phone': '4175550117', 'status': 'new', 'body': 'x'}]})
            if a == 'get': return route.fulfill(json={'message': {'id': 'm1', 'created_at': '2026-11-14T15:00:00Z', 'role': 'caregiver', 'kind': 'concern', 'reply_wanted': 'private', 'sender_name': 'Rachel Moore', 'sender_phone': '4175550117', 'status': 'seen', 'body': 'Fewer hours lately', 'has_pin': True}, 'notes': [], 'trail': [{'at': '2026-11-14T15:00:00Z', 'by_who': 'sender', 'action': 'received'}]})
            if a == 'send': return route.fulfill(json={'ok': True})
            if a == 'reply': return route.fulfill(json={'ok': True, 'told': 'you', 'phone': '4175550117', 'sms': 'Hi Rachel, you have a private message waiting from Caring Companions. Open it with your PIN: https://cc.mo-care.com/private.html#r=' + CODE, 'say': 'Text this from your own phone (not the office line), or call them.'})
            if a == 'reset_code': return route.fulfill(json={'code': '482913', 'hours': 24, 'say': 'Call them from your own phone and read this code to them.'})
            return route.fulfill(json={'ok': True})
        pg.route('**/functions/v1/owner-inbox', oi)
        def chk(route):
            hits.append({'action': 'checkins', **json.loads(route.request.post_data or '{}')})
            body = json.loads(route.request.post_data or '{}')
            if body.get('followup'): return route.fulfill(json={'ok': True})
            L = lambda i, **x: {'id': '00000000-0000-4000-8000-00000000000' + str(i), 'audience': 'family', 'kind': 'day_30', 'label': 'Day 30', 'client_ax': '10' + str(i), 'client_first': 'Dorothy', 'first': 'Linda', 'last': '', 'ref': '',
                                 'sent_at': '2026-11-14T15:00:00Z', 'channel': 'sms', 'opened_at': None, 'answered_at': None, 'mood': '', 'extra': None, 'what': [], 'note': '', 'call': False, 'when': '', 'thanked': False,
                                 'follow': '', 'state': 'waiting', 'card_id': '', 'card_open': False, 'confirm': False, 'followups': [], **x}
            return route.fulfill(json={'ok': True, 'people': [], 'family_off': [], 'links': [
                L(1, answered_at='2026-11-14T16:00:00Z', mood='improve', what=['The schedule'], call=True, when='afternoon', follow='card', state='needs', note='Times keep changing'),
                L(2, answered_at='2026-11-14T16:00:00Z', mood='great', thanked=True, follow='kind_words', state='happy', first='Kay', client_first='Opal'),
                L(3, state='no_response', first='Ned', client_first='Vern'),
                L(4, answered_at='2026-11-13T16:00:00Z', mood='improve', follow='card', card_id='ops_checkin_4', state='called', confirm=True, first='Ida', client_first='Iris'),
                L(5, answered_at='2026-11-14T16:00:00Z', mood='improve', follow='card', state='needs', first='Walt', client_first='Walt', self=True)]})
        pg.route('**/functions/v1/checkins', chk)
        pg.route('**/*', lambda r: r.fallback() if ('owner-inbox' in r.request.url or 'functions/v1/checkins' in r.request.url) else r.abort() if 'supabase.co' in r.request.url else r.continue_())
        pg.goto(BASE + 'index.html?proof=oix'); pg.wait_for_timeout(1200)
        pg.evaluate('()=>{ window.__realFetch = window.fetch; }')
        pg.evaluate('s=>(0,eval)(s)', H)
        # the offline harness answers every fetch; let the owner-inbox calls reach this test's pretend server
        pg.evaluate("()=>{ const hf = window.fetch; window.fetch = (u, o) => (String(u).includes('owner-inbox') || String(u).includes('functions/v1/checkins')) ? window.__realFetch(u, o) : hf(u, o); }")
        pg.evaluate("""([e,roles])=>{ document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
          (0,eval)("ME={ email:'"+e+"', name:'Test' };"); CC_ROLES=roles; CC_ROLES_CHECKED=true;
          CC_ROLE_BY_EMAIL['samantha@mo-care.com']=['owner_admin']; CC_ROLE_BY_EMAIL['krystal@mo-care.com']=['care_coordinator']; CC_ROLE_BY_EMAIL[e]=roles; OIX.pillSync(); }""", [role_email, roles])
        pg.wait_for_timeout(400)
        return pg, errs, hits
    pg, errs, hits = hub('krystal@mo-care.com', ['care_coordinator'])
    ok('Hub coordinator: no Private messages pill', pg.eval_on_selector('.fpill[data-tab="ownersinbox"]', 'e=>getComputedStyle(e).display') == 'none')
    DLG = {'text': ''}
    pg.on('dialog', lambda d: d.accept(DLG['text']) if d.type == 'prompt' else d.accept())
    pg.evaluate("switchTab('ownersinbox')"); pg.wait_for_timeout(300)
    ok('Hub coordinator: the inbox will not open', pg.evaluate('activeTab') != 'ownersinbox')
    ok('Hub coordinator: the page never asked the server for the list', not any(h.get('action') in ('list', 'get') for h in hits), hits)
    ok('Hub coordinator: the 🔒 Owners button is there', pg.is_visible('#ownersMsgBtn'))
    pg.click('#ownersMsgBtn'); pg.select_option('#oixKind', 'sensitive'); pg.fill('#oixBody', 'About a coworker'); pg.select_option('#oixReply', 'none'); pg.click('#oixSend'); pg.wait_for_timeout(400)
    sent = [h for h in hits if h.get('action') == 'send']
    ok('Hub coordinator: can send, marked as from the Hub', sent and sent[0].get('hub') is True, sent)
    pg.evaluate("OIX.close()")
    # 2026-11-14 (her "yes build it and show me"): family and client answers on Clients > Check-ins, caregivers only on Caregivers
    pg.evaluate("switchTab('clientcheckins')"); pg.wait_for_timeout(900)
    W = '#clientCheckinsWrap'; t = pg.inner_text(W)
    ok('Clients > Check-ins: the pill sits under Clients, next to Family Circles', pg.evaluate("CC_GROUPS.clients.includes('clientcheckins') && !!document.querySelector('#fsub-clients .fpill[data-tab=clientcheckins]')"))
    ok('Clients > Check-ins: the client\'s own answer says "(the client)", not "Walt\'s family"', 'Walt (the client)' in t and "Walt's family" not in t, t[:600])
    ok('Clients > Check-ins: family answers are here', 'Linda' in t and "Dorothy's family" in t, t[:600])
    ok('Clients > Check-ins: who answered, who is happy, who needs attention, who asked for a call, who did not answer', pg.evaluate("[...document.querySelectorAll('#clientCheckinsWrap .kpi')].map(k=>k.innerText.replace(/\\s+/g,' ').trim()).join('|')") == 'Needs you 3|Asked for a call 1|Answered 4|Happy 1|No answer 1', pg.evaluate("[...document.querySelectorAll('#clientCheckinsWrap .kpi')].map(k=>k.innerText).join('|')"))
    ok('Clients > Check-ins: the concern shows what they said and when to call', 'Something needs to change' in t and 'The schedule' in t and 'Asked for a call in the afternoon' in t)
    ok('Clients > Check-ins: praise shows it went to Kind Words', 'Thanks passed to Kind Words' in t)
    ok('Clients > Check-ins: a closed card nobody confirmed asks to confirm', 'nobody confirmed with them' in t)
    ok('Clients > Check-ins: its red number counts the families who need you (3)', pg.inner_text('#cchkBadge').strip() == '3' and pg.is_visible('#cchkBadge'), pg.inner_text('#cchkBadge'))
    pg.evaluate("switchTab('cgcheckins')"); pg.wait_for_timeout(500)
    ct = pg.inner_text('#checkinsWrap')
    ok('Caregivers > Check-ins: caregivers only (no family rows, no Families button)', 'Linda' not in ct and "Dorothy's family" not in ct and 'Families' not in ct and 'Clients > Check-ins' in ct, ct[:500])
    ok('Caregivers > Check-ins: its red number no longer counts families', not pg.is_visible('#chkBadge'), pg.inner_text('#chkBadge'))
    pg.evaluate("CHK.setView('families')"); pg.wait_for_timeout(200)
    ok('an old "Families" view falls back to Needs you', 'Linda' not in pg.inner_text('#checkinsWrap'))
    pg.evaluate("switchTab('clientcheckins')"); pg.wait_for_timeout(400)
    DLG['text'] = 'ok'
    pg.click("#clientCheckinsWrap >> text=Resolved… >> nth=0"); pg.wait_for_timeout(300)
    ok('Clients > Check-ins: Resolved without how they know is refused', 'how you know it got better' in pg.inner_text(W) and not any(h.get('followup') for h in hits))
    DLG['text'] = 'Called Linda 11/20, schedule is fixed now'
    pg.click("#clientCheckinsWrap >> text=Resolved… >> nth=0"); pg.wait_for_timeout(400)
    fu = [h for h in hits if h.get('followup')]
    ok('Clients > Check-ins: Resolved with a note is saved', fu and fu[0]['followup']['state'] == 'resolved' and 'schedule' in fu[0]['followup']['note'], fu)
    ok('Clients > Check-ins: no private-message words or counts anywhere on the tab', 'private' not in pg.inner_text(W).lower())
    pg.set_viewport_size({'width': 1300, 'height': 900}); pg.wait_for_timeout(200)
    ok('Clients > Check-ins: the legend explains the dots', 'needs attention' in pg.inner_text(W) and 'one-minute check-in page' in pg.inner_text(W))
    ok_btn = pg.query_selector("button:text-is('OK')")
    if ok_btn and ok_btn.is_visible(): ok_btn.click(); pg.wait_for_timeout(200)   # the refusal shown earlier to the coordinator
    pg.evaluate("window.scrollTo(0,0)"); pg.screenshot(path=os.environ.get('SHOT2', '/tmp/checkins_families.png'))
    ok('Hub coordinator: no page errors', not errs, errs)
    pg.close()
    pg, errs, hits = hub('samantha@mo-care.com', ['owner_admin'])
    ok('Hub owner: Private messages pill shows with a count', pg.eval_on_selector('.fpill[data-tab="ownersinbox"]', 'e=>getComputedStyle(e).display') != 'none' and pg.inner_text('#oixBadge') == '1')
    pg.evaluate("switchTab('ownersinbox')"); pg.wait_for_timeout(500)
    ok('Hub owner: the inbox lists the message', 'Rachel Moore' in pg.inner_text('#oixWrap'), [pg.evaluate('activeTab'), pg.inner_text('#oixWrap')[:300], pg.evaluate('JSON.stringify(OIX._st)')[:300]])
    if pg.query_selector('.oix-row'): pg.click('.oix-row'); pg.wait_for_timeout(400)
    t = pg.inner_text('#oixWrap')
    ok('Hub owner: opening shows the words, reply, note, share and the record', all(x in t for x in ['Fewer hours lately', 'Reply privately', 'Save as private note', 'Share note', 'Record:', 'make a reset code', 'conversation link']), t[:500])
    pg.fill('#oixText', 'Thank you Rachel, I am looking into your hours.'); pg.click('text=Reply privately'); pg.wait_for_timeout(500)
    href = pg.get_attribute('#oixSend a.addlead', 'href') or ''
    ok('Hub owner: with no email, a "Text from my phone" button opens the owner\'s own messages app', href.startswith('sms:+14175550117') and '%23r%3D' in href, href)
    ok('Hub owner: the words to send have none of the reply', 'looking into your hours' not in pg.inner_text('#oixSend'))
    pg.on('dialog', lambda d: d.accept())
    pg.click('text=Forgot PIN: make a reset code'); pg.wait_for_timeout(400)
    ok('Hub owner: a reset code shows big, to read by phone', '482 913' in pg.inner_text('#oixSend'), pg.inner_text('#oixSend')[:200])
    pg.set_viewport_size({'width': 1300, 'height': 760}); pg.screenshot(path=os.environ.get('SHOT', '/tmp/owners_inbox.png'))
    ok('Hub owner: no page errors', not errs, errs)
    pg.close(); b.close()

for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

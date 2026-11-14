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
            if a == 'get': return route.fulfill(json={'message': {'id': 'm1', 'created_at': '2026-11-14T15:00:00Z', 'role': 'caregiver', 'kind': 'concern', 'reply_wanted': 'private', 'sender_name': 'Rachel Moore', 'sender_phone': '4175550117', 'status': 'seen', 'body': 'Fewer hours lately'}, 'notes': [], 'trail': [{'at': '2026-11-14T15:00:00Z', 'by_who': 'sender', 'action': 'received'}]})
            if a == 'send': return route.fulfill(json={'ok': True})
            return route.fulfill(json={'ok': True})
        pg.route('**/functions/v1/owner-inbox', oi)
        pg.route('**/*', lambda r: r.fallback() if 'owner-inbox' in r.request.url else r.abort() if 'supabase.co' in r.request.url else r.continue_())
        pg.goto(BASE + 'index.html?proof=oix'); pg.wait_for_timeout(1200)
        pg.evaluate('()=>{ window.__realFetch = window.fetch; }')
        pg.evaluate('s=>(0,eval)(s)', H)
        # the offline harness answers every fetch; let the owner-inbox calls reach this test's pretend server
        pg.evaluate("()=>{ const hf = window.fetch; window.fetch = (u, o) => String(u).includes('owner-inbox') ? window.__realFetch(u, o) : hf(u, o); }")
        pg.evaluate("""([e,roles])=>{ document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
          (0,eval)("ME={ email:'"+e+"', name:'Test' };"); CC_ROLES=roles; CC_ROLES_CHECKED=true;
          CC_ROLE_BY_EMAIL['samantha@mo-care.com']=['owner_admin']; CC_ROLE_BY_EMAIL['krystal@mo-care.com']=['care_coordinator']; CC_ROLE_BY_EMAIL[e]=roles; OIX.pillSync(); }""", [role_email, roles])
        pg.wait_for_timeout(400)
        return pg, errs, hits
    pg, errs, hits = hub('krystal@mo-care.com', ['care_coordinator'])
    ok('Hub coordinator: no Private messages pill', pg.eval_on_selector('.fpill[data-tab="ownersinbox"]', 'e=>getComputedStyle(e).display') == 'none')
    pg.on('dialog', lambda d: d.accept())
    pg.evaluate("switchTab('ownersinbox')"); pg.wait_for_timeout(300)
    ok('Hub coordinator: the inbox will not open', pg.evaluate('activeTab') != 'ownersinbox')
    ok('Hub coordinator: the page never asked the server for the list', not any(h.get('action') in ('list', 'get') for h in hits), hits)
    ok('Hub coordinator: the 🔒 Owners button is there', pg.is_visible('#ownersMsgBtn'))
    pg.click('#ownersMsgBtn'); pg.select_option('#oixKind', 'sensitive'); pg.fill('#oixBody', 'About a coworker'); pg.select_option('#oixReply', 'none'); pg.click('#oixSend'); pg.wait_for_timeout(400)
    sent = [h for h in hits if h.get('action') == 'send']
    ok('Hub coordinator: can send, marked as from the Hub', sent and sent[0].get('hub') is True, sent)
    ok('Hub coordinator: no page errors', not errs, errs)
    pg.close()
    pg, errs, hits = hub('samantha@mo-care.com', ['owner_admin'])
    ok('Hub owner: Private messages pill shows with a count', pg.eval_on_selector('.fpill[data-tab="ownersinbox"]', 'e=>getComputedStyle(e).display') != 'none' and pg.inner_text('#oixBadge') == '1')
    pg.evaluate("switchTab('ownersinbox')"); pg.wait_for_timeout(500)
    ok('Hub owner: the inbox lists the message', 'Rachel Moore' in pg.inner_text('#oixWrap'), [pg.evaluate('activeTab'), pg.inner_text('#oixWrap')[:300], pg.evaluate('JSON.stringify(OIX._st)')[:300]])
    if pg.query_selector('.oix-row'): pg.click('.oix-row'); pg.wait_for_timeout(400)
    t = pg.inner_text('#oixWrap')
    ok('Hub owner: opening shows the words, reply, note, share and the record', all(x in t for x in ['Fewer hours lately', 'Reply privately', 'Save as private note', 'Share note', 'Record:']), t[:500])
    pg.set_viewport_size({'width': 1300, 'height': 700}); pg.screenshot(path=os.environ.get('SHOT', '/tmp/owners_inbox.png'))
    ok('Hub owner: no page errors', not errs, errs)
    pg.close(); b.close()

for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

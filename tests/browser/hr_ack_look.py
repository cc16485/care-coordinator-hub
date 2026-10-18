"""Write-up acknowledgment (HR Agent build step 8, Samantha 2026-10-18: "build step 8"). Offline, made-up records, every
server answer faked, nothing saved or sent. (1) notice.html, the caregiver's signing page, at phone size. (2) The write-up
window's "Getting it signed" panel on Zach's HR phone desk: text a link, sign in person, record a refusal, open the PDF.
(python3 -m http.server 8793 in the repo, then python3 tests/browser/hr_ack_look.py)"""
import json
from playwright.sync_api import sync_playwright
BASE = 'http://localhost:8793'
NOTICE = 'CARING COMPANIONS: CORRECTIVE ACTION NOTICE\nEmployee: Jordan Test\nAction level: Verbal Warning\n\nTHE FACTS:\n  • October 1, 2026: called in 2 hours before the shift'
R = []
def ok(n, c, d=''): R.append(['PASS' if c else 'FAIL', n, '' if c else str(d)[:400]])

with sync_playwright() as pw:
    import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from clock_pin import pin
    b = pw.chromium.launch()
    # ── 1. the caregiver's page ──
    calls = []; state = {'status': 'waiting', 'practice': True}
    def fn(route):
        body = json.loads(route.request.post_data or '{}'); calls.append(body)
        if body.get('action') == 'view':
            return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'first': 'Jordan', 'level': 'Verbal Warning', 'notice': NOTICE, 'notice_hash': 'h1',
                'receipt': 'I received this notice and had the chance to read it. Signing only shows that I received it. It does not mean I agree with it.', 'status': state['status'], 'practice': state['practice'], 'office_phone': '(417) 234-8494'}))
        if body.get('action') == 'sign':
            if body.get('typed_name') == 'Pat Doe': return route.fulfill(status=400, content_type='application/json', body=json.dumps({'error': 'Type your full first and last name, as on your employee record.'}))
            return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'copy_url': 'https://example.test/copy.pdf', 'practice': state['practice']}))
        route.fulfill(status=404, body='{}')
    p = b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    errs = []; p.on('pageerror', lambda e: errs.append(str(e)[:200]))
    p.route('**/functions/v1/hr-ack', fn)
    p.route('**/*', lambda r: r.fallback() if 'functions/v1/hr-ack' in r.request.url else (r.abort() if ('fonts.' in r.request.url or 'leadconnector' in r.request.url or 'filesafe' in r.request.url) else r.continue_()))
    p.goto(BASE + '/notice.html?t=' + 'A' * 43); p.wait_for_timeout(800)
    t = p.inner_text('#main')
    ok('the page opens their notice: first name, the notice, the receipt words, the practice banner', 'Hi Jordan' in t and 'THE FACTS' in t and 'does not mean I agree' in t and 'Practice' in t, t[:300])
    ok('the link code is sent with every call, never kept in the browser', calls[0].get('t') == 'A' * 43 and p.evaluate('localStorage.length') == 0)
    ok('fits the phone', p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
    p.screenshot(path='tests/browser/hr_ack_notice.png', full_page=True)
    p.click('#go'); p.wait_for_timeout(200)
    ok('signing needs the tick first', 'Tick the box' in p.inner_text('#err') and not any(c.get('action') == 'sign' for c in calls))
    p.check('#ok'); p.fill('#nm', 'Jordan'); p.click('#go'); p.wait_for_timeout(200)
    ok('...and a full first and last name', 'full first and last name' in p.inner_text('#err') and not any(c.get('action') == 'sign' for c in calls))
    p.fill('#nm', 'Pat Doe'); p.click('#go'); p.wait_for_timeout(400)
    ok("the server's refusal is shown (a name that isn't theirs)", 'as on your employee record' in p.inner_text('#err'))
    p.fill('#nm', 'Jordan Test'); p.click('#go'); p.wait_for_timeout(500)
    s = [c for c in calls if c.get('action') == 'sign'][-1]
    ok('signing sends the typed name, the tick and the notice it showed', s.get('typed_name') == 'Jordan Test' and s.get('consent') is True and s.get('notice_hash') == 'h1', s)
    t = p.inner_text('#main')
    ok('thank you: received, not agreed, with their copy', 'You signed that you received this notice' in t and 'does not mean you agree' in t and p.query_selector('a[href="https://example.test/copy.pdf"]'), t)
    p.screenshot(path='tests/browser/hr_ack_signed.png')
    state['status'] = 'expired'; p.goto(BASE + '/notice.html?t=' + 'B' * 43); p.wait_for_timeout(600)
    ok('an expired link says to call the office for a new one', 'expired' in p.inner_text('#main') and '234-8494' in p.inner_text('#main'))
    p.goto(BASE + '/notice.html'); p.wait_for_timeout(400)
    ok('no link code: not active, call the office', 'not active' in p.inner_text('#main'))
    ok('no page errors (signing page)', not errs, errs)

    # ── 2. Zach's panel in the write-up window, on the HR phone desk ──
    q = b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    pin(q); errs2 = []; q.on('pageerror', lambda e: errs2.append(str(e)[:200]))
    q.route('**/*', lambda r: r.abort() if ('supabase.co' in r.request.url or 'leadconnectorhq' in r.request.url or 'hub.mo-care.com' in r.request.url) else r.continue_())
    q.goto(BASE + '/index.html?m=hr'); q.wait_for_timeout(1500)
    q.evaluate(r"""() => {
      const iso = (d) => new Date(Date.now() - d * 864e5).toISOString();
      const WU = [{ id: 'w1', caregiver: 'Jordan Test', level: 'Verbal Warning', status: 'approved', approved_by: 'Zach Test', reason: 'Attendance', created_at: iso(3), body: 'CARING COMPANIONS: CORRECTIVE ACTION NOTICE',
        facts_checked_at: iso(2), handbook: { section: '2V' }, explanation: { asked_on: '2026-10-10', text: 'car trouble' }, protected: [] }];
      window.__ACKS = []; window.__CALLS = [];
      const q = (t) => { const p = new Proxy(function () {}, { get(_, k) {
        if (k === 'then') return (a, b) => Promise.resolve({ data: t === 'app_data' ? [{ key: 'discipline_actions', data: WU }] : [], error: null }).then(a, b);
        if (k === 'maybeSingle' || k === 'single') return () => Promise.resolve({ data: t === 'app_data' ? { data: WU } : null, error: null });
        return () => p; } }); return p; };
      const invoke = async (name, o) => { const bd = (o && o.body) || {}; window.__CALLS.push([name, bd]);
        if (name !== 'hr-ack') return { data: null, error: { message: 'offline', context: { json: async () => ({ error: 'offline' }) } } };
        const L = 'https://cc.mo-care.com/notice.html?t=' + 'C'.repeat(43);
        if (bd.action === 'list') return { data: { ok: true, live: false, acks: window.__ACKS }, error: null };
        if (bd.action === 'start') { const a = { id: '00000000-0000-4000-8000-000000000001', writeup_id: 'w1', status: 'waiting', via: bd.via, practice: true, caregiver: 'Jordan Test', level: 'Verbal Warning', started_at: new Date().toISOString() }; window.__ACKS = [a];
          return { data: { ok: true, practice: true, ack: a, link: L, draft: bd.via === 'link' ? 'Hi Jordan, this is Caring Companions. Zach has a notice for you to read and sign. ' + L : undefined, phone_last4: '0100' }, error: null }; }
        if (bd.action === 'send') { window.__ACKS[0].sent_at = new Date().toISOString(); return { data: { ok: true, outcome: 'practice' }, error: null }; }
        if (bd.action === 'record') { if (!bd.witness && !bd.witness_reason) return { data: null, error: { message: 'x', context: { json: async () => ({ error: 'Name the witness, or say why there was none.' }) } } };
          Object.assign(window.__ACKS[0], { status: bd.outcome, refused_on: bd.date, refused_how: bd.how, witness: bd.witness, recorded_at: new Date().toISOString() }); return { data: { ok: true, practice: true }, error: null }; }
        if (bd.action === 'open') return { data: { ok: true, url: 'https://signed.test/x.pdf', expires_in: 300 }, error: null };
        return { data: { ok: true }, error: null }; };
      const sess = { user: { id: 'u1', email: 'zach@mo-care.com', app_metadata: { hub_access: ['care_coordinator', 'team_hub'] } }, access_token: 'x' };
      const auth = { getSession: async () => ({ data: { session: sess }, error: null }), getUser: async () => ({ data: { user: sess.user }, error: null }), signOut: async () => ({ error: null }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) };
      const fake = { from: q, rpc: async () => ({ data: null, error: null }), functions: { invoke }, auth, channel: () => { const c = { on: () => c, subscribe: () => c, unsubscribe() {} }; return c; }, removeChannel() {} };
      supabase.createClient = () => fake; sb.from = q; sb.rpc = fake.rpc; sb.functions = { invoke }; sb.auth.getSession = auth.getSession;
      (0, eval)("ME={ email:'zach@mo-care.com', name:'Zach Test', shift:'day' };"); window.ccCan = () => true; window.ccConfirm = async () => true;
      DATA.discipline_actions = WU;
    }""")
    q.evaluate("phStart()"); q.wait_for_timeout(600)
    q.evaluate("HR.go('formal')"); q.wait_for_timeout(2500)
    q.evaluate("SCX.openWriteup('w1')"); q.wait_for_timeout(700)
    t = q.inner_text('#writeup-ack')
    ok('an approved write-up shows Getting it signed: practice note, text a link, sign in person', 'Getting it signed' in t and 'Practice' in t and 'Text them a link' in t and 'Sign here, in person' in t, t)
    ok('every write-up button reaches its function (Save, Draft with AI, Check now, No write-up, and the signing ones)', q.evaluate("['wuSave','wuDraftAi','wuProtected','noWriteup','wuAckStart','wuAckSend','wuAckRefuseForm','wuAckRecord','wuAckOpen','wuAckUploaded','wuAckCancel'].every(n => typeof window[n] === 'function')"))
    ok('Mark issued is gone (signing issues it)', 'Mark issued' not in q.inner_text('#writeup-actions'))
    q.screenshot(path='tests/browser/hr_ack_panel.png')
    q.click('text=Text them a link'); q.wait_for_timeout(700)
    ok('Text them a link: the draft to check, the last 4 of the phone, Send', q.query_selector('#ackMsg') and 'ending 0100' in q.inner_text('#ackSend') and 'Send' in q.inner_text('#ackSend'), q.inner_text('#writeup-ack'))
    ok('...started on the server for this write-up', any(c[1].get('action') == 'start' and c[1].get('writeup_id') == 'w1' and c[1].get('via') == 'link' for c in q.evaluate('window.__CALLS')))
    q.screenshot(path='tests/browser/hr_ack_text.png')
    q.click('#ackSend button'); q.wait_for_timeout(700)
    sent = [c[1] for c in q.evaluate('window.__CALLS') if c[1].get('action') == 'send']
    ok("Send passes Zach's words as they are in the box", sent and sent[0]['message'].startswith('Hi Jordan') and 'notice.html?t=' in sent[0]['message'], sent)
    t = q.inner_text('#writeup-ack')
    ok('...then it shows waiting, with Record a refusal and Cancel', 'Waiting for a signature' in t and 'Record a refusal' in t and 'Cancel the link' in t and 'nothing was texted' in t, t)
    q.click('text=Record a refusal or Did not sign'); q.wait_for_timeout(300)
    q.click('#ackRefuse button'); q.wait_for_timeout(500)
    ok('a refusal with no witness and no reason is refused, nothing recorded', q.evaluate("window.__ACKS[0].status") == 'waiting')
    q.fill('#ackWit', 'Samantha T.'); q.click('#ackRefuse button'); q.wait_for_timeout(700)
    t = q.inner_text('#writeup-ack')
    ok('...with a witness it is recorded and shown, with Open the PDF', 'Refused to sign' in t and 'Samantha T.' in t and 'Open the PDF' in t, t)
    q.click('text=Open the PDF'); q.wait_for_timeout(500)
    ok('Open the PDF gives a 5-minute link (logged)', q.query_selector('a[href="https://signed.test/x.pdf"]') is not None)
    ok('fits the phone (write-up window)', q.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
    q.screenshot(path='tests/browser/hr_ack_refused.png')
    ok('no page errors (HR desk)', not errs2, errs2)
    b.close()
for s_, n, dd in R: print(s_, '·', n, '' if s_ == 'PASS' else dd)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

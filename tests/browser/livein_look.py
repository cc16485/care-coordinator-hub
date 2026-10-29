"""Live-In Caregiver Agreement signed on a phone (Samantha 2026-10-29: "have Sheryelle and Rhonda sign the live-in packet").
Offline, made-up records, every server answer faked, nothing saved or sent. (1) livein.html, the caregiver's page, at phone
size: the 12 real pages, then the tick, name and finger signature, then thank you. (2) HR > Live-In Agreement on the owner's
desk: make the link, Send from the office line, a signed one, Add my signature, Open the PDF.
(python3 -m http.server 8794 in the repo, then python3 tests/browser/livein_look.py)"""
import json, os, sys
from playwright.sync_api import sync_playwright
BASE = os.environ.get('BASE', 'http://localhost:8794')
SHA = 'e35b98102d4664ce79df96168cac354b0d006783f58a78fe33d4939c40fc322c'
STATEMENT = 'I understand and voluntarily agree that the $250.00 live-in assignment rate is based upon a scheduled twenty-four (24) hour assignment.'
CONSENT = 'I have read all 12 pages of the Live-In Caregiver Agreement, I had the chance to ask questions, and I agree to it. I agree to sign it electronically.'
R = []
def ok(n, c, d=''): R.append(['PASS' if c else 'FAIL', n, '' if c else str(d)[:400]])
def draw(page, sel):
    bx = page.locator(sel).bounding_box()
    page.mouse.move(bx['x'] + 20, bx['y'] + 80); page.mouse.down()
    for i in range(1, 12): page.mouse.move(bx['x'] + 20 + i * 22, bx['y'] + (40 if i % 2 else 110))
    page.mouse.up()

with sync_playwright() as pw:
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from clock_pin import pin
    b = pw.chromium.launch()
    # ── 1. the caregiver's page ──
    calls = []; state = {'status': 'waiting', 'practice': False}
    def fn(route):
        body = json.loads(route.request.post_data or '{}'); calls.append(body)
        if body.get('action') == 'view':
            return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'first': 'Rhonda', 'pages': 12, 'master_sha': SHA, 'statement': STATEMENT,
                'consent': CONSENT, 'status': state['status'], 'practice': state['practice'], 'office_phone': '(417) 234-8494'}))
        if body.get('action') == 'sign':
            if body.get('typed_name') == 'Pat Doe': return route.fulfill(status=400, content_type='application/json', body=json.dumps({'error': 'Type your full first and last name, as on your employee record.'}))
            return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'copy_url': 'https://example.test/copy.pdf', 'practice': state['practice']}))
        route.fulfill(status=404, body='{}')
    p = b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    errs = []; p.on('pageerror', lambda e: errs.append(str(e)[:200]))
    bad_img = []; p.on('response', lambda r: bad_img.append(r.url) if ('livein-pages' in r.url and r.status != 200) else None)
    p.route('**/*', lambda r: fn(r) if 'functions/v1/livein-sign' in r.request.url else (r.abort() if ('fonts.' in r.request.url or 'leadconnector' in r.request.url or 'filesafe' in r.request.url) else r.continue_()))
    p.goto(BASE + '/livein.html?t=' + 'A' * 43); p.wait_for_timeout(900)
    t = p.inner_text('#main')
    ok('the page opens their agreement: first name, 12 pages to read, the button at the end', 'Hi Rhonda' in t and 'It is 12 pages' in t and 'Page 12 of 12' in t and "I've read it. Go to sign" in t, t[:300])
    ok('...the 12 real page images, in order, all load', p.evaluate("[...document.querySelectorAll('.pg img')].map(i=>i.getAttribute('src'))") == ['livein-pages/rev-2026-10/p%02d.jpg' % i for i in range(1, 13)])
    p.evaluate("Promise.all([...document.querySelectorAll('.pg img')].map(i=>{i.loading='eager'; return i.complete?1:new Promise(r=>{i.onload=i.onerror=r})}))"); p.wait_for_timeout(500)
    ok('...every page image is there (no missing file)', not bad_img and p.evaluate("[...document.querySelectorAll('.pg img')].every(i=>i.naturalWidth===1020)"), bad_img)
    ok('the link code is sent with every call, never kept in the browser', calls[0].get('t') == 'A' * 43 and p.evaluate('localStorage.length + sessionStorage.length') == 0)
    ok('fits the phone (reading)', p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
    p.screenshot(path='tests/browser/livein_read.png')
    p.click('#next'); p.wait_for_timeout(300)
    t = p.inner_text('#main')
    ok('Go to sign: her pay statement, the consent tick, name, finger signature, today\'s date, Sign', '$250.00' in t and 'all 12 pages' in t and 'Type your full name' in t and 'Sign with your finger' in t and "Today's date is added for you" in t and p.query_selector('canvas#sig'), t)
    p.click('#go'); p.wait_for_timeout(200)
    ok('signing needs the tick first', 'Tick the box' in p.inner_text('#err') and not any(c.get('action') == 'sign' for c in calls))
    p.check('#ok'); p.fill('#nm', 'Rhonda'); p.click('#go'); p.wait_for_timeout(200)
    ok('...a full first and last name', 'full first and last name' in p.inner_text('#err'))
    p.fill('#nm', 'Rhonda Blakemore'); p.click('#go'); p.wait_for_timeout(200)
    ok('...and a signature in the box', 'Sign in the box' in p.inner_text('#err') and not any(c.get('action') == 'sign' for c in calls))
    draw(p, '#sig'); p.click('#clr'); p.click('#go'); p.wait_for_timeout(200)
    ok('Clear empties the signature box', 'Sign in the box' in p.inner_text('#err'))
    draw(p, '#sig'); p.fill('#nm', 'Pat Doe'); p.click('#go'); p.wait_for_timeout(400)
    ok("the server's refusal is shown (a name that isn't theirs)", 'as on your employee record' in p.inner_text('#err'))
    ok('fits the phone (signing)', p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
    p.fill('#nm', 'Rhonda Blakemore'); p.screenshot(path='tests/browser/livein_sign.png', full_page=True)
    p.click('#go'); p.wait_for_timeout(500)
    s = [c for c in calls if c.get('action') == 'sign'][-1]
    ok('signing sends the typed name, the tick, the agreement it showed and the drawn signature (PNG)', s.get('typed_name') == 'Rhonda Blakemore' and s.get('consent') is True and s.get('master_sha') == SHA and str(s.get('signature', '')).startswith('data:image/png;base64,') and len(s['signature']) > 1000, {k: str(v)[:40] for k, v in s.items()})
    t = p.inner_text('#main')
    ok('thank you: signed, Caring Companions adds its signature, Save my copy', 'Your agreement is signed' in t and 'Caring Companions will add its signature' in t and p.query_selector('a.copy[href="https://example.test/copy.pdf"]'), t)
    p.screenshot(path='tests/browser/livein_done.png')
    state['status'] = 'signed'; p.goto(BASE + '/livein.html?t=' + 'B' * 43); p.wait_for_timeout(600)
    ok('opened again after signing: already signed, thank you', 'already signed' in p.inner_text('#main'))
    state['status'] = 'expired'; p.goto(BASE + '/livein.html?t=' + 'B' * 43); p.wait_for_timeout(600)
    ok('an expired link says to call the office for a new one', 'expired' in p.inner_text('#main') and '234-8494' in p.inner_text('#main'))
    state['status'] = 'waiting'; state['practice'] = True; p.goto(BASE + '/livein.html?t=' + 'C' * 43); p.wait_for_timeout(600)
    ok('a practice link says Practice', 'Practice.' in p.inner_text('#main'))
    p.goto(BASE + '/livein.html'); p.wait_for_timeout(400)
    ok('no link code: not active, call the office', 'not active' in p.inner_text('#main'))
    ok('no page errors (signing page)', not errs, errs)

    # ── 2. HR > Live-In Agreement on the owner's desk ──
    q = b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    pin(q); errs2 = []; q.on('pageerror', lambda e: errs2.append(str(e)[:200]))
    q.route('**/*', lambda r: r.abort() if ('supabase.co' in r.request.url or 'leadconnectorhq' in r.request.url or 'hub.mo-care.com' in r.request.url) else r.continue_())
    q.goto(BASE + '/index.html?m=hr'); q.wait_for_timeout(1500)
    q.evaluate(r"""() => {
      window.__ROWS = []; window.__CALLS = [];
      const L = 'https://cc.mo-care.com/livein.html?t=' + 'D'.repeat(43);
      const q = (t) => { const p = new Proxy(function () {}, { get(_, k) {
        if (k === 'then') return (a, b) => Promise.resolve({ data: [], error: null }).then(a, b);
        if (k === 'maybeSingle' || k === 'single') return () => Promise.resolve({ data: null, error: null });
        return () => p; } }); return p; };
      const no = (m) => ({ data: null, error: { message: 'x', context: { json: async () => ({ error: m }) } } });
      const invoke = async (name, o) => { const bd = (o && o.body) || {}; window.__CALLS.push([name, bd]);
        if (name !== 'livein-sign') return no('offline');
        const row = (id) => window.__ROWS.find((r) => r.id === id);
        if (bd.action === 'list') return { data: { ok: true, people: [{ name: 'Sheryelle Dunniehigh', phone_last4: '', on_roster: true }, { name: 'Rhonda Blakemore', phone_last4: '0100', on_roster: true }], rows: window.__ROWS }, error: null };
        if (bd.action === 'start') { window.__ROWS.forEach((r) => { if (r.caregiver === bd.name && r.status === 'waiting') r.status = 'cancelled'; });
          const r = { id: '00000000-0000-4000-8000-00000000000' + (window.__ROWS.length + 1), practice: false, caregiver: bd.name, status: 'waiting', started_at: new Date().toISOString() }; window.__ROWS.unshift(r);
          return { data: { ok: true, row: r, link: L, draft: 'Hi ' + bd.name.split(' ')[0] + ', this is Samantha at Caring Companions. Here is the Live-In Caregiver Agreement to read and sign on your phone. It is private to you: ' + L + ' Questions? Call the office at (417) 234-8494.', phone_last4: bd.name.startsWith('Rhonda') ? '0100' : '' }, error: null }; }
        if (bd.action === 'send') { if (!/livein\.html\?t=/.test(bd.message)) return no('The message must keep the private link to this agreement.'); row(bd.id).sent_at = new Date().toISOString(); return { data: { ok: true, outcome: 'sent' }, error: null }; }
        if (bd.action === 'countersign') { if (!String(bd.signature || '').startsWith('data:image/png')) return no('Sign in the box first.'); Object.assign(row(bd.id), { status: 'countersigned', rep_name: 'Samantha Troutman', countersigned_at: new Date().toISOString() }); return { data: { ok: true }, error: null }; }
        if (bd.action === 'open') return { data: { ok: true, url: 'https://signed.test/x.pdf', expires_in: 300 }, error: null };
        return { data: { ok: true }, error: null }; };
      const sess = { user: { id: 'u1', email: 'samantha@mo-care.com', app_metadata: { hub_access: ['owner_admin', 'team_hub'] } }, access_token: 'x' };
      const auth = { getSession: async () => ({ data: { session: sess }, error: null }), getUser: async () => ({ data: { user: sess.user }, error: null }), signOut: async () => ({ error: null }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) };
      const fake = { from: q, rpc: async () => ({ data: null, error: null }), functions: { invoke }, auth, channel: () => { const c = { on: () => c, subscribe: () => c, unsubscribe() {} }; return c; }, removeChannel() {} };
      supabase.createClient = () => fake; sb.from = q; sb.rpc = fake.rpc; Object.defineProperty(sb, 'functions', { value: { invoke }, configurable: true }); sb.auth.getSession = auth.getSession;
      (0, eval)("ME={ email:'samantha@mo-care.com', name:'Samantha Troutman', shift:'day' };"); window.ccCan = () => true; window.ccConfirm = async () => true;
      window.__TOASTS = []; window.ccToast = (m) => window.__TOASTS.push(m); window.open = (u) => { window.__OPENED = u; };
    }""")
    q.evaluate("phStart()"); q.wait_for_timeout(600)
    q.evaluate("HR.go('livein')"); q.wait_for_timeout(800)
    t = q.inner_text('#hrLvBox')
    ok('HR > Live-In Agreement: both people, Not sent yet, Make the link', 'Sheryelle Dunniehigh' in t and 'Rhonda Blakemore' in t and t.count('Not sent yet') == 2 and t.count('Make the link') == 2, t)
    ok('...it is in the HR menu for owners', 'Live-In Agreement' in q.inner_text('#hrMenu'))
    q.screenshot(path='tests/browser/livein_hr_start.png')
    q.evaluate("HR.lv('start','RhondaBlakemore')"); q.wait_for_timeout(600)
    t = q.inner_text('#hrLvBox')
    ok('Make the link: the text to check (her name, the link), the phone ending, Send from the office line, Copy', q.query_selector('#lvMsgRhondaBlakemore') and 'phone ending 0100' in t and 'Send from the office line' in t and 'Copy the link instead' in t
       and 'this is Samantha' in q.input_value('#lvMsgRhondaBlakemore') and 'livein.html?t=' in q.input_value('#lvMsgRhondaBlakemore'), t)
    q.screenshot(path='tests/browser/livein_hr_text.png')
    q.evaluate("HR.lv('start','SheryelleDunniehigh')"); q.wait_for_timeout(600)
    t = q.inner_text('#hrLvBox')
    ok('no phone on file: no Send button, says copy the link instead', 'no phone on file' in t and t.count('Send from the office line') == 1, t)
    q.fill('#lvMsgRhondaBlakemore', 'Hi Rhonda, here it is: ' + 'https://cc.mo-care.com/livein.html?t=' + 'D' * 43)
    q.evaluate("HR.lv('send','RhondaBlakemore')"); q.wait_for_timeout(600)
    sent = [c[1] for c in q.evaluate('window.__CALLS') if c[1].get('action') == 'send']
    ok('Send passes her words as they are in the box', sent and sent[0]['message'].startswith('Hi Rhonda, here it is') and sent[0]['id'], sent)
    t = q.inner_text('#hrLvBox')
    ok('...then Rhonda shows Texted, with Make a new link; a toast says sent', 'Texted' in t and 'Make a new link' in t and 'Sent to Rhonda Blakemore.' in q.evaluate('window.__TOASTS'), t)
    q.evaluate("window.__ROWS.find(r=>r.caregiver==='Rhonda Blakemore').status='signed'; window.__ROWS.find(r=>r.caregiver==='Rhonda Blakemore').signed_at=new Date().toISOString()")
    q.evaluate("HR.go('livein')"); q.wait_for_timeout(800)
    t = q.inner_text('#hrLvBox')
    ok('signed: needs your signature, Add my signature, Open signed PDF', 'needs your signature' in t and 'Add my signature' in t and 'Open signed PDF' in t, t)
    q.evaluate("HR.lv('open','RhondaBlakemore')"); q.wait_for_timeout(400)
    ok('Open signed PDF opens the 5-minute link', q.evaluate('window.__OPENED') == 'https://signed.test/x.pdf')
    q.evaluate("HR.lv('pad','RhondaBlakemore')"); q.wait_for_timeout(300)
    q.evaluate("HR.lv('countersign','RhondaBlakemore')"); q.wait_for_timeout(300)
    ok('Sign and save with an empty box: asks to sign first, nothing sent', 'Sign in the box first' in q.inner_text('#hrLvBox') and not any(c[1].get('action') == 'countersign' for c in q.evaluate('window.__CALLS')))
    draw(q, '#lvSigRhondaBlakemore'); q.screenshot(path='tests/browser/livein_hr_sign.png')
    q.evaluate("HR.lv('countersign','RhondaBlakemore')"); q.wait_for_timeout(700)
    cs = [c[1] for c in q.evaluate('window.__CALLS') if c[1].get('action') == 'countersign']
    ok('countersign sends her drawn signature for that row', cs and cs[0]['signature'].startswith('data:image/png;base64,') and len(cs[0]['signature']) > 1000)
    t = q.inner_text('#hrLvBox')
    ok('...then Done, countersigned by her, Open signed PDF', 'Done' in t and 'countersigned by Samantha Troutman' in t, t)
    q.screenshot(path='tests/browser/livein_hr_done.png')
    ok('fits a phone too (HR card)', q.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
    ok('the My Work task opens HR > Live-In Agreement', "if(it.kind==='livein_countersign'){ location.hash='hr/livein'" in open(os.path.join(os.path.dirname(__file__), '..', '..', 'index.html')).read())
    ok('no page errors (HR desk)', not errs2, errs2)
    b.close()
for s_, n, dd in R: print(s_, '·', n, '' if s_ == 'PASS' else dd)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

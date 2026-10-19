"""Coaching calls, part C2 (Samantha 2026-10-18: "start part 2, the Hub screens"). The Coaching call panel on a coaching
record and the write-up once coaching calls are switched on, on the HR phone desk. Offline, made-up records, every server
answer faked; nothing rings, nothing is saved. (python3 -m http.server 8796 in the repo, then python3 tests/browser/hr_coach_calls_look.py)"""
import json, os
from playwright.sync_api import sync_playwright
BASE = os.environ.get('BASE', 'http://localhost:8796')
FAKE = r"""(o) => {
  const iso = (d) => new Date(Date.now() - d * 864e5).toISOString(), today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
  window.__CO = [{ id: '11111111-1111-4111-8111-111111111111', caregiver: 'Jordan Test', kind: 'coaching', topic: 'Late arrivals', status: 'open', assigned_to: 'krystal@mo-care.com', assigned_by: 'zach@mo-care.com', due_on: today, facts: [], talking_points: 'Hi Jordan. What has been getting in the way? [STOP: let them answer. Write down what they say.]', created_at: iso(1) }];
  window.__CALLS = o.calls; window.__LIVE = o.live; window.__INV = [];
  const q = (t) => { const p = new Proxy(function () {}, { get(_, k) {
    if (k === 'then') return (a, b) => Promise.resolve({ data: t === 'hr_coaching' ? window.__CO : [], error: null }).then(a, b);
    if (k === 'maybeSingle' || k === 'single') return () => Promise.resolve({ data: null, error: null });
    return () => p; } }); return p; };
  const invoke = async (name, op) => { const b = (op && op.body) || {}; window.__INV.push([name, b]);
    if (name !== 'hr-coach-call') return { data: null, error: { message: 'offline', context: { json: async () => ({ error: 'offline' }) } } };
    if (b.action === 'list') return o.off ? { data: null, error: { message: 'x', context: { json: async () => ({ error: 'Coaching calls are not switched on yet.' }) } } }
      : { data: { ok: true, live: window.__LIVE, min_seconds: 180, calls: window.__CALLS }, error: null };
    if (b.action === 'tap') { window.__CALLS = [{ id: 'c9', state: 'waiting', tap_at: new Date().toISOString(), tapped_by: 'zach@mo-care.com', practice: !window.__LIVE }].concat(window.__CALLS); return { data: { ok: true, say_first: 'This call is being recorded for our coaching records.' }, error: null }; }
    if (b.action === 'candidates') return { data: { ok: true, calls: [{ message_id: 'p1', at: iso(0.1), seconds: 250, status: 'completed' }] }, error: null };
    if (b.action === 'confirm') { const k = window.__CALLS.find((x) => x.id === b.call_id); k.state = 'confirmed'; return { data: { ok: true, state: 'confirmed' }, error: null }; }
    return { data: { ok: true }, error: null }; };
  const sess = { user: { id: 'u1', email: o.who + '@mo-care.com', app_metadata: { hub_access: ['care_coordinator', 'team_hub'] } }, access_token: 'x' };
  sb.from = q; sb.rpc = async (fn, a) => { window.__RPC = [fn, a]; return { data: { status: 'done' }, error: null }; }; Object.getPrototypeOf(sb.functions).invoke = invoke;   /* the client makes its functions client fresh each time: patch its class */ sb.auth.getSession = async () => ({ data: { session: sess }, error: null });
  (0, eval)("ME={ email:'" + o.who + "@mo-care.com', name:'" + o.who + "', shift:'day' };"); window.ccCan = (k) => o.who === 'zach'; window.ccConfirm = async () => true; window.alert = (m) => { window.__ALERT = m; };
}"""
R = []
def ok(n, c, d=''): R.append(['PASS' if c else 'FAIL', n, '' if c else str(d)[:500]])
def page(b, o):
    pg = b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.route('**/*', lambda r: r.abort() if ('supabase.co' in r.request.url or 'leadconnectorhq' in r.request.url or 'hub.mo-care.com' in r.request.url) else r.continue_())
    pg.goto(BASE + '/index.html?m=hr'); pg.wait_for_timeout(1500)
    pg.evaluate(FAKE, o); pg.evaluate("phStart()"); pg.wait_for_timeout(500)
    pg.evaluate("HR.go('coaching')"); pg.wait_for_timeout(1200)
    return pg, errs
CID = '11111111-1111-4111-8111-111111111111'
with sync_playwright() as pw:
    b = pw.chromium.launch()
    now = __import__('datetime').datetime.utcnow().isoformat() + 'Z'
    calls = [{'id': 'c1', 'state': 'attempt', 'call_at': now, 'seconds': 33, 'reason': 'It went to voicemail.', 'tapped_by': 'zach@mo-care.com', 'practice': True},
             {'id': 'c2', 'state': 'qualifies', 'call_at': now, 'seconds': 260, 'tapped_by': 'zach@mo-care.com', 'practice': True},
             {'id': 'c3', 'state': 'attempt', 'call_at': now, 'seconds': 300, 'reason': 'GoHighLevel has no recording for this call.', 'tapped_by': 'zach@mo-care.com', 'practice': True},
             {'id': 'c4', 'state': 'no_call', 'tap_at': now, 'reason': 'No call from you to them was found after the tap. If you did talk, pick the call from your recent calls.', 'tapped_by': 'zach@mo-care.com', 'practice': True}]
    # 1 · Zach, switched off (practice)
    pg, errs = page(b, {'who': 'zach', 'live': False, 'calls': calls})
    t = pg.inner_text('#hrCall' + CID)
    ok('Zach sees the Coaching call panel, marked practice', 'Coaching call' in t and 'Practice' in t, t)
    ok('...with the recording line to say first and what counts', 'This call is being recorded for our coaching records' in t and '3 minutes' in t and 'voicemail never counts' in t, t)
    ok('...each call says why it counts or not: voicemail, confirm, no recording, not found', 'It went to voicemail' in t and 'Counts once you confirm' in t and 'no recording' in t and 'pick the call from your recent calls' in t, t)
    ok('...Excuse appears only on the connected call with no recording (never on the voicemail)', pg.evaluate("[...document.querySelectorAll('#hrCall" + CID + " button')].filter(b=>/Excuse/.test(b.textContent)).length") == 1)
    ok('practice: the write-up form is unchanged (date and how, no call needed)', pg.evaluate("(()=>{HR.form('" + CID + "','record'); return !!document.getElementById('hrRd" + CID + "') && !document.getElementById('hrRh" + CID + "');})()"))
    pg.evaluate("HR.form('" + CID + "',0)"); pg.wait_for_timeout(500)
    pg.screenshot(path='tests/browser/hr_coach_call_panel.png')
    pg.click('#hrCall' + CID + ' >> text=Call now'); pg.wait_for_timeout(600)
    ok('Call now: rings through the server for this record, tells him to answer and what to say', any(x[1].get('action') == 'tap' and x[1].get('coaching_id') == CID for x in pg.evaluate('window.__INV')) and 'Your phone is ringing' in (pg.evaluate('window.__ALERT') or ''))
    ok('...and the new call shows as looking for the call, with Look again', 'Looking for the call' in pg.inner_text('#hrCall' + CID) and 'Look again' in pg.inner_text('#hrCall' + CID))
    pg.click('#hrCall' + CID + ' >> text=Yes, I spoke with them'); pg.wait_for_timeout(600)
    ok('Yes, I spoke with them: confirms that call on the server', any(x[1].get('action') == 'confirm' and x[1].get('call_id') == 'c2' for x in pg.evaluate('window.__INV')) and 'Confirmed: this call counts' in pg.inner_text('#hrCall' + CID))
    pg.click('#hrCall' + CID + ' >> text=Pick the call from my recent calls'); pg.wait_for_timeout(600)
    ok('the pick list shows his recent calls with Use this call', 'Use this call' in pg.inner_text('#hrPick' + CID))
    ok('fits the phone', pg.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
    ok('no page errors (practice)', not errs, errs)
    # 2 · Krystal, switched on, with a confirmed call
    pg2, errs2 = page(b, {'who': 'krystal', 'live': True, 'calls': [{'id': 'k1', 'state': 'confirmed', 'call_at': now, 'seconds': 300, 'tapped_by': 'krystal@mo-care.com', 'practice': False}]})
    t2 = pg2.inner_text('#hrCall' + CID)
    ok('switched on, Krystal: no practice note, her confirmed call', 'Practice' not in t2 and 'Confirmed: this call counts' in t2, t2)
    pg2.evaluate("HR.form('" + CID + "','record')"); pg2.wait_for_timeout(400)
    f = pg2.inner_text('#hrCoachList')
    ok('switched on: the write-up names the call (no date or how to pick), asks help agreed, follow-up actions and a check date', 'The call:' in f and 'Help we agreed to give' in f and 'Follow-up actions' in f and pg2.query_selector('#hrRc' + CID) is not None and pg2.query_selector('#hrRd' + CID) is None, f[:600])
    pg2.fill('#hrRw' + CID, 'Late twice'); pg2.fill('#hrRa0_' + CID, 'Car trouble'); pg2.fill('#hrRe' + CID, 'On time'); pg2.fill('#hrRh' + CID, 'Later start'); pg2.fill('#hrRf' + CID, 'Check in Friday')
    pg2.check('#hrRw2' + CID); pg2.click('text=Mark coaching done'); pg2.wait_for_timeout(500)
    rpc = pg2.evaluate('window.__RPC')
    ok('...done sends the write-up the server needs: help agreed, follow-up, the warning, the check date (the call fills the date)', rpc and rpc[1]['p_action'] == 'done' and rpc[1]['p'].get('help_agreed') == 'Later start' and rpc[1]['p'].get('warning_given') == 'true' and rpc[1]['p'].get('check_on') and 'held_on' not in rpc[1]['p'], rpc)
    pg2.screenshot(path='tests/browser/hr_coach_call_writeup.png')
    ok('no page errors (switched on)', not errs2, errs2)
    # 3 · Krystal, switched off: no panel
    pg3, errs3 = page(b, {'who': 'krystal', 'live': False, 'off': True, 'calls': []})
    ok('switched off, Krystal: no Coaching call panel at all, and her form is as today', pg3.inner_text('#hrCall' + CID).strip() == '' and pg3.evaluate("(()=>{HR.form('" + CID + "','record'); return !!document.getElementById('hrRd" + CID + "');})()"))
    ok('no page errors (Krystal, off)', not errs3, errs3)
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

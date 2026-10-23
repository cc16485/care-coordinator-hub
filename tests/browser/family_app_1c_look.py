"""Family app Step 1c, the Hub side: the REAL family-app-panel.js in a real browser against a stand-in for the family-app-office
door (which answers like the real one: tested in Staffing-Coordinator-Hub family_app_1a_test.mjs). Also checks index.html's
inline scripts still parse and the wiring is in place. FAKE people only; nothing reaches production.
   python3 tests/browser/family_app_1c_look.py"""
import os, re, json, subprocess, tempfile
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PANEL = open(os.path.join(ROOT, 'family-app-panel.js')).read()
HTML = open(os.path.join(ROOT, 'index.html')).read()
R = []
def ck(n, c, d=''): R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:700]))

# ── index.html wiring ──────────────────────────────────────────────────────────────────────────────────────────────────
ck('index: panel loaded after the caregiver panel', re.search(r'caregiver-profile-panel\.js[^\n]*\n<script src="family-app-panel\.js\?v=', HTML))
ck('index: Family bookings pill, panel and badge', 'data-tab="familybookings"' in HTML and 'id="tab-familybookings"' in HTML and 'id="famBookings"' in HTML and 'id="famPillBadge"' in HTML)
ck('index: in the Scheduling group, titled, rendered on open', "'familybookings','carematch'" in HTML and "familybookings:'Family bookings'" in HTML and "activeTab==='familybookings' && window.FAMAPP) FAMAPP.render()" in HTML)
ck('index: the Care circle card shows the app line and can reload itself', "FAMAPP.circleLine(m, px)" in HTML and "FAMAPP.register(px, cl360CircleLoad)" in HTML and "await cl360CircleLoad();" in HTML)
tmp = tempfile.mkdtemp(prefix='fam1c-')
scripts = re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', HTML, re.S)
bad = []
for i, sc in enumerate(scripts):
    if not sc.strip(): continue
    f = os.path.join(tmp, f's{i}.js'); open(f, 'w').write(sc)
    p = subprocess.run(['node', '--check', f], capture_output=True, text=True)
    if p.returncode != 0: bad.append((i, p.stderr[-300:]))
ck(f'index: all {len(scripts)} inline scripts still parse', not bad, bad)
ck('no em dashes in the panel', '—' not in PANEL)
ck('the panel never uses the bare name FAM (the Hub has const FAM, a cache)', not re.search(r'(?<![\w.])FAM\s*[.(=\[]', PANEL) and not re.search(r'(?<![\w.])FAM\.(circleLine|register|render|act|welcome)', HTML))

PAGE = """<!doctype html><meta charset=utf-8><body>
<div class="fsubbar"><div class="fpill">Family bookings<span id="famPillBadge" style="display:none"></span></div></div>
<div id="cp_cl360Circle"></div><div id="famBookings"></div>
<script>
window.DATA = { ops_settings: { family_app_live: false, family_app_service_MO: 'PP - WC' }, caregivers: [
  { first: 'Maria', last: 'Lopez', axiscare_id: 88 }, { first: 'Gone', last: 'Away', axiscare_id: 66, active: false }, { first: 'Maria', last: 'Lopez', axiscare_id: 88 } ] };
window.__calls = [];
const M = { '00000009-aaaa-4bbb-8ccc-000000000009': { id: '00000009-aaaa-4bbb-8ccc-000000000009', name: 'Lisa Ray', email: 'lisa@x.test', app_status: null, app_can_book: false }, '00000000-aaaa-4bbb-8ccc-000000000010': { id: '00000000-aaaa-4bbb-8ccc-000000000010', name: 'Tom Ray', email: '' }, '00000001-aaaa-4bbb-8ccc-000000000011': { id: '00000001-aaaa-4bbb-8ccc-000000000011', name: 'Ann', email: 'a@x.test', app_status: 'active', app_can_book: true } };
const B = [
  { id: 'b1', client_name: 'Dorothy Ray', visit_date: '2099-01-05', start_time: '10:00', end_time: '13:00', hours: 3, tasks: ['Companionship'], requested_by_name: 'Lisa Ray', who: 'regular', status: 'needs_office', error: 'no app service is set for OK in the Hub settings', state: 'OK', note: 'Soup please' },
  { id: 'b2', client_name: 'Dorothy Ray', visit_date: '2099-01-06', start_time: '09:00', end_time: '11:00', hours: 2, tasks: ['Errands and shopping'], requested_by_name: 'Lisa Ray', who: 'any', status: 'waiting_for_caregiver', axiscare_visit_id: 'v=5:s=0:d=2099-01-06', state: 'MO' },
  { id: 'b3', client_name: 'Dorothy Ray', visit_date: '2099-01-07', start_time: '09:00', end_time: '11:00', hours: 2, tasks: ['Companionship'], status: 'placed', caregiver_name: 'Maria L.', state: 'MO', sync_state: 'no_caregiver', sync_note: 'Maria L.' },
  { id: 'b4', client_name: 'Dorothy Ray', visit_date: '2099-01-08', start_time: '09:00', end_time: '11:00', hours: 2, tasks: ['Companionship'], status: 'cancelled', state: 'MO', cancel_source: 'office' },
  { id: 'b5', client_name: 'Dorothy Ray', visit_date: '2099-01-09', start_time: '10:00', end_time: '12:00', hours: 2, tasks: ['Companionship'], status: 'held', state: 'MO', hold_reason: 'the note mentions personal care (bathing, toileting, dressing)', answer_by: '2099-01-08T23:00:00Z', note: 'help her shower' } ];
const PLANS = [{ id: 'c1', client_name: 'Dorothy Ray', app_plan: true, app_plan_since: '2026-10-01', help_fill: null, app_tasks: null }];
window.callAction = async (fn, body) => {
  __calls.push([fn, body]); await new Promise(r => setTimeout(r, 5));
  if (fn !== 'family-app-office') return { status: 404, data: { error: 'wrong door' } };
  const a = body.action;
  if (a === 'list') return { status: 200, data: { members: [{ name: 'Ann', client_name: 'Dorothy Ray', status: 'active', can_book: true }], bookings: B, plans: PLANS, tasks: ['Companionship', 'Meal preparation'] } };
  if (a === 'review') { const b = B.find(x => x.id === body.booking_id); b.status = body.decision === 'decline' ? 'declined' : 'waiting_for_caregiver'; return { status: 200, data: { ok: true } } }
  if (a === 'help_fill') { PLANS[0].help_fill = body.on ? { on: true, reason: body.reason, review_by: '2099-01-01' } : { on: false }; return { status: 200, data: { ok: true } } }
  if (a === 'app_tasks') { PLANS[0].app_tasks = body.tasks; return { status: 200, data: { ok: true } } }
  if (a === 'late_billed') { B.find(x => x.id === body.booking_id).late_billed_at = '2099-01-01'; return { status: 200, data: { ok: true } } }
  if (a === 'invite') { M[body.contact_id].app_status = 'active'; M[body.contact_id].app_can_book = true; return { status: 200, data: { ok: true, words: 'Hi Lisa, you can now see Dorothy Ray\\'s visits and book extra visits at family.mo-care.com.' } } }
  if (a === 'can_book') { M[body.contact_id].app_can_book = body.on; return { status: 200, data: { ok: true } } }
  if (a === 'revoke') { M[body.contact_id].app_status = 'revoked'; return { status: 200, data: { ok: true } } }
  if (a === 'welcome' && !body.send) { const k = body.kind || window.__savedKind || null; return { status: 200, data: { preview: true, name: M[body.contact_id].name, client: 'Dorothy', can_text: false, can_email: true, axis_email_on_file: window.__axisOn, include_axis: window.__axisOn !== false, hipaa_ok: window.__hipaa !== false || (!!M[body.contact_id].hipaa_office_ok_at && window.__hipaaAxis !== false), hipaa_axis: window.__hipaaAxis === undefined ? null : window.__hipaaAxis, hipaa_office: M[body.contact_id].hipaa_office_ok_at ? { at: M[body.contact_id].hipaa_office_ok_at, by: M[body.contact_id].hipaa_office_ok_by } : null,
      kinds: [{ key: 'regular', label: 'Regular Scheduled Care' }, { key: 'flexible', label: 'Flexible Booking Care' }, { key: 'both', label: 'Combination of Both' }], kind: k, saved_kind: window.__savedKind || null, sent: window.__sent || null,
      text: k ? (window.__axisOn === false ? 'Hi Ann, short ' + k + '.' : 'Hi Ann, long ' + k + ' with 16485.axiscare.com.') : null, text_with_axis: k ? 'Hi Ann, long ' + k + ' with 16485.axiscare.com.' : null, text_without_axis: k ? 'Hi Ann, short ' + k + '.' : null,
      email_subject: k ? 'Welcome to Caring Companions' : null, email_html: k ? '<p>EMAIL ' + k + '</p>' : null } } };
  if (a === 'welcome' && body.send) { M[body.contact_id].welcome_sent_at = '2099-01-02T15:14:00Z'; M[body.contact_id].welcome_sent_by = 'Krystal'; M[body.contact_id].welcome_version = body.kind; M[body.contact_id].welcome_how = 'email'; return { status: 200, data: { ok: true, by_text: false, by_email: true, version: body.kind } } }
  if (a === 'hipaa_ok') { if (body.on && window.__hipaaAxis === false) return { status: 409, data: { error: 'AxisCare says Ann does NOT have HIPAA permission.' } }; M[body.contact_id].hipaa_office_ok_at = body.on ? '2099-01-02T16:00:00Z' : null; M[body.contact_id].hipaa_office_ok_by = body.on ? 'Krystal' : null; return { status: 200, data: { ok: true } } }
  if (a === 'welcome_skip') { M[body.contact_id].welcome_skip_at = '2099-01-01'; M[body.contact_id].welcome_skip_reason = body.reason; return { status: 200, data: { ok: true } } }
  if (a === 'scheduling_type') { PLANS[0].care_scheduling_type = body.kind; return { status: 200, data: { ok: true } } }
  if (a === 'schedule') return { status: 502, data: { error: 'no app service is set for OK in the Hub settings' } };
  if (a === 'place') { const b = B.find(x => x.id === body.booking_id); b.status = 'placed'; b.caregiver_name = 'Maria L.'; return { status: 200, data: { ok: true } } }
  return { status: 400, data: { error: 'unknown' } };
};
window.drawCircle = async () => { document.getElementById('cp_cl360Circle').innerHTML = Object.values(M).map(m => '<div><b>' + m.name + '</b>' + FAMAPP.circleLine(m, 'cp_') + '</div>').join('') };
</script>
<script>const FAM={ cache:{} };  /* the Hub's own FAM (index.html), kept here so a name clash shows up in this test */</script>
<script>__PANEL__</script>
<script>FAMAPP.register('cp_', window.drawCircle); drawCircle();</script>
"""
page = os.path.join(tmp, 'page.html'); open(page, 'w').write(PAGE.replace('__PANEL__', PANEL))
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + page); pg.wait_for_timeout(50)
    t = pg.inner_text('#cp_cl360Circle')
    ck('circle: one invite-and-welcome button for someone with an email; Tom needs an email; Ann shows on + can book', 'Invite and send welcome' in t and 'add an email to invite them' in t and 'Booking App: on' in t and 'can book visits' in t, t)
    pg.click('#fam-cp_-00000009-aaaa-4bbb-8ccc-000000000009 button'); pg.wait_for_timeout(80)
    t = pg.inner_text('#cp_cl360Circle')
    calls = pg.evaluate('__calls')
    # her ask 2026-10-17: one press invites AND opens the welcome to read; nothing is sent until Send welcome
    pg.wait_for_timeout(120); t = pg.inner_text('#cp_cl360Circle')
    ck('one press: invites (office door), then the welcome preview opens; nothing sent yet', ['family-app-office', {'action': 'invite', 'contact_id': '00000009-aaaa-4bbb-8ccc-000000000009', 'can_book': True}] in calls and
       any(c[1].get('action') == 'welcome' and c[1].get('contact_id') == '00000009-aaaa-4bbb-8ccc-000000000009' and not c[1].get('send') for c in pg.evaluate('__calls')) and 'can sign in now. Nothing is sent until you press Send welcome' in t and 'Not now' in t, t)
    pg.click('#fam-cp_-00000001-aaaa-4bbb-8ccc-000000000011 button:has-text("Turn booking off")'); pg.wait_for_timeout(80)
    ck('booking off for one person', pg.evaluate('__calls')[-1][1] == {'action': 'can_book', 'contact_id': '00000001-aaaa-4bbb-8ccc-000000000011', 'on': False} and "can't book" in pg.inner_text('#fam-cp_-00000001-aaaa-4bbb-8ccc-000000000011'))
    n = len(pg.evaluate('__calls'))
    pg.click('#fam-cp_-00000001-aaaa-4bbb-8ccc-000000000011 button:has-text("Turn app off")'); pg.wait_for_timeout(40)
    ck('turn off asks once first (nothing sent yet)', len(pg.evaluate('__calls')) == n and 'Press Turn app off again' in pg.inner_text('#fam-cp_-00000001-aaaa-4bbb-8ccc-000000000011'))
    pg.click('#fam-cp_-00000001-aaaa-4bbb-8ccc-000000000011 button:has-text("Turn app off")'); pg.wait_for_timeout(80)
    ck('turn off: done on the second press; Turn on again offered', pg.evaluate('__calls')[-1][1] == {'action': 'revoke', 'contact_id': '00000001-aaaa-4bbb-8ccc-000000000011'} and 'Turn on again' in pg.inner_text('#fam-cp_-00000001-aaaa-4bbb-8ccc-000000000011'))

    pg.evaluate("M['00000001-aaaa-4bbb-8ccc-000000000011'].app_status='active'; window.__axisOn=true; drawCircle()"); pg.wait_for_timeout(40)
    ck('the Care circle line says the welcome hasn\'t gone yet', 'Welcome not sent yet' in pg.inner_text('#fam-cp_-00000001-aaaa-4bbb-8ccc-000000000011'))
    pg.click('#fam-cp_-00000001-aaaa-4bbb-8ccc-000000000011 button:has-text("Send welcome")'); pg.wait_for_timeout(80)
    t = pg.inner_text('#famwel-cp_-00000001-aaaa-4bbb-8ccc-000000000011')
    ck('welcome: first asks how the client schedules care (three choices, none picked), no words and no Send yet', 'How will this client schedule their care?' in t and 'Regular Scheduled Care' in t and 'Flexible Booking Care' in t and 'Combination of Both' in t and 'Pick one to see the welcome' in t
       and pg.query_selector('#famwel-cp_-00000001-aaaa-4bbb-8ccc-000000000011 input[type=radio]:checked') is None and pg.query_selector('#famwel-cp_-00000001-aaaa-4bbb-8ccc-000000000011 button:has-text("Send welcome")') is None, t)
    pg.check('#famwel-cp_-00000001-aaaa-4bbb-8ccc-000000000011 input[value=flexible]'); pg.wait_for_timeout(100)
    t = pg.inner_text('#famwel-cp_-00000001-aaaa-4bbb-8ccc-000000000011')
    ck('picking Flexible: that version\'s text and email preview, the AxisCare check, how it goes', pg.input_value('#famwt-cp_-00000001-aaaa-4bbb-8ccc-000000000011') == 'Hi Ann, long flexible with 16485.axiscare.com.' and 'is on AxisCare' in t and 'Goes by email' in t and pg.query_selector('#famwel-cp_-00000001-aaaa-4bbb-8ccc-000000000011 iframe') is not None
       and {'action': 'welcome', 'contact_id': '00000001-aaaa-4bbb-8ccc-000000000011', 'kind': 'flexible'} in [c[1] for c in pg.evaluate('__calls')], t)
    pg.uncheck('#famwax-cp_-00000001-aaaa-4bbb-8ccc-000000000011'); ck('unticking the AxisCare part swaps to the short words', pg.input_value('#famwt-cp_-00000001-aaaa-4bbb-8ccc-000000000011') == 'Hi Ann, short flexible.')
    pg.fill('#famwt-cp_-00000001-aaaa-4bbb-8ccc-000000000011', 'My own words'); pg.check('#famwax-cp_-00000001-aaaa-4bbb-8ccc-000000000011'); ck('words the office changed are never overwritten', pg.input_value('#famwt-cp_-00000001-aaaa-4bbb-8ccc-000000000011') == 'My own words')
    pg.click('#famwel-cp_-00000001-aaaa-4bbb-8ccc-000000000011 button:has-text("Send welcome")'); pg.wait_for_timeout(120)
    ck('send: the chosen version and the office\'s words go', pg.evaluate('__calls')[-1][1] == {'action': 'welcome', 'contact_id': '00000001-aaaa-4bbb-8ccc-000000000011', 'send': True, 'kind': 'flexible', 'again': False, 'text': 'My own words', 'include_axis': True})
    pg.wait_for_timeout(60)
    ck('the Care circle line shows when, who and which version', 'Welcome sent' in pg.inner_text('#fam-cp_-00000001-aaaa-4bbb-8ccc-000000000011') and 'by Krystal (Flexible, email)' in pg.inner_text('#fam-cp_-00000001-aaaa-4bbb-8ccc-000000000011'), pg.inner_text('#fam-cp_-00000001-aaaa-4bbb-8ccc-000000000011'))
    pg.evaluate("window.__sent={at:'2099-01-02T15:14:00Z',by:'Krystal',version:'flexible'}; window.__savedKind='flexible'")
    pg.click('#fam-cp_-00000001-aaaa-4bbb-8ccc-000000000011 button:has-text("Send welcome")'); pg.wait_for_timeout(100)
    t = pg.inner_text('#famwel-cp_-00000001-aaaa-4bbb-8ccc-000000000011')
    ck('opening it again: says it was already sent (when, who, version), the saved version is picked, the button says Send it again', 'Already sent' in t and 'by Krystal (Flexible)' in t and pg.is_checked('#famwel-cp_-00000001-aaaa-4bbb-8ccc-000000000011 input[value=flexible]') and pg.query_selector('#famwel-cp_-00000001-aaaa-4bbb-8ccc-000000000011 button:has-text("Send it again")') is not None, t)
    pg.evaluate("window.__sent=null; window.__hipaa=false; window.__axisOn=false"); pg.click('#fam-cp_-00000001-aaaa-4bbb-8ccc-000000000011 button:has-text("Send welcome")'); pg.wait_for_timeout(30); pg.click('#fam-cp_-00000001-aaaa-4bbb-8ccc-000000000011 button:has-text("Send welcome")'); pg.wait_for_timeout(100)
    t = pg.inner_text('#famwel-cp_-00000001-aaaa-4bbb-8ccc-000000000011')
    ck('no HIPAA permission: said plainly, no Send button; email not on AxisCare: warned, AxisCare part off', 'No HIPAA permission' in t and pg.query_selector('#famwel-cp_-00000001-aaaa-4bbb-8ccc-000000000011 button:has-text("Send")') is None and "isn't on Dorothy's AxisCare record" in t and not pg.is_checked('#famwax-cp_-00000001-aaaa-4bbb-8ccc-000000000011'), t)
    # her rule 2026-10-23: HIPAA OK in the Hub (who and when); AxisCare's explicit No still wins
    W_ = '#famwel-cp_-00000001-aaaa-4bbb-8ccc-000000000011'
    hb = W_ + ' button:has-text("gave HIPAA permission")'
    ck('no HIPAA on file: a button to mark HIPAA OK in the Hub', pg.query_selector(hb) is not None, pg.inner_text(W_))
    n = len(pg.evaluate('__calls')); pg.click(hb); pg.wait_for_timeout(40)
    ck('HIPAA OK asks once first (nothing sent yet)', len(pg.evaluate('__calls')) == n and 'Press again to confirm' in pg.inner_text(W_))
    pg.click(W_ + ' button:has-text("Press again to confirm")'); pg.wait_for_timeout(150)
    t = pg.inner_text(W_)
    ck('second press: recorded through the office door, the welcome reopens with who marked it and a Send button', {'action': 'hipaa_ok', 'contact_id': '00000001-aaaa-4bbb-8ccc-000000000011', 'on': True} in [c[1] for c in pg.evaluate('__calls')] and 'HIPAA OK marked in the Hub by Krystal' in t and 'No HIPAA permission' not in t and pg.query_selector(W_ + ' button:has-text("Send welcome")') is not None, t)
    ck('the Care circle line says HIPAA OK in the Hub, and by whom', 'HIPAA OK in the Hub (Krystal)' in pg.inner_text('#fam-cp_-00000001-aaaa-4bbb-8ccc-000000000011'), pg.inner_text('#fam-cp_-00000001-aaaa-4bbb-8ccc-000000000011'))
    pg.click(W_ + ' button:has-text("Take it back")'); pg.wait_for_timeout(150)
    t = pg.inner_text(W_)
    ck('Take it back: recorded, the welcome shows no HIPAA permission again', {'action': 'hipaa_ok', 'contact_id': '00000001-aaaa-4bbb-8ccc-000000000011', 'on': False} in [c[1] for c in pg.evaluate('__calls')] and 'No HIPAA permission' in t and pg.query_selector(W_ + ' button:has-text("Send welcome")') is None, t)
    pg.evaluate("window.__hipaaAxis=false; M['00000001-aaaa-4bbb-8ccc-000000000011'].hipaa_office_ok_at='2099-01-02T16:00:00Z'; M['00000001-aaaa-4bbb-8ccc-000000000011'].hipaa_office_ok_by='Krystal'")
    pg.click('#fam-cp_-00000001-aaaa-4bbb-8ccc-000000000011 button:has-text("Send welcome")'); pg.wait_for_timeout(30); pg.click('#fam-cp_-00000001-aaaa-4bbb-8ccc-000000000011 button:has-text("Send welcome")'); pg.wait_for_timeout(120)
    t = pg.inner_text(W_)
    ck('AxisCare says No: even with a Hub OK, no Send and no HIPAA OK button; says to change it in AxisCare', 'AxisCare says' in t and 'change it in AxisCare' in t and pg.query_selector(hb) is None and pg.query_selector(W_ + ' button:has-text("Send welcome")') is None, t)
    pg.evaluate("window.__hipaaAxis=undefined; M['00000001-aaaa-4bbb-8ccc-000000000011'].hipaa_office_ok_at=null; M['00000001-aaaa-4bbb-8ccc-000000000011'].hipaa_office_ok_by=null")
    pg.evaluate("M['00000001-aaaa-4bbb-8ccc-000000000011'].welcome_sent_at=null")
    pg.click('#famwel-cp_-00000001-aaaa-4bbb-8ccc-000000000011 button:has-text("No welcome for this person")'); pg.wait_for_timeout(40); pg.fill('#famwskr-cp_-00000001-aaaa-4bbb-8ccc-000000000011', 'Live-in client'); pg.click('#famwsk-cp_-00000001-aaaa-4bbb-8ccc-000000000011 button:has-text("Save")'); pg.wait_for_timeout(100)
    ck('"No welcome for this person" with a reason: recorded, shown on the line', {'action': 'welcome_skip', 'contact_id': '00000001-aaaa-4bbb-8ccc-000000000011', 'on': True, 'reason': 'Live-in client'} in [c[1] for c in pg.evaluate('__calls')] and 'No welcome: Live-in client' in pg.inner_text('#fam-cp_-00000001-aaaa-4bbb-8ccc-000000000011'), pg.inner_text('#fam-cp_-00000001-aaaa-4bbb-8ccc-000000000011'))
    pg.evaluate("window.__hipaa=true; window.__axisOn=true; window.__savedKind=null")
    pg.evaluate('FAMAPP.render()'); pg.wait_for_timeout(80)
    t = pg.inner_text('#famBookings')
    ck('bookings: practice mode said plainly, settings shown', 'Practice mode' in t and "caregivers aren't asked and nothing is scheduled" in t and 'service PP - WC' in t and 'rate not set' in t, t)
    ck('bookings: needs-you count 3 (incl. the held one), placed 1, cancelled tucked away, badge 3', 'Needs you (3)' in t and 'Coming up, caregiver placed (1)' in t and 'Practice, cancelled and past (1)' in t and pg.inner_text('#famPillBadge') == '3', t)
    ck('bookings: reason shown on the one that needs the office, note shown', 'no app service is set for OK' in t and 'Note: Soup please' in t)
    opts = pg.eval_on_selector_all('#famcg-b2 option', 'os => os.map(o => o.textContent)')
    ck('caregiver picker: active caregivers with an AxisCare id, each once', opts == ['Pick a caregiver…', 'Maria Lopez'], opts)
    pg.click('#famb-b2 button:has-text("Place and put on AxisCare")'); pg.wait_for_timeout(40)
    ck('place without picking: asks, sends nothing', 'Pick a caregiver first' in pg.inner_text('#famb-b2') and not any(c[1].get('action') == 'place' for c in pg.evaluate('__calls')))
    pg.select_option('#famcg-b2', '88'); pg.click('#famb-b2 button:has-text("Place and put on AxisCare")'); pg.wait_for_timeout(120)
    t = pg.inner_text('#famBookings')
    ck('place: calls the door with the caregiver, list refreshes, Needs you drops to 2', any(c[1].get('action') == 'place' and c[1].get('booking_id') == 'b2' and c[1].get('caregiver_axiscare_id') == '88' and not c[1].get('start') for c in pg.evaluate('__calls')) and 'Needs you (2)' in t and 'Coming up, caregiver placed (2)' in t, t)
    # Release 1 (2026-10-17): no "Put it on the AxisCare schedule" (no empty visits); a request needing the office gets the Place picker
    ck('Release 1: no empty-visit button anywhere; the needs-office request offers Place instead', 'Put it on the AxisCare schedule' not in pg.inner_text('#famBookings') and pg.query_selector('#famcg-b1') is not None)
    # Release 3 (2026-10-17): held requests, Help us fill, app tasks
    t5 = pg.inner_text('#famb-b5')
    ck('Release 3: a held request is in Needs you with its reason and Approve / Approve without the note / Decline', 'Check before caregivers are asked' in t5 and 'personal care' in t5 and 'Approve without the note' in t5 and 'Decline' in t5, t5)
    pg.click('#famb-b5 button:has-text("Decline")'); pg.wait_for_timeout(40)
    ck('Release 3: Decline without a reason asks for one, sends nothing', 'Say why' in pg.inner_text('#famb-b5') and not any(c[1].get('action') == 'review' for c in pg.evaluate('__calls')))
    pg.click('#famb-b5 button:has-text("Approve without the note")'); pg.wait_for_timeout(120)
    ck('Release 3: Approve without the note calls the door', {'action': 'review', 'booking_id': 'b5', 'decision': 'approve_no_note', 'reason': ''} in [c[1] for c in pg.evaluate('__calls')])
    pg.click('button:has-text("Turn on for 90 days")'); pg.wait_for_timeout(40)
    ck('Release 3: Help us fill needs a reason first', 'Say why this client needs it' in pg.inner_text('#famBookings'))
    pg.fill('#famhf-c1', 'Respite for her daughter'); pg.click('button:has-text("Turn on for 90 days")'); pg.wait_for_timeout(120)
    ck('Release 3: Help us fill on, shown with its date and reason', 'on until 2099-01-01 (Respite for her daughter)' in pg.inner_text('#famBookings'), pg.inner_text('#famBookings')[-600:])
    # Her check 2026-10-17: with caregiver offers ON, routine requests are listed, not counted; late charges are a list
    pg.evaluate("window.DATA.ops_settings.family_offer_live = true; B.push({ id: 'b6', client_name: 'Dorothy Ray', visit_date: '2099-01-03', start_time: '09:00', end_time: '11:00', hours: 2, tasks: ['Companionship'], status: 'cancelled', state: 'MO', late_charge_hours: 2, late_pay_caregiver: 'Maria L.' })")
    pg.evaluate('FAMAPP.render()'); pg.wait_for_timeout(120)
    t = pg.inner_text('#famBookings')
    ck('offers on: routine requests are under "Asking caregivers, nothing for you to do", not Needs you; the badge counts only what needs a person', 'Asking caregivers, nothing for you to do (1)' in t and 'Needs you (1)' in t and pg.inner_text('#famPillBadge') == '1', [l for l in t.split(chr(10)) if 'Needs you' in l or 'Asking caregivers' in l] + [pg.inner_text('#famPillBadge')])
    ck('offers on: the settings line no longer says the office gets a card for every unfilled request', 'You get a card if nobody' not in t and 'ends on its own' in t)
    ck('late cancel charges are a billing list with "Added to invoice", not a card', 'Late cancels to bill this week (1)' in t and 'charge 2 hours, pay Maria L. 2 hours' in t, t[-700:])
    pg.click('#famlate-b6 button'); pg.wait_for_timeout(120)
    ck('"Added to invoice" takes it off the list', 'Late cancels to bill' not in pg.inner_text('#famBookings'))
    # Release 2 (2026-10-17): the 10-minute AxisCare check, shown to the office
    pg.click('summary:has-text("Practice, cancelled and past")'); pg.wait_for_timeout(40)
    t3, t4 = pg.inner_text('#famb-b3'), pg.inner_text('#famb-b4')
    ck('Release 2: a caregiver taken off in AxisCare is shown, with who covers it', 'No caregiver on it in AxisCare' in t3 and 'Maria L. came off this visit in AxisCare' in t3 and "can\'t promise one" in t3, t3)
    ck('Release 2: removed in AxisCare (not by the family): call them with the reason', 'Removed in AxisCare' in t4 and 'please call them with the reason' in t4, t4)
    ck('no page errors', not errs, errs)
    b.close()
for r in R: print(('  ✓ ' if r[0] == 'PASS' else '  ✗ ') + r[1] + ('' if r[0] == 'PASS' else '\n      ' + r[2]))
print(f"\n  family app 1c: {sum(1 for r in R if r[0] == 'PASS')}/{len(R)} passed")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

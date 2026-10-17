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
ck('index: in the Scheduling group, titled, rendered on open', "'evv','familybookings','carematch'" in HTML and "familybookings:'Family bookings'" in HTML and "activeTab==='familybookings' && window.FAMAPP) FAMAPP.render()" in HTML)
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
const M = { 9: { id: 9, name: 'Lisa Ray', email: 'lisa@x.test', app_status: null, app_can_book: false }, 10: { id: 10, name: 'Tom Ray', email: '' }, 11: { id: 11, name: 'Ann', email: 'a@x.test', app_status: 'active', app_can_book: true } };
const B = [
  { id: 'b1', client_name: 'Dorothy Ray', visit_date: '2099-01-05', start_time: '10:00', end_time: '13:00', hours: 3, tasks: ['Companionship'], requested_by_name: 'Lisa Ray', who: 'regular', status: 'needs_office', error: 'no app service is set for OK in the Hub settings', state: 'OK', note: 'Soup please' },
  { id: 'b2', client_name: 'Dorothy Ray', visit_date: '2099-01-06', start_time: '09:00', end_time: '11:00', hours: 2, tasks: ['Errands and shopping'], requested_by_name: 'Lisa Ray', who: 'any', status: 'waiting_for_caregiver', axiscare_visit_id: 'v=5:s=0:d=2099-01-06', state: 'MO' },
  { id: 'b3', client_name: 'Dorothy Ray', visit_date: '2099-01-07', start_time: '09:00', end_time: '11:00', hours: 2, tasks: ['Companionship'], status: 'placed', caregiver_name: 'Maria L.', state: 'MO', sync_state: 'no_caregiver', sync_note: 'Maria L.' },
  { id: 'b4', client_name: 'Dorothy Ray', visit_date: '2099-01-08', start_time: '09:00', end_time: '11:00', hours: 2, tasks: ['Companionship'], status: 'cancelled', state: 'MO', cancel_source: 'office' } ];
window.callAction = async (fn, body) => {
  __calls.push([fn, body]); await new Promise(r => setTimeout(r, 5));
  if (fn !== 'family-app-office') return { status: 404, data: { error: 'wrong door' } };
  const a = body.action;
  if (a === 'list') return { status: 200, data: { members: [{ name: 'Ann', client_name: 'Dorothy Ray', status: 'active', can_book: true }], bookings: B } };
  if (a === 'invite') { M[body.contact_id].app_status = 'active'; M[body.contact_id].app_can_book = true; return { status: 200, data: { ok: true, words: 'Hi Lisa, you can now see Dorothy Ray\\'s visits and book extra visits at family.mo-care.com.' } } }
  if (a === 'can_book') { M[body.contact_id].app_can_book = body.on; return { status: 200, data: { ok: true } } }
  if (a === 'revoke') { M[body.contact_id].app_status = 'revoked'; return { status: 200, data: { ok: true } } }
  if (a === 'welcome' && !body.send) return { status: 200, data: { preview: true, name: M[body.contact_id].name, can_text: false, can_email: true, axis_email_on_file: window.__axisOn, include_axis: window.__axisOn !== false,
      text: window.__axisOn === false ? 'Hi Ann, short.' : 'Hi Ann, long with 16485.axiscare.com.', text_with_axis: 'Hi Ann, long with 16485.axiscare.com.', text_without_axis: 'Hi Ann, short.', email_subject: 'Your Caring Companions family access for Dorothy' } };
  if (a === 'welcome' && body.send) return { status: 200, data: { ok: true, by_text: false, by_email: true } };
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
    ck('circle: invite button for someone with an email; Tom needs an email; Ann shows on + can book', 'Invite to the family app' in t and 'add an email to invite them' in t and 'Family app: on' in t and 'can book visits' in t, t)
    pg.click('#fam-cp_-9 button'); pg.wait_for_timeout(80)
    t = pg.inner_text('#cp_cl360Circle')
    calls = pg.evaluate('__calls')
    ck('invite: calls the office door, reloads the card, shows the words with "Nothing was sent"', calls[-1] == ['family-app-office', {'action': 'invite', 'contact_id': 9, 'can_book': True}] and 'Nothing was sent' in t and 'family.mo-care.com' in t and 'Lisa Ray' in t and 'Family app: on' in pg.inner_text('#fam-cp_-9'), [calls, t])
    pg.click('#fam-cp_-11 button:has-text("Turn booking off")'); pg.wait_for_timeout(80)
    ck('booking off for one person', pg.evaluate('__calls')[-1][1] == {'action': 'can_book', 'contact_id': 11, 'on': False} and "can't book" in pg.inner_text('#fam-cp_-11'))
    n = len(pg.evaluate('__calls'))
    pg.click('#fam-cp_-11 button:has-text("Turn app off")'); pg.wait_for_timeout(40)
    ck('turn off asks once first (nothing sent yet)', len(pg.evaluate('__calls')) == n and 'Press Turn app off again' in pg.inner_text('#fam-cp_-11'))
    pg.click('#fam-cp_-11 button:has-text("Turn app off")'); pg.wait_for_timeout(80)
    ck('turn off: done on the second press; Turn on again offered', pg.evaluate('__calls')[-1][1] == {'action': 'revoke', 'contact_id': 11} and 'Turn on again' in pg.inner_text('#fam-cp_-11'))

    pg.evaluate("M[11].app_status='active'; window.__axisOn=true; drawCircle()"); pg.wait_for_timeout(40)
    pg.click('#fam-cp_-11 button:has-text("Send welcome")'); pg.wait_for_timeout(80)
    t = pg.inner_text('#famwel-cp_-11')
    ck('welcome: preview with the AxisCare check, editable text, how it goes, nothing sent yet', 'is on AxisCare' in t and 'Goes by email' in t and 'no phone with Texts OK' in t and pg.input_value('#famwt-cp_-11').startswith('Hi Ann, long') and pg.evaluate('__calls')[-1][1] == {'action': 'welcome', 'contact_id': 11}, t)
    pg.uncheck('#famwax-cp_-11'); ck('unticking the AxisCare part swaps to the short words', pg.input_value('#famwt-cp_-11') == 'Hi Ann, short.')
    pg.fill('#famwt-cp_-11', 'My own words'); pg.check('#famwax-cp_-11'); ck('words the office changed are never overwritten', pg.input_value('#famwt-cp_-11') == 'My own words')
    pg.click('#famwel-cp_-11 button:has-text("Send welcome")'); pg.wait_for_timeout(80)
    ck('send: the office\'s words go, result shown', pg.evaluate('__calls')[-1][1] == {'action': 'welcome', 'contact_id': 11, 'send': True, 'text': 'My own words', 'include_axis': True} and 'Sent by email' in pg.inner_text('#famwel-cp_-11'))
    pg.evaluate("window.__axisOn=false"); pg.click('#fam-cp_-11 button:has-text("Send welcome")'); pg.wait_for_timeout(30); pg.click('#fam-cp_-11 button:has-text("Send welcome")'); pg.wait_for_timeout(80)
    t = pg.inner_text('#famwel-cp_-11')
    ck('email not on AxisCare: warned, AxisCare part off by default', "isn't on their AxisCare record" in t and not pg.is_checked('#famwax-cp_-11'), t)
    pg.evaluate('FAMAPP.render()'); pg.wait_for_timeout(80)
    t = pg.inner_text('#famBookings')
    ck('bookings: practice mode said plainly, settings shown', 'Practice mode' in t and "caregivers aren't asked and nothing is scheduled" in t and 'service PP - WC' in t and 'rate not set' in t, t)
    ck('bookings: needs-you count 2, placed 1, cancelled tucked away, badge 2', 'Needs you (2)' in t and 'Coming up, caregiver placed (1)' in t and 'Practice, cancelled and past (1)' in t and pg.inner_text('#famPillBadge') == '2', t)
    ck('bookings: reason shown on the one that needs the office, note shown', 'no app service is set for OK' in t and 'Note: Soup please' in t)
    opts = pg.eval_on_selector_all('#famcg-b2 option', 'os => os.map(o => o.textContent)')
    ck('caregiver picker: active caregivers with an AxisCare id, each once', opts == ['Pick a caregiver…', 'Maria Lopez'], opts)
    pg.click('#famb-b2 button:has-text("Place and put on AxisCare")'); pg.wait_for_timeout(40)
    ck('place without picking: asks, sends nothing', 'Pick a caregiver first' in pg.inner_text('#famb-b2') and not any(c[1].get('action') == 'place' for c in pg.evaluate('__calls')))
    pg.select_option('#famcg-b2', '88'); pg.click('#famb-b2 button:has-text("Place and put on AxisCare")'); pg.wait_for_timeout(120)
    t = pg.inner_text('#famBookings')
    ck('place: calls the door with the caregiver, list refreshes, Needs you drops to 1', {'action': 'place', 'booking_id': 'b2', 'caregiver_axiscare_id': '88'} in [c[1] for c in pg.evaluate('__calls')] and 'Needs you (1)' in t and 'Coming up, caregiver placed (2)' in t, t)
    # Release 1 (2026-10-17): no "Put it on the AxisCare schedule" (no empty visits); a request needing the office gets the Place picker
    ck('Release 1: no empty-visit button anywhere; the needs-office request offers Place instead', 'Put it on the AxisCare schedule' not in pg.inner_text('#famBookings') and pg.query_selector('#famcg-b1') is not None)
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

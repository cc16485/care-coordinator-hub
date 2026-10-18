"""2026-10-18 her ask: the Booking App line (Invite and send welcome) under each person on the Family Circles tab too.
Runs the REAL fcRender / fcCircleHtml / fcCircleBody from index.html with the REAL family-app-panel.js in a browser, against a
stand-in family-app-office door. FAKE people only; nothing reaches production.
   python3 tests/browser/fc_welcome_buttons_look.py"""
import os, re, tempfile
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PANEL = open(os.path.join(ROOT, 'family-app-panel.js')).read()
HTML = open(os.path.join(ROOT, 'index.html')).read()
R = []
def ck(n, c, d=''): R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:700]))

i = HTML.index('function fcRender(){'); j = HTML.index('/* Change 6a: a circle is created FOR a client')
FCJS = HTML[i:j]
ck('index: the list registers its reload for the app line', "FAMAPP.register('fcl_', fcLoad)" in FCJS)
ck('index: the list never hands map()\'s array to fcCircleHtml as inProfile', '.map(fcCircleHtml)' not in FCJS)
ck('index: not drawn inside the profile (its Care circle card has it)', "!inProfile && linked && window.FAMAPP" in FCJS and "fcCircleBody(c, people, linked, esc, true)" in FCJS)

PAGE = """<!doctype html><meta charset=utf-8><body>
<div id="leadProfileView" style="display:none"></div><div id="cp_c_family"></div><div id="fcList"></div>
<script>
const escapeHtmlComms = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fcRecogChip = () => ''; const famMount = () => {};
let FC_PROFILE = null, FC = [], FC_CONTACTS = {}, renders = 0;
const M = { 9: { id: 9, circle_id: 'c1', name: 'Lisa Ray', email: 'lisa@x.test', app_status: null },
            10: { id: 10, circle_id: 'c1', name: 'Tom Ray', email: '' },
            11: { id: 11, circle_id: 'c1', name: 'Ann Ray', email: 'a@x.test', app_status: 'active', app_can_book: true, welcome_sent_at: '2099-01-02T15:14:00Z', welcome_version: 'regular' },
            12: { id: 12, circle_id: 'c2', name: 'Nora Free', email: 'n@x.test' } };
async function fcLoad() {
  renders++;
  FC = [{ id: 'c1', client_name: 'Dorothy Ray', axiscare_client_id: '55' }, { id: 'c2', client_name: 'Not Linked', axiscare_client_id: null }];
  FC_CONTACTS = {}; Object.values(M).forEach(x => (FC_CONTACTS[x.circle_id] = FC_CONTACTS[x.circle_id] || []).push(Object.assign({}, x)));
  fcRender();
}
window.__calls = [];
window.callAction = async (fn, body) => {
  __calls.push([fn, body]);
  if (body.action === 'invite') { M[body.contact_id].app_status = 'active'; M[body.contact_id].app_can_book = true; return { status: 200, data: { ok: true } } }
  if (body.action === 'welcome') return { status: 200, data: { preview: true, name: M[body.contact_id].name, client: 'Dorothy', can_text: false, can_email: true, hipaa_ok: true, include_axis: true, axis_email_on_file: true,
    kinds: [{ key: 'regular', label: 'Regular Scheduled Care' }], kind: 'regular', text: 'Hi Lisa', email_subject: 'Welcome', email_html: '<p>x</p>' } };
  return { status: 400, data: { error: 'unknown' } };
};
</script>
<script>const FAM={ cache:{} };</script>
<script>__PANEL__</script>
<script>__FC__</script>
<script>fcLoad();</script>
"""
tmp = tempfile.mkdtemp(prefix='fcwel-')
page = os.path.join(tmp, 'page.html'); open(page, 'w').write(PAGE.replace('__PANEL__', PANEL).replace('__FC__', FCJS))
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + page); pg.wait_for_timeout(50)
    c1 = pg.locator('details[data-fc="c1"]'); c2 = pg.locator('details[data-fc="c2"]')
    ck('the list shows each circle closed, under the client\'s name', 'Dorothy Ray' in c1.locator('summary').inner_text() and not c1.evaluate('d => d.open') and not c2.evaluate('d => d.open'), c1.locator('summary').inner_text())
    c1.locator('summary').click(); pg.wait_for_timeout(30)
    t = c1.inner_text()
    ck('linked circle: Lisa gets Invite and send welcome', c1.locator('#fam-fcl_-9 button', has_text='Invite and send welcome').count() == 1, t)
    ck('linked circle: Tom needs an email first', 'add an email to invite them' in t, t)
    ck('linked circle: Ann shows app on + welcome sent + Send welcome again', 'Booking App: on' in t and 'Welcome sent' in t and c1.locator('#fam-fcl_-11 button', has_text='Send welcome').count() == 1, t)
    ck('a circle not linked to a client shows no app buttons', 'Invite' not in c2.inner_text() and 'Booking App' not in c2.inner_text(), c2.inner_text())
    c1.locator('#fam-fcl_-9 button', has_text='Invite and send welcome').click(); pg.wait_for_timeout(150)
    ck('pressing it invites them (can book) and asks for the welcome preview', [c[1]['action'] for c in pg.evaluate('__calls')][:2] == ['invite', 'welcome'] and pg.evaluate('__calls')[0][1].get('can_book') is True, pg.evaluate('__calls'))
    ck('the list reloaded and the circle STAYED open', pg.evaluate('renders') == 2 and c1.evaluate('d => d.open'))
    ck('the welcome preview opens under Lisa, nothing sent yet', pg.locator('#famwel-fcl_-9').is_visible() and 'Nothing is sent until you press Send welcome' in pg.inner_text('#famwel-fcl_-9'), pg.locator('#famwel-fcl_-9').count())
    ck('Lisa now shows Booking App: on', 'Booking App: on' in pg.inner_text('#fam-fcl_-9'))
    # inside the client profile the circle is drawn by fcCircleHtml(.., true): no duplicate app line there
    pg.evaluate("document.getElementById('leadProfileView').style.display='block'; FC_PROFILE={ el:'cp_c_family', ax:'55' }; fcRender();")
    ck('inside the profile: no app line in the Family Circle box (the Care circle card has it)', 'Invite' not in pg.inner_text('#cp_c_family') and 'Lisa Ray' in pg.inner_text('#cp_c_family'), pg.inner_text('#cp_c_family'))
    ck('no page errors', not errs, errs)
    b.close()
for r in R: print(r[0], r[1], ('  ' + r[2]) if r[2] else '')
f = sum(1 for r in R if r[0] == 'FAIL'); print(f'\n{len(R) - f}/{len(R)} passed'); raise SystemExit(1 if f else 0)

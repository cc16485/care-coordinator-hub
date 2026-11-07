"""The AxisCare welcome line under each person on the Family Circles tab (2026-11-07: the Booking App lines are gone).
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
ck('index: the list registers its reload for the welcome line', "FAMAPP.register('fcl_', fcLoad)" in FCJS)
ck('index: the list never hands map()\'s array to fcCircleHtml as inProfile', '.map(fcCircleHtml)' not in FCJS)
ck('index: drawn inside the profile too (its Family tab shows this box)', "+ (linked && window.FAMAPP && FAMAPP.circleLine ?" in FCJS and "FAMAPP.circleLine(p, 'fcl_', c)" in FCJS and 'bookingSwitch' not in HTML and 'Booking App' not in PANEL.split('*/', 1)[1])
ck('index: the profile has no family slot for Client 360\'s card, so this box is the only one', "const slots=['summary','start','care','team','home','history'];" in HTML)

PAGE = """<!doctype html><meta charset=utf-8><body>
<div id="leadProfileView" style="display:none"></div><div id="cp_c_family"></div><div id="fcList"></div>
<script>
const escapeHtmlComms = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fcRecogChip = () => ''; const famMount = () => {};
let FC_PROFILE = null, FC = [], FC_CONTACTS = {}, renders = 0;
const M = { '00000009-aaaa-4bbb-8ccc-000000000009': { id: '00000009-aaaa-4bbb-8ccc-000000000009', circle_id: 'c1', name: 'Lisa Ray', email: 'lisa@x.test' },
            '00000000-aaaa-4bbb-8ccc-000000000010': { id: '00000000-aaaa-4bbb-8ccc-000000000010', circle_id: 'c1', name: 'Tom Ray', email: '' },
            '00000001-aaaa-4bbb-8ccc-000000000011': { id: '00000001-aaaa-4bbb-8ccc-000000000011', circle_id: 'c1', name: 'Ann Ray', email: 'a@x.test' },
            '00000002-aaaa-4bbb-8ccc-000000000012': { id: '00000002-aaaa-4bbb-8ccc-000000000012', circle_id: 'c2', name: 'Nora Free', email: 'n@x.test' } };
async function fcLoad() {
  renders++;
  FC = [{ id: 'c1', client_name: 'Dorothy Ray', axiscare_client_id: '55' }, { id: 'c2', client_name: 'Not Linked', axiscare_client_id: null }];
  FC_CONTACTS = {}; Object.values(M).forEach(x => (FC_CONTACTS[x.circle_id] = FC_CONTACTS[x.circle_id] || []).push(Object.assign({}, x)));
  fcRender();
}
window.__calls = [];
window.callAction = async (fn, body) => {
  __calls.push([fn, body]);
  if (body.action === 'axis_welcome') return { status: 200, data: { name: M[body.contact_id].name, hipaa_ok: true, axis_email_on_file: true, email_subject: 'Welcome', email_html: '<p>x</p>' } };
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
    ck('linked circle: Lisa (email) gets the AxisCare welcome line with Send AxisCare welcome', c1.locator('#famax-fcl_-00000009-aaaa-4bbb-8ccc-000000000009 button', has_text='Send AxisCare welcome').count() == 1, t)
    ck('linked circle: Tom needs an email first', 'Add an email for the AxisCare welcome' in t, t)
    ck('linked circle: Ann gets the AxisCare welcome line too', c1.locator('#famax-fcl_-00000001-aaaa-4bbb-8ccc-000000000011 button', has_text='Send AxisCare welcome').count() == 1, t)
    ck('2026-11-07: no Booking App anywhere (no switch, no invite, no app email)', 'Booking App' not in t and 'Invite' not in t and 'Booking App' not in c2.inner_text(), t)
    c1.locator('#famax-fcl_-00000009-aaaa-4bbb-8ccc-000000000009 button', has_text='Send AxisCare welcome').click(); pg.wait_for_timeout(150)
    ck('pressing Send AxisCare welcome asks only for the AxisCare preview', [c[1]['action'] for c in pg.evaluate('__calls')] == ['axis_welcome'], pg.evaluate('__calls'))
    ck('the AxisCare preview opens under Lisa, nothing sent yet', pg.locator('#famaxw-fcl_-00000009-aaaa-4bbb-8ccc-000000000009').is_visible() and 'AxisCare welcome for Lisa Ray' in pg.inner_text('#famaxw-fcl_-00000009-aaaa-4bbb-8ccc-000000000009'), pg.locator('#famaxw-fcl_-00000009-aaaa-4bbb-8ccc-000000000009').count())
    # inside the client profile the circle is drawn by fcCircleHtml(.., true): no duplicate line there
    pg.evaluate("document.getElementById('leadProfileView').style.display='block'; FC_PROFILE={ el:'cp_c_family', ax:'55' }; fcRender();")
    ck('inside the profile: Lisa has the AxisCare welcome line; Tom needs an email; no Booking App', pg.locator('#cp_c_family #famax-fcl_-00000009-aaaa-4bbb-8ccc-000000000009 button', has_text='Send AxisCare welcome').count() == 1 and 'Add an email for the AxisCare welcome' in pg.inner_text('#cp_c_family') and 'Booking App' not in pg.inner_text('#cp_c_family'), pg.inner_text('#cp_c_family'))
    ck('inside the profile: the list leaves that circle out, so no doubled ids', pg.locator('[id="famax-fcl_-00000009-aaaa-4bbb-8ccc-000000000009"]').count() == 1)
    ck('no page errors', not errs, errs)
    b.close()
for r in R: print(r[0], r[1], ('  ' + r[2]) if r[2] else '')
f = sum(1 for r in R if r[0] == 'FAIL'); print(f'\n{len(R) - f}/{len(R)} passed'); raise SystemExit(1 if f else 0)

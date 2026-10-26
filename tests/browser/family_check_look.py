"""2026-10-18 her ask: Family Circles check page in Client Care (family-check.js). Runs the REAL file in a browser with a stand-in
database and the Hub's real naSyncLine. FAKE people only; nothing reaches production.
   python3 tests/browser/family_check_look.py"""
import os, re, subprocess, tempfile
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
JS = open(os.path.join(ROOT, 'family-check.js')).read()
HTML = open(os.path.join(ROOT, 'index.html')).read()
R = []
def ck(n, c, d=''): R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:900]))

ck('index: Family Circles pill in Client Care, after Clients', re.search(r"data-tab=\"clientsboard\"[^\n]*\n[^\n]*\n\s*<div class=\"fpill\" data-tab=\"fccheck\"", HTML) and "clients:['soc','clientqueue','clientsboard','fccheck','carelibrary']" in HTML)
ck('index: page, title and loader', 'id="tab-fccheck"' in HTML and 'id="fck_box"' in HTML and "fccheck:'Family Circles'" in HTML and "sc.src='family-check.js?v=" in HTML)
ck('index: the retired circles tab still redirects (not brought back)', "circles:'clientsboard'" in HTML)
ck('no em dashes', '—' not in JS)
ck('read only: the page writes nothing', not re.search(r"\.(insert|update|upsert|delete)\(", JS))
tmp = tempfile.mkdtemp(prefix='fck-')
scripts = re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', HTML, re.S); bad = []
for i, sc in enumerate(scripts):
    f = os.path.join(tmp, f's{i}.js'); open(f, 'w').write(sc)
    if subprocess.run(['node', '--check', f], capture_output=True).returncode: bad.append(i)
f = os.path.join(tmp, 'fck.js'); open(f, 'w').write(JS); 
ck(f'all {len(scripts)} inline scripts + family-check.js parse', not bad and subprocess.run(['node', '--check', f], capture_output=True).returncode == 0, bad)
i = HTML.index('async function naBeatLoad(){'); j = HTML.index('async function naLoad(){')
NA = HTML[i:j]

PAGE = """<!doctype html><meta charset=utf-8><body><div id="fck_box"></div>
<script>
const escapeHtmlComms = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const NA = {};
const T = {
  care_circles: [{ id: 'c1', client_name: 'Dorothy Ray', axiscare_client_id: '55', active: true }, { id: 'c2', client_name: 'Good Family', axiscare_client_id: '60', active: true },
                 { id: 'c3', client_name: 'Loose Circle', axiscare_client_id: null, active: true }, { id: 'c4', client_name: 'Empty', axiscare_client_id: '70', active: true }],
  circle_contacts: [
    { id: 1, circle_id: 'c1', name: 'Lisa Ray', relationship: 'Daughter', email: 'l@x.test', phone: '555', sms_consent: false, hipaa_authorized: false, source: 'axiscare' },
    { id: 2, circle_id: 'c1', name: 'Old Son', source: 'axiscare', axiscare_removed_at: '2026-10-01' },
    { id: 3, circle_id: 'c2', name: 'Gina Good', relationship: 'Wife', email: 'g@x.test', phone: '556', sms_consent: true, hipaa_authorized: true, source: 'axiscare', is_primary: true, app_status: 'active', welcome_sent_at: '2026-10-17T15:00:00Z', axis_welcome_sent_at: '2026-10-17T15:00:00Z' },
    { id: 4, circle_id: 'c2', name: 'Neighbor Ned', phone: '557', sms_consent: false, hipaa_authorized: true, source: 'office' },
    { id: 5, circle_id: 'c3', name: 'Nobody Linked', email: 'n@x.test' } ],
  app_data: { data: [{ automation: 'circles-sync', at: new Date(Date.now() - 3600e3).toISOString(), ok: true }] } };
window.__fail = null; window.__loads = 0;
const q = t => { const o = { select() { return o }, eq() { return o },
  maybeSingle() { return Promise.resolve({ data: T.app_data }) },
  then(res, rej) { if (window.__fail === t) return Promise.resolve({ error: { message: 'boom' } }).then(res, rej); if (t === 'care_circles') window.__loads++; return Promise.resolve({ data: T[t] }).then(res, rej) } }; return o };
const sb = { from: q };
async function cl360Identity() { return [
  { client_name: 'Dorothy Ray', axiscare_client_id: '55', role_status: 'active' }, { client_name: 'Good Family', axiscare_client_id: '60', role_status: 'active' },
  { client_name: 'Empty Circle', axiscare_client_id: '70', role_status: 'active' }, { client_name: 'No Circle Nan', axiscare_client_id: '80', role_status: 'active' },
  { client_name: 'Past Pete', axiscare_client_id: '90', role_status: 'ended' } ] }
window.__synced = 0; async function fcSyncAxis() { window.__synced++ }
</script>
<script>__NA__</script>
<script>__JS__</script>
"""
page = os.path.join(tmp, 'page.html'); open(page, 'w').write(PAGE.replace('__NA__', NA).replace('__JS__', JS))
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + page); pg.evaluate('FCK.mount()'); pg.wait_for_timeout(80)
    t = pg.inner_text('#fck_box')
    ck('Needs a look is the default: Dorothy, Empty Circle, No Circle Nan (3); Good Family not listed', 'Needs a look 3' in t and 'Dorothy Ray' in t and 'Empty Circle' in t and 'No Circle Nan' in t and 'Good Family' not in t, t)
    ck('past clients are left out', 'Past Pete' not in t and 'All active clients 4' in t, t)
    ck('Dorothy: nobody with HIPAA, nobody to text, someone left AxisCare', all(x in t for x in ['Nobody with HIPAA', 'Nobody we can text', "1 left AxisCare's list"]), t)
    ck('Dorothy: Lisa shown with daughter, no HIPAA, texts off; Old Son greyed as gone', 'Lisa Ray' in t and 'Daughter' in t and 'no HIPAA' in t and 'no texts' in t and "no longer on AxisCare's list" in t, t)
    ck('a client with no circle and an empty circle are flagged', 'No Family Circle' in t and 'Nobody in the circle' in t, t)
    ck('the unlinked circle is called out at the bottom', "1 circle isn't tied to a client" in t and 'Loose Circle' in t, t)
    ck('the nightly sync line shows', 'Family contacts sync from AxisCare every night' in t, t)
    ck('each client opens their profile on the Family tab', pg.locator('a[data-open-client="55"][data-open-tab="family"]').count() == 1)
    pg.evaluate("FCK.setFilter('all')"); t = pg.inner_text('#fck_box')
    ck('All: Good Family shows, with main contact, app on, AxisCare welcome + Booking App email sent, and Ned typed by office (info only)', 'Good Family' in t and 'main contact' in t and 'Booking App on' in t and 'AxisCare welcome sent' in t and 'Booking App email sent' in t and 'typed by office' in t and '1 not in AxisCare' in t, t)
    ck('Lisa has no HIPAA so no welcome-not-sent nag for her', 'welcome not sent' not in t, t)
    pg.evaluate("FCK.search('ned')"); t = pg.inner_text('#fck_box')
    ck('search finds a family member and shows their client', 'Good Family' in t and 'Dorothy' not in t, t)
    pg.evaluate("FCK.search('')")
    n = pg.evaluate('__loads'); pg.evaluate('FCK.sync()'); pg.wait_for_timeout(60)
    ck('Sync runs the AxisCare sync, then reloads', pg.evaluate('__synced') == 1 and pg.evaluate('__loads') == n + 1)
    pg.evaluate("__fail='circle_contacts'"); pg.evaluate('FCK.refresh()'); pg.wait_for_timeout(60)
    ck('a load failure shows as an error, never an empty "looks good" page', 'Could not load the circles: boom' in pg.inner_text('#fck_box') and 'looks good' not in pg.inner_text('#fck_box'), pg.inner_text('#fck_box'))
    pg.set_viewport_size({ 'width': 375, 'height': 800 }); pg.evaluate("__fail=null"); pg.evaluate('FCK.refresh()'); pg.wait_for_timeout(60)
    ck('phone width: no sideways scroll', pg.evaluate('document.documentElement.scrollWidth <= 376'))
    ck('no page errors', not errs, errs)
    b.close()
for r in R: print(r[0], r[1], ('  ' + r[2]) if r[2] else '')
f = sum(1 for r in R if r[0] == 'FAIL'); print(f'\n{len(R) - f}/{len(R)} passed'); raise SystemExit(1 if f else 0)

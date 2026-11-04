"""Getting ready as one table (Samantha 2026-11-03: "Approve the Getting ready table as shown, with all six of your picks.
Build it switched off."). The real page, served from THIS checkout by the test itself, offline, MADE-UP families only: client
journeys (nine-step and older v1), an older Start of Care checklist with its First shift checklist, and a First shift checklist on
its own. Checks the rows, the columns, Holding up, the chips and summary, the remembered filter, phone cards, Starting care, and
that with the switch off today's lists are untouched. Saves desktop and phone screenshots. Nothing reaches production.
(python3 tests/browser/getting_ready_table_look.py; OUT=<dir> for the screenshots)"""
import os, json, threading, functools, datetime
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.environ.get('OUT', '/tmp')
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=ROOT)); PORT = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
day = lambda n: (datetime.date.today() + datetime.timedelta(days=n)).isoformat()
ts = lambda n: (datetime.datetime.utcnow() + datetime.timedelta(days=n)).strftime('%Y-%m-%dT%H:%M:%SZ')

LEADS = [
  {'id': 'L1', 'client_first_name': 'Ada', 'client_last_name': 'Fakename', 'client_city': 'Nixa', 'funding_source': 'private', 'said_yes_at': ts(-4), 'status': 'Converted', 'assigned_coordinator': 'kc@example.com'},
  {'id': 'L2', 'client_first_name': 'Bo', 'client_last_name': 'Pretend', 'client_city': 'Ozark', 'funding_source': 'va', 'said_yes_at': ts(-6), 'status': 'Converted'},
  {'id': 'L3', 'client_first_name': 'Cy', 'client_last_name': 'Sample', 'client_city': 'Republic', 'funding_source': 'private', 'said_yes_at': ts(-9), 'status': 'Converted'},
  {'id': 'L4', 'client_first_name': 'Di', 'client_last_name': 'Example', 'client_city': 'Branson', 'funding_source': 'private', 'said_yes_at': ts(-12), 'status': 'Converted', 'axiscare_client_id': '7004',
   'soc': {'pathway': 'PP', 'started_at': ts(-12), 'steps': [
     {'id': 'p0', 'label': 'In-home assessment completed', 'role': 'day', 'done_at': ts(-12)},
     {'id': 'p1', 'label': 'Care Agreement provided', 'role': 'day', 'done_at': ts(-11)},
     {'id': 'p2', 'label': 'Signed Care Agreement received', 'role': 'family', 'done_at': None},
     {'id': 'p3', 'label': 'Signed Care Agreement uploaded to AxisCare', 'role': 'evening', 'done_at': None},
     {'id': 'p4', 'label': 'Billing setup completed in AxisCare', 'role': 'evening', 'done_at': None},
     {'id': 'm0', 'label': 'Enter the care plan', 'role': 'evening', 'done_at': None},
     {'id': 'm1', 'label': 'Welcome call', 'role': 'day', 'done_at': None},
     {'id': 'm2', 'label': 'Home safety assessment', 'role': 'day', 'done_at': None}]}},
  {'id': 'L5', 'client_first_name': 'Ed', 'client_last_name': 'Deciding', 'client_city': 'Nixa', 'funding_source': 'private', 'status': 'Assessment Scheduled'},
  {'id': 'L6', 'client_first_name': 'Fay', 'client_last_name': 'Mockton', 'client_city': 'Springfield', 'funding_source': 'ltc', 'said_yes_at': ts(-8), 'status': 'Converted'},
]
J = lambda **k: dict({'status': 'open', 'catalog': 'nine', 'is_test': False, 'assigned_cc': 'kc@example.com'}, **k)
JOURNEYS = [
  J(journey_id='j1', ref='J1', lead_id='L1', client_name='Ada Fakename', payer='private', stage='setup', step_n=4, target_start=day(9), next={'key': 'soc.setup', 'title': 'Client Setup + Billing in AxisCare', 'status': 'ready', 'why': '', 'owner': 'kc@example.com'}),
  J(journey_id='j2', ref='J2', lead_id='L2', client_name='Bo Pretend', payer='va', stage='setup', step_n=4, target_start=day(14), next={'key': 'soc.setup', 'title': 'Client Setup + Billing in AxisCare', 'status': 'waiting', 'why': 'Waiting on the VA authorization · back ' + day(3), 'owner': 'kc@example.com'}),
  J(journey_id='j3', ref='J3', lead_id='L3', client_name='Cy Sample', payer='private', stage='confirm', step_n=5, target_start=day(2), next={'key': 'soc.confirm', 'title': 'Confirm Schedule + Caregivers', 'status': 'attention', 'why': 'Late since ' + day(-1), 'owner': 'kc@example.com'}),
  J(journey_id='j5', ref='J5', lead_id='L5', client_name='Ed Deciding', payer='private', stage='outcome', step_n=3, next={'key': 'soc.outcome', 'title': 'Assessment Outcome', 'status': 'ready', 'why': ''}),
  J(journey_id='j6', ref='J6', lead_id='L6', client_name='Fay Mockton', payer='ltc', stage='follow', step_n=9, target_start=day(-1), next={'key': 'soc.follow', 'title': 'Next-Day Follow-Up', 'status': 'ready', 'why': ''}),
  J(journey_id='j7', ref='A7007', client_name='Gus Oldpath', payer='private', catalog='v1', stage='schedule', target_start=day(5), axiscare_client_id='7007', next={'key': 'sched.axiscare', 'title': 'Shifts in AxisCare', 'status': 'ready', 'why': ''}),
]
CQ = [
  {'id': 'q4', 'axiscare_client_id': '7004', 'client_name': 'Di Example', 'status': 'pending', 'caregiver_assigned': True, 'caregiver_assigned_at': ts(-2), 'caregiver_called': True, 'caregiver_called_at': ts(-2), 'client_called': True, 'client_called_at': ts(-1), 'start_date': day(6)},
  {'id': 'q8', 'axiscare_client_id': '7008', 'client_name': 'Hal Launchonly', 'payer': 'Private Pay', 'status': 'pending', 'caregiver_assigned': True, 'caregiver_called': True, 'client_called': True, 'schedule_added': True, 'evv_verified': True, 'start_date': day(-2)},
  {'id': 'q9', 'axiscare_client_id': '7009', 'client_name': 'Ivy Finished', 'status': 'complete'},
]
AGREE = {'L1': [{'status': 'draft', 'created_at': ts(-2)}], 'L3': [{'status': 'countersigned', 'countersigned_at': ts(-5)}], 'L2': [{'status': 'countersigned', 'countersigned_at': ts(-3)}],
         '7004': [], 'L6': [{'status': 'countersigned', 'countersigned_at': ts(-7)}]}

SETUP = r"""
async([LEADS, JOURNEYS, CQ, AGREE, live])=>{
  DATA.leads = LEADS; window.__cqRows = CQ;
  DATA.ops_settings = Object.assign(DATA.ops_settings || {}, { getting_ready_table_live: live, client_journey_live: false });
  try{ OPS_PEOPLE = [{ primary_email: 'kc@example.com', full_name: 'Krystal Coordinator' }]; }catch(e){ window.OPS_PEOPLE = [{ primary_email: 'kc@example.com', full_name: 'Krystal Coordinator' }]; }
  window.cjTableRows = () => ({ rows: JOURNEYS, loaded: true });
  window.cjOwnsLaunch = c => false;
  window.AGCALLS = [];
  window.callAction = async (fn, body) => { AGCALLS.push([fn, body]); const k = body.client_ax || body.lead_id; return { status: 200, data: { agreements: AGREE[k] || [] } }; };
  try{ localStorage.removeItem('grt_filter'); }catch(e){}
  if(window.GRT) GRT.clear();
  document.querySelectorAll('.tabpanel').forEach(t => t.style.display = 'none');
  const p = document.getElementById('tab-soc'); for(let el = p; el; el = el.parentElement){ if(getComputedStyle(el).display === 'none') el.style.display = 'block'; }
  activeTab = 'soc'; socActiveFilter = 'active';
  renderSocTab(); await new Promise(r => setTimeout(r, 300)); renderSocTab();
  return true;
}"""
READ = r"""
()=>{
  const rows = [...document.querySelectorAll('#socList table.obt tbody tr')].map(tr => {
    const td = [...tr.children]; return { name: td[0].querySelector('.obt-name') ? td[0].querySelector('.obt-name').textContent.trim() : td[0].textContent.trim(),
      cells: td.slice(1, 8).map(x => x.textContent.trim()), start: td[8] && td[8].textContent.trim(), startRed: !!(td[8] && td[8].classList.contains('obt-warnt')),
      hold: td[9] && td[9].textContent.trim(), edge: td[0].getAttribute('style') || '' }; });
  const heads = [...document.querySelectorAll('#socList table.obt thead th')].map(x => x.textContent.trim());
  const sum = [...document.querySelectorAll('#socList .obt-s')].map(b => b.textContent.trim());
  const chips = [...document.querySelectorAll('#socList .obt-q')].map(b => b.textContent.trim());
  return { rows, heads, sum, chips, filtersHidden: getComputedStyle(document.getElementById('socFilters')).display === 'none' };
}"""
res = []
def ck(name, ok, info=''):
    res.append(ok); print(('PASS  ' if ok else 'FAIL  ') + name + ('' if ok else '  ' + str(info)[:400]))
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1440, 'height': 1000})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    pg.goto(f'http://127.0.0.1:{PORT}/index.html?proof=grt'); pg.wait_for_timeout(1500)
    ck('the page loads the table file', pg.evaluate('()=>!!window.GRT && typeof GRT.html === "function"'))
    # switch OFF: today's Before staffing list, untouched
    pg.evaluate(SETUP, [LEADS, JOURNEYS, CQ, AGREE, False]); pg.wait_for_timeout(200)
    off = pg.evaluate("()=>({ table: !!document.querySelector('#socList table.obt'), cards: document.querySelectorAll('#socList .card').length, filters: getComputedStyle(document.getElementById('socFilters')).display !== 'none' })")
    ck('switch off: no table, the old checklist cards and filters show as today', not off['table'] and off['cards'] >= 1 and off['filters'], off)
    # switch ON
    pg.evaluate(SETUP, [LEADS, JOURNEYS, CQ, AGREE, True]); pg.wait_for_timeout(400)
    R = pg.evaluate(READ); by = {r['name']: r for r in R['rows']}
    ck('switch on: the table replaces the cards, and the old filters are hidden', len(R['rows']) > 0 and R['filtersHidden'], R)
    ck('the columns: Family, the seven steps, Start date, Holding up, Days on this step',
       R['heads'] == ['Family', 'Agreement', 'Client setup + billing', 'Schedule + caregivers', 'In AxisCare', 'Confirm start', 'First shift', 'Next-day follow-up', 'Start date', 'Holding up', 'Days on this step'], R['heads'])
    names = set(by)
    ck('everyone after the yes, once each: journeys, the older checklist (with its First shift half), the First shift checklist on its own',
       names == {'Ada Fakename', 'Bo Pretend', 'Cy Sample', 'Fay Mockton', 'Gus Oldpath', 'Di Example', 'Hal Launchonly'}, sorted(names))
    ck('a family who has not said yes stays on Leads (not in the table)', 'Ed Deciding' not in names)
    ck('a finished First shift checklist is not in the table', 'Ivy Finished' not in names)
    a = by.get('Ada Fakename', {})
    ck('Ada (nine steps, at setup, agreement started not signed): Agreement says so, Holding up Family, job is the agreement',
       a.get('cells', [''])[0] == 'Started, not signed' and a.get('hold', '').startswith('Family'), a)
    bo = by.get('Bo Pretend', {})
    ck('Bo (waiting on the VA authorization): Agreement done, setup shows the wait, Holding up Outside',
       bo.get('cells', ['', ''])[0].startswith('✓') and 'VA authorization' in bo.get('cells', ['', ''])[1] and bo.get('hold', '').startswith('Outside'), bo)
    cy = by.get('Cy Sample', {})
    ck('Cy (confirm step late, start in 2 days): red late button, start date red, red edge, done steps ticked',
       'Confirm' in cy.get('cells', [''] * 3)[2] and 'Late since' in cy.get('cells', [''] * 3)[2] and cy.get('startRed') and 'B42318' in cy.get('edge', '') and cy['cells'][0].startswith('✓') and cy['cells'][1].startswith('✓'), cy)
    fay = by.get('Fay Mockton', {})
    ck('Fay (next-day follow-up): the first six steps ticked, Call family in the last column', all(c.startswith('✓') for c in fay.get('cells', [''] * 7)[:6]) and fay['cells'][6] == 'Call family', fay)
    gus = by.get('Gus Oldpath', {})
    ck('Gus (older v1 journey at Shifts in AxisCare): lands in the In AxisCare column', gus.get('cells', [''] * 4)[3] == 'Schedule' and gus['cells'][2].startswith('✓'), gus)
    di = by.get('Di Example', {})
    ck('Di (older Start of Care checklist): agreement waiting on the family, setup not reached, her First shift half ticked from the First shift checklist',
       di.get('cells', [''] * 4)[0] == 'Family' and di['cells'][2].startswith('✓') and di.get('hold', '').startswith('Family'), di)
    hal = by.get('Hal Launchonly', {})
    ck('Hal (First shift checklist only, start date passed): First shift is the late step, earlier columns blank',
       'First shift' in hal.get('cells', [''] * 6)[5] and 'start date passed' in hal['cells'][5] and hal['cells'][0] == '–' and hal['cells'][2].startswith('✓') and hal['cells'][3].startswith('✓'), hal)
    ck('the heading says Getting ready (one table), and goes back with the switch off', pg.evaluate("()=>document.querySelector('#tab-soc h2').textContent === 'Getting ready'"))
    ck('Cy\'s agreement shows its signed date', 'Oct' in cy['cells'][0] or 'Nov' in cy['cells'][0], cy)
    ck('the coordinator\'s first name shows under the family', 'Krystal' in pg.evaluate("()=>document.querySelector('#socList tbody').textContent"))
    ck('the summary counts every family', any(s.startswith('7') and 'families getting ready' in s for s in R['sum']), R['sum'])
    ck('an agreement is read once per family (not on every redraw)', pg.evaluate("()=>{ const n = AGCALLS.length; GRT.redraw(); GRT.redraw(); return AGCALLS.length === n && n > 0 && n <= 6; }"))
    # chips
    pg.evaluate("()=>GRT.set('hold','outside')"); pg.wait_for_timeout(150)
    R2 = pg.evaluate(READ)
    ck('Holding up: Outside shows only Bo', [r['name'] for r in R2['rows']] == ['Bo Pretend'], R2['rows'])
    ck('the chip is remembered on this computer', pg.evaluate("()=>JSON.parse(localStorage.getItem('grt_filter')).hold === 'outside'"))
    pg.evaluate("()=>GRT.clear()"); pg.evaluate("()=>GRT.set('job','agree')"); pg.wait_for_timeout(150)
    R3 = pg.evaluate(READ)
    ck('Who needs: Agreement not signed shows Ada and Di', sorted(r['name'] for r in R3['rows']) == ['Ada Fakename', 'Di Example'], R3['rows'])
    pg.evaluate("()=>GRT.clear()"); pg.evaluate("()=>GRT.find('ozark')"); pg.wait_for_timeout(400)
    R4 = pg.evaluate(READ)
    ck('Find by town', [r['name'] for r in R4['rows']] == ['Bo Pretend'], R4['rows'])
    pg.evaluate("()=>GRT.clear()"); pg.wait_for_timeout(150)
    ck('a name opens the family where Open does today', pg.evaluate("""()=>{ let got = null; const o = window.openLeadProfile; window.openLeadProfile = (id, t) => { got = [id, t]; };
       const btn = [...document.querySelectorAll('#socList .obt-name')].find(b => b.textContent.includes('Di Example')); btn.click(); window.openLeadProfile = o; return got && got[0] === 'L4' && got[1] === 'start'; }"""))
    ck('a journey family opens at its step', pg.evaluate("""()=>{ const btn = [...document.querySelectorAll('#socList .obt-name')].find(b => b.textContent.includes('Cy Sample')); btn.click(); return location.hash === '#p/J3/start/soc.confirm'; }"""))
    pg.evaluate("()=>{ location.hash = ''; activeTab = 'soc'; renderSocTab(); }"); pg.wait_for_timeout(200)
    ck('Completed starts of care still opens the old list, with its own heading', pg.evaluate("()=>{ GRT.done(); return !document.querySelector('#socList table.obt') && getComputedStyle(document.getElementById('socFilters')).display !== 'none' && document.querySelector('#tab-soc h2').textContent.indexOf('Before staffing') > -1; }"))
    pg.evaluate("()=>{ socActiveFilter = 'active'; renderSocTab(); }"); pg.wait_for_timeout(200)
    box = pg.locator('#tab-soc').bounding_box()
    pg.screenshot(path=os.path.join(OUT, 'grt_desktop.png'), clip={'x': box['x'], 'y': box['y'], 'width': box['width'], 'height': min(1100, box['height'])}, full_page=True)
    pg.evaluate("()=>GRT.set('job','agree')"); pg.wait_for_timeout(150); box = pg.locator('#tab-soc').bounding_box()
    pg.screenshot(path=os.path.join(OUT, 'grt_desktop_agreement.png'), clip={'x': box['x'], 'y': box['y'], 'width': box['width'], 'height': min(900, box['height'])}, full_page=True)
    pg.evaluate("()=>GRT.clear()")
    # Starting care (client journeys on): the same table on the Clients list
    sc = pg.evaluate("()=>{ DATA.ops_settings.client_journey_live = true; const h = cjStartingHtml(); DATA.ops_settings.client_journey_live = false; return { table: h.indexOf('table class=\"obt\"') > -1 }; }")
    ck('Starting care (once client journeys are on) shows the same table', sc['table'], sc)
    sc2 = pg.evaluate("()=>{ DATA.ops_settings.client_journey_live = true; DATA.ops_settings.getting_ready_table_live = false; const h = cjStartingHtml(); DATA.ops_settings.client_journey_live = false; DATA.ops_settings.getting_ready_table_live = true; return h.indexOf('table class=\"obt\"') < 0; }")
    ck('Starting care with the table switch off is today\'s list', sc2)
    ck('no script errors', not errs, errs)
    # phone
    m = b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
    m.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    m.goto(f'http://127.0.0.1:{PORT}/index.html?proof=grt'); m.wait_for_timeout(1500)
    m.evaluate(SETUP, [LEADS, JOURNEYS, CQ, AGREE, True]); m.wait_for_timeout(400)
    mob = m.evaluate("()=>({ cards: document.querySelectorAll('#socList .obt-card').length, table: getComputedStyle(document.querySelector('#socList .obt-wrap')).display, wide: document.documentElement.scrollWidth > window.innerWidth + 2 })")
    ck('phone: each family is a card, the table is hidden', mob['cards'] == 7 and mob['table'] == 'none', mob)
    box = m.locator('#tab-soc').bounding_box()
    m.screenshot(path=os.path.join(OUT, 'grt_phone.png'), clip={'x': 0, 'y': box['y'], 'width': 390, 'height': min(2200, box['height'])}, full_page=True)
    b.close()
print(f'\n{sum(res)}/{len(res)} passed'); raise SystemExit(0 if all(res) else 1)

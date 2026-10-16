"""806 (2026-10-16): Oklahoma Companion applicants in the same Hub. The real index.html offline (the database answers nothing),
made-up applicants: the MO/OK chip, the Both / Missouri / Oklahoma picker and its counts, the profile's office and "held" lines,
the text button replaced, the offer held, the Oklahoma questions, the phone version's chip. FAKE people only; nothing is sent.
python3 tests/browser/ok_office_look.py"""
import os, socket, subprocess, sys, time, re
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
HTML = open(os.path.join(ROOT, 'index.html')).read(); OKO = open(os.path.join(ROOT, 'office-ok.js')).read()
s_ = socket.socket(); s_.bind(('127.0.0.1', 0)); PORT = s_.getsockname()[1]; s_.close()
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '-d', ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
R = []
ok = lambda n, c, d='': R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:500]))
ok('index: office-ok.js loaded', re.search(r'<script src="office-ok\.js\?v=\d+\w*"></script>', HTML))
ok('index: the picker sits beside the position filter', '<span id="apOfficeHost"></span>' in HTML)
ok('no em dashes in office-ok.js', '—' not in OKO)
SEED = """() => {
  const now = new Date().toISOString();
  AP_POS = [{ key:'caregiver', label:'Caregiver', office:'MO', active:true }, { key:'prn_cna', label:'PRN CNA Team', office:'MO', track:'prn', active:true },
            { key:'companion', label:'Companion', office:'OK', active:true }];
  AP_POSTINGS = []; AP_BOOK = {}; AP_COORD = {}; AP_CHURN = {};
  AP_ROWS = [
    { id:'a-ok-1', first_name:'Okla', last_name:'Yukon', phone:'4055550120', email:'okla@practice.invalid', zip:'73099', city:'Yukon', position:'companion', office:'OK',
      status:'new', screen_grade:'qualified', screen_flags:[], miles_out:10.4, created_at:now, completed_at:now, sms_consent:true, has_transport:false,
      msgs_held_at:now, msgs_held_note:'sms from interview-messages held: Oklahoma applicant messages are off' },
    { id:'a-ok-2', first_name:'Okla', last_name:'Partial', phone:'4055550121', zip:'73064', position:'companion', office:'OK', status:'partial', created_at:now },
    { id:'a-mo-1', first_name:'Mo', last_name:'Nixa', phone:'4175550101', email:'mo@practice.invalid', zip:'65714', city:'Nixa', position:'caregiver', office:'MO',
      status:'new', screen_grade:'qualified', screen_flags:[], miles_out:14, created_at:now, completed_at:now, sms_consent:true, has_transport:true },
    { id:'a-mo-2', first_name:'Mo', last_name:'Nocar', phone:'4175550102', zip:'65802', position:'caregiver', office:'MO', status:'new', screen_grade:'qualified', created_at:now, completed_at:now, has_transport:false },
  ];
  document.querySelectorAll('.tabpanel').forEach(p => p.classList.remove('active')); document.getElementById('tab-applicants').classList.add('active');
  try { localStorage.removeItem('cc_ap_office'); } catch(_) {}
  apFillPositions(); OKO.setPicker(''); apSetFilter('all');
}"""
try:
  with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1200, 'height': 900}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('**/*supabase.co/**', lambda r: r.fulfill(status=200, content_type='application/json', body='{}'))
    pg.goto(f'http://127.0.0.1:{PORT}/index.html'); pg.wait_for_timeout(1500)
    ok('OKO is the real one (all its parts)', pg.evaluate("typeof OKO === 'object' && ['office','isOk','pass','chip','heldNote','heldBox','setPicker','remember','offerBlocked'].every(k => typeof OKO[k] === 'function')"))
    PICK = lambda v: pg.evaluate("(v) => { const s = document.getElementById('apOffice'); s.value = v; s.dispatchEvent(new Event('change')); }", v)   # the app is behind the sign-in screen offline, so the change is fired by hand
    pg.evaluate(SEED); pg.wait_for_timeout(100)
    ok('the picker is on the page, starting on Both offices', pg.evaluate("document.getElementById('apOffice') && document.getElementById('apOffice').value === ''"))
    t = pg.inner_text('#apList')
    ok('Both: all four people', all(n in t for n in ['Okla Yukon', 'Okla Partial', 'Mo Nixa', 'Mo Nocar']), t[:400])
    chips = pg.evaluate("[...document.querySelectorAll('#apList .oko-chip')].map(c => c.textContent)")
    ok('every row has an office chip: two OK, two MO', sorted(chips) == ['MO', 'MO', 'OK', 'OK'], chips)
    opts = pg.evaluate("[...document.getElementById('apPos').options].map(o => o.textContent)")
    ok('the position filter lists Companion (Oklahoma)', 'Companion (Oklahoma)' in opts and 'Caregiver' in opts, opts)
    PICK('OK'); pg.wait_for_timeout(80); t = pg.inner_text('#apList')
    ok('Oklahoma: only the two Oklahoma applicants', 'Okla Yukon' in t and 'Okla Partial' in t and 'Mo Nixa' not in t, t[:300])
    f = pg.inner_text('#apFilter')
    ok('the view counts follow the picker (Everyone 2)', re.search(r'Everyone\s*2\b', f), f)
    ok('the choice is remembered in this browser', pg.evaluate("localStorage.getItem('cc_ap_office')") == 'OK')
    PICK('MO'); pg.wait_for_timeout(80); t = pg.inner_text('#apList')
    ok('Missouri: only the two Missouri applicants', 'Mo Nixa' in t and 'Mo Nocar' in t and 'Okla Yukon' not in t and 'Okla Partial' not in t, t[:300])
    PICK(''); pg.wait_for_timeout(80)
    pg.evaluate("document.querySelectorAll('#apList details').forEach(d => d.open = true)"); pg.wait_for_timeout(50)
    row_ok = pg.evaluate("[...document.querySelectorAll('#apList details')].find(d => d.textContent.includes('Okla Yukon')).innerText")
    row_mo = pg.evaluate("[...document.querySelectorAll('#apList details')].find(d => d.textContent.includes('Mo Nocar')).innerText")
    ok('Oklahoma row: no Text button, the held note instead', 'Oklahoma messages are off. Call from (405) 500-1758 in LeadConnector.' in row_ok and '💬 Text' not in row_ok, row_ok[:600])
    ok('Oklahoma row: "Messages held for Oklahoma", and no red "No transport" (driving is not required there)', 'Messages held for Oklahoma' in row_ok and 'No transport' not in row_ok, row_ok[:600])
    ok('Missouri row: unchanged (Text button, "No transport" still red)', '💬 Text' in row_mo and 'No transport' in row_mo and 'Messages held' not in row_mo, row_mo[:600])
    sel = pg.evaluate("[...document.querySelectorAll('#apList details')].find(d => d.textContent.includes('Okla Yukon')).querySelector('select').selectedOptions[0].textContent")
    ok("the row's position picker says Companion (Oklahoma)", sel == 'Companion (Oklahoma)', sel)
    # the profile
    pg.evaluate("apOpenProfile('a-ok-1', 'overview', true)"); pg.wait_for_timeout(200)
    left = pg.inner_text('#apProfLeft'); right = pg.evaluate("(document.getElementById('apProfRight')||{}).innerText || ''")
    ok('profile: OK chip by the name, held note in place of Text and Email', 'OK' in left and 'Oklahoma messages are off' in left and '💬 Text' not in left and 'Email' not in left.split('Oklahoma messages')[1][:40], left[:500])
    ok('profile: the Oklahoma box, with the last thing held', 'Caring Companions Oklahoma applicant' in right and 'Office messages (Text, not hiring, no-show): held' in right and 'Last held: sms from interview-messages' in right, right[:700])
    ok('profile: Office Oklahoma (Mustang), distance from the Mustang office', 'Oklahoma (Mustang)' in right and '10 miles from the Mustang office' in right, right[:900])
    pg.evaluate("window.__asks = []; apAsk = async (o) => { __asks.push(o); return true; }; apToOffer('a-ok-1')"); pg.wait_for_timeout(80)
    asks = pg.evaluate('__asks')
    ok('Hire, make the offer: held for Oklahoma, says why, stays put', len(asks) == 1 and 'Oklahoma offers are not set up yet' in asks[0]['text'] and pg.evaluate("JO_FROM_INTERVIEW") is not True, asks)
    pg.evaluate("apOpenProfile('a-mo-1', 'overview', true)"); pg.wait_for_timeout(200)
    right = pg.evaluate("(document.getElementById('apProfRight')||{}).innerText || ''")
    ok('a Missouri profile says Missouri (Springfield) and has no Oklahoma box', 'Missouri (Springfield)' in right and 'Caring Companions Oklahoma applicant' not in right, right[:600])
    # the Oklahoma questions before an interview
    pg.evaluate("""() => { const c = document.getElementById('apBookCard'); if (c) c.style.display = 'block';
      window.__rpc = []; sb.rpc = async (fn, a) => { __rpc.push([fn, a]); return fn === 'applicant_screen_by_office_ok' ? { data: null, error: null } : { data: null, error: null }; };
      window.apBookFor = (id) => { window.__booked = id; }; }""")
    pg.evaluate("apScreenAsk('a-ok-2', 'questions')"); pg.wait_for_timeout(80)
    q = pg.inner_text('#apBookSlots')
    ok('Ask these first (Oklahoma): 18+, allowed to work, OKSCREEN; nothing about transport or a year of experience',
       'OKSCREEN fingerprint background check' in q and '18 or older' in q and 'reliable transportation' not in q and 'paid caregiving experience' not in q, q)
    pg.evaluate("['age','auth','oks'].forEach(k => document.getElementById('apScrOk_'+k).value = 'yes')")
    pg.evaluate("document.querySelector('#apBookSlots button.primary').click()"); pg.wait_for_timeout(150)
    rpc = pg.evaluate('__rpc')
    ok('saving calls the Oklahoma office screen, then shows times', rpc and rpc[-1] == ['applicant_screen_by_office_ok', {'p': 'a-ok-2', 'p_age_ok': True, 'p_work_auth': True, 'p_okscreen': True}] and pg.evaluate('window.__booked') == 'a-ok-2', rpc)
    pg.evaluate("apScreenAsk('a-mo-2', 'questions')"); pg.wait_for_timeout(80)
    ok('a Missouri application still gets the Missouri questions', 'reliable transportation' in pg.inner_text('#apBookSlots'))
    # the text button anywhere (the phone uses the same button) and the journey note
    ok('ApText.btn for an Oklahoma id is the held note, for a Missouri id the button', 'Oklahoma messages are off' in pg.evaluate("ApText.btn('a-ok-1')") and '💬' in pg.evaluate("ApText.btn('a-mo-1')"))
    pg.evaluate("OKO.remember([{ id:'phone-only-ok', office:'OK' }])")
    ok('a row only the phone loaded is known as Oklahoma too', 'Oklahoma messages are off' in pg.evaluate("ApText.btn('phone-only-ok')"))
    ok('Send the application offers Missouri positions only (it is a mo-care.com link)', pg.evaluate("apInvOpen(); [...document.getElementById('apInvPos').options].map(o => o.value).join(',')") == 'caregiver,prn_cna')
    ok('the offer form lists no Oklahoma position', pg.evaluate("joFillPositions(AP_POS); [...(document.getElementById('jo_position')||{options:[]}).options].map(o => o.textContent).includes('Companion')") is False)
    pg.evaluate("document.querySelectorAll('.tabpanel').forEach(p => p.classList.remove('active')); document.getElementById('tab-apjourney').classList.add('active'); apjOpen()"); pg.wait_for_timeout(1200); pg.evaluate("apjRender()"); pg.wait_for_timeout(150)
    jt = pg.evaluate("(document.getElementById('apjBody')||{}).innerHTML || 'NO apjBody'")
    ok('the Applicant journey page says Oklahoma applicants get none of these yet', 'Oklahoma applicants (Companion):' in jt, jt[:300])
    # 808: the Oklahoma office switch on (Admin page): the buttons come back for Oklahoma, from the Oklahoma number
    pg.evaluate("DATA.ops_settings = { ok_applicant_office_msgs_live: true, ok_applicant_auto_msgs_live: false, ok_from_number: '+14055001758' }; document.querySelectorAll('.tabpanel').forEach(p => p.classList.remove('active')); document.getElementById('tab-applicants').classList.add('active'); apRender(); document.querySelectorAll('#apList details').forEach(d => d.open = true)")
    pg.wait_for_timeout(80)
    row_on = pg.evaluate("[...document.querySelectorAll('#apList details')].find(d => d.textContent.includes('Okla Yukon')).innerText")
    ok('808 switch on: the Oklahoma row has the Text button, no held note or chip', '💬 Text' in row_on and 'Oklahoma messages are off' not in row_on and 'Messages held for Oklahoma' not in row_on, row_on[:600])
    pg.evaluate("apOpenProfile('a-ok-1', 'overview', true)"); pg.wait_for_timeout(200)
    right = pg.evaluate("(document.getElementById('apProfRight')||{}).innerText || ''")
    ok('808 switch on: the profile says office messages on, from (405) 500-1758; interview messages held', 'Office messages (Text, not hiring, no-show): on, from (405) 500-1758' in right and 'Interview messages (booked, the day before, cancelled): held' in right, right[:800])
    pg.evaluate("apToOffer('a-ok-1')"); pg.wait_for_timeout(60)
    ok('808: offers stay held for Oklahoma with the switch on', len(pg.evaluate('__asks')) == 2 and 'Oklahoma offers are not set up yet' in pg.evaluate('__asks')[1]['text'])
    ok('808: the "tell them about an opening" list still leaves Oklahoma out (a mo-care.com link)', 'apReSelected' in pg.evaluate("apReSelected.toString()") and 'OKO.isOk(r)' in pg.evaluate("apReSelected.toString()"))
    pg.evaluate("DATA.ops_settings = null")
    ok('no page errors', not errs, errs)
    # phone width
    pg.set_viewport_size({'width': 390, 'height': 844}); pg.evaluate(SEED); pg.wait_for_timeout(100)
    ok('phone width: the list does not scroll sideways', pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), pg.evaluate("[document.documentElement.scrollWidth, window.innerWidth]"))
    # a picture for the record: the list itself, made visible (offline the Hub sits behind its sign-in screen)
    pg.set_viewport_size({'width': 1100, 'height': 900})
    pg.evaluate("""() => { document.querySelectorAll('[id$="Back"], .modal-back, #apInvBack').forEach(e => e.remove());
      let e = document.getElementById('apList'); while (e && e !== document.body) { if (getComputedStyle(e).display === 'none') e.style.display = 'block'; e = e.parentElement; }
      [...document.body.children].forEach(c => { if (getComputedStyle(c).position === 'fixed') c.style.display = 'none'; });
      apRender(); document.querySelectorAll('#apList details').forEach((d, i) => d.open = i === 0); }"""); pg.wait_for_timeout(150)
    host = pg.locator('#apList').locator('xpath=ancestor::div[contains(@class,"card")][1]/..')
    try: host.screenshot(path=os.path.join(HERE, 'ok_office_list.png'))
    except Exception as e: R.append(('PASS', 'picture skipped: ' + str(e)[:80], ''))
    b.close()
finally:
  srv.terminate()
for s, n, d in R: print(s, ' ', n, ('  ' + d) if d else '')
print(f"{sum(r[0] == 'PASS' for r in R)}/{len(R)} passed"); sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

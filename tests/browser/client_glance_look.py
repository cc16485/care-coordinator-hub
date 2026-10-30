"""The client at a glance (Samantha 2026-10-29). The real Hub page, offline, with made-up TEST people (the stand-ins from
client_care_look.py). A client receiving care gets ONE card on the Overview: born, address, phone (from a stand-in
client-glance function), care level, payer, Care Coordinator, main contact, needs attention. The header line and NEXT bar step
aside on the Overview only; Who they are moves to Activity & Documents; "Record a family request" opens the requests form.
AxisCare unreadable: the card says so. A lead keeps its Overview.
(python3 tests/browser/client_glance_look.py [screenshot folder], static server on 8829 from the repo root)"""
import os, sys, json
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
SHOTS = sys.argv[1] if len(sys.argv) > 1 else ''
ns = {'__file__': os.path.join(HERE, 'client_care_look.py')}; exec(open(os.path.join(HERE, 'client_care_look.py')).read().split('\nwith sync_playwright() as pw:')[0], ns)
STUB, DATA, FAKE = ns['STUB'], ns['DATA'], ns['FAKE']
GLANCE = {'801': {'dob': '1939-04-12', 'address': '1420 E Cherry St, Springfield, MO 65802', 'phone': '(417) 555-0134', 'start_date': '2025-03-03',
                  'contact': {'name': 'Susan Ames', 'relationship': 'Daughter', 'phone': '(417) 555-0190', 'from': 'Family Circle'},
                  'schedule': {'lines': [{'days': ['Monday', 'Wednesday', 'Friday'], 'start': '09:00', 'end': '13:00', 'caregiver': 'Toby H.', 'every_weeks': 1},
                                         {'days': ['Saturday'], 'start': '10:00', 'end': '14:00', 'caregiver': None, 'every_weeks': 1}], 'weekly_hours': 16}},
          '803': {'dob': None, 'address': None, 'phone': None, 'start_date': None, 'contact': None,
                  'schedule': {'lines': [{'days': [d], 'start': '08:00', 'end': '12:00', 'caregiver': 'Cg ' + str(i) + '.', 'every_weeks': 1}
                                         for i, d in enumerate(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])], 'weekly_hours': 28}}}
SETUP = r"""
(async()=>{ const W=window, of=W.fetch, G=%s;
  W.__glanceCalls=0;
  W.fetch=async(u,o)=>{ if(/client-glance/.test(String(u))){ W.__glanceCalls++; const ax=JSON.parse(o.body).axiscare_client_id;
      return G[ax]?new Response(JSON.stringify(G[ax]),{ status:200 }):new Response(JSON.stringify({ error:'AxisCare answered 502' }),{ status:502 }); }
    if(/family-send/.test(String(u))) return new Response(JSON.stringify({ sends:[], can_send:false, live:false }),{ status:200 });
    if(/review-moments/.test(String(u))) return new Response(JSON.stringify({ can_suggest:true, live:true, history:[], current:null }),{ status:200 });
    return of(u,o); };
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  const ago=d=>new Date(Date.now()-d*864e5).toLocaleDateString('en-CA',{ timeZone:'America/Chicago' });
  Object.assign(W.__care.state, { '801':'active', '802':'active', '803':'active' });
  DATA.client_checkins=[{ id:'ci802', client_name:'Walt Hale (TEST)', axiscare_client_id:'802', checkin_date:ago(5), coordinator:'Krystal' }];
  DATA.leads.push({ id:'N1', is_test:true, first_name:'Gail', last_name:'Ford', relationship:'daughter', phone:'4175550111', client_first_name:'Hank', client_last_name:'Ford (TEST)', funding_source:'private', status:'New', assigned_coordinator:'krystal@mo-care.com', created_at:new Date().toISOString() });
  window.__as('angie@mo-care.com','Angie Care');
})();
""" % json.dumps(GLANCE)
READ = r"""()=>{ const $=id=>document.getElementById(id), vis=el=>!!el&&el.offsetParent!==null&&getComputedStyle(el).display!=='none';
  return { card:$('cgCard').innerText, on:$('leadProfileView').classList.contains('cg-on'), top:vis($('cpTop')), facts:vis($('cpFacts')), cmd:vis($('cpCommand')),
    changes:vis($('cp_changes')), whoIn:$('cp_c_summary').parentNode.id, em:/—/.test($('cgCard').innerText),
    call:[...$('cgCard').querySelectorAll('[data-oc-phone]')].map(a=>a.getAttribute('data-oc-phone')) }; }"""
R = []
ok = lambda n, c, d='': R.append(['PASS' if c else 'FAIL', n, '' if c else str(d)[:700]])
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1280, 'height': 900}); errs = []
    pg.on('pageerror', lambda e: errs.append((str(e) + ' @ ' + str(getattr(e, 'stack', '') or ''))[:600]))
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    pg.goto('http://localhost:8829/index.html?proof=cg'); pg.wait_for_timeout(1500)
    for s in (STUB, DATA, FAKE): pg.evaluate('s=>(0,eval)(s)', s)
    pg.evaluate('s=>(0,eval)(s)', SETUP); pg.wait_for_timeout(2500)

    pg.evaluate("async()=>{ await openClient({ ax:'801' },'summary'); }"); pg.wait_for_timeout(1500); pg.evaluate('()=>window.scrollTo(0,0)')
    x = pg.evaluate(READ)
    ok('a client receiving care: the one card shows', x['on'] and 'Born' in x['card'], x)
    ok('born with age, address and phone from AxisCare', 'Apr 12, 1939 (age 87)' in x['card'] and '1420 E Cherry St' in x['card'] and '(417) 555-0134' in x['card'], x)
    ok('main contact from the Family Circle, with Call on the office line', 'Susan Ames (Daughter)' in x['card'] and '(417) 555-0190' in x['call'] and '(417) 555-0134' in x['call'], x)
    ok('the labels her mockup named', all(k in x['card'] for k in ['Born', 'Address', 'Phone', 'Care level', 'Pays by', 'Care Coordinator', 'Main contact', 'Needs attention']), x)
    ok('usual schedule: days, times, who, and weekly hours', 'Usual schedule' in x['card'] and 'Mon, Wed, Fri · 9 AM to 1 PM · with Toby H.' in x['card'] and 'Sat · 10 AM to 2 PM · no caregiver' in x['card'] and '16 hours a week' in x['card'], x)
    ok('when care started', 'Care started' in x['card'] and 'Mar 3, 2025' in x['card'], x)
    ok('on the Overview the header line, facts line, command area and requests card step aside', not x['top'] and not x['facts'] and not x['cmd'] and not x['changes'], x)
    ok('Who they are lives on Activity & Documents now', x['whoIn'] == 'cgMoreSlot', x)
    ok('no em dashes in the card', not x['em'], x)
    if SHOTS: pg.screenshot(path=os.path.join(SHOTS, 'glance-desktop.png'), full_page=False)
    pg.evaluate("()=>cpShowTab('care')"); pg.wait_for_timeout(400)
    ok('on another tab the header line comes back', pg.evaluate("()=>document.getElementById('cpTop').offsetParent!==null"))
    pg.evaluate("()=>{ cpShowTab('summary'); cgRequests(true); }"); pg.wait_for_timeout(400)
    ok('Record a family request: the requests card shows with its form open', pg.evaluate("()=>document.getElementById('cp_changes').offsetParent!==null && getComputedStyle(document.getElementById('cpchForm')).display==='block'"))
    calls = pg.evaluate('()=>window.__glanceCalls')
    ok('AxisCare is asked once for this client, not on every redraw', calls == 1, calls)
    if SHOTS:
        pg.evaluate("()=>{ document.getElementById('leadProfileView').classList.remove('cg-req'); window.scrollTo(0,0); }")
        pg.set_viewport_size({'width': 390, 'height': 844}); pg.wait_for_timeout(300)
        pg.screenshot(path=os.path.join(SHOTS, 'glance-phone.png'), full_page=False)
        pg.set_viewport_size({'width': 1280, 'height': 900})

    pg.evaluate("async()=>{ await openClient({ ax:'802' },'summary'); }"); pg.wait_for_timeout(1500)
    x = pg.evaluate(READ)
    ok('AxisCare unreadable: the card says so and guesses nothing', x['on'] and 'could not be read from AxisCare' in x['card'] , x)

    pg.evaluate("async()=>{ await openClient({ ax:'803' },'summary'); }"); pg.wait_for_timeout(1500)
    x = pg.evaluate(READ)
    ok('a busy week shows its first five lines and "show all 7"', 'Cg 4.' in x['card'] and 'Cg 5.' not in x['card'] and 'show all 7' in x['card'], x['card'])
    pg.evaluate("()=>cgSchedAll()"); pg.wait_for_timeout(400)
    x = pg.evaluate(READ)
    ok('show all opens every line', 'Cg 6.' in x['card'] and 'show fewer' in x['card'], x['card'])

    pg.evaluate("async()=>{ await openLeadProfile('N1','summary'); }"); pg.wait_for_timeout(1500)
    x = pg.evaluate(READ)
    ok('a lead keeps its Overview: no card, Who they are back in place', not x['on'] and x['card'] == '' and x['whoIn'] != 'cgMoreSlot' and x['top'], x)
    ok('no page errors', not errs, errs)
    b.close()
for r in R: print(r[0] + '  ' + r[1] + ('  ' + r[2] if r[2] else ''))
f = sum(1 for r in R if r[0] == 'FAIL'); print('\n%d passed, %d failed' % (len(R) - f, f)); sys.exit(1 if f else 0)

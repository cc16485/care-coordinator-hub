"""Care planning (Simpler Scheduling step 2, Samantha 2026-11-14, "Yes, use your picks"). The real page, offline, MADE-UP
people. The chart with what the client needs on top and ONE "Message caregivers about these hours" button that opens the
Ask caregivers panel; the My Work project, Journey link, onboarding goal and readiness chips are gone from above the chart;
the shortlist, family preference, the whole-team text and Flag gaps are under More; the roster shows one note per person
with the rest behind "why"; the order arrows show after "Change the order"; a new plan asks only who, town, days and level;
Hours and matching sits on Care planning. Nothing real is reached. (python3 tests/browser/care_planning_look.py; SHOTS=<folder>)"""
import os, sys, threading, functools, http.server, socketserver
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE)); SHOTS = os.environ.get('SHOTS', '')
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.TCPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=ROOT)); PORT = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
T = r"""
async () => {
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  window.sb = window.sb || {}; sb.auth = { getSession: async () => ({ data: { session: { access_token: 't' } } }) };
  const sent=[], saved=[];
  const POOL = { client_level: 2, meta: {}, group1: [], group0: [], prn_other: [], group2: [{ name: 'Example: Alice B.', level: 2 }, { name: 'Example: Gus H.', level: 3 }], prn_ongoing: [], excluded: [] };
  const realFetch = window.fetch;
  window.fetch = async (u, o) => { const s = String(u);
    if (s.includes('/functions/v1/coverage-run')) { const b = JSON.parse(o.body||'{}'); sent.push(b); if (b.action === 'candidates_v2') return new Response(JSON.stringify(POOL), { status: 200 }); return new Response('{}', { status: 200 }); }
    if (s.includes('/functions/v1/')) return new Response(JSON.stringify({ caregivers: [] }), { status: 200 });
    return realFetch(u, o); };
  window.persist = async (k, item) => { saved.push(k); }; window.ccConfirm = async () => true; window.alert = () => {};
  window.opEvent = () => {};
  DATA.ops_settings = Object.assign({}, DATA.ops_settings || {}, { coverage_send_live: true });
  DATA.coverage_cases = [];
  DATA.staffing_plans = [{ id: 'tbX', client: 'Example: Ruth M.', city: 'Nixa', zip: '65714', level: '2', days: ['mon','wed','fri'], status: 'building', created_at: '2026-11-10T10:00:00Z',
    slots: [{ k: 'am', label: 'Morning', start: '08:00', end: '12:00' }, { k: 'pm', label: 'Afternoon', start: '12:00', end: '16:00' }],
    cells: { 'mon|am': { name: 'Example: Dana R.', status: 'yes' }, 'wed|am': { name: 'Example: Dana R.', status: 'asked' } },
    options: { 'wed|am': [{ id: 'o1', name: 'Example: Gus H.', status: 'penciled' }] }, needs: ['transfers_gait_belt'] }];
  TB.pool = [{ name: 'Example: Alice B.', axiscare_id: '11', level: 2, city: 'Nixa', visits: [] }, { name: 'Example: Gus H.', axiscare_id: '12', level: 3, city: 'Ozark', visits: [] }];
  switchTab('teambuilder'); await sleep(300);
  const P = () => document.getElementById('tab-teambuilder');
  ok('the page is called Care planning', /Care planning/.test(P().querySelector('h2').innerText));
  ok('Hours and matching is a closed section here', !!document.getElementById('schedHoursBox') && !document.getElementById('schedHoursBox').open);
  tbNewForm(); await sleep(50);
  ok('a new plan asks only who, town, level and days: no presets, no My Work box, no open-hours toggle', !!document.getElementById('tb-client') && !!document.getElementById('tb-townzip') && !document.getElementById('tb-pattern') && !document.getElementById('tb-asproject') && !document.getElementById('tb-for-open'));
  tbOpen('tbX'); await sleep(300);
  const vis = () => { const c = P().cloneNode(true); c.querySelectorAll('details').forEach(d => { if (!d.open) [...d.children].forEach(ch => { if (ch.tagName !== 'SUMMARY') ch.remove(); }); }); return c.innerText.replace(/\s+/g,' '); };
  ok('above the chart: the needs line and one message button', /This client needs:/.test(vis()) && !!P().querySelector('[data-tb-ask]') && /Message caregivers about these hours/.test(vis()), vis().slice(0,700));
  ok('gone from above the chart: My Work project, Journey link, onboarding goal, readiness chips, Text several people', !/Make this a project on My Work/.test(vis()) && !/Link to a Journey/.test(vis()) && !P().querySelector('.tb2-ready') && !/Text several people/.test(P().innerText), vis().slice(0,900));
  ok('the whole-team text, Flag gaps and the shortlist are under More', /More for this plan/.test(vis()) && !/Ask the whole team about these hours/.test(vis()) && /Ask the whole team about these hours/.test(P().textContent) && /Flag gaps to recruiting/.test(P().textContent) && !/Flag gaps to recruiting/.test(vis()) && /Shortlist \(/.test(P().textContent) && !/Shortlist \(/.test(vis()), vis().slice(0,900));
  ok('each row still says how many are confirmed', /1 of 3 confirmed/.test(P().innerText) || /of 3/.test(P().innerText), P().innerText.slice(0,1200));
  window.__shotBoard = true;
  /* the one message button */
  await tbAskToggle('tbX'); await sleep(500);
  const c = (DATA.coverage_cases||[]).find(x => x.plan_id === 'tbX');
  ok('it makes a new-client message from the plan: town, days, first start to last end, never sent yet', c && c.kind === 'interest' && c.client_city === 'Nixa' && JSON.stringify(c.interest_days) === '["mon","wed","fri"]' && c.interest_start === '08:00' && c.interest_end === '16:00' && !sent.some(x=>x.action==='send_selected'), c);
  ok('and opens the same Ask caregivers panel', !!P().querySelector('.askp') && /Who do you want to ask\?/.test(P().innerText), P().innerText.slice(0,900));
  const n1 = (DATA.coverage_cases||[]).length; tbAskToggle('tbX'); await sleep(100); await tbAskToggle('tbX'); await sleep(300);
  ok('opening it again reuses the same message', (DATA.coverage_cases||[]).length === n1);
  /* a square */
  tbCell('wed|am'); await sleep(300);
  const sq = document.getElementById('tbAssign');
  ok('a square: the order arrows wait behind "Change the order"', !sq.querySelector('.tb2-mv') && /Change the order/.test(sq.innerText) && !/Text everyone on this shift/.test(sq.innerText), sq.innerText.slice(0,600));
  TB.reorder = true; tbRender(); await sleep(150);
  ok('...and show after it', !!document.getElementById('tbAssign').querySelector('.tb2-mv'));
  TB.reorder = false; tbRender(); await sleep(150);
  const rows = [...document.querySelectorAll('#tbPoolList details')];
  ok('the roster: one note per person, the rest behind "why"', rows.length >= 1 && rows.every(d => !d.open) && /why/.test(rows[0].querySelector('summary').innerText), document.getElementById('tbPoolList') && document.getElementById('tbPoolList').innerText.slice(0,400));
  ok('no em dashes in view', !/—/.test(vis()));
  return R;
}
"""
R = []
with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []
    pg = b.new_page(viewport={'width': 1200, 'height': 1400})
    pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url and '/functions/v1/' not in r.request.url else r.continue_())
    pg.goto(f'http://127.0.0.1:{PORT}/index.html?proof=careplanning'); pg.wait_for_timeout(1800)
    R += pg.evaluate(T)
    if SHOTS:
        pg.evaluate("async()=>{ TB_ASK_OPEN={}; TB.cellOpen=null; tbRender(); await new Promise(r=>setTimeout(r,200)); window.scrollTo(0,0); }")
        pg.screenshot(path=os.path.join(SHOTS, '5 Care planning.png'), full_page=True)
        pg.evaluate("async()=>{ await tbAskToggle('tbX'); await new Promise(r=>setTimeout(r,400)); window.scrollTo(0,0); }")
        pg.screenshot(path=os.path.join(SHOTS, '6 Care planning, message caregivers.png'), full_page=True)
    pg.set_viewport_size({'width': 400, 'height': 900}); pg.wait_for_timeout(200)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
srv.shutdown()
for st, n, d in R: print(st + '  ' + n + ('' if st == 'PASS' else '  ' + str(d)))
print(f"{sum(1 for r in R if r[0]=='PASS')}/{len(R)} passed")
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

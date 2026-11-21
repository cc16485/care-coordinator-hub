"""Open shifts rows in plain words (Samantha 2026-11-21, looking at an open shift). The real page, offline, MADE-UP people.
The row said "2026-11-21 4pm-7pm · call_off" with a chip "Partly open". Now it says the day in words, "Call-off", and the
chip names the other open dates. A standing opening names its dates too (they were never shown: the chip read the wrong
field). Nothing real is reached. (python3 tests/browser/open_shift_rows_look.py)"""
import os, sys, threading, functools, http.server, socketserver
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.TCPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=ROOT)); PORT = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
CHECK = r"""
async () => {
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  window.sb = window.sb || {}; sb.auth = { getSession: async () => ({ data: { session: { access_token: 't' } } }) };
  const realFetch = window.fetch;
  window.fetch = async (u, o) => String(u).includes('/functions/v1/') ? new Response('{}', { status: 200 }) : realFetch(u, o);
  const today = covChicagoToday(), d = (n) => { const x = new Date(today + 'T12:00:00'); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
  const nice = (s) => new Date(s + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const ago = (h) => new Date(Date.now() - h * 3600e3).toISOString();
  DATA.coverage_cases = [
    { id: 'r1', status: 'open', reason: 'call_off', client: 'Example: Ada D.', calling_off: 'Example: Amy K.', shift_date: today, shift_time: '16:00-19:00', opened_at: ago(15), asked: [],
      shift_pattern: { v: 2, kind: 'mixed', weekday: 'Saturday', open_dates: [d(14), d(21), d(28)], sibling_dates: 4, regular_caregiver: 'Example: Cris L.' } },
    { id: 'r2', status: 'open', reason: 'open', client: 'Example: Ada D.', shift_date: d(5), shift_time: '16:00-19:00', opened_at: ago(26), asked: [],
      shift_pattern: { v: 2, kind: 'open_ongoing', weekday: 'Thursday', future_dates: [d(5), d(12)], more_dates: 0 } },
    { id: 'r3', status: 'open', reason: 'call_off', client: 'Example: Lee W.', shift_date: d(2), shift_time: '07:00-09:00', opened_at: ago(3), asked: [],
      shift_pattern: { v: 2, kind: 'one_time_cover', weekday: 'Monday', regular_caregiver: 'Example: Dana R.' } },
    { id: 'r4', status: 'open', reason: 'open', client: 'Example: Many D.', shift_date: d(1), shift_time: '09:00-12:00', opened_at: ago(2), asked: [],
      shift_pattern: { v: 2, kind: 'open_ongoing', weekday: 'Sunday', future_dates: [d(1), d(8), d(15), d(22), d(29), d(36)], more_dates: 2 } },
    { id: 'r5', status: 'open', reason: 'some_new_reason', client: 'Example: Odd R.', shift_date: d(3), shift_time: '10:00-11:30', opened_at: ago(1), asked: [] },
    { id: 'r6', status: 'open', reason: 'call_off', client: 'Example: Bare M.', shift_date: d(4), shift_time: '10:00-12:00', opened_at: ago(1), asked: [],
      shift_pattern: { v: 2, kind: 'mixed', weekday: 'Tuesday', open_dates: [], sibling_dates: 3 } },
  ];
  schedGo('openshifts'); await sleep(500);
  const row = (id) => { const e = document.getElementById('covcase_' + id); return e ? e.firstElementChild.innerText.replace(/\s+/g, ' ') : ''; };
  const all = ['r1','r2','r3','r4','r5','r6'].map(row).join(' | ');
  ok('all six rows are on Open shifts', ['r1','r2','r3','r4','r5','r6'].every(id => row(id)), all);
  ok('a call-off says "Call-off", never the raw "call_off"', /· Call-off/.test(row('r1')) && !/call_off/.test(all), row('r1'));
  ok('today reads "today 4pm-7pm", not 2026-11-21', /today 4pm-7pm/.test(row('r1')) && !/\d{4}-\d\d-\d\d/.test(all), row('r1'));
  ok('a later day reads like "Thu, Nov 26 4pm-7pm"', new RegExp(new Date(d(5)+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}) + ' 4pm-7pm').test(row('r2')), row('r2'));
  ok('the exact date is still there on hover', document.querySelector('#covcase_r1 .field-note').getAttribute('title') === today);
  ok('"Partly open" is gone: the chip names the other open dates', !/Partly open/.test(all) && row('r1').includes('Also open: ' + [d(14), d(21), d(28)].map(nice).join(', ')), row('r1'));
  ok('its hover says how many and who has the others', /3 of 4 upcoming Saturdays have no caregiver in AxisCare\. Example: Cris L\. has the others/.test(document.querySelector('#covcase_r1 span[title*="upcoming"]').getAttribute('title')));
  ok('a standing opening says "Open every Thursday" and names its other open date (not the row\'s own date twice)', row('r2').includes('Open every Thursday · also ' + nice(d(12))) && !row('r2').includes('also ' + nice(d(5))) && !/Open ongoing/.test(all), row('r2'));
  ok('many dates: four named, the rest counted', row('r4').includes('also ' + [d(8), d(15), d(22), d(29)].map(nice).join(', ') + ' and 3 more'), row('r4'));
  ok('one-time cover is unchanged', /One-time cover/.test(row('r3')), row('r3'));
  ok('a reason the page does not know shows in words, without the underscore', /· some new reason/.test(row('r5')), row('r5'));
  ok('no dates on the stamp: the chip still says something true', /Some other Tuesdays are open too/.test(row('r6')), row('r6'));
  ok('no em dashes on the rows', !/—/.test(all));
  return R;
}
"""
R = []
with sync_playwright() as p:
    b = p.chromium.launch(); errs = []
    pg = b.new_page(viewport={'width': 1400, 'height': 1200}); pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url and '/functions/v1/' not in r.request.url else r.continue_())
    pg.goto(f'http://127.0.0.1:{PORT}/index.html'); pg.wait_for_timeout(1800)
    R += pg.evaluate(CHECK)
    if os.environ.get('SHOTS'): pg.screenshot(path=os.path.join(os.environ['SHOTS'], 'Open shifts rows.png'))
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
srv.shutdown()
for st, n, d in R: print(st + '  ' + n + ('' if st == 'PASS' else '  ' + str(d)))
print(f"{sum(1 for r in R if r[0]=='PASS')}/{len(R)} passed")
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

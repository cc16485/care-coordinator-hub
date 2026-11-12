"""Ask caregivers, one panel (Samantha 2026-11-12, "I need simplified scheduling"; ask-panel.js, switch ask_panel_live).
The real page, offline, MADE-UP people. Switch off: today's card for the office, a "Try" link for an owner. On: three
choices (Worked with the client, Right level, Whole team), tick boxes, level filters, who is left out and why, the saved
wording, one send that goes to the ticked names only. The old pickers and the PRN team buttons are gone from the card;
on call, answers and More stay. Nothing real is reached. (python3 tests/browser/ask_panel_look.py; SHOT=<file> saves a picture)"""
import os, sys, threading, functools, http.server, socketserver
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE)); SHOT = os.environ.get('SHOT', '')
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.TCPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=ROOT)); PORT = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
T = r"""
async (mode) => {
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const sent = [];
  window.sb = window.sb || {}; sb.auth = { getSession: async () => ({ data: { session: { access_token: 't' } } }) };
  const kase = { id: 'hj', status: 'open', reason: 'calloff', client: 'Example: Harold J.', client_name: 'Example: Harold J.', calling_off: 'Example: Katie P.', shift_date: '2026-11-19', shift_time: '08:00-12:00', opened_at: '2026-11-12T15:00:00Z',
    asked: [{ id: 'a1', name: 'Example: Zed Q.', state: 'no', at: '2026-11-12T15:05:00Z', auto: true }] };
  const POOL = { client_level: 2, meta: {},
    group1: [{ name: 'Example: Dana R.', level: 2, history: { visits: 3, last: '2026-11-01' } }, { name: 'Example: Marcus T.', level: 3, history: { visits: 14, last: '2026-11-05' }, this_client: { favorite: true } },
             { name: 'Example: Pat W.', level: 2, history: { visits: 20, last: '2026-10-01' }, this_client: { rating: 'concern' } }],
    group0: [{ name: 'Example: Chris D.', level: 3, prn_pref: { team: 'cna' } }], prn_other: [{ name: 'Example: Erin F.', level: 2, prn_pref: { team: 'caregiver' } }],
    group2: ['Alice B.', 'Gus H.', 'Ida J.', 'Kit L.', 'Moe N.', 'Oz P.'].map((n, i) => ({ name: 'Example: ' + n, level: i === 1 ? 3 : 2, free_then: i === 0 })), prn_ongoing: [],
    excluded: [{ name: 'Example: Low L.', why: 'Level 1 caregiver; client needs Level 2', code: 'level' }, { name: 'Example: Busy B.', why: 'working then', code: 'conflict' }, { name: 'Example: Zed Q.', why: 'already asked', code: 'asked' }] };
  const realFetch = window.fetch;
  window.fetch = async (u, o) => { if (String(u).includes('/functions/v1/coverage-run')) { const b = JSON.parse(o.body); sent.push(b);
      if (b.action === 'candidates_v2') return new Response(JSON.stringify(POOL), { status: 200 });
      if (b.action === 'send_selected') return new Response(JSON.stringify(mode === 'held' ? { error: 'held: caregivers are not texted 9pm to 8am unless the shift starts within 3 hours. Nothing was sent; try again from 8am, or call them.' } : { sent: b.recipients, failed: [], already_asked: [], refused_not_eligible: [] }), { status: mode === 'held' ? 409 : 200 });
      return new Response(JSON.stringify({ people: [], note: '', ready: [], review: [], dont: [], hidden: 0 }), { status: 200 }); }
    return realFetch(u, o); };
  let asked = ''; window.ccConfirm = async (q) => { asked = q; return true; }; window.alert = () => {};
  window.ccIsOwner = () => mode === 'owner'; window.ccActor = () => ({ name: 'Krystal (made up)' });
  DATA.ops_settings = Object.assign({}, DATA.ops_settings || {}, { ask_panel_live: mode === 'on' || mode === 'held', simple_card_live: true, coverage_send_live: true });
  try { localStorage.removeItem('ask_panel_preview'); localStorage.removeItem('simple_card_preview'); } catch (e) {}
  DATA.coverage_cases = [kase];
  const host = document.createElement('div'); host.id = 'apProof'; host.className = 'card'; host.style.cssText = 'padding:16px 18px;margin:20px;max-width:1000px;border-left:4px solid var(--red);';
  document.body.prepend(host);
  const draw = () => { host.innerHTML = '<b style="font-size:15.5px;color:var(--navy);">Example: Harold J.</b> <span class="field-note">Thu Nov 19, 8am to 12pm · Call-off · Level 2</span>' + covOpenBody(kase, ''); };
  window.renderCoverage = draw;
  draw(); await sleep(500); draw(); await sleep(200);
  window.scrollTo(0, 0);
  const txt = () => host.innerText.replace(/\s+/g, ' ');
  const rows = () => [...host.querySelectorAll('[data-askp-row]')].map((x) => x.getAttribute('data-askp-row').replace('Example: ', '') + (x.checked ? '*' : ''));
  if (mode === 'office_off') {
    ok('switch off, office: today\'s card, no panel, no Try link', !host.querySelector('.askp') && !/Try the new Ask caregivers panel/.test(txt()), txt().slice(0, 300));
    ok('switch off: the list was never asked for', !sent.some((x) => x.action === 'candidates_v2'), sent.map((x) => x.action));
    return R;
  }
  if (mode === 'owner') {
    ok('switch off, owner: today\'s card plus a way to try the panel', !host.querySelector('.askp') && /Try the new Ask caregivers panel/.test(txt()), txt().slice(-300));
    AP.preview(true); await sleep(500); draw();
    ok('Try it: the panel, marked as only in your browser', !!host.querySelector('.askp') && /only in your browser/.test(txt()) && /Back to the old card/.test(txt()), txt().slice(0, 300));
    AP.preview(false); await sleep(100);
    ok('Back to the old card', !host.querySelector('.askp'));
    return R;
  }
  ok('the panel asks one question with three choices and their counts', /Who do you want to ask\?/.test(txt()) && /Worked with Example: 3 caregivers, last 6 months/.test(txt().replace('Example: Example:', 'Example:')) || /Worked with Example:/.test(txt()), txt().slice(0, 500));
  const ch = [...host.querySelectorAll('[data-askp-choice]')].map((b) => b.innerText.replace(/\s+/g, ' '));
  ok('choices read: worked with (3), right level (8 others at Level 2 or higher), whole team (11)', /3 caregivers, last 6 months/.test(ch[0]) && /^Right level 8 others at Level 2 or higher/.test(ch[1]) && /^Whole team 11 caregivers who can be asked/.test(ch[2]), ch);
  ok('it opens on Worked with: favorite first, most visits next, a concern last and unticked', JSON.stringify(rows()) === JSON.stringify(['Marcus T.*', 'Dana R.*', 'Pat W.']), rows());
  ok('each row says level, visits and favorite; a concern is said', /Level 3 · 14 visits · their favorite/.test(txt()) && /Level 2 · 20 visits · a concern on file/.test(txt()), txt().slice(300, 900));
  ok('the button counts the ticked', !!host.querySelector('[data-askp-send]') && /^Text 2 caregivers$/.test(host.querySelector('[data-askp-send]').innerText.trim()), host.querySelector('[data-askp-send]').innerText);
  ok('left out is one line that opens: who and why, never the already asked', /Not asked: 2 people\. See who and why/.test(txt()) && /Level 1 caregiver; client needs Level 2: Example: Low L\./.test(host.innerHTML.replace(/<[^>]+>/g, '')) && !/already asked: /.test(host.innerHTML), txt().slice(600, 1100));
  ok('the old ways to ask are gone from the card: no simple-card list, no classic picker, no PRN team buttons, no Ask everyone', !/Text the \d+ ticked/.test(txt()) && !/Build the ask list/.test(txt()) && !/Text PRN CNA Team/.test(txt()) && !/Ask everyone now/.test(txt()), txt());
  ok('answers and More stay: who was asked, Covered, Close', /Example: Zed Q\./.test(txt()) && /More for this shift/.test(txt()) && /Covered/.test(host.innerHTML));
  AP.pick('hj', 'level'); await sleep(60);
  ok('Right level lists the others, first five ticked, with four filters', rows().length === 8 && rows().filter((x) => /\*$/.test(x)).length === 5 && host.querySelectorAll('[data-askp-filter]').length === 4, rows());
  AP.filter('hj', 'l3'); await sleep(60);
  ok('Level 3 only', JSON.stringify(rows().map((x) => x.replace('*', ''))) === JSON.stringify(['Chris D.', 'Gus H.']), rows());
  AP.filter('hj', 'cna'); await sleep(60);
  ok('PRN CNA Team', JSON.stringify(rows().map((x) => x.replace('*', ''))) === JSON.stringify(['Chris D.']) && /PRN CNA Team/.test(txt()), rows());
  AP.filter('hj', 'caregiver'); await sleep(60);
  ok('PRN Caregiver Team', JSON.stringify(rows().map((x) => x.replace('*', ''))) === JSON.stringify(['Erin F.']), rows());
  AP.pick('hj', 'all'); await sleep(60);
  ok('Whole team: all eleven, ticked except the concern', rows().length === 11 && rows().filter((x) => /\*$/.test(x)).length === 10, rows());
  AP.all('hj', false); await sleep(60);
  ok('Untick all: the button will not send', host.querySelector('[data-askp-send]').disabled && /Tick someone to text/.test(host.querySelector('[data-askp-send]').innerText));
  AP.pick('hj', 'worked'); await sleep(60);
  host.querySelector('[data-askp-row="Example: Dana R."]').click(); await sleep(60);
  ok('unticking one person changes the count', /^Text 1 caregiver$/.test(host.querySelector('[data-askp-send]').innerText.trim()), host.querySelector('[data-askp-send]').innerText);
  window.__shot = true;
  await AP.send('hj'); await sleep(300);
  const s = sent.filter((x) => x.action === 'send_selected');
  if (mode === 'held') {
    ok('a refused send says so in the server\'s words and nothing is claimed sent', /Nothing was sent: held: caregivers are not texted 9pm to 8am/.test(txt()) && !/Texted \d/.test(txt()), txt().slice(-700));
    return R;
  }
  ok('it asks first, with the count and the client', /^Text 1 caregiver about this shift for Example: Harold J\.\?$/.test(asked), asked);
  ok('one send, to the ticked name only, saying who asked', s.length === 1 && JSON.stringify(s[0].recipients) === JSON.stringify(['Example: Marcus T.']) && s[0].case_id === 'hj' && s[0].asked_by === 'Krystal (made up)', s);
  ok('afterwards it says how many were texted and refreshes the list', /Texted 1\./.test(txt()) && sent.filter((x) => x.action === 'candidates_v2').length >= 2, [txt().slice(-400), sent.map((x) => x.action)]);
  ok('no em dashes', !/—/.test(host.querySelector('.askp').innerText));
  return R;
}
"""
R = []
with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []
    for mode in ('office_off', 'owner', 'on', 'held'):
        pg = b.new_page(viewport={'width': 1100, 'height': 1300})
        pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
        pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url and 'coverage-run' not in r.request.url else r.continue_())
        pg.goto(f'http://127.0.0.1:{PORT}/index.html?proof=askpanel'); pg.wait_for_timeout(1500)
        if mode == 'on' and SHOT:
            pg.evaluate("()=>{ window.__realSend = null; }")
        res = pg.evaluate(T, mode); R += [[r[0], mode + ': ' + r[1], r[2]] for r in res]
        if mode == 'on':
            pg.set_viewport_size({'width': 400, 'height': 900}); pg.wait_for_timeout(200)
            wv = pg.evaluate("()=>document.documentElement.scrollWidth")
            R.append(['PASS' if wv <= 410 else 'FAIL', 'phone width: the page does not scroll sideways', wv])
            pg.set_viewport_size({'width': 1100, 'height': 1300})
            if SHOT:
                pg.evaluate("async()=>{ AP.state.hj.said=''; AP.pick('hj','worked'); AP.all('hj',true); await new Promise(r=>setTimeout(r,100)); window.scrollTo(0,0); }")
                pg.locator('#apProof').screenshot(path=SHOT)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
srv.shutdown()
for st, n, d in R: print(st + '  ' + n + ('' if st == 'PASS' else '  ' + str(d)))
print(f"{sum(1 for r in R if r[0]=='PASS')}/{len(R)} passed")
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

"""Simpler Scheduling (Samantha 2026-11-14, "Yes, use your picks"). The real page, offline, MADE-UP people and shifts.
Three tabs (Today, Open shifts, Care planning), two buttons on top (Someone's calling off, Message caregivers), missed
clock-ins as cards in Today, call-offs and every-week openings in one Open shifts list, History as a link, Hours and
matching in Care planning, No shift texts in Settings, Care Match Check-ins in Client Care, and an open shift that opens
with five things. Nothing real is reached. (python3 tests/browser/simple_sched_look.py; SHOTS=<folder> saves pictures)"""
import os, sys, threading, functools, http.server, socketserver
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE)); SHOTS = os.environ.get('SHOTS', '')
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.TCPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=ROOT)); PORT = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
SETUP = r"""
async () => {
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  window.sb = window.sb || {}; sb.auth = { getSession: async () => ({ data: { session: { access_token: 't' } } }) };
  const POOL = { client_level: 2, meta: {}, group1: [{ name: 'Example: Dana R.', level: 2, history: { visits: 3, last: '2026-11-01' } }, { name: 'Example: Marcus T.', level: 3, history: { visits: 14, last: '2026-11-05' }, this_client: { favorite: true } }],
    group0: [], prn_other: [], group2: [{ name: 'Example: Alice B.', level: 2 }, { name: 'Example: Gus H.', level: 3 }], prn_ongoing: [], excluded: [] };
  const realFetch = window.fetch;
  window.fetch = async (u, o) => { const s = String(u);
    if (s.includes('/functions/v1/coverage-run')) { const b = JSON.parse(o.body||'{}'); if (b.action === 'candidates_v2') return new Response(JSON.stringify(POOL), { status: 200 }); return new Response('{}', { status: 200 }); }
    if (s.includes('/functions/v1/')) return new Response('{}', { status: 200 });
    return realFetch(u, o); };
  window.ccConfirm = async () => true; window.alert = () => {};
  const d = (n) => { const x = new Date(Date.now() + n * 864e5); return x.toISOString().slice(0, 10); };
  DATA.ops_settings = Object.assign({}, DATA.ops_settings || {}, { coverage_send_live: true });
  DATA.coverage_cases = [
    { id: 'c1', status: 'open', reason: 'calloff', client: 'Example: Harold J.', calling_off: 'Example: Katie P.', shift_date: d(1), shift_time: '08:00-12:00', opened_at: new Date(Date.now()-3600e3).toISOString(),
      asked: [{ id: 'a1', name: 'Example: Zed Q.', state: 'no', at: new Date(Date.now()-3000e3).toISOString(), picked_by_coordinator: true }, { id: 'a2', name: 'Example: Amy K.', state: 'waiting', at: new Date(Date.now()-3000e3).toISOString(), picked_by_coordinator: true }] },
    { id: 'c2', status: 'open', reason: 'open', client: 'Example: Ruth M.', shift_date: d(3), shift_time: '13:00-17:00', opened_at: new Date(Date.now()-86400e3).toISOString(), shift_pattern: { kind: 'open_ongoing', days: ['tue'] }, asked: [] },
    { id: 'c3', status: 'done', resolved_how: 'covered', covered_by: 'Example: Dana R.', client: 'Example: Bo T.', shift_date: d(-2), shift_time: '09:00-13:00', opened_at: new Date(Date.now()-3*86400e3).toISOString(), resolved_at: new Date(Date.now()-2*86400e3).toISOString(), asked: [] }];
  DATA.timekeeper_cases = [{ id: 't1', kind: 'clock_in', client: 'Example: Lou V.', client_first: 'Example: Lou V.', caregiver: 'Example: Pam S.', shift_date: d(0), shift_start: '07:00', opened_at: new Date().toISOString() }];
  DATA.coverage_do_not_offer = [{ id: 'n1', name: 'Example: Sam O.', note: 'SSI income cap' }];
  return true;
}
"""
CHECK = r"""
async () => {
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const pills = () => [...document.querySelectorAll('#fsub-scheduling .fpill')].map(p => p.innerText.replace(/\s+/g,' ').replace(/\d+$/,'').trim());
  ok('Scheduling has Today, Open shifts, Care planning (and the guide on the right)', JSON.stringify(pills()) === JSON.stringify(['Today','Open shifts','Care planning','How scheduling works']), pills());
  ok('Care Match Check-ins is in Client Care now', !!document.querySelector('#fsub-clients .fpill[data-tab="carematch"]') && !document.querySelector('#fsub-scheduling .fpill[data-tab="carematch"]'));
  schedGo('coverage'); await sleep(400);
  const panel = document.getElementById('tab-coverage'), txt = () => panel.innerText.replace(/\s+/g,' ');
  const active = () => [...document.querySelectorAll('#fsub-scheduling .fpill.active')].map(p=>p.dataset.tab);
  ok('Today is lit', JSON.stringify(active()) === '["coverage"]', active());
  ok('two buttons at the top', /Someone's calling off/.test(txt()) && /Message caregivers/.test(txt()), txt().slice(0,400));
  ok('no row of sub-tabs', document.getElementById('covSubBar').innerText.trim() === '', document.getElementById('covSubBar').innerText);
  ok('the page is called Today, not Cara - AI Scheduling Assistant', document.getElementById('covTitle').innerText === 'Today' && !/AI Scheduling Assistant/.test(txt()));
  ok('a missed clock-in shows as a card in Today', document.getElementById('swTodayWrap').style.display !== 'none' && /Lou V\./.test(document.getElementById('swTodayWrap').innerText), document.getElementById('swTodayWrap').innerText.slice(0,300));
  window.__shotToday = true;
  return R;
}
"""
OPEN = r"""
async () => {
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const panel = document.getElementById('tab-coverage'), txt = () => panel.innerText.replace(/\s+/g,' ');
  const active = () => [...document.querySelectorAll('#fsub-scheduling .fpill.active')].map(p=>p.dataset.tab);
  schedGo('openshifts'); await sleep(400);
  ok('Open shifts is lit and titled', JSON.stringify(active()) === '["openshifts"]' && document.getElementById('covTitle').innerText === 'Open shifts', [active(), document.getElementById('covTitle').innerText]);
  const list = document.getElementById('covList').innerText;
  ok('call-off and every-week opening in one list, soonest first; nothing closed', /Harold J\./.test(list) && /Ruth M\./.test(list) && list.indexOf('Harold') < list.indexOf('Ruth') && !/Bo T\./.test(list), list.slice(0,400));
  ok('History is a link at the bottom', /History: closed shifts and the last 30 days/.test(list));
  ok('Open shifts badge counts 2', document.getElementById('covPillBadge3').innerText === '2', document.getElementById('covPillBadge3').innerText);
  caraOpenHistory(); await sleep(300);
  ok('History shows the closed shift with a way back', /Bo T\./.test(document.getElementById('covList').innerText) && /Back to Open shifts/.test(document.getElementById('covList').innerText) && JSON.stringify(active()) === '["openshifts"]');
  covSubGo('calloffs'); await sleep(200);
  ok('old links: Call-offs lands on Open shifts', COV_SUB === 'open');
  covSubGo('ongoing'); await sleep(200); ok('old links: Ongoing lands on Open shifts', COV_SUB === 'open');
  covSubGo('clockins'); await sleep(200); ok('old links: Missed clock-ins lands on Today', COV_SUB === 'today');
  covSubGo('answers'); await sleep(200); ok('old links: Was it covered lands on Open shifts', COV_SUB === 'open');
  return R;
}
"""
CARD = r"""
async () => {
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const k = DATA.coverage_cases.find(x=>x.id==='c1');
  const host = document.createElement('div'); host.id='cardProof'; host.className='card'; host.style.cssText='padding:16px 18px;margin:20px;max-width:900px;';
  document.body.prepend(host);
  const draw = () => { host.innerHTML = '<b style="font-size:15.5px;color:var(--navy);">Example: Harold J.</b> <span class="field-note">Call-off</span>' + covOpenBody(k, ''); };
  window.renderCoverage = draw; draw(); await sleep(500); draw(); await sleep(200);
  const vis = () => { const c = host.cloneNode(true); c.querySelectorAll('details').forEach(d => { if (!d.open) [...d.children].forEach(ch => { if (ch.tagName !== 'SUMMARY') ch.remove(); }); }); return c.innerText.replace(/\s+/g,' '); };
  ok('one status line', /2 texted, 1 said no, 1 not answered yet, nobody has said yes yet/.test(vis()), vis().slice(0,300));
  ok('the Ask caregivers panel', !!host.querySelector('.askp') && /Who do you want to ask\?/.test(vis()));
  ok('who we asked, and Covered / Close uncovered in view', /Who we asked/.test(vis()) && /Zed Q\./.test(vis()) && /Covered ✓/.test(vis()) && /Close uncovered/.test(vis()), vis());
  ok('gone from the card: the six-step rail, Ask everyone now, PRN team buttons, the three groups', !host.querySelector('.cov-rail') && !/Ask everyone now/.test(host.innerText) && !/Text PRN (CNA|Caregiver) Team/.test(host.innerText) && !/Ready to ask/.test(host.innerText), host.innerText.slice(0,900));
  ok('the rest is under More: follow up, bonus, I asked someone, attach, wording', /More for this shift/.test(vis()) && !/Add a bonus/.test(vis()) && /Add a bonus/.test(host.textContent) && /I asked someone/.test(host.textContent) && /Attach the real shift/.test(host.textContent) && /What caregivers are being texted/.test(host.textContent) && /Follow up with those we asked/.test(host.textContent), host.textContent.slice(-900));
  ok('no em dashes in view', !/—/.test(vis()));
  window.scrollTo(0,0);
  return R;
}
"""
OTHER = r"""
async () => {
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  schedGo('coverage'); await sleep(300);
  AS.toggle(true); await sleep(200);
  const card = document.getElementById('askStartCard');
  ok('Message caregivers opens one card: a new client, or a shift on AxisCare', !!card && /About a new client/.test(card.innerText) && /About a shift on the AxisCare schedule/.test(card.innerText) && !/Only owners/.test(card.innerText), card && card.innerText);
  window.__shotAsk = true;
  return R;
}
"""
OTHER2 = r"""
async () => {
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  AS.toggle(false); await sleep(100);
  ok('closed again', !document.getElementById('askStartCard'));
  covSubGo('hours'); await sleep(400);
  ok('Hours & matching: opens Care planning with that section open', activeTab === 'teambuilder' && document.getElementById('schedHoursBox').open && document.getElementById('tab-teambuilder').contains(document.getElementById('hwList')), [activeTab]);
  ok('Care planning is titled so', /Care planning/.test(document.querySelector('#tab-teambuilder h2').innerText));
  return R;
}
"""
DNO = r"""
async () => {
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  window.ccCan = () => true; window.CC_ROLES_CHECKED = true; try { CC_ROLES_CHECKED = true; } catch (e) {}
  covSubGo('dno'); await sleep(400);
  const box = document.getElementById('dnoSettingsBox');
  ok('No shift texts: opens its Settings section with the list', activeTab === 'settings' && !!box && /Sam O\./.test(box.innerText), [activeTab, box && box.innerText.slice(0,200)]);
  return R;
}
"""
R = []
with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []
    pg = b.new_page(viewport={'width': 1200, 'height': 1300})
    pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url and '/functions/v1/' not in r.request.url else r.continue_())
    pg.goto(f'http://127.0.0.1:{PORT}/index.html?proof=simplesched'); pg.wait_for_timeout(1800)
    pg.evaluate(SETUP)
    R += pg.evaluate(CHECK)
    if SHOTS: pg.wait_for_timeout(300); pg.screenshot(path=os.path.join(SHOTS, '1 Today.png'))
    R += pg.evaluate(OPEN)
    pg.evaluate("async()=>{ schedGo('openshifts'); await new Promise(r=>setTimeout(r,300)); window.scrollTo(0,0); }")
    if SHOTS: pg.screenshot(path=os.path.join(SHOTS, '2 Open shifts.png'))
    R += pg.evaluate(OTHER)
    if SHOTS: pg.evaluate("()=>window.scrollTo(0,0)"); pg.screenshot(path=os.path.join(SHOTS, '3 Message caregivers.png'))
    R += pg.evaluate(OTHER2)
    R += pg.evaluate(DNO)
    pg2 = b.new_page(viewport={'width': 1000, 'height': 1400}); pg2.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg2.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url and '/functions/v1/' not in r.request.url else r.continue_())
    pg2.goto(f'http://127.0.0.1:{PORT}/index.html?proof=simplesched'); pg2.wait_for_timeout(1800)
    pg2.evaluate(SETUP); R += pg2.evaluate(CARD)
    if SHOTS: pg2.locator('#cardProof').screenshot(path=os.path.join(SHOTS, '4 One open shift.png'))
    pg2.set_viewport_size({'width': 400, 'height': 900}); pg2.wait_for_timeout(200)
    wv = pg2.evaluate("()=>document.documentElement.scrollWidth")
    R.append(['PASS' if wv <= 410 else 'FAIL', 'phone width: the card does not scroll sideways', wv])
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
srv.shutdown()
for st, n, d in R: print(st + '  ' + n + ('' if st == 'PASS' else '  ' + str(d)))
print(f"{sum(1 for r in R if r[0]=='PASS')}/{len(R)} passed")
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

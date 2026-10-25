"""The simple case card (2026-10-24, Samantha: "This is all confusing and doesnt seem to work well together"; approved
mockup Simplified). The real page, offline, FAKE data shaped like Dan's overnight: one status line, three actions, the
compact answers, one list in three groups, everything else folded; the old buttons gone; switch off = today's card, with
an owners-only way to try it. Nothing real is reached."""
import os
from playwright.sync_api import sync_playwright
PORT = os.environ.get('PORT', '8793'); SHOT = os.environ.get('SHOT', '')
T = r"""
async (mode) => {
  const sent = [];
  window.sb = window.sb || {}; sb.auth = { getSession: async () => ({ data: { session: { access_token: 't' } } }) };
  const A = (id, name, state, at, o = {}) => ({ id, name, state, at, auto: true, cara_wave: 1, ...o });
  const kase = { id: 'dan', status: 'open', reason: 'calloff', client: 'Dan Probstfield', calling_off: 'Katie Parker', shift_date: '2026-10-25', shift_time: '22:00-06:00', opened_at: '2026-10-25T00:40:00Z',
    asked: [A('a1', 'Aimee Driggers', 'no', '2026-10-25T00:42:00Z'), A('a2', 'Elizabeth Johns', 'waiting', '2026-10-25T00:42:00Z'), A('a3', 'Jody Dake', 'no', '2026-10-25T00:42:00Z'), A('a4', 'Angela Muse', 'waiting', '2026-10-25T00:54:00Z', { cara_wave: 2 })] };
  const C = (n, st, at) => ({ at, state: st, how: 'Cara wave 1', by_text: true });
  const LIST = { live: true,
    ready: [ { name: 'Elizabeth Johns', label: 'Familiar', why: '2 visits with this client, 2 overnight, last 2026-10-09T00:00:00-05:00', contacted: C('', 'waiting', '2026-10-25T00:42:00Z') },
             { name: 'Aimee Driggers', label: 'Familiar', why: '10 visits with this client, last 2026-10-24T07:45:00-05:00', contacted: C('', 'no', '2026-10-25T00:42:00Z') },
             { name: 'Angela Muse', label: '', why: 'worked a shift in the last 14 days. no availability on file (Unknown)', contacted: C('', 'waiting', '2026-10-25T00:54:00Z') },
             ...['Grace Levering', 'Karlesa Alejandro', 'Ashley Lloyd', 'Rebecca Harmon', 'Dixie Kuhn', 'Zachary Troutman', 'Susan Durbin'].map((n) => ({ name: n, label: '', why: 'worked a shift in the last 14 days. no availability on file (Unknown)', contacted: null })) ],
    review: [ { name: 'Jody Dake', kind: 'call', label: 'Overtime', why: 'Overtime risk: 50h already this week + 8h = 58h', contacted: C('', 'no', '2026-10-25T00:42:00Z') },
              { name: 'Deborah Hall', kind: 'call', label: 'Overtime', why: 'Overtime risk: 34h already this week + 8h = 42h', contacted: null } ],
    dont: [ { name: 'Mary Evans', label: 'Clearance', why: 'Needs Verification: dementia training' }, { name: 'Ariel Smith', label: 'In Training', why: 'In Training' }, { name: 'Katie Parker', label: 'Called off', why: 'the person who called off' } ],
    hidden: 31, meta: { schedule: { checked: true, held: null } } };
  if (mode === 'held') { LIST.ready = []; LIST.review = []; LIST.meta.schedule = { checked: false, held: "AxisCare's schedule could not be read (AxisCare responded 503)" }; }
  const RUN = { run: { status: 'running', next_wave_at: new Date(Date.now() + 5 * 60000).toISOString() }, rules: { size: 10, gap: 5, urgent: true }, events: [] };
  const realFetch = window.fetch;
  window.fetch = async (u, o) => { if (String(u).includes('/functions/v1/coverage-run')) { const b = JSON.parse(o.body); sent.push(b);
      if (b.action === 'ask_list') return new Response(JSON.stringify(LIST), { status: 200 });
      if (b.action === 'cara_run_get') return new Response(JSON.stringify(RUN), { status: 200 });
      if (b.action === 'board') return new Response(JSON.stringify({ people: [], note: '' }), { status: 200 });
      return new Response(JSON.stringify({ sent: b.recipients || [], failed: [] }), { status: 200 }); }
    return realFetch(u, o); };
  window.ccConfirm = async () => true; window.alert = () => {};
  DATA.ops_settings = Object.assign({}, DATA.ops_settings || {}, { simple_card_live: mode === 'on' || mode === 'held', cara_board_live: true, cara_run_live: true });
  window.ccCan = () => mode === 'owner';
  try { localStorage.removeItem('simple_card_preview'); } catch (e) {}
  DATA.coverage_cases = [kase];
  const host = document.createElement('div'); host.id = 'scProof'; host.className = 'card'; host.style.cssText = 'padding:16px 18px;margin:20px;max-width:1100px;border-left:4px solid var(--red);';
  document.body.prepend(host);
  const draw = () => { host.innerHTML = '<b style="font-size:15.5px;color:var(--navy);">Dan Probstfield</b> <span class="field-note">2026-10-25 10pm-6am · Call-off</span>' + covOpenBody(kase, ''); };
  window.renderCoverage = draw;
  draw(); await new Promise((r) => setTimeout(r, 600)); draw(); await new Promise((r) => setTimeout(r, 300)); draw();
  window.scrollTo(0, 0);
  const txt = host.innerText.replace(/\s+/g, ' ');
  const out = { txt, html: host.innerHTML.length };
  if (mode === 'on') {
    const box = [...host.querySelectorAll('button')].find((b) => /^Text the 3 ticked$/.test(b.textContent)); out.hasSend = !!box;
    out.shot = true;
    await SC.send('dan'); out.sent = sent.filter((x) => x.action === 'send_selected');
    draw(); out.after = host.innerText.replace(/\s+/g, ' ');
  }
  return out;
}
"""
R = {}
with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []
    for mode in ('office_off', 'owner', 'on', 'held'):
        pg = b.new_page(viewport={'width': 1200, 'height': 1600})
        pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
        pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        pg.goto(f'http://localhost:{PORT}/index.html?proof=simplecard'); pg.wait_for_timeout(1500)
        if mode == 'on' and SHOT:
            pg.evaluate(T.replace("await SC.send('dan');", 'return out;'), mode); pg.wait_for_timeout(200); pg.locator('#scProof').screenshot(path=SHOT)
            pg.goto(f'http://localhost:{PORT}/index.html?proof=simplecard'); pg.wait_for_timeout(1500)
        R[mode] = pg.evaluate(T, mode)
        pg.close()
    b.close()
ok = fail = 0
def ck(n, c, x=''):
    global ok, fail
    ok, fail = (ok + 1, fail) if c else (ok, fail + 1); print(('PASS  ' if c else 'FAIL  ') + n + ('' if c else '  ' + str(x)[:900]))
ck('no page errors', not errs, errs)
t = R['on']['txt']
ck('switch off: the office keeps today\'s card (no simple card, no try link)', 'Ready to ask ·' not in R['office_off']['txt'] and 'Try the simple card' not in R['office_off']['txt'], R['office_off']['txt'][:400])
ck('switch off: owners see "Try the simple card"', 'Try the simple card' in R['owner']['txt'], R['owner']['txt'][:400])
ck('one status line: Cara is asking, 10 at a time every 5 minutes until a yes or the shift ends, with Stop Cara', 'Cara is asking · 10 at a time, every 5 minutes, until someone says yes or the shift ends' in t and 'Stop Cara' in t, t[:600])
ck('the counts come from the asks: 4 texted, 2 waiting, 2 said no, nobody has said yes yet, next wave time', all(x in t for x in ['4 texted', '2 waiting', '2 said no', 'Nobody has said yes yet', 'Next wave at']), t[:600])
ck('three actions: Ask everyone now (7 not asked yet), Follow up with the 4 texted, Add a bonus', all(x in t for x in ['Ask everyone now (7 not asked yet)', 'Follow up with the 4 texted', 'Add a bonus']), t[:800])
ck('Ready to ask · 10: contacted first with their answer, dates read "Oct 9" not AxisCare stamps', 'Ready to ask · 10' in t and 'last Oct 9' in t and 'T00:00' not in t and 'said no' in t and 'waiting' in t, t)
ck('the not-asked are ticked 3 in line, 5 shown, "and 2 more" folded, and "Text the 3 ticked"', R['on']['hasSend'] and 'and 2 more not asked yet' in t and 'Next in line' in t, t)
ck('Your call · 2 with Ask anyway; Jody shows "said no"', 'Your call · 2' in t and 'Ask anyway' in t and 'said no' in t, t)
ck('Do not ask · 3 folded with counts by reason; inactive only counted', 'Do not ask · 3' in t and 'Clearance · 1' in t and 'In Training · 1' in t and 'Not counted: 31' in t and 'dementia training' not in t, t)
ck('the old buttons are gone from the card', not any(x in t for x in ['Send to Group 1 only', 'Send to Groups 1 + 2', 'Send Cara\'s list', 'Rebuild', 'Choose who to ask']), t)
ck('everything else is folded under "More for this shift"', 'More for this shift' in t, t[-400:])
ck('reasons read plainly ("Worked in the last 2 weeks · availability not on file")', 'Worked in the last 2 weeks · availability not on file' in t and '(Unknown)' not in t, t)
ck('after sending, nothing ticked: no "Text the 0 ticked" button', 'Text the 0 ticked' not in R['on'].get('after', '') and 'Tick people to text them now' in R['on'].get('after', ''), R['on'].get('after', '')[:600])
ck('"Text the 3 ticked" sends exactly the 3 next in line', R['on']['sent'] and R['on']['sent'][0]['recipients'] == ['Grace Levering', 'Karlesa Alejandro', 'Ashley Lloyd'], R['on'].get('sent'))
ck('AxisCare unreadable: the card says so first and that nobody is texted', "AxisCare's schedule could not be read (AxisCare responded 503). Nobody is texted until it can be checked" in R['held']['txt'], R['held']['txt'][:500])
print(f'simple_card_look: {ok} passed, {fail} failed'); raise SystemExit(1 if fail else 0)

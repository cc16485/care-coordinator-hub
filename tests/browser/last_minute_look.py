"""Last-minute shifts (2026-10-24, Samantha: "I need this shift to go out to everyone when we are this last minute!!" and
"also give the option of adding a bonus for last minute shifts"). The real page, offline, FAKE cases only: the two buttons
show on an open shift within a day (not on one days away or an interest check), Ask everyone now lists first and sends only
after a confirm with the names, and the bonus sends the amount. Nothing real is reached."""
import os
from playwright.sync_api import sync_playwright
PORT = os.environ.get('PORT', '8793'); SHOT = os.environ.get('SHOT', '')
T = r"""
async () => {
  const sent = [];
  window.sb = window.sb || {}; sb.auth = { getSession: async () => ({ data: { session: { access_token: 't' } } }) };
  sb.from = () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) });
  const realFetch = window.fetch;
  window.fetch = async (u, o) => { if (String(u).includes('/functions/v1/coverage-run')) { const b = JSON.parse(o.body); sent.push(b);
      if (b.action === 'ask_everyone' && b.preview) return new Response(JSON.stringify({ names: ['Cassie Carsten', 'Angela Muse', 'Dixie Kuhn'], already_asked: 5, left_out: [{ name: 'Mary Evans', why: 'Needs Verification: TB test expired' }], held_night: false }), { status: 200 });
      if (b.action === 'ask_everyone') return new Response(JSON.stringify({ sent: b.names, failed: [], refused: 0 }), { status: 200 });
      if (b.action === 'set_bonus') return new Response(JSON.stringify({ ok: true }), { status: 200 }); }
    return realFetch(u, o); };
  const asked = []; window.ccConfirm = async (m) => { asked.push(m); return true; }; window.ccPrompt = async () => '40'; window.alert = () => {};
  window.renderCoverage = () => {};
  const chi = new Date(new Date().toLocaleString('sv-SE', { timeZone: 'America/Chicago' }).replace(' ', 'T'));
  const at = (h) => { const d = new Date(chi.getTime() + h * 3600000); return { date: d.toISOString().slice(0, 10), hh: String(d.getUTCHours()).padStart(2, '0') + ':00' }; };
  const s1 = at(2), s2 = at(72);
  DATA.coverage_cases = [
    { id: 'soon', status: 'open', client: 'Dan P', shift_date: s1.date, shift_time: s1.hh + '-' + String((+s1.hh.slice(0, 2) + 8) % 24).padStart(2, '0') + ':00', asked: [] },
    { id: 'far', status: 'open', client: 'Ruth K', shift_date: s2.date, shift_time: '08:00-16:00', asked: [] },
    { id: 'int', status: 'open', kind: 'interest', client: 'New C', asked: [] },
    { id: 'bon', status: 'open', client: 'Dan P', shift_date: s1.date, shift_time: s1.hh + '-' + String((+s1.hh.slice(0, 2) + 8) % 24).padStart(2, '0') + ':00', asked: [], bonus: { amount: 25 } } ];
  const txt = (h) => { const d = document.createElement('div'); d.innerHTML = h; return d.innerText.replace(/\s+/g, ' ').trim(); };
  const out = { soon: txt(LM.buttons(DATA.coverage_cases[0])), far: LM.buttons(DATA.coverage_cases[1]), int: LM.buttons(DATA.coverage_cases[2]), bon: txt(LM.buttons(DATA.coverage_cases[3])) };
  const host = document.createElement('div'); host.id = 'lmProof'; host.className = 'card'; host.style.cssText = 'padding:12px 14px;margin:20px;max-width:720px;';
  host.innerHTML = '<b style="color:var(--navy);">Dan P · tonight 10pm to 6am</b> <span class="field-note">starts in under 2 hours</span><div style="margin-top:8px;">' + LM.buttons(DATA.coverage_cases[3]) + '</div>';
  document.body.prepend(host); window.scrollTo(0, 0);
  await LM.everyone('soon'); await LM.bonus('soon');
  out.sent = sent; out.asked = asked;
  return out;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1300, 'height': 900})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(f'http://localhost:{PORT}/index.html?proof=lastminute'); pg.wait_for_timeout(1500)
    R = pg.evaluate(T)
    if SHOT: pg.locator('#lmProof').screenshot(path=SHOT)
    b.close()
ok = fail = 0
def ck(n, c, x=''):
    global ok, fail
    ok, fail = (ok + 1, fail) if c else (ok, fail + 1); print(('PASS  ' if c else 'FAIL  ') + n + ('' if c else '  ' + str(x)[:600]))
ck('no page errors', not errs, errs)
ck('a shift starting within a day shows both buttons', 'Ask everyone now' in R['soon'] and 'Add a bonus' in R['soon'], R['soon'])
ck('not on a shift 3 days away, nor on an interest check', R['far'] == '' and R['int'] == '', [R['far'], R['int']])
ck('a shift with a bonus says it (and can be changed)', '$25 bonus (change)' in R['bon'], R['bon'])
ck('Ask everyone: the list is fetched first, then ONE confirm naming everyone, the already-asked count and who is left out and why',
   R['sent'][0] == {'action': 'ask_everyone', 'case_id': 'soon', 'preview': True} and len(R['asked']) == 1 and all(x in R['asked'][0] for x in ['3 caregivers', 'Cassie Carsten, Angela Muse, Dixie Kuhn', '5 already asked', 'Mary Evans (Needs Verification: TB test expired)']), [R['sent'], R['asked']])
ck('Ask everyone: sends exactly the names that were shown', R['sent'][1] == {'action': 'ask_everyone', 'case_id': 'soon', 'send': True, 'names': ['Cassie Carsten', 'Angela Muse', 'Dixie Kuhn']}, R['sent'])
ck('Bonus: sends the whole-dollar amount', R['sent'][2] == {'action': 'set_bonus', 'case_id': 'soon', 'amount': 40}, R['sent'])
print(f'last_minute_look: {ok} passed, {fail} failed'); raise SystemExit(1 if fail else 0)

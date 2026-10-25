"""PRN short notice (2026-10-24, Samantha: "If someone selected 'Call-offs and same-day' but also requested 48 hours' notice,
please don't silently override that conflict. We should clarify their preference or provide a separate short-notice
opt-in."). The real page, offline, FAKE people only: the PRN profile's Short notice line in each state, and the two buttons
send exactly what the office chose (nothing else is sent)."""
import os
from playwright.sync_api import sync_playwright
PORT = os.environ.get('PORT', '8793')
SHOT = os.environ.get('SHOT', '')
T = r"""
async () => {
  const kv = (k, v) => '<div style="display:flex;gap:8px;font-size:13.5px;padding:2px 0;"><span class="field-note" style="min-width:150px;">' + k + '</span><span style="min-width:0;">' + v + '</span></div>';
  const txt = h => { const d = document.createElement('div'); d.innerHTML = h; return d.innerText.replace(/\s+/g, ' ').trim(); };
  const A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const out = {
    conflict: txt(cgdPrnShortRow(A, { notice:'48h', interests:['calloffs','weekends'] }, kv)),
    plain: txt(cgdPrnShortRow(A, { notice:'24h', interests:['weekends'] }, kv)),
    sameday: cgdPrnShortRow(A, { notice:'same_day', interests:['calloffs'] }, kv),
    none: cgdPrnShortRow(A, { interests:['calloffs'] }, kv),
    yes: txt(cgdPrnShortRow(A, { notice:'48h', interests:['calloffs'], short_notice_ok:true, short_notice:{ ok:true, by:'Krystal', at:'2026-10-24T15:00:00Z', how:'call', note:'Fine before 10am' } }, kv)),
    no: txt(cgdPrnShortRow(A, { notice:'48h', interests:['calloffs'], short_notice_ok:false, short_notice:{ ok:false, by:'Sam', at:'2026-10-24T15:00:00Z', how:'text' } }, kv)),
  };
  /* the buttons: what goes to the server */
  const sent = []; window.prnCall = async (b) => { sent.push(b); return { outcome:'recorded' }; }; window.cgdPrnAfter = async () => {};
  const host = document.createElement('div'); host.className = 'card'; host.style.cssText = 'padding:14px 16px;margin:20px;background:#FBF6EA;border:1px solid #ECD9AE;max-width:760px;';
  host.id = 'snProof'; host.innerHTML = '<b style="color:var(--navy);font-size:14.5px;">PRN CNA Team</b>' + kv('Notice', '48 hours or more') + cgdPrnShortRow(A, { notice:'48h', interests:['calloffs','weekends'] }, kv) + kv('Interested in', 'Call-offs and same-day, Weekends');
  document.body.prepend(host); window.scrollTo(0, 0);
  document.getElementById('cgdSnHow').value = 'text'; document.getElementById('cgdSnNote').value = 'Same day OK if before 10am';
  [...host.querySelectorAll('button')].find(b => /Short notice is OK/.test(b.textContent)).click();
  await new Promise(r => setTimeout(r, 50));
  [...host.querySelectorAll('button')].find(b => /Keep their notice/.test(b.textContent)).click();
  await new Promise(r => setTimeout(r, 50));
  out.sent = sent;
  return out;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1300, 'height': 900})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(f'http://localhost:{PORT}/index.html?proof=prnshort'); pg.wait_for_timeout(1500)
    R = pg.evaluate(T)
    if SHOT: pg.locator('#snProof').screenshot(path=SHOT)
    b.close()
ok = fail = 0
def ck(n, c, x=''):
    global ok, fail
    ok, fail = (ok + 1, fail) if c else (ok, fail + 1); print(('PASS  ' if c else 'FAIL  ') + n + ('' if c else '  ' + str(x)[:500]))
ck('no page errors', not errs, errs)
ck('conflict: "To clarify", names both answers, says Cara won\'t offer shorter notice until someone asks', all(x in R['conflict'] for x in ['To clarify:', 'picked "Call-offs and same-day" but asked for 48 hours or more notice', "Cara won't offer them shifts on shorter notice"]), R['conflict'])
ck('conflict: both buttons and how they told us', all(x in R['conflict'] for x in ['Short notice is OK', 'Keep their notice']), R['conflict'])
ck('24 hours\' notice, no call-off tick: "Not asked. Cara keeps to their notice", buttons still there', 'Not asked. Cara keeps to their 24 hours notice.' in R['plain'] and 'Short notice is OK' in R['plain'], R['plain'])
ck('same day or no notice given: no line at all (nothing to ask)', R['sameday'] == '' and R['none'] == '')
ck('recorded yes: who, when, how and their words', 'Short notice OK: Cara may ask them about shifts with less notice.' in R['yes'] and 'Krystal' in R['yes'] and 'by phone' in R['yes'] and 'Fine before 10am' in R['yes'], R['yes'])
ck('recorded no: keep their notice, who and how; can be changed', 'Keep their notice (48 hours or more): no short-notice shifts.' in R['no'] and 'Sam' in R['no'] and 'by text' in R['no'] and 'Change their answer' in R['no'], R['no'])
ck('the buttons send exactly the choice, how and their words', R['sent'] == [{'action': 'short_notice', 'applicant_id': 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ok': True, 'how': 'text', 'note': 'Same day OK if before 10am'},
   {'action': 'short_notice', 'applicant_id': 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ok': False, 'how': 'text', 'note': 'Same day OK if before 10am'}], R['sent'])
print(f'prn_short_notice_look: {ok} passed, {fail} failed'); raise SystemExit(1 if fail else 0)

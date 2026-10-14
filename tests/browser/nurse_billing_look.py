"""Nurse visits: ready to bill (LPN nurse visit plan step 8, Samantha approved 2026-10-14; Desktop 707): nurse-billing.js
offline with the nurse-visit-check server faked to its contract (Staffing supabase/functions/nurse-visit-check/index.ts).
The card under the care plan box: practice and live chips, the not-ready list with every reason, the copy for the AxisCare
billing team, the Hub's holds, authorized against used per client, Check now, a server that is not deployed yet, phone
width, no em dash. Chromium.
python3 tests/browser/nurse_billing_look.py [screenshot dir]"""
import json, sys, os
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp'
TEST = os.path.join(ROOT, '_nb_card_test.html')
REPORT = {'ok': True, 'live': False, 'hold_live': False, 'hold_switch': False, 'checked_at': '2026-10-14T15:00:00Z', 'services_from': 'built-in', 'read_failed': 0, 'ready_count': 24,
          'not_ready': [{'visit_id': 's=1:d=2026-10-05', 'client': 'Ann Able', 'ax': '1', 'date': '2026-10-05', 'service': 'Weekly medication organizer setup', 'service_key': 'med_setup', 'nurse': 'Lena Pruitt', 'cred': 'LPN',
                         'reasons': ['No visit note in AxisCare. The nurse adds what was done to the visit note.'], 'hold': None, 'would_hold': True, 'office_marked': False},
                        {'visit_id': 's=1:d=2026-09-10', 'client': 'Ann Able', 'ax': '1', 'date': '2026-09-10', 'service': 'General Health Evaluation', 'service_key': 'ghe', 'nurse': 'Lena Pruitt', 'cred': 'LPN',
                         'reasons': ["The LPN's GHE form is waiting for the RN's review and signature.", 'A second nurse visit for this client on Sep 10, 2026. Missouri pays one nurse visit a day.'], 'hold': None, 'would_hold': True, 'office_marked': False}],
          'holds': [],
          'clients': [{'ax': '1', 'client': 'Ann Able', 'period': {'from': '2026-06-01', 'to': '2026-11-30'}, 'period_note': '', 'authorized': 25, 'used': 6, 'cap': 26, 'not_ready': 2},
                      {'ax': '4', 'client': 'Bo Short', 'period': None, 'period_note': 'the care plan runs May 1, 2026 to Nov 16, 2026 (200 days), which is neither six months nor a year', 'authorized': None, 'used': 0, 'cap': 26, 'not_ready': 1}]}
FAKE = r"""<!doctype html><meta charset="utf-8"><body><section id="tab-nursevisits" style="max-width:980px"><div class="card" id="mcpCard">care plan box</div><div id="after">next card</div></section>
<script>
window.CALLS = []; window.SERVER = { report:%s, missing:false };
window.sb = { functions: { invoke: async (name, o) => { const b = o.body, S = window.SERVER; window.CALLS.push(Object.assign({ fn:name }, b));
  if(S.missing) return { data:null, error:{ message:'Edge Function returned a non-2xx status code', context:{ status:404, json: async () => ({}) } } };
  if(b.action === 'report') return { data:JSON.parse(JSON.stringify(S.report)) };
  if(b.action === 'run'){ const r = JSON.parse(JSON.stringify(S.report)); r.live = true; r.hold_live = true; r.not_ready[0].hold = { state:'held', set_at:'2026-10-14T15:30:00Z' }; r.holds = [r.not_ready[0]]; return { data:{ ok:true, visits_checked:30, not_ready:2, read_failed:1, report:r } }; }
  return { data:{ ok:false, error:'Unknown action.' } };
} } };
</script><script src="nurse-billing.js"></script></body>""" % json.dumps(REPORT)
open(TEST, 'w').write(FAKE)
R = []
def ck(n, c, d=''): R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:500]))
try:
  with sync_playwright() as pw:
    b = pw.chromium.launch(); ctx = b.new_context(viewport={'width': 1100, 'height': 1200}, permissions=['clipboard-read', 'clipboard-write']); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('file://' + TEST); pg.wait_for_timeout(150)
    pg.evaluate('NurseBilling.mount("tab-nursevisits")'); pg.wait_for_timeout(300)
    t = pg.inner_text('#nbCard')
    ck('the card sits right under the care plan box, once', pg.evaluate('document.getElementById("mcpCard").nextElementSibling.id') == 'nbCard' and pg.locator('#nbCard').count() == 1)
    ck('practice: says so (shown here, no cards) and the hold is off', 'Practice: shown here, no cards' in t and 'Do-not-bill hold off' in t and 'no cards are made until the "Nurse visit checks" switch is on' in t, t)
    ck('the not-ready list: date, client, service, nurse, every reason in plain words', 'Not ready to bill (2)' in t and 'Oct 5, 2026' in t and 'Weekly medication organizer setup' in t and 'Lena Pruitt (LPN)' in t and 'No visit note in AxisCare.' in t and "waiting for the RN's review and signature" in t and 'Missouri pays one nurse visit a day.' in t, t)
    ck('...in practice each says it would be held, nothing written', t.count('Would be held (hold off)') == 2)
    ck('authorized against used this period, and an uncertain period says why', 'Jun 1, 2026 to Nov 30, 2026' in t and '6 of at most 26' in t and '25' in t and 'Not known: the care plan runs May 1, 2026 to Nov 16, 2026 (200 days)' in t and 'no units on the plan' in t, t)
    pg.screenshot(path=os.path.join(OUT, 'nb_card_practice.png'), full_page=True)
    pg.click('#nbCopy'); pg.wait_for_timeout(200)
    clip = pg.evaluate('navigator.clipboard.readText()')
    ck('Copy the list for AxisCare billing: every not-ready visit with its AxisCare visit number and why, ready to paste', clip.startswith('Nurse visits NOT ready to bill (do not bill these yet)') and 'Oct 5, 2026, Ann Able, Weekly medication organizer setup, Lena Pruitt (AxisCare visit s=1:d=2026-10-05): No visit note in AxisCare.' in clip and 'We will tell you when each one is ready.' in clip and 'Copied.' in pg.inner_text('#nbCard'), clip)
    pg.evaluate('CALLS = []'); pg.click('#nbCheck'); pg.wait_for_timeout(300); t = pg.inner_text('#nbCard')
    ck('Check now: asks the server to run, shows what it found, and the AxisCare read that failed is said', pg.evaluate('CALLS.length === 1 && CALLS[0].action === "run"') and 'Checked just now: 30 nurse visits, 2 not ready. AxisCare could not be read for 1 client; they keep their last check.' in t, t)
    ck('live with the hold: the chips say so, the Hub\'s hold shows on the visit and in the held list', 'Cards on' in t and 'Do-not-bill hold on' in t and 'Do-not-bill set by the Hub' in t and 'Held from billing by the Hub (1)' in t and 'never touches a do-not-bill the office set' in t, t)
    pg.screenshot(path=os.path.join(OUT, 'nb_card_live.png'), full_page=True)
    pg.evaluate('CALLS = []'); pg.evaluate('NurseBilling.mount("tab-nursevisits")'); pg.wait_for_timeout(150)
    ck('a redraw of Nurse Scheduling within a minute does not ask the server again', pg.evaluate('CALLS.length') == 0)
    pg.evaluate('() => { document.getElementById("nbCard").remove(); SERVER.missing = true; }'); pg.evaluate('NurseBilling.mount("tab-nursevisits")'); pg.wait_for_timeout(300)
    ck('before Desktop 707 has run (the server answers 404): says so, nothing breaks', 'This appears once Desktop step 707 has run.' in pg.inner_text('#nbCard'))
    pg.evaluate('() => { document.getElementById("nbCard").remove(); SERVER.missing = false; }')
    pg.set_viewport_size({'width': 375, 'height': 900}); pg.evaluate('NurseBilling.mount("tab-nursevisits")'); pg.wait_for_timeout(300)
    ck('phone width: no sideways scroll of the page', pg.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'), pg.evaluate('[document.documentElement.scrollWidth, window.innerWidth]'))
    pg.screenshot(path=os.path.join(OUT, 'nb_card_phone.png'), full_page=True)
    ck('no em dash anywhere on the card', '—' not in pg.inner_text('body'))
    ck('no page errors', not errs, errs)
    b.close()
finally:
    os.remove(TEST)
for s, n, d in R: print(s, ' ', n, ('  ' + d) if d else '')
print(f"\n{sum(1 for r in R if r[0] == 'PASS')}/{len(R)} passed"); raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

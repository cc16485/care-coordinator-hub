"""Two PRN teams (2026-10-21, Samantha: "Yes to all 8 PRN Caregiver recommendations. Use 10 as the starting team goal.").
The real page, offline, FAKE people only: the PRN dashboard card and the interview card for a PRN Caregiver Team applicant
read their name, goal and rates from the pay rates card. Nothing is sent."""
import os
from playwright.sync_api import sync_playwright
PORT = os.environ.get('PORT', '8793')
T = r"""
() => {
  DATA.pay_rates = [{ id:'rates', rates:{ caregiver:{ min:16, max:16 }, prn_caregiver:{ min:18, max:18 }, cna:{ min:18, max:18 }, prn_cna:{ min:20, max:20 } } }];
  DATA.ops_settings = Object.assign({}, DATA.ops_settings || {}, { prn_caregiver_minimum: 10 });
  const base = { tracks:[], history:[], shifts:[], apps:{}, prnApps:[], booked:[], postings:[{ status:'published', valid_through:null, position:'prn_caregiver' }], checkins:[], census:null, avail:[], now:Date.now() };
  const cg = prnDashHtml(Object.assign({ team:'caregiver', minimum:10 }, base));
  const cn = prnDashHtml(Object.assign({ team:'cna', minimum:20 }, base));
  AP_POS.push({ key:'prn_caregiver', label:'PRN Caregiver Team', track:'prn', requires_cna:false, pay_min:18 });
  const card = apPrnHtml({ id:1, position:'prn_caregiver', prn:{ days:['mon'], times:['morning'], notice:'few_hours', one_year:true }, pay_ack_at:null });
  const txt = h => { const d = document.createElement('div'); d.innerHTML = h; return d.innerText.replace(/\s+/g, ' '); };
  return { cg: txt(cg), cn: txt(cn), card: txt(card), team: [prnTeamOf({ key:'prn_caregiver' }), prnTeamOf({ team:'caregiver' }), prnTeamOf({}), prnTeamOf({ requires_cna:false })] };
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1300, 'height': 900})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(f'http://localhost:{PORT}/index.html?proof=prnteams'); pg.wait_for_timeout(1500)
    R = pg.evaluate(T); b.close()
ok = fail = 0
def ck(n, c, x=''):
    global ok, fail
    ok, fail = (ok + 1, fail) if c else (ok, fail + 1); print(('PASS  ' if c else 'FAIL  ') + n + ('' if c else '  ' + str(x)[:500]))
ck('no page errors', not errs, errs)
ck('team of a role, a track, an old record, a no-CNA role', R['team'] == ['caregiver', 'caregiver', 'cna', 'caregiver'], R['team'])
ck('caregiver dashboard card: its own name, goal 10 and rates from the pay card', all(x in R['cg'] for x in ['PRN Caregiver Team recruiting: ALWAYS ON', 'Below the PRN Caregiver Team goal (0 of 10)', 'active PRN caregivers', 'PRN Caregiver Team $18/hr, ongoing $16/hr']), R['cg'])
ck('CNA dashboard card unchanged in meaning: goal 20, $20 and $18 from the pay card', all(x in R['cn'] for x in ['PRN CNA Team recruiting', '(0 of 20)', 'PRN CNA Team $20/hr, ongoing $18/hr']), R['cn'])
ck('interview card for a PRN caregiver: team name, $18, ongoing $16, no CNA question', 'PRN Caregiver Team' in R['card'] and 'Tell them: $18/hr on the PRN Caregiver Team' in R['card'] and 'that is $16/hr' in R['card'] and 'Currently a CNA' not in R['card'], R['card'])
ck('no $20 anywhere on the caregiver team', '$20' not in R['cg'] and '$20' not in R['card'])
print(f'prn_teams_look: {ok} passed, {fail} failed'); raise SystemExit(1 if fail else 0)

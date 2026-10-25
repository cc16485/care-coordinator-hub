"""The three-group ask list (2026-10-24, Samantha: "Cara should show us every potential caregiver, including the ones she
didn't contact, and explain exactly why"). The real page, offline, FAKE people only: who sees the button (switch off =
owners only, as a preview), the three groups with contacted/answer/why, a care review that can't be approved while a task
is needed or undecided, and an approval that sends exactly what the coordinator chose. Nothing real is reached."""
import os
from playwright.sync_api import sync_playwright
PORT = os.environ.get('PORT', '8793'); SHOT = os.environ.get('SHOT', '')
T = r"""
async (mode) => {
  const sent = [];
  window.sb = window.sb || {}; sb.auth = { getSession: async () => ({ data: { session: { access_token: 't' } } }) };
  const LIST = { live: mode === 'on',
    ready: [ { name: 'Maria L', axiscare_id: '1', label: 'Familiar', why: '12 visits with this client, 9 overnight', contacted: { at: '2026-10-25T00:42:00Z', state: 'waiting', how: 'Cara wave 1', by_text: true } },
             { name: 'Caroline M', axiscare_id: '2', label: 'Familiar', why: '4 visits with this client', contacted: { at: '2026-10-25T00:42:00Z', state: 'no', how: 'Cara wave 1', by_text: true } },
             { name: 'Jessica T', axiscare_id: '3', label: 'PRN Team', why: 'PRN, fits', contacted: null } ],
    review: [ { name: 'Amy D', axiscare_id: '5', kind: 'care', label: 'Level', why: 'Level 1 caregiver; client needs Level 2', cg_level: 1, client_level: 2, contacted: null, approval: null,
                blocking: [{ key: 'bathing', label: 'Bathing or showering', level: 2 }],
                care: { cg_level: 1, tasks: [{ key: 'bathing', label: 'Bathing or showering', level: 2, verified: false }, { key: 'meals_housekeeping', label: 'Meals and light housekeeping', level: 1, verified: true }] } },
              { name: 'Jody D', axiscare_id: '6', kind: 'call', label: 'Overtime', why: 'Overtime risk: 42h already this week + 8h = 50h', contacted: null } ],
    dont: [ { name: 'Mary E', axiscare_id: '7', label: 'Clearance', why: 'Needs Verification: TB test expired', contacted: null }, { name: 'Kim A', axiscare_id: '8', label: 'Do Not Return', why: 'Do-Not-Return for this client', contacted: null } ],
    hidden: 31 };
  const realFetch = window.fetch;
  window.fetch = async (u, o) => { if (String(u).includes('/functions/v1/coverage-run')) { const b = JSON.parse(o.body); sent.push(b);
      if (b.action === 'ask_list') return new Response(JSON.stringify(LIST), { status: 200 });
      return new Response(JSON.stringify({ ok: true, sent: ['Amy D'], failed: [] }), { status: 200 }); }
    return realFetch(u, o); };
  window.ccConfirm = async () => true; window.alert = () => {};
  DATA.ops_settings = Object.assign({}, DATA.ops_settings || {}, { ask_list_live: mode === 'on' });
  window.ccCan = (k) => mode === 'owner';
  DATA.coverage_cases = [{ id: 'cv', status: 'open', client: 'Ruth K', shift_date: '2026-10-25', shift_time: '22:00-06:00', asked: [] }];
  const btn = AL.button(DATA.coverage_cases[0]);
  const out = { btn };
  if (!btn) return out;
  await AL.show('cv');
  const txt = () => document.getElementById('alSheet').innerText.replace(/\s+/g, ' ');
  out.list = txt();
  AL.review('5'); out.reviewOpen = txt();
  out.approveDisabledUndecided = document.querySelector('#alSheet button.al-primary').disabled;
  AL.adj('bathing', 'needed'); out.needed = txt(); out.approveDisabledNeeded = document.querySelector('#alSheet button.al-primary').disabled;
  AL.adj('bathing', 'moved');
  document.getElementById('al_ck_skills').checked = true; document.getElementById('al_ck_payer').checked = true;
  document.getElementById('al_moved').value = "Sunday's 9am visit"; document.getElementById('al_agreed').value = 'Lisa (daughter), by phone'; document.getElementById('al_why').value = 'Only the shower is Level 2';
  out.ok = txt(); out.approveEnabled = !document.querySelector('#alSheet button.al-primary').disabled;
  if (mode === 'on') { const sh = document.getElementById('alSheet'); sh.scrollTop = 0; }
  await AL.approve();
  out.sent = sent;
  return out;
}
"""
R = {}
with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []
    for mode in ('office_off', 'owner', 'on'):
        pg = b.new_page(viewport={'width': 1200, 'height': 1400})
        pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
        pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        pg.goto(f'http://localhost:{PORT}/index.html?proof=asklist'); pg.wait_for_timeout(1500)
        if mode == 'on' and SHOT:
            pg.evaluate(T.replace('await AL.approve();', '').replace('out.sent = sent;', ''), mode); pg.wait_for_timeout(300)
            pg.screenshot(path=SHOT, full_page=False)
            pg.goto(f'http://localhost:{PORT}/index.html?proof=asklist'); pg.wait_for_timeout(1500)
        R[mode] = pg.evaluate(T, mode); pg.close()
    b.close()
ok = fail = 0
def ck(n, c, x=''):
    global ok, fail
    ok, fail = (ok + 1, fail) if c else (ok, fail + 1); print(('PASS  ' if c else 'FAIL  ') + n + ('' if c else '  ' + str(x)[:700]))
ck('no page errors', not errs, errs)
ck('switch off: the office does not see the button; owners see it as a preview', R['office_off']['btn'] == '' and '(preview)' in R['owner']['btn'] and '(preview)' not in R['on']['btn'], [R['office_off']['btn'], R['owner']['btn']])
L = R['on']['list']
ck('three groups with counts: ready (3, 2 contacted), review (2), do not ask (2), and the 31 inactive only counted',
   all(x in L for x in ['Ready to ask · 3 (2 contacted)', 'Possible with your review · 2', 'Do not ask · 2', 'Not shown: 31 not active in AxisCare']), L)
ck('each person: contacted or not, the answer, and why', all(x in L for x in ['Maria L', 'waiting', 'said no', 'Jessica T', 'Not contacted', '12 visits with this client, 9 overnight', 'Needs Verification: TB test expired', 'Do-Not-Return for this client']), L)
ck('review rows say what stands in the way; your-call rows can be asked anyway', 'In the way: Bathing or showering' in L and 'Ask anyway' in L and 'Your call · Overtime' in L, L)
ck('the review: the client\'s tasks against the caregiver, their level unchanged, approve disabled until each task is decided', 'stays as it is' in R['on']['reviewOpen'] and 'Not verified' in R['on']['reviewOpen'] and R['on']['approveDisabledUndecided'], R['on']['reviewOpen'])
ck('a task needed tonight: says they can\'t take the shift, approve stays disabled', "can't take this shift: Bathing or showering is needed tonight" in R['on']['needed'] and R['on']['approveDisabledNeeded'], R['on']['needed'])
ck('moved: "everything left is within their verified skills", approve enabled', "everything left is within Amy's verified skills" in R['on']['ok'] and R['on']['approveEnabled'], R['on']['ok'])
ap = [x for x in R['on']['sent'] if x['action'] == 'review_approve']
ck('approve sends exactly what was chosen: the task moved and when, both checks, who agreed, why', ap and ap[0]['adjust'] == {'bathing': 'moved'} and ap[0]['moved_to'] == "Sunday's 9am visit" and ap[0]['checks'] == {'skills': True, 'payer': True}
   and ap[0]['agreed_by'] == 'Lisa (daughter), by phone' and ap[0]['why'] == 'Only the shower is Level 2' and ap[0]['axiscare_id'] == '5', R['on']['sent'])
print(f'ask_list_look: {ok} passed, {fail} failed'); raise SystemExit(1 if fail else 0)

"""Tell Zach + New coaching talk (2026-10-27, Samantha: "Tell Zach on the caregiver's Performance tab for anyone in the
office, and + New coaching talk for owners only. Coordinators ask, Zach decides."). Zach's side on the HR desk
(index.html?m=hr), offline, made-up records: every Supabase answer is faked; the database calls are only recorded.
(python3 -m http.server 8791 in the repo, then python3 tests/browser/hr_concerns_look.py)"""
from playwright.sync_api import sync_playwright
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from clock_pin import pin
FAKE = r"""
() => {
  const iso = (d) => new Date(Date.now() - d * 864e5).toISOString();
  window.__T = {
    hr_cases: [{ id: 'office_1', axiscare_caregiver_id: '7', caregiver: 'Ashley Test', kind: 'recurring', rule: 'office_concern', title: 'Her report says the client was not hurt', facts: [{ date: '2026-10-25', what: 'Her report says the client was not hurt; her note says the client hit her hip.', by: 'Krystal Test' }], practice: false, status: 'open', raised_by: 'krystal@mo-care.com', raised_by_name: 'Krystal Test', created_at: iso(0.1) },
                { id: 'office_2', axiscare_caregiver_id: '8', caregiver: 'Pat Test', kind: 'serious', rule: 'office_concern', title: 'Yelled at a client', facts: [{ date: '2026-10-26', what: 'The daughter called: Pat yelled at her mom.' }], practice: false, status: 'open', raised_by_name: 'Stef Test', created_at: iso(0.2) },
                { id: 'office_3', axiscare_caregiver_id: '9', caregiver: 'Lee Test', kind: 'recurring', rule: 'office_concern', title: 'Old one', facts: [], practice: false, status: 'dismissed', decision: 'nothing', decision_note: 'It was a mix-up', decided_by: 'zach@mo-care.com', decided_at: iso(2), created_at: iso(3) },
                { id: 'c1', axiscare_caregiver_id: '1', caregiver: 'Jordan Test', kind: 'coaching', rule: 'w03', title: 'Late arrivals', facts: [], practice: true, status: 'open', created_at: iso(1) }],
    hr_coaching: [],
  };
  const res = (t) => ({ data: t === 'app_data' ? [] : (window.__T[t] || []), error: null });
  const q = (t) => { const p = new Proxy(function () {}, { get(_, k) {
      if (k === 'then') return (ok, bad) => Promise.resolve(res(t)).then(ok, bad);
      if (k === 'maybeSingle' || k === 'single') return () => Promise.resolve({ data: null, error: null });
      return () => p; } }); return p; };
  window.RPC = [];
  sb.from = q;
  sb.rpc = async (fn, args) => { window.RPC.push([fn, args]);
    if (fn === 'hr_case_decide') { const c = window.__T.hr_cases.find((x) => x.id === args.p_id); Object.assign(c, { decision: args.p.decision, decision_note: args.p.note || null, decided_by: 'zach@mo-care.com', decided_at: new Date().toISOString() }); }
    return { data: { ok: true }, error: null }; };
  const sess = { user: { id: 'u1', email: 'zach@mo-care.com', app_metadata: { hub_access: ['care_coordinator'] } }, access_token: 'x' };
  sb.auth.getSession = async () => ({ data: { session: sess }, error: null });
  sb.functions = { invoke: async () => ({ data: null, error: { message: 'offline' } }) };
  (0, eval)("ME={ email:'zach@mo-care.com', name:'Zach Test', shift:'day' };");
  window.ccCan = () => true; window.ccPrompt = async () => 'It was explained: a mix-up with the schedule.'; window.ccConfirm = async () => true;
  (0, eval)("CC_ROLE_BY_EMAIL = { 'krystal@mo-care.com': ['care_coordinator'], 'angiel@mo-care.com': ['care_coordinator'] };");
  DATA.caregivers = [{ first: 'Ashley', last: 'Test', axiscare_id: 7 }, { first: 'Pat', last: 'Test', axiscare_id: 8 }];
}
"""
R = []
def ok(n, c, d=''): R.append(['PASS' if c else 'FAIL', n, '' if c else str(d)[:500]])
with sync_playwright() as pw:
    b = pw.chromium.launch()
    pg = b.new_page(viewport={'width': 1280, 'height': 900}); pin(pg)
    pg.route('**/*', lambda r: r.abort() if ('supabase.co' in r.request.url or 'leadconnectorhq' in r.request.url or 'hub.mo-care.com' in r.request.url) else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:' + os.environ.get('HR_PORT', '8791') + '/index.html?m=hr'); pg.wait_for_timeout(1500)
    pg.evaluate(FAKE); pg.evaluate("phStart()"); pg.wait_for_timeout(900)
    pg.evaluate("HR.go('home')"); pg.wait_for_timeout(800)
    t = pg.inner_text('#hrConcernN')
    ok("Zach's dashboard: From the office lists what is waiting (serious marked), not the decided one", 'Ashley Test' in t and 'Pat Test' in t and 'serious' in t and 'Lee Test' not in t and 'from Krystal Test' in t, t)
    menu = pg.inner_text('.hr-menu'); ok('the menu says Incidents and concerns', 'Incidents and concerns' in menu, menu)
    pg.evaluate("HR.go('practice')"); pg.wait_for_timeout(700)
    t = pg.inner_text('#hrPracList'); ok("Agent practice leaves out what the office sent (only the agent's cases to mark)", 'Jordan Test' in t and 'Ashley Test' not in t and '1 on file' in t, t[:300])
    pg.evaluate("HR.go('incidents')"); pg.wait_for_timeout(900)
    t = pg.inner_text('#hrConcerns')
    ok('Incidents and concerns: each open concern with who sent it, the day and their words; decided ones folded away', 'Ashley Test' in t and 'hit her hip' in t and 'from Krystal Test' in t and 'Decided (1)' in t and pg.locator('#hrConcerns button:has-text("A coaching talk")').count() == 2, t[:600])
    pg.click('#hrCnoffice_1 button:has-text("A coaching talk")'); pg.wait_for_timeout(200)
    ok('A coaching talk: pick the coordinator and the day, with talking points drafted from the concern', pg.is_visible('#hrCncoffice_1To') and 'Ashley' in pg.input_value('#hrCncoffice_1Tp') and 'coaching call, not a write-up' in pg.input_value('#hrCncoffice_1Tp'))
    pg.screenshot(path='tests/browser/hr_concern_coaching.png')
    pg.select_option('#hrCncoffice_1To', 'angiel@mo-care.com'); pg.click('#hrCncGooffice_1'); pg.wait_for_timeout(600)
    call = [x for x in pg.evaluate('RPC') if x[0] == 'hr_case_decide'][-1]
    ok('...Assign sends the decision to the database (coaching, to Angiel, due day, talking points)', call[1]['p_id'] == 'office_1' and call[1]['p']['decision'] == 'coaching' and call[1]['p']['assigned_to'] == 'angiel@mo-care.com' and call[1]['p']['due_on'] and 'Ashley' in call[1]['p']['talking_points'], call)
    t = pg.inner_text('#hrConcerns'); ok('...then it moves to Decided', 'Decided (2)' in t and pg.locator('#hrConcerns button:has-text("A coaching talk")').count() == 1, t[:400])
    pg.click('#hrCnoffice_2 button:has-text("Nothing more")'); pg.wait_for_timeout(600)
    call = [x for x in pg.evaluate('RPC') if x[0] == 'hr_case_decide'][-1]
    ok('Nothing more asks why and keeps it', call[1]['p']['decision'] == 'nothing' and 'mix-up' in call[1]['p']['note'], call)
    pg.evaluate("HR.go('coaching')"); pg.wait_for_timeout(800)
    ok('Coaching page: owners have + New coaching talk', pg.locator('button:has-text("+ New coaching talk")').count() == 1)
    pg.click('button:has-text("+ New coaching talk")'); pg.wait_for_timeout(200)
    pg.fill('#hrNcCg', 'Pat Test'); pg.fill('#hrNcTopic', 'how to talk with clients'); pg.fill('#hrNcWhat', 'The daughter called on Oct 26: Pat raised her voice at her mom.')
    pg.click('#hrNcFill'); pg.wait_for_timeout(100)
    ok('...Fill in talking points drafts them from what you wrote', 'Pat' in pg.input_value('#hrNcATp') and 'how to talk with clients' in pg.input_value('#hrNcATp'))
    pg.screenshot(path='tests/browser/hr_new_coaching.png')
    pg.click('#hrNcGo'); pg.wait_for_timeout(600)
    call = [x for x in pg.evaluate('RPC') if x[0] == 'hr_case_add'][-1][1]['p']
    ok('...Assign adds it through the database: coaching, the caregiver and their AxisCare number, topic, facts, coordinator, due day', call['type'] == 'coaching' and call['caregiver'] == 'Pat Test' and call['axiscare_id'] == '8'
      and call['topic'] == 'how to talk with clients' and 'raised her voice' in call['what'] and call['assigned_to'] and call['due_on'] and call['talking_points'], call)
    ok('...and the form closes', not pg.query_selector('#hrNc'))
    pg.evaluate("window.HR_NEWCOACH = 'Ashley Test'; HR.go('coaching')"); pg.wait_for_timeout(700)
    ok('+ New coaching talk from a caregiver\'s Performance tab opens the form with their name', pg.is_visible('#hrNc') and pg.input_value('#hrNcCg') == 'Ashley Test')
    # a Care Coordinator (her change 2026-10-27: "care coordinators can initiate a coaching call too!")
    pg.evaluate("""() => { window.ccCan = () => false; (0, eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Test', shift:'day' };"); HR.render('coaching') }"""); pg.wait_for_timeout(800)
    menu = pg.inner_text('.hr-menu')
    ok("a coordinator doesn't see Zach's pages (Incidents and concerns, Formal cases)", 'Incidents and concerns' not in menu and 'Formal cases' not in menu, menu)
    ok('...but has + New coaching talk on Coaching', pg.locator('button:has-text("+ New coaching talk")').count() == 1)
    pg.click('button:has-text("+ New coaching talk")'); pg.wait_for_timeout(200)
    ok('...it is hers by default', pg.input_value('#hrNcATo') == 'krystal@mo-care.com', pg.input_value('#hrNcATo'))
    pg.fill('#hrNcCg', 'Pat Test'); pg.fill('#hrNcTopic', 'scheduling goes through the office, not the family')
    pg.fill('#hrNcWhat', "Peggy's daughter emailed: Pat told them which days she needs off and they are scheduling it between themselves.")
    pg.click('#hrNcGo'); pg.wait_for_timeout(600)
    call = [x for x in pg.evaluate('RPC') if x[0] == 'hr_case_add'][-1][1]['p']
    ok('...Assign sends it (the scheduling example), with talking points filled in', call['type'] == 'coaching' and call['assigned_to'] == 'krystal@mo-care.com' and 'scheduling' in call['topic'] and 'scheduling goes through the office' in call['talking_points'], call)
    pg.screenshot(path='tests/browser/hr_coordinator_coaching.png')
    ok('no page errors', not errs, errs)
    b.close()
for r in R: print(r[0], r[1], r[2])
print(f"{sum(1 for r in R if r[0] == 'PASS')}/{len(R)} passed")
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

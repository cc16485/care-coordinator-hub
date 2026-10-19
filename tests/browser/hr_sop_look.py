"""HR step 9 (2026-10-18): the 30-day follow-up button on an issued write-up, and the dashboard's SOP steps (the facts
first). Offline, made-up records, every server answer faked. (python3 -m http.server 8797, then python3 tests/browser/hr_sop_look.py)"""
import json
from playwright.sync_api import sync_playwright
BASE = 'http://localhost:8797'
R = []
def ok(n, c, d=''): R.append(['PASS' if c else 'FAIL', n, '' if c else str(d)[:400]])
with sync_playwright() as pw:
    import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from clock_pin import pin
    b = pw.chromium.launch()
    # ── 2. Zach's panel in the write-up window, on the HR phone desk ──
    q = b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    pin(q); errs2 = []; q.on('pageerror', lambda e: errs2.append(str(e)[:200]))
    q.route('**/*', lambda r: r.abort() if ('supabase.co' in r.request.url or 'leadconnectorhq' in r.request.url or 'hub.mo-care.com' in r.request.url) else r.continue_())
    q.goto(BASE + '/index.html?m=hr'); q.wait_for_timeout(1500)
    q.evaluate(r"""() => {
      const iso = (d) => new Date(Date.now() - d * 864e5).toISOString();
      const WU = [{ id: 'w1', caregiver: 'Jordan Test', level: 'Verbal Warning', status: 'issued', issued_at: iso(31), approved_at: iso(33), approved_by: 'Zach Test', reason: 'Attendance', created_at: iso(3), body: 'CARING COMPANIONS: CORRECTIVE ACTION NOTICE',
        facts_checked_at: iso(2), handbook: { section: '2V' }, explanation: { asked_on: '2026-10-10', text: 'car trouble' }, protected: [] }];
      window.__ACKS = []; window.__CALLS = [];
      const q = (t) => { const p = new Proxy(function () {}, { get(_, k) {
        if (k === 'then') return (a, b) => Promise.resolve({ data: t === 'app_data' ? [{ key: 'discipline_actions', data: WU }] : [], error: null }).then(a, b);
        if (k === 'maybeSingle' || k === 'single') return () => Promise.resolve({ data: t === 'app_data' ? { data: WU } : null, error: null });
        return () => p; } }); return p; };
      const invoke = async (name, o) => { const bd = (o && o.body) || {}; window.__CALLS.push([name, bd]);
        if (name !== 'hr-ack') return { data: null, error: { message: 'offline', context: { json: async () => ({ error: 'offline' }) } } };
        const L = 'https://cc.mo-care.com/notice.html?t=' + 'C'.repeat(43);
        if (bd.action === 'list') return { data: { ok: true, live: false, acks: window.__ACKS }, error: null };
        if (bd.action === 'start') { const a = { id: '00000000-0000-4000-8000-000000000001', writeup_id: 'w1', status: 'waiting', via: bd.via, practice: true, caregiver: 'Jordan Test', level: 'Verbal Warning', started_at: new Date().toISOString() }; window.__ACKS = [a];
          return { data: { ok: true, practice: true, ack: a, link: L, draft: bd.via === 'link' ? 'Hi Jordan, this is Caring Companions. Zach has a notice for you to read and sign. ' + L : undefined, phone_last4: '0100' }, error: null }; }
        if (bd.action === 'send') { window.__ACKS[0].sent_at = new Date().toISOString(); return { data: { ok: true, outcome: 'practice' }, error: null }; }
        if (bd.action === 'record') { if (!bd.witness && !bd.witness_reason) return { data: null, error: { message: 'x', context: { json: async () => ({ error: 'Name the witness, or say why there was none.' }) } } };
          Object.assign(window.__ACKS[0], { status: bd.outcome, refused_on: bd.date, refused_how: bd.how, witness: bd.witness, recorded_at: new Date().toISOString() }); return { data: { ok: true, practice: true }, error: null }; }
        if (bd.action === 'open') return { data: { ok: true, url: 'https://signed.test/x.pdf', expires_in: 300 }, error: null };
        return { data: { ok: true }, error: null }; };
      const sess = { user: { id: 'u1', email: 'zach@mo-care.com', app_metadata: { hub_access: ['care_coordinator', 'team_hub'] } }, access_token: 'x' };
      const auth = { getSession: async () => ({ data: { session: sess }, error: null }), getUser: async () => ({ data: { user: sess.user }, error: null }), signOut: async () => ({ error: null }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) };
      const fake = { from: q, rpc: async (fn, a) => { (window.__SAVED = window.__SAVED || []).push([fn, a && a.item]); return { data: null, error: null }; }, functions: { invoke }, auth, channel: () => { const c = { on: () => c, subscribe: () => c, unsubscribe() {} }; return c; }, removeChannel() {} };
      supabase.createClient = () => fake; sb.from = q; sb.rpc = fake.rpc; sb.functions = { invoke }; sb.auth.getSession = auth.getSession;
      (0, eval)("ME={ email:'zach@mo-care.com', name:'Zach Test', shift:'day' };"); window.ccCan = () => true; window.ccConfirm = async () => true;
      DATA.discipline_actions = WU.concat([{ id: 'w2', caregiver: 'Lee Draft', level: 'Verbal Warning', status: 'draft', created_at: iso(5), body: 'x' }]); window.ccPrompt = async () => 'No more late arrivals'; window.__SAVED = []; const rp = sb.rpc; sb.rpc = async (fn, a) => { window.__SAVED.push([fn, a && a.item]); return { data: null, error: null }; };
    }""")
    q.evaluate("phStart()"); q.wait_for_timeout(700)
    t = q.inner_text('#hrMain')
    ok('the dashboard lists the SOP steps: the facts first for a draft with none checked, the follow-up for an issued one', 'Lee Draft' in t and 'check the facts' in t and '30-day follow-up' in t, t[:800])
    q.evaluate("HR.go('formal')"); q.wait_for_timeout(2500)
    q.evaluate("SCX.openWriteup('w1')"); q.wait_for_timeout(700)
    ok('an issued write-up offers Record the 30-day follow-up', 'Record the 30-day follow-up' in q.inner_text('#writeup-actions'))
    q.click('text=Record the 30-day follow-up'); q.wait_for_timeout(700)
    sv = [x for x in q.evaluate('window.__SAVED') if x[0] == 'upsert_app_data_item' and x[1] and x[1].get('id') == 'w1']
    ok('...it saves the date, who and the note on the write-up', sv and sv[-1][1].get('followup_at') and sv[-1][1].get('followup_note') == 'No more late arrivals', sv[-1:] if sv else q.evaluate('window.__SAVED'))
    ok('...and then shows it done, with no button', '30-day follow-up done' in q.inner_text('#writeup-notice') and 'Record the 30-day follow-up' not in q.inner_text('#writeup-actions'))
    ok('the follow-up button is reachable (exported)', q.evaluate("typeof window.wuFollowup") == 'function')
    ok('no page errors', not errs2, errs2)
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

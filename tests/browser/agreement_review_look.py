"""Client Care Agreement, Stage 2 (872, 2026-10-16): the office reviews the signed Contacts & Permissions from the
agreement card (agreement-card.js + agreement-review.js) and approves them into AxisCare and the Family Circle; then the
AxisCare checklist. Offline: the client-agreement function is a fake in the page (callAction), every call recorded.
Also the Family Circle's new "running late" switch (fcCircleBody in index.html).
Chromium and WebKit at 1024 and 768. python3 tests/browser/agreement_review_look.py [screenshot dir]"""
import json, sys, os, re, threading, http.server, functools
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp'
R = []
def ck(n, c, d=''): R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:600]))
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=ROOT))
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f'http://127.0.0.1:{srv.server_address[1]}'

C = lambda n, name, rel, **k: {'n': n, 'name': name, 'relationship': rel, 'cell': k.get('cell', ''), 'home': '', 'email': k.get('email', ''),
    'address': {'line1': k.get('line1', ''), 'city': '', 'state': k.get('state', ''), 'zip': ''}, 'hipaa': k.get('hipaa', False), 'medical': k.get('medical', False), 'book': k.get('book'),
    'poa': k.get('poa', []), 'texts': {'late': k.get('late', False), 'change': k.get('change', False)}, 'axis': {'care_notes': k.get('notes', False), 'invoices': False},
    'emails': {'weekly_calendar': k.get('cal', False), 'care_plans': False, 'office_messages': False, 'invoices': False},
    'plan': k['plan'], 'bad_state': k.get('bad_state', False), 'todo': k.get('todo', []), 'axiscare_now': k.get('now'), 'hub_now': k.get('hub_now')}
CONTACTS = [
    C(1, 'Nancy Anderson', 'Wife', cell='417-863-7309', email='nancy@example.com', line1='123 Maple St', state='Missouri', hipaa=True, medical=True, poa=['health'], book=True, late=True, notes=True, cal=True, bad_state=False,
      plan={'axiscare': {'action': 'update', 'slot': 1}, 'hub': {'action': 'update', 'member_id': 'm1'}},
      now={'name': 'Nancy Anderson', 'phone': '417-555-0001', 'email': 'old@example.com', 'address': '9 Old Rd, Ozark, MO', 'hipaa_authorized': False, 'can_make_medical_decisions': None},
      todo=[{'key': 'c1.signin', 'text': "Set up Nancy Anderson's AxisCare family sign-in to see care notes (nancy@example.com)"}, {'key': 'c1.emails', 'text': 'In AxisCare, turn on emails to Nancy Anderson: weekly calendar'}]),
    C(2, 'Tom Anderson', 'Son', cell='417-555-011', change=True, state='Misery', bad_state=True, plan={'axiscare': {'action': 'add', 'slot': 3}, 'hub': {'action': 'add', 'member_id': None}},
      hub_now={'name': 'Tom Anderson', 'stopped': True}),
    C(3, 'Jane Doe', 'Neighbor', late=True, plan={'axiscare': {'action': 'hub_only', 'slot': None, 'why': "AxisCare's three responsible party slots are taken by other people"}, 'hub': {'action': 'add', 'member_id': None}},
      todo=[{'key': 'c3.phone', 'text': 'Jane Doe asked for texts but gave no phone number: ask for a cell number'}]),
    C(4, 'Bob Ray', 'Friend', plan={'axiscare': {'action': 'hub_only', 'slot': None, 'why': "AxisCare's three responsible party slots are taken by other people"}, 'hub': {'action': 'add', 'member_id': None}}),
]
PAGE = '''<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>:root{--navy:#0E3860;--border:#E2E8F0} body{font-family:sans-serif;margin:0;padding:16px} .card{background:#fff;border-radius:12px} input[type=text]{box-sizing:border-box;padding:6px}</style>
<body><div id="cp_agreement"></div><script>
const CP = { ax: '296' }; window.CALLS = []; window.CONFIRMS = [];
const CONTACTS = %s;
let REVIEW = null;
window.ccConfirm = async (m) => { CONFIRMS.push(m); return true; }; window.PROMPTS = []; window.ccPrompt = async (m, d) => { PROMPTS.push([m, d]); return ('PROMPT_ANSWER' in window) ? window.PROMPT_ANSWER : d; }; window.OPENED = [];
window.callAction = async (fn, b) => { CALLS.push(JSON.parse(JSON.stringify(b)));
  if (b.action === 'list') return { status: 200, data: { agreements: [{ id: 'a1', status: 'countersigned', version: 'Rev. 10/2026', created_at: '2026-10-16T15:00:00Z', countersigned_at: '2026-10-16T16:00:00Z', has_pdf: true, signer: { name: 'Nancy Anderson', role: 'representative' }, contacts_review: REVIEW, answers: { 'c1.email': 'nancy@example.com' }, copies: { emails: [{ to: 'old@example.com', at: '2026-10-16T16:01:00Z', outcome: 'held', detail: 'Not sent: it is outside email hours' }], printed: false } }] } };
  if (b.action === 'contacts') return { status: 200, data: { ok: true, contacts: CONTACTS, review: REVIEW } };
  if (b.action === 'contacts_apply') {
    REVIEW = REVIEW || { people: {}, todo: {} }; const results = [];
    for (const p of b.people) {
      if (!p.include) { REVIEW.people[p.n] = { outcome: 'left_out', by: 'kr@mo-care.com', at: '2026-10-16T17:00:00Z' }; results.push({ n: p.n, outcome: 'left_out' }); continue; }
      if (p.edits.email && !/@/.test(p.edits.email)) { results.push({ n: p.n, outcome: 'problems', problems: ['That email does not look right: ' + p.edits.email] }); continue; }
      const c = CONTACTS.find((x) => x.n === p.n), ax = c.plan.axiscare;
      const rec = { by: 'kr@mo-care.com', at: '2026-10-16T17:00:00Z', axiscare: { action: ax.action, slot: ax.slot, outcome: ax.slot ? (window.REFUSE && p.n === 2 ? 'refused' : 'confirmed') : 'hub_only', detail: window.REFUSE && p.n === 2 ? 'AxisCare refused: this connection may not change responsible parties' : null }, hub: { outcome: 'saved' } };
      rec.outcome = rec.axiscare.outcome === 'refused' ? 'needs_another_try' : 'done'; REVIEW.people[p.n] = rec; results.push({ n: p.n, ...rec });
    }
    return { status: 200, data: { ok: true, results, review: REVIEW } };
  }
  if (b.action === 'contacts_todo') { REVIEW = REVIEW || { people: {}, todo: {} }; if (b.done) REVIEW.todo[b.key] = { by: 'kr@mo-care.com', at: '2026-10-16T17:05:00Z' }; else delete REVIEW.todo[b.key]; return { status: 200, data: { ok: true, review: REVIEW } }; }
  if (b.action === 'open') return { status: 200, data: { url: 'https://example.com/a1.pdf' } };
  if (b.action === 'copy_print') return { status: 200, data: { url: 'https://example.com/a1-copy.pdf' } };
  if (b.action === 'copy_email') return { status: 200, data: { ok: true, email: { outcome: 'sent', to: b.to, detail: 'Emailed to ' + b.to + '.' } } };
  return { status: 400, data: { error: 'x' } }; };
window.open = (u) => { OPENED.push(u); return null; };
</script><script src="agreement-card.js"></script><script>CAG.mount('cp_agreement')</script>'''
open(os.path.join(ROOT, '_car_test.html'), 'w').write(PAGE % json.dumps(CONTACTS))

# the Family Circle row, straight from index.html
src = open(os.path.join(ROOT, 'index.html')).read()
m = re.search(r'\nfunction fcCircleBody\(c, people, linked, esc(?:, inProfile)?\)\{.*?\n\}\n', src, re.S)
FC = '''<!doctype html><meta charset="utf-8"><body><div id="out"></div><script>function fcRecogChip(){return ''}%s
const e = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
window.SETS = []; window.fcSet = (id, k, v) => SETS.push([id, k, v]);
document.getElementById('out').innerHTML = fcCircleBody({ id: 'circ1' }, [
  { id: 'm1', name: 'Nancy Anderson', sms_consent: true, wants_changes: false, wants_late: true, from_agreement: 'a1' },
  { id: 'm2', name: 'Old Member', sms_consent: true, wants_changes: false }], true, e);
</script>''' % (m.group(0) if m else '')
open(os.path.join(ROOT, '_fc_test.html'), 'w').write(FC)

try:
    with sync_playwright() as p:
        for eng in ('chromium', 'webkit'):
            br = getattr(p, eng).launch()
            for w, h in ((1024, 768), (768, 1024)):
                name = f'{eng}-{w}'
                pg = br.new_page(viewport={'width': w, 'height': h}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
                pg.goto(BASE + '/_car_test.html'); pg.wait_for_selector('[data-cag-rev]')
                ck(f'{name}: a countersigned agreement says its contacts are not reviewed yet, with a Review contacts button',
                   'Contacts not reviewed yet' in pg.inner_text('#cp_agreement') and pg.inner_text('[data-cag-rev]') == 'Review contacts')
                pg.click('[data-cag-rev]'); pg.wait_for_selector('[data-car-n="1"]')
                t = pg.inner_text('[data-cag-revbox]')
                ck(f'{name}: each person says where they go (AxisCare slot, Family Circle, or Hub only and why)',
                   'AxisCare slot 1 (updates Nancy Anderson, already there)' in t and 'AxisCare slot 3 (new)' in t and t.count('Family Circle only') == 2 and 'three responsible party slots are taken' in t, t)
                ck(f'{name}: AxisCare now is shown side by side for Nancy', 'AxisCare now: Nancy Anderson · 417-555-0001 · old@example.com' in t and 'HIPAA No' in t)
                ck(f'{name}: the signed choices are shown and are not editable', 'Health information (HIPAA): Yes' in t and 'Can book in the app: Yes' in t and 'Can book in the app: not asked on this wording' in t and 'Texts: running late' in t and pg.locator('[data-car-f$=".hipaa"]').count() == 0)
                ck(f'{name}: a bad state and a STOP reply are pointed out', 'AxisCare needs a 2-letter state' in t and 'replied STOP' in t)
                ck(f'{name}: the AxisCare checklist lists the hand jobs', pg.locator('[data-car-todo]').count() == 3 and 'family sign-in' in t and 'ask for a cell number' in t)
                pg.screenshot(path=os.path.join(OUT, f'review-{name}.png'), full_page=True)
                calls0 = len(pg.evaluate('CALLS'))
                ck(f'{name}: opening the review sends nothing', [c['action'] for c in pg.evaluate('CALLS')] == ['list', 'contacts'])
                # Tom: fix his phone and a bad email first; Bob: left out
                pg.fill('[data-car-f="2.cell"]', '417-555-0111'); pg.fill('[data-car-f="2.email"]', 'tom at home'); pg.uncheck('[data-car-inc="4"]')
                pg.evaluate('window.REFUSE = true')
                pg.click('[data-car-go]'); pg.wait_for_timeout(500)
                ap = [c for c in pg.evaluate('CALLS') if c['action'] == 'contacts_apply'][-1]
                ck(f'{name}: approve asks first, naming the AxisCare slots and that HIPAA/Medical come from the signed agreement, and that nobody is texted',
                   pg.evaluate('CONFIRMS.length') == 1 and 'slot 1, 3' in pg.evaluate('CONFIRMS[0]') and 'signed agreement' in pg.evaluate('CONFIRMS[0]') and 'Nobody is texted' in pg.evaluate('CONFIRMS[0]'), pg.evaluate('CONFIRMS'))
                ck(f'{name}: approve sends every person with their typo fixes, and Bob as left out',
                   [(x['n'], x['include']) for x in ap['people']] == [(1, True), (2, True), (3, True), (4, False)] and ap['people'][1]['edits']['cell'] == '417-555-0111' and ap['people'][0]['edits']['state'] == 'Missouri', ap)
                t = pg.inner_text('[data-cag-revbox]')
                ck(f'{name}: a refused typo is said plainly next to the button', 'That email does not look right: tom at home' in pg.inner_text('[data-car-msg]'), pg.inner_text('[data-car-msg]') if pg.locator('[data-car-msg]').count() else t)
                ck(f'{name}: results per person: Nancy saved and checked, Jane Family Circle only, Bob left out', 'AxisCare slot 1: saved and checked · Family Circle: saved' in t and 'not in AxisCare' in t and 'Left out by kr@mo-care.com' in t, t)
                pg.fill('[data-car-f="2.email"]', ''); pg.click('[data-car-go]'); pg.wait_for_timeout(500)
                t = pg.inner_text('[data-cag-revbox]')
                ck(f'{name}: when AxisCare refuses, it says so in red and how to finish', 'AxisCare refused' in t and 'Not finished' in t and pg.locator('[data-car-go]').count() == 1, t)
                pg.evaluate('window.REFUSE = false'); pg.click('[data-car-go]'); pg.wait_for_timeout(500)
                t = pg.inner_text('[data-cag-revbox]')
                ck(f'{name}: tried again: done, and the Approve button goes away once everyone is finished', 'AxisCare slot 3: saved and checked' in t and pg.locator('[data-car-go]').count() == 0, t)
                ck(f'{name}: only Tom was sent the second and third time (the finished people are not sent again)',
                   [[x['n'] for x in c['people']] for c in pg.evaluate('CALLS') if c['action'] == 'contacts_apply'][1:] == [[2], [2]], [c for c in pg.evaluate('CALLS') if c['action'] == 'contacts_apply'])
                pg.check('[data-car-todo="c1.signin"]'); pg.wait_for_timeout(400)
                ck(f'{name}: ticking a checklist item saves who did it', 'done by kr@mo-care.com' in pg.inner_text('[data-cag-revbox]') and pg.is_checked('[data-car-todo="c1.signin"]'))
                pg.click('[data-cag-print]'); pg.wait_for_timeout(300)
                ck(f'{name}: card: Print family copy opens the COPY version', pg.evaluate('OPENED').count('https://example.com/a1-copy.pdf') == 1, pg.evaluate('OPENED'))
                ck(f'{name}: card: the last email attempt is shown, in red when it did not go', 'family copy not emailed: Not sent: it is outside email hours' in pg.inner_text('#cp_agreement'))
                pg.click('[data-cag-mail]'); pg.wait_for_timeout(400)
                ce = [c for c in pg.evaluate('CALLS') if c['action'] == 'copy_email']
                ck(f'{name}: card: Email family copy asks first, offering the primary contact, then sends to that address', pg.evaluate('PROMPTS')[0][1] == 'nancy@example.com' and ce and ce[-1]['to'] == 'nancy@example.com' and 'Emailed to nancy@example.com' in pg.inner_text('#cagMsg'), [pg.evaluate('PROMPTS'), ce])
                pg.evaluate('window.PROMPT_ANSWER = null'); n0 = len(pg.evaluate('CALLS')); pg.click('[data-cag-mail]'); pg.wait_for_timeout(300)
                ck(f'{name}: card: cancelling the question sends nothing', len(pg.evaluate('CALLS')) == n0)
                ck(f'{name}: nothing wider than the screen', pg.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'))
                ck(f'{name}: no page errors', not errs, errs)
                pg.screenshot(path=os.path.join(OUT, f'review-done-{name}.png'), full_page=True)
                pg.close()
            pg = br.new_page(); pg.goto(BASE + '/_fc_test.html')
            rows = pg.locator('#out > div > div').all()
            ck(f'{eng}: Family Circle shows a "running late" switch next to "caregiver changes"', pg.locator('input[onchange*="wants_late"]').count() == 2 and 'running late' in pg.inner_text('#out'))
            ck(f'{eng}: Nancy (running late only) shows running late on and caregiver changes off', pg.locator('input[onchange*="\'m1\',\'wants_late\'"]').is_checked() and not pg.locator('input[onchange*="\'m1\',\'wants_changes\'"]').is_checked())
            ck(f'{eng}: someone saved before 872 (no switch yet) shows running late on, as the texts treat them', pg.locator('input[onchange*="\'m2\',\'wants_late\'"]').is_checked())
            pg.locator('input[onchange*="\'m1\',\'wants_late\'"]').uncheck()
            ck(f'{eng}: unticking running late saves just that switch', pg.evaluate('SETS') == [['m1', 'wants_late', False]], pg.evaluate('SETS'))
            ck(f'{eng}: a member from the agreement says so', 'from the signed Client Care Agreement' in pg.inner_text('#out'))
            pg.close(); br.close()
finally:
    for f in ('_car_test.html', '_fc_test.html'): os.remove(os.path.join(ROOT, f))
for f in ('agreement-review.js', 'agreement-card.js'):
    ck(f'no em dash in {f}', '—' not in open(os.path.join(ROOT, f)).read())
srv.shutdown()
bad = [r for r in R if r[0] == 'FAIL']
for r in R: print(r[0], r[1] + ('\n     ' + r[2] if r[2] else ''))
print(f'\n{len(R) - len(bad)}/{len(R)} passed'); sys.exit(1 if bad else 0)

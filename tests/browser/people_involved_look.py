# People involved, lined up with the Client Care Agreement (her ask 2026-10-17): Medical decisions, Health care POA, Financial POA,
# older answers kept and marked, and HIPAA / Medical decisions shown read-only from the signed agreement (the Family Circle).
# Runs the REAL People involved code cut from index.html with stand-ins.   python3 tests/browser/people_involved_look.py
import os, re, tempfile
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
HTML = open(os.path.join(ROOT, 'index.html')).read()
i = HTML.index('/* 2026-10-17 her ask: "line People involved up with the agreement'); j = HTML.index('function lppFormValues(){', i)
CODE = HTML[i:j]
LPC = re.search(r'function lpcOn\(l\)\{[^\n]*\}', HTML).group(0)
R = []
def ck(n, c, note=''): R.append(('PASS' if c else 'FAIL', n, str(note)[:700]))
PAGE = """<!doctype html><meta charset="utf-8"><div id="lppIntakeHost"></div><script>
const escapeHtmlComms = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const lsDate = x => x, today = () => '2026-10-17', ME = { name: 'Samantha Troutman' }; function lppCheckPhone(){}
const CP = { lead: { id: 'L1', first_name: 'Laura', last_name: 'Johnson', phone: '(417) 224-4400', relationship: 'daughter' }, ax: '501' };
const LPI = { began: { L1: { ep: 'E1', people: [
  { person_key: 'k0', is_caller: true, roles: ['primary', 'decision_maker'], permission: 'yes', permission_asked_by: 'Samantha', permission_asked_at: '2026-10-17' },
  { person_key: 'k1', is_caller: false, name: 'Tom Johnson', relationship: 'son', roles: ['poa'], permission: 'not_asked' },
  { person_key: 'k2', is_caller: false, name: 'Ann Lee', relationship: 'friend', roles: ['poa_health', 'medical_decisions'], permission: 'not_asked' },
  { person_key: 'k3', is_caller: false, name: 'Bob Smith', email: 'BOB@x.test', relationship: 'son', roles: [], permission: 'not_asked' } ] } } };
const CIRCLE = [{ name: 'Laura Johnson', hipaa_authorized: true, can_make_medical_decisions: false }, { name: 'Tom Johnson', hipaa_authorized: null, can_make_medical_decisions: null }, { name: 'Robert Smith', email: 'bob@x.test', hipaa_authorized: true, can_make_medical_decisions: true }];
const q = (rows) => ({ select(){ return this }, eq(){ return this }, limit(){ return Promise.resolve({ data: rows }) }, then(f){ return Promise.resolve({ data: rows }).then(f) } });
const sb = { from: (t) => t === 'care_circles' ? q([{ id: 'c1' }]) : q(CIRCLE) };
__LPC__
__CODE__
</script>"""
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    f = tempfile.NamedTemporaryFile('w', suffix='.html', delete=False); f.write(PAGE.replace('__LPC__', LPC).replace('__CODE__', CODE)); f.close()
    pg.goto('file://' + f.name); pg.evaluate('lppRender()'); pg.wait_for_timeout(150)
    t = pg.inner_text('#lppIntakeHost')
    ck('roles shown in the agreement\'s words; older answers marked older (never guessed)', 'Medical decisions' in t and 'Health care POA' in t and 'Decision maker (older answer)' in t and 'POA (older answer: health or financial?)' in t, t)
    ck('HIPAA and Medical decisions from the signed agreement, read-only, matched by name', 'HIPAA (signed agreement): Yes · Medical decisions: No' in t, t)
    ck('someone the agreement doesn\'t answer for: "not on file yet"', t.count('HIPAA (signed agreement): not on file yet') == 2, t)
    bob = pg.inner_text('.lpp-person[data-key="k3"]')
    ck('email first: Bob Smith on this screen is Robert Smith in the Family Circle (same email), so his signed answers show', 'HIPAA (signed agreement): Yes · Medical decisions: Yes' in bob, bob)
    pg.click('.lpp-person[data-key="k1"] button:has-text("Change")'); pg.wait_for_timeout(60)
    labels = pg.eval_on_selector_all('input[name="lppF-roles"]', 'es => es.map(e => e.parentElement.textContent.trim() + (e.checked ? " [x]" : ""))')
    ck('the form offers the agreement\'s choices, plus the older answer this person has (checked, so it can be unticked)', labels == ['Primary contact', 'Medical decisions', 'Health care POA', 'Financial POA', 'Billing', 'Emergency contact', 'Professional or referral', 'POA (older answer: health or financial?) [x]'], labels)
    ck('the form says where the legal answers come from', 'come from the signed Client Care Agreement' in pg.inner_text('.lpp-form'))
    ck('no page errors', not errs, errs)
    b.close(); os.unlink(f.name)
for r in R: print(('  ✓ ' if r[0] == 'PASS' else '  ✗ ') + r[1] + ('' if r[0] == 'PASS' else '\n      ' + r[2]))
print(f"\n  people involved: {sum(1 for r in R if r[0] == 'PASS')}/{len(R)} passed")

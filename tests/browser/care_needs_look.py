"""Care needs for matching (Samantha "go", 2026-10-12, Track 3c): the checklist on the client profile's Care tab. Offline:
care-needs.js with the real match-rules.js; the database reads and the fact door are faked and recorded. Off: nothing shows.
On: 18 needs plus the extras; intake answers shown as "to confirm", never counted; Confirm sends care-plan facts through the
door (first, then update or a correction with a reason); a stale refusal is shown; a Medicaid lift is flagged.
python3 tests/browser/care_needs_look.py [screenshot dir]"""
import json, sys, os
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp'
page = '''<!doctype html><meta charset="utf-8"><body><div id="cp_needs"></div><script src="match-rules.js"></script><script>
window.DATA = { ops_settings: { care_needs_live: false } };
window.CP = { lead: { id: 'L1', funding_source: 'private', client_attributes: { hoyer_lift: 'yes', bed_bound: 'no', dementia: 'preferred', cats: 'yes', spanish_speaking: 'no' } } };
window.FACTS = []; window.CALLS = []; window.NEXT = [];
const chain = (rows) => { const o = { select: () => o, eq: () => o, in: () => o, then: (ok) => ok({ data: rows(), error: null }) }; return o; };
window.sb = { from: (t) => chain(() => t === 'episode_source' ? [{ episode_id: 'E1' }] : t === 'client_fact_current' ? window.FACTS : []) };
window.lpfCall = async (b) => { window.CALLS.push(b); const r = window.NEXT.shift() || { outcome: 'recorded', fact_id: 'F' + window.CALLS.length };
  if (r.outcome === 'recorded') { window.FACTS = window.FACTS.filter(f => f.kind !== b.kind).concat([{ fact_id: r.fact_id, kind: b.kind, layer: 'plan', value: b.value, certainty: 'confirmed', recorded_by: 'kay@mo-care.com', recorded_at: '2026-10-12T15:00:00Z' }]); } return r; };
/* like the Hub page: the shift-notes state is a page-level const named CN (the 2026-10-12 clash) */
const CN = { ax: '', at: 0, data: null, busy: false };
window.escapeHtmlComms = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
</script><script src="care-needs.js"></script></body>'''
open(os.path.join(ROOT, '_cn_test.html'), 'w').write(page)
R = []
ok = lambda n, c, d='': R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:300]))
try:
  with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1100, 'height': 1400}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    DLG = {'accept': True, 'prompt': ''}
    pg.on('dialog', lambda d: d.accept(DLG['prompt']) if d.type == 'prompt' else (d.accept() if DLG['accept'] else d.dismiss()))
    pg.goto('file://' + os.path.join(ROOT, '_cn_test.html')); pg.wait_for_timeout(200)
    # the Hub asks on the page (ccConfirm/ccPrompt); this bare test page has no Hub, so they go to the dialogs answered above
    pg.evaluate('window.ccConfirm = async m => confirm(m); window.ccPrompt = async (m, v) => prompt(m, v)')
    pg.evaluate('window.window.CN.mount("cp_needs")'); pg.wait_for_timeout(300)
    ok('switch off: nothing shows and nothing is read', pg.inner_text('#cp_needs').strip() == '')
    pg.evaluate('DATA.ops_settings.care_needs_live = true; window.CN.mount("cp_needs")'); pg.wait_for_timeout(500)
    t = pg.inner_text('#cp_needs')
    ok('switch on: the checklist with every need on the approved list and the extras', t.count('Required') >= 19 and 'A Hoyer or other mechanical lift' in t and 'Emptying an ostomy bag' in t and 'Caregiver gender' in t and 'Advanced tasks we do not provide' in t, t[:300])
    ok('nothing confirmed yet: "Matching requirements incomplete: 18 of 18", every need "not yet known"', 'Matching requirements incomplete: 18 of 18 needs not confirmed' in t and t.count('not yet known') >= 18)
    ok('the lead\'s answers show as "from intake, to confirm" and do not count', 'from intake: required, to confirm' in t and 'from intake: preferred, to confirm' in t and 'Matching requirements incomplete' in t)
    ok('the Medicaid and checked-first notes show on their rows', '(checked first)' in t and 'Medicaid: advanced personal care' in t and 'Medicaid: waits on MMAC' in t)
    pg.screenshot(path=os.path.join(OUT, 'cn_1_empty.png'), full_page=True)
    # confirm every need: hoyer required, the rest no
    pg.evaluate("CCMatch.SKILLS.forEach(s => window.CN.set('need_' + s.key, s.key === 'hoyer_lift' ? 'required' : 'no'))"); pg.wait_for_timeout(200)
    ok('chosen but not saved: says so, and Confirm counts them', 'changed, not saved' in pg.inner_text('#cp_needs') and 'Confirm 18 on the care plan' in pg.inner_text('#cp_needs'))
    pg.click('text=Confirm 18 on the care plan'); pg.wait_for_timeout(800)
    calls = pg.evaluate('CALLS')
    ok('Confirm: 18 facts through the door, each on the care plan layer, "confirmed", a first save, by staff observation', len(calls) == 18 and all(c['layer'] == 'plan' and c['certainty'] == 'confirmed' and c['change_kind'] == 'first' and c['supersedes_fact_id'] is None and c['said_how'] == 'staff_observation' for c in calls), calls[:2])
    t = pg.inner_text('#cp_needs')
    ok('after saving: complete, each row shows who confirmed it and when', 'Matching requirements complete' in t and t.count('care plan, kay 2026-10-12') >= 18 and '18 saved.' in t, t[:400])
    pg.screenshot(path=os.path.join(OUT, 'cn_2_complete.png'), full_page=True)
    # their needs changed: an update replacing the confirmed fact
    DLG['accept'] = True; pg.evaluate("window.CALLS = []; window.CN.set('need_bedbound_care', 'required')"); pg.click('text=Confirm 1 on the care plan'); pg.wait_for_timeout(500)
    c = pg.evaluate('CALLS')[0]
    ok('a change to a confirmed need (their needs changed): an update that names the fact it replaces', c['change_kind'] == 'update' and c['supersedes_fact_id'] and c['value'] == 'required', c)
    # it was wrong: a correction needs a reason
    DLG['accept'] = False; DLG['prompt'] = ''; pg.evaluate("window.CALLS = []; window.CN.set('need_bedbound_care', 'no')"); pg.click('text=Confirm 1 on the care plan'); pg.wait_for_timeout(400)
    ok('it was wrong, but no reason given: nothing is saved', pg.evaluate('CALLS.length') == 0 and 'a correction needs a reason' in pg.inner_text('#cp_needs'))
    DLG['prompt'] = 'The assessment found she repositions herself'; pg.click('text=Confirm 1 on the care plan'); pg.wait_for_timeout(400)
    c = pg.evaluate('CALLS')[0]
    ok('it was wrong, with a reason: a correction carrying the reason', c['change_kind'] == 'correction' and c['reason'] == 'The assessment found she repositions herself', c)
    # someone else changed it first: stale is shown, nothing overwritten
    DLG['accept'] = True; pg.evaluate("window.CALLS = []; window.NEXT = [{ outcome: 'refused', reason: 'stale', message: 'someone changed this after you opened it; look at their change first' }]; window.CN.set('need_feeding', 'required')")
    pg.click('text=Confirm 1 on the care plan'); pg.wait_for_timeout(400)
    ok('a stale save is refused and the reason shown (never overwritten)', 'someone changed this after you opened it' in pg.inner_text('#cp_needs'))
    # Medicaid client with a lift required: flagged
    pg.evaluate("CP.lead.funding_source = 'medicaid'; window.CN.render()"); pg.wait_for_timeout(200)
    ok('a Medicaid client with a lift required: flagged for review (advanced personal care), shown in red', 'Flagged for review: A Hoyer or other mechanical lift is advanced personal care' in pg.inner_text('#cp_needs'))
    pg.screenshot(path=os.path.join(OUT, 'cn_3_medicaid.png'), full_page=True)
    ok('no page errors', not errs, errs)
    b.close()
finally:
  os.remove(os.path.join(ROOT, '_cn_test.html'))
for s, n, d in R: print(s, ' ', n, ('  ' + d) if d else '')

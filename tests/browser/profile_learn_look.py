"""Learned from AxisCare and calls (Samantha 2026-11-02, her yes to the Dan Probstfield mockup): the card at the top of a client's
Care tab. Offline: profile-learn.js with the server (profile-learn) faked and every request recorded, persist faked.
Off and not an owner: nothing shows. Owner in practice: the card, marked practice. Each line says where it came from; Save on a
care need goes to the server; Save on Life Story, safety, family and home goes on the client's profile (persist) and is then
recorded as saved; Not right hides a line; the AxisCare task list shows. Also: the Care needs card finds a client's Journey
when they have no inquiry (care-needs.js).
python3 tests/browser/profile_learn_look.py [screenshot dir]"""
import json, sys, os
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp'
LOOK = {'ok': True, 'live': False, 'built_at': '2026-11-02T20:00:00Z', 'built_by': 'samantha@mo-care.com', 'episode_id': None, 'decided': 0,
  'calls': {'read': 9, 'waiting': 2, 'not_readable': 1, 'found': 12, 'first_at': '2026-10-13T15:00:00Z'},
  'sources': [{'n': 1, 'kind': 'call', 'label': 'Call with Barbara (wife)', 'at': 'Oct 29, 2026'}, {'n': 2, 'kind': 'call', 'label': 'Call with Tina (daughter)', 'at': 'Oct 30, 2026'},
    {'n': 3, 'kind': 'packet', 'label': 'Caregiver packet', 'at': 'Oct 12, 2026'}, {'n': 4, 'kind': 'topics', 'label': 'What caregivers write about', 'at': ''}],
  'box': {'decisions': [{'key': 'dec_aaa', 'title': 'Two caregivers for transfers?', 'text': 'Tina asked for two caregivers for transfers. We never do two-person transfers; the family has started using a lift.', 'sources': [2, 1]}],
    'lines': [{'key': 'nee_lift', 'section': 'needs', 'text': 'A lift is used to reposition him', 'sources': [1], 'kind': 'need_hoyer_lift', 'value': 'required'},
      {'key': 'saf_tear', 'section': 'safety', 'text': 'Skin tear on his head from repositioning, Oct 29. Watch for infection.', 'sources': [1]},
      {'key': 'lif_sport', 'section': 'life', 'text': 'Loves sports on TV and ballgames', 'sources': [4], 'life_q': 'enjoys'},
      {'key': 'fam_night', 'section': 'family', 'text': 'At night, call Tina, not Barbara. Barbara goes to bed around 9.', 'sources': [2]},
      {'key': 'hom_drink', 'section': 'home', 'text': 'Drinks water, soda and chicken broth', 'sources': [4]}],
    'team': [{'key': 'tea_mary', 'text': 'Family likes Mary, Katie, Amy and Catherine; asked to take Ariel off.', 'sources': [2]}]},
  'tasks': [{'name': 'Reposition every 2 hours', 'when': 'each visit', 'instructions': 'Roll him toward you using the draw sheet'}]}
page = '''<!doctype html><meta charset="utf-8"><style>:root{--navy:#0D365F;--border:#E3E0D8}</style><body><div id="cp_learned"></div><div id="cp_needs"></div><script>
let DATA = { ops_settings: {}, client_profiles: [{ id: 'cp_ax297', life: { enjoys: { text: 'His grandkids', by: 'Kay', at: '2026-10-01' } } }] };
let CC_ROLES = ['care_coordinator']; let ME = { name: 'Krystal', email: 'krystal@mo-care.com' };
/* like the Hub page: DATA, CP, CC_ROLES and ME are the page's own names, never on window (the 2026-11-02 miss) */
const CP = { ax: '297', lead: null, r: { client_name: 'Dan Probstfield' } };
window.CONFIG = { supabase_url: 'https://x.supabase.co', supabase_anon_key: 'anon' };
window.CALLS = []; window.SAVED = []; window.LOOK = %s;
window.sb = { auth: { getSession: async () => ({ data: { session: { access_token: 't' } } }) },
  from: (t) => { const o = { select: () => o, eq: () => o, in: () => o, then: (ok) => ok({ data: t === 'person_source_id' ? [{ person_id: 'P297' }] : t === 'journey_episode' ? [{ episode_id: 'E1' }] : [], error: null }) }; return o; } };
window.persist = async (k, item) => { window.SAVED.push([k, JSON.parse(JSON.stringify(item))]); };
window.fetch = async (url, o) => { const b = JSON.parse(o.body); window.CALLS.push(b);
  const J = (x, s) => ({ ok: (s || 200) < 300, status: s || 200, json: async () => x });
  if (b.action === 'look') return J(JSON.parse(JSON.stringify(window.LOOK)));
  if (b.action === 'read') return J(Object.assign(JSON.parse(JSON.stringify(window.LOOK)), { read_now: 2, calls_left: 0, said: [] }));
  if (b.action === 'save_need') return J({ ok: true, opened: true, label: 'A Hoyer or other mechanical lift: Required' });
  if (b.action === 'decide') return J({ ok: true });
  return J({ error: 'unknown' }, 400); };
const CN = { ax: '', at: 0, data: null, busy: false };
window.escapeHtmlComms = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
</script><script src="match-rules.js"></script><script src="profile-learn.js"></script><script src="care-needs.js"></script></body>''' % json.dumps(LOOK)
open(os.path.join(ROOT, '_pl_test.html'), 'w').write(page)
R = []
ok = lambda n, c, d='': R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:400]))
try:
  with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1000, 'height': 1400}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('file://' + os.path.join(ROOT, '_pl_test.html')); pg.wait_for_timeout(200)
    pg.evaluate('PLRN.mount("cp_learned")'); pg.wait_for_timeout(300)
    ok('switch off, a coordinator: nothing shows and the server is not asked', pg.inner_text('#cp_learned').strip() == '' and pg.evaluate('CALLS.length') == 0)
    pg.evaluate('CC_ROLES = ["owner_admin"]; PLRN.mount("cp_learned")'); pg.wait_for_timeout(400)
    t = pg.inner_text('#cp_learned')
    ok('owner in practice: the card, marked practice', 'Learned from AxisCare and calls' in t and 'Practice.' in t, t[:300])
    ok('it says how far the calls are read, from the first one', '9 of 12 family calls read, the first on Oct 13, 2026' in t and '2 still to read' in t, t[:600])
    ok('the decision is apart, in red, with only Handled (never Save)', 'needs your decision' in t.lower() and 'Two caregivers for transfers?' in t, t[:800])
    ok('every line says where it came from', 'Call with Barbara (wife), Oct 29, 2026' in t and 'What caregivers write about' in t)
    ok('a care need says what it saves as, in the Care needs words', 'Saves as: A Hoyer or other mechanical lift, Required' in t, t)
    ok('caregiver likes sit under "For the team, not the profile" with Done, not Save', 'for the team, not the profile' in t.lower() and 'belong in AxisCare' in t)
    ok('the AxisCare task list shows, read live', 'Reposition every 2 hours' in t and 'draw sheet' in t)
    ok('no em dashes on the card', '—' not in t)
    pg.screenshot(path=os.path.join(OUT, 'pl_1_card.png'), full_page=True)
    # Save a care need: the server, then the line leaves the box
    pg.evaluate('CALLS = []'); pg.click('[onclick="PLRN.save(\'nee_lift\')"]'); pg.wait_for_timeout(400)
    c = pg.evaluate('CALLS'); t = pg.inner_text('#cp_learned')
    ok('Save on a care need goes to the server (save_need) and nothing is saved on the page', len(c) == 1 and c[0]['action'] == 'save_need' and c[0]['line_key'] == 'nee_lift' and pg.evaluate('SAVED.length') == 0, c)
    ok('it says where it went, and that a Journey was opened', 'Saved to Care needs for matching' in t and 'one was opened' in t and 'A lift is used to reposition him' not in t, t[:500])
    # Save to Life Story: added to the answer already there, then recorded as saved
    pg.evaluate('CALLS = []'); pg.click('[onclick="PLRN.save(\'lif_sport\')"]'); pg.wait_for_timeout(400)
    s = pg.evaluate('SAVED'); c = pg.evaluate('CALLS')
    ok('Save to Life Story adds to the answer already there, under the coordinator\'s name', s and s[-1][0] == 'client_profiles' and s[-1][1]['life']['enjoys']['text'] == 'His grandkids; Loves sports on TV and ballgames' and s[-1][1]['life']['enjoys']['by'] == 'Krystal', s)
    ok('then the line is recorded as saved to Life Story', c and c[-1]['action'] == 'decide' and c[-1]['decision'] == 'saved' and c[-1]['saved_to'] == 'Life Story', c)
    # Safety and family go on the profile as lists
    pg.click('[onclick="PLRN.save(\'saf_tear\')"]'); pg.wait_for_timeout(300); pg.click('[onclick="PLRN.save(\'fam_night\')"]'); pg.wait_for_timeout(300)
    p = pg.evaluate('SAVED')[-1][1]
    ok('safety and family lines are kept on the profile with who, when and where from', p['safety_notes'][0]['text'].startswith('Skin tear') and p['safety_notes'][0]['from'].startswith('Call with Barbara') and p['family_notes'][0]['by'] == 'Krystal', p)
    # Not right
    pg.evaluate('CALLS = []'); pg.click('[onclick="PLRN.decide(\'hom_drink\',\'not_right\')"]'); pg.wait_for_timeout(300)
    c = pg.evaluate('CALLS'); t = pg.inner_text('#cp_learned')
    ok('Not right is recorded and the line goes away', c[0]['decision'] == 'not_right' and c[0]['section'] == 'home' and 'chicken broth' not in t and 'will not come back' in t, [c, t[:300]])
    pg.click('[onclick="PLRN.decide(\'dec_aaa\',\'handled\')"]'); pg.wait_for_timeout(300)
    ok('a decision is marked handled with its title', pg.evaluate('CALLS')[-1]['section'] == 'decision' and pg.evaluate('CALLS')[-1]['text'] == 'Two caregivers for transfers?')
    # Read what's new
    pg.evaluate('CALLS = []'); pg.click('text=Read what\'s new'); pg.wait_for_timeout(400)
    ok('Read what\'s new asks the server and says what it read', pg.evaluate('CALLS')[0]['action'] == 'read' and 'Read 2 calls. Up to date.' in pg.inner_text('#cp_learned'))
    pg.screenshot(path=os.path.join(OUT, 'pl_2_after.png'), full_page=True)
    # the Care needs card, a client with no inquiry
    pg.evaluate('DATA.ops_settings.care_needs_live = true; window.CN.mount("cp_needs")'); pg.wait_for_timeout(500)
    t = pg.inner_text('#cp_needs')
    ok('Care needs: a client with no inquiry finds their Journey through AxisCare and shows the checklist', 'Matching requirements' in t and 'No inquiry is on file' not in t, t[:300])
    pg.evaluate("window.sb.from = (t) => { const o = { select: () => o, eq: () => o, in: () => o, then: (ok) => ok({ data: [], error: null }) }; return o; }; CP.ax = '298'; CP.lead = null; window.CN.mount('cp_needs')"); pg.wait_for_timeout(400)
    ok('Care needs: no inquiry and no Journey yet says one opens on the first Save above', 'One opens the first time someone saves a need' in pg.inner_text('#cp_needs'))
    ok('the card finds the client and settings by the page\'s own names (none on window)', pg.evaluate('typeof window.CP === "undefined" && typeof window.DATA === "undefined"'))
    ok('no page errors', not errs, errs)
    b.close()
finally:
  os.remove(os.path.join(ROOT, '_pl_test.html'))
for s, n, d in R: print(s, n, ('  ' + d) if d else '')
print(f"\n{sum(1 for r in R if r[0] == 'PASS')}/{len(R)} passed")
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

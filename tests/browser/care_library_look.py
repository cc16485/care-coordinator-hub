"""Care Library tab (Client Care → Care Library, 2026-10-12). Offline: the care-packet function is faked with a slice of the real
researched library (waiting for her OK) plus approved topics, and every call recorded. A care coordinator browses and watches
but cannot approve or change; the owner sees what is waiting, the rule box and the note for her, approves or removes a video
or a whole topic, adds a topic, edits one without approving what is still waiting. The Hub page wires the tab in.
python3 tests/browser/care_library_look.py [screenshot dir] [seed json]"""
import json, sys, os, re
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp'
R = []
def ok(n, c, d=''): R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:400]))
HUB = open(os.path.join(ROOT, 'index.html')).read()
HUB_CSS = '\n'.join(re.findall(r'<style[^>]*>(.*?)</style>', HUB, re.S))
LIB = [
  {'key': 'turning', 'title': 'Turning and repositioning', 'category': 'moving', 'flag': '', 'notes': 'Turn every 2 hours.', 'active': True, 'pending': False, 'review_note': '',
   'videos': [{'title': 'Lie on the side', 'url': 'https://www.youtube.com/watch?v=6M5_eTPUWpo', 'publisher': 'The Hospice Care Plan', 'minutes': 5}]},
  {'key': 'after_fall', 'title': 'After a fall: do not lift', 'category': 'moving', 'active': True, 'pending': True,
   'flag': 'CC rule: never lift or help up a client who has fallen. Keep them comfortable on the floor, call 911 if they are hurt or you are not sure, and call the office every time.',
   'notes': 'If your client falls, do not try to lift them.', 'review_note': 'Only one video fits your never-lift rule.',
   'videos': [{'title': 'What should I do if my loved one falls?', 'url': 'https://www.youtube.com/watch?v=iRYH6XILaxM', 'publisher': 'Hospice and Palliative Care with Eden', 'minutes': 1, 'status': 'pending', 'why': 'Says plainly I cannot lift her up.'}]},
  {'key': 'thickened_liquids', 'title': 'Thickened liquids', 'category': 'eating', 'flag': '', 'active': True, 'pending': True, 'notes': 'Every drink must be thickened.', 'review_note': 'UK video uses a UK brand.',
   'videos': [{'title': 'Thickened Liquids', 'url': 'https://www.youtube.com/watch?v=3-iVUCmWNG0', 'publisher': 'Gaylord Hospital', 'minutes': 6, 'status': 'pending', 'why': 'US speech pathologist.'},
              {'title': 'How to thicken fluids', 'url': 'https://www.youtube.com/watch?v=hzdXykWPrXE', 'publisher': 'Chesterfield Royal Hospital', 'minutes': 5, 'status': 'pending', 'why': 'All four levels.'}]},
  {'key': 'old', 'title': 'Old topic', 'category': 'other', 'flag': '', 'notes': '', 'active': False, 'pending': False, 'review_note': '', 'videos': []}]
page = '''<!doctype html><meta charset="utf-8"><style>''' + HUB_CSS.replace('%', '%%') + '''</style><body><div class="card"><div id="clib_box"></div></div><script>
window.STATE = { lib: %s, owner: false }; window.CALLS = [];
window.callAction = async (fn, b) => { CALLS.push(JSON.parse(JSON.stringify(b)));
  if (b.action === 'library') return { status: 200, data: { library: JSON.parse(JSON.stringify(STATE.lib)), can_edit: STATE.owner } };
  if (b.action === 'review') { if (!STATE.owner) return { status: 403, data: { error: 'Only an owner can approve the Care Library.' } };
    const t = STATE.lib.find(x => x.key === b.key);
    if (b.url) { const i = t.videos.findIndex(v => v.url === b.url); if (b.decision === 'approve') t.videos[i].status = 'approved'; else t.videos.splice(i, 1); }
    else if (b.decision === 'approve') { t.pending = false; t.active = true; } else t.active = false;
    return { status: 200, data: { outcome: 'saved', library: JSON.parse(JSON.stringify(STATE.lib)) } }; }
  if (b.action === 'topic_save') { if (b.is_new && STATE.lib.some(t => t.key === b.key)) return { status: 409, data: { error: 'There is already a topic with that name.' } };
    const prev = STATE.lib.find(t => t.key === b.key); const row = Object.assign({}, prev || { pending: false, review_note: '' }, { key: b.key, title: b.title, category: b.category, flag: b.flag, notes: b.notes, videos: b.videos, active: true });
    STATE.lib = STATE.lib.filter(t => t.key !== b.key).concat([row]); return { status: 200, data: { outcome: 'saved', library: JSON.parse(JSON.stringify(STATE.lib)) } }; }
  return { status: 400, data: { error: 'unknown' } }; };
window.confirm = () => true;
</script><script src="care-library.js"></script></body>''' % json.dumps(LIB)
open(os.path.join(ROOT, '_clib_test.html'), 'w').write(page)
try:
  with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []
    pg = b.new_page(viewport={'width': 1100, 'height': 1300}); pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.route('https://i.ytimg.com/**', lambda r: r.fulfill(status=200, content_type='image/jpeg', body=b''))
    pg.route('https://www.youtube-nocookie.com/**', lambda r: r.fulfill(status=200, content_type='text/html', body='<body style="background:#000"></body>'))
    pg.goto('file://' + os.path.join(ROOT, '_clib_test.html'))
    # ---- a care coordinator ----
    pg.evaluate('CLIB.mount("clib_box")'); pg.wait_for_timeout(300); t = pg.inner_text('#clib_box')
    ok('coordinator: the library loads in groups with counts, the removed topic hidden', 'Care Library' in t and 'MOVING AND FALLS' in t and 'EATING AND DIETS' in t and '3 topics' in t and 'Old topic' not in t, t[:500])
    ok('coordinator: sees what is waiting for Samantha, but no Approve, Edit, Remove or New topic', "waiting for Samantha's OK" in t and not pg.query_selector('[data-clib-ok],[data-clib-edit],[data-clib-rm],[data-clib-topic-ok],#clib_new'))
    pg.click('[data-clib-toggle="turning"]'); pg.wait_for_timeout(100); pg.click('[data-clib-play="turning|0"]'); pg.wait_for_timeout(200)
    ok('coordinator: can open a topic and watch a video right here (privacy-enhanced player)', pg.eval_on_selector_all('#clib_box iframe', 'f=>f.map(x=>x.src)') == ['https://www.youtube-nocookie.com/embed/6M5_eTPUWpo?rel=0'])
    # ---- the owner ----
    pg.evaluate('STATE.owner = true; CLIB.mount("clib_box")'); pg.wait_for_timeout(300); t = pg.inner_text('#clib_box')
    ok('owner: the count says how many are waiting for her OK (2 topics + 3 videos)', '5 waiting for your OK' in t, t[:300])
    pg.click('[data-clib-f="waiting"]'); pg.wait_for_timeout(100); t = pg.inner_text('#clib_box')
    ok('owner: "Waiting for your OK" shows only what needs her', 'After a fall' in t and 'Thickened liquids' in t and 'Turning and repositioning' not in t, t[:500])
    pg.click('[data-clib-toggle="after_fall"]'); pg.wait_for_timeout(100); t = pg.inner_text('#clib_box')
    ok('owner: the never-lift rule shows in its own box, with the note for her and why the video was picked', 'Rule: CC rule: never lift' in t and 'Note for you before you approve: Only one video fits' in t and 'Why it was picked' in t, t[:900])
    pg.screenshot(path=os.path.join(OUT, 'clib_1_waiting.png'), full_page=True)
    pg.click('[data-clib-ok="after_fall|0"]'); pg.wait_for_timeout(300); c = pg.evaluate('CALLS[CALLS.length-1]')
    ok('owner: Approve sends her OK for that one video', c == {'action': 'review', 'key': 'after_fall', 'url': 'https://www.youtube.com/watch?v=iRYH6XILaxM', 'decision': 'approve'}, c)
    pg.click('[data-clib-topic-ok="after_fall"]'); pg.wait_for_timeout(300); c = pg.evaluate('CALLS[CALLS.length-1]'); t = pg.inner_text('#clib_box')
    ok('owner: "Approve this topic for packets" sends the topic OK and says it can go in packets', c == {'action': 'review', 'key': 'after_fall', 'decision': 'approve'} and 'can go in packets now' in t, c)
    pg.click('[data-clib-f="all"]'); pg.wait_for_timeout(100); pg.click('[data-clib-toggle="thickened_liquids"]'); pg.wait_for_timeout(100)
    pg.click('[data-clib-rm="thickened_liquids|1"]'); pg.wait_for_timeout(300); c = pg.evaluate('CALLS[CALLS.length-1]')
    ok('owner: Remove takes one video off', c['decision'] == 'remove' and c['url'].endswith('hzdXykWPrXE'), c)
    pg.fill('#clib_q', 'thick'); pg.wait_for_timeout(150); t = pg.inner_text('#clib_box')
    ok('search finds topics by words in them', 'Thickened liquids' in t and 'Turning and repositioning' not in t, t[:400])
    pg.fill('#clib_q', ''); pg.wait_for_timeout(100)
    # edit a topic still waiting: its waiting video stays waiting
    pg.click('[data-clib-edit="thickened_liquids"]'); pg.wait_for_timeout(100)
    pg.fill('#clib_e_notes', 'Every drink must be thickened, even water.'); pg.click('#clib_e_save'); pg.wait_for_timeout(300); c = pg.evaluate('CALLS[CALLS.length-1]')
    ok('owner: editing keeps a waiting video waiting (only Approve approves it), and keeps the group', c['action'] == 'topic_save' and c['videos'][0]['status'] == 'pending' and c['category'] == 'eating' and c['notes'].endswith('even water.') and c['is_new'] is False, c)
    # a new topic she writes herself
    pg.click('#clib_new'); pg.wait_for_timeout(100)
    pg.fill('#clib_e_title', 'Hearing aids'); pg.select_option('#clib_e_cat', 'personal'); pg.fill('#clib_e_notes', 'Check the battery.')
    pg.fill('[data-clib-ev="title"][data-i="0"]', 'Hearing aid care'); pg.fill('[data-clib-ev="url"][data-i="0"]', 'https://youtu.be/6M5_eTPUWpo')
    lay = pg.evaluate("(()=>{ const b=document.getElementById('clib_e_save'), s=document.getElementById('clib_e_cat'); return { save: b.className, saveW: b.getBoundingClientRect().width, selW: s.getBoundingClientRect().width }; })()")
    ok("looks right with the Hub's own styles: Save is a navy button, not stretched", lay['save'] == 'primary' and lay['saveW'] < 200 and lay['selW'] <= 300, lay)
    pg.screenshot(path=os.path.join(OUT, 'clib_2_new.png'), full_page=True)
    pg.click('#clib_e_save'); pg.wait_for_timeout(300); c = pg.evaluate('CALLS[CALLS.length-1]')
    ok('owner: a new topic saves with its group and her own video (approved by her)', c['action'] == 'topic_save' and c['key'] == 'hearing_aids' and c['is_new'] is True and c['category'] == 'personal' and c['videos'][0]['status'] == 'approved', c)
    t = pg.inner_text('#clib_box')
    ok('it shows up in Personal care', 'PERSONAL CARE' in t and 'Hearing aids' in t)
    pg.click('#clib_new'); pg.fill('#clib_e_title', 'Hearing aids'); pg.evaluate("document.querySelector('[data-clib-ev=url]').value=''"); pg.click('#clib_e_save'); pg.wait_for_timeout(300)
    ok('a new topic with a name already taken is refused, the form stays open', 'already a topic with that name' in pg.inner_text('#clib_box') and pg.query_selector('#clib_e_title') is not None)
    pg.click('#clib_e_cancel'); pg.wait_for_timeout(100)
    pg.click('[data-clib-f="retired"]'); pg.wait_for_timeout(100); pg.click('[data-clib-toggle="old"]'); pg.wait_for_timeout(100)
    ok('owner: Removed shows retired topics with Bring it back', 'Old topic' in pg.inner_text('#clib_box') and pg.query_selector('[data-clib-topic-ok="old"]') is not None)
    ok('no em dash anywhere', '—' not in pg.inner_text('#clib_box'))
    ok('no page errors', not errs, errs)
    b.close()
finally:
  try: os.remove(os.path.join(ROOT, '_clib_test.html'))
  except Exception: pass
# ---- the Hub page wires the tab in ----
ok('Hub: Care Library pill in Client Care, beside Team Builder', re.search(r'id="fsub-clients".*?data-tab="teambuilder".*?data-tab="carelibrary"[^>]*>.*?Care Library', HUB, re.S) is not None)
ok('Hub: carelibrary is in the Client Care group, has a title and a panel', "'teambuilder','carelibrary']" in HUB and "carelibrary:'Care Library'" in HUB and 'id="tab-carelibrary"' in HUB)
ok('Hub: opening the tab loads care-library.js and mounts it', "activeTab==='carelibrary'" in HUB and 'care-library.js?v=' in HUB and "CLIB.mount('clib_box')" in HUB)
for s, n, d in R: print(s, n, ('\n     ' + d) if d else '')
bad = [x for x in R if x[0] == 'FAIL']; print(f"\n{len(R) - len(bad)}/{len(R)} passed"); sys.exit(1 if bad else 0)

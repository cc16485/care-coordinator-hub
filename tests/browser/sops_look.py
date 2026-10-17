"""SOPs set up by the moment in our work (Samantha's yes, 2026-10-17). Offline: the Hub's SOPs panels and their script are
lifted out of index.html with the save calls faked. The owner sees the first two drafts, adds them, reads one (steps,
where, why labelled State rule / Our procedure / Our choice with the source), publishes it; a coordinator never sees a
draft; the Missouri / Oklahoma filter; a State rule cannot be saved without its source; Client Folders and Payors &
Programs open INSIDE the Hub with their own header and tab row hidden, so nothing jumps.
python3 tests/browser/sops_look.py [screenshot dir]"""
import sys, os, re, threading, http.server, functools
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp'
R = []
def ok(n, c, d=''): R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:500]))
HUB = open(os.path.join(ROOT, 'index.html')).read()
CSS = '\n'.join(re.findall(r'<style[^>]*>(.*?)</style>', HUB, re.S))
a = HUB.index('<section class="tabpanel" id="tab-sops">'); b = HUB.index('</section>', HUB.index('id="tab-sopref"')) + 10
PANELS = HUB[a:b].replace('class="tabpanel"', 'class="tabpanel on" style="display:block"')
s0 = HUB.index('/* ── PAGES SHOWN INSIDE THE HUB'); s1 = HUB.index('\n})();\n', HUB.index('/* ── SOP LIBRARY ──')) + 6
JS = HUB[s0:s1]
ok('the SOPs row is Procedures, Payors & Programs, Scripts, all inside the Hub', re.search(r'id="fsub-sops">[\s\S]*?</div>\s*\n\s*<!-- Third', HUB) is not None
   and "switchTab('sopref')" in HUB and "location.href='programs.html'" not in HUB and "location.href='client-folders.html'" not in HUB)
ok('Scripts links open Payors & Programs inside the Hub', 'href="programs.html' not in HUB and "ccOpenRef('private')" in HUB)
ok('no em dashes in the two first drafts', '—' not in JS[JS.index('const STARTERS'):JS.index('let openId')])
page = '''<!doctype html><meta charset="utf-8"><style>''' + CSS + '''</style><body><main>''' + PANELS + '''</main><script>
window.DATA = { sop_library: [ { id:'old1', title:'Corrective Action', body:'# Corrective action\\n\\nOld **markdown** doc.', updated_at:'2026-07-16' } ] };
window.CONFIG = { escalation_protocol:'' }; window.ME = { name:'Samantha Troutman', email:'samantha@mo-care.com' };
window.OWNER = true; window.ccCan = p => p === 'manage_settings' && window.OWNER;
window.SAVED = []; window.persist = async (k, it) => { SAVED.push([k, JSON.parse(JSON.stringify(it))]); };
window.removeItem = async (k, id) => { SAVED.push(['rm', k, id]); };
window.ccConfirm = async () => true; window.alert = m => { window.ALERTED = m; };
window.sb = { from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { data: {} } }) }) }) }) };
window.TAB = null; window.switchTab = t => { TAB = t; };
</script><script>''' + JS + '''</script></body>'''
open(os.path.join(ROOT, '_sops_test.html'), 'w').write(page)
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Q, directory=ROOT)); threading.Thread(target=srv.serve_forever, daemon=True).start()
B = f'http://127.0.0.1:{srv.server_address[1]}'
try:
  with sync_playwright() as pw:
    br = pw.chromium.launch(); errs = []
    pg = br.new_page(viewport={'width': 1280, 'height': 1000}); pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.route('https://cdn.jsdelivr.net/**', lambda r: r.fulfill(status=200, content_type='application/javascript',
      body='window.supabase={createClient:function(){return{auth:{getSession:function(){return Promise.resolve({data:{session:null}})},signInWithPassword:function(){}}}}};'))
    pg.goto(B + '/_sops_test.html'); pg.evaluate('sopRender()'); t = pg.inner_text('#sop-index')
    ok('owner: grouped by moment, with the first ten still to write', all(x in t for x in ('ENDING CARE', 'ONGOING CARE', 'NEW LEAD', 'Still to write: First call with a new lead')), t[:900])
    ok('owner: the two first drafts are offered for review', '2 first drafts ready for you to review' in t and "A caregiver didn't clock in or out" in t, t[:600])
    ok('Client Folders sits under Assessment and start of care, the old document under Other documents',
       t.index('ASSESSMENT AND START OF CARE') < t.index('Put together a client folder') and t.index('OTHER DOCUMENTS') < t.index('Corrective Action'), t)
    pg.screenshot(path=os.path.join(OUT, 'sops_1_owner_index.png'), full_page=True)
    pg.click('text=Add them as drafts'); pg.wait_for_timeout(200)
    sv = pg.evaluate('SAVED')
    ok('adding saves exactly two drafts to sop_library', [s[0] for s in sv] == ['sop_library'] * 2 and all(s[1]['status'] == 'draft' for s in sv) and {s[1]['id'] for s in sv} == {'sop_no_clock', 'sop_ihs_end'}, sv)
    t = pg.inner_text('#sop-index')
    ok('...the offer goes away and they show as Draft, no longer on the still-to-write line', 'ready for you to review' not in t and t.count('Draft') == 2 and "Still to write: A caregiver didn't" not in t, t[:900])
    pg.click("text=Moving IHS/ADW clients to Caring CDS before Nov 16"); pg.wait_for_timeout(150); v = pg.inner_text('#sop-viewer')
    ok('the card: when, who, steps, where, done when, escalate if', all(x in v for x in ('When this happens:', 'Owner: Samantha', 'Backup: Krystal', 'STEPS', 'By October 26', 'WHERE YOU DO IT', 'DONE WHEN', 'ESCALATE IF')), v[:900])
    ok('the why is labelled, with the state rule\'s source and the date it was checked', 'State rule' in v and '19 CSR 15-7.021(16)(D) · checked 2026-10-15' in v and 'Our choice' in v and 'Our procedure' in v, v[-900:])
    ok('the source opens the rule itself', pg.get_attribute('#sop-viewer a[href*="19c15-7.pdf"]', 'target') == '_blank')
    ok('owner: the draft can be published from the card', pg.is_visible('#sop-publish-btn'))
    pg.screenshot(path=os.path.join(OUT, 'sops_2_card.png'), full_page=True)
    pg.click('#sop-publish-btn'); pg.wait_for_timeout(200); last = pg.evaluate('SAVED[SAVED.length-1]')
    ok('Publish saves it published, with who reviewed it', last[1]['status'] == 'published' and last[1]['reviewed_by'] == 'Samantha Troutman' and not pg.is_visible('#sop-publish-btn'), last)
    # a State rule without a source is refused
    pg.evaluate('sopNewDoc()'); pg.fill('#sop-ed-title', 'Test'); pg.fill('#sop-ed-steps', 'One'); pg.select_option('#sop-ed-why .w-kind', 'state'); pg.fill('#sop-ed-why .w-text', 'A rule')
    n = len(pg.evaluate('SAVED')); pg.click('text=Save and publish ✓'); pg.wait_for_timeout(150)
    ok('a State rule cannot be saved without its source', len(pg.evaluate('SAVED')) == n and 'needs its source' in (pg.evaluate('window.ALERTED') or ''))
    pg.screenshot(path=os.path.join(OUT, 'sops_3_editor.png'), full_page=True)
    pg.click('text=Cancel')
    # a coordinator
    pg.evaluate('OWNER = false; sopRender()'); t = pg.inner_text('#sop-index')
    ok('coordinator: sees the published one, never a draft, no still-to-write list, no add button',
       'Moving IHS/ADW' in t and "didn't clock in or out" not in t and 'Still to write' not in t and not pg.is_visible('#sop-add-btn'), t[:700])
    pg.evaluate('DATA.sop_library.push({id:"ok1",title:"Oklahoma only",state:"OK",moment:"office",steps:["x"],status:"published"}); sopState("MO")')
    t = pg.inner_text('#sop-doc-list'); ok('Missouri filter hides an Oklahoma-only procedure', 'Oklahoma only' not in t and 'Moving IHS/ADW' in t, t[:400])
    pg.evaluate('sopState("OK")'); t = pg.inner_text('#sop-doc-list'); ok('Oklahoma filter shows it, and hides Missouri ones', 'Oklahoma only' in t and 'Moving IHS/ADW' not in t, t[:400])
    pg.evaluate('sopState("all")')
    # Client Folders inside the Hub
    pg.click('text=Put together a client folder'); pg.wait_for_timeout(1200)
    fr = pg.frame_locator('#sop-viewer-page')
    ok('Client Folders opens inside the procedures, its own header hidden', pg.is_visible('#sop-viewer-page') and not fr.locator('header').is_visible() and fr.locator('text=Open the Wellness folder').is_visible())
    h = pg.evaluate('document.getElementById("sop-viewer-page").getBoundingClientRect().height')
    ok('...sized to the page, not a box with its own scroll bar', h > 1500, h)
    pg.screenshot(path=os.path.join(OUT, 'sops_4_folders_inside.png'))
    # Payors & Programs inside the Hub
    pg.evaluate('sopCloseDoc(); document.getElementById("tab-sops").style.display="none"; ccOpenRef("cds")'); pg.wait_for_timeout(1200)
    fr2 = pg.frame_locator('#sopRefFrame')
    ok('Payors & Programs opens inside the Hub at the program asked for', pg.evaluate('TAB') == 'sopref' and 'programs.html?in=hub' in pg.get_attribute('#sopRefFrame', 'src'))
    ok('...with its own header and tab row hidden (the Hub keeps its own)', fr2.locator('html.inhub').count() == 1 and not fr2.locator('header').is_visible() and not fr2.locator('.hubtabs').is_visible())
    ok('no page errors', not errs, errs)
    br.close()
  # the pages on their own are unchanged
  with sync_playwright() as pw:
    br = pw.chromium.launch(); pg = br.new_page(viewport={'width': 1280, 'height': 900}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.goto(B + '/client-folders.html'); ok('Client Folders on its own still shows its header', pg.is_visible('header'))
    pg.goto(B + '/index.html'); pg.wait_for_timeout(800); ok('the Hub page loads without errors', not [e for e in errs if 'supabase' not in e.lower()], errs)
    br.close()
finally:
  srv.shutdown()
  try: os.remove(os.path.join(ROOT, '_sops_test.html'))
  except OSError: pass
bad = [r for r in R if r[0] == 'FAIL']
for r in R: print(r[0], r[1] + ('\n     ' + r[2] if r[2] else ''))
print(f'\n{len(R) - len(bad)}/{len(R)} passed'); sys.exit(1 if bad else 0)

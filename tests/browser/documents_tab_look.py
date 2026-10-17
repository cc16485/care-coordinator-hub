"""Documents inside SOPs (2026-10-17: first its own top tab, her "documents to be their own tab so its not burried and hard
to find"; then the same day her "i want it inside SOPs"): Forms & Templates (forms.html) and Client Folders (client-folders.html) open INSIDE the Hub with ?in=hub, like
Payors & Programs. Offline, with the Gate 1a harness (every Supabase call answered locally). Checks: the tab sits right
after SOPs; its row has the two buttons; each opens its page in a frame inside the Hub (own header hidden); the library's
"Open Client Folders" moves the Hub to the Client Folders tab; ccOpenDocs('GUIDE') opens it filtered; #documents and
#client-folders addresses work; the GUIDE page's Documents button (inside Payors & Programs) moves the Hub to Documents
filtered to GUIDE; Client Folders is still a procedure; and every other top-level tab still opens its own row.
(python3 tests/browser/documents_tab_look.py, with a static server on PORT, default 8765, serving the repo root)"""
import os
from playwright.sync_api import sync_playwright
PORT = os.environ.get('PORT', '8765')
H = open('/Users/samantha/Claude/Projects/cc-hub-live/.claude/g1a_harness.js').read()
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const until=async(f,ms=6000)=>{ const t=Date.now(); while(Date.now()-t<ms){ try{ if(f()) return true; }catch(e){} await sleep(100); } return false; };
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; await sleep(400);
  (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha Troutman' };"); CC_ROLES=['owner_admin']; CC_ROLES_CHECKED=true;

  const tops=[...document.querySelectorAll('.ftab')].map(t=>t.dataset.g);
  ok('there is no separate Documents tab in the top row any more', !tops.includes('docs') && !document.getElementById('fsub-docs'), tops);

  document.querySelector('.ftab[data-g="sops"]').click(); await sleep(300);
  const row=document.getElementById('fsub-sops'), pills=[...row.querySelectorAll('.fpill')].map(p=>p.textContent.trim());
  ok('SOPs row: Procedures, Payors & Programs, Forms & Templates, Client Folders, Order Supplies (no Scripts)',
     JSON.stringify(pills)==='["Procedures","Payors & Programs","Forms & Templates","Client Folders","Order Supplies"]', pills);
  ok('Scripts still opens from its old address (#playbook), content kept', document.getElementById('tab-playbook') && CC_GROUPS.sops.includes('playbook'));
  [...row.querySelectorAll('.fpill')].find(p=>/Forms & Templates/.test(p.textContent)).click(); await sleep(300);
  ok('Forms & Templates is first and opens inside the Hub', activeTab==='docs' && /forms\.html\?in=hub$/.test(document.getElementById('docsFrame').src), [activeTab, document.getElementById('docsFrame').src]);
  const f1=document.getElementById('docsFrame');
  ok('the library page loads in the frame with its own header hidden', await until(()=>f1.contentDocument && f1.contentDocument.documentElement.classList.contains('inhub') && getComputedStyle(f1.contentDocument.querySelector('header')).display==='none'));
  ok('the section title says Forms & Templates', /Forms &(amp;)? Templates/.test(CC_SECTION_TITLES.docs));

  // the library's own link to Client Folders moves the Hub to the next tab
  await until(()=>f1.contentDocument.getElementById('toFolders'));
  f1.contentDocument.getElementById('toFolders').click(); await sleep(400);
  const f2=document.getElementById('docFoldersFrame');
  ok('"Open Client Folders" moves the Hub to the Client Folders tab', activeTab==='docfolders' && /client-folders\.html\?in=hub$/.test(f2.src) && /forms\.html/.test(f1.src), [activeTab, f2.src, f1.src]);
  ok('Client Folders loads inside the Hub', await until(()=>f2.contentDocument && f2.contentDocument.documentElement.classList.contains('inhub')));
  ok('SOPs stays lit on Client Folders', document.querySelector('.ftab[data-g="sops"]').classList.contains('active') || document.querySelector('.ftab[data-g="sops"]').classList.contains('on'));
  ok('...and on Forms & Templates', (switchTab('docs'), ccGroupOf('docs')==='sops'));

  ccOpenDocs('GUIDE'); await sleep(300);
  ok('ccOpenDocs(\'GUIDE\') opens the library filtered to GUIDE', activeTab==='docs' && /forms\.html\?in=hub&cat=GUIDE$/.test(f1.src), f1.src);
  switchTab('today'); await sleep(150); switchTab('docs'); await sleep(200);
  ok('coming back to Documents keeps where you were', /cat=GUIDE/.test(f1.src), f1.src);

  switchTab('today'); location.hash='#documents'; await sleep(400);
  ok('#documents opens Forms & Templates', activeTab==='docs', activeTab);
  switchTab('today'); location.hash='#client-folders'; await sleep(400);
  ok('#client-folders opens Client Folders', activeTab==='docfolders', activeTab);

  // GUIDE inside Payors & Programs: its Documents button moves the Hub to Documents, filtered to GUIDE
  switchTab('sopref'); await sleep(200);
  const sf=document.getElementById('sopRefFrame'); ccHubFrame(sf, 'guide.html?in=hub');
  await until(()=>sf.contentDocument && sf.contentDocument.querySelector('nav button[data-s="docs"]') && sf.contentDocument.documentElement.classList.contains('inhub'));
  sf.contentDocument.querySelector('nav button[data-s="docs"]').click(); await sleep(400);
  ok('GUIDE\'s Documents button moves the Hub to Documents, filtered to GUIDE', activeTab==='docs' && /cat=GUIDE/.test(f1.src), [activeTab, f1.src]);

  // Client Folders is still a procedure
  ok('Client Folders is still listed under Procedures', document.documentElement.innerHTML.includes("page:'client-folders.html'"));

  // every top-level tab is still wired: a top button, a row (when it has one), and a panel for each of its tabs
  const wiring=[];
  for(const g of Object.keys(CC_GROUPS)){
    if(!document.querySelector('.ftab[data-g="'+g+'"]') && g!=='settings') wiring.push(g+': no top button');
    for(const t of CC_GROUPS[g]) if(!document.getElementById('tab-'+t)) wiring.push(t+': no panel');
  }
  ok('every top-level tab is still wired (button, row, panels)', !wiring.length, wiring);
  // ...and still opens. Client Care is left out of the live click: this offline harness has no data for it, and it
  // never finishes opening here on main either (checked 2026-10-17), so it is covered by the wiring check above.
  const bad=[];
  for(const g of Object.keys(CC_GROUPS)){
    if(g==='settings' || g==='clients') continue;
    ccGroupClick(g); await sleep(120);
    const sb=document.getElementById('fsub-'+g);
    if(!CC_GROUPS[g].includes(activeTab) || (sb && !sb.classList.contains('on'))) bad.push([g, activeTab]);
  }
  ok('every other top-level tab still opens', !bad.length, bad);
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1400, 'height': 1100})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(f'http://localhost:{PORT}/index.html?proof=docs'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', H)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    pg.evaluate("()=>{ switchTab('docs'); window.scrollTo(0,0); }"); pg.wait_for_timeout(600)
    pg.screenshot(path=os.environ.get('SHOT', '/tmp/documents-tab.png'))
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

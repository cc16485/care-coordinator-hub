"""A calmer profile top (Samantha 2026-10-15). The real Hub page, offline, with made-up TEST people: above the tabs only the
header, one line and the one next step; Pause/End care, the review ask and the journey links in More; the path on Start of
Care; an active AxisCare client whose journey still sits at intake shows no intake step. The journey and care services are
the stand-ins from client_journey_look.py and client_care_look.py.
(python3 tests/browser/profile_top_look.py, static server on 8817 from the repo root)"""
import os
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
ns = {'__file__': os.path.join(HERE, 'client_care_look.py')}; exec(open(os.path.join(HERE, 'client_care_look.py')).read().split('\nwith sync_playwright() as pw:')[0], ns)
STUB, DATA, FAKE = ns['STUB'], ns['DATA'], ns['FAKE']
REVIEW = r"""
(()=>{ const W=window, of=W.fetch;
  W.fetch=async(u,o)=>{ if(/review-moments/.test(String(u))) return new Response(JSON.stringify({ can_suggest:true, live:true, history:[], current:null }),{ status:200 }); return of(u,o); };
})();
"""
T = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,800)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  DATA.ops_settings.client_journey_live=true; window.__as('angie@mo-care.com','Angie Care');
  DATA.leads.push({ id:'R3', client_first_name:'Rhoda', client_last_name:'Real (TEST)', first_name:'Ann', last_name:'Real', funding_source:'private', status:'Contacted', axiscare_client_id:'777', assigned_coordinator:'angie@mo-care.com', created_at:'2026-10-01' });
  await cjCall({ action:'open', lead_id:'R3' }); await cjCall({ action:'open', lead_id:'T1' });
  const $=id=>document.getElementById(id), vis=el=>!!el&&el.offsetParent!==null&&getComputedStyle(el).display!=='none';
  const above=()=>{ const v=$('leadProfileView'), tabs=$('cpTabs'); return [...v.querySelectorAll('*')].filter(el=>(el.compareDocumentPosition(tabs)&Node.DOCUMENT_POSITION_FOLLOWING)&&!tabs.contains(el)); };
  const menuText=()=>[...$('cpTopMenu').querySelectorAll('.pt-item')].map(b=>b.textContent.trim());
  /* 1. an active AxisCare client whose journey is still at intake (the Dan case) */
  await openLeadProfile('R3','summary'); await sleep(900);
  ok('active client: the Pause/End block is not above the tabs', !vis($('ccCare')), $('ccCare').innerText);
  ok('active client: no intake next step above the tabs', ![...$('cjHead').querySelectorAll('.cj-next')].some(vis), $('cjHead').innerText);
  ok('the path is not above the tabs (it is on Start of Care)', !above().some(el=>el.id==='cpPath') && !!$('cpPath').closest('[data-cp-pane="start"]'));
  ok('no Google review box when there is nothing to ask', !vis($('ccReview')));
  ok('the tiles and links are not above the tabs', !above().some(el=>el.id==='cjFacts'||el.classList&&el.classList.contains('cj-every')));
  ok('More holds Pause care, End care, the review ask and See every step', ['Pause care','End care','Ask for a Google review'].every(t=>menuText().includes(t)) && menuText().some(t=>/^See every step/.test(t)) && vis($('cpTopMoreBtn')), menuText());
  window.scrollTo(0,0); await window.shot('active');
  $('cpTopMoreBtn').click(); await sleep(150);
  ok('More opens a menu', vis($('cpTopMenu')) && $('cpTopMoreBtn').getAttribute('aria-expanded')==='true');
  await window.shot('menu');
  const pb=[...$('cpTopMenu').querySelectorAll('.pt-item')].find(b=>b.textContent.trim()==='Pause care'); if(pb) pb.click(); await sleep(250);
  ok('Pause care from More opens the same Pause care form, and the menu closes', !!document.querySelector('.cc-dlg #ccR') && !vis($('cpTopMenu')));
  const x=document.querySelector('.cc-dlg [data-close],.cc-dlg .cc-x'); if(x) x.click(); else document.querySelector('.cc-dlg')&&document.querySelector('.cc-dlg').remove();
  cpShowTab('start'); await sleep(250);
  ok('Start of Care says why the intake steps are hidden; the stage bar is hidden', /receiving care, so the intake steps are not shown/.test($('cpStartNote').innerText) && !vis($('cpPath')), $('cpStartNote').innerText);
  cpShowTab('summary'); await sleep(250);
  ok('the tiles are on the Overview', !!$('cjFacts') && !!$('cjFacts').closest('[data-cp-pane="summary"]'));
  /* 2. paused: the block has news in it, so it shows */
  window.__care.state['777']='paused'; window.__care.pause={ paused_from:'2026-10-13', followup_date:'2026-10-20', reason:'hospital' };
  await openLeadProfile('R3','summary'); await sleep(900);
  ok('a paused client: the care block shows (since when, follow-up, Resume care)', vis($('ccCare')) && /Paused/.test($('ccCare').innerText) && /Resume care/.test($('ccCare').innerText) && !menuText().includes('Pause care'), $('ccCare').innerText);
  /* 3. a lead with no AxisCare client: the next step stays, the links go to More */
  await openLeadProfile('T1','start'); await sleep(900);
  ok('a lead: the one next step stays above the tabs', [...$('cjHead').querySelectorAll('.cj-next')].some(vis), $('cjHead').innerText);
  ok('a lead: its links are in More, not above the tabs', menuText().some(t=>/^See every step/.test(t)) && menuText().includes('Edit intake form') && menuText().includes('Show the older lead card') && !menuText().includes('More…') && !above().some(el=>el.classList&&el.classList.contains('cj-every')), menuText());
  ok('a lead: no Pause/End or review lines in More', !menuText().includes('Pause care') && !menuText().includes('Ask for a Google review'));
  ok('a lead: the path and tracks show on Start of Care, no note', [...$('cpPath').querySelectorAll('.cj-path-tracks')].some(vis) && !$('cpStartNote').innerText.trim());
  window.scrollTo(0,0); await window.shot('lead');
  ok('switching profiles never leaves the last person\'s links behind', menuText().filter(t=>/^See every step/.test(t)).length===1, menuText());
  return R; }"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1280, 'height': 1000}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    pg.goto('http://localhost:8817/index.html?proof=pt'); pg.wait_for_timeout(1500)
    for s in (STUB, DATA, FAKE, REVIEW): pg.evaluate('s=>(0,eval)(s)', s)
    pg.evaluate("()=>{ window.shot=async()=>{}; }")
    R = pg.evaluate(T)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', ' | '.join(errs[:3])]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

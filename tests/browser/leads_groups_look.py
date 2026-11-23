"""The simpler Leads page (leads-groups.js, 2026-11-23, her approved mockup 1nPX3KE4umygkdu3VEtoHW v3): the Hot / Warm / Cold board
(the Hub places each family, drag or click to move, a person's move sticks), the same families as a step chart with every call
and text, the Not families? box, the switch in Settings, and the lead page (4 tabs, Next box with Hot / Warm / Cold, notes,
people, who referred). The real page, offline, made-up people only, served from disk.
(python3 tests/browser/leads_groups_look.py; LG_SHOTS=<folder> saves screenshots too)"""
import os, re, mimetypes
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SHOTS = os.environ.get('LG_SHOTS', '')
# the same made-up families and stubs as the Leads table check
STUB = re.search(r'STUB = r"""(.*?)"""', open(os.path.join(os.path.dirname(__file__), 'lead_table_look.py')).read(), re.S).group(1)
EXTRA = r"""
(()=>{
  DATA.leads.splice(6);   /* the six families, not the 22 fillers */
  DATA.leads[1].ghl_contact_id='abcDEF123';
  const ago=ms=>new Date(Date.now()-ms).toISOString();
  DATA.leads.push({ id:'S1', first_name:'Jason', last_name:'Sales', phone:'2675550101', email:'jason@datalabs-example.com', source:'Website', status:'New', created_at:ago(4*864e5),
    why_called:'We help agencies with data.', contact_events:[{ at:ago(4*864e5), channel:'web', direction:'in', actor:'family', outcome:'inquiry' }] });
  DATA.leads[0].contact_events.push({ at:ago(60e3), channel:'sms', direction:'out', actor:'automation', outcome:'sent' });
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, $=id=>document.getElementById(id), txt=id=>(($(id)||{}).textContent||'');
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  try{ localStorage.removeItem('lgPreview'); localStorage.removeItem('lgView'); }catch(e){}
  switchTab('leadsstarts'); await sleep(200); renderLeadsStarts(); await sleep(200);
  ok('off · today\'s list, an owner sees "Preview the simpler Leads list"', /Preview the simpler Leads list/.test(txt('lbNumbers')) && !document.querySelector('#lgCard'));
  ok('off · the calmer and cleaner preview links are gone', !/Preview the calmer|Preview the cleaner|Preview the new Leads list/.test(txt('lbNumbers')), txt('lbNumbers'));
  lgPreview(true); await sleep(250);
  const col=k=>[...document.querySelectorAll('[data-lg-col="'+k+'"] [data-lg-id]')].map(c=>c.dataset.lgId);
  ok('board · three columns, Hot Warm Cold', document.querySelectorAll('#lgCard [data-lg-col]').length===3, txt('lbBoard').slice(0,300));
  const all=col('hot').concat(col('warm'),col('cold'));
  ok('board · the six families are each in one column', all.length===6 && ['L1','L2','L3','L4','L5','L6'].every(id=>all.indexOf(id)>-1), [col('hot'),col('warm'),col('cold')]);
  ok('board · a booked home visit (L4) and a visit done (L5) are Hot', col('hot').indexOf('L4')>-1 && col('hot').indexOf('L5')>-1, col('hot'));
  ok('board · each card says why the Hub put it there', /Hub: home visit booked/.test(txt('lbBoard')) && /Hub: home visit done/.test(txt('lbBoard')));
  ok('board · five step dots on every card', [...document.querySelectorAll('#lgCard .lg-dots')].every(d=>d.querySelectorAll('i').length===5) && document.querySelectorAll('#lgCard .lg-dots').length===6);
  ok('not families · the sales email waits in its own box, off the board', /Not families\? 1 to sort/.test(txt('lbBoard')) && all.indexOf('S1')<0);
  ok('the contact link (L2 has one) says what it shows, never the tool\'s name', !!document.querySelector('[data-lg-id="L2"] a.lg-thread[href*="/contacts/detail/abcDEF123"]') && !/GoHighLevel|GHL/.test(txt('lbBoard')));
  /* click to move */
  const start=col('hot').concat(col('warm')).find(id=>col('cold').indexOf(id)<0 && id==='L3') || col('hot').concat(col('warm'))[0];
  const mv=[...document.querySelectorAll('[data-lg-id="'+start+'"] .lg-move button')].find(b=>b.textContent==='Cold');
  mv.click(); await sleep(300);
  const w=L.writes.filter(x=>x.k==='leads').pop();
  ok('click Cold · saves lead_temp with who moved it', w && w.v.id===start && w.v.lead_temp && w.v.lead_temp.v==='cold' && w.v.lead_temp.by==='sam@mo-care.com', w && w.v.lead_temp);
  ok('click Cold · the card is now in Cold and says it was moved', col('cold').indexOf(start)>-1 && /moved by/i.test((document.querySelector('[data-lg-id="'+start+'"] .lg-pick')||{}).textContent||''));
  /* drag */
  const card=document.querySelector('[data-lg-id="L1"]'), target=document.querySelector('[data-lg-col="cold"]');
  const dt=new DataTransfer();
  card.dispatchEvent(new DragEvent('dragstart',{ bubbles:true, dataTransfer:dt }));
  target.dispatchEvent(new DragEvent('dragover',{ bubbles:true, cancelable:true, dataTransfer:dt }));
  target.dispatchEvent(new DragEvent('drop',{ bubbles:true, cancelable:true, dataTransfer:dt })); await sleep(300);
  ok('drag L1 to Cold · saved and moved', col('cold').indexOf('L1')>-1 && (DATA.leads.find(l=>l.id==='L1').lead_temp||{}).v==='cold', col('cold'));
  /* the card opens the profile */
  document.querySelector('[data-lg-id="L2"] .lg-ctop b').click(); await sleep(100);
  ok('clicking a card opens their profile', L.opened.some(o=>o[0]==='L2'), L.opened);
  /* how they came in, how they heard about us, spam */
  ok('card · says how they came in', /Came in: /.test((document.querySelector('[data-lg-id="L3"]')||{}).textContent||''));
  const ask=document.querySelector('[data-lg-id="L3"] .lg-ask');
  ok('card · prompts "How did they hear about us?" while it is empty', !!ask);
  ask.click(); await sleep(150);
  const opt=[...document.querySelectorAll('.ccpop [data-k]')].find(b=>b.dataset.k==='friend'); if(opt) opt.click(); await sleep(300);
  ok('one tap saves how they heard, with who', (DATA.leads.find(l=>l.id==='L3')||{}).heard_about==='friend' && DATA.leads.find(l=>l.id==='L3').heard_about_by==='sam@mo-care.com');
  ok('card · then shows it instead of the prompt', /Heard about us: A friend or family member/.test((document.querySelector('[data-lg-id="L3"]')||{}).textContent||'') && !document.querySelector('[data-lg-id="L3"] .lg-ask'));
  ok('card · a Spam button on every card', document.querySelectorAll('#lgCard [data-lg-id] .lg-spam').length===6);
  /* chart */
  lgView('chart'); await sleep(250);
  const heads=[...document.querySelectorAll('#lgCard .lg-table th')].map(t=>t.textContent);
  ok('chart · columns: Family, Hot / Warm / Cold, Every call & text, then the five steps', heads.join('|')==='Family|Hot / Warm / Cold|Every call & text|First call|Talked|Home visit|Care plan & agreement|Yes', heads);
  ok('chart · every call and text, theirs in their own colour', document.querySelectorAll('#lgCard .lg-touch').length>=6 && !!document.querySelector('#lgCard .lg-tc-in') && !!document.querySelector('#lgCard .lg-tc-auto'));
  ok('chart · done steps show ✓ and a day', document.querySelectorAll('#lgCard .lg-done').length>=8);
  const trow=[...document.querySelectorAll('#lgCard tbody tr')].find(r=>r.dataset.openLead==='L6');
  [...trow.querySelectorAll('.lg-tpick button')].find(b=>b.textContent==='Hot').click(); await sleep(300);
  ok('chart · click Hot on a row moves it', (DATA.leads.find(l=>l.id==='L6').lead_temp||{}).v==='hot');
  ok('chart · Board / Chart remembered', localStorage.getItem('lgView')==='chart');
  lgView('board'); await sleep(200);
  /* the switch */
  switchTab('settings'); await sleep(150); try{ lgSetFill(); }catch(e){}
  ok('settings · one "Simpler Leads list" switch; the calmer and cleaner switches are gone', !!$('lgToggleBtn') && !$('ltcToggleBtn') && !$('ltsToggleBtn'));
  await lgToggle($('lgToggleBtn')); await sleep(200);
  ok('settings · turning it on saves leads_groups_live with a since', DATA.ops_settings.leads_groups_live===true && !!DATA.ops_settings.leads_groups_live_since);
  localStorage.removeItem('lgPreview'); switchTab('leadsstarts'); await sleep(150); renderLeadsStarts(); await sleep(200);
  ok('on · everyone sees the board, no preview bar', !!document.querySelector('#lgCard') && !/Preview of the simpler/.test(txt('lbNumbers')));
  /* the lead page */
  L.writes.length=0;
  window.__realOpen('L3','summary'); await sleep(900);
  const vis=[...document.querySelectorAll('#cpTabs .cp-tab')].filter(b=>getComputedStyle(b).display!=='none').map(b=>b.textContent.trim());
  ok('lead page · 4 tabs: Overview, Calls & texts, Care details, Payer', vis.join('|')==='Overview|Calls & texts|Care details|Payer', vis);
  ok('lead page · the Next box says Next and the Hot / Warm / Cold with move links', /Next · /.test(txt('lwHost')) && /(Hot|Warm|Cold)/.test(txt('lwHost')) && /move to/.test(txt('lwHost')));
  ok('lead page · What we know once (the Basics card), no Coming up card', !/What we know/.test(txt('lwHost')) && !/Coming up/.test(txt('lwHost')), txt('lwHost').slice(0,200));
  ok('lead page · Notes, People, Who referred them', !!$('lwqNote') && /People/.test(txt('lwQuick')) && /Who referred them/.test(txt('lwQuick')));
  $('lwqNote').value='Ruth prefers mornings'; await lwqNote(); await sleep(200);
  const wn=L.writes.filter(x=>x.k==='leads').pop();
  ok('lead page · Save note writes a note with who wrote it', wn && (wn.v.comm_log||[]).some(c=>c.kind==='note'&&c.body==='Ruth prefers mornings'&&c.by==='sam@mo-care.com'));
  lwqOpen('ref'); await sleep(100); $('lwqRName').value='Dr. Gray'; $('lwqRPhone').value='4175550199'; await lwqRef(); await sleep(200);
  ok('lead page · how they came in, the heard-about choices and Mark as spam', /How they came in/.test(txt('lwQuick')) && document.querySelectorAll('#lwQuick .lwq-heard .lb-btn').length===7 && /Mark as spam/.test(txt('lwQuick')));
  ok('lead page · the one they picked is lit', !!document.querySelector('#lwQuick .lwq-heard .lb-btn-primary') && /friend/i.test(document.querySelector('#lwQuick .lwq-heard .lb-btn-primary').textContent));
  ok('lead page · who referred them saves on the lead', (DATA.leads.find(l=>l.id==='L3').referrer||{}).name==='Dr. Gray' && /Dr\. Gray/.test(txt('lwQuick')));
  return R;
}
"""
def serve(route):
    path = route.request.url.split('://', 1)[1].split('/', 1)[1].split('?')[0] or 'index.html'
    f = os.path.join(ROOT, path)
    if os.path.isfile(f):
        route.fulfill(path=f, content_type=mimetypes.guess_type(f)[0] or 'application/octet-stream')
    else:
        route.fulfill(status=404, body='')
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1360, 'height': 1000})
    pg.route('**/*', lambda r: serve(r) if r.request.url.startswith('http://hub.test/') else (r.abort() if 'supabase.co' in r.request.url else r.continue_()))
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://hub.test/index.html?proof=leadgroups'); pg.wait_for_timeout(1500)
    pg.evaluate("()=>{ window.__realOpen=openLeadProfile; }")
    pg.evaluate('s=>(0,eval)(s)', STUB); pg.evaluate('s=>(0,eval)(s)', EXTRA)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True)
        for name, js in [('1-board', "localStorage.setItem('lgView','board'); switchTab('leadsstarts'); renderLeadsStarts();"), ('2-chart', "lgView('chart');"), ('3-lead-page', "lgView('board'); window.__realOpen('L2','summary');")]:
            pg.evaluate('s=>(0,eval)(s)', js); pg.wait_for_timeout(900)
            pg.evaluate("()=>{ const e=document.getElementById('lgCard')||document.getElementById('lwHost'); if(e) e.scrollIntoView(); window.scrollBy(0,-120); }"); pg.wait_for_timeout(200)
            pg.screenshot(path=os.path.join(SHOTS, name + '.png'), full_page=False)
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

"""How-to for care coordinators (2026-11-13, her ask: "a very clear how to for telling care coordinators what to do ...
in their own tab and sub tabs in the operations board"). The real Hub page, offline, with the Team Work test's made-up
people. Checks: a coordinator sees the How-to pill on the Operations Board row; it opens on Your day; every one of the
seven sub tabs draws its cards; every link in every card goes to a page that exists; a published procedure is listed
under its sub tab and opens in SOPs > Procedures, a draft is not listed; #howto routes; no em dash anywhere; nothing is
sent. (python3 tests/browser/howto_look.py; SHOTS=<dir>)"""
import os, sys, pathlib, re
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = os.environ.get('SHOTS')
src = (ROOT / 'tests/browser/team_work_look.py').read_text()
STUB = re.search(r'STUB = r"""(.*?)"""', src, re.S).group(1)
EXTRA = r"""
(()=>{
  DATA.ops_settings={ team_work_live:true };
  DATA.sop_library=[
    { id:'sop_fall_test', title:'A fall, injury or hospital stay', moment:'wrong', status:'published', steps:['Made-up step'], state:'MO' },
    { id:'sop_draft_test', title:'A draft nobody should see yet', moment:'wrong', status:'draft', steps:['x'] },
    { id:'sop_first_call', title:'First call with a new lead', moment:'lead', status:'published', steps:['Made-up step'] } ];
  window.__alerts=[]; window.alert=m=>window.__alerts.push(String(m)); window.confirm=()=>true;
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, $=id=>document.getElementById(id);
  const as=(e,n)=>(0,eval)("ME={ email:'"+e+"', name:'"+n+"', shift:'day' };");
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  try{ localStorage.removeItem('cch_howto_view'); }catch(e){}

  as('krystal@mo-care.com','Krystal Land');
  switchTab('mywork'); await sleep(200);
  const row=()=>[...document.querySelectorAll('#fsub2 .fpill2')].map(p=>p.textContent.trim());
  ok('the Operations Board row has a How-to pill for a coordinator', row().includes('How-to'), row());
  ok('the first pill on the row is still the board itself', (0,eval)('CC_SUBTABS.myworkgrp[0].t')==='mywork');
  document.querySelector('#fsub2 [data-tab="howto"]').click(); await sleep(200);
  ok('the pill opens the How-to page', (0,eval)('activeTab')==='howto' && $('tab-howto').classList.contains('active'), (0,eval)('activeTab'));
  ok('the Operations Board pill on the Today row stays lit', !!document.querySelector('.fpill[data-parent="myworkgrp"].active'));
  const page=()=>$('htWrap').innerText;
  ok('it opens on Your day', HT.view()==='day' && /When your shift starts/.test(page()) && /End my shift/.test($('htWrap').textContent), page().slice(0,200));
  ok('seven sub tabs', [...document.querySelectorAll('#htPills .ht-pill')].map(b=>b.textContent).join('|')==='Your day|New families|Scheduling|Clients|Caregivers|When something goes wrong|Programs', [...document.querySelectorAll('#htPills .ht-pill')].map(b=>b.textContent));
  ok('the first card is open, the others are closed', document.querySelectorAll('#htCards details[open]').length===1 && document.querySelectorAll('#htCards details').length>=5);

  /* every sub tab draws, and every link goes somewhere real */
  const bad=[]; let cards=0;
  for(const [k,label] of HT.VIEWS){
    document.querySelector('#htPills [data-ht="'+k+'"]').click(); await sleep(60);
    const n=document.querySelectorAll('#htCards details').length; cards+=n;
    if(!n || HT.view()!==k) bad.push('no cards on '+label);
    if(!document.querySelector('#htPills .ht-pill.on') || document.querySelector('#htPills .ht-pill.on').textContent!==label) bad.push('pill not lit on '+label);
    for(const a of $('htWrap').querySelectorAll('a[onclick]')){
      const oc=a.getAttribute('onclick'); let m;
      if((m=/switchTab\('([a-z]+)'\)/.exec(oc))){ if(!$('tab-'+m[1])) bad.push(label+': no page '+m[1]); }
      else if((m=/covSubGo\('([a-z]+)'\)/.exec(oc))){ if(!['calloffs','clockins','ongoing','hours'].includes(m[1])) bad.push(label+': no Cara tab '+m[1]); }
      else if(!/HT\.openProcedure/.test(oc)) bad.push(label+': odd link '+oc);
    }
    if(/[—–]/.test(page())) bad.push('a dash on '+label);
    if(/plain (language|English)/i.test(page())) bad.push('"plain language" on '+label);
  }
  ok('every sub tab draws its cards, and every link goes to a real page', !bad.length && cards>=30, [cards,bad]);

  /* the written procedures: published ones listed under their moment, drafts not */
  HT.show('wrong'); await sleep(60);
  ok('a published procedure is listed under When something goes wrong', /Written procedures for this/.test(page()) && /A fall, injury or hospital stay/.test(page()));
  ok('a draft is not listed', !/A draft nobody should see yet/.test(page()));
  HT.show('families'); await sleep(60);
  ok('New families lists its own procedure, not the fall one', /First call with a new lead/.test(page()) && !/A fall, injury or hospital stay/.test(page()));
  HT.show('caregivers'); await sleep(60);
  ok('a sub tab with none published says so', /None published yet/.test(page()));
  HT.show('scheduling'); await sleep(60);
  ok('Scheduling points to the full guide and has no procedures box', /How scheduling works/.test(page()) && !/Written procedures for this/.test(page()));
  HT.show('wrong'); await sleep(60);
  [...$('htWrap').querySelectorAll('a')].find(a=>/A fall, injury/.test(a.textContent)).click(); await sleep(400);
  ok('a procedure opens in SOPs > Procedures', (0,eval)('activeTab')==='sops' && /Made-up step/.test(($('sop-viewer-body')||{}).innerText||''), [(0,eval)('activeTab'), (($('sop-viewer-body')||{}).innerText||'').slice(0,120)]);

  /* her rules are on the page */
  HT.show('wrong'); await sleep(40);
  ok('the fall card says never lift, and names the hotline', /do not lift the client/i.test(page()) && /800-392-0210/.test(page()));
  HT.show('families'); await sleep(40);
  ok('Medicaid callers are pointed to Caring CDS', /417-218-2888/.test(page()) && /caringcds\.com/.test(page()));
  HT.show('scheduling'); await sleep(40);
  ok('never ask someone already working, and unassigning is not a call-off', /working or scheduled at that time/.test(page()) && /is not a call-off/.test(page()));

  /* the link, the memory of the last sub tab, and the other pills */
  switchTab('mywork'); await sleep(100); location.hash='#howto'; await sleep(300);
  ok('#howto opens it', (0,eval)('activeTab')==='howto', (0,eval)('activeTab'));
  ok('it comes back on the sub tab you were last on', HT.view()==='scheduling', HT.view());
  ok('Client Goals is still on the row', row().includes('Client Goals'), row());
  ok('nothing was saved, texted, emailed or called', !(L.writes||[]).length && !(L.fn||[]).some(f=>/sms|text|email|send|call/i.test(String(f))), [L.writes,L.fn]);
  return R;
}
"""
MIME = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.json':'application/json', '.webmanifest':'application/json'}
def serve(route):
    url = route.request.url
    if 'supabase.co' in url: return route.abort()
    if not url.startswith('http://teamwork.local/'): return route.continue_()
    p = (ROOT / url.split('http://teamwork.local/', 1)[1].split('?')[0].split('#')[0])
    if not p.is_file(): return route.fulfill(status=404, body='')
    route.fulfill(status=200, body=p.read_bytes(), content_type=MIME.get(p.suffix, 'application/octet-stream'))
with sync_playwright() as pw:
    b = pw.chromium.launch(); cx = b.new_context(viewport={'width': 1280, 'height': 900}, timezone_id='America/Chicago'); pg = cx.new_page()
    pg.clock.install(time='2026-11-17T11:00:00-06:00'); pg.clock.resume()
    pg.route('**/*', serve)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://teamwork.local/index.html?proof=howto'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB); pg.evaluate('s=>(0,eval)(s)', EXTRA)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True)
        for i, k in enumerate(['day', 'families', 'scheduling', 'clients', 'caregivers', 'wrong', 'programs']):
            pg.evaluate("k=>{ switchTab('howto'); HT.show(k); document.querySelectorAll('#htCards details').forEach(d=>d.open=true); }", k); pg.wait_for_timeout(250)
            pg.screenshot(path=os.path.join(SHOTS, '%d-%s.png' % (i + 1, k)), full_page=True)
        pg.set_viewport_size({'width': 390, 'height': 900}); pg.evaluate("()=>{ HT.show('day'); }"); pg.wait_for_timeout(250)
        pg.screenshot(path=os.path.join(SHOTS, '8-phone.png'), full_page=True)
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

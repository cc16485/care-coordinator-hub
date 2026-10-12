"""Scheduling review step 5 (2026-10-12): "How scheduling works" at the right end of the Scheduling strip, like Applicant
journey: which tab for which problem (links go there), step-by-step guides, the texts word for word from the live
settings (your own words when set), what Cara does on her own and never does, with live On/Off. The old page points here.
Offline; reads only. (python3 tests/browser/schedguide_look.py, with a static server on PORT, default 8765)"""
import os
from playwright.sync_api import sync_playwright
PORT = os.environ.get('PORT', '8765')
H = open('/Users/samantha/Claude/Projects/cc-hub-live/.claude/g1a_harness.js').read()
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; await sleep(500);
  (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha Troutman' };"); CC_ROLES=['owner_admin']; CC_ROLES_CHECKED=true;
  DATA.ops_settings={ coverage_send_live:true, coverage_watch_live:true, timekeeper_watch_live:true, timekeeper_text_live:false, open_hours_live:true, open_hours_ai_live:true, open_hours_ack_live:false, coverage_msg_tier1:'Hi {first_name}, our own words for {client}.', timekeeper_grace_min:7 };
  const pills=[...document.querySelectorAll('#fsub-scheduling .fpill')];
  const last=pills[pills.length-1];
  ok('the guide is the last pill on the Scheduling strip, pushed to the right', /How scheduling works/.test(last.textContent) && last.style.marginLeft==='auto', pills.map(p=>p.textContent.trim()));
  last.click(); await sleep(250);
  const P=document.getElementById('tab-schedguide'), t=P.innerText;
  ok('it opens inside Scheduling with its own title', activeTab==='schedguide' && document.querySelector('.ftab.active,.ftab.on')?.dataset.g==='scheduling' && /How scheduling works/.test(t), [activeTab]);
  ok('which tab for which problem: 10 rows', P.querySelectorAll('table tr').length===10 && /A caregiver calls off/.test(t) && /Client Care: Team Builder/.test(t), P.querySelectorAll('table tr').length);
  [...P.querySelectorAll('table a')].find(a=>/Missed clock-ins/.test(a.textContent)).click(); await sleep(200);
  ok('a row\'s link goes to that tab (Cara, Missed clock-ins & outs)', activeTab==='coverage' && COV_SUB==='clockins', [activeTab, COV_SUB]);
  switchTab('schedguide'); await sleep(200);
  const t2=document.getElementById('tab-schedguide').innerText;
  ok('step-by-step guides: call-off, clock-in, open hours, team, EVV, one visit', ['A caregiver calls off','Someone hasn','Regular open hours','Building a new client','Fixing an EVV record','Changing one visit'].every(x=>t2.includes(x)), t2.slice(0,300));
  ok('the clock-in guide uses the live minutes (7)', /About 7 minutes after a shift starts/.test(document.getElementById('tab-schedguide').innerHTML));
  ok('texts word for word: her own words when set, marked', /our own words for \{client\}/.test(t2) && /your own words/.test(t2), '');
  ok('...the standard wording otherwise (open hours, from Settings)', /We have regular hours open in \{town\}/.test(t2) && /Thanks, \{first_name\}! We got your answer/.test(t2));
  ok('...each says whether it is going out right now', /No clock-in yet\s*not going out/.test(t2) && /Open hours, to the whole team\s*going out/.test(t2), '');
  ok('what Cara does on her own, with live On/Off, and what she never does', /On her own/.test(t2) && /Never/.test(t2) && /Texts a caregiver about a shift unless a person picked them/.test(t2) && /Sends an open-hours text outside 9am to 6pm/.test(t2));
  ok('no em dash and no Schedule Watch anywhere on the page', !/—/.test(t2) && !/Schedule Watch/.test(t2));
  schedGo('coverage'); await sleep(150);
  const how=[...document.querySelectorAll('#tab-coverage a')].find(a=>/How this works/.test(a.textContent)); how.click(); await sleep(200);
  ok('Cara\'s "How this works" opens the guide tab', activeTab==='schedguide', activeTab);
  switchTab('today'); location.hash='#schedguide'; await sleep(300);
  ok('#schedguide opens it', activeTab==='schedguide', activeTab);
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1400, 'height': 1100})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(f'http://localhost:{PORT}/index.html?proof=schedguide'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', H)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    pg.evaluate("()=>{ switchTab('schedguide'); window.scrollTo(0,0); }"); pg.wait_for_timeout(300)
    pg.screenshot(path=os.environ.get('SHOT', '/tmp/schedguide.png'))
    p2 = b.new_page(); p2.goto(f'http://localhost:{PORT}/scheduling-guide.html'); p2.wait_for_timeout(800)
    R.append(['PASS' if 'schedguide' in p2.url else 'FAIL', 'the old guide address lands on the new tab', p2.url]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

"""Email results (2026-11-13, her ask: who opened, who wrote back, who unsubscribed; "it should be in the marketing area"),
in the real Hub page offline: the pill beside Campaigns, the screen, a line opening to its people, the search, Check again,
the not-installed-yet message, and a phone. (python3 tests/browser/email_results_look.py [port] [screenshot folder])"""
import os, sys
from playwright.sync_api import sync_playwright
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'client_journey_look.py')).read()
ns = {'__file__': os.path.abspath(__file__)}; exec(src[:src.rindex('with sync_playwright() as pw:')], ns)
STUB, DATA = ns['STUB'], ns['DATA']
PORT = sys.argv[1] if len(sys.argv) > 1 else '8765'
SHOTS = sys.argv[2] if len(sys.argv) > 2 else '/tmp'
FAKE = r"""
(()=>{
  const W=window; W.__ER=[]; W.__ERmode='ok';
  (0,eval)("cmpAuthHeaders=async()=>({ 'Content-Type':'application/json', Authorization:'Bearer t' })");
  const at=(h)=>new Date(Date.now()-h*3600000).toISOString();
  const P=(to,org,extra)=>Object.assign({ id:to, at:at(3), key:'r39', subj:'A home care partner that makes your discharges easier', aud:'referrers', to, org, name:'', by:'campaign-auto', auto:true, checked_at:at(1), found:true, status:'delivered', opened_at:'', problem:'', replied_at:'', error:'' }, extra||{});
  W.__ERdata={ ok:true, at:at(0), asked:6, unread:0, still_to_check:0, sends:[
    P('admissions@birchpointe.example','Birch Pointe Assisted Living',{ status:'opened', opened_at:at(2) }),
    P('info@hopehospice.example','Hope Hospice',{ status:'opened', opened_at:at(2), replied_at:at(1), name:'Dana Cole' }),
    P('office@ablelaw.example','Able Elder Law'), P('intake@ozarkhh.example','Ozark Home Health',{ status:'bounced', problem:'bounced' }),
    P('hello@maplerehab.example','Maple Rehab',{ checked_at:'', found:null, status:'' }),
    { id:'l1', at:at(30), key:'m23', subj:'Home for the holidays? Keep your eyes open.', aud:'monthly', to:'lee.park@example.com', name:'Lee Park', org:'', by:'campaign-auto', auto:true, checked_at:at(1), found:true, status:'opened', opened_at:at(20), problem:'', replied_at:'', error:'' } ],
    unsubscribed:[{ email:'director@oldorg.example', at:at(50), how:'pressed Unsubscribe in an email', name:'', org:'Old Org Senior Living' }],
    switched_off:[{ email:'pat@example.com', name:'Pat Rivers', at:at(80) }] };
  const of=W.fetch; W.fetch=async(u,o)=>{ if(/functions\/v1\/email-results/.test(String(u))){ W.__ER.push(JSON.parse(o.body));
      if(W.__ERmode==='404') return new Response('{}',{status:404});
      if(W.__ERmode==='401') return new Response(JSON.stringify({ error:'Sign in first.' }),{status:401});
      return new Response(JSON.stringify(W.__ERdata),{status:200}); }
    return of(u,o); };
})();
"""
T = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  window.__as('krystal@mo-care.com','Krystal Land');
  switchTab('campaigns'); await sleep(200);
  const pills=[...document.querySelectorAll('#fsub-partners .fpill')].map(p=>p.textContent.trim());
  ok('Referrals & Marketing has an "Email results" pill right after Campaigns', pills.indexOf('Email results')===pills.indexOf('Campaigns')+1 && pills.indexOf('Campaigns')>=0, pills);
  document.querySelector('#fsub-partners .fpill[data-tab="emailresults"]').click(); await sleep(400);
  const box=document.getElementById('emailResults'), vis=!!(box.offsetWidth||box.offsetHeight);
  ok('pressing it opens the screen, and the pill is lit', vis && document.querySelector('#fsub-partners .fpill[data-tab="emailresults"]').classList.contains('active') && /Email results/.test(box.innerText), [vis, box.innerText.slice(0,120)]);
  ok('it asked the server once', window.__ER.length===1 && window.__ER[0].refresh===true, window.__ER);
  ok('the four tiles read right: 6 sent, 3 opened of 5 we could check, 1 wrote back, 1 unsubscribed', /6\s*Emails sent/.test(box.innerText) && /3\s*Opened\s*of 5 we could check/.test(box.innerText) && /1\s*Wrote back/.test(box.innerText) && /1\s*Unsubscribed/.test(box.innerText), box.innerText.slice(0,500));
  ok('one line per email with its counts', /5 sent · 2 opened · 1 wrote back · 1 did not arrive/.test(box.innerText) && /sent by the schedule/.test(box.innerText), box.innerText.slice(300,900));
  ok('people are folded away at first', !/info@hopehospice\.example/.test(box.innerText));
  [...box.querySelectorAll('.card > div')].find(d=>/discharges easier/.test(d.textContent)).click(); await sleep(150);
  ok('pressing a line shows each person and what happened', /info@hopehospice\.example/.test(box.innerText) && /Wrote back/.test(box.innerText) && /Did not arrive \(bounced\)/.test(box.innerText) && /Not checked yet/.test(box.innerText) && /Sent, not opened yet/.test(box.innerText), box.innerText.slice(300,1400));
  ok('who unsubscribed and who is switched off are listed', /Unsubscribed \(1\)/.test(box.innerText) && /Old Org Senior Living/.test(box.innerText) && /Monthly emails turned off in the Hub \(1\)/.test(box.innerText) && /Pat Rivers/.test(box.innerText));
  window.__shot1=true;
  renderActiveTab(); renderActiveTab(); await sleep(200);
  ok('the Hub redrawing the tab does not ask the server again', window.__ER.length===1, window.__ER.length);
  const q=document.getElementById('erQ'); q.focus(); q.value='lee'; q.dispatchEvent(new Event('input',{bubbles:true})); await sleep(150);
  ok('searching a name narrows it and keeps the cursor in the box', /lee\.park@example\.com/.test(box.innerText) && !/Birch Pointe/.test(box.innerText) && document.activeElement && document.activeElement.id==='erQ', box.innerText.slice(300,800));
  CCEmailResults.setQ(''); CCEmailResults.setAud('leads'); await sleep(100);
  ok('the Leads pill shows only lead emails', /Home for the holidays/.test(box.innerText) && !/discharges easier/.test(box.innerText));
  CCEmailResults.setAud('all');
  document.getElementById('erRefresh').click(); await sleep(300);
  ok('Check again asks the server at once', window.__ER.length===2, window.__ER.length);
  window.__ERmode='404'; await CCEmailResults.load(true); await sleep(100);
  ok('before the server piece is installed it says so, in everyday words', /not switched on yet/.test(box.innerText), box.innerText.slice(0,400));
  window.__ERmode='401'; await CCEmailResults.load(true); await sleep(100);
  ok('a refusal is shown as what it is, never as an empty list', /could not be read just now: Sign in first\./.test(box.innerText), box.innerText.slice(0,400));
  window.__ERmode='ok'; await CCEmailResults.load(true); await sleep(100);
  return R; }"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []
    pg = b.new_page(viewport={'width': 1280, 'height': 1100})
    pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    pg.goto(f'http://localhost:{PORT}/index.html?proof=eresults'); pg.wait_for_timeout(1500)
    for s in (STUB, DATA, FAKE): pg.evaluate('s=>(0,eval)(s)', s)
    R = pg.evaluate(T)
    pg.evaluate("()=>{ const g=CCEmailResults.groups(CCEmailResults.VIEW.data.sends)[0]; CCEmailResults.VIEW.open={}; CCEmailResults.VIEW.open[g.k]=true; CCEmailResults.render(); window.scrollTo(0,0); }")
    pg.screenshot(path=os.path.join(SHOTS, 'email_results_desktop.png'), full_page=True)
    ph = b.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True)
    ph.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    ph.goto(f'http://localhost:{PORT}/index.html?proof=eresults'); ph.wait_for_timeout(1500)
    for s in (STUB, DATA, FAKE): ph.evaluate('s=>(0,eval)(s)', s)
    w = ph.evaluate("""async()=>{ document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; window.__as('krystal@mo-care.com','Krystal Land');
      switchTab('emailresults'); await new Promise(r=>setTimeout(r,400)); const g=CCEmailResults.groups(CCEmailResults.VIEW.data.sends)[0]; CCEmailResults.toggle(g.k); await new Promise(r=>setTimeout(r,150));
      return { sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth, shown:/Hope Hospice/.test(document.getElementById('emailResults').innerText) }; }""")
    R.append(['PASS' if w['sw'] <= w['cw'] + 1 and w['shown'] else 'FAIL', 'on a phone: the screen fits, no sideways scroll', str(w)])
    ph.screenshot(path=os.path.join(SHOTS, 'email_results_phone.png'), full_page=True)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

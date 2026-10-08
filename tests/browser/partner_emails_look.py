"""Partner emails by type (Referral Partner Desk Step 5, 2026-10-08), in the real Hub page offline: the emails for the
partner's type, read and edit (subject, a personal first line), a test to yourself, pick who gets it, the server check
(what it leaves out is shown), send, the record on the partner's history, never the same email twice, and the Campaigns
tab's partner list following the same rules. (python3 tests/browser/partner_emails_look.py [port])"""
import os, sys
from playwright.sync_api import sync_playwright
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'client_journey_look.py')).read()
ns = {'__file__': os.path.abspath(__file__)}; exec(src[:src.rindex('with sync_playwright() as pw:')], ns)
STUB, DATA = ns['STUB'], ns['DATA']
PORT = sys.argv[1] if len(sys.argv) > 1 else '8765'
FAKE = r"""
(()=>{
  const W=window; W.__P=[]; W.__C=[];
  (0,eval)("persist=async(k,i)=>{ window.__P.push([k,JSON.parse(JSON.stringify(i))]); }");
  (0,eval)("ccToast=(m)=>{ window.__toast=m; }");
  (0,eval)("cmpAuthHeaders=async()=>({ 'Content-Type':'application/json', Authorization:'Bearer t' })");
  W.confirm=()=>true;
  DATA.referral_orgs=[
    { id:'mercy', name:'Mercy Hospital', type:'Hospital', email:'info@mercy.net', created_at:'2025-01-10T00:00:00Z',
      contacts:[{ id:'c1', name:'Lisa Marsh', role:'discharge planner', email:'lisa@mercy.net' }, { id:'c2', name:'Gone Person', email:'gone@x.com' }, { id:'c3', name:'No Email' }] },
    { id:'fount', name:'The Fountains', type:'Assisted Living', created_at:'2025-03-01T00:00:00Z', contacts:[{ id:'f1', name:'Dana Cole', email:'dana@fountains.com' }] },
    { id:'cox', name:'CoxHealth', type:'Hospital', created_at:'2025-01-10T00:00:00Z', contacts:[{ id:'x1', name:'Pat Cox', email:'pat@cox.org' }] }];
  DATA.referral_activities=[{ id:'old', org_id:'cox', kind:'email', email_key:'__FIRSTKEY__', to:'pat@cox.org', at:'2026-09-01T10:00:00Z' }];
  const of=W.fetch; W.fetch=async(u,o)=>{ if(/campaign-send/.test(String(u))){ const b=JSON.parse(o.body); W.__C.push(b);
      if(b.screen) return new Response(JSON.stringify({ ok:true, allowed:b.recipients.filter(r=>r.email!=='gone@x.com'), left_out:b.recipients.filter(r=>r.email==='gone@x.com').map(r=>({ email:r.email, why:'tied to a client who has died' })) }),{status:200});
      return new Response(JSON.stringify({ sent:b.recipients.length, failed:0, results:b.recipients.map(r=>({ email:r.email, ok:true })) }),{status:200}); }
    return of(u,o); };
})();
"""
T = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  window.__as('krystal@mo-care.com','Krystal Land');
  const hosp=peForOrg({ type:'Hospital' }), first=hosp.find(e=>e.seg==='Hospitals & Case Mgmt');
  DATA.referral_activities[0].email_key=first.key;
  openRefProfile('mercy'); await sleep(300);
  ok('The partner profile offers "Send a partner email"', [...document.querySelectorAll('.pd-prof button')].some(b=>/Send a partner email/.test(b.textContent)));
  peOpen('mercy'); await sleep(150);
  const dlg=()=>document.querySelector('.pe-dlg');
  ok('The emails for a hospital: written for Hospitals & Case Mgmt plus any partner, grouped by when to use them', /Written for Hospitals & Case Mgmt/.test(dlg().innerText) && /Hospitals & Case Mgmt · Cold outreach/i.test(dlg().innerText) && /Any Referral Partner/i.test(dlg().innerText) && !/Senior Living|Hospice & Palliative/i.test(dlg().innerText), dlg().innerText.slice(0,500));
  peChoose(first.key); await sleep(150);
  ok('Picked: the subject to change, a personal first line, the email as they will see it, and who it goes to (only people with an email)', document.getElementById('peSubj').value===first.subj && document.querySelector('.pe-prev iframe') && /Lisa Marsh/.test(dlg().innerText) && /info@mercy.net/.test(dlg().innerText) && !/No Email/.test(dlg().innerText));
  document.getElementById('peSubj').value='A partner for your discharges'; peSet('subj','A partner for your discharges'); peSet('note','Lisa, it was good to see you Tuesday.');
  ok('...the preview shows the edits', /Lisa, it was good to see you Tuesday\./.test(document.querySelector('.pe-prev iframe').srcdoc));
  await peTest(); await sleep(100);
  const t=window.__C.slice(-1)[0];
  ok('Send a test to me: only to me, marked [TEST]', t && t.recipients.length===1 && t.recipients[0].email==='krystal@mo-care.com' && /^\[TEST\] A partner for your discharges/.test(t.subject));
  await peSend(); await sleep(100);
  ok('Send with nobody ticked: "Tick who gets it", nothing sent', /Tick who gets it/.test(dlg().innerText) && window.__C.filter(c=>!c.screen && !/test/.test(c.campaign||'')).length===0);
  pePick('lisa@mercy.net',true); pePick('gone@x.com',true); window.__C.length=0;
  await peSend(); await sleep(300);
  const scr=window.__C.find(c=>c.screen), snd=window.__C.find(c=>!c.screen);
  ok('Send: the server check runs first (partner tag), and the address it leaves out is not sent', scr && scr.tag==='referral-partner' && snd && snd.recipients.map(r=>r.email).join()==='lisa@mercy.net' && snd.tag==='referral-partner' && snd.campaign==='partner:'+first.key, window.__C);
  ok('...what was sent carries her edits', snd && snd.subject==='A partner for your discharges' && /Lisa, it was good to see you Tuesday\./.test(snd.html));
  const rec=window.__P.filter(x=>x[0]==='referral_activities').map(x=>x[1]);
  ok('...recorded on the partner\'s history: who, which email, to whom, when (one line per person)', rec.length===1 && rec[0].org_id==='mercy' && rec[0].kind==='email' && rec[0].email_key===first.key && rec[0].to==='lisa@mercy.net' && rec[0].contact_id==='c1' && rec[0].by==='krystal@mo-care.com', rec);
  peBack(); await sleep(100);
  ok('Never twice: the list says it was already sent to Lisa', /already sent to Lisa/.test(dlg().innerText));
  peChoose(first.key); await sleep(100);
  const box=[...document.querySelectorAll('.pe-to')].find(l=>/Lisa/.test(l.innerText));
  ok('...and Lisa can\'t be ticked for it again', box && box.querySelector('input').disabled && /already got this one/.test(box.innerText));
  peClose();
  /* the Campaigns tab */
  const rcp=peBulkRecipients(first).map(r=>r.email).sort().join();
  ok('Campaigns tab, a hospital email: only hospital partners, only people who haven\'t had it (not Lisa, not Pat, no assisted living)', rcp==='gone@x.com,info@mercy.net', rcp);
  const anyE=hosp.find(e=>e.seg==='Any Referral Partner');
  ok('...an "any partner" email: every partner\'s people', peBulkRecipients(anyE).map(r=>r.email).includes('dana@fountains.com'));
  window.__P.length=0; await peBulkRecord(first, [{ email:'info@mercy.net', ok:true }, { email:'gone@x.com', ok:false }]);
  ok('...a send from the Campaigns tab is recorded on the partner too (only those that went)', window.__P.length===1 && window.__P[0][1].to==='info@mercy.net' && window.__P[0][1].email_key===first.key, window.__P);
  return R; }"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []
    pg = b.new_page(viewport={'width': 1280, 'height': 1000})
    pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    pg.goto(f'http://localhost:{PORT}/index.html?proof=pemails'); pg.wait_for_timeout(1500)
    for s in (STUB, DATA, FAKE): pg.evaluate('s=>(0,eval)(s)', s)
    R = pg.evaluate(T)
    ph = b.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True)
    ph.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    ph.goto(f'http://localhost:{PORT}/index.html?proof=pemails'); ph.wait_for_timeout(1500)
    for s in (STUB, DATA, FAKE): ph.evaluate('s=>(0,eval)(s)', s)
    w = ph.evaluate("""async()=>{ document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; window.__as('krystal@mo-care.com','Krystal Land');
      peOpen('mercy'); peChoose(peForOrg({type:'Hospital'})[0].key); await new Promise(r=>setTimeout(r,200)); const g=document.querySelector('.pe-dlg').getBoundingClientRect(); return { sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth, w:g.width }; }""")
    R.append(['PASS' if w['sw'] <= w['cw'] + 1 and w['w'] <= 390 else 'FAIL', 'on a phone: the email screen fits, no sideways scroll', str(w)])
    ph.screenshot(path='/tmp/pe_phone.png')
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

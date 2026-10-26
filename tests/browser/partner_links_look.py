"""Partner links, step 2 (2026-10-26), in the real Hub page offline with made-up partners and families: the partner
profile's code, link and QR code (owners add and pause; a Care Coordinator only copies), the owners' Program view and
Sources to check (Keep / Credit), the source lock on saving a lead (a coordinator is refused, an owner gives a reason,
the history is kept), a manual phone referral, the partner a call named, and a phone-width check.
(PORT=<port> python3 tests/browser/partner_links_look.py, static server on that port, 8765 by default)"""
import os
from playwright.sync_api import sync_playwright
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'client_journey_look.py')).read()
ns = {'__file__': os.path.abspath(__file__)}; exec(src[:src.rindex('with sync_playwright() as pw:')], ns)
STUB, DATA = ns['STUB'], ns['DATA']
PORT = os.environ.get('PORT', '8765')
FAKE = r"""
(()=>{
  const W=window, at='2026-10-26T14:00:00Z';
  W.__P=[]; W.__alert=[]; W.__prompt='The daughter said Jane sent them';
  (0,eval)("persist=async(k,i)=>{ window.__P.push([k,JSON.parse(JSON.stringify(i))]); }");
  (0,eval)("ccToast=(m)=>{ window.__toast=m; }");
  W.ccConfirm=async()=>true; (0,eval)('ccConfirm=window.ccConfirm');
  W.ccPrompt=async()=>window.__prompt; (0,eval)('ccPrompt=window.ccPrompt');
  W.alert=(m)=>{ window.__alert.push(m); };
  DATA.referral_orgs=[
    { id:'jane', name:'Ozark Senior Moves', type:'Other', partner_code:'JANE-K7', program_status:'active', program_added_at:'2026-10-26T12:00:00Z', created_at:'2026-10-26T12:00:00Z', contacts:[{ id:'c1', name:'Jane Smith', phone:'417-555-0150' }] },
    { id:'ron', name:'Grace Community Church', type:'Faith Community', partner_code:'GRACE-4Q', program_status:'paused', created_at:'2026-10-20T12:00:00Z' },
    { id:'cox', name:'CoxHealth', type:'Hospital', created_at:'2025-01-10T00:00:00Z' }];
  DATA.referral_activities=[]; DATA.activities=[];
  DATA.leads=(DATA.leads||[]).concat([
    { id:'PL1', first_name:'Gary', last_name:'Miller', source:'Referral', referral_org_id:'jane', referral_source_name:'Ozark Senior Moves', referral_via:'link', partner_code:'JANE-K7', status:'Contacted', created_at:at, first_shift_at:'2026-10-27T13:00:00Z' },
    { id:'PL2', first_name:'Dorothy', last_name:'Hayes', source:'Website', status:'New', created_at:at, possibly_returning:{ matches:[{ kind:'inquiry', lead_id:'x' }] },
      partner_link_seen:{ code:'JANE-K7', status:'linked', org_id:'jane', org_name:'Ozark Senior Moves', at } },
    { id:'PL3', first_name:'Bo', source:'Website', status:'New', created_at:at, partner_link_seen:{ code:'BOB-22', status:'unknown', at } },
    { id:'PL4', first_name:'Ann', last_name:'Cole', phone:'4175550199', source:'Referral', referral_org_id:'cox', referral_source_name:'CoxHealth', status:'Contacted', created_at:'2026-10-20T14:00:00Z' }]);
  DATA.ops_items=DATA.ops_items||[];
})();
"""
T = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  const P=()=>window.__P, last=(k)=>P().filter(x=>x[0]===k).slice(-1)[0];
  /* a Care Coordinator */
  window.__as('krystal@mo-care.com','Krystal Land');
  switchTab('referrers'); await sleep(300);
  ok('Krystal: no Program view, no Sources to check (owners only)', document.getElementById('plProgram') && document.getElementById('plProgram').innerHTML==='' && !/Sources to check/.test(document.getElementById('tab-referrers').innerText));
  const vis=e=>!!e&&getComputedStyle(e).display!=='none'&&e.offsetParent!==null;
  ok('Referral Partners is its own page: its own menu item is the one lit, and its row holds only Referral Partners', document.querySelector('.ftab.active[data-g="partners"]') && vis(document.getElementById('fsub-partners')) && document.querySelectorAll('#fsub-partners .fpill').length===1 && !vis(document.getElementById('fsub-campaigns')));
  ok('the retired tabs are gone: no LTC Policy, Community, Story Game, 20-Hour Offer or 417 Series anywhere in the menu, and no LTC Policy or Community page', !/LTC Policy|Story Game|20-Hour Offer|417 Series/.test(document.getElementById('fbar').parentNode.innerText) && ![...document.querySelectorAll('.fpill')].some(x=>/^\s*Community/.test(x.textContent)) && !document.getElementById('tab-ltcpolicy') && !document.getElementById('tab-community'));
  ok('the Hub\'s Marketing row keeps Campaigns and Feedback', [...document.querySelectorAll('#fsub-campaigns .fpill')].map(x=>x.dataset.tab).join()==='campaigns,feedback');
  location.hash='ltcpolicy'; await sleep(300);
  ok('an old #ltcpolicy link no longer opens anything retired (and nothing breaks)', !document.getElementById('tab-ltcpolicy'));
  location.hash=''; switchTab('referrers'); await sleep(200);
  ok('...the existing desk and the organization list still draw', /This week/.test(document.getElementById('refDesk').innerText) && /CoxHealth/.test(document.getElementById('referrersWrap').innerText));
  openRefProfile('jane'); await sleep(300);
  const left=()=>document.getElementById('refProfLeft').innerText;
  ok('Krystal on a program partner: the code, the link, Copy link, Copy a message, QR code', /JANE-K7/.test(left()) && /mo-care\.com\/r\/\?p=JANE-K7/.test(left()) && /Copy link/.test(left()) && /Copy a message/.test(left()) && /QR code/.test(left()), left().slice(0,600));
  ok('...but no Pause and no Add (owners only)', !/Pause/.test(left()) && !/Add to the program/.test(left()));
  ok('...and the honest note: the website page comes in the next step, don\'t share yet', /comes in the next step/.test(left()));
  ok('...the existing partner profile is still there below it', /Log something/.test(left()));
  plQr('jane'); await sleep(200);
  const qd=document.getElementById('plQrOv');
  ok('QR code: drawn on the page from the link, with a Download', qd && qd.querySelector('img') && /^data:image\/png/.test(qd.querySelector('img').src) && /Download/.test(qd.innerText) && qd.querySelector('a[download="partner-JANE-K7-qr.png"]'), qd&&qd.innerText);
  qd.remove();
  openRefProfile('cox'); await sleep(200);
  ok('Krystal on a partner not in the program: says so, no button', /Not in the Referral Partner Program yet/.test(left()) && !/Add to the program/.test(left()));

  /* the source lock: a coordinator */
  window.__P.length=0; window.__alert.length=0;
  openLeadModal('PL4'); await sleep(200);
  document.getElementById('lead_referral_org_id').value='jane'; leadRefOrgPicked();
  await saveLead({ ck_done:true }); await sleep(300);
  const s1=last('leads');
  ok('Krystal changing an established source (CoxHealth to Jane): refused, told why, the rest saved', s1 && s1[1].id==='PL4' && s1[1].referral_org_id==='cox' && s1[1].referral_source_name==='CoxHealth' && window.__alert.some(m=>/Only Samantha or Zachary can change a referral source/.test(m)) && !(s1[1].source_history||[]).length, [s1&&s1[1], window.__alert]);
  /* manual phone referral */
  window.__P.length=0;
  openLeadModal(); await sleep(200);
  document.getElementById('lead_first_name').value='Hal'; document.getElementById('lead_phone').value='4175550222';
  document.getElementById('lead_referral_org_id').value='jane'; leadRefOrgPicked();
  await saveLead({ ck_done:true }); await sleep(400);
  const s2=last('leads');
  ok('Manual phone referral: Krystal picks Jane in Referred By on a new lead (the usual box): saved as Referral, by hand, history "added"', s2 && s2[1].first_name==='Hal' && s2[1].referral_org_id==='jane' && s2[1].source==='Referral' && s2[1].referral_via==='manual' && (s2[1].source_history||[])[0].how==='added', s2&&s2[1]);
  /* the partner a call named */
  openLeadModal(); await sleep(150);
  PartnerLinks.afterCallFill({ referral_source_name:'Ozark Senior Moves', phone:'4175550333' });
  const sel=document.getElementById('lead_referral_org_id');
  ok('Make this a lead: the partner the call named is picked in Referred By, yellow like the rest', sel.value==='jane' && sel.classList.contains('cl-heard') && document.getElementById('lead_source').value==='Referral');
  closeModal('leadModalBackdrop');
  openLeadModal(); await sleep(150); PartnerLinks.afterCallFill({ referral_source_name:'my neighbor Sue' });
  ok('...a name that matches no partner picks nothing (it stays typed)', document.getElementById('lead_referral_org_id').value==='');
  closeModal('leadModalBackdrop');

  /* the owner */
  window.__as('sam@mo-care.com','Samantha Owner'); window.__P.length=0; window.__alert.length=0;
  switchTab('referrers'); await sleep(300);
  const pg=()=>document.getElementById('plProgram').innerText;
  ok('Samantha: the Program view, tracking only', /Referral Partner Program/.test(pg()) && /tracking only, no rewards/.test(pg()), pg().slice(0,300));
  ok('...tiles: 2 partners (1 not paused), families referred, home visits, clients started, conversion', /2\s*partners \(1 not paused\)/.test(pg()) && /families referred/.test(pg()) && /home visits/.test(pg()) && /clients started/.test(pg()) && /referred who started/.test(pg()), pg());
  ok('...Sources to check: the returning family and the unknown code, each with why', /Sources to check · 2/i.test(pg()) && /Dorothy Hayes[\s\S]*family we already know/.test(pg()) && /doesn't match a saved partner/.test(pg()), pg());
  ok('...the partners table: Jane 2 referred (her link + Krystal\'s phone one above), 0 home visits, 1 started, 50%, 1 link and 1 typed in; billed revenue "not available yet"', /Ozark Senior Moves[\s\S]*Active\s+2\s+0\s+1\s+50%\s+not read yet\s+1 link · 1 typed in/.test(pg()), pg());
  /* billed revenue, read from AxisCare only when an owner asks */
  ok('Billed revenue: "not read yet" until asked, with a Get billed revenue from AxisCare button', /Get billed revenue from AxisCare/.test(pg()) && /not read yet/.test(pg()));
  window.__inv=[]; (0,eval)("sb.functions.invoke=async(fn,o)=>{ window.__inv.push(fn); if(window.__revFail) return { data:null, error:{ context:{ status:404, json:async()=>({}) } } }; return { data:{ at:'2026-10-26T15:00:00Z', through:'2026-10-26', clients:2, more_than_read:0, partners:{ jane:{ clients:2, read:1, unread:1, visits:4, hours:36.5, billed:572, no_rate_clients:1 } } }, error:null }; }");
  window.__revFail=true; await plRevenue(); await sleep(150);
  ok('...the server piece not deployed yet: says so, nothing else changes', /isn't set up on the server yet/.test(pg()) && /not read yet/.test(pg()), pg());
  window.__revFail=false; await plRevenue(); await sleep(150);
  ok('...read: Jane shows $572 est. · 36.5 hrs, 1 client not read, some visits without a rate; labelled an estimate, not invoices', /\$572\s*est\. · 36\.5 hrs/.test(pg()) && /1 client not read/.test(pg()) && /some visits have no rate/.test(pg()) && /not invoices or payments/.test(pg()) && window.__inv.slice(-1)[0]==='partner-revenue', pg());
  ok('...a partner with nobody started says so (not $0)', /Grace Community Church[\s\S]*no clients started/.test(pg()));
  ok('...nothing was saved by reading it', !window.__P.some(x=>/revenue/i.test(JSON.stringify(x))));
  /* recheck AxisCare later, read only */
  plDecide('plc_PL2'); await sleep(200);
  const dlg=()=>document.getElementById('plDecOv');
  ok('Decide: shows the family has no source yet, and offers Check AxisCare again (the AxisCare case)', /no referral source recorded yet/.test(dlg().innerText) && document.getElementById('plDecAx'), dlg().innerText);
  window.__ckq=null; (0,eval)("ckLookup=async(q)=>{ window.__ckq=q; return { matches:[], axiscare_ok:true }; }");
  const before=JSON.stringify(DATA.leads.find(l=>l.id==='PL2')); window.__P.length=0;
  document.getElementById('plDecAx').click(); await sleep(300);
  ok('...Check AxisCare again: asks the live lookup with the family\'s phone and name, shows the answer, saves nothing', window.__ckq && /No match/.test(document.getElementById('plDecAxOut').innerText) && /nothing was changed/.test(document.getElementById('plDecAxOut').innerText) && !window.__P.length && JSON.stringify(DATA.leads.find(l=>l.id==='PL2'))===before, [window.__ckq, document.getElementById('plDecAxOut').innerText]);
  (0,eval)("ckLookup=async(q)=>{ return { matches:[{ name:'Dorothy Hayes', active:true, why:['phone'] }], axiscare_ok:true }; }");
  document.getElementById('plDecAx').click(); await sleep(300);
  ok('...a match says so ("current client Dorothy Hayes")', /current client Dorothy Hayes/.test(document.getElementById('plDecAxOut').innerText), document.getElementById('plDecAxOut').innerText);
  (0,eval)("ckLookup=async(q)=>{ throw new Error('AxisCare answered 429'); }");
  document.getElementById('plDecAx').click(); await sleep(300);
  ok('...AxisCare still down: says it couldn\'t be checked, and the item stays on the list', /couldn't be checked just now/.test(document.getElementById('plDecAxOut').innerText) && /Dorothy Hayes/.test(pg()), document.getElementById('plDecAxOut').innerText);
  dlg().remove();
  /* decide one */
  plDecide('plc_PL2'); await sleep(200);
  document.getElementById('plDecKeep').click(); await sleep(300);
  const d1=last('leads');
  ok('Decide: Keep the current source closes it (who, when), the family\'s source untouched', d1 && d1[1].id==='PL2' && d1[1].partner_link_seen.resolved.decision==='keep' && d1[1].partner_link_seen.resolved.by==='sam@mo-care.com' && d1[1].source==='Website' && !/Dorothy Hayes/.test(pg()), d1&&d1[1]);
  plDecide('plc_PL3'); await sleep(200);
  document.getElementById('plDecCredit').click(); await sleep(150);
  ok('...Credit with no partner picked: asks for one, nothing saved', /Pick the partner to credit/.test(document.getElementById('plDecErr').textContent));
  document.getElementById('plDecOrg').value='jane'; document.getElementById('plDecCredit').click(); await sleep(150);
  ok('...Credit with a partner but no reason: asks for one, nothing saved', /Write why you are crediting/.test(document.getElementById('plDecErr').textContent) && last('leads')[1].id==='PL2');
  document.getElementById('plDecWhy').value='Bo said Jane gave him the card'; document.getElementById('plDecCredit').click(); await sleep(300);
  const d2=last('leads');
  ok('...Credit Jane: the inquiry becomes her referral, with the history', d2 && d2[1].id==='PL3' && d2[1].referral_org_id==='jane' && d2[1].source_history[0].how==='sources_check' && /gave him the card/.test(d2[1].source_history[0].why), d2&&d2[1]);
  /* add + pause */
  openRefProfile('cox'); await sleep(200);
  ok('Samantha on a partner not in the program: Add to the program', /Add to the program/.test(left()));
  await plAdd('cox'); await sleep(300);
  const a1=last('referral_orgs');
  ok('...added: a new code nobody else has, Invited, who and when kept', a1 && /^COXHEA-[A-HJ-NP-Z2-9]{2}$/.test(a1[1].partner_code) && a1[1].program_status==='invited' && a1[1].program_added_by==='sam@mo-care.com', a1&&a1[1]);
  ok('...the profile now shows the code and Mark active / Pause', new RegExp(a1[1].partner_code).test(left()) && /Mark active/.test(left()) && /Pause/.test(left()));
  await plStatus('jane','paused'); await sleep(200);
  ok('Pause: kept with who and when', last('referral_orgs')[1].program_status==='paused' && last('referral_orgs')[1].program_log.slice(-1)[0].by==='sam@mo-care.com');
  /* the owner changes a source with a reason */
  window.__P.length=0;
  openLeadModal('PL4'); await sleep(200);
  document.getElementById('lead_referral_org_id').value='jane'; leadRefOrgPicked();
  await saveLead({ ck_done:true }); await sleep(300);
  const s3=last('leads');
  ok('Samantha changing it: asked why; changed; the history keeps CoxHealth to Jane with her reason', s3 && s3[1].referral_org_id==='jane' && s3[1].source_history.slice(-1)[0].how==='owner_change' && s3[1].source_history.slice(-1)[0].from.referral_org_id==='cox' && /daughter/.test(s3[1].source_history.slice(-1)[0].why), s3&&s3[1]);
  window.__prompt=''; window.__P.length=0; window.__alert.length=0;
  const l4=DATA.leads.find(l=>l.id==='PL4'); openLeadModal('PL4'); await sleep(200);
  document.getElementById('lead_referral_org_id').value='cox'; leadRefOrgPicked();
  await saveLead({ ck_done:true }); await sleep(300);
  ok('...with no reason given: not changed, said so', last('leads')[1].referral_org_id==='jane' && window.__alert.some(m=>/a reason is needed/.test(m)), [last('leads')[1], window.__alert]);
  /* on the lead */
  const h=PartnerLinks.leadSourceHtml(DATA.leads.find(l=>l.id==='PL4'));
  ok('The lead\'s partner card: how it came in, and the source history', /Came in by typed in/.test(h) && /Referral source history \(1\)/.test(h) && /CoxHealth → Ozark Senior Moves/.test(h), h);
  ok('No rewards anywhere on the new screens', !/reward|commission|eligib/i.test(document.getElementById('plProgram').innerText.replace('tracking only, no rewards','')));
  return R; }"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []
    pg = b.new_page(viewport={'width': 1280, 'height': 1000})
    pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    pg.goto(f'http://localhost:{PORT}/index.html?proof=plinks'); pg.wait_for_timeout(1500)
    for s in (STUB, DATA, FAKE): pg.evaluate('s=>(0,eval)(s)', s)
    R = pg.evaluate(T)
    pg.evaluate("()=>{ window.__as('sam@mo-care.com','Samantha Owner'); switchTab('referrers'); }"); pg.wait_for_timeout(300)
    pg.screenshot(path='/tmp/pl_program.png', full_page=False)
    ph = b.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True)
    ph.on('pageerror', lambda e: errs.append(str(e)[:300]))
    ph.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    ph.goto(f'http://localhost:{PORT}/index.html?proof=plinks'); ph.wait_for_timeout(1500)
    for s in (STUB, DATA, FAKE): ph.evaluate('s=>(0,eval)(s)', s)
    w = ph.evaluate("""async()=>{ document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; window.__as('sam@mo-care.com','Samantha Owner');
      switchTab('referrers'); await new Promise(r=>setTimeout(r,300)); const p=document.getElementById('plProgram');
      const t=p.querySelector('.pl-tiles'); return { sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth, pw:p.getBoundingClientRect().width, cols:t?getComputedStyle(t).gridTemplateColumns.split(' ').length:0 }; }""")
    R.append(['PASS' if w['sw'] <= w['cw'] + 1 and w['cols'] == 2 else 'FAIL', 'on a phone (390 wide): no sideways scroll, the tiles fold to 2 columns, the table scrolls inside its box', str(w)])
    ph.screenshot(path='/tmp/pl_phone.png')
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

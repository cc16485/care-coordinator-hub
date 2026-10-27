"""Referrals & Marketing (2026-10-26, her layout), in the real Hub page offline with made-up partners: one section with four
tabs (Referral Partners, Friends & Family, Campaigns, Feedback); the professional directory (search, filters, owner names,
last contact, next follow-up, referrals, starts) with Ambassadors and Friends & Family people kept out; old links still
land; no money shown to a Care Coordinator; Campaigns and Feedback still open; desktop and phone widths.
(PORT=<port> SHOTS=<folder> python3 tests/browser/referrals_marketing_look.py, static server on that port, 8765 by default)"""
import os
from playwright.sync_api import sync_playwright
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'client_journey_look.py')).read()
ns = {'__file__': os.path.abspath(__file__)}; exec(src[:src.rindex('with sync_playwright() as pw:')], ns)
STUB, DATA = ns['STUB'], ns['DATA']
PORT = os.environ.get('PORT', '8765'); SHOTS = os.environ.get('SHOTS', '')
FAKE = r"""
(()=>{
  const W=window, at='2026-10-20T14:00:00Z';
  W.__P=[]; W.__alert=[];
  (0,eval)("persist=async(k,i)=>{ window.__P.push([k,JSON.parse(JSON.stringify(i))]); }");
  (0,eval)("ccToast=(m)=>{ window.__toast=m; }");
  W.ccConfirm=async()=>false; (0,eval)('ccConfirm=window.ccConfirm');
  W.alert=(m)=>{ window.__alert.push(m); };
  (0,eval)("OPS_PEOPLE=[{primary_email:'krystal@mo-care.com',full_name:'Krystal Land'},{primary_email:'angiel@mo-care.com',full_name:'Angiel Moore'},{primary_email:'sam@mo-care.com',full_name:'Samantha Owner'}]");
  DATA.referral_orgs=[
    { id:'mercy', name:'Mercy Rehab', type:'Rehab / Skilled Nursing', owner_email:'krystal@mo-care.com', created_at:'2025-01-10T00:00:00Z', partner_code:'MERCY-K7', program_status:'active',
      contacts:[{ id:'c1', name:'Jane Doe', role:'Discharge planner', phone:'417-555-0101', email:'jane@mercy.org' }] },
    { id:'oak', name:'Oak Park Senior Living', type:'Senior Living', created_at:'2025-03-01T00:00:00Z', people:'Tom Hill (director)' },
    { id:'cox', name:'CoxHealth', type:'Hospital', owner_email:'angiel@mo-care.com', created_at:'2025-01-10T00:00:00Z' },
    { id:'gone', name:'Closed Clinic', type:'Physician Office', archived:true, created_at:'2024-01-01T00:00:00Z' },
    { id:'amb', name:'Linda Ortiz', type:'Community Ambassador', program_track:'ambassador', program_status:'active', partner_code:'LINDA-AA' },
    { id:'ff', name:'Barb Probst', program_track:'friends', partner_code:'BARB-K7' }];
  DATA.referral_activities=[{ id:'a1', org_id:'mercy', kind:'dropby', note:'Saw Jane', at:'2026-10-21T15:00:00Z', by:'krystal@mo-care.com' },
    { id:'a2', org_id:'oak', kind:'call', note:'Left a message', at:'2026-09-01T15:00:00Z', by:'angiel@mo-care.com' }];
  DATA.activities=[{ id:'p1', org_id:'cox', due:'2026-11-04', kind:'dropby' }];
  DATA.leads=(DATA.leads||[]).concat([
    { id:'RM1', first_name:'Gary', last_name:'Miller', source:'Referral', referral_org_id:'mercy', status:'Converted', created_at:'2026-08-01T10:00:00Z', first_shift_at:'2026-08-20T13:00:00Z' },
    { id:'RM2', first_name:'Ann', last_name:'Lee', source:'Referral', referral_org_id:'mercy', status:'New', created_at:at }]);
})();
"""
T = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  const vis=el=>!!el && getComputedStyle(el).display!=='none' && el.getClientRects().length>0;
  const tabOn=id=>vis(document.getElementById('tab-'+id));
  /* the navigation */
  const ftabs=[...document.querySelectorAll('.ftab')].map(x=>x.textContent.trim());
  ok('one section named "Referrals & Marketing"; the separate Marketing item is gone', ftabs.filter(t=>/^Referrals & Marketing/.test(t)).length===1 && !ftabs.some(t=>/^Marketing/.test(t)) && !ftabs.some(t=>/^Referral Partners$/.test(t)), ftabs);
  const pills=[...document.querySelectorAll('#fsub-partners .fpill')].map(x=>x.textContent.trim());
  ok('four tabs, in order: Referral Partners, Friends & Family, Campaigns, Feedback', JSON.stringify(pills)===JSON.stringify(['Referral Partners','Friends & Family','Campaigns','Feedback']), pills);
  ok('the Feedback badge is on the section and its tab', !!document.querySelector('.ftab[data-g="partners"] #fbBadge') && !!document.querySelector('#fsub-partners #fbPillBadge'));
  window.__as('krystal@mo-care.com','Krystal Land'); CC_ROLE_BY_EMAIL['krystal@mo-care.com']=['care_coordinator','springfield_lead']; (0,eval)("CC_ROLES=CC_ROLE_BY_EMAIL['krystal@mo-care.com']");
  ccGroupClick('partners'); await sleep(250);
  ok('the section opens on Referral Partners, with the four-tab bar showing', tabOn('referrers') && vis(document.getElementById('fsub-partners')));
  for(const [t,why] of [['friendsfamily','Friends & Family'],['campaigns','Campaigns'],['feedback','Feedback']]){
    switchTab(t); await sleep(250);
    ok('the '+why+' tab opens in the same section', tabOn(t) && vis(document.getElementById('fsub-partners')) && document.querySelector('#fsub-partners .fpill[data-tab="'+t+'"]').classList.contains('active'));
  }
  switchTab('campaigns'); await sleep(300);
  ok('Campaigns still shows its tools (unchanged)', document.getElementById('tab-campaigns').innerText.trim().length>200, document.getElementById('tab-campaigns').innerText.slice(0,200));
  switchTab('feedback'); await sleep(300);
  ok('Feedback still shows its tools (unchanged)', document.getElementById('tab-feedback').innerText.trim().length>100, document.getElementById('tab-feedback').innerText.slice(0,200));
  switchTab('friendsfamily'); await sleep(200);
  const ff=document.getElementById('tab-friendsfamily').innerText;
  ok('Friends & Family: a Care Coordinator sees "Owners run this program" (step 4, owners only)', /Friends & Family/.test(ff) && /Owners run this program/.test(ff), ff);
  ok('...no names, no amounts, no buttons that do anything', !/Barb|Linda|\$\d/.test(ff) && !document.querySelectorAll('#tab-friendsfamily button').length, ff);
  /* old links */
  for(const [h,t] of [['referrers','referrers'],['campaigns','campaigns'],['marketing','campaigns'],['feedback','feedback'],['referrals-marketing','section'],['friends-family','friendsfamily']]){
    switchTab('mywork'); await sleep(80); location.hash=h; await sleep(260);
    ok('the old or new link #'+h+' lands on '+(t==='section'?'the section (its last-used tab)':t), (t==='section'?['referrers','friendsfamily','campaigns','feedback'].includes(activeTab):tabOn(t)) && vis(document.getElementById('fsub-partners')), [h, t, activeTab]);
  }
  location.hash=''; switchTab('referrers'); await sleep(300);
  /* the directory, as a Care Coordinator */
  const tbl=()=>document.getElementById('pdirTable'), rowIds=()=>[...document.querySelectorAll('#pdirTable tbody tr')].map(r=>r.dataset.org);
  ok('the directory: one row per professional partner, archived ones hidden', JSON.stringify(rowIds())===JSON.stringify(['cox','mercy','oak']), rowIds());
  ok('...Community Ambassadors and Friends & Family people never appear in it', !/Linda Ortiz|Barb Probst/.test(tbl().innerText));
  const heads=[...tbl().querySelectorAll('th')].map(x=>x.textContent.trim());
  ok('...columns: Organization, Main contact, Responsible, Last contact, Next follow-up, Referrals, Client starts', ['Organization','Main contact','Responsible','Last contact','Next follow-up','Referrals','Client starts'].every((h,i)=>heads[i]===h), heads);
  const mercy=document.querySelector('#pdirTable tr[data-org="mercy"]').innerText;
  ok('...Mercy: Jane Doe, discharge planner, Krystal Land, last contact Oct 21, 2 referrals, 1 start', /Jane Doe/.test(mercy) && /Discharge planner/.test(mercy) && /Krystal Land/.test(mercy) && /Oct 21/.test(mercy) && /\b2\b[\s\S]*\b1\b/.test(mercy), mercy);
  ok('...Oak Park: Needs an owner, and its follow-up shows as overdue', /Needs an owner/.test(document.querySelector('#pdirTable tr[data-org="oak"]').innerText) && /Overdue/.test(document.querySelector('#pdirTable tr[data-org="oak"]').innerText));
  ok('...CoxHealth: the planned touch as its next follow-up (Nov 4, planned)', /Nov 4[\s\S]*planned/.test(document.querySelector('#pdirTable tr[data-org="cox"]').innerText));
  const q=document.getElementById('pdirQ'); q.focus(); q.value='discharge'; q.dispatchEvent(new Event('input')); await sleep(120);
  ok('search finds a partner by its contact\'s role, and keeps typing in the box', JSON.stringify(rowIds())==='["mercy"]' && document.activeElement && document.activeElement.id==='pdirQ', [rowIds(), document.activeElement&&document.activeElement.id]);
  q.value=''; q.dispatchEvent(new Event('input')); await sleep(80);
  PartnerDirectory.set('who','mine'); await sleep(80);
  ok('Responsible: Mine shows only her partners', JSON.stringify(rowIds())==='["mercy"]', rowIds());
  PartnerDirectory.set('who','none'); await sleep(80);
  ok('...Needs an owner shows the unassigned ones', JSON.stringify(rowIds())==='["oak"]', rowIds());
  PartnerDirectory.set('who',''); PartnerDirectory.set('archived',true); await sleep(80);
  ok('Show archived brings back the archived partner', rowIds().includes('gone')); PartnerDirectory.set('archived',false); await sleep(80);
  const page=document.getElementById('tab-referrers').innerText;
  ok('a Care Coordinator sees no money anywhere on Referral Partners (no rewards, payments or revenue)', !/reward|payment|revenue|\$\d/i.test(page), page.match(/.{40}(reward|payment|revenue|\$\d).{40}/i));
  ok('...and no owner-only Program view', document.getElementById('plProgram').innerHTML==='');
  ok('Friends & Family people and ambassadors are on none of her lists: not the weekly desk, Needs an owner or Due for Outreach', !/Barb Probst|Linda Ortiz/.test(page), page.match(/.{60}(Barb Probst|Linda Ortiz).{20}/));
  ok('...and never offered as a lead\'s referrer (an approved ambassador still is)', (()=>{ leadFillRefOrgs(''); const o=[...document.querySelectorAll('#lead_referral_org_id option')].map(x=>x.textContent).join('|'); return !/Barb Probst/.test(o) && /Mercy Rehab/.test(o); })());
  ok('the weekly desk, field scorecard and Due for Outreach are still on the page', !!document.getElementById('refDesk') && /scoreboard/i.test(page) && /Due for Outreach/.test(page));
  document.querySelector('#pdirTable tr[data-org="mercy"] .pdir-acts button.fb').click(); await sleep(150);
  ok('Log a touch opens the same phone-friendly form the desk uses', !!document.getElementById('pdLogOv') && /Mercy Rehab/.test(document.getElementById('pdLogOv').innerText));
  document.getElementById('pdLogOv').remove();
  document.querySelector('#pdirTable tr[data-org="mercy"] .pdir-name').click(); await sleep(250);
  ok('clicking the name opens the partner profile', vis(document.getElementById('refProfileView')) && /Mercy Rehab/.test(document.getElementById('refProfileView').innerText));
  switchTab('referrers'); await sleep(200);
  ok('nothing was saved by looking around', !window.__P.length, window.__P);
  /* the owner */
  window.__as('sam@mo-care.com','Samantha Owner'); switchTab('referrers'); await sleep(300);
  ok('Samantha still has the Program view, now at the bottom of the page', document.getElementById('plProgram').innerText.length>50
    && (document.getElementById('referrersWrap').compareDocumentPosition(document.getElementById('plProgram')) & Node.DOCUMENT_POSITION_FOLLOWING));
  ok('...and partner links still show in it (attribution intact)', /MERCY-K7/.test(document.getElementById('plProgram').innerText));
  return R; }"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []; R = []
    pg = b.new_page(viewport={'width': 1280, 'height': 1000})
    pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    pg.goto(f'http://localhost:{PORT}/index.html?proof=refmkt'); pg.wait_for_timeout(1500)
    for s in (STUB, DATA, FAKE): pg.evaluate('s=>(0,eval)(s)', s)
    R += pg.evaluate(T)
    pg.evaluate("()=>{ window.__as('krystal@mo-care.com','Krystal Land'); switchTab('referrers'); }"); pg.wait_for_timeout(300)
    if SHOTS:
        pg.screenshot(path=os.path.join(SHOTS, 'desktop.png'), full_page=False)
        pg.evaluate("()=>document.getElementById('referrersWrap').scrollIntoView()"); pg.wait_for_timeout(150)
        pg.screenshot(path=os.path.join(SHOTS, 'desktop-directory.png'))
        pg.evaluate("()=>switchTab('friendsfamily')"); pg.wait_for_timeout(200); pg.evaluate("()=>window.scrollTo(0,0)")
        pg.screenshot(path=os.path.join(SHOTS, 'desktop-friends-family.png'))
    ph = b.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True)
    ph.on('pageerror', lambda e: errs.append('phone: ' + str(e)[:300]))
    ph.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    ph.goto(f'http://localhost:{PORT}/index.html?proof=refmkt'); ph.wait_for_timeout(1500)
    for s in (STUB, DATA, FAKE): ph.evaluate('s=>(0,eval)(s)', s)
    w = ph.evaluate("""async()=>{ document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
      window.__as('krystal@mo-care.com','Krystal Land'); switchTab('referrers'); await new Promise(r=>setTimeout(r,400));
      const tr=document.querySelector('#pdirTable tr[data-org="mercy"]'), wide=[...document.querySelectorAll('#tab-referrers *')].filter(e=>e.getBoundingClientRect().right>window.innerWidth+2 && getComputedStyle(e).position!=='fixed').map(e=>e.id||e.className||e.tagName).slice(0,5);
      return { page:document.documentElement.scrollWidth, vw:window.innerWidth, rowBlock:getComputedStyle(tr).display, head:getComputedStyle(document.querySelector('#pdirTable thead')).display,
               label:getComputedStyle(tr.querySelector('td[data-l="Responsible"]'),'::before').content, wide }; }""")
    R.append(['PASS' if w['page'] <= w['vw'] + 1 else 'FAIL', 'phone width: the page never scrolls sideways', str(w)])
    R.append(['PASS' if w['rowBlock'] == 'block' and w['head'] == 'none' and 'Responsible' in w['label'] else 'FAIL', 'phone width: each partner is its own card, every value labelled', str(w)])
    if SHOTS:
        ph.evaluate("()=>document.getElementById('referrersWrap').scrollIntoView()"); ph.wait_for_timeout(150)
        ph.screenshot(path=os.path.join(SHOTS, 'phone-directory.png'))
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', str(errs[:3])]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

"""The Referral Partner Desk, Step 2 (2026-10-08), in the real Hub page offline with made-up partners: This week (mine and
everyone), Needs an owner, linking referrals, Log a visit (phone too), the partner profile (owner, potential, details,
people), who referred on a lead, Today's counted lines, the one weekly My Work card, and Settings.
(python3 tests/browser/partner_desk_look.py [port], static server on 8765 by default)"""
import os, sys
from playwright.sync_api import sync_playwright
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'client_journey_look.py')).read()
ns = {'__file__': os.path.abspath(__file__)}; exec(src[:src.rindex('with sync_playwright() as pw:')], ns)
STUB, DATA = ns['STUB'], ns['DATA']
PORT = sys.argv[1] if len(sys.argv) > 1 else '8765'
FAKE = r"""
(()=>{
  const W=window, D=(n)=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago'}).format(new Date(Date.now()+n*864e5));
  W.__P=[]; W.__TK=[];
  (0,eval)("persist=async(k,i)=>{ window.__P.push([k,JSON.parse(JSON.stringify(i))]); }");
  (0,eval)("tkMerge=async(apply,what)=>{ const m=JSON.parse(JSON.stringify(DATA.ops_settings||{})); const lines=apply(m); window.__TK.push({ m, lines, what }); DATA.ops_settings=m; return {}; }");
  (0,eval)("ccToast=(m)=>{ window.__toast=m; }");
  (0,eval)("dkQuickJot=async(t,n,l)=>{ window.__jot=[t,n,l]; }");
  DATA.ops_settings=Object.assign({}, DATA.ops_settings||{}, { partner_desk:{ since:'2026-10-08', default_owner:'sam@mo-care.com' } });
  DATA.referral_orgs=[
    { id:'mercy', name:'Mercy Hospital', type:'Hospital', phone:'417-555-0100', created_at:'2025-01-10T00:00:00Z', owner_email:'krystal@mo-care.com', best_visit_times:'Tue/Thu after 2',
      contacts:[{ id:'c1', name:'Lisa Marsh', role:'discharge planner', phone:'417-555-0111', email:'lisa@mercy.net' }] },
    { id:'fount', name:'The Fountains', type:'Assisted Living', created_at:'2025-03-01T00:00:00Z', people:'Dana at the front desk' },
    { id:'quiet', name:'Quiet Clinic', type:'Physician Office', created_at:'2024-01-01T00:00:00Z' },
    { id:'newp', name:'Ozark Rehab', type:'Rehab / Skilled Nursing', created_at:'2026-10-20T12:00:00Z' }];
  DATA.referral_activities=[{ id:'a1', org_id:'mercy', kind:'dropby', at:D(-20)+'T15:00:00Z' }, { id:'a2', org_id:'fount', kind:'dropby', at:D(-50)+'T15:00:00Z' }];
  DATA.activities=[];
  DATA.leads=(DATA.leads||[]).concat([
    { id:'R1', first_name:'R.A.', source:'Referral', referral_org_id:'mercy', referral_source_name:'Mercy Hospital', referrer:{ name:'Lisa Marsh', phone:'417-555-0111' }, created_at:D(0)+'T10:00:00Z', status:'New' },
    { id:'U1', first_name:'J.K.', source:'Referral', referral_source_name:'St Johns', created_at:D(-3)+'T10:00:00Z', status:'New' },
    { id:'U2', first_name:'B.C.', source:'Referral', referral_source_name:'St. Johns', created_at:D(-2)+'T10:00:00Z', status:'New' }]);
  DATA.ops_items=DATA.ops_items||[];
})();
"""
T = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  const P=()=>window.__P, last=(k)=>P().filter(x=>x[0]===k).slice(-1)[0];
  window.__as('krystal@mo-care.com','Krystal Land'); CC_ROLE_BY_EMAIL['sam@mo-care.com']=['owner_admin'];
  switchTab('referrers'); await sleep(300);
  const desk=()=>document.getElementById('refDesk');
  ok('Krystal\'s week: Mercy, her partner, first ("sent a referral this week: say thank you"), with its tier', /This week/.test(desk().innerText) && /Mercy Hospital/.test(desk().innerText) && /say thank you/.test(desk().innerText) && desk().querySelector('.pd-pill'), desk().innerText.slice(0,500));
  ok('...not Samantha\'s partners, and no Mine/Everyone switch or owner queue for a Care Coordinator', ![...desk().querySelectorAll('.pd-row .pd-main b')].some(b=>/Quiet Clinic|The Fountains/.test(b.textContent)) && !/Everyone/.test(desk().innerText) && !/Needs an owner/.test(desk().innerText), desk().innerText);
  ok('...urgent referrals are said to stay on the Leads board', /Urgent referrals are never here/.test(desk().innerText));
  ok('Link these referrals: "St Johns" and "St. Johns" are one group of 2', /Link these referrals to a partner/.test(desk().innerText) && /St Johns[\s\S]*2 referrals/.test(desk().innerText), desk().innerText);
  /* Log a visit */
  [...desk().querySelectorAll('button')].find(b=>/Log visit/.test(b.textContent)).click(); await sleep(150);
  const dlg=()=>document.querySelector('.pd-dlg');
  ok('Log a visit: what, who (her people), what happened, the next touch (pre-filled from the tier timing)', dlg() && /Lisa Marsh, discharge planner/.test(dlg().innerText) && document.getElementById('pdNext').value, dlg()&&dlg().innerText);
  document.getElementById('pdSave').click(); await sleep(150);
  ok('...a line about it is required', /Write a line about it/.test(dlg().innerText) && !last('referral_activities'));
  document.getElementById('pdWhoSaw').value='c1'; document.getElementById('pdNote').value='Dropped off brochures'; document.getElementById('pdSave').click(); await sleep(400);
  const ra=last('referral_activities'), nx=last('activities');
  ok('...saved: the same touch log as before (with who), and the next touch on Today', ra && ra[1].org_id==='mercy' && ra[1].contact_id==='c1' && /Lisa Marsh: Dropped off brochures/.test(ra[1].note) && nx && nx[1].org_id==='mercy' && nx[1].due, [ra, nx]);
  /* Plan it: onto my own desk */
  [...desk().querySelectorAll('button')].find(b=>/Plan it/.test(b.textContent)).click(); await sleep(200);
  ok('Plan it: a line on my own desk (My Desk)', window.__jot && /^Visit /.test(window.__jot[0]), window.__jot);
  /* Today + the weekly card */
  window.__P.length=0; renderMyDay(); await sleep(400);
  const md=document.getElementById('myDayList');
  ok('Today: "Partner visits this week" counted (nothing stored for it)', md && /Partner visits this week: 1/.test(md.innerText), md&&md.innerText.slice(0,400));
  const card=DATA.ops_items.filter(x=>x.kind==='partner_week');
  ok('...one weekly My Work card for Krystal, fixed id, "Your partner outreach this week (1)"', card.length===1 && /^ops_pw_krystal_\d{8}$/.test(card[0].id) && card[0].owner==='krystal@mo-care.com' && /this week \(1\)/.test(card[0].title) && card[0].status==='open', card);
  await pdEnsureWeeklyCard(true);
  ok('...asking again never makes a second one', DATA.ops_items.filter(x=>x.kind==='partner_week').length===1);
  ok('My Work knows the card kind', OPS_KINDS.partner_week && /Partner outreach/.test(OPS_KINDS.partner_week.label));
  /* the owner */
  window.__as('sam@mo-care.com','Samantha Owner'); switchTab('referrers'); await sleep(300);
  ok('Samantha: her partners (existing ones default to her), the Mine/Everyone switch, and Needs an owner', /The Fountains/.test(desk().innerText) && /Quiet Clinic/.test(desk().innerText) && /Everyone/.test(desk().innerText) && /Needs an owner[\s\S]*Ozark Rehab/.test(desk().innerText), desk().innerText.slice(0,700));
  pdWho('all'); await sleep(100);
  ok('...Everyone shows Krystal\'s too, with the owner\'s name', /Mercy Hospital[\s\S]*Krystal/.test(desk().innerText));
  document.getElementById('pdOwn_newp').value='krystal@mo-care.com'; [...desk().querySelectorAll('button')].find(b=>/Assign/.test(b.textContent)).click(); await sleep(300);
  const asg=last('referral_orgs');
  ok('Assign: the new partner gets its owner (who and when kept)', asg && asg[1].id==='newp' && asg[1].owner_email==='krystal@mo-care.com' && asg[1].owner_assigned_by==='sam@mo-care.com', asg);
  /* link the St Johns group */
  const i=0; const sel=document.getElementById('pdLink_0'); sel.value='fount';
  const oc=window.confirm; window.confirm=()=>true; [...desk().querySelectorAll('button')].find(b=>/^Link$/.test(b.textContent.trim())).click(); await sleep(400); window.confirm=oc;
  ok('Link: both St Johns referrals now count for the partner picked', DATA.leads.filter(l=>['U1','U2'].includes(l.id)).every(l=>l.referral_org_id==='fount'), DATA.leads.filter(l=>['U1','U2'].includes(l.id)));
  /* the profile */
  openRefProfile('fount'); await sleep(300);
  const pc=document.querySelector('.pd-prof');
  ok('Profile: owner, tier and why, potential, best way to reach, visit times, materials, relationship notes, people (the old note shown)', pc && /Relationship/.test(pc.innerText) && document.getElementById('pdOwner') && document.getElementById('pdPot') && /The old note says: Dana/.test(pc.innerText), pc&&pc.innerText.slice(0,500));
  document.getElementById('pdPot').value='high'; document.getElementById('pdMat').value='20 brochures'; document.getElementById('pdOwner').value='angie@mo-care.com';
  [...pc.querySelectorAll('button')].find(b=>/^Save$/.test(b.textContent)).click(); await sleep(300);
  const sv=last('referral_orgs');
  ok('...saved: potential (with when, so priority timing starts), materials, and the owner', sv && sv[1].potential==='high' && sv[1].potential_set_at && sv[1].materials==='20 brochures' && sv[1].owner_email==='angie@mo-care.com', sv);
  pdPerson('fount'); await sleep(100);
  document.getElementById('pcName').value='Dana Cole'; document.getElementById('pcRole').value='community liaison'; document.getElementById('pcPhone').value='417-555-0144'; document.getElementById('pcSave').click(); await sleep(300);
  ok('...add a person: kept on the partner, with role and phone', (last('referral_orgs')[1].contacts||[]).some(c=>c.name==='Dana Cole' && c.role==='community liaison'), last('referral_orgs'));
  /* who referred, on the lead */
  const h=pdLeadWhoHtml(DATA.leads.find(l=>l.id==='R1'), DATA.referral_orgs.find(o=>o.id==='mercy'));
  ok('A lead: "Who referred", with the one exact match offered ("It\'s Lisa Marsh (same phone)")', /Who referred/.test(h) && /It's Lisa Marsh \(same phone\)/.test(h), h);
  /* settings */
  switchTab('settings'); await sleep(200); pdSetFill();
  const sb=document.getElementById('pdSet');
  ok('Settings: tier timing, tier rules, default owner and the towns (her service area by default)', sb && document.getElementById('pdsA').value==='14' && document.getElementById('pdsC').value==='42' && /Springfield[\s\S]*Strafford/.test(document.getElementById('pdsTowns').value), sb&&sb.innerText.slice(0,300));
  document.getElementById('pdsA').value='0'; pdSetSave(); await sleep(100);
  ok('...a number outside 1 to 3650 is refused', /between 1 and 3650/.test(document.getElementById('pdSetMsg').textContent) && !window.__TK.length);
  document.getElementById('pdsA').value='10'; await pdSetSave(); await sleep(100);
  ok('...saved through the logged settings save, keeping when the desk started', window.__TK.length===1 && window.__TK[0].m.partner_desk.cadence.A===10 && window.__TK[0].m.partner_desk.since==='2026-10-08' && /A 10d/.test(window.__TK[0].lines[0]), window.__TK);
  window.__as('krystal@mo-care.com','Krystal Land'); pdSetFill();
  ok('...a Care Coordinator sees them but can\'t change them', document.getElementById('pdsA').disabled && /Only an owner/.test(document.getElementById('pdSet').innerText));
  return R; }"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []
    pg = b.new_page(viewport={'width': 1280, 'height': 1000})
    pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    pg.goto(f'http://localhost:{PORT}/index.html?proof=pdesk'); pg.wait_for_timeout(1500)
    for s in (STUB, DATA, FAKE): pg.evaluate('s=>(0,eval)(s)', s)
    R = pg.evaluate(T)
    # the phone
    ph = b.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True)
    ph.on('pageerror', lambda e: errs.append(str(e)[:300]))
    ph.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    ph.goto(f'http://localhost:{PORT}/index.html?proof=pdesk'); ph.wait_for_timeout(1500)
    for s in (STUB, DATA, FAKE): ph.evaluate('s=>(0,eval)(s)', s)
    w = ph.evaluate("""async()=>{ document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; window.__as('krystal@mo-care.com','Krystal Land');
      switchTab('referrers'); await new Promise(r=>setTimeout(r,300)); const d=document.getElementById('refDesk'), k=document.getElementById('refKpis');
      pdLogOpen('mercy'); await new Promise(r=>setTimeout(r,150)); const g=document.querySelector('.pd-dlg').getBoundingClientRect();
      return { sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth, deskW:d.getBoundingClientRect().width, kpiCols:getComputedStyle(k).gridTemplateColumns.split(' ').length, dlgW:g.width }; }""")
    R.append(['PASS' if w['sw'] <= w['cw'] + 1 and w['kpiCols'] <= 2 and w['dlgW'] <= 390 else 'FAIL', 'on a phone (390 wide): no sideways scroll, the tiles fold to 2 columns, Log a visit fits the screen', str(w)])
    ph.screenshot(path='/tmp/pd_phone_log.png'); pg.screenshot(path='/tmp/pd_desk.png')
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

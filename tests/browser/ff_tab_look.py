"""Friends & Family tab (step 4, Samantha 2026-10-27: "owners-only tab"), in the real Hub page offline with made-up people and a
fake ff-invite-check: an owner sees the two switches, today's list (Ready / Waiting / Held, search), Skip with a reason and Undo
skip, who was invited (with Resend), Payer needed, and referrals received from the Hub's inquiries; a Care Coordinator sees only
"Owners run this program"; Friends & Family people stay out of the professional Program view; phone width.
(PORT=<port> SHOTS=<folder> python3 tests/browser/ff_tab_look.py, static server on that port, 8765 by default)"""
import os
from playwright.sync_api import sync_playwright
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'client_journey_look.py')).read()
ns = {'__file__': os.path.abspath(__file__)}; exec(src[:src.rindex('with sync_playwright() as pw:')], ns)
STUB, DATA = ns['STUB'], ns['DATA']
PORT = os.environ.get('PORT', '8765'); SHOTS = os.environ.get('SHOTS', '')
FAKE = r"""
(()=>{
  const W=window; W.__calls=[]; W.__alert=[]; W.__prompt='She asked us not to';
  (0,eval)("ccToast=(m)=>{ window.__toast=m; }");
  W.ccConfirm=async()=>true; (0,eval)('ccConfirm=window.ccConfirm');
  W.prompt=()=>W.__prompt; W.alert=(m)=>{ W.__alert.push(m); };
  const run={ run_day:'2026-11-20', ran_at:'2026-11-20T15:21:00Z', ok:true, problems:[], sent:0, summary:{},
    people:[
      { kind:'caregiver', key:'cg_1', name:'Ann Able', status:'ready', why:[], channels:['text','email'] },
      { kind:'caregiver', key:'cg_5', name:'Eve East', status:'ready', why:['Email only: said no to texts on their application'], channels:['email'] },
      { kind:'caregiver', key:'cg_2', name:'Bea Best', status:'waiting', why:['Active since Nov 1: 30 days on Dec 1'], channels:['text','email'], ready_on:'2026-12-01' },
      { kind:'family', key:'fam_1', name:'Dana Ridge', client:'Rose Ridge', client_ax:'101', status:'ready', why:[], channels:['email'], payer:'Private pay', invited:{ status:'sent', at:'2026-11-19T15:22:00Z' } },
      { kind:'family', key:'fam_10', name:'Gina Gold', client:'Gil Gold', client_ax:'107', status:'held', why:['Open red shift-note flag (Nov 18)'], channels:[] },
      { kind:'family', key:'fam_11', name:'Hank Hart', client:'Hal Hart', client_ax:'108', status:'held', why:['Payer needed: no payer on the inquiry or in AxisCare'], channels:[] },
      { kind:'family', key:'fam_12', name:'Hope Hart', client:'Hal Hart', client_ax:'108', status:'held', why:['Payer needed: no payer on the inquiry or in AxisCare'], channels:[] },
      { kind:'caregiver', key:'cg_9', name:'Ida Ivy', status:'held', why:['Skipped: moving away (Sam Boss)'], channels:[] },
      { kind:'client', key:'cl_113', name:'Lu Lark', client:'Lu Lark', status:'held', why:['No family email on file'], channels:[] }] };
  const invites=[{ person_key:'fam_1', kind:'family', name:'Dana Ridge', client_name:'Rose Ridge', code:'DANA-K7', status:'sent', channels:[{ channel:'email', ok:true }], last_sent_at:'2026-11-19T15:22:00Z', sends:1 },
    { person_key:'cg_3', kind:'caregiver', name:'Cal Cole', code:'CAL-M4', status:'partial', channels:[{ channel:'text', ok:true }, { channel:'email', ok:false, why:'GoHighLevel did not take it' }], last_sent_at:'2026-11-19T15:23:00Z', sends:1 }];
  const rewards=[
    { lead_id:'R1', client_name:'Nora New', status:'ready', amount:100, referrer:'Dana Ridge', referrer_kind:'family', referrer_client:'Rose Ridge', first_visit:'2026-10-20', hours:24, payment_checked_at:'2026-11-20T16:00:00Z', payment_checked_by:'Samantha Owner', reasons:[], words:'Ready for approval' },
    { lead_id:'R2', client_name:'Opal Able', status:'under_review', amount:100, referrer:'Ann Able', referrer_kind:'caregiver', first_visit:'2026-10-21', hours:25, payment_checked_at:'2026-11-20T16:00:00Z', reasons:['the caregiver shares a last name with the client or the caller (maybe their own relative)'], words:'Under review: the caregiver shares a last name with the client or the caller (maybe their own relative)' },
    { lead_id:'R3', client_name:'Few Hours', status:'on_the_way', amount:100, referrer:'Ann Able', referrer_kind:'caregiver', first_visit:'2026-10-25', hours:12, reasons:['the new client pays with long-term care insurance (reviewed separately)'], words:'12 of 20 hours · payment not checked yet' },
    { lead_id:'R4', client_name:'Carl Credit', status:'approved', amount:100, referrer:'Dana Ridge', referrer_kind:'family', referrer_client:'Rose Ridge', first_visit:'2026-10-01', hours:30, payment_checked_at:'2026-11-01T16:00:00Z', words:'Approved' },
    { lead_id:'R5', client_name:'Pam Paid', status:'paid', amount:100, referrer:'Ann Able', referrer_kind:'caregiver', first_visit:'2026-09-20', hours:40, done_on:'2026-11-13', words:'Paid on the 2026-11-13 payroll' },
    { lead_id:'R6', client_name:'Tess Tick', status:'on_the_way', amount:100, referrer:'Dana Ridge', referrer_kind:'family', referrer_client:'Rose Ridge', first_visit:'2026-10-26', hours:22, reasons:[], words:'20 of 20 hours (22 so far) · payment not checked yet' }];
  W.__ff={ ok:true, run, invites, rewards, amount:100, min_hours:20, switches:{ live:false, paused:false, log:[] }, cap:60 };
  sb.functions={ invoke: async (name, o)=>{ W.__calls.push([name, JSON.parse(JSON.stringify(o.body||{}))]);
    const b=o.body||{};
    if(name!=='ff-invite-check') return { data:null, error:{ message:'unexpected '+name } };
    if(b.action==='list') return { data: JSON.parse(JSON.stringify(W.__ff)), error:null };
    if(b.action==='switch'){ W.__ff.switches[b.name==='ff_invites_live'?'live':'paused']=b.on; W.__ff.switches.log=[{ at:'2026-11-20T16:00:00Z', by:'Samantha Owner', name:b.name, on:b.on }]; return { data:{ ok:true }, error:null }; }
    if(b.action==='resend' && b.key==='cg_3') return { data:null, error:{ message:'x', context:{ json: async()=>({ error:'Invitations are off. Turn them on first.' }) } } };
    return { data:{ ok:true }, error:null }; } };
  DATA.referral_orgs=[{ id:'mercy', name:'Mercy Rehab', partner_code:'MERCY-K7', program_status:'active' },
    { id:'ff_fam_1', name:'Dana Ridge', type:'Friends & Family', program_track:'friends', program_status:'active', partner_code:'DANA-K7', ff_key:'fam_1', ff_kind:'family', ff_client:'Rose Ridge' }];
  DATA.leads=(DATA.leads||[]).concat([{ id:'FF1', first_name:'Pat', last_name:'Neighbor', source:'Referral', referral_org_id:'ff_fam_1', status:'New', created_at:'2026-11-19T18:00:00Z' },
    { id:'FF2', first_name:'Mo', last_name:'Mercy', source:'Referral', referral_org_id:'mercy', status:'New', created_at:'2026-11-19T18:00:00Z' }]);
})();
"""
T = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  const tab=()=>document.getElementById('tab-friendsfamily'), txt=()=>tab().innerText, q=s=>tab().querySelector(s), qa=s=>[...tab().querySelectorAll(s)];
  const cardTitles=()=>qa('.ff-card>h3').map(h=>h.childNodes[0].textContent.trim());
  /* a Care Coordinator */
  window.__as('krystal@mo-care.com','Krystal Land'); CC_ROLE_BY_EMAIL['krystal@mo-care.com']=['care_coordinator']; (0,eval)("CC_ROLES=CC_ROLE_BY_EMAIL['krystal@mo-care.com']");
  switchTab('friendsfamily'); await sleep(900);
  ok('a Care Coordinator sees only "Owners run this program": no names, no switches, no buttons, no server call', /Owners run this program/.test(txt()) && !/Ann Able|Dana|Invitations/.test(txt()) && !tab().querySelectorAll('button,input').length && !window.__calls.length, [txt(), window.__calls]);
  /* the owner */
  window.__as('sam@mo-care.com','Samantha Owner'); switchTab('mywork'); await sleep(100); switchTab('friendsfamily'); await sleep(500);
  ok('an owner: the tab asks the server for the list', window.__calls.some(c=>c[0]==='ff-invite-check' && c[1].action==='list'), window.__calls);
  /* one status card */
  ok('one status card says plainly "Invitations are OFF" and what that means, with real buttons (no tiny check boxes)', /Invitations are OFF/.test(q('#ffTop').innerText) && /Nobody is invited/.test(q('#ffTop').innerText) && /Turn invitations on/.test(q('#ffTop').innerText) && /Pause program/.test(q('#ffTop').innerText) && !q('#ffTop input'), q('#ffTop').innerText);
  /* four views, one at a time */
  const views=qa('.ff-views button').map(b=>b.innerText.replace(/\s+/g,' ').trim());
  ok('four views, each with a count: Needs you 6 (red), Invitations 3, $100 rewards 5, Referrals 1', JSON.stringify(views.map(v=>v.replace(/\s/g,'')))===JSON.stringify(['Needsyou6','Invitations3','$100rewards5','Referrals1']) && q('.ff-views button[data-v="needs"] .ff-n.hot'), views);
  ok('it opens on Needs you, and only that view is on the page', q('.ff-views button[data-v="needs"]').getAttribute('aria-selected')==='true' && !q('#ffList') && !q('#ffRewards'));
  ok('Needs you: one card per kind of job, each with a plain heading', JSON.stringify(cardTitles())===JSON.stringify(['Ready to approve','Under review','Tick when payment is received','Apply the credit or pay the bonus','Invitations that didn’t go through','Payer needed']), cardTitles());
  const rw=id=>q('.ff-row[data-rw="'+id+'"]'), rt=id=>rw(id).innerText;
  ok('a reward row reads in order: name, one status, who referred and where the $100 goes, then the two checks', /^Nora New\s*Referred by/.test(rt('R1')) && /Referred by Dana Ridge \(family of Rose Ridge\) · \$100 credit on Rose Ridge’s invoice · first visit Oct 20/.test(rt('R1')) && /✓ 20 hours \(24 so far\)/.test(rt('R1')) && /Payment received \(Samantha Owner\)/.test(rt('R1')) && rw('R1').querySelector('input').checked, rt('R1'));
  ok('...no status chip repeating the card heading', !rw('R1').querySelector('.ff-chip') && !rw('R6').querySelector('.ff-chip'), rt('R6'));
  ok('...Opal: Under review with the reason under her name, and the bonus going on Ann\'s paycheck', /maybe their own relative/.test(rt('R2')) && /\$100 bonus on Ann Able’s paycheck/.test(rt('R2')) && /Approve anyway/.test(rt('R2')), rt('R2'));
  ok('...Tess: 22 hours, payment not ticked yet, in "Tick when payment is received"', /✓ 20 hours \(22 so far\)/.test(rt('R6')) && !rw('R6').querySelector('input').checked, rt('R6'));
  ok('...Carl: approved, "Mark credit applied"', /Mark credit applied/.test(rt('R4')));
  ok('...Cal\'s invitation that partly went: what didn\'t go, and Resend', /Cal Cole[\s\S]*Partly sent[\s\S]*Email didn’t go \(GoHighLevel did not take it\)/.test(q('.ff-row[data-inv="cg_3"]').innerText) && /Resend/.test(q('.ff-row[data-inv="cg_3"]').innerText));
  const pay=document.getElementById('ffPayer').innerText;
  ok('...Payer needed: Hal Hart once (two family members, one client), with what to do', (pay.match(/Hal Hart/g)||[]).length===1 && /Set it on their inquiry/.test(pay) && /No payer on the inquiry/.test(pay), pay);
  window.ccConfirm=async()=>true; (0,eval)('ccConfirm=window.ccConfirm');
  window.__calls=[]; const cb=rw('R6').querySelector('input'); cb.checked=true; cb.dispatchEvent(new Event('change')); await sleep(250);
  ok('ticking "Payment received" goes to the server', window.__calls.some(c=>c[1].action==='reward' && c[1].lead_id==='R6' && c[1].op==='payment' && c[1].on===true), window.__calls);
  window.__calls=[]; [...rw('R1').querySelectorAll('button')].find(b=>b.textContent==='Approve').click(); await sleep(250);
  ok('Approve asks first, then approves on the server', window.__calls.some(c=>c[1].action==='reward' && c[1].lead_id==='R1' && c[1].op==='approve' && !c[1].why), window.__calls);
  window.__calls=[]; window.__prompt='  '; FFT.reward('R2','approve','why'); await sleep(200);
  ok('Approve anyway without a reason is not sent', !window.__calls.some(c=>c[1].action==='reward'), window.__calls);
  window.__calls=[]; window.__prompt='Not related, checked with Ann'; FFT.reward('R2','approve','why'); await sleep(250);
  ok('...with a reason it is sent with the reason', window.__calls.some(c=>c[1].op==='approve' && c[1].why==='Not related, checked with Ann'), window.__calls);
  window.__calls=[]; window.__prompt='2026-11-21'; [...rw('R4').querySelectorAll('button')].find(b=>/Mark credit applied/.test(b.textContent)).click(); await sleep(250);
  ok('Mark credit applied asks for the date it went on the invoice, then saves it', window.__calls.some(c=>c[1].op==='done' && c[1].lead_id==='R4' && c[1].date==='2026-11-21'), window.__calls);
  window.__calls=[]; window.__prompt='next week'; FFT.reward('R4','done',true); await sleep(200);
  ok('...a date that isn\'t a date is not sent', !window.__calls.some(c=>c[1].op==='done'), window.__calls);
  window.__calls=[]; window.__prompt='A returning client'; FFT.reward('R3','not_earned'); await sleep(250);
  ok('Not earned asks why and sends it', window.__calls.some(c=>c[1].op==='not_earned' && c[1].why==='A returning client'), window.__calls);
  window.__calls=[]; q('.ff-row[data-inv="cg_3"] button').click(); await sleep(300);
  ok("Resend asks first, then says the server's answer (here: Invitations are off)", window.__calls.some(c=>c[1].action==='resend' && c[1].key==='cg_3') && /Invitations are off/.test(window.__toast||''), [window.__calls, window.__toast]);
  /* Invitations view */
  FFT.view('invites'); await sleep(80);
  const keys=()=>qa('.ff-row[data-key]').map(r=>r.dataset.key);
  const fl=qa('.ff-filters button').map(b=>b.innerText.trim());
  ok('Invitations: one list with four filters and counts: Ready to invite (3), Waiting (1), Held (4), Invited (2)', JSON.stringify(fl)===JSON.stringify(['Ready to invite (3)','Waiting (1)','Held (4)','Invited (2)']) && !q('#ffRewards'), fl);
  ok("...opens on Ready to invite: Ann, Dana, Eve", JSON.stringify(keys())==='["cg_1","fam_1","cg_5"]', keys());
  const ann=q('.ff-row[data-key="cg_1"]').innerText, dana=q('.ff-row[data-key="fam_1"]').innerText;
  ok('...Ann: Caregiver · By text and email, a Skip button', /Caregiver · By text and email/.test(ann) && /Skip/.test(ann), ann);
  ok('...Dana: Family of Rose Ridge · Private pay · By email · invited Nov 19, no Skip', /Family of Rose Ridge · Private pay · By email · invited Nov 19/.test(dana) && !/Skip/.test(dana), dana);
  FFT.show('held'); await sleep(80);
  ok('Held: each with the reason; a skipped person shows the reason and Undo skip', /Open red shift-note flag/.test(txt()) && /Skipped: moving away \(Sam Boss\)/.test(q('.ff-row[data-key="cg_9"]').innerText) && /Undo skip/.test(q('.ff-row[data-key="cg_9"]').innerText), txt());
  FFT.show('waiting'); await sleep(80);
  ok('Waiting: Bea, with the date she is ready', JSON.stringify(keys())==='["cg_2"]' && /30 days on Dec 1/.test(txt()));
  FFT.show('invited'); await sleep(80);
  ok('Invited: Dana sent (with her link code), Cal partly sent', qa('.ff-row[data-inv]').length===2 && /DANA-K7/.test(q('.ff-row[data-inv="fam_1"]').innerText), qa('.ff-row[data-inv]').map(r=>r.innerText));
  FFT.show('held'); FFT.search('hart'); await sleep(80);
  ok('search (the box keeps focus)', JSON.stringify(keys())==='["fam_11","fam_12"]' && document.activeElement && document.activeElement.id==='ffQ', [keys(), document.activeElement && document.activeElement.id]);
  FFT.search(''); FFT.show('ready'); await sleep(80);
  window.__calls=[]; window.__prompt='She asked us not to'; q('.ff-row[data-key="cg_1"] button').click(); await sleep(300);
  ok('Skip asks why and sends it to the server with the name', window.__calls.some(c=>c[1].action==='skip' && c[1].key==='cg_1' && c[1].why==='She asked us not to' && c[1].name==='Ann Able'), window.__calls);
  window.__calls=[]; window.__prompt='  '; FFT.skip('cg_5','Eve East'); await sleep(200);
  ok('...a Skip without a reason is not sent', !window.__calls.some(c=>c[1].action==='skip'), window.__calls);
  FFT.show('held'); await sleep(60); window.__calls=[]; q('.ff-row[data-key="cg_9"] button').click(); await sleep(250);
  ok('Undo skip goes to the server', window.__calls.some(c=>c[1].action==='unskip' && c[1].key==='cg_9'), window.__calls);
  /* Rewards view */
  FFT.view('rewards'); await sleep(80);
  ok('$100 rewards: grouped by stage, every group named even when empty', JSON.stringify(cardTitles())===JSON.stringify(['Ready to approve','Under review','Approved: apply the credit or pay the bonus','On the way','Done']), cardTitles());
  ok('...Done shows Pam: paid on the Nov 13 payroll, no buttons, no check boxes', /Paid on the Nov 13 payroll/.test(rt('R5')) && !rw('R5').querySelectorAll('button,input').length, rt('R5'));
  ok('...Few Hours (On the way): 12 so far, not ticked, what to look at once earned', /○ 20 hours \(12 so far\)/.test(rt('R3')) && /To look at once earned: the new client pays with long-term care insurance/.test(rt('R3')), rt('R3'));
  /* Referrals view */
  FFT.view('referrals'); await sleep(80);
  const refs=document.getElementById('ffRefs').innerText;
  ok("Referrals: Pat Neighbor, referred by Dana Ridge (family of Rose Ridge); a professional partner's referral is not here", /Pat Neighbor[\s\S]*Referred by Dana Ridge \(family of Rose Ridge\)/.test(refs) && !/Mo Mercy/.test(refs), refs);
  ok('no dollar amounts outside the reward rows (referrals, invitations)', !/\$\d/.test(document.getElementById('ffRefs').innerText));
  FFT.view('needs'); await sleep(60);
  /* the switches */
  window.__calls=[]; [...q('#ffTop').querySelectorAll('button')].find(b=>/Turn invitations on/.test(b.textContent)).click(); await sleep(400);
  ok('Turn invitations on asks first, then flips it on the server; the card turns green and says who did it', window.__calls.some(c=>c[1].action==='switch' && c[1].name==='ff_invites_live' && c[1].on===true) && /Invitations are ON/.test(q('#ffTop').innerText) && q('#ffTop').classList.contains('on') && /by Samantha Owner/.test(q('#ffTop').innerText), [window.__calls, q('#ffTop').innerText]);
  window.ccConfirm=async()=>false; (0,eval)('ccConfirm=window.ccConfirm'); window.__calls=[];
  [...q('#ffTop').querySelectorAll('button')].find(b=>/Pause program/.test(b.textContent)).click(); await sleep(250);
  ok('...saying No leaves it as it was', !window.__calls.some(c=>c[1].action==='switch') && /Invitations are ON/.test(q('#ffTop').innerText));
  ok('Friends & Family people are not in the professional Program view', PartnerLinksRules.inProgram(DATA.referral_orgs[0]) && !PartnerLinksRules.inProgram(DATA.referral_orgs[1]));
  return R; }"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []; R = []
    pg = b.new_page(viewport={'width': 1280, 'height': 1000})
    pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    pg.goto(f'http://localhost:{PORT}/index.html?proof=fftab'); pg.wait_for_timeout(1500)
    for s in (STUB, DATA, FAKE): pg.evaluate('s=>(0,eval)(s)', s)
    R += pg.evaluate(T)
    if SHOTS:
        for v, name in (('needs', '4a-needs-you'), ('invites', '4b-invitations'), ('rewards', '4c-rewards'), ('referrals', '4d-referrals')):
            pg.evaluate("v=>{ window.ccConfirm=async()=>true; window.__ff.switches.live=false; window.__ff.switches.log=[]; FFT.state.show='ready'; FFT.state.view=v; FFT.load(); window.scrollTo(0,0); }", v); pg.wait_for_timeout(400)
            pg.screenshot(path=os.path.join(SHOTS, name + '-desktop.png'), full_page=True)
    ph = b.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True)
    ph.on('pageerror', lambda e: errs.append('phone: ' + str(e)[:300]))
    ph.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    ph.goto(f'http://localhost:{PORT}/index.html?proof=fftab'); ph.wait_for_timeout(1500)
    for s in (STUB, DATA, FAKE): ph.evaluate('s=>(0,eval)(s)', s)
    w = ph.evaluate("""async()=>{ document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
      window.__as('sam@mo-care.com','Samantha Owner'); switchTab('friendsfamily'); await new Promise(r=>setTimeout(r,900));
      return { page:document.documentElement.scrollWidth, vw:window.innerWidth, rows:document.querySelectorAll('#tab-friendsfamily .ff-row').length }; }""")
    R.append(['PASS' if w['page'] <= w['vw'] + 1 and w['rows'] > 3 else 'FAIL', 'phone width: the tab shows its rows and never scrolls sideways', str(w)])
    if SHOTS: ph.screenshot(path=os.path.join(SHOTS, '5-friends-family-tab-phone.png'), full_page=True)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', str(errs[:3])]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

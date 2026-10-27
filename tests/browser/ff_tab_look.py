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
  W.__ff={ ok:true, run, invites, switches:{ live:false, paused:false, log:[] }, cap:60 };
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
  const tab=()=>document.getElementById('tab-friendsfamily'), txt=()=>tab().innerText;
  /* a Care Coordinator */
  window.__as('krystal@mo-care.com','Krystal Land'); CC_ROLE_BY_EMAIL['krystal@mo-care.com']=['care_coordinator']; (0,eval)("CC_ROLES=CC_ROLE_BY_EMAIL['krystal@mo-care.com']");
  switchTab('friendsfamily'); await sleep(900);
  ok('a Care Coordinator sees only "Owners run this program": no names, no switches, no buttons, no server call', /Owners run this program/.test(txt()) && !/Ann Able|Dana|Invitations/.test(txt()) && !tab().querySelectorAll('button,input').length && !window.__calls.length, [txt(), window.__calls]);
  /* the owner */
  window.__as('sam@mo-care.com','Samantha Owner'); switchTab('mywork'); await sleep(100); switchTab('friendsfamily'); await sleep(500);
  ok('an owner: the tab asks the server for the list', window.__calls.some(c=>c[0]==='ff-invite-check' && c[1].action==='list'), window.__calls);
  ok('...the two switches, both off, with what that means', document.getElementById('ffLive') && !document.getElementById('ffLive').checked && document.getElementById('ffPaused') && /Invitations OFF/.test(txt()) && /Nothing is sent while Invitations are off/.test(txt()), txt().slice(0,400));
  const tiles=[...tab().querySelectorAll('.ff-t')].map(t=>t.innerText.replace(/\s+/g,' '));
  ok('...tiles: 3 ready, 1 waiting, 4 held (the client-only row not counted), 2 invited', JSON.stringify(tiles)===JSON.stringify(['3 Ready today','1 Waiting','4 Held','2 Invited so far']), tiles);
  const keys=()=>[...tab().querySelectorAll('.ff-row[data-key]')].map(r=>r.dataset.key);
  ok("...today's list opens on Ready: Ann, Dana, Eve", JSON.stringify(keys())==='["cg_1","fam_1","cg_5"]', keys());
  const ann=tab().querySelector('.ff-row[data-key="cg_1"]').innerText, dana=tab().querySelector('.ff-row[data-key="fam_1"]').innerText;
  ok('...Ann: Caregiver, by Text and Email, with a Skip button', /Caregiver/.test(ann) && /Text and Email/.test(ann) && /Skip/.test(ann), ann);
  ok('...Dana: Family of Rose Ridge, private pay, already invited Nov 19, no Skip', /Family of Rose Ridge/.test(dana) && /Private pay/.test(dana) && /Invited Nov 19/.test(dana) && !/Skip/.test(dana), dana);
  FFT.show('held'); await sleep(80);
  ok('Held: each with the reason; a skipped person shows the reason and Undo skip', /Open red shift-note flag/.test(txt()) && /Skipped: moving away \(Sam Boss\)/.test(tab().querySelector('.ff-row[data-key="cg_9"]').innerText) && /Undo skip/.test(tab().querySelector('.ff-row[data-key="cg_9"]').innerText), txt());
  FFT.show('waiting'); await sleep(80);
  ok('Waiting: Bea, with the date she is ready', JSON.stringify(keys())==='["cg_2"]' && /30 days on Dec 1/.test(txt()));
  FFT.show('all'); FFT.search('hart'); await sleep(80);
  ok('search across the list (the box keeps focus)', JSON.stringify(keys())==='["fam_11","fam_12"]' && document.activeElement && document.activeElement.id==='ffQ', [keys(), document.activeElement && document.activeElement.id]);
  FFT.search(''); FFT.show('ready'); await sleep(80);
  window.__calls=[]; tab().querySelector('.ff-row[data-key="cg_1"] button').click(); await sleep(300);
  ok('Skip asks why and sends it to the server with the name', window.__calls.some(c=>c[1].action==='skip' && c[1].key==='cg_1' && c[1].why==='She asked us not to' && c[1].name==='Ann Able'), window.__calls);
  window.__calls=[]; window.__prompt='  '; FFT.skip('cg_5','Eve East'); await sleep(200);
  ok('...a Skip without a reason is not sent', !window.__calls.some(c=>c[1].action==='skip'), window.__calls);
  FFT.show('held'); await sleep(60); window.__calls=[]; tab().querySelector('.ff-row[data-key="cg_9"] button').click(); await sleep(250);
  ok('Undo skip goes to the server', window.__calls.some(c=>c[1].action==='unskip' && c[1].key==='cg_9'), window.__calls);
  const invRows=[...tab().querySelectorAll('.ff-row[data-inv]')].map(r=>r.innerText);
  ok('Invited: Dana sent, Cal partly sent with why the email did not go, each with Resend and their link code', invRows.length===2 && /Dana Ridge[\s\S]*Sent[\s\S]*DANA-K7[\s\S]*Email sent[\s\S]*Resend/.test(invRows[0]) && /Cal Cole[\s\S]*Partly sent[\s\S]*Text sent[\s\S]*Email did not go \(GoHighLevel did not take it\)/.test(invRows[1]), invRows);
  window.__calls=[]; tab().querySelector('.ff-row[data-inv="cg_3"] button').click(); await sleep(300);
  ok("Resend asks first, then says the server's answer (here: Invitations are off)", window.__calls.some(c=>c[1].action==='resend' && c[1].key==='cg_3') && /Invitations are off/.test(window.__toast||''), [window.__calls, window.__toast]);
  const pay=document.getElementById('ffPayer').innerText;
  ok('Payer needed: Hal Hart once (two family members, one client), with what to do', (pay.match(/Hal Hart/g)||[]).length===1 && /Set how they pay on their inquiry/.test(pay), pay.slice(0,300));
  const refs=document.getElementById('ffRefs').innerText;
  ok("Referrals received: Pat Neighbor, referred by Dana Ridge (family of Rose Ridge); a professional partner's referral is not here", /Pat Neighbor[\s\S]*Referred by Dana Ridge \(family of Rose Ridge\)/.test(refs) && !/Mo Mercy/.test(refs), refs);
  ok('no dollar amounts anywhere on the tab', !/\$\d/.test(txt()));
  window.__calls=[]; const live=document.getElementById('ffLive'); live.checked=true; live.dispatchEvent(new Event('change')); await sleep(400);
  ok('turning Invitations on asks first, then flips it on the server and shows who did it', window.__calls.some(c=>c[1].action==='switch' && c[1].name==='ff_invites_live' && c[1].on===true) && /Invitations ON/.test(txt()) && /by Samantha Owner/.test(txt()), [window.__calls, txt().slice(0,300)]);
  window.ccConfirm=async()=>false; (0,eval)('ccConfirm=window.ccConfirm'); window.__calls=[];
  const ps=document.getElementById('ffPaused'); ps.checked=true; ps.dispatchEvent(new Event('change')); await sleep(250);
  ok('...saying No leaves the switch as it was', !window.__calls.some(c=>c[1].action==='switch') && !document.getElementById('ffPaused').checked);
  /* the professional Program view never lists Friends & Family people */
  const rows=PartnerLinksRules.programRows ? PartnerLinksRules.programRows(DATA.referral_orgs, DATA.leads || []) : null;
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
        pg.evaluate("()=>{ window.ccConfirm=async()=>true; window.__ff.switches.live=false; window.__ff.switches.log=[]; FFT.show('ready'); FFT.load(); window.scrollTo(0,0); }"); pg.wait_for_timeout(400)
        pg.screenshot(path=os.path.join(SHOTS, '4-friends-family-tab-desktop.png'), full_page=True)
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

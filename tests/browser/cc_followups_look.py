"""My Work > Follow-ups (Samantha 2026-11-05: "Approve the Caring Companions Follow-ups plan as shown, with all six of your
picks. Build it in practice mode, switched off."). The real Hub page, offline, MADE-UP people only, with a fake cc-followups
server. Off: owners see "Follow-ups (practice)" next to Today, coordinators see nothing, missed call cards are made as before.
On: everyone sees "Follow-ups", no missed call cards. The table: columns, order, edges, the glance row and its bar, menus and
their memory, Who is this?, Need / Owner / Care or safety / Later / Done sending the right thing, banners, phone cards.
Saves screenshots to SHOTS (default /tmp/cfu_*.png).   (python3 tests/browser/cc_followups_look.py; serves this checkout)"""
import re, os, sys, threading, functools, http.server, socketserver
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
STUB = re.search(r'STUB = r"""(.*?)"""', open(os.path.join(HERE, 'standup_look.py')).read(), re.S).group(1)
SHOTS = os.environ.get('SHOTS', '/tmp/cfu_')
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.TCPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=ROOT)); PORT = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
SETUP = r"""async(mode)=>{
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  const owner = mode!=='staff';
  (0,eval)(owner ? "ME={ email:'samantha@mo-care.com', name:'Samantha Troutman' };" : "ME={ email:'krystal@mo-care.com', name:'Krystal Smith' };");
  CC_ROLES = owner ? ['owner_admin'] : ['care_coordinator']; CC_ROLES_CHECKED=true;
  window.ccIsOwner=()=>/samantha/.test(ME.email);
  window.ccActor=()=>({ email:ME.email, name:ME.name });
  try{ ['cfuF'].forEach(k=>localStorage.removeItem(k)); }catch(e){}
  DATA.ops_settings=Object.assign({}, DATA.ops_settings||{}, { cc_followups_live: mode==='live' });
  const ago=m=>new Date(Date.now()-m*60000).toISOString(), today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Chicago'});
  const plus=n=>{ const d=new Date(today+'T12:00:00'); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); };
  const NEEDS=[['schedule','Schedule or visit change'],['care','Care concern'],['billing','Billing'],['pay','Pay'],['hiring','Hiring'],['hours','Hours or availability'],['other','Other'],['not_sure','Not sure yet']].map(([key,label])=>({key,label}));
  const C=(o)=>Object.assign({ kind:'followup', line:'MO', events:[], need:'not_sure', needByHub:true, owner:null, urgent:false, urgentWhy:'', later:null, contactId:'ct1', conversationId:'cv1' }, o);
  window.__Q={ live: mode==='live', today, needs:NEEDS,
    people:[{ email:'angiel@mo-care.com', name:'Angiel Cruz' }, { email:'krystal@mo-care.com', name:'Krystal Smith' }, { email:'samantha@mo-care.com', name:'Samantha Troutman' }],
    state:{ last_run:ago(3) },
    cards:[
      C({ id:'1', phone10:'4175550148', name:'Joan Whitaker', role:'Family', person_kind:'family', detail:'Daughter of Ray Whitaker', since:ago(90), need:'care', owner:'angiel@mo-care.com', ownerVia:'Ray Whitaker\'s coordinator', urgent:true, urgentWhy:'The text says "fell".',
         events:[{ at:ago(90), kind:'missed', text:'Missed call. No voicemail.' }, { at:ago(88), kind:'voicemail', text:'Missed call. Voicemail, 52 seconds.' }, { at:ago(87), kind:'text', text:'Texted: "Dad fell last night"' }] }),
      C({ id:'2', phone10:'4175550192', name:'Doris Kemp', role:'Client', person_kind:'client', since:ago(60*26), need:'schedule', owner:'angiel@mo-care.com', events:[{ at:ago(60*26), kind:'text', text:'Texted: "Can Tuesday be 10?"' }] }),
      C({ id:'3', phone10:'4175550107', name:'Tasha Greene', role:'Caregiver', person_kind:'caregiver', since:ago(150), need:'pay', owner:'krystal@mo-care.com', ownerVia:'on the Staffing seat now', events:[{ at:ago(150), kind:'text', text:'Texted: "My check was short"' }] }),
      C({ id:'4', phone10:'5735550163', name:'Brianna Lowe', role:'Applicant', person_kind:'applicant', since:ago(37), need:'hiring', owner:'krystal@mo-care.com', events:[{ at:ago(37), kind:'voicemail', text:'Missed call. Voicemail, 30 seconds.' }] }),
      C({ id:'5', kind:'who_is_this', phone10:'8165550121', name:'Who is this?', detail:'GoHighLevel has this number as Pat Q', since:ago(11), owner:'krystal@mo-care.com', events:[{ at:ago(11), kind:'missed', text:'Missed call. No voicemail.' }] }),
      C({ id:'6', phone10:'4055550133', line:'OK', name:'Earl Toomey', role:'Client', person_kind:'client', since:ago(8), need:'billing', owner:'samantha@mo-care.com', events:[{ at:ago(8), kind:'text', text:'Texted: "Got a bill I don\'t understand"', line:'OK' }] }),
      C({ id:'7', phone10:'6605550139', name:'Phil Arnett', role:'Lead', person_kind:'lead', since:ago(60*50), need:'schedule', owner:'krystal@mo-care.com', later:plus(2), events:[{ at:ago(60*50), kind:'text', text:'Texted: "More hours next month?"' }] }) ],
    closedToday:[{ title:'Ruth Hale', done_by:'angiel@mo-care.com', why:'Called them back', at:ago(40) }] };
  window.__calls=[];
  window.CONFIG = window.CONFIG || {}; CONFIG.supabase_url = CONFIG.supabase_url || 'https://x.supabase.co'; CONFIG.supabase_anon_key = CONFIG.supabase_anon_key || 'anon';
  sb.auth.getSession = async()=>({ data:{ session:{ access_token:'tok' } } });
  const real = window.__realFetch || (window.__realFetch = window.fetch);
  window.fetch = async (url, o)=>{
    if(String(url).includes('/functions/v1/cc-followups')){
      const b = JSON.parse(o.body||'{}'); __calls.push(b);
      if(window.__fail) return new Response(JSON.stringify({ error:'GoHighLevel is not set up on the server' }), { status:500 });
      if(b.action==='queue') return new Response(JSON.stringify(__Q), { status:200 });
      if(b.action==='people') return new Response(JSON.stringify({ people:[{ ref:'person:c1', name:'Ray Whitaker', role:'Client' }, { ref:'lead:L9', name:'Phil Arnett', role:'Lead' }] }), { status:200 });
      return new Response(JSON.stringify({ ok:true }), { status:200 });
    }
    return real(url, o);
  };
  window.__fail=false;
  switchTab('mywork'); myWorkGo('today'); await new Promise(r=>setTimeout(r,80));
  return true;
}"""
T = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const tabs=()=>myWorkTabs({}).map(t=>t[0]+':'+t[1]);
  ok('practice, owner: "Follow-ups (practice)" sits right next to Today', tabs()[1]==='followups:Follow-ups (practice)', tabs());
  myWorkGo('followups'); await sleep(250);
  const W=()=>document.querySelector('.cfu')?document.querySelector('.cfu').innerText:'';
  ok('the practice banner says only owners see it and where to turn it on', /Practice, switched off/.test(W()) && /Owners Hub Admin page/.test(W()), W().slice(0,300));
  const heads=[...document.querySelectorAll('.cfu-t thead th')].map(x=>x.innerText.trim());
  ok('the columns', JSON.stringify(heads)===JSON.stringify(['Who','What came in','Need','Owner','When','Waiting','Call or text','Move it','Done']), heads);
  const rows=()=>[...document.querySelectorAll('.cfu-t tbody tr')];
  const names=rows().map(r=>r.querySelector('.cfu-name')?r.querySelector('.cfu-name').innerText:'');
  ok('care or safety first, later this week last', names[0]==='Joan Whitaker' && names[names.length-1]==='Phil Arnett' && names.length===7, names);
  ok('red edge on care or safety, gold on today, none on later', /cfu-now/.test(rows()[0].className) && /cfu-today/.test(rows()[1].className) && !/cfu-now|cfu-today/.test(rows()[6].className));
  const j=rows()[0].innerText;
  ok('Joan: daughter of Ray, all three events, why it is care or safety, waiting 1 h 30 m in red, Ray\'s coordinator', /Daughter of Ray Whitaker/.test(j) && /Voicemail, 52 seconds/.test(j) && /The text says "fell"/.test(j) && /1 h 3\d m/.test(j) && /Ray Whitaker's coordinator/.test(j), j);
  ok('Need and Owner are dropdowns with the saved values', document.getElementById('cfuNeed_1').value==='care' && document.getElementById('cfuOwner_1').value==='angiel@mo-care.com');
  const call=rows()[0].querySelector('a.cfu-b');
  ok('Call uses the Hub\'s office-line call (rings your phone first), Text opens their GoHighLevel conversation', call && call.getAttribute('data-oc-phone')==='4175550148' && [...rows()[0].querySelectorAll('a')].some(a=>a.innerText==='Text' && /conversations\/conversations\/cv1/.test(a.href)));
  const d=rows().find(r=>/Doris/.test(r.innerText)).innerText;
  ok('Doris: since yesterday', /Since yesterday/.test(d), d);
  const ok6=rows().find(r=>/Earl/.test(r.innerText)).innerText;
  ok('the Oklahoma text says Oklahoma line', /Oklahoma line/.test(ok6));
  const w=rows().find(r=>/Who is this/.test(r.innerText));
  ok('Who is this?: GoHighLevel\'s name for it, a name box, Save, Make this a lead, Not for us, and the family box', /Pat Q/.test(w.innerText) && /Make this a lead/.test(w.innerText) && /Not for us/.test(w.innerText) && /their family/.test(w.innerText));
  const tiles=[...document.querySelectorAll('.cfu-tile')].map(t=>t.innerText.replace(/\s+/g,' ').trim());
  ok('tiles: 1 care or safety, 5 today (1 since yesterday), 1 later, Yours 1 (Samantha owns Earl)', /^1 Care or safety today/.test(tiles[0]) && /^5 Call or text back today 1 waiting since yesterday/.test(tiles[1]) && /^1 Later this week Next one/.test(tiles[2]) && /^1 Yours/.test(tiles[3]), tiles);
  const chart=document.querySelector('.cfu-chart').innerText.replace(/\s+/g,' ');
  ok('the bar: who is waiting (families 3, caregivers 1, applicants 1, not known 1, since yesterday 1)', /Families, clients and leads 3/.test(chart) && /Caregivers 1/.test(chart) && /Applicants 1/.test(chart) && /Not known yet 1/.test(chart) && /Since yesterday or more 1/.test(chart), chart);
  const menus=[...document.querySelectorAll('.cfu-m > span')].map(x=>x.innerText);
  ok('menus: When, Who, Need, Owner, and Line (an Oklahoma row is there)', JSON.stringify(menus)===JSON.stringify(['When','Who','Need','Owner','Line']), menus);
  ok('the tab carries its count of rows open for today', /Follow-ups \(practice\)\s*6/.test(document.querySelector('#tab-mywork').innerText) || myWorkTabBadge('followups',{}).includes('>6<'), myWorkTabBadge('followups',{}));
  ok('closed today is listed', /1 closed today/.test(W()));
  window.__shot='table';
  return R; }"""
ACT = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const rows=()=>[...document.querySelectorAll('.cfu-t tbody tr')];
  CFU.tile('urgent'); await sleep(50);
  ok('tapping Care or safety shows only those, and is remembered', rows().length===1 && JSON.parse(localStorage.getItem('cfuF')).when==='urgent');
  CFU.clear(); CFU.pickF('who','caregiver'); await sleep(50);
  ok('Who: Caregivers', rows().length===1 && /Tasha/.test(rows()[0].innerText));
  CFU.clear(); CFU.tile('mine'); await sleep(50);
  ok('Yours: only Samantha\'s', rows().length===1 && /Earl/.test(rows()[0].innerText));
  CFU.clear(); CFU.pickF('need','hiring'); CFU.pickF('who','caregiver'); await sleep(50);
  ok('nothing matches: says so', /Nothing here for these filters/.test(document.querySelector('.cfu').innerText));
  CFU.clear(); await sleep(50);
  __calls.length=0;
  const s=document.getElementById('cfuNeed_2'); s.value='billing'; s.dispatchEvent(new Event('change')); await sleep(120);
  ok('changing Need sends set_need for that row, then reloads', __calls[0] && __calls[0].action==='set_need' && __calls[0].id==='2' && __calls[0].need==='billing' && __calls[1] && __calls[1].action==='queue', __calls);
  __calls.length=0;
  const o=document.getElementById('cfuOwner_3'); o.value='angiel@mo-care.com'; o.dispatchEvent(new Event('change')); await sleep(120);
  ok('changing Owner sends set_owner', __calls[0] && __calls[0].action==='set_owner' && __calls[0].owner==='angiel@mo-care.com');
  __calls.length=0;
  [...rows().find(r=>/Tasha/.test(r.innerText)).querySelectorAll('button')].find(b=>b.innerText==='Care or safety').click(); await sleep(120);
  ok('Care or safety sends urgent on', __calls[0] && __calls[0].action==='urgent' && __calls[0].on===true);
  [...rows().find(r=>/Tasha/.test(r.innerText)).querySelectorAll('button')].find(b=>b.innerText==='Later this week').click(); await sleep(60);
  const days=[...rows().find(r=>/Tasha/.test(r.innerText)).querySelectorAll('.cfu-days button')];
  ok('Later this week opens five weekdays and Cancel under the row', days.length===6, days.map(b=>b.innerText));
  __calls.length=0; days[0].click(); await sleep(120);
  ok('a day sends later with a date after today', __calls[0] && __calls[0].action==='later' && __calls[0].date > __Q.today, __calls[0]);
  __calls.length=0;
  [...rows().find(r=>/Doris/.test(r.innerText)).querySelectorAll('button')].find(b=>b.innerText==='Done').click(); await sleep(120);
  ok('Done sends done', __calls[0] && __calls[0].action==='done' && __calls[0].id==='2');
  __calls.length=0;
  CFU.people(); await sleep(120);
  const inp=document.getElementById('cfuWho_5'); inp.value='Ray Whitaker (Client)'; document.getElementById('cfuFam_5').checked=true;
  [...rows().find(r=>/Who is this/.test(r.innerText)).querySelectorAll('button')].find(b=>b.innerText==='Save').click(); await sleep(120);
  ok('Who is this? Save sends the pick, with "their family"', __calls.some(c=>c.action==='pick' && c.ref==='person:c1' && c.family===true && c.phone10==='8165550121'), __calls);
  document.getElementById('cfuWho_5').value='Nobody Real';
  [...rows().find(r=>/Who is this/.test(r.innerText)).querySelectorAll('button')].find(b=>b.innerText==='Save').click(); await sleep(60);
  ok('a name not from the list is refused in words', /Pick a name from the list/.test(document.getElementById('cfuErr_5').innerText));
  window.__fail=true; CFU.reload(); await sleep(150);
  ok('a server failure is said out loud, with Try again (no silent failure)', /Follow-ups could not load/.test(document.querySelector('.cfu').innerText) && /not set up/.test(document.querySelector('.cfu').innerText));
  window.__fail=false; __Q.state={ last_run:new Date(Date.now()-60*60000).toISOString(), last_error:'GoHighLevel 401 on /conversations/search: bad key', last_error_at:new Date(Date.now()-60*60000).toISOString() };
  CFU.reload(); await sleep(150);
  ok('a failed GoHighLevel read is said out loud on the page', /Reading GoHighLevel failed/.test(document.querySelector('.cfu').innerText) && /401/.test(document.querySelector('.cfu').innerText));
  __Q.state={ last_run:new Date(Date.now()-45*60000).toISOString() }; CFU.reload(); await sleep(150);
  ok('a reader that stopped is said out loud', /has not read GoHighLevel since/.test(document.querySelector('.cfu').innerText));
  ok('no em dash anywhere on the tab', !document.querySelector('.cfu').innerText.includes('—'));
  return R; }"""
SWITCH = r"""async(mode)=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]);
  const tabs=myWorkTabs({}).map(t=>t[0]);
  const before=(DATA.ops_items||[]).filter(i=>i.kind==='missed_call').length;
  window.__feed={ calls:[{ id:'call-x-'+mode, direction:'inbound', duration:0, status:'no-answer', phone:'4175559876', name:'Someone', at:new Date().toISOString() }] };
  (0,eval)('CALLS_FEED=window.__feed');
  window.persist = window.persist || (()=>{});
  opsReconcileCalls();
  const made=(DATA.ops_items||[]).filter(i=>i.kind==='missed_call').length-before;
  if(mode==='staff'){ ok('practice, coordinator: no Follow-ups tab', tabs.indexOf('followups')===-1, tabs); ok('practice: missed call cards are made as before', made===1, made); }
  if(mode==='live'){ ok('on, coordinator: "Follow-ups" next to Today', myWorkTabs({})[1][0]==='followups' && myWorkTabs({})[1][1]==='Follow-ups', myWorkTabs({})); ok('on: no missed call cards (the server keeps one card per number)', made===0, made);
    ok('the new card kind has a name', OPS_KINDS.reply_needed && OPS_KINDS.reply_needed.label==='Call or text back'); }
  return R; }"""
R = []
with sync_playwright() as pw:
    sys.path.insert(0, HERE)
    from clock_pin import pin
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1360, 'height': 1000}); errs = []
    pin(pg)
    pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    pg.goto(f'http://127.0.0.1:{PORT}/index.html?proof=cfu'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    pg.evaluate(SETUP, 'practice')
    R += pg.evaluate(T)
    pg.evaluate("window.scrollTo(0,0)"); pg.wait_for_timeout(150)
    pg.screenshot(path=SHOTS + 'table.png', full_page=True)
    R += pg.evaluate(ACT)
    pg.evaluate(SETUP, 'staff'); R += pg.evaluate(SWITCH, 'staff')
    pg.evaluate(SETUP, 'live'); R += pg.evaluate(SWITCH, 'live')
    pg.set_viewport_size({'width': 400, 'height': 900})
    pg.evaluate(SETUP, 'practice'); pg.evaluate("()=>{ myWorkGo('followups'); }"); pg.wait_for_timeout(300)
    n = pg.evaluate("()=>[...document.querySelectorAll('.cfu-cards .cfu-card')].length")
    R.append(['PASS' if n == 7 else 'FAIL', 'phone: short cards instead of the table', n])
    pg.evaluate("()=>{ CFU.more('2'); }"); pg.wait_for_timeout(100)
    more = pg.evaluate("()=>!!document.querySelector('.cfu-card .cfu-more select')")
    R.append(['PASS' if more else 'FAIL', 'phone: More opens Need, Owner and Move it', ''])
    wv = pg.evaluate("()=>document.documentElement.scrollWidth")
    R.append(['PASS' if wv <= 410 else 'FAIL', 'phone width: the page does not scroll sideways', wv])
    pg.screenshot(path=SHOTS + 'phone.png', full_page=True)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
srv.shutdown()
for st, n, d in R: print(st + '  ' + n + ('' if st == 'PASS' else '  ' + str(d)))
print(f"{sum(1 for r in R if r[0]=='PASS')}/{len(R)} passed")
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

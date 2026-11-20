"""Operations Board, Today first (Samantha 2026-11-19: "It's still more busy than helpful", then "Yes, build it").
The real Hub page, offline, MADE-UP people only. Practice: owners see "Try the calmer board" on the three lanes,
coordinators don't. Today: one row per person, one button, care first, people waiting next, fresh promises last;
six rows then "Show N more"; a promise older than 2 days sits under "Older promises and call to-dos"; a new family row
says what the caller asked for; everything else is one quiet line per list; open shifts are one line; the header chip
says "N for today". On (ops_board_today_live): a coordinator gets it with no practice banner. Phone width, no page errors.
Saves screenshots to SHOTS (default /tmp/opt_*.png). (python3 tests/browser/ops_board_today_look.py; serves this checkout)"""
import re, os, sys, threading, functools, http.server, socketserver
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
STUB = re.search(r'STUB = r"""(.*?)"""', open(os.path.join(HERE, 'standup_look.py')).read(), re.S).group(1)
SHOTS = os.environ.get('SHOTS', '/tmp/opt_')
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.TCPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=ROOT)); PORT = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
SETUP = r"""async(mode)=>{
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  const owner = mode!=='staff';
  (0,eval)(owner ? "ME={ email:'samantha@mo-care.com', name:'Samantha Troutman' };" : "ME={ email:'krystal@mo-care.com', name:'Krystal Smith' };");
  CC_ROLES = owner ? ['owner_admin'] : ['care_coordinator']; CC_ROLES_CHECKED=true;
  window.ccIsOwner=()=>owner; window.ccActor=()=>({ email:ME.email, name:ME.name }); window.opsMeKey=()=>ME.email;
  try{ ['opbF','opbLanes','opbToday','mwtLastClear'].forEach(k=>localStorage.removeItem(k)); }catch(e){}
  Object.assign(OPB.state, { tile:'', open:'', clean:false, appr:false, started:false, older:false, f:{ when:'', who:'', need:'', owner:'start' } });
  Object.assign(OPB.lanes, { who:'mine', bopen:'', oldOpen:false, week:undefined, weekAt:0, weekErr:'' });
  Object.assign(OPB.today, { more:false, lists:false, week:false, oldp:false });
  DATA.ops_settings=Object.assign({}, DATA.ops_settings||{}, { ops_board_live:true, ops_board_live_since:new Date(Date.now()-20*864e5).toISOString(),
    ops_board_lanes_live:true, ops_board_today_live: mode==='staff', cc_followups_live:true });
  const ago=h=>new Date(Date.now()-h*36e5).toISOString(), ahead=h=>new Date(Date.now()+h*36e5).toISOString();
  const S='samantha@mo-care.com', K='krystal@mo-care.com';
  const c=(id,kind,about,title,hrs,x)=>Object.assign({ id, kind, status:'open', owner:S, about, title, created_at:ago(hrs), due:ahead(4) }, x||{});
  DATA.ops_items=[
    c('cn_1','care_note','Example: Ellen B.','Red flag: seemed more confused than usual',3,{ urgency:'urgent', domain:'client_care', client_ax:'4' }),
    c('fu_1','reply_needed','Example: Linda P.','Call or text back Example: Linda P.',19,{ contact_id:'c1', detail:'Example: Linda P.: "Can the Thursday visit move to Friday?"' }),
    c('fu_2','reply_needed','Example: Gio H.','Call or text back Example: Gio H.',2,{ contact_id:'c2', detail:'Example: Gio H.: "Are you hiring?"' }),
    c('fu_3','reply_needed','Example: Steve A.','Call or text back Example: Steve A.',200,{ contact_id:'c3', detail:'Example: Steve A.: "Call me when you can"' }),
    c('nf_1','new_family_call','EXAMPLE A.','New family? EXAMPLE A.',30,{ detail:'Example Angie called looking for a caregiver one to two days a week. She left a number and asked for a call back.' }),
    c('nf_2','new_family_call','Unknown caller','New family? Unknown caller',26,{ detail:'A man asked about overnight care for his wife.' }),
    c('cfp_a1','call_followup','Example: Ashley L.','Promise not kept yet: Reply about open shifts',20),
    c('cfp_a2','call_followup','Example: Ashley L.','Promise not kept yet: Update her schedule',30),
    c('cf_new','call_followup','Example: Nev M.','Text Example: Nev about Thursday',6),
    c('cfp_old1','call_followup','Example: Dixie K.','Promise not kept yet: Confirm the Friday visit',130),
    c('cfp_old2','call_followup','Example: Kristin T.','Promise not kept yet: Explain the pay date',140),
    c('cf_old3','call_followup','Example: Joyce C.','Email Example: Joyce the form',220),
    c('cf_k','call_followup','Example: Rita G.','Call back Example: Rita',9,{ owner:K }),
    c('cf_office','call_followup','Example: Tom R.','Change the visit in AxisCare',8),
    c('fw_1','family_welcome','Example: Family One','Send the welcome',5,{ owner:'' }),
    c('fw_2','family_welcome','Example: Family Two','Send the welcome',5,{ owner:'' }),
    c('sp_1','send_problem','Example: Walt S.','The text did not go out',6),
    c('s1_1','step1_countersign','Example: New Hire','Countersign Step 1',12),
    c('ct_1','confirm_times','Example: Harold J.','Confirm the times',12,{ domain:'scheduling_coverage' }),
    c('jr_1','journey','Example: Start Family','Next step for the family',12,{ domain:'client_onboarding' }),
    c('rq_1','request','Example: Office','Order more gloves',12),
    c('old_1','request','Example: Old request','Old thing',24*20,{ due:ago(24*19) })
  ];
  window.discMayApproveAny=()=>false; window.discForMe=()=>[];
  window.persist=async()=>{}; window.opEvent=()=>{}; window.ccToast=()=>{};
  window.ccOpsRefresh=()=>{}; window.ccRecentFetch=async()=>{}; try{ CC_RECENT.tried=Date.now(); }catch(e){}
  const day=n=>{ const d=new Date(Date.now()+n*864e5); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
  window.trainHubTok=async()=>'tok';
  const real=window.fetch.bind(window);
  window.fetch=async(u,o)=>{ if(String(u).indexOf('axiscare-open-shifts')>=0){ if(/"pairs"/.test(String(o&&o.body||''))) return new Response(JSON.stringify({ pairs:[] }));
      return new Response(JSON.stringify({ open_count:2, incomplete_dates:window.__gap?[day(3)]:[], open:[{ client:'Example: Harold J.', date:day(1), start:'8:00 AM', end:'12:00 PM', start24:'08:00' }, { client:'Example: Ruth K.', date:day(5), start:'7:00 PM', end:'11:00 PM', start24:'19:00' }] }), { headers:{ 'Content-Type':'application/json' } }); }
    return real(u,o); };
  switchTab('mywork'); myWorkGo('board'); await new Promise(r=>setTimeout(r,150));
  return true;
}"""
OWNER = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const W=()=>document.getElementById('myWorkWrap').innerText;
  ok('until you try it, the three lanes are still the board', !!document.getElementById('oplWait') && !document.getElementById('optToday'));
  ok('owners see "Try the calmer board" on the lanes', /Try the calmer board/.test(W()), W().slice(0,300));
  OPB.todayTry(true); await sleep(200);
  ok('Try the calmer board draws Today and remembers it', !!document.getElementById('optToday') && !document.getElementById('oplWait') && localStorage.getItem('opbToday')==='1');
  ok('practice banner: only you see it, nothing closed, a way back', /Calmer board, practice/.test(W()) && /Nothing was closed or changed/.test(W()) && /Back to the three lanes/.test(W()), W().slice(0,300));
  ok('no tiles on the calmer board', !document.querySelector('.opl-tile'));
  const ids=()=>[...document.querySelectorAll('#optToday > .opt-row')].map(r=>r.getAttribute('data-id'));
  ok('Today: 8 people need you, 6 rows shown: care first, then the longest wait, one row per person',
    /Today\s+8 people need you/.test(document.querySelector('#optToday .opt-hd').innerText.replace(/\s+/g,' ')) && JSON.stringify(ids())===JSON.stringify(['cn_1','fu_3','nf_1','nf_2','fu_1','fu_2']), [document.querySelector('#optToday .opt-hd').innerText, ids()]);
  ok('each Today row has exactly one button', [...document.querySelectorAll('#optToday > .opt-row')].every(r=>r.querySelectorAll('button').length===1));
  const nf=document.querySelector('.opt-row[data-id="nf_1"]').innerText;
  ok('a new family row says what the caller asked for, not "New family?"', /looking for a caregiver one to two days a week\./.test(nf) && !/New family\?/.test(nf) && /New family/.test(nf) && /Call back/.test(nf), nf);
  ok('an unknown new caller is "New caller"', /New caller/.test(document.querySelector('.opt-row[data-id="nf_2"]').innerText));
  ok('a reply row shows the words that came in', /"Can the Thursday visit move to Friday\?"/.test(document.querySelector('.opt-row[data-id="fu_1"]').innerText));
  ok('"Show 2 more for today"', /Show 2 more for today/.test(W()), W().slice(0,900));
  OPB.todayFlip('more'); await sleep(60);
  ok('Show more lists everyone: Ashley once with her 2 things, then the fresh call to-do', JSON.stringify(ids().slice(6))===JSON.stringify(['cfp_a2','cf_new']) && /Show fewer/.test(W()), ids());
  const ash=document.querySelector('.opt-row[data-id="cfp_a2"]');
  ok('Ashley: one row, "2 things", See both, no "Promise not kept yet"', ash.getAttribute('data-n')==='2' && /2 things/.test(ash.innerText) && /See both/.test(ash.innerText) && !/Promise not kept yet/.test(ash.innerText), ash.innerText);
  ash.querySelector('button').click(); await sleep(80);
  ok('See both lists her two cards under the row', document.querySelectorAll('#optToday .opt-in .opl-row').length===2, document.querySelectorAll('#optToday .opt-in .opl-row').length);
  document.querySelector('.opt-row[data-id="cfp_a2"] button').click(); await sleep(60);
  document.querySelector('.opt-row[data-id="fu_1"] button').click(); await sleep(80);
  ok('the one button opens the card itself, and Done shows only then', !!document.querySelector('#optToday .opl-card') && /Done/.test(document.querySelector('.opt-row[data-id="fu_1"]').innerText) && !/Done/.test(document.querySelector('.opt-row[data-id="fu_2"]').innerText));
  document.querySelector('.opt-row[data-id="fu_1"] .opt-btns > button').click(); await sleep(60);
  ok('Krystal\'s call back is not on my Today', ids().indexOf('cf_k')<0);
  const lines=()=>[...document.querySelectorAll('#optRest > .opt-line[data-list]')].map(b=>b.getAttribute('data-list')+':'+b.querySelector('b').innerText);
  ok('everything else: older promises first (3), then one quiet line per list, five at most', JSON.stringify(lines().slice(0,5))===JSON.stringify(['oldp:3','welcome:2','send:1','calls:1','hiring:1']) && /Everything else, when you have time/.test(W()), lines());
  ok('an older promise is not on Today', ids().indexOf('cfp_old1')<0 && !document.querySelector('#optToday [data-id="cfp_old1"]'));
  ok('the rest of the lists are behind "Show N more lists"', /Show \d+ more lists?/.test(document.getElementById('optRest').innerText) && lines().indexOf('old:1')===lines().length-1 && lines().length===6, lines());
  OPB.todayFlip('oldp'); await sleep(60);
  ok('the older promises line opens its cards, each with its own buttons', document.querySelectorAll('#optRest .opt-in .opl-row').length===3 && /Done/.test(document.querySelector('#optRest .opt-in').innerText));
  OPB.todayFlip('oldp'); OPB.todayFlip('lists'); await sleep(60);
  ok('Show more lists adds scheduling, family start and other, and can fold again', lines().length===9 && /Show fewer lists/.test(W()), lines());
  OPB.batch('welcome'); await sleep(60);
  ok('a list line opens its cards', document.querySelectorAll('#optRest .opt-in .opl-row').length===2);
  OPB.batch('welcome'); OPB.todayFlip('lists'); await sleep(60);
  OPB.oldToggle(); await sleep(60);
  ok('Older than a week opens its card', !!document.querySelector('#oplOld [data-id="old_1"]'));
  OPB.oldToggle(); await sleep(40);
  const wk=document.querySelector('.opt-week').innerText;
  ok('open shifts are one line: 2 open, 1 within 48 hours, Show', /Open shifts, next 7 days:\s*2 open/.test(wk) && /1 within 48 hours/.test(wk) && /Show/.test(wk) && !document.getElementById('oplWeek'), wk);
  OPB.todayFlip('week'); await sleep(60);
  ok('Show opens the week card', document.querySelectorAll('#oplWeek .opl-day').length===7);
  OPB.todayFlip('week'); await sleep(40);
  OPB.lanesWho('all'); await sleep(60); OPB.todayFlip('more'); OPB.todayFlip('more'); await sleep(60);
  ok('Show everyone adds Krystal\'s call back, with her name, and says "need the office"', ids().indexOf('cf_k')>=0 && /Krystal/.test(document.querySelector('.opt-row[data-id="cf_k"]').innerText) && /need the office/.test(W()), ids());
  OPB.lanesWho('mine'); await sleep(60);
  ok('the team line: Krystal 1 waiting', /Team: Krystal[^\n]* 1 waiting/.test(W()), W().slice(-400));
  const realCounts=window.opsTodayCounts; window.opsTodayCounts=()=>({ act:0, late:5 });
  try{ ccRenderPulse(); }catch(e){}
  const chips=[...document.querySelectorAll('.tp-chip')].map(c=>c.innerText.replace(/\s+/g,' ').trim());
  ok('the header chip says "8 for today", never "N late"', chips.some(c=>/^8 for today$/.test(c)) && !chips.some(c=>/ late$/.test(c)), chips);
  window.opsTodayCounts=()=>({ act:3, late:5 }); try{ ccRenderPulse(); }catch(e){}
  const chips2=[...document.querySelectorAll('.tp-chip')].map(c=>c.innerText.replace(/\s+/g,' ').trim());
  ok('"needs you now" still wins over the Today number', chips2.some(c=>/^3 need you now$/.test(c)) && !chips2.some(c=>/for today/.test(c)), chips2);
  window.opsTodayCounts=realCounts;
  ok('no em dashes anywhere on the board', !/—/.test(W()));
  OPB.today.more=false; OPB.todayFlip('more'); OPB.todayFlip('more'); await sleep(40);
  window.scrollTo(0,0);
  return R; }"""
GAP = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  window.__gap=true; Object.assign(OPB.lanes, { week:undefined, weekAt:0 }); myWorkGo('board'); await sleep(250);
  const wk=document.querySelector('.opt-week').innerText;
  ok('a day AxisCare could not read is said on the open shifts line', /1 day could not be read, check AxisCare/.test(wk), wk);
  OPB.todayTry(false); await sleep(80);
  ok('Back to the three lanes', !!document.getElementById('oplWait') && !document.getElementById('optToday') && localStorage.getItem('opbToday')==='0');
  try{ ccRenderPulse(); }catch(e){}
  ok('back on the lanes the header chip is the old one', ![...document.querySelectorAll('.tp-chip')].some(c=>/for today/.test(c.innerText)));
  return R; }"""
STAFF = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const W=()=>document.getElementById('myWorkWrap').innerText;
  myWorkGo('board'); await sleep(150);
  ok('switch on, coordinator: Today, no practice banner, no way-back link', !!document.getElementById('optToday') && !/Calmer board, practice/.test(W()) && !/three lanes/.test(W()) && !document.getElementById('oplWait'), W().slice(0,300));
  const ids=[...document.querySelectorAll('#optToday > .opt-row')].map(r=>r.getAttribute('data-id'));
  ok('Krystal\'s Today: her call back, plus nobody\'s', ids.indexOf('cf_k')>=0 && ids.indexOf('fu_1')<0, ids);
  ok('coordinators get no team line and no Show everyone', !/Team:/.test(W()) && !/Show everyone/.test(W()));
  return R; }"""
R = []
with sync_playwright() as pw:
    sys.path.insert(0, HERE)
    from clock_pin import pin
    b = pw.chromium.launch(); errs = []
    def page():
        pg = b.new_page(viewport={'width': 1360, 'height': 1000}); pin(pg)
        pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
        pg.route('**/*', lambda r: r.abort() if ('supabase.co' in r.request.url and 'axiscare-open-shifts' not in r.request.url) else r.continue_())
        pg.goto(f'http://127.0.0.1:{PORT}/index.html?proof=opt'); pg.wait_for_timeout(1500)
        pg.evaluate('s=>(0,eval)(s)', STUB); return pg
    pg = page(); pg.evaluate(SETUP, 'practice'); R += pg.evaluate(OWNER)
    pg.wait_for_timeout(150); pg.screenshot(path=SHOTS + 'owner.png', full_page=True)
    pg.set_viewport_size({'width': 400, 'height': 900}); pg.wait_for_timeout(200)
    wv = pg.evaluate("()=>document.documentElement.scrollWidth")
    R.append(['PASS' if wv <= 410 else 'FAIL', 'phone width: the page does not scroll sideways', wv])
    pg.screenshot(path=SHOTS + 'phone.png', full_page=True)
    pg.set_viewport_size({'width': 1360, 'height': 1000}); R += pg.evaluate(GAP)
    pg = page(); pg.evaluate(SETUP, 'staff'); R += pg.evaluate(STAFF); pg.screenshot(path=SHOTS + 'staff.png', full_page=True)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
srv.shutdown()
for st, n, d in R: print(st + '  ' + n + ('' if st == 'PASS' else '  ' + str(d)))
print(f"{sum(1 for r in R if r[0]=='PASS')}/{len(R)} passed")
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

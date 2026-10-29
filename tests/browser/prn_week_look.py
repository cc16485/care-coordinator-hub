"""PRN step 2 (Samantha 2026-10-28): This week and on call on Recruit, PRN Teams, and their settings. Offline, made-up data;
every server call is answered here, nothing is sent or saved. (PORT=<static server port> python3 tests/browser/prn_week_look.py)"""
import os
from playwright.sync_api import sync_playwright
H = open('/Users/samantha/Claude/Projects/cc-hub-live/.claude/g1a_harness.js').read()
PORT = os.environ.get('PORT', '8811')
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  window.ccConfirm=async()=>true; (0,eval)('ccConfirm=window.ccConfirm');
  const merges=[]; window.tkMerge=async(fn,what)=>{ const base=JSON.parse(JSON.stringify(DATA.ops_settings||{})), m=JSON.parse(JSON.stringify(base)); const ch=fn(m,base)||[]; DATA.ops_settings=m; merges.push([what,ch]); return { changed:ch, error:null }; };
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; await sleep(600);
  (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha Troutman' };"); CC_ROLES=['owner_admin']; CC_ROLES_CHECKED=true; CC_ROLE_BY_EMAIL['samantha@mo-care.com']=['owner_admin'];
  const WEEK = { ok:true, today:'2026-10-28', live:false, thanks_live:false, owner:'Krystal', more:0,
    members:[{applicant_id:'g',name:'Grace Lee',team:'cna',axiscare_id:'11'},{applicant_id:'t',name:'Tom Ray',team:'cna',axiscare_id:'22'},{applicant_id:'s',name:'Tasha Fox',team:'caregiver',axiscare_id:null}],
    items:[{id:'thanks:g:cv1',kind:'thanks',applicant_id:'g',name:'Grace Lee',team:'PRN CNA Team',ref:'shift:cv1',case_id:'cv1',title:'Thank Grace',detail:'Grace Lee covered Linda on Sunday.',draft:'Hi Grace, thank you for stepping in for Linda on Sunday. You made a real difference for Linda and their family. Krystal'},
           {id:'milestone:t:shifts',kind:'milestone',applicant_id:'t',name:'Tom Ray',team:'PRN CNA Team',ref:'shifts:10',title:'Tom reached 10 PRN shifts',detail:'A handwritten card goes in the mail.'},
           {id:'checkin:t:2026-10-26',kind:'checkin',applicant_id:'t',name:'Tom Ray',team:'PRN CNA Team',ref:'checkin:2026-10-26',title:'Check in with Tom',detail:'No personal contact recorded yet. Worth a call.'}],
    oncall:{ stipend:null, patterns:{every_weekend:'Every weekend',every_other_weekend:'Every other weekend',one_weekend_month:'One weekend a month',weekday:'A weekday',not_now:'Not right now'},
      offers:[{applicant_id:'g',name:'Grace Lee',pattern:'every_other_weekend',pattern_word:'Every other weekend'}],
      weekends:Array.from({length:8},(_,i)=>{ const sat=new Date(Date.UTC(2026,9,31+i*7)).toISOString().slice(0,10), sun=new Date(Date.UTC(2026,10,1+i*7)).toISOString().slice(0,10);
        return { saturday:sat, sunday:sun, confirmed: i===1?[{id:7,applicant_id:'g',name:'Grace Lee'}]:[], gap:i!==1 }; }) } };
  const CALLS=[]; const realFetch=window.fetch;
  window.fetch=async(u,o)=>{ if(String(u).includes('/functions/v1/prn-week')){ const b=JSON.parse(o.body); CALLS.push(b);
      return new Response(JSON.stringify(b.action==='week'?WEEK:{outcome:b.action==='send_thanks'?'sent':'recorded'}),{status:200}); } return realFetch(u,o); };
  sb.auth.getSession=async()=>({ data:{ session:{ access_token:'t' } } });
  location.hash='#prnteams'; await sleep(700); await PW.load(); await sleep(100);
  const box=document.getElementById('prnWeek'), txt=()=>box.innerText;
  ok('#prnteams shows This week and On call at the top of PRN Teams', /This week/.test(txt()) && /On call · PRN CNA Team/.test(txt()) && box.compareDocumentPosition(document.getElementById('prnDash')) & 4, txt().slice(0,200));
  ok('switch off: owners see it marked Practice', /Practice: only owners see this/.test(txt()));
  ok('the list is Krystal\'s, with three lines', /Krystal's list/.test(txt()) && box.querySelectorAll('.pw-line').length===3);
  ok('each line has Not this one', [...box.querySelectorAll('.pw-line')].every(l=>/Not this one/.test(l.innerText)));
  PW.open('thanks:g:cv1'); await sleep(50);
  const ta=document.getElementById('pwMsg_thanks:g:cv1');
  ok('Open text shows the drafted thank-you to edit', ta && /^Hi Grace, thank you for stepping in for Linda on Sunday/.test(ta.value), ta&&ta.value);
  ok('texting off: no Send button, "Thanked another way" instead', !/Send from the office number/.test(txt()) && /Texting thank-yous is off/.test(txt()) && /Thanked another way/.test(txt()));
  WEEK.thanks_live=true; await PW.load(); PW.open('thanks:g:cv1'); PW.open('thanks:g:cv1'); await sleep(50);
  ok('texting on: Send from the office number appears', /Send from the office number/.test(txt()));
  document.getElementById('pwMsg_thanks:g:cv1').value='Hi Grace, thank you so much for Sunday. Krystal';
  await PW.send('thanks:g:cv1'); await sleep(100);
  const sc=CALLS.find(c=>c.action==='send_thanks');
  ok('Send passes the edited words, the shift and a send id', sc && sc.message==='Hi Grace, thank you so much for Sunday. Krystal' && sc.case_id==='cv1' && sc.applicant_id==='g' && /^pw-/.test(sc.send_id), sc);
  await PW.mark('milestone:t:shifts','card_mailed');
  ok('Card mailed records the milestone line', CALLS.some(c=>c.action==='mark' && c.kind==='card_mailed' && c.ref==='shifts:10' && c.applicant_id==='t'));
  await PW.mark('checkin:t:2026-10-26','called');
  ok('Called records this week\'s check-in', CALLS.some(c=>c.action==='mark' && c.kind==='called' && c.ref==='checkin:2026-10-26'));
  const tiles=box.querySelectorAll('.pw-wk');
  ok('8 weekends; the confirmed one shows Grace, the others are red gaps', tiles.length===8 && /Grace Lee/.test(tiles[1].innerText) && tiles[0].classList.contains('gap') && !tiles[1].classList.contains('gap') && /No PRN CNA on call/.test(tiles[0].innerText));
  ok('only PRN CNA Team members can be confirmed (Tasha is on the PRN Caregiver Team)', ![...document.getElementById('pwPick0').options].some(o=>/Tasha/.test(o.text)) && [...document.getElementById('pwPick0').options].some(o=>/Tom Ray/.test(o.text)));
  document.getElementById('pwPick0').value='t'; await PW.confirm(0); await sleep(50);
  ok('Confirm sends that weekend for that person', CALLS.some(c=>c.action==='oncall_confirm' && c.applicant_id==='t' && c.start_date==='2026-10-31' && c.end_date==='2026-11-01'));
  await PW.cancel(7); ok('Take back sends the confirmed date\'s id', CALLS.some(c=>c.action==='oncall_cancel' && c.id===7));
  ok('offers show, and stipend says not set yet', /Grace Lee: Every other weekend/.test(txt()) && /Stipend amount: not set yet/.test(txt()));
  document.getElementById('pwOfWho').value='t'; document.getElementById('pwOfPat').value='one_weekend_month'; await PW.offer();
  ok('Record their offer sends who and what', CALLS.some(c=>c.action==='oncall_offer' && c.applicant_id==='t' && c.pattern==='one_weekend_month'));
  /* a non-owner with the switch off sees nothing */
  CC_ROLES=['care_coordinator']; CC_ROLE_BY_EMAIL['samantha@mo-care.com']=['care_coordinator']; await PW.load();
  ok('switch off: someone who is not an owner sees nothing', box.innerHTML==='');
  WEEK.live=true; await PW.load();
  ok('switch on: everyone sees it, no Practice label', /This week/.test(txt()) && !/Practice/.test(txt()));
  CC_ROLES=['owner_admin']; CC_ROLE_BY_EMAIL['samantha@mo-care.com']=['owner_admin'];
  /* settings */
  DATA.ops_settings={}; location.hash='#settings/prn'; await sleep(300); prnSetFill();
  const sw=document.getElementById('prnStep2Switches').innerText;
  ok('Settings: two step 2 switches, both off', (sw.match(/: off/g)||[]).length===2 && /Show This week and on call/.test(sw) && /Text thank-yous from the office number/.test(sw), sw);
  ok('Settings: the thank-you box shows the standard wording', document.getElementById('set_prn_thanks_msg').placeholder===PRN_THANKS_DEFAULT && document.getElementById('set_prn_week_owner').placeholder==='Krystal');
  document.getElementById('set_prn_week_owner').value='Staffing Coordinator'; await prnStep2Save();
  ok('Settings: the owner can be changed in one place', DATA.ops_settings.prn_week_owner==='Staffing Coordinator');
  await prnStep1Toggle('prn_thanks_live'); ok('Settings: the thank-you switch turns on by itself', DATA.ops_settings.prn_thanks_live===true && DATA.ops_settings.prn_week_live===undefined);
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1300, 'height': 1600})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co/rest' in r.request.url or 'supabase.co/auth' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(f'http://localhost:{PORT}/index.html?proof=prnweek'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', H)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    pg.evaluate("()=>{ location.hash='#prnteams'; }"); pg.wait_for_timeout(500); pg.evaluate("async()=>{ PW._state().live=false; await PW.load(); PW.open('thanks:g:cv1'); }"); pg.wait_for_timeout(300)
    pg.locator('#prnWeek').screenshot(path=os.environ.get('SHOT', '/tmp/prn_week.png')); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

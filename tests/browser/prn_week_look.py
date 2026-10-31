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
      offers:[{applicant_id:'g',name:'Grace Lee',pattern:'every_other_weekend',pattern_word:'Every other weekend'}], weekends:[], records_ready:true, signup_live:false, first_live:false,
      miss_kinds:{ no_answer:"Didn't answer our call", not_covered:"Didn't cover the shift" },
      people:[{applicant_id:'g',name:'Grace Lee',signed:true,signed_at:'2026-10-28T15:00:00Z',blocked:false},{applicant_id:'t',name:'Tom Ray',signed:false,signed_old:false,blocked:true,miss:{kind:'no_answer',word:"Didn't answer our call",at:'2026-10-27T15:00:00Z'}}],
      /* the calendar (her decisions 22 to 27): 4 weeks from Monday Oct 26; Grace confirmed Oct 31 daytime; Tom asked Nov 1 overnight; Tom missed Oct 27 */
      calendar:Array.from({length:28},(_,i)=>{ const d=new Date(Date.UTC(2026,9,26+i)).toISOString().slice(0,10), cell=()=>({confirmed:[],asked:[],gap:d>='2026-10-28'});
        const x={ date:d, past:d<'2026-10-28', day:cell(), overnight:cell() };
        if(d==='2026-10-31'){ x.day.confirmed=[{id:7,applicant_id:'g',name:'Grace Lee',whole:false,shift_recorded:true,missed:null}]; x.day.gap=false; }
        if(d==='2026-11-01'){ x.overnight.asked=[{id:9,applicant_id:'t',name:'Tom Ray'}]; }
        if(d==='2026-10-27'){ x.day.confirmed=[{id:5,applicant_id:'t',name:'Tom Ray',whole:false,shift_recorded:true,missed:'no_answer'}]; }
        if(d==='2026-10-28'){ x.day.confirmed=[{id:8,applicant_id:'g',name:'Grace Lee',whole:false,shift_recorded:true,missed:null}]; x.day.gap=false; }
        return x; }) } };
  const CALLS=[]; const realFetch=window.fetch;
  window.fetch=async(u,o)=>{ if(String(u).includes('/functions/v1/prn-week')){ const b=JSON.parse(o.body); CALLS.push(b);
      return new Response(JSON.stringify(b.action==='week'?WEEK:{outcome:b.action==='send_thanks'?'sent':'recorded'}),{status:200}); } return realFetch(u,o); };
  sb.auth.getSession=async()=>({ data:{ session:{ access_token:'t' } } });
  location.hash='#recruit'; await sleep(500); rcView('prn'); await sleep(200); await PW.load(); await sleep(100);
  const box=document.getElementById('prnWeek'), txt=()=>box.innerText;
  ok('Recruit, PRN Teams (stacked view) shows This week and On call at the top', /This week/.test(txt()) && /On call · PRN CNA Team/.test(txt()) && box.compareDocumentPosition(document.getElementById('prnDash')) & 4, txt().slice(0,200));
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
  /* THE ON-CALL CALENDAR (her decisions 22 to 27) */
  const days=box.querySelectorAll('.oc-day'), dayOf=(d)=>[...box.querySelectorAll('.oc-day')][Math.round((Date.parse(d)-Date.parse('2026-10-26'))/864e5)];
  ok('22: the calendar: Mon to Sun headers, 28 days, today marked, past days dimmed', days.length===28 && [...box.querySelectorAll('.oc-h')].map(h=>h.innerText).join()==='Mon,Tue,Wed,Thu,Fri,Sat,Sun'
    && dayOf('2026-10-28').classList.contains('today') && dayOf('2026-10-26').classList.contains('past'));
  ok('...each day has a daytime and an overnight shift; Grace on Oct 31 daytime; open shifts marked', /Day 7a to 5p/.test(dayOf('2026-10-31').innerText) && /Night 5p to 7a/.test(dayOf('2026-10-31').innerText)
    && /Grace Lee/.test(dayOf('2026-10-31').querySelectorAll('.oc-s')[0].innerText) && dayOf('2026-10-31').querySelectorAll('.oc-s')[1].classList.contains('gap') && /Open/.test(dayOf('2026-10-31').querySelectorAll('.oc-s')[1].innerText), dayOf('2026-10-31').innerText);
  ok('...the count of open shifts', /\d+ open shifts in the next 4 weeks/.test(txt()));
  ok('...a miss shows struck through, never a Take back', /Tom Ray/.test(dayOf('2026-10-27').innerText) && /didn't answer/.test(dayOf('2026-10-27').innerText) && !dayOf('2026-10-27').querySelector('.oc-x'));
  ok('23: Tom\'s ask waits on Nov 1 overnight, with confirm and Not this one', /Tom Ray\s*asked/.test(dayOf('2026-11-01').innerText) && /can't sign up/.test(dayOf('2026-11-01').innerText), dayOf('2026-11-01').innerText);
  await PW.ocOk(9); ok('...✓ confirms the ask by its id', CALLS.some(c=>c.action==='oncall_confirm' && c.ask_id===9));
  await PW.ocNo(9); ok('...✕ is "Not this one"', CALLS.some(c=>c.action==='oncall_decline' && c.ask_id===9));
  await PW.cancel(7); ok('Take back sends the confirmed shift\'s id', CALLS.some(c=>c.action==='oncall_cancel' && c.id===7));
  PW.ocOpen('2026-11-02|day'); await sleep(30);
  const put=document.getElementById('ocPut_2026-11-02|day');
  ok('+ on an open shift: only PRN CNAs who signed and are not blocked (Grace; not Tom, not Tasha)', put && [...put.options].map(o=>o.text).join()==='Grace Lee', put && [...put.options].map(o=>o.text));
  await PW.ocPut('2026-11-02','day'); await sleep(30);
  ok('...Put on call sends the date and shift', CALLS.some(c=>c.action==='oncall_confirm' && c.applicant_id==='g' && c.date==='2026-11-02' && c.shift==='day'));
  PW.ocOpen('2026-11-03|overnight'); await sleep(30); document.getElementById('ocWhole_2026-11-03|overnight').checked=true; await PW.ocPut('2026-11-03','overnight'); await sleep(30);
  ok('...both shifts = the whole day', CALLS.some(c=>c.action==='oncall_confirm' && c.date==='2026-11-03' && c.shift==='whole'));
  PW.ocMissOpen('8'); await sleep(30);
  ok('25: today\'s on-call shift has Missed, with the two kinds', /Didn't answer our call/.test(dayOf('2026-10-28').innerText) && /Didn't cover the shift/.test(dayOf('2026-10-28').innerText), dayOf('2026-10-28').innerHTML);
  let alerted=''; window.alert=(m)=>{ alerted=m; }; window.ccAlert=(m)=>{ alerted=m; }; (0,eval)('ccAlert=window.ccAlert');
  const realF=window.fetch; window.fetch=async(u,o)=>{ if(String(u).includes('/functions/v1/prn-week') && JSON.parse(o.body).action==='oncall_mark'){ CALLS.push(JSON.parse(o.body)); return new Response(JSON.stringify({outcome:'missed',name:'Grace Lee',taken_back:[{date:'2026-11-07',shift:'overnight',kind:'confirmed'}],failed:[]}),{status:200}); } return realF(u,o); };
  await PW.ocMiss(8,'not_covered'); await sleep(50); window.fetch=realF;
  ok('...a miss sends it, then says what was taken back and to call them', CALLS.some(c=>c.action==='oncall_mark' && c.oncall_id===8 && c.kind==='not_covered') && /Taken back: Nov 7 overnight/.test(alerted) && /Call them/.test(alerted), alerted);
  ok('24/25: the team list: who signed, who can\'t sign up, and (owners) let them sign up again', /Grace Lee\s*Signed the expectations/.test(txt()) && /Tom Ray\s*Not signed yet/.test(txt()) && /Can't sign up: didn't answer our call/.test(txt()) && /Let them sign up again/.test(txt()), txt());
  window.prompt=()=>'Talked it through'; await PW.ocLift('t'); ok('...sends the reason', CALLS.some(c=>c.action==='oncall_lift' && c.applicant_id==='t' && c.reason==='Talked it through'));
  ok('the rules in a sentence or two; pay kept to the PRN plan; earlier preferences still listed', /daytime 7am to 5pm, overnight 5pm to 7am/.test(txt()) && /never shown on their page/.test(txt()) && /Earlier on-call preferences .*Grace Lee, every other weekend/.test(txt()));
  ok('sign-up switch off: said so', /Sign-up on their page is off/.test(txt()));
  WEEK.oncall=Object.assign({}, WEEK.oncall, { shifts:{ day:'Daytime, 7am to 5pm', overnight:'Overnight, 5pm to 7am', whole:'Whole day, 24 hours' }, shift_live:true,
    payroll:[{ month:'2026-11', members:[{ applicant_id:'g', name:'Grace Lee', day:0, overnight:2, whole:1, not_recorded:0, missed:1 }] }, { month:'2026-10', members:[] }] });
  await PW.load(); await sleep(50);
  ok('payroll counts by month, missed ones not paid, counts only, never dollars', /On-call shifts for payroll/.test(txt()) && /November 2026/.test(txt()) && /Grace Lee: 2 overnight, 1 whole day, 1 missed \(not paid\)/.test(txt()) && /Nobody on call/.test(txt()) && !/\$/.test(txt().split('On-call shifts for payroll')[1]||''), txt());
  /* EVERY WEEK (2026-10-30, her "yes to all 7") */
  ok('every week: before its records are on the server, said so; no every-week box on +', /Every week shows here once its records are on the server/.test(txt()));
  const cal2=WEEK.oncall.calendar.map(d=>JSON.parse(JSON.stringify(d)));
  cal2.find(d=>d.date==='2026-10-31').day.confirmed[0].weekly=true;
  cal2.find(d=>d.date==='2026-11-01').overnight.asked[0].weekly=true;
  cal2.find(d=>d.date==='2026-11-14').day.confirmed=[{id:11,applicant_id:'t',name:'Tom Ray',whole:false,shift_recorded:true,missed:null}];
  cal2.find(d=>d.date==='2026-11-14').day.skipped=[{series_id:3,applicant_id:'g',name:'Grace Lee'}];
  WEEK.oncall=Object.assign({}, WEEK.oncall, { weekly_ready:true, calendar:cal2, series:[{id:3,applicant_id:'g',name:'Grace Lee',word:'Saturdays, daytime',slot:'day',weekday:6,status:'confirmed',since:'2026-10-31',confirmed_by:'Krystal'},
    {id:4,applicant_id:'t',name:'Tom Ray',word:'Sundays, overnight',slot:'overnight',weekday:0,status:'asked',since:'2026-11-01',confirmed_by:null}] });
  await PW.load(); await sleep(50);
  ok('every week: Grace\'s Saturday is marked every week, Tom\'s ask says every week', /every week/.test(dayOf('2026-10-31').innerText) && /asked\s*every week/.test(dayOf('2026-11-01').innerText), dayOf('2026-11-01').innerText);
  ok('...the week Tom holds shows Grace missed out that week', /Grace Lee: someone else has it this week/.test(dayOf('2026-11-14').innerText), dayOf('2026-11-14').innerText);
  ok('...the Every-week shifts list: who, which, since, waiting; Stop only on a confirmed one', /Every-week shifts/.test(txt()) && /Grace Lee\s*Saturdays, daytime\s*Since Oct 31, confirmed by Krystal/.test(txt()) && /Tom Ray\s*Sundays, overnight\s*Asked, waiting for you/.test(txt())
    && [...box.querySelectorAll('button')].filter(b=>/They called to stop it/.test(b.innerText)).length===1, txt().slice(txt().indexOf('Every-week shifts'), txt().indexOf('Every-week shifts')+300));
  let confirmed=''; window.ccConfirm=async(m)=>{ confirmed=m; return true; }; (0,eval)('ccConfirm=window.ccConfirm');
  await PW.ocOk(9,null,true); ok('...✓ on an every-week ask says it repeats until they call to stop it', /repeats every week on its own/.test(confirmed) && CALLS.filter(c=>c.action==='oncall_confirm' && c.ask_id===9).length>=2);
  PW.ocOpen('2026-11-02|day'); await sleep(30);
  document.getElementById('ocWeekly_2026-11-02|day').checked=true; await PW.ocPut('2026-11-02','day'); await sleep(30);
  ok('...+ with every week: sends every_week, and says every Monday', CALLS.some(c=>c.action==='oncall_confirm' && c.date==='2026-11-02' && c.shift==='day' && c.every_week===true) && /every Monday from Nov 2/.test(confirmed), confirmed);
  PW.ocOpen('2026-11-03|day'); await sleep(30); const before=CALLS.length; let al=''; window.alert=(m)=>{ al=m; };
  document.getElementById('ocWeekly_2026-11-03|day').checked=true; document.getElementById('ocWhole_2026-11-03|day').checked=true; await PW.ocPut('2026-11-03','day'); await sleep(30);
  ok('...every week and the whole day together: refused, nothing sent', CALLS.length===before && /one shift/.test(al), al);
  PW.ocOpen(''); window.prompt=()=>'New job on Saturdays';
  const realF2=window.fetch; window.fetch=async(u,o)=>{ if(String(u).includes('/functions/v1/prn-week') && JSON.parse(o.body).action==='oncall_series_end'){ CALLS.push(JSON.parse(o.body)); return new Response(JSON.stringify({outcome:'ended',taken_back:['2026-11-07','2026-11-21'],kept:[{date:'2026-10-31',shift:'day'}],failed:[]}),{status:200}); } return realF2(u,o); };
  await PW.ocEnd(3); await sleep(50); window.fetch=realF2;
  ok('...They called to stop it: sends the reason, then says what was taken back and what stays theirs', CALLS.some(c=>c.action==='oncall_series_end' && c.series_id===3 && c.note==='New job on Saturdays') && /Taken back: Nov 7, Nov 21/.test(alerted) && /Still theirs \(within 24 hours\): Oct 31 daytime/.test(alerted) && /24 hours or more/.test(confirmed), alerted);
  /* OUR CAREGIVERS ON CALL (2026-10-30, Level 3 only) */
  const cal3=WEEK.oncall.calendar.map(d=>JSON.parse(JSON.stringify(d)));
  cal3.find(d=>d.date==='2026-11-05').day.confirmed=[{id:21,applicant_id:'ax:501',name:'Maria Lopez',whole:false,shift_recorded:true,missed:null,caregiver:true}];
  WEEK.oncall=Object.assign({}, WEEK.oncall, { calendar:cal3, invite_live:false, people:WEEK.oncall.people.concat([{applicant_id:'ax:501',name:'Maria Lopez',caregiver:true,signed:true,signed_at:'2026-10-30T15:00:00Z',blocked:false}]) });
  await PW.load(); await sleep(50);
  ok('caregivers: Maria on the calendar and in the people list with a Caregiver tag', /Maria Lopez\s*Caregiver/.test(dayOf('2026-11-05').innerText) && /Maria Lopez\s*Caregiver\s*Signed the expectations/.test(txt()), dayOf('2026-11-05').innerText);
  ok('...the Invite box: Level 3 only, invites off said so, loads on a tap', /Invite caregivers to on call/.test(txt()) && /Level 3 \(Advanced Care\) only/.test(txt()) && /Invites are off/.test(txt()) && /Show Level 3 caregivers/.test(txt()));
  const INVR={ ok:true, live:false, message:"Hi {first_name}! We're inviting a few of our caregivers to sign up for on-call shifts. {link}", people:[
    {caregiver_ax:'504',name:'Opal Nophone',first:'Ope',has_phone:false,invited_at:null,signed:false,upcoming:0,blocked:false},
    {caregiver_ax:'501',name:'Maria Lopez',first:'Maria',has_phone:true,invited_at:'2026-10-30T15:00:00Z',invited_via:'text',signed:true,upcoming:2,blocked:false}] };
  const realF3=window.fetch; let opened=''; window.open=(u)=>{ opened=u; };
  window.fetch=async(u,o)=>{ if(String(u).includes('/functions/v1/prn-week')){ const b=JSON.parse(o.body);
      if(b.action==='oncall_invites'){ CALLS.push(b); return new Response(JSON.stringify(INVR),{status:200}); }
      if(b.action==='oncall_invite_link'){ CALLS.push(b); return new Response(JSON.stringify({outcome:'link',link:'https://cc.mo-care.com/oncall.html?c=501&e=1&t=x',live:false}),{status:200}); }
      if(b.action==='oncall_invite_send'){ CALLS.push(b); return new Response(JSON.stringify({outcome:'sent'}),{status:200}); } }
    return realF3(u,o); };
  await PW.invLoad(); await sleep(50);
  ok('...the list: each caregiver with status (invited when, signed, shifts ahead, no phone), Send invite only with a phone', /Opal Nophone\s*Not invited\s*No phone in AxisCare/.test(txt()) && /Maria Lopez\s*Invited Oct 30\s*Signed the expectations\s*2 on-call shifts ahead/.test(txt())
    && /Invite again/.test(txt()) && ![...box.querySelectorAll('button')].some(b=>/^Send invite$/.test(b.innerText)), txt().slice(txt().indexOf('Invite caregivers'), txt().indexOf('Invite caregivers')+500));
  PW.invOpen('501'); await sleep(30);
  const ita=document.getElementById('invMsg_501');
  ok('...Invite again opens the drafted text with her first name, to edit', ita && /^Hi Maria! We're inviting/.test(ita.value) && /\{link\}/.test(ita.value), ita && ita.value);
  ita.value='Hi Maria, want to be on call? {link}'; await PW.invSend('501'); await sleep(50);
  ok('...Send sends her edited words, her id and a send id', CALLS.some(c=>c.action==='oncall_invite_send' && c.caregiver_ax==='501' && c.message==='Hi Maria, want to be on call? {link}' && /^inv-/.test(c.send_id)) && /Sent to Maria Lopez/.test(alerted), alerted);
  await PW.invLink('504'); await sleep(50);
  ok('...Copy link asks for her link and says invites are off', CALLS.some(c=>c.action==='oncall_invite_link' && c.caregiver_ax==='504') && /oncall\.html\?c=501|Copied/.test(alerted) && /Invites are off/.test(alerted), alerted);
  [...box.querySelectorAll('button')].find(b=>/See their page/.test(b.innerText)).click();
  ok('...See their page opens the office preview of her page', /^oncall\.html\?preview=\d+$/.test(opened), opened);
  window.fetch=realF3;
  WEEK.oncall=Object.assign({}, WEEK.oncall, { records_ready:false }); await PW.load(); await sleep(30);
  ok('before Desktop 1190: says the records are not on the server yet', /not on the server yet \(Desktop step 1191\)/.test(txt()));
  WEEK.oncall=Object.assign({}, WEEK.oncall, { records_ready:true, shift_live:false }); await PW.load(); await sleep(30);
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
    pg.evaluate("()=>{ location.hash='#recruit'; rcView('prn'); }"); pg.wait_for_timeout(500); pg.evaluate("async()=>{ PW._state().live=false; await PW.load(); PW.open('thanks:g:cv1'); }"); pg.wait_for_timeout(300)
    pg.locator('#prnWeek').screenshot(path=os.environ.get('SHOT', '/tmp/prn_week.png')); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

"""445 · "Not hiring" / "Candidate pool" messages and the orientation reminder card: the real page, offline, sample rows.
Every server call is answered here; nothing is sent."""
from playwright.sync_api import sync_playwright
H = open('/Users/samantha/Claude/Projects/cc-hub-live/.claude/g1a_harness.js').read()
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,900)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const ID='11111111-1111-1111-1111-111111111111';
  /* the server, answered here */
  window.__calls=[]; window.__preview=null; window.__sendAns={ ok:true, texted:true, emailed:false, not_sent:[] };
  const realInvoke=sb.functions.invoke.bind(sb.functions);
  sb.functions.invoke=async(name,o)=>{ if(name!=='applicant-decision-msg') return realInvoke(name,o); __calls.push(o.body);
    if(o.body.action==='preview') return { data: Object.assign({ ok:true, preview:true, label: o.body.kind==='pool'?'candidate pool message':'not-hiring message' }, __preview), error:null };
    if(o.body.action==='send') return { data: __sendAns, error:null };
    if(o.body.action==='skip') return { data:{ ok:true, skipped:true }, error:null };
    return { data:{ error:'unknown' }, error:null }; };
  window.__upd=[]; const base=sb.from.bind(sb);
  sb.from=t=>{ if(t!=='job_applicants') return base(t);
    const b={ update(p){ b.p=p; return b; }, eq(c,v){ __upd.push([b.p,v]); const r=AP_ROWS.find(x=>x.id===v); if(r) Object.assign(r,b.p); return Promise.resolve({ error:null }); } }; return b; };
  window.apLoad=async()=>{};
  window.__conf=[]; window.__alerts=[]; window.__yes=true;
  window.confirm=m=>{ __conf.push(m); return __yes; }; window.alert=m=>{ __alerts.push(m); };
  const row=o=>Object.assign({ id:ID, first_name:'Dana', last_name:'Doe', phone:'4175550101', email:'d@x.com', sms_consent:true, status:'reviewing' }, o||{});
  const T1="Hi Dana, thank you for applying with Caring Companions and for your time. We've decided not to move forward right now. We wish you the very best. Reply STOP to opt out.";

  /* Not moving forward → the message, OK sends it */
  AP_ROWS=[row()]; __preview={ text:T1, email:null, no_text_why:null, already_sent:false };
  window.prompt=()=> 'no reliable transport';
  await apDecline(ID);
  ok('Not moving forward: they are marked first (the reason saved, never in the message)', __upd.some(([p])=>p.status==='declined' && p.decline_reason==='no reliable transport'), __upd);
  ok('...then the exact message is shown, with OK sends / Cancel sends nothing', __conf.length===1 && __conf[0].includes(T1) && /This sends a TEXT/.test(__conf[0]) && /OK sends it\. Cancel sends nothing\./.test(__conf[0]) && !/transport/.test(__conf[0]), __conf);
  ok('...OK: the server is asked to send that message (preview, then send, no words from the page)', __calls.length===2 && __calls[0].action==='preview' && __calls[1].action==='send' && __calls[1].kind==='declined' && !('message' in __calls[1]), __calls);
  ok('...and the office is told it went and shows in GoHighLevel', /Sent by text\. It shows in their GoHighLevel conversation\./.test(__alerts.pop()||''));

  /* Cancel sends nothing */
  __calls=[]; __conf=[]; __yes=false; AP_ROWS=[row()]; await apDecline(ID);
  ok('Cancel: nothing is sent (they stay marked)', __calls.length===1 && __calls[0].action==='preview' && AP_ROWS[0].status==='declined', __calls);
  __yes=true;

  /* no yes to texts: the email words are shown */
  __calls=[]; __conf=[]; AP_ROWS=[row({ sms_consent:false })];
  __preview={ text:null, email:{ subject:'Your application with Caring Companions', html:'<div><p>Hi Dana, thank you &amp; more.</p><p>Caring Companions In-Home Senior Care<br>417-234-8494</p></div>' }, no_text_why:'they did not agree to texts on their application', already_sent:false };
  await apDecline(ID);
  ok('no yes to texts: it says an EMAIL goes, why no text, and shows the words', /This sends an EMAIL \(no text: they did not agree to texts on their application\)/.test(__conf[0]||'') && /Subject: Your application with Caring Companions/.test(__conf[0]) && /thank you & more\./.test(__conf[0]) && !/<p>/.test(__conf[0]), __conf);

  /* nothing can go */
  __calls=[]; __conf=[]; AP_ROWS=[row({ sms_consent:false, email:null })]; __preview={ text:null, email:null, no_text_why:'they did not agree to texts on their application', already_sent:false };
  await apDecline(ID);
  ok('no way to reach them: no question asked, it says why and that nothing was sent', __conf.length===0 && /No not-hiring message can go to Dana: they did not agree to texts on their application, and there is no email on file\. Nothing was sent\./.test(__alerts.pop()||''), __alerts);

  /* already sent: silent */
  __calls=[]; __conf=[]; AP_ROWS=[row()]; __preview={ text:T1, email:null, already_sent:true }; await apDecline(ID);
  ok('already sent for this decision: nothing is asked or sent again', __conf.length===0 && __calls.length===1);

  /* outside hours: it waits */
  __calls=[]; __conf=[]; AP_ROWS=[row()]; __preview={ text:T1, email:null, already_sent:false };
  __sendAns={ ok:true, held:'Messages to applicants go 8am to 6pm. After 8am, open their profile and press "Send the not-hiring message".' };
  await apDecline(ID);
  ok('outside 8am–6pm: it says nothing went yet and how to send it later', /^Nothing went yet\. Messages to applicants go 8am to 6pm\./.test(__alerts.pop()||''));
  __sendAns={ ok:true, texted:true, emailed:false, not_sent:[] };

  /* Candidate pool: a new pool member is offered the message; editing a pool member is not */
  window.prompt=(q,d)=>d||'Weekdays';
  __calls=[]; __conf=[]; AP_ROWS=[row()]; __preview={ text:'POOL WORDS Reply STOP to opt out.', email:null, already_sent:false };
  await apToPool(ID);
  ok('Candidate pool (new): marked, then the pool message is offered', AP_ROWS[0].status==='pool' && __calls[0] && __calls[0].kind==='pool' && /Send Dana the candidate pool message\?/.test(__conf[0]||''), [__calls, __conf]);
  __calls=[]; __conf=[]; AP_ROWS=[row({ status:'pool' })]; await apToPool(ID);
  ok('editing what a pool member is waiting for sends nothing and asks nothing', __calls.length===0 && __conf.length===0, __calls);

  /* the panel on their profile and list card */
  const P=r=>{ const d=document.createElement('div'); d.innerHTML=apDecisionPanel(r); return d; };
  let d=P(row({ status:'declined', decision_msg_at:'2026-10-04T15:00:00Z', decision_msg_kind:'declined', decision_msg_by:'Krystal' }));
  ok('sent: "The not-hiring message was sent Oct 4, 2026 by Krystal."', /The not-hiring message was sent Oct 4, 2026 by Krystal\./.test(d.innerText), d.innerText);
  d=P(row({ status:'pool', decision_msg_held_at:'2026-10-04T23:00:00Z' }));
  const btns=[...d.querySelectorAll('button')].map(b=>b.textContent);
  ok('waiting: says why and offers "Send the candidate pool message" and "Don\'t send it"', /candidate pool message is waiting: messages to applicants go 8am to 6pm/.test(d.innerText) && btns.join('|')==="Send the candidate pool message|Don't send it", [d.innerText, btns]);
  ok('a declined person with nothing sent or waiting (an older decision) shows nothing and no send button', P(row({ status:'declined' })).innerHTML==='' && P(row({ status:'reviewing', decision_msg_held_at:'x' })).innerHTML==='');
  __calls=[]; AP_ROWS=[row({ status:'pool', decision_msg_held_at:'x' })]; await apDecisionSkip(ID);
  ok('"Don\'t send it" asks the server to drop the waiting message', __calls.length===1 && __calls[0].action==='skip');

  /* the interview card's outcome uses the same step */
  ok('the interview card (Not hiring / Candidate pool) offers the same message after it saves', /if\(outcome==='declined' \|\| outcome==='pool'\) await apDecisionOffer\(id, outcome\);/.test(apOutcome.toString()));

  /* Settings, Orientation reminders */
  const iso=m=>new Date(Date.now()-m*60e3).toISOString();
  window.__rr=[]; window.__runs=[]; window.__missing=false;
  const tbl=rows=>{ const b={ select(){return b;}, order(){return b;}, limit(){ return Promise.resolve(__missing?{ data:null, error:{ message:'relation does not exist', code:'42P01' } }:{ data:rows(), error:null }); } }; return b; };
  const base2=sb.from; sb.from=t=>t==='orient_reminders'?tbl(()=>__rr):t==='orient_remind_runs'?tbl(()=>__runs):base2(t);
  const s=document.getElementById('orrSet'), list=document.getElementById('orrList');
  ok('the Settings section is there', !!s && !!list && /Office orientation reminders/.test(s.closest('.settings-section').querySelector('h3').textContent));
  DATA.ops_settings={ orient_remind_live:false };
  __runs=[{ at:iso(5), mode:'practice', ok:true, sessions:1, due:2, skipped:1 }];
  __rr=[{ at:iso(5), mode:'practice', session_date:'2026-10-06', who:'Ava S', result:'would', detail:'Hi Ava...' },
        { at:iso(5), mode:'practice', session_date:'2026-10-06', who:'Di E', result:'skipped', detail:'no usable phone number' }];
  await orrSetFill();
  ok('OFF (practice): what it does, that nothing is sent, when to turn it on (with the GoHighLevel workflow), the last check', /Office orientation reminders from the Hub: OFF \(practice\)\./.test(s.innerText) && /nothing is sent/.test(s.innerText) && /Orientation booked - remind/.test(s.innerText) && /Last check .*: 2 due for tomorrow, 1 skipped\./.test(s.innerText), s.innerText);
  ok('...the list: who it would remind and who it would skip, and why', /Ava S · orientation Tue, Oct 6 · would be reminded/.test(list.innerText) && /Di E · orientation Tue, Oct 6 · skipped \(no usable phone number\)/.test(list.innerText), list.innerText);
  let merged=null; window.tkMerge=async(fn)=>{ const m={}; const ch=fn(m,{}); merged=m; DATA.ops_settings=Object.assign({},DATA.ops_settings,m); return { changed:ch, error:null }; };
  __conf=[]; await orrToggle(document.getElementById('orrSetBtn'));
  ok('turning it on: the confirm says to turn off the GoHighLevel workflow; saved through the shared settings merge', merged && merged.orient_remind_live===true && /Turn off the GoHighLevel workflow "Orientation booked - remind" at the same time/.test(__conf[0]||''), [merged, __conf]);
  __rr=[{ at:iso(3), mode:'live', session_date:'2026-10-06', who:'Ava S', result:'sent', sent_at:iso(3) },
        { at:iso(3), mode:'live', session_date:'2026-10-06', who:'Bo N', result:'not_sent', detail:'they did not agree to texts on their application' },
        { at:iso(3), mode:'live', session_date:'2026-10-06', who:'Cy D', result:'failed', detail:'GoHighLevel did not accept it (a card is on Needs Attention)' }];
  await orrSetFill();
  ok('ON: says so, reminds to keep the GoHighLevel workflow off; the button says Turn off', /Office orientation reminders from the Hub: ON\./.test(s.innerText) && /workflow "Orientation booked - remind" is off/.test(s.innerText) && document.getElementById('orrSetBtn').textContent==='Turn off', s.innerText);
  ok('...the live list: reminded, not texted (why), could not be texted (why)', /Ava S · orientation Tue, Oct 6 · reminded/.test(list.innerText) && /Bo N .* not texted \(they did not agree to texts/.test(list.innerText) && /Cy D .* could not be texted \(GoHighLevel did not accept it/.test(list.innerText), list.innerText);
  __runs=[{ at:iso(1), mode:'live', ok:false, error:'the orientation sessions could not be read' }]; await orrSetFill();
  ok('a check that could not finish says so', /could not finish: the orientation sessions could not be read/.test(s.innerText), s.innerText);
  __missing=true; ORR.rows=null; await orrSetFill();
  ok('before 445: "Not installed yet (Desktop 445)", no list, no error', /Not installed yet \(Desktop 445\)\./.test(s.innerText) && list.innerHTML==='' && !ORR.err, s.innerText);
  ok('no em dash anywhere it drew', !/—/.test(s.innerText+list.innerText+__conf.join('')));
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page()
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=l3'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', H)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

"""The lead workspace (her design's screen 2, 2026-10-07). The real page, offline, made-up families, the clock frozen at Tue Oct 6
2026 10:10 am Chicago. Proves: a family who replied opens on a red next card with the one task, her words, the script line and
the outcome buttons; the five steps carry dates; the older lead card, AI card and command tiles step aside; What we know flags
only what the next stage needs; the timeline is newest first with the Hub's own acknowledgment; the rail reads availability;
Owner, a note, Waiting on and a typed text all write through the Hub's own doors; a family who said yes gets the journey, not
the workspace. (python3 tests/browser/leads_workspace_look.py, static server on 8765; writes workspace.png)"""
from playwright.sync_api import sync_playwright
STUB = r"""
(()=>{
  const W=window; W.__log={ writes:[], sms:[] };
  (0,eval)(`window.__RealDate=Date; window.__NOW=new __RealDate('2026-10-06T15:10:00Z').getTime();
    Date=class extends __RealDate{ constructor(...a){ if(a.length) super(...a); else super(window.__NOW); } static now(){ return window.__NOW; } };`);
  (0,eval)(`sb={ from:()=>{ const p={ select(){return p;}, eq(){return p;}, in(){return p;}, not(){return p;}, order(){return p;}, limit(){return p;},
      maybeSingle:async()=>({data:null,error:null}), then(a){ return Promise.resolve({data:[],error:null}).then(a); } }; return p; },
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async()=>({data:null,error:null}) }, auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };`);
  W.persist=async(k,v)=>{ W.__log.writes.push(JSON.parse(JSON.stringify(v))); };
  W.commsCall=async(b)=>{ W.__log.sms.push(b); return { ok:true }; };
  W.lsLoadFacts=async()=>{ LS.facts={ epOf:{}, scOf:{}, planOf:{} }; }; W.ccToast=()=>{}; W.opEvent=()=>{}; W.myWorkRefresh=()=>{}; W.renderLeadsStarts=()=>{};
  W.refreshCommsTimeline=async()=>{}; W.axLogLoad=async()=>{}; W.callsLoad=async()=>{}; W.cpRenderEvvForms=async()=>{}; W.famMount=async()=>{}; W.cjMountProfile=async()=>{};
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Land' }; OPS_PEOPLE=[{ primary_email:'krystal@mo-care.com', full_name:'Krystal Land' },{ primary_email:'angiel@mo-care.com', full_name:'Angiel Rose' }];");
  DATA.ops_settings={ lead_response_hours:{ days:[0,1,2,3,4,5,6], start:'08:00', end:'18:00' } };
  DATA.referral_orgs=[{ id:'org1', name:'Mercy Rehab', phone:'4175550100', people:'Jan, discharge planner' }]; DATA.care_assessments=[]; DATA.post_call_followups=[]; DATA.ops_items=[];
  DATA.caregivers=[{ axiscare_id:'11', city:'Nixa' },{ axiscare_id:'12', city:'Ozark' }];
  DATA.caregiver_availability=[{ axiscare_id:'11', name:'A', windows:{ mon:['morning'], tue:['morning'], wed:['morning'], thu:['morning'], fri:['morning'] } },{ axiscare_id:'12', name:'B', windows:{ mon:['morning'], tue:['morning'], wed:['morning'], thu:['morning'], fri:['morning'] } },{ axiscare_id:'13', name:'C', windows:{ sat:['evening'] } }];
  DATA.leads=[
    { id:'dia', first_name:'Diane', last_name:'Teague', client_first_name:'Marjorie', client_last_name:'Teague', relationship:'daughter', source:'Website', client_city:'Nixa', funding_source:'private', phone:'4175550131', email:'diane@example.com',
      desired_start:{ kind:'by_date', date:'2026-10-09' }, schedule:{ days:['Mon','Tue','Wed','Thu','Fri'], times:'9 am-1 pm', hours_per_week:20 }, why_called:'Mom fell last week, needs help mornings', safety:['fallRisk'], mobility:'walker', needs:['personalCare'],
      status:'Contacted', assigned_coordinator:'Krystal', created_at:'2026-10-06T02:52:00Z', ack_sent_at:'2026-10-06T02:52:10Z', ack_kind:'after_hours', first_human_attempt_at:'2026-10-06T13:12:00Z', family_last_reply_at:'2026-10-06T14:48:00Z',
      contact_events:[{ at:'2026-10-06T02:52:00Z', channel:'web', direction:'in', outcome:'inquiry', actor:'family', note:'Mom fell last week, needs help mornings' },
        { at:'2026-10-06T02:52:10Z', channel:'sms', direction:'out', outcome:'sent', actor:'automation', note:'acknowledgment' },{ at:'2026-10-06T02:52:11Z', channel:'email', direction:'out', outcome:'sent', actor:'automation', note:'acknowledgment' },
        { at:'2026-10-06T13:12:00Z', channel:'call', direction:'out', outcome:'voicemail', actor:'human', by:'krystal@mo-care.com', note:'left my name and the office number' },
        { at:'2026-10-06T14:48:00Z', channel:'sms', direction:'in', outcome:'received', actor:'family', ref:'Can someone call me after 4 today? I am at work until then.' }],
      comm_log:[{ body:'☎ call — voicemail: left my name and the office number', at:'2026-10-06T13:12:00Z', by:'krystal@mo-care.com' }] },
    { id:'har', first_name:'Harold', last_name:'Pruitt', client_first_name:'Harold', client_last_name:'Pruitt', why_called:'Calling for himself', funding_source:'va', referral_org_id:'org1', source:'Referral', status:'Converted', phone:'4175550177', assigned_coordinator:'Krystal',
      first_human_contact_at:'2026-10-01T20:00:00Z', said_yes_at:'2026-10-05T15:00:00Z', said_yes_by_name:'Krystal Land', created_at:'2026-10-01T13:00:00Z', contact_events:[{ at:'2026-10-01T20:00:00Z', channel:'call', direction:'out', outcome:'connected', actor:'human' }] },
    { id:'new1', first_name:'Patrice', last_name:'Keller', client_first_name:'Ruth Ann', client_last_name:'Keller', source:'Website', status:'New', phone:'4175550164', created_at:'2026-10-06T14:58:00Z', assigned_coordinator:'', contact_events:[{ at:'2026-10-06T14:58:00Z', channel:'web', direction:'in', outcome:'inquiry', actor:'family' }] } ];
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,900)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const lastLead=id=>window.__log.writes.filter(x=>x.id===id).slice(-1)[0]; const vis=id=>{ const el=document.getElementById(id); return !!el && el.style.display!=='none' && el.offsetParent!==null; };
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  await openClient({ lead_id:'dia' }, 'summary'); await sleep(400);
  const host=document.getElementById('lwHost'), T=()=>host.innerText;
  ok('Diane opens on the workspace: the Overview tab, the host showing, one red next card', vis('lwHost') && CP.tab==='summary' && host.querySelector('.lw-next') && host.querySelector('.lw-next').style.borderColor==='rgb(220, 38, 38)', [vis('lwHost'), CP.tab]);
  ok('...the older lead card, the AI card and the command box step aside (one card, not layers)', !vis('lp_head_card') && !vis('lp_ai_card') && !vis('cpcGrid') && !vis('cpcPath') && !vis('cpCommand'), [vis('lp_head_card'), vis('lp_ai_card'), vis('cpcGrid'), vis('cpCommand')]);
  ok('the next card: Replied 22 min ago · Answer Diane · what she wrote · the "They replied" script line · Text back is the filled button', /NEXT · NOW\s*Replied 22 min ago/i.test(T()) && /Answer Diane/.test(T()) && /DIANE WROTE\s*"Can someone call me after 4 today/i.test(T()) && /SCRIPT · THEY REPLIED/i.test(T()) && /Hi Diane, thank you for getting back to me/.test(T())
    && host.querySelector('.lw-next .lb-btn-primary') && host.querySelector('.lw-next .lb-btn-primary').textContent==='Text back', T().slice(0,700));
  ok('...the outcome buttons: Call from the office line (LeadConnector), Log call, Set a follow-up, and the promise "Nothing goes to Diane unless you send it"', host.querySelector('.lw-next a[data-oc-phone="4175550131"]') && /Log call/.test(host.querySelector('.lw-next').innerText) && /Set a follow-up/.test(host.querySelector('.lw-next').innerText) && /Nothing goes to Diane unless you send it/.test(T()));
  const steps=[...host.querySelectorAll('.lw-step')].map(s=>s.innerText.replace(/\s+/g,' ').trim());
  ok('five steps with dates: New ✓ (last night, auto-acknowledged immediately) · Reaching out ✓ (voicemail 8:12 am, 1 try) · Reached ● now · Assessment not booked · Yes then Getting ready', steps.length===5 && /✓ NEW.*last night at 9:52 pm · auto-acknowledged immediately/i.test(steps[0]) && /✓ REACHING OUT.*voicemail 8:12 am · 1 try/i.test(steps[1]) && /● REACHED/i.test(steps[2]) && /not booked/.test(steps[3]) && /then Getting ready/.test(steps[4]), steps);
  ok('the story line and what they need, from the same row the board draws', /Mom fell last week, needs help mornings · They texted 9:48 am · Website/.test(T()) && /Wants care by Fri · Private pay · Mon–Fri 9 am-1 pm · about 20 hrs\/wk · Nixa/.test(T()), T().slice(0,300));
  ok('Owner is a picker holding Krystal; They said yes is green (she was never reached, so it is NOT offered yet); Mark lost… and Waiting on… are there', document.getElementById('lwOwner').value==='Krystal' && !host.querySelector('.cj-yes-btn') && /Mark lost/.test(T()) && /Waiting on…/.test(T()), [document.getElementById('lwOwner').value, !!host.querySelector('.cj-yes-btn')]);
  const facts=[...host.querySelectorAll('.lw-fact')].map(f=>f.innerText.replace(/\s+/g,' ').trim());
  ok('What we know: who needs care (with why), the decision-maker, start, schedule, payer (no price quoted yet), where, needs and safety (fall risk, walker, personal care), came from (website, last night)', facts.length===8 && /WHO NEEDS CARE Marjorie Teague · Mom fell/.test(facts[0]) && /DECISION-MAKER Diane Teague \(daughter\) · 4175550131/.test(facts[1]) && /Wants care by Fri/.test(facts[2]) && /Mon–Fri 9 am-1 pm/.test(facts[3]) && /Private pay · no price quoted yet/.test(facts[4]) && /WHERE Nixa/.test(facts[5]) && /Fall risk · Walker · Personal care/.test(facts[6]) && /Website · last night/.test(facts[7]), facts);
  ok('...nothing is red for Diane (she is still Talking; the stage needs nothing she has not given)', !host.querySelector('.lw-miss'));
  const tl=[...host.querySelectorAll('.lw-tl-row')].map(r=>r.innerText.replace(/\s+/g,' ').trim());
  ok('the timeline, newest first: her text · Krystal\'s voicemail · the hours opening (first call due 8:05) · the Hub\'s acknowledgment by text and email · the inquiry from Website to Krystal (with her words)', tl.length===5 && /^Today 9:48 am They texted "Can someone call me/.test(tl[0]) && /^Today 8:12 am Krystal called · voicemail left my name/.test(tl[1]) && /^Today 8 am Lead response hours opened first call due 8:05 am/.test(tl[2]) && /Acknowledged by the Hub by text and email after hours/.test(tl[3]) && /Inquiry from Website · to Krystal Mom fell/.test(tl[4]), tl);
  ok('the rail: Coming up says nothing scheduled; Contacts has Diane (decides, office-line link) and Marjorie (the client) and no partner; Can we staff it reads 2 of 3 available Mon–Fri mornings, 1 in Nixa', /Nothing scheduled/.test(T()) && /Diane Teague · daughter, decides/.test(T()) && /Marjorie Teague · the client/.test(T()) && /No referral partner on this one \(website\)/.test(T()) && /2 caregivers say they are available Mon–Fri mornings · 1 in Nixa · of 3 with availability on file/.test(T()), T().slice(-900));
  /* the doors: owner, a note, waiting on, a text */
  await lwOwner('Angiel'); await sleep(150); let w=lastLead('dia');
  ok('Owner → Angiel is saved on the inquiry and the picker follows', w.assigned_coordinator==='Angiel' && document.getElementById('lwOwner').value==='Angiel', w.assigned_coordinator);
  document.getElementById('lwNoteIn').value='Diane works until 4, daughter is the decision-maker'; await lwNote(); await sleep(150); w=lastLead('dia');
  ok('a note goes on the record (comm_log, kind note, by Krystal) and tops the timeline', w.comm_log.slice(-1)[0].kind==='note' && w.comm_log.slice(-1)[0].by==='krystal@mo-care.com' && /Krystal: Diane works until 4/.test(host.querySelector('.lw-tl-row').innerText), w.comm_log.slice(-1)[0]);
  lwWaiting(host.querySelector('.lw-moves .lb-btn')); await sleep(100);
  const pop=document.querySelector('.ccpop'); pop.querySelector('#lwWaitReason').value='family_decision'; pop.querySelector('#lwWaitReason').dispatchEvent(new Event('change'));
  ok('Waiting on… offers the reasons and fills the check-back date by the rule (family deciding: 7 days → Oct 13)', pop.querySelector('#lwWaitDate').value==='2026-10-13', pop.querySelector('#lwWaitDate').value);
  pop.querySelector('#lwWaitNote').value='talking to her brother'; pop.querySelector('#lwWaitGo').click(); await sleep(250); w=lastLead('dia');
  ok('...saved through the intake\'s own rules: waiting {family_decision, since today, check back Oct 13, note}; the move button now says Waiting on: family decision', w.waiting && w.waiting.reason==='family_decision' && w.waiting.since==='2026-10-06' && w.waiting.check_back==='2026-10-13' && w.waiting.note==='talking to her brother' && /Waiting on: family decision/.test(T()), w.waiting);
  ok('...but her reply still outranks the wait on the next card (a person must answer her first)', /Replied 22 min ago/.test(T()) && /Answer Diane/.test(T()));
  lwText(host.querySelector('.lw-next .lb-btn-primary')); await sleep(100);
  const tp=document.querySelector('.ccpop'); tp.querySelector('#lwTextIn').value='Hi Diane, Krystal here. 4:15 works, I will call you then.'; tp.querySelector('#lwTextGo').click(); await sleep(300); w=lastLead('dia');
  ok('a typed text goes through the comms door as Krystal, is recorded as a human text, and her reply is now answered: the next card moves on', window.__log.sms.length===1 && window.__log.sms[0].action==='send_sms' && /4:15 works/.test(window.__log.sms[0].message) && w.contact_events.slice(-1)[0].actor==='human' && w.contact_events.slice(-1)[0].channel==='sms' && !/Replied 22 min ago/.test(T()), [window.__log.sms, T().slice(0,200)]);
  ok('...and the timeline shows "Krystal texted" with the words', /Krystal texted "Hi Diane, Krystal here/.test(host.querySelector('.lw-tl-row').innerText), host.querySelector('.lw-tl-row').innerText);
  /* a brand-new website inquiry: the first-call script with the website hint, red only where needed, nobody owns it */
  await openClient({ lead_id:'new1' }, 'summary'); await sleep(400);
  ok('Patrice (new, 12 min, nobody has tried): NEW · 12 min, the first-call script with her name, Ruth Ann and Krystal, the website hint, Call is the filled button', /NEW · 12 min/.test(T()) && /Hi Patrice, this is Krystal with Caring Companions\. Thank you for reaching out about care for Ruth Ann/.test(T()) && /website form/.test(T()) && host.querySelector('.lw-next .lb-btn-primary').textContent==='Call from the office line', T().slice(0,600));
  ok('...nothing red yet either (a brand-new lead is never flagged for six unasked questions), the owner picker says Nobody', !host.querySelector('.lw-miss') && document.getElementById('lwOwner').value==='', document.getElementById('lwOwner').value);
  /* a family who said yes: the workspace steps aside */
  await openClient({ lead_id:'har' }, 'summary'); await sleep(400);
  ok('Harold said yes: no workspace, the older cards and tiles are back', !vis('lwHost') && document.getElementById('lp_head_card').style.display!=='none' && document.getElementById('cpcGrid').style.display!=='none');
  /* the settings block */
  switchTab('settings'); await sleep(300); lwScriptsFill();
  const sbx=document.getElementById('lwScripts');
  ok('Settings → Leads has the 11 script lines, blank, with the standard wording in grey', sbx && sbx.querySelectorAll('textarea[data-script]').length===11 && sbx.querySelector('textarea[data-script="voicemail"]').placeholder.indexOf('returning your message')>-1, sbx && sbx.querySelectorAll('textarea').length);
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1360, 'height': 1000})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=leadsws'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T)
    pg.evaluate("async()=>{ await openClient({ lead_id:'dia' }, 'summary'); }"); pg.wait_for_timeout(500)
    pg.screenshot(path='tests/browser/workspace.png', full_page=True)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

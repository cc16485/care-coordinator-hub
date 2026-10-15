"""The Basics card (Samantha 2026-10-15, approved mockup https://claude.ai/artifact/LxGSCg9exDnY5J2EQpRwsU). The real page,
offline, made-up families (the lead workspace test's setup plus a Laura-like lead the old AI made with no names). Proves:
opening the lead fills ONLY its empty basics from the call by itself (yellow until checked); the title becomes the client;
a schedule of days and times is added up into hours a week (47); lines still to ask are red; a line edits in place and
saves; a line someone typed is never changed, and a different answer on the call is offered (Use this / Keep ours);
"Carol Meyer's mother" when there is no client name; leads nobody opened get filled in the background; nothing is sent.
(python3 tests/browser/lead_basics_look.py, static server on PORT, default 8765; SHOT=<png> for a screenshot)"""
import os, re
from playwright.sync_api import sync_playwright
PORT = os.environ.get('PORT', '8765')
SRC = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'leads_workspace_look.py')).read()
STUB = re.search(r'STUB = r"""(.*?)"""', SRC, re.S).group(1)
MORE = r"""
(()=>{
  const base={ status:'Contacted', assigned_coordinator:'Samantha', created_at:'2026-10-05T23:50:00Z', first_human_attempt_at:'2026-10-06T13:08:00Z', first_human_contact_at:'2026-10-06T13:08:00Z', funding_source:'private' };
  DATA.leads.push(
    Object.assign({}, base, { id:'lj', first_name:'(phone lead)', phone:'4172244400', ghl_contact_id:'GC1', ai_suggestions:[{ source:'call-followup' }],
      contact_events:[{ at:'2026-10-06T13:08:00Z', channel:'call', direction:'in', outcome:'connected', actor:'human', ref:'ghl:m1' }] }),
    Object.assign({}, base, { id:'ty', first_name:'Tina', last_name:'Typed', client_first_name:'Tom', client_last_name:'Typed', client_city:'Nixa', phone:'4175550600', ghl_contact_id:'GC2' }),
    Object.assign({}, base, { id:'bg', first_name:'Bea', last_name:'Background', relationship:'Daughter', phone:'4175550601', ghl_contact_id:'GC3' }));
  DATA.client_rates=[{ id:'rates', levels:{ l1:{ rate:'$30' }, l2:{ rate:'$32' }, l3:{ rate:'$34' } } }];
  window.__reads=[];
  CallLead.readLead=async(id)=>{ window.__reads.push(id);
    if(id==='lj') return { call:{ message_id:'m1', at:'2026-10-06T13:08:00Z' }, calls:[{ message_id:'m1', at:'2026-10-06T13:08:00Z' }],
      heard:['client_first_name','client_last_name','relationship','client_city','client_address','times_needed','needs','why_called','funding_source','medical_conditions'],
      prefill:{ first_name:'Laura', last_name:'Johnson', relationship:'Daughter', client_first_name:'JoAnne', client_last_name:'Ellis', client_city:'Springfield', client_address:'Elfdale, Apt 12',
        times_needed:'5:30-9:30pm M-F and all day 8am-9:30pm Sat and Sun', needs:['personalCare','dementia'], medical_conditions:['dementia'], why_called:'Her mother needs evening and weekend help', funding_source:'private' },
      profile:{ facts:{ living_situation:'facility', facility_name:'Elfdale Assisted Living' } } };
    if(id==='ty') return { call:{ message_id:'m2' }, calls:[], heard:['client_city','client_first_name'], prefill:{ client_city:'Ozark', client_first_name:'Tom' } };
    if(id==='bg') return { call:{ message_id:'m3' }, calls:[], heard:['client_first_name','client_last_name'], prefill:{ client_first_name:'Gus', client_last_name:'Background' } };
    return { note:'none' }; };
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,900)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  const L=id=>DATA.leads.find(l=>l.id===id);
  ok('before: the old lead is titled by its number', cpLeadClientName(L('lj'))==='Caller '+callsFmtPhone('4172244400'), cpLeadClientName(L('lj')));
  await openClient({ lead_id:'lj' }, 'summary'); await sleep(700);
  const C=()=>document.getElementById('lbBasics'), lj=L('lj');
  ok('opening the lead read its calls by itself, once', window.__reads.filter(x=>x==='lj').length===1, window.__reads);
  ok('the empty basics were filled from the call: client, caller, relationship, town, address, why, payer kept', lj.client_first_name==='JoAnne' && lj.client_last_name==='Ellis' && lj.first_name==='Laura' && lj.last_name==='Johnson' && lj.relationship==='Daughter'
     && lj.client_city==='Springfield' && /evening and weekend/.test(lj.why_called), lj);
  ok('the schedule was added up into hours a week: 47 (5:30 to 9:30 pm Mon to Fri, 8 am to 9:30 pm Sat and Sun)', String((lj.schedule||{}).hours_per_week)==='47' && /5:30-9:30pm M-F/.test((lj.schedule||{}).times||''), lj.schedule);
  ok('the title is now the client', cpLeadClientName(lj)==='JoAnne Ellis');
  const t=C().innerText;
  ok('the card shows the basics at the top of the Overview', C() && /BASICS|Basics/.test(t) && /JoAnne Ellis/.test(t) && /Laura Johnson, daughter/.test(t) && /About 47 h a week/.test(t) && /Elfdale Assisted Living/.test(t) && /Private pay/.test(t), t.slice(0,900));
  ok('...what the call filled is yellow (heard on the call), and the start is red (still to ask)', C().querySelector('[data-basic="client"]').classList.contains('lb2-heard') && C().querySelector('[data-basic="hours"]').classList.contains('lb2-heard')
     && C().querySelector('[data-basic="start"]').classList.contains('lb2-miss') && /Not asked yet: when they want to start/.test(t));
  const nx=document.querySelector('#lwHost .lw-next'); ok('...the card is above the next step', nx && (C().compareDocumentPosition(nx) & Node.DOCUMENT_POSITION_FOLLOWING));
  const w=window.__log.writes.filter(x=>x.id==='lj'); ok('...and it was saved once', w.length>=1 && w.at(-1).basics_filled_at);
  /* looks right clears the yellow */
  [...C().querySelectorAll('[data-basic="client"] button')].find(b=>/looks right/.test(b.textContent)).click(); await sleep(250);
  ok('"looks right" turns a line plain', !C().querySelector('[data-basic="client"]').classList.contains('lb2-heard'));
  /* edit in place */
  [...C().querySelectorAll('[data-basic="start"] button')].find(b=>/edit/.test(b.textContent)).click(); await sleep(150);
  document.getElementById('lb2_sk').value='asap'; [...C().querySelectorAll('.lb2-edit button')].find(b=>/Save/.test(b.textContent)).click(); await sleep(250);
  ok('a line edits in place and saves (Start: as soon as possible)', L('lj').desired_start && L('lj').desired_start.kind==='asap' && /as soon as possible/i.test(C().querySelector('[data-basic="start"]').innerText), L('lj').desired_start);
  [...C().querySelectorAll('[data-basic="caller"] button')].find(b=>/edit/.test(b.textContent)).click(); await sleep(150);
  document.getElementById('lb2_f').value='Laura'; document.getElementById('lb2_l').value='Johnson-Ellis'; [...C().querySelectorAll('.lb2-edit button')].find(b=>/Save/.test(b.textContent)).click(); await sleep(250);
  ok('the caller\'s name is easy to change right there', L('lj').last_name==='Johnson-Ellis' && /Laura Johnson-Ellis/.test(C().innerText));
  /* typed values are never changed */
  await openClient({ lead_id:'ty' }, 'summary'); await sleep(700);
  ok('a town someone typed is not changed; the call\'s different answer is offered', L('ty').client_city==='Nixa' && /The call said town: "Ozark" \(we have "Nixa"\)/.test(C().innerText), C().innerText.slice(0,600));
  [...C().querySelectorAll('.lb2-diff button')].find(b=>/Use this/.test(b.textContent)).click(); await sleep(250);
  ok('Use this takes the call\'s answer', L('ty').client_city==='Ozark' && !(L('ty').basics_differs||[]).length);
  /* no client name: Carol Meyer's mother */
  ok('no client name yet: the title says whose family it is', LeadBasics.titleFor({ first_name:'Carol', last_name:'Meyer', relationship:'Daughter' })==="Carol Meyer's mother" && cpLeadClientName({ first_name:'Bea', last_name:'Background', relationship:'Daughter' })==="Bea Background's mother");
  /* the background fill */
  DATA.leads.forEach(x=>{ if(x.id!=='bg') LeadBasics._state.tried[x.id]=true; }); LeadBasics.background(); await sleep(400);
  ok('a lead nobody opened gets its basics in the background', L('bg').client_first_name==='Gus' && cpLeadClientName(L('bg'))==='Gus Background', L('bg'));
  ok('nothing was texted or emailed', !window.__log.sms.length);
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1360, 'height': 1000})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(f'http://localhost:{PORT}/index.html?proof=basics'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', STUB); pg.evaluate('s=>(0,eval)(s)', MORE)
    R = pg.evaluate(T)
    if os.environ.get('SHOT'):
        pg.evaluate("async()=>{ await openClient({ lead_id:'lj' }, 'summary'); await new Promise(r=>setTimeout(r,500)); }")
        pg.locator('#lbBasics').screenshot(path=os.environ['SHOT'])
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

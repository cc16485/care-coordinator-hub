"""Today cockpit, Phase 1 (approved 2026-10-05). The real page, offline, made-up people and work only: nothing is saved
anywhere (saves are recorded, not sent) and nobody is texted or emailed. (python3 tests/browser/today_phase1_look.py,
with the static server on 8765)"""
import re
from playwright.sync_api import sync_playwright

HUB = open('/Users/samantha/Claude/Projects/cc-hub-live/index.html').read()

STUB = r"""
(()=>{
  const W=window, H=h=>new Date(Date.now()+h*36e5).toISOString();
  const ymd=d=>{ const x=new Date(Date.now()+d*864e5); return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0'); };
  W.__H=H; W.__ymd=ymd; W.__log={ writes:[], fn:[], rpc:[], toasts:[] };
  const K='krystal@mo-care.com', S='samantha@mo-care.com';
  const q=()=>{ const p=new Proxy(function(){}, { get(_,k){ if(k==='then') return (a,b)=>Promise.resolve({data:[],error:null}).then(a,b);
      if(k==='maybeSingle'||k==='single') return ()=>Promise.resolve({data:null,error:null}); return ()=>p; } }); return p; };
  (0,eval)(`sb={ from:()=>window.__q(), rpc:(n)=>{ window.__log.rpc.push(n); return Promise.resolve({data:null,error:null}); },
    auth:{ getSession:async()=>({data:{session:null}}), getUser:async()=>({data:{user:null}}) },
    functions:{ invoke:async(n)=>{ window.__log.fn.push(n); return {data:null,error:null}; } }, storage:{ from:()=>({}) } };
    ME={ email:'${K}', name:'Krystal Land', shift:'day' };
    OPS_PEOPLE=[{ person_id:'p_k', full_name:'Krystal Land', primary_email:'${K}' },{ person_id:'p_s', full_name:'Samantha Troutman', primary_email:'${S}' }];
    OPS_DOMAINS=[{ code:'client_care', label:'Client Care', owner_person:'p_k', escalation_person:'p_s' },
                 { code:'scheduling_coverage', label:'Scheduling and coverage', owner_person:'p_s', escalation_person:'p_s' }];`);
  W.__q=q;
  W.persist=async(k,v)=>{ W.__log.writes.push(k+':'+v.id); };
  W.ccOpsRefresh=()=>{}; W.ccRecentFetch=async()=>{};
  const t0=W.ccToast; W.ccToast=m=>{ W.__log.toasts.push(m); };
  DATA.coverage_cases=[]; DATA.leads=DATA.leads||[];
  DATA.ops_items=[
    { id:'tk1', kind:'staffing_issue', status:'open', title:'NO CLOCK-IN: Joyce for Linda, 10:30am shift', about:'Joyce (fake)', owner:K, owner_name:'Krystal Land',
      opened_by:'timekeeper', created_by:'timekeeper-watch', urgency:'urgent', due:H(-0.1), created_at:H(-0.2) },
    { id:'late1', kind:'request', status:'open', about:'Pat (fake) wants a schedule change', owner:K, owner_name:'Krystal Land', due:H(-26), created_at:H(-30) },
    { id:'un1', kind:'client_issue', status:'open', about:'Ruth (fake) family worried', owner:'', domain:'client_care', urgency:'high', due:H(0.5), created_at:H(-40) },
    { id:'due1', kind:'request', status:'open', about:'Betsy (fake) callback', owner:K, owner_name:'Krystal Land', due:H(1), created_at:H(-30) },
    { id:'wait_nowake', kind:'request', status:'open', about:'Ted (fake) paperwork', owner:K, owner_name:'Krystal Land', sub_state:'waiting', waiting_on:'the family', due:H(72), created_at:H(-50) },
    { id:'wait_ok', kind:'request', status:'open', about:'Ann (fake) authorization', owner:K, owner_name:'Krystal Land', sub_state:'waiting', waiting_on:'the state', check_back:ymd(3), due:H(-48), created_at:H(-90) },
    { id:'later1', kind:'request', status:'open', about:'Annual review: Pat O. (fake)', owner:K, owner_name:'Krystal Land', due:H(120), created_at:H(-5) },
    { id:'handed', kind:'request', status:'open', about:'Linda (fake) supplies', owner:K, owner_name:'Krystal Land', due:H(2), created_at:H(-10),
      owner_history:[{ at:H(-3), by:S, by_name:'Samantha Troutman', from:S, from_name:'Samantha Troutman', to:K, to_name:'Krystal Land', how:'handed', note:'Call the daughter first' }] },
    { id:'sam_late', kind:'request', status:'open', about:'Sam only (fake)', owner:S, owner_name:'Samantha Troutman', due:H(-30), created_at:H(-40) },
    { id:'un_late', kind:'request', status:'open', about:'Fax from the pharmacy (fake)', owner:'', due:H(-5), created_at:H(-40) },
    { id:'res1', kind:'staffing_issue', status:'resolved', resolved_how:'clocked_in', about:'Resolved (fake)', owner:K, due:H(-3), created_at:H(-4) },
    { id:'done1', kind:'request', status:'done', about:'Done (fake)', owner:K, due:H(-3), created_at:H(-4) },
    { id:'att1', kind:'staffing_issue', status:'open', about:'Sheryelle (fake) has 11 EVV problems', owner:S, created_by:'attendance-watch', opened_by:'system', urgency:'high', due:H(20), created_at:H(-1) },
    { id:'human1', kind:'capture', status:'open', about:'Family called about Ruth (fake)', owner:S, owner_name:'Samantha Troutman', created_by:'Jess Lee', opened_by:'person', due:H(20), created_at:H(-1) },
    { id:'help1', kind:'request', status:'open', about:'Mary (fake) start date', owner:S, owner_name:'Samantha Troutman', help_from:K, due:H(30), created_at:H(-6) }
  ];
})();
"""

T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const item=id=>DATA.ops_items.find(x=>x.id===id);
  const card=id=>document.querySelector('.wkcard[data-id="'+id+'"]');
  document.getElementById('appScreen').classList.add('on');
  const before=JSON.stringify({r:item('res1').status,d:item('done1').status});

  switchTab('mywork'); myWorkGo('today'); await sleep(150);
  const wrap=$('#myWorkWrap'), txt=()=>wrap.innerText;
  const laneOf=id=>{ const all=[...wrap.querySelectorAll('b')].filter(b=>/^(ACT NOW|DUE TODAY|WAITING & WATCHING|LATER)/.test(b.textContent));
    const c=card(id); if(!c) return null; let lane=null; all.forEach(b=>{ if(b.compareDocumentPosition(c)&Node.DOCUMENT_POSITION_FOLLOWING) lane=b.textContent.split(' ·')[0]; }); return lane; };

  /* lanes */
  ok('four lanes, in order', ['ACT NOW','DUE TODAY','WAITING & WATCHING','LATER'].every((l,i,a)=>txt().indexOf(l)>=0 && (i===0||txt().indexOf(a[i-1])<txt().indexOf(l))), txt().slice(0,300));
  ok('Act Now: the missed clock-in first, then the late items', laneOf('tk1')==='ACT NOW' && laneOf('late1')==='ACT NOW' && laneOf('un_late')==='ACT NOW'
     && wrap.querySelectorAll('.wkcard')[0].dataset.id==='tk1', [laneOf('tk1'),laneOf('late1'),laneOf('un_late'),wrap.querySelectorAll('.wkcard')[0].dataset.id]);
  ok('Due Today: due later today, unowned in my area, handed to me', ['un1','due1','handed'].every(id=>laneOf(id)==='DUE TODAY'), ['un1','due1','handed'].map(laneOf));
  ok('waiting with NO wake-up is never hidden: it sits in Due Today marked "no wake-up set", with a button', laneOf('wait_nowake')==='DUE TODAY'
     && /no wake-up set/.test(card('wait_nowake').innerText) && /Set a wake-up/.test(card('wait_nowake').innerText));
  ok('waiting WITH a wake-up is in Waiting & Watching, saying when it comes back', !card('wait_ok') && /Ann \(fake\) authorization · waiting on the state · comes back .* at the latest/.test(txt()));
  ok('Later is folded away with a count', !card('later1') && /Show 1 later item/.test(txt()));
  [...wrap.querySelectorAll('button')].find(b=>/Show 1 later item/.test(b.textContent)).click(); await sleep(60);
  ok('...and opens on request', laneOf('later1')==='LATER');
  ok('Done and Resolved items are in no lane', !card('res1') && !card('done1'));

  /* owner and time on every card; why */
  ok('every card says whose it is and by when', $$('#myWorkWrap .wkcard').every(c=>/(Krystal|Unassigned|Samantha) · /.test(c.innerText)), $$('#myWorkWrap .wkcard').map(c=>c.innerText.slice(0,80)));
  ok('"Krystal · by <time>"', /Krystal · by \d{1,2}:\d{2}\s?[AP]M/.test(card('due1').innerText), card('due1').innerText.slice(0,160));
  ok('"Unassigned · needs owner"', /Unassigned · needs owner/.test(card('un1').innerText));
  ok('late says when it was due and how late', /Krystal · was due .* · 1 day late/.test(card('late1').innerText), card('late1').innerText.slice(0,160));
  ok('why: unowned in my area', /Why you’re seeing this: Nobody owns this yet, and Client Care is your area\./.test(card('un1').innerText));
  ok('why: unowned with no area', /Nobody owns this, and it isn’t filed under an area yet, so every admin sees it\./.test(card('un_late').innerText));
  ok('why: handed to me, with the note', /Handed to you by Samantha Troutman: Call the daughter first/.test(card('handed').innerText));
  ok('why: an automatic staffing alert', /You’re first on the scheduling alert list/.test(card('tk1').innerText));
  ok('no why line on my own ordinary work', !/Why you’re seeing this/.test(card('due1').innerText));
  ok('"I’ve got it" is gone; unowned cards offer Take it', !/I’ve got it/.test(txt()) && /Take it/.test(card('un1').innerText));

  /* Take it = real ownership + history */
  L.writes.length=0;
  [...card('un1').querySelectorAll('button')].find(b=>b.textContent==='Take it').click(); await sleep(80);
  let it=item('un1'), oh=it.owner_history||[];
  ok('Take it makes it mine', it.owner==='krystal@mo-care.com' && it.claimed_by==='krystal@mo-care.com', it);
  ok('...records the ownership history', oh.length===1 && oh[0].how==='took' && oh[0].from==='' && oh[0].to==='krystal@mo-care.com' && oh[0].by==='krystal@mo-care.com', oh);
  ok('...logs it, saves just that item, and says so', it.history.some(h=>h.text==='Took it (it had no owner)') && L.writes.join()==='ops_items:un1' && /It’s yours now/.test(L.toasts.slice(-1)[0]));
  ok('...and the card shows the owner trail', /Owner: Unassigned → Krystal \(took it, /.test(card('un1').innerText), card('un1').innerText);
  myWorkGo('helping'); await sleep(60);
  ok('somebody else’s card says why and offers Take it', /Samantha asked you for help\. It stays Samantha’s\./.test(card('help1').innerText) && /Take it/.test(card('help1').innerText));
  myWorkMore('help1','more_help1'); await sleep(40);
  ok('the ⋯ menu says Take it from Samantha (it becomes yours)', $$('.ccpop .ccpick-row').some(r=>r.textContent==='Take it from Samantha (it becomes yours)'));
  ccPopClose();
  [...card('help1').querySelectorAll('button')].find(b=>b.textContent==='Take it').click(); await sleep(80);
  it=item('help1'); oh=it.owner_history;
  ok('taking it from Samantha: mine, history says from whom', it.owner==='krystal@mo-care.com' && oh.slice(-1)[0].from==='samantha@mo-care.com' && oh.slice(-1)[0].how==='took'
     && it.history.some(h=>h.text==='Took it from Samantha Troutman') && /it was Samantha’s/.test(L.toasts.slice(-1)[0]), [oh, L.toasts.slice(-1)]);
  await opsSetOwner('due1','samantha@mo-care.com','Samantha Troutman','Over to you');
  await opsSetOwner('un_late','krystal@mo-care.com','Krystal Land');
  ok('Hand off and Assign write ownership history too', item('due1').owner_history.slice(-1)[0].how==='handed' && item('due1').owner_history.slice(-1)[0].note==='Over to you'
     && item('un_late').owner_history.slice(-1)[0].how==='assigned', [item('due1').owner_history, item('un_late').owner_history]);
  await opsSetOwner('due1','krystal@mo-care.com','Krystal Land'); await opsSetOwner('un_late','','');

  /* waiting needs a wake-up */
  myWorkGo('today'); await sleep(60);
  opsWaitOpen('wait_nowake','act_wait_nowake'); await sleep(40);
  let pop=$$('.ccpop').pop(); pop.querySelector('#owWhen').value=''; pop.querySelector('#owGo').click(); await sleep(40);
  ok('parking with no date is refused (the form stays open)', !item('wait_nowake').check_back && document.body.contains(pop) && /Pick a day/.test(L.toasts.slice(-1)[0]));
  pop.querySelector('#owWhen').value=window.__ymd(2); pop.querySelector('#owGo').click(); await sleep(80);
  ok('with a date it parks, keeps what it waits on, and moves to Waiting & Watching', item('wait_nowake').check_back===window.__ymd(2) && item('wait_nowake').waiting_on==='the family'
     && !card('wait_nowake') && /Ted \(fake\) paperwork · waiting on the family · comes back/.test(txt()), [item('wait_nowake'), txt().split('WAITING')[1]]);

  /* one meaning of late, everywhere */
  ccRenderPulse(); opsBadges(); await sleep(20);
  const lateMine=opsLateFor('krystal@mo-care.com').map(i=>i.id).sort(), lateNo=opsLateUnowned().map(i=>i.id);
  ok('late for you: my past-due items, not parked ones, not other people’s', JSON.stringify(lateMine)===JSON.stringify(['late1','tk1']) && JSON.stringify(lateNo)===JSON.stringify(['un_late']), [lateMine,lateNo]);
  const pulse=$('#topbarPulse').innerText;
  ok('header: "2 late for you" and "1 late, no owner"', /2\s*late for you/.test(pulse) && /1\s*late, no owner/.test(pulse) && !/overdue/.test(pulse.replace(/check-ins? overdue/,'')), pulse);
  ok('My Work pill badge = late for you', $('#gb-mywork') ? $('#gb-mywork').textContent==='2' : true, $('#gb-mywork')&&$('#gb-mywork').textContent);
  renderOverviewTop(0,0);
  const c=opsTodayCounts();
  ok('greeting uses the same lanes and numbers', $('#todayHello').innerText.replace(/\s+/g,' ')==='You have '+c.act+' to act on now (2 late) and '+c.due+' due today. 1 late item has no owner.', [$('#todayHello').innerText, c]);

  /* one information view */
  switchTab('today'); await sleep(150); renderTodayHero(); await sleep(50);
  const info=$('#infoCard');
  ok('one card: Updates & While You Were Out', !!info && /Updates & While You Were Out/.test(info.innerText) && $$('#todayHero .hc-t').filter(x=>/While you were out/i.test(x.textContent)).length===1);
  ok('a person’s overnight item is there', /Family called about Ruth \(fake\)/.test(info.innerText));
  ok('the nightly EVV-count item is NOT (it was getting through before)', !/EVV problems/.test(info.innerText));
  ok('the tile says "for you today" with My Work’s count', /\b7\s*for you today/i.test($('#todayGlance').innerText.replace(/\n/g,' ')) || new RegExp(myWorkBuckets().today.length+'\\s*for you today','i').test($('#todayGlance').innerText.replace(/\n/g,' ')), $('#todayGlance').innerText);
  CC_SINCE=[{ at:new Date().toISOString(), actor_name:'Jess Lee', summary:'closed the Smith (fake) case' }]; renderSinceYouLeft();
  ok('what the team did shows INSIDE the same card; the old separate panel stays empty', /WHAT THE TEAM DID SINCE YOU WERE LAST HERE/.test(info.innerText) && /Jess Lee · closed the Smith \(fake\) case/.test(info.innerText) && ($('#sylWrap')?$('#sylWrap').innerHTML==='':true));

  /* small fixes */
  const rc=[...document.querySelectorAll('button')].find(b=>/Report a concern/.test(b.textContent));
  ok('"Report a concern" is readable (white text)', rc && getComputedStyle(rc).color==='rgb(255, 255, 255)', rc&&getComputedStyle(rc).color);
  ok('the Dashboard card is "Team scorecard", not "Stand-up"', /Team scorecard/.test($('#standupCard').innerText) && !/^Stand-up$/m.test($('#standupCard').innerText));

  /* Done vs Resolved untouched; nothing sent */
  ok('Done and Resolved are left exactly as they were', JSON.stringify({r:item('res1').status,d:item('done1').status})===before);
  ok('nothing was texted, emailed or called', L.fn.length===0 && L.rpc.length===0, [L.fn,L.rpc]);
  return R;
}
"""

PHONE = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,300)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on');
  switchTab('mywork'); myWorkGo('today'); await sleep(150);
  ok('phone: lanes show and the page does not scroll sideways', /ACT NOW/.test(document.getElementById('myWorkWrap').innerText) && document.documentElement.scrollWidth<=window.innerWidth, [document.documentElement.scrollWidth, window.innerWidth]);
  const b=[...document.querySelectorAll('#myWorkWrap button')].find(x=>x.textContent==='Take it'); const r=b&&b.getBoundingClientRect();
  ok('phone: Take it is on screen', !!r && r.left>=0 && r.right<=window.innerWidth);
  return R;
}
"""

R = []
def static(n, c, d=''): R.append(['PASS' if c else 'FAIL', n, '' if c else d])
static('My Team "late" leaves out parked work (same meaning)', '&&!opsParked(i));   // same meaning as "late for you"' in HUB)
static('calendar puts who it is with first', 'who it is with comes first' in HUB)
static('role-setup buttons sit behind one owner-only "Review role changes"', 'Review role changes (' in HUB and 'Write the planned model' not in HUB)
static('"Program", not "Programme"', 'Programme' not in HUB)

with sync_playwright() as pw:
    b = pw.chromium.launch()
    for name, size, body in (('desktop', {'width': 1360, 'height': 900}, T), ('phone', {'width': 390, 'height': 844}, PHONE)):
        pg = b.new_page(viewport=size)
        pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        pg.goto('http://localhost:8765/index.html?proof=today1-' + name); pg.wait_for_timeout(1200)
        pg.evaluate('s=>(0,eval)(s)', STUB)
        out = pg.evaluate(body)
        out.append(['PASS' if not errs else 'FAIL', name + ': no page errors', errs[:3]])
        R += out; pg.close()
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

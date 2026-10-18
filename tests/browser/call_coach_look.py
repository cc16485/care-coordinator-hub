"""Call coaching (2026-10-18): + Add Lead opens Taking a call (number, name, one notes box, Save; the old Guided Call no
longer opens); the five beats show beside it ONLY for someone an owner switched call help on for; Save goes through the
regular saveLead (same-family check, first conversation) and stamps who took the call; the Calls tab shows the best
calls, each new coordinator's calls with their beats, reviews, and good calls toward 20. The real page, offline, made-up data.
(python3 tests/browser/call_coach_look.py, static server on PORT, default 8765)"""
import os
from playwright.sync_api import sync_playwright
PORT = os.environ.get('PORT', '8765')
STUB = r"""
(()=>{
  const W=window; W.__log={ persisted:[], toasts:[], plays:[] };
  (0,eval)(`sb={ from:(t)=>{ const p={ select(){return p;}, eq(){return p;}, gte(){return p;}, in(){return p;}, not(){return p;}, order(){return p;}, limit(){return p;},
      maybeSingle:async()=>({data:null,error:null}), then(a){ return Promise.resolve({data:[], error:null}).then(a); } }; return p; },
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async()=>({data:null,error:null}) }, auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };`);
  W.persist=async(k,i)=>{ W.__log.persisted.push([k, JSON.parse(JSON.stringify(i))]); }; W.ccToast=m=>{ W.__log.toasts.push(m); }; W.opEvent=()=>{};
  W.ckFind=async()=>(W.__same||{ leads:[], clients:[] }); W.ckPanel=async()=>({ kind:'cancel' }); W.openLeadProfile=id=>{ W.__log.opened=id; }; W.cjAutoOpen=()=>{};
  const realFetch=W.fetch.bind(W);
  W.fetch=async(url,o)=>{ url=String(url); if(url.includes('/functions/v1/calls-feed')){ W.__log.plays.push(JSON.parse(o.body)); return new Response(new Blob(['x'],{type:'audio/mpeg'}),{status:200}); } return realFetch(url,o); };
  (0,eval)(`ME={ email:'sam@mo-care.com', name:'Samantha', shift:'day' }; CC_ROLE_BY_EMAIL={ 'sam@mo-care.com':['owner_admin'], 'krystal@mo-care.com':['care_coordinator'], 'angiel@mo-care.com':['care_coordinator'] };`);
  W.opsOwnerName=e=>({ 'sam@mo-care.com':'Samantha', 'krystal@mo-care.com':'Krystal', 'angiel@mo-care.com':'Angiel New' })[e]||e;
  DATA.ops_settings={}; DATA.referral_orgs=[]; DATA.care_assessments=[{ id:'A9', lead_id:'L_good', status:'Scheduled' }]; DATA.ops_items=[]; DATA.call_lead_marks=[]; DATA.call_coaching=[];
  DATA.leads=[
    { id:'L_good', first_name:'Ana', last_name:'Ruiz', status:'Contacted', created_at:'2026-10-20T15:00:00Z', call_taken_by:'angiel@mo-care.com', why_called:'Mom fell', needs:['personalCare'], number_of_hours:'20', funding_source:'private' },
    { id:'L_part', first_name:'Bea', last_name:'Lane', status:'Contacted', created_at:'2026-10-21T15:00:00Z', from_calls:[{ message_id:'m2', by:'Angiel New' }], why_called:'Help at night', needs:['respite'] },
    { id:'L_sam', first_name:'Cal', last_name:'Sam', status:'Contacted', created_at:'2026-10-21T16:00:00Z', call_taken_by:'sam@mo-care.com', why_called:'x' } ];
  (0,eval)(`CALLS_FILTER='all'; CALLS_FEED={ generated_at:'2026-10-21T15:40:00Z', calls:[
    { id:'msgBEST01', name:'Linda Parker', phone:'+14175550142', contact_id:'C77', direction:'inbound', duration:360, at:'2026-10-14T15:14:00Z', has_recording:true },
    { id:'msgMISS04', name:'Missed Person', phone:'+14175550300', contact_id:'C80', direction:'inbound', duration:0, status:'no-answer', at:'2026-10-14T15:26:00Z' } ] };`);
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,800)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  const bd=()=>document.getElementById('ccCallBackdrop');

  /* + Add Lead for someone with call help off (Samantha) */
  openCallCockpit(); await sleep(80);
  ok('+ Add Lead opens Taking a call, not the old Guided Call', bd() && bd().classList.contains('open') && !document.getElementById('callCockpit').classList.contains('open'));
  ok('...just a number, a name and one notes box', !!document.getElementById('cc_phone') && !!document.getElementById('cc_name') && !!document.getElementById('cc_notes') && bd().querySelectorAll('input,textarea').length===3, bd().querySelectorAll('input,textarea').length);
  ok('...no five beats for someone with call help off', !bd().querySelector('.cc-beats') && !bd().classList.contains('cc-with-beats'));
  ok('...both + Add Lead buttons still call it', [...document.querySelectorAll('button')].filter(b=>/openCallCockpit\(\)/.test(b.getAttribute('onclick')||'')).length>=2);
  /* Save with nothing typed */
  await CallCoach.save(); await sleep(50);
  ok('Save with no number or name asks for one, saves nothing', /Add their number or name first/.test(document.getElementById('cc_say').innerText) && !W_persisted('leads').length && bd().classList.contains('open'));
  function W_persisted(k){ return window.__log.persisted.filter(p=>p[0]===k); }
  document.getElementById('cc_phone').value='4175550777'; document.getElementById('cc_name').value='Gail Typed'; document.getElementById('cc_notes').value='Her dad in Ozark, mornings.';
  await CallCoach.save(); await sleep(200);
  const g=DATA.leads.find(l=>l.first_name==='Gail');
  ok('Save makes a lead through the regular save: name split, phone, notes, Phone source', g && g.last_name==='Typed' && g.phone==='4175550777' && /dad in Ozark/.test(g.interest_notes) && g.source==='Phone', g);
  ok('...this call counts as the first conversation (Contacted, a connected call), so no first-call clock', g && g.status==='Contacted' && (g.contact_events||[]).some(e=>e.outcome==='connected'&&e.channel==='call') && !opsLeadUntouched(g), g&&g.status);
  ok('...who took the call is kept on the lead', g && g.call_taken_by==='sam@mo-care.com' && !!g.call_taken_at);
  ok('...the panel and the form are closed, a short note shown', !bd().classList.contains('open') && !document.getElementById('leadModalBackdrop').classList.contains('open') && !document.getElementById('leadModalBackdrop').classList.contains('cc-quiet')
     && window.__log.toasts.some(t=>/Lead saved/.test(t)), window.__log.toasts);
  /* same family found: the person decides, nothing hidden */
  window.__same={ leads:[{ id:'L_good' }], clients:[] };
  CallCoach.open(); document.getElementById('cc_phone').value='4175550999'; await CallCoach.save(); await sleep(150);
  ok('a same-family question cancelled: no new lead, the regular form is left showing (never hidden)', !DATA.leads.some(l=>l.phone==='4175550999') && document.getElementById('leadModalBackdrop').classList.contains('open') && !document.getElementById('leadModalBackdrop').classList.contains('cc-quiet'));
  closeModal('leadModalBackdrop'); window.__same=null;
  CallCoach.open(); ok('reopening clears the earlier warning', !/Add their number or name first/.test(document.getElementById('cc_say').innerText));
  document.getElementById('cc_phone').value='4175551111'; CallCoach.fullForm(); await sleep(50);
  ok('Open the full lead form carries the number into the regular form', document.getElementById('leadModalBackdrop').classList.contains('open') && document.getElementById('lead_phone').value==='4175551111');
  closeModal('leadModalBackdrop');

  /* Calls tab: owner tools */
  callsPaint(); CallCoach.render(); await sleep(30);
  const callRow=()=>[...document.querySelectorAll('#callsList > div')].find(d=>/Linda Parker/.test(d.innerText));
  ok('owner: an answered, recorded call has "Add to best calls"; a missed call does not', /Add to best calls/.test(callRow().innerText) && ![...document.querySelectorAll('#callsList > div')].some(d=>/Missed Person/.test(d.innerText)&&/Add to best calls/.test(d.innerText)));
  [...callRow().querySelectorAll('button')].find(b=>/Add to best calls/.test(b.textContent)).click(); await sleep(20);
  const af=callRow().querySelector('.cc-addform'); af.querySelector('.cc-title').value='The worried daughter'; af.querySelector('.cc-listen').value='how long you let her talk';
  [...af.querySelectorAll('button')].find(b=>b.textContent==='Add').click(); await sleep(60);
  const best=DATA.call_coaching.find(x=>x.id==='best:msgBEST01');
  ok('...adding it saves a best call with its title and what to listen for', best && best.title==='The worried daughter' && best.listen_for==='how long you let her talk' && W_persisted('call_coaching').length>=1, best);
  ok('...the call now says In best calls', /In best calls/.test(callRow().innerText));
  const team=()=>document.getElementById('ccTeam');
  ok('owner: Call coaching lists the office team with call help off by default', team() && /Krystal/.test(team().innerText) && /Angiel New/.test(team().innerText) && (team().innerText.match(/Call help off/g)||[]).length===3, team()&&team().innerText.slice(0,400));
  await CallCoach.setHelp('angiel@mo-care.com', true); await sleep(30);
  const ang=DATA.call_coaching.find(x=>x.id==='person:angiel@mo-care.com');
  ok('switching call help on for Angiel saves it with a start date', ang && ang.coaching===true && !!ang.started_at && ang.set_by==='sam@mo-care.com', ang);
  ang.started_at='2026-10-19T12:00:00Z';
  CallCoach.render(); await sleep(20);
  const arow=()=>team().querySelector('[data-coach="angiel@mo-care.com"]');
  ok('...her row: on, good calls, listened, and her new-family calls with their beats', /Call help on · 1 of 20 good calls · 0 of 1 listened/.test(arow().innerText) && /Ana Ruiz/.test(arow().innerText) && /5 of 5 beats · a good call/.test(arow().innerText)
     && /Bea Lane/.test(arow().innerText) && /2 of 5 beats · not on the lead yet: what help looks like, how it gets paid, next step/.test(arow().innerText) && !/Cal Sam/.test(arow().innerText), arow().innerText);
  window.prompt=()=>'Great opener'; [...arow().querySelectorAll('button')].find(b=>b.textContent==='Mark reviewed').click(); await sleep(60);
  ok('Mark reviewed saves a review with the note', DATA.call_coaching.some(x=>x.kind==='review'&&x.coordinator==='angiel@mo-care.com'&&x.note==='Great opener'&&x.reviewed_by==='sam@mo-care.com'));
  await CallCoach.setReviewer('krystal@mo-care.com', true);
  ok('owner can tick Krystal as a reviewer', DATA.call_coaching.find(x=>x.id==='person:krystal@mo-care.com').reviewer===true);

  /* Angiel signs in */
  (0,eval)("ME={ email:'angiel@mo-care.com', name:'Angiel New', shift:'day' }");
  CallCoach.render(); callsPaint(); await sleep(20);
  const mine=()=>document.getElementById('ccMine');
  ok('a new coordinator sees her own card: the best calls, her calls, good calls toward 20', mine() && /Listen to how Samantha does it/.test(mine().innerText) && /0 of 1 listened/.test(mine().innerText) && /The worried daughter/.test(mine().innerText) && /Listen for: how long you let her talk/.test(mine().innerText)
     && /Reviewed by Samantha: Great opener/.test(mine().innerText) && /1 of 20/.test(mine().innerText) && /At 20, you can switch the five beats off/.test(mine().innerText), mine()&&mine().innerText);
  ok('...she has no owner tools (no team list, no Add to best calls)', !team() && !/Add to best calls/.test(document.getElementById('callsList').innerText));
  await CallCoach.play('msgBEST01', mine().querySelector('[data-best="msgBEST01"] button')); await sleep(80);
  ok('Play fetches that recording and ticks it listened', window.__log.plays.some(p=>p.recording==='msgBEST01') && DATA.call_coaching.find(x=>x.id==='person:angiel@mo-care.com').listened.indexOf('msgBEST01')>=0 && /1 of 1 listened/.test(mine().innerText), mine().innerText.slice(0,200));
  CallCoach.open(); await sleep(40);
  ok('+ Add Lead for her: the five beats beside the notes box, in order', bd().classList.contains('cc-with-beats') && [...bd().querySelectorAll('.cc-beat b')].map(b=>b.textContent).join('|')==='Their story|Day to day at home|What help looks like|How it gets paid|Next step', [...bd().querySelectorAll('.cc-beat b')].map(b=>b.textContent));
  CallCoach.hideBeats(); ok('...Hide takes them away for this call', !bd().querySelector('.cc-beats')); CallCoach.close();
  ok('she cannot switch call help herself before 20 good calls', (await CallCoach.switchOffMine(), DATA.call_coaching.find(x=>x.id==='person:angiel@mo-care.com').coaching===true));
  const txt=document.getElementById('ccCallBackdrop').innerText+(mine()?mine().innerText:'');
  ok('no em dashes in what the panel and card say', !/—/.test(txt));
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for vw in ({'width': 1360, 'height': 900}, {'width': 390, 'height': 844}):
        pg = b.new_page(viewport=vw)
        pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        pg.goto(f'http://localhost:{PORT}/index.html?proof=callcoach'); pg.wait_for_timeout(1200)
        pg.evaluate('s=>(0,eval)(s)', STUB)
        R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
        if vw['width'] < 500:
            pg.evaluate("()=>{ CallCoach.open(); }"); pg.wait_for_timeout(100)
            over = pg.evaluate("()=>document.documentElement.scrollWidth>window.innerWidth+1")
            R.append(['PASS' if not over else 'FAIL', 'phone: Taking a call fits the screen (no sideways scroll)', ''])
            pg.screenshot(path='/private/tmp/claude-501/-Users-samantha-Claude/b5cbcaf0-7e09-48b9-89e8-c1f701364d7c/scratchpad/coach_phone.png')
        else:
            pg.evaluate("()=>{ CallCoach.open(); }"); pg.wait_for_timeout(100)
            pg.screenshot(path='/private/tmp/claude-501/-Users-samantha-Claude/b5cbcaf0-7e09-48b9-89e8-c1f701364d7c/scratchpad/coach_desk.png')
        for s_, n, d in R: print(vw['width'], s_, '·', n, '' if s_ == 'PASS' else d)
        print(vw['width'], sum(r[0] == 'PASS' for r in R), '/', len(R))
        pg.close()
    b.close()

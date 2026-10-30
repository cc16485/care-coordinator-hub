"""Home visit order, About us, Good days out, housekeeping talking points, the walk-through and the agreement from the lead
(2026-10-30, Samantha: "add an About Us as step 2 ... what is in the folder ... see if they have any questions"; "at the end
let's do a home walk through if we are starting care"; "go straight to the care agreement ... we need to have a signed
agreement before we would make them active in AxisCare"; "list all the possible housekeeping tasks"; "make another
step/tab for Community Outings and pull ideas from our website"; "think about the steps in how comfortable it would be to
ask in what order"). Offline: the Hub page with a made-up family, the website's places list faked with three places, the
agreement service faked.
Proves: the twelve screens in her order; About us shows the folder's points (no prices), ticks the folder as it is shown and
keeps their questions, and owners change the points in Settings; Good days out loads the website's places, narrows them by
what the client enjoys with their own town first, saves the places the family liked and opens the full website page; Around
the house has the housekeeping jobs to tap (and what caregivers don't do), Personal care holds bathing and toileting; the
walk-through is skipped (and says so) unless they are starting care; the agreement opens from the lead before AxisCare and
the agreement page starts it on the lead; the agreement card works from a lead; Create in AxisCare offers "signed on paper"
when the agreement holds it back; an older visit's done marks follow the new order; it fits an iPad and a phone.
(python3 tests/browser/visit_order_look.py; SHOTS=<dir> saves screenshots)"""
import os, sys, json, pathlib, threading, http.server, functools
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = os.environ.get('SHOTS')
PLACES = {'generated': '2026-10-15', 'items': [
    {'id': 'o1', 'name': 'Northview Center (fake)', 'category': 'senior-center', 'town': 'Springfield', 'what': 'Lunch, cards and bingo.', 'access': 'Ramp at the front.', 'cost': 'Free', 'minutes': 10},
    {'id': 'o2', 'name': 'Nixa Park Trail (fake)', 'category': 'park-garden', 'town': 'Nixa', 'what': 'A short paved loop with benches.', 'access': 'Flat and paved.', 'cost': 'Free', 'minutes': 20},
    {'id': 'o3', 'name': 'Springfield Garden (fake)', 'category': 'park-garden', 'town': 'Springfield', 'what': 'A slow walk through the garden.', 'access': 'Paved paths.', 'cost': '$5', 'minutes': 12}]}
STUB = r"""
(()=>{
  const W=window; W.__log={ persists:[], merges:[], calls:[] };
  (0,eval)(`sb={ from:()=>{ const p={ select(){return p;}, eq(){return p;}, gte(){return p;}, in(){return p;}, order(){return p;}, limit(){return p;}, is(){return p;},
      single:async()=>({ data:null, error:null }), maybeSingle:async()=>({ data:null, error:null }),
      then(a){ return Promise.resolve({data:[],error:null}).then(a); } }; return p; },
    storage:{ from:()=>({ upload:async()=>({ error:null }) }) }, rpc:async()=>({data:null,error:null}), functions:{ invoke:async()=>({data:null,error:null}) },
    auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };
    ME={ email:'samantha@mo-care.com', name:'Samantha' }; CC_ROLES=['owner_admin']; CC_ROLES_CHECKED=true; CC_ROLE_BY_EMAIL['samantha@mo-care.com']=['owner_admin'];
    persist=async(k,v)=>{ window.__log.persists.push([k, JSON.parse(JSON.stringify(v))]); };
    tkMerge=async(fn,label)=>{ const m=JSON.parse(JSON.stringify(DATA.ops_settings||{})); const said=fn(m); DATA.ops_settings=m; window.__log.merges.push([label,said]); return {}; };
    callAction=async(n,b)=>{ window.__log.calls.push([n,b]); return { status:200, data:{ ok:true, agreements:window.__agList||[] } }; };
    ckFind=async()=>({ clients:[], note:'' });
    ccvCall=async(b)=>{ window.__log.calls.push(['client-convert',b]); return window.__ccv(b); };
    ccConfirm=async()=>true; ccToast=(m)=>{ window.__log.toast=m; };`);
  DATA.ops_settings={ visit_rates:{ wellness:30, personal:32, advanced:34 } };
  DATA.care_assessments=[]; DATA.care_plans=[];
  DATA.leads=[{ id:'lead_betty', first_name:'Karen', last_name:'Price (fake)', relationship:'Daughter', phone:'(417) 555-0172',
    client_first_name:'Betty', client_last_name:'Harlow (fake)', client_address:'1418 E Cherry St', client_city:'Springfield', client_state:'MO', client_zip:'65802',
    client_phone:'(417) 555-0148', funding_source:'private', status:'Contacted' }];
  DATA.client_profiles=[];
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,900)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, lead=DATA.leads[0], q=s=>document.querySelector('#hvRoot '+s), qa=s=>[...document.querySelectorAll('#hvRoot '+s)];
  const type=async(path,val)=>{ const el=q('[data-hv="'+path+'"]'); el.value=val; el.dispatchEvent(new Event('input',{bubbles:true})); };
  const tap=(path,v)=>q('[data-hvp="'+path+'"][data-v="'+v+'"]').click();
  const sec=i=>q('.hv-sec[data-sec="'+i+'"]'), go=async i=>{ q('[data-hvs="'+i+'"]').click(); await sleep(60); };
  await HV.open({ leadId:'lead_betty' }); await sleep(200);
  const a=DATA.care_assessments[0], v=a.visit;
  const rail=qa('#hvRail [data-hvs]').map(b=>b.innerText.replace(/\s+/g,' ').trim());
  ok('twelve screens in her order; the walk-through says it is only when starting care', rail.join('|')==='1 Start the visit|2 About us|3 Their story|4 Good days out|5 Around the house|6 Health|7 Personal care|8 Preferences|9 Schedule and level|10 Home walk-through if starting care|11 Agreement and sign-off|12 After the visit', rail);
  /* About us */
  await go(1); const ab=sec(1).innerText;
  ok('About us: the folder\'s points to cover, no prices, a nudge that prices come later', /our employee: screened, insured and bonded/.test(ab) && /Care that grows with them/.test(ab) && /at least every 90 days/.test(ab) && !/\$\d/.test(ab) && /Prices come later/.test(ab), ab.slice(0,700));
  const heads=qa('.hv-sec[data-sec="1"] .hv-ph').map(b=>b.textContent);
  ok('the pitch: six promises, each a bold headline over what to say, in her order', heads.join('|')==="Our people, not contractors|Not just anybody|Never a stranger at the door|We notice when something's off|You always know how it's going|Care that grows with them", heads);
  ok('the pitch opens and closes with her lines', /Open with.*so you know who you'd be letting into your home/s.test(ab) && /Close with.*What questions do you have before we talk about care/s.test(ab), ab.slice(0,400));
  const more=q('.hv-sec[data-sec="1"] details.hv-more');
  ok('the background check detail sits under Not just anybody only, folded', more && more.closest('li').querySelector('.hv-ph').textContent==='Not just anybody' && !more.open && qa('.hv-sec[data-sec="1"] details.hv-more').length===1);
  const mt=more.textContent;
  ok('before hire: experience, interview, the four checks by their plain names, two references with a supervisor on a bad one', /year of paid caregiving experience/.test(mt) && /in-person interview/.test(mt) && /Family Care Safety Registry/.test(mt) && /Employee Disqualification List/.test(mt) && /Office of Inspector General/.test(mt) && /Case\.net/.test(mt) && /Two good references, at least one from a past job/.test(mt) && /supervisor/.test(mt), mt);
  ok('after hire: monthly, every 3 months, yearly, as the Hub rechecks; no fingerprints promised', /Every month: the federal exclusion list/.test(mt) && /Every 3 months: Missouri's Employee Disqualification List/.test(mt) && /Every year: the Family Care Safety Registry/.test(mt) && /Don't mention fingerprints/.test(mt), mt);
  const fold=qa('.hv-sec[data-sec="1"] .hv-fi').map(b=>b.textContent);
  ok('About us: the nine folder pieces to tick as they are shown', fold.length===9 && fold[0]==='Our Levels of Care' && fold.includes('Client Handbook') && fold.includes('Personalized Care Proposal (filled in after today)'), fold);
  tap('visit.about.shown','Client Handbook'); await sleep(20);
  ok('ticking a piece saves it and counts it', (v.about.shown||[]).join()==='Client Handbook' && /1 of 9 shown/.test(sec(1).innerText));
  await type('visit.about.questions','Asked who pays if Mom is in the hospital.'); await sleep(20);
  ok('their questions are kept on the visit', v.about.questions==='Asked who pays if Mom is in the hospital.');
  ok('the recording can fill their questions (an empty box it may fill)', HV._boxes().some(b=>b.path==='visit.about.questions'));
  /* Good days out */
  await go(3); await sleep(400);
  let g=sec(3).innerText;
  ok('Good days out: what makes a good day, what they enjoy, how outings work (from the flyer)', /What makes a good day/.test(g) && /Places they miss going/.test(g) && /Making friends/.test(g) && /You approve each place before we go/.test(g) && /caregiver drives and stays/.test(g), g.slice(0,800));
  const names=()=>qa('.hv-place b').map(b=>b.textContent);
  ok('the places come from the website list, Springfield (their town) first', names().length===3 && /Springfield/.test(sec(3).querySelector('.hv-place .hv-n').textContent), names());
  tap('visit.outings.interests','nature'); await sleep(40);
  ok('Fresh air and nature narrows to parks and gardens, their town first', names().join('|')==='Springfield Garden (fake)|Nixa Park Trail (fake)', names());
  q('[data-hva="outpick"][data-v="o3"]').click(); await sleep(40);
  ok('"They\'d like this" saves the place on the visit', (v.outings.picks||[]).map(x=>x.name).join()==='Springfield Garden (fake)' && /1 picked/.test(sec(3).innerText));
  const full=sec(3).querySelector('a[href="https://mo-care.com/outings"]');
  ok('the full Good Days Out page opens in a new tab (map and week planner)', full && full.target==='_blank');
  await type('visit.outings.loved','Gardening and church suppers.'); await sleep(20);
  const facts=HV.factsFor(a).map(f=>f.label+': '+f.value).join('\n');
  ok('what they enjoy and the places picked go to the care plan facts', /Outings: what they enjoy: Fresh air and nature/.test(facts) && /Springfield Garden \(fake\) \(Springfield\)/.test(facts) && /Gardening and church suppers/.test(facts), facts.slice(-600));
  ok('the recording may fill the outing boxes (text only, never the taps)', HV._boxes().some(b=>b.path==='visit.outings.miss') && !HV._boxes().some(b=>/jobs$|picks$|interests$/.test(b.path)));
  /* Around the house */
  await go(4); const h=sec(4).innerText;
  ok('Around the house: housekeeping, meals, laundry, medicine reminders; no bathing here', /Light housekeeping/.test(h) && /Meal preparation/.test(h) && /Who fills the pill organizer/.test(h) && !/Bathing and showering/.test(h), h.slice(0,400));
  const jobs=qa('[data-hvp="visit.acts.light_house.jobs"]').map(b=>b.textContent), heavy=qa('[data-hvp="visit.acts.heavy_house.jobs"]').map(b=>b.textContent);
  ok('light housekeeping: every job from the website to talk through and tap', jobs.length===15 && ['Dusting','Vacuuming','Changing bed sheets','Tidying the bathroom','Clearing walkways and stairs','Help with pets'].every(x=>jobs.includes(x)), jobs);
  ok('heavy housekeeping: her paper\'s jobs, and what caregivers don\'t do', heavy.join('|')==='Mopping floors|Carrying laundry baskets|Taking the trash out to the curb' && /Not something caregivers do: moving furniture.*ladder or step stool/.test(h), heavy);
  tap('visit.acts.light_house.jobs','Dusting'); tap('visit.acts.light_house.jobs','Changing bed sheets'); await sleep(20);
  ok('tapped jobs save as a list, and reach the care plan facts', (v.acts.light_house.jobs||[]).join()==='Dusting,Changing bed sheets' && HV.factsFor(a).some(f=>/Light housekeeping: the jobs/.test(f.label) && /Dusting, Changing bed sheets/.test(f.value)));
  /* Personal care */
  await go(6); const pc=sec(6).innerText;
  ok('Personal care comes after Health, gently: bathing, toileting and Depends', /Go gently/.test(pc) && /Bathing and showering/.test(pc) && /Toileting/.test(pc) && /Changing Depends/.test(pc) && !/Light housekeeping/.test(pc));
  tap('visit.acts.bathing.level','standby'); await sleep(40);
  ok('a help panel opens under bathing, and Still needs attention sends you to Personal care', !!q('#hvHelp_bathing .hv-help') && HV.needsFor(a).some(n=>/bathing/.test(n.label) && n.sec===6), HV.needsFor(a));
  /* the walk-through: only when starting care */
  await go(8); let foot=q('#hvFoot').innerText;
  ok('no outcome yet: Next from Schedule and level goes straight to the agreement', /Next: Agreement and sign-off/.test(foot), foot);
  await go(9);
  ok('the walk-through itself says to skip it until they are starting care', /This is for families who are starting care/.test(sec(9).innerText));
  await go(8); tap('visit.outcome','follow_up'); await sleep(40);
  ok('Needs follow-up: getting in is not asked for', !HV.needsFor(a).some(n=>/gets in/.test(n.label)), HV.needsFor(a));
  tap('visit.outcome','ready'); await sleep(40); foot=q('#hvFoot').innerText;
  ok('Ready to start: Next goes to the walk-through, and the rail drops "if starting care"', /Next: Home walk-through/.test(foot) && !/if starting care/.test(document.getElementById('hvRail').innerText) && HV.needsFor(a).some(n=>/gets in/.test(n.label) && n.sec===9), foot);
  await go(9); const w=sec(9).innerText;
  ok('the walk-through: getting in, stairs, where things are kept, Seen ticks; no skip note', /Home walk-through/.test(w) && /Getting in/.test(w) && /Where things are kept/.test(w) && !/This is for families/.test(w) && qa('.hv-sec[data-sec="9"] [data-hva="seen"]').length>=2);
  ok('from the walk-through, Next is the agreement', /Next: Agreement and sign-off/.test(q('#hvFoot').innerText));
  /* the agreement, straight from the lead */
  await go(10); const s10=sec(10);
  const cards=[...s10.querySelectorAll('.hv-card h2')].map(x=>x.textContent);
  const link=s10.querySelector('#hvAgree a');
  ok('Agreement and sign-off: the agreement comes first, starting care says go straight to it', cards[0]==='Client Care Agreement' && /go straight to the Client Care Agreement/.test(s10.innerText), cards);
  ok('not in AxisCare yet: the agreement opens from the lead', link && link.getAttribute('href')==='agreement.html?lead=lead_betty&cn=Betty%20Harlow%20(fake)' && /before anything is set up in AxisCare/.test(s10.innerText), link&&link.outerHTML);
  a.axiscare_client_id='4321'; await go(9); await go(10);
  ok('once in AxisCare it opens by the AxisCare number', /agreement\.html\?ax=4321&/.test(q('#hvAgree a').getAttribute('href')));
  a.axiscare_client_id='';
  const txt=document.getElementById('hvRoot').innerText;
  ok('no "AI" and no em dashes on the screens', !/\bAI\b/.test(txt) && !/—/.test(txt), (txt.match(/.{30}(\bAI\b|—).{30}/)||[])[0]);
  const small=qa('button,[data-hv]').filter(b=>{ const x=b.getBoundingClientRect(); return x.width>0 && x.height>0 && x.height<36; }).map(b=>b.outerHTML.slice(0,80));
  ok('every button and box is at least 36px tall (fingers)', small.length===0, small.slice(0,5));
  await HV.close(); await sleep(50);
  /* an older visit: its done marks follow the screens they belong to now */
  DATA.care_assessments.push({ id:'old1', lead_id:'lead_betty', client_name:'Old visit', status:'Scheduled', visit:{ v:1, attendees:[], seen:{ 0:true, 3:true, 4:true, 7:true } } });
  await HV.open({ id:'old1' }); await sleep(150);
  const sn=HV._st.a.visit.seen;
  ok('an older visit: Daily activities done marks both house and personal care, Home and safety marks the walk-through, Sign-off the agreement', sn[0] && sn[4] && sn[6] && sn[9] && sn[10] && !sn[3] && !sn[7] && HV._st.a.visit.seen_v2===true, sn);
  await HV.close(); await sleep(50);
  /* Settings: owners change the talking points */
  const box=document.getElementById('hvSet'); HV.settingsFill();
  document.getElementById('hvSet_aboutPts').value='We are local.\nWe pick up the phone.'; document.getElementById('hvSet_aboutOpen').value='Hi, we are Caring Companions.'; document.getElementById('hvSet_jobsHeavy').value='Mopping floors\nScrubbing the tub';
  await HV.aboutSave(); await sleep(20);
  ok('Settings: owners save the About us points and the housekeeping jobs', box && DATA.ops_settings.visit_about.points.join('|')==='We are local.|We pick up the phone.' && DATA.ops_settings.visit_house_jobs.heavy_house.join('|')==='Mopping floors|Scrubbing the tub' && DATA.ops_settings.visit_about.folder.length===9, DATA.ops_settings);
  await HV.open({ leadId:'lead_betty' }); await sleep(150); await go(1);
  ok('the visit shows the saved points and opener', /Hi, we are Caring Companions\./.test(sec(1).innerText) && DATA.ops_settings.visit_about.close.length>10 && /We pick up the phone/.test(sec(1).innerText) && !/screened, insured and bonded/.test(sec(1).innerText));
  await go(4);
  ok('and the saved housekeeping jobs', qa('[data-hvp="visit.acts.heavy_house.jobs"]').map(b=>b.textContent).join('|')==='Mopping floors|Scrubbing the tub');
  await HV.close(); await sleep(50);
  /* the agreement card on a lead, not in AxisCare yet */
  CP.lead=lead; CP.ax=''; L.calls.length=0;
  window.__agList=[{ id:'ag1', status:'countersigned', version:'Rev. 10/2026', created_at:'2026-10-30T15:00:00Z', countersigned_at:'2026-10-30T16:00:00Z', has_pdf:true, client_ax:null, lead_id:'lead_betty', signer:{ name:'Karen Price (fake)', role:'representative' }, copies:{ emails:[] } }];
  if(!window.CAG) await new Promise(r=>{ const sc=document.createElement('script'); sc.src='agreement-card.js?v=test'; sc.onload=r; document.head.appendChild(sc); });
  const host=document.createElement('div'); host.id='cagTest'; document.body.appendChild(host); await window.CAG.mount('cagTest'); await sleep(50);
  const ct=host.innerText;
  ok('agreement card on a lead: lists by the lead, the contacts wait for AxisCare', L.calls.some(c=>c[0]==='client-agreement' && c[1].action==='list' && c[1].lead_id==='lead_betty' && !c[1].client_ax) && /Signed/.test(ct) && /Review the contacts once they are set up in AxisCare/.test(ct) && !host.querySelector('[data-cag-rev]'), [L.calls, ct.slice(0,400)]);
  host.remove();
  /* Create in AxisCare: held back until the agreement is signed; paper counts once the office says so */
  (0,eval)('lpLead=DATA.leads[0];'); lead.axiscare_client_id='';
  window.__ccv=(b)=>lead.agreement_paper ? { plan:{ ok:false, blockers:['Stop here for the test.'] } } : { plan:{ ok:false, blockers:["The Client Care Agreement isn't signed yet. Sign it first (the home visit, or Start of Care), or mark it signed on paper."] } };
  lpConvertLead(); await sleep(150);
  const pb=document.getElementById('ccvPaper');
  ok('Create in AxisCare is held back with her words, and offers "It was signed on paper"', pb && /isn't signed yet/.test(pb.closest('[role="dialog"]').innerText), document.body.innerText.slice(-400));
  pb.click(); await sleep(200);
  ok('signed on paper: the lead records who said so, and Create in AxisCare looks again', lead.agreement_paper && lead.agreement_paper.by==='samantha@mo-care.com' && L.persists.some(x=>x[0]==='leads' && x[1].agreement_paper) && L.calls.filter(c=>c[0]==='client-convert').length===2 && !document.getElementById('ccvPaper'), [lead.agreement_paper, L.calls.filter(c=>c[0]==='client-convert')]);
  document.querySelectorAll('[role="dialog"]').forEach(d=>d.parentElement && d.parentElement.remove());
  return R;
}
"""
MIME = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.json':'application/json', '.webmanifest':'application/json', '.webp':'image/webp', '.jpg':'image/jpeg'}
def serve(route):
    url = route.request.url
    if url.startswith('https://mo-care.com/assets/outings.json'):
        return route.fulfill(status=200, body=json.dumps(PLACES), content_type='application/json', headers={'access-control-allow-origin': '*'})
    if 'supabase.co' in url: return route.abort()
    if not url.startswith('http://hv.local/'): return route.continue_()
    p = (ROOT / url.split('http://hv.local/', 1)[1].split('?')[0].split('#')[0])
    if not p.is_file(): return route.fulfill(status=404, body='')
    route.fulfill(status=200, body=p.read_bytes(), content_type=MIME.get(p.suffix, 'application/octet-stream'))
def overflow(pg):
    return pg.evaluate("()=>{ const r=document.getElementById('hvRoot'); if(!r) return 'no visit'; const w=r.clientWidth; return [...r.querySelectorAll('*')].filter(e=>{ const b=e.getBoundingClientRect(); return b.width>0 && b.right>w+1 && !e.closest('.hv-rail'); }).slice(0,4).map(e=>e.className+' '+Math.round(e.getBoundingClientRect().right)); }")

# the agreement page itself, started from the lead (its own little server: agreement.html signs in with a stored fake session)
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f'http://127.0.0.1:{srv.server_address[1]}'
SESSION = {'access_token': 'kr', 'refresh_token': 'r', 'token_type': 'bearer', 'expires_in': 3600, 'expires_at': 4102444800, 'user': {'id': 'u-kr', 'email': 'kr@mo-care.com', 'aud': 'authenticated', 'role': 'authenticated', 'app_metadata': {}, 'user_metadata': {}}}
FORM = {'doc': 'client-care-agreement', 'version': 'Rev. 10/2026', 'pdf_sha256': 'x', 'esign_words': 'I agree.', 'initials': {}, 'fields': {}, 'office_keys': []}

with sync_playwright() as pw:
    b = pw.chromium.launch(); cx = b.new_context(viewport={'width': 1180, 'height': 820}, timezone_id='America/Chicago', has_touch=True); pg = cx.new_page()
    pg.route('**/*', serve)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://hv.local/index.html?proof=hv'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T)
    pg.evaluate("async()=>{ DATA.leads[0].axiscare_client_id=''; await HV.open({ leadId:'lead_betty' }); }"); pg.wait_for_timeout(300)
    for i in range(11):
        pg.evaluate(f"()=>document.querySelector('#hvRoot [data-hvs=\"{i}\"]').click()"); pg.wait_for_timeout(150)
        o = overflow(pg); R.append(['PASS' if not o else 'FAIL', f'iPad (1180 wide), screen {i+1}: nothing runs off the side', o])
        if SHOTS:
            os.makedirs(SHOTS, exist_ok=True); pg.screenshot(path=os.path.join(SHOTS, f'vo-ipad-{i+1}.png'), full_page=False)
    for wd, ht, label in [(820, 1180, 'iPad upright (820 wide)'), (390, 844, 'phone (390 wide)')]:
        pg.set_viewport_size({'width': wd, 'height': ht})
        for i in [1, 3, 4, 6, 9, 10]:
            pg.evaluate(f"()=>document.querySelector('#hvRoot [data-hvs=\"{i}\"]').click()"); pg.wait_for_timeout(150)
            o = overflow(pg); R.append(['PASS' if not o else 'FAIL', f'{label}, screen {i+1}: nothing runs off the side', o])
            if SHOTS: pg.screenshot(path=os.path.join(SHOTS, f'vo-{wd}-{i+1}.png'))
    R.append(['PASS' if not errs else 'FAIL', 'no page errors on the Hub', errs[:3]])

    calls = []
    def fake(route, request):
        if request.method == 'OPTIONS': return route.fulfill(status=200, headers={'access-control-allow-origin': '*', 'access-control-allow-headers': '*'}, body='ok')
        bd = json.loads(request.post_data or '{}'); calls.append(bd)
        J = lambda o: route.fulfill(status=200, content_type='application/json', headers={'access-control-allow-origin': '*'}, body=json.dumps(o))
        if bd.get('action') == 'form': return J({'ok': True, 'form': FORM})
        if bd.get('action') == 'prefill': return J({'ok': True, 'count': 4, 'sources': ['Lead', 'Home visit'], 'notes': [], 'office': {'level.personal_care': True, 'level.hourly_rate': '32'}, 'visit_found': True})
        if bd.get('action') == 'start': return J({'ok': True, 'agreement': {'id': '11111111-1111-4111-8111-111111111111', 'client_ax': None, 'lead_id': 'lead_betty', 'status': 'void', 'void_reason': 'test stop'}, 'form': FORM})
        return J({'ok': False})
    ax = b.new_context(viewport={'width': 1024, 'height': 768})
    ax.add_init_script('localStorage.setItem("sb-zngsgedlsxinbygwmxwn-auth-token", %s);' % json.dumps(json.dumps(SESSION)))
    ap = ax.new_page(); aerr = []; ap.on('pageerror', lambda e: aerr.append(str(e)[:200]))
    ap.route('**/functions/v1/client-agreement', fake)
    ap.goto(BASE + '/agreement.html?lead=lead_betty&cn=Betty%20Harlow'); ap.wait_for_selector('#startBtn'); ap.wait_for_timeout(300)
    lead_txt = ap.locator('#view').inner_text()
    R.append(['PASS' if 'Not in AxisCare yet' in lead_txt and any(c.get('action') == 'prefill' and c.get('lead_id') == 'lead_betty' and 'client_ax' not in c for c in calls) else 'FAIL',
              'agreement page from the lead: set-up says not in AxisCare yet, and looks up what we know by the lead', [lead_txt[:300], calls]])
    ap.click('#startBtn'); ap.wait_for_timeout(400)
    st = [c for c in calls if c.get('action') == 'start']
    R.append(['PASS' if st and st[0].get('lead_id') == 'lead_betty' and 'client_ax' not in st[0] and st[0]['office'].get('level.personal_care') is True else 'FAIL',
              'agreement page from the lead: starts the agreement on the lead, with the home visit\'s level', st])
    R.append(['PASS' if not aerr else 'FAIL', 'no page errors on the agreement page', aerr[:3]])
    b.close()
srv.shutdown()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

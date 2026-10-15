"""Future Service Opportunities (Samantha 2026-10-15; approved screen https://claude.ai/artifact/T6F9vizYtQu57dcJumdDaD and her
service-area tiers). The real page, offline, made-up families (the lead workspace test's setup plus these). Proves: Save for
Future suggests the reason from her tiers (Tier 1/2 = we serve it, can't staff; Tier 3 = expansion; not listed = outside),
records permission, takes the family off the board without Lost; Other needs a note; the Future opportunities view lists,
filters and searches them, sums demand by area with her threshold (3+ families or 40+ hours), moves the old Lost families
in, lists possible matches when a caregiver nearby is hired, Not yet hides one, Reactivate puts the SAME lead back; the
owner edits the tiers; nothing is texted or emailed.
(python3 tests/browser/future_opps_look.py, static server on PORT, default 8765; SHOT=<png> for a screenshot)"""
import os, re
from playwright.sync_api import sync_playwright
PORT = os.environ.get('PORT', '8765')
SRC = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'leads_workspace_look.py')).read()
STUB = re.search(r'STUB = r"""(.*?)"""', SRC, re.S).group(1)
MORE = r"""
(()=>{
  const base={ status:'Contacted', assigned_coordinator:'Krystal', created_at:'2026-10-03T14:00:00Z', first_human_attempt_at:'2026-10-03T15:00:00Z', first_human_contact_at:'2026-10-03T15:00:00Z', funding_source:'private' };
  DATA.leads.push(
    Object.assign({}, base, { id:'bo', first_name:'David', last_name:'Johnson', client_first_name:'Mary', client_last_name:'Johnson', client_city:'Bolivar', client_zip:'65613', number_of_hours:'24', needs:['personalCare'], phone:'4175550501' }),
    Object.assign({}, base, { id:'br', first_name:'Sam', last_name:'Miller', client_first_name:'Susan', client_last_name:'Miller', client_city:'Branson', phone:'4175550502' }),
    Object.assign({}, base, { id:'ca', first_name:'Ed', last_name:'Barr', client_first_name:'Eve', client_last_name:'Barr', client_city:'Cassville', phone:'4175550503' }),
    Object.assign({}, base, { id:'ro', first_name:'Ray', last_name:'Rolla', client_first_name:'Rita', client_last_name:'Rolla', client_city:'Rolla', phone:'4175550504' }),
    Object.assign({}, base, { id:'p2', client_first_name:'Pat', client_last_name:'Two', client_city:'Humansville', county:'Polk', number_of_hours:'10', status:'Saved', phone:'4175550505',
      future:{ reason_key:'no_caregiver', reason:'No caregiver available in that location', kind:'staff', county:'Polk', town:'Humansville', zip:'65674', saved_at:'2026-09-01T00:00:00Z', permission:{ answer:'no' } } }),
    Object.assign({}, base, { id:'p3', client_first_name:'Pam', client_last_name:'Three', client_city:'Fair Play', county:'Polk', number_of_hours:'8', status:'Saved', phone:'4175550506',
      future:{ reason_key:'no_caregiver', reason:'No caregiver available in that location', kind:'staff', county:'Polk', town:'Fair Play', zip:'65649', saved_at:'2026-09-02T00:00:00Z', permission:{ answer:'not_asked' } } }),
    Object.assign({}, base, { id:'L1', client_first_name:'Lou', client_last_name:'Lost', client_city:'West Plains', status:'Lost', lost_reason_key:'outside_area', lost_reason:'Outside our service area', lost_at:'2026-08-01T00:00:00Z', phone:'4175550507' }),
    Object.assign({}, base, { id:'L2', client_first_name:'Liz', client_last_name:'Lost', client_city:'Ozark', status:'Lost', lost_reason_key:'could_not_staff', lost_reason:'Could not staff the schedule', lost_schedule:{ days:['Sat','Sun'], city:'Ozark', zip:'65721' }, phone:'4175550508' }),
    Object.assign({}, base, { id:'L3', client_first_name:'Leo', client_last_name:'Price', client_city:'Nixa', status:'Lost', lost_reason_key:'price', lost_reason:'Price', phone:'4175550509' }));
  DATA.client_rates=[{ id:'rates', levels:{ l1:{ rate:'$30' }, l2:{ rate:'$32' }, l3:{ rate:'$34' } } }];
  (0,eval)("ZIPS={ '65613':{zip:'65613',lat:37.614,lon:-93.410}, '65674':{zip:'65674',lat:37.795,lon:-93.578}, '65649':{zip:'65649',lat:37.633,lon:-93.578}, '65802':{zip:'65802',lat:37.21,lon:-93.30} };");
  window.ccIsOwner=()=>true; window.__merged=[];
  window.ccMergeSave=async(key, apply)=>{ const base=JSON.parse(JSON.stringify(DATA.ops_settings||{})); const m=JSON.parse(JSON.stringify(base)); const ch=apply(m, base)||[]; if(ch.length){ DATA.ops_settings=m; window.__merged.push(m); } return { changed:ch, error:null }; };
  window.__events=[]; window.opEvent=(v,o)=>window.__events.push([v,o]);
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,900)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  (0,eval)("renderLeadsStarts=window.__realRLS||renderLeadsStarts"); switchTab('leadsstarts'); await sleep(300);
  const draw=async()=>{ try{ LeadsBoard.render(lsRows(), {}); }catch(e){} await sleep(150); };
  await draw();
  const L=id=>DATA.leads.find(l=>l.id===id), B=()=>document.getElementById('lbBoard'), M=()=>document.getElementById('foModal');
  const sugg=()=>{ const c=M().querySelector('input[name=foR]:checked'); return c?c.value:''; };
  /* the suggestion follows her tiers */
  FutureOpps.save('br'); ok('Branson (Taney, Tier 2): suggests "No caregiver available" (we serve it, conditionally)', sugg()==='no_caregiver' && /Tier 2/.test(M().innerText), M().innerText.slice(0,400));
  FutureOpps.save('ca'); ok('Cassville (Barry, Tier 3): suggests "Potential future expansion area"', sugg()==='expansion' && /Tier 3/.test(M().innerText));
  FutureOpps.save('ro'); ok('Rolla (Phelps, in no tier): suggests "Outside our current service area"', sugg()==='outside_area' && /not in our service area/.test(M().innerText));
  M().querySelector('input[value=other]').click(); M().querySelector('#foGo').click(); await sleep(50);
  ok('Other with no note is refused, with why', /needs a few words/.test(M().querySelector('#foErr').textContent) && L('ro').status==='Contacted');
  document.querySelector('#foNo').click();
  /* save Mary from the board's ··· menu */
  const more=[...B().querySelectorAll('.lb-more')].find(b=>/lbMore\('bo'/.test(b.getAttribute('onclick')));
  more.click(); await sleep(100);
  const pick=[...document.querySelectorAll('.ccpick-row')].find(r=>/Save for future/.test(r.textContent));
  ok('the board\'s ··· menu offers Save for future…', !!pick); pick.click(); await sleep(100);
  ok('Bolivar (Polk, Tier 1): suggests "No caregiver available", county filled from the town', sugg()==='no_caregiver' && M().querySelector('#foCounty').value==='Polk', [sugg(), M().querySelector('#foCounty').value]);
  M().querySelector('input[name=foP][value=yes]').click(); await sleep(20);
  ok('...saying yes to contact asks who said so and how', !M().querySelector('#foPermYes').hidden && M().querySelector('#foSaid').value==='David Johnson');
  M().querySelector('#foVia').value='call'; M().querySelector('#foNote').value='Wants mornings Mon to Fri';
  M().querySelector('#foGo').click(); await sleep(250);
  const bo=L('bo');
  ok('saved: status Saved (not Lost), the reason, kind, county, town, hours, permission with who and how', bo.status==='Saved' && bo.future.reason_key==='no_caregiver' && bo.future.kind==='staff' && bo.future.county==='Polk' && bo.future.town==='Bolivar'
     && bo.future.permission.answer==='yes' && bo.future.permission.said_by==='David Johnson' && bo.future.permission.via==='call' && bo.status_history.at(-1).to==='Saved' && !bo.lost_at, bo.future);
  ok('...a history line, a saved write, a record of who did it', bo.comm_log.some(c=>/Saved for future: No caregiver available/.test(c.body)) && window.__log.writes.some(w=>w.id==='bo'&&w.status==='Saved') && window.__events.some(e=>e[0]==='lead_saved_future'));
  await draw();
  ok('...off the active board', !B().querySelector('[data-lbc="bo"]') && !lsRows().some(r=>r.l.id==='bo'&&r.set==='work'));
  /* the view */
  const lk=document.getElementById('lbLookup');
  ok('Look up offers Future opportunities with the count', /Future opportunities 3/.test(lk.innerText), lk.innerText);
  lbFilter('future'); await draw(); await sleep(100);
  const V=()=>B().innerText;
  ok('the list shows the saved families with where, why, hours, $/month, may contact', /Mary Johnson[\s\S]*Bolivar[\s\S]*Polk County[\s\S]*Can't staff[\s\S]*24[\s\S]*\$3,330[\s\S]*Yes, call/.test(V()), V().slice(0,1500));
  ok('demand by area: Polk can\'t-staff, 3 families, 42 h a week: "Recruit here" (her 3+ / 40+ rule)', /Polk County[\s\S]*Tier 1 \(core\)[\s\S]*Can't staff[\s\S]*3[\s\S]*42[\s\S]*Recruit here/.test(V()), V().slice(0,1800));
  ok('the service area shows her three tiers', /Tier 1 · Core[\s\S]*Christian, Greene, Polk, Webster|Tier 1 · Core[\s\S]*Greene, Christian, Webster, Polk/.test(V()) && /Tier 3 · Expansion or waitlist[\s\S]*Barry/.test(V()), V());
  [...B().querySelectorAll('.fo-tabs .filter-pill')].find(b=>/Area we don't serve/.test(b.textContent)).click(); await sleep(150);
  ok('the Area tab shows only area families (none yet)', /Nobody matches/.test(V()));
  FutureOpps.tab('all'); await sleep(100); FutureOpps.search('fair play'); await sleep(150);
  ok('search finds by town', /Pam Three/.test(V()) && !/Mary Johnson/.test(V().split('Saved for future')[1]||''), V().slice(-600));
  FutureOpps.search(''); await sleep(100);
  /* old Lost families */
  const mv=[...B().querySelectorAll('button')].find(b=>/Move 2 in/.test(b.textContent));
  ok('the 2 families Lost for area or staffing reasons are offered to move in (not the price one)', !!mv && /2 families were marked Lost/.test(V()));
  mv.click(); await sleep(300);
  ok('...moved: Saved, kind from the reason, from Lost recorded, nobody asked to contact', L('L1').status==='Saved' && L('L1').future.kind==='area' && L('L2').future.kind==='schedule' && L('L2').future.from_lost.reason==='Could not staff the schedule'
     && L('L1').future.permission.answer==='not_asked' && L('L3').status==='Lost', [L('L1').future, L('L2').future]);
  /* a caregiver nearby is hired: possible matches */
  DATA.caregivers.push({ axiscare_id:'77', name:'Jordan Pike', zip:'65613', city:'Bolivar', hire_date:'2026-10-20' }); await draw(); await sleep(100);
  ok('a caregiver hired in Bolivar after they were saved: Mary and the two other Polk families are listed as possible matches', /Possible matches/.test(V()) && /Mary Johnson[\s\S]*Jordan Pike \(0 mi\) was hired/.test(V()) && /Pat Two/.test(V()), V().slice(0,900));
  ok('...Mary (may contact) gets Reactivate and call; Pat (said no) gets Reactivate only', /Reactivate and call/.test(B().querySelector('.fo-m').innerText) && [...B().querySelectorAll('.fo-m')].some(m=>/Pat Two/.test(m.innerText) && !/and call/.test(m.innerText)));
  const pat=[...B().querySelectorAll('.fo-m')].find(m=>/Pat Two/.test(m.innerText)); [...pat.querySelectorAll('button')].find(b=>/Not yet/.test(b.textContent)).click(); await sleep(200);
  ok('Not yet takes Pat off the matches (until something else changes)', ![...B().querySelectorAll('.fo-m')].some(m=>/Pat Two/.test(m.innerText)));
  ok('the board\'s Look up says how many may fit now', /may fit now/.test(document.getElementById('lbLookup').innerText));
  /* reactivate */
  const before=window.__log.writes.length, ids=DATA.leads.length;
  [...B().querySelectorAll('.fo-m')].find(m=>/Mary Johnson/.test(m.innerText)).querySelector('.lb-btn-primary').click(); await sleep(300);
  ok('Reactivate: the SAME lead back to Contacted, the saved record kept in its history, a history line, no copy', L('bo').status==='Contacted' && !L('bo').future && L('bo').future_history.at(-1).reactivated_at && DATA.leads.length===ids
     && L('bo').comm_log.some(c=>/Reactivated: Jordan Pike/.test(c.body)), [L('bo').status, L('bo').future_history]);
  lbFilter('All'); await draw();
  ok('...and back on the board', !!B().querySelector('[data-lbc="bo"]'));
  /* the owner sets the tiers */
  lbFilter('future'); await draw(); FutureOpps.editArea(true); await sleep(150);
  const sel=B().querySelector('#foAreaEdit select[data-county="Taney"]'); sel.value='expansion';
  [...B().querySelectorAll('#foAreaEdit button')].find(b=>/Save the service area/.test(b.textContent)).click(); await sleep(200);
  const sa=DATA.ops_settings.service_area;
  ok('the owner moves Taney to Tier 3: saved with who and when, the old list kept', sa && sa.tiers.expansion.indexOf('Taney')>-1 && sa.tiers.conditional.indexOf('Taney')<0 && sa.tiers.core.indexOf('Greene')>-1 && sa.by==='krystal@mo-care.com' && sa.history.length===1, sa);
  FutureOpps.save('br'); ok('...and Branson is now suggested as expansion', sugg()==='expansion'); document.querySelector('#foNo').click();
  /* the workspace */
  await openClient({ lead_id:'p3' }, 'summary'); await sleep(300);
  ok('a saved family\'s Overview says Saved for future with Reactivate', /Saved for future[\s\S]*No caregiver available[\s\S]*Reactivate/.test(document.body.innerText));
  await openClient({ lead_id:'ca' }, 'summary'); await sleep(300);
  ok('an active family\'s Overview offers Save for future', [...document.querySelectorAll('button')].some(b=>b.offsetParent&&b.textContent==='Save for future'));
  ok('nothing was texted or emailed', !window.__log.sms.length);
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1360, 'height': 1000})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(f'http://localhost:{PORT}/index.html?proof=futureopps'); pg.wait_for_timeout(1200)
    pg.evaluate("()=>{ window.__realRLS = window.renderLeadsStarts; }")
    pg.evaluate('s=>(0,eval)(s)', STUB); pg.evaluate('s=>(0,eval)(s)', MORE)
    R = pg.evaluate(T)
    if os.environ.get('SHOT'):
        pg.evaluate("async()=>{ DATA.ops_settings.service_area=null; FutureOpps.editArea(false); switchTab('leadsstarts'); await new Promise(r=>setTimeout(r,300)); lbFilter('future'); LeadsBoard.render(lsRows(), {}); await new Promise(r=>setTimeout(r,300)); }")
        pg.locator('#lbBoard').screenshot(path=os.environ['SHOT'])
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

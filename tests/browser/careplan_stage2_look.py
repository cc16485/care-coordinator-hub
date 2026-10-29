"""Care plan Stage 2 (2026-10-29, Samantha: "Stage 2 approved as written, with your suggestions on the 4 decisions"; emergency
wording approved word for word). The real Hub page, offline, made-up families. Proves: Their story asks what good care looks
like, what they still do themselves and what they like to be called; a health condition's warning-sign boxes appear only once
it has a name; a "How we help" panel opens only under an activity where help is needed, with that activity's own prompts, and
goes away when help is not needed; Home and safety is its own screen (5th), with getting in (never a code box), parking, who to
call in order (built from the emergency contact and the people in the room), pets only when there are pets, a stairs note only
when there are stairs, and where things are kept; a typical shift builds itself from the schedule and the help needed, in time
order, with at most 3 stars, editable, rebuilt only after asking; "Still needs attention" counts what is missing and jumps to
each box; every new answer reaches the care plan draft, conditions included (a Stage 1 gap); the emergency wording is the
approved text with the client's name, pronouns (they/them when not known) and emergency contact filled in, the hospice part
only for hospice clients, the visit's warning signs added; owners change the wording in Settings and every plan uses it; it is
on the care plan screen; nothing is sent; no "AI" and no em dashes; it fits an iPad and a phone.
(python3 tests/browser/careplan_stage2_look.py; SHOTS=<dir> saves screenshots)"""
import os, sys, re, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = os.environ.get('SHOTS')
STUB = r"""
(()=>{
  const W=window; W.__log={ persists:[], merges:[], drafts:[], asks:[] }; W.__ask=true;
  const of=W.fetch;
  W.fetch=async(u,o)=>{ u=String(u); if(/ai-draft-careplan/.test(u)){ W.__log.drafts.push(JSON.parse(o.body)); return new Response(JSON.stringify({ ok:true, fields:{}, tasks:[], ask:[], parts:[], at:new Date().toISOString(), model:'m' }),{ status:200 }); }
    if(/careplan-tasks/.test(u)) return new Response(JSON.stringify({ catalog:[] }),{ status:200 }); return of(u,o); };
  (0,eval)(`sb={ from:()=>{ const p={ select(){return p;}, eq(){return p;}, gte(){return p;}, in(){return p;}, order(){return p;}, limit(){return p;}, is(){return p;},
      single:async()=>({ data:null, error:null }), maybeSingle:async()=>({ data:null, error:null }), then(a){ return Promise.resolve({data:[],error:null}).then(a); } }; return p; },
    storage:{ from:()=>({ upload:async()=>({ error:null }) }) }, rpc:async()=>({data:null,error:null}), functions:{ invoke:async()=>({ data:null, error:null }) },
    auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };
    CONFIG.supabase_url='https://zz.supabase.co';
    ME={ email:'krystal@mo-care.com', name:'Krystal Land' }; CC_ROLES=['care_coordinator']; CC_ROLES_CHECKED=true;
    CC_ROLE_BY_EMAIL['krystal@mo-care.com']=['care_coordinator']; CC_ROLE_BY_EMAIL['samantha@mo-care.com']=['owner_admin'];
    persist=async(k,v)=>{ window.__log.persists.push([k, JSON.parse(JSON.stringify(v))]); };
    tkMerge=async(fn,label)=>{ const m=JSON.parse(JSON.stringify(DATA.ops_settings||{})); const said=fn(m); DATA.ops_settings=m; window.__log.merges.push([label,said]); return {}; };
    ccConfirm=async(m)=>{ window.__log.asks.push(m); return window.__ask; }; ccToast=()=>{};`);
  DATA.ops_settings={}; DATA.care_assessments=[]; DATA.care_plans=[]; DATA.client_profiles=[]; DATA.ops_items=[];
  DATA.leads=[{ id:'lead_betty', first_name:'Karen', last_name:'Price (fake)', relationship:'Daughter', phone:'(417) 555-0172', client_first_name:'Betty', client_last_name:'Harlow (fake)', client_gender:'Female', status:'Contacted' },
    { id:'lead_sam', first_name:'Sam', last_name:'Ode (fake)', relationship:'Self', phone:'(417) 555-0111', client_first_name:'Sam', client_last_name:'Ode (fake)', status:'Contacted', client_attributes:{ hospice:'yes' } }];
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,900)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, q=s=>document.querySelector('#hvRoot '+s), qa=s=>[...document.querySelectorAll('#hvRoot '+s)];
  const tap=(p,v)=>{ const b=q('[data-hvp="'+p+'"][data-v="'+v+'"]'); if(!b) throw new Error('no pill '+p+' '+v); b.click(); };
  const type=(p,v,chg)=>{ const el=q('[data-hv="'+p+'"]'); if(!el) throw new Error('no box '+p); el.value=v; el.dispatchEvent(new Event('input',{bubbles:true})); if(chg) el.dispatchEvent(new Event('change',{bubbles:true})); };
  const sec=i=>q('.hv-sec[data-sec="'+i+'"]');
  try{
  await HV.open({ leadId:'lead_betty' }); await sleep(150);
  const a=HV._st.a, v=a.visit;
  const rail=qa('#hvRail [data-hvs]').map(b=>b.innerText.replace(/\s+/g,' ').trim());
  ok('Home and safety is its own screen, 5th, between Daily activities and Preferences', rail.join('|')==='1 Start the visit|2 Their story|3 Health|4 Daily activities|5 Home and safety|6 Preferences|7 Schedule and level|8 Sign-off|9 After the visit', rail);
  /* story */
  q('[data-hvs="1"]').click(); await sleep(30);
  ok('Their story asks what good care looks like, what they still do themselves, what they like to be called', !!q('[data-hv="visit.story.good_care"]') && !!q('[data-hv="visit.story.self"]') && !!q('[data-hv="visit.story.called"]') && /What good care looks like to you/.test(sec(1).innerText));
  type('visit.story.good_care','Mom eats lunch every day and feels safe in the shower'); type('visit.story.self','Picks her clothes, dries the dishes'); type('visit.story.called','Betty');
  /* conditions */
  q('[data-hvs="2"]').click(); await sleep(30);
  ok('no warning-sign boxes for a condition with no name', !q('[data-hv="visit.conditions.0.notice"]'));
  type('visit.conditions.0.name','High blood pressure',true); await sleep(30);
  ok('once named, "What we would notice" and "What to do" appear for it', !!q('[data-hv="visit.conditions.0.notice"]') && !!q('[data-hv="visit.conditions.0.todo"]') && /Warning signs for High blood pressure/.test(q('#hvConds').innerText));
  type('visit.conditions.0.notice','Dizzy when she stands up'); type('visit.conditions.0.todo','Sit her down and call the office');
  /* how we help */
  q('[data-hvs="3"]').click(); await sleep(30);
  ok('no How we help panel until an activity needs help', !qa('.hv-help').length);
  tap('visit.acts.bathing.level','standby'); await sleep(20);
  ok('Stand-by on bathing opens its panel, with bathing\'s own prompts and the five boxes', !!q('#hvHelp_bathing .hv-help') && /Shower or bath\? Which days and time\? Where are the towels and clothes\?/.test(q('#hvHelp_bathing').innerText) && ['steps','self','supplies','likes','watch'].every(k=>q('[data-hv="visit.acts.bathing.help.'+k+'"]')));
  type('visit.acts.bathing.help.steps','Run the water warm\nShe sits on the shower chair\nStay within reach'); type('visit.acts.bathing.help.supplies','Towels in the hall closet, top shelf');
  tap('visit.acts.meals.level','full'); tap('visit.acts.meds.level','needed'); tap('visit.acts.light_house.level','helps'); await sleep(20);
  ok('Reminders needed and Client helps count as help; their panels open too', !!q('#hvHelp_meds .hv-help') && !!q('#hvHelp_light_house .hv-help'));
  tap('visit.acts.light_house.level','not_needed'); await sleep(20);
  ok('"Not needed" closes the panel again', !q('#hvHelp_light_house .hv-help'));
  /* home and safety */
  q('[data-hvs="4"]').click(); await sleep(40);
  const hs=()=>sec(4).innerText;
  ok('Home and safety: getting in, parking, who to call, where things are kept', /Getting in/.test(hs()) && !!q('[data-hv="visit.home.parking"]') && /Who to call/.test(hs()) && /Where things are kept/.test(hs()) && !!q('[data-hv="visit.home.medlist_where"]'));
  ok('no box anywhere for a door or lockbox code; it says the code goes in AxisCare', !qa('[data-hv]').some(e=>/code/i.test(e.getAttribute('data-hv')) && e.tagName!=='BUTTON') && /goes in AxisCare/.test(hs()));
  tap('visit.home.entry','lockbox'); await sleep(30);
  ok('a lockbox: asks whether the code is in AxisCare (a yes/no, not the code)', !!q('[data-hvp="visit.home.code_in_axis"][data-v="yes"]'));
  tap('visit.home.code_in_axis','yes'); type('visit.home.entry_note','Back door; lockbox on the porch rail'); type('visit.home.parking','Driveway');
  ok('the office number is shown, and the call order starts from the emergency contact', /\(417\) 234-8494/.test(hs()) && /^1\. Karen Price \(fake\) \(Daughter\), \(417\) 555-0172/.test(v.home.call_order||''), v.home.call_order);
  ok('no pets card when there are no pets', !/Names, and where they stay/.test(hs()));
  v.prefs.dogs='yes'; q('[data-hvs="3"]').click(); q('[data-hvs="4"]').click(); await sleep(30);
  ok('dogs: the pets card appears', /Names, and where they stay during visits/.test(hs()));
  ok('no stairs note until there are stairs', !q('[data-hv="visit.home.stairs_note"]'));
  tap('visit.home.stairs','yes'); await sleep(30);
  ok('stairs: "Where, and is there a rail?" appears', !!q('[data-hv="visit.home.stairs_note"]'));
  /* typical shift */
  v.week={ tue:{ from:'09:00', to:'13:00' }, thu:{ from:'09:00', to:'13:00' } };
  q('[data-hvs="6"]').click(); await sleep(40);
  const sh=v.shift.map(r=>(r.t||'')+' '+r.what);
  ok('a typical shift builds itself from the schedule and the help, in time order', sh[0]==='09:00 Arrive, say hello, and see how Betty are today'.replace('Betty are','Betty are') && /Medication reminder/.test(sh[1]) && /shower or bath/.test(sh[2]) && sh.some(x=>/Make the meal/.test(x)) && /12:45 Write the visit note in AxisCare/.test(sh[sh.length-1]), sh);
  const stars=()=>qa('[data-hva="shiftstar"]');
  stars()[1].click(); stars()[2].click(); stars()[3].click(); await sleep(20);
  ok('three stars allowed; a fourth is locked', v.shift.filter(r=>r.star).length===3 && stars()[0].disabled);
  q('[data-hva="shiftdel"][data-i="0"]').click(); await sleep(20);
  ok('a line can be removed', !v.shift.some(r=>/^Arrive/.test(r.what)));
  window.__ask=false; q('[data-hva="shiftbuild"]').click(); await sleep(30);
  ok('building it again asks first; No keeps the changes', /Build the typical shift again/.test(L.asks.slice(-1)[0]) && !v.shift.some(r=>/^Arrive/.test(r.what)));
  window.__ask=true;
  /* still needs attention */
  const nb=()=>q('[data-hva="needs"]');
  const n0=+((nb().innerText.match(/^(\d+)/)||[0,0])[1]);
  ok('the top bar counts what still needs attention', n0>0 && /still needs attention/.test(nb().innerText), nb().innerText);
  nb().click(); await sleep(20);
  const items=[...document.querySelectorAll('#hvNeedsList [data-hva="needsgo"]')].map(b=>b.innerText.replace(/\s+/g,' '));
  ok('the list names each thing: safety answers, where the meal supplies are, the steps for medication reminders', items.some(x=>/Falls in the last 6 months/.test(x)) && items.some(x=>/supplies are for meal preparation/.test(x)) && items.some(x=>/medication reminders: the steps/.test(x)) && !items.some(x=>/How the caregiver gets in/.test(x)), items);
  document.querySelector('#hvNeedsList [data-hva="needsgo"][data-p="visit.acts.meals.help.supplies"]').click(); await sleep(80);
  ok('tapping one jumps to that screen and box', HV._st.sec===3 && document.activeElement && document.activeElement.getAttribute('data-hv')==='visit.acts.meals.help.supplies');
  type('visit.acts.meals.help.supplies','Soup in the pantry, bread on the counter'); await sleep(1100);
  ok('answering it takes the count down', +((nb().innerText.match(/^(\d+)/)||[0,0])[1])===n0-1, [n0, nb().innerText]);
  /* facts for the draft */
  const f=HV.factsFor(a), fp=Object.fromEntries(f.map(x=>[x.path,x.value]));
  ok('the draft gets the new answers: story, warning signs, how we help, getting in, call order, the shift with its top 3', fp['visit.story.good_care'] && /Dizzy when she stands up/.test(fp['visit.conditions.0.notice']) && /Run the water warm/.test(fp['visit.acts.bathing.help.steps'])
    && /Lockbox \(the code or key details are in AxisCare\)/.test(fp['visit.home.entry']) && /Karen Price/.test(fp['visit.home.call_order']) && /\(TOP 3\)/.test(fp['visit.shift']), Object.keys(fp).filter(k=>/story|condition|help|home|shift/.test(k)));
  ok('Stage 1 gap fixed: a named health condition reaches the draft', fp['visit.conditions.0.name']==='High blood pressure');
  /* emergency wording */
  const em=CPV.emergency(a), et=em.map(b=>b.title+': '+b.text).join('\n');
  ok('the approved wording, filled in for Betty (she/her) with her emergency contact and the office number', /If Betty falls: 1\. Do not lift her or help her up, even if she asks\./.test(et) && /Call 911 if she is hurt/.test(et) && /The office calls Karen Price \(fake\), her daughter, for you/.test(et) && /The office first: \(417\) 234-8494/.test(et), et.slice(-600));
  ok('...her warning signs from the visit, and no hospice part (she is not on hospice)', /Warning signs for Betty: If dizzy when she stands up: sit her down and call the office\./.test(et) && !/hospice/.test(et), et);
  await HV.close(); await sleep(30);
  await HV.open({ leadId:'lead_sam' }); await sleep(100);
  const et2=CPV.emergency(HV._st.a).map(b=>b.title+': '+b.text).join('\n');
  ok('no gender on the lead: they/them, never a guess; a hospice client gets the hospice part', /Do not lift them or help them up, even if they ask/.test(et2) && /Call 911 if they are hurt/.test(et2) && /If they pass away during your visit, follow the hospice's instructions/.test(et2), et2);
  await HV.close(); await sleep(30);
  /* settings */
  const box=document.getElementById('hvSet')||(()=>{ const d=document.createElement('div'); d.id='hvSet'; document.body.appendChild(d); return d; })();
  HV.settingsFill(); await sleep(20);
  ok('Settings > Home visit shows the wording to edit, with the office number', !!document.getElementById('emSet_office') && document.getElementById('emSet_office').value==='(417) 234-8494' && /What a caregiver does when something goes wrong/.test(box.innerText));
  const al=window.alert; let alerted=''; window.alert=(m)=>{ alerted=m; };
  await CPV.emSave(); window.alert=al;
  ok("a care coordinator can't change it", /Only owners/.test(alerted) && !L.merges.length);
  (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha' };");
  document.getElementById('emSet_1').value=document.getElementById('emSet_1').value.replace('with a pillow and blanket','with a pillow and a warm blanket');
  await CPV.emSave(); await sleep(20);
  ok('an owner saves it to Settings, and every plan uses it from then on', L.merges.length===1 && /pillow and a warm blanket/.test(CPV.emergency(a).map(b=>b.text).join(' ')) && DATA.ops_settings.emergency_wording.by==='Samantha');
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Land' };");
  /* on the care plan screen */
  DATA.care_plans.push({ id:'p1', assessment_id:a.id, versions:[{ n:1, status:'draft', fields:{}, tasks:[], asks:[] }] });
  CPV.open(a.id); await sleep(80);
  const ct=document.getElementById('cpvRoot').innerText;
  ok('the care plan screen shows "If something goes wrong" with Betty\'s details', /If something goes wrong/.test(ct) && /Do not lift her/.test(ct));
  CPV.close();
  const all=[...document.querySelectorAll('#hvRoot,#cpvRoot')].map(x=>x.innerText).join(' ')+et+et2;
  ok('no "AI" words and no em dashes', !/\bAI\b/.test(all) && !all.includes('—'));
  ok('nothing sent (no draft until Finish)', !L.drafts.length);
  }catch(e){ R.push(['FAIL','the walk-through stopped: '+e.message, (e.stack||'').split('\n')[1]]); }
  return R;
}
"""
MIME = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.json':'application/json', '.webmanifest':'application/json'}
def serve(route):
    url = route.request.url
    if 'supabase.co' in url: return route.abort()
    if not url.startswith('http://hv.local/'): return route.continue_()
    p = (ROOT / url.split('http://hv.local/', 1)[1].split('?')[0].split('#')[0])
    if not p.is_file(): return route.fulfill(status=404, body='')
    route.fulfill(status=200, body=p.read_bytes(), content_type=MIME.get(p.suffix, 'application/octet-stream'))
def overflow(pg):
    return pg.evaluate("()=>{ const r=document.getElementById('hvRoot'); if(!r) return 'none'; const w=r.clientWidth; return [...r.querySelectorAll('*')].filter(e=>{ const b=e.getBoundingClientRect(); return b.width>0 && b.right>w+1 && !e.closest('.hv-rail'); }).slice(0,4).map(e=>e.className+' '+Math.round(e.getBoundingClientRect().right)); }")
with sync_playwright() as pw:
    b = pw.chromium.launch(); cx = b.new_context(viewport={'width': 1180, 'height': 820}, timezone_id='America/Chicago', has_touch=True); pg = cx.new_page()
    pg.route('**/*', serve)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://hv.local/index.html?proof=stage2'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T)
    pg.evaluate("async()=>{ await HV.open({ leadId:'lead_betty' }); }"); pg.wait_for_timeout(200)
    for w, h, name in [(1180, 820, 'iPad (1180 wide)'), (820, 1180, 'iPad upright (820 wide)'), (390, 844, 'phone (390 wide)')]:
        pg.set_viewport_size({'width': w, 'height': h}); pg.wait_for_timeout(120)
        for i, nm in [(3, 'Daily activities'), (4, 'Home and safety'), (6, 'Schedule')]:
            pg.evaluate(f"()=>document.querySelector('#hvRoot [data-hvs=\"{i}\"]').click()"); pg.wait_for_timeout(120)
            o = overflow(pg); R.append(['PASS' if not o else 'FAIL', f'{name}, {nm}: nothing runs off the side', o])
            if SHOTS:
                os.makedirs(SHOTS, exist_ok=True); pg.screenshot(path=os.path.join(SHOTS, f's2-{w}-{i}.png'))
        pg.evaluate("()=>document.querySelector('#hvRoot [data-hva=\"needs\"]').click()"); pg.wait_for_timeout(100)
        o = overflow(pg); R.append(['PASS' if not o else 'FAIL', f'{name}, Still needs attention list: nothing runs off the side', o])
        if SHOTS: pg.screenshot(path=os.path.join(SHOTS, f's2-{w}-needs.png'))
        pg.evaluate("()=>document.querySelector('#hvRoot [data-hva=\"needs\"]').click()")
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

"""Home visit: pre-filled from the phone calls (2026-10-29, her "yes, build the phone call pre-fill: blue boxes plus the
reminder cards"). The real Hub page, offline, made-up families. Proves: a visit for a lead filled from a call gets the call's
allergies, named health conditions, walker or wheelchair and short goals in EMPTY boxes, in blue, once; a typed box is never
changed; opening again does not fill again; a finished visit is never filled; a lead typed in by hand (no call) gets nothing
and no cards; the longer things the call said (why now, living situation, health, medicines, safety, daily living, around the
home) show as a From the phone call card on Their story, Health and Daily activities, saying who said it; people named on the
call can be added to who's here with one tap; typing in a blue box or tapping the call's pill takes the blue away; the After
screen never offers the reader a box the call filled; nothing is sent; no "AI" and no em dashes; it fits an iPad and a phone.
(python3 tests/browser/call_fill_look.py; SHOTS=<dir> saves screenshots)"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = os.environ.get('SHOTS')
STUB = r"""
(()=>{
  const W=window; W.__log={ persists:[], invokes:[], bodies:[], fetches:[] };
  const of=W.fetch; W.fetch=(u,o)=>{ W.__log.fetches.push(String(u)); return of(u,o); };
  (0,eval)(`sb={ from:()=>{ const p={ select(){return p;}, eq(){return p;}, gte(){return p;}, in(){return p;}, order(){return p;}, limit(){return p;}, is(){return p;},
      single:async()=>({ data:null, error:null }), maybeSingle:async()=>({ data:null, error:null }),
      then(a){ return Promise.resolve({data:[{ id:'r1', status:'done', consent_given:true, part:1, seconds:600, offset_seconds:0 }],error:null}).then(a); } }; return p; },
    storage:{ from:()=>({ upload:async()=>({ error:null }) }) }, rpc:async()=>({data:null,error:null}),
    functions:{ invoke:async(n,o)=>{ window.__log.invokes.push(n); window.__log.bodies.push(JSON.parse(JSON.stringify((o||{}).body||{}))); return { data:{ ok:true, at:'2026-10-30T17:00:00Z', summary:'s', voices:[], fills:[], missed:[] }, error:null }; } },
    auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };
    ME={ email:'krystal@mo-care.com', name:'Krystal Land' }; CC_ROLES=['owner_admin']; CC_ROLES_CHECKED=true;
    persist=async(k,v)=>{ window.__log.persists.push([k, JSON.parse(JSON.stringify(v))]); };
    tkMerge=async()=>({}); ccConfirm=async()=>true; ccToast=(m)=>{ window.__log.toast=m; };`);
  DATA.ops_settings={}; DATA.care_assessments=[]; DATA.care_plans=[]; DATA.client_profiles=[];
  const call={ id:'lead_betty', first_name:'Karen', last_name:'Price (fake)', relationship:'Daughter', phone:'(417) 555-0172', client_first_name:'Betty', client_last_name:'Harlow (fake)',
    reason:'Fall in the bathroom Oct 12', funding_source:'private', status:'Contacted', mobility:'walker', medical_conditions:['dementia','diabetes','stroke'], personal_care:['bathing','dressing'],
    medical_notes:'Oxygen at night. Hospital stay in September.',
    from_calls:[{ message_id:'m1', at:'2026-10-20T15:00:00Z' }],
    call_profile:{ said_by:'Karen Price (fake)', facts:{ allergies:'Penicillin (hives)', living_situation:'alone', why_now:['fall','memory_worse'] },
      people:[{ name:'Karen Price (fake)', relationship:'Daughter' }, { name:'Mike Harlow (fake)', relationship:'Son', note:'lives in Ozark' }, { name:'Dr. Reyes (fake)', relationship:'Doctor' }] },
    care_plan_draft:{ fields:{ client_goals:'Stay at home. Eat a real lunch every day. Get back to church on Wednesdays.', adl_needs:'Needs stand-by help in the shower since the fall; slow with buttons.',
      iadl_needs:'Meals, light housekeeping, rides to church on Wednesdays.', medications:'Metformin, donepezil, a blood pressure pill.', safety_concerns:'Fell in the shower Oct 12; unsteady in the afternoon.',
      medical_conditions:'Early dementia, type 2 diabetes, a small stroke in 2021.' } } };
  const typed={ id:'lead_typed', first_name:'Ann', last_name:'Lee (fake)', relationship:'Self', client_first_name:'Ann', client_last_name:'Lee (fake)', status:'Contacted', mobility:'wheelchair', medical_conditions:['copd'] };
  const halfway={ id:'lead_half', first_name:'Joe', last_name:'Dunn (fake)', relationship:'Son', client_first_name:'Ruth', client_last_name:'Dunn (fake)', status:'Assessment Scheduled',
    from_calls:[{ message_id:'m9' }], mobility:'wheelchair', medical_conditions:['parkinsons'],
    call_profile:{ facts:{ allergies:'Sulfa' }, people:[] }, care_plan_draft:{ fields:{ client_goals:'Keep her out of the nursing home and keep her safe at night while Joe is at work in Branson all week long and cannot drive up.' } } };
  DATA.leads=[call, typed, halfway];
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,900)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, q=s=>document.querySelector('#hvRoot '+s), qa=s=>[...document.querySelectorAll('#hvRoot '+s)];
  const sec=i=>q('.hv-sec[data-sec="'+i+'"]'); const f0=L.fetches.length;
  const blue=p=>{ const el=q('[data-hv="'+p+'"]'); return !!el && el.classList.contains('hv-from'); };
  await HV.open({ leadId:'lead_betty' }); await sleep(200);
  let a=HV._st.a, v=a.visit;
  ok('allergies from the call, in blue', v.allergies==='Penicillin (hives)' && blue('visit.allergies'));
  ok("the call's named conditions fill the empty condition rows (a third row added), in blue", v.conditions.map(c=>c.name).join('|')==="Dementia|Diabetes|Stroke" && blue('visit.conditions.0.name') && blue('visit.conditions.2.name') && qa('.hv-cond:not(.hv-th)').length===3, v.conditions);
  const wk=q('[data-hvp="visit.equipment"][data-v="Walker"]');
  ok('walker from the call: the Walker button is on, with the blue ring', v.equipment.join()==='Walker' && wk.classList.contains('on') && wk.classList.contains('hv-pfrom'));
  ok('short goals from the call go into the three goal boxes, in blue', v.goals.map(g=>g.text).join('|')==='Stay at home.|Eat a real lunch every day.|Get back to church on Wednesdays.' && blue('visit.goals.1.text'));
  ok('filled once, saved', !!v.call_filled_at && L.persists.some(x=>x[0]==='care_assessments' && x[1].visit && x[1].visit.call_filled_at));
  const st=sec(2).innerText, he=sec(5).innerText, da=sec(4).innerText+'\n'+sec(6).innerText;
  ok('Their story: a From the phone call card with why now and living situation, saying who said it; goals not repeated (they are in the boxes)', /From the phone call/.test(st) && /Why now\s*a fall, memory getting worse/.test(st) && /Lives alone/.test(st) && /Said by Karen Price \(fake\), Daughter/.test(st) && !/What they hope for/.test(st), st.slice(0,600));
  ok('Health: the card has the health, medicines, other details and safety the call described', /From the phone call/.test(he) && /type 2 diabetes/.test(he) && /Metformin, donepezil/.test(he) && /Oxygen at night/.test(he) && /unsteady in the afternoon/.test(he), he.slice(0,700));
  ok('Around the house + Personal care: the cards have the help asked for, daily living and around the home', /Asked for help with\s*Bathing, Dressing/.test(da) && /stand-by help in the shower/.test(da) && /rides to church/.test(da), da.slice(0,700));
  ok('the levels of need are left for the coordinator to tap (nothing ticked from the call)', !qa('.hv-sec[data-sec="4"] .hv-act .hv-seg button.on, .hv-sec[data-sec="6"] .hv-seg button.on').length);
  const cp=sec(0).innerText;
  ok("people named on the call (not already here) offered with one tap; the caller isn't repeated", /Named on the phone call/.test(cp) && qa('[data-hva="addcallperson"]').map(b=>b.innerText).join('|')==='+ Mike Harlow (fake), Son|+ Dr. Reyes (fake), Doctor', qa('[data-hva="addcallperson"]').map(b=>b.innerText));
  q('[data-hva="addcallperson"][data-v="Mike Harlow (fake)"]').click(); await sleep(50);
  ok('...tap: Mike is added to who is here, as family with his relationship, and leaves the list', v.attendees.some(p=>p.name==='Mike Harlow (fake)' && p.rel==='Son' && p.role==='family') && qa('[data-hva="addcallperson"]').length===1);
  const al=q('[data-hv="visit.allergies"]'); al.value='Penicillin (hives), sulfa'; al.dispatchEvent(new Event('input',{bubbles:true}));
  ok('typing in a blue box makes it theirs: the blue goes, and stays gone', !al.classList.contains('hv-from') && !(v.from_call||{})['visit.allergies']);
  wk.click(); await sleep(20);
  ok('tapping the call\'s Walker button is a person deciding: the ring goes', !wk.classList.contains('hv-pfrom') && !(v.from_call||{})['visit.equipment:Walker']);
  /* the After screen never offers a box the call filled */
  q('[data-hvs="11"]').click(); await sleep(250); q('[data-hva="readrec"]').click(); await sleep(250);
  const paths=((L.bodies[0]||{}).fields||[]).map(f=>f.path);
  ok("the After screen's reader is never offered a box the call filled", paths.length>20 && !paths.includes('visit.conditions.0.name') && !paths.includes('visit.goals.0.text') && !paths.includes('visit.allergies'), paths.slice(0,8));
  await HV.close(); await sleep(50);
  /* opening again does not fill again */
  v.conditions[1].name=''; await HV.open({ id:a.id }); await sleep(150);
  ok('opening again does not fill again (an emptied box stays empty)', HV._st.a.visit.conditions[1].name==='');
  await HV.close(); await sleep(50);
  /* a lead typed in by hand */
  await HV.open({ leadId:'lead_typed' }); await sleep(150);
  v=HV._st.a.visit;
  ok('a lead typed in by hand (no call): nothing pre-filled from it, no From the phone call cards', !v.call_filled_at && !v.equipment.length && !v.conditions.some(c=>c.name) && !/From the phone call/.test(document.getElementById('hvRoot').innerText) && !q('[data-hva="addcallperson"]'));
  await HV.close(); await sleep(50);
  /* a visit started before, with answers typed */
  const pre={ id:'asm_half', lead_id:'lead_half', client_name:'Ruth Dunn (fake)', status:'Scheduled', visit_date:'2026-10-29',
    visit:{ v:1, attendees:[{ name:'Ruth Dunn (fake)', rel:'Client', role:'client' }], allergies:'None known', conditions:[{ name:"Parkinson's", onset:'2019' }], goals:[{ text:'Stay home' }, { text:'' }, { text:'' }], equipment:[] } };
  DATA.care_assessments.push(pre);
  await HV.open({ id:'asm_half' }); await sleep(150);
  v=HV._st.a.visit;
  ok('a visit already started: typed answers are never changed (allergies, goals); the same condition is not added twice; the wheelchair is added', v.allergies==='None known' && v.goals[0].text==='Stay home' && v.conditions.filter(c=>/parkinson/i.test(c.name||'')).length===1 && v.equipment.join()==='Wheelchair', v);
  ok('...a long hope from the call is not squeezed into a goal box: it shows on the card instead', /What they hope for\s*Keep her out of the nursing home/.test(sec(2).innerText) && !v.goals_from_call);
  await HV.close(); await sleep(50);
  DATA.care_assessments.find(x=>x.id==='asm_half').visit.finished_at='2026-10-29T20:00:00Z';
  DATA.care_assessments.push({ id:'asm_done', lead_id:'lead_betty', client_name:'x', status:'Completed', visit:{ v:1, attendees:[], finished_at:'2026-10-01T00:00:00Z', allergies:'', conditions:[{},{}], goals:[{},{},{}], equipment:[] } });
  await HV.open({ id:'asm_done' }); await sleep(150);
  ok('a finished visit is never filled', HV._st.a.visit.allergies==='' && !HV._st.a.visit.call_filled_at);
  await HV.close(); await sleep(50);
  const all=[...document.querySelectorAll('.hv-callc')].map(x=>x.innerText).join(' ');
  ok('nothing sent except the reader tapped on the After screen (the Care tab only reads its packet card on close); nothing texted or emailed', L.invokes.join()==='visit-review' && !L.fetches.slice(f0).filter(u=>!/functions\/v1\/care-packet$/.test(u)).some(u=>/functions\/v1|sms|mail/.test(u)), [L.invokes, L.fetches.slice(f0)]);
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
    return pg.evaluate("()=>{ const r=document.getElementById('hvRoot'); if(!r) return 'no visit'; const w=r.clientWidth; return [...r.querySelectorAll('*')].filter(e=>{ const b=e.getBoundingClientRect(); return b.width>0 && b.right>w+1 && !e.closest('.hv-rail'); }).slice(0,4).map(e=>e.className+' '+Math.round(e.getBoundingClientRect().right)); }")
with sync_playwright() as pw:
    b = pw.chromium.launch(); cx = b.new_context(viewport={'width': 1180, 'height': 820}, timezone_id='America/Chicago', has_touch=True); pg = cx.new_page()
    pg.route('**/*', serve)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://hv.local/index.html?proof=callfill'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T)
    pg.evaluate("async()=>{ DATA.care_assessments=[]; await HV.open({ leadId:'lead_betty' }); }"); pg.wait_for_timeout(300)
    txt = pg.evaluate("()=>document.getElementById('hvRoot').innerText")
    R.append(['PASS' if ('—' not in txt and not __import__('re').search(r'\bAI\b', txt)) else 'FAIL', 'no "AI" words and no em dashes on the visit screens', ''])
    for w, h, name in [(1180, 820, 'iPad (1180 wide)'), (820, 1180, 'iPad upright (820 wide)'), (390, 844, 'phone (390 wide)')]:
        pg.set_viewport_size({'width': w, 'height': h}); pg.wait_for_timeout(120)
        for i in [0, 2, 5, 4, 6]:
            pg.evaluate(f"()=>document.querySelector('#hvRoot [data-hvs=\"{i}\"]').click()"); pg.wait_for_timeout(100)
            o = overflow(pg); R.append(['PASS' if not o else 'FAIL', f'{name}, screen {i+1}: nothing runs off the side', o])
            if SHOTS:
                os.makedirs(SHOTS, exist_ok=True); pg.screenshot(path=os.path.join(SHOTS, f'call-{w}-{i+1}.png'))
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

"""Home visit: Caregiver and contact preferences (2026-10-29, her "fix caregiver and contact preferences to reflect what we
currently ask ... based on the hubs and the client assessment packets"). The real Hub page, offline, made-up families. Proves:
the caregiver questions use the Hub's own choices (gender required or preferred, Spanish required or preferred, the match
skill list, cats, dogs, smoking) and the paper form's group text, check-ins, surveys and personality are gone; what the lead
already holds comes in once, in blue (a legacy "yes" for a female caregiver reads as preferred, as on the lead); How we stay in
touch has one block per person in the room with the agreement's questions (roles, best way and time, the two texts, may we
discuss care), the client without roles or permission; a person added on Start the visit shows up; answers save on the
person; the After screen's reader is offered the new boxes; it fits an iPad and a phone; no "AI" and no em dashes.
(python3 tests/browser/visit_prefs_look.py; SHOTS=<dir> saves screenshots)"""
import os, sys, re, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = os.environ.get('SHOTS')
STUB = r"""
(()=>{
  const W=window; W.__log={ persists:[], invokes:[], bodies:[] };
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
  DATA.leads=[{ id:'lead_betty', first_name:'Karen', last_name:'Price (fake)', relationship:'Daughter', phone:'(417) 555-0172', client_first_name:'Betty', client_last_name:'Harlow (fake)', status:'Contacted',
      gender_pref_normalized:true, client_attributes:{ female_caregiver:'yes', spanish_speaking:'preferred', dogs:'yes', cats:'no', dementia:'yes', hoyer_lift:'no' } },
    { id:'lead_old', first_name:'Joe', last_name:'Dunn (fake)', relationship:'Son', client_first_name:'Ruth', client_last_name:'Dunn (fake)', status:'Contacted', client_attributes:{ female_caregiver:'yes' } }];
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,900)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, q=s=>document.querySelector('#hvRoot '+s), qa=s=>[...document.querySelectorAll('#hvRoot '+s)];
  const opts=p=>qa('[data-hvp="'+p+'"]').map(b=>b.innerText.trim());
  await HV.open({ leadId:'lead_betty' }); await sleep(200);
  const a=HV._st.a, v=a.visit;
  q('[data-hvs="7"]').click(); await sleep(80);
  const t=q('.hv-sec[data-sec="7"]').innerText;
  ok('caregiver gender: the Hub\'s five choices (required or preferred)', opts('visit.prefs.gender').join('|')==='Female, required|Female, preferred|Male, required|Male, preferred|No preference', opts('visit.prefs.gender'));
  ok('Spanish-speaking caregiver: Required, Preferred, No', opts('visit.prefs.spanish').join('|')==='Required|Preferred|No');
  ok("skills: the Hub's match skill names (dementia, Parkinson's, gait belt, Hoyer, bedbound, hospice, catheter, ostomy, driving)", opts('visit.prefs.skills').length===9 && opts('visit.prefs.skills').includes("Dementia or Alzheimer's care") && opts('visit.prefs.skills').includes('A Hoyer or other mechanical lift'), opts('visit.prefs.skills'));
  ok('cats and dogs in the home, yes or no; smoking is asked once, on the safety check, and shown here', ['cats','dogs'].every(k=>opts('visit.prefs.'+k).join('|')==='Yes|No') && opts('visit.prefs.smoking').length===2 && !q('.hv-sec[data-sec="7"] [data-hvp="visit.prefs.smoking"]') && /Asked on the safety check/.test(t));
  ok('the paper form\'s group text, check-ins, surveys and personality are gone', !/group text|check-ins|Surveys|Personality they/i.test(t), t.slice(0,800));
  const on=(p,val)=>q('[data-hvp="'+p+'"][data-v="'+val+'"]');
  ok('from the lead, in blue: Female required (the lead says required), Spanish preferred, dogs yes, cats no, dementia care', v.prefs.gender==='female_required' && on('visit.prefs.gender','female_required').classList.contains('hv-pfrom')
    && v.prefs.spanish==='preferred' && v.prefs.dogs==='yes' && v.prefs.cats==='no' && v.prefs.skills.join()==='dementia_care' && on('visit.prefs.skills','dementia_care').classList.contains('on'), v.prefs);
  ok('...a "no" Hoyer on the lead adds nothing', !v.prefs.skills.includes('hoyer_lift'));
  const blocks=qa('#hvTouch .hv-touch');
  ok('How we stay in touch: one block per person in the room (Betty, Karen)', blocks.length===2 && /Betty Harlow/.test(blocks[0].innerText) && /Karen Price/.test(blocks[1].innerText));
  ok('...the client has no roles and no "may we discuss care" (it is their own care)', !blocks[0].querySelector('[data-hvp$=".roles"]') && !blocks[0].querySelector('[data-hvp$=".permission"]'));
  ok("...Karen: the agreement's roles, Primary contact already on", opts('visit.attendees.1.roles').join('|')==='Primary contact|Medical decisions|Health care POA|Financial POA|Billing|Emergency contact' && on('visit.attendees.1.roles','primary').classList.contains('on'));
  ok('...best way Call / Text / Email, best time, texts for caregiver changes and running late', opts('visit.attendees.1.reach_way').join('|')==='Call|Text|Email' && !!q('[data-hv="visit.attendees.1.reach_time"]') && opts('visit.attendees.1.texts').join('|')==='Caregiver changes|Running late');
  on('visit.attendees.1.roles','poa_health').click(); on('visit.attendees.1.reach_way','text').click(); on('visit.attendees.1.texts','late').click(); on('visit.attendees.1.permission','yes').click();
  const bt=q('[data-hv="visit.attendees.1.reach_time"]'); bt.value='After 3 pm'; bt.dispatchEvent(new Event('input',{bubbles:true})); await sleep(1400);
  const k=v.attendees[1];
  ok("answers save on Karen herself", k.roles.join()==='primary,poa_health' && k.reach_way==='text' && k.texts.join()==='late' && k.permission==='yes' && k.reach_time==='After 3 pm', k);
  ok('...and are saved to the assessment', L.persists.some(x=>x[0]==='care_assessments' && (x[1].visit.attendees[1].roles||[]).includes('poa_health')));
  q('[data-hvs="0"]').click(); q('[data-hva="addperson"]').click(); await sleep(30);
  const nm=q('[data-hv="visit.attendees.2.name"]'); nm.value='Mike Harlow (fake)'; nm.dispatchEvent(new Event('input',{bubbles:true}));
  q('[data-hvs="7"]').click(); await sleep(50);
  ok('a person added on Start the visit shows up here', qa('#hvTouch .hv-touch').length===3 && /Mike Harlow/.test(q('#hvTouch').innerText));
  q('[data-hvs="11"]').click(); await sleep(200); q('[data-hva="readrec"]').click(); await sleep(200);
  const paths=((L.bodies[0]||{}).fields||[]).map(f=>f.path);
  ok("the After screen's reader is offered the new boxes (smoking, other, each person's best way), never the old ones", paths.includes('visit.prefs.smoking') && paths.includes('visit.prefs.other') && paths.includes('visit.attendees.2.reach_way') && !paths.some(p=>/group_text|checkin_to|survey_by|personality|change_to/.test(p)) && !paths.includes('visit.prefs.gender'), paths.filter(p=>/prefs|attendees/.test(p)));
  await HV.close(); await sleep(50);
  await HV.open({ leadId:'lead_old' }); await sleep(150);
  ok('an older lead where "yes" means prefer: Female, preferred', HV._st.a.visit.prefs.gender==='female_preferred');
  await HV.close(); await sleep(50);
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
    pg.goto('http://hv.local/index.html?proof=prefs'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T)
    pg.evaluate("async()=>{ DATA.care_assessments=[]; await HV.open({ leadId:'lead_betty' }); document.querySelector('#hvRoot [data-hvs=\"7\"]').click(); }"); pg.wait_for_timeout(300)
    txt = pg.evaluate("()=>document.querySelector('#hvRoot .hv-sec[data-sec=\"7\"]').innerText")
    R.append(['PASS' if ('—' not in txt and not re.search(r'\bAI\b', txt)) else 'FAIL', 'no "AI" words and no em dashes on the screen', ''])
    for w, h, name in [(1180, 820, 'iPad (1180 wide)'), (820, 1180, 'iPad upright (820 wide)'), (390, 844, 'phone (390 wide)')]:
        pg.set_viewport_size({'width': w, 'height': h}); pg.wait_for_timeout(150)
        o = overflow(pg); R.append(['PASS' if not o else 'FAIL', f'{name}, Preferences: nothing runs off the side', o])
        if SHOTS:
            os.makedirs(SHOTS, exist_ok=True); pg.screenshot(path=os.path.join(SHOTS, f'prefs-{w}.png'), full_page=True)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

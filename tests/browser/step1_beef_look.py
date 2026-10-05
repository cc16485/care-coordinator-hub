"""458 · the Step 1 application on the caregiver page, and Beef it up in the profile panel (Samantha, 2026-10-05). The real page,
offline, made-up people; every server answer is faked; saves are recorded, never sent. (python3 tests/browser/step1_beef_look.py)"""
from playwright.sync_api import sync_playwright
H = open('/Users/samantha/Claude/Projects/cc-hub-live/.claude/g1a_harness.js').read()
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  window.confirm=()=>true;
  const FACTS={ own_words:{ interest:'I love hearing their stories.', qualities:'Patient and on time.', why_us:null, conversation:'yes', hobbies:'Gardening and baking' },
    experience:{ jobs:[{ title:'CNA', from:'2019', to:'2023', duties:'Bathing and meals' }], education:{ highest:'high school', subject:null, graduated:'yes' } },
    matching:{ services:['companionship','dementia_care'], hospice:'yes', cats:'no', dogs:'yes', client_smokes:'no', travel_miles:25, basic_meal:'yes', daily_living_help:'with training', smoker:'no' },
    availability:{ start_date:'Oct 15', full_or_part:'part-time', hours_ideal:25, hours_min:15, hours_max:32, shifts:['mornings','weekends'], days:{ monday:'8:00-14:00' }, overnight_days:{} },
    favorites:{ candy_bar:'Snickers', restaurant:'Olive Garden' } };
  window.__ROW={ id:'g1', axiscare_id:'5', first_name:'Grace', last_name:'Hill', self_complete:true, about:'I am from Ozark.', experience:'I took care of my grandma.', why_this_work:'I like helping.',
    photo_path:'g1/photo-1.jpg', video_path:null, consent:true, published:false, status:'new', updated_at:new Date().toISOString() };
  window.__UP=[]; window.__FN=[];
  (0,eval)(`sb.from=(t)=>{ let patch=null; const f={}; const b={ select(){return b;}, neq(){return b;}, in(){return b;}, eq(c,v){ f[c]=v; return b; }, order(){return b;}, limit(){return b;}, is(){return b;}, ilike(){return b;},
      update(p){ patch=p; return b; },
      then(ok){ if(patch){ window.__UP.push(patch); Object.assign(window.__ROW, patch); return Promise.resolve({ data:null, error:null }).then(ok); }
        if(t==='caregiver_application_facts') return Promise.resolve({ data: (f.hub_caregiver_id==='77'||f.axiscare_id==='5') ? [{ facts: window.__FACTS, extracted_at:new Date().toISOString(), pages:9 }] : [], error:null }).then(ok);
        return Promise.resolve({ data: t==='caregiver_profiles' ? [Object.assign({}, window.__ROW)] : [], error:null }).then(ok); } }; return b; };
    sb.auth.getSession=async()=>({data:{session:{access_token:'t'}}});`);
  window.__FACTS=FACTS;
  const F0=window.fetch; window.fetch=async(u,o)=>{ const url=String(u);
    if(/functions\/v1\/caregiver-profile$/.test(url)){ const bd=JSON.parse(o.body); window.__FN.push(bd);
      if(bd.action==='enhance') return new Response(JSON.stringify({ ok:true, step1_found:true, application_found:true, suggestion:{ about:"I'm from Ozark and I love gardening and baking.", experience:'I took care of my grandma, and I worked as a CNA from 2019 to 2023.', why:'I like helping.' } }),{status:200}); }
    return F0(u,o); };
  /* ── the Step 1 section ── */
  const s1=document.createElement('div'); document.body.appendChild(s1);
  await S1.render(s1,{ axiscare_id:'5', hub_id:'77' }); const t=s1.innerText;
  ok('Step 1 section: their own words, experience, matching, availability, favorites', /IN THEIR OWN WORDS/.test(t) && /I love hearing their stories\./.test(t) && /Gardening and baking/.test(t)
     && /CNA\s+2019 to 2023/.test(t) && /Education: High school/.test(t) && /Dementia and Alzheimer's care/.test(t) && /Clients on hospice: Yes/.test(t) && /Will travel up to 25 miles/.test(t)
     && /Can start: Oct 15/.test(t) && /Part-time/.test(t) && /ideal 25, minimum 15, maximum 32/.test(t) && /Monday\s+8:00-14:00/.test(t) && /Candy bar: Snickers/.test(t), t);
  ok('...the office-only parts say so; it says nothing private is kept and the PDF stays in GoHighLevel', (t.match(/For the office only/g)||[]).length===3 && /For thank-yous\. For the office only\./.test(t) && /nothing private/.test(t) && /The PDF stays in GoHighLevel/.test(t));
  const s2=document.createElement('div'); document.body.appendChild(s2); await S1.render(s2,{ axiscare_id:'999', hub_id:'1' });
  ok('no Step 1 application read yet: says so', /No Step 1 application has been read for them yet/.test(s2.innerText));
  /* ── Beef it up ── */
  const d=document.createElement('div'); document.body.appendChild(d);
  await CGP2.mount(d,{ mode:'employee', axiscare_id:'5', first:'Grace', last:'Hill', phone:'4175550111', email:'grace@example.com' });
  const k=d.getAttribute('data-cgp');
  document.getElementById(k+'-why_this_work').value='I like helping people. (typed, not saved)';
  const bb=[...d.querySelectorAll('button')].find(b=>/Beef it up with AI/.test(b.textContent)); ok('the panel has "Beef it up with AI"', !!bb);
  bb.click(); await sleep(400);
  const e=window.__FN.find(x=>x.action==='enhance');
  ok('it asks the server for a fuller version (with their phone and email for the application lookup)', e && e.profile_id==='g1' && e.phone==='4175550111', window.__FN);
  ok('side by side: theirs now and the fuller one, per section; it says it used their Step 1 application', /A fuller version/.test(d.innerText) && /their Step 1 application/.test(d.innerText) && (d.innerText.match(/THEIRS NOW/g)||[]).length===3 && /worked as a CNA from 2019 to 2023/.test(d.innerText), d.innerText.slice(0,900));
  ok('what the office typed but had not saved is kept (and compared as "theirs now")', document.getElementById(k+'-why_this_work').value==='I like helping people. (typed, not saved)' && /typed, not saved/.test(d.innerText));
  ok('nothing is saved yet', window.__UP.length===0);
  const use=[...d.querySelectorAll('button')].filter(b=>/Use this/.test(b.textContent)); use[1].click(); await sleep(100);
  ok('Use this puts the fuller words in that box only', /worked as a CNA/.test(document.getElementById(k+'-experience').value) && document.getElementById(k+'-about').value==='I am from Ozark.' && window.__UP.length===0);
  [...d.querySelectorAll('button')].find(b=>/💾 Save/.test(b.textContent)).click(); await sleep(400);
  ok('Save keeps it (and the typed edit)', window.__UP.length===1 && /worked as a CNA/.test(window.__UP[0].experience) && /typed, not saved/.test(window.__UP[0].why_this_work), window.__UP);
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page()
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=step1'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', H)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

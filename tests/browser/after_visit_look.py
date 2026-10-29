"""Home visit, stage 3 (2026-10-29): the After the visit screen. The real Hub page, offline, a made-up family, a pretend
reader. Proves: the 8th step sits apart at the bottom of the rail; it says how many parts were recorded and written out and
calls nothing until someone taps Read the recording; the reader is sent only the EMPTY boxes (a typed box is never offered),
the people in the room and what is already on the form; nothing goes into the form until Keep; Keep writes into the box in
yellow, an edit before Keep is what is kept, a choice lights its pill in yellow and tapping another pill clears the yellow;
a box someone typed in meanwhile stays as typed; Not right leaves the form alone and Undo brings the answer back; Keep all
fills the rest, including a new health condition row; changing who a voice is changes who it says said it; Hear it plays that
part from just before the moment; reading again keeps what was kept; an error says so and changes nothing; no recording says
so; it fits an iPad, upright and a phone; no "AI" words and no em dashes on the screen.
(python3 tests/browser/after_visit_look.py; SHOTS=<dir> saves screenshots)"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = os.environ.get('SHOTS')
STUB = r"""
(()=>{
  const W=window; W.__log={ persists:[], invokes:[], bodies:[], signed:[], fetches:[] };
  const of=W.fetch; W.fetch=(u,o)=>{ W.__log.fetches.push(String(u)); return of(u,o); };
  W.__recs=[{ id:'r1', kind:'assessment', status:'done', consent_given:true, part:1, seconds:600, offset_seconds:0, storage_path:'assessment/x/g/001.webm' },
            { id:'r2', kind:'assessment', status:'done', consent_given:true, part:2, seconds:310, offset_seconds:598, storage_path:'assessment/x/g/002.webm' }];
  W.__answer=null;
  (0,eval)(`sb={ from:(t)=>{ const f=[]; const p={ select(){return p;}, eq(c,v){f.push([c,v]);return p;}, gte(){return p;}, in(){return p;}, order(){return p;}, limit(){return p;}, is(){return p;},
      single:async()=>({ data:null, error:null }),
      maybeSingle:async()=>{ if(t==='recordings'){ const id=(f.find(x=>x[0]==='id')||[])[1]; return { data:(window.__recs.find(r=>r.id===id)||null), error:null }; } return { data:null, error:null }; },
      then(a){ const d = t==='recordings' ? window.__recs.slice() : []; return Promise.resolve({data:d,error:null}).then(a); } }; return p; },
    storage:{ from:()=>({ upload:async()=>({ error:null }), createSignedUrl:async(path)=>{ window.__log.signed.push(path); return { data:{ signedUrl:'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=#'+path }, error:null }; } }) },
    rpc:async()=>({data:null,error:null}),
    functions:{ invoke:async(n,o)=>{ window.__log.invokes.push(n); window.__log.bodies.push(JSON.parse(JSON.stringify((o||{}).body||{}))); const a=window.__answer; if(a && a.fail) return { data:null, error:{ message:'Edge Function returned a non-2xx status code', context:{ json:async()=>({ error:a.fail }) } } }; return { data:a, error:null }; } },
    auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };
    ME={ email:'krystal@mo-care.com', name:'Krystal Land' }; CC_ROLES=['owner_admin']; CC_ROLES_CHECKED=true;
    persist=async(k,v)=>{ window.__log.persists.push([k, JSON.parse(JSON.stringify(v))]); };
    tkMerge=async()=>({}); window.__asks=[]; ccConfirm=async(m)=>{ window.__asks.push(m); return true; }; ccToast=(m)=>{ window.__log.toast=m; };`);
  try{ HTMLMediaElement.prototype.play=function(){ window.__log.played={ src:this.src, t:this.currentTime }; return Promise.resolve(); }; }catch(e){}
  DATA.ops_settings={}; DATA.care_assessments=[]; DATA.care_plans=[]; DATA.client_profiles=[];
  DATA.leads=[{ id:'lead_betty', first_name:'Karen', last_name:'Price (fake)', relationship:'Daughter', phone:'(417) 555-0172',
    client_first_name:'Betty', client_last_name:'Harlow (fake)', reason:'Fall in the bathroom Oct 12', funding_source:'private', status:'Assessment Scheduled' }];
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,900)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, q=s=>document.querySelector('#hvRoot '+s), qa=s=>[...document.querySelectorAll('#hvRoot '+s)];
  const type=(path,val)=>{ const el=q('[data-hv="'+path+'"]'); el.value=val; el.dispatchEvent(new Event('input',{bubbles:true})); };
  await HV.open({ leadId:'lead_betty' }); await sleep(200);
  const a=HV._st.a;
  type('visit.story.morning','Up about 7, coffee'); type('visit.allergies','');
  const rail=qa('#hvRail [data-hvs]').map(b=>b.innerText.replace(/\s+/g,' ').trim());
  ok('9 steps; After the visit is the 9th, set apart at the bottom above Close', rail.length===9 && rail[8]==='9 After the visit' && q('#hvRail [data-hvs="8"]').previousElementSibling.classList.contains('hv-gap'), rail);
  q('[data-hvs="8"]').click(); await sleep(300);
  const top=q('#hvAfterRec').innerText;
  ok('the recording: 2 parts, about 15 minutes, all written out, and a Read the recording button', /2 parts/.test(top) && /about 15 minutes/.test(top) && /All written out/.test(top) && q('[data-hva="readrec"]') && q('[data-hva="readrec"]').innerText==='Read the recording', top);
  ok('opening the screen calls nothing (reading only happens on a tap)', L.invokes.length===0);
  ok('the footer offers Close, not Finish', q('#hvFoot [data-hva="close"]') && !q('#hvFoot [data-hva="finish"]'));
  window.__answer={ ok:true, at:'2026-10-30T17:14:00Z', by:'Krystal Land', model:'m', summary:'Betty, 85, lives alone and fell in the shower on Oct 12. The family wants weekday help.',
    voices:[{ label:'P1 Speaker A', person:'Betty Harlow (fake)', sample:"Oh, I'm fine most days, it's just the shower that scares me now.", rec:'r1', part:1, at:5, local:5 },
            { label:'P1 Speaker B', person:'Karen Price (fake)', sample:'Mom, you told me last week you skipped lunch.', rec:'r1', part:1, at:31, local:31 },
            { label:'P2 Speaker A', person:'Unknown', sample:'Can someone come Saturdays too?', rec:'r2', part:2, at:600, local:2 }],
    fills:[{ path:'visit.story.evening', value:'Dinner about 5:30, bed by 9', quote:'dinner about five thirty', rec:'r2', part:2, at:640, local:42, who:'P2 Speaker A' },
           { path:'visit.allergies', value:'Penicillin', quote:'penicillin gives me hives', rec:'r1', part:1, at:200, local:200, who:'P1 Speaker A' },
           { path:'visit.acts.bathing.level', value:'standby', quote:"it's just the shower that scares me", rec:'r1', part:1, at:5, local:5, who:'P1 Speaker A' },
           { path:'visit.story.morning', value:'should never be offered', quote:'x', rec:'r1', part:1, at:1, local:1, who:'P1 Speaker A' },
           { path:'visit.goals.2.text', value:'Eat a real lunch every day', quote:'skipped lunch', rec:'r1', part:1, at:31, local:31, who:'P1 Speaker B' },
           { path:'visit.conditions.2.name', value:'High blood pressure', quote:'my blood pressure', rec:'r2', part:2, at:700, local:102, who:'P2 Speaker A' }],
    missed:[{ title:'Saturday care was not answered', text:'Mike asked about Saturdays. The schedule only has weekdays.', quote:'Saturdays', rec:'r2', part:2, at:600, local:2 },
            { title:'Antibiotic allergy, name not said', text:'Get the name.' }],
    parts:[{rec:'r1',part:1,offset:0},{rec:'r2',part:2,offset:598}], parts_waiting:0, dropped:1 };
  q('[data-hva="readrec"]').click(); await sleep(400);
  const body=L.bodies[0]||{}, paths=(body.fields||[]).map(f=>f.path);
  ok('Read: calls visit-review once with this visit', L.invokes.join()==='visit-review' && body.assessment_id===a.id, L.invokes);
  ok('...sends only EMPTY boxes: the typed Morning box is not offered; Evening, allergies, bathing level, a new condition row are', !paths.includes('visit.story.morning') && paths.includes('visit.story.evening') && paths.includes('visit.allergies') && paths.includes('visit.acts.bathing.level') && paths.includes('visit.conditions.2.name') && !paths.includes('visit.story.trigger'), paths.slice(0,12));
  ok('...a choice box goes with its choices', (body.fields.find(f=>f.path==='visit.acts.bathing.level')||{}).options.map(o=>o[0]).join()==='none,standby,full');
  ok('...with the people in the room and what is already on the form', body.people.map(p=>p.name).join('|')==='Betty Harlow (fake)|Karen Price (fake)' && /Their story: A day at home: morning: Up about 7, coffee/.test(body.known) && body.client==='Betty', [body.people, body.known]);
  ok('the reading is kept on the visit record, nothing in the form yet', a.visit.after && a.visit.after.fills.length===6 && !a.visit.story.evening && !a.visit.allergies && L.persists.some(x=>x[0]==='care_assessments' && x[1].visit.after));
  const txt=q('#hvAfterBody').innerText;
  ok("Who's who: one row per voice label, with a sample line and the reader's guess", qa('.hv-spk').length===3 && /Part 2, Speaker A/.test(txt) && q('[data-hvvoice="P1 Speaker A"]').value==='Betty Harlow (fake)' && q('[data-hvvoice="P2 Speaker A"]').value==='Unknown', txt.slice(0,400));
  ok('Summary and Missed or unclear show; a missed item with a moment has Hear it, one without does not', /fell in the shower/.test(txt) && qa('.hv-miss').length===2 && qa('.hv-miss')[0].querySelector('[data-hva="hear"]') && !qa('.hv-miss')[1].querySelector('[data-hva="hear"]'));
  const mornRow=qa('.hv-fill').find(r=>/A day at home: morning/.test(r.innerText));
  ok('a box someone already typed in: says it stays as typed, no Keep', mornRow && /stays as typed/.test(mornRow.innerText) && !mornRow.querySelector('[data-hva="fillkeep"]'), mornRow && mornRow.innerText);
  ok('heard answers show in yellow with the words heard and who said them', q('[data-hvfill="visit.story.evening"]').classList.contains('hv-heard') && /Heard: "dinner about five thirty" \(Unknown\)/.test(txt), txt.slice(0,900));
  q('[data-hvvoice="P2 Speaker A"]').value='Karen Price (fake)'; q('[data-hvvoice="P2 Speaker A"]').dispatchEvent(new Event('change',{bubbles:true})); await sleep(50);
  ok('changing who a voice is changes who it says said it, and is saved', a.visit.after.names['P2 Speaker A']==='Karen Price (fake)' && /five thirty" \(Karen Price \(fake\)\)/.test(q('#hvAfterBody').innerText));
  /* Keep, with an edit first */
  const al=q('[data-hvfill="visit.allergies"]'); al.value='Penicillin (hives)';
  q('[data-hva="fillkeep"][data-p="visit.allergies"]').click(); await sleep(50);
  ok('Keep writes the (edited) answer into the empty box, in yellow, marked heard', a.visit.allergies==='Penicillin (hives)' && a.visit.heard['visit.allergies'] && document.querySelector('#hvRoot .hv-sec[data-sec="2"] [data-hv="visit.allergies"]').classList.contains('hv-heard') && a.visit.after.marks['visit.allergies']==='kept');
  q('[data-hva="fillkeep"][data-p="visit.acts.bathing.level"]').click(); await sleep(50);
  const seg=document.querySelector('#hvRoot .hv-sec[data-sec="3"] [data-hvp="visit.acts.bathing.level"][data-v="standby"]');
  ok('a kept choice lights its pill, with the row in yellow', a.visit.acts.bathing.level==='standby' && seg.classList.contains('on') && seg.parentElement.classList.contains('hv-heardseg'));
  seg.parentElement.querySelector('[data-v="full"]').click(); await sleep(20);
  ok('...tapping another pill is a person deciding: the yellow goes', a.visit.acts.bathing.level==='full' && !a.visit.heard['visit.acts.bathing.level'] && !seg.parentElement.classList.contains('hv-heardseg'));
  /* someone types into a box before Keep */
  q('[data-hvs="1"]').click(); type('visit.story.evening','Typed by Krystal'); q('[data-hvs="8"]').click(); await sleep(300);
  const evRow=qa('.hv-fill').find(r=>/A day at home: evening/.test(r.innerText));
  ok('a box typed in after the reading: no Keep, and what was typed stays', a.visit.story.evening==='Typed by Krystal' && /stays as typed/.test(evRow.innerText) && !evRow.querySelector('[data-hva="fillkeep"]'));
  q('[data-hva="fillskip"][data-p="visit.goals.2.text"]').click(); await sleep(30);
  ok('Not right: the form is untouched and the row says left out, with Undo', !a.visit.goals[2].text && a.visit.after.marks['visit.goals.2.text']==='skip' && q('[data-hva="fillundo"][data-p="visit.goals.2.text"]'));
  q('[data-hva="fillundo"][data-p="visit.goals.2.text"]').click(); await sleep(30);
  ok('...Undo brings Keep back', !!q('[data-hva="fillkeep"][data-p="visit.goals.2.text"]'));
  const n0=a.visit.conditions.length;
  q('[data-hva="fillall"]').click(); await sleep(60);
  ok('Keep all fills the rest: the goal, and a third health condition row', a.visit.goals[2].text==='Eat a real lunch every day' && a.visit.conditions.length===3 && n0===2 && a.visit.conditions[2].name==='High blood pressure'
    && document.querySelectorAll('#hvRoot .hv-sec[data-sec="2"] [data-hv="visit.conditions.2.name"]').length===1 && /answers? kept/.test(L.toast), [a.visit.goals, a.visit.conditions, L.toast]);
  ok('...and never touched the typed boxes', a.visit.story.morning==='Up about 7, coffee' && a.visit.story.evening==='Typed by Krystal');
  ok('nothing left to check: the tag says All checked', /All checked/.test(q('#hvAfterBody').innerText));
  /* hear it */
  q('.hv-miss [data-hva="hear"]').click(); await sleep(150);
  ok('Hear it plays that part from 2 seconds before the moment', L.signed.join()==='assessment/x/g/002.webm' && L.played && /002\.webm/.test(L.played.src), [L.signed, L.played]);
  /* read again */
  window.__answer=Object.assign({}, window.__answer, { fills:[{ path:'visit.story.afternoon', value:'Naps after lunch', quote:'nap', rec:'r1', part:1, at:9, local:9, who:'P1 Speaker A' }] });
  q('[data-hva="readrec"]').click(); await sleep(400);
  ok('Read it again: asks first, keeps what was kept in the form, keeps the voice names, shows the new list', window.__asks.some(m=>/Read it again/.test(m)) && a.visit.allergies==='Penicillin (hives)' && a.visit.after.fills.length===1 && a.visit.after.names['P2 Speaker A']==='Karen Price (fake)' && L.invokes.length===2);
  ok('...the second time the fields sent leave out what was kept', !(L.bodies[1].fields||[]).some(f=>f.path==='visit.allergies' || f.path==='visit.goals.2.text'));
  /* an error */
  window.__answer={ fail:'The reader did not answer: overloaded. Nothing changed; try again.' };
  const before=JSON.stringify(a.visit);
  q('[data-hva="readrec"]').click(); await sleep(300);
  ok('an error says so in words, and nothing changed', /Could not read the recording: The reader did not answer: overloaded/.test(q('#hvReadMsg').innerText) && JSON.stringify(a.visit)===before && q('[data-hva="readrec"]').innerText==='Read it again');
  const scr=q('.hv-sec[data-sec="8"]').innerText;
  ok('no "AI" words and no em dashes on the screen', !/\bAI\b/.test(scr) && !scr.includes('—'), scr.match(/.{30}\bAI\b.{30}/));
  ok('only the reader was called, and only on taps; nothing texted or emailed', L.invokes.every(n=>n==='visit-review') && !L.fetches.some(u=>/functions\/v1|sms|mail/.test(u)), [L.invokes, L.fetches.slice(-3)]);
  /* no recording */
  window.__recs=[]; q('[data-hvs="7"]').click(); q('[data-hvs="8"]').click(); await sleep(250);
  ok('a visit with no recording says so, with no Read button', /no recording on the Hub/.test(q('#hvAfterRec').innerText) && !q('[data-hva="readrec"]'));
  window.__recs=[{ id:'r1', kind:'assessment', status:'transcribing', consent_given:true, part:1, seconds:600, offset_seconds:0 }];
  q('[data-hvs="7"]').click(); q('[data-hvs="8"]').click(); await sleep(250);
  ok('still being written out: says so; Read waits until a part is written out', /1 still being written out/.test(q('#hvAfterRec').innerText) && !q('[data-hva="readrec"]'), q('#hvAfterRec').innerText);
  window.__recs=[{ id:'r1', kind:'assessment', status:'done', consent_given:true, part:1, seconds:600, offset_seconds:0, storage_path:'p1' }, { id:'r2', kind:'assessment', status:'done', consent_given:true, part:2, seconds:310, offset_seconds:598, storage_path:'p2' }];
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
    return pg.evaluate("()=>{ const r=document.getElementById('hvRoot'); if(!r) return 'no visit'; const w=r.clientWidth; return [...r.querySelectorAll('*')].filter(e=>{ const b=e.getBoundingClientRect(); return b.width>0 && b.right>w+1 && !e.closest('.hv-rail') && !e.classList.contains('hv-aud'); }).slice(0,4).map(e=>e.className+' '+Math.round(e.getBoundingClientRect().right)); }")
with sync_playwright() as pw:
    b = pw.chromium.launch(); cx = b.new_context(viewport={'width': 1180, 'height': 820}, timezone_id='America/Chicago', has_touch=True); pg = cx.new_page()
    pg.route('**/*', serve)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://hv.local/index.html?proof=after'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T)
    pg.evaluate("()=>{ document.querySelector('#hvRoot [data-hvs=\"7\"]').click(); document.querySelector('#hvRoot [data-hvs=\"8\"]').click(); window.__answer=Object.assign({}, window.__answer||{}); }"); pg.wait_for_timeout(300)
    for w, h, name in [(1180, 820, 'iPad (1180 wide)'), (820, 1180, 'iPad upright (820 wide)'), (390, 844, 'phone (390 wide)')]:
        pg.set_viewport_size({'width': w, 'height': h}); pg.wait_for_timeout(150)
        o = overflow(pg); R.append(['PASS' if not o else 'FAIL', f'{name}, After the visit: nothing runs off the side', o])
        if SHOTS:
            os.makedirs(SHOTS, exist_ok=True); pg.screenshot(path=os.path.join(SHOTS, f'after-{w}.png'), full_page=False)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

"""Caregiver auto-connect, Hub screens (AC2): the real page, offline, sample rows. Nothing reaches production."""
from playwright.sync_api import sync_playwright
H = open('/Users/samantha/Claude/Projects/cc-hub-live/.claude/g1a_harness.js').read()
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,900)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const iso=m=>new Date(Date.now()-m*60e3).toISOString();
  window.__log=[]; window.__runs=[]; window.__blocked=[]; window.__cands=[{ id:50, first:'Casey', last:'Moreno', phone:'417.555.0103' }, { id:51, first:'Taylr', last:'Brandt', phone:'4175550999', not_hired:true }];
  window.__missing=false; window.__posts=[]; window.__reloads=0; window.__answer={ ok:true, message:'Connected.' };
  const base=sb.from.bind(sb);
  const tbl=rows=>{ const b={ select(){return b;}, order(){return b;}, limit(){ return Promise.resolve(__missing?{ data:null, error:{ message:'relation "public.caregiver_connect_log" does not exist', code:'42P01' } }:{ data:rows(), error:null }); },
    then(ok_,ko){ return Promise.resolve(__missing?{ data:null, error:{ message:'relation does not exist', code:'42P01' } }:{ data:rows(), error:null }).then(ok_,ko); } }; return b; };
  sb.from=t=>{
    if(t==='caregiver_connect_log') return tbl(()=>__log);
    if(t==='caregiver_connect_runs') return tbl(()=>__runs);
    if(t==='caregiver_connect_blocked') return tbl(()=>__blocked);
    if(t==='app_data'){ const b={ select(){return b;}, eq(k,v){ b.key=v; return b; }, async maybeSingle(){ if(b.key==='candidates') return { data:{ data:__cands }, error:null };
      if(b.key==='caregivers'){ __reloads++; return { data:{ data:DATA.caregivers }, error:null }; } return { data:null, error:null }; },
      upsert(){ window.__pageWrite=true; return Promise.resolve({ error:null }); } }; return b; }
    return base(t); };
  sb.auth.getSession=async()=>({ data:{ session:{ access_token:'staff-token' } } });
  const realFetch=window.fetch;
  window.fetch=async(u,o)=>{ if(String(u).includes('/functions/v1/caregiver-connect')){ __posts.push({ u:String(u), auth:o.headers.Authorization, body:JSON.parse(o.body) });
      return { ok:__answer.ok, status:__answer.ok?200:409, json:async()=>__answer }; } return realFetch(u,o); };
  window.confirm=()=>true; window.alert=m=>{ (window.__alerts=window.__alerts||[]).push(m); };
  let opened=[]; window.cgdOpenProfile=ax=>{ opened.push(ax); };
  const census=[ { id:'101', first:'Jordan', last:'Pike', mobile:'1-417-555-0101', active:true },
                 { id:'103', first:'Casey', last:'Moreno', mobile:'1-417-555-0103', active:true },
                 { id:'105', first:'Taylor', last:'Brandt', mobile:'1-417-555-0105', active:true },
                 { id:'110', first:'Blake', last:'Hart', mobile:'1-417-555-0110', active:true } ];
  CGD.census={ caregivers:census };
  DATA.caregivers=[{ id:20, first:'Jo', last:'Pike', phone:'(417) 555-0101' }, { id:22, first:'Tayler', last:'Brandt', phone:'4175559999' },
                   { id:27, first:'Blake', last:'Hart', axiscare_id:'110', connected:{ how:'phone', by:'auto' } }];
  const line=document.getElementById('cgcLine');

  /* practice */
  __runs=[{ at:iso(10), mode:'practice', ok:true, census_total:74, census_active:61, linked:1, moved:1, created:0, review:1 }];
  __log=[{ id:1, at:iso(10), mode:'practice', action:'link', result:'would', axiscare_id:'101', ax_name:'Jordan Pike', how:'phone', record_name:'Jo Pike' },
         { id:2, at:iso(10), mode:'practice', action:'move', result:'would', axiscare_id:'103', ax_name:'Casey Moreno', how:'phone', record_name:'Casey Moreno' },
         { id:3, at:iso(10), mode:'practice', action:'review', result:'would', axiscare_id:'105', ax_name:'Taylor Brandt', why:'the name is similar, but no phone or email matches' }];
  await cgcLoad(true); await cgcLineRender();
  ok('practice: the directory line says practice, what it would do, and where to turn it on', /Caregiver connect is in practice\. The hourly check would connect 2 \(1 to their Hub record, 1 moved from Background & References, 0 new Hub records\) · 1 needs a look · see the list · an owner turns it on in Settings, Caregiver connect/.test(line.innerText), line.innerText);
  window.ccCan=()=>false; await cgcLineRender();
  ok('practice, someone who may not change settings: no button, told an owner turns it on', !line.querySelector('button') && /an owner turns it on in Settings, Caregiver connect/.test(line.innerText), line.innerText);
  window.ccCan=k=>k==='manage_settings'; DATA.ops_settings={}; await cgcLineRender();
  const tb=[...line.querySelectorAll('button')].find(b=>b.textContent==='Turn on caregiver connect');
  ok('practice, an owner: the switch is right on the Caregivers page', !!tb, line.innerText);
  let lm=null; const keepMerge=window.tkMerge; window.tkMerge=async(fn)=>{ const m={}; const ch=fn(m,{}); lm=m; DATA.ops_settings=Object.assign({},DATA.ops_settings,m); return { changed:ch, error:null }; };
  tb.click(); await sleep(80);
  ok('pressing it turns caregiver connect on; the line says ON from the next hourly check, with a way to turn it off', lm&&lm.cg_connect_live===true && /Caregiver connect is ON\. The next hourly check \(at :17\) makes these changes/.test(line.innerText)
     && /turn off/.test(line.innerText) && !line.querySelector('button') && /on from the next hourly check/.test(line.innerText), line.innerText);
  window.tkMerge=keepMerge; DATA.ops_settings={};
  await cgcLineRender();
  cgcToggleList(); await sleep(50);
  ok('practice list: every would-do with its reason, needs-a-look first', /What the check would do \(practice, nothing has changed\)\s*Taylor Brandt · needs a look: the name is similar[\s\S]*Jordan Pike · would connect to their Hub record Jo Pike \(same phone\)[\s\S]*Casey Moreno · would move over from Background & References/.test(line.innerText), line.innerText);
  [...line.querySelectorAll('a')].find(a=>a.textContent==='Taylor Brandt').click();
  ok('a name in the list opens their profile', opened.includes('105'), opened);
  cgcToggleList(); await sleep(30);

  /* live */
  __runs=[{ at:iso(5), mode:'live', ok:true, linked:1, moved:1, created:1, review:1, refused:1 }];
  __log=[{ id:10, at:iso(5), mode:'live', action:'link', result:'done', axiscare_id:'101', ax_name:'Jordan Pike', how:'phone', record_name:'Jo Pike', by:'auto', caregiver_id:'20' },
         { id:11, at:iso(5), mode:'live', action:'move', result:'done', axiscare_id:'103', ax_name:'Casey Moreno', how:'phone', record_name:'Casey Moreno', by:'auto', caregiver_id:'66' },
         { id:12, at:iso(5), mode:'live', action:'create', result:'done', axiscare_id:'104', ax_name:'Quinn Ashby', how:'new', by:'auto', caregiver_id:'67', undone_at:iso(2), undone_by:'angiel@mo-care.com' },
         { id:13, at:iso(5), mode:'live', action:'review', result:'would', axiscare_id:'105', ax_name:'Taylor Brandt', why:'the name is similar, but no phone or email matches' },
         { id:14, at:iso(5), mode:'live', action:'link', result:'refused', axiscare_id:'106', ax_name:'Morgan Lee', why:'someone changed that Hub record a moment ago; tried again next hour' },
         { id:15, at:iso(60*24*3), mode:'manual', action:'link', result:'done', axiscare_id:'110', ax_name:'Blake Hart', how:'manual', record_name:'Blake Hart', by:'krystal@mo-care.com', caregiver_id:'27' }];
  await cgcLoad(true); CGC.open=true; await cgcLineRender();
  const lt=line.innerText;
  ok('live: connected this week, by how (an undone one and a person\'s own are not counted)', /Connected automatically this week: 2 \(1 by phone, 1 moved from Background & References\) · 1 needs a look/.test(lt), lt);
  ok('live list: who needs a person, what was connected (how, when), undone ones marked, refusals with the reason', /Needs a person to decide\s*Taylor Brandt · needs a look/.test(lt) && /Jordan Pike · connected by phone number automatically/.test(lt)
     && /Casey Moreno · moved over from Background & References automatically/.test(lt) && /Quinn Ashby · started a new Hub record automatically · [^\n]* · undone by angiel/.test(lt)
     && /Blake Hart · connected to Blake Hart by krystal/.test(lt) && /Not done this week \(tried again next hour\)\s*Morgan Lee · someone changed that Hub record/.test(lt), lt);
  const nb=[...line.querySelectorAll('button')].filter(b=>b.textContent==='Not this person');
  ok('"Not this person" on every connection still in place (not on the undone one)', nb.length===3, nb.length);

  /* Not this person */
  __posts=[]; __reloads=0;
  nb[0].click(); await sleep(80);
  ok('"Not this person": the server undoes it, signed in as the person; the lists reload', __posts.length===1 && __posts[0].body.action==='undo' && __posts[0].body.log_id===10 && __posts[0].auth==='Bearer staff-token' && __reloads===1, [__posts, __reloads]);

  /* the profile */
  const card=document.createElement('div'); card.id='cgcCard'; document.body.appendChild(card);
  CGD.openId='105'; await cgcMount(census[2], null);
  const ct=card.innerText;
  ok('needs data connection: the Connect card says why it is not automatic and lists the similar records', /Connect this caregiver/.test(ct) && /didn't connect them because the name is similar, but no phone or email matches/.test(ct)
     && /Tayler Brandt Hub record; similar name\s*This is their Hub record/.test(ct) && /Taylr Brandt Background & References, marked not hired; similar name\s*Move over from Background & References/.test(ct) && /Start a new Hub record/.test(ct), ct);
  CGD.openId='101'; DATA.caregivers[0]={ id:20, first:'Jo', last:'Pike', phone:'(417) 555-0101' };
  __log=__log.filter(x=>x.id!==10); await cgcLoad(true);
  card.innerHTML=''; await cgcMount(census[0], null);
  ok('a certain match: says so and offers that one record', /sure this is theirs \(same phone or email\) and will connect it at the next check; you can do it now\./.test(card.innerText) && /Jo Pike Hub record; same phone\s*This is their Hub record/.test(card.innerText), card.innerText);
  __posts=[]; __reloads=0; opened=[];
  [...card.querySelectorAll('button')].find(b=>b.textContent==='This is their Hub record').click(); await sleep(80);
  ok('"This is their Hub record": the server connects it; the caregivers reload and the profile redraws', __posts.length===1 && JSON.stringify(__posts[0].body)===JSON.stringify({ action:'link', axiscare_id:'101', caregiver_id:'20' }) && __reloads===1 && opened.includes('101'), [__posts, __reloads, opened]);
  CGD.openId='105'; card.innerHTML=''; await cgcMount(census[2], null);
  __answer={ ok:false, message:'That Hub record changed or is taken, so nothing was changed.' }; __posts=[]; __reloads=0;
  [...card.querySelectorAll('button')].find(b=>/Move over/.test(b.textContent)).click(); await sleep(80);
  ok('a refusal: shown on the card in its own words, nothing reloaded', __posts[0].body.action==='move' && __posts[0].body.candidate_id==='51' && /That Hub record changed or is taken/.test(document.getElementById('cgcMsg').innerText) && __reloads===0, [__posts, document.getElementById('cgcMsg').innerText]);
  __answer={ ok:true, message:'A new Hub record was started and connected.' }; __posts=[];
  [...card.querySelectorAll('button')].find(b=>b.textContent==='Start a new Hub record').click(); await sleep(80);
  ok('"Start a new Hub record"', __posts.length===1 && JSON.stringify(__posts[0].body)===JSON.stringify({ action:'new', axiscare_id:'105' }), __posts);
  window.confirm=()=>false; __posts=[];
  [...card.querySelectorAll('button')].find(b=>b.textContent==='Start a new Hub record').click(); await sleep(50);
  ok('saying no to the question: nothing is sent', __posts.length===0); window.confirm=()=>true;

  /* a connected profile */
  CGD.openId='110'; card.innerHTML=''; await cgcMount(census[3], DATA.caregivers[2]);
  ok('a connected caregiver: how and when, with "Not this person"', /Hub record connected to Blake Hart by krystal on .*\.\s*Not this person/.test(card.innerText) && /never makes that match again/.test(card.innerText), card.innerText);

  /* not installed yet (before Desktop 438) */
  __missing=true; CGC.log=null; await cgcLoad(true); await cgcLineRender(); card.innerHTML='x'; CGD.openId='105'; await cgcMount(census[2], null);
  ok('before 438: no line, no card, no error', line.innerHTML==='' && card.innerHTML==='' && !CGC.err, [line.innerHTML, card.innerHTML, CGC.err]);
  __missing=false;

  /* Settings */
  const s=document.getElementById('cgcSet').parentNode;
  DATA.ops_settings={}; await cgcLoad(true); cgcSetRender();
  ok('Settings: OFF (practice), what it does, the last check', /Caregiver connect: OFF \(practice\)\. Once an hour the check lists what it would do/.test(s.innerText) && /A name alone never connects anyone, and nobody is texted\./.test(s.innerText)
     && /Last check .* \(live\): 1 connected, 1 moved, 1 started, 1 need a look, 1 tried again next hour/.test(s.innerText) && document.getElementById('cgcSetBtn').textContent==='Turn on caregiver connect', s.innerText);
  let merged=null; window.tkMerge=async(fn)=>{ const m={}; const ch=fn(m,{}); merged=m; DATA.ops_settings=Object.assign({},DATA.ops_settings,m); return { changed:ch, error:null }; };
  await cgcToggle(document.getElementById('cgcSetBtn'));
  ok('turning it on saves cg_connect_live through the shared settings merge', merged && merged.cg_connect_live===true && /on from the next hourly check/.test(s.innerText) && document.getElementById('cgcSetBtn').textContent==='Turn off caregiver connect', [merged, s.innerText]);
  ok('the page never wrote a caregiver, candidate or app_data row itself', !window.__pageWrite);
  ok('no em dash anywhere it drew', !/—/.test(line.innerText+card.innerText+s.innerText));
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page()
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=cgc'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', H)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

"""K3 · Calls nobody could match: offline on the real page, a stand-in call record and a fake call-place."""
import os, sys
from playwright.sync_api import sync_playwright
H = open('/Users/samantha/Claude/Projects/cc-hub-live/.claude/g1a_harness.js').read()
SETUP = r"""
(()=>{ window.sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const now=Date.now(), iso=m=>new Date(now-m*60000).toISOString();
  window.T={
    call_record:[
      { id:1, recorded_at:iso(120), kind:'outcome', direction:'inbound', caller_phone:'4175550100', ghl_contact_id:'G1', match:'none', outcome:'Follow Up' },
      { id:2, recorded_at:iso(118), kind:'summary', direction:'inbound', caller_phone:'4175550100', ghl_contact_id:'G1', match:'none', summary:'New caller asking about respite.', summary_source:'ghl' },
      { id:3, recorded_at:iso(60), kind:'summary', direction:'inbound', caller_phone:'4175550200', match:'several', summary:'Shared line call about Mom.', summary_source:'ghl' },
      { id:4, recorded_at:iso(30), kind:'summary', direction:'inbound', caller_phone:'4175550300', match:'none', summary:'Already placed call.', summary_source:'ghl' },
      { id:5, recorded_at:iso(10), kind:'summary', direction:'inbound', caller_phone:'4175550400', match:'one', lead_id:'L1', summary:'Matched call.', summary_source:'ghl' } ],
    call_placement:[{ call_record_id:4, lead_id:'L1', placed_by:'kat@mo-care.com', placed_at:iso(20) }],
    person_source_id:[], person_relationship:[], person_identity:[] };
  window.__places=[];
  const base=sb.from.bind(sb);
  sb.from=t=>{ if(!T[t]) return base(t); const f=[]; const b={ select(){return b;}, order(){return b;}, limit(){return b;},
      eq(c,v){ f.push(r=>String(r[c])===String(v)); return b; }, neq(c,v){ f.push(r=>String(r[c])!==String(v)); return b; },
      gte(c,v){ f.push(r=>String(r[c])>=String(v)); return b; }, in(c,vs){ f.push(r=>vs.map(String).includes(String(r[c]))); return b; },
      then(ok,bad){ return Promise.resolve({ data:T[t].filter(r=>f.every(fn=>fn(r))), error:null }).then(ok,bad); } }; return b; };
  const bf=window.fetch;
  window.fetch=async(u,o)=>{ if(/functions\/v1\/call-place$/.test(String(u))){ const b=JSON.parse(o.body); __places.push({ b, auth:(o.headers||{}).Authorization||'' });
      if(b.decision==='lead'&&b.lead_id==='L2') return new Response(JSON.stringify({ outcome:'refused', reason:'that inquiry is not on file (or is archived)' }),{status:400});
      b.call_ids.forEach(id=>T.call_placement.push({ call_record_id:id, lead_id:b.lead_id||null, person_id:b.person_id||null, placed_by:'kat@mo-care.com', placed_at:new Date().toISOString() }));
      return new Response(JSON.stringify({ outcome:'placed', lines:b.call_ids.length }),{status:200}); }
    return bf(u,o); };
  window.cl360Identity=async()=>[{ client_name:'Ruth Client', person_id:'11111111-2222-3333-4444-555555555555', axiscare_client_id:'501', role_status:'active' },
                                  { client_name:'Ended Client', person_id:'22222222-2222-3333-4444-555555555555', axiscare_client_id:'502', role_status:'ended' }];
  DATA.leads=[{ id:'L1', first_name:'Dana', last_name:'Doe', phone:'4175550100', status:'New', created_at:iso(3000) },
              { id:'L2', first_name:'Gone', last_name:'Away', phone:'4175550500', status:'New', created_at:iso(3000) },
              { id:'L3', first_name:'Old', last_name:'Archived', phone:'4175550600', archived:true, status:'Lost', created_at:iso(3000) }];
})();
"""
TESTS = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]);
  try{ switchTab('ops'); }catch(e){} await sleep(200); await ucLoad(); await sleep(50);
  const box=()=>document.getElementById('opsUnmatchedCalls'), t=()=>box().innerText;
  ok('the list shows in Needs Attention', /Calls nobody could match/.test(t())&&/2 in the last 30 days/.test(t()), t().slice(0,300));
  ok('an outcome and a summary from one number show as one call', (t().match(/This was/g)||[]).length===2);
  ok('it says why each is unmatched', /nobody on file has this number/.test(t())&&/more than one person or inquiry has this number/.test(t()));
  ok('placed calls and matched calls are not in the list', !/Already placed call/.test(t())&&!/Matched call/.test(t()));
  const btns=()=>[...box().querySelectorAll('button')].filter(b=>/This was/.test(b.innerText));
  const first=btns().find(b=>b.closest('div').parentElement.innerText.includes('respite'))||btns()[1];
  first.click(); await sleep(250);
  const pop=()=>document.querySelector('#ucList');
  ok('the picker lists open inquiries and active clients only', /Dana Doe/.test(pop().innerText)&&/Ruth Client/.test(pop().innerText)&&!/Archived/.test(pop().innerText)&&!/Ended Client/.test(pop().innerText), pop().innerText);
  const q=document.getElementById('ucQ'); q.value='ruth'; q.dispatchEvent(new Event('input')); await sleep(30);
  ok('search narrows the choices', /Ruth Client/.test(pop().innerText)&&!/Dana Doe/.test(pop().innerText));
  q.value=''; q.dispatchEvent(new Event('input')); await sleep(30);
  [...pop().querySelectorAll('button')].find(b=>/Gone Away/.test(b.innerText)).click(); await sleep(250);
  ok('a refusal is shown and nothing is placed', /Not placed: that inquiry is not on file/.test(document.getElementById('ucErr').innerText)&&T.call_placement.length===1);
  [...pop().querySelectorAll('button')].find(b=>/Dana Doe/.test(b.innerText)).click(); await sleep(300);
  const p=__places[__places.length-1];
  ok('choosing an inquiry places every line of that call, with your sign-in, and nothing about who placed it in the request',
     p.b.decision==='lead'&&p.b.lead_id==='L1'&&JSON.stringify(p.b.call_ids.slice().sort())==='[1,2]'&&/Bearer /.test(p.auth)&&!('placed_by' in p.b), p);
  ok('the placed call leaves the list', !/respite/.test(t())&&(t().match(/This was/g)||[]).length===1, t());
  btns()[0].click(); await sleep(250); document.getElementById('ucNot').click(); await sleep(300);
  ok('"Not one of ours" is recorded the same way, and the list empties', __places[__places.length-1].b.decision==='not_ours'&&box().innerText.trim()==='');
  /* the profile shows a placed call, with who placed it */
  openLeadProfile('L1'); await sleep(300); try{ cpShowTab('history'); }catch(e){} await callsLoad(true); await sleep(80);
  const ct=document.getElementById('cp_calls').innerText;
  ok('the inquiry\'s profile shows the placed calls, saying who placed them', /New caller asking about respite/.test(ct)&&/Placed here by kat/.test(ct)&&/Matched call/.test(ct), ct.slice(0,600));
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1280, 'height': 1100})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=uc'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', H); pg.evaluate('s=>(0,eval)(s)', SETUP)
    if len(sys.argv)>1:
        os.makedirs(sys.argv[1],exist_ok=True)
        pg.evaluate("async()=>{ try{ switchTab('ops'); }catch(e){} await ucLoad(); }"); pg.wait_for_timeout(300)
        pg.query_selector('#opsUnmatchedCalls').screenshot(path=os.path.join(sys.argv[1],'01 Calls nobody could match.png'))
        pg.evaluate("()=>{ [...document.querySelectorAll('#opsUnmatchedCalls button')].find(b=>/This was/.test(b.innerText)).click(); }"); pg.wait_for_timeout(400)
        pg.screenshot(path=os.path.join(sys.argv[1],'02 Who was this call with.png'))
        pg.evaluate("()=>ccPopClose()")
    R = pg.evaluate(TESTS)
    b.close()
R.append(['PASS' if not errs else 'FAIL','no page errors',errs[:3]])
for s_, n, d in R: print(s_, '·', n, '' if s_=='PASS' else d)
print(sum(r[0]=='PASS' for r in R), '/', len(R))

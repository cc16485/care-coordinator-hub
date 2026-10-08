"""Google review asks on the Hub (2026-10-08): the review box on a client's profile (the happy moment, the message with the
verified link to copy and edit, I asked / Not now, the follow-up a week later, a person choosing to ask), nothing sent by the
Hub, nothing for a past client, My Work's two card kinds, and the owners' count on the Clients board. The real page, offline,
with the review service played in the page. (python3 tests/browser/review_ask_look.py, static server on 8765)"""
from playwright.sync_api import sync_playwright
import os
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'client_journey_look.py')).read()
ns = {}; exec(src.split('with sync_playwright() as pw:')[0], ns)
STUB, DATA = ns['STUB'], ns['DATA']
FAKE = r"""
(()=>{
  const W=window, URL_='https://search.google.com/local/writereview?placeid=ChIJaUETSOx7z4cRdYKcTMoZ6Go';
  W.__rv={ calls:[], asks:{ '777':[{ ask_id:'a1', axiscare_client_id:'777', client_name:'Rhoda Real', moment:'kind_words', moment_on:'2026-10-06', who:"Rhoda's daughter", about:'Maria Lopez',
      quote:'Maria is an angel, Mom lights up when she comes', status:'suggested', created_at:'2026-10-07T10:00:00Z' }], '500':[], '888':[] }, current:{ '777':true, '500':false, '888':true } };
  const R=W.__rv;
  const state=ax=>{ const a=R.asks[ax]||[], open=a.find(x=>x.status==='suggested')||null, fu=a.find(x=>x.status==='asked'&&!x.outcome)||null;
    return { live:true, current:R.current[ax], url:URL_, open, followup:fu, history:a, can_suggest:R.current[ax]&&!open&&!fu, why_not:R.current[ax]?null:'Only current clients are asked.',
      message:open?"Hi, this is Angie at Caring Companions. Thank you for the kind words about Maria. If you have a minute, a Google review would mean a lot to our team and helps other families in Springfield find care they can trust: "+URL_:null }; };
  const of=W.fetch; W.fetch=async(u,o)=>{ const s=String(u);
    if(/review-moments/.test(s)){ const b=JSON.parse(o.body); R.calls.push(b); let out={};
      if(b.action==='review_state') out=state(b.axiscare_client_id);
      if(b.action==='review_asked'){ const a=R.asks['777'].find(x=>x.ask_id===b.ask_id); Object.assign(a,{ status:'asked', asked_how:b.how, asked_who:b.who, asked_by_name:'Angie Care', asked_at:new Date().toISOString() }); out={ outcome:'asked' }; }
      if(b.action==='review_not_now'){ const a=R.asks['777'].find(x=>x.ask_id===b.ask_id); Object.assign(a,{ status:'not_now', note:b.note, updated_at:new Date().toISOString() }); out={ outcome:'not_now' }; }
      if(b.action==='review_outcome'){ const a=R.asks['777'].find(x=>x.ask_id===b.ask_id); Object.assign(a,{ outcome:b.outcome }); out={ outcome:'recorded' }; }
      if(b.action==='review_suggest'){ R.asks['888'].push({ ask_id:'a2', axiscare_client_id:'888', client_name:'Ann Active', moment:'manual', moment_on:'2026-10-08', who:b.who, note:b.note, status:'suggested' }); out={ outcome:'suggested' }; }
      if(b.action==='review_counts') out={ asked:3, left:2, said_would:1, not_now:1, live:true };
      return new Response(JSON.stringify(out),{status:200}); }
    if(/client-journey/.test(s)) return new Response(JSON.stringify({ state:'active', can:{}, roles:[], episodes:[], changes:[], reasons:{} }),{status:200});
    return of(u,o); };
  W.__copied=''; try{ navigator.clipboard.writeText=async t=>{ W.__copied=t; }; }catch(e){}
})();
"""
T = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  window.__as('angie@mo-care.com','Angie Care');
  DATA.leads.push({ id:'R3', client_first_name:'Rhoda', client_last_name:'Real', status:'Converted', axiscare_client_id:'777' }, { id:'R5', client_first_name:'Olive', client_last_name:'Past', status:'Converted', axiscare_client_id:'500' },
    { id:'R8', client_first_name:'Ann', client_last_name:'Active', status:'Converted', axiscare_client_id:'888' });
  const B=()=>document.getElementById('ccReview'), V=window.__rv;
  await openLeadProfile('R3','summary'); await sleep(500);
  ok('a happy moment: the review box quotes the kind words, who said them and about whom', /Google review/.test(B().innerText) && /Maria is an angel/.test(B().innerText) && /Rhoda's daughter/.test(B().innerText) && /about Maria Lopez/.test(B().innerText), B().innerText);
  ok('...the message is ready to edit, with the verified Google review link, and says the Hub sends nothing', /writereview\?placeid=ChIJaUETSOx7z4cRdYKcTMoZ6Go/.test(document.getElementById('rvMsg').value) && /the Hub sends nothing/.test(B().innerText));
  await window.shot('review_box');
  document.getElementById('rvMsg').value='Hi Rosa, thank you! A review would mean a lot: https://search.google.com/local/writereview?placeid=ChIJaUETSOx7z4cRdYKcTMoZ6Go';
  [...B().querySelectorAll('button')].find(b=>/Copy message/.test(b.textContent)).click(); await sleep(200);
  ok('Copy message copies the EDITED text (nothing is sent)', /^Hi Rosa/.test(window.__copied) && !V.calls.some(c=>/send/.test(c.action)), window.__copied);
  [...B().querySelectorAll('button')].find(b=>/I asked/.test(b.textContent)).click(); await sleep(200);
  ok('I asked needs how you asked', /How did you ask\?/.test(B().innerText) && !V.calls.some(c=>c.action==='review_asked'));
  document.getElementById('rvHow').value='text'; document.getElementById('rvWho').value="Rhoda's daughter Rosa";
  [...B().querySelectorAll('button')].find(b=>/I asked/.test(b.textContent)).click(); await sleep(600);
  ok('...recorded (how and whom), and the box now asks "Did they leave a review?"', V.calls.some(c=>c.action==='review_asked'&&c.how==='text'&&c.who==="Rhoda's daughter Rosa") && /Did they leave a review\?/.test(B().innerText) && /Left a review/.test(B().innerText), B().innerText);
  [...B().querySelectorAll('button')].find(b=>/Left a review/.test(b.textContent)).click(); await sleep(600);
  ok('...Left a review: recorded, and shown in the asks so far', V.calls.some(c=>c.action==='review_outcome'&&c.outcome==='left') && /Asks so far \(1\)/.test(B().innerText) && /Left a review/.test(B().querySelector('.rv-hist').textContent), B().innerText);
  await openLeadProfile('R5','summary'); await sleep(500);
  ok('a past client: no review box at all', !B().innerText.trim(), B().innerText);
  await openLeadProfile('R8','summary'); await sleep(500);
  ok('a current client with no moment: "Ask for a Google review…" lets a person choose to ask', /Ask for a Google review/.test(B().innerText), B().innerText);
  const op=window.prompt; let n=0; window.prompt=()=>(++n===1?'their son Tom':'He thanked us at the care plan review');
  [...B().querySelectorAll('a')].find(a=>/Ask for a Google review/.test(a.textContent)).click(); await sleep(600); window.prompt=op;
  ok('...a suggestion opens with who and why', V.calls.some(c=>c.action==='review_suggest'&&c.who==='their son Tom') && /He thanked us/.test(B().innerText), B().innerText);
  ok('My Work knows the two new card kinds', OPS_KINDS.review_ask && OPS_KINDS.review_followup);
  window.__as('sam@mo-care.com','Samantha Owner'); CC_ROLE_BY_EMAIL['sam@mo-care.com']=['owner_admin'];
  CL.roster=[{ axiscare_client_id:'888', client_name:'Ann Active', role_status:'active' }]; CL.issues=[]; CL.filter='All current'; CL.picked=true;
  switchTab('clientsboard'); renderClientsBoard(); await sleep(400);
  ok('owners see the count on the Clients board: asked, left', /Google reviews, last 90 days: 3 asked · 2 left · 1 said they would/.test(document.getElementById('clFilters').innerText), document.getElementById('clFilters').innerText);
  return R; }"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1280, 'height': 1000}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    pg.goto('http://localhost:8765/index.html?proof=review'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB); pg.evaluate('s=>(0,eval)(s)', DATA); pg.evaluate('s=>(0,eval)(s)', FAKE)
    shots = []
    pg.expose_function('pyShot', lambda n: shots.append(n))
    pg.evaluate("()=>{ window.shot=async(n)=>{ await window.pyShot(n); }; }")
    R = pg.evaluate(T)
    if os.environ.get('SHOT_DIR'):
        pg.evaluate("()=>openLeadProfile('R3','summary')"); pg.wait_for_timeout(600)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

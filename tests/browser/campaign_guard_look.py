"""The campaign audience guard on the Hub's Campaigns tab (2026-10-07 safety fix): the count is after the server's check, the
left-out reasons show, Send uses only who passed, and nothing can be sent when the check can't run. Offline, fake server.
(python3 tests/browser/campaign_guard_look.py, static server on 8765)"""
from playwright.sync_api import sync_playwright
T = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]);
  document.body.insertAdjacentHTML('beforeend','<div id="cmpCountLine"></div><div id="cmpStatus"></div><select id="cmpSource"><option value="ax_clients" selected>AxisCare · active clients</option></select>');
  window.cmpRecipients=async()=>[{email:'alice@x.com'},{email:'dorasson@x.com'},{email:'ivan@x.com'}];
  window.cmpAuthHeaders=async()=>({}); cmpAud='clients';
  let mode='ok', bodies=[];
  window.fetch=async(u,o)=>{ const b=JSON.parse(o.body); bodies.push(b);
    if(b.screen){ if(mode==='down') return new Response(JSON.stringify({ ok:false, error:'AxisCare could not be read just now, so nobody can be checked. Try again in a minute.' }));
      if(mode==='old') return new Response(JSON.stringify({ error:'subject, html and recipients are required' }),{status:400});
      return new Response(JSON.stringify({ ok:true, allowed:[{email:'alice@x.com'}], left_out:[{email:'dorasson@x.com',why:'tied to a client who has died'},{email:'ivan@x.com',why:'tied to a past client'}] })); }
    return new Response(JSON.stringify({ ok:true, sent:b.recipients.length, failed:0 })); };
  await cmpCount(); const el=document.getElementById('cmpCountLine');
  ok('the count is after the check: 1 recipient, 2 left out with why', /^1 recipient/.test(el.innerText) && /2 left out: 1 tied to a client who has died · 1 tied to a past client/.test(el.innerText), el.innerText);
  ok('...the check is asked as a client campaign', bodies[0].screen===true && bodies[0].tag==='client' && bodies[0].recipients.length===3);
  window.cmpLib=()=>[{key:'k',subj:'Hello',aud:'clients'}]; cmpKey='k'; window.ccBuildEmailHTML=()=>'<p>x</p>'; window.confirm=()=>true; window.persist=async()=>{}; DATA.campaign_log=[];
  bodies=[]; await cmpSend(); const sendCall=bodies.find(b=>!b.screen);
  ok('Send sends only who passed (alice), never the deceased client\'s son or the past client', sendCall && sendCall.recipients.map(r=>r.email).join()==='alice@x.com', bodies);
  mode='down'; let alerted=''; window.alert=m=>{ alerted=m; }; bodies=[]; await cmpSend();
  ok('the check can\'t run: nothing is sent and it says so', !bodies.some(b=>!b.screen) && /Nothing was sent/.test(alerted), [alerted, bodies]);
  await cmpCount(); ok('...and the count says nothing can be sent', /Nothing can be sent until it does/.test(el.innerText), el.innerText);
  mode='old'; await cmpCount(); ok('before the server step is installed it says so plainly', /not installed on the server yet \(Desktop 497\)/.test(el.innerText), el.innerText);
  return R; }"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    pg.goto('http://localhost:8765/index.html?proof=cmpguard'); pg.wait_for_timeout(1500)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

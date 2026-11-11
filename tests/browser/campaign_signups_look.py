"""Website email sign-ups as Campaigns recipients (2026-11-11, her "Short welcome, then monthly"): only people whose four
welcome emails are done, never anyone who unsubscribed, deduped with open leads; asks family-signup with the office sign-in.
Offline, fake server. (python3 tests/browser/campaign_signups_look.py; serves this checkout itself)"""
import os, threading, http.server, functools
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
H = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT))
H.RequestHandlerClass.log_message = lambda *a: None
threading.Thread(target=H.serve_forever, daemon=True).start()
T = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]);
  document.body.insertAdjacentHTML('beforeend','<select id="cmpSource"><option value="signups" selected>x</option><option value="leads_open_signups">y</option></select><textarea id="cmpManual"></textarea>');
  window.cmpAuthHeaders=async()=>({Authorization:'Bearer office'});
  let asked=[];
  window.fetch=async(u,o)=>{ asked.push([u,o.headers,JSON.parse(o.body)]);
    return new Response(JSON.stringify({ ok:true, signups:[
      {email:'done@x.com',first:'Dana',welcome_sent:4,stopped:null},
      {email:'mid@x.com',first:'Mia',welcome_sent:2,stopped:null},
      {email:'gone@x.com',first:'Gus',welcome_sent:4,stopped:'unsubscribed or asked not to be contacted'},
      {email:'Lead@x.com',first:'Lee',welcome_sent:4,stopped:'became a lead (asked for a call or booked), so a person takes over'}] })); };
  DATA.leads=[{email:'lead@x.com',first_name:'Lee',last_name:'Ann',status:'New'},{email:'won@x.com',status:'Converted'}];
  let r=await cmpRecipients();
  ok('sign-ups: only finished welcomes, never unsubscribed', r.map(x=>x.email).sort().join()==='Lead@x.com,done@x.com', r);
  ok('asks family-signup for its list with the office sign-in', /\/functions\/v1\/family-signup$/.test(asked[0][0]) && asked[0][2].action==='list' && asked[0][1].Authorization==='Bearer office', asked[0]);
  document.getElementById('cmpSource').value='leads_open_signups'; r=await cmpRecipients();
  ok('open leads + sign-ups: deduped (Lee once), no converted client', r.map(x=>x.email.toLowerCase()).sort().join()==='done@x.com,lead@x.com', r);
  window.fetch=async()=>{ throw new Error('down'); }; document.getElementById('cmpSource').value='signups';
  r=await cmpRecipients(); ok('server down: nobody, no crash', Array.isArray(r) && r.length===0, r);
  ok('both choices are in the Recipients list', /Website email sign-ups \(The Talk worksheets\)/.test(document.documentElement.innerHTML) && /Open leads \+ website email sign-ups/.test(document.documentElement.innerHTML));
  return R; }"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    pg.goto(f'http://127.0.0.1:{H.server_address[1]}/index.html?proof=cmpsignups'); pg.wait_for_timeout(1500)
    res = pg.evaluate(T); b.close()
for s, n, d in res: print(s, n, d)
print(f"{sum(1 for s, _, _ in res if s == 'PASS')}/{len(res)} passed"); raise SystemExit(0 if all(s == 'PASS' for s, _, _ in res) else 1)

"""Staff training walkthrough (Samantha 2026-10-11, "yes to all"): the card on the Applicant journey tab. Office staff type
their own first name, cell and email and press Start; their open walkthrough shows with My practice profile and End; others'
show below (End only for an owner). The real page offline with a fake server; serves this folder on a free port.
python3 tests/browser/training_walkthrough_look.py"""
import os, socket, subprocess, sys, tempfile, time
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
s_ = socket.socket(); s_.bind(('127.0.0.1', 0)); PORT = s_.getsockname()[1]; s_.close()
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '-d', ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
T = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]);
  const CALLS=[]; let OPEN=[{ id:'w-zed', first:'Zed', by_email:'zed@mo-care.com', by_name:'Zed Office', started_at:'2026-10-11T15:00:00Z', ends_at:'2026-10-25T15:00:00Z', mine:false }], MAY=false;
  sb = { functions: { invoke: async (fn, { body }) => { CALLS.push([fn, body]);
    if(body.action==='list') return { data:{ ok:true, open:OPEN, may_end_all:MAY }, error:null };
    if(body.action==='start'){ OPEN=[...OPEN, { id:'w-kay', first:body.first, phone:body.phone, email:body.email, by_email:'kay@mo-care.com', started_at:'2026-10-11T18:00:00Z', ends_at:'2026-10-25T18:00:00Z', mine:true }]; return { data:{ ok:true, offer_sent:{ sms:false, email:true, held:true }, not_sent:[] }, error:null }; }
    if(body.action==='end'){ OPEN=OPEN.filter(x=>x.id!==body.offer_id); return { data:{ ok:true }, error:null }; }
    return { data:{ error:'?' }, error:null }; } } };
  ME = { email:'kay@mo-care.com', name:'Kay Office', shift:'day' }; window.confirm = () => true;
  document.querySelectorAll('.tabpanel').forEach(p=>p.classList.remove('active')); document.getElementById('tab-apjourney').classList.add('active');
  const box=document.getElementById('twBox');
  for(let el=box; el; el=el.parentElement){ if(getComputedStyle(el).display==='none') el.style.display='block'; }
  ok('the card is on the Applicant journey tab and the script loaded', !!box && box.closest('#tab-apjourney') && typeof window.TW==='object');
  await TW.mount();
  let t=box.innerText;
  ok('it says what it is: their own phone, the job offer through the Orientation Video Call, a made-up SSN, (TRAINING), 14 days, nothing to AxisCare', /Try the new-hire journey yourself/.test(t) && /your own phone/.test(t) && /Orientation Video Call/.test(t) && /made-up/.test(t) && /\(TRAINING\)/.test(t) && /14 days/.test(t) && /AxisCare/.test(t), t);
  ok('first name prefilled from the sign-in; phone and email blank', document.getElementById('twFirst').value==='Kay' && document.getElementById('twPhone').value==='' && document.getElementById('twEmail').value==='');
  ok('others\' open walkthroughs show, with no End for a non-owner', /Zed \(TRAINING\) · by Zed Office/.test(t) && !/>End</.test(box.innerHTML), box.innerHTML.slice(-600));
  document.getElementById('twPhone').value='417-555-0100'; document.getElementById('twEmail').value='kay@home.com';
  await TW.start(box.querySelector('button.primary'));
  const st=CALLS.find(c=>c[1].action==='start');
  ok('Start calls the server with her first name, phone and email', st && st[0]==='training-walkthrough' && st[1].first==='Kay' && st[1].phone==='417-555-0100' && st[1].email==='kay@home.com', st);
  t=box.innerText;
  ok('after Start: her walkthrough open, where messages go, the text waiting until 8am, My practice profile and End', /Your walkthrough is open/.test(t) && /Kay \(TRAINING\)/.test(t) && /417-555-0100/.test(t) && /the text waits until 8am/.test(t) && /End my walkthrough/.test(t) && !document.getElementById('twPhone'), t);
  await TW.end('w-kay');
  ok('End ends hers and the form comes back', CALLS.some(c=>c[1].action==='end' && c[1].offer_id==='w-kay') && !!document.getElementById('twPhone') && /Ended/.test(box.innerText), box.innerText);
  MAY=true; await TW.mount();
  ok('an owner sees End on others\' walkthroughs', /TW\.end\('w-zed'/.test(box.innerHTML));
  ok('no em dash in the card', !/—/.test(box.innerText));
  return R; }"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []; R = []
    for w in (1280, 390):
        pg = b.new_page(viewport={'width': w, 'height': 1000}); pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
        pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
        pg.goto(f'http://127.0.0.1:{PORT}/index.html?proof=training'); pg.wait_for_timeout(1500)
        out = pg.evaluate(T)
        if w == 1280: R += out
        pg.evaluate("TW.mount()"); pg.wait_for_timeout(200)
        over = pg.evaluate("(()=>{const b=document.getElementById('twBox'); return b.scrollWidth - b.clientWidth})()")
        R.append(['PASS' if over <= 1 else 'FAIL', f'no sideways scroll in the card at {w}px', '' if over <= 1 else str(over)])
        pg.locator('#twBox').screenshot(path=os.path.join(tempfile.gettempdir(), f'tw_look_{w}.png'))
        pg.close()
    b.close()
srv.terminate()
real = [e for e in errs if 'supabase' not in e.lower() and 'fetch' not in e.lower()]
R.append(['PASS' if not real else 'FAIL', 'no page errors', '; '.join(real)[:400]])
for s, n, d in R: print(s, ' ', n, ('  ' + d) if d else '')

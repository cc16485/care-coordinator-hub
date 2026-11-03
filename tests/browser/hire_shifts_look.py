"""Tell them about shifts (Samantha 2026-11-03, part 5 of her applicant plan, wording approved): open hours from Team Builder
and open hours cases, town only, closest first, her words, a person presses Send. The real Hub page, offline (files served from this folder), made-up people only; every send is answered here and
recorded, nothing reaches anyone. (python3 tests/browser/hire_remind_look.py; SHOTS=<dir> also saves screenshots)"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = os.environ.get('SHOTS')
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const D=864e5, ago=ms=>new Date(Date.now()-ms).toISOString();
  const ROWS=[{ training_id:'t1', name:'Orla Late', phone:'4175550303', status:'not_started', status_label:'In Training', assigned_at:ago(9*D), welcome_sent_at:ago(9*D), units:[] }];
  const OFFS=[{ id:'off-1', name:'Olive Offer', phone:'4175550301', interview_date:ago(4*D).slice(0,10), onboarding_path:'new' }];
  window.fetch=async(u)=>{ u=String(u); if(u.includes('hub-training-data')) return new Response(JSON.stringify(u.includes('job_offers')?OFFS:u.includes('orientation_progress')?ROWS:[]),{status:200}); return new Response('{}',{status:200}); };
  (0,eval)("trainHubTok=async()=>'t'");
  const INV=[]; window.__APPS=[{ id:'app-orla', phone:'(417) 555-0303', zip:'65807', city:'Springfield', created_at:ago(20*D) }];
  window.__from=(tb)=>{ const q={ select:()=>q, order:()=>q, limit:()=>q, eq:()=>q, in:()=>q, gte:()=>q, not:()=>q, is:()=>q, ilike:()=>q,
      then:(ok,no)=>{ let data=[]; if(tb==='zip_points') data=[{ zip:'65807', city:'Springfield', lat:37.17, lon:-93.33 }, { zip:'65714', city:'Nixa', lat:37.04, lon:-93.29 }, { zip:'65616', city:'Branson', lat:36.64, lon:-93.24 }];
        if(tb==='job_applicants') data=window.__APPS; return Promise.resolve({ data, error:null }).then(ok,no); } };
    return q; };
  (0,eval)("sb=new Proxy(sb||{},{ get:(t,k)=>k==='from'?window.__from:k==='functions'?{ invoke:async(n,o)=>{ window.__INV.push([n,o&&o.body]); return { data:{ ok:true, sent:true, rows:[] }, error:null }; } }:(typeof t[k]==='function'?t[k].bind(t):t[k]) });"); window.__INV=INV;
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Land' };"); CC_ROLES=['owner_admin']; CC_ROLES_CHECKED=true; CC_ROLE_BY_EMAIL['krystal@mo-care.com']=['owner_admin'];
  const CONF=[]; (0,eval)("ccToast=m=>window.__toast.push(String(m));"); window.__toast=[];
  DATA.ops_settings=DATA.ops_settings||{};
  DATA.staffing_plans=[{ id:'p1', client:'Mary Smith', city:'Branson', zip:'65616', status:'building', days:['tue'], slots:[{ k:'a', start:'09:00', end:'13:00' }], cells:{} },
    { id:'p2', client:'Joe Jones', city:'Nixa', zip:'65714', status:'building', days:['mon','wed','fri'], slots:[{ k:'a', start:'08:00', end:'12:00' }], cells:{ 'mon|a':{ name:'Amy', status:'yes' } } },
    { id:'p3', client:'Done Plan', city:'Ozark', zip:'65721', status:'done', days:['mon'], slots:[{ k:'a', start:'08:00', end:'12:00' }], cells:{} }];
  DATA.coverage_cases=[{ id:'cc1', kind:'open_hours', status:'open', client:'Secret Client', client_city:'Republic', client_zip:'', shift_date:'2026-11-10', shift_time:'2pm to 6pm' }];
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; await sleep(300);

  /* the pure parts */
  const oh=HSHIFT._openHours(DATA.staffing_plans, DATA.coverage_cases).map(x=>x.town+': '+x.when);
  ok('open hours: unfilled squares only (Mon is filled), done plans left out, open hours cases in', JSON.stringify(oh)==='["Branson: Tue, 9am to 1pm","Nixa: Wed and Fri, 8am to 12pm","Republic: Tue, Nov 10, 2pm to 6pm"]', oh);
  ok('the words are hers, filled in', HSHIFT._draft('Orla','Krystal',[{ town:'Nixa', when:'Wed and Fri, 8am to 12pm' }],'Monday, November 10','orientation')==="Hi Orla, this is Krystal with Caring Companions. We have shifts that need you in Nixa: Wed and Fri, 8am to 12pm. We'd love for you to start by Monday, November 10, so please finish your online orientation as soon as you can. Questions? Reply here or call us at (417) 234-8494.");
  ok('...each stage names its own next step', /signing your offer/.test(HSHIFT._draft('a','b',[{town:'x',when:'y'}],'z','offer')) && /your Step 1 as/.test(HSHIFT._draft('a','b',[{town:'x',when:'y'}],'z','step1')) && /Viventium Step 2 forms/.test(HSHIFT._draft('a','b',[{town:'x',when:'y'}],'z','step2')));
  ok('...two towns: each time says its town', /in Nixa and Branson: Wed, 8am in Nixa; Tue, 9am in Branson\./.test(HSHIFT._draft('a','b',[{town:'Nixa',when:'Wed, 8am'},{town:'Branson',when:'Tue, 9am'}],'z','step1')));

  switchTab('orientprog'); await OPR.load(); await sleep(200);
  const orow=[...document.querySelectorAll('#tab-orientprog .orp-row')].find(r=>/Orla Late/.test(r.innerText));
  ok('Orientation (not finished): the Tell them about shifts button', orow && orow.querySelector('.hrm-shifts'), orow && orow.innerHTML.slice(0,300));
  orow.querySelector('.hrm-shifts').click(); await sleep(300);
  const box=()=>document.getElementById('hshBox');
  const rows=()=>[...box().querySelectorAll('.hsh-row')].map(x=>x.innerText.replace(/\s+/g,' ').trim());
  ok('the window lists the open hours, closest to their zip (from their application) first, with miles', box() && /Closest to 65807 first/.test(box().innerText) && /^Nixa Wed and Fri, 8am to 12pm Team Builder · [\d.]+ mi$/.test(rows()[0]) && /^Branson/.test(rows()[1]) && /^Republic/.test(rows()[2]), rows());
  ok('...town only: no client name anywhere in the window', !/Joe Jones|Mary Smith|Secret Client/.test(box().innerText), box().innerText);
  ok('...nothing picked yet: no draft, Send off', document.getElementById('hshText').value==='' && document.getElementById('hshSend').disabled);
  box().querySelector('input[type=checkbox]').click(); await sleep(50);
  document.getElementById('hshStart').value='2026-11-10'; document.getElementById('hshStart').dispatchEvent(new Event('change')); await sleep(50);
  const txt=document.getElementById('hshText').value;
  ok('picking Nixa and a date writes her words with the office person\'s name', txt==="Hi Orla, this is Krystal with Caring Companions. We have shifts that need you in Nixa: Wed and Fri, 8am to 12pm. We'd love for you to start by Tuesday, November 10, so please finish your online orientation as soon as you can. Questions? Reply here or call us at (417) 234-8494.", txt);
  document.getElementById('hshText').value=txt.replace('Questions?','Any questions?');
  document.getElementById('hshSend').click(); await sleep(200);
  ok('Send: through their application\'s text (recorded on their row), with the office\'s edit, then the window closes', INV.some(([n,b])=>n==='applicant-text' && b.action==='send' && b.id==='app-orla' && /Any questions\?/.test(b.message)) && !box(), INV);

  /* no application found: the office text */
  window.__APPS=[]; INV.length=0;
  switchTab('offers'); await sleep(1300);
  for(let i=0;i<30 && !(window.HSTRIP_ENGINE && HSTRIP_ENGINE.offers().length);i++) await sleep(100);
  (0,eval)("OFF_STAGE='sent'; OFF_STAGE_PICKED=true;"); HSTRIP_ENGINE.renderOffers(); await sleep(150);
  const card=[...document.querySelectorAll('#offersList details')].find(d=>/Olive Offer/.test(d.innerText));
  ok('Offers (sent): the button on the card line', card && card.querySelector('summary .hrm-shifts'));
  card.querySelector('.hrm-shifts').click(); await sleep(300);
  ok('...it does not open the card, and the window says their zip is not on file', !card.open && /zip is not on file/.test(box().innerText), box() && box().innerText.slice(0,200));
  box().querySelector('input[type=checkbox]').click(); await sleep(50);
  ok('...the offer stage asks them to finish signing their offer', /please finish signing your offer as soon as you can/.test(document.getElementById('hshText').value));
  document.getElementById('hshText').value=document.getElementById('hshText').value+' —'; window.alert=m=>window.__al=m;
  document.getElementById('hshSend').click(); await sleep(100);
  ok('a long dash is refused before anything goes', /long dash/.test(window.__al||'') && !INV.length);
  document.getElementById('hshText').value=document.getElementById('hshText').value.replace(' —','');
  document.getElementById('hshSend').click(); await sleep(200);
  ok('...no application on file: the office text (send-candidate-message) with their first name and phone', INV.some(([n,b])=>n==='send-candidate-message' && b.first==='Olive' && b.phone==='4175550301' && /signing your offer/.test(b.message)), INV);
  return R;
}
"""
MIME = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.json':'application/json', '.webmanifest':'application/json', '.webp':'image/webp'}
def serve(route):
    url = route.request.url
    if 'supabase.co' in url: return route.abort()
    if not url.startswith('http://hsh.local/'): return route.continue_()
    p = (ROOT / url.split('http://hsh.local/', 1)[1].split('?')[0].split('#')[0])
    if not p.is_file(): return route.fulfill(status=404, body='')
    route.fulfill(status=200, body=p.read_bytes(), content_type=MIME.get(p.suffix, 'application/octet-stream'))
with sync_playwright() as pw:
    b = pw.chromium.launch(); cx = b.new_context(viewport={'width': 1280, 'height': 900}, timezone_id='America/Chicago'); pg = cx.new_page()
    pg.route('**/*', serve)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    if SHOTS: os.makedirs(SHOTS, exist_ok=True)
    pg.goto('http://hsh.local/index.html?proof=hsh'); pg.wait_for_timeout(1500)
    R = pg.evaluate(T)
    if SHOTS:
        pg.evaluate("()=>{ switchTab('orientprog'); }"); pg.wait_for_timeout(300)
        pg.evaluate("()=>{ const b=[...document.querySelectorAll('#tab-orientprog .hrm-shifts')][0]; if(b) b.click(); }"); pg.wait_for_timeout(500)
        pg.evaluate("()=>{ const c=document.querySelector('#hshBox input[type=checkbox]'); if(c) c.click(); }"); pg.wait_for_timeout(200)
        pg.screenshot(path=os.path.join(SHOTS, 'tell_shifts.png'))
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

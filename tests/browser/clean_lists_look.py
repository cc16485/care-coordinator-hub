"""Clean lists (Samantha 2026-11-03, part 4 of her applicant plan): an interview that passed with no outcome never drops off
Interviews; turned-down offers older than 30 days fold away under Older. The real Hub page, offline (files served from this folder), made-up people only; every send is answered here and
recorded, nothing reaches anyone. (python3 tests/browser/hire_remind_look.py; SHOTS=<dir> also saves screenshots)"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = os.environ.get('SHOTS')
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const D=864e5, ago=ms=>new Date(Date.now()-ms).toISOString(), soon=ms=>new Date(Date.now()+ms).toISOString();
  const OFFS=[{ id:'r-new', name:'Fake Declined Recent', interview_date:ago(10*D).slice(0,10), onboarding_path:'new', offer_declined_at:ago(5*D) },
              { id:'r-old', name:'Fake Withdrawn Old', interview_date:ago(80*D).slice(0,10), onboarding_path:'new', offer_withdrawn_at:ago(70*D) },
              { id:'s-1', name:'Fake Still Sent', interview_date:ago(2*D).slice(0,10), onboarding_path:'new' }];
  window.fetch=async(u)=>{ u=String(u); if(u.includes('hub-training-data')) return new Response(JSON.stringify(u.includes('job_offers')?OFFS:[]),{status:200}); return new Response('{}',{status:200}); };
  (0,eval)("trainHubTok=async()=>'t'");
  const Q=[];
  window.__from=(tb)=>{ const st={ tb, eq:null, in:null, gte:null };
    const q={ select:()=>q, order:()=>q, limit:()=>q, eq:(c,v)=>{ st.eq=[c,v]; return q; }, in:(c,v)=>{ st.in=[c,v]; return q; }, gte:(c,v)=>{ st.gte=[c,v]; return q; }, not:()=>q, is:()=>q,
      then:(ok,no)=>{ Q.push(JSON.parse(JSON.stringify(st))); let data=[];
        if(tb==='interview_bookings' && st.eq && st.eq[1]==='booked') data=[{ id:'old', applicant_id:'a1', status:'booked', starts_at:ago(20*D) }, { id:'up', applicant_id:'a2', status:'booked', starts_at:soon(2*D) }];
        if(tb==='interview_bookings' && st.in) data=[{ id:'att', applicant_id:'a3', status:'attended', starts_at:ago(3*D) }];
        if(tb==='job_applicants') data=[{ id:'a1', first_name:'Fake', last_name:'Forgotten', phone:'4175550101' }, { id:'a2', first_name:'Fake', last_name:'Upcoming', phone:'4175550102' }, { id:'a3', first_name:'Fake', last_name:'Came', phone:'4175550103' }];
        return Promise.resolve({ data, error:null }).then(ok,no); } };
    return q; };
  (0,eval)("sb=new Proxy(sb||{},{ get:(t,k)=>k==='from'?window.__from:k==='functions'?{ invoke:async()=>({ data:{ ok:true, rows:[] }, error:null }) }:(typeof t[k]==='function'?t[k].bind(t):t[k]) });");
  (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha Troutman' };"); CC_ROLES=['owner_admin']; CC_ROLES_CHECKED=true; CC_ROLE_BY_EMAIL['samantha@mo-care.com']=['owner_admin'];
  DATA.ops_settings=DATA.ops_settings||{};
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; await sleep(300);

  switchTab('interviews'); await sleep(600);
  const ivb=Q.filter(x=>x.tb==='interview_bookings');
  ok('Interviews reads every booking still marked booked, however old, and attended/no-shows for 14 days', ivb.some(x=>x.eq&&x.eq[1]==='booked'&&!x.gte) && ivb.some(x=>x.in&&x.gte), ivb);
  const t=document.getElementById('ivqList').innerText;
  ok('...an interview 20 days ago with no outcome is still in "waiting on an outcome", with its day and how long', /1 waiting on an outcome/.test(t) && /Fake Forgotten/.test(t) && /20 days ago, no outcome yet/.test(t) && /[A-Z][a-z]{2} \d+, \d+:\d\d [AP]M/.test(t), t.slice(0,400));
  ok('...the upcoming one is listed as before', /Fake Upcoming/.test(t), t.slice(0,400));

  switchTab('offers'); await sleep(1300);
  for(let i=0;i<30 && !(window.HSTRIP_ENGINE && HSTRIP_ENGINE.offers().length);i++) await sleep(100);
  (0,eval)("OFF_STAGE='rejected'; OFF_STAGE_PICKED=true;"); HSTRIP_ENGINE.renderOffers(); await sleep(150);
  const L=document.getElementById('offersList');
  const top=[...L.children].filter(x=>x.tagName==='DETAILS' && x.id!=='offOldRej').map(x=>x.innerText);
  ok('Offer rejected: the last 30 days show', top.some(x=>/Fake Declined Recent/.test(x)) && !top.some(x=>/Fake Withdrawn Old/.test(x)), top);
  const old=document.getElementById('offOldRej');
  ok('...older ones fold away under Older, kept for the record, closed', old && !old.open && /Older · 1/.test(old.querySelector('summary').innerText) && /Fake Withdrawn Old/.test(old.textContent), old && old.textContent.slice(0,200));
  const counts=HSTRIP_ENGINE.offerStage ? (()=>{ try{ return (0,eval)('typeof offerStageCounts')==='function' ? null : null; }catch(e){ return null; } })() : null;
  const nav=[...document.querySelectorAll('#tab-offers button, #tab-offers [onclick]')].map(x=>x.innerText.replace(/\s+/g,' ').trim()).find(x=>/Offer rejected/.test(x)) || '';
  ok('...and the Offer rejected count is the last 30 days (1, not 2)', /Offer rejected\s*1\b/.test(nav), nav);
  return R;
}
"""
MIME = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.json':'application/json', '.webmanifest':'application/json', '.webp':'image/webp'}
def serve(route):
    url = route.request.url
    if 'supabase.co' in url: return route.abort()
    if not url.startswith('http://clean.local/'): return route.continue_()
    p = (ROOT / url.split('http://clean.local/', 1)[1].split('?')[0].split('#')[0])
    if not p.is_file(): return route.fulfill(status=404, body='')
    route.fulfill(status=200, body=p.read_bytes(), content_type=MIME.get(p.suffix, 'application/octet-stream'))
with sync_playwright() as pw:
    b = pw.chromium.launch(); cx = b.new_context(viewport={'width': 1280, 'height': 900}, timezone_id='America/Chicago'); pg = cx.new_page()
    pg.route('**/*', serve)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    if SHOTS: os.makedirs(SHOTS, exist_ok=True)
    pg.goto('http://clean.local/index.html?proof=clean'); pg.wait_for_timeout(1500)
    R = pg.evaluate(T)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

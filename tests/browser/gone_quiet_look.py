"""Caregivers > Gone quiet (Samantha 2026-11-04: caregivers who stopped picking up shifts get the "still wanting to work with
us?" check-in; NO or no answer goes to her sign-off). The real Hub page, offline (files served from this folder), made-up
people only; every server call is answered here and recorded, nothing reaches anyone.
(python3 tests/browser/gone_quiet_look.py; SHOTS=<dir> also saves screenshots)"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = os.environ.get('SHOTS')
T = r"""
async(asOwner)=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const D=864e5, ymd=ms=>new Date(Date.now()+ms).toISOString().slice(0,10), ago=ms=>new Date(Date.now()-ms).toISOString();
  window.__ROWS=[
    { id:'r1', axiscare_id:'101', name:'Fake Jordan', team:'caregiver', last_visit:ymd(-43*D), days_quiet:43, phone:'4175551001', email:'j@example.com', state:'ready' },
    { id:'r2', axiscare_id:'102', name:'Fake Casey', team:'prn', last_visit:ymd(-66*D), days_quiet:66, phone:'4175551002', email:'', state:'ready' },
    { id:'r3', axiscare_id:'103', name:'Fake Taylor', team:'caregiver', last_visit:ymd(-35*D), state:'asked', asked_at:ago(2*D), asked_by:'Krystal Land', answer_by:ymd(5*D), texted:true, emailed:true },
    { id:'r4', axiscare_id:'104', name:'Fake Morgan', team:'caregiver', state:'yes', asked_at:ago(6*D), answered_at:ago(5*D), shift_by:ymd(9*D) },
    { id:'r5', axiscare_id:'105', name:'Fake Riley', team:'caregiver', state:'card', asked_at:ago(3*D), answer_text:'who is this?' },
    { id:'r6', axiscare_id:'106', name:'Fake Avery', team:'caregiver', last_visit:ymd(-50*D), state:'to_owner', answer:null, to_owner_why:'No answer by Oct 30 (asked Oct 23).' },
    { id:'r7', axiscare_id:'107', name:'Fake Stopper', team:'caregiver', state:'to_owner', answer:'stop', to_owner_why:'They replied STOP to the check-in (no goodbye text will go).' },
    { id:'r8', axiscare_id:'108', name:'Fake Leave', team:'caregiver', state:'skipped', skip_note:'On approved leave', skip_by:'Krystal Land' } ];
  window.__INV=[]; window.__live=true;
  window.__inv=async(n,o)=>{ const b=o&&o.body; window.__INV.push([n,b]);
    if(n!=='gone-quiet') return { data:{ ok:true }, error:null };
    if(b.action==='list') return { data:{ ok:true, live:window.__live, rows:window.__ROWS, built:ago(1*D) }, error:null };
    if(b.action==='send') return { data: window.__live ? { ok:true, texted:['Fake Jordan'], emailed:['Fake Jordan'], not_sent:[], off:[] } : { ok:true, texted:[], emailed:[], not_sent:[], off:['Fake Jordan'] }, error:null };
    if(b.action==='approve') return { data:{ ok:true, goodbye_sent:true }, error:null };
    return { data:{ ok:true }, error:null }; };
  (0,eval)("sb=new Proxy(sb||{},{ get:(t,k)=>k==='functions'?{ invoke:(n,o)=>window.__inv(n,o) }:(typeof t[k]==='function'?t[k].bind(t):t[k]) });");
  (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha Troutman' };");
  (0,eval)("CC_ROLES="+(asOwner?"['owner_admin']":"['care_coordinator']")+"; CC_ROLES_CHECKED=true;");
  window.__cf=[]; window.__toast=[]; window.__prompts=[];
  (0,eval)("ccConfirm=async m=>{ window.__cf.push(String(m)); return true; }; ccToast=m=>window.__toast.push(String(m));");
  window.prompt=(m)=>{ window.__prompts.push(String(m)); return window.__answer; };
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; await sleep(300);
  CGD.census={ caregivers:[{ id:'101', first:'Fake', last:'Jordan', active:true, status_label:'Active' }] }; CGD.at=Date.now();
  switchTab('cgdir'); await sleep(200);
  const pill=document.querySelector('#cgdFilters [data-cf="gonequiet"]');
  ok('Caregivers > Directory has a Gone quiet filter, next to Inactive', pill && pill.previousElementSibling && pill.previousElementSibling.dataset.cf==='inactive');
  pill.click(); await sleep(400);
  const box=document.getElementById('cgdList'), txt=()=>box.innerText;
  ok('...it reads the list from the server (gone-quiet list)', window.__INV.some(([n,b])=>n==='gone-quiet' && b.action==='list'));
  ok('...the pill shows how many are ready to ask', /Gone quiet · 2/.test(pill.innerText), pill.innerText);
  ok('three parts: Ready to ask 2, Waiting on an answer 3, Waiting on Samantha 2', /Ready to ask · 2/.test(txt()) && /Waiting on an answer · 3/.test(txt()) && /Waiting on Samantha · 2/.test(txt()), txt().slice(0,600));
  ok('ready rows: last visit and days ago, PRN marked, how they will be reached', /Last visit [A-Z][a-z]{2} \d+\s*43 days ago/.test(txt()) && /Fake Casey\s*PRN/.test(txt()) && /Text and email/.test(txt()) && /Text only \(no email\)/.test(txt()), txt().slice(0,800));
  ok('both are ticked to start; the button says how many', /Send check-in to 2 ticked/.test(txt()));
  box.querySelectorAll('.gq-4 input[type=checkbox]')[1].click(); await sleep(50);
  ok('unticking one changes the count', /Send check-in to 1 ticked/.test(txt()));
  [...box.querySelectorAll('button')].find(b=>/Send check-in/.test(b.innerText)).click(); await sleep(300);
  const sent=window.__INV.find(([n,b])=>b && b.action==='send');
  ok('Send asks first, then sends only the ticked one', window.__cf.some(m=>/still wanting to work with us\?" text and email to 1 caregiver\?/.test(m)) && sent && JSON.stringify(sent[1].ids)==='["r1"]', [window.__cf, sent]);
  ok('...and says what went', window.__toast.some(m=>/Sent: 1 text, 1 email/.test(m)), window.__toast);
  window.__answer=''; [...box.querySelectorAll('a')].find(a=>/Not this one/.test(a.innerText)).click(); await sleep(100);
  ok('Not this one needs a note (nothing saved without one)', !window.__INV.some(([n,b])=>b && b.action==='skip'));
  window.__answer='On approved leave'; [...box.querySelectorAll('a')].find(a=>/Not this one/.test(a.innerText)).click(); await sleep(200);
  ok('...with a note it is saved', window.__INV.some(([n,b])=>b && b.action==='skip' && b.note==='On approved leave'));
  ok('asked: who asked and when it goes to Samantha', /Asked [A-Z][a-z]{2} \d+ by Krystal/.test(txt()) && /Goes to Samantha [A-Z][a-z]{2} \d+ if they don't answer/.test(txt()), txt());
  ok('YES: when, the shift-by date, and Find them a shift', /Said YES [A-Z][a-z]{2} \d+/.test(txt()) && /Needs a shift by [A-Z][a-z]{2} \d+/.test(txt()) && [...box.querySelectorAll('button')].some(b=>/Find them a shift/.test(b.innerText)));
  ok('unclear reply: their words, Mark as YES and Send to Samantha', /who is this\?/.test(txt()) && [...box.querySelectorAll('button')].some(b=>/Send to Samantha/.test(b.innerText)));
  ok('Recently closed shows the skipped one with its note', /Not this one: On approved leave \(Krystal\)/.test(box.querySelector('details').innerText.replace(/\s+/g,' ')) || /Not this one: On approved leave/.test(box.querySelector('details').textContent), box.querySelector('details') && box.querySelector('details').textContent);
  ok('no page text says "AI" or uses an em dash', !/\bAI\b/.test(txt()) && !/—/.test(txt()));
  if(asOwner){
    const ap=[...box.querySelectorAll('button')].filter(b=>/^Approve/.test(b.innerText));
    ok('owner: Approve, send goodbye for no answer; just Approve after a STOP; Keep them', ap.length===2 && /Approve, send goodbye/.test(ap[0].innerText) && ap[1].innerText.trim()==='Approve' && [...box.querySelectorAll('button')].some(b=>/Keep them/.test(b.innerText)), ap.map(b=>b.innerText));
    ap[0].click(); await sleep(300);
    ok('...Approve asks first, then calls approve for that one', window.__cf.some(m=>/Approve ending Fake Avery's employment\? The goodbye text goes now\./.test(m)) && window.__INV.some(([n,b])=>b && b.action==='approve' && b.id==='r6'), window.__cf);
    ok('...and points to the Owners Hub checklist', window.__toast.some(m=>/The goodbye went\. Finish the checklist on the Owners Hub/.test(m)) && /open Offboarding/.test(txt()), window.__toast);
  } else {
    ok('not an owner: no Approve or Keep, "Samantha decides"', ![...box.querySelectorAll('button')].some(b=>/^Approve|Keep them/.test(b.innerText)) && /Samantha decides/.test(txt()));
  }
  window.__live=false; GQ.reload(); await sleep(300);
  ok('switch off: a plain note says Send sends nothing yet', /The check-in switch is off/.test(txt()));
  [...box.querySelectorAll('button')].find(b=>/Send check-in/.test(b.innerText)).click(); await sleep(300);
  ok('...and Send says nothing was sent', window.__toast.some(m=>/The switch is off: nothing was sent/.test(m)), window.__toast);
  window.__live=true; GQ.reload(); await sleep(300);
  const nm=box.querySelector('.gq-row a'); let opened=null; window.cgdOpenProfile=(ax)=>{ opened=ax; }; (0,eval)("cgdOpenProfile=window.cgdOpenProfile"); nm.click(); await sleep(50);
  ok('every name opens the caregiver profile', opened==='101', opened);
  return R;
}
"""
MIME = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.json':'application/json', '.webmanifest':'application/json', '.webp':'image/webp'}
def serve(route):
    url = route.request.url
    if 'supabase.co' in url: return route.abort()
    if not url.startswith('http://gq.local/'): return route.continue_()
    p = (ROOT / url.split('http://gq.local/', 1)[1].split('?')[0].split('#')[0])
    if not p.is_file(): return route.fulfill(status=404, body='')
    route.fulfill(status=200, body=p.read_bytes(), content_type=MIME.get(p.suffix, 'application/octet-stream'))
R = []
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for owner in (True, False):
        cx = b.new_context(viewport={'width': 1280, 'height': 900}, timezone_id='America/Chicago'); pg = cx.new_page()
        pg.route('**/*', serve)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        pg.goto('http://gq.local/index.html?proof=gq'); pg.wait_for_timeout(1500)
        R += [[s, ('owner · ' if owner else 'office · ') + n, d] for s, n, d in pg.evaluate(T, owner)]
        if SHOTS and owner:
            os.makedirs(SHOTS, exist_ok=True); pg.evaluate("()=>{ GQ.reload(); }"); pg.wait_for_timeout(400)
            pg.locator('#tab-cgdir').screenshot(path=os.path.join(SHOTS, 'gone_quiet.png'))
        R.append(['PASS' if not errs else 'FAIL', ('owner' if owner else 'office') + ' · no page errors', errs[:3]])
        cx.close()
    pg = b.new_page(viewport={'width': 390, 'height': 800}); pg.route('**/*', serve)
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

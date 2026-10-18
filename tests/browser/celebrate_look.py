"""Celebrations where work finishes (2026-10-18, fun step 2, her "build step 2 as shown"): the Care began stamp and the key
turning once for the client's Care Coordinator; the Oriented cap stamp popping once in the first two weeks; the Full house
stamp only when every visit tomorrow has a caregiver and AxisCare sent the whole day; the End my shift sunset in words.
The real page, offline, made-up people. (python3 tests/browser/celebrate_look.py; SHOT=dir saves screenshots)"""
import os, re, sys, mimetypes
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
STUB = re.search(r'STUB = r"""(.*?)"""', open(os.path.join(HERE, 'standup_look.py')).read(), re.S).group(1)
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  try{
  try{ localStorage.clear(); }catch(e){}
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Land', shift:'day' };");
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  ok('celebrate.js loaded', !!window.CEL);

  /* ── first visit ── */
  const mkBox=()=>{ const b=document.createElement('div'); b.innerHTML='<div class="n9"><div class="n9-top"><h3>Start of Care complete</h3></div><div class="n9-dates"></div></div>'; document.body.appendChild(b); return b; };
  let b1=mkBox(); CEL.firstVisit(b1, { id:'j1', assigned_cc:'krystal@mo-care.com' }, '2026-10-18T14:02:00Z', 'Rose Able');
  ok('first visit · her own client: the Care began stamp with the date, and the key scene', !!b1.querySelector('[data-cel="began"].pop') && /OCT 18/.test(b1.querySelector('[data-cel="began"]').innerHTML) && !!b1.querySelector('.cel-key') && /Rose’s care has started\. Welcome, Rose\./.test(b1.innerText), b1.innerHTML.slice(0,300));
  CEL.firstVisit(b1, { id:'j1', assigned_cc:'krystal@mo-care.com' }, '2026-10-18T14:02:00Z', 'Rose Able');
  ok('first visit · a second call on the same card adds nothing', b1.querySelectorAll('[data-cel="began"]').length===1 && b1.querySelectorAll('.cel-key').length===1);
  b1.querySelector('.cel-key .cel-x').click();
  ok('first visit · Close takes the scene away, the stamp stays', !b1.querySelector('.cel-key') && !!b1.querySelector('[data-cel="began"]'));
  let b2=mkBox(); CEL.firstVisit(b2, { id:'j1', assigned_cc:'krystal@mo-care.com' }, '2026-10-18T14:02:00Z', 'Rose Able');
  ok('first visit · opened again: only the resting stamp, no key', !!b2.querySelector('[data-cel="began"].cel-rest') && !b2.querySelector('.cel-key'));
  let b3=mkBox(); CEL.firstVisit(b3, { id:'j2', assigned_cc:'angiel@mo-care.com' }, '2026-10-17', 'Gil Gray');
  ok('first visit · someone else\'s client: the stamp, never the key', !!b3.querySelector('[data-cel="began"].cel-rest') && !b3.querySelector('.cel-key'));
  let b4=mkBox(); CEL.firstVisit(b4, { id:'j3', assigned_cc:'krystal@mo-care.com' }, '', 'Ann Able');
  ok('first visit · no first visit yet: nothing', !b4.querySelector('[data-cel]'));

  /* ── oriented ── */
  const today=new Date().toLocaleString('sv-SE',{timeZone:'America/Chicago'}).slice(0,10);
  const old=new Date(Date.now()-30*864e5).toISOString().slice(0,10);
  const h1=CEL.orientedChip({ axiscare_id:'77', orient_date:today });
  ok('oriented · done this week: the cap pops in the first time', /data-cel="oriented"/.test(h1) && /class="cel-stamp pop"/.test(h1), h1.slice(0,120));
  ok('oriented · the next look: resting stamp', /cel-rest/.test(CEL.orientedChip({ axiscare_id:'77', orient_date:today })));
  ok('oriented · done a month ago: resting stamp, no pop', /cel-rest/.test(CEL.orientedChip({ axiscare_id:'78', orient_date:old })));
  ok('oriented · not done: nothing', CEL.orientedChip({ axiscare_id:'79' })==='' && CEL.orientedChip(null)==='');

  /* ── full house ── */
  const card=document.createElement('div'); card.id='tbShiftCard'; document.body.appendChild(card);
  let FAKE={ rows:[{ caregiver:'Bea B' },{ caregiver:'Dee D' }] }, reads=[];
  window.fetch=async(u,o)=>{ reads.push(JSON.parse(o.body)); return { ok:true, status:200, json:async()=>JSON.parse(JSON.stringify(FAKE)) }; };
  sb.auth=Object.assign({}, sb.auth, { getSession:async()=>({ data:{ session:{ access_token:'t' } } }) });
  await CEL.fullHouse(); await sleep(20);
  const tom=new Date(Date.now()+864e5).toLocaleString('sv-SE',{timeZone:'America/Chicago'}).slice(0,10);
  ok('full house · asked AxisCare about tomorrow only', reads.length===1 && reads[0].live_schedule===true && reads[0].date===tom, reads);
  ok('full house · every visit tomorrow assigned: the stamp and its words', !!card.querySelector('.cel-full [data-cel="full"].pop') && /Every visit tomorrow has a caregiver/.test(card.innerText));
  await CEL.fullHouse(); await sleep(10);
  ok('full house · second look the same day: one stamp, resting, no new read', card.querySelectorAll('.cel-full').length===1 && !!card.querySelector('.cel-rest') && reads.length===1);
  }catch(e){ R.push(['FAIL','threw',String(e&&e.stack||e).slice(0,500)]); }
  return R;
}
"""
T2 = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  try{
  /* full house when a visit is open, or AxisCare sent part of the day: no stamp (fresh page state via CEL._paintFor) */
  const card=document.getElementById('tbShiftCard');
  CEL._paintFor({ rows:[{ caregiver:'Bea B' },{ caregiver:null }] }); ok('full house · one open visit: no stamp', !card.querySelector('.cel-full'));
  CEL._paintFor({ rows:[{ caregiver:'Bea B' }], partial:'more' }); ok('full house · only part of the day: no stamp (no claim without the whole day)', !card.querySelector('.cel-full'));
  CEL._paintFor({ rows:[] }); ok('full house · no visits tomorrow: no stamp', !card.querySelector('.cel-full'));
  CEL._paintFor(null); ok('full house · AxisCare did not answer: no stamp', !card.querySelector('.cel-full'));

  /* ── end of shift ── */
  const now=new Date().toISOString(), y=new Date(Date.now()-2*864e5).toISOString();
  DATA.ops_items=[
    { id:'a', status:'done', closed_by:'krystal@mo-care.com', closed_at:now, about:'Called the Ables back about Thursday' },
    { id:'b', status:'done', closed_by:'krystal@mo-care.com', closed_at:now, about:'Got Eve Ellis\'s Thursday morning covered' },
    { id:'c', status:'done', closed_by:'samantha@mo-care.com', closed_at:now, about:'Someone else\'s work' },
    { id:'d', status:'done', closed_by:'krystal@mo-care.com', closed_at:y, about:'Two days ago' },
    { id:'e', status:'open', owner:'krystal@mo-care.com', about:'Still open' } ];
  CEL.shiftEnd({ handed:2, names:['Samantha'] }); await sleep(30);
  const sh=document.querySelector('.cel-shade'), t=sh?sh.innerText:'';
  ok('end of shift · the sunset says thank you by first name', /Thank you, Krystal\. Here’s what you got done today\./.test(t), t);
  ok('end of shift · only her own work closed today, in words', /Called the Ables back/.test(t) && /Eve Ellis/.test(t) && !/Someone else/.test(t) && !/Two days ago/.test(t) && !/Still open/.test(t));
  ok('end of shift · handoff said in words, not a number', /Handed two things to Samantha, with notes/.test(t));
  ok('end of shift · no scores or counts of done work', !/\d+ (closed|done|items|cards)/i.test(t));
  sh.querySelector('[data-cel-close]').click();
  ok('end of shift · Good night closes it', !document.querySelector('.cel-shade'));
  DATA.ops_items=[]; CEL.shiftEnd({ handed:0, names:[] }); await sleep(20);
  ok('end of shift · nothing closed: just "Rest well."', /Thank you, Krystal\. Rest well\./.test(document.querySelector('.cel-shade').innerText) && !document.querySelector('.cel-shade ul'));
  document.querySelector('.cel-shade [data-cel-close]').click();

  /* ── the wiring in the Hub's own files ── */
  const src=async f=>(await (await window.__origFetch(f+'?x='+Date.now())).text());
  ok('wired · End my shift calls the sunset after the handoff', /CEL\.shiftEnd\(\{ handed: out\.handed, names: out\.to\.map\(first\) \}\)/.test(await src('end-shift.js')));
  ok('wired · the Start of Care card calls Care began', /CEL\.firstVisit\(box, j, fv\.actual_first_visit, cpName\(\)\)/.test(await src('client-journey.js')));
  const ih=await src('index.html');
  ok('wired · the caregiver profile and the Dashboard', /CEL\.orientedChip\(/.test(ih) && /if\(window\.CEL\) CEL\.fullHouse\(\);/.test(ih) && /<script src="celebrate\.js\?v=1">/.test(ih));
  ok('no em dashes in what the celebrations say', !/—/.test(document.body.innerText.split('Celebr')[0]) );
  }catch(e){ R.push(['FAIL','threw',String(e&&e.stack||e).slice(0,500)]); }
  return R;
}
"""
def serve(route):
    path = route.request.url.split('://', 1)[1].split('/', 1)[1].split('?')[0] or 'index.html'
    f = os.path.join(ROOT, path)
    if os.path.isfile(f): route.fulfill(path=f, content_type=mimetypes.guess_type(f)[0] or 'application/octet-stream')
    else: route.fulfill(status=404, body='')
sys.path.insert(0, HERE)
from clock_pin import pin
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1300, 'height': 1000})
    pin(pg)
    pg.route('**/*', lambda r: serve(r) if r.request.url.startswith('http://hub.test/') else (r.abort() if 'supabase.co' in r.request.url else r.continue_()))
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://hub.test/index.html?proof=celebrate'); pg.wait_for_timeout(1500)
    pg.evaluate('window.__origFetch=window.fetch.bind(window)')
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T) + pg.evaluate(T2); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    shot = os.environ.get('SHOT')
    if shot:
        os.makedirs(shot, exist_ok=True)
        pg.evaluate("""async()=>{ localStorage.clear(); DATA.ops_items=[{ id:'a', status:'done', closed_by:'krystal@mo-care.com', closed_at:new Date().toISOString(), about:'Called the Ables back about Thursday' },{ id:'b', status:'done', closed_by:'krystal@mo-care.com', closed_at:new Date().toISOString(), about:'Got Eve Ellis\\'s Thursday morning covered' }];
          CEL.shiftEnd({ handed:2, names:['Samantha'] }); }""")
        pg.wait_for_timeout(2200); pg.locator('.cel-dusk').screenshot(path=os.path.join(shot, 'shift-sunset.png'))
        pg.evaluate("document.querySelector('.cel-shade').remove(); const b=document.createElement('div'); b.id='shotBox'; b.style.cssText='width:560px;background:#fff;padding:16px;position:relative;z-index:5'; b.innerHTML='<div class=\"n9\"><div class=\"n9-top\"><h3 style=\"margin:0;color:#0D365F\">Start of Care complete</h3><span class=\"field-note\">Private pay · Krystal is the Care Coordinator</span></div></div>'; document.body.prepend(b); CEL.firstVisit(b, { id:'jshot', assigned_cc:'krystal@mo-care.com' }, new Date().toISOString(), 'Rose Able');")
        pg.wait_for_timeout(2600); pg.locator('#shotBox').screenshot(path=os.path.join(shot, 'first-visit.png'))
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

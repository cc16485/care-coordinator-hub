"""Cara's shift opportunity page (2026-10-24), shift.html, on a phone-size screen, offline, against a stand-in shift-offer
server that records what it was asked. Made-up people. Proves: before the code only the shift (no client); the code step;
after the code the warm details (no last name, no street); the five big answers; part of the shift opens time pickers
limited to the shift; different hours, a note, a question; the thank-you says nothing is set until the office confirms;
a filled shift shows only a thank-you; PRN wording; the office preview sends no code and saves nothing.
(python3 tests/browser/shift_page_look.py; SHOTS=<dir> saves phone screenshots)"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = os.environ.get('SHOTS')
SERVER = r"""
(()=>{
  window.__calls=[]; window.__state='open'; window.__prn=false;
  const D=()=>({ ok:true, state:window.__state, caregiver_first:'Maria', prn:window.__prn, day:'Saturday, October 31', time:'8am to 5pm', hours:9, town:'Nixa', answered:null });
  const DET=()=>Object.assign(D(),{ client_first:'Ruth', about:'Ruth is a retired schoolteacher with a quick laugh. She loves her garden and a good cup of coffee in the afternoon.',
    enjoys:['Gardening','Old movies','Card games'], help:['Companionship','Meal preparation','Light housekeeping'], needs:["Dementia or Alzheimer's care"], home:['Cats in the home'], level:2,
    care_line:'Coffee at 10 is her favorite part of the day', time_flex:'exact', flex_minutes:null, handoff_ok:true, scene:'garden', shift_from:'08:00', shift_to:'17:00' });
  const real=window.fetch;
  window.fetch=async(url,o)=>{ url=String(url); if(!url.includes('/functions/v1/shift-offer')) return real(url,o);
    const b=JSON.parse(o.body); window.__calls.push(Object.assign({auth:(o.headers||{}).Authorization||''},b));
    const R=(x,s)=>new Response(JSON.stringify(x),{status:s||200});
    if(window.__state!=='open' && b.action!=='preview') return R({ ok:true, state:window.__state });
    if(b.action==='view') return R(D());
    if(b.action==='send_code') return R({ ok:true, sent:true, to_last4:'0101' });
    if(b.action==='verify') return b.code==='123456'?R({ ok:true, session:'S'.repeat(43) }):R({ error:"That code didn't match. 4 tries left." },401);
    if(b.action==='details'||b.action==='preview') return R(Object.assign(DET(),{preview:b.action==='preview'}));
    if(b.action==='answer') return R({ ok:true, answered:{ kind:b.kind, what:'saved' } });
    if(b.action==='preview_answer') return R({ ok:true, would_save:'Yes, I can work the whole shift' });
    return R({ error:'unknown' },400); };
})();
"""
T = r"""
async(mode)=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const txt=()=>document.body.innerText, C=window.__calls, click=(re)=>{ const b=[...document.querySelectorAll('button')].find(x=>re.test(x.textContent)); if(b) b.click(); return !!b; };
  await sleep(300);
  ok('before the code: hello, the day, time, town and hours; nothing about the client', /Hi Maria/.test(txt()) && /Saturday, October 31/.test(txt()) && /8am to 5pm/.test(txt()) && /Nixa/.test(txt()) && /9 hours/.test(txt()) && !/Ruth|teacher|Gardening/.test(txt()), txt().slice(0,500));
  ok('one clear next step: Text me a code (no password)', /Text me a code/.test(txt()) && /No password needed/.test(txt()));
  click(/Text me a code/); await sleep(200);
  ok('the code went to the phone ending 0101; the box is a one-time-code field', /phone ending in 0101/.test(txt()) && document.getElementById('code').getAttribute('autocomplete')==='one-time-code');
  document.getElementById('code').value='000000'; click(/See the shift/); await sleep(200);
  ok('a wrong code: says so, with the tries left', /4 tries left/.test(txt()));
  document.getElementById('code').value='123456'; click(/See the shift/); await sleep(300);
  const t=txt();
  ok('after the code: Meet Ruth, the office About, What she enjoys, an illustration (no photo)', /Meet Ruth/.test(t) && /retired schoolteacher/.test(t) && /Gardening/.test(t) && !!document.querySelector('.hero svg') && !document.querySelector('img'), t.slice(0,600));
  ok('what she\'d help with, the skills and level, Good to know, Exact time and the hand-off', /Companionship/.test(t) && /Level 2 shift/.test(t) && /Dementia/.test(t) && /Cats in the home/.test(t) && /Exact time/.test(t) && /Two caregivers can split it/.test(t));
  ok('the five big answers', ['Yes, I can work the whole shift','Yes, but only part of it','I can work different hours that day',"No, I can't work",'I have a question'].every(x=>t.includes(x)) && [...document.querySelectorAll('.ans')].every(b=>b.getBoundingClientRect().height>=56));
  ok('never a last name, a street or an address on the page', !/Kay|Main St|\b\d{3,5}\s+\w+\s+(St|Ave|Rd)\b/.test(t));
  click(/only part of it/); await sleep(150);
  const opts=[...document.getElementById('from').options].map(o=>o.value);
  ok('part of it: time pickers limited to the shift, 15-minute steps', opts[0]==='08:00' && opts[opts.length-1]==='17:00' && opts.includes('08:15'), opts.slice(0,4));
  document.getElementById('from').value='08:00'; document.getElementById('to').value='12:00'; document.getElementById('note').value='school pickup at 2'; click(/Send my hours/); await sleep(200);
  const ans=C.find(c=>c.action==='answer');
  ok('sent with her hours, her note and her session', ans && ans.kind==='part' && ans.from==='08:00' && ans.to==='12:00' && ans.note==='school pickup at 2' && ans.session==='S'.repeat(43), ans);
  ok('the thank-you says nothing is set until the office confirms', /Nothing is set until they confirm/.test(txt()) && /Change my answer/.test(txt()));
  click(/Change my answer/); await sleep(150); click(/different hours that day/); await sleep(150);
  ok('different hours: any time that day', [...document.getElementById('from').options][0].value==='05:00');
  click(/I have a question/); await sleep(150); document.getElementById('question').value='Are there stairs?'; click(/Send my question/); await sleep(200);
  ok('a question goes to the office, who text back from the office line', C.some(c=>c.action==='answer'&&c.kind==='question'&&c.question==='Are there stairs?') && /text you back from \(417\) 234-8494/.test(txt()));
  return R;
}
"""
MIME = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.json':'application/json'}
def serve(route):
    url = route.request.url
    if 'supabase.co' in url and 'shift-offer' not in url: return route.abort()
    if not url.startswith('http://shiftpage.local/'): return route.continue_()
    p = (ROOT / url.split('http://shiftpage.local/', 1)[1].split('?')[0].split('#')[0])
    if not p.is_file(): return route.fulfill(status=404, body='')
    route.fulfill(status=200, body=p.read_bytes(), content_type=MIME.get(p.suffix, 'application/octet-stream'))
def page(b, qs, init=''):
    cx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    cx.add_init_script(SERVER + init)
    pg = cx.new_page(); pg.route('**/*', serve)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://shiftpage.local/shift.html' + qs); pg.wait_for_timeout(500)
    return cx, pg, errs
R = []
with sync_playwright() as pw:
    b = pw.chromium.launch()
    cx, pg, errs = page(b, '?c=cv1&a=ask_1&e=9999999999&t=' + 'x' * 43)
    if SHOTS: os.makedirs(SHOTS, exist_ok=True); pg.screenshot(path=os.path.join(SHOTS, '1-before-code.png'), full_page=True)
    R += pg.evaluate(T, 'link')
    if SHOTS:
        pg.evaluate("()=>{ CHOICE=null; renderDetails(); window.scrollTo(0,0) }"); pg.wait_for_timeout(300); pg.screenshot(path=os.path.join(SHOTS, '2-details.png'), full_page=True)
        pg.evaluate("()=>{ CHOICE='part'; renderDetails(); }"); pg.wait_for_timeout(300); pg.screenshot(path=os.path.join(SHOTS, '3-part-of-it.png'), full_page=True)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors (caregiver link)', errs[:3]]); cx.close()
    cx, pg, errs = page(b, '?c=cv1&a=ask_1&e=9999999999&t=' + 'x' * 43, "window.__state='closed';")
    t = pg.inner_text('body'); R.append(['PASS' if 'This shift has been covered. Thank you for looking!' in t and 'Maria' not in t else 'FAIL', 'a filled shift: only a thank-you', t[:300]]); cx.close()
    cx, pg, errs = page(b, '?c=cv1&a=ask_2&e=9999999999&t=' + 'x' * 43, "window.__prn=true;")
    t = pg.inner_text('body'); R.append(['PASS' if 'PRN opportunity. Take it or pass, no pressure either way.' in t else 'FAIL', 'PRN Team: the PRN wording on the page', t[:300]]); cx.close()
    cx, pg, errs = page(b, '?preview=1&case=cv1&ask=ask_1', "try{localStorage.setItem('sb-zngsgedlsxinbygwmxwn-auth-token', JSON.stringify({access_token:'staff-token'}))}catch(e){}")
    t = pg.inner_text('body'); calls = pg.evaluate('window.__calls')
    R.append(['PASS' if 'Office preview: what this caregiver would see' in t and 'Meet Ruth' in t and not any(c['action'] in ('send_code', 'verify') for c in calls) and calls[0]['auth'] == 'Bearer staff-token' else 'FAIL', 'office preview: straight to the details with the Hub sign-in, no code', [t[:200], calls]])
    pg.evaluate("()=>{ [...document.querySelectorAll('.ans')][0].click() }"); pg.wait_for_timeout(150); pg.evaluate("()=>{ document.getElementById('sendAns').click() }"); pg.wait_for_timeout(250)
    t = pg.inner_text('body'); calls = pg.evaluate('window.__calls')
    R.append(['PASS' if 'Preview only: nothing was saved' in t and not any(c['action'] == 'answer' for c in calls) else 'FAIL', 'office preview: an answer saves nothing', t[:300]])
    R.append(['PASS' if not errs else 'FAIL', 'no page errors (preview)', errs[:3]]); cx.close(); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

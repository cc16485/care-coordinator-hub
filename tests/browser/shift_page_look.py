"""Cara's shift opportunity page (2026-10-24), shift.html, on a phone-size screen, offline, against a stand-in shift-offer
server that records what it was asked. Made-up people. Proves: no code (her call): the link opens the shift and the warm
details (no last name, no street); one time or every week, with "I'd like this every Saturday" on an every-week shift; the
five big answers; part of the shift opens time pickers limited to the shift; different hours, a note, a question; each answer
carries the hours it was for; a shift that changed while they looked reloads with the new details; a changed, filled or
taken-back shift shows only a message; PRN wording; the office preview saves nothing.
(python3 tests/browser/shift_page_look.py; SHOTS=<dir> saves phone screenshots)"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = os.environ.get('SHOTS')
SERVER = r"""
(()=>{
  window.__calls=[]; window.__state='open'; window.__prn=false; window.__pattern={ kind:'ongoing', weekday:'Saturday', label:'Open every Saturday', sub:'We need this one covered, and it could become your regular shift if you want it.', upcoming:3 }; window.__changeOnce=false;
  const DET=()=>({ ok:true, state:window.__state, caregiver_first:'Maria', prn:window.__prn, day:'Saturday, October 31', time:'8am to 5pm', hours:9, town:'Nixa', answered:null,
    client_first:'Ruth', about:'Ruth is a retired schoolteacher with a quick laugh. She loves her garden and a good cup of coffee in the afternoon.',
    enjoys:['Gardening','Old movies','Card games'], help:['Companionship','Meal preparation','Light housekeeping'], needs:["Dementia or Alzheimer's care"], home:['Cats in the home'], level:2,
    care_line:'Coffee at 10 is her favorite part of the day', time_flex:'exact', flex_minutes:null, handoff_ok:true, scene:'garden', shift_from:'08:00', shift_to:'17:00', shift_key:'2026-10-31|08:00-17:00', pattern:window.__pattern });
  const real=window.fetch;
  window.fetch=async(url,o)=>{ url=String(url);
    if(url.includes('/functions/v1/caregiver-preview')){ const b=JSON.parse(o.body); window.__calls.push(Object.assign({fn:'caregiver-preview',auth:(o.headers||{}).Authorization||''},b));
      return new Response(JSON.stringify(Object.assign(DET(),{ preview:true, sample:true, version:b.version, caregiver_first:'there', day:'Saturday, October 31', time:'8am to 12pm', hours:4, pattern:null, about:b.version==='draft'?'Ruth taught school for 30 years.':DET().about })),{status:200}); }
    if(!url.includes('/functions/v1/shift-offer')) return real(url,o);
    const b=JSON.parse(o.body); window.__calls.push(Object.assign({auth:(o.headers||{}).Authorization||''},b));
    const R=(x,s)=>new Response(JSON.stringify(x),{status:s||200});
    if(window.__state!=='open' && b.action!=='preview') return R({ ok:true, state:window.__state });
    if(b.action==='view'||b.action==='preview') return R(Object.assign(DET(),{preview:b.action==='preview'}));
    if(b.action==='answer'){ if(window.__changeOnce){ window.__changeOnce=false; return R({ error:'This shift changed while you were looking.', changed:true },409); } return R({ ok:true, answered:{ kind:b.kind, what:'saved' } }); }
    if(b.action==='preview_answer') return R({ ok:true, would_save:'Yes, I can work the whole shift' });
    return R({ error:'unknown' },400); };
})();
"""
T = r"""
async(mode)=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const txt=()=>document.body.innerText, C=window.__calls, click=(re)=>{ const b=[...document.querySelectorAll('button')].find(x=>re.test(x.textContent)); if(b) b.click(); return !!b; };
  await sleep(400);
  const t=txt();
  ok('no code: the link opens straight to the shift and Meet Ruth; nothing is texted', /Hi Maria, we have an open shift you might like/.test(t) && /Meet Ruth/.test(t) && !/code/i.test(t) && C[0].action==='view' && !C.some(c=>/code|verify/.test(c.action)), t.slice(0,400));
  ok('one time or every week: "Open every Saturday" and that it could become theirs', /Open every Saturday/.test(t) && /could become your regular shift/.test(t));
  ok('the office About, What she enjoys, an illustration (no photo)', /retired schoolteacher/.test(t) && /Gardening/.test(t) && !!document.querySelector('.hero svg') && !document.querySelector('img'));
  ok('what she\'d help with, the skills and level, Good to know, Exact time and the hand-off', /Companionship/.test(t) && /Level 2 shift/.test(t) && /Cats in the home/.test(t) && /Exact time/.test(t) && /Two caregivers can split it/.test(t));
  ok('the five big answers', ['Yes, I can work the whole shift','Yes, but only part of it','I can work different hours that day',"No, I can't work",'I have a question'].every(x=>t.includes(x)) && [...document.querySelectorAll('.ans')].every(b=>b.getBoundingClientRect().height>=56));
  ok('never a last name, a street or an address on the page', !/Kay|Main St|\b\d{3,5}\s+\w+\s+(St|Ave|Rd)\b/.test(t));
  click(/whole shift/); await sleep(150);
  ok('an every-week shift: "I\'d like this every Saturday as my regular shift" beside the yes', /I'd like this every Saturday as my regular shift/.test(txt()) && !!document.getElementById('regular'));
  document.getElementById('regular').checked=true; click(/Send: yes, the whole shift/); await sleep(200);
  let ans=C.filter(c=>c.action==='answer').pop();
  ok('sent: yes, the regular-shift wish, and the hours it was for', ans && ans.kind==='full' && ans.regular===true && ans.shift_key==='2026-10-31|08:00-17:00', ans);
  ok('the thank-you says nothing is set until the office confirms', /Nothing is set until they do/.test(txt()));
  click(/Change my answer/); await sleep(150); click(/No, I can't work/); await sleep(150);
  ok('no regular-shift box with a no', !document.getElementById('regular'));
  click(/only part of it/); await sleep(150);
  const opts=[...document.getElementById('from').options].map(o=>o.value);
  ok('part of it: time pickers limited to the shift, 15-minute steps', opts[0]==='08:00' && opts[opts.length-1]==='17:00' && opts.includes('08:15'), opts.slice(0,4));
  document.getElementById('from').value='08:00'; document.getElementById('to').value='12:00'; document.getElementById('note').value='school pickup at 2';
  window.__changeOnce=true; click(/Send my hours/); await sleep(400);
  ok('the shift changed while she looked: the page reloads the new details and says so; nothing saved', /The shift changed while you were looking/.test(txt()) && C.filter(c=>c.action==='view').length>=2);
  click(/only part of it/); await sleep(150); document.getElementById('from').value='08:00'; document.getElementById('to').value='12:00'; click(/Send my hours/); await sleep(200);
  ans=C.filter(c=>c.action==='answer').pop();
  ok('then sent with her hours and the current shift', ans && ans.kind==='part' && ans.from==='08:00' && ans.to==='12:00' && ans.shift_key==='2026-10-31|08:00-17:00', ans);
  click(/Change my answer/); await sleep(150); click(/I have a question/); await sleep(150); document.getElementById('question').value='Are there stairs?'; click(/Send my question/); await sleep(200);
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
    R += pg.evaluate(T, 'link')
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True)
        pg.evaluate("()=>{ D.answered=null; CHOICE=null; renderDetails(); window.scrollTo(0,0) }"); pg.wait_for_timeout(300); pg.screenshot(path=os.path.join(SHOTS, '1-every-week.png'), full_page=True)
        pg.evaluate("()=>{ CHOICE='full'; renderDetails(); }"); pg.wait_for_timeout(300); pg.screenshot(path=os.path.join(SHOTS, '2-yes-regular.png'), full_page=True)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors (caregiver link)', errs[:3]]); cx.close()
    cx, pg, errs = page(b, '?c=cv1&a=ask_1&e=9999999999&t=' + 'x' * 43, "window.__pattern={ kind:'one_time', weekday:'Saturday', label:'This week only', sub:'The regular caregiver is back after this.', upcoming:null };")
    pg.evaluate("()=>{ [...document.querySelectorAll('.ans')][0].click() }"); pg.wait_for_timeout(150)
    t = pg.inner_text('body'); R.append(['PASS' if 'This week only' in t and 'The regular caregiver is back after this.' in t and 'as my regular shift' not in t else 'FAIL', 'a one-time cover: "This week only", and no regular-shift box', t[:400]])
    if SHOTS: pg.evaluate("()=>{ CHOICE=null; renderDetails(); window.scrollTo(0,0) }"); pg.wait_for_timeout(300); pg.screenshot(path=os.path.join(SHOTS, '3-this-week-only.png'), full_page=False)
    cx.close()
    for st, want in (('closed', 'This shift has been covered. Thank you for looking!'), ('changed', "This shift's day or hours changed. The office will send you the new details."), ('gone', "This shift isn't available any more. Thank you!")):
        cx, pg, errs = page(b, '?c=cv1&a=ask_1&e=9999999999&t=' + 'x' * 43, "window.__state='" + st + "';")
        t = pg.inner_text('body'); R.append(['PASS' if want in t and 'Ruth' not in t and 'Maria' not in t else 'FAIL', 'state ' + st + ': only the message, nothing about the client', t[:300]]); cx.close()
    cx, pg, errs = page(b, '?c=cv1&a=ask_2&e=9999999999&t=' + 'x' * 43, "window.__prn=true;")
    t = pg.inner_text('body'); R.append(['PASS' if 'PRN opportunity. Take it or pass, no pressure either way.' in t else 'FAIL', 'PRN Team: the PRN wording on the page', t[:300]]); cx.close()
    cx, pg, errs = page(b, '?preview=1&case=cv1&ask=ask_1', "try{localStorage.setItem('sb-zngsgedlsxinbygwmxwn-auth-token', JSON.stringify({access_token:'staff-token'}))}catch(e){}")
    t = pg.inner_text('body'); calls = pg.evaluate('window.__calls')
    R.append(['PASS' if 'Office preview: what this caregiver would see. Nothing is saved.' in t and 'Meet Ruth' in t and calls[0]['action'] == 'preview' and calls[0]['auth'] == 'Bearer staff-token' else 'FAIL', 'office preview: the details with the Hub sign-in', [t[:200], calls]])
    pg.evaluate("()=>{ [...document.querySelectorAll('.ans')][0].click() }"); pg.wait_for_timeout(150); pg.evaluate("()=>{ document.getElementById('sendAns').click() }"); pg.wait_for_timeout(250)
    t = pg.inner_text('body'); calls = pg.evaluate('window.__calls')
    R.append(['PASS' if 'Preview only: nothing was saved' in t and not any(c['action'] == 'answer' for c in calls) else 'FAIL', 'office preview: an answer saves nothing', t[:300]])
    R.append(['PASS' if not errs else 'FAIL', 'no page errors (preview)', errs[:3]]); cx.close()
    for v, want in (('approved', 'retired schoolteacher'), ('draft', 'taught school for 30 years')):
        cx, pg, errs = page(b, '?preview=1&client=500&v=' + v, "try{localStorage.setItem('sb-zngsgedlsxinbygwmxwn-auth-token', JSON.stringify({access_token:'staff-token'}))}catch(e){}")
        t = pg.inner_text('body'); calls = pg.evaluate('window.__calls')
        R.append(['PASS' if want in t and ('Draft' if v == 'draft' else 'Approved') + ' version, on a sample shift. Nothing is sent or saved.' in t and 'Hi there' in t and calls[0].get('fn') == 'caregiver-preview' and calls[0]['axiscare_client_id'] == '500' and calls[0]['version'] == v and calls[0]['auth'] == 'Bearer staff-token' else 'FAIL', 'Caregiver Preview (' + v + '): a client\'s profile on a sample shift, no open shift needed', [t[:300], calls[:1]]])
        pg.evaluate("()=>{ [...document.querySelectorAll('.ans')][0].click() }"); pg.wait_for_timeout(150); pg.evaluate("()=>{ document.getElementById('sendAns').click() }"); pg.wait_for_timeout(250)
        t = pg.inner_text('body'); calls = pg.evaluate('window.__calls')
        R.append(['PASS' if 'Preview only: on a real shift offer, this answer would go to the office.' in t and len(calls) == 1 else 'FAIL', 'Caregiver Preview (' + v + '): an answer goes nowhere', [t[:300], calls]])
        R.append(['PASS' if not errs else 'FAIL', 'no page errors (Caregiver Preview ' + v + ')', errs[:3]]); cx.close()
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

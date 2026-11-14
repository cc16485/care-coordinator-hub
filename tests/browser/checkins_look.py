"""Caregivers > Check-ins (2026-11-14, her ask: one place for what was sent, who answered, and who needs a call), in the real
Hub page offline with made-up people: the pill and its red number, the four views, marking a reply, the not-installed and
refused messages, and a phone. Nothing is sent. (python3 tests/browser/checkins_look.py [port] [screenshot folder])"""
import os, sys
from playwright.sync_api import sync_playwright
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'client_journey_look.py')).read()
ns = {'__file__': os.path.abspath(__file__)}; exec(src[:src.rindex('with sync_playwright() as pw:')], ns)
STUB, DATA = ns['STUB'], ns['DATA']
PORT = sys.argv[1] if len(sys.argv) > 1 else '8765'
SHOTS = sys.argv[2] if len(sys.argv) > 2 else '/tmp'
FAKE = r"""
(()=>{
  const W=window; W.__CK=[]; W.__CKmode='ok';
  (0,eval)("cmpAuthHeaders=async()=>({ 'Content-Type':'application/json', Authorization:'Bearer t' })");
  const at=(h)=>new Date(Date.now()-h*3600000).toISOString();
  const ci=(id,h,reply,extra)=>Object.assign({ id, kind:'first_shift', label:'First shift with a client', sent_at:at(h), text:'How did your first shift with Mae go?', reply:reply?{at:at(h-2),body:reply}:null, waiting:reply?'':(h>72?'no_answer':'sent'), mark:null },extra||{});
  W.__CKdata={ ok:true, at:at(0), texts_from:'2026-11-05', people:[
    { id:'901', axiscare_id:'1', name:'Dana Reed', hire_date:'2026-10-14', day:31, phone_on_file:true, checkins:[ ci('o1',20,'It went ok but she yelled at me and I almost left') ] },
    { id:'902', axiscare_id:'2', name:'Marcus Tate', hire_date:'2026-11-06', day:8, phone_on_file:true, checkins:[ ci('o2',30,'Great! She is so sweet') ] },
    { id:'903', axiscare_id:'3', name:'Priya Shah', hire_date:'2026-09-12', day:63, phone_on_file:true, checkins:[ ci('o3',100,null) ] },
    { id:'904', axiscare_id:'4', name:'Lena Kim', hire_date:'2026-08-18', day:88, phone_on_file:true, checkins:[ ci('o4',150,'All good',{ mark:{ state:'fine', by:'Krystal Land', at:at(140), note:'' } }) ] },
    { id:'905', axiscare_id:'5', name:'Old Hand', hire_date:'2024-01-10', day:1040, phone_on_file:false, checkins:[] } ] };
  const of=W.fetch; W.fetch=async(u,o)=>{ if(/functions\/v1\/checkins/.test(String(u))){ const b=JSON.parse(o.body); W.__CK.push(b);
      if(W.__CKmode==='404') return new Response('{}',{status:404});
      if(W.__CKmode==='401') return new Response(JSON.stringify({ error:'Sign in first.' }),{status:401});
      if(b.mark) return new Response(JSON.stringify({ ok:true, mark:{ id:b.mark.id, state:b.mark.state, by:'krystal@mo-care.com', by_name:'Krystal Land', at:new Date().toISOString() } }),{status:200});
      return new Response(JSON.stringify(W.__CKdata),{status:200}); }
    return of(u,o); };
})();
"""
T = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  window.__as('krystal@mo-care.com','Krystal Land');
  DATA.caregivers=[{ id:'901', axiscare_id:'1', first:'Dana', last:'Reed', phone:'+14175550101' }];
  const pills=[...document.querySelectorAll('#fsub-cgdir .fpill')].map(p=>p.childNodes[p.childNodes.length-2] ? p.textContent.replace(/\d+$/,'').trim() : p.textContent.trim());
  ok('Check-ins sits next to Directory on Caregivers', pills.slice(0,2).join('|')==='Directory|Check-ins', pills);
  switchTab('cgdir'); await sleep(400);
  ok('opening Caregivers asks for the check-ins once in the background, and the pill shows the 2 waiting', window.__CK.length===1 && document.getElementById('chkBadge').textContent==='2' && document.getElementById('chkBadge').style.display!=='none', [window.__CK, document.getElementById('chkBadge').outerHTML]);
  switchTab('cgcheckins'); await sleep(300);
  const box=document.getElementById('checkinsWrap');
  ok('the tab opens without asking again', window.__CK.length===1, window.__CK.length);
  ok('the four numbers: 2 need you, 4 in their first 90 days, 75% answered, 1 no answer', /Needs you\s*2/.test(box.innerText) && /In first 90 days\s*4/.test(box.innerText) && /Answered, last 30 days\s*75%/.test(box.innerText) && /No answer\s*1/.test(box.innerText), box.innerText.slice(0,400));
  ok('Needs you shows the two unread replies, word for word, with who and when', /Dana Reed/.test(box.innerText) && /she yelled at me and I almost left/.test(box.innerText) && /Marcus Tate/.test(box.innerText) && !/Lena Kim/.test(box.innerText) && !/Priya Shah/.test(box.innerText), box.innerText);
  ok('a reply has Fine and Needs a call, and a Call button from the office line when a phone is on file', !!box.querySelector('a[data-oc-phone="+14175550101"]') && /Fine/.test(box.innerText) && /Needs a call/.test(box.innerText));
  const callBtn=[...box.querySelectorAll('button')].find(b=>b.textContent==='Needs a call'); callBtn.click(); await sleep(200);
  const m=window.__CK.find(b=>b.mark);
  ok('Needs a call saves a mark on that check-in, and nothing else is sent', m && m.mark.id==='o1' && m.mark.state==='call' && window.__CK.length===2, window.__CK);
  ok('the marked reply stays on Needs you, first, now with Called', /Marked needs a call by Krystal Land/.test(box.innerText) && /Called/.test(box.innerText) && box.innerText.indexOf('Dana Reed')<box.innerText.indexOf('Marcus Tate'), box.innerText);
  [...box.querySelectorAll('button')].find(b=>b.textContent==='Fine').click(); await sleep(200);
  ok('Fine on the other reply takes it off the list; the number drops to 1', !/Marcus Tate/.test(box.innerText) && document.getElementById('chkBadge').textContent==='1', [box.innerText, document.getElementById('chkBadge').textContent]);
  CHK.setView('first90'); await sleep(100);
  ok('First 90 days lists only people in their first 90 days, with their day and a dot per check-in', /Dana Reed/.test(box.innerText) && /Lena Kim/.test(box.innerText) && !/Old Hand/.test(box.innerText) && box.querySelectorAll('.chk-table .chk-dot').length===4, box.innerText);
  CHK.setView('everyone'); await sleep(100);
  ok('Everyone includes the long-time caregivers, and says when no phone is on file', /Old Hand/.test(box.innerText) && /no phone on file/.test(box.innerText) && /none yet/.test(box.innerText));
  CHK.setView('sent'); await sleep(100);
  ok('What was sent lists every check-in, newest first, and whether it was answered', box.querySelectorAll('.chk-table tbody tr').length===4 && /no answer in three days/.test(box.innerText) && box.innerText.indexOf('Dana Reed')<box.innerText.indexOf('Lena Kim'), box.innerText);
  ok('it says it sends nothing, and that texts are on record from November 5', /Nothing on this tab sends anything/.test(box.innerText) && /November 5, 2026/.test(box.innerText));
  renderActiveTab(); renderActiveTab(); await sleep(200);
  ok('the Hub redrawing the tab does not ask again', window.__CK.length===3, window.__CK.length);
  window.__CKmode='404'; await CHK.load(); await sleep(100);
  ok('before the server piece is installed it says so', /not switched on on the server yet/.test(box.innerText), box.innerText.slice(0,300));
  window.__CKmode='401'; CHK.VIEW.data=null; await CHK.load(); await sleep(100);
  ok('a refusal is shown as what it is, never as an empty list', /could not load: Sign in first\./.test(box.innerText), box.innerText.slice(0,300));
  window.__CKmode='ok'; await CHK.load(); CHK.setView('needs'); await sleep(100);
  ok('no em dash anywhere on the tab', !/—/.test(box.innerHTML));
  return R; }"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []
    pg = b.new_page(viewport={'width': 1280, 'height': 1000})
    pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    pg.goto(f'http://localhost:{PORT}/index.html?proof=checkins'); pg.wait_for_timeout(1500)
    for s in (STUB, DATA, FAKE): pg.evaluate('s=>(0,eval)(s)', s)
    R = pg.evaluate(T)
    pg.evaluate("()=>{ CHK.VIEW.data=JSON.parse(JSON.stringify(window.__CKdata)); CHK.setView('needs'); window.scrollTo(0,0); }")
    pg.screenshot(path=os.path.join(SHOTS, 'checkins_desktop.png'), full_page=False)
    ph = b.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True)
    ph.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    ph.goto(f'http://localhost:{PORT}/index.html?proof=checkins'); ph.wait_for_timeout(1500)
    for s in (STUB, DATA, FAKE): ph.evaluate('s=>(0,eval)(s)', s)
    w = ph.evaluate("""async()=>{ document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; window.__as('krystal@mo-care.com','Krystal Land');
      switchTab('cgcheckins'); await new Promise(r=>setTimeout(r,500));
      return { sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth, shown:/Dana Reed/.test(document.getElementById('checkinsWrap').innerText) }; }""")
    R.append(['PASS' if w['sw'] <= w['cw'] + 1 and w['shown'] else 'FAIL', 'on a phone: the tab fits, no sideways scroll', str(w)])
    ph.screenshot(path=os.path.join(SHOTS, 'checkins_phone.png'), full_page=True)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

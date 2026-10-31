"""The Hub's drawing kit, step 1 (2026-10-18, her "build step 1 into the Hub as shown"): good-news scenes where a list is
empty because the work is done. My Work caught up = the porch; Live Schedule all assigned = the road (a banner, or the big
scene when "Only open shifts" finds none); Leads with nobody in Needs you now = the quiet phone; Call Follow Ups with no
promise owed = the mailbox. And never when there is work. The real page, offline, made-up items.
(python3 tests/browser/hub_scenes_look.py; SHOT=dir saves screenshots)"""
import os, re, sys, mimetypes
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
STUB = re.search(r'STUB = r"""(.*?)"""', open(os.path.join(HERE, 'standup_look.py')).read(), re.S).group(1)
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  try{
  const now=Date.now(), I=h=>new Date(now+h*36e5).toISOString();
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Land', shift:'day' };");
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  ok('the kit loaded with its eight scenes', window.HS && HS.names.length===8, window.HS&&HS.names);
  ok('every scene draws an svg with its own sky', HS.names.every(n=>/^<svg class="hs-svg"/.test(HS.svg(n))) && HS.svg('porch').match(/hsSky\d+/)[0]!==HS.svg('porch').match(/hsSky\d+/)[0]);

  /* ── My Work ── */
  DATA.ops_items=[]; if(window.__store) window.__store.ops_items=[];
  switchTab('mywork'); await sleep(400); myWorkGo('today'); await sleep(150);
  const W=document.getElementById('myWorkWrap');
  ok('My Work · caught up shows the porch and its words', !!W.querySelector('.hs-empty[data-scene="porch"]') && /All caught up\./.test(W.innerText) && /Every family has what they need today/.test(W.innerText), W.innerText.slice(0,300));
  const mk=(id,h)=>({ id, kind:'capture', status:'open', title:'Item '+id, about:'About '+id, owner:'krystal@mo-care.com', owner_name:'Krystal Land', created_at:I(-30), due:I(h), urgency:'normal' });
  DATA.ops_items=[mk('later1',96)]; if(window.__store) window.__store.ops_items=JSON.parse(JSON.stringify(DATA.ops_items)); renderMyWork(); await sleep(80);
  ok('My Work · with only later items: still the porch, plus "Show what is later"', !!W.querySelector('.hs-empty') && /Show what is later/.test(W.innerText));
  DATA.ops_items=[mk('today1',2)]; if(window.__store) window.__store.ops_items=JSON.parse(JSON.stringify(DATA.ops_items)); renderMyWork(); await sleep(80);
  ok('My Work · something due today: no porch', !W.querySelector('.hs-empty'));
  DATA.ops_items=[mk('late1',-5)]; if(window.__store) window.__store.ops_items=JSON.parse(JSON.stringify(DATA.ops_items)); renderMyWork(); await sleep(80);
  ok('My Work · something late: no porch', !W.querySelector('.hs-empty'));

  /* ── no em dashes anywhere the kit speaks ── */
  ok('no em dashes in the scene words', ![...document.querySelectorAll('.hs-empty,.hs-banner')].some(e=>/—/.test(e.innerText)) && !/—/.test(W.innerText.replace(/[\s\S]*/,'')));
  }catch(e){ R.push(['FAIL','threw',String(e&&e.stack||e).slice(0,500)]); }
  return R;
}
"""
T2 = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]);
  try{
  /* ── Leads: the scene shows only when nobody is in Needs you now ── */
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  DATA.leads=[]; switchTab('leadsstarts'); await sleep(400); renderLeadsStarts(); await sleep(150);
  const lbB=()=>document.getElementById('lbBoard');
  ok('Leads · nobody waiting on a call: the quiet phone', !!lbB().querySelector('.hs-banner[data-scene="phone"]') && /Every new family has heard from us/.test(lbB().innerText), lbB().innerText.slice(0,300));
  DATA.leads=[{ id:'n1', first_name:'Pat', last_name:'New', client_first_name:'Ruth', client_last_name:'New', status:'New', source:'Website', phone:'4175550100', created_at:new Date(Date.now()-12*60000).toISOString(), contact_events:[{ at:new Date(Date.now()-12*60000).toISOString(), channel:'web', direction:'in', outcome:'inquiry', actor:'family' }] }];
  renderLeadsStarts(); await sleep(150);
  ok('Leads · a new family nobody has called: no phone scene', !lbB().querySelector('.hs-banner') && /Ruth New/.test(lbB().innerText), lbB().innerText.slice(0,300));
  /* ── Call Follow Ups ── */
  const w=document.createElement('div'); w.id='cfuWrapT'; document.body.appendChild(w);
  const TB={ call_task_reading:[{ message_id:'m1', read_at:'x', call_at:new Date().toISOString(), channel:'call', tasks:[], detail:{} }], call_promise_watch:[{ status:'kept' }] };
  const chain=name=>{ const p={ select(){return p;}, eq(){return p;}, gte(){return p;}, order(){return p;}, limit(){return p;}, in(){return p;},
    maybeSingle:async()=>({ data:null, error:null }), then(a,b){ return Promise.resolve({ data:JSON.parse(JSON.stringify(TB[name]||[])), error:null }).then(a,b); } }; return p; };
  sb.from=chain;
  const show=async()=>{ await CPR.load(true); CPR.render(w); };
  await show();
  ok('Call Follow Ups · every promise kept: the mailbox', !!w.querySelector('.hs-banner[data-scene="mailbox"]') && /All the follow-ups are done/.test(w.innerText), w.innerText.slice(0,400));
  TB.call_promise_watch=[{ status:'kept' },{ status:'waiting' }]; await show();
  ok('Call Follow Ups · one still owed: no mailbox', !w.querySelector('.hs-banner') && /calls and texts read/.test(w.innerText));
  TB.call_promise_watch=[{ status:'kept' },{ status:'would_remind' }]; await show();
  ok('Call Follow Ups · one past due: no mailbox', !w.querySelector('.hs-banner') && /calls and texts read/.test(w.innerText));
  TB.call_promise_watch=[]; await show();
  ok('Call Follow Ups · nothing being watched yet: no mailbox (no claim without proof)', !w.querySelector('.hs-banner') && /calls and texts read/.test(w.innerText));
  TB.call_promise_watch=[{ status:'kept' }]; await show();
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
    pg.goto('http://hub.test/index.html?proof=scenes'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T) + pg.evaluate(T2); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    shot = os.environ.get('SHOT')
    if shot:
        os.makedirs(shot, exist_ok=True)
        pg.evaluate("async()=>{ DATA.ops_items=[]; if(window.__store) window.__store.ops_items=[]; switchTab('mywork'); myWorkGo('today'); }"); pg.wait_for_timeout(300)
        pg.locator('#myWorkWrap .hs-empty').screenshot(path=os.path.join(shot, 'mywork-porch.png'))
        pg.locator('#cfuWrapT .hs-banner').screenshot(path=os.path.join(shot, 'followups-mailbox.png'))
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

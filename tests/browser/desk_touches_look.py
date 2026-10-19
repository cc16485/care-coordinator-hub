"""My Desk, five small touches (2026-10-18, her "build the five desk touches as shown"; mockup
https://claude.ai/artifact/3qkXuywCFDkk2JmDe8nrWn): the promise tape names the person the Hub knows and fills Capture's
About; a line naming someone with no day or time gets no tape; Just a note peels it off; a blank page has the porch
doodle; the mat gets the season's corner only with the owners' Seasons switch on; stamps in brand teal with a dashed inner
ring; brand sticky colors. Stage 5's set-up (the real Hub page, offline, a pretend desk store). Nothing is saved or sent.
(python3 tests/browser/desk_touches_look.py; SHOT=dir saves screenshots)"""
import os, re, sys, mimetypes
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
SRC = open(os.path.join(HERE, 'my_desk_stage5_look.py')).read()
STUB = re.search(r'STUB = r"""(.*?)"""', SRC, re.S).group(1)
EXTRA = re.search(r'EXTRA = r"""(.*?)"""', SRC, re.S).group(1)
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  try{
  const db=window.__db, W=()=>document.getElementById('dkWrap');
  window.dkStore=window.__fakeStore;
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Land', shift:'day' };");
  DATA.leads=[{ id:'L1', first_name:'Pamela', last_name:'Anderson', client_first_name:'Ed', client_last_name:'Anderson', status:'Contacted' }];
  DATA.referral_orgs=[{ id:'o1', name:'Mercy Rehab' }];
  switchTab('mydesk'); await sleep(500);
  ok('a blank page has the porch doodle', !!W().querySelector('.dk-pagedoodle svg'));
  const jot=v=>{ const i=document.getElementById('dkJot'); i.value=v; i.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); };
  jot('Call Pamela Anderson back Thursday'); await sleep(250);
  ok('...and it goes once there is a line', !W().querySelector('.dk-pagedoodle'));
  const P=db.desk_lines.find(l=>/Pamela/.test(l.body));
  const tp=W().querySelector('.dk-hint.dk-promise[data-for="'+P.id+'"]');
  ok('promise tape · names the person the Hub knows', !!tp && /Sounds like a promise to Pamela Anderson\./.test(tp.textContent) && /Make it a Hub follow-up/.test(tp.textContent) && /Just a note/.test(tp.textContent), tp && tp.textContent);
  ok('promise tape · sits right under its own line (not pinned like the kind-words tape)', !!tp && Math.abs(tp.getBoundingClientRect().top - W().querySelector('[data-dkid="'+P.id+'"]').getBoundingClientRect().bottom) < 30);
  ok('promise tape · looks like honey washi tape', !!tp && /repeating-linear-gradient/.test(getComputedStyle(tp).backgroundImage));
  ok('promise tape · no em dashes', !/—/.test(tp ? tp.textContent : ''));
  jot('Print Ed Anderson binder'); await sleep(250);
  const Q=db.desk_lines.find(l=>/binder/.test(l.body));
  ok('a name with no day, time or "back": no tape', !W().querySelector('.dk-hint[data-for="'+Q.id+'"]'));
  jot('Drop cookies at Mercy Rehab by 3'); await sleep(250);
  const M=db.desk_lines.find(l=>/Mercy/.test(l.body));
  ok('a referral partner with a time: tape names them', /promise to Mercy Rehab/.test((W().querySelector('.dk-hint[data-for="'+M.id+'"]')||{}).textContent||''));
  jot('Call the Wilsons back tomorrow'); await sleep(250);
  const Wl=db.desk_lines.find(l=>/Wilsons/.test(l.body));
  ok('the older promise words still work, with "a family"', /promise to a family/.test((W().querySelector('.dk-hint[data-for="'+Wl.id+'"]')||{}).textContent||''));
  W().querySelector('.dk-hint[data-for="'+P.id+'"] [data-dk="follow"]').click(); await sleep(200);
  ok('Make it a Hub follow-up · Capture opens with the words and Pamela Anderson in About', (document.getElementById('capWhat')||{}).value===P.body && (document.getElementById('capAbout')||{}).value==='Pamela Anderson', [(document.getElementById('capWhat')||{}).value,(document.getElementById('capAbout')||{}).value]);
  try{ document.getElementById('ccCapWrap').style.display='none'; }catch(e){}
  await sleep(400);
  W().querySelector('.dk-hint[data-for="'+M.id+'"] [data-dk="nohint"]').click(); await sleep(200);
  ok('Just a note · peels the tape off for good, nothing made', !W().querySelector('.dk-hint[data-for="'+M.id+'"]') && db.desk_lines.find(l=>l.id===M.id).link.nohint===true);
  ok('nothing was texted or emailed', window.__fn.length===0);

  /* the season corner follows the owners' switch */
  ok('season corner · switch off: none', !W().querySelector('.dk-season'));
  DATA.ops_settings.seasons_live=true; switchTab('today'); await sleep(150); switchTab('mydesk'); await sleep(300);
  /* 2026-10-18 Meadow (the default mat) puts the season on its hills instead of the corner; the other mats keep the corner */
  const sea=W().querySelector('.dk-hills .dk-sea');
  ok('season · Meadow: the season on the hills, behind everything, no clicks', !!sea && sea.getAttribute('data-season')===SEA.seasonOf() && getComputedStyle(W().querySelector('.dk-hills')).pointerEvents==='none' && !W().querySelector('.dk-season'), sea && sea.outerHTML.slice(0,120));
  window.__db.desk_settings=[Object.assign(window.__db.desk_settings[0]||{}, { person_id:'p_k', mat:'teal' })]; await window.DKX.load(true); await sleep(300);
  const sc=W().querySelector('.dk-season');
  ok('season corner · switch on (teal felt): the season by the calendar, behind everything, no clicks', !!sc && sc.getAttribute('data-season')===SEA.seasonOf() && getComputedStyle(sc).pointerEvents==='none', sc && sc.outerHTML.slice(0,120));
  window.__db.desk_settings[0].mat='meadow'; await window.DKX.load(true); await sleep(300);

  /* stamps and colors */
  const sun=document.getElementById('dk-st-sun'), cup=document.getElementById('dk-st-cup'), house=document.getElementById('dk-st-house');
  ok('stamps · a dashed inner ring on all three', [sun,cup,house].every(sy=>sy && sy.querySelector('circle[r="38"][stroke-dasharray]')));
  const probe=document.createElement('div'); probe.className='dk'; probe.innerHTML='<div class="dk-stamp"></div><div class="dk-sticky dk-c-yellow"></div><div class="dk-sticky dk-c-blue"></div>'; document.body.appendChild(probe);
  ok('stamps · brand teal', getComputedStyle(probe.querySelector('.dk-stamp')).color==='rgb(15, 122, 115)', getComputedStyle(probe.querySelector('.dk-stamp')).color);
  const bg=[...probe.querySelectorAll('.dk-sticky')].map(e=>getComputedStyle(e).backgroundColor);
  ok('sticky colors · honey and pale teal from the brand', bg[0]==='rgb(251, 221, 160)' && bg[1]==='rgb(214, 236, 240)', bg);
  probe.remove();
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
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1400, 'height': 1000})
    pin(pg)
    pg.route('**/*', lambda r: serve(r) if r.request.url.startswith('http://hub.test/') else (r.abort() if ('supabase.co' in r.request.url) else r.continue_()))
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://hub.test/index.html?proof=desktouches'); pg.wait_for_timeout(1500)
    pg.evaluate(STUB); pg.evaluate(EXTRA); R = pg.evaluate(T)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    shot = os.environ.get('SHOT')
    if shot:
        os.makedirs(shot, exist_ok=True); pg.wait_for_timeout(1200)
        pg.evaluate("async()=>{ switchTab('today'); await new Promise(r=>setTimeout(r,150)); switchTab('mydesk'); await new Promise(r=>setTimeout(r,500)); const m=document.getElementById('dkMat'); if(m) m.scrollIntoView({block:'start'}); }"); pg.wait_for_timeout(600)
        try: pg.locator('#dkMat').screenshot(path=os.path.join(shot, 'desk-touches.png'))
        except Exception as e: print('no shot', str(e)[:100])
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

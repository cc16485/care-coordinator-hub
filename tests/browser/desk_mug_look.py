"""The coffee mug (2026-10-06): a quote or a Bible verse, each person's choice remembered. Offline, made-up desk."""
import re
from playwright.sync_api import sync_playwright
src = open('/Users/samantha/Claude/Projects/cc-hub-live/tests/browser/my_desk_stage6a_look.py').read()
STUB = re.search(r'STUB = r"""(.*?)"""', src, re.S).group(1)
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  window.dkStore=window.__fakeStore;
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Land', shift:'day' };");
  switchTab('mydesk'); await sleep(500);
  const W=()=>document.getElementById('dkWrap'), lastPop=()=>[...document.querySelectorAll('.ccpop')].pop();
  ok('the coffee mug is a button', !!W().querySelector('button.dk-mug[data-dk="mug"]'));
  W().querySelector('.dk-mug').click(); await sleep(150);
  let p=lastPop();
  ok('clicking it: "A little something with your coffee" and a quote, Quotes picked', /A little something with your coffee/i.test(p.innerText) && p.querySelector('.dk-mugq').textContent.length>10 && p.querySelector('[data-mug="quote"].dk-on'));
  const q1=p.querySelector('.dk-mugq').textContent;
  p.querySelector('[data-mug="again"]').click(); await sleep(150); p=lastPop();
  ok('Another one: a different one', p.querySelector('.dk-mugq').textContent!==q1);
  p.querySelector('[data-mug="verse"]').click(); await sleep(300); p=lastPop();
  ok('Bible verses: a verse with its reference (KJV)', /\(KJV\)/.test(p.querySelector('.dk-mugby').textContent) && p.querySelector('[data-mug="verse"].dk-on'));
  ok('...the choice is saved on your desk settings', window.__calls.includes('settings') && (window.__db.desk_settings[0]||{}).pad_labels && window.__db.desk_settings[0].pad_labels._mug==='verse', window.__db.desk_settings);
  try{ ccPopClose(); }catch(e){}
  W().querySelector('.dk-mug').click(); await sleep(150); p=lastPop();
  ok('...next time the mug opens to a verse', /\(KJV\)/.test(p.querySelector('.dk-mugby').textContent));
  ok('no em dashes in any quote or verse', !/—/.test(document.querySelector('script[src^="desk.js"]') ? '' : ''));
  ok('nothing was sent', window.__fn.length===0);
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width':1400,'height':1000})
    pg.route('**/*', lambda r: r.abort() if ('supabase.co' in r.request.url or 'fonts.g' in r.request.url) else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=mug'); pg.wait_for_timeout(1200)
    pg.evaluate(STUB); R = pg.evaluate(T)
    pg.evaluate("async()=>{ document.querySelector('#dkWrap .dk-mug').click(); await new Promise(r=>setTimeout(r,300)); }"); pg.screenshot(path='/tmp/desk_mug.png')
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
js = open('/Users/samantha/Claude/Projects/cc-hub-live/desk.js').read(); seg = js[js.index('const MUG_QUOTES'):js.index('let mugLast')]
R.append(['PASS' if '\u2014' not in seg else 'FAIL', 'no em dashes in any quote or verse', ''])
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")

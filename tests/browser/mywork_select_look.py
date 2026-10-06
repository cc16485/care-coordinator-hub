"""My Work: ticking several cards (2026-10-06, Samantha: "i am trying to click multiple cards on my work and its not
letting me"). Cards under Later can be ticked, the select bar shows whenever cards do, and the bulk actions reach the
Later cards too. The real page, offline, made-up items. (python3 tests/browser/mywork_select_look.py, static server on 8765)"""
import re
from playwright.sync_api import sync_playwright
STUB = re.search(r'STUB = r"""(.*?)"""', open('/Users/samantha/Claude/Projects/cc-hub-live/tests/browser/standup_look.py').read(), re.S).group(1)
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const now=Date.now(), I=h=>new Date(now+h*36e5).toISOString();
  window.__me={ email:'krystal@mo-care.com', name:'Krystal Land' }; (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Land', shift:'day' };");
  const mk=(id,h,extra)=>Object.assign({ id, kind:'capture', status:'open', title:'Item '+id, about:'About '+id, owner:'krystal@mo-care.com', owner_name:'Krystal Land', created_at:I(-30), due:I(h), urgency:'normal' }, extra||{});
  const items=[ mk('late1',-5), mk('today1',2), mk('later1',72), mk('later2',96), mk('later3',120) ];
  DATA.ops_items=JSON.parse(JSON.stringify(items)); window.__store.ops_items=JSON.parse(JSON.stringify(items));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  switchTab('mywork'); await sleep(500); myWorkGo('today'); await sleep(200);
  const W=document.getElementById('myWorkWrap'), tick=id=>W.querySelector('.wkcard[data-id="'+id+'"] .wkchk');
  tick('late1').click(); await sleep(100); tick('today1').click(); await sleep(100);
  ok('two cards on Today can be ticked', MYWORK_SEL.size===2 && /2 selected/.test(W.innerText), [...MYWORK_SEL]);
  [...W.querySelectorAll('button')].find(b=>/Show 3 later items/.test(b.textContent)).click(); await sleep(150);
  ok('...the ticks stay when Later is opened', MYWORK_SEL.size===2);
  tick('later1').click(); await sleep(100); tick('later2').click(); await sleep(100);
  ok('Later cards can be ticked too (they used to un-tick themselves)', MYWORK_SEL.size===4 && tick('later1').checked && tick('later2').checked && /4 selected/.test(W.innerText), [...MYWORK_SEL]);
  [...W.querySelectorAll('button')].find(b=>b.textContent==='Stale').click(); await sleep(150);
  const pop=[...document.querySelectorAll('.ccpop')].pop();
  ok('the bulk action lists all four, Later ones included', /Close 4 items as stale\?/.test(pop.innerText) && /About later1/.test(pop.innerText) && /About late1/.test(pop.innerText));
  try{ ccPopClose(); }catch(e){}
  W.querySelector('.wkcard input[type=checkbox]') && null;
  myWorkSelectAll(true); await sleep(100);
  ok('Select all (with Later open) ticks all five', MYWORK_SEL.size===5, [...MYWORK_SEL]);
  myWorkSelectAll(false); await sleep(100);
  DATA.ops_items=DATA.ops_items.filter(i=>/^later/.test(i.id)); window.__store.ops_items=JSON.parse(JSON.stringify(DATA.ops_items)); MYWORK_LATER_OPEN=true; renderMyWork(); await sleep(100);
  ok('nothing due today, only Later: the select bar still shows', /Select all 3/.test(W.innerText), W.innerText.slice(0,300));
  // a tick no longer redraws the list (it used to, for every tick)
  let redraws=0; const orig=window.renderMyWork; window.renderMyWork=function(){ redraws++; return orig.apply(this, arguments); };
  const first=W.querySelector('.wkcard'); const firstId=first.dataset.id;
  first.querySelector('.wkchk').click(); await sleep(50);
  ok('a tick updates just that card and the select bar, no full redraw', redraws===0 && MYWORK_SEL.has(firstId) && W.querySelector('.wkcard[data-id="'+firstId+'"]')===first && first.classList.contains('selected') && /1 selected/.test(W.querySelector('#myWorkBulk').innerText), [redraws, [...MYWORK_SEL]]);
  first.querySelector('.wkchk').click(); await sleep(50);
  ok('...and un-ticking works the same way', redraws===0 && !MYWORK_SEL.has(firstId) && !first.classList.contains('selected') && /Select all/.test(W.querySelector('#myWorkBulk').innerText));
  window.renderMyWork=orig;
  // sub-tabs answer on press, so a redraw before letting go can't swallow the click
  const st=[...document.querySelectorAll('#myWorkTabs .subtab')].find(x=>/All mine/.test(x.textContent));
  st.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})); await sleep(50);
  ok('a sub-tab opens on press (no click needed)', MYWORK_TAB==='mine', MYWORK_TAB);
  myWorkGo('today'); MYWORK_LATER_OPEN=true; renderMyWork(); await sleep(50);
  const hit=W.querySelector('.wkchkhit'); const r=hit.getBoundingClientRect();
  ok('the tick box has a bigger area to hit', r.width>=26 && r.height>=26, [r.width, r.height]);
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width':1300,'height':1000})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=select'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', STUB); R = pg.evaluate(T)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

"""Tidier My Work (2026-10-22, her mockup https://claude.ai/artifact/12fzWPbw75wAZcHdF3Ufa6). The real Hub page, offline, with
the Team Work test's made-up people and cards plus old call cards, a "Make it official?" card, an EVV review card and an old
write-up reminder. OFF: My Work and Team Work exactly as before. ON: the escalation words once, owners tick and Clear with
a reason (Undo reopens), call cards 2 days past their day fold into Past its day, Make it official is one list, EVV is not
shown, the top is one line, five tabs plus More, Settings > Clear old cards; a coordinator gets no boxes and cannot clear.
(python3 tests/browser/mywork_tidy_look.py; SHOTS=<dir> also saves screenshots)"""
import os, sys, pathlib, re
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = os.environ.get('SHOTS')
src = (ROOT / 'tests/browser/team_work_look.py').read_text()
STUB = re.search(r'STUB = r"""(.*?)"""', src, re.S).group(1)
EXTRA = r"""
(()=>{
  const at=(hm,d)=>new Date('2026-10-'+(d||'07')+'T'+hm+':00-05:00').toISOString();
  DATA.ops_settings={ team_work_live:true };
  DATA.ops_items.push(
    { id:'old1', kind:'call_followup', opened_by:'call-tasks', status:'open', title:'Remove the 10/1 visit (fake, old)', due:at('17:00','01'), created_at:at('09:00','01') },
    { id:'old2', kind:'call_followup', opened_by:'call-tasks', status:'open', title:'Reply to a text from Sep 30 (fake, old)', due:at('17:00','02'), created_at:at('09:00','02') },
    { id:'cov1', kind:'coverage_outcome', opened_by:'loops', status:'open', title:'Did the coverage work out? (fake)', due:at('12:00','02'), created_at:at('09:00','02') },
    { id:'off1', kind:'staffing', status:'open', title:'Make it official? Robin has covered a Friday slot 3 times running (fake)', due:at('12:00','03'), created_at:at('09:00','03') },
    { id:'evv1', kind:'evv_review', opened_by:'loops', status:'open', title:'EVV review (fake)', due:at('12:00','04'), created_at:at('09:00','04') },
    { id:'wu1', kind:'hr_file', opened_by:'system', sensitive:true, status:'open', title:'Write-up, check the facts: fake person', owner:'zach@mo-care.com', due:'2026-07-31T15:00:00Z', created_at:'2026-07-31T15:00:00Z' });
  CC_ROLE_BY_EMAIL['zach@mo-care.com']=['owner_admin'];
  window.__n0=DATA.ops_items.length;
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, it=id=>DATA.ops_items.find(x=>x.id===id), $=id=>document.getElementById(id);
  const as=(e,n)=>(0,eval)("ME={ email:'"+e+"', name:'"+n+"', shift:'day' };");
  const tabs=()=>[...document.querySelectorAll('#myWorkTabs .subtab')].map(t=>t.textContent.replace(/\s+/g,' ').trim());
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  as('samantha@mo-care.com','Samantha Troutman'); switchTab('mywork'); renderMyWork(); await sleep(150);

  /* ── OFF ── */
  ok('off · the five summary boxes and the usual tabs', !!document.querySelector('#todayStrip .ts-strip') && !document.querySelector('.mwt-strip') && !tabs().some(t=>/^More/.test(t)), tabs());
  myWorkGo('team'); await sleep(120);
  const offTxt=$('myWorkWrap').innerText;
  ok('off · Team Work as before: escalation words on the cards, no boxes', /Not taken in 15 min/.test(offTxt) && !document.querySelector('.mwt-box') && !document.querySelector('.mwt-bar'), offTxt.slice(0,400));

  /* ── ON ── */
  DATA.ops_settings.mywork_tidy_live=true; myWorkGo('today'); renderMyWork(); await sleep(150);
  ok('on · the top is one line, the five boxes are gone', !!document.querySelector('.mwt-strip') && !document.querySelector('#todayStrip .ts-strip') && /Coverage:/.test($('todayStrip').innerText), $('todayStrip').innerText.slice(0,200));
  const t=tabs();
  ok('on · tabs: Today, Team Work, All mine, Waiting, More', /^Today/.test(t[0]) && /^Team Work/.test(t[1]) && /^All mine/.test(t[2]) && /^Waiting/.test(t[3]) && /^More/.test(t[4]) && !t.some(x=>/^Reviews/.test(x)), t);
  MWTidy.more(); await sleep(60);
  ok('on · More opens the rest (Reviews, Up for grabs, Unassigned…)', tabs().some(x=>/^Reviews/.test(x)) && tabs().some(x=>/^Unassigned/.test(x)), tabs());
  MWTidy.more(); myWorkGo('team'); await sleep(150);
  const w=()=>$('myWorkWrap').innerText;
  ok('on · the rules are said once at the top, not on each card', (w().match(/taken in 15 min/gi)||[]).length===1 && /How every card here escalates, said once/.test(w()), (w().match(/taken in 15 min/gi)||[]).length);
  ok('on · care at risk keeps its own ladder words', /20 min: text to Samantha/.test(w()));
  ok('on · EVV review and Make it official are out of the pile', !document.querySelector('.tw-card[data-id="evv1"]') || document.querySelector('details .tw-card[data-id="evv1"]')===null);
  ok('on · Make it official is one folded list; EVV is a quiet note for owners', /MAKE IT OFFICIAL\? · 1/.test(w()) && /1 EVV review card is not shown/.test(w()), w().slice(-600));
  const pastBox=[...document.querySelectorAll('details')].find(d=>/PAST ITS DAY/.test(d.textContent));
  ok('on · call cards 2+ days past their day are folded in Past its day', pastBox && pastBox.querySelector('.tw-card[data-id="old1"]') && pastBox.querySelector('.tw-card[data-id="old2"]'), pastBox&&pastBox.textContent.slice(0,200));
  ok('on · owners get boxes and the toolbar', document.querySelectorAll('.mwt-box').length>0 && /Select everything over 3 days late/.test(w()));
  const badge=(document.querySelector('#myWorkTabs .subtab:nth-child(2) .subtab-badge')||{}).textContent||'';
  ok('on · the Team Work number leaves out what folded away', /^\d+$/.test(badge) && +badge < TW.list().length, [badge, TW.list().length]);
  window.__shot && await window.__shot('1-team-work');

  /* pick many, clear with a reason, undo */
  MWTidy.pickOld(); await sleep(60);
  const sel=[...MWTidy.state.sel];
  ok('Select everything over 3 days late: the old call cards and the old coverage check, never EVV or Make it official', sel.includes('old1') && sel.includes('old2') && sel.includes('cov1') && !sel.includes('evv1') && !sel.includes('off1'), sel);
  MWTidy.ask(); await sleep(60); MWTidy.why('The day has passed'); await sleep(40);
  ok('Clear asks why, with the reasons', /Clear \d+ cards\?/.test(w()) && /Already done in AxisCare/.test(w()));
  window.__shot && await window.__shot('2-clear');
  await MWTidy.go(); await sleep(150);
  ok('cleared: done, with who, when and why on each card', ['old1','old2','cov1'].every(i=>it(i).status==='done' && it(i).close_reason==='The day has passed' && it(i).cleared.by==='samantha@mo-care.com'), ['old1','old2','cov1'].map(i=>it(i).status));
  ok('cleared: nothing deleted, and saved card by card', DATA.ops_items.length===window.__n0 && L.writes.filter(x=>/^ops_items:(old1|old2|cov1)$/.test(x)).length===3, L.writes.slice(-5));
  ok('cleared: an Undo line shows', /Cleared 3 cards: “The day has passed”\. Undo/.test(w()), w().slice(0,600));
  await MWTidy.undo(); await sleep(120);
  ok('Undo reopens them, the clear kept in their history', ['old1','old2','cov1'].every(i=>it(i).status==='open' && !it(i).cleared && /Reopened/.test(it(i).history.at(-1).text)));

  /* Settings > Clear old cards (Zach's write-up reminder) */
  switchTab('settings'); await sleep(150); MWTidy.oldFill(); await sleep(50);
  ok('Settings · Clear old cards lists every card more than 7 days late, by person (Zach’s reminder included)', /zach|Zach/i.test($('mwtOld').innerText) && /Write-up, check the facts: fake person/.test($('mwtOld').textContent), $('mwtOld').innerText.slice(0,300));
  MWTidy.oldPick('wu1', true); MWTidy.oldWhy('Old or test card'); await MWTidy.oldGo(); await sleep(120);
  ok('Settings · cleared with the reason; the write-up record is not touched (only the card)', it('wu1').status==='done' && it('wu1').close_reason==='Old or test card' && L.writes.every(x=>!/discipline|hr_case|writeup/.test(x.split(':')[0])), it('wu1'));

  /* a coordinator */
  switchTab('mywork'); as('krystal@mo-care.com','Krystal Land'); myWorkGo('team'); renderMyWork(); await sleep(150);
  ok('a coordinator: no boxes, no toolbar', !document.querySelector('.mwt-box') && !document.querySelector('.mwt-bar'));
  L.alerts.length=0; const n=await MWTidy.clear(['famreq'],'Not needed'); await sleep(40);
  ok('a coordinator cannot clear', n===0 && it('famreq').status==='open' && L.alerts.some(a=>/Only Samantha or Zachary/.test(a)), L.alerts);
  await MWTidy.toggle(); await sleep(40);
  ok('a coordinator cannot switch it', DATA.ops_settings.mywork_tidy_live===true);
  as('samantha@mo-care.com','Samantha Troutman'); await MWTidy.toggle(); await sleep(80);
  ok('the owner switches it off: back to before', DATA.ops_settings.mywork_tidy_live===false && !!document.querySelector('#todayStrip .ts-strip')===true || DATA.ops_settings.mywork_tidy_live===false);
  ok('nothing was texted, emailed or called', L.fn.length===0, L.fn);
  return R;
}
"""
MIME = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.json':'application/json', '.webmanifest':'application/json'}
def serve(route):
    url = route.request.url
    if 'supabase.co' in url: return route.abort()
    if not url.startswith('http://teamwork.local/'): return route.continue_()
    p = (ROOT / url.split('http://teamwork.local/', 1)[1].split('?')[0].split('#')[0])
    if not p.is_file(): return route.fulfill(status=404, body='')
    route.fulfill(status=200, body=p.read_bytes(), content_type=MIME.get(p.suffix, 'application/octet-stream'))
with sync_playwright() as pw:
    b = pw.chromium.launch(); cx = b.new_context(viewport={'width': 1280, 'height': 900}, timezone_id='America/Chicago'); pg = cx.new_page()
    pg.clock.install(time='2026-10-07T14:40:00-05:00'); pg.clock.resume()
    pg.route('**/*', serve)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://teamwork.local/index.html?proof=tidy'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB); pg.evaluate('s=>(0,eval)(s)', EXTRA)
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True)
        pg.evaluate("()=>{ document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; (0,eval)(\"ME={ email:'samantha@mo-care.com', name:'Samantha Troutman', shift:'day' };\"); DATA.ops_settings.mywork_tidy_live=true; switchTab('mywork'); myWorkGo('today'); renderMyWork(); }"); pg.wait_for_timeout(600)
        pg.screenshot(path=os.path.join(SHOTS, '1-top.png'))
        pg.evaluate("()=>{ myWorkGo('team'); }"); pg.wait_for_timeout(400)
        pg.evaluate("()=>{ const e=document.getElementById('myWorkTabs'); e.scrollIntoView(); window.scrollBy(0,-80); }"); pg.wait_for_timeout(200)
        pg.screenshot(path=os.path.join(SHOTS, '2-team-work.png'))
        pg.evaluate("()=>{ MWTidy.pickOld(); MWTidy.ask(); }"); pg.wait_for_timeout(300)
        pg.evaluate("()=>{ const e=document.querySelector('.mwt-bar'); e.scrollIntoView(); window.scrollBy(0,-80); }"); pg.wait_for_timeout(200)
        pg.screenshot(path=os.path.join(SHOTS, '3-clear.png'))
        b.close(); print('saved to', SHOTS); sys.exit(0)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

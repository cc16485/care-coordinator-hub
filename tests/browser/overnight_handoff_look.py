"""Overnight Handoff (2026-10-29, her mockup https://claude.ai/artifact/MsZAJoGKZqufHWzhw7QNU2). The real Hub page, offline,
with the Team Work test's made-up people, Thursday Oct 29 9:30am Central. OFF: no pin, no Overview box. ON: Krystal sees
the handoff pinned above My Work with Samantha's note, presses Got it, Done and I've read it (each saved with who and
when); the Owner Overview shows Samantha the 9am flag, then who read it; only owners get the note box, and a note typed
now is for Friday. (python3 tests/browser/overnight_handoff_look.py; SHOTS=<dir> saves screenshots)"""
import os, sys, pathlib, re
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = os.environ.get('SHOTS')
src = (ROOT / 'tests/browser/team_work_look.py').read_text()
STUB = re.search(r'STUB = r"""(.*?)"""', src, re.S).group(1)
EXTRA = r"""
(()=>{
  DATA.ops_settings={ team_work_live:true, owner_overview_live:true };
  DATA.ops_items.push({ id:'cf_night', kind:'call_followup', status:'open', title:'Daughter asked about Saturday (fake)', created_at:'2026-10-29T10:40:00Z' });
  DATA.overnight_handoff=[
    { id:'note_2026-10-29', kind:'note', for_date:'2026-10-29', text:'Please call the Harper family first thing (fake).', by:'samantha@mo-care.com', by_name:'Samantha Troutman', at:'2026-10-29T04:14:00Z' },
    { id:'report_2026-10-29', kind:'report', date:'2026-10-29', from:'2026-10-28 20:00:00', to:'2026-10-29 07:00:00', sent_at:'2026-10-29T13:00:30Z', sent:2,
      note:{ text:'Please call the Harper family first thing (fake).', by_name:'Samantha Troutman' },
      needs:[{ at:'2026-10-29 05:40:00', key:'coverage_cases', id:'cx1', text:'Call-in, not covered yet: Jo Smith called off Mr. Ellis (Thu 9:00am).' }],
      handled:[{ at:'2026-10-28 22:15:00', key:'coverage_cases', id:'cx2', text:'Call-in covered: Dana Fox took Mrs. Cole for Kim Day.' }],
      came_in:[{ at:'2026-10-29 05:40:00', key:'ops_items', id:'cf_night', text:'Call to the office line: Daughter asked about Saturday (fake).' },
               { at:'2026-10-28 21:02:00', key:'leads', id:'L1', text:'New lead: Ann Gray, weekday mornings.' }], errors:[] }];
  DATA.coverage_cases=(DATA.coverage_cases||[]).concat([{ id:'cx1', status:'open' }, { id:'cx2', status:'resolved' }]);
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, $=id=>document.getElementById(id), H=id=>DATA.overnight_handoff.find(x=>x.id===id);
  const as=(e,n)=>(0,eval)("ME={ email:'"+e+"', name:'"+n+"', shift:'day' };");
  const pin=()=>($('ohPin')||{}).innerText||'';
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';

  /* ── OFF ── */
  as('krystal@mo-care.com','Krystal Lopez'); switchTab('mywork'); renderMyWork(); await sleep(150);
  ok('off · nothing pinned on My Work', !!$('ohPin') && pin().trim()==='', pin());
  as('samantha@mo-care.com','Samantha Troutman'); switchTab('owneroverview'); await sleep(200);
  ok('off · no Overnight Handoff box on the Owner Overview', !/Overnight Handoff/.test(($('ovWrap')||{}).innerText||''), (($('ovWrap')||{}).innerText||'').slice(0,200));
  switchTab('settings'); await sleep(150); OH.settingsFill();
  ok('off · Settings has the switch and the hours (8pm to 7am)', /Turn on the Overnight Handoff/.test($('ohToggleBtn').textContent) && $('ohFrom').value==='20:00' && $('ohTo').value==='07:00');
  await OH.toggle($('ohToggleBtn')); await sleep(60);
  ok('the switch turns it on (saved through the audited settings save)', DATA.ops_settings.overnight_handoff_live===true && L.writes.includes('ops_settings') && /Turn off/.test($('ohToggleBtn').textContent));

  /* ── ON, Samantha at 9:30: the Overview flag ── */
  switchTab('owneroverview'); await sleep(200);
  const ov=()=>($('ovWrap')||{}).innerText||'';
  ok('Overview · the note, nobody has pressed Got it', /Please call the Harper family first thing/.test(ov()) && /Nobody has pressed Got it yet/.test(ov()), ov().slice(0,500));
  ok('Overview · 9:30 and unread: the red line', /Overnight Handoff not read yet/.test(ov()));
  ok('Overview · the box for tomorrow is for Friday', /Note for the morning of Friday, Oct 30/i.test(ov()));
  window.__shot && await window.__shot('1-overview-unread');

  /* ── Krystal on My Work ── */
  as('krystal@mo-care.com','Krystal Lopez'); switchTab('mywork'); myWorkGo('today'); renderMyWork(); await sleep(150);
  ok('My Work · the handoff is pinned above the summary and the tabs', /Overnight Handoff/.test(pin()) && $('ohPin').compareDocumentPosition($('myWorkTabs')) & Node.DOCUMENT_POSITION_FOLLOWING);
  ok('My Work · the note first, then the counts', /NOTE FROM SAMANTHA/i.test(pin()) && /1 need you/.test(pin()) && /1 handled/.test(pin()) && /2 came in/.test(pin()), pin());
  ok('My Work · coordinators get no note box', !/Leave a note for the morning/.test(pin()));
  await OH.toggleOpen(); await sleep(60);
  ok('Open it · the three lists, in her words', /NEEDS YOU THIS MORNING · 1/i.test(pin()) && /Jo Smith called off Mr\. Ellis/.test(pin()) && /HANDLED OVERNIGHT · 1/i.test(pin()) && /CAME IN OVERNIGHT · 2/i.test(pin()), pin());
  ok('Open it · times read like 5:40am and 10:15pm', /5:40am/.test(pin()) && /10:15pm/.test(pin()));
  window.__shot && await window.__shot('2-pinned');
  await OH.press('got_it'); await sleep(60);
  ok('Got it · saved with Krystal and the time', H('note_2026-10-29').got_it.by==='krystal@mo-care.com' && L.writes.includes('overnight_handoff:note_2026-10-29') && /Got it: Krystal/.test(pin()), H('note_2026-10-29'));
  await OH.press('done'); await sleep(60);
  ok('Done · saved, and says so', !!H('note_2026-10-29').done.at && /Done by Krystal/.test(pin()));
  await OH.read(); await sleep(60);
  const rd=H('read_2026-10-29');
  ok('I\'ve read it · saved with who and when', rd && rd.by==='krystal@mo-care.com' && rd.by_name==='Krystal Lopez' && L.writes.includes('overnight_handoff:read_2026-10-29'), rd);
  ok('read and Done · the pin goes away', pin().trim()==='', pin());
  ok('no texts or emails were sent', !L.fn.some(f=>/send|sms|text|email|notify/i.test(f)), L.fn);

  /* ── Samantha sees it ── */
  as('samantha@mo-care.com','Samantha Troutman'); switchTab('owneroverview'); await sleep(200);
  ok('Overview · Done by Krystal and read by Krystal, no red line', /Done by Krystal/.test(ov()) && /read by Krystal/.test(ov()) && !/not read yet/.test(ov()), ov().slice(0,500));
  $('ohDraft').value='Tomorrow: confirm the Webb visit (fake).'; await OH.saveNote(); await sleep(60);
  const nx=H('note_2026-10-30');
  ok('her note typed Thursday 9:30am is saved for Friday', nx && nx.text==='Tomorrow: confirm the Webb visit (fake).' && nx.by==='samantha@mo-care.com' && L.writes.includes('overnight_handoff:note_2026-10-30'), nx);
  ok('the box shows it saved', /Save changes/.test(ov()) && /Saved/.test(ov()));
  switchTab('mywork'); renderMyWork(); await sleep(100);
  ok('owners also get the note box on My Work, folded', /Leave a note for the morning/.test(pin()));
  window.__shot && await window.__shot('3-owner');
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
    pg.clock.install(time='2026-10-29T09:30:00-05:00'); pg.clock.resume()
    pg.route('**/*', serve)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://teamwork.local/index.html?proof=overnight'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB); pg.evaluate('s=>(0,eval)(s)', EXTRA)
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True)
        pg.evaluate("()=>{ document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; DATA.ops_settings.overnight_handoff_live=true; (0,eval)(\"ME={ email:'krystal@mo-care.com', name:'Krystal Lopez', shift:'day' };\"); switchTab('mywork'); myWorkGo('today'); renderMyWork(); OH.toggleOpen(); }"); pg.wait_for_timeout(500)
        pg.locator('#ohPin').screenshot(path=os.path.join(SHOTS, '1-my-work-pin.png'))
        pg.evaluate("()=>{ (0,eval)(\"ME={ email:'samantha@mo-care.com', name:'Samantha Troutman', shift:'day' };\"); switchTab('owneroverview'); }"); pg.wait_for_timeout(500)
        pg.locator('#ovWrap .ov-box').first.screenshot(path=os.path.join(SHOTS, '2-owner-overview.png'))
        b.close(); print('saved to', SHOTS); sys.exit(0)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

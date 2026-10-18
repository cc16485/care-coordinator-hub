"""End my shift shows enough to decide (Samantha 2026-10-17: "the handoff cards only have title so its impossible to know
when you end shift what to keep or hand off"). The real page, offline, made-up people and work only: nothing is saved
anywhere and nobody is texted or emailed. Uses the fixtures of today_calm_look.py.
(PORT=<port> python3 tests/browser/end_shift_detail_look.py, with a static server on the Hub folder and port)"""
import os, sys
from playwright.sync_api import sync_playwright

PORT = os.environ.get('PORT', '8765')
HERE = os.path.dirname(os.path.abspath(__file__))
STUB = open(os.path.join(HERE, 'today_calm_look.py')).read().split('STUB = r"""')[1].split('"""')[0]
EXTRA = r"""
(()=>{ DATA.ops_settings=Object.assign(DATA.ops_settings||{}, { duty_default_operations:'krystal@mo-care.com', duty_default_staffing:'krystal@mo-care.com' });
  const it=DATA.ops_items.find(x=>x.id==='cf1');
  it.detail='Tom asked if Angela is still on for Saturday. He also wants to know whether the Monday visit can move to 1pm because of a doctor appointment, and asked for a call back before 5.';
  it.steps=['Call back','Text the caregiver (Angela): "Hi Angela, are you still good for Saturday?"'];
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on');
  switchTab('mywork'); myWorkGo('today'); await sleep(200);
  const b=document.createElement('button'); document.body.appendChild(b);
  eoOpen(b); await sleep(200);
  const rows=[...document.querySelectorAll('.eoRow')];
  const row=w=>rows.find(r=>r.innerText.includes(w));
  const tom=row('Tom Herron'), joy=row('Joyce');
  ok('a row says who AND what', tom && /Call Tom Herron back about Saturday/.test(tom.innerText), tom&&tom.innerText);
  ok('...a line of the detail, shortened', tom && /“Tom asked if Angela is still on for Saturday\./.test(tom.innerText) && /…”/.test(tom.innerText), tom&&tom.innerText);
  ok('...where it stands (Late)', tom && /\bLate\b/.test(tom.querySelector('.tag-chip').innerText));
  ok('Act now rows say Act now', joy && /Act now/.test(joy.innerText), joy&&joy.innerText);
  const more=tom.querySelector('details.eoMore');
  ok('More is there and closed', !!more && !more.open);
  more.open=true; await sleep(50);
  ok('More: the whole detail, every step', /call back before 5/.test(more.innerText) && /→ Call back/.test(more.innerText) && /→ Text the caregiver \(Angela\)/.test(more.innerText), more.innerText);
  ok('More: the latest note', /Latest: .*AI \(call follow-ups\): Made from a call/.test(more.innerText), more.innerText);
  /* hand Tom to Krystal and post */
  tom.querySelector('.eoWhat').value='hand';
  document.getElementById('eoGo').click(); await sleep(400);
  const rec=(DATA.handoffs||[]).slice(-1)[0];
  const line=rec && (rec.items||[]).find(i=>i.ops_id==='cf1');
  ok('the handoff label says who and what', line && line.label==='Tom Herron (fake): Call Tom Herron back about Saturday', line);
  ok('nothing texted or emailed', !(window.__log.fn||[]).length);
  return R;
}
"""
R = []
with sync_playwright() as pw:
    sys.path.insert(0, HERE)
    from clock_pin import pin
    b = pw.chromium.launch()
    pg = b.new_page(viewport={'width': 1360, 'height': 1000})
    pin(pg)
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:' + PORT + '/index.html?proof=eo-detail'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', STUB); pg.evaluate('s=>(0,eval)(s)', EXTRA)
    R += pg.evaluate(T)
    if len(sys.argv) > 1:
        pg.evaluate("""async()=>{ const b=document.createElement('button'); document.body.appendChild(b); eoOpen(b); await new Promise(r=>setTimeout(r,200));
          const d=document.querySelector('details.eoMore'); if(d) d.open=true; }""")
        pg.locator('.ccpop').last.screenshot(path=sys.argv[1])
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

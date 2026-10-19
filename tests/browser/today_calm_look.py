"""My Work, her fixes 3 to 5 (2026-10-17): one headline number, a teammate's late work as one summary card, lighter cards.
The real page, offline, made-up people and work only: nothing is saved anywhere and nobody is texted or emailed. The page
clock is pinned to Wed 7 Oct 2026 10:00am Chicago (clock_pin.py).
(HUB_ROOT=<folder> PORT=<port> python3 tests/browser/today_calm_look.py, with a static server on that folder and port)"""
import os, sys
from playwright.sync_api import sync_playwright

ROOT = os.environ.get('HUB_ROOT', os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')))
PORT = os.environ.get('PORT', '8765')
try:   # say plainly when the static server is not running (otherwise the page never loads and the error is cryptic)
    import urllib.request; _served = urllib.request.urlopen('http://localhost:%s/index.html' % PORT, timeout=3).read()
except Exception:
    sys.exit('No static server on port %s. Start one on the Hub folder first: python3 -m http.server %s (in %s), then run this again.' % (PORT, PORT, ROOT))
if _served != open(os.path.join(ROOT, 'index.html'), 'rb').read():   # another session's server on the same port serves a different copy
    sys.exit('Port %s serves a different copy of the Hub than %s. Run: HUB_ROOT=<this folder> PORT=<a free port> python3 %s, with python3 -m http.server <that port> in this folder.' % (PORT, ROOT, sys.argv[0]))

STUB = r"""
(()=>{
  const W=window, H=h=>new Date(Date.now()+h*36e5).toISOString();
  W.__log={ writes:[], toasts:[] };
  const S='samantha@mo-care.com', K='krystal@mo-care.com';
  const q=()=>{ const p=new Proxy(function(){}, { get(_,k){ if(k==='then') return (a,b)=>Promise.resolve({data:[],error:null}).then(a,b);
      if(k==='maybeSingle'||k==='single') return ()=>Promise.resolve({data:null,error:null}); return ()=>p; } }); return p; };
  (0,eval)(`sb={ from:()=>window.__q(), rpc:()=>Promise.resolve({data:null,error:null}),
    auth:{ getSession:async()=>({data:{session:null}}), getUser:async()=>({data:{user:null}}) },
    functions:{ invoke:async()=>({data:null,error:null}) }, storage:{ from:()=>({}) } };
    ME={ email:'${S}', name:'Samantha Troutman', shift:'day' };
    OPS_PEOPLE=[{ person_id:'p_s', full_name:'Samantha Troutman', primary_email:'${S}' },{ person_id:'p_k', full_name:'Krystal Land', primary_email:'${K}' }];
    OPS_DOMAINS=[{ code:'scheduling_coverage', label:'Scheduling and coverage', owner_person:'p_s', escalation_person:'p_s' },
                 { code:'client_care', label:'Client care and family relationships', owner_person:'p_k', escalation_person:'p_s' }];`);
  W.__q=q;
  W.persist=async(k,v)=>{ W.__log.writes.push(k+':'+v.id); };
  W.ccOpsRefresh=()=>{}; W.ccRecentFetch=async()=>{};
  W.ccToast=m=>{ W.__log.toasts.push(m); };
  DATA.coverage_cases=[]; DATA.leads=DATA.leads||[];
  const mine={ owner:S, owner_name:'Samantha Troutman', domain:'scheduling_coverage', status:'open' };
  const kry=(id,title,lvl,hrs)=>({ id, kind:'care_note', title, about:'Client '+id, owner:K, owner_name:'Krystal Land', domain:'client_care', status:'open',
    due:H(-hrs), created_at:H(-hrs-5), escalation:{ to:S, to_name:'Samantha Troutman', level:lvl, why:'it\'s overdue', at:H(-2) } });
  DATA.ops_items=[
    Object.assign({ id:'tk1', kind:'staffing_issue', title:'NO CLOCK-IN: Joyce for Linda', about:'Joyce (fake)', opened_by:'timekeeper', created_by:'timekeeper-watch',
      urgency:'urgent', due:H(-0.1), created_at:H(-0.2) }, mine),
    Object.assign({ id:'cf1', kind:'call_followup', title:'Call Tom Herron back about Saturday', about:'Tom Herron (fake)', urgency:'normal',
      detail:'Tom asked if Angela is still on for Saturday.', next_action:'Call back', steps:['Call back'], due:H(-26), created_at:H(-40),
      source:{ type:'call_reading', channel:'call', call_at:'2026-10-05T15:00:00Z' },
      history:[{ at:H(-40), by:'AI (call follow-ups)', text:'Made from a call with Tom Herron, Monday, October 5, 2026 at 10:00 AM; Samantha Troutman owns scheduling and coverage' }] }, mine),
    Object.assign({ id:'hand1', kind:'request', title:'Order gloves for Linda', about:'Linda (fake) supplies', due:H(2), created_at:H(-10),
      owner_history:[{ at:H(-3), by:K, by_name:'Krystal Land', from:K, to:S, to_name:'Samantha Troutman', how:'handed', note:'Call the daughter first' }],
      history:[{ at:H(-9), by:'Krystal Land', text:'Opened' },{ at:H(-3), by:'Krystal Land', text:'Handed to Samantha: call the daughter first' }] }, mine),
    kry('k1','Red flag: Elizabeth Kurtz visit, sudden illness','urgent',30),
    kry('k2','Yellow flag: Josephine visit, confusion','overdue',20),
    kry('k3','Call Ashley back about Sundays','overdue',50),
    kry('k4','Update Emma availability','overdue',10)
  ];
})();
"""

T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const card=id=>document.querySelector('.wkcard[data-id="'+id+'"]');
  document.getElementById('appScreen').classList.add('on');
  switchTab('mywork'); myWorkGo('today'); await sleep(250);
  const C=opsTodayCounts();

  /* fix 3: one number */
  ok('counts follow the lanes', C.act===1 && C.late===1 && C.due===1, C);
  ccRenderPulse();
  const pulse=$('#topbarPulse')?$('#topbarPulse').innerText:'';
  ok('header chip: 1 needs you now', /1\s*needs you now/.test(pulse), pulse);
  ok('header chip: no "late for you" when something needs you now', !/late for you/.test(pulse), pulse);
  const tabs=$('#myWorkTabs').innerText;
  ok('Today tab carries the Act now number', /Today\s*1\b/.test(tabs), tabs);
  ok('All mine and Escalated carry no number', !/All mine\s*\d/.test(tabs) && !/Escalated to you\s*\d/.test(tabs), tabs);
  ok('select-all has no big number', /Select all(?!\s*\d)/.test($('#myWorkWrap').innerText));
  opsBadges(); const gb=document.getElementById('gb-mywork');
  ok('My Work pill = same one number', !gb || gb.textContent==='1', gb&&gb.textContent);

  /* fix 4: Krystal's work is one card */
  const team=$$('.wk-team');
  ok('one team card for Krystal', team.length===1 && /Krystal has 4 late items/.test(team[0].innerText), team.map(t=>t.innerText));
  ok('team card says how many are urgent', /1 urgent/.test(team[0].innerText));
  ok('urgent one listed first, nothing hidden', /^· Red flag: Elizabeth/m.test(team[0].innerText) && /and 1 more/.test(team[0].innerText), team[0].innerText);
  ok('Krystal\'s items are not my cards on Today', !card('k1') && !card('k2'));
  ok('team card sits above Act now', $('#myWorkWrap').innerText.indexOf('Krystal has')<$('#myWorkWrap').innerText.indexOf('ACT NOW'));
  team[0].querySelector('button').click(); await sleep(200);
  ok('See Krystal\'s list opens Escalated on Krystal', MYWORK_TAB==='escalated' && MYWORK_ESC_WHO==='krystal@mo-care.com' && ['k1','k2','k3','k4'].every(id=>!!card(id)));
  ok('...and says so, with a way back', /Showing Krystal’s only/.test($('#myWorkWrap').innerText));
  myWorkGo('today'); await sleep(150);
  ok('leaving clears the narrowing', MYWORK_ESC_WHO==='');

  /* fix 5: lighter cards */
  const t1=card('tk1').innerText, c1=card('cf1').innerText, h1=card('hand1').innerText;
  ok('no routine "Why you\'re seeing this"', !/Why you’re seeing this/.test(t1) && !/Why you’re seeing this/.test(c1), [t1,c1]);
  ok('unusual reasons still shown (handed to you)', /Why you’re seeing this:.*Handed to you by Krystal/.test(h1), h1);
  ok('my own card: no "Samantha ·" in the due tag', !/Samantha ·/.test(c1) && /was due/.test(c1), c1);
  ok('call card says where it came from in the header', /Call follow-up · from a call Oct 5/.test(c1), c1);
  ok('no AI "Made from…" footer line', !/Made from a call/.test(c1), c1);
  ok('footer keeps the latest real activity, once', /Handed to Samantha/.test(h1) && !/Opened/.test(h1), h1);
  const btns=[...card('cf1').querySelectorAll('button')].map(b=>b.textContent.trim());
  ok('three buttons: Done, Hand off, Talk about', btns.join('|')==='Done|Hand off|Talk about', btns);
  card('cf1').querySelector('.wkmore').click(); await sleep(150);
  const menu=$$('.ccpick-row').map(r=>r.textContent);
  ok('Jot on my desk is in the ⋯ menu (when My Desk is on)', typeof dkAllowed!=='function' || !dkAllowed() || menu.some(t=>/Jot on my desk/.test(t)), menu);
  ccPopClose();
  ok('detail and next step still on the card', /Tom asked if Angela/.test(c1) && /→ Call back/.test(c1));
  return R;
}
"""

R = []
with sync_playwright() as pw:
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from clock_pin import pin
    b = pw.chromium.launch()
    for name, size in (('desktop', {'width': 1360, 'height': 900}), ('phone', {'width': 390, 'height': 844})):
        pg = b.new_page(viewport=size)
        pin(pg)
        pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        pg.goto('http://localhost:' + PORT + '/index.html?proof=calm-' + name); pg.wait_for_timeout(1200)
        pg.evaluate('s=>(0,eval)(s)', STUB)
        out = [[s_, name + ': ' + n, d] for s_, n, d in pg.evaluate(T)]
        out.append(['PASS' if not errs else 'FAIL', name + ': no page errors', errs[:3]])
        R += out; pg.close()
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

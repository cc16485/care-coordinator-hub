"""Today lanes + past its day (her fixes 1 and 2, 2026-10-17). The real page, offline, made-up people and work only:
nothing is saved anywhere (saves are recorded, not sent) and nobody is texted or emailed. The page clock is pinned to
Wed 7 Oct 2026 10:00am Chicago (clock_pin.py), so the dates below are fixed.
(HUB_ROOT=<folder> PORT=<port> python3 tests/browser/today_lanes_look.py, with a static server on that folder and port)"""
import os, sys
from playwright.sync_api import sync_playwright

ROOT = os.environ.get('HUB_ROOT', '/Users/samantha/Claude/Projects/cc-hub-live')
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
  const S='samantha@mo-care.com';
  const q=()=>{ const p=new Proxy(function(){}, { get(_,k){ if(k==='then') return (a,b)=>Promise.resolve({data:[],error:null}).then(a,b);
      if(k==='maybeSingle'||k==='single') return ()=>Promise.resolve({data:null,error:null}); return ()=>p; } }); return p; };
  (0,eval)(`sb={ from:()=>window.__q(), rpc:()=>Promise.resolve({data:null,error:null}),
    auth:{ getSession:async()=>({data:{session:null}}), getUser:async()=>({data:{user:null}}) },
    functions:{ invoke:async()=>({data:null,error:null}) }, storage:{ from:()=>({}) } };
    ME={ email:'${S}', name:'Samantha Troutman', shift:'day' };
    OPS_PEOPLE=[{ person_id:'p_s', full_name:'Samantha Troutman', primary_email:'${S}' }];
    OPS_DOMAINS=[{ code:'scheduling_coverage', label:'Scheduling and coverage', owner_person:'p_s', escalation_person:'p_s' }];`);
  W.__q=q;
  W.persist=async(k,v)=>{ W.__log.writes.push(k+':'+v.id); };
  W.ccOpsRefresh=()=>{}; W.ccRecentFetch=async()=>{};
  W.ccToast=m=>{ W.__log.toasts.push(m); };
  W.reviewMaybeCreate=async()=>{};
  DATA.coverage_cases=[]; DATA.leads=DATA.leads||[];
  const own={ owner:S, owner_name:'Samantha Troutman', domain:'scheduling_coverage', status:'open' };
  const cf=(id,title,callAt,due,urg)=>Object.assign({ id, kind:'call_followup', title, about:'Fake '+id, urgency:urg||'normal',
    due, created_at:callAt, source:{ type:'call_reading', call_at:callAt } }, own);
  DATA.ops_items=[
    /* right now */
    Object.assign({ id:'tk1', kind:'staffing_issue', title:'NO CLOCK-IN: Joyce for Linda', about:'Joyce (fake)', opened_by:'timekeeper',
      urgency:'urgent', due:H(-0.1), created_at:H(-0.2) }, own),
    /* "urgent" but two days past due: no longer right now */
    cf('oldurg','Follow up now: Steve not answering door at 9:30 visit', H(-50), H(-49), 'urgent'),
    /* late, no day to read: stays late */
    cf('callback','Call Iris Dorsey back; she could not reach the office', H(-60), H(-30)),
    /* past its day: visit on Mon Oct 5 (call Sun Oct 4) */
    cf('cancel','Cancel Angela\'s 10/5 visit for Betty Herron at family\'s request', '2026-10-04T15:00:00Z', H(-30), 'urgent'),
    /* "today" read against the call's day (Mon Oct 5) */
    cf('today','Open a call-off case for Karen\'s 8am visit today (Iris sick)', '2026-10-05T12:30:00Z', H(-20), 'urgent'),
    /* weekday read against the call's day: call Fri Oct 2, "Monday" = Oct 5 */
    cf('dow','Confirm Steve\'s Monday DMV shift 09:30-12:30 with sons', '2026-10-02T15:00:00Z', H(-40)),
    /* never past: pay still needs doing after the day */
    cf('pay','Pay Angela for cancelled 10/5 Betty Herron visit as if worked', '2026-10-04T15:00:00Z', H(-30)),
    /* never past: latest day named is still ahead (Oct 12) */
    cf('later','Remove Steve\'s Mon 10/12 visit; Friday 10/2 replaces it', '2026-10-01T15:00:00Z', H(-40)),
    /* never past: ongoing */
    cf('ongoing','Add Ashley\'s Sunday shifts to schedule starting October 4', '2026-10-01T15:00:00Z', H(-40)),
    /* a second past one, kept once already for that same day: back in Late */
    Object.assign(cf('kept','Change April\'s Fri Oct 2 visit to start at 3:00 PM', '2026-10-01T15:00:00Z', H(-40)), { past_day_keep:'2026-10-02' }),
    /* a third past one, for the bulk close */
    cf('bulk2','Confirm LeeAnn\'s Sat 10/3 visit as 8am-12pm', '2026-10-01T15:00:00Z', H(-40)),
    /* due later today */
    Object.assign({ id:'due1', kind:'request', title:'Betsy callback', about:'Betsy (fake) callback', due:H(3), created_at:H(-3) }, own),
    /* a non-call card with a past date in its title: never past (a red flag still matters) */
    Object.assign({ id:'flag', kind:'care_note', title:'Red flag: Elizabeth\'s Mon, Oct 5 visit, sudden illness', about:'Elizabeth (fake)',
      urgency:'urgent', due:H(-30), created_at:H(-40) }, own)
  ];
})();
"""

T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const item=id=>DATA.ops_items.find(x=>x.id===id);
  const card=id=>document.querySelector('.wkcard[data-id="'+id+'"]');
  document.getElementById('appScreen').classList.add('on');
  ok('today is pinned to Oct 7', ccTodayCentral()==='2026-10-07', ccTodayCentral());

  /* the day reader */
  ok('10/5 visit -> Oct 5', opsAboutDay(item('cancel'))==='2026-10-05', opsAboutDay(item('cancel')));
  ok('"today" = the call\'s day (Oct 5)', opsAboutDay(item('today'))==='2026-10-05', opsAboutDay(item('today')));
  ok('"Monday" after a Friday call = Oct 5', opsAboutDay(item('dow'))==='2026-10-05', opsAboutDay(item('dow')));
  ok('latest day named wins (Oct 12)', opsAboutDay(item('later'))==='2026-10-12', opsAboutDay(item('later')));
  ok('pay card has no day', opsAboutDay(item('pay'))==='');
  ok('ongoing card has no day', opsAboutDay(item('ongoing'))==='');
  ok('call-back card has no day', opsAboutDay(item('callback'))==='');
  ok('red flag (not a call card) has no day', opsAboutDay(item('flag'))==='');

  /* lanes */
  const lanes={}; DATA.ops_items.filter(i=>i.status==='open').forEach(i=>lanes[i.id]=myWorkLane(i));
  ok('missed clock-in: Act now', lanes.tk1===0, lanes);
  ok('red flag 30h late: Late (not Act now)', lanes.flag===1, lanes);
  ok('"urgent" from two days ago: Late, not Act now', lanes.oldurg===1, lanes);
  ok('call-back: Late', lanes.callback===1, lanes);
  ok('cancel / today / dow / bulk2: Past its day', [lanes.cancel,lanes.today,lanes.dow,lanes.bulk2].every(x=>x===3), lanes);
  ok('pay, later, ongoing: Late', [lanes.pay,lanes.later,lanes.ongoing].every(x=>x===1), lanes);
  ok('kept for its day: Late again', lanes.kept===1, lanes);
  ok('due in 3h: Due today', lanes.due1===2, lanes);

  switchTab('mywork'); myWorkGo('today'); await sleep(200);
  const txt=$('#myWorkWrap').innerText;
  const at=w=>txt.indexOf(w);
  ok('lane order: Act now, Late, Due today, Past its day',
     at('ACT NOW')>-1 && at('ACT NOW')<at('LATE, STILL MATTERS') && at('LATE, STILL MATTERS')<at('DUE TODAY') && at('DUE TODAY')<at('PAST ITS DAY'), txt.slice(0,600));
  ok('Act now says what it means', /ACT NOW · 1/.test(txt), txt.slice(0,300));
  ok('Past its day shows its count', /PAST ITS DAY · 4/.test(txt));
  ok('past cards folded away', !card('cancel') && !card('today'));
  ok('Select all leaves folded cards out', !myWorkSelectable().some(r=>r.id==='cancel'));
  const order=myWorkRows().map(r=>r.id);
  ok('keyboard order follows the lanes', order.indexOf('tk1')<order.indexOf('oldurg') && order.indexOf('oldurg')<order.indexOf('due1') && order.indexOf('due1')<order.indexOf('cancel'), order);

  /* open the pile */
  [...$$('#myWorkWrap button')].find(b=>/Look through them/.test(b.textContent)).click(); await sleep(150);
  ok('opened: past card shown', !!card('cancel'));
  const pd=card('cancel')&&card('cancel').querySelector('.wk-pastday');
  ok('card says its day has passed', pd && /This was about Mon, Oct 5\. That day has passed\./.test(pd.innerText), pd&&pd.innerText);
  ok('no prompt on a Late card', card('callback') && !card('callback').querySelector('.wk-pastday'));

  /* Still needs doing */
  [...card('today').querySelectorAll('.wk-pastday button')].find(b=>/Still needs doing/.test(b.textContent)).click(); await sleep(150);
  ok('kept: remembered for that day', item('today').past_day_keep==='2026-10-05' && item('today').status==='open');
  ok('kept: saved', L.writes.includes('ops_items:today'));
  ok('kept: back in Late', myWorkLane(item('today'))===1 && card('today') && !card('today').querySelector('.wk-pastday'));
  ok('kept: history says so', /Still needs doing after its day/.test(JSON.stringify(item('today').history)));

  /* Close it */
  [...card('cancel').querySelectorAll('.wk-pastday button')].find(b=>/Close it/.test(b.textContent)).click(); await sleep(150);
  const c=item('cancel');
  ok('closed as stale with the day in the note', c.status==='done' && c.resolution_code==='stale' && /Mon, Oct 5/.test(c.close_note), c);
  ok('closed by me', c.closed_by==='samantha@mo-care.com');
  ok('closed: saved', L.writes.includes('ops_items:cancel'));

  /* Close all (2 left: dow, bulk2) */
  $('#pastCloseAll').click(); await sleep(150);
  const pop=document.body.innerText;
  ok('close-all names and counts them', /Close 2 cards whose day has passed\?/.test(pop) && /Confirm LeeAnn/.test(pop) && /Confirm Steve/.test(pop));
  document.getElementById('pcGo').click(); await sleep(250);
  ok('close-all closed both', item('dow').status==='done' && item('bulk2').status==='done');
  ok('close-all left everything else open', ['tk1','oldurg','callback','pay','later','ongoing','kept','today','due1','flag'].every(i=>item(i).status==='open'));
  ok('pile gone once empty', !/PAST ITS DAY/.test($('#myWorkWrap').innerText));
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
        pg.goto('http://localhost:' + PORT + '/index.html?proof=lanes-' + name); pg.wait_for_timeout(1200)
        pg.evaluate('s=>(0,eval)(s)', STUB)
        out = pg.evaluate(T)
        if name == 'desktop':
            pg.evaluate("()=>{ MYWORK_PAST_OPEN=false; }")
        out = [[s_, name + ': ' + n, d] for s_, n, d in out]
        out.append(['PASS' if not errs else 'FAIL', name + ': no page errors', errs[:3]])
        R += out; pg.close()
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

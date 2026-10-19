"""Tracked Ask for help (Stage 2, 2026-10-19). The real Hub page, offline (files served from this folder, no server needed), made-up
people and cards only; saves are recorded, never sent; nobody is texted, emailed or called.
Clock pinned to Wednesday 7 October 2026, 10:00 AM Chicago. (python3 tests/browser/ask_help_look.py; SHOTS=<dir> saves screenshots)"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = os.environ.get('SHOTS')
STUB = r"""
(()=>{
  const W=window, at=(hm,d)=>new Date('2026-10-'+(d||'07')+'T'+hm+':00-05:00').toISOString();
  W.__log={ writes:[], fn:[], toasts:[], events:[], alerts:[] };
  const K='krystal@mo-care.com', S='samantha@mo-care.com', A='angiel@mo-care.com';
  (0,eval)(`sb={ from:()=>{ const p={ select(){return p;}, eq(){return p;}, gte(){return p;}, in(){return p;}, order(){return p;}, limit(){return p;},
      single:async()=>({ data:null, error:null }), maybeSingle:async()=>({ data:null, error:null }),
      then(a){ return Promise.resolve({data:[],error:null}).then(a); } }; return p; },
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async(n)=>{ window.__log.fn.push(n); return {data:null,error:null}; } },
    auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };
    CC_ROLE_BY_EMAIL={ '${S}':['owner_admin'], '${K}':['care_coordinator'], '${A}':['care_coordinator'] };
    OPS_PEOPLE=[{ person_id:'p_k', full_name:'Krystal Land', primary_email:'${K}' },{ person_id:'p_s', full_name:'Samantha Troutman', primary_email:'${S}' },{ person_id:'p_a', full_name:'Angiel Test', primary_email:'${A}' }];`);
  W.persist=async(k,v)=>{ W.__log.writes.push(k+':'+v.id); };
  W.opEvent=(v,o)=>W.__log.events.push(v+':'+(o&&o.summary||''));
  W.ccOpsRefresh=()=>{}; W.ccRecentFetch=async()=>{}; W.ccToast=m=>W.__log.toasts.push(m); W.alert=m=>W.__log.alerts.push(m);
  W.ccConfirm=async()=>true;
  W.__pick=A; W.ccPickPerson=(anchor,o)=>o.onPick(W.__pick);   /* the person picker: picks __pick */
  W.TA.coordinators=()=>[K,A];
  DATA.handoffs=[]; DATA.leads=[]; DATA.coverage_cases=[];
  DATA.coordinator_staff=[{ id:'sk', name:'Krystal Land', email:K }, { id:'sa', name:'Angiel Test', email:A }];
  DATA.duty_windows=[{ id:'dk', area:'operations', person:K, recur:{ days:[1,2,3,4,5], from:'08:00', to:'14:00' } },
                     { id:'da', area:'operations', person:A, recur:{ days:[1,2,3,4,5], from:'13:00', to:'17:00' } }];
  DATA.ops_settings={ ask_help_live:true };
  const own=(o)=>Object.assign({ status:'open', kind:'request', opened_by:'person', owner:K, owner_name:'Krystal Land', created_at:at('08:00') }, o);
  DATA.ops_items=[
    own({ id:'c1', title:'Send the care plan to the Able family (fake)', due:at('16:00','08') }),
    own({ id:'c2', title:'Call the Baker family back (fake)', due:at('15:00','08') }),
    own({ id:'c3', title:'Find a caregiver for Friday (fake)', due:at('15:00'), help_from:A,
      help_asks:[{ id:'old', to:A, to_name:'Angiel Test', by:K, by_name:'Krystal Land', what:'Call two PRN caregivers', need_by:at('12:00'), asked_at:at('09:00'), expires_at:at('09:15'), urgent:true, state:'asked' }] }),
    own({ id:'c4', title:'Old style ask (fake)', due:at('15:00','09') }) ];
  W.__n0=DATA.ops_items.length;
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, it=id=>DATA.ops_items.find(x=>x.id===id), mw=()=>document.getElementById('tab-mywork').innerText;
  const as=(e,n)=>(0,eval)("ME={ email:'"+e+"', name:'"+n+"', shift:'day' };");
  const pop=()=>[...document.querySelectorAll('.ccpop')].pop();
  const ids=b=>new Set((b||[]).map(i=>i.id));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  switchTab('mywork');

  /* ── Krystal asks Angiel ── */
  as('krystal@mo-care.com','Krystal Land'); myWorkGo('today'); await sleep(150);
  L.writes.length=0;
  TA.askSupport('c1','x'); await sleep(80);
  let p=pop(); ok('Ask opens: what do you need, by when', p && /Ask Angiel for help/.test(p.innerText) && p.querySelector('#ahWhat') && p.querySelector('#ahBy'), p&&p.innerText);
  p.querySelector('#ahGo').click(); await sleep(50);
  ok('...it won\'t send without saying what you need', !it('c1').help_asks && L.alerts.some(a=>/Say what you need/.test(a)));
  p.querySelector('#ahWhat').value='Email the care plan PDF to the daughter'; p.querySelector('#ahGo').click(); await sleep(120);
  const a1=AH.current(it('c1'));
  ok('Asked: who, what, by when, by whom; card still Krystal\'s and open', a1 && a1.to==='angiel@mo-care.com' && a1.by==='krystal@mo-care.com' && a1.what==='Email the care plan PDF to the daughter' && a1.need_by && a1.state==='asked' && it('c1').owner==='krystal@mo-care.com' && it('c1').status==='open', a1);
  ok('...not urgent: Angiel has until the end of her shift (5 PM)', new Date(a1.expires_at).getHours()===17, a1.expires_at);
  ok('...saved once; Angiel is told', L.writes.join()==='ops_items:c1' && (it('c1').notices||[]).some(n=>n.for==='angiel@mo-care.com'&&n.kind==='help_ask'));
  ok('Krystal\'s card says she asked and is waiting, with Withdraw', /Asked Angiel for help/.test(TA.cardTop(it('c1'))) && /Withdraw/.test(TA.cardTop(it('c1'))));

  /* ── Angiel answers ── */
  as('angiel@mo-care.com','Angiel Test'); myWorkGo('today'); await sleep(150);
  ok('Angiel\'s Today: ASKED TO HELP with the card', /ASKED TO HELP · 1/.test(mw()) && /Send the care plan to the Able family/.test(mw()), mw().slice(0,700));
  ok('...no "All caught up" while an ask waits for her answer, and no duplicate waiting box on her copy', !/All caught up/.test(mw()) && !/Asked Angiel for help/.test(TA.cardTop(it('c1'))));
  ok('...a pending ask is not in her Helping yet', !ids(myWorkBuckets().helping).has('c1'));
  ok('...the card offers Accept and Decline only', /Accept…/.test(TA.othersButtons(it('c1'))) && /Decline…/.test(TA.othersButtons(it('c1'))) && !/Take it…/.test(TA.othersButtons(it('c1'))));
  ok('the old ask that ran out is not on her list (no answer)', !AH.asksForMe().some(i=>i.id==='c3'));
  L.writes.length=0;
  AH.accept('c1','x'); await sleep(80); p=pop();
  p.querySelector('#ahGo').click(); await sleep(40);
  ok('Accept needs what she\'ll do', AH.current(it('c1')).state==='asked' && L.alerts.some(a=>/Say what you’ll do/.test(a)));
  p.querySelector('#ahDo').value='I\'ll email it by 2:30'; p.querySelector('#ahGo').click(); await sleep(120);
  const a2=AH.current(it('c1'));
  ok('Accepted: what she\'ll do and by when; still Krystal\'s', a2.state==='accepted' && a2.will_do==='I\'ll email it by 2:30' && a2.will_by && it('c1').owner==='krystal@mo-care.com' && it('c1').help_from==='angiel@mo-care.com', a2);
  ok('...Krystal is told; it is in Angiel\'s Helping now', (it('c1').notices||[]).some(n=>n.for==='krystal@mo-care.com'&&n.kind==='help_accepted') && ids(myWorkBuckets().helping).has('c1'));
  /* My part is done */
  TA.partDone('c1','x'); await sleep(80); p=pop();
  p.querySelector('#taDid').value='Emailed the PDF at 2:20'; p.querySelector('#taNext').value='Confirm she got it'; p.querySelector('#taGo').click(); await sleep(120);
  ok('My part is done: the ask is recorded done with what she did; the card stays open and Krystal\'s', AH.current(it('c1')).state==='done' && AH.current(it('c1')).done_note==='Emailed the PDF at 2:20' && it('c1').status==='open' && it('c1').owner==='krystal@mo-care.com');

  /* ── Decline ── */
  as('krystal@mo-care.com','Krystal Land'); TA.askSupport('c2','x'); await sleep(80); p=pop();
  p.querySelector('#ahWhat').value='Call them back about Thursday'; p.querySelector('#ahGo').click(); await sleep(100);
  as('angiel@mo-care.com','Angiel Test'); AH.decline('c2','x'); await sleep(80); p=pop();
  p.querySelector('#ahGo').click(); await sleep(40);
  ok('Decline needs a short reason', AH.current(it('c2')).state==='asked');
  p.querySelector('#ahWhy').value='On a home visit until 4'; p.querySelector('#ahGo').click(); await sleep(100);
  ok('Declined: reason kept, Angiel no longer helping, Krystal told', AH.current(it('c2')).state==='declined' && AH.current(it('c2')).declined_why==='On a home visit until 4' && !it('c2').help_from && (it('c2').notices||[]).some(n=>n.for==='krystal@mo-care.com'&&n.kind==='help_declined'));
  as('krystal@mo-care.com','Krystal Land'); myWorkGo('today'); await sleep(150);
  ok('...the declined card is on Krystal\'s Today with "Ask someone else"', ids(myWorkBuckets().today).has('c2') && /declined/.test(TA.cardTop(it('c2'))) && /Ask someone else/.test(TA.cardTop(it('c2'))));

  /* ── No answer (ran out at 9:15, never written) ── */
  ok('No answer: worked out from the clock, the saved state is untouched', AH.stateOf(AH.current(it('c3')))==='no_answer' && AH.current(it('c3')).state==='asked');
  ok('...Krystal sees "Help not answered", it is on her Today, and it never counts as help', /Help not answered/.test(TA.cardTop(it('c3'))) && ids(myWorkBuckets().today).has('c3'), TA.cardTop(it('c3')));
  as('angiel@mo-care.com','Angiel Test');
  ok('...and it is not in Angiel\'s Helping', !ids(myWorkBuckets().helping).has('c3'));

  /* ── Off: Ask for help works as before ── */
  as('krystal@mo-care.com','Krystal Land'); DATA.ops_settings.ask_help_live=false; L.writes.length=0;
  TA.askSupport('c4','x'); await sleep(120);
  ok('off: Ask for help just records who was asked (no accept, no decline), as before', it('c4').help_from==='angiel@mo-care.com' && !it('c4').help_asks && L.writes.join()==='ops_items:c4', it('c4'));
  ok('off: cards show no ask status', !/Asked Angiel|Help not answered/.test(TA.cardTop(it('c3'))));

  ok('no cards created or removed', DATA.ops_items.length===window.__n0);
  ok('nothing was texted, emailed or called', L.fn.length===0, L.fn);
  return R;
}
"""
MIME = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.json':'application/json', '.webmanifest':'application/json'}
def serve(route):
    url = route.request.url
    if 'supabase.co' in url: return route.abort()
    if not url.startswith('http://askhelp.local/'): return route.continue_()
    p = (ROOT / url.split('http://askhelp.local/', 1)[1].split('?')[0].split('#')[0])
    if not p.is_file(): return route.fulfill(status=404, body='')
    route.fulfill(status=200, body=p.read_bytes(), content_type=MIME.get(p.suffix, 'application/octet-stream'))
with sync_playwright() as pw:
    b = pw.chromium.launch(); cx = b.new_context(viewport={'width': 1280, 'height': 1100}, timezone_id='America/Chicago'); pg = cx.new_page()
    pg.clock.install(time='2026-10-07T10:00:00-05:00'); pg.clock.resume()
    pg.route('**/*', serve)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://askhelp.local/index.html?proof=askhelp'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

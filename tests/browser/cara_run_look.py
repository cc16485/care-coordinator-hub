"""Let Cara run it (Cara Phase 2 Part A, 2026-10-24). The real Hub page, offline (files served from this folder), made-up cases;
the coverage server is a stand-in that records what it was asked. Proves: switch off = only owners see it, marked practice; a
coordinator never sees it while off; on = everyone in the office; start asks first and goes to the server; the panel shows who
started it, each wave and who it went to, who answered, and what needs the office; paused = Confirm on the board or "Not this
one" (with an optional reason) which goes to the server; Take it back; Keep searching after Cara hands it back; the board shows
part shifts that fit together and "office: not this one"; nothing is saved or texted from the page itself.
(python3 tests/browser/cara_run_look.py; SHOT=<file> saves a screenshot)"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOT = os.environ.get('SHOT')
STUB = r"""
(()=>{
  const W=window, iso=(min)=>new Date(Date.now()+min*60000).toISOString();
  const chi=(min)=>{ const t=new Date(Date.now()+min*60000).toLocaleString('sv-SE',{timeZone:'America/Chicago'}); return [t.slice(0,10), t.slice(11,16)]; };
  W.__log={ calls:[], resolved:[], writes:[], alerts:[], confirms:[] };
  (0,eval)(`sb={ from:()=>{ const p={ select(){return p;}, eq(){return p;}, gte(){return p;}, in(){return p;}, order(){return p;}, limit(){return p;},
      single:async()=>({ data:null, error:null }), maybeSingle:async()=>({ data:null, error:null }),
      then(a){ return Promise.resolve({data:[],error:null}).then(a); } }; return p; },
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async()=>({data:null,error:null}) },
    auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };
    ME={ email:'samantha@mo-care.com', name:'Samantha Troutman' }; CC_ROLES=['owner_admin']; CC_ROLES_CHECKED=true; CC_ROLE_BY_EMAIL={ 'samantha@mo-care.com':['owner_admin'] };`);
  W.persist=async(k,v)=>{ W.__log.writes.push(k+':'+v.id); };
  W.opEvent=()=>{}; W.alert=m=>W.__log.alerts.push(m); W.ccConfirm=async(m)=>{ W.__log.confirms.push(m); return true; }; W.ccToast=()=>{}; W.loadFromSupabase=async()=>{};
  (0,eval)("covResolve=async(id,how,name)=>{ window.__log.resolved.push([id,how,name]); }");
  const rules={ size:5, gap:20, maxWaves:3, confirmWait:20, stopBefore:120 };
  W.__run={ run:null, events:[], asks:[], needs:null, switch_on:false, live:false, practice_only:true, can_start:true, start_refused:null, rules };
  const ev=(min,kind,actor,summary)=>({ at:iso(min), kind, actor, summary, run_no:1, detail:{} });
  W.__states={
    running:{ run:{ case_id:'r1', status:'running', practice:false, started_by:'Kay Coord (fake)', started_at:iso(-40), wave:2, wave_base:0, next_wave_at:iso(15), declined:[] },
      events:[ev(-40,'started','Kay Coord (fake)','Kay Coord (fake) let Cara run it. Waves of 5, 20 minutes apart, 3 at most.'), ev(-40,'wave','Cara','Wave 1 sent to 5: Pat Prn (fake), Maria Lane (fake), Dee Hours (fake), Jess Part (fake), Hal Hill (fake).'),
        ev(-20,'wave','Cara','Wave 2 sent to 5: Ann A (fake), Bo B (fake), Cy C (fake), Di D (fake), Ed E (fake).')],
      asks:[{ id:'a1', name:'Pat Prn (fake)', wave:1, state:'no' }, { id:'a2', name:'Maria Lane (fake)', wave:1, state:'waiting' }, { id:'a3', name:'Jess Part (fake)', wave:1, state:'yes' }, { id:'a9', name:'Ann A (fake)', wave:2, state:'waiting' }],
      needs:null, switch_on:true, live:true, practice_only:false, can_start:false, start_refused:null, rules },
  };
  W.__states.paused=JSON.parse(JSON.stringify(W.__states.running));
  Object.assign(W.__states.paused.run,{ status:'paused', paused_ask_id:'a2', paused_name:'Maria Lane (fake)', paused_at:iso(-2), confirm_by:iso(18) });
  W.__states.paused.events.push(ev(-2,'paused','Cara','Maria Lane (fake) said yes to the whole shift. Cara stopped asking and told the office (texted 2). Waiting for a confirm.'));
  W.__states.paused.needs='Confirm Maria Lane (fake) in AxisCare, or tap "Not this one" so Cara keeps asking';
  W.__states.needs=JSON.parse(JSON.stringify(W.__states.running));
  Object.assign(W.__states.needs.run,{ status:'needs_office', wave:3, needs:'3 waves sent and no full-shift yes that can be confirmed', declined:[{ ask_id:'a2', name:'Maria Lane (fake)', by:'Kay Coord (fake)', why:'too far' }] });
  W.__states.needs.needs='3 waves sent and no full-shift yes that can be confirmed'; W.__states.needs.can_start=true;
  W.__board={ note:'A yes is interest only.', time_flex:'exact', handoff_ok:true, declined:[{ ask_id:'a2' }],
    combos:[{ first:{ ask_id:'a3', name:'Jess Part (fake)', from:'8am', to:'1pm' }, second:{ ask_id:'a4', name:'Hal Hill (fake)', from:'1pm', to:'5pm' }, handoff_at:'1pm', handoff_ok:true, note:'Could cover the whole shift together' }],
    parts_without_hours:[{ ask_id:'a5', name:'Kim Morning (fake)', said:'mornings only' }],
    people:[{ ask_id:'a2', name:'Maria Lane (fake)', column:'full', said:'full', reply:'yes', eligibility:{ ok:true, why:'ok' }, reasons:[], concerns:[], why:'Cara recommends them', can_confirm:true, recommended:true, channel:'text' },
      { ask_id:'a3', name:'Jess Part (fake)', column:'partial', answer_kind:'part', offer_from:'08:00', offer_to:'13:00', eligibility:{ ok:true }, reasons:[], concerns:[], why:'part', can_confirm:false, channel:'text' },
      { ask_id:'a4', name:'Hal Hill (fake)', column:'partial', answer_kind:'part', offer_from:'13:00', offer_to:'17:00', eligibility:{ ok:true }, reasons:[], concerns:[], why:'part', can_confirm:false, channel:'text' }] };
  const realFetch=W.fetch;
  W.fetch=async(url,o)=>{ url=String(url);
    if(url.includes('/functions/v1/coverage-run')){ const b=JSON.parse(o.body); W.__log.calls.push(b);
      if(b.action==='cara_run_get') return new Response(JSON.stringify(W.__run),{status:200});
      if(b.action==='board') return new Response(JSON.stringify(W.__board),{status:200});
      if(/^cara_run_/.test(b.action)) return new Response(JSON.stringify({ ok:true, practice:W.__run.practice_only }),{status:200});
      return new Response(JSON.stringify({ group0:[],group1:[],group2:[],prn_other:[],prn_ongoing:[],excluded:[],meta:{} }),{status:200}); }
    return realFetch(url,o); };
  const [d,t]=chi(300), [,e]=chi(840);
  DATA.ops_settings={};
  DATA.coverage_cases=[{ id:'r1', status:'open', reason:'call_off', client:'Ruth Kay (fake)', shift_date:d, shift_time:t+'-'+e, opened_at:iso(-90), admin_alerted:iso(-89), asked:[] }];
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,800)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, tab=()=>document.getElementById('tab-coverage').innerText, btn=(re)=>[...document.querySelectorAll('#tab-coverage button')].find(b=>re.test(b.textContent));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  const show=async()=>{ renderCoverage(); await sleep(150); CRUN.load('r1'); await sleep(450); };
  switchTab('coverage'); caraShowCase('r1'); await sleep(600);
  ok('switch off, an owner: the panel shows, marked practice, with the plain rules', /Let Cara ask for you/.test(tab()) && /Practice\./.test(tab()) && /asks 5 at a time, 20 minutes apart, 3 waves at most/.test(tab()) && !!btn(/^Let Cara run it \(practice\)$/), tab().slice(0,900));
  L.calls=[]; btn(/^Let Cara run it \(practice\)$/).click(); await sleep(500);
  ok('start asks first (says practice, nobody texted, nothing assigned until a person confirms), then goes to the server', /PRACTICE/.test(L.confirms[0]||'') && /Nothing is assigned until a person confirms/.test(L.confirms[0]||'') && L.calls.some(c=>c.action==='cara_run_start'&&c.case_id==='r1'), [L.confirms, L.calls]);
  (0,eval)("CC_ROLES=['care_coordinator']"); await show();
  ok('switch off, a coordinator: nothing shows and the server is not asked', !/Let Cara/.test(tab()) && !/Cara is running/.test(tab()));
  DATA.ops_settings={ cara_run_live:true, cara_board_live:true }; Object.assign(window.__run, window.__states.running); await show();
  let t=tab();
  ok('running: who started it and when, how many waves, when the next one is due, Take it back', /Cara is running this/.test(t) && /started by Kay Coord \(fake\)/.test(t) && /2 waves sent/.test(t) && /next wave not before/.test(t) && !!btn(/^Take it back$/), t.slice(0,1200));
  ok('who each wave went to and who answered', /Wave 1:.*Pat Prn \(fake\) no/.test(t) && /Jess Part \(fake\) yes/.test(t) && /Wave 2:.*Ann A \(fake\) no answer yet/.test(t), t.slice(0,1400));
  ok('the history, in order', /What Cara did \(3\)/.test(t) && t.indexOf('let Cara run it')<t.indexOf('Wave 1 sent to 5')&&t.indexOf('Wave 1 sent to 5')<t.indexOf('Wave 2 sent to 5'));
  Object.assign(window.__run, JSON.parse(JSON.stringify(window.__states.paused))); window.__board.people[0].can_confirm=true;
  DATA.coverage_cases[0].asked=[{ id:'a2', name:'Maria Lane (fake)', state:'yes' }, { id:'a3', name:'Jess Part (fake)', state:'yes', answer_kind:'part' }, { id:'a4', name:'Hal Hill (fake)', state:'yes', answer_kind:'part' }];
  await show(); await sleep(500); CB.pick('r1','a2'); await sleep(250); t=tab();
  ok('paused: "Needs you: Confirm Maria ... or Not this one", the deadline, and Confirm on the board below', /Cara is waiting for you/.test(t) && /Needs you: Confirm Maria Lane \(fake\) in AxisCare, or tap "Not this one"/.test(t) && /No answer by .* and Cara keeps asking/.test(t) && !!btn(/^Not this one$/) && !!btn(/^Confirm Maria/), t.slice(0,1500));
  (btn(/^Not this one$/)||{click(){}}).click(); await sleep(200);
  ok('"Not this one" asks for an optional reason before anything is sent', !!document.getElementById('crnot_r1') && !L.calls.some(c=>c.action==='cara_run_not_this_one'));
  document.getElementById('crnot_r1').value='lives too far'; L.calls=[]; (btn(/^Not this one, keep asking$/)||{click(){}}).click(); await sleep(600);
  CB.pick('r1','a2'); await sleep(250); if(!btn(/^Confirm Maria/)){ CB.pick('r1','a2'); await sleep(250); }
  ok('...then goes to the server with the yes and the reason', L.calls.some(c=>c.action==='cara_run_not_this_one'&&c.ask_id==='a2'&&c.why==='lives too far'), L.calls);
  (btn(/^Confirm Maria/)||{click(){}}).click(); await sleep(150);
  ok('Confirm on the board is the one existing confirm (covResolve, which writes AxisCare and checks it)', JSON.stringify(L.resolved)==='[["r1","covered","Maria Lane (fake)"]]', L.resolved);
  Object.assign(window.__run, JSON.parse(JSON.stringify(window.__states.needs))); CB.load('r1'); await show(); t=tab();
  ok('handed back: says why, Keep searching and Take it back, who got "Not this one" and why', /Cara stopped: over to the office/.test(t) && /Needs you: 3 waves sent/.test(t) && !!btn(/^Keep searching$/) && /Not this one: Maria Lane \(fake\) \(Kay, too far\)/.test(t), t.slice(0,1500));
  L.calls=[]; (btn(/^Keep searching$/)||{click(){}}).click(); await sleep(500);
  ok('Keep searching asks first, then starts Cara again on the server', L.calls.some(c=>c.action==='cara_run_start'), L.calls);
  L.calls=[]; (btn(/^Take it back$/)||{click(){}}).click(); await sleep(500);
  ok('Take it back asks first, then stops Cara on the server', /Take this shift back from Cara/.test(L.confirms[L.confirms.length-1]) && L.calls.some(c=>c.action==='cara_run_stop'), L.calls);
  DATA.coverage_cases[0].asked=[{ id:'a2', name:'Maria Lane (fake)', state:'yes' }, { id:'a3', name:'Jess Part (fake)', state:'yes', answer_kind:'part' }, { id:'a4', name:'Hal Hill (fake)', state:'yes', answer_kind:'part' }];
  renderCoverage(); await sleep(800); t=tab();
  ok('the board: part shifts that fit together, with the hand-off time; a part offer without hours is listed too', /Part shifts that fit together/.test(t) && /Jess Part \(fake\) 8am to 1pm \+ Hal Hill \(fake\) 1pm to 5pm/.test(t) && /hand-off at 1pm/.test(t) && /Kim Morning \(fake\) \(“mornings only”\)/.test(t), t.slice(0,2500));
  ok('the board marks the yes the office said "Not this one" to', /office: not this one/.test(t));
  ok('nothing saved from the page itself; nothing texted from it', !L.writes.length && !L.calls.some(c=>c.action==='send_selected'), [L.writes, L.calls.map(c=>c.action)]);
  return R;
}
"""
MIME = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.json':'application/json', '.webmanifest':'application/json'}
def serve(route):
    url = route.request.url
    if 'supabase.co' in url: return route.abort()
    if not url.startswith('http://cararun.local/'): return route.continue_()
    p = (ROOT / url.split('http://cararun.local/', 1)[1].split('?')[0].split('#')[0])
    if not p.is_file(): return route.fulfill(status=404, body='')
    route.fulfill(status=200, body=p.read_bytes(), content_type=MIME.get(p.suffix, 'application/octet-stream'))
with sync_playwright() as pw:
    b = pw.chromium.launch(); cx = b.new_context(viewport={'width': 1280, 'height': 900}, timezone_id='America/Chicago'); pg = cx.new_page()
    pg.route('**/*', serve)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    if os.environ.get('DEBUG'): pg.on('console', lambda m: print('console:', m.text[:200], flush=True))
    pg.goto('http://cararun.local/index.html?proof=cararun'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    if SHOT:   # the panel paused on a yes, with the board below
        pg.evaluate("()=>{ DATA.ops_settings={ cara_run_live:true, cara_board_live:true }; Object.assign(window.__run, JSON.parse(JSON.stringify(window.__states.paused))); DATA.coverage_cases[0].asked=[{ id:'a2', name:'Maria Lane (fake)', state:'yes' }, { id:'a3', name:'Jess Part (fake)', state:'yes', answer_kind:'part' }, { id:'a4', name:'Hal Hill (fake)', state:'yes', answer_kind:'part' }]; window.__board.declined=[]; switchTab('coverage'); caraShowCase('r1'); CRUN.load('r1'); CB.load('r1'); }"); pg.wait_for_timeout(1200)
        pg.evaluate("()=>{ CB.pick('r1','a2'); }"); pg.wait_for_timeout(400)
        pg.evaluate("()=>{ document.querySelectorAll('#crun_r1 details').forEach(d=>d.open=true); }")
        pg.add_style_tag(content='header.topbar{position:static!important}'); el = pg.query_selector('#tab-coverage'); (el or pg).screenshot(path=SHOT)
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

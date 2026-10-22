"""In Training plan v2, Part B (Samantha approved 2026-10-22). The Hub, offline, made-up people, a stand-in server:
  1. the onboarding row after Step 2 is checked (button mode): "AxisCare setup"; the setup card shows what to type into
     AxisCare (the birth date through the logged reveal, MM-DD-YYYY), Check AxisCare says what does not match, and
     Send orientation information sends and says how.
  2. the readiness card's check-in call: three ticks, the test clock-in choice, No answer, Done.
(python3 tests/browser/in_training_part_b_look.py [port] [screenshot.png], static server on 8901 by default)"""
import sys
from playwright.sync_api import sync_playwright
PORT = sys.argv[1] if len(sys.argv) > 1 else '8901'
SHOT = sys.argv[2] if len(sys.argv) > 2 else ''
H = open('/Users/samantha/Claude/Projects/cc-hub-live/.claude/g1a_harness.js').read()
import os
ENG = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'caregivers-engine.js'), encoding='utf-8').read()
def cut(a, b): i = ENG.index(a); j = ENG.index(b, i + 1); return ENG[i:j]
# the onboarding row rules live inside the engine's closure: cut them out and run them with stand-ins (no Hub data needed)
CKD = ('const ckdWc=()=>null, ckdJourneyFor=()=>null, bgrEsc=t=>String(t), wcWhen=x=>x;\n' + cut('function ckdJourneyStop(r){', '/* Everyone on the list')
       + cut('const CKD_HOW = {', 'function ckdHowKey') + '\nwindow.__ckd={ stepNext:ckdStepNext, rosterNext:ckdRosterNext, stop:ckdJourneyStop, how:CKD_HOW };')
def router(route):
    if 'supabase.co' in route.request.url: return route.abort()
    return route.continue_()
R = []
def ok(n, c, d=''): R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:700]))
with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []
    pg = b.new_page(viewport={'width': 1300, 'height': 950}); pg.on('pageerror', lambda e: errs.append(str(e)[:200])); pg.route('**/*', router)
    pg.goto(f'http://localhost:{PORT}/index.html?proof=partb'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', H)
    pg.evaluate('c=>{ window.__CKD=c; }', CKD)
    r = pg.evaluate(r"""async()=>{
      const sleep=ms=>new Promise(r=>setTimeout(r,ms)), out={};
      document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; await sleep(600);
      (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal' };");
      window.__cands=[{ id:901, first:'Ava', last:'Lee', offer_id:'o-1', phone:'4175550100', email:'ava@example.com', onboarding_path:'new', step2_sent_at:'2026-10-20T15:00:00Z', step2_done_at:'2026-10-21T15:00:00Z', step2_verified_at:'2026-10-22T13:00:00Z', step2_invite:{ state:'button', at:'2026-10-22T13:00:00Z' },
        r1n:'A', r1s:'Positive', r2n:'B', r2s:'Positive', oig:'CLEAR', edl:'Clear', fcsr:'Clear', fp:'N/A' }];
      localStorage.setItem('cc_candidates', JSON.stringify(window.__cands));
      scxEnsure('cgbackground'); for(let i=0;i<60 && typeof window.ckdStepNext!=='function' && typeof ckdStepNext==='undefined';i++) await sleep(200);
      await sleep(500);
      window.__calls=[]; window.__alerts=[]; window.alert=m=>__alerts.push(String(m)); window.ccConfirm=async()=>true; window.ccPrompt=async()=>'left a voicemail';
      window.loadAllData=async()=>{};
      let axisOk=false, sentOnce=false, CI={ open:true, done:false, ticks:{}, test_clock:null, tries:[] };
      const sheet=()=>({ ok:true, name:'Ava Lee', first:'Ava', last:'Lee', phone:'4175550100', email:'ava@example.com', offer_id:'o-1', address:{ address1:'12 Elm St', address2:'', city:'Ozark', state:'MO', zip:'65721' }, has_dob:true, sent: sentOnce ? { state:'sent', at:'2026-10-22T15:00:00Z', orientation:{} } : null });
      const ans=()=>({ ok:true, journey:{ journey_id:'j-1', client_name:'Ava Lee', status:'open' }, steps:[], events:[], may:{}, view:{ rows:[], complete:false, stage:'ready', stageLabel:'Ready', rail:[] },
        approve:{ approved:true, approved_at:'2026-10-22T14:00:00Z', approved_by:'The Hub (orientation finished, every required step complete)', axiscare:{ state:'confirmed', label:'Active', at:'2026-10-22T14:00:05Z' }, text:{ state:'sent', at:'2026-10-22T14:00:06Z' }, prep:{ hire_date:{ state:'n/a' }, level:{ state:'n/a' } },
          level_of_care:{ level:'Level 1', source:'the default' }, locked:CI.open && !CI.done, lock_why:CI.done?null:'Shift texts wait for the check-in call.', checkin:CI, blocked:[], missing:[], switches:{} } });
      window.__inv=async(fn,o)=>{ const bd=(o&&o.body)||{}; __calls.push({fn,bd});
        if(fn==='step1-sign' && bd.action==='reveal' && bd.field==='dob') return { data:{ ok:true, value:'1990-04-02' }, error:null };
        if(fn==='step2-handoff' && bd.action==='axis_sheet') return { data: bd.check ? { ...sheet(), check: axisOk ? { ok:true, problems:[] } : { ok:false, problems:['AxisCare has no zip code on their address. Add their address with the zip code in AxisCare.', 'AxisCare has no birth date for them. Add their birth date in AxisCare.'] } } : sheet(), error:null };
        if(fn==='step2-handoff' && bd.action==='send_orientation'){ if(!axisOk) return { data:null, error:{ message:'409', context:{ json:async()=>({ error:'Not sent yet. AxisCare has no zip code on their address.', check:{ ok:false, problems:['AxisCare has no zip code on their address.'] } }) } } };
          sentOnce=true; return { data:{ ok:true, invite:{ state:'sent', texted:true, emailed:true, not_sent:[] }, check:{ ok:true, problems:[] } }, error:null }; }
        if(fn==='caregiver-journey' && bd.action==='list') return { data:{ ok:true, rows:[], may_approve_work:false }, error:null };
        if(fn==='caregiver-journey' && bd.action==='get') return { data:ans(), error:null };
        if(fn==='caregiver-journey' && bd.action==='checkin'){
          if(bd.no_answer){ CI={ ...CI, tries:[...CI.tries, { at:'2026-10-22T16:00:00Z' }] }; return { data:ans(), error:null }; }
          if(bd.ticks) CI={ ...CI, ticks:{ ...CI.ticks, ...Object.fromEntries(Object.entries(bd.ticks).map(([k,v])=>[k, v?{ at:'x' }:null])) } };
          if(bd.test_clock) CI={ ...CI, test_clock:{ choice:bd.test_clock } };
          if(bd.finish){ const all=['on_file','questions','app'].every(k=>CI.ticks[k]) && CI.test_clock; if(!all) return { data:{ error:'Tick all three and choose test clock-in done or no thanks first. Your ticks are saved; nothing was finished.' }, error:null }; CI={ ...CI, done:true, open:false, at:'2026-10-22T16:30:00Z' }; }
          return { data:ans(), error:null }; }
        return { data:{ ok:true }, error:null }; };
      (0,eval)("sb.functions.invoke=(fn,o)=>window.__inv(fn,o)");
      /* the engine has its own Supabase client: answer its function calls at the network too */
      const F0=window.fetch; window.fetch=async(u,o={})=>{ const m=/\/functions\/v1\/([a-z0-9-]+)/.exec(String(u)); if(!m) return F0(u,o);
        let bd={}; try{ bd=JSON.parse(o.body||'{}'); }catch(_){}
        const r=await window.__inv(m[1],{ body:bd });
        if(r.error){ const j=r.error.context&&r.error.context.json?await r.error.context.json():{ error:r.error.message }; return new Response(JSON.stringify(j),{ status:409, headers:{ 'Content-Type':'application/json' } }); }
        return new Response(JSON.stringify(r.data),{ status:200, headers:{ 'Content-Type':'application/json' } }); };

      (0,eval)(window.__CKD); const nx=__ckd.stepNext(window.__cands[0], 4); out.next=nx;
      out.roster=__ckd.rosterNext({ offer_id:'o-1', checkin_open:true, approved_to_work:true, axiscare:'confirmed' }); out.rstop=__ckd.stop({ checkin_open:true });
      const HOW=__ckd.how; out.how=(HOW.axsetup||[]).join(' ')+' '+(HOW.checkin||[]).join(' ');
      await axSetupOpen(901); await sleep(300);
      const pop=()=>document.querySelector('#axBody'); out.sheet=pop().innerText;
      out.sendLabel=document.querySelector('#axSend').textContent;
      document.querySelector('#axCheck').click(); await sleep(250); out.checkBad=pop().innerText;
      document.querySelector('#axSend').click(); await sleep(250); out.sendBad=pop().innerText;
      axisOk=true; document.querySelector('#axCheck').click(); await sleep(250); out.checkGood=pop().innerText;
      document.querySelector('#axSend').click(); await sleep(300); out.sent=pop().innerText; out.sendLabel2=document.querySelector('#axSend').textContent;
      out.calls=__calls.map(c=>c.fn+':'+(c.bd.action||'')+(c.bd.field?':'+c.bd.field:'')+(c.bd.reason?':'+c.bd.reason:''));
      out.storage=JSON.stringify(Object.assign({}, localStorage))+JSON.stringify(Object.assign({}, sessionStorage));
      return out; }""")
    if SHOT: pg.screenshot(path=SHOT.replace('.png', '-axsetup.png'))
    ok('onboarding row after Step 2 is checked (button mode): "Add Ava to AxisCare as In Training, then send" with AxisCare setup', 'Add Ava to AxisCare as In Training' in r['next']['text'] and r['next']['label'] == 'AxisCare setup' and 'axSetupOpen(901)' in r['next']['on'], r['next'])
    ok('a roster row with the check-in call open: stop 6, "Make the check-in call", button Check-in call', r['rstop'] == 6 and 'check-in call' in r['roster']['text'] and r['roster']['label'] == 'Check-in call', r['roster'])
    ok('How do I do this? explains AxisCare setup and the check-in call', 'zip code and birth date exactly' in r['how'] and 'test clock-in' in r['how'] and '—' not in r['how'], r['how'])
    ok('the setup card shows what to type: names, phone, email, street, city, state, zip', all(x in r['sheet'] for x in ['Ava', 'Lee', '4175550100', 'ava@example.com', '12 Elm St', 'Ozark', 'MO', '65721']), r['sheet'])
    ok('...and the birth date from Step 1 as MM-DD-YYYY, through the logged reveal (with its reason)', '04-02-1990' in r['sheet'] and any(c.startswith('step1-sign:reveal:dob:Typed into AxisCare') for c in r['calls']), [r['sheet'], r['calls']])
    ok('Check AxisCare with a missing zip and birth date: says both, plainly', 'Not ready to send yet' in r['checkBad'] and 'no zip code' in r['checkBad'] and 'no birth date' in r['checkBad'], r['checkBad'])
    ok('Send while it does not match: the refusal shows on the card, nothing claimed sent', 'Not sent yet' in r['sendBad'] and 'Sent by' not in r['sendBad'], r['sendBad'])
    ok('Check AxisCare when it matches: green "they match"', 'zip code and birth date match' in r['checkGood'], r['checkGood'])
    ok('Send when it matches: "Sent by text and email", one message, the button becomes Send again', 'Sent by text and email' in r['sent'] and r['sendLabel'] == 'Send orientation information' and r['sendLabel2'] == 'Send again', [r['sent'], r['sendLabel'], r['sendLabel2']])
    ok('the birth date is never put in browser storage', '1990' not in r['storage'] and '04-02-1990' not in r['storage'], r['storage'][:300])
    c = pg.evaluate(r"""async()=>{ const sleep=ms=>new Promise(r=>setTimeout(r,ms)), out={};
      document.querySelectorAll('.ccpop-wrap').forEach(x=>x.remove());
      await CRX.open('o-1','Ava Lee'); await sleep(250); const t=()=>document.getElementById('crBody').innerText;
      out.open=t();
      const boxes=[...document.querySelectorAll('#crBody input[type=checkbox]')]; out.boxes=boxes.length;
      [...document.querySelectorAll('#crBody button')].find(b=>/^✓ Done$/.test(b.textContent.trim())).click(); await sleep(250); out.refused=__alerts.slice(-1)[0]||'';
      [...document.querySelectorAll('#crBody button')].find(b=>/No answer/.test(b.textContent)).click(); await sleep(250); out.tried=t();
      for(const i of [0,1,2]){ const bx=[...document.querySelectorAll('#crBody input[type=checkbox]')][i]; bx.checked=true; bx.dispatchEvent(new Event('change')); await sleep(150); }
      const rd=[...document.querySelectorAll('#crBody input[type=radio]')][1]; rd.checked=true; rd.dispatchEvent(new Event('change')); await sleep(150);
      [...document.querySelectorAll('#crBody button')].find(b=>/^✓ Done$/.test(b.textContent.trim())).click(); await sleep(250); out.done=t();
      return out; }""")
    if SHOT: pg.screenshot(path=SHOT.replace('.png', '-checkin.png'))
    ok('readiness card: a Check-in call block with three ticks, test clock-in choice, Done and No answer; shift texts wait', 'Check-in call' in c['open'] and c['boxes'] == 3 and 'Quick test clock-in' in c['open'] and 'Shift texts wait until this call is done' in c['open'], c['open'][-700:])
    ok('Done with ticks missing: the server refusal is shown', 'Tick all three' in c['refused'], c['refused'])
    ok('No answer: counted on the card', 'No answer 1 time' in c['tried'], c['tried'][-400:])
    ok('all ticked + no thanks + Done: "Done" with test clock-in: no thanks', '✓ Done' in c['done'] and 'test clock-in: no thanks' in c['done'], c['done'][-400:])
    pg.close(); b.close()
R.append(('PASS' if not errs else 'FAIL', 'no page errors', errs[:3]))
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(x[0] == 'PASS' for x in R), '/', len(R))
sys.exit(0 if all(x[0] == 'PASS' for x in R) else 1)

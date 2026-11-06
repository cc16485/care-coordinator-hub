"""Send reminder on every Recruit & Onboard row, with the reminder history line (Samantha 2026-11-02, part 2 of her applicant
plan). The real Hub page, offline (files served from this folder), made-up people only; every send is answered here and
recorded, nothing reaches anyone. (python3 tests/browser/hire_remind_look.py; SHOTS=<dir> also saves screenshots)"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = os.environ.get('SHOTS')
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const D=864e5, ago=ms=>new Date(Date.now()-ms).toISOString(), soon=ms=>new Date(Date.now()+ms).toISOString();
  const ROWS=[{ training_id:'t1', name:'Fake Never Opened', status:'not_started', status_label:'In Training', assigned_at:ago(9*D), welcome_sent_at:ago(9*D), units:[],
    messages:[{ kind:'invite', how:'office', by:'krystal@mo-care.com', channels:['text','email'], at:ago(9*D) }] }];
  const OFFS=[{ id:'off-1', name:'Fake Offer Sent', interview_date:ago(4*D).slice(0,10), onboarding_path:'new' },
              { id:'off-2', name:'Fake Step One', interview_date:ago(5*D).slice(0,10), onboarding_path:'new', offer_signed_at:ago(3*D), pd_signed_at:ago(3*D) }];
  const EV=[{ offer_id:'off-1', kind:'sent', at:ago(4*D), by:'krystal@mo-care.com' }, { offer_id:'off-1', kind:'reminder', at:ago(2*D), by:'scheduled run' },
            { offer_id:'off-2', kind:'step1_sent', at:ago(3*D), by:'krystal@mo-care.com' }, { offer_id:'off-2', kind:'step1_reminder', at:ago(1*D), by:'scheduled run', practice:true }];
  const CALLS=[];
  window.fetch=async(u,o)=>{ u=String(u); const body=o&&o.body?String(o.body):''; const h=(o&&o.headers)||{};
    if(u.includes('hub-training-data')){ CALLS.push(['read',u.split('action=')[1]]); return new Response(JSON.stringify(u.includes('job_offers')?OFFS:u.includes('offer_reminders')?EV:u.includes('orientation_finished')?[]:ROWS),{status:200}); }
    if(u.includes('/job-offer')){ CALLS.push(['job-offer',body,!!h['x-hub-token']]); return new Response(JSON.stringify({ ok:true, offer_sent:{ sms:true, email:true }, step1:{ sms:true, email:true } }),{status:200}); }
    if(u.includes('/send-reminder')){ CALLS.push(['send-reminder',body,h['x-hub-token']||'']); return new Response(JSON.stringify({ status:'sent', channels:['text','email'] }),{status:200}); }
    return new Response('{}',{status:200}); };
  (0,eval)("trainHubTok=async()=>'hub-tok'");
  window.__INV=[]; window.__inv=async(n,o)=>{ window.__INV.push([n,o&&o.body]); return { data:{ ok:true, rows:[], kept:true }, error:null }; };
  (0,eval)("sb=new Proxy(sb||{},{ get:(t,k)=>k==='functions'?{ invoke:(n,o)=>window.__inv(n,o) }:k==='from'?(tb)=>{ const q={ select:()=>q, gte:()=>q, order:()=>q, limit:async()=>({ data: tb==='applicant_texts'?window.__texts:tb==='last_chance_asks'?window.__lc:[], error:null }), in:()=>q, eq:()=>q }; return q; }:(typeof t[k]==='function'?t[k].bind(t):t[k]) });");
  window.__lc=[{ id:'lc1', stage:'apply_finish', applicant_id:'a1', asked_at:ago(1*D), practice:false, closed:false, answer:null },
    { id:'lc2', stage:'apply_book', applicant_id:'a2', asked_at:ago(1*D), practice:true, closed:true, outcome:'practice' },
    { id:'lc3', stage:'offer', offer_id:'off-1', asked_at:ago(2*D), practice:false, closed:true, answer:'yes', answered_at:ago(1*D), outcome:'relinked' },
    { id:'lc4', stage:'orientation', training_id:'t1', asked_at:ago(1*D), practice:false, closed:false, answer:null }];
  window.__texts=[{ applicant_id:'a1', kind:'text', status:'sent', created_at:ago(1*D), sent_at:ago(1*D), created_by:'krystal@mo-care.com' }];
  (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha Troutman' };"); CC_ROLES=['owner_admin']; CC_ROLES_CHECKED=true; CC_ROLE_BY_EMAIL['samantha@mo-care.com']=['owner_admin'];
  DATA.ops_settings=DATA.ops_settings||{}; DATA.coordinator_staff=[{ name:'Krystal Land', email:'krystal@mo-care.com' }];
  const CONF=[]; (0,eval)("ccConfirm=async m=>{ window.__cf.push(String(m)); return true; }; ccToast=m=>window.__toast.push(String(m));"); window.__cf=CONF; window.__toast=[];
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; await sleep(300);
  (0,eval)(`AP_ROWS=[
    { id:'a1', first_name:'Fake', last_name:'Partial', status:'partial', phone:'4175550101', created_at:'${ago(3*D)}', finish_nudge_1_at:'${ago(3*D)}', finish_nudge_2_at:'${ago(2*D)}', position:'caregiver' },
    { id:'a2', first_name:'Fake', last_name:'Unbooked', status:'new', phone:'4175550102', created_at:'${ago(8*D)}', nudge_1_at:'${ago(8*D)}', nudge_2_at:'${ago(7*D)}', gave_up_at:'${ago(1*D)}', position:'caregiver' },
    { id:'a3', first_name:'Fake', last_name:'Booked', status:'reviewing', phone:'4175550103', created_at:'${ago(3*D)}', position:'caregiver' } ];
    AP_BOOK={ a3:{ applicant_id:'a3', status:'booked', starts_at:'${soon(2*D)}' } };
    IVQ=[{ id:'b1', applicant_id:'a3', status:'booked', starts_at:'${soon(2*D)}', created_at:'${ago(2*D)}', confirmed_at:'${ago(2*D)}', reminded_2day_at:'${ago(3600e3)}' }];
    IVQ_APP={ a3:{ id:'a3', first_name:'Fake', last_name:'Booked', phone:'4175550103' } };`);
  window.apLoad=async()=>{}; (0,eval)('apLoad=window.apLoad; ivqLoad=async()=>{}; apFilter="all";');
  const OPENED=[]; window.ApText=Object.assign(window.ApText||{}, { open:(id,o)=>OPENED.push([id,o&&o.pick]) });

  switchTab('applicants'); await sleep(200); apRender(); await sleep(300); apRender(); await sleep(100);
  const apRow=n=>[...document.querySelectorAll('#apList details')].find(d=>d.querySelector('summary').innerText.includes(n));
  const p=apRow('Fake Partial'), u=apRow('Fake Unbooked'), bk=apRow('Fake Booked');
  ok('Applicants: did not finish -> Send reminder on the row itself', p && p.querySelector('summary .hrm-btn'), p && p.querySelector('summary').innerHTML.slice(0,300));
  ok('...its history: the two automatic nudges and Krystal\'s text', p && /Reminders: [A-Z][a-z]{2} \d+ automatic, finish the form · [A-Z][a-z]{2} \d+ automatic, finish the form · [A-Z][a-z]{2} \d+ by Krystal, text/.test(p.querySelector('summary').innerText), p && p.querySelector('summary').innerText);
  if(p){ p.querySelector('.hrm-btn').click(); await sleep(30); }
  ok('...the button opens the Text window on "Finish the application" and does not open the card', OPENED[0] && OPENED[0][0]==='a1' && OPENED[0][1]==='finish' && !p.open, [OPENED, p&&p.open]);
  if(u){ u.querySelector('.hrm-btn').click(); await sleep(30); }
  ok('finished, not booked -> "Pick an interview time"', OPENED[1] && OPENED[1][0]==='a2' && OPENED[1][1]==='book', OPENED);
  ok('...its history says when the automatic reminders stopped', u && /The automatic reminders stopped [A-Z][a-z]{2} \d+/.test(u.querySelector('summary').innerText), u && u.querySelector('summary').innerText);
  ok('booked: no Send reminder on Applicants (it is on Interviews)', bk && !bk.querySelector('.hrm-btn'));
  ok('check-in, waiting: when it went and when they come off, with Keep on list', p && /"Still interested\?" text: sent [A-Z][a-z]{2} \d+\. No answer yet: they come off the list [A-Z][a-z]{2} \d+ if they do not answer\./.test(p.querySelector('summary').innerText) && p.querySelector('.hrm-keep'), p && p.querySelector('summary').innerText);
  ok('check-in, switch off: who it would have asked', u && /"Still interested\?" text: would have gone [A-Z][a-z]{2} \d+ \(the switch is off, nothing was sent\)/.test(u.querySelector('summary').innerText), u && u.querySelector('summary').innerText);
  if(p){ p.querySelector('.hrm-keep').click(); await sleep(200); }
  ok('Keep on list asks first, then closes the check-in on the server (last-chance keep) without opening the card', CONF.some(m=>/Keep them on the list/.test(m)) && window.__INV.some(([n,b])=>n==='last-chance' && b && b.action==='keep' && b.id==='lc1') && !p.open, [CONF, window.__INV]);

  switchTab('interviews'); await sleep(200); ivqRender(); await sleep(300); ivqRender(); await sleep(100);
  const iv=[...document.querySelectorAll('#ivqList > div div, #ivqList div')].find(d=>/Fake Booked/.test(d.innerText) && d.querySelector('.hrm-btn'));
  ok('Interviews: Send reminder on the upcoming one', !!iv, document.getElementById('ivqList').innerText.slice(0,300));
  ok('...its history: the booked note and the 2-day reminder', iv && /Reminders: [A-Z][a-z]{2} \d+ automatic, booked note · [A-Z][a-z]{2} \d+ automatic, 2 days before/.test(iv.innerText), iv && iv.innerText);
  if(iv){ iv.querySelector('.hrm-btn').click(); await sleep(30); }
  ok('...the button opens the Text window on "About their interview"', OPENED[2] && OPENED[2][0]==='a3' && OPENED[2][1]==='interview', OPENED);

  switchTab('offers'); await sleep(1300);
  for(let i=0;i<30 && !(window.HSTRIP_ENGINE && HSTRIP_ENGINE.offers().length);i++) await sleep(100);
  try{ (0,eval)("OFF_STAGE='sent'; OFF_STAGE_PICKED=true;"); HSTRIP_ENGINE.renderOffers(); }catch(e){}
  await sleep(300); try{ HSTRIP_ENGINE.renderOffers(); }catch(e){} await sleep(100);
  const card=()=>[...document.querySelectorAll('#offersList details')].find(d=>/Fake Offer Sent/.test(d.innerText));
  ok('Offers (sent): Send reminder on the card line', card() && card().querySelector('summary .hrm-btn'), document.getElementById('offersList').innerText.slice(0,300));
  ok('...its history: sent by Krystal, the automatic reminder', card() && /Reminders: [A-Z][a-z]{2} \d+ by Krystal, offer sent · [A-Z][a-z]{2} \d+ automatic, reminder/.test(card().querySelector('summary').innerText), card() && card().querySelector('summary').innerText);
  ok('Offers: the check-in answer shows (said YES, link sent again)', card() && /"Still interested\?" text: said YES [A-Z][a-z]{2} \d+, link sent again/.test(card().querySelector('summary').innerText), card() && card().querySelector('summary').innerText);
  if(card()){ card().querySelector('.hrm-btn').click(); await sleep(200); }
  ok('...asks first, then resends the offer with your Hub sign-in', CONF.some(m=>/Fake Offer Sent again/.test(m)) && CALLS.some(c=>c[0]==='job-offer' && /resend_offer/.test(c[1]) && /off-1/.test(c[1]) && c[2]), [CONF, CALLS.filter(c=>c[0]==='job-offer')]);
  ok('...and says what went', window.__toast.some(m=>/Sent to Fake Offer Sent by text and email/.test(m)), window.__toast);
  (0,eval)("OFF_STAGE='accepted';"); HSTRIP_ENGINE.renderOffers(); await sleep(100);
  const c2=[...document.querySelectorAll('#offersList details')].find(d=>/Fake Step One/.test(d.innerText));
  ok('Offers (Step 1): history shows a practice reminder as recorded only', c2 && /step1|Step 1 sent/i.test(c2.querySelector('summary').innerText) && /recorded only, the switch is off/.test(c2.querySelector('summary').innerText), c2 && c2.querySelector('summary').innerText);
  if(c2){ c2.querySelector('.hrm-btn').click(); await sleep(200); }
  ok('...Send reminder resends Step 1', CALLS.some(c=>c[0]==='job-offer' && /resend_step1/.test(c[1]) && /off-2/.test(c[1])), CALLS.filter(c=>c[0]==='job-offer'));

  switchTab('orientprog'); await OPR.load(); await sleep(200);
  const orow=[...document.querySelectorAll('#tab-orientprog .orp-row')].find(r=>/Fake Never Opened/.test(r.innerText));
  ok('Orientation: the waiting check-in shows on the row', orow && /"Still interested\?" text: sent .* they come off the list/.test(orow.innerText), orow && orow.innerText);
  ok('Orientation: Send reminder on the row, with the Sent line already there', orow && orow.querySelector('.hrm-btn') && /Sent: Invite/.test(orow.innerText), orow && orow.innerText);
  if(orow){ orow.querySelector('.hrm-btn').click(); await sleep(200); }
  ok('...asks first, then sends through the Training Platform with your Hub sign-in', CONF.some(m=>/orientation reminder/.test(m)) && CALLS.some(c=>c[0]==='send-reminder' && /"caregiver_id":"t1"/.test(c[1]) && c[2]==='hub-tok'), CALLS.filter(c=>c[0]==='send-reminder'));
  ok('...and says what went', window.__toast.some(m=>/Reminder sent to Fake Never Opened by text and email/.test(m)), window.__toast);
  return R;
}
"""
MIME = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.json':'application/json', '.webmanifest':'application/json', '.webp':'image/webp'}
def serve(route):
    url = route.request.url
    if 'supabase.co' in url: return route.abort()
    if not url.startswith('http://hrem.local/'): return route.continue_()
    p = (ROOT / url.split('http://hrem.local/', 1)[1].split('?')[0].split('#')[0])
    if not p.is_file(): return route.fulfill(status=404, body='')
    route.fulfill(status=200, body=p.read_bytes(), content_type=MIME.get(p.suffix, 'application/octet-stream'))
with sync_playwright() as pw:
    b = pw.chromium.launch(); cx = b.new_context(viewport={'width': 1280, 'height': 900}, timezone_id='America/Chicago'); pg = cx.new_page()
    pg.route('**/*', serve)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    if SHOTS: os.makedirs(SHOTS, exist_ok=True)
    pg.goto('http://hrem.local/index.html?proof=hrem'); pg.wait_for_timeout(1500)
    R = pg.evaluate(T)
    if SHOTS:
        pg.evaluate("()=>{ switchTab('applicants'); apRender(); }"); pg.wait_for_timeout(400)
        pg.locator('#tab-applicants').screenshot(path=os.path.join(SHOTS, 'remind_applicants.png'))
        pg.evaluate("()=>{ switchTab('offers'); OFF_STAGE='sent'; HSTRIP_ENGINE.renderOffers(); }"); pg.wait_for_timeout(400)
        pg.locator('#tab-offers').screenshot(path=os.path.join(SHOTS, 'remind_offers.png'))
    # the Onboarding row, cut out of the engine: a Step 2 that is out and not done gets Send reminder (the Step 2 message again)
    ENG = (ROOT / 'caregivers-engine.js').read_text()
    i = ENG.index('function ckdRowHTML(p){'); j = ENG.index('\n}\n', i) + 3
    row = pg.evaluate('''(code)=>{ const S2=[];
      window.step2Sent=(id,again)=>S2.push([id,again]);
      const f = new Function(`const bgrEsc=t=>String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;');
        const ckdActsFor=()=>[], ckdWait=()=>({text:'2 days waiting',color:'#000'}), ckdRosterFor=()=>null, ckdRoadHTML=()=>'', ckdOrientHTML=()=>'',
          ckdSteps=()=>[], ckdPill=()=>'', ckdLaneHTML=()=>'', CKD_STOPS=['Step 1','Checks and references','Send orientation'];
        ${code}; return ckdRowHTML;`)();
      const box = document.createElement('div'); document.body.appendChild(box);
      const ago = d => new Date(Date.now() - d * 864e5).toISOString();
      box.innerHTML = f({ name:'Fake Step Two', stop:2, c:{ id:88, step2_sent_at:ago(5), step2_sent_by:'krystal@mo-care.com', step2_reminders:{ d3:{ at:ago(2) } } } })
        + f({ name:'Fake Not Sent', stop:1, c:{ id:89 } });
      const rows = box.querySelectorAll('.ckd-row'), a = rows[0].innerText, b2 = rows[1].querySelector('.hrm-btn');
      rows[0].querySelector('.hrm-btn').click(); box.remove(); return { a, none: !b2, S2 }; }''', ENG[i:j])
    R.append(['PASS' if row['S2'] == [[88, True]] else 'FAIL', 'Onboarding: Step 2 out and not done -> Send reminder sends the Step 2 message again', row])
    R.append(['PASS' if 'Reminders:' in row['a'] and 'by Krystal, Step 2 sent' in row['a'] and 'automatic, reminder' in row['a'] else 'FAIL', 'Onboarding: its history (sent by Krystal, the automatic reminder)', row['a']])
    R.append(['PASS' if row['none'] else 'FAIL', 'Onboarding: no Send reminder before Step 2 is out (nothing for them to do yet)', row])
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

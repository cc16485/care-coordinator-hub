"""Practice-run fix (Samantha "approve the two fixes", 2026-10-11): a NEW-path offer card no longer offers the retired
"Mark entered in Viventium" (which sends the old welcome message) or "Mark Step 1 done"; its steps tick themselves from the
records and the next step moves them into Background & References. An OLD-path card is unchanged. Caregiver roster rows on
the new path carry the Readiness button. The real page offline, made-up people only; serves this folder on a free port.
python3 tests/browser/practice_fix_look.py"""
import os, socket, subprocess, sys, time
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
s_ = socket.socket(); s_.bind(('127.0.0.1', 0)); PORT = s_.getsockname()[1]; s_.close()
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '-d', ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
ENG = open(os.path.join(ROOT, 'caregivers-engine.js')).read()
def cut(a, b):
    i = ENG.index(a); j = ENG.index(b, i + 1); return ENG[i:j]
STUBS = "".join(f"if (typeof window.{n} !== 'function') window.{n} = () => {v};\n" for n, v in [('vivSheet', "''"), ('obDeriveStatus', "'x'"), ('updateGroupBadges', 'undefined'), ('renderAlerts', 'undefined'),
  ('renderHirePipeline', 'undefined'), ('renderOB', 'undefined'), ('saveCandidates', 'undefined'), ('obToast', 'undefined'), ('gotoTab', 'undefined'), ('confirmOfferLevel', 'undefined'), ('markOfferEntered', 'undefined'),
  ('markOfferStep1', 'undefined'), ('markOfferViventium', 'undefined'), ('obAfterRefRecorded', 'undefined'), ('obRefLinkExtra', "''"), ('obRefType', "''"), ('scoreManualRef', '0'), ('safeIsTmp', 'false'), ('safeTmpId', "''")])
CODE = "let candidates = [{ id: 5, first: 'Pat', last: 'Moved', offer_id: 'of-moved' }, { id: 6, first: 'Mia', last: 'Midway', offer_id: 'of-mid' }, { id: 7, first: 'Olive', last: 'Oldpath', offer_id: 'of-oldmoved' }], caregivers = [];\n" + STUBS + cut('const OFFER_ATTRS', 'let OFFERS=[];') + """
let OFFERS = [
  { id:'of-new', first_name:'Pat', last_name:'Practice', phone:'4175550183', email:'pat@practice.invalid', position:'Caregiver', pay_rate:17, offered_by:'Slice 10 practice run', created_at:'2026-10-11T15:00:00Z',
    onboarding_path:'new', offer_status:'sent', offer_expires_at:'2026-10-20T22:00:00Z' },
  { id:'of-signed', first_name:'Sam', last_name:'Signed', phone:'4175550184', position:'Caregiver', pay_rate:17, offered_by:'Slice 10 practice run', created_at:'2026-10-11T15:00:00Z',
    onboarding_path:'new', offer_status:'accepted', offer_signed_at:'2026-10-11T16:00:00Z', pd_signed_at:'2026-10-11T16:01:00Z', offer_expires_at:'2026-10-20T22:00:00Z' },
  { id:'of-moved', first_name:'Pat', last_name:'Moved', phone:'4175550185', position:'Caregiver', pay_rate:17, offered_by:'Slice 10 practice run', created_at:'2026-10-11T15:00:00Z',
    onboarding_path:'new', offer_status:'accepted', offer_signed_at:'2026-10-11T16:00:00Z', pd_signed_at:'2026-10-11T16:01:00Z', step1_done_at:'2026-10-11T17:00:00Z', attributes_entered_at:'2026-10-11T18:00:00Z', offer_expires_at:'2026-10-20T22:00:00Z' },
  { id:'of-mid', first_name:'Mia', last_name:'Midway', phone:'4175550186', position:'Caregiver', pay_rate:17, offered_by:'Slice 10 practice run', created_at:'2026-10-11T15:00:00Z',
    onboarding_path:'new', offer_status:'accepted', offer_signed_at:'2026-10-11T16:00:00Z', pd_signed_at:'2026-10-11T16:01:00Z', offer_expires_at:'2026-10-20T22:00:00Z' },
  { id:'of-oldmoved', first_name:'Olive', last_name:'Oldpath', phone:'4175550103', position:'Caregiver', pay_rate:17, offered_by:'Krystal', created_at:'2026-10-01T15:00:00Z', onboarding_path:'old' },
  { id:'of-old', first_name:'Holly', last_name:'Sample', phone:'4175550102', position:'Caregiver', pay_rate:17, offered_by:'Krystal', created_at:'2026-10-01T15:00:00Z', onboarding_path:'old', attributes_entered_at:'2026-10-02T15:00:00Z' },
];
""" + cut('function updateOffersBadge(){', 'async function offerToCandidate(') + cut('async function offerToCandidate(', 'const rec = {') + '}' + cut('function bgrStep1Wait(c){', 'async function askReferences(')
T = r"""async(CODE)=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]);
  const sc=document.createElement('script'); sc.textContent=CODE; document.head.appendChild(sc); await new Promise(r=>setTimeout(r,50));
  document.querySelectorAll('.tabpanel').forEach(p=>p.classList.remove('active')); document.getElementById('tab-offers').classList.add('active');
  document.querySelectorAll('.offview').forEach(v=>v.style.display='none'); document.getElementById('offview-open').style.display='block';
  /* OFFER STAGES (2026-10-12): each stage tab is its own list; read the cards of every stage */
  const list=document.getElementById('offersList'); for(let el=list; el; el=el.parentElement){ if(getComputedStyle(el).display==='none') el.style.display='block'; }
  const cards=[]; for(const st of ['sent','rejected','accepted','completed']){ OFF_STAGE=st; OFF_STAGE_PICKED=true; renderOffers();
    [...list.querySelectorAll(':scope > details')].forEach(d=>{ d.open=true; cards.push(d.innerText.replace(/\s+/g,' ')); }); }
  const card=n=>cards.find(t=>t.includes(n))||'';
  const pat=card('4175550183'), sam=card('4175550184'), moved=card('4175550185'), old=card('4175550102');
  ok('new path, unsigned: the next step is their signatures (no button), not Viventium', /Next: Offer and position description signed/.test(pat) && !/Mark entered in Viventium/.test(pat) && !/Mark Step 1 done/.test(pat), pat.slice(0,600));
  ok('new path, both signed: the next step is their Step 1 (sent automatically, with how far they are); NO button to move them into Background & References', /Next: Their Step 1/.test(sam) && /Sent automatically when they signed/.test(sam) && !/Move to Background/.test(sam) && !/Mark entered in Viventium/.test(sam), sam.slice(0,600));
  ok('new path, moved into Background & References: the offer leaves Open offers (history, not work), as before', moved==='' && typeof offerMovedOn==='function' && offerMovedOn(OFFERS[2]), moved.slice(0,300));
  const mid=card('4175550186');
  ok('new path, somehow in Background & References before Step 1: the card stays on Open offers with its Step 1 link, next step their Step 1', /Next: Their Step 1/.test(mid) && /Step 1 link/.test(mid), mid.slice(0,700));
  ok('old path in Background & References: moved on, as before', card('4175550103')==='');
  ok('old path unchanged: Viventium entry and its welcome message are still its next step', /Next: Viventium entry/.test(old) && /Mark entered in Viventium/.test(old), old.slice(0,500));
  /* moving them by hand on the new path is refused until Step 1 is complete (their signed permission) */
  const al=[]; window.alert=m=>al.push(String(m));
  const r1=await offerToCandidate('of-signed', null, { quiet:true });
  ok('"move to Background & References" by hand on the new path: refused, with why (their signed permission is in Step 1)', r1 && r1.ok===false && /signed permission/.test(r1.why), r1);
  ok('the second guard: checks and references refuse a new-path person without Step 1, and allow one with it, and the old path', bgrStep1Wait({ first:'Mia', last:'Midway', onboarding_path:'new', offer_id:'of-mid' })===true && /has not finished Step 1/.test(al.join(' '))
     && bgrStep1Wait({ onboarding_path:'new', offer_id:'of-moved', step1_landed:{ done:'2026-10-11' } })===false && bgrStep1Wait({ onboarding_path:'old' })===false, al);
  ok('the new wording has no em dash', !/—/.test([pat,sam,moved].join(' ').replace(/suggested —/g,'').replace(/^— | — (?=Caregiver)/g,' '))   /* the no-date placeholder (these test offers have no interview date) */);
  return R; }"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []
    pg = b.new_page(viewport={'width': 1280, 'height': 1000}); pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    pg.goto(f'http://127.0.0.1:{PORT}/index.html?proof=practicefix'); pg.wait_for_timeout(1500)
    R = pg.evaluate(T, CODE)
    pg.goto(f'http://127.0.0.1:{PORT}/index.html?proof=practicefix2'); pg.wait_for_timeout(1500)
    sw = pg.evaluate("""()=>{ const out={}; try{ switchTab('onboarding'); out.a=(document.querySelector('.tabpanel.active')||{}).id; }catch(e){ out.a='threw '+e.message; }
      try{ switchTab('orientations'); out.b=(document.querySelector('.tabpanel.active')||{}).id; }catch(e){ out.b='threw '+e.message; }
      try{ switchTab('no-such-tab'); out.c='no error'; }catch(e){ out.c='threw '+e.message; } return out; }""")
    hp = pg.evaluate("""async()=>{
      const calls=[]; window.__opened=[]; window.open=(u)=>window.__opened.push(u);
      const invoke=async(fn,{body})=>{ calls.push([fn,body]);
        if(body.action==='get') return { data:{ ok:true, name:'Pat Practice', phone:'4175550183', email:'pat.practice@practice.invalid', where:'Step 1 complete', path:'new', position:'Caregiver',
          ids:{ offer_id:'of-1', candidate_id:null, caregiver_id:null, applicant_id:null, journey_id:'j1' },
          timeline:[{ at:'2026-10-11T15:00:00Z', type:'sent', what:'Offer sent (practice: recorded, not sent)', by:'office' }, { at:'2026-10-11T15:10:00Z', type:'done', what:'Offer letter signed', by:'Pat Practice' },
                    { at:'2026-10-11T16:00:00Z', type:'refused', what:'Not sent (sms, welcome-call): a practice address' }],
          documents:[{ ref:'od:offers/of-1/offer.pdf', label:'Offer letter (signed)', at:'2026-10-11T15:10:00Z', kind:'signed' }] } };
        if(body.action==='doc') return { data:{ ok:true, url:'https://signed/offer.pdf' } };
        if(body.action==='step1_progress') return { data:{ ok:true, progress:{ 'of-1':{ sent_at:'2026-10-11T15:11:00Z', practice:true, started_at:'2026-10-11T15:12:00Z', signed:2, forms:7, completed_at:null } } } };
        return { data:{ error:'?' } }; };
      Object.defineProperty(sb, 'functions', { configurable:true, get:()=>({ invoke }) });
      await HP.open({ offer_id:'of-1' }); await new Promise(r=>setTimeout(r,50));
      const t=document.getElementById('hpBody').innerText;
      const btn=[...document.querySelectorAll('#hpBody button')].find(b=>/^Open$/.test(b.textContent.trim())); if(btn) btn.click(); await new Promise(r=>setTimeout(r,50));
      HP.filter('refused'); const tr=document.getElementById('hpBody').innerText;
      const sp=document.createElement('span'); sp.className='hp1'; sp.dataset.offer='of-1'; document.body.appendChild(sp); await HP.fillOfferProgress();
      return { t, tr, opened:window.__opened, prog:sp.textContent, calls:calls.map(c=>c[1].action) }; }""")
    R.append(['PASS' if 'Pat Practice' in hp['t'] and 'Where they are: Step 1 complete' in hp['t'] and 'Offer letter (signed)' in hp['t'] and 'Offer sent (practice: recorded, not sent)' in hp['t'] and 'Not sent' in hp['t'] else 'FAIL', 'the profile opens from anywhere: who, where they are, every signed document, every send, receipt and completion with its time', hp['t'][:600]])
    R.append(['PASS' if hp['opened'] == ['https://signed/offer.pdf'] and 'doc' in hp['calls'] else 'FAIL', 'a signed document opens from the profile (through the server, which logs the open)', hp])
    R.append(['PASS' if 'Offer letter signed' not in hp['tr'] and 'Not sent (sms, welcome-call)' in hp['tr'] else 'FAIL', 'the timeline filters (Not sent only)', hp['tr'][-400:]])
    R.append(['PASS' if 'practice: recorded, not sent' in hp['prog'] and '2 of 7 forms signed' in hp['prog'] else 'FAIL', 'the offer card shows how far Step 1 is: sent automatically (practice), opened, 2 of 7 forms signed', hp['prog']])
    R.append(['PASS' if sw.get('a') == 'tab-cgbackground' and sw.get('b') == 'tab-cgorient' and sw.get('c') == 'no error' else 'FAIL', 'the old tab names (onboarding, orientations) open Background & References and Orientations; an unknown name no longer throws', sw])
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
srv.terminate()
src = ENG
R.append(['PASS' if src.count("${(sdEligible(c)&&window.CRX)?CRX.chip(c.offer_id):''}") == 2 else 'FAIL', 'caregiver roster rows (Training and Compliance tables) carry the Readiness button for new-path people', ''])
R.append(['PASS' if ("{ k:'casenet', label:'Case.net', opts:['Pending','Clear','Issues Found'] }" in src and 'href="https://www.courts.mo.gov/casenet/nameSearch.do?newSearch=Y"' in src and "bgrRecordCheck('+b.id+',\\'casenet\\')" in src
    and "chips.push(mk('Case.net', board.casenet, ['Clear'], !!board.casenet_date));" in src and "const WC_CARRY = ['casenet', 'casenet_date', 'casenet_proof'," in src) else 'FAIL',
  'Case.net: a background check like EDL and FCSR (Search Case.net opens the court site; Record Case.net takes the result, date and proof; the summary chip; carried to the roster at the Orientation Video Call)', ''])
for r in R: print(r[0], '·', r[1], ('→ ' + str(r[2])) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}"); raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

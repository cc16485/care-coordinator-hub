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
  ('markOfferStep1', 'undefined'), ('markOfferViventium', 'undefined'), ('obAfterRefRecorded', 'undefined'), ('obRefLinkExtra', "''"), ('obRefType', "''"), ('scoreManualRef', '0'), ('safeIsTmp', 'false'), ('safeTmpId', "''"), ('offerToCandidate', '({})')])
CODE = "let candidates = [{ id: 5, first: 'Pat', last: 'Moved', offer_id: 'of-moved' }], caregivers = [];\n" + STUBS + cut('const OFFER_ATTRS', 'let OFFERS=[];') + """
let OFFERS = [
  { id:'of-new', first_name:'Pat', last_name:'Practice', phone:'4175550183', email:'pat@practice.invalid', position:'Caregiver', pay_rate:17, offered_by:'Slice 10 practice run', created_at:'2026-10-11T15:00:00Z',
    onboarding_path:'new', offer_status:'sent', offer_expires_at:'2026-10-20T22:00:00Z' },
  { id:'of-signed', first_name:'Sam', last_name:'Signed', phone:'4175550184', position:'Caregiver', pay_rate:17, offered_by:'Slice 10 practice run', created_at:'2026-10-11T15:00:00Z',
    onboarding_path:'new', offer_status:'accepted', offer_signed_at:'2026-10-11T16:00:00Z', pd_signed_at:'2026-10-11T16:01:00Z', offer_expires_at:'2026-10-20T22:00:00Z' },
  { id:'of-moved', first_name:'Pat', last_name:'Moved', phone:'4175550185', position:'Caregiver', pay_rate:17, offered_by:'Slice 10 practice run', created_at:'2026-10-11T15:00:00Z',
    onboarding_path:'new', offer_status:'accepted', offer_signed_at:'2026-10-11T16:00:00Z', pd_signed_at:'2026-10-11T16:01:00Z', step1_done_at:'2026-10-11T17:00:00Z', attributes_entered_at:'2026-10-11T18:00:00Z', offer_expires_at:'2026-10-20T22:00:00Z' },
  { id:'of-old', first_name:'Holly', last_name:'Sample', phone:'4175550102', position:'Caregiver', pay_rate:17, offered_by:'Krystal', created_at:'2026-10-01T15:00:00Z', onboarding_path:'old', attributes_entered_at:'2026-10-02T15:00:00Z' },
];
""" + cut('function updateOffersBadge(){', 'async function offerToCandidate(')
T = r"""async(CODE)=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]);
  const sc=document.createElement('script'); sc.textContent=CODE; document.head.appendChild(sc); await new Promise(r=>setTimeout(r,50));
  document.querySelectorAll('.tabpanel').forEach(p=>p.classList.remove('active')); document.getElementById('tab-offers').classList.add('active');
  document.querySelectorAll('.offview').forEach(v=>v.style.display='none'); document.getElementById('offview-open').style.display='block';
  renderOffers(); document.querySelectorAll('#offersList details').forEach(d=>d.open=true);
  const list=document.getElementById('offersList'); for(let el=list; el; el=el.parentElement){ if(getComputedStyle(el).display==='none') el.style.display='block'; }
  const cards=list.innerText.split(/\n—\n|^—\n/).map(t=>t.replace(/\s+/g,' ')).filter(Boolean);
  const card=n=>cards.find(t=>t.includes(n))||'';
  const pat=card('4175550183'), sam=card('4175550184'), moved=card('4175550185'), old=card('4175550102');
  ok('new path, unsigned: the next step is their signatures (no button), not Viventium', /Next: Offer and position description signed/.test(pat) && !/Mark entered in Viventium/.test(pat) && !/Mark Step 1 done/.test(pat), pat.slice(0,600));
  ok('new path, both signed: the next step is "Move to Background & References"', /Next: Background & references/.test(sam) && /Move to Background & References/.test(sam) && !/Mark entered in Viventium/.test(sam), sam.slice(0,600));
  ok('new path, moved into Background & References: the offer leaves Open offers (history, not work), as before', moved==='' && typeof offerMovedOn==='function' && offerMovedOn(OFFERS[2]), moved.slice(0,300));
  ok('old path unchanged: Viventium entry and its welcome message are still its next step', /Next: Viventium entry/.test(old) && /Mark entered in Viventium/.test(old), old.slice(0,500));
  ok('the new wording has no em dash', !/—/.test([pat,sam,moved].join(' ').replace(/suggested —/g,'')));
  return R; }"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []
    pg = b.new_page(viewport={'width': 1280, 'height': 1000}); pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    pg.goto(f'http://127.0.0.1:{PORT}/index.html?proof=practicefix'); pg.wait_for_timeout(1500)
    R = pg.evaluate(T, CODE)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
srv.terminate()
src = ENG
R.append(['PASS' if src.count("${(sdEligible(c)&&window.CRX)?CRX.chip(c.offer_id):''}") == 2 else 'FAIL', 'caregiver roster rows (Training and Compliance tables) carry the Readiness button for new-path people', ''])
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}"); raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

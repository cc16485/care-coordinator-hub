"""OFFER STAGES (Samantha 2026-10-12): the Offers tab has four stage tabs (Offer sent, Offer rejected, Accepted · Step 1
sent, Completed Step 1) and a person moves between them by themselves from the offer record. Old-path offers sit in
Accepted until someone presses Mark Step 1 done. Completed Step 1 holds the searchable moved-on list (was Previous offers).
No Open Viventium on the Offers page. The real page offline, made-up people only; serves this folder on a free port.
python3 tests/browser/offer_stages_look.py"""
import os, socket, subprocess, sys, time
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.environ.get('OUT', '/tmp')
s_ = socket.socket(); s_.bind(('127.0.0.1', 0)); PORT = s_.getsockname()[1]; s_.close()
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '-d', ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
ENG = open(os.path.join(ROOT, 'caregivers-engine.js')).read()
def cut(a, b):
    i = ENG.index(a); j = ENG.index(b, i + 1); return ENG[i:j]
STUBS = "".join(f"if (typeof window.{n} !== 'function') window.{n} = () => {v};\n" for n, v in [('vivSheet', "''"), ('obDeriveStatus', "'Checks running'"), ('updateGroupBadges', 'undefined'),
  ('gotoTab', 'undefined'), ('confirmOfferLevel', 'undefined'), ('markOfferEntered', 'undefined'), ('markOfferStep1', 'undefined'), ('markOfferViventium', 'undefined')])
D = lambda n: f"new Date(Date.now()-{n}*864e5).toISOString().slice(0,10)"
CODE = "let candidates = [{ id: 5, first: 'Nora', last: 'Moved', offer_id: 'of-moved' }, { id: 6, first: 'Ned', last: 'Nothired', offer_id: 'of-nothired', not_hired: true }], caregivers = [];\n" + STUBS + cut('const OFFER_ATTRS', 'let OFFERS=[];') + f"""
let OFFERS = [
  {{ id:'of-sent', name:'Sara Sent', phone:'4175550201', position:'Caregiver', offered_by:'Krystal Land', interview_date:{D(2)}, onboarding_path:'new', offer_status:'sent', offer_expires_at:new Date(Date.now()+5*864e5).toISOString() }},
  {{ id:'of-exp', name:'Eli Expired', phone:'4175550202', position:'Caregiver', offered_by:'Krystal Land', interview_date:{D(12)}, onboarding_path:'new', offer_status:'sent', offer_expires_at:new Date(Date.now()-864e5).toISOString() }},
  {{ id:'of-dec', name:'Dana Declined', phone:'4175550203', position:'CNA', offered_by:'Krystal Land', interview_date:{D(9)}, onboarding_path:'new', offer_status:'declined', offer_declined_at:new Date().toISOString() }},
  {{ id:'of-wd', name:'Wes Withdrawn', phone:'4175550204', position:'Caregiver', offered_by:'Samantha Troutman', interview_date:{D(8)}, onboarding_path:'new', offer_status:'withdrawn', offer_withdrawn_at:new Date().toISOString() }},
  {{ id:'of-signed', name:'Gia Signed', phone:'4175550205', position:'Caregiver', offered_by:'Krystal Land', interview_date:{D(3)}, onboarding_path:'new', offer_status:'accepted', offer_signed_at:new Date().toISOString(), pd_signed_at:new Date().toISOString() }},
  {{ id:'of-old', name:'Bea Oldpath', phone:'4175550206', position:'Caregiver', offered_by:'Krystal Land', interview_date:{D(59)}, onboarding_path:'old' }},
  {{ id:'of-old2', name:'Ava Oldpath', phone:'4175550207', position:'CNA', offered_by:'Krystal Land', interview_date:{D(27)}, onboarding_path:'old' }},
  {{ id:'of-done', name:'Dot Donestep', phone:'4175550208', position:'Caregiver', offered_by:'Krystal Land', interview_date:{D(15)}, onboarding_path:'old', step1_done_at:new Date().toISOString(), attributes_entered_at:new Date().toISOString(), viventium_entered_at:new Date().toISOString() }},
  {{ id:'of-moved', name:'Nora Moved', phone:'4175550209', position:'Caregiver', offered_by:'Krystal Land', interview_date:{D(20)}, onboarding_path:'old', step1_done_at:new Date().toISOString() }},
  {{ id:'of-nothired', name:'Ned Nothired', phone:'4175550210', position:'Caregiver', offered_by:'Krystal Land', interview_date:{D(30)}, onboarding_path:'old' }},
];
""" + cut('function updateOffersBadge(){', 'async function offerToCandidate(')
T = r"""async(CODE)=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]);
  const sc=document.createElement('script'); sc.textContent=CODE; document.head.appendChild(sc); await new Promise(r=>setTimeout(r,50));
  document.querySelectorAll('.tabpanel').forEach(p=>p.classList.remove('active')); document.getElementById('tab-offers').classList.add('active');
  const head=document.getElementById('tab-offers').innerText;
  ok('no Open Viventium on the Offers page', !/Open Viventium/.test(head), head.slice(0,300));
  const TABS=[...document.querySelectorAll('#tab-offers .offnav-b')].map(b=>{ const c=b.cloneNode(true); c.querySelectorAll('.offnav-n').forEach(x=>x.remove()); return c.textContent.trim(); }).join('|'); ok('four stage tabs, in order', TABS==='Offer sent|Offer rejected|Accepted · Step 1 sent|Completed Step 1', TABS);
  OFF_STAGE_PICKED=false; offView('open');
  const n=k=>document.getElementById('offstageN-'+k).textContent;
  ok('counts on the tabs: 1 sent, 4 rejected (declined, withdrawn, expired, not hired), 3 accepted (signed + 2 old path), 2 completed', n('sent')==='1'&&n('rejected')==='4'&&n('accepted')==='3'&&n('completed')==='2', ['sent','rejected','accepted','completed'].map(n));
  ok('until a click, the first stage with someone in it opens (Offer sent), and its tab is lit', OFF_STAGE==='sent' && document.getElementById('offstage-sent').classList.contains('on'));
  const names=()=>[...document.querySelectorAll('#offersList > details summary b')].map(b=>b.textContent);
  ok('Offer sent: only the unsigned, unexpired new offer', names().join()==='Sara Sent', names());
  offStageView('rejected'); const rj=document.getElementById('offersList').innerText;
  ok('Offer rejected: declined, withdrawn, expired, not hired, each with its tag', ['Dana Declined','Wes Withdrawn','Eli Expired','Ned Nothired'].every(x=>names().includes(x)) && /Declined/.test(rj)&&/Withdrawn/.test(rj)&&/Expired/.test(rj)&&/Not hired/.test(rj), [names(), rj.slice(0,300)]);
  offStageView('accepted');
  ok('Accepted · Step 1 sent: signed new offer + the two old-path offers, oldest first', names().join()==='Bea Oldpath,Ava Oldpath,Gia Signed', names());
  ok('Accepted explains old-path offers wait for Mark Step 1 done', /Mark Step 1 done/.test(document.getElementById('offStageNote').innerText));
  const ages=[...document.querySelectorAll('#offersList > details summary span')].filter(s=>/days ago/.test(s.textContent));
  ok('a month or more waiting is red, a week amber', ages.some(s=>/5[89] days/.test(s.textContent)&&/185, 28, 28/.test(getComputedStyle(s).color)) && ages.some(s=>/2[67] days/.test(s.textContent)&&/180, 83, 9/.test(getComputedStyle(s).color)), ages.map(s=>s.textContent+' '+getComputedStyle(s).color));
  offStageView('completed');
  const past=document.getElementById('pastOffersList').innerText;
  ok('Completed Step 1: a card for the one still on this card (Step 1 done, not moved on), and the moved-on list with search', names().join()==='Dot Donestep' && /Nora Moved/.test(past) && document.getElementById('offPastWrap').style.display!=='none', [names(), past]);
  offStageView('sent');
  ok('the moved-on list hides on other stages', document.getElementById('offPastWrap').style.display==='none');
  /* moving by itself: the record changes, the next render moves them */
  const sara=OFFERS.find(o=>o.id==='of-sent'); sara.offer_signed_at=sara.pd_signed_at=new Date().toISOString(); renderOffers();
  ok('Sara signs both documents: she moves to Accepted by herself (counts too)', offerStage(sara)==='accepted' && n('sent')==='' && n('accepted')==='4');
  sara.step1_done_at=new Date().toISOString(); renderOffers();
  ok('Sara finishes Step 1: she moves to Completed by herself', offerStage(sara)==='completed' && n('completed')==='3');
  offView('past');
  ok('the old Previous offers link still lands on Completed Step 1', OFF_STAGE==='completed' && document.getElementById('offstage-completed').classList.contains('on'));
  const badge=OFFERS.filter(o=>!offerMovedOn(o)&&!offerRejectedWhy(o)).length;
  ok('the Offers badge counts work only (rejected and moved-on left out: Sara, Gia, Bea, Ava, Dot)', badge===5, badge);
  ok('no em dash in the stage notes', ['sent','rejected','accepted','completed'].every(k=>{ OFF_STAGE=k; renderOffers(); return !/—/.test(document.getElementById('offStageNote').innerText); }));
  OFF_STAGE='accepted'; sara.offer_signed_at=sara.pd_signed_at=sara.step1_done_at=null; offStageView('accepted'); window.scrollTo(0,0);
  return R; }"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []
    pg = b.new_page(viewport={'width': 1300, 'height': 900}); pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    pg.goto(f'http://127.0.0.1:{PORT}/index.html?proof=offerstages'); pg.wait_for_timeout(1500)
    R = pg.evaluate(T, CODE)
    pg.evaluate("()=>{ const t=document.getElementById('tab-offers'); for(let el=t; el; el=el.parentElement){ if(getComputedStyle(el).display==='none') el.style.display='block'; } t.scrollIntoView(); }")
    bb = pg.locator('#tab-offers').bounding_box()
    if bb: pg.screenshot(path=os.path.join(OUT, 'offer_stages.png'), clip={'x': bb['x'], 'y': bb['y'], 'width': min(1300, bb['width']), 'height': min(900, bb['height'])})
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', ' '.join(errs)])
    b.close()
srv.terminate()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

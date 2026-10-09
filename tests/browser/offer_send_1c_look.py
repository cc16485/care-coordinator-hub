"""Slice 1c (2026-10-09): the Open offers card for a NEW-path offer (delivery record, Signing link, Resend, Withdraw, no start
link) next to an old-path card, and the duplicate refusal box in the offer form. The real page and styles, offline, FAKE
people only. Saves two screenshots. Nothing reaches production; nothing is sent."""
import os
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..', '..')
PORT = os.environ.get('PORT', '8768'); OUT = os.environ.get('OUT', '/tmp')
ENG = open(os.path.join(ROOT, 'caregivers-engine.js')).read()
def cut(a, b):
    i = ENG.index(a); j = ENG.index(b, i + 1); return ENG[i:j]
CODE = """
let candidates = [], caregivers = [];
/* stand-ins for page-level helpers the card calls (the look only draws; nothing is saved or sent) */
if (typeof window.vivSheet !== 'function') window.vivSheet = () => '';
if (typeof window.obDeriveStatus !== 'function') window.obDeriveStatus = () => 'In background & references';
if (typeof window.updateGroupBadges !== 'function') window.updateGroupBadges = () => undefined;
if (typeof window.renderAlerts !== 'function') window.renderAlerts = () => undefined;
if (typeof window.renderHirePipeline !== 'function') window.renderHirePipeline = () => undefined;
if (typeof window.renderOB !== 'function') window.renderOB = () => undefined;
if (typeof window.saveCandidates !== 'function') window.saveCandidates = () => undefined;
if (typeof window.obToast !== 'function') window.obToast = () => undefined;
if (typeof window.gotoTab !== 'function') window.gotoTab = () => undefined;
if (typeof window.confirmOfferLevel !== 'function') window.confirmOfferLevel = () => undefined;
if (typeof window.markOfferEntered !== 'function') window.markOfferEntered = () => undefined;
if (typeof window.markOfferStep1 !== 'function') window.markOfferStep1 = () => undefined;
if (typeof window.markOfferViventium !== 'function') window.markOfferViventium = () => undefined;
if (typeof window.obAfterRefRecorded !== 'function') window.obAfterRefRecorded = () => undefined;
if (typeof window.obRefLinkExtra !== 'function') window.obRefLinkExtra = () => '';
if (typeof window.obRefType !== 'function') window.obRefType = () => '';
if (typeof window.scoreManualRef !== 'function') window.scoreManualRef = () => 0;
if (typeof window.safeIsTmp !== 'function') window.safeIsTmp = () => false;
if (typeof window.safeTmpId !== 'function') window.safeTmpId = () => '';
if (typeof window.offerToCandidate !== 'function') window.offerToCandidate = () => ({});
""" + cut('const OFFER_ATTRS', 'let OFFERS=[];') + """
let OFFERS = [
  { id:'of-new', first_name:'Test', last_name:'Camera', phone:'5550103', email:null, position:'Caregiver', pay_rate:17, hours_type:'PART_TIME', offered_by:'Slice 1b test', interview_date:'2026-10-09', created_at:'2026-10-09T18:00:00Z',
    onboarding_path:'new', offer_status:'sent', offer_expires_at:'2026-10-21T22:00:00Z', offer_delivery:{ at:'2026-10-09T18:00:00Z', kind:'sent', practice:false, sms:{ held:true, why:'after hours' }, email:{ ok:true } }, notes:'FICTIONAL test applicant; never a real person' },
  { id:'of-old', first_name:'Holly', last_name:'Sample', phone:'4175550102', email:'h@example.test', position:'Caregiver', pay_rate:17, offered_by:'Krystal', interview_date:'2026-10-01', created_at:'2026-10-01T15:00:00Z', onboarding_path:'old' } ];
""" + cut('function updateOffersBadge(){', 'async function offerToCandidate(')
T = r"""
async(CODE)=>{
  const sc=document.createElement('script'); sc.textContent=CODE; document.head.appendChild(sc);
  await new Promise(r=>setTimeout(r,50));
  document.querySelectorAll('.tabpanel').forEach(p=>p.classList.remove('active')); document.getElementById('tab-offers').classList.add('active');
  document.querySelectorAll('.offview').forEach(v=>v.style.display='none'); document.getElementById('offview-open').style.display='block';
  renderOffers();
  document.querySelectorAll('#offersList details').forEach(d=>d.open=true);
  const list=document.getElementById('offersList'); for(let el=list; el; el=el.parentElement){ if(getComputedStyle(el).display==='none') el.style.display='block'; }
  list.scrollIntoView();
  const t=list.innerText.replace(/\s+/g,' '); return { cards: list.children.length, camera: t.indexOf('Test Camera')>=0, signing: t.slice(t.indexOf('Signing link'), t.indexOf('Signing link')+160) };
}
"""
T2 = r"""
()=>{
  document.querySelectorAll('.offview').forEach(v=>v.style.display='none'); document.getElementById('offview-new').style.display='block';
  joShowDuplicate({ duplicate:true, may_reoffer:true, existing:{ id:'of-old', first_name:'Holly', last_name:'Sample', position:'Caregiver', created_at:'2026-10-01T15:00:00Z', status:'open', onboarding_path:'old' } });
  const box=document.getElementById('jo_dup'); for(let el=box; el; el=el.parentElement){ if(getComputedStyle(el).display==='none') el.style.display='block'; }
  box.scrollIntoView(); return box.innerText.replace(/\s+/g,' ');
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1500, 'height': 1000})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(f'http://localhost:{PORT}/index.html?proof=offers1c'); pg.wait_for_timeout(1500)
    R = pg.evaluate(T, CODE); print(R)
    bb = pg.locator('#offersList').bounding_box()
    if not bb: pg.screenshot(path=os.path.join(OUT, 'offer_send_1c_full.png'), full_page=True); print('offersList has no box; full page saved'); bb = {'x': 0, 'y': 0, 'width': 1500, 'height': 1000}
    pg.screenshot(path=os.path.join(OUT, 'offer_send_1c_card.png'), clip={'x': max(0, bb['x'] - 8), 'y': max(0, bb['y'] - 8), 'width': min(1500, bb['width'] + 16), 'height': min(1000, bb['height'] + 16)})
    D = pg.evaluate(T2)
    bb = pg.locator('#jo_dup').bounding_box()
    pg.screenshot(path=os.path.join(OUT, 'offer_send_1c_dup.png'), clip={'x': max(0, bb['x'] - 8), 'y': max(0, bb['y'] - 8), 'width': min(1500, bb['width'] + 16), 'height': bb['height'] + 16})
    b.close()
print(R); print(D); print('page errors:', errs[:3])

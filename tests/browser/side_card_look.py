"""Onboarding names slide the readiness card in from the right, like the Step 1 side panel (Samantha 2026-11-02).
Every other opener keeps the centered card. python3 tests/browser/side_card_look.py <out dir>
Needs a static server on 8768 (python3 -m http.server 8768) so the page has a real origin."""
from playwright.sync_api import sync_playwright
import os, sys, re
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp'
CODE = open(os.path.join(HERE, '..', '..', 'caregiver-readiness.js')).read()
ENGINE = open(os.path.join(HERE, '..', '..', 'caregivers-engine.js')).read()
T = r"""
async(CODE)=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  window.__drawerClosed=0; window.bgrCloseDrawer=()=>{ __drawerClosed++; };
  const answer={ ok:true, approve:null, journey:{ journey_id:'j-1', client_name:'Ava Lee', status:'open' }, steps:[], view:{ rows:[], next:null, complete:false, stage:'step1', stageLabel:'Step 1', rail:[] }, events:[], may:{}, is_owner:false, facts:{ dates:{} } };
  window.sb={ functions:{ invoke:async()=>({ data:answer, error:null }) } };
  const sc=document.createElement('script'); sc.textContent=CODE; document.head.appendChild(sc); await sleep(30);
  ok('CRX has openSide', typeof CRX.openSide==='function');
  await CRX.openSide('o-1'); await sleep(400);
  const m=document.getElementById('crModal'), p=document.getElementById('crPanel'), r=p.getBoundingClientRect();
  ok('the side card shows', getComputedStyle(m).display==='flex');
  ok('it sits against the right edge', Math.abs(r.right-innerWidth)<2, [r.right, innerWidth]);
  ok('it is the full height of the window', Math.abs(r.top)<2 && Math.abs(r.bottom-innerHeight)<2, [r.top, r.bottom, innerHeight]);
  ok('it is a side panel width (520)', Math.round(r.width)===520, r.width);
  ok('it slid in (no offset left)', /translateX\(0/.test(p.style.transform), p.style.transform);
  ok('the card is drawn inside it', /Readiness/.test(document.getElementById('crBody').innerText), document.getElementById('crBody').innerText.slice(0,200));
  ok('an open Step 1 side panel is closed first', __drawerClosed===1, __drawerClosed);
  m.dispatchEvent(new MouseEvent('click', { bubbles:true })); await sleep(50);
  ok('a click beside the panel closes it', getComputedStyle(m).display==='none');
  /* 2026-11-02: an owner on an unfinished Step 1 */
  answer.is_owner=true; answer.journey.client_name='Gretchen Sledd';
  answer.view={ rows:[
    { key:'cg.step1.availability', def:{ key:'cg.step1.availability', title:'Availability and scheduling commitment signed', stage:'step1', proof:'verified', permission:'hub', required:true }, st:{ state:'open' }, status:'ready', owner:{ role:'hub' } },
    { key:'cg.company.countersign', def:{ key:'cg.company.countersign', title:'Signed for Caring Companions', stage:'step1', proof:'record', required:true }, st:{ state:'open' }, status:'later', why:'After: Availability', owner:{ role:'owner' } },
    { key:'cg.check.oig', def:{ key:'cg.check.oig', title:'OIG exclusion check', stage:'screening', proof:'proof', permission:'screening', required:true }, st:{ state:'open' }, status:'ready', owner:{ role:'staffing_coordinator' } } ],
    next:null, complete:false, stage:'step1', stageLabel:'Step 1', rail:[{ key:'step1', label:'Step 1', state:'now' }, { key:'screening', label:'Screening', state:'todo' }] };
  CRX.close(); await CRX.openSide('o-1'); await sleep(300);
  const rowEl=k=>[...document.querySelectorAll('#crBody > div > div, #crBody div')].find(d=>d.style.display==='flex' && d.innerHTML.includes(k));
  const bt=t=>[...document.querySelectorAll('#crBody button')].map(b=>b.textContent);
  const txt=document.getElementById('crBody').innerText;
  ok('an unsigned Step 1 form says it is waiting on them, not Ready', /Not signed yet: waiting on Gretchen to sign it in Step 1/.test(txt), txt.slice(0,600));
  ok('no button anywhere says just "Not needed"', !bt().includes('Not needed'), bt());
  ok('no Mark not needed on a form they sign themselves', ![...document.querySelectorAll('#crBody button')].some(b=>/step1\.availability/.test(b.getAttribute('onclick')||'')), bt());
  ok('the owner still has Mark not needed on other open rows (the company signature, a check)', [...document.querySelectorAll('#crBody button')].filter(b=>b.textContent==='Mark not needed').length===2, bt());
  window.__shot1=true;
  return R;
}
"""
T2 = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  CRX.close(); await CRX.open('o-1','Ava Lee'); await sleep(300);
  const p=document.getElementById('crPanel'), r=p.getBoundingClientRect();
  ok('CRX.open (other tabs) keeps the centered card', Math.abs((r.left+r.right)/2-innerWidth/2)<3 && Math.round(r.width)===680, [r.left, r.right, r.width]);
  ok('the centered card has rounded corners and no slide', p.style.borderRadius==='12px' && !p.style.transform, [p.style.borderRadius, p.style.transform]);
  return R;
}
"""
R = []
ok = lambda n, c, d='': R.append(['PASS' if c else 'FAIL', n, '' if c else d])
row = re.search(r"function ckdRowHTML\(p\)\{[\s\S]*?\n\}", ENGINE).group(0)
ok('Onboarding names: a readiness-card person opens CRX.openSide', "CRX.openSide(" in row and "CRX.open(" not in row)
nxt = re.search(r"function ckdRosterNext\(r\)\{[\s\S]*?\n\}", ENGINE).group(0)
ok('Onboarding Open card buttons slide in too', "CRX.openSide(" in nxt and "CRX.open(" not in nxt)
ok('Step 1 people still open their own side panel', "c ? 'ckdOpen(' + c.id + ')'" in row)
ok('[object Object] fixed: the owner is worded from its role', "'a person on the Approve to Work list'" in nxt and "' (' + n.owner + ')'" not in nxt)
stop = re.search(r"function ckdCardStop\(r\)\{[\s\S]*?\n\}", ENGINE).group(0)
ok('the company signature counts as Step 1 on the stops', "offer|step1|consent|company" in stop)
idx = open(os.path.join(HERE, '..', '..', 'index.html')).read()
ok('index loads caregiver-readiness.js v=9', 'caregiver-readiness.js?v=10' in idx)
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1280, 'height': 800})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://127.0.0.1:8768/tests/browser/'); pg.wait_for_timeout(200)
    pg.evaluate("document.body.innerHTML='<h1 style=\"margin:2rem\">Onboarding</h1>'; const st=document.createElement('style'); st.textContent='.ibtn{font:inherit;font-size:.8rem;padding:.3rem .6rem;border:1px solid #d9d4c8;border-radius:8px;background:#fff}body{font-family:-apple-system,sans-serif;margin:0}'; document.head.appendChild(st)")
    R += pg.evaluate(T, CODE)
    pg.screenshot(path=os.path.join(OUT, 'side_card.png'))
    R += pg.evaluate(T2)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

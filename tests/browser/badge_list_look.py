"""BADGES TO MAIL (2026-11-26, Samantha: a list on the Onboarding tab to check off, that never holds anything up). The real
code from caregivers-engine.js, offline, with made-up names. python3 tests/browser/badge_list_look.py <out dir>"""
from playwright.sync_api import sync_playwright
import os, sys, re
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp'
ENGINE = open(os.path.join(HERE, '..', '..', 'caregivers-engine.js')).read()
INDEX = open(os.path.join(HERE, '..', '..', 'index.html')).read()
def cut(a, b): i = ENGINE.index(a); return ENGINE[i:ENGINE.index(b, i)]
PARTS = '\n'.join([cut('const badgeIsTest = ', 'function ckdMoreHTML(L){'), cut('async function ckdBadgeMailed(', '/* ADD A REFERENCE')])
CSS = re.search(r"\n(\s*\.bdg\{[\s\S]*?\.bdg-empty,\.bdg-late\{[^\n]*\n)", INDEX).group(1)
T = r"""
async([PARTS])=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]);
  const ago=d=>new Date(Date.now()-d*864e5).toISOString();
  { const d=document.createElement('script'); d.textContent='let caregivers=['
    +'{first:"Ava",last:"Madeup",offer_id:"o1",hire_date:"'+ago(9).slice(0,10)+'"},'
    +'{first:"Ben",last:"Sample",offer_id:"o2",hire_date:"'+ago(2).slice(0,10)+'"},'
    +'{first:"Cy",last:"Trial",offer_id:"o3",badge_mailed_at:"'+ago(3)+'"},'
    +'{first:"Dee",last:"Nobody",offer_id:"o4",badge_not_needed:true},'
    +'{first:"Eve",last:"Gone",offer_id:"o5",active:false},'
    +'{first:"Old",last:"Hire"},'
    +'{first:"Pat",last:"Practice",offer_id:"o7"}]; let SAVED=0, SAVE_OK=true; async function saveCaregivers(){ SAVED++; return SAVE_OK; } let ME={email:"office@example.com"};'; document.head.appendChild(d); }
  window.bgrEsc=t=>String(t??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  window.ckdDay=d=>String(d).slice(5,10); window.obtDay=window.ckdDay; let RENDERS=0; window.renderCkd=()=>{ RENDERS++; draw(); };
  window.ccConfirm=async()=>true; window.alert=()=>{};
  const sc=document.createElement('script'); sc.textContent=PARTS+'\nwindow.T={badgeToMail,badgeListHTML,ckdBadgeMailed,ckdBadgeNotNeeded}; window.ckdBadgeMailed=ckdBadgeMailed; window.ckdBadgeNotNeeded=ckdBadgeNotNeeded; window.CG=()=>caregivers; window.S=()=>SAVED; window.setSaveOk=v=>{SAVE_OK=v};'; document.head.appendChild(sc);
  const draw=()=>{ document.body.innerHTML='<div style="max-width:760px">'+T.badgeListHTML()+'</div>'; };
  draw();
  const names=()=>[...document.querySelectorAll('.bdg-n')].map(x=>x.textContent);
  ok('on the list: active offer hires with no badge recorded, oldest first', JSON.stringify(names())==='["Ava Madeup","Ben Sample"]', names());
  ok('left off: mailed, not needed, inactive, no offer (older hires), practice people', !/Cy Trial|Dee Nobody|Eve Gone|Old Hire|Pat Practice/.test(document.querySelector('.bdg-ul').textContent));
  ok('the count and the plain words: nothing waits on it, Monday email', /Badges to mail \(2\)/.test(document.body.textContent) && /Nothing waits on this/.test(document.body.textContent) && /every Monday morning/.test(document.body.textContent));
  ok('mailed lately shows Cy', /Mailed lately: Cy Trial/.test(document.body.textContent));
  ok('days waiting shows', /9 days/.test(document.body.textContent));
  window.__R=R; return R;
}"""
T2 = r"""
async()=>{
  const R=window.__R, ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]);
  const names=()=>[...document.querySelectorAll('.bdg-n')].map(x=>x.textContent);
  document.querySelector('.bdg-row .ckd-go').click(); await new Promise(r=>setTimeout(r,50));
  const ava=CG().find(g=>g.first==='Ava');
  ok('Mailed records the time and the presser, saves once, and Ava leaves the list', !!ava.badge_mailed_at && ava.badge_mailed_by==='office@example.com' && S()===1 && JSON.stringify(names())==='["Ben Sample"]', [ava, S(), names()]);
  setSaveOk(false); document.querySelector('.bdg-row .ckd-link').click(); await new Promise(r=>setTimeout(r,50));
  const ben=CG().find(g=>g.first==='Ben');
  ok('a failed save leaves Ben on the list and records nothing', !ben.badge_not_needed && !ben.badge_not_needed_by && JSON.stringify(names())==='["Ben Sample"]', ben);
  setSaveOk(true); document.querySelector('.bdg-row .ckd-link').click(); await new Promise(r=>setTimeout(r,50));
  ok('Not needed records it with the presser, and the list says every badge is mailed', ben.badge_not_needed===true && ben.badge_not_needed_by==='office@example.com' && /Every badge is mailed/.test(document.body.textContent), ben);
  return R;
}"""
PAGE = '<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,sans-serif;padding:16px}' + CSS + '.ckd-go{font:inherit;font-size:.82rem;font-weight:700;padding:.35rem .8rem;border:none;border-radius:8px;background:#0D365F;color:#fff}.ckd-link{background:none;border:none;color:#1F7A8C;text-decoration:underline;font:inherit;font-size:.82rem}</style></head><body></body></html>'
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 800, 'height': 300})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.route('http://hub.test/', lambda r: r.fulfill(status=200, content_type='text/html', body=PAGE))
    pg.goto('http://hub.test/'); pg.wait_for_timeout(100)
    pg.evaluate(T, [PARTS]); pg.screenshot(path=os.path.join(OUT, 'badge_list.png'), full_page=True)
    R = pg.evaluate(T2)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

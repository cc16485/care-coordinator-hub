"""When an onboarding hire falls off (Samantha 2026-11-04: Eligible For Rehire in AxisCare, the office's Take off too, a late YES
is a card with one-click Put back). The real Hub page, offline (files served from this folder), made-up people only; every
server call is answered here and recorded, nothing reaches anyone.
(python3 tests/browser/falloff_look.py; SHOTS=<dir> also saves screenshots)"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = os.environ.get('SHOTS')
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const D=864e5, ago=ms=>new Date(Date.now()-ms).toISOString(), ymd=ms=>new Date(Date.now()-ms).toISOString().slice(0,10);
  (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha Troutman' }; CC_ROLES=['owner_admin']; CC_ROLES_CHECKED=true;");
  window.__cf=[]; window.__alerts=[]; window.__calls=[]; window.__closed=[];
  (0,eval)("ccConfirm=async m=>{ window.__cf.push(String(m)); return true; };");
  window.alert=m=>window.__alerts.push(String(m));
  window.CRX=window.CRX||{}; (0,eval)("CRX.call=async b=>{ window.__calls.push(b); return { ok:true, note:'They are back to In Training in AxisCare. The Training Platform sends their orientation link again tonight.', axiscare:{ state:'put_back' } }; };");
  (0,eval)("opsCloseCommit=async (it,note)=>{ it.status='done'; window.__closed.push([it.id,note]); }; loadAllData=async()=>{};");
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; await sleep(300);
  const mk=(id,first,last,reason,notes,d)=>({ id, first, last, phone:'4175550'+id, not_hired:true, not_hired_reason:reason, not_hired_notes:notes, not_hired_date:ymd(d*D), left_at:ago(d*D), oig:'CLEAR', edl:'Clear', fcsr:'Clear', casenet:'Clear' });
  localStorage.setItem('cc_candidates', JSON.stringify([mk(9101,'Jordan','Reyes','ghosted','No answer to the "still interested?" text',1), mk(9102,'Taylor','King','ghosted','No answer to the "still interested?" text',2),
    mk(9103,'Alexis','Moore','changed_mind','Said no to the "still interested?" text',3), mk(9104,'Sam','Lee','other_job','Took a job at the hospital',1), mk(9105,'Riley','Park','ghosted','No answer',1)]));
  switchTab('cgbackground'); for(let i=0;i<40 && !(window.SCX && SCX.renderOB);i++) await sleep(100);
  ok('the onboarding engine loaded', !!(window.SCX && SCX.renderOB));
  window.CRX=window.CRX||{}; (0,eval)("CRX.call=async b=>{ window.__calls.push(b); return { ok:true, note:'They are back to In Training in AxisCare. The Training Platform sends their orientation link again tonight.', axiscare:{ state:'put_back' } }; };");
  (0,eval)("opsCloseCommit=async (it,note)=>{ it.status='done'; window.__closed.push([it.id,note]); }; loadAllData=async()=>{};");
  ok('falloff.js loaded (window.FALLOFF)', !!window.FALLOFF && typeof FALLOFF.chip==='function');
  FALLOFF._st.rows=[
    { candidate_id:'9101', state:'set', label_before:'In Training', label_after:'Eligible For Rehire', detail:'Read back from AxisCare.', at:ago(1*D) },
    { candidate_id:'9102', state:'has_visits', detail:'AxisCare shows a worked visit on 2026-10-28, so the Hub left them as they are.', at:ago(2*D) },
    { candidate_id:'9103', state:'set', label_after:'Eligible For Rehire', back_state:'put_back', back_at:ago(0.2*D), at:ago(3*D) },
    { candidate_id:'9104', state:'practice', detail:'Switch off', at:ago(1*D) },
    { candidate_id:'9105', state:'failed', detail:'AxisCare answered 422: status not allowed', at:ago(1*D) } ];
  FALLOFF._st.at=Date.now();
  try{ ckdOldView('not_hired'); }catch(e){}
  await sleep(300);
  const tb=document.getElementById('ob-tbody'), txt=()=>tb?tb.innerText:'';
  ok('Taken off the list shows the five made-up people', ['Jordan Reyes','Taylor King','Alexis Moore','Sam Lee','Riley Park'].every(n=>txt().includes(n)), txt().slice(0,500));
  ok('set: "AxisCare: Eligible For Rehire (checked)" and the Training link line', /AxisCare: Eligible For Rehire \(checked\)/.test(txt()) && /Training link closes on the nightly sync/.test(txt()), txt());
  ok('a shift: "AxisCare not changed: has a shift (card open)"', /AxisCare not changed: has a shift \(card open\)/.test(txt()));
  ok('put back: "AxisCare: back to In Training"', /AxisCare: back to In Training/.test(txt()));
  ok('switch off: "AxisCare: set by hand (card)"', /AxisCare: set by hand \(card\)/.test(txt()));
  ok('failed: "AxisCare not changed: see the card"', /AxisCare not changed: see the card/.test(txt()));
  ok('the reason behind each chip is on hover', [...tb.querySelectorAll('span.badge[title]')].some(s=>/worked visit on 2026-10-28/.test(s.title)));
  ok('Reactivate is still on each row', tb.querySelectorAll('button[onclick^="reactivateOB"]').length>=5);
  /* the Take off messages */
  ok('Take off messages: set, already, practice, not changed', /AxisCare now has them as Eligible For Rehire \(checked\)\. Their Training link closes tonight\./.test(FALLOFF.leftNote({ axiscare:{ state:'set', label:'Eligible For Rehire' } }))
    && /already had them as Inactive/.test(FALLOFF.leftNote({ axiscare:{ state:'already', label:'Inactive' } }))
    && /set them inactive there\. You have a card for it\./.test(FALLOFF.leftNote({ axiscare:{ state:'practice' }, axiscare_card:true }))
    && /AxisCare was NOT changed: AxisCare shows a worked visit/.test(FALLOFF.leftNote({ axiscare:{ state:'has_visits', detail:'AxisCare shows a worked visit on 2026-10-28.' } })));
  /* the card */
  const it={ id:'falloff_yes_9101', kind:'falloff_said_yes', domain:'recruiting_orientation', status:'open', urgency:'today', title:'Jordan Reyes replied YES after being taken off',
    detail:'They were taken off Onboarding on Fri, Nov 6 (no answer to the check-in). Then they texted "Yes". Put back brings them back onto Onboarding and sets them In Training in AxisCare; the Training Platform sends their orientation link again that night. Nothing was texted to them.',
    candidate_id:'9101', offer_id:'off-9101', created_at:ago(0.1*D), due:new Date(Date.now()+D).toISOString(), owner:'', created_by:'last-chance' };
  DATA.ops_items=[...(DATA.ops_items||[]).filter(x=>x.id!==it.id), it];
  const h=obligationOpenAction(it);
  ok('the card has Put back and Leave them off', /Put back<\/button>/.test(h) && /Leave them off<\/button>/.test(h), h);
  ok('the kind has a name in Needs Attention', (OPS_KINDS.falloff_said_yes && OPS_KINDS.falloff_said_yes.label==='Replied after being taken off'));
  const box=document.createElement('div'); box.id='falloffCardShot'; box.style.cssText='width:640px;padding:14px;background:#fff;border:1px solid #E2E8F0;border-left:4px solid #B45309;border-radius:10px;margin:20px;font-family:Poppins,sans-serif';
  box.style.cssText='width:720px;margin:20px;background:#F6F9FD;padding:10px';
  box.innerHTML=myWorkCard(it, 0);
  ok('the real My Work card shows the title, the words and the two buttons', /replied YES after being taken off/.test(box.innerText) && /Put back/.test(box.innerText) && /Leave them off/.test(box.innerText), box.innerText.slice(0,400));
  document.body.prepend(box);
  await FALLOFF.putBack(it.id); await sleep(100);
  ok('Put back asks first, in her words', window.__cf.some(m=>/^Put Jordan Reyes back on Onboarding\?/.test(m) && /In Training in AxisCare again/.test(m) && /Nothing is texted from here/.test(m)), window.__cf);
  ok('...then calls come_back for that person (the same as Reactivate)', window.__calls.some(b=>b.action==='come_back' && b.candidate_id==='9101' && b.offer_id==='off-9101'), window.__calls);
  ok('...closes the card and says what happened in AxisCare', window.__closed.some(([id,n])=>id===it.id && /Put back/.test(n)) && window.__alerts.some(a=>/Jordan Reyes is back on Onboarding\./.test(a) && /orientation link again tonight/.test(a)), [window.__closed, window.__alerts]);
  const it2={ ...it, id:'falloff_yes_9102', status:'open', title:'Taylor King texted after being taken off', candidate_id:'9102' }; DATA.ops_items.push(it2);
  await FALLOFF.leaveOff(it2.id);
  ok('Leave them off closes the card, nothing sent', window.__closed.some(([id,n])=>id===it2.id && /Left them off/.test(n)) && window.__calls.length===1);
  return R;
}
"""
MIME = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.json':'application/json', '.webmanifest':'application/json', '.webp':'image/webp'}
def serve(route):
    url = route.request.url
    if 'supabase.co' in url: return route.abort()
    if not url.startswith('http://fo.local/'): return route.continue_()
    p = (ROOT / url.split('http://fo.local/', 1)[1].split('?')[0].split('#')[0])
    if not p.is_file(): return route.fulfill(status=404, body='')
    route.fulfill(status=200, body=p.read_bytes(), content_type=MIME.get(p.suffix, 'application/octet-stream'))
R = []
src = (ROOT / 'falloff.js').read_text()
R.append(['PASS' if '—' not in src else 'FAIL', 'no em dashes in falloff.js', ''])
with sync_playwright() as pw:
    b = pw.chromium.launch()
    cx = b.new_context(viewport={'width': 1400, 'height': 900}, timezone_id='America/Chicago'); pg = cx.new_page()
    pg.route('**/*', serve)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://fo.local/index.html?proof=fo'); pg.wait_for_timeout(1500)
    R += pg.evaluate(T)
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True)
        pg.locator('#falloffCardShot').screenshot(path=os.path.join(SHOTS, 'falloff_card.png'))
        pg.evaluate("()=>{ document.getElementById('falloffCardShot').remove(); window.scrollTo(0,0); }")
        pg.evaluate("()=>{ for(const el of document.querySelectorAll('body *')){ const p=getComputedStyle(el).position; if((p==='fixed'||p==='sticky') && !el.closest('#ob-tbody')) el.style.visibility='hidden'; } }")
        pg.locator('#ob-tbody').screenshot(path=os.path.join(SHOTS, 'falloff_taken_off.png'))
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    cx.close(); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

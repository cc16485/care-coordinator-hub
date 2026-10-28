"""PRN step 1 settings (Samantha 2026-10-28): the PRN Teams card shows both team goals, the two approved PRN shift texts
(empty box = approved wording) and three switches, each off until she turns it on. Offline, made-up data; saves recorded,
nothing sent. (PORT=<static server port> python3 tests/browser/prn_step1_settings_look.py)"""
import os
from playwright.sync_api import sync_playwright
H = open('/Users/samantha/Claude/Projects/cc-hub-live/.claude/g1a_harness.js').read()
PORT = os.environ.get('PORT', '8811')
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const merges=[]; window.tkMerge=async(fn,what)=>{ const base=JSON.parse(JSON.stringify(DATA.ops_settings||{})), m=JSON.parse(JSON.stringify(base)); const ch=fn(m,base)||[]; DATA.ops_settings=m; merges.push([what,ch]); return { changed:ch, error:null }; };
  window.ccConfirm=async()=>true; (0,eval)('ccConfirm=window.ccConfirm');
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; await sleep(600);
  (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha Troutman' };"); CC_ROLES=['owner_admin']; CC_ROLES_CHECKED=true; CC_ROLE_BY_EMAIL['samantha@mo-care.com']=['owner_admin'];
  DATA.ops_settings={ prn_team_minimum:20, cara_wave_rules_live:false };
  location.hash='#settings/prn'; await sleep(300); prnSetFill();
  const P=document.getElementById('tab-settings'), vis=[...P.querySelectorAll('[data-set]')].filter(x=>x.style.display!=='none').map(x=>x.dataset.set);
  ok('the Admin page link opens just PRN Teams', JSON.stringify(vis)==='["prn"]', vis);
  ok('the card is called PRN Teams, with a goal for each team', /PRN Teams/.test(document.querySelector('#prnSettings h3').innerText) && /PRN CNA Team goal/.test(P.innerText) && /PRN Caregiver Team goal/.test(P.innerText));
  const fam=document.getElementById('set_prn_fam_msg'), team=document.getElementById('set_prn_team_msg');
  ok('empty boxes show the approved texts', fam.value==='' && /You cared for \{client\} in \{month\}, so you'd be a familiar face\./.test(fam.placeholder) && /You're part of our care continuity team/.test(team.placeholder), [fam.placeholder, team.placeholder]);
  const sw=document.getElementById('prnStep1Switches').innerText;
  ok('three switches, all off', (sw.match(/: off/g)||[]).length===3 && /Never text anyone working right now/.test(sw) && /Ask familiar first, then the PRN Teams, with the new PRN texts/.test(sw) && /Count covered PRN shifts automatically/.test(sw), sw);
  document.getElementById('set_prn_cg_min').value='12'; await prnSetSave(); await sleep(50);
  ok('saving the PRN Caregiver Team goal records just that', DATA.ops_settings.prn_caregiver_minimum===12 && DATA.ops_settings.prn_team_minimum===20 && /PRN Caregiver Team goal/.test(merges.at(-1)[1].join()), merges.at(-1));
  team.value='Hi {first_name} — test'; await prnStep1Save(); await sleep(50);
  ok('an em dash in the wording is refused, nothing saved', !('coverage_msg_prn_team' in DATA.ops_settings) && /em dash/.test(document.getElementById('prnStep1Status').innerText));
  team.value='Hi {first_name}, {client} in {town} needs someone {when}. Can you help?'; await prnStep1Save(); await sleep(50);
  ok('edited wording is saved', DATA.ops_settings.coverage_msg_prn_team==='Hi {first_name}, {client} in {town} needs someone {when}. Can you help?');
  team.value=''; await prnStep1Save(); await sleep(50);
  ok('emptying the box goes back to the approved wording', !('coverage_msg_prn_team' in DATA.ops_settings) && /back to the approved wording/.test(merges.at(-1)[1].join()));
  const btns=[...document.querySelectorAll('#prnStep1Switches button')];
  await prnStep1Toggle('prn_order_live', btns[1]); await sleep(50);
  const sw2=document.getElementById('prnStep1Switches').innerText;
  ok('turning on the order switch sets only that switch', DATA.ops_settings.prn_order_live===true && DATA.ops_settings.working_now_live===undefined && DATA.ops_settings.prn_count_live===undefined);
  ok('with Cara\'s wave rules off, it says her waves still ask PRN first', /Cara's wave rules are on/.test(sw2), sw2);
  await prnStep1Toggle('prn_order_live'); await sleep(50);
  ok('and off again', DATA.ops_settings.prn_order_live===false);
  ok('the Recruit menu says PRN Teams', /PRN Teams/.test(document.getElementById('rcnav-prn').innerText));
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page()
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(f'http://localhost:{PORT}/index.html?proof=prnstep1'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', H)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    pg.set_viewport_size({'width': 1200, 'height': 1400}); pg.evaluate("()=>{ DATA.ops_settings.prn_order_live=false; prnSetFill(); document.getElementById('prnSettings').scrollIntoView(); }")
    pg.locator('#prnSettings').screenshot(path=os.environ.get('SHOT', '/tmp/prn_step1_settings.png')); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

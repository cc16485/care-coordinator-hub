"""Missed clock-outs setting (2026-10-05, "there is no missed clock out"): the clock-out reminder's minutes and wording,
editable like Missed clock-ins, opened by itself from the Owners Hub Admin page. Offline, made-up data; saves recorded,
nothing sent. (python3 tests/browser/missed_clockout_look.py, with the static server on 8765)"""
from playwright.sync_api import sync_playwright
H = open('/Users/samantha/Claude/Projects/cc-hub-live/.claude/g1a_harness.js').read()
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const merges=[]; window.tkMerge=async(fn,what)=>{ const base=JSON.parse(JSON.stringify(DATA.ops_settings||{})), m=JSON.parse(JSON.stringify(base)); const ch=fn(m,base)||[]; DATA.ops_settings=m; merges.push([what,ch]); return { changed:ch, error:null }; };
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; await sleep(600);
  (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha Troutman' };"); CC_ROLES=['owner_admin']; CC_ROLES_CHECKED=true; CC_ROLE_BY_EMAIL['samantha@mo-care.com']=['owner_admin'];
  const day=new Date().toISOString().slice(0,10);
  DATA.ops_settings={ timekeeper_watch_live:true, timekeeper_text_live:false };
  DATA.timekeeper_cases=[{ id:'tko_1', kind:'clock_out', caregiver:'Joyce K. (fake)', client_first:'Linda', shift_date:day, texted_at:new Date().toISOString() },
                         { id:'tk_2', kind:'clock_in', caregiver:'Not this one', client_first:'X', shift_date:day }];
  location.hash='#settings/missed-clockouts'; await sleep(300);
  const P=document.getElementById('tab-settings'), vis=[...P.querySelectorAll('[data-set]')].filter(x=>x.style.display!=='none').map(x=>x.dataset.set);
  ok('the Admin page link opens just Missed clock-outs', JSON.stringify(vis)==='["missed-clockouts"]', vis);
  const st=document.getElementById('tkoState').innerText, rec=document.getElementById('tkoRecent').innerText;
  ok('it says whether the text is going out (caregiver texts off here)', /Not going out now\. Caregiver texts are off/.test(st), st);
  ok('the last two days of clock-out texts, not clock-in ones', /1 clock-out text/.test(rec) && /Joyce K\. \(fake\) · Linda/.test(rec) && !/Not this one/.test(rec), rec);
  const box=document.getElementById('set_tko_msg');
  ok('empty box shows the standard wording, with the filled-in form link', box.value==='' && /sc\.mo-care\.com\/evv-correction-form/.test(box.placeholder) && /no clock-out yet/.test(box.placeholder));
  tkoCopyStd(); ok('"Copy the standard wording" puts it in the box to edit', box.value===box.placeholder);
  box.value='Hi {first_name}, your shift with {client} ended at {time} and there is no clock-out yet. Please clock out now.'; box.dispatchEvent(new Event('input'));
  ok('wording without the form link is flagged (not blocked)', /no form link/.test(document.getElementById('tkoWarn').innerText));
  document.getElementById('set_tko_grace').value='15';
  await tkoSave(); await sleep(50);
  ok('saved: minutes and wording, recorded by name', DATA.ops_settings.timekeeper_clockout_grace_min===15 && /^Hi \{first_name\}, your shift/.test(DATA.ops_settings.timekeeper_msg_out) && merges[0][0]==='missed clock-out settings' && merges[0][1].join()==='clock-out minutes,clock-out wording', merges);
  ok('nothing else in the settings changed', DATA.ops_settings.timekeeper_text_live===false && DATA.ops_settings.timekeeper_watch_live===true && !('timekeeper_msg' in DATA.ops_settings));
  box.value=''; document.getElementById('set_tko_grace').value=''; await tkoSave(); await sleep(50);
  ok('emptying both goes back to standard', !('timekeeper_msg_out' in DATA.ops_settings) && !('timekeeper_clockout_grace_min' in DATA.ops_settings) && /back to standard/.test(merges[1][1].join()));
  DATA.ops_settings.timekeeper_text_live=true; tkoFill();
  ok('with caregiver texts on, it says On', /^On\./.test(document.getElementById('tkoState').innerText));
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page()
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=clockout'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', H)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

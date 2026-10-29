"""PRN step 3 (Samantha 2026-10-28): familiar clients, the go-back answers and the "no PRN backup" line on Recruit, PRN Teams,
and the go-back switch and wording in Settings. Offline, made-up data; every server call is answered here, nothing is sent or
saved. (PORT=<static server port> python3 tests/browser/prn_familiar_look.py)"""
import os
from playwright.sync_api import sync_playwright
H = open('/Users/samantha/Claude/Projects/cc-hub-live/.claude/g1a_harness.js').read()
PORT = os.environ.get('PORT', '8811')
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  window.ccConfirm=async()=>true; (0,eval)('ccConfirm=window.ccConfirm');
  window.tkMerge=async(fn,what)=>{ const base=JSON.parse(JSON.stringify(DATA.ops_settings||{})), m=JSON.parse(JSON.stringify(base)); const ch=fn(m,base)||[]; DATA.ops_settings=m; return { changed:ch, error:null }; }; (0,eval)('tkMerge=window.tkMerge');
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; await sleep(600);
  (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha Troutman' };"); CC_ROLES=['owner_admin']; CC_ROLES_CHECKED=true; CC_ROLE_BY_EMAIL['samantha@mo-care.com']=['owner_admin'];
  const WEEK = { ok:true, today:'2026-10-28', live:true, thanks_live:false, owner:'Krystal', more:0, familiar_note:null, goback_live:false,
    members:[{applicant_id:'g',name:'Grace Lee',team:'cna',axiscare_id:'11',familiar:{why:null,clients:[{client:'Mary Smith',visits:3,last:'2026-10-01',glad:true,star:true},{client:'Ann Bell',visits:1,last:'2026-09-12',glad:false,star:false}]}},
             {applicant_id:'s',name:'Tasha Fox',team:'caregiver',axiscare_id:null,familiar:{why:'not linked to AxisCare yet',clients:[]}}],
    items:[{id:'goback:g:client:annbell',kind:'goback',applicant_id:'g',name:'Grace Lee',team:'PRN CNA Team',ref:'client:annbell',client:'Ann',title:'Would Grace be glad to go back to Ann?',detail:'They answered: "Yes but only mornings"',answer:'Yes but only mornings'},
           {id:'nobackup:ruthlee:2026-10',kind:'nobackup',applicant_id:'',name:'Ruth Lee',team:'',ref:'nobackup:ruthlee:2026-10',client:'Ruth Lee',client_ax:'501',title:'Ruth Lee has no PRN backup who knows them yet',detail:"4 call-offs in 30 days. An intro visit could help, only with the family's OK."}],
    oncall:{ stipend:null, patterns:{}, offers:[], weekends:[] } };
  const CALLS=[]; const realFetch=window.fetch;
  window.fetch=async(u,o)=>{ if(String(u).includes('/functions/v1/prn-week')){ const b=JSON.parse(o.body); CALLS.push(b);
      return new Response(JSON.stringify(b.action==='week'?WEEK:{outcome:'recorded'}),{status:200}); } return realFetch(u,o); };
  sb.auth.getSession=async()=>({ data:{ session:{ access_token:'t' } } });
  let opened=null; window.openClientProfile=(r)=>{ opened=r; }; (0,eval)('openClientProfile=window.openClientProfile');
  location.hash='#prnteams'; await sleep(700); await PW.load(); await sleep(100);
  const box=document.getElementById('prnWeek'), txt=()=>box.innerText;
  ok('Familiar clients shows under This week, with the goal', /Familiar clients/.test(txt()) && /the goal is two to four each/.test(txt()), txt().slice(0,400));
  ok('Grace: ★ Mary (glad to go back) and Ann, 2 familiar', /Grace Lee[\s\S]*2 familiar/.test(txt()) && /★ Mary Smith · glad to go back/.test(txt()) && /Ann Bell/.test(txt()));
  ok('Tasha: not linked to AxisCare yet, said plainly', /Tasha Fox[\s\S]*Not linked to AxisCare yet\./.test(txt()));
  const lines=[...box.querySelectorAll('.pw-line')], gl=lines.find(l=>/go back to Ann/.test(l.innerText)), nl=lines.find(l=>/no PRN backup/.test(l.innerText));
  ok('go-back line: their words, Glad to go back and Rather not, no Not this one', gl && /Yes but only mornings/.test(gl.innerText) && /Glad to go back/.test(gl.innerText) && /Rather not/.test(gl.innerText) && !/Not this one/.test(gl.innerText), gl&&gl.innerText);
  ok('no-backup line: the family\'s OK, Open Ruth\'s page, Intro visit planned, Not this one', nl && /only with the family's OK/.test(nl.innerText) && /Open Ruth's page/.test(nl.innerText) && /Intro visit planned/.test(nl.innerText) && /Not this one/.test(nl.innerText), nl&&nl.innerText);
  ok('the list no longer says the no-backup line is coming later', !/clients with no PRN backup who knows them\./.test(txt()));
  await PW.goback('goback:g:client:annbell','yes');
  ok('Glad to go back records yes for Ann, with their words', CALLS.some(c=>c.action==='goback_mark' && c.applicant_id==='g' && c.ref==='client:annbell' && c.answer==='yes' && c.note==='Yes but only mornings'));
  PW.client('nobackup:ruthlee:2026-10'); ok('Open Ruth\'s page opens her client profile by AxisCare id', opened==='501', opened);
  await PW.cmark('nobackup:ruthlee:2026-10','intro_planned');
  ok('Intro visit planned records it for the month (nothing is scheduled or texted)', CALLS.some(c=>c.action==='client_mark' && c.kind==='intro_planned' && c.ref==='nobackup:ruthlee:2026-10'));
  await PW.cmark('nobackup:ruthlee:2026-10','not_this_one');
  ok('Not this one on the client line uses the client mark', CALLS.some(c=>c.action==='client_mark' && c.kind==='not_this_one'));
  /* settings */
  DATA.ops_settings={}; location.hash='#settings/prn'; await sleep(300); prnSetFill();
  const sw=document.getElementById('prnStep3Switches').innerText;
  ok('Settings: the go-back switch, off', /Would you be glad to go back\?/.test(sw) && /: off/.test(sw), sw);
  ok('Settings: the box shows her standard wording', document.getElementById('set_prn_goback_msg').placeholder===PRN_GOBACK_DEFAULT && /Would you be glad to go back to \{client\} another time\? Just reply YES or NO\. Either answer is perfectly fine\./.test(PRN_GOBACK_DEFAULT));
  document.getElementById('set_prn_goback_msg').value='Hi {first_name}, would you go back?'; await prnStep3Save();
  ok('Settings: wording without {client} is refused', !DATA.ops_settings.prn_goback_msg && /Keep \{client\}/.test(document.getElementById('prnStep3Status').textContent));
  document.getElementById('set_prn_goback_msg').value='Hi {first_name}, thank you for {client} {when}. Glad to go back? YES or NO.'; await prnStep3Save();
  ok('Settings: her own wording saves', DATA.ops_settings.prn_goback_msg==='Hi {first_name}, thank you for {client} {when}. Glad to go back? YES or NO.');
  await prnStep1Toggle('prn_goback_live'); ok('Settings: the go-back switch turns on by itself', DATA.ops_settings.prn_goback_live===true && DATA.ops_settings.prn_week_live===undefined);
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1300, 'height': 1600})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co/rest' in r.request.url or 'supabase.co/auth' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(f'http://localhost:{PORT}/index.html?proof=prnfamiliar'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', H)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    pg.evaluate("()=>{ location.hash='#prnteams'; }"); pg.wait_for_timeout(500); pg.evaluate("async()=>{ await PW.load(); }"); pg.wait_for_timeout(300)
    pg.locator('#prnWeek').screenshot(path=os.environ.get('SHOT', '/tmp/prn_familiar.png')); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

"""PRN step 4 (Samantha 2026-10-29): the team welcome. The "Welcome call with ___" line on Recruit, PRN Teams with its five
questions, and the welcome wording and switch in Settings. Offline, made-up data; every server call is answered here, nothing is
sent or saved. (PORT=<static server port> python3 tests/browser/prn_welcome_look.py)"""
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
  const WEEK = { ok:true, today:'2026-10-29', live:true, thanks_live:false, owner:'Krystal', more:0, familiar_note:null, goback_live:false, welcome_live:false,
    members:[{applicant_id:'g',name:'Grace Hill',team:'cna',axiscare_id:'11',familiar:{why:null,clients:[]}},{applicant_id:'t',name:'Tina Shorr',team:'caregiver',axiscare_id:'12',familiar:{why:null,clients:[]}}],
    items:[{id:'welcome:g',kind:'welcome',applicant_id:'g',name:'Grace Hill',team:'PRN CNA Team',team_key:'cna',ref:'welcome',title:'Welcome call with Grace',detail:'New on the PRN CNA Team (linked in AxisCare 2 days ago). The welcome text went out. Five minutes to say hello and learn what suits them.'},
           {id:'welcome:t',kind:'welcome',applicant_id:'t',name:'Tina Shorr',team:'PRN Caregiver Team',team_key:'caregiver',ref:'welcome',title:'Welcome call with Tina',detail:'New on the PRN Caregiver Team (linked in AxisCare today). Five minutes to say hello and learn what suits them.'}],
    oncall:{ stipend:null, patterns:{}, offers:[], weekends:[] } };
  const CALLS=[]; const realFetch=window.fetch; let answer={outcome:'recorded',oncall:'recorded'};
  window.fetch=async(u,o)=>{ if(String(u).includes('/functions/v1/prn-week')){ const b=JSON.parse(o.body); CALLS.push(b);
      if(b.action==='welcome_call' && !b.towns_times) return new Response(JSON.stringify({error:'Which towns and times suit them?'}),{status:400});
      return new Response(JSON.stringify(b.action==='week'?WEEK:answer),{status:200}); } return realFetch(u,o); };
  sb.auth.getSession=async()=>({ data:{ session:{ access_token:'t' } } });
  location.hash='#prnteams'; await sleep(700); await PW.load(); await sleep(100);
  const box=document.getElementById('prnWeek'), lines=()=>[...box.querySelectorAll('.pw-line')];
  const gl=lines().find(l=>/Welcome call with Grace/.test(l.innerText));
  ok('the welcome call line: who, their team, the text went out, Open their page, Record the call, Not this one', gl && /PRN CNA Team/.test(gl.innerText) && /The welcome text went out/.test(gl.innerText) && /Open their page/.test(gl.innerText) && /Record the call/.test(gl.innerText) && /Not this one/.test(gl.innerText), gl&&gl.innerText);
  PW.open('welcome:g'); await sleep(50);
  const f=box.innerText;
  ok('Record the call opens the five questions, plus (PRN CNA Team) how to sign up for on call on their page', ['Which towns and times suit you?','Is short notice ever OK?','Would you like more hours someday?','What kind of clients do you enjoy?','sign up for on-call shifts on their PRN Team page','Interested in office work someday'].every(q=>f.includes(q)) && !f.includes('Would you like to be on call sometimes?'), f.slice(0,900));
  await PW.welcome('welcome:g'); await sleep(50);
  ok('saving without towns and times says what is missing', /Which towns and times suit them\?/.test(document.getElementById('pwSt_welcome:g').textContent), document.getElementById('pwSt_welcome:g').textContent);
  document.getElementById('pwWtowns_welcome:g').value='Springfield and Nixa, weekday mornings';
  document.getElementById('pwWshort_welcome:g').value='yes'; document.getElementById('pwWmore_welcome:g').value='maybe';
  document.getElementById('pwWenjoys_welcome:g').value='memory care'; 
  document.getElementById('pwWoffice_welcome:g').checked=true;
  await PW.welcome('welcome:g'); await sleep(50);
  const c=CALLS.filter(x=>x.action==='welcome_call').pop();
  ok('Save records every answer for Grace', c && c.applicant_id==='g' && c.towns_times==='Springfield and Nixa, weekday mornings' && c.short_notice==='yes' && c.more_hours==='maybe' && c.enjoys==='memory care' && c.oncall==='' && c.office_interest===true, c);
  await sleep(800);
  PW.open('welcome:t'); await sleep(50);
  ok('Tina (PRN Caregiver Team): no on-call note', !/sign up for on-call shifts/.test(box.innerText) && /Which towns and times suit you\?/.test(box.innerText), box.innerText.slice(0,700));
  await PW.mark('welcome:t','not_this_one');
  ok('Not this one takes the welcome line off', CALLS.some(x=>x.action==='mark' && x.kind==='not_this_one' && x.ref==='welcome' && x.applicant_id==='t'));
  /* settings */
  DATA.ops_settings={}; location.hash='#settings/prn'; await sleep(300); prnSetFill();
  const sw=document.getElementById('prnStep4Switches').innerText;
  ok('Settings: the welcome switch, off', /Welcome text to new PRN members/.test(sw) && /: off/.test(sw), sw);
  ok('Settings: the box shows her approved wording', document.getElementById('set_prn_welcome_msg').placeholder===PRN_WELCOME_DEFAULT && PRN_WELCOME_DEFAULT==="Hi {first_name}, welcome to Caring Companions' {team}! Our PRN Teams are our care continuity team: when a client needs coverage, you're among the first people we call. Saying no is always OK, and once you say yes, families count on you. We'll call you this week to say hello. We're so glad you're here!");
  document.getElementById('set_prn_welcome_msg').value='Hi {first_name} — welcome!'; await prnStep4Save();
  ok('Settings: an em dash is refused', !DATA.ops_settings.prn_welcome_msg && /em dash/.test(document.getElementById('prnStep4Status').textContent));
  document.getElementById('set_prn_welcome_msg').value='Hi {first_name}, welcome to the {team}!'; await prnStep4Save();
  ok('Settings: her own wording saves', DATA.ops_settings.prn_welcome_msg==='Hi {first_name}, welcome to the {team}!');
  await prnStep1Toggle('prn_welcome_live'); ok('Settings: the welcome switch turns on by itself', DATA.ops_settings.prn_welcome_live===true && DATA.ops_settings.prn_goback_live===undefined);
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1300, 'height': 1600})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co/rest' in r.request.url or 'supabase.co/auth' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(f'http://localhost:{PORT}/index.html?proof=prnwelcome'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', H)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    pg.evaluate("()=>{ location.hash='#prnteams'; }"); pg.wait_for_timeout(500); pg.evaluate("async()=>{ await PW.load(); PW.open('welcome:g'); }"); pg.wait_for_timeout(300)
    pg.locator('#prnWeek').screenshot(path=os.environ.get('SHOT', '/tmp/prn_welcome.png')); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

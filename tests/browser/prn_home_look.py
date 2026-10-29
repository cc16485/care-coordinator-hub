"""The PRN Teams home (Samantha 2026-10-29: "I thought it would be more PRN Team tabs"). Opened from its own link (#prnteams):
no hiring tabs row or Recruit heading, five tabs of its own. From inside Recruit, the stacked view as before. Offline, made-up
data; every server call is answered here, nothing is sent or saved. (PORT=<static server port> python3 tests/browser/prn_home_look.py)"""
import os
from playwright.sync_api import sync_playwright
H = open('/Users/samantha/Claude/Projects/cc-hub-live/.claude/g1a_harness.js').read()
PORT = os.environ.get('PORT', '8811')
SHOTS = os.environ.get('SHOTS', '/tmp')
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; await sleep(600);
  (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha Troutman' };"); CC_ROLES=['owner_admin']; CC_ROLES_CHECKED=true; CC_ROLE_BY_EMAIL['samantha@mo-care.com']=['owner_admin'];
  (0,eval)(`PRN_T = { at: Date.now(), history: [], shifts: [], tracks: [
      { applicant_id:'g', track:'prn_team', team:'cna', since:'2026-10-19', axiscare_caregiver_id:'11', linked_at:'2026-10-27T15:00:00Z' },
      { applicant_id:'y', track:'prn_team', team:'cna', since:'2026-10-19', axiscare_caregiver_id:null },
      { applicant_id:'t', track:'prn_team', team:'caregiver', since:'2026-10-21', axiscare_caregiver_id:null },
      { applicant_id:'o', track:'ongoing', team:'cna', since:'2026-09-01', axiscare_caregiver_id:'15' } ],
    apps: { g:{ first_name:'Grace', last_name:'Hill', prn:{ short_notice_ok:true, welcome:{ at:'2026-10-28T16:00:00Z', by:'Krystal', towns_times:'Springfield, weekday mornings', more_hours:'maybe', enjoys:'memory care', oncall:'one_weekend_month', office_interest:true } } },
      y:{ first_name:'Yara', last_name:'Moss', prn:{} }, t:{ first_name:'Tess', last_name:'Shaw', prn:{} }, o:{ first_name:'Olive', last_name:'Day' } } };
    prnLoad = async()=>PRN_T; prnDashLoad = async()=>{ document.getElementById('prnDash').innerHTML='<div class="card">PRN CNA Team recruiting: ALWAYS ON (stub)</div>'; };`);
  const WEEK={ ok:true, today:'2026-10-29', live:true, thanks_live:false, owner:'Krystal', more:0, familiar_note:null,
    members:[{applicant_id:'g',name:'Grace Hill',team:'cna',axiscare_id:'11',familiar:{why:null,clients:[{client:'Mary Smith',visits:3,last:'2026-10-01',glad:true,star:true}]}},
             {applicant_id:'y',name:'Yara Moss',team:'cna',axiscare_id:null,familiar:{why:'not linked to AxisCare yet',clients:[]}}],
    items:[{id:'welcome:g',kind:'welcome',applicant_id:'g',name:'Grace Hill',team:'PRN CNA Team',team_key:'cna',ref:'welcome',title:'Welcome call with Grace',detail:'New on the PRN CNA Team.'}],
    oncall:{ stipend:null, patterns:{every_weekend:'Every weekend'}, offers:[], weekends:[{saturday:'2026-10-31',sunday:'2026-11-01',confirmed:[],gap:true}] } };
  const realFetch=window.fetch;
  window.fetch=async(u,o)=>{ if(String(u).includes('/functions/v1/prn-week')) return new Response(JSON.stringify(WEEK),{status:200}); return realFetch(u,o); };
  sb.auth.getSession=async()=>({ data:{ session:{ access_token:'t' } } });
  const vis=id=>{ const el=document.getElementById(id); return !!(el && el.offsetParent!==null && getComputedStyle(el).display!=='none'); };
  location.hash='#prnteams'; await sleep(900); await PW.load(); await sleep(150);
  ok('from its link: the hiring tabs row is gone', !vis('fsub-interviews'));
  ok('...the Recruit heading is gone', !vis('rcHead'));
  ok('...Recruit\'s own menu is gone', ![...document.querySelectorAll('#tab-recruit .offnav:not(.prn-nav)')].some(x=>x.offsetParent));
  const nav=[...document.querySelectorAll('#tab-recruit .prn-nav .offnav-b')].filter(b=>b.offsetParent).map(b=>b.innerText.trim());
  ok('a PRN Teams heading and five tabs of its own', /PRN Teams/.test(document.querySelector('.prn-home-head h2').innerText) && JSON.stringify(nav)===JSON.stringify(['This week','Our teams','On call','Recruiting','What they see']), nav);
  ok('opens on This week: the welcome call, and nothing else', vis('prnWeek') && /Welcome call with Grace/.test(document.getElementById('prnWeek').innerText) && !vis('prnDash') && !vis('prnTeams') && !vis('prnOnCall') && !vis('prnSee') && !/Familiar clients/.test(document.getElementById('prnWeek').innerText));
  PW.tab('teams'); await sleep(80);
  const tt=document.getElementById('prnTeams').innerText;
  ok('Our teams: both teams, counts and goals', /PRN CNA Team\s*2 on the team · goal 20/.test(tt) && /PRN Caregiver Team\s*1 on the team · goal 10/.test(tt), tt.slice(0,300));
  ok('...Grace: In AxisCare, short notice OK, her welcome call answers, ★ Mary', /Grace Hill\s*In AxisCare/.test(tt) && /Short notice OK/.test(tt) && /Welcome call Oct 28 \(Krystal\): Springfield, weekday mornings · more hours maybe · enjoys memory care · on call one weekend a month · interested in office work someday/.test(tt) && /★ Mary Smith · glad to go back/.test(tt), tt);
  ok('...people still onboarding are listed too, plainly', /Yara Moss\s*Onboarding/.test(tt) && /not linked in AxisCare yet/.test(tt) && /Tess Shaw\s*Onboarding/.test(tt));
  ok('...someone moved to ongoing is not on a PRN Team', !/Olive/.test(tt));
  ok('...only This week is hidden now', !vis('prnWeek') && vis('prnTeams'));
  PW.tab('oncall'); await sleep(60);
  ok('On call: the weekend calendar, its gap', vis('prnOnCall') && /No PRN CNA on call/.test(document.getElementById('prnOnCall').innerText));
  PW.tab('recruiting'); await sleep(60);
  ok('Recruiting: the goal numbers live here now', vis('prnDash') && /ALWAYS ON/.test(document.getElementById('prnDash').innerText) && !vis('prnOnCall'));
  PW.tab('see'); await sleep(400);
  const fr=document.querySelector('#prnSee iframe');
  ok("What they see: the first member's real page (step 5a), with the approved sample one tap away", vis('prnSee') && fr && /prn\.html\?preview=g$/.test(fr.src) && !!document.querySelector('#prnSee a[href^="prn-team-page-sample.html"]'));
  /* someone who isn't an owner, while This week is off: told so plainly; Our teams still shows */
  WEEK.live=false; CC_ROLES=['care_coordinator']; CC_ROLE_BY_EMAIL['samantha@mo-care.com']=['care_coordinator']; PW.tab('week'); await PW.load(); await sleep(100);
  ok('not an owner, This week off: says it shows to owners only until it is turned on', /owners only until "This week" is turned on/.test(document.getElementById('prnWeek').innerText) && !/Welcome call with Grace/.test(document.getElementById('prnWeek').innerText));
  PW.tab('teams'); await sleep(60);
  ok('...Our teams still shows them the team', /Grace Hill/.test(document.getElementById('prnTeams').innerText));
  WEEK.live=true; CC_ROLES=['owner_admin']; CC_ROLE_BY_EMAIL['samantha@mo-care.com']=['owner_admin']; PW.tab('see');
  /* from inside Recruit: unchanged */
  location.hash='#recruit'; await sleep(500); rcView('prn'); await sleep(400);
  ok('from inside Recruit: the hiring tabs and Recruit heading are back', vis('fsub-interviews') && vis('rcHead'));
  ok('...and the PRN Teams view is the stacked one as before (no home tabs)', !document.querySelector('.prn-home-head').offsetParent && vis('prnWeek') && vis('prnDash') && /Familiar clients/.test(document.getElementById('prnWeek').innerText) && /On call/.test(document.getElementById('prnWeek').innerText));
  location.hash='#prnteams'; await sleep(600); await PW.load(); await sleep(100);
  ok('back to the link: the tab you were on stays', vis('prnSee') && document.getElementById('prnt-see').classList.contains('on'));
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1300, 'height': 1000})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co/rest' in r.request.url or 'supabase.co/auth' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(f'http://localhost:{PORT}/index.html?proof=prnhome'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', H)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    pg.screenshot(path=os.path.join(SHOTS, 'prn_home_see.png'))
    pg.evaluate("()=>PW.tab('teams')"); pg.wait_for_timeout(200); pg.screenshot(path=os.path.join(SHOTS, 'prn_home_teams.png'))
    pg.evaluate("()=>PW.tab('week')"); pg.wait_for_timeout(200); pg.screenshot(path=os.path.join(SHOTS, 'prn_home_week.png'))
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

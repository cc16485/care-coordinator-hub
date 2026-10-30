"""A PRN team spot on any offer (Samantha 2026-10-30, after an interview: someone who came in through a
different prescreener can be offered the PRN CNA Team). Offline, made-up data; every server call is answered here,
nothing is sent or saved. (PORT=<static server port> python3 tests/browser/prn_offer_look.py)"""
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
  (0,eval)(`AP_POS = [ { key:'caregiver', label:'Caregiver', active:true, pay_min:16, sort:1 }, { key:'cna', label:'CNA', active:true, pay_min:18, sort:2 },
      { key:'prn_cna', label:'PRN CNA Team', track:'prn', requires_cna:true, active:true, pay_min:20, sort:3 } ];
    AP_ROWS = [ { id:'00000000-0000-4000-8000-000000000001', first_name:'Alex', last_name:'Sample', phone:'5735550101', position:'cna', job_type:'Part time' },
      { id:'00000000-0000-4000-8000-000000000002', first_name:'Penny', last_name:'Prn', phone:'5735550102', position:'prn_cna', prn:{ days:['mon'] } } ];
    DATA.pay_rates = [ { id:'rates', rates:{ prn_cna:{min:20}, cna:{min:18}, prn_caregiver:{min:18}, caregiver:{min:16} } } ];
    if(typeof trainHubTok==='function') trainHubTok = async()=>'t';`);
  sb.auth.getSession=async()=>({ data:{ session:{ access_token:'t' } } });
  const sent=[]; const realFetch=window.fetch;
  window.fetch=async(u,o)=>{ const s=String(u);
    if(s.includes('/functions/v1/job-offer')){ sent.push(['offer', JSON.parse(o.body)]); return new Response(JSON.stringify({ id:'off1' }),{status:200}); }
    if(s.includes('/functions/v1/prn-team')){ const b=JSON.parse(o.body); sent.push(['prn', b]); return new Response(JSON.stringify({ outcome:'started', rate: b.team==='caregiver'?18:20, team:b.team }),{status:200}); }
    return realFetch(u,o); };
  const $=id=>document.getElementById(id), vis=id=>{ const el=$(id); return !!(el && el.offsetParent!==null); };

  apToOffer('00000000-0000-4000-8000-000000000001'); await sleep(700);
  ok('Alex (came in through the CNA prescreener): the PRN team choice is on her offer', vis('jo_prn_wrap'));
  ok('...it starts at Not on a PRN team, and her offer is the regular CNA one', $('jo_prn').value==='' && $('jo_position').value==='CNA' && $('jo_rate').value==='18.00' && $('jo_hours').value==='PART_TIME' && !/PRN/.test($('jo_notes').value), [$('jo_position').value,$('jo_rate').value,$('jo_hours').value,$('jo_notes').value]);
  $('jo_prn').value='cna'; joPrnPick();
  ok('picking PRN CNA Team: CNA, PRN hours, $20 from the pay rates card', $('jo_position').value==='CNA' && $('jo_hours').value==='PRN' && $('jo_rate').value==='20.00', [$('jo_position').value,$('jo_hours').value,$('jo_rate').value]);
  ok('...and the team and rate first in the notes, for AxisCare', /^PRN CNA Team, \$20\/hr\. Applied on mo-care\.com/.test($('jo_notes').value), $('jo_notes').value);
  $('jo_prn').value='caregiver'; joPrnPick();
  ok('switching to PRN Caregiver Team: Caregiver at $18, one PRN line in the notes', $('jo_position').value==='Caregiver' && $('jo_rate').value==='18.00' && /^PRN Caregiver Team, \$18\/hr\. Applied/.test($('jo_notes').value) && ($('jo_notes').value.match(/PRN/g)||[]).length===1, [$('jo_position').value,$('jo_rate').value,$('jo_notes').value]);
  $('jo_prn').value=''; joPrnPick();
  ok('Not on a PRN team takes the PRN line back off the notes', /^Applied on mo-care\.com/.test($('jo_notes').value), $('jo_notes').value);
  $('jo_prn').value='cna'; joPrnPick();
  await submitJobOffer(); await sleep(400);
  const prn=sent.find(x=>x[0]==='prn'), off=sent.find(x=>x[0]==='offer');
  ok('sending: the offer goes as CNA, PRN, $20', off && off[1].offer.position==='CNA' && off[1].offer.hours_type==='PRN' && off[1].offer.pay_rate===20, off);
  ok('...and her PRN CNA Team pay track starts with the team picked', prn && prn[1].action==='start' && prn[1].team==='cna' && prn[1].applicant_id==='00000000-0000-4000-8000-000000000001', prn);
  ok('...the done list says so', /On the PRN CNA Team pay track \(\$20\/hr\)/.test($('jo_steps').innerText), $('jo_steps').innerText);

  sent.length=0; apToOffer('00000000-0000-4000-8000-000000000002'); await sleep(700);
  ok('Penny (PRN prescreener): starts on PRN CNA Team, as before', $('jo_prn').value==='cna' && $('jo_position').value==='CNA' && $('jo_hours').value==='PRN' && $('jo_rate').value==='20.00' && /^PRN CNA Team, \$20\/hr\. /.test($('jo_notes').value), [$('jo_prn').value,$('jo_position').value,$('jo_hours').value,$('jo_rate').value,$('jo_notes').value]);
  $('jo_prn').value=''; joPrnPick();
  await submitJobOffer(); await sleep(400);
  ok('...and if the office picks Not on a PRN team, no PRN pay track starts', sent.some(x=>x[0]==='offer') && !sent.some(x=>x[0]==='prn'), sent);

  joReset();
  ok('an offer typed in without an applicant has no PRN team choice', !vis('jo_prn_wrap') && $('jo_prn').value==='');
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1300, 'height': 1000})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co/rest' in r.request.url or 'supabase.co/auth' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(f'http://localhost:{PORT}/index.html?proof=prnoffer'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', H)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    # sending reloads the applicants (offline: none), so the screenshot puts Alex's made-up row back first
    pg.evaluate("()=>{ (0,eval)(\"AP_ROWS=[{ id:'00000000-0000-4000-8000-000000000001', first_name:'Alex', last_name:'Sample', phone:'5735550101', position:'cna', job_type:'Part time' }]\"); apToOffer('00000000-0000-4000-8000-000000000001'); }"); pg.wait_for_timeout(1000)
    pg.evaluate("()=>{ document.getElementById('jo_prn').value='cna'; joPrnPick(); document.getElementById('jo_prn_wrap').scrollIntoView({block:'center'}); }"); pg.wait_for_timeout(200)
    pg.screenshot(path=os.path.join(SHOTS, 'prn_offer_pick.png'))
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

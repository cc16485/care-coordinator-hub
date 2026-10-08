"""Grievances as a client issue kind (528, 2026-10-08), in the real Hub page offline: picking Grievance shows no retaliation,
the DSDS option (portal or 866-835-3505), the written answer, and that abuse goes to the hotline; resolving one first asks
whether they got our written answer and were told about DSDS (Cancel = not resolved); the resolution records it.
(python3 tests/browser/grievance_look.py [port])"""
import os, sys
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, 'client_journey_look.py')).read()
ns = {'__file__': os.path.join(HERE, 'client_journey_look.py')}; exec(src[:src.rindex('with sync_playwright() as pw:')], ns)
STUB, DATA = ns['STUB'], ns['DATA']
PORT = sys.argv[1] if len(sys.argv) > 1 else '8765'
FAKE = r"""
(()=>{
  const W=window; W.__calls=[]; W.__confirmAns=false; W.confirm=(m)=>{ W.__confirmMsg=m; return W.__confirmAns; }; W.prompt=()=> 'Spoke with her daughter; schedule fixed; letter mailed Oct 9.'; W.alert=(m)=>{ W.__alert=m; };
  (0,eval)("ccPickFill=async()=>[]");
  CCIssue.cats=[{ code:'family_complaint', label:'Family complaint about a caregiver', default_domain:'field_quality', default_urgency:'high', target_hours:8, follow_up_required:true, requires_policy_lookup:false, resolution_means:'x', required_info:'y', owner_authority:false },
    { code:'grievance', label:'Grievance: the client or their representative complains about our services', default_domain:'client_care', default_urgency:'high', target_hours:24, follow_up_required:true, requires_policy_lookup:true,
      resolution_means:'We answered the client (or their legally responsible representative) in writing with what we found and what we did; they were told they can also file a grievance with DSDS (the online portal or 866-835-3505); and nothing about their care changed because they complained.',
      required_info:'who is complaining', owner_authority:false }];
  CCIssue.call=async(q,b)=>{ W.__calls.push(b); return { ok:true, follow_up_scheduled:'2026-10-23' }; };
  (0,eval)("loadOpsItems=async()=>{}; myWorkRefresh=()=>{}");
  DATA.ops_items=[{ id:'ops_issue_g1', kind:'client_issue', issue_id:'g1', issue_category:'grievance', status:'open', title:'Grievance: schedule keeps changing' }];
})();
"""
T = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  window.__as('angiel@mo-care.com','Angiel');
  await CCIssue.open({ category:'grievance', client_name:'Rhoda Real' }); await sleep(100);
  const help=document.getElementById('issCatHelp').innerText;
  ok('Grievance is one of the kinds to pick', [...document.getElementById('issCategory').options].some(o=>o.value==='grievance'));
  ok('...picking it says: no retaliation, the DSDS option (portal or 866-835-3505), a written answer, abuse goes to the hotline', /Nothing about their care may change because they complained/.test(help) && /866-835-3505/.test(help) && /answer them in writing/.test(help) && /1-800-392-0210/.test(help), help);
  ok('...and that policy governs it, with a follow-up check before it can be resolved', /Policy governs this/.test(help) && /follow-up check is required/.test(help));
  document.getElementById('issCategory').value='family_complaint'; CCIssue.catChanged();
  ok('...another kind doesn\'t show the grievance box', !/no retaliation/.test(document.getElementById('issCatHelp').innerText));
  CCIssue.close();
  window.__confirmAns=false; await ccIssueAct('ops_issue_g1','iss_resolve'); await sleep(60);
  ok('Resolving a grievance first asks: our written answer, and told about DSDS', /written answer/.test(window.__confirmMsg||'') && /866-835-3505/.test(window.__confirmMsg||''));
  ok('...Cancel (not yet): nothing is resolved', window.__calls.length===0);
  window.__confirmAns=true; await ccIssueAct('ops_issue_g1','iss_resolve'); await sleep(60);
  const c=window.__calls.pop();
  ok('...OK: resolved, and the record says the written answer was given and DSDS was explained', c && c.state==='resolved' && /letter mailed Oct 9/.test(c.resolution_note) && /\[Written answer given; told they can also file with DSDS\.\]/.test(c.resolution_note), c);
  return R; }"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []
    pg = b.new_page(viewport={'width': 1280, 'height': 1000})
    pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    pg.goto(f'http://localhost:{PORT}/index.html?proof=grievance'); pg.wait_for_timeout(1500)
    for s in (STUB, DATA, FAKE): pg.evaluate('s=>(0,eval)(s)', s)
    R = pg.evaluate(T)
    pg.evaluate("()=>CCIssue.open({ category:'grievance', client_name:'Rhoda Real' })"); pg.wait_for_timeout(300); pg.screenshot(path='/tmp/grievance_form.png')
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

"""The ranked, one-line Leads list (Samantha 2026-10-15: "make the leads list not so wide! Need to be able to see more at
once, and be able to know order of importance....how serious they sound, how many hours they want, put a dollar amount on
them when we can"; approved mockup Part 1). The real page, offline, made-up families (the lead workspace test's setup plus
four ranked families). Proves: one line per family with how ready, hours, $/month, next, due; most important first (a new
family nobody tried stays on top, then ready before deciding before looking, then dollars); the dollar math from the rate
card and the care level; GUIDE shows "GUIDE respite"; no hours shows "?"; a click opens the details under the line and the
name opens the profile; Due first keeps the three groups; rows are short enough to see far more at once.
(python3 tests/browser/ranked_board_look.py, static server on PORT, default 8765; SHOT=<png> writes a screenshot)"""
import os, re
from playwright.sync_api import sync_playwright
PORT = os.environ.get('PORT', '8765')
SRC = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'leads_workspace_look.py')).read()
STUB = re.search(r'STUB = r"""(.*?)"""', SRC, re.S).group(1)
MORE = r"""
(()=>{
  const base={ status:'Contacted', assigned_coordinator:'Krystal', created_at:'2026-10-03T14:00:00Z', first_human_attempt_at:'2026-10-03T15:00:00Z', first_human_contact_at:'2026-10-03T15:00:00Z', follow_up_due:'2026-10-09' };
  DATA.leads.push(
    Object.assign({}, base, { id:'r1', first_name:'Carol', last_name:'Price', client_first_name:'Ruth', client_last_name:'Price', client_city:'Nixa', funding_source:'private', number_of_hours:'21', needs:['personalCare'], phone:'4175550401' }),
    Object.assign({}, base, { id:'r2', first_name:'Dan', last_name:'Whit', client_first_name:'Betty', client_last_name:'Whit', funding_source:'private', schedule:{ hours_per_week:30 }, medical_conditions:['dementia'], phone:'4175550402' }),
    Object.assign({}, base, { id:'r3', first_name:'Lisa', last_name:'Ortiz', client_first_name:'Gene', client_last_name:'Ortiz', funding_source:'private', phone:'4175550403' }),
    Object.assign({}, base, { id:'r4', first_name:'Joan', last_name:'Hale', client_first_name:'Robert', client_last_name:'Hale', funding_source:'guide', number_of_hours:'8', phone:'4175550404' }),
    Object.assign({}, base, { id:'r5', first_name:'Mark', last_name:'Teller', client_first_name:'Ann', client_last_name:'Teller', funding_source:'va', care_plan_draft:{ fields:{ recommended_hours_per_week:'16', adl_needs:'Shower help' } }, phone:'4175550405' }));
  DATA.client_rates=[{ id:'rates', levels:{ l1:{ rate:'$30' }, l2:{ rate:'$32' }, l3:{ rate:'$34' } } }];
  window.__rd=[{ lead_id:'r1', level:'ready', why:'"Mom comes home from Cox Friday"', hours_heard:null, source:'call' }, { lead_id:'r2', level:'ready', why:'"Need someone by Monday"', source:'call' },
    { lead_id:'r3', level:'looking', why:'"Just getting prices"', source:'call' }, { lead_id:'r4', level:'deciding', why:'Comparing', source:'call' }, { lead_id:'r5', level:'deciding', why:'"VA is supposed to call me back"', hours_heard:20, source:'call' }];
  sb.from=(t)=>{ const p={ select(){return p;}, eq(){return p;}, in(){return p;}, gte(){return p;}, order(){return p;}, limit(){return p;},
      then(a){ return Promise.resolve({ data: t==='lead_readiness' ? JSON.parse(JSON.stringify(window.__rd)) : [], error:null }).then(a); } }; return p; };
  try{ localStorage.removeItem('lbSort'); }catch(e){}
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,900)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  (0,eval)("renderLeadsStarts=window.__realRLS||renderLeadsStarts"); switchTab('leadsstarts'); await sleep(300);
  const draw=async()=>{ try{ LeadsBoard.render(lsRows(), {}); }catch(e){} await sleep(200); try{ LeadsBoard.render(lsRows(), {}); }catch(e){} await sleep(150); };
  await draw();
  const B=()=>document.getElementById('lbBoard'), rows=()=>[...B().querySelectorAll('[data-lbc]')], rowOf=id=>B().querySelector('[data-lbc="'+id+'"]');
  ok('Most important is the default: one list, a header with How ready, Hours/wk, $/month, Next, Due', /Most important first/i.test(B().innerText) && /How ready[\s\S]*Hours\/wk[\s\S]*\$\/month[\s\S]*Next[\s\S]*Due/i.test(B().querySelector('.lbc-head').innerText));
  const ids=rows().map(r=>r.dataset.lbc), pos=id=>ids.indexOf(id);
  ok('ready families come before deciding, deciding before just looking', pos('r2')<pos('r4') && pos('r1')<pos('r5') && pos('r4')<pos('r3') && pos('r5')<pos('r3'), ids);
  ok('...and between two ready families, the one worth more comes first ($4,420 Betty before $2,910 Ruth)', pos('r2')<pos('r1'), ids);
  const pinned=ids.filter(id=>{ const x=lsRows().find(r=>r.l&&r.l.id===id); return x && ['new_overdue','new_running','replied'].includes(LeadRules.boardRow(x.l, Object.assign(LeadsBoard.ctxFor(x.l,x.st),{now:new Date().toISOString(),today:LeadRules.ymd(new Date())})).reason); });
  ok('a new family nobody has tried (or one waiting on our answer) stays above every ranked family', pinned.every(id=>pos(id)<pos('r2')), [pinned, ids]);
  const t=id=>rowOf(id).innerText.replace(/\s+/g,' ');
  ok('Ruth: Ready now, 21 hours, Personal Care rate: 21 × $32 × 4.33 = $2,910', /Ready now/.test(t('r1')) && /\b21\b/.test(t('r1')) && /\$2,910/.test(t('r1')), t('r1'));
  ok('Betty: dementia is the Advanced Care rate: 30 × $34 × 4.33 = $4,420 (hours from the inquiry form)', /\$4,420/.test(t('r2')), t('r2'));
  ok('Ann (VA): hours from the care plan draft before what they said: 16 × $32 (shower help) = $2,220', /\b16\b/.test(t('r5')) && /\$2,220/.test(t('r5')), t('r5'));
  ok('Gene: no hours anywhere shows ? and no dollar amount', (rowOf('r3').querySelectorAll('.lbc-unk').length===2) && /Just looking/.test(t('r3')), t('r3'));
  ok('Robert (GUIDE): "GUIDE respite" instead of a guess', /GUIDE respite/.test(t('r4')), t('r4'));
  const sum=[...B().querySelectorAll('[data-lbc] .lbc-usd')].reduce((t,e)=>t+Number(e.textContent.replace(/[^\d]/g,'')),0);
  ok('the total at the top adds the dollar amounts shown', sum>=11550 && B().querySelector('.lbc-bar').innerText.indexOf('$'+sum.toLocaleString('en-US')+' a month')>=0, [sum, B().querySelector('.lbc-bar').innerText]);
  /* one line each */
  const h=rowOf('r1').getBoundingClientRect().height;
  ok('each family is one short line (under 60px; the old rows were 110+)', h<60, h);
  ok('the list is not so wide (at most 1180px)', B().getBoundingClientRect().width<=1180, B().getBoundingClientRect().width);
  ok('details are tucked away until asked', B().querySelector('.lbc-det:not([hidden])')===null);
  /* click a line: details; click the name: the profile */
  rowOf('r1').querySelector('.lbc-next').click(); await sleep(250);
  const det=rowOf('r1').nextElementSibling;
  ok('clicking a line opens its details: why that read, how we figured $, the other actions', det && !det.hidden && /"Mom comes home from Cox Friday"[\s\S]*from their calls and texts/.test(det.innerText) && /21 h a week \(from the Hours box\) × \$32 Personal Care × 4.33 weeks, about/.test(det.innerText) && /Open profile/.test(det.innerText), det && det.innerText);
  rowOf('r1').querySelector('.lbc-next').click(); await sleep(250);
  ok('...and clicking again closes them', rowOf('r1').nextElementSibling.hidden);
  ok('the name opens their profile (it carries the profile link)', rowOf('r1').querySelector('.lbc-name[data-open-lead="r1"]'));
  /* Due first */
  lbSort('due'); await draw();
  ok('Due first keeps the three groups (Need you now, Scheduled, Waiting), same one-line rows', /NEED YOU NOW|Need you now/.test(B().innerText) && /Scheduled/i.test(B().innerText) && B().querySelectorAll('.lbc-head').length>=1 && rows().length===ids.length, B().innerText.slice(0,300));
  lbSort('imp'); await draw();
  ok('Most important comes back', /Most important first/i.test(B().innerText));
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1360, 'height': 1000})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(f'http://localhost:{PORT}/index.html?proof=ranked'); pg.wait_for_timeout(1200)
    pg.evaluate("()=>{ window.__realRLS = window.renderLeadsStarts; }")
    pg.evaluate('s=>(0,eval)(s)', STUB); pg.evaluate('s=>(0,eval)(s)', MORE)
    R = pg.evaluate(T)
    if os.environ.get('SHOT'):
        pg.evaluate("async()=>{ lbToggle('r2'); await new Promise(r=>setTimeout(r,300)); }")
        pg.locator('#lbBoard').screenshot(path=os.environ['SHOT'])
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

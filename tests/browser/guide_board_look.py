"""The Medicare GUIDE intake on the lead and the tidier Leads board (Samantha 2026-10-15, "lets do 2 and 3"). The real page,
offline, made-up families (the lead workspace test's setup, plus a Medicaid family, a GUIDE family and an old AI draft).
Proves: a Medicaid family gets ONE row (not accepted) with Change payer and Lost: sent to CDS; no Draft ready row; no
assessment-overdue or deciding nudge rows; State submissions shows only while a Medicaid family is open; a GUIDE lead shows
the intake panel (what to copy, the questions, a facility flagged) and opens Crosby inside the Hub on a click.
(python3 tests/browser/guide_board_look.py, static server on PORT, default 8765; writes /tmp guide_panel.png when SHOT is set)"""
import os, re
from playwright.sync_api import sync_playwright
PORT = os.environ.get('PORT', '8765')
SRC = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'leads_workspace_look.py')).read()
STUB = re.search(r'STUB = r"""(.*?)"""', SRC, re.S).group(1)
MORE = r"""
(()=>{
  DATA.leads.push(
    { id:'med', first_name:'Mona', last_name:'Dale', client_first_name:'Earl', client_last_name:'Dale', funding_source:'medicaid', state_status:'submitted', state_submitted:'2026-09-01', status:'Contacted', phone:'4175550201',
      first_human_contact_at:'2026-09-01T15:00:00Z', first_human_attempt_at:'2026-09-01T15:00:00Z', created_at:'2026-09-01T14:00:00Z', assigned_coordinator:'Krystal' },
    { id:'gd', first_name:'Joan', last_name:'Hale', relationship:'Wife', client_first_name:'Robert', client_last_name:'Hale', client_dob:'1946-04-02', client_city:'Republic', client_state:'MO', funding_source:'guide',
      medical_conditions:['dementia'], status:'Contacted', phone:'4175550177', first_human_contact_at:'2026-10-05T15:00:00Z', first_human_attempt_at:'2026-10-05T15:00:00Z', created_at:'2026-10-05T14:00:00Z',
      assigned_coordinator:'Krystal', follow_up_due:'2026-10-09', call_profile:{ facts:{ living_situation:'facility', facility_name:'Elfdale assisted living, Apex' }, people:[] } },
    { id:'drf', first_name:'Dee', last_name:'Draft', client_first_name:'Dot', client_last_name:'Draft', funding_source:'private', status:'Contacted', phone:'4175550202', first_human_contact_at:'2026-10-02T15:00:00Z',
      first_human_attempt_at:'2026-10-02T15:00:00Z', created_at:'2026-10-02T14:00:00Z', assigned_coordinator:'Krystal' });
  DATA.post_call_followups=[{ id:'pd9', lead_id:'drf', status:'pending_approval', ai_generated:true }];
  window.confirm=()=>true;
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,900)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  const row=id=>LeadRules.boardRow(DATA.leads.find(l=>l.id===id), Object.assign(LeadsBoard.ctxFor(DATA.leads.find(l=>l.id===id), {}), { now:new Date().toISOString(), today:LeadRules.ymd(new Date()) }));
  const m=row('med');
  ok('board: a Medicaid family gets ONE row: "Medicaid: not accepted", tell them CDS may fit, Change payer, Lost: sent to CDS', m.reason==='medicaid_closed' && /Medicaid: not accepted/.test(m.when.big) && /CDS may fit/.test(m.next.text)
     && m.primary.kind==='payer' && m.secondary.some(a=>a.kind==='lost_cds'), m);
  ok('...never the state\'s rows (DSDS, authorized, case manager, waiting on the state)', !/dsds|authorized|medicaid_45|waiting_state/.test(m.reason));
  const d=row('drf');
  ok('board: an old AI draft no longer makes a "Draft ready" row', d.reason!=='draft_ready' && !/Draft ready/.test(d.when.big), d.reason);
  ok('board: no "assessment overdue" or "deciding 7+ days" nudge rows', !['asmt_overdue','decision_stale'].includes(d.reason) && !['asmt_overdue','decision_stale'].includes(row('gd').reason), [d.reason, row('gd').reason]);
  ok('...without the board\'s settings the rules still say what they always did (nothing else changed)', LeadRules.boardRow(DATA.leads.find(l=>l.id==='drf'), Object.assign({}, LeadsBoard.ctxFor(DATA.leads.find(l=>l.id==='drf'), {}), { no_drafts:false })).reason==='draft_ready');
  /* the board on screen */
  (0,eval)("renderLeadsStarts=window.__realRLS||renderLeadsStarts"); switchTab('leadsstarts'); await sleep(400); try{ window.__realRLS ? window.__realRLS() : renderLeadsStarts(); }catch(e){}
  if(typeof LeadsBoard!=='undefined'){ const rows=lsRows ? lsRows() : []; LeadsBoard.render(rows, {}); } await sleep(150);
  const B=()=>document.getElementById('lbBoard').innerText, LK=()=>document.getElementById('lbLookup').innerText;
  ok('board screen: Mona\'s row says Medicaid: not accepted with Change payer', /Medicaid: not accepted[\s\S]*Change payer/.test(B()), B().slice(0,600));
  ok('...State submissions shows while a Medicaid family is open', /State submissions/.test(LK()), LK());
  const lostBtn=[...document.querySelectorAll('#lbBoard button')].find(b=>/Lost: sent to CDS/.test(b.textContent)); lostBtn.click(); await sleep(200);
  const mo=DATA.leads.find(l=>l.id==='med');
  ok('Lost: sent to CDS closes it as Lost, reason "Referred to Caring CDS"', mo.status==='Lost' && mo.lost_reason_key==='referred_cds', [mo.status, mo.lost_reason_key]);
  LeadsBoard.render(lsRows(), {}); await sleep(100);
  ok('...and with no Medicaid family open, State submissions is gone', !/State submissions/.test(LK()), LK());
  /* the GUIDE intake on the lead */
  await openClient({ lead_id:'gd' }, 'summary'); await sleep(400);
  const G=()=>document.getElementById('lwGuide');
  ok('a GUIDE lead shows the Medicare GUIDE intake under the next step', !!G() && /Medicare GUIDE intake/.test(G().innerText));
  ok('...what to copy into Crosby: patient, birth date, caregiver (wife), phone, home', /Patient\s*Robert Hale/.test(G().innerText) && /1946-04-02/.test(G().innerText) && /Joan Hale \(Wife\)/.test(G().innerText) && /4175550177/.test(G().innerText) && /Elfdale/.test(G().innerText), G().innerText.slice(0,500));
  ok('...the questions, with what the lead already says: dementia ✓, unpaid caregiver ✓, the rest to ask', G().querySelectorAll('.lw-gd-ok').length===2 && G().querySelectorAll('.lw-gd-ask').length===3);
  ok('...a facility is flagged red: assisted living is not eligible', G().querySelectorAll('.lw-gd-no').length===1 && /not eligible \(June 2026\)/.test(G().querySelector('.lw-gd-no').innerText));
  ok('...Crosby in its own tab is a link that opens a new tab', !!G().querySelector('a[href="https://app.crosbyhealth.com/login"][target="_blank"]'));
  ok('...Crosby does not load until asked', !G().querySelector('iframe'));
  [...G().querySelectorAll('button')].find(b=>/Open Crosby here/.test(b.textContent)).click(); await sleep(100);
  ok('Open Crosby here opens Crosby inside the Hub, and the button says Close Crosby', G().querySelector('iframe[src="https://app.crosbyhealth.com/login"]') && [...G().querySelectorAll('button')].some(b=>/Close Crosby/.test(b.textContent)));
  await openClient({ lead_id:'dia' }, 'summary'); await sleep(300);
  ok('a private-pay lead has no GUIDE panel', !document.getElementById('lwGuide'));
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1360, 'height': 1000})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url or 'crosbyhealth.com' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(f'http://localhost:{PORT}/index.html?proof=guideboard'); pg.wait_for_timeout(1200)
    pg.evaluate("()=>{ window.__realRLS = window.renderLeadsStarts; }")
    pg.evaluate('s=>(0,eval)(s)', STUB); pg.evaluate('s=>(0,eval)(s)', MORE)
    R = pg.evaluate(T)
    if os.environ.get('SHOT'):
        pg.evaluate("async()=>{ await openClient({ lead_id:'gd' }, 'summary'); await new Promise(r=>setTimeout(r,400)); document.getElementById('lwGuide').scrollIntoView(); }")
        pg.wait_for_timeout(300); pg.locator('#lwGuide').screenshot(path=os.environ['SHOT'])
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

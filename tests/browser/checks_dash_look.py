"""Checks dashboard (2026-10-21): the real page and styles, offline, FAKE people only. The engine's own dashboard code
(cut out of caregivers-engine.js) draws People & Checks and one person's checklist. Saves two screenshots and checks
what the coordinator sees. Nothing reaches production; nothing is sent."""
import os, json
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..', '..')
PORT = os.environ.get('PORT', '8793'); OUT = os.environ.get('OUT', '/tmp')
ENG = open(os.path.join(ROOT, 'caregivers-engine.js')).read()
RULES = open(os.path.join(ROOT, 'eligibility-rules.js')).read()
def cut(a, b):
    i = ENG.index(a); j = ENG.index(b, i + 1); return ENG[i:j]
day = lambda n: __import__('datetime').date.fromordinal(__import__('datetime').date.today().toordinal() - n).isoformat()
CODE = RULES + """
const refPolicy = c => CCElig.refPolicy(c), obDeriveStatus = c => CCElig.obDeriveStatus(c), refDecisionCovers = c => CCElig.refDecisionCovers(c);
const bgrEsc = t => String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const fmtD = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '';
const bgrD = d => d ? new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '';
const ocAttrs = (dial) => ' href="tel:' + dial + '"';
const bgrCheckProofHtml = p => p ? '<a class="proof-link">PDF</a>' : '';
let HYDRATED = true, OFFERS = [], _bgrDrawerKey = null;
let candidates = __CANDS__;
var caregivers = [{ id: 501, offer_id:'o8', first:'Leah', last:'Grant' }];
async function saveCandidates(){ return true; } async function ccConfirm(){ return false; } async function saveCaregivers(){ return true; }
window.DATA = window.DATA || {}; DATA.pay_rates = [{ id:'rates', rates:{ prn_caregiver:{ min:18, max:18 }, prn_cna:{ min:20, max:20 } } }];
function bgrEnsureDrawer(){ if(document.getElementById('bgrDrawer')) return;
  const bd=document.createElement('div'); bd.id='bgrDrawerBackdrop'; bd.style.cssText='display:none;position:fixed;inset:0;background:rgba(15,54,95,.28);z-index:9998';
  const dr=document.createElement('div'); dr.id='bgrDrawer'; dr.style.cssText='position:fixed;top:0;right:0;bottom:0;width:470px;background:#fff;z-index:9999;overflow-y:auto';
  document.body.appendChild(bd); document.body.appendChild(dr); }
function bgrCloseDrawer(){}
function lifecycleRows(){ return []; }
function bgrReqsFor(c){ return c.id === 1 ? [{ slot:1, sent_at:new Date(Date.now() - 2*864e5).toISOString() }] : c.id === 3 ? [{ slot:9, sent_at:new Date(Date.now() - 7*864e5).toISOString() }] : []; }
async function offerToCandidate(){ return { ok:true }; }
async function bgrSyncRefAnswers(){ return { merged:0, cleared:0, err:'' }; }
function renderOB(){ renderCkd(); } function renderAlerts(){}
""" + cut('function obRefType(v){', 'function obRefTypeLabel(') + cut('function obRefCellTypeLine(c,n){', '/* &t= and &co=') \
  + cut('function obSendDay(iso){', 'function obRefSendRecordLines(') + cut('function obFmtPhone(ph){', 'function obRefCellHTML(') \
  + cut('/* ── CHECKS DASHBOARD (2026-10-21)', 'function renderOB(){')
P = lambda **k: k
CANDS = [
  P(id=1, first='Claire', last='Sample', added=day(13), offer_id='of1', position='Caregiver', r1n='Susie Boss', r1_type='professional', r1_company='Lakeview Childcare', r1_phone='4175550101', r1s='Pending',
    r2n='Pat Friend', r2_type='personal', r2s='Positive', oig='Pending', edl='Pending', fcsr='Pending', casenet='Pending', oos='yes', fp='Required'),
  P(id=2, first='Kristin', last='Sample', added=day(12), oig='Pending', edl='Pending', fcsr='Pending', casenet='Pending'),
  P(id=3, first='Holly', last='Sample', added=day(12), oig='CLEAR', oig_date=day(10), edl='Pending', fcsr='Pending', casenet='Pending'),
  P(id=4, first='Denise', last='Sample', added=day(2), r1n='A Boss', r1_type='professional', r1s='Positive', r2n='B Pal', r2s='Positive', oig='CLEAR', edl='Clear', fcsr='Pending', fcsr_date=day(1), casenet='Pending'),
  P(id=5, first='Ready', last='Person', added=day(4), r1n='A Boss', r1_type='professional', r1s='Positive', r2n='B Pal', r2s='Positive', oig='CLEAR', edl='Clear', fcsr='Clear', casenet='Clear', oos='yes', fp='Required', resolvedAt=day(0) + 'T15:00:00Z'),
  P(id=6, first='Flagged', last='Person', added=day(6), oig='FLAGGED', edl='Pending', fcsr='Pending', casenet='Pending'),
  P(id=7, first='Test', last='Signer', added=day(14), oig='Pending', edl='Pending', fcsr='Pending', casenet='Pending'),
  P(id=8, first='Pat', last='Practice', added=day(14), oig='Pending', edl='Pending', fcsr='Pending', casenet='Pending'),
  P(id=9, first='Gone', last='Person', added=day(20), not_hired=True),
  P(id=10, first='Quiet', last='Person', added=day(1), position='Caregiver', r1n='A Boss', r1_type='professional', r1s='Positive', r2n='B Pal', r2s='Positive', oig='CLEAR', edl='Clear', fcsr='Clear', casenet='Clear', step2_sent_at=day(12) + 'T15:00:00Z'),
]
T = r"""
async(CODE)=>{
  const sc=document.createElement('script'); sc.textContent=CODE; document.head.appendChild(sc);
  await new Promise(r=>setTimeout(r,50));
  document.querySelectorAll('.tabpanel').forEach(t=>t.style.display='none');
  const panel=document.getElementById('panel-onboarding'); panel.classList.add('mode-people');
  for(let el=panel; el; el=el.parentElement){ el.style.display = el.classList && el.classList.contains('tabpanel') ? 'block' : (getComputedStyle(el).display==='none' ? 'block' : el.style.display); }
  window.CRX = { list: () => [{ offer_id:'o9', name:'Rosa Diaz', ready_for_final:true }, { offer_id:'o8', name:'Leah Grant', next:{ key:'cg.profile.published', title:'Caregiver profile published', owner:'Staffing Coordinator' } }, { offer_id:'o7', name:'Done Person', approved_to_work:true, axiscare:'ok' }, { offer_id:'o10', name:'Stepone Person', checkin_open:true, next:{ key:'cg.step1.application', title:'Step 1: application', owner:'Applicant' } }], open(){}, chip(){ return ''; }, call: async (b) => b.action === 'level_get' ? { claimed:{ level:2, said:{ experience:'3 years', level2:'Yes' } }, evidence:[], verified_level:1, approved:{ level:1, default:true }, may_approve:false } : {} };
  CKD_OIG.rows = [{ candidate_id: 2, practice:false, evidence:{ match_count: 0 } }]; CKD_OIG.at = Date.now();
  renderCkd();
  const party = document.getElementById('ckdParty'); const partyText = party ? party.innerText.replace(/\s+/g,' ') : ''; if(party) party.querySelector('#ckdPartyX').click(); renderCkd();
  const dash=document.getElementById('ckdDash');
  const rows=[...dash.querySelectorAll('.ckd-row:not(.ckd-row-h)')].map(r=>r.innerText.replace(/\s+/g,' ').trim());
  const tiles=[...dash.querySelectorAll('.ckd-tile')].map(t=>t.innerText.replace(/\s+/g,' ').trim());
  const oldHidden=[...panel.querySelectorAll('.ckd-old')].every(e=>getComputedStyle(e).display==='none');
  dash.scrollIntoView();
  return { rows, tiles, oldHidden, partyText, start: (dash.querySelector('.ckd-start')||{}).innerText || '', againParty: !!document.getElementById('ckdParty'), more: dash.querySelector('.ckd-more').innerText.replace(/\s+/g,' '), html: dash.innerHTML };
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1440, 'height': 1000})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(f'http://localhost:{PORT}/index.html?proof=ckd'); pg.wait_for_timeout(1500)
    R = pg.evaluate(T, CODE.replace('__CANDS__', json.dumps(CANDS)))
    box = pg.locator('#ckdDash').bounding_box()
    pg.screenshot(path=os.path.join(OUT, 'checks_dash.png'), clip={'x': box['x'] - 8, 'y': max(0, box['y'] - 8), 'width': box['width'] + 16, 'height': min(1000, box['height'] + 16)})
    pg.evaluate("()=>{ try{ localStorage.clear(); }catch(e){} renderCkd(); }"); pg.wait_for_timeout(900)
    party_back = pg.locator('#ckdParty').count()
    if party_back: pg.screenshot(path=os.path.join(OUT, 'checks_party.png'), clip={'x': 470, 'y': 150, 'width': 500, 'height': 600})
    pg.evaluate("()=>{ const p=document.getElementById('ckdParty'); if(p) p.remove(); }")
    pg.evaluate("()=>{ ckdOpen(1); }"); pg.wait_for_timeout(400)
    pg.wait_for_timeout(300)
    person = pg.locator('#bgrDrawer').inner_text()
    duty_boxes = pg.evaluate("()=>{ const d=document.createElement('div'); d.innerHTML=mrefDutiesHTML(['bathing']); return [d.querySelectorAll('.mref-duty').length, d.querySelectorAll('.mref-duty:checked').length]; }")
    pg.screenshot(path=os.path.join(OUT, 'checks_person.png'), clip={'x': 1440 - 470, 'y': 0, 'width': 470, 'height': 1000})
    reff = pg.evaluate("async ()=>{ ckdOpen(2); ckdRefForm(2); const m=document.getElementById('ckdRefForm'); const z=[+getComputedStyle(m).zIndex, +getComputedStyle(document.getElementById('bgrDrawer')).zIndex]; m.querySelector('#rfName').value='Ann Boss'; m.querySelector('#rfPhone').value='4175550199'; m.querySelector('#rfCo').value='Brookdale'; m.querySelector('#rfGo').click(); await new Promise(r=>setTimeout(r,200)); const c=candidates.find(x=>x.id===2); const panel=document.getElementById('bgrDrawer').innerText; return { z, saved:[c.r1n,c.r1_phone,c.r1_type,c.r1_company,c.r1s], closed:!document.getElementById('ckdRefForm'), big: document.getElementById('ob-modal') && document.getElementById('ob-modal').classList.contains('open'), panelHas: panel.includes('Ann Boss') }; }")
    pg.evaluate("()=>{ bgrCloseDrawer(); }")
    leave = pg.evaluate("async ()=>{ ckdLeaveOpen(10); const m=document.getElementById('ckdLeave'); const t=m.innerText.replace(/\\s+/g,' '); m.querySelector('input[value=other_job]').click(); m.querySelector('#lvGo').click(); await new Promise(r=>setTimeout(r,300)); const c=candidates.find(x=>x.id===10); return { t, gone: !!c.not_hired, why: c.not_hired_reason, open: !!document.getElementById('ckdLeave'), listed: [...document.querySelectorAll('#ckdDash .ckd-row:not(.ckd-row-h)')].some(r=>r.innerText.startsWith('Quiet Person')) }; }")
    pg.evaluate("()=>{ bgrCloseDrawer(); ckdFilter('s2'); }"); s2_rows = pg.locator('#ckdDash .ckd-row:not(.ckd-row-h)').all_inner_texts()
    pg.evaluate("()=>{ ckdFilter('s1'); }"); refs_rows = pg.locator('#ckdDash .ckd-row:not(.ckd-row-h)').count()
    pg.evaluate("()=>{ ckdFilter('all'); ckdToggleTest(); }"); with_tests = pg.locator('#ckdDash .ckd-row:not(.ckd-row-h)').count()
    tabs = pg.evaluate("()=>[getComputedStyle(document.querySelector('.bgr-subnav')).display, document.querySelectorAll('#bgr-tab-audit, #bgr-tab-refs, #bgr-tab-howitworks').length]")
    b.close()
ok = fail = 0
def ck(name, cond, extra=''):
    global ok, fail
    ok, fail = (ok + 1, fail) if cond else (ok, fail + 1)
    print(('PASS  ' if cond else 'FAIL  ') + name + ('' if cond else '  ' + str(extra)[:600]))
rows = R['rows']
ck('no page errors', not errs, errs)
ck('the old table, toolbar and strips are hidden', R['oldHidden'])
ck('seven stop tiles: everyone 6, checks and references 5, send Step 2 1', len(R['tiles']) == 7 and R['tiles'][5].startswith('1 Orientation') and R['tiles'][6].startswith('1 Approved, then check-in call') and R['tiles'][0].startswith('10 Everyone') and R['tiles'][1].startswith('5 Checks and references') and R['tiles'][2].startswith('1 Send Step 2'), R['tiles'])
ck('test people and not-hired people are left out; the cleared one is on the list at Send Step 2', len(rows) == 10 and not any('Test' in r or 'Practice' in r or 'Gone' in r for r in rows) and any(r.startswith('Ready Person') and 'Send Step 2' in r and 'Checks and references done' in r and r.endswith('I sent Step 2') for r in rows), rows)
ck('after the video call: Leah at orientation with her next step, Rosa waiting on Samantha or Zachary, approved people gone', any(r.startswith('Leah Grant') and 'Orientation, video call, profile, badge' in r and 'Caregiver profile published.' in r for r in rows) and any(r.startswith('Rosa Diaz') and 'Approved, then check-in call' in r and 'Waiting on Samantha or Zachary' in r for r in rows) and not any('Done Person' in r for r in rows), rows)
ck('2026-10-30: a card still on Step 1 with no caregiver list record sits at Step 1, never at check-in, even if the server says check-in open', any(r.startswith('Stepone Person') and 'Not on the caregiver list yet' in r and 'Step 1 is not finished. Waiting on Stepone (next: Step 1: application).' in r and 'Check-in call' not in r and 'Approved, then check-in call' not in r for r in rows), rows)
ck('oldest first', rows[0].startswith('Claire Sample') and any(r.startswith('Denise Sample') for r in rows[-5:]), rows)
ck('references and checks side by side: the Hub already sent Susie the form, and the checks lane says Run OIG', 'References: Form sent to Susie Boss' in rows[0] and 'Call if you like' in rows[0] and '(417) 555-0101' in rows[0] and 'Record answer' in rows[0] and 'Checks: Run the OIG check' in rows[0] and rows[0].endswith('Run OIG'), rows[0])
ck('no references given: ask for them, and run OIG at the same time', any(r.startswith('Kristin') and 'References: No references given yet' in r and 'Add a reference' in r and r.endswith('Record OIG') for r in rows), rows)
ck('Holly: ask for references and record EDL, both at once', any(r.startswith('Holly') and 'Add a reference' in r and r.endswith('Record EDL') for r in rows), rows)
ck('Denise: references done in green words, FCSR ordered', any(r.startswith('Denise') and 'References: Done: 2 good, 1 from work.' in r and 'FCSR ordered' in r and r.endswith('Record FCSR') for r in rows), rows)
ck('a flagged check says review', any(r.startswith('Flagged') and r.endswith('Review') for r in rows), rows)
ck('no fingerprint anywhere: not on the dashboard, not in the checklist', 'ingerprint' not in R['html'] and 'ingerprint' not in person)
ck('the party: the cleared person gets the ribbon and confetti once', 'Ready is cleared!' in R['partyText'] and 'Nothing is sent' in R['partyText'] and not R['againParty'], R['partyText'])
ck('Start here is the oldest thing only you can do', 'start here' in R['start'].lower() and 'Claire Sample: Run the OIG check' in R['start'] and 'How do I do this?' in R['start'], R['start'])
ck('progress pills: References 1 of 2, OIG, EDL, FCSR, Case.net', 'References 1 of 2 OIG EDL FCSR Case.net' in rows[0], rows[0])
ck('Only People shows, no Pre-Hire Audit / Reference Activity / How It Works tabs', tabs == ['none', 0], tabs)
ck('More has the rare jobs, test people and the full table', all(x not in R['more'] for x in ['Pre-Hire Audit', 'Reference activity']) and all(x in R['more'] for x in ['Taken off the list (1)', 'Show test people (2)', 'Full table', 'Sync reference answers now']), R['more'])
ck('the checklist opens on Your next action with How do I do this', 'your next action' in person.lower() and 'How do I do this?' in person and 'Stop 2 of 7' in person, person)
ck('the checklist: name, 1 of 5 done, both references, four checks', 'Claire Sample' in person and '0 of 5 done' in person and 'Susie Boss' in person and 'Pat Friend' in person and all(x in person for x in ['OIG', 'EDL', 'FCSR', 'Case.net']) and 'Call (417) 555-0101' in person, person)
ck('stop tiles filter the list; Show test people adds them back', refs_rows == 5 and len(s2_rows) == 1 and with_tests == 11, (refs_rows, s2_rows, with_tests))
ck('the party only comes back if this browser forgets it saw it', party_back == 1, party_back)
ck('Level of Care card: Claimed 2, Verified 1, Approved 1 to start, what is missing, hiring not held up', all(x in person for x in ['Claimed: Level 2', 'Verified: Level 1', 'Approved: Level 1 (to start)', 'Level 2 is waiting on one person', 'Never holds up hiring', 'Record a license lookup']), person[-900:])
ck('the reference form has 19 duty boxes and keeps what was ticked', duty_boxes == [19, 1], duty_boxes)
ck('the OIG search the Hub ran by itself shows on the checks line, a person still records it', any(r.startswith('Kristin') and 'The Hub searched the OIG list: no matches. Record it as Clear.' in r and 'Record OIG' in r for r in rows), rows)
ck('the badge is its own line at the orientation stop, closed by Mailed', any(r.startswith('Leah Grant') and 'Badge: Make their employee badge and mail it.' in r and r.endswith('Mailed') for r in rows), rows)
ck('gone quiet: 12 days since Step 2 went, the row says call them, maybe PRN, or take them off', any(r.startswith('Quiet Person') and 'No word: Nothing from Quiet in 12 days. Call them: maybe PRN fits better, or take them off the list.' in r and 'What now?' in r for r in rows), rows)
ck('take off the list: PRN offered first with the rate from the pay rates card, four reasons', all(x.lower() in leave['t'].lower() for x in ['would PRN work better?', 'a PRN Caregiver spot ($18.00 /hr)', 'Stopped answering', 'Took another job', 'Changed their mind', 'We decided not to hire', 'background review']), leave['t'])
ck('taking them off marks them with the reason and they leave the list', leave['gone'] and leave['why'] == 'other_job' and not leave['open'] and not leave['listed'], leave)
ck('Add a reference: a small window on top of the panel, saved into slot 1 as a work reference, the big form never opens', reff['z'][0] > reff['z'][1] and reff['saved'] == ['Ann Boss', '4175550199', 'professional', 'Brookdale', 'Pending'] and reff['closed'] and not reff['big'] and reff['panelHas'], reff)
ck('no em dash on the dashboard or checklist', '—' not in R['html'] and '—' not in person)
print(f'checks_dash_look: {ok} passed, {fail} failed'); print('screenshots:', os.path.join(OUT, 'checks_dash.png'), os.path.join(OUT, 'checks_person.png'))
raise SystemExit(1 if fail else 0)

"""446 · Background review ("Something came up"), the Hub side: the real page and the real engine, offline, FAKE
candidates only. The server is answered here by a stand-in that returns the exact words the real server code makes
(bgrv_words.mjs). Nothing reaches production; nothing is sent."""
import json, subprocess, os
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
H = open('/Users/samantha/Claude/Projects/cc-hub-live/.claude/g1a_harness.js').read()
W = subprocess.run(['node', os.path.join(HERE, 'bgrv_words.mjs')], capture_output=True, text=True, check=True).stdout
ENG = open(os.path.join(HERE, '..', '..', 'caregivers-engine.js')).read()
def cut(a, b):
    i = ENG.index(a); j = ENG.index(b, i + 1); return ENG[i:j]
# the engine's own code for this feature, run in the page with fake candidates (the engine keeps its functions private)
CODE = """
let candidates = []; let _notHireId = null; var HYDRATED = true;
const bgrEsc = t => String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function saveCandidates(){ return Promise.resolve(true); }
function renderOB(){} function renderAlerts(){} function renderPeopleChecks(){} function bgrRefreshDrawer(){} function closeModal(){}
function safeIsTmp(id){ return typeof id === 'number' && id < 0; }
async function sendCandidateSMS(){ return {}; }
function obDeriveStatus(c){ return globalThis.CCElig.obDeriveStatus(c); }
""" + cut('/* ── BACKGROUND REVIEW: "Something came up"', '/* Record a single background check (EDL / FCSR / Fingerprint)') \
    + cut('function bgrApplyBoardChange(candId, changes){', '// ── ORIENTATION INVITE') \
    + cut('async function confirmNotHire(){', 'function reactivateOB(id){')
T = r"""
async([W, CODE])=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,900)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  await new Promise((res,rej)=>{ const e=document.createElement('script'); e.src='eligibility-rules.js?t='+Date.now(); e.onload=res; e.onerror=rej; document.head.appendChild(e); });
  const sc=document.createElement('script'); sc.textContent=CODE; document.head.appendChild(sc);
  await sleep(50);
  /* FAKE candidates only */
  const base={ last:'Test', phone:'4175550100', email:'t@example.test', oos:'no', edl:'Clear', fcsr:'Clear', oig:'CLEAR', fp:'N/A', r1n:'Ref One', r1s:'Positive', r2n:'Ref Two', r2s:'Positive', addedAt:'2026-10-01T15:00:00Z' };
  candidates=[ { ...base, id:901, first:'Ava', fcsr:'Issues Found' }, { ...base, id:902, first:'Bo' },
               { ...base, id:903, first:'Cy', fcsr:'Issues Found', not_hired:true }, { ...base, id:904, first:'Oli', oig:'FLAGGED' },
               { ...base, id:905, first:'Eve', edl:'Issues Found' }, { ...base, id:906, first:'Fin', fp:'Issues Found', oos:'yes' } ];
  let saves=0; window.saveCandidates=async()=>{ saves++; return true; };
  /* the stand-in server: records every call, keeps fake reviews, answers with the real server's words */
  window.__calls=[]; const rows=[]; let n=0;
  const today='2026-10-05';
  sb.from=t=>{ if(t!=='bg_reviews') throw new Error('unexpected table '+t);
    const b={ select(){return b;}, order(){return b;}, limit(){ return Promise.resolve({ data:rows.map(r=>({...r})), error:null }); } }; return b; };
  const W1=W.step1;
  const finalWords=rv=>({ decision:W.final.decision, waiver:W.final.waiver, edl:W.final.edl, oig:W.final.oig })[({fcsr:{waiver_needed:'waiver',no_waiver:'decision',cannot_employ:'edl'},fp:{waiver_needed:'waiver',no_waiver:'decision'},edl:{cannot_employ:'edl'},oig:{cannot_employ:'oig'}})[rv.check_key][rv.result]];
  sb.functions.invoke=async(name,o)=>{ if(name!=='bg-review') throw new Error('unexpected function '+name); const b=o.body; __calls.push(JSON.parse(JSON.stringify(b)));
    const H_=(rv,what)=>{ rv.history=(rv.history||[]).concat([{ at:new Date().toISOString(), by:'Krystal', what }]); };
    if(b.action==='preview' && !b.id) return { data:{ ok:true, words:W1, phone:true, email:true }, error:null };
    if(b.action==='open'){ const ex=rows.find(r=>r.candidate_id===b.candidate_id&&r.check_key===b.check&&['open','waiting_waiver'].includes(r.status)); if(ex) return { data:{ ok:true, id:ex.id, already_open:true }, error:null };
      const rv={ id:'00000000-0000-4000-8000-'+String(++n).padStart(12,'0'), candidate_id:b.candidate_id, check_key:b.check, status:'open', result:'review', opened_at:new Date().toISOString(), opened_by:'Krystal', history:[] };
      H_(rv,'Opened the review'); rows.push(rv); return { data:{ ok:true, id:rv.id }, error:null }; }
    const rv=rows.find(r=>r.id===b.id);
    if(b.action==='preview'){ if(b.step==='final'){ const why=bgrvGate(rv); return { data: why?{ ok:true, blocked:why }:{ ok:true, words:finalWords(rv), phone:true, email:true }, error:null }; } return { data:{ ok:true, words:W1, phone:true, email:true }, error:null }; }
    if(b.action==='step1'){ Object.assign(rv,{ step1_at:new Date().toISOString(), step1_by:'Krystal', step1_how:'text and email', due_date:'2026-10-12' }); H_(rv,'Something came up sent'); return { data:{ ok:true, texted:true, emailed:true, not_sent:[] }, error:null }; }
    if(b.action==='told'){ Object.assign(rv,{ step1_told_at:new Date().toISOString(), due_date:'2026-10-12' }); H_(rv,'Told them'); return { data:{ ok:true }, error:null }; }
    if(b.action==='spoke'){ Object.assign(rv,{ spoke_at:new Date().toISOString(), spoke_by:'Krystal' }); H_(rv,'Spoke'); return { data:{ ok:true }, error:null }; }
    if(b.action==='result'){ Object.assign(rv,{ result:b.result, decision_reason:b.reason||null, result_by:'Krystal' }); H_(rv,'Result '+b.result); return { data:{ ok:true }, error:null }; }
    if(b.action==='note'){ rv.note=b.note; H_(rv,'Office note'); return { data:{ ok:true }, error:null }; }
    if(b.action==='waiver'){ if(b.step==='wait') Object.assign(rv,{ status:'waiting_waiver', waiver_wait_at:new Date().toISOString() }); return { data:{ ok:true }, error:null }; }
    if(b.action==='clear'){ Object.assign(rv,{ status:'cleared', cleared_why:b.why, cleared_at:new Date().toISOString(), cleared_by:'Krystal' }); H_(rv,'Cleared'); return { data:{ ok:true, cleared:true, check:rv.check_key, set_to:BGRV_CHECKS[rv.check_key].clear }, error:null }; }
    if(b.action==='final'){ if(bgrvGate(rv)) return { data:{ error:bgrvGate(rv) }, error:null }; Object.assign(rv,{ status:'not_hired', final_at:new Date().toISOString(), final_by:'Krystal', final_how:'text and email', final_variant:'x' }); H_(rv,'Final notice'); return { data:{ ok:true, texted:true, emailed:true, not_hired:true, not_sent:[] }, error:null }; }
    return { data:{ error:'unknown' }, error:null }; };
  window.__conf=[]; window.__alerts=[]; window.__prompts=[]; let yes=true, promptAns=null;
  window.confirm=m=>{ __conf.push(m); return yes; }; window.alert=m=>{ __alerts.push(m); }; window.prompt=m=>{ __prompts.push(m); return promptAns; };
  const C=id=>candidates.find(c=>c.id===id);
  const panel=id=>{ const d=document.createElement('div'); d.innerHTML=bgrvPanelHtml(C(id)); return d; };
  const btns=id=>[...panel(id).querySelectorAll('button')].map(b=>({ t:b.textContent, dis:b.disabled, title:b.title||'' }));
  await bgrvLoad(true);

  /* when the button appears */
  ok('"Something came up" appears for a flagged check (FCSR Issues Found); not for someone all clear; not for someone marked Not hired', bgrvNeedsButton(C(901)) && !bgrvNeedsButton(C(902)) && !bgrvNeedsButton(C(903)) && btns(901).some(b=>b.t==='🛡 Something came up') && btns(902).length===0);
  ok('...and for OIG FLAGGED, EDL Issues Found and fingerprints Issues Found', [904,905,906].every(id=>bgrvNeedsButton(C(id))));
  ok('nothing was asked of the server and nothing sent just by showing it', __calls.length===0);

  /* Step 1: Cancel */
  yes=false; await bgrvStart(901,'fcsr');
  ok('Something came up, Cancel: the exact text and email are shown first; the review opens; NOTHING is sent', __conf[0].includes(W1.text) && __conf[0].includes('About your background screening') && /OK sends it\. Cancel opens the review WITHOUT sending/.test(__conf[0]) && __calls.map(c=>c.action).join()==='preview,open', [__calls, __conf[0]]);
  ok('...the text shown never names the check; the email names it with no details', !/FCSR|Registry/.test(W1.text) && __conf[0].includes('Missouri Family Care Safety Registry screening'));
  ok('...the review starts at "Needs review", not told yet; final notice not available (and says why)', /FCSR · Needs review/.test(panel(901).innerText) && /Not told yet/.test(panel(901).innerText) && btns(901).find(b=>b.t==='Send the final notice').dis && /Something came up" first/.test(btns(901).find(b=>b.t==='Send the final notice').title));
  ok('the candidate is untouched: still Issues Found, not marked Not hired, no save', C(901).fcsr==='Issues Found' && !C(901).not_hired && saves===0);

  /* Step 1: OK */
  const id1=rows[0].id; yes=true; __calls=[]; __conf=[];
  await bgrvAct(id1,901,'step1');
  ok('Send "Something came up" (OK): preview, then the send; the office is told it went', __calls.map(c=>c.action).join()==='preview,step1' && /Sent by text and email/.test(__alerts.at(-1)), __calls);
  ok('...the panel shows when and how, and the Applicant response due date', /Told them .* by text and email/.test(panel(901).innerText) && /Response due Mon, Oct 12/.test(panel(901).innerText), panel(901).innerText);
  ok('...the table chip shows the response due date', /FCSR: response due Mon, Oct 12/.test(bgrvChip(C(901))), bgrvChip(C(901)));

  /* the due date passing does nothing by itself */
  rows[0].due_date='2026-01-05'; __calls=[]; await bgrvLoad(true); bgrvPanelHtml(C(901)); bgrvChip(C(901));
  ok('the response due date passing sends nothing, decides nothing, marks nobody Not hired (the page only shows "(passed)")', __calls.length===0 && /\(passed\)/.test(panel(901).innerText) && !C(901).not_hired && rows[0].status==='open' && rows[0].result==='review');
  ok('...the final notice is still not available while "Needs review"', btns(901).find(b=>b.t==='Send the final notice').dis && /Pick the review result first/.test(btns(901).find(b=>b.t==='Send the final notice').title));

  /* the results offered per check */
  const resultBtns=id=>btns(id).map(b=>b.t).filter(t=>/Waiver needed|No waiver needed|Can't be employed/.test(t));
  ok('FCSR results: Waiver needed, No waiver needed, Can\'t be employed (EDL listing)', JSON.stringify(resultBtns(901))===JSON.stringify(['Waiver needed','No waiver needed',"Can't be employed (EDL listing)"]), resultBtns(901));

  /* No waiver needed: neither clears nor rejects */
  __calls=[]; await bgrvAct(id1,901,'result','no_waiver');
  ok('"No waiver needed": recorded only; nothing sent; not cleared, not rejected; the candidate untouched', __calls.map(c=>c.action).join()==='result' && !('reason' in __calls[0] && __calls[0].reason) && rows[0].status==='open' && C(901).fcsr==='Issues Found' && !C(901).not_hired, __calls);
  ok('...the choices are "They\'re cleared…" or "Not hiring…" (no plain "Send the final notice")', btns(901).some(b=>b.t==="They're cleared…") && btns(901).some(b=>b.t==='Not hiring…' && !b.dis) && !btns(901).some(b=>b.t==='Send the final notice'), btns(901));

  /* Not hiring: a private reason first */
  __calls=[]; promptAns=null; await bgrvAct(id1,901,'nothire');
  ok('Not hiring, prompt cancelled: nothing changes, nothing sent', __calls.length===0 && /private, kept on the review, and never sent/.test(__prompts.at(-1)));
  promptAns='   '; await bgrvAct(id1,901,'nothire');
  ok('Not hiring with no reason: refused, nothing changes, nothing sent', __calls.length===0 && /Write why first/.test(__alerts.at(-1)));
  promptAns='Not available for the hours we need'; yes=false; __conf=[]; await bgrvAct(id1,901,'nothire');
  ok('Not hiring with a reason: the reason is saved (private), then the EXACT final message is shown; Cancel sends nothing', __calls.map(c=>c.action).join()==='result,preview' && __calls[0].reason==='Not available for the hours we need'
     && __conf[0].includes(W.final.decision.text) && __conf[0].includes('Your application with Caring Companions') && !__conf[0].includes('hours we need') && rows[0].status==='open' && !C(901).not_hired, [__calls, __conf]);
  yes=true; __calls=[]; await bgrvAct(id1,901,'final');
  ok('...OK sends it; only then are they marked Not hired (Background check issue)', __calls.map(c=>c.action).join()==='preview,final' && C(901).not_hired===true && C(901).not_hired_reason==='background' && /Final notice sent after the background review \(FCSR\)/.test(C(901).not_hired_notes) && saves===1, C(901));
  ok('...the closed review shows who sent the final notice and when; history kept', /Final notice .* by Krystal/.test(panel(901).innerText) && rows[0].history.length>=5, panel(901).innerText);

  /* OIG: confirmed exclusion → can't be employed; or not them → cleared, and hiring continues */
  yes=true; await bgrvStart(904,'oig'); const idO=rows.find(r=>r.check_key==='oig').id;
  ok('OIG results: only "Can\'t be employed" (no waiver)', JSON.stringify(resultBtns(904))===JSON.stringify(["Can't be employed"]) && !btns(904).some(b=>/Waiver/.test(b.t)), resultBtns(904));
  __calls=[]; const before=obDeriveStatus(C(904));
  const pick=bgrvAct(idO,904,'clear'); await sleep(80);
  const radios=[...document.querySelectorAll('input[name=bgrvc]')].map(i=>i.value);
  ok('They\'re cleared (OIG): the reasons offered are "Not this person" and "An error that was corrected" (no waiver reason)', JSON.stringify(radios)==='["not_them","error_fixed"]', radios);
  [...document.querySelectorAll('button')].find(b=>b.getAttribute('data-x')==='1').click(); await pick;
  ok('...cleared: nothing sent; OIG is recorded CLEAR "after review" and the normal hiring process continues (Ready for Orientation)', __calls.map(c=>c.action).join()==='clear' && C(904).oig==='CLEAR' && /Cleared after review/.test(C(904).oig_review_note) && before!=='Ready for Orientation' && obDeriveStatus(C(904))==='Ready for Orientation' && !C(904).not_hired, [before, obDeriveStatus(C(904)), C(904)]);
  ok('...the panel says cleared, by whom, why', /Cleared .* by Krystal \(Not this person\)/.test(panel(904).innerText), panel(904).innerText);

  /* EDL: can't be employed path */
  await bgrvStart(905,'edl'); const idE=rows.find(r=>r.check_key==='edl').id;
  ok('EDL results: only "Can\'t be employed"', JSON.stringify(resultBtns(905))===JSON.stringify(["Can't be employed"]));
  await bgrvAct(idE,905,'result','cannot_employ'); rows.find(r=>r.id===idE).due_date='2026-01-05'; await bgrvLoad(true);
  __conf=[]; yes=false; await bgrvAct(idE,905,'final');
  ok('EDL "Can\'t be employed": the EDL notice is shown exactly (Missouri law, no waiver); Cancel sends nothing', __conf[0].includes(W.final.edl.text) && /Employee Disqualification List/.test(__conf[0]) && !/Good Cause/.test(__conf[0]) && !C(905).not_hired && rows.find(r=>r.id===idE).status==='open');
  yes=true;

  /* fingerprints: waiver path, waiting holds them */
  await bgrvStart(906,'fp'); const idF=rows.find(r=>r.check_key==='fp').id;
  ok('Fingerprint results: Waiver needed, No waiver needed (never "can\'t be employed")', JSON.stringify(resultBtns(906))===JSON.stringify(['Waiver needed','No waiver needed']), resultBtns(906));
  await bgrvAct(idF,906,'result','waiver_needed');
  ok('Waiver needed: "Waiting on their waiver" and "Waiver approved…" offered', btns(906).some(b=>b.t==='Waiting on their waiver') && btns(906).some(b=>b.t==='Waiver approved…'));
  await bgrvAct(idF,906,'waiver','wait'); rows.find(r=>r.id===idF).due_date='2026-01-05'; await bgrvLoad(true);
  ok('Waiting on their waiver: held (not hired, not working), "Waiver denied" offered, final notice not available', /Waiting on their Good Cause Waiver since/.test(panel(906).innerText) && btns(906).some(b=>b.t==='Waiver denied') && btns(906).find(b=>b.t==='Send the final notice').dis && !C(906).not_hired, btns(906));

  /* notes, records */
  promptAns='Left a voicemail'; await bgrvAct(idF,906,'note');
  ok('Add a note: a private office note, shown on the review', /Office note \(private\): Left a voicemail/.test(panel(906).innerText));

  /* no double messages */
  let smsCalls=0; window.sendCandidateSMS=async()=>{ smsCalls++; return {}; };
  const sel=document.getElementById('not-hire-reason'); sel.value='background'; document.getElementById('not-hire-notes').value='';
  window.closeModal=()=>{}; candidates.push({ ...base, id:907, first:'Gil' }); _notHireId=907; __conf=[];
  await confirmNotHire();
  ok('Not hired with "Background check issue" from the old button: the old courtesy text is never offered or sent', smsCalls===0 && __conf.length===0 && /No message was sent from here/.test(__alerts.at(-1)) && C(907).not_hired===true);

  /* Checkr */
  const src=[bgrvPanelHtml, bgrvAct, bgrvStart, bgrvGate, bgrvChip].map(f=>f.toString()).join('\n');
  ok('Checkr and adverse-action logic are not part of it', !/checkr|adverse|FCRA/i.test(src));
  ok('no em dash in anything it shows', !/—/.test(__conf.join('')+__alerts.join('')+__prompts.join('')+[...document.querySelectorAll('body')].map(b=>'').join('')+bgrvPanelHtml(C(906))));
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page()
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=bgrv'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', H)
    R = pg.evaluate(T, [json.loads(W), CODE]); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

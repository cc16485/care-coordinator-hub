"""Slice 9: the Hub side of evidence hardening, offline. A signed GHE form opens locked with Amend; Save on a signed form
sends only what may change; Amend keeps the signed form and makes a draft copy; a refused save is explained. Inquiry
documents: Remove hides the document and keeps the file. The discharge checklist: Reopen needs a reason. The Payer tab: a
re-upload of the same plan keeps its evidence. Agency documents (guide.html) are checked by reading the page source.
(python3 tests/browser/evidence_look.py [port])"""
import os, sys, re
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, 'client_journey_look.py')).read()
ns = {'__file__': os.path.join(HERE, 'client_journey_look.py')}; exec(src[:src.rindex('with sync_playwright() as pw:')], ns)
STUB, DATA = ns['STUB'], ns['DATA']
PORT = sys.argv[1] if len(sys.argv) > 1 else '8769'
T = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  window.__rpc=[]; window.__rpcErr=null; window.__alerts=[]; window.alert=m=>__alerts.push(String(m));
  sb.rpc=async(n,a)=>{ __rpc.push([n,JSON.parse(JSON.stringify(a))]); return __rpcErr?{ data:null, error:__rpcErr }:{ data:null, error:null }; };
  window.__removed=[]; const realFrom=sb.storage&&sb.storage.from; sb.storage={ from:b=>({ remove:async p=>{ __removed.push([b,p]); return { error:null }; }, upload:async()=>({ error:null }), createSignedUrl:async()=>({ data:{ signedUrl:'x' } }) }) };
  /* ── GHE ── */
  DATA.ghe_forms=[{ id:'g1', client:'Mary Client', client_id:'nc1', visit_date:'2026-10-05', nurse:'Lee LPN', f:{ ghe_client:'Mary Client', ghe_visit_date:'2026-10-05', ghe_nurse:'Lee LPN', ghe_sig_sup_date:'' }, checks:[], radios:{}, total:12, status:'rn_review', sig_nurse:PNG, sig_part:PNG, sig_sup:'' }];
  gheOpen('g1'); await sleep(150);
  const note=document.getElementById('gheLockNote'), cl=document.getElementById('ghe_client');
  ok('a signed form opens locked: the answers cannot be typed in, the note says why, Amend is offered', cl.disabled && /Signed by the participant/.test(note.innerText) && /reviewing RN can still sign/.test(note.innerText) && document.getElementById('gheAmendBtn').style.display!=='none', [cl.disabled, note.innerText]);
  ok('...the nurse and participant signature pads are locked; the RN pad and its date are open', document.getElementById('ghe_sig_part').style.pointerEvents==='none' && document.getElementById('ghe_sig_nurse').style.pointerEvents==='none' && document.getElementById('ghe_sig_sup').style.pointerEvents==='' && !document.getElementById('ghe_sig_sup_date').disabled);
  cl.disabled=false; cl.value='Someone Else'; document.getElementById('ghe_sig_sup_date').value='2026-10-07';
  const sup=document.getElementById('ghe_sig_sup'); sup.dataset.signed='1';
  __rpc.length=0; await gheSave(document.getElementById('gheSaveBtn')); await sleep(30);
  let it=(__rpc.find(c=>c[0]==='upsert_app_data_item')||[])[1]; it=it&&it.item;
  ok('Save on a signed form: the client name typed over is NOT sent; the RN signature and its date are', !!it && it.client==='Mary Client' && it.f.ghe_client==='Mary Client' && it.sig_part===PNG && /^data:image\/png/.test(it.sig_sup) && it.f.ghe_sig_sup_date==='2026-10-07', it);
  __rpcErr={ code:'42501', message:'The GHE form for Mary Client, visit 2026-10-05 was signed by the participant, so its answers cannot change. Use Amend to make a corrected copy; the signed form stays.' };
  sb.from=()=>({ select:()=>({ eq:()=>({ maybeSingle:async()=>({ data:{ data:DATA.ghe_forms }, error:null }) }) }) });
  await gheSave(document.getElementById('gheSaveBtn')); await sleep(30);
  ok('a save the database refuses is explained in words (not queued to retry)', __alerts.some(a=>/Not saved: .*Use Amend/.test(a)), __alerts);
  __rpcErr=null; __rpc.length=0;
  window.prompt=()=>'too short';
  await gheAmend(); await sleep(20);
  ok('Amend needs a real reason', __rpc.length===0 && __alerts.some(a=>/what needs correcting/.test(a)));
  window.prompt=()=>'The visit date was written as the 5th but the visit was on the 6th';
  await gheAmend(); await sleep(150);
  const puts=__rpc.filter(c=>c[0]==='upsert_app_data_item').map(c=>c[1].item);
  const cp=puts.find(x=>x.amends==='g1'), old=puts.find(x=>x.id==='g1');
  ok('Amend: a draft copy naming the signed form and why (signatures to collect again), then the signed form marked replaced', puts.length===2 && cp && cp.status==='draft' && !cp.sig_part && !cp.sig_nurse && /written as the 5th/.test(cp.amend_reason) && cp.f.ghe_client==='Mary Client' && old && old.superseded_by===cp.id && old.sig_part===PNG, puts);
  ok('...the copy opens for editing with the reason shown', gheV('ghe_id')===cp.id && !document.getElementById('ghe_client').disabled && /amended copy of the form/.test(document.getElementById('gheLockNote').innerText), document.getElementById('gheLockNote').innerText);
  gheOpen('g1'); await sleep(100);
  ok('the signed original opens read-only as replaced, with a link to the copy and no Save', /Replaced by an amended copy/.test(document.getElementById('gheLockNote').innerText) && document.getElementById('gheSaveBtn').style.display==='none' && document.getElementById('gheAmendBtn').style.display==='none' && document.getElementById('ghe_rn_reviewer').disabled);
  gheClose();
  ok('the replaced form is not counted and is not in the Fusion check', GheFormRules.fusionToCheck([Object.assign({}, old, { status:'uploaded' })]).length===0 && /Replaced by an amended copy/.test(gheNextStep(old)));
  /* ── inquiry documents ── */
  (0,eval)("persist=async(k,r)=>{ window.__rpc.push(['persist',k,JSON.parse(JSON.stringify(r))]); }");
  (0,eval)("lpLead={ id:'L9', docs:[{ slot:'EMOMED', name:'emomed.pdf', path:'L9/EMOMED-1-emomed.pdf', size:2048, at:'2026-10-01T10:00:00Z' }, { slot:'FUSION', name:'fusion.pdf', path:'L9/FUSION-2-fusion.pdf', size:1024, at:'2026-10-02T10:00:00Z' }] };");
  ['lp_doc_emomed','lp_doc_fusion','lp_docs'].forEach(id=>{ if(!document.getElementById(id)){ const d=document.createElement('div'); d.id=id; document.body.appendChild(d); } });
  renderLeadDocs();
  ok('the document list offers Remove, not a bin', /Remove/.test(document.getElementById('lp_docs').innerText) && !/🗑/.test(document.getElementById('lp_docs').innerHTML));
  window.prompt=()=>'no'; __rpc.length=0; await deleteLeadDoc('L9/EMOMED-1-emomed.pdf');
  ok('Remove needs a reason', __rpc.length===0 && __alerts.some(a=>/Say why it is being removed/.test(a)));
  window.prompt=()=>'Uploaded to the wrong inquiry'; await deleteLeadDoc('L9/EMOMED-1-emomed.pdf'); await sleep(20);
  const saved=(__rpc.find(c=>c[0]==='persist')||[])[2];
  ok('Remove hides it with who, when and why; the file is not deleted', !!saved && saved.docs.length===2 && saved.docs[0].removed && /wrong inquiry/.test(saved.docs[0].removed.why) && __removed.length===0, [saved, __removed]);
  const t=document.getElementById('lp_docs').innerText;
  ok('...it is listed under Removed, kept for the record, and the Medicaid verification count no longer includes it', /Removed \(1\), kept for the record/.test(document.getElementById('lp_docs').innerHTML) && /Medicaid verification/.test(document.getElementById('lp_doc_emomed').textContent), [t, document.getElementById('lp_doc_emomed').textContent]);
  /* ── the discharge checklist ── */
  let cb=document.getElementById('ccCare'); if(!cb){ cb=document.createElement('div'); cb.id='ccCare'; document.body.appendChild(cb); }
  const state={ state:'past', person:null, roles:[], pause:null, episodes:[], can:{}, changes:[{ change_id:'chg1', kind:'end', made_at:'2026-10-09T10:00:00Z', made_by_name:'Angie', checklist:[{ key:'dsds', label:'Tell DSDS in writing', rule:'19 CSR 15-7.021(16)(B)', when:'right away', state:'done', by_name:'Angie', on:'2026-10-09', how:'PCCP Request Form' }] }] };
  window.__cj=[]; (0,eval)("cjCall=async(b)=>{ window.__cj.push(b); if(b.action==='care_state') return window.__ccState; if(b.action==='care_checklist'&&b.state==='open'&&!(b.reason||'').trim()) return { error:'Say why' }; return { outcome:'saved' }; }");
  window.__ccState=state;
  await ccCareMount({ ax:'296' }); await sleep(80);
  const btn=[...cb.querySelectorAll('button')].find(b=>/Reopen/.test(b.textContent));
  ok('a recorded checklist step shows Reopen…', !!btn, cb.innerText.slice(0,400));
  window.prompt=()=>''; await ccCareReopen('chg1','dsds'); await sleep(20);
  ok('...without a reason nothing is sent', !__cj.some(b=>b.action==='care_checklist'));
  window.prompt=()=>'The fax did not go through'; await ccCareReopen('chg1','dsds'); await sleep(40);
  const sent=__cj.find(b=>b.action==='care_checklist');
  ok('...with a reason it asks the server to reopen it, with the reason', !!sent && sent.state==='open' && sent.reason==='The fax did not go through' && sent.item==='dsds', __cj);
  state.changes[0].checklist[0]=Object.assign({}, state.changes[0].checklist[0], { state:'open', reopened:{ reason:'The fax did not go through' }, earlier:[{ state:'done', by_name:'Angie', on:'2026-10-09', how:'PCCP Request Form', replaced_by_name:'Angie', reason:'The fax did not go through' }] });
  await ccCareMount({ ax:'296' }); await sleep(80);
  ok('...a reopened step shows why, and what it said before', /Reopened by .*fax did not go through/.test(cb.innerText) && /Earlier: done by Angie/.test(cb.innerText), cb.innerText.slice(0,600));
  /* ── the Payer tab: a re-upload keeps the evidence ── */
  const prev={ id:'mcp_1', received_on:'2026-10-01', confirmed_by:'kry', confirmed_at:'2026-10-01T10:00:00Z', fusion_verified:{ by:'kry', checked_on:'2026-10-02' }, pdf:{ path:'careplan/mcp_1/1-a.pdf', name:'a.pdf' }, start:{ checks:{ ax_schedule:{ on:'2026-10-03' } } }, changes:[{ id:'c1' }] };
  const r1=mcpKeepEvidence(prev, { id:'mcp_1', received_on:'2026-10-09', confirmed_by:'ang', confirmed_at:'2026-10-09T10:00:00Z', file_name:'again.pdf' });
  ok('a re-upload with no new PDF keeps the Fusion check, the PDF, the start record, the change requests and the first received date; the re-upload is listed', r1.fusion_verified.checked_on==='2026-10-02' && r1.pdf.name==='a.pdf' && r1.start.checks.ax_schedule && r1.changes.length===1 && r1.received_on==='2026-10-01' && r1.reuploads.length===1 && r1.reuploads[0].by==='ang' && r1.confirmed_by==='kry', r1);
  const r2=mcpKeepEvidence(prev, { id:'mcp_1', received_on:'2026-10-09', pdf:{ path:'careplan/mcp_1/2-b.pdf', name:'b.pdf' } });
  ok('a re-upload with a new PDF makes it current and lists the earlier PDF', r2.pdf.name==='b.pdf' && r2.pdf_earlier.length===1 && r2.pdf_earlier[0].name==='a.pdf', r2);
  ok('no em dash in anything shown', !/—/.test(document.getElementById('lp_docs').innerText+cb.innerText+document.getElementById('gheLockNote').innerText));
  return R; }"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []
    pg = b.new_page(viewport={'width': 1280, 'height': 1000})
    pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    pg.goto(f'http://localhost:{PORT}/index.html?proof=evidence9'); pg.wait_for_timeout(1500)
    for s in (STUB, DATA): pg.evaluate('s=>(0,eval)(s)', s)
    R = pg.evaluate(T)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
g = open(os.path.join(HERE, '..', '..', 'guide.html')).read()
dd = g[g.index("bind('[data-ddel]'"):g.index("$('dFilter').addEventListener")]
R.append(['PASS' if ('storage.from(BUCKET).remove' not in g and 'removed: { by: ME' in dd and "drop('agency_docs'" not in g and 'Why is it being removed' in dd) else 'FAIL', 'agency documents: Remove keeps the file and the record, with a reason (page source)', ''])
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

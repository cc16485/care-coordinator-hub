"""Slice 8: the Payer tab's State care plan box offline: checked against Fusion (or the button), the PDF kept (or Keep the PDF),
the Client audit (PDF) link, and the late-start form requiring the attached copy. (python3 tests/browser/client_audit_look.py [port])"""
import os, sys
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, 'client_journey_look.py')).read()
ns = {'__file__': os.path.join(HERE, 'client_journey_look.py')}; exec(src[:src.rindex('with sync_playwright() as pw:')], ns)
STUB, DATA = ns['STUB'], ns['DATA']
PORT = sys.argv[1] if len(sys.argv) > 1 else '8769'
T = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const D=n=>new Date(Date.now()+n*864e5).toISOString().slice(0,10);
  window.__calls=[]; window.ClientAudit={ open:(...a)=>__calls.push(['open',...a]), exportClient:(...a)=>__calls.push(['export',...a]), pickFile:async()=>({ name:'letter.pdf', type:'application/pdf' }), upload:async(k,ref,f)=>{ __calls.push(['upload',k,ref]); return { path:k+'/'+ref+'/1-'+f.name, name:f.name }; } };
  (0,eval)("persist=async(k,r)=>{ window.__calls.push(['persist',k,r.id]); }");
  let box=document.getElementById('cpPlanBox'); if(!box){ box=document.createElement('div'); box.id='cpPlanBox'; document.body.appendChild(box); }
  (0,eval)("Object.assign(CP, { lead:{ id:'L290', axiscare_client_id:'290', dcn:'1290' }, ax:'290', r:{ client_name:'Ann Able' } })");
  const svc={ type:'PC', kind:'pc', label:'Personal care', program:'ihs', start:D(-12), end:D(300), ours:true, units:[{ start:D(-12), end:D(300), code:'T1019', units:120 }] };
  DATA.medicaid_plans=[{ id:'mcp_290', kind:'plan', axiscare_client_id:'290', lead_id:'L290', client_name:'Ann Able', dcn:'1290', plan_start:D(-12), plan_end:D(300), generated:D(-13), received_on:D(-12), services:[svc], confirmed_by:'kry', confirmed_at:D(-12)+'T15:00:00Z', start:{ checks:{} }, changes:[] }];
  mcpProfileRender(); await sleep(50); let t=box.innerText;
  ok('not yet checked: the box says nobody recorded checking it against Fusion, with the button', /Nobody has recorded checking this plan against Fusion/.test(t) && /I checked it in Fusion/.test(t), t.slice(0,600));
  ok('...and the PDF is not kept yet, with Keep the PDF', /The care plan PDF is not kept here yet/.test(t) && /Keep the PDF/.test(t));
  ok('...the Client audit (PDF) link is there', /Client audit \(PDF\)/.test(t));
  ok('...the late start owes a written justification and the copy must be attached (no tick box any more)', /Written justification owed to DSDS/.test(t) && /Attach the copy that was sent \(required\)/.test(t) && !document.getElementById('mcpSCopy'));
  window.prompt=(m,d)=>/date you checked/.test(m)?d:'dates, services and units match Fusion';
  await mcpFusionCheck(); await sleep(30);
  await mcpKeepPdf(); await sleep(30); t=box.innerText;
  ok('after the Fusion check and Keep the PDF: who checked and when, the PDF name, both saved', /Checked against Fusion/.test(t) && /units match Fusion/.test(t) && /PDF kept: plan|PDF kept: letter\.pdf/.test(t) && __calls.filter(c=>c[0]==='persist').length>=2 && __calls.some(c=>c[0]==='upload' && c[1]==='careplan' && c[2]==='mcp_290'), [t.slice(0,500), __calls]);
  const cab=[...box.querySelectorAll('button')].find(b=>/Client audit/.test(b.textContent)); if(cab) cab.click(); await sleep(20);
  ok('Client audit (PDF) asks for the export of this client', __calls.some(c=>c[0]==='export' && c[1]==='290' && c[2]==='L290'));
  /* the late-start record needs the copy */
  mcpLateField('reason','Family was out of town until this week.'); mcpLateField('sent_on',(typeof today==='function'?today():D(0))); mcpLateField('how','Fusion');
  await mcpLateSave(); await sleep(30);
  ok('recording the justification without the copy: refused with the words', /Attach the copy that was sent to DSDS first/.test((document.getElementById('mcpSMsg')||{}).textContent||''));
  await mcpLateAttach(); await sleep(20); await mcpLateSave(); await sleep(30); t=box.innerText;
  ok('with the copy attached: recorded, the copy kept and shown', /Written justification sent to DSDS/.test(t) && /Copy kept: letter\.pdf/.test(t) && __calls.some(c=>c[0]==='upload' && c[1]==='late'), t.slice(600,1600));
  ok('no em dash in the box', !/—/.test(box.innerText));
  return R; }"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []
    pg = b.new_page(viewport={'width': 1280, 'height': 1000})
    pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    pg.goto(f'http://localhost:{PORT}/index.html?proof=clientaudit'); pg.wait_for_timeout(1500)
    for s in (STUB, DATA): pg.evaluate('s=>(0,eval)(s)', s)
    R = pg.evaluate(T)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

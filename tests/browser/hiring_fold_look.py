"""The Hiring tab, tidy (Samantha 2026-11-05: "making the detailed section expandable so it can close and not take up so
much space unless we want to look at it"). The real Hub page, offline, one made-up hire; every server answer is faked and
nothing is sent. Off: the current Hiring tab, unchanged. On (owner preview): Their journey stays open, every other section
folds to one line with its summary, a section opened stays open after a redraw, the Open Hiring banner goes while Hiring
is open (and comes back on Overview), and signed Step 1 forms show once. Screenshots to SHOTS (default /tmp/hf_*.png).
(python3 tests/browser/hiring_fold_look.py; serves this checkout itself)"""
import os, threading, functools, http.server, socketserver
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
SHOTS = os.environ.get('SHOTS', '/tmp/hf_')
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.TCPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=ROOT)); PORT = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()

T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]), sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const ago=n=>new Date(Date.now()-n*864e5).toISOString();
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha Troutman' };");
  window.ccIsOwner=()=>true; window.__sent=[];
  try{ localStorage.removeItem('cc_hiring_fold_preview'); localStorage.removeItem('cc_hiring_fold_open'); }catch(e){}
  DATA.ops_settings=Object.assign({}, DATA.ops_settings||{}, { hiring_fold_live:false });
  const P={ ids:{ applicant_id:'a1', offer_id:'o1', candidate_id:7 }, path:'new',
    status:{ stages:[{label:'Application',state:'done'},{label:'Offer',state:'done'},{label:'Step 1',state:'done'},{label:'Background & References',state:'current'},{label:'Orientation',state:'todo'}],
      current:'Background & References', next:{ title:'Signed for Caring Companions', owner:'an owner' }, missing:['2 tasks from their experience not verified yet'],
      step1:{ forms:[{title:'Employee Application',state:'signed',signed_at:ago(15)},{title:'Code of Ethics',state:'signed',signed_at:ago(14)},{title:'Client Rights',state:'needs_attention',signed_at:ago(14),why:'signed on version 1'}] },
      submitted:{ application_at:ago(20), step1_answers:true } },
    timeline:[{at:ago(20),what:'Application: Completed',type:'done'},{at:ago(16),what:'Offer sent',type:'sent'},{at:ago(1),what:'Reference 3 (Ann Example): Responded',type:'received'}],
    documents:[{label:'Offer letter (signed)',at:ago(16)},{label:'Step 1: Employee Application (signed)',at:ago(15)},{label:'OIG check proof',at:ago(3)}] };
  (0,eval)(`sb={ functions:{ invoke:async(fn,o)=>{ window.__sent.push(fn+':'+(o&&o.body&&o.body.action)); return fn==='hire-profile'?{ data:${JSON.stringify(P)}, error:null }:{ data:null, error:{ message:'offline' } }; } },
    from:(t)=>{ const p=new Proxy(function(){}, { get(_,k){ if(k==='then') return (a,b)=>Promise.resolve({ data: t==='reference_requests'?[{slot:1,ref_name:'Ann Example',responded_at:'${ago(1)}'},{slot:2,ref_name:'Bo Sample'}]:[], error:null }).then(a,b);
      if(k==='maybeSingle'||k==='single') return ()=>Promise.resolve({data:null,error:null}); return ()=>p; } }); return p; },
    rpc:async()=>({data:null,error:null}), auth:{ getSession:async()=>({data:{session:null}}) } };`);
  /* the two cards from their own servers, drawn with the same badges the real ones use */
  window.DRV={ mount:(el)=>{ el.innerHTML='<span class="tag-chip" style="background:#FEF3C7;color:#92400E;font-weight:800">Pending Verification</span><div>License: Not verified</div><div>Insurance: Not verified</div><div>Driving record: Not checked yet</div>'; } };
  window.HEPB={ mount:(el)=>{ el.innerHTML='<span style="display:inline-block;padding:.12rem .5rem;border-radius:999px;font-size:.75rem;font-weight:700;color:#92400E;background:#FEF3C7">Answered, the office is checking</span>'; } };
  AP_PROF={ id:'a1', first_name:'Dee', last_name:'Example', status:'hired', offer_position:'CNA', offer_rate:20, offer_hours:'PRN', offer_sent_at:ago(16), hired_at:ago(16), created_at:ago(20), phone:'4175550100' };
  AP_ROWS=[AP_PROF]; AP_TAB='hiring';
  /* the profile view is shown by the Applicants tab in the real page; here it is shown directly. The Caregivers part
     cannot load offline, so its load answers at once with no records (the references then show as a list). */
  document.getElementById('applicantProfileView').style.display='block';
  (0,eval)("scxEnsure=function(){ setTimeout(()=>window.dispatchEvent(new Event('scx-hydrated')),50); };");
  const open=async()=>{ apRenderProfile(); await sleep(900); };
  const pane=()=>document.getElementById('apPane-hiring'), vis=el=>!!el && (el.checkVisibility ? el.checkVisibility({contentVisibilityAuto:true}) : el.offsetParent!==null);
  const banner=()=>document.querySelector('#apProfLeft [data-next-go="hiring"]');

  /* off */
  await open();
  ok('off: no folded sections, the current cards', pane().querySelectorAll('details.hf-card').length===0 && /The offer/.test(pane().innerText), pane().innerText.slice(0,300));
  ok('off: Their journey, documents and journey list in one card', !!document.getElementById('apHpHiring') && !document.getElementById('apHpJourney'));
  ok('off: the Open Hiring banner shows', vis(banner()));
  ok('off: signed Step 1 forms listed', /Employee Application/.test((document.getElementById('apHpHiring')||{}).innerText||''));
  window.__shot1=true;
  return R;
}
"""
T2 = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]), sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const pane=()=>document.getElementById('apPane-hiring'), vis=el=>!!el && (el.checkVisibility ? el.checkVisibility({contentVisibilityAuto:true}) : el.offsetParent!==null);
  const banner=()=>document.querySelector('#apProfLeft [data-next-go="hiring"]');
  HFOLD.preview(true); await sleep(1200);
  const d=[...pane().querySelectorAll('details.hf-card')], line=k=>{ const x=pane().querySelector('details[data-hf="'+k+'"] .hf-line'); return x?x.innerText:''; };
  ok('on: six folded sections, all closed', d.length===6 && d.every(x=>!x.open), d.map(x=>x.dataset.hf+':'+x.open));
  ok('on: Their journey stays open with Now, Next and Missing', /Now:/.test(document.getElementById('apHpHiring').innerText) && /Next:/.test(document.getElementById('apHpHiring').innerText) && /Missing or follow-up/.test(document.getElementById('apHpHiring').innerText));
  ok('summary: The offer', line('offer')==='CNA · PRN · hired '+new Date(AP_PROF.hired_at).toLocaleDateString('en-US',{month:'short',day:'numeric'}), line('offer'));
  ok('summary: References', line('refs')==='1 of 2 back', line('refs'));
  ok('summary: The whole journey', /^3 entries · last .*Reference 3/.test(line('journey')), line('journey'));
  ok('summary: Signed documents', line('docs')==='3 documents', line('docs'));
  ok('summary: Driver Compliance with its badge', line('driver')==='Pending Verification 3 checks to do', line('driver'));
  ok('summary: Hepatitis B with its badge', line('hepb')==='Answered, the office is checking', line('hepb'));
  ok('folded content is hidden', !vis(document.getElementById('apHpDocs')) && !vis(document.getElementById('apDrv')));
  ok('the Open Hiring banner goes while Hiring is open', !!banner() && !vis(banner()));
  const s1=document.getElementById('apHpHiring');
  ok('signed Step 1 forms show once: the signed ones hidden here, the one needing attention still shown',
    ![...s1.querySelectorAll('.hp-s1-signed')].some(vis) && /Client Rights/.test(s1.innerText) && /2 of 3 signed; open them under Signed documents/.test(s1.innerText), s1.innerText.slice(0,600));
  window.__shotOn=true;
  /* opening one, and it stays open after a redraw */
  const docs=pane().querySelector('details[data-hf="docs"]'); docs.open=true; await sleep(200);
  ok('opening a section shows it', vis(document.getElementById('apHpDocs')) && /Offer letter/.test(document.getElementById('apHpDocs').innerText));
  apRenderProfile(); await sleep(900);
  ok('...and it stays open after the page redraws', pane().querySelector('details[data-hf="docs"]').open && !pane().querySelector('details[data-hf="driver"]').open);
  apTab('overview'); await sleep(100);
  ok('on Overview the banner is back', vis(banner()));
  apTab('hiring'); await sleep(300);
  ok('nothing was sent: only reads (profile, stages, screening)', window.__sent.every(x=>/:(get|stages|screening)$/.test(x)), window.__sent);
  ok('the switch is still off for everyone (preview only)', DATA.ops_settings.hiring_fold_live===false && HFOLD.showing());
  const st=document.getElementById('hfToggleBtn');
  ok('Settings has the switch and the preview button', !!st && !!document.getElementById('hfPreviewBtn'));
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1280, 'height': 1000})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://127.0.0.1:%d/index.html?proof=hiringfold' % PORT); pg.wait_for_timeout(1500)
    R = pg.evaluate(T)
    pg.evaluate("document.getElementById('apPane-hiring').scrollIntoView()"); pg.screenshot(path=SHOTS + 'off.png', full_page=False)
    R += pg.evaluate(T2)
    pg.evaluate("apRenderProfile()"); pg.wait_for_timeout(900)
    pg.evaluate("document.querySelectorAll('#apPane-hiring details.hf-card').forEach(d=>d.open=false)"); pg.wait_for_timeout(300)
    pg.evaluate("document.getElementById('apProfLeft').scrollIntoView()"); pg.screenshot(path=SHOTS + 'on.png', full_page=False)
    pg.evaluate("document.querySelector('#apPane-hiring details[data-hf=\"driver\"]').open=true"); pg.wait_for_timeout(300)
    pg.evaluate("document.querySelector('#apPane-hiring details[data-hf=\"driver\"]').scrollIntoView({block:'center'})"); pg.screenshot(path=SHOTS + 'on_open.png', full_page=False)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

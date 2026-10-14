"""The AI Interview Review in the Hub and on the phone (2026-10-13, her "yes to all" + "build"). Offline, made-up applicant and
review; every Supabase answer and the server function are faked; nothing is saved or sent. (python3 tests/browser/interview_review_look.py)"""
from playwright.sync_api import sync_playwright
import os
PORT = os.environ.get('PORT', '8765')
FAKE = r"""
  const APID='0b7e6a1c-1111-4222-8333-444455556666';
  const REVIEW={ kind:'full', summary:'Three years of home care; wants 30 steady hours.', parts:[{rec:'r1',part:1}], dropped_unverified:1, parts_still_transcribing:0,
    stats:{ applicant_share:64, overlap_count:3, overlaps:[], longest:{secs:250,part:1,at:51} },
    items:[ { id:'s1', section:'strengths', said:[{quote:'almost three years, mostly dementia', source:'transcript', part:1, at:192, rec:'r1'}], text:'Dementia experience.' },
            { id:'c2', section:'concerns', said:[{quote:'ran to the store for maybe twenty minutes', source:'transcript', part:1, at:662, rec:'r1'},{quote:'1 to 3 years', source:'application'}], clarify:'Was the client safe to leave alone?' },
            { id:'s3', section:'safety', said:[{quote:'Mrs. Patterson on Elm Street', source:'transcript', part:1, at:451, rec:'r1'}], clarify:'Named a past client. Ask about privacy.' },
            { id:'m4', section:'missed', said:[], text:'Question 5 was half answered.' },
            { id:'r5', section:'reference_questions', said:[], text:'Did Jordan ever leave a client alone?' } ] };
  window.__U=[]; window.__INV=[]; window.__DB={
    job_applicants:[{ id:APID, first_name:'Jordan', last_name:'Ellis', position:'caregiver', status:'new', post_interview:{ notes:'ok' } }],
    recordings:[{ id:'r1', kind:'interview', subject_id:APID, status:'done', consent_given:true, created_at:new Date(Date.now()-6e5).toISOString(), seconds:1140, turns:[{name:'Speaker B',start:192,end:200,text:'almost three years, mostly dementia'}] }],
    interview_reviews:[{ id:'rv000001-aaaa', applicant_id:APID, kind:'full', created_at:new Date().toISOString(), created_by:'Samantha', review:REVIEW, marks:{} }],
    interview_questions:[{ id:'q1', position:'caregiver', section:'Your story', sort:1, question:'Tell me about yourself', active:true }] };
  sb.from=(t)=>{ const f=[]; let up=null; const b={ select(){return b;}, order(){return b;}, limit(){return b;}, in(){return b;}, gte(){return b;},
      eq(c,v){ f.push([c,v]); return b; }, update(p){ up=p; window.__U.push([t,JSON.parse(JSON.stringify(p))]); return b; },
      maybeSingle(){ return b.then(x=>({data:(x.data||[])[0]||null,error:null})); },
      then(okf){ let d=(window.__DB[t]||[]); f.forEach(([c,v])=>{ d=d.filter(x=>x[c]===undefined||String(x[c])===String(v)); });
        if(up){ d.forEach(x=>Object.assign(x,up)); return Promise.resolve({data:null,error:null}).then(okf); }
        return Promise.resolve({data:JSON.parse(JSON.stringify(d)),error:null}).then(okf); } }; return b; };
  sb.rpc=async(n,a)=>{ window.__U.push(['rpc:'+n,a]); return {data:null,error:null}; };
  Object.defineProperty(sb,'functions',{ configurable:true, value:{ invoke: async(n,o)=>{ window.__INV.push([n,o.body]); if(n==='interview-review') return { data:{ ok:true, id:'rv2', review: o.body.kind==='check' ? { kind:'check', items:[{id:'m1',section:'missed',said:[],text:'Ask about a mistake at work (question 5).'}] } : REVIEW }, error:null }; return {data:{},error:null}; } } });
  (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha', shift:'day' };");
"""
DESK = r"""
async()=>{ const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
""" + FAKE + r"""
  DATA.ops_items=DATA.ops_items||[];
  OPS_PEOPLE.length=0; OPS_PEOPLE.push({ person_id:'p1', full_name:'Krystal Test', primary_email:'krystal@mo-care.com' });
  const host=document.createElement('div'); host.id='apIrHost'; document.body.appendChild(host);
  await IR.mount(host, { id:APID });
  let t=host.innerText;
  ok('the AI review card: labelled AI, summary, counted communication, the sections, and the "not in this review" line', /AI-GENERATED/i.test(t) && /Three years of home care/.test(t) && /64%/.test(t) && /Concerns or inconsistencies/.test(t) && /Confidentiality, safety/.test(t) && /Suggested reference-check/.test(t) && /never changed by the AI/.test(t), t.slice(0,900));
  ok('...what they said (with the time to listen from) is apart from what the AI suggests', host.querySelector('.ir-said .ts') && /3:12/.test(host.querySelector('.ir-said .ts').innerText) && /AI suggests we clarify/.test(t));
  ok('...an application quote is labelled application', /application/.test(host.querySelector('#ir_rv000001-aaaa_c2').innerText));
  ok('...items left out for an unfound quote are said', /1 AI item\(s\) left out/.test(t));
  ok('...Analyze again (only on a tap) shows because a transcript with consent exists', /Analyze again/.test(t) && !window.__INV.length);
  ok('...the recording and transcript are there with times', /Recording and transcript/.test(t));
  ok('...no score or verdict anywhere', !/score|verdict:|recommend hiring/i.test(t.replace(/hiring recommendation, score or verdict/,'')));
  await IR.mark('rv000001-aaaa','c2','confirm'); await sleep(50);
  const M=window.__DB.interview_reviews[0].marks;
  ok('Confirm: saved in the review\'s marks with who and when (the AI words are untouched)', M.c2 && M.c2.mark==='confirm' && M.c2.by==='Samantha' && window.__DB.interview_reviews[0].review.items[1].clarify==='Was the client safe to leave alone?', M);
  ok('...a note box opens for the follow-up note', !!host.querySelector('#ir_rv000001-aaaa_c2 textarea'));
  await IR.note('rv000001-aaaa','c2','Asked her last agency.'); await sleep(30);
  ok('...the note is saved', window.__DB.interview_reviews[0].marks.c2.note==='Asked her last agency.');
  await IR.mark('rv000001-aaaa','s3','dismiss'); await sleep(30);
  ok('Dismiss: the item fades and offers no task', host.querySelector('#ir_rv000001-aaaa_s3').classList.contains('dis') && !host.querySelector('#irt_rv000001-aaaa_s3'));
  IR.taskForm('rv000001-aaaa','c2'); await sleep(20);
  const sel=host.querySelector('#irto_rv000001-aaaa_c2');
  ok('Make a follow-up task: a title from the AI point and a choice of office people', sel && /Krystal Test/.test(sel.innerHTML) && /client safe/.test(host.querySelector('#irtt_rv000001-aaaa_c2').value));
  sel.value='krystal@mo-care.com';
  await IR.taskMake('rv000001-aaaa','c2'); await sleep(50);
  const task=DATA.ops_items.find(x=>x.kind==='interview_followup');
  ok('...a My Work item for Krystal, linked to the applicant and the review item, saved through the usual path', task && task.owner==='krystal@mo-care.com' && task.applicant_id===APID && task.source.item==='c2' && task.status==='open' && window.__U.some(u=>u[0]==='rpc:upsert_app_data_item'), task);
  ok('...the review shows the task, still open (confirming is not resolving)', /Follow-up task:/.test(host.innerText) && /Mark resolved/.test(host.innerText) && /3 to follow up/.test(host.innerText), host.innerText.slice(0,300));
  ok('...My Work knows the kind and opens their interview', OPS_KINDS.interview_followup && /Open their interview/.test(obligationOpenAction(task)));
  window.prompt=()=>'Agency says she was always safe.';
  const btn=[...host.querySelectorAll('.ir-act')].find(b=>b.innerText==='Mark resolved'); await IR.resolve(task.id,'rv000001-aaaa'); await sleep(50);
  ok('Mark resolved: asks for a note, closes the task with it, and the review shows Resolved', task.status==='done' && task.close_note==='Agency says she was always safe.' && /Resolved: Agency says/.test(host.innerText), [task.status, task.close_note]);
  /* the recording list button */
  const html=recListHtml(window.__DB.recordings);
  ok('the recording list offers Analyze Interview for a transcribed interview with consent', /Analyze Interview/.test(html));
  ok('...not for one without consent', !/Analyze Interview/.test(recListHtml([Object.assign({}, window.__DB.recordings[0], {consent_given:false})])));
  await IR.run(APID,'full',null); await sleep(30);
  ok('Analyze calls the server for this applicant only when tapped', window.__INV.length===1 && window.__INV[0][0]==='interview-review' && window.__INV[0][1].applicant_id===APID && window.__INV[0][1].kind==='full');
  return R; }
"""
PHONE = r"""
async()=>{ const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
""" + FAKE + r"""
  window.recMount=()=>{}; try{localStorage.clear();}catch(e){} DATA.coordinator_staff=[]; DATA.ops_items=[];
  phStart(); await sleep(100); document.querySelector('.ph-tabs [data-v="find"]').click(); await sleep(100);
  document.getElementById('phFindBody').innerHTML='<button data-ivopen="'+APID+'">open</button>'; document.querySelector('[data-ivopen]').click(); await sleep(400);
  const body=document.getElementById('phIvBody');
  ok('phone: Check before they leave sits after the questions, before the honest picture', /Check before they leave/.test(body.innerText) && body.innerText.toLowerCase().indexOf('check before they leave') < body.innerText.toLowerCase().indexOf('honest picture'), body.innerText.slice(0,600));
  body.querySelector('[data-iv="check"]').click(); await sleep(600);
  const out=document.getElementById('phIvCheck').innerText;
  ok('...it runs the short check and lists what to ask now (labelled AI)', /AI · to ask now/i.test(out) && /mistake at work/.test(out) && window.__INV.some(x=>x[1].kind==='check'), out);
  ok('...and says to start part 2', /part 2/.test(out));
  ok('phone: Analyze Interview button is there (only on a tap)', !!body.querySelector('[data-iv="analyze"]') && window.__INV.filter(x=>x[1].kind==='full').length===0);
  return R; }
"""
with sync_playwright() as pw:
    b = pw.chromium.launch()
    block = lambda r: r.abort() if ('supabase.co' in r.request.url or 'leadconnectorhq' in r.request.url or 'hub.mo-care.com' in r.request.url) else r.continue_()
    errs = []
    d = b.new_page(viewport={'width': 1280, 'height': 900}); d.route('**/*', block); d.on('pageerror', lambda e: errs.append(str(e)[:200]))
    d.goto(f'http://localhost:{PORT}/index.html'); d.wait_for_timeout(1500)
    R = d.evaluate(DESK)
    d.evaluate("()=>{ const h=document.getElementById('apIrHost'); document.body.prepend(h); h.style.cssText='max-width:780px;margin:20px auto;background:#fff;padding:16px;border-radius:14px;position:relative;z-index:99999'; window.scrollTo(0,0); }")
    d.wait_for_timeout(200); d.screenshot(path='tests/browser/interview_review_hub.png', full_page=False)
    pg = b.new_page(viewport={'width': 375, 'height': 812}, device_scale_factor=2); pg.route('**/*', block); pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(f'http://localhost:{PORT}/index.html?m=1'); pg.wait_for_timeout(1500)
    R += pg.evaluate(PHONE)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, dd in R: print(s_, '·', n, '' if s_ == 'PASS' else dd)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

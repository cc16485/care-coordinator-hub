"""461 · one person, one interview + reapply with us reviewing first (Samantha, 2026-10-05). The Hub's Interviews list and the
applicant profile, offline, made-up applicants; every server answer is faked; nothing is sent. (python3 tests/browser/one_booking_look.py)"""
from playwright.sync_api import sync_playwright
H = open('/Users/samantha/Claude/Projects/cc-hub-live/.claude/g1a_harness.js').read()
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  window.confirm=()=>true; window.__UP=[]; window.__EV=[];
  const day=(n,h)=>{ const d=new Date(); d.setDate(d.getDate()+n); d.setHours(h,0,0,0); return d.toISOString(); };
  /* ── Interviews list ── */
  IVQ=[ { id:'b1', applicant_id:'s1', status:'booked', starts_at:day(3,13), coordinator_id:'c' },
        { id:'b2', applicant_id:'s2', status:'booked', starts_at:day(-1,15), coordinator_id:'c' },
        { id:'b3', applicant_id:'o1', status:'booked', starts_at:day(3,10), coordinator_id:'c' },
        { id:'b4', applicant_id:'p1', status:'booked', starts_at:day(-2,9), coordinator_id:'c' } ];
  IVQ_APP={ s1:{ first_name:'Shak', last_name:'Test', phone:'(417) 555-4959' }, s2:{ first_name:'Shak', last_name:'Test', phone:'417.555.4959' },
            o1:{ first_name:'Ola', last_name:'Test', phone:'4175559999' }, p1:{ first_name:'Pat', last_name:'Test', email:'pat@example.com' } };
  IVQ_CO={ c:'Krystal' };
  let box=document.getElementById('ivqList'); if(!box){ box=document.createElement('div'); box.id='ivqList'; document.body.appendChild(box); }
  ivqRender(); const t=box.innerText;
  ok('one row per person: Shakira once (her upcoming booking), her older one named on the row, not a row of its own', (t.match(/Shak Test/g)||[]).length===1 && /also booked .* under another application/.test(t), t);
  ok('...her past duplicate is no longer "waiting on an outcome"; Pat (one past booking) still is', /1 waiting on an outcome/.test(t) && /Pat Test/.test(t.split('waiting on an outcome')[1]||''), t);
  ok('other people unchanged', /Ola Test/.test(t));
  /* ── applicant profile: needs review ── */
  window.__RV='declined';
  (0,eval)(`sb.rpc=async(fn,a)=>{ if(fn==='applicant_review_reason') return { data: window.__RV, error:null }; return { data:null, error:null }; };
    sb.from=(t)=>{ let patch=null; const b={ update(p){ patch=p; return b; }, eq(){ return b; }, select(){return b;}, then(ok){ if(patch) window.__UP.push(patch); return Promise.resolve({ data:null, error:null }).then(ok); } }; return b; };`);
  window.opEvent=(v,o)=>window.__EV.push(v+':'+(o&&o.summary||''));
  (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha Troutman' };");
  const left=document.getElementById('apProfLeft')||(()=>{ const d=document.createElement('div'); d.id='apProfLeft'; document.body.appendChild(d); return d; })();
  ['apProfRight','apProfMain'].forEach(id=>{ if(!document.getElementById(id)){ const d=document.createElement('div'); d.id=id; document.body.appendChild(d); } });
  AP_PROF={ id:'d2', first_name:'Dee', last_name:'Test', status:'new', screen_grade:'duplicate', duplicate_of:'d1', screen_flags:['Previously DECLINED — open their earlier application and review before proceeding'], created_at:new Date().toISOString() };
  AP_ROWS=[AP_PROF];
  try{ apRenderProfile(); }catch(e){ R.push(['FAIL','profile renders',String(e)]); }
  await sleep(200);
  const rb=document.getElementById('apReviewBox');
  ok('applied again after Not moving forward: the profile says it needs your review, with the button', rb && /Applied again: needs your review/.test(rb.innerText) && /Approve, let them book/.test(rb.innerText), rb && rb.innerText);
  window.__RV=null; rb.querySelector('button').click(); await sleep(200);
  ok('Approve saves who and when, and is recorded', window.__UP.length===1 && window.__UP[0].review_cleared_at && window.__UP[0].review_cleared_by==='samantha@mo-care.com' && window.__EV.some(e=>/^applicant_review_cleared:Samantha Troutman approved Dee Test to book/.test(e)), [window.__UP, window.__EV]);
  ok('...after approving, the box says it was approved', /Approved to book after applying again by samantha/.test(document.getElementById('apReviewBox').innerText));
  window.__RV='dnr'; window.rcView=(v)=>{ window.__RCV=v; };
  AP_PROF={ id:'a1', first_name:'Amy', last_name:'Test', status:'new', screen_grade:'review', screen_flags:['not eligible for rehire'], created_at:new Date().toISOString() };
  apRenderProfile(); await sleep(150);
  const db=document.getElementById('apReviewBox');
  ok('on the do-not-rehire list: says so, and offers the list, not "Approve"', /On your do-not-rehire list/.test(db.innerText) && !/Approve, let them book/.test(db.innerText) && /Open the Do not rehire list/.test(db.innerText), db.innerText);
  db.querySelector('button').click(); ok('...the button opens Recruit, Do not rehire', window.__RCV==='dnr');
  AP_PROF={ id:'n1', first_name:'New', last_name:'Person', status:'new', screen_grade:'qualified', created_at:new Date().toISOString() }; window.__RV=null;
  apRenderProfile(); await sleep(150);
  ok('someone new: no review box', !document.getElementById('apReviewBox').innerText.trim());
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page()
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=onebooking'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', H)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

"""455 · hide a photo or video from a caregiver's profile (Samantha, 2026-10-05). The Hub's profile panel, offline, a
made-up profile; saves are recorded, never sent. (python3 tests/browser/hide_media_look.py, with the static server on 8765)"""
from playwright.sync_api import sync_playwright
H = open('/Users/samantha/Claude/Projects/cc-hub-live/.claude/g1a_harness.js').read()
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  window.confirm=()=>true; window.__ev=[]; window.opEvent=(v,o)=>window.__ev.push(v+':'+(o&&o.summary||''));
  window.__ROW={ id:'g1', axiscare_id:'5', first_name:'Grace', last_name:'Hill', self_complete:true, about:'Hi', photo_path:'g1/photo-1.jpg', video_path:'g1/video-1-std.mp4',
    photo_hidden:false, video_hidden:false, published:true, status:'approved', updated_at:new Date().toISOString() };
  window.__UP=[];
  (0,eval)(`sb.from=(t)=>{ let patch=null; const b={ select(){return b;}, neq(){return b;}, in(){return b;}, eq(){return b;}, order(){return b;}, limit(){return b;}, is(){return b;}, ilike(){return b;},
      update(p){ patch=p; return b; },
      then(ok){ if(patch){ window.__UP.push(patch); Object.assign(window.__ROW, patch); return Promise.resolve({ data:null, error:null }).then(ok); }
        return Promise.resolve({ data: t==='caregiver_profiles' ? [Object.assign({}, window.__ROW)] : [], error:null }).then(ok); } }; return b; };`);
  const d=document.createElement('div'); document.body.appendChild(d);
  await CGP2.mount(d,{ mode:'employee', axiscare_id:'5', first:'Grace', last:'Hill' });
  ok('under the photo and the video: Hide from families', (d.innerText.match(/Hide from families/g)||[]).length===2 && !/Hidden from families/.test(d.innerText), d.innerText.slice(0,400));
  const vid=[...d.querySelectorAll('a')].filter(a=>/Hide from families/.test(a.textContent))[1]; vid.click(); await sleep(300);
  ok('Hide (video): saves video_hidden only', window.__UP.length===1 && window.__UP[0].video_hidden===true && !('photo_hidden' in window.__UP[0]), window.__UP);
  ok('...the panel says Hidden from families, offers Show to families, and the photo is untouched', /Hidden from families/.test(d.innerText) && /Show to families/.test(d.innerText) && (d.innerText.match(/Hide from families/g)||[]).length===1 && /Hidden\. Families no longer see Grace's video\./.test(d.innerText), d.innerText.slice(0,600));
  ok('...recorded in the activity log', window.__ev.some(e=>/^profile_media_hidden:Grace Hill's profile video hidden from families/.test(e)), window.__ev);
  const show=[...d.querySelectorAll('a')].find(a=>/Show to families/.test(a.textContent)); show.click(); await sleep(300);
  ok('Show (video): shown again', window.__UP[1].video_hidden===false && !/Hidden from families/.test(d.innerText) && /Shown\. Families see Grace's video again\./.test(d.innerText));
  const ph=[...d.querySelectorAll('a')].filter(a=>/Hide from families/.test(a.textContent))[0]; ph.click(); await sleep(300);
  ok('Hide (photo): photo_hidden only, the photo greyed in the panel', window.__UP[2].photo_hidden===true && !('video_hidden' in window.__UP[2]) && /opacity:\s*0?\.35/.test(d.querySelector('img').getAttribute('style')));
  window.confirm=()=>false; const ph2=[...d.querySelectorAll('a')].filter(a=>/Hide from families/.test(a.textContent))[0]; const n=window.__UP.length; ph2.click(); await sleep(200);
  ok('Cancel on the question: nothing saved', window.__UP.length===n);
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page()
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=hide'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', H)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

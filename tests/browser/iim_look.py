"""Start forms import themselves, the Hub side (safe saves step 6): the real page, offline, sample rows."""
from playwright.sync_api import sync_playwright
H = open('/Users/samantha/Claude/Projects/cc-hub-live/.claude/g1a_harness.js').read()
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,800)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const iso=m=>new Date(Date.now()-m*60e3).toISOString();
  window.__log=[]; window.__runs=[]; window.__missing=false;
  const base=sb.from.bind(sb);
  const tbl=rows=>{ const b={ select(){return b;}, order(){return b;}, limit(){ return Promise.resolve(__missing?{ data:null, error:{ message:'relation does not exist', code:'42P01' } }:{ data:rows(), error:null }); } }; return b; };
  sb.from=t=>t==='intake_import_log'?tbl(()=>__log):t==='intake_import_runs'?tbl(()=>__runs):base(t);
  const line=document.getElementById('obAutoImport');
  DATA.ops_settings={ intake_auto_import_from:'2026-10-04T07:00:00Z' };
  window.ccCan=()=>false;
  __runs=[{ at:iso(3), mode:'practice', ok:true, seen:3 }];
  __log=[{ id:1, at:iso(3), mode:'practice', intake_id:'a', who:'Ava A', action:'import', reason:'new', result:'would' },
         { id:2, at:iso(3), mode:'practice', intake_id:'b', who:'Bo B', action:'card', reason:'no_offer', result:'would' },
         { id:3, at:iso(3), mode:'practice', intake_id:'c', who:'Cy C', action:'card', reason:'not_hired', result:'would' }];
  await iimLoad(true); await iimLineRender();
  ok('practice: since when, what it would import and card, nothing imported yet; non-owners told an owner turns it on', line.style.display==='block' && /Start form check: practice\. Since Oct 4, it would import 1 and make 2 Needs Attention cards\. Nothing is imported until it is turned on\./.test(line.innerText) && /an owner turns it on in Settings, Start forms/.test(line.innerText) && !line.querySelector('button'), line.innerText);
  IIM.open=true; await iimLineRender();
  ok('the list: each form by first name and last initial, with what would happen and why', /Ava A · would be imported \(new, with a job offer\)/.test(line.innerText) && /Bo B · would get a Needs Attention card: no job offer has their email or phone/.test(line.innerText) && /Cy C · would get a Needs Attention card: marked not hired \(not added back\)/.test(line.innerText), line.innerText);
  window.ccCan=k=>k==='manage_settings'; await iimLineRender();
  const b=[...line.querySelectorAll('button')].find(x=>x.textContent==='Turn on');
  ok('an owner gets the switch right there', !!b);
  let merged=null; window.confirm=()=>true; window.tkMerge=async(fn)=>{ const m={}; const ch=fn(m,{}); merged=m; DATA.ops_settings=Object.assign({},DATA.ops_settings,m); return { changed:ch, error:null }; };
  b.click(); await sleep(80);
  ok('turning it on saves intake_auto_import_live through the shared settings merge; the line says it is on', merged && merged.intake_auto_import_live===true && /New start forms import themselves/.test(line.innerText) && /turn off/.test(line.innerText), [merged, line.innerText]);
  __log=[{ id:4, at:iso(10), mode:'live', intake_id:'a', who:'Ava A', action:'import', reason:'new', result:'done', candidate_id:31 },
         { id:5, at:iso(9), mode:'live', intake_id:'b', who:'Bo B', action:'card', reason:'in_bgr', result:'done' },
         { id:6, at:iso(8), mode:'live', intake_id:'x', who:'Xi X', action:'import', reason:'new', result:'failed', detail:'the database did not answer' }];
  await iimLoad(true); await iimLineRender();
  ok('live: last 7 days imported and carded, with the list', /Last 7 days: 1 imported, 1 Needs Attention card\./.test(line.innerText) && /Ava A · imported into Background & References/.test(line.innerText) && /Bo B · Needs Attention card: already in Background & References/.test(line.innerText), line.innerText);
  ok('a form that could not be handled says why (never silent)', /Xi X · could not be handled: the database did not answer/.test(line.innerText), line.innerText);
  __runs=[{ at:iso(1), mode:'live', ok:false, error:'the job offers could not be read (the Training Platform answered 503), so nothing was changed' }];
  await iimLoad(true); await iimLineRender();
  ok('a check that could not finish says so on the line', /The last check could not finish: the job offers could not be read/.test(line.innerText), line.innerText);
  const s=document.getElementById('iimSet'); DATA.ops_settings={ intake_auto_import_live:false }; await iimSetFill();
  ok('Settings, Start forms: OFF (practice), what it does, nothing sent, the last check', /Start forms import themselves: OFF \(practice\)\./.test(s.innerText) && /Nothing is sent\./.test(s.innerText) && /Last check .*could not finish/.test(s.innerText), s.innerText);
  __missing=true; IIM.log=null; await iimLoad(true); await iimLineRender();
  ok('before 443: the line is hidden, no error', line.style.display==='none' && line.innerHTML==='' && !IIM.err);
  ok('no em dash anywhere it drew', !/—/.test(s.innerText));
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page()
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=iim'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', H)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

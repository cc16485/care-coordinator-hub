"""Long visits on the iPad (2026-10-29, home visit stage 2). The real Hub page, offline, a made-up family, a real browser
recorder on a pretend microphone, with parts shortened to 4 seconds so a 90-minute visit's behaviour shows in a minute.
Proves: an in-home assessment records in parts, each one a complete audio file of its own, uploaded while the recording
goes on into one folder and tied together (session, part number, where it starts); Pause holds the clock and Resume carries
on; a part that cannot upload waits on the device, says so, and goes up by itself when the connection is back; when the
iPad stops the microphone, everything so far is kept, the screen says so, and Keep recording carries on in the same
recording; Stop sends the last part; the list shows the visit as one recording with every part's transcript in order and
one player for all parts; a recording left on the device offers to upload; interviews still record as one file; the
visit screen fits a phone while recording; no em dashes or "AI" in the new words.
(python3 tests/browser/rec_parts_look.py; SHOTS=<dir> saves screenshots)"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = os.environ.get('SHOTS')
STUB = r"""
(()=>{
  const W=window; W.__log={ persists:[], invokes:[], uploads:[], rows:[], fail:false };
  (0,eval)(`
    const rows = window.__log.rows;
    const q = (tbl)=>{ let f=[], ord=null, ins=null, upd=null;
      const run = ()=>{ if(tbl!=='recordings') return { data:[], error:null };
        if(ins){ const r=Object.assign({ id:'rec_'+(rows.length+1), created_at:new Date(Date.now()+rows.length).toISOString(), status:'recorded' }, ins); rows.push(r); return { data:r, error:null }; }
        let out=rows.filter(r=>f.every(([k,v])=>String(r[k])===String(v)));
        if(upd){ out.forEach(r=>Object.assign(r,upd)); return { data:null, error:null }; }
        if(ord) out=out.slice().sort((a,b)=>(a[ord.k]>b[ord.k]?1:-1)*(ord.asc?1:-1));
        return { data:out, error:null }; };
      const p={ select(){return p;}, eq(k,v){ f.push([k,v]); return p;}, order(k,o){ ord={k, asc:!o||o.ascending!==false}; return p;}, limit(){return p;}, is(){return p;}, in(){return p;}, gte(){return p;},
        insert(o){ if(window.__log.failInsert) { ins=null; p.__err=window.__log.failInsert; } ins=o; return p; }, update(o){ upd=o; return p; },
        single:async()=>{ if(p.__err) return { data:null, error:{ message:p.__err } }; const r=run(); return { data:Array.isArray(r.data)?r.data[0]:r.data, error:null }; },
        maybeSingle:async()=>{ const r=run(); return { data:Array.isArray(r.data)?r.data[0]:r.data, error:null }; },
        then(a,b){ return Promise.resolve(run()).then(a,b); } }; return p; };
    sb={ from:q,
      storage:{ from:()=>({ upload:async(path, blob)=>{ if(window.__log.fail) return { error:{ message:'Failed to fetch' } };
          const head=[...new Uint8Array(await blob.slice(0,4).arrayBuffer())].map(x=>x.toString(16).padStart(2,'0')).join('');
          window.__log.uploads.push({ path, size:blob.size, head, type:blob.type }); return { error:null }; },
        createSignedUrl:async(p)=>({ data:{ signedUrl:'data:audio/webm;base64,' }, error:null }) }) },
      rpc:async()=>({data:null,error:null}),
      functions:{ invoke:async(n, o)=>{ window.__log.invokes.push(n); const r=rows.find(x=>x.id===(o&&o.body&&o.body.recording_id));
        if(n==='transcribe-recording' && r){ r.status='done'; r.turns=[{ speaker:'speaker_0', name:'Speaker A', start:1, end:3, text:'Words from part '+(r.part||1)+'.' }]; r.transcript='[0:01] Speaker A: Words from part '+(r.part||1)+'.'; }
        return {data:{ok:true},error:null}; } },
      auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };
    ME={ email:'krystal@mo-care.com', name:'Krystal Land' }; CC_ROLES=['owner_admin']; CC_ROLES_CHECKED=true;
    persist=async(k,v)=>{ window.__log.persists.push([k, JSON.parse(JSON.stringify(v))]); };
    tkMerge=async()=>({}); ccConfirm=async()=>true; ccToast=(m)=>{ window.__log.toast=m; }; alert=()=>{};`);
  DATA.ops_settings={}; DATA.care_assessments=[]; DATA.care_plans=[]; DATA.client_profiles=[];
  DATA.leads=[{ id:'lead_betty', first_name:'Karen', last_name:'Price (fake)', relationship:'Daughter', phone:'(417) 555-0172',
    client_first_name:'Betty', client_last_name:'Harlow (fake)', client_address:'1418 E Cherry St', client_city:'Springfield', client_state:'MO', client_zip:'65802',
    funding_source:'private', status:'Contacted' }];
  window.RECP_PART_SECS=4;
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,900)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, q=s=>document.querySelector('#hvRoot '+s), bar=()=>document.getElementById('hvBar').innerText;
  const until=async(fn,ms)=>{ const t=Date.now(); while(Date.now()-t<ms){ if(fn()) return true; await sleep(200); } return false; };
  await HV.open({ leadId:'lead_betty' }); await sleep(300);
  const a=DATA.care_assessments[0];
  q('#recConsent').click(); q('#recGo').click();
  await until(()=>RECP.state()==='recording', 10000); await sleep(1200);
  ok('an assessment records in parts: recording, Pause and Stop showing, the top bar counts', REC.parts===true && RECP.state()==='recording' && q('#recPauseB').style.display==='' && q('#recStopB').style.display==='' && /Recording 0:0\d/.test(bar()) && /Pause/.test(bar()), [RECP.state(), bar()]);
  ok('the visit screen says how to pause and not to lock the iPad', /Tap Pause at the top, then Resume/.test(q('.hv-sec[data-sec="0"]').innerText) && /don't lock it/.test(q('.hv-sec[data-sec="0"]').innerText));
  await until(()=>L.uploads.length>=2, 15000);
  const ups=L.uploads.slice(), rs=L.rows.slice();
  if(ups.length<2 || rs.length<2){ ok('parts upload while it is still recording', false, { st:RECP.state(), part:REC.part, ups:ups.length, rows:rs.length, pend:RECP._pending.size, err:q('#recErr').innerText, mime:REC.mime, cur:REC.cur&&{got:REC.cur.got, st:REC.cur.mr.state, off:REC.cur.offset}, one:REC.oneAtATime, el:RECP.elapsed() }); return R; }
  ok('parts upload while it is still recording', ups.length>=2 && RECP.state()==='recording', [ups.length, RECP.state()]);
  ok('each part is a complete audio file of its own (starts with the file header)', ups.every(u=>u.head==='1a45dfa3' && u.size>500), ups);
  ok('parts go into one folder, numbered in order', ups.every(u=>u.path.indexOf('assessment/'+a.id+'/'+REC.group+'/')===0) && ups[0].path.endsWith('/001.webm') && ups[1].path.endsWith('/002.webm'), ups.map(u=>u.path));
  ok('the rows tie them together: same session, part 1 and 2, the second starts about 4 seconds in, consent kept', rs[0].session_id===REC.group && rs[1].session_id===REC.group && rs[0].part===1 && rs[1].part===2 && rs[0].offset_seconds===0 && rs[1].offset_seconds>=3 && rs[1].offset_seconds<=7 && rs.every(r=>r.consent_given===true && r.kind==='assessment'), rs.map(r=>[r.part,r.offset_seconds,r.seconds]));
  ok('each part is written out as it arrives', L.invokes.filter(n=>n==='transcribe-recording').length>=2);
  ok('the screen says the parts are already at the office', /already sent to the office/.test(q('#recUp').innerText), q('#recUp').innerText);
  /* pause */
  q('[data-hva="pauserec"]').click(); await sleep(100);
  const t1=RECP.elapsed(); await sleep(2200); const t2=RECP.elapsed();
  ok('Pause: the clock holds, the bar says Paused with Resume', RECP.state()==='paused' && t2-t1<0.3 && /Paused/.test(bar()) && /Resume/.test(bar()) && REC.mr.state==='paused', [t1,t2,bar()]);
  q('[data-hva="resumerec"]').click(); await sleep(1200);
  ok('Resume: recording again, the clock moves', RECP.state()==='recording' && RECP.elapsed()>t2+0.5 && REC.mr.state==='recording');
  /* no connection */
  L.fail=true; const n0=L.uploads.length;
  await until(()=>RECP._pending.size>=1 && /waiting for a connection/.test(q('#recUp').innerText), 15000);
  ok('no connection: the part waits on the device and the screen says so', RECP._pending.size>=1 && /safe on this iPad and will go up by themselves/.test(q('#recUp').innerText) && /will try again by itself/.test(q('#recErr').innerText), [q('#recUp').innerText, q('#recErr').innerText]);
  const idb=(await recDbSessions()).filter(s=>s.group===REC.group && s.closed);
  ok('the waiting part is also kept in the device\'s storage', idb.length>=1, idb.length);
  L.fail=false; window.dispatchEvent(new Event('online'));
  await until(()=>RECP._pending.size===0 && L.uploads.length>n0, 8000);
  ok('connection back: it goes up by itself, in order, and the warning clears', RECP._pending.size===0 && L.uploads.length>n0 && q('#recErr').style.display==='none' && L.rows.map(r=>r.part).every((p,i,arr)=>i===0||p>arr[i-1]), L.rows.map(r=>r.part));
  /* the iPad takes the microphone away */
  const partsBefore=REC.part, grp=REC.group;
  REC.stream.getAudioTracks()[0].dispatchEvent(new Event('ended')); await sleep(800);
  ok('the iPad stopped the microphone: kept so far, the screen and bar say so, Keep recording offered', RECP.state()==='lost' && /The recording stopped at/.test(q('#recLost').innerText) && /Everything up to then is saved/.test(q('#recLost').innerText) && /Recording stopped at/.test(bar()) && /Keep recording/.test(bar()), [RECP.state(), q('#recLost').innerText, bar()]);
  const tl=RECP.elapsed(); await sleep(1500);
  ok('while stopped, the clock does not run', Math.abs(RECP.elapsed()-tl)<0.3);
  q('[data-hva="keeprec"]').click();
  await until(()=>RECP.state()==='recording', 4000);
  ok('Keep recording carries on in the same recording, the next part number, from where it stopped', RECP.state()==='recording' && REC.group===grp && REC.part===partsBefore+1 && Math.abs(REC.cur.offset-tl)<=1 && q('#recLost').style.display==='none', [REC.group===grp, REC.part, partsBefore, REC.cur.offset, tl]);
  await sleep(1500);
  /* stop */
  const total=RECP.elapsed();
  q('[data-hva="stoprec"]').click();
  await until(()=>RECP.state()==='off' && RECP._pending.size===0, 8000); await sleep(600);
  const all=L.rows.filter(r=>r.session_id===grp).sort((x,y)=>x.part-y.part);
  ok('Stop: the last part goes up, the recorder is ready again', RECP.state()==='off' && !q('#recGo').disabled===false && q('#recGo').style.display==='' && all.length>=4, [RECP.state(), all.length]);
  ok('parts start in order and together cover the whole recording', all.every((r,i)=>i===0||r.offset_seconds>=all[i-1].offset_seconds) && Math.abs((all[all.length-1].offset_seconds+all[all.length-1].seconds)-total)<=3, all.map(r=>[r.part,r.offset_seconds,r.seconds,total]));
  ok('nothing left over on the device', (await recDbSessions()).filter(s=>s.group===grp).length===0);
  /* the list */
  await recLoadList(); await sleep(100);
  const list=q('#recList').innerText;
  ok('the list shows the visit as one recording with its parts', (list.match(/parts/g)||[]).length>=1 && new RegExp(all.length+' parts').test(list) && q('#recList').querySelectorAll('details').length===1, list.slice(0,400));
  q('#recList details').open=true;
  const tr=q('#recList details').innerText;
  ok('one transcript, every part in order with its start time', all.every(r=>tr.includes('Part '+r.part+' · from')) && tr.indexOf('Words from part 1.')<tr.indexOf('Words from part 2.'), tr.slice(0,500));
  ok('the transcript explains voices are labelled again in each part', /labelled again in each 10-minute part/.test(tr));
  q('#recList button.fb').click(); await sleep(400);
  ok('Listen: one player with a button for each part', q('#recList audio') && q('#recList').querySelectorAll('[data-recp]').length===all.length);
  /* left on the device */
  await recDbPutSess({ id:'old-9#1', kind:'assessment', subject:String(a.id), label:'everyone in the room', startedAt:Date.now()-3600e3, mime:'audio/webm', by:'Krystal Land', group:'old-9', part:1, offset:0, secs:5, closed:true });
  await recDbPutChunk('old-9#1', new Blob([new Uint8Array([0x1a,0x45,0xdf,0xa3,1,2,3])], { type:'audio/webm' }));
  await recRecoverShow(); await sleep(100);
  const box=q('#recRecover').innerText;
  ok('a visit recording left on the device: offered to upload', /A visit recording from .* has 1 part saved on this device/.test(box), box);
  [...q('#recRecover').querySelectorAll('button')].find(b=>/Upload/.test(b.innerText)).click();
  await until(()=>L.rows.some(r=>r.session_id==='old-9'), 4000); await sleep(300);
  ok('Upload it: in, tied to its session, gone from the device', L.rows.some(r=>r.session_id==='old-9' && r.part===1) && (await recDbSessions()).every(s=>s.group!=='old-9') && !/A visit recording/.test(q('#recRecover').innerText));
  const words=document.getElementById('hvRoot').innerText;
  ok('no "AI" and no em dashes', !/\bAI\b/.test(words) && !/—/.test(words), (words.match(/.{30}(\bAI\b|—).{30}/)||[])[0]);
  await HV.close(); await sleep(100);
  /* interviews: unchanged, one file */
  const host=document.createElement('div'); host.id='ivRec'; document.body.appendChild(host);
  recMount('ivRec','interview','app_7','Jordan (fake)'); await sleep(100);
  document.getElementById('recConsent').click(); await recStart(); await sleep(2500);
  ok('an interview is not split', REC.parts!==true && REC.mr && REC.mr.state==='recording');
  recStop(); await until(()=>L.rows.some(r=>r.kind==='interview'), 5000);
  const iv=L.rows.find(r=>r.kind==='interview');
  ok('an interview uploads as one file, no session or part', iv && !iv.session_id && !iv.part && /^interview\/app_7\/\d+\.webm$/.test(iv.storage_path), iv);
  return R;
}
"""
PHONE = r"""
async()=>{ const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  await HV.open({ leadId:'lead_betty' }); await sleep(300);
  const q=s=>document.querySelector('#hvRoot '+s); q('#recConsent').click(); q('#recGo').click();
  const t=Date.now(); while(RECP.state()!=='recording' && Date.now()-t<10000) await sleep(200); await sleep(1200); return RECP.state(); }
"""
MIME = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.json':'application/json', '.webmanifest':'application/json'}
def serve(route):
    url = route.request.url
    if 'supabase.co' in url: return route.abort()
    if not url.startswith('http://localhost:8799/'): return route.continue_()
    p = (ROOT / url.split('http://localhost:8799/', 1)[1].split('?')[0].split('#')[0])
    if not p.is_file(): return route.fulfill(status=404, body='')
    route.fulfill(status=200, body=p.read_bytes(), content_type=MIME.get(p.suffix, 'application/octet-stream'))
def overflow(pg):
    return pg.evaluate("()=>{ const r=document.getElementById('hvRoot'); if(!r) return 'no visit'; const w=r.clientWidth; return [...r.querySelectorAll('*')].filter(e=>{ const b=e.getBoundingClientRect(); return b.width>0 && b.right>w+1 && !e.closest('.hv-rail'); }).slice(0,4).map(e=>e.className+' '+Math.round(e.getBoundingClientRect().right)); }")
ARGS = ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--unsafely-treat-insecure-origin-as-secure=http://localhost:8799', '--autoplay-policy=no-user-gesture-required']
R = []
with sync_playwright() as pw:
    b = pw.chromium.launch(args=ARGS)
    for label, vp in [('iPad', {'width': 1180, 'height': 820}), ('phone', {'width': 390, 'height': 844})]:
        cx = b.new_context(viewport=vp, timezone_id='America/Chicago', has_touch=True, permissions=['microphone']); pg = cx.new_page()
        pg.route('**/*', serve)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        pg.goto('http://localhost:8799/index.html?proof=rp'); pg.wait_for_timeout(1500)
        pg.evaluate('s=>(0,eval)(s)', STUB)
        if label == 'iPad':
            R += pg.evaluate(T)
        else:
            st = pg.evaluate(PHONE)
            o = overflow(pg); R.append(['PASS' if st == 'recording' and not o else 'FAIL', 'phone (390 wide) while recording: Pause and Stop fit', [st, o]])
            if SHOTS: os.makedirs(SHOTS, exist_ok=True); pg.screenshot(path=os.path.join(SHOTS, 'rp-phone.png'))
            pg.evaluate("()=>{ const x=document.querySelector('[data-hva=\"pauserec\"]'); x&&x.click(); }"); pg.wait_for_timeout(200)
            o = overflow(pg); R.append(['PASS' if not o else 'FAIL', 'phone (390 wide) paused: Resume and Stop fit', o])
            pg.evaluate("()=>{ try{ RECP.lost(); }catch(e){} }"); pg.wait_for_timeout(300)
            o = overflow(pg); R.append(['PASS' if not o else 'FAIL', 'phone (390 wide) stopped by the iPad: Keep recording and Stop fit', o])
            if SHOTS: pg.screenshot(path=os.path.join(SHOTS, 'rp-phone-lost.png'))
        if label == 'iPad' and SHOTS:
            os.makedirs(SHOTS, exist_ok=True)
            pg.evaluate("async()=>{ await HV.open({ leadId:'lead_betty' }); }"); pg.wait_for_timeout(500)
            pg.evaluate("()=>{ const d=document.querySelector('#recList details'); if(d) d.open=true; }"); pg.screenshot(path=os.path.join(SHOTS, 'rp-ipad-list.png'))
        R.append(['PASS' if not errs else 'FAIL', f'{label}: no page errors', errs[:3]])
        cx.close()
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

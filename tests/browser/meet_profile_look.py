"""1542 (2026-11-20, Samantha: "how we get the recording into the applicant and caregiver profile"): a Google Meet video
interview on the applicant's profile (Application & interview tab) AND on the hired caregiver's profile: transcript, a
Watch the video link until its 30-day date, no Listen buttons (the Hub holds no audio for it); a Hub audio recording is
as before. Offline, served from disk, made-up people, every Supabase answer faked. python3 tests/browser/meet_profile_look.py"""
from playwright.sync_api import sync_playwright
import os, mimetypes
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
T = r"""
async()=>{ const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const APID='0b7e6a1c-1111-4222-8333-444455556666';
  const turns=[{ start:0, name:'Katlin Haraldson', text:'Tell me about yourself.' }, { start:65, name:'Maria', text:'I cared for my grandmother for three years.' }];
  const base={ kind:'interview', subject_id:APID, status:'done', consent_given:true, created_at:'2026-11-20T23:30:00Z', seconds:1260, turns, transcript:'x' };
  const meet=Object.assign({}, base, { id:'m1', source:'meet', storage_path:null, video_url:'https://drive.google.com/file/d/FILE1/view', video_delete_after:'2026-12-20T23:30:00Z' });
  const hub=Object.assign({}, base, { id:'h1', source:'hub', storage_path:'interview/ap1/1.webm' });
  window.__DB={ job_applicants:[{ id:APID, first_name:'Maria', last_name:'Example', position:'caregiver', status:'hired', post_interview:{ notes:'ok' } }], recordings:[meet], interview_reviews:[] };
  window.__SEL=[];
  sb.from=(t)=>{ const f=[]; const b={ select(c){ window.__SEL.push([t,c]); return b; }, order(){return b;}, limit(){return b;}, in(){return b;}, gte(){return b;}, eq(c,v){ f.push([c,v]); return b; },
      maybeSingle(){ return b.then(x=>({data:(x.data||[])[0]||null,error:null})); },
      then(okf){ let d=(window.__DB[t]||[]); f.forEach(([c,v])=>{ d=d.filter(x=>x[c]===undefined||String(x[c])===String(v)); }); return Promise.resolve({data:JSON.parse(JSON.stringify(d)),error:null}).then(okf); } }; return b; };
  const host=document.createElement('div'); document.body.appendChild(host);
  await IR.mount(host, { id:APID });
  let t=host.textContent, a=host.querySelector('a[href*="drive.google.com"]');
  ok('applicant profile, Meet interview: the transcript with both speakers', /Recording and transcript/.test(t) && /Katlin Haraldson/.test(t) && /cared for my grandmother/.test(t), t.slice(0,500));
  ok('...says "from Google Meet" with a Watch the video link that opens in a new tab, until Dec 20', /from Google Meet/.test(t) && a && a.target==='_blank' && /Watch the video/.test(a.textContent) && /until Dec (19|20)/.test(t), t.slice(0,500));
  ok('...the times are plain (no Listen buttons: there is no audio file in the Hub)', !host.querySelector('button[onclick^="IR.play"]') && /1:05/.test(t), host.innerHTML.slice(0,400));
  ok('...Analyze Interview is offered (only on a tap)', /Analyze Interview/.test(t));
  ok('...reads every column, so it works before and after the new columns exist', window.__SEL.some(x=>x[0]==='recordings' && x[1]==='*'), window.__SEL);
  window.__DB.recordings=[Object.assign({}, meet, { video_url:null, video_deleted_at:'2026-12-21T00:00:00Z' })]; await IR.mount(host, { id:APID });
  ok('after 30 days: "video deleted after 30 days, transcript kept", no link, transcript still there', /video deleted after 30 days, transcript kept/.test(host.textContent) && !host.querySelector('a[href*="drive"]') && /cared for my grandmother/.test(host.textContent), host.textContent.slice(0,400));
  window.__DB.recordings=[Object.assign({}, meet, { video_url:'javascript:alert(1)"><b>x' })]; await IR.mount(host, { id:APID });
  ok('a link that is not Google Drive is never shown as a link', !host.querySelector('a') && !/<b>x/.test(host.innerHTML), host.innerHTML.slice(0,300));
  window.__DB.recordings=[hub]; await IR.mount(host, { id:APID });
  ok('a Hub audio recording is as before (times you tap to listen, no Meet words)', host.querySelector('button[onclick^="IR.play"]') && !/Google Meet|Watch the video/.test(host.textContent), host.innerText.slice(0,300));
  /* the hired caregiver's page carries the same card */
  window.__DB.recordings=[meet];
  ['cgdApInterview','cgdApHire'].forEach(id=>{ if(!document.getElementById(id)){ const d=document.createElement('div'); d.id=id; document.body.appendChild(d); } });
  (0,eval)("CGD.openId='ax77'; CGD_APP=null; AP_ROWS.length=0; AP_ROWS.push(window.__DB.job_applicants[0]);");
  let err=''; try{ await cgdAppHalfMount('ax77', APID); }catch(e){ err=String(e&&e.message||e); } await sleep(300);
  const ch=document.getElementById('cgdIrHost'), ct=document.getElementById('cgdApInterview').innerText;
  ok('caregiver profile: an "Interview recording and review" card under Application & interview', !err && /Interview recording and review/i.test(ct) && !!ch, err||ct.slice(0,400));
  ok('...with the same transcript and Watch the video link', ch && /cared for my grandmother/.test(ch.textContent) && !!ch.querySelector('a[href*="drive.google.com"]'), ch&&ch.innerText.slice(0,400));
  return R; }
"""
def serve(route):
    path = route.request.url.split('://', 1)[1].split('/', 1)[1].split('?')[0] or 'index.html'
    f = os.path.join(ROOT, path)
    if os.path.isfile(f):
        route.fulfill(path=f, content_type=mimetypes.guess_type(f)[0] or 'application/octet-stream')
    else:
        route.fulfill(status=404, body='')
with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []
    d = b.new_page(viewport={'width': 1280, 'height': 900})
    d.route('**/*', lambda r: serve(r) if r.request.url.startswith('http://hub.test/') else (r.abort() if ('supabase.co' in r.request.url or 'leadconnectorhq' in r.request.url) else r.continue_()))
    d.on('pageerror', lambda e: errs.append(str(e)[:200]))
    d.goto('http://hub.test/index.html?proof=meetprofile'); d.wait_for_timeout(1500)
    R = d.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, dd in R: print(s_, '·', n, '' if s_ == 'PASS' else dd)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

"""1542 (2026-11-18): a Google Meet video interview on the applicant's Interview tab: transcript like any interview, a
"Watch the video" link until its 30-day date, then "video deleted after 30 days, transcript kept". A Hub audio recording
looks as before. Offline, served from disk, made-up rows. python3 tests/browser/meet_recording_row_look.py"""
from playwright.sync_api import sync_playwright
import os, mimetypes
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
T = r"""
async()=>{ const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]);
  const base={ kind:'interview', subject_id:'ap1', status:'done', consent_given:true, created_at:'2026-11-20T00:30:00Z', seconds:1260, recorded_by:'Katlin',
    turns:[{ start:0, name:'Katlin Haraldson', text:'Tell me about yourself.' }, { start:5, name:'Maria', text:'I cared for my grandmother.' }], transcript:'x' };
  const meet=Object.assign({}, base, { id:'m1', source:'meet', storage_path:null, video_url:'https://drive.google.com/file/d/FILE1/view', video_delete_after:'2026-12-20T00:30:00Z' });
  const gone=Object.assign({}, base, { id:'m2', source:'meet', storage_path:null, video_url:null, video_deleted_at:'2026-12-21T00:00:00Z' });
  const hub=Object.assign({}, base, { id:'h1', source:'hub', storage_path:'interview/ap1/1.webm' });
  const box=document.createElement('div'); document.body.appendChild(box);
  box.innerHTML=recListHtml([meet]); const t1=box.innerText, a=box.querySelector('a[href*="drive.google.com"]');
  ok('Meet row: "from Google Meet", a Watch the video link that opens in a new tab, until Dec 20', /from Google Meet/.test(t1) && a && a.target==='_blank' && /Watch the video/.test(a.innerText) && /until Dec 20|until Dec 19/.test(t1), t1);
  ok('...no Listen button (there is no audio file in the Hub)', !/Listen/.test(t1), t1);
  ok('...the transcript, Analyze Interview and Fill the answers are there like any interview', /Read the transcript/.test(t1) && /Fill the answers/.test(t1) && (!window.IR || /Analyze Interview/.test(t1)), t1);
  box.innerHTML=recListHtml([gone]);
  ok('after 30 days: "video deleted after 30 days, transcript kept", no link', /video deleted after 30 days, transcript kept/.test(box.innerText) && !box.querySelector('a[href*="drive"]'), box.innerText);
  box.innerHTML=recListHtml([hub]);
  ok('a Hub audio recording looks as before (Listen, no Meet words)', /Listen/.test(box.innerText) && !/Google Meet|Watch the video/.test(box.innerText), box.innerText);
  box.innerHTML=recListHtml([Object.assign({}, meet, { video_url:'javascript:alert(1)"><b>x' })]);
  ok('a link that is not Google Drive is never shown as a link', !box.querySelector('a') && !/<b>x/.test(box.innerHTML), box.innerHTML.slice(0,300));
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
    d.goto('http://hub.test/index.html?proof=meetrec'); d.wait_for_timeout(1500)
    R = d.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, dd in R: print(s_, '·', n, '' if s_ == 'PASS' else dd)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

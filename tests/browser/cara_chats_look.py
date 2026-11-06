"""Ask Cara chats (Team, beside Inbox, 2026-11-05). The real Hub page, offline (files served from this folder), made-up chats and
leads only; nothing is saved, sent or called. Checks: the pill and panel, one card per chat, single questions from before chats
had an id, the link to the lead who left their number, the two filters, search, reading a chat, a refused read says Desktop 1314,
and visitor text is shown as text. (python3 tests/browser/cara_chats_look.py; SHOTS=<dir> saves screenshots)"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = os.environ.get('SHOTS')
STUB = r"""
(()=>{
  const W=window, at=(hm,d)=>new Date('2026-11-'+(d||'05')+'T'+hm+':00-06:00').toISOString();
  W.__log={ fn:[], queries:[] };
  W.__rows=[
    { id:1, asked_at:at('09:00','03'), question:'Do you take Medicaid? (fake)', reply:'Our sister company helps with that. (fake)', outcome:'answered', session_id:null },
    { id:2, asked_at:at('10:00'), question:'How much does care cost? (fake)', reply:'Our rate is $30 an hour. (fake)', outcome:'answered', session_id:'cabc12345' },
    { id:3, asked_at:at('10:02'), question:'Do you cover Ozark? (fake)', reply:'I do not have a confirmed answer. Please call. (fake)', outcome:'none', session_id:'cabc12345' },
    { id:5, asked_at:at('12:00'), question:'do you accept medicaid', reply:'(install check)', outcome:'answered', session_id:'desktop-1149-check' },
    { id:4, asked_at:at('11:00'), question:'<b>bold</b><img src=x onerror="window.__xss=1"> hi (fake)', reply:'Hello! (fake)', outcome:'answered', session_id:'cxyz98765' },
  ];
  W.__deny=false;
  (0,eval)(`sb={ from:(t)=>{ const q={t,eq:[]}; window.__log.queries.push(q); const p={ select(s){q.sel=s;return p;}, eq(a,b){q.eq.push([a,b]);return p;}, order(){return p;}, limit(n){q.limit=n;return p;},
      then(a){ return Promise.resolve(window.__deny?{data:null,error:{message:'permission denied for table kb_answer_log',code:'42501'}}:{data:window.__rows.slice().reverse(),error:null}).then(a); } }; return p; },
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async(n)=>{ window.__log.fn.push(n); return {data:null,error:null}; } },
    auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };`);
  DATA.leads=[{ id:'L1', first_name:'Pat', last_name:'Lee (fake)', interest_notes:'Asked for a call back in Ask Cara on the website (Ask Cara chat cabc12345). First question: "How much"' },
              { id:'L2', first_name:'Other', last_name:'Lead', interest_notes:'Called the office' }];
  W.__opened=[]; W.openLeadProfile=(id)=>W.__opened.push(id);
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const box=()=>document.getElementById('cchats_box'), txt=()=>box().innerText;
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  ok('the Ask Cara chats pill sits in the Team bar right after Inbox', (()=>{ const p=[...document.querySelectorAll('#fsub-team .fpill')].map(x=>x.dataset.tab); return p[0]==='inbox'&&p[1]==='carachats'; })());
  switchTab('carachats'); await sleep(600);
  ok('the page loads', !!window.CCHATS && /Ask Cara chats/.test(txt()), txt().slice(0,200));
  const q=window.__log.queries[0]||{};
  ok('it reads only the website chat log, read only', q.t==='kb_answer_log' && q.eq.some(e=>e[0]==='channel'&&e[1]==='cara') && !/\*/.test(q.sel||''), q);
  ok('three chats: two with ids, one old single question', /All chats \(3\)/.test(txt()) && /single question, saved before chats were grouped/.test(txt()), txt());
  ok('Desktop install checks are hidden and counted', !/install check/.test(txt()) && /1 test questions from Desktop install steps are not shown/.test(txt()), txt());
  ok('the two-question chat is one card, newest chat first', /2 questions/.test(txt()) && txt().indexOf('bold')<txt().indexOf('How much does care cost'), txt());
  ok('it says Cara could not answer one', /Cara could not answer 1/.test(txt()));
  const btn=[...box().querySelectorAll('button')].find(b=>/Left their number: Pat Lee/.test(b.innerText));
  ok('the chat links to the lead who left their number', !!btn && /Left their number \(1\)/.test(txt()));
  btn && btn.click(); await sleep(50);
  ok('...and opens that lead', window.__opened.join()==='L1', window.__opened);
  ok('visitor text shows as text, never as page code', !window.__xss && !box().querySelector('img') && /<b>bold<\/b>/.test(txt()));
  CCHATS.toggle('s:cabc12345'); await sleep(50);
  ok('reading a chat shows both questions and both answers in order, with how Cara answered', (()=>{ const t=txt(); const a=t.indexOf('How much does care cost'), b=t.indexOf('Our rate is $30'), c=t.indexOf('Do you cover Ozark'), d=t.indexOf('confirmed answer'); return a>-1&&a<b&&b<c&&c<d && /Nothing on file, told them to call/.test(t) && /Answered from our approved answers/.test(t); })(), txt());
  CCHATS.filter('lead'); await sleep(30);
  ok('Left their number shows only that chat', /How much does care cost/.test(txt()) && !/Medicaid/.test(txt()) && !/bold/.test(txt()));
  CCHATS.filter('missed'); await sleep(30);
  ok('Cara could not answer shows only chats with a miss', /How much does care cost/.test(txt()) && !/Medicaid/.test(txt()));
  CCHATS.filter('all'); CCHATS.search('medicaid'); await sleep(30);
  ok('search finds the old single question', /Medicaid/.test(txt()) && !/How much does care cost/.test(txt()));
  CCHATS.search(''); window.__deny=true; CCHATS.reload(); await sleep(200);
  ok('a refused read says what it waits for (Desktop 1314), never a blank page', /waits for Desktop step 1314/.test(txt()), txt());
  ok('nothing was sent or saved', window.__log.fn.length===0);
  return R;
}
"""
MIME = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.json':'application/json', '.webmanifest':'application/json'}
def serve(route):
    url = route.request.url
    if 'supabase.co' in url: return route.abort()
    if not url.startswith('http://carachats.local/'): return route.continue_()
    p = (ROOT / url.split('http://carachats.local/', 1)[1].split('?')[0].split('#')[0])
    if not p.is_file(): return route.fulfill(status=404, body='')
    route.fulfill(status=200, body=p.read_bytes(), content_type=MIME.get(p.suffix, 'application/octet-stream'))
with sync_playwright() as pw:
    b = pw.chromium.launch(); cx = b.new_context(viewport={'width': 1280, 'height': 1000}, timezone_id='America/Chicago'); pg = cx.new_page()
    pg.clock.install(time='2026-11-05T12:00:00-06:00'); pg.clock.resume()
    pg.route('**/*', serve)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://carachats.local/index.html?proof=carachats'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    if SHOTS:
        pg.evaluate("async()=>{ window.__deny=false; CCHATS.reload(); await new Promise(r=>setTimeout(r,300)); CCHATS.toggle('s:cabc12345'); }")
        pg.wait_for_timeout(200); pg.screenshot(path=os.path.join(SHOTS, 'cara_chats.png'))
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

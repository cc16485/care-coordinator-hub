"""The shift page link pilot and the follow-up {link} (2026-10-24). The real Hub page, offline, made-up caregivers. Proves:
owners choose up to 6 pilot caregivers in Settings, Callout texts (saved through tkMerge, recorded); others see the list
read-only; with the switch on the card says everyone gets a link; the follow-up box offers "With their shift page link"
only when someone can get one, starts from it when the switch is on, and says {link} becomes each person's own link.
(python3 tests/browser/shift_link_pilot_look.py)"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
STUB = r"""
(()=>{
  const W=window; W.__log={ merges:[] };
  (0,eval)(`sb={ from:()=>{ const p={ select(){return p;}, eq(){return p;}, gte(){return p;}, in(){return p;}, order(){return p;}, limit(){return p;},
      single:async()=>({ data:null, error:null }), maybeSingle:async()=>({ data:null, error:null }),
      then(a){ return Promise.resolve({data:[],error:null}).then(a); } }; return p; },
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async()=>({data:null,error:null}) },
    auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };
    ME={ email:'samantha@mo-care.com', name:'Samantha Troutman' }; CC_ROLES=['owner_admin']; CC_ROLES_CHECKED=true;
    tkMerge=async(apply,what)=>{ const m=JSON.parse(JSON.stringify(DATA.ops_settings||{})); const ch=apply(m,DATA.ops_settings||{}); DATA.ops_settings=m; window.__log.merges.push([what,ch,m.shift_link_pilot]); return { changed:ch||[], error:null }; };`);
  DATA.ops_settings={};
  DATA.caregivers=[{ first:'Pat', last:'Prn (fake)', axiscare_id:'9001', active:true }, { first:'Maria', last:'Lane (fake)', axiscare_id:'9002', active:true }, { first:'Old', last:'Gone (fake)', axiscare_id:'9003', active:false }];
  DATA.coverage_cases=[{ id:'f1', status:'open', client:'Ruth Kay (fake)', shift_date:'2026-10-31', shift_time:'08:00-17:00',
    asked:[{ id:'a1', name:'Pat Prn (fake)', state:'waiting', picked_by_coordinator:true, phone:'4175550101', axiscare_id:'9001' }, { id:'a2', name:'Maria Lane (fake)', state:'waiting', picked_by_coordinator:true, phone:'4175550102', axiscare_id:'9002' }] }];
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,900)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const host=()=>document.getElementById('slpHost').innerText, L=window.__log;
  SLP.render();
  ok('Settings, Callout texts: the pilot card says the link is off for everyone and nobody is in the pilot yet', /Shift page link: pilot caregivers/.test(host()) && /The link is off for everyone/.test(host()) && /Nobody yet/.test(host()), host());
  SLP.toggle(); await sleep(50);
  const opts=[...document.querySelectorAll('#slpPick option')].map(o=>o.textContent);
  ok('owners choose from active caregivers only', opts.includes('Pat Prn (fake)') && opts.includes('Maria Lane (fake)') && !opts.some(o=>/Old Gone/.test(o)), opts);
  document.getElementById('slpPick').value='9001'; await SLP.add(); await sleep(50);
  ok('add Pat (PRN): saved through tkMerge as { axiscare_id, name }, recorded', JSON.stringify(DATA.ops_settings.shift_link_pilot)==='[{"axiscare_id":"9001","name":"Pat Prn (fake)"}]' && /added Pat Prn \(fake\) to the shift page link pilot/.test(JSON.stringify(L.merges)) && /Pat Prn \(fake\)/.test(host()), [DATA.ops_settings, L.merges]);
  ok('... and Pat is no longer offered to add again', ![...document.querySelectorAll('#slpPick option')].some(o=>/Pat Prn/.test(o.textContent)));
  /* the follow-up box */
  const fb=document.createElement('div'); fb.id='covFollow_f1'; document.body.appendChild(fb);
  covFollowOpen('f1'); await sleep(50);
  ok('follow-up: with a pilot, "With their shift page link" is offered; the box starts from today\'s wording (the switch is off)', [...fb.querySelectorAll('button')].some(b=>/With their shift page link/.test(b.textContent)) && !/\{link\}/.test(document.getElementById('covFollowMsg_f1').value) && /only pilot caregivers can get one/.test(fb.innerText), fb.innerText.slice(0,600));
  covFollowPreset('f1','link');
  ok('... the link preset: "Here are the details again: {link} Or reply YES or NO."', /Here are the details again: \{link\} Or reply YES or NO\./.test(document.getElementById('covFollowMsg_f1').value), document.getElementById('covFollowMsg_f1').value);
  SLP.remove('9001'); await sleep(50); covFollowOpen('f1'); await sleep(50);
  ok('nobody in the pilot and the switch off: no link preset at all', ![...fb.querySelectorAll('button')].some(b=>/shift page link/.test(b.textContent)) && JSON.stringify(DATA.ops_settings.shift_link_pilot)==='[]');
  DATA.ops_settings.shift_link_texts_live=true; covFollowOpen('f1'); await sleep(50); SLP.render();
  ok('switch on: the follow-up starts from the link wording, and the pilot card says the list no longer matters', /\{link\}/.test(document.getElementById('covFollowMsg_f1').value) && /becomes each person's own shift page link\./.test(fb.innerText) && /This list no longer matters/.test(host()));
  (0,eval)("CC_ROLES=['care_coordinator']"); DATA.ops_settings.shift_link_texts_live=false; DATA.ops_settings.shift_link_pilot=[{axiscare_id:'9002',name:'Maria Lane (fake)'}]; SLP.render();
  ok('a coordinator sees the pilot list read-only (owners choose)', /Maria Lane/.test(host()) && /Owners choose the pilot caregivers/.test(host()) && !document.getElementById('slpPick'));
  return R;
}
"""
MIME = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.json':'application/json', '.webmanifest':'application/json'}
def serve(route):
    url = route.request.url
    if 'supabase.co' in url: return route.abort()
    if not url.startswith('http://slp.local/'): return route.continue_()
    p = (ROOT / url.split('http://slp.local/', 1)[1].split('?')[0].split('#')[0])
    if not p.is_file(): return route.fulfill(status=404, body='')
    route.fulfill(status=200, body=p.read_bytes(), content_type=MIME.get(p.suffix, 'application/octet-stream'))
with sync_playwright() as pw:
    b = pw.chromium.launch(); cx = b.new_context(viewport={'width': 1280, 'height': 900}, timezone_id='America/Chicago'); pg = cx.new_page()
    pg.route('**/*', serve)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://slp.local/index.html?proof=slp'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

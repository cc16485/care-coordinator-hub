"""A red flag closes by its steps (Samantha 2026-11-05, "ok lets build" on the rule: close once someone called the caregiver
and either told the family or started an incident report; Not a concern says why; Watch it never closes it). Behind
ops_settings.calmer_mywork_live. The real Hub page served from this checkout, offline, made-up people; saves are recorded,
never sent. (python3 tests/browser/red_flag_close_look.py)"""
import os, sys, re, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
STUB = re.search(r'STUB = r"""(.*?)"""', open(ROOT / 'tests/browser/my_work_tiers_look.py').read(), re.S).group(1)
MIME = {'.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/json'}
def serve(route):
    url = route.request.url
    if 'supabase.co' in url: return route.abort()
    if not url.startswith('http://flag.local/'): return route.continue_()
    p = ROOT / url.split('http://flag.local/')[1].split('?')[0]
    if not p.is_file(): return route.fulfill(status=404, body='')
    route.fulfill(status=200, body=p.read_bytes(), content_type=MIME.get(p.suffix, 'application/octet-stream'))
SETUP = r"""(live)=>{
  const I=h=>new Date(Date.now()+h*36e5).toISOString();
  const red=(id,o)=>Object.assign({ id, kind:'care_note', status:'open', level:'red', flag_kind:'a fall or injury', why:'Ruth slipped getting out of the bath.', about:'Ruth Barnes (fake)',
    caregiver:'Kim Aide', caregiver_phone:'4175550909', client_ax:'601', visit_day:'Mon, Oct 5', owner:'krystal@mo-care.com', owner_name:'Krystal Land', created_at:I(-2), due:I(2),
    title:'Red flag: Ruth (fake)', detail:'"Ruth slipped getting out and hit her arm on the sink."' }, o||{});
  DATA.ops_items=[ red('r1'), red('r2'), red('r3'), red('r4'), red('r5'),
    Object.assign(red('y1'), { level:'yellow', title:'Yellow flag: Patsy (fake)' }) ];
  DATA.ops_settings={ calmer_mywork_live:!!live };
  (0,eval)("OPS_DOMAINS=[{ code:'incidents', label:'Incidents', owner_person:'p_s', entity:'cc_ihs' }];");
  window.INC=undefined; window.n3Open=()=>{};
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Land', shift:'day' };");
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  switchTab('mywork'); myWorkGo('today');
}"""
T = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const it=id=>DATA.ops_items.find(x=>x.id===id);
  /* switch off: nothing closes by itself */
  await cnDid('r1','called'); it('r1').family_contacts=[{ name:'Ann', how:'text', at:new Date().toISOString() }]; await cnCloseIfDone(it('r1'));
  ok('switch off: called + family told does not close it (as before)', it('r1').status==='open');
  DATA.ops_settings.calmer_mywork_live=true;
  myWorkGo('today'); await sleep(150);
  ok('with Calmer My Work on, a red flag is on Today (never folded into reminders)', !!document.querySelector('#tab-mywork .wkcard[data-id="r2"]') && !CMW.groups().rem.some(x=>x.id==='r2'), [...document.querySelectorAll('#tab-mywork .wkcard')].map(c=>c.dataset.id).concat(['rem:'], CMW.groups().rem.map(x=>x.id)));
  await cnCloseIfDone(it('r1'));
  ok('switch on: called + family told (a sent text) closes it, saying how', it('r1').status==='done' && /Called the caregiver and told the family/.test(it('r1').close_note), it('r1'));
  await cnDid('r2','called');
  ok('called only: stays open', it('r2').status==='open');
  await cnStep('r2','family'); await sleep(50);
  ok('opening the Tell the family draft is not telling them: stays open', it('r2').status==='open');
  it('r2').family_contacts=[{ name:'Ann', how:'call', at:new Date().toISOString() }]; await cnCloseIfDone(it('r2'));
  ok('a recorded call to the family closes it', it('r2').status==='done');
  await cnDid('r3','called'); await cnStep('r3','incident'); await sleep(80);
  ok('called + incident report closes it', it('r3').status==='done' && /started an incident report/.test(it('r3').close_note), it('r3').close_note);
  await cnStep('r4','incident'); await sleep(80);
  ok('incident without calling the caregiver: stays open', it('r4').status==='open');
  await cnStep('r4','watch'); await sleep(50);
  ok('Watch it never closes it (it waits for its date)', it('r4').status==='open' && it('r4').sub_state==='waiting');
  await cnStep('r5','ok'); await sleep(50);
  ok('Not a concern on a red flag asks why first, and does not close yet', it('r5').status==='open' && !!document.getElementById('cnOkWhy_r5'));
  await cnOkSave('r5'); await sleep(30);
  ok('...an empty reason is refused in words', it('r5').status==='open' && /Write a few words first/.test(document.getElementById('cnOkErr_r5').textContent));
  document.getElementById('cnOkWhy_r5').value='She was tired, ate lunch, back to normal'; await cnOkSave('r5'); await sleep(30);
  ok('...with a reason it closes, keeping the reason', it('r5').status==='done' && it('r5').close_note==='Not a concern: She was tired, ate lunch, back to normal');
  await cnDid('y1','called'); it('y1').family_contacts=[{ name:'Ann', how:'text', at:new Date().toISOString() }]; await cnCloseIfDone(it('y1'));
  ok('a yellow flag is not touched by this rule', it('y1').status==='open');
  await cnStep('y1','ok'); await sleep(50);
  ok('...and its Not a concern closes straight away, as before', it('y1').status==='done' && it('y1').close_note==='Not a concern');
  ok('no em dash in what a person reads', !/—/.test(DATA.ops_items.map(x=>x.close_note||'').join(' ')));
  return R; }"""
R = []
with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []
    cx = b.new_context(viewport={'width': 1280, 'height': 1000}, timezone_id='America/Chicago'); pg = cx.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.route('**/*', serve); pg.goto('http://flag.local/index.html?proof=flag'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB); pg.evaluate(SETUP, False); pg.wait_for_timeout(300)
    R += pg.evaluate(T)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for st, n, d in R: print(st + '  ' + n + ('' if st == 'PASS' else '  ' + str(d)))
print(f"{sum(1 for r in R if r[0]=='PASS')}/{len(R)} passed")
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

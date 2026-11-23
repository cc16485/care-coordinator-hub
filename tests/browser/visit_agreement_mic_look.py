"""Dixie's home visit, 2026-11-23 (Samantha: "dont need to make sign in to get to next stage and have family sign agreement").
Two things went wrong at the visit: the recording would not record, and the agreement asked Krystal to sign in again.
The real Hub page and the real agreement page, offline, a made-up family. Proves:
  1. the home visit's "Open the Client Care Agreement" opens the agreement INSIDE the Hub (no new window), using the
     coordinator's own sign-in: no sign-in screen; a recording that is going keeps going while the family signs; Back to the
     visit closes it and the visit is still there;
  2. opened on its own with no sign-in, the agreement page says why it is asking and a wrong password gets plain words;
  3. when the microphone will not start, the visit says "Not recording", why, what to do on this device, and offers the
     backup (Voice Memos, then Add a recording from this device), for a blocked microphone, the Hub inside GoHighLevel and
     a microphone another app is using;
  4. the backup: a Voice Memos file goes up the same private way, as an assessment recording, and is written out;
  5. a recorder that starts but hears nothing says so within seconds;
  no em dashes and no "AI" on the new words.
(python3 tests/browser/visit_agreement_mic_look.py)"""
import os, sys, json, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SESSION = {'access_token': 'kr', 'refresh_token': 'r', 'token_type': 'bearer', 'expires_in': 3600, 'expires_at': 4102444800,
           'user': {'id': 'u-kr', 'email': 'krystal@mo-care.com', 'aud': 'authenticated', 'role': 'authenticated', 'app_metadata': {}, 'user_metadata': {}}}
FIELDS = json.load(open(ROOT / 'tests' / 'browser' / 'agreement_fields.json'))
FORM = {'doc': 'client-care-agreement', 'version': 'Rev. 10/2026', 'pdf_sha256': '9e1825a28dd15da7551cf9c71b36e6d98c1265f7dd75aeae6f1baf43f411671d',
        'esign_words': 'I agree.', 'initials': {}, 'fields': FIELDS, 'office_keys': []}
STUB = r"""
(()=>{
  const W=window; W.__log={ uploads:[], rows:[], invokes:[] };
  (0,eval)(`
    const rows = window.__log.rows;
    const q = (tbl)=>{ let f=[], ins=null;
      const run = ()=>{ if(tbl!=='recordings') return { data:[], error:null };
        if(ins){ const r=Object.assign({ id:'rec_'+(rows.length+1), created_at:new Date().toISOString(), status:'recorded' }, ins); rows.push(r); return { data:r, error:null }; }
        return { data:rows.filter(r=>f.every(([k,v])=>String(r[k])===String(v))), error:null }; };
      const p={ select(){return p;}, eq(k,v){ f.push([k,v]); return p;}, order(){return p;}, limit(){return p;}, is(){return p;}, in(){return p;}, gte(){return p;},
        insert(o){ ins=o; return p; }, update(){ return p; },
        single:async()=>{ const r=run(); return { data:Array.isArray(r.data)?r.data[0]:r.data, error:null }; },
        maybeSingle:async()=>{ const r=run(); return { data:Array.isArray(r.data)?r.data[0]:r.data, error:null }; },
        then(a,b){ return Promise.resolve(run()).then(a,b); } }; return p; };
    sb={ from:q,
      storage:{ from:()=>({ upload:async(path, blob, o)=>{ window.__log.uploads.push({ path, size:blob.size, type:o&&o.contentType }); return { error:null }; },
        createSignedUrl:async()=>({ data:{ signedUrl:'data:audio/webm;base64,' }, error:null }) }) },
      rpc:async()=>({data:null,error:null}),
      functions:{ invoke:async(n)=>{ window.__log.invokes.push(n); return {data:{ok:true},error:null}; } },
      auth:{ getSession:async()=>({data:{session:{access_token:'kr'}}}) } };
    ME={ email:'krystal@mo-care.com', name:'Krystal Land' }; CC_ROLES=['owner_admin']; CC_ROLES_CHECKED=true;
    persist=async()=>{}; tkMerge=async()=>({}); ccConfirm=async()=>true; ccToast=()=>{}; alert=()=>{};`);
  DATA.ops_settings={}; DATA.care_assessments=[]; DATA.care_plans=[]; DATA.client_profiles=[];
  DATA.leads=[{ id:'lead_dixie', first_name:'Pat', last_name:'Lane (fake)', relationship:'Daughter', phone:'(417) 555-0190',
    client_first_name:'Dora', client_last_name:'Fields (fake)', client_address:'12 Elm St', client_city:'Springfield', client_state:'MO', client_zip:'65802',
    funding_source:'private', status:'Contacted' }];
  window.RECP_PART_SECS=600; window.RECP_HEAR_MS=2500;
})();
"""
MIME = {'.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.webmanifest': 'application/json'}
BASE = 'http://localhost:8797/'
def serve(route):
    url = route.request.url
    if '/functions/v1/client-agreement' in url:
        if route.request.method == 'OPTIONS': return route.fulfill(status=200, headers={'access-control-allow-origin': '*', 'access-control-allow-headers': '*'}, body='ok')
        b = json.loads(route.request.post_data or '{}'); CALLS.append([b, route.request.headers.get('authorization')])
        if route.request.headers.get('authorization') != 'Bearer kr': return route.fulfill(status=401, content_type='application/json', headers={'access-control-allow-origin': '*'}, body='{"error":"Sign in first."}')
        return route.fulfill(status=200, content_type='application/json', headers={'access-control-allow-origin': '*'}, body=json.dumps({'ok': True, 'form': FORM, 'agreements': []}))
    if '/auth/v1/token' in url:
        return route.fulfill(status=400, content_type='application/json', headers={'access-control-allow-origin': '*'}, body='{"code":400,"error_code":"invalid_credentials","msg":"Invalid login credentials"}')
    if 'supabase.co' in url: return route.abort()
    if not url.startswith(BASE): return route.continue_()
    p = ROOT / url.split(BASE, 1)[1].split('?')[0].split('#')[0]
    if not p.is_file(): return route.fulfill(status=404, body='')
    route.fulfill(status=200, body=p.read_bytes(), content_type=MIME.get(p.suffix, 'application/octet-stream'))
CALLS = []
R = []
def ok(n, c, d=''): R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:600]))
ARGS = ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--unsafely-treat-insecure-origin-as-secure=' + BASE.rstrip('/'), '--autoplay-policy=no-user-gesture-required']
BAN = r"""(t)=>!/\bAI\b/.test(t) && !/—/.test(t)"""

with sync_playwright() as pw:
    b = pw.chromium.launch(args=ARGS)
    # ---- 1. the agreement opens inside the Hub, on the same sign-in, while the visit records ----
    cx = b.new_context(viewport={'width': 1180, 'height': 820}, has_touch=True, permissions=['microphone'])
    cx.add_init_script('localStorage.setItem("sb-zngsgedlsxinbygwmxwn-auth-token", %s)' % json.dumps(json.dumps(SESSION)))
    pg = cx.new_page(); pg.route('**/*', serve); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    popups = []; pg.on('popup', lambda p: popups.append(p.url))
    pg.goto(BASE + 'index.html?proof=va'); pg.wait_for_timeout(1500); pg.evaluate('s=>(0,eval)(s)', STUB)
    r = pg.evaluate("""async()=>{ const sleep=ms=>new Promise(r=>setTimeout(r,ms)), q=s=>document.querySelector('#hvRoot '+s);
      await HV.open({ leadId:'lead_dixie' }); await sleep(300);
      q('#recConsent').click(); q('#recGo').click(); const t=Date.now(); while(RECP.state()!=='recording' && Date.now()-t<8000) await sleep(200);
      const btn=q('#hvAgree [data-hva="openagree"]'), blank=document.querySelectorAll('#hvRoot a[target="_blank"][href*="agreement.html"]').length;
      const out={ rec:RECP.state(), btn:!!btn, href:btn&&btn.getAttribute('data-href'), blank };
      btn.click(); await sleep(200); const sh=document.getElementById('hvAgreeSheet'), fr=sh&&sh.querySelector('iframe');
      out.sheet=!!sh; out.src=fr&&fr.getAttribute('src'); out.allow=fr&&fr.getAttribute('allow'); return out; }""")
    ok('the visit is recording before the agreement opens', r['rec'] == 'recording', r)
    ok('the agreement button is in the Hub, not a link to a new window', r['btn'] and r['blank'] == 0 and r['href'].startswith('agreement.html?lead=lead_dixie&cn=') and r['href'].endswith('&inhub=1'), r)
    ok('tapping it opens the agreement over the visit (same page, same sign-in)', r['sheet'] and r['src'] == r['href'], r)
    fr = pg.frame_locator('#hvAgreeSheet iframe')
    try: fr.locator('#who').filter(has_text='krystal@mo-care.com').wait_for(timeout=15000); signed = True
    except Exception: signed = False
    st = pg.evaluate("""()=>{ const d=document.querySelector('#hvAgreeSheet iframe').contentDocument; return { gate:!d.getElementById('gate').classList.contains('hide'), who:d.getElementById('who').textContent, back:d.getElementById('backLink').textContent, view:d.getElementById('view').innerText.slice(0,200) }; }""")
    ok('no sign-in screen: the agreement opens as the coordinator who is signed in to the Hub', signed and not st['gate'] and st['who'] == 'krystal@mo-care.com', st)
    ok('the agreement service was called with the Hub sign-in', any(c[1] == 'Bearer kr' and c[0].get('action') == 'form' for c in CALLS), CALLS[:3])
    ok('no new window or tab opened', not popups, popups)
    ok('its Back button says Back to the visit', 'Back to the visit' in st['back'], st)
    ok('the recording keeps going while the agreement is open, and the bar says so', pg.evaluate("()=>RECP.state()") == 'recording' and 'still recording' in pg.inner_text('#hvAgreeRec'))
    fr.locator('#backLink').click(); pg.wait_for_timeout(300)
    r2 = pg.evaluate("()=>({ sheet:!!document.getElementById('hvAgreeSheet'), visit:!!document.getElementById('hvRoot') && document.getElementById('hvRoot').style.display!=='none', rec:RECP.state() })")
    ok('Back to the visit closes the agreement, the visit is still there and still recording', not r2['sheet'] and r2['visit'] and r2['rec'] == 'recording', r2)
    pg.evaluate("()=>{ try{ recStop(); }catch(e){} }"); pg.wait_for_timeout(800)
    ok('no page errors (agreement inside the Hub)', not errs, errs[:3])
    cx.close()

    # ---- 2. the agreement page on its own, not signed in ----
    cx = b.new_context(viewport={'width': 1024, 'height': 768}); pg = cx.new_page(); pg.route('**/*', serve)
    pg.goto(BASE + 'agreement.html?lead=lead_dixie'); pg.wait_for_selector('#signin')
    g = pg.inner_text('#gate')
    ok('on its own with no sign-in: it says why it is asking and where to open it instead', 'separate window' in g and 'Start of Care' in g and 'home visit' in g, g)
    pg.fill('#em', 'krystal@mo-care.com'); pg.fill('#pw', 'wrong'); pg.click('#signin'); pg.wait_for_timeout(1500)
    e = pg.inner_text('#gateErr')
    ok('a wrong password gets plain words, not "Invalid login credentials"', 'did not match' in e and 'Forgot password' in e and 'Invalid login' not in e, e)
    ok('no em dashes or "AI" on the sign-in screen', pg.evaluate(BAN, g + e))
    cx.close()

    # ---- 3-5. the microphone ----
    def mic_page(init=''):
        cx = b.new_context(viewport={'width': 1180, 'height': 820}, has_touch=True, permissions=['microphone'])
        if init: cx.add_init_script(init)
        pg = cx.new_page(); pg.route('**/*', serve); pg.goto(BASE + 'index.html?proof=vm'); pg.wait_for_timeout(1500); pg.evaluate('s=>(0,eval)(s)', STUB)
        pg.evaluate("async()=>{ await HV.open({ leadId:'lead_dixie' }); await new Promise(r=>setTimeout(r,300)); const q=s=>document.querySelector('#hvRoot '+s); q('#recConsent').click(); q('#recGo').click(); await new Promise(r=>setTimeout(r,600)); }")
        return cx, pg
    deny = "navigator.mediaDevices.getUserMedia=async()=>{ const e=new Error('denied'); e.name='%s'; throw e; };"
    cx, pg = mic_page(deny % 'NotAllowedError')
    m = pg.evaluate("()=>({ err:document.querySelector('#hvRoot #recErr').innerText, shown:document.querySelector('#hvRoot #recErr').style.display, add:!!document.querySelector('#hvRoot #recAddFile'), st:RECP.state() })")
    ok('microphone blocked: it says Not recording, why, and how to allow it', m['shown'] == 'block' and m['err'].startswith('Not recording.') and 'microphone' in m['err'] and 'Press Start again' in m['err'] or 'press Start again' in m['err'], m)
    ok('microphone blocked: the backup is offered right there (Voice Memos, then add the file)', 'Voice Memos' in m['err'] and 'Add a recording from this device' in m['err'] and m['add'] and m['st'] == 'off', m)
    ok('no em dashes or "AI" in the recorder messages', pg.evaluate(BAN, m['err']))
    # 4. the backup file
    pg.set_input_files('#hvRoot #recAddFile', files=[{'name': 'Dixie visit.m4a', 'mimeType': 'audio/x-m4a', 'buffer': b'\x00\x00\x00\x20ftypM4A ' + b'\x00' * 2000}])
    pg.wait_for_timeout(1500)
    u = pg.evaluate("()=>({ up:window.__log.uploads, rows:window.__log.rows, inv:window.__log.invokes, note:document.querySelector('#hvRoot #recUp').innerText, aid:HV._st.a.id })")
    up = u['up'][0] if u['up'] else {}; row = u['rows'][0] if u['rows'] else {}
    ok('the backup file goes up privately as this visit\'s recording, keeping its .m4a name', up.get('path', '').startswith('assessment/' + u['aid'] + '/') and up['path'].endswith('.m4a') and row.get('kind') == 'assessment' and row.get('subject_id') == u['aid'] and row.get('consent_given') is True, u)
    ok('the backup file is written out the same way and the screen says it was added', 'transcribe-recording' in u['inv'] and 'Added' in u['note'], u)
    cx.close()
    # inside GoHighLevel: the Hub in a frame from another site that does not pass on the microphone (a real browser rule)
    cx = b.new_context(viewport={'width': 1180, 'height': 820}, has_touch=True, permissions=['microphone']); pg = cx.new_page()
    def outer(route):
        if route.request.url.startswith('http://ghl.example/'): return route.fulfill(status=200, content_type='text/html', body='<html><body style="margin:0"><iframe id="f" src="' + BASE + 'index.html?proof=ghl" style="width:1180px;height:800px;border:0"></iframe></body></html>')
        return serve(route)
    pg.route('**/*', outer); pg.goto('http://ghl.example/'); pg.wait_for_timeout(2500)
    hub = [f for f in pg.frames if 'proof=ghl' in f.url][0]
    hub.evaluate('s=>(0,eval)(s)', STUB)
    hub.evaluate("async()=>{ await HV.open({ leadId:'lead_dixie' }); await new Promise(r=>setTimeout(r,300)); const q=s=>document.querySelector('#hvRoot '+s); q('#recConsent').click(); q('#recGo').click(); await new Promise(r=>setTimeout(r,1500)); }")
    t = hub.inner_text('#hvRoot #recErr')
    ok('inside GoHighLevel (no microphone passed to the Hub): it says so, how to record instead, and the backup', 'GoHighLevel' in t and 'cc.mo-care.com on its own' in t and 'Voice Memos' in t, t)
    cx.close()
    cx, pg = mic_page(deny % 'NotReadableError')
    t = pg.inner_text('#hvRoot #recErr')
    ok('microphone busy: it says another app is using it', 'Another app is using the microphone' in t, t)
    cx.close()
    # 5. starts but hears nothing
    silent = "window.MediaRecorder=class{ constructor(s,o){ this.stream=s; this.state='inactive'; this.mimeType='audio/webm'; } static isTypeSupported(){ return true; } start(){ this.state='recording'; } stop(){ this.state='inactive'; this.onstop&&this.onstop(); } pause(){ this.state='paused'; } resume(){ this.state='recording'; } };"
    cx, pg = mic_page(silent); pg.wait_for_timeout(3200)
    t = pg.inner_text('#hvRoot #recErr')
    ok('a recorder that hears nothing says so within seconds', 'no sound is reaching the Hub' in t, t)
    cx.close()
    b.close()

for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

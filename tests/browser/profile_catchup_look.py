"""452 · current caregivers fill in their own profile (Samantha, 2026-10-05). Two real pages, offline, made-up people;
every server answer is faked here, so nothing is sent and nothing real changes.
  1. caregiver-profile.html as a current caregiver: three questions, photo AND video needed, the new permission wording,
     "Help me say it", and it refuses to send until complete.
  2. The Hub's Caregivers → Profiles view: who still needs one, and the send-to-everyone button (preview first).
(python3 tests/browser/profile_catchup_look.py, with the static server on 8765)"""
import json
from playwright.sync_api import sync_playwright
H = open('/Users/samantha/Claude/Projects/cc-hub-live/.claude/g1a_harness.js').read()
CALLS = []
def fake_fn(route):
    url = route.request.url; body = json.loads(route.request.post_data or '{}'); CALLS.append([url.split('/functions/v1/')[-1], body])
    if 'profile-polish' in url:
        if body.get('mode') == 'say': return route.fulfill(status=200, content_type='application/json', body=json.dumps({'said': "I'm from Ozark and a mom of three. I love cooking."}))
        return route.fulfill(status=200, content_type='application/json', body=json.dumps({'polished': body.get('text'), 'unchanged': True}))
    a = body.get('action')
    if a == 'mine': return route.fulfill(status=200, content_type='application/json', body=json.dumps({'first_name': 'Joyce', 'self_complete': True, 'about': None, 'experience': None, 'why_this_work': None, 'published': False, 'consent': False}))
    if a == 'upload_url': return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'path': 'p/' + body['kind'] + '-1700000000000.' + body['ext'], 'token': 't'}))
    if a == 'submit': return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True}))
    if a == 'catchup': return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'profile': {'id': 'prof-' + body['axiscare_id']}}))
    if a == 'send_link': return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'texted': True, 'emailed': True, 'not_sent': []}))
    return route.fulfill(status=200, content_type='application/json', body='{}')
def router(route):
    u = route.request.url
    if 'supabase.co/functions/v1/' in u: return fake_fn(route)
    if 'supabase.co/storage/' in u: return route.fulfill(status=200, content_type='application/json', body='{"Key":"x"}')
    if 'supabase.co' in u: return route.abort()
    return route.continue_()
R = []
def ok(n, c, d=''): R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:500]))
with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []
    # ── 1. their page ──
    pg = b.new_page(viewport={'width': 420, 'height': 900}); pg.on('pageerror', lambda e: errs.append(str(e)[:200])); pg.route('**/*', router)
    pg.goto('http://localhost:8765/caregiver-profile.html?t=11111111-2222-4333-8444-555555555555'); pg.wait_for_selector('#form', state='visible', timeout=15000)
    t = pg.inner_text('#form')
    ok('heading and intro for a current caregiver (no "we wrote", no "interview")', "let's set up your profile" in t and 'answer the three questions below in your own words' in t and 'We wrote' not in t and 'interview' not in t, t[:400])
    ok('the three questions with their examples', '1. What should families know about you?' in t and "where you're from, your family, what you enjoy doing" in t and '2. Who have you cared for, and for how long?' in t and '3. What do you enjoy most about caregiving?' in t)
    ok('no "what you are like to have around" anywhere', 'to have around' not in pg.content())
    ok('photo and video both Needed; no "if you would rather not be on camera"', pg.is_visible('#videoNeed') and not pg.is_visible('#videoOpt') and not pg.is_visible('#videoOk'))
    ok('the permission is a requirement, in her words', 'I give my permission for Caring Companions to share this profile (my photo, video, first name and last initial, and these words) with my clients before my shifts with them.' in t and 'This is required.' in t and 'change your mind' not in t)
    ok('the button says Send my profile', pg.inner_text('#go') == 'Send my profile')
    pg.click("button[onclick=\"sayIt('about',this)\"]"); pg.wait_for_timeout(200)
    ok('Help me say it with an empty box asks for a few words first (nothing sent to the AI)', 'Type a few words first' in pg.inner_text('#polish-about') and not any(c[0] == 'profile-polish' for c in CALLS))
    pg.fill('#about', 'from ozark, 3 kids, love cooking'); pg.click("button[onclick=\"sayIt('about',this)\"]"); pg.wait_for_timeout(500)
    say = [c for c in CALLS if c[0] == 'profile-polish']
    ok('Help me say it sends their words and the question, shows the result to choose', say and say[-1][1].get('mode') == 'say' and say[-1][1].get('question') == 'What should families know about you?' and "I'm from Ozark" in pg.inner_text('#polish-about') and 'Use this' in pg.inner_text('#polish-about'), say[-1:] )
    ok('...nothing changed until they choose', pg.input_value('#about') == 'from ozark, 3 kids, love cooking')
    pg.click('#polish-about .use'); ok('Use this puts it in the box', pg.input_value('#about').startswith("I'm from Ozark"))
    pg.click('#go'); pg.wait_for_timeout(150)
    ok('send with things missing: refused, names everything still missing at once', all(x in pg.inner_text('#err') for x in ('a photo of yourself', 'a short hello video', 'Who have you cared for', 'What do you enjoy most')) and 'What should families know' not in pg.inner_text('#err'), pg.inner_text('#err'))
    pg.fill('#experience', 'My grandma for 4 years.'); pg.fill('#why', 'The stories.')
    pg.set_input_files('#photo', files=[{'name': 'me.jpg', 'mimeType': 'image/jpeg', 'buffer': b'\xff\xd8\xff' + b'0' * 3000}])
    pg.click('#go'); pg.wait_for_timeout(150)
    ok('only the video missing: refused, says so', 'Please add a short hello video' in pg.inner_text('#err') and 'photo' not in pg.inner_text('#err'), pg.inner_text('#err'))
    pg.set_input_files('#video', files=[{'name': 'hi.mp4', 'mimeType': 'video/mp4', 'buffer': b'0' * 5000}])
    pg.click('#go'); pg.wait_for_timeout(150)
    ok('no permission tick: refused with the required wording', 'Sharing your profile with your clients before your shifts is required.' in pg.inner_text('#err'), pg.inner_text('#err'))
    pg.check('#consent'); pg.click('#go'); pg.wait_for_selector('#done', state='visible', timeout=10000)
    sub = [c for c in CALLS if c[1].get('action') == 'submit']
    ok('complete: sent with photo, video, answers and permission; thank-you says it is sent', sub and sub[-1][1].get('video_path') and sub[-1][1].get('photo_path') and sub[-1][1].get('consent') is True and "it's sent" in pg.inner_text('#done') and 'before your first visit' not in pg.inner_text('#done'), sub[-1:])
    pg.close()
    # ── 2. the Hub: Caregivers → Profiles ──
    CALLS.clear()
    pg = b.new_page(viewport={'width': 1300, 'height': 900}); pg.on('pageerror', lambda e: errs.append(str(e)[:200])); pg.route('**/*', router)
    pg.goto('http://localhost:8765/index.html?proof=catchup'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', H)
    r = pg.evaluate(r"""async()=>{
      const sleep=ms=>new Promise(r=>setTimeout(r,ms)), out={};
      document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; await sleep(600);
      (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha Troutman' };");
      const day=d=>new Date(Date.now()+d*864e5).toISOString();
      const ROWS=[ { id:'r2', axiscare_id:'2', first_name:'Maria', self_complete:true, link_sent_at:day(-5), status:'new', updated_at:day(-5) },
                   { id:'r3', axiscare_id:'3', first_name:'Pat', self_complete:true, link_sent_at:day(-1), submitted_at:day(0), photo_path:'a', video_path:'b', consent:true, status:'new', updated_at:day(0) },
                   { id:'r4', axiscare_id:'4', first_name:'Ruth', published:true, status:'approved', published_at:day(-9), updated_at:day(-9) },
                   { id:'r6', candidate_id:'66', first_name:'Ann', self_complete:true, link_sent_at:day(-1), status:'new', updated_at:day(-1) } ];
      window.__cgpSb=null;
      (0,eval)(`sb.from=(t)=>{ const f=[]; const b={ select(){return b;}, neq(){return b;}, in(c,v){ f.push(r=>v.map(String).includes(String(r[c]))); return b; }, eq(){return b;}, order(){return b;}, limit(){return b;}, is(){return b;}, ilike(){return b;},
          then(ok){ return Promise.resolve({ data: t==='caregiver_profiles' ? window.__ROWS.filter(r=>f.every(fn=>fn(r))) : [], error:null }).then(ok); } }; return b; };
        sb.auth.getSession=async()=>({data:{session:{access_token:'t'}}});`);
      window.__ROWS=ROWS; window.__calls=[];
      const F0=window.fetch; window.fetch=async(u,o)=>{ const url=String(u);
        if(/functions\/v1\/caregiver-profile$/.test(url)){ const bd=JSON.parse(o.body); window.__calls.push(bd);
          if(bd.action==='catchup') return new Response(JSON.stringify({ ok:true, profile:{ id:'prof-'+bd.axiscare_id } }),{status:200});
          if(bd.action==='send_link') return new Response(JSON.stringify({ ok:true, texted:true, emailed:true, not_sent:[] }),{status:200}); }
        return F0(u,o); };
      CGD.census={ caregivers:[
        { id:'1', first:'Joyce', last:'Kim (fake)', active:true, mobile:'4175550101', email:'joyce@example.com', hire_date:'2023-04-01' },
        { id:'2', first:'Maria', last:'Lopez (fake)', active:true, mobile:'4175550102', email:'', hire_date:'2022-01-10' },
        { id:'3', first:'Pat', last:'Long (fake)', active:true, mobile:'4175550103', email:'pat@example.com', hire_date:'2021-06-01' },
        { id:'4', first:'Ruth', last:'Ames (fake)', active:true, mobile:'4175550104', email:'', hire_date:'2020-02-02' },
        { id:'5', first:'Nina', last:'New (fake)', active:true, mobile:'4175550105', email:'nina@example.com', hire_date:'2026-10-03' },
        { id:'6', first:'Ann', last:'Old (fake)', active:true, mobile:'', email:'ann@example.com', hire_date:'2019-01-01' },
        { id:'7', first:'Ed', last:'Nophone (fake)', active:true, mobile:'', email:'', hire_date:'2024-01-01' },
        { id:'8', first:'Gone', last:'Away (fake)', active:false, mobile:'4175550108', email:'', hire_date:'2018-01-01' } ] }; CGD.at=Date.now();
      DATA.caregivers=[{ first:'Ann', last:'Old (fake)', axiscare_id:'6', candidate_id:'66' }];
      switchTab('cgdir'); await sleep(200);
      cgdFilter('profiles', document.querySelector('[data-cf="profiles"]')); await sleep(400);
      out.t=document.getElementById('cgdList').innerText;
      const btn=[...document.querySelectorAll('#cgdList button')].find(x=>/Send profile links to everyone/.test(x.textContent));
      out.btn=btn&&btn.textContent; out.again=[...document.querySelectorAll('#cgdList button')].find(x=>/Send again/.test(x.textContent)).textContent;
      btn.click(); await sleep(200);
      const pop=[...document.querySelectorAll('.ccpop')].pop(); out.pop=pop.innerText;
      pop.querySelector('#cuGo').click(); await sleep(1500);
      out.after=document.getElementById('cgdList').innerText; out.calls=window.__calls;
      return out; }""")
    t = r['t']
    ok('the Profiles view: how many current caregivers still need one (new hires and inactive not counted)', '5 of 6 current caregivers don\'t have a published profile yet' in t, t[:300])
    ok('counts by where they stand', 'Not sent yet · 2' in t and 'Link sent, waiting · 2' in t and 'Sent in, needs your check · 1' in t and 'Published · 1' in t, t[:500])
    ok('groups: sent in first, then not sent, waiting, published, and new hires only listed', t.index('SENT IN: CHECK AND PUBLISH') < t.index('NOT SENT YET') < t.index('LINK SENT, WAITING') < t.index('PUBLISHED') < t.index('NEW HIRES') and 'Nina New' in t and 'Gone Away' not in t)
    ok('an older profile found by their old Hub id counts (Ann: waiting)', 'Ann Old (fake)' in t.split('LINK SENT, WAITING')[1].split('PUBLISHED')[0])
    ok('no mobile or email is shown in red text', 'no mobile or email on file' in t)
    ok('the two buttons with their counts (send again = waiting 3+ days)', r['btn'] == '📲 Send profile links to everyone who needs one (2)' and r['again'] == 'Send again to those waiting 3+ days (1)', [r['btn'], r['again']])
    ok('the preview lists who gets it and how, and who cannot be reached', 'Send profile links to 1 caregiver?' in r['pop'] and 'Joyce Kim (fake) · text and email' in r['pop'] and "Can't be reached" in r['pop'] and 'Ed Nophone' in r['pop'], r['pop'])
    sends = [['caregiver-profile', c] for c in r['calls']]
    ok('pressing Send: only Joyce, catchup then send_link with her AxisCare mobile and email', [c[1].get('action') for c in sends] == ['catchup', 'send_link'] and sends[0][1]['axiscare_id'] == '1' and sends[1][1]['profile_id'] == 'prof-1' and sends[1][1]['phone'] == '4175550101' and sends[1][1]['email'] == 'joyce@example.com', sends)
    ok('...nobody published, waiting, sent in, new or unreachable was sent anything', not any(c[1].get('axiscare_id') in ('2', '3', '4', '5', '6', '7', '8') for c in sends))
    ok('the result says who it went to', 'Sent to 1 of 1 (1 by text, 1 by email).' in r['after'], r['after'][:900])
    pg.close(); b.close()
R.append(('PASS' if not errs else 'FAIL', 'no page errors', errs[:3]))
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(x[0] == 'PASS' for x in R), '/', len(R))
# ── 3. the office panel for a current caregiver's profile ──
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(); errs3 = []; pg.on('pageerror', lambda e: errs3.append(str(e)[:200])); pg.route('**/*', router)
    pg.goto('http://localhost:8765/index.html?proof=catchup3'); pg.wait_for_timeout(1200); pg.evaluate('s=>(0,eval)(s)', H)
    t3 = pg.evaluate(r"""async()=>{
      window.__ROWS=[{ id:'r9', axiscare_id:'9', first_name:'Joyce', last_name:'Kim', self_complete:true, link_sent_at:new Date().toISOString(), about:'I love cooking.', photo_path:'r9/photo-1.jpg', status:'new', updated_at:new Date().toISOString() }];
      (0,eval)(`sb.from=(t)=>{ const b={ select(){return b;}, neq(){return b;}, in(){return b;}, eq(){return b;}, order(){return b;}, limit(){return b;}, is(){return b;}, ilike(){return b;},
          then(ok){ return Promise.resolve({ data: t==='caregiver_profiles' ? window.__ROWS : [], error:null }).then(ok); } }; return b; };`);
      const d=document.createElement('div'); document.body.appendChild(d);
      await CGP2.mount(d,{ mode:'employee', axiscare_id:'9', first:'Joyce', last:'Kim' }); return d.innerText; }""")
    ok3 = lambda n, c: R.append(('PASS' if c else 'FAIL', n, '' if c else t3[:600]))
    ok3('panel: says they fill it in themselves, video required, waiting chip', 'Current caregiver: they fill this in themselves' in t3 and 'No video yet (required)' in t3 and 'Link sent, waiting for them' in t3)
    ok3('panel: "Send profile link again", no AI "Redo draft"', 'Send profile link again' in t3 and 'Redo draft' not in t3 and 'In their own words.' in t3)
    R.append(('PASS' if not errs3 else 'FAIL', 'no page errors (panel)', errs3[:3])); b.close()
for s_, n, d in R[-3:]: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(x[0] == 'PASS' for x in R), '/', len(R))

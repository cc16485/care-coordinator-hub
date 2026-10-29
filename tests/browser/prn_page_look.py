"""PRN step 5a (Samantha 2026-10-29): a PRN member's own PRN Team page (prn.html), as the member and as the office's read-only
preview, plus its Hub side (This week lines, Our teams, What they see, the switch). Offline, made-up data; every server call is
answered here, nothing is sent or saved. (PORT=<static server port> python3 tests/browser/prn_page_look.py)"""
import os, json
from playwright.sync_api import sync_playwright
H = open('/Users/samantha/Claude/Projects/cc-hub-live/.claude/g1a_harness.js').read()
PORT = os.environ.get('PORT', '8811'); SHOTS = os.environ.get('SHOTS', '/tmp')
VIEW = { 'ok': True, 'preview': False, 'live': True, 'today': '2026-10-29', 'first': 'Grace', 'team': 'cna', 'team_label': 'PRN CNA Team', 'since': '2026-03-14', 'on_schedule': True,
  'looking': { 'on': False, 'note': None, 'since': None, 'until': None },
  'offered': [{ 'case_id': 'c1', 'client_first': 'Mary', 'town': 'Nixa', 'shift_date': '2026-11-01', 'shift_time': '08:00-12:00', 'answered': None, 'link': 'https://cc.mo-care.com/shift.html?c=c1&a=a1&e=1&t=x' }],
  'clients': [{ 'first': 'Ruth', 'last_visit': '2026-10-12', 'glad': True, 'star': False }], 'clients_why': None,
  'thanks': [{ 'kind': 'kind_words', 'at': '2026-10-25T15:00:00Z', 'text': "Mary's daughter said you made her mom laugh all morning.", 'from': 'Samantha' }, { 'kind': 'milestone', 'at': '', 'text': "You've stepped in for 10 PRN shifts. Thank you for standing in the gap." }],
  'hours': { 'windows': { 'mon': ['morning'], 'sat': ['evening'] }, 'target_hours': 12, 'outside_ok': False, 'updated_at': '2026-10-20T15:00:00Z', 'short_notice_ok': None, 'break_until': None },
  'courses': [{ 'slug': 'dementia-care', 'title': "Alzheimer's & Dementia Care", 'hours': 4, 'about': 'Understanding memory loss.', 'requested': False }, { 'slug': 'on-the-job-training', 'title': 'On-the-Job Skills Training', 'hours': 6, 'about': 'Hands-on care skills.', 'requested': True }],
  'office': '(417) 234-8494' }
R = []; ok = lambda n, c, d='': R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:400]))

def page(pw, qs, answer):
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 400, 'height': 1600}); calls = []
    def route(r):
        u = r.request.url
        if '/functions/v1/prn-page' in u:
            body = json.loads(r.request.post_data or '{}'); calls.append({ 'body': body, 'auth': r.request.headers.get('authorization', '') })
            s, j = answer(body); return r.fulfill(status=s, content_type='application/json', body=json.dumps(j))
        if 'fonts.g' in u: return r.abort()
        return r.continue_()
    pg.route('**/*', route); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(f'http://localhost:{PORT}/prn.html{qs}'); pg.wait_for_timeout(700)
    return b, pg, calls, errs

with sync_playwright() as pw:
    def member(body):
        a = body.get('action')
        if a == 'view': return 200, VIEW
        return 200, { 'ok': True, 'message': {'looking': 'Thank you! The office will see this today.', 'hours': 'Saved, Grace! The office sees this right away.', 'short_notice': 'Saved. Thank you for letting us know.',
          'break': "Enjoy your break. We won't text you about shifts until it ends.", 'course': 'Thank you! The office will set it up and send you the link.', 'idea': 'Thank you for sharing. The office reads every idea.'}.get(a, 'ok') }
    b, pg, calls, errs = page(pw, '?p=0f1e2d3c-4b5a-4968-8776-655443322110&e=1999999999&t=' + 'x' * 43, member)
    txt = pg.inner_text('body')
    ok('member: "Hi, Grace!", PRN CNA Team, We Stand in the Gap since March 2026', 'Hi, Grace!' in txt and 'PRN CNA Team' in txt and 'We Stand in the Gap. Part of our care continuity team since March 2026.' in txt, txt[:300])
    ok('...the view is asked with their link, no sign-in', calls[0]['body'].get('action') == 'view' and calls[0]['body'].get('p') and not calls[0]['auth'])
    ok('...Offered to You: Mary in Nixa, Sun Nov 1 8am to 12pm, opens the shift page they know', 'Mary in Nixa' in txt and 'Sun, Nov 1 · 8am to 12pm' in txt and pg.locator('a:has-text("See this shift and answer")').get_attribute('href').startswith('https://cc.mo-care.com/shift.html'), txt)
    ok('...My clients: Ruth, glad to go back; no last names anywhere', 'Ruth' in txt and "You said you'd gladly go back" in txt)
    ok('...Thank-yous: the kind words, from Samantha, and the 10-shift milestone', "Mary's daughter said you made her mom laugh all morning." in txt and 'Kind words from Samantha' in txt and 'stepped in for 10 PRN shifts' in txt)
    ok('...My hours: Mon morning and Sat evening ticked, 12 hours', pg.locator('.grid button.on').count() == 2 and pg.locator('#tgt').input_value() == '12')
    ok('...a course already asked for shows Asked', pg.locator('button.req[data-slug="on-the-job-training"]').inner_text() == 'Asked ✓')
    ok('...Talk to us texts and calls the office line', pg.locator('a:has-text("Text the office")').get_attribute('href') == 'sms:+14172348494' and pg.locator('a:has-text("Call")').get_attribute('href') == 'tel:+14172348494')
    ok('...no pay, no em dash', '$' not in txt and '—' not in txt)
    pg.click('#lookSw'); pg.fill('#lookTxt', 'any morning next week'); pg.click('#lookSave'); pg.wait_for_timeout(200)
    ok('looking for hours: on, with the note', any(c['body'].get('action') == 'looking' and c['body'].get('on') is True and c['body'].get('note') == 'any morning next week' for c in calls) and 'The office will see this today' in pg.inner_text('#lookMsg'))
    pg.wait_for_timeout(1000)
    pg.click('.grid button[data-d="tue"][data-t="afternoon"]'); pg.fill('#tgt', '15'); pg.check('#outOk'); pg.click('#hrsSave'); pg.wait_for_timeout(200)
    hc = [c for c in calls if c['body'].get('action') == 'hours'][-1]['body']
    ok('My hours: saves the grid, 15 hours, outside-hours texts', hc['windows']['tue'] == ['afternoon'] and hc['windows']['mon'] == ['morning'] and hc['target_hours'] == '15' and hc['outside_ok'] is True, hc)
    b2, pg2, calls2, errs2 = page(pw, '?p=0f1e2d3c-4b5a-4968-8776-655443322110&e=1999999999&t=' + 'x' * 43 + '#hours', member)
    top = pg2.evaluate("()=>({ y: scrollY, top: document.getElementById('hours').getBoundingClientRect().top, max: document.documentElement.scrollHeight - innerHeight })")
    pg2.click('#hrsSame'); pg2.wait_for_timeout(200)
    sc = [c for c in calls2 if c['body'].get('action') == 'hours']
    ok('the 60-day check-in link opens at My hours; "These are still right" saves what is on file, unchanged', top['y'] > 300 and (abs(top['top'] - 60) < 20 or top['y'] >= top['max'] - 2) and sc and sc[-1]['body']['windows']['mon'] == ['morning'] and sc[-1]['body']['windows']['sat'] == ['evening']
       and sc[-1]['body']['target_hours'] == '12' and sc[-1]['body']['outside_ok'] is False and 'Saved, Grace' in pg2.inner_text('#hrsMsg') and not errs2, [top, sc, errs2])
    b2.close()
    pg.click('[data-sn="yes"]'); pg.wait_for_timeout(200)
    ok('short notice: yes, saved by them', any(c['body'].get('action') == 'short_notice' and c['body'].get('ok') is True for c in calls) and pg.locator('[data-sn="yes"]').get_attribute('class').endswith('on'))
    pg.click('#brkSet'); pg.wait_for_timeout(100)
    ok('a break with no date: asks for the date, sends nothing', 'Pick the date' in pg.inner_text('#brkMsg') and not any(c['body'].get('action') == 'break' for c in calls))
    pg.fill('#brkDate', '2026-11-15'); pg.click('#brkSet'); pg.wait_for_timeout(200)
    ok('...with a date: the break is set', any(c['body'].get('action') == 'break' and c['body'].get('until') == '2026-11-15' for c in calls))
    pg.wait_for_timeout(1400)
    pg.click('button.req[data-slug="dementia-care"]'); pg.wait_for_timeout(200)
    ok("a course: I'd like this, then Asked", any(c['body'].get('action') == 'course' and c['body'].get('slug') == 'dementia-care' for c in calls) and pg.locator('button.req[data-slug="dementia-care"]').inner_text() == 'Asked ✓')
    pg.click('#ideaBtn'); pg.fill('#ideaTxt', 'A group text for open weekends'); pg.click('#ideaSend'); pg.wait_for_timeout(200)
    ok('an idea goes to the office', any(c['body'].get('action') == 'idea' and c['body'].get('text') == 'A group text for open weekends' for c in calls))
    pg.screenshot(path=os.path.join(SHOTS, 'prn_page_member.png'), full_page=True)
    ok('no page errors (member)', not errs, errs); b.close()

    V2 = dict(VIEW, hours=dict(VIEW['hours'], break_until='2026-11-15'))
    b, pg, calls, errs = page(pw, '?p=0f1e2d3c-4b5a-4968-8776-655443322110&e=1999999999&t=' + 'x' * 43, lambda body: (200, V2) if body.get('action') == 'view' else (200, { 'ok': True, 'message': "Welcome back! You'll hear about shifts again." }))
    ok('on a break: said at the top, with End my break now', "You're on a break until Sunday, Nov 15" in pg.inner_text('body') and pg.locator('#brkEnd').count() == 1)
    pg.click('#brkEnd'); pg.wait_for_timeout(200)
    ok('...ending it sends an empty date', any(c['body'].get('action') == 'break' and c['body'].get('until') == '' for c in calls)); b.close()

    b, pg, calls, errs = page(pw, '?p=0f1e2d3c-4b5a-4968-8776-655443322110&e=1999999999&t=' + 'x' * 43, lambda body: (200, { 'closed': True, 'message': "Your PRN Team page isn't open yet. We'll text you when it is.", 'office': '(417) 234-8494' }))
    ok('switch off: "isn\'t open yet", nothing else', "isn't open yet" in pg.inner_text('body') and 'My hours' not in pg.inner_text('body')); b.close()
    b, pg, calls, errs = page(pw, '?p=x&e=1&t=y', lambda body: (401, { 'expired': True, 'message': 'This link has expired or is not valid. Text us and we will send you a fresh one.', 'office': '(417) 234-8494' }))
    ok('an expired link: says so, with the office number to text', 'This link has expired' in pg.inner_text('body') and pg.locator('a[href="sms:+14172348494"]').count() == 1); b.close()

    PV = dict(VIEW, preview=True, live=False); PV['offered'] = [dict(VIEW['offered'][0], link=None)]
    b, pg, calls, errs = page(pw, '?preview=0f1e2d3c-4b5a-4968-8776-655443322110', lambda body: (200, PV) if body.get('action') == 'preview' else (500, { 'error': 'should never be called' }))
    pg.evaluate("()=>{ localStorage.setItem('sb-zngsgedlsxinbygwmxwn-auth-token', JSON.stringify({ access_token: 'office-token' })); }"); pg.reload(); pg.wait_for_timeout(700)
    t2 = pg.inner_text('body')
    ok('office preview: the banner, read-only, with their sign-in', "Office preview of Grace's page · nothing you tap here is sent · the page is switched off for members" in t2 and calls[-1]['auth'] == 'Bearer office-token' and calls[-1]['body'].get('applicant_id'))
    n = len(calls); pg.click('#lookSw'); pg.click('#lookSave'); pg.click('[data-sn="no"]'); pg.click('#hrsSave'); pg.click('button.req[data-slug="dementia-care"]'); pg.wait_for_timeout(300)
    ok('...nothing you tap is sent', len(calls) == n and 'Preview only' in pg.inner_text('#pvtoast'))
    ok('...no shift link in the preview', pg.locator('a:has-text("See this shift")').count() == 0)
    pg.screenshot(path=os.path.join(SHOTS, 'prn_page_preview.png'))
    ok('no page errors (preview)', not errs, errs); b.close()

    # the Hub side
    T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,400)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; await sleep(600);
  (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha Troutman' };"); CC_ROLES=['owner_admin']; CC_ROLES_CHECKED=true; CC_ROLE_BY_EMAIL['samantha@mo-care.com']=['owner_admin'];
  (0,eval)(`PRN_T = { at: Date.now(), history: [], shifts: [], tracks: [ { applicant_id:'g', track:'prn_team', team:'cna', since:'2026-10-19', axiscare_caregiver_id:'11', linked_at:'2026-10-27T15:00:00Z' } ],
    apps: { g:{ first_name:'Grace', last_name:'Hill', prn:{} } } }; prnLoad = async()=>PRN_T; prnDashLoad = async()=>{};`);
  const WEEK={ ok:true, today:'2026-10-29', live:true, page_live:false, owner:'Krystal', more:0, familiar_note:null,
    members:[{applicant_id:'g',name:'Grace Hill',team:'cna',axiscare_id:'11',familiar:{why:null,clients:[]}, page:{ last_looked:'2026-10-28T15:00:00Z', looking:{on:true,note:'any morning next week'}, break_until:'2026-11-15' }}],
    items:[{id:'looking:g:2026-10-28',kind:'looking',applicant_id:'g',name:'Grace Hill',team:'PRN CNA Team',ref:'looking:2026-10-28',title:'Grace is looking for hours',detail:'"any morning next week". From their PRN Team page.'},
           {id:'course:g:dementia-care',kind:'course',applicant_id:'g',name:'Grace Hill',team:'PRN CNA Team',ref:'course:dementia-care',title:"Grace would like to take Alzheimer's & Dementia Care",detail:'Assign it on the Training Platform.'},
           {id:'idea:g:9',kind:'idea',applicant_id:'g',name:'Grace Hill',team:'PRN CNA Team',ref:'idea:9',title:'Grace shared an idea',detail:'"A group text"'}],
    oncall:{ stipend:null, patterns:{}, offers:[], weekends:[] } };
  const CALLS=[]; const realFetch=window.fetch;
  window.fetch=async(u,o)=>{ if(String(u).includes('/functions/v1/prn-week')){ const b=JSON.parse(o.body); CALLS.push(b); return new Response(JSON.stringify(b.action==='week'?WEEK:b.action==='page_link'?{link:'https://cc.mo-care.com/prn.html?p=g&e=1&t=x',live:false,days:30}:{outcome:'recorded'}),{status:200}); } return realFetch(u,o); };
  sb.auth.getSession=async()=>({ data:{ session:{ access_token:'t' } } });
  let alerted=''; window.ccAlert=(m)=>{ alerted=m; }; (0,eval)('ccAlert=window.ccAlert');
  location.hash='#prnteams'; await sleep(800); PW.tab('week'); await PW.load(); await sleep(150);
  const wk=document.getElementById('prnWeek').innerText;
  ok('This week: looking for hours first, then the course and the idea', wk.indexOf('Grace is looking for hours') > -1 && wk.indexOf('Grace is looking for hours') < wk.indexOf('would like to take') && /Grace shared an idea/.test(wk), wk.slice(0,400));
  await PW.mark('course:g:dementia-care','handled'); ok('...Assigned marks the course line handled', CALLS.some(c=>c.action==='mark' && c.kind==='handled' && c.ref==='course:dementia-care'));
  await PW.mark('looking:g:2026-10-28','called'); ok('...Called on looking for hours', CALLS.some(c=>c.action==='mark' && c.kind==='called' && c.ref==='looking:2026-10-28'));
  PW.tab('teams'); await sleep(80);
  const tt=document.getElementById('prnTeams').innerText;
  ok('Our teams: looking for hours (her note), on a break, last looked', /Looking for hours \(any morning next week\)/.test(tt) && /On a break until Nov 15/.test(tt) && /Last looked at their page Oct 28/.test(tt), tt);
  const copyBtn=[...document.querySelectorAll('#prnTeams button')].find(b=>/Copy page link/.test(b.innerText));
  try{ Object.defineProperty(navigator,'clipboard',{ value:{ writeText: async(t)=>{ window.__clip=t; } }, configurable:true }); }catch(e){}
  await PW.copyLink('g', copyBtn); await sleep(50);
  ok('...Copy page link: their link, and a note that the page is still off', CALLS.some(c=>c.action==='page_link' && c.applicant_id==='g') && window.__clip==='https://cc.mo-care.com/prn.html?p=g&e=1&t=x' && /still switched off/.test(alerted));
  PW.see('g'); await sleep(200);
  const fr=document.querySelector('#prnSee iframe');
  ok("What they see: Grace's real page, read-only, and a note that it's off for members", fr && /prn\.html\?preview=g$/.test(fr.src) && /switched off for members/.test(document.getElementById('prnSee').innerText) && /each look is recorded/.test(document.getElementById('prnSee').innerText));
  DATA.ops_settings={}; location.hash='#settings/prn'; await sleep(300); prnSetFill();
  const sw=document.getElementById('prnStep5Switches').innerText;
  ok('Settings: "Open the PRN Team page to members", off', /Open the PRN Team page to members/.test(sw) && /: off/.test(sw), sw);
  window.tkMerge=async(fn)=>{ const base=JSON.parse(JSON.stringify(DATA.ops_settings||{})), m=JSON.parse(JSON.stringify(base)); const ch=fn(m,base)||[]; DATA.ops_settings=m; return { changed:ch, error:null }; }; (0,eval)('tkMerge=window.tkMerge');
  window.ccConfirm=async()=>true; (0,eval)('ccConfirm=window.ccConfirm');
  ok('Settings: the three link texts, each off', ['"Your PRN Team page is ready" text','Page link in the welcome text','60-day check-in opens their PRN Team page'].every(n=>sw.includes(n)) && (sw.match(/: off/g)||[]).length===4, sw);
  ok('...their wording boxes show the approved wording as the standard', document.getElementById('set_prn_page_ready_msg').placeholder.startsWith("Hi {first_name}, your Caring Companions PRN Team page is ready: {link} See the shifts")
    && /on your PRN Team page: \{link\}$/.test(document.getElementById('set_prn_reconfirm_page_msg').placeholder));
  await prnStep1Toggle('prn_page_ready_live'); prnStep5Fill();
  ok('...a link text on while the page is closed says it is waiting', /page is ready" text: ON \(waiting: the page isn't open yet, so nothing goes\)/.test(document.getElementById('prnStep5Switches').innerText), document.getElementById('prnStep5Switches').innerText);
  await prnStep1Toggle('prn_page_ready_live');
  document.getElementById('set_prn_page_ready_msg').value='Your page, {first_name}.'; await prnStep5Save();
  ok('...wording without {link} is refused', /needs \{link\}/.test(document.getElementById('prnStep5Status').innerText) && DATA.ops_settings.prn_page_ready_msg===undefined);
  document.getElementById('set_prn_page_ready_msg').value='Your page, {first_name}: {link}'; await prnStep5Save();
  ok('...her own wording is saved', DATA.ops_settings.prn_page_ready_msg==='Your page, {first_name}: {link}');
  document.getElementById('set_prn_page_ready_msg').value=''; await prnStep5Save();
  ok('...emptied, back to the standard wording', !('prn_page_ready_msg' in DATA.ops_settings));
  await prnStep1Toggle('prn_page_live'); ok('...it turns on by itself', DATA.ops_settings.prn_page_live===true && DATA.ops_settings.prn_welcome_live===undefined && DATA.ops_settings.prn_page_ready_live===false);
  return R;
}
"""
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1300, 'height': 1000})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co/rest' in r.request.url or 'supabase.co/auth' in r.request.url or '/functions/v1/prn-page' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(f'http://localhost:{PORT}/index.html?proof=prnpage'); pg.wait_for_timeout(1200); pg.evaluate('s=>(0,eval)(s)', H)
    for s_, n, d in pg.evaluate(T): R.append((s_, n, d))
    ok('no page errors (Hub)', not errs, errs)
    pg.evaluate("()=>{ location.hash='#prnteams'; PW.tab('teams'); }"); pg.wait_for_timeout(300); pg.screenshot(path=os.path.join(SHOTS, 'prn_page_hub_teams.png'))
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

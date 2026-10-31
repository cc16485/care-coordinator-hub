"""PRN on-call calendar (Samantha 2026-10-29, decisions 23, 24, 26, 27): a PRN CNA's page (prn.html) signs the On-Call
Expectations and asks for shifts; an open shift on the Hub shows "On call now" (oncall-now.js). Offline, made-up data; every
server call is answered here, nothing is sent or saved. (PORT=<static server port> python3 tests/browser/prn_oncall_look.py)"""
import os, json
from playwright.sync_api import sync_playwright
PORT = os.environ.get('PORT', '8811')
TERMS = "PRN CNA On-Call Expectations\nWhen you sign up for an on-call shift, families are counting on you.\n1. On call comes in two shifts: daytime, 7am to 7pm, and overnight, 7pm to 7am.\n2. Keep your phone on and with you. Answer the office, or call back, within 15 minutes.\n3. Be ready to start a shift within 1 hour.\n4. If the office calls you about an open shift during your on-call time, you cover it.\n5. If you don't answer the office within 15 minutes, or you don't cover the shift, you won't be paid for that on-call shift, and you won't be able to sign up for on call again.\n6. If something comes up, call the office at least 24 hours before your on-call shift starts. To stop an every-week on-call shift, call the office at least 24 hours before the next one starts."  # her approved words, all six points (the server sends these)
def slots():
    out = []
    for i in range(28):
        d = f'2026-{10 if i < 3 else 11}-{29 + i if i < 3 else i - 2:02d}'
        r = { 'date': d, 'day': { 'state': 'open' }, 'overnight': { 'state': 'open' } }
        if i == 0: r = dict(r, day={ 'state': 'past' })
        if i == 2: r = dict(r, day={ 'state': 'mine', 'can_give_back': True }, overnight={ 'state': 'taken' })
        if i == 3: r = dict(r, overnight={ 'state': 'asked', 'id': 41 })
        if i == 5: r = dict(r, overnight={ 'state': 'closed' })   # 2026-10-30: not offered
        out.append(r)
    return out
def view(**su):
    base = { 'ready': True, 'waiting': False, 'terms': TERMS, 'version': 'v1234abcd', 'signed': True, 'signed_before': True, 'blocked': False, 'days': 28, 'give_back_hours': 24, 'slots': slots() }
    base.update(su)
    return { 'ok': True, 'preview': False, 'live': True, 'today': '2026-10-29', 'first': 'Grace', 'team': 'cna', 'team_label': 'PRN CNA Team', 'since': '2026-03-14', 'on_schedule': True,
      'looking': { 'on': False }, 'offered': [], 'clients': [], 'thanks': [], 'courses': [], 'office': '(417) 234-8494',
      'hours': { 'windows': {}, 'target_hours': None, 'outside_ok': False, 'updated_at': None, 'short_notice_ok': None, 'break_until': None },
      'oncall': { 'pattern': None, 'confirmed': [], 'patterns': { 'every_weekend': 'Every weekend' }, 'words': 'On call comes in two shifts: daytime, 7am to 7pm, and overnight, 7pm to 7am the next morning.', 'signup': base } }
R = []; ok = lambda n, c, d='': R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:500]))
def page(pw, qs, answer):
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 400, 'height': 1800}); calls = []
    def route(r):
        u = r.request.url
        if '/functions/v1/prn-page' in u:
            body = json.loads(r.request.post_data or '{}'); calls.append(body); s, j = answer(body)
            return r.fulfill(status=s, content_type='application/json', body=json.dumps(j))
        if 'fonts.g' in u: return r.abort()
        return r.continue_()
    pg.route('**/*', route); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200])); pg.on('dialog', lambda d: d.accept())
    pg.goto(f'http://localhost:{PORT}/prn.html{qs}'); pg.wait_for_timeout(700)
    return b, pg, calls, errs
LINK = '?p=0f1e2d3c-4b5a-4968-8776-655443322110&e=1999999999&t=' + 'x' * 43
with sync_playwright() as pw:
    # not signed yet
    V = view(signed=False, signed_before=False)
    b, pg, calls, errs = page(pw, LINK, lambda body: (200, V) if body.get('action') == 'view' else (200, { 'ok': True, 'message': 'Thank you, Grace. You can sign up for on-call shifts now.' }))
    t = pg.inner_text('#oncall')
    ok('24: not signed: the expectations, word for word, a box and their name; no shifts yet', 'PRN CNA On-Call Expectations' in t and "you won't be paid for that on-call shift" in t and pg.locator('#ocAgree').count() == 1 and pg.locator('[data-ocp]').count() == 0, t)
    pg.locator('#oncall').screenshot(path=os.environ.get('SHOT', '/tmp/prn_oncall_sign.png'))
    ok('...all six points show', all(f'{i}. ' in t for i in range(1, 7)), t)
    ok('...an On call link in the menu', 'On call' in pg.inner_text('nav'))
    pg.fill('#ocName', 'Grace Hill'); pg.click('#ocSign'); pg.wait_for_timeout(150)
    ok('...the box first: nothing is sent', not any(c.get('action') == 'oncall_sign' for c in calls) and 'Check the box' in pg.inner_text('#ocSignMsg'))
    pg.check('#ocAgree'); pg.click('#ocSign'); pg.wait_for_timeout(200)
    sc = [c for c in calls if c.get('action') == 'oncall_sign']
    ok('...then their name, the box and the version go with their link', sc and sc[-1]['typed_name'] == 'Grace Hill' and sc[-1]['agree'] is True and sc[-1]['version'] == 'v1234abcd' and sc[-1].get('t'), sc)
    b.close()
    V = view(signed=False, signed_before=True)
    b, pg, calls, errs = page(pw, LINK, lambda body: (200, V))
    ok('...new words: "changed, please read and sign again"', 'The On-Call Expectations changed' in pg.inner_text('#oncall')); b.close()
    # signed
    V = view()
    def ans(body):
        if body.get('action') == 'view': return 200, V
        return 200, { 'ok': True, 'message': 'Thank you, Grace! The office will confirm them with you. Nothing is set until they do.' }
    b, pg, calls, errs = page(pw, LINK, ans)
    t = pg.inner_text('#oncall')
    ok("23: signed: today plus 4 weeks, two shifts a day; theirs, asked, taken, too soon", pg.locator('.ocrow').count() == 28 and "You're on call: Sat, Oct 31 daytime" in t and 'Waiting for' in t and 'Taken' in t and pg.locator('.slot.past').count() == 1, t[:700])
    ok('...never another person\'s name, never pay', 'Grace' not in t.replace("You're on call", '') and '$' not in t)
    ok('2026-10-30: a shift that isn\'t offered says "Not offered" and can\'t be tapped', 'Not\noffered' in t and pg.locator('[data-ocp="2026-11-03|overnight"]').count() == 0, t[:600])
    ok('27: giving one back is a call to the office, 24 hours ahead', 'Call the office at least 24 hours before it starts' in t)
    pg.click('#ocAsk'); pg.wait_for_timeout(100)
    ok('...asking with nothing tapped: says so, sends nothing', not any(c.get('action') == 'oncall_ask' for c in calls) and 'Tap the shifts' in pg.inner_text('#ocAskMsg'))
    pg.click('[data-ocp="2026-11-02|day"]'); pg.click('[data-ocp="2026-11-02|overnight"]'); pg.click('[data-ocp="2026-11-03|day"]'); pg.click('[data-ocp="2026-11-03|day"]')
    ok('...tapping marks a shift; tapping again unmarks it', pg.locator('.slot.pick').count() == 2)
    pg.click('#ocAsk'); pg.wait_for_timeout(200)
    ac = [c for c in calls if c.get('action') == 'oncall_ask']
    ok('...Ask sends just those shifts with their link', ac and sorted(s['date'] + s['slot'] for s in ac[-1]['slots']) == ['2026-11-02day', '2026-11-02overnight'] and ac[-1].get('t'), ac)
    pg.click('[data-ocw="41"]'); pg.wait_for_timeout(200)
    ok('...their own waiting ask can be taken back', any(c.get('action') == 'oncall_withdraw' and c.get('id') == 41 for c in calls))
    ok('no page errors', not errs, errs); b.close()
    # EVERY WEEK (2026-10-30, her "yes to all 7")
    sl = slots()
    sl[2] = dict(sl[2], day={ 'state': 'mine', 'weekly': True, 'can_give_back': True })
    sl[3] = dict(sl[3], overnight={ 'state': 'asked', 'id': 41, 'weekly': True })
    sl[16] = dict(sl[16], day={ 'state': 'taken', 'skip': True })
    WK = [{ 'id': 3, 'word': 'Saturdays, daytime', 'slot': 'day', 'weekday': 6, 'status': 'confirmed', 'since': '2026-10-31' }, { 'id': 4, 'word': 'Sundays, overnight', 'slot': 'overnight', 'weekday': 0, 'status': 'asked', 'since': '2026-11-01' }]
    V = view(slots=sl, weekly=WK, weekly_ready=True)
    b, pg, calls, errs = page(pw, LINK, ans)
    t = pg.inner_text('#oncall')
    ok('every week: their shift and their ask say every week; the week someone else holds says so, never who', 'every week' in pg.inner_text('.ocrow:nth-of-type(3)') and 'every week' in pg.inner_text('[data-ocw="41"]') and 'Someone else' in t and 'this week' in t, t[:600])
    ok('...the list: Saturdays (since Oct 31), Sundays waiting for the office, and how to stop one', 'Every week: Saturdays, daytime (since Oct 31); Sundays, overnight (waiting for the office).' in t and 'To stop one, call the office at least 24 hours before the next one starts' in t, t[:500])
    h = pg.inner_text('#hours')
    ok('...My hours (where the 60-day check-in lands): only the confirmed ones, "Still right?"', 'Your every-week on-call shifts: Saturdays, daytime (since Oct 31).' in h and 'Still right?' in h and 'Sundays' not in h, h)
    ok('...a choice before tapping: Just this one (chosen) or Every week', pg.locator('[data-ocm="once"][aria-pressed="true"]').count() == 1 and pg.locator('[data-ocm="weekly"]').count() == 1)
    pg.click('[data-ocp="2026-11-02|day"]'); pg.click('[data-ocm="weekly"]'); pg.click('[data-ocp="2026-11-02|overnight"]')
    ok('...a shift tapped on Every week says every week', 'every week' in pg.inner_text('[data-ocp="2026-11-02|overnight"]') and 'every week' not in pg.inner_text('[data-ocp="2026-11-02|day"]') and pg.locator('.slot.pick.weekly').count() == 1)
    pg.click('#ocAsk'); pg.wait_for_timeout(200)
    ac = [c for c in calls if c.get('action') == 'oncall_ask']
    ok('...Ask sends which ones are every week', ac and sorted((s['date'] + s['slot'] + ('W' if s.get('weekly') else '')) for s in ac[-1]['slots']) == ['2026-11-02day', '2026-11-02overnightW'], ac)
    pg.locator('#oncall').screenshot(path=os.environ.get('SHOT2', '/tmp/prn_oncall_weekly.png'))
    ok('no page errors (every week)', not errs, errs); b.close()
    V = view(weekly_ready=False)
    b, pg, calls, errs = page(pw, LINK, ans)
    ok('...before its records are on the server: no Every week choice, one time works as before', pg.locator('[data-ocm]').count() == 0 and pg.locator('[data-ocp]').count() > 0); b.close()
    V = view()
    b, pg, calls, errs = page(pw, LINK, ans)
    ok('...an older server that doesn\'t say (Hub merged first): no Every week choice either', pg.locator('[data-ocm]').count() == 0 and pg.locator('[data-ocp]').count() > 0); b.close()
    # blocked
    V = view(blocked=True)
    b, pg, calls, errs = page(pw, LINK, lambda body: (200, V))
    t = pg.inner_text('#oncall')
    ok("25: after a miss: \"isn't open to you right now\", no shifts", "On call isn't open to you right now" in t and pg.locator('[data-ocp]').count() == 0, t); b.close()
    # switch off: the earlier preference question, no sign-up section
    V = view(); V['oncall'] = dict(V['oncall']); del V['oncall']['signup']
    b, pg, calls, errs = page(pw, LINK, lambda body: (200, V))
    ok('switch off: no On call section (the earlier question stays under My hours)', pg.locator('#oncall').count() == 0 and 'Would you like to be on call sometimes?' in pg.inner_text('#hours')); b.close()

    # 26: "On call now" on an open shift (oncall-now.js on the Hub)
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1300, 'height': 1000}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.route('**/*', lambda r: r.abort() if 'supabase.co/rest' in r.request.url or 'supabase.co/auth' in r.request.url else r.continue_())
    pg.goto(f'http://localhost:{PORT}/index.html?proof=oncallnow'); pg.wait_for_timeout(1500)
    out = pg.evaluate("""async () => {
      const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
      window.ccConfirm=async()=>true; (0,eval)('ccConfirm=window.ccConfirm'); let alerted=''; window.ccAlert=(m)=>{alerted=m}; (0,eval)('ccAlert=window.ccAlert');
      (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha Troutman' };"); CC_ROLES=['owner_admin']; CC_ROLES_CHECKED=true; CC_ROLE_BY_EMAIL['samantha@mo-care.com']=['owner_admin'];
      sb.auth.getSession=async()=>({ data:{ session:{ access_token:'t' } } });
      let NOW={ ok:true, live:false, cases:[{ case_id:'cv1', oncall_id:7, applicant_id:'g', name:'Grace Hill', first:'Grace', date:'2026-11-02', slot:'day', slot_word:'Daytime, 7am to 7pm', phone:'+14175550101', outcome:null, hold_until:null }] };
      const CALLS=[]; const real=window.fetch;
      window.fetch=async(u,o)=>{ if(String(u).includes('/functions/v1/prn-week')){ const b=JSON.parse(o.body); CALLS.push(b);
        if(b.action==='oncall_now') return new Response(JSON.stringify(NOW),{status:200});
        if(b.action==='oncall_mark') return new Response(JSON.stringify(b.kind==='covering'?{outcome:'covering',on_case:'added',linked:true}:{outcome:'missed',name:'Grace Hill',taken_back:[{date:'2026-11-07',shift:'overnight',kind:'confirmed'}],failed:[]}),{status:200}); }
        return real(u,o); };
      const c={ id:'cv1', status:'open', client:'Ruth Lane', shift_date:'2026-11-02', shift_time:'09:00-13:00', asked:[] };
      ok('nothing before it has loaded', ONC.html(c)==='');
      await ONC.load(true); await sleep(30);
      let h=ONC.html(c), d=document.createElement('div'); d.innerHTML=h; document.body.appendChild(d);
      ok('switch off, owner: "On call now: Grace Hill", marked practice, nothing waits', /On call now: Grace Hill/.test(d.innerText) && /Practice: only owners see this, and nothing waits/.test(d.innerText) && /\\(daytime, 7am to 7pm\\)/.test(d.innerText), d.innerText);
      ok('...Call from the office line (the Hub call button), and the three outcomes', !!d.querySelector('[data-oc-phone="+14175550101"]') && /Covering it/.test(d.innerText) && /Didn't answer in 15 minutes/.test(d.innerText) && /Didn't cover the shift/.test(d.innerText), d.innerHTML.slice(0,600));
      ok('...a closed case or another case: nothing', ONC.html(Object.assign({},c,{status:'filled'}))==='' && ONC.html(Object.assign({},c,{id:'cv2'}))==='');
      CC_ROLES=['care_coordinator']; CC_ROLE_BY_EMAIL['samantha@mo-care.com']=['care_coordinator'];
      ok('...switch off, not an owner: nothing', ONC.html(c)==='');
      NOW.live=true; NOW.cases[0].hold_until='2026-11-02T14:20:00Z'; await ONC.load(true); d.innerHTML=ONC.html(c);
      ok('switch on: everyone sees it, no practice; the texts wait until a time', /On call now/.test(d.innerText) && !/Practice/.test(d.innerText) && /The automatic texts wait until \\d/.test(d.innerText), d.innerText);
      await ONC.mark('cv1',7,'covering'); await sleep(30);
      ok('Covering it sends it for this case', CALLS.some(x=>x.action==='oncall_mark' && x.kind==='covering' && x.case_id==='cv1' && x.oncall_id===7));
      NOW.cases[0].outcome={ kind:'covering', word:'Covering it', by:'Krystal', at:'2026-11-02T14:05:00Z' }; NOW.cases[0].hold_until=null; await ONC.load(true); d.innerHTML=ONC.html(c);
      ok('...then it shows "Covering it", who recorded it, and only "Didn\\'t cover the shift after all"', /Covering it/.test(d.innerText) && /recorded by Krystal/.test(d.innerText) && /Didn't cover the shift after all/.test(d.innerText) && !/Didn't answer in 15/.test(d.innerText), d.innerText);
      await ONC.mark('cv1',7,'not_covered'); await sleep(30);
      ok('a miss: sent, then says what was taken back and to call them', CALLS.some(x=>x.action==='oncall_mark' && x.kind==='not_covered') && /Taken back: Nov 7 overnight/.test(alerted) && /Call them/.test(alerted), alerted);
      return R; }""")
    R += [tuple(x) for x in out]
    ok('no page errors (Hub)', not errs, errs); b.close()
for s, n, d in R: print(s, '·', n, d)
print(f"{sum(1 for r in R if r[0] == 'PASS')} / {len(R)}")

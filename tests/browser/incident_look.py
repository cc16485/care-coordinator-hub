"""Incident report, Stage 1 (Samantha 2026-10-27). Offline, made-up records, every server answer faked, nothing saved or sent.
(1) incident.html, the caregiver's page, at phone size: the questions, the follow-up that appears, the finger signature, what is
sent, the thank-you. (2) The office side (incidents.js + shift-flags.js on a bare page): "Write it up as an incident" on a red
flag opens the report form with the flag's client, caregiver and day; Make the link, check the text, Send; the incident card's
Open the report; the client's profile list. (python3 -m http.server 8793 in the repo, then python3 tests/browser/incident_look.py)"""
import json
from playwright.sync_api import sync_playwright
BASE = 'http://localhost:8793'
R = []
def ok(n, c, d=''): R.append(['PASS' if c else 'FAIL', n, '' if c else str(d)[:500]])
Q = [{'k': 'time', 'type': 'text', 'label': 'About what time did it happen?', 'hint': 'For example: 2:15 pm'},
     {'k': 'where', 'type': 'choice', 'label': 'Where did it happen?', 'opts': ['Bathroom', 'Bedroom', 'Kitchen', 'Living room', 'Stairs or steps', 'Outside', 'In a car', 'Somewhere else']},
     {'k': 'what', 'type': 'long', 'label': 'What happened? Tell it in your own words, step by step.', 'min': 20},
     {'k': 'hurt', 'type': 'choice', 'label': 'Was Test hurt?', 'opts': ['Yes', 'No', 'Not sure']},
     {'k': 'hurt_how', 'type': 'long', 'label': 'What did you see or what did Test say?', 'min': 5, 'when': {'k': 'hurt', 'in': ['Yes', 'Not sure']}},
     {'k': 'did', 'type': 'long', 'label': 'What did you do right then?', 'min': 10},
     {'k': 'help', 'type': 'multi', 'label': 'Who was called for help? (pick all that apply)', 'opts': ['911', 'Family', 'A nurse or doctor', 'No one']},
     {'k': 'saw', 'type': 'text', 'label': 'Did anyone else see it happen?'},
     {'k': 'told', 'type': 'choice', 'label': 'How did you let the office know?', 'opts': ['I called the office', 'I texted the office', 'I only wrote it in my shift note', 'I have not told the office until now']},
     {'k': 'told_when', 'type': 'text', 'label': 'When did you call or text the office, and who did you talk to?', 'when': {'k': 'told', 'in': ['I called the office', 'I texted the office']}},
     {'k': 'more', 'type': 'long', 'label': 'Anything else the office should know?', 'optional': True}]

with sync_playwright() as pw:
    b = pw.chromium.launch()
    # ── 1. the caregiver's page ──
    calls = []; state = {'status': 'waiting', 'practice': True, 'kind': 'client'}
    def fn(route):
        body = json.loads(route.request.post_data or '{}'); calls.append(body)
        if body.get('action') == 'view':
            return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'first': 'Tess', 'client_first': 'Test', 'client_short': 'Test C.', 'happened_on': '2026-10-26',
                'note_words': 'Test slipped in the bathroom, says she is ok.', 'questions': Q, 'true_words': 'What I wrote here is true and complete to the best of my knowledge.', 'status': state['status'], 'practice': state['practice'], 'kind': state['kind'], 'office_phone': '(417) 234-8494'}))
        if body.get('action') == 'submit':
            return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'copy_url': 'https://example.test/copy.pdf', 'practice': state['practice']}))
        route.fulfill(status=404, body='{}')
    p = b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    errs = []; p.on('pageerror', lambda e: errs.append(str(e)[:200]))
    p.route('**/functions/v1/incident-report', fn)
    p.route('**/*', lambda r: r.fallback() if 'functions/v1/incident-report' in r.request.url else (r.abort() if ('fonts.' in r.request.url or 'leadconnector' in r.request.url or 'filesafe' in r.request.url) else r.continue_()))
    p.goto(BASE + '/incident.html?t=' + 'A' * 43); p.wait_for_timeout(800)
    t = p.inner_text('#main')
    ok('the page opens: her first name, the client, the day, her note words, a call-the-office button, the practice banner', 'Hi Tess' in t and 'with Test' in t and 'Monday, October 26' in t and 'slipped in the bathroom' in t and p.query_selector('a[href="tel:4172348494"]') and 'Practice' in t, t[:400])
    ok('every question is on the page; the two follow-ups are hidden at first', all(p.query_selector('#w_' + q['k']) for q in Q) and not p.is_visible('#w_hurt_how') and not p.is_visible('#w_told_when'))
    ok('fits the phone (no sideways scroll)', p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
    p.screenshot(path='tests/browser/incident_page.png', full_page=True)
    p.click('#go'); p.wait_for_timeout(200)
    ok('sending with nothing filled in names the first missing question', 'Please answer: About what time' in p.inner_text('#err') and not any(c.get('action') == 'submit' for c in calls))
    p.fill('#q_time', '2:15 pm'); p.click('#w_where label:has-text("Bathroom")'); p.fill('#q_what', 'She slid off the toilet seat onto the floor while I got her towel.')
    p.click('#w_hurt label:has-text("Yes")'); p.wait_for_timeout(100)
    ok('"Yes, hurt" shows what was seen', p.is_visible('#w_hurt_how'))
    p.fill('#q_hurt_how', 'A red mark on her left hip.'); p.fill('#q_did', 'I helped her up and checked her over.')
    p.click('#w_help label:has-text("Family")'); p.click('#w_help label:has-text("No one")')
    ok('"No one" for help clears the others', p.evaluate("[...document.querySelectorAll('input[name=q_help]:checked')].map(x=>x.value).join()") == 'No one')
    p.click('#w_help label:has-text("Family")')
    ok('...and picking someone clears "No one"', p.evaluate("[...document.querySelectorAll('input[name=q_help]:checked')].map(x=>x.value).join()") == 'Family')
    p.fill('#q_saw', 'no one'); p.click('#w_told label:has-text("I called the office")'); p.wait_for_timeout(100)
    ok('"I called the office" asks when and who', p.is_visible('#w_told_when'))
    p.click('#go'); p.wait_for_timeout(200)
    ok('...and it is required', 'When did you call' in p.inner_text('#err'))
    p.fill('#q_told_when', '2:30 pm, Krystal')
    p.reload(); p.wait_for_timeout(800)
    ok('an interruption loses nothing: the answers come back after a reload', p.input_value('#q_what').startswith('She slid') and p.is_checked('#w_hurt input[value="Yes"]') and p.input_value('#q_told_when') == '2:30 pm, Krystal' and p.is_visible('#w_told_when'))
    p.click('#go'); p.wait_for_timeout(200)
    ok('it needs the true-and-complete tick', 'Tick the box' in p.inner_text('#err'))
    p.check('#ok'); p.click('#go'); p.wait_for_timeout(200)
    ok('...and a finger signature', 'Sign in the box' in p.inner_text('#err'))
    box = p.query_selector('#pad').bounding_box()
    p.mouse.move(box['x'] + 30, box['y'] + 100); p.mouse.down()
    for i in range(1, 25): p.mouse.move(box['x'] + 30 + i * 10, box['y'] + 100 - (i % 6) * 9)
    p.mouse.up()
    p.fill('#nm', 'Tess'); p.click('#go'); p.wait_for_timeout(200)
    ok('...and a full first and last name', 'full first and last name' in p.inner_text('#err'))
    p.fill('#nm', 'Tess Caregiver'); p.click('#go'); p.wait_for_timeout(500)
    s = [c for c in calls if c.get('action') == 'submit'][-1]
    a = s.get('answers', {})
    ok('it sends the answers, the tick, the typed name and the drawn strokes (0 to 1 in the box)', a.get('where') == 'Bathroom' and a.get('help') == ['Family'] and a.get('hurt_how') and s.get('consent') is True and s.get('typed_name') == 'Tess Caregiver'
       and len(s.get('strokes', [])) == 1 and len(s['strokes'][0]) > 10 and all(0 <= v <= 1 for pt in s['strokes'][0] for v in pt), s)
    ok('...the link code with every call, nothing in localStorage', s.get('t') == 'A' * 43 and p.evaluate('localStorage.length') == 0)
    t = p.inner_text('#main')
    ok('thank you: signed and sent, call the office next time, her copy', 'signed and sent to the office' in t and 'call the office right away' in t and p.query_selector('a[href="https://example.test/copy.pdf"]'), t)
    ok('...and the saved answers are cleared from this tab', p.evaluate("Object.keys(sessionStorage).filter(k=>k.startsWith('inc_draft_')).length") == 0)
    p.screenshot(path='tests/browser/incident_signed.png')
    state['status'] = 'submitted'; p.goto(BASE + '/incident.html?t=' + 'B' * 43); p.wait_for_timeout(600)
    ok('opened again after signing: already signed, thank you', 'already filled in and signed' in p.inner_text('#main'))
    state['status'] = 'expired'; p.goto(BASE + '/incident.html?t=' + 'C' * 43); p.wait_for_timeout(600)
    ok('an expired link says to call the office for a new one', 'expired' in p.inner_text('#main') and '234-8494' in p.inner_text('#main'))
    state['status'] = 'waiting'; state['kind'] = 'employee_injury'; p.goto(BASE + '/incident.html?t=' + 'D' * 43); p.wait_for_timeout(600)
    ok('a work injury link: sorry you were hurt, call the office for medical care', "sorry you were hurt" in p.inner_text('#main') and 'medical care' in p.inner_text('#main'))
    state['kind'] = 'client'
    p.goto(BASE + '/incident.html'); p.wait_for_timeout(400)
    ok('no link code: not active, call the office', 'not active' in p.inner_text('#main'))
    ok('no page errors (caregiver page)', not errs, errs)

    # ── 2. the office side on a bare page ──
    q = b.new_page(viewport={'width': 1200, 'height': 900})
    errs2 = []; q.on('pageerror', lambda e: errs2.append(str(e)[:200]))
    q.route('**/*', lambda r: r.abort() if ('supabase.co' in r.request.url or 'fonts.' in r.request.url) else r.continue_())
    q.goto(BASE + '/tests/browser/blank.html' if False else BASE + '/incident.html'); q.wait_for_timeout(300)
    q.set_content('<html><head><style>.overlay{display:none}.overlay.open{display:block}</style></head><body><div id="cp_shift_notes"></div></body></html>')
    q.evaluate(r"""() => {
      window.API = []; window.SAVED = [];
      window.DATA = { caregivers:[{ first:'Tess', last:'Caregiver' }, { first:'Pat', last:'Doe' }], ops_items:[{ id:'flag1', kind:'care_note', level:'red', status:'open', about:'Test Client', client_ax:'501', caregiver:'Tess Caregiver', visit_day:'Mon, Oct 26', why:'a fall', flag_kind:'a fall or injury', detail:'"Test slipped"' }], ops_settings:{} };
      window.CP = { ax:'501', r:{ client_name:'Test Client' } };
      window.ccToast = (m) => { window.TOAST = m }; window.ccConfirm = async () => true; window.persist = async (k, it) => { window.SAVED.push(it) }; window.opsLog = () => {};
      window.sb = { functions:{ invoke: async (fn, { body }) => { window.API.push(body);
        const INV = () => ({ inv_asked_at: window.ASKED ? '2026-10-27T18:00:00Z' : null, inv_asked_by_name: 'Krystal Test', inv_ask: window.ASKED ? { why: window.ASKED.why, note: window.ASKED.note } : null,
          inv_at: window.FOUND ? '2026-10-27T19:00:00Z' : null, inv_by_name: 'Zach Test', inv_findings: window.FOUND ? { outcome: window.FOUND.outcome, findings: window.FOUND.findings } : null });
        if (body.action === 'investigate') { window.ASKED = body; return { data:{ ok:true, summary:'x' } }; }
        if (body.action === 'findings') { window.FOUND = body; return { data:{ ok:true, outcome:'A coaching conversation' } }; }
        if (body.action === 'list' && body.hr) return { data:{ ok:true, live:true, hr:true, hotline:'1-800-392-0210', reports:[
          Object.assign({ id:'00000000-0000-4000-8000-000000000001', status:'submitted', client_name:'Test Client', caregiver:'Tess Caregiver', happened_on:'2026-10-26', started_at:'2026-10-27T15:00:00Z', told_late:true }, INV()),
          { id:'inj1', kind:'employee_injury', status:'submitted', caregiver:'Pat Doe', client_name:'', happened_on:'2026-10-20', started_at:'2026-10-20T15:00:00Z', reviewed_at:null },
          { id:'inj2', kind:'employee_injury', status:'waiting', caregiver:'Tess Caregiver', client_name:'', happened_on:'2026-10-26', started_at:new Date().toISOString(), reviewed_at:null, practice:true }] } };
        if (body.action === 'list' && body.ids && body.ids[0] === 'inj1') return { data:{ ok:true, live:true, reports:[{ id:'inj1', kind:'employee_injury', status:'submitted', caregiver:'Tess Caregiver', client_name:'', happened_on:'2026-10-26', signed_name:'Tess Caregiver', submitted_at:'2026-10-27T16:00:00Z', comp_due:'Nov 1', reviewed_at:null, answers:{ body:'lower back' }, questions:[{ k:'body', label:'What part of your body was hurt?' }] }] } };
        if (body.action === 'start' || body.action === 'relink') return { data:{ ok:true, practice:false, report:{ id:'00000000-0000-4000-8000-000000000001', client_ax:'501', client_name:'Test Client', caregiver:body.caregiver || 'Tess Caregiver', happened_on:body.happened_on || '2026-10-26' }, link:'https://cc.mo-care.com/incident.html?t=' + 'Z'.repeat(43), draft:'Hi Tess, this is Caring Companions. We need your incident report: https://cc.mo-care.com/incident.html?t=' + 'Z'.repeat(43), phone_last4:'0100' } };
        if (body.action === 'send') return { data:{ ok:true, outcome:'sent' } };
        if (body.action === 'list') return { data:{ ok:true, live:true, hr:!!window.ISHR, reports: body.client_ax ? [{ id:'00000000-0000-4000-8000-000000000001', status:'waiting', caregiver:'Tess Caregiver', happened_on:'2026-10-26', sent_at:'2026-10-27T15:00:00Z' }]
          : body.caregiver ? [{ id:'00000000-0000-4000-8000-000000000001', status:'submitted', client_name:'Test Client', caregiver:'Tess Caregiver', happened_on:'2026-10-26', told_late:true, reviewed_at:null }]
          : [{ ...INV(), id:'00000000-0000-4000-8000-000000000001', status:'submitted', client_ax:'501', reviewed_at:window.REVIEWED ? '2026-10-27T17:00:00Z' : null, reviewed_by_name:'Krystal Test',
              review:window.REVIEWED ? { family:{ told:'yes', who:'Jan', when:'3pm' }, medical:{ what:'none' }, careplan:{ change:true, note:'Gait belt' }, ane:{ suspect:false } } : null, client_name:'Test Client', caregiver:'Tess Caregiver', happened_on:'2026-10-26', signed_name:'Tess Caregiver', submitted_at:'2026-10-27T16:00:00Z', told_late:true,
              answers:{ what:'She slid off the seat.', hurt:'Yes' }, questions:[{ k:'what', label:'What happened?' }, { k:'hurt', label:'Was Test hurt?' }] }] } };
        if (body.action === 'open') return { data:{ ok:true, url:'https://signed.test/x.pdf' } };
        if (body.action === 'review' && body.comp) { window.IREVIEWED = body; return { data:{ ok:true, summary:'Doctor or urgent care · reported · Light duty', safety_card:true } }; }
        if (body.action === 'review') { window.REVIEWED = body; return { data:{ ok:true, summary:'Family told (Jan, 3pm) · No care needed · care plan to change · not abuse or neglect', careplan_card:true } }; }
        return { data:{ error:'unknown' } } } } };
    }""")
    q.add_script_tag(url=BASE + '/shift-flags.js'); q.add_script_tag(url=BASE + '/incidents.js'); q.wait_for_timeout(300)
    q.evaluate("() => { document.body.insertAdjacentHTML('beforeend', '<div id=flagcard>' + cnBlock(DATA.ops_items[0]) + cnActions(DATA.ops_items[0]) + '</div>') }")
    q.click('#flagcard button:has-text("Write it up as an incident")'); q.wait_for_timeout(300)
    ok('a red flag\'s "Write it up as an incident" opens the report form with the flag\'s caregiver and day', q.is_visible('#incSheet') and q.input_value('#incCg') == 'Tess Caregiver' and q.input_value('#incDay').endswith('-10-26') and 'Test Client' in q.inner_text('#incBody'), q.inner_text('#incBody')[:300])
    ok('...nothing is started until a person presses the button', not any(x.get('action') == 'start' for x in q.evaluate('API')))
    q.click('#incGo'); q.wait_for_timeout(300)
    st = [x for x in q.evaluate('API') if x.get('action') == 'start'][-1]
    ok('Make the link: it starts from the flag (client, caregiver, day)', st.get('source_item_id') == 'flag1' and st.get('caregiver') == 'Tess Caregiver' and st.get('client_ax') == '501' and st.get('happened_on', '').endswith('-10-26'), st)
    ok('...the flag records the step', any(x.get('id') == 'flag1' and any(a.get('what') == 'incident' for a in (x.get('cn_actions') or [])) for x in q.evaluate('SAVED')))
    ok('...then the text to check: phone ending, the words, Send', '0100' in q.inner_text('#incBody') and 'incident.html?t=' in q.input_value('#incMsg') and q.is_visible('#incSend'))
    q.screenshot(path='tests/browser/incident_office_send.png')
    q.click('#incSend'); q.wait_for_timeout(300)
    sd = [x for x in q.evaluate('API') if x.get('action') == 'send'][-1]
    ok('Send sends the words exactly as shown', sd.get('message') == q.input_value('#incMsg') and 'Sent.' in q.inner_text('#incOut'), sd)
    q.evaluate("() => INC.close()")
    q.evaluate("() => { document.body.insertAdjacentHTML('beforeend', '<div id=inccard>' + incCardHtml({ id:'ops_inc_1', kind:'client_issue', incident_id:'00000000-0000-4000-8000-000000000001' }) + incCardHtml({ id:'x', kind:'client_issue' }) + '</div>') }")
    ok('the incident card has Open the report; other cards get nothing', q.locator('#inccard button').count() == 1)
    q.click('#inccard button'); q.wait_for_timeout(300)
    t = q.inner_text('#incBody')
    ok('Open the report: who signed and when, the not-called warning, the answers, Open the PDF', 'Signed by Tess Caregiver' in t and 'was not called or texted' in t and 'She slid off the seat.' in t and q.is_visible('#incPdf'), t)
    q.click('#incPdf'); q.wait_for_timeout(300)
    ok('...the PDF opens through the logged door', q.query_selector('#incPdfOut a[href="https://signed.test/x.pdf"]') is not None)
    ok('a signed report not reviewed yet shows the office review, nothing saved yet', 'Office review' in t and q.is_visible('#rvSave') and not q.evaluate('window.REVIEWED'))
    q.click('#incBody input[name=rvAne][value=yes]'); q.wait_for_timeout(100)
    ok('"Could this be abuse or neglect: yes" shows the state hotline to call first', q.is_visible('#rvAneYes') and '1-800-392-0210' in q.inner_text('#rvAneYes') and q.query_selector('#rvAneYes a[href="tel:18003920210"]'))
    q.click('#incBody input[name=rvAne][value=no]')
    q.click('#incBody input[name=rvFam][value=yes]'); q.fill('#rvFamWho', 'Jan, daughter'); q.fill('#rvFamWhen', 'Oct 26, 3pm')
    q.click('#incBody input[name=rvMed][value=none]'); q.click('#incBody input[name=rvCp][value=yes]'); q.fill('#rvCpTxt', 'Gait belt for every bathroom transfer')
    q.screenshot(path='tests/browser/incident_office_review.png')
    q.click('#rvSave'); q.wait_for_timeout(500)
    rv = q.evaluate('window.REVIEWED') or {}
    ok('Save sends the checklist: family who and when, medical, care plan change, not abuse', rv.get('family', {}).get('who') == 'Jan, daughter' and rv.get('medical', {}).get('what') == 'none' and rv.get('careplan', {}).get('change') is True and rv.get('ane', {}).get('suspect') is False, rv)
    t = q.inner_text('#incBody')
    ok('...then the report shows the saved review, with no form', 'By Krystal Test' in t and 'Told: Jan' in t and 'Needs a change: Gait belt' in t and not q.query_selector('#rvSave'), t[-400:])
    q.screenshot(path='tests/browser/incident_office_read.png')
    q.evaluate("() => INC.close()")
    q.evaluate("() => { window.cnRender = () => { document.getElementById('cp_shift_notes').innerHTML = INC.profileHtml('501') }; cnRender() }"); q.wait_for_timeout(400)
    t = q.inner_text('#cp_shift_notes')
    ok('the client\'s profile: Incident reports, the waiting one, + New incident report', 'Incident reports' in t and 'Waiting for Tess' in t and 'New incident report' in t, t)
    q.click('#cp_shift_notes button:has-text("New incident report")'); q.wait_for_timeout(200)
    ok('New incident report from the profile: the client filled in, the caregiver to pick', 'Test Client' in q.inner_text('#incBody') and q.input_value('#incCg') == '' and q.query_selector('#incCgList option[value="Pat Doe"]'))
    q.evaluate("() => INC.close()"); q.evaluate("() => { document.body.insertAdjacentHTML('beforeend', '<div id=cgdIncidents></div>'); INC.caregiverMount('cgdIncidents', 'Tess Caregiver') }"); q.wait_for_timeout(400)
    t = q.inner_text('#cgdIncidents')
    ok("a caregiver's Performance tab: Incident reports, signed, waiting for review, not called at the time", 'Incident reports' in t and 'Test Client' in t and 'waiting for the office review' in t and 'not called at the time' in t, t)
    q.click('#cgdIncidents button:has-text("New work injury report")'); q.wait_for_timeout(200)
    ok('+ New work injury report on her Performance tab: the form, her name filled in and fixed, the client optional', 'Work injury report: Tess Caregiver' in q.inner_text('#incBody') and q.input_value('#incCg') == 'Tess Caregiver' and q.get_attribute('#incCg', 'readonly') is not None and q.is_visible('#incWhere'))
    q.click('#incGo'); q.wait_for_timeout(300)
    st = [x for x in q.evaluate('API') if x.get('action') == 'start'][-1]
    ok('...it starts a work injury report (no client, no flag)', st.get('kind') == 'employee_injury' and st.get('caregiver') == 'Tess Caregiver' and not st.get('source_item_id') and not st.get('client_ax'), st)
    q.evaluate("() => INC.close()"); q.evaluate("() => INC.open('inj1')"); q.wait_for_timeout(400)
    t = q.inner_text('#incBody')
    ok('a signed work injury: the workers\' comp checklist with the report-by day', 'Work injury report' in t and "Workers' comp checklist" in t and 'Nov 1' in t and q.is_visible('#irSave'), t[:500])
    q.click('#incBody input[name=irMed][value=doctor]'); q.fill('#irMedTxt', 'Urgent care, strain'); q.click('#incBody input[name=irComp][value=yes]'); q.fill('#irCompWhen', 'Oct 27'); q.fill('#irCompClaim', 'WC-1')
    q.click('#incBody input[name=irWork][value=light]'); q.fill('#irUntil', 'Nov 3'); q.click('#incBody input[name=irSafe][value=yes]'); q.fill('#irSafeTxt', 'Transfer board')
    q.screenshot(path='tests/browser/incident_injury_review.png')
    q.click('#irSave'); q.wait_for_timeout(400)
    iv = q.evaluate('window.IREVIEWED') or {}
    ok('...Save sends the checklist (medical, comp claim, light duty until, the fix)', iv.get('comp', {}).get('claim') == 'WC-1' and iv.get('work', {}).get('until') == 'Nov 3' and iv.get('safety', {}).get('fix') is True and iv.get('medical', {}).get('what') == 'doctor', iv)
    # ── HR (2026-10-27): the office hands a report to Zach; Zach writes what he found; his Incidents page and dashboard ──
    q.evaluate("() => INC.close()"); q.evaluate("() => INC.open('00000000-0000-4000-8000-000000000001')"); q.wait_for_timeout(400)
    ok('a signed report has "Ask Zach to look into it" (the form stays closed until pressed)', q.is_visible('#invOpen') and not q.is_visible('#invSend'))
    q.click('#invOpen'); q.wait_for_timeout(100)
    q.click('#incBody input[name=invWhy][value=ane]'); q.wait_for_timeout(100)
    ok('...possible abuse or neglect: the hotline comes first', q.is_visible('#invAne') and '1-800-392-0210' in q.inner_text('#invAne'))
    q.click('#incBody input[name=invWhy][value=ane]'); q.click('#incBody input[name=invWhy][value=notes]')
    q.fill('#invNote', 'Her report says Test was not hurt; her shift note says Test hit her hip.')
    q.screenshot(path='tests/browser/incident_ask_zach.png')
    q.click('#invSend'); q.wait_for_timeout(500)
    ak = q.evaluate('window.ASKED') or {}
    ok('Send it to Zach: why and what was noticed', ak.get('action') == 'investigate' and ak.get('why') == ['notes'] and 'hit her hip' in ak.get('note', ''), ak)
    t = q.inner_text('#incBody')
    ok("...a care coordinator then sees it's with Zach, with no findings form", 'Asked by Krystal Test' in t and "doesn't match the shift notes" in t and 'With Zach to look into' in t and not q.query_selector('#invSave'), t[-500:])
    q.evaluate("() => { window.ISHR = true; INC.close(); INC.open('00000000-0000-4000-8000-000000000001') }"); q.wait_for_timeout(400)
    ok('Zach opens it: What did you find, What happens next', q.is_visible('#invSave') and q.locator('#incBody input[name=invOut]').count() == 5)
    q.fill('#invFind', 'Talked with Tess: she forgot to call and only wrote it in her note. The daughter checked the hip, it is fine.')
    q.click('#incBody input[name=invOut][value=coaching]')
    q.screenshot(path='tests/browser/incident_zach_findings.png')
    q.click('#invSave'); q.wait_for_timeout(500)
    fd = q.evaluate('window.FOUND') or {}
    ok('...Save sends his findings and the outcome', fd.get('action') == 'findings' and fd.get('outcome') == 'coaching' and 'forgot to call' in fd.get('findings', ''), fd)
    t = q.inner_text('#incBody')
    ok('...then it shows Looked into by Zach, with no form', 'Looked into by Zach Test' in t and 'coaching' in t.lower() and not q.query_selector('#invSave'), t[-400:])
    q.evaluate("() => { INC.close(); window.FOUND = null; document.body.insertAdjacentHTML('beforeend', '<div id=hrInc></div><div id=hrIncN></div><a id=hrlink></a>'); window.HR = { go: (v) => { window.WENT = v } }; INC.hrMount('hrInc'); INC.hrDash('hrIncN') }"); q.wait_for_timeout(500)
    t = q.inner_text('#hrInc')
    ok("Zach's Incidents page: to look into, work injuries with the workers' comp day (late in red), every client report", 'To look into' in t and 'Test Client' in t and "doesn't match the shift notes" in t
      and 'Work injuries' in t and 'Pat Doe' in t and "workers' comp report was due" in t and q.query_selector('#hrInc .hr-late') and 'Every client incident report' in t, t)
    d = q.inner_text('#hrIncN')
    ok("Zach's dashboard: what to look into and the injury due day; practice left out", 'look into' in d and 'Pat Doe' in d and 'Tess Caregiver · work injury' not in d and 'Open Incidents' in d, d)
    q.click('#hrIncN a:has-text("Open Incidents")'); ok('...Open Incidents goes to the page', q.evaluate('window.WENT') == 'incidents')
    ok('no page errors (office side)', not errs2, errs2)
    b.close()

for r in R: print(r[0], r[1], r[2])
print(f"{sum(1 for r in R if r[0] == 'PASS')}/{len(R)} passed")
import sys; sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

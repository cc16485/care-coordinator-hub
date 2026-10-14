"""rn.html, the supervising RN's review page, and nurse-review-portal.js, the LPN's half on the Nurse Portal (2026-10-14, LPN
nurse visit plan steps 5 to 7; build spec launch/review/lpn/build-spec.md). Offline: supabase-js is replaced by a stand-in
(sign-in, session), and the rn-review server is faked to its contract (queue / open / sign / send_back / flag_review /
flag_create / mine; shapes copied from Staffing supabase/functions/rn-review/index.ts). Chromium AND WebKit (iPhone Safari's
engine) at 360px and 1024px:
  signed out -> the Hub sign-in -> her queue (only from the server; never app_data); the practice banner while the switch is
  off; a GHE laid out as the state form with the drawn signatures; Sign needs the tick and the typed name, then sends
  consent: true and the name; Send back with a note; a mark reviewed with her note; a client's nursing history with the
  AxisCare nurse visits; a server refusal shown in its own words; nothing wider than the screen; no em dash; no browser
  storage written by the page; every call goes to rn-review only.
  The Nurse Portal half: "Mark for Natasha" on the nurse's own caseload rows (live), only on practice clients while off;
  the mark sent with the service, date and words; Natasha's send-back note on the GHE row; her answer under "Marked for".
python3 tests/browser/rn_page_look.py [screenshot dir]"""
import json, sys, os, tempfile
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = sys.argv[1] if len(sys.argv) > 1 else tempfile.mkdtemp(prefix='rnlook-')
PAGE = 'file://' + os.path.join(ROOT, 'rn.html')
FN = 'https://zngsgedlsxinbygwmxwn.supabase.co/functions/v1/rn-review'
R = []
def ck(n, c, d=''): R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:500]))
PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
FAKE_SB = """window.supabase = { createClient: function(){ return { auth: {
  getSession: async function(){ return { data: { session: window.__signedIn ? { access_token: 'tok-nat' } : null } }; },
  signInWithPassword: async function(o){ window.__signins = (window.__signins || 0) + 1; if (o.password !== 'right') return { error: { message: 'Invalid login credentials' } }; window.__signedIn = true; return { data: {}, error: null }; },
  signOut: async function(){ window.__signedIn = false; return {}; } } }; } };"""
STORAGE_SPY = """(() => { window.__w = []; const o = Storage.prototype.setItem; Storage.prototype.setItem = function(k, v){ window.__w.push(k); return o.call(this, k, v); }; })()"""
LONG_SECTIONS = [{'h': 'A: PARTICIPANT INFORMATION', 'rows': [{'label': 'Participant Name', 'value': 'Ada Client'}, {'label': 'DCN (Medicaid number)', 'value': ''}, {'label': 'Address', 'value': '1200 South Very Long Street Name Avenue, Apartment 14B, Springfield, MO 65807'}]},
  {'h': 'E: ALLERGIES AND VITAL SIGNS', 'rows': [{'label': 'Blood Pressure', 'value': '128/80'}]},
  {'h': 'H: LEVEL OF CARE DETERMINATION', 'rows': [], 'scored': [{'title': 'MOBILITY', 'points': 3, 'answer': 'Limited or moderate assistance needed, i.e. applicant performs more than 50% of tasks independently', 'comment': 'uses a walker', 'fields': []}, {'title': 'BATHING', 'points': None, 'answer': '', 'comment': '', 'fields': []}]}]

def server(st):
    def queue():
        g = [] if st['signed'] or st['sent_back'] else [{'id': 'g1', 'client': 'Ada Client', 'client_id': 'nc1', 'visit_date': '2026-10-06', 'nurse': 'Lena Park', 'total': 9, 'status': 'rn_review', 'status_label': 'Awaiting RN review', 'since': '2026-10-07T15:00:00Z',
               'waiting_days': 5, 'waiting_over': True, 'upload_due': '2026-10-20', 'upload_overdue': False, 'sent_back_before': 0, 'practice': False}]
        fl = [{'id': 'f1', 'client_id': 'nc1', 'client_name': 'Ada Client', 'service_key': 'skin_monitoring', 'service_name': 'Skin monitoring', 'seen': 'Red area on the left heel, about 2 cm.', 'by_name': 'Lena Park', 'entered_by': None,
               'at': '2026-10-13T15:00:00Z', 'visit_date': '2026-10-13', 'status': 'reviewed' if st['reviewed'] else 'open', 'rn_note': st['reviewed'], 'reviewed_by': 'Natasha Early' if st['reviewed'] else None, 'reviewed_at': '2026-10-14T15:00:00Z' if st['reviewed'] else None, 'waiting_days': 1, 'waiting_over': False, 'practice': False}]
        return {'ok': True, 'me': {'name': 'Natasha Early', 'email': 'natasha@mo-care.com', 'rn': True, 'owner': False, 'supervising': True}, 'live': st['live'], 'today': '2026-10-14',
                'counts': {'ghe': len(g), 'flags': 1, 'overdue': len(g), 'waiting_over_2': len(g)}, 'ghe': g, 'flags': [f for f in fl if f['status'] == 'open'],
                'overdue': [dict(x, kind='ghe', why='waiting on you 5 working days') for x in g], 'recent': ([{'id': 's1', 'ghe_id': 'g1', 'client_name': 'Ada Client', 'visit_date': '2026-10-06', 'lpn_name': 'Lena Park', 'typed_name': 'Natasha Early', 'signed_at_label': 'October 14, 2026 at 10:00 AM Central', 'pdf': True, 'practice': False}] if st['signed'] else []),
                'cards': [], 'services': []}
    def handle(route, request):
        if request.method == 'OPTIONS': return route.fulfill(status=200, body='ok')
        body = json.loads(request.post_data or '{}'); a = body.get('action'); st['calls'].append(body); st['auth'].append(request.headers.get('authorization'))
        J = lambda code, obj: route.fulfill(status=code, content_type='application/json', body=json.dumps(obj))
        if a == 'queue': return J(200, queue())
        if a == 'open' and body.get('ghe_id'):
            return J(200, {'ok': True, 'live': st['live'], 'form': {'id': 'g1', 'client': 'Ada Client', 'client_id': 'nc1', 'visit_date': '2026-10-06', 'nurse': 'Lena Park', 'total': 9, 'status': 'rn_review', 'status_label': 'Awaiting RN review', 'waiting_days': 5, 'waiting_over': True, 'upload_due': '2026-10-20', 'upload_overdue': False, 'sent_back_before': 0, 'practice': False},
                           'readable': {'sections': LONG_SECTIONS, 'total': 9, 'sig_dates': [{'who': 'Nurse', 'date': '2026-10-06'}, {'who': 'Participant', 'date': '2026-10-06'}, {'who': 'Supervisory Nurse', 'date': ''}]},
                           'images': {'nurse': PNG, 'participant': PNG, 'supervisor': None}, 'signature': None, 'sent_back': [], 'may_sign': st['live'], 'may_send_back': st['live'],
                           'why_not': [] if st['live'] else ['The RN review page is not turned on yet (Owners Hub Admin page, RN review). Until then only practice forms can be signed or sent back.'],
                           'participant_signed': False, 'consent_words': 'I agree to sign this General Health Evaluation electronically as the supervising RN who reviewed it, and I understand my typed name has the same effect as my handwritten signature.'})
        if a == 'open' and body.get('client_id'):
            return J(200, {'ok': True, 'client': {'id': 'nc1', 'name': 'Ada Client', 'axiscare_id': '7001', 'assigned_nurse': 'Lena Park', 'ghe1': '2026-10', 'ghe2': '2027-04'}, 'ghe': [{'id': 'g1', 'visit_date': '2026-10-06', 'nurse': 'Lena Park', 'status_label': 'Awaiting RN review', 'total': 9}],
                           'hub_visits': [{'id': 'v9', 'type': 'meds', 'status': 'completed', 'completed_on': '2026-10-01', 'by': 'Lena Park', 'note': ''}], 'flags': [],
                           'axiscare': {'ok': True, 'visits': [{'id': 'v1', 'date': '2026-10-06T14:00:00', 'service': 'Nurse Visit (T1001)', 'services': ['General Health Evaluation'], 'nurse': 'Lena Park', 'clock_in': '2026-10-06T14:02:00', 'clock_out': '2026-10-06T15:00:00', 'note': 'Organizer filled; skin intact.'}]}})
        if a == 'sign':
            if body.get('typed_name') != 'Natasha Early': return J(400, {'ok': False, 'error': 'Please type your full name as it is on your nurse record (Natasha Early).'})
            st['signed'] = body; return J(200, {'ok': True, 'signature': {'id': 's1'}, 'form_updated': True, 'pdf': True, 'practice': False})
        if a == 'send_back':
            if len(body.get('note', '')) < 10: return J(400, {'ok': False, 'error': 'Say what needs correcting (a sentence is enough).'})
            st['sent_back'] = body; return J(200, {'ok': True, 'form': {}})
        if a == 'flag_review':
            st['reviewed'] = body.get('note'); return J(200, {'ok': True, 'flag': {'id': 'f1', 'client_id': 'nc1', 'client_name': 'Ada Client', 'service_name': 'Skin monitoring', 'seen': 'Red area on the left heel, about 2 cm.', 'by_name': 'Lena Park', 'at': '2026-10-13T15:00:00Z', 'status': 'reviewed', 'rn_note': body.get('note'), 'reviewed_by': 'Natasha Early', 'reviewed_at': '2026-10-14T15:00:00Z'}})
        if a == 'flag_create':
            st['marked'] = body; return J(200, {'ok': True, 'flag': {'id': 'f2', 'practice': not st['live']}})
        if a == 'mine':
            return J(200, {'ok': True, 'live': st['live'], 'flags': [{'id': 'f1', 'client_name': 'Ada Client', 'service_name': 'Skin monitoring', 'seen': 'Red heel.', 'visit_date': '2026-10-13', 'status': 'reviewed', 'rn_note': 'Offload heels; recheck Friday.', 'reviewed_by': 'Natasha Early', 'practice': False}]})
        return J(400, {'ok': False, 'error': 'Unknown action.'})
    return handle

def setup(ctx, st):
    ctx.route('https://cdn.jsdelivr.net/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body=FAKE_SB))
    ctx.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(status=200, content_type='text/css', body=''))
    ctx.route('https://fonts.gstatic.com/**', lambda r: r.fulfill(status=200, body=''))
    ctx.route('https://images.leadconnectorhq.com/**', lambda r: r.fulfill(status=200, content_type='image/png', body=b''))
    ctx.route(FN, server(st))
    ctx.route('https://zngsgedlsxinbygwmxwn.supabase.co/rest/**', lambda r: (st['rest'].append(r.request.url), r.fulfill(status=403, body='{}')))

def wide(page): return page.evaluate('document.documentElement.scrollWidth > window.innerWidth + 1')
def text(page): return page.evaluate('document.body.innerText')

with sync_playwright() as p:
    for engine in ('chromium', 'webkit'):
        br = getattr(p, engine).launch()
        for w in (360, 1024):
            tag = f'{engine} {w}px'
            st = {'live': False, 'calls': [], 'auth': [], 'rest': [], 'signed': None, 'sent_back': None, 'reviewed': None, 'marked': None}
            ctx = br.new_context(viewport={'width': w, 'height': 900}); setup(ctx, st); ctx.add_init_script(STORAGE_SPY)
            pg = ctx.new_page(); pg.goto(PAGE); pg.wait_for_selector('#login', state='visible')
            ck(f'{tag}: signed out, the Hub sign-in shows (email and password)', pg.is_visible('#liEmail') and pg.is_visible('#liPass'))
            pg.fill('#liEmail', 'natasha@mo-care.com'); pg.fill('#liPass', 'wrong'); pg.click('#liGo'); pg.wait_for_selector('#liErr', state='visible')
            ck(f'{tag}: a wrong password shows the sign-in error', 'Invalid login' in pg.inner_text('#liErr'))
            pg.fill('#liPass', 'right'); pg.click('#liGo'); pg.wait_for_selector('text=GHEs waiting for your signature')
            t = text(pg)
            ck(f'{tag}: her queue: the tiles, the practice banner (switch off), the waiting GHE with its working days, the mark', 'GHEs to sign' in t and 'Practice.' in t and 'Ada Client' in t and 'Waiting 5 working days' in t and 'Red area on the left heel' in t and 'Natasha Early, RN' in t, t[:600])
            ck(f'{tag}: nothing wider than the screen (queue)', not wide(pg))
            pg.screenshot(path=os.path.join(OUT, f'rn_queue_{engine}_{w}.png'), full_page=True)
            pg.click('button.item[data-go="ghe=g1"] >> nth=-1'); pg.wait_for_selector('text=A: PARTICIPANT INFORMATION')
            t = text(pg)
            ck(f'{tag}: the GHE laid out as the state form: sections, the answers, blanks shown as blank, scores, the total, both drawn signatures', 'Blood Pressure' in t and '128/80' in t and 'blank' in t and '3 points' in t and 'not scored' in t and 'TOTAL SCORE' in t and pg.locator('.sigs img').count() == 2, t[:800])
            ck(f'{tag}: switch off: no Sign box, the reason in its own words', pg.locator('#sgGo').count() == 0 and 'not turned on yet' in t)
            ck(f'{tag}: the participant has not signed yet: said plainly, and it does not stop her signing (no rule sets the order)', 'The participant has not signed this form yet. You can still sign it' in t)
            ck(f'{tag}: nothing wider than the screen (the form, a long address)', not wide(pg))
            pg.screenshot(path=os.path.join(OUT, f'rn_ghe_off_{engine}_{w}.png'), full_page=True)
            # the switch on
            st['live'] = True; pg.evaluate("location.hash=''"); pg.wait_for_selector('text=GHEs waiting for your signature'); pg.evaluate("location.hash='ghe=g1'"); pg.wait_for_selector('#sgGo')
            pg.fill('#sgName', 'Natasha Early'); pg.click('#sgGo')
            ck(f'{tag}: Sign without the tick: refused on the page, nothing sent', 'Tick the box' in pg.inner_text('#sgErr') and not st['signed'])
            pg.check('#sgOk'); pg.fill('#sgName', 'Natasha'); pg.click('#sgGo'); pg.wait_for_function("document.getElementById('sgErr').innerText.includes('full name')")
            ck(f'{tag}: the server\'s refusal is shown in its own words', 'Natasha Early' in pg.inner_text('#sgErr'))
            pg.fill('#sgName', 'Natasha Early'); pg.click('#sgGo'); pg.wait_for_selector('text=Signed. The form is Ready for Fusion.')
            ck(f'{tag}: Sign sends consent true and the typed name for that form; Send back goes away', st['signed'] and st['signed'].get('consent') is True and st['signed'].get('typed_name') == 'Natasha Early' and st['signed'].get('ghe_id') == 'g1' and pg.locator('#backBox').count() == 0, st['signed'])
            ck(f'{tag}: ...with her typed name drawn as a PNG picture for the Supervisory Nurse box', str(st['signed'].get('sig_png') or '').startswith('data:image/png;base64,iVBOR'), str(st['signed'].get('sig_png'))[:40])
            pg.screenshot(path=os.path.join(OUT, f'rn_signed_{engine}_{w}.png'), full_page=True)
            st['signed'] = None; pg.evaluate("location.hash=''"); pg.wait_for_selector('text=GHEs waiting'); pg.evaluate("location.hash='ghe=g1'"); pg.wait_for_selector('#bkGo')
            pg.fill('#bkNote', 'short'); pg.click('#bkGo'); pg.wait_for_selector('#bkErr', state='visible')
            pg.fill('#bkNote', 'Please add the blood glucose and the A1C.'); pg.click('#bkGo'); pg.wait_for_selector('text=Sent back to Lena Park')
            ck(f'{tag}: Send back: a short note refused in the server\'s words, then sent with her note', st['sent_back'] and st['sent_back']['note'] == 'Please add the blood glucose and the A1C.')
            st['sent_back'] = None; pg.evaluate("location.hash=''"); pg.wait_for_selector('[data-review="f1"]')
            pg.fill('#fn_f1', 'Stage 1 pressure area. Offload heels, recheck Friday.'); pg.click('[data-review="f1"]'); pg.wait_for_selector('text=Reviewed by Natasha Early')
            ck(f'{tag}: a mark reviewed with her note; the card shows her answer', st['reviewed'] == 'Stage 1 pressure area. Offload heels, recheck Friday.')
            pg.click('text=Nursing history for Ada Client >> nth=0'); pg.wait_for_selector('text=Nurse visits in AxisCare')
            t = text(pg)
            ck(f'{tag}: the client\'s nursing history: AxisCare nurse visits (read by the server), the Hub forms and visits', 'Organizer filled; skin intact.' in t and 'General Health Evaluation' in t and 'Medication setup' in t and 'Lena Park' in t, t[:600])
            ck(f'{tag}: nothing wider than the screen (history)', not wide(pg))
            pg.screenshot(path=os.path.join(OUT, f'rn_history_{engine}_{w}.png'), full_page=True)
            html = pg.content()
            ck(f'{tag}: no em dash anywhere on the page', '\u2014' not in html and '\u2014' not in text(pg))
            ck(f'{tag}: the page wrote nothing to browser storage', pg.evaluate('window.__w.length') == 0, pg.evaluate('window.__w'))
            ck(f'{tag}: every call went to rn-review with her session; never app_data', not st['rest'] and all(a == 'Bearer tok-nat' for a in st['auth']) and {c.get('action') for c in st['calls']} <= {'queue', 'open', 'sign', 'send_back', 'flag_review'}, [st['rest'], set(c.get('action') for c in st['calls'])])
            taps = pg.evaluate("[...document.querySelectorAll('button')].filter(b => b.offsetParent).map(b => b.getBoundingClientRect().height).filter(h => h < 40).length")
            ck(f'{tag}: big tap targets (every visible button at least 40px tall)', taps == 0, taps)
            ctx.close()

            # ── the Nurse Portal half ──
            for live in (False, True):
                st = {'live': live, 'calls': [], 'auth': [], 'rest': [], 'signed': None, 'sent_back': None, 'reviewed': None, 'marked': None}
                ctx = br.new_context(viewport={'width': w, 'height': 900}); setup(ctx, st)
                harness = os.path.join(tempfile.mkdtemp(prefix='nrp-'), 'portal.html')
                open(harness, 'w').write("""<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>:root{--navy:#0E3860;--red:#C0392B}.nvcase-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:6px 0}button{min-height:40px}</style></head><body>
<section id="tab-nurseportal"><div id="npMine">
 <div class="nvcase-row"><b>Ada Client</b><span style="flex:1;"></span><button class="secondary" onclick="gheNewFor('nc1')">GHE form</button></div>
 <div class="nvcase-row"><b>Pat Practice (TRAINING)</b><span style="flex:1;"></span><button class="secondary" onclick="gheNewFor('nc3')">GHE form</button></div>
</div><div id="npGhe"><div class="nvcase-row"><b>Ada Client</b><span>2026-10-06</span><button class="linklike" onclick="gheOpen('g1')">Open</button></div></div></section>
<script>
var DATA = { ops_settings: { nurse_review_live: %s }, nurse_staff: [{ name: 'Natasha Early', cred: 'RN', supervising_rn: true, employee: true, license: 'RN-1', expires: '2027-05-31' }, { name: 'Lena Park', cred: 'LPN' }],
  nurse_clients: [{ id: 'nc1', name: 'Ada Client', assigned_nurse: 'Lena Park' }, { id: 'nc3', name: 'Pat Practice (TRAINING)', assigned_nurse: 'Lena Park' }],
  ghe_forms: [{ id: 'g1', client: 'Ada Client', status: 'draft', rn_sent_back: { note: 'Please add the blood glucose.', by: 'Natasha Early', at: '2026-10-14T15:00:00Z' } }] };
window.NurseRules = { supervisor: (s) => s.find((n) => n.supervising_rn) };
var sb = { functions: { invoke: async (name, o) => { const r = await fetch('%s', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok-lena' }, body: JSON.stringify(o.body) }); const j = await r.json(); return r.ok ? { data: j, error: null } : { data: null, error: { context: { json: async () => j } } }; } } };
</script><script src="file://%s"></script>
<script>NurseReview.mount({ name: 'Lena Park', cred: 'LPN' }, { name: 'Lena Park' });</script></body></html>""" % ('true' if live else 'false', FN, os.path.join(ROOT, 'nurse-review-portal.js')))
                pg = ctx.new_page(); pg.goto('file://' + harness); pg.wait_for_timeout(300)
                marks = pg.evaluate("[...document.querySelectorAll('.nr-mark')].map(b => b.closest('.nvcase-row').querySelector('b').innerText)")
                if not live:
                    ck(f'{tag} portal, switch off: "Mark for Natasha" only on the practice client', marks == ['Pat Practice (TRAINING)'], marks)
                else:
                    ck(f'{tag} portal, switch on: "Mark for Natasha" on each client in the caseload, named for the supervising RN', marks == ['Ada Client', 'Pat Practice (TRAINING)'] and pg.inner_text('.nr-mark >> nth=0') == 'Mark for Natasha', marks)
                    pg.click('.nr-mark >> nth=0'); pg.wait_for_selector('.nr-form')
                    opts = pg.evaluate("[...document.querySelectorAll('.nr-svc option')].map(o => o.textContent)")
                    ck(f'{tag} portal: the services (skin monitoring, never assessment) and Something else', 'Skin monitoring' in opts and 'Something else' in opts and not any('assessment' in o.lower() for o in opts), opts)
                    pg.select_option('.nr-svc', 'skin_monitoring'); pg.fill('.nr-seen', 'Red area on the left heel, about 2 cm.'); pg.click('.nr-send'); pg.wait_for_selector('text=Sent to Natasha.')
                    ck(f'{tag} portal: the mark goes to rn-review with the client, service, date and words (as the signed-in LPN, not for someone else)', st['marked'] and st['marked']['client_id'] == 'nc1' and st['marked']['service_key'] == 'skin_monitoring' and st['marked']['seen'].startswith('Red area') and len(st['marked']['visit_date']) == 10 and 'as_nurse' not in st['marked'], st['marked'])
                    pg.wait_for_selector('text=Offload heels; recheck Friday.')
                    ck(f'{tag} portal: "Marked for Natasha" shows her answer', 'Marked for Natasha' in text(pg))
                ck(f'{tag} portal: the GHE row shows Natasha\'s send-back note and what to do', 'Sent back by Natasha Early' in text(pg) and 'Please add the blood glucose.' in text(pg) and 'Amend' in text(pg))
                ck(f'{tag} portal: nothing wider than the screen; no em dash', not wide(pg) and '\u2014' not in pg.content())
                pg.screenshot(path=os.path.join(OUT, f'portal_{"on" if live else "off"}_{engine}_{w}.png'), full_page=True)
                ctx.close()
        br.close()
for s, n, d in R: print(f'{s}  {n}' + (f'\n      {d}' if d else ''))
print(f"\n{sum(1 for r in R if r[0] == 'PASS')}/{len(R)} passed · screenshots in {OUT}")
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

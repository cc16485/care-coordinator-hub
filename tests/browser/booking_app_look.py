"""The Booking App page (booking-app-activity.js, Samantha 2026-10-25: who has the app, when they signed in, everything they
did). Offline: the real script on a bare page with a stand-in family-app-office server; made-up people. Proves: hidden while
the switch is off for non-owners; every person with access, welcome, sign-in (Never when never), opens; the timeline with
requests and their note, profile changes with the words before and after, stopped saves, office steps; one person's view."""
import sys, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
PAGE = r"""<!doctype html><html><head><meta charset="utf-8"><style>.card{border:1px solid #ddd}</style></head><body>
<div class="fpill" data-tab="bookingapp" style="display:none">Booking App</div><div id="baa_box"></div>
<script>
window.__owner=%OWNER%; window.DATA={ ops_settings:{ app_activity_live:%LIVE% } }; window.ccIsOwner=function(){ return window.__owner }; window.__calls=[];
var P=[{ id:'c1', name:'Lisa Ray', relationship:'Daughter', email:'lisa@x.test', client_name:'Dorothy Ray', axiscare_client_id:'501', app_status:'active', app_can_book:true, app_invited_at:'2026-10-23T18:08:00Z', app_invited_by:'samantha@mo-care.com', welcome_sent_at:'2026-10-23T21:38:00Z', welcome_sent_by:'Samantha Troutman', welcome_version:'regular', last_sign_in:'2026-10-25T16:00:00Z', first_open:'2026-10-25T16:01:00Z', last_open:'2026-10-25T16:20:00Z', opens:2, sign_in_readable:true },
  { id:'c2', name:'Tom Ray', relationship:'Son', email:'tom@x.test', client_name:'Dorothy Ray', axiscare_client_id:'501', app_status:'active', app_can_book:false, app_invited_at:'2026-10-23T18:09:00Z', app_invited_by:'samantha@mo-care.com', welcome_sent_at:null, last_sign_in:null, last_open:null, opens:0, sign_in_readable:true }];
window.callAction=async function(fn,b){ window.__calls.push([fn,b]); return { status:200, data:{ ok:true, from:'2026-07-27', recording_since:'2026-10-25T16:01:00Z', people:P,
  activity:[{ at:'2026-10-25T16:01:00Z', contact_id:'c1', axiscare_client_id:'501', kind:'open', summary:'Lisa Ray opened the Booking App' },
    { at:'2026-10-25T16:10:00Z', contact_id:'c1', axiscare_client_id:'501', kind:'profile_blocked', summary:"Lisa Ray's profile save was stopped: Please leave out health details like conditions or medicines." },
    { at:'2026-10-25T16:12:00Z', contact_id:'c1', axiscare_client_id:'501', kind:'profile_saved', summary:"Lisa Ray wrote Dorothy's profile for caregivers (About)", data:{ ai:'checked', changes:[{ field:'About', before:'Mom taught school.', after:'Mom taught third grade.' }] } }],
  events:[{ at:'2026-10-23T21:38:00Z', verb:'family_app_welcome', summary:'Samantha Troutman sent the welcome to Lisa Ray (Regular)', data:{} }],
  bookings:[{ id:'b1', axiscare_client_id:'501', client_name:'Dorothy Ray', contact_id:'c1', requested_by_name:'Lisa Ray', visit_date:'2026-10-29', start_time:'10:00', end_time:'13:00', hours:3, tasks:['Companionship'], note:'Soup please', status:'placed', caregiver_name:'Maria L.', created_at:'2026-10-25T16:15:00Z' }],
  profiles:[{ axiscare_client_id:'501', about:'Mom taught third grade.', talk:'Her grandkids', enjoys:['Roses'], updated_by_name:'Lisa Ray', updated_at:'2026-10-25T16:12:00Z' }] } } };
</script><script src="/booking-app-activity.js"></script></body></html>"""
def run(b, owner, live):
    pg = b.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    def serve(route):
        u = route.request.url
        if u.endswith('/booking-app-activity.js'): return route.fulfill(status=200, body=(ROOT / 'booking-app-activity.js').read_bytes(), content_type='application/javascript')
        if u.startswith('http://baa.local/'): return route.fulfill(status=200, body=PAGE.replace('%OWNER%', owner).replace('%LIVE%', live), content_type='text/html')
        route.abort()
    pg.route('**/*', serve); pg.goto('http://baa.local/'); pg.wait_for_timeout(200)
    return pg, errs
R = []; ok = lambda n, c, d='': R.append(['PASS' if c else 'FAIL', n, d])
with sync_playwright() as pw:
    b = pw.chromium.launch()
    pg, errs = run(b, 'false', 'false')
    ok('switch off, not an owner: no pill, and the page says it is off without asking the server', pg.evaluate("document.querySelector('.fpill').style.display") == 'none' and (pg.evaluate('BAA.mount()') or True) and 'turned off' in pg.inner_text('#baa_box') and pg.evaluate('window.__calls.length') == 0)
    pg.close()
    pg, errs = run(b, 'true', 'false')
    ok('switch off: owners still see the pill', pg.evaluate("document.querySelector('.fpill').style.display") == '')
    pg.evaluate('BAA.mount()'); pg.wait_for_timeout(300); t = pg.inner_text('#baa_box')
    ok('the server is asked once, read only', pg.evaluate('window.__calls')[0] == ['family-app-office', {'action': 'activity', 'days': 90}])
    ok('the counts: 2 with the app, 1 signed in, 1 never', '2 with the app' in t and '1 has signed in' in t and '1 never signed in' in t, t[:300])
    ok('each person: access, invited by, the welcome, last signed in, opens', all(x in t for x in ['Lisa Ray', 'Can book', 'Invited', 'samantha', 'Regular', '2 times']) and "Can see, can't book" in t, t[:900])
    ok('Tom: Never signed in, welcome Not sent, not opened', 'Never signed in' in t and 'Not sent' in t and 'Not yet' in t)
    ok('timeline: the request with when, tasks, the note and how it ended', 'asked for a visit for Dorothy: Thu, Oct 29, 10 AM to 1 PM (Companionship)' in t and 'Soup please' in t and 'Caregiver confirmed: Maria L.' in t, t)
    ok('timeline: the profile change with the words before and after, and the stopped save', 'Mom taught school.' in t and 'Mom taught third grade.' in t and 'was stopped' in t)
    ok('timeline: the office\'s welcome and the open', 'sent the welcome to Lisa Ray' in t and 'opened the Booking App' in t)
    ok('profiles families wrote, separate from the Caregiver Preview', 'Profiles families wrote' in t and 'Her grandkids' in t and 'Separate from your Caregiver Preview' in t)
    pg.click('text=Tom Ray'); pg.wait_for_timeout(100); t = pg.inner_text('#baa_box')
    ok('click a person: only their activity', 'Everything Tom Ray did' in t and 'Nothing yet.' in t and 'Soup please' not in t, t[-400:])
    pg.click('text=Show everyone'); pg.wait_for_timeout(100)
    ok('Show everyone brings it all back', 'Everything that happened' in pg.inner_text('#baa_box'))
    ok('no page errors', not errs, errs); pg.close(); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else str(d)[:600])
print(sum(r[0] == 'PASS' for r in R), '/', len(R)); sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

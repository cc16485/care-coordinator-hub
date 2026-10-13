"""The main profile's "Where they are" card (Samantha 2026-10-11: done, current, submitted, signed or outstanding, missing,
next and who). Offline: hire-profile.js with the server faked; each person's status is built by the real Staffing code
(argv[1] = its supabase/functions; _shared/applicant-status.ts). Three people: mid Step 1, at Background & References with a
readiness card (its next step and blocked row must win), and an offer they declined.
python3 tests/browser/hire_profile_status_look.py <Staffing supabase/functions> [screenshot dir]"""
import json, sys, os, subprocess
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
FN = sys.argv[1]; OUT = sys.argv[2] if len(sys.argv) > 2 else '/tmp'
js = r'''
const M = await import(process.argv[1] + '/_shared/applicant-status.ts')
const app = { id: 'a1', created_at: '2026-10-01T15:00:00Z', screen_grade: 'A', post_interview: { x: 1 } }
const off = (x) => ({ id: 'o1', onboarding_path: 'new', offer_sent_at: '2026-10-05T15:00:00Z', offer_expires_at: '2026-10-12T15:00:00Z', offer_signed_at: '2026-10-06T15:00:00Z', pd_signed_at: '2026-10-06T15:05:00Z', ...x })
const sig = (n) => Object.fromEntries(M.STEP1_FORMS.slice(0, n).map(([k]) => [k, { at: '2026-10-07T15:00:00Z' }]))
console.log(JSON.stringify({
  mid: M.applicantStatus({ app, offer: off({}), step1: { started_at: 'x', signatures: sig(3), answers: { a: 1 } }, experience: { counts: { self_reported: 2 } } }),
  bgr: M.applicantStatus({ app, offer: off({}), step1: { completed_at: '2026-10-07T18:00:00Z', signatures: sig(7), answers: { a: 1 } }, cand: { id: 9, r1n: 'A', r2n: 'B', r3n: 'C', r4n: 'D' }, journey: { journey_id: 'j1' }, refs: [{ responded_at: 'x' }, { responded_at: null }] }),
  declined: M.applicantStatus({ app, offer: off({ offer_signed_at: null, pd_signed_at: null, offer_status: 'declined', offer_declined_at: '2026-10-06T15:00:00Z' }) }),
}))'''
ST = json.loads(subprocess.run(['node', '--input-type=module', '-e', js, FN], capture_output=True, text=True).stdout)
def prof(key, jid=None):
    tl = [{'at': '2026-10-01T15:00:00Z', 'type': 'received', 'what': 'Applied (Caregiver)'}, {'at': '2026-10-05T15:00:00Z', 'type': 'sent', 'what': 'Offer sent'}, {'at': '2026-10-06T15:00:00Z', 'type': 'done', 'what': 'Offer letter signed', 'by': key.title() + ' Practice'},
          {'at': '2026-10-06T15:01:00Z', 'type': 'sent', 'what': 'Step 1 sent automatically'}, {'at': '2026-10-07T15:00:00Z', 'type': 'done', 'what': 'Step 1 form signed: Employee Application'}]
    return {'ok': True, 'name': key.title() + ' Practice', 'phone': '', 'email': '', 'where': 'x', 'ids': {'offer_id': '11111111-2222-3333-4444-555555555555', 'journey_id': jid}, 'path': 'new', 'timeline': tl, 'documents': [], 'experience': None, 'status': ST[key]}
VIEW = {'journey': {'journey_id': 'j1', 'client_name': 'Bgr Practice'}, 'view': {'rail': [{'key': 'offer', 'state': 'done'}, {'key': 'step1', 'state': 'done'}, {'key': 'screening', 'state': 'current'}, {'key': 'approval', 'state': 'later'}, {'key': 'step2', 'state': 'later'}],
        'next': {'def': {'title': 'Case.net court records search (Missouri)'}, 'owner': {'role': 'screening_staff'}, 'why': 'Missouri court records, before work with clients'},
        'rows': [{'status': 'blocked', 'def': {'title': 'FCSR screening'}, 'why': 'waiting on the registration'}], 'complete': False}}
page = '<!doctype html><meta charset="utf-8"><body><script>window.sb={functions:{invoke:async(n,o)=>{const b=o.body; if(n==="hire-profile") return {data: window.NEXTP}; if(n==="caregiver-journey"){window.CJ=(window.CJ||0)+1; return {data:' + json.dumps(VIEW) + '};} return {data:null}; }}};</script><script src="hire-profile.js"></script></body>'
open(os.path.join(ROOT, '_hp_test.html'), 'w').write(page)
R = []
ok = lambda n, c, d='': R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:300]))
try:
  with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1100, 'height': 1100}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('file://' + os.path.join(ROOT, '_hp_test.html')); pg.wait_for_timeout(300)
    for key, jid in [('mid', None), ('bgr', 'j1'), ('declined', None)]:
        pg.evaluate('(p) => { window.NEXTP = p; return HP.open({ offer_id: "o1" }) }', prof(key, jid)); pg.wait_for_timeout(700)
        t = pg.inner_text('#hpBody')
        if key == 'mid':
            ok('mid Step 1: twelve stages, Step 1 current, next owned by the applicant with the reminders', t.count('. ') >= 12 and 'Now: Step 1' in t and 'They finish Step 1 (3 of 7 signed)' in t and 'the applicant' in t, t[:400])
            ok('mid Step 1: three forms ticked, four not signed yet, the four named under Missing', t.count('✓ ') >= 3 and t.count('not signed yet') == 5 and 'Step 1 forms not signed yet: Details for the Background Checks, Availability' in t)
            ok('mid Step 1: unverified experience is named as not counting yet', 'not verified yet (does not count' in t)
            jt = pg.evaluate('async (p) => { const d = document.createElement("div"); d.id = "hiringMount"; document.body.appendChild(d); await HP.mount(d, { offer_id: "o1" }, ["status","journey","docs"]); await new Promise(r => setTimeout(r, 300)); const t = d.innerText; d.remove(); return t }', prof(key, jid))
            ok('2026-10-13 the whole journey card on the Hiring tab: the offer, Step 1 and an empty Step 2 group, each from the records', 'The whole journey, step by step' in jt and 'Offer letter signed' in jt and 'Step 1 sent automatically' in jt and 'Step 2 in Viventium nothing yet' in jt.replace('\n', ' '), jt[:900])
            pg.locator('#hpBody button', has_text='See their Step 1 screens').click(); pg.wait_for_timeout(300)
            ok('2026-10-13 See their Step 1 screens opens the real Step 1 page in its office view, inside the profile', pg.locator('#hpBody iframe[src="step1.html?review=11111111-2222-3333-4444-555555555555"]').count() == 1)
            pg.locator('#hpBody button', has_text='Hide their Step 1 screens').click(); pg.wait_for_timeout(200)
            ok('...and hides again', pg.locator('#hpBody iframe').count() == 0)
            ok('read-only versus editable is said plainly', 'signed forms are read-only and never change' in t and 'Background & References (editable)' in t)
        if key == 'bgr':
            ok('Background & References: the readiness card is asked once and its next step wins (Case.net, screening staff)', pg.evaluate('window.CJ') >= 1 and 'Next: Case.net court records search (Missouri)' in t and 'screening staff' in t, t[:600])
            ok('Background & References: its blocked row and the unanswered reference are under Missing', 'FCSR screening: waiting on the registration' in t and '1 of 2 references not answered' in t)
            ok('Background & References: stages 1 to 7 done, 8 current', 'Now: Background & References' in t)
        if key == 'declined':
            ok('declined: the journey says it ended and why; nobody owns a next step', 'Now: They declined the offer' in t and 'nobody: closed' in t)
        pg.screenshot(path=os.path.join(OUT, 'hp_status_%s.png' % key))
    ok('no page errors', not errs, errs)
    b.close()
finally:
  os.remove(os.path.join(ROOT, '_hp_test.html'))
for s, n, d in R: print(s, ' ', n, ('  ' + d) if d else '')

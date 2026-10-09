"""Slice 1b: the offer page on a phone, offline, with the signing server faked (view / sign / copies and their rules: offer
before position description, consent + full name, one signature each, copies at the end, dead and expired links).
Fictional applicant only. Saves phone screenshots. PORT=8768 OUT=/tmp python3 tests/browser/offer_page_flow.py"""
import os, json
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..', '..'); PORT = os.environ.get('PORT', '8768'); OUT = os.environ.get('OUT', '/tmp')
DOC = lambda k, t: {'k': k, 't': t}
OFFER = [DOC('small', 'Caring Companions In-Home Senior Care · 1331 N. Stewart Ave., Suite B, Springfield, MO 65802'), DOC('p', 'Date: October 9, 2026'), DOC('p', 'Dear Test Applicant,'), DOC('p', 'Employment classification: PRN (as-needed) field caregiver'), DOC('p', 'Starting Pay: $16.00 per hour, paid weekly on Fridays'), DOC('p', 'This is a PRN, as-needed position. Assignments depend on client needs and your availability, and no minimum number of hours per week is guaranteed.'), DOC('h', 'YOUR EMPLOYMENT OFFER'), DOC('li', 'A satisfactory criminal background check.'), DOC('li', "Successful completion of any drug screening required by Caring Companions' screening policy."), DOC('h', 'EMPLOYMENT RELATIONSHIP'), DOC('q', 'Employment with Caring Companions is at will.'), DOC('p', 'This offer will remain open for seven (7) business days from the date of this letter, through October 20, 2026. Your signing link expires at the same time.'), DOC('small', 'Issued by Krystal Land, October 9, 2026 at 2:14 PM Central'), DOC('h', 'ACCEPTANCE OF EMPLOYMENT OFFER'), DOC('p', 'I accept the employment offer described above and understand that this offer is contingent upon successfully completing all required pre-employment requirements.'), DOC('small', 'Document version 1')]
PD = [DOC('h', 'Caregiver · Position description · Version 1'), DOC('h', 'POSITION SUMMARY'), DOC('p', 'The Caregiver provides non-medical, in-home care.'), DOC('h', 'QUALIFICATIONS & REQUIREMENTS'), DOC('li', 'Be at least 18 years of age.'), DOC('li', "Successful completion of any drug screening required by Caring Companions' screening policy."), DOC('h', 'ACKNOWLEDGMENT'), DOC('p', 'I acknowledge that I have received, read, and understand this position description.'), DOC('small', 'Document version 1')]
state = {'status': 'sent', 'offer_signed_at': None, 'offer_signer_name': None, 'pd_signed_at': None, 'expires_at': '2026-10-21T04:59:59Z', 'viewed_at': None}
calls = []
def server(route):
    body = json.loads(route.request.post_data or '{}'); calls.append(body)
    if body.get('t') != 'GOODTOKEN' + 'x' * 34: return route.fulfill(status=401, content_type='application/json', body=json.dumps({'ok': False, 'error': 'This link is not valid or has run out.'}))
    if body.get('o') == 'expired': return route.fulfill(status=410, content_type='application/json', body=json.dumps({'ok': False, 'error': 'This link is not valid or has run out.', 'expired': True}))
    a = body.get('action')
    if a == 'view': return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'first': 'Test', 'state': state, 'versions': {'offer': 1, 'pd': 1}, 'fingerprints': {'offer': 'a' * 64, 'pd': 'b' * 64}, 'offer': OFFER, 'pd': PD}))
    if a == 'sign':
        if body.get('consent') is not True: return route.fulfill(status=400, content_type='application/json', body=json.dumps({'ok': False, 'error': 'Please tick first.'}))
        if body['doc'] == 'pd' and not state['offer_signed_at']: return route.fulfill(status=409, content_type='application/json', body=json.dumps({'ok': False, 'error': 'Please sign your offer letter first.'}))
        if (body['doc'] == 'offer' and state['offer_signed_at']) or (body['doc'] == 'pd' and state['pd_signed_at']): return route.fulfill(status=409, content_type='application/json', body=json.dumps({'ok': False, 'error': 'This document is already signed.', 'already': True}))
        if body['doc'] == 'offer': state['offer_signed_at'] = '2026-10-09T19:30:00Z'; state['offer_signer_name'] = body['typed_name']; state['status'] = 'viewed'
        else: state['pd_signed_at'] = '2026-10-09T19:33:00Z'; state['status'] = 'accepted'
        return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'doc': body['doc'], 'accepted': state['status'] == 'accepted'}))
    if a == 'copies': return route.fulfill(status=200, content_type='application/json', body=json.dumps({'ok': True, 'copies': {'offer': 'https://signed.test/offer.pdf', 'pd': 'https://signed.test/pd.pdf'}, 'expires_in': 600}))
    route.fulfill(status=400, content_type='application/json', body='{}')
ok = []
with sync_playwright() as pw:
    b = pw.chromium.launch(); ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    pg = ctx.new_page(); pg.route('**/functions/v1/offer-sign', server); pg.route('**/fonts.googleapis.com/**', lambda r: r.abort()); pg.route('**/fonts.gstatic.com/**', lambda r: r.abort())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    link = f'http://localhost:{PORT}/offer.html?o=0f1e2d3c-4b5a-4968-8777-66554433aabb&e=1760000000&t=GOODTOKEN' + 'x' * 34
    pg.goto(link); pg.wait_for_selector('#sb_offer'); txt = pg.inner_text('#main')
    ok.append(('document 1: the whole letter on the phone, classification, no-guaranteed-hours, drug screening, at-will, expiry', 'Offer of employment' in txt and 'PRN (as-needed)' in txt and 'no minimum number of hours per week is guaranteed' in txt and "drug screening required by Caring Companions' screening policy" in txt and 'at will' in txt and 'through October 20, 2026' in txt and '1 · OFFER LETTER' in txt.upper()))
    pg.screenshot(path=os.path.join(OUT, 'offer_page_1_letter_top.png')); pg.locator('#sb_offer').scroll_into_view_if_needed(); pg.screenshot(path=os.path.join(OUT, 'offer_page_2_sign_box.png'))
    pg.click('#b_offer'); pg.wait_for_timeout(100); ok.append(('no consent: the page stops and no sign call is made', 'tick' in pg.inner_text('#e_offer') and not any(c.get('action') == 'sign' for c in calls)))
    pg.check('#c_offer'); pg.fill('#n_offer', 'Test'); pg.click('#b_offer'); pg.wait_for_timeout(100); ok.append(('a single name is refused before any call', 'full name' in pg.inner_text('#e_offer') and not any(c.get('action') == 'sign' for c in calls)))
    pg.fill('#n_offer', 'Test Applicant'); pg.click('#b_offer'); pg.wait_for_selector('#sb_pd'); txt = pg.inner_text('#main')
    ok.append(('after signing the letter: document 2 opens with the signed line and the position description', 'Offer letter signed by Test Applicant' in txt and 'Caregiver position description' in txt and 'ACKNOWLEDGMENT' in txt and "drug screening required by Caring Companions' screening policy" in txt and any(c.get('action') == 'sign' and c.get('doc') == 'offer' and c.get('typed_name') == 'Test Applicant' and c.get('consent') is True for c in calls)))
    pg.screenshot(path=os.path.join(OUT, 'offer_page_3_position_description.png'))
    # resume: a fresh load with the offer signed but not the position description lands on document 2
    pg2 = ctx.new_page(); pg2.route('**/functions/v1/offer-sign', server); pg2.route('**/fonts.g**', lambda r: r.abort()); pg2.goto(link); pg2.wait_for_selector('#sb_pd'); ok.append(('reopening the link resumes at the unsigned document', 'One document left' in pg2.inner_text('#main') and pg2.query_selector('#sb_offer') is None)); pg2.close()
    pg.check('#c_pd'); pg.fill('#n_pd', 'Test Applicant'); pg.click('#b_pd'); pg.wait_for_selector('#copies a'); txt = pg.inner_text('#main')
    parts = {'both': 'Both documents are signed' in txt, 'offer_copy': 'signed offer letter' in txt, 'pd_copy': 'signed position description' in txt, 'step1': 'sent to you automatically by text and email once your signed offer is saved' in txt, 'no_box': pg.query_selector('.signbox') is None}
    if not all(parts.values()): print('DEBUG both-signed parts:', parts, '| text:', txt[:400].replace('\n', ' / '))
    ok.append(('both signed: thank you, both copies as links, Step 1 wording, no third signature box', all(parts.values())))
    pg.screenshot(path=os.path.join(OUT, 'offer_page_4_done.png'))
    pg3 = ctx.new_page(); pg3.route('**/functions/v1/offer-sign', server); pg3.route('**/fonts.g**', lambda r: r.abort()); pg3.goto(link); pg3.wait_for_selector('#copies'); ok.append(('reopening after both signatures shows the finished state again', 'Both documents are signed' in pg3.inner_text('#main'))); pg3.close()
    pg4 = ctx.new_page(); pg4.route('**/functions/v1/offer-sign', server); pg4.route('**/fonts.g**', lambda r: r.abort()); pg4.goto(link.replace('GOODTOKEN', 'BADTOKENX')); pg4.wait_for_selector('.dead'); ok.append(('a forged link shows only the dead-link message', 'not valid' in pg4.inner_text('#main') and 'Offer of employment' not in pg4.inner_text('#main'))); pg4.screenshot(path=os.path.join(OUT, 'offer_page_5_dead_link.png')); pg4.close()
    pg5 = ctx.new_page(); pg5.route('**/functions/v1/offer-sign', server); pg5.route('**/fonts.g**', lambda r: r.abort()); pg5.goto(link.replace('o=0f1e2d3c-4b5a-4968-8777-66554433aabb', 'o=expired')); pg5.wait_for_selector('.dead'); ok.append(('an expired offer says so', 'expired' in pg5.inner_text('#main'))); pg5.close()
    pg6 = ctx.new_page(); pg6.goto(f'http://localhost:{PORT}/offer.html'); pg6.wait_for_selector('.dead'); ok.append(('no link at all: nothing is fetched, dead message', 'not valid' in pg6.inner_text('#main'))); pg6.close()
    ok.append(('no page errors', not errs)); ok.append(('the page never sends anything itself (only view, sign and copies calls)', all(c.get('action') in ('view', 'sign', 'copies') for c in calls)))
    b.close()
for n, good in ok: print(('PASS  ' if good else 'FAIL  ') + n)
bad = [n for n, g in ok if not g]; print(f"{len(ok) - len(bad)}/{len(ok)} passed; screenshots in {OUT}"); raise SystemExit(1 if bad else 0)

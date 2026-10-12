"""Caregiver packet (Step 1, 2026-10-12): the Care tab card (care-packet.js) and the caregiver's page (packet.html). Offline:
the care-packet function is faked and every call recorded. Card: loads, picks topics (library notes prefilled), saves with the
version it opened, marks ready, makes a caregiver link and shows who confirmed. Page: the notes and videos, only the two known
players framed, opening records nothing, "I watched it and understand" sends the version, an updated packet asks again,
a bad link shows the office number.
python3 tests/browser/care_packet_look.py [screenshot dir]"""
import json, sys, os
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp'
TOPICS = [
  {'key': 'turning', 'title': 'Turning and repositioning', 'notes': 'Turn every 2 hours, or as the care plan says.', 'videos': [{'title': 'Lie on the side', 'url': 'https://www.youtube.com/watch?v=6M5_eTPUWpo'}]},
  {'key': 'purewick_male', 'title': 'PureWick for men (male external catheter)', 'notes': 'Check it every 2 hours.', 'videos': [{'title': 'In-service', 'url': 'https://vimeo.com/968970613'}, {'title': 'IFU', 'url': 'https://example.com/x.pdf'}]}]
card_page = '''<!doctype html><meta charset="utf-8"><body><div id="cp_packet"></div><script>
window.DATA = { caregivers: [{ first: 'Ariel', last: 'Smith', axiscare_id: '11' }, { first: 'Bea', last: 'Jones', axiscare_id: '12' }, { first: 'No', last: 'Id' }] };
window.CP = { ax: '900', lead: { id: 'L1', client_first_name: 'Dan' }, r: { client_name: 'Dan Example' } };
window.CALLS = []; window.STATE = { packet: null, recipients: [] };
window.callAction = async (fn, b) => { CALLS.push(JSON.parse(JSON.stringify(b)));
  if (b.action === 'get') return { status: 200, data: { packet: STATE.packet, topics: %s, recipients: STATE.recipients } };
  if (b.action === 'save') { const v = STATE.packet ? STATE.packet.version + 1 : 1;
    STATE.packet = { id: '11111111-1111-1111-1111-111111111111', version: v, client_first: b.client_first, about: b.about, items: b.items, ready: b.ready };
    return { status: 200, data: { outcome: 'saved', changed: true, packet: STATE.packet, recipients: STATE.recipients } }; }
  if (b.action === 'link') { STATE.recipients = [{ id: 'pl_x', caregiver_name: 'Ariel Smith', caregiver_axiscare_id: '11', link_made_at: '2026-10-12T15:00:00Z', ack_version: null },
      { id: 'pl_y', caregiver_name: 'Bea Jones', caregiver_axiscare_id: '12', link_made_at: '2026-10-12T15:00:00Z', ack_version: 1, ack_at: '2026-10-12T16:00:00Z' }];
    return { status: 200, data: { outcome: 'made', link: 'https://cc.mo-care.com/packet.html?i=pl_AAAAAAAAAAAAAAAAAAAA&e=9&t=x', caregiver_first: 'Ariel', client_first: 'Dan', recipients: STATE.recipients } }; }
  if (b.action === 'send_draft') { const ar = b.caregiver_axiscare_id === '11';
    return { status: 200, data: Object.assign({ live: STATE.live !== false, kind: ar ? 'reminder' : 'first', caregiver_first: ar ? 'Ariel' : 'Bea', phone_last4: '0101', opted_out: !!STATE.opted, late: !!STATE.late,
      text: (ar ? 'Hi Ariel, a reminder from Caring Companions: please watch Dan\\u2019s care packet and tap I understand before your next visit: (their link)' : 'Hi Bea, ...') + ' Reply STOP to opt out.', last_sent_at: null }, STATE.draft || {}) }; }
  if (b.action === 'send') { if (STATE.fail) return { status: 422, data: { outcome: 'refused', error: 'Not sent: Ariel has asked not to get texts (stop_text).' } };
    STATE.recipients[0] = Object.assign({}, STATE.recipients[0], { last_sent_at: '2026-10-12T17:00:00Z', last_send_kind: 'reminder', send_count: 2 });
    return { status: 200, data: { outcome: 'sent', kind: 'reminder', recipients: STATE.recipients } }; }
  return { status: 400, data: { error: 'unknown' } }; };
</script><script src="care-packet.js"></script></body>''' % json.dumps(TOPICS)
open(os.path.join(ROOT, '_cpk_test.html'), 'w').write(card_page)
R = []
ok = lambda n, c, d='': R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:300]))
VIEW = {'caregiver_first': 'Ariel', 'client_first': 'Dan', 'version': 2, 'acknowledged': False, 'ack_at': None, 'earlier_ack': False,
  'about': 'Dan is on hospice. Call the hospice nurse first.\nHis wife Mary is usually home.',
  'items': [{'title': 'Turning and repositioning', 'notes': 'Turn every 2 hours.\nFloat the heels.', 'videos': [{'title': 'Lie on the side', 'publisher': 'The Hospice Care Plan (hospice nurses)', 'minutes': 5, 'url': 'https://www.youtube.com/watch?v=6M5_eTPUWpo', 'embed': 'https://www.youtube-nocookie.com/embed/6M5_eTPUWpo?rel=0'}]},
            {'title': 'PureWick for men (male external catheter)', 'notes': 'From BD, the maker.', 'videos': [{'title': 'In-service', 'publisher': 'BD (the maker)', 'minutes': 6, 'url': 'https://vimeo.com/968970613', 'embed': 'https://player.vimeo.com/video/968970613?dnt=1'},
              {'title': 'Instructions (PDF)', 'url': 'https://example.com/x.pdf', 'embed': None}, {'title': 'Sneaky', 'url': 'javascript:alert(1)', 'embed': 'https://evil.example/embed'}]}]}
try:
  with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []
    # ---- the Care tab card ----
    pg = b.new_page(viewport={'width': 1000, 'height': 1300}); pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('file://' + os.path.join(ROOT, '_cpk_test.html')); pg.wait_for_timeout(100)
    pg.evaluate('CPK.mount("cp_packet")'); pg.wait_for_timeout(300)
    t = pg.inner_text('#cp_packet')
    ok('card: loads by AxisCare id and lead, shows the library topics and the first name from the lead', pg.evaluate('CALLS[0]') == {'action': 'get', 'ax': '900', 'lead_id': 'L1'} and 'Turning and repositioning' in t and 'PureWick for men' in t and pg.input_value('#cpk_first') == 'Dan', t[:300])
    ok('card: no caregiver section before it is ready', 'Get their link' not in t)
    pg.fill('#cpk_about', 'Dan is on hospice. Call the hospice nurse first.')
    pg.check('[data-cpk-topic="turning"]'); pg.wait_for_timeout(100)
    ok('card: ticking a topic fills its notes from the library', pg.input_value('[data-cpk-notes="turning"]') == 'Turn every 2 hours, or as the care plan says.' and pg.input_value('#cpk_about').startswith('Dan is on hospice'))
    pg.fill('[data-cpk-notes="turning"]', 'Turn every 2 hours. Left, back, right.'); pg.check('#cpk_ready'); pg.wait_for_timeout(100)
    ok('card: shows "changed, not saved"', 'changed, not saved' in pg.inner_text('#cp_packet'))
    pg.click('#cpk_save'); pg.wait_for_timeout(300)
    c = pg.evaluate('CALLS[CALLS.length-1]')
    ok('card: save sends the words, the topic with its edited notes, ready, and the version it opened (none yet)', c['action'] == 'save' and c['items'] == [{'topic': 'turning', 'notes': 'Turn every 2 hours. Left, back, right.'}] and c['ready'] is True and c['base_version'] is None and c['ax'] == '900', c)
    t = pg.inner_text('#cp_packet')
    ok('card: saved, ready, version 1, the caregiver picker lists only people with an AxisCare id', 'Saved.' in t and 'Ready · version 1' in t and pg.eval_on_selector_all('#cpk_cg option', 'o=>o.map(x=>x.textContent)') == ['Pick a caregiver…', 'Ariel Smith', 'Bea Jones'], t[:400])
    pg.select_option('#cpk_cg', '11'); pg.click('#cpk_link'); pg.wait_for_timeout(300)
    t = pg.inner_text('#cp_packet')
    ok('card: Ariel\'s link shows, with the copy text that carries no health details', pg.input_value('#cpk_linkbox').startswith('https://cc.mo-care.com/packet.html?i=pl_') and "Before you work with Dan, please watch this short care packet and tap I understand" in t, t[-500:])
    ok('card: who confirmed (Bea, this version) and who has not (Ariel)', 'not confirmed yet' in t and '✓ understood' in t, t[-400:])
    ok('card: no em dash anywhere on the card', '—' not in t)
    pg.screenshot(path=os.path.join(OUT, 'cpk_1_card.png'), full_page=True)
    # ---- step 2: texting from the card ----
    ok('card: Ariel (not confirmed) has a Remind-style button; Bea (confirmed this version) has none', pg.query_selector('[data-cpk-send="11"]') is not None and pg.query_selector('[data-cpk-send="12"]') is None)
    pg.click('[data-cpk-send="11"]'); pg.wait_for_timeout(300)
    t = pg.inner_text('#cp_packet')
    ok('card: Remind opens the exact text, the phone ending and "(their link)" note, and nothing is sent yet', "a reminder from Caring Companions" in t and 'phone ending 0101' in t and '"(their link)" becomes Ariel' in t and pg.evaluate("CALLS.filter(c=>c.action==='send').length") == 0, t[-600:])
    pg.click('#cpk_send'); pg.wait_for_timeout(300)
    c = pg.evaluate("CALLS.filter(c=>c.action==='send')")
    t = pg.inner_text('#cp_packet')
    ok('card: Send sends once, for Ariel, with a send id; the row now says texted (reminder) and 2 texts', len(c) == 1 and c[0]['caregiver_axiscare_id'] == '11' and c[0]['send_id'].startswith('pk-') and 'Sent to Ariel.' in t and 'texted Oct 12 (reminder) · 2 texts' in t, (c, t[-500:]))
    pg.screenshot(path=os.path.join(OUT, 'cpk_4_sent.png'), full_page=True)
    pg.evaluate("STATE.opted = true"); pg.click('[data-cpk-send="11"]'); pg.wait_for_timeout(300)
    ok('card: an opted-out caregiver: the panel says call them instead, Send is disabled', 'asked not to get texts' in pg.inner_text('#cp_packet') and pg.is_disabled('#cpk_send'))
    pg.click('#cpk_cancel'); pg.wait_for_timeout(100)
    pg.evaluate("STATE.opted = false; STATE.live = false"); pg.click('[data-cpk-send="11"]'); pg.wait_for_timeout(300)
    ok('card: switch off: the panel says so and points to Get their link; Send is disabled', 'Sending from the Hub is off' in pg.inner_text('#cp_packet') and pg.is_disabled('#cpk_send'))
    pg.click('#cpk_cancel'); pg.evaluate("STATE.live = true; STATE.late = true"); pg.click('[data-cpk-send="11"]'); pg.wait_for_timeout(300)
    ok('card: in the evening the panel warns', 'before 8am or after 8pm' in pg.inner_text('#cp_packet'))
    DLG_ANSWER = {'v': False}
    pg.once('dialog', lambda d: d.dismiss()); n0 = pg.evaluate("CALLS.filter(c=>c.action==='send').length"); pg.click('#cpk_send'); pg.wait_for_timeout(300)
    ok('card: in the evening, saying no to the question sends nothing', pg.evaluate("CALLS.filter(c=>c.action==='send').length") == n0)
    pg.evaluate("STATE.late = false; STATE.fail = true"); pg.click('#cpk_cancel'); pg.click('[data-cpk-send="11"]'); pg.wait_for_timeout(300); pg.click('#cpk_send'); pg.wait_for_timeout(300)
    ok('card: a refused send shows the reason on the card', 'Not sent: Ariel has asked not to get texts' in pg.inner_text('#cp_packet'))
    pg.evaluate("STATE.fail = false")
    pg.select_option('#cpk_cg', '12'); pg.click('#cpk_text'); pg.wait_for_timeout(300)
    ok('card: Text the packet for a picked caregiver opens their draft', pg.evaluate("CALLS[CALLS.length-1]") == {'action': 'send_draft', 'packet_id': '11111111-1111-1111-1111-111111111111', 'caregiver_axiscare_id': '12'})
    ok('card: still no em dash anywhere', '\u2014' not in pg.inner_text('#cp_packet'))
    pg.click('#cpk_cancel')
    pg.fill('#cpk_about', 'Changed'); pg.wait_for_timeout(100)
    ok('card: after a change, links and texts wait until it is saved', pg.is_disabled('#cpk_link') and pg.is_disabled('#cpk_text'))
    # ---- the caregiver's page ----
    st = {'view': json.loads(json.dumps(VIEW)), 'calls': [], 'mode': 'ok'}
    def handle(route):
      body = json.loads(route.request.post_data or '{}'); st['calls'].append(body)
      if st['mode'] == 'bad': return route.fulfill(status=403, content_type='application/json', body=json.dumps({'error': 'This link is not valid or has expired. Please call the office at (417) 234-8494 for a new one.'}))
      if body.get('action') == 'ack':
        if body.get('version') != st['view']['version']: return route.fulfill(status=409, content_type='application/json', body=json.dumps({'error': 'This packet was just updated.', 'outcome': 'changed'}))
        st['view'].update(acknowledged=True, ack_at='2026-10-12T21:05:00Z'); return route.fulfill(status=200, content_type='application/json', body='{"outcome":"done"}')
      return route.fulfill(status=200, content_type='application/json', body=json.dumps(st['view']))
    p2 = b.new_page(viewport={'width': 390, 'height': 844}); p2.on('pageerror', lambda e: errs.append(str(e)[:200]))
    p2.route('https://zngsgedlsxinbygwmxwn.supabase.co/functions/v1/care-packet', handle)
    p2.route(lambda u: 'youtube' in u or 'vimeo' in u or 'evil' in u, lambda r: r.fulfill(status=200, body='<body style="background:#222"></body>', content_type='text/html'))
    p2.goto('file://' + os.path.join(ROOT, 'packet.html') + '?i=pl_AAAAAAAAAAAAAAAAAAAA&e=9999999999&t=' + 'A' * 43); p2.wait_for_timeout(500)
    t = p2.inner_text('body')
    ok('page: titled for Dan, for Ariel, his notes and both topics', 'Caring for Dan' in t and 'For Ariel' in t and 'Call the hospice nurse first' in t and 'Float the heels' in t and 'PureWick for men' in t, t[:300])
    srcs = p2.eval_on_selector_all('iframe', 'f=>f.map(x=>x.src)')
    ok('page: the YouTube and Vimeo players are framed; an unknown player is never framed', srcs == ['https://www.youtube-nocookie.com/embed/6M5_eTPUWpo?rel=0', 'https://player.vimeo.com/video/968970613?dnt=1'], srcs)
    hrefs = p2.eval_on_selector_all('a.open', 'a=>a.map(x=>x.getAttribute("href"))')
    ok('page: the PDF opens as a link; a javascript: link is neutralised', hrefs == ['https://example.com/x.pdf', '#'], hrefs)
    ok('page: opening it sent only "view"', [c['action'] for c in st['calls']] == ['view'] and st['calls'][0]['i'] == 'pl_AAAAAAAAAAAAAAAAAAAA')
    ok('page: fits a phone (no sideways scroll)', p2.evaluate('document.documentElement.scrollWidth <= window.innerWidth'))
    p2.screenshot(path=os.path.join(OUT, 'cpk_2_page.png'), full_page=True)
    p2.click('#bAck'); p2.wait_for_timeout(400)
    ok('page: "I watched it and understand" sends the version shown, then thanks her', st['calls'][-2] == {'i': 'pl_AAAAAAAAAAAAAAAAAAAA', 'e': 9999999999, 't': 'A' * 43, 'action': 'ack', 'version': 2} and 'Thank you, Ariel' in p2.inner_text('body'), st['calls'][-3:])
    p2.screenshot(path=os.path.join(OUT, 'cpk_3_done.png'), full_page=True)
    st['view'].update(version=3, acknowledged=False, earlier_ack=True, ack_at=None); p2.reload(); p2.wait_for_timeout(400)
    ok('page: an updated packet says so and asks again', 'This packet was updated' in p2.inner_text('body') and p2.is_visible('#bAck'))
    st['mode'] = 'bad'; p2.reload(); p2.wait_for_timeout(400)
    ok('page: a bad or expired link shows the office number and nothing else', '(417) 234-8494' in p2.inner_text('body') and not p2.query_selector('iframe'))
    ok('no page errors', not errs, errs)
    b.close()
finally:
  try: os.remove(os.path.join(ROOT, '_cpk_test.html'))
  except Exception: pass
for s, n, d in R: print(s, n, ('\n     ' + d) if d else '')
bad = [x for x in R if x[0] == 'FAIL']; print(f"\n{len(R) - len(bad)}/{len(R)} passed"); sys.exit(1 if bad else 0)

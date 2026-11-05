"""Onboarding availability chart (Samantha 2026-11-04: "I approve the plan and your picks for all five decisions",
https://claude.ai/artifact/AE8V9sfNesKVBdnCqu6s2L). The real page, styles and Onboarding table code, served from THIS checkout,
offline, MADE-UP people only (the same people as onboarding_table_look.py, with made-up Step 1 availability). The step1-sign
availability_board answer is faked. Saves desktop and phone screenshots. Nothing reaches production; nothing is saved or sent.
(python3 tests/browser/onboarding_availability_look.py; OUT=<dir> for the screenshots)"""
import os, json, re
SRC = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'onboarding_table_look.py')).read()
exec(SRC[:SRC.index('T = r"""')])          # the server, CODE and the made-up people of the Onboarding table test
T0 = SRC[SRC.index('T = r"""') + 8:]
SETUP = T0[:T0.index('  renderCkd();\n  const dash=')]   # page set-up up to the first draw
OAV = open(os.path.join(ROOT, 'onboarding-availability.js')).read()
W = lambda *b: {'mon': list(b[0]), 'tue': list(b[1]), 'wed': list(b[2]), 'thu': list(b[3]), 'fri': list(b[4]), 'sat': list(b[5]), 'sun': list(b[6])}
M, A, E, O = 'morning', 'afternoon', 'evening', 'overnight'
BOARD = [  # what step1-sign availability_board would answer
  {'offer_id': 'o1aa0001', 'signed': True, 'target_hours': 30, 'outside_ok': True, 'hours_by_day': {'mon': '7-3'}, 'windows': W([M, A], [M, A], [M, A], [M, A], [M, A], [], [])},
  {'offer_id': 'o2aa0002', 'signed': True, 'target_hours': 40, 'outside_ok': False, 'hours_by_day': {}, 'windows': W([M], [M], [M], [M], [M], [M], [M])},
  {'offer_id': 'o3aa0003', 'signed': False, 'target_hours': 12, 'outside_ok': None, 'hours_by_day': {'sat': 'any time'}, 'windows': W([], [], [], [], [], [M, A, E, O], [M, A, E, O])},
  {'offer_id': 'o7aa0007', 'signed': True, 'target_hours': 25, 'outside_ok': None, 'hours_by_day': {}, 'windows': W([E], [E], [E], [E], [], [], [])},
  {'offer_id': 'o8', 'signed': True, 'target_hours': 99, 'outside_ok': None, 'hours_by_day': {}, 'windows': W([O], [], [], [], [], [], [])},   # Jo: the roster record wins
]
ROSTER_AV = [{'axiscare_id': '9008', 'name': 'Jo Placeholder', 'target_hours': 20, 'windows': W([], [A], [A], [], [], [], [])}]
T = r"""
async(arg)=>{
  const [CODE, OAVSRC, BOARD, RAV] = arg;
""" + SETUP.replace('async(CODE)=>{\n', '') + r"""
  /* made-up offers and jobs on the made-up people: Ava a CNA, Bea a caregiver on PRN hours, Cora a caregiver who said yes to PRN */
  const c = id => candidates.find(x => x.id === id);
  Object.assign(c(1), { offer_id:'o1aa0001', position:'CNA' }); Object.assign(c(2), { offer_id:'o2aa0002', position:'Caregiver' });
  Object.assign(c(3), { offer_id:'o3aa0003', position:'Caregiver', prn_offer:{ at:'x', answer:'yes' } }); c(7).offer_id = 'o7aa0007';
  OFFERS.push({ id:'o2aa0002', first_name:'Bea', last_name:'Sample', position:'Caregiver', hours_type:'PRN' });
  DATA.caregiver_availability = RAV;
  window.cgdAvailFor = (ax, nm) => RAV.find(a => String(a.axiscare_id) === String(ax)) || null;
  window.ccIsOwner = () => true;
  window.OAVT_CALLS = [];
  sb = { functions:{ invoke: async (fn, o) => { OAVT_CALLS.push([fn, o.body]); await new Promise(r => setTimeout(r, 30)); return { data:{ ok:true, people:BOARD.filter(x => o.body.offer_ids.includes(x.offer_id)) }, error:null }; } } };
  const sc2=document.createElement('script'); sc2.textContent=OAVSRC; document.head.appendChild(sc2);
  try{ localStorage.removeItem('onbAvail'); localStorage.removeItem('onbAvailOpen'); localStorage.removeItem('onbAvailJob'); }catch(e){}
  const dash=document.getElementById('ckdDash');
  const txt = e => (e ? e.innerText : '').replace(/\s+/g,' ').trim();
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const out = {};
  DATA.ops_settings.onboarding_availability_live = false; renderCkd();
  out.off = { bar: !!dash.querySelector('.oav-bar'), link: txt(dash.querySelector('.oav-pvl')) };
  DATA.ops_settings.onboarding_availability_live = true; renderCkd();
  out.closed = { btn: txt(dash.querySelector('.oav-toggle')), panel: !!dash.querySelector('section.oav'), calls: OAVT_CALLS.length };
  OAV.toggleOpen(); await wait(120);
  const grid = () => Object.fromEntries([...dash.querySelectorAll('.oav-c')].map(b => [b.getAttribute('aria-label').split(':')[0], Number(b.innerText)]));
  const tiles = () => [...dash.querySelectorAll('.oav-t')].map(t => txt(t));
  const chips = () => [...dash.querySelectorAll('.oav-chip')].map(t => txt(t));
  out.open = { calls: OAVT_CALLS.map(x => [x[0], x[1].action, x[1].offer_ids]), tiles: tiles(), chips: chips(), grid: grid(), ready: [...dash.querySelectorAll('.oav-row')].map(r => txt(r)),
    order: [...dash.children].map(e => e.className).join(' | '), head: !!dash.querySelector('.ckd-head .oav-head .oav-toggle') && !!dash.querySelector('.ckd-head .oav-head #ckdSearch') };
  /* the real shapes on 11-04 (her "a few are PRN"): newer offers say classification prn + position_key, applications keep keys like prn_cna */
  const J = (c, o) => OAV._jobs({ c, o }, null).join(',');
  out.realJobs = [
    J({ position:'Caregiver' }, { position:'CNA', classification:'prn', position_key:'cna' }),
    J({ position:'Caregiver' }, { position:'Caregiver', classification:'prn', position_key:'caregiver' }),
    J({ position:'prn_cna' }, null),
    J({ position:'prn_caregiver' }, null),
    J({ position:'Caregiver' }, { position:'CNA', hours_type:'PRN' }),
    J({ position:'Caregiver' }, { position:'CNA', classification:'part_time', position_key:'cna' }),
    J({ position:'Caregiver' }, { position:'Caregiver', hours_type:'FULL_TIME' }),
    J({ position:'lpn' }, null) ];
  OAV.cell('mon', 'morning'); await wait(30);
  out.monMorning = txt(dash.querySelector('.oav-who'));
  OAV.cell('sat', 'overnight'); await wait(30);
  out.satNight = txt(dash.querySelector('.oav-who')); out.dot = !!dash.querySelector('.oav-who .oav-dot');
  OAV.unknown(); await wait(30); out.unknown = txt(dash.querySelector('.oav-who'));
  OAV.job('cna'); await wait(30); out.cna = { tiles: tiles(), grid: grid() };
  OAV.job('prn'); await wait(30); out.prn = { tiles: tiles(), satNight: grid()['Sat overnight'], monMorning: grid()['Mon morning'] };
  OAV.job('all'); OAV.cell('tue', 'afternoon'); await wait(30); out.joRecord = txt(dash.querySelector('.oav-who'));
  out.calls2 = OAVT_CALLS.length;
  /* an offer sent and not signed yet is not counted (her pick 2); a signed one waiting on Step 1 is (unknown until they answer) */
  const U = [{ p:{ o:{ id:'ounsigned' }, stop:0, name:'Uma Unsigned' }, name:'Uma Unsigned', nearly:false }];
  window.offerStage = () => 'sent'; out.unsigned = OAV.people(U).length;
  window.offerStage = () => 'accepted'; const sg = OAV.people(U); out.signed = sg.length + ':' + (sg[0] && sg[0].av === null) + ':' + (sg[0] && sg[0].stage);
  delete window.offerStage;
  window._shot = 1;
  return out;
}
"""
res = []
def ck(n, c, note=None): res.append((n, bool(c), '' if c else json.dumps(note)[:700]))
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 1440, 'height': 1000}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://127.0.0.1:{PORT}/index.html'); pg.wait_for_timeout(1200)
    code = CODE.replace('__OFFERS__', json.dumps(OFFERS)).replace('__CANDS__', json.dumps(CANDS)).replace('__ROSTER__', json.dumps(ROSTER)).replace('__WC__', json.dumps(WC)) \
        .replace('__D14__', ts(14)).replace('__D2__', ts(2)).replace('__D7__', ts(7))
    r = pg.evaluate(T, [code, OAV, BOARD, ROSTER_AV])
    ck('switch off: no button, an owner gets a preview link', not r['off']['bar'] and 'Preview the availability chart' in r['off']['link'], r['off'])
    ck('switch on: one Show availability button, closed, nothing read until opened', r['closed']['btn'] == 'Show availability' and not r['closed']['panel'] and r['closed']['calls'] == 0, r['closed'])
    calls = r['open']['calls']
    ck('opening reads Step 1 once, through step1-sign availability_board, for the offers on the table', len(calls) == 1 and calls[0][0] == 'step1-sign' and calls[0][1] == 'availability_board'
       and 'o1aa0001' in calls[0][2] and 'o8' in calls[0][2], calls)
    ck('an offer not signed yet is not counted; a signed one waiting on Step 1 is, as unknown, in Still in Step 1 (her pick 2)', r['unsigned'] == 0 and r['signed'] == '1:true:step1', [r['unsigned'], r['signed']])
    t = r['open']['tiles']
    ck('the three counts: people on the table, hours they want, unknown', len(t) == 3 and t[0].endswith('in onboarding') and t[1] == '127 h a week they want' and 'availability unknown' in t[2], t)
    n_people = int(t[0].split()[0]); n_unknown = int(t[2].split()[0])
    ck('5 known (Ava, Bea, Cora, Ivy, Jo), everyone else unknown', n_people - n_unknown == 5, t)
    g = r['open']['grid']
    ck('the grid: Ava + Bea Monday morning, Ava Monday afternoon, Cora Saturday overnight, Ivy Monday evening', g['Mon morning'] == 2 and g['Mon afternoon'] == 1 and g['Sat overnight'] == 1 and g['Mon evening'] == 1 and g['Sat morning'] == 2, g)
    ck('Jo on the roster: the availability record wins over Step 1 (Tuesday afternoon, not Monday overnight; 20 h, not 99)', g['Tue afternoon'] == 2 and g['Mon overnight'] == 0, g)
    ck('28 boxes: 7 days by Morning, Afternoon, Evening, Overnight', len(g) == 28 and 'Sun overnight' in g, list(g)[:4])
    ch = r['open']['chips']
    ck('job chips with counts: Everyone, Caregivers, CNAs, PRN', [x.split(' ')[0] for x in ch] == ['Everyone', 'Caregivers', 'CNAs', 'PRN'] and ch[2] == 'CNAs 1' and ch[3] == 'PRN 2', ch)
    rd = r['open']['ready']
    ck('ready by: four steps with hours (Jo 20 h nearly ready or later; Ava + Bea + Cora + Ivy in checks/orientation)', len(rd) == 4 and rd[0].startswith('Approved to Work') and rd[3].startswith('Still in Step 1') and sum(int(re.search(r'(\d+) h$', x).group(1)) for x in rd) == 127, rd)
    ck('the panel sits between the work queues and the table', re.search(r'obt-qs \| oav \| obt-wrap', r['open']['order']), r['open']['order'])
    ck('the Show availability button sits up by the search box (her ask 11-04)', r['open']['head'], r['open'])
    ck('PRN and CNA read the way offers really are: classification prn, position_key, prn_cna keys; the offer wins over the application',
       r['realJobs'] == ['cna,prn', 'cg,prn', 'cna,prn', 'cg,prn', 'cna,prn', 'cna', 'cg', ''], r['realJobs'])
    ck('tap Monday morning: Ava (with the hours she wrote, 7-3) and Bea', 'Mon morning (2)' in r['monMorning'] and 'Ava Fake' in r['monMorning'] and '7-3' in r['monMorning'] and 'Bea Sample' in r['monMorning'], r['monMorning'])
    ck('filled in, availability form not signed yet: counted, marked (her pick 3)', 'Cora Sampleton' in r['satNight'] and 'not signed yet' in r['satNight'] and r['dot'], r['satNight'])
    ck('availability unknown lists the names and says they are never counted as free', 'Availability unknown' in r['unknown'] and 'never counted as free' in r['unknown'] and 'Hal Mock' in r['unknown'], r['unknown'])
    ck('CNAs: only Ava (1 counted, 30 h)', r['cna']['tiles'][0].startswith('1 ') and r['cna']['tiles'][1] == '30 h a week they want' and r['cna']['grid']['Mon morning'] == 1, r['cna'])
    ck('PRN: Bea (offer PRN hours) and Cora (said yes to PRN); a PRN caregiver is under both', r['prn']['tiles'][0].startswith('2 ') and r['prn']['satNight'] == 1 and r['prn']['monMorning'] == 1, r['prn'])
    ck('Tuesday afternoon names Jo from the roster record', 'Jo Placeholder' in r['joRecord'], r['joRecord'])
    ck('no second read while fresh (chips and boxes redraw without asking again)', r['calls2'] == 1, r['calls2'])
    pg.evaluate("()=>{ OAV.job('all'); OAV.cell('mon','morning'); }"); pg.wait_for_timeout(150)
    box = pg.locator('section.oav').bounding_box()
    pg.screenshot(path=os.path.join(OUT, 'oav_desktop.png'), clip={'x': box['x'] - 12, 'y': max(0, box['y'] - 60), 'width': box['width'] + 24, 'height': box['height'] + 72}, full_page=True)
    hb = pg.locator('#ckdDash .ckd-head').bounding_box(); sb2 = pg.locator('section.oav').bounding_box()
    pg.screenshot(path=os.path.join(OUT, 'oav_header.png'), clip={'x': hb['x'] - 12, 'y': max(0, hb['y'] - 12), 'width': hb['width'] + 24, 'height': sb2['y'] - hb['y'] + 200}, full_page=True)
    found = pg.evaluate("()=>{ [...document.querySelectorAll('.oav-name')].find(b=>b.innerText.includes('Bea')); if(!document.querySelector('.oav-name')) return ['no names: '+((document.querySelector('.oav-who')||{}).innerText||'')]; [...document.querySelectorAll('.oav-name')].find(b=>b.innerText.includes('Bea')).click(); return [...document.querySelectorAll('tr.obt-r')].map(r=>r.querySelector('.obt-n').innerText.split('\\n')[0]); }")
    ck('a name finds that person in the table', len(found) == 1 and 'Bea' in found[0], found)
    # a failed read says so, with Try again, and does not keep asking
    fail = pg.evaluate("""async()=>{ window.CKD_FIND=''; document.getElementById('ckdSearch').value=''; const n0=OAVT_CALLS.length;
      sb.functions.invoke = async (fn,o)=>{ OAVT_CALLS.push([fn,o.body]); return { data:{ ok:false, error:'Sign in again' }, error:null }; };
      OAV.reload(); await new Promise(r=>setTimeout(r,200)); renderCkd(); await new Promise(r=>setTimeout(r,100));
      return { msg:(document.querySelector('.oav .ckd-err')||{}).innerText||'', asked:OAVT_CALLS.length-n0 }; }""")
    ck('a failed read shows the reason and Try again, and asks only once (no loop)', 'Could not read the Step 1 availability: Sign in again' in fail['msg'] and 'Try again' in fail['msg'] and fail['asked'] == 1, fail)
    m = b.new_page(viewport={'width': 390, 'height': 900}); m.on('pageerror', lambda e: errs.append(str(e)))
    m.goto(f'http://127.0.0.1:{PORT}/index.html'); m.wait_for_timeout(1200)
    m.evaluate(T, [code, OAV, BOARD, ROSTER_AV]); m.evaluate("()=>{ OAV.job('all'); OAV.cell('mon','morning'); }"); m.wait_for_timeout(150)
    wide = m.evaluate("()=>document.documentElement.scrollWidth > window.innerWidth + 2")
    ck('phone: nothing wider than the screen (the grid scrolls inside its own box if it must)', not wide, wide)
    box = m.locator('section.oav').bounding_box()
    m.screenshot(path=os.path.join(OUT, 'oav_phone.png'), clip={'x': 0, 'y': max(0, box['y'] - 60), 'width': 390, 'height': box['height'] + 72}, full_page=True)
    # Settings: owners get the switch and preview; the section explains it
    st = pg.evaluate("()=>{ const s=document.querySelector('[data-set=\"onboarding-availability\"]'); DATA.ops_settings.onboarding_availability_live=false; OAV.settingsFill(); return { h:s.querySelector('h3').innerText, now:document.getElementById('oavSetNow').innerText, btn:document.getElementById('oavToggleBtn').innerText, pv:document.getElementById('oavPreviewBtn').style.display }; }")
    ck('Settings: the section, Off, a Turn on button and a preview button for an owner', 'Onboarding availability chart' in st['h'] and st['now'].startswith('Off.') and st['btn'] == 'Turn on the availability chart for everyone' and st['pv'] == '', st)
    pv = pg.evaluate("()=>{ OAV.preview(true); return { showing:OAV.showing(), bar:!!document.querySelector('.oav-bar'), note:(document.querySelector('.oav-pv')||{}).innerText||'' }; }")
    ck('owner preview: only in this browser, marked as a preview', pv['showing'] and pv['bar'] and 'only you see this' in pv['note'], pv)
    nt = pg.evaluate("()=>{ OAV.preview(false); DATA.ops_settings.onboarding_availability_live=true; DATA.ops_settings.onboarding_table_live=false; return { showing:OAV.showing(), live:OAV.live(DATA.ops_settings) }; }")
    ck('needs the Onboarding table: with the table off the chart never shows', not nt['showing'] and not nt['live'], nt)
    words = OAV + open(os.path.join(ROOT, 'index.html')).read().split('data-set="onboarding-availability"')[1][:1500]
    ck('no em dashes and no "AI" in its words', '—' not in words and not re.search(r'\bAI\b', words))
    ck('no page errors', not errs, errs)
    b.close()
srv.shutdown()
bad = 0
for n, ok, note in res:
    print(('PASS  ' if ok else 'FAIL  ') + n + ('' if ok else '  ' + note)); bad += 0 if ok else 1
print(f'{len(res) - bad} / {len(res)}'); print('screenshots: ' + ', '.join(os.path.join(OUT, f) for f in ['oav_header.png', 'oav_desktop.png', 'oav_phone.png']))
raise SystemExit(1 if bad else 0)

"""Offers inside Onboarding (Samantha 2026-11-04: "removing the offers tab, and make offer the first step in the chart of onboarding
tab - need to not let it get bogged down if people are rejecting the offer...but want to see everyone on the onboarding chart").
The real page and styles, served from THIS checkout, offline, MADE-UP people only. Reuses the Onboarding table test's people and
adds offers in every state, then turns on offers_in_onboarding_live. Also draws the call card's AxisCare Class and attributes
lines. Saves screenshots. Nothing reaches production; nothing is saved, texted or emailed.
(python3 tests/browser/offer_in_onboarding_look.py; OUT=<dir> for the screenshots)"""
import os, json
HERE = os.path.dirname(os.path.abspath(__file__))
_src = open(os.path.join(HERE, 'onboarding_table_look.py')).read()
exec(_src[:_src.index('T = r"""')])   # the server, the engine cuts and the table test's made-up people
from playwright.sync_api import sync_playwright
for a, b in (('function offerRejectedWhy(o){', '/* "Jul 31" reads faster'), ('function offerAgeDays(iso){', '\n}\n'), ('function ckdIsTest(', '\n}\n')):
    if a not in CODE: CODE += cut(a, b) + ('\n}\n' if b == '\n}\n' else '')
CODE += """
var RESENT = []; function offerResend(id, btn){ RESENT.push(id); }
function offerSignLink(){} function offerOpenDoc(){} function offerCloseAsk(){}
async function ccConfirm(){ return true; }
"""
signed = dict(onboarding_path='new', offer_signed_at=ts(12), pd_signed_at=ts(12))
OFFERS2 = OFFERS + [
  {'id': 'o7', 'first_name': 'Ivy', 'last_name': 'Example', **signed, 'step1_done_at': ts(11)},
  {'id': 'osent2', 'first_name': 'Una', 'last_name': 'Fresh', 'onboarding_path': 'new', 'offer_status': 'sent', 'offer_sent_at': ts(2), 'created_at': ts(2), 'interview_date': day(2), 'offer_expires_at': ts(-12)},
  {'id': 'osent9', 'first_name': 'Vic', 'last_name': 'Slow', 'onboarding_path': 'new', 'offer_status': 'sent', 'offer_sent_at': ts(9), 'created_at': ts(9), 'interview_date': day(9), 'offer_expires_at': ts(-5),
   'axiscare_push_error': 'AxisCare applicant create failed (500)'},
  {'id': 'oquiet', 'first_name': 'Wes', 'last_name': 'Quiet', 'onboarding_path': 'new', 'offer_status': 'sent', 'offer_sent_at': ts(40), 'created_at': ts(40), 'interview_date': day(40), 'offer_expires_at': ts(-30)},
  {'id': 'odecl', 'first_name': 'Xia', 'last_name': 'Nope', 'onboarding_path': 'new', 'offer_status': 'declined', 'offer_declined_at': ts(3), 'offer_sent_at': ts(5), 'interview_date': day(5)},
  {'id': 'oexp', 'first_name': 'Yan', 'last_name': 'Late', 'onboarding_path': 'new', 'offer_status': 'expired', 'offer_sent_at': ts(20), 'offer_expires_at': ts(6), 'interview_date': day(20)},
  {'id': 'oold', 'first_name': 'Zed', 'last_name': 'Long', 'onboarding_path': 'new', 'offer_status': 'withdrawn', 'offer_withdrawn_at': ts(60), 'offer_sent_at': ts(70), 'interview_date': day(70)},
  {'id': 'oacc', 'first_name': 'Ada', 'last_name': 'Signed', **signed, 'step1_sent_at': ts(3)},
  {'id': 'orej', 'first_name': 'Rae', 'last_name': 'Withdrawn', 'onboarding_path': 'new', 'offer_status': 'withdrawn', 'offer_withdrawn_at': ts(1), 'offer_sent_at': ts(6), 'interview_date': day(6)},
]
# Max (o11) has a checks row but has NOT signed his offer; Rae has a checks row and a withdrawn offer (she must leave the table)
for o in OFFERS2:
    if o['id'] == 'o11': o.update(onboarding_path='new', offer_status='sent', offer_sent_at=ts(4), created_at=ts(4), interview_date=day(4), offer_expires_at=ts(-10))
CANDS2 = CANDS + [dict(id=13, first='Rae', last='Withdrawn', added=day(6), onboarding_path='new', oig='Pending', edl='Pending', fcsr='Pending', casenet='Pending', offer_id='orej')]
T = _src[_src.index('T = r"""') + 8:_src.index('  /* 2026-11-04: groups over the columns')] + r"""
  const offTxt = n => txt(cell(n, col('Offer')));
  DATA.ops_settings = Object.assign(DATA.ops_settings || {}, { offers_in_onboarding_live:true });
  renderCkd();
  const H2 = [...dash.querySelectorAll('thead tr:last-child th')].map(th => th.innerText.trim()), c2 = n => H2.indexOf(n);
  const cell2 = (n, k) => { const r = rowOf(n); return r ? r.children[c2(k)] : null; };
  out.on = { H:H2, groups:[...dash.querySelectorAll('thead tr.obt-grp th')].map(th => th.textContent.trim()).filter(Boolean),
    rows:[...dash.querySelectorAll('tr.obt-r')].map(r => txt(r.querySelector('.obt-n')).split(' ').slice(0, 2).join(' ')),
    sub:txt(dash.querySelector('.ckd-sub')), chips:txt(dash.querySelector('.obt-qs')),
    una:{ offer:txt(cell2('Una Fresh', 'Offer')), step1:txt(cell2('Una Fresh', 'Step 1')), late: !!cell2('Una Fresh', 'Offer').querySelector('.obt-late') },
    vic:{ offer:txt(cell2('Vic Slow', 'Offer')), late: !!cell2('Vic Slow', 'Offer').querySelector('.obt-late'), edge:rowOf('Vic Slow').className, name:txt(rowOf('Vic Slow').querySelector('.obt-n')) },
    max:{ offer:txt(cell2('Max Draft', 'Offer')), step1:txt(cell2('Max Draft', 'Step 1')), oig:txt(cell2('Max Draft', 'OIG')) },
    ada:{ offer:txt(cell2('Ada Signed', 'Offer')), step1:txt(cell2('Ada Signed', 'Step 1')) },
    ivy:{ offer:txt(cell2('Ivy Example', 'Offer')) },
    ava:{ offer:txt(cell2('Ava Fake', 'Offer')) },
    folds:[...dash.querySelectorAll('.obt-fold > summary')].map(x => x.textContent.replace(/\s+/g,' ').trim()),
    quietList:(dash.querySelector('.obt-fold-q') || {}).textContent || '', rejList:(dash.querySelector('.obt-fold-r') || {}).textContent || '',
    sum:Object.fromEntries([...dash.querySelectorAll('.obt-s')].map(b => [b.querySelector('span').innerText, Number(b.querySelector('b').innerText)])) };
  obtQueue('offer'); out.on.offerQ = [...dash.querySelectorAll('tbody tr')].map(r => r.classList.contains('obt-g') ? '# ' + txt(r) : txt(r.querySelector('.obt-n')).split(' ').slice(0, 2).join(' '));
  obtQueue('late'); out.on.lateRows = [...dash.querySelectorAll('tr.obt-r')].map(r => txt(r.querySelector('.obt-n')).split(' ').slice(0, 2).join(' '));
  obtQueue('office'); out.on.officeRows = [...dash.querySelectorAll('tr.obt-r')].map(r => txt(r.querySelector('.obt-n')).split(' ').slice(0, 2).join(' '));
  OBT_Q = 'all'; renderCkd();
  await obtOfferResend('osent9'); out.on.resent = RESENT.slice(); out.on.panel = (document.getElementById('obtOp') || {}).textContent || '';
  obtOfferPanelClose();
  DATA.ops_settings.offers_in_onboarding_live = false; renderCkd();
  out.off = { H:[...dash.querySelectorAll('thead tr:last-child th')].map(th => th.innerText.trim()), folds:dash.querySelectorAll('.obt-fold').length,
    rows:[...dash.querySelectorAll('tr.obt-r')].map(r => txt(r.querySelector('.obt-n')).split(' ').slice(0, 2).join(' ')) };
  DATA.ops_settings.offers_in_onboarding_live = true; renderCkd();
  return out;
}
"""
res = []
def ck(n, c, note=None): res.append((n, bool(c), '' if c else json.dumps(note, default=str)[:700]))
shots = []
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1440, 'height': 1000})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(f'http://127.0.0.1:{PORT}/index.html?proof=oio'); pg.wait_for_timeout(1500)
    code = CODE.replace('__CANDS__', json.dumps(CANDS2)).replace('__OFFERS__', json.dumps(OFFERS2)).replace('__ROSTER__', json.dumps(ROSTER)).replace('__WC__', json.dumps({str(k): v for k, v in WC.items()})) \
               .replace('__D14__', ts(14)).replace('__D2__', ts(2)).replace('__D7__', ts(7))
    R = pg.evaluate(T, code); on = R['on']
    ck('switch on: Offer is the first column, under its own label, before Step 1', on['H'][:4] == ['Name', 'Days', 'Offer', 'Step 1'] and on['groups'][:2] == ['Offer', 'Application'], [on['H'], on['groups']])
    ck('switch on: the header says from the offer to Approved to Work, and Offer is a work queue', 'From the offer to Approved to Work' in on['sub'] and 'Offer' in on['chips'], [on['sub'], on['chips']])
    ck('everyone offered is on the chart: Una and Vic (sent, no checks row yet), Ada (signed, Step 1 out, no checks row yet)', all(n in on['rows'] for n in ['Una Fresh', 'Vic Slow', 'Ada Signed']), on['rows'])
    ck('not bogged down: declined, expired, withdrawn and gone-quiet offers are NOT rows', not any(n in on['rows'] for n in ['Xia Nope', 'Yan Late', 'Zed Long', 'Wes Quiet', 'Rae Withdrawn']), on['rows'])
    ck('a withdrawn offer drops its checks row off the table too (Rae)', 'Rae Withdrawn' not in on['rows'] and 'Rae Withdrawn' in on['rejList'], [on['rows'], on['rejList']])
    ck('Una: offer sent 2 days ago reads "Sent 2d", waiting, not red; nothing after the offer has started', on['una']['offer'].startswith('Sent 2d') and not on['una']['late'] and on['una']['step1'] == '·', on['una'])
    ck('Vic: offer sent 9 days ago is red (day 7, the still-interested check-in day), Resend shows', on['vic']['offer'].startswith('Sent 9d') and on['vic']['late'] and 'Resend' in on['vic']['offer'], on['vic'])
    ck('Vic: the failed AxisCare add shows as a tag by the name', 'AxisCare: add by hand' in on['vic']['name'], on['vic'])
    ck('Max: has a checks row but has not signed: Offer "Sent 4d" and Step 1 and the checks wait (was "Step 1 Waiting" before)', on['max']['offer'].startswith('Sent 4d') and on['max']['step1'] == '·' and on['max']['oig'] == '·', on['max'])
    ck('Ada: signed, so the Offer cell is done with the date, and Step 1 is waiting', __import__('re').search(r'[A-Z][a-z]{2} \d', on['ada']['offer']) and 'Waiting' in on['ada']['step1'], on['ada'])
    ck('Ivy: offer signed, done with the date; Ava (an older record with no offer on file) reads –', __import__('re').search(r'[A-Z][a-z]{2} \d', on['ivy']['offer']) and on['ava']['offer'] == '–', [on['ivy'], on['ava']])
    ck('under the table: Gone quiet (Wes) and Turned down, last 30 days (Xia declined, Yan expired, Rae withdrawn), with Zed under Older', on['folds'][:2] == ['Gone quiet (1)', 'Turned down, last 30 days (3)'] and 'Wes Quiet' in on['quietList'] and all(n in on['rejList'] for n in ['Xia Nope', 'Declined', 'Yan Late', 'Expired']) and 'Older (1)' in on['folds'], on)
    ck('Offer queue: only the unsigned offers, waiting on them to sign, oldest first (Vic, Max, Una)', on['offerQ'][0].startswith('# Waiting on them to sign') and [x for x in on['offerQ'] if not x.startswith('#')] == ['Vic Slow', 'Max Draft', 'Una Fresh'], on['offerQ'])
    ck('Overdue includes Vic (offer not signed in 7 days)', 'Vic Slow' in on['lateRows'], on['lateRows'])
    ck('an unsigned offer is never office work (Una, Vic and Max are not in Need office action)', not any(n in on['officeRows'] for n in ['Una Fresh', 'Vic Slow', 'Max Draft']), on['officeRows'])
    ck('Resend asks first, then sends from the offer window (which shows the AxisCare problem)', on['resent'] == ['osent9'] and 'Resend the offer' in on['panel'] and 'add them in axiscare by hand' in on['panel'].lower() and 'Close offer' in on['panel'], on)
    ck('switch off: the table is exactly as before (no Offer column, no folds, no offer-only rows)', 'Offer' not in R['off']['H'] and R['off']['folds'] == 0 and not any(n in R['off']['rows'] for n in ['Una Fresh', 'Vic Slow', 'Ada Signed']), R['off'])
    box = pg.locator('#ckdDash').bounding_box()
    p1 = os.path.join(OUT, 'oio_table.png'); pg.screenshot(path=p1, clip={'x': box['x'] - 8, 'y': max(0, box['y'] - 8), 'width': min(1440, box['width'] + 16), 'height': min(1500, box['height'] + 16)}, full_page=True); shots.append(p1)
    pg.evaluate("()=>{ document.querySelectorAll('.obt-fold').forEach(d=>d.open=true); }")
    f = pg.locator('.obt-folds').bounding_box()
    p2 = os.path.join(OUT, 'oio_folds.png'); pg.screenshot(path=p2, clip={'x': f['x'] - 8, 'y': f['y'] - 8, 'width': min(900, f['width'] + 16), 'height': f['height'] + 16}, full_page=True); shots.append(p2)
    ck('no page errors', not errs, errs)
    b.close()
bad = [r for r in res if not r[1]]
for n, ok, note in res: print(('PASS  ' if ok else 'FAIL  ') + n + ('' if ok else '\n      ' + note))
print(f'{len(res) - len(bad)} / {len(res)}')
print('screenshots: ' + ', '.join(shots))
raise SystemExit(1 if bad else 0)

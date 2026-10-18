"""The nine-step Start of Care card (stage B) in a real browser, offline, with TEST data: python3 tests/browser/nine_steps_look.py <hub folder> <port> <staffing folder> <screenshot folder>."""
import re, sys, json, copy
from playwright.sync_api import sync_playwright
HUB, PORT, STAFF, OUT = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
src = open(HUB + '/tests/browser/standup_look.py').read()
STUB = re.search(r'STUB = r"""(.*?)"""', src, re.S).group(1)
NINE = json.load(open(STAFF + '/client-journey/catalog-nine.json'))['steps']
DEFS = [dict(d, key=d['key']) for d in NINE]
JOURNEY = {'journey_id': 'j-1', 'catalog': 'nine', 'client_name': 'Margaret Ellis (TEST)', 'payer': 'private', 'assigned_cc': 'krystal@mo-care.com', 'status': 'open', 'is_test': True, 'lead_id': 'T9', 'axiscare_client_id': '318', 'target_start': '2026-10-26', 'subject': 'client'}
def done(k, by='krystal@mo-care.com', name='Krystal Land', **ev): return {'journey_id': 'j-1', 'step_key': k, 'state': 'complete', 'evidence': ev, 'completed_by': by, 'completed_by_name': name, 'completed_at': '2026-10-20T15:00:00Z', 'version': 1}
SC = {
 'setup': [done('soc.lead', 'hub', 'The Hub (every check done)'), done('soc.assess', 'hub', 'The Hub (every check done)'), {**done('soc.outcome'), 'answer': {'outcome': 'ready'}},
   {'journey_id': 'j-1', 'step_key': 'soc.setup', 'state': 'open', 'ready_since': '2026-10-20T15:00:00Z', 'version': 2, 'answer': {'health': True},
    'evidence': {'answered': {'health': {'by': 'krystal@mo-care.com', 'at': '2026-10-21T14:00:00Z'}}, 'auto': {'ax_client': {'ok': True, 'detail': 'AxisCare client #318 read back'}, 'agreement': {'ok': False, 'detail': 'Signed by the family; the office still needs to countersign'}, 'ax_contacts': {'ok': True, 'detail': '2 responsible parties in AxisCare'}, 'ax_tasks': {'ok': False, 'detail': 'No care tasks in AxisCare yet'}}}}],
 'outcome': [done('soc.lead', 'hub', 'The Hub (every check done)'), done('soc.assess', 'hub', 'The Hub (every check done)')],
 'axis': [done('soc.lead','hub','The Hub'), done('soc.assess','hub','The Hub'), {**done('soc.outcome'), 'answer': {'outcome': 'ready'}}, done('soc.setup','hub','The Hub (every check done)'), done('soc.confirm','hub','The Hub (every check done)'),
   done('soc.axis', 'hub', 'The Hub (every check done)', auto={'first_assigned': {'ok': True, 'detail': 'First visit 2026-10-26T08:00 with Maria V.', 'facts': {'from': '2026-10-26', 'to': '2026-11-08', 'total': 6, 'unassigned': 2, 'open_at': ['2026-10-28T08:00', '2026-10-30T08:00'], 'first_at': '2026-10-26T08:00', 'first_caregiver': 'Maria V.'}}})],
}
SC['start'] = SC['axis']
state = {'steps': []}
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1300, 'height': 1100})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    calls = []
    def route(r):
        body = json.loads(r.request.post_data or '{}'); calls.append(body)
        if body.get('action') == 'get':
            ag = {'id': 'g1', 'status': 'signed'} if state.get('agree') else None
            return r.fulfill(status=200, content_type='application/json', body=json.dumps({'journey': JOURNEY, 'steps': state['steps'], 'events': [], 'defs': DEFS, 'ref': 'A318', 'names': {'krystal@mo-care.com': 'Krystal Land'}, 'is_owner': True, 'agreement': ag, 'ctx': {'owner_emails': ['sam@mo-care.com']}, 'office': []}))
        if body.get('action') == 'apply' and body.get('op') == 'save':
            for s in state['steps']:
                if s['step_key'] == body['step_key']:
                    s.setdefault('answer', {}).update(body['answer']); s['evidence'].setdefault('answered', {})
                    for k in body['answer']: s['evidence']['answered'][k] = {'by': 'krystal@mo-care.com', 'at': '2026-10-21T15:00:00Z'}
            return r.fulfill(status=200, content_type='application/json', body=json.dumps({'outcome': 'saved'}))
        return r.fulfill(status=200, content_type='application/json', body=json.dumps({'outcome': 'ok', 'journeys': []}))
    pg.route('**/functions/v1/client-journey', route)
    pg.add_init_script(STUB)
    pg.goto(f'http://localhost:{PORT}/index.html?proof=nine'); pg.wait_for_timeout(1500)
    pg.evaluate("""(defs) => { window.__N9 = { defs, calls:[] }; const of = window.fetch;
      window.fetch = async (u, o) => { if(String(u).includes('/functions/v1/client-journey')){ const b = JSON.parse((o && o.body) || '{}'); const N = window.__N9; N.calls.push(b);
          const res = x => new Response(JSON.stringify(x), { status:200, headers:{ 'Content-Type':'application/json' } });
          if(b.action === 'get') return res({ journey:N.journey, steps:N.steps, events:[], defs:N.defs, ref:'A318', names:{ 'krystal@mo-care.com':'Krystal Land' }, is_owner:true, agreement:N.agree ? { id:'g1', status:'signed' } : null, ctx:{ owner_emails:['sam@mo-care.com'] }, office:[] });
          if(b.action === 'apply' && b.op === 'save'){ const st = N.steps.find(x => x.step_key === b.step_key); st.answer = Object.assign(st.answer || {}, b.answer); st.evidence.answered = st.evidence.answered || {}; Object.keys(b.answer).forEach(k => { st.evidence.answered[k] = { by:'krystal@mo-care.com', at:'2026-10-21T15:00:00Z' }; }); return res({ outcome:'saved' }); }
          return res({ outcome:'ok', journeys:[] }); }
        return of(u, o); }; }""", DEFS)
    def show(name, steps, agree=False):
        pg.evaluate("(a) => { window.__N9.journey = a[0]; window.__N9.steps = a[1]; window.__N9.agree = a[2]; }", [JOURNEY, copy.deepcopy(steps), agree])
        pg.evaluate("""() => { sb.auth.getSession=async()=>({ data:{ session:{ access_token:'t', user:{ email:'krystal@mo-care.com' } } } }); DATA.ops_settings = Object.assign({}, DATA.ops_settings||{}, { client_journey_live:true, soc_nine_steps_live:true });
          const l = { id:'T9', is_test:true, client_first_name:'Margaret', client_last_name:'Ellis (TEST)', funding_source:'private', phone:'4175550142', client_city:'Republic', status:'Converted', said_yes_at:'2026-10-20T15:00:00Z' };
          DATA.leads = [l]; window.CP = window.CP || {}; CP.lead = l; CP.ax = '318';
          document.getElementById('appScreen').style.display = 'block';
          document.querySelectorAll('#appScreen section').forEach(e => { if(e.id !== 'leadProfileView' && !e.contains(document.getElementById('leadProfileView'))) e.style.display = 'none'; });
          const v = document.getElementById('leadProfileView'); v.style.display = 'block'; cpShowTab('start');
          cjMountProfile({ lead:l, ax:'318' }); }""")
        pg.wait_for_timeout(1200)
        pg.locator('#cjStart').screenshot(path=f'{OUT}/nine_{name}.png')
        return pg.evaluate("() => document.getElementById('cjStart').innerText")
    out = {}
    out['setup'] = show('setup', SC['setup'], agree=True)
    pg.locator('#cjStart input[data-n9c="docs"]').check(); pg.wait_for_timeout(900)
    out['after_tick'] = pg.evaluate("() => document.getElementById('cjStart').innerText")
    pg.locator('#cjStart').screenshot(path=f'{OUT}/nine_setup_ticked.png')
    out['outcome'] = show('outcome', SC['outcome'])
    out['axis'] = show('start', SC['start'])
    saves = [c for c in pg.evaluate('() => window.__N9.calls') if c.get('op') == 'save']
    b.close()

print(json.dumps({'errors': errs[:5], 'saves': saves,
  'setup_has': [w in out['setup'] for w in ['Start of Care · step 4 of 9', 'Agreement Pending', 'Proposed start', 'Confirmed first visit', 'Actual first visit', 'office still needs to countersign', 'No care tasks in AxisCare yet', 'Done so far (3 of 9)']],
  'tick_saved': 'krystal' in out['after_tick'].lower(),
  'outcome_has': [w in out['outcome'] for w in ['Ready to Start', 'Needs Follow-Up', 'Family Not Ready', 'Cannot Accept']],
  'start_has': [w in out['axis'] for w in ['step 7 of 9', '2 of 6 visits still have no caregiver', 'Oct 26']]}, indent=1))

"""In Training is onboarding (Samantha, 2026-10-22). The Hub's Caregivers page, offline, made-up people: AxisCare calls
In Training "active", but the page lists them under Onboarding (In Training), never as active caregivers, and a profile says
they can't be asked for open shifts yet. Nothing is sent and nothing real changes.
(python3 tests/browser/in_training_look.py [port], with the static server on 8901 by default)"""
import sys
from playwright.sync_api import sync_playwright
PORT = sys.argv[1] if len(sys.argv) > 1 else '8901'
SHOT = sys.argv[2] if len(sys.argv) > 2 else ''
H = open('/Users/samantha/Claude/Projects/cc-hub-live/.claude/g1a_harness.js').read()
def router(route):
    u = route.request.url
    if 'supabase.co' in u: return route.abort()
    return route.continue_()
R = []
def ok(n, c, d=''): R.append(('PASS' if c else 'FAIL', n, '' if c else str(d)[:600]))
with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []
    pg = b.new_page(viewport={'width': 1300, 'height': 900}); pg.on('pageerror', lambda e: errs.append(str(e)[:200])); pg.route('**/*', router)
    pg.goto(f'http://localhost:{PORT}/index.html?proof=intraining'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', H)
    r = pg.evaluate(r"""async()=>{
      const sleep=ms=>new Promise(r=>setTimeout(r,ms)), out={};
      document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; await sleep(600);
      (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha Troutman' };");
      CGD.census={ caregivers:[
        { id:'1', first:'Joyce', last:'Kim (fake)', active:true, status_label:'Active', mobile:'4175550101', hire_date:'2023-04-01' },
        { id:'2', first:'Taylor', last:'New (fake)', active:true, status_label:'In Training', mobile:'4175550102', hire_date:'2026-10-20' },
        { id:'3', first:'Pat', last:'Long (fake)', active:true, status_label:'Active', mobile:'4175550103', hire_date:'2021-06-01' },
        { id:'4', first:'Gone', last:'Away (fake)', active:false, status_label:'Terminated', mobile:'', hire_date:'2018-01-01' } ] }; CGD.at=Date.now();
      DATA.caregivers=[{ first:'Taylor', last:'New (fake)', axiscare_id:'2', phone:'4175550102', active:true },
                       { first:'Joyce', last:'Kim (fake)', axiscare_id:'1', phone:'4175550101', active:true }];
      switchTab('cgdir'); await sleep(300);
      out.count=document.getElementById('cgdCount').innerText;
      out.active=document.getElementById('cgdList').innerText;
      out.pill=!!document.querySelector('[data-cf="training"]');
      cgdFilter('training', document.querySelector('[data-cf="training"]')); await sleep(200);
      out.training=document.getElementById('cgdList').innerText;
      cgdFilter('inactive', document.querySelector('[data-cf="inactive"]')); await sleep(200);
      out.inactive=document.getElementById('cgdList').innerText;
      cgdFilter('active', document.querySelector('[data-cf="active"]')); await sleep(200);
      cgdFilter('training', document.querySelector('[data-cf="training"]')); await sleep(200);
      return out; }""")
    if SHOT: pg.screenshot(path=SHOT.replace('.png', '-list.png'), full_page=False)
    ok('the count: active caregivers leave out In Training, which is counted as onboarding', r['count'].startswith('2 active caregivers · 1 onboarding (In Training)'), r['count'])
    ok('the Active view lists Joyce and Pat, not Taylor', 'Joyce Kim' in r['active'] and 'Pat Long' in r['active'] and 'Taylor' not in r['active'], r['active'])
    ok('there is an Onboarding (In Training) view', r['pill'])
    ok('the Onboarding view lists Taylor with the In Training chip, and only her', 'Taylor New' in r['training'] and 'In Training · onboarding' in r['training'] and 'Joyce' not in r['training'] and 'Gone' not in r['training'], r['training'])
    ok('Inactive is unchanged (only the person who left)', 'Gone Away' in r['inactive'] and 'Taylor' not in r['inactive'], r['inactive'])
    p = pg.evaluate(r"""async()=>{ const sleep=ms=>new Promise(r=>setTimeout(r,ms)); cgdOpenProfile('2'); await sleep(700);
      const t=document.body.innerText; return { t, chip: t.includes('In Training · onboarding'), ask: (t.split('Can be asked for open shifts')[1]||'').slice(0,140) }; }""")
    if SHOT: pg.screenshot(path=SHOT.replace('.png', '-profile.png'), full_page=False)
    ok('Taylor\'s profile shows In Training · onboarding, not Active', p['chip'], p['t'][:400])
    # the "Can be asked for open shifts" line lives in the PRN pay-track box (PRN hires only), so it is checked in the code
    src = open('index.html', encoding='utf-8').read()
    ok('PRN box: "Can be asked for open shifts" says not yet for In Training, and why, before the roster check',
       "kv('Can be asked for open shifts', cgdTraining(c) ? '<b style=\"color:#B45309;\">not yet</b> <span class=\"field-note\">(In Training in AxisCare: onboarding until their orientation is done)</span>'\n              : (DATA.caregivers||[]).some(" in src)
    ok('no em dashes in the new words', '—' not in r['training'] + r['count'])
    pg.close(); b.close()
R.append(('PASS' if not errs else 'FAIL', 'no page errors', errs[:3]))
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(x[0] == 'PASS' for x in R), '/', len(R))
sys.exit(0 if all(x[0] == 'PASS' for x in R) else 1)

"""Caregiver Matching (Start of Care stage C) in a real browser, offline, with TEST data: python3 tests/browser/caregiver_matching_look.py <hub folder> <port> <screenshot folder> (static server on that port)."""
import re, sys, json
from playwright.sync_api import sync_playwright
HUB, PORT, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
src = open(HUB + '/tests/browser/standup_look.py').read()
STUB = re.search(r'STUB = r"""(.*?)"""', src, re.S).group(1)
res = {}
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1300, 'height': 1200})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script(STUB)
    pg.goto(f'http://localhost:{PORT}/index.html?proof=cm'); pg.wait_for_timeout(1500)
    res['menu'] = pg.evaluate("""() => { const sch = document.getElementById('fsub-scheduling'), cl = document.getElementById('fsub-clients');
      return { inScheduling: !!(sch && sch.querySelector('[data-tab="teambuilder"]')), label: sch && sch.querySelector('[data-tab="teambuilder"]') ? sch.querySelector('[data-tab="teambuilder"]').textContent.trim() : '',
        notInClients: !(cl && cl.querySelector('[data-tab="teambuilder"]')), order: sch ? [...sch.querySelectorAll('.fpill')].map(e => e.getAttribute('data-tab')).slice(0, 4) : [] }; }""")
    res['setup'] = pg.evaluate("""() => {
      document.getElementById('appScreen').style.display = 'block';
      DATA.ops_settings = Object.assign({}, DATA.ops_settings || {}, { cm_checks_live:true, client_journey_live:true });
      const old = new Date(Date.now() - 20 * 864e5).toISOString();
      DATA.staffing_plans = [
        { id:'tbA', client:'Margaret Ellis (TEST)', city:'Republic', days:['mon','wed'], slots:[{ k:'s1', label:'Morning', start:'08:00', end:'12:00' }], cells:{ 'wed|s1':{ name:'Denise K', cg_ax_id:'8', status:'yes', at:old, yes_at:old } }, status:'building', shortlist:[] },
        { id:'tbB', client:'Harold Briggs (TEST)', city:'Nixa', days:['mon'], slots:[{ k:'s1', label:'Late morning', start:'10:00', end:'14:00' }], cells:{ 'mon|s1':{ name:'Maria V', cg_ax_id:'9', status:'yes', at:new Date().toISOString() } }, status:'building' } ];
      TB.pool = [ { name:'Maria V', axiscare_id:'9', city:'Republic', visits:[], level:2 }, { name:'Hannah P', axiscare_id:'7', city:'Ozark', visits:[], level:2 } ];
      TB.journeys = []; TB.links = {};
      switchTab('teambuilder'); tbOpen('tbA'); return document.querySelector('.cm-top') ? 'board' : 'no panel'; }""")
    pg.wait_for_timeout(400)
    res['panel'] = pg.evaluate("() => document.querySelector('.cm-top') && document.querySelector('.cm-top').innerText")
    pg.evaluate("() => { tbCell('mon|s1'); }"); pg.wait_for_timeout(300)
    res['pool'] = pg.evaluate("() => document.getElementById('tbPoolList') && document.getElementById('tbPoolList').innerText")
    pg.screenshot(path=f'{OUT}/cm_board.png', full_page=False)
    # shortlist Maria (pool index 0), set preference
    pg.evaluate("() => cmShortAdd(0)"); pg.wait_for_timeout(300)
    pg.evaluate("() => cmPref('s0')"); pg.wait_for_timeout(300)
    res['short'] = pg.evaluate("() => ({ list:(tbPlan().shortlist||[]).map(x=>x.name), pref:tbPlan().family_pref && tbPlan().family_pref.name })")
    # pencil Maria into Mon 8-12 (overlaps her yes for Harold 10-14), then try yes
    pg.evaluate("() => tb2AddPool('mon|s1', 0)"); pg.wait_for_timeout(300)
    toasts = []
    pg.expose_function('pyToast', lambda t: toasts.append(t))
    pg.evaluate("() => { const o = window.ccToast; window.ccToast = (t) => { window.pyToast(String(t)); if(o) o(t); }; }")
    pg.evaluate("() => tb2Answer('mon|s1', 'main', 'yes')"); pg.wait_for_timeout(400)
    res['blocked'] = { 'status': pg.evaluate("() => tbPlan().cells['mon|s1'].status"), 'toast': toasts[-1] if toasts else '' }
    # Hannah gets the yes instead: snapshot recorded
    pg.evaluate("() => { tbPlan().cells['mon|s1'] = { name:'Hannah P', cg_ax_id:'7', status:'penciled', at:new Date().toISOString() }; }")
    pg.evaluate("() => tb2Answer('mon|s1', 'main', 'yes')"); pg.wait_for_timeout(400)
    res['yes'] = pg.evaluate("() => { const c = tbPlan().cells['mon|s1']; return { status:c.status, snap:!!c.yes_snap, start:c.yes_snap && c.yes_snap.start }; }")
    res['recheck_before'] = pg.evaluate("() => document.querySelector('.cm-top').innerText.includes('Recheck needed')")
    res['count_before'] = pg.evaluate("() => (document.getElementById('tbRoot').innerText.match(/(\d+)\/(\d+) confirmed/)||[])[0]")
    pg.locator('#tbRoot').screenshot(path=f'{OUT}/cm_recheck.png')
    pg.evaluate("() => cmStillYes('wed|s1')"); pg.wait_for_timeout(400)
    res['count_after'] = pg.evaluate("() => (document.getElementById('tbRoot').innerText.match(/(\d+)\/(\d+) confirmed/)||[])[0]")
    res['recheck_after'] = pg.evaluate("() => ({ panel:document.querySelector('.cm-top').innerText.includes('Recheck needed'), history:(tbPlan().cells['wed|s1'].yes_history||[]).length })")
    # Find Caregivers from a lead profile
    res['find'] = pg.evaluate("""async () => { window.CP = window.CP || {}; CP.lead = { id:'T5', is_test:true, client_first_name:'June', client_last_name:'Pratt (TEST)', client_city:'Ozark', schedule_days:['Tue','Thu'], times_needed:'9am-1pm', level_estimate:2 }; CP.ax = '';
      sb.from = ((of) => function(t){ if(t === 'episode_source'){ const q = { select(){ return q; }, eq(){ return q; }, limit(){ return Promise.resolve({ data:[], error:null }); } }; return q; } return of.apply(this, arguments); })(sb.from);
      window.cpRenderTeam = async () => {}; await cmFindCaregivers(null);
      const pl = cmPlanFor({ lead:CP.lead }); return pl ? { client:pl.client, days:pl.days, slot:pl.slots[0], lead_id:pl.lead_id, city:pl.city, level:pl.level } : null; }""")
    res['errors'] = errs[:5]
    b.close()
print(json.dumps(res, indent=1))

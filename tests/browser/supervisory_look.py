"""Supervisory visits from 2026-11-16 (her decision 2026-10-18, plan https://claude.ai/artifact/SKN4aUYo3qqimPkUqczazm):
concern-only, a short note, never due or overdue; before that day the yearly evaluation works exactly as today. The real
page, offline, made-up people: saves are recorded, not sent, and nobody is texted or emailed. Runs twice, with the page
clock pinned to Nov 10 and to Nov 20, 2026, 10am Chicago (clock_pin.py).
(HUB_ROOT=<folder> PORT=<port> python3 tests/browser/supervisory_look.py [shot dir], with a static server on that folder)"""
import os, sys
from playwright.sync_api import sync_playwright

PORT = os.environ.get('PORT', '8765')
SHOTS = sys.argv[1] if len(sys.argv) > 1 else '/tmp'

STUB = r"""
(()=>{
  const W=window; W.__log={ persisted:[], puts:[], alerts:[] };
  (0,eval)(`sb={ from:(t)=>{ const p={ select(){return p;}, eq(){return p;}, gte(){return p;}, in(){return p;}, not(){return p;}, order(){return p;}, limit(){return p;},
      maybeSingle:async()=>({data: t==='app_data' ? {data: JSON.parse(JSON.stringify(DATA.caregivers))} : null, error:null}),
      then(a,b){ return Promise.resolve({data:[], error:null}).then(a,b); } }; return p; },
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async()=>({data:null,error:null}) }, storage:{ from:()=>({}) },
    auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}), getUser:async()=>({data:{user:null}}) } };
    ME={ email:'kay@mo-care.com', name:'Kay Tester', shift:'manager' };`);
  W.persist=async(k,i)=>{ W.__log.persisted.push([k, JSON.parse(JSON.stringify(i))]); };
  W.ccCaregiverPut=async(cg)=>{ W.__log.puts.push(JSON.parse(JSON.stringify(cg))); };
  W.alert=m=>{ W.__log.alerts.push(String(m)); };
  DATA.caregivers=[ { first:'Ann', last:'Able', axiscare_id:'501', supv_date:'2025-01-05', supv_proof:'https://drive/old' },
                    { first:'Bea', last:'Brook', axiscare_id:'502' } ];
  DATA.supervisory_visits=[
    { id:'sv_old', caregiver_name:'Ann Able', axiscare_caregiver_id:'501', client_name:'Mae Client', visit_date:'2025-01-05',
      coordinator:'Kay', due_date:'2026-01-05', checklist_responses:{ punctuality:true }, performance_rating:'Meets Expectations',
      proof_link:'https://drive/old', status:'Completed', created_at:'2025-01-05T15:00:00Z' } ];
  DATA.leads=DATA.leads||[]; DATA.client_checkins=DATA.client_checkins||[];
})();
"""

T = r"""
async(mode)=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, $=s=>document.querySelector(s), vis=el=>!!el && el.offsetParent!==null;
  document.getElementById('signinScreen').style.display='none'; document.getElementById('appScreen').classList.add('on');
  const after = mode==='after';
  ok('the switch reads the date', svConcernOnly()===after, svConcernOnly());
  switchTab('supervisory'); await sleep(150);
  const guide=[...document.querySelectorAll('#tab-supervisory .guide-body')].filter(vis);
  const pills=[...document.querySelectorAll('#supervisoryFilters .pill, #supervisoryFilters button, #supervisoryFilters [onclick]')].map(p=>p.textContent.trim());
  const tbl=$('#supervisoryTableWrap').innerText;
  /* the guide is inside a closed <details>; open it to read what shows */
  $('#tab-supervisory details.guide').open=true; await sleep(30);
  const shown=[...document.querySelectorAll('#tab-supervisory .guide-body')].filter(vis).map(e=>e.innerText).join(' ');
  if(after){
    ok('help text: only when there is a concern', /only when there's a concern/.test(shown) && !/at least once a year/.test(shown), shown.slice(0,200));
    ok('filters: All, This Month, This Year', pills.join('|')==='All|This Month|This Year', pills);
    ok('the old visit is listed as a yearly evaluation, nothing overdue', /Yearly evaluation \(before Nov 16\)/.test(tbl) && !/Overdue/i.test(tbl), tbl);
    /* care dashboard: no overdue tile, no overdue rows */
    const s=careStats(); ok('care stats: no supervisory overdue', s.svOver.length===0, s.svOver.length);
    const kp=document.createElement('div'); kp.id='careKpis'; document.body.appendChild(kp); renderCareKpis();
    ok('care tiles: no Supervisory Visits Overdue', !/Supervisory/.test(kp.innerText), kp.innerText); kp.remove();
    /* the old record opens read-only */
    openSupervisoryModal('sv_old'); await sleep(50);
    ok('old record: old form, read-only, no Save', $('#supervisoryModalBackdrop').classList.contains('open') && $('#sv_caregiver_name').disabled && $('#sv_save_btn').hidden && vis($('#sv_readonly_note')), [$('#sv_caregiver_name').disabled, $('#sv_save_btn').hidden]);
    ok('old record: kept exactly (rating shown)', $('#sv_performance_rating').value==='Meets Expectations' && $('#sv_proof_link').value==='https://drive/old');
    const n0=L.persisted.length; await saveSupervisoryVisit(); ok('old record: saving does nothing', L.persisted.length===n0);
    closeModal('supervisoryModalBackdrop');
    /* the new note */
    openSupervisoryModal(); await sleep(50);
    ok('+ Log opens the short note', $('#svNoteModalBackdrop').classList.contains('open') && !$('#supervisoryModalBackdrop').classList.contains('open'));
    const noteTxt=$('#svNoteModalBackdrop').innerText;
    ok('note has the five boxes and the pick, no rating, no form link, no due date', ['Caregiver','Client','Visit date','What prompted the visit','What went well','Anything to coach',"Client or family's view"].every(w=>noteTxt.includes(w)) && !/Rating|Proof|Due/i.test(noteTxt), noteTxt);
    ok('the four picks', [...$('#svn_prompted').options].map(o=>o.text).slice(1).join('|')==='Family complaint about the caregiver|Red shift-note flag|Concern from a Care Match call|Other');
    ok('no em dash in the note', !/—/.test($('#svNoteModalBackdrop').innerHTML));
    await saveSupervisoryNote();
    ok('missing answers are said, nothing saved', /Add the caregiver, the client, what prompted it first\./.test($('#svn_msg').textContent) && !L.persisted.some(p=>p[1].kind==='concern_note'), $('#svn_msg').textContent);
    $('#svn_caregiver').value='502|Bea Brook'; $('#svn_client').value='Joe Client'; $('#svn_date').value='2026-11-19';
    $('#svn_prompted').value='Red shift-note flag'; $('#svn_went_well').value='Kind with Joe.'; $('#svn_coach').value='Log the meal.'; $('#svn_view').value='Daughter happy.';
    await saveSupervisoryNote(); await sleep(50);
    const rec=(L.persisted.find(p=>p[0]==='supervisory_visits'&&p[1].kind==='concern_note')||[])[1]||{};
    ok('note saved with the answers', rec.caregiver_name==='Bea Brook' && rec.axiscare_caregiver_id==='502' && rec.client_name==='Joe Client' && rec.visit_date==='2026-11-19' && rec.prompted_by==='Red shift-note flag' && rec.went_well==='Kind with Joe.' && rec.coaching==='Log the meal.' && rec.client_view==='Daughter happy.', rec);
    ok('note: no score, checklist, form link or due date', !('performance_rating' in rec) && !('checklist_responses' in rec) && !('proof_link' in rec) && !('due_date' in rec), Object.keys(rec));
    ok('note: who logged it, from the login', rec.logged_by==='kay@mo-care.com' && rec.logged_by_name==='Kay Tester', rec);
    const put=L.puts.find(c=>c.axiscare_id==='502')||{};
    ok("caregiver's last visit date updated, proof untouched", put.supv_date==='2026-11-19' && !('supv_proof' in put), put);
    ok('the old record is untouched', JSON.stringify(DATA.supervisory_visits.find(v=>v.id==='sv_old').checklist_responses)==='{"punctuality":true}');
    ok('modal closed, the note listed first with what prompted it', !$('#svNoteModalBackdrop').classList.contains('open') && /Red shift-note flag/.test($('#supervisoryTableWrap tbody tr').innerText), $('#supervisoryTableWrap').innerText);
    /* reopen the note to edit */
    openSupervisoryModal(rec.id); await sleep(50);
    ok('a note reopens as the note, filled in', $('#svNoteModalBackdrop').classList.contains('open') && $('#svn_went_well').value==='Kind with Joe.' && $('#svn_caregiver').value==='502|Bea Brook');
    closeModal('svNoteModalBackdrop');
    $('#svn_date').value='2026-12-30';
    /* the other places */
    ok('settings: due soon window hidden', !vis($('#set_supervisory_window')) );
    ok('Active Compliance header: when there is a concern', /when there's a concern/.test(document.querySelector('#panel-compliance thead').textContent.replace(/\s+/g,' ')) );
  } else {
    ok('help text: yearly, as today', /at least once a year/.test(shown) && !/only when there's a concern/.test(shown), shown.slice(0,200));
    ok('filters: Due Soon and Overdue, as today', pills.includes('Due Soon') && pills.includes('Overdue'), pills);
    const s=careStats(); ok('care stats: the old visit is overdue, as today', s.svOver.length===1, s.svOver.length);
    openSupervisoryModal(); await sleep(50);
    ok('+ Log opens the yearly form, editable', $('#supervisoryModalBackdrop').classList.contains('open') && !$('#sv_caregiver_name').disabled && !$('#sv_save_btn').hidden && !$('#svNoteModalBackdrop').classList.contains('open'));
    ok('yearly form: due date a year out', $('#sv_due_date').value==='2027-11-10', $('#sv_due_date').value);
    closeModal('supervisoryModalBackdrop');
    ok('settings: due soon window still there', !!$('#set_supervisory_window'));
  }
  return R;
}
"""

R = []
with sync_playwright() as pw:
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from clock_pin import pin
    b = pw.chromium.launch()
    for mode, when in (('before', '2026-11-10T10:00:00-06:00'), ('after', '2026-11-20T10:00:00-06:00')):
        for name, size in (('desktop', {'width': 1360, 'height': 900}), ('phone', {'width': 390, 'height': 844})):
            pg = b.new_page(viewport=size)
            pin(pg, when)
            pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
            errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
            pg.goto('http://localhost:' + PORT + '/index.html?proof=supv-' + mode); pg.wait_for_timeout(1200)
            pg.evaluate('s=>(0,eval)(s)', STUB)
            out = pg.evaluate(T, mode)
            if name == 'desktop':
                pg.evaluate("switchTab('supervisory'); document.querySelector('#tab-supervisory details.guide').open=true"); pg.wait_for_timeout(150)
                pg.screenshot(path=os.path.join(SHOTS, 'supervisory-' + mode + '.png'))
                if mode == 'after':
                    pg.evaluate("openSupervisoryModal()"); pg.wait_for_timeout(100)
                    pg.screenshot(path=os.path.join(SHOTS, 'supervisory-note.png'))
            out = [[s_, mode + '/' + name + ': ' + n, d] for s_, n, d in out]
            out.append(['PASS' if not errs else 'FAIL', mode + '/' + name + ': no page errors', errs[:3]])
            R += out; pg.close()
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

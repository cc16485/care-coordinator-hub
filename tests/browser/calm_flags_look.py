"""Calmer shift-note flags (2026-10-30, plan VGeWn63w7ue8WE7GS4ogJ6, her approval with all three recommendations): a combined
card lists its notes newest first; "Normal for Patsy" (Client Care owner or an owner, switch on, never for a fall) saves
what is usual for the client and closes the card; the profile lists the marks with Remove; a card the cleanup closed as
quiet for a week can be reopened. The real Hub page served from THIS folder, offline, made-up people and notes; every
save lands in an in-memory copy. Nothing is texted or emailed. (python3 tests/browser/calm_flags_look.py)"""
import re, os, sys, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
src = open(ROOT / 'tests/browser/standup_look.py').read()
STUB = re.search(r'STUB = r"""(.*?)"""', src, re.S).group(1)
DATA = r"""
(()=>{
  const now=Date.now(), I=h=>new Date(now+h*36e5).toISOString();
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Land', shift:'day' };");
  window.__me={ email:'krystal@mo-care.com', name:'Krystal Land' };
  (0,eval)("OPS_DOMAINS=[{ code:'client_care', label:'Client Care', owner_person:'p_k', entity:'cc_ihs' },{ code:'incidents', label:'Incidents', owner_person:'p_s', entity:'cc_ihs' }]; OPS_PEOPLE=[{ person_id:'p_k', full_name:'Krystal Land', primary_email:'krystal@mo-care.com' },{ person_id:'p_s', full_name:'Sam Owner', primary_email:'sam@mo-care.com' },{ person_id:'p_a', full_name:'Angiel Test', primary_email:'angiel@mo-care.com' }];");
  const items=[
    { id:'ops_carenote_patsy', kind:'care_note', status:'open', level:'yellow', flag_kind:'eating or drinking', why:'Patsy ate very little again.', client_ax:'602', about:'Patsy Lane (fake)',
      title:'Yellow flag: Patsy, eating or drinking: 3 notes since Oct 4', owner:'krystal@mo-care.com', owner_name:'Krystal Land', urgency:'normal', created_at:I(-30), due:I(5), caregiver:'Di Aide',
      notes:[ { key:'v3', at:I(-2), day:'Tue, Oct 6', caregiver:'Di Aide', words:'Only ate a few bites of lunch again.', trigger:'a few bites of lunch', level:'yellow' },
              { key:'v2', at:I(-26), day:'Mon, Oct 5', caregiver:'Bo Aide', words:'Skipped breakfast, had a little soup.', level:'yellow' },
              { key:'v1', at:I(-50), day:'Sun, Oct 4', caregiver:'Al Aide', words:'Patsy skipped breakfast.', level:'yellow' } ],
      detail:'combined' },
    { id:'ops_carenote_fall', kind:'care_note', status:'open', level:'red', flag_kind:'a fall or injury', why:'Ruth slipped.', client_ax:'601', about:'Ruth Barnes (fake)', title:"Red flag: Ruth's Mon, Oct 5 visit, a fall or injury",
      owner:'krystal@mo-care.com', urgency:'urgent', created_at:I(-2), due:I(2), detail:'Kim wrote after the visit:\n\n"Ruth slipped."\n\nWhy' },
    { id:'ops_carenote_quiet', kind:'care_note', status:'done', resolution_code:'quiet_week', level:'yellow', flag_kind:'mood', why:'Patsy was grumpy.', client_ax:'602', about:'Patsy Lane (fake)', visit_day:'Thu, Oct 1',
      close_note:'Quiet for a week', closed_at:I(-1), created_at:I(-24*9) } ];
  DATA.ops_items=JSON.parse(JSON.stringify(items)); window.__store.ops_items=JSON.parse(JSON.stringify(items));
  DATA.client_flag_normals=[]; window.__store.client_flag_normals=[];
  DATA.coordinator_staff=[{ email:'krystal@mo-care.com', name:'Krystal Land' },{ email:'sam@mo-care.com', name:'Sam Owner' },{ email:'angiel@mo-care.com', name:'Angiel Test' }];
  DATA.ops_settings=Object.assign({}, DATA.ops_settings||{}, { care_notes_levels_live:true });
  window.n3Open=()=>{};
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  const it=id=>DATA.ops_items.find(x=>x.id===id);
  const draw=id=>{ const d=document.createElement('div'); d.className='__t'; d.innerHTML=cnBlock(it(id))+cnActions(it(id)); document.body.appendChild(d); return d; };
  const clear=()=>document.querySelectorAll('.__t').forEach(x=>x.remove());

  /* switch off */
  let c=draw('ops_carenote_patsy');
  ok('a combined card lists its notes, newest first, with the count', /3 notes on this card, newest first/.test(c.innerText) && c.querySelectorAll('.cn-note').length===3 && c.querySelectorAll('.cn-note')[0].innerText.includes('Tue, Oct 6') && c.querySelector('.cn-hl') && c.querySelector('.cn-hl').textContent==='a few bites of lunch', c.innerText.slice(0,600));
  ok('switch off: no Normal for Patsy button', !/Normal for Patsy/.test(c.innerText)); clear();

  /* switch on */
  DATA.ops_settings.calm_flags_live=true;
  c=draw('ops_carenote_patsy');
  ok('on: Krystal (Client Care owner) sees Normal for Patsy', /Normal for Patsy/.test(c.innerText), c.innerText.slice(-300)); clear();
  c=draw('ops_carenote_fall');
  ok('on: never for a fall or injury', !/Normal for/.test(c.innerText)); clear();
  (0,eval)("ME={ email:'angiel@mo-care.com', name:'Angiel Test', shift:'day' };"); window.__me={ email:'angiel@mo-care.com', name:'Angiel Test' };
  c=draw('ops_carenote_patsy');
  ok('on: someone who is not the Client Care owner or an owner does not see it (decision 2)', !/Normal for Patsy/.test(c.innerText)); clear();
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Land', shift:'day' };"); window.__me={ email:'krystal@mo-care.com', name:'Krystal Land' };

  c=draw('ops_carenote_patsy');
  cnNormalOpen('ops_carenote_patsy'); await sleep(50);
  ok('Normal for Patsy asks for one line and explains what it does', /What is usual for Patsy about eating or drinking\?/.test(c.innerText) && /make no card unless they say it is worse or different/.test(c.innerText));
  await cnNormalSave('ops_carenote_patsy', null); await sleep(50);
  ok('...an empty line is not saved', it('ops_carenote_patsy').status==='open' && !DATA.client_flag_normals.length);
  document.getElementById('cnNormTxt_ops_carenote_patsy').value='Patsy eats very little; usual for her';
  await cnNormalSave('ops_carenote_patsy', null); await sleep(100);
  const n=DATA.client_flag_normals[0], p=it('ops_carenote_patsy');
  ok('...saves the mark for the client and topic, with who and when', n && n.client_ax==='602' && n.kind==='eating or drinking' && n.note==='Patsy eats very little; usual for her' && n.by==='Krystal Land' && !!n.at && window.__store.client_flag_normals.some(x=>x.id===n.id), n);
  ok('...and closes the card, saying why', p.status==='done' && p.outcome[0]==='normal' && /Marked as usual for Patsy by Krystal: Patsy eats very little/.test(p.close_note), p.close_note); clear();

  /* the profile */
  let prof=document.createElement('div'); prof.className='__t'; prof.innerHTML=cnProfileFlags('602'); document.body.appendChild(prof);
  ok('profile: Usual for this client lists the mark with who set it, and Remove', /Usual for this client/.test(prof.innerText) && /eating or drinking/.test(prof.innerText) && /Patsy eats very little/.test(prof.innerText) && /Krystal/.test(prof.innerText) && [...prof.querySelectorAll('button')].some(b=>b.textContent==='Remove'), prof.innerText.slice(0,500));
  ok('profile: the flag closed as quiet for a week says so and has Reopen', /quiet for a week/.test(prof.innerText) && [...prof.querySelectorAll('button')].some(b=>b.textContent==='Reopen'));
  await cnReopen('ops_carenote_quiet'); await sleep(80);
  const q=it('ops_carenote_quiet');
  ok('Reopen: open again, the close fields gone, saved', q.status==='open' && !q.resolution_code && !q.closed_at && window.__store.ops_items.some(x=>x.id==='ops_carenote_quiet' && x.status==='open'), q);
  await cnNormalRemove(n.id); await sleep(80);
  ok('Remove: the mark is kept with who removed it, and is no longer in force', !!DATA.client_flag_normals[0].removed_at && DATA.client_flag_normals[0].removed_by==='Krystal Land');
  clear(); prof=document.createElement('div'); prof.className='__t'; prof.innerHTML=cnProfileFlags('602'); document.body.appendChild(prof);
  ok('...and leaves the profile list', !/Usual for this client/.test(prof.innerText)); clear();
  ok('nothing was texted or emailed', window.__log.fn.length===0, JSON.stringify(window.__log.fn));
  return R;
}
"""
MIME = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.json':'application/json', '.webmanifest':'application/json'}
def serve(route):
    url = route.request.url
    if 'supabase.co' in url: return route.abort()
    if not url.startswith('http://calmflags.local/'): return route.continue_()
    p = (ROOT / url.split('http://calmflags.local/', 1)[1].split('?')[0].split('#')[0])
    if not p.is_file(): return route.fulfill(status=404, body='')
    route.fulfill(status=200, body=p.read_bytes(), content_type=MIME.get(p.suffix, 'application/octet-stream'))
with sync_playwright() as pw:
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from clock_pin import pin
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width':1300,'height':1000})
    pin(pg)
    pg.route('**/*', serve)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://calmflags.local/index.html?proof=calmflags'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB); pg.evaluate('s=>(0,eval)(s)', DATA)
    R = pg.evaluate(T)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

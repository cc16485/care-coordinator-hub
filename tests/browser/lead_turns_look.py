"""Lead turns (Care Coordinator Leads and Bonus, Stage 1, policy approved by Samantha 2026-10-18): the lead form gives a new
lead to whoever is next up, asked-for-by-name uses that person's turn, only an owner can change a lead's owner (with a
reason), Take it on an inquiry card is helping, the board shows who is next up, and with the switch OFF everything is as
before. The real page, offline, made-up people only; saves are recorded, never sent.
(python3 tests/browser/lead_turns_look.py; serves this checkout itself, no server needed)"""
import os, mimetypes
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
STUB = r"""
(()=>{
  const W=window; W.__log={ writes:[], alerts:[], toasts:[] };
  const clone=x=>JSON.parse(JSON.stringify(x));
  (0,eval)(`sb={ from:()=>{ const p={ select(){return p;}, eq(){return p;}, in(){return p;}, not(){return p;}, order(){return p;}, limit(){return p;},
      maybeSingle:async()=>({data:null,error:null}), then(a){ return Promise.resolve({data:[],error:null}).then(a); } }; return p; },
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async()=>({data:null,error:null}) },
    auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };`);
  W.persist=async(k,v)=>{ W.__log.writes.push({ k, v:clone(v) }); };
  W.ckCheckNewInquiry=async()=>({proceed:true, note:''});
  W.jcLoadConn=async()=>null; W.renderLeads=()=>{}; W.renderFollowUpQueue=()=>{}; W.cjAutoOpen=()=>{};
  W.ccToast=m=>W.__log.toasts.push(m); W.alert=m=>W.__log.alerts.push(m); W.myWorkRefresh=()=>{}; W.opEvent=()=>{};
  W.ccPrompt=async()=>'the family asked for Angiel'; W.ccConfirm=async()=>true;
  (0,eval)(`ME={ email:'kry@mo-care.com', name:'Krystal Land', shift:'day' }; CC_ROLE_BY_EMAIL={ 'sam@mo-care.com':['owner_admin'], 'kry@mo-care.com':['care_coordinator'] };`);
  DATA.coordinator_staff=[{ email:'kry@mo-care.com', name:'Krystal Land' }, { email:'ang@mo-care.com', name:'Angiel Rose' }, { email:'sam@mo-care.com', name:'Samantha T' }];
  DATA.ops_settings={ lead_rotation_live:true, lead_rotation:{ people:[{ name:'Krystal', on:true }, { name:'Angiel', on:true }] } };
  DATA.leads=[{ id:'k1', first_name:'Kay', last_name:'One', status:'Contacted', assigned_coordinator:'Krystal', created_at:'2026-10-18T14:00:00Z', first_human_attempt_at:'2026-10-18T14:05:00Z',
    owner_turn:{ to:'Krystal', how:'turn', at:'2026-10-18T14:00:00Z', seq:1 }, original_owner:{ name:'Krystal', at:'2026-10-18T14:00:00Z', how:'turn' } }];
  DATA.referral_orgs=[]; DATA.care_assessments=[]; DATA.post_call_followups=[];
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, $=id=>document.getElementById(id), set=(id,x)=>{ $(id).value=x; };
  const lastLead=()=>{ const w=L.writes.filter(x=>x.k==='leads'); return w.length?w[w.length-1].v:null; };
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  const shown=el=>!!el&&el.style.display!=='none';
  const payPrivate=()=>{ const r=document.querySelector('input[name=lead_funding_source][value=private]'); if(r) r.checked=true; };

  /* ── a new lead while turns are on ── */
  openLeadModal(); await sleep(80);
  ok('new lead · the turn box shows instead of the owner text box', shown($('lead_turn_box'))&&!shown($('lead_assigned_coordinator')));
  ok('new lead · "Next up: Angiel" (Kay was Krystal’s turn)', $('lead_turn_how').options[0].textContent==='Next up: Angiel', $('lead_turn_how').options[0].textContent);
  set('lead_first_name','Diane'); set('lead_last_name','Teague'); payPrivate();
  await saveLead(); await sleep(120);
  const d=lastLead(); DATA.leads.find(x=>x.id===d.id)||DATA.leads.push(d);
  ok('saved · Diane is Angiel’s by turn, turn 2, original owner Angiel', d&&d.assigned_coordinator==='Angiel'&&d.owner_turn.how==='turn'&&d.owner_turn.seq===2&&d.original_owner.name==='Angiel', d&&{ a:d.assigned_coordinator, t:d.owner_turn, o:d.original_owner });
  ok('saved · the toast says whose lead it is', L.toasts.some(t=>/Angiel’s lead \(next up\)/.test(t)), L.toasts);

  /* ── asked for by name uses that person's turn ── */
  openLeadModal(); await sleep(60);
  set('lead_turn_how','asked'); leadTurnFormUI();
  ok('asked · the person list shows', shown($('lead_turn_who'))&&$('lead_turn_who').options.length===2);
  set('lead_turn_who','Angiel'); set('lead_first_name','Paul'); set('lead_last_name','Reyes'); payPrivate();
  await saveLead(); await sleep(120);
  const p=lastLead(); DATA.leads.find(x=>x.id===p.id)||DATA.leads.push(p);
  ok('asked · Paul is Angiel’s, marked asked for by name', p.assigned_coordinator==='Angiel'&&p.owner_turn.how==='asked'&&p.owner_turn.seq===3, p.owner_turn);
  openLeadModal(); await sleep(60);
  ok('asked · it used Angiel’s turn, so Krystal is next up', $('lead_turn_how').options[0].textContent==='Next up: Krystal', $('lead_turn_how').options[0].textContent);
  closeModal('leadModalBackdrop');

  /* ── audit step 6: returning clients apart ── */
  DATA.ops_settings.returning_apart_live=true;
  openLeadModal(); await sleep(60);
  set('lead_turn_how','returning'); leadTurnFormUI();
  ok('step 6 · returning, apart on: the form says it does not use a turn', /does not use a turn/.test(($('lead_turn_note')||{}).textContent||''), ($('lead_turn_note')||{}).textContent);
  set('lead_turn_who','Angiel'); set('lead_first_name','Rae'); set('lead_last_name','Back'); payPrivate();
  await saveLead(); await sleep(120);
  const rb=lastLead(); DATA.leads.find(x=>x.id===rb.id)||DATA.leads.push(rb);
  ok('step 6 · Rae (returning) is Angiel’s, stamped apart, and the toast says not a turn', rb.assigned_coordinator==='Angiel'&&rb.owner_turn.how==='returning'&&rb.owner_turn.apart===true&&L.toasts.some(t=>/returning client, not a turn/.test(t)), { t:rb.owner_turn, toasts:L.toasts.slice(-2) });
  openLeadModal(); await sleep(60);
  ok('step 6 · Krystal is still next up (Rae did not use Angiel’s turn)', $('lead_turn_how').options[0].textContent==='Next up: Krystal', $('lead_turn_how').options[0].textContent);
  closeModal('leadModalBackdrop');
  lhSetFill();
  ok('step 6 · settings: Apart, and Krystal (not an owner) sees no button', /Apart\./.test($('raSetNow').textContent)&&$('raToggleBtn').style.display==='none', $('raSetNow').textContent);
  DATA.ops_settings.returning_apart_live=false; lhSetFill();
  ok('step 6 · settings off: uses a turn (as today)', /Uses a turn\./.test($('raSetNow').textContent));

  /* ── an existing lead: only an owner can change who owns it ── */
  openLeadModal(d.id); await sleep(60);
  ok('existing · the owner box shows, read-only for Krystal (not an owner)', shown($('lead_assigned_coordinator'))&&$('lead_assigned_coordinator').readOnly===true&&/Only Samantha or Zachary/.test($('lead_owner_note').textContent));
  set('lead_assigned_coordinator','Krystal'); await saveLead(); await sleep(120);
  ok('existing · forcing a change as Krystal: refused, the owner stays Angiel', lastLead().assigned_coordinator==='Angiel'&&L.alerts.some(a=>/Only Samantha or Zachary/.test(a)), { a:lastLead().assigned_coordinator, alerts:L.alerts });
  (0,eval)(`ME={ email:'sam@mo-care.com', name:'Samantha T', shift:'day' }`);
  const dd=DATA.leads.find(x=>x.id===d.id); Object.assign(dd, lastLead());
  openLeadModal(d.id); await sleep(60);
  ok('existing · editable for Samantha, with the reason note', $('lead_assigned_coordinator').readOnly===false&&/asks for a reason/.test($('lead_owner_note').textContent));
  set('lead_assigned_coordinator','Krystal'); await saveLead(); await sleep(120);
  const c=lastLead();
  ok('existing · Samantha moves it with a reason: kept in history, not a turn, original owner still Angiel', c.assigned_coordinator==='Krystal'&&c.owner_changes&&c.owner_changes[0].why==='the family asked for Angiel'&&c.owner_turn.seq===2&&c.original_owner.name==='Angiel', { a:c.assigned_coordinator, ch:c.owner_changes, t:c.owner_turn, o:c.original_owner });
  Object.assign(dd, c);
  (0,eval)(`ME={ email:'kry@mo-care.com', name:'Krystal Land', shift:'day' }`);

  /* ── Take it on an inquiry card is helping ── */
  DATA.leads.push({ id:'h1', first_name:'Hal', last_name:'Ivey', status:'New', assigned_coordinator:'Angiel', created_at:'2026-10-18T15:00:00Z' });
  DATA.ops_items=[{ id:'ops_lead_h1', kind:'new_lead', source_id:'h1', status:'open', owner:'ang@mo-care.com', owner_name:'Angiel Rose', title:'New lead: Hal Ivey', about:'Hal Ivey', created_at:'2026-10-18T15:00:00Z' }];
  ok('card · Krystal sees "Angiel’s lead. Calling for Angiel? Introduce Angiel …"', /Angiel’s lead\. Calling for Angiel\? Introduce Angiel as their Care Coordinator\./.test(opsWhyHere(DATA.ops_items[0])), opsWhyHere(DATA.ops_items[0]));
  await opsTakeIt('ops_lead_h1'); await sleep(80);
  const it=DATA.ops_items[0], h=DATA.leads.find(x=>x.id==='h1');
  ok('take (on) · the card stays Angiel’s, Krystal is helping', it.owner==='ang@mo-care.com'&&it.help_from==='kry@mo-care.com'&&!!it.helping_since, it);
  ok('take (on) · Hal stays Angiel’s lead, Krystal recorded as the helper', h.assigned_coordinator==='Angiel'&&h.helpers&&h.helpers[0].name==='Krystal', h);
  ok('take (on) · Krystal now reads "You’re helping Angiel … Introduce Angiel"', /You’re helping Angiel\. It stays Angiel’s\. Calling for Angiel\?/.test(opsWhyHere(it)), opsWhyHere(it));

  /* ── the board and the settings card ── */
  renderLeadsStarts(); await sleep(150);
  ok('board · the "next up for a new lead" tile shows Krystal', /Krystal\s*next up for a new lead/.test(($('lbNumbers')||{}).textContent||''), ($('lbNumbers')||{}).textContent);
  lhSetFill();
  ok('settings · On, next up Krystal, and Krystal (not an owner) sees no switch', /On\./.test($('ltSetNow').textContent)&&/Next up: Krystal/.test($('ltSetNow').textContent)&&$('ltToggleBtn').style.display==='none', $('ltSetNow').textContent);

  /* ── switch OFF: everything as before ── */
  DATA.ops_settings.lead_rotation_live=false;
  openLeadModal(); await sleep(60);
  ok('off · the old owner box shows, no turn box', !shown($('lead_turn_box'))&&shown($('lead_assigned_coordinator')));
  set('lead_first_name','Olive'); set('lead_last_name','Sims'); payPrivate();
  await saveLead(); await sleep(120);
  const o=lastLead();
  ok('off · a new lead gets the payer default (Krystal), no turn recorded', o.assigned_coordinator==='Krystal'&&!o.owner_turn&&!o.original_owner, o);
  DATA.leads.push({ id:'h2', first_name:'Gus', last_name:'Hart', status:'New', assigned_coordinator:'Angiel', created_at:'2026-10-18T15:00:00Z' });
  DATA.ops_items=[{ id:'ops_lead_h2', kind:'new_lead', source_id:'h2', status:'open', owner:'ang@mo-care.com', owner_name:'Angiel Rose', title:'New lead: Gus Hart', about:'Gus Hart', created_at:'2026-10-18T15:00:00Z' }];
  ok('off · no intro line on the card', opsWhyHere(DATA.ops_items[0])==='', opsWhyHere(DATA.ops_items[0]));
  await opsTakeIt('ops_lead_h2'); await sleep(80);
  ok('off · Take it works as before: the card and Gus become Krystal’s', DATA.ops_items[0].owner==='kry@mo-care.com'&&DATA.leads.find(x=>x.id==='h2').assigned_coordinator==='Krystal', { it:DATA.ops_items[0].owner, l:DATA.leads.find(x=>x.id==='h2').assigned_coordinator });
  renderLeadsStarts(); await sleep(150);
  ok('off · no next-up tile on the board', !/next up for a new lead/.test(($('lbNumbers')||{}).textContent||''));
  return R;
}
"""
def serve(route):
    path = route.request.url.split('://', 1)[1].split('/', 1)[1].split('?')[0] or 'index.html'
    f = os.path.join(ROOT, path)
    if os.path.isfile(f):
        route.fulfill(path=f, content_type=mimetypes.guess_type(f)[0] or 'application/octet-stream')
    else:
        route.fulfill(status=404, body='')
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1360, 'height': 900})
    pg.route('**/*', lambda r: serve(r) if r.request.url.startswith('http://hub.test/') else (r.abort() if 'supabase.co' in r.request.url else r.continue_()))
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://hub.test/index.html?proof=turns'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    out = lambda n: os.path.join(os.path.dirname(__file__), n)
    pg.evaluate("()=>{ DATA.ops_settings.lead_rotation_live=true; openLeadModal(); }"); pg.wait_for_timeout(200)
    pg.locator('#lead_turn_box').locator('xpath=..').screenshot(path=out('lead_turns_form.png'))
    pg.evaluate("()=>{ closeModal('leadModalBackdrop'); (0,eval)(`ME={ email:'sam@mo-care.com', name:'Samantha T', shift:'day' }`); const s=document.querySelector('[data-set=leads]'); let p=s; while(p){ if(p.style) p.style.display=''; p.classList&&p.classList.add('active','on'); p=p.parentElement; } lhSetFill(); document.querySelectorAll('header, .topbar, .app-header, nav').forEach(h=>h.style.display='none'); document.getElementById('ltSetNow').scrollIntoView(); }"); pg.wait_for_timeout(200)
    box = pg.evaluate("()=>{ const a=document.getElementById('ltSetNow').previousElementSibling.previousElementSibling.getBoundingClientRect(), b=document.getElementById('ltSaved').getBoundingClientRect(); return {x:a.x-10,y:a.y-6,width:Math.max(a.width,700)+20,height:b.bottom-a.y+16}; }")
    pg.screenshot(path=out('lead_turns_settings.png'), clip=box)
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

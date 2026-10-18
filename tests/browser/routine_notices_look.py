"""SOP ruling 8 (Samantha 2026-10-17): routine notices go to the work area owner, then the Springfield lead, then
Samantha, and "owners see all work and who has it, don't keep any cards from me". Made-up data, offline: an owner opens
Needs Attention on Everyone grouped by who has each card, staff still open on Mine, an escalated check-in becomes a card
for the Client care owner and emails the owner and the lead, and an unsubscribe link names the lead. (Who assigns
referral partners is PR 490's, tests/partner-owner-assign-test.js.) (python3 tests/browser/routine_notices_look.py; it serves this folder itself)"""
import http.server, os, socketserver, threading, functools
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]);
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  const K='krystal@mo-care.com', S='samantha@mo-care.com', A='angiel@mo-care.com';
  (0,eval)(`ME={ email:'${S}', name:'Samantha Troutman', shift:'manager' };
    OPS_PEOPLE=[{ person_id:'p_k', full_name:'Krystal Land', primary_email:'${K}' },{ person_id:'p_s', full_name:'Samantha Troutman', primary_email:'${S}' },{ person_id:'p_a', full_name:'Angiel Test', primary_email:'${A}' }];
    OPS_DOMAINS=[{ code:'client_care', owner_person:'p_a' },{ code:'scheduling_coverage', owner_person:'p_k' }];
    CC_ROLE_BY_EMAIL={ '${S}':['owner_admin'], '${K}':['care_coordinator','springfield_lead'], '${A}':['care_coordinator'] };
    CC_ROLES=['owner_admin']; CC_ROLES_CHECKED=true; CC_ROLES_LOADED=true;`);
  window.persist=async()=>true; window.opEvent=()=>{};
  /* the lookup, same order as the server */
  ok('a routine notice goes to the work area owner', ccNoticeTo('client_care')===A, ccNoticeTo('client_care'));
  ok('...else the Springfield lead', ccNoticeTo('family_enquiries')===K && ccNoticeTo('')===K, ccNoticeTo(''));
  ok('an empty alert list falls back to the area owner and the lead, once each', JSON.stringify(ccFallbackList('client_care'))===JSON.stringify([A,K]) && JSON.stringify(ccFallbackList('scheduling_coverage'))===JSON.stringify([K]));
  (0,eval)(`CC_ROLE_BY_EMAIL={ '${S}':['owner_admin'] }; OPS_DOMAINS=[];`);
  ok('nobody owns it and there is no lead: Samantha', ccNoticeTo('client_care')===S && JSON.stringify(ccFallbackList('x'))===JSON.stringify([S]));
  (0,eval)(`CC_ROLE_BY_EMAIL={ '${S}':['owner_admin'], '${K}':['care_coordinator','springfield_lead'], '${A}':['care_coordinator'] };
    OPS_DOMAINS=[{ code:'client_care', owner_person:'p_a' },{ code:'scheduling_coverage', owner_person:'p_k' }];`);
  /* Needs Attention */
  const now=Date.now(), iso=(h)=>new Date(now+h*3600e3).toISOString();
  DATA.ops_items=[
    { id:'c1', kind:'request', status:'open', title:'Call the Smith family', owner:K, owner_name:'Krystal Land', created_at:iso(-2), due:iso(5) },
    { id:'c2', kind:'request', status:'open', title:'Low rating from Jones', owner:A, owner_name:'Angiel Test', created_at:iso(-1), due:iso(3) },
    { id:'c3', kind:'request', status:'open', title:'Nobody has this one', owner:'', owner_name:'', created_at:iso(-1), due:iso(6) },
    { id:'c4', kind:'request', status:'open', title:'Krystal second card', owner:K, owner_name:'Krystal Land', created_at:iso(-3), due:iso(8) } ];
  (0,eval)(`OPS_SCOPE='mine'; OPS_SCOPE_PICKED=false;`);
  if(typeof switchTab==='function') try{ switchTab('needs'); }catch(e){}
  opsRenderQueue();
  const box=document.getElementById('opsQueueList'), t=box?box.innerText:'';
  ok('an owner opens on Everyone (none of these cards is hers)', (0,eval)('OPS_SCOPE')==='all' && /Call the Smith family/.test(t) && /Low rating from Jones/.test(t) && /Nobody has this one/.test(t), t);
  const heads=[...box.querySelectorAll('.ops-owner-group')].map(x=>x.innerText);
  ok('grouped by who has it: nobody first, then each person A to Z, with a count', heads.length===3 && /^Nobody yet/.test(heads[0]) && /^Angiel Test/.test(heads[1]) && /^Krystal Land\s+2 open/.test(heads[2]), heads);
  const btnAll=[...document.querySelectorAll('.opsscope')].find(b=>/'all'/.test(b.getAttribute('onclick')));
  ok('the Everyone button shows as chosen', btnAll && btnAll.classList.contains('active'));
  const btnMine=[...document.querySelectorAll('.opsscope')].find(b=>/'mine'/.test(b.getAttribute('onclick')));
  opsSetScope('mine', btnMine);
  ok('an owner who picks Mine stays on Mine', (0,eval)('OPS_SCOPE')==='mine' && !/Call the Smith family/.test(box.innerText) && box.querySelectorAll('.ops-owner-group').length===0, box.innerText);
  (0,eval)(`ME={ email:'${K}', name:'Krystal Land', shift:'day' }; CC_ROLES=['care_coordinator','springfield_lead']; OPS_SCOPE='mine'; OPS_SCOPE_PICKED=false;`);
  opsRenderQueue();
  ok('staff (Krystal, the lead) still open on Mine', (0,eval)('OPS_SCOPE')==='mine' && /Call the Smith family/.test(box.innerText) && !/Low rating from Jones/.test(box.innerText), box.innerText);
  /* escalated check-in */
  (0,eval)(`ME={ email:'${S}', name:'Samantha Troutman', shift:'manager' };`);
  const sent=[]; window.trainHubTok=async()=>'tok';
  window.fetch=async(u,o)=>{ sent.push(JSON.parse(o.body)); return new Response(JSON.stringify({status:'sent'}),{status:200}); };
  const said=[]; window.alert=(m)=>said.push(m);
  DATA.coordinator_staff=[];
  await notifyEscalation({ id:'ck9', client_name:'Mary Client', concerns_raised:'caregiver was late twice', satisfaction_rating:2, coordinator:'Krystal' });
  const card=DATA.ops_items.find(x=>x.id==='ops_ckesc_ck9');
  ok('an escalated check-in is a card for the Client care owner, with her name', card && card.owner===A && card.owner_name==='Angiel Test' && card.domain==='client_care' && /incident: hand it to Samantha/.test(card.next_action), card);
  ok('the email goes to the Client care owner and the Springfield lead, not Samantha', JSON.stringify(sent.filter(b=>b.action==='send_email').map(b=>b.email))===JSON.stringify([A,K]), sent);
  ok('no em dash in the alert text or the message', !sent.some(b=>/—/.test(b.message||'')) && !said.some(m=>/—/.test(m)), [sent, said]);
  await notifyEscalation({ id:'ck9', client_name:'Mary Client' });
  ok('escalating the same check-in again does not make a second card', DATA.ops_items.filter(x=>x.id==='ops_ckesc_ck9').length===1);
  ok('the check-in box says who is told', /Client care owner and the Springfield lead/.test((document.getElementById('checkin_escalated')||{}).parentElement?.innerText||''));
  /* unsubscribe */
  const html=ccBuildEmailHTML({ subj:'Test', ac:'#4f8f74', blocks:[], pre:'' });
  ok('the unsubscribe link goes to the Springfield lead', /mailto:krystal@mo-care\.com\?subject=Please%20unsubscribe%20me/.test(html) && !/mailto:samantha@/.test(html));
  ok('call-in alert admins: an empty list shows the server fallback', (()=>{ DATA.ops_settings={}; const l=tkAdminsNow().map(x=>x.email); return JSON.stringify(l)===JSON.stringify([K]); })());
  return R;
}
"""
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.TCPServer(('127.0.0.1', 0), functools.partial(Q, directory=ROOT)); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1360, 'height': 900})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(f'http://127.0.0.1:{port}/index.html?proof=routinenotices'); pg.wait_for_timeout(1500)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    if os.environ.get('SHOT'): pg.screenshot(path=os.environ['SHOT'], full_page=False)
    b.close()
srv.shutdown()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

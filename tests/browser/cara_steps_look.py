"""Cara's ready steps on call follow-up cards (Samantha 2026-11-18, "Yes, build it", Practice). The real Hub page, offline,
MADE-UP people only, with a stand-in for the server doors (cara-step look/send/mark, visit-change change).
Off (cara_steps_live false): a coordinator sees nothing new; an owner sees "Cara has this ready" marked Practice with every
Send and Apply button off. On: the family ask is sendable, the AxisCare change and the confirmation wait for the family's
yes, Send posts exactly the edited text to the right person, "They said yes" unlocks, Apply calls visit-change with what
Cara saw and only what changes, then records it on the card. An overlap keeps Apply off. Phone width, no page errors.
Screenshots to SHOTS (default /tmp/cs_*.png). (python3 tests/browser/cara_steps_look.py; serves this checkout)"""
import re, os, json, threading, functools, http.server, socketserver
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
STUB = re.search(r'STUB = r"""(.*?)"""', open(os.path.join(HERE, 'standup_look.py')).read(), re.S).group(1)
SHOTS = os.environ.get('SHOTS', '/tmp/cs_')
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.TCPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=ROOT)); PORT = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()

SETUP = r"""async(o)=>{
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  const owner = o.owner;
  (0,eval)(owner ? "ME={ email:'samantha@mo-care.com', name:'Samantha Troutman' };" : "ME={ email:'krystal@mo-care.com', name:'Krystal Smith' };");
  CC_ROLES = owner ? ['owner_admin'] : ['care_coordinator']; CC_ROLES_CHECKED=true;
  window.ccIsOwner=()=>owner; window.ccActor=()=>({ email:ME.email, name:ME.name }); window.opsMeKey=()=>ME.email;
  try{ localStorage.setItem('opbLanes','0'); }catch(e){}
  Object.assign(OPB.state, { tile:'', open:'', clean:false, appr:false, started:false, older:false, f:{ when:'', who:'', need:'', owner:'start' } });
  DATA.ops_settings=Object.assign({}, DATA.ops_settings||{}, { ops_board_live:true, ops_board_live_since:new Date(Date.now()-2*864e5).toISOString(), ops_board_lanes_live:false, cara_steps_live:o.live });
  DATA.coordinator_staff=[{ name:'Samantha Troutman', email:'samantha@mo-care.com' }, { name:'Krystal Smith', email:'krystal@mo-care.com' }];
  const ago=h=>new Date(Date.now()-h*36e5).toISOString(), ahead=h=>new Date(Date.now()+h*36e5).toISOString();
  DATA.ops_items=[{ id:'cfl_m1_0', kind:'call_followup', status:'open', owner:ME.email, owner_name:ME.name, domain:'scheduling_coverage', about:'Example: Mia Rivers', who:'Example: Mia Rivers',
    title:'Move Example: Mia\'s Thursday with Example: Ruth to Friday 9 to 1', detail:'She asked by text.', created_at:ago(2), due:ahead(3), source:{ type:'call_reading', channel:'text', message_id:'m1', call_at:ago(2) } }];
  const visit = { state:'one', visit_id:'9401', client:'Example: Ruth Adams', date:'2026-11-19', start:'10:00', end:'14:00', caregiver_id:'501',
    proposed:{ date:'2026-11-20', start:'09:00', end:'13:00' }, can_change:true, why:'the visit on Thu Nov 19 with Example: Ruth', change:{ visit_id:'9401', expect:{ caregiver_id:'501', date:'2026-11-19', start:'10:00', end:'14:00' }, set:{ date:'2026-11-20', start:'09:00', end:'13:00' } }, checks:o.overlap ? { overlap:true, overlap_with:['Example: Dan 9am'], week_hours_after:30, over_40:false } : { overlap:false, week_hours_after:30, over_40:false } };
  const done = {};
  const look = () => ({ card_id:'cfl_m1_0', live:o.live, caregiver:{ name:'Example: Mia Rivers', phone_last4:'0111', texts_ok:true, axiscare_id:'501' },
    family_options:[{ key:'c7', name:'Example: Ann Adams', relation:'daughter', phone_last4:'0222', texts_ok:true }, { key:'c8', name:'Example: Bo Adams', relation:'son', phone_last4:'0333', texts_ok:false, why_not:'texts not OK' }],
    visit, steps:[
      { i:0, kind:'ask_client_family_permission', label:'Ask the client or family first', draft:'Hi Ann, this is Caring Companions. Mia asked to move Thursday 10 to 2 to Friday 9 to 1. Is that OK with you?', waits_for_yes:false, ...(done[0]?Object.assign({status:'done'},done[0]):{status:'ready'}) },
      { i:1, kind:'axiscare_visit_change', label:'Change the visit in AxisCare', waits_for_yes:true, locked:!(done[0]&&done[0].how==='yes'), ...(done[1]?Object.assign({status:'done'},done[1]):{status:'ready'}) },
      { i:2, kind:'text_caregiver', label:'Text the caregiver', draft:'Hi Mia, you are all set for Friday 9 to 1 with Ruth.', waits_for_yes:true, ...(done[2]?Object.assign({status:'done'},done[2]):{status:'ready'}) },
      { i:3, kind:'call_back', label:'Call back', status:'needs_person', why:'a person does this one' } ] });
  window.__calls=[];
  (0,eval)("sb.auth.getSession=async()=>({data:{session:{access_token:'tok'}}})");
  window.fetch = async (url, opt) => { const b = JSON.parse(opt.body||'{}'); const fn = String(url).split('/functions/v1/')[1]; window.__calls.push([fn, b]);
    const r = (x, s=200) => new Response(JSON.stringify(x), { status:s, headers:{ 'Content-Type':'application/json' } });
    if(fn==='cara-step' && b.mode==='look') return r(look());
    if(fn==='cara-step' && b.mode==='send'){ if(!o.live) return r({ error:'Cara steps are not switched on' }, 409); done[b.i]={ how:'sent', by_name:ME.name, at:new Date().toISOString(), to:b.to }; return r({ ok:true }); }
    if(fn==='cara-step' && b.mode==='mark'){ done[b.i]={ how:b.how, by_name:ME.name, change_id:b.change_id }; return r({ ok:true }); }
    if(fn==='visit-change' && b.action==='change') return r({ outcome:'changed', confirmed:true, change_id:b.change_id, words:'Thu 10:00-14:00 to Fri 09:00-13:00' });
    return r({ error:'unexpected '+fn }, 400); };
  switchTab('mywork'); myWorkGo('board'); await new Promise(r=>setTimeout(r,150));
  OPB.toggle('cfl_m1_0'); await new Promise(r=>setTimeout(r,300));
}"""
CHECKS = r"""async(o)=>{
  const R=[], ok=(n,c,d)=>R.push([n,!!c,c?'':String(d===undefined?'':JSON.stringify(d)).slice(0,400)]);
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const wrap=()=>document.querySelector('.cs-wrap'), txt=()=>(wrap()||{}).innerText||'';
  const btns=()=>[...(wrap()||document).querySelectorAll('button')].map(b=>({ t:b.innerText.trim(), off:b.disabled }));
  const btn=t=>[...wrap().querySelectorAll('button')].find(b=>b.innerText.trim()===t);
  if(o.mode==='staffOff'){ ok('off: Krystal sees nothing new on the card, and Cara was never asked', !wrap() && !window.__calls.some(c=>c[0]==='cara-step'), window.__calls); return R; }
  if(o.mode==='overlap'){ ok('overlap'+(o.after?' (after the family said yes)':'')+': flagged and Apply stays off', /Overlaps another visit \(Example: Dan 9am\)/.test(txt()) && btn('Apply in AxisCare').disabled && /won't apply this one/.test(txt()), txt()); return R; }
  ok(o.mode+': "Cara has this ready" on the opened card, with Nothing goes out until you tap it', /Cara has this ready/.test(txt()) && /Nothing goes out until you tap it/.test(txt()), txt());
  ok(o.mode+': the steps in order, the visit in words, the checks, the call back left to a person', /Ask the client or family first/.test(txt()) && /Thu, Nov 19 10am to 2pm becomes Fri, Nov 20 9am to 1pm/.test(txt())
    && /No overlap/.test(txt()) && /Hours this week after the change: 30/.test(txt()) && /a person does this one/.test(txt()), txt());
  ok(o.mode+': only family with texts OK to pick (Ann, not Bo)', /Example: Ann Adams/.test(wrap().innerHTML) && !/Example: Bo Adams/.test(wrap().innerHTML));
  ok(o.mode+': the AxisCare change and the confirmation say they wait for the family', (txt().match(/Waits for the family/g)||[]).length===2, txt());
  if(o.mode==='ownerOff'){
    ok('owner, switch off: marked Practice and every Send and Apply is off', /Practice\./.test(txt()) && btns().filter(b=>/^(Send|Apply in AxisCare)$/.test(b.t)).every(b=>b.off), btns());
    return R; }
 /Overlaps another visit \(Example: Dan 9am\)/.test(txt()) &&   ok('on: the family ask can be sent; Apply and the caregiver text cannot yet', !btns().find(b=>b.t==='Send').off && btn('Apply in AxisCare').disabled && btns().filter(b=>b.t==='Send')[1].off, btns());
  const ta=wrap().querySelector('textarea'); ta.value='Hi Ann, may Mia move Thursday to Friday 9 to 1?'; btns(); btn('Send').click(); await wait(400);
  const s=window.__calls.find(c=>c[0]==='cara-step'&&c[1].mode==='send');
  ok('Send posts exactly the edited text, to the family member picked, for step 1', s && s[1].text==='Hi Ann, may Mia move Thursday to Friday 9 to 1?' && s[1].to==='family:c7' && s[1].i===0 && s[1].card_id==='cfl_m1_0', s);
  ok('...the step shows Sent by Krystal, with They said yes / They said no', /Sent by Krystal/.test(txt()) && !!btn('They said yes') && !!btn('They said no'), txt());
  ok('...sent is not a yes: Apply still off', btn('Apply in AxisCare').disabled);
  btn('They said yes').click(); await wait(400);
  ok('They said yes: recorded, and Apply and the caregiver text unlock', window.__calls.some(c=>c[1].mode==='mark'&&c[1].how==='yes'&&c[1].i===0) && /They said yes/.test(txt()) && !btn('Apply in AxisCare').disabled, txt());
  btn('Apply in AxisCare').click(); await wait(500);
  const v=window.__calls.find(c=>c[0]==='visit-change');
  ok('Apply goes through visit-change: what Cara saw, only what changes, no reason for a move', v && v[1].action==='change' && v[1].visit_id==='9401' && JSON.stringify(v[1].expect)===JSON.stringify({caregiver_id:'501',date:'2026-11-19',start:'10:00',end:'14:00'})
    && JSON.stringify(v[1].set)===JSON.stringify({date:'2026-11-20',start:'09:00',end:'13:00'}) && v[1].reason_id===0 && /^cs-/.test(v[1].change_id), v);
  ok('...then the card records it as done with the same change id, and says so', window.__calls.some(c=>c[1].mode==='mark'&&c[1].i===1&&c[1].how==='done'&&c[1].change_id===v[1].change_id) && /Changed in AxisCare/.test(txt()), txt());
  return R; }"""
errs = []
with sync_playwright() as pw:
    b = pw.chromium.launch(); R = []
    def page(w=1360):
        pg = b.new_page(viewport={'width': w, 'height': 1000})
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(f'http://127.0.0.1:{PORT}/index.html?proof=cs'); pg.wait_for_timeout(1500)
        pg.evaluate('s=>(0,eval)(s)', STUB); return pg
    for mode, o in [('staffOff', {'owner': False, 'live': False}), ('ownerOff', {'owner': True, 'live': False}), ('on', {'owner': False, 'live': True}), ('overlap', {'owner': False, 'live': True, 'overlap': True})]:
        pg = page(); pg.evaluate(SETUP, o); R += pg.evaluate(CHECKS, dict(o, mode=mode))
        if mode == 'ownerOff': pg.screenshot(path=SHOTS + 'practice.png', full_page=False)
        if mode == 'overlap':
            pg.evaluate("()=>{ CS.mark('cfl_m1_0',0,'yes') }"); pg.wait_for_timeout(400)
            R += pg.evaluate(CHECKS, dict(o, mode=mode, after=True))
        if mode == 'on': pg.screenshot(path=SHOTS + 'on.png', full_page=False)
    pg = page(390); pg.evaluate(SETUP, {'owner': False, 'live': True})
    wv = pg.evaluate("()=>document.documentElement.scrollWidth")
    R.append(['phone width: no sideways scroll', wv <= 392, str(wv)])
    b.close()
R.append(['no page errors', not errs, '; '.join(errs)[:400]])
for n, c, d in R: print(('PASS' if c else 'FAIL') + ' · ' + n + ('' if c else '  ' + d))
print(f"{sum(1 for r in R if r[1])} / {len(R)}")
raise SystemExit(0 if all(r[1] for r in R) else 1)

"""Open hours on the Team Builder board (2026-10-12, her ask + "yes to all"): a plan with no client, the whole-team
text (preview, edit, send in batches), the answers in green / yellow / red with their days, green names on the squares,
a click pencils them in, and a person can re-sort an answer. Offline; Cara and the database are faked; nothing sent.
(python3 tests/browser/open_hours_look.py, with a static server on PORT, default 8765)"""
import os
from playwright.sync_api import sync_playwright
PORT = os.environ.get('PORT', '8765')
H = open('/Users/samantha/Claude/Projects/cc-hub-live/.claude/g1a_harness.js').read()
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; await sleep(500);
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Land' };"); CC_ROLES=['owner_admin']; CC_ROLES_CHECKED=true;
  sb.auth.getSession=async()=>({ data:{ session:{ access_token:'t' } } });
  window.__saved=[]; (0,eval)("persist=async function(k,item){ window.__saved.push([k,JSON.parse(JSON.stringify(item))]); return true; }");
  TB.pool=[]; TB.journeys=[];
  const CASE={ id:'cwh_tbOH', kind:'interest', open_hours:true, plan_id:'tbOH', status:'open', opened_by:'Krystal Land', asked:[] };
  let live=true, win=true; window.__calls=[];
  const of=window.fetch;
  window.fetch=async(u,o)=>{ u=String(u); if(/coverage-run/.test(u)){ const b=JSON.parse(o.body); window.__calls.push(b);
      if(b.mode!=='send') return new Response(JSON.stringify({ ok:true, live, window_ok:win, case_id:'cwh_tbOH', text:"Hi {first_name}, it's Caring Companions. We have regular hours open in Nixa: Monday to Saturday, 8am to noon and noon to 5pm. You can take some of the days, or just some of the hours. Interested? Reply with the days and times that work for you, or NO if not. Questions welcome.", will_get:27, already_asked:0, not_sent:3, not_sent_why:{ 'on the No shift texts list':2, 'a nurse':1 }, people:[] }),{status:200});
      const first=window.__calls.filter(x=>x.mode==='send').length===1;
      return new Response(JSON.stringify(first?{ ok:true, sent:Array(20).fill('x'), failed:[], remaining:7 }:{ ok:true, sent:Array(7).fill('x'), failed:['Zed Q (no phone on the roster)'], remaining:0 }),{status:200}); }
    return of(u,o); };
  const ofrom=sb.from.bind(sb);
  sb.from=(t)=>{ if(t!=='app_data') return ofrom(t); const b={ _k:null, select(){return b}, eq(c,v){ b._k=v; return b }, maybeSingle(){ return Promise.resolve({ data: b._k==='coverage_cases'?{ data:[CASE] }:null, error:null }) } }; return b; };
  /* a new plan: open hours, no client */
  DATA.staffing_plans=[]; switchTab('teambuilder'); await sleep(200);
  tbNewForm(); tbForPick(true);
  ok('the form offers "Open hours, no client yet" and picks the two halves', document.getElementById('tb-for-open').classList.contains('active') && document.getElementById('tb-pattern').value==='halves');
  document.getElementById('tb-townzip').value='Nixa 65714';
  document.querySelector('[data-tbday="sun"]').classList.remove('active');
  document.getElementById('tb-asproject').checked=false;
  await tbCreate(); await sleep(150);
  const plan=DATA.staffing_plans[0]; plan.id='tbOH'; TB.planId='tbOH'; tbRender(); await sleep(100);
  ok('the plan: open hours in Nixa, Mon to Sat, morning and afternoon', plan.open_hours===true && plan.client==='Open hours, Nixa' && plan.days.join()==='mon,tue,wed,thu,fri,sat' && plan.slots.map(s=>s.start+'-'+s.end).join()==='08:00-12:00,12:00-17:00', plan);
  const T0=document.getElementById('tbRoot').innerText;
  ok('no "This client needs" on an open-hours plan', !/This client needs/.test(T0), T0.slice(0,600));
  ok('the board has one Ask the whole team card, nothing sent yet', /Ask the whole team about these hours/.test(T0) && /Nothing is sent until you press Text/.test(T0) && !window.__calls.length, T0.slice(0,400));
  await OH.open('tbOH'); await sleep(100);
  const T1=document.getElementById('tbRoot').innerText;
  ok('the preview: her wording to edit, who gets it, who doesn\'t and why, the hours rule', /regular hours open in Nixa/.test(document.getElementById('ohText').value) && /Goes to 27 caregivers/.test(T1) && /Not sent to 3: 2 on the No shift texts list · 1 a nurse/.test(T1) && /9am to 6pm, 20 at a time/.test(T1), T1.slice(0,900));
  document.getElementById('ohText').value=document.getElementById('ohText').value.replace('Questions welcome.','Questions welcome!'); document.getElementById('ohText').dispatchEvent(new Event('input'));
  await OH.send('tbOH'); await sleep(150);
  const sends=window.__calls.filter(x=>x.mode==='send');
  ok('Send texts in batches until everyone has it, with the office\'s edited words', sends.length===2 && sends.every(x=>/Questions welcome!$/.test(x.message) && x.plan_id==='tbOH'), sends.map(x=>x.message.slice(-20)));
  ok('...and says how it went, naming who wasn\'t reached', /Texted 27 caregivers\. Not sent: Zed Q \(no phone on the roster\)/.test(document.getElementById('tbRoot').innerText), document.getElementById('tbRoot').innerText.slice(0,500));
  /* the answers come back (as coverage-reply writes them) */
  CASE.asked=[
    { id:'a1', name:'Mary Evans', state:'yes', yes_cells:['mon|am','wed|am','wed|pm'], reply:'Monday mornings and all day Wednesday', read_by:'ai', ghl_contact_id:'C1', axiscare_id:'11' },
    { id:'a2', name:'Ariel Smith', state:'yes', any_time:true, yes_cells:[], reply:'Yes!', read_by:'ai', axiscare_id:'12' },
    { id:'a3', name:'Kim Aide', state:'inquiry', yes_cells:['tue|am'], reply:'Tuesday mornings maybe, where in Nixa?', ghl_contact_id:'C3', axiscare_id:'13' },
    { id:'a4', name:'Bo Bright', state:'no', reply:'No thanks' },
    { id:'a5', name:'Di Waiting', state:'waiting' } ];
  DATA.coverage_cases=[CASE]; tbRender(); await sleep(100);
  const T2=document.getElementById('tbRoot').innerText;
  ok('green: names with their days in the plan\'s shift names', /🟢 Yes \(2\)/.test(T2) && /Mary Evans: Mon Morning 8a–12p, Wed all day/.test(T2) && /Ariel Smith: any of it/.test(T2), T2.slice(0,1500));
  ok('yellow: the question, their words, text back from the office line', /🟡 Questions \(1\)/.test(T2) && /Kim Aide: Tue Morning 8a–12p/.test(T2) && /where in Nixa\?/.test(T2) && /Text back from the office line/.test(T2), T2.slice(0,1500));
  ok('red, and who hasn\'t answered', /🔴 No \(1\)/.test(T2) && /Bo Bright/.test(T2) && /Not answered yet: 1 \(Di\)/.test(T2), T2.slice(0,1500));
  const cell=(k)=>[...document.querySelectorAll('#tbRoot td')].find(td=>String(td.getAttribute('onclick')).includes("'"+k+"'"));
  ok('green names sit on the squares they said yes to', /Mary/.test(cell('mon|am').innerText) && /Ariel/.test(cell('mon|am').innerText) && !/Mary/.test(cell('mon|pm').innerText) && /Mary/.test(cell('wed|pm').innerText) && /Ariel/.test(cell('sat|pm').innerText), [cell('mon|am').innerText, cell('mon|pm').innerText]);
  [...cell('mon|am').querySelectorAll('button')].find(b=>/Mary/.test(b.textContent)).click(); await sleep(150);
  ok('a click on a green name pencils them in on that square (not confirmed, nothing in AxisCare)', plan.cells['mon|am'] && plan.cells['mon|am'].name==='Mary Evans' && plan.cells['mon|am'].status==='penciled' && plan.cells['mon|am'].cg_ax_id==='11', plan.cells);
  await OH.sort('tbOH','a3','yes'); await sleep(100);
  const k=CASE.asked.find(a=>a.id==='a3');
  ok('a person answers the question and moves it to green, keeping the days, saved with their name', k.state==='yes' && k.yes_cells.join()==='tue|am' && k.sorted_by==='Krystal Land' && window.__saved.some(([kk,it])=>kk==='coverage_cases'&&it.id==='cwh_tbOH'), k);
  ok('...the box counts move', /🟢 Yes \(3\)/.test(document.getElementById('tbRoot').innerText) && /🟡 Questions \(0\)/.test(document.getElementById('tbRoot').innerText));
  /* switches */
  live=false; await OH.open('tbOH'); await sleep(80);
  ok('switch off: says where to turn it on, no Text button', /switched off \(Owners Hub Admin page, "Open hours: text the whole team"\)/.test(document.getElementById('tbRoot').innerText) && ![...document.querySelectorAll('#tbRoot button')].some(b=>/^📣 Text/.test(b.textContent)));
  live=true; win=false; await OH.open('tbOH'); await sleep(80);
  ok('outside 9am to 6pm: no Text button, come back in the morning', /outside 9am to 6pm/.test(document.getElementById('tbRoot').innerText) && ![...document.querySelectorAll('#tbRoot button')].some(b=>/^📣 Text/.test(b.textContent)));
  /* a client plan still works as before */
  tbClose(); tbNewForm();
  ok('a client plan still needs a client name', document.getElementById('tb-for-client').classList.contains('active') && /Client name/.test(document.getElementById('tb-client').placeholder));
  ok('the pattern list has no em dash', ![...document.querySelectorAll('#tb-pattern option')].some(o=>/—/.test(o.textContent)));
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1400, 'height': 1000})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200])); pg.on('dialog', lambda d: d.accept())
    pg.goto(f'http://localhost:{PORT}/index.html?proof=openhours'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', H)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    pg.evaluate("()=>{ switchTab('teambuilder'); TB.planId='tbOH'; tbRender(); window.scrollTo(0,0); }"); pg.wait_for_timeout(300)
    pg.screenshot(path=os.environ.get('SHOT', '/tmp/open_hours.png'), full_page=False); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

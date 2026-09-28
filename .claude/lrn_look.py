"""P2 · Learned from this call: offline on the real profile page, sample calls, a stand-in server copy."""
import os, sys
from playwright.sync_api import sync_playwright
H = open('/Users/samantha/Claude/Projects/cc-hub-live/.claude/g1a_harness.js').read()
SETUP = r"""
(()=>{ window.sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const t='2026-09-28T15:00:00Z';
  const sug=(id,extra)=>Object.assign({ id, at:t, source:'call-followup', reviewed:false, call_direction:'inbound', fields:{
    contact_first_name:'Dana', contact_last_name:'Doe', relationship:'daughter', client_first_name:'Ruthie', email_found:'dana@x.test', phone_found:'4175550199',
    needs:['bathing','companionship'], medical_conditions:['dementia','gout'], mobility:'uses a walker', urgency:'starting next week', funding_source:'private pay',
    rate_discussed:'$32 an hour', needs_summary:'', care_flags:['Fall Risk'], intent_tags:[], branch:'soft-check-in', confidence_note:'' } }, extra||{});
  window.__SERVER={ id:'L9', first_name:'Dana', last_name:'Doe', phone:'4175550100', status:'New', created_at:t, needs:['housekeeping'], mobility:'',
    urgency:'', funding_source:'medicaid', relationship:'', interest_notes:'Called about mom.\n\nAI call summary, not reviewed (2026-09-28): Daughter looking for help.',
    ai_suggestions:[sug('S1')] };
  DATA.leads=[JSON.parse(JSON.stringify(__SERVER))];
  window.__saves=[]; window.__readFail=false;
  window.lrnFresh=async id=>{ if(__readFail) throw new Error('offline'); return JSON.parse(JSON.stringify(__SERVER)); };
  window.persist=async (k,item)=>{ __saves.push({k,item:JSON.parse(JSON.stringify(item))}); if(k==='leads') __SERVER=JSON.parse(JSON.stringify(item)); };
  try{ ME.email='kat@mo-care.com'; ME.name='Kat'; }catch(e){}
})();
"""
TESTS = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]);
  openLeadProfile('L9'); await sleep(400);
  const card=()=>document.getElementById('cpcLearned'), txt=()=>card().innerText;
  ok('the card shows for a call waiting review', /Learned from this call/i.test(txt())&&/Call on Sep 28/.test(txt()), txt().slice(0,300));
  ok('nothing is saved just by opening the profile', __saves.length===0, __saves);
  ok('names, numbers and email heard are shown, with no accept button', /Phone heard “4175550199”/.test(txt())&&/Email heard/.test(txt())&&!document.querySelector('[id*="phone_found"],[id*="email_found"],[id*="contact_first"]'), txt());
  ok('the rate mentioned is context only', /Rate mentioned on the call: “\$32 an hour” \(context only/.test(txt()));
  ok('the AI\'s warning shows in red for a person to act on', !!card().querySelector('.cpx-chip.bad')&&/Fall Risk/.test(txt()));
  const sel=k=>document.getElementById('lrn_S1_'+k.replace(/[^a-z0-9]/gi,'_'));
  ok('the matching box is suggested for a person to confirm (bathing → Personal care)', sel('needs:0').value==='personalCare');
  ok('no match: the person chooses, or sends it to the notes (companionship)', sel('needs:1').value===''&&[...sel('needs:1').options].some(o=>o.value==='__notes'));
  const btn=(k,d)=>[...card().querySelectorAll('button')].find(b=>(b.getAttribute('onclick')||'').includes("'"+k+"','"+d+"'"));
  btn('needs:0','accept').click(); await sleep(250);
  let S=__SERVER;
  ok('accept adds to what was ticked and removes nothing', JSON.stringify(S.needs)==='["housekeeping","personalCare"]', S.needs);
  ok('who accepted comes from the sign-in', S.ai_suggestions[0].review['needs:0'].by==='kat@mo-care.com'&&S.ai_suggestions[0].review['needs:0'].decision==='accepted');
  ok('an accepted item isn\'t offered again', !sel('needs:0'));
  sel('needs:1').value='__notes'; btn('needs:1','accept').click(); await sleep(250); S=__SERVER;
  ok('"none fit" goes to the notes, labelled with the call', /From the call on Sep 28: companionship/.test(S.interest_notes), S.interest_notes);
  btn('cond:1','dismiss').click(); await sleep(250); S=__SERVER;
  ok('dismiss saves only the decision and is not offered again', S.ai_suggestions[0].review['cond:1'].decision==='dismissed'&&!(S.medical_conditions||[]).length&&!sel('cond:1'));
  btn('mobility','accept').click(); await sleep(250); S=__SERVER;
  ok('a one-choice item fills an empty field (uses a walker → Walker)', S.mobility==='walker', S.mobility);
  const n0=__saves.length; btn('funding_source','accept').click(); await sleep(200);
  ok('a one-choice item with an answer on file asks before replacing', /Replace/.test(document.body.innerText)&&/Medicaid/.test(document.body.innerText)&&__saves.length===n0);
  document.getElementById('lrnNo').click(); await sleep(150);
  ok('"Keep what\'s there" saves nothing', __saves.length===n0&&__SERVER.funding_source==='medicaid');
  /* another save happens elsewhere (a newer call arrives) before the next decision */
  __SERVER.ai_suggestions.push({ id:'S2', at:'2026-09-29T15:00:00Z', reviewed:false, call_direction:'outbound', fields:{ needs:['respite'] } });
  __SERVER.days_needed='Mon Wed Fri';
  btn('urgency','accept').click(); await sleep(250); S=__SERVER;
  ok('each decision re-reads the record first, so a newer call and newer typing are kept', S.urgency==='7days'&&S.days_needed==='Mon Wed Fri'&&S.ai_suggestions.some(x=>x.id==='S2'), [S.urgency,S.days_needed,S.ai_suggestions.length]);
  __readFail=true; const n1=__saves.length; btn('relationship','accept').click(); await sleep(250);
  ok('if the server can\'t be reached, nothing is saved and it says so', __saves.length===n1&&/nothing was saved/i.test(txt()), txt().slice(-200));
  __readFail=false; await sleep(50);
  btn('relationship','accept').click(); await sleep(250);
  btn('summary','accept').click(); await sleep(250); S=__SERVER;
  ok('accepting the summary relabels it as reviewed by who, when', /AI call summary, reviewed by kat on \d{4}-\d{2}-\d{2} \(call 2026-09-28\):/.test(S.interest_notes)&&!/not reviewed \(2026-09-28\)/.test(S.interest_notes), S.interest_notes);
  btn('cond:0','accept').click(); await sleep(250);
  btn('funding_source','dismiss').click(); await sleep(250); S=__SERVER;
  const s1=S.ai_suggestions.find(x=>x.id==='S1');
  ok('when every item has a decision, the call is marked reviewed', s1.reviewed===true&&s1.reviewed_by==='kat@mo-care.com', s1);
  ok('the finished call leaves the card; the newer call is still there', !/Call on Sep 28/.test(txt())&&/Call on Sep 29/.test(txt()), txt().slice(0,200));
  ok('every save was the family\'s own record, nothing else', __saves.every(x=>x.k==='leads'&&x.item.id==='L9'));
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1280, 'height': 1100})
    blocked=[]; pg.route('**/*', lambda r: (blocked.append(r.request.url[:70]), r.abort()) if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=lrn'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', H); pg.evaluate('s=>(0,eval)(s)', SETUP)
    R = pg.evaluate(TESTS)
    if len(sys.argv)>1:
        os.makedirs(sys.argv[1],exist_ok=True)
        pg.evaluate("s=>(0,eval)(s)", SETUP); pg.evaluate("()=>openLeadProfile('L9')"); pg.wait_for_timeout(500)
        el=pg.query_selector('#cpcLearned'); el.screenshot(path=os.path.join(sys.argv[1],'01 Learned from this call.png'))
    b.close()
R.append(['PASS' if not errs else 'FAIL','no page errors',errs[:3]])
for s_, n, d in R: print(s_, '·', n, '' if s_=='PASS' else d)
print(sum(r[0]=='PASS' for r in R), '/', len(R))

"""Getting ready moves to Client Care: offline on the real page."""
import os, sys
from playwright.sync_api import sync_playwright
H = open('/Users/samantha/Claude/Projects/cc-hub-live/.claude/g1a_harness.js').read()
TESTS = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,400)]);
  const t=new Date().toISOString();
  DATA.leads=[{id:'N1',first_name:'Nora',last_name:'New',status:'New',created_at:t},
              {id:'R1',first_name:'Ruth',last_name:'Ready',status:'Converted',created_at:t,soc:{started_at:t}},
              {id:'C1',first_name:'Cal',last_name:'Care',status:'Converted',created_at:t,soc:{launch_completed_at:t},axiscare_client_id:'501'}];
  window.__cqRows=[{id:'Q1',client_name:'Fran FirstShift',status:'open',axiscare_client_id:'777',coordinator:''}];
  try{ LS.facts={epOf:{},scOf:{},planOf:{}}; LS.filter='All'; }catch(e){}
  ok('the stage of a family who said yes is Getting ready', ccLeadStage(DATA.leads[1]).k==='ready', ccLeadStage(DATA.leads[1]));
  switchTab('leadsstarts'); await new Promise(r=>setTimeout(r,200)); renderLeadsStarts();
  const board=document.getElementById('lsBoard').innerText;
  ok('the Leads board still shows a new family', /Nora/.test(board), board.slice(0,300));
  ok('a family who said yes is not on the Leads board', !/Ruth/.test(board), board.slice(0,300));
  ok('a first-shift checklist with no inquiry is not on the Leads board', !/Fran/.test(board));
  const pills=document.getElementById('lsFilters').innerText;
  ok('no Getting ready filter; the look-up filters stay', !/Getting ready/.test(pills)&&/Receiving care/.test(pills)&&/Past/.test(pills)&&/Archived/.test(pills), pills);
  ok('no upcoming-starts counter', !/upcoming starts/.test(document.getElementById('lsCounters').innerText));
  LS.filter='Receiving care'; renderLeadsStarts();
  ok('a client can still be looked up from Leads (Receiving care)', /Cal/.test(document.getElementById('lsBoard').innerText));
  LS.filter='All';
  ok('the menu says Leads, and its board pill says Leads board', /^\s*Leads\s*$/.test(document.querySelector('.ftab[data-g="leads"]').innerText)&&/Leads board/.test(document.getElementById('fsub-leads').innerText)&&!/Getting ready/.test(document.getElementById('fsub-leads').innerText));
  const cp=[...document.querySelectorAll('#fsub-clients .fpill')].map(x=>x.innerText.trim());
  ok('Client Care starts with Getting ready, then Clients', cp[0]==='Getting ready'&&cp[1]==='Clients', cp);
  ccParentClick('gettingready'); await new Promise(r=>setTimeout(r,200));
  ok('Getting ready opens Before staffing, inside Client Care', activeTab==='soc'&&CC_GROUPS.clients.includes('soc')&&document.querySelector('.ftab[data-g="clients"]').classList.contains('active'), [activeTab, document.querySelector('.ftab.active')&&document.querySelector('.ftab.active').innerText]);
  ok('the page title says Leads', CC_SECTION_TITLES.leadsstarts==='Leads');
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1280, 'height': 1000})
    blocked=[]; pg.route('**/*', lambda r: (blocked.append(1), r.abort()) if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=gr'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', H)
    R = pg.evaluate(TESTS)
    if len(sys.argv)>1:
        os.makedirs(sys.argv[1],exist_ok=True)
        pg.evaluate("()=>{ switchTab('leadsstarts'); renderLeadsStarts(); }"); pg.wait_for_timeout(300)
        pg.screenshot(path=os.path.join(sys.argv[1],'01 Leads board ends at yes.png'))
        pg.evaluate("()=>ccParentClick('gettingready')"); pg.wait_for_timeout(300)
        pg.screenshot(path=os.path.join(sys.argv[1],'02 Client Care starts with Getting ready.png'))
    b.close()
R.append(['PASS' if not errs else 'FAIL','no page errors',errs[:3]]); R.append(['PASS' if not blocked else 'FAIL','no request reached the database',len(blocked)])
for s_, n, d in R: print(s_, '·', n, '' if s_=='PASS' else d)
print(sum(r[0]=='PASS' for r in R), '/', len(R))

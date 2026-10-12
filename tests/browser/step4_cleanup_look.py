"""Scheduling review step 4 (2026-10-12): Hours & matching trimmed (one availability button, no new-client lookup,
trends on Reports), EVV without the retired Staffing hub, the clock-ins heading, the open-hours wording in Settings, and
the call-off card with ONE next step (everything else behind "More for this shift"). Offline; nothing sent.
(python3 tests/browser/step4_cleanup_look.py, with a static server on PORT, default 8765)"""
import os
from playwright.sync_api import sync_playwright
PORT = os.environ.get('PORT', '8765')
H = open('/Users/samantha/Claude/Projects/cc-hub-live/.claude/g1a_harness.js').read()
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none'; await sleep(500);
  (0,eval)("ME={ email:'samantha@mo-care.com', name:'Samantha Troutman' };"); CC_ROLES=['owner_admin']; CC_ROLES_CHECKED=true;
  const vis=(el)=>!!el&&(el.checkVisibility?el.checkVisibility():el.offsetParent!==null);
  /* Hours & matching */
  schedGo('coverage'); covSubGo('hours'); await sleep(300);
  const HW=document.getElementById('swHoursWrap');
  const inv=[...HW.querySelectorAll('button')].filter(b=>/Text the availability link/.test(b.textContent)&&vis(b));
  ok('Hours & matching: ONE "Text the availability link" button', inv.length===1, inv.length);
  ok('...no "Who could cover a new client?" lookup', !document.getElementById('hwAsk') && !/Who could cover a new client/.test(HW.innerText));
  ok('...no six-week trends here', !/Drifting away|Retention radar/.test(HW.innerText), HW.innerText.slice(0,500));
  ok('...the availability meter says it plainly, no em dash', /Availability on file/.test(HW.innerText) && /assumed available any time/.test(HW.innerText) && !/—/.test(document.getElementById('hwRadar').innerText));
  switchTab('reports'); await sleep(300);
  ok('Reports has the six-week trends card', !!document.getElementById('hwRadarRep') && /Caregiver hours, six-week trends/.test(document.getElementById('tab-reports').innerText) && /Retention radar|Drifting away|Trends unavailable/.test(document.getElementById('hwRadarRep').innerText), document.getElementById('hwRadarRep').innerText.slice(0,200));
  /* EVV */
  const EV=document.getElementById('tab-evv');
  ok('EVV: no link to the retired Staffing hub, no "lives in the Staffing hub"', !EV.querySelector('a[href*="sc.mo-care.com/#evv"]') && !/Staffing hub/.test(EV.innerText) && /Everything happens right here/.test(EV.innerText));
  ok('...no Schedule Watch, no em dash in its headings', !/Schedule Watch/.test(EV.innerText) && ![...EV.querySelectorAll('h3,.field-note')].some(e=>/—/.test(e.textContent)));
  /* Cara clock-ins heading */
  schedGo('coverage'); covSubGo('clockins'); await sleep(200);
  ok('Missed clock-ins tab heading matches its name', /Missed clock-ins & outs/.test(document.getElementById('swLive').innerText) && !/Live Shift Watch/.test(document.getElementById('swLive').innerText));
  /* Settings */
  ok('Settings: the open-hours text and thank-you are editable, saved with the other callout texts', !!document.getElementById('set_oh_msg') && !!document.getElementById('set_oh_ack') && /set_oh_msg:'open_hours_msg', set_oh_ack:'open_hours_ack_msg'/.test(covMsgsSave.toString()));
  /* the call-off card */
  const now=new Date().toISOString(), ago=(m)=>new Date(Date.now()-m*60000).toISOString();
  const base={ status:'open', reason:'calloff', client:'Ruth Kay', shift_date:'2099-10-20', shift_time:'09:00-13:00', opened_at:ago(40) };
  DATA.coverage_cases=[
    { ...base, id:'c_ask', asked:[] },
    { ...base, id:'c_wait', client:'Ed Anderson', asked:[{ id:'w1', name:'Kim Aide', state:'waiting', at:ago(20), auto:false, picked_by_coordinator:true, phone:'+14175550101' }, { id:'w2', name:'Bo Bright', state:'waiting', at:ago(20), auto:false, picked_by_coordinator:true, phone:'+14175550102' }] },
    { ...base, id:'c_yes', client:'Dan Probst', asked:[{ id:'y1', name:'Mary Evans', state:'yes', at:ago(30), replied_at:ago(10), reply:'yes I can', picked_by_coordinator:true }, { id:'y2', name:'Di Waiting', state:'waiting', at:ago(30), picked_by_coordinator:true }] },
    { ...base, id:'c_q', client:'Cyn Stans', asked:[{ id:'q1', name:'Ariel Smith', state:'inquiry', at:ago(30), replied_at:ago(5), reply:'what time does it end?', picked_by_coordinator:true, ghl_contact_id:'C1' }] },
    { ...base, id:'c_done', client:'Steve A', status:'closed', resolved_how:'covered', covered_by:'Mary Evans', resolved_at:ago(5), asked:[] } ];
  ['c_ask','c_wait','c_yes','c_q','c_done'].forEach(id=>COV_EXPANDED.add(id));
  covSubGo('calloffs'); await sleep(300);
  const card=(id)=>document.getElementById('covcase_'+id), txt=(id)=>card(id)?card(id).innerText:'';
  const moreOf=(id)=>card(id)&&[...card(id).querySelectorAll('details')].find(d=>/More for this shift/.test(d.querySelector('summary').textContent));
  ok('nobody asked: one next step, choose who to ask (the picker shows)', /Nobody has been asked yet\. Choose who to ask below\./.test(txt('c_ask')) && /ask list|Build/i.test(txt('c_ask')), txt('c_ask').slice(0,600));
  const cu=[...card('c_ask').querySelectorAll('button')].find(b=>/Close uncovered/.test(b.textContent));
  ok('...everything else is tucked behind "More for this shift", closed', !!moreOf('c_ask') && !moreOf('c_ask').open && !!cu && !vis(cu) && !!cu.closest('details'), [!!moreOf('c_ask'), moreOf('c_ask')&&moreOf('c_ask').open, !!cu, cu&&vis(cu), cu&&cu.closest('details')&&cu.closest('details').open, cu&&cu.closest('details')&&cu.closest('details').querySelector('summary').textContent.slice(0,40), cu&&JSON.stringify(cu.getBoundingClientRect())]);
  ok('waiting: says who it waits on and offers the follow-up', /Waiting on 2 replies \(asked 20m ago\)/.test(txt('c_wait')) && [...card('c_wait').querySelectorAll('button')].some(b=>/Follow up with those we asked/.test(b.textContent)&&vis(b)), txt('c_wait').slice(0,500));
  ok('a yes: "Mary Evans said yes. Confirm them below." and the confirm is right there', /Mary Evans said yes\. Confirm them below\./.test(txt('c_yes')) && [...card('c_yes').querySelectorAll('button')].some(b=>/Pick Mary/.test(b.textContent)&&vis(b)), txt('c_yes').slice(0,700));
  ok('a question: says so, and their words with the office-line link show', /Ariel Smith asked a question\. Answer from the office line/.test(txt('c_q')) && /what time does it end\?/.test(txt('c_q')), txt('c_q').slice(0,700));
  const m=moreOf('c_wait'); m.open=true; m.dispatchEvent(new Event('toggle')); await sleep(50);
  ok('"More" opens: the steps bar, the wording, Covered ✓ and Close uncovered are all still there', /Covered ✓/.test(m.innerText) && /Close uncovered/.test(m.innerText) && /What caregivers are being texted/.test(m.innerText) && !!m.querySelector('.cov-rail'), m.innerText.slice(0,400));
  renderCoverage(); await sleep(80);
  ok('...and stays open after the board redraws', moreOf('c_wait') && moreOf('c_wait').open);
  covSubGo('history'); await sleep(200);
  ok('a closed case reads as before (covered by, Reopen)', /covered by Mary Evans/.test(txt('c_done')) && [...card('c_done').querySelectorAll('button')].some(b=>/Reopen/.test(b.textContent)), txt('c_done').slice(0,300));
  covSubGo('calloffs'); await sleep(200); window.scrollTo(0, card('c_ask').getBoundingClientRect().top+window.scrollY-120);
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1300, 'height': 1500})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200])); pg.on('dialog', lambda d: d.accept())
    pg.goto(f'http://localhost:{PORT}/index.html?proof=step4'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', H)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    pg.wait_for_timeout(300); pg.screenshot(path=os.environ.get('SHOT', '/tmp/step4_card.png')); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))

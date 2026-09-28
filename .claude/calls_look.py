"""K2 · Calls on the profile: offline on the real page, a stand-in call record and identity layer."""
import os, sys
from playwright.sync_api import sync_playwright
H = open('/Users/samantha/Claude/Projects/cc-hub-live/.claude/g1a_harness.js').read()
SETUP = r"""
(()=>{ window.sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const T={
    person_source_id:[{ person_id:'PC', system:'axiscare', entity_type:'client', source_id:'501' }],
    person_relationship:[{ person_id:'PD', client_person_id:'PC', relationship:'daughter', active:true },{ person_id:'PX', client_person_id:'PC', relationship:'son', active:false }],
    person_identity:[{ id:'PC', display_name:'Ruth Client' },{ id:'PD', display_name:'Dana Daughter' },{ id:'PX', display_name:'Old Son' }],
    call_record:[
      { id:1, recorded_at:'2026-09-28T15:00:00Z', kind:'outcome', direction:'inbound', caller_phone:'4175550100', ghl_contact_id:'G1', match:'one', person_id:null, lead_id:'L9', outcome:'Follow Up' },
      { id:2, recorded_at:'2026-09-28T15:04:00Z', kind:'summary', direction:'inbound', caller_phone:'4175550100', ghl_contact_id:'G1', match:'one', person_id:null, lead_id:'L9', summary:'Asked about Tuesday mornings.', summary_source:'ghl', axiscare:'skipped', axiscare_detail:'caller not recognised' },
      { id:3, recorded_at:'2026-09-28T15:06:00Z', kind:'ai_reading', direction:'inbound', caller_phone:'4175550100', ghl_contact_id:'G1', match:'one', person_id:null, lead_id:'L9', summary:'Daughter wants help with bathing.', summary_source:'our_ai' },
      { id:4, recorded_at:'2026-09-29T18:00:00Z', kind:'summary', direction:'outbound', caller_phone:'4175550200', ghl_contact_id:'G2', match:'one', person_id:'PD', lead_id:null, summary:'Told her the caregiver is confirmed for Monday.', summary_source:'ghl', axiscare:'posted' },
      { id:5, recorded_at:'2026-09-29T19:00:00Z', kind:'summary', direction:'inbound', caller_phone:'4175550300', match:'one', person_id:'PX', summary:'Old son called.', summary_source:'ghl', axiscare:'posted' },
      { id:6, recorded_at:'2026-09-29T20:00:00Z', kind:'summary', direction:'inbound', caller_phone:'4175550400', match:'several', person_id:null, lead_id:null, summary:'Shared line call.', summary_source:'ghl' } ] };
  window.__q=[];
  const base=sb.from.bind(sb);
  sb.from=t=>{ if(!T[t]) return base(t); const f=[]; const b={ select(){return b;}, order(){return b;}, limit(){return b;},
      eq(c,v){ f.push(r=>String(r[c])===String(v)); return b; }, in(c,vs){ f.push(r=>vs.map(String).includes(String(r[c]))); return b; },
      then(ok,bad){ __q.push(t); return Promise.resolve({ data:T[t].filter(r=>f.every(fn=>fn(r))), error:null }).then(ok,bad); } }; return b; };
  DATA.leads=[{ id:'L9', first_name:'Dana', last_name:'Doe', phone:'4175550100', status:'Converted', axiscare_client_id:'501', created_at:'2026-09-20T10:00:00Z' }];
})();
"""
TESTS = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,500)]);
  openLeadProfile('L9'); await sleep(300); try{ cpShowTab('history'); }catch(e){} await sleep(100);
  CP.ax='501'; await callsLoad(true); await sleep(100);
  const box=document.getElementById('cp_calls'), t=box.innerText;
  ok('the Calls card shows on the profile', /Calls/.test(t)&&/every call the Hub heard about/.test(t), t.slice(0,200));
  const rows=box.querySelectorAll('.calls-row');
  ok('the outcome, GoHighLevel\'s summary and our AI\'s reading from one call show as ONE call', rows.length===2, rows.length);
  ok('newest first: the daughter\'s call on the 29th, then the inquiry\'s call on the 28th', /Sep 29/.test(rows[0].innerText)&&/Sep 28/.test(rows[1].innerText));
  ok('a family contact\'s call shows who it was (by the record, not a name match)', /we called them · Dana Daughter \(daughter\)/.test(rows[0].innerText), rows[0].innerText);
  ok('an ended relationship\'s calls are not shown', !/Old son called/.test(t));
  ok('a call on a shared line (matched to several) is not shown on anyone\'s profile', !/Shared line call/.test(t));
  ok('each summary says where it came from', /GoHighLevel's summary\s*Asked about Tuesday/.test(rows[1].innerText)&&/Our AI's reading \(not reviewed/.test(rows[1].innerText), rows[1].innerText);
  ok('the tapped outcome shows on the call', /Follow Up/.test(rows[1].innerText));
  ok('AxisCare status per call: in the call log / not sent', /In AxisCare's call log/.test(rows[0].innerText)&&/Not sent to AxisCare/.test(rows[1].innerText));
  ok('a link to the conversation in GoHighLevel', !!rows[0].querySelector('a[href*="contacts/detail/G2"]'));
  ok('only read: the page touched the call record, never wrote to it', __q.includes('call_record'));
  CP.ax=''; DATA.leads.push({ id:'L0', first_name:'No', last_name:'Calls', phone:'4175559999', status:'New', created_at:'2026-09-20T10:00:00Z' });
  openLeadProfile('L0'); await sleep(300); await callsLoad(true); await sleep(50);
  ok('a family with no calls says so plainly', /No calls recorded for this family yet/.test(document.getElementById('cp_calls').innerText));
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1280, 'height': 1100})
    blocked=[]; pg.route('**/*', lambda r: (blocked.append(1), r.abort()) if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=calls'); pg.wait_for_timeout(1200)
    pg.evaluate('s=>(0,eval)(s)', H); pg.evaluate('s=>(0,eval)(s)', SETUP)
    R = pg.evaluate(TESTS)
    if len(sys.argv)>1:
        os.makedirs(sys.argv[1],exist_ok=True)
        pg.evaluate("async()=>{ openLeadProfile('L9'); await new Promise(r=>setTimeout(r,300)); try{ cpShowTab('history'); }catch(e){} CP.ax='501'; await callsLoad(true); }"); pg.wait_for_timeout(300)
        pg.query_selector('#cp_calls').screenshot(path=os.path.join(sys.argv[1],'01 Calls on the profile.png'))
    b.close()
R.append(['PASS' if not errs else 'FAIL','no page errors',errs[:3]])
for s_, n, d in R: print(s_, '·', n, '' if s_=='PASS' else d)
print(sum(r[0]=='PASS' for r in R), '/', len(R))

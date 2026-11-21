"""THE SIMPLER FINISH (2026-11-21, simple_finish_live): the readiness card shows three things and one box, offline, against a
stand-in caregiver-journey server. python3 tests/browser/simple_finish_look.py <out dir>   (serves the page itself; made-up names only)"""
from playwright.sync_api import sync_playwright
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp'
CODE = open(os.path.join(HERE, '..', '..', 'caregiver-readiness.js')).read()
ENGINE = open(os.path.join(HERE, '..', '..', 'caregivers-engine.js')).read()
T = r"""
async([CODE, ENGINE])=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  window.__calls=[]; window.__alerts=[]; window.__asks=[]; window.alert=m=>__alerts.push(String(m)); window.ccConfirm=async(m)=>{ __asks.push(String(m)); return true; }; window.ccPrompt=async()=>'';
  const def=(key,title,stage)=>({ key, title, stage, proof:'confirmed', permission:'office', required:true });
  const BOX='I saw their ID and finished the I-9 in Viventium';
  let S={ orientation:true, i9:false, checks:{ ok:true, waiting:[], blocked:[] }, box:BOX, open:true, tidy:['Signed for Caring Companions (the company signature on the agreements that need it)','Family Care Safety Registry registration','Viventium Step 2: Federal W-4 completed','Attributes entered in AxisCare (copy sheet)'] };
  let approved=false, mayWork=true, simple=true, refuse='';
  const view=()=>({ rows:[
      { key:'cg.offer.signed', def:def('cg.offer.signed','Offer letter and position description signed','offer'), st:{ state:'complete', completed_at:'2026-10-09T20:00:00Z', completed_by_name:'The Hub (verified)' }, status:'complete' },
      { key:'cg.company.countersign', def:def('cg.company.countersign','Signed for Caring Companions (the company signature on the agreements that need it)','step1'), st:{ state:'open' }, status:'ready', why:'' },
      { key:'cg.approve.work', def:def('cg.approve.work','Approved to Work (owners only)','ready'), st: approved ? { state:'complete', completed_at:'2026-11-21T16:00:00Z', completed_by_name:'Sam Owner' } : { state:'open' }, status: approved ? 'complete' : 'later', why:'' } ],
    next:{ key:'cg.company.countersign', def:def('cg.company.countersign','Signed for Caring Companions (the company signature on the agreements that need it)','step1'), owner:{ role:'owner' } }, complete:false,
    rail:[{key:'offer',label:'Offer',state:'done'},{key:'step1',label:'Step 1',state:'now'},{key:'ready',label:'Ready',state:'later'}] });
  const approve=()=>({ ready_for_final:false, approved, approved_at: approved ? '2026-11-21T16:00:00Z' : null, approved_by: approved ? 'Sam Owner' : null, axiscare: approved ? { state:'confirmed', label:'Active', at:'2026-11-21T16:00:05Z' } : { state:'pending' }, text:null, prep:{ hire_date:{state:'n/a'}, level:{state:'n/a'} }, blocked:[], missing: approved ? [] : [BOX],
    simple: simple ? S : null, locked:!approved, lock_why: approved ? null : 'Scheduling stays locked until Approved to Work and AxisCare reads back Active.', checkin:{ open:!approved, done:approved, ticks:{}, tries:[] }, call_ticks:{ i9:'Saw their ID on camera and completed I-9 Section 2 in Viventium', on_file:'Everything on file and complete' },
    level_of_care:{ level:'Level 1', source:'the default: nothing higher is recorded' }, may_approve_work:mayWork, may_retry:false, auto_approve_live:true, switches:{ axiscare_live:true, text_live:true, after_call:true, checkin_live:true } });
  const answer=()=>({ ok:true, approve:approve(), journey:{ journey_id:'j-1', client_name:'Ava Lee', status:'open' }, steps:[], view:view(), events:[], may:{}, facts:{ dates:{ orientation:'2026-11-05', axiscare_hire:'2026-11-05', differ:false }, call:{} } });
  window.sb={ functions:{ invoke:async(fn,o)=>{ const b=(o&&o.body)||{}; __calls.push({fn,b});
    if(b.action==='get') return { data:answer(), error:null };
    if(b.action==='finish_i9'){ if(refuse) return { data:{ error:refuse }, error:null }; if(b.saw_id!==true) return { data:{ error:'Tick the box' }, error:null }; approved=true; S={ ...S, i9:true, open:false }; return { data:answer(), error:null }; }
    if(b.action==='list') return { data:{ ok:true, rows:[] }, error:null };
    return { data:{ error:'Unknown action.' }, error:null }; } } };
  const sc=document.createElement('script'); sc.textContent=CODE; document.head.appendChild(sc); await sleep(30);
  const body=()=>document.getElementById('crBody'), txt=()=>body().innerText, btns=()=>[...body().querySelectorAll('button')].map(b=>b.textContent.trim());
  await CRX.open('o-1','Ava Lee'); await sleep(120);
  let t=txt();
  ok('the card says three things, in order: checks clear, orientation finished, the I-9 box', /Three things and they are cleared to work/.test(t) && t.indexOf('Background checks clear') < t.indexOf('Orientation finished') && t.indexOf('Orientation finished') < t.indexOf(BOX), t.slice(0,600));
  ok('the Next line says what to do, not "Signed for Caring Companions"', /Next: Look at their ID, finish the I-9 in Viventium, then tick the box below/.test(t) && !/Next: Signed for/.test(t));
  ok('the old call checklist is gone: no Call after orientation block, no test clock-in, no Class buttons, no "Not ready"', !/Call after orientation/.test(t) && !/Quick test clock-in/.test(t) && !/AxisCare Class/.test(t) && !/Not ready/.test(t) && !btns().includes('No answer'));
  const go=()=>document.getElementById('crI9Go'), bx=()=>document.getElementById('crI9Box');
  ok('the button is greyed out until the box is ticked', !!go() && go().disabled === true && bx().checked === false);
  go().disabled=false; go().click(); await sleep(80); go().disabled=true;
  ok('a press without the tick asks the server for nothing', !__calls.some(c=>c.b.action==='finish_i9'));
  const det=[...body().querySelectorAll('details')];
  ok('the long list is folded shut, and so is "Still to tidy (4). None of these hold them back."', det.length >= 2 && det.every(d=>!d.open) && /Still to tidy \(4\)\. None of these hold them back\./.test(body().textContent) && /Show every line on file \(3\)/.test(body().textContent), det.map(d=>d.querySelector('summary').textContent));
  await (async()=>{ const p=document.createElement('canvas'); })();
  window.__shot1=true;
  refuse='Not yet: their background checks are not all clear (OIG exclusion check (LEIE) (expired 2026-11-20)). Nothing was saved.';
  bx().click(); await sleep(30);
  ok('ticking the box wakes the button', go().disabled === false);
  go().click(); await sleep(150);
  ok('a refusal is shown in the server\'s own words and the card stays', __alerts.some(a=>/background checks are not all clear/.test(a)) && /Not approved to work/.test(txt()), __alerts);
  refuse=''; CRX.close(); await CRX.open('o-1','Ava Lee'); await sleep(120); bx().click(); await sleep(30); go().click(); await sleep(150); t=txt();
  ok('the press sends finish_i9 with the tick for this card (one refused, one accepted)', __calls.filter(c=>c.b.action==='finish_i9' && c.b.saw_id===true && c.b.journey_id==='j-1').length === 2);
  ok('after it: Approved to Work by the presser, AxisCare read back Active, the box is gone', /Approved to Work by Sam Owner/.test(t) && /read back Active/.test(t) && !document.getElementById('crI9Box') && !/Three things/.test(t), t.slice(0,500));
  /* a coordinator who may not approve sees the lines, never the box */
  approved=false; S={ ...S, i9:false, open:true }; mayWork=false; CRX.close(); await CRX.open('o-1','Ava Lee'); await sleep(120); t=txt();
  ok('not on the list: the three lines, no box, and who may tick it', !document.getElementById('crI9Box') && /A person on the Approve to Work list or a care coordinator ticks this/.test(t));
  /* checks not clear */
  mayWork=true; S={ ...S, open:false, checks:{ ok:false, waiting:['Case.net court records search (Missouri)'], blocked:[] } }; CRX.close(); await CRX.open('o-1','Ava Lee'); await sleep(120); t=txt();
  ok('a check still needed is named, the box is not offered, Next says so', /Still needed: Case\.net court records search/.test(t) && !document.getElementById('crI9Box') && /Next: Their background checks are not all clear yet/.test(t));
  /* switch off: the old card, untouched */
  simple=false; CRX.close(); await CRX.open('o-1','Ava Lee'); await sleep(120); t=txt();
  ok('switch off: the card is exactly the old one (the call block, Not ready, Next from the list)', /Call after orientation/.test(t) && /Not ready/.test(t) && /Next: Signed for Caring Companions/.test(t) && !/Three things/.test(t) && /One card: every requirement/.test(t));
  ok('no em dash, no "GoHighLevel" anywhere it drew', !/—|GoHighLevel|GHL/.test(t));
  /* the Onboarding table's I-9 done button */
  const src=ENGINE;
  ok('the table button: with the switch on it asks once and sends finish_i9; off it keeps the old path', /if\(obtSimpleOn\(\)\)\{\s*\n\s*if\(!\(await ccConfirm\('Did you see their ID and finish the I-9 in Viventium\?/.test(src) && /action:'finish_i9', saw_id:true/.test(src) && /action:'confirm', step_key:'cg\.i9\.section2'/.test(src));
  simple=true; approved=false; mayWork=true; S={ orientation:true, i9:false, checks:{ ok:true, waiting:[], blocked:[] }, box:BOX, open:true, tidy:S.tidy }; CRX.close(); await CRX.open('o-1','Ava Lee'); await sleep(120);
  return R;
}
"""
PAGE = '<!doctype html><html><head><meta charset="utf-8"><style>.ibtn{font:inherit;font-size:.8rem;padding:.3rem .6rem;border:1px solid #d9d4c8;border-radius:8px;background:#fff;cursor:pointer}.ibtn:disabled{opacity:.45;cursor:default}body{font-family:-apple-system,sans-serif}</style></head><body></body></html>'
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 760, 'height': 900})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.route('http://hub.test/', lambda r: r.fulfill(status=200, content_type='text/html', body=PAGE))
    pg.goto('http://hub.test/'); pg.wait_for_timeout(100)
    R = pg.evaluate(T, [CODE, ENGINE])
    pg.screenshot(path=os.path.join(OUT, 'simple_finish_card.png'), full_page=True)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

"""ACTIVATE NEW EMPLOYEE (2026-11-21, activate_button_live): the Onboarding table's Finish column says one thing, or shows one
button. The real cell code from caregivers-engine.js, offline, with made-up names. python3 tests/browser/activate_button_look.py <out dir>"""
from playwright.sync_api import sync_playwright
import os, sys, re
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp'
ENGINE = open(os.path.join(HERE, '..', '..', 'caregivers-engine.js')).read()
CARD = open(os.path.join(HERE, '..', '..', 'caregiver-readiness.js')).read()
def cut(a, b): i = ENGINE.index(a); return ENGINE[i:ENGINE.index(b, i)]
PARTS = '\n'.join([cut('function obtCell(s, t, o){', 'function obtReview('), cut('const obtCallOn = ', '\n', ) , cut('function obtFinish(p, j, g){', '/* I-9 in Viventium (her ask'), cut('function obtI9(c, j, fin){', 'async function obtI9Done('), cut('function obtBtn(b, small){', '\n')])
m = re.search(r"if\(x\.simple\) return .*\n", ENGINE); SIMPLE = m.group(0)
T = r"""
async([PARTS, SIMPLE, CARD, ENGINE])=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,600)]);
  { const d=document.createElement('script'); d.textContent='let DATA={ ops_settings:{ simple_finish_live:true, activate_button_live:true, after_orientation_call_live:true, auto_approve_work_live:true } }; const setSw=(k,v)=>{ DATA.ops_settings[k]=v; };'; document.head.appendChild(d); }
  ok('the page keeps its settings in a page-level DATA, not on window (the real Hub does the same)', typeof window.DATA === 'undefined');
  window.bgrEsc=(t)=>String(t??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
  window.obtOpenCard=(j)=>"open('"+j.journey_id+"')"; window.ckdOrientAx=()=>''; window.ckdWc=()=>null; window.ckdDay=(d)=>String(d).slice(5,10); window.obtDay=window.ckdDay;
  let FIN={}; window.OPR={ finishOf:(ax,name)=>FIN[name]||null, brief:()=>({ text:'Finished Nov 16' }) };
  const BOX='I saw their ID and finished the I-9 in Viventium';
  const sc=document.createElement('script'); sc.textContent=PARTS+'\nwindow.T={obtFinish,obtI9,obtNearly,obtBtn};\nwindow.finHTML=(x)=>{ const gs="", tip=x.tip?(" title="+JSON.stringify(bgrEsc(x.tip))):""; '+SIMPLE+' return "OLD"; };'; document.head.appendChild(sc);
  const P=(name)=>({ name, c:{ id:1 }, stop:3 }), J=(o)=>Object.assign({ journey_id:'j-1', offer_id:'o-1' }, o||{});
  FIN={ Ava:{ approved:false, missing:[BOX] }, Ben:{ approved:false, missing:['Agency orientation', BOX] }, Cy:{ approved:false, missing:['OIG exclusion check (LEIE) (expired 2026-11-20)', BOX] }, Dee:{ approved:true, missing:[] }, Eve:{ approved:true, missing:[] }, Fay:{ approved:false, missing:['Their caregiver profile (a photo and 3 quick answers)', BOX] } };
  const rows=[['Ava', J()], ['Ben', J()], ['Cy', J()], ['Dee', J({ approved_to_work:true, axiscare:'confirmed' })], ['Eve', J({ approved_to_work:true, axiscare:'failed' })]];
  const cells={}; for(const [n,j] of rows){ const f=T.obtFinish(P(n), j, { axiscare_id:'9' }); cells[n]={ f, i9:T.obtI9({ id:1 }, j, f), near:T.obtNearly({ j, cells:{ finish:f } }), html:finHTML(f) }; }
  ok('ready (checks clear, orientation done): ONE button, Activate New Employee, no letter chips', cells.Ava.f.b && cells.Ava.f.b.label==='Activate New Employee' && /finish|obtI9Done/.test(cells.Ava.f.b.on) && cells.Ava.f.marks.length===0 && !/obt-mk /.test(cells.Ava.html) && /Activate New Employee/.test(cells.Ava.html), cells.Ava);
  ok('ready: the I-9 column has no second button, and the chip under the name says Ready to activate', !cells.Ava.i9.b && cells.Ava.near==='Ready to activate', [cells.Ava.i9, cells.Ava.near]);
  ok('orientation not finished: says Waiting on orientation, no button', !cells.Ben.f.b && cells.Ben.f.t==='Waiting on orientation' && /Waiting on orientation/.test(cells.Ben.html), cells.Ben.f);
  ok('a check not clear: says Waiting on checks, names it on hover, no button', !cells.Cy.f.b && cells.Cy.f.t==='Waiting on checks' && /OIG/.test(cells.Cy.f.tip), cells.Cy.f);
  { const f=T.obtFinish(P('Fay'), J(), { axiscare_id:'9' }); ok('only the profile is missing (the profile rule is on): says Waiting on their profile, not checks, no button', !f.b && f.t==='Waiting on their profile' && /profile/.test(f.tip), f); }
  ok('activated: says Activated, no button', !cells.Dee.f.b && cells.Dee.f.t==='Activated' && cells.Dee.f.s==='ok', cells.Dee.f);
  ok('AxisCare did not take it: Retry, said plainly', cells.Eve.f.b && cells.Eve.f.b.label==='Retry' && /AxisCare did not take it/.test(cells.Eve.html), cells.Eve.f);
  ok('the question on the press names the I-9, AxisCare, the text and the no-text box on the card; nothing about a call', /Activate this new employee\?[^']*finish the I-9 in Viventium[^']*Active in AxisCare[^']*AxisCare and Viventium links[^']*do not send the text/.test(ENGINE) && !/Activate this new employee\?[^']*\bcall/i.test(ENGINE));
  setSw('activate_button_live', false);
  const old=T.obtFinish(P('Ava'), J(), { axiscare_id:'9' }), oldI9=T.obtI9({ id:1 }, J(), old);
  ok('switch off: the column is exactly as before (letter chips, I-9 done in the I-9 column)', !old.simple && old.marks.length>=4 && oldI9.b && oldI9.b.label==='I-9 done' && T.obtNearly({ j:J(), cells:{ finish:old } })==='Only '+BOX+' left', [old.marks.length, oldI9]);
  ok('the card button reads Activate New Employee only with the switch on', /a\.switches && a\.switches\.activate === true \? 'Activate New Employee' : '✓ Cleared to work'/.test(CARD) && !/window\.DATA/.test(CARD) && !/window\.DATA/.test(ENGINE));
  ok('no em dash and no GoHighLevel in the new words', !/—/.test(SIMPLE) && !/Activate[^\n]*(—|GoHighLevel|GHL)/.test(ENGINE));
  setSw('activate_button_live', true);
  const names={ Ava:'Ava Lee', Ben:'Ben Ray', Cy:'Cy Moss', Dee:'Dee Park', Eve:'Eve Nu' };
  document.body.innerHTML='<h3 style="margin:0 0 8px">Onboarding · Finish column (preview, made-up names)</h3><table style="border-collapse:collapse;font-size:14px"><tr><th style="text-align:left;padding:6px 14px;border-bottom:2px solid #0D365F">Name</th><th style="text-align:left;padding:6px 14px;border-bottom:2px solid #0D365F">Orientation</th><th style="text-align:left;padding:6px 14px;border-bottom:2px solid #0D365F">Finish</th></tr>'
    + rows.map(([n])=>'<tr><td style="padding:10px 14px;border-bottom:1px solid #e5e0d5"><b>'+names[n]+'</b>'+(cells[n].near?'<div style="font-size:12px;color:#0F7A4A">★ '+cells[n].near+'</div>':'')+'</td><td style="padding:10px 14px;border-bottom:1px solid #e5e0d5">'+(n==='Ben'?'U8/11':'✓')+'</td>'+cells[n].html.replace('<td','<td style="padding:10px 14px;border-bottom:1px solid #e5e0d5"')+'</tr>').join('')+'</table>';
  return R;
}"""
PAGE = '<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,sans-serif;padding:16px}.obt-b{font:inherit;font-size:.82rem;font-weight:700;padding:.4rem .8rem;border:none;border-radius:8px;background:#0D365F;color:#fff;cursor:pointer}.obt-b-w{background:#B45309}</style></head><body></body></html>'
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 720, 'height': 420})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    pg.route('http://hub.test/', lambda r: r.fulfill(status=200, content_type='text/html', body=PAGE))
    pg.goto('http://hub.test/'); pg.wait_for_timeout(100)
    try: R = pg.evaluate(T, [PARTS, SIMPLE, CARD, ENGINE])
    except Exception as e: print('ERRS', errs, str(e)[:200]); raise
    pg.screenshot(path=os.path.join(OUT, 'activate_button_column.png'), full_page=True)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

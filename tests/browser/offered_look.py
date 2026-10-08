"""Offered people into Background & References (2026-10-08): the real page and styles, offline, FAKE people only. The
engine's own renderOfferedStrip and offeredChip (cut out of caregivers-engine.js) draw the strip and a row's chip into
the real People & Checks table. Saves one screenshot. Nothing reaches production; nothing is sent."""
import os
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..', '..')
PORT = os.environ.get('PORT', '8767'); OUT = os.environ.get('OUT', '/tmp')
ENG = open(os.path.join(ROOT, 'caregivers-engine.js')).read()
def cut(a, b):
    i = ENG.index(a); j = ENG.index(b, i + 1); return ENG[i:j]
CODE = """
const wcEsc = t => String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
let OFFERS = [
  { id:'of-1', first_name:'Kristen', last_name:'Sample', phone:'4175550101', email:'k@example.test', position:'Caregiver', offered_by:'Krystal', created_at:'2026-10-03T15:00:00Z' },
  { id:'of-2', first_name:'Holly', last_name:'Sample', phone:'4175550102', email:'h@example.test', position:'CNA', offered_by:'Krystal', created_at:'2026-10-06T15:00:00Z' },
  { id:'of-3', first_name:'Jessica', last_name:'Sample', phone:'4175550103', email:'j@example.test', position:'Caregiver', offered_by:'Samantha', created_at:'2026-10-07T15:00:00Z' } ];
let INTAKE_ROWS = [{ id:'in-2', first_name:'Holly', last_name:'Sample', phone:'4175550102', email:'h@example.test', refs:[] }];
let candidates = [{ id: 901, first:'Jessica', last:'Sample', phone:'4175550103', offer_id:'of-3', oig:'Pending', edl:'Pending', fcsr:'Pending', r1s:'Pending', r2s:'Pending' },
                  { id: 902, first:'Holly', last:'Sample', phone:'4175550102', offer_id:'of-2', oig:'Pending', edl:'Pending', fcsr:'Pending', r1s:'Pending', r2s:'Pending' }];
let caregivers = [];
function lifecycleRows(){ return OFFERS.map(o => ({ name:o.first_name+' '+o.last_name, offer:o, intake: INTAKE_ROWS.find(r=>r.phone===o.phone)||null, board: candidates.find(c=>c.offer_id===o.id)||null, roster:null })); }
""" + cut('function obRefType(v){', 'function obRefTypeLabel(') + cut('const OFF_MONTHS=', 'function offerAgeDays(') + cut('function obDigits(t){', 'async function intakeFillFromForm(') + cut('function renderOfferedStrip(){', 'async function offeredAddOne(')
T = r"""
async(CODE)=>{
  const sc=document.createElement('script'); sc.textContent=CODE; document.head.appendChild(sc);
  await new Promise(r=>setTimeout(r,50));
  const panel=document.getElementById('panel-onboarding'); if(panel){ panel.classList.add('mode-people'); }
  renderOfferedStrip();
  const badge=(t,k)=>`<span class="badge ${k}">${t}</span>`;
  const none='<td><div class="refc"><span class="refc-none">No reference given</span><div class="refc-foot"><button class="refc-btn">📞 Record</button></div></div></td>';
  const chk=()=>`<td><div class="chk">${badge('Pending','b-gray')}</div></td>`;
  const tb=document.getElementById('ob-tbody');
  tb.innerHTML=candidates.map(c=>`<tr><td class="cand-td"><div class="name-cell" style="color:var(--navy)">${c.first} ${c.last}</div><div class="cand-meta">Added Oct 8</div></td>
    ${none}${none}${none}${none}${chk()}${chk()}${chk()}<td><div class="chk">${badge('Not required','b-gray')}</div></td>
    <td>${badge('Awaiting','b-gray')}<br><span style="display:inline-block;margin-top:4px;">${offeredChip(c)}</span></td>
    <td><div class="acts"><button class="ibtn">✏️</button> <button class="ibtn" style="color:#ef4444;border-color:#fca5a5">🚫</button></div></td></tr>`).join('');
  document.getElementById('ob-empty').style.display='none';
  const strip=document.getElementById('obOfferedStrip'); for(let el=strip; el; el=el.parentElement){ if(getComputedStyle(el).display==='none') el.style.display='block'; }
  strip.scrollIntoView();
  return { strip: strip.innerText.replace(/\s+/g,' ').trim().slice(0,300), chips: [...tb.querySelectorAll('td:nth-child(10)')].map(td=>td.innerText.replace(/\s+/g,' ').trim()) };
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1600, 'height': 900})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(f'http://localhost:{PORT}/index.html?proof=offered'); pg.wait_for_timeout(1500)
    R = pg.evaluate(T, CODE)
    top = pg.locator('#obOfferedStrip').bounding_box(); table = pg.locator('#ob-tbody').locator('xpath=ancestor::table[1]').bounding_box()
    y0 = max(0, top['y'] - 8); y1 = min(900, table['y'] + table['height'] + 8)
    pg.screenshot(path=os.path.join(OUT, 'offered_look.png'), clip={'x': max(0, top['x'] - 8), 'y': y0, 'width': min(1600, table['width'] + 16), 'height': y1 - y0})
    b.close()
print(R); print('page errors:', errs[:3])

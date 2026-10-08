"""Moved into orientation + office orientation set by the office (2026-10-08): the real page and the real styles,
offline, FAKE candidates only. The banner is drawn by the engine's own obOrientBanner (cut out of
caregivers-engine.js), set into the real People & Checks table; the real office orientation window is opened with the
engine's own preview. Saves two screenshots. Nothing reaches production; nothing is sent."""
import os, sys
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..', '..')
PORT = os.environ.get('PORT', '8767'); OUT = os.environ.get('OUT', '/tmp')
ENG = open(os.path.join(ROOT, 'caregivers-engine.js')).read()
def cut(a, b):
    i = ENG.index(a); j = ENG.index(b, i + 1); return ENG[i:j]
CODE = """
const ORIENT_ADDR = '1331 N Stewart Ave Ste B, Springfield MO 65802';
const wcEsc = t => String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const wcDay = iso => iso ? new Date(iso).toLocaleDateString('en-US', { month:'short', day:'numeric', timeZone:'America/Chicago' }) : '';
const wcWhen = iso => new Date(iso).toLocaleString('en-US', { weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit', timeZone:'America/Chicago' });
function fmtD(s){ if(!s) return null; const d = new Date(s + 'T00:00:00'); return isNaN(d) ? null : d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); }
function wcRowFor(c){ return c.id === 902 ? { status:'booked', starts_at:'2026-10-13T15:00:00Z' } : null; }
let orientSessions = [{ id: 5, date: '2026-10-15', time: '10:00', capacity: '6', is_remote: 'no', bookings: [{ first:'Cy', last:'Sample', candidate_id: 903 }] }];
let candidates = [
  { id: 901, first: 'Ava', last: 'Sample', phone: '4175550100', resolvedAt: '2026-10-06T15:00:00Z' },
  { id: 902, first: 'Bo', last: 'Sample', phone: '4175550101', resolvedAt: '2026-10-03T15:00:00Z', step2_done_at: '2026-10-04T15:00:00Z' },
  { id: 903, first: 'Cy', last: 'Sample', phone: '4175550102', resolvedAt: '2026-10-01T15:00:00Z', invite_sent: true, invite_sent_date: '2026-10-02' } ];
let invitingId = 901;
""" + cut('function fmtTime(t){', 'const DEFAULT_ORIENT_SCHEDULE') + cut('function officeOrientBookingFor(', 'async function bookOfficeOrientation(')
T = r"""
async(CODE)=>{
  const sc=document.createElement('script'); sc.textContent=CODE; document.head.appendChild(sc);
  await new Promise(r=>setTimeout(r,50));
  /* the People & Checks table, as the engine draws a cleared row: references and checks on the left, the banner at right */
  document.querySelectorAll('.tabpanel,.panel').forEach(p=>p.classList.remove('active'));
  if(typeof switchTab==='function'){ try{ switchTab('cgbackground'); }catch(e){} }
  const panel=document.getElementById('panel-onboarding'); if(panel){ panel.classList.add('mode-people'); panel.style.display='block'; }
  const badge=(t,k)=>`<span class="badge ${k}">${t}</span>`;
  const ref=(n)=>`<td><div class="refc"><div class="refc-name">${n}</div><div class="refc-line">(417) 555-0199</div><div class="refc-foot">${badge('Positive','b-green')}</div></div></td>`;
  const chk=(t)=>`<td><div class="chk">${badge(t,'b-green')}<span class="chk-date">Oct 6, 2026</span></div></td>`;
  const tb=document.getElementById('ob-tbody');
  tb.innerHTML=candidates.map(c=>`<tr><td class="cand-td"><div class="name-cell" style="color:var(--navy)">${c.first} ${c.last}</div><div class="cand-meta">Added Sep 28</div></td>
    ${ref('Dana Reference')}${ref('Eli Reference')}<td><div class="refc"><span class="refc-none">No reference</span></div></td><td><div class="refc"><span class="refc-none">No reference</span></div></td>
    ${chk('CLEAR')}${chk('Clear')}${chk('Clear')}<td><div class="chk">${badge('Not required','b-gray')}</div></td>
    <td>${obOrientBanner(c)}</td>
    <td><div class="acts"><button class="ibtn">✏️</button> <button class="ibtn" style="color:#ef4444;border-color:#fca5a5">🚫</button></div></td></tr>`).join('');
  document.getElementById('ob-empty').style.display='none';
  const wrap=tb.closest('.tbl-wrap'); for(let el=wrap; el; el=el.parentElement){ if(getComputedStyle(el).display==='none') el.style.display='block'; }
  wrap.scrollIntoView();
  const r=wrap.getBoundingClientRect();
  const texts=[...tb.querySelectorAll('.ob-orient-banner')].map(b=>b.innerText.replace(/\s+/g,' ').trim());
  return { table:[r.x,r.y,r.width,r.height], texts, buttons:[...tb.querySelectorAll('button')].map(b=>b.textContent.trim()) };
}
"""
M = r"""
async()=>{
  document.getElementById('inv-name').textContent='Ava Sample'; document.getElementById('inv-phone').textContent='(417) 555-0100';
  document.getElementById('inv-sessions-list').innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;padding:.5rem .85rem;border-bottom:1px solid var(--border);font-size:.78rem"><span><strong>Thu Oct 15, 2026</strong> · 10:00 AM · In-Person</span><span style="color:var(--green-text);font-weight:600">5 spots open</span></div>';
  document.getElementById('inv-msg').textContent="Hi Ava! Congratulations, you've been cleared to join Caring Companions! 🎉 Please choose your orientation date here: https://sc.mo-care.com/orientation-booking.html?… Questions? Call/text (417) 234-8494. We can't wait to meet you!";
  document.getElementById('inv-manual-date').value='2026-10-20'; document.getElementById('inv-manual-time').value='14:00'; officeOrientPreview();
  document.getElementById('invite-modal').classList.add('open');
  await new Promise(r=>setTimeout(r,100));
  const m=document.querySelector('#invite-modal .modal'); m.scrollTop=m.scrollHeight;
  return { preview: document.getElementById('inv-manual-preview').innerText.replace(/\s+/g,' ').trim(), title: document.querySelector('#invite-modal h3').textContent };
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1600, 'height': 900})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(f'http://localhost:{PORT}/index.html?proof=orient'); pg.wait_for_timeout(1500)
    R = pg.evaluate(T, CODE)
    pg.locator('#ob-tbody').locator('xpath=ancestor::table[1]').screenshot(path=os.path.join(OUT, 'orient_banner_table.png'))
    M_ = pg.evaluate(M)
    pg.screenshot(path=os.path.join(OUT, 'orient_office_modal.png'))
    b.close()
print('banners:', R['texts']); print('buttons:', R['buttons']); print('modal:', M_); print('page errors:', errs[:3])

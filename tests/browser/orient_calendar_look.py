"""Office orientation calendar + stat tiles (2026-10-08): the real page and styles, offline, FAKE sessions only. The
engine's own renderCalendar (cut out of caregivers-engine.js) draws October with three sessions; the stat tiles are
filled as renderOrientations fills them. Saves one screenshot. Nothing reaches production."""
import os
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..', '..')
PORT = os.environ.get('PORT', '8767'); OUT = os.environ.get('OUT', '/tmp')
ENG = open(os.path.join(ROOT, 'caregivers-engine.js')).read()
def cut(a, b):
    i = ENG.index(a); j = ENG.index(b, i + 1); return ENG[i:j]
CODE = """
let calViewMonth = new Date(2026, 9, 1); let calSelectedDate = '2026-10-15';
let orientSessions = [{ id:1, date:'2026-10-02', time:'10:00', capacity:'6', bookings:[{}] }, { id:2, date:'2026-10-15', time:'10:00', capacity:'6', bookings:[{},{}] }, { id:3, date:'2026-10-15', time:'14:00', capacity:'1', bookings:[{}] }, { id:4, date:'2026-10-22', time:'10:00', capacity:'6', bookings:[] }];
const _D = Date; Date = class extends _D { constructor(...a){ super(...(a.length ? a : ['2026-10-08T15:00:00'])); } static now(){ return new _D('2026-10-08T15:00:00').getTime(); } };
""" + cut('function renderCalendar(){', 'function calClickDay(')
T = r"""
async(CODE)=>{
  const sc=document.createElement('script'); sc.textContent=CODE; document.head.appendChild(sc);
  await new Promise(r=>setTimeout(r,50));
  renderCalendar();
  document.getElementById('or-stats').innerHTML = '<div class="stat"><div class="lbl">Upcoming</div><div class="val v-navy">2</div></div><div class="stat"><div class="lbl">Booked</div><div class="val v-amber">3</div></div><div class="stat"><div class="lbl">Available</div><div class="val v-green">4</div></div><div class="stat"><div class="lbl">Full</div><div class="val v-red">1</div></div>';
  const card=document.querySelector('.cal-card'); for(let el=card; el; el=el.parentElement){ if(getComputedStyle(el).display==='none') el.style.display='block'; }
  const body=document.getElementById('guide-body-orient-office'); if(body) body.style.display='block';
  card.scrollIntoView();
  return { days: document.querySelectorAll('.cal-day:not(.other)').length, sessions: [...document.querySelectorAll('.cal-day.has-session')].map(d=>d.textContent.trim()) };
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 1500, 'height': 900})
    pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto(f'http://localhost:{PORT}/index.html?proof=cal'); pg.wait_for_timeout(1500)
    R = pg.evaluate(T, CODE)
    pg.locator('.cal-card').locator('xpath=..').screenshot(path=os.path.join(OUT, 'orient_calendar.png'))
    b.close()
print(R); print('page errors:', errs[:3])

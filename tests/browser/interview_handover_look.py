"""1547 Hand an interview to someone else (Samantha 2026-11-18). interview-handover.js on a bare page with a made-up server:
Krystal's in-person interview Thu 10:30 AM, handed to Samantha by video. Checks: the sheet lists everyone with link and busy
notes, Krystal (who has no link) cannot take it by video, the words follow the pick, Hand it over sends the right body, a
"busy then" answer asks "hand it over anyway?" and resends with force, the done screen says who was told.
(python3 tests/browser/interview_handover_look.py)"""
import pathlib, json, os
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
JS = (ROOT / 'interview-handover.js').read_text()
res = []
def ck(n, c, note=''): res.append((n, bool(c), note))
W = lambda who, v: f"Hi Dana, words for {who}{' by video' if v else ''}"
DRAFT = {'ok': True, 'first': 'Dana', 'confirmed': True, 'can_text': True, 'in_hours': True, 'waits': None, 'email': 'd@x.com',
  'booked': {'day': 'Thursday, November 19', 'short_day': 'Thu, Nov 19', 'time': '10:30 AM', 'video': False},
  'interviewers': [
    {'id': 'k', 'name': 'Krystal', 'current': True, 'has_link': False, 'busy': None, 'words': {'keep': W('Krystal', 0), 'video': None}},
    {'id': 'v', 'name': 'Katlin', 'current': False, 'has_link': True, 'busy': 'Assessment: J. S.', 'words': {'keep': W('Katlin', 0), 'video': W('Katlin', 1)}},
    {'id': 's', 'name': 'Samantha', 'current': False, 'has_link': True, 'busy': None, 'words': {'keep': W('Samantha', 0), 'video': W('Samantha', 1)}}]}
PAGE = """<!doctype html><meta charset=utf-8><body><div id=out></div><script>
window.__calls=[]; window.__busyOnce=true; window.__confirm=null;
window.ccConfirm=async (m)=>{ window.__confirm=m; return true; };
window.ivqLoad=()=>{ window.__reloaded=(window.__reloaded||0)+1; };
window.sb={ functions:{ invoke: async (name,{body})=>{ window.__calls.push(body);
  if(body.action==='handover_draft') return { data: DRAFT, error:null };
  if(body.action==='handover' && body.coordinator_id==='v' && !body.force) return { data:null, error:{ message:'x', context:{ json: async()=>({ ok:false, reason:'busy', error:'Katlin has something at that time: Assessment: J. S.. Hand it over anyway?' }) } } };
  return { data:{ ok:true, handed:true, to: body.coordinator_id==='v'?'Katlin':'Samantha', video: !!body.video, applicant:{ sent:true, texted:true, emailed:true }, told:{ to:'you (no message)', from:{ name:'Krystal', how:'texted' } } }, error:null }; } } };
const DRAFT=__DRAFT__;
</script><script>__JS__</script></body>""".replace('__DRAFT__', json.dumps(DRAFT)).replace('__JS__', JS)
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.set_content(PAGE)
    ck('IHO.btn draws a Hand over button; red when an assessment clashes', '🤝 Hand over' in pg.evaluate("IHO.btn('a1')") and '#B91C1C' in pg.evaluate("IHO.btn('a1', true)") and '#B91C1C' not in pg.evaluate("IHO.btn('a1')"))
    pg.evaluate("IHO.open('a1')"); pg.wait_for_selector('#ihoBox input[name=ihoWho]')
    t = ' '.join(pg.inner_text('#ihoBox').split())
    ck('the sheet says the time, in person, with Krystal, same time', 'Thu, Nov 19 at 10:30 AM' in t and 'in person with Krystal' in t and 'Same time' in t, t)
    ck('...every interviewer, who has it now, link or not, busy then', 'Krystal (has it now)' in t and 'no video link' in t and 'busy then: Assessment: J. S.' in t and t.count('video link saved') == 2, t)
    ck('...nothing picked yet, so Hand it over is off', pg.is_disabled('#ihoGo'))
    pg.check('input[value=k]')
    ck('picking the person who has it, without video: "already with Krystal", still off', 'already with Krystal' in pg.inner_text('#ihoBox') and pg.is_disabled('#ihoGo'))
    pg.check('#ihoVideo')
    ck('...ticking video for Krystal (no link): told to add her link first, still off', 'Krystal has no video link yet' in pg.inner_text('#ihoBox') and pg.is_disabled('#ihoGo'))
    pg.check('input[value=s]')
    ck('Samantha by video: her video words in the box, both interviewers named, button on', pg.input_value('#ihoMsg') == W('Samantha', 1) and 'Krystal and Samantha each get a text' in pg.inner_text('#ihoBox') and not pg.is_disabled('#ihoGo') and 'text Dana' in pg.inner_text('#ihoGo'))
    pg.uncheck('#ihoVideo')
    ck('...untick video: the in-person words', pg.input_value('#ihoMsg') == W('Samantha', 0))
    pg.check('#ihoVideo'); pg.fill('#ihoMsg', 'Edited words'); pg.click('#ihoGo')
    pg.wait_for_selector('#ihoBox h3:has-text("Handed to")')
    c = pg.evaluate("window.__calls[window.__calls.length-1]")
    ck('Hand it over sends who, video and the edited words', c == {'action': 'handover', 'id': 'a1', 'coordinator_id': 's', 'video': True, 'message': 'Edited words', 'force': False}, c)
    t = pg.inner_text('#ihoBox')
    ck('...done screen: handed to Samantha by video, texted and emailed Dana, Krystal texted', 'Handed to Samantha' in t and 'Texted and emailed Dana' in t and 'Krystal: texted' in t, t)
    ck('...the Interviews list reloads', pg.evaluate("window.__reloaded") == 1)
    pg.click('#ihoBox .iho-b.p'); ck('Done closes it', pg.query_selector('#ihoBack') is None)
    pg.evaluate("IHO.open('a1')"); pg.wait_for_selector('#ihoBox input[value=v]'); pg.check('input[value=v]'); pg.click('#ihoGo')
    pg.wait_for_selector('#ihoBox h3:has-text("Handed to")')
    calls = pg.evaluate("window.__calls.filter(c=>c.action==='handover').slice(-2)")
    ck('Katlin is busy then: asked "hand it over anyway?", then sent again with force', 'Hand it over anyway?' in (pg.evaluate("window.__confirm") or '') and calls[0]['force'] is False and calls[1]['force'] is True, calls)
    ck('no page errors', not errs, errs)
    ck('no em dash in the file', '—' not in JS)
    b.close()
fails = 0
for n, ok, note in res:
    print(('PASS · ' if ok else 'FAIL · ') + n + ('' if ok else '  ' + str(note)[:400])); fails += 0 if ok else 1
print(f'{len(res) - fails} / {len(res)}'); raise SystemExit(1 if fails else 0)

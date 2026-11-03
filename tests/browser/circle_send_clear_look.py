"""Family Circle "Send an update" (2026-11-02, after "Sent to 0 of a client's circle"). Offline: the real fcCompose /
fcPreview / fcSend / fcResult from index.html on a bare page with a stand-in server; made-up numbers. Proves: before Send,
each person shows how the message reaches them, and an AxisCare number not yet confirmed gets a "Yes, this is their own
number" tick; a ticked number is confirmed (family-app-office confirm_phone) before the send; after the send, who got it
and who did not, with the reason, never a bare "Sent to 0"; after 9 PM the box says nothing can go now, and the server's
own words are shown when it refuses."""
import sys, re, json, pathlib, tempfile
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
HTML = (ROOT / 'index.html').read_text()
def fn(name, kw='function'):
    m = re.search(r'^(?:async )?' + kw + r' ' + name + r'\b.*?^}\n', HTML, re.S | re.M)
    assert m, name; return m.group(0)
CODE = '\n'.join([re.search(r'^const FC_TEXT_WORDS = .*?;\n', HTML, re.M).group(0)] + [fn(n) for n in ['fcCompose', 'fcChangeText', 'fcPreview', 'fcResult', 'fcSend']])
PEOPLE = [{'id': 'a', 'name': 'Walt Brennan', 'phone': '360-555-0141', 'text': 'unconfirmed', 'email': True},
          {'id': 'b', 'name': 'Gary Brennan', 'phone': '417-555-0185', 'text': 'unconfirmed', 'email': True},
          {'id': 'c', 'name': 'Neil Brennan', 'phone': '417-555-0125', 'text': 'no_consent', 'email': False}]
PAGE = r"""<!doctype html><html><head><meta charset="utf-8"><style>:root{--red:#b91c1c;--bg:#f6f9fd;--border:#ddd}</style></head><body>
<div id="fcpick_C1"></div><div id="fcbox_C1" style="display:none"><textarea id="fcmsg_C1"></textarea><div id="fcwho_C1"></div><div id="fcppl_C1"></div>
<button id="send" onclick="fcSend('C1',this)">Send to the circle</button><div id="fcerr_C1" style="display:none"></div></div><div id="fcres_C1" style="display:none"></div>
<script>
window.__calls=[]; window.__mode=%MODE%; var ME={ name:'Samantha Troutman' };
var FC=[{ id:'C1', client_name:'Walt Brennan', axiscare_client_id:'13' }];
var FC_CONTACTS={ C1:[{ id:'a', name:'Walt Brennan' },{ id:'b', name:'Gary Brennan' },{ id:'c', name:'Neil Brennan' }] };
var FC_PROFILES=[], FC_PROFILES_ERR='';
function escapeHtmlComms(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
async function ccConfirm(t){ window.__confirmText=t; return true; }
function ccToast(t){ window.__toast=t; }
Element.prototype.scrollIntoView=function(){};
async function callAction(fn,b){ window.__calls.push([fn,b]);
  if(fn==='family-app-office') return { status:200, data:{ ok:true, on:true } };
  return { status:200, data:{ ok:true, dry:true, people:%PEOPLE%, in_hours:window.__mode!=='late' } }; }
var sb={ functions:{ invoke: async function(fn,o){ window.__calls.push([fn+':send',o.body]);
  if(window.__mode==='late') return { data:null, error:{ message:'Edge Function returned a non-2xx status code', context:{ json: async function(){ return { error:'Nothing was sent. Family Circle messages go out between 8 AM and 9 PM. Send it after 8 AM, or call the family.' }; } } } };
  if(window.__mode==='all') return { data:{ ok:true, reached:3, of:3, people:[{ name:'Walt Brennan', reached:true, why:'' },{ name:'Gary Brennan', reached:true, why:'' },{ name:'Neil Brennan', reached:true, why:'' }] }, error:null };
  return { data:{ ok:true, reached:1, of:3, people:[
    { name:'Walt Brennan', reached:true, why:'' },
    { name:'Gary Brennan', reached:false, why:"number isn't confirmed yet, asked not to get emails" },
    { name:'Neil Brennan', reached:false, why:'texts not OK, no email' }] }, error:null }; } } };
%CODE%
</script></body></html>"""
def run(b, mode):
    pg = b.new_page(viewport={'width': 900, 'height': 900}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    page = PAGE.replace('%MODE%', json.dumps(mode)).replace('%PEOPLE%', json.dumps(PEOPLE)).replace('%CODE%', CODE)
    pg.route('**/*', lambda r: r.fulfill(status=200, body=page, content_type='text/html') if r.request.url.startswith('http://fc.local/') else r.abort())
    pg.goto('http://fc.local/'); pg.evaluate("fcCompose('C1','update')"); pg.wait_for_timeout(200)
    pg.fill('#fcmsg_C1', 'Hello! Angiel is coming instead today.')
    return pg, errs
R = []; ok = lambda n, c, d='': R.append(['PASS' if c else 'FAIL', n, d])
with sync_playwright() as pw:
    b = pw.chromium.launch()
    pg, errs = run(b, 'some'); t = pg.inner_text('#fcppl_C1')
    ok('before Send: the server is asked, as a preview only', pg.evaluate('window.__calls')[0] == ['circle-send', {'circle_id': 'C1', 'kind': 'update', 'body': 'preview', 'dry': True}])
    ok('before Send: each person and how it reaches them', 'Walt Brennan' in t and 'Neil Brennan' in t and 'texts not OK' in t and 'no email' in t, t)
    ok('an AxisCare number not confirmed: a tick "Yes, <number> is Walt\'s own number", unticked', "Yes, 360-555-0141 is Walt's own number" in t
       and pg.evaluate("document.querySelectorAll('.fc-confirm').length") == 2 and pg.evaluate("document.querySelectorAll('.fc-confirm:checked').length") == 0, t)
    ok('the old guessed count is gone', 'Goes to' not in pg.inner_text('#fcwho_C1') and 'Replies come to the office line' in pg.inner_text('#fcwho_C1'))
    pg.check('.fc-confirm[data-id="a"]'); pg.click('#send'); pg.wait_for_timeout(300)
    calls = pg.evaluate('window.__calls')
    ok('the ticked number is confirmed first (once, only Walt), then the message is sent', calls[1] == ['family-app-office', {'action': 'confirm_phone', 'contact_id': 'a', 'on': True}]
       and calls[2][0] == 'circle-send:send' and len(calls) == 3, calls)
    ok('the "are you sure" names whose number you are confirming', 'confirming the number for Walt Brennan' in pg.evaluate('window.__confirmText'))
    r = pg.inner_text('#fcres_C1')
    ok('after: "Sent to 1 of 3" names Walt, and each person missed with the reason', 'Sent to 1 of 3' in r and 'Walt Brennan' in r
       and "Not sent to Gary Brennan: number isn't confirmed yet, asked not to get emails." in r and 'Not sent to Neil Brennan: texts not OK, no email.' in r, r)
    ok('after: what to do next, and the box is closed so it is not sent twice', 'Call each of them' in r and pg.evaluate("document.getElementById('fcbox_C1').style.display") == 'none', r)
    pg.screenshot(path=str(pathlib.Path(tempfile.gettempdir()) / 'circle_send_clear_result.png')); ok('no page errors', not errs, errs); pg.close()

    pg, errs = run(b, 'none_reached')
    pg.evaluate("""sb.functions.invoke=async function(){ return { data:{ ok:true, reached:0, of:3, people:[{ name:'Walt Brennan', reached:false, why:"number isn't confirmed yet, the email was held" }] }, error:null }; }""")
    pg.click('#send'); pg.wait_for_timeout(200); r = pg.inner_text('#fcres_C1')
    ok('nobody reached: says "Nobody got this message." with the reason, never "Sent to 0"', 'Nobody got this message.' in r and 'Sent to 0' not in r and "number isn't confirmed yet" in r, r)
    pg.close()

    pg, errs = run(b, 'all'); pg.click('#send'); pg.wait_for_timeout(200)
    ok('everyone reached: a short "Sent to everyone" note', pg.evaluate('window.__toast') == "Sent to everyone in Walt Brennan's circle." and 'Sent to 3 of 3' in pg.inner_text('#fcres_C1'))
    pg.close()

    pg, errs = run(b, 'late'); t = pg.inner_text('#fcppl_C1')
    ok('after 9 PM: the box says nothing can go now, before Send', 'It is after 9 PM.' in t and 'between 8 AM and 9 PM' in t, t)
    pg.click('#send'); pg.wait_for_timeout(200); e = pg.inner_text('#fcerr_C1')
    ok("after 9 PM: the server's own words are shown, not \"non-2xx\"", e.startswith('Nothing was sent. Family Circle messages go out between 8 AM and 9 PM') and 'non-2xx' not in e, e)
    ok('no page errors', not errs, errs); pg.close(); b.close()
ok('no em dash in the new words', '—' not in CODE)
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else str(d)[:600])
print(sum(r[0] == 'PASS' for r in R), '/', len(R)); sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)

"""Google review asks in the Feedback tab (2026-11-11, her ask: "be able to send out from there and also track who we've sent
to and who has made the review"). The real page, offline, with the review-send service played in the page: the counts, the
current clients not asked in 90 days, who in the family can get a text and why not, the editable text with the length
check, Send, the owner's "send anyway", daytime only, the sent list (opened, stars, tapped Google, Google review), marking
by hand, and the star card saying which text it came from. (PORT=<port> python3 tests/browser/review_send_look.py)"""
from playwright.sync_api import sync_playwright
import os
HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, 'client_journey_look.py')).read()
ns = {'__file__': os.path.join(HERE, 'client_journey_look.py')}; exec(src.split('with sync_playwright() as pw:')[0], ns)
STUB, DATA = ns['STUB'], ns['DATA']
FAKE = r"""
(()=>{
  const W=window;
  W.__rs={ calls:[], in_hours:true, owner:false,
    clients:[
      { ax:'10', name:'Hilda Happy', cc:'Krystal Land', last_sent_at:null, recent:false, reviewed:false, people:[
        { id:'a', name:'Rosa Diaz', relationship:'Daughter', main:true, is_client:false, phone_last4:'0101', can_text:true, why:'' },
        { id:'c', name:'Tom Happy', relationship:'Son', main:false, is_client:false, phone_last4:'0103', can_text:false, why:'texts not OK' },
        { id:'b', name:'Hilda Happy', relationship:'Other', main:false, is_client:true, phone_last4:'0102', can_text:true, why:'' }] },
      { ax:'11', name:'Carl Match', cc:'Katlin Haraldson', last_sent_at:new Date(Date.now()-20*864e5).toISOString(), recent:true, reviewed:true, people:[
        { id:'e', name:'Jan Match', relationship:'Wife', main:true, is_client:false, phone_last4:'0111', can_text:true, why:'' }] },
      { ax:'12', name:'Nora None', cc:null, last_sent_at:null, recent:false, reviewed:false, people:[] }],
    sends:[
      { id:'s1', ax:'11', client:'Carl Match', to:'Jan Match', relationship:'Wife', by:'Katlin Haraldson', sent_at:new Date(Date.now()-20*864e5).toISOString(), text:'sent',
        opened_at:new Date(Date.now()-19*864e5).toISOString(), rating:5, rated_at:new Date(Date.now()-19*864e5).toISOString(), google_clicked_at:new Date(Date.now()-19*864e5).toISOString(),
        review:'left', review_how:'google', review_name:'Jan M.', review_stars:5 },
      { id:'s2', ax:'14', client:'Opal Open', to:'Ed Open', relationship:'Son', by:'Krystal Land', sent_at:new Date(Date.now()-5*864e5).toISOString(), text:'sent', opened_at:null, rating:null },
      { id:'s3', ax:'15', client:'Lou Low', to:'Ann Low', relationship:'Daughter', by:'Krystal Land', sent_at:new Date(Date.now()-3*864e5).toISOString(), text:'sent', opened_at:new Date().toISOString(), rating:2 }] };
  const R=W.__rs;
  const counts=()=>{ const s=R.sends.filter(x=>x.text==='sent'); return { sent:s.length, opened:s.filter(x=>x.opened_at).length, rated:s.filter(x=>x.rating).length, happy:s.filter(x=>x.rating>=4).length,
    google_tapped:s.filter(x=>x.google_clicked_at).length, reviewed:s.filter(x=>x.review==='left').length }; };
  const of=W.fetch; W.fetch=async(u,o)=>{ const s=String(u);
    if(/review-send/.test(s)){ const b=JSON.parse(o.body); R.calls.push(b); let out={}, st=200;
      if(b.action==='list') out={ ok:true, owner:R.owner, in_hours:R.in_hours, again_days:90, clients:JSON.parse(JSON.stringify(R.clients)), sends:JSON.parse(JSON.stringify(R.sends)), counts:counts() };
      if(b.action==='draft'){ const p=R.clients.find(c=>c.ax===b.client_ax).people.find(p=>p.id===b.contact_id);
        out={ ok:true, message:'Hi '+p.name.split(' ')[0]+', this is Krystal at Caring Companions. Thank you for trusting us to care for '+(p.is_client?'you':'Hilda')+'. Would you tell us how we are doing? It takes a minute: {link}' }; }
      if(b.action==='send'){ const c=R.clients.find(x=>x.ax===b.client_ax), p=c.people.find(x=>x.id===b.contact_id);
        if(c.recent && !(b.again&&R.owner)){ out={ outcome:'recent', error:c.name+"'s family was asked in the last 90 days."+(R.owner?' Press Send again to send anyway.':' An owner can send again.') }; st=422; }
        else { R.sends.unshift({ id:'n'+R.sends.length, ax:c.ax, client:c.name, to:p.name, relationship:p.relationship, by:'Krystal Land', sent_at:new Date().toISOString(), text:'sent' });
          c.recent=true; c.last_sent_at=new Date().toISOString(); out={ outcome:'sent' }; } }
      if(b.action==='mark'){ const x=R.sends.find(y=>y.id===b.id); x.review=b.review; x.review_how=b.review?'by_hand':null; out={ outcome:'recorded' }; }
      return new Response(JSON.stringify(out),{status:st}); }
    return of(u,o); };
})();
"""
T = r"""async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  window.__as('krystal@mo-care.com','Krystal Land');
  window.ccConfirm=async()=>true;
  DATA.feedback=[{ id:'f1', at:new Date().toISOString(), kind:'rating', rating:5, who:'client family', name:'', message:'Maria is wonderful', seen:false, sent_to:'Rosa Diaz', client:'Hilda Happy', review_send_id:'s9' }];
  const V=window.__rs; switchTab('feedback'); await sleep(700);
  const box=()=>document.getElementById('rsBox'), txt=()=>box().innerText;
  ok('the Feedback tab opens with "Google review asks" at the top, above the star cards', box() && /Google review asks/.test(txt()) && box().compareDocumentPosition(document.getElementById('fbList')) & Node.DOCUMENT_POSITION_FOLLOWING, txt());
  ok('...the counts: texted, opened, gave stars, 4 or 5 stars, tapped Google, reviewed', /3\s*texted/.test(txt()) && /2\s*opened the link/.test(txt()) && /2\s*gave stars/.test(txt()) && /1\s*4 or 5 stars/.test(txt()) && /1\s*tapped Google/.test(txt()) && /1\s*reviewed/.test(txt()), txt());
  const cl=()=>document.getElementById('rsClients').innerText;
  ok('...first, current clients NOT asked in 90 days (Hilda, Nora), not Carl', /Hilda Happy/.test(cl()) && /Nora None/.test(cl()) && !/Carl Match/.test(cl()), cl());
  ok('...with their Care Coordinator, and "never" asked', /Krystal Land/.test(cl()) && /never/.test(cl()));
  const sel=document.getElementById('rsWho_10');
  ok('...the family picker: Rosa first, Tom shown but greyed out with why ("texts not OK"), only the last 4 of numbers', sel && sel.options[0].text.includes('Rosa Diaz (Daughter)') && sel.options[0].text.includes('…0101') && [...sel.options].some(o=>o.disabled && /Tom Happy.*texts not OK/.test(o.text)), sel && [...sel.options].map(o=>o.text));
  ok('...a family with no Family Circle says so and has no Send', /No Family Circle on file/.test(cl()) && !document.querySelector('#rsClients tr:nth-child(2) button'));
  await window.shot('feedback_tab');
  [...box().querySelectorAll('button')].find(b=>/Write text/.test(b.textContent)).click(); await sleep(400);
  const msg=()=>document.getElementById('rsMsg');
  ok('Write text: the draft is ready to edit, to Rosa, and says it goes from the office line', msg() && /^Hi Rosa, this is Krystal/.test(msg().value) && /\{link\}/.test(msg().value) && /To Rosa Diaz/.test(txt()) && /\(417\) 234-8494/.test(txt()), msg() && msg().value);
  ok('...the length check counts the link (under 320)', /^\d+ of 320 letters with the link$/.test(document.getElementById('rsLen').textContent) && +document.getElementById('rsLen').textContent.split(' ')[0] < 320, document.getElementById('rsLen').textContent);
  msg().value='x'.repeat(320); window.rsLen();
  ok('...too long turns red', document.getElementById('rsLen').style.color.includes('red'));
  msg().value='Hi Rosa, this is Krystal. How are we doing? {link}'; window.rsLen();
  await window.shot('feedback_write');
  document.getElementById('rsSendBtn').click(); await sleep(600);
  const sc=V.calls.find(c=>c.action==='send');
  ok('Send: sends the EDITED text to Rosa for Hilda', sc && sc.client_ax==='10' && sc.contact_id==='a' && sc.message==='Hi Rosa, this is Krystal. How are we doing? {link}', sc);
  ok('...and Rosa is now in "Texted so far", not yet opened', /Rosa Diaz/.test(document.getElementById('rsSent').innerText) && /not yet/.test(document.getElementById('rsSent').innerText) && !/Hilda Happy/.test(cl()), document.getElementById('rsSent').innerText);
  const sent=document.getElementById('rsSent').innerText;
  ok('the sent list shows a Google match ("On Google 5★ as Jan M."), a low rating ("call them", Google not offered)', /On Google 5★ as Jan M\./.test(sent) && /call them/.test(sent) && /not offered/.test(sent), sent);
  const edRow=[...document.querySelectorAll('#rsSent tr')].find(r=>/Ed Open/.test(r.innerText));
  [...edRow.querySelectorAll('button')].find(b=>/Left one/.test(b.textContent)).click(); await sleep(500);
  ok('by hand: "Left one" for Ed is recorded and shown as marked, with undo', V.calls.some(c=>c.action==='mark'&&c.id==='s2'&&c.review==='left') && /Left one \(marked\)/.test([...document.querySelectorAll('#rsSent tr')].find(r=>/Ed Open/.test(r.innerText)).innerText));
  [...box().querySelectorAll('button')].find(b=>/All current clients/.test(b.textContent)).click(); await sleep(200);
  ok('"All current clients" includes Carl, marked reviewed and asked within 90 days', /Carl Match/.test(cl()) && /reviewed/.test(cl()) && /within 90 days/.test(cl()), cl());
  [...document.querySelectorAll('#rsClients tr')].find(r=>/Carl Match/.test(r.innerText)).querySelector('button').click(); await sleep(400);
  document.getElementById('rsSendBtn').click(); await sleep(500);
  ok('a coordinator sending to a family asked in 90 days is told an owner can send again; nothing sent', /An owner can send again/.test(txt()) && V.calls.filter(c=>c.action==='send').length===2 && !V.calls.some(c=>c.action==='send'&&c.again), txt());
  V.owner=true; await window.rsMount(); await sleep(500);
  [...box().querySelectorAll('button')].find(b=>/All current clients/.test(b.textContent)).click(); await sleep(200);
  [...document.querySelectorAll('#rsClients tr')].find(r=>/Carl Match/.test(r.innerText)).querySelector('button').click(); await sleep(400);
  document.getElementById('rsSendBtn').click(); await sleep(700);
  ok('...an owner is asked "send anyway?" and it sends with again', V.calls.some(c=>c.action==='send'&&c.again===true&&c.client_ax==='11'), V.calls.filter(c=>c.action==='send'));
  V.in_hours=false; await window.rsMount(); await sleep(500);
  [...box().querySelectorAll('button')].find(b=>/All current clients/.test(b.textContent)).click(); await sleep(200);
  [...document.querySelectorAll('#rsClients tr')].find(r=>/Nora|Hilda/.test(r.innerText)).querySelector('button')?.click(); await sleep(400);
  ok('after 9 PM: no Send button, "Review texts go out 8 AM to 9 PM"', !document.getElementById('rsSendBtn') && /8 AM to 9 PM/.test(txt()), txt());
  window.rsClose(); renderFeedback(); await sleep(200);
  ok('the star card says it came from our review text to Rosa (Hilda\'s family)', /From our review text to Rosa Diaz \(Hilda Happy's family\)/.test(document.getElementById('fbList').innerText), document.getElementById('fbList').innerText);
  document.getElementById('rsQ').value='jan'; window.rsFind('jan'); await sleep(100);
  ok('search finds by family member in the sent list', /Jan Match/.test(document.getElementById('rsSent').innerText) && !/Ed Open/.test(document.getElementById('rsSent').innerText));
  ok('no long dashes anywhere in the section', !/—/.test(txt()));
  return R; }"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []; shots = {}
    out = os.environ.get('SHOT_DIR', '')
    for W, H in ((1280, 1000), (390, 844)):
        pg = b.new_page(viewport={'width': W, 'height': H})
        pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
        pg.route('**/*', lambda r: r.abort() if 'supabase.co' in r.request.url else r.continue_())
        pg.goto('http://localhost:' + os.environ.get('PORT', '8765') + '/index.html?proof=reviewsend'); pg.wait_for_timeout(1500)
        pg.evaluate('s=>(0,eval)(s)', STUB); pg.evaluate('s=>(0,eval)(s)', DATA); pg.evaluate('s=>(0,eval)(s)', FAKE)
        pg.evaluate("()=>{ window.shot=async()=>{}; }")
        R = pg.evaluate(T)
        if out:   # the finished tab, then the text box open for Rosa
            pg.evaluate("async()=>{ window.__rs.in_hours=true; window.__rs.owner=false; const q=document.getElementById('rsQ'); if(q){ q.value=''; window.rsFind(''); } window.RS_STATE.filter='due'; window.RS_STATE.q=''; await window.rsMount(); }")
            pg.wait_for_timeout(600); pg.locator('#rsBox').screenshot(path=os.path.join(out, f'rs_tab_{W}.png'))
            pg.evaluate("async()=>{ window.rsFilter('all'); await window.rsOpen('10'); }"); pg.wait_for_timeout(800)
            pg.locator('#rsBox').screenshot(path=os.path.join(out, f'rs_write_{W}.png'))
        if W != 1280: R = [[r[0], '(phone) ' + r[1], r[2]] for r in R]
        shots[W] = R; pg.close()
    R = shots[1280] + shots[390]
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

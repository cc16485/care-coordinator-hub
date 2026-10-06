"""Tell the caregiver from the Kind Words jar (2026-10-06, Samantha: "send from the real office number, send it, also put in
the caregivers profile under performance if they got a compliment"). The real Hub page, offline, made-up people; the
kind-tell server is a pretend one; nothing is sent. (python3 tests/browser/kind_tell_look.py, static server on 8765)"""
import re
from playwright.sync_api import sync_playwright
src = open('/Users/samantha/Claude/Projects/cc-hub-live/tests/browser/my_desk_stage6a_look.py').read()
STUB = re.search(r'STUB = r"""(.*?)"""', src, re.S).group(1)
EXTRA = r"""
(()=>{
  const W=window;
  W.__kwords.push({ id:'kA', quote:'Ariel is the best part of my week (fake)', who:'Ruth', about:'Ariel Smith', about_role:'caregiver', source:'shift_note', said_on:'2026-10-05', status:'kind', created_by:'p_s' });
  W.__tells=[{ id:'k1', tells:[{ id:'t1', at:'2026-10-05T15:00:00Z', by:'Samantha Troutman', caregiver_ax:'77', caregiver:'Maria Rivera', text:'x' }] }];
  W.__ktCalls=[];
  (0,eval)(`sb={ from:(t)=>{ const st={t, f:{}}; const p={ select(){return p;}, eq(c,v){ st.f[c]=v; return p;}, order(){return p;}, limit(){return p;}, neq(){return p;}, gte(){return p;},
      maybeSingle:async()=>({ data: t==='app_data'&&st.f.key==='kind_tells' ? { data:window.__tells } : null, error:null }),
      then(a){ const rows = t==='kind_words' ? window.__kwords.filter(k=>k.status==='kind'&&k.about_role==='caregiver') : []; return Promise.resolve({data:JSON.parse(JSON.stringify(rows)),error:null}).then(a); } }; return p; },
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async(n)=>{ window.__fn.push(n); return {data:null,error:null}; } },
    auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } }; CONFIG.supabase_url='https://x.supabase.co'; CONFIG.supabase_anon_key='anon';`);
  const f0=W.fetch;
  W.fetch=async(u,o)=>{ u=String(u); if(/kind-tell/.test(u)){ const b=JSON.parse(o.body); W.__ktCalls.push(b);
      if(b.action==='draft') return new Response(JSON.stringify({ live:true, kind:{}, caregiver:{ ax:'88', name:'Ariel Smith', first:'Ariel', phone_last4:'0101', opt_out:[] }, candidates:[], told:[], message:'Hi Ariel, it\'s Caring Companions. Ruth said this about you: "Ariel is the best part of my week (fake)" Thank you for the care you give. Krystal' }),{status:200});
      if(b.action==='send') return new Response(JSON.stringify({ outcome:'sent', tell:{ id:b.send_id } }),{status:200}); }
    return f0(u,o); };
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  window.dkStore=window.__fakeStore;
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Land', shift:'day' };");
  switchTab('mydesk'); await sleep(500);
  const W=()=>document.getElementById('dkWrap'), lastPop=()=>[...document.querySelectorAll('.ccpop')].pop();
  W().querySelector('.dk-jar').click(); await sleep(400);
  let p=lastPop();
  const slipA=[...p.querySelectorAll('.dk-jslip')].find(x=>/Ariel is the best/.test(x.innerText)), slip1=[...p.querySelectorAll('.dk-jslip')].find(x=>/Maria is the best/.test(x.innerText));
  ok('a jar slip about a caregiver has "Tell Ariel"; one about the company does not', slipA && /Tell Ariel/.test(slipA.innerText) && ![...p.querySelectorAll('.dk-jslip')].find(x=>/Kind, on time/.test(x.innerText)).querySelector('[data-j="tell"]'));
  ok('a slip that was already sent says "Told Maria, Oct 5"', slip1 && /Told Maria, ([A-Z][a-z]{2}, )?Oct 5/.test(slip1.innerText), slip1 && slip1.innerText);
  slipA.querySelector('[data-j="tell"]').click(); await sleep(400);
  p=lastPop();
  ok('Tell opens the text from the office number: to Ariel, ending 0101, the words ready to edit, Send', /Tell Ariel/.test(p.innerText) && /From the office number/.test(p.innerText) && /To Ariel Smith · ending 0101/.test(p.innerText) && /best part of my week/.test(p.querySelector('#dkTell').value) && !!p.querySelector('[data-c="send"]'), p.innerText.slice(0,500));
  ok('...it asked the server for the draft, and nothing was sent yet', window.__ktCalls.length===1 && window.__ktCalls[0].action==='draft' && window.__ktCalls[0].kind_word_id==='kA');
  p.querySelector('#dkTell').value='Hi Ariel! Ruth said you are the best part of her week. Thank you. Krystal'; p.querySelector('[data-c="send"]').click(); await sleep(300);
  const sent=window.__ktCalls.find(c=>c.action==='send');
  ok('Send: the edited words go, once, with the caregiver it is about', sent && sent.message==='Hi Ariel! Ruth said you are the best part of her week. Thank you. Krystal' && sent.caregiver_ax==='88' && /^kt-/.test(sent.send_id) && /Sent to Ariel from the office number/.test(document.getElementById('dkToast').innerText));
  // Performance: compliments
  (0,eval)("CGD.openId='88';"); let host=document.getElementById('cgdKind'); if(!host){ host=document.createElement('div'); host.id='cgdKind'; document.body.appendChild(host); }
  window.__tells.push({ id:'kA', tells:[{ id:'t2', at:'2026-10-06T16:00:00Z', by:'Krystal Land', caregiver_ax:'88', caregiver:'Ariel Smith', text:'y' }] });
  await cgdKindMount({ id:'88', first:'Ariel', last:'Smith' }); await sleep(100);
  ok('the caregiver\'s Performance shows their compliments, who said it, when, and that they were told', /Compliments/.test(host.innerText) && /Ariel is the best part of my week/.test(host.innerText) && /Ruth · Oct 5, 2026 · told Ariel Oct 6, 2026/.test(host.innerText) && !/Maria is the best/.test(host.innerText), host.innerText);
  await cgdKindMount({ id:'77', first:'Maria', last:'Rivera' }); 
  (0,eval)("CGD.openId='77';"); await cgdKindMount({ id:'77', first:'Maria', last:'Rivera' }); await sleep(50);
  ok('..."Maria R." on a kind word is matched to Maria Rivera', /Maria is the best thing/.test(host.innerText), host.innerText);
  (0,eval)("CGD.openId='99';"); await cgdKindMount({ id:'99', first:'Nobody', last:'Here' }); await sleep(50);
  ok('...someone with none says so', /No kind words about Nobody yet/.test(host.innerText));
  ok('nothing else was sent', window.__fn.length===0 && window.__ktCalls.filter(c=>c.action==='send').length===1);
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width':1400,'height':1000})
    pg.route('**/*', lambda r: r.abort() if ('supabase.co' in r.request.url or 'fonts.g' in r.request.url) else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=kindtell'); pg.wait_for_timeout(1200)
    pg.evaluate(STUB); pg.evaluate(EXTRA); R = pg.evaluate(T)
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

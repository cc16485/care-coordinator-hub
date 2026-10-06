"""My Desk, Stage 6b: kind words the shift-note reader found wait in the jar under "Waiting for a yes" for owners and
coordinators. Uses Stage 6a's set-up (the real Hub page, offline, made-up people; pretend stores). Nothing is saved or sent.
(python3 tests/browser/my_desk_stage6b_look.py, with the static server on 8765)"""
import os, re
from playwright.sync_api import sync_playwright
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'my_desk_stage6a_look.py')).read()
STUB = re.search(r'STUB = r"""(.*?)"""', src, re.S).group(1); EXTRA = re.search(r'EXTRA = r"""(.*?)"""', src, re.S).group(1)
WAIT = r"""
(()=>{
  const W=window, clone=x=>JSON.parse(JSON.stringify(x)), F=W.__fakeStore;
  W.__kwords.push({ id:'s1', quote:'you are the best part of my week (fake)', who:'Ruth', about:'Cara Giver', about_role:'caregiver', source:'shift_note', said_on:'2026-10-05', status:'suggested', suggested_by:'care-notes', link:{ type:'client', ax:'601', name:'Ruth Kind (fake)' } },
                  { id:'s2', quote:'thank you for taking such good care of mom (fake)', who:"Faye's family", about:'Ben Helper', about_role:'caregiver', source:'shift_note', said_on:'2026-10-05', status:'suggested', suggested_by:'care-notes', link:null },
                  { id:'s3', quote:'she always makes me laugh (fake)', who:'Nora', about:'Di Aide', about_role:'caregiver', source:'shift_note', said_on:'2026-10-04', status:'suggested', suggested_by:'care-notes', link:null });
  W.__decider=true; W.__decided=[]; W.__gone=null;
  F.waiting=async()=>W.__decider ? clone(W.__kwords.filter(k=>k.status==='suggested')) : [];
  F.waitCount=async()=>W.__decider ? W.__kwords.filter(k=>k.status==='suggested').length : 0;
  F.decide=async(id, yes)=>{ W.__decided.push([id, yes]);
    if(W.__gone===id){ const k=W.__kwords.find(x=>x.id===id); k.status='kind'; throw new Error('That suggestion is not waiting any more.'); }
    const k=W.__kwords.find(x=>x.id===id); k.status=yes?'kind':'not_kind'; if(yes) W.__kdrops.push({ kind_word_id:id, person_id:'p_k', state:'tucked' }); return k.status; };
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,700)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  window.dkStore=window.__fakeStore;
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  (0,eval)("ME={ email:'krystal@mo-care.com', name:'Krystal Land', shift:'day' };");
  window.__kdrops.length=0;
  switchTab('mydesk'); await sleep(500);
  const W=()=>document.getElementById('dkWrap'), lastPop=()=>[...document.querySelectorAll('.ccpop')].pop();
  const badge=()=>W().querySelector('.dk-jar .dk-jarwait');
  ok('a coordinator sees "3 waiting" on the jar', badge() && badge().textContent==='3 waiting', badge() && badge().textContent);
  W().querySelector('.dk-jar').click(); await sleep(300);
  let p=lastPop(), box=p.querySelector('.dk-waitbox');
  ok('the jar opens with "Waiting for a yes" above the jar\'s slips', box && /Waiting for a yes/.test(box.innerText) && box.querySelectorAll('[data-wid]').length===3 && p.querySelectorAll('.dk-jarwall .dk-jslip').length===3);
  ok('...it says where they came from and that nothing happens without a yes', /found these in caregivers' shift notes/.test(box.innerText) && /Nothing is in the jar or on anyone's desk until you say yes/.test(box.innerText) && /Nobody is texted/.test(box.innerText));
  const s1=box.querySelector('[data-wid="s1"]');
  ok('...each shows the words, who said them, about whom, Shift note and the day', /best part of my week/.test(s1.innerText) && /Ruth, about Cara Giver \(caregiver\)/.test(s1.innerText) && /Shift note/.test(s1.innerText));
  ok('...with Yes, that\'s kind / Not this one, and a paperclip to the client', /Yes, that's kind/.test(s1.innerText) && /Not this one/.test(s1.innerText) && /Ruth Kind/.test(s1.querySelector('[data-w="open"]').innerText) && !box.querySelector('[data-wid="s2"] [data-w="open"]'));
  s1.querySelector('[data-w="yes"]').click(); await sleep(600);
  p=lastPop();
  ok('Yes: decided as kind (the database tucks it under the right desks)', JSON.stringify(window.__decided[0])==='["s1",true]' && !p.querySelector('[data-wid="s1"]'));
  ok('...it shows in the jar right away, said yes by you', /best part of my week/.test(p.querySelector('.dk-jarwall').innerText) && /Said yes by you/.test(p.querySelector('.dk-jarwall').innerText));
  ok('...and it arrives tucked under my page', W().querySelector('.dk-kindtuck') && W().querySelector('.dk-kn').textContent==='1' && /Into the jar, and tucked/.test(document.getElementById('dkToast').innerText));
  ok('...the jar now says 2 waiting', badge() && badge().textContent==='2 waiting');
  p.querySelector('[data-wid="s2"] [data-w="no"]').click(); await sleep(300);
  ok('Not this one: left out of the jar, off the list', JSON.stringify(window.__decided[1])==='["s2",false]' && !p.querySelector('[data-wid="s2"]') && !/take such good care/.test(p.querySelector('.dk-jarwall').innerText) && /Left out of the jar/.test(document.getElementById('dkToast').innerText));
  window.__gone='s3'; p.querySelector('[data-wid="s3"] [data-w="yes"]').click(); await sleep(300);
  ok('someone else already answered: it says so and the list empties (the box goes)', /Someone already answered that one/.test(document.getElementById('dkToast').innerText) && !p.querySelector('.dk-waitbox'));
  ok('...and the badge is gone', !badge());
  try{ ccPopClose(); }catch(e){}
  // someone who isn't an owner or coordinator: the database gives them nothing to see
  window.__decider=false; window.__kwords.push({ id:'s4', quote:'x (fake)', who:'x', status:'suggested', source:'shift_note' });
  await window.DKX.load(true); await sleep(200);
  ok('someone who can\'t decide sees no badge', !badge());
  W().querySelector('.dk-jar').click(); await sleep(300);
  ok('...and no waiting list in the jar', !lastPop().querySelector('.dk-waitbox'));
  try{ ccPopClose(); }catch(e){}
  // Settings > My Desk: the kind-words switch (the same one as the Owners Hub Admin page)
  let set=document.getElementById('dkSet'); if(!set){ set=document.createElement('div'); set.id='dkSet'; document.body.appendChild(set); }
  DATA.ops_settings.care_notes_flag_live=false; dkSetFill();
  let kb=[...set.querySelectorAll('button')].find(x=>/Turn on/.test(x.textContent));
  ok('Settings > My Desk: the switch can\'t go on while shift-note flags aren\'t running', kb && kb.disabled && /Can't turn on yet: shift-note flags are not running/.test(set.innerText));
  DATA.ops_settings.care_notes_flag_live=true; dkSetFill(); const asked=[]; window.confirm=t=>{ asked.push(t); return true; };
  [...set.querySelectorAll('button')].find(x=>/Turn on/.test(x.textContent)).click(); await sleep(200);
  const mg=window.__merge.at(-1);
  ok('...turning it on asks first, then saves only that switch', /Turn on kind words from shift notes\?/.test(asked[0]) && /Nobody is texted or emailed/.test(asked[0]) && mg && mg.m.kind_words_suggest_live===true && JSON.stringify(mg.ch)==='["kind words from shift notes ON"]' && /On\./.test(set.innerText) && /Turn off/.test(set.innerText), [asked, mg]);
  [...set.querySelectorAll('button')].find(x=>/Turn off/.test(x.textContent)).click(); await sleep(200);
  ok('...and off again', window.__merge.at(-1).m.kind_words_suggest_live===false && /Off\./.test(set.innerText));
  ok('nothing was texted or emailed', window.__fn.length===0);
  return R;
}
"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={ 'width':1400, 'height':1000 })
    pg.route('**/*', lambda r: r.abort() if ('supabase.co' in r.request.url or 'fonts.g' in r.request.url) else r.continue_())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://localhost:8765/index.html?proof=desk6b'); pg.wait_for_timeout(1200)
    pg.evaluate(STUB); pg.evaluate(EXTRA); pg.evaluate(WAIT); R = pg.evaluate(T)
    pg.evaluate("async()=>{ window.__decider=true; window.__kwords.push({ id:'s5', quote:'Mom lights up when Tia walks in (fake)', who:'Ruth', about:'Tia K.', about_role:'caregiver', source:'shift_note', said_on:'2026-10-05', status:'suggested', link:{ type:'client', ax:'77', name:'Ruth Barnes (fake)' } }); await window.DKX.load(true); await new Promise(r=>setTimeout(r,300)); }")
    pg.screenshot(path='/tmp/my_desk_stage6b.png')
    pg.evaluate("async()=>{ document.querySelector('#dkWrap .dk-jar').click(); await new Promise(r=>setTimeout(r,400)); }"); pg.screenshot(path='/tmp/my_desk_stage6b_jar.png')
    R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]]); b.close()
for r in R: print(r[0], '·', r[1], ('→ ' + r[2]) if r[2] else '')
print(f"{sum(1 for r in R if r[0]=='PASS')} / {len(R)}")
raise SystemExit(0 if all(r[0] == 'PASS' for r in R) else 1)

"""The Caregiver Preview tab (2026-10-24). The real Hub page, offline (files served from this folder), a made-up client; the
caregiver-preview server is a stand-in that follows the same rules and records what it was asked. Proves: the tab is hidden
from coordinators while the switch is off and shown to owners as practice; on = everyone sees it; status (Not started,
Changes waiting, Approved, Care plan changed: review) and who last approved; the introduction saves as a draft; the care
summary comes from the care plan with ticks (never typed) and saves as a draft; Approve, and the second-person note for a
care change; Preview as Caregiver with approved and draft side by side on a sample shift; Family & Contacts points to the tab
once the switch is on, with the corrected wording before; nothing is sent.
(python3 tests/browser/caregiver_preview_look.py; SHOTS=<dir> saves screenshots)"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parents[2]
SHOTS = os.environ.get('SHOTS')
STUB = r"""
(()=>{
  const W=window;
  W.__log={ calls:[] };
  (0,eval)(`sb={ from:()=>{ const p={ select(){return p;}, eq(){return p;}, gte(){return p;}, in(){return p;}, order(){return p;}, limit(){return p;},
      single:async()=>({ data:null, error:null }), maybeSingle:async()=>({ data:null, error:null }),
      then(a){ return Promise.resolve({data:[],error:null}).then(a); } }; return p; },
    rpc:async()=>({data:null,error:null}), functions:{ invoke:async()=>({data:null,error:null}) },
    auth:{ getSession:async()=>({data:{session:{access_token:'t'}}}) } };
    ME={ email:'krystal@mo-care.com', name:'Krystal Land' }; CC_ROLES=['care_coordinator']; CC_ROLES_CHECKED=true;`);
  W.ccConfirm=async()=>true; W.ccToast=()=>{};
  /* the stand-in server: the same rules, small */
  const ITEMS=[{key:'help:companionship',group:'help',label:'Companionship'},{key:'help:meal_prep',group:'help',label:'Meal preparation'},{key:'needs:dementia_care',group:'needs',label:"Dementia or Alzheimer's care"},{key:'level:2',group:'level',label:'Level 2'},{key:'home:cats',group:'home',label:'Cats in the home'}];
  const S=W.__S={ who:'kry', live:false, review:false, d:{about:'Ruth loves her garden.',enjoys:['Gardening']}, a:{about:'Ruth loves her garden.',enjoys:['Gardening']}, carried:true, dOn:false, aOn:false, hidden:[], aKeys:[], careBy:null, last:null, hist:[] };
  const NAMES={ kry:'Krystal Land', sam:'Samantha Troutman' };
  const view=()=>{ const iP=S.d.about!==S.a.about||S.d.enjoys.join('|')!==S.a.enjoys.join('|'), cP=S.dOn!==S.aOn||(S.dOn&&S.hidden.join()!==(S.aHidden||[]).join())||S.review;
    const widen=S.dOn&&(!S.aOn||ITEMS.filter(x=>!S.hidden.includes(x.key)).some(x=>!S.aKeys.includes(x.key)));
    const second=cP&&widen&&S.careBy===S.who;
    const label=S.review?'Care plan changed: review':(iP||cP)?'Changes waiting for approval':(S.a.about||S.aOn)?'Approved':'Not started';
    return { ok:true, live:S.live, in_axiscare:true, intro:{ draft:{...S.d}, approved:{...S.a}, carried:S.carried },
      care:{ readable:true, draft_on:S.dOn, approved_on:S.aOn, review:S.review, items:ITEMS.map(x=>({...x, draft:!S.hidden.includes(x.key), approved:S.aOn&&S.aKeys.includes(x.key)})) },
      state:{ label, tone:S.review?'review':(iP||cP)?'draft':(S.a.about||S.aOn)?'approved':'none', intro_pending:iP, care_pending:cP, care_review:S.review, carried:S.carried, last_approved:S.last },
      can:{ edit:true, approve_intro:iP, approve_care:cP&&!second, why:second?'You changed the care summary, so someone else approves it (a second look for care details).':'' },
      approvers:['Samantha','Zach','Krystal'], history:S.hist.slice().reverse(), suggestions:(S.sugg||[]).filter(x=>!x.closed), family:S.family||null }; };
  const real=W.fetch;
  W.fetch=async(url,o)=>{ url=String(url); if(!url.includes('/functions/v1/caregiver-preview')) return real(url,o);
    const b=JSON.parse(o.body); W.__log.calls.push(b); const R=(x,s)=>new Response(JSON.stringify(x),{status:s||200});
    if(b.action==='draft'){ if(S.noLife) return R({ ok:false, why:"Nothing in Ruth's Life Story yet. Add an answer on Home & Life (or ask at the next call), then try again." });
      return R({ ok:true, draft:{ ok:true, about:'Ruth taught third grade for 30 years and still loves her rose garden.', enjoys:['Rose gardening','Old movies','Cardinals baseball'], sources:[{label:'Work and life',via:'intake call',by:'Krystal Land'},{label:'Enjoys talking about or doing',via:'intake call',by:'Krystal Land'}], dropped:['Knitting'], left_out:['a health detail'] } }); }
    if(b.action==='save'){ if('about' in b){ S.d.about=b.about; } if('enjoys' in b) S.d.enjoys=b.enjoys; if('share_care' in b){ S.dOn=b.share_care; S.careBy=S.who; } if('hidden' in b){ S.hidden=b.hidden; S.careBy=S.who; }
      S.hist.push({ at:new Date().toISOString(), by:NAMES[S.who], what:'changed the draft' }); }
    if(b.action==='approve'){ const v=view(), did=[]; if(v.can.approve_intro){ S.a={...S.d}; S.carried=false; did.push('the introduction'); } if(v.can.approve_care){ S.aOn=S.dOn; S.aHidden=[...S.hidden]; S.aKeys=ITEMS.filter(x=>!S.hidden.includes(x.key)).map(x=>x.key); S.review=false; S.careBy=null; did.push('the care summary'); }
      if(!did.length) return R({ error:v.can.why||'Nothing is waiting for approval.' },409);
      S.last={ at:new Date().toISOString(), by:NAMES[S.who] }; S.hist.push({ at:S.last.at, by:NAMES[S.who], what:'approved '+did.join(' and ') }); return R({ ...view(), approved:did, note:v.can.why||null }); }
    if(b.action==='remove_photo'){ S.family.photo=null; S.hist.push({ at:new Date().toISOString(), by:NAMES[S.who], what:'removed the photo' }); }
    if(b.action==='use_family_words'){ S.d.about=S.family.about; S.d.enjoys=S.family.enjoys.slice(); S.hist.push({ at:new Date().toISOString(), by:NAMES[S.who], what:"changed About (from the family's Booking App profile)" }); }
    if(b.action==='suggestion_close'){ const x=(S.sugg||[]).find(y=>y.id===b.id); if(!x||x.closed) return R({ error:'Someone already handled that suggestion.' },409); x.closed=b.used?'used':'not_used'; }
    return R(view()); };
  DATA.ops_settings={};
})();
"""
T = r"""
async()=>{
  const R=[], ok=(n,c,d)=>R.push([c?'PASS':'FAIL',n,c?'':JSON.stringify(d===undefined?'':d).slice(0,900)]); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const L=window.__log, S=window.__S, tab=()=>document.getElementById('cgpHost').innerText, btn=document.querySelector('#cpTabs .cp-tab[data-cp="cgprev"]');
  const open=async()=>{ CGP.mount({ ax:'500', lead:null, name:'Ruth Kay' }); document.getElementById('leadProfileView').style.display='block'; cpShowTab('cgprev'); await sleep(300); };
  document.getElementById('appScreen').classList.add('on'); document.getElementById('signinScreen').style.display='none';
  CGP.mount({ ax:'500', name:'Ruth Kay' });
  ok('switch off: a care coordinator doesn\'t see the tab', btn && btn.style.display==='none');
  (0,eval)("CC_ROLES=['owner_admin']"); CGP.mount({ ax:'500', name:'Ruth Kay' });
  ok('switch off: an owner sees the tab (to try it)', btn.style.display==='');
  await open();
  let t=tab();
  ok('practice banner: caregivers don\'t see this version yet; Family & Contacts still used', /Practice\./.test(t) && /still use the About on Family & Contacts/.test(t), t.slice(0,400));
  ok('opens on what caregivers see, with the carried-over About in use', /What caregivers see about Ruth/.test(t) && /In use now: carried over from Family & Contacts/.test(t) && /Approved/.test(t) && document.getElementById('cgpAbout').value==='Ruth loves her garden.', t.slice(0,600));
  ok('says incomplete is fine', /Incomplete is fine: offers still go out with just the shift/.test(t));
  ok('the care summary explains it comes from the care plan and can\'t be typed here', /Comes from the care plan/.test(t) && /To change a need or a skill, update the care plan/.test(t) && !document.querySelector('#cgpHost textarea:not(#cgpAbout)'));
  document.getElementById('cgpAbout').value='Ruth taught third grade for 30 years and loves to laugh.'; document.getElementById('cgpEnjoys').value='Gardening, Old movies, Card games';
  [...document.querySelectorAll('#cgpHost button')].find(b=>/Save draft/.test(b.textContent)).click(); await sleep(300);
  let c=L.calls.filter(x=>x.action==='save').pop(); t=tab();
  ok('Save draft: the About and the list go to the server for this client', c && c.about.startsWith('Ruth taught') && c.enjoys.join()==='Gardening,Old movies,Card games' && c.axiscare_client_id==='500', c);
  ok('... status: Changes waiting for approval; the field says draft, not approved yet; caregivers keep the approved version', /Changes waiting for approval/.test(t) && /draft, not approved yet/i.test(t) && /keep seeing the approved version/.test(t), t.slice(0,800));
  [...document.querySelectorAll('#cgpHost button')].find(b=>/Preview as Caregiver/.test(b.textContent)).click(); await sleep(200);
  const fr=[...document.querySelectorAll('#cgpHost iframe')].map(f=>f.getAttribute('src'));
  ok('Preview as Caregiver: approved and draft side by side, on the shift page in preview mode, no open shift needed', fr.length===2 && fr[0]==='shift.html?preview=1&client=500&v=approved' && fr[1]==='shift.html?preview=1&client=500&v=draft' && /sample shift/.test(tab()), fr);
  [...document.querySelectorAll('#cgpHost button')].find(b=>/Hide preview/.test(b.textContent)).click(); await sleep(100);
  const share=[...document.querySelectorAll('#cgpHost input[type=checkbox]')].find(x=>!x.dataset.cgpk); share.checked=true; share.dispatchEvent(new Event('change')); await sleep(300);
  c=L.calls.filter(x=>x.action==='save').pop();
  ok('Share a care summary: saved as a draft', c.share_care===true);
  const boxes=[...document.querySelectorAll('#cgpHost input[data-cgpk]')];
  ok('the care plan\'s items, grouped, each with a tick (all ticked to start)', boxes.length===5 && boxes.every(x=>x.checked) && /Helps with/.test(tab()) && /Skills needed/.test(tab()) && /In the home/.test(tab()));
  const cats=boxes.find(x=>x.dataset.cgpk==='home:cats'); cats.checked=false; cats.dispatchEvent(new Event('change')); await sleep(300);
  c=L.calls.filter(x=>x.action==='save').pop();
  ok('untick an item: the hidden list is saved', JSON.stringify(c.hidden)==='["home:cats"]', c);
  (0,eval)("CC_ROLES=['care_coordinator']"); S.who='kry';
  [...document.querySelectorAll('#cgpHost button')].find(b=>/^Approve$/.test(b.textContent.trim())).click(); await sleep(400); t=tab();
  ok('Krystal approves: her introduction goes through; the care summary she turned on waits for someone else (named)', /Approved: the introduction\./.test(t) && /someone else approves it/.test(t) && /Approvers: Samantha, Zach, Krystal/.test(t), t.slice(0,900));
  S.who='sam'; await CGP.load(); [...document.querySelectorAll('#cgpHost button')].find(b=>/^Approve$/.test(b.textContent.trim())).click(); await sleep(400); t=tab();
  ok('Samantha approves the care summary: Approved, last approved by Samantha', /Approved: the care summary/.test(t) && /Last approved [A-Z][a-z]{2} \d+ by Samantha Troutman/.test(t) && /^((?!Changes waiting).)*$/s.test(t.split('Introduction')[0]), t.slice(0,600));
  ok('recent changes list who did what', /Recent changes/.test(t) && /Samantha Troutman approved the care summary/.test(t));
  S.review=true; await CGP.load(); t=tab();
  ok('care plan changed: the status says review and the care card says caregivers see no care details until approved again', /Care plan changed: review/.test(t) && /Caregivers see no care details until someone looks and approves it again/.test(t), t.slice(0,600));
  /* step 2: Draft it from the Life Story */
  S.review=false; (0,eval)("CC_ROLES=['care_coordinator']"); DATA.ops_settings={}; await CGP.load(); await sleep(50);
  ok('AI draft, switch off: a coordinator does not see the button', !/Draft it from the Life Story/.test(tab()));
  (0,eval)("CC_ROLES=['owner_admin']"); await CGP.load(); await sleep(50);
  ok('AI draft, switch off: an owner sees it, marked practice', /Draft it from the Life Story/.test(tab()) && /Practice: only owners see this/.test(tab()));
  [...document.querySelectorAll('#cgpHost button')].find(b=>/Draft it from the Life Story/.test(b.textContent)).click(); await sleep(300); t=tab();
  ok('the draft fills the boxes (not saved), says it is an AI draft, shows the Life Story sources, what was left out and what was not used', document.getElementById('cgpAbout').value.startsWith('Ruth taught third grade') && document.getElementById('cgpEnjoys').value==='Rose gardening, Old movies, Cardinals baseball' && /AI draft, not saved yet/.test(t) && /Drawn only from the Life Story: Work and life \(intake call, Krystal\)/.test(t) && /Left out on purpose: a health detail/.test(t) && /Not used, because they aren't in the Life Story: Knitting/.test(t) && !L.calls.slice(-1).some(c=>c.action==='save'), t.slice(0,900));
  ok('... it still needs approval (said plainly)', /It still needs approval before caregivers see it/.test(t));
  [...document.querySelectorAll('#cgpHost a')].find(a=>/Discard the AI draft/.test(a.textContent)).click(); await sleep(100);
  ok('discard: the boxes go back to the saved draft', !/AI draft, not saved yet/.test(tab()) && document.getElementById('cgpAbout').value!=='Ruth taught third grade for 30 years and still loves her rose garden.' && document.getElementById('cgpAbout').value===S.d.about);
  [...document.querySelectorAll('#cgpHost button')].find(b=>/Draft it from the Life Story/.test(b.textContent)).click(); await sleep(300);
  document.getElementById('cgpAbout').value='Ruth taught third grade for 30 years and loves her roses.';
  [...document.querySelectorAll('#cgpHost button')].find(b=>/Save draft/.test(b.textContent)).click(); await sleep(300);
  const sv=L.calls.filter(c=>c.action==='save').pop();
  ok('Save draft keeps the person\'s edit and marks it as from an AI draft', sv.ai_draft===true && sv.about==='Ruth taught third grade for 30 years and loves her roses.' && sv.enjoys.join()==='Rose gardening,Old movies,Cardinals baseball', sv);
  S.noLife=true; [...document.querySelectorAll('#cgpHost button')].find(b=>/Draft it from the Life Story/.test(b.textContent)).click(); await sleep(300);
  ok('an empty Life Story: says what to do, fills nothing', /Nothing in Ruth's Life Story yet/.test(tab()) && !/AI draft, not saved yet/.test(tab()));
  DATA.ops_settings={ cgp_ai_draft_live:true }; (0,eval)("CC_ROLES=['care_coordinator']"); await CGP.load(); await sleep(50);
  ok('AI draft, switch on: coordinators see the button (no practice note)', /Draft it from the Life Story/.test(tab()) && !/Practice: only owners see this/.test(tab()));
  /* From the family (2026-10-25): suggestions from the Booking App wait here; nothing changes by itself */
  ok('no suggestions: no From the family card', !/From the family/.test(tab()));
  S.sugg=[{ id:7, contact_name:'Lisa Kay', text:'Mom goes by Ruthie, and she loves Wheel of Fortune.', created_at:'2026-10-25T15:00:00Z' }, { id:8, contact_name:'Tom Kay', text:'No cats anymore.', created_at:'2026-10-25T16:00:00Z' }];
  await CGP.load(); await sleep(50);
  ok('From the family (2): each suggestion with who sent it, and that caregivers don\'t see these', /From the family \(2\)/.test(tab()) && /Mom goes by Ruthie/.test(tab()) && /Lisa Kay/.test(tab()) && /Caregivers don't see these/.test(tab()), tab().slice(0,600));
  const draftBefore=S.d.about;
  CGP.suggestion(7,true); await sleep(200);
  ok('Used it: closes that one only; the draft is unchanged (the office edits it themselves)', /From the family \(1\)/.test(tab()) && !/Mom goes by Ruthie/.test(tab()) && /No cats anymore/.test(tab()) && S.d.about===draftBefore && L.calls.some(c=>c.action==='suggestion_close'&&c.id===7&&c.used===true));
  CGP.suggestion(8,false); await sleep(200);
  ok('Not using it: the card goes away when none are left', !/From the family/.test(tab()) && L.calls.some(c=>c.action==='suggestion_close'&&c.id===8&&c.used===false));
  /* The family's own Booking App profile (2026-10-25): separate, shown to read, copied only on purpose */
  ok('no family profile: no family card', !/The family's Booking App profile/.test(tab()));
  S.family={ written:true, about:'Mom taught third grade for 30 years.', enjoys:['Roses','Cardinals'], life:[{label:'Loves to talk about',text:'Her grandkids'}], updated_by:'Lisa Kay', updated_at:'2026-10-25T15:00:00Z', history:[{ at:'2026-10-25T15:00:00Z', by:'Lisa Kay', changes:[{field:'About', before:'Mom taught school.', after:'Mom taught third grade for 30 years.'}] }] };
  const before=S.d.about; await CGP.load(); await sleep(50);
  ok('the family card: their words, who wrote it, separate from shifts', /The family's Booking App profile/.test(tab()) && /taught third grade/.test(tab()) && /Her grandkids/.test(tab()) && /Lisa Kay/.test(tab()) && /neither changes the other/.test(tab()), tab().slice(0,700));
  ok('looking changes nothing: the office draft is untouched', S.d.about===before);
  CGP.useFamily(); await sleep(200);
  ok('Use the family\'s words: copied into the office draft only (waiting for approval)', S.d.about==='Mom taught third grade for 30 years.' && /Changes waiting for approval/.test(tab()) && L.calls.some(c=>c.action==='use_family_words'));
  /* the client's photo (2026-10-25) */
  S.family.written=true; S.family.photo={ url:'data:image/gif;base64,R0lGODlhAQABAAAAACw=', view:'data:image/gif;base64,R0lGODlhAQABAAAAACw=', by:'Lisa Kay', at:'2026-10-25T15:30:00Z', ai:'checked' };
  await CGP.load(); await sleep(50);
  const dl=[...document.querySelectorAll('#cgpHost a')].find(a=>/Download for AxisCare/.test(a.textContent));
  ok('the photo: who added it, only confirmed caregivers see it, Download for AxisCare (a download link), how to add it in AxisCare', /Photo added by Lisa Kay/.test(tab()) && /Only the caregiver confirmed/.test(tab()) && !!dl && dl.hasAttribute('download') && /upload it to the photo spot/.test(tab()) && !!document.querySelector('#cgpHost img'), tab().slice(0,800));
  CGP.removePhoto(); await sleep(250);
  ok('Remove photo: asks, then removes it', !/Photo added by/.test(tab()) && L.calls.some(c=>c.action==='remove_photo'));
  ok('nothing sent: only the Caregiver Preview server was asked', L.calls.every(x=>['get','save','approve','draft','suggestion_close','use_family_words','remove_photo'].includes(x.action)));
  /* Family & Contacts */
  const circ={ id:'cc1', client_name:'Ruth Kay', caregiver_about:'Ruth loves her garden.' };
  let box=FAMAPP.aboutBox(circ,'cp_','Ruth Kay');
  ok('Family & Contacts, switch off: the box stays, with the corrected wording (no "confirm it\'s them")', /when they open their shift link/.test(box) && !/confirm it/.test(box) && /textarea/.test(box));
  DATA.ops_settings={ caregiver_preview_live:true }; box=FAMAPP.aboutBox(circ,'cp_','Ruth Kay');
  ok('Family & Contacts, switch on: one line pointing to the Caregiver Preview tab (one place, one copy)', /kept on the/.test(box) && /cpShowTab\('cgprev'\)/.test(box) && !/textarea/.test(box));
  CGP.mount({ ax:'500', name:'Ruth Kay' });
  ok('switch on: every coordinator sees the tab', btn.style.display==='');
  return R;
}
"""
MIME = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.json':'application/json', '.webmanifest':'application/json'}
def serve(route):
    url = route.request.url
    if 'supabase.co' in url: return route.abort()
    if not url.startswith('http://cgp.local/'): return route.continue_()
    p = (ROOT / url.split('http://cgp.local/', 1)[1].split('?')[0].split('#')[0])
    if not p.is_file(): return route.fulfill(status=404, body='')
    route.fulfill(status=200, body=p.read_bytes(), content_type=MIME.get(p.suffix, 'application/octet-stream'))
with sync_playwright() as pw:
    b = pw.chromium.launch(); cx = b.new_context(viewport={'width': 1280, 'height': 900}, timezone_id='America/Chicago'); pg = cx.new_page()
    pg.route('**/*', serve)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://cgp.local/index.html?proof=cgp'); pg.wait_for_timeout(1500)
    pg.evaluate('s=>(0,eval)(s)', STUB)
    R = pg.evaluate(T); R.append(['PASS' if not errs else 'FAIL', 'no page errors', errs[:3]])
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True)
        pg.add_style_tag(content='header.topbar{position:static!important}')
        pg.evaluate("()=>{ window.__S.review=false; window.__S.d.about='Ruth taught third grade for 30 years and loves a good laugh.'; window.__S.d.enjoys=['Gardening','Old movies','Card games','Cardinals baseball']; window.__S.hidden=['home:cats']; window.__S.who='kry'; DATA.ops_settings={}; (0,eval)(\"CC_ROLES=['owner_admin']\"); return CGP.load(); }")
        pg.wait_for_timeout(500); el = pg.query_selector('[data-cp-pane=\"cgprev\"]'); (el or pg).screenshot(path=os.path.join(SHOTS, 'cgp-tab.png'))
        pg.evaluate("()=>{ window.__S.noLife=false; window.__S.d={...window.__S.a}; DATA.ops_settings={}; return CGP.load().then(()=>CGP.draft()); }"); pg.wait_for_timeout(500)
        el = pg.query_selector('[data-cp-pane=\"cgprev\"]'); (el or pg).screenshot(path=os.path.join(SHOTS, 'cgp-ai-draft.png'))
    b.close()
for s_, n, d in R: print(s_, '·', n, '' if s_ == 'PASS' else d)
print(sum(r[0] == 'PASS' for r in R), '/', len(R))
sys.exit(0 if all(r[0] == 'PASS' for r in R) else 1)
